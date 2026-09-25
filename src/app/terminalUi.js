'use strict';

const terminal = require('../terminal');

module.exports = {
  log: terminal.log,
  setMood: terminal.setMood,
  setSubStatus: terminal.server.setSubStatus,
  clearSubStatus: terminal.server.clearSubStatus,
};
