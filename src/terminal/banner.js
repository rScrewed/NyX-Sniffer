'use strict';

const state = require('./state');
const workerPanel = require('./workerPanel');
const { delay } = require('../shared/time');
const { BANNER_LINES, CAT_FACES, bannerColour } = require('./theme');
const { HIDE_CURSOR, SHOW_CURSOR, CLEAR_LINE, CLEAR_SCREEN, RESET_SCROLL_REGION, SAVE_CURSOR, RESTORE_CURSOR, RESET, moveCursor } = require('./ansi');

const HEADER_REFRESH_MS = 150;
const BLANK_LINE_DELAY_MS = 6;
const ART_LINE_DELAY_MS = 22;
const DEFAULT_ROWS = 24;

function clearScreen() {
  process.stdout.write(HIDE_CURSOR + CLEAR_SCREEN);
}

function setMood(mood) {
  if (CAT_FACES[mood]) state.catFrame = 0;
}

function renderBannerLine(lineIndex, startPosition, frame) {
  const line = BANNER_LINES[lineIndex];
  if (line === '') return '';
  let text = '  ';
  let position = startPosition;
  for (const character of line) {
    text += bannerColour(lineIndex, position++, frame) + character + RESET;
  }
  return text;
}

function updateHeader() {
  if (!state.bannerPrinted && !workerPanel.hasWorkers()) return;

  let output = SAVE_CURSOR;

  if (state.bannerPrinted) {
    let row = state.bannerStartLine;
    let position = 0;
    BANNER_LINES.forEach((line, lineIndex) => {
      output += moveCursor(row++, 1) + CLEAR_LINE + renderBannerLine(lineIndex, position, state.catFrame);
      position += [...line].length;
    });
  }

  output += workerPanel.renderRowsForHeader() + RESTORE_CURSOR;
  process.stdout.write(output);
  state.catFrame++;
}

function startHeader() {
  if (!state.headerTimer) state.headerTimer = setInterval(updateHeader, HEADER_REFRESH_MS);
}

function stopHeader() {
  if (state.headerTimer) {
    clearInterval(state.headerTimer);
    state.headerTimer = null;
  }
  process.stdout.write(RESET_SCROLL_REGION + moveCursor(process.stdout.rows || DEFAULT_ROWS, 1) + '\n');
  state.scrollTop = null;
  state.flatOutput = true;
  process.stdout.write(SHOW_CURSOR);
}

async function showBanner() {
  state.bannerStartLine = state.outputLine;

  const startPositions = [];
  let cumulative = 0;
  for (const line of BANNER_LINES) {
    startPositions.push(cumulative);
    cumulative += [...line].length;
  }

  for (let lineIndex = 0; lineIndex < BANNER_LINES.length; lineIndex++) {
    state.catFrame++;
    let output = SAVE_CURSOR;
    let row = state.bannerStartLine;
    for (let drawn = 0; drawn <= lineIndex; drawn++) {
      output += moveCursor(row++, 1) + CLEAR_LINE + renderBannerLine(drawn, startPositions[drawn], state.catFrame);
    }
    process.stdout.write(output + RESTORE_CURSOR);
    state.outputLine++;
    await delay(BANNER_LINES[lineIndex] === '' ? BLANK_LINE_DELAY_MS : ART_LINE_DELAY_MS);
  }

  state.outputLine++;
  state.bannerPrinted = true;
  startHeader();
  state.outputLine++;
  state.bannerEndLine = state.outputLine - 1;
  updateHeader();
}

module.exports = { clearScreen, setMood, stopHeader, showBanner };
