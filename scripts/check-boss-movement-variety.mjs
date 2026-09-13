import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4348));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-movement-variety-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const levelsToCheck = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

function summarizePath(samples) {
  const xs = samples.map((sample) => sample.x);
  const ys = samples.map((sample) => sample.y);
  let xTurns = 0;
  let yTurns = 0;
  let lastDx = 0;
  let lastDy = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    if (Math.abs(dx) > 1.5 && lastDx && Math.sign(dx) !== Math.sign(lastDx)) xTurns += 1;
    if (Math.abs(dy) > 1.5 && lastDy && Math.sign(dy) !== Math.sign(lastDy)) yTurns += 1;
    if (Math.abs(dx) > 1.5) lastDx = dx;
    if (Math.abs(dy) > 1.5) lastDy = dy;
  }
  const xSpan = Math.max(...xs) - Math.min(...xs);
  const ySpan = Math.max(...ys) - Math.min(...ys);
  const buckets = new Set(samples.map((sample) => `${Math.round(sample.x / 32)}:${Math.round(sample.y / 18)}`));
  return {
    xSpan: Math.round(xSpan),
    ySpan: Math.round(ySpan),
    xTurns,
    yTurns,
    buckets: buckets.size,
    signature: [
      Math.round(xSpan / 35),
      Math.round(ySpan / 18),
      Math.min(9, xTurns),
      Math.min(9, yTurns),
      Math.min(12, buckets.size)
    ].join('-')
  };
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
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
      startAtBoss: '1',
      startLevel: String(level)
    }), { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
    }, null, { timeout: 30000 });

    const data = await page.evaluate(() => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const boss = play?.enemyManager?.boss;
      const player = play?.player;
      if (!boss || !player) return { ok: false, reason: 'missing_boss_or_player' };

      boss.entryStartMs = Date.now() - boss.entryDurationMs - 1;
      boss.phase = 3;
      boss.applyPhasePlan?.(3);
      player.invulnerable = true;
      player.invulnerableTime = 20000;

      const samples = [];
      for (let i = 0; i < 180; i += 1) {
        player.x = game.getWidth() * (0.24 + 0.52 * ((Math.sin(i * 0.045) + 1) / 2));
        player.y = game.getHeight() * 0.82;
        boss.update(3, player.x, player.y);
        if (i % 3 === 0) samples.push({ x: Math.round(boss.x), y: Math.round(boss.y) });
      }

      const state = JSON.parse(window.render_game_to_text());
      const bossState = state.visibleEnemies?.find((enemy) => enemy.kind === 'boss') || null;
      return {
        ok: true,
        archetype: bossState?.bossArchetype || boss.profile?.archetype || null,
        family: bossState?.bossMovementFamily || boss.profile?.movement || null,
        movement: bossState?.bossMovement || boss.moveProfile?.profile || null,
        samples
      };
    });

    const summary = summarizePath(data.samples || []);
    results.push({
      level,
      archetype: data.archetype,
      family: data.family,
      movement: data.movement,
      ...summary,
      ok: data.ok && data.movement && data.samples?.length >= 40 && summary.xSpan >= 45 && summary.buckets >= 3
    });
  }

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'boss-movement-level10.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const uniqueMovements = new Set(results.map((result) => result.movement).filter(Boolean));
  const uniqueSignatures = new Set(results.map((result) => result.signature).filter(Boolean));
  const highVertical = results.filter((result) => result.ySpan >= 42).length;
  const highHorizontal = results.filter((result) => result.xSpan >= 180).length;
  const turny = results.filter((result) => result.xTurns >= 2 || result.yTurns >= 2).length;
  const report = {
    ok: results.every((result) => result.ok) &&
      uniqueMovements.size >= 10 &&
      uniqueSignatures.size >= 7 &&
      highVertical >= 4 &&
      highHorizontal >= 4 &&
      turny >= 5 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0,
    baseUrl,
    uniqueMovements: [...uniqueMovements],
    uniqueSignatures: [...uniqueSignatures],
    highVertical,
    highHorizontal,
    turny,
    results,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[boss-movement-variety] PASS movements=${uniqueMovements.size} signatures=${uniqueSignatures.size} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
