'use strict';

const FILENAME_RULES = [
  [/^(IMG|VID|AUD|PTT)-\d{8}-WA\d+/i, 'WhatsApp'],
  [/^FB_IMG_\d+/i, 'Facebook'],
  [/^received_\d{10,}/i, 'Messenger'],
  [/^Snapchat-\d+/i, 'Snapchat'],
  [/^(image|video)_cropper_\d+/i, 'Android (cropped)'],

  [/^PXL_\d{8}_\d+/i, 'Google Pixel'],
  [/^Screenshot_\d{8}[-_]\d{6}/i, 'Android screenshot'],
  [/^(IMG|VID)_\d{8}_\d{6}/i, 'Android'],
  [/^RPReplay_Final/i, 'iPhone screen recording'],
  [/^IMG_E\d{3,}\./i, 'iPhone (edited photo)'],
  [/^IMG_\d{3,}\.(heic|heif|mov)$/i, 'iPhone'],
  [/^IMG_\d{3,}\.(jpe?g|png)$/i, 'iPhone or camera'],

  [/^WIN_\d{8}_/i, 'Windows Camera'],
  [/^Screenshot \d{4}-\d{2}-\d{2} \d{6}/i, 'Windows screenshot'],
  [/^Screenshot \(\d+\)/i, 'Windows screenshot'],
  [/^Screen ?Shot \d{4}-\d{2}-\d{2}/i, 'macOS screenshot'],
  [/^Screenshot \d{4}-\d{2}-\d{2} at /i, 'macOS screenshot'],

  [/^_?DSC[N_]?\d+/i, 'camera (Sony/Nikon)'],
  [/^(GOPR|GP\d|GH\d|GX\d)\d+/i, 'GoPro'],
  [/^DJI_\d+/i, 'DJI drone'],
  [/^P\d{7}\./i, 'Panasonic/Olympus camera'],

  [/^unknown\.(png|jpe?g|webp|gif)$/i, 'pasted into Discord'],
  [/^image\.(png|jpe?g|webp|gif)$/i, 'pasted image'],
];

const EXTENSION_RULES = [
  [/\.(heic|heif)$/i, 'Apple device'],
  [/\.(cr2|cr3|nef|arw|orf|raf|rw2|dng)$/i, 'camera RAW'],
];

function baseName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.split(/[?#]/)[0].split(/[\\/]/).pop() || '';
}

function sourceOf(name) {
  const base = baseName(name);
  if (!base) return null;

  for (const [pattern, label] of FILENAME_RULES) {
    if (pattern.test(base)) return label;
  }
  for (const [pattern, label] of EXTENSION_RULES) {
    if (pattern.test(base)) return label;
  }
  return null;
}

function messageSources(message) {
  if (!message) return [];

  const names = [];
  for (const file of message.files || []) {
    if (file && file.localPath) names.push(file.localPath);
  }
  for (const attachment of message.attachments || []) {
    if (typeof attachment === 'string') names.push(attachment);
    else if (attachment && attachment.url) names.push(attachment.url);
  }

  const sources = [];
  for (const name of names) {
    const source = sourceOf(name);
    if (source) sources.push({ name: baseName(name), source });
  }
  return sources;
}

module.exports = { sourceOf, messageSources };
