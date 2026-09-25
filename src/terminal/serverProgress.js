'use strict';

const state = require('./state');
const { registerCountAnimation, requestCountAnimation, stepTowards } = require('./animator');
const { SAVE_CURSOR, RESTORE_CURSOR, CLEAR_LINE, RESET, BOLD, DIM, moveCursor } = require('./ansi');

let mode = '';
let name = '';
let unit = '';
let meta = '';
let count = 0;
let displayedCount = 0;
let headlineRow = null;
let subStatusRow = null;

function isActive() {
  return headlineRow !== null;
}

function redrawHeadline(done) {
  if (headlineRow === null) return;
  const tick = done ? '✓' : '▸';
  const metaText = meta ? '  ' + meta : '';
  const countText = displayedCount > 0 ? ' (' + displayedCount + ' ' + unit + metaText + ')' : '';
  const line = '  ' + tick + '  ' + BOLD + mode + RESET + DIM + ' │ ' + RESET + name + DIM + countText + RESET;
  process.stdout.write(SAVE_CURSOR + moveCursor(headlineRow, 1) + CLEAR_LINE + line + RESTORE_CURSOR);
}

function stepCount() {
  if (displayedCount >= count) return false;
  displayedCount = stepTowards(displayedCount, count);
  redrawHeadline(false);
  return displayedCount < count;
}

registerCountAnimation(stepCount);

function clearSubStatus() {
  if (subStatusRow === null) return;
  process.stdout.write(SAVE_CURSOR + moveCursor(subStatusRow, 1) + CLEAR_LINE + RESTORE_CURSOR);
}

function setSubStatus(message) {
  if (subStatusRow === null) return;
  process.stdout.write(SAVE_CURSOR + moveCursor(subStatusRow, 1) + CLEAR_LINE + '  ' + DIM + message + RESET + RESTORE_CURSOR);
}

function start(newMode, newName, newUnit) {
  mode = newMode;
  name = newName;
  unit = newUnit;
  count = 0;
  displayedCount = 0;
  meta = '';

  if (headlineRow === null) {
    headlineRow = state.outputLine;
    subStatusRow = state.outputLine + 1;
    state.outputLine += 2;
  } else {
    clearSubStatus();
  }
  redrawHeadline(false);
}

function update(newCount, newMeta) {
  count = newCount;
  if (newMeta !== undefined) meta = newMeta;
  requestCountAnimation();
}

function finish() {
  displayedCount = count;
  redrawHeadline(true);
}

function relocate() {
  headlineRow = state.outputLine;
  subStatusRow = state.outputLine + 1;
  state.outputLine += 2;
  redrawHeadline(false);
}

module.exports = { isActive, start, update, finish, relocate, setSubStatus, clearSubStatus };
