import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { MAYHEM_SUPER_STORM_SURVIVED_VOICE_COUNT, MAYHEM_SUPER_STORM_WARNING_VOICE_COUNT } from '../src/config/MayhemSuperStormVoiceLines.js';
import { REINFORCEMENT_VOICE_COUNT } from '../src/config/ReinforcementVoiceLines.js';

const fail = (message) => {
  console.error(`[check-mayhem-reinforcement-waves] ${message}`);
  process.exit(1);
};

const read = (path) => readFileSync(path, 'utf8');

const enemyManager = read('src/managers/EnemyManager.js');
const playScene = read('src/scenes/PlayScene.js');
const soundCatalog = read('src/audio/SoundCatalog.js');
const leaderboardTypes = read('src/leaderboard/LeaderboardTypes.js');
const steamBridge = read('electron/steamLeaderboardBridge.cjs');
const config = BalanceConfig.difficulty?.mayhemReinforcements;
const changedFiles = execFileSync('git', ['diff', '--name-only', 'HEAD', '--'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean);
const protectedSurfacePatterns = [
  /^electron\/.*steam/i,
  /^release\/steamworks\//i,
  /^steam(_sdk|works)?\//i,
  /^src\/leaderboard\//i,
  /^src\/achievements\//i,
  /^src\/save\//i,
  /^src\/cloud\//i,
  /^src\/xp\//i,
  /^src\/scor(e|ing)\//i,
  /achievement/i,
  /leaderboard/i,
  /steam.*(appid|depot|cloud|branch|metadata)/i
];
const protectedChangedFiles = changedFiles
  .map((file) => file.replaceAll('\\', '/'))
  .filter((file) => protectedSurfacePatterns.some((pattern) => pattern.test(file)));
if (protectedChangedFiles.length) {
  fail(`Reinforcement tuning must not touch protected Steam/score/XP/save/achievement surfaces: ${protectedChangedFiles.join(', ')}`);
}
if (!leaderboardTypes.includes("STEAM_LEADERBOARD_NAME = 'nova_swarm_global_score_v2'")) {
  fail('Global Steam leaderboard identity changed.');
}
if (!steamBridge.includes("DEFAULT_STEAM_LEADERBOARD_NAME = 'nova_swarm_global_score_v2'")) {
  fail('Steam bridge leaderboard identity changed.');
}
if (!steamBridge.includes('DEFAULT_STEAM_APP_ID = 4765070')) {
  fail('Steam AppID changed.');
}

if (!config?.enabled) fail('Mayhem reinforcement config must be enabled.');
if (config.chance !== 0.20) fail(`Expected 20% normal-wave reinforcement chance, got ${config.chance}.`);
if (config.bossFightChance !== 0.20) fail(`Expected boss-fight reinforcement chance to be 20%, got ${config.bossFightChance}.`);
if (config.bossFightMinAgeMs !== 3500) fail(`Expected boss-fight reinforcements to start checking after 3500ms, got ${config.bossFightMinAgeMs}.`);
if (config.bossFightCheckIntervalMs !== 2600) fail(`Expected boss-fight reinforcement checks every 2600ms, got ${config.bossFightCheckIntervalMs}.`);
if (config.bossFightCooldownMs !== 9000) fail(`Expected boss-fight reinforcement cooldown at 9000ms, got ${config.bossFightCooldownMs}.`);
if (config.bossFightMaxEvents !== 2) fail(`Expected boss-fight reinforcements to cap at 2 events, got ${config.bossFightMaxEvents}.`);
if (config.doubleWaveChance !== 0.16) fail(`Expected 16% double-reinforcement chance, got ${config.doubleWaveChance}.`);
if (config.tripleWaveChance !== 0.10) fail(`Expected 10% triple-reinforcement chance, got ${config.tripleWaveChance}.`);
if (config.doubleWaveMinLevel !== 8) fail(`Expected double reinforcements to be gated until level 8, got ${config.doubleWaveMinLevel}.`);
if (config.doubleWaveRequiresPriorReinforcement !== false) fail('Multi-wave boss reinforcements must be allowed on the first reinforcement event from level 8 onward.');
if (config.normalMinWaveCount !== 3) fail(`Expected normal reinforcement events to spawn 3 waves, got ${config.normalMinWaveCount}.`);
if (config.normalMaxWaveCount !== 3) fail(`Expected normal reinforcement events to cap at 3 waves, got ${config.normalMaxWaveCount}.`);
if (config.normalMaxWaveChance !== 0) fail(`Expected extra fourth-wave chance to be disabled, got ${config.normalMaxWaveChance}.`);
if (config.normalMultiWaveMinLevel !== 8) fail(`Expected normal multi-wave reinforcements to be gated until level 8, got ${config.normalMultiWaveMinLevel}.`);
if (config.superStormChance !== 0.05) fail(`Expected 5% Mayhem super-storm chance, got ${config.superStormChance}.`);
if (config.superStormWaveCount !== 3) fail(`Expected Mayhem super-storms to cap at 3 waves, got ${config.superStormWaveCount}.`);
if (config.superStormMinLevel !== 8) fail(`Expected Mayhem super-storms to be gated until level 8, got ${config.superStormMinLevel}.`);
if (config.superStormFirstPityMinLevel !== 12) fail(`Expected first Mayhem super-storm pity to start at level 12, got ${config.superStormFirstPityMinLevel}.`);
if (config.superStormFirstPityMaxLevel !== 18) fail(`Expected first Mayhem super-storm pity to guarantee by level 18, got ${config.superStormFirstPityMaxLevel}.`);
if (config.superStormFirstPityEligibleMisses !== 16) fail(`Expected first Mayhem super-storm pity after 16 eligible misses, got ${config.superStormFirstPityEligibleMisses}.`);
if (config.superStormWarningMs < 2000 || config.superStormWarningMs > 3000) {
  fail(`Expected Mayhem super-storm warning lead to stay within 2-3 seconds, got ${config.superStormWarningMs}.`);
}
if (config.superStormWarningMs !== 2600) fail(`Expected Mayhem super-storm warning lead at 2600ms, got ${config.superStormWarningMs}.`);
if (config.superStormEntryDelayMs !== 220) fail(`Expected Mayhem super-storm group entry spacing at 220ms, got ${config.superStormEntryDelayMs}.`);
if (config.superStormLaneOffsetPx !== 58) fail(`Expected Mayhem super-storm lane offset at 58px, got ${config.superStormLaneOffsetPx}.`);
if (config.reinforcementScoreMultiplier !== 1.25) fail(`Expected normal reinforcement score multiplier 1.25, got ${config.reinforcementScoreMultiplier}.`);
if (config.bossReinforcementScoreMultiplier !== 1.35) fail(`Expected boss reinforcement score multiplier 1.35, got ${config.bossReinforcementScoreMultiplier}.`);
if (config.firstPityEligibleMisses !== 12) fail(`Expected first reinforcement pity after 12 eligible misses, got ${config.firstPityEligibleMisses}.`);
if (config.firstPityMinLevel !== 8) fail(`Expected first reinforcement pity to start at level 8, got ${config.firstPityMinLevel}.`);
if (config.firstPityMaxLevel !== 10) fail(`Expected first reinforcement pity target window at level 10, got ${config.firstPityMaxLevel}.`);
if (config.repeatPityEligibleMisses !== 18) fail(`Expected repeat reinforcement pity to stay action-forward but not constant, got ${config.repeatPityEligibleMisses}.`);
if (config.minWaveAgeMs !== 3600) fail(`Expected faster reinforcement eligibility at 3600ms, got ${config.minWaveAgeMs}.`);
if (config.warningMs !== 2000) fail(`Expected 2000ms warning, got ${config.warningMs}.`);
if (config.minClearRatio !== 0.32) {
  fail(`Expected early-overlap clear ratio gate at 32%, got ${config.minClearRatio}.`);
}
if (config.maxActiveEnemies !== 10) fail(`Expected active enemy gate to allow visible overlap pressure, got ${config.maxActiveEnemies}.`);
if (config.maxActiveEnemyBullets !== 26) fail(`Expected bullet gate to allow visible overlap pressure, got ${config.maxActiveEnemyBullets}.`);
if (config.pityMinWaveAgeMs !== 3200) fail(`Expected first-pity reinforcement soft gate at 3200ms, got ${config.pityMinWaveAgeMs}.`);
if (config.pityMinClearRatio !== 0.25) fail(`Expected first-pity reinforcement clear ratio gate at 25%, got ${config.pityMinClearRatio}.`);
if (config.pityMaxActiveEnemies !== 12) fail(`Expected first-pity reinforcement enemy gate at 12, got ${config.pityMaxActiveEnemies}.`);
if (config.pityMaxActiveEnemyBullets !== 30) fail(`Expected first-pity reinforcement bullet gate at 30, got ${config.pityMaxActiveEnemyBullets}.`);

const canSpawnWithAboutSixtyPercentLeft = ({ expected, objectiveCount }) => (
  objectiveCount <= config.maxActiveEnemies &&
  ((expected - objectiveCount) / expected) >= config.minClearRatio
);
if (!canSpawnWithAboutSixtyPercentLeft({ expected: 10, objectiveCount: 6 })) {
  fail('Reinforcements must be eligible with 60% of a 10-enemy wave still alive.');
}
if (!canSpawnWithAboutSixtyPercentLeft({ expected: 14, objectiveCount: 8 })) {
  fail('Reinforcements must be eligible with roughly 60% of a 14-enemy wave still alive.');
}

const requiredSourceSnippets = [
  'isRankedRunMode',
  "reasons.push('not_mayhem')",
  "this.phase !== 'WAVES' || this.state !== 'WAVE_ACTIVE'",
  'boss_active_or_pending',
  'sector_stinger_active',
  'player_respawn_or_invulnerable',
  'too_many_bullets',
  'not_enough_wave_progress',
  'MAYHEM_REINFORCEMENT_WARNING_TEXT',
  'mission_control_reinforcements_incoming',
  'showToast(translateText(MAYHEM_REINFORCEMENT_WARNING_TEXT)',
  'useSuperStormVoice ? MAYHEM_SUPER_STORM_WARNING_SOUND_ID : MAYHEM_REINFORCEMENT_WAVE_SOUND_ID',
  'spawnAt: now + warningMs',
  'shouldForceMayhemReinforcementByPity',
  'canRecordMayhemReinforcementMiss',
  'canRelaxMayhemReinforcementPityGates',
  'recordMayhemReinforcementMiss',
  'doubleWaveChance',
  'tripleWaveChance',
  'normalMinWaveCount',
  'normalMaxWaveCount',
  'normalMaxWaveChance',
  'normalMultiWaveMinLevel',
  'superStormChance',
  'superStormWaveCount',
  'superStormFirstPityMinLevel',
  'superStormFirstPityMaxLevel',
  'superStormFirstPityEligibleMisses',
  'shouldForceMayhemSuperStormByPity',
  'recordMayhemSuperStormMiss',
  'canRecordSuperStormMiss',
  'superStormPityForced',
  'superStormWarningMs',
  'superStormEntryDelayMs',
  'superStormLaneOffsetPx',
  'createMayhemSuperStormSyntheticWaveConfig',
  'getMayhemSuperStormWavePlan',
  "'mayhem-reinforcement-super-storm'",
  'MAYHEM_SUPER_STORM_WARNING_SOUND_ID',
  'MAYHEM_SUPER_STORM_SURVIVED_SOUND_ID',
  'AudioManager.playVoice(MAYHEM_SUPER_STORM_SURVIVED_SOUND_ID',
  'mayhemSuperStormSurvivalWaveCounts',
  'isMayhemSuperStorm',
  'forceMayhemSuperStormForDebug',
  'reinforcementScoreMultiplier',
  'bossReinforcementScoreMultiplier',
  'enemy.mayhemReinforcementScoreMultiplier',
  'bossFightChance',
  'bossFightCheckIntervalMs',
  'bossFightCooldownMs',
  'maybeScheduleBossMayhemReinforcement',
  'updateBossMayhemReinforcement',
  'createBossMayhemReinforcementWaveConfigs',
  'spawnBossMayhemReinforcementWave',
  'boss_mayhem_reinforcement.spawn_full_wave',
  "'mayhem-boss-reinforcement'",
  "'mayhem-boss-reinforcement-double-wave'",
  "'mayhem-boss-reinforcement-triple-wave'",
  "enemy.kind = 'boss_mayhem_reinforcement'",
  "config.isBossMayhemReinforcement",
  'reinforcementGroupCount',
  'Math.min(3',
  'const useSuperStormVoice = state.isSuperStorm === true',
  'groupIndex * 1200',
  'index * 1200',
  'allowConcurrentSpawn: isSuperStorm || index > 0',
  'this.bossReinforcementNextCheckAtMs = Date.now() + 1200',
  'doubleWaveMinLevel',
  'doubleWaveRequiresPriorReinforcement',
  "'mayhem-reinforcement-fourth-wave'",
  'reinforcementWaveIndices',
  'reinforcementGroupCount',
  'reinforcementLaneOffsetPx',
  'centeredIndex * (isSuperStorm',
  'reinforcementEntryDelayMs',
  'allowConcurrentSpawn',
  'multi_wave_gated',
  'not_enough_future_waves',
  'overdueMisses',
  'level >= config.firstPityMaxLevel && misses >= overdueMisses',
  'eligibility.reasons?.includes(\'roll_failed\')',
  'MAYHEM_REINFORCEMENT_HARD_REASONS',
  'MAYHEM_REINFORCEMENT_SOFT_REASONS',
  'pityRelaxed',
  'isMayhemReinforcement: true',
  'mayhemReinforcementConsumedWaveIndices.add',
  'while (this.mayhemReinforcementConsumedWaveIndices?.has(nextConsumedWaveIndex))',
  'hasPendingMayhemReinforcement()',
  'const transitionWaveIndex = consumedReinforcementWaveIndices.length',
  'playScene.wavesCleared = (Number(playScene.wavesCleared) || 0) + clearedWaveCount',
  'const bonus = waveClearScoreBase * clearedWaveNumber +',
  '(consumedReinforcementWaveIndex !== null ? waveClearScoreBase * (consumedReinforcementWaveIndex + 1) : 0)'
];

for (const snippet of requiredSourceSnippets) {
  if (!enemyManager.includes(snippet)) fail(`Missing source guard/behavior snippet: ${snippet}`);
}

for (const snippet of [
  'debugForceMayhemSuperStorm',
  'window.__novaForceMayhemSuperStorm',
  'showMayhemReinforcementStormWarning',
  'showMayhemReinforcementEntryBurst',
  'showMayhemReinforcementStormSurvived',
  'getMayhemReinforcementPresentationDebugState',
  "this.game?.markUnrankedRun?.(reason)",
  "key === 'KeyM'",
  'e.shiftKey'
]) {
  if (!playScene.includes(snippet)) fail(`Missing PlayScene debug review snippet: ${snippet}`);
}

const reinforcementSpawnBlock = enemyManager.slice(
  enemyManager.indexOf('this.measurePerformance(\'mayhem_reinforcement.spawn_wave\''),
  enemyManager.indexOf('maybeClearStalledWave', enemyManager.indexOf('this.measurePerformance(\'mayhem_reinforcement.spawn_wave\''))
);
if (reinforcementSpawnBlock.includes('forceClearAllEnemies') || reinforcementSpawnBlock.includes('this.enemies = []')) {
  fail('Reinforcement spawn must not clear existing wave enemies.');
}

const rollFor = (seed, level, waveIndex, salt = 'mayhem-reinforcement') => {
  const input = `${seed}:${salt}:${level}:${waveIndex}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000000) / 1000000;
};

let eligibleRolls = 0;
let hits = 0;
for (let seed = 0; seed < 1000; seed += 1) {
  for (let level = 1; level <= 40; level += 1) {
    for (let wave = 1; wave <= 3; wave += 1) {
      eligibleRolls += 1;
      if (rollFor(`check-${seed}`, level, wave) < config.chance) hits += 1;
    }
  }
}
const observedRate = hits / eligibleRolls;
if (observedRate < 0.19 || observedRate > 0.21) {
  fail(`Stable normal reinforcement roll drifted outside 20% band: ${observedRate.toFixed(4)}.`);
}

let bossEligibleRolls = 0;
let bossHits = 0;
for (let seed = 0; seed < 1000; seed += 1) {
  for (let level = 2; level <= 40; level += 1) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      bossEligibleRolls += 1;
      if (rollFor(`boss-check-${seed}`, level, attempt, 'mayhem-boss-reinforcement') < config.bossFightChance) bossHits += 1;
    }
  }
}
const observedBossRate = bossHits / bossEligibleRolls;
if (observedBossRate < 0.19 || observedBossRate > 0.21) {
  fail(`Boss-fight reinforcement roll drifted outside 20% band: ${observedBossRate.toFixed(4)}.`);
}

const normalReinforcementWaveCountFor = ({ seed, level, waveIndex, availableFutureWaves = 4 }) => {
  if (level < config.normalMultiWaveMinLevel) return 0;
  if (availableFutureWaves < config.normalMinWaveCount) return 0;
  const extraRoll = rollFor(seed, level, waveIndex, 'mayhem-reinforcement-fourth-wave');
  const desired = extraRoll < config.normalMaxWaveChance ? config.normalMaxWaveCount : config.normalMinWaveCount;
  return Math.min(desired, availableFutureWaves);
};

let threeWaveSeed = null;
let normalMultiWaveEligibleEvents = 0;
let overCapHits = 0;
for (let seed = 0; seed < 5000; seed += 1) {
  const id = `normal-multi-check-${seed}`;
  const count = normalReinforcementWaveCountFor({ seed: id, level: 12, waveIndex: 1, availableFutureWaves: 4 });
  normalMultiWaveEligibleEvents += 1;
  if (count === 3) threeWaveSeed ??= id;
  if (count > 3) overCapHits += 1;
}
if (!threeWaveSeed) fail('Expected at least one deterministic normal reinforcement event that schedules three waves.');
if (overCapHits > 0) fail(`Normal reinforcements must never schedule more than three waves; saw ${overCapHits} over-cap events.`);
if (normalReinforcementWaveCountFor({ seed: threeWaveSeed, level: 7, waveIndex: 1, availableFutureWaves: 4 }) !== 0) {
  fail('Normal multi-wave reinforcements must stay gated before level 8.');
}
if (normalReinforcementWaveCountFor({ seed: threeWaveSeed, level: 12, waveIndex: 1, availableFutureWaves: 2 }) !== 0) {
  fail('Normal reinforcements must not trigger unless enough future waves are available.');
}
const observedOverCapRate = overCapHits / normalMultiWaveEligibleEvents;

const superStormWaveCountFor = ({ seed, level, waveIndex }) => (
  level >= config.superStormMinLevel &&
  rollFor(seed, level, waveIndex, 'mayhem-reinforcement-super-storm') < config.superStormChance
    ? config.superStormWaveCount
    : 0
);

let superStormSeed = null;
let superStormEligibleEvents = 0;
let superStormHits = 0;
for (let seed = 0; seed < 5000; seed += 1) {
  for (let level = 8; level <= 40; level += 1) {
    for (let wave = 0; wave <= 5; wave += 1) {
      const id = `super-storm-${seed}`;
      superStormEligibleEvents += 1;
      if (superStormWaveCountFor({ seed: id, level, waveIndex: wave }) === 3) {
        superStormHits += 1;
        superStormSeed ??= id;
      }
    }
  }
}
if (!superStormSeed) fail('Expected at least one deterministic Mayhem super-storm seed.');
if (superStormWaveCountFor({ seed: superStormSeed, level: 7, waveIndex: 1 }) !== 0) {
  fail('Mayhem super-storms must stay gated before level 8.');
}
const observedSuperStormRate = superStormHits / superStormEligibleEvents;
if (observedSuperStormRate < 0.048 || observedSuperStormRate > 0.052) {
  fail(`Mayhem super-storm roll drifted outside 5% band: ${observedSuperStormRate.toFixed(4)}.`);
}

const superStormFirstPityReady = ({ level, misses, spawned = 0 }) => {
  if (spawned > 0) return false;
  if (level < config.superStormFirstPityMinLevel) return false;
  if (level >= config.superStormFirstPityMaxLevel) return true;
  return misses >= config.superStormFirstPityEligibleMisses;
};
if (superStormFirstPityReady({ level: 11, misses: 99 })) {
  fail('Mayhem super-storm pity must not force before level 12.');
}
if (!superStormFirstPityReady({ level: 12, misses: config.superStormFirstPityEligibleMisses })) {
  fail('Mayhem super-storm pity must be able to force from level 12 after enough eligible misses.');
}
if (!superStormFirstPityReady({ level: 18, misses: 0 })) {
  fail('Mayhem super-storm pity must guarantee the first super storm by level 18 even with zero recorded misses.');
}
if (superStormFirstPityReady({ level: 18, misses: 99, spawned: 1 })) {
  fail('Mayhem super-storm pity must stop after the first super storm has spawned.');
}

let bossDoubleEligibleEvents = 0;
let bossDoubleHits = 0;
for (let seed = 0; seed < 5000; seed += 1) {
  const doubleRoll = rollFor(`boss-double-${seed}`, 13, 0, 'mayhem-boss-reinforcement-double-wave');
  bossDoubleEligibleEvents += 1;
  if (doubleRoll < config.doubleWaveChance) bossDoubleHits += 1;
}
const observedBossDoubleRate = bossDoubleHits / bossDoubleEligibleEvents;
if (observedBossDoubleRate < 0.15 || observedBossDoubleRate > 0.17) {
  fail(`Boss double-reinforcement roll drifted outside 16% band: ${observedBossDoubleRate.toFixed(4)}.`);
}

let bossTripleEligibleEvents = 0;
let bossTripleHits = 0;
for (let seed = 0; seed < 5000; seed += 1) {
  const tripleRoll = rollFor(`boss-triple-${seed}`, 13, 0, 'mayhem-boss-reinforcement-triple-wave');
  bossTripleEligibleEvents += 1;
  if (tripleRoll < config.tripleWaveChance) bossTripleHits += 1;
}
const observedBossTripleRate = bossTripleHits / bossTripleEligibleEvents;
if (observedBossTripleRate < 0.09 || observedBossTripleRate > 0.11) {
  fail(`Boss triple-reinforcement roll drifted outside 10% band: ${observedBossTripleRate.toFixed(4)}.`);
}

const bossReinforcementGroupCountFor = ({ seed, level, attempt }) => {
  if (level < config.doubleWaveMinLevel) return 1;
  const tripleRoll = rollFor(seed, level, attempt, 'mayhem-boss-reinforcement-triple-wave');
  if (tripleRoll < config.tripleWaveChance) return 3;
  const doubleRoll = rollFor(seed, level, attempt, 'mayhem-boss-reinforcement-double-wave');
  return doubleRoll < config.doubleWaveChance ? 2 : 1;
};

let bossSingleSeed = null;
let bossDoubleSeed = null;
let bossTripleSeed = null;
for (let seed = 0; seed < 10000; seed += 1) {
  const id = `boss-group-count-${seed}`;
  const groupCount = bossReinforcementGroupCountFor({ seed: id, level: 13, attempt: 0 });
  if (groupCount === 1) bossSingleSeed ??= id;
  if (groupCount === 2) bossDoubleSeed ??= id;
  if (groupCount === 3) bossTripleSeed ??= id;
  if (bossSingleSeed && bossDoubleSeed && bossTripleSeed) break;
}
if (!bossSingleSeed) fail('Boss reinforcement events must still usually schedule one wave.');
if (!bossDoubleSeed) fail('Boss reinforcement events must be able to schedule two waves.');
if (!bossTripleSeed) fail('Boss reinforcement events must be able to schedule three waves.');
if (bossReinforcementGroupCountFor({ seed: bossTripleSeed, level: 7, attempt: 0 }) !== 1) {
  fail('Boss triple reinforcements must stay gated before level 8.');
}

let misses = 0;
let firstPityLevel = null;
const firstPityReady = (level, missCount) => {
  const overdueMisses = Math.max(1, Math.ceil(config.firstPityEligibleMisses * 0.5));
  return level >= config.firstPityMinLevel &&
    (
      missCount >= config.firstPityEligibleMisses ||
      (level >= config.firstPityMaxLevel && missCount >= overdueMisses)
    );
};
for (let level = 1; level <= 16; level += 1) {
  for (let wave = 1; wave <= 3; wave += 1) {
    const pityReady = firstPityReady(level, misses);
    if (pityReady) {
      firstPityLevel = level;
      break;
    }
    misses += 1;
  }
  if (firstPityLevel !== null) break;
}
if (firstPityLevel === null || firstPityLevel > config.firstPityMaxLevel) {
  fail('First reinforcement pity must force a later eligible wave by the level-10 target window.');
}
if (!firstPityReady(15, Math.ceil(config.firstPityEligibleMisses * 0.5))) {
  fail('First reinforcement pity must not expire after the target window; overdue misses must still force it later.');
}

let softBlockedMisses = 0;
let softPityLevel = null;
for (let level = 1; level <= 16; level += 1) {
  for (let wave = 1; wave <= 3; wave += 1) {
    const rollFailed = rollFor('no-natural-0', level, wave) >= config.chance;
    if (!rollFailed) continue;
    const pityReady = firstPityReady(level, softBlockedMisses);
    if (pityReady) {
      softPityLevel = level;
      break;
    }
    softBlockedMisses += 1;
  }
  if (softPityLevel !== null) break;
}
if (softPityLevel === null || softPityLevel > config.firstPityMaxLevel) {
  fail('Soft-blocked reinforcement misses must still feed first pity by the level-10 target window.');
}

const pityCanSpawnWithLotsLeft = ({ expected, objectiveCount, bullets, ageMs }) => (
  ageMs >= config.pityMinWaveAgeMs &&
  ((expected - objectiveCount) / expected) >= config.pityMinClearRatio &&
  objectiveCount <= Math.max(config.pityMaxActiveEnemies, Math.ceil(expected * 0.75)) &&
  bullets <= config.pityMaxActiveEnemyBullets
);
if (!pityCanSpawnWithLotsLeft({ expected: 14, objectiveCount: 10, bullets: 24, ageMs: 3300 })) {
  fail('First pity must be allowed to surface while roughly 70% of a 14-enemy wave is still alive.');
}

const expectedVoiceFiles = Array.from(
  { length: REINFORCEMENT_VOICE_COUNT },
  (_, index) => `public/audio/voice/mission-control/mission_control_reinforcements_incoming_${String(index + 1).padStart(3, '0')}.mp3`
);
for (const voiceFile of expectedVoiceFiles) {
  if (!existsSync(voiceFile)) fail(`Missing reinforcement voice asset: ${voiceFile}`);
  const manifestUrl = `/${voiceFile.replace(/^public\//, '').replaceAll('\\', '/')}`;
  if (!AssetManifest.audio.voice.includes(manifestUrl)) fail(`Asset manifest missing reinforcement voice asset: ${manifestUrl}`);
}
if (!soundCatalog.includes('mission_control_reinforcements_incoming') || !soundCatalog.includes('REINFORCEMENT_VOICE_COUNT')) {
  fail('Sound catalog does not include reinforcement voice event.');
}

for (const [eventName, count] of [
  ['boss_mayhem_super_storm_warning', MAYHEM_SUPER_STORM_WARNING_VOICE_COUNT],
  ['boss_mayhem_super_storm_survived', MAYHEM_SUPER_STORM_SURVIVED_VOICE_COUNT]
]) {
  for (let index = 0; index < count; index += 1) {
    const voiceFile = `public/audio/voice/mayhem-super-storm/${eventName}_${String(index + 1).padStart(2, '0')}.mp3`;
    if (!existsSync(voiceFile)) fail(`Missing Mayhem super-storm voice asset: ${voiceFile}`);
    const manifestUrl = `/${voiceFile.replace(/^public\//, '').replaceAll('\\', '/')}`;
    if (!AssetManifest.audio.voice.includes(manifestUrl)) fail(`Asset manifest missing Mayhem super-storm voice asset: ${manifestUrl}`);
  }
  if (!soundCatalog.includes(eventName)) fail(`Sound catalog does not include Mayhem super-storm voice event ${eventName}.`);
}

for (const locale of ['de', 'es', 'pt-BR', 'ru', 'ja', 'ko', 'zh-CN']) {
  const localeSource = read(`src/i18n/locales/${locale}.js`);
  if (!localeSource.includes("'INCOMING REINFORCEMENTS'")) {
    fail(`Locale ${locale} is missing INCOMING REINFORCEMENTS.`);
  }
}

console.log(`[check-mayhem-reinforcement-waves] ok normalChance=${config.chance} normalObserved=${observedRate.toFixed(4)} normalWaves=${config.normalMinWaveCount}-${config.normalMaxWaveCount} overCapObserved=${observedOverCapRate.toFixed(4)} superStormChance=${config.superStormChance} superStormObserved=${observedSuperStormRate.toFixed(4)} superStormWaves=${config.superStormWaveCount} bossObserved=${observedBossRate.toFixed(4)} bossDoubleChance=${config.doubleWaveChance} bossDoubleObserved=${observedBossDoubleRate.toFixed(4)} bossTripleChance=${config.tripleWaveChance} bossTripleObserved=${observedBossTripleRate.toFixed(4)} scoreMult=${config.reinforcementScoreMultiplier}/${config.bossReinforcementScoreMultiplier} warningMs=${config.warningMs}/${config.superStormWarningMs}`);
