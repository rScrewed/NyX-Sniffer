'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createScanOptions, OPERATIONS } = require('../../src/config/scanOptions');

const options = (operation) => createScanOptions({ targetUserId: '123456789012345678', operation });

test('all operation collects everything and downloads files', () => {
  const scan = options(OPERATIONS.ALL);
  assert.equal(scan.label, 'all');
  assert.equal(scan.outputPrefix, 'Everything');
  assert.equal(scan.downloadFiles, true);
  assert.equal(scan.saveMessages, true);
  assert.equal(scan.includesAll, true);
  assert.equal(scan.buildHeatmap, true);
  assert.equal(scan.unit, 'msgs');
});

test('messages operation neither downloads files nor collects mentions', () => {
  const scan = options(OPERATIONS.MESSAGES);
  assert.equal(scan.label, 'messages only');
  assert.equal(scan.downloadFiles, false);
  assert.equal(scan.saveMessages, true);
  assert.equal(scan.includesAll, false);
});

test('files operation is files-only', () => {
  const scan = options(OPERATIONS.FILES);
  assert.equal(scan.filesOnly, true);
  assert.equal(scan.downloadFiles, true);
  assert.equal(scan.saveMessages, false);
  assert.equal(scan.unit, 'files');
});

test('mentions operation is mentions-only without a heatmap', () => {
  const scan = options(OPERATIONS.MENTIONS);
  assert.equal(scan.mentionsOnly, true);
  assert.equal(scan.buildHeatmap, false);
  assert.equal(scan.unit, 'mentions');
  assert.equal(scan.modeName, 'Mentions');
});

test('options are immutable', () => {
  assert.throws(() => {
    'use strict';
    options(OPERATIONS.ALL).label = 'changed';
  });
});
