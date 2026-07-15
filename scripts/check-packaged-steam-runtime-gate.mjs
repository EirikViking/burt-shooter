import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  resolvePackagedSmokeMode,
  validatePackagedSteamRuntime
} from './lib/packaged-steam-runtime-gate.mjs';

const readyState = {
  steamBridgeStatus: {
    available: true,
    reason: 'ready',
    nativeModuleLoaded: true
  },
  steamLeaderboardAvailable: true
};

const missingNativeState = {
  steamBridgeStatus: {
    available: false,
    reason: 'steamworks-ffi-node_not_installed',
    nativeModuleLoaded: false
  },
  steamLeaderboardAvailable: false
};

assert.equal(resolvePackagedSmokeMode({}), 'steam');
assert.equal(resolvePackagedSmokeMode({ NOVA_SWARM_PACKAGED_SMOKE_MODE: 'STEAM' }), 'steam');
assert.equal(resolvePackagedSmokeMode({ NOVA_SWARM_PACKAGED_SMOKE_MODE: 'local' }), 'local');
assert.throws(
  () => resolvePackagedSmokeMode({ NOVA_SWARM_PACKAGED_SMOKE_MODE: 'offline' }),
  /expected "steam" or "local"/
);

assert.deepEqual(validatePackagedSteamRuntime(readyState), {
  mode: 'steam',
  required: true,
  passed: true,
  errors: []
});

const failed = validatePackagedSteamRuntime(missingNativeState);
assert.equal(failed.required, true);
assert.equal(failed.passed, false);
assert.deepEqual(failed.errors, [
  'packaged Steam bridge unavailable (reason=steamworks-ffi-node_not_installed)',
  'packaged Steam native module not loaded',
  'packaged Steam leaderboard unavailable'
]);

const missingStatus = validatePackagedSteamRuntime({});
assert.equal(missingStatus.passed, false);
assert.match(missingStatus.errors[0], /reason=missing_status/);

assert.deepEqual(validatePackagedSteamRuntime(missingNativeState, { mode: 'local' }), {
  mode: 'local',
  required: false,
  passed: true,
  errors: []
});

function writeFile(root, relativePath, content = '') {
  const file = path.join(root, relativePath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function writeJson(root, relativePath, value) {
  writeFile(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createDesktopPackageFixture(root) {
  const build = 'v-packaged-steam-gate-test';
  const healthySmokeState = {
    apiOk: true,
    apiStatus: 200,
    scene: 'menu',
    build,
    readyState: { ready: true }
  };

  writeJson(root, 'public/version.json', {
    version: build,
    timestamp: '2000-01-01T00:00:00.000Z'
  });
  writeFile(root, 'release/desktop/win-unpacked/Nova Swarm.exe');
  writeFile(root, 'release/desktop/win-unpacked/steam_api64.dll');

  writeJson(root, 'test-results/electron-smoke-fixture/report.json', {
    status: 'passed',
    state: { ...healthySmokeState, ...readyState },
    consoleEvents: []
  });
  writeFile(root, 'test-results/electron-smoke-fixture/01-electron-menu.png');

  writeJson(root, 'test-results/packaged-exe-smoke-fixture/report.json', {
    status: 'passed',
    state: { ...healthySmokeState, ...missingNativeState },
    consoleEvents: []
  });
  writeFile(root, 'test-results/packaged-exe-smoke-fixture/01-electron-menu.png');

  writeJson(root, 'test-results/packaged-control-smoke-fixture/report.json', {
    status: 'passed',
    build,
    checks: {
      keyboardMovement: true,
      keyboardFire: true,
      keyboardPause: true,
      gamepadMovement: true,
      gamepadFire: true,
      gamepadPause: true
    },
    screenshots: [],
    consoleEvents: [],
    errors: []
  });

  writeJson(root, 'test-results/packaged-perf-smoke-fixture/report.json', {
    status: 'passed',
    build,
    minFps: 60,
    avgFps: 60,
    minRequiredFps: 50,
    consoleEvents: [],
    errors: []
  });
  writeFile(root, 'test-results/packaged-perf-smoke-fixture/01-electron-perf-final.png');
}

const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'nova-packaged-steam-gate-'));
const desktopPackageScript = fileURLToPath(new URL('./check-desktop-package.mjs', import.meta.url));
const strictEnv = { ...process.env };
delete strictEnv.NOVA_SWARM_PACKAGED_SMOKE_MODE;

try {
  createDesktopPackageFixture(fixtureRoot);
  const strictResult = spawnSync(process.execPath, [desktopPackageScript], {
    cwd: fixtureRoot,
    env: strictEnv,
    encoding: 'utf8',
    windowsHide: true
  });
  assert.notEqual(strictResult.status, 0, 'desktop package review must fail the missing native Steam runtime');
  assert.match(strictResult.stderr, /packaged Steam bridge unavailable/);
  assert.match(strictResult.stderr, /packaged Steam native module not loaded/);
  assert.match(strictResult.stderr, /packaged Steam leaderboard unavailable/);

  const strictReport = JSON.parse(readFileSync(
    path.join(fixtureRoot, 'release/steamworks/desktop_package_review_report.json'),
    'utf8'
  ));
  assert.equal(strictReport.status, 'failed');
  assert.equal(strictReport.packagedSmokeMode, 'steam');
  assert.equal(strictReport.latestPackagedExeSmoke.steamRuntimeValidation.passed, false);

  const localResult = spawnSync(process.execPath, [desktopPackageScript], {
    cwd: fixtureRoot,
    env: { ...strictEnv, NOVA_SWARM_PACKAGED_SMOKE_MODE: 'local' },
    encoding: 'utf8',
    windowsHide: true
  });
  assert.equal(localResult.status, 0, localResult.stderr || localResult.stdout);

  const localReport = JSON.parse(readFileSync(
    path.join(fixtureRoot, 'release/steamworks/desktop_package_review_report.json'),
    'utf8'
  ));
  assert.equal(localReport.status, 'passed');
  assert.equal(localReport.packagedSmokeMode, 'local');
  assert.equal(localReport.latestPackagedExeSmoke.steamRuntimeValidation.required, false);
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log('[packaged-steam-runtime-gate] PASS strict Steam failure and explicit local opt-out');
