'use strict';

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
};

const isImage = (filePath) => /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(filePath || '');
const isVideo = (filePath) => /\.(mp4|webm|mov|m4v)$/i.test(filePath || '');
const isAudio = (filePath) => /\.(mp3|ogg|wav|m4a|flac|aac|opus)$/i.test(filePath || '');

module.exports = { MIME_TYPES, isImage, isVideo, isAudio };
