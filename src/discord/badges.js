'use strict';

const BADGE_NAMES = {
  premium: 'Nitro',
  legacy_username: 'Legacy Username',
  verified_developer: 'Verified Dev',
  active_developer: 'Active Dev',
  bug_hunter_level_1: 'Bug Hunter',
  bug_hunter_level_2: 'Bug Hunter Gold',
  partner: 'Partner',
  staff: 'Staff',
  certified_moderator: 'Certified Mod',
  hypesquad_house_1: 'HypeSquad Bravery',
  hypesquad_house_2: 'HypeSquad Brilliance',
  hypesquad_house_3: 'HypeSquad Balance',
  quest_completed: 'Quest',
  orb_profile_badge: 'Orb',
};

const COMPACT_NAMES = {
  hypesquad_house_1: 'Bravery',
  hypesquad_house_2: 'Brilliance',
  hypesquad_house_3: 'Balance',
};

function describeBadge(id, { compact = false } = {}) {
  const boosterLevel = id.match(/guild_booster_lvl(\d+)/);
  if (boosterLevel) return 'Booster L' + boosterLevel[1];

  const tenure = id.match(/premium_tenure_(\d+)_month/);
  if (tenure) return 'Nitro ' + tenure[1] + 'mo';

  if (compact && COMPACT_NAMES[id]) return COMPACT_NAMES[id];
  return BADGE_NAMES[id] || id.replace(/_/g, ' ');
}

module.exports = { describeBadge };
