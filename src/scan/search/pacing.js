'use strict';

const { settings } = require('../../config/settings');
const { countdown, randomBetween } = require('../../shared/time');

function formatSeconds(remainingMs) {
  return (remainingMs / 1000).toFixed(1);
}

function pauseBetweenPages(label, report) {
  const duration = randomBetween(settings.searchDelayMinMs, settings.searchDelayMaxMs);
  return countdown(duration, (remaining) => report(label + '  ' + formatSeconds(remaining) + 's'));
}

function coolDown(label, report) {
  return countdown(settings.cooldownPerThousandMs, (remaining) => report(label + '  ' + formatSeconds(remaining) + 's'));
}

function waitOutRateLimit(waitMs, remainingPages, report) {
  const suffix = remainingPages !== null
    ? '  (' + remainingPages + (remainingPages === 1 ? ' page' : ' pages') + ' left)'
    : '';
  return countdown(waitMs, (remaining) => {
    report('⟳  rate limited — resuming in ' + Math.max(0, Math.ceil(remaining / 1000)) + 's' + suffix);
  }, 500);
}

module.exports = { pauseBetweenPages, coolDown, waitOutRateLimit };
