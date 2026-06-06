import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4362));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/overrun-confirmation-${timestamp()}`);

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

async function startTestServer() {
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
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite test server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

function overlaps(a, b, padding = 2) {
  if (!a || !b) return false;
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

function assertOverrunTextLayout(state, label) {
  const interlude = state?.overrunInterlude;
  const textNodes = (interlude?.textNodes || [])
    .filter(node => node.visible !== false && node.bounds && node.bounds.width > 0 && node.bounds.height > 0);
  const expectedIds = new Set([
    'ui_overrun_card_title',
    'ui_overrun_card_flavor',
    'ui_overrun_card_report',
    'ui_overrun_card_sector',
    'ui_overrun_card_bonus',
    'ui_overrun_card_warning',
    'ui_overrun_confirm_prompt'
  ]);
  for (const id of expectedIds) {
    assert(textNodes.some(node => node.id === id), `${label}: missing overrun text node ${id}`);
  }
  const failures = [];
  for (let i = 0; i < textNodes.length; i += 1) {
    for (let j = i + 1; j < textNodes.length; j += 1) {
      if (overlaps(textNodes[i].bounds, textNodes[j].bounds, 3)) {
        failures.push(`${textNodes[i].id} overlaps ${textNodes[j].id}`);
      }
    }
  }
  assert.equal(failures.length, 0, `${label}: ${failures.join('; ')}`);
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;

try {
  server = await startTestServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 700));
  });

  await page.goto(`${baseUrl}/?autostart=1&debugBossToken=NOVA_DEBUG_2026&startLevel=10`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.enemyManager && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  const triggered = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play) throw new Error('Missing play scene for overrun confirmation check');
    play.introActive = false;
    play.introComplete = true;
    play.debugInvincible = true;
    play.debugStartLevel = null;
    play.debugStartAtBoss = false;
    play.enemyManager?.clearEnemies?.();
    game.level = 10;
    game.runCleared = false;
    game.runClearReason = null;
    game.markRunClear?.('target_sector_clear');
    play.triggerOverrunClearCelebration({
      nextSector: 11,
      milestoneSector: 10,
      eventKind: 'run_clear',
      clearBonus: 10000,
      livesBonus: 7500
    });
    game.nextLevel();
    return JSON.parse(window.render_game_to_text());
  });

  assert.equal(triggered.level, 11);
  assert.equal(triggered.overrunInterlude?.active, true);
  assert.equal(triggered.overrunInterlude?.requiresConfirm, true);
  assert.equal(triggered.overrunInterlude?.confirmed, false);
  assert.equal(triggered.overrunInterlude?.eventKind, 'run_clear');
  assert.equal(triggered.overrunInterlude?.milestoneSector, 10);
  assert.equal(triggered.overrunInterlude?.variantId, 'clear_gate');
  assert.match(triggered.overrunInterlude?.promptText || '', /ready/i);

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.overrunInterlude?.active === true &&
      state.overrunInterlude?.cardVisible === true &&
      state.overrunInterlude?.promptVisible === true;
  }, null, { timeout: 2000 });
  const visible = await readState(page);
  assertOverrunTextLayout(visible, 'visible overrun interlude');

  await page.waitForTimeout(5000);
  const held = await readState(page);
  assert.equal(held.level, 11);
  assert.equal(held.overrunInterlude?.active, true);
  assert.equal(held.overrunInterlude?.requiresConfirm, true);
  assert.equal(held.overrunInterlude?.confirmed, false);
  assert.equal(held.overrunInterlude?.readyForConfirm, true);
  assert.equal(held.overrunInterlude?.cardVisible, true);
  assert.equal((held.enemyVisualAudit?.staleVisibleCount || 0) + (held.enemyVisualAudit?.orphanedVisibleCount || 0), 0);
  assertOverrunTextLayout(held, 'held overrun interlude');
  const heldScreenshot = path.join(outputDir, 'overrun-confirmation-held.png');
  await page.screenshot({ path: heldScreenshot, fullPage: true });

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.overrunInterlude?.confirmed === true && state.overrunInterlude?.confirmedBy === 'keyboard';
  }, null, { timeout: 2000 });
  const confirmed = await readState(page);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && state.level === 11 && state.overrunInterlude?.active === false;
  }, null, { timeout: 3000 });
  const resumed = await readState(page);

  const screenshot = path.join(outputDir, 'overrun-confirmed-resumed.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const report = {
    status: 'passed',
    baseUrl,
    triggered: {
      level: triggered.level,
      overrunInterlude: triggered.overrunInterlude
    },
    visible: {
      level: visible.level,
      overrunInterlude: visible.overrunInterlude
    },
    held: {
      level: held.level,
      overrunInterlude: held.overrunInterlude,
      enemyVisualAudit: held.enemyVisualAudit
    },
    confirmed: {
      level: confirmed.level,
      overrunInterlude: confirmed.overrunInterlude
    },
    resumed: {
      level: resumed.level,
      scene: resumed.scene,
      overrunInterlude: resumed.overrunInterlude,
      wave: resumed.wave,
      enemyVisualAudit: resumed.enemyVisualAudit
    },
    heldScreenshot,
    screenshot,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length > 0) throw new Error(`Console errors: ${consoleErrors.join('; ')}`);
  console.log(`[overrun-confirmation] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[overrun-confirmation] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
