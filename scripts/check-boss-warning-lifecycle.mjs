import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.Audio = class {
  constructor() {
    this.paused = true;
    this.ended = false;
    this.currentTime = 0;
    this.volume = 1;
    this.playbackRate = 1;
  }
  addEventListener() {}
  removeEventListener() {}
  load() {}
  pause() { this.paused = true; }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
};

const { Boss } = await import('../src/entities/Boss.js');
const { BOSS_ROSTER } = await import('../src/config/BossRoster.js');
const { AudioManager } = await import('../src/audio/AudioManager.js');

let fakeNow = 1_000_000;
const originalDateNow = Date.now;
Date.now = () => fakeNow;

function makeLayer() {
  return {
    clears: 0,
    clear() {
      this.clears += 1;
      this.__debugBossSignatureWarning = null;
    }
  };
}

function makeGame({ experiment = false } = {}) {
  const enemyBullets = [];
  const hazards = [];
  const play = {
    player: { x: 640, y: 600 },
    bulletManager: {
      enemyBullets,
      addEnemyBullet(bullet) {
        enemyBullets.push(bullet);
      }
    },
    enemyManager: {
      spawnedBossAdds: 0,
      spawnBossAdds(count) {
        this.spawnedBossAdds += count;
      }
    },
    performanceDiagnostics: {
      enabled: false,
      mark() {},
      measure(_label, callback) { return callback(); },
      recordSection() {}
    },
    registerBossHazardFromBoss(_boss, category, details) {
      hazards.push({ category, ...details });
    },
    enqueueToast() {},
    showBossTaunt() {},
    onBossPhaseChange() {},
    triggerShockwave() {},
    particleManager: null,
    screenShake: null
  };
  const game = {
    getWidth: () => 1280,
    getHeight: () => 720,
    app: { ticker: { add() {}, remove() {} } },
    scenes: { play },
    lateGameExperiment: experiment ? { active: true, version: 'test-only' } : null
  };
  return { game, play, enemyBullets, hazards };
}

function makeBoss(profile = BOSS_ROSTER[0], options = {}) {
  const fixture = makeGame(options);
  const boss = new Boss(640, 150, Math.max(1, Number(profile?.index) || 1), fixture.game, profile);
  boss.invulnerableUntilMs = 0;
  boss.regularAttackReadyAt = 0;
  boss.entryStartMs = null;
  boss.entryImpactTriggered = true;
  return { boss, ...fixture };
}

function advanceFrames(boss, frames = 1) {
  const safeFrames = Math.max(0, Number(frames) || 0);
  fakeNow += safeFrames * 16.67;
  return boss.advanceAttackWarningClock(safeFrames);
}

function advanceToReady(boss) {
  let guard = 0;
  while (!boss.isAttackWarningReady() && guard < 1000) {
    const token = boss.attackWarningToken;
    const remaining = Math.max(0, token.durationMs - token.visibleElapsedMs);
    advanceFrames(boss, Math.min(1, Math.max(0.001, remaining / 16.67)));
    guard += 1;
  }
  assert.ok(guard < 1000, 'warning clock should reach readiness deterministically');
}

function assertExclusiveOwner(boss, expectedCategory) {
  const lifecycle = boss.getAttackWarningLifecycleDebugState();
  assert.equal(lifecycle.active?.category, expectedCategory);
  assert.equal(Number(Boolean(boss.regularTelegraph)) + Number(Boolean(boss.telegraph)), 1, 'one warning category must own the warning at a time');
  assert.equal(lifecycle.active.regularOwner, expectedCategory === 'regular');
  assert.equal(lifecycle.active.signatureOwner, expectedCategory === 'signature');
}

function assertTerminalOutcome(outcome, state, reason = null) {
  assert.ok(outcome, `expected ${state} warning outcome`);
  assert.equal(outcome.terminalState, state);
  if (reason) assert.equal(outcome.reason, reason);
  assert.equal(outcome.outcomeCount, 1, 'each warning token must receive exactly one terminal outcome');
  assert.equal(outcome.visualsCleaned, true);
  assert.equal(outcome.audioCleaned, true);
  if (state === 'released') {
    assert.ok(outcome.visibleElapsedMs >= outcome.durationMs, 'released warning must own a full visible lead time');
  }
}

function startRegular(boss, playerX = 930, playerY = 610) {
  boss.startRegularAttackTelegraph(playerX, playerY);
  assertExclusiveOwner(boss, 'regular');
  const token = boss.attackWarningToken;
  assert.equal(token.attackProfile.attack, boss.profile.attack);
  assert.equal(token.attackProfile.type, boss.regularTelegraph.type);
  assert.equal(token.lockedAim.angle, boss.regularTelegraph.lockedAngle);
  assert.deepEqual(token.safeLanes, boss.safeLanes);
  return token;
}

