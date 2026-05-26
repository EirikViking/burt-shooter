import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.OVERRUN_CAPTURE_HOST || '127.0.0.1';
const port = process.env.OVERRUN_CAPTURE_URL ? null : (Number(process.env.OVERRUN_CAPTURE_PORT) || await findAvailablePort(4494));
const baseUrl = process.env.OVERRUN_CAPTURE_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.OVERRUN_CAPTURE_OUTPUT_DIR || `test-results/overrun-clear-${timestamp()}`);
const viewport = { width: 1280, height: 720 };
const outputVideo = path.join(outputDir, 'sector10-clear-into-overrun.webm');
const finalScreenshot = path.join(outputDir, 'sector11-overrun-frame.png');
const reportPath = path.join(outputDir, 'report.json');
const consoleEvents = [];
const pageErrors = [];
const badResponses = [];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

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
  throw new Error(`No available overrun capture port found starting at ${startPort}`);
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
    throw new Error('dist/index.html is missing. Run npm run build:current before capture.');
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
    const text = message.text();
    const interesting = /\b(Boss|Overrun|RUN CLEAR|EnemyManager|Level|RunClear|BossFlow)\b/i.test(text);
    if (message.type() === 'error' || message.type() === 'warning' || interesting) {
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

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function startMixedRecording(page) {
  return page.evaluate(async () => {
    await window.__novaCaptureAudioContext?.resume?.();
    const canvas = document.querySelector('canvas');
    if (!canvas?.captureStream) throw new Error('Canvas captureStream is not available');
    const canvasStream = canvas.captureStream(60);
    const audioTracks = window.__novaCaptureAudioDestination?.stream?.getAudioTracks?.() || [];
    const stream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks
    ]);
    const preferred = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm'
    ].find((mime) => window.MediaRecorder?.isTypeSupported?.(mime));
    if (!preferred) throw new Error('No supported MediaRecorder webm codec found');
    const recorder = new MediaRecorder(stream, {
      mimeType: preferred,
      videoBitsPerSecond: 16_000_000,
      audioBitsPerSecond: 192_000
    });
    window.__overrunClearChunks = [];
    window.__overrunClearRecorder = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) window.__overrunClearChunks.push(event.data);
    };
    recorder.start(250);
    return {
      mimeType: preferred,
      audioTracks: audioTracks.length,
      videoTracks: canvasStream.getVideoTracks().length
    };
  });
}

async function stopMixedRecording(page, targetPath) {
  const base64 = await page.evaluate(async () => {
    const recorder = window.__overrunClearRecorder;
    if (!recorder) throw new Error('Overrun recorder was not started');
    if (recorder.state !== 'inactive') {
      await new Promise((resolve) => {
        recorder.addEventListener('stop', resolve, { once: true });
        recorder.stop();
      });
    }
    const blob = new Blob(window.__overrunClearChunks || [], { type: recorder.mimeType || 'video/webm' });
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

async function prepareSectorTenBoss(page) {
  return page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) throw new Error('Game, PlayScene, or EnemyManager missing');

    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.introOverlay = null;
    play.introActive = false;
    play.introComplete = true;
    play.shipIntroToken = (Number(play.shipIntroToken) || 0) + 1;
    play.isPaused = false;

    game.level = 10;
    game.score = 180000;
    game.lives = 3;
    game.runCleared = false;
    game.runClearReason = null;
    game.runClearLivesRemaining = 0;
    game.runFinalized = false;
    game.runSummary = null;
    game.runMode = 'ranked';
    game.isDebugRun = false;
    game.scoreBreakdown = game.createEmptyScoreBreakdown();

    manager.clearEnemies();
    manager.level = 10;
    manager.currentWaveIndex = 0;
    manager.normalWavesTotal = 0;
    manager.bossWaveIndex = 0;
    manager.waves = [];
    manager.pendingWaveConfig = null;
    manager.currentWaveTactic = null;
    manager.isBossLevel = true;
    manager.bossDefeatedThisLevel = false;
    manager.bossDefeatCelebrated = false;
    manager.bossSpawnedThisLevel = false;
    manager.bossBlockLogged = false;
    manager.cleanupTimer = 0;
    manager.cleanupPhase = 'NONE';
    manager.waveEnding = false;
    manager.bossGateTimer = 0;
    manager.state = 'CAPTURE_SETUP';
    manager.phase = 'BOSS';
    await manager.spawnBoss(10, {
      x: game.getWidth() * 0.5,
      y: Math.max(96, game.getHeight() * 0.17)
    });
    manager.enemies.forEach((enemy) => {
      if (enemy === manager.boss) return;
      enemy.active = false;
      if (enemy.sprite?.parent) enemy.sprite.parent.removeChild(enemy.sprite);
      if (typeof enemy.destroy === 'function') enemy.destroy();
    });
    manager.enemies = manager.boss ? [manager.boss] : [];
    manager.state = 'BOSS_ACTIVE';
    manager.phase = 'BOSS';
    manager.spawning = false;
    manager.bossSpawning = false;
    manager.bossSpawnedAtMs = Date.now() - 4000;
    if (manager.boss) {
      manager.boss.spawnedAtMs = Date.now() - 4000;
      manager.boss.health = Math.max(1, Math.floor((manager.boss.maxHealth || 80) * 0.16));
      manager.boss.active = true;
      if (manager.boss.sprite) {
        manager.boss.sprite.visible = true;
        manager.boss.sprite.alpha = 1;
      }
    }
    if (play.player?.sprite) {
      play.player.x = game.getWidth() * 0.5;
      play.player.y = game.getHeight() * 0.78;
      play.player.sprite.x = play.player.x;
      play.player.sprite.y = play.player.y;
    }
    play.damageTakenThisSector = 1;
    play.levelAdvancePending = false;
    return JSON.parse(window.render_game_to_text?.() || '{}');
  });
}

