import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

globalThis.Audio ??= class {
  constructor() {
    this.volume = 1;
    this.readyState = 4;
  }
  addEventListener() {}
  removeEventListener() {}
  play() { return Promise.resolve(); }
  pause() {}
  load() {}
  cloneNode() { return new globalThis.Audio(); }
};

class InstrumentedStorage {
  constructor() {
    this.map = new Map();
    this.reads = 0;
    this.writes = 0;
  }
  getItem(key) {
    this.reads += 1;
    return this.map.get(String(key)) ?? null;
  }
  setItem(key, value) {
    this.writes += 1;
    this.map.set(String(key), String(value));
  }
  removeItem(key) {
    this.map.delete(String(key));
  }
  resetCounters() {
    this.reads = 0;
    this.writes = 0;
  }
  byteSnapshot() {
    return JSON.stringify([...this.map.entries()].sort(([left], [right]) => left.localeCompare(right)));
  }
}

const storage = new InstrumentedStorage();
let directCloudSyncRequests = 0;
globalThis.localStorage = storage;
globalThis.window = {
  localStorage: storage,
  location: { origin: 'http://localhost', href: 'http://localhost/', search: '' },
  addEventListener() {},
  removeEventListener() {},
  __novaSteamCloudDiagnostics: {
    sync() {
      directCloudSyncRequests += 1;
      return Promise.resolve({ ok: true });
    }
  }
};
globalThis.document = {
  visibilityState: 'visible',
  documentElement: { classList: { contains: () => false } },
  addEventListener() {},
  removeEventListener() {}
};

const {
  configurePersistenceScheduler,
  createPersistenceScheduler,
  flushPersistence,
  getPersistenceSchedulerDebugState,
  resetPersistenceSchedulerForTests
} = await import('../src/persistence/PersistenceScheduler.js');
const {
  finishThreatDiscoveryRun,
  flushThreatDiscoveryState,
  readThreatDiscoveryState,
  recordThreatDefeated,
  recordThreatDefeatedBatch,
  recordThreatSeen,
  resetDiscoveryStateForTests,
  startThreatDiscoveryRun
} = await import('../src/progression/ThreatDiscoveryState.js');
const { createRunPolicy, getPrototypeDisabledRunPermissions } = await import('../src/game/RunPolicy.js');
const { Game } = await import('../src/game/Game.js');

async function waitFor(predicate, timeoutMs = 1000) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) throw new Error('Timed out waiting for asynchronous persistence state');
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function checkScheduler() {
  let collections = 0;
  let merges = 0;
  let snapshotValue = 1;
  let releaseMerge = null;
  let blockMerge = false;
  const scheduled = new Set();
  const scheduler = createPersistenceScheduler({
    collectSnapshot: () => ({ value: 1 }),
    mergeSnapshot: async () => {
      merges += 1;
      if (blockMerge) await new Promise((resolve) => { releaseMerge = resolve; });
      return { ok: true };
    },
    setTimeoutFn: (callback) => {
      scheduled.add(callback);
      return callback;
    },
    clearTimeoutFn: (callback) => scheduled.delete(callback)
  });
  scheduler.configure({
    collectSnapshot: () => {
      collections += 1;
      return { value: snapshotValue };
    }
  });

  for (let index = 0; index < 100; index += 1) scheduler.markDirty('hangarProgress');
  assert.equal(scheduled.size, 1, 'many dirty notifications must create at most one timer');
  await scheduler.flush({ reason: 'coalescing_test', force: true });
  assert.equal(collections, 1);
  assert.equal(merges, 1);

  scheduler.markDirty('same_snapshot');
  await scheduler.flush({ reason: 'unchanged_test', force: true });
  assert.equal(collections, 2);
  assert.equal(merges, 1, 'unchanged renderer snapshots must not issue another merge');

  blockMerge = true;
  snapshotValue = 2;
  scheduler.markDirty('first_in_flight');
  const first = scheduler.flush({ reason: 'in_flight_test', force: true });
  await waitFor(() => merges === 2);
  snapshotValue = 3;
  for (let index = 0; index < 100; index += 1) scheduler.markDirty('dirty_during_write');
  releaseMerge();
  await first;
  blockMerge = false;
  await scheduler.flush({ reason: 'follow_up_test', force: true });
  assert.equal(merges, 3, 'dirty state during a write must create one later follow-up merge');
  const state = scheduler.getDebugState();
  assert.equal(state.metrics.maxConcurrentOperations, 1);
  assert.equal(state.inFlight, false);
  return { collections, merges, metrics: state.metrics };
}

