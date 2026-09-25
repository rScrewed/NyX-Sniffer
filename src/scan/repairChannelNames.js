'use strict';

const fs = require('fs');
const path = require('path');
const { createChannelDirectory } = require('./channelDirectory');

const DATA_FILES = [
  { file: 'messages.json', records: (data) => data.messages || [] },
  {
    file: 'mentions.json',
    records: (data) => [...(data.mentions || []), ...(data.mentioners || []).flatMap((mentioner) => mentioner.messages || [])],
  },
];

function groupByGuild(records) {
  const groups = new Map();
  for (const record of records) {
    if (!record.guildId || !record.channelId) continue;
    if (!groups.has(record.guildId)) groups.set(record.guildId, []);
    groups.get(record.guildId).push(record);
  }
  return groups;
}

async function repairChannelNames({ folder, request }) {
  const directory = createChannelDirectory();
  const result = { files: 0, resolved: 0, unresolved: 0 };

  for (const { file, records } of DATA_FILES) {
    const location = path.join(folder, file);
    if (!fs.existsSync(location)) continue;

    const data = JSON.parse(fs.readFileSync(location, 'utf8'));
    const all = records(data);
    const missingBefore = all.filter((record) => !record.channelName).length;

    for (const [guildId, guildRecords] of groupByGuild(all)) {
      await directory.fillNames({ guildId, records: guildRecords, request });
    }

    const missingAfter = all.filter((record) => !record.channelName).length;
    result.files++;
    result.resolved += missingBefore - missingAfter;
    result.unresolved += missingAfter;
    fs.writeFileSync(location, JSON.stringify(data, null, 2));
  }
  return result;
}

module.exports = { repairChannelNames };
