'use strict';

const fs = require('fs');
const path = require('path');
const terminal = require('../terminal');
const { ensureDirectory, moveTemporaryFiles } = require('../files/folders');
const { writeMessagesReport } = require('../output/messagesReport');
const { writeMentionsReport } = require('../output/mentionsReport');
const { buildMessageRows, buildFilesOnlyRows, buildMentionRows } = require('../output/resultRows');
const { heatmapConsoleRows, writeHeatmapFiles } = require('../output/heatmap');
const { writeTimeline } = require('../output/timeline');
const { stripEmoji, toSafeName } = require('../shared/text');
const { delay } = require('../shared/time');
const { presentViewer } = require('./viewerPresenter');

const HEATMAP_TITLE_DELAY_MS = 8;
const HEATMAP_ROW_DELAY_MS = 6;
const HEATMAP_ROW_PAUSE_MS = 30;
const NOTICE_TYPE_DELAY_MS = 14;

function writeProfile(outputDirectory, profile, guilds) {
  if (!profile) return;

  const enriched = { ...profile };
  if (profile.mutualGuilds && profile.mutualGuilds.length) {
    enriched.mutualGuilds = profile.mutualGuilds.map((mutual) => {
      const guild = guilds.find((candidate) => candidate.id === mutual.id);
      return { ...mutual, name: guild ? (stripEmoji(guild.name) || mutual.id) : mutual.id };
    });
  }
  fs.writeFileSync(path.join(outputDirectory, 'profile.json'), JSON.stringify(enriched, null, 2));
}

function relocateDownloads(state, filesDirectory) {
  const { scan, temporaryDirectory, messages } = state;

  if (scan.downloadFiles && fs.existsSync(temporaryDirectory)) {
    moveTemporaryFiles(temporaryDirectory, filesDirectory);
    for (const message of messages) {
      for (const file of message.files || []) file.localPath = file.localPath.replace(temporaryDirectory, filesDirectory);
    }
  } else if (fs.existsSync(temporaryDirectory)) {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

async function showResultRows(rows, outputDirectory) {
  terminal.setMood('happy');
  terminal.stopHeader();
  await terminal.printResults(rows, './' + outputDirectory + '/');
}

async function printHeatmap(messages) {
  const { title, rows } = heatmapConsoleRows(messages);
  await terminal.typeLine(title, HEATMAP_TITLE_DELAY_MS);
  for (const row of rows) {
    await terminal.typeLine(row, HEATMAP_ROW_DELAY_MS);
    await delay(HEATMAP_ROW_PAUSE_MS);
  }
}

async function publishResults({ scan, state, profile, guilds, elapsed }) {
  const username = state.username || scan.targetUserId;
  const outputDirectory = scan.outputPrefix + '_' + toSafeName(username.split('#')[0]);
  const filesDirectory = path.join(outputDirectory, 'files');

  ensureDirectory(outputDirectory);
  if (scan.downloadFiles) ensureDirectory(filesDirectory);
  writeProfile(outputDirectory, profile, guilds);
  relocateDownloads(state, filesDirectory);

  const { messages, mentions, summary } = state;
  const totalFiles = messages.reduce((sum, message) => sum + (message.files ? message.files.length : 0), 0);
  const serverSummaries = summary.filter((entry) => entry.count > 0);
  const reportInput = { options: scan, username, avatar: state.avatar, serverSummaries };

  let viewerMode = null;

  if (scan.mentionsOnly) {
    const mentioners = writeMentionsReport(outputDirectory, { ...reportInput, mentions });
    await showResultRows(buildMentionRows({ mentioners, serverSummaries, total: mentions.length, elapsed }), outputDirectory);
    viewerMode = 'mentions';
  } else if (scan.saveMessages) {
    writeMessagesReport(outputDirectory, filesDirectory, { ...reportInput, messages, totalFiles });
    const rows = buildMessageRows({ options: scan, messages, serverSummaries, totalFiles, elapsed });

    if (scan.includesAll && mentions.length > 0) {
      const mentioners = writeMentionsReport(outputDirectory, { ...reportInput, mentions });
      rows.push('', ...buildMentionRows({ mentioners, serverSummaries, total: mentions.length, elapsed: null }));
    }
    await showResultRows(rows, outputDirectory);
    viewerMode = 'messages';
  } else {
    await showResultRows(buildFilesOnlyRows({ summary, totalFiles, elapsed }), outputDirectory);
  }

  if (messages.length > 0) writeTimeline(outputDirectory, username, messages);

  if (scan.buildHeatmap && messages.length > 0) {
    await printHeatmap(messages);
    writeHeatmapFiles(outputDirectory, username, messages);
    await terminal.typeLine('  heatmap.txt saved', NOTICE_TYPE_DELAY_MS);
  }

  if (viewerMode) {
    try {
      await presentViewer(outputDirectory, viewerMode);
    } catch (error) {
      await terminal.typeLine('  ✗  viewer error: ' + error.message, NOTICE_TYPE_DELAY_MS);
    }
  }

  terminal.finalizeOutput();
}

module.exports = { publishResults };
