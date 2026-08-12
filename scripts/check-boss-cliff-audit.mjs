import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { getBossProfile } from '../src/config/BossRoster.js';
import { RUN_MODE_PROFILES, RUN_MODES } from '../src/game/RunMode.js';
import { STEAM_LEADERBOARD_NAME } from '../src/leaderboard/LeaderboardTypes.js';

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

const { Boss } = await import('../src/entities/Boss.js');

const outputDir = path.resolve(`test-results/boss-cliff-audit-${timestamp()}`);
const diff = BalanceConfig.difficulty;
const fairness = diff.bossFairness || {};
const reliefMap = fairness.profileRelief || {};
const candidateSectors = [9, 15, 18, 19, 22];
const watchSectors = [2, 9, 12, 15, 18, 19, 22, 25, 29, 35, 39, 45, 49];
const annoyanceCeilings = new Map([
  [9, 1.95],
  [15, 3.25],
  [18, 2.45],
  [19, 4.05],
  [22, 2.1]
]);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function approx(value, digits = 3) {
  return Number(Number(value || 0).toFixed(digits));
}

function makeGame(mode, bulletSink = []) {
  return {
    getWidth: () => 1280,
    getHeight: () => 720,
    getRunModeProfile: () => RUN_MODE_PROFILES[mode],
    scenes: {
      play: {
        bulletManager: {
          addEnemyBullet: (bullet) => bulletSink.push(bullet)
        },
        registerBossHazardFromBoss() {},
        enemyManager: {
          spawnBossAdds() {}
        }
      }
    }
  };
}

function withProfileRelief(enabled, callback) {
  const original = fairness.profileRelief;
  if (!enabled) fairness.profileRelief = {};
  try {
    return callback();
  } finally {
    fairness.profileRelief = original;
  }
}

function getReliefFor(level) {
  const profile = getBossProfile(level);
  const relief = reliefMap[profile.id] || null;
  if (!relief) return null;
  const minLevel = Math.max(1, Math.floor(Number(relief.minLevel) || 1));
  const maxLevel = Math.max(minLevel, Math.floor(Number(relief.maxLevel) || level));
  return level >= minLevel && level <= maxLevel ? { ...relief } : null;
}

function phaseShotCount(level, mode, phase, reliefEnabled = true) {
  return withProfileRelief(reliefEnabled, () => {
    const bullets = [];
    const boss = new Boss(640, 180, level, makeGame(mode, bullets));
    boss.phase = phase;
    boss.profile = getBossProfile(level);
    boss.startRegularAttackTelegraph(640, 640);
    boss.setAttackWarningVisibleElapsedForDebug(boss.regularTelegraph.duration);
    const fired = boss.shoot(640, 640) || [];
    return Math.max(bullets.length, fired.length);
  });
}

function signatureShotEstimate(level, signature) {
  if (signature === 'ring') return level <= 2 ? 10 : 16;
  if (signature === 'adds') return level <= 2 ? 8 : 13;
  if (signature === 'mirror') return level <= 2 ? 13 : 19;
  if (signature === 'cone') return level <= 2 ? 5 : 8;
  return 3;
}

function signatureTelegraphMs(level, signature, relief) {
  const base = signature === 'ring'
    ? (level <= 2 ? fairness.signatureRingTelegraphEarlyMs : fairness.signatureRingTelegraphMs)
    : (level <= 2 ? fairness.signatureTelegraphEarlyMs : fairness.signatureTelegraphMs);
  return Math.round((base || 1220) * (Number(relief?.signatureTelegraphMult) || 1));
}

function ringSafeWedge(level, signature, relief) {
  if (signature !== 'ring') return null;
  const base = level <= 2 ? (fairness.ringSafeWedgeEarly ?? 0.58) : (fairness.ringSafeWedge ?? 0.5);
  return approx(base + (Number(relief?.ringSafeWedgeBonus) || 0));
}

