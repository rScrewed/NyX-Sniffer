'use strict';

const FILE_CATEGORIES = [
  { key: 'image', folder: 'images', label: 'img', extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'bmp', 'tiff', 'tif', 'avif'] },
  { key: 'gif', folder: 'gifs', label: 'gif', extensions: ['gif'] },
  { key: 'video', folder: 'videos', label: 'vid', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'wmv', 'flv', '3gp'] },
  { key: 'audio', folder: 'audio', label: 'audio', extensions: ['mp3', 'ogg', 'wav', 'm4a', 'flac', 'aac', 'opus'] },
  { key: 'document', folder: 'documents', label: 'doc', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', '7z'] },
];

const OTHER_CATEGORY = { key: 'other', folder: 'other', label: 'other', extensions: [] };

const BY_EXTENSION = new Map();
for (const category of FILE_CATEGORIES) {
  for (const extension of category.extensions) BY_EXTENSION.set(extension, category);
}

function categoryForExtension(extension) {
  return BY_EXTENSION.get(String(extension).toLowerCase()) || OTHER_CATEGORY;
}

function categoryForPath(filePath) {
  const extension = (filePath.split('.').pop() || '').toLowerCase();
  return categoryForExtension(extension);
}

function countByCategory(files) {
  const counts = {};
  for (const category of [...FILE_CATEGORIES, OTHER_CATEGORY]) counts[category.key] = 0;
  for (const file of files) counts[categoryForPath(file.localPath || file.originalUrl || '').key]++;
  return counts;
}

function summarizeCounts(counts) {
  return [...FILE_CATEGORIES, OTHER_CATEGORY]
    .filter((category) => counts[category.key] > 0)
    .map((category) => counts[category.key] + ' ' + category.label)
    .join('  ');
}

function summarizeFiles(files) {
  return summarizeCounts(countByCategory(files));
}

module.exports = {
  categoryForExtension,
  categoryForPath,
  countByCategory,
  summarizeCounts,
  summarizeFiles,
};
