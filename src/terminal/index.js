'use strict';

const state = require('./state');
const banner = require('./banner');
const workerPanel = require('./workerPanel');
const workerWindow = require('./workerWindow');
const serverProgress = require('./serverProgress');
const logging = require('./log');
const prompts = require('./prompts');
const { promptSettings } = require('./settingsPrompt');
const { installResizeHandler } = require('./resize');
const { createProgressLoader } = require('./progressLoader');
const { delay } = require('../shared/time');

process.on('exit', () => {
  if (!state.flatOutput) banner.stopHeader();
});
process.on('SIGINT', () => {
  banner.stopHeader();
  process.stdout.write('\n');
  process.exit(0);
});
installResizeHandler();

module.exports = {
  delay,
  createProgressLoader,
  clearScreen: banner.clearScreen,
  showBanner: banner.showBanner,
  stopHeader: banner.stopHeader,
  setMood: banner.setMood,
  log: logging.log,
  clearLinesFrom: logging.clearLinesFrom,
  getOutputLine: logging.getOutputLine,
  typeLine: logging.typeLine,
  printResults: logging.printResults,
  finalizeOutput: logging.finalizeOutput,
  server: {
    start: serverProgress.start,
    update: serverProgress.update,
    finish: serverProgress.finish,
    setSubStatus: serverProgress.setSubStatus,
    clearSubStatus: serverProgress.clearSubStatus,
  },
  workers: {
    initialize: workerPanel.initialize,
    update: workerPanel.update,
    setMood: workerPanel.setMood,
    setStatus: workerPanel.setStatus,
    setSummary: workerPanel.setSummary,
    setProgressCount: workerPanel.setProgressCount,
    useExternalDisplay: workerPanel.useExternalDisplay,
    openWindow: () => workerWindow.open(),
    closeWindow: workerWindow.close,
  },
  prompts: { ...prompts, promptSettings },
};
