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
const { PlayScene } = await import('../src/scenes/PlayScene.js');

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

function makeGame({ experiment = false, notificationMode = 'queued' } = {}) {
  const enemyBullets = [];
  const hazards = [];
  const notificationCancellationAttempts = [];
  const notificationDismissals = [];
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
    showBossTaunt() {},
    onBossPhaseChange() {},
    triggerShockwave() {},
    particleManager: null,
    screenShake: null
  };
  play.toastQueue = [];
  play.toastTopQueue = [];
  play.toastCornerQueue = [];
  play.activeBossIntroCard = null;
  play.activeCenterToast = null;
  play.activeTopToast = null;
  play.activeCornerToast = null;
  play.activeBossDossier = null;
  play.processToastQueue = () => {};
  play.dismissBossDossier = () => {};
  play.dismissToastDisplay = (display, slot, { reason = 'dismissed' } = {}) => {
    notificationDismissals.push({
      id: display?.__toastMeta?.notificationId || null,
      reason,
      slot
    });
    if (play.activeBossIntroCard === display) play.activeBossIntroCard = null;
    if (play.activeCenterToast === display) play.activeCenterToast = null;
    if (play.activeTopToast === display) play.activeTopToast = null;
    if (play.activeCornerToast === display) play.activeCornerToast = null;
  };
  play.cancelNotificationById = (notificationId, reason) => {
    notificationCancellationAttempts.push({ notificationId, reason });
    return PlayScene.prototype.cancelNotificationById.call(play, notificationId, reason);
  };
  play.enqueueToast = (message, options = {}) => {
    const entry = {
      message,
      options: { ...options },
      priority: Number(options.priority) || 0,
      createdAt: fakeNow
    };
    if (notificationMode === 'active' && !play.activeTopToast) {
      play.activeTopToast = {
        __toastMeta: {
          message,
          type: options.type || 'generic',
          notificationId: options.notificationId || null,
          originalOptions: { ...options }
        }
      };
    } else {
      const queue = options.slot === 'corner'
        ? play.toastCornerQueue
        : options.slot === 'top'
          ? play.toastTopQueue
          : play.toastQueue;
      queue.push(entry);
    }
    return options.notificationId || true;
  };
  const game = {
    getWidth: () => 1280,
    getHeight: () => 720,
    app: { ticker: { add() {}, remove() {} } },
    scenes: { play },
    lateGameExperiment: experiment ? { active: true, version: 'test-only' } : null
  };
  return {
    game,
    play,
    enemyBullets,
    hazards,
    notificationCancellationAttempts,
    notificationDismissals
  };
}

function hasNotificationId(play, notificationId) {
  if (!notificationId) return false;
  const queued = [play.toastQueue, play.toastTopQueue, play.toastCornerQueue]
    .some((queue) => queue.some((entry) => entry?.options?.notificationId === notificationId));
  const active = [
    play.activeBossIntroCard,
    play.activeCenterToast,
    play.activeTopToast,
    play.activeCornerToast,
    play.activeBossDossier
  ].some((display) => (
    display?.__toastMeta?.notificationId === notificationId ||
    display?.__toastMeta?.originalOptions?.notificationId === notificationId
  ));
  return queued || active;
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
  assert.equal(outcome.notificationCleaned, true);
  assert.ok(outcome.notificationId, 'warning outcome must retain its token-owned notification id');
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
  assert.ok(token.notificationId, 'regular warning token must own a unique notification id');
  assert.equal(token.notificationTerminalState, 'owned');
  assert.equal(hasNotificationId(boss.game.scenes.play, token.notificationId), true);
  return token;
}

function cancelFixture(reason, action, options = {}) {
  const { boss, play, notificationCancellationAttempts } = makeBoss(BOSS_ROSTER[0], options);
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
  assert.equal(token.notificationTerminalState, 'cancelled');
  assert.equal(token.notificationDismissedCount, 1);
  assert.equal(hasNotificationId(play, token.notificationId), false, `${reason} must remove the warning's queued or active notification`);
  const cancellationAttempts = notificationCancellationAttempts.length;
  assert.equal(boss.finishAttackWarning(token, 'cancelled', 'duplicate'), null, 'terminal token cannot end twice');
  assert.equal(notificationCancellationAttempts.length, cancellationAttempts, 'repeated terminal transition must not dismiss notifications twice');
  assert.equal(token.outcomeCount, 1);
  return { boss, play, token, outcome };
}

