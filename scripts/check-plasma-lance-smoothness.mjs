import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4791));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const durationMs = Math.max(1000, Math.floor(Number(process.env.CHECK_DURATION_MS) || 60000));
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/plasma-lance-smoothness-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
  for (let candidate = startPort; candidate < startPort + 50; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available Plasma Lance smoothness port found starting at ${startPort}`);
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

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
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
  throw new Error(`Vite dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))];
}

function summarizeIntervals(intervals) {
  const useful = intervals.filter((value) => Number.isFinite(value) && value > 0);
  const average = useful.length ? useful.reduce((sum, value) => sum + value, 0) / useful.length : 0;
  return {
    frames: useful.length,
    p50Ms: Number(percentile(useful, 0.5).toFixed(2)),
    p95Ms: Number(percentile(useful, 0.95).toFixed(2)),
    p99Ms: Number(percentile(useful, 0.99).toFixed(2)),
    maxMs: Number((useful.length ? Math.max(...useful) : 0).toFixed(2)),
    averageMs: Number(average.toFixed(2)),
    averageFps: average > 0 ? Number((1000 / average).toFixed(1)) : 0,
    longFrames20: useful.filter((value) => value > 20).length,
    longFrames25: useful.filter((value) => value > 25).length,
    longFrames33: useful.filter((value) => value > 33.34).length,
    longFrames50: useful.filter((value) => value > 50).length
  };
}

