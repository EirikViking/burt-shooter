import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { RunPacingConfig } from '../src/config/RunPacingConfig.js';
import {
  RUN_MODES,
  canRunModeSubmitGlobalLeaderboard,
  canRunModeUnlockAchievements,
  getRunModeNormalWaveScoreXpMultiplier,
  getRunModeProfile
} from '../src/game/RunMode.js';
import {
  calculatePilotXpForRun,
  previewRunProgression
} from '../src/progression/HangarProgressState.js';
import { STEAM_LEADERBOARD_NAME } from '../src/leaderboard/LeaderboardTypes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/mayhem-score-xp-attribution-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function readSource(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertMatches(source, pattern, label) {
  assert.match(source, pattern, label);
}

function assertNotMatches(source, pattern, label) {
  assert.doesNotMatch(source, pattern, label);
}

function normalScore(points, mode = RUN_MODES.RANKED) {
  return Math.round((Number(points) || 0) * getRunModeNormalWaveScoreXpMultiplier(mode));
}

function plainScore(points) {
  return Math.round(Number(points) || 0);
}

function expectedXp(summary, mode) {
  const xp = RunPacingConfig.pilotXp;
  const mult = getRunModeNormalWaveScoreXpMultiplier(mode);
  const scoreXp = Math.floor((Number(summary.score) || 0) / Math.max(1, xp.scoreDivisor));
  const sectorXp = Math.max(0, Math.floor(Number(summary.sectorReached) || 1) - 1) * xp.sectorReachedBase;
  const waveXp = Math.floor(Number(summary.wavesCleared) || 0) * xp.waveClear * mult;
  const bossXp = Math.floor(Number(summary.bossesKilled) || 0) * xp.bossDefeat;
  const discoveryXp = Math.floor(Number(summary.codexDiscoveries) || 0) * xp.codexDiscovery;
  const themeXp = Math.floor(Number(summary.runThemeDiscoveries) || 0) * xp.runThemeDiscovery;
  const noHitWaveXp = Math.floor(Number(summary.noHitWaves) || 0) * xp.noHitWave * mult;
  const noHitSectorXp = Math.floor(Number(summary.noHitSectors) || 0) * xp.noHitSector;
  const clearXp = summary.runCleared ? xp.runClear : 0;
  const livesXp = summary.runCleared ? Math.floor(Number(summary.clearLivesRemaining ?? summary.livesRemaining) || 0) * xp.clearWithLivesRemaining : 0;
  return Math.max(0, Math.floor(scoreXp + sectorXp + waveXp + bossXp + discoveryXp + themeXp + noHitWaveXp + noHitSectorXp + clearXp + livesXp));
}

mkdirSync(outputDir, { recursive: true });

const playSceneSource = readSource('src/scenes/PlayScene.js');
const enemyManagerSource = readSource('src/managers/EnemyManager.js');
const hangarSource = readSource('src/progression/HangarProgressState.js');
const leaderboardSource = readSource('src/leaderboard/LeaderboardTypes.js');

assert.equal(STEAM_LEADERBOARD_NAME, 'nova_swarm_global_score_v2');
assertMatches(leaderboardSource, /STEAM_LEADERBOARD_NAME\s*=\s*'nova_swarm_global_score_v2'/, 'global leaderboard identity should be unchanged');

