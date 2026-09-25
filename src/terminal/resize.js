'use strict';

const state = require('./state');
const workerPanel = require('./workerPanel');
const serverProgress = require('./serverProgress');
const { renderBannerLine } = require('./banner');
const { BANNER_LINES } = require('./theme');
const { fitToScreen, visibleWidth } = require('./textFit');
const { CLEAR_LINE, CLEAR_SCREEN, RESET_SCROLL_REGION, moveCursor } = require('./ansi');

const RESIZE_DEBOUNCE_MS = 80;
const DEFAULT_ROWS = 24;

function drawBanner() {
  let position = 0;
  BANNER_LINES.forEach((line, lineIndex) => {
    if (line !== '') {
      process.stdout.write(moveCursor(state.bannerStartLine + lineIndex, 1) + CLEAR_LINE + renderBannerLine(lineIndex, position, state.catFrame));
    }
    position += [...line].length;
  });
}

function drawScrollingLog() {
  workerPanel.pinToBottom();
  workerPanel.applyScrollRegion();

  const logTop = state.bannerEndLine + 1;
  const logHeight = Math.max(0, workerPanel.logBottomRow() - logTop + 1);
  const visible = logHeight > 0 ? state.logEntries.slice(-logHeight) : [];
  visible.forEach((entry, index) => {
    process.stdout.write(moveCursor(logTop + (logHeight - visible.length) + index, 1) + CLEAR_LINE + fitToScreen(entry.text));
  });
}

function drawFixedLog(height) {
  const logTop = state.bannerEndLine + 1;
  const offset = Math.max(0, state.outputLine - (height - 1));

  if (offset > 0) {
    state.logEntries = state.logEntries.filter((entry) => entry.row === null || entry.row - offset >= logTop);
    for (const entry of state.logEntries) {
      if (entry.row !== null) entry.row -= offset;
    }
    state.outputLine -= offset;
    if (state.activePrompt) state.activePrompt.row -= offset;
    serverProgress.shiftRows(offset);
  }

  for (const entry of state.logEntries) {
    if (entry.row === null) continue;
    process.stdout.write(moveCursor(entry.row, 1) + CLEAR_LINE + fitToScreen(entry.text));
  }
  if (serverProgress.isActive()) serverProgress.redraw();
}

function redrawPrompt() {
  const prompt = state.activePrompt;
  if (!prompt) return;
  const { row, label, reader } = prompt;
  process.stdout.write(
    moveCursor(row, 1) + CLEAR_LINE + label + reader.line +
    moveCursor(row, visibleWidth(label) + reader.cursor + 1),
  );
}

function redrawAll() {
  if (!state.bannerPrinted || state.flatOutput) return;

  const height = process.stdout.rows || DEFAULT_ROWS;
  process.stdout.write(RESET_SCROLL_REGION + CLEAR_SCREEN);
  state.scrollTop = null;

  drawBanner();

  if (workerPanel.hasWorkers()) drawScrollingLog();
  else drawFixedLog(height);

  redrawPrompt();
}

function installResizeHandler() {
  let timer = null;
  process.stdout.on('resize', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      redrawAll();
    }, RESIZE_DEBOUNCE_MS);
  });
}

module.exports = { installResizeHandler };
