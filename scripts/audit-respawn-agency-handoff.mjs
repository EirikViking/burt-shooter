import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(4496);
const baseUrl = `http://${host}:${port}`;
const agencyExitMock = process.env.NOVA_RESPAWN_AGENCY_EXIT_MOCK === '1';
const quickReadMock = process.env.NOVA_RESPAWN_QUICK_READ_MOCK === '1';
const productionQuickRead = !agencyExitMock && !quickReadMock;
const outputDir = path.resolve(`test-results/respawn-agency-handoff${agencyExitMock ? '-agency-exit-mock' : quickReadMock ? '-quick-read-mock' : ''}-${timestamp()}`);
const layouts = [
  { width: 1280, height: 720 },
  { width: 960, height: 640 }
];
const inputs = [
  { id: 'keyboard', reducedMotion: false },
  { id: 'controller', reducedMotion: false },
  { id: 'keyboard-reduced-motion', reducedMotion: true }
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findAvailablePort(start) {
  for (let candidate = start; candidate < start + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No respawn-audit port available from ${start}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function waitForServer() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    try {
      if ((await fetch(baseUrl)).ok) return server;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error('Respawn-audit Vite server did not start');
}

function overlapArea(a, b) {
  if (!a || !b) return 0;
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

async function capture(page, scenarioDir, name, { resume = false } = {}) {
  const target = path.join(scenarioDir, `${name}.png`);
  await page.evaluate(() => {
    window.__app?.ticker?.stop?.();
    window.__app?.render?.();
  });
  await page.screenshot({ path: target, fullPage: false });
  if (resume) await page.evaluate(() => window.__app?.ticker?.start?.());
  return target;
}

async function prepareScenario(browser, viewport, input) {
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript(({ reducedMotion }) => {
    localStorage.setItem('nova_accessibility_reduced_motion', reducedMotion ? '1' : '0');
    localStorage.setItem('nova_accessibility_flash_intensity', reducedMotion ? '0.55' : '1');
    localStorage.setItem('burt_accessibility_screen_shake', reducedMotion ? '0' : '1');
  }, { reducedMotion: input.reducedMotion });
  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000
  });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return Boolean(
      play?.player
      && play?.bulletManager
      && play?.enemyManager
      && play?.introComplete === true
      && play?.introActive !== true
      && play.enemyManager.enemies?.some((enemy) => enemy?.active !== false)
    );
  }, null, { timeout: 90000 });
  return { page, pageErrors, consoleErrors };
}

