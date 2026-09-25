'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createScanOptions } = require('../../src/config/scanOptions');
const { writeMessagesReport } = require('../../src/output/messagesReport');
const { writeMentionsReport, rankMentioners } = require('../../src/output/mentionsReport');
const { buildMessageRows, buildFilesOnlyRows, buildMentionRows } = require('../../src/output/resultRows');
const { makeTempDirectory, removeDirectory } = require('../support/helpers');

const scan = createScanOptions({ targetUserId: '111111111111111111', operation: 'all' });

const messages = [
  {
    messageId: '1', channelId: 'c1', channelName: 'general', guildId: 'g1', guildName: 'Alpha', timestamp: '2024-01-02T03:04:05.000Z',
    content: 'hello world', attachments: ['https://cdn.example/a.png'],
    files: [{ type: 'attachment', localPath: 'out/files/images/a.png', guildId: 'g1', channelId: 'c1', messageId: '1' }],
  },
  { messageId: '2', channelId: 'c1', channelName: 'general', guildId: 'g1', guildName: 'Alpha', timestamp: '2024-01-01T03:04:05.000Z', content: 'first', files: [] },
];
const serverSummaries = [{ server: 'Alpha', count: 2, files: messages[0].files, mentions: 1 }];
const mentions = [
  { messageId: '9', channelName: 'general', guildName: 'Alpha', guildId: 'g1', senderId: 's1', senderTag: 'sender', senderAvatar: null, timestamp: '2024-01-03T00:00:00.000Z', content: 'hey <@1>' },
  { messageId: '10', channelName: 'general', guildName: 'Alpha', guildId: 'g1', senderId: 's1', senderTag: 'sender', senderAvatar: null, timestamp: '2024-01-04T00:00:00.000Z', content: 'again' },
  { messageId: '11', channelName: 'chat', guildName: 'Alpha', guildId: 'g1', senderId: 's2', senderTag: 'other', senderAvatar: 'x', timestamp: '2024-01-05T00:00:00.000Z', content: 'ping' },
];

test('messages report writes json and a readable text report', () => {
  const directory = makeTempDirectory();
  try {
    writeMessagesReport(directory, 'out/files', { options: scan, username: 'kit', avatar: 'av', messages, serverSummaries, totalFiles: 1 });
    const json = JSON.parse(fs.readFileSync(path.join(directory, 'messages.json'), 'utf8'));
    assert.deepEqual(Object.keys(json), ['userId', 'username', 'targetAvatar', 'mode', 'total', 'messages']);
    assert.equal(json.total, 2);
    assert.equal(json.mode, 'all');

    const text = fs.readFileSync(path.join(directory, 'messages.txt'), 'utf8');
    assert.match(text, /User {7}: kit \(111111111111111111\)/);
    assert.match(text, /SERVER: Alpha/);
    assert.match(text, /#general {2}· {2}2 message\(s\) {2}· {2}1 file\(s\)/);
    assert.match(text, /\[attachment\] {2}out\/files\/images\/a\.png/);
    assert.match(text, /Message: https:\/\/discord\.com\/channels\/g1\/c1\/1/);
    assert.match(text, /Output directory: \.\/out\/files\//);
    assert.ok(text.indexOf('first') < text.indexOf('hello world'));
  } finally {
    removeDirectory(directory);
  }
});

test('mentions are ranked by sender and written to disk', () => {
  const ranked = rankMentioners(mentions);
  assert.deepEqual(ranked.map((user) => [user.id, user.count]), [['s1', 2], ['s2', 1]]);

  const directory = makeTempDirectory();
  try {
    const mentioners = writeMentionsReport(directory, {
      options: scan,
      username: 'kit',
      avatar: null,
      mentions,
      serverSummaries: [{ server: 'Alpha', count: 3, files: [], mentions: 3 }],
    });
    assert.equal(mentioners.length, 2);
    const json = JSON.parse(fs.readFileSync(path.join(directory, 'mentions.json'), 'utf8'));
    assert.equal(json.total, 3);
    assert.equal(json.mentioners[0].messages.length, 2);
    const text = fs.readFileSync(path.join(directory, 'mentions.txt'), 'utf8');
    assert.match(text, /Total pings: 3/);
    assert.match(text, /sender {2,}ID: s1 {2}· {2}2 mention\(s\)/);
  } finally {
    removeDirectory(directory);
  }
});

test('result rows summarise messages, files and mentions', () => {
  const rows = buildMessageRows({ options: scan, messages, serverSummaries, totalFiles: 1, elapsed: '1.0s' });
  assert.equal(rows[0], '  Files');
  assert.match(rows[1], /Alpha +2 msg\(s\) +1 file\(s\) +1 img/);
  assert.match(rows[2], /^ {2}Total/);
  assert.equal(rows[3], '  Got 2 message(s) in 1.0s');

  assert.deepEqual(buildMessageRows({ options: scan, messages: [], serverSummaries: [], totalFiles: 0, elapsed: null }), ['  No messages found.']);
  assert.deepEqual(buildFilesOnlyRows({ summary: [], totalFiles: 0, elapsed: null }), ['  No files found.']);

  const files = buildFilesOnlyRows({ summary: serverSummaries, totalFiles: 1, elapsed: '2s' });
  assert.match(files[1], /Alpha +1 file\(s\) {2}1 img/);

  const mentionRows = buildMentionRows({ mentioners: rankMentioners(mentions), serverSummaries, total: 3, elapsed: null });
  assert.equal(mentionRows[0], '  Most Mentions');
  assert.match(mentionRows[1], /sender +2×/);
  assert.match(mentionRows[3], /Total +3 ping\(s\) across 1 server\(s\)/);
});