async function triggerBossDefeat(page) {
  return page.evaluate(() => {
    const manager = window.__game?.scenes?.play?.enemyManager;
    if (!manager?.boss) throw new Error('Boss missing for defeat trigger');
    manager.bossSpawnedAtMs = Date.now() - 5000;
    manager.boss.spawnedAtMs = Date.now() - 5000;
    manager.boss.active = true;
    manager.boss.health = 0;
    manager.update?.(1);
    return {
      level: window.__game?.level,
      bossHp: manager.boss.health,
      state: manager.state,
      phase: manager.phase,
      bossDefeatedThisLevel: Boolean(manager.bossDefeatedThisLevel)
    };
  });
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu', '--no-sandbox']
});
const context = await browser.newContext({ viewport });
await context.addInitScript(() => {
  localStorage.setItem('burt_music_enabled', 'true');
  localStorage.setItem('burt_voice_enabled', 'true');
  localStorage.setItem('burt_cta_voice_enabled', 'true');
  localStorage.setItem('burt_volume_master', '0.9');
  localStorage.setItem('burt_volume_music', '0.35');
  localStorage.setItem('burt_volume_sfx', '0.85');
  localStorage.setItem('burt_volume_voice', '0.75');
  localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
  window.__novaLeaderboardMode = 'local';

  const NativeAudio = window.Audio;
  const CaptureAudioContext = window.AudioContext || window.webkitAudioContext;
  const captureContext = CaptureAudioContext ? new CaptureAudioContext() : null;
  const destination = captureContext?.createMediaStreamDestination?.() || null;
  const wired = new WeakSet();
  const wireAudio = (audio) => {
    if (!captureContext || !destination || !audio || wired.has(audio)) return audio;
    try {
      const source = captureContext.createMediaElementSource(audio);
      source.connect(destination);
      source.connect(captureContext.destination);
      wired.add(audio);
    } catch {
      // The element may already be connected by another path.
    }
    return audio;
  };
  function PatchedAudio(src) {
    return wireAudio(new NativeAudio(src));
  }
  PatchedAudio.prototype = NativeAudio.prototype;
  Object.setPrototypeOf(PatchedAudio, NativeAudio);
  window.Audio = PatchedAudio;
  window.__novaCaptureAudioContext = captureContext;
  window.__novaCaptureAudioDestination = destination;
  window.__novaWireAudio = wireAudio;
});

const page = await context.newPage();
observePage(page);

let preparedState = null;
let recorderInfo = null;
let defeatTrigger = null;
let finalState = null;

try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    offlineLeaderboard: '1',
    overrunClearCapture: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state?.scene === 'play' && window.__game?.scenes?.play?.enemyManager;
    } catch {
      return false;
    }
  }, null, { timeout: 30000 });

  await page.mouse.click(viewport.width / 2, viewport.height / 2);
  preparedState = await prepareSectorTenBoss(page);
  await page.waitForTimeout(900);

  recorderInfo = await startMixedRecording(page);
  await page.waitForTimeout(1000);
  defeatTrigger = await triggerBossDefeat(page);
  await page.waitForFunction(() => {
    const game = window.__game;
    return game?.runCleared === true && game?.level >= 11;
  }, null, { timeout: 9000 });
  await page.waitForTimeout(2600);
  finalState = await readState(page);
  await page.screenshot({ path: finalScreenshot, fullPage: true });
  await page.waitForTimeout(4300);
  await stopMixedRecording(page, outputVideo);

  const report = {
    ok: true,
    baseUrl,
    outputVideo,
    finalScreenshot,
    recorderInfo,
    prepared: {
      scene: preparedState?.scene,
      level: preparedState?.level,
      score: preparedState?.score,
      lives: preparedState?.lives,
      boss: preparedState?.boss ? {
        active: preparedState.boss.active,
        health: preparedState.boss.health,
        maxHealth: preparedState.boss.maxHealth,
        name: preparedState.boss.name
      } : null
    },
    defeatTrigger,
    final: {
      scene: finalState?.scene,
      level: finalState?.level,
      score: finalState?.score,
      lives: finalState?.lives,
      arcadeRun: finalState?.arcadeRun,
      wave: finalState?.wave,
      counts: finalState?.counts,
      toast: finalState?.toast,
      audio: finalState?.audio
    },
    consoleEvents,
    pageErrors,
    badResponses
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (pageErrors.length || badResponses.length || consoleEvents.some((entry) => entry.type === 'error')) {
    console.warn(`[overrun-clear-capture] captured with diagnostics; report=${reportPath}`);
  }
  console.log(`[overrun-clear-capture] PASS video=${outputVideo} screenshot=${finalScreenshot} report=${reportPath}`);
} catch (error) {
  const fallbackState = await readState(page).catch(() => null);
  writeFileSync(reportPath, `${JSON.stringify({
    ok: false,
    error: error?.stack || error?.message || String(error),
    preparedState,
    recorderInfo,
    defeatTrigger,
    fallbackState,
    consoleEvents,
    pageErrors,
    badResponses
  }, null, 2)}\n`, 'utf8');
  throw error;
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
