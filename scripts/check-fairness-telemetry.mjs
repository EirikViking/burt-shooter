import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.FAIRNESS_HOST || '127.0.0.1';
const port = process.env.FAIRNESS_URL ? null : (Number(process.env.FAIRNESS_PORT) || await findAvailablePort(4470));
const baseUrl = process.env.FAIRNESS_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.FAIRNESS_OUTPUT_DIR || `test-results/fairness-telemetry-${timestamp()}`);
const runs = Number(process.env.FAIRNESS_RUNS || 5);
const durationMs = Number(process.env.FAIRNESS_RUN_MS || 45000);
const sampleMs = Number(process.env.FAIRNESS_SAMPLE_MS || 250);
const viewport = { width: 1280, height: 720 };

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  throw new Error(`No available fairness telemetry port found starting at ${startPort}`);
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function collectState(page) {
  return page.evaluate(() => {
    const text = JSON.parse(window.render_game_to_text?.() || '{}');
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const powerups = (play?.powerupManager?.powerups || [])
      .filter(powerup => powerup?.active)
      .map(powerup => ({
        type: powerup.type || null,
        source: powerup.source || null,
        x: Math.round(powerup.x || 0),
        y: Math.round(powerup.y || 0)
      }));
    const heap = performance?.memory?.usedJSHeapSize || null;
    return {
      ...text,
      player: player ? {
        ...(text.player || {}),
        x: Math.round(player.x || 0),
        y: Math.round(player.y || 0),
        isDodging: Boolean(player.isDodging),
        invulnerable: Boolean(player.invulnerable),
        shieldActive: Boolean(player.shieldActive),
        dodgeCooldown: Number(player.dodgeCooldown) || 0
      } : text.player,
      powerups,
      heap
    };
  });
}

async function waitForPlayReady(page, timeout = 30000) {
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && state.player?.active === true && state.wave?.state && state.wave.state !== 'IDLE';
  }, null, { timeout });
}

function scoreDanger(state, x, y) {
  let score = 0;
  for (const bullet of state.enemyWeapons?.visibleBullets || []) {
    const dx = Math.abs((bullet.x || 0) - x);
    const dy = Math.abs((bullet.y || 0) - y);
    if (dy > 320) continue;
    score -= Math.max(0, 95 - dx) * 4;
    score -= Math.max(0, 210 - dy) * 1.2;
    if (dx < 55 && dy < 165) score -= 850;
  }
  for (const enemy of state.visibleEnemies || []) {
    if (enemy.kind === 'boss') continue;
    const dx = Math.abs((enemy.x || 0) - x);
    const dy = Math.abs((enemy.y || 0) - y);
    const lowerLane = (enemy.y || 0) > viewport.height * 0.55;
    score -= Math.max(0, 145 - dx) * (lowerLane ? 3.4 : 0.9);
    score -= Math.max(0, 170 - dy) * (lowerLane ? 1.5 : 0.4);
  }
  return score;
}

