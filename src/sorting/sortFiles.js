'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const terminal = require('../terminal');
const { assetPath, runtimeRoot, PROJECT_ROOT } = require('../config/runtime');

const IS_WINDOWS = process.platform === 'win32';
const IMAGE_PATTERN = /\.(jpe?g|png|webp|bmp|gif|tiff?|heic|avif)$/i;
const SCRIPT_NAME = 'sort_images.py';
const REQUIRED_MODULES = 'import torch, transformers, PIL';

const scriptPath = () => assetPath(path.join(PROJECT_ROOT, 'python'), SCRIPT_NAME);
const environmentDirectory = () => path.join(runtimeRoot(), '.nyx-venv');
const environmentPython = () => path.join(environmentDirectory(), IS_WINDOWS ? 'Scripts' : 'bin', IS_WINDOWS ? 'python.exe' : 'python');

function containsImages(directory) {
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return false;
  }
  return entries.some((entry) => (entry.isDirectory() ? containsImages(path.join(directory, entry.name)) : IMAGE_PATTERN.test(entry.name)));
}

function sortableScans(scanFolders) {
  return scanFolders.filter((folder) => containsImages(path.join(folder, 'files')));
}

function findPython() {
  const candidates = IS_WINDOWS ? ['py', 'python', 'python3'] : ['python3', 'python'];
  return candidates.find((command) => spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0) || null;
}

function hasDependencies(python) {
  return spawnSync(python, ['-c', REQUIRED_MODULES], { stdio: 'ignore' }).status === 0;
}

function pipInstall(python, packages) {
  return spawnSync(python, ['-m', 'pip', 'install', ...packages], { stdio: 'inherit' }).status === 0;
}

function installDependencies(basePython) {
  if (!fs.existsSync(environmentPython())) {
    const created = spawnSync(basePython, ['-m', 'venv', environmentDirectory()], { stdio: 'inherit' });
    if (created.status !== 0) return false;
  }

  const torchPackages = process.platform === 'darwin'
    ? ['torch']
    : ['torch', '--index-url', 'https://download.pytorch.org/whl/cpu'];

  return pipInstall(environmentPython(), torchPackages) && pipInstall(environmentPython(), ['transformers', 'pillow']);
}

function refuse(message) {
  terminal.log(message);
  terminal.log('');
  return 'unavailable';
}

async function runSort(folder, quality) {
  if (!fs.existsSync(scriptPath())) return refuse('  ✗  ' + SCRIPT_NAME + ' not found next to the app  (' + scriptPath() + ')');

  const basePython = findPython();
  if (!basePython) return refuse('  ✗  python not found — install Python 3.9+ and try again');

  let python = null;
  let needsInstall = false;

  if (fs.existsSync(environmentPython()) && hasDependencies(environmentPython())) {
    python = environmentPython();
  } else if (hasDependencies(basePython)) {
    python = basePython;
  } else {
    terminal.log('  image sorting needs torch + transformers  (~200 MB, installed into ' + path.basename(environmentDirectory()) + ')');
    if (!(await terminal.prompts.promptYesNo('  » Install now?  (y/N) : '))) {
      terminal.log('  skipped');
      terminal.log('');
      return 'declined';
    }
    needsInstall = true;
  }

  terminal.stopHeader();

  if (needsInstall) {
    process.stdout.write('\n  installing dependencies...\n\n');
    if (!installDependencies(basePython) || !hasDependencies(environmentPython())) {
      process.stdout.write('\n  ✗  install failed — see the output above\n\n');
      return 'ran';
    }
    python = environmentPython();
  }

  process.stdout.write('\n  sorting  ' + folder + '\n\n');
  spawnSync(python, [scriptPath(), folder, '--quality', quality || 'balanced'], {
    stdio: 'inherit',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  return 'ran';
}

module.exports = { sortableScans, runSort };
