'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDownloader } = require('../../src/files/downloader');
const { moveTemporaryFiles } = require('../../src/files/folders');
const { makeTempDirectory, removeDirectory } = require('../support/helpers');

function fakeFetch(counter) {
  return async (url) => {
    counter.count++;
    return { ok: true, buffer: async () => Buffer.from('data:' + url.split('?')[0]) };
  };
}

const context = { guildId: '1', channelId: '2', messageId: '3' };

test('the same file with different signatures is downloaded once', async () => {
  const directory = makeTempDirectory();
  try {
    const counter = { count: 0 };
    const downloader = createDownloader({ fetchImplementation: fakeFetch(counter) });
    const [a, b] = await Promise.all([
      downloader.download('https://cdn.example/attachments/2/9/a.png?ex=1&hm=aa', directory, context),
      downloader.download('https://cdn.example/attachments/2/9/a.png?ex=2&hm=bb', directory, { ...context, messageId: '4' }),
    ]);
    const again = await downloader.download('https://cdn.example/attachments/2/9/a.png?ex=3', directory, context);
    assert.equal(a, b);
    assert.equal(a, again);
    assert.equal(counter.count, 1);
    assert.equal(fs.readFileSync(a, 'utf8'), 'data:https://cdn.example/attachments/2/9/a.png');
    assert.equal(path.basename(path.dirname(a)), 'images');
  } finally {
    removeDirectory(directory);
  }
});

test('different attachments in one message keep separate files', async () => {
  const directory = makeTempDirectory();
  try {
    const downloader = createDownloader({ fetchImplementation: fakeFetch({ count: 0 }) });
    const first = await downloader.download('https://cdn.example/a/1/one.png', directory, context);
    const second = await downloader.download('https://cdn.example/a/2/two.png', directory, context);
    assert.notEqual(first, second);
    assert.match(path.basename(second), /_2\.png$/);
  } finally {
    removeDirectory(directory);
  }
});

test('failed downloads return null and are not remembered', async () => {
  const directory = makeTempDirectory();
  try {
    let succeed = false;
    const downloader = createDownloader({
      fetchImplementation: async () => ({ ok: succeed, buffer: async () => Buffer.from('x') }),
    });
    assert.equal(await downloader.download('https://cdn.example/a/1/one.png', directory, context), null);
    succeed = true;
    assert.ok(await downloader.download('https://cdn.example/a/1/one.png', directory, context));
  } finally {
    removeDirectory(directory);
  }
});

test('registerExisting reuses files from a previous run', async () => {
  const directory = makeTempDirectory();
  try {
    const existing = path.join(directory, 'kept.png');
    fs.writeFileSync(existing, 'old');
    const counter = { count: 0 };
    const downloader = createDownloader({ fetchImplementation: fakeFetch(counter) });
    downloader.registerExisting([{ files: [{ originalUrl: 'https://cdn.example/a/1/one.png?x=1', localPath: existing }] }]);
    assert.equal(await downloader.download('https://cdn.example/a/1/one.png?x=2', directory, context), existing);
    assert.equal(counter.count, 0);
  } finally {
    removeDirectory(directory);
  }
});

test('moveTemporaryFiles relocates category folders and drops the checkpoint', () => {
  const root = makeTempDirectory();
  try {
    const temporary = path.join(root, '_tmp_1');
    const target = path.join(root, 'out', 'files');
    fs.mkdirSync(path.join(temporary, 'images'), { recursive: true });
    fs.writeFileSync(path.join(temporary, 'images', 'a.png'), 'x');
    fs.writeFileSync(path.join(temporary, 'progress.json'), '{}');
    moveTemporaryFiles(temporary, target);
    assert.ok(fs.existsSync(path.join(target, 'images', 'a.png')));
    assert.equal(fs.existsSync(path.join(target, 'progress.json')), false);
    assert.equal(fs.existsSync(temporary), false);
  } finally {
    removeDirectory(root);
  }
});
