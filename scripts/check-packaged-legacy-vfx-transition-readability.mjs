import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, promises as fsPromises } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const exePath = path.resolve('release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR ||
  `test-results/packaged-legacy-vfx-transition-readability-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
const frames1920Dir = path.join(outputDir, 'frames-1920x1080');
const frames1280Dir = path.join(outputDir, 'frames-1280x720');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForCdp(port) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 90000) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(1500)
      })).ok) return;
    } catch {
      // Packaged Chromium is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Packaged CDP endpoint did not start on port ${port}`);
}

async function screenshot(page, filename) {
  const target = path.join(outputDir, filename);
  await page.screenshot({ path: target, fullPage: false });
  return target;
}

async function prepareScene(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(
    ({ expectedWidth, expectedHeight }) => (
      window.__game?.getWidth?.() === expectedWidth &&
      window.__game?.getHeight?.() === expectedHeight
    ),
    { expectedWidth: width, expectedHeight: height },
    { timeout: 10000, polling: 50 }
  );
  await page.evaluate(({ expectedWidth, expectedHeight }) => {
    const game = window.__game;
    const play = game.scenes.play;
    game.app.ticker.start();
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    play.clearRunContractStartNudge?.();
    play.completeFirstRunOnboarding?.();
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.clearToastState?.();
    play.clearMayhemReinforcementPresentations?.('legacy_vfx_packaged_qa');
    play.pendingStormSurvivedRewards = [];
    play.scorePopupManager?.cleanup?.();
    play.bulletManager?.clearAll?.('legacy_vfx_packaged_qa');
    play.enemyManager?.clearEnemies?.();
    play.enemyManager.state = 'WAVE_ACTIVE';
    play.enemyManager.phase = 'WAVES';
    play.enemyManager.waveEnding = false;
    play.player.x = play.gameplayGame.getWidth() / 2;
    play.player.y = play.gameplayGame.getHeight() - 108;
    play.player.sprite.x = play.player.x;
    play.player.sprite.y = play.player.y;
    play.hud?.setNotificationFocus?.('none');
    play.hud?.updateMissionStatus?.();
    if (play.slowTimeVisualField) {
      play.slowTimeVisualField.clear();
      play.slowTimeVisualField.visible = false;
    }
    window.__novaMayhemPerformanceDiagnostics?.enable?.({
      showOverlay: false,
      noHitAudio: true
    });
  }, { expectedWidth: width, expectedHeight: height });
  await page.waitForTimeout(180);
}

async function startScreencast(context, page, framesDir, width, height) {
  mkdirSync(framesDir, { recursive: true });
  const cdp = await context.newCDPSession(page);
  let frameIndex = 0;
  const pendingWrites = new Set();
  let writeError = null;
  cdp.on('Page.screencastFrame', (event) => {
    const framePath = path.join(framesDir, `frame-${String(frameIndex++).padStart(4, '0')}.jpg`);
    void cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
    const pendingWrite = fsPromises.writeFile(framePath, Buffer.from(event.data, 'base64'))
      .catch((error) => {
        writeError ||= error;
      })
      .finally(() => pendingWrites.delete(pendingWrite));
    pendingWrites.add(pendingWrite);
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 88,
    maxWidth: width,
    maxHeight: height,
    everyNthFrame: 1
  });
  return {
    cdp,
    getFrameCount: () => frameIndex,
    stop: async () => {
      await cdp.send('Page.stopScreencast');
      await page.waitForTimeout(180);
      await Promise.all([...pendingWrites]);
      if (writeError) throw writeError;
    }
  };
}

