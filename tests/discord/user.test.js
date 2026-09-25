'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatUserTag, authorTag, isValidUserId } = require('../../src/discord/user');

test('formatUserTag appends legacy discriminators only', () => {
  assert.equal(formatUserTag({ username: 'kit', discriminator: '0' }), 'kit');
  assert.equal(formatUserTag({ username: 'kit', discriminator: '1234' }), 'kit#1234');
  assert.equal(formatUserTag({}), null);
  assert.equal(formatUserTag(null), null);
});

test('authorTag reads the message author', () => {
  assert.equal(authorTag({ author: { username: 'kit', discriminator: '0' } }), 'kit');
  assert.equal(authorTag(null), null);
});

test('isValidUserId accepts 15 to 25 digit ids', () => {
  assert.equal(isValidUserId('317549730034876426'), true);
  assert.equal(isValidUserId('123'), false);
  assert.equal(isValidUserId('12345678901234a'), false);
});
