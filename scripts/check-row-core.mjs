import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const source = {
  player: read('src/entities/Player.js'),
  powerups: read('src/managers/PowerupManager.js'),
  sound: read('src/audio/SoundCatalog.js'),
  manifest: read('src/assets/assetManifest.js'),
  script: read('scripts/generate-row-core-audio.mjs'),
  tacticalAudioScript: read('scripts/generate-tactical-augment-audio.mjs')
};

globalThis.Audio = globalThis.Audio || class AudioMock {
  constructor() {
    this.currentTime = 0;
    this.duration = 1;
    this.volume = 1;
    this.loop = false;
    this.muted = false;
    this.paused = true;
  }

  addEventListener() {}
  removeEventListener() {}
  load() {}
  pause() { this.paused = true; }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
};

const { AssetManifest } = await import('../src/assets/assetManifest.js');
const { AudioManager } = await import('../src/audio/AudioManager.js');
const { SFX_CATALOG, SFX_MIX, VOICE_EVENT_FALLBACKS, VOICE_MIX } = await import('../src/audio/SoundCatalog.js');
const { ALL_POWERUP_TYPES, getPowerupMeta } = await import('../src/config/PowerupCatalog.js');
const { Player } = await import('../src/entities/Player.js');
const { PowerupManager } = await import('../src/managers/PowerupManager.js');

const originalPlaySfx = AudioManager.playSfx;
const originalPlayVoice = AudioManager.playVoice;
const playedSfx = [];
AudioManager.playSfx = (key) => { playedSfx.push(key); return true; };
AudioManager.playVoice = () => false;

