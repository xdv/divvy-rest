'use strict';
var config = require('./config');
var DivvyAPI = require('../api');
var logger = require('./logger').logger;

var options = {
  servers: config.get('divvyd_servers'),
  max_fee: parseFloat(config.get('max_transaction_fee')),
  database_path: config.get('NODE_ENV') === 'test'
    ? ':memory:' : config.get('db_path'),
  logger: logger,
  mock: config.get('NODE_ENV') === 'test',
  trace: config.get('debug') || false
};

module.exports = new DivvyAPI(options);
