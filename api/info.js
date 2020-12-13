'use strict';
var _ = require('lodash');
var uuid = require('node-uuid');
var serverlib = require('./lib/server-lib');
var errors = require('./lib/errors.js');
var utils = require('./lib/utils.js');

function getServerStatus(callback) {
  serverlib.getStatus(this.remote, function(error, status) {
    if (error) {
      callback(new errors.DivvydNetworkError(error.message));
    } else {
      callback(null, _.extend({
        api_documentation_url: 'https://github.com/xdv/divvy-rest'
      }, status));
    }
  });
}

/**
 *  Check server connectivity.  If we hit this method it means the server is
 *  connected, as per middleware
 */

function getServerConnected(callback) {
  callback(null, {connected: true});
}

/**
 * Get UUID, for use by the client as transaction identifier
 */

function getUUID(callback) {
  callback(null, {uuid: uuid.v4()});
}

/**
 * Get the current transaction fee
 */

function getFee(callback) {
  var fee = this.remote.createTransaction()._computeFee();
  callback(null, {fee: utils.dropsToXdv(fee)});
}

module.exports.serverStatus = getServerStatus;
module.exports.isConnected = getServerConnected;
module.exports.uuid = getUUID;
module.exports.fee = getFee;
