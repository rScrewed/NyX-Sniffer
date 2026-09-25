'use strict';

const state = require('./state');
const { ask, eraseCurrentLine } = require('./question');
const { log, clearPromptArea } = require('./log');
const { setMood } = require('./banner');
const { DEFAULTS, SETTING_KEYS } = require('../config/settings');

const MENU = [
  { choice: '1', title: 'Page delay       ', kind: 'range', minKey: SETTING_KEYS.searchDelayMinMs, maxKey: SETTING_KEYS.searchDelayMaxMs, promptTitle: 'Page delay' },
  { choice: '2', title: '1k cooldown      ', kind: 'seconds', key: SETTING_KEYS.cooldownPerThousandMs, promptTitle: '1k cooldown' },
  { choice: '3', title: 'Server gap       ', kind: 'range', minKey: SETTING_KEYS.serverDelayMinMs, maxKey: SETTING_KEYS.serverDelayMaxMs, promptTitle: 'Server gap' },
  { choice: '4', title: 'Rate limit wait  ', kind: 'seconds', key: SETTING_KEYS.rateLimitWaitMs, promptTitle: 'Rate limit wait' },
];

const DEFAULT_BY_KEY = {
  [SETTING_KEYS.searchDelayMinMs]: DEFAULTS.searchDelayMinMs,
  [SETTING_KEYS.searchDelayMaxMs]: DEFAULTS.searchDelayMaxMs,
  [SETTING_KEYS.serverDelayMinMs]: DEFAULTS.serverDelayMinMs,
  [SETTING_KEYS.serverDelayMaxMs]: DEFAULTS.serverDelayMaxMs,
  [SETTING_KEYS.rateLimitWaitMs]: DEFAULTS.rateLimitWaitMs,
  [SETTING_KEYS.cooldownPerThousandMs]: DEFAULTS.cooldownPerThousandMs,
};

function formatDuration(ms) {
  return ms % 1000 === 0 ? ms / 1000 + 's' : (ms / 1000).toFixed(1) + 's';
}

async function promptSettings(env) {
  setMood('idle');
  const current = { ...env };
  const valueOf = (key) => parseInt(current[key], 10) || DEFAULT_BY_KEY[key];

  while (true) {
    const startLine = state.outputLine;
    log('');
    for (const entry of MENU) {
      const summary = entry.kind === 'range'
        ? formatDuration(valueOf(entry.minKey)) + ' – ' + formatDuration(valueOf(entry.maxKey))
        : formatDuration(valueOf(entry.key));
      log('   [' + entry.choice + ']  ' + entry.title + ' ' + summary);
    }
    log('');

    const answer = await ask('  » Edit [1-4] or [b] back : ');
    clearPromptArea(startLine);

    if (answer === 'b' || answer === '0' || answer === '') return current;

    const entry = MENU.find((candidate) => candidate.choice === answer);
    if (!entry) continue;

    if (entry.kind === 'range') {
      const minAnswer = await ask('  » ' + entry.promptTitle + ' min ms [' + valueOf(entry.minKey) + '] : ');
      state.outputLine++;
      const maxAnswer = await ask('  » ' + entry.promptTitle + ' max ms [' + valueOf(entry.maxKey) + '] : ');
      const minValue = parseInt(minAnswer, 10);
      const maxValue = parseInt(maxAnswer, 10);
      if (minValue > 0) current[entry.minKey] = minValue;
      if (maxValue > 0) current[entry.maxKey] = maxValue;
      clearPromptArea(startLine);
    } else {
      const secondsAnswer = await ask('  » ' + entry.promptTitle + ' secs [' + valueOf(entry.key) / 1000 + '] : ');
      const seconds = parseInt(secondsAnswer, 10);
      if (seconds > 0) current[entry.key] = seconds * 1000;
      eraseCurrentLine();
    }
  }
}

module.exports = { promptSettings };
