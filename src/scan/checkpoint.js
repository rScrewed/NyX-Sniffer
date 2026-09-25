'use strict';

const fs = require('fs');
const path = require('path');

const CHECKPOINT_FILE = 'progress.json';
const TEMPORARY_PREFIX = '_tmp_';

function temporaryDirectoryFor(targetUserId) {
  return TEMPORARY_PREFIX + targetUserId;
}

function targetUserIdFrom(temporaryDirectory) {
  return temporaryDirectory.replace(TEMPORARY_PREFIX, '');
}

function isTemporaryDirectory(name) {
  return name.startsWith(TEMPORARY_PREFIX);
}

function loadCheckpoint(temporaryDirectory) {
  const file = path.join(temporaryDirectory, CHECKPOINT_FILE);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function saveCheckpoint(temporaryDirectory, state) {
  fs.writeFileSync(path.join(temporaryDirectory, CHECKPOINT_FILE), JSON.stringify({
    targetUserId: state.scan.targetUserId,
    mode: state.scan.operation,
    resolvedUsername: state.username,
    resolvedAvatar: state.avatar,
    completedGuildIds: [...state.completedGuildIds],
    allMessages: state.messages,
    allMentions: state.mentions,
    summary: state.summary,
  }));
}

module.exports = { CHECKPOINT_FILE, temporaryDirectoryFor, targetUserIdFrom, isTemporaryDirectory, loadCheckpoint, saveCheckpoint };
