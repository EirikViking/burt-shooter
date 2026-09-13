import assert from 'node:assert/strict';

globalThis.Audio = class {
  constructor() {
    this.volume = 1;
    this.loop = false;
    this.currentTime = 0;
  }

  addEventListener() {}
  removeEventListener() {}
  load() {}
  pause() {}
  play() {
    return Promise.resolve();
  }
};

const { EnemyManager } = await import('../src/managers/EnemyManager.js');

const removedSprites = [];
const explosions = [];
const clearedReasons = [];
const fakeContainer = {
  addChild() {},
  removeChild(child) {
    removedSprites.push(child);
  }
};

const fakeGame = {
  runPressureDirector: null,
  scenes: {
    play: {
      player: { x: 400, y: 520 },
      bulletManager: { addEnemyBullet() {} },
      particleManager: {
        createExplosion(x, y, color, scale) {
          explosions.push({ x, y, color, scale });
        },
        createMuzzleFlash() {}
      },
      clearEnemyBullets(reason) {
        clearedReasons.push(reason);
      },
      getWaveCleanupTargets() {
        return [];
      }
    }
  }
};

const manager = new EnemyManager(fakeContainer, fakeGame, () => {});
let waveCleared = false;
manager.level = 3;
manager.state = 'WAVE_ACTIVE';
manager.phase = 'WAVES';
manager.normalWavesTotal = 6;
manager.currentWaveIndex = 5;
manager.waveActiveTimer = 46000;
manager.onWaveCleared = () => {
  waveCleared = true;
  manager.state = 'LEVEL_COMPLETE';
};

const sprite = {
  parent: fakeContainer
};
const stuckEnemy = {
  kind: 'fodder',
  type: 'static_crab',
  active: true,
  waitingForEntry: false,
  x: 321,
  y: 176,
  sprite,
  update() {},
  canShoot() {
    return false;
  },
  destroy() {
    this.destroyed = true;
  }
};
manager.enemies = [stuckEnemy];

manager.update(1);

assert.equal(manager.waveObjectiveFailsafeTriggered, true, 'wave watchdog should trigger after the objective failsafe window');
assert.equal(stuckEnemy.active, false, 'stuck objective enemy should be deactivated');
assert.equal(stuckEnemy.destroyed, true, 'stuck objective enemy should be destroyed');
assert.equal(waveCleared, true, 'watchdog-cleared wave should progress');
assert.equal(clearedReasons.includes('wave_stall_watchdog'), true, 'watchdog should clear enemy bullets');
assert.equal(explosions.length, 1, 'watchdog cleanup should create one cleanup explosion');

console.log('[wave-stuck-watchdog] PASS stale objective enemy is cleared and wave advances');