function bossMetric(level, mode = RUN_MODES.MAYHEM, reliefEnabled = true) {
  return withProfileRelief(reliefEnabled, () => {
    const boss = new Boss(640, 180, level, makeGame(mode));
    const profile = getBossProfile(level);
    const relief = reliefEnabled ? getReliefFor(level) : null;
    const phase2Shots = phaseShotCount(level, mode, 2, reliefEnabled);
    const phase3Shots = phaseShotCount(level, mode, 3, reliefEnabled);
    const cadenceMs = boss.getRegularAttackIntervalMs();
    const regularTelegraphMs = boss.getRegularTelegraphDurationMs();
    const firstDangerousAttackMs = Math.max(
      boss.getOpeningAttackDelayMs?.() ?? 1400,
      boss.entryDurationMs + 250
    ) + regularTelegraphMs;
    const regularProjectileSpeed = boss.getBossProjectileSpeed(2) *
      diff.pressureScalar *
      boss.getBossPressureScalar() *
      boss.getBossAttackSpeedMultiplier(profile.attack);
    const signatureProjectileSpeed = boss.getBossProjectileSpeed(profile.signature === 'ring' ? 3 : 2) *
      diff.pressureScalar *
      boss.getBossPressureScalar() *
      boss.getBossAttackSpeedMultiplier(profile.signature);
    const signatureShots = signatureShotEstimate(level, profile.signature);
    const phase2PressureIndex = ((phase2Shots / Math.max(1, cadenceMs / 1000)) * regularProjectileSpeed) +
      ((signatureShots / 20) * signatureProjectileSpeed);
    return {
      sector: level,
      mode,
      bossName: profile.name,
      profileId: profile.id,
      archetype: profile.archetype,
      attack: profile.attack,
      signature: profile.signature,
      relief,
      firstDangerousAttackMs: Math.round(firstDangerousAttackMs),
      regularTelegraphMs,
      signatureTelegraphMs: signatureTelegraphMs(level, profile.signature, relief),
      attackCadenceMs: cadenceMs,
      phase2RegularShots: phase2Shots,
      phase3RegularShots: phase3Shots,
      ringSafeWedge: ringSafeWedge(level, profile.signature, relief),
      maxHealth: boss.maxHealth,
      regularProjectileSpeed: approx(regularProjectileSpeed),
      signatureProjectileSpeed: approx(signatureProjectileSpeed),
      phase2PressureIndex: approx(phase2PressureIndex)
    };
  });
}

function compareSector(level) {
  const rawMayhem = bossMetric(level, RUN_MODES.MAYHEM, false);
  const mayhem = bossMetric(level, RUN_MODES.MAYHEM, true);
  const scout = bossMetric(level, RUN_MODES.SCOUT, true);
  return {
    sector: level,
    bossName: mayhem.bossName,
    archetype: mayhem.archetype,
    attack: mayhem.attack,
    signature: mayhem.signature,
    rawMayhem,
    mayhem,
    scout,
    pressureRatio: approx(mayhem.phase2PressureIndex / Math.max(0.001, rawMayhem.phase2PressureIndex)),
    scoutRatio: approx(scout.phase2PressureIndex / Math.max(0.001, mayhem.phase2PressureIndex)),
    firstDangerDeltaMs: mayhem.firstDangerousAttackMs - rawMayhem.firstDangerousAttackMs
  };
}

const candidates = candidateSectors.map(compareSector);
const watchList = watchSectors.map((sector) => bossMetric(sector, RUN_MODES.MAYHEM, true));
const lateRepeats = candidateSectors.map((sector) => sector + 50).map((sector) => bossMetric(sector, RUN_MODES.MAYHEM, true));

