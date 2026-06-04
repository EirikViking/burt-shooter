import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const packageRoot = path.resolve(process.env.NOVA_SWARM_STEAM_PACKAGE_ROOT || 'release/desktop/win-unpacked');
const outputDir = path.resolve(process.env.NOVA_SWARM_STEAM_PACKAGE_CHECK_OUTPUT_DIR || `test-results/steam-package-runtime-${timestamp()}`);
const reportPath = path.join(outputDir, 'report.json');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function fileReport(file) {
  return {
    path: rel(file),
    exists: existsSync(file),
    bytes: existsSync(file) ? statSync(file).size : 0
  };
}

function requiredPackageFiles() {
  return [
    path.join(packageRoot, 'Nova Swarm.exe'),
    path.join(packageRoot, 'steam_api64.dll'),
    path.join(packageRoot, 'steam_api.dll'),
    path.join(packageRoot, 'resources', 'app.asar.unpacked', 'steam_sdk', 'sdk', 'redistributable_bin', 'win64', 'steam_api64.dll'),
    path.join(packageRoot, 'resources', 'app.asar.unpacked', 'steam_sdk', 'sdk', 'redistributable_bin', 'steam_api.dll'),
    path.join(packageRoot, 'resources', 'app.asar.unpacked', 'node_modules', 'steamworks-ffi-node', 'prebuilds', 'win32-x64', 'steam-overlay.node')
  ];
}

function optionalDependencyPath() {
  try {
    return require.resolve('steamworks-ffi-node');
  } catch {
    return null;
  }
}

const bridge = require('../electron/steamLeaderboardBridge.cjs');
const bridgeStatus = bridge.createSteamLeaderboardBridge({
  rootDir: root,
  allowNativeLoad: false
}).getStatus();
const files = requiredPackageFiles().map(fileReport);
const errors = [];

if (!existsSync(packageRoot)) errors.push(`missing package root: ${rel(packageRoot)}`);
if (!optionalDependencyPath()) errors.push('steamworks-ffi-node optional dependency is not installed in this worktree');
for (const file of files) {
  if (!file.exists) errors.push(`missing packaged Steam runtime file: ${file.path}`);
}
if (bridge.DEFAULT_STEAM_APP_ID !== 4765070 || bridgeStatus.appId !== 4765070) {
  errors.push(`Steam bridge app id must default to 4765070, got ${bridgeStatus.appId ?? 'missing'}`);
}
if (bridgeStatus.leaderboardName !== 'nova_swarm_global_score_v2') {
  errors.push(`Steam bridge leaderboard must be nova_swarm_global_score_v2, got ${bridgeStatus.leaderboardName || 'missing'}`);
}

const report = {
  status: errors.length ? 'failed' : 'passed',
  packageRoot: rel(packageRoot),
  appId: bridgeStatus.appId,
  leaderboardName: bridgeStatus.leaderboardName,
  optionalDependencyPath: optionalDependencyPath() ? rel(optionalDependencyPath()) : null,
  files,
  errors
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (errors.length) {
  console.error(`[steam-package-runtime] FAIL ${errors.join('; ')} report=${rel(reportPath)}`);
  process.exit(1);
}

assert.equal(report.status, 'passed');
console.log(`[steam-package-runtime] PASS app=${report.appId} leaderboard=${report.leaderboardName} report=${rel(reportPath)}`);
