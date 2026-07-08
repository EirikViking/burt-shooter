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
const selectedShipKey = process.env.RELEASE_PLAYTEST_SHIP_KEY || null;
const requiredReleaseAssets = [
  '/art/generated/nova-swarm/nova-swarm-boss-dossier.png',
  '/art/generated/nova-swarm/story-comms/nova-swarm-story-comms-01-20260519.webp',
  '/art/generated/nova-swarm/story-comms/nova-swarm-story-comms-02-20260519.webp',
  '/art/generated/nova-swarm/story-comms/nova-swarm-story-comms-03-20260519.webp',
  '/art/generated/nova-swarm/story-comms/nova-swarm-story-comms-04-20260519.webp',
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
        y: Math.round(player.y),
        isDodging: Boolean(player.isDodging),
        invulnerable: Boolean(player.invulnerable),
        shieldActive: Boolean(player.shieldActive),
        dodgeCooldown: Number(player.dodgeCooldown) || 0
      } : null,
      enemies: (enemyManager?.enemies || [])
        .filter((enemy) => enemy?.active !== false)
        .slice(0, 24)
        .map((enemy) => ({
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        radius: Math.round(enemy.radius || 0),
        kind: enemy.kind || null,
        state: enemy.state || null,
        waitingForEntry: Boolean(enemy.waitingForEntry),
        moveStyle: enemy.tacticalMoveStyle || null,
        waveRole: enemy.waveRole || null,
        waveTactic: enemy.waveTactic ? {
          id: enemy.waveTactic.id || null,
          move: enemy.waveTactic.move || null,
          shot: enemy.waveTactic.shot || null
        } : null,
        formationX: Number.isFinite(enemy.formationX) ? Math.round(enemy.formationX) : null,
        formationY: Number.isFinite(enemy.formationY) ? Math.round(enemy.formationY) : null,
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
      bossHazards: (play?.bossHazards || [])
        .filter((hazard) => hazard && hazard.hit !== true)
        .slice(0, 12)
        .map((hazard) => ({
          kind: hazard.kind || null,
          type: hazard.type || null,
          category: hazard.category || null,
          sourceX: Number(hazard.sourceX) || 0,
          sourceY: Number(hazard.sourceY) || 0,
          angle: Number(hazard.angle) || 0,
          spread: Number(hazard.spread) || 0,
          length: Number(hazard.length) || 0,
          radius: Number(hazard.radius) || 0,
          columns: Array.isArray(hazard.columns) ? hazard.columns.map((x) => Number(x) || 0) : [],
          width: Number(hazard.width) || 0,
          startY: Number(hazard.startY) || 0,
          endY: Number(hazard.endY) || 0,
          innerRadius: Number(hazard.innerRadius) || 0,
          outerRadius: Number(hazard.outerRadius) || 0,
          safeAngle: Number(hazard.safeAngle) || 0,
          safeWedge: Number(hazard.safeWedge) || 0,
          armed: (Date.now() - (Number(hazard.startedAt) || 0)) >= (Number(hazard.armingMs) || 0),
          remainingMs: Math.max(0, Math.round(((Number(hazard.startedAt) || 0) + (Number(hazard.durationMs) || 0)) - Date.now()))
        })),
      counts: textState?.counts || null,
      wave: textState?.wave || null
    };
  });
}

