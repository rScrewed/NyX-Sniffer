'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getIntelTags, filterByCategory, countIntelTags, countIntelTagsWithout, wordlists, FILTER_CATEGORIES } = require('../../src/viewer/intel/tagging');
const { sourceOf, messageSources } = require('../../src/viewer/intel/deviceSource');
const { computeWordWall } = require('../../src/viewer/intel/wordWall');

test('wordlists load every category including the bannable sections', () => {
  assert.ok(Object.keys(wordlists).length >= 10);
  assert.ok(wordlists.bannable.length > 1000);
  assert.ok(wordlists.bannable.includes('free nitro'));
});

test('messages are tagged by whole-word wordlist matches', () => {
  const salary = { content: 'my salary is not great' };
  assert.match(getIntelTags(salary), /economics/);
  assert.equal(getIntelTags({ content: 'nothing interesting here' }), '');
  assert.equal(getIntelTags({ content: '' }), '');
  assert.match(getIntelTags({ content: 'im 12 yo btw' }), /bannable/);
});

test('device tags come from attachment file names', () => {
  const message = { content: '', files: [{ localPath: 'files/images/IMG_1234.HEIC' }] };
  assert.match(getIntelTags(message), /device/);
  assert.deepEqual(messageSources(message), [{ name: 'IMG_1234.HEIC', source: 'iPhone' }]);
});

test('tags are cached per message', () => {
  const message = { content: 'my salary' };
  assert.equal(getIntelTags(message), getIntelTags(message));
});

test('filtering and counting use the cached tags', () => {
  const items = [{ content: 'my salary' }, { content: 'hello' }, { content: 'im 12 yo btw' }];
  assert.equal(filterByCategory(items, 'economics').length, 1);
  const counts = countIntelTags(items);
  assert.equal(counts.economics, 1);
  assert.equal(counts.bannable, 1);
});

test('counting with disabled terms ignores those terms', () => {
  const items = [{ content: 'my salary' }, { content: 'hourly rate' }];
  assert.equal(countIntelTags(items).economics, 2);
  assert.equal(countIntelTagsWithout(items, ['economics:my salary']).economics, 1);
  assert.equal(countIntelTagsWithout(items, ['economics:my salary', 'economics:hourly rate']).economics, undefined);
});

test('filter buttons cover the documented categories', () => {
  assert.ok(FILTER_CATEGORIES.includes('bannable'));
  assert.ok(FILTER_CATEGORIES.includes('device'));
  assert.equal(FILTER_CATEGORIES.includes('location'), false);
});

test('sourceOf recognises common device and app file names', () => {
  assert.equal(sourceOf('IMG-20230101-WA0001.jpg'), 'WhatsApp');
  assert.equal(sourceOf('PXL_20230101_101010.jpg'), 'Google Pixel');
  assert.equal(sourceOf('photo.CR2'), 'camera RAW');
  assert.equal(sourceOf('https://cdn.example/a/b/DJI_0001.jpg?ex=1'), 'DJI drone');
  assert.equal(sourceOf('holiday.jpg'), null);
  assert.equal(sourceOf(''), null);
});

test('word wall counts words, ignoring stopwords, links and mentions', () => {
  const words = computeWordWall([
    { content: 'The pizza is great, pizza! https://example.com <@123> `code`' },
    { content: 'great pizza' },
    { content: '' },
  ]);
  assert.deepEqual(words.slice(0, 2), [{ word: 'pizza', count: 3 }, { word: 'great', count: 2 }]);
  assert.equal(words.some((entry) => entry.word === 'the'), false);
  assert.equal(computeWordWall([], 5).length, 0);
});
