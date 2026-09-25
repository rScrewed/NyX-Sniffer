'use strict';

const { settings } = require('../../config/settings');
const { SEARCH_PAGE_SIZE, SEARCH_OFFSET_LIMIT } = require('../../discord/searchQuery');
const { isOlderSnowflake, snowflakeBefore } = require('../../discord/snowflake');
const { previewMessage } = require('./attachments');
const { pauseBetweenPages, coolDown, waitOutRateLimit } = require('./pacing');

const MAX_NETWORK_RETRIES = 4;
const NEARLY_DONE_PAGES = 2;
const HELPER_MAX_REMAINING_PAGES = 2;

function collectChannels(channelMap, channels) {
  const list = Array.isArray(channels) ? channels : Object.values(channels || {});
  for (const channel of list) {
    if (channel && channel.id) channelMap[channel.id] = channel;
  }
}

function tryBorrowHelper(borrowHelper, remainingPages, report) {
  if (!borrowHelper || remainingPages === null || remainingPages > HELPER_MAX_REMAINING_PAGES) return null;
  const helper = borrowHelper();
  if (!helper) return null;
  report("borrowing W" + (helper.ui + 1) + "'s connection to finish...");
  return helper;
}

async function paginateGuildSearch(search) {
  const { noun, buildPath, trackChannels, skipDuplicates, announceMessages, collected, handleMessage, reportProgress, context } = search;
  const { range, report, setMood, log, borrowHelper } = context;

  let request = context.request;
  let offset = 0;
  let total = null;
  let page = 0;
  let anchorId = null;
  let networkRetries = 0;
  let thousandsSeen = 0;
  let usingHelper = false;
  let releaseHelper = null;
  const channelMap = {};
  const seenIds = new Set();

  setMood('hunting');

  try {
    while (true) {
      report(total !== null ? 'getting ' + noun + '...  (' + offset + '/' + total + ')' : 'getting ' + noun + '...');

      const data = await request(buildPath({
        offset,
        minId: range.minId,
        maxId: anchorId || range.maxId,
      }));

      if (data && data.rateLimitAbort) {
        const retryAfterMs = data.retryAfterMs || settings.rateLimitWaitMs;
        const remainingPages = total !== null ? Math.ceil((total - offset) / SEARCH_PAGE_SIZE) : null;

        if (!usingHelper) {
          const helper = tryBorrowHelper(borrowHelper, remainingPages, report);
          if (helper) {
            usingHelper = true;
            releaseHelper = helper.release;
            request = helper.request;
            continue;
          }
        }

        const waitMs = remainingPages !== null && remainingPages <= NEARLY_DONE_PAGES
          ? retryAfterMs
          : Math.max(retryAfterMs, settings.rateLimitWaitMs);
        setMood('sad');
        await waitOutRateLimit(waitMs, remainingPages, report);
        setMood('hunting');
        continue;
      }

      if (!data || data.code) {
        if (data && data.code === -1 && networkRetries < MAX_NETWORK_RETRIES) {
          networkRetries++;
          await pauseBetweenPages('network timeout, retrying page ' + networkRetries + '/' + MAX_NETWORK_RETRIES + '...', report);
          continue;
        }
        const detail = data && data.errors ? '  →  ' + JSON.stringify(data.errors) : '';
        log('  ✗  no search access: ' + (data && data.message ? data.message : 'unknown error') + detail);
        break;
      }
      networkRetries = 0;

      if (total === null) {
        total = data.total_results || 0;
        if (total === 0) break;
      }

      if (trackChannels) collectChannels(channelMap, data.channels);

      const messages = (data.messages || []).map((group) => group[0]).filter(Boolean);
      let oldestOnPage = null;

      for (const message of messages) {
        if (skipDuplicates) {
          if (seenIds.has(message.id)) continue;
          seenIds.add(message.id);
        }
        if (!oldestOnPage || isOlderSnowflake(message.id, oldestOnPage)) oldestOnPage = message.id;
        if (announceMessages) report('got: ' + previewMessage(message));
        await handleMessage(message, channelMap);
      }

      offset += messages.length;
      page++;
      reportProgress();

      if (messages.length === 0) break;

      if (offset >= SEARCH_OFFSET_LIMIT && oldestOnPage) {
        log('  ↻  10k chunk — anchoring past limit...');
        anchorId = snowflakeBefore(oldestOnPage);
        offset = 0;
        total = null;
        continue;
      }

      if (offset >= total) break;

      const thousands = Math.floor(collected.length / 1000);
      if (thousands > thousandsSeen) {
        thousandsSeen = thousands;
        setMood('sleepy');
        await coolDown('cooling down...', report);
        setMood('hunting');
      } else if (page % 2 === 0) {
        setMood('sleepy');
        await pauseBetweenPages('timeout...', report);
        setMood('hunting');
      }
    }
  } finally {
    if (releaseHelper) releaseHelper();
  }

  return collected;
}

module.exports = { paginateGuildSearch };
