/* eslint-disable new-cap */
/* eslint-disable max-len */
'use strict';
var assert = require('assert-diff');
var divvy = require('divvy-lib');
var testutils = require('./testutils');
var fixtures = require('./fixtures').payments;
var errors = require('./fixtures').errors;
var addresses = require('./fixtures').addresses;
var utils = require('../api/lib/utils');
var requestPath = fixtures.requestPath;

suite('get payments', function() {
  var self = this;

  // self.wss: divvyd mock
  // self.app: supertest-enabled REST handler

  setup(testutils.setup.bind(self));
  teardown(testutils.teardown.bind(self));

  test('/accounts/:account/payments/', function(done) {
    self.wss.once('request_account_tx', function(message, conn) {
      assert.strictEqual(message.command, 'account_tx');
      conn.send(fixtures.accountTransactionsResponse(message));
    });

    self.wss.once('request_ledger', function(message, conn) {
      assert.strictEqual(message.command, 'ledger');
      conn.send(fixtures.ledgerResponse(message));
    });

    self.app
    .get(requestPath(addresses.VALID))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTAccountTransactionsResponse()))
    .end(done);
  });

  test('/accounts/:account/payments/:identifier -- with identifier as client_resource_id');

  test('/accounts/:account/payments/:identifier -- with identifier as txn hash', function(done) {
    self.wss.once('request_tx', function(message, conn) {
      assert.strictEqual(message.command, 'tx');
      assert.strictEqual(message.transaction, fixtures.VALID_TRANSACTION_HASH);
      conn.send(fixtures.transactionResponse(message));
    });

    self.app
    .get(requestPath(addresses.VALID) + '/' + fixtures.VALID_TRANSACTION_HASH)
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTTransactionResponse()))
    .end(done);
  });

  test('/accounts/:account/payments/:identifier -- pending with identifier as txn hash', function(done) {
    self.wss.once('request_tx', function(message, conn) {
      assert.strictEqual(message.command, 'tx');
      assert.strictEqual(message.transaction, fixtures.VALID_TRANSACTION_HASH);
      conn.send(fixtures.transactionResponse(message, {validated: false}));
    });

    self.app
    .get(requestPath(addresses.VALID) + '/' + fixtures.VALID_TRANSACTION_HASH)
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTTransactionResponse({state: 'pending'})))
    .end(done);
  });

  test('/accounts/:account/payments/:identifier -- with memos', function(done) {
    self.wss.once('request_tx', function(message, conn) {
      assert.strictEqual(message.command, 'tx');
      assert.strictEqual(message.transaction, fixtures.VALID_TRANSACTION_HASH_MEMO);
      conn.send(fixtures.transactionResponse(message, {
        memos: [
          {
            Memo: {
              MemoData: '4C6F72656D20697073756D20646F6C6F722073697420616D65742C20636F6E7365637465747572',
              MemoType: '756E666F726D61747465645F6D656D6F'
            }
          },
          {
            Memo: {
              MemoData: '4C6F72656D20617364662073697420616D65742C20636F6E7365637465747572'
            }
          }
        ]
      }));
    });

    self.wss.once('request_ledger', function(message, conn) {
      assert.strictEqual(message.command, 'ledger');
      conn.send(fixtures.ledgerResponse(message));
    });

    self.app
    .get(requestPath(addresses.VALID) + '/' + fixtures.VALID_TRANSACTION_HASH_MEMO)
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTTransactionResponse({
      memos: [
        {
          MemoData: '4C6F72656D20697073756D20646F6C6F722073697420616D65742C20636F6E7365637465747572',
          MemoType: '756E666F726D61747465645F6D656D6F'
        },
        {
          MemoData: '4C6F72656D20617364662073697420616D65742C20636F6E7365637465747572'
        }
      ]
    })))
    .end(done);
  });

  test('/accounts/:account/payments/:identifier -- invalid identifier', function(done) {
    self.wss.once('request_tx', function() {
      assert(false, 'Should not request transaction');
    });

    self.app
    .get(requestPath(addresses.VALID) + '/' + fixtures.INVALID_TRANSACTION_HASH)
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'restINVALID_PARAMETER',
      message: 'Transaction not found. A transaction hash was not supplied and there were no entries matching the client_resource_id.'
    })))
    .end(done);
  });

  test('/accounts/:account/payments/:identifier -- invalid account', function(done) {
    self.wss.once('request_tx', function() {
      assert(false, 'Should not request transaction');
    });

    self.app
    .get(requestPath(addresses.INVALID) + '/' + fixtures.VALID_TRANSACTION_HASH)
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTInvalidAccount))
    .end(done);
  });
});

