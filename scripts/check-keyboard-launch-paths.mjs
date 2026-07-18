import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4407));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/keyboard-launch-paths-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  if (fs.existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
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
  ].filter(Boolean).find((candidate) => fs.existsSync(candidate));
}

async function waitForScene(page, sceneName) {
  await page.waitForFunction((expectedScene) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === expectedScene && window.__game?.currentSceneName === expectedScene;
  }, sceneName, { timeout: 30000 });
}

async function prepareGameplay(page) {
  await waitForScene(page, 'play');
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play?.inputManager) throw new Error('Missing play input manager');
    play.introActive = false;
    play.introComplete = true;
    play.pauseOverlay = null;
    play.settingsOverlay = null;
    play.isPaused = false;
    play.inputManager.resetAllKeys();
    if (play.player) {
      play.player.x = Math.max(120, Math.min((window.__game?.getWidth?.() || 1280) - 120, play.player.x || 640));
      play.player.shootCooldown = 0;
    }
    if (play.bulletManager) {
      play.bulletManager.playerBullets = [];
    }
  });
}

async function assertKeyboardGameplayControls(page, label) {
  await prepareGameplay(page);
  const before = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    return {
      scene: window.__game?.currentSceneName,
      playerX: Number(play?.player?.x) || 0,
      playerBullets: Number(play?.bulletManager?.playerBullets?.length) || 0
    };
  });
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('Space');
  await page.evaluate(() => window.advanceTime?.(360));
  await page.waitForTimeout(240);
  const after = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    return {
      scene: window.__game?.currentSceneName,
      lives: Number(window.__game?.lives) || 0,
      playerActive: Boolean(play?.player?.active),
      playerSpeed: Number(play?.player?.speed) || 0,
      introActive: Boolean(play?.introActive),
      introComplete: Boolean(play?.introComplete),
      isPaused: Boolean(play?.isPaused),
      pressed: Boolean(play?.inputManager?.isKeyPressed?.('ArrowRight')),
      firing: Boolean(play?.inputManager?.isFiring?.()),
      rawArrowRight: Boolean(play?.inputManager?.keys?.ArrowRight),
      rawSpace: Boolean(play?.inputManager?.keys?.Space),
      playerX: Number(play?.player?.x) || 0,
      playerBullets: Number(play?.bulletManager?.playerBullets?.length) || 0,
      shootCooldown: Number(play?.player?.shootCooldown) || 0,
      activeTag: document.activeElement?.tagName || null,
      activeType: document.activeElement?.getAttribute?.('type') || null,
      inputDestroyed: Boolean(play?.inputManager?.destroyed)
    };
  });
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowRight');
  assert(after.scene === 'play', `${label}: expected play scene, got ${after.scene}`);
  assert(after.inputDestroyed === false, `${label}: play input manager is destroyed`);
  assert(after.pressed === true || after.rawArrowRight === true, `${label}: ArrowRight did not reach gameplay input (${JSON.stringify(after)})`);
  assert(after.firing === true || after.rawSpace === true || after.playerBullets > before.playerBullets || after.shootCooldown > 0, `${label}: Space did not reach gameplay firing (${JSON.stringify({ before, after })})`);
  assert(after.playerX > before.playerX + 2, `${label}: keyboard movement did not move the ship (${JSON.stringify({ before, after })})`);
  assert(after.playerBullets > before.playerBullets || after.shootCooldown > 0, `${label}: keyboard firing did not create a shot (${JSON.stringify({ before, after })})`);
  assert(after.activeTag !== 'INPUT', `${label}: hidden input kept focus during gameplay (${JSON.stringify(after)})`);
  return { before, after };
}

async function openFreshPage(browser, pageErrors, consoleWarningsOrErrors) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    const text = message.text();
    if (/Service worker script missing or invalid/i.test(text)) return;
    consoleWarningsOrErrors.push(text);
  });
  await page.addInitScript(() => {
    localStorage.setItem('novaSwarm.language', 'en');
    localStorage.setItem('novaSwarm.skipBootIntro', '1');
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'menu');
  return page;
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const pageErrors = [];
const consoleWarningsOrErrors = [];
const reports = [];

try {
  fs.mkdirSync(outputDir, { recursive: true });

  const hangarPage = await openFreshPage(browser, pageErrors, consoleWarningsOrErrors);
  await hangarPage.evaluate(async () => {
    await window.__game.showShipSelect();
  });
  await waitForScene(hangarPage, 'shipSelect');
  await hangarPage.keyboard.down('Enter');
  await waitForScene(hangarPage, 'play');
  await hangarPage.keyboard.up('Enter');
  const hangarState = await assertKeyboardGameplayControls(hangarPage, 'Hangar launch');
  const hangarScreenshot = path.join(outputDir, 'hangar-launch-keyboard.png');
  await hangarPage.screenshot({ path: hangarScreenshot, fullPage: true });
  reports.push({ label: 'Hangar launch', state: hangarState, screenshot: hangarScreenshot });
  await hangarPage.close();

  const runbackPage = await openFreshPage(browser, pageErrors, consoleWarningsOrErrors);
  await runbackPage.evaluate(async () => {
    await window.__game.startGame();
  });
  await prepareGameplay(runbackPage);
  await runbackPage.evaluate(() => {
    const game = window.__game;
    game.score = 1200;
    game.level = 2;
    game.gameOver({ fromInterlude: true });
  });
  await waitForScene(runbackPage, 'gameOver');
  await runbackPage.evaluate(() => {
    const scene = window.__game?.scenes?.gameOver;
    if (!scene?.enterRunbackStage) throw new Error('Missing game over runback action');
    scene.enterRunbackStage('keyboard_launch_check');
  });
  await runbackPage.keyboard.down('Enter');
  await waitForScene(runbackPage, 'play');
  await runbackPage.keyboard.up('Enter');
  const runbackState = await assertKeyboardGameplayControls(runbackPage, 'One More Run launch');
  const runbackScreenshot = path.join(outputDir, 'one-more-run-keyboard.png');
  await runbackPage.screenshot({ path: runbackScreenshot, fullPage: true });
  reports.push({ label: 'One More Run launch', state: runbackState, screenshot: runbackScreenshot });
  await runbackPage.close();

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join('; ')}`);
  assert(consoleWarningsOrErrors.length === 0, `console warnings/errors: ${consoleWarningsOrErrors.join('; ')}`);

  const result = {
    ok: true,
    baseUrl,
    reports,
    pageErrors,
    consoleWarningsOrErrors
  };
  fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(`[keyboard-launch-paths] PASS outputDir=${outputDir}`);
} catch (error) {
  const result = {
    ok: false,
    baseUrl,
    outputDir,
    reports,
    pageErrors,
    consoleWarningsOrErrors,
    error: error?.stack || String(error)
  };
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.error(`[keyboard-launch-paths] FAIL outputDir=${outputDir}`);
  console.error(error?.stack || error);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
