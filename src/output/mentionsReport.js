'use strict';

const fs = require('fs');
const path = require('path');
const { DOUBLE_RULE, SINGLE_RULE, DOTTED_RULE, TOTAL_RULE, groupByServerAndChannel, sortedByTimestamp, longestName } = require('./reportFormat');

function rankMentioners(mentions) {
  const byId = {};
  for (const mention of mentions) {
    if (!mention.senderId) continue;
    if (!byId[mention.senderId]) {
      byId[mention.senderId] = {
        id: mention.senderId,
        tag: mention.senderTag,
        avatar: mention.senderAvatar || null,
        count: 0,
        messages: [],
      };
    }
    byId[mention.senderId].count++;
    byId[mention.senderId].messages.push(mention);
  }
  return Object.values(byId).sort((a, b) => b.count - a.count);
}

function renderMentionsText({ options, username, mentions, mentioners, serverSummaries, total }) {
  let text = 'DISCORD OSINT — MENTIONS\n' + DOUBLE_RULE + '\n\n';
  text += '  Target     : ' + username + ' (' + options.targetUserId + ')\n';
  text += '  Mode       : ' + options.label + '\n';
  text += '  Scraped    : ' + new Date().toISOString() + '\n';
  text += '  Total pings: ' + total + '\n\n';
  text += DOUBLE_RULE + '\n\n';
  text += '  WHO MENTIONED THIS USER\n  ' + SINGLE_RULE + '\n\n';

  if (mentioners.length === 0) {
    text += '  (none found)\n\n';
  } else {
    const width = longestName(mentioners.map((user) => user.tag || user.id), 6);
    for (const user of mentioners) {
      text += '  ' + (user.tag || user.id).padEnd(width + 2) + '  ID: ' + user.id + '  ·  ' + user.count + ' mention(s)\n';
    }
  }
  text += '\n' + DOUBLE_RULE + '\n\n';

  for (const [server, channels] of Object.entries(groupByServerAndChannel(mentions))) {
    text += '  SERVER: ' + server + '\n  ' + SINGLE_RULE + '\n\n';
    for (const [channel, messages] of Object.entries(channels)) {
      text += '    ' + channel + '  ·  ' + messages.length + ' mention(s)\n    ' + DOTTED_RULE + '\n\n';
      for (const message of sortedByTimestamp(messages)) {
        text += '      [' + new Date(message.timestamp).toLocaleString() + ']  from: ' + (message.senderTag || message.senderId) + ' (' + message.senderId + ')\n';
        if (message.content) text += '      ' + message.content + '\n';
        text += '\n';
      }
    }
    text += '\n';
  }

  const width = serverSummaries.length ? longestName(serverSummaries.map((entry) => entry.server), 5) : 5;
  text += DOUBLE_RULE + '\n  SUMMARY\n' + DOUBLE_RULE + '\n\n';
  for (const entry of serverSummaries) {
    text += '  ' + entry.server.padEnd(width + 2) + '  ' + String(entry.mentions).padStart(5) + ' mention(s)\n';
  }
  text += '\n  ' + TOTAL_RULE + '\n';
  text += '  ' + 'TOTAL'.padEnd(width + 2) + '  ' + String(total).padStart(5) + ' mention(s)\n';
  return text;
}

function writeMentionsReport(outputDirectory, { options, username, avatar, mentions, serverSummaries }) {
  const total = mentions.length;
  const mentioners = rankMentioners(mentions);

  fs.writeFileSync(path.join(outputDirectory, 'mentions.json'), JSON.stringify({
    userId: options.targetUserId,
    username,
    targetAvatar: avatar || null,
    mode: options.label,
    total,
    mentioners,
    mentions,
  }, null, 2));

  fs.writeFileSync(
    path.join(outputDirectory, 'mentions.txt'),
    renderMentionsText({ options, username, mentions, mentioners, serverSummaries, total }),
  );

  return mentioners;
}

module.exports = { writeMentionsReport, rankMentioners };
