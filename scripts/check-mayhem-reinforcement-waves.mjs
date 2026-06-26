import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { REINFORCEMENT_VOICE_COUNT } from '../src/config/ReinforcementVoiceLines.js';

const fail = (message) => {
  console.error(`[check-mayhem-reinforcement-waves] ${message}`);
  process.exit(1);
};

const read = (path) => readFileSync(path, 'utf8');

const enemyManager = read('src/managers/EnemyManager.js');
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
if (config.chance !== 0.15) fail(`Expected 15% reinforcement chance, got ${config.chance}.`);
if (config.bossFightChance !== 0.15) fail(`Expected boss-fight reinforcement chance to be 15%, got ${config.bossFightChance}.`);
if (config.bossFightMinAgeMs !== 3500) fail(`Expected boss-fight reinforcements to start checking after 3500ms, got ${config.bossFightMinAgeMs}.`);
if (config.bossFightCheckIntervalMs !== 2600) fail(`Expected boss-fight reinforcement checks every 2600ms, got ${config.bossFightCheckIntervalMs}.`);
if (config.bossFightCooldownMs !== 9000) fail(`Expected boss-fight reinforcement cooldown at 9000ms, got ${config.bossFightCooldownMs}.`);
if (config.bossFightMaxEvents !== 2) fail(`Expected boss-fight reinforcements to cap at 2 events, got ${config.bossFightMaxEvents}.`);
if (config.doubleWaveChance !== 0.08) fail(`Expected 8% double-reinforcement chance, got ${config.doubleWaveChance}.`);
if (config.doubleWaveMinLevel !== 8) fail(`Expected double reinforcements to be gated until level 8, got ${config.doubleWaveMinLevel}.`);
if (config.doubleWaveRequiresPriorReinforcement !== false) fail('Double reinforcements must be allowed on the first reinforcement event from level 8 onward.');
if (config.firstPityEligibleMisses !== 8) fail(`Expected first reinforcement pity after 8 eligible misses, got ${config.firstPityEligibleMisses}.`);
if (config.firstPityMinLevel !== 5) fail(`Expected first reinforcement pity to start at level 5, got ${config.firstPityMinLevel}.`);
if (config.firstPityMaxLevel !== 8) fail(`Expected first reinforcement pity target window at level 8, got ${config.firstPityMaxLevel}.`);
if (config.repeatPityEligibleMisses !== 18) fail(`Expected repeat reinforcement pity to stay rare but reachable, got ${config.repeatPityEligibleMisses}.`);
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
  'RUN_MODES.RANKED',
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
  'AudioManager.playVoice(MAYHEM_REINFORCEMENT_WAVE_SOUND_ID',
  'spawnAt: now + warningMs',
  'shouldForceMayhemReinforcementByPity',
  'canRecordMayhemReinforcementMiss',
  'canRelaxMayhemReinforcementPityGates',
  'recordMayhemReinforcementMiss',
  'doubleWaveChance',
  'bossFightChance',
  'bossFightCheckIntervalMs',
  'bossFightCooldownMs',
  'maybeScheduleBossMayhemReinforcement',
  'updateBossMayhemReinforcement',
  'spawnBossMayhemReinforcementWave',
  "'mayhem-boss-reinforcement'",
  "'mayhem-boss-reinforcement-double-wave'",
  "enemy.kind = 'boss_mayhem_reinforcement'",
  'reinforcementGroupCount',
  'groupEntryDelayMs',
  'groupIndex * 900',
  'maxActivePerGroup * waveGroups',
  'this.bossReinforcementNextCheckAtMs = Date.now() + 1200',
  'doubleWaveMinLevel',
  'doubleWaveRequiresPriorReinforcement',
  "'mayhem-reinforcement-double-wave'",
  'reinforcementWaveIndices',
  'reinforcementGroupCount',
  'reinforcementLaneOffsetPx',
  'reinforcementEntryDelayMs',
  'allowConcurrentSpawn',
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
if (observedRate < 0.14 || observedRate > 0.16) {
  fail(`Stable reinforcement roll drifted outside 15% band: ${observedRate.toFixed(4)}.`);
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
if (observedBossRate < 0.14 || observedBossRate > 0.16) {
  fail(`Boss-fight reinforcement roll drifted outside 15% band: ${observedBossRate.toFixed(4)}.`);
}

const reinforcementWaveCountFor = ({ seed, level, waveIndex, priorReinforcements = 1, hasSecondWave = true }) => {
  const doubleRoll = rollFor(seed, level, waveIndex, 'mayhem-reinforcement-double-wave');
  const canDouble = level >= config.doubleWaveMinLevel &&
    (!config.doubleWaveRequiresPriorReinforcement || priorReinforcements > 0) &&
    hasSecondWave &&
    doubleRoll < config.doubleWaveChance;
  return canDouble ? 2 : 1;
};

let oneWaveSeed = null;
let twoWaveSeed = null;
let doubleEligibleEvents = 0;
let doubleHits = 0;
for (let seed = 0; seed < 5000; seed += 1) {
  const id = `double-check-${seed}`;
  const count = reinforcementWaveCountFor({ seed: id, level: 12, waveIndex: 1, priorReinforcements: 1 });
  doubleEligibleEvents += 1;
  if (count === 2) {
    doubleHits += 1;
    twoWaveSeed ??= id;
  } else {
    oneWaveSeed ??= id;
  }
}
if (!oneWaveSeed) fail('Expected at least one deterministic reinforcement event that remains a single wave.');
if (!twoWaveSeed) fail('Expected at least one deterministic reinforcement event that can become two waves.');
if (reinforcementWaveCountFor({ seed: twoWaveSeed, level: 7, waveIndex: 1, priorReinforcements: 1 }) !== 1) {
  fail('Double reinforcements must stay gated before level 8.');
}
if (reinforcementWaveCountFor({ seed: twoWaveSeed, level: 12, waveIndex: 1, priorReinforcements: 0 }) !== 2) {
  fail('Double reinforcements must be allowed as the first reinforcement event once level 8 is reached.');
}
const observedDoubleRate = doubleHits / doubleEligibleEvents;
if (observedDoubleRate < 0.07 || observedDoubleRate > 0.09) {
  fail(`Double reinforcement roll drifted outside 8% band: ${observedDoubleRate.toFixed(4)}.`);
}

let bossDoubleEligibleEvents = 0;
let bossDoubleHits = 0;
for (let seed = 0; seed < 5000; seed += 1) {
  const doubleRoll = rollFor(`boss-double-${seed}`, 13, 0, 'mayhem-boss-reinforcement-double-wave');
  bossDoubleEligibleEvents += 1;
  if (doubleRoll < config.doubleWaveChance) bossDoubleHits += 1;
}
const observedBossDoubleRate = bossDoubleHits / bossDoubleEligibleEvents;
if (observedBossDoubleRate < 0.07 || observedBossDoubleRate > 0.09) {
  fail(`Boss double-reinforcement roll drifted outside 8% band: ${observedBossDoubleRate.toFixed(4)}.`);
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
for (let level = 1; level <= 12; level += 1) {
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
  fail('First reinforcement pity must force a later eligible wave by the level-8 target window.');
}
if (!firstPityReady(10, Math.ceil(config.firstPityEligibleMisses * 0.5))) {
  fail('First reinforcement pity must not expire after the target window; overdue misses must still force it later.');
}

let softBlockedMisses = 0;
let softPityLevel = null;
for (let level = 1; level <= 12; level += 1) {
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
  fail('Soft-blocked reinforcement misses must still feed first pity by the level-8 target window.');
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

for (const locale of ['de', 'es', 'pt-BR', 'ru', 'ja', 'ko', 'zh-CN']) {
  const localeSource = read(`src/i18n/locales/${locale}.js`);
  if (!localeSource.includes("'INCOMING REINFORCEMENTS'")) {
    fail(`Locale ${locale} is missing INCOMING REINFORCEMENTS.`);
  }
}

console.log(`[check-mayhem-reinforcement-waves] ok chance=${config.chance} observed=${observedRate.toFixed(4)} bossObserved=${observedBossRate.toFixed(4)} doubleChance=${config.doubleWaveChance} doubleObserved=${observedDoubleRate.toFixed(4)} bossDoubleObserved=${observedBossDoubleRate.toFixed(4)} warningMs=${config.warningMs}`);
