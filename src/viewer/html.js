'use strict';

const path = require('path');

const AVATAR_CDN = 'https://cdn.discordapp.com';
const DEFAULT_AVATAR_COUNT = 6;
const LEGACY_AVATAR_COUNT = 5;

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function avatarUrl(userId, avatarHash, discriminator) {
  if (avatarHash) {
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return AVATAR_CDN + '/avatars/' + userId + '/' + avatarHash + '.' + extension + '?size=128';
  }

  let index;
  if (discriminator && discriminator !== '0') {
    index = parseInt(discriminator, 10) % LEGACY_AVATAR_COUNT;
  } else {
    try {
      index = Number((BigInt(userId) >> 22n) % BigInt(DEFAULT_AVATAR_COUNT));
    } catch {
      index = 0;
    }
  }
  return AVATAR_CDN + '/embed/avatars/' + index + '.png';
}

function formatTimestamp(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const pad = (number) => String(number).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    '  ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function fileHref(localPath) {
  if (!localPath) return null;
  const normalized = localPath.replace(/\\/g, '/');
  const marker = '/files/';
  const index = normalized.lastIndexOf(marker);
  if (index === -1) return marker + encodeURIComponent(path.basename(normalized));
  return marker + normalized.slice(index + marker.length).split('/').map(encodeURIComponent).join('/');
}

function serializeForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/[\u2028\u2029]/g, (character) => '\\u' + character.charCodeAt(0).toString(16));
}

module.exports = { escapeHtml, avatarUrl, formatTimestamp, fileHref, serializeForScript };
