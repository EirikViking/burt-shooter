import assert from 'node:assert/strict';
import * as PIXI from 'pixi.js';

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

const { Enemy } = await import('../src/entities/Enemy.js');
const { EnemyManager } = await import('../src/managers/EnemyManager.js');

function createGame(container) {
  return {
    app: {
      ticker: {
        add() {},
        remove() {}
      }
    },
    runPressureDirector: null,
    getWidth: () => 800,
    getHeight: () => 600,
    addScore() {},
    getScoreAward: value => value,
    scenes: {
      play: {
        player: { x: 400, y: 520, active: true },
        bulletManager: {
          enemyBullets: [],
          addEnemyBullet() {}
        },
        particleManager: {
          createExplosion() {},
          createHitSpark() {},
          createMuzzleFlash() {}
        },
        clearEnemyBullets() {},
        getWaveCleanupTargets() {
          return [];
        }
      }
    },
    container
  };
}

function createSmallEnemy(container, game, kind = 'enemy') {
  const enemy = new Enemy(320, 120, 'chaser', 1, game, 'Blue');
  enemy.kind = kind;
  container.addChild(enemy.sprite);
  return enemy;
}

function assertVisualGone(enemy, label) {
  assert.equal(enemy.active, false, `${label}: enemy should be inactive`);
  const sprite = enemy.sprite;
  const visibleAndParented = Boolean(sprite?.parent && sprite.visible !== false && sprite.renderable !== false);
  assert.equal(visibleAndParented, false, `${label}: inactive enemy sprite must not stay visible and parented`);
}

const container = new PIXI.Container();
const game = createGame(container);
const manager = new EnemyManager(container, game, () => {});
game.scenes.play.enemyManager = manager;

const damageEnemy = createSmallEnemy(container, game);
assert.equal(damageEnemy.takeDamage(999), true, 'damage path should kill the enemy');
assertVisualGone(damageEnemy, 'damage path before manager update');
manager.removeEnemySprite(damageEnemy, 'damage_test_cleanup');
manager.removeEnemySprite(damageEnemy, 'damage_test_cleanup_repeat');
assertVisualGone(damageEnemy, 'damage path idempotent cleanup');

const contactEnemy = createSmallEnemy(container, game);
contactEnemy.active = false;
manager.deactivateEnemyVisual(contactEnemy, 'contact_test');
assertVisualGone(contactEnemy, 'manual contact inactive path');
manager.removeEnemySprite(contactEnemy, 'contact_test_cleanup');
manager.removeEnemySprite(contactEnemy, 'contact_test_cleanup_repeat');
assertVisualGone(contactEnemy, 'manual contact idempotent cleanup');

const skippedUpdateEnemy = createSmallEnemy(container, game);
assert.equal(skippedUpdateEnemy.takeDamage(999), true, 'skipped-update path should kill the enemy');
game.scenes.play.freezeTimerMs = 500;
game.scenes.play.gameOverInterlude = { active: true };
assertVisualGone(skippedUpdateEnemy, 'skipped update state before manager cleanup');

const bossAdd = createSmallEnemy(container, game, 'boss_add');
manager.enemies = [bossAdd];
assert.equal(bossAdd.sprite.parent, container, 'boss support ship should start parented');
const cleared = manager.clearNonBossEnemyVisuals('boss_add_test');
assert.equal(cleared, 1, 'boss support cleanup should clear one support ship');
assertVisualGone(bossAdd, 'boss support cleanup');
manager.clearNonBossEnemyVisuals('boss_add_test_repeat');
assertVisualGone(bossAdd, 'boss support idempotent cleanup');

const owner = createSmallEnemy(container, game);
const ownedVisual = new PIXI.Graphics();
ownedVisual.circle(0, 0, 6);
ownedVisual.fill({ color: 0x66ffff, alpha: 0.75 });
container.addChild(ownedVisual);
owner.ownedVisuals.push(ownedVisual);
owner.active = false;
owner.deactivateVisuals('owned_visual_test');
const ownedVisualStillVisible = Boolean(ownedVisual.parent && ownedVisual.visible !== false && ownedVisual.renderable !== false);
assert.equal(ownedVisualStillVisible, false, 'owned external enemy visuals should be removed when owner deactivates');

console.log('[dead-enemy-cleanup] PASS inactive small enemy visuals are hidden immediately and cleanup is idempotent');
