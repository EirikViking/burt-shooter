import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4352));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/hijacker-spawn-cadence-${timestamp()}`);
const levelsToCheck = Array.from({ length: 12 }, (_, index) => index + 1);

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
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const results = [];

try {
  for (const level of levelsToCheck) {
    await page.goto(withQuery(baseUrl, {
      autostart: '1',
      debugBossToken: 'NOVA_DEBUG_2026',
      startLevel: String(level)
    }), { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state?.scene === 'play' && state?.player?.active && state?.wave?.state === 'WAVE_ACTIVE';
    }, null, { timeout: 30000 });

    const result = await page.evaluate(() => {
      const game = window.__game;
      const manager = game?.scenes?.play?.enemyManager;
      if (!game || !manager) return { ok: false, reason: 'missing_enemy_manager' };

      manager.phase = 'WAVES';
      manager.state = 'WAVE_ACTIVE';
      manager.currentWaveIndex = 0;
      manager.normalWavesTotal = Math.max(2, manager.normalWavesTotal || 2);
      manager.hijacker = null;
      manager.hijackerSpawnedThisLevel = false;
      manager.hijackerSpawnAttemptedThisLevel = false;

      manager.onWaveCleared();
      const state = JSON.parse(window.render_game_to_text());
      return {
        ok: true,
        level: game.level,
        guaranteed: manager.shouldGuaranteeHijacker?.(game.level) === true,
        attempted: manager.hijackerSpawnAttemptedThisLevel === true,
        spawned: Boolean(manager.hijacker?.active),
        nextState: manager.state,
        hijacker: state.hijacker || null
      };
    });
    results.push(result);
  }

  mkdirSync(outputDir, { recursive: true });
  const guaranteedLevels = results.filter((result) => result.guaranteed).map((result) => result.level);
  const guaranteedSpawned = results.filter((result) => result.guaranteed && result.spawned).map((result) => result.level);
  const report = {
    ok: guaranteedLevels.join(',') === '2,5,8,11' &&
      guaranteedSpawned.join(',') === guaranteedLevels.join(',') &&
      results.every((result) => result.level === 1 ? !result.attempted && !result.spawned : result.attempted) &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0,
    baseUrl,
    guaranteedLevels,
    guaranteedSpawned,
    results,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[hijacker-spawn-cadence] PASS guaranteed=${guaranteedSpawned.join(',')} report=${path.join(outputDir, 'report.json')}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
