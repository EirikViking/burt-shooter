import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4354));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/enemy-wave-patterns-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
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
  throw new Error(`No available check port found starting at ${startPort}`);
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
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleWarningsOrErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') consoleWarningsOrErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'WAVE_ACTIVE';
  }, { timeout: 30000 });

  const data = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const enemyManager = play?.enemyManager;
    const player = play?.player;
    if (!game || !play || !enemyManager || !player) {
      throw new Error('Missing wave-pattern test surface');
    }
    player.invulnerable = true;
    player.invulnerableTime = 60000;
    const samples = [];

    for (let level = 1; level <= 16; level += 1) {
      enemyManager.level = level;
      const waves = enemyManager.generateWaves(level);
      for (let waveIndex = 0; waveIndex < waves.length; waveIndex += 1) {
        const config = waves[waveIndex];
        enemyManager.clearEnemies();
        enemyManager.currentWaveIndex = waveIndex;
        enemyManager.normalWavesTotal = waves.length;
        enemyManager.state = 'WAVE_ACTIVE';
        enemyManager.phase = 'WAVES';
        enemyManager.spawnWave(config);

        const enemies = enemyManager.enemies.filter((enemy) => enemy.kind === 'enemy');
        for (const enemy of enemies) {
          enemy.waitingForEntry = false;
          enemy.active = true;
          if (enemy.sprite) enemy.sprite.visible = true;
          enemy.state = 'FORMATION';
          enemy.x = enemy.formationX;
          enemy.y = enemy.formationY;
        }
        const sampleEnemy = enemies[0] || null;
        const shots = sampleEnemy?.shoot(player.x, player.y);
        const shotList = Array.isArray(shots) ? shots : shots ? [shots] : [];
        const before = sampleEnemy
          ? { x: sampleEnemy.x, y: sampleEnemy.y }
          : null;
        if (sampleEnemy) {
          for (let i = 0; i < 90; i += 1) {
            sampleEnemy.update(2, player.x, player.y);
          }
        }
        const after = sampleEnemy
          ? { x: sampleEnemy.x, y: sampleEnemy.y }
          : null;

        samples.push({
          level,
          waveIndex,
          formation: config.formation,
          plannedTactic: typeof config.tactic === 'string' ? config.tactic : config.tactic?.id || null,
          activeTactic: enemyManager.currentWaveTactic?.id || null,
          label: enemyManager.currentWaveTactic?.label || null,
          move: enemyManager.currentWaveTactic?.move || null,
          shot: enemyManager.currentWaveTactic?.shot || null,
          volley: enemyManager.currentWaveTactic?.volley || null,
          enemyCount: enemies.length,
          inheritedCount: enemies.filter((enemy) => enemy.waveTactic?.id === enemyManager.currentWaveTactic?.id).length,
          shotCount: shotList.length,
          shotTactics: [...new Set(shotList.map((bullet) => bullet.waveTactic).filter(Boolean))],
          movementDelta: before && after
            ? Math.round(Math.hypot(after.x - before.x, after.y - before.y))
            : 0
        });
      }
    }

    const state = JSON.parse(window.render_game_to_text());
    return {
      samples,
      textWave: state.wave,
      textEnemies: state.visibleEnemies
    };
  });

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'enemy-wave-patterns.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const uniqueTactics = new Set(data.samples.map((sample) => sample.activeTactic).filter(Boolean));
  const uniqueMoves = new Set(data.samples.map((sample) => sample.move).filter(Boolean));
  const uniqueShots = new Set(data.samples.map((sample) => sample.shot).filter(Boolean));
  const uniqueVolleys = new Set(data.samples.map((sample) => sample.volley).filter(Boolean));
  const uniqueFormations = new Set(data.samples.map((sample) => sample.formation).filter(Boolean));
  const inheritedOk = data.samples.every((sample) => sample.enemyCount > 0 && sample.inheritedCount === sample.enemyCount);
  const shotTaggedOk = data.samples.every((sample) => sample.shotCount > 0 && sample.shotTactics.includes(sample.activeTactic));
  const movementSamples = data.samples.map((sample) => sample.movementDelta);
  const movingEnoughCount = movementSamples.filter((delta) => delta >= 8).length;
  const movementByFamily = new Map();
  for (const sample of data.samples) {
    const family = sample.move || 'unknown';
    const current = movementByFamily.get(family) || { count: 0, max: 0 };
    current.count += 1;
    current.max = Math.max(current.max, sample.movementDelta);
    movementByFamily.set(family, current);
  }
  const movedOk = movementSamples.every(Number.isFinite)
    && movingEnoughCount >= Math.floor(data.samples.length * 0.65)
    && [...movementByFamily.values()].every((entry) => entry.max >= 8);

  const report = {
    ok: data.samples.length >= 20 &&
      uniqueTactics.size >= 6 &&
      uniqueMoves.size >= 6 &&
      uniqueShots.size >= 5 &&
      uniqueVolleys.size >= 3 &&
      uniqueFormations.size >= 6 &&
      inheritedOk &&
      shotTaggedOk &&
      movedOk &&
      pageErrors.length === 0 &&
      consoleWarningsOrErrors.length === 0,
    baseUrl,
    sampleCount: data.samples.length,
    uniqueTactics: [...uniqueTactics],
    uniqueMoves: [...uniqueMoves],
    uniqueShots: [...uniqueShots],
    uniqueVolleys: [...uniqueVolleys],
    uniqueFormations: [...uniqueFormations],
    inheritedOk,
    shotTaggedOk,
    movedOk,
    movingEnoughCount,
    movementThresholdRatio: Number((movingEnoughCount / Math.max(1, data.samples.length)).toFixed(3)),
    movementByFamily: Object.fromEntries(movementByFamily.entries()),
    textWave: data.textWave,
    textEnemies: data.textEnemies,
    samples: data.samples,
    pageErrors,
    consoleWarningsOrErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[enemy-wave-patterns] PASS tactics=${uniqueTactics.size} moves=${uniqueMoves.size} shots=${uniqueShots.size} formations=${uniqueFormations.size} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
