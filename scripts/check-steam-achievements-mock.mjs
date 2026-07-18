import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { AchievementManager } from '../src/achievements/AchievementManager.js';
import { getAchievementIds } from '../src/achievements/AchievementCatalog.js';
import { createSteamAchievementSync } from '../src/achievements/SteamAchievementSync.js';
import { RUN_MODES } from '../src/game/RunMode.js';

const require = createRequire(import.meta.url);
const { createSteamAchievementsBridge } = require('../electron/steamAchievementsBridge.cjs');

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function createFakeSteamBridge({ available = true, steamUnlocked = [] } = {}) {
  const unlocked = new Set(steamUnlocked);
  const calls = [];
  const manager = {
    async getAllAchievements() {
      return getAchievementIds().map((apiName) => ({ apiName, unlocked: unlocked.has(apiName) }));
    },
    async isAchievementUnlocked(id) {
      calls.push(['isAchievementUnlocked', id]);
      return unlocked.has(id);
    },
    async unlockAchievement(id) {
      calls.push(['SetAchievement', id]);
      unlocked.add(id);
      calls.push(['StoreStats', id]);
      return true;
    },
    async clearAchievement(id) {
      calls.push(['ClearAchievement', id]);
      unlocked.delete(id);
      calls.push(['StoreStats', id]);
      return true;
    }
  };
  const steamClientBridge = {
    steam: available ? { achievements: manager, user: { isLoggedOn: () => true } } : null,
    async initialize() {
      return available;
    },
    getStatus() {
      return {
        available,
        reason: available ? 'ready' : 'steam_init_returned_false',
        appId: 4765070,
        sdkPathConfigured: true,
        nativeModuleLoaded: available
      };
    }
  };
  return {
    bridge: createSteamAchievementsBridge({ steamClientBridge, logger: { warn() {} } }),
    calls,
    unlocked
  };
}

function createLocalManager(fake, storage = new MemoryStorage()) {
  const toastEvents = [];
  const steamSync = createSteamAchievementSync({
    storage,
    bridge: fake.bridge
  });
  const manager = new AchievementManager({
    storage,
    steamSync,
    onUnlock: (unlock) => toastEvents.push(unlock)
  });
  return { manager, steamSync, toastEvents };
}

function createRunModeManager(fake, runMode, storage = new MemoryStorage()) {
  const toastEvents = [];
  const steamSync = createSteamAchievementSync({
    storage,
    bridge: fake.bridge
  });
  const manager = new AchievementManager({
    storage,
    steamSync,
    onUnlock: (unlock) => toastEvents.push(unlock),
    getRunState: () => ({ runMode, isDebugRun: false })
  });
  return { manager, steamSync, toastEvents };
}

async function waitForAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const [firstId, secondId, thirdId] = getAchievementIds();

{
  const fake = createFakeSteamBridge();
  const { manager } = createRunModeManager(fake, RUN_MODES.RANKED);
  assert.equal(manager.unlock(firstId, { runMode: RUN_MODES.RANKED, allowAchievements: true })?.id, firstId);
  await waitForAsyncWork();
  assert.deepEqual(fake.calls.slice(-3), [
    ['isAchievementUnlocked', firstId],
    ['SetAchievement', firstId],
    ['StoreStats', firstId]
  ]);
}

{
  const fake = createFakeSteamBridge();
  const { manager, steamSync, toastEvents } = createRunModeManager(fake, RUN_MODES.SCOUT);
  assert.equal(manager.unlock(firstId, { runMode: RUN_MODES.SCOUT, allowAchievements: false }), null);
  await waitForAsyncWork();
  assert.equal(fake.calls.length, 0);
  assert.deepEqual(steamSync.getDebugState().queued, []);
  assert.equal(toastEvents.length, 0);
}

{
  const fake = createFakeSteamBridge();
  const { manager, steamSync, toastEvents } = createRunModeManager(fake, RUN_MODES.SECTOR_START);
  assert.equal(manager.unlock(firstId, { runMode: RUN_MODES.SECTOR_START, allowAchievements: false }), null);
  await waitForAsyncWork();
  assert.equal(fake.calls.length, 0);
  assert.deepEqual(steamSync.getDebugState().queued, []);
  assert.equal(toastEvents.length, 0);
}

