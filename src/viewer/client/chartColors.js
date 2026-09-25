const EMPTY_BAR = '#1a2029';
const LOW = [0x2d, 0x1f, 0x5e];
const HIGH = [0xa7, 0x8b, 0xfa];

const lerp = (from, to, amount) => Math.round(from + (to - from) * amount);

export function barColor(count, max) {
  if (count === 0) return EMPTY_BAR;
  const amount = max === 0 ? 0 : count / max;
  return 'rgb(' + lerp(LOW[0], HIGH[0], amount) + ',' + lerp(LOW[1], HIGH[1], amount) + ',' + lerp(LOW[2], HIGH[2], amount) + ')';
}

export function prepareCanvas(canvas, width, height) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);
  return context;
}

export function drawAverageLine(context, { width, y, label, labelColour, font }) {
  context.strokeStyle = '#2a3347';
  context.lineWidth = 1;
  context.setLineDash([2, 4]);
  context.beginPath();
  context.moveTo(0, y);
  context.lineTo(width, y);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = labelColour;
  context.font = font;
  context.textAlign = 'right';
  context.fillText(label, width - 2, y - 3);
}
