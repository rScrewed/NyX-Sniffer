'use strict';

const fs = require('fs');
const path = require('path');
const { DOUBLE_RULE, SINGLE_RULE } = require('./reportFormat');

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const BAR_WIDTH = 28;
const PEAK_COUNT = 5;

function localHour(isoTimestamp) {
  const formatted = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: TIME_ZONE })
    .format(new Date(isoTimestamp));
  return parseInt(formatted, 10) % 24;
}

function formatHour(hour) {
  if (hour === 0) return '12am';
  if (hour < 12) return hour + 'am';
  if (hour === 12) return '12pm';
  return (hour - 12) + 'pm';
}

function buildHeatmap(messages) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ startHour: hour, label: formatHour(hour), count: 0 }));
  for (const message of messages) {
    if (!message.timestamp) continue;
    const hour = localHour(message.timestamp);
    if (hour >= 0 && hour < 24) buckets[hour].count++;
  }
  return buckets.sort((a, b) => b.count - a.count);
}

function renderBar(count, max) {
  const filled = max === 0 ? 0 : Math.round((count / max) * BAR_WIDTH);
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

function heatmapConsoleRows(messages) {
  const peaks = buildHeatmap(messages).slice(0, PEAK_COUNT);
  const max = peaks[0] ? peaks[0].count : 0;
  return {
    title: '  ━━  HEATMAP  (' + TIME_ZONE + ', 1-hour windows)  ━━',
    rows: peaks.map((bucket, index) =>
      '  #' + (index + 1) + '  ' + bucket.label.padEnd(5) + '  │' + renderBar(bucket.count, max) + '│  ' + String(bucket.count).padStart(4) + ' msg(s)'),
  };
}

function renderHeatmapText(username, messages, ranked) {
  const peaks = ranked.slice(0, PEAK_COUNT);
  const peakMax = peaks[0] ? peaks[0].count : 0;

  let text = 'DISCORD OSINT — ACTIVITY HEATMAP\n' + DOUBLE_RULE + '\n\n';
  text += '  User      : ' + username + '\n';
  text += '  Timezone  : ' + TIME_ZONE + '\n';
  text += '  Window    : 1-hour buckets\n';
  text += '  Total msgs: ' + messages.length + '\n\n';
  text += DOUBLE_RULE + '\n\n';
  text += '  TOP 5 PEAK WINDOWS\n  ' + SINGLE_RULE + '\n\n';

  peaks.forEach((bucket, index) => {
    text += '  #' + (index + 1) + '  ' + bucket.label + '\n';
    text += '       │' + renderBar(bucket.count, peakMax) + '│  ' + bucket.count + ' msg(s)\n\n';
  });

  text += DOUBLE_RULE + '\n\n';
  text += '  ALL WINDOWS\n  ' + SINGLE_RULE + '\n\n';

  const byHour = [...ranked].sort((a, b) => a.startHour - b.startHour);
  const maxCount = byHour.reduce((max, bucket) => Math.max(max, bucket.count), 0);
  for (const bucket of byHour) {
    text += '  ' + bucket.label.padEnd(5) + '  │' + renderBar(bucket.count, maxCount) + '│  ' + String(bucket.count).padStart(4) + ' msg(s)\n';
  }
  return text + '\n' + DOUBLE_RULE + '\n';
}

function writeHeatmapFiles(outputDirectory, username, messages) {
  const ranked = buildHeatmap(messages);
  fs.writeFileSync(path.join(outputDirectory, 'heatmap.txt'), renderHeatmapText(username, messages, ranked));
  fs.writeFileSync(path.join(outputDirectory, 'heatmap.json'), JSON.stringify({
    user: username,
    timezone: TIME_ZONE,
    total: messages.length,
    buckets: [...ranked].sort((a, b) => a.startHour - b.startHour),
  }, null, 2));
}

module.exports = { buildHeatmap, heatmapConsoleRows, writeHeatmapFiles };
