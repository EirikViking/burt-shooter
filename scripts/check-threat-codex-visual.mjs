import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4391));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/threat-codex-visual-${timestamp()}`);

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

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function assert(condition, message, details = undefined) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

let server = null;
if (!process.env.CHECK_URL) {
  const command = viteCommand();
  server = spawn(command.command, [...command.args, '--host', host, '--port', String(port)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview:err] ${chunk}`));
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await canFetch(baseUrl)) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem('nova.threatDiscovery.v1', JSON.stringify({
      version: 1,
      items: {
        enemies: {
          nova_enemy_005: {
            id: 'nova_enemy_005',
            category: 'enemies',
            name: 'Copper Mite',
            firstSeenAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            timesSeen: 19,
            timesDefeated: 133,
            timesSurvived: 0,
            timesKilledPlayer: 0,
            highestScoreDuringEncounter: 0,
            metadata: {}
          }
        },
        attackPatterns: {},
        waveTactics: {},
        elites: {},
        bosses: {},
        runThemes: {},
        cabinetLogs: {},
        rareModifiers: {}
      },
      discoveriesThisRun: [],
      recentRunThemes: [],
      unreadIds: [],
      updatedAt: new Date().toISOString()
    }));
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.evaluate(() => {
    window.__game.showThreatCodex();
    window.__game.currentScene.moveEntryTo(4);
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'threatCodex' &&
      state.threatCodexScreen?.selectedEntryId === 'nova_enemy_005' &&
      state.threatCodexScreen?.detailArt?.spriteBounds;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(500);

  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const detail = state.threatCodexScreen.detailArt;
  const frame = detail.frame;
  const sprite = detail.spriteBounds;
  assert(detail.masked === true, 'Threat Codex detail art is not masked', detail);
  assert(detail.maskRenderable === true, 'Threat Codex mask must remain renderable so Pixi v8 does not blank the art', detail);
  assert(sprite.width > 24 && sprite.height > 24, 'Threat Codex sprite bounds look blank or collapsed', detail);
  assert(sprite.x >= frame.x + 4 && sprite.y >= frame.y + 4, 'Threat Codex sprite bleeds above/left of frame', detail);
  assert(sprite.x + sprite.width <= frame.x + frame.width - 4, 'Threat Codex sprite bleeds past the right frame', detail);
  assert(sprite.y + sprite.height <= frame.y + frame.height - 4, 'Threat Codex sprite bleeds below the frame', detail);

  const screenshot = path.join(outputDir, 'threat-codex-copper-mite.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const sample = await sharp(screenshot)
    .extract({
      left: Math.max(0, Math.floor(frame.x + 12)),
      top: Math.max(0, Math.floor(frame.y + 12)),
      width: Math.max(1, Math.floor(frame.width - 24)),
      height: Math.max(1, Math.floor(frame.height - 24))
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = sample.info.channels;
  let brightPixels = 0;
  for (let i = 0; i < sample.data.length; i += channels) {
    const r = sample.data[i] || 0;
    const g = sample.data[i + 1] || 0;
    const b = sample.data[i + 2] || 0;
    if (r + g + b > 110) brightPixels += 1;
  }
  const pixelCount = sample.info.width * sample.info.height;
  const brightRatio = brightPixels / Math.max(1, pixelCount);
  assert(brightRatio > 0.015, 'Threat Codex detail art region is visually blank', { brightRatio, frame, sprite });

  const report = {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    baseUrl,
    selectedEntryId: state.threatCodexScreen.selectedEntryId,
    detailArt: detail,
    brightRatio,
    screenshot,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  assert(report.ok, 'page errors during Threat Codex visual check', report);
  console.log(`[threat-codex-visual] PASS screenshot=${screenshot} brightRatio=${brightRatio.toFixed(4)}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
