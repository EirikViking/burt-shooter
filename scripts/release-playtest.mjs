import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.PLAYTEST_HOST || '127.0.0.1';
const explicitPort = process.env.PLAYTEST_PORT ? Number(process.env.PLAYTEST_PORT) : null;
const port = process.env.PLAYTEST_URL ? null : (explicitPort || await findAvailablePort(Number(process.env.PLAYTEST_PORT_START || 4173)));
const baseUrl = process.env.PLAYTEST_URL || `http://${host}:${port}`;
const durationMs = Number(process.env.RELEASE_PLAYTEST_MS || 10 * 60 * 1000);
const minSurvivalMs = Number(process.env.RELEASE_PLAYTEST_MIN_SURVIVAL_MS || durationMs);
const allowGameOver = process.env.RELEASE_PLAYTEST_ALLOW_GAME_OVER === '1';
const sampleMs = Number(process.env.RELEASE_PLAYTEST_SAMPLE_MS || 150);
const screenshotMs = Number(process.env.RELEASE_PLAYTEST_SCREENSHOT_MS || 60 * 1000);
const outputDir = path.resolve(process.env.RELEASE_PLAYTEST_OUTPUT_DIR || `test-results/release-playtest-${timestamp()}`);
const requiredReleaseAssets = [
  '/art/generated/nova-swarm/nova-swarm-boss-dossier.png',
  '/art/generated/nova-swarm/nova-swarm-comms-navigator.png',
  '/art/generated/nova-swarm/nova-swarm-comms-pilot.png',
  '/art/generated/nova-swarm/nova-swarm-intro-launch.webp',
  '/art/generated/nova-swarm/nova-swarm-intro-formations.webp',
  '/art/generated/nova-swarm/nova-swarm-intro-hero-run.webp',
  '/art/generated/nova-swarm/nova-swarm-intro-boss-arena.webp',
  '/art/generated/nova-swarm/nova-swarm-ship-hangar.webp',
  '/art/generated/nova-swarm/nova-swarm-gameplay-arena.webp',
  '/art/generated/nova-swarm/nova-swarm-boss-arena.webp',
  '/sprites/generated/nova-bonus-core-drone-20260517.png',
  '/audio/music/nova-swarm/nova_swarm_intro_overture.mp3',
  '/audio/voice/nova-swarm/intro_narrator_01.mp3',
  '/audio/voice/nova-swarm/intro_narrator_02.mp3',
  '/audio/voice/nova-swarm/intro_narrator_03.mp3',
  '/audio/voice/nova-swarm/intro_narrator_04.mp3',
  '/audio/sfx/nova-swarm/start_game_confirm.mp3',
  '/audio/sfx/nova-swarm/nova_chain_lightning_arc.mp3',
  '/audio/sfx/nova-swarm/nova_magnet_pull_warble.mp3',
  '/audio/sfx/nova-swarm/nova_ghost_phase_shift.mp3',
  '/audio/sfx/nova-swarm/nova_time_slow_warp.mp3',
  '/audio/sfx/nova-swarm/nova_drone_launch_blip.mp3',
  '/audio/sfx/nova-swarm/nova_orbital_strike_charge.mp3',
  '/sprites/boss/boss_battleship_no_bg2.png',
  '/sprites/boss/boss_turret_no_bg2.png',
  '/sprites/boss/boss_crystal_no_bg2.png',
  '/sprites/boss/boss_insect_no_bg2.png',
  '/sprites/boss/Gemini_Generated_Image_kgxeipkgxeipkgxe_no_bg2.png',
  '/audio/sfx/doorOpen_000.mp3',
  '/audio/sfx/doorOpen_001.mp3',
  '/audio/sfx/doorOpen_002.mp3',
  '/audio/sfx/forceField_000.mp3',
  '/audio/sfx/forceField_001.mp3',
  '/audio/sfx/forceField_002.mp3',
  '/audio/sfx/forceField_003.mp3',
  '/audio/sfx/forceField_004.mp3',
  '/audio/sfx/impactMetal_000.mp3',
  '/audio/sfx/impactMetal_004.mp3',
  '/audio/sfx/laserRetro_000.mp3',
  '/audio/sfx/explosionCrunch_003.mp3',
  '/audio/voice/mission-control/mission_control_wave_clear.mp3',
  '/audio/music/bgm_v2.mp3'
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate++) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available preview port found starting at ${startPort}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) {
    return { command: process.execPath, baseArgs: [viteEntry] };
  }
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', baseArgs: ['vite'] };
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canFetch(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function findMissingPreviewAssets() {
  const missing = [];
  for (const assetPath of requiredReleaseAssets) {
    const url = `${baseUrl}${assetPath}`;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || contentType.includes('text/html')) {
        missing.push(`${response.status} ${assetPath} (${contentType || 'unknown type'})`);
      }
    } catch (error) {
      missing.push(`${assetPath} (${error?.message || error})`);
    }
  }

  return missing;
}