assert.equal(BalanceConfig.difficulty.normalWaveDifficultyLevelOffset, 7);
assert.equal(getRunModeProfile(RUN_MODES.RANKED).normalWaveAggressionMult, 1);
assert.equal(getRunModeProfile(RUN_MODES.RANKED).normalWaveScoreXpMult, 1.2);
assert.equal(getRunModeNormalWaveScoreXpMultiplier(RUN_MODES.RANKED), 1.2);
assert.equal(getRunModeNormalWaveScoreXpMultiplier(RUN_MODES.SCOUT), 1);
assert.equal(getRunModeNormalWaveScoreXpMultiplier(RUN_MODES.SECTOR_START), 1);
assert.equal(getRunModeProfile(RUN_MODES.RANKED).bossDifficultyMult, 1);
assert.equal(getRunModeProfile(RUN_MODES.RANKED).bossAttackDangerMult, 1);
assert.equal(getRunModeProfile(RUN_MODES.SCOUT).bossDifficultyMult, 0.75);
assert.equal(getRunModeProfile(RUN_MODES.SCOUT).bossAttackDangerMult, 0.85);
assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.RANKED), true);
assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.SCOUT), false);
assert.equal(canRunModeSubmitGlobalLeaderboard(RUN_MODES.SECTOR_START), false);
assert.equal(canRunModeUnlockAchievements(RUN_MODES.RANKED), true);
assert.equal(canRunModeUnlockAchievements(RUN_MODES.SCOUT), false);
assert.equal(canRunModeUnlockAchievements(RUN_MODES.SECTOR_START), false);