suite('post payments', function() {
  var self = this;

  // self.wss: divvyd mock
  // self.app: supertest-enabled REST handler

  setup(testutils.setup.bind(self));
  teardown(testutils.teardown.bind(self));

  test('/payments -- issuer', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message, {hash: hash}));
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments')
      .send(fixtures.payment({
        value: '0.001',
        currency: 'USD',
        issuer: addresses.ISSUER,
        hash: hash
      }))
      .expect(testutils.checkStatus(200))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(fixtures.RESTSuccessResponse()))
      .end(done);
  });

  test('/payments -- no issuer', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var tx = divvy.Remote.parseBinaryAccountTransaction(message).tx;
      assert.strictEqual(tx.Amount.issuer, addresses.COUNTERPARTY);
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message, {hash: hash}));
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments')
      .send(fixtures.payment({
        value: '0.001',
        currency: 'USD',
        hash: hash
      }))
      .expect(testutils.checkStatus(200))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(fixtures.RESTSuccessResponse()))
      .end(done);
  });

  test('/payments -- fixed fee', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new divvy.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.Fee, '5000000');
      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash,
        fee: '5000000'
      }));
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments')
      .send(fixtures.payment({
        value: '0.001',
        currency: 'USD',
        hash: hash,
        fixed_fee: '5'
      }))
      .expect(testutils.checkStatus(200))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(fixtures.RESTSuccessResponse()))
      .end(done);
  });

  test('/payments -- hex currency gold', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message, {hash: hash}));
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments')
      .send(fixtures.payment({
        value: '0.0001',
        currency: '015841550000000041F78E0A28CBF19200000000',
        issuer: addresses.VALID,
        hash: hash
      }))
      .expect(testutils.checkStatus(200))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(fixtures.RESTSuccessResponse()))
      .end(done);
  });

  test('/payments?validated=true', function(done) {
    var currentLedger = self.remote._ledger_current_index;

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message));

      process.nextTick(function() {
        conn.send(fixtures.transactionVerifiedResponse({
          ledger: currentLedger
        }));
      });
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
    .send(fixtures.payment({
      value: '0.001',
      currency: 'USD'
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTTransactionResponse({
      hash: fixtures.VALID_SUBMITTED_TRANSACTION_HASH,
      ledger: currentLedger
    })))
    .end(done);
  });

  test('/payments?validated=true -- fixed fee', function(done) {
    var currentLedger = self.remote._ledger_current_index;
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new divvy.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.Fee, '5000000');
      conn.send(fixtures.requestSubmitResponse(message, {
        hash: hash,
        fee: '5000000'
      }));

      process.nextTick(function() {
        conn.send(fixtures.transactionVerifiedResponse({
          hash: hash,
          fee: '5000000',
          ledger: currentLedger
        }));
      });
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
      .send(fixtures.payment({
        value: '0.001',
        currency: 'USD',
        fixed_fee: '5'
      }))
      .expect(testutils.checkStatus(200))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(fixtures.RESTTransactionResponse({
        hash: hash,
        fee: '5',
        ledger: currentLedger
      })))
      .end(done);
  });

  test('/payments?validated=true -- hex currency gold', function(done) {
    var hash = testutils.generateHash();
    var currentLedger = self.remote._ledger_current_index;

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message, {hash: hash}));

      process.nextTick(function() {
        conn.send(fixtures.verifiedResponseComplexCurrency({
          hash: hash,
          ledger: currentLedger
        }));
      });
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
      .send(fixtures.payment({
        value: '0.0001',
        currency: '015841550000000041F78E0A28CBF19200000000',
        issuer: addresses.VALID,
        hash: hash
      }))
      .expect(testutils.checkStatus(200))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(fixtures.RESTTransactionResponseComplexCurrencies({
        hash: hash,
        ledger: currentLedger
      })))
      .end(done);
  });

  test('/payments?validated=true -- ledger sequence too high', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.ledgerSequenceTooHighResponse(message));
      testutils.closeLedgers(conn);
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
    .send(fixtures.payment({
      value: '0.001',
      currency: 'USD'
    }))
    .expect(testutils.checkBody(errors.RESTResponseLedgerSequenceTooHigh))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .end(done);
  });

  test('/payments?validated=true -- destination tag missing', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.destinationTagNeededResponse(message));
      testutils.closeLedgers(conn);
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
    .send(fixtures.payment({
      value: '0.001',
      currency: 'USD'
    }))
    .expect(testutils.checkBody(errors.RESTResponseLedgerSequenceTooHigh))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .end(done);
  });

  test('/payments?validated=true -- max fee exceeded', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function() {
      assert(false);
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
    .send(fixtures.payment({
      value: '0.001',
      currency: 'USD',
      issuer: addresses.ISSUER,
      max_fee: utils.dropsToXdv(10)
    }))
    .expect(testutils.checkBody(errors.RESTMaxFeeExceeded))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .end(done);
  });

  test('/payments?validated=false', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments?validated=false')
    .send(fixtures.payment({
      value: '0.001',
      currency: 'USD'
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSuccessResponse()))
    .end(done);
  });

  test('/payments -- max fee exceeded', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function() {
      assert(false);
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      value: '0.001',
      currency: 'USD',
      issuer: addresses.ISSUER,
      max_fee: 0.000010
    }))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTMaxFeeExceeded))
    .end(done);
  });

  test('/payments -- invalid memos', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      memos: 'some string'
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'restINVALID_PARAMETER',
      message: 'Invalid parameter: memos. Must be an array with memo objects'
    })))
    .end(done);
  });

  test('/payments -- empty memos array', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      memos: []
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'restINVALID_PARAMETER',
      message: 'Invalid parameter: memos. Must contain at least one Memo object, otherwise omit the memos property'
    })))
    .end(done);
  });

  test('/payments -- memo containing a MemoType field with an int value', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      memos: [
        {
          MemoType: 1,
          MemoData: 'some_value'
        },
        {
          MemoData: 'some_value'
        }
      ]
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'restINVALID_PARAMETER',
      message: 'Invalid parameter: MemoType. MemoType must be a string'
    })))
    .end(done);
  });

  test('/payments -- memo containing a MemoData field with an int value', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      memos: [
        {
          MemoType: 'some_key',
          MemoData: 1
        },
        {
          MemoData: 'some_value'
        }
      ]
    }))
    .expect(testutils.checkStatus(400))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTErrorResponse({
      type: 'invalid_request',
      error: 'restINVALID_PARAMETER',
      message: 'Invalid parameter: MemoData. MemoData must be a string'
    })))
    .end(done);
  });

  test('/payments -- memo without MemoData', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      memos: [
        {
          MemoData: 'some_value'
        }
      ]
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSuccessResponse()))
    .end(done);
  });

  test('/payments -- memo', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      memos: [
        {
          MemoType: 'some_key',
          MemoData: 'some_value'
        },
        {
          MemoData: 'some_value'
        }
      ]
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSuccessResponse()))
    .end(done);
  });

  test('/payments -- secret invalid', function(done) {
    self.wss.once('request_account_info', function() {
      assert(false);
    });

    self.wss.once('request_submit', function() {
      assert(false);
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      secret: 'foo'
    }))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTInvalidSecret))
    .end(done);
  });

  test('/payments -- lastLedgerSequence', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new divvy.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.LastLedgerSequence, 9036185);
      conn.send(fixtures.requestSubmitResponse(message, {LastLedgerSequence: 9036185}));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      value: '0.001',
      currency: 'USD',
      issuer: addresses.issuer,
      lastLedgerSequence: 9036185
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSuccessResponse()))
    .end(done);
  });

  test('/payments?validated=true -- max fee above computed fee but below expected server fee and remote\'s local_fee flag turned off', function(done) {
    self.remote.local_fee = false;

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');

      conn.send(fixtures.divvydSubmitErrorResponse(message, {
        Fee: '15',
        engineResult: 'telINSUF_FEE_P',
        engineResultCode: '-394',
        engineResultMessage: 'Fee insufficient.'
      }));

      testutils.closeLedgers(conn);
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
    .send(fixtures.payment({
      value: '0.001',
      currency: 'USD',
      issuer: addresses.ISSUER,
      max_fee: 0.000015
    }))
    .expect(testutils.checkBody(errors.RESTResponseLedgerSequenceTooHigh))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .end(done);
  });

  test('/payments -- max fee below computed fee', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function() {
      assert(false);
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      value: '0.001',
      currency: 'USD',
      issuer: addresses.ISSUER,
      max_fee: 0.000010
    }))
    .expect(testutils.checkStatus(500))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(errors.RESTMaxFeeExceeded))
    .end(done);
  });

  test('/payments -- max fee above expected server fee', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new divvy.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(message.command, 'submit');
      assert.strictEqual(so.Fee, '12');
      conn.send(fixtures.requestSubmitResponse(message, {Fee: '12'}));
    });

    self.app
    .post('/v1/accounts/' + addresses.VALID + '/payments')
    .send(fixtures.payment({
      value: '0.001',
      currency: 'USD',
      issuer: addresses.ISSUER,
      max_fee: 0.001200
    }))
    .expect(testutils.checkStatus(200))
    .expect(testutils.checkHeaders)
    .expect(testutils.checkBody(fixtures.RESTSuccessResponse()))
    .end(done);
  });

  test('/payments?validated=true -- not enough XDV to create a new account', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_subscribe', function(message, conn) {
      assert.strictEqual(message.command, 'subscribe');
      assert.strictEqual(message.accounts[0], addresses.VALID);
      conn.send(fixtures.divvydSubcribeResponse(message));
    });

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      var so = new divvy.SerializedObject(message.tx_blob).to_json();
      assert.strictEqual(so.Amount, '1000000');
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.divvydSubmitErrorResponse(message, {
        engineResult: 'tecNO_DST_INSUF_XDV',
        engineResultCode: '125',
        engineResultMessage: 'This should not show up, is not a validated result',
        hash: hash
      }));

      process.nextTick(function() {
        conn.send(fixtures.divvydValidatedErrorResponse(message, {
          engineResult: 'tecNO_DST_INSUF_XDV',
          engineResultCode: '125',
          engineResultMessage: 'Destination does not exist. Too little XDV sent to create it.',
          hash: hash
        }));
      });
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
      .send(fixtures.payment())
      .expect(testutils.checkStatus(500))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(errors.RESTErrorResponse({
        type: 'transaction',
        error: 'tecNO_DST_INSUF_XDV',
        message: 'Destination does not exist. Too little XDV sent to create it.'
      })))
      .end(done);
  });

  test('/payments?validated=true -- not enough balance to pay the fee', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_subscribe', function(message, conn) {
      assert.strictEqual(message.command, 'subscribe');
      assert.strictEqual(message.accounts[0], addresses.VALID);
      conn.send(fixtures.divvydSubcribeResponse(message));
    });

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.divvydSubmitErrorResponse(message, {
        engineResult: 'terINSUF_FEE_B',
        engineResultCode: '-99',
        engineResultMessage: 'Account balance can\'t pay fee.',
        hash: hash
      }));
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
      .send(fixtures.payment())
      .expect(testutils.checkStatus(500))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(errors.RESTErrorResponse({
        type: 'transaction',
        error: 'terINSUF_FEE_B',
        message: 'Account balance can\'t pay fee.'
      })))
      .end(done);
  });

  test('/payments?validated=true -- unfunded account', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_subscribe', function(message, conn) {
      assert.strictEqual(message.command, 'subscribe');
      assert.strictEqual(message.accounts[0], addresses.VALID);
      conn.send(fixtures.divvydSubcribeResponse(message));
    });

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.divvydSubmitErrorResponse(message, {
        engineResult: 'terNO_ACCOUNT',
        engineResultCode: '-96',
        engineResultMessage: 'The source account does not exist.',
        hash: hash
      }));
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
      .send(fixtures.payment())
      .expect(testutils.checkStatus(500))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(errors.RESTErrorResponse({
        type: 'transaction',
        error: 'terNO_ACCOUNT',
        message: 'The source account does not exist.'

      })))
      .end(done);
  });

  test('/payments -- duplicate client resource id', function(done) {
    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message));

      self.wss.once('request_submit', function() {
        // second payment should not hit submit
        assert(false);
      });
    });

    function secondPayment(err) {
      if (err) {
        assert(false);
        return done(err);
      }

      // 2nd payment
      self.app.post('/v1/accounts/' + addresses.VALID + '/payments')
        .send(fixtures.payment({
          clientResourceId: 'id'
        }))
        .expect(testutils.checkStatus(500))
        .expect(testutils.checkHeaders)
        .expect(testutils.checkBody(errors.RESTErrorResponse({
          type: 'server',
          error: 'restDUPLICATE_TRANSACTION',
          message: 'Duplicate Transaction. A record already exists in the database for a transaction of this type with the same client_resource_id. If this was not an accidental resubmission please submit the transaction again with a unique client_resource_id'
        })))
        .end(done);
    }

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments')
      .send(fixtures.payment({
        clientResourceId: 'id'
      }))
      .expect(testutils.checkStatus(200))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(fixtures.RESTSuccessResponse({
        clientResourceId: 'id'
      })))
      .end(secondPayment);
  });

  test('/payments -- duplicate client resource id and first transaction failed', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');

      conn.send(fixtures.divvydSubmitErrorResponse(message, {
        engineResult: 'tecNO_DST_INSUF_XDV',
        engineResultCode: '125',
        engineResultMessage: 'Destination does not exist. Too little XDV sent to create it.',
        hash: hash
      }));

      self.wss.once('request_submit', function() {
        // second payment should not hit submit
        assert(false);
      });
    });

    function secondPayment(err) {
      if (err) {
        assert(false);
        return done(err);
      }

      // 2nd payment
      self.app.post('/v1/accounts/' + addresses.VALID + '/payments')
        .send(fixtures.payment({
          clientResourceId: 'id'
        }))
        .expect(testutils.checkStatus(500))
        .expect(testutils.checkHeaders)
        .expect(testutils.checkBody(errors.RESTErrorResponse({
          type: 'server',
          error: 'restDUPLICATE_TRANSACTION',
          message: 'Duplicate Transaction. A record already exists in the database for a transaction of this type with the same client_resource_id. If this was not an accidental resubmission please submit the transaction again with a unique client_resource_id'
        })))
        .end(done);
    }

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments')
      .send(fixtures.payment({
        clientResourceId: 'id'
      }))
      .expect(testutils.checkStatus(200))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(fixtures.RESTSuccessResponse({
        clientResourceId: 'id'
      })))
      .end(secondPayment);
  });

  test('/payments -- duplicate client resource id, first transaction failed and validated true for first transaction', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_subscribe', function(message, conn) {
      assert.strictEqual(message.command, 'subscribe');
      assert.strictEqual(message.accounts[0], addresses.VALID);
      conn.send(fixtures.divvydSubcribeResponse(message));
    });

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.divvydSubmitErrorResponse(message, {
        engineResult: 'tecNO_DST_INSUF_XDV',
        engineResultCode: '125',
        engineResultMessage: 'This should not show up, is not a validated result',
        hash: hash
      }));

      process.nextTick(function() {
        conn.send(fixtures.divvydValidatedErrorResponse(message, {
          engineResult: 'tecNO_DST_INSUF_XDV',
          engineResultCode: '125',
          engineResultMessage: 'Destination does not exist. Too little XDV sent to create it.',
          hash: hash
        }));
      });

      self.wss.once('request_submit', function() {
        // second payment should not hit submit
        assert(false);
      });
    });

    function secondPayment(err) {
      if (err) {
        assert(false);
        return done(err);
      }

      // 2nd payment
      self.app.post('/v1/accounts/' + addresses.VALID + '/payments')
        .send(fixtures.payment({
          clientResourceId: 'id'
        }))
        .expect(testutils.checkStatus(500))
        .expect(testutils.checkHeaders)
        .expect(testutils.checkBody(errors.RESTErrorResponse({
          type: 'server',
          error: 'restDUPLICATE_TRANSACTION',
          message: 'Duplicate Transaction. A record already exists in the database for a transaction of this type with the same client_resource_id. If this was not an accidental resubmission please submit the transaction again with a unique client_resource_id'
        })))
        .end(done);
    }

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
      .send(fixtures.payment({
        clientResourceId: 'id'
      }))
      .expect(testutils.checkStatus(500))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(errors.RESTErrorResponse({
        type: 'transaction',
        error: 'tecNO_DST_INSUF_XDV',
        message: 'Destination does not exist. Too little XDV sent to create it.'
      })))
      .end(secondPayment);
  });

  test('/payments -- duplicate client resource id, first transaction failed and validated true for both transactions', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_subscribe', function(message, conn) {
      assert.strictEqual(message.command, 'subscribe');
      assert.strictEqual(message.accounts[0], addresses.VALID);
      conn.send(fixtures.divvydSubcribeResponse(message));
    });

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.divvydSubmitErrorResponse(message, {
        engineResult: 'tecNO_DST_INSUF_XDV',
        engineResultCode: '125',
        engineResultMessage: 'This should not show up, is not a validated result',
        hash: hash
      }));

      process.nextTick(function() {
        conn.send(fixtures.divvydValidatedErrorResponse(message, {
          engineResult: 'tecNO_DST_INSUF_XDV',
          engineResultCode: '125',
          engineResultMessage: 'Destination does not exist. Too little XDV sent to create it.',
          hash: hash
        }));
      });

      self.wss.once('request_submit', function() {
        // second payment should not hit submit
        assert(false);
      });
    });

    function secondPayment(err) {
      if (err) {
        assert(false);
        return done(err);
      }

      // 2nd payment
      self.app.post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
        .send(fixtures.payment({
          clientResourceId: 'id'
        }))
        .expect(testutils.checkStatus(500))
        .expect(testutils.checkHeaders)
        .expect(testutils.checkBody(errors.RESTErrorResponse({
          type: 'server',
          error: 'restDUPLICATE_TRANSACTION',
          message: 'Duplicate Transaction. A record already exists in the database for a transaction of this type with the same client_resource_id. If this was not an accidental resubmission please submit the transaction again with a unique client_resource_id'
        })))
        .end(done);
    }

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments?validated=true')
      .send(fixtures.payment({
        clientResourceId: 'id'
      }))
      .expect(testutils.checkStatus(500))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(errors.RESTErrorResponse({
        type: 'transaction',
        error: 'tecNO_DST_INSUF_XDV',
        message: 'Destination does not exist. Too little XDV sent to create it.'
      })))
      .end(secondPayment);
  });

  test('/payments -- empty client_resource_id', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message, {hash: hash}));
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments')
      .send(fixtures.payment({
        value: '0.001',
        currency: 'USD',
        issuer: addresses.ISSUER,
        hash: hash,
        clientResourceId: ''
      }))
      .expect(testutils.checkStatus(400))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(errors.RESTErrorResponse({
        message: 'Invalid parameter: client_resource_id. Must be a string '
          + 'of ASCII-printable characters. Note that 256-bit hex strings are '
          + 'disallowed because of the potential confusion with transaction '
          + 'hashes.',
        type: 'invalid_request',
        error: 'restINVALID_PARAMETER'
      })))
      .end(done);
  });

  test('/payments -- invalid client_resource_id', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message, {hash: hash}));
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments')
      .send(fixtures.payment({
        value: '0.001',
        currency: 'USD',
        issuer: addresses.ISSUER,
        hash: hash,
        clientResourceId: testutils.generateHash()
      }))
      .expect(testutils.checkStatus(400))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(errors.RESTErrorResponse({
        message: 'Invalid parameter: client_resource_id. Must be a string of ASCII-printable characters. Note that 256-bit hex strings are disallowed because of the potential confusion with transaction hashes.',
        type: 'invalid_request',
        error: 'restINVALID_PARAMETER'
      })))
      .end(done);
  });

  test('/payments -- invalid source_account', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message, {hash: hash}));
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments')
      .send(fixtures.payment({
        value: '0.001',
        currency: 'USD',
        issuer: addresses.ISSUER,
        hash: hash,
        sourceAccount: 'foo'
      }))
      .expect(testutils.checkStatus(400))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(errors.RESTErrorResponse({
        message: 'Invalid parameter: source_account. Must be a valid Divvy address',
        type: 'invalid_request',
        error: 'restINVALID_PARAMETER'
      })))
      .end(done);
  });

  test('/payments -- invalid destination_account', function(done) {
    var hash = testutils.generateHash();

    self.wss.once('request_account_info', function(message, conn) {
      assert.strictEqual(message.command, 'account_info');
      assert.strictEqual(message.account, addresses.VALID);
      conn.send(fixtures.accountInfoResponse(message));
    });

    self.wss.once('request_submit', function(message, conn) {
      assert.strictEqual(message.command, 'submit');
      conn.send(fixtures.requestSubmitResponse(message, {hash: hash}));
    });

    self.app
      .post('/v1/accounts/' + addresses.VALID + '/payments')
      .send(fixtures.payment({
        value: '0.001',
        currency: 'USD',
        issuer: addresses.ISSUER,
        hash: hash,
        destinationAccount: 'foo'
      }))
      .expect(testutils.checkStatus(400))
      .expect(testutils.checkHeaders)
      .expect(testutils.checkBody(errors.RESTErrorResponse({
        message: 'Invalid parameter: destination_account. Must be a valid Divvy address',
        type: 'invalid_request',
        error: 'restINVALID_PARAMETER'
      })))
      .end(done);
  });

  test('/payments -- issuer with XDV source_amount');

  test('/payments -- issuer with XDV destination_amount');

  test('/payments -- issuer with XDV destination_amount');

  test('/payments -- valid source_tag');

  test('/payments -- invalid source_tag');

  test('/payments -- valid destination_tag');

  test('/payments -- invalid destination_tag');

  test('/payments -- invalid source_slippage');

  test('/payments -- invalid invoice_id');

  test('/payments -- invalid invoice_id');

  test('/payments -- invalid paths (object)');

  test('/payments -- invalid paths (string)');

  test('/payments -- invalid partial_payment flag');

  test('/payments -- invalid no_direct_divvy flag');

});
