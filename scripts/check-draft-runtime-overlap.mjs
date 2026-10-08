import assert from 'node:assert/strict';
import { chromium } from 'playwright';

if (!process.env.CHECK_URL) throw new Error('CHECK_URL must point at current source or this task build');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage();
  await page.goto(`${process.env.CHECK_URL}/?autostart=1&offlineLeaderboard=1`);
  await page.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 120000 });
  const result = await page.evaluate(async () => {
    const play = window.__game.scenes.play;
    play.isPaused = true;
    const p = play.player;
    const reset = (ids, bullets = 5) => {
      p.resetPowerups();
      p.weaponProfile = { ...p.weaponProfile, bullets, spread: 0.2 };
      p.runAugmentIds = ids;
      p.consumedRunAugmentIds = [];
      p.rankBoost = { type: null, expiresAt: 0 };
      p.synergyState = { type: null, expiresAt: 0 };
      p.statusEffects.clear();
      p.focusDriftActive = false;
      p.recalculateStats();
      p.syncPowerupRuntimeState();
    };
    const volley = () => {
      p.shootCooldown = 0;
      const shots = p.shoot();
      const result = { count: shots.length, angle: Math.max(...shots.map(b => Math.abs(Math.atan2(b.vx, -b.vy)))) };
      shots.forEach(b => b.destroy?.());
      return result;
    };
    reset(Array(3).fill('double_shot'));
    const before = volley();
    p.applyPowerup('double_shot');
    const during = volley();
    p.resetPowerups();
    const after = volley();
    const timedCones = ['triple_beam', 'overdrive_core'].map(type => {
      reset([], 1); p.applyPowerup(type); const baseline = volley();
      p.runAugmentIds = ['double_shot']; p.recalculateStats();
      return { type, baseline, upgraded: volley() };
    });
    const chain = [1, 2, 3].map(level => {
      reset(Array(level).fill('chain_lightning'));
      const value = p.chainLightningMaxChains;
      p.applyPowerup('chain_lightning');
      const timed = p.chainLightningMaxChains;
      p.resetPowerups();
      return { level, value, timed, restored: p.chainLightningMaxChains };
    });
    reset(['drones']);
    const droneBefore = p.drones.length;
    p.applyPowerup('drones');
    const droneTimed = p.drones.length;
    p.applyPowerup('ghost');
    const secondary = p.secondaryPowerup.type;
    const droneSecondary = p.drones.length;
    p.expireSecondaryPowerup();
    const droneAfter = p.drones.length;
    reset(['impact_foam']);
    window.__game.lives = 3;
    p.invulnerable = false; p.shieldActive = false;
    if (p.takeDamage()) window.__game.loseLife({ source: 'isolated_regression' });
    const foam = p.invulnerableTime;
    const ghost = [1, 2, 3].map(level => {
      reset(Array(level).fill('ghost'));
      p.invulnerableTime = 0;
      p.applyRunAugmentSectorStartEffects(53);
      return p.invulnerableTime;
    });
    reset([]);
    const baselineVolley = volley();
    const baselineDelay = p.shootDelay;
    reset(['point_defense']);
    p.applyRunAugmentSectorStartEffects(53);
    const protectedVolley = volley();
    const { Bullet } = await import('/src/entities/Bullet.js');
    const hostile = new Bullet(p.x + 10, p.y, 0, 1, 1, 0xff5555, false);
    play.bulletManager.addEnemyBullet(hostile);
    const intercepted = play.interceptPointDefenseBullets();
    const stillFiring = volley();
    const protectedDelay = p.shootDelay;
    p.deactivatePointDefense({ expired: true });
    const expiredVolley = volley();
    return { before, during, after, timedCones, chain, droneBefore, droneTimed, secondary, droneSecondary, droneAfter,
      foam, ghost, baselineVolley, baselineDelay, protectedVolley, protectedDelay, intercepted, stillFiring, expiredVolley };
  });
  for (const entry of result.chain) {
    assert.equal(entry.value, Math.min(2, entry.level), 'permanent Chain levels must change actual runtime reach');
    assert.equal(entry.timed, 3, 'timed Chain keeps its authored reach');
    assert.equal(entry.restored, Math.min(2, entry.level), 'expiry restores permanent Chain');
  }
  assert.equal(result.before.count, 8);
  assert.equal(result.during.count, 8);
  assert.ok(Math.abs(result.before.angle - result.during.angle) < 1e-6, 'a capped timed pickup must not widen an unchanged volley');
  assert.ok(Math.abs(result.after.angle - result.before.angle) < 1e-6);
  for (const { baseline, upgraded, type } of result.timedCones) {
    assert.equal(upgraded.count, baseline.count + 1, type);
    assert.ok(Math.abs(upgraded.angle - baseline.angle) < 1e-6, `${type} must keep its meaningful timed cone`);
  }
  assert.equal(result.droneBefore, 1);
  assert.equal(result.droneTimed, 2);
  assert.equal(result.secondary, 'drones');
  assert.equal(result.droneSecondary, 2);
  assert.equal(result.droneAfter, 1, 'secondary expiry must remove the actual extra drone object');
  assert.equal(result.foam, 1300, 'Impact Foam survives the real damage, life-loss and respawn path');
  assert.deepEqual(result.ghost, [1500, 3000, 4500], 'each Ghost level supplies useful protection');
  assert.ok(result.intercepted >= 1);
  assert.deepEqual(result.protectedVolley, result.baselineVolley, 'sector Point Defense preserves real main-gun volleys');
  assert.deepEqual(result.stillFiring, result.baselineVolley, 'interception cannot interrupt the main gun');
  assert.deepEqual(result.expiredVolley, result.baselineVolley);
  assert.equal(result.protectedDelay, result.baselineDelay, 'Point Defense does not change cadence');
  console.log('[draft-runtime-overlap] PASS', JSON.stringify(result));
} finally { await browser.close(); }



