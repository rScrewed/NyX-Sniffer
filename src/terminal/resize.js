'use strict';

const state = require('./state');
const workerPanel = require('./workerPanel');
const serverProgress = require('./serverProgress');
const { BANNER_LINES, bannerColour } = require('./theme');
const { CLEAR_LINE, CLEAR_SCREEN, RESET_SCROLL_REGION, RESET, DIM, moveCursor } = require('./ansi');

const RESIZE_DEBOUNCE_MS = 80;
const SEPARATOR_WIDTH = 36;

function redrawAll() {
  if (!state.bannerPrinted || state.flatOutput) return;

  const savedLog = state.logBuffer.slice();
  const serverWasActive = serverProgress.isActive();

  process.stdout.write(RESET_SCROLL_REGION + CLEAR_SCREEN);
  state.scrollTop = null;
  state.outputLine = 1;
  state.logBuffer = [];

  let colourIndex = 0;
  for (let lineIndex = 0; lineIndex < BANNER_LINES.length; lineIndex++) {
    const line = BANNER_LINES[lineIndex];
    if (line === '') {
      state.outputLine++;
      continue;
    }
    let text = '  ';
    for (const character of line) {
      text += bannerColour(lineIndex, colourIndex, state.catFrame) + character + RESET;
      colourIndex++;
    }
    process.stdout.write(moveCursor(state.outputLine, 1) + CLEAR_LINE + text);
    state.outputLine++;
  }

  state.outputLine += 2;
  process.stdout.write(moveCursor(state.outputLine, 1) + CLEAR_LINE + '  ' + DIM + '─'.repeat(SEPARATOR_WIDTH) + RESET);
  state.outputLine++;
  state.bannerEndLine = state.outputLine - 1;

  if (workerPanel.hasWorkers()) {
    workerPanel.pinToBottom();
    workerPanel.applyScrollRegion();
  }

  const logTop = state.bannerEndLine + 1;
  const logHeight = Math.max(0, workerPanel.logBottomRow() - logTop + 1);
  const visible = savedLog.slice(-logHeight);
  visible.forEach((message, index) => {
    process.stdout.write(moveCursor(logTop + (logHeight - visible.length) + index, 1) + CLEAR_LINE + message);
  });
  state.logBuffer = savedLog;

  if (serverWasActive && state.scrollTop === null) serverProgress.relocate();
}

function installResizeHandler() {
  if (process.platform === 'win32') return;
  let timer = null;
  process.on('SIGWINCH', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      redrawAll();
    }, RESIZE_DEBOUNCE_MS);
  });
}

module.exports = { installResizeHandler };
