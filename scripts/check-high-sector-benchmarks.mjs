import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { createHighSectorEscalationState } from '../src/config/HighSectorEscalation.js';
import { ShipData } from '../src/config/ShipData.js';

const host = '127.0.0.1';
const port = process.env.CHECK_URL ? null : await findAvailablePort(4911);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/high-sector-benchmarks-${timestamp()}`);
const devtoolsHash = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const config = BalanceConfig.difficulty.highSectorEscalation;
const defaultSectors = [60, 80, 100, 120, 130];
const requestedSectors = new Set(String(process.env.CHECK_HIGH_SECTOR_SECTORS || '')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value)));
const sectors = requestedSectors.size > 0
  ? defaultSectors.filter((sector) => requestedSectors.has(sector))
  : defaultSectors;
const requestedHulls = new Set(String(process.env.CHECK_HIGH_SECTOR_HULLS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean));
const hulls = [
  { class: 'slow', id: 'nova_ship_06' },
  { class: 'standard', id: 'nova_ship_01' },
  { class: 'fast', id: 'nova_ship_04' }
]
  .filter((entry) => requestedHulls.size === 0 || requestedHulls.has(entry.class))
  .map((entry) => ({ ...entry, ship: ShipData.find((ship) => ship.id === entry.id) }));

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 30; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No available benchmark port starting at ${startPort}`);
}

async function canFetch(url) {
  try { return (await fetch(url, { cache: 'no-store' })).ok; } catch { return false; }
}

async function startServer() {
  if (await canFetch(baseUrl)) return null;
  const server = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error('Benchmark Vite server did not become ready');
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] || 0;
}

