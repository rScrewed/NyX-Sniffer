'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { settings, DEFAULTS, applyEnvOverrides } = require('../../src/config/settings');

test('applyEnvOverrides applies positive integers only', () => {
  applyEnvOverrides({ SEARCH_DELAY_MIN_MS: '1234', SERVER_DELAY_MAX_MS: '-5', RATE_LIMIT_WAIT_MS: 'abc' });
  assert.equal(settings.searchDelayMinMs, 1234);
  assert.equal(settings.serverDelayMaxMs, DEFAULTS.serverDelayMaxMs);
  assert.equal(settings.rateLimitWaitMs, DEFAULTS.rateLimitWaitMs);
  applyEnvOverrides({ SEARCH_DELAY_MIN_MS: String(DEFAULTS.searchDelayMinMs) });
});
