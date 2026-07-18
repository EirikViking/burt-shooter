import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4339));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/graze-break-${timestamp()}`);

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
  await page.goto(withQuery(baseUrl, { autostart: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.player?.active && state.counts?.enemies > 0;
  }, { timeout: 30000 });

  const result = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const enemy = play?.enemyManager?.enemies?.find((candidate) => candidate?.active && typeof candidate.shoot === 'function');
    if (!play?.applyNearMiss || !play?.markGrazeBreakShot || !play?.checkCollisions || !player || !enemy) {
      return { ok: false, reason: 'missing_play_scene_player_or_enemy' };
    }

    player.x = game.getWidth() / 2;
    player.y = game.getHeight() * 0.78;
    player.invulnerable = true;
    player.invulnerableTime = 15000;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    play.bulletManager.playerBullets = [];
    play.bulletManager.enemyBullets = [];

    const impactX = player.x;
    const impactY = player.y - 170;
    for (let i = 0; i < 5; i += 1) {
      const shot = enemy.shoot(player.x, player.y);
      const bullets = Array.isArray(shot) ? shot : [shot];
      const bullet = bullets.find(Boolean);
      if (!bullet) continue;
      bullet.x = impactX + (i - 2) * 34;
      bullet.y = impactY + (i % 2) * 18;
      bullet.vx = 0;
      bullet.vy = 0.2;
      if (bullet.sprite) {
        bullet.sprite.x = bullet.x;
        bullet.sprite.y = bullet.y;
      }
      play.bulletManager.addEnemyBullet(bullet);
    }

    const beforeScore = game.score || 0;
    const fakeBullet = { x: player.x + player.radius + 9, y: player.y, radius: 5, active: true };
    for (let i = 0; i < 3; i += 1) {
      play.nearMissCooldownAt = 0;
      play.updateGrazeBreakFireIntent?.(true);
      play.applyNearMiss(fakeBullet);
      if (i < 2) await new Promise((resolve) => setTimeout(resolve, 80));
    }

    const armedState = JSON.parse(window.render_game_to_text());
    play.setPaused(true);
    const pausedBefore = JSON.parse(window.render_game_to_text());
    await new Promise((resolve) => setTimeout(resolve, 700));
    const pausedAfter = JSON.parse(window.render_game_to_text());
    play.setPaused(false);
    player.shootCooldown = 0;
    const heldBullets = player.shoot();
    const heldCharged = play.markGrazeBreakShot(heldBullets);
    const afterHeldState = JSON.parse(window.render_game_to_text());

    play.updateGrazeBreakFireIntent?.(false);
    const releaseState = JSON.parse(window.render_game_to_text());
    play.updateGrazeBreakFireIntent?.(true);
    player.shootCooldown = 0;
    const playerBullets = player.shoot();
    const charged = play.markGrazeBreakShot(playerBullets);
    for (const bullet of playerBullets) play.bulletManager.addPlayerBullet(bullet);
    if (charged) {
      charged.x = impactX;
      charged.y = impactY;
      charged.vx = 0;
      charged.vy = -0.2;
      if (charged.sprite) {
        charged.sprite.x = charged.x;
        charged.sprite.y = charged.y;
      }
    }

    play.checkCollisions();
    await new Promise((resolve) => setTimeout(resolve, 180));
    const finalState = JSON.parse(window.render_game_to_text());

    return {
      ok: true,
      beforeScore,
      afterScore: finalState.score,
      scoreGain: finalState.score - beforeScore,
      armedState: {
        dangerDodgeCount: armedState.scoring?.dangerDodgeCount || 0,
        grazeBreakReady: armedState.scoring?.grazeBreakReady || false,
        grazeBreakNeedsFireRelease: armedState.scoring?.grazeBreakNeedsFireRelease || false,
        grazeBreakReleasePrimed: armedState.scoring?.grazeBreakReleasePrimed || false
      },
      pausedTimer: {
        beforeMs: pausedBefore.scoring?.grazeBreakReadyMs || 0,
        afterMs: pausedAfter.scoring?.grazeBreakReadyMs || 0,
        remainedReady: pausedAfter.scoring?.grazeBreakReady || false
      },
      heldShotMarked: Boolean(heldCharged?.isGrazeBreaker),
      afterHeldState: {
        grazeBreakReady: afterHeldState.scoring?.grazeBreakReady || false,
        grazeBreakNeedsFireRelease: afterHeldState.scoring?.grazeBreakNeedsFireRelease || false
      },
      releaseState: {
        grazeBreakReady: releaseState.scoring?.grazeBreakReady || false,
        grazeBreakNeedsFireRelease: releaseState.scoring?.grazeBreakNeedsFireRelease || false,
        grazeBreakReleasePrimed: releaseState.scoring?.grazeBreakReleasePrimed || false
      },
      chargedBulletMarked: Boolean(charged?.isGrazeBreaker),
      remainingEnemyBullets: finalState.counts?.enemyBullets || 0,
      lastGrazeBreak: finalState.scoring?.lastGrazeBreak || null,
      activeToastMessages: (finalState.toast?.active || []).map((toast) => toast.message),
      lastSfxEvent: finalState.audio?.lastSfxEvent || null
    };
  });

  await page.waitForTimeout(350);
  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'graze-break.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const last = result.lastGrazeBreak || {};
  const report = {
    ok: Boolean(
      result.ok &&
      result.armedState?.dangerDodgeCount >= 3 &&
      result.armedState?.grazeBreakReady === true &&
      result.armedState?.grazeBreakNeedsFireRelease === true &&
      result.pausedTimer?.remainedReady === true &&
      Math.abs((result.pausedTimer?.afterMs || 0) - (result.pausedTimer?.beforeMs || 0)) <= 40 &&
      result.heldShotMarked === false &&
      result.afterHeldState?.grazeBreakReady === true &&
      result.afterHeldState?.grazeBreakNeedsFireRelease === true &&
      result.releaseState?.grazeBreakReleasePrimed === true &&
      result.chargedBulletMarked === true &&
      last.triggered === true &&
      last.bulletsCleared >= 3 &&
      last.bonusScore >= 775 &&
      last.visualScale >= 2.8 &&
      last.visualSparkleCount >= 14 &&
      last.visualRingCount >= 3 &&
      last.visual?.active === true &&
      result.scoreGain > 0 &&
      result.remainingEnemyBullets <= 2 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    result,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[graze-break] PASS bullets=${last.bulletsCleared} gain=${result.scoreGain} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
