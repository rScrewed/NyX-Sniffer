'use strict';

const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..', '..');

function bundleApplication(outputFile) {
  esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'bin', 'nyx.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: outputFile,
  });
}

function bundleViewerClient(outputFile) {
  esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src', 'viewer', 'client', 'main.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    outfile: outputFile,
  });
}

module.exports = { bundleApplication, bundleViewerClient, ROOT };
