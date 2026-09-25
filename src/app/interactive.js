'use strict';

const terminal = require('../terminal');
const { loadEnv, hasEnvFile } = require('../config/envFile');
const { applyEnvOverrides } = require('../config/settings');
const { createAccountPool } = require('./accounts');
const { publishResults } = require('./results');
const { runScan } = require('./scanRunner');
const { runStartMenu } = require('./startMenu');

const BANNER_LEAD_IN_MS = 500;

async function runInteractive() {
  terminal.clearScreen();
  await terminal.delay(BANNER_LEAD_IN_MS);
  await terminal.showBanner();

  const env = loadEnv();
  applyEnvOverrides(env);
  const envExistedAtStartup = hasEnvFile();

  const pool = createAccountPool(env);
  pool.envExistedAtStartup = envExistedAtStartup;
  await pool.connect();

  const selection = await runStartMenu(pool);
  if (!selection) return;

  const outcome = await runScan({ selection, pool });
  await publishResults(outcome);
}

module.exports = { runInteractive };
