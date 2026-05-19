import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4348));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/music-pack-${timestamp()}`);

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

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

function track(state) {
  return String(state?.audio?.currentMusicTrack || '');
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  mkdirSync(outputDir, { recursive: true });
  await page.addInitScript(() => {
    localStorage.removeItem('burt_music_pack');
    localStorage.setItem('burt_music_enabled', 'true');
  });
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.mouse.click(30, 30);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.audio?.musicPack === 'generated' && /nova_swarm_menu_/i.test(state?.audio?.currentMusicTrack || '');
  }, null, { timeout: 10000 });
  const generatedState = await readState(page);

  await page.evaluate(() => {
    const scene = window.__game?.currentScene || window.__game?.scenes?.menu;
    try {
      scene?.openSettingsOverlay?.();
    } catch (error) {
      window.__musicPackCheckError = String(error?.stack || error);
    }
  });
  await page.waitForFunction(() => {
    if (window.__musicPackCheckError) throw new Error(window.__musicPackCheckError);
    const scene = window.__game?.currentScene || window.__game?.scenes?.menu;
    return Boolean(scene?.settingsOverlay?.musicPackButton?.parent);
  }, null, { timeout: 5000 });
  const buttonBounds = await page.evaluate(() => {
    const scene = window.__game?.currentScene || window.__game?.scenes?.menu;
    const button = scene?.settingsOverlay?.musicPackButton;
    if (!button?.getBounds) return null;
    const bounds = button.getBounds();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  });
  await page.mouse.click(buttonBounds.x + buttonBounds.width / 2, buttonBounds.y + buttonBounds.height / 2);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const track = state?.audio?.currentMusicTrack || '';
    return state?.audio?.musicPack === 'classic' && !/nova_swarm_menu_/i.test(track) && /Brave Pilots|SkyFire/i.test(track);
  }, null, { timeout: 10000 });
  const classicState = await readState(page);

  await page.screenshot({ path: path.join(outputDir, 'music-pack-settings.png'), fullPage: true });

  const failures = [
    generatedState.audio?.musicPack !== 'generated' ? `default music pack was ${generatedState.audio?.musicPack || 'missing'}` : null,
    !/nova_swarm_menu_/i.test(track(generatedState)) ? `default pack did not play generated menu track: ${track(generatedState) || 'none'}` : null,
    classicState.audio?.musicPack !== 'classic' ? `settings toggle did not switch to classic pack: ${classicState.audio?.musicPack || 'missing'}` : null,
    !/Brave Pilots|SkyFire/i.test(track(classicState)) ? `classic pack did not play alternate menu track: ${track(classicState) || 'none'}` : null,
    ...pageErrors.map((message) => `page error: ${message}`),
    ...consoleErrors.map((message) => `console error: ${message}`)
  ].filter(Boolean);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    generated: generatedState.audio,
    classic: classicState.audio,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[music-pack] PASS generated=${track(generatedState)} classic=${track(classicState)} report=${path.join(outputDir, 'report.json')}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
