'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');
const { renderPage } = require('../../src/viewer/render/page');

const bundle = esbuild.buildSync({
  entryPoints: [path.join(__dirname, '../../src/viewer/client/main.js')],
  bundle: true,
  format: 'iife',
  write: false,
}).outputFiles[0].text;

const data = {
  userId: '111111111111111111',
  username: 'kit',
  mode: 'all',
  messages: [
    { messageId: '1', channelId: 'c', guildId: 'g', guildName: 'Alpha', channelName: 'general', authorId: '111111111111111111', authorTag: 'kit', timestamp: '2024-01-02T10:00:00.000Z', content: 'my salary is low', files: [{ localPath: 'x/files/images/a.png' }] },
    { messageId: '2', channelId: 'c', guildId: 'g', guildName: 'Alpha', channelName: 'general', authorId: '111111111111111111', authorTag: 'kit', timestamp: '2024-01-03T10:00:00.000Z', content: 'hello there', files: [] },
    { messageId: '3', channelId: 'd', guildId: 'g', guildName: 'Beta', channelName: 'chat', authorId: '111111111111111111', authorTag: 'kit', timestamp: '2024-02-03T10:00:00.000Z', content: 'im 12 yo', files: [] },
  ],
};
const timeline = { total: 3, buckets: [{ month: '2024-01', count: 2 }, { month: '2024-02', count: 1 }] };
const heatmap = { timezone: 'UTC', total: 3, buckets: Array.from({ length: 24 }, (_, hour) => ({ startHour: hour, label: hour + 'h', count: hour === 10 ? 3 : 0 })) };

function open(search = '') {
  const html = renderPage({ data, mode: 'messages', page: 0, intelFilter: null, query: '', mentionsData: null, heatmapData: heatmap, timelineData: timeline, profileData: null });
  const dom = new JSDOM(html, {
    url: 'http://localhost/' + search,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = async () => ({ json: async () => ({ economics: 0 }) });
      window.scrollTo = () => {};
      window.IntersectionObserver = class { observe() {} };
      window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {}, set: () => true });
    },
  });
  dom.window.eval(bundle);
  return dom.window.document;
}

const click = (document, selector) => document.querySelector(selector).dispatchEvent(new document.defaultView.MouseEvent('click', { bubbles: true }));
const hidden = (document, selector) => document.querySelector(selector).classList.contains('hidden');

test('intel badges and totals are rendered on load', () => {
  const document = open();
  assert.ok(document.querySelectorAll('.ibadge').length >= 2);
  assert.match(document.querySelector('.fbtn[data-intel="bannable"] .cnt').textContent, /1/);
  assert.equal(document.querySelector('.fbtn[data-intel="physical"]').classList.contains('fbtn-zero'), true);
});

test('the files tab hides channels without files and shows the sub-filters', () => {
  const document = open();
  click(document, '.fbtn[data-main="files"]');
  assert.equal(document.querySelector('#sub-row').classList.contains('visible'), true);
  const channels = [...document.querySelectorAll('#msg-layout .chan')];
  assert.deepEqual(channels.map((channel) => channel.classList.contains('hidden')), [false, true]);
  click(document, '.fbtn[data-main="all"]');
  assert.equal(document.querySelectorAll('#msg-layout .chan.hidden').length, 0);
});

test('standalone panels replace the feed', () => {
  const document = open();
  click(document, '.fbtn[data-main="heatmap"]');
  assert.equal(hidden(document, '#msg-layout'), true);
  assert.equal(hidden(document, '#heatmap-section'), false);
  click(document, '.fbtn[data-main="words"]');
  assert.equal(hidden(document, '#heatmap-section'), true);
  assert.equal(hidden(document, '#words-section'), false);
  click(document, '.fbtn[data-main="messages"]');
  assert.equal(hidden(document, '#msg-layout'), false);
});

test('page search hides non-matching messages', async () => {
  const document = open();
  const box = document.querySelector('#msg-search');
  box.value = 'hello';
  box.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 260));
  const hiddenCards = [...document.querySelectorAll('.msg.search-hide')].map((card) => card.querySelector('.body').textContent);
  assert.deepEqual(hiddenCards.sort(), ['im 12 yo', 'my salary is low']);
});

test('switching off a term retags cards and highlights update', () => {
  const document = open();
  assert.ok(document.querySelectorAll('mark.hl').length > 0);
  document.querySelector('.tchip[data-cat="bannable"][data-term="im 12 yo"]').dispatchEvent(new document.defaultView.MouseEvent('click', { bubbles: true }));
  const card = [...document.querySelectorAll('.msg')].find((element) => element.textContent.includes('im 12 yo'));
  assert.equal((card.dataset.intel || '').includes('bannable'), false);
});

test('the main tab is restored from the URL', () => {
  const document = open('?main=heatmap');
  assert.equal(hidden(document, '#msg-layout'), true);
  assert.equal(hidden(document, '#heatmap-section'), false);
  assert.equal(document.querySelector('.fbtn[data-main="heatmap"]').classList.contains('active'), true);
});
