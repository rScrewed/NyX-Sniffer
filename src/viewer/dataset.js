'use strict';

const { wordlists, countIntelTags, filterByCategory } = require('./intel/tagging');
const { computeWordWall } = require('./intel/wordWall');

const PAGE_SIZE = 500;
const WORD_WALL_SIZE = 70;
const DEVICE_CATEGORY = 'device';

const derivedCache = new WeakMap();

function isKnownCategory(category) {
  return Boolean(wordlists[category]) || category === DEVICE_CATEGORY;
}

function dailyCounts(items) {
  const daily = {};
  for (const item of items) {
    if (!item.timestamp) continue;
    const date = new Date(item.timestamp);
    if (isNaN(date.getTime())) continue;
    const month = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    const day = month + '-' + String(date.getDate()).padStart(2, '0');
    if (!daily[month]) daily[month] = {};
    daily[month][day] = (daily[month][day] || 0) + 1;
  }
  return daily;
}

function countFiles(items) {
  return items.reduce((sum, item) => sum + (item.files ? item.files.length : 0), 0);
}

function deriveDataset(data, items, isMentions) {
  let derived = derivedCache.get(data);
  if (derived) return derived;

  derived = {
    intelCounts: countIntelTags(items),
    dailyCounts: dailyCounts(items),
    fileCount: countFiles(items),
    wordWall: isMentions ? [] : computeWordWall(data.messages || [], WORD_WALL_SIZE),
  };
  derivedCache.set(data, derived);
  return derived;
}

function matchesQuery(item, query) {
  return (item.content || '').toLowerCase().includes(query) ||
    (item.authorTag || item.senderTag || '').toLowerCase().includes(query);
}

function selectItems(items, { intelFilter, query }) {
  let selected = items;
  if (intelFilter && isKnownCategory(intelFilter)) selected = filterByCategory(selected, intelFilter);

  const normalizedQuery = (query || '').trim().toLowerCase();
  if (normalizedQuery) selected = selected.filter((item) => matchesQuery(item, normalizedQuery));
  return selected;
}

function paginate(items, requestedPage) {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.max(0, Math.min(requestedPage || 0, totalPages - 1));
  const startIndex = page * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalCount);
  return { items: items.slice(startIndex, endIndex), page, totalPages, totalCount, startIndex, endIndex };
}

module.exports = { deriveDataset, selectItems, paginate, countFiles };
