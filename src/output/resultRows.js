'use strict';

const { countByCategory, summarizeCounts, summarizeFiles } = require('../shared/fileCategories');
const { longestName } = require('./reportFormat');

function buildMessageRows({ options, messages, serverSummaries, totalFiles, elapsed }) {
  const rows = [];

  if (serverSummaries.length > 0) {
    const width = longestName(serverSummaries.map((entry) => entry.server), 6);
    rows.push('  Files');

    for (const entry of serverSummaries) {
      const breakdown = options.downloadFiles && entry.files.length > 0 ? '  ' + summarizeFiles(entry.files) : '';
      const filePart = options.downloadFiles ? '  ' + String(entry.files.length).padStart(3) + ' file(s)' + breakdown : '';
      rows.push('  ' + entry.server.padEnd(width + 2) + '  ' + String(entry.count).padStart(4) + ' msg(s)' + filePart);
    }

    const grandBreakdown = options.downloadFiles && totalFiles > 0
      ? '  ' + summarizeCounts(countByCategory(messages.flatMap((message) => message.files || [])))
      : '';
    const grandFilePart = options.downloadFiles ? '  ' + String(totalFiles).padStart(3) + ' file(s)' + grandBreakdown : '';
    rows.push('  ' + 'Total'.padEnd(width + 2) + '  ' + String(messages.length).padStart(4) + ' msg(s)' + grandFilePart);
  } else {
    rows.push('  No messages found.');
  }

  if (elapsed) rows.push('  Got ' + messages.length + ' message(s) in ' + elapsed);
  return rows;
}

function buildFilesOnlyRows({ summary, totalFiles, elapsed }) {
  const withFiles = summary.filter((entry) => entry.files.length > 0);
  const rows = [];

  if (withFiles.length > 0) {
    const width = longestName(withFiles.map((entry) => entry.server), 6);
    rows.push('  Files');

    for (const entry of withFiles) {
      rows.push('  ' + entry.server.padEnd(width + 2) + '  ' + String(entry.files.length).padStart(4) + ' file(s)' + '  ' + summarizeFiles(entry.files));
    }

    const grandBreakdown = totalFiles > 0 ? '  ' + summarizeCounts(countByCategory(summary.flatMap((entry) => entry.files))) : '';
    rows.push('  ' + 'Total'.padEnd(width + 2) + '  ' + String(totalFiles).padStart(4) + ' file(s)' + grandBreakdown);
  } else {
    rows.push('  No files found.');
  }

  if (elapsed) rows.push('  Got ' + totalFiles + ' file(s) in ' + elapsed);
  return rows;
}

function buildMentionRows({ mentioners, serverSummaries, total, elapsed }) {
  const top = mentioners.slice(0, 5);
  const rows = [];

  if (top.length > 0) {
    const width = longestName(top.map((user) => user.tag || user.id), 6);
    rows.push('  Most Mentions');
    for (const user of top) rows.push('  ' + (user.tag || user.id).padEnd(width + 2) + '  ' + String(user.count).padStart(4) + '×');
    rows.push('  Total  ' + String(total).padStart(4) + ' ping(s) across ' + serverSummaries.length + ' server(s)');
  } else {
    rows.push('  No mentions found.');
  }

  if (elapsed) rows.push('  Got ' + total + ' mention(s) in ' + elapsed);
  return rows;
}

module.exports = { buildMessageRows, buildFilesOnlyRows, buildMentionRows };
