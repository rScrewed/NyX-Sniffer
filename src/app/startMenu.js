'use strict';

const fs = require('fs');
const path = require('path');
const terminal = require('../terminal');
const { saveEnv } = require('../config/envFile');
const { applyEnvOverrides } = require('../config/settings');
const { createDiscordClient, RATE_LIMIT_STRATEGIES } = require('../discord/client');
const { loadCheckpoint, targetUserIdFrom } = require('../scan/checkpoint');
const { sortableScans, runSort } = require('../sorting/sortFiles');
const { presentViewer } = require('./viewerPresenter');
const { findScanFolders, findInterruptedScans } = require('./workspace');

const ENV_CREATED_NOTICE_MS = 900;
const CANCELLED = Symbol('cancelled');

async function chooseFolder(folders) {
  return folders.length === 1 ? folders[0] : terminal.prompts.promptScanFolder(folders);
}

async function openViewer(scanFolders) {
  const folder = await chooseFolder(scanFolders);
  if (!folder) return false;

  const hasMessages = fs.existsSync(path.join(folder, 'messages.json'));
  const hasMentions = fs.existsSync(path.join(folder, 'mentions.json'));
  terminal.stopHeader();
  await presentViewer(folder, hasMentions && !hasMessages ? 'mentions' : 'messages');
  terminal.finalizeOutput();
  return true;
}

async function sortImages(scanFolders) {
  const sortable = sortableScans(scanFolders);
  if (sortable.length === 0) {
    terminal.log('  no scans with downloaded images found  (scan with files enabled first)');
    terminal.log('');
    return false;
  }

  const folder = await chooseFolder(sortable);
  if (!folder) return false;

  const qualityIndex = await terminal.prompts.promptChoice([
    'Balanced  ·  good accuracy, moderate speed',
    'Best      ·  most accurate, slowest  (large model)',
    'Fast      ·  quickest, rougher results',
  ], 'Quality');
  if (qualityIndex === null) return false;

  const outcome = await runSort(folder, ['balanced', 'best', 'fast'][qualityIndex]);
  if (outcome !== 'ran') return false;
  terminal.finalizeOutput();
  return true;
}

async function chooseInterruptedScan(interrupted) {
  const directory = interrupted.length === 1 ? interrupted[0] : await terminal.prompts.promptInterruptedScan(interrupted);
  if (!directory) return null;

  terminal.log('  resuming:           ' + directory);
  terminal.log('');
  return { directory, checkpoint: loadCheckpoint(directory) };
}

async function ensureAccount(pool) {
  if (pool.tokens.length > 0) return;

  const missingEnv = !pool.envExistedAtStartup;
  const noticeLine = missingEnv ? terminal.getOutputLine() : null;
  const token = await terminal.prompts.promptToken({ createEnv: missingEnv });
  if (missingEnv) {
    pool.env.Token = token;
    saveEnv(pool.env);
    terminal.log('  .env created        ✓');
    await terminal.delay(ENV_CREATED_NOTICE_MS);
    terminal.clearLinesFrom(noticeLine);
  }
  pool.useToken(token);
  await pool.reportLogin();
  terminal.log('');
}

async function chooseTarget(resume) {
  if (resume) {
    const targetUserId = targetUserIdFrom(resume.directory);
    terminal.log('  target locked: ' + targetUserId);
    terminal.log('');
    return targetUserId;
  }

  const targetUserId = await terminal.prompts.promptUserId();
  if (!targetUserId) return null;
  terminal.log('  target locked: ' + targetUserId);
  terminal.log('');
  return targetUserId;
}

