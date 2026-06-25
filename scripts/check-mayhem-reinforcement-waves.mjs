import { existsSync, readFileSync } from 'node:fs';
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
const config = BalanceConfig.difficulty?.mayhemReinforcements;

if (!config?.enabled) fail('Mayhem reinforcement config must be enabled.');
if (config.chance !== 0.05) fail(`Expected rare 5% reinforcement chance, got ${config.chance}.`);
if (config.firstPityEligibleMisses !== 14) fail(`Expected first reinforcement pity after 14 eligible misses, got ${config.firstPityEligibleMisses}.`);
if (config.firstPityMinLevel !== 6) fail(`Expected first reinforcement pity to start at level 6, got ${config.firstPityMinLevel}.`);
if (config.firstPityMaxLevel !== 9) fail(`Expected first reinforcement pity to protect by level 9, got ${config.firstPityMaxLevel}.`);
if (config.repeatPityEligibleMisses !== 24) fail(`Expected repeat reinforcement pity to stay rare, got ${config.repeatPityEligibleMisses}.`);
if (config.minWaveAgeMs !== 5000) fail(`Expected faster reinforcement eligibility at 5000ms, got ${config.minWaveAgeMs}.`);
if (config.warningMs !== 2000) fail(`Expected 2000ms warning, got ${config.warningMs}.`);
if (config.minClearRatio !== 0.4) {
  fail(`Expected early-overlap clear ratio gate at 40%, got ${config.minClearRatio}.`);
}
if (config.maxActiveEnemies !== 9) fail(`Expected active enemy gate to allow about 60% of a 14-enemy wave left, got ${config.maxActiveEnemies}.`);
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
  'eligibility.reasons?.includes(\'roll_failed\')',
  'MAYHEM_REINFORCEMENT_HARD_REASONS',
  'MAYHEM_REINFORCEMENT_SOFT_REASONS',
  'pityRelaxed',
  'isMayhemReinforcement: true',
  'mayhemReinforcementConsumedWaveIndices.add',
  'hasPendingMayhemReinforcement()',
  'transitionWaveIndex = consumedReinforcementWaveIndex ?? clearedWaveIndex',
  'playScene.wavesCleared = (Number(playScene.wavesCleared) || 0) + clearedWaveCount'
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

const rollFor = (seed, level, waveIndex) => {
  const input = `${seed}:mayhem-reinforcement:${level}:${waveIndex}`;
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
if (observedRate < 0.043 || observedRate > 0.057) {
  fail(`Stable reinforcement roll drifted outside rare 5% band: ${observedRate.toFixed(4)}.`);
}

let misses = 0;
let firstPityLevel = null;
for (let level = 1; level <= 9; level += 1) {
  for (let wave = 1; wave <= 3; wave += 1) {
    const pityReady = level >= config.firstPityMinLevel &&
      level <= config.firstPityMaxLevel &&
      misses >= config.firstPityEligibleMisses;
    if (pityReady) {
      firstPityLevel = level;
      break;
    }
    misses += 1;
  }
  if (firstPityLevel !== null) break;
}
if (firstPityLevel === null || firstPityLevel > config.firstPityMaxLevel) {
  fail('First reinforcement pity must force a later eligible wave before level 9 can pass with no event.');
}

let softBlockedMisses = 0;
let softPityLevel = null;
for (let level = 1; level <= 12; level += 1) {
  for (let wave = 1; wave <= 3; wave += 1) {
    const rollFailed = rollFor('no-natural-0', level, wave) >= config.chance;
    if (!rollFailed) continue;
    const pityReady = level >= config.firstPityMinLevel &&
      level <= config.firstPityMaxLevel &&
      softBlockedMisses >= config.firstPityEligibleMisses;
    if (pityReady) {
      softPityLevel = level;
      break;
    }
    softBlockedMisses += 1;
  }
  if (softPityLevel !== null) break;
}
if (softPityLevel === null || softPityLevel > config.firstPityMaxLevel) {
  fail('Soft-blocked reinforcement misses must still feed first pity before level 9.');
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

console.log(`[check-mayhem-reinforcement-waves] ok chance=${config.chance} observed=${observedRate.toFixed(4)} warningMs=${config.warningMs}`);
