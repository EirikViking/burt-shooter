import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.POWERUP_VISUAL_HOST || '127.0.0.1';
const port = Number(process.env.POWERUP_VISUAL_PORT || await findAvailablePort(4190));
const baseUrl = process.env.POWERUP_VISUAL_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.POWERUP_VISUAL_OUTPUT_DIR || `test-results/powerup-visuals-${timestamp()}`);
const powerupTypes = [
  'triple_beam',
  'vector_boost',
  'rapid_cabinet',
  'overdrive_core',
  'slow_time',
  'ghost',
  'life',
  'shield',
  'rapid_fire',
  'double_shot',
  'damage_up',
  'speed_up',
  'pierce',
  'score_x2',
  'magnet',
  'drones',
  'shockwave',
  'point_defense',
  'bomb',
  'chain_lightning',
  'orbital_strike',
  'vampire'
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available powerup visual port found starting at ${startPort}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canFetch(url) || !(await isPortAvailable(port))) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const baseArgs = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const args = [...baseArgs, 'preview', '--host', host, '--port', String(port), '--strictPort'];
  const server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  if (!(await waitForServer(baseUrl))) {
    server.kill();
    throw new Error(`Preview server did not become ready at ${baseUrl}`);
  }
  return server;
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const executablePath = findChrome();
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--disable-gpu', '--no-sandbox']
});

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const consoleEvents = [];
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) {
      consoleEvents.push({ type: message.type(), text: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    consoleEvents.push({ type: 'pageerror', text: error.message });
  });

  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.powerupManager && window.__game?.scenes?.play?.player, null, { timeout: 15000 });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return Boolean(play?.introActive || play?.introComplete);
  }, null, { timeout: 15000 });
  await page.waitForTimeout(300);

  const state = await page.evaluate((types) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.powerupManager;
    if (!game || !play || !manager) return { ok: false, reason: 'missing play powerup manager' };

    if (game.lives < 3) game.lives = 3;
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) {
      play.introOverlay.parent.removeChild(play.introOverlay);
    }
    if (play.player) {
      play.player.invulnerable = true;
      play.player.x = game.getWidth() * 0.5;
      play.player.y = game.getHeight() - 70;
    }
    if (play.enemyManager) {
      play.enemyManager.enemies?.forEach(enemy => { enemy.active = false; });
      play.enemyManager.enemies = [];
      play.enemyManager.state = 'POWERUP_VISUAL_CHECK';
    }
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    manager.powerups.forEach(powerup => {
      if (powerup.sprite?.parent) powerup.sprite.parent.removeChild(powerup.sprite);
    });
    manager.powerups = [];

    const columns = 6;
    const startX = 150;
    const startY = 110;
    const gapX = 190;
    const gapY = 135;
    types.forEach((type, index) => {
      const x = startX + (index % columns) * gapX;
      const y = startY + Math.floor(index / columns) * gapY;
      manager.spawnSpecific(x, y, type);
    });

    return {
      ok: true,
      count: manager.powerups.length,
      types: manager.powerups.map(powerup => ({
        type: powerup.type,
        hasMainSprite: Boolean(powerup.mainSprite),
        hasTypeBadge: Boolean(powerup.badgeLabel?.text && powerup.badgePlate && powerup.iconRing),
        badgeLabel: powerup.badgeLabel?.text || null,
        textureLabel: powerup.mainSprite?.texture?.label || powerup.mainSprite?.texture?.source?.label || null,
        width: Math.round(powerup.mainSprite?.width || 0),
        height: Math.round(powerup.mainSprite?.height || 0)
      }))
    };
  }, powerupTypes);

  await page.waitForTimeout(500);
  const screenshot = path.join(outputDir, 'powerup-icons-runtime.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const collectState = await page.evaluate((types) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.powerupManager;
    const player = play?.player;
    if (!game || !play || !manager || !player) return { ok: false, reason: 'missing collect harness' };

    const expected = {
      triple_beam: () => player.activePowerup?.type === 'triple_beam',
      vector_boost: () => player.activePowerup?.type === 'vector_boost',
      rapid_cabinet: () => player.activePowerup?.type === 'rapid_cabinet',
      overdrive_core: () => player.activePowerup?.type === 'overdrive_core',
      slow_time: () => player.activePowerup?.type === 'slow_time',
      ghost: () => player.activePowerup?.type === 'ghost' && player.sprite?.alpha < 1,
      shield: () => player.shieldActive === true,
      life: () => game.lives >= 2,
      rapid_fire: () => player.activePowerup?.type === 'rapid_fire',
      double_shot: () => player.activePowerup?.type === 'double_shot',
      damage_up: () => player.activePowerup?.type === 'damage_up',
      speed_up: () => player.activePowerup?.type === 'speed_up',
      pierce: () => player.activePowerup?.type === 'pierce',
      score_x2: () => player.scoreMultiplier === 2,
      magnet: () => player.magnetActive === true,
      drones: () => player.dronesActive === true,
      shockwave: () => player.activePowerup?.type == null,
      point_defense: () => player.pointDefenseActive === true,
      bomb: () => player.bombShotsLeft === 3,
      chain_lightning: () => player.chainLightningActive === true,
      orbital_strike: () => player.orbitalStrikeActive === true && player.orbitalStrikeCharges === 5,
      vampire: () => player.vampireActive === true
    };

    const results = [];
    for (const type of types) {
      try {
        player.resetPowerups?.();
        player.deactivateShield?.();
        player.deactivateBomb?.();
        if (type === 'life') game.lives = 1;
        const powerup = manager.spawnSpecific(player.x, player.y, type, { source: 'collect-check' });
        powerup.collect(player, play);
        results.push({
          type,
          ok: Boolean(expected[type]?.()),
          activePowerup: player.activePowerup?.type || null,
          shieldActive: Boolean(player.shieldActive),
          scoreMultiplier: player.scoreMultiplier,
          bombShotsLeft: player.bombShotsLeft,
          orbitalStrikeCharges: player.orbitalStrikeCharges,
          lives: game.lives
        });
      } catch (error) {
        results.push({ type, ok: false, error: error?.message || String(error) });
      }
    }
    return {
      ok: results.every((item) => item.ok),
      results
    };
  }, powerupTypes);

  const missing = state.types?.filter(item => !item.hasMainSprite || item.width < 28 || item.height < 28) || [];
  const missingBadges = state.types?.filter(item => !item.hasTypeBadge) || [];
  const failedCollects = collectState.results?.filter(item => !item.ok) || [];
  const report = {
    status: state.ok && state.count === powerupTypes.length && missing.length === 0 && missingBadges.length === 0 && failedCollects.length === 0 && consoleEvents.length === 0 ? 'passed' : 'failed',
    baseUrl,
    screenshot,
    state,
    collectState,
    missing,
    missingBadges,
    failedCollects,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (report.status !== 'passed') {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(`[powerup-visuals] PASS count=${state.count} collected=${collectState.results?.length || 0} screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
