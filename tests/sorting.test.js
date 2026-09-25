'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sortableScans } = require('../src/sorting/sortFiles');
const { makeTempDirectory, removeDirectory, withWorkingDirectory } = require('./support/helpers');

test('only scans with downloaded images are offered for sorting', () => {
  const directory = makeTempDirectory();
  try {
    fs.mkdirSync(path.join(directory, 'WithImages', 'files', 'images'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'WithImages', 'files', 'images', 'a.PNG'), 'x');
    fs.mkdirSync(path.join(directory, 'OnlyDocs', 'files', 'documents'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'OnlyDocs', 'files', 'documents', 'a.pdf'), 'x');
    fs.mkdirSync(path.join(directory, 'NoFiles'));

    withWorkingDirectory(directory, () => {
      assert.deepEqual(sortableScans(['WithImages', 'OnlyDocs', 'NoFiles', 'Missing']), ['WithImages']);
    });
  } finally {
    removeDirectory(directory);
  }
});
