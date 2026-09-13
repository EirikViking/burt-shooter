import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';

import { AssetManifest } from '../src/assets/assetManifest.js';
import {
  GENERATED_ENEMY_PROFILES,
  SMALL_GENERATED_ENEMY_ROSTER_ENABLED_BY_DEFAULT,
  isSmallGeneratedEnemyProfile,
  getGeneratedEnemyProfilesForLevel
} from '../src/config/GeneratedEnemyProfiles.js';

const args = new Set(process.argv.slice(2));
const diagnosticOnly = args.has('--diagnostic-only');
const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4741));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const sampleMs = Number(process.env.NOVA_SMALL_ENEMY_SAMPLE_MS) || 10000;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/small-enemy-roster-feel-${timestamp()}`);
const devtoolsHash = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const perfFlagQuery = Object.freeze({
  disableNewEnemyRoster: 'novaPerfDisableNewEnemyRoster',
  disableSmallEnemyShips: 'novaPerfDisableSmallEnemyShips',
  enableSmallEnemyShips: 'novaPerfEnableSmallEnemyShips'
});

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function publicFile(publicPath) {
  return path.join(process.cwd(), 'public', String(publicPath || '').replace(/^\//, ''));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function paethPredictor(left, up, upperLeft) {
  const p = left + up - upperLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upperLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upperLeft;
}

function readPngInfo(file) {
  const buffer = readFileSync(file);
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`Not a PNG: ${file}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG color format ${bitDepth}/${colorType}: ${file}`);
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const rowBytes = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idat));
  const rgba = new Uint8Array(width * height * 4);
  let sourceOffset = 0;
  let prior = new Uint8Array(rowBytes);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const raw = inflated.subarray(sourceOffset, sourceOffset + rowBytes);
    sourceOffset += rowBytes;
    const current = new Uint8Array(rowBytes);
    for (let x = 0; x < rowBytes; x += 1) {
      const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
      const up = prior[x] || 0;
      const upperLeft = x >= bytesPerPixel ? prior[x - bytesPerPixel] : 0;
      let value;
      if (filter === 0) value = raw[x];
      else if (filter === 1) value = raw[x] + left;
      else if (filter === 2) value = raw[x] + up;
      else if (filter === 3) value = raw[x] + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw[x] + paethPredictor(left, up, upperLeft);
      else throw new Error(`Unsupported PNG filter ${filter}: ${file}`);
      current[x] = value & 0xff;
    }
    prior = current;

    for (let x = 0; x < width; x += 1) {
      const src = x * bytesPerPixel;
      const dst = (y * width + x) * 4;
      rgba[dst] = current[src];
      rgba[dst + 1] = current[src + 1];
      rgba[dst + 2] = current[src + 2];
      rgba[dst + 3] = colorType === 6 ? current[src + 3] : 255;
    }
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let alphaPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = rgba[(y * width + x) * 4 + 3];
      if (alpha <= 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      alphaPixels += 1;
    }
  }

  return {
    width,
    height,
    colorType,
    alphaWidth: maxX >= minX ? maxX - minX + 1 : 0,
    alphaHeight: maxY >= minY ? maxY - minY + 1 : 0,
    alphaPixels
  };
}

function summarizeNumbers(values) {
  const useful = values.filter((value) => Number.isFinite(value));
  if (!useful.length) return { min: 0, p10: 0, median: 0, p90: 0, max: 0 };
  return {
    min: round(Math.min(...useful)),
    p10: round(percentile(useful, 0.1)),
    median: round(percentile(useful, 0.5)),
    p90: round(percentile(useful, 0.9)),
    max: round(Math.max(...useful))
  };
}

function buildInventory() {
  const enemyAssets = AssetManifest.generated?.enemies || [];
  const assetInfo = enemyAssets.map((assetPath) => {
    const file = publicFile(assetPath);
    if (!existsSync(file)) throw new Error(`Missing generated enemy asset ${assetPath}`);
    return {
      path: assetPath,
      ...readPngInfo(file)
    };
  });

  const rows = GENERATED_ENEMY_PROFILES.map((profile) => {
    const info = assetInfo[profile.spriteIndex];
    const textureScale = (Number(profile.targetWidth) || info.width) / Math.max(1, info.width);
    const displayScale = textureScale * (Number(profile.spriteScale) || 1);
    const renderedWidth = info.width * displayScale;
    const renderedHeight = info.height * displayScale;
    const visibleWidth = info.alphaWidth * displayScale;
    const visibleHeight = info.alphaHeight * displayScale;
    const visibleArea = info.alphaPixels * displayScale * displayScale;
    return {
      id: profile.id,
      profile,
      assetPath: info.path,
      sourceWidth: info.width,
      sourceHeight: info.height,
      alphaWidth: info.alphaWidth,
      alphaHeight: info.alphaHeight,
      alphaPixels: info.alphaPixels,
      renderedWidth: round(renderedWidth),
      renderedHeight: round(renderedHeight),
      visibleWidth: round(visibleWidth),
      visibleHeight: round(visibleHeight),
      visibleArea: round(visibleArea),
      small: isSmallGeneratedEnemyProfile(profile),
      newlyAdded: profile.lateMayhem === true,
      family: profile.lateMayhem ? 'late-mayhem' : profile.earlySurge ? 'early-surge' : 'legacy'
    };
  });

  const legacyRows = rows.filter((row) => row.family === 'legacy');
  const lateRows = rows.filter((row) => row.family === 'late-mayhem');
  const earlyRows = rows.filter((row) => row.family === 'early-surge');
  const legacyMedianWidth = percentile(legacyRows.map((row) => row.visibleWidth), 0.5);
  const legacyMedianArea = percentile(legacyRows.map((row) => row.visibleArea), 0.5);

  return {
    rows,
    lateRows,
    smallLateRows: lateRows.filter((row) => row.small),
    baseline: {
      threshold: 'small if late-mayhem visible width is below 82% of legacy median width, or visible area is below 70% of legacy median area',
      legacyMedianVisibleWidth: round(legacyMedianWidth),
      legacyMedianVisibleArea: round(legacyMedianArea),
      visibleWidthThreshold: round(legacyMedianWidth * 0.82),
      visibleAreaThreshold: round(legacyMedianArea * 0.7),
      profileDisplayWidth: {
        legacy: summarizeNumbers(legacyRows.map((row) => row.renderedWidth)),
        lateMayhem: summarizeNumbers(lateRows.map((row) => row.renderedWidth)),
        earlySurge: summarizeNumbers(earlyRows.map((row) => row.renderedWidth))
      },
      visibleWidth: {
        legacy: summarizeNumbers(legacyRows.map((row) => row.visibleWidth)),
        lateMayhem: summarizeNumbers(lateRows.map((row) => row.visibleWidth)),
        earlySurge: summarizeNumbers(earlyRows.map((row) => row.visibleWidth))
      },
      visibleArea: {
        legacy: summarizeNumbers(legacyRows.map((row) => row.visibleArea)),
        lateMayhem: summarizeNumbers(lateRows.map((row) => row.visibleArea)),
        earlySurge: summarizeNumbers(earlyRows.map((row) => row.visibleArea))
      },
      rawAlphaWidth: {
        legacyAssets: summarizeNumbers(assetInfo.slice(0, 50).map((info) => info.alphaWidth)),
        lateMayhemAssets: summarizeNumbers(assetInfo.slice(50).map((info) => info.alphaWidth))
      },
      rawAlphaArea: {
        legacyAssets: summarizeNumbers(assetInfo.slice(0, 50).map((info) => info.alphaPixels)),
        lateMayhemAssets: summarizeNumbers(assetInfo.slice(50).map((info) => info.alphaPixels))
      }
    }
  };
}

function actionForRow(row) {
  if (row.small) return 'remove from roster';
  if (row.newlyAdded) return 'keep';
  return 'keep';
}

function markdownInventory(inventory) {
  const lines = [
    '# Small Enemy Roster Inventory',
    '',
    `Threshold: ${inventory.baseline.threshold}.`,
    `Legacy median visible width: ${inventory.baseline.legacyMedianVisibleWidth}px; visible-width threshold: ${inventory.baseline.visibleWidthThreshold}px.`,
    `Legacy median visible area: ${inventory.baseline.legacyMedianVisibleArea}px^2; visible-area threshold: ${inventory.baseline.visibleAreaThreshold}px^2.`,
    '',
    '| enemy/profile id | asset key/path | rendered/display size | source image size | spawn sectors/waves | movement profile | small | newly added | recommended action |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'
  ];

  for (const row of inventory.lateRows) {
    const profile = row.profile;
    lines.push([
      profile.id,
      row.assetPath,
      `${row.visibleWidth}x${row.visibleHeight}px visible (${row.renderedWidth}x${row.renderedHeight}px texture)`,
      `${row.sourceWidth}x${row.sourceHeight}px, alpha ${row.alphaWidth}x${row.alphaHeight}`,
      `sector ${profile.unlockLevel}+ generated normal waves`,
      `${profile.movementStyle} / ${profile.fireStyle} / ${profile.role}`,
      row.small ? 'yes' : 'no',
      row.newlyAdded ? 'yes, late-mayhem asset batch' : 'no',
      actionForRow(row)
    ].map((value) => String(value).replace(/\|/g, '/')).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
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
  const { command, args: viteArgs } = viteCommand();
  const server = spawn(command, [...viteArgs, '--host', host, '--port', String(port), '--strictPort'], {
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

function summarizeFrameIntervals(intervals) {
  const useful = intervals.filter((value) => Number.isFinite(value) && value > 0);
  const average = useful.length ? useful.reduce((sum, value) => sum + value, 0) / useful.length : 0;
  const jitters = [];
  for (let index = 1; index < useful.length; index += 1) {
    jitters.push(Math.abs(useful[index] - useful[index - 1]));
  }
  const avgJitter = jitters.length ? jitters.reduce((sum, value) => sum + value, 0) / jitters.length : 0;
  return {
    frames: useful.length,
    averageMs: round(average),
    averageFps: average > 0 ? round(1000 / average, 1) : 0,
    p95Ms: round(percentile(useful, 0.95)),
    p99Ms: round(percentile(useful, 0.99)),
    worstMs: round(useful.length ? Math.max(...useful) : 0),
    longFrames33: useful.filter((value) => value > 33.34).length,
    longFrames50: useful.filter((value) => value > 50).length,
    averageJitterMs: round(avgJitter),
    p95JitterMs: round(percentile(jitters, 0.95)),
    worstJitterMs: round(jitters.length ? Math.max(...jitters) : 0)
  };
}

function summarizeSamples(samples) {
  const maxOf = (key) => samples.length ? Math.max(...samples.map((sample) => Number(sample[key]) || 0)) : 0;
  const avgOf = (key) => samples.length
    ? samples.reduce((sum, sample) => sum + (Number(sample[key]) || 0), 0) / samples.length
    : 0;
  return {
    activeEnemiesMax: maxOf('activeEnemies'),
    activeEnemiesAvg: round(avgOf('activeEnemies'), 1),
    smallEnemiesMax: maxOf('smallEnemies'),
    smallEnemiesAvg: round(avgOf('smallEnemies'), 1),
    lateMayhemEnemiesMax: maxOf('lateMayhemEnemies'),
    earlySurgeEnemiesMax: maxOf('earlySurgeEnemies'),
    activeProjectilesMax: maxOf('activeProjectiles'),
    pendingWaveSpawnsMax: maxOf('pendingWaveSpawns')
  };
}

function chooseScenarioProfiles(inventory) {
  const eligibleAt = (level, predicate) => inventory.rows
    .filter((row) => row.profile.unlockLevel <= level && predicate(row));
  const byVisibleWidth = (a, b) => a.visibleWidth - b.visibleWidth;
  const byArea = (a, b) => a.visibleArea - b.visibleArea;

  const small = [...inventory.smallLateRows].sort(byVisibleWidth)[0];
  const lateReplacement = eligibleAt(20, (row) => row.family === 'late-mayhem' && !row.small)
    .sort((a, b) => Math.abs(a.profile.unlockLevel - small.profile.unlockLevel) - Math.abs(b.profile.unlockLevel - small.profile.unlockLevel) || byArea(a, b))[0];
  const legacyMedian = eligibleAt(20, (row) => row.family === 'legacy')
    .sort(byVisibleWidth)[Math.floor(eligibleAt(20, (row) => row.family === 'legacy').length * 0.55)];
  const legacyLarge = eligibleAt(20, (row) => row.family === 'legacy')
    .sort((a, b) => b.visibleWidth - a.visibleWidth)[0];
  const sector5Legacy = eligibleAt(5, (row) => row.family === 'legacy')
    .sort((a, b) => Math.abs(a.visibleWidth - inventory.baseline.legacyMedianVisibleWidth) - Math.abs(b.visibleWidth - inventory.baseline.legacyMedianVisibleWidth))[0];

  if (!small || !lateReplacement || !legacyMedian || !legacyLarge || !sector5Legacy) {
    throw new Error('Unable to choose representative enemy profiles for small-roster feel scenarios');
  }

  return { small, lateReplacement, legacyMedian, legacyLarge, sector5Legacy };
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
    play?.clearEnemyBullets?.('small_enemy_roster_feel_probe');
  });
}

async function waitForPlay(page) {
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, { timeout: 30000 });
  await page.evaluate(() => window.__game.startGame());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return play?.enemyManager && !play?.sectorArrivalStinger;
  }, null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const manager = window.__game?.scenes?.play?.enemyManager;
    return manager?.state === 'WAVE_ACTIVE' && (manager?.enemies?.length || 0) > 0;
  }, null, { timeout: 30000 });
}

async function forceWave(page, scenario) {
  return page.evaluate((config) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) return { available: false, reason: 'missing play enemy manager' };

    play.clearPendingEnemyStart?.();
    play.clearSectorArrivalStinger?.();
    play.clearEnemyBullets?.('small_enemy_roster_feel_force_wave');
    manager.clearPendingWaveSpawns?.();
    manager.clearEnemies?.();
    manager.level = config.level;
    game.level = config.level;
    manager.currentWaveIndex = 0;
    manager.normalWavesTotal = 1;
    manager.bossWaveIndex = 1;
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    manager.pendingWaveConfig = null;
    manager.waveBriefingTimer = 0;
    manager.waveBriefingAnnounced = true;
    manager.currentModifier = null;
    manager.eliteMiddleShipPlan = [];
    manager.eliteMiddleShipsSpawnedThisLevel = 0;
    manager.hijackerSpawnedThisLevel = true;
    manager.hijackerSpawnAttemptedThisLevel = true;
    manager.directorState = { tier: 0, spawnCadenceScale: 1, eliteChance: 0, clutchDropChance: 0 };
    const wave = {
      type: config.type,
      count: config.count,
      formation: config.formation,
      tactic: manager.pickWaveTactic?.(config.level, 0, config.formation) || 'pulse_net',
      entry: config.entry || 'split',
      cadence: config.cadence || 1.18,
      dangerMidShipIds: [],
      eliteMiddleShipId: null,
      multiEliteMiddleShipIds: []
    };
    manager.waves = [wave];
    manager.spawnWave(wave);
    return {
      available: true,
      wave,
      state: manager.state,
      pendingWaveSpawns: Number(manager.waveSpawnPendingCount) || 0,
      spawnedEnemies: manager.enemies.length
    };
  }, scenario);
}

async function sampleScenario(page, durationMs, smallProfileIds) {
  return page.evaluate(({ durationMs: duration, smallIds }) => new Promise((resolve) => {
    const smallSet = new Set(smallIds);
    const intervals = [];
    const samples = [];
    let previous = performance.now();
    const startedAt = previous;
    const takeSample = () => {
      const play = window.__game?.scenes?.play;
      const manager = play?.enemyManager;
      const bullets = play?.bulletManager;
      const enemies = manager?.enemies || [];
      const activeEnemies = enemies.filter((enemy) => enemy?.active !== false || enemy?.waitingForEntry);
      const activeProjectiles =
        (bullets?.playerBullets?.filter?.((bullet) => bullet?.active !== false).length || 0) +
        (bullets?.enemyBullets?.filter?.((bullet) => bullet?.active !== false).length || 0);
      samples.push({
        t: Math.round(performance.now() - startedAt),
        activeEnemies: activeEnemies.length,
        smallEnemies: activeEnemies.filter((enemy) => smallSet.has(enemy?.generatedProfile?.id)).length,
        lateMayhemEnemies: activeEnemies.filter((enemy) => enemy?.generatedProfile?.lateMayhem === true).length,
        earlySurgeEnemies: activeEnemies.filter((enemy) => enemy?.generatedProfile?.earlySurge === true).length,
        activeProjectiles,
        pendingWaveSpawns: Number(manager?.waveSpawnPendingCount) || 0
      });
    };
    const tick = (now) => {
      intervals.push(now - previous);
      previous = now;
      takeSample();
      if (now - startedAt >= duration) {
        resolve({ intervals, samples });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { durationMs, smallIds: smallProfileIds });
}

async function runBrowserScenario(browser, scenario, smallProfileIds) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript((seed) => {
    let state = seed >>> 0;
    Math.random = () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }, scenario.seed || 12345);

  const url = withQuery(baseUrl, {
    'nova-devtools-hash': devtoolsHash,
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: scenario.level,
    controlSmoke: '1',
    ...queryForFlags(scenario.flags)
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlay(page);
  await makeProbePlayerSafe(page);
  const forced = await forceWave(page, scenario);
  await makeProbePlayerSafe(page);
  const sampled = await sampleScenario(page, sampleMs, smallProfileIds);
  await makeProbePlayerSafe(page);
  const screenshotPath = path.join(outputDir, `${scenario.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.close();

  return {
    name: scenario.name,
    label: scenario.label,
    level: scenario.level,
    profileId: scenario.type,
    profileFamily: scenario.family,
    visibleSize: scenario.visibleSize,
    flags: scenario.flags,
    forced,
    frameSummary: summarizeFrameIntervals(sampled.intervals),
    sampleSummary: summarizeSamples(sampled.samples),
    pageErrors,
    consoleErrors,
    screenshot: path.relative(process.cwd(), screenshotPath).replaceAll(path.sep, '/')
  };
}