async function assertPreviewAssets(timeoutMs = 12000) {
  const start = Date.now();
  let missing = [];
  while (Date.now() - start < timeoutMs) {
    missing = await findMissingPreviewAssets();
    if (!missing.length) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (missing.length) {
    throw new Error(`Preview asset preflight failed: ${missing.join('; ')}`);
  }
}

async function findMissingPreviewAssetsInPage(page) {
  return page.evaluate(async (assetPaths) => {
    const failures = [];
    for (const assetPath of assetPaths) {
      try {
        const response = await fetch(assetPath, { cache: 'no-store' });
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || contentType.includes('text/html')) {
          failures.push(`${response.status} ${assetPath} (${contentType || 'unknown type'})`);
        }
      } catch (error) {
        failures.push(`${assetPath} (${error?.message || error})`);
      }
    }
    return failures;
  }, requiredReleaseAssets);
}

async function assertPreviewAssetsInPage(page, timeoutMs = 12000) {
  const start = Date.now();
  let missing = [];
  while (Date.now() - start < timeoutMs) {
    missing = await findMissingPreviewAssetsInPage(page);
    if (!missing.length) return;
    await page.waitForTimeout(300);
  }

  if (missing.length) {
    throw new Error(`Preview asset preflight failed: ${missing.join('; ')}`);
  }
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) {
    await assertPreviewAssets();
    return null;
  }

  const { command, baseArgs } = viteCommand();
  const args = [...baseArgs, 'preview', '--host', host, '--port', String(port), '--strictPort'];
  let exited = false;
  let exitCode = null;
  const server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  const observeOutput = (chunk, writer) => {
    writer(`[preview] ${chunk}`);
  };
  server.stdout.on('data', (chunk) => observeOutput(chunk, process.stdout.write.bind(process.stdout)));
  server.stderr.on('data', (chunk) => observeOutput(chunk, process.stderr.write.bind(process.stderr)));
  server.once('exit', (code) => {
    exited = true;
    exitCode = code;
  });

  const readyStart = Date.now();
  while (Date.now() - readyStart < 30000) {
    if (await canFetch(baseUrl)) {
      await assertPreviewAssets();
      return server;
    }
    if (exited) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  server.kill();
  const exitDetail = exited ? `; process exited with code ${exitCode}` : '';
  throw new Error(`Preview server did not become ready at ${baseUrl}${exitDetail}`);
}

async function gotoWithRetry(page, url, options = {}, timeoutMs = 30000) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      return await page.goto(url, options);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError || new Error(`Navigation did not succeed: ${url}`);
}

