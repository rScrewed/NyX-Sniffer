'use strict';

const { escapeHtml, avatarUrl, formatTimestamp, fileHref } = require('../html');
const { isImage, isVideo, isAudio } = require('../media');
const { getIntelTags } = require('../intel/tagging');
const { messageSources } = require('../intel/deviceSource');

function contentKinds(message) {
  const kinds = [];
  if (message.content && message.content.trim()) kinds.push('text');

  for (const file of message.files || []) {
    if (isImage(file.localPath)) kinds.push('image');
    else if (isVideo(file.localPath)) kinds.push('video');
    else if (isAudio(file.localPath)) kinds.push('audio');
    else kinds.push('other');
  }

  if (message.attachments && message.attachments.length) kinds.push('other');
  if (kinds.length === 0) kinds.push('text');
  return [...new Set(kinds)];
}

function renderFile(file) {
  const href = fileHref(file.localPath);
  const name = (file.localPath || '').split(/[\\/]/).pop();

  if (isImage(file.localPath)) {
    return '    <a class="thumb" href="' + escapeHtml(href) + '" target="_blank"><img src="' + escapeHtml(href) + '" loading="lazy" alt=""></a>';
  }
  if (isVideo(file.localPath)) {
    return '    <video class="vid" controls preload="metadata"><source src="' + escapeHtml(href) + '"></video>';
  }
  if (isAudio(file.localPath)) {
    return '    <audio controls preload="none" src="' + escapeHtml(href) + '"></audio>';
  }
  return '    <a class="filechip" href="' + escapeHtml(href) + '" target="_blank">' + escapeHtml(name) + '</a>';
}

function renderExternalAttachment(url) {
  return '    <a class="filechip ext" href="' + escapeHtml(url) + '" target="_blank" rel="noreferrer">' +
    escapeHtml(url.split('/').pop().split('?')[0]) + '</a>';
}

function resolveIdentity(message, { mode, targetId, targetTag, targetAvatar }) {
  if (mode === 'mentions') {
    return { id: message.senderId, tag: message.senderTag, avatar: message.senderAvatar, discriminator: message.senderDiscriminator };
  }
  return { id: message.authorId || targetId, tag: message.authorTag || targetTag || '—', avatar: message.authorAvatar || targetAvatar, discriminator: null };
}

function renderMessageCard(message, context) {
  const identity = resolveIdentity(message, context);
  const avatarSource = identity.id ? avatarUrl(identity.id, identity.avatar, identity.discriminator) : null;
  const kinds = contentKinds(message);
  const sources = messageSources(message);
  const tags = getIntelTags(message);

  const senderAttribute = context.mode === 'mentions' ? ' data-sender="' + escapeHtml(identity.id || '') + '"' : '';
  const intelAttribute = tags ? ' data-intel="' + escapeHtml(tags) + '"' : '';
  const deviceAttribute = sources.length ? ' data-device="1"' : '';
  const hasFiles = kinds.some((kind) => kind !== 'text');
  const classes = kinds.map((kind) => 'has-' + kind).join(' ') + (hasFiles ? ' has-files' : '');

  const parts = [];
  parts.push('<article class="msg ' + classes + '" data-has="' + kinds.join(' ') + '"' + senderAttribute + intelAttribute + deviceAttribute + '>');
  parts.push('  <div class="msg-head">');
  parts.push(avatarSource
    ? '    <img class="av" src="' + escapeHtml(avatarSource) + '" alt="">'
    : '    <div class="av av-blank"></div>');
  parts.push('    <div class="meta">');
  parts.push('      <div class="who">' + escapeHtml(identity.tag || '—') + '</div>');
  parts.push('      <div class="sub">ID ' + escapeHtml(identity.id || '—') + '  ·  ' + escapeHtml(formatTimestamp(message.timestamp)) + '</div>');
  parts.push('    </div>');
  if (message.messageId && message.guildId && message.channelId) {
    const link = 'https://discord.com/channels/' + message.guildId + '/' + message.channelId + '/' + message.messageId;
    parts.push('    <a class="jump" href="' + escapeHtml(link) + '" target="_blank" rel="noreferrer">jump ↗</a>');
  }
  parts.push('  </div>');

  if (message.content && message.content.trim()) {
    parts.push('  <div class="body">' + escapeHtml(message.content) + '</div>');
  }

  if (message.files && message.files.length) {
    parts.push('  <div class="files">');
    for (const file of message.files) parts.push(renderFile(file));
    parts.push('  </div>');
  } else if (message.attachments && message.attachments.length) {
    parts.push('  <div class="files">');
    for (const url of message.attachments) parts.push(renderExternalAttachment(url));
    parts.push('  </div>');
  }

  if (sources.length) {
    const labels = [...new Set(sources.map((entry) => entry.source))];
    parts.push('  <div class="src-chips">' + labels.map((label) => '<span class="src-chip">from: ' + escapeHtml(label) + '</span>').join('') + '</div>');
  }

  parts.push('</article>');
  return parts.join('\n');
}

module.exports = { renderMessageCard };
