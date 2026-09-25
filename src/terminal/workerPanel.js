'use strict';

const state = require('./state');
const { registerCountAnimation, requestCountAnimation, stepTowards } = require('./animator');
const { fitToWidth, terminalColumns } = require('./textFit');
const { CAT_FACES, WORKER_PALETTE, WORKER_ERROR_COLOUR, WORKER_DONE_COLOUR } = require('./theme');
const { SAVE_CURSOR, RESTORE_CURSOR, CLEAR_LINE, ERASE_TO_LINE_END, RESET, BOLD, DIM, moveCursor, moveToColumn, setScrollRegion } = require('./ansi');

const PROGRESS_BAR_COLUMN = 75;
const PROGRESS_BAR_WIDTH = 12;
const PROGRESS_BAR_TEXT_WIDTH = PROGRESS_BAR_WIDTH + 5;
const MIN_BAR_COLUMN = 40;
const DEFAULT_ROWS = 24;

let rows = [];
let summaryText = null;
let summaryRow = null;
let progressText = null;
let progressRow = null;
let progressTarget = 0;
let progressDisplayed = 0;
let progressSuffix = '';

function screenHeight() {
  return process.stdout.rows || DEFAULT_ROWS;
}

function reservedLines() {
  return rows.length + (summaryText !== null ? 1 : 0) + (progressText !== null ? 1 : 0);
}

function hasWorkers() {
  return rows.length > 0;
}

function logBottomRow() {
  const reserved = reservedLines();
  return reserved > 0 ? screenHeight() - reserved : screenHeight();
}

function applyScrollRegion() {
  if (!state.bannerEndLine || state.flatOutput) return;
  const top = state.bannerEndLine + 1;
  const bottom = logBottomRow();
  if (bottom >= top) {
    process.stdout.write(setScrollRegion(top, bottom));
    state.scrollTop = top;
  }
}

function redrawSummaryLine() {
  if (summaryRow === null) return;
  process.stdout.write(SAVE_CURSOR + moveCursor(summaryRow, 1) + CLEAR_LINE + (summaryText || '') + RESTORE_CURSOR);
}

function redrawProgressLine() {
  if (progressRow === null) return;
  const text = progressText ? '  ' + DIM + progressText + RESET : '';
  process.stdout.write(SAVE_CURSOR + moveCursor(progressRow, 1) + CLEAR_LINE + text + RESTORE_CURSOR);
}

function renderProgressBar(worker, colour) {
  const ratio = worker.done ? 1 : Math.min(0.99, worker.displayCount / worker.target);
  const filled = Math.round(ratio * PROGRESS_BAR_WIDTH);
  const percent = Math.round(ratio * 100);
  const bar = colour + '█'.repeat(filled) + DIM + '░'.repeat(PROGRESS_BAR_WIDTH - filled) + RESET;
  return DIM + String(percent).padStart(3) + '%' + RESET + ' ' + bar;
}

function renderWorkerLine(worker, index) {
  const faces = worker.done ? CAT_FACES.done : (CAT_FACES[worker.mood] || CAT_FACES.idle);
  const face = worker.done ? faces[0] : faces[worker.frame % faces.length];
  const colour = worker.done ? WORKER_DONE_COLOUR : worker.mood === 'sad' ? WORKER_ERROR_COLOUR : WORKER_PALETTE[index % WORKER_PALETTE.length];
  const tick = worker.done ? '✓' : '▸';
  const count = worker.displayCount > 0 ? ' (' + worker.displayCount + ' ' + worker.unit + ')' : '';
  const mode = worker.mode ? BOLD + worker.mode + RESET + DIM + ' │ ' + RESET : '';
  const left = '  ' + colour + face + RESET + '  ' + colour + tick + ' ' + DIM + 'W' + (index + 1) + RESET + '  ' + mode + worker.name + DIM + count + RESET;
  const trailer = worker.done ? '' : (worker.sub || worker.status);
  const trailing = trailer ? '  ' + DIM + trailer + RESET : '';

  const columns = terminalColumns();
  const barColumn = Math.min(PROGRESS_BAR_COLUMN, columns - PROGRESS_BAR_TEXT_WIDTH - 4);

  if (worker.target > 0 && barColumn >= MIN_BAR_COLUMN) {
    const remaining = columns - barColumn - PROGRESS_BAR_TEXT_WIDTH - 1;
    return fitToWidth(left, barColumn - 1) + moveToColumn(barColumn) + renderProgressBar(worker, colour) +
      fitToWidth(trailing, remaining) + ERASE_TO_LINE_END;
  }
  return fitToWidth(left + trailing, columns - 1);
}

