import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4467));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/mission-progress-hud-${timestamp()}`);

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
  throw new Error(`No available mission progress HUD port found starting at ${startPort}`);
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

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.hud && window.__game?.scenes?.play?.enemyManager, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const hud = play?.hud;
    const manager = play?.enemyManager;
    if (!game || !play || !hud || !manager) return { ok: false, reason: 'missing play HUD/enemy manager' };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    game.level = 4;
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    manager.normalWavesTotal = 6;
    manager.currentWaveIndex = 2;
    manager.enemies = Array.from({ length: 7 }, () => ({
      active: true,
      kind: 'basic',
      update() {},
      destroy() {}
    }));
    if (play.bulletManager) {
      play.bulletManager.enemyBullets = [];
    }
    hud.update();
    const activeWave = { ...(hud.missionProgressBg?._debugMissionProgress || {}) };
    const activeText = hud.missionText?.text || '';

    manager.normalWavesTotal = 0;
    manager.currentWaveIndex = 0;
    manager.enemies = Array.from({ length: 3 }, () => ({
      active: true,
      kind: 'basic',
      update() {},
      destroy() {}
    }));
    hud.updateMissionStatus();
    const levelText = hud.missionText?.text || '';

    manager.phase = 'BOSS';
    manager.state = 'BOSS_ACTIVE';
    manager.normalWavesTotal = 6;
    manager.currentWaveIndex = 6;
    manager.boss = { health: 420 };
    hud.updateMissionStatus();
    const boss = { ...(hud.missionProgressBg?._debugMissionProgress || {}) };
    const bossText = hud.missionText?.text || '';

    manager.phase = 'COMPLETE';
    manager.state = 'LEVEL_COMPLETE';
    manager.boss = null;
    hud.updateMissionStatus();
    const clear = { ...(hud.missionProgressBg?._debugMissionProgress || {}) };

    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    manager.currentWaveIndex = 2;
    manager.normalWavesTotal = 6;
    manager.enemies = Array.from({ length: 7 }, () => ({
      active: true,
      kind: 'basic',
      update() {},
      destroy() {}
    }));
    hud.updateMissionStatus();

    return {
      ok: true,
      activeWave,
      activeText,
      levelText,
      boss,
      bossText,
      clear,
      missionPanelBounds: hud.missionPanel?.getBounds?.(),
      railBounds: hud.missionProgressBg?.getBounds?.()
    };
  });

  await page.waitForTimeout(250);
  const screenshot = path.join(outputDir, 'mission-progress-hud.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const failures = [];
  if (!state.ok) failures.push(state.reason || 'state setup failed');
  if (!state.activeWave?.visible) failures.push('active wave progress rail was not visible');
  if (state.activeWave?.waveTotal !== 6) failures.push(`expected 6 wave segments, got ${state.activeWave?.waveTotal}`);
  if (state.activeWave?.waveIndex !== 3) failures.push(`expected current wave 3, got ${state.activeWave?.waveIndex}`);
  if (state.activeWave?.activeStart !== 0.333) failures.push(`unexpected active start ${state.activeWave?.activeStart}`);
  if (state.activeWave?.activeEnd !== 0.5) failures.push(`unexpected active end ${state.activeWave?.activeEnd}`);
  if ((state.activeWave?.tickCount || 0) < 5) failures.push(`expected visible wave ticks, got ${state.activeWave?.tickCount}`);
  if ((state.activeWave?.pressure || 0) <= 0.5) failures.push(`expected pressure cue above 0.5, got ${state.activeWave?.pressure}`);
  if (!/^WAVE: 3\/6 \| HOSTILES: 7 \| THREATS: 0$/.test(state.activeText || '')) failures.push(`mission text did not stay readable in wave state: ${state.activeText}`);
  if (!/^LEVEL: 4 \| HOSTILES: 3 \| THREATS: 0$/.test(state.levelText || '')) failures.push(`level fallback mission text was not separated: ${state.levelText}`);
  if (state.boss?.completedRatio !== 1 || state.boss?.phase !== 'BOSS') failures.push(`boss state did not fill the rail: ${JSON.stringify(state.boss)}`);
  if (!/^BOSS HP 420/.test(state.bossText || '')) failures.push(`boss text did not render expected HP: ${state.bossText}`);
  if (state.clear?.completedRatio !== 1 || state.clear?.state !== 'LEVEL_COMPLETE') failures.push(`clear state did not fill the rail: ${JSON.stringify(state.clear)}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    state,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[mission-progress-hud] ${failures.join('; ')}`);
  console.log(`[mission-progress-hud] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
