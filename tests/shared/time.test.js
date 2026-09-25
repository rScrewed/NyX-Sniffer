'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatElapsed, randomBetween, countdown } = require('../../src/shared/time');

test('formatElapsed formats seconds and minutes', () => {
  assert.equal(formatElapsed(1500), '1.5s');
  assert.equal(formatElapsed(65000), '1m 05s');
  assert.equal(formatElapsed(600000), '10m 00s');
});

test('randomBetween stays within inclusive bounds', () => {
  for (let i = 0; i < 200; i++) {
    const value = randomBetween(3, 5);
    assert.ok(value >= 3 && value <= 5);
  }
});

test('countdown reports remaining time and resolves when finished', async () => {
  const ticks = [];
  await countdown(60, (remaining) => ticks.push(remaining), 20);
  assert.ok(ticks.length >= 2);
  assert.equal(ticks[ticks.length - 1], 0);
});