function buildScenarios(inventory) {
  const profiles = chooseScenarioProfiles(inventory);
  const fullRosterFlags = SMALL_GENERATED_ENEMY_ROSTER_ENABLED_BY_DEFAULT ? [] : ['enableSmallEnemyShips'];
  const smallDisabledFlags = SMALL_GENERATED_ENEMY_ROSTER_ENABLED_BY_DEFAULT ? ['disableSmallEnemyShips'] : [];
  const scenario = (name, label, level, row, flags, overrides = {}) => ({
    name,
    label,
    level,
    type: row.profile.type,
    family: row.family,
    visibleSize: `${row.visibleWidth}x${row.visibleHeight}`,
    count: level >= 20 ? 16 : 10,
    formation: level >= 20 ? 'SCREEN_DOOR' : 'GRID',
    entry: 'split',
    cadence: level >= 20 ? 1.24 : 1.08,
    flags,
    ...overrides
  });

  return [
    scenario('sector-5-current-full-roster', 'sector 5 control', 5, profiles.sector5Legacy, fullRosterFlags, { count: 10, formation: 'GRID', seed: 101 }),
    scenario('sector-5-small-disabled-control', 'sector 5 small-disabled control', 5, profiles.sector5Legacy, smallDisabledFlags, { count: 10, formation: 'GRID', seed: 101 }),
    scenario('sector-20-a-current-full-roster-small-sample', 'A current full roster', 20, profiles.small, fullRosterFlags, { seed: 202 }),
    scenario('sector-20-b-small-new-ships-disabled', 'B small new ships disabled', 20, profiles.lateReplacement, smallDisabledFlags, { seed: 202 }),
    scenario('sector-20-c-new-generated-roster-disabled', 'C all new generated roster disabled', 20, profiles.legacyMedian, ['disableNewEnemyRoster'], { seed: 202 }),
    scenario('sector-20-d-original-large-only', 'D original/large ships only', 20, profiles.legacyLarge, ['disableNewEnemyRoster', 'disableSmallEnemyShips'], { seed: 202 })
  ];
}

