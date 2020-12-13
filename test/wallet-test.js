var assert = require('assert');
var divvy = require('divvy-lib');
var testutils = require('./testutils');
var fixtures = require('./fixtures');
var errors = require('./fixtures').errors;

suite('wallet', function() {
  var self = this;

  //self.wss: divvyd mock
  //self.app: supertest-enabled REST handler

  setup(testutils.setup.bind(self));
  teardown(testutils.teardown.bind(self));

  test('/wallet/new', function(done) {
    self.app
    .get('/v1/wallet/new')
    .expect(200)
    .expect(testutils.checkHeaders)
    .expect(function(res, err) {
      assert.ifError(err);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(typeof res.body.wallet, 'object');
      assert(divvy.UInt160.is_valid(res.body.wallet.address), 'Generated account is invalid');
      assert(divvy.Seed.from_json(res.body.wallet.secret).get_key(res.body.wallet.address), 'Secret is invalid');
    })
    .end(done);
  });
});
