'use strict';

const terminal = require('../terminal');
const { describeBadge } = require('../discord/badges');
const { describeAccountAge, MONTH_NAMES } = require('../discord/snowflake');
const { stripEmoji } = require('../shared/text');

const MAX_LISTED_SERVERS = 5;
const MAX_BIO_LENGTH = 80;

function formatYearMonth(iso) {
  const date = new Date(iso);
  return date.getFullYear() + ' ' + MONTH_NAMES[date.getMonth()];
}

function field(label, value) {
  terminal.log('  ' + label.padEnd(21) + value);
}

function printMutualServers(profile, guilds) {
  field('mutual servers:', profile.mutualGuilds.length);
  const listed = profile.mutualGuilds.slice(0, MAX_LISTED_SERVERS);
  for (const mutual of listed) {
    const guild = guilds.find((candidate) => candidate.id === mutual.id);
    const name = guild ? (stripEmoji(guild.name) || mutual.id) : mutual.id;
    terminal.log('    ·  ' + name + (mutual.nick ? '  (nick: ' + mutual.nick + ')' : ''));
  }
  const remaining = profile.mutualGuilds.length - listed.length;
  if (remaining > 0) terminal.log('    &  ' + remaining + ' more');
}

function printTargetProfile({ profile, targetUserId, guilds }) {
  terminal.log('  target identified:  ' + profile.tag);
  if (profile.displayName && profile.displayName !== profile.username) field('display name:', profile.displayName);
  field('username:', profile.username);
  if (profile.legacyUsername) field('legacy username:', profile.legacyUsername);
  field('joined discord:', describeAccountAge(targetUserId));
  if (profile.pronouns) field('pronouns:', profile.pronouns);
  if (profile.bio) field('bio:', profile.bio.replace(/\n/g, ' ').slice(0, MAX_BIO_LENGTH));
  if (profile.premiumSince) field('nitro since:', formatYearMonth(profile.premiumSince));
  if (profile.premiumGuildSince) field('boosting since:', formatYearMonth(profile.premiumGuildSince));
  if (profile.badges && profile.badges.length > 0) field('badges:', profile.badges.map(describeBadge).join('  ·  '));
  if (profile.mutualFriendsCount !== null) field('mutual friends:', profile.mutualFriendsCount);
  if (profile.mutualGuilds && profile.mutualGuilds.length > 0) printMutualServers(profile, guilds);
  for (const account of profile.connectedAccounts || []) {
    terminal.log('  ' + (account.label + ':').padEnd(21) + account.name);
  }
}

module.exports = { printTargetProfile };
