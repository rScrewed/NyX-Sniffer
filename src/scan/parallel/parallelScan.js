'use strict';

const terminal = require('../../terminal');
const { settings } = require('../../config/settings');
const { createDiscordClient, RATE_LIMIT_STRATEGIES } = require('../../discord/client');
const { randomBetween } = require('../../shared/time');
const { stripEmoji } = require('../../shared/text');
const { collectGuild } = require('../guildScan');
const { runSequentialScan } = require('../sequentialScan');
const { discoverActiveServers, timeBasedSplits, probeWorkerAccess } = require('./discovery');
const { createWorkQueue, createHelperBroker } = require('./workQueue');

const WORKER_START_STAGGER_MS = 500;

function createWorkerClients(tokens, slotByWorker) {
  return tokens.map((token, index) => createDiscordClient({
    token,
    rateLimit: RATE_LIMIT_STRATEGIES.ABORT,
    ui: { log: terminal.log, setMood: terminal.setMood },
    onRateLimit: () => {
      const slot = slotByWorker[index];
      if (slot >= 0) {
        terminal.workers.setMood(slot, 'sad');
        terminal.workers.update(slot, { sub: '' });
      }
    },
  }));
}

async function validateWorkers(clients) {
  for (let index = 0; index < clients.length; index++) {
    const me = await clients[index].request('/users/@me');
    if (!(me && me.username && !me.code)) {
      terminal.log('  W' + (index + 1) + ' ✗  token invalid or expired  (' + (me && me.message ? me.message : 'no response') + ')');
    }
  }
  terminal.log('');
}

function usableWorkers(activeServers, guildMembership, workerCount) {
  const usable = [0];
  for (let worker = 1; worker < workerCount; worker++) {
    const hasAccess = activeServers.some(({ guild }) => {
      const entry = guildMembership && guildMembership.get(guild.id);
      return entry && entry.memberTokenIdxs.has(worker);
    });
    if (hasAccess) usable.push(worker);
  }
  return usable;
}

function planSlices({ activeServers, usable, tokenCount }) {
  const countBased = activeServers.length === 1 && activeServers[0].splitIds;
  if (countBased && usable.length === tokenCount) return activeServers[0].splitIds.slice().reverse();
  return timeBasedSplits(activeServers, usable.length);
}

function buildWorkItems(guilds, splits, slotCount) {
  const items = [];
  for (const guild of guilds) {
    for (let slot = 0; slot < slotCount; slot++) {
      items.push({
        guild,
        slot,
        minId: slot === 0 ? null : splits[slot - 1],
        maxId: slot < splits.length ? splits[slot] : null,
      });
    }
  }
  return items;
}

function mergeSummaryByServer(summary) {
  const merged = [];
  for (const entry of summary) {
    const existing = merged.find((candidate) => candidate.server === entry.server);
    if (existing) {
      existing.count += entry.count;
      existing.mentions = (existing.mentions || 0) + (entry.mentions || 0);
      existing.files = [...(existing.files || []), ...(entry.files || [])];
    } else {
      merged.push({ ...entry });
    }
  }
  return merged;
}

function describeProgress(messages) {
  const typeCounts = {};
  for (const message of messages) {
    for (const file of message.files || []) typeCounts[file.type] = (typeCounts[file.type] || 0) + 1;
  }
  return ['msgs', ...Object.entries(typeCounts).map(([type, count]) => count + ' ' + type)];
}

async function collectSlice({ slot, item, baseCount, workerClient, state, downloader, broker, onSliceProgress }) {
  const { scan } = state;
  const name = stripEmoji(item.guild.name) || item.guild.id;
  const helperLabel = item.slot !== slot ? 'helping W' + (item.slot + 1) : '';

  terminal.workers.update(slot, { mode: scan.modeName, name, count: baseCount, unit: scan.unit, done: false, sub: helperLabel });

  return collectGuild({
    guild: item.guild,
    state,
    downloader,
    context: {
      request: workerClient.request,
      range: { minId: item.minId, maxId: item.maxId },
      report: (message) => terminal.workers.setStatus(slot, message),
      setMood: (mood) => terminal.workers.setMood(slot, mood),
      log: terminal.log,
      borrowHelper: () => broker.borrow(slot),
    },
    hooks: {
      onProgress: (count) => {
        terminal.workers.update(slot, { count: baseCount + count });
        onSliceProgress(count);
      },
      onMentionProgress: (count, meta, messageCount) => {
        terminal.workers.update(slot, { count: baseCount + messageCount + count });
      },
    },
  });
}