async function stageFriendlyProjectiles(page, count, adaptive) {
  return page.evaluate(({ targetCount, adaptiveEnabled }) => {
    const play = window.__game.scenes.play;
    const bm = play.bulletManager;
    const player = play.player;
    bm.clearPlayerBullets('friendly_vfx_stage');
    bm.setAdaptiveFriendlyVfxEnabled(false);
    let created = 0;
    let volleyGuard = 0;
    while (created < targetCount && volleyGuard < targetCount * 2) {
      volleyGuard += 1;
      player.shootCooldown = 0;
      const volley = player.shoot?.() || [];
      for (const bullet of volley) {
        if (created >= targetCount) break;
        const column = created % 16;
        const row = Math.floor(created / 16);
        bullet.x = 90 + column * ((play.game.getWidth() - 180) / 15);
        bullet.y = 190 + row * 34;
        bullet.vx = 0;
        bullet.vy = 0;
        bullet.speed = 0;
        bullet.sprite.x = bullet.x;
        bullet.sprite.y = bullet.y;
        if (created === 0) bullet.isPlasmaLance = true;
        if (bm.addPlayerBullet(bullet)) created += 1;
      }
    }
    bm.setAdaptiveFriendlyVfxEnabled(adaptiveEnabled);
    for (let iteration = 0; iteration < 42; iteration += 1) {
      bm.updateAdaptiveFriendlyVfxCompression(1);
    }
    const active = bm.playerBullets.filter((bullet) => bullet?.active !== false);
    const priority = active.find((bullet) => bullet.isPriorityPlayerProjectile?.());
    const ordinary = active.find((bullet) => !bullet.isPriorityPlayerProjectile?.());
    return {
      created,
      adaptiveEnabled,
      manager: bm.getDebugState(),
      priority: priority?.sprite?._debugProjectileReadability || null,
      ordinary: ordinary?.sprite?._debugProjectileReadability || null,
      priorityAlpha: priority?.sprite?.alpha ?? null,
      ordinaryAlpha: ordinary?.sprite?.alpha ?? null
    };
  }, { targetCount: count, adaptiveEnabled: adaptive });
}

