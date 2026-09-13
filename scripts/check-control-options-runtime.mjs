import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(Number(process.env.CHECK_PORT) || 4892);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/control-options-runtime-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(start) {
  for (let candidate = start; candidate < start + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No control-options test port available from ${start}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find(existsSync);
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 15000) {
    try {
      if ((await fetch(baseUrl)).ok) return;
    } catch {
      // Retry until Vite is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Vite did not start at ${baseUrl}`);
}

mkdirSync(outputDir, { recursive: true });
const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
await waitForServer();

const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.app?.canvas, null, { timeout: 30000 });
  await page.evaluate(async () => {
    const { saveControlSettings } = await import('/src/config/ControlSettings.js');
    const play = window.__game.scenes.play;
    play.isReady = true;
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    play.settingsOverlay = null;
    play.howToPlayOverlay = null;
    play.tacticalLoadoutOverlay = null;
    window.__game.currentScene = play;
    window.__game.lives = Math.max(3, Number(window.__game.lives) || 0);
    play.player.active = true;
    saveControlSettings({ fireInput: 'toggle', mouseSteering: true });
  });

  const canvasBox = await page.locator('canvas').first().boundingBox();
  assert(canvasBox, 'game canvas bounds unavailable');
  const clickX = canvasBox.x + canvasBox.width * 0.72;
  const clickY = canvasBox.y + canvasBox.height * 0.62;
  await page.mouse.click(clickX, clickY);
  await page.waitForTimeout(100);
  const latched = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      firing: play.inputManager.isFiring(),
      latched: play.inputManager.fireToggleLatched,
      cueVisible: play.controlModeHudCue?.visible,
      target: play.inputManager.mouseSteeringTarget
    };
  });
  assert.equal(latched.firing, true, 'left canvas press did not enable Toggle fire');
  assert.equal(latched.latched, true, 'Toggle latch was not retained after pointer release');
  assert.equal(latched.cueVisible, true, 'AUTO FIRE ON cue was not visible');
  const screenshot = path.join(outputDir, 'auto-fire-on.png');
  await page.screenshot({ path: screenshot });

  await page.evaluate(() => window.__game.scenes.play.setPaused(true));
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.96, canvasBox.y + canvasBox.height * 0.96);
  assert.equal(await page.evaluate(() => window.__game.scenes.play.inputManager.fireToggleLatched), true,
    'pause-overlay canvas click changed Toggle fire');
  await page.evaluate(() => window.__game.scenes.play.setPaused(false));

  await page.mouse.click(clickX, clickY);
  assert.equal(await page.evaluate(() => window.__game.scenes.play.inputManager.fireToggleLatched), false,
    'second canvas press did not disable Toggle fire');

  const steeringStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    player.x = window.__game.getWidth() * 0.3;
    player.y = window.__game.getHeight() * 0.6;
    player.sprite.x = player.x;
    player.sprite.y = player.y;
    play.inputManager.clearMouseSteeringTarget('runtime_probe_start');
    return { x: player.x, y: player.y };
  });
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.82, canvasBox.y + canvasBox.height * 0.48);
  await page.waitForTimeout(180);
  const steering = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      player: { x: play.player.x, y: play.player.y },
      target: play.inputManager.mouseSteeringTarget
    };
  });
  assert(steering.target, 'canvas pointer move did not establish a mouse target');
  const moved = Math.hypot(steering.player.x - steeringStart.x, steering.player.y - steeringStart.y);
  const targetDistance = Math.hypot(steering.target.x - steeringStart.x, steering.target.y - steeringStart.y);
  assert(moved > 0.5, `player did not move toward mouse target: ${JSON.stringify({ steeringStart, steering })}`);
  assert(moved < targetDistance * 0.75, `mouse steering teleported instead of using normal movement speed: ${JSON.stringify({ moved, targetDistance })}`);

  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(50);
  await page.keyboard.up('ArrowLeft');
  assert.equal(await page.evaluate(() => window.__game.scenes.play.inputManager.mouseSteeringTarget), null,
    'keyboard movement did not cancel the stale mouse target');

  await page.mouse.move(canvasBox.x + canvasBox.width * 0.78, canvasBox.y + canvasBox.height * 0.45);
  await page.mouse.click(clickX, clickY);
  const blocked = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.setPaused(true);
    return {
      latched: play.inputManager.fireToggleLatched,
      target: play.inputManager.mouseSteeringTarget,
      firing: play.inputManager.isFiring()
    };
  });
  assert.equal(blocked.latched, true, 'pause should preserve intentional Toggle fire state');
  assert.equal(blocked.target, null, 'pause should invalidate mouse steering target');
  assert.equal(blocked.firing, true, 'pause transition should preserve the Toggle latch');

  const focusLoss = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.pauseForExternalInterruption('control_options_runtime');
    return play.inputManager.getTransientDebugState();
  });
  assert.equal(focusLoss.fireToggleLatched, false, 'focus loss did not clear Toggle fire');
  assert.equal(focusLoss.mouseSteeringTarget, null, 'focus loss did not clear mouse steering');
  assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join('; ')}`);

  const report = { ok: true, baseUrl, screenshot, latched, steeringStart, steering, moved, targetDistance, blocked, focusLoss, pageErrors };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[control-options-runtime] PASS screenshot=${screenshot}`);
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
