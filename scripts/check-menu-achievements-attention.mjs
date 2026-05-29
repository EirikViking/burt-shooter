import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4401));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-achievements-attention-${Date.now()}`);
const attentionKey = 'nova.achievementAttention.v1';

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
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      unreadIds: ['ACH_RANK_01'],
      updatedAt: new Date().toISOString()
    }));
  }, attentionKey);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.waitForTimeout(1800);
  const before = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const attention = before.menu?.achievementsAttention || {};
  assert(attention.unreadCount === 1, 'Achievements unread count is not surfaced on menu', { attention });
  assert(attention.glowVisible === true, 'Achievements menu attention glow is missing', { attention });
  assert(attention.animated === true, 'Achievements menu attention glow is not marked animated', { attention });
  assert(before.menu?.items?.achievementsButton, 'Achievements button bounds missing', before.menu);
  await page.screenshot({ path: path.join(outputDir, 'menu-achievements-attention.png'), fullPage: true });

  await page.evaluate(() => window.__game?.showAchievements?.());
  await page.waitForFunction(() => window.__game?.currentSceneName === 'achievements', null, { timeout: 10000 });
  const clearedStorage = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), attentionKey);
  assert(Array.isArray(clearedStorage.unreadIds) && clearedStorage.unreadIds.length === 0, 'Achievements attention did not clear after inspection', clearedStorage);

  await page.evaluate(() => window.__game?.showMenu?.());
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 10000 });
  await page.waitForTimeout(250);
  const after = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const cleared = after.menu?.achievementsAttention || {};
  assert(cleared.unreadCount === 0, 'Achievements unread count stayed after returning to menu', { cleared });
  assert(cleared.glowVisible === false, 'Achievements menu glow stayed visible after inspection', { cleared });

  const report = { ok: true, before: attention, after: cleared, clearedStorage };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[menu-achievements-attention] PASS report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