async function captureWaveAndStormSequence(page, sizeLabel) {
  const captures = {};
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.hud.setNotificationFocus('none');
    play.hud.updateMissionStatus();
    play.showWaveBonusEffect(1500, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 4/8' });
  });
  await page.waitForTimeout(430);
  const ordinaryState = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      wave: play.activeTopToast?._debugWaveClearEffect || null,
      mission: play.hud?.missionPanel?._debugPriority || null,
      storm: play.lastMayhemReinforcementPresentation || null
    };
  });
  assert(ordinaryState.wave?.visualLanguage === 'nova_command_hud_wave_clear_v2',
    `ordinary Wave Cleared lost V2 at ${sizeLabel}: ${JSON.stringify(ordinaryState)}`);
  assert(ordinaryState.mission?.semanticSuppressed === true && ordinaryState.mission?.missionTextAlpha === 0,
    `Mission Status remained semantic beneath Wave Cleared at ${sizeLabel}: ${JSON.stringify(ordinaryState)}`);
  captures.ordinary = {
    state: ordinaryState,
    screenshot: await screenshot(page, `01-ordinary-wave-cleared-${sizeLabel}.png`)
  };
  await page.evaluate(() => window.__game.scenes.play.clearToastState());
  await page.waitForTimeout(120);

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const manager = play.enemyManager;
    play.pendingStormSurvivedRewards = [];
    play.showMayhemReinforcementStormSurvived({ groupCount: 3, score: 1800, superStorm: true });
    manager.state = 'WAVE_BRIEFING';
    play.showWaveBonusEffect(2400, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 7/8' });
    play.showToast('WAVE 7/8\nINTERCEPT FORMATION', {
      type: 'wave_start',
      channel: 'transition',
      slot: 'top',
      duration: 1050,
      minVisibleMs: 760,
      extraReadTimeMs: 0,
      priority: 3,
      restrained: true,
      signalPlate: true
    });
  });
  await page.waitForTimeout(430);
  const stormWaveState = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      wave: play.activeTopToast?._debugWaveClearEffect || null,
      pendingRewardCount: play.pendingStormSurvivedRewards?.length || 0,
      activeCornerType: play.activeCornerToast?.__toastMeta?.type || null,
      storm: play.lastMayhemReinforcementPresentation || null
    };
  });
  assert(stormWaveState.wave?.visualLanguage === 'nova_command_hud_wave_clear_v2',
    `Storm clear changed Wave Cleared V2 at ${sizeLabel}: ${JSON.stringify(stormWaveState)}`);
  assert(stormWaveState.pendingRewardCount === 1 && stormWaveState.activeCornerType !== 'storm_survived',
    `Storm reward was not delayed at ${sizeLabel}: ${JSON.stringify(stormWaveState)}`);
  assert(stormWaveState.storm?.phase === 'survived_reward_pending' && stormWaveState.storm?.legacyWheelRemoved === true,
    `legacy Storm wheel contract missing at ${sizeLabel}: ${JSON.stringify(stormWaveState)}`);
  captures.stormWave = {
    state: stormWaveState,
    screenshot: await screenshot(page, `02-storm-survived-wave-cleared-${sizeLabel}.png`)
  };

  try {
    await page.waitForFunction(() => (
      window.__game.scenes.play.activeTopToast?.__toastMeta?.type === 'wave_start'
    ), null, { timeout: 8000, polling: 50 });
  } catch (error) {
    const debugState = await page.evaluate(() => {
      const play = window.__game.scenes.play;
      return {
        activeTop: play.activeTopToast?.__toastMeta || null,
        queuedTop: (play.toastTopQueue || []).map((entry) => ({
          type: entry?.options?.type || null,
          priority: entry?.priority || 0,
          createdAt: entry?.createdAt || 0,
          notBefore: entry?.notBefore || 0,
          expiresAt: entry?.expiresAt || 0
        })),
        notificationExitAt: Object.fromEntries(play.notificationExitAt || []),
        notificationFocus: play.hud?.notificationFocus || null,
        appTickerStarted: Boolean(play.game?.app?.ticker?.started)
      };
    });
    throw new Error(`Wave Start never became active at ${sizeLabel}: ${JSON.stringify(debugState)}`, {
      cause: error
    });
  }
  await page.waitForTimeout(170);
  const waveStartState = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      type: play.activeTopToast?.__toastMeta?.type || null,
      transition: play.activeTopToast?._debugNovaCommandHud || null,
      mission: play.hud?.missionPanel?._debugPriority || null,
      activeCornerType: play.activeCornerToast?.__toastMeta?.type || null,
      pendingRewardCount: play.pendingStormSurvivedRewards?.length || 0
    };
  });
  assert(waveStartState.type === 'wave_start' &&
    waveStartState.transition?.visualLanguage === 'nova_command_hud_transition_v1',
  `Wave Start did not use the approved transition language at ${sizeLabel}: ${JSON.stringify(waveStartState)}`);
  assert(waveStartState.mission?.semanticSuppressed === true &&
    waveStartState.mission?.missionTextAlpha === 0 &&
    waveStartState.mission?.directiveTextAlpha === 0 &&
    waveStartState.mission?.progressAlpha === 0,
  `Mission Status was not fully suppressed during Wave Start at ${sizeLabel}: ${JSON.stringify(waveStartState)}`);
  assert(waveStartState.activeCornerType === null && waveStartState.pendingRewardCount === 1,
    `side reward competed with Wave Start at ${sizeLabel}: ${JSON.stringify(waveStartState)}`);
  captures.waveStart = {
    state: waveStartState,
    screenshot: await screenshot(page, `03-wave-start-mission-suppressed-${sizeLabel}.png`)
  };

  await page.waitForFunction(() => {
    const play = window.__game.scenes.play;
    return !play.hasNotificationType('wave_clear') && !play.hasNotificationType('wave_start');
  }, null, { timeout: 8000, polling: 50 });
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.enemyManager.state = 'WAVE_ACTIVE';
    play.maybeFlushPendingWaveTransitionRewards();
  });
  try {
    await page.waitForFunction(
      () => window.__game.scenes.play.activeCornerToast?.__toastMeta?.type === 'storm_survived',
      null,
      { timeout: 8000, polling: 50 }
    );
  } catch (error) {
    const debugState = await page.evaluate(() => {
      const play = window.__game.scenes.play;
      return {
        activeCorner: play.activeCornerToast?.__toastMeta || null,
        queuedCorner: (play.toastCornerQueue || []).map((entry) => ({
          type: entry?.options?.type || null,
          priority: entry?.priority || 0,
          notBefore: entry?.notBefore || 0,
          expiresAt: entry?.expiresAt || 0
        })),
        tacticalBlockUntil: play.getTacticalAlertBlockUntil?.(Date.now()) || 0,
        cornerLockUntil: play.getToastSlotLockUntil?.('corner') || 0,
        now: Date.now()
      };
    });
    throw new Error(`Storm reward never reached the side slot at ${sizeLabel}: ${JSON.stringify(debugState)}`, {
      cause: error
    });
  }
  await page.waitForTimeout(80);
  const delayedRewardState = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      activeCornerType: play.activeCornerToast?.__toastMeta?.type || null,
      pendingRewardCount: play.pendingStormSurvivedRewards?.length || 0,
      storm: play.lastMayhemReinforcementPresentation || null,
      effectDebug: play.decorativeOverlay?.children
        ?.find((child) => child.label === 'nova_command_storm_survived_collapse')
        ?._debugStormSurvivedCollapse || null
    };
  });
  assert(delayedRewardState.activeCornerType === 'storm_survived' &&
    delayedRewardState.pendingRewardCount === 0,
  `Storm reward did not resume after Wave Start at ${sizeLabel}: ${JSON.stringify(delayedRewardState)}`);
  assert(delayedRewardState.effectDebug?.durationMs >= 300 &&
    delayedRewardState.effectDebug?.durationMs <= 450 &&
    delayedRewardState.effectDebug?.maxFootprint <= 400 &&
    delayedRewardState.effectDebug?.spokeCount === 0 &&
    delayedRewardState.effectDebug?.diamondCount === 0 &&
    delayedRewardState.effectDebug?.fullScreenWashCount === 0,
  `Storm collapse violated restrained bounds at ${sizeLabel}: ${JSON.stringify(delayedRewardState)}`);
  captures.delayedReward = {
    state: delayedRewardState,
    screenshot: await screenshot(page, `04-delayed-storm-reward-${sizeLabel}.png`)
  };
  await page.waitForTimeout(480);
  await page.evaluate(() => window.__game.scenes.play.clearToastState());
  return captures;
}

