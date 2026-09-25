'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectItems, paginate, deriveDataset, countFiles } = require('../../src/viewer/dataset');

const items = Array.from({ length: 1201 }, (_, index) => ({
  content: index % 2 ? 'hello world' : 'my salary',
  authorTag: index % 3 ? 'kit' : 'other',
  timestamp: new Date(2024, 0, 1 + (index % 28)).toISOString(),
  files: index % 5 === 0 ? [{ localPath: 'a.png' }] : [],
}));

test('paginate slices 500 items per page and clamps the page', () => {
  const first = paginate(items, 0);
  assert.equal(first.items.length, 500);
  assert.equal(first.totalPages, 3);
  const last = paginate(items, 99);
  assert.equal(last.page, 2);
  assert.equal(last.items.length, 201);
  assert.equal(last.startIndex, 1000);
  assert.equal(last.endIndex, 1201);
  assert.equal(paginate([], 0).totalPages, 1);
});

test('selectItems filters by intel category and search text', () => {
  assert.equal(selectItems(items, {}).length, 1201);
  assert.ok(selectItems(items, { intelFilter: 'economics' }).length > 0);
  assert.equal(selectItems(items, { intelFilter: 'not-a-category' }).length, 1201);
  assert.ok(selectItems(items, { query: '  HELLO ' }).every((item) => item.content === 'hello world'));
  assert.ok(selectItems(items, { query: 'other' }).every((item) => item.authorTag === 'other'));
  assert.equal(selectItems(items, { query: 'zzz-no-match' }).length, 0);
});

test('derived data is computed once per dataset', () => {
  const data = { messages: items };
  const derived = deriveDataset(data, items, false);
  assert.equal(derived, deriveDataset(data, items, false));
  assert.equal(derived.fileCount, countFiles(items));
  assert.ok(derived.wordWall.length > 0);
  assert.ok(derived.intelCounts.economics > 0);
  assert.ok(Object.keys(derived.dailyCounts).length > 0);
  assert.deepEqual(deriveDataset({ mentions: items }, items, true).wordWall, []);
});
