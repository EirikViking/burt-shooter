import { ACHIEVEMENTS, getRankAchievementId } from '../src/achievements/AchievementCatalog.js';
import {
  NUM_RANKS,
  getPilotRankProgress,
  getPilotXpThresholds,
  getRankFromPilotXp,
  getRankTitle
} from '../src/shared/RankPolicy.js';
import {
  HANGAR_PROGRESS_KEY,
  LEGACY_UNLOCK_PROGRESS_KEY,
  applyRunProgression,
  readHangarProgressState
} from '../src/progression/HangarProgressState.js';

const errors = [];
const fail = (message) => errors.push(message);

const fakeStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => fakeStorage.get(key) ?? null,
  setItem: (key, value) => fakeStorage.set(key, String(value)),
  removeItem: (key) => fakeStorage.delete(key)
};
fakeStorage.delete(HANGAR_PROGRESS_KEY);
fakeStorage.delete(LEGACY_UNLOCK_PROGRESS_KEY);

const thresholds = getPilotXpThresholds();
if (thresholds.length !== NUM_RANKS) fail(`pilot XP threshold count must match NUM_RANKS ${thresholds.length}/${NUM_RANKS}`);
for (let i = 1; i < thresholds.length; i += 1) {
  if (!(thresholds[i] > thresholds[i - 1])) fail(`pilot XP thresholds must increase at index ${i}`);
}
for (let rank = 1; rank < NUM_RANKS; rank += 1) {
  const id = getRankAchievementId(rank);
  if (id !== `ACH_RANK_${String(rank).padStart(2, '0')}`) fail(`rank achievement id changed for rank ${rank}: ${id}`);
  if (!ACHIEVEMENTS.some((entry) => entry.id === id)) fail(`achievement catalog missing ${id}`);
  if (!getRankTitle(rank)) fail(`rank ${rank} missing readable title`);
}
if (ACHIEVEMENTS.length >= 100) fail(`achievement catalog must stay below Steam's 100 achievement limit, got ${ACHIEVEMENTS.length}`);

const before = readHangarProgressState();
const result = applyRunProgression({
  score: 250000,
  sectorReached: 10,
  levelReached: 10,
  runElapsedSeconds: 1500,
  bossesKilled: 10,
  wavesCleared: 60,
  codexDiscoveries: 12,
  totalCodexDiscoveries: 12,
  runCleared: true,
  livesRemaining: 2
});
if (result.next.pilotRank < before.pilotRank) fail('pilot rank cannot go backwards');
if (!Array.isArray(result.newRanksThisRun)) fail('newRanksThisRun must be present');
if (!getPilotRankProgress(result.next.pilotXp)) fail('rank progress debug state missing');
if (getRankFromPilotXp(result.next.pilotXp) !== result.next.pilotRank) fail('pilot rank must derive from pilot XP');

fakeStorage.set(LEGACY_UNLOCK_PROGRESS_KEY, JSON.stringify({ bestLevel: 20, bestRank: 6, bestScore: 100000 }));
fakeStorage.delete(HANGAR_PROGRESS_KEY);
const migrated = readHangarProgressState();
if (migrated.bestLevel < 20 || migrated.bestRank < 6) fail('old bestLevel/bestRank migration should preserve reasonable progress');

if (errors.length) {
  console.error(`[rank-progression] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[rank-progression] PASS ranks=${NUM_RANKS} achievements=${ACHIEVEMENTS.length} pilotRank=${result.next.pilotRank}`);