async function captureProjectileRetirement(page, sizeLabel) {
  await stageFriendlyProjectiles(page, 28, false);
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.showWaveBonusEffect(900, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 3/8' });
    play.bulletManager.beginPlayerTransitionRetirement('packaged_wave_clear_probe', 200);
    play.bulletManager.update(6);
  });
  await page.waitForTimeout(80);
  const half = await page.evaluate(() => {
    const bullets = window.__game.scenes.play.bulletManager.playerBullets;
    return {
      count: bullets.length,
      alphas: bullets.slice(0, 6).map((bullet) => bullet.sprite?.alpha ?? null),
      retirement: window.__game.scenes.play.bulletManager.getDebugState().lastTransitionRetirement
    };
  });
  assert(half.count > 0 && half.alphas.every((alpha) => alpha > 0 && alpha < 0.72),
    `friendly projectiles did not visibly retire at ${sizeLabel}: ${JSON.stringify(half)}`);
  const image = await screenshot(page, `05-friendly-projectile-retirement-${sizeLabel}.png`);
  const complete = await page.evaluate(() => {
    const bm = window.__game.scenes.play.bulletManager;
    bm.update(7);
    return bm.getDebugState();
  });
  assert(complete.player === 0, `friendly projectile retirement did not complete at ${sizeLabel}: ${JSON.stringify(complete)}`);
  await page.evaluate(() => window.__game.scenes.play.clearToastState());
  return { half, complete, screenshot: image };
}

