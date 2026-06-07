import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4364));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/gameplay-message-overlap-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

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

async function startTestServer() {
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
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite test server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

function overlap(a, b, margin = 8) {
  if (!a || !b) return false;
  return !(
    a.x + a.width + margin <= b.x ||
    b.x + b.width + margin <= a.x ||
    a.y + a.height + margin <= b.y ||
    b.y + b.height + margin <= a.y
  );
}

function validateSample(state, label) {
  const active = state.toast?.active || [];
  const surfaces = [
    ...active,
    state.toast?.comboDisplay,
    ...(state.toast?.scorePopups || [])
  ].filter(item => item?.bounds);
  for (let i = 0; i < surfaces.length; i += 1) {
    for (let j = i + 1; j < surfaces.length; j += 1) {
      if (overlap(surfaces[i].bounds, surfaces[j].bounds)) {
        throw new Error(`${label}: gameplay message overlap ${JSON.stringify({ a: surfaces[i], b: surfaces[j] }, null, 2)}`);
      }
    }
  }
  const center = active.find(item => item.slot === 'center');
  if (center && ['boss', 'level_clear', 'level_up', 'run_clear'].includes(center.type)) {
    const blocked = active.filter(item => item.slot !== 'center' && !['boss', 'level_clear', 'level_up', 'run_clear'].includes(item.type));
    if (blocked.length > 0) {
      throw new Error(`${label}: low-priority toast visible over transition center ${JSON.stringify({ center, blocked }, null, 2)}`);
    }
  }
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;

try {
  server = await startTestServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleEvents = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleEvents.push(message.text().slice(0, 700));
  });

  await page.goto(`${baseUrl}/?autostart=1&debugBossToken=NOVA_DEBUG_2026&nova-devtools-hash=${LOCAL_DEVTOOLS_HASH}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!play) throw new Error('Missing play scene for message overlap check');
    play.introActive = false;
    play.introComplete = true;
    play.debugInvincible = true;
    play.clearToastState?.();
    play.showToast('BOSS INCOMING\nREAD THE DANGER ZONE', {
      slot: 'center',
      type: 'boss',
      priority: 4,
      fontSize: 34,
      duration: 2200,
      transition: true,
      maxWidth: game.getWidth() * 0.72
    });
    play.enqueueToast('SECTOR CLEAR +1,000', {
      slot: 'top',
      type: 'level_clear',
      priority: 3,
      fontSize: 26,
      duration: 1600,
      transition: true
    });
    play.enqueueToast('SCORE x2!', {
      slot: 'center',
      type: 'score_boost',
      priority: 1,
      fontSize: 30,
      duration: 1200
    });
    play.enqueueToast('COMBO BONUS +200', {
      slot: 'top',
      type: 'combo',
      priority: 1,
      fontSize: 20,
      duration: 1200
    });
    play.enqueueToast('BONUS CORE APPEARED!', {
      slot: 'corner',
      type: 'powerup',
      priority: 1,
      fontSize: 18,
      duration: 1400
    });
    play.comboCount = 18;
    play.comboMultiplier = 2;
    play.comboTimerMs = play.comboWindowMs || 2400;
    play.createComboDisplay?.();
    play.layoutComboDisplay?.();
    play.updateComboDisplay?.(1);
  });

  const samples = [];
  for (let index = 0; index < 48; index += 1) {
    await page.waitForTimeout(125);
    const state = await readState(page);
    validateSample(state, `sample_${index}`);
    samples.push({
      index,
      active: state.toast?.active || [],
      comboDisplay: state.toast?.comboDisplay || null,
      scorePopups: state.toast?.scorePopups || [],
      queued: state.toast?.queued || {},
      lockedMs: state.toast?.lockedMs || {}
    });
  }

  const screenshot = path.join(outputDir, 'gameplay-message-overlap-final.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const report = {
    status: 'passed',
    baseUrl,
    samples,
    screenshot,
    pageErrors,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join('; ')}`);
  if (consoleEvents.length > 0) throw new Error(`Console errors: ${consoleEvents.join('; ')}`);
  console.log(`[gameplay-message-overlap] PASS samples=${samples.length} report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[gameplay-message-overlap] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
