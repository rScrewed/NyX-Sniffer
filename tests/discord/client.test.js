'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { settings } = require('../../src/config/settings');
const { createDiscordClient, RATE_LIMIT_STRATEGIES } = require('../../src/discord/client');
const { noopUi } = require('../support/helpers');

const jsonResponse = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: () => 'application/json' },
  json: async () => body,
  text: async () => JSON.stringify(body),
});

test('request sends the token and returns parsed JSON', async () => {
  const seen = [];
  const client = createDiscordClient({
    token: '"quoted-token"',
    fetchImplementation: async (url, init) => {
      seen.push({ url, init });
      return jsonResponse(200, { id: '1' });
    },
  });
  assert.deepEqual(await client.request('/users/@me'), { id: '1' });
  assert.equal(seen[0].url, 'https://discord.com/api/v9/users/@me');
  assert.equal(seen[0].init.headers.Authorization, 'quoted-token');
  assert.equal(seen[0].init.method, 'GET');
});

test('non-JSON responses are reported and skipped', async () => {
  const ui = noopUi();
  const client = createDiscordClient({
    token: 't',
    ui,
    fetchImplementation: async () => ({ status: 502, headers: { get: () => 'text/html' }, text: async () => '<html>bad gateway</html>' }),
  });
  assert.deepEqual(await client.request('/x'), { code: 502, message: 'non-JSON response (HTTP 502)' });
  assert.equal(ui.calls.length, 2);
});

test('abort mode hands rate limits back to the caller', async () => {
  const limits = [];
  const client = createDiscordClient({
    token: 't',
    rateLimit: RATE_LIMIT_STRATEGIES.ABORT,
    onRateLimit: (label, retryAfter) => limits.push([label, retryAfter]),
    fetchImplementation: async () => jsonResponse(429, { retry_after: 2.5 }),
  });
  assert.deepEqual(await client.request('/x'), { rateLimitAbort: true, retryAfterMs: 3500 });
  assert.deepEqual(limits, [["⟳  rate limited", 3500]]);
});

test('wait mode sleeps through a rate limit then retries', async () => {
  const previous = settings.rateLimitWaitMs;
  settings.rateLimitWaitMs = 30;
  try {
    let calls = 0;
    const client = createDiscordClient({
      token: 't',
      fetchImplementation: async () => (++calls === 1 ? jsonResponse(429, { retry_after: 0 }) : jsonResponse(200, { ok: true })),
    });
    assert.deepEqual(await client.request('/x'), { ok: true });
    assert.equal(calls, 2);
  } finally {
    settings.rateLimitWaitMs = previous;
  }
});

test('network errors are retried before giving up', async () => {
  let calls = 0;
  const client = createDiscordClient({
    token: 't',
    retryDelayMs: 1,
    fetchImplementation: async () => {
      calls++;
      throw new Error('boom');
    },
  });
  const result = await client.request('/x');
  assert.equal(calls, 3);
  assert.deepEqual(result, { code: -1, message: 'boom' });
});