async function captureChronoComboBonus(page, sizeLabel) {
  const result = {};
  await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    game.app.ticker.stop();
    play.clearToastState();
    play.scorePopupManager.cleanup();
    play.isPaused = false;
    play.player.activePowerup = { type: 'slow_time', expiresAt: Date.now() + 5000, remainingMs: 5000 };
    play.player.powerupEffect = {
      slowTime: true,
      enemyTimeScale: 0.33,
      enemyBulletScale: 0.35,
      hazardTimeScale: 0.35
    };
    play.updateSlowTimeVisualField(1);
    game.app.render();
  });
  const chronoState = await page.evaluate(() => ({
    ...(window.__game.scenes.play.slowTimeVisualField?._debugSlowTimeField || {})
  }));
  assert(chronoState.visualLanguage === 'chrono_anchor_single_distortion_ring_v1' &&
    chronoState.primaryRingCount === 1 &&
    chronoState.timeSliceCount === 0 &&
    chronoState.fullScreenGeometryCount === 0 &&
    chronoState.screenMapped === true &&
    Math.abs(chronoState.x - page.viewportSize().width / 2) <= 2 &&
    chronoState.y > 0 &&
    chronoState.y < page.viewportSize().height,
  `Chrono Anchor retained legacy grid geometry at ${sizeLabel}: ${JSON.stringify(chronoState)}`);
  result.chrono = {
    state: chronoState,
    screenshot: await screenshot(page, `06-chrono-anchor-${sizeLabel}.png`)
  };

  await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    play.player.activePowerup = { type: null, expiresAt: 0, remainingMs: 0 };
    play.player.powerupEffect = null;
    play.updateSlowTimeVisualField(1);
    play.isPaused = true;
    play.clearToastState();
    play.scorePopupManager.cleanup();
    play.scorePopupManager.comboCount = 29;
    play.scorePopupManager.lastKillTime = Date.now();
    play.scorePopupManager.addScorePopup(
      play.game.getWidth() / 2,
      play.game.getHeight() * 0.55,
      100,
      { comboEligible: true }
    );
    play.triggerComboMilestoneFlare({
      threshold: 30,
      multiplier: 3,
      x: play.game.getWidth() / 2,
      y: play.game.getHeight() * 0.62
    });
    game.app.ticker.start();
  });
  await page.waitForTimeout(120);
  const comboState = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const combo = play.scorePopupManager.popups.find((popup) => popup.isCombo);
    return {
      popup: combo?.sprite?.__debugScorePopup || null,
      text: combo?.sprite?.__novaScorePopupText || null,
      frameWidth: combo?.frameWidth || null,
      celebration: play.lastComboCelebration || null
    };
  });
  assert(comboState.popup?.visualLanguage === 'compact_combo_milestone_pulse_v1' &&
    comboState.frameWidth <= 180 &&
    comboState.celebration?.shockwaveCount === 0 &&
    comboState.celebration?.spectacleCount === 0,
  `combo milestone was not compact at ${sizeLabel}: ${JSON.stringify(comboState)}`);
  result.combo = {
    state: comboState,
    screenshot: await screenshot(page, `07-compact-combo-milestone-${sizeLabel}.png`)
  };

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.scorePopupManager.cleanup();
    play.scorePopupManager.addScorePopup(
      play.game.getWidth() * 0.62,
      play.game.getHeight() * 0.43,
      0,
      {
        comboEligible: false,
        color: 0xffef7e,
        text: 'BONUS DRONE DOWN!\n+500',
        type: 'bonus_drone',
        fontSize: play.game.getWidth() < 720 ? 14 : 16,
        maxLifetime: 780,
        vy: -1.15
      }
    );
  });
  await page.waitForTimeout(90);
  const bonusState = await page.evaluate(() => {
    const popup = window.__game.scenes.play.scorePopupManager.popups[0];
    return {
      type: popup?.type || null,
      text: popup?.sprite?.__novaScorePopupText || null,
      major: popup?.isMajor ?? null,
      x: popup?.x || null,
      y: popup?.y || null
    };
  });
  assert(bonusState.type === 'bonus_drone' && bonusState.major === false,
    `Bonus Drone Down remained a giant/plain toast at ${sizeLabel}: ${JSON.stringify(bonusState)}`);
  result.bonusDrone = {
    state: bonusState,
    screenshot: await screenshot(page, `08-local-bonus-drone-down-${sizeLabel}.png`)
  };
  return result;
}