function normalizeAngle(angle) {
  let result = angle;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

function scoreLane(state, x, y, viewportWidth, viewportHeight) {
  let score = 0;
  for (const bullet of state.enemyBullets || []) {
    if ((bullet.y ?? 0) > y + 96) continue;
    const dx = Math.abs((bullet.x ?? 0) - x);
    const dy = Math.abs((bullet.y ?? 0) - y);
    if (dy > 360) continue;
    const nearX = Math.max(0, 130 - dx);
    const nearY = Math.max(0, 310 - dy);
    const collisionColumn = dx < 64 && dy < 190;
    const grazeColumn = dx < 110 && dy < 260;
    score -= nearX * nearX * 0.38 + nearY * 0.72;
    if (collisionColumn) score -= 3400 + (190 - dy) * 10.5;
    else if (grazeColumn) score -= 1350 + (260 - dy) * 5.2;
    if ((bullet.y ?? 0) < y && dy < 300 && dx < 130) {
      score -= (300 - dy) * 9.4 + Math.max(0, 130 - dx) * 11.5;
    }
    if ((bullet.y ?? 0) <= y + 64 && dy < 340 && dx < 150) {
      score -= Math.max(0, 150 - dx) * 20 + Math.max(0, 340 - dy) * 3.2;
    }
  }
  for (const enemy of state.enemies || []) {
    if (enemy.kind === 'boss') continue;
    const ex = Number(enemy.x) || 0;
    const ey = Number(enemy.y) || 0;
    if (ex < -80 || ex > viewportWidth + 80) continue;
    const dx = Math.abs(ex - x);
    const dy = Math.abs(ey - y);
    const tacticId = String(state.wave?.tactic?.id || '');
    const tacticMove = String(state.wave?.tactic?.move || '');
    const diveLike = /dive|rush|pincer|strafe|sweep/i.test(`${tacticId} ${tacticMove}`);
    const activeDiver = enemy.state === 'DIVE' || enemy.state === 'RETURN';
    const lowThreat = ey > viewportHeight * 0.62
      ? 1.45
      : ey > viewportHeight * 0.52
        ? 0.82
        : ey > viewportHeight * 0.32
          ? (diveLike && activeDiver ? 0.32 : 0.12)
          : (diveLike && activeDiver ? 0.18 : 0.04);
    const nearX = Math.max(0, 165 - dx);
    const nearY = Math.max(0, 260 - dy);
    score -= nearX * nearX * 0.035 * lowThreat + nearY * 0.42 * lowThreat;
    if (ey > viewportHeight * 0.6 && dy < 130 && dx < 110) {
      score -= 900 * lowThreat;
    }
    if (activeDiver && dy < 260 && dx < 210) {
      score -= 3200 + Math.max(0, 210 - dx) * 22 + Math.max(0, 260 - dy) * 11;
    }
    if (diveLike && activeDiver && ey < y && dx < 145 && dy < viewportHeight * 0.72) {
      score -= (145 - dx) * 14 + (viewportHeight * 0.72 - dy) * 1.8;
    }
  }
  for (const hazard of state.bossHazards || []) {
    if (!hazard || hazard.remainingMs <= 0) continue;
    const armedWeight = hazard.armed ? 1 : 0.45;
    const categoryWeight = hazard.category === 'signature' ? 1.2 : 1;
    if (hazard.kind === 'wall') {
      if (y >= hazard.startY - 40 && y <= hazard.endY + 40) {
        for (const columnX of hazard.columns || []) {
          const dx = Math.abs(x - columnX);
          const dangerWidth = Math.max(28, (hazard.width || 20) * 0.7 + 28);
          if (dx <= dangerWidth) score -= 2200 * armedWeight * categoryWeight;
          else if (dx <= dangerWidth + 54) score -= (dangerWidth + 54 - dx) * 8 * armedWeight;
        }
      }
      continue;
    }

    const dx = x - hazard.sourceX;
    const dy = y - hazard.sourceY;
    const distance = Math.hypot(dx, dy);
    if (hazard.kind === 'ring') {
      const inner = hazard.innerRadius || 0;
      const outer = hazard.outerRadius || 0;
      if (distance >= inner - 30 && distance <= outer + 30) {
        const angle = Math.atan2(dy, dx);
        const inSafeWedge = Math.abs(normalizeAngle(angle - hazard.safeAngle)) <= (hazard.safeWedge || 0);
        if (inSafeWedge) score += 80;
        else score -= 1800 * armedWeight * categoryWeight;
      }
      continue;
    }

    const angleToPoint = Math.atan2(dy, dx);
    const diff = Math.abs(normalizeAngle(angleToPoint - hazard.angle));
    const along = Math.cos(diff) * distance;
    if (along < -32 || along > (hazard.length || viewportHeight * 1.1) + 32) continue;
    const perpendicular = Math.abs(Math.sin(diff) * distance);
    const spread = Math.max(0.02, hazard.spread || 0.12);
    const radius = Math.max(18, hazard.radius || 24);
    const angularHit = diff <= (spread / 2) * 0.92;
    const lineHit = perpendicular <= radius + 18;
    if (angularHit || lineHit) score -= (hazard.kind === 'beam' ? 2300 : 1800) * armedWeight * categoryWeight;
    else if (diff <= spread / 2 + 0.1 || perpendicular <= radius + 58) score -= 480 * armedWeight;
  }
  return score;
}

function scoreMovementPath(state, fromX, fromY, toX, toY) {
  if (!Number.isFinite(fromX) || !Number.isFinite(fromY)) return 0;
  let score = 0;
  const minX = Math.min(fromX, toX) - 54;
  const maxX = Math.max(fromX, toX) + 54;
  const verticalBand = Math.max(150, Math.abs(toY - fromY) + 190);
  for (const bullet of state.enemyBullets || []) {
    const bx = Number(bullet.x) || 0;
    const by = Number(bullet.y) || 0;
    if (by > Math.max(fromY, toY) + 96) continue;
    if (by < Math.min(fromY, toY) - 90 || by > Math.max(fromY, toY) + verticalBand) continue;
    const pathDx = bx >= minX && bx <= maxX ? 0 : Math.min(Math.abs(bx - minX), Math.abs(bx - maxX));
    const dy = Math.abs(by - toY);
    if (pathDx < 135 && dy < 310) {
      score -= (135 - pathDx) * 26 + (310 - dy) * 6.2;
    }
  }
  return score;
}

function chooseIntent(state, viewportWidth, viewportHeight) {
  const playerX = state.player?.x ?? viewportWidth / 2;
  const playerY = state.player?.y ?? viewportHeight * 0.8;
  const margin = 46;
  const combatTop = viewportHeight * 0.45;
  const combatBottom = viewportHeight * 0.66;

  const visibleTargets = (state.enemies || []).filter((enemy) => enemy.x >= 0 && enemy.x <= viewportWidth);
  let targetX = viewportWidth / 2;
  if (visibleTargets.length) {
    if (state.enemyManagerState === 'BOSS_ACTIVE') {
      visibleTargets.sort((a, b) => (b.radius || 0) - (a.radius || 0));
      targetX = visibleTargets[0].x;
    } else {
      const nonBossTargets = visibleTargets.filter((enemy) => enemy.kind !== 'boss');
      if (nonBossTargets.length > 0 && nonBossTargets.length <= 3) {
        const focused = [...nonBossTargets].sort((a, b) => {
          const aY = Number(a.y) || 0;
          const bY = Number(b.y) || 0;
          const aDamage = Math.max(0, (Number(a.maxHealth) || 1) - (Number(a.health) || 1));
          const bDamage = Math.max(0, (Number(b.maxHealth) || 1) - (Number(b.health) || 1));
          const aScore = aY * 1.5 + aDamage * 28 - Math.abs((Number(a.x) || 0) - playerX) * 0.28;
          const bScore = bY * 1.5 + bDamage * 28 - Math.abs((Number(b.x) || 0) - playerX) * 0.28;
          return bScore - aScore;
        })[0];
        targetX = focused?.x ?? visibleTargets[0].x;
      } else {
        const weighted = nonBossTargets.reduce((acc, enemy) => {
          const yWeight = 1 + Math.max(0, Number(enemy.y) || 0) / viewportHeight;
          const damagedWeight = Math.max(1, (Number(enemy.maxHealth) || 1) - (Number(enemy.health) || 1) + 1);
          const edgeWeight = Math.abs((Number(enemy.x) || 0) - viewportWidth * 0.5) > viewportWidth * 0.34 ? 1.18 : 1;
          const weight = yWeight * damagedWeight * edgeWeight;
          acc.x += enemy.x * weight;
          acc.weight += weight;
          return acc;
        }, { x: 0, weight: 0 });
        targetX = weighted.weight > 0 ? weighted.x / weighted.weight : visibleTargets[0].x;
      }
    }
  }

  const nonBossVisibleCount = visibleTargets.filter((enemy) => enemy.kind !== 'boss').length;
  const lowLives = Number.isFinite(state.lives) && state.lives <= 1;
  const cleanupTargets = state.enemyManagerState === 'WAVE_ACTIVE' &&
    nonBossVisibleCount > 0 &&
    nonBossVisibleCount <= 3 &&
    !lowLives;
  const pressure = (state.enemyBullets?.length || 0) +
    visibleTargets.filter((enemy) => enemy.kind !== 'boss' && enemy.y > viewportHeight * 0.48).length * 2;
  const nearbyBulletCount = (state.enemyBullets || []).filter((bullet) => {
    if ((bullet.y ?? 0) > playerY + 96) return false;
    const dx = Math.abs((bullet.x ?? 0) - playerX);
    const dy = Math.abs((bullet.y ?? 0) - playerY);
    return dy < 330 && dx < 190;
  }).length;
  const immediateBulletCount = (state.enemyBullets || []).filter((bullet) => {
    if ((bullet.y ?? 0) > playerY + 90) return false;
    const dx = Math.abs((bullet.x ?? 0) - playerX);
    const dy = Math.abs((bullet.y ?? 0) - playerY);
    return dy < 270 && dx < 165;
  }).length;
  const effectivePressure = cleanupTargets && immediateBulletCount === 0 ? Math.min(pressure, 4) : pressure;
  const highPressure = lowLives || effectivePressure >= 5 || immediateBulletCount > 0;
  const safeLeft = lowLives ? viewportWidth * 0.18 : highPressure ? viewportWidth * 0.15 : margin;
  const safeRight = lowLives ? viewportWidth * 0.82 : highPressure ? viewportWidth * 0.85 : viewportWidth - margin;
  const safeBottom = lowLives ? viewportHeight * 0.64 : highPressure ? viewportHeight * 0.62 : combatBottom;

  const candidateXs = [
    playerX,
    playerX - 150,
    playerX + 150,
    targetX - 180,
    targetX - 90,
    targetX,
    targetX + 90,
    targetX + 180,
    viewportWidth * 0.12,
    viewportWidth * 0.18,
    viewportWidth * 0.25,
    viewportWidth * 0.32,
    viewportWidth * 0.38,
    viewportWidth * 0.5,
    viewportWidth * 0.62,
    viewportWidth * 0.68,
    viewportWidth * 0.75,
    viewportWidth * 0.82,
    viewportWidth * 0.88
  ].map((x) => Math.max(safeLeft, Math.min(safeRight, x)));
  const candidateYs = [
    playerY,
    viewportHeight * 0.48,
    viewportHeight * 0.52,
    viewportHeight * 0.55,
    viewportHeight * 0.58,
    viewportHeight * 0.62,
    viewportHeight * 0.66,
    viewportHeight * 0.7
  ].map((y) => Math.max(combatTop, Math.min(safeBottom, y)));

  let best = { x: playerX, y: playerY, score: Number.NEGATIVE_INFINITY };
  const aimWeight = state.enemyManagerState === 'BOSS_ACTIVE'
    ? (immediateBulletCount > 0 ? 0.18 : 0.35)
    : immediateBulletCount > 0
      ? 0.035
      : cleanupTargets && nearbyBulletCount > 0
        ? 0.36
      : cleanupTargets
        ? 0.58
      : nearbyBulletCount > 0 && nonBossVisibleCount <= 3
        ? 0.18
        : nearbyBulletCount > 0
          ? 0.11
          : nonBossVisibleCount <= 2
        ? 0.38
        : nonBossVisibleCount <= 3
          ? 0.28
          : lowLives
            ? 0.18
            : pressure >= 5
              ? 0.05
              : 0.14;
  for (const x of candidateXs) {
    for (const y of candidateYs) {
      const aimPenalty = Math.abs(x - targetX) * aimWeight;
      const movementPenalty = Math.abs(x - playerX) * 0.04 + Math.abs(y - playerY) * 0.03;
      const preferredY = pressure >= 6 || immediateBulletCount > 0
        ? viewportHeight * 0.66
        : lowLives
          ? viewportHeight * 0.7
        : nearbyBulletCount > 0
          ? viewportHeight * 0.68
          : viewportHeight * 0.7;
      const verticalPreference = Math.abs(y - preferredY) * 0.08;
      const centerBias = Math.abs(x - viewportWidth * 0.5) * (cleanupTargets ? 0.004 : lowLives ? 0.028 : 0.018);
      const edgePenalty = Math.max(0, viewportWidth * (lowLives ? 0.24 : 0.2) - x) * (lowLives ? 2.2 : 1.05) +
        Math.max(0, x - viewportWidth * (lowLives ? 0.76 : 0.8)) * (lowLives ? 2.2 : 1.05);
      const topPenalty = Math.max(0, viewportHeight * (lowLives ? 0.55 : highPressure ? 0.52 : 0.5) - y) * (lowLives ? 2.2 : highPressure ? 1.35 : 0.8);
      const bottomPenalty = Math.max(0, y - viewportHeight * (lowLives ? 0.76 : highPressure ? 0.74 : 0.78)) * (lowLives ? 1.1 : highPressure ? 0.7 : 0.45);
      const score = scoreLane(state, x, y, viewportWidth, viewportHeight) +
        scoreMovementPath(state, playerX, playerY, x, y) -
        aimPenalty -
        movementPenalty -
        verticalPreference -
        centerBias -
        edgePenalty -
        topPenalty -
        bottomPenalty;
      if (score > best.score) best = { x, y, score };
    }
  }

  const deadzoneX = 26;
  const deadzoneY = 24;
  const canDodge = state.player &&
    !state.player.isDodging &&
    !state.player.invulnerable &&
    !state.player.shieldActive &&
    (Number(state.player.dodgeCooldown) || 0) <= 0;
  const urgentBullet = canDodge && (state.enemyBullets || []).some((bullet) => {
    if ((bullet.y ?? 0) > playerY + 90) return false;
    const dx = Math.abs((bullet.x ?? 0) - playerX);
    const dy = Math.abs((bullet.y ?? 0) - playerY);
    const incomingFromAbove = (bullet.y ?? 0) < playerY && dy < 320;
    return (incomingFromAbove && dx < 150) || (dy < 220 && dx < 158);
  });
  const urgentEnemy = canDodge && (state.enemies || []).some((enemy) => {
    if (enemy.kind === 'boss') return false;
    const dx = Math.abs((enemy.x ?? 0) - playerX);
    const dy = Math.abs((enemy.y ?? 0) - playerY);
    const tacticId = String(state.wave?.tactic?.id || '');
    const tacticMove = String(state.wave?.tactic?.move || '');
    const diveLike = /dive|rush|pincer|strafe|sweep/i.test(`${tacticId} ${tacticMove}`);
    const activeDiver = enemy.state === 'DIVE' || enemy.state === 'RETURN';
    return (activeDiver && dy < 270 && dx < 210) ||
      ((enemy.y ?? 0) > viewportHeight * 0.55 && dy < 150 && dx < 118) ||
      (diveLike && activeDiver && (enemy.y ?? 0) < playerY && dy < viewportHeight * 0.72 && dx < 150);
  });

  return {
    horizontal: best.x < playerX - deadzoneX ? 'left' : best.x > playerX + deadzoneX ? 'right' : 'none',
    vertical: best.y < playerY - deadzoneY ? 'up' : best.y > playerY + deadzoneY ? 'down' : 'none',
    dodge: Boolean(urgentBullet || urgentEnemy || (canDodge && (lowLives || immediateBulletCount > 0) && pressure >= 5))
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

  if (currentIntent.dodge) {
    await page.keyboard.up('ShiftLeft');
  }
  if (nextIntent.dodge) {
    await page.keyboard.press('ShiftLeft');
  }

  return { ...nextIntent, dodge: false };
}

function findSectorClearStalls(timeline, limitMs = 15000) {
  const stalls = [];
  let current = null;
  const finishCurrent = () => {
    if (!current) return;
    const durationMs = Math.max(0, current.lastMs - current.startMs);
    if (durationMs >= limitMs) {
      stalls.push({ ...current, durationMs });
    }
    current = null;
  };

  for (const entry of timeline) {
    const state = entry.state || {};
    const blockingCount = Number(state.counts?.enemies) || 0;
    const isBlockedSectorClear = state.scene === 'play' &&
      state.enemyManagerState === 'LEVEL_COMPLETE' &&
      state.wave?.phase === 'COMPLETE' &&
      blockingCount > 0;
    if (!isBlockedSectorClear) {
      finishCurrent();
      continue;
    }

    const key = `${state.level ?? 'unknown'}:${state.currentWaveIndex ?? 'unknown'}`;
    if (!current || current.key !== key) {
      finishCurrent();
      current = {
        key,
        level: state.level ?? null,
        wave: state.wave?.currentWaveNumber ?? null,
        startMs: entry.elapsedMs,
        lastMs: entry.elapsedMs,
        maxBlockingCount: blockingCount
      };
    } else {
      current.lastMs = entry.elapsedMs;
      current.maxBlockingCount = Math.max(current.maxBlockingCount, blockingCount);
    }
  }

  finishCurrent();
  return stalls;
}

function findWaveProgressStalls(timeline, limitMs = 120000) {
  const stalls = [];
  let current = null;
  const finishCurrent = () => {
    if (!current) return;
    const durationMs = Math.max(0, current.lastMs - current.startMs);
    if (durationMs >= limitMs) stalls.push({ ...current, durationMs });
    current = null;
  };

  for (const entry of timeline) {
    const state = entry.state || {};
    const enemyCount = Number(state.counts?.enemies ?? state.enemies?.length) || 0;
    const isActiveWave = state.scene === 'play' &&
      state.enemyManagerState === 'WAVE_ACTIVE' &&
      state.wave?.phase === 'WAVES' &&
      enemyCount > 0;
    if (!isActiveWave) {
      finishCurrent();
      continue;
    }

    const marker = [
      state.level ?? 'unknown',
      state.currentWaveIndex ?? 'unknown',
      Number(state.score) || 0,
      enemyCount
    ].join(':');
    if (!current || current.marker !== marker) {
      finishCurrent();
      current = {
        marker,
        level: state.level ?? null,
        wave: state.wave?.currentWaveNumber ?? null,
        score: Number(state.score) || 0,
        enemyCount,
        startMs: entry.elapsedMs,
        lastMs: entry.elapsedMs
      };
    } else {
      current.lastMs = entry.elapsedMs;
    }
  }

  finishCurrent();
  return stalls;
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

  let currentIntent = { horizontal: 'none', vertical: 'none', dodge: false };
  let heldSpace = false;
  let finalState = null;

  try {
    await gotoWithRetry(page, selectedShipKey ? baseUrl : `${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await assertPreviewAssetsInPage(page);
    if (selectedShipKey) {
      await page.waitForFunction(() => Boolean(window.__game), null, { timeout: 15000 });
      await page.evaluate((shipKey) => {
        localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
          bestScore: 0,
          bestRank: 19,
          bestLevel: 60
        }));
        window.__game.startGame(shipKey);
      }, selectedShipKey);
    }
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
    if (currentIntent.dodge) await page.keyboard.up('ShiftLeft').catch(() => {});
    await browser.close();
    if (server) server.kill();
  }

  const survivedMs = timeline.length ? timeline[timeline.length - 1].elapsedMs : 0;
  const survivalGraceMs = Math.max(500, sampleMs * 2);
  const requiredSurvivalMs = Math.max(0, Math.min(durationMs, minSurvivalMs) - survivalGraceMs);
  const survivedFullDuration = survivedMs >= requiredSurvivalMs;
  const endedInGameOver = Number.isFinite(finalState?.lives) && finalState.lives <= 0;
  const endedOutsidePlay = finalState?.scene && finalState.scene !== 'play';
  const sectorClearStalls = findSectorClearStalls(timeline);
  const waveProgressStalls = findWaveProgressStalls(timeline);
  const report = {
    baseUrl,
    outputDir,
    requestedDurationMs: durationMs,
    minSurvivalMs,
    selectedShipKey,
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
    sectorClearStalls,
    waveProgressStalls,
    timeline
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    outputDir,
    requestedDurationMs: durationMs,
    minSurvivalMs,
    selectedShipKey,
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
    if (request.resourceType === 'media' && request.failure === 'net::ERR_ABORTED') return false;
    if (request.method === 'HEAD' && request.failure === 'net::ERR_ABORTED' && /\/sw\.js(?:\?|$)/.test(request.url)) return false;
    return true;
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
    ...(!allowGameOver && endedOutsidePlay ? [`ended outside play scene (${finalState.scene})`] : []),
    ...sectorClearStalls.map((stall) =>
      `sector clear blocked for ${Math.round(stall.durationMs / 1000)}s at level ${stall.level} wave ${stall.wave} by ${stall.maxBlockingCount} lingering entity`
    ),
    ...waveProgressStalls.map((stall) =>
      `wave progress stalled for ${Math.round(stall.durationMs / 1000)}s at level ${stall.level} wave ${stall.wave} with score ${stall.score} and ${stall.enemyCount} enemies`
    )
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