{
  const fake = createFakeSteamBridge();
  const { manager } = createLocalManager(fake);
  assert.equal(manager.unlock(firstId, { ignoreRunGate: true })?.id, firstId);
  await waitForAsyncWork();
  assert.deepEqual(fake.calls.slice(-3), [
    ['isAchievementUnlocked', firstId],
    ['SetAchievement', firstId],
    ['StoreStats', firstId]
  ]);
}

{
  const fake = createFakeSteamBridge();
  const { manager } = createLocalManager(fake);
  assert.equal(manager.unlock('ACH_NOT_REAL', { ignoreRunGate: true }), null);
  await waitForAsyncWork();
  assert.equal(fake.calls.length, 0);
}

{
  const fake = createFakeSteamBridge();
  const { manager } = createLocalManager(fake);
  manager.unlock(firstId, { ignoreRunGate: true });
  await waitForAsyncWork();
  manager.unlock(firstId, { ignoreRunGate: true });
  await waitForAsyncWork();
  assert.equal(fake.calls.filter(([name]) => name === 'SetAchievement').length, 1);
}

{
  const fake = createFakeSteamBridge({ available: false });
  const { manager, steamSync } = createLocalManager(fake);
  assert.doesNotThrow(() => manager.unlock(firstId, { ignoreRunGate: true }));
  await waitForAsyncWork();
  assert.deepEqual(steamSync.getDebugState().queued, [firstId]);
}

{
  const storage = new MemoryStorage();
  const unavailable = createFakeSteamBridge({ available: false });
  const offline = createLocalManager(unavailable, storage);
  offline.manager.unlock(firstId, { ignoreRunGate: true });
  await waitForAsyncWork();
  const available = createFakeSteamBridge();
  const onlineSync = createSteamAchievementSync({ storage, bridge: available.bridge });
  const retry = await onlineSync.retryQueued();
  assert.equal(retry.ok, true);
  assert.equal(available.unlocked.has(firstId), true);
}

{
  const fake = createFakeSteamBridge();
  const { manager } = createLocalManager(fake);
  manager.importUnlocked([firstId], { source: 'test' });
  const result = await manager.syncWithSteam();
  assert.equal(result.ok, true);
  assert.equal(fake.unlocked.has(firstId), true);
}

{
  const fake = createFakeSteamBridge({ steamUnlocked: [secondId] });
  const { manager, toastEvents } = createLocalManager(fake);
  const result = await manager.syncWithSteam();
  assert.equal(result.ok, true);
  assert.equal(manager.isUnlocked(secondId), true);
  assert.equal(toastEvents.length, 0);
}

{
  const fake = createFakeSteamBridge({ steamUnlocked: [secondId] });
  const { manager, toastEvents } = createLocalManager(fake);
  manager.importUnlocked([firstId], { source: 'test' });
  const result = await manager.syncWithSteam();
  assert.equal(result.ok, true);
  assert.equal(manager.isUnlocked(firstId), true);
  assert.equal(manager.isUnlocked(secondId), true);
  assert.equal(toastEvents.length, 0);
}

{
  const fake = createFakeSteamBridge({ steamUnlocked: [thirdId] });
  const status = fake.bridge.getStatus();
  assert.equal(status.appId, 4765070);
  assert.equal(status.achievementManagerPresent, true);
  const stats = await fake.bridge.requestCurrentStats();
  assert.equal(stats.ok, true);
  assert.equal(stats.count, getAchievementIds().length);
}

{
  const fake = createFakeSteamBridge({ steamUnlocked: [firstId, secondId] });
  const result = await fake.bridge.clearAchievements({ ids: [firstId, secondId, thirdId] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.cleared, [firstId, secondId]);
  assert.deepEqual(result.skipped, [thirdId]);
  assert.deepEqual(result.steamUnlockedIds, []);
  assert.equal(fake.unlocked.size, 0);
  assert.deepEqual(fake.calls.filter(([name]) => name === 'ClearAchievement'), [
    ['ClearAchievement', firstId],
    ['ClearAchievement', secondId]
  ]);
}

console.log('[steam-achievements-mock] PASS local sync, queueing, Steam merge, StoreStats, clear, diagnostics');
