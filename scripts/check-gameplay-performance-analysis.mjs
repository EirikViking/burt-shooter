import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4731));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/gameplay-performance-analysis-${timestamp()}`);
const devtoolsHash = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const perfFlagQuery = Object.freeze({
  disableSectorArt: 'novaPerfDisableSectorArt',
  disableSectorFlyins: 'novaPerfDisableSectorFlyins',
  disableNewEnemyRoster: 'novaPerfDisableNewEnemyRoster',
  disableSmallEnemyShips: 'novaPerfDisableSmallEnemyShips',
  enableSmallEnemyShips: 'novaPerfEnableSmallEnemyShips',
  disableDecorativeBackgrounds: 'novaPerfDisableDecorativeBackgrounds'
});

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
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available performance check port found starting at ${startPort}`);
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

  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
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
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function summarizeFrameIntervals(intervals) {
  const useful = intervals.filter((value) => Number.isFinite(value) && value > 0);
  const average = useful.length ? useful.reduce((sum, value) => sum + value, 0) / useful.length : 0;
  return {
    frames: useful.length,
    averageMs: Number(average.toFixed(2)),
    averageFps: average > 0 ? Number((1000 / average).toFixed(1)) : 0,
    p95Ms: Number(percentile(useful, 0.95).toFixed(2)),
    p99Ms: Number(percentile(useful, 0.99).toFixed(2)),
    maxMs: Number((useful.length ? Math.max(...useful) : 0).toFixed(2)),
    longFrames33: useful.filter((value) => value > 33.34).length,
    longFrames50: useful.filter((value) => value > 50).length
  };
}

function withQuery(url, query = {}) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === false) continue;
    target.searchParams.set(key, String(value));
  }
  return target.toString();
}

function queryForFlags(flags = []) {
  const query = {};
  for (const flag of flags) {
    const key = perfFlagQuery[flag];
    if (key) query[key] = '1';
  }
  return query;
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function collectRuntimeSnapshot(page) {
  return page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    const bullets = play?.bulletManager;
    const enemies = manager?.enemies || [];
    const activeProjectiles =
      (bullets?.playerBullets?.filter?.((bullet) => bullet?.active !== false).length || 0) +
      (bullets?.enemyBullets?.filter?.((bullet) => bullet?.active !== false).length || 0);
    return {
      sector: Number(game?.level) || 0,
      scene: game?.currentSceneName || null,
      sectorArrivalActive: Boolean(play?.sectorArrivalStinger),
      newSectorArtActive: Boolean(play?.sectorArrivalStinger?.container?.children?.some?.((child) =>
        child?.label !== 'sector_arrival_stinger' &&
        child?.texture &&
        child?.visible !== false &&
        child?.renderable !== false
      )),
      decorativeBackgroundActive: Boolean(play?.gameplayBackdrop?.parent || play?.gameplayStormBackdrop?.parent || play?.gameplayBossBackdrop?.parent),
      activeEnemies: enemies.filter((enemy) => enemy?.active !== false || enemy?.waitingForEntry).length,
      activeProjectiles,
      activeParticles: play?.particleManager?.particles?.length || 0,
      activeTweensOrTimers: (manager?.waveSpawnTimers?.length || 0) + (play?.pendingEnemyStartTimeout ? 1 : 0),
      pendingWaveSpawns: Number(manager?.waveSpawnPendingCount) || 0,
      loadedTextureKeys: Number(play?.preparedRenderTextureKeys?.size) || 0,
      sectorArtCacheEntries: Number(play?.sectorArrivalArtCache?.size) || 0,
      entryWarmupCacheEntries: Number(play?.entryAssetWarmupCache?.size) || 0,
      lateMayhemEnemies: enemies.filter((enemy) => enemy?.generatedProfile?.lateMayhem === true).length,
      earlySurgeEnemies: enemies.filter((enemy) => enemy?.generatedProfile?.earlySurge === true).length,
      enemyManagerState: manager?.state || null
    };
  });
}

async function waitForActiveWave(page) {
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' &&
      !play?.sectorArrivalStinger &&
      (play?.enemyManager?.enemies?.length || 0) > 0 &&
      (state.counts?.enemies || 0) > 0;
  }, null, { timeout: 30000 });
}

