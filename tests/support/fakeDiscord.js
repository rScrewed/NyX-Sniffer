'use strict';

const crypto = require('crypto');

const EPOCH = 1420070400000n;
const TARGET_ID = '317549730034876426';
const ME_ID = '1000000000000000001';

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function snowflake(ts, counter) {
  return ((BigInt(ts) - EPOCH) << 22n | BigInt(counter & 0x3fffff)).toString();
}

const USERS = {
  [TARGET_ID]: { id: TARGET_ID, username: 'target_user', discriminator: '0', global_name: 'Target', avatar: 'a1b2c3' },
  [ME_ID]: { id: ME_ID, username: 'me_account', discriminator: '0', global_name: 'Me', avatar: null },
};
const OTHERS = [];
for (let i = 1; i <= 8; i++) {
  const id = String(2000000000000000000n + BigInt(i) * 1111111111n);
  USERS[id] = { id, username: 'user' + i, discriminator: i % 3 === 0 ? '1234' : '0', global_name: 'User ' + i, avatar: i % 2 ? 'av' + i : null };
  OTHERS.push(id);
}

const GUILDS = [
  { id: '900000000000000001', name: 'Alpha Server \u{1F525}', channels: [['800000000000000001', 'general'], ['800000000000000002', 'memes'], ['800000000000000003', 'off-topic']], targetMessages: 130, mentions: 40 },
  { id: '900000000000000002', name: 'Beta', channels: [['800000000000000011', 'chat'], ['800000000000000012', 'media']], targetMessages: 60, mentions: 20 },
  { id: '900000000000000003', name: 'Gamma', channels: [['800000000000000021', 'lobby']], targetMessages: 0, mentions: 0 },
];

const SAMPLE_TEXT = [
  'hello everyone', 'my salary is not great lol', 'im 12 yo btw', 'lets play tonight', 'check this out',
  'i live in Berlin near the station', 'my password is hunter2 dont tell', 'free nitro at this link',
  'gg well played', 'anyone up for a game', 'text me on snapchat', 'i work at the warehouse downtown',
  'see you tomorrow', 'lol that was funny', 'my phone is an iPhone', 'brb dinner',
];
const FILE_NAMES = [
  'IMG_1234.HEIC', 'photo.png', 'screenshot.png', 'clip.mp4', 'PXL_20230101_101010.jpg', 'song.mp3',
  'IMG-20230101-WA0001.jpg', 'doc.pdf', 'funny.gif', 'image.png',
];

function buildDataset() {
  const rng = makeRng(42);
  const messages = [];
  let counter = 1;
  const base = Date.UTC(2023, 0, 5, 12, 0, 0);
  const span = 1000 * 60 * 60 * 24 * 600;

  for (const guild of GUILDS) {
    const make = (authorId, mentionsTarget, index, attachmentChance) => {
      const [channelId] = guild.channels[Math.floor(rng() * guild.channels.length)];
      const ts = base + Math.floor(rng() * span);
      const id = snowflake(ts, counter++);
      const text = SAMPLE_TEXT[Math.floor(rng() * SAMPLE_TEXT.length)];
      const attachments = [];
      if (rng() < attachmentChance) {
        const count = 1 + (rng() < 0.2 ? 1 : 0);
        for (let a = 0; a < count; a++) {
          const fname = FILE_NAMES[Math.floor(rng() * FILE_NAMES.length)];
          const attId = String(700000000000000000n + BigInt(counter++));
          attachments.push({
            id: attId,
            filename: fname,
            url: 'https://cdn.discordapp.com/attachments/' + channelId + '/' + attId + '/' + fname + '?ex=abc&is=def&hm=' + Math.floor(rng() * 1e9),
          });
        }
      }
      const mentions = mentionsTarget ? [USERS[TARGET_ID]] : [];
      messages.push({
        id,
        channel_id: channelId,
        guild_id: guild.id,
        content: (mentionsTarget ? '<@' + TARGET_ID + '> ' : '') + text + ' #' + index,
        timestamp: new Date(ts).toISOString(),
        author: USERS[authorId],
        attachments,
        embeds: [],
        mentions,
        type: 0,
      });
    };
    for (let i = 0; i < guild.targetMessages; i++) make(TARGET_ID, false, i, 0.3);
    for (let i = 0; i < guild.mentions; i++) make(OTHERS[i % OTHERS.length], true, i, 0.05);
    for (let i = 0; i < 25; i++) make(OTHERS[(i * 3) % OTHERS.length], false, i, 0.1);
  }
  return messages;
}

const MESSAGES = buildDataset();

const TOKENS = {
  TOKEN_A: { user: USERS[ME_ID], guilds: GUILDS.map((g) => g.id) },
  TOKEN_B: { user: { ...USERS[ME_ID], id: '1000000000000000002', username: 'worker_b' }, guilds: GUILDS.map((g) => g.id) },
  TOKEN_C: { user: { ...USERS[ME_ID], id: '1000000000000000003', username: 'worker_c' }, guilds: [GUILDS[0].id] },
  TOKEN_BAD: null,
};

