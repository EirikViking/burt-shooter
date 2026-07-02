import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4363));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/powerup-effects-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const powerupTypes = [
  'triple_beam',
  'vector_boost',
  'blink_drive',
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

async function startTestServer() {
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
  throw new Error(`Vite test server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function overlap(a, b, margin = 8) {
  if (!a || !b) return false;
  return !(
    a.x + a.width + margin <= b.x ||
    b.x + b.width + margin <= a.x ||
    a.y + a.height + margin <= b.y ||
    b.y + b.height + margin <= a.y
  );
}

function assertNoMessageOverlap(state, label) {
  const surfaces = [
    ...(state.toast?.active || []),
    state.toast?.comboDisplay,
    ...(state.toast?.scorePopups || [])
  ].filter(item => item?.bounds);
  for (let i = 0; i < surfaces.length; i += 1) {
    for (let j = i + 1; j < surfaces.length; j += 1) {
      if (overlap(surfaces[i].bounds, surfaces[j].bounds)) {
        throw new Error(`${label}: gameplay message overlap ${JSON.stringify({ a: surfaces[i], b: surfaces[j] }, null, 2)}`);
      }
    }
  }
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;

try {
  server = await startTestServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleEvents = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 700) });
    }
  });

  await page.goto(`${baseUrl}/?autostart=1&debugBossToken=NOVA_DEBUG_2026&debugPowerups=0&nova-devtools-hash=${LOCAL_DEVTOOLS_HASH}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.powerupManager && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  const runtimeReport = await page.evaluate(async (types) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const manager = play?.powerupManager;
    if (!game || !play || !player || !manager) throw new Error('Missing play scene powerup test objects');

    const assert = (condition, message, extra = null) => {
      if (!condition) throw new Error(`${message}${extra ? ` ${JSON.stringify(extra)}` : ''}`);
    };
    const renderState = () => JSON.parse(window.render_game_to_text?.() || '{}');
    const getDistance = (a, b) => Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
    const activeStates = () => player.getActivePowerupStates?.() || [];
    const hasState = (type) => activeStates().some((entry) => entry.type === type);
    const activePlayerBullets = () => play.bulletManager?.playerBullets?.filter(bullet => bullet?.active !== false) || [];
    const activeEnemyBullets = () => play.bulletManager?.enemyBullets?.filter(bullet => bullet?.active !== false) || [];
    const configuredMaxLives = Number(game.balanceConfig?.survival?.maxLives);
    const maxLives = Number.isFinite(configuredMaxLives) ? Math.max(1, configuredMaxLives) : null;

    const clearSprites = (items) => {
      for (const item of items || []) {
        if (item?.sprite?.parent) item.sprite.parent.removeChild(item.sprite);
      }
    };
    const resetScene = () => {
      play.introActive = false;
      play.introComplete = true;
      play.debugInvincible = true;
      play.freezeTimerMs = 0;
      play.scoreMultiplier = 1;
      play.orbitalStrikeTimer = 0;
      game.scoreMultiplier = 1;
      player.resetPowerups?.();
      player.scoreMultiplier = 1;
      player.scoreBoostExpiresAt = 0;
      player.shootCooldown = 0;
      player.invulnerable = true;
      player.invulnerableTime = 600000;
      player.x = game.getWidth() * 0.5;
      player.y = game.getHeight() - 100;
      if (player.sprite) {
        player.sprite.x = player.x;
        player.sprite.y = player.y;
        player.sprite.visible = true;
        player.sprite.renderable = true;
        player.sprite.alpha = 1;
      }
      play.enemyManager?.clearEnemies?.();
      if (play.enemyManager) {
        play.enemyManager.state = 'POWERUP_EFFECT_CHECK';
        play.enemyManager.phase = 'CHECK';
        play.enemyManager.spawning = false;
      }
      clearSprites(play.bulletManager?.playerBullets);
      clearSprites(play.bulletManager?.enemyBullets);
      if (play.bulletManager) {
        play.bulletManager.playerBullets = [];
        play.bulletManager.enemyBullets = [];
        play.bulletManager.pendingEnemyBullets = [];
      }
      clearSprites(manager.powerups);
      manager.powerups = [];
      clearSprites(play.ambientBonusDrones);
      play.ambientBonusDrones = [];
      play.cleanupSkippedFrameVisuals?.('powerup_effect_reset');
    };
    const statSnapshot = () => ({
      shootDelay: player.shootDelay,
      speed: player.speed,
      damage: player.bulletDamage,
      shots: player.multiShot + (player.rankBoostExtraShots || 0),
      dodgeDelay: player.dodgeDelay,
      pierce: Boolean(player.bulletPierce)
    });
    const collect = (type) => {
      const visiblePickupEffects = () => (play.container?.children || [])
        .filter(child => child?.__novaPickupEffect && child.visible !== false && child.renderable !== false && child.alpha > 0)
        .length;
      const before = {
        containerChildren: play.container?.children?.length || 0,
        particles: play.particleManager?.particles?.length || 0,
        pickupEffects: visiblePickupEffects()
      };
      const powerup = manager.spawnSpecific(player.x, player.y - 16, type, { source: 'effect_check' });
      assert(powerup?.sprite?.parent, `${type}: spawned pickup sprite missing`);
      powerup.collect(player, play);
      manager.update?.(1, play);
      const after = {
        containerChildren: play.container?.children?.length || 0,
        particles: play.particleManager?.particles?.length || 0,
        pickupEffects: visiblePickupEffects()
      };
      return {
        pickupVisual: after.pickupEffects > before.pickupEffects || after.particles > before.particles,
        before,
        after,
        activeStates: activeStates().map(entry => ({
          type: entry.type,
          detail: entry.detail || null,
          charges: entry.charges || null
        }))
      };
    };
    const addPlayerBullets = (bullets) => {
      for (const bullet of bullets || []) play.bulletManager?.addPlayerBullet?.(bullet);
    };
    const shootNow = () => {
      player.shootCooldown = 0;
      const bullets = player.shoot();
      addPlayerBullets(bullets);
      return bullets;
    };
    const spawnEnemyAt = (x, y, { health = 8, radius = 18 } = {}) => {
      const waves = play.enemyManager.generateWaves(1);
      play.enemyManager.currentWaveIndex = 0;
      play.enemyManager.normalWavesTotal = waves.length;
      play.enemyManager.phase = 'WAVES';
      play.enemyManager.state = 'WAVE_ACTIVE';
      play.enemyManager.spawnWave(waves[0]);
      const enemy = play.enemyManager.enemies.find(candidate => candidate?.kind !== 'boss');
      assert(enemy, 'failed to spawn test enemy');
      for (const other of play.enemyManager.enemies) {
        if (other === enemy) continue;
        other.active = false;
        other.waitingForEntry = false;
        other.destroyed = true;
        other.deactivateVisuals?.('powerup_effect_spare');
        if (other.sprite?.parent) other.sprite.parent.removeChild(other.sprite);
      }
      play.enemyManager.enemies = [enemy];
      enemy.active = true;
      enemy.destroyed = false;
      enemy.visualsDeactivated = false;
      enemy.waitingForEntry = false;
      enemy.state = 'FORMATION';
      enemy.x = x;
      enemy.y = y;
      enemy.health = health;
      enemy.maxHealth = health;
      enemy.radius = radius;
      enemy.scoreValue = enemy.scoreValue || 100;
      if (enemy.sprite) {
        enemy.sprite.x = x;
        enemy.sprite.y = y;
        enemy.sprite.visible = true;
        enemy.sprite.renderable = true;
        enemy.sprite.alpha = 1;
        if (!enemy.sprite.parent) play.gameContainer.addChild(enemy.sprite);
      }
      return enemy;
    };
    const spawnEnemies = (count, startX, startY, spacing = 54, health = 8) => {
      play.enemyManager.clearEnemies?.();
      const waves = play.enemyManager.generateWaves(1);
      play.enemyManager.currentWaveIndex = 0;
      play.enemyManager.normalWavesTotal = waves.length;
      play.enemyManager.phase = 'WAVES';
      play.enemyManager.state = 'WAVE_ACTIVE';
      play.enemyManager.spawnWave({ ...waves[0], count: Math.max(count, Number(waves[0]?.count) || 0) });
      const result = play.enemyManager.enemies.slice(0, count);
      assert(result.length >= count, `expected ${count} spawned enemies`);
      for (const other of play.enemyManager.enemies) {
        if (result.includes(other)) continue;
        other.active = false;
        other.waitingForEntry = false;
        other.destroyed = true;
        other.deactivateVisuals?.('powerup_effect_spare');
        if (other.sprite?.parent) other.sprite.parent.removeChild(other.sprite);
      }
      play.enemyManager.enemies = result;
      result.forEach((enemy, index) => {
        enemy.active = true;
        enemy.destroyed = false;
        enemy.visualsDeactivated = false;
        enemy.waitingForEntry = false;
        enemy.state = 'FORMATION';
        enemy.x = startX + index * spacing;
        enemy.y = startY;
        enemy.health = health;
        enemy.maxHealth = health;
        enemy.radius = 18;
        if (enemy.sprite) {
          enemy.sprite.x = enemy.x;
          enemy.sprite.y = enemy.y;
          enemy.sprite.visible = true;
          enemy.sprite.renderable = true;
          enemy.sprite.alpha = 1;
          if (!enemy.sprite.parent) play.gameContainer.addChild(enemy.sprite);
        }
      });
      return result;
    };
    const dummyEnemyBullet = (x, y, radius = 8) => ({
      active: true,
      x,
      y,
      radius,
      damage: 1,
      setScreenBounds() {},
      update(delta) {
        this.y += 10 * delta;
      }
    });

    const results = [];
    for (const type of types) {
      resetScene();
      const base = statSnapshot();
      const startScore = game.score;
      const startLives = game.lives;
      const baselineScoreAward = typeof game.getScoreAward === 'function' ? game.getScoreAward(100) : 100;

      if (type === 'life') game.lives = maxLives ? Math.max(1, maxLives - 1) : 6;
      if (type === 'blink_drive') {
        player.invulnerable = false;
        player.invulnerableTime = 0;
      }
      if (type === 'shockwave') {
        spawnEnemyAt(player.x + 70, player.y - 120, { health: 10 });
        play.bulletManager.enemyBullets = [
          dummyEnemyBullet(player.x + 20, player.y - 70),
          dummyEnemyBullet(player.x - 20, player.y - 90)
        ];
      }

      const pickup = collect(type);
      assert(pickup.pickupVisual, `${type}: pickup did not create visible particles/message/ring`, pickup);
      const after = statSnapshot();
      const result = {
        type,
        pickup,
        before: base,
        after,
        scoreBefore: startScore,
        scoreAfter: game.score,
        baselineScoreAward,
        livesBefore: startLives,
        livesAfter: game.lives,
        assertions: []
      };
      const note = (label, value = true) => result.assertions.push({ label, value });

      switch (type) {
        case 'triple_beam': {
          assert(player.multiShot >= 3, `${type}: did not set triple shots`, after);
          const bullets = shootNow();
          assert(bullets.length >= 3, `${type}: shot count missing`, { count: bullets.length });
          note('shots', bullets.length);
          break;
        }
        case 'vector_boost':
          assert(player.activePowerup.type === 'vector_boost', `${type}: active state missing`);
          player.x = game.getWidth() * 0.42;
          window.__burtKeyboardOverride = { ArrowRight: true, KeyD: true };
          const boostedStartX = player.x;
          player.update(1);
          const boostedDelta = player.x - boostedStartX;
          player.resetPowerups?.();
          player.x = game.getWidth() * 0.42;
          player.recalculateStats?.();
          const normalStartX = player.x;
          player.update(1);
          const normalDelta = player.x - normalStartX;
          window.__burtKeyboardOverride = null;
          assert(boostedDelta > normalDelta * 1.25, `${type}: movement boost missing`, { boostedDelta, normalDelta });
          note('movementDelta', { boostedDelta, normalDelta });
          break;
        case 'blink_drive': {
          assert(player.activePowerup.type === 'blink_drive', `${type}: active state missing`);
          const blinkDodgeDelay = player.dodgeDelay;
          const blinkInvulnerability = player.invulnerable && player.invulnerableTime >= 500;
          player.x = game.getWidth() * 0.42;
          window.__burtKeyboardOverride = { ArrowRight: true, KeyD: true };
          const boostedStartX = player.x;
          player.update(1);
          const boostedDelta = player.x - boostedStartX;
          player.resetPowerups?.();
          player.x = game.getWidth() * 0.42;
          player.recalculateStats?.();
          const normalStartX = player.x;
          player.update(1);
          const normalDelta = player.x - normalStartX;
          window.__burtKeyboardOverride = null;
          assert(boostedDelta > normalDelta * 1.12, `${type}: movement boost missing`, { boostedDelta, normalDelta });
          assert(boostedDelta < normalDelta * 1.55, `${type}: movement boost too hot for controllable Blink Drive`, { boostedDelta, normalDelta });
          assert(blinkDodgeDelay < base.dodgeDelay, `${type}: dodge recovery boost missing`, { blinkDodgeDelay, baseDodgeDelay: base.dodgeDelay });
          assert(blinkInvulnerability, `${type}: safety flicker missing`, { invulnerable: player.invulnerable, invulnerableTime: player.invulnerableTime });
          note('movementDelta', { boostedDelta, normalDelta });
          note('dodgeDelay', blinkDodgeDelay);
          break;
        }
        case 'rapid_cabinet': {
          assert(player.bulletDamage >= Math.max(3, base.damage), `${type}: damage boost missing`, { base, after });
          assert(player.shootDelay < base.shootDelay, `${type}: rapid fire missing`, { base, after });
          note('damage', player.bulletDamage);
          note('shootDelay', player.shootDelay);
          break;
        }
        case 'overdrive_core': {
          assert(player.multiShot >= 5, `${type}: overdrive shot count missing`, after);
          assert(player.bulletDamage >= Math.max(2, base.damage), `${type}: overdrive damage missing`, after);
          note('shots', player.multiShot);
          break;
        }
        case 'slow_time': {
          assert(player.activePowerup.type === 'slow_time', `${type}: active state missing`);
          assert(player.getSlowTimeEnemyScale?.() <= 0.35, `${type}: enemy time scale should be strongly slowed`, { scale: player.getSlowTimeEnemyScale?.() });
          assert(player.getSlowTimeHazardScale?.() <= 0.35, `${type}: hazard time scale should be strongly slowed`, { scale: player.getSlowTimeHazardScale?.() });
          const slowBullet = dummyEnemyBullet(100, 100);
          play.bulletManager.enemyBullets = [slowBullet];
          play.update(1);
          const slowDelta = slowBullet.y - 100;
          player.resetPowerups?.();
          const normalBullet = dummyEnemyBullet(120, 100);
          play.bulletManager.enemyBullets = [normalBullet];
          play.update(1);
          const normalDelta = normalBullet.y - 100;
          assert(slowDelta > 0 && slowDelta < normalDelta * 0.5, `${type}: stronger enemy bullet slow scale missing`, { slowDelta, normalDelta });
          assert(player.getSlowTimeEnemyScale?.() === 1, `${type}: enemy scale should reset after the powerup ends`);
          note('enemyBulletDelta', { slowDelta, normalDelta });
          break;
        }
        case 'ghost':
          assert(player.activePowerup.type === 'ghost' && player.sprite.alpha <= 0.45, `${type}: ghost alpha missing`, { alpha: player.sprite.alpha });
          note('alpha', player.sprite.alpha);
          break;
        case 'life':
          assert(game.lives === (maxLives || 7), `${type}: life did not increase beyond the old cap`, { maxLives, lives: game.lives });
          note('lives', game.lives);
          break;
        case 'shield':
          assert(player.shieldActive && player.shieldSprite?.visible !== false, `${type}: shield visual missing`);
          note('shieldActive', player.shieldActive);
          break;
        case 'rapid_fire':
          assert(player.shootDelay < base.shootDelay, `${type}: fire rate did not improve`, { base, after });
          note('shootDelay', player.shootDelay);
          break;
        case 'double_shot': {
          assert(player.multiShot >= 2, `${type}: double shot missing`, after);
          const bullets = shootNow();
          assert(bullets.length >= 2, `${type}: double-shot bullets missing`, { count: bullets.length });
          note('shots', bullets.length);
          break;
        }
        case 'damage_up': {
          assert(player.bulletDamage > base.damage, `${type}: damage did not increase`, { base, after });
          const bullets = shootNow();
          assert(bullets.some(bullet => bullet.damage >= player.bulletDamage), `${type}: bullet damage missing`);
          note('damage', player.bulletDamage);
          break;
        }
        case 'speed_up':
          assert(player.speed > base.speed, `${type}: speed did not increase`, { base, after });
          note('speed', player.speed);
          break;
        case 'pierce': {
          assert(player.bulletPierce === true, `${type}: pierce flag missing`);
          const bullets = shootNow();
          assert(bullets.some(bullet => bullet.piercing), `${type}: piercing bullet missing`);
          note('piercingBullets', bullets.filter(bullet => bullet.piercing).length);
          break;
        }
        case 'score_x2': {
          assert(player.scoreMultiplier === 2 && hasState('score_x2'), `${type}: score multiplier state missing`);
          const applied = game.addScore(100, 'powerup_effect_check');
          assert(applied >= baselineScoreAward * 1.9, `${type}: score delta was not doubled`, { applied, baselineScoreAward });
          note('scoreAward', applied);
          break;
        }
        case 'magnet': {
          assert(player.magnetActive && hasState('magnet'), `${type}: magnet state missing`);
          const target = manager.spawnSpecific(player.x + 90, player.y - 12, 'shield', { source: 'magnet_effect_target' });
          const beforeDist = getDistance(target, player);
          play.applyMagnetPull(8);
          const afterDist = getDistance(target, player);
          assert(afterDist < beforeDist, `${type}: pickup was not pulled closer`, { beforeDist, afterDist });
          assert(play.magnetFieldVisual?.visible === true, `${type}: magnet field visual missing`);
          note('pull', { beforeDist, afterDist });
          break;
        }
        case 'drones': {
          assert(player.dronesActive && player.drones.length >= 2 && hasState('drones'), `${type}: drone visuals missing`, { drones: player.drones.length });
          const bullets = shootNow();
          assert(bullets.length >= base.shots + 2, `${type}: drone bullets missing`, { count: bullets.length, baseShots: base.shots });
          note('droneBullets', bullets.length);
          break;
        }
        case 'shockwave': {
          const remainingBullets = activeEnemyBullets().length;
          const shockedEnemy = play.enemyManager.enemies[0];
          assert(remainingBullets === 0, `${type}: enemy bullets were not cleared`, { remainingBullets });
          assert(shockedEnemy.health < 10, `${type}: nearby enemy was not damaged`, { health: shockedEnemy.health });
          note('enemyHealth', shockedEnemy.health);
          break;
        }
        case 'point_defense': {
          assert(player.pointDefenseActive && player.pointDefenseRing?.visible !== false, `${type}: point-defense ring missing`);
          const playerBullet = shootNow()[0];
          const enemyBullet = dummyEnemyBullet(playerBullet.x, playerBullet.y);
          play.bulletManager.enemyBullets = [enemyBullet];
          play.checkCollisions();
          assert(playerBullet.active === false && enemyBullet.active === false, `${type}: projectile interception failed`, {
            playerBullet: playerBullet.active,
            enemyBullet: enemyBullet.active
          });
          note('intercepted', true);
          break;
        }
        case 'bomb': {
          assert(player.bombShotsLeft === 3 && player.bombIndicator?.visible !== false && hasState('bomb'), `${type}: bomb charges/indicator missing`);
          const bomb = shootNow().find(bullet => bullet.isBomb);
          assert(bomb, `${type}: shot did not create bomb bullet`);
          const enemy = spawnEnemyAt(bomb.x, bomb.y, { health: 2, radius: 20 });
          const beforeScore = game.score;
          play.checkCollisions();
          play.cleanupSkippedFrameVisuals?.('bomb_effect_check');
          const audit = renderState().enemyVisualAudit;
          assert(bomb.bombDetonated === true && bomb.active === false, `${type}: bomb did not detonate`, { bombDetonated: bomb.bombDetonated, active: bomb.active });
          assert(enemy.active === false || enemy.destroyed === true || enemy.health <= 0, `${type}: enemy survived bomb`, {
            active: enemy.active,
            destroyed: enemy.destroyed,
            health: enemy.health
          });
          assert((audit.staleVisibleCount || 0) === 0 && (audit.orphanedVisibleCount || 0) === 0, `${type}: bomb left dead enemy visuals`, audit);
          assert(game.score > beforeScore, `${type}: bomb kill did not award score`, { beforeScore, score: game.score });
          note('detonatedClean', audit);
          break;
        }
        case 'chain_lightning': {
          assert(player.chainLightningActive && hasState('chain_lightning'), `${type}: chain state missing`);
          const [source, chained] = spawnEnemies(2, player.x - 40, player.y - 180, 54, 12);
          const beforeHealth = chained.health;
          play.triggerChainLightning(source, 12);
          assert(chained.health < beforeHealth || chained.active === false, `${type}: chain did not damage nearby enemy`, {
            beforeHealth,
            afterHealth: chained.health,
            active: chained.active
          });
          note('chainDamage', { beforeHealth, afterHealth: chained.health });
          break;
        }
        case 'orbital_strike': {
          assert(player.orbitalStrikeActive && player.orbitalStrikeCharges === 5 && hasState('orbital_strike'), `${type}: orbital state missing`, {
            charges: player.orbitalStrikeCharges
          });
          const enemy = spawnEnemyAt(player.x, player.y - 220, { health: 3, radius: 20 });
          const beforeCharges = player.orbitalStrikeCharges;
          play.triggerOrbitalStrike();
          assert(player.orbitalStrikeCharges === beforeCharges - 1, `${type}: charge was not consumed`, { beforeCharges, after: player.orbitalStrikeCharges });
          await new Promise((resolve) => setTimeout(resolve, 700));
          assert(enemy.active === false || enemy.destroyed === true || enemy.health <= 0, `${type}: orbital strike did not damage target`, {
            active: enemy.active,
            destroyed: enemy.destroyed,
            health: enemy.health
          });
          note('chargesAfter', player.orbitalStrikeCharges);
          break;
        }
        case 'vampire': {
          assert(player.vampireActive && hasState('vampire'), `${type}: vampire state missing`);
          const beforeScore = game.score;
          for (let i = 0; i < 8; i += 1) {
            play.onEnemyKilled({
              kind: 'enemy',
              type: `vampire_probe_${i}`,
              scoreValue: 100,
              x: player.x,
              y: player.y - 80,
              color: 0xff3366,
              radius: 12
            });
          }
          assert(player.vampireKillCount === 0 && game.score > beforeScore, `${type}: drain cadence failed`, {
            vampireKillCount: player.vampireKillCount,
            beforeScore,
            score: game.score
          });
          note('drainScoreDelta', game.score - beforeScore);
          break;
        }
      }

      const finalState = renderState();
      assert((finalState.enemyVisualAudit?.staleVisibleCount || 0) === 0, `${type}: stale enemy visuals after effect`, finalState.enemyVisualAudit);
      assert((finalState.enemyVisualAudit?.orphanedVisibleCount || 0) === 0, `${type}: orphan enemy visuals after effect`, finalState.enemyVisualAudit);
      result.finalPowerups = activeStates().map(entry => ({ type: entry.type, detail: entry.detail || null, charges: entry.charges || null }));
      result.enemyVisualAudit = finalState.enemyVisualAudit;
      result.playerPowerup = finalState.player?.powerup || null;
      result.playerPowerups = finalState.player?.powerups || [];
      results.push(result);
    }

    return {
      status: 'passed',
      testedTypes: types,
      results,
      finalState: renderState()
    };
  }, powerupTypes);

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!play) throw new Error('Missing play scene for powerup visual stress frame');
    play.scorePopupManager?.cleanup?.();
    play.clearToastState?.();
    play.comboCount = 18;
    play.comboMultiplier = 2;
    play.comboTimerMs = play.comboWindowMs || 2400;
    play.createComboDisplay?.();
    play.layoutComboDisplay?.();
    play.updateComboDisplay?.(1);
    play.showToast('BOMB', {
      slot: 'center',
      type: 'powerup',
      priority: 8,
      fontSize: 32,
      fill: '#ff6633',
      stroke: '#000000',
      strokeThickness: 5,
      duration: 2600,
      y: game.getHeight() * 0.34,
      maxWidth: game.getWidth() * 0.62
    });
    play.enqueueToast('MAX LIVES REACHED!', {
      slot: 'top',
      type: 'repair',
      priority: 5,
      fontSize: 28,
      fill: '#7dffcc',
      stroke: '#001616',
      strokeThickness: 4,
      duration: 1800,
      y: game.getHeight() * 0.2,
      maxWidth: game.getWidth() * 0.56
    });
    play.enqueueToast('COMBO BONUS +200', {
      slot: 'top',
      type: 'combo',
      priority: 1,
      fontSize: 18,
      fill: '#fff3a2',
      duration: 900,
      maxWidth: game.getWidth() * 0.42
    });
    play.processToastQueue?.();
  });

  const visualSamples = [];
  for (let index = 0; index < 12; index += 1) {
    await page.waitForTimeout(125);
    const state = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
    assertNoMessageOverlap(state, `powerup visual stress sample_${index}`);
    visualSamples.push({
      index,
      active: state.toast?.active || [],
      comboDisplay: state.toast?.comboDisplay || null,
      scorePopups: state.toast?.scorePopups || []
    });
  }

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!play) throw new Error('Missing play scene before powerup visual screenshot');
    play.showToast('BOMB', {
      slot: 'center',
      type: 'powerup',
      priority: 8,
      fontSize: 32,
      fill: '#ff6633',
      stroke: '#000000',
      strokeThickness: 5,
      duration: 1800,
      y: game.getHeight() * 0.34,
      maxWidth: game.getWidth() * 0.62
    });
    play.processToastQueue?.();
  });

  const screenshotState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  assertNoMessageOverlap(screenshotState, 'powerup visual stress screenshot');
  if (!screenshotState.toast?.active?.some(entry => entry.slot === 'center' && entry.message === 'BOMB')) {
    throw new Error(`powerup visual stress screenshot did not keep BOMB feedback visible: ${JSON.stringify(screenshotState.toast, null, 2)}`);
  }

  const screenshot = path.join(outputDir, 'powerup-effects-final.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const report = {
    ...runtimeReport,
    baseUrl,
    screenshot,
    visualSamples,
    pageErrors,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join('; ')}`);
  const unexpectedConsoleErrors = consoleEvents.filter((event) => event.type === 'error');
  if (unexpectedConsoleErrors.length > 0) {
    throw new Error(`Console errors: ${JSON.stringify(unexpectedConsoleErrors, null, 2)}`);
  }
  console.log(`[powerup-effects] PASS types=${runtimeReport.testedTypes.length} report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[powerup-effects] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
