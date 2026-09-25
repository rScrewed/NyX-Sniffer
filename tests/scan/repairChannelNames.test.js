'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { repairChannelNames } = require('../../src/scan/repairChannelNames');
const { makeTempDirectory, removeDirectory } = require('../support/helpers');

const request = async (requestPath) => {
  if (requestPath === '/guilds/g1/channels') return [{ id: 'c1', name: 'general' }, { id: 'c2', name: 'memes' }];
  return { code: 10003 };
};

test('channel names are filled into existing scan files', async () => {
  const directory = makeTempDirectory();
  try {
    const mention = { guildId: 'g1', channelId: 'c2', channelName: null, senderId: 's' };
    fs.writeFileSync(path.join(directory, 'messages.json'), JSON.stringify({
      messages: [
        { guildId: 'g1', channelId: 'c1', channelName: null },
        { guildId: 'g1', channelId: 'c1', channelName: null },
        { guildId: 'g1', channelId: 'gone', channelName: null },
      ],
    }));
    fs.writeFileSync(path.join(directory, 'mentions.json'), JSON.stringify({
      mentions: [mention],
      mentioners: [{ id: 's', count: 1, messages: [{ ...mention }] }],
    }));

    const result = await repairChannelNames({ folder: directory, request });
    assert.deepEqual(result, { files: 2, resolved: 4, unresolved: 1 });

    const messages = JSON.parse(fs.readFileSync(path.join(directory, 'messages.json'), 'utf8')).messages;
    assert.deepEqual(messages.map((message) => message.channelName), ['general', 'general', null]);
    const mentions = JSON.parse(fs.readFileSync(path.join(directory, 'mentions.json'), 'utf8'));
    assert.equal(mentions.mentions[0].channelName, 'memes');
    assert.equal(mentions.mentioners[0].messages[0].channelName, 'memes');
  } finally {
    removeDirectory(directory);
  }
});

test('a folder without scan data is skipped', async () => {
  const directory = makeTempDirectory();
  try {
    assert.deepEqual(await repairChannelNames({ folder: directory, request }), { files: 0, resolved: 0, unresolved: 0 });
  } finally {
    removeDirectory(directory);
  }
});
