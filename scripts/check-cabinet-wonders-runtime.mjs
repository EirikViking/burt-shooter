import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4548));
const baseUrl = process.env.CHECK_URL || ('http://' + host + ':' + port);
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || ('test-results/cabinet-wonders-' + timestamp()));
const supportedLocales = ['en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja'];
const visualVariants = [
  'ghost_fleet_salute',
  'astral_leviathan_library',
  'celestial_crane_migration',
  'aurora_crown'
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function approximatelyEqual(actual, expected, tolerance = 1.5) {
  return Math.abs((Number(actual) || 0) - (Number(expected) || 0)) <= tolerance;
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
  throw new Error('No available Cabinet Wonder port found starting at ' + startPort);
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
  const server = spawn(command, args.concat(['preview', '--host', host, '--port', String(port), '--strictPort']), {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write('[vite] ' + chunk));
  server.stderr.on('data', (chunk) => process.stderr.write('[vite] ' + chunk));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error('Vite preview did not become ready at ' + baseUrl);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function createReadyPage(browser, options = {}) {
  const viewport = options.viewport || { width: 1280, height: 720 };
  const locale = options.locale || 'en';
  const reducedMotion = options.reducedMotion === true;
  const context = await browser.newContext({
    viewport,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference'
  });
  await context.addInitScript({
    content: [
      'localStorage.setItem("novaSwarm.languagePreference.v1", ' + JSON.stringify(locale) + ');',
      'localStorage.setItem("nova_accessibility_reduced_motion", ' + JSON.stringify(reducedMotion ? '1' : '0') + ');'
    ].join('\n')
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(baseUrl + '?autostart=1&offlineLeaderboard=1', {
    waitUntil: 'domcontentloaded',
    timeout: 90000
  });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.introComplete === true, null, { timeout: 90000 });
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play?.completeFirstRunOnboarding?.('cabinet_wonder_runtime', { flushAchievements: false });
    if (play) play.firstRunOnboardingComplete = true;
  });
  return { context, page, pageErrors, consoleErrors, viewport, locale, reducedMotion };
}

async function runVisualScenario(browser, options) {
  const runtime = await createReadyPage(browser, options);
  const { context, page, pageErrors, consoleErrors, viewport, locale, reducedMotion } = runtime;
  const variantId = options.variantId;
  try {
    const synchronous = await page.evaluate(async (id) => {
      const game = window.__game;
      const play = game.scenes.play;
      const manager = play.enemyManager;
      play.clearCabinetWonder?.('runtime_setup');
      play.clearToastState?.();
      manager?.forceClearAllEnemies?.();
      if (manager) {
        manager.state = 'TEST_IDLE';
        manager.pendingWaveConfig = null;
        manager.pendingTransitionHijackerSpawn = null;
        manager.hijacker = null;
      }
      for (const bullet of play.bulletManager?.enemyBullets || []) {
        bullet.active = false;
        bullet.visible = false;
      }
      play.gameOverSequenceStarted = false;
      game.gameOverTransitionPending = false;
      play.introActive = false;
      play.clearPendingEnemyStart?.();
      play.pendingEnemyStartTimeout = null;
      play.isPaused = false;
      const artReady = await play.prewarmCabinetWonderVariant(id, 'runtime_visual');
      play.showWaveBonusEffect?.(500, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 3/5' });
      play.processToastQueue?.();
      const input = play.inputManager;
      input.keys.KeyD = true;
      input.keys.Space = true;
      input.touchFireActive = true;
      input.mouseFireActive = true;
      input.fireToggleLatched = true;
      input.specialFirePointerJustPressed = true;
      const inputBefore = input.getTransientDebugState();
      const scoreBefore = game.score;
      const transitionActive = play.hasAuthoritativeTransitionPresentation?.() === true;
      const shown = play.maybeShowCabinetWonder({
        debugForce: true,
        forceVariantId: id,
        sector: 4,
        waveNumber: 3,
        hasUpcomingWave: true
      });
      const inputAfter = input.getTransientDebugState();
      const second = play.maybeShowCabinetWonder({
        debugForce: true,
        forceVariantId: 'aurora_crown',
        sector: 4,
        waveNumber: 3,
        hasUpcomingWave: true
      });
      return {
        shown,
        artReady,
        second,
        scoreDelta: game.score - scoreBefore,
        transitionActive,
        inputBefore,
        inputAfter,
        debug: play.getCabinetWonderDebugState(),
        language: JSON.parse(window.render_game_to_text()).language
      };
    }, variantId);

    if (!synchronous.shown) {
      throw new Error(locale + ' Wonder did not enter the collision-free presentation lane: ' + JSON.stringify(synchronous.debug));
    }

    await page.waitForFunction((id) => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.cabinetWonders?.active?.id === id
        && state.cabinetWonders?.active?.visualStartedAt;
    }, variantId, { timeout: 5000 });
    await page.waitForTimeout(reducedMotion ? 140 : 240);

    const active = await page.evaluate(() => {
      const play = window.__game.scenes.play;
      const current = play.activeCabinetWonder;
      const root = current?.root;
      const nodes = [];
      const visit = (node) => {
        if (!node) return;
        nodes.push(node);
        for (const child of node.children || []) visit(child);
      };
      visit(root);
      const art = nodes.find((node) => String(node?.label || '').startsWith('cabinet_wonder_imagegen_'));
      const projectileVisuals = (play.gameContainer?.children || []).filter((node) => node?.__novaManagedProjectile === true);
      const maxProjectileZIndex = projectileVisuals.reduce((max, node) => Math.max(max, Number(node.zIndex) || 0), 0);
      const canvasRect = window.__game?.app?.canvas?.getBoundingClientRect?.()
        || window.__app?.canvas?.getBoundingClientRect?.()
        || { width: window.innerWidth, height: window.innerHeight };
      return {
        debug: play.getCabinetWonderDebugState(),
        logicalViewport: {
          width: Number(play.gameplayGame?.getWidth?.()) || Number(window.__game?.getWidth?.()) || 1920,
          height: Number(play.gameplayGame?.getHeight?.()) || Number(window.__game?.getHeight?.()) || 1080
        },
        renderedViewport: {
          width: Number(canvasRect.width) || window.innerWidth,
          height: Number(canvasRect.height) || window.innerHeight
        },
        alpha: Number(root?.alpha) || 0,
        scaleX: Number(root?.scale?.x) || 0,
        scaleY: Number(root?.scale?.y) || 0,
        zIndex: root?.zIndex,
        maxProjectileZIndex,
        visualOccludesProjectiles: Number(root?.zIndex) > maxProjectileZIndex,
        eventMode: root?.eventMode,
        interactive: Boolean(root?.interactive),
        scanVisible: Boolean(current?.scanSweep?.visible),
        maskCount: nodes.filter((node) => String(node?.label || '').includes('_mask_')).length,
        generatedArtBlendMode: art ? String(art.blendMode) : null,
        visibleTexts: nodes.map((node) => node?.text).filter((value) => typeof value === 'string' && value.trim())
      };
    });

    const screenshot = path.join(
      outputDir,
      'wonder-' + locale + '-' + viewport.width + 'x' + viewport.height + (reducedMotion ? '-reduced' : '') + '.png'
    );
    await page.screenshot({ path: screenshot, fullPage: false });

    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.cabinetWonders?.active === null && state.cabinetWonders?.lastTerminal;
    }, null, { timeout: 5000 });
    const completed = await page.evaluate(() => {
      const game = window.__game;
      const play = game.scenes.play;
      const completedState = play.getCabinetWonderDebugState();
      game.lateGameExperiment = { active: true, scenario: 'standard', metrics: {} };
      const experimentShown = play.maybeShowCabinetWonder({
        debugForce: true,
        forceVariantId: 'aurora_crown',
        sector: 7,
        waveNumber: 3,
        hasUpcomingWave: true
      });
      game.lateGameExperiment = null;
      play.gameOverSequenceStarted = true;
      const gameOverShown = play.maybeShowCabinetWonder({
        debugForce: true,
        forceVariantId: 'aurora_crown',
        sector: 8,
        waveNumber: 3,
        hasUpcomingWave: true
      });
      play.gameOverSequenceStarted = false;
      return { completedState, experimentShown, gameOverShown };
    });

    return {
      variantId,
      viewport,
      locale,
      reducedMotion,
      synchronous,
      active,
      completed,
      screenshot,
      pageErrors,
      consoleErrors
    };
  } finally {
    await context.close();
  }
}

