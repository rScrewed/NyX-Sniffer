'use strict';

const state = {
  outputLine: 1,
  scrollTop: null,
  bannerStartLine: 1,
  bannerEndLine: null,
  bannerPrinted: false,
  flatOutput: false,
  headerTimer: null,
  catFrame: 0,
  logBuffer: [],
};

module.exports = state;
