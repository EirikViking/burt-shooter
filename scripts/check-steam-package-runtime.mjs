import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
    path.join(packageRoot, 'resources', 'app.asar.unpacked', 'node_modules', 'steamworks-ffi-node', 'package.json'),
    path.join(packageRoot, 'resources', 'app.asar.unpacked', 'node_modules', 'steamworks-ffi-node', 'dist', 'index.js'),
    path.join(packageRoot, 'resources', 'app.asar.unpacked', 'node_modules', 'steamworks-ffi-node', 'prebuilds', 'win32-x64', 'steam-overlay.node'),
    path.join(packageRoot, 'resources', 'app.asar.unpacked', 'node_modules', 'koffi', 'package.json'),
    path.join(packageRoot, 'resources', 'app.asar.unpacked', 'node_modules', 'koffi', 'index.js'),
    path.join(packageRoot, 'resources', 'app.asar.unpacked', 'node_modules', 'koffi', 'build', 'koffi', 'win32_x64', 'koffi.node')
  ];
}

function listFilesRecursive(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFilesRecursive(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function optionalDependencyPath() {
  try {
    return require.resolve('steamworks-ffi-node');
  } catch {
    return null;
  }
}

function readWindowsExecutableBranding() {
  const executable = path.join(packageRoot, 'Nova Swarm.exe');
  if (process.platform !== 'win32' || !existsSync(executable)) {
    return { checked: false, reason: process.platform !== 'win32' ? 'non_windows_host' : 'missing_executable' };
  }
  const powershell = path.join(
    process.env.SystemRoot || 'C:\\Windows',
    'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'
  );
  try {
    const script = [
      '$v=(Get-Item -LiteralPath $env:NOVA_SWARM_BRANDING_EXE).VersionInfo',
      '[pscustomobject]@{FileDescription=$v.FileDescription;ProductName=$v.ProductName;OriginalFilename=$v.OriginalFilename}|ConvertTo-Json -Compress'
    ].join(';');
    return {
      checked: true,
      ...JSON.parse(execFileSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], {
        encoding: 'utf8',
        env: { ...process.env, NOVA_SWARM_BRANDING_EXE: executable },
        windowsHide: true
      }).trim())
    };
  } catch (error) {
    return { checked: true, error: error?.message || String(error) };
  }
}

const bridge = require('../electron/steamLeaderboardBridge.cjs');
const bridgeStatus = bridge.createSteamLeaderboardBridge({
  rootDir: root,
  allowNativeLoad: false
}).getStatus();
const files = requiredPackageFiles().map(fileReport);
const errors = [];
const packagedSteamSdkRoot = path.join(packageRoot, 'resources', 'app.asar.unpacked', 'steam_sdk');
const packagedSteamSdkFiles = listFilesRecursive(packagedSteamSdkRoot)
  .map((file) => path.relative(packagedSteamSdkRoot, file).replaceAll(path.sep, '/'))
  .sort();
const expectedSteamSdkFiles = sdkRuntimeFiles().sort();
const executableBranding = readWindowsExecutableBranding();

if (!existsSync(packageRoot)) errors.push(`missing package root: ${rel(packageRoot)}`);
for (const file of files) {
  if (!file.exists) errors.push(`missing packaged Steam runtime file: ${file.path}`);
}
if (JSON.stringify(packagedSteamSdkFiles) !== JSON.stringify(expectedSteamSdkFiles)) {
  errors.push(`packaged Steam SDK must contain only runtime DLLs; found ${packagedSteamSdkFiles.join(', ') || 'none'}`);
}
if (bridge.DEFAULT_STEAM_APP_ID !== 4765070 || bridgeStatus.appId !== 4765070) {
  errors.push(`Steam bridge app id must default to 4765070, got ${bridgeStatus.appId ?? 'missing'}`);
}
if (bridgeStatus.leaderboardName !== 'nova_swarm_global_score_v2') {
  errors.push(`Steam bridge leaderboard must be nova_swarm_global_score_v2, got ${bridgeStatus.leaderboardName || 'missing'}`);
}
if (executableBranding.checked) {
  if (executableBranding.error) {
    errors.push(`could not inspect packaged executable branding: ${executableBranding.error}`);
  } else if (
    executableBranding.ProductName !== 'Nova Swarm' ||
    executableBranding.FileDescription !== 'Nova Swarm' ||
    String(executableBranding.OriginalFilename || '').toLowerCase() === 'electron.exe'
  ) {
    errors.push(`packaged executable still has Electron branding: ${JSON.stringify(executableBranding)}`);
  }
}

const report = {
  status: errors.length ? 'failed' : 'passed',
  packageRoot: rel(packageRoot),
  appId: bridgeStatus.appId,
  leaderboardName: bridgeStatus.leaderboardName,
  optionalDependencyPath: optionalDependencyPath() ? rel(optionalDependencyPath()) : null,
  executableBranding,
  packagedSteamSdkFiles,
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

function sdkRuntimeFiles() {
  return [
    'sdk/redistributable_bin/steam_api.dll',
    'sdk/redistributable_bin/win64/steam_api64.dll'
  ];
}
