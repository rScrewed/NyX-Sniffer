'use strict';

const SETTING_KEYS = {
  searchDelayMinMs: 'SEARCH_DELAY_MIN_MS',
  searchDelayMaxMs: 'SEARCH_DELAY_MAX_MS',
  serverDelayMinMs: 'SERVER_DELAY_MIN_MS',
  serverDelayMaxMs: 'SERVER_DELAY_MAX_MS',
  rateLimitWaitMs: 'RATE_LIMIT_WAIT_MS',
  cooldownPerThousandMs: 'COOLDOWN_1K_MS',
};

const DEFAULTS = Object.freeze({
  searchDelayMinMs: 3000,
  searchDelayMaxMs: 8500,
  serverDelayMinMs: 1000,
  serverDelayMaxMs: 2000,
  rateLimitWaitMs: 180000,
  cooldownPerThousandMs: 60000,
});

const settings = { ...DEFAULTS };

function applyEnvOverrides(env) {
  for (const [name, envKey] of Object.entries(SETTING_KEYS)) {
    const value = parseInt(env[envKey], 10);
    if (value > 0) settings[name] = value;
  }
}

module.exports = { settings, DEFAULTS, SETTING_KEYS, applyEnvOverrides };
