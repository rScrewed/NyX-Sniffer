'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isIndexPending, indexRetryDelayMs } = require('../../src/discord/searchIndex');

test('recognises the "index not yet available" response', () => {
  assert.equal(isIndexPending({ code: 110000 }), true);
  assert.equal(isIndexPending({ code: 50001 }), false);
  assert.equal(isIndexPending(null), false);
});

test('retry delays are clamped to a sensible range', () => {
  assert.equal(indexRetryDelayMs({ retry_after: 0.1 }), 2000);
  assert.equal(indexRetryDelayMs({ retry_after: 5 }), 5000);
  assert.equal(indexRetryDelayMs({ retry_after: 500 }), 30000);
  assert.equal(indexRetryDelayMs({}), 2000);
});
