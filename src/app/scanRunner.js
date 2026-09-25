'use strict';

const fs = require('fs');
const terminal = require('../terminal');
const { createScanOptions } = require('../config/scanOptions');
const { resolveProfile } = require('../discord/profile');
const { createDownloader } = require('../files/downloader');
const { temporaryDirectoryFor } = require('../scan/checkpoint');
const { createScanState } = require('../scan/scanState');
const { runSequentialScan } = require('../scan/sequentialScan');
const { runParallelScan } = require('../scan/parallel/parallelScan');
const { formatElapsed } = require('../shared/time');
const { printTargetProfile } = require('./targetProfile');

const PROFILE_PAUSE_MS = 1500;

async function identifyTarget({ scan, guilds, client, state }) {
  const profile = await resolveProfile(client, scan.targetUserId);
  if (!profile) return null;

  printTargetProfile({ profile, targetUserId: scan.targetUserId, guilds });
  if (!state.username) state.username = profile.tag;
  if (!state.avatar) state.avatar = profile.avatar;
  return profile;
}

function restrictToMutualServers(guilds, profile) {
  if (!profile || !profile.mutualGuilds || profile.mutualGuilds.length === 0) return guilds;

  const mutualIds = new Set(profile.mutualGuilds.map((mutual) => mutual.id));
  const mutual = guilds.filter((guild) => mutualIds.has(guild.id));
  terminal.log('  scanning ' + mutual.length + ' mutual server(s)');
  terminal.log('');
  return mutual;
}

async function runScan({ selection, pool }) {
  const { targetUserId, operation, guilds, guildMembership, resume } = selection;
  const scan = createScanOptions({ targetUserId, operation });

  terminal.setMood('hunting');

  const temporaryDirectory = resume ? resume.directory : temporaryDirectoryFor(targetUserId);
  const state = createScanState({ scan, temporaryDirectory, resume: resume ? resume.checkpoint : null });

  const profile = await identifyTarget({ scan, guilds, client: pool.client, state });
  const selectedGuilds = restrictToMutualServers(guilds, profile);

  await terminal.delay(PROFILE_PAUSE_MS);

  if (!fs.existsSync(temporaryDirectory)) fs.mkdirSync(temporaryDirectory);

  const downloader = createDownloader();
  if (resume && resume.checkpoint) downloader.registerExisting(state.messages);

  terminal.log('');

  const guildsToProcess = state.completedGuildIds.size > 0
    ? selectedGuilds.filter((guild) => !state.completedGuildIds.has(guild.id))
    : selectedGuilds;

  if (state.completedGuildIds.size > 0) {
    terminal.log('  ' + state.completedGuildIds.size + ' server(s) already done, ' + guildsToProcess.length + ' remaining');
    terminal.log('');
  }

  const startedAt = Date.now();
  const finalGuild = guildsToProcess[guildsToProcess.length - 1];

  const tokens = pool.activeTokens();
  if (tokens.length > 1) {
    await runParallelScan({ state, guilds: guildsToProcess, finalGuild, guildMembership, tokens, mainClient: pool.client, downloader });
  } else {
    await runSequentialScan({ state, guilds: guildsToProcess, finalGuild, downloader, client: pool.client });
  }

  return { scan, state, profile, guilds, elapsed: formatElapsed(Date.now() - startedAt) };
}

module.exports = { runScan };
