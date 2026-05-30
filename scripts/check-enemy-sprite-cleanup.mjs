import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4398));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/enemy-sprite-cleanup-${timestamp()}`);

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
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.enemyManager, null, { timeout: 30000 });

  const orphanResult = await page.evaluate(() => {
    const manager = window.__game.scenes.play.enemyManager;
    manager.clearEnemies();
    manager.spawnWave({ type: 'chaser', count: 4, formation: 'ARC' });
    const before = manager.getEnemySpriteCleanupDebugState();
    const orphan = manager.enemies.find((enemy) => enemy?.sprite?.parent);
    manager.enemies = manager.enemies.filter((enemy) => enemy !== orphan);
    const parentBeforePrune = Boolean(orphan?.sprite?.parent);
    const pruned = manager.pruneOrphanEnemySprites('test-orphan');
    const after = manager.getEnemySpriteCleanupDebugState();
    return { before, parentBeforePrune, pruned, after };
  });

  assert(orphanResult.parentBeforePrune === true, 'test did not create an orphan enemy sprite', orphanResult);
  assert(orphanResult.pruned >= 1, 'orphan enemy sprite was not pruned', orphanResult);
  assert(orphanResult.after.orphaned === 0, 'orphan enemy sprite still exists after prune', orphanResult);

  const inactiveResult = await page.evaluate(async () => {
    const manager = window.__game.scenes.play.enemyManager;
    manager.clearEnemies();
    manager.spawnWave({ type: 'bruiser', count: 3, formation: 'ARC' });
    manager.enemies.forEach((enemy) => {
      enemy.active = false;
      enemy.waitingForEntry = false;
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    manager.updateEnemies(1);
    return manager.getEnemySpriteCleanupDebugState();
  });
  assert(inactiveResult.displayList === 0, 'inactive enemy sprites remain on display list', inactiveResult);
  assert(inactiveResult.orphaned === 0, 'inactive enemy cleanup left orphan sprites', inactiveResult);

  const killPathResult = await page.evaluate(() => {
    const manager = window.__game.scenes.play.enemyManager;
    manager.clearEnemies();
    const result = {
      killed: 0,
      parentAfterKill: 0,
      stillRenderableAfterKill: 0,
      maxDisplayListAfterWave: 0,
      maxOrphanedAfterWave: 0,
      samples: []
    };

    for (let wave = 0; wave < 10; wave += 1) {
      manager.spawnWave({ type: wave % 2 === 0 ? 'chaser' : 'bruiser', count: 6, formation: wave % 2 === 0 ? 'ARC' : 'GRID' });
      const enemies = [...manager.enemies].filter((enemy) => enemy?.sprite?.parent);
      for (const enemy of enemies) {
        enemy.waitingForEntry = false;
        enemy.active = true;
        enemy.health = Math.max(1, Number(enemy.health) || 1);
        const sprite = enemy.sprite;
        const died = enemy.takeDamage(enemy.health + 9999);
        if (died) result.killed += 1;
        if (sprite?.parent) result.parentAfterKill += 1;
        if (sprite?.visible || sprite?.renderable) result.stillRenderableAfterKill += 1;
        if (result.samples.length < 4) {
          result.samples.push({
            died,
            parentAfterKill: Boolean(sprite?.parent),
            visible: Boolean(sprite?.visible),
            renderable: Boolean(sprite?.renderable)
          });
        }
      }
      manager.updateEnemies(1);
      const cleanup = manager.getEnemySpriteCleanupDebugState();
      result.maxDisplayListAfterWave = Math.max(result.maxDisplayListAfterWave, cleanup.displayList || 0);
      result.maxOrphanedAfterWave = Math.max(result.maxOrphanedAfterWave, cleanup.orphaned || 0);
      manager.clearEnemies();
    }

    return result;
  });
  assert(killPathResult.killed >= 40, 'kill-path cleanup test did not kill enough enemies', killPathResult);
  assert(killPathResult.parentAfterKill === 0, 'killed enemy sprites stayed attached to the display list', killPathResult);
  assert(killPathResult.stillRenderableAfterKill === 0, 'killed enemy sprites stayed visible/renderable', killPathResult);
  assert(killPathResult.maxDisplayListAfterWave === 0, 'killed enemy sprites accumulated after wave cleanup', killPathResult);
  assert(killPathResult.maxOrphanedAfterWave === 0, 'killed enemy sprites left orphan display objects after wave cleanup', killPathResult);

  const screenshot = path.join(outputDir, 'enemy-sprite-cleanup.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const report = { ok: pageErrors.length === 0 && consoleErrors.length === 0, baseUrl, orphanResult, inactiveResult, killPathResult, pageErrors, consoleErrors, screenshot };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  assert(report.ok, 'browser errors during enemy sprite cleanup check', report);
  console.log(`[enemy-sprite-cleanup] PASS screenshot=${screenshot}`);
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
