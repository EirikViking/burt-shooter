import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as PIXI from 'pixi.js';
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

const { AudioManager } = await import('../src/audio/AudioManager.js');
const { PowerupManager } = await import('../src/managers/PowerupManager.js');
const { PlayScene } = await import('../src/scenes/PlayScene.js');

const root = process.cwd();
const type = 'nova_miracle';
const meta = getPowerupMeta(type);

assert.ok(ALL_POWERUP_TYPES.includes(type), 'nova_miracle must be in the full powerup type list');
assert.equal(meta?.name, 'NOVA MIRACLE');
assert.equal(meta?.shortLabel, 'MIRACLE');
assert.equal(meta?.effect?.instant, true);
assert.equal(meta?.effect?.boardClear, true, 'nova_miracle must clear the board');
assert.equal(meta?.effect?.grantLives, 1, 'nova_miracle must grant exactly one extra life');
assert.ok(Number(meta?.effect?.invulnMs) >= 2000, 'nova_miracle should include a generous safety blink');
assert.equal(meta?.sfx, 'nova_miracle_collect');
assert.ok(Number(meta?.movement?.pickupAssistRadius) >= 30, 'the ultra-rare miracle should be satisfying to claim');
assert.ok(Number(meta?.movement?.lifeTimeMs) >= 26000, 'the ultra-rare miracle should stay reachable');

const chance = Number(BalanceConfig.powerups?.novaMiracleChance);
assert.ok(chance > 0 && chance <= 0.003, `novaMiracleChance should be super rare, got ${chance}`);
assert.ok(chance < Number(BalanceConfig.powerups?.superExtraLifeChance) / 4, 'nova_miracle should be much rarer than +2 life');

