import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4548));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/cabinet-wonders-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function approximatelyEqual(actual, expected, toleranceMs = 4) {
  return Math.abs((Number(actual) || 0) - (Number(expected) || 0)) <= toleranceMs;
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No available Cabinet Wonder port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite preview did not become ready at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function runVariant(browser, variantId, viewport, reducedMotion = false) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference'
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`${baseUrl}?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.introComplete === true, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.firstRunOnboardingComplete === true, null, { timeout: 90000 });
  const synchronous = await page.evaluate((id) => {
    const game = window.__game;
    const play = game.scenes.play;
    play.enemyManager?.forceClearAllEnemies?.();
    (play.bulletManager?.enemyBullets || []).forEach((bullet) => { bullet.active = false; bullet.visible = false; });
    play.enemyManager.state = 'WAVE_BRIEFING';
    play.enemyManager.phase = 'WAVES';
    play.enemyManager.waveBriefingTimer = 240;
    play.clearToastState?.();
    play.player.applyPowerup('rapid_fire');
    play.applyScoreMultiplier(2, 12000, 'cabinet_wonder_runtime');
    const pickup = play.powerupManager.spawnSpecific(
      game.getWidth() * 0.5,
      game.getHeight() * 0.42,
      'damage_up',
      { source: 'cabinet_wonder_runtime', spawnKey: `wonder-runtime:${id}` }
    );
    play.clearToastState?.();
    play.showWaveBonusEffect?.(500, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 3/5' });
    const gameplayClockMs = play.getGameplayClockMs();
    const timedBefore = {
      gameplayClockMs,
      scoreBoostTimerMs: play.scoreBoostTimer,
      activePowerupRemainingMs: play.player.getActivePowerupRemainingMs(gameplayClockMs),
      pickupRemainingMs: pickup?.getLifetimeRemainingMs?.() || 0
    };
    const spawnBaseline = {
      totalEnemiesSpawned: play.enemyManager.totalEnemiesSpawned,
      currentWaveIndex: play.enemyManager.currentWaveIndex,
      state: play.enemyManager.state,
      activeEnemyCount: play.enemyManager.enemies.filter((enemy) => enemy?.active !== false).length,
      hijackerActive: Boolean(play.enemyManager.hijacker?.active)
    };
    const scoreBefore = game.score;
    const shown = play.maybeShowCabinetWonder({
      debugForce: true,
      forceVariantId: id,
      sector: 4,
      waveNumber: 3,
      hasUpcomingWave: true
    });
    const scoreAfter = game.score;
    const second = play.maybeShowCabinetWonder({
      debugForce: true,
      forceVariantId: 'aurora_crown',
      sector: 4,
      waveNumber: 3,
      hasUpcomingWave: true
    });
    return {
      shown,
      second,
      scoreDelta: scoreAfter - scoreBefore,
      runMode: game.runMode,
      runModeReason: game.runModeReason,
      isDebugRun: game.isDebugRun,
      transitionActiveAtPreludeStart: play.hasAuthoritativeTransitionPresentation?.() === true,
      transitionAtPreludeStart: (() => {
        const display = play.activeBossIntroCard || play.activeCenterToast || play.activeTopToast;
        const meta = display?.__toastMeta || null;
        return meta ? {
          type: meta.type || null,
          slot: meta.slot || null,
          durationMs: Number(meta.duration) || 0,
          ageMs: Math.max(0, Date.now() - (Number(meta.createdAt) || Date.now()))
        } : null;
      })(),
      timedBefore,
      spawnBaseline
    };
  }, variantId);
  const readTimedState = () => page.evaluate(() => {
    const play = window.__game.scenes.play;
    const now = play.getGameplayClockMs();
    const pickup = play.powerupManager?.powerups?.find((entry) => entry?.spawnSource === 'cabinet_wonder_runtime');
    return {
      gameplayClockMs: now,
      scoreBoostTimerMs: play.scoreBoostTimer,
      activePowerupRemainingMs: play.player.getActivePowerupRemainingMs(now),
      pickupRemainingMs: pickup?.getLifetimeRemainingMs?.() || 0
    };
  });
  const readSpawnState = () => page.evaluate(() => {
    const manager = window.__game.scenes.play.enemyManager;
    return {
      totalEnemiesSpawned: manager.totalEnemiesSpawned,
      currentWaveIndex: manager.currentWaveIndex,
      state: manager.state,
      activeEnemyCount: manager.enemies.filter((enemy) => enemy?.active !== false).length,
      hijackerActive: Boolean(manager.hijacker?.active)
    };
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.cabinetWonders?.pending?.kind === 'audio_prelude';
  }, null, { timeout: 5000 });
  const preludeState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const preludeTimedState = await readTimedState();
  const preludeSpawnState = await readSpawnState();
  const preludeProgressionHeld = await page.evaluate(() => (
    window.__game?.scenes?.play?.shouldHoldProgressionPresentation?.() === true
  ));
  await page.waitForFunction((id) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.cabinetWonders?.active?.id === id;
  }, variantId, { timeout: 5000 });
  await page.waitForTimeout(180);
  const activeState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const activeTimedState = await readTimedState();
  const activeSpawnState = await readSpawnState();
  const activeProgressionHeld = await page.evaluate(() => (
    window.__game?.scenes?.play?.shouldHoldProgressionPresentation?.() === true
  ));
  const screenshot = path.join(outputDir, `${variantId}-${viewport.width}x${viewport.height}${reducedMotion ? '-reduced' : ''}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.waitForTimeout(2200);
  const completedState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const completedTimedState = await readTimedState();
  const completedProgressionHeld = await page.evaluate(() => (
    window.__game?.scenes?.play?.shouldHoldProgressionPresentation?.() === true
  ));
  const experimentalIsolation = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const previous = game.lateGameExperiment;
    game.lateGameExperiment = { active: true, scenario: 'standard', metrics: {} };
    const shown = play.maybeShowCabinetWonder({
      debugForce: true,
      forceVariantId: 'ghost_fleet_salute',
      sector: 6,
      waveNumber: 3,
      hasUpcomingWave: true
    });
    const state = {
      shown,
      noAgencyActive: play.isCabinetWonderNoAgencyPresentationActive(),
      opportunity: Boolean(play.cabinetWonderOpportunity)
    };
    game.lateGameExperiment = previous;
    return state;
  });
  let lifecycle = null;
  if (variantId === 'ghost_fleet_salute') {
    const cancellation = await page.evaluate(() => {
      const game = window.__game;
      const play = game.scenes.play;
      const manager = play.enemyManager;
      manager.forceClearAllEnemies?.();
      play.clearToastState?.();
      manager.state = 'WAVE_BRIEFING';
      manager.phase = 'WAVES';
      manager.waveBriefingTimer = 240;
      play.showWaveBonusEffect?.(500, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 4/5' });

      const input = play.inputManager;
      input.keys.KeyW = true;
      input.keys.Space = true;
      input.keys.KeyB = true;
      input.justPressed.Space = true;
      input.justPressed.KeyB = true;
      input.justPressedActions.specialFire = true;
      input.justPressedActions.pause = true;
      input.specialFirePointerJustPressed = true;
      input.mouseFireActive = true;
      input.touchFireActive = true;
      input.fireToggleLatched = true;

      const shown = play.maybeShowCabinetWonder({
        debugForce: true,
        forceVariantId: 'aurora_crown',
        sector: 6,
        waveNumber: 3,
        hasUpcomingWave: true
      });
      const token = play.cabinetWonderOpportunity;
      const inputAfterEnter = {
        ...input.getTransientDebugState(),
        justPressed: Object.keys(input.justPressed).filter((key) => input.justPressed[key]),
        justPressedActions: Object.keys(input.justPressedActions).filter((key) => input.justPressedActions[key])
      };

      const originalLevel = manager.level;
      manager.level = 4;
      manager.hijackerSpawnedThisLevel = false;
      manager.hijackerSpawnAttemptedThisLevel = false;
      manager.hijacker = null;
      manager.pendingTransitionHijackerSpawn = null;
      const originalRandom = Math.random;
      const randomSequence = [0.1, 0.25, 0.75];
      let selectionRandomCalls = 0;
      Math.random = () => randomSequence[Math.min(selectionRandomCalls++, randomSequence.length - 1)];
      try {
        manager.maybeSpawnHijacker({ clearedWaveNumber: 1, hasUpcomingWave: true });
      } finally {
        Math.random = originalRandom;
      }
      const plan = manager.pendingTransitionHijackerSpawn
        ? { ...manager.pendingTransitionHijackerSpawn }
        : null;
      const deferred = manager.releasePendingTransitionHijackerSpawn();
      const beforeCancel = {
        hijackerActive: Boolean(manager.hijacker?.active),
        deferredReleaseCount: token?.deferredReleases?.length || 0,
        pendingPlan: Boolean(manager.pendingTransitionHijackerSpawn)
      };
      const firstCancel = play.cancelCabinetWonderOpportunity('runtime_cancel', token);
      const secondCancel = play.cancelCabinetWonderOpportunity('runtime_cancel_again', token);
      const terminal = play.getCabinetWonderDebugState().lastTerminal;
      const hijacker = manager.hijacker;
      const releasedHijacker = hijacker ? {
        active: Boolean(hijacker.active),
        x: hijacker.x,
        y: hijacker.y,
        initialBeamDelayMs: Math.round(hijacker.nextBeamAt - Date.now())
      } : null;
      manager.forceClearAllEnemies?.();
      manager.level = originalLevel;
      return {
        shown,
        gameWidth: game.getWidth(),
        gameHeight: game.getHeight(),
        managerGameWidth: manager.game.getWidth(),
        inputAfterEnter,
        selectionRandomCalls,
        plan,
        deferred,
        beforeCancel,
        firstCancel,
        secondCancel,
        tokenAfterCancel: token ? {
          terminal: token.terminal,
          state: token.state,
          releaseCount: token.releaseCount,
          timersCleared: ['preludeTimer', 'transitionMonitorTimer', 'revealTimer', 'cleanupTimer']
            .every((key) => token[key] === null)
        } : null,
        terminal,
        releasedHijacker
      };
    });
    await page.waitForTimeout(1750);
    const afterStaleCallback = await page.evaluate(() => {
      const play = window.__game.scenes.play;
      const state = play.getCabinetWonderDebugState();
      return {
        opportunity: state.opportunity,
        pending: state.pending,
        active: state.active,
        overlayCount: state.overlayCount,
        noAgencyActive: state.noAgencyActive,
        progressionResumeCount: state.progressionResumeCount,
        terminal: state.lastTerminal
      };
    });

    const assetLateStarted = await page.evaluate(() => {
      const game = window.__game;
      const play = game.scenes.play;
      play.enemyManager?.forceClearAllEnemies?.();
      play.clearToastState?.();
      play.enemyManager.state = 'WAVE_BRIEFING';
      play.enemyManager.phase = 'WAVES';
      play.scoreBoostTimer = 5000;
      const before = play.captureCabinetWonderTimedEffectSnapshot();
      const shown = play.beginCabinetWonderOpportunity({
        eligible: true,
        triggered: true,
        reason: 'debug_force',
        sector: 7,
        waveNumber: 3,
        chance: 1,
        roll: 0,
        scoreNeutral: true,
        gameplayNeutral: true,
        variant: {
          id: 'runtime_asset_late',
          title: 'Runtime Asset-Late Sentinel',
          palette: [0x7df9ff, 0xff70d7, 0xffef9a]
        }
      });
      if (play.cabinetWonderOpportunity) play.cabinetWonderOpportunity.assetsReady = false;
      return { shown, before };
    });
    await page.waitForFunction(() => (
      window.__game?.scenes?.play?.getCabinetWonderDebugState?.().lastTerminal?.reason === 'asset_late'
    ), null, { timeout: 5000 }).catch(() => null);
    const assetLate = await page.evaluate(() => {
      const state = window.__game.scenes.play.getCabinetWonderDebugState();
      return {
        opportunity: state.opportunity,
        pending: state.pending,
        active: state.active,
        noAgencyActive: state.noAgencyActive,
        progressionResumeCount: state.progressionResumeCount,
        terminal: state.lastTerminal
      };
    });

    const destruction = await page.evaluate(() => {
      const play = window.__game.scenes.play;
      play.enemyManager?.forceClearAllEnemies?.();
      play.clearToastState?.();
      play.enemyManager.state = 'WAVE_BRIEFING';
      play.enemyManager.phase = 'WAVES';
      const shown = play.maybeShowCabinetWonder({
        debugForce: true,
        forceVariantId: 'aurora_crown',
        sector: 8,
        waveNumber: 3,
        hasUpcomingWave: true
      });
      const token = play.cabinetWonderOpportunity;
      window.__game.app?.ticker?.stop?.();
      play.destroy();
      return {
        shown,
        token: token ? {
          terminal: token.terminal,
          state: token.state,
          terminalReason: token.terminalReason,
          releaseCount: token.releaseCount,
          timersCleared: ['preludeTimer', 'transitionMonitorTimer', 'revealTimer', 'cleanupTimer']
            .every((key) => token[key] === null)
        } : null,
        opportunityCleared: play.cabinetWonderOpportunity === null,
        pendingCleared: play.pendingCabinetWonder === null,
        activeCleared: play.activeCabinetWonder === null,
        noAgencyActive: play.isCabinetWonderNoAgencyPresentationActive()
      };
    });
    lifecycle = { cancellation, afterStaleCallback, assetLateStarted, assetLate, destruction };
  }
  await context.close();
  return {
    variantId,
    viewport,
    reducedMotion,
    synchronous,
    progressionHold: {
      prelude: preludeProgressionHeld,
      active: activeProgressionHeld,
      completed: completedProgressionHeld
    },
    timedEffects: {
      before: synchronous.timedBefore,
      prelude: preludeTimedState,
      active: activeTimedState,
      completed: completedTimedState
    },
    enemyRelease: {
      before: synchronous.spawnBaseline,
      prelude: preludeSpawnState,
      active: activeSpawnState
    },
    prelude: preludeState.cabinetWonders,
    active: activeState.cabinetWonders,
    completed: completedState.cabinetWonders,
    experimentalIsolation,
    lifecycle,
    screenshot,
    pageErrors,
    consoleErrors
  };
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const report = { ok: false, baseUrl, outputDir, scenarios: [], failures: [] };
try {
  const allVariantIds = [
    'ghost_fleet_salute',
    'astral_leviathan_library',
    'celestial_crane_migration'
  ];
  const requestedVariantIds = new Set(
    String(process.env.CHECK_VARIANT_IDS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const variantIds = requestedVariantIds.size
    ? allVariantIds.filter((variantId) => requestedVariantIds.has(variantId))
    : allVariantIds;
  if (variantIds.length === 0) throw new Error(`No Cabinet Wonder variants matched CHECK_VARIANT_IDS=${[...requestedVariantIds].join(',')}`);
  for (const [index, variantId] of variantIds.entries()) {
    report.scenarios.push(await runVariant(
      browser,
      variantId,
      index % 3 === 1 ? { width: 1920, height: 1080 } : { width: 1280, height: 720 },
      variantId === 'astral_leviathan_library'
    ));
  }

  for (const scenario of report.scenarios) {
    const active = scenario.active;
    const prelude = scenario.prelude;
    const completed = scenario.completed;
    if (
      !scenario.synchronous.shown
      || scenario.synchronous.second
      || scenario.synchronous.scoreDelta !== 0
      || scenario.synchronous.runMode !== 'unranked'
      || scenario.synchronous.runModeReason !== 'debug_cabinet_wonder'
      || scenario.synchronous.isDebugRun !== true
      || scenario.synchronous.transitionActiveAtPreludeStart !== true
    ) {
      report.failures.push(`${scenario.variantId} force/one-per-sector/score-neutral mismatch: ${JSON.stringify(scenario.synchronous)}`);
    }
    if (
      prelude?.pending?.kind !== 'audio_prelude'
      || prelude?.pending?.preludeLeadMs !== 1500
      || prelude?.pending?.audioRevelationPlayed !== true
      || prelude?.active !== null
      || prelude?.shownCount !== 0
      || prelude?.noAgencyActive !== true
      || prelude?.opportunity?.state !== 'audio_prelude'
    ) {
      report.failures.push(`${scenario.variantId} sacred prelude mismatch: ${JSON.stringify(prelude)}`);
    }
    if (
      active?.availableVariants !== 60
      || active?.shownCount !== 1
      || active?.onePerRun !== false
      || active?.onePerSector !== true
      || active?.cadenceSectors !== 3
      || active?.scoreNeutral !== true
      || active?.gameplayNeutral !== true
      || active?.active?.id !== scenario.variantId
      || active?.active?.upperFieldSafe !== true
      || active?.active?.elementCount < 5
      || active?.active?.audioProfile !== 'wonder'
      || active?.active?.audioRevelationPlayed !== true
      || active?.active?.preludeLeadMs !== 1500
      || active?.active?.visualStartedAt - active?.active?.preludeStartedAt < 1400
      || active?.active?.visualStartedAt - active?.active?.preludeStartedAt > 2100
      || !Array.isArray(active?.active?.audioLayers)
      || !active.active.audioLayers.includes('elevenlabs_wonder_choir_prelude')
      || active?.active?.layer !== 'gameplay_background'
      || active?.active?.generatedArtReady !== true
      || active?.active?.visualLanguage !== 'cabinet_wonder_imagegen_v2'
      || active?.active?.proceduralAccentAlpha > 0.2
      || active?.active?.presentationTarget?.widthRatio !== 0.6
      || active?.active?.presentationTarget?.heightRatio !== 0.45
      || active?.overlayCount !== 1
      || active?.active?.reducedMotion !== scenario.reducedMotion
      || active?.noAgencyActive !== true
    ) {
      report.failures.push(`${scenario.variantId} active presentation mismatch: ${JSON.stringify(active)}`);
    }
    if (
      scenario.progressionHold?.prelude !== true
      || scenario.progressionHold?.active !== true
      || scenario.progressionHold?.completed !== false
    ) {
      report.failures.push(`${scenario.variantId} progression hold mismatch: ${JSON.stringify(scenario.progressionHold)}`);
    }
    if (
      completed?.active !== null
      || completed?.overlayCount !== 0
      || completed?.shownCount !== 1
      || completed?.last?.completed !== true
      || completed?.noAgencyActive !== false
      || completed?.lastTerminal?.state !== 'released'
      || completed?.lastTerminal?.releaseCount !== 1
      || completed?.lastTerminal?.progressionResumeCount !== 1
      || completed?.lastTerminal?.preludeOverlapMs < 1100
      || completed?.lastTerminal?.preludeOverlapMs > 1500
    ) {
      report.failures.push(`${scenario.variantId} cleanup mismatch: ${JSON.stringify({ completed, synchronous: scenario.synchronous })}`);
    }
    const timed = scenario.timedEffects;
    const atRelease = completed?.lastTerminal?.timedEffectAtRelease || {};
    const releasePickup = atRelease.pickupRemainingMs?.[0]?.remainingMs;
    if (
      !approximatelyEqual(timed.prelude.gameplayClockMs, timed.before.gameplayClockMs)
      || !approximatelyEqual(timed.active.gameplayClockMs, timed.before.gameplayClockMs)
      || !approximatelyEqual(atRelease.gameplayClockMs, timed.before.gameplayClockMs)
      || !approximatelyEqual(timed.prelude.scoreBoostTimerMs, timed.before.scoreBoostTimerMs)
      || !approximatelyEqual(timed.active.scoreBoostTimerMs, timed.before.scoreBoostTimerMs)
      || !approximatelyEqual(atRelease.scoreBoostTimerMs, timed.before.scoreBoostTimerMs)
      || !approximatelyEqual(timed.prelude.activePowerupRemainingMs, timed.before.activePowerupRemainingMs)
      || !approximatelyEqual(timed.active.activePowerupRemainingMs, timed.before.activePowerupRemainingMs)
      || !approximatelyEqual(atRelease.activePowerupRemainingMs, timed.before.activePowerupRemainingMs)
      || !approximatelyEqual(timed.prelude.pickupRemainingMs, timed.before.pickupRemainingMs)
      || !approximatelyEqual(timed.active.pickupRemainingMs, timed.before.pickupRemainingMs)
      || !approximatelyEqual(releasePickup, timed.before.pickupRemainingMs)
    ) {
      report.failures.push(`${scenario.variantId} timed effects aged during no-agency presentation: ${JSON.stringify({ timed, atRelease })}`);
    }
    const releases = scenario.enemyRelease;
    if (
      releases.prelude.totalEnemiesSpawned !== releases.before.totalEnemiesSpawned
      || releases.active.totalEnemiesSpawned !== releases.before.totalEnemiesSpawned
      || releases.prelude.currentWaveIndex !== releases.before.currentWaveIndex
      || releases.active.currentWaveIndex !== releases.before.currentWaveIndex
      || releases.prelude.activeEnemyCount !== 0
      || releases.active.activeEnemyCount !== 0
      || releases.prelude.hijackerActive
      || releases.active.hijackerActive
    ) {
      report.failures.push(`${scenario.variantId} enemy release occurred under Wonder: ${JSON.stringify(releases)}`);
    }
    if (scenario.pageErrors.length || scenario.consoleErrors.length) {
      report.failures.push(`${scenario.variantId} browser errors: ${[...scenario.pageErrors, ...scenario.consoleErrors].join('; ')}`);
    }
    if (
      scenario.experimentalIsolation.shown !== false
      || scenario.experimentalIsolation.noAgencyActive !== false
      || scenario.experimentalIsolation.opportunity !== false
    ) {
      report.failures.push(`${scenario.variantId} experimental mode entered Wonder hold: ${JSON.stringify(scenario.experimentalIsolation)}`);
    }
    if (scenario.lifecycle) {
      const { cancellation, afterStaleCallback, assetLateStarted, assetLate, destruction } = scenario.lifecycle;
      const input = cancellation.inputAfterEnter || {};
      if (
        cancellation.shown !== true
        || input.pressedKeys?.length !== 1
        || input.pressedKeys?.[0] !== 'KeyW'
        || !input.suppressedKeys?.includes('Space')
        || !input.suppressedKeys?.includes('KeyB')
        || input.touchFireActive
        || input.mouseFireActive
        || input.fireToggleLatched
        || input.specialFirePointerJustPressed
        || input.justPressed?.length
        || input.justPressedActions?.length
      ) {
        report.failures.push(`Wonder transient input barrier mismatch: ${JSON.stringify(cancellation)}`);
      }
      const expectedHijackerX = cancellation.managerGameWidth * 0.5 - 50;
      if (
        cancellation.selectionRandomCalls !== 3
        || !approximatelyEqual(cancellation.plan?.spawnX, expectedHijackerX)
        || cancellation.plan?.initialBeamDelayMs !== 2175
        || cancellation.deferred !== true
        || cancellation.beforeCancel?.hijackerActive
        || cancellation.beforeCancel?.deferredReleaseCount !== 1
        || cancellation.beforeCancel?.pendingPlan
        || cancellation.firstCancel !== true
        || cancellation.secondCancel !== false
        || cancellation.tokenAfterCancel?.terminal !== true
        || cancellation.tokenAfterCancel?.state !== 'cancelled'
        || cancellation.tokenAfterCancel?.releaseCount !== 1
        || cancellation.tokenAfterCancel?.timersCleared !== true
        || cancellation.terminal?.state !== 'cancelled'
        || cancellation.terminal?.reason !== 'runtime_cancel'
        || cancellation.terminal?.releaseCount !== 1
        || cancellation.terminal?.deferredReleaseCount !== 1
        || cancellation.releasedHijacker?.active !== true
        || !approximatelyEqual(cancellation.releasedHijacker?.x, expectedHijackerX)
        || !approximatelyEqual(cancellation.releasedHijacker?.x, cancellation.plan?.spawnX)
        || !approximatelyEqual(cancellation.releasedHijacker?.y, cancellation.plan?.spawnY)
        || Math.abs((cancellation.releasedHijacker?.initialBeamDelayMs || 0) - 2175) > 80
      ) {
        report.failures.push(`Wonder cancellation/Hijacker deferral mismatch: ${JSON.stringify(cancellation)}`);
      }
      if (
        afterStaleCallback.opportunity !== null
        || afterStaleCallback.pending !== null
        || afterStaleCallback.active !== null
        || afterStaleCallback.overlayCount !== 0
        || afterStaleCallback.noAgencyActive !== false
        || afterStaleCallback.terminal?.reason !== 'runtime_cancel'
        || afterStaleCallback.terminal?.releaseCount !== 1
      ) {
        report.failures.push(`Wonder stale callback revived cancelled presentation: ${JSON.stringify(afterStaleCallback)}`);
      }
      const assetSnapshot = assetLate.terminal?.timedEffectAtRelease || {};
      if (
        assetLateStarted.shown !== true
        || assetLate.opportunity !== null
        || assetLate.pending !== null
        || assetLate.active !== null
        || assetLate.noAgencyActive !== false
        || assetLate.terminal?.state !== 'cancelled'
        || assetLate.terminal?.reason !== 'asset_late'
        || assetLate.terminal?.releaseCount !== 1
        || !approximatelyEqual(assetSnapshot.gameplayClockMs, assetLateStarted.before?.gameplayClockMs)
        || !approximatelyEqual(assetSnapshot.scoreBoostTimerMs, assetLateStarted.before?.scoreBoostTimerMs)
      ) {
        report.failures.push(`Wonder asset-late cancellation mismatch: ${JSON.stringify({ assetLateStarted, assetLate })}`);
      }
      if (
        destruction.shown !== true
        || destruction.token?.terminal !== true
        || destruction.token?.state !== 'cancelled'
        || destruction.token?.terminalReason !== 'scene_destroy'
        || destruction.token?.releaseCount !== 1
        || destruction.token?.timersCleared !== true
        || destruction.opportunityCleared !== true
        || destruction.pendingCleared !== true
        || destruction.activeCleared !== true
        || destruction.noAgencyActive !== false
      ) {
        report.failures.push(`Wonder scene-destruction cleanup mismatch: ${JSON.stringify(destruction)}`);
      }
    }
  }

  report.ok = report.failures.length === 0;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) throw new Error(`[cabinet-wonders-runtime] ${report.failures.join('; ')}`);
  console.log(`[cabinet-wonders-runtime] PASS output=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
