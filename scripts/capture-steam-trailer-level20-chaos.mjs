import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHAOS_CAPTURE_HOST || '127.0.0.1';
const port = process.env.CHAOS_CAPTURE_URL ? null : (Number(process.env.CHAOS_CAPTURE_PORT) || await findAvailablePort(4476));
const baseUrl = process.env.CHAOS_CAPTURE_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHAOS_CAPTURE_OUTPUT_DIR || 'release/steam-trailer/level20-chaos');
const viewport = { width: 1920, height: 1080 };
const outputName = 'nova-swarm-level20-chaos-capture.webm';
const canvasOutputName = 'nova-swarm-level20-chaos-canvas-60fps.webm';
const frameSequenceMode = process.env.CHAOS_FRAME_SEQUENCE === '1';
const frameSequenceFps = Number(process.env.CHAOS_FRAME_SEQUENCE_FPS) || 60;
const frameSequenceSeconds = Number(process.env.CHAOS_FRAME_SEQUENCE_SECONDS) || 12;
const frameSequenceChunkSize = Number(process.env.CHAOS_FRAME_SEQUENCE_CHUNK_SIZE) || 8;
const frameSequenceQuality = Number(process.env.CHAOS_FRAME_SEQUENCE_JPEG_QUALITY) || 0.94;
const realisticOpening = process.env.CHAOS_REALISTIC_OPENING === '1';
const captureStartLevel = Number(process.env.CHAOS_START_LEVEL) || (realisticOpening ? 18 : 20);
const captureStartScore = Number(process.env.CHAOS_START_SCORE) || (realisticOpening ? 12800 : 18400);
const captureRankIndex = Number(process.env.CHAOS_RANK_INDEX) || (realisticOpening ? 4 : 5);

const consoleEvents = [];
const pageErrors = [];
const badResponses = [];
const beats = [];

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, String(value));
  return next.toString();
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available chaos capture port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  if (!existsSync(path.resolve('dist', 'index.html'))) {
    throw new Error('dist/index.html is missing. Run npm run build before capturing trailer footage.');
  }

  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function observePage(page) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 900) });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push({ status: response.status(), url: response.url(), method: response.request().method() });
    }
  });
}

async function collectState(page) {
  return page.evaluate(() => {
    try {
      return JSON.parse(window.render_game_to_text?.() || '{}');
    } catch {
      return null;
    }
  });
}

async function waitForPlay(page) {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: String(captureStartLevel)
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state?.scene === 'play' && window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.enemyManager;
    } catch {
      return false;
    }
  }, null, { timeout: 30000 });
}

async function stabilizePlayer(page) {
  await page.evaluate((options) => {
    const realistic = Boolean(options.realisticOpening);
    const assist = () => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const player = play?.player;
      if (!game || !play || !player) return;

      play.introActive = false;
      if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
      play.introOverlay = null;
      if (play.isPaused && typeof play.setPaused === 'function') play.setPaused(false);
      game.inputManager?.setKeyPressed?.('Escape', false);
      game.inputManager?.setKeyPressed?.('KeyP', false);
      game.lives = realistic ? 3 : Math.max(game.lives || 0, 5);

      player.invulnerable = !realistic;
      player.invulnerableTime = realistic ? 0 : 120000;
      player.tractorDebuffImmunityUntil = realistic ? 0 : Date.now() + 120000;
      player.clearStatusEffects?.('steam_trailer_chaos_assist');
      player.x = game.getWidth() * 0.5;
      player.y = game.getHeight() * 0.8;
      player.shootDelay = Math.min(player.shootDelay || 90, realistic ? 54 : 42);
      player.bulletDamage = Math.max(player.bulletDamage || 1, realistic ? 2.2 : 3.4);
      player.bulletSpeed = Math.max(player.bulletSpeed || 10, realistic ? 12 : 13);
      player.multiShot = Math.max(player.multiShot || 1, realistic ? 3 : 4);
      player.rankBoostExtraShots = Math.max(player.rankBoostExtraShots || 0, realistic ? 1 : 2);
      player.rankBoostBulletFx = true;
      player.bulletPierce = true;
      player.activePowerup = { ...(player.activePowerup || {}), type: 'overdrive_core' };
      if (player.sprite) {
        player.sprite.x = player.x;
        player.sprite.y = player.y;
        player.sprite.alpha = 1;
        player.sprite.visible = true;
      }

      play.bulletManager?.enemyBullets?.forEach((bullet) => { bullet.active = false; });
      play.dismissActiveToastsBelowPriority?.(99);
      play.toastQueue = [];
      play.toastTopQueue = [];
      play.toastCornerQueue = [];
    };
    clearInterval(window.__steamLevel20ChaosAssist);
    window.__steamLevel20ChaosAssist = window.setInterval(assist, 100);
    assist();
  }, { realisticOpening });
}

