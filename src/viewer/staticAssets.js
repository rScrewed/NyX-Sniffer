'use strict';

const fs = require('fs');
const path = require('path');
const { assetPath, isPackaged, runtimeRoot } = require('../config/runtime');

const PUBLIC_DIRECTORY = path.join(__dirname, 'public');
const CLIENT_DIRECTORY = path.join(__dirname, 'client');
const PACKAGED_CLIENT_BUNDLE = 'viewer-client.js';
const CLIENT_ENTRY = 'main.js';

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function stylesheetPath() {
  return assetPath(PUBLIC_DIRECTORY, 'viewer.css');
}

function clientScriptPath(name) {
  if (isPackaged()) {
    return name === CLIENT_ENTRY ? path.join(runtimeRoot(), PACKAGED_CLIENT_BUNDLE) : null;
  }
  const resolved = path.resolve(CLIENT_DIRECTORY, name);
  return resolved.startsWith(CLIENT_DIRECTORY + path.sep) ? resolved : null;
}

function serveFile(response, filePath) {
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

function serveStylesheet(response) {
  serveFile(response, stylesheetPath());
}

function serveClientScript(response, name) {
  serveFile(response, clientScriptPath(name));
}

module.exports = { serveStylesheet, serveClientScript };
