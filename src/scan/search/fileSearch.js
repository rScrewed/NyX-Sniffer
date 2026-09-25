'use strict';

const { ATTACHMENT_FILTERS, buildGuildSearchPath } = require('../../discord/searchQuery');
const { authorTag } = require('../../discord/user');
const { summarizeFiles } = require('../../shared/fileCategories');
const { paginateGuildSearch } = require('./paginatedSearch');
const { downloadMessageFiles } = require('./attachments');

function searchFiles({ guild, scan, filesDirectory, downloader, onAuthorResolved, onProgress, context }) {
  const collected = [];
  let authorResolved = false;

  async function handleMessage(message) {
    if (!authorResolved && message.author && message.author.id === scan.targetUserId) {
      const tag = authorTag(message);
      if (tag) {
        await onAuthorResolved(tag, message.author);
        authorResolved = true;
      }
    }

    const files = await downloadMessageFiles({ message, guildId: guild.id, filesDirectory, downloader, report: context.report, setMood: context.setMood });

    collected.push({
      messageId: message.id,
      timestamp: message.timestamp,
      guildId: guild.id,
      channelId: message.channel_id,
      authorId: message.author && message.author.id ? message.author.id : null,
      authorTag: authorTag(message),
      authorAvatar: message.author && message.author.avatar ? message.author.avatar : null,
      files,
    });
  }

  function reportProgress() {
    if (!onProgress) return;
    const totalFiles = collected.reduce((sum, message) => sum + message.files.length, 0);
    const allFiles = collected.flatMap((message) => message.files || []);
    onProgress(totalFiles, allFiles.length > 0 ? summarizeFiles(allFiles) : '');
  }

  return paginateGuildSearch({
    noun: 'files',
    buildPath: ({ offset, minId, maxId }) => buildGuildSearchPath({
      guildId: guild.id,
      authorId: scan.targetUserId,
      attachmentFilters: ATTACHMENT_FILTERS,
      offset,
      minId,
      maxId,
    }),
    trackChannels: false,
    skipDuplicates: true,
    announceMessages: false,
    collected,
    handleMessage,
    reportProgress,
    context,
  });
}

module.exports = { searchFiles };