async function stageLifeLoss(page, input) {
  return page.evaluate(({ inputId, reducedMotion, agencyExitMock, quickReadMock }) => {
    const game = window.__game;
    const play = game.scenes.play;
    const player = play.player;
    const app = window.__app;
    app.ticker.stop();
    play.isPaused = false;
    play.freezeTimerMs = 0;
    play.introActive = false;
    play.introComplete = true;
    play.gameOverSequenceStarted = false;
    play.debugInvincible = false;
    play.clearToastState?.();
    play.clearBossHazards?.('respawn_agency_audit');
    play.bulletManager.clearAll?.('respawn_agency_audit');
    play.enemyManager.state = 'WAVE_ACTIVE';
    play.enemyManager.phase = 'WAVES';
    game.lives = 3;
    game.score = 4321;
    player.active = true;
    player.shieldActive = false;
    player.invulnerable = false;
    player.invulnerableTime = 0;
    player.shootCooldown = 0;
    const width = play.gameplayGame.getWidth();
    const height = play.gameplayGame.getHeight();
    player.x = width * 0.46;
    player.y = height * 0.62;
    player.sprite.position.set(player.x, player.y);
    player.sprite.visible = true;
    player.sprite.renderable = true;
    player.sprite.alpha = 1;

    window.__burtKeyboardOverride = inputId.startsWith('keyboard')
      ? { ArrowRight: true, Space: true }
      : {};
    window.__burtGamepadOverride = inputId === 'controller'
      ? {
          connected: true,
          axes: [1, 0],
          buttons: Array.from({ length: 17 }, (_, index) => ({
            pressed: index === 0,
            value: index === 0 ? 1 : 0
          }))
        }
      : null;
    play.inputManager.gamepadState.updatedAt = 0;
    play.inputManager.previousGamepadButtons = {};

    const impact = { x: player.x, y: player.y };
    const bullet = {
      x: player.x,
      y: player.y,
      vx: -8,
      vy: 0,
      radius: 6,
      active: true,
      nearMissed: false,
      color: 0xff6677,
      sourceFireStyle: 'respawn_agency_audit',
      __novaProjectileKind: 'enemy'
    };
    play.bulletManager.enemyBullets = [bullet];
    const collisionAt = performance.now();
    play.checkCollisions();
    if (quickReadMock) {
      const display = play.activeTopToast?.__toastMeta?.type === 'player_survival'
        ? play.activeTopToast
        : null;
      if (display?.__toastTicker) {
        const originalTicker = display.__toastTicker;
        originalTicker({ deltaTime: 15 });
        app.ticker.remove(originalTicker);
        const mockState = {
          collisionAt,
          readableAt: performance.now(),
          readableUntil: null,
          dismissedAt: null,
          reducedMotion
        };
        display.alpha = 1;
        display.scale?.set?.(1);
        let quickReadElapsed = 0;
        const quickReadTicker = (delta) => {
          quickReadElapsed += (Number(delta?.deltaTime) || Number(delta) || 1) * 16.67;
          const elapsed = quickReadElapsed;
          if (reducedMotion) {
            display.alpha = 1;
            if (elapsed >= 350) {
              mockState.readableUntil = mockState.readableUntil ?? collisionAt + elapsed;
              mockState.dismissedAt = collisionAt + elapsed;
              play.dismissToastDisplay(display, 'top', { reason: 'quick_read_runtime_mock' });
              play.processToastQueue();
            }
            return;
          }
          if (elapsed < 350) {
            display.alpha = 1;
            return;
          }
          const exitProgress = Math.max(0, Math.min(1, (elapsed - 350) / 60));
          display.alpha = 1 - exitProgress;
          if (display.alpha < 0.8 && mockState.readableUntil == null) mockState.readableUntil = collisionAt + elapsed;
          if (elapsed >= 410) {
            mockState.dismissedAt = collisionAt + elapsed;
            play.dismissToastDisplay(display, 'top', { reason: 'quick_read_runtime_mock' });
            play.processToastQueue();
          }
        };
        display.__toastTicker = quickReadTicker;
        display.__toastMeta.duration = reducedMotion ? 350 : 410;
        app.ticker.add(quickReadTicker);
        window.__respawnQuickReadMock = mockState;
      }
    } else {
      window.__respawnQuickReadMock = null;
    }
    const respawn = { x: player.x, y: player.y };
    const initialPlayerBullets = play.bulletManager.playerBullets.filter((entry) => entry?.active !== false).length;
    const initialToast = play.getToastDebugState?.()?.active || [];
    const audit = {
      inputId,
      reducedMotion,
      collisionAt,
      t0: null,
      impact,
      respawn,
      collision: {
        lives: game.lives,
        spriteVisible: Boolean(player.sprite?.visible && player.sprite?.renderable),
        spriteAlpha: Number(player.sprite?.alpha),
        invulnerable: Boolean(player.invulnerable),
        invulnerabilityRemainingMs: Number(player.invulnerableTime),
        initialToast: structuredClone(initialToast)
      },
      milestones: {
        shipVisibleMs: null,
        invulnerabilityVisualMs: null,
        movementAcceptedMs: null,
        shotAcceptedMs: null,
        plateReadableMs: null,
        plateReadableEndedMs: null,
        plateExitMs: null,
        plateAlphaAtMovement: null,
        toastClearedMs: null,
        invulnerabilityVisualClearedMs: null,
        damageableMs: null
      },
      samples: []
    };
    window.__respawnAgencyAudit = audit;

    let lastSampleBucket = -1;
    const sample = () => {
      const elapsed = performance.now() - audit.t0;
      const invulnerabilityVisual = player.hitboxReticle?.__debugInvulnerabilityWindow || {};
      const activeToast = play.getToastDebugState?.()?.active || [];
      const survivalToast = activeToast.find((entry) => entry?.type === 'player_survival') || null;
      const survivalDisplay = play.activeTopToast?.__toastMeta?.type === 'player_survival'
        ? play.activeTopToast
        : null;
      const survivalAlpha = Number(survivalDisplay?.alpha) || 0;
      const activePlayerBullets = play.bulletManager.playerBullets.filter((entry) => entry?.active !== false).length;
      const moved = Math.hypot(player.x - respawn.x, player.y - respawn.y) > 0.5;
      if (audit.milestones.shipVisibleMs == null && player.sprite?.visible && player.sprite?.renderable && Number(player.sprite.alpha) >= 0.2) {
        audit.milestones.shipVisibleMs = elapsed;
      }
      if (audit.milestones.invulnerabilityVisualMs == null && invulnerabilityVisual.active === true) {
        audit.milestones.invulnerabilityVisualMs = elapsed;
      }
      if (audit.milestones.plateReadableMs == null && survivalDisplay && survivalAlpha >= 0.8) {
        audit.milestones.plateReadableMs = elapsed;
      }
      if (
        audit.milestones.plateReadableMs != null
        && audit.milestones.plateReadableEndedMs == null
        && (!survivalDisplay || survivalAlpha < 0.8)
      ) {
        audit.milestones.plateReadableEndedMs = elapsed;
      }
      if (audit.milestones.movementAcceptedMs == null && moved) {
        audit.milestones.movementAcceptedMs = elapsed;
        audit.milestones.plateAlphaAtMovement = survivalAlpha;
        if (agencyExitMock && survivalDisplay) {
          play.dismissToastDisplay(survivalDisplay, 'top', { reason: 'agency_exit_runtime_mock' });
          audit.milestones.plateExitMs = elapsed;
        }
      }
      if (audit.milestones.shotAcceptedMs == null && activePlayerBullets > initialPlayerBullets) audit.milestones.shotAcceptedMs = elapsed;
      if (audit.milestones.toastClearedMs == null && elapsed > 20 && !survivalToast) audit.milestones.toastClearedMs = elapsed;
      if (audit.milestones.invulnerabilityVisualClearedMs == null && audit.milestones.invulnerabilityVisualMs != null && invulnerabilityVisual.active !== true) {
        audit.milestones.invulnerabilityVisualClearedMs = elapsed;
      }
      if (audit.milestones.damageableMs == null && !player.invulnerable) audit.milestones.damageableMs = elapsed;
      const bucket = Math.floor(elapsed / 100);
      if (bucket !== lastSampleBucket) {
        lastSampleBucket = bucket;
        audit.samples.push({
          elapsedMs: elapsed,
          x: player.x,
          y: player.y,
          spriteAlpha: Number(player.sprite?.alpha),
          invulnerable: Boolean(player.invulnerable),
          invulnerabilityVisual: Boolean(invulnerabilityVisual.active),
          playerBullets: activePlayerBullets,
          survivalAlpha,
          survivalToast: survivalToast ? structuredClone(survivalToast) : null
        });
      }
      if (elapsed < 3200) requestAnimationFrame(sample);
    };
    window.__startRespawnAgencyObserver = () => {
      audit.t0 = performance.now();
      requestAnimationFrame(sample);
      app.ticker.start();
      return audit.t0;
    };
    app.render();
    return structuredClone(audit);
  }, { inputId: input.id, reducedMotion: input.reducedMotion, agencyExitMock, quickReadMock });
}

