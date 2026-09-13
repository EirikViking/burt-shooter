import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = Number(process.env.KEYBOARD_BINDINGS_PORT || await findAvailablePort(4477));
const baseUrl = `http://${host}:${port}`;

async function findAvailablePort(start) {
  for (let candidate = start; candidate < start + 30; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No free keyboard-binding runtime port from ${start}`);
}

async function waitForServer(url) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview server did not start at ${url}`);
}

const server = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', 'preview', '--host', host, '--port', String(port), '--strictPort'
], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--autoplay-policy=no-user-gesture-required']
});
const pageErrors = [];
const consoleErrors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await waitForServer(`${baseUrl}/?skipIntro=1`);
  await page.goto(`${baseUrl}/?skipIntro=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', { timeout: 30000 });
  await page.evaluate(() => window.__game.currentScene.openSettingsOverlay());
  await page.waitForFunction(() => window.__game.currentScene.settingsOverlay?.container?.parent, { timeout: 10000 });
  const controls = await page.evaluate(() => window.__game.currentScene.settingsOverlay.controls.map((control) => control.id));
  assert.ok(controls.includes('keyboard_bindings'), 'settings does not expose keyboard controls');

  await page.evaluate(() => window.__game.currentScene.settingsOverlay.openKeyBindingsPanel());
  await page.waitForFunction(() => window.__game.currentScene.settingsOverlay.getDebugState().keyboardBindings.panel === true, { timeout: 10000 });
  const panel = await page.evaluate(() => window.__game.currentScene.settingsOverlay.getDebugState().keyboardBindings);
  assert.deepEqual(panel.bindings.dodge, ['Shift']);
  await page.evaluate(() => window.__game.currentScene.settingsOverlay.startKeyBindingCapture('dodge'));
  await page.keyboard.down('Shift');
  await page.keyboard.up('Shift');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('nova.keyboardBindings.v1') || '{}').dodge?.[0] === 'Shift', { timeout: 5000 });

  await page.evaluate(() => {
    localStorage.setItem('nova.keyboardBindings.v1', JSON.stringify({ dodge: ['KeyQ'] }));
    window.dispatchEvent(new CustomEvent('novaSwarm:keyboardBindingsChanged', { detail: { dodge: ['KeyQ'] } }));
    window.__game.currentScene.settingsOverlay.closeKeyBindingsPanel();
    window.__game.currentScene.closeSettingsOverlay();
    window.__game.startGame();
  });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play', { timeout: 30000 });
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.introActive = false;
    play.introComplete = true;
    play.pauseOverlay = null;
    play.settingsOverlay = null;
    play.isPaused = false;
    play.player.dodgeCooldown = 0;
  });
  await page.keyboard.down('q');
  await page.evaluate(() => window.advanceTime(50));
  const dodgeState = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      actionPressed: play.inputManager.isActionPressed('dodge'),
      dodging: Boolean(play.player.isDodging),
      cooldown: Number(play.player.dodgeCooldown) || 0
    };
  });
  await page.keyboard.up('q');
  assert.equal(dodgeState.actionPressed, true, `custom dodge key did not reach InputManager: ${JSON.stringify(dodgeState)}`);
  assert.equal(dodgeState.dodging, true, `custom dodge key did not trigger phase: ${JSON.stringify(dodgeState)}`);
  assert.ok(dodgeState.cooldown > 0, `custom dodge key did not start cooldown: ${JSON.stringify(dodgeState)}`);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  console.log(`[keyboard-bindings-runtime] PASS panel=visible shift=bindable customDodge=active`);
} finally {
  await page.close();
  await browser.close();
  server.kill();
}
