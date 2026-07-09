import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const packageRoot = path.resolve(process.env.NOVA_SWARM_STEAM_PACKAGE_ROOT || 'release/desktop/win-unpacked');
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/steam-overlay-hook-${timestamp()}`);
const reportPath = path.join(outputDir, 'report.json');
const errors = [];
const warnings = [];

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

function read(relativePath) {
  return readFileSync(path.resolve(root, relativePath), 'utf8');
}

function requireText(relativePath, needle, label) {
  const ok = read(relativePath).includes(needle);
  if (!ok) errors.push(`${label} missing from ${relativePath}`);
  return { label, file: relativePath, ok };
}

function requireOrderedText(relativePath, firstNeedle, secondNeedle, label) {
  const source = read(relativePath);
  const first = source.indexOf(firstNeedle);
  const second = source.indexOf(secondNeedle);
  const ok = first >= 0 && second >= 0 && first < second;
  if (!ok) errors.push(`${label} order not proven in ${relativePath}`);
  return { label, file: relativePath, ok, first, second };
}

function optionalDependencyPath() {
  try {
    return require.resolve('steamworks-ffi-node');
  } catch {
    return null;
  }
}

mkdirSync(outputDir, { recursive: true });

const bridge = require('../electron/steamLeaderboardBridge.cjs');
const bridgeStatus = bridge.createSteamLeaderboardBridge({
  rootDir: root,
  allowNativeLoad: false
}).getStatus();

const checks = [
  requireText('electron/steamLeaderboardBridge.cjs', 'const didInit = this.steam.init(initOptions);', 'SteamAPI_Init equivalent call'),
  requireText('electron/steamLeaderboardBridge.cjs', 'this.startCallbackPolling();', 'Steam callbacks polling after init'),
  requireText('electron/main.cjs', 'const steamLeaderboardBridge = createSteamLeaderboardBridge', 'Electron Steam bridge creation'),
  requireOrderedText('electron/main.cjs', 'steamProfileContext = await resolveSteamProfileContext();', 'const win = createWindow();', 'Steam init/profile resolution before BrowserWindow creation'),
  requireText('electron/main.cjs', "ipcMain.handle('nova-steam-leaderboard:getRuntimeInfo'", 'runtime info IPC'),
  requireText('electron/main.cjs', 'launchedBySteamHint', 'Steam-client launch hint in runtime info'),
  requireText('electron-builder.json', '"steam_api64.dll"', '64-bit Steam API DLL packaged beside exe'),
  requireText('electron-builder.json', '"steam_api.dll"', '32-bit Steam API DLL packaged beside exe'),
  requireText('electron-builder.json', '"node_modules/steamworks-ffi-node/**/*"', 'Steamworks native module unpacked'),
  requireText('electron-builder.json', '"steam_sdk/sdk/redistributable_bin/**/*"', 'Steam SDK redistributables unpacked'),
  requireText('node_modules/steamworks-ffi-node/README.md', 'prebuilds/<platform>/steam-overlay.node', 'overlay native addon packaging guidance')
];

const f12ClaimPattern = /(?:event|e|input)\.code\s*===\s*['"]F12['"]|keyCode\s*===\s*123|globalShortcut\.register\s*\(\s*['"]F12['"]|before-input-event[\s\S]{0,300}F12/;
const f12SourceFiles = [
  'electron/main.cjs',
  'src/main.js',
  'src/input/InputManager.js',
  'src/scenes/MenuScene.js',
  'src/scenes/PlayScene.js',
  'src/scenes/GameOverScene.js',
  'src/scenes/ShipSelectScene.js',
  'src/scenes/HighscoreScene.js',
  'src/ui/SettingsOverlay.js'
];
const f12Checks = f12SourceFiles.map((file) => {
  const claimed = f12ClaimPattern.test(read(file));
  if (claimed) errors.push(`Steam screenshot hotkey F12 appears to be claimed by ${file}`);
  return { label: 'Steam F12 screenshot hotkey unclaimed', file, ok: !claimed };
});

const mainSource = read('electron/main.cjs');
const builderSource = read('electron-builder.json');
if (/disableHardwareAcceleration|disable-gpu|in-process-gpu|software-raster/i.test(mainSource + builderSource)) {
  errors.push('Electron package appears to alter GPU rendering in a way that may block Steam overlay');
}

if (!optionalDependencyPath()) errors.push('steamworks-ffi-node optional dependency is not installed');
if (bridge.DEFAULT_STEAM_APP_ID !== 4765070 || bridgeStatus.appId !== 4765070) {
  errors.push(`Steam bridge AppID must remain 4765070, got ${bridgeStatus.appId ?? 'missing'}`);
}
if (bridgeStatus.leaderboardName !== 'nova_swarm_global_score_v2') {
  errors.push(`Steam bridge leaderboard must remain nova_swarm_global_score_v2, got ${bridgeStatus.leaderboardName || 'missing'}`);
}

const packagedFiles = [
  path.join(packageRoot, 'Nova Swarm.exe'),
  path.join(packageRoot, 'steam_api64.dll'),
  path.join(packageRoot, 'steam_api.dll'),
  path.join(packageRoot, 'resources', 'app.asar.unpacked', 'steam_sdk', 'sdk', 'redistributable_bin', 'win64', 'steam_api64.dll'),
  path.join(packageRoot, 'resources', 'app.asar.unpacked', 'steam_sdk', 'sdk', 'redistributable_bin', 'steam_api.dll'),
  path.join(packageRoot, 'resources', 'app.asar.unpacked', 'node_modules', 'steamworks-ffi-node', 'prebuilds', 'win32-x64', 'steam-overlay.node')
].map(fileReport);

for (const file of packagedFiles) {
  if (!file.exists) errors.push(`missing packaged overlay prerequisite: ${file.path}`);
}

const packagedSmoke = {
  skipped: true,
  reason: 'Covered later by npm run desktop:smoke:packaged after the new package is built; this check stays focused on overlay prerequisites and hook/init evidence.'
};

warnings.push('True Shift+Tab overlay behavior cannot be proven by this headless/local check; launch the uploaded build from the Steam client and press Shift+Tab.');

const report = {
  ok: errors.length === 0,
  outputDir: rel(outputDir),
  appId: bridgeStatus.appId,
  leaderboardName: bridgeStatus.leaderboardName,
  optionalDependencyPath: optionalDependencyPath() ? rel(optionalDependencyPath()) : null,
  packageRoot: rel(packageRoot),
  checks,
  steamScreenshotHotkey: {
    key: 'F12',
    appClaimsHotkey: f12Checks.some((check) => !check.ok),
    checks: f12Checks,
    conclusion: f12Checks.every((check) => check.ok)
      ? 'The app does not claim F12 on the main input surfaces, leaving the Steam client free to use F12 for screenshots.'
      : 'At least one app input surface appears to claim F12; Steam screenshot behavior is at risk.'
  },
  packagedFiles,
  packagedSmoke,
  overlayConclusion: errors.length === 0
    ? 'Packaged runtime includes Steam API DLLs, unpacked Steamworks native module, steam-overlay.node, and initializes Steam before BrowserWindow creation. Manual Steam-client Shift+Tab verification is still required.'
    : 'Overlay prerequisites are incomplete or unproven.',
  fixedInCode: false,
  deferredReason: 'Enabling the experimental Electron native overlay bridge would add a new capture/overlay window path late in release; current safe action is prerequisite proof plus manual Steam-client verification.',
  warnings,
  errors
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (errors.length) {
  console.error(`[steam-overlay-hook] FAIL ${errors.join('; ')} report=${rel(reportPath)}`);
  process.exit(1);
}

assert.equal(report.appId, 4765070);
assert.equal(report.leaderboardName, 'nova_swarm_global_score_v2');
console.log(`[steam-overlay-hook] PASS manual_shift_tab_required=true report=${rel(reportPath)}`);
