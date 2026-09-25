'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { snowflakeToTimestamp, timestampToSnowflake, isOlderSnowflake, snowflakeBefore, describeAccountAge } = require('../../src/discord/snowflake');

test('timestamp and snowflake convert both ways', () => {
  const timestamp = Date.UTC(2023, 0, 5, 12, 0, 0);
  const snowflake = timestampToSnowflake(timestamp);
  assert.equal(snowflakeToTimestamp(snowflake), timestamp);
});

test('snowflake comparisons use numeric ordering', () => {
  assert.equal(isOlderSnowflake('999', '1000'), true);
  assert.equal(isOlderSnowflake('1000', '999'), false);
  assert.equal(snowflakeBefore('1000'), '999');
});

test('describeAccountAge mentions years for old accounts', () => {
  const oldSnowflake = timestampToSnowflake(Date.UTC(2015, 5, 1));
  assert.match(describeAccountAge(oldSnowflake), /^2015 (May|Jun) \d+ {2}\(\d+ years ago\)$/);
});