for (const candidate of candidates) {
  const threshold = annoyanceCeilings.get(candidate.sector);
  assert.ok(candidate.mayhem.relief, `sector ${candidate.sector} should have scoped profile relief`);
  assert.equal(candidate.mayhem.relief.maxLevel, candidate.sector, `sector ${candidate.sector} relief must not apply to later repeats`);
  assert.ok(candidate.firstDangerDeltaMs >= 250, `sector ${candidate.sector} first danger did not move enough`);
  assert.ok(candidate.firstDangerDeltaMs <= (candidate.sector === 22 ? 700 : 600), `sector ${candidate.sector} first danger moved too far: ${candidate.firstDangerDeltaMs}`);
  assert.ok(candidate.mayhem.firstDangerousAttackMs >= 2700, `sector ${candidate.sector} first danger too early: ${candidate.mayhem.firstDangerousAttackMs}`);
  assert.ok(candidate.mayhem.regularTelegraphMs >= candidate.rawMayhem.regularTelegraphMs, `sector ${candidate.sector} regular tell should not shrink`);
  assert.ok(candidate.mayhem.signatureTelegraphMs >= candidate.rawMayhem.signatureTelegraphMs, `sector ${candidate.sector} signature tell should not shrink`);
  if (candidate.sector === 22) {
    assert.equal(candidate.mayhem.phase2RegularShots, 4, 'sector 22 keeps the already-softened 4-shot phase 2 Forge burst for playtest');
    assert.equal(candidate.mayhem.phase3RegularShots, 4, 'sector 22 keeps the already-softened 4-shot phase 3 Forge burst for playtest');
  } else {
    assert.equal(candidate.mayhem.phase2RegularShots, candidate.rawMayhem.phase2RegularShots, `sector ${candidate.sector} should keep its phase 2 shot count lethal`);
    assert.equal(candidate.mayhem.phase3RegularShots, candidate.rawMayhem.phase3RegularShots, `sector ${candidate.sector} should keep its phase 3 shot count lethal`);
  }
  assert.ok(candidate.pressureRatio <= 0.96, `sector ${candidate.sector} relief too small: ratio ${candidate.pressureRatio}`);
  assert.ok(candidate.pressureRatio >= (candidate.sector === 22 ? 0.62 : 0.84), `sector ${candidate.sector} relief is too large for this pass: ratio ${candidate.pressureRatio}`);
  assert.ok(candidate.mayhem.phase2PressureIndex <= threshold, `sector ${candidate.sector} pressure ${candidate.mayhem.phase2PressureIndex} exceeds threshold ${threshold}`);
  assert.ok(candidate.mayhem.phase2PressureIndex >= 1.1, `sector ${candidate.sector} pressure too low for a lethal boss: ${candidate.mayhem.phase2PressureIndex}`);
  assert.ok(candidate.scout.phase2PressureIndex < candidate.mayhem.phase2PressureIndex, `sector ${candidate.sector} Scout should remain below Mayhem`);
}

for (const repeat of lateRepeats) {
  assert.equal(repeat.relief, null, `late repeat sector ${repeat.sector} should not inherit early cliff relief`);
}

assert.equal(STEAM_LEADERBOARD_NAME, 'nova_swarm_global_score_v2', 'leaderboard identity must remain unchanged');
assert.equal(RUN_MODE_PROFILES[RUN_MODES.MAYHEM].bossDifficultyMult, 1, 'Mayhem boss multiplier must stay at accepted baseline');
assert.equal(RUN_MODE_PROFILES[RUN_MODES.SCOUT].bossDifficultyMult, 0.75, 'Scout boss multiplier must stay lower pressure');

mkdirSync(outputDir, { recursive: true });
const report = {
  status: 'passed',
  generatedAt: new Date().toISOString(),
  candidates,
  watchList,
  lateRepeats,
  protectedRules: {
    leaderboard: STEAM_LEADERBOARD_NAME,
    mayhemBossDifficultyMult: RUN_MODE_PROFILES[RUN_MODES.MAYHEM].bossDifficultyMult,
    scoutBossDifficultyMult: RUN_MODE_PROFILES[RUN_MODES.SCOUT].bossDifficultyMult
  }
};
const reportPath = path.join(outputDir, 'report.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.table(candidates.map((candidate) => ({
  sector: candidate.sector,
  boss: candidate.bossName,
  raw: candidate.rawMayhem.phase2PressureIndex,
  mayhem: candidate.mayhem.phase2PressureIndex,
  ratio: candidate.pressureRatio,
  scout: candidate.scout.phase2PressureIndex,
  firstDanger: candidate.mayhem.firstDangerousAttackMs
})));
console.log(`[boss-cliff-audit] PASS report=${reportPath}`);
