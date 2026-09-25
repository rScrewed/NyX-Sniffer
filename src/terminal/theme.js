'use strict';

const { foreground256 } = require('./ansi');

const CAT_FACES = {
  idle: ['(=^ OwO  ^=)', '(=^ ◕ω◕ ^=)', '(=^ ✧ω✧ ^=)', '(=^ ≧◡≦ ^=)'],
  hunting: ['(=^ ⊙ω⊙ ^=)', '(=^ ◈ω◈ ^=)', '(=^ ◉ω◉ ^=)', '(=^ ✧ω✧ ^=)'],
  eating: ['(=^ >ω< ^=)', '(=^ ꒰꒱ ^=)', '(=^ ᗒᗨᗕ ^=)', '(=^ NOM  ^=)'],
  sad: ['(=^ ;ω; ^=)', '(=^ T_T ^=)', '(=^ ╥ω╥ ^=)', '(=^ u_u ^=)'],
  sleepy: ['(=^ -ω- ^=)', '(=^ -.- ^=)', '(=^ -.-.^=)', '(=^ -ω- ^=)'],
  happy: ['(=^ ≧ω≦ ^=)', '(=^ ^ω^ ^=)', '(=^ ᵔωᵔ ^=)', '(=^ ♡ω♡ ^=)'],
  done: ['(=^ - ^=)'],
};

const BANNER_GRADIENT = [99, 105, 111, 117, 123, 117, 111, 105, 99, 93, 99, 105].map(foreground256);
const BYLINE_GRADIENT = [52, 88, 124, 160, 196, 203, 210, 203, 196, 160, 124, 88].map(foreground256);
const WORKER_PALETTE = [147, 116, 222, 157, 218, 153].map(foreground256);
const WORKER_ERROR_COLOUR = foreground256(203);
const WORKER_DONE_COLOUR = foreground256(114);

const BANNER_ART = [
  '▐ ▄  ▄· ▄▌▐▄• ▄',
  '•█▌▐█▐█▪██▌ █▌█▌▪',
  '▐█▐▐▌▐█▌▐█▪ ·██·',
  '██▐█▌ ▐█▀·.▪▐█·█▌',
  '▀▀ █▪  ▀ • •▀▀ ▀▀',
  '',
  '·▄▄▄▄  ▪  .▄▄ ·  ▄▄·       ▄▄▄  ·▄▄▄▄  ▄▄▄▄▄            ▄▄▌',
  '██▪ ██ ██ ▐█ ▀. ▐█ ▌▪▪     ▀▄ █·██▪ ██ •██  ▪     ▪     ██•',
  '▐█· ▐█▌▐█·▄▀▀▀█▄██ ▄▄ ▄█▀▄ ▐▀▀▄ ▐█· ▐█▌ ▐█.▪ ▄█▀▄  ▄█▀▄ ██▪',
  '██. ██ ▐█▌▐█▄▪▐█▐███▌▐█▌.▐▌▐█•█▌██. ██  ▐█▌·▐█▌.▐▌▐█▌.▐▌▐█▌▐▌',
  '▀▀▀▀▀• ▀▀▀ ▀▀▀▀ ·▀▀▀  ▀█▄▀▪.▀  ▀▀▀▀▀▀•  ▀▀▀  ▀█▄▀▪ ▀█▄▀▪.▀▀▀',
];

const BYLINE = 'By rScrewed';
const bannerWidth = Math.max(...BANNER_ART.map((line) => [...line].length));
const BANNER_LINES = [...BANNER_ART, ' '.repeat(Math.max(0, bannerWidth - BYLINE.length)) + BYLINE];
const BYLINE_INDEX = BANNER_LINES.length - 1;

function bannerColour(lineIndex, position, frame) {
  if (lineIndex === BYLINE_INDEX) return BYLINE_GRADIENT[(position + frame) % BYLINE_GRADIENT.length];
  return BANNER_GRADIENT[position % BANNER_GRADIENT.length];
}

module.exports = {
  CAT_FACES,
  WORKER_PALETTE,
  WORKER_ERROR_COLOUR,
  WORKER_DONE_COLOUR,
  BANNER_LINES,
  bannerColour,
};
