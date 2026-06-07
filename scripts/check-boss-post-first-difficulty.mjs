import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { BalanceConfig } from '../src/config/BalanceConfig.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4348));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-post-first-difficulty-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const levelsToCheck = [1, 2, 6];
const bossWaitTimeoutMs = Number(process.env.CHECK_BOSS_TIMEOUT_MS) || (process.env.CHECK_URL ? 60000 : 30000);

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

function expectedForLevel(level) {
  const diff = BalanceConfig.difficulty;
  const startsAt = Math.max(2, Math.round(Number(diff.bossPostFirstDifficultyStartsAt) || 2));
  const scalar = level >= startsAt ? Number(diff.bossPostFirstDifficultyScalar) : 1;
  const rawHealth = Math.round(diff.bossBaseHealth + Math.max(0, level - 1) * diff.bossHealthPerLevel);
  const unscaledHealth = Math.max(rawHealth, diff.bossMinHealth || 70);
  const maxHealth = Math.max(1, Math.round(unscaledHealth * scalar));
  const basePressure = level <= 1 ? 0.78 : level === 2 ? 0.88 : level <= 4 ? 0.92 : level <= 6 ? 0.96 : 1;
  const phase1DelayUnscaled = diff.bossShootDelayBase * (level <= 1 ? 1.55 : level === 2 ? 1.2 : 1);
  const regularIntervalUnscaled = level <= 1 ? 2200 : level === 2 ? 2400 : 2700;
  return {
    scalar,
    unscaledHealth,
    maxHealth,
    pressure: basePressure * scalar,
    phase1Delay: phase1DelayUnscaled / scalar,
    regularInterval: Math.round(regularIntervalUnscaled / scalar)
  };
}

function closeEnough(actual, expected, epsilon = 0.001) {
  return Math.abs(Number(actual) - Number(expected)) <= epsilon;
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  serviceWorkers: 'block'
});
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  mkdirSync(outputDir, { recursive: true });
  const results = [];
  for (const level of levelsToCheck) {
    await page.goto(withQuery(baseUrl, {
      autostart: '1',
      debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
      startAtBoss: '1',
      startLevel: String(level),
      cacheBust: `${Date.now()}-${level}`
    }), { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.waitForFunction(() => {
        const state = JSON.parse(window.render_game_to_text?.() || '{}');
        return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
      }, null, { timeout: bossWaitTimeoutMs });
    } catch (error) {
      const state = await page.evaluate(() => {
        try {
          return window.render_game_to_text?.() || null;
        } catch (stateError) {
          return `state_error:${stateError.message}`;
        }
      }).catch((stateError) => `evaluate_error:${stateError.message}`);
      throw new Error(`Timed out waiting for level ${level} boss after ${bossWaitTimeoutMs}ms. Last state: ${state}`, { cause: error });
    }

    const actual = await page.evaluate(() => {
      const boss = window.__game?.scenes?.play?.enemyManager?.boss;
      if (!boss) throw new Error('Missing boss');
      return {
        level: boss.level,
        maxHealth: boss.maxHealth,
        scalar: boss.getPostFirstBossDifficultyScalar(),
        pressure: boss.getBossPressureScalar(),
        phase1Delay: boss.getPhaseShootDelay(1),
        regularInterval: boss.getRegularAttackIntervalMs()
      };
    });
    const expected = expectedForLevel(level);
    results.push({
      level,
      actual,
      expected,
      ok: actual.maxHealth === expected.maxHealth &&
        closeEnough(actual.scalar, expected.scalar) &&
        closeEnough(actual.pressure, expected.pressure) &&
        closeEnough(actual.phase1Delay, expected.phase1Delay) &&
        actual.regularInterval === expected.regularInterval
    });
  }

  const screenshot = path.join(outputDir, 'boss-post-first-difficulty.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const report = {
    ok: results.every((result) => result.ok) &&
      results[0].actual.scalar === 1 &&
      results.slice(1).every((result) => result.actual.scalar === 0.8 && result.actual.maxHealth < result.expected.unscaledHealth) &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0,
    baseUrl,
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
    console.log(`[boss-post-first-difficulty] PASS level1=${results[0].actual.maxHealth}/${results[0].actual.scalar} level2=${results[1].actual.maxHealth}/${results[1].actual.scalar} level6=${results[2].actual.maxHealth}/${results[2].actual.scalar} report=${path.join(outputDir, 'report.json')}`);
  }
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  if (server) server.kill();
}
