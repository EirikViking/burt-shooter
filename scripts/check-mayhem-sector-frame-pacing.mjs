import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4777));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/mayhem-sector-frame-pacing-${timestamp()}`);
const devtoolsHash = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

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
  throw new Error(`No available frame pacing check port found starting at ${startPort}`);
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
    pilotXp: 203131,
    pilotRank: 19,
    highestPilotRank: 19,
    totalRuns: 80,
    bestScore: 168666,
    bestSector: 60,
    bestLevel: 60,
    bestRank: 19,
    bestRunTimeSeconds: 3600,
    survivedSeconds: 3600,
    totalBossesDefeated: 30,
    totalWavesCleared: 300,
    totalCodexDiscoveries: 783,
    runClears: 2,
    noHitWaves: 12,
    noHitSectors: 2,
    clearWithLivesRemaining: 1,
    highestScoreMultiplier: 1,
    shipSpecificMilestones: {},
    discoveredThreatIds: [],
    defeatedBossIds: [],
    runThemesSurvived: [],
    secretShipUnlockIds: [],
    creditsEasterEggFound: false,
    unlockedShipIds: Array.from({ length: 23 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`),
    lastNewlyUnlockedShipIds: [],
    newRanksThisRun: [],
    rankAchievementsUnlocked: [],
    updatedAt: '2026-06-21T00:00:00.000Z'
  };
}

function makeSectorRecords() {
  return {
    version: 1,
    updatedAt: '2026-06-21T00:00:00.000Z',
    byCheckpoint: Object.fromEntries([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((checkpoint) => [String(checkpoint), {
      startSector: checkpoint,
      scoreEarned: checkpoint * 1000,
      highestSectorReached: checkpoint === 5 ? 6 : checkpoint + 2,
      finalSector: checkpoint === 5 ? 6 : checkpoint + 2,
      shipId: 'nova_ship_01',
      shipName: 'Nova Sparrow',
      completedAt: '2026-06-21T00:00:00.000Z'
    }]))
  };
}

function emptyDiscoveryItems() {
  return {
    enemies: {},
    attackPatterns: {},
    waveTactics: {},
    powerups: {},
    sectors: {},
    elites: {},
    bosses: {},
    runThemes: {},
    cabinetLogs: {},
    pilotRanks: {},
    rareModifiers: {}
  };
}

function makeLargeThreatDiscovery(targetCount = 783) {
  const catalog = getThreatCodexCatalog();
  const items = emptyDiscoveryItems();
  let count = 0;
  const add = (category, id, name, metadata = {}) => {
    if (!items[category] || items[category][id] || count >= targetCount) return;
    items[category][id] = {
      id,
      category,
      name: name || id,
      firstSeenAt: '2026-06-20T00:00:00.000Z',
      lastSeenAt: '2026-06-20T00:00:00.000Z',
      timesSeen: 3,
      timesDefeated: category === 'enemies' || category === 'bosses' ? 1 : 0,
      timesSurvived: category === 'runThemes' ? 1 : 0,
      timesKilledPlayer: 0,
      bestClearTimeAgainst: null,
      highestScoreDuringEncounter: 0,
      metadata
    };
    count += 1;
  };
  for (const [category, entries] of Object.entries(catalog || {})) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) add(category, String(entry.id), entry.name || entry.label || String(entry.id), { seededFor: 'frame_pacing' });
  }
  for (let sector = 1; count < targetCount && sector <= 2000; sector += 1) {
    add('sectors', `sector_${String(sector).padStart(3, '0')}`, `SECTOR ${sector}`, { sector });
  }
  return {
    version: 1,
    items,
    discoveriesThisRun: [],
    recentRunThemes: [],
    unreadIds: [],
    updatedAt: '2026-06-21T00:00:00.000Z'
  };
}

function withQuery(query = {}) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
  return url.toString();
}

