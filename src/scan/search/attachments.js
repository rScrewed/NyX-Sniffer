'use strict';

const { categoryForPath } = require('../../shared/fileCategories');

const CATEGORY_LABELS = { image: 'image', gif: 'gif', video: 'video', audio: 'audio', document: 'file', other: 'file' };

function extractFileUrls(message) {
  const files = [];
  for (const attachment of message.attachments || []) {
    files.push({ url: attachment.url, type: 'attachment', name: attachment.filename });
  }
  for (const embed of message.embeds || []) {
    if (embed.image && embed.image.url) files.push({ url: embed.image.url, type: 'embed_image', name: null });
    if (embed.thumbnail && embed.thumbnail.url) files.push({ url: embed.thumbnail.url, type: 'embed_thumbnail', name: null });
    if (embed.video && embed.video.url) files.push({ url: embed.video.url, type: 'embed_video', name: null });
  }
  return files;
}

function describeFile(file) {
  if (file.name) return file.name;
  if (file.url) return file.url.split('/').pop().split('?')[0];
  return CATEGORY_LABELS[categoryForPath(file.url || '').key] || 'file';
}

function previewMessage(message) {
  const text = (message.content || '').replace(/\s+/g, ' ').trim();
  if (text) return text.length > 60 ? text.slice(0, 60) + '…' : text;
  if (message.attachments && message.attachments.length) {
    return message.attachments.length + ' attachment' + (message.attachments.length > 1 ? 's' : '');
  }
  if (message.embeds && message.embeds.length) return '(embed, no text)';
  return '(empty message)';
}

async function downloadMessageFiles({ message, guildId, filesDirectory, downloader, report, setMood }) {
  const fileUrls = extractFileUrls(message);
  if (fileUrls.length === 0) return [];

  const savedFiles = [];
  setMood('eating');

  for (let index = 0; index < fileUrls.length; index++) {
    const file = fileUrls[index];
    const progress = fileUrls.length > 1 ? '  (' + (index + 1) + '/' + fileUrls.length + ')' : '';
    report('getting ' + describeFile(file) + progress + '...');

    const localPath = await downloader.download(file.url, filesDirectory, {
      guildId,
      channelId: message.channel_id,
      messageId: message.id,
    });
    if (localPath) {
      savedFiles.push({
        localPath,
        type: file.type,
        originalUrl: file.url,
        guildId,
        channelId: message.channel_id,
        messageId: message.id,
      });
    }
  }

  setMood('hunting');
  return savedFiles;
}

module.exports = { previewMessage, downloadMessageFiles };
