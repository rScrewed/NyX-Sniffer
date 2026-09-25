'use strict';

const wordlists = require('./wordlists');
const { messageSources } = require('./deviceSource');

const FILTER_CATEGORIES = [
  'economics', 'identity', 'social', 'activities', 'technical', 'criminal',
  'physical', 'credentials', 'places', 'bannable', 'device',
];
const DEVICE_TAG = 'device';
const MAX_CACHED_DISABLED_SETS = 8;

const tagCache = new WeakMap();
const disabledSetRegexes = new Map();
let defaultRegexes = null;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termPattern(term) {
  const start = /^\w/.test(term) ? '\\b' : '';
  const end = /\w$/.test(term) ? '\\b' : '';
  return start + escapeRegExp(term) + end;
}

function buildCategoryRegexes(disabledKeys) {
  const regexes = {};
  for (const [category, allTerms] of Object.entries(wordlists)) {
    const terms = disabledKeys ? allTerms.filter((term) => !disabledKeys.has(category + ':' + term)) : allTerms;
    if (!terms.length) continue;
    const pattern = terms
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(termPattern)
      .join('|');
    regexes[category] = new RegExp(pattern, 'i');
  }
  return regexes;
}

function matchingCategories(text, regexes) {
  if (!text || !text.trim()) return [];
  return Object.entries(regexes).filter(([, regex]) => regex.test(text)).map(([category]) => category);
}

function getIntelTags(message) {
  let tags = tagCache.get(message);
  if (tags !== undefined) return tags;

  if (!defaultRegexes) defaultRegexes = buildCategoryRegexes();
  const categories = matchingCategories(message.content || '', defaultRegexes);
  if (messageSources(message).length) categories.push(DEVICE_TAG);

  tags = categories.join(' ');
  tagCache.set(message, tags);
  return tags;
}

function hasCategory(message, category) {
  return getIntelTags(message).split(' ').includes(category);
}

function filterByCategory(messages, category) {
  return messages.filter((message) => hasCategory(message, category));
}

function countIntelTags(messages) {
  const counts = {};
  for (const message of messages) {
    const tags = getIntelTags(message);
    if (!tags) continue;
    for (const category of tags.split(' ')) counts[category] = (counts[category] || 0) + 1;
  }
  return counts;
}

function regexesWithout(disabledKeys) {
  const cacheKey = [...disabledKeys].sort().join('\n');
  let regexes = disabledSetRegexes.get(cacheKey);
  if (!regexes) {
    regexes = buildCategoryRegexes(disabledKeys);
    if (disabledSetRegexes.size >= MAX_CACHED_DISABLED_SETS) {
      disabledSetRegexes.delete(disabledSetRegexes.keys().next().value);
    }
    disabledSetRegexes.set(cacheKey, regexes);
  }
  return regexes;
}

function countIntelTagsWithout(messages, disabledKeys) {
  const regexes = regexesWithout(new Set(disabledKeys));
  const counts = {};

  for (const message of messages) {
    for (const category of matchingCategories(message.content || '', regexes)) {
      counts[category] = (counts[category] || 0) + 1;
    }
    if (hasCategory(message, DEVICE_TAG)) counts[DEVICE_TAG] = (counts[DEVICE_TAG] || 0) + 1;
  }
  return counts;
}

module.exports = {
  FILTER_CATEGORIES,
  wordlists,
  getIntelTags,
  filterByCategory,
  countIntelTags,
  countIntelTagsWithout,
};
