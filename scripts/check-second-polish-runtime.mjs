import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4590));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/second-polish-runtime-${timestamp()}`);
const clearPattern = [0, 1, 9, 10, 99, 100, 999];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
  throw new Error(`No available second-polish runtime port starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startPreview() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview did not become ready at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function makeProgress() {
  const shipSpecificMilestones = {};
  for (let index = 0; index < 30; index += 1) {
    const id = `nova_ship_${String(index + 1).padStart(2, '0')}`;
    shipSpecificMilestones[id] = {
      runs: 12,
      clears: index === 29 ? 999 : clearPattern[index % clearPattern.length],
      bestSector: 60,
      bestScore: 420000,
      bestCombo: 88,
      bestBosses: 10,
      totalBosses: 48,
      lastRunAt: '2026-08-09T00:00:00.000Z'
    };
  }
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 25000,
    pilotRank: 20,
    highestPilotRank: 20,
    totalRuns: 64,
    bestScore: 420000,
    bestSector: 60,
    bestLevel: 60,
    bestRank: 20,
    runClears: 999,
    totalBossesDefeated: 72,
    totalWavesCleared: 360,
    unlockedShipIds: Array.from({ length: 30 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`),
    lastNewlyUnlockedShipIds: [],
    shipSpecificMilestones,
    updatedAt: '2026-08-09T00:00:00.000Z'
  };
}

async function seedPage(page, progress = null) {
  await page.addInitScript(({ seededProgress }) => {
    localStorage.clear();
    localStorage.setItem('burt_first_run_completed', 'true');
    localStorage.setItem('burt_voice_enabled', 'false');
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('burt.selectedShip.v1', 'nova-player-ship-30.png');
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 420000, bestRank: 20, bestLevel: 60 }));
    if (seededProgress) localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(seededProgress));
  }, { seededProgress: progress });
}

function observe(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}

async function screenshot(page, filename) {
  const file = path.join(outputDir, filename);
  await page.screenshot({ path: file, fullPage: false });
  const metadata = await sharp(file).metadata();
  const stats = await sharp(file).stats();
  assert.equal(metadata.width, page.viewportSize().width, `${filename} width mismatch`);
  assert.equal(metadata.height, page.viewportSize().height, `${filename} height mismatch`);
  assert(Number(stats.entropy || 0) > 1, `${filename} appears empty`);
  return file;
}

async function checkHangar(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = observe(page);
  await seedPage(page, makeProgress());
  try {
    await page.goto(`${baseUrl}/?offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
    await page.evaluate(async () => window.__game.showShipSelect());
    await page.waitForFunction(() => window.__game?.currentSceneName === 'shipSelect' && window.__game?.scenes?.shipSelect?.shipCards?.length === 30, null, { timeout: 30000 });
    await page.waitForTimeout(700);
    const state = await page.evaluate(() => {
      const scene = window.__game.scenes.shipSelect;
      const bounds = (node) => {
        const box = node?.getBounds?.();
        return box ? { x: box.x, y: box.y, width: box.width, height: box.height, right: box.x + box.width, bottom: box.y + box.height } : null;
      };
      const cards = scene.shipCards.map((card, index) => {
        const debug = card?.masteryBadge?.__debugMastery || null;
        const countNode = card?.masteryBadge?.children?.find((child) => child?.label === 'hangarShipMasteryClearsCount');
        const identityNode = card?.masteryBadge?.children?.find((child) => child?.label === 'hangarShipMasteryIdentity');
        return {
          index,
          shipId: scene.ships[index]?.id || null,
          debug: debug ? structuredClone(debug) : null,
          countBounds: bounds(countNode),
          identityBounds: bounds(identityNode)
        };
      });
      const keyboard = structuredClone(scene.getHangarInputPromptDebugState());
      scene.setHangarInputDevice('controller', 'runtime_gamepad_probe');
      const controller = structuredClone(scene.getHangarInputPromptDebugState());
      const canvas = scene.game.app.canvas || scene.game.app.view;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
      const pointer = structuredClone(scene.getHangarInputPromptDebugState());
      return {
        selectedIndex: scene.selectedIndex,
        cards,
        prompts: { keyboard, controller, pointer }
      };
    });
    assert.equal(state.cards.length, 30, 'Hangar did not create all 30 ship cards');
    for (const [index, card] of state.cards.entries()) {
      const shipNumber = Number(String(card.shipId || '').match(/(\d+)$/)?.[1]);
      const expectedClears = shipNumber === 30 ? 999 : clearPattern[(shipNumber - 1) % clearPattern.length];
      assert(Number.isFinite(shipNumber), `ship ${index + 1} has an unexpected id: ${card.shipId}`);
      assert(card.debug, `ship ${index + 1} has no mastery diagnostics`);
      assert.equal(card.debug.clears, expectedClears, `ship ${index + 1} clear count mismatch`);
      assert.equal(card.debug.renderedMedalCount, 3, `ship ${index + 1} lost a rendered mastery-medal slot`);
      assert.equal(card.debug.overlapFree, true, `ship ${index + 1} mastery regions overlap: ${JSON.stringify(card.debug)}`);
      assert.equal(card.debug.threeDigitCapacity, true, `ship ${index + 1} lacks three-digit capacity`);
      if (index === state.selectedIndex) {
        assert(card.countBounds && card.identityBounds && card.countBounds.right < card.identityBounds.x, `selected mastery count overlaps identity: ${JSON.stringify(card)}`);
      }
    }
    assert.equal(state.cards[state.selectedIndex].debug.clearCount, '999', '100+ visual proof did not select the 999-clear card');
    assert.equal(state.prompts.keyboard.device, 'keyboard');
    assert.match(state.prompts.keyboard.text, /ARROWS: SHIP.*ENTER: LAUNCH.*X: DETAILS/);
    assert.equal(state.prompts.controller.device, 'controller');
    assert.match(state.prompts.controller.text, /STICK: SHIP.*A: LAUNCH.*X: DETAILS.*B: BACK/);
    assert.equal(state.prompts.pointer.device, 'keyboard');
    assert.match(state.prompts.pointer.text, /ARROWS: SHIP/);
    const representativeShots = [];
    if (viewport.width === 1280 && viewport.height === 720) {
      for (const clearCount of clearPattern) {
        const representative = state.cards.find((card) => card.debug?.clears === clearCount);
        assert(representative, `missing representative Hangar hull for ${clearCount} clears`);
        await page.evaluate((index) => window.__game.scenes.shipSelect.navigateTo(index), representative.index);
        await page.waitForTimeout(260);
        representativeShots.push(await screenshot(
          page,
          clearCount === 999
            ? `hangar-mastery-999-${viewport.width}x${viewport.height}.png`
            : `hangar-mastery-${clearCount}-ship-${String(representative.shipId).replace('nova_ship_', '')}-${viewport.width}x${viewport.height}.png`
        ));
      }
    } else {
      representativeShots.push(await screenshot(page, `hangar-mastery-999-${viewport.width}x${viewport.height}.png`));
    }
    const promptShots = [];
    if (viewport.width === 1280 && viewport.height === 720) {
      await page.evaluate(() => window.__game.scenes.shipSelect.setHangarInputDevice('keyboard', 'runtime_keyboard_evidence'));
      await page.waitForTimeout(120);
      promptShots.push(await screenshot(page, 'hangar-footer-keyboard-1280x720.png'));
      await page.evaluate(() => window.__game.scenes.shipSelect.setHangarInputDevice('controller', 'runtime_controller_evidence'));
      await page.waitForTimeout(120);
      promptShots.push(await screenshot(page, 'hangar-footer-controller-1280x720.png'));
    }
    const shot = representativeShots.at(-1);
    assert.deepEqual(errors.pageErrors, [], `Hangar page errors: ${errors.pageErrors.join('; ')}`);
    assert.deepEqual(errors.consoleErrors, [], `Hangar console errors: ${errors.consoleErrors.join('; ')}`);
    return { viewport, shot, representativeShots, promptShots, state, errors };
  } finally {
    await page.close();
  }
}

async function prepareGameplay(browser, viewport = { width: 1280, height: 720 }) {
  const page = await browser.newPage({ viewport });
  const errors = observe(page);
  await seedPage(page);
  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.enemyManager, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.enemies?.some((enemy) => enemy?.kind === 'enemy' && enemy?.active !== false), null, { timeout: 90000 });
  return { page, errors };
}

