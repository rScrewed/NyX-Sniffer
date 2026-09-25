'use strict';

const { escapeHtml } = require('../html');

const HEATMAP_PEAKS = 5;
const WORD_WALL_PALETTE = ['#a78bfa', '#7dd3fc', '#f472b6', '#4ade80', '#facc15', '#fb923c', '#38bdf8', '#f87171', '#c084fc', '#34d399'];
const WORD_WALL_MIN_SIZE = 13;
const WORD_WALL_SIZE_RANGE = 37;
const WORD_WALL_MAX_DELAY_MS = 600;
const WORD_WALL_STAGGER_MS = 14;

function renderHeatmapPanel(heatmap) {
  if (!heatmap || !heatmap.buckets || !heatmap.buckets.length) return null;

  const maxCount = Math.max(...heatmap.buckets.map((bucket) => bucket.count), 1);
  const peakHours = new Set([...heatmap.buckets].sort((a, b) => b.count - a.count).slice(0, HEATMAP_PEAKS).map((bucket) => bucket.startHour));

  const rows = heatmap.buckets.map((bucket) => {
    const percent = Math.round(bucket.count / maxCount * 100);
    const peakClass = peakHours.has(bucket.startHour) ? ' hm-top' : '';
    return '<div class="hm-row"><span class="hm-lbl">' + escapeHtml(bucket.label) + '</span>' +
      '<div class="hm-bar-wrap"><div class="hm-bar' + peakClass + '" style="width:' + percent + '%"></div>' +
      '<span class="hm-cnt">' + bucket.count + '</span></div></div>';
  }).join('');

  return {
    button: '<button class="fbtn" data-main="heatmap">Heatmap</button>',
    html: '<div id="heatmap-section" class="hidden"><div class="hm-wrap">' +
      '<div class="hm-meta"><span>timezone · ' + escapeHtml(heatmap.timezone) + '</span>' +
      '<span>' + heatmap.total + ' messages</span></div>' +
      '<div class="hm-chart">' + rows + '</div></div></div>',
  };
}

function renderTimelinePanel(timeline) {
  if (!timeline || !timeline.buckets || !timeline.buckets.length) return null;

  const first = timeline.buckets[0].month;
  const last = timeline.buckets[timeline.buckets.length - 1].month;

  return {
    button: '<button class="fbtn" data-main="timeline">Timeline</button>',
    html: '<div id="timeline-section" class="hidden">' +
      '<div class="tl-meta">' +
      '<span>activity timeline  ·  ' + escapeHtml(first) + ' → ' + escapeHtml(last) + '</span>' +
      '<span>' + timeline.buckets.length + ' months  ·  ' + timeline.total + ' messages</span>' +
      '</div>' +
      '<div class="tl-scroll"><canvas id="tl-canvas"></canvas></div>' +
      '</div>',
  };
}

function renderWordWallPanel(words) {
  if (!words.length) return null;

  const maxCount = words[0].count;
  const minCount = words[words.length - 1].count;

  const spans = words.map((entry, index) => {
    const weight = maxCount === minCount ? 1 : (entry.count - minCount) / (maxCount - minCount);
    const size = Math.round(WORD_WALL_MIN_SIZE + Math.sqrt(weight) * WORD_WALL_SIZE_RANGE);
    const colour = WORD_WALL_PALETTE[index % WORD_WALL_PALETTE.length];
    const fontWeight = weight > 0.6 ? 700 : weight > 0.25 ? 600 : 500;
    const delay = Math.min(index * WORD_WALL_STAGGER_MS, WORD_WALL_MAX_DELAY_MS);
    return '<span class="ww-word" style="font-size:' + size + 'px;color:' + colour + ';font-weight:' + fontWeight +
      ';animation-delay:' + delay + 'ms" data-word="' + escapeHtml(entry.word) + '" data-count="' + entry.count + '">' +
      escapeHtml(entry.word) + '</span>';
  }).join('');

  return {
    button: '<button class="fbtn" data-main="words">Word Wall</button>',
    html: '<div id="words-section" class="hidden"><div class="ww-wrap">' +
      '<div class="ww-meta">' +
      '<span>word wall  ·  ' + words.length + ' unique terms</span>' +
      '<span>top word: “' + escapeHtml(words[0].word) + '” × ' + words[0].count + '</span>' +
      '</div>' +
      '<div class="ww-cloud" id="ww-cloud">' + spans + '</div>' +
      '<div class="ww-hint">click a word to filter messages containing it</div>' +
      '<div class="ww-tip hidden" id="ww-tip"></div>' +
      '</div></div>',
  };
}

module.exports = { renderHeatmapPanel, renderTimelinePanel, renderWordWallPanel };
