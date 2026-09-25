'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveProfile } = require('../../src/discord/profile');

const user = { id: '9', username: 'kit', discriminator: '0', global_name: 'Kit', avatar: 'abc' };

test('builds a full profile when the profile endpoint answers', async () => {
  const client = {
    requestQuietly: async (path) => (path.includes('/profile')
      ? {
        user,
        user_profile: { bio: 'hi', pronouns: 'they/them' },
        badges: [{ id: 'premium' }],
        connected_accounts: [{ type: 'github', name: 'kit-gh', id: '1', verified: true }],
        mutual_guilds: [{ id: '5', nick: null }],
        mutual_friends_count: 2,
      }
      : null),
  };
  const profile = await resolveProfile(client, '9');
  assert.equal(profile.tag, 'kit');
  assert.equal(profile.bio, 'hi');
  assert.deepEqual(profile.badges, ['premium']);
  assert.equal(profile.connectedAccounts[0].label, 'GitHub');
  assert.equal(profile.mutualFriendsCount, 2);
});

test('falls back to the bare user, then to null', async () => {
  const bare = await resolveProfile({ requestQuietly: async (path) => (path.includes('/profile') ? null : user) }, '9');
  assert.equal(bare.username, 'kit');
  assert.deepEqual(bare.mutualGuilds, []);
  assert.equal(await resolveProfile({ requestQuietly: async () => null }, '9'), null);
});