function chooseIntent(state) {
  const playerX = state.player?.x ?? viewport.width / 2;
  const playerY = state.player?.y ?? viewport.height * 0.78;
  const enemies = (state.visibleEnemies || []).filter(enemy => enemy.x >= 0 && enemy.x <= viewport.width);
  const boss = enemies.find(enemy => enemy.kind === 'boss');
  const targetX = boss?.x || (enemies.length
    ? enemies.reduce((sum, enemy) => sum + enemy.x, 0) / enemies.length
    : viewport.width / 2);
  const pressure = (state.counts?.enemyBullets || 0) + enemies.filter(enemy => enemy.kind !== 'boss' && enemy.y > viewport.height * 0.52).length * 2;
  const lowLives = Number(state.lives) <= 1;
  const yPreference = lowLives || pressure >= 6 ? viewport.height * 0.67 : viewport.height * 0.79;
  const xs = [
    playerX,
    playerX - 160,
    playerX + 160,
    targetX - 160,
    targetX,
    targetX + 160,
    viewport.width * 0.2,
    viewport.width * 0.5,
    viewport.width * 0.8
  ].map(x => Math.max(56, Math.min(viewport.width - 56, x)));
  const ys = [
    yPreference - 52,
    yPreference,
    yPreference + 52,
    viewport.height * 0.82
  ].map(y => Math.max(viewport.height * 0.56, Math.min(viewport.height - 82, y)));

  let best = { x: playerX, y: playerY, score: Number.NEGATIVE_INFINITY };
  for (const x of xs) {
    for (const y of ys) {
      const aimPenalty = Math.abs(x - targetX) * (boss ? 0.18 : lowLives ? 0.04 : 0.1);
      const movePenalty = Math.abs(x - playerX) * 0.03 + Math.abs(y - playerY) * 0.025;
      const yPenalty = Math.abs(y - yPreference) * 0.08;
      const edgePenalty = Math.max(0, 74 - x) * 2 + Math.max(0, x - (viewport.width - 74)) * 2;
      const score = scoreDanger(state, x, y) - aimPenalty - movePenalty - yPenalty - edgePenalty;
      if (score > best.score) best = { x, y, score };
    }
  }

  const canDodge = state.player &&
    !state.player.isDodging &&
    !state.player.invulnerable &&
    !state.player.shieldActive &&
    (Number(state.player.dodgeCooldown) || 0) <= 0;
  const urgent = canDodge && (state.enemyWeapons?.visibleBullets || []).some((bullet) => {
    const dx = Math.abs((bullet.x || 0) - playerX);
    const dy = Math.abs((bullet.y || 0) - playerY);
    return dx < 82 && dy < 180;
  });

  return {
    horizontal: best.x < playerX - 24 ? 'left' : best.x > playerX + 24 ? 'right' : 'none',
    vertical: best.y < playerY - 24 ? 'up' : best.y > playerY + 24 ? 'down' : 'none',
    dodge: Boolean(urgent || (canDodge && lowLives && pressure >= 7))
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
  if (currentIntent.dodge !== nextIntent.dodge) {
    if (currentIntent.dodge) await page.keyboard.up('ShiftLeft');
    if (nextIntent.dodge) await page.keyboard.down('ShiftLeft');
  }
  return nextIntent;
}

function summarizeTimeline(timeline) {
  const deaths = [];
  const bossLevelsReached = new Set();
  const bossDeaths = [];
  const powerupsByType = {};
  const powerupsBySource = {};
  const clutchShieldSamples = [];
  let previousLives = timeline[0]?.state?.lives ?? null;
  let previousScore = timeline[0]?.state?.score ?? 0;
  let previousProgressAt = timeline[0]?.elapsedMs ?? 0;
  let longestNoProgressMs = 0;
  let noProgressStart = null;

  for (const entry of timeline) {
    const state = entry.state || {};
    if (state.wave?.phase === 'BOSS' || state.enemyManagerState === 'BOSS_ACTIVE') {
      bossLevelsReached.add(state.level);
    }
    if (Number.isFinite(previousLives) && Number.isFinite(state.lives) && state.lives < previousLives) {
      const death = {
        elapsedMs: entry.elapsedMs,
        level: state.level,
        wave: state.wave?.currentWaveNumber,
        bossActive: state.wave?.phase === 'BOSS' || state.enemyManagerState === 'BOSS_ACTIVE',
        bullets: state.counts?.enemyBullets || 0,
        hazards: state.bossHazards?.active?.length || 0,
        player: state.player || null
      };
      deaths.push(death);
      if (death.bossActive) bossDeaths.push(death);
    }
    previousLives = state.lives;

    for (const powerup of state.powerups || []) {
      powerupsByType[powerup.type || 'unknown'] = (powerupsByType[powerup.type || 'unknown'] || 0) + 1;
      powerupsBySource[powerup.source || 'unknown'] = (powerupsBySource[powerup.source || 'unknown'] || 0) + 1;
      if (powerup.source === 'boss_clutch_shield') {
        clutchShieldSamples.push({ elapsedMs: entry.elapsedMs, level: state.level, x: powerup.x, y: powerup.y });
      }
    }

    const progressKey = [
      state.scene,
      state.level,
      state.wave?.phase,
      state.wave?.state,
      state.wave?.currentWaveNumber,
      state.counts?.enemies,
      state.score
    ].join(':');
    if (progressKey !== previousScore) {
      previousScore = progressKey;
      previousProgressAt = entry.elapsedMs;
      noProgressStart = null;
    } else {
      if (noProgressStart == null) noProgressStart = previousProgressAt;
      longestNoProgressMs = Math.max(longestNoProgressMs, entry.elapsedMs - noProgressStart);
    }
  }

  const finalState = timeline[timeline.length - 1]?.state || null;
  return {
    samples: timeline.length,
    survivedMs: timeline[timeline.length - 1]?.elapsedMs || 0,
    survivedFullDuration: (timeline[timeline.length - 1]?.elapsedMs || 0) >= durationMs - sampleMs * 2,
    finalScene: finalState?.scene || null,
    finalLevel: finalState?.level || 0,
    finalScore: finalState?.score || 0,
    finalLives: finalState?.lives ?? null,
    peakLevel: Math.max(...timeline.map(entry => Number(entry.state?.level) || 0), 0),
    peakScore: Math.max(...timeline.map(entry => Number(entry.state?.score) || 0), 0),
    deaths,
    bossLevelsReached: [...bossLevelsReached].sort((a, b) => a - b),
    bossDeaths,
    powerupsByType,
    powerupsBySource,
    clutchShieldSamples,
    longestNoProgressMs,
    heapStart: timeline[0]?.state?.heap || null,
    heapEnd: finalState?.heap || null,
    fatalOverlay: Boolean(finalState?.overlays?.fatal)
  };
}

function findSectorClearStalls(timeline, limitMs = 15000) {
  const stalls = [];
  let current = null;
  const finish = () => {
    if (!current) return;
    const duration = current.lastMs - current.startMs;
    if (duration >= limitMs) stalls.push({ ...current, durationMs: duration });
    current = null;
  };

  for (const entry of timeline) {
    const state = entry.state || {};
    const blocked = state.scene === 'play' &&
      state.wave?.phase === 'COMPLETE' &&
      state.wave?.state === 'LEVEL_COMPLETE' &&
      (Number(state.counts?.enemies) || 0) > 0;
    if (!blocked) {
      finish();
      continue;
    }
    const key = `${state.level}:${state.wave?.currentWaveNumber}`;
    if (!current || current.key !== key) {
      finish();
      current = { key, level: state.level, wave: state.wave?.currentWaveNumber, startMs: entry.elapsedMs, lastMs: entry.elapsedMs };
    } else {
      current.lastMs = entry.elapsedMs;
    }
  }
  finish();
  return stalls;
}

async function exerciseRestart(page) {
  const before = await collectState(page);
  if (before.scene !== 'gameOver') {
    await page.evaluate(() => {
      const game = window.__game;
      game.score = Math.max(game.score || 0, 1500);
      game.lives = 0;
      game.gameOver();
    });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'gameOver', null, { timeout: 10000 });
  }
  await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    if (!scene?.restartRun) throw new Error('Missing restartRun on game-over scene');
    scene.restartRun();
  });
  await waitForPlayReady(page, 15000);
  return collectState(page);
}