function makeProgress() {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 42100,
    pilotRank: 8,
    highestPilotRank: 8,
    totalRuns: 16,
    bestScore: 90000,
    bestRank: 8,
    bestLevel: 12,
    bestSector: 12,
    totalBossesDefeated: 5,
    totalWavesCleared: 50,
    unlockedShipIds: Array.from({ length: 12 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`),
    updatedAt: '2026-06-24T00:00:00.000Z'
  };
}

async function seedProfile(page) {
  await page.addInitScript((progress) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: progress.bestScore,
      bestRank: progress.bestRank,
      bestLevel: progress.bestLevel
    }));
    localStorage.setItem('novaSwarm.localLeaderboard.v2', '[]');
    localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', '[]');
  }, makeProgress());
}

function withQuery(query = {}) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
  return url.toString();
}

async function startMayhem(page) {
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, { timeout: 30000 });
  await page.evaluate(async () => {
    await window.__game.startGame(undefined, { runMode: 'ranked' });
  });
  await page.waitForFunction(() => {
    return window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.hud;
  }, null, { timeout: 30000 });
}

async function installChaosHarness(page, sampleMs) {
  return page.evaluate((duration) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play?.player || !play?.enemyManager || !play?.bulletManager) {
      throw new Error('Play scene is not ready for Plasma Lance smoothness harness');
    }

    play.performanceDiagnostics?.setOptions?.({ enabled: true, noLeaderboardTargets: true });
    window.__novaMayhemPerformanceDiagnostics?.reset?.();
    play.freezeTimerMs = 0;
    play.lastHitStopRequestMs = 0;
    game.level = Math.max(12, Number(game.level) || 1);
    game.lives = 99;
    play.enemyManager.level = game.level;
    play.enemyManager.state = 'WAVE_ACTIVE';
    play.enemyManager.phase = 'WAVES';
    play.enemyManager.waveEnding = false;
    play.enemyManager.spawning = false;
    play.enemyManager.cleanupPhase = 'NONE';
    play.enemyManager.cleanupTimer = 0;
    play.enemyManager.currentNormalWaveDifficultyLevel = game.level;
    play.player.invulnerable = true;
    play.player.invulnerableTime = duration + 15000;
    play.player.applyPowerup?.('plasma_lance');
    play.player.setActivePowerupDuration?.('plasma_lance', duration + 15000);
    play.player.activePowerup.remainingMs = duration + 15000;
    play.player.activePowerup.durationMode = 'while_firing';
    play.bulletManager.maxPlayerBullets = Math.max(play.bulletManager.maxPlayerBullets || 0, 220);
    play.bulletManager.maxEnemyBullets = Math.max(play.bulletManager.maxEnemyBullets || 0, 320);

    const state = {
      nextEnemyId: 0,
      nextBulletId: 0,
      timers: [],
      createdEnemies: 0,
      createdEnemyBullets: 0
    };

    const makeEnemy = () => {
      const width = game.getWidth?.() || game.app?.screen?.width || 1366;
      const playerX = Number(play.player?.x) || width / 2;
      const id = state.nextEnemyId++;
      const col = id % 9;
      const row = Math.floor(id / 9) % 5;
      const x = Math.max(60, Math.min(width - 60, playerX + (col - 4) * 42));
      const y = 118 + row * 54;
      state.createdEnemies += 1;
      return {
        id: `plasma_smooth_enemy_${id}`,
        type: `plasma_smooth_enemy_${id % 18}`,
        kind: 'enemy',
        active: true,
        destroyed: false,
        x,
        y,
        vx: ((id % 3) - 1) * 0.16,
        vy: 0.08 + (id % 4) * 0.015,
        radius: 17,
        health: 1,
        maxHealth: 1,
        scoreValue: 100,
        color: id % 2 ? 0xffaa00 : 0x66f5ff,
        generatedProfile: {
          displayName: `Plasma Smoothness Target ${id % 18}`,
          role: 'smoothness',
          palette: [0xffaa00, 0x66f5ff, 0xffffff]
        },
        update(delta) {
          const screenWidth = game.getWidth?.() || game.app?.screen?.width || 1366;
          const screenHeight = game.getHeight?.() || game.app?.screen?.height || 768;
          const dt = Number(delta) || 1;
          this.x += this.vx * dt * 16.67 + Math.sin((performance.now() + id * 37) * 0.003) * 0.16;
          this.y += this.vy * dt * 16.67;
          if (this.x < 45 || this.x > screenWidth - 45) this.vx *= -1;
          if (this.y > screenHeight * 0.62) this.y = 112 + (id % 5) * 48;
        },
        canShoot() {
          return false;
        },
        takeDamage(damage) {
          this.health -= Math.max(1, Number(damage) || 1);
          if (this.health <= 0) {
            this.active = false;
            this.destroyed = true;
            return true;
          }
          return false;
        },
        updateHealthBar() {},
        deactivateVisuals() {},
        destroy() {
          this.active = false;
          this.destroyed = true;
        }
      };
    };

    const makeEnemyBullet = () => {
      const width = game.getWidth?.() || game.app?.screen?.width || 1366;
      const height = game.getHeight?.() || game.app?.screen?.height || 768;
      const id = state.nextBulletId++;
      state.createdEnemyBullets += 1;
      return {
        id: `plasma_smooth_enemy_bullet_${id}`,
        active: true,
        isPlayer: false,
        x: 80 + (id % 32) * ((width - 160) / 31),
        y: 70 + (id % 9) * 38,
        radius: 5,
        damage: 1,
        ageMs: 0,
        update(delta) {
          const dt = Number(delta) || 1;
          this.ageMs += dt * 16.67;
          this.x += Math.sin((this.ageMs + id * 17) * 0.01) * 0.38;
          this.y += (1.3 + (id % 5) * 0.08) * dt;
          if (this.y > height - 90) this.y = 72 + (id % 7) * 26;
        }
      };
    };

    const replenish = () => {
      const activeEnemies = play.enemyManager.enemies.filter((enemy) => enemy?.active !== false);
      while (activeEnemies.length < 54) {
        const enemy = makeEnemy();
        activeEnemies.push(enemy);
        play.enemyManager.enemies.push(enemy);
      }
      play.bulletManager.enemyBullets = play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false).slice(-120);
      while (play.bulletManager.enemyBullets.length < 88) {
        play.bulletManager.enemyBullets.push(makeEnemyBullet());
      }
      if (play.player?.activePowerup?.type !== 'plasma_lance') {
        play.player.applyPowerup?.('plasma_lance');
        play.player.setActivePowerupDuration?.('plasma_lance', duration + 15000);
        play.player.activePowerup.remainingMs = duration + 15000;
        play.player.activePowerup.durationMode = 'while_firing';
      }
      play.player.invulnerable = true;
      play.player.invulnerableTime = duration + 15000;
      play.freezeTimerMs = 0;
    };

    const updateInput = () => {
      const right = Math.sin(performance.now() * 0.0015) >= 0;
      window.__burtKeyboardOverride = {
        Space: true,
        ArrowRight: right,
        ArrowLeft: !right,
        ArrowUp: Math.sin(performance.now() * 0.0008) > 0.35,
        ArrowDown: Math.sin(performance.now() * 0.0008) < -0.35
      };
    };

    for (let i = 0; i < 6; i += 1) replenish();
    updateInput();
    state.timers.push(setInterval(replenish, 120));
    state.timers.push(setInterval(updateInput, 180));
    state.stop = () => {
      for (const timer of state.timers) clearInterval(timer);
      state.timers = [];
      window.__burtKeyboardOverride = {};
      play.bulletManager.enemyBullets = [];
      play.enemyManager.enemies = play.enemyManager.enemies.filter((enemy) => !String(enemy?.id || '').startsWith('plasma_smooth_enemy_'));
    };
    window.__novaPlasmaSmoothnessHarness = state;
    return {
      level: game.level,
      enemies: play.enemyManager.enemies.length,
      enemyBullets: play.bulletManager.enemyBullets.length,
      plasmaLanceActive: play.player.activePowerup?.type === 'plasma_lance'
    };
  }, sampleMs);
}

async function sampleChaos(page, sampleMs) {
  return page.evaluate((duration) => new Promise((resolve) => {
    const intervals = [];
    const longTasks = [];
    let previous = performance.now();
    const startedAt = previous;
    let lastHash = null;
    let duplicateStreak = 0;
    let maxDuplicateStreak = 0;
    let duplicateFrames = 0;
    let plasmaHitEvents = 0;
    let plasmaHitFrames = 0;
    let maxCollisionPairs = 0;
    let maxCollisionCandidateChecks = 0;

    let longTaskObserver = null;
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push({
            startTime: Number(entry.startTime.toFixed(2)),
            duration: Number(entry.duration.toFixed(2))
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch {
      longTaskObserver = null;
    }

    const makeHash = () => {
      const play = window.__game?.scenes?.play;
      if (!play) return 'no-play';
      const playerBullets = (play.bulletManager?.playerBullets || [])
        .filter((bullet) => bullet?.active !== false)
        .slice(0, 24);
      const enemies = (play.enemyManager?.enemies || [])
        .filter((enemy) => enemy?.active !== false)
        .slice(0, 24);
      const bulletHash = playerBullets.reduce((sum, bullet, index) => {
        return sum + Math.round((bullet.x || 0) * 10) * (index + 1) + Math.round((bullet.y || 0) * 10);
      }, 0);
      const enemyHash = enemies.reduce((sum, enemy, index) => {
        return sum + Math.round((enemy.x || 0) * 10) * (index + 1) + Math.round((enemy.y || 0) * 10);
      }, 0);
      return [
        Math.round((play.player?.x || 0) * 10),
        Math.round((play.player?.y || 0) * 10),
        Math.round(window.__game?.score || 0),
        playerBullets.length,
        play.bulletManager?.enemyBullets?.length || 0,
        enemies.length,
        play.particleManager?.particles?.length || 0,
        play.scorePopupManager?.popups?.length || 0,
        bulletHash,
        enemyHash,
        Math.round(play.freezeTimerMs || 0)
      ].join('|');
    };

    const tick = (now) => {
      intervals.push(now - previous);
      previous = now;
      const hash = makeHash();
      if (hash === lastHash) {
        duplicateStreak += 1;
        duplicateFrames += 1;
        maxDuplicateStreak = Math.max(maxDuplicateStreak, duplicateStreak);
      } else {
        duplicateStreak = 0;
        lastHash = hash;
      }

      const collision = window.__game?.scenes?.play?.collisionDiagnosticStats || {};
      const hits = Number(collision.plasmaLanceHitEvents) || 0;
      if (hits > 0) {
        plasmaHitEvents += hits;
        plasmaHitFrames += 1;
      }
      maxCollisionPairs = Math.max(maxCollisionPairs, Number(collision.playerBulletEnemyPairs) || 0);
      maxCollisionCandidateChecks = Math.max(maxCollisionCandidateChecks, Number(collision.playerBulletEnemyCandidateChecks) || 0);

      if (now - startedAt >= duration) {
        longTaskObserver?.disconnect?.();
        resolve({
          intervals,
          duplicateFrames,
          maxDuplicateStreak,
          plasmaHitEvents,
          plasmaHitFrames,
          maxCollisionPairs,
          maxCollisionCandidateChecks,
          longTasks
        });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), sampleMs);
}

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const result = {};

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/highscores', async (route) => {
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' });
  });
  await seedProfile(page);
  await page.goto(withQuery({
    skipIntro: '1',
    offlineLeaderboard: '1',
    mockSteamLeaderboard: '1',
    novaPerfDiag: '1',
    novaDiagNoLeaderboardTargets: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await startMayhem(page);
  result.harness = await installChaosHarness(page, durationMs);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__novaMayhemPerformanceDiagnostics?.reset?.());
  const sample = await sampleChaos(page, durationMs);
  const diagnosticReport = await page.evaluate(() => window.__novaMayhemPerformanceDiagnostics?.getReport?.() || null);
  const finalState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  await page.screenshot({ path: path.join(outputDir, 'plasma-lance-smoothness.png'), fullPage: false });
  await page.evaluate(() => window.__novaPlasmaSmoothnessHarness?.stop?.());

  const frameSummary = summarizeIntervals(sample.intervals);
  const collisionSection = diagnosticReport?.topSections?.find?.((section) => section.label === 'collision.player_bullets_enemies') || null;
  const hitTestSection = diagnosticReport?.topSections?.find?.((section) => section.label === 'collision.player_bullets_enemies.hit_test') || null;
  const storageWrites = diagnosticReport?.frameCounterTotals?.localStorageWrites || 0;

  result.sampleDurationMs = durationMs;
  result.frameSummary = frameSummary;
  result.duplicates = {
    duplicateFrames: sample.duplicateFrames,
    maxDuplicateStreak: sample.maxDuplicateStreak
  };
  result.plasma = {
    hitEvents: sample.plasmaHitEvents,
    hitFrames: sample.plasmaHitFrames,
    activeAtEnd: diagnosticReport?.lastCounts?.timing?.plasmaLanceActive || false
  };
  result.collision = {
    maxPairs: sample.maxCollisionPairs,
    maxCandidateChecks: sample.maxCollisionCandidateChecks,
    sectionMaxMs: collisionSection?.maxMs || 0,
    hitTestMaxMs: hitTestSection?.maxMs || 0
  };
  result.diagnostics = {
    frame: diagnosticReport?.frame || null,
    longFrames: diagnosticReport?.longFrames || null,
    frameCounterTotals: diagnosticReport?.frameCounterTotals || null,
    worstSlowFrame: diagnosticReport?.worstSlowFrame || null
  };
  result.longTasks = sample.longTasks.filter((entry) => entry.duration >= 50).slice(0, 20);
  result.finalState = {
    scene: finalState.scene,
    runMode: finalState.runMode,
    level: finalState.level,
    counts: finalState.counts
  };
  result.pageErrors = pageErrors;

  assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join('; ')}`);
  assert.ok(frameSummary.frames >= Math.floor(durationMs / 20), `expected sustained frame sampling, got ${frameSummary.frames}`);
  assert.ok(sample.plasmaHitEvents > 80, `expected Plasma Lance hit pressure, got ${sample.plasmaHitEvents}`);
  assert.ok(sample.maxDuplicateStreak <= 1, `gameplay state repeated for ${sample.maxDuplicateStreak + 1} consecutive frames`);
  assert.ok(frameSummary.p95Ms <= 18.5, `p95 frame time ${frameSummary.p95Ms}ms should stay near 60Hz`);
  assert.ok(frameSummary.p99Ms <= 25, `p99 frame time ${frameSummary.p99Ms}ms should stay below 25ms`);
  assert.equal(frameSummary.longFrames50, 0, 'no frame interval should exceed 50ms');
  assert.equal(result.longTasks.length, 0, 'no browser long tasks >=50ms should occur during Plasma Lance chaos');
  assert.ok((diagnosticReport?.longFrames?.over50Ms || 0) === 0, 'diagnostics should not record gameplay frames over 50ms');
  assert.equal(storageWrites, 0, `active gameplay should not perform localStorage writes, got ${storageWrites}`);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: true, baseUrl, result }, null, 2)}\n`);
  console.log(`[plasma-lance-smoothness] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: false, baseUrl, error: error.message, result }, null, 2)}\n`);
  console.error(`[plasma-lance-smoothness] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
