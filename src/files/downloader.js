'use strict';

const nodeFetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { categoryForExtension } = require('../shared/fileCategories');
const { ensureDirectory } = require('./folders');

const DOWNLOAD_TIMEOUT_MS = 30000;

function identityKey(url) {
  try {
    const parsed = new URL(url);
    return parsed.host + parsed.pathname;
  } catch {
    return url;
  }
}

function extensionOf(pathname) {
  const match = pathname.match(/\.([^.]+)$/);
  return match ? match[1] : 'unknown';
}

function fileNameFor(pathname, extension, context) {
  if (context && context.guildId && context.channelId && context.messageId) {
    const messageUrl = 'https://discord.com/channels/' + context.guildId + '/' + context.channelId + '/' + context.messageId;
    return messageUrl.replace(/:/g, '').replace(/\//g, '_') + '.' + extension;
  }
  return path.basename(pathname).replace(/[^a-zA-Z0-9._-]/g, '_') || 'file_' + Date.now() + '.' + extension;
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function createDownloader({ fetchImplementation = nodeFetch } = {}) {
  const completed = new Map();
  const inFlight = new Map();
  const claimedPaths = new Map();

  function uniqueDestination(directory, fileName, key) {
    let destination = path.join(directory, fileName);
    for (let suffix = 2; claimedPaths.has(destination) && claimedPaths.get(destination) !== key; suffix++) {
      const dot = fileName.lastIndexOf('.');
      const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
      const extension = dot > 0 ? fileName.slice(dot) : '';
      destination = path.join(directory, stem + '_' + suffix + extension);
    }
    claimedPaths.set(destination, key);
    return destination;
  }

  async function fetchToDisk(url, destinationRoot, context, key) {
    let destination = null;
    try {
      const pathname = new URL(url).pathname;
      const extension = extensionOf(pathname);
      const categoryDirectory = path.join(destinationRoot, categoryForExtension(extension).folder);
      ensureDirectory(categoryDirectory);

      destination = uniqueDestination(categoryDirectory, fileNameFor(pathname, extension, context), key);
      if (fs.existsSync(destination)) return destination;

      const response = await fetchImplementation(url, { timeout: DOWNLOAD_TIMEOUT_MS });
      if (!response.ok) {
        claimedPaths.delete(destination);
        return null;
      }
      const body = await withTimeout(response.buffer(), DOWNLOAD_TIMEOUT_MS, 'body timeout');
      fs.writeFileSync(destination, body);
      return destination;
    } catch {
      if (destination && !fs.existsSync(destination)) claimedPaths.delete(destination);
      return null;
    }
  }

  async function download(url, destinationRoot, context) {
    const key = identityKey(url);

    const existing = completed.get(key);
    if (existing && fs.existsSync(existing)) return existing;

    const pending = inFlight.get(key);
    if (pending) return pending;

    const job = fetchToDisk(url, destinationRoot, context, key)
      .then((result) => {
        if (result) completed.set(key, result);
        return result;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, job);
    return job;
  }

  function registerExisting(messages) {
    for (const message of messages || []) {
      for (const file of message.files || []) {
        if (!file || !file.originalUrl || !file.localPath || !fs.existsSync(file.localPath)) continue;
        const key = identityKey(file.originalUrl);
        completed.set(key, file.localPath);
        claimedPaths.set(file.localPath, key);
      }
    }
  }

  return { download, registerExisting };
}

module.exports = { createDownloader };