async function checkCombatPresentation(browser) {
  const { page, errors } = await prepareGameplay(browser);
  try {
    const enemyVisuals = await page.evaluate(() => {
      const play = window.__game.scenes.play;
      play.game.app.ticker.stop();
      play.shipIntroToken = (Number(play.shipIntroToken) || 0) + 1;
      play.introActive = false;
      play.introComplete = true;
      play.firstRunOnboardingComplete = true;
      play.firstRunOnboardingUntil = 0;
      play.clearPendingEnemyStart?.();
      play.clearToastState?.();
      if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
      const enemy = play.enemyManager.enemies.find((entry) => entry?.kind === 'enemy' && entry?.active !== false);
      enemy.isRareChaosVisitor = false;
      enemy.rareChaosVisitorVariant = null;
      enemy.isAce = false;
      enemy.aceVariant = null;
      enemy.rivalWingDoctrine = null;
      enemy.middleShipProfile = null;
      enemy.isEliteMiddleShip = false;
      enemy.kind = 'enemy';
      enemy.dangerMidShipProfile = null;
      enemy.isElite = false;
      enemy.maxHealth = 1;
      enemy.health = 1;
      enemy.generatedProfile = { ...(enemy.generatedProfile || {}), lateMayhem: false, role: 'fast_scout', movementStyle: 'fastNeedle' };
      enemy.threatActionDefinition = { id: 'runtime_discrete_telegraph' };
      enemy.waitingForEntry = false;
      enemy.state = 'FORMATION';
      enemy.x = play.game.getWidth() * 0.5;
      enemy.y = play.game.getHeight() * 0.36;
      enemy.formationX = enemy.x;
      enemy.formationY = enemy.y;
      enemy.sprite.position.set(enemy.x, enemy.y);
      enemy.updateThreatFrame(Date.now());
      enemy.resetSpawnCue(Date.now() - 220);
      enemy.updateSpawnCue(Date.now());
      enemy.updateHealthBar();
      const standard = {
        threatFrame: structuredClone(enemy.threatFrameLayer?._debugThreatFrame || null),
        spawnCue: structuredClone(enemy.spawnCueLayer?._debugSpawnCue || null),
        healthBar: structuredClone(enemy.healthBar?._debugReadability || null)
      };
      enemy.isElite = true;
      enemy.maxHealth = 8;
      enemy.health = 8;
      enemy.updateThreatFrame(Date.now());
      enemy.updateHealthBar();
      const durable = {
        threatFrame: structuredClone(enemy.threatFrameLayer?._debugThreatFrame || null),
        healthBar: structuredClone(enemy.healthBar?._debugReadability || null)
      };
      enemy.isElite = false;
      enemy.maxHealth = 1;
      enemy.health = 1;
      enemy.updateThreatFrame(Date.now());
      enemy.updateHealthBar();
      enemy.resetSpawnCue(Date.now() - 220);
      enemy.updateSpawnCue(Date.now());
      play.game.app.renderer.render(play.game.app.stage);
      return { standard, durable };
    });
    assert.equal(enemyVisuals.standard.threatFrame.visible, false, `ordinary enemy retained persistent threat rings: ${JSON.stringify(enemyVisuals.standard)}`);
    assert.equal(enemyVisuals.standard.spawnCue.simplifiedStandard, true, `ordinary spawn cue was not simplified: ${JSON.stringify(enemyVisuals.standard.spawnCue)}`);
    assert.equal(enemyVisuals.standard.spawnCue.inboundChevronCount, 2, `ordinary spawn cue did not retain its restrained direction cue: ${JSON.stringify(enemyVisuals.standard.spawnCue)}`);
    assert.equal(enemyVisuals.standard.healthBar.visible, false, `full-health ordinary enemy retained a health bar: ${JSON.stringify(enemyVisuals.standard.healthBar)}`);
    assert.equal(enemyVisuals.durable.threatFrame.tier, 'durable', 'durable threat hierarchy was removed');
    assert.equal(enemyVisuals.durable.healthBar.visible, true, 'durable enemy health hierarchy was removed');
    const enemyShot = await screenshot(page, 'ordinary-enemy-restrained-signals-1280x720.png');

    const combatText = await page.evaluate(() => {
      const game = window.__game;
      const play = game.scenes.play;
      const player = play.player;
      game.app.ticker.start();
      play.debugInvincible = true;
      player.invulnerable = true;
      player.x = game.getWidth() * 0.5;
      player.y = game.getHeight() * 0.72;
      player.sprite.position.set(player.x, player.y);
      play.enemyManager.clearEnemies?.();
      play.enemyManager.spawning = false;
      play.bulletManager.enemyBullets = [];
      const manager = play.scorePopupManager;
      manager.clearVisuals({ preserveCombo: false });
      manager.setDenseCombatCompression(0.55);
      manager.setPersistentComboHudActive(true);
      manager.setProtectedLayout(game.getWidth(), game.getHeight(), player.x, player.y, player.radius || 12, false);
      manager.addScorePopup(player.x, player.y, 24, { type: 'nearMiss', text: 'NEAR MISS +24', major: true });
      manager.addScorePopup(44, 58, 30, { comboEligible: false });
      manager.addScorePopup(game.getWidth() * 0.58, game.getHeight() * 0.46, 12, { comboEligible: true });
      manager.addScorePopup(game.getWidth() * 0.58 + 8, game.getHeight() * 0.46 + 4, 13, { comboEligible: true });
      manager.addScorePopup(game.getWidth() * 0.58 + 12, game.getHeight() * 0.46 + 6, 14, { comboEligible: true });
      play.enemyManager.normalWavesTotal = 0;
      play.enemyManager.currentWaveIndex = 0;
      play.enemyManager.state = 'WAVE_ACTIVE';
      play.enemyManager.phase = 'WAVES';
      game.level = 4;
      play.hud.updateMissionStatus();
      const popups = manager.popups.map((popup) => ({
        type: popup.type,
        isCombo: popup.isCombo,
        sourceX: popup.sourceX,
        sourceY: popup.sourceY,
        x: popup.x,
        y: popup.y,
        frameWidth: popup.frameWidth,
        frameHeight: popup.frameHeight,
        protected: manager.isProtectedPosition(popup.x, popup.y, popup.frameWidth / 2, popup.frameHeight / 2)
      }));
      return {
        popups,
        comboCount: manager.comboCount,
        aggregatedPopupCount: manager.aggregatedPopupCount,
        layout: structuredClone(manager.getProtectedLayoutDebugState()),
        missionText: play.hud.missionText?.text || ''
      };
    });
    assert(combatText.popups.length >= 2, `combat text was unexpectedly empty: ${JSON.stringify(combatText)}`);
    assert(combatText.popups.every((popup) => popup.protected === false), `combat text entered a protected zone: ${JSON.stringify(combatText.popups)}`);
    assert.equal(combatText.comboCount, 3, 'combo tracking did not retain three kills');
    assert.equal(combatText.popups.some((popup) => popup.isCombo), false, 'persistent combo HUD duplicated a floating combo milestone');
    assert(combatText.aggregatedPopupCount >= 1, `dense nearby score events did not coalesce: ${JSON.stringify(combatText)}`);
    assert.equal(combatText.missionText, 'SECTOR 4 | HOSTILES 0 | THREATS 0');
    const combatTextShot = await screenshot(page, 'combat-text-protected-zones-1280x720.png');

    await page.evaluate(() => {
      const play = window.__game.scenes.play;
      play.game.app.ticker.stop();
      play.introActive = false;
      play.introComplete = true;
      play.firstRunOnboardingComplete = true;
      play.firstRunOnboardingUntil = 0;
      play.novaCommandTacticalAlertUntil = 0;
      play.clearPendingEnemyStart?.();
      play.enemyManager.state = 'WAVE_ACTIVE';
      play.enemyManager.phase = 'WAVES';
      play.enemyManager.normalWavesTotal = 5;
      play.enemyManager.currentWaveIndex = 0;
      play.enemyManager.bossSpawning = false;
      play.scorePopupManager.clearVisuals({ preserveCombo: true });
      play.clearToastState();
      play.shownCabinetLogIds.delete('first-boss-spawn');
      play.triggerCabinetLog('first-boss-spawn', { source: 'runtime_probe' }, { force: true });
      if (play.activeCornerToast) {
        play.activeCornerToast.visible = true;
        play.activeCornerToast.alpha = 1;
        play.activeCornerToast.scale?.set?.(1);
      }
      play.game.app.renderer.render(play.game.app.stage);
    });
    await page.waitForTimeout(120);
    const cabinet = await page.evaluate(() => {
      const play = window.__game.scenes.play;
      return {
        active: structuredClone(play.getToastDebugState().active.find((entry) => entry.type === 'cabinet_log') || null),
        archive: structuredClone(play.lastCabinetLog || null)
      };
    });
    assert.equal(cabinet.active?.slot, 'corner', `Cabinet Log did not use the compact corner lane: ${JSON.stringify(cabinet)}`);
    assert(cabinet.active?.duration <= 1600, `Cabinet combat toast held too long: ${JSON.stringify(cabinet.active)}`);
    assert.equal(String(cabinet.active?.message || '').split('\n').length, 2, `Cabinet combat toast was not a compact two-line read: ${JSON.stringify(cabinet.active)}`);
    assert.equal(cabinet.archive?.combatPresentation, 'compact_corner_toast');
    assert.equal(cabinet.archive?.fullTextArchived, true);
    assert(String(cabinet.archive?.line || '').length > String(cabinet.archive?.compactLine || '').length, 'Cabinet archive did not preserve more detail than the combat toast');
    const cabinetShot = await screenshot(page, 'cabinet-log-compact-toast-1280x720.png');
    await page.evaluate(() => window.__game?.app?.ticker?.start?.());

    assert.deepEqual(errors.pageErrors, [], `combat-presentation page errors: ${errors.pageErrors.join('; ')}`);
    assert.deepEqual(errors.consoleErrors, [], `combat-presentation console errors: ${errors.consoleErrors.join('; ')}`);
    return { enemyVisuals, enemyShot, combatText, combatTextShot, cabinet, cabinetShot, errors };
  } finally {
    await page.close();
  }
}

