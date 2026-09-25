'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml, avatarUrl, fileHref, formatTimestamp, serializeForScript } = require('../../src/viewer/html');
const { renderMessageCard } = require('../../src/viewer/render/messageCard');
const { renderPager } = require('../../src/viewer/render/pager');
const { renderPage } = require('../../src/viewer/render/page');
const { groupByServer, renderFeed } = require('../../src/viewer/render/feed');
const { renderMentioners } = require('../../src/viewer/render/mentioners');

const data = {
  userId: '111111111111111111',
  username: 'kit',
  mode: 'all',
  targetAvatar: 'avatarhash',
  messages: [
    { messageId: '1', channelId: 'c', guildId: 'g', guildName: 'Alpha', channelName: 'general', authorId: '111111111111111111', authorTag: 'kit', timestamp: '2024-01-02T10:00:00.000Z', content: 'my salary <b>&</b> more', files: [{ localPath: 'out/files/images/IMG_1234.HEIC' }] },
    { messageId: '2', channelId: 'c', guildId: 'g', guildName: 'Alpha', channelName: 'general', authorId: '111111111111111111', authorTag: 'kit', timestamp: '2024-01-03T10:00:00.000Z', content: 'plain', files: [] },
  ],
};

test('escapeHtml escapes all five characters', () => {
  assert.equal(escapeHtml('<a href="x">\'&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(escapeHtml(null), '');
});

test('avatarUrl handles animated, static and default avatars', () => {
  assert.match(avatarUrl('1', 'a_hash', null), /\/avatars\/1\/a_hash\.gif\?size=128$/);
  assert.match(avatarUrl('1', 'hash', null), /\.png\?size=128$/);
  assert.match(avatarUrl('1', null, '1234'), /embed\/avatars\/4\.png$/);
  assert.match(avatarUrl('1', null, null), /embed\/avatars\/\d\.png$/);
});

test('fileHref maps saved files to served paths', () => {
  assert.equal(fileHref('out/files/images/a b.png'), '/files/images/a%20b.png');
  assert.equal(fileHref('C:\\out\\files\\videos\\c.mp4'), '/files/videos/c.mp4');
  assert.equal(fileHref('stray.png'), '/files/stray.png');
  assert.equal(fileHref(''), null);
});

test('formatTimestamp and serializeForScript are safe helpers', () => {
  assert.equal(formatTimestamp(''), '');
  assert.equal(formatTimestamp('garbage'), 'garbage');
  assert.match(formatTimestamp('2024-01-02T10:00:00.000Z'), /^2024-01-0\d {2}\d\d:\d\d$/);
  assert.equal(serializeForScript({ a: '</script>' }), '{"a":"\\u003c/script>"}');
});

test('message cards escape content and expose intel and device data', () => {
  const html = renderMessageCard(data.messages[0], { mode: 'messages', targetId: data.userId, targetTag: 'kit', targetAvatar: 'avatarhash' });
  assert.match(html, /my salary &lt;b&gt;&amp;&lt;\/b&gt; more/);
  assert.match(html, /data-intel="[^"]*economics/);
  assert.match(html, /data-device="1"/);
  assert.match(html, /class="src-chip">from: iPhone/);
  assert.match(html, /https:\/\/discord\.com\/channels\/g\/c\/1/);
});

test('the pager only appears when useful and keeps filters in its links', () => {
  assert.equal(renderPager({ page: 0, totalPages: 1, startIndex: 0, endIndex: 2, totalCount: 2, intelFilter: null, query: '' }), '');
  const html = renderPager({ page: 1, totalPages: 3, startIndex: 500, endIndex: 1000, totalCount: 1300, intelFilter: 'economics', query: 'salary' });
  assert.match(html, /href="\/\?page=0&intel=economics&q=salary">‹ prev/);
  assert.match(html, /href="\/\?page=2&intel=economics&q=salary">next ›/);
  assert.match(html, /page 2 of 3 {2}· {2}501–1000 of 1300 matching/);
  assert.match(html, /clear economics/);
  assert.match(html, /clear search/);
});

test('feeds group by server and channel with stable ids', () => {
  const grouped = groupByServer(data.messages);
  assert.deepEqual(Object.keys(grouped), ['Alpha']);
  const html = renderFeed({ grouped, idPrefix: 'main', noun: 'message', cardContext: { mode: 'messages', targetId: data.userId } });
  assert.match(html, /<h2 id="main-srv-0">Alpha<\/h2>/);
  assert.match(html, /id="main-srv-0-ch-0"><span class="ch">#general<\/span><span class="cn">2 messages<\/span>/);
});

test('the mentioner ranking renders rows or nothing', () => {
  assert.equal(renderMentioners([]), '');
  assert.match(renderMentioners([{ id: '5', tag: 'sender', avatar: null, count: 3 }]), /<li data-id="5">.*sender.*3×/);
});

test('the full page contains the expected sections and data', () => {
  const html = renderPage({ data, mode: 'messages', page: 0, intelFilter: null, query: '', mentionsData: null, heatmapData: null, timelineData: null, profileData: null });
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<title>profile — kit<\/title>/);
  assert.match(html, /href="\/viewer\.css"/);
  assert.match(html, /<script type="module" src="\/assets\/main\.js"><\/script>/);
  assert.match(html, /id="viewer-data" type="application\/json"/);
  assert.match(html, /2 messages {2}· {2}1 files/);
  assert.match(html, /data-intel="economics"/);
  assert.equal(html.includes('id="heatmap-section"'), false);
  assert.match(html, /search this page… {2}\(enter = search all 2\)/);
});

test('filtering by an intel category narrows the volume shown', () => {
  const html = renderPage({ data, mode: 'messages', page: 0, intelFilter: 'economics', query: '', mentionsData: null, heatmapData: null, timelineData: null, profileData: null });
  assert.match(html, /1 messages {2}· {2}1 files/);
  assert.match(html, /1–1 of 1 matching/);
});
