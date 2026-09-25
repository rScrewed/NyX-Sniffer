'use strict';

const { escapeHtml } = require('../html');
const { targetAvatarUrl } = require('./profileHeader');

function renderSidebar({ data, mode, volumeText, serverCount, navigation }) {
  return '<nav class="sidebar" id="sidebar">' +
    '<div class="sb-profile">' +
    '<img class="sb-av" src="' + escapeHtml(targetAvatarUrl(data)) + '" alt="">' +
    '<div class="sb-info">' +
    '<div class="sb-name"><span class="at">▸</span> ' + escapeHtml(data.username || '—') + '</div>' +
    '<div class="sb-uid">' + escapeHtml(data.userId) + '</div>' +
    '</div>' +
    '<button class="sb-collapse" id="sb-collapse" title="toggle sidebar">‹</button>' +
    '</div>' +
    '<div class="sb-stats">' +
    '<div class="sb-stat"><span class="sbk">op</span><span class="sbv">' + escapeHtml(data.mode || mode) + '</span></div>' +
    '<div class="sb-stat"><span class="sbk">vol</span><span class="sbv">' + escapeHtml(volumeText) + '</span></div>' +
    '<div class="sb-stat"><span class="sbk">srvs</span><span class="sbv">' + serverCount + '</span></div>' +
    '</div>' +
    '<div class="sb-nav-label">channels</div>' +
    '<div class="sb-nav" id="sb-nav">' + navigation + '</div>' +
    '</nav>';
}

module.exports = { renderSidebar };
