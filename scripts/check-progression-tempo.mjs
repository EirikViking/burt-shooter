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
const levels = Array.from({ length: 20 }, (_, index) => index + 1);

function estimateBossIntervalSeconds(waveCount) {
  const waveSeconds = diff.estimatedWaveSeconds ?? 14.5;
  const briefingSeconds = Math.max(0, waveCount - 1) * ((diff.waveDelayMs ?? 0) / 1000);
  const bossGateSeconds = (diff.bossGateMs ?? 0) / 1000;
  return Number((waveCount * waveSeconds + briefingSeconds + bossGateSeconds).toFixed(1));
}

const wavePlan = levels.map((level) => {
  const waves = EnemyManager.prototype.generateWaves.call(probe, level);
  const bossHealth = Math.max(
    diff.bossMinHealth || 0,
    Math.round(diff.bossBaseHealth + Math.max(0, level - 1) * diff.bossHealthPerLevel)
  );
  return {
    level,
    waveCount: waves.length,
    enemyCount: waves.reduce((total, wave) => total + (Number(wave.count) || 0), 0),
    bossHealth,
    estimatedBossIntervalSeconds: estimateBossIntervalSeconds(waves.length),
    formations: [...new Set(waves.map((wave) => wave.formation))]
  };
});

const firstTen = wavePlan.slice(0, 10);
const totalNormalWavesToLevel10 = firstTen.reduce((total, level) => total + level.waveCount, 0);
const totalEnemiesToLevel10 = firstTen.reduce((total, level) => total + level.enemyCount, 0);
const errors = [];

assert(wavePlan[0].waveCount >= 6, `Level 1 needs at least six waves before the first boss, got ${wavePlan[0].waveCount}.`, errors);
assert(wavePlan[0].enemyCount >= 44, `Level 1 should make a stronger first impression, got ${wavePlan[0].enemyCount} enemies.`, errors);
assert(firstTen.every((level) => level.waveCount >= 6 && level.waveCount <= 8), 'Levels 1-10 should use at least six and at most eight regular waves before each boss.', errors);
assert(totalNormalWavesToLevel10 >= 60, `Too few normal waves before level 10 (${totalNormalWavesToLevel10}).`, errors);
assert(totalNormalWavesToLevel10 <= 72, `Too many normal waves before level 10 (${totalNormalWavesToLevel10}).`, errors);
assert(totalEnemiesToLevel10 >= 480, `Too few normal enemies before level 10 (${totalEnemiesToLevel10}).`, errors);
assert(totalEnemiesToLevel10 <= 780, `Too many normal enemies before level 10 (${totalEnemiesToLevel10}).`, errors);
assert(wavePlan[9].bossHealth <= 175, `Level 10 boss health is too slow for the 15-minute reachability target (${wavePlan[9].bossHealth}).`, errors);
assert(wavePlan[19].bossHealth <= 285, `Level 20 boss health is too high for difficult-but-possible pacing (${wavePlan[19].bossHealth}).`, errors);
assert(wavePlan.slice(0, 10).every((level) => level.estimatedBossIntervalSeconds >= 70 && level.estimatedBossIntervalSeconds <= 100), 'Early boss intervals should estimate around 75 seconds after the six-wave floor.', errors);
assert((diff.MIN_WAVES_BETWEEN_BOSSES ?? 0) >= 6, `MIN_WAVES_BETWEEN_BOSSES must be at least 6, got ${diff.MIN_WAVES_BETWEEN_BOSSES}.`, errors);
assert((diff.MIN_SECONDS_BETWEEN_BOSSES ?? 0) === 0, `MIN_SECONDS_BETWEEN_BOSSES should remain 0 because 75 seconds is an estimate, got ${diff.MIN_SECONDS_BETWEEN_BOSSES}.`, errors);
assert(diff.waveDelayMs <= 950, `Between-wave briefing is too long (${diff.waveDelayMs}ms).`, errors);
assert(diff.waveCleanupMs <= 850, `Wave cleanup window is too long (${diff.waveCleanupMs}ms).`, errors);
assert(diff.bossGateMs <= 1050, `Boss gate is too long (${diff.bossGateMs}ms).`, errors);
assert(BalanceConfig.level.sequenceDuration <= 1600, `Level-complete sequence is too long (${BalanceConfig.level.sequenceDuration}ms).`, errors);
assert((diff.challengeWaveChance ?? 0) <= 0.025, `Challenge wave chance risks pacing drag (${diff.challengeWaveChance}).`, errors);
assert((diff.challengeWaveCount ?? 0) <= 10, `Challenge wave count risks pacing drag (${diff.challengeWaveCount}).`, errors);
assert((BalanceConfig.rewards?.waveClearRepairTargetLives ?? 0) === 0, 'Wave clears must not auto-repair lives.', errors);
assert((BalanceConfig.rewards?.levelClearRepairTargetLives ?? 0) === 0, 'Level clears must not auto-repair lives.', errors);

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
    wavesPerBossBase: diff.wavesPerBossBase,
    wavesPerBossPerLevel: diff.wavesPerBossPerLevel,
    wavesPerBossMax: diff.wavesPerBossMax,
    MIN_WAVES_BETWEEN_BOSSES: diff.MIN_WAVES_BETWEEN_BOSSES,
    MIN_SECONDS_BETWEEN_BOSSES: diff.MIN_SECONDS_BETWEEN_BOSSES,
    bossTargetIntervalSeconds: diff.bossTargetIntervalSeconds,
    estimatedWaveSeconds: diff.estimatedWaveSeconds,
    levelSequenceDurationMs: BalanceConfig.level.sequenceDuration,
    bossBaseHealth: diff.bossBaseHealth,
    bossHealthPerLevel: diff.bossHealthPerLevel,
    challengeWaveChance: diff.challengeWaveChance,
    challengeWaveCount: diff.challengeWaveCount,
    rewards: BalanceConfig.rewards
  },
  totals: {
    totalNormalWavesToLevel10,
    totalEnemiesToLevel10,
    level10BossHealth: wavePlan[9].bossHealth,
    level20BossHealth: wavePlan[19].bossHealth
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

console.log(`[progression-tempo] PASS wavesToL10=${totalNormalWavesToLevel10} enemiesToL10=${totalEnemiesToLevel10} l10BossHp=${wavePlan[9].bossHealth} l20BossHp=${wavePlan[19].bossHealth} report=${path.join(outputDir, 'report.json')}`);
