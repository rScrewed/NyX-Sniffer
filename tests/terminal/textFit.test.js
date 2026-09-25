'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { visibleWidth, fitToWidth } = require('../../src/terminal/textFit');

const RED = '\x1b[31m';
const RESET = '\x1b[0m';

test('visibleWidth ignores colour codes and counts wide characters twice', () => {
  assert.equal(visibleWidth('hello'), 5);
  assert.equal(visibleWidth(RED + 'hello' + RESET), 5);
  assert.equal(visibleWidth('日本'), 4);
  assert.equal(visibleWidth('é'), 1);
});

test('fitToWidth leaves short text alone and truncates long text', () => {
  assert.equal(fitToWidth('short', 10), 'short');
  assert.equal(fitToWidth('abcdefghij', 4), 'abcd' + RESET);
  assert.equal(fitToWidth('abc', 0), '');
});

test('fitToWidth keeps escape sequences intact and never splits a wide character', () => {
  const fitted = fitToWidth(RED + 'abcdef' + RESET, 3);
  assert.equal(visibleWidth(fitted), 3);
  assert.ok(fitted.startsWith(RED + 'abc'));
  assert.equal(visibleWidth(fitToWidth('日本語', 5)), 4);
});
