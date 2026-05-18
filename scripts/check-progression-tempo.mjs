import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BalanceConfig } from '../src/config/BalanceConfig.js';

globalThis.Audio ??= class {
  constructor() {
    this.volume = 1;
    this.readyState = 4;
  }
  addEventListener() {}
  removeEventListener() {}
  play() { return Promise.resolve(); }
  pause() {}
  load() {}
  cloneNode() { return new globalThis.Audio(); }
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

const { EnemyManager } = await import('../src/managers/EnemyManager.js');
const probe = Object.create(EnemyManager.prototype);
const diff = BalanceConfig.difficulty;
const levels = Array.from({ length: 10 }, (_, index) => index + 1);

const wavePlan = levels.map((level) => {
  const waves = EnemyManager.prototype.generateWaves.call(probe, level);
  return {
    level,
    waveCount: waves.length,
    enemyCount: waves.reduce((total, wave) => total + (Number(wave.count) || 0), 0),
    bossHealth: Math.round(diff.bossBaseHealth + level * diff.bossHealthPerLevel),
    formations: [...new Set(waves.map((wave) => wave.formation))]
  };
});

const totalNormalWavesToLevel10 = wavePlan.reduce((total, level) => total + level.waveCount, 0);
const totalEnemiesToLevel10 = wavePlan.reduce((total, level) => total + level.enemyCount, 0);
const errors = [];

assert(wavePlan.slice(0, 6).every((level) => level.waveCount <= 2), 'Levels 1-6 should be two normal waves or less before each boss.', errors);
assert(wavePlan.slice(6).every((level) => level.waveCount <= 3), 'Levels 7-10 should cap at three normal waves before each boss.', errors);
assert(totalNormalWavesToLevel10 <= 24, `Too many normal waves before level 10 (${totalNormalWavesToLevel10}).`, errors);
assert(totalEnemiesToLevel10 <= 150, `Too many normal enemies before level 10 (${totalEnemiesToLevel10}).`, errors);
assert(wavePlan[9].bossHealth <= 300, `Level 10 boss health is too slow for the target tempo (${wavePlan[9].bossHealth}).`, errors);
assert(diff.waveDelayMs <= 1200, `Between-wave briefing is too long (${diff.waveDelayMs}ms).`, errors);
assert(diff.waveCleanupMs <= 1300, `Wave cleanup window is too long (${diff.waveCleanupMs}ms).`, errors);
assert(diff.bossGateMs <= 850, `Boss gate is too long (${diff.bossGateMs}ms).`, errors);
assert(BalanceConfig.level.sequenceDuration <= 1900, `Level-complete sequence is too long (${BalanceConfig.level.sequenceDuration}ms).`, errors);
assert((diff.challengeWaveChance ?? 0) <= 0.04, `Challenge wave chance risks pacing drag (${diff.challengeWaveChance}).`, errors);
assert((diff.challengeWaveCount ?? 0) <= 16, `Challenge wave count risks pacing drag (${diff.challengeWaveCount}).`, errors);

const report = {
  ok: errors.length === 0,
  buildTarget: 'level-10-tempo',
  tuning: {
    waveDelayMs: diff.waveDelayMs,
    waveBriefingAnnounceMs: diff.waveBriefingAnnounceMs,
    waveCleanupMs: diff.waveCleanupMs,
    enemyEntryDurationMs: diff.enemyEntryDurationMs,
    enemyEntryDelayBaseMs: diff.enemyEntryDelayBaseMs,
    bossGateMs: diff.bossGateMs,
    levelSequenceDurationMs: BalanceConfig.level.sequenceDuration,
    bossBaseHealth: diff.bossBaseHealth,
    bossHealthPerLevel: diff.bossHealthPerLevel,
    challengeWaveChance: diff.challengeWaveChance,
    challengeWaveCount: diff.challengeWaveCount
  },
  totals: {
    totalNormalWavesToLevel10,
    totalEnemiesToLevel10,
    level10BossHealth: wavePlan[9].bossHealth
  },
  wavePlan,
  errors
};

const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/progression-tempo-${timestamp()}`);
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

if (errors.length) {
  console.error(`[progression-tempo] FAIL ${errors.join('; ')}`);
  process.exit(1);
}

console.log(`[progression-tempo] PASS wavesToL10=${totalNormalWavesToLevel10} enemiesToL10=${totalEnemiesToLevel10} l10BossHp=${wavePlan[9].bossHealth} report=${path.join(outputDir, 'report.json')}`);
