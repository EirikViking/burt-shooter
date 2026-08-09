import { ACHIEVEMENTS, getRankAchievementId } from '../src/achievements/AchievementCatalog.js';
import { RunPacingConfig } from '../src/config/RunPacingConfig.js';
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
  calculatePilotXpForRun,
  previewRunProgression,
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
const meteorNotaryRankIndex = 23;
if (getRankTitle(meteorNotaryRankIndex) !== 'Meteor Notary') fail('Meteor Notary must remain internal rank index 23');
if (getRankAchievementId(meteorNotaryRankIndex) !== 'ACH_RANK_23') fail('Meteor Notary Steam API id must remain ACH_RANK_23');
if (ACHIEVEMENTS.length >= 100) fail(`achievement catalog must stay below Steam's 100 achievement limit, got ${ACHIEVEMENTS.length}`);

const before = readHangarProgressState();
const normalRunXp = calculatePilotXpForRun({ score: 8400000, startSector: 1, sectorReached: 50 });
const enduranceRunXp = calculatePilotXpForRun({ score: 46140000, startSector: 1, sectorReached: 130 });
const shiftedEnduranceXp = calculatePilotXpForRun({ score: 46140000, startSector: 51, sectorReached: 180 });
if (normalRunXp !== Math.floor(8400000 / RunPacingConfig.pilotXp.scoreDivisor) + 49 * RunPacingConfig.pilotXp.sectorReachedBase) {
  fail('endurance bonus must not alter runs before 50 sectors cleared');
}
if (enduranceRunXp < 160000) fail(`130-sector endurance run should clear the reported late-rank gap, got ${enduranceRunXp}`);
if (shiftedEnduranceXp !== enduranceRunXp) fail('endurance bonus must use sectors actually cleared, not absolute starting sector');
const previewBeforeRaw = fakeStorage.get(HANGAR_PROGRESS_KEY);
const preview = previewRunProgression({
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
}, before);
if (fakeStorage.get(HANGAR_PROGRESS_KEY) !== previewBeforeRaw) fail('live rank preview must not write saved pilot progress');
if (preview.next.pilotRank <= before.pilotRank) fail('live rank preview should expose in-run rank gains');
if (!Array.isArray(preview.newRanksThisRun) || preview.newRanksThisRun.length === 0) fail('live rank preview should list new ranks');

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
if (migrated.bestSector < 4 || migrated.bestRank < 6) fail('old bestLevel/bestRank migration should preserve reasonable progress');
if (migrated.unlockedShipIds.length > 5) fail('old bestLevel migration should not over-unlock the hangar');

if (errors.length) {
  console.error(`[rank-progression] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[rank-progression] PASS ranks=${NUM_RANKS} achievements=${ACHIEVEMENTS.length} pilotRank=${result.next.pilotRank}`);
