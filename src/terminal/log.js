'use strict';

const state = require('./state');
const workerPanel = require('./workerPanel');
const { fitToScreen } = require('./textFit');
const { delay } = require('../shared/time');
const { SAVE_CURSOR, RESTORE_CURSOR, CLEAR_LINE, moveCursor } = require('./ansi');

function log(message) {
  if (state.scrollTop !== null) {
    state.logEntries.push({ text: message, row: null });
    process.stdout.write(SAVE_CURSOR + moveCursor(workerPanel.logBottomRow(), 1) + '\n' + fitToScreen(message) + RESTORE_CURSOR);
    return;
  }

  state.logEntries.push({ text: message, row: state.outputLine });
  process.stdout.write(SAVE_CURSOR + moveCursor(state.outputLine, 1) + CLEAR_LINE + fitToScreen(message) + RESTORE_CURSOR);
  state.outputLine++;
}

function eraseRows(fromLine, toLine) {
  for (let row = fromLine; row <= toLine; row++) {
    process.stdout.write(SAVE_CURSOR + moveCursor(row, 1) + CLEAR_LINE + RESTORE_CURSOR);
  }
  state.logEntries = state.logEntries.filter((entry) => entry.row === null || entry.row < fromLine || entry.row > toLine);
}

function clearLinesFrom(fromLine) {
  eraseRows(fromLine, state.outputLine - 1);
  state.outputLine = fromLine;
}

function clearPromptArea(startLine) {
  eraseRows(startLine, state.outputLine);
  state.outputLine = startLine;
}

function getOutputLine() {
  return state.outputLine;
}

async function typeLine(text, charDelay = 13) {
  let typed = '';
  for (const character of text) {
    typed += character;
    if (state.flatOutput) {
      process.stdout.write('\r' + typed);
    } else {
      process.stdout.write(SAVE_CURSOR + moveCursor(state.outputLine, 1) + CLEAR_LINE + typed + RESTORE_CURSOR);
    }
    await delay(charDelay);
  }
  if (state.flatOutput) process.stdout.write('\n');
  state.outputLine++;
}

async function printResults(rows, folderPath) {
  process.stdout.write('\n');
  state.outputLine++;
  for (const row of rows) {
    await typeLine(row, 11);
    await delay(35);
  }
  process.stdout.write('\n');
  state.outputLine++;
  await typeLine('  Folder  →  ' + folderPath, 18);
  process.stdout.write('\n');
  state.outputLine++;
}

function finalizeOutput() {
  process.stdout.write('\n');
}

module.exports = { log, clearLinesFrom, clearPromptArea, getOutputLine, typeLine, printResults, finalizeOutput };
