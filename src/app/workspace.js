'use strict';

const fs = require('fs');
const path = require('path');
const { isTemporaryDirectory } = require('../scan/checkpoint');

function listDirectories(predicate) {
  return fs.readdirSync('.').filter((name) => {
    try {
      return fs.statSync(name).isDirectory() && predicate(name);
    } catch {
      return false;
    }
  });
}

function hasScanData(directory) {
  return fs.existsSync(path.join(directory, 'messages.json')) || fs.existsSync(path.join(directory, 'mentions.json'));
}

function findScanFolders() {
  return listDirectories(hasScanData);
}

function findInterruptedScans() {
  return listDirectories(isTemporaryDirectory);
}

module.exports = { findScanFolders, findInterruptedScans };
