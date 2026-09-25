'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { buildHeatmap, heatmapConsoleRows, writeHeatmapFiles } = require('../../src/output/heatmap');
const { buildTimeline, writeTimeline } = require('../../src/output/timeline');
const { makeTempDirectory, removeDirectory } = require('../support/helpers');

const at = (year, month, day, hour) => new Date(year, month - 1, day, hour, 30).toISOString();

test('heatmap ranks hours by activity in local time', () => {
  const messages = [at(2024, 1, 1, 20), at(2024, 1, 2, 20), at(2024, 1, 3, 9), { timestamp: null }].map((value) => (typeof value === 'string' ? { timestamp: value } : value));
  const buckets = buildHeatmap(messages);
  assert.equal(buckets.length, 24);
  assert.deepEqual([buckets[0].label, buckets[0].count], ['8pm', 2]);
  assert.deepEqual([buckets[1].label, buckets[1].count], ['9am', 1]);
});

test('heatmap console rows are formatted bars', () => {
  const { title, rows } = heatmapConsoleRows([{ timestamp: at(2024, 1, 1, 0) }, { timestamp: at(2024, 1, 1, 12) }]);
  assert.match(title, /HEATMAP/);
  assert.equal(rows.length, 5);
  assert.match(rows[0], /^ {2}#1 {2}(12am|12pm) {2,}│█+░*│ {2}\s*1 msg\(s\)$/);
});

test('heatmap files are written in chronological order', () => {
  const directory = makeTempDirectory();
  try {
    writeHeatmapFiles(directory, 'kit', [{ timestamp: at(2024, 1, 1, 5) }]);
    const json = JSON.parse(fs.readFileSync(path.join(directory, 'heatmap.json'), 'utf8'));
    assert.equal(json.user, 'kit');
    assert.deepEqual(json.buckets.map((bucket) => bucket.startHour), [...Array(24).keys()]);
    assert.match(fs.readFileSync(path.join(directory, 'heatmap.txt'), 'utf8'), /TOP 5 PEAK WINDOWS/);
  } finally {
    removeDirectory(directory);
  }
});

test('timeline fills the gaps between months', () => {
  const buckets = buildTimeline([{ timestamp: at(2023, 11, 5, 1) }, { timestamp: at(2024, 2, 9, 1) }, { timestamp: at(2024, 2, 10, 1) }, {}]);
  assert.deepEqual(buckets, [
    { month: '2023-11', count: 1 },
    { month: '2023-12', count: 0 },
    { month: '2024-01', count: 0 },
    { month: '2024-02', count: 2 },
  ]);
  assert.deepEqual(buildTimeline([]), []);
});

test('timeline is only written when there is data', () => {
  const directory = makeTempDirectory();
  try {
    writeTimeline(directory, 'kit', []);
    assert.equal(fs.existsSync(path.join(directory, 'timeline.json')), false);
    writeTimeline(directory, 'kit', [{ timestamp: at(2024, 1, 1, 1) }]);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'timeline.json'), 'utf8')).total, 1);
  } finally {
    removeDirectory(directory);
  }
});
