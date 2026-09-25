'use strict';

const { stripEmoji } = require('../shared/text');
const { searchMessages, searchFiles, searchMentions } = require('./search');

async function collectGuild({ guild, state, downloader, context, hooks }) {
  const { scan } = state;
  const server = stripEmoji(guild.name) || guild.id;
  const recordIdentity = async (username) => state.recordAuthor(username);
  const shared = { guild, scan, filesDirectory: state.temporaryDirectory, downloader, context };

  if (scan.mentionsOnly) {
    const mentions = await searchMentions({ ...shared, onTargetResolved: recordIdentity, onProgress: hooks.onProgress });
    state.mentions.push(...mentions);
    state.summary.push({ server, guildId: guild.id, count: mentions.length, files: [], mentions: mentions.length });
    if (hooks.onCollected) hooks.onCollected(mentions.length);
    return mentions.length;
  }

  const search = scan.filesOnly ? searchFiles : searchMessages;
  const messages = await search({ ...shared, onAuthorResolved: recordIdentity, onProgress: hooks.onProgress });
  const files = messages.flatMap((message) => message.files || []);
  state.messages.push(...messages);

  let mentions = [];
  if (scan.includesAll) {
    if (hooks.beforeMentions) hooks.beforeMentions(server);
    mentions = await searchMentions({
      ...shared,
      onTargetResolved: recordIdentity,
      onProgress: (count, meta) => hooks.onMentionProgress(count, meta, messages.length),
    });
    state.mentions.push(...mentions);
  } else if (hooks.onCollected) {
    hooks.onCollected(scan.filesOnly ? files.length : messages.length);
  }

  state.summary.push({ server, guildId: guild.id, count: messages.length, files, mentions: mentions.length });
  return messages.length;
}

module.exports = { collectGuild };
