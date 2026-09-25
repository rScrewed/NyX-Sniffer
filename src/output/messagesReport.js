'use strict';

const fs = require('fs');
const path = require('path');
const { countByCategory, summarizeCounts, summarizeFiles } = require('../shared/fileCategories');
const { DOUBLE_RULE, SINGLE_RULE, DOTTED_RULE, TOTAL_RULE, groupByServerAndChannel, sortedByTimestamp, longestName } = require('./reportFormat');

function messageLink(guildId, channelId, messageId) {
  return 'https://discord.com/channels/' + guildId + '/' + channelId + '/' + messageId;
}

function renderMessage(message) {
  let text = '      [' + new Date(message.timestamp).toLocaleString() + ']\n';
  if (message.content) text += '      ' + message.content + '\n';

  if (message.attachments && message.attachments.length) {
    text += '\n      ATTACHMENTS\n';
    for (const url of message.attachments) text += '        ' + url + '\n';
  }

  if (message.files && message.files.length) {
    text += '\n      SAVED FILES\n';
    for (const file of message.files) {
      const link = messageLink(file.guildId || message.guildId, file.channelId || message.channelId, file.messageId || message.messageId);
      text += '        [' + file.type + ']  ' + file.localPath + '\n';
      text += '        Message: ' + link + '\n';
    }
  }
  return text + '\n';
}

function renderMessagesText({ options, username, messages, serverSummaries, totalFiles, filesDirectory }) {
  let text = 'DISCORD OSINT\n' + DOUBLE_RULE + '\n\n';
  text += '  User       : ' + username + ' (' + options.targetUserId + ')\n';
  text += '  Mode       : ' + options.label + '\n';
  text += '  Scraped    : ' + new Date().toISOString() + '\n';
  text += '  Total msgs : ' + messages.length + '\n';
  text += '  Total files: ' + totalFiles + '\n\n';
  text += DOUBLE_RULE + '\n\n';

  for (const [server, channels] of Object.entries(groupByServerAndChannel(messages))) {
    text += '  SERVER: ' + server + '\n  ' + SINGLE_RULE + '\n\n';
    for (const [channel, channelMessages] of Object.entries(channels)) {
      const fileCount = channelMessages.reduce((sum, message) => sum + (message.files ? message.files.length : 0), 0);
      text += '    ' + channel + '  ·  ' + channelMessages.length + ' message(s)  ·  ' + fileCount + ' file(s)\n    ' + DOTTED_RULE + '\n\n';
      for (const message of sortedByTimestamp(channelMessages)) text += renderMessage(message);
    }
    text += '\n';
  }

  const width = longestName(serverSummaries.map((entry) => entry.server), 6);
  const grandTotals = options.downloadFiles && totalFiles > 0
    ? '  [ ' + summarizeCounts(countByCategory(messages.flatMap((message) => message.files || []))) + ' ]'
    : '';

  text += DOUBLE_RULE + '\n  SUMMARY\n' + DOUBLE_RULE + '\n\n';
  for (const entry of serverSummaries) {
    const breakdown = options.downloadFiles && entry.files.length > 0 ? '  [ ' + summarizeFiles(entry.files) + ' ]' : '';
    text += '  ' + entry.server.padEnd(width + 2) + '  ' + String(entry.count).padStart(5) + ' msg(s)  ' + String(entry.files.length).padStart(4) + ' file(s)' + breakdown + '\n';
  }
  text += '\n  ' + TOTAL_RULE + '\n';
  text += '  ' + 'TOTAL'.padEnd(width + 2) + '  ' + String(messages.length).padStart(5) + ' msg(s)  ' + String(totalFiles).padStart(4) + ' file(s)' + grandTotals + '\n';
  if (options.downloadFiles) text += '\n  Output directory: ./' + filesDirectory + '/\n';
  return text;
}

function writeMessagesReport(outputDirectory, filesDirectory, { options, username, avatar, messages, serverSummaries, totalFiles }) {
  fs.writeFileSync(path.join(outputDirectory, 'messages.json'), JSON.stringify({
    userId: options.targetUserId,
    username,
    targetAvatar: avatar || null,
    mode: options.label,
    total: messages.length,
    messages,
  }, null, 2));

  fs.writeFileSync(
    path.join(outputDirectory, 'messages.txt'),
    renderMessagesText({ options, username, messages, serverSummaries, totalFiles, filesDirectory }),
  );
}

module.exports = { writeMessagesReport };
