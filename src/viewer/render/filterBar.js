'use strict';

const { escapeHtml } = require('../html');
const { FILTER_CATEGORIES } = require('../intel/tagging');

const FILE_SUBFILTERS = [
  ['all', 'All files'],
  ['image', 'Images'],
  ['video', 'Videos'],
  ['audio', 'Audio'],
  ['other', 'Other'],
];

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function renderIntelButtons(counts) {
  return FILTER_CATEGORIES.map((category) => {
    const count = counts[category] || 0;
    return '<button class="fbtn' + (count ? '' : ' fbtn-zero') + '" data-intel="' + category + '">' +
      capitalize(category) + '<span class="cnt">' + (count ? ' ' + count : '') + '</span></button>';
  }).join('\n    ');
}

function renderFilterBar({ tabs, query, totalCount, intelCounts }) {
  const searchPlaceholder = 'search this page…  (enter = search all ' + totalCount + ')';
  const subFilters = FILE_SUBFILTERS
    .map(([key, label], index) => '<button class="fbtn' + (index === 0 ? ' active' : '') + '" data-sub="' + key + '">' + label + '</button>')
    .join('\n    ');

  return [
    '<div class="filters">',
    '  <div class="filter-row">',
    '    <button class="fbtn active" data-main="all">All</button>',
    '    <button class="fbtn" data-main="messages">Messages</button>',
    '    <button class="fbtn" data-main="files">Files</button>',
    '    ' + tabs.join(''),
    '    <div class="f-sep"></div>',
    '    <input class="search-input" id="msg-search" type="text" placeholder="' + searchPlaceholder + '" value="' + escapeHtml(query || '') + '" autocomplete="off" spellcheck="false">',
    '    <button class="fbtn" id="intel-toggle" title="toggle OSINT filters">OSINT</button>',
    '    <button class="fbtn" id="terms-toggle" title="edit wordlists">⚙</button>',
    '  </div>',
    '  <div class="sub-row" id="sub-row">',
    '    ' + subFilters,
    '  </div>',
    '  <div class="intel-panel intel-hidden" id="intel-panel">',
    '    ' + renderIntelButtons(intelCounts),
    '  </div>',
    '</div>',
  ].join('\n');
}

module.exports = { renderFilterBar };
