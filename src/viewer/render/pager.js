'use strict';

const { escapeHtml } = require('../html');

function renderPager({ page, totalPages, startIndex, endIndex, totalCount, intelFilter, query }) {
  const trimmedQuery = (query || '').trim();
  const filtered = Boolean(intelFilter || trimmedQuery);
  if (totalPages <= 1 && !filtered) return '';

  const queryString = (dropped) => {
    const parts = [];
    if (intelFilter && dropped !== 'intel') parts.push('intel=' + encodeURIComponent(intelFilter));
    if (trimmedQuery && dropped !== 'q') parts.push('q=' + encodeURIComponent(trimmedQuery));
    return parts;
  };
  const pageLink = (target) => '/?page=' + target + queryString().map((part) => '&' + part).join('');
  const clearLink = (dropped) => {
    const parts = queryString(dropped);
    return '/?page=0' + (parts.length ? '&' + parts.join('&') : '');
  };

  const previous = page > 0
    ? '<a class="pbtn" href="' + pageLink(page - 1) + '">‹ prev</a>'
    : '<span class="pbtn disabled">‹ prev</span>';
  const next = page < totalPages - 1
    ? '<a class="pbtn" href="' + pageLink(page + 1) + '">next ›</a>'
    : '<span class="pbtn disabled">next ›</span>';

  const clearButton = (label, href) => '  <a class="pbtn" href="' + href + '" style="border-color:#f87171;color:#f87171">✕ clear ' + label + '</a>';
  const clears = (intelFilter ? clearButton(escapeHtml(intelFilter), clearLink('intel')) : '') +
    (trimmedQuery ? clearButton('search', clearLink('q')) : '');

  return '<div class="pager">' + previous +
    '<span class="pinfo">page ' + (page + 1) + ' of ' + totalPages +
    '  ·  ' + (totalCount ? startIndex + 1 : 0) + '–' + endIndex + ' of ' + totalCount + (filtered ? ' matching' : '') + '</span>' +
    next + clears + '</div>';
}

module.exports = { renderPager };
