'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function makeTempDirectory(prefix = 'nyx-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removeDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
}

function withWorkingDirectory(directory, action) {
  const previous = process.cwd();
  process.chdir(directory);
  const restore = () => process.chdir(previous);
  try {
    const result = action();
    if (result && typeof result.then === 'function') return result.finally(restore);
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

function noopUi() {
  const calls = [];
  return {
    calls,
    log: (message) => calls.push(message),
    setMood() {},
    setSubStatus() {},
    clearSubStatus() {},
  };
}

module.exports = { makeTempDirectory, removeDirectory, withWorkingDirectory, noopUi };
