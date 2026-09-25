'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { categoryForExtension, categoryForPath, countByCategory, summarizeCounts, summarizeFiles } = require('../../src/shared/fileCategories');

test('categoryForExtension is case-insensitive and falls back to other', () => {
  assert.equal(categoryForExtension('PNG').key, 'image');
  assert.equal(categoryForExtension('gif').folder, 'gifs');
  assert.equal(categoryForExtension('xyz').key, 'other');
});

test('categoryForPath reads the extension from a path', () => {
  assert.equal(categoryForPath('files/images/a.jpeg').key, 'image');
  assert.equal(categoryForPath('song.mp3').key, 'audio');
  assert.equal(categoryForPath('noextension').key, 'other');
});

test('counts and summaries use the short labels', () => {
  const files = [{ localPath: 'a.png' }, { localPath: 'b.png' }, { localPath: 'c.mp4' }, { originalUrl: 'd.pdf' }];
  const counts = countByCategory(files);
  assert.deepEqual(counts, { image: 2, gif: 0, video: 1, audio: 0, document: 1, other: 0 });
  assert.equal(summarizeCounts(counts), '2 img  1 vid  1 doc');
  assert.equal(summarizeFiles(files), '2 img  1 vid  1 doc');
});
