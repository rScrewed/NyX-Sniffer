'use strict';

const fs = require('fs');
const path = require('path');
const { loadEnv, loadTokens } = require('../config/envFile');
const { createDiscordClient, RATE_LIMIT_STRATEGIES } = require('../discord/client');
const { repairChannelNames } = require('../scan/repairChannelNames');

const consoleUi = {
  log: (message) => console.log(message),
  setMood() {},
  setSubStatus() {},
  clearSubStatus() {},
};

function findScanFolders() {
  return fs.readdirSync('.').filter((name) => {
    try {
      return fs.statSync(name).isDirectory() && (
        fs.existsSync(path.join(name, 'messages.json')) || fs.existsSync(path.join(name, 'mentions.json'))
      );
    } catch {
      return false;
    }
  });
}

function fail(message) {
  console.error('\n  ✗  ' + message + '\n');
  process.exit(1);
}

async function runRepairChannelsCommand(requestedFolder) {
  const [token] = loadTokens(loadEnv());
  if (!token) fail('no Token in .env — run this from the folder that holds your .env');

  const folders = requestedFolder ? [requestedFolder] : findScanFolders();
  if (folders.length === 0) fail('no scan folders found here — pass a folder: npm start -- --resolve-channels <folder>');

  const client = createDiscordClient({ token, rateLimit: RATE_LIMIT_STRATEGIES.WAIT, ui: consoleUi });

  for (const folder of folders) {
    console.log('\n  resolving channel names in ' + folder + '...');
    const { files, resolved, unresolved } = await repairChannelNames({ folder, request: client.request });
    if (files === 0) console.log('  nothing to update (no messages.json or mentions.json)');
    else console.log('  ✓  ' + resolved + ' channel name(s) resolved' + (unresolved ? '  ·  ' + unresolved + ' could not be resolved (deleted or no access)' : ''));
  }
  console.log('\n  reopen the results with: npm start -- --view\n');
}

module.exports = { runRepairChannelsCommand };
