'use strict';

const EMOJI_PATTERN = /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{FE00}-\u{FEFF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;
const INVISIBLE_PATTERN = /[\u200B-\u200D\uFEFF]/g;
const MAX_FILE_NAME_LENGTH = 64;

function stripEmoji(text) {
  if (!text) return text;
  return text.replace(EMOJI_PATTERN, '').replace(INVISIBLE_PATTERN, '').trim();
}

function toSafeName(text) {
  if (!text) return 'unknown';
  return text
    .replace(EMOJI_PATTERN, '')
    .replace(INVISIBLE_PATTERN, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase()
    .slice(0, MAX_FILE_NAME_LENGTH) || 'unknown';
}

module.exports = { stripEmoji, toSafeName };
