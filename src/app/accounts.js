'use strict';

const terminal = require('../terminal');
const terminalUi = require('./terminalUi');
const { loadTokens, saveEnv } = require('../config/envFile');
const { createDiscordClient, RATE_LIMIT_STRATEGIES } = require('../discord/client');

const NUMBERED_TOKEN_KEY = /^Token\d+$/;

function isValidAccount(me) {
  return Boolean(me && me.username && !me.code);
}

function describeAccount(me) {
  return me.global_name || (me.discriminator && me.discriminator !== '0' ? me.username + '#' + me.discriminator : me.username);
}

function workerLabel(index) {
  return index === 0 ? 'Main' : 'W' + (index + 1);
}

function removeTokensFromEnv(env, removedTokens, keptTokens) {
  const usesNumberedKeys = Object.keys(env).some((key) => NUMBERED_TOKEN_KEY.test(key) && env[key] && env[key].trim());
  const next = {};
  let numberedWritten = false;

  for (const [key, value] of Object.entries(env)) {
    if (usesNumberedKeys && NUMBERED_TOKEN_KEY.test(key)) {
      if (!numberedWritten) {
        keptTokens.forEach((token, index) => {
          next['Token' + (index + 1)] = token;
        });
        numberedWritten = true;
      }
      continue;
    }
    if (!usesNumberedKeys && key === 'Token' && removedTokens.has((value || '').trim())) continue;
    next[key] = value;
  }
  return next;
}

function createAccountPool(initialEnv) {
  const pool = {
    env: initialEnv,
    tokens: loadTokens(initialEnv),
    client: null,
  };

  function refreshClient() {
    pool.client = pool.tokens.length > 0
      ? createDiscordClient({ token: pool.tokens[0], rateLimit: RATE_LIMIT_STRATEGIES.WAIT, ui: terminalUi })
      : null;
  }

  pool.useToken = (token) => {
    pool.tokens = [token];
    refreshClient();
  };

  pool.reportLogin = async () => {
    const me = await pool.client.request('/users/@me');
    if (isValidAccount(me)) terminal.log('  logged in as        ' + describeAccount(me));
    return me;
  };

  pool.verifyWorkers = async () => {
    const loader = terminal.createProgressLoader(pool.tokens.length);
    const results = [];

    try {
      for (let index = 0; index < pool.tokens.length; index++) {
        const probe = createDiscordClient({ token: pool.tokens[index], rateLimit: RATE_LIMIT_STRATEGIES.ABORT });
        const me = await probe.request('/users/@me');
        const ok = isValidAccount(me);
        results.push({ label: workerLabel(index), me, ok, token: pool.tokens[index] });
        loader.update(index + 1, workerLabel(index) + (ok ? ' online' : '  failed'));
      }
      await loader.finish();
    } finally {
      loader.stop();
    }
    terminal.log('');

    const failed = results.filter((result) => !result.ok);
    if (failed.length === 0) {
      terminal.log('  all ' + results.length + ' worker(s) online');
      terminal.log('');
      return;
    }

    for (const result of failed) {
      terminal.log('  ' + result.label.padEnd(6) + '  ·  invalid  (' + (result.me && result.me.message ? result.me.message : 'no response') + ')');
    }

    if (!(await terminal.prompts.promptRemoveWorkers(failed.length))) {
      terminal.log('  kept all workers in .env');
      terminal.log('');
      return;
    }

    const removed = new Set(failed.map((result) => result.token));
    const kept = pool.tokens.filter((token) => !removed.has(token));
    pool.env = removeTokensFromEnv(pool.env, removed, kept);
    saveEnv(pool.env);

    pool.tokens = kept;
    refreshClient();
    terminal.log('  removed ' + failed.length + ' worker(s) from .env  ·  ' + kept.length + ' left');
    terminal.log('');
  };

  pool.connect = async () => {
    refreshClient();
    if (pool.tokens.length === 0) return;
    if (pool.tokens.length === 1) {
      const me = await pool.client.request('/users/@me');
      terminal.log(isValidAccount(me) ? '  logged in as        ' + describeAccount(me) : '  token loaded');
    } else {
      await pool.verifyWorkers();
    }
  };

  return pool;
}

module.exports = { createAccountPool };
