'use strict';
var divvy = require('divvy-lib');

function noop() {
  return;
}

var defaultLogger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop
};

function createRemote(options) {
  var remote = new divvy.Remote(options);
  if (options.mock) {
    return remote;
  }
  var logger = options.logger || defaultLogger;
  var connect = remote.connect;
  var connected = false;

  function ready() {
    if (!connected) {
      logger.info('[RIPD] Connection established');
      connected = true;
    }
  }

  remote.connect = function() {
    logger.info('[RIPD] Attempting to connect to the Divvy network...');
    connect.apply(remote, arguments);
  };

  remote.on('error', function(err) {
    logger.error('[RIPD] error: ', err);
  });

  remote.on('disconnect', function() {
    logger.info('[RIPD] Disconnected from the Divvy network');
    connected = false;
  });

  remote._servers.forEach(function(server) {
    server.on('connect', function() {
      logger.info('[RIPD] Connected to divvyd server:', server.getServerID());
      server.once('ledger_closed', ready);
    });
    server.on('disconnect', function() {
      logger.info('[RIPD] Disconnected from divvyd server:',
        server.getServerID());
    });
  });

  process.on('SIGHUP', function() {
    logger.info('Received signal SIGHUP, reconnecting to Divvy network');
    remote.reconnect();
  });

  setInterval(function() {
    var pingRequest = remote.request('ping');
    pingRequest.on('error', function() {});
    pingRequest.broadcast();
  }, 1000 * 15);

  remote.connect();
  return remote;
}

module.exports = createRemote;
