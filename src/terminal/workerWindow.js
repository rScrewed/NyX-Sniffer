'use strict';

const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { isPackaged, PROJECT_ROOT } = require('../config/runtime');

const WINDOW_TITLE = 'NyX-Sniffer workers';
const CONNECT_TIMEOUT_MS = 6000;

let server = null;
let connection = null;
let address = null;

function listenAddress() {
  return process.platform === 'win32'
    ? '\\\\.\\pipe\\nyx-workers-' + process.pid
    : path.join(os.tmpdir(), 'nyx-workers-' + process.pid + '.sock');
}

function displayCommand(pipeAddress) {
  const entry = isPackaged() ? [] : [path.join(PROJECT_ROOT, 'bin', 'nyx.js')];
  return { command: process.execPath, args: [...entry, '--workers-display', pipeAddress] };
}

function shellQuote(text) {
  return "'" + text.replace(/'/g, "'\\''") + "'";
}

function commandExists(binary) {
  return spawnSync('which', [binary], { stdio: 'ignore' }).status === 0;
}

function windowsLauncher({ command, args }) {
  const quoted = [command, ...args].map((part) => '"' + part + '"').join(' ');
  return { binary: 'cmd.exe', args: ['/c', 'start "' + WINDOW_TITLE + '" ' + quoted], options: { windowsVerbatimArguments: true } };
}

function macLauncher({ command, args }) {
  const line = [command, ...args].map(shellQuote).join(' ');
  return {
    binary: 'osascript',
    args: ['-e', 'tell application "Terminal" to activate', '-e', 'tell application "Terminal" to do script ' + JSON.stringify(line)],
    options: {},
  };
}

function linuxLauncher({ command, args }) {
  if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) return null;
  const line = [command, ...args].map(shellQuote).join(' ');
  const candidates = [
    ['kitty', ['--title', WINDOW_TITLE, 'sh', '-c', line]],
    ['gnome-terminal', ['--title=' + WINDOW_TITLE, '--', 'sh', '-c', line]],
    ['konsole', ['-e', 'sh', '-c', line]],
    ['xfce4-terminal', ['--title=' + WINDOW_TITLE, '-e', line]],
    ['alacritty', ['--title', WINDOW_TITLE, '-e', 'sh', '-c', line]],
    ['wezterm', ['start', '--', 'sh', '-c', line]],
    ['foot', ['sh', '-c', line]],
    ['tilix', ['-e', line]],
    ['x-terminal-emulator', ['-e', 'sh', '-c', line]],
    ['xterm', ['-title', WINDOW_TITLE, '-e', 'sh', '-c', line]],
  ];
  const found = candidates.find(([binary]) => commandExists(binary));
  return found ? { binary: found[0], args: found[1], options: {} } : null;
}

function findLauncher(command) {
  if (process.platform === 'win32') return windowsLauncher(command);
  if (process.platform === 'darwin') return macLauncher(command);
  return linuxLauncher(command);
}

function launchWindow(launcher) {
  try {
    const child = spawn(launcher.binary, launcher.args, { detached: true, stdio: 'ignore', ...launcher.options });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function removeSocketFile() {
  if (address && process.platform !== 'win32') {
    try {
      fs.unlinkSync(address);
    } catch {}
  }
}

function cleanup() {
  if (connection) {
    connection.destroy();
    connection = null;
  }
  if (server) {
    server.close();
    server = null;
  }
  removeSocketFile();
  address = null;
}

function isOpen() {
  return Boolean(connection && !connection.destroyed);
}

function send(message) {
  if (!isOpen()) return;
  try {
    connection.write(JSON.stringify(message) + '\n');
  } catch {}
}

function launchDisplay(pipeAddress) {
  const launcher = findLauncher(displayCommand(pipeAddress));
  return Boolean(launcher) && launchWindow(launcher);
}

function open({ launch = launchDisplay } = {}) {
  if (isOpen()) return Promise.resolve(true);

  address = listenAddress();
  removeSocketFile();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!result) cleanup();
      resolve(result);
    };
    const timer = setTimeout(() => finish(false), CONNECT_TIMEOUT_MS);

    server = net.createServer((client) => {
      connection = client;
      client.on('error', () => {
        connection = null;
      });
      client.on('close', () => {
        connection = null;
      });
      finish(true);
    });
    server.on('error', () => finish(false));
    server.listen(address, () => {
      if (!launch(address)) finish(false);
    });
  });
}

function close() {
  send({ type: 'exit' });
  cleanup();
}

process.on('exit', removeSocketFile);

module.exports = { open, close, send, isOpen };