async function captureCompression(page, sizeLabel) {
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.scorePopupManager.cleanup();
  });
  const before = await stageFriendlyProjectiles(page, 160, false);
  const beforePath = await screenshot(page, `09-dense-friendly-vfx-before-${sizeLabel}.png`);
  const after = await stageFriendlyProjectiles(page, 160, true);
  const afterPath = await screenshot(page, `10-dense-friendly-vfx-after-${sizeLabel}.png`);
  assert(after.manager?.adaptiveFriendlyVfx?.level >= 0.9,
    `dense combat did not activate friendly-VFX compression at ${sizeLabel}: ${JSON.stringify(after)}`);
  assert(after.ordinary?.friendlyVfxCompression >= 0.9 &&
    after.ordinary?.ordinaryOpacity >= 0.76 &&
    after.ordinary?.trailScale <= 0.7 &&
    after.ordinary?.routineHaloIntensity <= 0.42,
  `ordinary friendly VFX were not compressed as specified at ${sizeLabel}: ${JSON.stringify(after)}`);
  assert(after.priority?.priorityPlayerProjectile === true &&
    after.priority?.friendlyVfxCompression === 0 &&
    after.priorityAlpha >= after.ordinaryAlpha,
  `priority player attack was compressed at ${sizeLabel}: ${JSON.stringify(after)}`);
  return {
    before: { ...before, screenshot: beforePath },
    after: { ...after, screenshot: afterPath }
  };
}

async function captureBossReadability(page, sizeLabel) {
  await page.evaluate(async () => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.scorePopupManager.cleanup();
    play.enemyManager.clearEnemies();
    play.isPaused = false;
    const boss = await play.enemyManager.spawnBoss(10, {
      marketingDebug: true,
      x: play.game.getWidth() / 2,
      y: play.game.getHeight() * 0.27
    });
    play.enemyManager.state = 'BOSS_ACTIVE';
    play.enemyManager.phase = 'BOSS';
    play.enemyManager.ensureCombatReadabilityIdentity(boss);
    play.enemyManager.recordCombatReadabilityFirstAttack(boss);
    play.hud.setNotificationFocus('none');
    play.hud.updateMissionStatus();
    play.updateBossPriorityEdge(1);
    play.isPaused = true;
  });
  const dense = await stageFriendlyProjectiles(page, 150, true);
  const state = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const boss = play.enemyManager.boss;
    play.isPaused = false;
    play.updateBossPriorityEdge(1);
    const result = {
      bossName: boss?.name || null,
      missionText: play.hud?.missionText?.text || null,
      healthBar: boss?.healthBar?.__debugBossHealthBar || null,
      priorityEdge: play.bossPriorityEdgeLayer?._debugBossPriorityEdge || null,
      friendlyCompression: play.bulletManager.getDebugState().adaptiveFriendlyVfx
    };
    play.isPaused = true;
    return result;
  });
  assert(state.healthBar?.semanticRole === 'dominant_boss_health' &&
    state.healthBar?.missionStatusDuplicatesHealth === false &&
    !String(state.missionText).includes('BOSS HP'),
  `boss HP remained duplicated at ${sizeLabel}: ${JSON.stringify(state)}`);
  assert(state.priorityEdge?.visible === true &&
    state.priorityEdge?.routineFriendlyProjectilesBelow === true &&
    state.priorityEdge?.hostileProjectilesAbove === true,
  `boss priority edge ordering failed at ${sizeLabel}: ${JSON.stringify(state)}`);
  return {
    state,
    dense,
    screenshot: await screenshot(page, `11-boss-readability-${sizeLabel}.png`)
  };
}

async function captureReducedEffects(page, sizeLabel) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.scorePopupManager.cleanup();
    play.bulletManager.clearAll('reduced_effects_evidence');
    play.enemyManager.clearEnemies();
    play.updateBossPriorityEdge(1);
    play.pendingStormSurvivedRewards = [];
    play.showMayhemReinforcementStormSurvived({ groupCount: 2, score: 1200, superStorm: true });
    play.enemyManager.state = 'WAVE_ACTIVE';
    play.maybeFlushPendingWaveTransitionRewards();
  });
  await page.waitForTimeout(100);
  const state = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      effect: play.decorativeOverlay?.children
        ?.find((child) => child.label === 'nova_command_storm_survived_collapse')
        ?._debugStormSurvivedCollapse || null,
      activeCornerType: play.activeCornerToast?.__toastMeta?.type || null
    };
  });
  assert(state.effect?.reducedMotion === true && state.effect?.durationMs === 320,
    `reduced-effects Storm collapse failed at ${sizeLabel}: ${JSON.stringify(state)}`);
  const target = await screenshot(page, `12-reduced-effects-storm-${sizeLabel}.png`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(320);
  await page.evaluate(() => window.__game.scenes.play.clearToastState());
  return { state, screenshot: target };
}