function createScoreHarness(policy) {
  const game = Object.create(Game.prototype);
  Object.assign(game, {
    finalScoreLocked: false,
    score: 0,
    scoreMultiplier: 1,
    scenes: { play: null },
    rankIndex: 0,
    level: 75,
    runPolicy: policy,
    scoreBreakdown: Game.prototype.createEmptyScoreBreakdown(),
    diag: { asEv: 0 },
    getScoreAward: (points) => Number(points) || 0,
    updateNoRepairReceiptsQualification() {},
    updateLiveRunRank() {},
    updateGlobalLeaderboardVoiceCues() {},
    updateHighscoreChaseCues() {}
  });
  return game;
}

async function checkRunPersistence() {
  resetPersistenceSchedulerForTests();
  let rendererCollections = 0;
  let cloudMerges = 0;
  configurePersistenceScheduler({
    collectSnapshot: () => {
      rendererCollections += 1;
      return { threatDiscovery: storage.getItem('nova.threatDiscovery.v1') };
    },
    mergeSnapshot: async () => {
      cloudMerges += 1;
      return { ok: true };
    },
    isCombatActive: () => false
  });

  const rankedPolicy = createRunPolicy({ runMode: 'ranked', isDebugRun: false, prototype: false });
  const scoreGame = createScoreHarness(rankedPolicy);
  storage.resetCounters();
  directCloudSyncRequests = 0;
  for (let index = 0; index < 100; index += 1) scoreGame.addScore(10, 'enemyScore');
  assert.equal(scoreGame.score, 1000);
  assert.equal(storage.writes, 0, 'score awards must not write localStorage during combat');
  assert.equal(directCloudSyncRequests, 0, 'score awards must not request direct Cloud sync');
  assert.equal(rendererCollections, 0, 'score awards must not collect a Cloud snapshot');
  assert.equal(cloudMerges, 0, 'score awards must not issue Cloud IPC');

  resetDiscoveryStateForTests();
  startThreatDiscoveryRun({ allowPersistentProgress: true });
  storage.resetCounters();
  directCloudSyncRequests = 0;
  const startedAt = performance.now();
  let newSeen = 0;
  let firstDefeats = 0;
  for (let index = 0; index < 100; index += 1) {
    const threatId = `stress_enemy_${index % 25}`;
    if (recordThreatSeen(threatId, 'enemies', { name: threatId }).isNew) newSeen += 1;
    if (recordThreatDefeated(threatId, 'enemies', { name: threatId }).isFirstDefeat) firstDefeats += 1;
  }
  const eventMs = performance.now() - startedAt;
  assert.equal(newSeen, 25);
  assert.equal(firstDefeats, 25);
  assert.equal(storage.writes, 0, 'Codex events must remain in memory until explicit flush');
  assert.equal(rendererCollections, 0);
  assert.equal(cloudMerges, 0);
  const stateBeforeFlush = readThreatDiscoveryState();
  for (let index = 0; index < 25; index += 1) {
    const item = stateBeforeFlush.items.enemies[`stress_enemy_${index}`];
    assert.equal(item.timesSeen, 4);
    assert.equal(item.timesDefeated, 4);
  }

  flushThreatDiscoveryState();
  assert.equal(storage.writes, 1, 'one Codex domain flush must perform one storage write');
  await flushPersistence({ reason: 'ranked_codex_test', force: true });
  assert.equal(rendererCollections, 1);
  assert.equal(cloudMerges, 1);
  finishThreatDiscoveryRun({ persist: false });

  const prototypePolicy = createRunPolicy({ runMode: 'ranked_tactical', isDebugRun: true, prototype: true });
  for (const [permission, expected] of Object.entries(getPrototypeDisabledRunPermissions())) {
    assert.equal(prototypePolicy[permission], expected, `prototype permission ${permission} must be false`);
  }
  const prototypeBefore = storage.byteSnapshot();
  const prototypeScore = createScoreHarness(prototypePolicy);
  startThreatDiscoveryRun({ allowPersistentProgress: prototypePolicy.allowCodexProgress });
  for (let index = 0; index < 100; index += 1) {
    prototypeScore.addScore(25, 'enemyScore');
    recordThreatSeen(`prototype_enemy_${index}`, 'enemies', { name: 'Prototype Enemy' });
    recordThreatDefeated(`prototype_enemy_${index}`, 'enemies', { name: 'Prototype Enemy' });
  }
  recordThreatDefeatedBatch(Array.from({ length: 100 }, (_, index) => ({
    threatId: `prototype_batch_enemy_${index}`,
    category: 'enemies',
    metadata: { name: 'Prototype Batch Enemy' }
  })));
  finishThreatDiscoveryRun({ persist: true, sync: true });
  assert.equal(prototypeScore.score, 2500, 'prototype score must still exist in memory for display');
  assert.equal(storage.byteSnapshot(), prototypeBefore, 'prototype events must leave progression bytes unchanged');
  assert.equal(getPersistenceSchedulerDebugState().dirtyDomainCount, 0, 'prototype events must not dirty Cloud progress');

  return {
    scoreAwards: {
      count: 100,
      score: scoreGame.score,
      storageWrites: 0,
      cloudSnapshotCollections: 0,
      cloudMerges: 0
    },
    codexEvents: {
      pairs: 100,
      eventMs: Number(eventMs.toFixed(3)),
      storageWritesBeforeFlush: 0,
      storageWritesAtFlush: 1,
      cloudSnapshotCollectionsAtFlush: 1,
      cloudMergesAtFlush: 1
    },
    prototype: {
      score: prototypeScore.score,
      progressionBytesUnchanged: true,
      cloudDirtyDomains: 0
    }
  };
}

