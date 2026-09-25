# Architecture

NyX-Sniffer is a Node.js command-line application (CommonJS, no build step to run from source) plus one optional Python script.
This document explains how the code is organised and how a scan flows through it.

## Layout

```
bin/nyx.js                 executable entry point
src/
  cli/                     argument handling and top-level error reporting
  app/                     the interactive application flow
  config/                  runtime paths, .env handling, settings, per-scan options
  discord/                 API client, profile lookup, search query builder, snowflake helpers
  scan/                    collecting data: search engine, per-guild collectors, sequential and parallel runners
  files/                   attachment downloading (with de-duplication) and folder helpers
  output/                  report writers, result summaries, heatmap and timeline
  terminal/                cursor-addressed terminal UI: banner, log area, worker rows, prompts
  viewer/                  local web viewer: HTTP server, HTML rendering, OSINT tagging, browser client
  sorting/                 launcher for the Python image sorter
  shared/                  small helpers used everywhere
python/sort_images.py      zero-shot image classification with CLIP
scripts/                   single-executable build
tests/                     unit and integration tests (node:test)
docs/                      documentation
```

## Interactive flow

`bin/nyx.js` calls `src/cli/main.js`, which either runs the `--view` command or the interactive application in `src/app/interactive.js`:

1. show the banner, load `.env` and apply pacing overrides (`config/settings.js`);
2. `app/accounts.js` loads the tokens, creates the API client and, with several tokens, verifies every worker;
3. `app/startMenu.js` runs the start menu (new scan, continue, viewer, sort files, settings, workers) and returns a selection: target user, operation, the servers the account can see, and optionally a checkpoint to resume from;
4. `app/scanRunner.js` resolves the target profile, narrows the scan to mutual servers, and runs a sequential or parallel scan;
5. `app/results.js` moves downloads into the output folder, writes the reports and opens the viewer.

## Scanning

- `discord/client.js` performs API requests. It has two rate-limit strategies: *wait* (sleep and retry, used by the main account) and *abort* (return a marker so the caller can hand the work to a helper, used by workers).
- `scan/search/paginatedSearch.js` is the single pagination engine. It handles paging, the 10,000-result offset limit (by re-anchoring with `max_id`), network retries, rate limits, helper borrowing and pacing. `messageSearch`, `fileSearch` and `mentionSearch` only describe what to request and how to record a message.
- `scan/guildScan.js` runs the right collector for the selected operation and records results and a per-server summary in the scan state.
- `scan/sequentialScan.js` scans server after server with one account.
- `scan/parallel/` splits every server's history between several accounts: `discovery.js` finds active servers and split points, `workQueue.js` hands out slices (a worker only receives slices for servers it can access) and lets idle workers help rate-limited ones, `parallelScan.js` ties it together.
- `scan/scanState.js` and `scan/checkpoint.js` hold results and persist `progress.json` so an interrupted scan can be continued. Only data from completed servers is kept when resuming.
- `files/downloader.js` downloads attachments once per unique file, even across messages and workers.

## Viewer

`viewer/server.js` serves a page rendered by `viewer/render/`. Message tagging, counts and the word wall are computed once per dataset (`viewer/dataset.js`, `viewer/intel/`). The page is progressively enhanced by the ES modules in `viewer/client/`, which read their data from a JSON block embedded in the page. `viewer/public/viewer.css` holds the styles.

The OSINT wordlists are plain JSON files in `viewer/intel/wordlists/`; the `bannable` list is split into one file per topic.

## Terminal UI

`terminal/` draws into fixed screen regions with ANSI cursor addressing: a banner header, a scrolling log region, per-worker status rows pinned to the bottom, and prompts. Shared layout state lives in `terminal/state.js`. Code outside the module uses only the facade in `terminal/index.js`.

## Packaged executable

`npm run build` bundles the application with esbuild and injects it into an official Node binary as a Node single-executable application. The viewer's browser client is bundled separately. The executable expects `viewer.css`, `viewer-client.js` and `sort_images.py` next to it.
