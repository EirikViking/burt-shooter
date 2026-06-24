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
if (config.chance !== 0.1) fail(`Expected 10% reinforcement chance, got ${config.chance}.`);
if (config.warningMs !== 2000) fail(`Expected 2000ms warning, got ${config.warningMs}.`);
if (config.minClearRatio < 0.7 || config.minClearRatio > 0.8) {
  fail(`Expected clear ratio gate around 70-80%, got ${config.minClearRatio}.`);
}
if (config.maxActiveEnemies > 4) fail(`Expected safe active enemy gate <=4, got ${config.maxActiveEnemies}.`);

const requiredSourceSnippets = [
  'RUN_MODES.RANKED',
  "reasons.push('not_mayhem')",
  "this.phase !== 'WAVES' || this.state !== 'WAVE_ACTIVE'",
  'boss_active_or_pending',
  'sector_stinger_active',
  'player_respawn_or_invulnerable',
  'too_many_bullets',
  'MAYHEM_REINFORCEMENT_WARNING_TEXT',
  'mission_control_reinforcements_incoming',
  'showToast(translateText(MAYHEM_REINFORCEMENT_WARNING_TEXT)',
  'AudioManager.playVoice(MAYHEM_REINFORCEMENT_WAVE_SOUND_ID',
  'spawnAt: now + warningMs',
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
if (observedRate < 0.085 || observedRate > 0.115) {
  fail(`Stable reinforcement roll drifted outside rare 10% band: ${observedRate.toFixed(4)}.`);
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
