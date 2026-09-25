'use strict';

const DISCORD_EPOCH_MS = 1420070400000n;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 1000 * 60 * 60 * 24;

function snowflakeToTimestamp(id) {
  return Number(BigInt(id) >> 22n) + Number(DISCORD_EPOCH_MS);
}

function timestampToSnowflake(timestamp) {
  return ((BigInt(Math.floor(timestamp)) - DISCORD_EPOCH_MS) << 22n).toString();
}

function isOlderSnowflake(a, b) {
  return BigInt(a) < BigInt(b);
}

function snowflakeBefore(id) {
  return (BigInt(id) - 1n).toString();
}

function describeAccountAge(id) {
  const created = new Date(snowflakeToTimestamp(id));
  const diffMs = Date.now() - created.getTime();
  const years = Math.floor(diffMs / (DAY_MS * 365));
  const months = Math.floor(diffMs / (DAY_MS * 30));
  const ago = years >= 1 ? years + ' year' + (years === 1 ? '' : 's') + ' ago'
    : months >= 1 ? months + ' month' + (months === 1 ? '' : 's') + ' ago'
      : Math.floor(diffMs / DAY_MS) + ' days ago';
  return created.getFullYear() + ' ' + MONTH_NAMES[created.getMonth()] + ' ' + created.getDate() + '  (' + ago + ')';
}

module.exports = {
  snowflakeToTimestamp,
  timestampToSnowflake,
  isOlderSnowflake,
  snowflakeBefore,
  describeAccountAge,
  MONTH_NAMES,
};
