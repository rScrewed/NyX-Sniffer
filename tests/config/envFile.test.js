'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadEnv, loadTokens, saveEnv, hasEnvFile } = require('../../src/config/envFile');
const { makeTempDirectory, removeDirectory, withWorkingDirectory } = require('../support/helpers');

test('loadEnv parses keys, quotes and skips comments', () => {
  const directory = makeTempDirectory();
  try {
    fs.writeFileSync(path.join(directory, '.env'), '# comment\nToken="abc"\nName = value \n\nBroken\nQuoted=\'x y\'\n');
    withWorkingDirectory(directory, () => {
      assert.ok(hasEnvFile());
      assert.deepEqual(loadEnv(), { Token: 'abc', Name: 'value', Quoted: 'x y' });
    });
  } finally {
    removeDirectory(directory);
  }
});

test('loadEnv returns an empty object without a file', () => {
  const directory = makeTempDirectory();
  try {
    withWorkingDirectory(directory, () => {
      assert.equal(hasEnvFile(), false);
      assert.deepEqual(loadEnv(), {});
    });
  } finally {
    removeDirectory(directory);
  }
});

test('loadTokens prefers numbered tokens over a single token', () => {
  assert.deepEqual(loadTokens({ Token: 'solo' }), ['solo']);
  assert.deepEqual(loadTokens({ Token: 'solo', Token1: ' a ', Token2: 'b', Token4: '' }), ['a', 'b']);
  assert.deepEqual(loadTokens({}), []);
});

test('saveEnv writes non-empty values and round-trips', () => {
  const directory = makeTempDirectory();
  try {
    withWorkingDirectory(directory, () => {
      saveEnv({ Token: 'abc', Empty: '', Language: 'en' });
      assert.equal(fs.readFileSync('.env', 'utf8'), 'Token=abc\nLanguage=en\n');
      assert.deepEqual(loadEnv(), { Token: 'abc', Language: 'en' });
    });
  } finally {
    removeDirectory(directory);
  }
});