async function collectPlayState(page) {
  return page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const enemyManager = play?.enemyManager;
    const enemyBullets = play?.bulletManager?.enemyBullets || [];
    let textState = null;
    try {
      textState = typeof window.render_game_to_text === 'function'
        ? JSON.parse(window.render_game_to_text())
        : null;
    } catch {}

    const scene = game?.currentSceneName || textState?.scene || (game?.currentScene === game?.scenes?.play
      ? 'play'
      : game?.currentScene === game?.scenes?.menu
        ? 'menu'
        : game?.currentScene === game?.scenes?.gameOver
          ? 'gameOver'
          : game?.currentScene === game?.scenes?.highscore
            ? 'highscore'
            : game?.currentScene === game?.scenes?.shipSelect
              ? 'shipSelect'
              : 'unknown');

    return {
      scene,
      score: game?.score ?? null,
      level: game?.level ?? null,
      lives: game?.lives ?? null,
      fatalOverlay: Boolean(document.getElementById('fatal-overlay')),
      isPaused: Boolean(play?.isPaused),
      enemyManagerState: enemyManager?.state ?? null,
      currentWaveIndex: enemyManager?.currentWaveIndex ?? null,
      music: textState?.audio || null,
      accessibility: textState?.accessibility || null,
      player: player ? {
        x: Math.round(player.x),
        y: Math.round(player.y)
      } : null,
      enemies: (textState?.visibleEnemies || []).map((enemy) => ({
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        radius: Math.round(enemy.radius || 0),
        kind: enemy.kind || null,
        health: Number.isFinite(enemy.health) ? enemy.health : null,
        maxHealth: Number.isFinite(enemy.maxHealth) ? enemy.maxHealth : null,
        type: enemy.type,
        variant: enemy.variant || null
      })),
      enemyBullets: enemyBullets
        .filter((bullet) => bullet?.active !== false)
        .map((bullet) => ({
          x: Number(bullet.x) || 0,
          y: Number(bullet.y) || 0
        }))
        .sort((a, b) => {
          if (!player) return b.y - a.y;
          const adx = Math.abs(a.x - player.x);
          const bdx = Math.abs(b.x - player.x);
          const ay = Math.abs(a.y - player.y);
          const by = Math.abs(b.y - player.y);
          return (adx + ay * 0.45) - (bdx + by * 0.45);
        })
        .slice(0, 48)
        .map((bullet) => ({
          x: Math.round(bullet.x),
          y: Math.round(bullet.y)
        })),
      counts: textState?.counts || null,
      wave: textState?.wave || null
    };
  });
}

function scoreLane(state, x, y, viewportWidth, viewportHeight) {
  let score = 0;
  for (const bullet of state.enemyBullets || []) {
    const dx = Math.abs((bullet.x ?? 0) - x);
    const dy = Math.abs((bullet.y ?? 0) - y);
    if (dy > 360) continue;
    const nearX = Math.max(0, 100 - dx);
    const nearY = Math.max(0, 280 - dy);
    const collisionColumn = dx < 52 && dy < 170;
    const grazeColumn = dx < 82 && dy < 230;
    score -= nearX * nearX * 0.16 + nearY * 0.24;
    if (collisionColumn) score -= 950 + (170 - dy) * 2.8;
    else if (grazeColumn) score -= 360 + (230 - dy) * 1.2;
    if ((bullet.y ?? 0) < y && dy < 260 && dx < 100) {
      score -= (260 - dy) * 2.4;
    }
  }
  for (const enemy of state.enemies || []) {
    if (enemy.kind === 'boss') continue;
    const ex = Number(enemy.x) || 0;
    const ey = Number(enemy.y) || 0;
    if (ex < -80 || ex > viewportWidth + 80) continue;
    const dx = Math.abs(ex - x);
    const dy = Math.abs(ey - y);
    const lowThreat = ey > viewportHeight * 0.62 ? 1.35 : ey > viewportHeight * 0.52 ? 0.65 : 0.015;
    const nearX = Math.max(0, 165 - dx);
    const nearY = Math.max(0, 260 - dy);
    score -= nearX * nearX * 0.035 * lowThreat + nearY * 0.42 * lowThreat;
    if (ey > viewportHeight * 0.6 && dy < 130 && dx < 110) {
      score -= 900 * lowThreat;
    }
  }
  return score;
}

