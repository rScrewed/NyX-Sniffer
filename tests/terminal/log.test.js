'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const state = require('../../src/terminal/state');
const { log, clearLinesFrom, clearPromptArea } = require('../../src/terminal/log');

function withCapturedOutput(action) {
  const original = process.stdout.write;
  process.stdout.write = () => true;
  try {
    action();
  } finally {
    process.stdout.write = original;
  }
}

function resetState() {
  state.outputLine = 15;
  state.scrollTop = null;
  state.logEntries = [];
  state.activePrompt = null;
}

test('logging records the screen row of every line', () => {
  resetState();
  withCapturedOutput(() => {
    log('one');
    log('two');
  });
  assert.deepEqual(state.logEntries, [{ text: 'one', row: 15 }, { text: 'two', row: 16 }]);
  assert.equal(state.outputLine, 17);
});

test('erasing rows forgets the lines that were on them', () => {
  resetState();
  withCapturedOutput(() => {
    log('keep');
    const start = state.outputLine;
    log('menu 1');
    log('menu 2');
    clearLinesFrom(start);
    assert.equal(state.outputLine, start);
    log('after');
  });
  assert.deepEqual(state.logEntries.map((entry) => entry.text), ['keep', 'after']);
});

test('clearing a prompt area also removes the prompt row', () => {
  resetState();
  withCapturedOutput(() => {
    const start = state.outputLine;
    log('option');
    clearPromptArea(start);
  });
  assert.deepEqual(state.logEntries, []);
  assert.equal(state.outputLine, 15);
});

test('lines logged while a scroll region is active have no fixed row', () => {
  resetState();
  state.scrollTop = 16;
  withCapturedOutput(() => log('scrolling'));
  assert.deepEqual(state.logEntries, [{ text: 'scrolling', row: null }]);
  state.scrollTop = null;
});
