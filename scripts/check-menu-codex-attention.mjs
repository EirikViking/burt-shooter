import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4399));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-codex-attention-${Date.now()}`);

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
const browser = await chromium.launch({ headless: true, executablePath: findChrome() });

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.addInitScript(() => {
    localStorage.setItem('nova.threatDiscovery.v1', JSON.stringify({
      version: 1,
      items: { enemies: {}, attackPatterns: {}, waveTactics: {}, elites: {}, bosses: {}, runThemes: {}, cabinetLogs: {}, rareModifiers: {} },
      discoveriesThisRun: [{ id: 'nova_enemy_005', category: 'enemies', name: 'Copper Mite' }],
      recentRunThemes: [],
      unreadIds: ['enemies:nova_enemy_005'],
      updatedAt: new Date().toISOString()
    }));
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.waitForTimeout(300);
  const first = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  await page.waitForTimeout(400);
  const second = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const attention = second.menu?.threatCodexAttention || {};
  assert(attention.unreadCount === 1, 'Threat Codex unread count is not surfaced on menu', { attention });
  assert(attention.glowVisible === true, 'Threat Codex menu attention glow is missing', { attention });
  assert(attention.animated === true, 'Threat Codex menu attention glow is not marked animated', { attention });
  assert(first.menu?.items?.threatCodexButton && second.menu?.items?.threatCodexButton, 'Threat Codex button bounds missing', {
    first: first.menu,
    second: second.menu
  });
  const screenshot = path.join(outputDir, 'menu-codex-attention.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify({ ok: true, attention, screenshot }, null, 2));
  console.log(`[menu-codex-attention] PASS screenshot=${screenshot}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