async function stageChaos(page, variant = 0) {
  return page.evaluate(({ variantIndex, realisticOpening: realistic, captureStartLevel: startLevel, captureStartScore: startScore, captureRankIndex: rankIndex }) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    const player = play?.player;
    if (!game || !play || !manager || !player) throw new Error('Missing play surface for chaos capture');

    game.markUnrankedRun?.('steam_trailer_chaos_capture');
    game.level = startLevel;
    game.score = Math.max(game.score || 0, startScore);
    game.rankIndex = Math.max(game.rankIndex || 0, rankIndex);
    game.lives = realistic ? 3 : Math.max(game.lives || 0, 5);
    player.invulnerable = !realistic;
    player.invulnerableTime = realistic ? 0 : 120000;
    player.tractorDebuffImmunityUntil = realistic ? 0 : Date.now() + 120000;
    player.clearStatusEffects?.('steam_trailer_chaos_stage');
    player.shootCooldown = 0;
    manager.level = startLevel;
    manager.state = 'WAVE_ACTIVE';
    manager.phase = 'WAVES';
    manager.waveEnding = false;
    manager.cleanupPhase = 'NONE';
    manager.currentWaveIndex = Math.max(2, variantIndex + 2);
    manager.normalWavesTotal = 6;
    manager.setDirectorState?.(realistic
      ? { tier: 4, spawnCadenceScale: 1.28, eliteChance: 0.34, clutchDropChance: 0.06 }
      : { tier: 5, spawnCadenceScale: 2.1, eliteChance: 0.76, clutchDropChance: 0.08 });

    manager.clearEnemies?.();
    manager.hijacker = null;
    if (play.bulletManager) {
      play.bulletManager.enemyBullets.forEach((bullet) => { bullet.active = false; });
      play.bulletManager.enemyBullets = [];
      play.bulletManager.playerBullets.forEach((bullet) => { bullet.active = false; });
      play.bulletManager.playerBullets = [];
    }

    const waveSets = realistic ? [
      [
        { type: 'nova_enemy_046', count: 10, formation: 'SCREEN_DOOR', tactic: 'weave_wall', entry: 'split', cadence: 1.45 },
        { type: 'nova_enemy_052', count: 7, formation: 'CROSS_STREAM', tactic: 'crossfire_pincer', entry: 'alternating', cadence: 1.35 }
      ],
      [
        { type: 'nova_enemy_057', count: 11, formation: 'PINCER', tactic: 'ambush_lattice', entry: 'split', cadence: 1.45 },
        { type: 'nova_enemy_061', count: 7, formation: 'ORBIT_RING', tactic: 'orbit_snare', entry: 'single', cadence: 1.25 }
      ]
    ] : [
      [
        { type: 'nova_enemy_046', count: 16, formation: 'SCREEN_DOOR', tactic: 'weave_wall', entry: 'split', cadence: 2.4 },
        { type: 'nova_enemy_052', count: 14, formation: 'CROSS_STREAM', tactic: 'crossfire_pincer', entry: 'alternating', cadence: 2.2 }
      ],
      [
        { type: 'nova_enemy_057', count: 18, formation: 'PINCER', tactic: 'ambush_lattice', entry: 'split', cadence: 2.3 },
        { type: 'nova_enemy_061', count: 12, formation: 'ORBIT_RING', tactic: 'orbit_snare', entry: 'single', cadence: 2.0 }
      ]
    ];
    const configs = waveSets[variantIndex % waveSets.length];
    configs.forEach((config) => manager.spawnWave({ ...config }));

    const screenW = game.getWidth();
    const screenH = game.getHeight();
    const enemies = manager.enemies.filter((enemy) => enemy?.kind !== 'boss');
    const cols = realistic ? 7 : 9;
    enemies.forEach((enemy, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = screenW * (realistic ? 0.18 : 0.13) + col * (screenW * (realistic ? 0.64 : 0.74) / Math.max(1, cols - 1));
      const y = screenH * 0.14 + (row % (realistic ? 3 : 4)) * (screenH * (realistic ? 0.095 : 0.08)) + ((index + variantIndex) % 2) * (realistic ? 12 : 18);
      enemy.waitingForEntry = false;
      enemy.active = true;
      enemy.state = !realistic && index % 7 === 0 ? 'DIVE' : 'FORMATION';
      enemy.x = x;
      enemy.y = y;
      enemy.formationX = x;
      enemy.formationY = y;
      enemy.shootCooldown = realistic ? 9000 + (index % 8) * 500 : Math.random() * 14;
      enemy.tacticalDiveAt = Date.now() + (realistic ? 1400 : 280) + (index % 8) * (realistic ? 180 : 115);
      enemy.tacticalDiveUsed = false;
      if (enemy.sprite) {
        enemy.sprite.visible = true;
        enemy.sprite.renderable = true;
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        enemy.sprite.alpha = 1;
      }
      enemy.updateHealthBar?.();
    });

    manager.spawnEliteMiddleShip?.(variantIndex % 2 === 0 ? 'nova_elite_jammer_disruptor' : 'nova_elite_sniper_rail', {
      formation: 'ELITE_CAPTURE',
      waveColor: 'Black',
      entry: 'single',
      delayMs: 0
    });
    const elite = manager.enemies.find((enemy) => enemy?.kind === 'elite_middle_ship');
    if (elite) {
      elite.waitingForEntry = false;
      elite.active = true;
      elite.state = 'FORMATION';
      elite.x = screenW * (variantIndex % 2 === 0 ? 0.28 : 0.72);
      elite.y = screenH * 0.19;
      elite.formationX = elite.x;
      elite.formationY = elite.y;
      if (elite.sprite) {
        elite.sprite.visible = true;
        elite.sprite.x = elite.x;
        elite.sprite.y = elite.y;
      }
      if (elite.eliteAbility) {
        elite.eliteAbility.state = 'active';
        elite.eliteAbility.startedAt = Date.now();
        elite.eliteAbility.activeUntil = Date.now() + 5200;
      }
    }

    if (!realistic) manager.spawnHijacker?.();
    const hijacker = manager.hijacker;
    if (hijacker) {
      hijacker.x = screenW * 0.52;
      hijacker.y = screenH * 0.12;
      hijacker.baseY = hijacker.y;
      hijacker.beamActiveMs = 4400;
      hijacker.beamWarningMs = 80;
      if (hijacker.sprite) {
        hijacker.sprite.x = hijacker.x;
        hijacker.sprite.y = hijacker.y;
      }
      hijacker.activateBeam?.(player.x, player.y);
      hijacker.updateTractorBeam?.(0.9, player.x, player.y);
      hijacker.updateBeamVisual?.(0.9, true, player.x, player.y);
      player.tractorDebuffImmunityUntil = Date.now() + 120000;
      player.clearStatusEffects?.('steam_trailer_chaos_hijacker_visual_only');
    }

    let stagedPlayerBullets = 0;
    for (let i = 0; i < (realistic ? 5 : 10); i += 1) {
      player.shootCooldown = 0;
      player.clearStatusEffects?.('steam_trailer_chaos_shoot');
      const bullets = player.shoot?.() || [];
      if (!bullets.length) break;
      bullets.forEach((bullet, shotIndex) => {
        bullet.x = player.x + (shotIndex - (bullets.length - 1) / 2) * 18 + (i - 5) * 10;
        bullet.y = player.y - 50 - (i % 5) * 34;
        bullet.vx = (shotIndex - (bullets.length - 1) / 2) * 0.34;
        bullet.vy = -Math.abs(bullet.vy || 11);
        if (bullet.sprite) {
          bullet.sprite.x = bullet.x;
          bullet.sprite.y = bullet.y;
          bullet.sprite.visible = true;
        }
        play.bulletManager?.addPlayerBullet?.(bullet);
        stagedPlayerBullets += 1;
      });
    }

    let stagedEnemyBullets = 0;
    enemies.slice(0, realistic ? 0 : 20).forEach((enemy, enemyIndex) => {
      enemy.shootCooldown = 0;
      const targetX = realistic ? player.x + ((enemyIndex % 3) - 1) * 115 : player.x;
      const targetY = realistic ? player.y - 24 - (enemyIndex % 2) * 40 : player.y;
      const shots = enemy.shoot?.(targetX, targetY);
      if (!shots) return;
      const list = Array.isArray(shots) ? shots : [shots];
      list.slice(0, realistic ? 1 : 3).forEach((shot) => {
        if (shot.sprite) {
          shot.sprite.x = shot.x;
          shot.sprite.y = shot.y;
          shot.sprite.visible = true;
        }
        play.bulletManager?.addEnemyBullet?.(shot);
        stagedEnemyBullets += 1;
      });
    });

    if (hijacker?.shoot) {
      for (let i = 0; i < 3; i += 1) {
        const shot = hijacker.shoot(player.x, player.y);
        if (!shot) continue;
        shot.x = hijacker.x + (i - 1) * 30;
        shot.y = hijacker.y + 160 + i * 52;
        if (shot.sprite) {
          shot.sprite.x = shot.x;
          shot.sprite.y = shot.y;
        }
        play.bulletManager?.addEnemyBullet?.(shot);
        stagedEnemyBullets += 1;
      }
    }

    return {
      level: game.level,
      enemies: manager.enemies.length,
      enemyBullets: play.bulletManager?.enemyBullets?.length || 0,
      playerBullets: play.bulletManager?.playerBullets?.length || 0,
      stagedEnemyBullets,
      stagedPlayerBullets,
      hijacker: Boolean(manager.hijacker),
      elite: Boolean(elite)
    };
  }, { variantIndex: variant, realisticOpening, captureStartLevel, captureStartScore, captureRankIndex });
}

