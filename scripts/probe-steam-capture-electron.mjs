import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const root = process.cwd();
const electronBin = require('electron');
const appId = '4765070';
const outputDir = path.resolve(
  process.env.NOVA_SWARM_STEAM_CAPTURE_PROBE_OUTPUT_DIR
  || path.join(root, 'test-results', `steam-capture-electron-${timestamp()}`)
);
const runtimeReportPath = path.join(outputDir, 'runtime-report.json');
const reportPath = path.join(outputDir, 'report.json');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function listDirectories(parent) {
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(parent, entry.name));
}

function getSteamUserdataRoots() {
  const configured = String(process.env.NOVA_SWARM_STEAM_USERDATA_ROOT || '')
    .split(path.delimiter)
    .map((value) => value.trim())
    .filter(Boolean);
  const common = [
    process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], 'Steam', 'userdata') : null,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Steam', 'userdata') : null
  ].filter(Boolean);
  return [...new Set([...configured, ...common].map((value) => path.resolve(value)))]
    .filter((value) => existsSync(value));
}

function collectSteamCaptureState() {
  const screenshots = [];
  const recordingMetadata = [];
  for (const userdataRoot of getSteamUserdataRoots()) {
    for (const userDir of listDirectories(userdataRoot)) {
      const screenshotDir = path.join(userDir, '760', 'remote', appId, 'screenshots');
      if (existsSync(screenshotDir)) {
        for (const entry of readdirSync(screenshotDir, { withFileTypes: true })) {
          if (!entry.isFile() || !/\.(?:jpe?g|png)$/i.test(entry.name)) continue;
          const file = path.join(screenshotDir, entry.name);
          const stat = statSync(file);
          screenshots.push({ file, bytes: stat.size, mtimeMs: stat.mtimeMs });
        }
      }
      const recordingFile = path.join(userDir, 'gamerecordings', 'gamerecording.pb');
      if (existsSync(recordingFile)) {
        const stat = statSync(recordingFile);
        recordingMetadata.push({ file: recordingFile, bytes: stat.size, mtimeMs: stat.mtimeMs });
      }
    }
  }
  return {
    screenshots: screenshots.sort((a, b) => a.mtimeMs - b.mtimeMs),
    recordingMetadata
  };
}

if (!existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('[steam-capture-electron-probe] missing dist/index.html; run npm run build:current first.');
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });
const before = collectSteamCaptureState();
const beforeFiles = new Set(before.screenshots.map((entry) => path.resolve(entry.file).toLowerCase()));

const result = spawnSync(electronBin, ['electron/main.cjs', '--steam-capture-probe', '--windowed'], {
  cwd: root,
  env: {
    ...process.env,
    SteamAppId: appId,
    SteamGameId: appId,
    NOVA_SWARM_STEAM_CAPTURE_PROBE: '1',
    NOVA_SWARM_STEAM_CAPTURE_PROBE_OUTPUT_DIR: outputDir,
    NOVA_SWARM_STEAM_CAPTURE_PROBE_SETTLE_MS: process.env.NOVA_SWARM_STEAM_CAPTURE_PROBE_SETTLE_MS || '4800',
    NOVA_SWARM_STEAM_CAPTURE_PROBE_HOLD_MS: process.env.NOVA_SWARM_STEAM_CAPTURE_PROBE_HOLD_MS || '7200',
    NOVA_SWARM_USER_DATA_DIR: path.join(outputDir, 'userData')
  },
  windowsHide: false,
  encoding: 'utf8',
  timeout: 45000
});

const after = collectSteamCaptureState();
const newScreenshots = after.screenshots.filter((entry) => !beforeFiles.has(path.resolve(entry.file).toLowerCase()));
const newest = newScreenshots.at(-1) || null;
let capturedImage = null;
const errors = [];
const warnings = [];

if (newest) {
  const evidencePath = path.join(outputDir, 'steam-api-screenshot.jpg');
  copyFileSync(newest.file, evidencePath);
  const metadata = await sharp(evidencePath).metadata();
  const stats = await sharp(evidencePath).stats();
  capturedImage = {
    source: newest.file,
    evidence: rel(evidencePath),
    bytes: newest.bytes,
    width: metadata.width || 0,
    height: metadata.height || 0,
    channels: metadata.channels || 0,
    entropy: Number(stats.entropy || 0)
  };
  if (capturedImage.bytes < 10000) errors.push(`captured Steam screenshot is unexpectedly small (${capturedImage.bytes} bytes)`);
  if (capturedImage.width < 640 || capturedImage.height < 360) {
    errors.push(`captured Steam screenshot dimensions are too small (${capturedImage.width}x${capturedImage.height})`);
  }
  if (capturedImage.entropy < 1.5) errors.push(`captured Steam screenshot appears visually empty (entropy=${capturedImage.entropy})`);
} else {
  errors.push('Steam screenshot API did not create a new screenshot file');
}

let runtimeReport = null;
if (existsSync(runtimeReportPath)) {
  runtimeReport = JSON.parse(readFileSync(runtimeReportPath, 'utf8'));
} else {
  errors.push('Electron capture probe did not write runtime-report.json');
}
if (runtimeReport?.captureSurface?.enabled !== true) errors.push('native Electron Steam capture surface was not attached');
if (runtimeReport?.screenshot?.ok !== true) errors.push('Steam screenshot request was not accepted');
if (runtimeReport?.rendered?.ready !== true) errors.push('game scene was not rendered before capture');
if (result.error) errors.push(`Electron launch failed: ${result.error.message}`);
if (result.status !== 0) {
  warnings.push(`Electron capture probe exited with code ${result.status}; native helper shutdown can return nonzero after evidence is already written`);
}
if (!after.recordingMetadata.some((entry) => entry.bytes > 0)) {
  warnings.push('Steam Game Recording metadata is empty or absent on this machine; complete the manual recording playback procedure.');
}

const report = {
  ok: errors.length === 0,
  appId: Number(appId),
  outputDir: rel(outputDir),
  command: 'electron electron/main.cjs --steam-capture-probe --windowed',
  process: {
    status: result.status,
    signal: result.signal || null,
    stdout: String(result.stdout || '').trim().slice(-12000),
    stderr: String(result.stderr || '').trim().slice(-12000)
  },
  runtimeReport,
  screenshotCountBefore: before.screenshots.length,
  screenshotCountAfter: after.screenshots.length,
  newScreenshotCount: newScreenshots.length,
  capturedImage,
  recordingMetadata: after.recordingMetadata,
  recordingPlaybackVerified: false,
  manualProcedure: 'docs/qa/steam-capture-manual.md',
  warnings,
  errors
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (!report.ok) {
  console.error(`[steam-capture-electron-probe] FAIL ${errors.join('; ')} report=${rel(reportPath)}`);
  process.exit(1);
}

console.log(
  `[steam-capture-electron-probe] PASS screenshot=${capturedImage.width}x${capturedImage.height}`
  + ` entropy=${capturedImage.entropy.toFixed(2)} report=${rel(reportPath)}`
);
