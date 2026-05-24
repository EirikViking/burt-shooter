import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createSteamCloudSave, getPaths } = require('../electron/steamCloudSave.cjs');

const userData = mkdtempSync(path.join(tmpdir(), 'nova-steam-cloud-'));
const paths = getPaths(userData);

try {
  writeFileSync(paths.legacyHighscorePath, JSON.stringify([
    { name: 'ACE', score: 1200, level: 4, rankIndex: 2, timestamp: '2026-01-01T00:00:00.000Z' }
  ], null, 2));

  const saveSystem = createSteamCloudSave(userData, { warn() {} });
  const initialized = saveSystem.ensureInitialized();
  assert.equal(initialized.version, 1);
  assert.equal(initialized.localHighscores.length, 1);
  assert.equal(initialized.localHighscores[0].name, 'ACE');

  saveSystem.mirrorLocalHighscores([
    { name: 'ZEN', score: 2400, level: 6, rankIndex: 4, timestamp: '2026-01-02T00:00:00.000Z' }
  ]);
  const mirrored = JSON.parse(readFileSync(paths.cloudSavePath, 'utf8'));
  assert.equal(mirrored.localHighscores[0].name, 'ZEN');
  assert.equal(mirrored.localHighscores[0].score, 2400);

  const merged = saveSystem.mergeRendererState({
    selectedShipKey: 'nova-player-ship-04.png',
    progression: { bestScore: 9000, bestRank: 7, bestLevel: 12 },
    settings: { screenShake: 0.35, playerFocus: 0.8, colorAssist: true },
    debugFlags: { shouldNotPersist: true },
    absolutePath: 'C:/Users/example/AppData/Roaming/Nova Swarm'
  });
  assert.equal(merged.selectedShipKey, 'nova-player-ship-04.png');
  assert.deepEqual(merged.progression, { bestScore: 9000, bestRank: 7, bestLevel: 12 });
  assert.deepEqual(merged.settings, { screenShake: 0.35, playerFocus: 0.8, colorAssist: true });
  assert.equal(Object.hasOwn(merged, 'debugFlags'), false);
  assert.equal(Object.hasOwn(merged, 'absolutePath'), false);

  writeFileSync(paths.cloudSavePath, '{ broken json');
  const recovered = saveSystem.readSave();
  assert.equal(recovered.version, 1);
  assert.equal(Array.isArray(recovered.localHighscores), true);

  const diagnostics = saveSystem.getDiagnostics();
  assert.equal(diagnostics.steamworksAutoCloud.byteQuota, 1048576);
  assert.equal(diagnostics.steamworksAutoCloud.fileCount, 20);
  assert.equal(diagnostics.steamworksAutoCloud.root, 'WinAppDataRoaming');
  assert.equal(diagnostics.steamworksAutoCloud.pattern, 'nova-swarm-save.json');
  assert.equal(diagnostics.steamworksAutoCloud.recursive, false);
  assert.equal(diagnostics.steamworksAutoCloud.dynamicCloudSync, false);

  const oldUserData = mkdtempSync(path.join(tmpdir(), 'nova-steam-cloud-old-'));
  const oldPaths = getPaths(oldUserData);
  writeFileSync(oldPaths.oldHighscorePath, JSON.stringify([
    { name: 'OLDACE', score: 777, level: 3, rankIndex: 1, timestamp: '2026-01-03T00:00:00.000Z' }
  ]));
  const oldSaveSystem = createSteamCloudSave(oldUserData, { warn() {} });
  const oldInitialized = oldSaveSystem.ensureInitialized();
  assert.equal(oldInitialized.localHighscores[0].name, 'OLDACE');
  rmSync(oldUserData, { recursive: true, force: true });

  console.log(`[check-steam-cloud-save] PASS ${paths.cloudSavePath}`);
} finally {
  rmSync(userData, { recursive: true, force: true });
}
