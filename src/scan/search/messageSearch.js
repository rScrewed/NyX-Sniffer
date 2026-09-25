'use strict';

const { buildGuildSearchPath } = require('../../discord/searchQuery');
const { authorTag } = require('../../discord/user');
const { stripEmoji } = require('../../shared/text');
const { summarizeFiles } = require('../../shared/fileCategories');
const { paginateGuildSearch } = require('./paginatedSearch');
const { downloadMessageFiles } = require('./attachments');

function resolveChannelName(message, channelMap) {
  if (message.channel && message.channel.name) return message.channel.name;
  return channelMap[message.channel_id] ? channelMap[message.channel_id].name : null;
}

function searchMessages({ guild, scan, filesDirectory, downloader, onAuthorResolved, onProgress, context }) {
  const collected = [];
  let authorResolved = false;

  async function handleMessage(message, channelMap) {
    if (!authorResolved && message.author && message.author.id === scan.targetUserId) {
      const tag = authorTag(message);
      if (tag) {
        await onAuthorResolved(tag, message.author);
        authorResolved = true;
      }
    }

    const files = scan.downloadFiles
      ? await downloadMessageFiles({ message, guildId: guild.id, filesDirectory, downloader, report: context.report, setMood: context.setMood })
      : [];

    collected.push({
      messageId: message.id,
      channelId: message.channel_id,
      channelName: stripEmoji(resolveChannelName(message, channelMap)),
      guildId: guild.id,
      guildName: stripEmoji(guild.name),
      authorId: message.author && message.author.id ? message.author.id : null,
      authorTag: authorTag(message),
      authorAvatar: message.author && message.author.avatar ? message.author.avatar : null,
      timestamp: message.timestamp,
      content: message.content,
      attachments: (message.attachments || []).map((attachment) => attachment.url),
      embeds: message.embeds || [],
      files,
      type: message.type,
    });
  }

  function reportProgress() {
    if (!onProgress) return;
    const allFiles = collected.flatMap((message) => message.files || []);
    onProgress(collected.length, allFiles.length > 0 ? summarizeFiles(allFiles) : '');
  }

  return paginateGuildSearch({
    noun: 'messages',
    buildPath: ({ offset, minId, maxId }) => buildGuildSearchPath({ guildId: guild.id, authorId: scan.targetUserId, offset, minId, maxId }),
    trackChannels: true,
    skipDuplicates: false,
    announceMessages: true,
    collected,
    handleMessage,
    reportProgress,
    context,
  });
}

module.exports = { searchMessages };
