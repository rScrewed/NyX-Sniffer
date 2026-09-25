'use strict';

const net = require('net');
const { renderWorkerLine } = require('./workerLine');
const { fitToWidth } = require('./textFit');
const { HIDE_CURSOR, SHOW_CURSOR, CLEAR_SCREEN, ERASE_TO_LINE_END, RESET, BOLD, DIM, moveCursor } = require('./ansi');

const REFRESH_MS = 150;
const EXIT_DELAY_MS = 800;
const DEFAULT_COLUMNS = 100;
const DEFAULT_ROWS = 30;

function buildLines(state, columns, rows) {
  const lines = ['  ' + BOLD + 'NyX-Sniffer' + RESET + DIM + '  ·  workers' + RESET];
  if (state.summary) lines.push(state.summary);
  if (state.progress) lines.push('  ' + DIM + state.progress + RESET);
  lines.push('');

  const workers = state.workers || [];
  const room = Math.max(0, rows - lines.length - 1);
  const shown = workers.length > room ? Math.max(0, room - 1) : workers.length;

  workers.slice(0, shown).forEach((worker, index) => lines.push(renderWorkerLine(worker, index, columns)));
  if (shown < workers.length) lines.push('  ' + DIM + '+' + (workers.length - shown) + ' more workers (enlarge this window)' + RESET);
  return lines;
}

function renderDisplay(state, columns, rows) {
  return CLEAR_SCREEN + buildLines(state, columns, rows)
    .map((line, index) => moveCursor(index + 1, 1) + fitToWidth(line, columns - 1) + ERASE_TO_LINE_END)
    .join('');
}

function runWorkerDisplay(address) {
  if (!address) process.exit(1);

  let state = { workers: [], summary: null, progress: null };
  let timer = null;
  let buffer = '';

  const draw = () => {
    process.stdout.write(renderDisplay(state, process.stdout.columns || DEFAULT_COLUMNS, process.stdout.rows || DEFAULT_ROWS));
  };

  process.stdout.write(HIDE_CURSOR);
  process.on('exit', () => process.stdout.write(SHOW_CURSOR + '\n'));
  process.on('SIGINT', () => process.exit(0));
  process.stdout.on('resize', draw);

  const client = net.createConnection({ path: address }, () => {
    timer = setInterval(draw, REFRESH_MS);
  });

  client.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        if (message.type === 'state') state = message;
        else if (message.type === 'exit') client.destroy();
      } catch {}
    }
  });

  client.on('close', () => {
    if (timer) clearInterval(timer);
    draw();
    setTimeout(() => process.exit(0), EXIT_DELAY_MS);
  });
  client.on('error', () => process.exit(1));
}

module.exports = { runWorkerDisplay, renderDisplay };
