import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  BOSS_FUEL_SHIP_CODEX_ID,
  getBossSupportCodexDefeatEntries
} from '../src/progression/BossSupportCodexTracking.js';
import { BOSS_SUPPORT_SHIPS } from '../src/config/BossSupportShips.js';
import { getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';
import {
  THREAT_DISCOVERY_KEY,
  flushThreatDiscoveryState,
  invalidateThreatDiscoveryStateCache,
  readThreatDiscoveryState,
  recordThreatDefeatedBatch,
  recordThreatSeen,
  resetDiscoveryStateForTests
} from '../src/progression/ThreatDiscoveryState.js';

if (typeof globalThis.Audio === 'undefined') {
  globalThis.Audio = class AudioStub {
    play() {}
    pause() {}
    load() {}
    addEventListener() {}
    removeEventListener() {}
    cloneNode() {
      return new AudioStub();
    }
  };
}

const { PlayScene } = await import('../src/scenes/PlayScene.js');

const errors = [];
const fail = (message) => errors.push(message);

const fakeStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => fakeStorage.get(key) ?? null,
  setItem: (key, value) => fakeStorage.set(key, String(value)),
  removeItem: (key) => fakeStorage.delete(key)
};

function getEnemyItem(id) {
  return readThreatDiscoveryState().items?.enemies?.[id] || null;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

resetDiscoveryStateForTests();

const catalog = getThreatCodexCatalog();
const enemyCodexIds = new Set((catalog.enemies || []).map((entry) => entry.id));
assert(enemyCodexIds.has(BOSS_FUEL_SHIP_CODEX_ID), 'generic Boss Fuel Ship Codex entry is missing');
for (const profile of BOSS_SUPPORT_SHIPS) {
  assert(enemyCodexIds.has(profile.id), `${profile.id} support profile is missing from Threat Codex`);
}

const deliveryOnlyProfile = BOSS_SUPPORT_SHIPS[0];
recordThreatSeen(deliveryOnlyProfile.id, 'enemies', {
  name: deliveryOnlyProfile.displayName,
  role: 'Boss support'
});
recordThreatSeen(BOSS_FUEL_SHIP_CODEX_ID, 'enemies', {
  name: 'Boss Fuel Ship',
  role: 'Boss healer'
});
flushThreatDiscoveryState();
assert((getEnemyItem(deliveryOnlyProfile.id)?.timesDefeated || 0) === 0, 'support delivery/encounter should not count as profile Destroyed');
assert((getEnemyItem(BOSS_FUEL_SHIP_CODEX_ID)?.timesDefeated || 0) === 0, 'support delivery/encounter should not count as generic Boss Fuel Ship Destroyed');

resetDiscoveryStateForTests();
for (const profile of BOSS_SUPPORT_SHIPS) {
  recordThreatSeen(profile.id, 'enemies', {
    name: profile.displayName,
    role: 'Boss support',
    rarity: 'Boss Support',
    sector: 12
  });
  recordThreatSeen(BOSS_FUEL_SHIP_CODEX_ID, 'enemies', {
    name: 'Boss Fuel Ship',
    role: 'Boss healer',
    rarity: 'Boss Support',
    sector: 12
  });

  const entries = getBossSupportCodexDefeatEntries({
    kind: BOSS_FUEL_SHIP_CODEX_ID,
    bossSupportShipProfile: profile,
    bossFuelProfile: { id: profile.id }
  }, 12);
  const defeatIds = entries.map((entry) => entry.threatId);
  assert(defeatIds.includes(BOSS_FUEL_SHIP_CODEX_ID), `${profile.id} kill did not emit generic Boss Fuel Ship defeat`);
  assert(defeatIds.includes(profile.id), `${profile.id} kill did not emit profile defeat`);
  assert(new Set(defeatIds).size === defeatIds.length, `${profile.id} emitted duplicate Codex defeat IDs`);
  recordThreatDefeatedBatch(entries);
}
flushThreatDiscoveryState();
invalidateThreatDiscoveryStateCache();

const defeatedState = readThreatDiscoveryState();
const genericItem = defeatedState.items.enemies[BOSS_FUEL_SHIP_CODEX_ID];
assert(genericItem?.timesSeen === BOSS_SUPPORT_SHIPS.length, `generic Boss Fuel Ship Encounters should match support encounters, found ${genericItem?.timesSeen}`);
assert(genericItem?.timesDefeated === BOSS_SUPPORT_SHIPS.length, `generic Boss Fuel Ship Destroyed should match support kills, found ${genericItem?.timesDefeated}`);
for (const profile of BOSS_SUPPORT_SHIPS) {
  const item = defeatedState.items.enemies[profile.id];
  assert(item?.timesSeen === 1, `${profile.id} should keep its profile encounter count`);
  assert(item?.timesDefeated === 1, `${profile.id} should keep its profile Destroyed count`);
}

const fallbackProfile = BOSS_SUPPORT_SHIPS[1];
const fallbackEntries = getBossSupportCodexDefeatEntries({
  kind: BOSS_FUEL_SHIP_CODEX_ID,
  bossFuelProfile: { id: fallbackProfile.id }
}, 7);
assert(fallbackEntries.some((entry) => entry.threatId === fallbackProfile.id), 'defeat helper should resolve support profile from bossFuelProfile.id');
const unknownEntries = getBossSupportCodexDefeatEntries({
  kind: BOSS_FUEL_SHIP_CODEX_ID,
  bossFuelProfile: { id: 'missing_support_profile' }
}, 7);
assert(unknownEntries.length === 1 && unknownEntries[0].threatId === BOSS_FUEL_SHIP_CODEX_ID, 'unknown support profile should still count generic Boss Fuel Ship Destroyed only');
assert(getBossSupportCodexDefeatEntries({ kind: 'boss_chaos_support' }, 7).length === 0, 'boss chaos support waves should not be tracked as Boss Fuel Ship support profiles');

resetDiscoveryStateForTests();
const largeEntries = [];
for (let index = 0; index < 650; index += 1) {
  largeEntries.push({
    threatId: `boss_support_large_${String(index + 1).padStart(3, '0')}`,
    category: 'enemies',
    metadata: { name: `Boss Support Large ${index + 1}` }
  });
}
recordThreatDefeatedBatch(largeEntries);
flushThreatDiscoveryState();
invalidateThreatDiscoveryStateCache();
const largeCount = Object.keys(readThreatDiscoveryState().items.enemies || {}).length;
assert(largeCount === 650, `large Codex defeated state should not be capped at 500 entries, found ${largeCount}`);

resetDiscoveryStateForTests();
let scoreAwarded = 0;
const queueProbe = {
  game: {
    level: 9,
    isRankedRun: () => true,
    addScore(points) {
      scoreAwarded += Number(points) || 0;
      return Number(points) || 0;
    }
  },
  deferredThreatDefeats: [],
  deferredThreatDefeatStats: { queued: 0, flushed: 0, firstDefeats: 0 },
  threatDefeatSeenKeys: new Set(),
  isCollisionHotPathActive: false,
  discoveryBonus: 0,
  deferHotPathScoreAward() {}
};
const supportResult = PlayScene.prototype.queueThreatDefeat.call(
  queueProbe,
  BOSS_FUEL_SHIP_CODEX_ID,
  'enemies',
  { name: 'Boss Fuel Ship' },
  { scoreBonus: false }
);
assert(supportResult?.isFirstDefeat === true, 'support Codex accounting should still mark first defeats');
assert(supportResult?.appliedBonus === 0, 'support-specific Codex accounting should not award score');
assert(scoreAwarded === 0, 'support-specific Codex accounting should leave score unchanged');
PlayScene.prototype.queueThreatDefeat.call(queueProbe, 'normal_enemy_score_probe', 'enemies', { name: 'Score Probe' });
assert(scoreAwarded > 0, 'default threat defeat path should still award first-defeat score');

const playSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
assert(playSource.includes('getBossSupportCodexDefeatEntries(enemy, this.game.level)'), 'PlayScene should queue support Codex defeat entries from onEnemyKilled');
assert(playSource.includes('{ scoreBonus: false }'), 'support Codex defeat entries should disable extra first-defeat score bonuses');

const report = {
  checkedAt: new Date().toISOString(),
  supportProfiles: BOSS_SUPPORT_SHIPS.length,
  genericBossFuelShip: {
    timesSeen: genericItem?.timesSeen || 0,
    timesDefeated: genericItem?.timesDefeated || 0
  },
  largeCodexEntriesVerified: largeCount,
  scoreBonusSuppressedForSupportAccounting: scoreAwarded > 0 && supportResult?.appliedBonus === 0,
  errors
};
const outDir = join('test-results', `boss-support-codex-${new Date().toISOString().replace(/[:.]/g, '-')}`);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error(`[boss-support-codex] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  console.error(`[boss-support-codex] report=${join(outDir, 'report.json')}`);
  process.exit(1);
}

console.log(`[boss-support-codex] PASS profiles=${BOSS_SUPPORT_SHIPS.length} genericDestroyed=${genericItem?.timesDefeated || 0} largeEntries=${largeCount}`);
console.log(`[boss-support-codex] report=${join(outDir, 'report.json')}`);
