'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGuildSearchPath, ATTACHMENT_FILTERS } = require('../../src/discord/searchQuery');

test('builds an author search page in the documented parameter order', () => {
  assert.equal(
    buildGuildSearchPath({ guildId: '1', authorId: '2', offset: 50 }),
    '/guilds/1/messages/search?author_id=2&sort_by=timestamp&sort_order=desc&offset=50&limit=25',
  );
});

test('includes attachment filters, range anchors and mentions', () => {
  const path = buildGuildSearchPath({ guildId: '1', authorId: '2', attachmentFilters: ATTACHMENT_FILTERS, offset: 0, minId: '10', maxId: '20' });
  assert.match(path, /author_id=2&has=image&has=video&has=file&has=embed&has=sticker&has=sound&sort_by=/);
  assert.match(path, /&limit=25&min_id=10&max_id=20$/);
  assert.match(buildGuildSearchPath({ guildId: '1', mentionedId: '3', offset: 0 }), /\?mentions=3&sort_by=/);
});

test('supports unsorted single-result probes', () => {
  assert.equal(buildGuildSearchPath({ guildId: '1', authorId: '2', limit: 1, sorted: false }), '/guilds/1/messages/search?author_id=2&limit=1');
});
