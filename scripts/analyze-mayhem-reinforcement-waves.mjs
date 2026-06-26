import { mkdirSync, writeFileSync } from 'node:fs';
import { BalanceConfig } from '../src/config/BalanceConfig.js';

const reportPath = 'test-results/mayhem-reinforcement-wave-analysis-20260624.json';
const config = BalanceConfig.difficulty.mayhemReinforcements;
const profiles = [
  { id: 'novice', lives: 4, clearSeconds: 18.5, deathRisk: 0.034, pressureRisk: 0.024, scoreMult: 0.74, xpMult: 0.72 },
  { id: 'medium', lives: 5, clearSeconds: 15.2, deathRisk: 0.021, pressureRisk: 0.015, scoreMult: 0.93, xpMult: 0.9 },
  { id: 'high', lives: 6, clearSeconds: 12.4, deathRisk: 0.012, pressureRisk: 0.008, scoreMult: 1.16, xpMult: 1.12 }
];

const rollFor = (seed, level, waveIndex, salt = 'mayhem-reinforcement') => {
  const input = `${seed}:${salt}:${level}:${waveIndex}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000000) / 1000000;
};

const enemyCountFor = (level, waveIndex) => {
  const diff = BalanceConfig.difficulty;
  return Math.round(Math.min(
    diff.waveEnemyMax,
    diff.waveEnemyBase + level * diff.waveEnemyPerLevel + waveIndex * diff.waveEnemyPerWave
  ));
};

const simulateRun = ({ seed, profile, enabled }) => {
  let lives = profile.lives;
  let sector = 1;
  let score = 0;
  let xp = 0;
  let seconds = 0;
  let deaths = 0;
  let reinforcements = 0;
  let reinforcementDeaths = 0;
  let doubleReinforcementEvents = 0;
  let fourthNormalReinforcementEvents = 0;
  let reinforcementWaves = 0;
  let wavesCleared = 0;
  let bossEncounters = 0;
  let reinforcementEligibleMisses = 0;
  let reinforcementSpawned = 0;

  const firstPityReady = () => {
    if (reinforcementSpawned > 0) return false;
    const overdueMisses = Math.max(1, Math.ceil(config.firstPityEligibleMisses * 0.5));
    return sector >= config.firstPityMinLevel &&
      (
        reinforcementEligibleMisses >= config.firstPityEligibleMisses ||
        (sector >= config.firstPityMaxLevel && reinforcementEligibleMisses >= overdueMisses)
      );
  };

  const repeatPityReady = () => (
    reinforcementSpawned > 0 &&
    reinforcementEligibleMisses >= config.repeatPityEligibleMisses
  );

  while (lives > 0 && sector <= 45) {
    let wave = 0;
    while (wave < 5 && lives > 0) {
      const enemies = enemyCountFor(sector, wave);
      const waveSeconds = profile.clearSeconds + enemies * 0.34 + sector * 0.08;
      const availableFutureWaves = 5 - (wave + 1);
      const canSpawnNormalMultiWave = sector >= config.normalMultiWaveMinLevel &&
        availableFutureWaves >= config.normalMinWaveCount;
      const canAttemptReinforcement = enabled &&
        canSpawnNormalMultiWave &&
        wave + 1 >= config.minNextWaveIndex;
      const naturalHit = canAttemptReinforcement && rollFor(seed, sector, wave) < config.chance;
      const eligible = canAttemptReinforcement && (naturalHit || firstPityReady() || repeatPityReady());
      if (eligible) {
        const canFourthWave = availableFutureWaves >= config.normalMaxWaveCount &&
          rollFor(seed, sector, wave, 'mayhem-reinforcement-fourth-wave') < config.normalMaxWaveChance;
        const consumedWaves = canFourthWave ? config.normalMaxWaveCount : config.normalMinWaveCount;
        const reinforcementEnemies = Array.from(
          { length: consumedWaves },
          (_, index) => enemyCountFor(sector, wave + 1 + index)
        ).reduce((sum, count) => sum + count, 0);
        const pressureRoll = rollFor(seed, sector, wave, `pressure-${profile.id}`);
        const pressureDeathRisk = Math.min(0.24, profile.pressureRisk + sector * 0.00045 + 0.018 + (canFourthWave ? 0.006 : 0));
        reinforcements += 1;
        reinforcementWaves += consumedWaves;
        if (canFourthWave) fourthNormalReinforcementEvents += 1;
        reinforcementSpawned += 1;
        reinforcementEligibleMisses = 0;
        seconds += config.warningMs / 1000 + waveSeconds + Math.max(4.8, reinforcementEnemies * 0.22);
        score += (enemies + reinforcementEnemies) * 48 * profile.scoreMult;
        xp += (enemies + reinforcementEnemies) * 2.25 * profile.xpMult;
        wavesCleared += 1 + consumedWaves;
        if (pressureRoll < pressureDeathRisk) {
          deaths += 1;
          reinforcementDeaths += 1;
          lives -= 1;
          seconds += 1.2;
        }
        wave += 1 + consumedWaves;
        continue;
      }
      if (canAttemptReinforcement) reinforcementEligibleMisses += 1;

      const deathRoll = rollFor(seed, sector, wave, `normal-${profile.id}`);
      const normalDeathRisk = Math.min(0.14, profile.deathRisk + sector * 0.00035);
      seconds += waveSeconds;
      score += enemies * 48 * profile.scoreMult;
      xp += enemies * 2.25 * profile.xpMult;
      wavesCleared += 1;
      if (deathRoll < normalDeathRisk) {
        deaths += 1;
        lives -= 1;
        seconds += 1.2;
      }
      wave += 1;
    }

    if (lives <= 0) break;
    bossEncounters += 1;
    seconds += 18 + sector * 0.2;
    const bossDeathRisk = Math.min(0.08, 0.006 + sector * 0.00075);
    if (rollFor(seed, sector, 99, `boss-${profile.id}`) < bossDeathRisk) {
      deaths += 1;
      lives -= 1;
    }
    if (
      enabled &&
      sector >= 2 &&
      rollFor(seed, sector, 0, 'mayhem-boss-reinforcement') < config.bossFightChance
    ) {
      const canBossDouble = sector >= config.doubleWaveMinLevel &&
        rollFor(seed, sector, 0, 'mayhem-boss-reinforcement-double-wave') < config.doubleWaveChance;
      const bossReinforcementWaves = canBossDouble ? 2 : 1;
      const bossReinforcementEnemiesTotal = Array.from(
        { length: bossReinforcementWaves },
        (_, index) => enemyCountFor(sector, index)
      ).reduce((sum, count) => sum + count, 0);
      seconds += config.warningMs / 1000 + Math.max(4.8, bossReinforcementEnemiesTotal * 0.24);
      score += bossReinforcementEnemiesTotal * 48 * profile.scoreMult;
      xp += bossReinforcementEnemiesTotal * 2.25 * profile.xpMult;
      reinforcements += 1;
      reinforcementWaves += bossReinforcementWaves;
      if (canBossDouble) doubleReinforcementEvents += 1;
    }
    score += 1250 * profile.scoreMult + sector * 42;
    xp += 55 * profile.xpMult + sector * 1.6;
    sector += 1;
  }

  return {
    seed,
    profile: profile.id,
    enabled,
    finalSector: sector,
    score: Math.round(score),
    xp: Math.round(xp),
    minutes: seconds / 60,
    scorePerMinute: score / Math.max(1, seconds / 60),
    xpPerMinute: xp / Math.max(1, seconds / 60),
    deaths,
    livesRemaining: Math.max(0, lives),
    reinforcements,
    reinforcementWaves,
    doubleReinforcementEvents,
    fourthNormalReinforcementEvents,
    reinforcementDeaths,
    wavesCleared,
    bossEncounters
  };
};

const summarize = (runs) => {
  const sorted = (field) => runs.map((run) => run[field]).sort((a, b) => a - b);
  const median = (field) => {
    const values = sorted(field);
    return values[Math.floor(values.length / 2)];
  };
  const average = (field) => runs.reduce((sum, run) => sum + run[field], 0) / Math.max(1, runs.length);
  return {
    runs: runs.length,
    medianSector: median('finalSector'),
    medianScore: Math.round(median('score')),
    medianXp: Math.round(median('xp')),
    scorePerMinute: Math.round(average('scorePerMinute')),
    xpPerMinute: Math.round(average('xpPerMinute')),
    averageDeaths: Number(average('deaths').toFixed(2)),
    averageReinforcements: Number(average('reinforcements').toFixed(2)),
    averageReinforcementWaves: Number(average('reinforcementWaves').toFixed(2)),
    averageDoubleReinforcementEvents: Number(average('doubleReinforcementEvents').toFixed(2)),
    averageFourthNormalReinforcementEvents: Number(average('fourthNormalReinforcementEvents').toFixed(2)),
    averageReinforcementDeaths: Number(average('reinforcementDeaths').toFixed(2)),
    averageWavesCleared: Number(average('wavesCleared').toFixed(2)),
    p250k: Number((runs.filter((run) => run.score >= 250000).length / runs.length).toFixed(3)),
    p390k: Number((runs.filter((run) => run.score >= 390000).length / runs.length).toFixed(3))
  };
};

const seeds = Array.from({ length: 500 }, (_, index) => `reinforcement-${index}`);
const allRuns = [];
for (const profile of profiles) {
  for (const enabled of [false, true]) {
    for (const seed of seeds) {
      allRuns.push(simulateRun({ seed, profile, enabled }));
    }
  }
}

const aggregates = {};
for (const profile of profiles) {
  const disabled = allRuns.filter((run) => run.profile === profile.id && run.enabled === false);
  const enabled = allRuns.filter((run) => run.profile === profile.id && run.enabled === true);
  aggregates[profile.id] = {
    withoutReinforcements: summarize(disabled),
    withReinforcements: summarize(enabled)
  };
}

const high = aggregates.high;
const report = {
  generatedAt: new Date().toISOString(),
  model: 'deterministic comparative pressure model; no live saves, Steam, or leaderboards',
  seedsPerProfile: seeds.length,
  profiles: profiles.map((profile) => profile.id),
  config,
  aggregates,
  highSkillDelta: {
    medianSector: high.withReinforcements.medianSector - high.withoutReinforcements.medianSector,
    medianScore: high.withReinforcements.medianScore - high.withoutReinforcements.medianScore,
    scorePerMinute: high.withReinforcements.scorePerMinute - high.withoutReinforcements.scorePerMinute,
    averageDeaths: Number((high.withReinforcements.averageDeaths - high.withoutReinforcements.averageDeaths).toFixed(2)),
    averageReinforcements: high.withReinforcements.averageReinforcements
  }
};

mkdirSync('test-results', { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`[analyze-mayhem-reinforcement-waves] wrote ${reportPath}`);
console.log(JSON.stringify(report.highSkillDelta));
