'use strict';

const { stripEmoji } = require('../shared/text');

const MAX_SINGLE_LOOKUPS_PER_BATCH = 200;
const DEFINITIVE_FAILURES = new Set([403, 404, 10003]);

function createChannelDirectory() {
  const guildLookups = new Map();
  const channelLookups = new Map();

  async function loadGuildChannels(guildId, request) {
    const response = await request('/guilds/' + guildId + '/channels');
    if (!Array.isArray(response)) return null;
    return new Map(response.filter((channel) => channel && channel.id).map((channel) => [channel.id, channel.name || null]));
  }

  function guildChannels(guildId, request) {
    let lookup = guildLookups.get(guildId);
    if (!lookup) {
      lookup = loadGuildChannels(guildId, request)
        .catch(() => null)
        .then((names) => {
          if (!names) guildLookups.delete(guildId);
          return names;
        });
      guildLookups.set(guildId, lookup);
    }
    return lookup;
  }

  async function lookUpChannel(channelId, request) {
    if (channelLookups.has(channelId)) return channelLookups.get(channelId);

    const response = await request('/channels/' + channelId).catch(() => null);
    if (response && response.name) {
      channelLookups.set(channelId, response.name);
      return response.name;
    }
    if (response && DEFINITIVE_FAILURES.has(response.code)) channelLookups.set(channelId, null);
    return null;
  }

  async function fillNames({ guildId, records, request }) {
    const missing = records.filter((record) => !record.channelName && record.channelId);
    if (missing.length === 0) return;

    const names = (await guildChannels(guildId, request)) || new Map();
    const unresolved = new Set();

    for (const record of missing) {
      const name = names.get(record.channelId);
      if (name) record.channelName = stripEmoji(name);
      else unresolved.add(record.channelId);
    }

    let lookups = 0;
    for (const channelId of unresolved) {
      if (lookups++ >= MAX_SINGLE_LOOKUPS_PER_BATCH) break;
      const name = await lookUpChannel(channelId, request);
      if (!name) continue;
      for (const record of missing) {
        if (record.channelId === channelId) record.channelName = stripEmoji(name);
      }
    }
  }

  return { fillNames };
}

module.exports = { createChannelDirectory };