async function runFixedDeltaScenario(browser, withWonder) {
  const runtime = await createReadyPage(browser, {
    viewport: { width: 1280, height: 720 },
    locale: 'en',
    reducedMotion: false
  });
  const { context, page, pageErrors, consoleErrors } = runtime;
  try {
    const result = await page.evaluate(async (showWonder) => {
      const game = window.__game;
      const play = game.scenes.play;
      const manager = play.enemyManager;
      game.app?.ticker?.stop?.();
      play.clearCabinetWonder?.('fixed_delta_setup');
      play.clearToastState?.();
      manager.forceClearAllEnemies?.();
      manager.hijacker = null;
      manager.pendingTransitionHijackerSpawn = null;
      play.activeRankUpPresentation = null;
      play.activeTacticalFusionUnlock = null;
      play.pendingRankUpPresentation = null;
      play.activeWaveBonusEffect = null;
      play.activeBossIntroCard = null;
      play.activeCenterToast = null;
      play.activeTopToast = null;
      play.tacticalDraft = null;
      play.overrunMilestoneInterlude = null;
      play.gameOverInterlude = null;
      play.gameOverSequenceStarted = false;
      game.gameOverTransitionPending = false;
      play.introActive = false;
      play.clearPendingEnemyStart?.();
      play.pendingEnemyStartTimeout = null;
      play.isPaused = false;
      play.freezeTimerMs = 0;
      game.lives = Math.max(1, Number(game.lives) || 3);
      if (showWonder) {
        await Promise.all([
          play.prewarmCabinetWonderVariant('ghost_fleet_salute', 'runtime_fixed_delta'),
          play.prewarmCabinetWonderVariant('astral_leviathan_library', 'runtime_fixed_delta'),
          play.prewarmCabinetWonderVariant('celestial_crane_migration', 'runtime_fixed_delta')
        ]);
      }

      let fakeNow = Date.now();
      Date.now = () => fakeNow;
      const counts = { player: 0, bullets: 0, enemies: 0, powerups: 0 };
      const wrapUpdate = (object, key) => {
        const original = object?.update?.bind(object);
        if (!original) return;
        object.update = (...args) => {
          counts[key] += 1;
          return original(...args);
        };
      };
      wrapUpdate(play.player, 'player');
      wrapUpdate(play.bulletManager, 'bullets');
      wrapUpdate(manager, 'enemies');
      wrapUpdate(play.powerupManager, 'powerups');

      const input = play.inputManager;
      input.keys.KeyD = true;
      input.keys.Space = true;
      input.touchFireActive = true;
      input.mouseFireActive = true;
      input.fireToggleLatched = true;
      input.specialFirePointerJustPressed = true;
      const inputBefore = input.getTransientDebugState();
      play.player.applyPowerup('rapid_fire');
      play.applyScoreMultiplier(2, 12000, 'cabinet_wonder_fixed_delta');
      play.clearToastState?.();
      const pickup = play.powerupManager.spawnSpecific(
        48,
        48,
        'damage_up',
        { source: 'cabinet_wonder_fixed_delta', spawnKey: 'cabinet-wonder-fixed-delta' }
      );
      const startClock = play.getGameplayClockMs();
      const before = {
        gameplayClockMs: startClock,
        scoreBoostTimerMs: play.scoreBoostTimer,
        activePowerupRemainingMs: play.player.getActivePowerupRemainingMs(startClock),
        pickupRemainingMs: pickup?.getLifetimeRemainingMs?.() || 0,
        playerX: play.player.x,
        playerY: play.player.y
      };

      let frame = 0;
      let waveReleaseTick = null;
      let wonderAtWaveRelease = null;
      let waveDismissalReason = null;
      manager.state = 'WAVE_BRIEFING';
      manager.pendingWaveConfig = { runtimeProbe: true };
      manager.waveBriefingTimer = 0;
      manager.waveBriefingAnnounced = true;
      manager.spawnWave = () => {
        waveReleaseTick = frame;
        wonderAtWaveRelease = Boolean(play.activeCabinetWonder);
        waveDismissalReason = play.lastCabinetWonderTerminalState?.reason || null;
        manager.state = 'TEST_IDLE';
      };
      const wonderShown = showWonder ? play.maybeShowCabinetWonder({
        debugForce: true,
        forceVariantId: 'ghost_fleet_salute',
        sector: 4,
        waveNumber: 3,
        hasUpcomingWave: true
      }) : false;
      const inputAfterShow = input.getTransientDebugState();

      for (frame = 1; frame <= 60; frame += 1) {
        fakeNow += 16.67;
        game.update(1);
        play.activeCabinetWonder?.ticker?.({ deltaTime: 1 });
      }
      const endClock = play.getGameplayClockMs();
      const after = {
        gameplayClockMs: endClock,
        scoreBoostTimerMs: play.scoreBoostTimer,
        activePowerupRemainingMs: play.player.getActivePowerupRemainingMs(endClock),
        pickupRemainingMs: pickup?.getLifetimeRemainingMs?.() || 0,
        playerX: play.player.x,
        playerY: play.player.y
      };

      play.clearCabinetWonder?.('boss_probe_setup');
      manager.forceClearAllEnemies?.();
      manager.hijacker = null;
      manager.state = 'BOSS_GATE';
      manager.boss = null;
      manager.bossSpawning = false;
      manager.bossGateTimer = 100000;
      manager.bossGateTauntDelayResolved = true;
      manager.bossGateTauntDelayMs = 0;
      manager.bossGateTauntShown = true;
      let bossReleaseTick = null;
      let wonderAtBossRelease = null;
      let bossDismissalReason = null;
      manager.spawnBoss = () => {
        bossReleaseTick = frame;
        wonderAtBossRelease = Boolean(play.activeCabinetWonder);
        bossDismissalReason = play.lastCabinetWonderTerminalState?.reason || null;
        return Promise.resolve();
      };
      const bossWonderShown = showWonder ? play.maybeShowCabinetWonder({
        debugForce: true,
        forceVariantId: 'astral_leviathan_library',
        sector: 5,
        waveNumber: 5,
        hasUpcomingWave: false
      }) : false;
      frame += 1;
      fakeNow += 16.67;
      game.update(1);
      play.activeCabinetWonder?.ticker?.({ deltaTime: 1 });
      await Promise.resolve();

      let hijacker = null;
      let fallback = null;
      if (showWonder) {
        play.clearCabinetWonder?.('hijacker_probe_setup');
        manager.forceClearAllEnemies?.();
        manager.state = 'TEST_IDLE';
        manager.boss = null;
        manager.bossSpawning = false;
        manager.hijacker = null;
        const hijackerWonderShown = play.maybeShowCabinetWonder({
          debugForce: true,
          forceVariantId: 'celestial_crane_migration',
          sector: 6,
          waveNumber: 3,
          hasUpcomingWave: true
        });
        let spawnCalls = 0;
        manager.pendingTransitionHijackerSpawn = {
          level: manager.level,
          spawnX: 321,
          spawnY: 123,
          initialBeamDelayMs: 2175
        };
        manager.spawnHijacker = (plan) => {
          spawnCalls += 1;
          manager.hijacker = { active: true, visible: true, x: plan.spawnX, y: plan.spawnY };
        };
        const released = manager.releasePendingTransitionHijackerSpawn();
        hijacker = {
          wonderShown: hijackerWonderShown,
          released,
          spawnCalls,
          pendingCleared: manager.pendingTransitionHijackerSpawn === null,
          active: Boolean(manager.hijacker?.active),
          wonderCleared: play.activeCabinetWonder === null,
          dismissalReason: play.lastCabinetWonderTerminalState?.reason || null
        };

        manager.hijacker = null;
        const missingVariant = {
          id: 'runtime_missing_asset',
          title: 'UNTRANSLATED INTERNAL TEST TITLE',
          signalClass: 'runtime_probe',
          art: 'missing-runtime-art',
          palette: [0x65e8ff, 0xff4fd8, 0xffd166]
        };
        const fallbackShown = play.beginCabinetWonderOpportunity({
          variant: missingVariant,
          sector: 9,
          waveNumber: 3,
          hasUpcomingWave: true,
          reason: 'runtime_missing_asset'
        });
        const fallbackActive = play.getCabinetWonderDebugState();
        const staleTicker = play.activeCabinetWonder?.ticker;
        const firstClear = play.clearCabinetWonder('runtime_cancel');
        const secondClear = play.clearCabinetWonder('runtime_cancel_again');
        staleTicker?.({ deltaTime: 120 });
        fallback = {
          shown: fallbackShown,
          active: fallbackActive,
          firstClear,
          secondClear,
          afterStaleCallback: play.getCabinetWonderDebugState()
        };
      }

      return {
        withWonder: showWonder,
        wonderShown,
        bossWonderShown,
        inputBefore,
        inputAfterShow,
        before,
        after,
        counts,
        waveReleaseTick,
        wonderAtWaveRelease,
        waveDismissalReason,
        bossReleaseTick,
        wonderAtBossRelease,
        bossDismissalReason,
        hijacker,
        fallback
      };
    }, withWonder);
    return { ...result, pageErrors, consoleErrors };
  } finally {
    await context.close();
  }
}

