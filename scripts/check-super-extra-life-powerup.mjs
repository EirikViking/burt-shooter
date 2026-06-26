import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { SFX_CATALOG, SFX_MIX } from '../src/audio/SoundCatalog.js';
import { BalanceConfig } from '../src/config/BalanceConfig.js';
import { ALL_POWERUP_TYPES, getPowerupMeta } from '../src/config/PowerupCatalog.js';

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
assert.equal(movement.catchabilityTarget, 0.2, 'super_extra_life catchability target should remain around 20%');
assert.ok(Number(movement.pickupRadius) <= 10, 'super_extra_life pickup radius should be small');
assert.ok(Number(movement.maxSpeedX) >= 12, 'super_extra_life should move fast laterally');
assert.ok(Number(movement.dodgeRadius) >= 170, 'super_extra_life should start dodging before easy contact');
assert.ok(Number(movement.lifeTimeMs) >= 12000 && Number(movement.lifeTimeMs) <= 18000, 'super_extra_life lifetime should make it hard but reviewable');

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
assert.match(managerSource, /rand < \(\(BalanceConfig\.powerups\.superExtraLifeChance/, 'super_extra_life must be governed by BalanceConfig.powerups.superExtraLifeChance');
assert.match(managerSource, /scene\.game\.gainLife\(\{\s*count: lifeGrant,\s*source: this\.type/s, 'super_extra_life should grant lives through the shared gainLife path');
assert.doesNotMatch(managerSource, /super_extra_life[\s\S]{0,220}addScore/, 'super_extra_life must not award score directly');

const playSource = readFileSync(path.join(root, 'src/scenes/PlayScene.js'), 'utf8');
assert.match(playSource, /if \(p\.magnetImmune\) return;/, 'magnet pull must respect magnetImmune pickups');
assert.match(playSource, /__novaForceSuperExtraLife/, 'maintainer review hook missing');
assert.match(playSource, /debugForceSuperExtraLife/, 'debug super extra life method missing');

const gameSource = readFileSync(path.join(root, 'src/game/Game.js'), 'utf8');
assert.match(gameSource, /gainLife\(options = \{\}\)/, 'gainLife should accept count/source options');
assert.match(gameSource, /grantCount/, 'gainLife should report grantCount');

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

console.log('[super-extra-life-powerup] PASS +2 lives, evasive movement, 20% catch target, rare drop slice, asset and SFX wired');