function redrawWorkerLine(index) {
  const worker = rows[index];
  if (!worker) return;
  process.stdout.write(SAVE_CURSOR + moveCursor(worker.line, 1) + CLEAR_LINE + renderWorkerLine(worker, index) + RESTORE_CURSOR);
}

function pinToBottom() {
  const height = screenHeight();
  let row = height - reservedLines() + 1;
  if (summaryText !== null) {
    summaryRow = row++;
    redrawSummaryLine();
  }
  if (progressText !== null) {
    progressRow = row++;
    redrawProgressLine();
  }
  rows.forEach((worker, index) => {
    worker.line = height - rows.length + 1 + index;
    redrawWorkerLine(index);
  });
}

function renderRowsForHeader() {
  let output = '';
  rows.forEach((worker, index) => {
    worker.frame++;
    output += moveCursor(worker.line, 1) + CLEAR_LINE + renderWorkerLine(worker, index);
  });
  return output;
}

function stepCounts() {
  let active = false;

  rows.forEach((worker, index) => {
    if (worker.displayCount < worker.count) {
      worker.displayCount = stepTowards(worker.displayCount, worker.count);
      redrawWorkerLine(index);
      if (worker.displayCount < worker.count) active = true;
    }
  });

  if (progressDisplayed < progressTarget) {
    progressDisplayed = stepTowards(progressDisplayed, progressTarget);
    progressText = progressDisplayed + progressSuffix;
    redrawProgressLine();
    if (progressDisplayed < progressTarget) active = true;
  }

  return active;
}

registerCountAnimation(stepCounts);

function setSummary(text) {
  summaryText = text;
  progressText = '';
  summaryRow = null;
  progressRow = null;
}

function setProgressCount(count, suffix) {
  progressTarget = count;
  progressSuffix = suffix;
  requestCountAnimation();
}

function initialize(workerCount, targetPerWorker) {
  rows = [];
  for (let i = 0; i < workerCount; i++) {
    rows.push({
      line: 0,
      mode: '',
      name: 'initializing...',
      count: 0,
      displayCount: 0,
      unit: '',
      done: false,
      sub: '',
      status: '',
      mood: 'idle',
      frame: i * 3,
      target: targetPerWorker || 0,
    });
  }
  pinToBottom();
  applyScrollRegion();
}

function update(index, changes) {
  const worker = rows[index];
  if (!worker) return;
  if (changes.mode !== undefined) worker.mode = changes.mode;
  if (changes.name !== undefined) worker.name = changes.name;
  if (changes.count !== undefined) {
    worker.count = changes.count;
    requestCountAnimation();
  }
  if (changes.unit !== undefined) worker.unit = changes.unit;
  if (changes.done !== undefined) {
    worker.done = changes.done;
    if (changes.done) worker.displayCount = worker.count;
  }
  if (changes.sub !== undefined) worker.sub = changes.sub;
  redrawWorkerLine(index);
}

function setMood(index, mood) {
  const worker = rows[index];
  if (!worker || !CAT_FACES[mood]) return;
  worker.mood = mood;
  redrawWorkerLine(index);
}

function setStatus(index, message) {
  const worker = rows[index];
  if (!worker) return;
  worker.status = message || '';
  redrawWorkerLine(index);
}

module.exports = {
  hasWorkers,
  logBottomRow,
  applyScrollRegion,
  pinToBottom,
  renderRowsForHeader,
  setSummary,
  setProgressCount,
  initialize,
  update,
  setMood,
  setStatus,
};