async function collectOverlap(page) {
  return page.evaluate(() => {
    const play = window.__game.scenes.play;
    const toast = (play.getToastDebugState?.()?.active || []).find((entry) => entry?.type === 'player_survival') || null;
    const bounds = toast?.bounds || null;
    const enemies = (play.enemyManager.enemies || []).filter((enemy) => enemy?.active !== false).map((enemy) => {
      const b = enemy.sprite?.getBounds?.();
      return b ? { x: b.x, y: b.y, width: b.width, height: b.height } : null;
    }).filter(Boolean);
    const hostileProjectiles = (play.bulletManager.enemyBullets || []).filter((bullet) => bullet?.active !== false).map((bullet) => {
      const b = bullet.sprite?.getBounds?.();
      if (b) return { x: b.x, y: b.y, width: b.width, height: b.height };
      return Number.isFinite(bullet?.x) && Number.isFinite(bullet?.y)
        ? { x: bullet.x - 6, y: bullet.y - 6, width: 12, height: 12 }
        : null;
    }).filter(Boolean);
    const friendlyProjectiles = (play.bulletManager.playerBullets || []).filter((bullet) => bullet?.active !== false).map((bullet) => {
      const b = bullet.sprite?.getBounds?.();
      return b ? { x: b.x, y: b.y, width: b.width, height: b.height } : null;
    }).filter(Boolean);
    return {
      toast,
      bounds,
      enemies,
      hostileProjectiles,
      friendlyProjectiles
    };
  });
}