async function seedProfile(page) {
  await page.addInitScript(({ progress, sectorRecords, threatDiscovery }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: progress.bestScore,
      bestRank: progress.bestRank,
      bestLevel: progress.bestLevel
    }));
    localStorage.setItem('novaSwarm.sectorStartChallengeRecords.v1', JSON.stringify(sectorRecords));
    localStorage.setItem('nova.threatDiscovery.v1', JSON.stringify(threatDiscovery));
    localStorage.setItem('novaSwarm.localLeaderboard.v2', '[]');
    localStorage.setItem('novaSwarm.mockSteamLeaderboard.v1', '[]');
  }, {
    progress: makeProgress(),
    sectorRecords: makeSectorRecords(),
    threatDiscovery: makeLargeThreatDiscovery()
  });
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function installRuntimeProbe(page) {
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    window.__framePacingProbe = {
      setItemCalls: 0,
      setItemMs: 0,
      setItemBytes: 0,
      byKey: {},
      buildRunSummaryCalls: 0
    };
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      const started = performance.now();
      try {
        return originalSetItem.call(this, key, value);
      } finally {
        const elapsed = performance.now() - started;
        const textKey = String(key);
        const byteLength = String(value ?? '').length;
        const probe = window.__framePacingProbe;
        probe.setItemCalls += 1;
        probe.setItemMs += elapsed;
        probe.setItemBytes += byteLength;
        probe.byKey[textKey] = probe.byKey[textKey] || { calls: 0, ms: 0, bytes: 0 };
        probe.byKey[textKey].calls += 1;
        probe.byKey[textKey].ms += elapsed;
        probe.byKey[textKey].bytes += byteLength;
      }
    };
    const hookBuildSummary = () => {
      const game = window.__game;
      if (!game || game.__framePacingBuildSummaryHooked) return;
      const original = game.buildRunSummary?.bind(game);
      if (typeof original !== 'function') return;
      game.buildRunSummary = (...args) => {
        window.__framePacingProbe.buildRunSummaryCalls += 1;
        return original(...args);
      };
      game.__framePacingBuildSummaryHooked = true;
    };
    hookBuildSummary();
    window.__framePacingProbeHookBuildSummary = hookBuildSummary;
  });
}