function json(status, body) {
  return { status, json: body };
}

function guildSearch(guild, params) {
  const authorId = params.get('author_id');
  const mentionId = params.get('mentions');
  const hasFilters = params.getAll('has');
  const maxId = params.get('max_id') ? BigInt(params.get('max_id')) : null;
  const minId = params.get('min_id') ? BigInt(params.get('min_id')) : null;
  const offset = parseInt(params.get('offset') || '0', 10);
  const limit = Math.min(parseInt(params.get('limit') || '25', 10), 25);
  const order = params.get('sort_order') === 'asc' ? 1 : -1;

  let list = MESSAGES.filter((m) => m.guild_id === guild.id);
  if (authorId) list = list.filter((m) => m.author.id === authorId);
  if (mentionId) list = list.filter((m) => m.mentions.some((u) => u.id === mentionId));
  if (hasFilters.length) list = list.filter((m) => m.attachments.length > 0 || m.embeds.length > 0);
  if (maxId !== null) list = list.filter((m) => BigInt(m.id) <= maxId);
  if (minId !== null) list = list.filter((m) => BigInt(m.id) >= minId);
  list.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -order : order));

  const page = list.slice(offset, offset + limit);
  const channelIds = [...new Set(page.map((m) => m.channel_id))];
  const channels = channelIds.map((cid) => {
    const entry = guild.channels.find(([id]) => id === cid);
    return { id: cid, name: entry ? entry[1] : 'unknown', guild_id: guild.id };
  });
  return {
    total_results: list.length,
    messages: page.map((m) => [m]),
    channels,
  };
}

function handleDiscord(pathAndQuery, headers) {
  const auth = (headers && (headers.Authorization || headers.authorization)) || '';
  const token = TOKENS[auth];
  if (!token) return json(401, { code: 0, message: '401: Unauthorized' });

  const url = new URL(pathAndQuery, 'https://discord.com');
  const p = url.pathname;

  if (p === '/users/@me') return json(200, token.user);
  if (p === '/users/@me/guilds') {
    return json(200, GUILDS.filter((g) => token.guilds.includes(g.id)).map((g) => ({ id: g.id, name: g.name, icon: null, owner: false, permissions: '0' })));
  }

  let m = p.match(/^\/users\/(\d+)\/profile$/);
  if (m) {
    const u = USERS[m[1]];
    if (!u) return json(404, { code: 10013, message: 'Unknown User' });
    return json(200, {
      user: u,
      user_profile: { bio: 'Hello, I am the target.\nSecond line.', pronouns: 'they/them' },
      badges: [{ id: 'premium' }, { id: 'hypesquad_house_1' }],
      connected_accounts: [{ type: 'github', name: 'target-gh', id: '123', verified: true }, { type: 'steam', name: 'targetsteam', id: '765', verified: false }],
      premium_since: '2021-05-01T00:00:00.000Z',
      premium_guild_since: null,
      mutual_friends_count: 3,
      mutual_guilds: GUILDS.slice(0, 2).map((g) => ({ id: g.id, nick: g.id === GUILDS[0].id ? 'Targ' : null })),
    });
  }
  m = p.match(/^\/users\/(\d+)$/);
  if (m) {
    const u = USERS[m[1]];
    return u ? json(200, u) : json(404, { code: 10013, message: 'Unknown User' });
  }

  m = p.match(/^\/guilds\/(\d+)\/messages\/search$/);
  if (m) {
    const guild = GUILDS.find((g) => g.id === m[1]);
    if (!guild || !token.guilds.includes(guild.id)) return json(403, { code: 50001, message: 'Missing Access' });
    return json(200, guildSearch(guild, url.searchParams));
  }

  return json(404, { code: 0, message: '404: Not Found' });
}

function cdnBody(url) {
  const hash = crypto.createHash('sha256').update(url.split('?')[0]).digest();
  return Buffer.concat([Buffer.from('FAKEFILE:'), hash]);
}

function createFakeFetch(log) {
  return async function fakeFetch(input, opts = {}) {
    const url = String(input);
    let result;
    if (url.startsWith('https://discord.com/api/v9')) {
      result = handleDiscord(url.slice('https://discord.com/api/v9'.length), opts.headers || {});
      if (log) log('discord', url.slice('https://discord.com/api/v9'.length));
    } else if (url.startsWith('https://cdn.discordapp.com/') || url.startsWith('https://media.discordapp.net/')) {
      const buf = cdnBody(url);
      if (log) log('cdn', url.split('?')[0]);
      return {
        status: 200, ok: true,
        headers: { get: () => 'application/octet-stream' },
        buffer: async () => buf,
        arrayBuffer: async () => buf,
        text: async () => buf.toString(),
      };
    } else {
      throw new Error('fake fetch: unexpected url ' + url);
    }
    const body = JSON.stringify(result.json);
    return {
      status: result.status,
      ok: result.status >= 200 && result.status < 300,
      headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: async () => JSON.parse(body),
      text: async () => body,
    };
  };
}

module.exports = { createFakeFetch, TARGET_ID, ME_ID, GUILDS, MESSAGES, USERS };