function chooseIntent(state, viewportWidth, viewportHeight) {
  const playerX = state.player?.x ?? viewportWidth / 2;
  const playerY = state.player?.y ?? viewportHeight * 0.8;
  const margin = 46;
  const combatTop = viewportHeight * 0.55;
  const combatBottom = viewportHeight - 92;

  const visibleTargets = (state.enemies || []).filter((enemy) => enemy.x >= 0 && enemy.x <= viewportWidth);
  let targetX = viewportWidth / 2;
  if (visibleTargets.length) {
    if (state.enemyManagerState === 'BOSS_ACTIVE') {
      visibleTargets.sort((a, b) => (b.radius || 0) - (a.radius || 0));
      targetX = visibleTargets[0].x;
    } else {
      const nonBossTargets = visibleTargets.filter((enemy) => enemy.kind !== 'boss');
      const weighted = nonBossTargets.reduce((acc, enemy) => {
        const yWeight = 1 + Math.max(0, Number(enemy.y) || 0) / viewportHeight;
        const damagedWeight = Math.max(1, (Number(enemy.maxHealth) || 1) - (Number(enemy.health) || 1) + 1);
        const weight = yWeight * damagedWeight;
        acc.x += enemy.x * weight;
        acc.weight += weight;
        return acc;
      }, { x: 0, weight: 0 });
      targetX = weighted.weight > 0 ? weighted.x / weighted.weight : visibleTargets[0].x;
    }
  }

  const nonBossVisibleCount = visibleTargets.filter((enemy) => enemy.kind !== 'boss').length;
  const pressure = (state.enemyBullets?.length || 0) +
    visibleTargets.filter((enemy) => enemy.kind !== 'boss' && enemy.y > viewportHeight * 0.48).length * 2;
  const lowLives = Number.isFinite(state.lives) && state.lives <= 1;
  const highPressure = lowLives || pressure >= 4;
  const safeLeft = lowLives ? viewportWidth * 0.18 : highPressure ? viewportWidth * 0.15 : margin;
  const safeRight = lowLives ? viewportWidth * 0.82 : highPressure ? viewportWidth * 0.85 : viewportWidth - margin;
  const safeBottom = lowLives ? viewportHeight * 0.82 : highPressure ? viewportHeight * 0.82 : combatBottom;

  const candidateXs = [
    playerX,
    playerX - 150,
    playerX + 150,
    targetX - 180,
    targetX,
    targetX + 180,
    viewportWidth * 0.12,
    viewportWidth * 0.25,
    viewportWidth * 0.38,
    viewportWidth * 0.5,
    viewportWidth * 0.62,
    viewportWidth * 0.75,
    viewportWidth * 0.88
  ].map((x) => Math.max(safeLeft, Math.min(safeRight, x)));
  const candidateYs = [
    playerY,
    viewportHeight * 0.62,
    viewportHeight * 0.66,
    viewportHeight * 0.7,
    viewportHeight * 0.78,
    viewportHeight * 0.84
  ].map((y) => Math.max(combatTop, Math.min(safeBottom, y)));

  let best = { x: playerX, y: playerY, score: Number.NEGATIVE_INFINITY };
  const aimWeight = state.enemyManagerState === 'BOSS_ACTIVE' ? 0.35 : nonBossVisibleCount <= 2 ? 0.34 : lowLives ? 0.1 : pressure >= 5 ? 0.08 : 0.18;
  for (const x of candidateXs) {
    for (const y of candidateYs) {
      const aimPenalty = Math.abs(x - targetX) * aimWeight;
      const movementPenalty = Math.abs(x - playerX) * 0.04 + Math.abs(y - playerY) * 0.03;
      const preferredY = pressure >= 4 || lowLives ? viewportHeight * 0.68 : viewportHeight * 0.78;
      const verticalPreference = Math.abs(y - preferredY) * 0.06;
      const centerBias = Math.abs(x - viewportWidth * 0.5) * (lowLives ? 0.028 : 0.018);
      const edgePenalty = Math.max(0, viewportWidth * 0.18 - x) * (lowLives ? 1.8 : 0.9) +
        Math.max(0, x - viewportWidth * 0.82) * (lowLives ? 1.8 : 0.9);
      const bottomPenalty = Math.max(0, y - viewportHeight * (lowLives ? 0.78 : 0.82)) * (lowLives ? 0.8 : 0.25);
      const score = scoreLane(state, x, y, viewportWidth, viewportHeight) - aimPenalty - movementPenalty - verticalPreference - centerBias - edgePenalty - bottomPenalty;
      if (score > best.score) best = { x, y, score };
    }
  }

  const deadzoneX = 26;
  const deadzoneY = 24;
  return {
    horizontal: best.x < playerX - deadzoneX ? 'left' : best.x > playerX + deadzoneX ? 'right' : 'none',
    vertical: best.y < playerY - deadzoneY ? 'up' : best.y > playerY + deadzoneY ? 'down' : 'none'
  };
}