async function checkFatalFrame(browser) {
  const { page, errors } = await prepareGameplay(browser);
  try {
    await page.evaluate(async () => window.__game?.scenes?.play?.gameOverFinalTransmissionReady);
    const fatal = await page.evaluate(() => {
      const game = window.__game;
      const play = game.scenes.play;
      const player = play.player;
      game.app.ticker.stop();
      play.debugInvincible = false;
      player.resetPowerups?.();
      player.shieldActive = false;
      player.invulnerable = false;
      player.invulnerableTime = 0;
      player.active = true;
      player.sprite.visible = true;
      player.sprite.renderable = true;
      game.lives = 1;
      game.score = 777;
      play.clearToastState();
      play.scorePopupManager.clearVisuals({ preserveCombo: false });
      play.showToast('NEAR MISS +999', { slot: 'corner', type: 'nearMiss', priority: 1, duration: 4000 });
      play.scorePopupManager.addScorePopup(player.x, player.y, 999, { text: 'REWARD +999', major: true });
      play.deferredCollisionUiFeedback.toasts.push({ message: 'NEAR MISS REWARD', options: { type: 'nearMiss' } });
      play.achievementToastQueue.push({ id: 'fatal_frame_reward_probe' });
      play.enemyManager.clearEnemies?.();
      play.ambientBonusDrones = [];
      play.powerupManager.powerups = [];
      play.bulletManager.playerBullets = [];
      const fatalBullet = {
        x: player.x,
        y: player.y,
        radius: 6,
        active: true,
        nearMissed: false,
        sourceFireStyle: 'runtime_fatal_probe',
        __novaProjectileKind: 'enemy'
      };
      play.bulletManager.enemyBullets = [fatalBullet];
      play.checkCollisions();
      const toast = play.getToastDebugState();
      const result = {
        lives: game.lives,
        score: game.score,
        collision: structuredClone(play.collisionDiagnosticStats || null),
        barrier: structuredClone(play.getFatalEventBarrierDebugState()),
        bullet: { active: fatalBullet.active, nearMissed: fatalBullet.nearMissed },
        toast,
        scorePopupCount: play.scorePopupManager.popups.length + play.scorePopupManager.pendingPopups.length,
        achievementActive: Boolean(play.activeAchievementToast),
        achievementQueued: play.achievementToastQueue.length,
        player: {
          active: player.active,
          visible: player.sprite.visible,
          renderable: player.sprite.renderable
        },
        lifeLossSuppression: structuredClone(play.lastLifeLossNotificationSuppression || null),
        animation: structuredClone(play.gameOverAnimationDebug || null)
      };
      game.app.ticker.start();
      return result;
    });
    assert.equal(fatal.lives, 0);
    assert.equal(fatal.score, 777, 'fatal collision changed the locked score');
    assert.equal(fatal.collision.enemyBulletPlayerHits, 1);
    assert.equal(fatal.collision.enemyBulletPlayerNearMisses, 0, `fatal bullet also awarded a near miss: ${JSON.stringify(fatal.collision)}`);
    assert.equal(fatal.bullet.nearMissed, false, 'fatal bullet was marked as a near miss');
    assert.equal(fatal.barrier.active, true);
    assert.equal(fatal.barrier.cause.category, 'hostile_fire');
    assert.equal(fatal.player.active, false);
    assert.equal(fatal.player.visible, false);
    assert.equal(fatal.player.renderable, false);
    assert.equal(fatal.toast.active.length, 0, `reward/near-miss toast survived fatal frame: ${JSON.stringify(fatal.toast)}`);
    assert.equal(fatal.toast.queued.center + fatal.toast.queued.top + fatal.toast.queued.corner, 0, 'fatal frame left queued toasts');
    assert.equal(fatal.scorePopupCount, 0, 'fatal frame left floating reward text');
    assert.equal(fatal.achievementActive, false);
    assert.equal(fatal.achievementQueued, 0);
    assert((fatal.lifeLossSuppression?.deferredVisualsRemoved || 0) >= 1, `deferred fatal-frame reward was not removed: ${JSON.stringify(fatal.lifeLossSuppression)}`);
    assert(fatal.animation?.automaticTargetMs <= 3000 && fatal.animation?.skippedTargetMs <= 1500, `fatal timing budget missing: ${JSON.stringify(fatal.animation)}`);
    await page.waitForTimeout(1500);
    const shot = await screenshot(page, 'fatal-frame-barrier-1280x720.png');
    assert.deepEqual(errors.pageErrors, [], `fatal-frame page errors: ${errors.pageErrors.join('; ')}`);
    assert.deepEqual(errors.consoleErrors, [], `fatal-frame console errors: ${errors.consoleErrors.join('; ')}`);
    return { fatal, shot, errors };
  } finally {
    await page.close();
  }
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreview();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu', '--no-sandbox']
});

try {
  const report = {
    ok: true,
    baseUrl,
    outputDir,
    hangar: [
      await checkHangar(browser, { width: 1280, height: 720 }),
      await checkHangar(browser, { width: 1280, height: 800 }),
      await checkHangar(browser, { width: 1920, height: 1080 }),
      await checkHangar(browser, { width: 2560, height: 1440 }),
      await checkHangar(browser, { width: 3440, height: 1440 })
    ],
    combatPresentation: await checkCombatPresentation(browser),
    fatalFrame: await checkFatalFrame(browser)
  };
  report.evidenceScreenshots = [
    ...report.hangar.flatMap((entry) => [
      ...(entry.representativeShots || [entry.shot]),
      ...(entry.promptShots || [])
    ]),
    report.combatPresentation.enemyShot,
    report.combatPresentation.combatTextShot,
    report.combatPresentation.cabinetShot,
    report.fatalFrame.shot
  ].filter(Boolean);
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[second-polish-runtime] PASS screenshots=${report.evidenceScreenshots.length} report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
