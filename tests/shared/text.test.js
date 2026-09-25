'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { stripEmoji, toSafeName } = require('../../src/shared/text');

test('stripEmoji removes emoji and invisible characters', () => {
  assert.equal(stripEmoji('Alpha Server \u{1F525}'), 'Alpha Server');
  assert.equal(stripEmoji('zero​width'), 'zerowidth');
  assert.equal(stripEmoji(null), null);
  assert.equal(stripEmoji(''), '');
});

test('toSafeName produces a lowercase file-system safe name', () => {
  assert.equal(toSafeName('Some User!'), 'some_user');
  assert.equal(toSafeName('  '), 'unknown');
  assert.equal(toSafeName(null), 'unknown');
  assert.equal(toSafeName('a'.repeat(100)).length, 64);
});
