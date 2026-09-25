'use strict';

const { stripEmoji } = require('../shared/text');

const DOUBLE_RULE = '═'.repeat(64);
const SINGLE_RULE = '─'.repeat(60);
const DOTTED_RULE = '·'.repeat(56);
const TOTAL_RULE = '─'.repeat(62);

function groupByServerAndChannel(items) {
  const servers = {};
  for (const item of items) {
    const serverName = stripEmoji(item.guildName) || item.guildId;
    const channelName = item.channelName ? '#' + item.channelName : '#unknown-channel';
    if (!servers[serverName]) servers[serverName] = {};
    if (!servers[serverName][channelName]) servers[serverName][channelName] = [];
    servers[serverName][channelName].push(item);
  }
  return servers;
}

function sortedByTimestamp(items) {
  return [...items].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function longestName(names, minimum) {
  return Math.max(...names.map((name) => name.length), minimum);
}

module.exports = {
  DOUBLE_RULE,
  SINGLE_RULE,
  DOTTED_RULE,
  TOTAL_RULE,
  groupByServerAndChannel,
  sortedByTimestamp,
  longestName,
};
