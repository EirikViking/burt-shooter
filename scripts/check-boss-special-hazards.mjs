import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4341));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-special-hazards-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
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
  for (let candidate = startPort; candidate < startPort + 40; candidate++) {
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
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleWarningsOrErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') consoleWarningsOrErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startAtBoss: '1',
    startLevel: '6'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
  }, { timeout: 30000 });

  const results = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const player = play?.player;
    if (!game || !play || !boss || !player) throw new Error('Missing boss test surface');
    boss.x = (game.getWidth?.() || 1280) / 2;
    boss.y = Math.max(120, boss.y || 120);
    if (boss.sprite) {
      boss.sprite.x = boss.x;
      boss.sprite.y = boss.y;
    }

    const resetPlayer = () => {
      game.lives = 3;
      player.active = true;
      player.shieldActive = false;
      player.invulnerable = false;
      player.invulnerableTime = 0;
      if (player.activePowerup) {
        player.activePowerup.type = null;
        player.activePowerup.expiresAt = 0;
      }
      play.bossHazards = [];
      play.lastBossHazardHit = null;
    };

    const runCase = (name, setup) => {
      resetPlayer();
      const beforeLives = game.lives;
      const details = setup();
      const hazard = play.registerBossHazardFromBoss(boss, details.category || 'signature', details);
      play.updateBossHazards(1);
      return {
        name,
        ok: game.lives === beforeLives - 1 && Boolean(play.lastBossHazardHit),
        livesBefore: beforeLives,
        livesAfter: game.lives,
        hazard: hazard ? {
          kind: hazard.kind,
          type: hazard.type,
          category: hazard.category,
          hit: Boolean(hazard.hit)
        } : null,
        lastHit: play.lastBossHazardHit
      };
    };

    const beam = runCase('signature-lance-beam', () => {
      player.x = boss.x;
      player.y = boss.y + 260;
      return { category: 'signature', type: 'lance', playerX: player.x, playerY: player.y };
    });

    const ring = runCase('signature-web-ring', () => {
      player.x = boss.x + 125;
      player.y = boss.y + 18;
      return { category: 'signature', type: 'ring', playerX: player.x, playerY: player.y };
    });

    const wall = runCase('regular-wall-columns', () => {
      const offsets = typeof boss.getWallColumnOffsets === 'function' ? boss.getWallColumnOffsets() : [-60];
      player.x = boss.x + offsets[0];
      player.y = boss.y + 210;
      return { category: 'regular', type: 'wall', attack: 'wall', playerX: player.x, playerY: player.y };
    });

    return {
      cases: [beam, ring, wall],
      telemetry: JSON.parse(window.render_game_to_text()).bossHazards
    };
  });

  await page.waitForTimeout(120);
  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'boss-special-hazards.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const report = {
    ok: results.cases.every((item) => item.ok) &&
      pageErrors.length === 0 &&
      consoleWarningsOrErrors.length === 0,
    baseUrl,
    ...results,
    pageErrors,
    consoleWarningsOrErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[boss-special-hazards] PASS ${report.cases.map((item) => `${item.name}:${item.livesBefore}->${item.livesAfter}`).join(' ')} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
