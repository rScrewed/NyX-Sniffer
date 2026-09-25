'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { escapeHtml } = require('./html');
const { MIME_TYPES, isImage, isVideo, isAudio } = require('./media');
const { serveStylesheet } = require('./staticAssets');

const PAGE_SIZE = 120;
const LOOPBACK = '127.0.0.1';
const TYPE_FILTERS = ['all', 'images', 'gifs', 'videos', 'audio', 'other'];

const BROWSER_STYLES = [
  '.grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;align-items:flex-start}',
  '.thumb img{max-height:200px;max-width:300px;border:1px solid var(--line);display:block;border-radius:1px}',
  '.vid-wrap,.aud-wrap{border:1px solid var(--line);background:var(--panel);padding:8px;max-width:360px}',
  '.vid{max-width:100%;max-height:240px;background:#000}',
  '.fn{font-size:10.5px;color:var(--ink-mute);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:340px}',
  '.fbtn.active{border-color:var(--target);color:var(--target);background:var(--bg)}',
  '.cnt{opacity:.55;font-size:10px;margin-left:3px}',
].join('');

function listFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function isGif(filePath) {
  return filePath.endsWith('.gif');
}

function categoryOf(filePath) {
  if (isImage(filePath) && !isGif(filePath)) return 'images';
  if (isGif(filePath)) return 'gifs';
  if (isVideo(filePath)) return 'videos';
  if (isAudio(filePath)) return 'audio';
  return 'other';
}

function countByCategory(files) {
  const counts = { images: 0, gifs: 0, videos: 0, audio: 0, other: 0 };
  for (const file of files) counts[categoryOf(file)]++;
  return counts;
}

function filterFiles(files, typeFilter) {
  if (typeFilter === 'images') return files.filter((file) => isImage(file) && !isGif(file));
  if (typeFilter === 'gifs') return files.filter(isGif);
  if (typeFilter === 'videos') return files.filter(isVideo);
  if (typeFilter === 'audio') return files.filter(isAudio);
  if (typeFilter === 'other') return files.filter((file) => !isImage(file) && !isVideo(file) && !isAudio(file));
  return files;
}

function renderPager(page, totalPages, total, typeFilter) {
  const typeParam = typeFilter ? '&type=' + typeFilter : '';
  const previous = page > 0
    ? '<a class="pbtn" href="/?page=' + (page - 1) + typeParam + '">‹ prev</a>'
    : '<span class="pbtn disabled">‹ prev</span>';
  const next = page < totalPages - 1
    ? '<a class="pbtn" href="/?page=' + (page + 1) + typeParam + '">next ›</a>'
    : '<span class="pbtn disabled">next ›</span>';
  return '<div class="pager">' + previous + '<span class="pinfo">' + (page + 1) + ' / ' + totalPages + '  ·  ' + total + ' files</span>' + next + '</div>';
}

function renderFilterButtons(files, counts, typeFilter) {
  return TYPE_FILTERS.map((type) => {
    const count = type === 'all' ? files.length : counts[type] || 0;
    const active = (typeFilter || 'all') === type ? ' active' : '';
    const href = type === 'all' ? '/?page=0' : '/?page=0&type=' + type;
    return '<a class="fbtn' + active + '" href="' + href + '">' + type + ' <span class="cnt">' + count + '</span></a>';
  }).join('');
}

function renderTile(file, rootDirectory) {
  const relative = file.slice(rootDirectory.length).replace(/\\/g, '/');
  const href = '/f' + relative.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  const name = escapeHtml(path.basename(file));

  if (isImage(file)) return '<a class="thumb" href="' + href + '" target="_blank"><img src="' + href + '" loading="lazy" alt=""></a>';
  if (isVideo(file)) return '<div class="vid-wrap"><video controls preload="metadata" class="vid"><source src="' + href + '"></video><div class="fn">' + name + '</div></div>';
  if (isAudio(file)) return '<div class="aud-wrap"><audio controls preload="none" src="' + href + '"></audio><div class="fn">' + name + '</div></div>';
  return '<a class="filechip" href="' + href + '" target="_blank">' + name + '</a>';
}

function renderBrowserPage({ files, counts, rootDirectory, requestedPage, typeFilter }) {
  const matching = filterFiles(files, typeFilter);
  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const page = Math.max(0, Math.min(requestedPage, totalPages - 1));
  const pageFiles = matching.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pager = renderPager(page, totalPages, matching.length, typeFilter);
  const title = escapeHtml(path.basename(rootDirectory));

  return '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title>' +
    '<link rel="stylesheet" href="/viewer.css"><style>' + BROWSER_STYLES + '</style></head>' +
    '<body><div class="frame">' +
    '<div class="top"><div class="stamp">' + title + '</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' + renderFilterButtons(files, counts, typeFilter) + '</div></div>' +
    pager + '<div class="grid">' + pageFiles.map((file) => renderTile(file, rootDirectory)).join('') + '</div>' +
    (totalPages > 1 ? pager : '') +
    '</div></body></html>';
}

function serveRootedFile(response, rootDirectory, relativePath) {
  const fullPath = path.resolve(path.join(rootDirectory, relativePath));
  if (!fullPath.startsWith(rootDirectory)) {
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

async function launchFileBrowser(directory) {
  const rootDirectory = path.resolve(directory);
  const files = listFiles(rootDirectory);
  const counts = countByCategory(files);

  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/viewer.css') return serveStylesheet(response);

    if (pathname === '/' || pathname === '/index.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(renderBrowserPage({
        files,
        counts,
        rootDirectory,
        requestedPage: parseInt(url.searchParams.get('page') || '0', 10) || 0,
        typeFilter: url.searchParams.get('type') || '',
      }));
      return undefined;
    }

    if (pathname.startsWith('/f/')) return serveRootedFile(response, rootDirectory, pathname.slice(3));

    response.writeHead(404).end('not found');
    return undefined;
  });

  return new Promise((resolve) => {
    server.listen(0, LOOPBACK, () => {
      resolve({ url: 'http://' + LOOPBACK + ':' + server.address().port + '/', server });
    });
  });
}

module.exports = { launchFileBrowser };