mkdirSync(outputDir, { recursive: true });
const server = await waitForServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const reports = [];
let terminalRegression = null;
try {
  for (const viewport of layouts) {
    for (const input of inputs) {
      const scenarioDir = path.join(outputDir, `${input.id}-${viewport.width}x${viewport.height}`);
      mkdirSync(scenarioDir, { recursive: true });
      const { page, pageErrors, consoleErrors } = await prepareScenario(browser, viewport, input);
      try {
        const timingCollision = await stageLifeLoss(page, input);
        await page.evaluate(() => window.__startRespawnAgencyObserver());
        await page.waitForFunction(() => {
          const m = window.__respawnAgencyAudit?.milestones;
          return m?.movementAcceptedMs != null
            && m?.shotAcceptedMs != null
            && m?.toastClearedMs != null
            && m?.damageableMs != null
            && m?.invulnerabilityVisualClearedMs != null;
        }, null, { timeout: 5000 });
        const audit = await page.evaluate(() => structuredClone(window.__respawnAgencyAudit));
        const mockTiming = await page.evaluate(() => window.__respawnQuickReadMock
          ? structuredClone(window.__respawnQuickReadMock)
          : null);

        const collision = await stageLifeLoss(page, input);
        const screenshots = {
          death: await capture(page, scenarioDir, '00-death-frame')
        };
        await page.evaluate(() => window.__startRespawnAgencyObserver());
        await page.waitForTimeout(40);
        screenshots.visible = await capture(page, scenarioDir, '01-first-respawn-visible', { resume: true });
        await page.waitForTimeout(120);
        screenshots.agency = await capture(page, scenarioDir, '02-first-agency-frame', { resume: true });
        if (quickReadMock || productionQuickRead) {
          await page.waitForTimeout(150);
          screenshots.finalReadable = await capture(page, scenarioDir, '03-final-readable-frame', { resume: true });
          await page.waitForFunction(() => window.__respawnAgencyAudit?.milestones?.toastClearedMs != null, null, { timeout: 5000 });
          screenshots.plateFree = await capture(page, scenarioDir, '04-first-plate-free-combat', { resume: true });
        } else {
          await page.waitForTimeout(650);
        }
        const overlap = await collectOverlap(page);
        screenshots.overlap = await capture(page, scenarioDir, quickReadMock || productionQuickRead ? '05-post-exit-overlap-proof' : '03-worst-actionable-overlap', { resume: true });
        await page.waitForFunction(() => window.__respawnAgencyAudit?.milestones?.toastClearedMs != null, null, { timeout: 5000 });
        screenshots.toastClear = await capture(page, scenarioDir, quickReadMock || productionQuickRead ? '06-toast-cleared' : '04-toast-cleared', { resume: true });
        if (quickReadMock || productionQuickRead) {
          await page.waitForTimeout(900);
        } else {
          await page.waitForFunction(() => {
            const m = window.__respawnAgencyAudit?.milestones;
            return m?.damageableMs != null && m?.invulnerabilityVisualClearedMs != null;
          }, null, { timeout: 5000 });
        }
        screenshots.normal = await capture(page, scenarioDir, quickReadMock || productionQuickRead ? '07-normal-combat' : '05-normal-combat', { resume: false });
        if (productionQuickRead && terminalRegression == null) {
          terminalRegression = await page.evaluate(() => {
            const play = window.__game.scenes.play;
            play.clearToastState?.();
            play.game.lives = 0;
            play.gameOverSequenceStarted = false;
            play.finalLifeLossSource = null;
            play.onLifeLost(0, { source: 'enemy_bullet', final: true });
            return {
              finalLifeLossSource: play.finalLifeLossSource,
              fatalBarrierActive: Boolean(play.isFatalEventBarrierActive?.()),
              gameOverSequenceStarted: Boolean(play.gameOverSequenceStarted),
              survivalToastActive: (play.getToastDebugState?.()?.active || []).some((entry) => entry?.type === 'player_survival'),
              quickReadToastActive: (play.getToastDebugState?.()?.active || []).some((entry) => entry?.nonterminalQuickRead === true)
            };
          });
        }
        const actionReadyMs = Math.max(audit.milestones.movementAcceptedMs, audit.milestones.shotAcceptedMs);
        const protectedReadableMs = Math.max(audit.milestones.shipVisibleMs, audit.milestones.invulnerabilityVisualMs);
        const toastActionableOverlapMs = audit.milestones.toastClearedMs - actionReadyMs;
        const invulnerabilityStartDeltaMs = Math.abs(audit.milestones.invulnerabilityVisualMs - audit.milestones.shipVisibleMs);
        const invulnerabilityEndDeltaMs = Math.abs(audit.milestones.invulnerabilityVisualClearedMs - audit.milestones.damageableMs);
        const enemyOverlapArea = overlap.enemies.reduce((sum, item) => sum + overlapArea(overlap.bounds, item), 0);
        const hostileOverlapArea = overlap.hostileProjectiles.reduce((sum, item) => sum + overlapArea(overlap.bounds, item), 0);
        const friendlyOverlapArea = overlap.friendlyProjectiles.reduce((sum, item) => sum + overlapArea(overlap.bounds, item), 0);
        reports.push({
          viewport,
          input,
          timingCollision,
          collision,
          audit,
          mockTiming,
          findings: {
            actionReadyMs,
            protectedReadableMs,
            agencyBeforeReadableMs: protectedReadableMs - actionReadyMs,
            readableButBlockedMs: actionReadyMs - protectedReadableMs,
            toastActionableOverlapMs,
            invulnerabilityStartDeltaMs,
            invulnerabilityEndDeltaMs,
            enemyOverlapArea,
            hostileOverlapArea,
            friendlyOverlapArea,
            toastMovementOverlapMs: audit.milestones.toastClearedMs - audit.milestones.movementAcceptedMs,
            plateVisibleBeforeAgencyMs: audit.milestones.movementAcceptedMs,
            plateReadableBeforeAgencyMs: audit.milestones.plateReadableMs == null
              ? 0
              : Math.max(0, audit.milestones.movementAcceptedMs - audit.milestones.plateReadableMs),
            materiallyCoversAction: enemyOverlapArea + hostileOverlapArea + friendlyOverlapArea > 0
          },
          overlap,
          screenshots,
          pageErrors,
          consoleErrors
        });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  server.kill();
}

const normalKeyboard = reports.filter((item) => item.input.id === 'keyboard');
const normalController = reports.filter((item) => item.input.id === 'controller');
const comparisons = layouts.map((viewport) => {
  const keyboard = normalKeyboard.find((item) => item.viewport.width === viewport.width);
  const controller = normalController.find((item) => item.viewport.width === viewport.width);
  return {
    viewport,
    agencyTimingDeltaMs: Math.abs(keyboard.findings.actionReadyMs - controller.findings.actionReadyMs)
  };
});
const failures = [];
for (const report of reports) {
  if (report.collision.collision.lives !== 2) failures.push(`${report.input.id} ${report.viewport.width}: life loss was not authoritative`);
  if (!report.collision.collision.invulnerable) failures.push(`${report.input.id} ${report.viewport.width}: respawn lacked authoritative invulnerability`);
  if (report.findings.agencyBeforeReadableMs > 100) failures.push(`${report.input.id} ${report.viewport.width}: agency preceded readable protection by ${report.findings.agencyBeforeReadableMs.toFixed(1)}ms`);
  if (report.findings.readableButBlockedMs >= 500) failures.push(`${report.input.id} ${report.viewport.width}: readable respawn remained blocked ${report.findings.readableButBlockedMs.toFixed(1)}ms`);
  if (report.findings.invulnerabilityStartDeltaMs > 100 || report.findings.invulnerabilityEndDeltaMs > 100) failures.push(`${report.input.id} ${report.viewport.width}: invulnerability visual drift exceeded 100ms`);
  if (productionQuickRead) {
    const milestones = report.audit.milestones;
    const initialToast = report.timingCollision.collision.initialToast.find((entry) => entry?.type === 'player_survival');
    const readableDuration = milestones.plateReadableEndedMs - milestones.plateReadableMs;
    if (initialToast?.duration > 410 || initialToast?.nonterminalQuickRead !== true) failures.push(`${report.input.id} ${report.viewport.width}: nonterminal quick-read metadata missing or exceeded the 410ms render deadline`);
    if (milestones.plateReadableMs == null || milestones.plateReadableMs > 50) failures.push(`${report.input.id} ${report.viewport.width}: plate was not readable within 50ms`);
    if (!Number.isFinite(readableDuration) || readableDuration < 320) failures.push(`${report.input.id} ${report.viewport.width}: readable hold was ${Number(readableDuration).toFixed(1)}ms`);
    if (milestones.toastClearedMs >= 500) failures.push(`${report.input.id} ${report.viewport.width}: observed plate lifetime crossed the 500ms harm gate at ${milestones.toastClearedMs.toFixed(1)}ms`);
    if (report.findings.toastMovementOverlapMs >= 450) failures.push(`${report.input.id} ${report.viewport.width}: actionable plate overlap was ${report.findings.toastMovementOverlapMs.toFixed(1)}ms`);
    if (report.findings.materiallyCoversAction) failures.push(`${report.input.id} ${report.viewport.width}: plate still intersected action after exit`);
  }
  if (report.pageErrors.length) failures.push(`${report.input.id} ${report.viewport.width}: page errors ${report.pageErrors.join(' | ')}`);
  if (report.consoleErrors.length) failures.push(`${report.input.id} ${report.viewport.width}: console errors ${report.consoleErrors.join(' | ')}`);
}
for (const comparison of comparisons) {
  if (comparison.agencyTimingDeltaMs > 150) failures.push(`${comparison.viewport.width}: keyboard/controller agency drift ${comparison.agencyTimingDeltaMs.toFixed(1)}ms`);
}
if (productionQuickRead && (
  terminalRegression?.finalLifeLossSource !== 'enemy_bullet'
  || terminalRegression?.fatalBarrierActive !== true
  || terminalRegression?.survivalToastActive !== false
  || terminalRegression?.quickReadToastActive !== false
)) {
  failures.push(`terminal death path changed: ${JSON.stringify(terminalRegression)}`);
}
const report = {
  ok: failures.length === 0,
  agencyExitMock,
  quickReadMock,
  productionQuickRead,
  terminalRegression,
  outputDir,
  reports,
  comparisons,
  binaryHarm: {
    agencyTooEarly: reports.some((item) => item.findings.agencyBeforeReadableMs > 100),
    controlBlockedTooLong: reports.some((item) => item.findings.readableButBlockedMs >= 500),
    actionableToastOverlapTooLong: reports.some((item) => item.findings.toastActionableOverlapMs >= 500 && item.findings.materiallyCoversAction),
    invulnerabilityVisualDrift: reports.some((item) => item.findings.invulnerabilityStartDeltaMs > 100 || item.findings.invulnerabilityEndDeltaMs > 100),
    inputTimingDrift: comparisons.some((item) => item.agencyTimingDeltaMs > 150)
  },
  failures
};
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
assert(report.ok, failures.join('; '));
console.log(`[respawn-agency-handoff] PASS scenarios=${reports.length} report=${path.join(outputDir, 'report.json')}`);
console.log(`[respawn-agency-handoff] binaryHarm=${JSON.stringify(report.binaryHarm)}`);
