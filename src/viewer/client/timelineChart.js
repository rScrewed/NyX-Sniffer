import { byId, setHidden } from './dom.js';
import { barColor, prepareCanvas, drawAverageLine } from './chartColors.js';

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CANVAS_BACKGROUND = '#0e1116';

const MONTHLY = { barWidth: 18, gap: 4, topPadding: 26, chartHeight: 160, labelHeight: 36, minWidth: 300 };
const DAILY = { barWidth: 20, gap: 5, topPadding: 32, chartHeight: 150, labelHeight: 32 };

function labelPosition(barY, topPadding) {
  const preferred = barY - 3;
  return preferred > topPadding + 8 ? preferred : topPadding + 8;
}

function pluralMessages(count) {
  return count + ' message' + (count !== 1 ? 's' : '');
}

function isWeekend(weekday) {
  return weekday === 0 || weekday === 6;
}

function showTooltip(tooltip, event, offsetX, offsetY, maxRight) {
  tooltip.style.left = Math.min(event.clientX + offsetX, window.innerWidth - maxRight) + 'px';
  tooltip.style.top = (event.clientY - offsetY) + 'px';
  tooltip.classList.remove('hidden');
}

function drawMonthlyBars(context, buckets, max) {
  const { barWidth, topPadding, chartHeight } = MONTHLY;
  const step = barWidth + MONTHLY.gap;

  buckets.forEach((bucket, index) => {
    const x = index * step;
    const height = max === 0 ? 1 : Math.max(2, Math.round(bucket.count / max * chartHeight));
    const barY = topPadding + chartHeight - height;
    const year = bucket.month.slice(0, 4);
    const month = parseInt(bucket.month.slice(5, 7), 10) - 1;

    context.fillStyle = barColor(bucket.count, max);
    context.fillRect(x, barY, barWidth, height);

    if (bucket.count > 0) {
      context.fillStyle = bucket.count === max ? '#c4b5fd' : '#6b7280';
      context.font = '8px monospace';
      context.textAlign = 'center';
      context.fillText(bucket.count, x + barWidth / 2, labelPosition(barY, topPadding));
    }

    context.fillStyle = month === 0 ? '#a6acb8' : '#4b5563';
    context.font = (month === 0 ? 'bold ' : '') + '9px monospace';
    context.textAlign = 'center';
    context.fillText(MONTH_ABBREVIATIONS[month], x + barWidth / 2, topPadding + chartHeight + 14);

    if (month === 0) {
      context.fillStyle = '#a78bfa';
      context.font = 'bold 9px monospace';
      context.textAlign = 'center';
      context.fillText(year, x + barWidth / 2, topPadding + chartHeight + 26);
      context.strokeStyle = '#2a3347';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x - 2, topPadding);
      context.lineTo(x - 2, topPadding + chartHeight + 4);
      context.stroke();
    }
  });
}

function bindMonthlyInteraction(canvas, buckets, onSelect) {
  const step = MONTHLY.barWidth + MONTHLY.gap;
  const tooltip = byId('tl-tip');
  const indexAt = (event) => Math.floor((event.clientX - canvas.getBoundingClientRect().left) / step);

  canvas.style.cursor = 'pointer';
  canvas.addEventListener('mousemove', (event) => {
    const index = indexAt(event);
    if (tooltip && index >= 0 && index < buckets.length) {
      const bucket = buckets[index];
      tooltip.innerHTML = '<b>' + bucket.month + '</b>&nbsp;&nbsp;' + pluralMessages(bucket.count) +
        '<span class="tl-tip-cta">click to view daily breakdown →</span>';
      showTooltip(tooltip, event, 14, 52, 230);
    } else if (tooltip) {
      tooltip.classList.add('hidden');
    }
  });
  canvas.addEventListener('mouseleave', () => setHidden(tooltip, true));
  canvas.addEventListener('click', (event) => {
    const index = indexAt(event);
    if (index >= 0 && index < buckets.length) onSelect(buckets[index].month);
  });
}

function drawTimeline(buckets, onSelectMonth) {
  if (!buckets || !buckets.length) return;
  const canvas = byId('tl-canvas');
  if (!canvas || canvas.dataset.drawn) return;
  canvas.dataset.drawn = '1';

  const { barWidth, gap, topPadding, chartHeight, labelHeight } = MONTHLY;
  const width = Math.max(buckets.length * (barWidth + gap) + 8, MONTHLY.minWidth);
  const height = topPadding + chartHeight + labelHeight;
  const context = prepareCanvas(canvas, width, height);

  const max = Math.max(0, ...buckets.map((bucket) => bucket.count));
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const average = total / buckets.length;

  context.fillStyle = CANVAS_BACKGROUND;
  context.fillRect(0, 0, width, height);

  if (max > 0) {
    drawAverageLine(context, {
      width,
      y: topPadding + chartHeight - Math.round(average / max * chartHeight),
      label: 'avg ' + Math.round(average),
      labelColour: '#374151',
      font: '9px monospace',
    });
  }

  drawMonthlyBars(context, buckets, max);
  bindMonthlyInteraction(canvas, buckets, onSelectMonth);
}

