'use strict';

const terminal = require('../../terminal');
const { SEARCH_OFFSET_LIMIT, buildGuildSearchPath } = require('../../discord/searchQuery');
const { snowflakeBefore, snowflakeToTimestamp, timestampToSnowflake } = require('../../discord/snowflake');
const { stripEmoji } = require('../../shared/text');

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function firstMessage(response) {
  return response && response.messages && response.messages[0] && response.messages[0][0];
}

function pause(baseMs, jitterMs) {
  return terminal.delay(baseMs + Math.random() * jitterMs);
}

function createProbe(scan, client) {
  const filter = scan.mentionsOnly ? { mentionedId: scan.targetUserId } : { authorId: scan.targetUserId };

  return function search(guildId, extra) {
    return client.request(buildGuildSearchPath({ guildId, ...filter, ...extra }));
  };
}

async function findMessageAtOffset({ search, guildId, targetOffset, label, loader, completedWork }) {
  let remaining = targetOffset;
  let anchorId = null;
  let page = 0;

  while (remaining > SEARCH_OFFSET_LIMIT) {
    page++;
    loader.update(completedWork(), label + '  (page ' + page + ')');
    const response = await search(guildId, { maxId: anchorId, offset: SEARCH_OFFSET_LIMIT, limit: 1 });
    const message = firstMessage(response);
    if (!message) return null;
    anchorId = snowflakeBefore(message.id);
    remaining -= SEARCH_OFFSET_LIMIT;
    await pause(200, 200);
  }

  const response = await search(guildId, { maxId: anchorId, offset: remaining, limit: 1 });
  const message = firstMessage(response);
  return message ? message.id : null;
}

async function discoverActiveServers({ guilds, scan, tokenCount, client }) {
  const search = createProbe(scan, client);
  const activeServers = [];
  const workerSplits = tokenCount - 1;
  let completedWork = 0;

  terminal.log('  discovering active servers...');
  terminal.log('');

  const loader = terminal.createProgressLoader(guilds.length * workerSplits);
  loader.update(0, 'starting...');

  for (const guild of guilds) {
    const name = stripEmoji(guild.name) || guild.id;

    const newest = await search(guild.id, { limit: 1 });
    if (!newest || newest.code || !newest.total_results) {
      completedWork += workerSplits;
      loader.update(completedWork, name + '  (no messages)');
      await pause(300, 300);
      continue;
    }

    const oldest = await search(guild.id, { limit: 1, order: 'asc' });
    const newestMessage = firstMessage(newest);
    const oldestMessage = firstMessage(oldest);

    const splitIds = [];
    for (let worker = 1; worker < tokenCount; worker++) {
      const label = name + '  ·  W' + (worker + 1);
      loader.update(completedWork, label);
      const targetOffset = Math.floor(newest.total_results * worker / tokenCount);
      const splitId = await findMessageAtOffset({ search, guildId: guild.id, targetOffset, label, loader, completedWork: () => completedWork });
      completedWork++;
      loader.update(completedWork, label);
      splitIds.push(splitId);
      await pause(200, 200);
    }

    activeServers.push({
      guild,
      newestId: newestMessage ? newestMessage.id : null,
      oldestId: oldestMessage ? oldestMessage.id : (newestMessage ? newestMessage.id : null),
      total: newest.total_results,
      splitIds: splitIds.every(Boolean) ? splitIds : null,
    });
    await pause(300, 300);
  }

  await loader.finish('discovery complete');
  terminal.log('');
  return activeServers;
}

function timeBasedSplits(activeServers, sliceCount) {
  const timestamps = activeServers.flatMap((server) =>
    [server.oldestId, server.newestId].filter(Boolean).map(snowflakeToTimestamp));
  const oldest = timestamps.length ? Math.min(...timestamps) : Date.now() - TWO_YEARS_MS;
  const newest = timestamps.length ? Math.max(...timestamps) : Date.now();
  const sliceMs = (newest - oldest) / sliceCount;
  return Array.from({ length: sliceCount - 1 }, (_, index) => timestampToSnowflake(oldest + (index + 1) * sliceMs));
}

async function probeWorkerAccess({ activeServers, scan, workerClients, guildMembership }) {
  for (let worker = 1; worker < workerClients.length; worker++) {
    const search = createProbe(scan, workerClients[worker]);

    for (const { guild } of activeServers) {
      const entry = guildMembership && guildMembership.get(guild.id);
      if (entry && entry.memberTokenIdxs.has(worker)) continue;

      const name = stripEmoji(guild.name) || guild.id;
      const probe = await search(guild.id, { limit: 1, sorted: false });
      if (probe && !probe.code) {
        if (entry) entry.memberTokenIdxs.add(worker);
      } else {
        terminal.log('  ✗  W' + (worker + 1) + '  ·  ' + name + '  is private — join it manually with that account, or run with a single token (no workers)');
      }
    }
  }
}

module.exports = { discoverActiveServers, timeBasedSplits, probeWorkerAccess };
