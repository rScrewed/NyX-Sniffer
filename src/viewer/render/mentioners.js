'use strict';

const { escapeHtml, avatarUrl } = require('../html');

function renderMentioners(mentioners) {
  if (!mentioners || !mentioners.length) return '';

  const rows = mentioners.map((user) =>
    '<li data-id="' + escapeHtml(user.id) + '"><img src="' + escapeHtml(avatarUrl(user.id, user.avatar, null)) + '" alt="">' +
    '<span class="t">' + escapeHtml(user.tag || user.id) + '</span><span class="n">' + user.count + '×</span></li>').join('');

  return '<aside class="rank"><h3>RANKED MENTIONERS</h3><ol>' + rows + '</ol></aside>';
}

module.exports = { renderMentioners };