try {
  const regularProfiles = [...new Map(BOSS_ROSTER.map((profile) => [profile.attack, profile])).values()];
  assert.deepEqual(
    regularProfiles.map((profile) => profile.attack).sort(),
    ['burst', 'chord', 'clock', 'fakeout', 'fan', 'sniper', 'spiral', 'split', 'summon', 'wall'],
    'coverage must include every shipped regular boss attack profile'
  );

  const regularResults = regularProfiles.map((profile) => {
    const { boss, play } = makeBoss(profile);
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
    assert.equal(token.notificationTerminalState, 'released');
    assert.equal(token.notificationDismissedCount, 1);
    assert.equal(hasNotificationId(play, token.notificationId), false, `${profile.attack} release must remove its windup notification`);
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
    const { boss, play, enemyBullets } = makeBoss(profile);
    boss.startSignatureTelegraph(type, 940, 610);
    assertExclusiveOwner(boss, 'signature');
    const token = boss.attackWarningToken;
    assert.ok(token.notificationId, `${type} signature must own a notification id`);
    assert.equal(token.notificationTerminalState, 'owned');
    assert.equal(hasNotificationId(play, token.notificationId), true);
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
    assert.equal(token.notificationTerminalState, 'released');
    assert.equal(token.notificationDismissedCount, 1);
    assert.equal(hasNotificationId(play, token.notificationId), false, `${type} signature release must remove its windup notification`);
    return { type, bullets: enemyBullets.length };
  });

  for (const threshold of [
    { from: 1, healthRatio: 0.74, to: 2 },
    { from: 2, healthRatio: 0.39, to: 3 }
  ]) {
    const { boss, play } = makeBoss();
    boss.phase = threshold.from;
    const regular = startRegular(boss);
    advanceFrames(boss, 8);
    boss.health = boss.maxHealth * threshold.healthRatio;
    assert.equal(boss.updatePhaseTransitions(930, 610), threshold.to);
    const cancelled = boss.attackWarningOutcomes.find((entry) => entry.id === regular.id);
    assertTerminalOutcome(cancelled, 'cancelled', `phase_${threshold.to}_transition`);
    assertExclusiveOwner(boss, 'signature');
    assert.equal(boss.attackWarningToken.attackProfile.phase, threshold.to);
    assert.equal(hasNotificationId(play, regular.notificationId), false, 'phase transition must remove the superseded regular windup notification');
    assert.equal(hasNotificationId(play, boss.attackWarningToken.notificationId), true, 'phase transition must preserve the newer signature windup notification');
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
  }, { notificationMode: 'active' });

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
    const { boss, play } = makeBoss(BOSS_ROSTER[3], { notificationMode: 'active' });
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
    assert.equal(token.notificationTerminalState, 'cancelled');
    assert.equal(token.notificationDismissedCount, 1);
    assert.equal(hasNotificationId(play, token.notificationId), false, 'signature cancellation must remove an active top-slot notification');
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

  {
    const ownedId = 'boss_attack_warning:owner';
    const newerSignatureId = 'boss_attack_warning:newer_signature';
    const unrelatedId = 'other_notification';
    const ownedActive = {
      __toastMeta: {
        type: 'boss',
        notificationId: ownedId,
        originalOptions: { notificationId: ownedId }
      }
    };
    const unrelatedActive = {
      __toastMeta: {
        type: 'trait',
        notificationId: unrelatedId,
        originalOptions: { notificationId: unrelatedId }
      }
    };
    const scene = Object.create(PlayScene.prototype);
    scene.toastQueue = [{ options: { type: 'trait', notificationId: unrelatedId } }];
    scene.toastTopQueue = [
      { options: { type: 'boss_attack_windup', notificationId: ownedId } },
      { options: { type: 'boss', notificationId: newerSignatureId } }
    ];
    scene.toastCornerQueue = [];
    scene.activeBossIntroCard = null;
    scene.activeCenterToast = null;
    scene.activeTopToast = ownedActive;
    scene.activeCornerToast = unrelatedActive;
    scene.activeBossDossier = null;
    const dismissals = [];
    let queuePasses = 0;
    scene.dismissToastDisplay = (display, slot, { reason } = {}) => {
      dismissals.push({ display, slot, reason });
      if (scene.activeTopToast === display) scene.activeTopToast = null;
      if (scene.activeCornerToast === display) scene.activeCornerToast = null;
    };
    scene.dismissBossDossier = () => assert.fail('unowned boss dossier must not be dismissed');
    scene.processToastQueue = () => { queuePasses += 1; };

    assert.equal(scene.cancelNotificationById(ownedId, 'token_terminal'), 2, 'owner cancellation must remove every queued and active copy of only that token notification');
    assert.equal(scene.activeTopToast, null);
    assert.equal(scene.activeCornerToast, unrelatedActive, 'owner cancellation must preserve unrelated active notifications');
    assert.equal(scene.toastTopQueue.length, 1);
    assert.equal(scene.toastTopQueue[0].options.notificationId, newerSignatureId, 'older token cancellation must preserve a newer signature warning');
    assert.equal(scene.toastQueue[0].options.notificationId, unrelatedId, 'owner cancellation must preserve unrelated queued notifications');
    assert.deepEqual(dismissals.map(({ slot, reason }) => ({ slot, reason })), [{ slot: 'top', reason: 'token_terminal' }]);
    assert.equal(queuePasses, 1);
    assert.equal(scene.cancelNotificationById(ownedId, 'duplicate_terminal'), 0, 'notification cleanup must be idempotent');
    assert.equal(queuePasses, 1, 'idempotent cleanup must not perturb the remaining queue');
  }

  const managerSource = readFileSync('src/managers/EnemyManager.js', 'utf8');
  assert.match(managerSource, /enemy\.update\(isBoss \? dt[^\n]+isBoss \? delta : undefined\)/, 'boss warning clock must receive unscaled frame time while movement preserves slow-time scaling');
  assert.match(managerSource, /cancelAttackWarning\?\.\('boss_support_inbound', \{ category: 'regular' \}\)/, 'normal fuel-support warning must cancel an active regular warning');

  console.log(`[boss-warning-lifecycle] PASS regularProfiles=${regularResults.length} signatureProfiles=${signatureResults.length} phaseThresholds=2 frameThresholds=16,33,100,249,250,251,10000 interruptions=armor,finish,refuel,support,pause,respawn,long-frame notificationOwnership=queued+active+idempotent transientCleanup=pass experimentIsolation=pass`);
} finally {
  Date.now = originalDateNow;
}