async function runOne(browser, runIndex) {
  const page = await browser.newPage({ viewport });
  const consoleEvents = [];
  const pageErrors = [];
  const badResponses = [];
  const requestFailures = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 600) });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push({ status: response.status(), url: response.url(), resourceType: response.request().resourceType() });
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

  const timeline = [];
  let currentIntent = { horizontal: 'none', vertical: 'none', dodge: false };
  let heldSpace = false;
  try {
    await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForPlayReady(page);
    await page.keyboard.down('Space');
    heldSpace = true;

    const startedAt = Date.now();
    while (Date.now() - startedAt < durationMs) {
      const elapsedMs = Date.now() - startedAt;
      const state = await collectState(page);
      timeline.push({ elapsedMs, state });
      if (state.overlays?.fatal || state.scene !== 'play' || Number(state.lives) <= 0) break;
      currentIntent = await applyIntent(page, currentIntent, chooseIntent(state));
      await page.waitForTimeout(sampleMs);
    }

    const finalBeforeRestart = await collectState(page);
    const restartState = await exerciseRestart(page);
    const finalScreenshot = path.join(outputDir, `run-${String(runIndex).padStart(2, '0')}-final.png`);
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    const summary = summarizeTimeline(timeline);
    summary.sectorClearStalls = findSectorClearStalls(timeline);
    return {
      runIndex,
      summary,
      finalBeforeRestart,
      restartOk: restartState.scene === 'play' && restartState.player?.active === true,
      restartState,
      consoleEvents,
      pageErrors,
      badResponses,
      requestFailures,
      finalScreenshot
    };
  } finally {
    if (heldSpace) await page.keyboard.up('Space').catch(() => {});
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ShiftLeft']) {
      await page.keyboard.up(key).catch(() => {});
    }
    await page.close().catch(() => {});
  }
}

