'use strict';

const { fitToWidth } = require('./textFit');
const { CAT_FACES, WORKER_PALETTE, WORKER_ERROR_COLOUR, WORKER_DONE_COLOUR } = require('./theme');
const { ERASE_TO_LINE_END, RESET, BOLD, DIM, moveToColumn } = require('./ansi');

const PROGRESS_BAR_COLUMN = 75;
const PROGRESS_BAR_WIDTH = 12;
const PROGRESS_BAR_TEXT_WIDTH = PROGRESS_BAR_WIDTH + 5;
const MIN_BAR_COLUMN = 40;

function renderProgressBar(worker, colour) {
  const ratio = worker.done ? 1 : Math.min(0.99, worker.displayCount / worker.target);
  const filled = Math.round(ratio * PROGRESS_BAR_WIDTH);
  const percent = Math.round(ratio * 100);
  const bar = colour + '█'.repeat(filled) + DIM + '░'.repeat(PROGRESS_BAR_WIDTH - filled) + RESET;
  return DIM + String(percent).padStart(3) + '%' + RESET + ' ' + bar;
}

function renderWorkerLine(worker, index, columns) {
  const faces = worker.done ? CAT_FACES.done : (CAT_FACES[worker.mood] || CAT_FACES.idle);
  const face = worker.done ? faces[0] : faces[worker.frame % faces.length];
  const colour = worker.done ? WORKER_DONE_COLOUR : worker.mood === 'sad' ? WORKER_ERROR_COLOUR : WORKER_PALETTE[index % WORKER_PALETTE.length];
  const tick = worker.done ? '✓' : '▸';
  const count = worker.displayCount > 0 ? ' (' + worker.displayCount + ' ' + worker.unit + ')' : '';
  const mode = worker.mode ? BOLD + worker.mode + RESET + DIM + ' │ ' + RESET : '';
  const left = '  ' + colour + face + RESET + '  ' + colour + tick + ' ' + DIM + 'W' + (index + 1) + RESET + '  ' + mode + worker.name + DIM + count + RESET;
  const trailer = worker.done ? '' : (worker.sub || worker.status);
  const trailing = trailer ? '  ' + DIM + trailer + RESET : '';

  const barColumn = Math.min(PROGRESS_BAR_COLUMN, columns - PROGRESS_BAR_TEXT_WIDTH - 4);

  if (worker.target > 0 && barColumn >= MIN_BAR_COLUMN) {
    const remaining = columns - barColumn - PROGRESS_BAR_TEXT_WIDTH - 1;
    return fitToWidth(left, barColumn - 1) + moveToColumn(barColumn) + renderProgressBar(worker, colour) +
      fitToWidth(trailing, remaining) + ERASE_TO_LINE_END;
  }
  return fitToWidth(left + trailing, columns - 1);
}

module.exports = { renderWorkerLine };
