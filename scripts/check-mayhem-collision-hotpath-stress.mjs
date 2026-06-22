import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4398));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/mayhem-collision-hotpath-stress-${timestamp()}`);

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
  for (let candidate = startPort; candidate < startPort + 50; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available collision hotpath stress port found starting at ${startPort}`);
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
  throw new Error(`Vite dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function startMayhem(page) {
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.evaluate(async () => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      version: 1,
      pilotRank: 6,
      pilotXp: 42100,
      bestScore: 65432,
      bestRank: 6,
      bestLevel: 9,
      bestSector: 9,
      totalRuns: 8,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_02'],
      updatedAt: new Date().toISOString()
    }));
    await window.__game.startGame(undefined, { runMode: 'ranked' });
  });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.hud, null, { timeout: 30000 });
}

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const result = {};

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/highscores', async (route) => {
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' });
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await startMayhem(page);

  const stress = await page.evaluate(async () => {
    const play = window.__game?.scenes?.play;
    if (!play) throw new Error('PlayScene unavailable');
    const originalSetItem = Storage.prototype.setItem;
    let storageWritesDuringCollision = 0;
    const storageWriteKeys = [];
    Storage.prototype.setItem = function patchedSetItem(...args) {
      if (window.__novaCollisionHotpathStressActive) {
        storageWritesDuringCollision += 1;
        storageWriteKeys.push(String(args[0] || 'unknown'));
      }
      return originalSetItem.apply(this, args);
    };

    const originalRandom = Math.random;
    Math.random = () => 0.42;

    try {
      play.game?.app?.ticker?.stop?.();
      play.performanceDiagnostics?.setOptions?.({ enabled: true });
      play.performanceDiagnostics?.reset?.();
      play.game.level = 3;
      play.game.runMode = 'ranked';
      play.game.score = 0;
      play.player = {
        ...(play.player || {}),
        x: 800,
        y: 760,
        radius: 14,
        active: true,
        invulnerable: false,
        isSlowTimeActive: () => false,
        isPowerupSuppressed: () => false
      };

      const enemies = Array.from({ length: 50 }, (_, index) => {
        const x = 160 + (index % 10) * 112;
        const y = 130 + Math.floor(index / 10) * 74;
        return {
          id: `stress_enemy_${index}`,
          type: `stress_enemy_${index}`,
          kind: 'enemy',
          active: true,
          x,
          y,
          radius: 16,
          health: 1,
          scoreValue: 100,
          color: 0xffaa00,
          generatedProfile: { displayName: `Stress Enemy ${index}`, role: 'stress' },
          takeDamage(damage) {
            this.health -= Math.max(1, Number(damage) || 1);
            if (this.health <= 0) {
              this.active = false;
              return true;
            }
            return false;
          }
        };
      });

      const bullets = Array.from({ length: 100 }, (_, index) => {
        const enemy = enemies[index % enemies.length];
        return {
          active: true,
          x: enemy.x,
          y: enemy.y,
          radius: 5,
          damage: 2,
          piercing: false,
          isBomb: false
        };
      });

      play.enemyManager.enemies = enemies;
      play.enemyManager.hijacker = null;
      play.bulletManager.playerBullets = bullets;
      play.bulletManager.enemyBullets = [];
      play.powerupManager.powerups = [];
      play.ambientBonusDrones = [];
      play.bossHazards = [];
      play.triggerChainLightning = () => {};
      play.applyShipTraitBulletImpact = () => {};
      play.powerupManager.spawn = () => {};

      const beforeScore = play.game.score;
      window.__novaCollisionHotpathStressActive = true;
      play.performanceDiagnostics.beginFrame(1, play);
      const startedAt = performance.now();
      play.checkCollisions();
      const collisionMs = performance.now() - startedAt;
      const collisionStats = JSON.parse(JSON.stringify(play.collisionDiagnosticStats || {}));
      play.performanceDiagnostics.endFrame(play);
      window.__novaCollisionHotpathStressActive = false;

      const report = play.performanceDiagnostics.getReport();
      const byLabel = Object.fromEntries(report.topSections.map((section) => [section.label, section]));
      const scorePopupsActive = play.scorePopupManager?.popups?.length || 0;
      play.scorePopupManager?.cleanup?.();

      play.enemyManager.enemies = [];
      play.enemyManager.hijacker = null;
      play.bulletManager.enemyBullets = [];
      play.powerupManager.powerups = [];
      play.bossHazards = [];
      const bonusDrone = {
        id: 'bonus_drone_reward_probe',
        type: 'HAZARD',
        kind: 'bonus_drone',
        active: true,
        x: 500,
        y: 240,
        radius: 22,
        health: 1,
        scoreValue: 0,
        generatedProfile: { displayName: 'Bonus Drone Reward Probe', role: 'bonus' },
        takeDamage(damage) {
          this.health -= Math.max(1, Number(damage) || 1);
          if (this.health <= 0) {
            this.active = false;
            return true;
          }
          return false;
        },
        destroy() {
          this.destroyed = true;
        }
      };
      play.ambientBonusDrones = [bonusDrone];
      play.bulletManager.playerBullets = [{
        active: true,
        x: bonusDrone.x,
        y: bonusDrone.y,
        radius: 5,
        damage: 2,
        piercing: false,
        isBomb: false
      }];
      const beforeBonusScore = play.game.score;
      const nominalBonusAward = play.getComboScore(500);
      const expectedBonusAward = play.game.getScoreAward?.(nominalBonusAward) || nominalBonusAward;
      window.__novaCollisionHotpathStressActive = true;
      play.checkCollisions();
      window.__novaCollisionHotpathStressActive = false;
      const bonusPopupTexts = (play.scorePopupManager?.popups || [])
        .map((popup) => String(popup?.sprite?.text || ''))
        .filter(Boolean);
      const bonusDroneFeedback = {
        beforeScore: beforeBonusScore,
        afterScore: play.game.score,
        expectedAward: expectedBonusAward,
        popupTexts: bonusPopupTexts,
        storageWritesDuringCollision,
        active: bonusDrone.active
      };

      return {
        collisionMs,
        beforeScore,
        afterScore: play.game.score,
        sections: byLabel,
        collisionStats,
        storageWritesDuringCollision,
        storageWriteKeys: [...new Set(storageWriteKeys)].slice(0, 20),
        scorePopupsActive,
        bonusDroneFeedback,
        deferredThreatDefeats: play.deferredThreatDefeats?.length || 0,
        deferredThreatDefeatStats: play.deferredThreatDefeatStats
      };
    } finally {
      window.__novaCollisionHotpathStressActive = false;
      Storage.prototype.setItem = originalSetItem;
      Math.random = originalRandom;
    }
  });

  result.stress = stress;
  assert.equal(stress.storageWritesDuringCollision, 0, 'collision hot path must not write localStorage');
  assert.ok(stress.collisionStats.playerBulletEnemyHitEvents >= 20, 'stress should create many simultaneous hit events');
  assert.ok(stress.collisionStats.playerBulletEnemyKills >= 20, 'stress should create many simultaneous kills');
  assert.ok(stress.afterScore > stress.beforeScore, 'stress kills should still award score');
  assert.ok(stress.deferredThreatDefeats >= 20, 'enemy defeat progression should be deferred');
  assert.ok((stress.sections['collision.progression_hooks.enemy_killed']?.avgMs || 0) < 0.5, 'enemy_killed hook average should be below 0.5ms');
  assert.ok((stress.sections['collision.progression_hooks.enemy_killed']?.maxMs || 0) < 1.5, 'enemy_killed hook max should stay within browser-timer margin');
  assert.ok((stress.sections['collision.player_bullets_enemies']?.maxMs || 0) < 10, 'player_bullets_enemies should stay below 10ms');
  assert.ok((stress.sections['collision.player_bullets_enemies.hit_test']?.maxMs || 0) < 4, 'hit_test should stay below 4ms');
  assert.ok((stress.sections['collision.side_effects.total']?.maxMs || 0) < 8, 'side effects should remain low under massive kill bursts');
  assert.ok(stress.scorePopupsActive <= 3, 'score popup text creation should be capped during collision flush');
  assert.equal(
    stress.bonusDroneFeedback.afterScore - stress.bonusDroneFeedback.beforeScore,
    stress.bonusDroneFeedback.expectedAward,
    'bonus drone reward feedback must not change the score award amount'
  );
  assert.ok(
    stress.bonusDroneFeedback.popupTexts.some((text) => /^BONUS \+\d+/.test(text)),
    `bonus drone reward should create a clear bonus payout popup, got ${stress.bonusDroneFeedback.popupTexts.join(', ')}`
  );
  assert.equal(stress.bonusDroneFeedback.active, false, 'bonus drone should be destroyed by the reward probe');
  assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join('; ')}`);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: true, baseUrl, result }, null, 2)}\n`);
  console.log(`[mayhem-collision-hotpath-stress] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ ok: false, baseUrl, error: error.message, result }, null, 2)}\n`);
  console.error(`[mayhem-collision-hotpath-stress] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
