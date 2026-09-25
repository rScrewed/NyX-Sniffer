'use strict';

const { buildGuildSearchPath } = require('../../discord/searchQuery');
const { formatUserTag } = require('../../discord/user');
const { stripEmoji } = require('../../shared/text');
const { paginateGuildSearch } = require('./paginatedSearch');

function searchMentions({ guild, scan, onTargetResolved, onProgress, context }) {
  const collected = [];
  let targetResolved = false;

  async function handleMessage(message, channelMap) {
    const mentionedTarget = (message.mentions || []).filter((user) => user.id === scan.targetUserId);

    if (!targetResolved && mentionedTarget.length > 0) {
      const tag = formatUserTag(mentionedTarget[0]);
      if (tag) {
        await onTargetResolved(tag, mentionedTarget[0]);
        targetResolved = true;
      }
    }

    const channel = message.channel && message.channel.name ? message.channel : (channelMap[message.channel_id] || null);

    collected.push({
      messageId: message.id,
      channelId: message.channel_id,
      channelName: stripEmoji(channel ? channel.name : null),
      guildId: guild.id,
      guildName: stripEmoji(guild.name),
      senderId: message.author && message.author.id ? message.author.id : null,
      senderTag: formatUserTag(message.author),
      senderAvatar: message.author && message.author.avatar ? message.author.avatar : null,
      senderDiscriminator: message.author ? (message.author.discriminator || null) : null,
      timestamp: message.timestamp,
      content: message.content,
      mentionedUsers: mentionedTarget.map((user) => ({ id: user.id, tag: formatUserTag(user), avatar: user.avatar || null })),
    });
  }

  return paginateGuildSearch({
    noun: 'mentions',
    buildPath: ({ offset, minId, maxId }) => buildGuildSearchPath({ guildId: guild.id, mentionedId: scan.targetUserId, offset, minId, maxId }),
    trackChannels: true,
    skipDuplicates: false,
    announceMessages: true,
    collected,
    handleMessage,
    reportProgress: () => {
      if (onProgress) onProgress(collected.length);
    },
    context,
  });
}

module.exports = { searchMentions };