async function maintainChaos(page) {
  await page.evaluate((options) => {
    const realistic = Boolean(options.realisticOpening);
    const elapsedMs = realistic
      ? Math.max(0, Number(window.__steamFrameSequenceNow || Date.now()) - Number(window.__steamFrameSequenceStartTime || Date.now()))
      : 0;
    const earlyRealisticOpening = realistic && elapsedMs < 7600;
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    const player = play?.player;
    if (!game || !play || !manager || !player) return;
    if (!realistic) game.lives = Math.max(game.lives || 0, 5);
    if (!realistic) {
      player.invulnerable = true;
      player.invulnerableTime = 120000;
      player.tractorDebuffImmunityUntil = Date.now() + 120000;
    }
    player.clearStatusEffects?.('steam_trailer_chaos_maintain');
    player.shootCooldown = 0;

    if ((play.bulletManager?.playerBullets?.length || 0) < (realistic ? 42 : 90)) {
      for (let volley = 0; volley < (realistic ? 1 : 2); volley += 1) {
        player.shootCooldown = 0;
        const bullets = player.shoot?.() || [];
        bullets.forEach((bullet, index) => {
          bullet.x = player.x + (index - (bullets.length - 1) / 2) * 16 + (volley ? 9 : -9);
          bullet.y = player.y - 34 - volley * 28;
          if (bullet.sprite) {
            bullet.sprite.x = bullet.x;
            bullet.sprite.y = bullet.y;
            bullet.sprite.visible = true;
          }
          play.bulletManager?.addPlayerBullet?.(bullet);
        });
      }
    }

    if ((play.bulletManager?.enemyBullets?.length || 0) < (realistic ? (earlyRealisticOpening ? -1 : 24) : 70)) {
      manager.enemies?.filter((enemy) => enemy?.active !== false && !enemy.waitingForEntry).slice(0, realistic ? (earlyRealisticOpening ? 2 : 3) : 8).forEach((enemy, enemyIndex) => {
        enemy.shootCooldown = 0;
        const targetX = realistic ? player.x + ((enemyIndex % 3) - 1) * (earlyRealisticOpening ? 180 : 120) : player.x;
        const targetY = realistic ? player.y - (earlyRealisticOpening ? 92 : 36) : player.y;
        const shots = enemy.shoot?.(targetX, targetY);
        if (!shots) return;
        (Array.isArray(shots) ? shots : [shots]).slice(0, realistic ? 1 : 2).forEach((shot) => {
          if (shot.sprite) {
            shot.sprite.x = shot.x;
            shot.sprite.y = shot.y;
            shot.sprite.visible = true;
          }
          play.bulletManager?.addEnemyBullet?.(shot);
        });
      });
    }

    if ((manager.enemies?.length || 0) < (realistic ? 13 : 20) && !earlyRealisticOpening) {
      manager.spawnWave?.({
        type: 'nova_enemy_058',
        count: realistic ? 6 : 10,
        formation: 'DIAGONAL_RAID',
        tactic: 'rush_feint',
        entry: 'split',
        cadence: realistic ? 1.35 : 2.1
      });
      manager.enemies?.forEach((enemy, index) => {
        if (!enemy?.waitingForEntry) return;
        const screenW = game.getWidth();
        const screenH = game.getHeight();
        enemy.waitingForEntry = false;
        enemy.active = true;
        enemy.state = 'FORMATION';
        enemy.x = screenW * (0.16 + (index % 8) * 0.1);
        enemy.y = screenH * (0.14 + (Math.floor(index / 8) % (realistic ? 3 : 4)) * (realistic ? 0.095 : 0.08));
        enemy.formationX = enemy.x;
        enemy.formationY = enemy.y;
        if (enemy.sprite) {
          enemy.sprite.visible = true;
          enemy.sprite.x = enemy.x;
          enemy.sprite.y = enemy.y;
        }
      });
    }
  }, { realisticOpening });
}