async function runSceneDestructionScenario(browser) {
  const runtime = await createReadyPage(browser, {
    viewport: { width: 1280, height: 720 },
    locale: 'en',
    reducedMotion: false
  });
  const { context, page, pageErrors, consoleErrors } = runtime;
  try {
    const result = await page.evaluate(async () => {
      const game = window.__game;
      const play = game.scenes.play;
      play.clearCabinetWonder?.('destruction_setup');
      play.clearToastState?.();
      play.enemyManager?.forceClearAllEnemies?.();
      for (const bullet of play.bulletManager?.enemyBullets || []) {
        bullet.active = false;
        bullet.visible = false;
      }
      play.enemyManager.boss = null;
      play.enemyManager.hijacker = null;
      play.enemyManager.state = 'TEST_IDLE';
      play.introActive = false;
      play.clearPendingEnemyStart?.();
      play.pendingEnemyStartTimeout = null;
      const artReady = await play.prewarmCabinetWonderVariant('ghost_fleet_salute', 'runtime_scene_destruction');
      const shown = play.maybeShowCabinetWonder({
        debugForce: true,
        forceVariantId: 'ghost_fleet_salute',
        sector: 10,
        waveNumber: 3,
        hasUpcomingWave: true
      });
      const token = play.cabinetWonderOpportunity;
      game.app?.ticker?.stop?.();
      play.destroy();
      return {
        shown,
        artReady,
        tokenState: token?.state,
        tokenReason: token?.terminalReason,
        tokenTerminal: token?.terminal,
        releaseCount: token?.releaseCount,
        activeCleared: play.activeCabinetWonder === null,
        opportunityCleared: play.cabinetWonderOpportunity === null
      };
    });
    return { ...result, pageErrors, consoleErrors };
  } finally {
    await context.close();
  }
}

