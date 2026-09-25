'use strict';

const { escapeHtml, serializeForScript } = require('../html');
const { deriveDataset, selectItems, paginate, countFiles } = require('../dataset');
const { wordlists } = require('../intel/tagging');
const { groupByServer, renderFeed, renderSidebarNav } = require('./feed');
const { renderMentioners } = require('./mentioners');
const { renderTargetBlock } = require('./profileHeader');
const { renderHeatmapPanel, renderTimelinePanel, renderWordWallPanel } = require('./panels');
const { renderFilterBar } = require('./filterBar');
const { renderPager } = require('./pager');
const { renderTermsPanel } = require('./termsPanel');
const { renderSidebar } = require('./sidebar');

const BADGE_COLOURS = {
  location: '#7dd3fc',
  economics: '#4ade80',
  identity: '#f87171',
  social: '#c084fc',
  activities: '#fb923c',
  technical: '#facc15',
  bannable: '#ef4444',
  device: '#8b7cf0',
};

function renderDetailModal() {
  return '<div id="tl-tip" class="tl-tip hidden"></div>' +
    '<div class="tl-detail-overlay hidden" id="tl-detail-overlay">' +
    '<div class="tl-detail-modal">' +
    '<div class="tl-detail-hd">' +
    '<span id="tl-detail-title"></span>' +
    '<button class="tl-detail-cls" id="tl-detail-cls">✕</button>' +
    '</div>' +
    '<div class="tl-detail-body"><div class="tl-scroll"><canvas id="tl-detail-canvas"></canvas></div></div>' +
    '</div>' +
    '</div>' +
    '<div class="tl-tip hidden" id="tl-detail-tip"></div>';
}

function describeVolume({ isMentions, data, totalCount, files }) {
  return isMentions
    ? totalCount + ' mentions  ·  ' + (data.mentioners ? data.mentioners.length : 0) + ' unique senders'
    : totalCount + ' messages  ·  ' + files + ' files';
}

function renderPage(model) {
  const { data, mode, page, intelFilter, query, mentionsData, heatmapData, timelineData, profileData } = model;
  const isMentions = mode === 'mentions';
  const fullItems = (isMentions ? data.mentions : data.messages) || [];
  const derived = deriveDataset(data, fullItems, isMentions);

  const filtered = selectItems(fullItems, { intelFilter, query });
  const view = paginate(filtered, page);
  const grouped = groupByServer(view.items);
  const isFiltered = filtered !== fullItems;
  const files = isFiltered ? countFiles(filtered) : derived.fileCount;
  const volumeText = describeVolume({ isMentions, data, totalCount: view.totalCount, files });

  const cardContext = { mode, targetId: data.userId, targetTag: data.username, targetAvatar: data.targetAvatar };
  const showMentionsFeed = !isMentions && mentionsData && (mentionsData.mentions || []).length > 0;
  const mentionGrouped = showMentionsFeed ? groupByServer(mentionsData.mentions) : {};

  const heatmap = renderHeatmapPanel(heatmapData);
  const timeline = renderTimelinePanel(timelineData);
  const wordWall = renderWordWallPanel(derived.wordWall);
  const mentionsTab = showMentionsFeed
    ? '<button class="fbtn" data-main="mentions">Mentions <span style="opacity:.5;font-size:10px">' + mentionsData.mentions.length + '</span></button>'
    : '';
  const tabs = [mentionsTab, heatmap && heatmap.button, timeline && timeline.button, wordWall && wordWall.button].filter(Boolean);

  const ranking = isMentions ? renderMentioners(data.mentioners) : '';
  const mentionRanking = showMentionsFeed ? renderMentioners(mentionsData.mentioners) : '';
  const layout = '<div class="layout' + (ranking ? ' has-rank' : '') + '" id="msg-layout"><main id="main-feed">' +
    renderFeed({ grouped, idPrefix: 'main', noun: isMentions ? 'mention' : 'message', cardContext }) + '</main>' + ranking + '</div>' +
    (showMentionsFeed
      ? '<div class="layout' + (mentionRanking ? ' has-rank' : '') + ' hidden" id="mention-layout"><main id="mention-feed">' +
        renderFeed({ grouped: mentionGrouped, idPrefix: 'ment', noun: 'mention', cardContext: { ...cardContext, mode: 'mentions' } }) +
        '</main>' + mentionRanking + '</div>'
      : '');

  const navigation = showMentionsFeed
    ? '<div id="sb-nav-main">' + renderSidebarNav(grouped, 'main') + '</div>' +
      '<div id="sb-nav-mentions" class="hidden">' + renderSidebarNav(mentionGrouped, 'ment') + '</div>'
    : renderSidebarNav(grouped, 'main');

  const pager = renderPager({ ...view, intelFilter, query });
  const serverCount = Object.keys(grouped).length;
  const modeLabel = escapeHtml(data.mode || mode);

  const stamp = '<div class="stamp">Profile<span class="sep">·</span>' + escapeHtml((data.mode || mode).toUpperCase()) +
    '<span class="sep">·</span>Gathered ' + escapeHtml(new Date().toISOString().slice(0, 19).replace('T', ' ')) + ' UTC</div>';
  const stats = '<div class="stats"><div><div class="k">Operation</div><div class="v">' + modeLabel + '</div></div>' +
    '<div><div class="k">Volume</div><div class="v">' + escapeHtml(volumeText) + '</div></div>' +
    '<div><div class="k">Servers</div><div class="v">' + serverCount + '</div></div></div>';

  const viewerData = {
    wordlists,
    badgeColours: BADGE_COLOURS,
    intelCounts: derived.intelCounts,
    timelineBuckets: timelineData ? timelineData.buckets : [],
    timelineDaily: derived.dailyCounts,
  };

  return '<!doctype html><html><head><meta charset="utf-8"><title>profile — ' + escapeHtml(data.username || data.userId) +
    '</title><link rel="stylesheet" href="/viewer.css"></head><body>' +
    renderSidebar({ data, mode, volumeText, serverCount, navigation }) +
    '<div class="app-body" id="app-body">' +
    '<div class="top">' + stamp + renderTargetBlock(data, profileData) + '</div>' +
    stats + pager +
    renderFilterBar({ tabs, query, totalCount: fullItems.length, intelCounts: derived.intelCounts }) +
    layout + (heatmap ? heatmap.html : '') + (timeline ? timeline.html : '') + (wordWall ? wordWall.html : '') +
    (view.totalPages > 1 ? pager : '') +
    '<div class="foot"><span>nyx · case archive</span><span class="nyx">(=^ ◕ω◕ ^=)</span></div>' +
    '</div>' +
    renderDetailModal() + renderTermsPanel() +
    '<script id="viewer-data" type="application/json">' + serializeForScript(viewerData) + '</script>' +
    '<script type="module" src="/assets/main.js"></script>' +
    '</body></html>';
}

module.exports = { renderPage };
