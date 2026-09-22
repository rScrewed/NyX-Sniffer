const http            = require('http');
const fs              = require('fs');
const path            = require('path');
const INTEL_WORDLISTS = require('./wordlists');
const { resourceDir } = require('./resourceDir');
const RESOURCE_DIR    = resourceDir(__dirname);

const MIME = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.bmp':  'image/bmp',
  '.svg':  'image/svg+xml',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
  '.mp3':  'audio/mpeg',
  '.ogg':  'audio/ogg',
  '.wav':  'audio/wav',
  '.m4a':  'audio/mp4',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8',
};

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function avatarUrl(userId, avatarHash, discriminator) {
  if (avatarHash) {
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return 'https://cdn.discordapp.com/avatars/' + userId + '/' + avatarHash + '.' + ext + '?size=128';
  }
  let idx;
  if (discriminator && discriminator !== '0') {
    idx = parseInt(discriminator, 10) % 5;
  } else {
    try {
      idx = Number((BigInt(userId) >> 22n) % 6n);
    } catch {
      idx = 0;
    }
  }
  return 'https://cdn.discordapp.com/embed/avatars/' + idx + '.png';
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
         '  ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function localFileToHref(p) {
  if (!p) return null;
  const norm = p.replace(/\\/g, '/');
  const idx  = norm.lastIndexOf('/files/');
  if (idx === -1) {
    const base = path.basename(norm);
    return '/files/' + encodeURIComponent(base);
  }
  return '/files/' + norm.slice(idx + '/files/'.length).split('/').map(encodeURIComponent).join('/');
}

function isImage(p) { return /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(p || ''); }
function isVideo(p) { return /\.(mp4|webm|mov|m4v)$/i.test(p || ''); }
function isAudio(p) { return /\.(mp3|ogg|wav|m4a|flac|aac|opus)$/i.test(p || ''); }

function groupByServer(items) {
  const out = {};
  for (const m of items) {
    const sk = m.guildName || m.guildId || 'unknown server';
    const ck = m.channelName ? '#' + m.channelName : '#unknown';
    if (!out[sk]) out[sk] = {};
    if (!out[sk][ck]) out[sk][ck] = [];
    out[sk][ck].push(m);
  }
  for (const s of Object.keys(out)) {
    for (const c of Object.keys(out[s])) {
      out[s][c].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
  }
  return out;
}

function messageDataHas(m) {
  const types = [];
  if (m.content && m.content.trim()) types.push('text');
  const allFiles = m.files || [];
  for (const f of allFiles) {
    if (isImage(f.localPath))      types.push('image');
    else if (isVideo(f.localPath)) types.push('video');
    else if (isAudio(f.localPath)) types.push('audio');
    else                           types.push('other');
  }
  if (m.attachments && m.attachments.length) types.push('other');
  if (types.length === 0) types.push('text');
  return [...new Set(types)].join(' ');
}

function renderMessageCard(m, opts) {
  const id        = opts.mode === 'mentions' ? m.senderId    : (m.authorId || opts.targetId);
  const tag       = opts.mode === 'mentions' ? m.senderTag   : (m.authorTag || opts.targetTag || '—');
  const av        = opts.mode === 'mentions' ? m.senderAvatar : (m.authorAvatar || opts.targetAvatar);
  const discrim   = opts.mode === 'mentions' ? m.senderDiscriminator : null;
  const avSrc     = id ? avatarUrl(id, av, discrim) : null;
  const dataHas    = messageDataHas(m);
  const senderAttr = opts.mode === 'mentions' ? ' data-sender="' + escapeHtml(id || '') + '"' : '';
  const intelTags  = opts.intelRegexes ? tagMessageIntel(m.content || '', opts.intelRegexes) : '';
  const intelAttr  = intelTags ? ' data-intel="' + escapeHtml(intelTags) + '"' : '';

  const hasTypes  = dataHas.split(' ').filter(Boolean);
  const hasFiles  = hasTypes.some(t => t === 'image' || t === 'video' || t === 'audio' || t === 'other');
  const hasCls    = hasTypes.map(t => 'has-' + t).join(' ') + (hasFiles ? ' has-files' : '');

  const parts = [];
  parts.push('<article class="msg ' + hasCls + '" data-has="' + dataHas + '"' + senderAttr + intelAttr + '>');
  parts.push('  <div class="msg-head">');
  if (avSrc) {
    parts.push('    <img class="av" src="' + escapeHtml(avSrc) + '" alt="">');
  } else {
    parts.push('    <div class="av av-blank"></div>');
  }
  parts.push('    <div class="meta">');
  parts.push('      <div class="who">' + escapeHtml(tag || '—') + '</div>');
  parts.push('      <div class="sub">ID ' + escapeHtml(id || '—') + '  ·  ' + escapeHtml(fmtDate(m.timestamp)) + '</div>');
  parts.push('    </div>');
  if (m.messageId && m.guildId && m.channelId) {
    const link = 'https://discord.com/channels/' + m.guildId + '/' + m.channelId + '/' + m.messageId;
    parts.push('    <a class="jump" href="' + escapeHtml(link) + '" target="_blank" rel="noreferrer">jump ↗</a>');
  }
  parts.push('  </div>');

  if (m.content && m.content.trim()) {
    parts.push('  <div class="body">' + escapeHtml(m.content) + '</div>');
  }

  if (m.files && m.files.length) {
    parts.push('  <div class="files">');
    for (const f of m.files) {
      const href = localFileToHref(f.localPath);
      const fname = (f.localPath || '').split(/[\\/]/).pop();
      if (isImage(f.localPath)) {
        parts.push('    <a class="thumb" href="' + escapeHtml(href) + '" target="_blank"><img src="' + escapeHtml(href) + '" loading="lazy" alt=""></a>');
      } else if (isVideo(f.localPath)) {
        parts.push('    <video class="vid" controls preload="metadata"><source src="' + escapeHtml(href) + '"></video>');
      } else if (isAudio(f.localPath)) {
        parts.push('    <audio controls preload="none" src="' + escapeHtml(href) + '"></audio>');
      } else {
        parts.push('    <a class="filechip" href="' + escapeHtml(href) + '" target="_blank">' + escapeHtml(fname) + '</a>');
      }
    }
    parts.push('  </div>');
  } else if (m.attachments && m.attachments.length) {
    parts.push('  <div class="files">');
    for (const url of m.attachments) {
      parts.push('    <a class="filechip ext" href="' + escapeHtml(url) + '" target="_blank" rel="noreferrer">' + escapeHtml(url.split('/').pop().split('?')[0]) + '</a>');
    }
    parts.push('  </div>');
  }

  parts.push('</article>');
  return parts.join('\n');
}

function renderMentioners(mentioners, targetId) {
  if (!mentioners || !mentioners.length) return '';
  const rows = mentioners.map((u) => {
    const av = avatarUrl(u.id, u.avatar, null);
    return '<li data-id="' + escapeHtml(u.id) + '"><img src="' + escapeHtml(av) + '" alt=""><span class="t">' + escapeHtml(u.tag || u.id) + '</span><span class="n">' + u.count + '×</span></li>';
  }).join('');
  return '<aside class="rank"><h3>RANKED MENTIONERS</h3><ol>' + rows + '</ol></aside>';
}

const PAGE_SIZE = 500;

function buildSidebarNav(grouped, prefix) {
  prefix = prefix || 'main';
  const parts = [];
  let si = 0;
  for (const server of Object.keys(grouped).sort()) {
    parts.push('<div class="sb-srv">');
    parts.push('<a class="sb-srv-hd" href="#' + prefix + '-srv-' + si + '"><span class="dot">◆</span><span class="sb-srv-txt">' + escapeHtml(server) + '</span></a>');
    let ci = 0;
    for (const ch of Object.keys(grouped[server]).sort()) {
      const count = grouped[server][ch].length;
      parts.push('<a class="sb-ch" href="#' + prefix + '-srv-' + si + '-ch-' + ci + '"><span class="sb-ch-name">' + escapeHtml(ch) + '</span><span class="sb-cnt">' + count + '</span></a>');
      ci++;
    }
    parts.push('</div>');
    si++;
  }
  return parts.join('');
}


function termRegex(t, flags) {
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pre = /^\w/.test(t) ? '\\b' : '';
  const suf = /\w$/.test(t) ? '\\b' : '';
  return new RegExp(pre + esc + suf, flags || 'i');
}

function buildIntelRegexes() {
  const out = {};
  for (const [cat, terms] of Object.entries(INTEL_WORDLISTS)) {
    if (!terms.length) continue;
    const alts = terms
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(t => {
        const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pre = /^\w/.test(t) ? '\\b' : '';
        const suf = /\w$/.test(t) ? '\\b' : '';
        return pre + esc + suf;
      })
      .join('|');
    out[cat] = new RegExp(alts, 'i');
  }
  return out;
}

function tagMessageIntel(text, regexes) {
  if (!text || !text.trim()) return '';
  const matched = [];
  for (const [cat, re] of Object.entries(regexes)) {
    if (re.test(text)) matched.push(cat);
  }
  return matched.join(' ');
}

function filterByIntel(items, category) {
  const terms = INTEL_WORDLISTS[category] || [];
  return items.filter((m) => {
    const text = (m.content || '').toLowerCase();
    return terms.some((t) => termRegex(t).test(text));
  });
}

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','so','of','to','in','on','at','by','for','with','about',
  'against','between','into','through','during','before','after','above','below','from','up',
  'down','out','off','over','under','again','further','then','once','here','there','when','where',
  'why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not',
  'only','own','same','than','too','very','can','will','just','should','now','is','am','are','was',
  'were','be','been','being','have','has','had','having','do','does','did','doing','would','could',
  'i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves',
  'he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their',
  'theirs','themselves','what','which','who','whom','this','that','these','those','im','ive','id',
  'ill','youre','youve','youll','youd','hes','shes','its','were','theyre','theyve','dont','didnt',
  'doesnt','isnt','arent','wasnt','werent','cant','couldnt','wouldnt','shouldnt','wont','yeah','yea',
  'like','just','get','got','going','go','one','also','really','know','think','see','oh','ok','okay',
  'lol','lmao','u','ur','bro','yo','hey','well','right','still','even','much','many','something',
  'nothing','anything','someone','anyone','back','need','want','make','made','let','literally',
]);

