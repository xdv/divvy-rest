'use strict';
var router = require('./server/router.js');
var remote = require('./server/api').remote;

function DivvyRestPlugin() {
  this.router = router;
  this.remote = remote;
}

module.exports = DivvyRestPlugin;
