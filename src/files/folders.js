'use strict';

const fs = require('fs');
const path = require('path');
const { CHECKPOINT_FILE } = require('../scan/checkpoint');

function ensureDirectory(directory) {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
}

function moveTemporaryFiles(temporaryDirectory, filesDirectory) {
  ensureDirectory(filesDirectory);

  for (const entry of fs.readdirSync(temporaryDirectory)) {
    if (entry === CHECKPOINT_FILE) continue;
    const source = path.join(temporaryDirectory, entry);
    const destination = path.join(filesDirectory, entry);

    if (!fs.statSync(source).isDirectory()) {
      if (!fs.existsSync(destination)) fs.renameSync(source, destination);
      continue;
    }

    ensureDirectory(destination);
    for (const file of fs.readdirSync(source)) {
      const fileDestination = path.join(destination, file);
      if (!fs.existsSync(fileDestination)) fs.renameSync(path.join(source, file), fileDestination);
    }
    fs.rmSync(source, { recursive: true, force: true });
  }

  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

module.exports = { ensureDirectory, moveTemporaryFiles };
