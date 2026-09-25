'use strict';

const fs = require('fs');
const path = require('path');

function monthKey(year, month) {
  return year + '-' + String(month).padStart(2, '0');
}

function buildTimeline(messages) {
  const counts = {};
  for (const message of messages) {
    if (!message.timestamp) continue;
    const date = new Date(message.timestamp);
    const key = monthKey(date.getFullYear(), date.getMonth() + 1);
    counts[key] = (counts[key] || 0) + 1;
  }

  const keys = Object.keys(counts).sort();
  if (!keys.length) return [];

  const [startYear, startMonth] = keys[0].split('-').map(Number);
  const [endYear, endMonth] = keys[keys.length - 1].split('-').map(Number);

  const buckets = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = monthKey(year, month);
    buckets.push({ month: key, count: counts[key] || 0 });
    if (++month > 12) {
      month = 1;
      year++;
    }
  }
  return buckets;
}

function writeTimeline(outputDirectory, username, messages) {
  if (!messages || !messages.length) return;

  const buckets = buildTimeline(messages);
  if (!buckets.length) return;

  fs.writeFileSync(path.join(outputDirectory, 'timeline.json'), JSON.stringify({
    user: username,
    total: messages.length,
    buckets,
  }, null, 2));
}

module.exports = { buildTimeline, writeTimeline };
