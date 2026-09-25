'use strict';

const state = require('./state');
const { isValidUserId } = require('../discord/user');
const { ask, eraseCurrentLine } = require('./question');
const { log, clearPromptArea } = require('./log');
const { setMood } = require('./banner');
const { RESTORE_CURSOR, RESET, DIM } = require('./ansi');

const BACK_ANSWERS = new Set(['0', 'b']);

async function promptToken({ createEnv = false, label: customLabel = null } = {}) {
  if (createEnv) {
    log('');
    log('  no .env — your token will be saved');
    log('');
  }
  const label = customLabel || (createEnv ? '  » Token (saved to .env) : ' : '  » Input |Token| : ');
  const token = await ask(label);
  process.stdout.write(RESTORE_CURSOR);
  return token;
}

async function promptUserId() {
  setMood('hunting');
  while (true) {
    const answer = await ask('  » Target ID    : ');
    eraseCurrentLine();
    if (['b', 'back', '0', ''].includes(answer)) return null;
    if (isValidUserId(answer)) return answer;
  }
}

async function promptFromList({ items, describe, prompt, backLabel = 'Back' }) {
  setMood('idle');
  const startLine = state.outputLine;

  log('');
  items.forEach((item, index) => log('   [' + (index + 1) + ']  ' + describe(item)));
  log('   [0]  ' + backLabel);
  log('');

  let selected = null;
  while (true) {
    const answer = await ask(prompt);
    if (BACK_ANSWERS.has(answer)) break;
    const index = parseInt(answer, 10) - 1;
    if (index >= 0 && index < items.length) {
      selected = items[index];
      break;
    }
    if (answer === '' && items.length > 0) {
      selected = items[0];
      break;
    }
  }

  clearPromptArea(startLine);
  return selected;
}

function promptScanFolder(folders) {
  return promptFromList({
    items: folders,
    describe: (folder) => folder,
    prompt: '  » Folder           : ',
  });
}

function promptInterruptedScan(directories) {
  return promptFromList({
    items: directories,
    describe: (directory) => directory.replace('_tmp_', '') + '  ' + DIM + '(' + directory + ')' + RESET,
    prompt: '  » Continue         : ',
  });
}

async function promptChoice(options, label) {
  const selected = await promptFromList({
    items: options.map((text, index) => ({ text, index })),
    describe: (option) => option.text,
    prompt: '  » ' + (label || 'Choice').padEnd(15) + ': ',
  });
  return selected ? selected.index : null;
}

async function promptOperation() {
  setMood('idle');
  const startLine = state.outputLine;
  const operations = { 1: 'messages', 2: 'files', 3: 'mentions', 4: 'all' };

  log('');
  log('   [1]  Messages');
  log('   [2]  Files');
  log('   [3]  Mentions');
  log('   [4]  All');
  log('   [0]  Back');
  log('');

  while (true) {
    const answer = await ask('  » Operation    : ');
    if (operations[answer] || BACK_ANSWERS.has(answer)) {
      clearPromptArea(startLine);
      return BACK_ANSWERS.has(answer) ? null : operations[answer];
    }
  }
}

async function promptStartMenu({ hasPreviousScans, hasInterruptedScans, hasTokens }) {
  setMood('idle');
  const startLine = state.outputLine;

  const entries = [{ label: 'New Scan', action: 'scan' }];
  if (hasInterruptedScans) entries.push({ label: 'Continue Scan', action: 'continue' });
  entries.push(hasPreviousScans
    ? { label: 'Open Viewer', action: 'view' }
    : { label: 'Open Viewer  (no scans found)', action: null });
  entries.push(hasPreviousScans
    ? { label: 'Sort Files', action: 'sort' }
    : { label: 'Sort Files  (no scans found)', action: null });

  log('');
  const actions = { s: 'settings', S: 'settings' };
  entries.forEach((entry, index) => {
    const line = '   [' + (index + 1) + ']  ' + entry.label;
    log(entry.action ? line : DIM + line + RESET);
    if (entry.action) actions[String(index + 1)] = entry.action;
  });
  if (hasTokens) {
    actions.w = actions.W = 'workers';
    log('   [W]  Check Workers');
  }
  log('   [S]  Settings');
  log('');

  while (true) {
    const answer = await ask('  » Select           : ');
    if (actions[answer]) {
      clearPromptArea(startLine);
      return actions[answer];
    }
  }
}

async function promptRemoveWorkers(count) {
  setMood('idle');
  const startLine = state.outputLine;

  log('');
  log('   [1]  Remove ' + count + ' unable worker(s) from .env');
  log('   [0]  Cancel');
  log('');

  let remove = false;
  while (true) {
    const answer = (await ask('  » Workers          : ')).toLowerCase();
    if (answer === '1') {
      remove = true;
      break;
    }
    if (['0', 'b', 'c', 'cancel'].includes(answer)) break;
  }

  clearPromptArea(startLine);
  return remove;
}

async function promptYesNo(label) {
  while (true) {
    const answer = (await ask(label)).toLowerCase();
    if (answer === 'y' || answer === 'yes') {
      eraseCurrentLine();
      return true;
    }
    if (answer === 'n' || answer === 'no' || answer === '') {
      eraseCurrentLine();
      return false;
    }
  }
}

module.exports = {
  promptToken,
  promptUserId,
  promptScanFolder,
  promptInterruptedScan,
  promptChoice,
  promptOperation,
  promptStartMenu,
  promptRemoveWorkers,
  promptYesNo,
};