function validateVisualScenario(scenario, failures) {
  const sync = scenario.synchronous;
  const active = scenario.active;
  const debug = active.debug;
  const completed = scenario.completed.completedState;
  const bounds = debug?.active?.authoredBounds || {};
  const scaleX = active.renderedViewport.width / active.logicalViewport.width;
  const scaleY = active.renderedViewport.height / active.logicalViewport.height;
  const renderedBounds = {
    x: bounds.x * scaleX,
    y: bounds.y * scaleY,
    width: bounds.width * scaleX,
    height: bounds.height * scaleY
  };
  const maxWidth = Math.min(active.renderedViewport.width * 0.4416, 773 * scaleX);
  const maxHeight = Math.min(active.renderedViewport.height * 0.3312, 331 * scaleY);
  const reservedBounds = debug?.active?.reservedTransitionBounds || [];
  const overlapFindings = reservedBounds.filter((reserved) => (
    bounds.x < reserved.x + reserved.width + 15.5
    && bounds.x + bounds.width > reserved.x - 15.5
    && bounds.y < reserved.y + reserved.height + 15.5
    && bounds.y + bounds.height > reserved.y - 15.5
  ));
  if (scenario.variantId === 'nebula_seahorse_caravan') {
    const safe = debug?.active?.artSafeBounds;
    const rendered = debug?.active?.artRenderedBounds;
    const subjectFits = safe && rendered
      && rendered.x >= safe.x - 0.5
      && rendered.y >= safe.y - 0.5
      && rendered.x + rendered.width <= safe.x + safe.width + 0.5
      && rendered.y + rendered.height <= safe.y + safe.height + 0.5;
    if (debug?.active?.artFitMode !== 'subject_contain' || !subjectFits) {
      failures.push('Seahorse Caravan subject-fit mismatch: ' + JSON.stringify({ safe, rendered, mode: debug?.active?.artFitMode }));
    }
  }
  if (!sync.artReady || !sync.shown || sync.second || sync.scoreDelta !== 0 || !sync.transitionActive) {
    failures.push(scenario.locale + ' synchronous entry mismatch: ' + JSON.stringify(sync));
  }
  if (JSON.stringify(sync.inputBefore) !== JSON.stringify(sync.inputAfter)) {
    failures.push(scenario.locale + ' input was reset on Wonder entry: ' + JSON.stringify(sync));
  }
  if (sync.language?.current !== scenario.locale) {
    failures.push(scenario.locale + ' locale did not initialize: ' + JSON.stringify(sync.language));
  }
  if (
    sync.debug?.blocking !== false
    || sync.debug?.lifecycleState !== 'revealing'
    || sync.debug?.active?.blocking !== false
    || sync.debug?.overlayCount !== 1
  ) {
    failures.push(scenario.locale + ' immediate lifecycle mismatch: ' + JSON.stringify(sync.debug));
  }
  if (
    debug?.availableVariants !== 60
    || debug?.onePerSector !== true
    || debug?.cadenceSectors !== 3
    || debug?.scoreNeutral !== true
    || debug?.gameplayNeutral !== true
    || debug?.blocking !== false
    || debug?.active?.id !== scenario.variantId
    || debug?.active?.blocking !== false
    || debug?.active?.playerLaneSafe !== true
    || debug?.active?.layer !== 'gameplay_cameo_overlay'
    || debug?.active?.occludesGameplayWithinFrame !== true
    || debug?.active?.assetSource !== 'authored_art'
    || debug?.active?.generatedArtReady !== true
    || debug?.active?.visualLanguage !== 'cabinet_wonder_cosmic_cameo_authored_art'
    || debug?.active?.decorativeAccentAlpha > 0.1
    || debug?.active?.presentationTarget?.widthRatio !== 0.4416
    || debug?.active?.presentationTarget?.heightRatio !== 0.3312
    || debug?.active?.presentationTarget?.maxWidth !== 773
    || debug?.active?.presentationTarget?.maxHeight !== 331
    || debug?.active?.presentationTarget?.centerYRatio !== 0.3
    || debug?.active?.presentationTarget?.uiGap !== 16
    || debug?.active?.presentationTarget?.playerLaneTopRatio !== 0.65
    || debug?.active?.noOverlap !== true
    || overlapFindings.length > 0
    || debug?.active?.audioProfile !== 'wonder_revelation'
    || debug?.active?.audioLayers?.length !== 1
    || debug?.active?.audioLayers?.[0] !== 'wonder_revelation'
    || debug?.overlayCount !== 1
    || debug?.active?.reducedMotion !== scenario.reducedMotion
    || !debug?.active?.caption
    || debug.active.caption.includes('UNTRANSLATED INTERNAL TEST TITLE')
    || renderedBounds.width > maxWidth + 1
    || renderedBounds.height > maxHeight + 1
    || renderedBounds.y + renderedBounds.height > active.renderedViewport.height * 0.65 + 1
    || Math.abs((renderedBounds.x + renderedBounds.width * 0.5) - active.renderedViewport.width * 0.5) > 1
  ) {
    failures.push(scenario.locale + ' framed cameo mismatch: ' + JSON.stringify(active));
  }
  if (
    active.alpha < 0.95
    || active.zIndex !== 200
    || active.visualOccludesProjectiles !== true
    || active.eventMode !== 'none'
    || active.interactive
    || active.maskCount < 1
    || (debug?.active?.generatedArtReady && !['normal', '0'].includes(active.generatedArtBlendMode))
    || (scenario.reducedMotion && (active.scanVisible || !approximatelyEqual(active.scaleX, 1, 0.001)))
    || (!scenario.reducedMotion && (!active.scanVisible || active.scaleX < 0.985 || active.scaleX > 1.001))
  ) {
    failures.push(scenario.locale + ' render/layer mismatch: ' + JSON.stringify(active));
  }
  const expectedDuration = scenario.reducedMotion ? 1800 : 2140;
  if (debug?.active?.durationMs !== expectedDuration) {
    failures.push(scenario.locale + ' timing mismatch: ' + JSON.stringify(debug?.active));
  }
  if (
    completed?.active !== null
    || completed?.overlayCount !== 0
    || completed?.blocking !== false
    || completed?.lifecycleState !== 'idle'
    || completed?.lastTerminal?.state !== 'complete'
    || completed?.lastTerminal?.reason !== 'complete'
    || completed?.lastTerminal?.releaseCount !== 1
    || completed?.lastTerminal?.blocking !== false
    || scenario.completed.experimentShown
    || scenario.completed.gameOverShown
  ) {
    failures.push(scenario.locale + ' completion/unsafe skip mismatch: ' + JSON.stringify(scenario.completed));
  }
  if (scenario.pageErrors.length || scenario.consoleErrors.length) {
    failures.push(scenario.locale + ' browser errors: ' + scenario.pageErrors.concat(scenario.consoleErrors).join('; '));
  }
}