async function fetchOwnGuilds(pool) {
  let guilds = await pool.client.request('/users/@me/guilds');
  if (Array.isArray(guilds)) return guilds;

  terminal.log('  ✗  token rejected' + (guilds && guilds.message ? '  (' + guilds.message + ')' : ''));
  terminal.log('');
  const token = await terminal.prompts.promptToken({ createEnv: false, label: '  » Fresh Token  : ' });
  pool.env.Token = token;
  saveEnv(pool.env);
  pool.useToken(token);
  await pool.reportLogin();

  guilds = await pool.client.request('/users/@me/guilds');
  if (Array.isArray(guilds)) return guilds;

  terminal.stopHeader();
  process.stdout.write('\n  ✗  still no access — double-check your token and try again.\n\n');
  process.exit(1);
}

async function mapGuildMembership(pool, guilds) {
  const membership = new Map();
  for (const guild of guilds) membership.set(guild.id, { guild, memberTokenIdxs: new Set([0]) });

  const tokens = pool.activeTokens();
  for (let worker = 1; worker < tokens.length; worker++) {
    const client = createDiscordClient({ token: tokens[worker], rateLimit: RATE_LIMIT_STRATEGIES.ABORT });
    const workerGuilds = await client.request('/users/@me/guilds');
    if (!Array.isArray(workerGuilds)) continue;
    for (const guild of workerGuilds) {
      if (membership.has(guild.id)) membership.get(guild.id).memberTokenIdxs.add(worker);
    }
  }
  return membership;
}

function reportGuildCounts(pool, guilds, membership) {
  if (!membership) {
    terminal.log('  ' + guilds.length + ' server(s) found');
    return;
  }
  const perWorker = pool.activeTokens()
    .map((_, index) => ['W' + (index + 1), [...membership.values()].filter((entry) => entry.memberTokenIdxs.has(index)).length])
    .filter(([, count]) => count > 0)
    .map(([label, count]) => label + ': ' + count)
    .join('  ·  ');
  terminal.log('  ' + guilds.length + ' server(s) total  (' + perWorker + ')');
}

async function beginNewScan(pool, resume) {
  await ensureAccount(pool);

  const targetUserId = await chooseTarget(resume);
  if (!targetUserId) return CANCELLED;

  const ownGuilds = await fetchOwnGuilds(pool);
  let guilds = ownGuilds;
  let membership = null;

  if (pool.activeTokens().length > 1) {
    membership = await mapGuildMembership(pool, ownGuilds);
    guilds = [...membership.values()].map((entry) => entry.guild);
  }

  const setupLine = terminal.getOutputLine();
  reportGuildCounts(pool, guilds, membership);

  let operation;
  if (resume && resume.checkpoint && resume.checkpoint.mode) {
    operation = resume.checkpoint.mode;
    terminal.log('  resuming mode:      ' + operation);
    terminal.log('');
  } else {
    operation = await terminal.prompts.promptOperation();
    if (!operation) {
      terminal.clearLinesFrom(setupLine);
      return CANCELLED;
    }
  }

  terminal.clearLinesFrom(setupLine);
  return { targetUserId, operation, guilds, guildMembership: membership, resume };
}

async function runStartMenu(pool) {
  const scanFolders = findScanFolders();
  const interrupted = findInterruptedScans();

  while (true) {
    const action = await terminal.prompts.promptStartMenu({
      hasPreviousScans: scanFolders.length > 0,
      hasInterruptedScans: interrupted.length > 0,
      hasTokens: pool.tokens.length > 0,
    });

    if (action === 'workers') {
      await pool.verifyWorkers();
      continue;
    }

    if (action === 'settings') {
      pool.env = await terminal.prompts.promptSettings(pool.env);
      saveEnv(pool.env);
      applyEnvOverrides(pool.env);
      continue;
    }

    if (action === 'sort') {
      if (await sortImages(scanFolders)) return null;
      continue;
    }

    if (action === 'view') {
      if (await openViewer(scanFolders)) return null;
      continue;
    }

    let resume = null;
    if (action === 'continue') {
      resume = await chooseInterruptedScan(interrupted);
      if (!resume) continue;
    }

    const selection = await beginNewScan(pool, resume);
    if (selection !== CANCELLED) return selection;
  }
}

module.exports = { runStartMenu };
