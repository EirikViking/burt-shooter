import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4330));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ship-trait-combat-${timestamp()}`);
const wingTraitShip = process.env.TRAIT_TEST_SHIP || 'nova-player-ship-07.png';

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

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame), { timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 100000, bestRank: 6, bestLevel: 1 }));
  });
  await page.evaluate((spriteKey) => window.__game.startGame(spriteKey), wingTraitShip);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.player?.traitState?.wingShotEvery > 0;
  }, { timeout: 30000 });

  await page.waitForTimeout(1200);
  const result = await page.evaluate(() => {
    const game = window.__game;
    const player = game?.scenes?.play?.player;
    const shots = [];
    for (let i = 0; i < 4; i += 1) {
      player.shootCooldown = 0;
      const bullets = player.shoot();
      shots.push({
        index: i + 1,
        count: bullets.length,
        wingShots: bullets.filter((bullet) => bullet.isTraitWingShot).length,
        bonusShots: bullets.filter((bullet) => bullet.isTraitBonusShot).length,
        traitState: player.getTraitState()
      });
    }
    const scene = game?.scenes?.play;
    const beforeWingImpactScore = game.score;
    scene.applyShipTraitBulletImpact({
      isPlayer: true,
      isTraitWingShot: true,
      damage: 1
    }, {
      x: player.x,
      y: player.y - 180,
      active: true
    });
    const afterWingImpactScore = game.score;
    const textState = JSON.parse(window.render_game_to_text?.() || '{}');
    return {
      selectedShipSpriteKey: game.selectedShipSpriteKey,
      traitLabel: player.shipTrait?.label || null,
      traitCombat: player.traitCombat,
      shots,
      wingImpact: {
        beforeScore: beforeWingImpactScore,
        afterScore: afterWingImpactScore,
        scoreDelta: afterWingImpactScore - beforeWingImpactScore,
        lastSfxEvent: textState?.audio?.lastSfxEvent || null,
        lastSfxTrack: textState?.audio?.lastSfxTrack || null
      },
      textState
    };
  });

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'ship-trait-combat.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const cadence = Number(result.traitCombat?.wingShotEvery || 0);
  const cadenceShot = result.shots.find((shot) => shot.index === cadence);
  const report = {
    ok: Boolean(
      cadence > 0 &&
      result.selectedShipSpriteKey === wingTraitShip &&
      cadenceShot?.wingShots === 2 &&
      cadenceShot.count >= 4 &&
      result.wingImpact?.scoreDelta > 0 &&
      result.wingImpact?.lastSfxEvent === 'trait_wing_hit' &&
      result.textState?.player?.traitState?.wingShotEvery === cadence &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    wingTraitShip,
    result,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[ship-trait-combat] PASS ${result.traitLabel} cadence=${cadence} wingShots=${cadenceShot.wingShots} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
