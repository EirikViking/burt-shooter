import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SHIP_MASTERY_TIERS,
  getShipMasteryTier,
  mergeShipMasteryMaps,
  recordShipMasteryRun
} from '../src/progression/ShipMastery.js';
import {
  createCombatTelemetryState,
  getCombatDamageSourceForBullet,
  getCombatTelemetrySummary,
  recordCombatDamage,
  recordCombatProjectileHit,
  recordCombatVolley
} from '../src/game/CombatTelemetry.js';
import {
  SCOUT_ANOMALIES,
  applyScoutAnomalyToProfile,
  cycleScoutAnomaly,
  getScoutAnomaly
} from '../src/game/ScoutAnomalies.js';
import { RUN_MODES, getRunModeProfile } from '../src/game/RunMode.js';
import { getCompetitionLearningSourceText } from '../src/i18n/competitionLearningSourceText.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

assert.equal(getShipMasteryTier({ bestSector: 2 }).id, SHIP_MASTERY_TIERS.none.id);
assert.equal(getShipMasteryTier({ bestSector: 3 }).id, SHIP_MASTERY_TIERS.bronze.id);
assert.equal(getShipMasteryTier({ bestSector: 6 }).id, SHIP_MASTERY_TIERS.silver.id);
assert.equal(getShipMasteryTier({ bestSector: 6, clears: 1 }).id, SHIP_MASTERY_TIERS.gold.id);

const ignoredPractice = recordShipMasteryRun({}, {
  runMode: RUN_MODES.SCOUT,
  shipId: 'nova_ship_01',
  sectorReached: 10,
  runCleared: true
});
assert.equal(ignoredPractice.recorded, false);
assert.deepEqual(ignoredPractice.milestones, {});

const bronzeRun = recordShipMasteryRun({}, {
  runMode: RUN_MODES.RANKED,
  shipId: 'nova_ship_01',
  sectorReached: 3,
  score: 1200,
  bossesKilled: 2,
  combatTelemetry: { totalDamage: 415 }
}, { completedAt: '2026-07-16T10:00:00.000Z' });
assert.equal(bronzeRun.recorded, true);
assert.equal(bronzeRun.newTier.id, 'bronze');
assert.equal(bronzeRun.current.bestSector, 3);
assert.equal(bronzeRun.current.totalDamage, 415);

const preservedLegacyRun = recordShipMasteryRun({
  nova_ship_01: {
    runs: 1,
    bestSector: 2,
    legacyMarker: 'keep-me'
  }
}, {
  runMode: RUN_MODES.RANKED,
  shipId: 'nova_ship_01',
  sectorReached: 3
}, { completedAt: '2026-07-16T10:30:00.000Z' });
assert.equal(preservedLegacyRun.current.legacyMarker, 'keep-me');

const silverRun = recordShipMasteryRun(bronzeRun.milestones, {
  runMode: RUN_MODES.MAYHEM_TACTICAL,
  shipId: 'nova_ship_01',
  sectorReached: 6,
  score: 2400,
  bossesKilled: 3
}, { completedAt: '2026-07-16T11:00:00.000Z' });
assert.equal(silverRun.newTier.id, 'silver');
assert.equal(silverRun.current.runs, 2);
assert.equal(silverRun.current.totalBosses, 5);

const goldRun = recordShipMasteryRun(silverRun.milestones, {
  runMode: RUN_MODES.RANKED,
  shipId: 'nova_ship_01',
  sectorReached: 10,
  score: 4000,
  bossesKilled: 4,
  runCleared: true
}, { completedAt: '2026-07-16T12:00:00.000Z' });
assert.equal(goldRun.newTier.id, 'gold');
assert.equal(goldRun.current.clears, 1);

const mergedMastery = mergeShipMasteryMaps(
  { nova_ship_01: { runs: 2, bestSector: 6, legacyMarker: 'local', lastRunAt: '2026-07-15T10:00:00.000Z' } },
  { nova_ship_01: { runs: 3, bestSector: 4, cloudMarker: 'cloud', lastRunAt: '2026-07-16T10:00:00.000Z' } }
);
assert.equal(mergedMastery.nova_ship_01.runs, 3);
assert.equal(mergedMastery.nova_ship_01.bestSector, 6);
assert.equal(mergedMastery.nova_ship_01.legacyMarker, 'local');
assert.equal(mergedMastery.nova_ship_01.cloudMarker, 'cloud');

