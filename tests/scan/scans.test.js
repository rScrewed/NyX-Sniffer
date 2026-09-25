'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createFakeFetch, TARGET_ID, GUILDS, MESSAGES } = require('../support/fakeDiscord');

const fetchPath = require.resolve('node-fetch');
const fakeFetch = createFakeFetch();
require.cache[fetchPath] = { id: fetchPath, filename: fetchPath, loaded: true, exports: fakeFetch };

const { settings } = require('../../src/config/settings');
const { createDiscordClient } = require('../../src/discord/client');
const { createScanOptions } = require('../../src/config/scanOptions');
const { createDownloader } = require('../../src/files/downloader');
const { createScanState } = require('../../src/scan/scanState');
const { loadCheckpoint } = require('../../src/scan/checkpoint');
const { runSequentialScan } = require('../../src/scan/sequentialScan');
const { runParallelScan } = require('../../src/scan/parallel/parallelScan');
const { silenceTerminal } = require('../support/silentTerminal');
const { makeTempDirectory, removeDirectory } = require('../support/helpers');

settings.searchDelayMinMs = 1;
settings.searchDelayMaxMs = 1;
settings.serverDelayMinMs = 1;
settings.serverDelayMaxMs = 1;
settings.cooldownPerThousandMs = 1;

const targetMessages = MESSAGES.filter((m) => m.author.id === TARGET_ID);
const mentions = MESSAGES.filter((m) => m.mentions.some((user) => user.id === TARGET_ID));
const scanGuilds = GUILDS.slice(0, 3).map((g) => ({ id: g.id, name: g.name }));

function newState(operation, directory) {
  const scan = createScanOptions({ targetUserId: TARGET_ID, operation });
  fs.mkdirSync(directory, { recursive: true });
  return createScanState({ scan, temporaryDirectory: directory, resume: null });
}

test('a sequential scan collects messages, mentions and a summary per server', async () => {
  const root = makeTempDirectory();
  try {
    silenceTerminal();
    const state = newState('all', path.join(root, '_tmp_x'));
    const client = createDiscordClient({ token: 'TOKEN_A' });
    await runSequentialScan({
      state,
      guilds: scanGuilds,
      finalGuild: scanGuilds[scanGuilds.length - 1],
      downloader: createDownloader(),
      client,
    });

    assert.equal(state.messages.length, targetMessages.length);
    assert.equal(state.mentions.length, mentions.length);
    assert.equal(state.completedGuildIds.size, 3);
    assert.equal(state.username, 'target_user');
    assert.deepEqual(state.summary.map((entry) => [entry.server, entry.count]), [['Alpha Server', 130], ['Beta', 60], ['Gamma', 0]]);
    assert.ok(state.messages.some((message) => message.files.length > 0));
    assert.ok(state.messages.every((message) => /^(general|memes|off-topic|chat|media)$/.test(message.channelName)));
    assert.ok(state.mentions.every((mention) => /^(general|memes|off-topic|chat|media)$/.test(mention.channelName)));

    const checkpoint = loadCheckpoint(path.join(root, '_tmp_x'));
    assert.equal(checkpoint.completedGuildIds.length, 3);
    assert.equal(checkpoint.allMessages.length, targetMessages.length);
  } finally {
    removeDirectory(root);
  }
});

test('messages-only and mentions-only scans collect just what they promise', async () => {
  const root = makeTempDirectory();
  try {
    silenceTerminal();
    const client = createDiscordClient({ token: 'TOKEN_A' });

    const messagesOnly = newState('messages', path.join(root, '_tmp_a'));
    await runSequentialScan({ state: messagesOnly, guilds: scanGuilds, finalGuild: scanGuilds[2], downloader: createDownloader(), client });
    assert.equal(messagesOnly.mentions.length, 0);
    assert.ok(messagesOnly.messages.every((message) => message.files.length === 0));

    const mentionsOnly = newState('mentions', path.join(root, '_tmp_b'));
    await runSequentialScan({ state: mentionsOnly, guilds: scanGuilds, finalGuild: scanGuilds[2], downloader: createDownloader(), client });
    assert.equal(mentionsOnly.messages.length, 0);
    assert.equal(mentionsOnly.mentions.length, mentions.length);
  } finally {
    removeDirectory(root);
  }
});

test('parallel workers together collect everything exactly once', async () => {
  for (let run = 0; run < 3; run++) {
    const root = makeTempDirectory();
    try {
      silenceTerminal();
      const state = newState('all', path.join(root, '_tmp_p'));
      const tokens = ['TOKEN_A', 'TOKEN_B', 'TOKEN_C'];
      const guildMembership = new Map();
      GUILDS.forEach((guild, index) => {
        const members = new Set([0, 1]);
        if (index === 0) members.add(2);
        guildMembership.set(guild.id, { guild: scanGuilds[index], memberTokenIdxs: members });
      });

      await runParallelScan({
        state,
        guilds: scanGuilds,
        finalGuild: scanGuilds[2],
        guildMembership,
        tokens,
        mainClient: createDiscordClient({ token: 'TOKEN_A' }),
        downloader: createDownloader(),
      });

      const ids = state.messages.map((message) => message.messageId);
      assert.equal(ids.length, targetMessages.length);
      assert.equal(new Set(ids).size, ids.length);
      assert.equal(state.mentions.length, mentions.length);
      assert.deepEqual(
        state.summary.map((entry) => [entry.server, entry.count]).sort(),
        [['Alpha Server', 130], ['Beta', 60]].sort(),
      );
    } finally {
      removeDirectory(root);
    }
  }
});

test('parallel scan reports when the target is in no server', async () => {
  const root = makeTempDirectory();
  try {
    const { messages } = silenceTerminal();
    const state = newState('all', path.join(root, '_tmp_q'));
    await runParallelScan({
      state,
      guilds: [scanGuilds[2]],
      finalGuild: scanGuilds[2],
      guildMembership: new Map([[scanGuilds[2].id, { guild: scanGuilds[2], memberTokenIdxs: new Set([0, 1]) }]]),
      tokens: ['TOKEN_A', 'TOKEN_B'],
      mainClient: createDiscordClient({ token: 'TOKEN_A' }),
      downloader: createDownloader(),
    });
    assert.equal(state.messages.length, 0);
    assert.ok(messages.some((line) => line.includes('target not found in any server')));
  } finally {
    removeDirectory(root);
  }
});

test('parallel discovery says why a server could not be searched', async () => {
  const root = makeTempDirectory();
  try {
    const { messages } = silenceTerminal();
    const state = newState('all', path.join(root, '_tmp_r'));
    const guild = scanGuilds[1];
    await runParallelScan({
      state,
      guilds: [guild],
      finalGuild: guild,
      guildMembership: new Map([[guild.id, { guild, memberTokenIdxs: new Set([0, 1]) }]]),
      tokens: ['TOKEN_C', 'TOKEN_B'],
      mainClient: createDiscordClient({ token: 'TOKEN_C' }),
      downloader: createDownloader(),
    });
    assert.equal(state.messages.length, 0);
    assert.ok(messages.some((line) => line.includes('Beta') && line.includes('search failed') && line.includes('Missing Access')));
  } finally {
    removeDirectory(root);
  }
});