function collectFailures(report) {
  const failures = [];
  const defaultPoolSmallCount = getGeneratedEnemyProfilesForLevel(20).filter(isSmallGeneratedEnemyProfile).length;
  if (!SMALL_GENERATED_ENEMY_ROSTER_ENABLED_BY_DEFAULT && defaultPoolSmallCount > 0) {
    failures.push(`default sector 20 pool still includes ${defaultPoolSmallCount} small generated enemy profile(s)`);
  }
  for (const result of report.scenarios) {
    if (result.pageErrors.length) {
      failures.push(`${result.name} page errors: ${result.pageErrors.join('; ')}`);
    }
    if (result.consoleErrors.length) {
      failures.push(`${result.name} console errors: ${result.consoleErrors.join('; ')}`);
    }
    if (result.name.includes('small-new-ships-disabled') && result.sampleSummary.smallEnemiesMax > 0) {
      failures.push(`${result.name} spawned ${result.sampleSummary.smallEnemiesMax} small enemy ship(s)`);
    }
    if (result.name.includes('new-generated-roster-disabled') && result.sampleSummary.lateMayhemEnemiesMax > 0) {
      failures.push(`${result.name} spawned ${result.sampleSummary.lateMayhemEnemiesMax} late-mayhem enemy ship(s)`);
    }
    if (!result.name.includes('current-full-roster-small-sample') && result.frameSummary.p95Ms > 36) {
      failures.push(`${result.name} p95 frame ${result.frameSummary.p95Ms}ms exceeds 36ms`);
    }
    if (!result.name.includes('current-full-roster-small-sample') && result.frameSummary.longFrames50 > 2) {
      failures.push(`${result.name} has ${result.frameSummary.longFrames50} frame(s) over 50ms`);
    }
  }
  return failures;
}

