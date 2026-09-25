'use strict';

const { delay } = require('../shared/time');

const ESC = '\x1b[';
const RESET = ESC + '0m';
const BOLD = ESC + '1m';

const foreground = ([r, g, b]) => `${ESC}38;2;${r};${g};${b}m`;
const background = ([r, g, b]) => `${ESC}48;2;${r};${g};${b}m`;

const GRADIENT_STOPS = [
  [140, 40, 225],
  [136, 88, 216],
  [120, 104, 248],
  [120, 136, 248],
  [120, 184, 216],
  [130, 225, 240],
];
const GRADIENT_LOOP = [...GRADIENT_STOPS, ...GRADIENT_STOPS.slice(1, -1).reverse()];
const HEAD_COLOUR = [190, 240, 255];
const EMPTY_COLOUR = [62, 54, 96];
const EMPTY_BACKGROUND = [24, 20, 42];
const LABEL_COLOUR = [150, 150, 205];
const PARTIAL_BLOCKS = ' ▏▎▍▌▋▊▉';

const DISPLAY_LINES = 3;
const DEFAULT_WIDTH = 32;
const DEFAULT_FPS = 15;
const DEFAULT_GAP = 12;
const FINISH_TIMEOUT_MS = 1500;
const FINISH_HOLD_MS = 700;

const blend = (from, to, amount) => from.map((value, index) => Math.round(value + (to[index] - value) * amount));

function gradientAt(position) {
  const length = GRADIENT_LOOP.length;
  const wrapped = ((position % length) + length) % length;
  const index = Math.floor(wrapped);
  return blend(GRADIENT_LOOP[index], GRADIENT_LOOP[(index + 1) % length], wrapped - index);
}

function createProgressLoader(total, options = {}) {
  const output = process.stdout;
  const width = options.width || DEFAULT_WIDTH;
  const indent = ' '.repeat(options.indent ?? 2);
  const fps = options.fps || DEFAULT_FPS;
  const interactive = Boolean(output.isTTY) && !process.env.NO_COLOR;
  const gap = Math.max(1, Math.min(options.gap ?? DEFAULT_GAP, Math.max(0, (output.rows || 40) - DISPLAY_LINES - 2)));

  let completed = 0;
  let shown = 0;
  let frame = 0;
  let label = '';
  let timer = null;

  const goal = () => (total ? completed / total : 1);

  function renderBar() {
    const filled = shown * width;
    let bar = foreground(EMPTY_COLOUR) + '▐' + RESET;

    for (let i = 0; i < width; i++) {
      const distance = filled - i;
      if (distance <= 0) {
        bar += foreground(EMPTY_COLOUR) + '░' + RESET;
        continue;
      }
      let colour = gradientAt(i * 0.35 - frame * 0.25);
      if (distance < 4) colour = blend(colour, HEAD_COLOUR, (4 - distance) / 4);
      bar += distance >= 1
        ? foreground(colour) + '█' + RESET
        : background(EMPTY_BACKGROUND) + foreground(colour) + PARTIAL_BLOCKS[Math.floor(distance * 8)] + RESET;
    }
    return bar + foreground(EMPTY_COLOUR) + '▌' + RESET;
  }

  function draw() {
    frame++;
    shown += (goal() - shown) * 0.25;
    if (Math.abs(goal() - shown) < 0.002) shown = goal();

    const lines = [
      indent + renderBar() + '  ' + BOLD + foreground(HEAD_COLOUR) + `${completed}/${total}` + RESET,
      '',
      indent + foreground(LABEL_COLOUR) + label + RESET,
    ];
    output.write(`${ESC}${DISPLAY_LINES}A\r` + lines.map((line) => ESC + '2K' + line).join('\n') + '\n');
  }

  const onInterrupt = () => {
    output.write(ESC + '?25h');
    process.exit(130);
  };

  function start() {
    process.on('SIGINT', onInterrupt);
    output.write(ESC + '?25l' + '\n'.repeat(gap + DISPLAY_LINES));
    draw();
    timer = setInterval(draw, 1000 / fps);
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    process.removeListener('SIGINT', onInterrupt);
    output.write(
      `${ESC}${DISPLAY_LINES}A\r` +
      (ESC + '2K\n').repeat(DISPLAY_LINES) +
      `${ESC}${DISPLAY_LINES}A\r` +
      (gap ? `${ESC}${gap}A\r` : '') +
      ESC + '?25h',
    );
  }

  function update(count, text) {
    completed = Math.max(0, Math.min(total, count));
    if (text !== undefined && text !== null) label = text;
    if (!interactive) output.write(`  ${completed}/${total}  ${label}\n`);
  }

  async function finish(text = 'all workers checked') {
    if (!timer) return;
    completed = total;
    label = text;
    const startedAt = Date.now();
    while (shown < 1 && Date.now() - startedAt < FINISH_TIMEOUT_MS) await delay(30);
    await delay(FINISH_HOLD_MS);
    stop();
  }

  if (interactive) start();
  return { update, finish, stop };
}

module.exports = { createProgressLoader };
