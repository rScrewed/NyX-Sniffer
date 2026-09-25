'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { MIME_TYPES } = require('./media');
const { renderPage } = require('./render/page');
const { deriveDataset } = require('./dataset');
const { countIntelTagsWithout } = require('./intel/tagging');
const { serveStylesheet, serveClientScript } = require('./staticAssets');

const LOOPBACK = '127.0.0.1';

function readJsonIfPresent(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

function itemsFor(data, mode) {
  return (mode === 'mentions' ? data.mentions : data.messages) || [];
}

function loadScanData(outputDirectory, mode) {
  const dataFile = path.join(outputDirectory, mode === 'mentions' ? 'mentions.json' : 'messages.json');
  if (!fs.existsSync(dataFile)) throw new Error('no data file at ' + dataFile);

  return {
    data: JSON.parse(fs.readFileSync(dataFile, 'utf8')),
    mentionsData: mode !== 'mentions' ? readJsonIfPresent(path.join(outputDirectory, 'mentions.json')) : null,
    heatmapData: readJsonIfPresent(path.join(outputDirectory, 'heatmap.json')),
    timelineData: readJsonIfPresent(path.join(outputDirectory, 'timeline.json')),
    profileData: readJsonIfPresent(path.join(outputDirectory, 'profile.json')),
  };
}

function parseDisabledTerms(rawValue) {
  try {
    const parsed = JSON.parse(rawValue || '[]');
    return Array.isArray(parsed) ? parsed.filter((key) => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

function serveStoredFile(response, filesDirectory, relativePath) {
  const fullPath = path.resolve(path.join(filesDirectory, relativePath));
  if (!fullPath.startsWith(filesDirectory)) {
    response.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(fullPath).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fullPath).pipe(response);
}

async function launchViewer(outputDirectory, mode) {
  const scan = loadScanData(outputDirectory, mode);
  const filesDirectory = path.resolve(path.join(outputDirectory, 'files'));

  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400).end('bad request');
      return undefined;
    }

    if (pathname === '/viewer.css') return serveStylesheet(response);
    if (pathname.startsWith('/assets/')) return serveClientScript(response, pathname.slice('/assets/'.length));

    if (pathname === '/api/intel-counts') {
      const disabled = parseDisabledTerms(url.searchParams.get('off'));
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(countIntelTagsWithout(itemsFor(scan.data, mode), disabled)));
      return undefined;
    }

    if (pathname === '/' || pathname === '/index.html') {
      const html = renderPage({
        ...scan,
        mode,
        page: parseInt(url.searchParams.get('page') || '0', 10) || 0,
        intelFilter: url.searchParams.get('intel') || null,
        query: url.searchParams.get('q') || '',
      });
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(html);
      return undefined;
    }

    if (pathname.startsWith('/files/')) return serveStoredFile(response, filesDirectory, pathname.slice('/files/'.length));

    response.writeHead(404).end('not found');
    return undefined;
  });

  deriveDataset(scan.data, itemsFor(scan.data, mode), mode === 'mentions');
  if (scan.mentionsData) deriveDataset(scan.mentionsData, scan.mentionsData.mentions || [], true);

  return new Promise((resolve) => {
    server.listen(0, LOOPBACK, () => {
      const { port } = server.address();
      resolve({ url: 'http://' + LOOPBACK + ':' + port + '/', server, port });
    });
  });
}

module.exports = { launchViewer };