async function seedDiagnosticSample(page) {
  await page.evaluate(async () => {
    const play = window.__game.scenes.play;
    const manager = play.enemyManager;
    const diagnostics = play.performanceDiagnostics;
    diagnostics.resetSamples();
    diagnostics.setOptions({ enabled: true, showOverlay: false, noHitAudio: true });
    manager.clearEnemies();
    manager.level = 8;
    manager.currentWaveIndex = 3;
    manager.normalWavesTotal = 8;
    const now = Date.now();
    diagnostics.mark('wave_clear.objectives_zero', { atMs: now, level: 8, wave: 4, total: 8 });
    await new Promise((resolve) => setTimeout(resolve, 320));
    diagnostics.mark('combat_readability.wave_clear_presentation', {
      atMs: Date.now(),
      level: 8,
      wave: 4,
      cleanupDurationMs: Date.now() - now
    });
    await new Promise((resolve) => setTimeout(resolve, 460));
    diagnostics.mark('combat_readability.wave_transition_complete', {
      atMs: Date.now(),
      level: 8,
      wave: 5,
      waveClearToActiveMs: Date.now() - now
    });

    const config = manager.generateWaves(8).find((wave) => wave?.type !== 'BOSS');
    manager.spawnWave({
      ...config,
      count: 8,
      allowConcurrentSpawn: true,
      dangerMidShipIds: [],
      eliteMiddleShipId: null,
      multiEliteMiddleShipIds: [],
      forcedThreatActionIds: []
    });
    await new Promise((resolve) => setTimeout(resolve, 900));
    const enemies = manager.enemies.filter((enemy) => enemy?.kind !== 'boss').slice(0, 8);
    enemies.forEach((enemy) => manager.ensureCombatReadabilityIdentity(enemy));
    await new Promise((resolve) => setTimeout(resolve, 620));
    enemies.slice(0, 5).forEach((enemy) => manager.recordCombatReadabilityFirstAttack(enemy));
    await new Promise((resolve) => setTimeout(resolve, 780));
    enemies.forEach((enemy) => manager.recordCombatReadabilityDeath(enemy));

    manager.clearEnemies();
    const boss = await manager.spawnBoss(10, {
      marketingDebug: true,
      x: play.game.getWidth() / 2,
      y: play.game.getHeight() * 0.27
    });
    manager.ensureCombatReadabilityIdentity(boss);
    await new Promise((resolve) => setTimeout(resolve, 650));
    manager.recordCombatReadabilityFirstAttack(boss);
    await new Promise((resolve) => setTimeout(resolve, 900));
    manager.recordCombatReadabilityDeath(boss);
    play.bulletManager.beginPlayerTransitionRetirement('diagnostic_sample', 200);
    diagnostics.sampleCombatReadability(play);
  });
  return page.evaluate(() => window.__novaMayhemPerformanceDiagnostics.getReport().combatReadability);
}

function encodeVideo(framesDir, width, height, filename) {
  const target = path.join(outputDir, filename);
  const ffmpeg = spawnSync('ffmpeg', [
    '-y',
    '-framerate', '60',
    '-i', path.join(framesDir, 'frame-%04d.jpg'),
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    target
  ], { encoding: 'utf8' });
  assert(ffmpeg.status === 0, `ffmpeg failed for ${filename}: ${ffmpeg.stderr}`);
  return target;
}

if (!existsSync(exePath)) throw new Error(`Packaged executable not found: ${exePath}`);
mkdirSync(outputDir, { recursive: true });
const port = await openPort();
const child = spawn(exePath, ['--windowed', `--remote-debugging-port=${port}`], {
  cwd: root,
  windowsHide: true,
  env: { ...process.env, NOVA_SWARM_USER_DATA_DIR: path.join(outputDir, 'userData') },
  stdio: ['ignore', 'pipe', 'pipe']
});
const stdout = [];
const stderr = [];
child.stdout.on('data', (chunk) => stdout.push(String(chunk)));
child.stderr.on('data', (chunk) => stderr.push(String(chunk)));

