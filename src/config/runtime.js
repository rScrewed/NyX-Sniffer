'use strict';

const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function isPackaged() {
  try {
    return require('node:sea').isSea();
  } catch {
    return false;
  }
}

function runtimeRoot() {
  return isPackaged() ? path.dirname(process.execPath) : PROJECT_ROOT;
}

function assetPath(sourceDirectory, fileName) {
  return isPackaged()
    ? path.join(path.dirname(process.execPath), fileName)
    : path.join(sourceDirectory, fileName);
}

function commandLineArguments() {
  return process.argv.slice(2);
}

module.exports = { isPackaged, runtimeRoot, assetPath, commandLineArguments, PROJECT_ROOT };