const telemetry = createCombatTelemetryState();
const bullets = [{ active: true }, { active: true }, { active: true }, { active: true }];
recordCombatVolley(telemetry, bullets);
assert.equal(recordCombatProjectileHit(telemetry, bullets[0]), true);
assert.equal(recordCombatProjectileHit(telemetry, bullets[0]), false);
recordCombatDamage(telemetry, { sourceId: 'primary', amount: 10, elapsedSeconds: 0.2 });
recordCombatDamage(telemetry, { sourceId: 'bomb', amount: 15, elapsedSeconds: 1.2 });
const telemetrySummary = getCombatTelemetrySummary(telemetry, 2);
assert.equal(telemetrySummary.projectilesFired, 4);
assert.equal(telemetrySummary.projectilesHit, 1);
assert.equal(telemetrySummary.accuracyPercent, 25);
assert.equal(telemetrySummary.totalDamage, 25);
assert.equal(telemetrySummary.averageDps, 12.5);
assert.equal(telemetrySummary.peakDps, 15);
assert.equal(telemetrySummary.topSourceId, 'bomb');
assert.equal(telemetrySummary.topSourcePercent, 60);
assert.equal(getCombatTelemetrySummary({ projectilesFired: 1, projectilesHit: 9 }, 1).accuracyPercent, 100);
assert.equal(getCombatDamageSourceForBullet({ isBomb: true }), 'bomb');
assert.equal(getCombatDamageSourceForBullet({ isPlasmaLance: true }), 'plasma_lance');
assert.equal(getCombatDamageSourceForBullet({ tacticalFusionId: 'rift_reprisal' }), 'tactical_fusion');
assert.equal(getCombatDamageSourceForBullet({ isTraitCriticalShot: true }), 'ship_trait');

assert.equal(SCOUT_ANOMALIES.length, 3);
assert.equal(getScoutAnomaly('missing').id, 'calibration');
assert.equal(cycleScoutAnomaly('calibration', 1).id, 'bullet_school');
assert.equal(cycleScoutAnomaly('calibration', -1).id, 'boss_lab');

const scoutBase = getRunModeProfile(RUN_MODES.SCOUT);
const calibration = applyScoutAnomalyToProfile(scoutBase, 'calibration');
const bulletSchool = applyScoutAnomalyToProfile(scoutBase, 'bullet_school');
const bossLab = applyScoutAnomalyToProfile(scoutBase, 'boss_lab');
assert.equal(calibration.normalWaveDifficultyLevelOffsetDelta, scoutBase.normalWaveDifficultyLevelOffsetDelta);
assert.equal(calibration.bossDifficultyMult, scoutBase.bossDifficultyMult);
assert.equal(bulletSchool.normalWaveDifficultyLevelOffsetDelta, -1);
assert.equal(bulletSchool.pressureMultipliers.projectileSpeedMult, 1);
assert.equal(bulletSchool.pressureMultipliers.sustainMult, scoutBase.pressureMultipliers.sustainMult);
assert.equal(bossLab.bossDifficultyMult, 1);
assert.equal(bossLab.bossAttackDangerMult, 1);
for (const profile of [calibration, bulletSchool, bossLab]) {
  assert.equal(profile.id, RUN_MODES.SCOUT);
  assert.equal(profile.ranked, false);
  assert.equal(profile.submitsGlobalLeaderboard, false);
  assert.equal(profile.submitsLocalLeaderboard, false);
  assert.equal(profile.unlocksAchievements, false);
  assert.equal(profile.updatesCareerProgress, false);
  assert.equal(profile.pressureMultipliers.scoreMult, 1);
}
assert.equal(getRunModeProfile(RUN_MODES.RANKED).difficultyProfileId, 'accepted_harder_ranked');
assert.equal(getRunModeProfile(RUN_MODES.RANKED).pressureMultipliers.scoreMult, 1);

for (const locale of ['de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
  assert.equal(Object.keys(getCompetitionLearningSourceText(locale)).length, 57, `${locale} translation coverage`);
}

const integrationMarkers = [
  ['src/game/Game.js', 'scoutAnomalyId'],
  ['src/game/Game.js', 'combatTelemetry: play?.getCombatTelemetrySummary?.()'],
  ['src/progression/HangarProgressState.js', 'shipSpecificMilestones: shipMastery.milestones'],
  ['src/steamCloudPersistence.js', 'mergeShipMasteryMaps'],
  ['src/scenes/PlayScene.js', 'applyCombatDamage(target, amount'],
  ['src/scenes/PlayScene.js', 'getPauseCombatTelemetrySummary'],
  ['src/scenes/MenuScene.js', 'cycleScoutAnomalySelection'],
  ['src/scenes/ShipDetailsScene.js', 'ui_shipMasteryMedals'],
  ['src/game/RunReport.js', "id: 'topDamageSource'"],
  ['src/ui/HowToPlayOverlay.js', '3 ANOMALIES // UNRANKED PRACTICE']
];
for (const [relativePath, marker] of integrationMarkers) {
  assert.match(read(relativePath), new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

console.log('Competition learning pass checks passed: ship mastery, combat telemetry, and Scout anomalies.');
