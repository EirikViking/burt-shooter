import assert from 'node:assert/strict';
import {
  getProfileScopedStorageKey,
  installProfileStorageNamespace
} from '../src/profile/ProfileStorageNamespace.js';
import { getMayhemModeBestScore } from '../src/progression/MayhemModeRecords.js';
import { RUN_MODES } from '../src/game/RunMode.js';
import { getLeaderboardDescriptorForRunMode } from '../src/leaderboard/LeaderboardTypes.js';

class MemoryStorage {
  constructor(entries = []) {
    this.map = new Map(entries);
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }
}

const recordKey = 'novaSwarm.onslaughtRanked.v2';
const cacheKey = 'novaSwarm.onslaughtSteamRecordsCache.v2';
const arcadeRecordsKey = 'novaSwarm.mayhemModeRecords.v1';
const firstProfile = { steamId: '76561198000000001' };
const secondProfile = { steamId: '76561198000000002' };
const legacyRecord = JSON.stringify({ score: 118181, rulesetVersion: 'onslaught_tactical_v2' });
const legacyCache = JSON.stringify({ entries: [{ score: 118181, isCurrentPlayer: true }] });
const legacyArcadeRecords = JSON.stringify({ pure: 718597, tactical: 40000 });
const storage = new MemoryStorage([
  [recordKey, legacyRecord],
  [cacheKey, legacyCache],
  [arcadeRecordsKey, legacyArcadeRecords]
]);
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'Storage');

try {
  globalThis.Storage = MemoryStorage;
  globalThis.window = { localStorage: storage };

  assert.notEqual(
    getProfileScopedStorageKey(recordKey, firstProfile),
    getProfileScopedStorageKey(recordKey, secondProfile),
    'Onslaught best must be isolated by Steam account'
  );
  assert.notEqual(
    getProfileScopedStorageKey(cacheKey, firstProfile),
    getProfileScopedStorageKey(cacheKey, secondProfile),
    'Onslaught Steam records cache must be isolated by Steam account'
  );
  assert.notEqual(getProfileScopedStorageKey(arcadeRecordsKey, firstProfile),
    getProfileScopedStorageKey(arcadeRecordsKey, secondProfile),
    'Arcade Pure and Tactical records must be isolated by Steam account');

  installProfileStorageNamespace(firstProfile);
  assert.equal(storage.getItem(recordKey), null, 'first account must not claim a shared legacy Onslaught score');
  assert.equal(storage.getItem(cacheKey), null, 'first account must not claim another account’s cached Steam records');
  assert.equal(storage.getItem(arcadeRecordsKey), null, 'first account must not claim a shared legacy Arcade score');
  assert.equal(storage.map.get(recordKey), legacyRecord, 'shared historical score must remain preserved as unscoped evidence');
  assert.equal(storage.map.get(cacheKey), legacyCache, 'shared legacy cache must remain preserved');
  assert.equal(storage.map.get(arcadeRecordsKey), legacyArcadeRecords, 'shared Arcade history must remain preserved');

  storage.setItem(recordKey, JSON.stringify({ score: 42000, rulesetVersion: 'onslaught_tactical_v2' }));
  storage.setItem(cacheKey, JSON.stringify({ entries: [{ score: 42000, isCurrentPlayer: true }] }));
  storage.setItem(arcadeRecordsKey, JSON.stringify({ pure: 1000, tactical: 22000 }));
  assert.equal(getMayhemModeBestScore(RUN_MODES.MAYHEM_TACTICAL), 22000,
    'Arcade Tactical chase must use this account’s Tactical best');
  assert.equal(getMayhemModeBestScore(RUN_MODES.RANKED), 1000,
    'Arcade Pure chase must use this account’s Pure best');
  assert.notEqual(getLeaderboardDescriptorForRunMode(RUN_MODES.MAYHEM_TACTICAL).leaderboardName,
    getLeaderboardDescriptorForRunMode(RUN_MODES.RANKED).leaderboardName,
    'Arcade Tactical and Pure must read different Steam boards');
  installProfileStorageNamespace(secondProfile);
  assert.equal(storage.getItem(recordKey), null, 'second account must not see the first account’s personal best');
  assert.equal(storage.getItem(cacheKey), null, 'second account must not see the first account’s current-player cache');
  assert.equal(storage.getItem(arcadeRecordsKey), null, 'second account must not see the first account’s Arcade best');
  assert.equal(getMayhemModeBestScore(RUN_MODES.MAYHEM_TACTICAL), 0,
    'a new account must not inherit the other player’s Tactical target');

  storage.setItem(recordKey, JSON.stringify({ score: 51000, rulesetVersion: 'onslaught_tactical_v2' }));
  storage.setItem(arcadeRecordsKey, JSON.stringify({ pure: 718597, tactical: 31000 }));
  installProfileStorageNamespace(firstProfile);
  assert.equal(JSON.parse(storage.getItem(recordKey)).score, 42000, 'first account should recover its own best after switching accounts');
  assert.equal(JSON.parse(storage.getItem(cacheKey)).entries[0].score, 42000, 'first account should recover its own cache after switching accounts');
  assert.equal(JSON.parse(storage.getItem(arcadeRecordsKey)).tactical, 22000, 'first account should recover its own Tactical best');
  installProfileStorageNamespace(secondProfile);
  assert.equal(JSON.parse(storage.getItem(recordKey)).score, 51000, 'second account should retain its own best after switching accounts');
  assert.equal(JSON.parse(storage.getItem(arcadeRecordsKey)).tactical, 31000, 'second account should retain its own Tactical best');

  console.log('[onslaught-profile-isolation] PASS separate Steam profiles; shared legacy values preserved without claiming');
} finally {
  if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
  else delete globalThis.window;
  if (previousStorage) Object.defineProperty(globalThis, 'Storage', previousStorage);
  else delete globalThis.Storage;
}
