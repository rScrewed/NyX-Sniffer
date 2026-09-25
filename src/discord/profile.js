'use strict';

const { formatUserTag } = require('./user');

const PLATFORM_LABELS = {
  steam: 'Steam', github: 'GitHub', twitter: 'Twitter', twitch: 'Twitch',
  youtube: 'YouTube', spotify: 'Spotify', reddit: 'Reddit', xbox: 'Xbox',
  playstation: 'PlayStation', battlenet: 'Battle.net', epicgames: 'Epic Games',
  leagueoflegends: 'League', tiktok: 'TikTok', roblox: 'Roblox',
  domain: 'Domain', ebay: 'eBay', paypal: 'PayPal', instagram: 'Instagram',
};

const PROFILE_QUERY = '?with_mutual_guilds=true&with_mutual_friends_count=true&with_mutual_friends=true';

function describeConnectedAccount(account) {
  return {
    type: account.type,
    label: PLATFORM_LABELS[account.type] || account.type,
    name: account.name,
    id: account.id || null,
    verified: !!account.verified,
  };
}

function fromFullProfile(data) {
  const user = data.user;
  const profile = data.user_profile || {};
  return {
    id: user.id,
    tag: formatUserTag(user),
    displayName: user.global_name || null,
    username: user.username,
    avatar: user.avatar || null,
    banner: user.banner || null,
    bio: profile.bio || null,
    pronouns: profile.pronouns || null,
    badges: (data.badges || []).map((badge) => badge.id).filter(Boolean),
    connectedAccounts: (data.connected_accounts || []).map(describeConnectedAccount),
    premiumSince: data.premium_since || null,
    premiumGuildSince: data.premium_guild_since || null,
    premiumType: data.premium_type ?? user.premium_type ?? null,
    mutualFriendsCount: data.mutual_friends_count ?? (data.mutual_friends ? data.mutual_friends.length : null),
    mutualGuilds: data.mutual_guilds || [],
    legacyUsername: data.legacy_username || null,
  };
}

function fromBareUser(user) {
  return {
    id: user.id,
    tag: formatUserTag(user),
    displayName: user.global_name || null,
    username: user.username,
    avatar: user.avatar || null,
    banner: user.banner || null,
    bio: null,
    pronouns: null,
    badges: [],
    connectedAccounts: [],
    premiumSince: null,
    premiumGuildSince: null,
    premiumType: null,
    mutualFriendsCount: null,
    mutualGuilds: [],
    legacyUsername: null,
  };
}

async function resolveProfile(client, userId) {
  const full = await client.requestQuietly('/users/' + userId + '/profile' + PROFILE_QUERY);
  if (full && full.user) return fromFullProfile(full);

  const bare = await client.requestQuietly('/users/' + userId);
  if (bare && bare.username) return fromBareUser(bare);

  return null;
}

module.exports = { resolveProfile };
