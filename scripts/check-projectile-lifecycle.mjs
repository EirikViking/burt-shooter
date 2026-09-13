import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4684));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/projectile-lifecycle-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error('No projectile lifecycle check port available');
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error(`Projectile lifecycle server did not start at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

const managerSource = readFileSync('src/managers/BulletManager.js', 'utf8');
const playSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
assert(!/this\.playerBullets\s*=\s*this\.playerBullets\.filter/.test(managerSource),
  'player projectiles still allocate a replacement array every frame');
assert(!/this\.enemyBullets\s*=\s*this\.enemyBullets\.filter/.test(managerSource),
  'enemy projectiles still allocate a replacement array every frame');
for (const hook of [
  'compactBulletList',
  'deactivateBullet',
  'clearPlayerBullets',
  'clearEnemyBullets',
  'clearAll',
  'sweepOrphanVisuals',
  'getDebugState'
]) {
  assert(managerSource.includes(hook), `BulletManager lifecycle hook missing: ${hook}`);
}
assert(playSource.includes("this.bulletManager?.clearAll?.('scene_destroy')"),
  'PlayScene must dispose every projectile during scene teardown');

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
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
  await page.goto(`${baseUrl}?autostart=1&offlineLeaderboard=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return Boolean(play?.player && play?.bulletManager && play?.enemyManager?.enemies?.length);
  }, null, { timeout: 30000 });

  const setup = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.bulletManager;
    const player = play.player;
    const enemy = play.enemyManager.enemies.find((entry) => entry?.active !== false && entry?.kind === 'enemy');
    if (!enemy) throw new Error('No enemy available for projectile lifecycle setup');
    play.introActive = false;
    player.invulnerable = true;
    player.invulnerableTime = 60000;
    enemy.state = 'FORMATION';
    enemy.waitingForEntry = false;
    enemy.active = true;
    enemy.sprite.visible = true;
    enemy.x = game.getWidth() * 0.5;
    enemy.y = 160;
    enemy.sprite.position.set(enemy.x, enemy.y);
    manager.clearAll('projectile_lifecycle_setup');

    const makePlayerBullet = () => {
      player.shootCooldown = 0;
      const result = player.shoot();
      return Array.isArray(result) ? result[0] : result;
    };
    const makeEnemyBullet = () => {
      enemy.shootCooldown = 0;
      const result = enemy.shoot(player.x, player.y);
      return Array.isArray(result) ? result[0] : result;
    };
    window.__projectileLifecycleFactories = { makePlayerBullet, makeEnemyBullet };

    const playerBullet = makePlayerBullet();
    const enemyBullet = makeEnemyBullet();
    const playerAdded = manager.addPlayerBullet(playerBullet);
    const enemyAdded = manager.addEnemyBullet(enemyBullet);
    return {
      playerAdded,
      enemyAdded,
      playerLabel: playerBullet.sprite?.label,
      enemyLabel: enemyBullet.sprite?.label,
      debug: manager.getDebugState()
    };
  });

  assert.equal(setup.playerAdded, true);
  assert.equal(setup.enemyAdded, true);
  assert.equal(setup.playerLabel, 'player_projectile_visual');
  assert.equal(setup.enemyLabel, 'enemy_projectile_visual');
  assert.equal(setup.debug.managedVisuals, 2);

  const activeScreenshot = path.join(outputDir, 'projectile-lifecycle-active.png');
  await page.screenshot({ path: activeScreenshot, fullPage: true });

  const cases = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.bulletManager;
    const { makePlayerBullet, makeEnemyBullet } = window.__projectileLifecycleFactories;

    const inactiveBullet = manager.playerBullets[0];
    inactiveBullet.active = false;
    manager.update(1);
    const inactiveCompaction = {
      arrayCount: manager.playerBullets.length,
      visualDestroyed: Boolean(inactiveBullet.sprite?.destroyed),
      visualAttached: Boolean(inactiveBullet.sprite?.parent)
    };

    manager.clearAll('cap_setup');
    manager.maxPlayerBullets = 1;
    const accepted = makePlayerBullet();
    const rejected = makePlayerBullet();
    const acceptedResult = manager.addPlayerBullet(accepted);
    const rejectedResult = manager.addPlayerBullet(rejected);
    const capRejection = {
      acceptedResult,
      rejectedResult,
      arrayCount: manager.playerBullets.length,
      rejectedDestroyed: Boolean(rejected.sprite?.destroyed),
      rejectedAttached: Boolean(rejected.sprite?.parent)
    };
    manager.maxPlayerBullets = 200;
    manager.clearPlayerBullets('cap_complete');

    const pending = makeEnemyBullet();
    manager.updatingEnemyBullets = true;
    const pendingAccepted = manager.addEnemyBullet(pending);
    manager.updatingEnemyBullets = false;
    const pendingBefore = manager.pendingEnemyBullets.length;
    const pendingCleared = manager.clearEnemyBullets('pending_clear');
    const pendingCleanup = {
      pendingAccepted,
      pendingBefore,
      pendingCleared,
      pendingAfter: manager.pendingEnemyBullets.length,
      visualDestroyed: Boolean(pending.sprite?.destroyed)
    };

    const orphan = makePlayerBullet();
    manager.container.addChild(orphan.sprite);
    const orphanBefore = manager.container.children.filter((child) => child?.__novaManagedProjectile).length;
    const orphanRemoved = manager.sweepOrphanVisuals('test_orphan');
    const orphanCleanup = {
      orphanBefore,
      orphanRemoved,
      orphanDestroyed: Boolean(orphan.sprite?.destroyed),
      orphanAttached: Boolean(orphan.sprite?.parent)
    };

    const pausedBullet = makePlayerBullet();
    manager.addPlayerBullet(pausedBullet);
    play.setPaused(true);
    manager.deactivateBullet(pausedBullet, 'paused_collision_cleanup');
    const pausedImmediate = {
      paused: play.isPaused,
      arrayCountBeforePrune: manager.playerBullets.length,
      visualDestroyed: Boolean(pausedBullet.sprite?.destroyed),
      visualAttached: Boolean(pausedBullet.sprite?.parent)
    };
    manager.pruneInactiveBullets('player', 'paused_collision_prune');
    pausedImmediate.arrayCountAfterPrune = manager.playerBullets.length;
    play.setPaused(false);

    manager.addPlayerBullet(makePlayerBullet());
    manager.addEnemyBullet(makeEnemyBullet());
    window.__projectileLifecycleManager = manager;
    const beforeTransition = manager.getDebugState();
    game.switchScene('menu', { inputGuardMs: 0, menuExitGuardMs: 0 });
    const afterTransition = manager.getDebugState();

    return {
      inactiveCompaction,
      capRejection,
      pendingCleanup,
      orphanCleanup,
      pausedImmediate,
      beforeTransition,
      afterTransition
    };
  });

  const failures = [];
  if (cases.inactiveCompaction.arrayCount !== 0 || !cases.inactiveCompaction.visualDestroyed || cases.inactiveCompaction.visualAttached) {
    failures.push(`inactive compaction failed: ${JSON.stringify(cases.inactiveCompaction)}`);
  }
  if (!cases.capRejection.acceptedResult || cases.capRejection.rejectedResult !== false ||
      cases.capRejection.arrayCount !== 1 || !cases.capRejection.rejectedDestroyed || cases.capRejection.rejectedAttached) {
    failures.push(`cap rejection leaked a projectile: ${JSON.stringify(cases.capRejection)}`);
  }
  if (!cases.pendingCleanup.pendingAccepted || cases.pendingCleanup.pendingBefore !== 1 ||
      cases.pendingCleanup.pendingCleared !== 1 || cases.pendingCleanup.pendingAfter !== 0 ||
      !cases.pendingCleanup.visualDestroyed) {
    failures.push(`pending projectile cleanup failed: ${JSON.stringify(cases.pendingCleanup)}`);
  }
  if (cases.orphanCleanup.orphanRemoved !== 1 || !cases.orphanCleanup.orphanDestroyed || cases.orphanCleanup.orphanAttached) {
    failures.push(`orphan sweep failed: ${JSON.stringify(cases.orphanCleanup)}`);
  }
  if (!cases.pausedImmediate.paused || cases.pausedImmediate.arrayCountBeforePrune !== 1 ||
      !cases.pausedImmediate.visualDestroyed || cases.pausedImmediate.visualAttached ||
      cases.pausedImmediate.arrayCountAfterPrune !== 0) {
    failures.push(`paused-frame cleanup failed: ${JSON.stringify(cases.pausedImmediate)}`);
  }
  if (cases.beforeTransition.player !== 1 || cases.beforeTransition.enemy !== 1 ||
      cases.afterTransition.player !== 0 || cases.afterTransition.enemy !== 0 ||
      cases.afterTransition.pendingEnemy !== 0 || cases.afterTransition.managedVisuals !== 0 ||
      cases.afterTransition.lastCleanup?.reason !== 'scene_destroy') {
    failures.push(`scene teardown cleanup failed: ${JSON.stringify(cases.afterTransition)}`);
  }
  if (cases.afterTransition.inPlaceCompaction !== true || cases.afterTransition.rejectedAtCap < 1 ||
      cases.afterTransition.orphanVisualsRemoved < 1) {
    failures.push(`lifecycle diagnostics incomplete: ${JSON.stringify(cases.afterTransition)}`);
  }
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(' | ')}`);

  const report = {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    baseUrl,
    setup,
    cases,
    pageErrors,
    consoleErrors,
    failures,
    screenshot: activeScreenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[projectile-lifecycle] ${failures.join('; ')}`);
  console.log(`[projectile-lifecycle] PASS output=${outputDir}`);
} finally {
  await page.close({ runBeforeUnload: false }).catch(() => {});
  await browser.close();
  if (server) server.kill();
}
