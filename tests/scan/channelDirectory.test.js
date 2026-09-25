'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createChannelDirectory } = require('../../src/scan/channelDirectory');

function fakeRequest(channels, calls) {
  return async (path) => {
    calls.push(path);
    if (path === '/guilds/g1/channels') return channels.guild;
    const match = path.match(/^\/channels\/(\d+)$/);
    if (match) return channels.single[match[1]] || { code: 10003, message: 'Unknown Channel' };
    return { code: 404 };
  };
}

test('channel names come from the server channel list', async () => {
  const calls = [];
  const directory = createChannelDirectory();
  const request = fakeRequest({ guild: [{ id: '1', name: 'general' }, { id: '2', name: 'memes 🔥' }], single: {} }, calls);
  const records = [{ channelId: '1', channelName: null }, { channelId: '2', channelName: null }, { channelId: '1', channelName: null }];

  await directory.fillNames({ guildId: 'g1', records, request });
  assert.deepEqual(records.map((record) => record.channelName), ['general', 'memes', 'general']);
  assert.deepEqual(calls, ['/guilds/g1/channels']);
});

test('the channel list is fetched once per server', async () => {
  const calls = [];
  const directory = createChannelDirectory();
  const request = fakeRequest({ guild: [{ id: '1', name: 'general' }], single: {} }, calls);
  await Promise.all([
    directory.fillNames({ guildId: 'g1', records: [{ channelId: '1', channelName: null }], request }),
    directory.fillNames({ guildId: 'g1', records: [{ channelId: '1', channelName: null }], request }),
  ]);
  await directory.fillNames({ guildId: 'g1', records: [{ channelId: '1', channelName: null }], request });
  assert.equal(calls.filter((path) => path === '/guilds/g1/channels').length, 1);
});

test('threads and other channels missing from the list are looked up individually', async () => {
  const calls = [];
  const directory = createChannelDirectory();
  const request = fakeRequest({ guild: [{ id: '1', name: 'general' }], single: { 9: { id: '9', name: 'a thread' } } }, calls);
  const records = [{ channelId: '9', channelName: null }, { channelId: '8', channelName: null }, { channelId: '9', channelName: null }];

  await directory.fillNames({ guildId: 'g1', records, request });
  assert.deepEqual(records.map((record) => record.channelName), ['a thread', null, 'a thread']);

  await directory.fillNames({ guildId: 'g1', records: [{ channelId: '8', channelName: null }, { channelId: '9', channelName: null }], request });
  assert.equal(calls.filter((path) => path === '/channels/8').length, 1);
  assert.equal(calls.filter((path) => path === '/channels/9').length, 1);
});

test('failures leave names empty and are retried later', async () => {
  const directory = createChannelDirectory();
  let calls = 0;
  const request = async () => {
    calls++;
    return { rateLimitAbort: true };
  };
  const records = [{ channelId: '1', channelName: null }];
  await directory.fillNames({ guildId: 'g1', records, request });
  assert.equal(records[0].channelName, null);

  const before = calls;
  await directory.fillNames({ guildId: 'g1', records, request });
  assert.ok(calls > before);
});

test('records that already have a name are left alone', async () => {
  const directory = createChannelDirectory();
  const request = async () => assert.fail('no request expected');
  const records = [{ channelId: '1', channelName: 'known' }];
  await directory.fillNames({ guildId: 'g1', records, request });
  assert.equal(records[0].channelName, 'known');
});
