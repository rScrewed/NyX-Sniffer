'use strict';

const fs = require('fs');
const path = require('path');

const MAX_NUMBERED_TOKENS = 100;

function envFilePath() {
  return path.join(process.cwd(), '.env');
}

function hasEnvFile() {
  return fs.existsSync(envFilePath());
}

function unquote(value) {
  const quoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
  return quoted ? value.slice(1, -1) : value;
}

function loadEnv() {
  if (!hasEnvFile()) return {};

  const env = {};
  for (const rawLine of fs.readFileSync(envFilePath(), 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (key) env[key] = unquote(line.slice(separator + 1).trim());
  }
  return env;
}

function loadTokens(env) {
  const numbered = [];
  for (let i = 1; i <= MAX_NUMBERED_TOKENS; i++) {
    const value = env['Token' + i];
    if (value && value.trim()) numbered.push(value.trim());
  }
  if (numbered.length > 0) return numbered;
  if (env.Token && env.Token.trim()) return [env.Token.trim()];
  return [];
}

function saveEnv(env) {
  const lines = Object.entries(env)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => key + '=' + value);
  fs.writeFileSync(envFilePath(), lines.join('\n') + '\n', 'utf8');
}

module.exports = { loadEnv, loadTokens, saveEnv, hasEnvFile };