async function startCanvasRecording(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas?.captureStream) throw new Error('Canvas captureStream is not available');
    const stream = canvas.captureStream(60);
    const preferred = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ].find((mime) => window.MediaRecorder?.isTypeSupported?.(mime));
    if (!preferred) throw new Error('No supported MediaRecorder webm codec found');
    const recorder = new MediaRecorder(stream, {
      mimeType: preferred,
      videoBitsPerSecond: 24_000_000
    });
    window.__steamChaosCanvasChunks = [];
    window.__steamChaosCanvasRecorder = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) window.__steamChaosCanvasChunks.push(event.data);
    };
    recorder.start(250);
    return { mimeType: preferred };
  });
}

async function stopCanvasRecording(page, targetPath) {
  const base64 = await page.evaluate(async () => {
    const recorder = window.__steamChaosCanvasRecorder;
    if (!recorder) throw new Error('Canvas recorder was not started');
    if (recorder.state !== 'inactive') {
      await new Promise((resolve) => {
        recorder.addEventListener('stop', resolve, { once: true });
        recorder.stop();
      });
    }
    const blob = new Blob(window.__steamChaosCanvasChunks || [], { type: recorder.mimeType || 'video/webm' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  });
  writeFileSync(targetPath, Buffer.from(base64, 'base64'));
}

async function runBeat(page, label, durationMs, keyPattern = 'sweep') {
  const state = await collectState(page);
  beats.push({
    label,
    durationMs,
    scene: state?.scene,
    level: state?.level,
    counts: state?.counts || null,
    wave: state?.wave || null
  });

  await page.keyboard.down('Space');
  const steps = Math.ceil(durationMs / 420);
  for (let i = 0; i < steps; i += 1) {
    const key = keyPattern === 'zigzag'
      ? (i % 4 < 2 ? 'ArrowLeft' : 'ArrowRight')
      : (i % 6 < 3 ? 'ArrowRight' : 'ArrowLeft');
    await page.keyboard.down(key);
    if (i % 3 === 0) await page.keyboard.down('ArrowUp');
    await maintainChaos(page);
    await page.waitForTimeout(Math.min(420, durationMs - i * 420));
    await page.keyboard.up(key);
    await page.keyboard.up('ArrowUp');
  }
  await page.keyboard.up('Space');
}

async function prepareDeterministicFrameSequence(page) {
  await page.evaluate((options) => {
    clearInterval(window.__steamLevel20ChaosAssist);
    window.__steamChaosRealisticOpening = Boolean(options.realisticOpening);
    window.__steamFrameSequenceNow = Date.now();
    window.__steamFrameSequenceStartTime = window.__steamFrameSequenceNow;
    if (!window.__steamFrameSequenceRealDateNow) {
      window.__steamFrameSequenceRealDateNow = Date.now.bind(Date);
    }
    Date.now = () => window.__steamFrameSequenceNow;
    window.__app?.ticker?.stop?.();
    window.__burtKeyboardOverride = { Space: true };
  }, { realisticOpening });
}

async function captureFrameSequenceChunk(page, { startFrame, frameCount, fps, quality }) {
  return page.evaluate(({ startFrame: chunkStart, frameCount: chunkCount, fps: captureFps, quality: jpegQuality }) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found for frame sequence capture');
    const frames = [];
    const frameMs = 1000 / captureFps;
    for (let index = 0; index < chunkCount; index += 1) {
      const frameIndex = chunkStart + index;
      window.__steamFrameSequenceNow += frameMs;

      const realistic = Boolean(window.__steamChaosRealisticOpening);
      const sweep = Math.sin(frameIndex / (realistic ? 26 : 20));
      window.__burtKeyboardOverride = {
        Space: true,
        ArrowLeft: sweep < (realistic ? -0.1 : -0.18),
        ArrowRight: sweep > (realistic ? 0.1 : 0.18),
        ArrowUp: frameIndex % (realistic ? 110 : 90) < (realistic ? 46 : 38)
      };

      window.advanceTime?.(frameMs);
      window.__app?.renderer?.render?.(window.__app.stage);
      const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      frames.push(dataUrl.slice(dataUrl.indexOf(',') + 1));
    }
    return frames;
  }, { startFrame, frameCount, fps, quality });
}

async function captureDeterministicFrameSequence(page, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  await prepareDeterministicFrameSequence(page);

  const totalFrames = Math.round(frameSequenceFps * frameSequenceSeconds);
  for (let startFrame = 0; startFrame < totalFrames; startFrame += frameSequenceChunkSize) {
    if (startFrame > 0 && startFrame % Math.round(frameSequenceFps) === 0) {
      await maintainChaos(page);
    }
    const frameCount = Math.min(frameSequenceChunkSize, totalFrames - startFrame);
    const frames = await captureFrameSequenceChunk(page, {
      startFrame,
      frameCount,
      fps: frameSequenceFps,
      quality: frameSequenceQuality
    });
    frames.forEach((base64, index) => {
      const frameNumber = String(startFrame + index + 1).padStart(5, '0');
      writeFileSync(path.join(targetDir, `frame_${frameNumber}.jpg`), Buffer.from(base64, 'base64'));
    });
  }

  return { frameDir: targetDir, totalFrames, fps: frameSequenceFps, seconds: frameSequenceSeconds };
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox']
});
const context = await browser.newContext({
  viewport,
  recordVideo: { dir: outputDir, size: viewport }
});
const page = await context.newPage();
observePage(page);