function writeMarkdownReport(report) {
  const lines = [
    '# Fairness Telemetry',
    '',
    `- Runs: ${report.runs.length}`,
    `- Run duration target: ${durationMs} ms`,
    `- Sample interval: ${sampleMs} ms`,
    `- Restart failures: ${report.restartFailures}`,
    `- Sector-clear stalls: ${report.sectorClearStalls.length}`,
    `- Early deaths: ${report.earlyDeaths}`,
    `- Peak level range: ${report.peakLevels.join(', ')}`,
    `- Boss deaths: ${report.bossDeaths}`,
    `- Clutch shield samples: ${report.clutchShieldSamples}`,
    `- Powerup visible samples by source: ${JSON.stringify(report.powerupSources)}`,
    '',
    '## Runs',
    ''
  ];
  for (const run of report.runs) {
    lines.push(`- Run ${run.runIndex}: survived ${Math.round(run.summary.survivedMs / 1000)}s, peak L${run.summary.peakLevel}, deaths ${run.summary.deaths.length}, final ${run.summary.finalScene}, restart ${run.restartOk ? 'ok' : 'failed'}`);
  }
  writeFileSync(path.join(outputDir, 'summary.md'), `${lines.join('\n')}\n`);
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu', '--no-sandbox']
});

try {
  const runReports = [];
  for (let index = 1; index <= runs; index += 1) {
    const report = await runOne(browser, index);
    runReports.push(report);
    console.log(`[fairness-telemetry] run=${index}/${runs} survived=${Math.round(report.summary.survivedMs / 1000)}s peakLevel=${report.summary.peakLevel} deaths=${report.summary.deaths.length} restart=${report.restartOk ? 'ok' : 'fail'}`);
  }

  const blockingRequestFailures = runReports.flatMap(run => run.requestFailures)
    .filter(request => !(request.resourceType === 'media' && request.failure === 'net::ERR_ABORTED'));
  const sectorClearStalls = runReports.flatMap(run => run.summary.sectorClearStalls.map(stall => ({ ...stall, runIndex: run.runIndex })));
  const peakLevels = runReports.map(run => run.summary.peakLevel);
  const earlyDeathCutoffMs = Math.min(45000, durationMs * 0.8);
  const earlyDeaths = runReports.filter(run => run.summary.finalScene === 'gameOver' && run.summary.survivedMs < earlyDeathCutoffMs).length;
  const powerupSources = {};
  for (const run of runReports) {
    for (const [source, count] of Object.entries(run.summary.powerupsBySource || {})) {
      powerupSources[source] = (powerupSources[source] || 0) + count;
    }
  }

  const report = {
    ok: true,
    baseUrl,
    outputDir,
    config: { runs, durationMs, sampleMs, viewport },
    restartFailures: runReports.filter(run => !run.restartOk).length,
    sectorClearStalls,
    earlyDeaths,
    bossDeaths: runReports.reduce((sum, run) => sum + run.summary.bossDeaths.length, 0),
    clutchShieldSamples: runReports.reduce((sum, run) => sum + run.summary.clutchShieldSamples.length, 0),
    peakLevels,
    powerupSources,
    runs: runReports
  };

  const technicalIssues = [
    ...runReports.flatMap(run => run.pageErrors.map(error => `run ${run.runIndex} pageerror: ${error}`)),
    ...runReports.flatMap(run => run.consoleEvents.map(event => `run ${run.runIndex} ${event.type}: ${event.text}`)),
    ...runReports.flatMap(run => run.badResponses.map(response => `run ${run.runIndex} HTTP ${response.status}: ${response.url}`)),
    ...blockingRequestFailures.map(request => `request failed ${request.method} ${request.resourceType}: ${request.url} (${request.failure})`),
    ...(report.restartFailures ? [`restart failures: ${report.restartFailures}`] : []),
    ...sectorClearStalls.map(stall => `sector clear stall run=${stall.runIndex} level=${stall.level} duration=${Math.round(stall.durationMs / 1000)}s`),
    ...(earlyDeaths === runs ? [`all ${runs} runs died before ${Math.round(earlyDeathCutoffMs / 1000)}s`] : [])
  ];
  report.ok = technicalIssues.length === 0;
  report.technicalIssues = technicalIssues;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  writeMarkdownReport(report);
  assert(report.ok, `fairness telemetry failed: ${technicalIssues.join('; ')}`);
  console.log(`[fairness-telemetry] PASS output=${outputDir}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
