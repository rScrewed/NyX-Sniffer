'use strict';

const ESC = '\x1b[';

function moveCursor(row, column) {
  return ESC + row + ';' + column + 'H';
}

function setScrollRegion(top, bottom) {
  return ESC + top + ';' + bottom + 'r' + ESC + bottom + ';1H';
}

function moveToColumn(column) {
  return ESC + column + 'G';
}

function foreground256(code) {
  return ESC + '38;5;' + code + 'm';
}

module.exports = {
  HIDE_CURSOR: ESC + '?25l',
  SHOW_CURSOR: ESC + '?25h',
  CLEAR_LINE: '\r' + ESC + '2K',
  CLEAR_SCREEN: ESC + '2J' + ESC + 'H',
  ERASE_TO_LINE_END: ESC + 'K',
  RESET_SCROLL_REGION: ESC + 'r',
  SAVE_CURSOR: ESC + 's',
  RESTORE_CURSOR: ESC + 'u',
  RESET: ESC + '0m',
  BOLD: ESC + '1m',
  DIM: ESC + '2m',
  moveCursor,
  setScrollRegion,
  moveToColumn,
  foreground256,
};
