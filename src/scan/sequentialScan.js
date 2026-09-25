'use strict';

const terminal = require('../terminal');
const { settings } = require('../config/settings');
const { randomBetween } = require('../shared/time');
const { stripEmoji } = require('../shared/text');
const { collectGuild } = require('./guildScan');

function serverProgressContext(request) {
  return {
    request,
    range: { minId: null, maxId: null },
    report: () => {},
    setMood: terminal.setMood,
    log: terminal.log,
    borrowHelper: null,
  };
}

async function scanGuildInline({ guild, state, downloader, request, isFinalGuild }) {
  const { scan } = state;
  const name = stripEmoji(guild.name) || guild.id;
  terminal.server.start(scan.modeName, name, scan.unit);

  await collectGuild({
    guild,
    state,
    downloader,
    context: serverProgressContext(request),
    hooks: {
      onProgress: (count, meta) => terminal.server.update(count, meta),
      onMentionProgress: (count, meta) => terminal.server.update(count, meta),
      onCollected: (count) => terminal.server.update(count),
      beforeMentions: (server) => {
        terminal.server.finish();
        terminal.server.start('Mentions', server, 'mentions');
      },
    },
  });

  terminal.server.finish();
  state.completedGuildIds.add(guild.id);
  state.checkpoint();

  if (!isFinalGuild) {
    terminal.setMood('sleepy');
    await terminal.delay(randomBetween(settings.serverDelayMinMs, settings.serverDelayMaxMs));
    terminal.setMood('hunting');
  }
}

async function runSequentialScan({ state, guilds, finalGuild, downloader, client }) {
  for (const guild of guilds) {
    await scanGuildInline({
      guild,
      state,
      downloader,
      request: client.request,
      isFinalGuild: guild === finalGuild,
    });
  }
}

module.exports = { runSequentialScan };