const recordStartedAt = Date.now();
let videoPath = null;
let actionStartOffsetSeconds = null;
let firstStage = null;
let secondStage = null;
let canvasRecorder = null;

try {
  await waitForPlay(page);
  await stabilizePlayer(page);
  firstStage = await stageChaos(page, 0);
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(outputDir, 'level20-chaos-opening-frame.png'), fullPage: true });
  actionStartOffsetSeconds = Number(((Date.now() - recordStartedAt) / 1000).toFixed(3));
  if (frameSequenceMode) {
    canvasRecorder = await captureDeterministicFrameSequence(page, path.join(outputDir, 'frames'));
    secondStage = await collectState(page);
    await page.screenshot({ path: path.join(outputDir, 'level20-chaos-second-frame.png'), fullPage: true });
  } else {
    canvasRecorder = await startCanvasRecording(page);
    await runBeat(page, 'level20_enemy_wall_hijacker', 11200, 'sweep');
    secondStage = await stageChaos(page, 1);
    await page.waitForTimeout(280);
    await page.screenshot({ path: path.join(outputDir, 'level20-chaos-second-frame.png'), fullPage: true });
    await runBeat(page, 'level20_crossfire_elite_pressure', 6000, 'zigzag');
    await stopCanvasRecording(page, path.join(outputDir, canvasOutputName));
  }

  const video = page.video();
  await page.close();
  videoPath = await video.path();
} finally {
  await context.close();
  await browser.close();
  if (server) server.kill();
}

const capturePath = path.join(outputDir, outputName);
if (videoPath) copyFileSync(videoPath, capturePath);

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  viewport,
  source: 'Built from live Nova Swarm runtime via unranked debug route startLevel=20.',
  capture: outputName,
  canvasCapture: canvasOutputName,
  frameSequenceMode,
  canvasRecorder,
  actionStartOffsetSeconds,
  intendedActionDurationSeconds: 17,
  firstStage,
  secondStage,
  beats,
  consoleEvents,
  pageErrors,
  badResponses
};
writeFileSync(path.join(outputDir, 'level20-chaos-capture-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if ((!videoPath && !frameSequenceMode) || pageErrors.length || badResponses.length) {
  console.error(JSON.stringify({ videoPath, pageErrors, badResponses }, null, 2));
  process.exit(1);
}

console.log(`[chaos-capture] wrote ${capturePath}`);
console.log(`[chaos-capture] actionStartOffsetSeconds=${actionStartOffsetSeconds}`);
