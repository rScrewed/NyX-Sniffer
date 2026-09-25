'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { settings } = require('../../src/config/settings');
const { createDiscordClient } = require('../../src/discord/client');
const { createScanOptions } = require('../../src/config/scanOptions');
const { createDownloader } = require('../../src/files/downloader');
const { searchMessages, searchFiles, searchMentions } = require('../../src/scan/search');
const { createFakeFetch, TARGET_ID, GUILDS, MESSAGES } = require('../support/fakeDiscord');
const { makeTempDirectory, removeDirectory } = require('../support/helpers');

settings.searchDelayMinMs = 1;
settings.searchDelayMaxMs = 1;
settings.cooldownPerThousandMs = 1;

const fakeFetch = createFakeFetch();
const client = createDiscordClient({ token: 'TOKEN_A', fetchImplementation: fakeFetch });
const guild = GUILDS[0];
const scan = (operation) => createScanOptions({ targetUserId: TARGET_ID, operation });

function context(extra = {}) {
  return {
    request: client.request,
    range: { minId: null, maxId: null },
    report: () => {},
    setMood: () => {},
    log: () => {},
    borrowHelper: null,
    ...extra,
  };
}

const expectedFor = (predicate) => MESSAGES.filter((m) => m.guild_id === guild.id && predicate(m));

test('searchMessages collects every message from the target with the documented shape', async () => {
  const resolved = [];
  const messages = await searchMessages({
    guild,
    scan: scan('messages'),
    filesDirectory: null,
    downloader: null,
    onAuthorResolved: async (tag) => resolved.push(tag),
    onProgress: null,
    context: context(),
  });

  const expected = expectedFor((m) => m.author.id === TARGET_ID);
  assert.equal(messages.length, expected.length);
  assert.deepEqual(resolved, ['target_user']);
  assert.deepEqual(Object.keys(messages[0]), [
    'messageId', 'channelId', 'channelName', 'guildId', 'guildName', 'authorId', 'authorTag',
    'authorAvatar', 'timestamp', 'content', 'attachments', 'embeds', 'files', 'type',
  ]);
  assert.equal(messages[0].guildName, 'Alpha Server');
  assert.match(messages[0].channelName, /general|memes|off-topic/);
  assert.deepEqual(messages[0].files, []);
});

test('searchMessages downloads attachments when the scan asks for files', async () => {
  const directory = makeTempDirectory();
  try {
    const downloader = createDownloader({ fetchImplementation: fakeFetch });
    const messages = await searchMessages({
      guild,
      scan: scan('all'),
      filesDirectory: directory,
      downloader,
      onAuthorResolved: async () => {},
      onProgress: null,
      context: context(),
    });
    const withFiles = messages.filter((message) => message.files.length > 0);
    assert.ok(withFiles.length > 0);
    for (const file of withFiles[0].files) assert.ok(fs.existsSync(file.localPath));
  } finally {
    removeDirectory(directory);
  }
});

test('searchFiles returns only messages that carry attachments', async () => {
  const directory = makeTempDirectory();
  try {
    const messages = await searchFiles({
      guild,
      scan: scan('files'),
      filesDirectory: directory,
      downloader: createDownloader({ fetchImplementation: fakeFetch }),
      onAuthorResolved: async () => {},
      onProgress: null,
      context: context(),
    });
    const expected = expectedFor((m) => m.author.id === TARGET_ID && m.attachments.length > 0);
    assert.equal(messages.length, expected.length);
    assert.deepEqual(Object.keys(messages[0]), ['messageId', 'timestamp', 'guildId', 'channelId', 'authorId', 'authorTag', 'authorAvatar', 'files']);
  } finally {
    removeDirectory(directory);
  }
});

test('searchMentions collects pings of the target and resolves the target tag', async () => {
  const resolved = [];
  const progress = [];
  const mentions = await searchMentions({
    guild,
    scan: scan('mentions'),
    onTargetResolved: async (tag) => resolved.push(tag),
    onProgress: (count) => progress.push(count),
    context: context(),
  });
  const expected = expectedFor((m) => m.mentions.some((u) => u.id === TARGET_ID));
  assert.equal(mentions.length, expected.length);
  assert.deepEqual(resolved, ['target_user']);
  assert.equal(progress[progress.length - 1], expected.length);
  assert.deepEqual(Object.keys(mentions[0]).slice(0, 4), ['messageId', 'channelId', 'channelName', 'guildId']);
  assert.equal(mentions[0].mentionedUsers[0].id, TARGET_ID);
});

test('a worker slice restricted by snowflake range only sees its share', async () => {
  const all = expectedFor((m) => m.author.id === TARGET_ID).sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  const middle = all[Math.floor(all.length / 2)].id;
  const slice = await searchMessages({
    guild,
    scan: scan('messages'),
    filesDirectory: null,
    downloader: null,
    onAuthorResolved: async () => {},
    onProgress: null,
    context: context({ range: { minId: null, maxId: middle } }),
  });
  assert.equal(slice.length, all.filter((m) => BigInt(m.id) <= BigInt(middle)).length);
});