async function checkElectronUnchangedWrite() {
  const require = createRequire(import.meta.url);
  const { createSteamCloudSave } = require('../electron/steamCloudSave.cjs');
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'nova-runtime-persistence-'));
  try {
    const saveSystem = createSteamCloudSave(tempRoot, { warn() {} }, {
      profile: { type: 'local', id: 'runtime-persistence-test' }
    });
    saveSystem.ensureInitialized();
    const payload = {
      selectedShipKey: 'nova_ship_01',
      settings: { screenShake: 0.8, playerFocus: 0.72 }
    };
    const changed = await saveSystem.mergeRendererStateAsync(payload);
    assert.equal(changed._persistenceIo?.fileWrites, 1, 'one local renderer merge must perform one atomic save-file write');
    const concurrent = await Promise.all([
      saveSystem.mergeRendererStateAsync({ ...payload, selectedShipKey: 'nova_ship_02' }),
      saveSystem.mergeRendererStateAsync({ ...payload, selectedShipKey: 'nova_ship_03' })
    ]);
    assert.equal(concurrent.every((result) => result?._persistenceIo?.fileWrites === 1), true);
    const before = statSync(saveSystem.paths.cloudSavePath).mtimeMs;
    await new Promise((resolve) => setTimeout(resolve, 12));
    const unchanged = await saveSystem.mergeRendererStateAsync({ ...payload, selectedShipKey: 'nova_ship_03' });
    const after = statSync(saveSystem.paths.cloudSavePath).mtimeMs;
    assert.equal(unchanged._persistenceIo?.writeSkipped, true);
    assert.equal(unchanged._persistenceIo?.fileWrites, 0);
    assert.equal(after, before, 'unchanged Electron state must not rewrite the save file');
    const diagnostics = saveSystem.getDiagnostics().io;
    assert.equal(diagnostics.maxConcurrentMerges, 1);
    return {
      unchangedWriteSkipped: true,
      changedFileWrites: changed._persistenceIo?.fileWrites,
      concurrentRequestsSerialized: true,
      mtimeUnchanged: true,
      maxConcurrentMerges: diagnostics.maxConcurrentMerges,
      asyncReads: diagnostics.asyncReads,
      asyncWrites: diagnostics.asyncWrites
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const scheduler = await checkScheduler();
const runtime = await checkRunPersistence();
const electron = await checkElectronUnchangedWrite();
console.log(JSON.stringify({ status: 'passed', scheduler, runtime, electron }, null, 2));