let browser;
let page;
const pageErrors = [];
const consoleErrors = [];
try {
  await waitForCdp(port);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000 && !page) {
    page = context.pages().find((candidate) =>
      candidate.url().includes('nova-swarm://') || candidate.url().includes('/index.html'));
    if (!page) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(page, 'Packaged renderer target not found');
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const runUrl = new URL(page.url());
  for (const [key, value] of Object.entries({
    desktop: '1',
    autostart: '1',
    controlSmoke: '1',
    offlineLeaderboard: '1',
    novaPerfDiag: '1'
  })) runUrl.searchParams.set(key, value);
  await page.goto(runUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => window.__game?.scenes?.play?.showWaveBonusEffect,
    null,
    { timeout: 30000, polling: 100 }
  );
  await page.waitForTimeout(900);

  const evidence = {};
  const video = {};
  for (const resolution of [
    { width: 1920, height: 1080, label: '1920x1080', framesDir: frames1920Dir },
    { width: 1280, height: 720, label: '1280x720', framesDir: frames1280Dir }
  ]) {
    await prepareScene(page, resolution.width, resolution.height);
    const screencast = await startScreencast(
      context,
      page,
      resolution.framesDir,
      resolution.width,
      resolution.height
    );
    evidence[resolution.label] = {
      transitions: await captureWaveAndStormSequence(page, resolution.label),
      projectileRetirement: await captureProjectileRetirement(page, resolution.label),
      legacyFeedback: await captureChronoComboBonus(page, resolution.label),
      compression: await captureCompression(page, resolution.label),
      boss: await captureBossReadability(page, resolution.label)
    };
    if (resolution.width === 1280) {
      evidence[resolution.label].reducedEffects = await captureReducedEffects(page, resolution.label);
    }
    await screencast.stop();
    const frameCount = screencast.getFrameCount();
    assert(frameCount >= 90, `Packaged ${resolution.label} video captured only ${frameCount} frames`);
    video[resolution.label] = {
      frameCount,
      path: encodeVideo(
        resolution.framesDir,
        resolution.width,
        resolution.height,
        `legacy-vfx-transition-readability-${resolution.label}-60fps.mp4`
      )
    };
  }

  const diagnostics = await seedDiagnosticSample(page);
  assert(diagnostics.enemySpawnToDeath.count >= 8,
    `combat diagnostics did not record enemy deaths: ${JSON.stringify(diagnostics)}`);
  assert(diagnostics.enemySpawnToFirstAttack.count >= 5,
    `combat diagnostics did not record first attacks: ${JSON.stringify(diagnostics)}`);
  assert(diagnostics.bossTimeToKill.count >= 1,
    `combat diagnostics did not record boss TTK: ${JSON.stringify(diagnostics)}`);
  assert(diagnostics.waveClearCleanupDuration.count >= 1 &&
    diagnostics.waveClearToNextActive.count >= 1,
  `combat diagnostics did not record wave-clear durations: ${JSON.stringify(diagnostics)}`);
  assert(diagnostics.projectileCounts.samples >= 1 &&
    diagnostics.playerPositionHeatmap.samples >= 1,
  `combat diagnostics did not record spatial/projectile samples: ${JSON.stringify(diagnostics)}`);

  assert(pageErrors.length === 0, `Packaged page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `Packaged console errors: ${consoleErrors.join(' | ')}`);
  const report = {
    status: 'passed',
    exePath,
    outputDir,
    evidence,
    video,
    diagnostics,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[packaged-legacy-vfx-transition-readability] PASS output=${outputDir}`);
} finally {
  if (page) await page.evaluate(() => window.__novaApp?.exitGame?.()).catch(() => {});
  await browser?.close().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 750));
  if (!child.killed) child.kill();
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'process.log'), `${stdout.join('')}\n${stderr.join('')}`);
}