const assetUrl = AssetManifest.generated?.powerups?.[type];
assert.equal(assetUrl, '/art/generated/nova-swarm/powerups/nova-powerup-nova_miracle-20260713.png');
const runtimeIconPath = path.join(root, 'public', assetUrl.replace(/^\//, ''));
const sourceIconPath = path.join(root, 'public/art/generated/nova-swarm/powerups/imagegen-source-20260713/nova_miracle.png');
assert.ok(existsSync(runtimeIconPath), 'nova_miracle runtime icon missing');
assert.ok(existsSync(sourceIconPath), 'nova_miracle built-in imagegen source missing');
const iconBytes = readFileSync(runtimeIconPath);
assert.equal(iconBytes.readUInt32BE(16), 192, 'nova_miracle runtime icon width must be 192');
assert.equal(iconBytes.readUInt32BE(20), 192, 'nova_miracle runtime icon height must be 192');
assert.equal(iconBytes[25], 6, 'nova_miracle runtime icon must retain RGBA transparency');

for (const sfx of ['nova_miracle_collect', 'nova_miracle_purge']) {
  assert.ok(SFX_MIX[sfx], `${sfx} mix entry missing`);
  assert.equal((SFX_CATALOG[sfx] || []).length, 1, `${sfx} catalog entry missing`);
  const url = AssetManifest.audio.sfx.find((entry) => entry.endsWith(`/${sfx}.mp3`));
  assert.ok(url, `${sfx} manifest entry missing`);
  assert.ok(existsSync(path.join(root, 'public', url.replace(/^\//, ''))), `${sfx} audio file missing`);
}

const managerSource = readFileSync(path.join(root, 'src/managers/PowerupManager.js'), 'utf8');
assert.match(managerSource, /type = 'nova_miracle'/, 'PowerupManager must select nova_miracle');
assert.match(managerSource, /novaMiracleSpawnedThisRun/, 'nova_miracle needs a one-per-run guard');
assert.match(managerSource, /scene\?\.triggerNovaMiracle\?\./, 'nova_miracle collection must trigger the board clear');
const playSource = readFileSync(path.join(root, 'src/scenes/PlayScene.js'), 'utf8');
assert.match(playSource, /triggerNovaMiracle\(powerup = \{\}\)/, 'PlayScene nova miracle effect missing');
assert.match(playSource, /enemy\.kind === 'boss'/, 'nova miracle must explicitly spare bosses');
assert.match(playSource, /clearEnemyBullets\('nova_miracle'\)/, 'nova miracle must clear enemy bullets');
assert.match(playSource, /clearBossHazards\('nova_miracle'\)/, 'nova miracle must clear boss hazards');
assert.match(playSource, /__novaForceNovaMiracle/, 'maintainer review hook missing');

const previousPlaySfx = AudioManager.playSfx;
const previousPowerupVoice = AudioManager.playPowerupVoice;
AudioManager.playSfx = () => true;
AudioManager.playPowerupVoice = () => true;

const manager = new PowerupManager(new PIXI.Container(), {
  getWidth: () => 800,
  getHeight: () => 620,
  scenes: { play: { player: null } }
});
manager.lastSpawnTime = 0;
const previousRandom = Math.random;
Math.random = () => 0;
manager.spawn(400, 120);
Math.random = previousRandom;
assert.equal(manager.powerups[0]?.type, type, 'lowest natural rare slice should spawn nova_miracle');
assert.equal(manager.novaMiracleSpawnedThisRun, true, 'natural nova_miracle spawn must close its one-per-run gate');
assert.equal(manager.canSpawnNovaMiracle(), false, 'a run must not spawn a second nova_miracle');

const pickup = manager.powerups[0];
let lives = 2;
let boardClearCalls = 0;
let invulnerabilityMs = 0;
const fakeTicker = { add() {}, remove() {} };
const collectScene = {
  container: new PIXI.Container(),
  particleManager: { createPickupEffect() {} },
  game: {
    lives,
    app: { screen: { width: 800, height: 620 }, ticker: fakeTicker },
    gainLife({ count }) {
      lives += count;
      this.lives = lives;
    }
  },
  recordThreatDiscovery() {},
  triggerNovaMiracle() { boardClearCalls += 1; },
  enqueueToast() {}
};
pickup.collect({ grantInvulnerability(ms) { invulnerabilityMs = ms; } }, collectScene);
assert.equal(lives, 3, 'nova_miracle collection must grant exactly one life');
assert.equal(boardClearCalls, 1, 'nova_miracle collection must trigger one board clear');
assert.equal(invulnerabilityMs, 2500, 'nova_miracle safety blink mismatch');

const normalEnemy = {
  active: true,
  kind: 'enemy',
  x: 200,
  y: 180,
  health: 8,
  scoreValue: 125,
  takeDamage() { this.active = false; return true; }
};
const boss = {
  active: true,
  kind: 'boss',
  x: 400,
  y: 100,
  health: 5000,
  takeDamage() { throw new Error('boss must not be damaged'); }
};
const enemyBullet = { active: true };
const pendingBullet = { active: true };
const hazardDrone = { active: true, type: 'HAZARD', x: 300, y: 220 };
const runtimeScene = Object.assign(Object.create(PlayScene.prototype), {
  game: { getWidth: () => 800, currentScene: null, addScore: (points) => points },
  gameplayGame: { getWidth: () => 800, getHeight: () => 620 },
  enemyManager: {
    enemies: [normalEnemy, boss],
    hijacker: null,
    removeEnemySprite(enemy) { enemy.active = false; return true; }
  },
  bulletManager: { enemyBullets: [enemyBullet], pendingEnemyBullets: [pendingBullet] },
  bossHazards: [{ active: true }],
  bossHazardLayer: { clear() {} },
  ambientBonusDrones: [hazardDrone],
  particleManager: {
    createExplosion() {},
    createHitSpark() {},
    createRadialBurst() {}
  },
  screenShake: { shake() {} },
  triggerShockwave() {},
  onEnemyKilled() {},
  scorePopupManager: { addScorePopup() {} },
  gameContainer: null,
  container: null
});
runtimeScene.game.currentScene = runtimeScene;
const result = runtimeScene.triggerNovaMiracle({ x: 400, y: 220, color: 0xfff06a });
assert.equal(result.enemiesCleared, 1, 'nova miracle should clear active non-boss enemies');
assert.equal(result.bulletsCleared, 1, 'nova miracle should clear active enemy bullets');
assert.equal(result.pendingBulletsCleared, 1, 'nova miracle should clear queued enemy bullets');
assert.equal(result.bossHazardsCleared, 1, 'nova miracle should clear boss hazards');
assert.equal(result.ambientHazardsCleared, 1, 'nova miracle should clear ambient hazards');
assert.equal(boss.active, true, 'nova miracle must leave the boss alive');
assert.ok(runtimeScene.enemyManager.enemies.includes(boss), 'nova miracle must retain the boss in the manager');

AudioManager.playSfx = previousPlaySfx;
AudioManager.playPowerupVoice = previousPowerupVoice;

console.log('[nova-miracle-powerup] PASS super-rare one-per-run drop, +1 life, full non-boss board clear, boss safety, transparent Codex imagegen art, and two clean ElevenLabs SFX');
