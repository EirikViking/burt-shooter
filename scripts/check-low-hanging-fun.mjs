import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4344));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/low-hanging-fun-${timestamp()}`);

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
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
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
    const readState = () => JSON.parse(window.render_game_to_text?.() || '{}');
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!play?.applyNearMiss || !play?.triggerComboMilestoneFlare || !play?.triggerPowerupPickupJuice || !player) {
      return { ok: false, reason: 'missing_fun_feedback_hooks' };
    }

    const beforeState = readState();
    const beforeParticles = beforeState.counts?.particles || 0;

    play.dangerDodgeCount = 0;
    play.nearMissCooldownAt = 0;
    play.lastNearMissAt = Date.now();
    player.shootCooldown = 280;
    for (let i = 0; i < 5; i += 1) {
      play.nearMissCooldownAt = 0;
      if (i === 4) player.shootCooldown = 280;
      play.applyNearMiss({
        x: player.x + (player.radius || 12) + 9 + i,
        y: player.y,
        radius: 5,
        active: true
      });
      await new Promise((resolve) => setTimeout(resolve, 70));
    }
    await new Promise((resolve) => setTimeout(resolve, 90));
    const afterNearMiss = readState();

    play.triggerComboMilestoneFlare({
      threshold: 25,
      multiplier: 3,
      reason: 'check_combo',
      color: 0x00ffff,
      accent: 0xff66ff
    });
    await new Promise((resolve) => setTimeout(resolve, 120));
    const afterCombo = readState();

    play.triggerPowerupPickupJuice({
      type: 'row_core',
      color: 0xff66ff,
      x: player.x,
      y: player.y - 34
    });
    await new Promise((resolve) => setTimeout(resolve, 140));
    const afterPowerup = readState();

    return {
      ok: true,
      beforeParticles,
      afterNearMissParticles: afterNearMiss.counts?.particles || 0,
      afterComboParticles: afterCombo.counts?.particles || 0,
      afterPowerupParticles: afterPowerup.counts?.particles || 0,
      nearMiss: afterNearMiss.scoring?.lastNearMissSurge || null,
      nearMissSurgesThisRun: afterNearMiss.scoring?.nearMissSurgesThisRun || 0,
      combo: afterCombo.scoring?.lastComboCelebration || null,
      powerup: afterPowerup.scoring?.lastPowerupPickupJuice || null,
      activeToastMessages: (afterNearMiss.toast?.active || []).map((toast) => toast.message),
      scorePopupMessages: (afterNearMiss.toast?.scorePopups || []).map((popup) => popup.message)
    };
  });

  await page.waitForTimeout(300);
  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'low-hanging-fun.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const report = {
    ok: Boolean(
      result.ok &&
      result.nearMissSurgesThisRun >= 1 &&
      result.nearMiss?.triggered &&
      result.nearMiss.streak >= 5 &&
      result.nearMiss.cooldownAfter < result.nearMiss.cooldownBefore &&
      result.combo?.triggered &&
      result.combo.threshold === 25 &&
      result.combo.multiplier === 3 &&
      result.powerup?.triggered &&
      result.powerup.type === 'row_core' &&
      result.afterPowerupParticles > result.beforeParticles &&
      result.activeToastMessages.some((message) => /NEAR MISS/i.test(message || '')) &&
      result.scorePopupMessages.some((message) => /NEAR MISS/i.test(message || '')) &&
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
    console.log(`[low-hanging-fun] PASS nearMissStreak=${result.nearMiss.streak} combo=${result.combo.threshold} powerup=${result.powerup.type} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