async function sampleFrameIntervals(page, sampleMs) {
  return page.evaluate((durationMs) => new Promise((resolve) => {
    const intervals = [];
    let previous = performance.now();
    const startedAt = previous;
    const tick = (now) => {
      intervals.push(now - previous);
      previous = now;
      if (now - startedAt >= durationMs) {
        resolve(intervals);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), sampleMs);
}

async function sampleParkedEnemyMotion(page, sampleFrames = 180) {
  return page.evaluate((framesToSample) => new Promise((resolve) => {
    window.__perfEnemyIds = window.__perfEnemyIds || new WeakMap();
    window.__perfEnemyIdSeq = Number(window.__perfEnemyIdSeq) || 1;
    const getEnemyKey = (enemy) => {
      if (!window.__perfEnemyIds.has(enemy)) {
        window.__perfEnemyIds.set(enemy, window.__perfEnemyIdSeq);
        window.__perfEnemyIdSeq += 1;
      }
      return String(window.__perfEnemyIds.get(enemy));
    };
    const samples = [];
    const take = () => {
      const enemies = window.__game?.scenes?.play?.enemyManager?.enemies || [];
      samples.push(enemies
        .filter((enemy) => enemy?.state === 'FORMATION' && enemy?.active !== false)
        .slice(0, 8)
        .map((enemy) => ({
          key: getEnemyKey(enemy),
          x: Number(enemy.x || 0),
          y: Number(enemy.y || 0),
          state: enemy.state || null,
          move: enemy.tacticalMoveStyle || enemy.generatedProfile?.movementStyle || null
        })));
      if (samples.length >= framesToSample) {
        resolve(samples);
        return;
      }
      requestAnimationFrame(take);
    };
    requestAnimationFrame(take);
  }), sampleFrames);
}

function summarizeParkedMotion(samples) {
  let maxXStep = 0;
  let maxYStep = 0;
  let observed = 0;
  const moves = new Set();
  for (let frame = 1; frame < samples.length; frame += 1) {
    const previous = new Map(samples[frame - 1].map((enemy) => [enemy.key, enemy]));
    const current = samples[frame];
    for (const enemy of current) {
      const prior = previous.get(enemy.key);
      if (!prior) continue;
      const dx = Math.abs((enemy.x || 0) - (prior.x || 0));
      const dy = Math.abs((enemy.y || 0) - (prior.y || 0));
      maxXStep = Math.max(maxXStep, dx);
      maxYStep = Math.max(maxYStep, dy);
      if (enemy.move) moves.add(enemy.move);
      observed += 1;
    }
  }
  return {
    observed,
    maxXStepPx: Number(maxXStep.toFixed(2)),
    maxYStepPx: Number(maxYStep.toFixed(2)),
    movementStyles: [...moves].sort()
  };
}

async function makeProbePlayerSafe(page) {
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (game) game.lives = Math.max(Number(game.lives) || 0, 3);
    if (play?.player) {
      play.player.invulnerable = true;
      play.player.invulnerableTime = Math.max(Number(play.player.invulnerableTime) || 0, 600000);
    }
    play?.clearEnemyBullets?.('performance_probe');
  });
}

async function sampleNextWaveEntry(page, sampleMs = 3600) {
  const setup = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!manager || !Array.isArray(manager.waves) || manager.waves.length < 2) {
      return { available: false, reason: 'missing wave list' };
    }
    const nextIndex = Math.min(
      Math.max(1, (Number(manager.currentWaveIndex) || 0) + 1),
      Math.max(1, manager.normalWavesTotal - 1)
    );
    const config = manager.waves[nextIndex];
    if (!config) return { available: false, reason: `missing wave config ${nextIndex}` };

    manager.clearPendingWaveSpawns?.();
    manager.clearEnemies?.();
    manager.waveEnding = false;
    manager.cleanupTimer = 0;
    manager.cleanupPhase = 'NONE';
    manager.currentWaveIndex = nextIndex;
    manager.pendingWaveConfig = config;
    manager.waveBriefingTimer = 0;
    manager.waveBriefingAnnounced = true;
    manager.state = 'WAVE_BRIEFING';
    return {
      available: true,
      nextIndex,
      normalWavesTotal: manager.normalWavesTotal,
      count: config.count || 0,
      formation: config.formation || null
    };
  });
  if (!setup.available) return { setup, frameSummary: summarizeFrameIntervals([]), after: null };
  const intervals = await sampleFrameIntervals(page, sampleMs);
  const after = await page.evaluate(() => {
    const manager = window.__game?.scenes?.play?.enemyManager;
    return {
      state: manager?.state || null,
      spawning: Boolean(manager?.spawning),
      pending: Number(manager?.waveSpawnPendingCount) || 0,
      enemies: manager?.enemies?.length || 0,
      waveIndex: Number(manager?.currentWaveIndex) || 0
    };
  });
  return {
    setup,
    frameSummary: summarizeFrameIntervals(intervals),
    after
  };
}

