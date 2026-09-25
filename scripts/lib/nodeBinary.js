'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { fetchBuffer, fetchText } = require('./http');

const TAR_BLOCK_SIZE = 512;

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

async function expectedChecksum(baseUrl, fileName) {
  const sums = await fetchText(baseUrl + '/SHASUMS256.txt');
  const line = sums.split('\n').find((candidate) => candidate.trim().endsWith(' ' + fileName));
  if (!line) throw new Error('no ' + fileName + ' published for this Node version');
  return line.trim().split(/\s+/)[0];
}

function extractFromTarball(tarball, entryPath, destination) {
  const archive = zlib.gunzipSync(tarball);
  let offset = 0;

  while (offset + TAR_BLOCK_SIZE <= archive.length) {
    const header = archive.subarray(offset, offset + TAR_BLOCK_SIZE);
    if (header.every((byte) => byte === 0)) break;

    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim(), 8) || 0;
    const dataStart = offset + TAR_BLOCK_SIZE;

    if (name === entryPath) {
      fs.writeFileSync(destination, archive.subarray(dataStart, dataStart + size));
      fs.chmodSync(destination, 0o755);
      return;
    }
    offset = dataStart + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
  }
  throw new Error('could not find ' + entryPath + ' inside the downloaded archive');
}

async function windowsBinary(version, baseUrl, cacheDirectory) {
  const cached = path.join(cacheDirectory, 'node-' + version + '-win-x64.exe');
  const expected = await expectedChecksum(baseUrl, 'win-x64/node.exe');

  if (!fs.existsSync(cached) || sha256(fs.readFileSync(cached)) !== expected) {
    const download = await fetchBuffer(baseUrl + '/win-x64/node.exe');
    if (sha256(download) !== expected) throw new Error('SHA-256 mismatch on node.exe');
    fs.writeFileSync(cached, download);
  }
  return cached;
}

async function unixBinary(version, baseUrl, cacheDirectory, platform, arch) {
  const target = platform + '-' + arch;
  const archiveName = 'node-' + version + '-' + target + '.tar.gz';
  const cachedBinary = path.join(cacheDirectory, 'node-' + version + '-' + target);
  if (fs.existsSync(cachedBinary)) return cachedBinary;

  const expected = await expectedChecksum(baseUrl, archiveName);
  const cachedArchive = path.join(cacheDirectory, archiveName);

  let archive;
  if (fs.existsSync(cachedArchive) && sha256(fs.readFileSync(cachedArchive)) === expected) {
    archive = fs.readFileSync(cachedArchive);
  } else {
    archive = await fetchBuffer(baseUrl + '/' + archiveName);
    if (sha256(archive) !== expected) throw new Error('SHA-256 mismatch on ' + archiveName);
    fs.writeFileSync(cachedArchive, archive);
  }

  extractFromTarball(archive, 'node-' + version + '-' + target + '/bin/node', cachedBinary);
  return cachedBinary;
}

async function officialNodeBinary({ platform, arch, cacheDirectory }) {
  const version = process.version;
  const baseUrl = 'https://nodejs.org/dist/' + version;
  fs.mkdirSync(cacheDirectory, { recursive: true });

  return platform === 'win32'
    ? windowsBinary(version, baseUrl, cacheDirectory)
    : unixBinary(version, baseUrl, cacheDirectory, platform, arch);
}

module.exports = { officialNodeBinary };