async function sampleFrameIntervals(page, durationMs) {
  return page.evaluate((sampleDurationMs) => new Promise((resolve) => {
    const intervals = [];
    let previous = performance.now();
    const startedAt = previous;
    const tick = (now) => {
      intervals.push(now - previous);
      previous = now;
      if (now - startedAt >= sampleDurationMs) {
        resolve(intervals);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), durationMs);
}

async function sampleLaunch(page, options, durationMs = 4200) {
  const intervals = await page.evaluate(({ runOptions, sampleMs }) => new Promise((resolve) => {
    const intervals = [];
    let previous = performance.now();
    const startedAt = previous;
    let launched = false;
    const tick = (now) => {
      intervals.push(now - previous);
      previous = now;
      if (!launched) {
        launched = true;
        Promise.resolve(window.__game?.startGame?.(undefined, runOptions)).catch((error) => {
          window.__framePacingLaunchError = error?.message || String(error);
        });
      }
      if (now - startedAt >= sampleMs) {
        resolve(intervals);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { runOptions: options, sampleMs: durationMs });
  await page.evaluate(() => window.__framePacingProbeHookBuildSummary?.());
  return summarizeIntervals(intervals);
}

async function waitForActiveWave(page) {
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const play = window.__game?.scenes?.play;
    return state.scene === 'play' &&
      !play?.sectorArrivalStinger &&
      (play?.enemyManager?.enemies?.length || 0) > 0 &&
      (state.counts?.enemies || 0) > 0;
  }, null, { timeout: 30000 });
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
    play?.clearEnemyBullets?.('frame_pacing_probe');
  });
}

async function sampleNextWaveEntry(page, sampleMs = 3600) {
  const setup = await page.evaluate(() => {
    const manager = window.__game?.scenes?.play?.enemyManager;
    if (!manager || !Array.isArray(manager.waves) || manager.waves.length < 2) return { available: false };
    const nextIndex = Math.min(
      Math.max(1, (Number(manager.currentWaveIndex) || 0) + 1),
      Math.max(1, manager.normalWavesTotal - 1)
    );
    const config = manager.waves[nextIndex];
    if (!config) return { available: false };
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
  if (!setup.available) return { setup, frameSummary: summarizeIntervals([]), after: null };
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
  return { setup, frameSummary: summarizeIntervals(intervals), after };
}

async function probeSnapshot(page) {
  return page.evaluate(() => {
    const probe = window.__framePacingProbe || {};
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const threat = probe.byKey?.['nova.threatDiscovery.v1'] || { calls: 0, ms: 0, bytes: 0 };
    return {
      scene: state.scene,
      runMode: state.runMode,
      level: state.level,
      wave: state.wave,
      counts: state.counts,
      setItemCalls: Number(probe.setItemCalls || 0),
      setItemMs: Number(Number(probe.setItemMs || 0).toFixed(3)),
      setItemBytes: Number(probe.setItemBytes || 0),
      threatDiscoveryWrites: Number(threat.calls || 0),
      threatDiscoveryWriteMs: Number(Number(threat.ms || 0).toFixed(3)),
      threatDiscoveryWriteBytes: Number(threat.bytes || 0),
      buildRunSummaryCalls: Number(probe.buildRunSummaryCalls || 0)
    };
  });
}

function diffProbe(after, before) {
  return {
    setItemCalls: after.setItemCalls - before.setItemCalls,
    setItemMs: Number((after.setItemMs - before.setItemMs).toFixed(3)),
    setItemBytes: after.setItemBytes - before.setItemBytes,
    threatDiscoveryWrites: after.threatDiscoveryWrites - before.threatDiscoveryWrites,
    threatDiscoveryWriteMs: Number((after.threatDiscoveryWriteMs - before.threatDiscoveryWriteMs).toFixed(3)),
    threatDiscoveryWriteBytes: after.threatDiscoveryWriteBytes - before.threatDiscoveryWriteBytes,
    buildRunSummaryCalls: after.buildRunSummaryCalls - before.buildRunSummaryCalls
  };
}

async function runScenario(browser, scenario) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await seedProfile(page);
  await page.goto(withQuery({
    skipIntro: '1',
    offlineLeaderboard: '1',
    mockSteamLeaderboard: '1',
    controlSmoke: '1',
    'nova-devtools-hash': devtoolsHash
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, { timeout: 30000 });
  await installRuntimeProbe(page);
  const beforeLaunch = await probeSnapshot(page);
  const launch = await sampleLaunch(page, scenario.options);
  const afterLaunch = await probeSnapshot(page);
  await waitForActiveWave(page);
  await makeProbePlayerSafe(page);
  await page.keyboard.down('Space');
  await page.waitForTimeout(250);
  const beforeActive = await probeSnapshot(page);
  const activeIntervals = await sampleFrameIntervals(page, scenario.activeSampleMs || 12000);
  await makeProbePlayerSafe(page);
  const afterActive = await probeSnapshot(page);
  const nextWaveEntry = await sampleNextWaveEntry(page);
  await page.keyboard.up('Space');
  await page.screenshot({ path: path.join(outputDir, `${scenario.name}.png`), fullPage: false });
  const finalState = await readState(page);
  await page.close();
  return {
    name: scenario.name,
    options: scenario.options,
    finalState: {
      scene: finalState.scene,
      runMode: finalState.runMode,
      level: finalState.level,
      wave: finalState.wave,
      counts: finalState.counts
    },
    launch,
    launchProbe: diffProbe(afterLaunch, beforeLaunch),
    activeWave: summarizeIntervals(activeIntervals),
    activeWaveProbe: diffProbe(afterActive, beforeActive),
    nextWaveEntry,
    pageErrors,
    consoleErrors
  };
}

function analyzeVideo(videoPath) {
  if (!existsSync(videoPath)) return null;
  const metadata = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,avg_frame_rate,r_frame_rate,duration,nb_frames',
    '-of', 'json',
    videoPath
  ], { encoding: 'utf8' });
  if (metadata.status !== 0) return { path: videoPath, skipped: true, reason: metadata.stderr || 'ffprobe_failed' };
  const width = 320;
  const height = 180;
  const raw = spawnSync('ffmpeg', [
    '-v', 'error',
    '-i', videoPath,
    '-vf', `scale=${width}:${height},format=gray`,
    '-f', 'rawvideo',
    '-pix_fmt', 'gray',
    '-'
  ], { encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 });
  if (raw.status !== 0) return { path: videoPath, metadata: JSON.parse(metadata.stdout), skipped: true, reason: raw.stderr?.toString?.() || 'ffmpeg_failed' };
  const frameSize = width * height;
  const frameCount = Math.floor(raw.stdout.length / frameSize);
  const diffs = [];
  for (let frame = 1; frame < frameCount; frame += 1) {
    const prevOffset = (frame - 1) * frameSize;
    const offset = frame * frameSize;
    let sum = 0;
    for (let index = 0; index < frameSize; index += 2) {
      sum += Math.abs(raw.stdout[offset + index] - raw.stdout[prevOffset + index]);
    }
    diffs.push(sum / (frameSize / 2));
  }
  const useful = diffs.slice(Math.min(60, Math.floor(diffs.length / 4)));
  const median = percentile(useful, 0.5);
  const jerk = [];
  const lowThenJump = [];
  for (let index = 1; index < useful.length; index += 1) {
    jerk.push(Math.abs(useful[index] - useful[index - 1]));
    if (median && useful[index - 1] < median * 0.35 && useful[index] > median * 1.65) {
      lowThenJump.push(index);
    }
  }
  return {
    path: videoPath,
    metadata: JSON.parse(metadata.stdout),
    frameCount,
    opticalDelta: {
      average: Number((diffs.reduce((sum, value) => sum + value, 0) / Math.max(1, diffs.length)).toFixed(3)),
      p50: Number(percentile(diffs, 0.5).toFixed(3)),
      p95: Number(percentile(diffs, 0.95).toFixed(3)),
      p99: Number(percentile(diffs, 0.99).toFixed(3)),
      max: Number((diffs.length ? Math.max(...diffs) : 0).toFixed(3)),
      lowMotionFrames: useful.filter((value) => median && value < median * 0.30).length,
      lowThenJump: lowThenJump.length,
      jerkP95: Number(percentile(jerk, 0.95).toFixed(3)),
      jerkMax: Number((jerk.length ? Math.max(...jerk) : 0).toFixed(3))
    }
  };
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const mayhem = await runScenario(browser, {
    name: 'mayhem-sector-1-opening',
    options: { runMode: 'ranked' }
  });
  const sector = await runScenario(browser, {
    name: 'sector-run-checkpoint-20-opening',
    options: { runMode: 'sector_start', startSector: 20 }
  });
  const ratios = {
    activeP95MayhemVsSector: Number((mayhem.activeWave.p95Ms / Math.max(1, sector.activeWave.p95Ms)).toFixed(3)),
    activeP99MayhemVsSector: Number((mayhem.activeWave.p99Ms / Math.max(1, sector.activeWave.p99Ms)).toFixed(3)),
    activeLong33Delta: mayhem.activeWave.longFrames33 - sector.activeWave.longFrames33,
    activeThreatDiscoveryWriteDelta: mayhem.activeWaveProbe.threatDiscoveryWrites - sector.activeWaveProbe.threatDiscoveryWrites
  };
  const video = {
    mayhem: analyzeVideo(path.join('performance-video', 'mayhem_run.mp4')),
    mayhemRun2: analyzeVideo(path.join('performance-video', 'mayhem_run2.mp4')),
    mayhemRun3: analyzeVideo(path.join('performance-video', 'mayhem_run3.mp4')),
    sector: analyzeVideo(path.join('performance-video', 'sector_run.mp4'))
  };
  const failures = [];
  for (const result of [mayhem, sector]) {
    if (result.activeWave.p95Ms > 28) failures.push(`${result.name} active p95 ${result.activeWave.p95Ms}ms exceeds 28ms`);
    if (result.activeWave.p99Ms > 42) failures.push(`${result.name} active p99 ${result.activeWave.p99Ms}ms exceeds 42ms`);
    if (result.activeWave.longFrames50 > 2) failures.push(`${result.name} active has ${result.activeWave.longFrames50} frame(s) over 50ms`);
    if (result.activeWaveProbe.threatDiscoveryWrites > 2) failures.push(`${result.name} wrote threat discovery ${result.activeWaveProbe.threatDiscoveryWrites} times during active wave`);
    if (result.activeWaveProbe.buildRunSummaryCalls > 0) failures.push(`${result.name} called full buildRunSummary ${result.activeWaveProbe.buildRunSummaryCalls} times during active wave`);
    if (result.nextWaveEntry.frameSummary.p95Ms > 32) failures.push(`${result.name} next-wave p95 ${result.nextWaveEntry.frameSummary.p95Ms}ms exceeds 32ms`);
    if (result.nextWaveEntry.frameSummary.longFrames50 > 2) failures.push(`${result.name} next-wave has ${result.nextWaveEntry.frameSummary.longFrames50} frame(s) over 50ms`);
    if (result.pageErrors.length) failures.push(`${result.name} page errors: ${result.pageErrors.join('; ')}`);
    if (result.consoleErrors.length) failures.push(`${result.name} console errors: ${result.consoleErrors.join('; ')}`);
  }
  if (ratios.activeP95MayhemVsSector > 1.45) {
    failures.push(`Mayhem active p95 ratio ${ratios.activeP95MayhemVsSector} is too far above Sector Run`);
  }

  const report = {
    status: failures.length ? 'failed' : 'passed',
    generatedAt: new Date().toISOString(),
    outputDir,
    baseUrl,
    mayhem,
    sector,
    ratios,
    video,
    failures
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[mayhem-sector-frame-pacing] report=${path.relative(process.cwd(), path.join(outputDir, 'report.json')).replaceAll(path.sep, '/')}`);
  assert.equal(failures.length, 0, failures.join('\n'));
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
