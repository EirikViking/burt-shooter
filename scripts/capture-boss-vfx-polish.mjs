import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4384));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.BOSS_VFX_OUTPUT_DIR || path.join('test-results', 'boss-vfx-polish', timestamp()));
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

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
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function openBoss(page, level) {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
    startAtBoss: '1',
    startLevel: String(level)
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
  }, { timeout: 30000 });

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const player = play?.player;
    if (!game || !play || !boss || !player) throw new Error('Missing boss capture surface');
    boss.entryStartMs = Date.now() - boss.entryDurationMs - 1;
    boss.x = game.getWidth() * 0.5;
    boss.y = game.getHeight() * 0.24;
    if (boss.sprite) {
      boss.sprite.x = boss.x;
      boss.sprite.y = boss.y;
    }
    player.x = game.getWidth() * 0.52;
    player.y = game.getHeight() * 0.82;
    player.invulnerable = true;
    player.invulnerableTime = 30000;
    play.bossHazards = [];
    play.lastBossHazardHit = null;
  });

  await page.waitForTimeout(Number(process.env.BOSS_VFX_SETTLE_MS || 1650));

  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play) return;
    play.toastQueue = [];
    play.toastTopQueue = [];
    play.toastCornerQueue = [];
  });
}

async function stage(page, scenario) {
  await page.evaluate((scenarioName) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const player = play?.player;
    if (!game || !play || !boss || !player) throw new Error('Missing boss capture surface');
    player.invulnerable = true;
    player.invulnerableTime = 30000;

    if (scenarioName === 'level1-charge') {
      boss.phase = 2;
      boss.startSignatureTelegraph?.('cone', player.x, player.y);
      boss.update?.(2, player.x, player.y);
      return;
    }

    if (scenarioName === 'level5-special') {
      boss.phase = 3;
      boss.applyPhasePlan?.(3);
      const type = boss.getSignatureForPhase?.(3) || 'cone';
      boss.startSignatureTelegraph?.(type, player.x, player.y);
      if (boss.telegraph) boss.telegraph.start -= boss.telegraph.duration + 20;
      boss.update?.(2, player.x, player.y);
      play.updateBossHazards?.(2);
      return;
    }

    if (scenarioName === 'level10-phase-hurt') {
      boss.phase = 1;
      boss.phaseNotified = { 2: false, 3: false };
      boss.health = Math.max(2, Math.floor(boss.maxHealth * 0.74));
      boss.invulnerableUntilMs = 0;
      boss.update?.(2, player.x, player.y);
      boss.takeDamage?.(1);
      boss.update?.(2, player.x, player.y);
      return;
    }

    if (scenarioName === 'beam-hazard') {
      boss.phase = 3;
      player.x = game.getWidth() * 0.18;
      player.y = game.getHeight() * 0.84;
      boss.telegraph = null;
      boss.regularTelegraph = null;
      boss.delayedSignature = null;
      boss.signatureCooldown = 999999;
      boss.shootCooldown = 999999;
      boss.clearTelegraphVisual?.();
      boss.clearRegularAttackTelegraphVisual?.();
      play.bossHazards = [];
      play.registerBossHazardFromBoss?.(boss, 'signature', {
        type: 'lance',
        attack: 'sniper',
        playerX: boss.x,
        playerY: game.getHeight() * 0.88,
        sourceX: boss.x,
        sourceY: boss.y + 18
      });
      const hazard = play.bossHazards?.[0];
      if (hazard) {
        hazard.durationMs = Math.max(hazard.durationMs || 0, 1600);
        hazard.startedAt = Date.now() - Math.round(hazard.durationMs * 0.36);
        hazard.armingMs = 999999;
      }
      play.updateBossHazards?.(2);
    }
  }, scenario);
}

async function capture(page, filename, label) {
  await page.waitForTimeout(180);
  const screenshot = path.join(outputDir, filename);
  await page.screenshot({ path: screenshot, fullPage: true });
  const state = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const boss = state.visibleEnemies?.find((enemy) => enemy.kind === 'boss') || null;
  return {
    label,
    screenshot,
    level: state.level || null,
    wave: state.wave || null,
    boss: boss ? {
      archetype: boss.bossArchetype,
      phase: boss.phase,
      signature: boss.bossSignature,
      animation: boss.bossAnimation,
      telegraph: boss.telegraph
    } : null,
    hazards: state.bossHazards || null
  };
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
  mkdirSync(outputDir, { recursive: true });
  const captures = [];

  await openBoss(page, 1);
  await stage(page, 'level1-charge');
  captures.push(await capture(page, 'level-01-charge-telegraph.png', 'Level 1 charge telegraph'));

  await openBoss(page, 5);
  await stage(page, 'level5-special');
  captures.push(await capture(page, 'level-05-special-attack.png', 'Level 5 special attack VFX'));

  await openBoss(page, 10);
  await stage(page, 'level10-phase-hurt');
  captures.push(await capture(page, 'level-10-phase-hurt.png', 'Level 10 hurt plus phase pulse'));

  await openBoss(page, 10);
  await stage(page, 'beam-hazard');
  captures.push(await capture(page, 'special-beam-hazard.png', 'Layered beam hazard'));

  const report = {
    ok: captures.length === 4 &&
      captures.every((item) => item.boss?.animation) &&
      pageErrors.length === 0 &&
      consoleWarningsOrErrors.length === 0,
    baseUrl,
    captures,
    pageErrors,
    consoleWarningsOrErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[boss-vfx-polish] PASS captures=${captures.length} outputDir=${outputDir}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
