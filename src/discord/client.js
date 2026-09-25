'use strict';

const nodeFetch = require('node-fetch');
const { settings } = require('../config/settings');
const { delay } = require('../shared/time');

const API_BASE = 'https://discord.com/api/v9';
const REQUEST_TIMEOUT_MS = 45000;
const MAX_NETWORK_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 2000;
const RATE_LIMIT_TICK_MS = 500;

const RATE_LIMIT_STRATEGIES = Object.freeze({ WAIT: 'wait', ABORT: 'abort' });

const silentUi = {
  log() {},
  setMood() {},
  setSubStatus() {},
  clearSubStatus() {},
};

function cleanToken(token) {
  return token.replace(/^"|"$/g, '');
}

function buildRequestInit(token, options) {
  const body = options.body ? JSON.stringify(options.body) : undefined;
  return {
    method: options.method || 'GET',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Authorization: token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
  };
}

function createDiscordClient({ token, rateLimit = RATE_LIMIT_STRATEGIES.WAIT, ui = silentUi, onRateLimit = () => {}, fetchImplementation = nodeFetch, retryDelayMs = DEFAULT_RETRY_DELAY_MS }) {
  const authToken = cleanToken(token);
  const waiting = rateLimit === RATE_LIMIT_STRATEGIES.WAIT;

  async function waitOutRateLimit(response, apiPath) {
    let waitMs = settings.rateLimitWaitMs;
    try {
      const body = await response.json();
      if (typeof body.retry_after === 'number') {
        waitMs = Math.max(waitMs, Math.ceil(body.retry_after * 1000) + 1000);
      }
    } catch {}

    const totalSeconds = waitMs / 1000;
    const startedAt = Date.now();
    ui.setMood('sad');
    ui.log('  ⟳  rate limited on ' + apiPath + ' — waiting ' + Math.ceil(totalSeconds) + 's...');
    const ticker = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      ui.setSubStatus('⟳  rate limited — resuming in ' + Math.max(0, totalSeconds - elapsed) + 's');
    }, RATE_LIMIT_TICK_MS);
    await delay(waitMs);
    clearInterval(ticker);
    ui.setMood('hunting');
    ui.clearSubStatus();
  }

  async function abortOnRateLimit(response) {
    let retryAfterMs = null;
    try {
      const body = await response.json();
      if (typeof body.retry_after === 'number') retryAfterMs = Math.ceil(body.retry_after * 1000) + 1000;
    } catch {}
    ui.setMood('sad');
    onRateLimit('⟳  rate limited', retryAfterMs);
    return { rateLimitAbort: true, retryAfterMs };
  }

  async function readJson(response, apiPath) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      ui.log('  ✗  unexpected response (HTTP ' + response.status + ') — skipping this request');
      if (waiting) {
        const text = await response.text();
        ui.log('     hint: ' + text.slice(0, 120).replace(/[\r\n]+/g, ' ').trim() + '...');
      }
      return { code: response.status, message: 'non-JSON response (HTTP ' + response.status + ')' };
    }

    try {
      return await response.json();
    } catch (error) {
      ui.log('  ✗  JSON parse failed for ' + apiPath + ' — skipping');
      return { code: -1, message: 'JSON parse error: ' + error.message };
    }
  }

  async function request(apiPath, options = {}, attempt = 1) {
    let response;
    try {
      response = await fetchImplementation(API_BASE + apiPath, buildRequestInit(authToken, options));
    } catch (error) {
      if (attempt < MAX_NETWORK_ATTEMPTS) {
        await delay(retryDelayMs * attempt);
        return request(apiPath, options, attempt + 1);
      }
      ui.log('  ✗  network error on ' + apiPath + ' — ' + error.message);
      return { code: -1, message: error.message };
    }

    if (response.status === 429) {
      if (!waiting) return abortOnRateLimit(response);
      await waitOutRateLimit(response, apiPath);
      return request(apiPath, options);
    }

    return readJson(response, apiPath);
  }

  async function requestQuietly(apiPath) {
    try {
      const response = await fetchImplementation(API_BASE + apiPath, { headers: { Authorization: authToken } });
      if (!response.ok) return null;
      if (!(response.headers.get('content-type') || '').includes('application/json')) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  return { request, requestQuietly };
}

module.exports = { createDiscordClient, RATE_LIMIT_STRATEGIES };
