import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4728));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/bomb-usability-${timestamp()}`);

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
  throw new Error(`No available Bomb usability port found starting at ${startPort}`);
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
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(
    () => window.__game?.scenes?.play?.bulletManager && window.__game?.scenes?.play?.player,
    null,
    { timeout: 30000 }
  );
  await page.waitForTimeout(500);

  const setup = await page.evaluate(async () => {
    const { Bullet } = await import('/src/entities/Bullet.js');
    const { Hijacker } = await import('/src/entities/Hijacker.js');
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const manager = play?.enemyManager;
    const bullets = play?.bulletManager;
    if (!game || !play || !player || !manager || !bullets) {
      return { ok: false, reason: 'missing game/play/player/enemy/bullet surface' };
    }

    const cleanupBullets = () => {
      for (const bullet of [...(bullets.playerBullets || []), ...(bullets.enemyBullets || [])]) {
        bullets.deactivateBullet?.(bullet, 'bomb_usability_reset');
      }
      bullets.playerBullets = [];
      bullets.enemyBullets = [];
    };
    const preparePlayer = (x, y, enemyState = 'WAVE_ACTIVE') => {
      player.active = true;
      player.x = x;
      player.y = y;
      player.sprite.x = x;
      player.sprite.y = y;
      player.shootCooldown = 0;
      player.bombShotsLeft = 1;
      player.bombMaxShots = 3;
      player.bombArmedAt = player.getGameplayClockMs() - 1;
      player.bombTriggerQueued = false;
      manager.state = enemyState;
    };
    const launchBomb = () => {
      const queued = player.queueBombTriggerIntent(player.getGameplayClockMs());
      player.shootCooldown = 0;
      const volley = player.shoot();
      const bomb = volley.find((candidate) => candidate?.isBomb);
      if (bomb) bullets.addPlayerBullet(bomb);
      return { queued, volley, bomb };
    };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    play.isGameplayClockAdvancing = () => true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    cleanupBullets();
    manager.enemies = [];
    if (manager.hijacker?.sprite?.parent) manager.hijacker.sprite.parent.removeChild(manager.hijacker.sprite);
    manager.hijacker = null;

    const width = game.getWidth();
    const height = game.getHeight();
    preparePlayer(width * 0.5, height * 0.84, 'WAVE_BRIEFING');
    const genericBriefing = player.getBombCommitState(player.getGameplayClockMs());

    preparePlayer(width * 0.5, height * 0.38);
    const highTarget = {
      active: true,
      destroyed: false,
      kind: 'enemy',
      x: player.x,
      y: Math.max(64, player.y - 150),
      radius: 24,
      health: 999,
      takeDamage(amount) {
        this.health -= amount;
        return false;
      }
    };
    manager.enemies = [highTarget];
    const highLaunch = launchBomb();
    const highBefore = {
      queued: highLaunch.queued,
      bombCreated: Boolean(highLaunch.bomb),
      bombY: highLaunch.bomb?.y ?? null,
      playerY: player.y,
      targetY: highTarget.y,
      detonationLineY: height * 0.45
    };
    play.checkCollisions();
    const highAfter = {
      active: highLaunch.bomb?.active ?? false,
      bombDetonated: Boolean(highLaunch.bomb?.bombDetonated),
      health: highTarget.health
    };

    cleanupBullets();
    manager.enemies = [];
    preparePlayer(width * 0.5, height * 0.84, 'BOSS_ACTIVE');
    const openingBoss = {
      active: true,
      destroyed: false,
      kind: 'boss',
      x: player.x,
      y: 150,
      radius: 42,
      health: 999,
      invulnerable: true,
      sprite: { visible: true, renderable: true, alpha: 1 }
    };
    manager.boss = openingBoss;
    const bossOpeningQueued = player.queueBombTriggerIntent(player.getGameplayClockMs());
    player.shootCooldown = 0;
    const openingVolley = player.shoot();
    const openingBomb = openingVolley.find((candidate) => candidate?.isBomb);
    openingVolley.forEach((candidate) => candidate?.destroy?.());
    const bufferSurvivedOpening = player.bombTriggerQueued;
    openingBoss.invulnerable = false;
    player.shootCooldown = 0;
    const vulnerableVolley = player.shoot();
    const vulnerableBomb = vulnerableVolley.find((candidate) => candidate?.isBomb);
    vulnerableVolley.forEach((candidate) => candidate?.destroy?.());
    const bossOpening = {
      queued: bossOpeningQueued,
      openingBombCreated: Boolean(openingBomb),
      bufferSurvivedOpening,
      vulnerabilityBombCreated: Boolean(vulnerableBomb),
      targetKind: vulnerableBomb?.bombTarget?.kind || null,
      bufferConsumed: !player.bombTriggerQueued
    };
    manager.boss = null;

    cleanupBullets();
    manager.enemies = [];
    preparePlayer(width * 0.5, height * 0.84, 'WAVE_BRIEFING');
    const hijacker = new Hijacker(player.x + 92, 150, Math.max(1, Number(game.level) || 1), game);
    hijacker.baseY = hijacker.y;
    hijacker.vx = 1.5;
    manager.hijacker = hijacker;
    manager.container.addChild(hijacker.sprite);
    await new Promise((resolve) => setTimeout(resolve, 250));

    const tractorLaunch = launchBomb();
    const tractorBomb = tractorLaunch.bomb;
    const hostile = tractorBomb
      ? new Bullet(tractorBomb.x, tractorBomb.y, 0, -1, 1, 0xff4455, false, { radius: 8 })
      : null;
    if (hostile) bullets.addEnemyBullet(hostile);
    player.active = false;
    play.checkCollisions();
    const projectileCrossing = {
      hostileActive: hostile?.active ?? false,
      bombActive: tractorBomb?.active ?? false,
      bombDetonated: Boolean(tractorBomb?.bombDetonated)
    };
    if (hostile) bullets.deactivateBullet?.(hostile, 'bomb_usability_projectile_crossing_complete');
    bullets.enemyBullets = [];
    player.active = true;

    if (tractorBomb) {
      hijacker.health = Math.max(1, tractorBomb.damage);
      hijacker.maxHealth = hijacker.health;
      hijacker.updateHealthBar?.();
    }
    window.__bombUsability = {
      game,
      play,
      player,
      manager,
      bullets,
      hijacker,
      bomb: tractorBomb,
      direction: 1,
      minX: width * 0.25,
      maxX: width * 0.75,
      frame: 0
    };
    return {
      ok: true,
      genericBriefing: {
        ready: genericBriefing.ready,
        reason: genericBriefing.reason
      },
      highBefore,
      highAfter,
      bossOpening,
      tractor: {
        queued: tractorLaunch.queued,
        bombCreated: Boolean(tractorBomb),
        commitReason: tractorBomb?.commitReason || player.lastBombTriggerIntent?.reason || null,
        targetKind: tractorBomb?.bombTarget?.kind || null,
        playerY: player.y,
        targetY: hijacker.y
      },
      projectileCrossing
    };
  });

  const midflight = await page.evaluate(() => {
    const audit = window.__bombUsability;
    if (!audit?.bomb) return { ok: false, reason: 'tractor Bomb was not created' };
    for (let step = 0; step < 55 && audit.bomb.active; step += 1) {
      audit.hijacker.x += 1.5 * audit.direction;
      if (audit.hijacker.x >= audit.maxX || audit.hijacker.x <= audit.minX) audit.direction *= -1;
      audit.hijacker.sprite.x = audit.hijacker.x;
      audit.bomb.update(1);
      audit.play.checkCollisions();
      audit.frame += 1;
    }
    return {
      ok: true,
      frame: audit.frame,
      bomb: {
        active: audit.bomb.active,
        x: audit.bomb.x,
        y: audit.bomb.y,
        vx: audit.bomb.vx,
        vy: audit.bomb.vy,
        targetKind: audit.bomb.bombTarget?.kind || null
      },
      hijacker: {
        active: audit.hijacker.active,
        x: audit.hijacker.x,
        y: audit.hijacker.y,
        health: audit.hijacker.health
      }
    };
  });

  await page.waitForTimeout(120);
  const screenshot = path.join(outputDir, 'bomb-guidance-midflight.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const outcome = await page.evaluate(() => {
    const audit = window.__bombUsability;
    if (!audit?.bomb) return { ok: false, reason: 'tractor Bomb was not created' };
    for (let step = 0; step < 220 && audit.bomb.active; step += 1) {
      audit.hijacker.x += 1.5 * audit.direction;
      if (audit.hijacker.x >= audit.maxX || audit.hijacker.x <= audit.minX) audit.direction *= -1;
      audit.hijacker.sprite.x = audit.hijacker.x;
      audit.bomb.update(1);
      audit.play.checkCollisions();
      audit.frame += 1;
    }
    return {
      frame: audit.frame,
      bombActive: audit.bomb.active,
      bombDetonated: Boolean(audit.bomb.bombDetonated),
      bombX: audit.bomb.x,
      bombY: audit.bomb.y,
      hijackerActive: audit.hijacker.active,
      hijackerHealth: audit.hijacker.health,
      targetKind: audit.bomb.bombTarget?.kind || null
    };
  });

  const failures = [];
  if (!setup.ok) failures.push(setup.reason || 'setup failed');
  if (setup.genericBriefing?.ready || setup.genericBriefing?.reason !== 'combat_unavailable') {
    failures.push(`generic wave briefing incorrectly allowed a Bomb: ${JSON.stringify(setup.genericBriefing)}`);
  }
  if (!setup.highBefore?.queued || !setup.highBefore?.bombCreated) {
    failures.push(`high-screen valid target did not launch a Bomb: ${JSON.stringify(setup.highBefore)}`);
  }
  if (!setup.highAfter?.active || setup.highAfter?.bombDetonated) {
    failures.push(`high-screen Bomb detonated beside the player before reaching its target: ${JSON.stringify({
      before: setup.highBefore,
      after: setup.highAfter
    })}`);
  }
  if (!setup.tractor?.queued || !setup.tractor?.bombCreated || setup.tractor?.targetKind !== 'hijacker') {
    failures.push(`Tractor/Hijacker was not a valid Bomb lock: ${JSON.stringify(setup.tractor)}`);
  }
  if (
    !setup.bossOpening?.queued
    || setup.bossOpening?.openingBombCreated
    || !setup.bossOpening?.bufferSurvivedOpening
    || !setup.bossOpening?.vulnerabilityBombCreated
    || setup.bossOpening?.targetKind !== 'boss'
    || !setup.bossOpening?.bufferConsumed
  ) {
    failures.push(`boss-opening Bomb press was not buffered exactly until vulnerability: ${JSON.stringify(setup.bossOpening)}`);
  }
  if (!setup.projectileCrossing?.hostileActive || !setup.projectileCrossing?.bombActive || setup.projectileCrossing?.bombDetonated) {
    failures.push(`hostile projectile incorrectly collided with or detonated the Bomb: ${JSON.stringify(setup.projectileCrossing)}`);
  }
  if (
    !midflight.ok
    || !midflight.bomb?.active
    || !(midflight.bomb?.y < setup.tractor?.playerY && midflight.bomb?.y > setup.tractor?.targetY)
  ) {
    failures.push(`guided Bomb did not remain in flight toward the moving Tractor: ${JSON.stringify(midflight)}`);
  }
  if (!outcome.bombDetonated || outcome.bombActive || outcome.hijackerHealth > 0) {
    failures.push(`guided Bomb did not reach and damage the moving Tractor: ${JSON.stringify(outcome)}`);
  }
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    setup,
    midflight,
    outcome,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[bomb-usability] ${failures.join('; ')}`);
  console.log(`[bomb-usability] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