function summarizeFrames(intervals) {
  const values = intervals.filter((value) => Number.isFinite(value) && value > 0);
  const averageMs = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  return {
    frames: values.length,
    averageMs: Number(averageMs.toFixed(2)),
    averageFps: Number((1000 / Math.max(0.01, averageMs)).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    p99Ms: Number(percentile(values, 0.99).toFixed(2)),
    framesAbove33Ms: values.filter((value) => value > 33.34).length
  };
}

function projectedDifficulty(hull, sector) {
  const state = createHighSectorEscalationState({
    config, armed: true, sector, seed: 'high-sector-benchmark-seed-20260809', runMode: 'ranked'
  });
  const ship = hull.ship;
  const rawDps = ship.stats.damage * ship.weapon.bullets * (1000 / ship.stats.fireRate);
  const speedFactor = ship.stats.speed / 5.75;
  const hitEfficiency = Math.max(0.48, Math.min(0.72, 0.59 + (speedFactor - 1) * 0.16));
  const waveCount = sector > 80 ? state.authoredEncounterLimit : 8;
  const averageEnemies = Math.min(22, 14 + state.pressureStep * 0.45 + (state.protocol ? 1.25 : 0));
  const enemyHpBudget = waveCount * averageEnemies * 3.4;
  const waveCombatSeconds = enemyHpBudget / Math.max(1, rawDps * hitEfficiency);
  const downtimeSeconds = waveCount * ((state.downtime.briefingMs + state.downtime.cleanupMs) / 1000);
  const bossDurationSeconds = state.caps.maxBossHealth / Math.max(1, rawDps * hitEfficiency * 0.72);
  const sectorDurationSeconds = waveCombatSeconds + downtimeSeconds + bossDurationSeconds;
  const exposure = state.pressureBudget * (1 / speedFactor) * (waveCount / 5);
  const projectedLivesLost = Math.max(0, Math.min(2.6, (exposure - 1.05) * 0.78));
  const damageEvents = Math.round(projectedLivesLost * 4);
  const bullets = Math.round(damageEvents * 0.52);
  const collisions = Math.round(damageEvents * 0.2);
  const protocol = Math.round(damageEvents * (state.protocol ? 0.18 : 0.08));
  const boss = Math.max(0, damageEvents - bullets - collisions - protocol);
  return {
    pressureBudget: state.pressureBudget,
    protocol: state.protocol?.id || null,
    waveCount,
    rawDps: Number(rawDps.toFixed(2)),
    hitEfficiency: Number(hitEfficiency.toFixed(3)),
    sectorDurationSeconds: Number(sectorDurationSeconds.toFixed(2)),
    projectedRunElapsedMinutes: Number(((sector - 1) * sectorDurationSeconds / 60).toFixed(2)),
    lives: {
      gained: 0,
      lost: Number(projectedLivesLost.toFixed(2)),
      remainingFromThree: Number(Math.max(0, 3 - projectedLivesLost).toFixed(2))
    },
    damageSources: { hostileProjectile: bullets, collision: collisions, protocolPressure: protocol, boss: boss },
    avoidabilityWindowMs: {
      entryFloor: state.caps.minEntryDurationMs,
      protocolWarning: state.protocol?.id === 'shifting_front' ? 1900 : null,
      bossSupportWarning: sector === 80 ? config.ascendantWarningLeadMs : null
    },
    expectedPeaks: {
      enemies: Math.ceil(averageEnemies + (state.protocol?.id === 'hunter_pair' ? 2 : 0)),
      hostileProjectiles: state.caps.maxHostileProjectiles,
      hazardAreaRatio: state.caps.maxHazardAreaRatio,
      effects: state.protocol ? 12 : 9
    },
    comboUptimeRatio: Number(Math.max(0.35, Math.min(0.86, hitEfficiency / state.pressureBudget + 0.08)).toFixed(3)),
    tacticalDraftExhaustion: {
      pure: 'not_applicable',
      tacticalProjectedPicks: Math.max(0, Math.floor((sector - 1) / 5)),
      risk: sector >= 120 ? 'high' : sector >= 100 ? 'medium' : 'low'
    },
    bossDurationSeconds: Number(bossDurationSeconds.toFixed(2)),
    fatigueNotes: sector >= 120
      ? 'Downtime is at its readability floor; monitor audio and repeated cue fatigue.'
      : 'No terminal fatigue flag in this bounded slice.',
    distractionNotes: state.protocol
      ? 'One headline protocol cue; no persistent HUD suppression.'
      : 'No protocol headline in this sector.'
  };
}

async function runRenderedProbe(browser, hull, sector) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      bestScore: 1000000, bestSector: 130, bestLevel: 130, pilotRank: 50, pilotXp: 999999,
      totalRuns: 100, totalBossesDefeated: 130, totalWavesCleared: 1000,
      unlockedShipIds: Array.from({ length: 30 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`)
    }));
  });
  const url = new URL(baseUrl);
  url.searchParams.set('nova-devtools-hash', devtoolsHash);
  url.searchParams.set('debugBossToken', 'NOVA_DEBUG_2026');
  url.searchParams.set('controlSmoke', '1');
  url.searchParams.set('startLevel', String(sector));
  url.searchParams.set('highSectorEscalation', '1');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame && window.render_game_to_text), null, { timeout: 30000 });
  assert.equal(await page.evaluate((spriteKey) => window.__game.startGame(spriteKey, { countShipUsage: false }), hull.ship.spriteKey), true);
  await page.waitForFunction((target) => {
    const manager = window.__game?.scenes?.play?.enemyManager;
    return manager?.level === target && (manager?.enemies?.length || 0) > 0;
  }, sector, { timeout: 30000 });
  await page.evaluate(({ target, seed }) => {
    const game = window.__game;
    const play = game.scenes.play;
    game.contentDirector.seed = seed;
    game.level = target;
    game.lives = 3;
    play.player.invulnerable = true;
    play.player.invulnerableTime = 600000;
    play.enemyManager.startLevel(target);
    play.clearEnemyBullets?.('high_sector_benchmark_setup');
  }, { target: sector, seed: `benchmark-${hull.class}-20260809` });
  await page.waitForFunction(() => (window.__game?.scenes?.play?.enemyManager?.enemies?.length || 0) > 0, null, { timeout: 15000 });
  await page.waitForTimeout(900);
  await page.keyboard.down('Space');
  const sample = await page.evaluate(() => new Promise((resolve) => {
    const intervals = [];
    const peaks = { enemies: 0, hostileProjectiles: 0, hazards: 0, particles: 0, effects: 0 };
    let comboActiveFrames = 0;
    let previous = performance.now();
    const startedAt = previous;
    const tick = (now) => {
      intervals.push(now - previous);
      previous = now;
      const play = window.__game.scenes.play;
      const manager = play.enemyManager;
      peaks.enemies = Math.max(peaks.enemies, manager.enemies.filter((enemy) => enemy?.active !== false || enemy?.waitingForEntry).length);
      peaks.hostileProjectiles = Math.max(peaks.hostileProjectiles, play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false).length);
      peaks.hazards = Math.max(peaks.hazards, play.bossHazards?.length || 0);
      peaks.particles = Math.max(peaks.particles, play.particleManager?.particles?.length || 0);
      peaks.effects = Math.max(peaks.effects,
        (play.activePickupEffects?.size || 0) + (play.spectacleDirector?.getDebugState?.().activePulses || 0));
      if ((play.comboCount || 0) > 0 || (play.comboMultiplier || 1) > 1) comboActiveFrames += 1;
      if (now - startedAt >= 1800) {
        resolve({
          intervals,
          peaks,
          comboActiveFrames,
          elapsedMs: now - startedAt,
          lives: window.__game.lives,
          damageSources: play.balanceDebugStats?.damageTakenBySource || {},
          protocol: manager.highSectorEscalationState?.protocol?.id || null,
          projectileCap: play.bulletManager.maxEnemyBullets,
          renderState: JSON.parse(window.render_game_to_text()).highSectorEscalation
        });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  await page.keyboard.up('Space');
  await page.close();
  return {
    frameTime: summarizeFrames(sample.intervals),
    elapsedMs: Number(sample.elapsedMs.toFixed(2)),
    peaks: sample.peaks,
    sampledComboUptimeRatio: Number((sample.comboActiveFrames / Math.max(1, sample.intervals.length)).toFixed(3)),
    sampledLivesRemaining: sample.lives,
    sampledDamageSources: sample.damageSources,
    protocol: sample.protocol,
    projectileCap: sample.projectileCap,
    renderState: sample.renderState,
    errors
  };
}

mkdirSync(outputDir, { recursive: true });
assert.ok(sectors.length > 0, 'Benchmark sector filter did not match a supported sector');
assert.ok(hulls.length > 0, 'Benchmark hull filter did not match a supported hull');
for (const hull of hulls) assert.ok(hull.ship, `Missing ${hull.class} benchmark hull`);
const server = await startServer();
const chrome = findChrome();
assert.ok(chrome, 'Installed Chrome or Edge required');
const browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--autoplay-policy=no-user-gesture-required'] });

try {
  const matrix = [];
  for (const sector of sectors) {
    for (const hull of hulls) {
      console.log(`[high-sector-benchmarks] sector=${sector} hull=${hull.class}`);
      const model = projectedDifficulty(hull, sector);
      const rendered = await runRenderedProbe(browser, hull, sector);
      assert.equal(rendered.renderState.active, true);
      assert.equal(rendered.projectileCap, 48);
      assert.ok(rendered.peaks.hostileProjectiles <= rendered.projectileCap);
      assert.deepEqual(rendered.errors, []);
      matrix.push({
        sector,
        hullClass: hull.class,
        hullId: hull.ship.id,
        hullName: hull.ship.name,
        hullSpeed: hull.ship.stats.speed,
        model,
        rendered
      });
    }
  }
  const sector130 = matrix.filter((entry) => entry.sector === 130);
  for (const entry of sector130) {
    assert.ok(entry.rendered.frameTime.averageFps >= 55, `${entry.hullClass} Sector 130 average FPS below 55`);
    assert.ok(entry.rendered.frameTime.p95Ms <= 24, `${entry.hullClass} Sector 130 p95 above 24ms`);
    assert.ok(entry.rendered.frameTime.framesAbove33Ms <= 1, `${entry.hullClass} Sector 130 has repeated >33ms frames`);
  }
  const report = {
    status: 'passed',
    generatedAt: new Date().toISOString(),
    chrome,
    sectors,
    hulls: hulls.map((hull) => ({ class: hull.class, id: hull.ship.id, name: hull.ship.name, speed: hull.ship.stats.speed })),
    matrix,
    limitations: [
      'Rendered frame-time and active-entity peaks are measured in installed Chrome during a deterministic combat sample.',
      'Full-sector duration, life loss, damage-source distribution, combo uptime, Draft exhaustion, and boss duration are deterministic source-based projections; they are labeled model values and are not claimed as human playthrough timings.',
      'The diagnostic profile keeps the player invulnerable during rendered probes so frame metrics are reproducible and do not write progression, achievements, saves, or leaderboard results.'
    ]
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.table(matrix.map((entry) => ({
    sector: entry.sector,
    hull: entry.hullClass,
    durationSec: entry.model.sectorDurationSeconds,
    livesLost: entry.model.lives.lost,
    bossSec: entry.model.bossDurationSeconds,
    avgFps: entry.rendered.frameTime.averageFps,
    p95Ms: entry.rendered.frameTime.p95Ms,
    p99Ms: entry.rendered.frameTime.p99Ms,
    over33: entry.rendered.frameTime.framesAbove33Ms
  })));
  console.log(`[high-sector-benchmarks] PASS ${path.relative(process.cwd(), outputDir).replaceAll(path.sep, '/')}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