async function applyIntent(page, currentIntent, nextIntent) {
  if (currentIntent.horizontal !== nextIntent.horizontal) {
    if (currentIntent.horizontal === 'left') await page.keyboard.up('ArrowLeft');
    if (currentIntent.horizontal === 'right') await page.keyboard.up('ArrowRight');
    if (nextIntent.horizontal === 'left') await page.keyboard.down('ArrowLeft');
    if (nextIntent.horizontal === 'right') await page.keyboard.down('ArrowRight');
  }

  if (currentIntent.vertical !== nextIntent.vertical) {
    if (currentIntent.vertical === 'up') await page.keyboard.up('ArrowUp');
    if (currentIntent.vertical === 'down') await page.keyboard.up('ArrowDown');
    if (nextIntent.vertical === 'up') await page.keyboard.down('ArrowUp');
    if (nextIntent.vertical === 'down') await page.keyboard.down('ArrowDown');
  }

  return nextIntent;
}

async function runReleasePlaytest() {
  mkdirSync(outputDir, { recursive: true });
  const server = await startPreviewServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--disable-gpu', '--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const routineConsoleEvents = [];
  const consoleEvents = [];
  const pageErrors = [];
  const badResponses = [];
  const requestFailures = [];
  const timeline = [];

  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      consoleEvents.push({ type, text: message.text().slice(0, 600) });
    } else if (type === 'log' || type === 'info' || type === 'debug') {
      routineConsoleEvents.push({ type, text: message.text().slice(0, 300) });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push({
        status: response.status(),
        url: response.url(),
        method: response.request().method(),
        resourceType: response.request().resourceType()
      });
    }
  });
  page.on('requestfailed', (request) => {
    requestFailures.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure: request.failure()?.errorText || 'unknown'
    });
  });

  let currentIntent = { horizontal: 'none', vertical: 'none' };
  let heldSpace = false;
  let finalState = null;

  try {
    await gotoWithRetry(page, `${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await assertPreviewAssetsInPage(page);
    await page.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
    await page.keyboard.down('Space');
    heldSpace = true;
    await page.screenshot({ path: path.join(outputDir, '00-start.png'), fullPage: true });

    const startedAt = Date.now();
    let nextScreenshotAt = screenshotMs;
    let nextProgressLogAt = 30000;
    while (Date.now() - startedAt < durationMs) {
      const elapsedMs = Date.now() - startedAt;
      const state = await collectPlayState(page);
      timeline.push({ elapsedMs, state });

      if (elapsedMs >= nextProgressLogAt) {
        const wave = state.wave?.currentWaveNumber ?? ((state.currentWaveIndex ?? 0) + 1);
        const total = state.wave?.totalWaves ?? state.normalWavesTotal ?? '?';
        console.log(`[release-playtest] ${Math.round(elapsedMs / 1000)}s level=${state.level} wave=${wave}/${total} lives=${state.lives} score=${state.score} enemies=${state.counts?.enemies ?? state.enemies?.length ?? '?'}`);
        nextProgressLogAt += 30000;
      }

      if (state.fatalOverlay || state.scene !== 'play' || (Number.isFinite(state.lives) && state.lives <= 0)) {
        finalState = state;
        break;
      }

      const nextIntent = chooseIntent(state, 1366, 768);
      currentIntent = await applyIntent(page, currentIntent, nextIntent);

      if (elapsedMs >= nextScreenshotAt) {
        const screenshotIndex = String(Math.round(elapsedMs / 1000)).padStart(4, '0');
        await page.screenshot({ path: path.join(outputDir, `${screenshotIndex}s.png`), fullPage: true });
        nextScreenshotAt += screenshotMs;
      }

      await page.waitForTimeout(sampleMs);
    }

    if (!finalState) finalState = await collectPlayState(page);
    await page.screenshot({ path: path.join(outputDir, 'final.png'), fullPage: true });
  } finally {
    if (heldSpace) await page.keyboard.up('Space').catch(() => {});
    if (currentIntent.horizontal === 'left') await page.keyboard.up('ArrowLeft').catch(() => {});
    if (currentIntent.horizontal === 'right') await page.keyboard.up('ArrowRight').catch(() => {});
    if (currentIntent.vertical === 'up') await page.keyboard.up('ArrowUp').catch(() => {});
    if (currentIntent.vertical === 'down') await page.keyboard.up('ArrowDown').catch(() => {});
    await browser.close();
    if (server) server.kill();
  }

  const survivedMs = timeline.length ? timeline[timeline.length - 1].elapsedMs : 0;
  const survivalGraceMs = Math.max(500, sampleMs * 2);
  const requiredSurvivalMs = Math.max(0, Math.min(durationMs, minSurvivalMs) - survivalGraceMs);
  const survivedFullDuration = survivedMs >= requiredSurvivalMs;
  const endedInGameOver = Number.isFinite(finalState?.lives) && finalState.lives <= 0;
  const endedOutsidePlay = finalState?.scene && finalState.scene !== 'play';
  const report = {
    baseUrl,
    outputDir,
    requestedDurationMs: durationMs,
    minSurvivalMs,
    requiredSurvivalMs,
    survivalGraceMs,
    survivedMs,
    survivedFullDuration,
    samples: timeline.length,
    finalState,
    peakLevel: Math.max(...timeline.map((entry) => Number(entry.state.level) || 0), Number(finalState?.level) || 0),
    peakScore: Math.max(...timeline.map((entry) => Number(entry.state.score) || 0), Number(finalState?.score) || 0),
    routineConsoleEvents,
    consoleEvents,
    pageErrors,
    badResponses,
    requestFailures,
    timeline
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    outputDir,
    requestedDurationMs: durationMs,
    minSurvivalMs,
    requiredSurvivalMs,
    survivalGraceMs,
    survivedMs,
    survivedFullDuration,
    peakLevel: report.peakLevel,
    peakScore: report.peakScore,
    finalState,
    routineConsoleEvents: routineConsoleEvents.length,
    consoleEvents,
    pageErrors,
    badResponses,
    requestFailures
  }, null, 2));

  const blockingRequestFailures = requestFailures.filter((request) => {
    return !(request.resourceType === 'media' && request.failure === 'net::ERR_ABORTED');
  });
  const technicalIssues = [
    ...pageErrors.map((message) => `pageerror: ${message}`),
    ...badResponses.map((response) => `HTTP ${response.status} ${response.method} ${response.resourceType}: ${response.url}`),
    ...blockingRequestFailures.map((request) => `requestfailed ${request.method} ${request.resourceType}: ${request.url} (${request.failure})`),
    ...consoleEvents.map((event) => `${event.type}: ${event.text}`),
    ...(routineConsoleEvents.length ? [`routine console output leaked (${routineConsoleEvents.length})`] : []),
    ...(finalState?.fatalOverlay ? ['fatal overlay visible'] : [])
  ];
  const playthroughIssues = [
    ...(!allowGameOver && !survivedFullDuration ? [`ended before minimum survival (${survivedMs}ms < ${requiredSurvivalMs}ms required, ${survivalGraceMs}ms timing grace)`] : []),
    ...(!allowGameOver && endedInGameOver ? ['ended in game over'] : []),
    ...(!allowGameOver && endedOutsidePlay ? [`ended outside play scene (${finalState.scene})`] : [])
  ];

  if (technicalIssues.length) {
    throw new Error(`Release playtest technical failure: ${technicalIssues.join('; ')}`);
  }
  if (playthroughIssues.length) {
    throw new Error(`Release playtest playthrough failure: ${playthroughIssues.join('; ')}`);
  }
}

runReleasePlaytest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
