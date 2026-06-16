import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4691));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-scrollbars-${timestamp()}`);

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
  throw new Error(`No available menu scrollbar check port found starting at ${startPort}`);
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

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function dragBar(page, bar) {
  const x = Math.round(bar.x + bar.width / 2);
  const startY = Math.round(bar.y + Math.min(12, bar.height / 4));
  const endY = Math.round(bar.y + bar.height - Math.min(12, bar.height / 4));
  await page.mouse.move(x, startY);
  await page.mouse.down();
  await page.mouse.move(x, endY, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
}

async function openCodex(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.showThreatCodex), null, { timeout: 30000 });
  await page.evaluate(() => window.__game.showThreatCodex());
  await page.waitForFunction(() => window.__game?.currentSceneName === 'threatCodex', null, { timeout: 10000 });
  await page.waitForTimeout(400);
}

async function openAchievements(page) {
  await page.evaluate(() => window.__game.showAchievements());
  await page.waitForFunction(() => window.__game?.currentSceneName === 'achievements', null, { timeout: 10000 });
  await page.waitForTimeout(400);
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
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
  await openCodex(page);
  const codexBefore = await readState(page);
  const codexBar = codexBefore.threatCodexScreen?.entryScrollbar;
  assert.equal(codexBefore.scene, 'threatCodex');
  assert.ok(codexBar?.interactive, 'Threat Codex entry scrollbar should be interactive');
  assert.equal(codexBefore.threatCodexScreen?.entryScroll?.scrollable, true, 'Threat Codex list should be scrollable for the default category');
  await page.screenshot({ path: path.join(outputDir, '01-codex-before-drag.png') });
  await dragBar(page, codexBar);
  const codexAfter = await readState(page);
  await page.screenshot({ path: path.join(outputDir, '02-codex-after-drag.png') });
  assert.ok(
    (codexAfter.threatCodexScreen?.entryScroll?.start || 0) > (codexBefore.threatCodexScreen?.entryScroll?.start || 0) ||
      codexAfter.threatCodexScreen?.selectedEntryId !== codexBefore.threatCodexScreen?.selectedEntryId,
    'Threat Codex scrollbar drag should move the selected/list position'
  );

  await openAchievements(page);
  const achievementsBefore = await readState(page);
  const achievementBar = achievementsBefore.achievementsScreen?.scrollbar;
  assert.equal(achievementsBefore.scene, 'achievements');
  assert.ok(achievementBar?.interactive, 'Achievements scrollbar should be interactive');
  await page.screenshot({ path: path.join(outputDir, '03-achievements-before-drag.png') });
  await dragBar(page, achievementBar);
  const achievementsAfter = await readState(page);
  await page.screenshot({ path: path.join(outputDir, '04-achievements-after-drag.png') });
  assert.ok(
    (achievementsAfter.achievementsScreen?.scrollOffset || 0) > (achievementsBefore.achievementsScreen?.scrollOffset || 0),
    'Achievements scrollbar drag should increase scrollOffset'
  );

  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(consoleErrors, [], `Console errors: ${consoleErrors.join('; ')}`);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    outputDir,
    codex: {
      before: codexBefore.threatCodexScreen?.entryScroll,
      after: codexAfter.threatCodexScreen?.entryScroll,
      scrollbar: codexBar
    },
    achievements: {
      before: {
        scrollOffset: achievementsBefore.achievementsScreen?.scrollOffset,
        focusedId: achievementsBefore.achievementsScreen?.focusedId
      },
      after: {
        scrollOffset: achievementsAfter.achievementsScreen?.scrollOffset,
        focusedId: achievementsAfter.achievementsScreen?.focusedId
      },
      scrollbar: achievementBar
    }
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[menu-scrollbars] PASS outputDir=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
