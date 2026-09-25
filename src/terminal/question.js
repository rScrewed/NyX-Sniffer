'use strict';

const readline = require('readline');
const state = require('./state');
const { SAVE_CURSOR, RESTORE_CURSOR, CLEAR_LINE, moveCursor } = require('./ansi');

function ask(label) {
  return new Promise((resolve) => {
    process.stdout.write(SAVE_CURSOR + moveCursor(state.outputLine, 1) + CLEAR_LINE);
    const reader = readline.createInterface({ input: process.stdin, output: process.stdout });
    reader.question(label, (answer) => {
      reader.close();
      resolve(answer.trim());
    });
  });
}

function eraseCurrentLine() {
  process.stdout.write(SAVE_CURSOR + moveCursor(state.outputLine, 1) + CLEAR_LINE + RESTORE_CURSOR);
}

module.exports = { ask, eraseCurrentLine };
