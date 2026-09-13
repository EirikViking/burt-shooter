import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const electronPath = require('electron');
const root = process.cwd();
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR ||
  `test-results/fresh-profile-steam-isolation-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
const reportPath = path.join(outputDir, 'report.json');

mkdirSync(outputDir, { recursive: true });

const result = spawnSync(electronPath, ['electron/main.cjs', '--smoke', '--nova-fresh-profile', '--windowed'], {
  cwd: root,
  env: {
    ...process.env,
    NOVA_SWARM_ELECTRON_SMOKE_OUTPUT_DIR: outputDir,
    NOVA_SWARM_USER_DATA_DIR: path.join(outputDir, 'userData')
  },
  windowsHide: true,
  encoding: 'utf8',
  timeout: 90000
});

if (result.error) throw result.error;
if (!existsSync(reportPath)) {
  throw new Error(`Fresh-profile smoke report missing: ${reportPath}\n${result.stdout || ''}\n${result.stderr || ''}`);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const state = report.state || {};
const profile = state.steamCloudDiagnostics?.profile || {};
const summary = state.steamCloudDiagnostics?.persistenceSummary || {};

assert.equal(result.status, 0, result.stderr || result.stdout || 'fresh-profile Electron smoke failed');
assert.equal(report.status, 'passed');
assert.equal(profile.type, 'local');
assert.equal(profile.id, 'fresh-test-profile');
assert.equal(profile.steamId, null);
assert.equal(state.steamLeaderboardAvailable, false);
assert.equal(state.freshProfileSteamIsolated, true);
assert.equal(state.steamBridgeStatus?.available, false);
assert.equal(state.steamBridgeStatus?.reason, 'fresh_profile_isolated');
assert.equal(state.steamAchievementStatus?.available, false);
assert.equal(state.steamAchievementStatus?.reason, 'fresh_profile_isolated');
assert.equal(state.freshProfileSubmitProbe?.ignored, true);
assert.equal(state.freshProfileSubmitProbe?.reason, 'fresh_profile_isolated');
assert.equal(state.freshProfileAchievementProbe?.ignored, true);
assert.equal(state.freshProfileAchievementProbe?.reason, 'fresh_profile_isolated');
assert.equal(summary.achievementMirrorCount, 0);
assert.equal(summary.localHighscoresCount, 0);
assert.equal(summary.pilotOrdersCompleted, 0);

console.log(`[fresh-profile-steam-isolation] PASS report=${path.relative(root, reportPath)}`);
