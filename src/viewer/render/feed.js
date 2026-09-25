'use strict';

const { escapeHtml } = require('../html');
const { renderMessageCard } = require('./messageCard');

function groupByServer(items) {
  const servers = {};
  for (const item of items) {
    const serverName = item.guildName || item.guildId || 'unknown server';
    const channelName = item.channelName ? '#' + item.channelName : '#unknown';
    if (!servers[serverName]) servers[serverName] = {};
    if (!servers[serverName][channelName]) servers[serverName][channelName] = [];
    servers[serverName][channelName].push(item);
  }

  for (const channels of Object.values(servers)) {
    for (const messages of Object.values(channels)) {
      messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
  }
  return servers;
}

function renderFeed({ grouped, idPrefix, noun, cardContext }) {
  const parts = [];

  Object.keys(grouped).sort().forEach((server, serverIndex) => {
    parts.push('<section class="srv"><h2 id="' + idPrefix + '-srv-' + serverIndex + '">' + escapeHtml(server) + '</h2>');

    Object.keys(grouped[server]).sort().forEach((channel, channelIndex) => {
      const messages = grouped[server][channel];
      const count = messages.length + ' ' + noun + (messages.length === 1 ? '' : 's');
      parts.push('<div class="chan"><div class="chan-head" id="' + idPrefix + '-srv-' + serverIndex + '-ch-' + channelIndex + '">' +
        '<span class="ch">' + escapeHtml(channel) + '</span><span class="cn">' + count + '</span></div>');
      for (const message of messages) parts.push(renderMessageCard(message, cardContext));
      parts.push('</div>');
    });

    parts.push('</section>');
  });

  return parts.join('\n');
}

function renderSidebarNav(grouped, idPrefix) {
  const parts = [];

  Object.keys(grouped).sort().forEach((server, serverIndex) => {
    parts.push('<div class="sb-srv">');
    parts.push('<a class="sb-srv-hd" href="#' + idPrefix + '-srv-' + serverIndex + '"><span class="dot">◆</span><span class="sb-srv-txt">' + escapeHtml(server) + '</span></a>');
    Object.keys(grouped[server]).sort().forEach((channel, channelIndex) => {
      parts.push('<a class="sb-ch" href="#' + idPrefix + '-srv-' + serverIndex + '-ch-' + channelIndex + '"><span class="sb-ch-name">' + escapeHtml(channel) + '</span><span class="sb-cnt">' + grouped[server][channel].length + '</span></a>');
    });
    parts.push('</div>');
  });

  return parts.join('');
}

module.exports = { groupByServer, renderFeed, renderSidebarNav };
