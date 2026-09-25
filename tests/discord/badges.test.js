'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { describeBadge } = require('../../src/discord/badges');

test('describes known, booster and tenure badges', () => {
  assert.equal(describeBadge('premium'), 'Nitro');
  assert.equal(describeBadge('guild_booster_lvl3'), 'Booster L3');
  assert.equal(describeBadge('premium_tenure_12_month_v2'), 'Nitro 12mo');
  assert.equal(describeBadge('some_new_badge'), 'some new badge');
});

test('compact names shorten HypeSquad houses', () => {
  assert.equal(describeBadge('hypesquad_house_1'), 'HypeSquad Bravery');
  assert.equal(describeBadge('hypesquad_house_1', { compact: true }), 'Bravery');
});
