import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4330));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/danger-dodge-${timestamp()}`);

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
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
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

try {
  await page.goto(withQuery(baseUrl, { autostart: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.player?.active;
  }, { timeout: 30000 });

  const result = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!play?.applyNearMiss || !player) {
      return { ok: false, reason: 'missing_play_scene_or_player' };
    }

    const beforeScore = game.score || 0;
    const fakeBullet = { x: player.x + player.radius + 9, y: player.y, radius: 5, active: true };

    play.nearMissCooldownAt = 0;
    play.applyNearMiss(fakeBullet);
    await new Promise((resolve) => setTimeout(resolve, 80));
    play.nearMissCooldownAt = 0;
    play.applyNearMiss(fakeBullet);
    await new Promise((resolve) => setTimeout(resolve, 80));
    play.nearMissCooldownAt = 0;
    play.applyNearMiss(fakeBullet);
    await new Promise((resolve) => setTimeout(resolve, 120));

    const state = JSON.parse(window.render_game_to_text());
    return {
      ok: true,
      beforeScore,
      afterScore: state.score,
      scoreGain: state.score - beforeScore,
      dangerDodgeCount: state.scoring?.dangerDodgeCount || 0,
      bestDangerDodgeStreak: state.scoring?.bestDangerDodgeStreak || 0,
      lastDangerDodgeScore: state.scoring?.lastDangerDodgeScore || 0,
      particles: state.counts?.particles || 0,
      activeToastMessages: (state.toast?.active || []).map((toast) => toast.message)
    };
  });

  await page.waitForTimeout(350);
  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'danger-dodge.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const report = {
    ok: Boolean(
      result.ok &&
      result.scoreGain >= 150 &&
      result.dangerDodgeCount >= 3 &&
      result.bestDangerDodgeStreak >= 3 &&
      result.lastDangerDodgeScore >= 70 &&
      result.particles > 0 &&
      result.activeToastMessages.some((message) => /DANGER DODGE/i.test(message || '')) &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    result,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[danger-dodge] PASS streak=${result.bestDangerDodgeStreak} gain=${result.scoreGain} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
