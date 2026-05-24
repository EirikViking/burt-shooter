import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.I18N_UI_HOST || '127.0.0.1';
const explicitPort = process.env.I18N_UI_PORT ? Number(process.env.I18N_UI_PORT) : null;
const port = process.env.I18N_UI_URL ? null : (explicitPort || await findAvailablePort(Number(process.env.I18N_UI_PORT_START || 4173)));
const baseUrl = process.env.I18N_UI_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.I18N_UI_OUTPUT_DIR || `test-results/i18n-ui-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available i18n preview port found starting at ${startPort}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, baseArgs: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', baseArgs: ['vite'] };
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canFetch(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, baseArgs } = viteCommand();
  const args = [...baseArgs, 'preview', '--host', host, '--port', String(port), '--strictPort'];
  const server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  if (!(await waitForServer(baseUrl))) {
    server.kill();
    throw new Error(`Preview server did not become ready at ${baseUrl}`);
  }
  return server;
}

function withQuery(params = {}) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

async function waitForGame(page, expectedScene = 'menu') {
  await page.waitForFunction((scene) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return Boolean(window.__game && state.scene === scene);
  }, expectedScene, { timeout: 20000 });
}

async function state(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function uiSnapshot(page) {
  return page.evaluate(() => {
    const game = window.__game;
    const scene = game?.currentScene;
    const play = game?.scenes?.play;
    const settings = scene?.settingsOverlay || play?.settingsOverlay || null;
    return {
      language: JSON.parse(window.render_game_to_text?.() || '{}').language,
      scene: game?.currentSceneName || null,
      menu: {
        launch: game?.scenes?.menu?.startBtn?._label?.text || null,
        settings: game?.scenes?.menu?.settingsBtn?._label?.text || null,
        music: game?.scenes?.menu?.musicBtn?._label?.text || null
      },
      settings: {
        focus: settings?.getDebugState?.()?.focus || null,
        language: settings?.languageButton?._label?.text || null,
        languageHint: settings?.languageHint?.text || null,
        close: settings?.footerButtons?.close?._label?.text || null
      },
      hud: {
        score: play?.hud?.scoreText?.text || null,
        lives: play?.hud?.livesText?.text || null,
        mission: play?.hud?.missionLabel?.text || null,
        missionText: play?.hud?.missionText?.text || null
      },
      gameOver: {
        title: game?.scenes?.gameOver?.title?.text || null,
        prompt: game?.scenes?.gameOver?.promptText?.text || null,
        score: game?.scenes?.gameOver?.scoreText?.text || null,
        cta: game?.scenes?.gameOver?.retryButtonLabel?.text || null
      },
      glyphs: {
        rajdhani: document.fonts?.check?.('18px Rajdhani', 'äöüÄÖÜß') ?? null,
        orbitron: document.fonts?.check?.('18px Orbitron', 'äöüÄÖÜß') ?? null
      }
    };
  });
}

async function screenshot(page, name) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const server = await startPreviewServer();
mkdirSync(outputDir, { recursive: true });

const launchOptions = {
  headless: true,
  viewport: { width: 1280, height: 720 }
};
const chromePath = findChrome();
if (chromePath) launchOptions.executablePath = chromePath;

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage();
const consoleEvents = [];
const pageErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleEvents.push(message.text().slice(0, 500));
});
page.on('pageerror', (error) => pageErrors.push(error.message));

const screenshots = {};
const snapshots = {};

try {
  await page.goto(withQuery({ skipIntro: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForGame(page, 'menu');
  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('en'));
  await page.evaluate(() => window.__game?.currentScene?.openSettingsOverlay?.());
  await page.waitForFunction(() => Boolean(window.__game?.currentScene?.settingsOverlay), null, { timeout: 10000 });
  snapshots.englishSettings = await uiSnapshot(page);
  screenshots.englishSettings = await screenshot(page, '01-english-settings.png');
  assert(snapshots.englishSettings.language.current === 'en', 'English language did not resolve to en');
  assert(snapshots.englishSettings.menu.settings === 'SETTINGS', 'English menu settings label changed unexpectedly');

  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('de'));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').language?.current === 'de', null, { timeout: 10000 });
  snapshots.germanSettings = await uiSnapshot(page);
  screenshots.germanSettings = await screenshot(page, '02-german-settings.png');
  assert(snapshots.germanSettings.settings.language === 'Deutsch', 'German Settings language button did not show Deutsch');
  assert(snapshots.germanSettings.settings.close === 'SCHLIESSEN', 'German Settings close button was not localized');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__game?.currentScene?.settingsOverlay, null, { timeout: 10000 });
  snapshots.germanMenu = await uiSnapshot(page);
  screenshots.germanMenu = await screenshot(page, '03-german-main-menu.png');
  assert(snapshots.germanMenu.menu.launch === 'RUN STARTEN', 'German launch label missing');
  assert(snapshots.germanMenu.menu.settings === 'EINSTELLUNGEN', 'German settings label missing');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForGame(page, 'menu');
  snapshots.germanPersisted = await uiSnapshot(page);
  assert(snapshots.germanPersisted.language.current === 'de', 'German language did not persist after reload');

  await page.evaluate(() => window.__game?.startGame?.());
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', null, { timeout: 10000 });
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (play?.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play?.completeShipIntro?.();
    play?.hud?.update?.();
  });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.hud?.scoreText?.text), null, { timeout: 10000 });
  snapshots.germanHud = await uiSnapshot(page);
  screenshots.germanHud = await screenshot(page, '04-german-hud.png');
  assert(/^PUNKTZAHL/.test(snapshots.germanHud.hud.score || ''), 'German HUD score label missing');
  assert(/^LEBEN/.test(snapshots.germanHud.hud.lives || ''), 'German HUD lives label missing');
  assert(snapshots.germanHud.hud.mission === 'MISSION', 'German HUD mission label missing');

  await page.evaluate(() => {
    window.__game.score = 1234;
    window.__game.level = 3;
    window.__game.gameOver();
  });
  await waitForGame(page, 'gameOver');
  snapshots.germanGameOver = await uiSnapshot(page);
  screenshots.germanGameOver = await screenshot(page, '05-german-game-over.png');
  assert(['SPIEL VORBEI', 'LOKALE LEGENDE', 'PERSÖNLICHER BESTWERT', 'RUN ABGESCHLOSSEN'].includes(snapshots.germanGameOver.gameOver.title), 'German game-over title missing');
  assert(/^PUNKTZAHL/.test(snapshots.germanGameOver.gameOver.score || ''), 'German game-over score label missing');

  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('system'));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').language?.preference === 'system', null, { timeout: 10000 });
  snapshots.systemFallback = await uiSnapshot(page);
  assert(snapshots.systemFallback.language.current === 'en', 'System default fallback should resolve to English in this test runtime');

  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('en'));
  snapshots.englishRestored = await uiSnapshot(page);
  assert(snapshots.englishRestored.language.current === 'en', 'English restore failed');
} finally {
  await browser.close();
  if (server) server.kill();
}

const report = {
  status: consoleEvents.length || pageErrors.length ? 'failed' : 'passed',
  baseUrl,
  outputDir,
  screenshots,
  snapshots,
  consoleEvents,
  pageErrors
};

writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outputDir, status: report.status, screenshots, consoleEvents, pageErrors }, null, 2));

if (report.status !== 'passed') {
  throw new Error('i18n UI check failed');
}
