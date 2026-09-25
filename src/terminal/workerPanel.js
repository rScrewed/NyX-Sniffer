'use strict';

const state = require('./state');
const { registerCountAnimation, requestCountAnimation, stepTowards } = require('./animator');
const { terminalColumns, fitToScreen } = require('./textFit');
const { renderWorkerLine } = require('./workerLine');
const { CAT_FACES } = require('./theme');
const { SAVE_CURSOR, RESTORE_CURSOR, CLEAR_LINE, RESET, DIM, moveCursor, setScrollRegion } = require('./ansi');

const DEFAULT_ROWS = 24;
const LOG_LINES_TO_KEEP = 8;
const SNAPSHOT_FIELDS = ['mode', 'name', 'count', 'displayCount', 'unit', 'done', 'sub', 'status', 'mood', 'frame', 'target'];

let rows = [];
let summaryText = null;
let summaryRow = null;
let progressText = null;
let progressRow = null;
let progressTarget = 0;
let progressDisplayed = 0;
let progressSuffix = '';
let externalDisplay = false;

function screenHeight() {
  return process.stdout.rows || DEFAULT_ROWS;
}

function visibleRowCount() {
  if (externalDisplay) return 0;
  const room = screenHeight() - (state.bannerEndLine || 0) - LOG_LINES_TO_KEEP;
  return Math.min(rows.length, Math.max(1, room));
}

function reservedLines() {
  return visibleRowCount() + (summaryText !== null ? 1 : 0) + (progressText !== null ? 1 : 0);
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
  const hidden = externalDisplay ? 0 : rows.length - visibleRowCount();
  const note = hidden > 0 ? '  ' + DIM + '(+' + hidden + ' more workers, enlarge the window)' + RESET : '';
  process.stdout.write(SAVE_CURSOR + moveCursor(summaryRow, 1) + CLEAR_LINE + fitToScreen((summaryText || '') + note) + RESTORE_CURSOR);
}

function redrawProgressLine() {
  if (progressRow === null) return;
  const text = progressText ? '  ' + DIM + progressText + RESET : '';
  process.stdout.write(SAVE_CURSOR + moveCursor(progressRow, 1) + CLEAR_LINE + text + RESTORE_CURSOR);
}

function redrawWorkerLine(index) {
  const worker = rows[index];
  if (!worker || index >= visibleRowCount() || worker.line <= 0) return;
  process.stdout.write(SAVE_CURSOR + moveCursor(worker.line, 1) + CLEAR_LINE + renderWorkerLine(worker, index, terminalColumns()) + RESTORE_CURSOR);
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
  const visible = visibleRowCount();
  rows.forEach((worker, index) => {
    worker.line = index < visible ? height - visible + 1 + index : 0;
    redrawWorkerLine(index);
  });
}

function renderRowsForHeader() {
  let output = '';
  const visible = visibleRowCount();
  rows.forEach((worker, index) => {
    worker.frame++;
    if (index < visible) output += moveCursor(worker.line, 1) + CLEAR_LINE + renderWorkerLine(worker, index, terminalColumns());
  });
  return output;
}

function useExternalDisplay(enabled) {
  externalDisplay = enabled;
}

function snapshot() {
  if (externalDisplay) rows.forEach((worker) => worker.frame++);
  return {
    workers: rows.map((worker) => Object.fromEntries(SNAPSHOT_FIELDS.map((field) => [field, worker[field]]))),
    summary: summaryText,
    progress: progressText,
  };
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
  useExternalDisplay,
  snapshot,
  setSummary,
  setProgressCount,
  initialize,
  update,
  setMood,
  setStatus,
};
