'use strict';

const fs = require('fs');
const { commandLineArguments } = require('../config/runtime');

const ERROR_LOG_FILE = 'nyx_error.log';

function reportFatalError(error) {
  try {
    require('../terminal').stopHeader();
  } catch {}

  const details = error && error.stack ? error.stack : String(error);
  try {
    fs.writeFileSync(ERROR_LOG_FILE, details + '\n');
  } catch {}

  console.error('\n  ✗  fatal error: ' + (error && error.message ? error.message : error));
  console.error('  (details saved to ' + ERROR_LOG_FILE + ')');
  process.exit(1);
}

function main() {
  const [command, argument] = commandLineArguments();

  if (command === '--view') {
    require('./viewCommand').runViewCommand(argument).catch((error) => {
      console.error('\n  ✗  ' + error.message + '\n');
      process.exit(1);
    });
    return;
  }

  require('../app/interactive').runInteractive().catch(reportFatalError);
}

module.exports = { main };
