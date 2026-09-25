'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { launchViewer, launchFileBrowser } = require('../viewer');
const { isTemporaryDirectory } = require('../scan/checkpoint');

function findViewableFolders() {
  return fs.readdirSync('.').filter((name) => {
    try {
      return fs.statSync(name).isDirectory() && (
        fs.existsSync(path.join(name, 'messages.json')) ||
        fs.existsSync(path.join(name, 'mentions.json')) ||
        isTemporaryDirectory(name)
      );
    } catch {
      return false;
    }
  });
}

function askForFolder(folders) {
  console.log('\n  available folders:\n');
  folders.forEach((folder, index) => console.log('  [' + (index + 1) + ']  ' + folder));
  console.log('');

  const reader = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    reader.question('  » pick a folder: ', (answer) => {
      reader.close();
      resolve(folders[parseInt(answer, 10) - 1] || folders[0]);
    });
  });
}

async function chooseFolder(requested) {
  if (requested) return requested;

  const folders = findViewableFolders();
  if (folders.length === 0) {
    console.error('\n  ✗  no output folders found\n');
    process.exit(1);
  }
  return folders.length === 1 ? folders[0] : askForFolder(folders);
}

function announce(viewer) {
  console.log('  viewer  →  ' + viewer.url);
  console.log('     ctrl+c to stop\n');
}

async function runViewCommand(requestedFolder) {
  const folder = await chooseFolder(requestedFolder);
  const hasMessages = fs.existsSync(path.join(folder, 'messages.json'));
  const hasMentions = fs.existsSync(path.join(folder, 'mentions.json'));

  if (!hasMessages && !hasMentions) {
    console.log('\n  no JSON data — launching file browser for ' + folder + '...\n');
    announce(await launchFileBrowser(folder));
    return;
  }

  const mode = hasMentions && !hasMessages ? 'mentions' : 'messages';
  console.log('\n  opening ' + folder + ' (' + mode + ')...\n');
  announce(await launchViewer(folder, mode));
}

module.exports = { runViewCommand };