function buildDailyBuckets(month, days) {
  const [year, monthNumber] = month.split('-').map((part) => parseInt(part, 10));
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const buckets = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const key = month + '-' + String(day).padStart(2, '0');
    buckets.push({ day, key, count: days[key] || 0, weekday: new Date(year, monthNumber - 1, day).getDay() });
  }
  return { buckets, year, monthNumber, daysInMonth };
}

function drawDailyBars(context, buckets, max, average) {
  const { barWidth, topPadding, chartHeight } = DAILY;
  const step = barWidth + DAILY.gap;

  buckets.forEach((bucket, index) => {
    const x = index * step;
    const height = max === 0 ? 2 : Math.max(2, Math.round(bucket.count / max * chartHeight));
    const barY = topPadding + chartHeight - height;

    context.fillStyle = barColor(bucket.count, max);
    context.fillRect(x, barY, barWidth, height);

    if (bucket.count > 0) {
      context.fillStyle = bucket.count === max ? '#c4b5fd' : (bucket.count > average ? '#a6acb8' : '#6b7280');
      context.font = (bucket.count === max ? 'bold ' : '') + '8px monospace';
      context.textAlign = 'center';
      context.fillText(bucket.count, x + barWidth / 2, labelPosition(barY, topPadding));
    }

    context.fillStyle = isWeekend(bucket.weekday) ? '#6b7280' : '#4b5563';
    context.font = '8px monospace';
    context.textAlign = 'center';
    context.fillText(bucket.day, x + barWidth / 2, topPadding + chartHeight + 13);

    if (bucket.weekday === 1 || bucket.weekday === 5) {
      context.fillStyle = '#374151';
      context.font = '7px monospace';
      context.fillText(WEEKDAYS[bucket.weekday], x + barWidth / 2, topPadding + chartHeight + 24);
    }
  });
}

function bindDailyInteraction(canvas, buckets) {
  const step = DAILY.barWidth + DAILY.gap;
  const tooltip = byId('tl-detail-tip');

  canvas.style.cursor = 'crosshair';
  canvas.onmousemove = (event) => {
    const index = Math.floor((event.clientX - canvas.getBoundingClientRect().left) / step);
    if (tooltip && index >= 0 && index < buckets.length) {
      const bucket = buckets[index];
      tooltip.textContent = bucket.key + '  ' + WEEKDAYS[bucket.weekday] + '  ·  ' + pluralMessages(bucket.count);
      showTooltip(tooltip, event, 14, 36, 220);
    } else if (tooltip) {
      tooltip.classList.add('hidden');
    }
  };
  canvas.onmouseleave = () => setHidden(tooltip, true);
}

function openMonthDetail(month, dailyCounts) {
  const overlay = byId('tl-detail-overlay');
  const title = byId('tl-detail-title');
  const canvas = byId('tl-detail-canvas');

  const { buckets, year, monthNumber, daysInMonth } = buildDailyBuckets(month, dailyCounts[month] || {});
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const max = Math.max(0, ...buckets.map((bucket) => bucket.count));
  const average = total / daysInMonth;
  const peak = buckets.reduce((best, bucket) => (bucket.count > best.count ? bucket : best), buckets[0]);

  if (!overlay || !canvas) return;

  title.innerHTML = MONTH_NAMES[monthNumber - 1] + ' ' + year +
    '<span class="tl-detail-meta">' +
    total + ' messages&nbsp;&nbsp;·&nbsp;&nbsp;avg ' + average.toFixed(1) + '/day' +
    (max > 0 ? '&nbsp;&nbsp;·&nbsp;&nbsp;peak ' + max + ' on ' + peak.key : '') +
    '</span>';

  const { barWidth, gap, topPadding, chartHeight, labelHeight } = DAILY;
  const step = barWidth + gap;
  const width = buckets.length * step + 8;
  const height = topPadding + chartHeight + labelHeight;
  const context = prepareCanvas(canvas, width, height);

  context.fillStyle = CANVAS_BACKGROUND;
  context.fillRect(0, 0, width, height);

  buckets.forEach((bucket, index) => {
    if (!isWeekend(bucket.weekday)) return;
    context.fillStyle = 'rgba(167,139,250,.04)';
    context.fillRect(index * step, topPadding, barWidth, chartHeight);
  });

  if (max > 0 && average > 0) {
    drawAverageLine(context, {
      width,
      y: topPadding + chartHeight - Math.round(average / max * chartHeight),
      label: 'avg ' + average.toFixed(1),
      labelColour: '#4b5563',
      font: '8px monospace',
    });
  }

  drawDailyBars(context, buckets, max, average);
  bindDailyInteraction(canvas, buckets);
  overlay.classList.remove('hidden');
}

function closeDetail() {
  setHidden(byId('tl-detail-overlay'), true);
  setHidden(byId('tl-detail-tip'), true);
}

export function initTimeline({ buckets, dailyCounts }) {
  const overlay = byId('tl-detail-overlay');
  const closeButton = byId('tl-detail-cls');

  if (closeButton) closeButton.addEventListener('click', closeDetail);
  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeDetail();
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDetail();
  });

  return { draw: () => drawTimeline(buckets, (month) => openMonthDetail(month, dailyCounts)) };
}