assertMatches(playSceneSource, /isNormalWaveScoreCompensationEligible\(enemy = null\)\s*{[\s\S]*?this\.enemyManager\?\.phase !== 'WAVES'[\s\S]*?enemy\?\.kind === 'boss'[\s\S]*?enemy\?\.kind === 'bonus_drone'[\s\S]*?enemy instanceof BonusDrone[\s\S]*?getRunModeNormalWaveScoreXpMultiplier\(this\.game\?\.runMode\) > 1[\s\S]*?}/, 'normal-wave score eligibility should be gated to wave phase and exclude bosses/bonus drones');
assertMatches(playSceneSource, /getNormalWaveScoreAward\(points, enemy = null\)\s*{[\s\S]*?Math\.round\(base \* mult\)[\s\S]*?}/, 'normal-wave score award should apply one rounded multiplier');
assertMatches(playSceneSource, /addNormalWaveScore\(points, source = 'baseScore', enemy = null\)\s*{[\s\S]*?this\.game\.addScore\(this\.getNormalWaveScoreAward\(points, enemy\), source\)/, 'addNormalWaveScore should be the single normal-wave score gateway');
assertNotMatches(playSceneSource, /getNormalWaveScoreAward\([^)]*getNormalWaveScoreAward|addNormalWaveScore\([^)]*getNormalWaveScoreAward/, 'normal-wave scoring should not double-compensate');

assertMatches(playSceneSource, /this\.addNormalWaveScore\(enemy\.scoreValue \|\| 0, 'baseScore', enemy\)/, 'bomb-destroyed normal enemies should use compensated normal-wave score');
assertMatches(playSceneSource, /this\.getNormalWaveScoreAward\(this\.getComboScore\(enemy\.scoreValue\), enemy\)/, 'normal enemy combo kill score should use compensated award');
assertMatches(playSceneSource, /this\.addNormalWaveScore\(milestone\.bonus, 'baseScore', enemy\)/, 'combo milestone bonus should use compensated normal-wave score');
assertMatches(playSceneSource, /this\.addNormalWaveScore\(bonus, 'baseScore', enemy\)/, 'combo tick bonus should use compensated normal-wave score');
assertMatches(playSceneSource, /const bonusScore = this\.getNormalWaveScoreAward\([\s\S]*?520 \+ cleared\.length \* 85 \+ enemiesHit \* 160 \+ enemiesDestroyed \* 220/, 'Graze Break bonus should use compensated normal-wave score');
assertMatches(playSceneSource, /this\.getNormalWaveScoreAward\(this\.getComboScore\(enemy\.scoreValue\), enemy\)/, 'Graze Break enemy kill score should use compensated normal-wave score');

assertMatches(enemyManagerSource, /playScene\.addNormalWaveScore\?\.\(400, 'noHitBonus'\) \?\? this\.game\.addScore\(400, 'noHitBonus'\)/, 'normal-wave no-hit score should use compensated normal-wave score');
assertMatches(enemyManagerSource, /game\.scenes\.play\?\.addNormalWaveScore\?\.\(bonus, 'waveClearBonus'\) \?\? this\.game\.addScore\(bonus, 'waveClearBonus'\)/, 'normal-wave clear score should use compensated normal-wave score');
assertMatches(enemyManagerSource, /if \(clearedWave && clearedWave\.isChallenge\)[\s\S]*?const bonus = 3000;[\s\S]*?this\.game\.addScore\(bonus\)/, 'challenge/bonus wave clear should not use normal-wave compensation');

const bonusDroneSnippet = playSceneSource.slice(
  playSceneSource.indexOf('this.ambientBonusDrones.forEach(bonusDrone => {'),
  playSceneSource.indexOf('this.onEnemyKilled(bonusDrone);') + 'this.onEnemyKilled(bonusDrone);'.length
);
assertMatches(bonusDroneSnippet, /this\.game\.addScore\(this\.getComboScore\(500\)\)/, 'bonus drone reward should use the existing plain score path');
assertNotMatches(bonusDroneSnippet, /addNormalWaveScore|getNormalWaveScoreAward/, 'bonus drone reward should not be normal-wave compensated');

const sectorClearSnippet = playSceneSource.slice(
  Math.max(0, playSceneSource.indexOf('const appliedLevelClearScore') - 220),
  playSceneSource.indexOf('const appliedLevelClearScore') + 220
);
assertMatches(sectorClearSnippet, /this\.game\.addScore\(levelClearScore, 'sectorClearBonus'\)/, 'sector clear score should stay plain');
assertNotMatches(sectorClearSnippet, /addNormalWaveScore|getNormalWaveScoreAward/, 'sector clear score should not be normal-wave compensated');

assertMatches(hangarSource, /getRunModeNormalWaveScoreXpMultiplier\(summary\.runMode\)/, 'career XP should use the run-mode normal-wave multiplier');
assertMatches(hangarSource, /waveXp = floor\(summary\.wavesCleared\) \* xp\.waveClear \* normalWaveXpMult/, 'wave-clear XP should be compensated');
assertMatches(hangarSource, /noHitWaveXp = floor\(summary\.noHitWaves\) \* xp\.noHitWave \* normalWaveXpMult/, 'no-hit wave XP should be compensated');
assertMatches(hangarSource, /bossXp = floor\(summary\.bossesKilled\) \* xp\.bossDefeat/, 'boss XP should remain unscaled');

const sampleSummary = {
  score: 120000,
  sectorReached: 12,
  wavesCleared: 25,
  bossesKilled: 3,
  codexDiscoveries: 4,
  runThemeDiscoveries: 1,
  noHitWaves: 7,
  noHitSectors: 2,
  runCleared: true,
  clearLivesRemaining: 2
};
const mayhemSummary = { ...sampleSummary, runMode: RUN_MODES.RANKED };
const scoutSummary = { ...sampleSummary, runMode: RUN_MODES.SCOUT };
const sectorSummary = { ...sampleSummary, runMode: RUN_MODES.SECTOR_START };

assert.equal(calculatePilotXpForRun(mayhemSummary), expectedXp(mayhemSummary, RUN_MODES.RANKED), 'Mayhem XP should match compensated expected value');
assert.equal(calculatePilotXpForRun(scoutSummary), expectedXp(scoutSummary, RUN_MODES.SCOUT), 'Scout XP should remain uncompensated');
assert.equal(calculatePilotXpForRun(sectorSummary), expectedXp(sectorSummary, RUN_MODES.SECTOR_START), 'Sector Run XP should remain uncompensated');
assert.ok(calculatePilotXpForRun(mayhemSummary) > calculatePilotXpForRun(scoutSummary), 'Mayhem wave/no-hit-wave XP should exceed unscaled modes for same summary');

const bossOnly = {
  score: 0,
  sectorReached: 1,
  wavesCleared: 0,
  bossesKilled: 4,
  codexDiscoveries: 0,
  runThemeDiscoveries: 0,
  noHitWaves: 0,
  noHitSectors: 0,
  runCleared: false
};
assert.equal(calculatePilotXpForRun({ ...bossOnly, runMode: RUN_MODES.RANKED }), calculatePilotXpForRun({ ...bossOnly, runMode: RUN_MODES.SCOUT }), 'boss-only XP should not be mode-compensated');

const baseProgress = {
  pilotXp: 600,
  pilotRank: 0,
  highestPilotRank: 0,
  bestScore: 0,
  bestSector: 1,
  bestLevel: 1,
  unlockedShipIds: ['nova_ship_01']
};
const preview = previewRunProgression(mayhemSummary, baseProgress);
assert.equal(preview.xpGained, calculatePilotXpForRun(mayhemSummary), 'rank preview should use actual compensated Mayhem XP');
assert.equal(preview.next.pilotXp, baseProgress.pilotXp + preview.xpGained, 'rank preview should add compensated XP exactly once');

const scoreAttribution = {
  mayhemNormalEnemyScore100: normalScore(100, RUN_MODES.RANKED),
  mayhemNormalComboScore250: normalScore(250, RUN_MODES.RANKED),
  mayhemNormalWaveClear500: normalScore(500, RUN_MODES.RANKED),
  mayhemNoHitWave400: normalScore(400, RUN_MODES.RANKED),
  mayhemGrazeBreak1000: normalScore(1000, RUN_MODES.RANKED),
  bossScore1000: plainScore(1000),
  bossKillReward1000: plainScore(1000),
  sectorRunNormalScore100: normalScore(100, RUN_MODES.SECTOR_START),
  scoutNormalScore100: normalScore(100, RUN_MODES.SCOUT),
  bonusDroneReward500: plainScore(500)
};
assert.deepEqual(scoreAttribution, {
  mayhemNormalEnemyScore100: 120,
  mayhemNormalComboScore250: 300,
  mayhemNormalWaveClear500: 600,
  mayhemNoHitWave400: 480,
  mayhemGrazeBreak1000: 1200,
  bossScore1000: 1000,
  bossKillReward1000: 1000,
  sectorRunNormalScore100: 100,
  scoutNormalScore100: 100,
  bonusDroneReward500: 500
});

const report = {
  generatedAt: new Date().toISOString(),
  outputDir,
  status: 'passed',
  sourceCommitExpected: 'b73f72cdf59145ccf6a84e19941a066dae64cc79',
  steam: {
    appId: 4765070,
    depotId: 4765071,
    leaderboard: STEAM_LEADERBOARD_NAME
  },
  runModeMultipliers: {
    mayhem: getRunModeNormalWaveScoreXpMultiplier(RUN_MODES.RANKED),
    scout: getRunModeNormalWaveScoreXpMultiplier(RUN_MODES.SCOUT),
    sectorRun: getRunModeNormalWaveScoreXpMultiplier(RUN_MODES.SECTOR_START)
  },
  scoreAttribution,
  xpAttribution: {
    sampleSummary,
    mayhemXp: calculatePilotXpForRun(mayhemSummary),
    scoutXp: calculatePilotXpForRun(scoutSummary),
    sectorRunXp: calculatePilotXpForRun(sectorSummary),
    bossOnlyMayhemXp: calculatePilotXpForRun({ ...bossOnly, runMode: RUN_MODES.RANKED }),
    bossOnlyScoutXp: calculatePilotXpForRun({ ...bossOnly, runMode: RUN_MODES.SCOUT }),
    rankPreviewXpGained: preview.xpGained
  },
  scopeProof: {
    mayhemNormalEnemyScoreCompensated: true,
    mayhemComboScoreCompensated: true,
    mayhemNormalWaveClearCompensated: true,
    mayhemNoHitWaveCompensated: true,
    mayhemGrazeBreakCompensated: true,
    mayhemNormalWaveXpCompensated: true,
    bossScoreCompensated: false,
    bossXpCompensated: false,
    bossKillRewardCompensated: false,
    sectorRunCompensated: false,
    scoutCompensated: false,
    bonusDroneRewardCompensated: false,
    doubleCompensationDetected: false
  }
};

writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`[mayhem-score-xp-attribution] PASS report=${path.join(outputDir, 'report.json')}`);
