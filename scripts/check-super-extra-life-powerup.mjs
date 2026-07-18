import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, SFX_MIX } from '../src/audio/SoundCatalog.js';
import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { ALL_POWERUP_TYPES, getPowerupMeta } from '../src/config/PowerupCatalog.js';

globalThis.Audio = globalThis.Audio || class AudioStub {
  addEventListener() {}
  removeEventListener() {}
  load() {}
  pause() {}
  play() { return Promise.resolve(); }
};

const { PowerupManager } = await import('../src/managers/PowerupManager.js');
const { PlayScene } = await import('../src/scenes/PlayScene.js');

const root = process.cwd();
const type = 'super_extra_life';
const meta = getPowerupMeta(type);

assert.ok(ALL_POWERUP_TYPES.includes(type), 'super_extra_life must be in the full powerup type list');
assert.ok(meta, 'super_extra_life catalog metadata missing');
assert.equal(meta.name, 'SUPER EXTRA LIFE');
assert.equal(meta.shortLabel, '2 LIFE');
assert.equal(meta.effect?.instant, true);
assert.equal(meta.effect?.grantLives, 2, 'super_extra_life must grant exactly 2 lives');
assert.ok(Number(meta.effect?.invulnMs) >= 1000, 'super_extra_life should include a short safety blink after pickup');
assert.equal(meta.sfx, 'super_life_up');

const movement = meta.movement || {};
assert.equal(movement.evasive, true, 'super_extra_life must actively dodge the player');
assert.equal(movement.magnetImmune, true, 'super_extra_life must ignore magnet pull');
assert.equal(movement.catchabilityTarget, 0.08, 'super_extra_life catchability target should be around 8%');
assert.ok(Number(movement.pickupRadius) <= 8, 'super_extra_life pickup radius should be tiny');
assert.ok(Number(movement.pickupAssistRadius) <= 8, 'super_extra_life must not inherit the major-powerup assist radius');
assert.ok(Number(movement.maxSpeedX) >= 20, 'super_extra_life should move very fast laterally');
assert.ok(Number(movement.dodgeRadius) >= 280, 'super_extra_life should start dodging well before contact');
assert.ok(Number(movement.jumpIntervalMaxMs) <= 400, 'super_extra_life should change lanes rapidly');
assert.ok(Number(movement.lifeTimeMs) >= 8500 && Number(movement.lifeTimeMs) <= 11500, 'super_extra_life lifetime should be brief but reviewable');

const superChance = Number(BalanceConfig.powerups?.superExtraLifeChance);
const lifeChance = Number(BalanceConfig.powerups?.extraLifeChance);
assert.ok(superChance > 0 && superChance <= 0.015, `superExtraLifeChance should stay rare, got ${superChance}`);
assert.equal(Number((superChance / lifeChance).toFixed(2)), 0.2, 'super extra life should be 20% of the extra-life drop class');

const assetUrl = AssetManifest.generated?.powerups?.[type];
assert.equal(assetUrl, '/art/generated/nova-swarm/powerups/nova-powerup-super_extra_life-20260626.png');
assert.ok(existsSync(path.join(root, 'public', assetUrl.replace(/^\//, ''))), 'super_extra_life icon asset missing');
assert.ok(
  existsSync(path.join(root, 'public/art/generated/nova-swarm/powerups/imagegen-source-20260626/super_extra_life.png')),
  'super_extra_life built-in imagegen source missing'
);

assert.ok(SFX_MIX.super_life_up, 'super_life_up mix entry missing');
assert.ok((SFX_CATALOG.super_life_up || []).length >= 2, 'super_life_up should layer multiple SFX');

const managerSource = readFileSync(path.join(root, 'src/managers/PowerupManager.js'), 'utf8');
assert.match(managerSource, /type = 'super_extra_life'/, 'PowerupManager must select super_extra_life');
assert.match(managerSource, /BalanceConfig\.powerups\.superExtraLifeChance/, 'super_extra_life must be governed by BalanceConfig.powerups.superExtraLifeChance');
assert.match(managerSource, /rand < superExtraLifeThreshold/, 'super_extra_life must use its configured rare selection threshold');
assert.match(managerSource, /scene\.game\.gainLife\(\{\s*count: lifeGrant,\s*source: this\.type/s, 'super_extra_life should grant lives through the shared gainLife path');
assert.doesNotMatch(managerSource, /super_extra_life[\s\S]{0,220}addScore/, 'super_extra_life must not award score directly');

const playSource = readFileSync(path.join(root, 'src/scenes/PlayScene.js'), 'utf8');
assert.match(playSource, /if \(p\.magnetImmune\) return;/, 'magnet pull must respect magnetImmune pickups');
assert.match(playSource, /__novaForceSuperExtraLife/, 'maintainer review hook missing');
assert.match(playSource, /debugForceSuperExtraLife/, 'debug super extra life method missing');

const gameSource = readFileSync(path.join(root, 'src/game/Game.js'), 'utf8');
assert.match(gameSource, /gainLife\(options = \{\}\)/, 'gainLife should accept count/source options');
assert.match(gameSource, /grantCount/, 'gainLife should report grantCount');

const removedSprites = [];
const runtimeManager = new PowerupManager({
  addChild() {},
  removeChild(sprite) { removedSprites.push(sprite); }
}, {
  getWidth: () => 800,
  getHeight: () => 620,
  scenes: { play: {} }
});
const runtimeScene = {
  gameplayGame: { getWidth: () => 800, getHeight: () => 620 },
  game: { getWidth: () => 800, getHeight: () => 620 },
  player: { x: 100, y: 500, runAugmentModifiers: {} },
  particleManager: { spawnParticle() {} }
};
const missablePickup = runtimeManager.spawnSpecific(650, 180, type);
assert.equal(missablePickup.pickupAssistRadius, 8, 'runtime pickup assist must honor the explicit 8px contract');
assert.equal(
  PlayScene.prototype.getCollisionRadius.call({}, missablePickup),
  8,
  'collision code must not silently restore the old 28px major-powerup assist'
);
missablePickup.createdAt = Date.now() - missablePickup.lifeTime + 20;
runtimeManager.update(1, runtimeScene);
assert.equal(runtimeManager.powerups.length, 1, 'super extra life despawned before its review window ended');
missablePickup.createdAt = Date.now() - missablePickup.lifeTime - 20;
runtimeManager.update(1, runtimeScene);
assert.equal(runtimeManager.powerups.length, 0, 'super extra life waited forever after its lifetime expired on-screen');
assert.equal(removedSprites.length, 1, 'expired super extra life sprite was not removed');

for (const protectedTerm of [
  'leaderboard',
  'achievement',
  'steam cloud',
  'save format',
  'xp'
]) {
  assert.doesNotMatch(
    `${managerSource}\n${gameSource}`,
    new RegExp(`super_extra_life[\\s\\S]{0,260}${protectedTerm}`, 'i'),
    `super_extra_life should not touch ${protectedTerm}`
  );
}

console.log('[super-extra-life-powerup] PASS +2 lives, 8px collection radius, aggressive evasive movement, hard on-screen expiry, 8% catch target, rare drop slice, asset and SFX wired');
