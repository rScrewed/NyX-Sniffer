'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { launchViewer, launchFileBrowser } = require('../../src/viewer');
const { makeTempDirectory, removeDirectory } = require('../support/helpers');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', reject);
  });
}

function writeScan(directory) {
  fs.mkdirSync(path.join(directory, 'files', 'images'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'files', 'images', 'a.png'), 'png-bytes');
  fs.writeFileSync(path.join(directory, 'messages.json'), JSON.stringify({
    userId: '111111111111111111',
    username: 'kit',
    mode: 'all',
    messages: [
      { messageId: '1', channelId: 'c', guildId: 'g', guildName: 'Alpha', channelName: 'general', authorId: '111111111111111111', authorTag: 'kit', timestamp: '2024-01-02T10:00:00.000Z', content: 'my salary', files: [{ localPath: 'x/files/images/a.png' }] },
      { messageId: '2', channelId: 'c', guildId: 'g', guildName: 'Alpha', channelName: 'general', authorId: '111111111111111111', authorTag: 'kit', timestamp: '2024-01-03T10:00:00.000Z', content: 'hello', files: [] },
    ],
  }));
}

test('the viewer serves pages, counts, assets and stored files', async () => {
  const directory = makeTempDirectory();
  let viewer;
  try {
    writeScan(directory);
    viewer = await launchViewer(directory, 'messages');

    const page = await get(viewer.url);
    assert.equal(page.status, 200);
    assert.match(page.headers['content-type'], /text\/html/);
    assert.match(page.body, /<title>profile — kit<\/title>/);

    const filtered = await get(viewer.url + '?intel=economics&q=salary');
    assert.match(filtered.body, /1–1 of 1 matching/);

    const counts = await get(viewer.url + 'api/intel-counts?off=' + encodeURIComponent(JSON.stringify(['economics:my salary'])));
    assert.deepEqual(JSON.parse(counts.body), {});
    const allCounts = await get(viewer.url + 'api/intel-counts');
    assert.equal(JSON.parse(allCounts.body).economics, 1);

    const css = await get(viewer.url + 'viewer.css');
    assert.equal(css.status, 200);
    assert.match(css.headers['content-type'], /text\/css/);

    const script = await get(viewer.url + 'assets/main.js');
    assert.equal(script.status, 200);
    assert.match(script.headers['content-type'], /javascript/);
    assert.equal((await get(viewer.url + 'assets/..%2f..%2fserver.js')).status, 404);

    const file = await get(viewer.url + 'files/images/a.png');
    assert.equal(file.body, 'png-bytes');
    assert.equal((await get(viewer.url + 'files/..%2fmessages.json')).status, 403);
    assert.equal((await get(viewer.url + 'files/missing.png')).status, 404);
    assert.equal((await get(viewer.url + 'nope')).status, 404);
  } finally {
    if (viewer) viewer.server.close();
    removeDirectory(directory);
  }
});

test('the viewer refuses a folder without scan data', async () => {
  const directory = makeTempDirectory();
  try {
    await assert.rejects(() => launchViewer(directory, 'messages'), /no data file/);
  } finally {
    removeDirectory(directory);
  }
});

test('the file browser lists and filters files by type', async () => {
  const directory = makeTempDirectory();
  let browser;
  try {
    fs.writeFileSync(path.join(directory, 'a.png'), 'x');
    fs.writeFileSync(path.join(directory, 'b.gif'), 'x');
    fs.writeFileSync(path.join(directory, 'c.mp4'), 'x');
    fs.writeFileSync(path.join(directory, 'd.bin'), 'x');
    browser = await launchFileBrowser(directory);

    const all = await get(browser.url);
    assert.match(all.body, /all <span class="cnt">4<\/span>/);
    assert.match(all.body, /images <span class="cnt">1<\/span>/);

    const videos = await get(browser.url + '?type=videos');
    assert.match(videos.body, /<video controls/);
    assert.equal(videos.body.includes('a.png'), false);

    assert.equal((await get(browser.url + 'f/a.png')).body, 'x');
    assert.equal((await get(browser.url + 'f/..%2f..%2fetc%2fpasswd')).status, 403);
  } finally {
    if (browser) browser.server.close();
    removeDirectory(directory);
  }
});