try {
  const meta = getPowerupMeta('row_core');
  assert.ok(ALL_POWERUP_TYPES.includes('row_core'), 'row_core must be listed in ALL_POWERUP_TYPES');
  assert.equal(meta?.name, 'ROW CORE');
  assert.equal(meta?.shortLabel, 'ROW');
  assert.equal(meta?.pickupMessage, 'ROW CORE! OARS OUT!');
  assert.equal(meta?.sfx, 'row_core_pickup');
  assert.equal(meta?.effect?.instant, true);
  assert.equal(meta?.effect?.rowCore, true);

  const manager = new PowerupManager({ addChild() {}, removeChild() {} }, { scenes: {} });
  assert.ok(manager.debugPowerupTypes.includes('row_core'), 'PowerupManager debug cycling must include row_core');
  assert.match(source.powerups, /rand < 0\.07[\s\S]*type = 'row_core'/, 'row_core should have a dedicated 7% drop branch');
  assert.match(source.powerups, /SPAWNED \$\{type\}/, 'spawn logs should keep reporting spawned powerup type');

  for (const key of [
    'row_core_pickup',
    'row_core_horn',
    'row_core_drum',
    'row_core_chant',
    'row_core_chant_big',
    'row_core_wave',
    'row_core_perfect',
    'row_core_viking_row'
  ]) {
    assert.ok(SFX_MIX[key], `SFX_MIX missing ${key}`);
    assert.ok(SFX_CATALOG[key]?.length, `SFX_CATALOG missing ${key}`);
  }
  assert.ok(VOICE_MIX.mission_control_row_core, 'VOICE_MIX missing mission_control_row_core');
  assert.equal(VOICE_EVENT_FALLBACKS.mission_control_row_core, 'mission_control_row_core_01.mp3');
  assert.ok(SFX_CATALOG.mission_control_row_core?.length >= 5, 'mission_control_row_core should have five voice variants');

  for (const file of [
    '/audio/sfx/nova-swarm/nova_row_core_pickup.mp3',
    '/audio/sfx/nova-swarm/nova_row_core_horn.mp3',
    '/audio/sfx/nova-swarm/nova_row_core_drum.mp3',
    '/audio/sfx/nova-swarm/nova_row_core_ro_01.mp3',
    '/audio/sfx/nova-swarm/nova_row_core_ro_02.mp3',
    '/audio/sfx/nova-swarm/nova_row_core_ro_03.mp3',
    '/audio/sfx/nova-swarm/nova_row_core_ro_big.mp3',
    '/audio/sfx/nova-swarm/nova_row_core_wave.mp3',
    '/audio/sfx/nova-swarm/nova_row_core_perfect.mp3',
    '/audio/sfx/nova-swarm/nova_row_core_viking_row.mp3',
    '/audio/voice/mission-control/mission_control_row_core_01.mp3',
    '/audio/voice/mission-control/mission_control_row_core_02.mp3',
    '/audio/voice/mission-control/mission_control_row_core_03.mp3',
    '/audio/voice/mission-control/mission_control_row_core_04.mp3',
    '/audio/voice/mission-control/mission_control_row_core_05.mp3'
  ]) {
    const manifestBucket = file.includes('/voice/') ? AssetManifest.audio.voice : AssetManifest.audio.sfx;
    assert.ok(manifestBucket.includes(file), `AssetManifest missing ${file}`);
    assert.ok(existsSync(path.join(root, 'public', file.replace(/^\//, ''))), `generated audio file missing ${file}`);
  }

  for (const forbidden of ['World Cup', 'FIFA', 'UEFA', 'NFF', 'Haaland', 'Odegaard', 'Vikingblod']) {
    for (const [name, text] of Object.entries(source)) {
      assert.equal(text.includes(forbidden), false, `${name} must not reference ${forbidden}`);
    }
  }
  assert.match(source.script, /ELEVENLABS_API_KEY \|\| process\.env\.ELEVEN_LABS_API_KEY/, 'generator must read API key from environment only');
  assert.match(source.tacticalAudioScript, /RO! RO! RO!/, 'Viking Row generator must request the recognizable three-shout rowing sequence');
  assert.doesNotMatch(source.player, /fetch\(/, 'gameplay runtime must not call network APIs');
  assert.match(source.player, /rowCoreActive/, 'Player must track Row Core active state');
  assert.match(source.player, /clearRowCoreTimers/, 'Player must clean Row Core timers');
  assert.match(source.player, /getAccessibilitySettings\(\)\.screenShake/, 'Row Core pulses should respect screen-shake scale');

  let scoreTotal = 0;
  const player = Object.create(Player.prototype);
  Object.assign(player, {
    x: 100,
    y: 100,
    rowCoreActive: false,
    rowCoreStartedAt: 0,
    rowCorePulseStats: [],
    rowCoreTimeouts: [],
    rowCoreVisualTickers: [],
    rowCoreStats: {
      uses: 0,
      ignored: 0,
      perfects: 0,
      bulletsCleared: 0,
      enemiesHit: 0,
      kills: 0,
      bestBulletsCleared: 0
    },
    game: {
      getWidth: () => 800,
      getHeight: () => 600,
      addScore: (points) => {
        scoreTotal += points;
        return points;
      },
      scenes: {}
    }
  });

  const removedSprites = [];
  const insideBullet = {
    x: 130,
    y: 100,
    active: true,
    sprite: { parent: { removeChild: (sprite) => removedSprites.push(sprite) } }
  };
  const outsideBullet = {
    x: 540,
    y: 100,
    active: true,
    sprite: { parent: { removeChild: () => assert.fail('outside bullet should not be removed') } }
  };
  let insideEnemyDamage = 0;
  let outsideEnemyDamage = 0;
  const insideEnemy = {
    x: 150,
    y: 100,
    active: true,
    radius: 14,
    health: 10,
    kind: 'enemy',
    takeDamage: (amount) => {
      insideEnemyDamage += amount;
      insideEnemy.health -= amount;
      return false;
    },
    sprite: {}
  };
  const outsideEnemy = {
    x: 620,
    y: 100,
    active: true,
    radius: 14,
    health: 10,
    kind: 'enemy',
    takeDamage: (amount) => {
      outsideEnemyDamage += amount;
      return false;
    },
    sprite: {}
  };
  const playScene = {
    bulletManager: { enemyBullets: [insideBullet, outsideBullet] },
    enemyManager: { enemies: [insideEnemy, outsideEnemy], removeEnemySprite() {} },
    particleManager: { createHitSpark() {}, createExplosion() {} },
    screenShake: { shake() {} },
    scorePopupManager: { addScorePopup() {} },
    enqueueToast() {}
  };
  player.game.scenes.play = playScene;

  const rowStart = player.triggerRowCore();
  player.clearRowCoreTimers();
  assert.equal(rowStart.started, true, 'Row Core should start its full sequence');
  assert.ok(playedSfx.includes('row_core_viking_row'), 'Row Core did not play the combined Viking Row chant');
  assert.equal(playedSfx.includes('row_core_chant'), false, 'Row Core still used the disconnected old chant clips');
  player.rowCoreActive = false;

  const pulse = player.pulseRowCore(playScene, 0, 6);
  assert.equal(pulse.bulletsCleared, 1, 'pulse should clear bullets inside radius');
  assert.equal(pulse.enemiesHit, 1, 'pulse should damage enemies inside radius');
  assert.equal(pulse.useful, true, 'pulse with bullet clear/enemy hit should be useful');
  assert.equal(playScene.bulletManager.enemyBullets.length, 1, 'outside bullet should remain');
  assert.equal(playScene.bulletManager.enemyBullets[0], outsideBullet);
  assert.equal(insideBullet.active, false);
  assert.equal(outsideBullet.active, true);
  assert.equal(insideEnemyDamage, 2);
  assert.equal(outsideEnemyDamage, 0);
  assert.equal(scoreTotal, 110, 'pulse score should be 35 per bullet plus 75 per enemy hit');

  const overlapPlayer = Object.create(Player.prototype);
  Object.assign(overlapPlayer, {
    x: 100,
    y: 100,
    rowCoreActive: true,
    rowCoreStats: { uses: 0, ignored: 0, perfects: 0, bulletsCleared: 0, enemiesHit: 0, kills: 0, bestBulletsCleared: 0 },
    rowCoreTimeouts: [],
    game: {
      addScore: (points) => points,
      getWidth: () => 800,
      getHeight: () => 600,
      scenes: { play: { enqueueToast() {}, scorePopupManager: { addScorePopup() {} } } }
    }
  });
  const overlap = overlapPlayer.triggerRowCore();
  assert.equal(overlap.started, false);
  assert.equal(overlap.alreadyActive, true);
  assert.equal(overlap.bonus, 500);
  assert.equal(overlapPlayer.rowCoreStats.ignored, 1);

  const slotPlayer = Object.create(Player.prototype);
  Object.assign(slotPlayer, {
    activePowerup: { type: 'rapid_fire', expiresAt: Date.now() + 5000, remainingMs: 5000, durationMode: 'wall_clock' },
    powerupEffect: { durationMs: 8000 },
    rowCoreActive: true,
    rowCoreStats: { uses: 0, ignored: 0, perfects: 0, bulletsCleared: 0, enemiesHit: 0, kills: 0, bestBulletsCleared: 0 },
    rowCoreTimeouts: [],
    game: {
      addScore: (points) => points,
      getWidth: () => 800,
      getHeight: () => 600,
      scenes: { play: { enqueueToast() {}, scorePopupManager: { addScorePopup() {} } } }
    },
    notePowerup() {},
    ensureRenderable() {}
  });
  slotPlayer.applyPowerup('row_core');
  assert.equal(slotPlayer.activePowerup.type, 'rapid_fire', 'row_core pickup must not clear current weapon slot');

  console.log('[check-row-core] ok: catalog, audio hooks, drop branch, pulses, overlap guard, and slot safety verified');
} finally {
  AudioManager.playSfx = originalPlaySfx;
  AudioManager.playVoice = originalPlayVoice;
}
