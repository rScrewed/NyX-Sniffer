'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createScanOptions } = require('../../src/config/scanOptions');
const { createScanState } = require('../../src/scan/scanState');
const { loadCheckpoint, targetUserIdFrom, temporaryDirectoryFor, isTemporaryDirectory } = require('../../src/scan/checkpoint');
const { makeTempDirectory, removeDirectory } = require('../support/helpers');

const scan = createScanOptions({ targetUserId: '111111111111111111', operation: 'all' });

test('temporary directory names round trip', () => {
  assert.equal(temporaryDirectoryFor('42'), '_tmp_42');
  assert.equal(targetUserIdFrom('_tmp_42'), '42');
  assert.equal(isTemporaryDirectory('_tmp_42'), true);
  assert.equal(isTemporaryDirectory('Everything_x'), false);
});

test('a checkpoint is written in the resumable format', () => {
  const directory = makeTempDirectory();
  try {
    const state = createScanState({ scan, temporaryDirectory: directory, resume: null });
    state.recordAuthor('kit');
    state.recordAuthor('ignored');
    state.messages.push({ guildId: 'a', messageId: '1' });
    state.completedGuildIds.add('a');
    state.checkpoint();

    const saved = loadCheckpoint(directory);
    assert.deepEqual(Object.keys(saved), ['targetUserId', 'mode', 'resolvedUsername', 'resolvedAvatar', 'completedGuildIds', 'allMessages', 'allMentions', 'summary']);
    assert.equal(saved.resolvedUsername, 'kit');
    assert.equal(saved.mode, 'all');
    assert.deepEqual(saved.completedGuildIds, ['a']);
  } finally {
    removeDirectory(directory);
  }
});

test('resuming keeps only data from completed servers', () => {
  const resume = {
    resolvedUsername: 'kit',
    resolvedAvatar: 'av',
    completedGuildIds: ['done'],
    allMessages: [{ guildId: 'done', messageId: '1' }, { guildId: 'partial', messageId: '2' }],
    allMentions: [{ guildId: 'partial', messageId: '3' }],
    summary: [{ server: 'Done', guildId: 'done', count: 1 }, { server: 'Half', guildId: 'partial', count: 1 }, { server: 'Legacy', count: 5 }],
  };
  const state = createScanState({ scan, temporaryDirectory: 'unused', resume });
  assert.equal(state.username, 'kit');
  assert.equal(state.avatar, 'av');
  assert.deepEqual(state.messages.map((m) => m.messageId), ['1']);
  assert.deepEqual(state.mentions, []);
  assert.deepEqual(state.summary.map((entry) => entry.server), ['Done', 'Legacy']);
  assert.ok(state.completedGuildIds.has('done'));
});

test('loadCheckpoint tolerates missing and corrupt files', () => {
  const directory = makeTempDirectory();
  try {
    assert.equal(loadCheckpoint(directory), null);
    fs.writeFileSync(path.join(directory, 'progress.json'), '{not json');
    assert.equal(loadCheckpoint(directory), null);
  } finally {
    removeDirectory(directory);
  }
});
