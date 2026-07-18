import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4712));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/special-enemy-presence-${timestamp()}`);

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
  throw new Error('No special-enemy presence check port available');
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
  throw new Error(`Special-enemy presence server did not start at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

const enemySource = readFileSync('src/entities/Enemy.js', 'utf8');
const managerSource = readFileSync('src/managers/EnemyManager.js', 'utf8');
const playSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
assert(enemySource.includes('arrivalGuardDamageMultiplier = this.isEliteMiddleShip ? 0.4 : 1'),
  'elite arrival resistance must be bounded and non-zero');
assert(enemySource.includes("this.state === 'ENTRY' || Date.now() < (this.arrivalCombatReadyAt || 0)"),
  'elite firing must wait through entry and the readable post-entry beat');
assert(enemySource.includes('arrivalGuardArcCount') && enemySource.includes('arrivalGuardPipCount'),
  'elite arrival resistance needs a visible threat-frame treatment');
assert(managerSource.includes("title: translateText('ELITE ARRIVAL')"),
  'elite arrival should use the compact special-enemy briefing');
assert(playSource.includes('specialEnemySignal: true') && playSource.includes("presentation: 'edge_signal'"),
  'special-enemy notices must use edge briefings rather than center-screen dread cards');

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
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.player), null, { timeout: 30000 });

  const eliteSetup = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.clearToastState?.();
    play.player.invulnerable = true;
    play.player.invulnerableTime = 60000;
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    const enemy = manager.spawnEliteMiddleShip('nova_elite_tractor_puller', {
      marketingDebug: true,
      ignoreCaps: true,
      ignoreLevelGate: true,
      targetX: game.getWidth() * 0.55,
      targetY: 230,
      delayMs: 0,
      entryDurationMs: 1600,
      specialDelayMs: 200
    });
    if (!enemy) throw new Error('Elite spawn failed');
    enemy.entryCurve.startTime = Date.now() - enemy.entryCurve.duration * 0.58;
    enemy.update(1, play.player.x, play.player.y);
    enemy.updateThreatFrame(Date.now());
    enemy.shootCooldown = 0;
    const healthBefore = enemy.health;
    const canShootDuringEntry = enemy.canShoot();
    const killed = enemy.takeDamage(5);
    const healthAfter = enemy.health;
    window.__specialPresenceElite = enemy;
    return {
      killed,
      healthBefore,
      healthAfter,
      appliedDamage: healthBefore - healthAfter,
      canShootDuringEntry,
      profile: structuredClone(enemy.getEliteDebugState()),
      threatFrame: structuredClone(enemy.threatFrameLayer?._debugThreatFrame || null)
    };
  });

  await page.waitForTimeout(260);
  const eliteToast = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return structuredClone(play.getToastDebugState().active.find((entry) => entry.type === 'elite_middle_ship') || null);
  });
  const eliteScreenshot = path.join(outputDir, 'elite-arrival-guard-edge-signal.png');
  await page.screenshot({ path: eliteScreenshot, fullPage: true });

  const eliteRelease = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const enemy = window.__specialPresenceElite;
    enemy.entryCurve.startTime = Date.now() - enemy.entryCurve.duration - 10;
    enemy.update(1, play.player.x, play.player.y);
    enemy.shootCooldown = 0;
    const justCompleted = {
      state: enemy.state,
      canShoot: enemy.canShoot(),
      profile: structuredClone(enemy.getEliteDebugState())
    };
    enemy.arrivalCombatReadyAt = Date.now() - 1;
    enemy.eliteAbility.nextAt = Math.max(enemy.eliteAbility.nextAt, Date.now() + 1);
    const ready = {
      canShoot: enemy.canShoot(),
      profile: structuredClone(enemy.getEliteDebugState())
    };
    return { justCompleted, ready };
  });

  const rareSetup = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState?.();
    for (const enemy of play.enemyManager.enemies) {
      if (enemy?.isRareChaosVisitor) enemy.active = false;
    }
    play.enemyManager.enemies = play.enemyManager.enemies.filter((enemy) => !enemy?.isRareChaosVisitor);
    play.enemyManager.rareChaosVisitorSpawnedWaveKeys.clear();
    play.enemyManager.phase = 'WAVES';
    play.enemyManager.state = 'WAVE_ACTIVE';
    const profile = play.enemyManager.debugForceRareChaosVisitor(1, 'presence_check');
    return {
      profile,
      announcement: structuredClone(play.lastRareChaosVisitorAnnouncement),
      special: structuredClone(play.lastSpecialEnemySignal)
    };
  });
  await page.waitForTimeout(240);
  const rareToast = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return structuredClone(play.getToastDebugState().active.find((entry) => entry.type === 'rareChaosVisitor') || null);
  });
  const rareScreenshot = path.join(outputDir, 'rare-contact-edge-signal.png');
  await page.screenshot({ path: rareScreenshot, fullPage: true });

  await page.setViewportSize({ width: 640, height: 720 });
  await page.waitForFunction(() => window.__game?.getWidth?.() <= 640, null, { timeout: 4000 });
  const compactSetup = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.bulletManager;
    const enemy = window.__specialPresenceElite
      || play.enemyManager.enemies.find((entry) => entry?.active !== false);
    play.clearToastState?.();
    for (const child of [...(play.uiOverlay?.children || [])]) {
      if (child?.label !== 'rare_contact_dread_wash') continue;
      child.parent?.removeChild?.(child);
      child.destroy?.();
    }
    manager.clearAll('special_presence_compact_setup');
    play.player.invulnerable = true;
    play.player.invulnerableTime = 60000;
    if (!enemy) throw new Error('No enemy available for compact projectile-density setup');
    enemy.active = true;
    enemy.waitingForEntry = false;
    enemy.state = 'FORMATION';
    enemy.arrivalCombatReadyAt = 0;
    enemy.x = game.getWidth() * 0.5;
    enemy.y = 118;
    enemy.sprite.position.set(enemy.x, enemy.y);
    let bulletsAdded = 0;
    for (let index = 0; index < 22; index += 1) {
      enemy.shootCooldown = 0;
      const targetX = play.player.x + (index - 11) * 18;
      const targetY = play.player.y - (index % 4) * 28;
      const fired = enemy.shoot(targetX, targetY);
      const bullets = Array.isArray(fired) ? fired : [fired];
      for (const bullet of bullets) {
        if (bullet && manager.addEnemyBullet(bullet)) bulletsAdded += 1;
      }
    }
    play.showSpecialEnemySignal({
      title: 'ELITE ARRIVAL',
      message: 'Grav Hook Interceptor\nARRIVAL GUARD ACTIVE',
      type: 'special_enemy_compact_density',
      priority: 10,
      duration: 1700,
      accent: 0xff5bd6
    });
    return {
      width: game.getWidth(),
      height: game.getHeight(),
      bulletsAdded,
      lifecycle: structuredClone(manager.getDebugState())
    };
  });
  await page.waitForTimeout(220);
  const compactToast = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return structuredClone(play.getToastDebugState().active.find(
      (entry) => entry.type === 'special_enemy_compact_density'
    ) || null);
  });
  const compactScreenshot = path.join(outputDir, 'elite-edge-signal-dense-640x720.png');
  await page.screenshot({ path: compactScreenshot, fullPage: true });

  const failures = [];
  if (eliteSetup.killed || Math.abs(eliteSetup.appliedDamage - 2) > 0.01 ||
      eliteSetup.canShootDuringEntry || eliteSetup.profile?.arrivalGuardDamageMultiplier !== 0.4 ||
      !eliteSetup.profile?.arrivalGuardVisible || eliteSetup.profile?.arrivalGuardArcCount < 4 ||
      eliteSetup.profile?.arrivalGuardPipCount < 8) {
    failures.push(`elite arrival guard mismatch: ${JSON.stringify(eliteSetup)}`);
  }
  if (eliteToast?.type !== 'elite_middle_ship' || eliteToast.edgeAligned !== true ||
      eliteToast.placement !== 'left-edge' || eliteToast.specialSignal?.avatarVisible ||
      !/GUARD ACTIVE/i.test(eliteToast.message || '') || !eliteToast.bounds ||
      eliteToast.bounds.x > 32 || eliteToast.bounds.x + eliteToast.bounds.width > 1280) {
    failures.push(`elite edge briefing mismatch: ${JSON.stringify(eliteToast)}`);
  }
  if (eliteRelease.justCompleted.state !== 'FORMATION' || eliteRelease.justCompleted.canShoot ||
      (eliteRelease.justCompleted.profile?.combatReadyRemainingMs || 0) < 700 ||
      !eliteRelease.ready.canShoot || eliteRelease.ready.profile?.arrivalGuardActive) {
    failures.push(`elite readable first-action delay mismatch: ${JSON.stringify(eliteRelease)}`);
  }
  if (!rareSetup.profile?.id || rareSetup.announcement?.presentation !== 'edge_signal' ||
      rareToast?.type !== 'rareChaosVisitor' || rareToast.edgeAligned !== true ||
      rareToast.placement !== 'left-edge' || rareToast.specialSignal?.avatarVisible ||
      !/THREE PHASES/i.test(rareToast.message || '') || !rareToast.bounds ||
      rareToast.bounds.x > 32 || rareToast.bounds.x + rareToast.bounds.width > 1280) {
    failures.push(`rare contact edge briefing mismatch: ${JSON.stringify({ rareSetup, rareToast })}`);
  }
  if (compactSetup.width > 640 || compactSetup.height > 720 || compactSetup.bulletsAdded < 18 ||
      compactToast?.edgeAligned !== true || compactToast?.placement !== 'left-edge' ||
      compactToast?.specialSignal?.align !== 'left' || compactToast?.specialSignal?.avatarVisible ||
      !compactToast?.bounds || compactToast.bounds.x > 24 ||
      compactToast.bounds.x + compactToast.bounds.width > 640 ||
      compactToast.bounds.y < 215 || compactToast.bounds.y + compactToast.bounds.height > 720) {
    failures.push(`compact dense-combat edge briefing mismatch: ${JSON.stringify({ compactSetup, compactToast })}`);
  }
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(' | ')}`);

  const report = {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    baseUrl,
    elite: {
      setup: eliteSetup,
      toast: eliteToast,
      release: eliteRelease,
      screenshot: eliteScreenshot
    },
    rare: {
      setup: rareSetup,
      toast: rareToast,
      screenshot: rareScreenshot
    },
    compactDenseCombat: {
      setup: compactSetup,
      toast: compactToast,
      screenshot: compactScreenshot
    },
    pageErrors,
    consoleErrors,
    failures
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[special-enemy-presence] ${failures.join('; ')}`);
  console.log(`[special-enemy-presence] PASS output=${outputDir}`);
} finally {
  await page.close({ runBeforeUnload: false }).catch(() => {});
  await browser.close();
  if (server) server.kill();
}