function validateFixedDelta(control, wonder, failures) {
  const comparableFields = [
    'gameplayClockMs',
    'scoreBoostTimerMs',
    'activePowerupRemainingMs',
    'pickupRemainingMs',
    'playerX',
    'playerY'
  ];
  for (const field of comparableFields) {
    const controlDelta = Number(control.after[field]) - Number(control.before[field]);
    const wonderDelta = Number(wonder.after[field]) - Number(wonder.before[field]);
    if (!approximatelyEqual(controlDelta, wonderDelta, field.includes('player') ? 0.1 : 2)) {
      failures.push('fixed-delta ' + field + ' diverged: ' + JSON.stringify({ controlDelta, wonderDelta }));
    }
  }
  if (JSON.stringify(control.counts) !== JSON.stringify(wonder.counts)) {
    failures.push('simulation update counts diverged: ' + JSON.stringify({ control: control.counts, wonder: wonder.counts }));
  }
  if (
    control.waveReleaseTick === null
    || Math.abs(control.waveReleaseTick - wonder.waveReleaseTick) > 1
    || wonder.wonderAtWaveRelease !== false
    || wonder.waveDismissalReason !== 'wave_release'
  ) {
    failures.push('wave release timing/dismissal mismatch: ' + JSON.stringify({ control, wonder }));
  }
  if (
    control.bossReleaseTick === null
    || Math.abs(control.bossReleaseTick - wonder.bossReleaseTick) > 1
    || wonder.wonderAtBossRelease !== false
    || wonder.bossDismissalReason !== 'boss_release'
  ) {
    failures.push('boss release timing/dismissal mismatch: ' + JSON.stringify({ control, wonder }));
  }
  if (
    !wonder.wonderShown
    || !wonder.bossWonderShown
    || JSON.stringify(wonder.inputBefore) !== JSON.stringify(wonder.inputAfterShow)
  ) {
    failures.push('fixed-delta Wonder entry/input mismatch: ' + JSON.stringify(wonder));
  }
  const hijacker = wonder.hijacker;
  if (
    !hijacker?.wonderShown
    || hijacker.released !== true
    || hijacker.spawnCalls !== 1
    || !hijacker.pendingCleared
    || !hijacker.active
    || !hijacker.wonderCleared
    || hijacker.dismissalReason !== 'hijacker_release'
  ) {
    failures.push('Hijacker immediate release mismatch: ' + JSON.stringify(hijacker));
  }
  const fallback = wonder.fallback;
  if (
    fallback?.shown !== false
    || fallback.active?.active !== null
    || fallback.active?.opportunity !== null
    || fallback.active?.overlayCount !== 0
    || fallback.active?.lastTerminal?.reason !== 'asset_not_ready'
    || fallback.active?.lastTerminal?.assetsReady !== false
    || fallback.firstClear !== false
    || fallback.secondClear !== false
    || fallback.afterStaleCallback?.active !== null
    || fallback.afterStaleCallback?.overlayCount !== 0
    || fallback.afterStaleCallback?.lastTerminal?.reason !== 'asset_not_ready'
  ) {
    failures.push('missing-art skip/idempotent cleanup mismatch: ' + JSON.stringify(fallback));
  }
  for (const scenario of [control, wonder]) {
    if (scenario.pageErrors.length || scenario.consoleErrors.length) {
      failures.push('fixed-delta browser errors: ' + scenario.pageErrors.concat(scenario.consoleErrors).join('; '));
    }
  }
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const report = {
  ok: false,
  baseUrl,
  outputDir,
  visuals: [],
  fixedDelta: null,
  sceneDestruction: null,
  failures: []
};

try {
  for (const [index, locale] of supportedLocales.entries()) {
    report.visuals.push(await runVisualScenario(browser, {
      locale,
      variantId: visualVariants[index % visualVariants.length],
      viewport: index % 2 === 0 ? { width: 1920, height: 1080 } : { width: 1280, height: 720 },
      reducedMotion: locale === 'ja'
    }));
  }
  report.visuals.push(await runVisualScenario(browser, {
    locale: 'en',
    variantId: 'nebula_seahorse_caravan',
    viewport: { width: 1920, height: 1080 },
    reducedMotion: false
  }));
  const control = await runFixedDeltaScenario(browser, false);
  const wonder = await runFixedDeltaScenario(browser, true);
  report.fixedDelta = { control, wonder };
  report.sceneDestruction = await runSceneDestructionScenario(browser);

  for (const scenario of report.visuals) validateVisualScenario(scenario, report.failures);
  validateFixedDelta(control, wonder, report.failures);
  const destruction = report.sceneDestruction;
  if (
    !destruction.artReady
    || !destruction.shown
    || destruction.tokenState !== 'cancelled'
    || destruction.tokenReason !== 'scene_destroy'
    || destruction.tokenTerminal !== true
    || destruction.releaseCount !== 1
    || !destruction.activeCleared
    || !destruction.opportunityCleared
    || destruction.pageErrors.length
    || destruction.consoleErrors.length
  ) {
    report.failures.push('scene destruction cleanup mismatch: ' + JSON.stringify(destruction));
  }

  report.ok = report.failures.length === 0;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (!report.ok) {
    throw new Error('[cabinet-wonders-runtime] ' + report.failures.join('; '));
  }
  console.log('[cabinet-wonders-runtime] PASS output=' + outputDir);
} finally {
  await browser.close();
  if (server) server.kill();
}
