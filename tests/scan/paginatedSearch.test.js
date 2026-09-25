'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { settings } = require('../../src/config/settings');
const { paginateGuildSearch } = require('../../src/scan/search/paginatedSearch');
const { buildGuildSearchPath } = require('../../src/discord/searchQuery');

settings.searchDelayMinMs = 1;
settings.searchDelayMaxMs = 1;
settings.cooldownPerThousandMs = 1;
settings.rateLimitWaitMs = 10;

function makeMessages(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(1000000 + (count - index)),
    channel_id: 'c',
    author: { id: '1' },
    content: 'message ' + index,
  }));
}

function serverFor(messages) {
  return async (path) => {
    const params = new URL(path, 'https://x').searchParams;
    const offset = parseInt(params.get('offset') || '0', 10);
    const limit = parseInt(params.get('limit') || '25', 10);
    const maxId = params.get('max_id') ? BigInt(params.get('max_id')) : null;
    const minId = params.get('min_id') ? BigInt(params.get('min_id')) : null;
    const matching = messages.filter((m) => (maxId === null || BigInt(m.id) <= maxId) && (minId === null || BigInt(m.id) >= minId));
    return { total_results: matching.length, messages: matching.slice(offset, offset + limit).map((m) => [m]), channels: [] };
  };
}

function baseSearch(collected, extra = {}) {
  return {
    noun: 'messages',
    buildPath: ({ offset, minId, maxId }) => buildGuildSearchPath({ guildId: 'g', authorId: '1', offset, minId, maxId }),
    trackChannels: false,
    skipDuplicates: false,
    announceMessages: false,
    collected,
    handleMessage: async (message) => collected.push(message),
    reportProgress: () => {},
    ...extra,
  };
}

function baseContext(request, extra = {}) {
  const logs = [];
  return {
    logs,
    context: {
      request,
      range: { minId: null, maxId: null },
      report: () => {},
      setMood: () => {},
      log: (message) => logs.push(message),
      borrowHelper: null,
      ...extra,
    },
  };
}

test('collects every page of results', async () => {
  const messages = makeMessages(60);
  const collected = [];
  const { context } = baseContext(serverFor(messages));
  await paginateGuildSearch({ ...baseSearch(collected), context });
  assert.equal(collected.length, 60);
});

test('stops cleanly when nothing matches', async () => {
  const collected = [];
  const { context } = baseContext(serverFor([]));
  await paginateGuildSearch({ ...baseSearch(collected), context });
  assert.equal(collected.length, 0);
});

test('anchors past the 10k offset limit and still collects everything', async () => {
  const messages = makeMessages(10100);
  const collected = [];
  const { context, logs } = baseContext(serverFor(messages));
  await paginateGuildSearch({ ...baseSearch(collected), context });
  assert.equal(collected.length, 10100);
  assert.equal(new Set(collected.map((m) => m.id)).size, 10100);
  assert.ok(logs.some((line) => line.includes('anchoring past limit')));
});

test('honours the min and max snowflake range', async () => {
  const messages = makeMessages(100);
  const collected = [];
  const { context } = baseContext(serverFor(messages), { range: { minId: '1000021', maxId: '1000050' } });
  await paginateGuildSearch({ ...baseSearch(collected), context });
  assert.equal(collected.length, 30);
});

test('skips duplicate messages when asked to', async () => {
  const message = { id: '5', channel_id: 'c', author: { id: '1' } };
  const request = async () => ({ total_results: 2, messages: [[message], [message]] });
  const collected = [];
  const { context } = baseContext(request);
  await paginateGuildSearch({ ...baseSearch(collected, { skipDuplicates: true }), context });
  assert.equal(collected.length, 1);
});

test('tracks channels for handlers that need names', async () => {
  const request = async () => ({ total_results: 1, messages: [[{ id: '5', channel_id: 'c1' }]], channels: [{ id: 'c1', name: 'general' }] });
  const seen = [];
  const { context } = baseContext(request);
  await paginateGuildSearch({
    ...baseSearch([], { trackChannels: true, handleMessage: async (message, channels) => seen.push(channels[message.channel_id].name) }),
    context,
  });
  assert.deepEqual(seen, ['general']);
});

test('logs an error and stops when search access is denied', async () => {
  const collected = [];
  const { context, logs } = baseContext(async () => ({ code: 50001, message: 'Missing Access' }));
  await paginateGuildSearch({ ...baseSearch(collected), context });
  assert.equal(collected.length, 0);
  assert.match(logs[0], /no search access: Missing Access/);
});

test('retries network failures a limited number of times', async () => {
  let calls = 0;
  const { context, logs } = baseContext(async () => {
    calls++;
    return { code: -1, message: 'timeout' };
  });
  await paginateGuildSearch({ ...baseSearch([]), context });
  assert.equal(calls, 5);
  assert.match(logs[0], /no search access: timeout/);
});

test('waits out a rate limit and resumes', async () => {
  const messages = makeMessages(10);
  const inner = serverFor(messages);
  let limited = false;
  const request = async (path) => {
    if (!limited) {
      limited = true;
      return { rateLimitAbort: true, retryAfterMs: 5 };
    }
    return inner(path);
  };
  const collected = [];
  const { context } = baseContext(request);
  await paginateGuildSearch({ ...baseSearch(collected), context });
  assert.equal(collected.length, 10);
});

test('borrows an idle helper when a rate limit hits near the end', async () => {
  const messages = makeMessages(30);
  const inner = serverFor(messages);
  let primaryCalls = 0;
  let released = false;
  const primary = async (path) => {
    primaryCalls++;
    if (primaryCalls === 2) return { rateLimitAbort: true, retryAfterMs: 5 };
    return inner(path);
  };
  const helperPaths = [];
  const helper = { ui: 1, request: async (path) => { helperPaths.push(path); return inner(path); }, release: () => { released = true; } };
  const collected = [];
  const { context } = baseContext(primary, { borrowHelper: () => helper });
  await paginateGuildSearch({ ...baseSearch(collected), context });
  assert.equal(collected.length, 30);
  assert.ok(helperPaths.length >= 1);
  assert.equal(released, true);
});