mkdirSync(outputDir, { recursive: true });
const inventory = buildInventory();
writeFileSync(path.join(outputDir, 'inventory.md'), markdownInventory(inventory));

const scenarios = buildScenarios(inventory);
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const results = [];
  for (const scenario of scenarios) {
    console.log(`[small-enemy-roster-feel] scenario ${scenario.name}`);
    results.push(await runBrowserScenario(
      browser,
      scenario,
      inventory.smallLateRows.map((row) => row.profile.id)
    ));
  }

  const report = {
    status: 'passed',
    diagnosticOnly,
    generatedAt: new Date().toISOString(),
    outputDir,
    smallEnemyRosterEnabledByDefault: SMALL_GENERATED_ENEMY_ROSTER_ENABLED_BY_DEFAULT,
    baseline: inventory.baseline,
    inventoryCounts: {
      totalProfiles: inventory.rows.length,
      lateMayhemProfiles: inventory.lateRows.length,
      smallLateMayhemProfiles: inventory.smallLateRows.length,
      smallProfileIds: inventory.smallLateRows.map((row) => row.profile.id),
      smallSpriteIndexes: inventory.smallLateRows.map((row) => row.profile.spriteIndex)
    },
    scenarios: results,
    failures: []
  };
  report.failures = collectFailures(report);
  report.status = report.failures.length ? 'failed' : 'passed';
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (!diagnosticOnly) {
    assert.equal(report.failures.length, 0, report.failures.join('\n'));
  }
  console.log(
    `[small-enemy-roster-feel] ${report.status.toUpperCase()} output=${path.relative(process.cwd(), outputDir).replaceAll(path.sep, '/')} ` +
    `small=${report.inventoryCounts.smallLateMayhemProfiles}/${report.inventoryCounts.lateMayhemProfiles}`
  );
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