async function sampleForcedSectorTransition(page, targetLevel, { sampleMs = 5600, prewarm = true } = {}) {
  const before = await page.evaluate(async ({ targetLevel: target, prewarm: shouldPrewarm }) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play || !play.enemyManager) {
      return { available: false, reason: 'missing play scene' };
    }
    play.clearPendingEnemyStart?.();
    play.clearSectorArrivalStinger?.();
    play.levelAdvancePending = false;
    const artSource = play.getSectorArrivalArtSource?.(target);
    if (artSource && !shouldPrewarm) {
      play.sectorArrivalArtCache?.delete?.(artSource);
      play.preparedRenderTextureKeys?.delete?.(`sector_arrival:${artSource}`);
    }
    if (shouldPrewarm) {
      const warmup = play.prewarmLevelEntryAssets?.(target, { ahead: 2 });
      if (warmup && typeof warmup.catch === 'function') {
        await warmup.catch(() => true);
      }
    }
    game.level = Math.max(1, target - 1);
    return {
      available: true,
      targetLevel: target,
      prewarm: shouldPrewarm,
      artSource,
      preparedTextureKeys: Number(play.preparedRenderTextureKeys?.size) || 0,
      sectorArtCacheEntries: Number(play.sectorArrivalArtCache?.size) || 0
    };
  }, { targetLevel, prewarm });

  if (!before.available) {
    return { before, frameSummary: summarizeFrameIntervals([]), after: null };
  }

  const sampled = await page.evaluate(({ targetLevel: target, durationMs }) => new Promise((resolve) => {
    const intervals = [];
    let previous = performance.now();
    const startedAt = previous;
    let triggered = false;
    const snapshot = () => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const manager = play?.enemyManager;
      return {
        sector: Number(game?.level) || 0,
        sectorArrivalActive: Boolean(play?.sectorArrivalStinger),
        pendingEnemyStart: Boolean(play?.pendingEnemyStartTimeout),
        enemyManagerState: manager?.state || null,
        enemies: manager?.enemies?.length || 0,
        pendingWaveSpawns: Number(manager?.waveSpawnPendingCount) || 0,
        loadedTextureKeys: Number(play?.preparedRenderTextureKeys?.size) || 0,
        sectorArtCacheEntries: Number(play?.sectorArrivalArtCache?.size) || 0
      };
    };
    const tick = (now) => {
      intervals.push(now - previous);
      previous = now;
      if (!triggered) {
        triggered = true;
        const game = window.__game;
        const play = game?.scenes?.play;
        if (game && play) {
          game.level = Math.max(1, target - 1);
          play.postBossLevelIntroPending = true;
          play.levelAdvancePending = false;
          game.nextLevel();
        }
      }
      if (now - startedAt >= durationMs) {
        resolve({ intervals, after: snapshot() });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { targetLevel, durationMs: sampleMs });

  return {
    before,
    frameSummary: summarizeFrameIntervals(sampled.intervals),
    after: sampled.after
  };
}

async function runTransitionScenario(browser, scenario) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const url = withQuery(baseUrl, {
    'nova-devtools-hash': devtoolsHash,
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: 1,
    controlSmoke: '1',
    ...queryForFlags(scenario.flags)
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, { timeout: 30000 });
  await page.evaluate(() => window.__game.startGame());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', null, { timeout: 30000 });
  await waitForActiveWave(page);
  await makeProbePlayerSafe(page);

  const runtimeBefore = await collectRuntimeSnapshot(page);
  const transition = await sampleForcedSectorTransition(page, scenario.targetLevel, {
    sampleMs: scenario.sampleMs || 5600,
    prewarm: scenario.prewarm !== false
  });
  const runtimeAfter = await collectRuntimeSnapshot(page);
  const report = {
    name: scenario.name,
    targetLevel: scenario.targetLevel,
    flags: scenario.flags || [],
    prewarm: scenario.prewarm !== false,
    frameSummary: transition.frameSummary,
    transition,
    runtimeBefore,
    runtimeAfter,
    pageErrors,
    consoleErrors
  };
  await page.screenshot({ path: path.join(outputDir, `${scenario.name}.png`), fullPage: true });
  await page.close();
  return report;
}

async function runScenario(browser, scenario) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const url = withQuery(baseUrl, {
    'nova-devtools-hash': devtoolsHash,
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: scenario.startLevel,
    controlSmoke: '1',
    ...queryForFlags(scenario.flags)
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, { timeout: 30000 });
  await page.evaluate(() => window.__game.startGame());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', null, { timeout: 30000 });
  await waitForActiveWave(page);
  await makeProbePlayerSafe(page);
  await page.waitForFunction(() => {
    const enemies = window.__game?.scenes?.play?.enemyManager?.enemies || [];
    return enemies.some((enemy) => enemy?.state === 'FORMATION' && enemy?.active !== false);
  }, null, { timeout: 15000 });
  await page.waitForTimeout(350);
  await makeProbePlayerSafe(page);

  const before = await readState(page);
  const runtimeBefore = await collectRuntimeSnapshot(page);
  const intervals = await sampleFrameIntervals(page, scenario.sampleMs || 6000);
  const motionSamples = await sampleParkedEnemyMotion(page, scenario.motionFrames || 180);
  await makeProbePlayerSafe(page);
  const nextWaveEntry = await sampleNextWaveEntry(page, scenario.entrySampleMs || 3600);
  const after = await readState(page);
  const runtimeAfter = await collectRuntimeSnapshot(page);
  const report = {
    name: scenario.name,
    startLevel: scenario.startLevel,
    flags: scenario.flags || [],
    frameSummary: summarizeFrameIntervals(intervals),
    nextWaveEntry,
    parkedMotion: summarizeParkedMotion(motionSamples),
    before: {
      level: before.level,
      counts: before.counts,
      wave: before.wave
    },
    after: {
      level: after.level,
      counts: after.counts,
      wave: after.wave
    },
    runtimeBefore,
    runtimeAfter,
    pageErrors,
    consoleErrors
  };
  await page.screenshot({ path: path.join(outputDir, `${scenario.name}.png`), fullPage: true });
  await page.close();
  return report;
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const scenarios = [
    { name: 'sector-1-opening-wave', startLevel: 1, sampleMs: 5000, motionFrames: 150 },
    { name: 'sector-5-challenge-entry', startLevel: 5, sampleMs: 5200, motionFrames: 170 },
    { name: 'sector-20-generated-wave', startLevel: 20, sampleMs: 6500, motionFrames: 210 }
  ];
  const transitionScenarios = [
    { name: 'transition-sector-20-cold-no-warmup', targetLevel: 20, prewarm: false, diagnosticOnly: true, sampleMs: 5600 },
    { name: 'transition-sector-20-full-build', targetLevel: 20, sampleMs: 5600 },
    { name: 'transition-sector-20-sector-flyins-disabled', targetLevel: 20, flags: ['disableSectorFlyins'], sampleMs: 3600 },
    { name: 'transition-sector-20-sector-art-disabled', targetLevel: 20, flags: ['disableSectorArt'], sampleMs: 5600 },
    { name: 'transition-sector-20-new-enemy-roster-disabled', targetLevel: 20, flags: ['disableNewEnemyRoster'], sampleMs: 5600 },
    { name: 'transition-sector-20-art-and-flyins-disabled', targetLevel: 20, flags: ['disableSectorArt', 'disableSectorFlyins'], sampleMs: 3600 },
    { name: 'transition-sector-20-decorative-backgrounds-disabled', targetLevel: 20, flags: ['disableDecorativeBackgrounds'], sampleMs: 5600 },
    {
      name: 'transition-sector-20-heavy-visuals-disabled',
      targetLevel: 20,
      flags: ['disableSectorArt', 'disableSectorFlyins', 'disableNewEnemyRoster', 'disableDecorativeBackgrounds'],
      sampleMs: 3600
    }
  ];
  const results = [];
  for (const scenario of scenarios) {
    console.log(`[gameplay-performance] scenario ${scenario.name}`);
    results.push(await runScenario(browser, scenario));
  }
  const transitionResults = [];
  for (const scenario of transitionScenarios) {
    console.log(`[gameplay-performance] transition ${scenario.name}`);
    const result = await runTransitionScenario(browser, scenario);
    result.diagnosticOnly = Boolean(scenario.diagnosticOnly);
    transitionResults.push(result);
  }

  const failures = [];
  for (const result of results) {
    if (result.frameSummary.p95Ms > 24) {
      failures.push(`${result.name} p95 frame ${result.frameSummary.p95Ms}ms exceeds 24ms`);
    }
    if (result.frameSummary.longFrames50 > 0) {
      failures.push(`${result.name} has ${result.frameSummary.longFrames50} frame(s) over 50ms`);
    }
    if (result.nextWaveEntry?.setup?.available) {
      const entryFrame = result.nextWaveEntry.frameSummary;
      if (entryFrame.p95Ms > 30) {
        failures.push(`${result.name} wave entry p95 frame ${entryFrame.p95Ms}ms exceeds 30ms`);
      }
      if (entryFrame.longFrames50 > 1) {
        failures.push(`${result.name} wave entry has ${entryFrame.longFrames50} frame(s) over 50ms`);
      }
      if (result.nextWaveEntry.after?.pending !== 0 || result.nextWaveEntry.after?.spawning) {
        failures.push(`${result.name} wave entry spawn queue did not drain`);
      }
      if ((result.nextWaveEntry.after?.enemies || 0) <= 0) {
        failures.push(`${result.name} wave entry did not spawn enemies`);
      }
    }
    if (result.parkedMotion.maxXStepPx > 5.5) {
      failures.push(`${result.name} parked enemy x step ${result.parkedMotion.maxXStepPx}px exceeds 5.5px`);
    }
    if (result.pageErrors.length) {
      failures.push(`${result.name} page errors: ${result.pageErrors.join('; ')}`);
    }
    if (result.consoleErrors.length) {
      failures.push(`${result.name} console errors: ${result.consoleErrors.join('; ')}`);
    }
  }
  for (const result of transitionResults) {
    if (result.diagnosticOnly) continue;
    if (result.frameSummary.p95Ms > 26) {
      failures.push(`${result.name} transition p95 frame ${result.frameSummary.p95Ms}ms exceeds 26ms`);
    }
    if (result.frameSummary.p99Ms > 34) {
      failures.push(`${result.name} transition p99 frame ${result.frameSummary.p99Ms}ms exceeds 34ms`);
    }
    if (result.frameSummary.longFrames50 > 1) {
      failures.push(`${result.name} transition has ${result.frameSummary.longFrames50} frame(s) over 50ms`);
    }
    if (result.pageErrors.length) {
      failures.push(`${result.name} page errors: ${result.pageErrors.join('; ')}`);
    }
    if (result.consoleErrors.length) {
      failures.push(`${result.name} console errors: ${result.consoleErrors.join('; ')}`);
    }
  }

  const report = {
    status: failures.length ? 'failed' : 'passed',
    generatedAt: new Date().toISOString(),
    outputDir,
    scenarios: results,
    transitions: transitionResults,
    failures
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  assert.equal(failures.length, 0, failures.join('\n'));
  console.log(`[gameplay-performance] PASS ${path.relative(process.cwd(), outputDir).replaceAll(path.sep, '/')}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
