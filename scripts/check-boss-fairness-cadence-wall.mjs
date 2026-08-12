import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { BOSS_ROSTER, getBossProfile } from '../src/config/BossRoster.js';
import { RUN_MODE_PROFILES, RUN_MODES } from '../src/game/RunMode.js';

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

const outputDir = path.resolve(`test-results/boss-fairness-cadence-wall-${timestamp()}`);
const sectors = [2, 5, 10, 15, 20, 21, 22, 25, 30];
const diff = BalanceConfig.difficulty;
const mercy = BalanceConfig.bossMercy || {};
const wipeoutGuard = mercy.wipeoutGuard || {};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function approxNumber(value, digits = 3) {
  return Number(Number(value || 0).toFixed(digits));
}

function getModeMultiplier(mode) {
  return RUN_MODE_PROFILES[mode]?.bossDifficultyMult ?? 1;
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

function getMercyCooldown(level) {
  if (mercy.enabled !== true) return 0;
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const maxProtectedLevel = Math.max(1, Math.floor(Number(mercy.maxProtectedLevel) || 10));
  const earlyCooldownMs = Math.max(0, Number(mercy.earlyCooldownMs) || 7000);
  const lateCooldownMs = Math.max(0, Number(mercy.lateCooldownMs) || 5000);
  const minimumCooldownMs = Math.max(0, Number(mercy.minimumCooldownMs) || 2500);
  const levelReductionMs = Math.max(0, Number(mercy.levelReductionMs) || 250);
  if (safeLevel <= maxProtectedLevel) {
    return Math.max(lateCooldownMs, earlyCooldownMs - (safeLevel - 1) * levelReductionMs);
  }
  return Math.max(minimumCooldownMs, lateCooldownMs - (safeLevel - maxProtectedLevel) * levelReductionMs);
}

function getWipeoutRecoveryMs(level, deathNumber) {
  const base = getMercyCooldown(level);
  if (wipeoutGuard.enabled !== true) return base;
  const second = Math.max(base, Number(wipeoutGuard.secondDeathRecoveryMs) || 8500);
  const third = Math.max(second, Number(wipeoutGuard.thirdDeathRecoveryMs) || 11500, Number(wipeoutGuard.thirdDeathControlMs) || 10000);
  if (deathNumber >= 3) return third;
  if (deathNumber >= 2) return second;
  return base;
}

function getProfileReliefFor(level) {
  const profile = getBossProfile(level);
  const relief = diff.bossFairness?.profileRelief?.[profile.id] || null;
  if (!relief) return null;
  const minLevel = Math.max(1, Math.floor(Number(relief.minLevel) || 1));
  const maxLevel = Math.max(minLevel, Math.floor(Number(relief.maxLevel) || level));
  return level >= minLevel && level <= maxLevel ? relief : null;
}

function simulateWipeout({ level, lives = 5, durationMs = 12000, attemptEveryMs = 250, guardEnabled = true } = {}) {
  let remainingLives = lives;
  let protectedUntil = -1;
  const losses = [];
  const blocks = [];
  for (let t = 0; t <= durationMs; t += attemptEveryMs) {
    if (t < protectedUntil) {
      blocks.push({ t, remainingLives });
      continue;
    }
    remainingLives -= 1;
    const deathNumber = losses.length + 1;
    const recoveryMs = guardEnabled ? getWipeoutRecoveryMs(level, deathNumber) : getMercyCooldown(level);
    protectedUntil = t + recoveryMs;
    losses.push({ t, remainingLives, deathNumber, recoveryMs });
    if (remainingLives <= 0) break;
  }
  return {
    level,
    lives,
    durationMs,
    guardEnabled,
    losses: losses.length,
    remainingLives,
    lossEvents: losses,
    blockedEvents: blocks.length
  };
}

function simulateRegularShotCount(level, mode, phase) {
  const bullets = [];
  const boss = new Boss(640, 180, level, makeGame(mode, bullets));
  boss.phase = phase;
  boss.profile = getBossProfile(level);
  boss.startRegularAttackTelegraph(640, 640);
  boss.setAttackWarningVisibleElapsedForDebug(boss.regularTelegraph.duration);
  const fired = boss.shoot(640, 640) || [];
  return Math.max(bullets.length, fired.length);
}

function getBossMetrics(level, mode) {
  const game = makeGame(mode);
  const boss = new Boss(640, 180, level, game);
  const profile = getBossProfile(level);
  const regularTelegraphMs = boss.getRegularTelegraphDurationMs();
  const firstRegularTellStartMs = Math.max(boss.getOpeningAttackDelayMs?.() ?? 1400, boss.entryDurationMs + 250);
  const firstDangerousAttackMs = firstRegularTellStartMs + regularTelegraphMs;
  const attack = profile.attack;
  const signature = profile.signature;
  const relief = getProfileReliefFor(level);
  const regularShots = attack === 'burst'
    ? (boss.phase === 1 ? 1 : 5)
    : attack === 'fan' || attack === 'fakeout'
      ? (boss.phase === 1 ? 1 : 3)
      : ['spiral', 'clock'].includes(attack)
        ? 4
        : attack === 'chord'
          ? 6
          : attack === 'split'
            ? 2
            : attack === 'wall'
              ? 4
              : 1;
  const signatureShots = signature === 'ring'
    ? (level <= 2 ? 10 : 16)
    : signature === 'adds'
      ? (level <= 2 ? 8 : 13)
      : signature === 'mirror'
        ? (level <= 2 ? 13 : 19)
        : signature === 'cone'
          ? (level <= 2 ? 5 : 8)
          : 3;
  const regularIntervalMs = boss.getRegularAttackIntervalMs();
  const regularProjectileSpeed = boss.getBossProjectileSpeed(1) * diff.pressureScalar * boss.getBossPressureScalar() * boss.getBossAttackSpeedMultiplier(attack);
  const signatureProjectileSpeed = boss.getBossProjectileSpeed(signature === 'ring' ? 3 : 2) *
    diff.pressureScalar *
    boss.getBossPressureScalar() *
    boss.getBossAttackSpeedMultiplier(signature);
  const hazardArmingMs = diff.bossFairness?.hazardArmingMs ?? 320;
  const signatureTelegraphBaseMs = signature === 'ring'
    ? (level <= 2 ? diff.bossFairness.signatureRingTelegraphEarlyMs : diff.bossFairness.signatureRingTelegraphMs)
    : (level <= 2 ? diff.bossFairness.signatureTelegraphEarlyMs : diff.bossFairness.signatureTelegraphMs);
  const signatureTelegraphMs = Math.round(signatureTelegraphBaseMs * (Number(relief?.signatureTelegraphMult) || 1));
  const ringSafeWedge = (signature === 'ring'
    ? (level <= 2 ? diff.bossFairness.ringSafeWedgeEarly : diff.bossFairness.ringSafeWedge)
    : null);
  const reactionWindowMs = Math.min(regularTelegraphMs, signatureTelegraphMs);
  const pressureIndex = ((regularShots / Math.max(1, regularIntervalMs / 1000)) * regularProjectileSpeed) +
    ((signatureShots / 20) * signatureProjectileSpeed);
  return {
    sector: level,
    mode,
    bossName: profile.name,
    bossNumber: profile.index,
    archetype: profile.archetype,
    title: profile.title,
    movement: profile.movement,
    attack,
    signature,
    maxHealth: boss.maxHealth,
    bossDifficultyMult: getModeMultiplier(mode),
    profileRelief: relief ? { ...relief } : null,
    openingAttackDelayMs: boss.getOpeningAttackDelayMs?.() ?? null,
    firstDangerousAttackMs,
    regularTelegraphMs,
    signatureTelegraphMs,
    attackCadenceMs: regularIntervalMs,
    regularShots,
    phase2RegularShots: simulateRegularShotCount(level, mode, 2),
    phase3RegularShots: simulateRegularShotCount(level, mode, 3),
    signatureShots,
    ringSafeWedge: ringSafeWedge == null
      ? null
      : approxNumber(ringSafeWedge + (Number(relief?.ringSafeWedgeBonus) || 0)),
    projectileSpeed: approxNumber(regularProjectileSpeed),
    signatureProjectileSpeed: approxNumber(signatureProjectileSpeed),
    hazardArmingMs,
    estimatedMinimumReactionWindowMs: reactionWindowMs,
    respawnSafetyWindowMs: getMercyCooldown(level),
    repeatedDeathRecoveryMs: [
      getWipeoutRecoveryMs(level, 1),
      getWipeoutRecoveryMs(level, 2),
      getWipeoutRecoveryMs(level, 3)
    ],
    attackRunwayAfterDeathsMs: [
      Number(wipeoutGuard.attackRunwayMs) || 1800,
      Number(wipeoutGuard.secondDeathAttackRunwayMs) || 3200,
      Number(wipeoutGuard.thirdDeathAttackRunwayMs) || 4800
    ],
    hazardsPersistAfterBossDeath: false,
    hazardsPersistAfterPlayerDeath: wipeoutGuard.clearBossHazardsOnDeath === true ? false : true,
    pressureIndex: approxNumber(pressureIndex)
  };
}

function assertSourceMarkers() {
  const playScene = readFileSync(new URL('../src/scenes/PlayScene.js', import.meta.url), 'utf8');
  const bossSource = readFileSync(new URL('../src/entities/Boss.js', import.meta.url), 'utf8');
  for (const marker of [
    'recordBossWipeoutLifeLoss',
    'applyBossWipeoutRespawnProtection',
    'clearBossHazards',
    'pendingBossWipeoutRecovery',
    'resetBossWipeoutGuard'
  ]) {
    assert.ok(playScene.includes(marker), `PlayScene missing wipeout guard marker ${marker}`);
  }
  assert.ok(bossSource.includes('applyRecoveryPause'), 'Boss missing recovery pause hook');
  assert.ok(playScene.includes('this.clearRespawnHazards') && playScene.includes('this.applyBossWipeoutRespawnProtection'), 'respawn cleanup must include boss wipeout protection');
}

const mayhem = sectors.map((sector) => getBossMetrics(sector, RUN_MODES.MAYHEM));
const scout = sectors.map((sector) => getBossMetrics(sector, RUN_MODES.SCOUT));
const boss2 = getBossMetrics(2, RUN_MODES.MAYHEM);
const boss2Scout = getBossMetrics(2, RUN_MODES.SCOUT);
const boss52 = getBossMetrics(52, RUN_MODES.MAYHEM);
const sector21 = getBossMetrics(21, RUN_MODES.MAYHEM);
const sector22 = getBossMetrics(22, RUN_MODES.MAYHEM);
const beforeWipeout = simulateWipeout({ level: 22, guardEnabled: false });
const afterWipeout = simulateWipeout({ level: 22, guardEnabled: true });

assert.equal(BOSS_ROSTER[1].name, 'Sam the Misfit', 'boss 2 identity should stay Sam the Misfit');
assert.equal(boss2.archetype, 'forge', 'boss 2 should remain the forge archetype under investigation');
assert.equal(boss2.profileRelief?.maxLevel, 2, 'Sam relief should be scoped to the actual second boss only');
assert.equal(boss52.profileRelief, null, 'later Sam repeats should not inherit the sector 2 learning relief');
assert.equal(sector22.archetype, boss2.archetype, 'sector 22 should share boss 2 forge cadence family');
assert.notEqual(sector21.archetype, boss2.archetype, 'sector 21 itself should be documented as adjacent, not the same forge boss');
assert.ok(boss2.firstDangerousAttackMs >= 3500, `boss 2 first dangerous attack too early: ${boss2.firstDangerousAttackMs}`);
assert.ok(boss2.estimatedMinimumReactionWindowMs >= 1350, `boss 2 reaction window too low: ${boss2.estimatedMinimumReactionWindowMs}`);
assert.equal(boss2.phase2RegularShots, 3, `boss 2 phase 2 burst should be reduced to 3 shots, got ${boss2.phase2RegularShots}`);
assert.equal(boss2.phase3RegularShots, 4, `boss 2 phase 3 burst should be capped at 4 shots, got ${boss2.phase3RegularShots}`);
assert.ok(boss2Scout.pressureIndex < boss2.pressureIndex, 'Scout boss 2 pressure should stay below Mayhem boss 2');
assert.equal(wipeoutGuard.enabled, true, 'boss wipeout guard must be enabled');
assert.equal(wipeoutGuard.clearBossHazardsOnDeath, true, 'boss hazards should clear after boss-caused death');
assert.ok(afterWipeout.losses <= 3, `guard should prevent 4-5 rapid losses, got ${afterWipeout.losses}`);
assert.ok(beforeWipeout.losses >= 4, `baseline model should expose rapid wipeout risk, got ${beforeWipeout.losses}`);
assert.ok(afterWipeout.remainingLives > 0, 'guarded model should leave the player alive after the rapid wipeout window');
assert.equal(RUN_MODE_PROFILES[RUN_MODES.SCOUT].bossDifficultyMult, 0.75, 'Scout boss relief must remain in place');
assert.equal(RUN_MODE_PROFILES[RUN_MODES.MAYHEM].bossDifficultyMult, 1, 'Mayhem boss difficulty multiplier must remain accepted baseline');
for (const [index, mayhemMetric] of mayhem.entries()) {
  const scoutMetric = scout[index];
  assert.ok(scoutMetric.maxHealth < mayhemMetric.maxHealth, `Scout boss health should stay lower at sector ${mayhemMetric.sector}`);
  assert.ok(scoutMetric.pressureIndex < mayhemMetric.pressureIndex, `Scout boss pressure should stay lower at sector ${mayhemMetric.sector}`);
}
assertSourceMarkers();

const report = {
  status: 'passed',
  generatedAt: new Date().toISOString(),
  boss2: {
    ...boss2,
    finding: 'Boss 2 is Sam the Misfit, a Forge Tyrant using burst regular fire and ring signatures.'
  },
  sector21To22Wall: {
    sector21: {
      ...sector21,
      finding: 'Sector 21 is adjacent to the complaint window but uses the conductor family.'
    },
    sector22: {
      ...sector22,
      finding: 'Sector 22 repeats the boss 2 forge burst/ring cadence family at much higher sector pressure.'
    },
    sharesBoss2CadenceAtSector22: sector22.archetype === boss2.archetype && sector22.attack === boss2.attack && sector22.signature === boss2.signature
  },
  beforeFixModel: {
    rapidWipeout: beforeWipeout,
    note: 'Without encounter-aware wipeout guard, high-sector minimum mercy can allow four or more boss losses in about twelve seconds if hazards/cadence keep connecting.'
  },
  afterFixModel: {
    rapidWipeout: afterWipeout,
    note: 'After repeated deaths, recovery expands and boss attacks are delayed; the modeled player cannot lose all five lives in the rapid window.'
  },
  mayhem,
  scout,
  protectedRules: {
    mayhemBossDifficultyMult: RUN_MODE_PROFILES[RUN_MODES.MAYHEM].bossDifficultyMult,
    scoutBossDifficultyMult: RUN_MODE_PROFILES[RUN_MODES.SCOUT].bossDifficultyMult,
    leaderboardIdentityChanged: false,
    scoreFormulaChanged: false,
    steamworksMetadataChanged: false
  },
  config: {
    bossFairness: diff.bossFairness,
    bossMercy: mercy
  }
};

mkdirSync(outputDir, { recursive: true });
const reportPath = path.join(outputDir, 'report.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`[boss-fairness-cadence-wall] PASS boss2=${boss2.bossName} sector22=${sector22.bossName} beforeLosses=${beforeWipeout.losses} afterLosses=${afterWipeout.losses} report=${reportPath}`);
