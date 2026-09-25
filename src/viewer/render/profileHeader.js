'use strict';

const { escapeHtml, avatarUrl } = require('../html');
const { describeBadge } = require('../../discord/badges');

const MAX_BIO_LENGTH = 120;

const ACCOUNT_URLS = {
  github: (name) => 'https://github.com/' + name,
  twitter: (name) => 'https://x.com/' + name,
  twitch: (name) => 'https://twitch.tv/' + name,
  youtube: (name) => 'https://youtube.com/@' + name,
  reddit: (name) => 'https://reddit.com/u/' + name,
  tiktok: (name) => 'https://tiktok.com/@' + name,
  instagram: (name) => 'https://instagram.com/' + name,
  steam: (name, id) => (id ? 'https://steamcommunity.com/profiles/' + id : 'https://steamcommunity.com/id/' + name),
  spotify: (name, id) => (id ? 'https://open.spotify.com/user/' + id : null),
  roblox: (name, id) => (id ? 'https://www.roblox.com/users/' + id + '/profile' : null),
  domain: (name) => (name.startsWith('http') ? name : 'https://' + name),
  ebay: (name) => 'https://www.ebay.com/usr/' + name,
};

function accountUrl(account) {
  const build = ACCOUNT_URLS[account.type];
  return build ? build(account.name || '', account.id || '') : null;
}

function renderBadges(badges) {
  const chips = badges.map((id) => '<span class="badge-chip">' + escapeHtml(describeBadge(id, { compact: true })) + '</span>').join('');
  return '<div class="badge-list">' + chips + '</div>';
}

function renderMutualServers(guilds) {
  const chips = guilds.map((guild) => {
    const name = guild.name || guild.id;
    const nick = guild.nick ? ' <span class="mg-nick">(' + escapeHtml(guild.nick) + ')</span>' : '';
    return '<span class="mg-chip">' + escapeHtml(name) + nick + '</span>';
  }).join('');
  return '<div class="mg-label">Mutual Servers</div><div class="ca-list">' + chips + '</div>';
}

function renderConnectedAccounts(accounts) {
  const chips = accounts.map((account) => {
    const url = accountUrl(account);
    const inner = escapeHtml(account.label) + ' · ' + escapeHtml(account.name);
    return url
      ? '<a class="ca-chip" href="' + escapeHtml(url) + '" target="_blank" rel="noreferrer">' + inner + '</a>'
      : '<span class="ca-chip">' + inner + '</span>';
  }).join('');
  return '<div class="ca-list">' + chips + '</div>';
}

function renderProfileDetails(profile) {
  let html = '';
  if (profile.pronouns) html += '<div class="prof-line">' + escapeHtml(profile.pronouns) + '</div>';
  if (profile.bio) html += '<div class="prof-line prof-bio">' + escapeHtml(profile.bio.replace(/\n/g, ' ').slice(0, MAX_BIO_LENGTH)) + '</div>';
  if (profile.badges && profile.badges.length) html += renderBadges(profile.badges);
  if (profile.mutualGuilds && profile.mutualGuilds.length) html += renderMutualServers(profile.mutualGuilds);
  if (profile.connectedAccounts && profile.connectedAccounts.length) html += renderConnectedAccounts(profile.connectedAccounts);
  return html;
}

function targetAvatarUrl(data) {
  return avatarUrl(data.userId, data.targetAvatar || null, null);
}

function renderTargetBlock(data, profile) {
  return '<div class="target"><img src="' + escapeHtml(targetAvatarUrl(data)) + '" alt=""><div>' +
    '<h1><span class="at">▸</span> ' + escapeHtml(data.username || '—') + '</h1>' +
    '<div class="id"><b>ID</b> ' + escapeHtml(data.userId) + '</div>' +
    renderProfileDetails(profile || {}) + '</div></div>';
}

module.exports = { renderTargetBlock, targetAvatarUrl };