async function runWorkers({ activeServers, usable, splits, state, downloader, clients, guildMembership, totalMessages }) {
  const slotCount = usable.length;
  const guilds = activeServers.map((server) => server.guild);
  const averagePerWorker = Math.round(totalMessages / slotCount);

  terminal.log('');
  terminal.log('  ' + slotCount + ' workers collecting in parallel...');
  terminal.log('');
  terminal.workers.setSummary('  ' + totalMessages + ' messages  /  ' + slotCount + ' workers  ·  ' + averagePerWorker + ' per worker avg');
  terminal.workers.initialize(slotCount, averagePerWorker);

  const items = buildWorkItems(guilds, splits, slotCount);
  const slicesLeft = new Map();
  for (const item of items) slicesLeft.set(item.guild.id, (slicesLeft.get(item.guild.id) || 0) + 1);

  const canServe = (slot, item) => {
    const workerIndex = usable[slot];
    const entry = guildMembership && guildMembership.get(item.guild.id);
    return workerIndex === 0 || !entry || entry.memberTokenIdxs.has(workerIndex);
  };
  const queue = createWorkQueue(items, canServe);
  const broker = createHelperBroker(clients, usable);
  const currentCounts = new Array(slotCount).fill(0);

  const refreshProgress = () => {
    const total = currentCounts.reduce((sum, count) => sum + count, 0);
    terminal.workers.setProgressCount(total, '  ' + describeProgress(state.messages).join('  ·  '));
  };

  async function runSlot(slot) {
    const workerClient = clients[usable[slot]];
    if (slot > 0) await terminal.delay(slot * WORKER_START_STAGGER_MS);
    let baseCount = 0;

    for (let item = queue.take(slot); item; item = queue.take(slot)) {
      const added = await collectSlice({
        slot,
        item,
        baseCount,
        workerClient,
        state,
        downloader,
        broker,
        onSliceProgress: (count) => {
          currentCounts[slot] = baseCount + count;
          refreshProgress();
        },
      });

      baseCount += added;
      currentCounts[slot] = baseCount;
      refreshProgress();
      state.checkpoint();

      const remaining = slicesLeft.get(item.guild.id) - 1;
      slicesLeft.set(item.guild.id, remaining);
      if (remaining === 0) {
        state.completedGuildIds.add(item.guild.id);
        state.checkpoint();
      }

      if (queue.hasPending()) {
        await terminal.delay(randomBetween(settings.serverDelayMinMs, settings.serverDelayMaxMs));
      }
    }

    broker.markIdle(slot);
    terminal.workers.update(slot, { count: baseCount, done: true, sub: '' });
  }

  await Promise.all(Array.from({ length: slotCount }, (_, slot) => runSlot(slot)));

  const merged = mergeSummaryByServer(state.summary);
  state.summary.length = 0;
  state.summary.push(...merged);
}

async function runParallelScan({ state, guilds, finalGuild, guildMembership, tokens, mainClient, downloader }) {
  const { scan } = state;
  const slotByWorker = new Array(tokens.length).fill(-1);
  const clients = createWorkerClients(tokens, slotByWorker);

  await validateWorkers(clients);

  const activeServers = await discoverActiveServers({ guilds, scan, tokenCount: tokens.length, client: mainClient });
  if (activeServers.length === 0) {
    terminal.log('  target not found in any server');
    return;
  }

  const totalMessages = activeServers.reduce((sum, server) => sum + server.total, 0);
  terminal.log('');

  await probeWorkerAccess({ activeServers, scan, workerClients: clients, guildMembership });

  const usable = usableWorkers(activeServers, guildMembership, tokens.length);
  usable.forEach((workerIndex, slot) => {
    slotByWorker[workerIndex] = slot;
  });

  if (usable.length <= 1) {
    terminal.log('');
    await runSequentialScan({ state, guilds: activeServers.map((server) => server.guild), finalGuild, downloader, client: mainClient });
    return;
  }

  const splits = planSlices({ activeServers, usable, tokenCount: tokens.length });
  await runWorkers({ activeServers, usable, splits, state, downloader, clients, guildMembership, totalMessages });
}

module.exports = { runParallelScan };
