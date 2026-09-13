import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4470));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/nova-miracle-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu-sandbox']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

let report;
try {
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return play?.isReady === true && play?.player?.active === true && play?.enemyManager?.state !== 'IDLE';
  }, null, { timeout: 25000 });
  await page.waitForFunction(() => (
    (window.__game?.scenes?.play?.enemyManager?.enemies || []).filter((enemy) => enemy?.active && enemy.kind !== 'boss').length >= 3
  ), null, { timeout: 15000 });

  const before = await page.evaluate(async () => {
    const play = window.__game?.scenes?.play;
    await play.powerupAssetsReady;
    play.player.invulnerable = true;
    play.player.shootCooldown = 999999;
    const width = play.gameplayGame.getWidth();
    const height = play.gameplayGame.getHeight();
    const pickup = play.powerupManager.spawnSpecific(width * 0.5, height * 0.34, 'nova_miracle', { source: 'runtime_qa' });
    pickup.vy = 0;
    pickup.baseY = height * 0.34;
    window.__novaMiracleQaPickup = pickup;
    const activeEnemies = (play.enemyManager.enemies || []).filter((enemy) => enemy?.active && enemy.kind !== 'boss').length;
    return {
      lives: play.game.lives,
      activeEnemies,
      enemyBullets: (play.bulletManager.enemyBullets || []).filter((bullet) => bullet?.active !== false).length,
      pickup: {
        type: pickup.type,
        x: Math.round(pickup.x),
        y: Math.round(pickup.y),
        radius: pickup.radius,
        pickupAssistRadius: pickup.pickupAssistRadius,
        lifeTime: pickup.lifeTime,
        mainSprite: Boolean(pickup.mainSprite),
        halo: Boolean(pickup.novaMiracleHalo),
        crown: Boolean(pickup.novaMiracleCrown)
      }
    };
  });
  await page.waitForTimeout(450);
  const pickupScreenshot = path.join(outputDir, 'nova-miracle-pickup.png');
  await page.screenshot({ path: pickupScreenshot, fullPage: true });

  const collected = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const pickup = window.__novaMiracleQaPickup;
    const livesBefore = play.game.lives;
    pickup.collect(play.player, play);
    play.triggerPowerupPickupJuice(pickup);
    return {
      livesBefore,
      livesAfter: play.game.lives,
      result: { ...play.lastNovaMiracle },
      activeNonBossAfter: (play.enemyManager.enemies || []).filter((enemy) => enemy?.active && enemy.kind !== 'boss').length,
      enemyBulletsAfter: (play.bulletManager.enemyBullets || []).filter((bullet) => bullet?.active !== false).length,
      miracleLayerVisible: Boolean((play.gameContainer?.children || []).find((child) => child?.label === 'novaMiracleBoardClear'))
    };
  });
  await page.waitForTimeout(160);
  const purgeScreenshot = path.join(outputDir, 'nova-miracle-purge.png');
  await page.screenshot({ path: purgeScreenshot, fullPage: true });
  await page.waitForTimeout(1450);
  const aftermathScreenshot = path.join(outputDir, 'nova-miracle-aftermath.png');
  await page.screenshot({ path: aftermathScreenshot, fullPage: true });

  assert(before.pickup.type === 'nova_miracle', 'runtime pickup type mismatch');
  assert(before.pickup.pickupAssistRadius === 34, `expected 34px miracle assist, got ${before.pickup.pickupAssistRadius}`);
  assert(before.pickup.mainSprite && before.pickup.halo && before.pickup.crown, 'miracle art/halo/crown did not render');
  assert(collected.livesAfter === collected.livesBefore + 1, 'runtime miracle did not grant exactly one life');
  assert(collected.result?.triggered === true, 'runtime miracle effect did not trigger');
  assert(collected.result.enemiesCleared >= before.activeEnemies, `runtime miracle did not clear the visible board (${collected.result.enemiesCleared}/${before.activeEnemies})`);
  assert(collected.activeNonBossAfter === 0, 'active non-boss enemies remained immediately after purge');
  assert(collected.enemyBulletsAfter === 0, 'enemy bullets remained immediately after purge');
  assert(collected.miracleLayerVisible, 'full-board miracle VFX layer was not visible');
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);

  report = {
    baseUrl,
    before,
    collected,
    screenshots: { pickupScreenshot, purgeScreenshot, aftermathScreenshot },
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[nova-miracle-runtime] PASS enemies=${collected.result.enemiesCleared} bullets=${collected.result.bulletsCleared + collected.result.pendingBulletsCleared} lives=${collected.livesBefore}->${collected.livesAfter}`);
  console.log(`[nova-miracle-runtime] screenshots=${outputDir}`);
} finally {
  await page.close();
  await browser.close();
  if (server) server.kill();
}
