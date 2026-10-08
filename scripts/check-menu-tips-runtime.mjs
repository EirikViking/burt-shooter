import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findPort(5270);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/menu-tips-runtime');
mkdirSync(outputDir, { recursive: true });

async function findPort(start) {
  for (let portNumber = start; portNumber < start + 30; portNumber += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(portNumber, host);
    });
    if (available) return portNumber;
  }
  throw new Error('No available menu-tip test port');
}

const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
  cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
});
server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

const startedAt = Date.now();
while (Date.now() - startedAt < 20000) {
  try {
    if ((await fetch(baseUrl)).ok) break;
  } catch { /* server still starting */ }
  await new Promise((resolve) => setTimeout(resolve, 200));
}

const browser = await chromium.launch({
  headless: true,
  executablePath: [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find(existsSync),
  args: ['--disable-gpu', '--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto(`${baseUrl}/?offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.menu?.astraMenuShip?.ready, null, { timeout: 30000 });
  const locales = ['en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja'];
  const results = [];
  for (const locale of locales) {
    await page.evaluate(async (language) => window.__novaI18n.setLanguagePreference(language), locale);
    await page.waitForTimeout(120);
    const result = await page.evaluate(async (language) => {
      const game = window.__game;
      const menu = game.scenes.menu;
      const tip = menu.launchAudioTip;
      tip.tipRotation.queue = [8];
      tip.tipRotation.phase = 'waiting';
      tip.tipRotation.phaseElapsedMs = 0;
      tip.tipRotation.waitDurationMs = 0;
      tip.currentIndex = null;
      tip.update(game.getWidth(), game.getHeight(), { deltaMs: 0, obstructed: false });
      tip.update(game.getWidth(), game.getHeight(), { deltaMs: 700, obstructed: false });
      const bounds = tip.getBounds();
      return {
        language,
        text: tip.copy.text,
        source: (await import('/src/ui/MenuTipRotation.js')).MENU_TIPS[8],
        visible: tip.visible,
        alpha: tip.alpha,
        eventMode: tip.eventMode,
        destroyed: tip.destroyed,
        hasParent: Boolean(tip.parent),
        isCurrentTip: menu.launchAudioTip === tip,
        childBounds: (() => { const value = tip.copy.getBounds(); return { x: value.x, y: value.y, width: value.width, height: value.height }; })(),
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      };
    }, locale);
    results.push(result);
    await page.screenshot({ path: path.join(outputDir, `menu-tip-${locale.toLowerCase()}.png`), fullPage: true });
  }

  const suspension = await page.evaluate(async () => {
    const menu = window.__game.scenes.menu;
    const tip = menu.launchAudioTip;
    const before = { ...tip._debugTipState };
    menu.openSettingsOverlay();
    await new Promise((resolve) => setTimeout(resolve, 180));
    const covered = { ...tip._debugTipState, visible: tip.visible };
    menu.closeSettingsOverlay();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const resumed = { ...tip._debugTipState, visible: tip.visible };
    return { before, covered, resumed };
  });

  for (const result of results) {
    assert.equal(result.visible, true, `${result.language} tip is visible`);
    assert.ok(result.alpha > 0.95, `${result.language} tip completed its fade`);
    assert.equal(result.eventMode, 'none', `${result.language} tip cannot steal input`);
    assert.ok(result.bounds.width > 300 && result.bounds.height > 30, `${result.language} tip has rendered bounds: ${JSON.stringify(result)}`);
    assert.ok(result.bounds.x >= 0 && result.bounds.y >= 0, `${result.language} tip starts on screen`);
    assert.ok(result.bounds.x + result.bounds.width <= 1920, `${result.language} tip fits horizontally`);
    assert.ok(result.bounds.y + result.bounds.height < 220, `${result.language} tip stays in the top banner lane`);
    if (result.language !== 'en') assert.notEqual(result.text, result.source, `${result.language} does not leak English`);
  }
  assert.equal(suspension.covered.visible, false, 'Settings hides the current tip');
  assert.equal(suspension.covered.phaseElapsedMs, suspension.before.phaseElapsedMs, 'Settings pauses rather than resets the cycle');
  assert.equal(suspension.resumed.visible, true, 'tip resumes after Settings closes');
  assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ results, suspension, errors }, null, 2)}\n`);
  console.log(`[menu-tips-runtime] PASS locales=${results.length} output=${outputDir}`);
} finally {
  await browser.close();
  server.kill();
}
