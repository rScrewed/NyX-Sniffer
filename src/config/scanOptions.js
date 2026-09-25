'use strict';

const OPERATIONS = Object.freeze({
  ALL: 'all',
  MESSAGES: 'messages',
  FILES: 'files',
  MENTIONS: 'mentions',
});

const LABELS = {
  [OPERATIONS.ALL]: 'all',
  [OPERATIONS.MESSAGES]: 'messages only',
  [OPERATIONS.FILES]: 'files only',
  [OPERATIONS.MENTIONS]: 'mentions only',
};

const OUTPUT_PREFIXES = {
  [OPERATIONS.ALL]: 'Everything',
  [OPERATIONS.MESSAGES]: 'Messages',
  [OPERATIONS.FILES]: 'Files',
  [OPERATIONS.MENTIONS]: 'Mentions',
};

function createScanOptions({ targetUserId, operation }) {
  const isAll = operation === OPERATIONS.ALL;
  const isMessages = operation === OPERATIONS.MESSAGES;
  const isFiles = operation === OPERATIONS.FILES;
  const isMentions = operation === OPERATIONS.MENTIONS;

  return Object.freeze({
    targetUserId,
    operation,
    label: LABELS[operation] || LABELS[OPERATIONS.ALL],
    outputPrefix: OUTPUT_PREFIXES[operation] || OUTPUT_PREFIXES[OPERATIONS.ALL],
    includesAll: isAll,
    downloadFiles: isAll || isFiles,
    saveMessages: !isFiles && !isMentions,
    filesOnly: isFiles,
    mentionsOnly: isMentions,
    buildHeatmap: !isMentions,
    unit: isMentions ? 'mentions' : isFiles ? 'files' : 'msgs',
    modeName: isAll ? 'All' : isMessages ? 'Messages' : isFiles ? 'Files' : 'Mentions',
  });
}

module.exports = { OPERATIONS, createScanOptions };
