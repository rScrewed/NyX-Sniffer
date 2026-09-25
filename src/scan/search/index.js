'use strict';

const { searchMessages } = require('./messageSearch');
const { searchFiles } = require('./fileSearch');
const { searchMentions } = require('./mentionSearch');

module.exports = { searchMessages, searchFiles, searchMentions };
