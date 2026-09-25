'use strict';

const { RESET } = require('./ansi');

const ESCAPE_SEQUENCE = new RegExp('^' + String.fromCharCode(27) + '\\[[0-9;?]*[A-Za-z]');
const DEFAULT_COLUMNS = 80;

const ZERO_WIDTH_RANGES = [[0x0300, 0x036f], [0x200b, 0x200f], [0xfe00, 0xfe0f]];
const WIDE_RANGES = [
  [0x1100, 0x115f], [0x2e80, 0xa4cf], [0xac00, 0xd7a3], [0xf900, 0xfaff], [0xfe30, 0xfe6f],
  [0xff00, 0xff60], [0xffe0, 0xffe6], [0x1f300, 0x1f64f], [0x1f900, 0x1f9ff], [0x20000, 0x3fffd],
];

const inRanges = (codePoint, ranges) => ranges.some(([start, end]) => codePoint >= start && codePoint <= end);

function characterWidth(codePoint) {
  if (inRanges(codePoint, ZERO_WIDTH_RANGES)) return 0;
  return inRanges(codePoint, WIDE_RANGES) ? 2 : 1;
}

function terminalColumns() {
  return process.stdout.columns || DEFAULT_COLUMNS;
}

function visibleWidth(text) {
  let width = 0;
  for (let index = 0; index < text.length;) {
    const sequence = ESCAPE_SEQUENCE.exec(text.slice(index, index + 32));
    if (sequence) {
      index += sequence[0].length;
      continue;
    }
    const codePoint = text.codePointAt(index);
    width += characterWidth(codePoint);
    index += codePoint > 0xffff ? 2 : 1;
  }
  return width;
}

function fitToWidth(text, maxWidth) {
  if (maxWidth <= 0) return '';
  if (visibleWidth(text) <= maxWidth) return text;

  let output = '';
  let width = 0;
  for (let index = 0; index < text.length;) {
    const sequence = ESCAPE_SEQUENCE.exec(text.slice(index, index + 32));
    if (sequence) {
      output += sequence[0];
      index += sequence[0].length;
      continue;
    }
    const codePoint = text.codePointAt(index);
    const characterLength = codePoint > 0xffff ? 2 : 1;
    const next = width + characterWidth(codePoint);
    if (next > maxWidth) break;
    output += text.slice(index, index + characterLength);
    width = next;
    index += characterLength;
  }
  return output + RESET;
}

function fitToScreen(text) {
  return fitToWidth(text, terminalColumns() - 1);
}

module.exports = { visibleWidth, fitToWidth, fitToScreen, terminalColumns };
