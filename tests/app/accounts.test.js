'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAccountPool } = require('../../src/app/accounts');
const { MAX_ACTIVE_WORKERS, WORKER_WINDOW_THRESHOLD } = require('../../src/config/limits');

const envWithTokens = (count) => Object.fromEntries(Array.from({ length: count }, (_, index) => ['Token' + (index + 1), 'token-' + (index + 1)]));

test('no more than the efficient number of workers is used', () => {
  const pool = createAccountPool(envWithTokens(41));
  assert.equal(pool.tokens.length, 41);
  assert.equal(pool.activeTokens().length, MAX_ACTIVE_WORKERS);
  assert.equal(pool.activeTokens()[0], 'token-1');
  assert.equal(createAccountPool(envWithTokens(5)).activeTokens().length, 5);
});

test('the separate worker window starts below the worker cap', () => {
  assert.equal(WORKER_WINDOW_THRESHOLD, 15);
  assert.ok(WORKER_WINDOW_THRESHOLD < MAX_ACTIVE_WORKERS);
});
