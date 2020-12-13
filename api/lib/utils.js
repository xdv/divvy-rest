/* eslint-disable valid-jsdoc */
'use strict';
var bignum = require('bignumber.js');
var validator = require('./schema-validator.js');
var divvy = require('divvy-lib');

function renameCounterpartyToIssuer(amount) {
  if (amount && amount.counterparty) {
    amount.issuer = amount.counterparty;
    delete amount.counterparty;
  }
  return amount;
}

function dropsToXdv(drops) {
  return bignum(drops).dividedBy(1000000.0).toString();
}

function xdvToDrops(xdv) {
  return bignum(xdv).times(1000000.0).floor().toString();
}

function isValidHash256(hash) {
  return validator.isValid(hash, 'Hash256');
}

function parseLedger(ledger) {
  if (/^current$|^closed$|^validated$/.test(ledger)) {
    return ledger;
  }

  if (ledger && Number(ledger) >= 0 && isFinite(Number(ledger))) {
    return Number(ledger);
  }

  if (isValidHash256(ledger)) {
    return ledger;
  }

  return 'validated';
}

function parseCurrencyAmount(divvydAmount, useIssuer) {
  var amount = {};

  if (typeof divvydAmount === 'string') {
    amount.currency = 'XDV';
    amount.value = dropsToXdv(divvydAmount);
    if (useIssuer) {
      amount.issuer = '';
    } else {
      amount.counterparty = '';
    }
  } else {
    amount.currency = divvydAmount.currency;
    amount.value = divvydAmount.value;
    if (useIssuer) {
      amount.issuer = divvydAmount.issuer;
    } else {
      amount.counterparty = divvydAmount.issuer;
    }
  }

  return amount;
}

function txFromRestAmount(restAmount) {
  if (restAmount.currency === 'XDV') {
    return xdvToDrops(restAmount.value);
  }
  return {
    currency: restAmount.currency,
    issuer: restAmount.counterparty ?
      restAmount.counterparty : restAmount.issuer,
    value: restAmount.value
  };
}

function parseCurrencyQuery(query) {
  var params = query.split('+');

  if (!isNaN(params[0])) {
    return {
      value: (params.length >= 1 ? params[0] : ''),
      currency: (params.length >= 2 ? params[1] : ''),
      counterparty: (params.length >= 3 ? params[2] : '')
    };
  }
  return {
    currency: (params.length >= 1 ? params[0] : ''),
    counterparty: (params.length >= 2 ? params[1] : '')
  };
}

function signum(num) {
  return (num === 0) ? 0 : (num > 0 ? 1 : -1);
}

/**
 *  Order two divvyd transactions based on their ledger_index.
 *  If two transactions took place in the same ledger, sort
 *  them based on TransactionIndex
 *  See: https://xdv.io/build/transactions/
 *
 *  @param {Object} first
 *  @param {Object} second
 *  @returns {Number} [-1, 0, 1]
 */
function compareTransactions(first, second) {
  if (first.ledger_index === second.ledger_index) {
    return signum(
      Number(first.meta.TransactionIndex) -
      Number(second.meta.TransactionIndex));
  }
  return Number(first.ledger_index) < Number(second.ledger_index) ? -1 : 1;
}

function isValidLedgerSequence(ledger) {
  return (Number(ledger) >= 0) && isFinite(Number(ledger));
}

function isValidLedgerHash(ledger) {
  return divvy.UInt256.is_valid(ledger);
}

function isValidLedgerWord(ledger) {
  return (/^current$|^closed$|^validated$/.test(ledger));
}

module.exports = {
  isValidLedgerSequence: isValidLedgerSequence,
  isValidLedgerWord: isValidLedgerWord,
  isValidLedgerHash: isValidLedgerHash,
  dropsToXdv: dropsToXdv,
  xdvToDrops: xdvToDrops,
  parseLedger: parseLedger,
  parseCurrencyAmount: parseCurrencyAmount,
  parseCurrencyQuery: parseCurrencyQuery,
  txFromRestAmount: txFromRestAmount,
  compareTransactions: compareTransactions,
  renameCounterpartyToIssuer: renameCounterpartyToIssuer
};

