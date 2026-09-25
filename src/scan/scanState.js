'use strict';

const { saveCheckpoint } = require('./checkpoint');
const { createChannelDirectory } = require('./channelDirectory');

function belongsToCompletedGuild(completedGuildIds) {
  return (item) => !item.guildId || completedGuildIds.has(item.guildId);
}

function createScanState({ scan, temporaryDirectory, resume }) {
  const completedGuildIds = new Set(resume ? resume.completedGuildIds || [] : []);
  const keep = belongsToCompletedGuild(completedGuildIds);

  const state = {
    scan,
    temporaryDirectory,
    username: resume ? resume.resolvedUsername || null : null,
    avatar: resume ? resume.resolvedAvatar || null : null,
    messages: resume ? (resume.allMessages || []).filter(keep) : [],
    mentions: resume ? (resume.allMentions || []).filter(keep) : [],
    summary: resume ? (resume.summary || []).filter(keep) : [],
    completedGuildIds,
    channelDirectory: createChannelDirectory(),
  };

  state.checkpoint = () => saveCheckpoint(temporaryDirectory, state);

  state.recordAuthor = (username) => {
    if (!state.username) state.username = username;
  };

  return state;
}

module.exports = { createScanState };
