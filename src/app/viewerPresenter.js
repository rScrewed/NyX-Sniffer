'use strict';

const terminal = require('../terminal');
const { launchViewer } = require('../viewer');

const TYPE_DELAY_MS = 14;

async function presentViewer(folder, mode) {
  const viewer = await launchViewer(folder, mode);
  await terminal.typeLine('  viewer  →  ' + viewer.url, TYPE_DELAY_MS);
  await terminal.typeLine('     ctrl+c to stop', TYPE_DELAY_MS);
}

module.exports = { presentViewer };
