'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { officialNodeBinary } = require('./lib/nodeBinary');
const { bundleApplication, bundleViewerClient, ROOT } = require('./lib/bundle');

const SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
const CACHE_DIRECTORY = path.join(ROOT, '.build-cache');
const SUPPORT_FILES = [
  ['src/viewer/public/viewer.css', 'viewer.css'],
  ['python/sort_images.py', 'sort_images.py'],
];

const targetsWindows = process.argv.includes('--windows');
const platform = targetsWindows ? 'win32' : process.platform;
const arch = targetsWindows ? 'x64' : process.arch;
const outputDirectory = path.join(ROOT, targetsWindows ? 'dist-win' : 'dist');
const executableName = platform === 'win32' ? 'nyx.exe' : 'nyx';
const workDirectory = path.join(outputDirectory, '.work');

function step(number, total, message) {
  console.log('\n[' + number + '/' + total + '] ' + message);
}

function run(command, args) {
  console.log('  $ ' + [command, ...args].map((part) => path.relative(ROOT, part) || part).join(' '));
  execFileSync(command, args, { stdio: 'inherit' });
}

async function build() {
  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.mkdirSync(workDirectory, { recursive: true });

  const bundleFile = path.join(workDirectory, 'nyx.bundle.cjs');
  const blobFile = path.join(workDirectory, 'nyx.blob');
  const configFile = path.join(workDirectory, 'sea-config.json');

  step(1, 5, 'bundling the application and the viewer client...');
  bundleApplication(bundleFile);
  bundleViewerClient(path.join(outputDirectory, 'viewer-client.js'));

  step(2, 5, 'generating the single-executable blob...');
  fs.writeFileSync(configFile, JSON.stringify({ main: bundleFile, output: blobFile, disableExperimentalSEAWarning: true }, null, 2));
  run(process.execPath, ['--experimental-sea-config', configFile]);

  step(3, 5, 'fetching the official Node ' + process.version + ' binary for ' + platform + '-' + arch + '...');
  const baseBinary = await officialNodeBinary({ platform, arch, cacheDirectory: CACHE_DIRECTORY });

  step(4, 5, 'injecting the blob...');
  const executable = path.join(outputDirectory, executableName);
  fs.copyFileSync(baseBinary, executable);
  fs.chmodSync(executable, 0o755);

  const injectArguments = [path.join(ROOT, 'node_modules', 'postject', 'dist', 'cli.js'), executable, 'NODE_SEA_BLOB', blobFile, '--sentinel-fuse', SEA_FUSE];
  if (platform === 'darwin') injectArguments.push('--macho-segment-name', 'NODE_SEA');
  run(process.execPath, injectArguments);

  step(5, 5, 'copying support files...');
  for (const [source, name] of SUPPORT_FILES) fs.copyFileSync(path.join(ROOT, source), path.join(outputDirectory, name));
  fs.rmSync(workDirectory, { recursive: true, force: true });

  console.log('\ndone — ship the whole ' + path.basename(outputDirectory) + '/ folder (' + [executableName, 'viewer-client.js', ...SUPPORT_FILES.map(([, name]) => name)].join(', ') + ') together.');
}

build().catch((error) => {
  console.error('\n  ✗  ' + error.message);
  process.exit(1);
});
