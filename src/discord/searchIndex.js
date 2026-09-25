'use strict';

const INDEX_NOT_READY_CODE = 110000;
const MIN_WAIT_MS = 2000;
const MAX_WAIT_MS = 30000;
const MAX_ATTEMPTS = 6;

function isIndexPending(response) {
  return Boolean(response && response.code === INDEX_NOT_READY_CODE);
}

function indexRetryDelayMs(response) {
  const suggested = typeof response.retry_after === 'number' ? Math.ceil(response.retry_after * 1000) : MIN_WAIT_MS;
  return Math.min(Math.max(suggested, MIN_WAIT_MS), MAX_WAIT_MS);
}

module.exports = { isIndexPending, indexRetryDelayMs, MAX_INDEX_ATTEMPTS: MAX_ATTEMPTS };
