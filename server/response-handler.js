/* eslint-disable valid-jsdoc */
'use strict';
/**
 * Response handler
 * Format http(s) responses and appropriate error codes
 *
 * Every response will have JSON body containing at least the `success` property
 * Responses will be accompanied by appropriate error codes
 *
 * In case of error, an error type and optional message will be supplied
 *
 *
 * HTTP Status Codes
 *
 * 200 OK - Everything worked as expected.
 * 201 Created - POST request has been accepted and resulted in successful
 *               creation.
 * 202 Accepted - Request has been accepted for processing.
 *                E.g. submitting a transaction.
 * 400 Bad Request - Invalid or malformed request.
 *                   E.g. missing or invalid parameter.
 * 403 Forbidden - Unauthorized access to endpoint
 * 404 Not Found - The requested item doesn't exist.
 * 500 Internal Server Error - Unexpected condition occurred
 * 502 Bad Gateway - Invalid/unexpected response from divvyd
 * 503 Service Unavailable - Divvyd busy
 * 504 Gateway Timeout - Divvyd response timed out
 *
 *
 * Error Types
 *
 * invalid_request  - invalid request errors arise when the request has
 *                    invalid parameters.
 * connection       - divvyd is busy or could not be connected, timed out, etc.
 * transaction      - response from divvyd or internal processing error
 * server           - unexpected condition in the server occurred
 *
 */

var _ = require('lodash');

var ErrorType = {
  invalidRequest: 'invalid_request',
  connection: 'connection',
  transaction: 'transaction',
  server: 'server'
};

var StatusCode = {
  ok: 200,
  created: 201,
  badRequest: 400,
  notFound: 404,
  internalServerError: 500,
  badGateway: 502,
  timeout: 504
};

/**
 * Send a JSON response
 *
 * @param response - response object
 * @param body
 * @param statusCode
 */
function send(response, body, statusCode) {
  response.status(statusCode).json(body);
}

/**
 * Send a success response
 *
 * @param response - response object
 * @param body - (optional) body to the response, in addition to the
 *                success property
 */
function success(response, body) {

  var content =
  {
    success: true
  };

  if (body !== undefined) {
    content = _.extend(content, body);
  }

  send(response, content, StatusCode.ok);
}

/**
 * Send a created response
 *
 * @param response - response object
 * @param body - (optional) body to the response, in addition to the
 *                success property
 */
function created(response, body) {

  var content =
  {
    success: true
  };

  if (body !== undefined) {
    content = _.extend(content, body);
  }

  send(response, content, StatusCode.created);
}

/**
 * Send an transaction error response
 *
 * @param response - response object
 * @param message  - (optional) message to accompany and describe the
 *                    invalid response
 * @param body     - (optional) additional body to the response
 */
function transactionError(response, message, body) {

  var content = {
    success: false,
    error_type: ErrorType.transaction
  };

  if (message) {
    content.message = message;
  }

  if (body) {
    content = _.extend(content, body);
  }

  send(response, content, StatusCode.internalServerError);
}


/**
 * Send a not found error response
 *
 * @param response  - response object
 * @param message   - (optional) additional error message
 * @param body      - (optional) additional body to the response
 */
function transactionNotFoundError(response, message, body) {

  var content = {
    success: false,
    error_type: ErrorType.transaction
  };

  if (message) {
    content.message = message;
  }

  if (body) {
    content = _.extend(content, body);
  }

  send(response, content, StatusCode.notFound);
}

/**
 * Send an api error response
 *
 * @param response  - response object
 * @param message   - (optional) message to accompany and describe the
 *                    invalid response
 * @param body      - (optional) additional body to the response
 */
function apiError(response, error) {
  var content = {
    success: false,
    error_type: ErrorType.server,
    error: error.error
  };

  if (error.message) {
    content.message = error.message;
  }

  send(response, content, StatusCode.internalServerError);
}

/**
 * Send an invalid request error response
 *
 * @param response  - response object
 * @param error     - error to send back to the client
 */
function invalidRequestError(response, error) {
  var content = {
    success: false,
    error_type: ErrorType.invalidRequest,
    error: error.error
  };

  if (error.message) {
    content.message = error.message;
  }

  send(response, content, StatusCode.badRequest);
}

/**
 * Send an internal error response
 *
 * @param response  - response object
 * @param message   - (optional) additional error message
 *                    e.g. description for provided error
 * @param body      - (optional) additional body to the response
 */
function internalError(response, message, body) {

  var content = {
    success: false,
    error_type: ErrorType.server
  };

  if (message) {
    content.message = message;
  }

  if (body) {
    content = _.extend(content, body);
  }

  send(response, content, StatusCode.internalServerError);
}

/**
 * Send an connection error response
 *
 * @param response  - response object
 * @param message   - (optional) additional error message
 * @param body      - (optional) additional body to the response
 */
function connectionError(response, message, body) {

  var content = {
    success: false,
    error_type: ErrorType.connection
  };

  if (message) {
    content.message = message;
  }

  if (body) {
    content = _.extend(content, body);
  }

  send(response, content, StatusCode.badGateway);
}

/**
 * Send a not found error response
 *
 * @param response  - response object
 * @param error     - error to send back to the client
 */
function notFoundError(response, error) {

  var content = {
    success: false,
    error_type: ErrorType.invalidRequest,
    error: error.error
  };

  if (error.message) {
    content.message = error.message;
  }

  send(response, content, StatusCode.notFound);
}

/**
 * Send a timeout error response
 *
 * @param response  - response object
 * @param message   - (optional) additional error message
 * @param body      - (optional) additional body to the response
 */
function timeOutError(response, message, body) {

  var content = {
    success: false,
    error_type: ErrorType.connection
  };

  if (message) {
    content.message = message;
  }

  if (body) {
    content = _.extend(content, body);
  }

  send(response, content, StatusCode.timeout);
}

module.exports = {
  success: success,
  created: created,
  transactionError: transactionError,
  transactionNotFoundError: transactionNotFoundError,
  invalidRequest: invalidRequestError,
  internalError: internalError,
  connectionError: connectionError,
  notFoundError: notFoundError,
  timeOutError: timeOutError,
  apiError: apiError
};