function computeWordWall(messages, limit) {
  limit = limit || 70;
  const counts = new Map();
  for (const m of (messages || [])) {
    let text = m.content || '';
    if (!text) continue;
    text = text
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/<a?:\w+:\d+>/g, ' ')
      .replace(/<@!?\d+>|<#\d+>|<@&\d+>/g, ' ')
      .replace(/[`*_~>|]/g, ' ')
      .toLowerCase();
    const words = text.match(/[a-z][a-z']{2,}/g) || [];
    for (let w of words) {
      w = w.replace(/^'+|'+$/g, '');
      if (w.length < 3 || w.length > 24) continue;
      if (STOPWORDS.has(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

function buildHTML(data, mode, page, intelFilter, mentionsData, heatmapData, timelineData, profileData) {
  page = page || 0;
  const isMentions = mode === 'mentions';
  let allItems     = (isMentions ? data.mentions : data.messages) || [];

  if (intelFilter && INTEL_WORDLISTS[intelFilter]) {
    allItems = filterByIntel(allItems, intelFilter);
  }

  const totalCount = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage   = Math.max(0, Math.min(page, totalPages - 1));
  const startIdx   = safePage * PAGE_SIZE;
  const endIdx     = Math.min(startIdx + PAGE_SIZE, totalCount);
  const items      = (allItems || []).slice(startIdx, endIdx);
  const grouped    = groupByServer(items);
  const targetAv   = data.targetAvatar
    ? avatarUrl(data.userId, data.targetAvatar, null)
    : avatarUrl(data.userId, null, null);

  const intelRegexes = buildIntelRegexes();

  const sectionParts = [];
  let _si = 0;
  for (const server of Object.keys(grouped).sort()) {
    sectionParts.push('<section class="srv"><h2 id="main-srv-' + _si + '">' + escapeHtml(server) + '</h2>');
    let _ci = 0;
    for (const channel of Object.keys(grouped[server]).sort()) {
      const list = grouped[server][channel];
      sectionParts.push('<div class="chan"><div class="chan-head" id="main-srv-' + _si + '-ch-' + _ci + '"><span class="ch">' + escapeHtml(channel) + '</span><span class="cn">' + list.length + ' ' + (isMentions ? 'mention' : 'message') + (list.length === 1 ? '' : 's') + '</span></div>');
      for (const m of list) {
        sectionParts.push(renderMessageCard(m, {
          mode,
          targetId:     data.userId,
          targetTag:    data.username,
          targetAvatar: data.targetAvatar,
          intelRegexes,
        }));
      }
      sectionParts.push('</div>');
      _ci++;
    }
    sectionParts.push('</section>');
    _si++;
  }

  let mentionFeedHtml = '';
  let mentionRankHtml = '';
  let mentionGrouped = {};
  const hasMentionsFeed = !isMentions && mentionsData && (mentionsData.mentions || []).length > 0;
  if (hasMentionsFeed) {
    mentionGrouped = groupByServer(mentionsData.mentions || []);
    const mp = [];
    let _msi = 0;
    for (const sv of Object.keys(mentionGrouped).sort()) {
      mp.push('<section class="srv"><h2 id="ment-srv-' + _msi + '">' + escapeHtml(sv) + '</h2>');
      let _mci = 0;
      for (const ch of Object.keys(mentionGrouped[sv]).sort()) {
        const list = mentionGrouped[sv][ch];
        mp.push('<div class="chan"><div class="chan-head" id="ment-srv-' + _msi + '-ch-' + _mci + '"><span class="ch">' + escapeHtml(ch) + '</span><span class="cn">' + list.length + ' mention' + (list.length === 1 ? '' : 's') + '</span></div>');
        for (const m of list) {
          mp.push(renderMessageCard(m, { mode: 'mentions', targetId: data.userId, targetTag: data.username, targetAvatar: data.targetAvatar, intelRegexes }));
        }
        mp.push('</div>');
        _mci++;
      }
      mp.push('</section>');
      _msi++;
    }
    mentionFeedHtml = mp.join('\n');
    mentionRankHtml = renderMentioners(mentionsData.mentioners || [], data.userId);
  }

  const CAT_COLORS_SS = {
    location:'#7dd3fc', economics:'#4ade80', identity:'#f87171',
    social:'#c084fc', activities:'#fb923c', technical:'#facc15',
    criminal:'#ff4d4d', physical:'#a3e635', credentials:'#f43f5e', places:'#38bdf8',
  };
  const termsPanelHtml = '<div id="terms-overlay" class="terms-overlay hidden"></div>' +
    '<div id="terms-panel" class="terms-panel hidden">' +
    '<div class="terms-hd"><span>WORDLIST</span><button class="terms-cls">✕</button></div>' +
    '<div class="terms-bd">' +
    Object.entries(INTEL_WORDLISTS).map(([cat, terms]) => {
      const color = CAT_COLORS_SS[cat] || '#aaa';
      return '<div class="tcat"><div class="tcat-lbl" style="color:' + color + '">' +
        escapeHtml(cat.toUpperCase()) + '<span class="tcnt">' + terms.length + '</span></div>' +
        '<div class="tchips">' +
        terms.map(t => '<span class="tchip" data-cat="' + escapeHtml(cat) + '" data-term="' + escapeHtml(t) +
          '" style="border-color:' + color + ';color:' + color + '">' + escapeHtml(t) + '</span>').join('') +
        '</div></div>';
    }).join('') +
    '</div></div>';

  const totalLine = isMentions
    ? (totalCount + ' mentions  ·  ' + (data.mentioners ? data.mentioners.length : 0) + ' unique senders')
    : (totalCount + ' messages  ·  ' + (allItems || []).reduce((n, m) => n + (m.files ? m.files.length : 0), 0) + ' files');

  const intelParam = intelFilter ? '&intel=' + intelFilter : '';
  const prevBtn = safePage > 0
    ? '<a class="pbtn" href="/?page=' + (safePage - 1) + intelParam + '">‹ prev</a>'
    : '<span class="pbtn disabled">‹ prev</span>';
  const nextBtn = safePage < totalPages - 1
    ? '<a class="pbtn" href="/?page=' + (safePage + 1) + intelParam + '">next ›</a>'
    : '<span class="pbtn disabled">next ›</span>';
  const clearIntel = intelFilter
    ? '  <a class="pbtn" href="/?page=0" style="border-color:#f87171;color:#f87171">✕ clear ' + intelFilter + '</a>'
    : '';
  const pagerBlock = (totalPages > 1 || intelFilter)
    ? '<div class="pager">' + prevBtn +
      '<span class="pinfo">page ' + (safePage + 1) + ' of ' + totalPages +
      '  ·  ' + (startIdx + 1) + '–' + endIdx + ' of ' + totalCount + (intelFilter ? ' matching' : '') + '</span>' +
      nextBtn + clearIntel + '</div>'
    : '';

  const sbNavHtml = hasMentionsFeed
    ? '<div id="sb-nav-main">' + buildSidebarNav(grouped, 'main') + '</div>' +
      '<div id="sb-nav-mentions" class="hidden">' + buildSidebarNav(mentionGrouped, 'ment') + '</div>'
    : buildSidebarNav(grouped, 'main');

  const sidebarHtml = '<nav class="sidebar" id="sidebar">' +
    '<div class="sb-profile">' +
    '<img class="sb-av" src="' + escapeHtml(targetAv) + '" alt="">' +
    '<div class="sb-info">' +
    '<div class="sb-name"><span class="at">▸</span> ' + escapeHtml(data.username || '—') + '</div>' +
    '<div class="sb-uid">' + escapeHtml(data.userId) + '</div>' +
    '</div>' +
    '<button class="sb-collapse" id="sb-collapse" title="toggle sidebar">‹</button>' +
    '</div>' +
    '<div class="sb-stats">' +
    '<div class="sb-stat"><span class="sbk">op</span><span class="sbv">' + escapeHtml(data.mode || mode) + '</span></div>' +
    '<div class="sb-stat"><span class="sbk">vol</span><span class="sbv">' + escapeHtml(totalLine) + '</span></div>' +
    '<div class="sb-stat"><span class="sbk">srvs</span><span class="sbv">' + Object.keys(grouped).length + '</span></div>' +
    '</div>' +
    '<div class="sb-nav-label">channels</div>' +
    '<div class="sb-nav" id="sb-nav">' + sbNavHtml + '</div>' +
    '</nav>';

  const head = '<!doctype html><html><head><meta charset="utf-8"><title>profile — ' + escapeHtml(data.username || data.userId) + '</title><link rel="stylesheet" href="/viewer.css"></head><body>';

  const stamp = '<div class="stamp">Profile<span class="sep">·</span>' + escapeHtml((data.mode || mode).toUpperCase()) + '<span class="sep">·</span>Gathered ' + escapeHtml(new Date().toISOString().slice(0, 19).replace('T', ' ')) + ' UTC</div>';

  const pd = profileData || {};
  let profExtra = '';
  if (pd.pronouns)  profExtra += '<div class="prof-line">' + escapeHtml(pd.pronouns) + '</div>';
  if (pd.bio)       profExtra += '<div class="prof-line prof-bio">' + escapeHtml(pd.bio.replace(/\n/g, ' ').slice(0, 120)) + '</div>';
  if (pd.badges && pd.badges.length) {
    const BADGE_MAP = { premium:'Nitro', legacy_username:'Legacy Username', verified_developer:'Verified Dev',
      active_developer:'Active Dev', bug_hunter_level_1:'Bug Hunter', bug_hunter_level_2:'Bug Hunter Gold',
      partner:'Partner', staff:'Staff', certified_moderator:'Certified Mod',
      hypesquad_house_1:'Bravery', hypesquad_house_2:'Brilliance', hypesquad_house_3:'Balance',
      quest_completed:'Quest', orb_profile_badge:'Orb' };
    const badgeChips = pd.badges.map(id => {
      const lvl = id.match(/guild_booster_lvl(\d+)/);
      const ten = id.match(/premium_tenure_(\d+)_month/);
      const label = lvl ? 'Booster L'+lvl[1] : ten ? 'Nitro '+ten[1]+'mo' : (BADGE_MAP[id] || id.replace(/_/g,' '));
      return '<span class="badge-chip">' + escapeHtml(label) + '</span>';
    }).join('');
    profExtra += '<div class="badge-list">' + badgeChips + '</div>';
  }
  if (pd.mutualGuilds && pd.mutualGuilds.length) {
    const gchips = pd.mutualGuilds.map(mg => {
      const name = mg.name || mg.id;
      const label = escapeHtml(name) + (mg.nick ? ' <span class="mg-nick">(' + escapeHtml(mg.nick) + ')</span>' : '');
      return '<span class="mg-chip">' + label + '</span>';
    }).join('');
    profExtra += '<div class="mg-label">Mutual Servers</div><div class="ca-list">' + gchips + '</div>';
  }

  if (pd.connectedAccounts && pd.connectedAccounts.length) {
    function caUrl(a) {
      const n = a.name || '', id = a.id || '';
      switch (a.type) {
        case 'github':        return 'https://github.com/' + n;
        case 'twitter':       return 'https://x.com/' + n;
        case 'twitch':        return 'https://twitch.tv/' + n;
        case 'youtube':       return 'https://youtube.com/@' + n;
        case 'reddit':        return 'https://reddit.com/u/' + n;
        case 'tiktok':        return 'https://tiktok.com/@' + n;
        case 'instagram':     return 'https://instagram.com/' + n;
        case 'steam':         return id ? 'https://steamcommunity.com/profiles/' + id : 'https://steamcommunity.com/id/' + n;
        case 'spotify':       return id ? 'https://open.spotify.com/user/' + id : null;
        case 'roblox':        return id ? 'https://www.roblox.com/users/' + id + '/profile' : null;
        case 'domain':        return n.startsWith('http') ? n : 'https://' + n;
        case 'ebay':          return 'https://www.ebay.com/usr/' + n;
        default:              return null;
      }
    }
    const chips = pd.connectedAccounts.map(a => {
      const url = caUrl(a);
      const inner = escapeHtml(a.label) + ' · ' + escapeHtml(a.name);
      return url
        ? '<a class="ca-chip" href="' + escapeHtml(url) + '" target="_blank" rel="noreferrer">' + inner + '</a>'
        : '<span class="ca-chip">' + inner + '</span>';
    }).join('');
    profExtra += '<div class="ca-list">' + chips + '</div>';
  }
  const targetBlock = '<div class="target"><img src="' + escapeHtml(targetAv) + '" alt=""><div><h1><span class="at">▸</span> ' + escapeHtml(data.username || '—') + '</h1><div class="id"><b>ID</b> ' + escapeHtml(data.userId) + '</div>' + profExtra + '</div></div>';

  const statsBlock = '<div class="stats"><div><div class="k">Operation</div><div class="v">' + escapeHtml(data.mode || mode) + '</div></div><div><div class="k">Volume</div><div class="v">' + escapeHtml(totalLine) + '</div></div><div><div class="k">Servers</div><div class="v">' + Object.keys(grouped).length + '</div></div></div>';

  const rank   = isMentions ? renderMentioners(data.mentioners, data.userId) : '';
  const layout = '<div class="layout' + (rank ? ' has-rank' : '') + '" id="msg-layout"><main id="main-feed">' + sectionParts.join('\n') + '</main>' + rank + '</div>' +
    (hasMentionsFeed ? '<div class="layout' + (mentionRankHtml ? ' has-rank' : '') + ' hidden" id="mention-layout"><main id="mention-feed">' + mentionFeedHtml + '</main>' + mentionRankHtml + '</div>' : '');

  let tlHtml = '';
  let tlBtn  = '';
  if (timelineData && timelineData.buckets && timelineData.buckets.length) {
    const first = timelineData.buckets[0].month;
    const last  = timelineData.buckets[timelineData.buckets.length - 1].month;
    tlHtml = '<div id="timeline-section" class="hidden">' +
      '<div class="tl-meta">' +
      '<span>activity timeline  ·  ' + escapeHtml(first) + ' → ' + escapeHtml(last) + '</span>' +
      '<span>' + timelineData.buckets.length + ' months  ·  ' + timelineData.total + ' messages</span>' +
      '</div>' +
      '<div class="tl-scroll"><canvas id="tl-canvas"></canvas></div>' +
      '</div>';
    tlBtn = '<button class="fbtn" data-main="timeline">Timeline</button>';
  }

  let hmHtml = '';
  let hmBtn  = '';
  if (heatmapData && heatmapData.buckets && heatmapData.buckets.length) {
    const hmMax    = Math.max(...heatmapData.buckets.map(b => b.count), 1);
    const top5     = new Set([...heatmapData.buckets].sort((a, b) => b.count - a.count).slice(0, 5).map(b => b.startHour));
    const hmRows   = heatmapData.buckets.map(b => {
      const pct  = Math.round(b.count / hmMax * 100);
      const top  = top5.has(b.startHour) ? ' hm-top' : '';
      return '<div class="hm-row"><span class="hm-lbl">' + escapeHtml(b.label) + '</span>' +
        '<div class="hm-bar-wrap"><div class="hm-bar' + top + '" style="width:' + pct + '%"></div>' +
        '<span class="hm-cnt">' + b.count + '</span></div></div>';
    }).join('');
    hmHtml = '<div id="heatmap-section" class="hidden"><div class="hm-wrap">' +
      '<div class="hm-meta"><span>timezone · ' + escapeHtml(heatmapData.timezone) + '</span>' +
      '<span>' + heatmapData.total + ' messages</span></div>' +
      '<div class="hm-chart">' + hmRows + '</div></div></div>';
    hmBtn = '<button class="fbtn" data-main="heatmap">Heatmap</button>';
  }

  let wwHtml = '';
  let wwBtn  = '';
  const wordWallWords = !isMentions ? computeWordWall(data.messages || [], 70) : [];
  if (wordWallWords.length > 0) {
    const wwMax = wordWallWords[0].count;
    const wwMin = wordWallWords[wordWallWords.length - 1].count;
    const WW_PALETTE = ['#a78bfa','#7dd3fc','#f472b6','#4ade80','#facc15','#fb923c','#38bdf8','#f87171','#c084fc','#34d399'];
    const wwSpans = wordWallWords.map((w, i) => {
      const t      = wwMax === wwMin ? 1 : (w.count - wwMin) / (wwMax - wwMin);
      const size   = Math.round(13 + Math.sqrt(t) * 37);
      const color  = WW_PALETTE[i % WW_PALETTE.length];
      const weight = t > 0.6 ? 700 : t > 0.25 ? 600 : 500;
      const delay  = Math.min(i * 14, 600);
      return '<span class="ww-word" style="font-size:' + size + 'px;color:' + color + ';font-weight:' + weight +
        ';animation-delay:' + delay + 'ms" data-word="' + escapeHtml(w.word) + '" data-count="' + w.count + '">' +
        escapeHtml(w.word) + '</span>';
    }).join('');
    wwHtml = '<div id="words-section" class="hidden"><div class="ww-wrap">' +
      '<div class="ww-meta">' +
      '<span>word wall  ·  ' + wordWallWords.length + ' unique terms</span>' +
      '<span>top word: “' + escapeHtml(wordWallWords[0].word) + '” × ' + wordWallWords[0].count + '</span>' +
      '</div>' +
      '<div class="ww-cloud" id="ww-cloud">' + wwSpans + '</div>' +
      '<div class="ww-hint">click a word to filter messages containing it</div>' +
      '<div class="ww-tip hidden" id="ww-tip"></div>' +
      '</div></div>';
    wwBtn = '<button class="fbtn" data-main="words">Word Wall</button>';
  }

  const wordsBtn = '<button class="fbtn" id="terms-toggle" title="edit wordlists">⚙</button>';

  const mentionsTabBtn = hasMentionsFeed
    ? '<button class="fbtn" data-main="mentions">Mentions <span style="opacity:.5;font-size:10px">' + (mentionsData.mentions || []).length + '</span></button>'
    : '';

  const filterBar = `
<div class="filters">
  <div class="filter-row">
    <button class="fbtn active" data-main="all">All</button>
    <button class="fbtn" data-main="messages">Messages</button>
    <button class="fbtn" data-main="files">Files</button>
    ${mentionsTabBtn}${hmBtn}${tlBtn}${wwBtn}
    <div class="f-sep"></div>
    <input class="search-input" id="msg-search" type="text" placeholder="search messages…" autocomplete="off" spellcheck="false">
    <button class="fbtn" id="intel-toggle" title="toggle OSINT filters">OSINT</button>
    ${wordsBtn}
  </div>
  <div class="sub-row" id="sub-row">
    <button class="fbtn active" data-sub="all">All files</button>
    <button class="fbtn" data-sub="image">Images</button>
    <button class="fbtn" data-sub="video">Videos</button>
    <button class="fbtn" data-sub="audio">Audio</button>
    <button class="fbtn" data-sub="other">Other</button>
  </div>
  <div class="intel-panel intel-hidden" id="intel-panel">
    <button class="fbtn" data-intel="economics">Economics<span class="cnt"></span></button>
    <button class="fbtn" data-intel="identity">Identity<span class="cnt"></span></button>
    <button class="fbtn" data-intel="social">Social<span class="cnt"></span></button>
    <button class="fbtn" data-intel="activities">Activities<span class="cnt"></span></button>
    <button class="fbtn" data-intel="technical">Technical<span class="cnt"></span></button>
    <button class="fbtn" data-intel="criminal">Criminal<span class="cnt"></span></button>
    <button class="fbtn" data-intel="physical">Physical<span class="cnt"></span></button>
    <button class="fbtn" data-intel="credentials">Credentials<span class="cnt"></span></button>
    <button class="fbtn" data-intel="places">Places<span class="cnt"></span></button>
  </div>
</div>
<script>
document.addEventListener('DOMContentLoaded',function(){
  var INTEL   = ${JSON.stringify(INTEL_WORDLISTS)};
  var TL_DATA = ${JSON.stringify(timelineData ? timelineData.buckets : [])};
  var TL_DAILY = ${JSON.stringify((function() {
    const allMsgs = (isMentions ? data.mentions : data.messages) || [];
    const db = {};
    for (const m of allMsgs) {
      if (!m.timestamp) continue;
      try {
        const d = new Date(m.timestamp);
        if (isNaN(d.getTime())) continue;
        const mo = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        const dy = mo + '-' + String(d.getDate()).padStart(2, '0');
        if (!db[mo]) db[mo] = {};
        db[mo][dy] = (db[mo][dy] || 0) + 1;
      } catch (_) {}
    }
    return db;
  })())};

  var _urlP = new URLSearchParams(window.location.search);
  var main  = _urlP.get('main') || 'all';
  var sub   = _urlP.get('sub')  || 'all';
  var intel = null;

  var disabledTerms = new Set();
  function getActiveIntel(cat) {
    return (INTEL[cat] || []).filter(function(t) { return !disabledTerms.has(cat + ':' + t); });
  }

  var BADGE_COLORS = {
    location:'#7dd3fc', economics:'#4ade80', identity:'#f87171',
    social:'#c084fc', activities:'#fb923c', technical:'#facc15'
  };

  function addIntelBadges() {
    document.querySelectorAll('.msg').forEach(function(card) {
      var old = card.querySelector('.intel-badges');
      if (old) old.remove();
      var cats = (card.dataset.intel || '').split(' ').filter(Boolean);
      if (!cats.length) return;
      var wrap = document.createElement('div');
      wrap.className = 'intel-badges';
      cats.forEach(function(cat) {
        var b = document.createElement('span');
        b.className = 'ibadge';
        b.textContent = cat;
        b.style.borderColor = BADGE_COLORS[cat] || '#aaa';
        b.style.color = BADGE_COLORS[cat] || '#aaa';
        b.title = 'filter by ' + cat;
        b.addEventListener('click', function(e) {
          e.stopPropagation();
          var params = new URLSearchParams(window.location.search);
          params.get('intel') === cat ? params.delete('intel') : (params.set('intel', cat), params.delete('page'));
          window.location.search = params.toString();
        });
        wrap.appendChild(b);
      });
      var head = card.querySelector('.msg-head');
      if (head) head.appendChild(wrap);
    });
  }

  var MO_ABB = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function drawTimeline() {
    if (!TL_DATA || !TL_DATA.length) return;
    var canvas = document.getElementById('tl-canvas');
    if (!canvas || canvas.dataset.drawn) return;
    canvas.dataset.drawn = '1';

    var BAR_W = 18, GAP = 4, STEP = BAR_W + GAP;
    var TOP_PAD = 26, CHART_H = 160, LABEL_H = 36;
    var H = TOP_PAD + CHART_H + LABEL_H;
    var W = Math.max(TL_DATA.length * STEP + 8, 300);
    var dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var max = 0, total = 0;
    TL_DATA.forEach(function(b) { if (b.count > max) max = b.count; total += b.count; });
    var avg = total / TL_DATA.length;

    function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
    function barColor(count) {
      if (count === 0) return '#1a2029';
      var t = count / max;
      return 'rgb(' + lerp(0x2d,0xa7,t) + ',' + lerp(0x1f,0x8b,t) + ',' + lerp(0x5e,0xfa,t) + ')';
    }

    ctx.fillStyle = '#0e1116';
    ctx.fillRect(0, 0, W, H);

    if (max > 0) {
      var avgY = TOP_PAD + CHART_H - Math.round(avg / max * CHART_H);
      ctx.strokeStyle = '#2a3347';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(0, avgY); ctx.lineTo(W, avgY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#374151';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('avg ' + Math.round(avg), W - 2, avgY - 3);
    }

    var prevYear = null;
    TL_DATA.forEach(function(b, i) {
      var x    = i * STEP;
      var h    = max === 0 ? 1 : Math.max(2, Math.round(b.count / max * CHART_H));
      var barY = TOP_PAD + CHART_H - h;
      var year = b.month.slice(0, 4);
      var mo   = parseInt(b.month.slice(5, 7), 10) - 1;

      ctx.fillStyle = barColor(b.count);
      ctx.fillRect(x, barY, BAR_W, h);

      if (b.count > 0) {
        ctx.fillStyle = b.count === max ? '#c4b5fd' : '#6b7280';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        var labelY = barY - 3;
        ctx.fillText(b.count, x + BAR_W / 2, labelY > TOP_PAD + 8 ? labelY : TOP_PAD + 8);
      }

      ctx.fillStyle = mo === 0 ? '#a6acb8' : '#4b5563';
      ctx.font = (mo === 0 ? 'bold ' : '') + '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(MO_ABB[mo], x + BAR_W / 2, TOP_PAD + CHART_H + 14);

      if (mo === 0) {
        ctx.fillStyle = '#a78bfa';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(year, x + BAR_W / 2, TOP_PAD + CHART_H + 26);
        ctx.strokeStyle = '#2a3347';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 2, TOP_PAD);
        ctx.lineTo(x - 2, TOP_PAD + CHART_H + 4);
        ctx.stroke();
      }
    });

    var tip = document.getElementById('tl-tip');
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('mousemove', function(e) {
      var rect = canvas.getBoundingClientRect();
      var idx  = Math.floor((e.clientX - rect.left) / STEP);
      if (tip && idx >= 0 && idx < TL_DATA.length) {
        var b = TL_DATA[idx];
        tip.innerHTML = '<b>' + b.month + '</b>&nbsp;&nbsp;' + b.count + ' message' + (b.count !== 1 ? 's' : '') +
          '<span class="tl-tip-cta">click to view daily breakdown →</span>';
        tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 230) + 'px';
        tip.style.top  = (e.clientY - 52) + 'px';
        tip.classList.remove('hidden');
      } else if (tip) {
        tip.classList.add('hidden');
      }
    });
    canvas.addEventListener('mouseleave', function() { if (tip) tip.classList.add('hidden'); });
    canvas.addEventListener('click', function(e) {
      var rect = canvas.getBoundingClientRect();
      var idx  = Math.floor((e.clientX - rect.left) / STEP);
      if (idx >= 0 && idx < TL_DATA.length) openDetailMonth(TL_DATA[idx].month);
    });
  }

  var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function openDetailMonth(month) {
    var days  = TL_DAILY[month] || {};
    var parts = month.split('-');
    var year  = parseInt(parts[0], 10);
    var mon   = parseInt(parts[1], 10);
    var daysInMonth = new Date(year, mon, 0).getDate();

    var buckets = [];
    var total = 0, max = 0;
    for (var d = 1; d <= daysInMonth; d++) {
      var key   = month + '-' + String(d).padStart(2, '0');
      var count = days[key] || 0;
      var dow   = new Date(year, mon - 1, d).getDay();
      buckets.push({ d: d, count: count, dow: dow, key: key });
      total += count;
      if (count > max) max = count;
    }
    var avg = total / daysInMonth;
    var peakB = buckets.reduce(function(a, b) { return b.count > a.count ? b : a; }, buckets[0]);

    var overlay = document.getElementById('tl-detail-overlay');
    var title   = document.getElementById('tl-detail-title');
    var canvas  = document.getElementById('tl-detail-canvas');
    if (!overlay || !canvas) return;

    title.innerHTML = MONTH_NAMES[mon - 1] + ' ' + year +
      '<span class="tl-detail-meta">' +
        total + ' messages&nbsp;&nbsp;·&nbsp;&nbsp;avg ' + avg.toFixed(1) + '/day' +
        (max > 0 ? '&nbsp;&nbsp;·&nbsp;&nbsp;peak ' + max + ' on ' + peakB.key : '') +
      '</span>';

    var BAR_W = 20, GAP = 5, STEP = BAR_W + GAP;
    var TOP_PAD = 32, CHART_H = 150, LABEL_H = 32;
    var H   = TOP_PAD + CHART_H + LABEL_H;
    var W   = buckets.length * STEP + 8;
    var dpr = window.devicePixelRatio || 1;
    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.style.cursor = 'crosshair';

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
    function barColor(count) {
      if (count === 0) return '#1a2029';
      var t = max === 0 ? 0 : count / max;
      return 'rgb(' + lerp(0x2d,0xa7,t) + ',' + lerp(0x1f,0x8b,t) + ',' + lerp(0x5e,0xfa,t) + ')';
    }

    ctx.fillStyle = '#0e1116';
    ctx.fillRect(0, 0, W, H);

    buckets.forEach(function(b, i) {
      if (b.dow === 0 || b.dow === 6) {
        ctx.fillStyle = 'rgba(167,139,250,.04)';
        ctx.fillRect(i * STEP, TOP_PAD, BAR_W, CHART_H);
      }
    });

    if (max > 0 && avg > 0) {
      var avgY = TOP_PAD + CHART_H - Math.round(avg / max * CHART_H);
      ctx.strokeStyle = '#2a3347';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(0, avgY); ctx.lineTo(W, avgY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#4b5563';
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('avg ' + avg.toFixed(1), W - 2, avgY - 3);
    }

    buckets.forEach(function(b, i) {
      var x    = i * STEP;
      var h    = max === 0 ? 2 : Math.max(2, Math.round(b.count / max * CHART_H));
      var barY = TOP_PAD + CHART_H - h;

      ctx.fillStyle = barColor(b.count);
      ctx.fillRect(x, barY, BAR_W, h);

      if (b.count > 0) {
        ctx.fillStyle = b.count === max ? '#c4b5fd' : (b.count > avg ? '#a6acb8' : '#6b7280');
        ctx.font = (b.count === max ? 'bold ' : '') + '8px monospace';
        ctx.textAlign = 'center';
        var labelY = barY - 3;
        ctx.fillText(b.count, x + BAR_W / 2, labelY > TOP_PAD + 8 ? labelY : TOP_PAD + 8);
      }

      ctx.fillStyle = (b.dow === 0 || b.dow === 6) ? '#6b7280' : '#4b5563';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.d, x + BAR_W / 2, TOP_PAD + CHART_H + 13);

      if (b.dow === 1 || b.dow === 5) {
        ctx.fillStyle = '#374151';
        ctx.font = '7px monospace';
        ctx.fillText(DOW[b.dow], x + BAR_W / 2, TOP_PAD + CHART_H + 24);
      }
    });

    var dtip = document.getElementById('tl-detail-tip');
    canvas.onmousemove = function(e) {
      var rect = canvas.getBoundingClientRect();
      var idx  = Math.floor((e.clientX - rect.left) / STEP);
      if (dtip && idx >= 0 && idx < buckets.length) {
        var b = buckets[idx];
        dtip.textContent = b.key + '  ' + DOW[b.dow] + '  ·  ' + b.count + ' message' + (b.count !== 1 ? 's' : '');
        dtip.style.left  = Math.min(e.clientX + 14, window.innerWidth - 220) + 'px';
        dtip.style.top   = (e.clientY - 36) + 'px';
        dtip.classList.remove('hidden');
      } else if (dtip) {
        dtip.classList.add('hidden');
      }
    };
    canvas.onmouseleave = function() { if (dtip) dtip.classList.add('hidden'); };

    overlay.classList.remove('hidden');
  }

  var _dtOverlay = document.getElementById('tl-detail-overlay');
  var _dtCls     = document.getElementById('tl-detail-cls');
  function closeDetail() {
    if (_dtOverlay) _dtOverlay.classList.add('hidden');
    var dtip = document.getElementById('tl-detail-tip');
    if (dtip) dtip.classList.add('hidden');
  }
  if (_dtCls) _dtCls.addEventListener('click', closeDetail);
  if (_dtOverlay) _dtOverlay.addEventListener('click', function(e) {
    if (e.target === _dtOverlay) closeDetail();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeDetail();
  });

  function mkre(t, flags) {
    var esc = t.replace(/[.*+?^\${}()|[\]\\]/g,'\\$&');
    var pre = /^\w/.test(t) ? '\\b' : '';
    var suf = /\w$/.test(t) ? '\\b' : '';
    return new RegExp(pre + esc + suf, flags || 'i');
  }

  function scanIntel() {
    Object.keys(INTEL).forEach(function(cat) {
      var btn = document.querySelector('.fbtn[data-intel="' + cat + '"]');
      if (!btn) return;
      var count = document.querySelectorAll('.msg[data-intel~="' + cat + '"]').length;
      var cnt = btn.querySelector('.cnt');
      if (cnt) cnt.textContent = count ? ' ' + count : '';
      btn.classList.toggle('fbtn-zero', count === 0);
    });
    addIntelBadges();
  }

  function msgVisible(c) {
    if (c.classList.contains('search-hide')) return false;
    if (main === 'all') return true;
    if (main === 'messages') return c.classList.contains('has-text');
    if (main === 'files') return sub === 'all' ? c.classList.contains('has-files') : c.classList.contains('has-' + sub);
    return true;
  }

  var _pre = {};
  function _buildPre() {
    var msgs = document.querySelectorAll('#msg-layout .msg');
    ['all:all','messages:all','files:all','files:image','files:video','files:audio','files:other'].forEach(function(k) {
      var sp = k.split(':'), m = sp[0], s = sp[1];
      var cv = new Set(), sv = new Set();
      msgs.forEach(function(c) {
        var ok = m === 'all' ||
          (m === 'messages' && c.classList.contains('has-text')) ||
          (m === 'files' && (s === 'all' ? c.classList.contains('has-files') : c.classList.contains('has-' + s)));
        if (ok) { cv.add(c.parentElement); sv.add(c.parentElement.parentElement); }
      });
      _pre[k] = { cv: cv, sv: sv };
    });
  }

  function highlightIntel(cat) {
    document.querySelectorAll('.msg').forEach(function(card) {
      var body = card.querySelector('.body');
      if (!body) return;
      if (body.dataset.orig === undefined) body.dataset.orig = body.textContent;
      var orig = body.dataset.orig;
      var cats = cat ? [cat] : (card.dataset.intel || '').split(' ').filter(Boolean);
      if (!cats.length) { body.textContent = orig; return; }
      var html = orig.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      var terms = [];
      cats.forEach(function(c) { terms = terms.concat(getActiveIntel(c)); });
      terms = terms.filter(function(t,i,a){return a.indexOf(t)===i;});
      terms.sort(function(a,b){return b.length-a.length;});
      terms.forEach(function(term) {
        var esc = term.replace(/[.*+?^\${}()|[\]\\]/g,'\\$&');
        var pre = /^\w/.test(term) ? '\\b' : '';
        var suf = /\w$/.test(term) ? '\\b' : '';
        html = html.replace(new RegExp(pre+'('+esc+')'+suf,'gi'),'<mark class="hl">$1</mark>');
      });
      body.innerHTML = html;
    });
  }

  function applyFilter() {
    var layout = document.getElementById('msg-layout');
    if (layout) { layout.dataset.filter = main; layout.dataset.sub = sub; }

    var searchEl_ = document.getElementById('msg-search');
    var searchActive = searchEl_ && !!searchEl_.value.trim();
    var key = (main || 'all') + ':' + (sub || 'all');
    var pre = !searchActive && _pre[key];

    var cv, sv;
    if (pre) {
      cv = pre.cv; sv = pre.sv;
    } else {
      cv = new Set(); sv = new Set();
      document.querySelectorAll('#msg-layout .msg').forEach(function(c) {
        if (msgVisible(c)) { cv.add(c.parentElement); sv.add(c.parentElement.parentElement); }
      });
    }

    document.querySelectorAll('#msg-layout .chan').forEach(function(ch) { ch.classList.toggle('hidden', !cv.has(ch)); });
    document.querySelectorAll('#msg-layout .srv').forEach(function(sv_) { sv_.classList.toggle('hidden', !sv.has(sv_)); });
  }

  document.querySelectorAll('.fbtn[data-main]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      main = btn.dataset.main;
      document.querySelectorAll('.fbtn[data-main]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var subRow        = document.getElementById('sub-row');
      var msgLayout     = document.getElementById('msg-layout');
      var mentionLayout = document.getElementById('mention-layout');
      var hmSection     = document.getElementById('heatmap-section');
      var tlSection     = document.getElementById('timeline-section');
      var wwSection     = document.getElementById('words-section');
      var intelPanelEl  = document.getElementById('intel-panel');
      if (main === 'heatmap') {
        if (msgLayout)     msgLayout.classList.add('hidden');
        if (mentionLayout) mentionLayout.classList.add('hidden');
        if (hmSection)     hmSection.classList.remove('hidden');
        if (tlSection)     tlSection.classList.add('hidden');
        if (wwSection)     wwSection.classList.add('hidden');
        if (intelPanelEl)  intelPanelEl.classList.add('intel-hidden');
        if (subRow)        subRow.classList.remove('visible');
      } else if (main === 'timeline') {
        if (msgLayout)     msgLayout.classList.add('hidden');
        if (mentionLayout) mentionLayout.classList.add('hidden');
        if (hmSection)     hmSection.classList.add('hidden');
        if (tlSection)     tlSection.classList.remove('hidden');
        if (wwSection)     wwSection.classList.add('hidden');
        if (intelPanelEl)  intelPanelEl.classList.add('intel-hidden');
        if (subRow)        subRow.classList.remove('visible');
        drawTimeline();
      } else if (main === 'words') {
        if (msgLayout)     msgLayout.classList.add('hidden');
        if (mentionLayout) mentionLayout.classList.add('hidden');
        if (hmSection)     hmSection.classList.add('hidden');
        if (tlSection)     tlSection.classList.add('hidden');
        if (wwSection)     wwSection.classList.remove('hidden');
        if (intelPanelEl)  intelPanelEl.classList.add('intel-hidden');
        if (subRow)        subRow.classList.remove('visible');
      } else {
        if (hmSection)     hmSection.classList.add('hidden');
        if (tlSection)     tlSection.classList.add('hidden');
        if (wwSection)     wwSection.classList.add('hidden');
        if (main === 'mentions') {
          if (msgLayout)     msgLayout.classList.add('hidden');
          if (mentionLayout) mentionLayout.classList.remove('hidden');
          if (subRow)        subRow.classList.remove('visible');
        } else {
          if (msgLayout)     msgLayout.classList.remove('hidden');
          if (mentionLayout) mentionLayout.classList.add('hidden');
          if (main === 'files') subRow.classList.add('visible');
          else subRow.classList.remove('visible');
          applyFilter();
        }
      }
    });
  });

  document.querySelectorAll('.fbtn[data-sub]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      sub = btn.dataset.sub;
      document.querySelectorAll('.fbtn[data-sub]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyFilter();
    });
  });

  document.querySelectorAll('.fbtn[data-intel]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var cat = btn.dataset.intel;
      var params = new URLSearchParams(window.location.search);
      if (params.get('intel') === cat) {
        params.delete('intel');
      } else {
        params.set('intel', cat);
        params.delete('page');
      }
      if (main && main !== 'all') params.set('main', main);
      if (sub  && sub  !== 'all') params.set('sub', sub);
      window.location.search = params.toString();
    });
  });

  _buildPre();

  if (main !== 'all') {
    document.querySelectorAll('.fbtn[data-main]').forEach(function(b) { b.classList.remove('active'); });
    var _mb = document.querySelector('.fbtn[data-main="' + main + '"]');
    if (_mb) _mb.classList.add('active');
    var _subRow = document.getElementById('sub-row');
    if (main === 'files' && _subRow) _subRow.classList.add('visible');
    var _intelPanelEl = document.getElementById('intel-panel');
    if ((main === 'heatmap' || main === 'timeline' || main === 'words') && _intelPanelEl) _intelPanelEl.classList.add('intel-hidden');
  }
  if (sub !== 'all') {
    document.querySelectorAll('.fbtn[data-sub]').forEach(function(b) { b.classList.remove('active'); });
    var _sb = document.querySelector('.fbtn[data-sub="' + sub + '"]');
    if (_sb) _sb.classList.add('active');
  }
  if (main === 'files' || main === 'messages') {
    var _layout = document.getElementById('msg-layout');
    if (_layout) { _layout.dataset.filter = main; _layout.dataset.sub = sub; }
    applyFilter();
  }

  document.querySelectorAll('a.pbtn').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      var url = new URL(a.href, window.location.href);
      if (main && main !== 'all') url.searchParams.set('main', main);
      else url.searchParams.delete('main');
      if (sub && sub !== 'all') url.searchParams.set('sub', sub);
      else url.searchParams.delete('sub');
      window.location.href = url.toString();
    });
  });

  scanIntel();
  var activeIntelParam = new URLSearchParams(window.location.search).get('intel');
  if (activeIntelParam) {
    var ab = document.querySelector('.fbtn[data-intel="' + activeIntelParam + '"]');
    if (ab) ab.classList.add('active');
    highlightIntel(activeIntelParam);
  } else {
    highlightIntel(null);
  }

  function rescan() {
    document.querySelectorAll('.msg').forEach(function(card) {
      var body = card.querySelector('.body');
      var text = body ? body.textContent.toLowerCase() : '';
      var matched = [];
      Object.keys(INTEL).forEach(function(cat) {
        var terms = getActiveIntel(cat);
        for (var i = 0; i < terms.length; i++) {
          if (mkre(terms[i].toLowerCase()).test(text)) { matched.push(cat); break; }
        }
      });
      card.dataset.intel = matched.join(' ');
    });
    Object.keys(INTEL).forEach(function(cat) {
      var btn = document.querySelector('.fbtn[data-intel="' + cat + '"]');
      if (!btn) return;
      var count = document.querySelectorAll('.msg[data-intel~="' + cat + '"]').length;
      var cnt = btn.querySelector('.cnt');
      if (cnt) cnt.textContent = count ? ' ' + count : '';
    });
    addIntelBadges();
    var curIntel = new URLSearchParams(window.location.search).get('intel');
    highlightIntel(curIntel || null);
    applyFilter();
  }

  var termsPanel   = document.getElementById('terms-panel');
  var termsOverlay = document.getElementById('terms-overlay');
  var termsToggle  = document.getElementById('terms-toggle');

  function openTerms()  { if (termsPanel) termsPanel.classList.remove('hidden'); if (termsOverlay) termsOverlay.classList.remove('hidden'); }
  function closeTerms() { if (termsPanel) termsPanel.classList.add('hidden');    if (termsOverlay) termsOverlay.classList.add('hidden'); }

  if (termsToggle)  termsToggle.addEventListener('click', openTerms);
  if (termsOverlay) termsOverlay.addEventListener('click', closeTerms);
  var termsCls = document.querySelector('.terms-cls');
  if (termsCls) termsCls.addEventListener('click', closeTerms);

  document.querySelectorAll('.tchip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      var key = chip.dataset.cat + ':' + chip.dataset.term;
      if (disabledTerms.has(key)) { disabledTerms.delete(key); chip.classList.remove('off'); }
      else                         { disabledTerms.add(key);    chip.classList.add('off'); }
      rescan();
    });
  });

  document.querySelectorAll('.rank li[data-id]').forEach(function(li) {
    li.addEventListener('click', function() {
      var id = li.dataset.id;
      var wasSel = li.classList.contains('sel');
      document.querySelectorAll('.rank li[data-id]').forEach(function(o) { o.classList.remove('sel'); });
      var filter = wasSel ? null : id;
      if (!wasSel) li.classList.add('sel');
      ['#main-feed','#mention-feed'].forEach(function(sel) {
        var feed = document.querySelector(sel);
        if (!feed) return;
        var chanVis = new Set();
        var srvVis  = new Set();
        feed.querySelectorAll('.msg').forEach(function(c) {
          var show = filter === null || c.dataset.sender === filter;
          c.classList.toggle('hidden', !show);
          if (show) { chanVis.add(c.parentElement); srvVis.add(c.parentElement.parentElement); }
        });
        feed.querySelectorAll('.chan').forEach(function(ch) {
          ch.classList.toggle('hidden', !chanVis.has(ch));
        });
        feed.querySelectorAll('.srv').forEach(function(sv) {
          sv.classList.toggle('hidden', !srvVis.has(sv));
        });
      });
    });
  });

  var searchEl = document.getElementById('msg-search');
  var searchTimer = null;
  if (searchEl) {
    searchEl.addEventListener('input', function() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function() {
        var q = searchEl.value.trim().toLowerCase();
        var chanVis = new Set();
        var srvVis  = new Set();
        document.querySelectorAll('.msg').forEach(function(c) {
          c.classList.toggle('search-hide', !!q && c.textContent.toLowerCase().indexOf(q) === -1);
          if (msgVisible(c)) { chanVis.add(c.parentElement); srvVis.add(c.parentElement.parentElement); }
        });
        document.querySelectorAll('.chan').forEach(function(ch) { ch.classList.toggle('hidden', !chanVis.has(ch)); });
        document.querySelectorAll('.srv').forEach(function(sv) { sv.classList.toggle('hidden', !srvVis.has(sv)); });
      }, 180);
    });
  }

  // word wall — hover tooltip + click to filter messages by that word
  var wwTip = document.getElementById('ww-tip');
  document.querySelectorAll('.ww-word').forEach(function(w) {
    w.addEventListener('mousemove', function(e) {
      if (!wwTip) return;
      wwTip.innerHTML = '<b>' + w.dataset.word + '</b>&nbsp;&nbsp;used ' + w.dataset.count + ' time' + (w.dataset.count !== '1' ? 's' : '');
      wwTip.style.left = Math.min(e.clientX + 14, window.innerWidth - 200) + 'px';
      wwTip.style.top  = (e.clientY - 40) + 'px';
      wwTip.classList.remove('hidden');
    });
    w.addEventListener('mouseleave', function() { if (wwTip) wwTip.classList.add('hidden'); });
    w.addEventListener('click', function() {
      if (wwTip) wwTip.classList.add('hidden');
      var msgBtn = document.querySelector('.fbtn[data-main="messages"]');
      if (msgBtn) msgBtn.click();
      var se = document.getElementById('msg-search');
      if (se) {
        se.value = w.dataset.word;
        se.dispatchEvent(new Event('input'));
        se.focus();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // keyboard arrow-key page navigation
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      var links = document.querySelectorAll('a.pbtn');
      links.forEach(function(a) {
        if (e.key === 'ArrowLeft'  && a.textContent.indexOf('prev') > -1) a.click();
        if (e.key === 'ArrowRight' && a.textContent.indexOf('next') > -1) a.click();
      });
    }
  });

  // back-to-top button
  var backTop = document.createElement('button');
  backTop.className = 'back-top';
  backTop.textContent = '↑ top';
  document.body.appendChild(backTop);
  window.addEventListener('scroll', function() {
    backTop.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  backTop.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // intel panel toggle
  var _intelToggle = document.getElementById('intel-toggle');
  var _intelPanelToggle = document.getElementById('intel-panel');
  if (_intelToggle && _intelPanelToggle) {
    _intelToggle.addEventListener('click', function() {
      var open = _intelPanelToggle.classList.toggle('intel-hidden');
      _intelToggle.classList.toggle('active', !open);
    });
    // if an intel filter is active from URL, open the panel automatically
    if (new URLSearchParams(window.location.search).get('intel')) {
      _intelPanelToggle.classList.remove('intel-hidden');
      _intelToggle.classList.add('active');
    }
  }

  // sidebar collapse (persisted)
  var _sbEl = document.getElementById('sidebar');
  var _abEl = document.getElementById('app-body');
  var _sbBtn = document.getElementById('sb-collapse');
  var _sbOff = localStorage.getItem('sb-collapsed') === '1';
  function _applySb() {
    if (_sbEl) _sbEl.classList.toggle('collapsed', _sbOff);
    if (_abEl) _abEl.classList.toggle('sb-collapsed', _sbOff);
    if (_sbBtn) _sbBtn.textContent = _sbOff ? '›' : '‹';
  }
  _applySb();
  if (_sbBtn) {
    _sbBtn.addEventListener('click', function() {
      _sbOff = !_sbOff;
      localStorage.setItem('sb-collapsed', _sbOff ? '1' : '0');
      _applySb();
    });
  }

  // sidebar active channel via IntersectionObserver
  if (window.IntersectionObserver) {
    var _sbLinks = document.querySelectorAll('.sb-ch');
    var _io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var _id = entry.target.id;
          _sbLinks.forEach(function(a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + _id);
          });
        }
      });
    }, { threshold: 0, rootMargin: '-5% 0px -85% 0px' });
    document.querySelectorAll('[id*="-ch-"]').forEach(function(el) { _io.observe(el); });
  }

  // swap sidebar nav between messages / mentions
  document.querySelectorAll('.fbtn[data-main]').forEach(function(b2) {
    b2.addEventListener('click', function() {
      var _nm = document.getElementById('sb-nav-main');
      var _ne = document.getElementById('sb-nav-mentions');
      if (b2.dataset.main === 'mentions') {
        if (_nm) _nm.classList.add('hidden');
        if (_ne) _ne.classList.remove('hidden');
      } else {
        if (_nm) _nm.classList.remove('hidden');
        if (_ne) _ne.classList.add('hidden');
      }
    });
  });

});
</script>`;

  const foot = '<div class="foot"><span>nyx · case archive</span><span class="nyx">(=^ ◕ω◕ ^=)</span></div>';

  return head + sidebarHtml +
    '<div class="app-body" id="app-body">' +
    '<div class="top">' + stamp + targetBlock + '</div>' +
    statsBlock + pagerBlock + filterBar + layout + hmHtml + tlHtml + wwHtml +
    (totalPages > 1 ? pagerBlock : '') + foot +
    '</div>' +
    '<div id="tl-tip" class="tl-tip hidden"></div>' +
    '<div class="tl-detail-overlay hidden" id="tl-detail-overlay">' +
      '<div class="tl-detail-modal">' +
        '<div class="tl-detail-hd">' +
          '<span id="tl-detail-title"></span>' +
          '<button class="tl-detail-cls" id="tl-detail-cls">✕</button>' +
        '</div>' +
        '<div class="tl-detail-body"><div class="tl-scroll"><canvas id="tl-detail-canvas"></canvas></div></div>' +
      '</div>' +
    '</div>' +
    '<div class="tl-tip hidden" id="tl-detail-tip"></div>' +
    termsPanelHtml + '</body></html>';
}

async function launchViewer(outDir, mode) {
  const dataFile = mode === 'mentions'
    ? path.join(outDir, 'mentions.json')
    : path.join(outDir, 'messages.json');

  if (!fs.existsSync(dataFile)) {
    throw new Error('no data file at ' + dataFile);
  }

  const data     = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const filesDir = path.resolve(path.join(outDir, 'files'));

  let mentionsData = null;
  if (mode !== 'mentions') {
    const mf = path.join(outDir, 'mentions.json');
    if (fs.existsSync(mf)) mentionsData = JSON.parse(fs.readFileSync(mf, 'utf8'));
  }

  let heatmapData = null;
  const hmf = path.join(outDir, 'heatmap.json');
  if (fs.existsSync(hmf)) heatmapData = JSON.parse(fs.readFileSync(hmf, 'utf8'));

  let timelineData = null;
  const tlf = path.join(outDir, 'timeline.json');
  if (fs.existsSync(tlf)) timelineData = JSON.parse(fs.readFileSync(tlf, 'utf8'));

  let profileData = null;
  const prf = path.join(outDir, 'profile.json');
  if (fs.existsSync(prf)) profileData = JSON.parse(fs.readFileSync(prf, 'utf8'));

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL((req.url || '/'), 'http://localhost');
    const pathname  = decodeURIComponent(parsedUrl.pathname);

    if (pathname === '/viewer.css') {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      fs.createReadStream(path.join(RESOURCE_DIR, 'viewer.css')).pipe(res);
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      const page  = parseInt(parsedUrl.searchParams.get('page') || '0', 10) || 0;
      const intel = parsedUrl.searchParams.get('intel') || null;
      const html  = buildHTML(data, mode, page, intel, mentionsData, heatmapData, timelineData, profileData);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (pathname.startsWith('/files/')) {
      const rel  = pathname.slice('/files/'.length);
      const full = path.resolve(path.join(filesDir, rel));
      if (!full.startsWith(filesDir)) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) { res.writeHead(404).end(); return; }
      const ext = path.extname(full).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
      return;
    }

    res.writeHead(404).end('not found');
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ url: 'http://127.0.0.1:' + port + '/', server, port });
    });
  });
}

async function launchFileBrowser(dir) {
  const absDir = path.resolve(dir);
  const PAGE   = 120;

  function scanFiles(d) {
    const out = [];
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) out.push(...scanFiles(full));
      else out.push(full);
    }
    return out;
  }

  const allFiles = scanFiles(absDir);
  const counts   = { images: 0, gifs: 0, videos: 0, audio: 0, other: 0 };
  for (const f of allFiles) {
    if (isImage(f) && !f.endsWith('.gif')) counts.images++;
    else if (f.endsWith('.gif'))           counts.gifs++;
    else if (isVideo(f))                   counts.videos++;
    else if (isAudio(f))                   counts.audio++;
    else                                   counts.other++;
  }

  function buildBrowserHTML(page, typeFilter) {
    let items = allFiles;
    if (typeFilter === 'images')  items = items.filter(f => isImage(f) && !f.endsWith('.gif'));
    else if (typeFilter === 'gifs')   items = items.filter(f => f.endsWith('.gif'));
    else if (typeFilter === 'videos') items = items.filter(f => isVideo(f));
    else if (typeFilter === 'audio')  items = items.filter(f => isAudio(f));
    else if (typeFilter === 'other')  items = items.filter(f => !isImage(f) && !isVideo(f) && !isAudio(f));

    const total      = items.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE));
    const safePage   = Math.max(0, Math.min(page, totalPages - 1));
    const slice      = items.slice(safePage * PAGE, (safePage + 1) * PAGE);

    const typeParam  = typeFilter ? '&type=' + typeFilter : '';
    const prevBtn    = safePage > 0
      ? '<a class="pbtn" href="/?page=' + (safePage - 1) + typeParam + '">‹ prev</a>'
      : '<span class="pbtn disabled">‹ prev</span>';
    const nextBtn    = safePage < totalPages - 1
      ? '<a class="pbtn" href="/?page=' + (safePage + 1) + typeParam + '">next ›</a>'
      : '<span class="pbtn disabled">next ›</span>';
    const pager      = '<div class="pager">' + prevBtn +
      '<span class="pinfo">' + (safePage + 1) + ' / ' + totalPages + '  ·  ' + total + ' files</span>' +
      nextBtn + '</div>';

    const filterBtns = ['all','images','gifs','videos','audio','other'].map(t => {
      const n   = t === 'all' ? allFiles.length : counts[t] || 0;
      const act = (typeFilter || 'all') === t ? ' active' : '';
      const h   = t === 'all' ? '/?page=0' : '/?page=0&type=' + t;
      return '<a class="fbtn' + act + '" href="' + h + '">' + t + ' <span class="cnt">' + n + '</span></a>';
    }).join('');

    const grid = slice.map(f => {
      const rel  = f.slice(absDir.length).replace(/\\/g, '/');
      const href = '/f' + rel.split('/').map(s => encodeURIComponent(s)).join('/');
      const name = path.basename(f);
      if (isImage(f)) return '<a class="thumb" href="' + href + '" target="_blank"><img src="' + href + '" loading="lazy" alt=""></a>';
      if (isVideo(f)) return '<div class="vid-wrap"><video controls preload="metadata" class="vid"><source src="' + href + '"></video><div class="fn">' + escapeHtml(name) + '</div></div>';
      if (isAudio(f)) return '<div class="aud-wrap"><audio controls preload="none" src="' + href + '"></audio><div class="fn">' + escapeHtml(name) + '</div></div>';
      return '<a class="filechip" href="' + href + '" target="_blank">' + escapeHtml(name) + '</a>';
    }).join('');

    return '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(path.basename(absDir)) + '</title>' +
      '<link rel="stylesheet" href="/viewer.css">' +
      '<style>.grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;align-items:flex-start}' +
      '.thumb img{max-height:200px;max-width:300px;border:1px solid var(--line);display:block;border-radius:1px}' +
      '.vid-wrap,.aud-wrap{border:1px solid var(--line);background:var(--panel);padding:8px;max-width:360px}' +
      '.vid{max-width:100%;max-height:240px;background:#000}' +
      '.fn{font-size:10.5px;color:var(--ink-mute);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:340px}' +
      '.fbtn.active{border-color:var(--target);color:var(--target);background:var(--bg)}' +
      '.cnt{opacity:.55;font-size:10px;margin-left:3px}</style></head>' +
      '<body><div class="frame">' +
      '<div class="top"><div class="stamp">' + escapeHtml(path.basename(absDir)) + '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' + filterBtns + '</div></div>' +
      pager + '<div class="grid">' + grid + '</div>' + (totalPages > 1 ? pager : '') +
      '</div></body></html>';
  }

  const server = http.createServer((req, res) => {
    const u        = new URL(req.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(u.pathname);

    if (pathname === '/viewer.css') {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      fs.createReadStream(path.join(RESOURCE_DIR, 'viewer.css')).pipe(res);
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      const page = parseInt(u.searchParams.get('page') || '0', 10) || 0;
      const type = u.searchParams.get('type') || '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildBrowserHTML(page, type));
      return;
    }

    if (pathname.startsWith('/f/')) {
      const rel  = pathname.slice(3);
      const full = path.resolve(path.join(absDir, rel));
      if (!full.startsWith(absDir)) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) { res.writeHead(404).end(); return; }
      const ext  = path.extname(full).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
      return;
    }

    res.writeHead(404).end('not found');
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ url: 'http://127.0.0.1:' + server.address().port + '/', server });
    });
  });
}

module.exports = { launchViewer, launchFileBrowser, buildHTML };