function cancelFixture(reason, action) {
  const { boss } = makeBoss();
  const token = startRegular(boss);
  advanceFrames(boss, 14);
  boss.attackWarningLayer = makeLayer();
  action(boss);
  const outcome = boss.attackWarningOutcomes.find((entry) => entry.id === token.id);
  assertTerminalOutcome(outcome, 'cancelled', reason);
  assert.equal(boss.attackWarningToken, null);
  assert.equal(boss.regularTelegraph, null);
  assert.equal(boss.telegraph, null);
  assert.deepEqual(boss.safeLanes, []);
  assert.ok(boss.attackWarningLayer.clears > 0, `${reason} must clear regular warning visuals`);
  assert.equal(token.audioCueActive, false);
  assert.equal(token.audioTerminalState, 'cancelled');
  assert.equal(boss.finishAttackWarning(token, 'cancelled', 'duplicate'), null, 'terminal token cannot end twice');
  assert.equal(token.outcomeCount, 1);
  return { boss, token, outcome };
}

try {
  const regularProfiles = [...new Map(BOSS_ROSTER.map((profile) => [profile.attack, profile])).values()];
  assert.deepEqual(
    regularProfiles.map((profile) => profile.attack).sort(),
    ['burst', 'chord', 'clock', 'fakeout', 'fan', 'sniper', 'spiral', 'split', 'summon', 'wall'],
    'coverage must include every shipped regular boss attack profile'
  );

  const regularResults = regularProfiles.map((profile) => {
    const { boss } = makeBoss(profile);
    const token = startRegular(boss);
    const lockedAngle = token.lockedAim.angle;
    advanceToReady(boss);
    assert.equal(boss.canShoot(), true, `${profile.attack} should release only after the warning becomes ready`);
    const bullets = boss.shoot(160, 650);
    const outcome = boss.attackWarningOutcomes.at(-1);
    assertTerminalOutcome(outcome, 'released', 'regular_release');
    assert.equal(outcome.id, token.id);
    assert.equal(outcome.lockedAngle, lockedAngle, `${profile.attack} must preserve locked aim through release`);
    assert.equal(boss.lastRegularAttackRelease.warningTokenId, token.id);
    assert.equal(boss.lastRegularAttackRelease.lockedAngle, lockedAngle);
    assert.equal(boss.attackWarningToken, null);
    assert.equal(token.outcomeCount, 1);
    return { attack: profile.attack, type: token.type, bullets: bullets.length };
  });

  {
    const { boss } = makeBoss(BOSS_ROSTER.find((profile) => profile.attack === 'fan'));
    const token = startRegular(boss);
    const snapshot = {
      attackProfile: { ...token.attackProfile },
      lockedAim: { ...token.lockedAim },
      safeLanes: token.safeLanes.map((lane) => ({ ...lane })),
      rngSnapshot: { drawCount: token.rngSnapshot.drawCount, values: [...token.rngSnapshot.values] }
    };
    boss.profile = BOSS_ROSTER.find((profile) => profile.attack === 'wall');
    boss.phase = 3;
    boss.moveTimer += 500;
    advanceToReady(boss);
    boss.shoot(180, 650);
    assert.equal(boss.lastRegularAttackRelease.attack, 'fan', 'release must use the warning-owned attack profile');
    assert.deepEqual({ ...token.attackProfile }, snapshot.attackProfile);
    assert.deepEqual({ ...token.lockedAim }, snapshot.lockedAim);
    assert.deepEqual(token.safeLanes.map((lane) => ({ ...lane })), snapshot.safeLanes);
    assert.deepEqual({ drawCount: token.rngSnapshot.drawCount, values: [...token.rngSnapshot.values] }, snapshot.rngSnapshot);
    assert.equal(Object.isFrozen(token.attackProfile), true);
    assert.equal(Object.isFrozen(token.lockedAim), true);
    assert.equal(Object.isFrozen(token.safeLanes), true);
    assert.equal(Object.isFrozen(token.rngSnapshot), true);
    assert.equal(Object.getOwnPropertyDescriptor(token, 'durationMs')?.writable, false);
    assert.equal(Object.getOwnPropertyDescriptor(token, 'duration')?.writable, false);
  }

  const signatureTypes = ['cone', 'ring', 'mirror', 'lance', 'adds'];
  const signatureResults = signatureTypes.map((type, index) => {
    const profile = BOSS_ROSTER.find((candidate) => candidate.signature === type) || BOSS_ROSTER[index];
    const { boss, enemyBullets } = makeBoss(profile);
    boss.startSignatureTelegraph(type, 940, 610);
    assertExclusiveOwner(boss, 'signature');
    const token = boss.attackWarningToken;
    const lockedAngle = token.lockedAim.angle;
    boss.signatureWarningLayer = makeLayer();
    advanceToReady(boss);
    const outcome = boss.releaseSignatureAttackWarning(150, 650);
    assertTerminalOutcome(outcome, 'released', 'signature_release');
    assert.equal(outcome.id, token.id);
    assert.equal(outcome.lockedAngle, lockedAngle, `${type} must preserve locked aim through release`);
    assert.equal(boss.lastSignatureRelease.warningTokenId, token.id);
    assert.ok(boss.signatureWarningLayer.clears > 0, `${type} release must clean signature warning visuals`);
    assert.equal(token.outcomeCount, 1);
    return { type, bullets: enemyBullets.length };
  });

  for (const threshold of [
    { from: 1, healthRatio: 0.74, to: 2 },
    { from: 2, healthRatio: 0.39, to: 3 }
  ]) {
    const { boss } = makeBoss();
    boss.phase = threshold.from;
    const regular = startRegular(boss);
    advanceFrames(boss, 8);
    boss.health = boss.maxHealth * threshold.healthRatio;
    assert.equal(boss.updatePhaseTransitions(930, 610), threshold.to);
    const cancelled = boss.attackWarningOutcomes.find((entry) => entry.id === regular.id);
    assertTerminalOutcome(cancelled, 'cancelled', `phase_${threshold.to}_transition`);
    assertExclusiveOwner(boss, 'signature');
    assert.equal(boss.attackWarningToken.attackProfile.phase, threshold.to);
  }

  cancelFixture('armor_finish_gate', (boss) => {
    boss.health = boss.maxHealth * 0.2;
    boss.takeDamage(1);
  });

  cancelFixture('armor_finish_gate', (boss) => {
    boss.firstDamageAtMs = fakeNow;
    boss.finishGateUntilMs = fakeNow + 3000;
    boss.takeDamage(1);
  });

  cancelFixture('boss_support_inbound', (boss) => {
    boss.cancelAttackWarning('boss_support_inbound', { category: 'regular' });
  });

  cancelFixture('boss_refuel', (boss) => {
    boss.health = boss.maxHealth - 20;
    assert.ok(boss.heal(10, { source: 'boss_fuel_ship' }) > 0);
  });

  cancelFixture('boss_wipeout_guard', (boss) => {
    boss.applyRecoveryPause(2800, 'boss_wipeout_guard');
  });

  {
    const { boss } = makeBoss();
    const token = startRegular(boss);
    advanceFrames(boss, 12);
    const beforePause = token.visibleElapsedMs;
    const startBeforePause = token.start;
    fakeNow += 12_000;
    assert.equal(token.visibleElapsedMs, beforePause, 'paused wall time must not age the visible warning');
    assert.equal(token.start, startBeforePause + 12_000, 'compatibility start must move with paused wall time');
    assert.equal(boss.isAttackWarningReady('regular'), false);
    advanceFrames(boss, 1);
    assert.ok(token.visibleElapsedMs > beforePause, 'warning progression must resume exactly from the frozen elapsed value');
  }

  {
    for (const deltaMs of [16, 33, 100, 249, 250]) {
      const { boss } = makeBoss();
      const token = startRegular(boss);
      boss.advanceAttackWarningClockMs(deltaMs);
      assert.equal(token.visibleElapsedMs, deltaMs, `${deltaMs}ms warning update must be consumed normally`);
      assert.equal(token.terminalState, 'active');
      assert.equal(boss.attackWarningOutcomes.length, 0);
    }
    for (const deltaMs of [251, 10_000]) {
      const { boss } = makeBoss();
      const token = startRegular(boss);
      boss.advanceAttackWarningClockMs(deltaMs);
      const outcome = boss.attackWarningOutcomes.at(-1);
      assertTerminalOutcome(outcome, 'cancelled', 'long_frame_gap');
      assert.equal(outcome.id, token.id);
      assert.equal(outcome.longFrameInterruptions, 1);
      assert.equal(boss.attackWarningToken, null);
    }

    {
      const { boss } = makeBoss(BOSS_ROSTER[3]);
      boss.startSignatureTelegraph('lance', 940, 610);
      const staleSignature = boss.attackWarningToken;
      boss.advanceAttackWarningClockMs(251);
      assertTerminalOutcome(boss.attackWarningOutcomes.at(-1), 'cancelled', 'long_frame_gap');
      assert.equal(boss.delayedSignature?.type, 'lance', 'interrupted signature must return through delayed recovery cadence');
      fakeNow = boss.delayedSignature.dueAt;
      const delayed = boss.delayedSignature;
      boss.delayedSignature = null;
      boss.startSignatureTelegraph(delayed.type, 940, 610);
      assert.ok(boss.attackWarningToken.id !== staleSignature.id);
      assert.equal(boss.attackWarningToken.visibleElapsedMs, 0, 'rearmed signature must restart a full warning');
    }

    const { boss } = makeBoss();
    const staleToken = startRegular(boss);
    advanceFrames(boss, 2);
    boss.advanceAttackWarningClockMs(251);
    const interrupted = boss.attackWarningOutcomes.at(-1);
    assertTerminalOutcome(interrupted, 'cancelled', 'long_frame_gap');
    assert.equal(interrupted.id, staleToken.id);
    fakeNow += 250;
    boss.shootCooldown = 0;
    assert.equal(boss.canShoot(), false, 'interrupted regular attack must return to a new warning instead of releasing');
    const replacement = boss.attackWarningToken;
    assert.ok(replacement && replacement.id !== staleToken.id);
    assert.equal(replacement.visibleElapsedMs, 0);
    advanceToReady(boss);
    const bullets = boss.shoot(180, 650);
    assert.ok(Array.isArray(bullets));
    const outcome = boss.attackWarningOutcomes.at(-1);
    assertTerminalOutcome(outcome, 'released', 'regular_release');
    assert.equal(outcome.id, replacement.id);
  }

  {
    const { boss } = makeBoss(BOSS_ROSTER[3]);
    AudioManager.enabled = true;
    boss.startSignatureTelegraph('lance', 940, 610);
    const token = boss.attackWarningToken;
    boss.signatureWarningLayer = makeLayer();
    assert.equal(boss.presentationState, 'charge');
    assert.ok(AudioManager.activeSfxGroups[token.audioGroup]?.size >= 1, 'signature warning audio must be owned by the token group');
    const outcome = boss.cancelAttackWarning('transient_load_cleanup');
    assertTerminalOutcome(outcome, 'cancelled', 'transient_load_cleanup');
    assert.equal(AudioManager.activeSfxGroups[token.audioGroup], undefined, 'cancellation must stop and release transient warning audio');
    assert.ok(boss.signatureWarningLayer.clears > 0, 'cancellation must clear transient warning geometry');
    assert.equal(boss.presentationState, 'idle', 'cancellation must clear transient boss charge presentation');
    assert.equal(boss.presentationStateUntil, 0);
    assert.equal(token.audioCueActive, false);
    AudioManager.enabled = false;
  }

  {
    const { boss } = makeBoss();
    const token = startRegular(boss);
    boss.attackWarningLayer = makeLayer();
    boss.destroy();
    assertTerminalOutcome(boss.attackWarningOutcomes.at(-1), 'cancelled', 'boss_destroyed');
    const outcomeCount = boss.attackWarningOutcomes.length;
    boss.destroy();
    assert.equal(boss.attackWarningOutcomes.length, outcomeCount, 'repeated teardown must be idempotent');
    assert.equal(token.outcomeCount, 1);
  }

  {
    const normal = makeBoss(BOSS_ROSTER[3], { experiment: false }).boss;
    const experimentalTogglePresent = makeBoss(BOSS_ROSTER[3], { experiment: true }).boss;
    const normalToken = startRegular(normal);
    const toggleToken = startRegular(experimentalTogglePresent);
    assert.deepEqual(
      {
        attack: normalToken.attackProfile.attack,
        type: normalToken.attackProfile.type,
        durationMs: normalToken.durationMs,
        safeLanes: normalToken.safeLanes,
        lockedAngle: Number(normalToken.lockedAim.angle.toFixed(6))
      },
      {
        attack: toggleToken.attackProfile.attack,
        type: toggleToken.attackProfile.type,
        durationMs: toggleToken.durationMs,
        safeLanes: toggleToken.safeLanes,
        lockedAngle: Number(toggleToken.lockedAim.angle.toFixed(6))
      },
      'late-game experiment state must not change normal boss warning ownership or profile'
    );
  }

  const managerSource = readFileSync('src/managers/EnemyManager.js', 'utf8');
  assert.match(managerSource, /enemy\.update\(isBoss \? dt[^\n]+isBoss \? delta : undefined\)/, 'boss warning clock must receive unscaled frame time while movement preserves slow-time scaling');
  assert.match(managerSource, /cancelAttackWarning\?\.\('boss_support_inbound', \{ category: 'regular' \}\)/, 'normal fuel-support warning must cancel an active regular warning');

  console.log(`[boss-warning-lifecycle] PASS regularProfiles=${regularResults.length} signatureProfiles=${signatureResults.length} phaseThresholds=2 frameThresholds=16,33,100,249,250,251,10000 interruptions=armor,finish,refuel,support,pause,respawn,long-frame transientCleanup=pass experimentIsolation=pass`);
} finally {
  Date.now = originalDateNow;
}
