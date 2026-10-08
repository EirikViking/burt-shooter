import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const outputDir = path.resolve(process.env.GAMEPLAY_BACKGROUND_QA_DIR || 'test-results/gameplay-background-setting');
fs.mkdirSync(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findPort(start = 4820) {
  for (let port = start; port < start + 40; port += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(port, host);
    });
    if (available) return port;
  }
  throw new Error('No free gameplay-background QA port');
}

async function waitForUrl(url) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
    } catch { }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Vite did not start at ${url}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => fs.existsSync(candidate));
}

const port = await findPort();
const baseUrl = `http://${host}:${port}`;
const server = spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});
server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

let browser;
try {
  await waitForUrl(baseUrl);
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('nova_gameplay_background_v1', 'legacy');
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      version: 4,
      totalRuns: 1,
      bestScore: 1000,
      bestLevel: 1,
      bestSector: 1,
      pilotXp: 0,
      pilotRank: 0,
      unlockedShipIds: ['nova_ship_01']
    }));
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return window.__game?.currentSceneName === 'play'
      && play?.gameplayBackgroundStyle === 'legacy'
      && Boolean(play?.gameplayBackdrop?.parent);
  }, null, { timeout: 120000 });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.isPaused = true;
    play.clearToastState?.();
    if (play.introActive) play.completeShipIntro?.();
  });
  const legacy = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    game.level = 5;
    play.applyGameplayBackdropLevel(5);
    for (let index = 0; index < 12; index += 1) play.updateGameplayBackdrop(6);
    return {
      style: play.gameplayBackgroundStyle,
      source: play.sectorWorldSource,
      usesSectorWorlds: play.gameplayBackdropUsesSectorWorlds,
      mode: play.gameplayBackdropMode,
      baseAlpha: play.gameplayBackdrop?.alpha ?? 0,
      hasStorm: Boolean(play.gameplayStormBackdrop),
      hasBoss: Boolean(play.gameplayBossBackdrop)
    };
  });
  assert(legacy.style === 'legacy', `expected legacy style, got ${legacy.style}`);
  assert(legacy.source?.endsWith('/nova-swarm-gameplay-arena.webp'), `wrong legacy source ${legacy.source}`);
  assert(legacy.usesSectorWorlds === false, 'legacy style must not rotate planet worlds');
  assert(legacy.mode === 'boss', `expected boss encounter mode, got ${legacy.mode}`);
  assert(legacy.baseAlpha > 0.5, `legacy cabinet backdrop disappeared in boss mode (${legacy.baseAlpha})`);
  assert(!legacy.hasStorm && !legacy.hasBoss, 'legacy style loaded alternate storm or boss artwork');
  await page.screenshot({ path: path.join(outputDir, 'legacy-boss-1920x1080.png'), fullPage: true });

  const settingsBefore = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.openSettingsOverlay();
    return play.settingsOverlay.getDebugState();
  });
  assert(settingsBefore.display.gameplayBackground === 'legacy', 'Settings did not show the persisted legacy choice');
  assert(settingsBefore.visibleControls.some((control) => control.id === 'gameplay_background'), 'Gameplay Background row is missing');
  await page.screenshot({ path: path.join(outputDir, 'settings-legacy-1920x1080.png'), fullPage: true });

  await page.evaluate(() => {
    const overlay = window.__game.scenes.play.settingsOverlay;
    overlay.controlRegistry.find((control) => control.id === 'gameplay_background')?.cycle?.(1);
  });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return play?.gameplayBackgroundStyle === 'modern'
      && play?.gameplayBackdropUsesSectorWorlds === true
      && Boolean(play?.gameplayBackdrop?.parent);
  }, null, { timeout: 30000 });
  const modern = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      style: play.gameplayBackgroundStyle,
      source: play.sectorWorldSource,
      stored: localStorage.getItem('nova_gameplay_background_v1'),
      settings: play.settingsOverlay.getDebugState().display
    };
  });
  assert(modern.style === 'modern', `expected modern style, got ${modern.style}`);
  assert(modern.source?.includes('/art/astra/world/'), `wrong modern source ${modern.source}`);
  assert(modern.stored === 'modern', `modern preference was not persisted (${modern.stored})`);
  assert(modern.settings.gameplayBackground === 'modern', 'Settings debug state did not update to modern');
  await page.screenshot({ path: path.join(outputDir, 'modern-live-switch-1920x1080.png'), fullPage: true });

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join('; ')}`);
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify({ status: 'passed', legacy, modern, pageErrors }, null, 2));
  console.log(`[gameplay-background-setting] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[gameplay-background-setting] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
