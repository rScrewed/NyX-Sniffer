'use strict';

const terminal = require('../../src/terminal');
const terminalState = require('../../src/terminal/state');

const original = {};

function silenceTerminal() {
  const messages = [];
  const replace = (target, key, value) => {
    original[key] = original[key] || new Map();
    original[key].set(target, target[key]);
    target[key] = value;
  };
  const noop = () => {};
  const silentLoader = { update: noop, finish: () => Promise.resolve(), stop: noop };

  terminalState.flatOutput = true;
  replace(terminal, 'createProgressLoader', () => silentLoader);

  replace(terminal, 'log', (message) => messages.push(message));
  replace(terminal, 'setMood', noop);
  replace(terminal, 'delay', () => Promise.resolve());
  for (const name of ['start', 'update', 'finish', 'setSubStatus', 'clearSubStatus']) replace(terminal.server, name, noop);
  for (const name of ['initialize', 'update', 'setMood', 'setStatus', 'setSummary', 'setProgressCount']) replace(terminal.workers, name, noop);

  return { messages };
}

module.exports = { silenceTerminal };
