import * as PIXI from 'pixi.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
import { getMicroMessage } from '../text/phrasePool.js';
import { AudioManager } from '../audio/AudioManager.js';

export class EnemyManager {
  constructor(container, game, onCap) {
    this.container = container;
    this.game = game;
    this.enemies = []; // Regular enemies
    this.onCap = onCap;

    // STATE MACHINE
    this.state = 'IDLE';
    this.currentWaveIndex = 0;
    this.waves = [];
    this.waveTimer = 0;

    // Debug Stats
    this.totalEnemiesSpawned = 0;
    this.wavesCompleted = 0;
    this.isBossLevel = false;
    this.adaptation = { diagonalShotBias: 0, spawnYBias: 0 };
    this.currentModifier = null;
  }

  startLevel(level) {
    console.log(`[EnemyManager] STARTING LEVEL ${level}`);
    this.level = level;
    this.clearEnemies();

    this.currentWaveIndex = 0;
    this.state = 'IDLE';
    this.waveTimer = 2000;

    // Play Voice
    AudioManager.playSfx('ui_open');
    setTimeout(() => AudioManager.playVoice('ready'), 500);
    setTimeout(() => AudioManager.playVoice('go'), 2000);

    // Modifier Logic
    if (BalanceConfig.modifiers.enabled && level >= 3) {
      const mods = BalanceConfig.modifiers.types;
      this.currentModifier = mods[Math.floor(Math.random() * mods.length)];
    } else {
      this.currentModifier = null;
    }

    // Generate Waves
    if (level % 5 === 0) {
      this.isBossLevel = true;
      this.waves = [{ type: 'BOSS', count: 1 }];
    } else {
      this.isBossLevel = false;
      this.waves = this.generateWaves(level);
    }
  }

  generateWaves(level) {
    // GALAGA STYLE: Large Waves
    // 8-16 on early levels, 12-24 on high
    const numWaves = Math.min(4 + Math.floor(level / 3), 6);
    const waves = [];
    const patterns = ['GRID', 'V_SHAPE', 'ARC', 'BOX', 'SPIRAL', 'DOUBLE_ARC'];
    const enemyTypes = ['gris', 'mongo', 'tufs', 'deili', 'rolp'];

    for (let i = 0; i < numWaves; i++) {
      let count = 8 + Math.floor(level * 0.8) + Math.floor(Math.random() * 4);
      if (count > 24) count = 24;

      let typeIndex = Math.min(Math.floor(level / 2) + Math.floor(i / 2), enemyTypes.length - 1);
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];

      waves.push({
        type: enemyTypes[typeIndex],
        count: count,
        formation: pattern
      });
    }
    return waves;
  }

  update(delta) {
    // 1. Update State Machine
    switch (this.state) {
      case 'IDLE':
        this.waveTimer -= delta * 16.67;
        if (this.waveTimer <= 0) {
          this.startNextWave();
        }
        break;

      case 'SPAWNING':
        this.state = 'WAVE_ACTIVE';
        break;

      case 'WAVE_ACTIVE':
        // Check count
        if (this.enemies.length === 0) {
          this.state = 'WAVE_CLEARED';
          this.onWaveCleared();
        }
        break;

      case 'WAVE_CLEARED':
        this.waveTimer -= delta * 16.67;
        if (this.waveTimer <= 0) {
          this.startNextWave();
        }
        break;

      case 'LEVEL_COMPLETE':
        break;
    }

    // 2. Chance to spawn Beer Can (Rare Powerup Source)
    // Only if wave active and not too many enemies
    if (this.state === 'WAVE_ACTIVE' && this.enemies.length < 20) {
      if (Math.random() < 0.0005) { // very rare per tick
        this.spawnBeerCan();
      }
    }

    // 3. Update Entities
    this.updateEnemies(delta);
  }

  updateEnemies(delta) {
    const player = this.game.scenes.play ? this.game.scenes.play.player : null;

    // SAFEGUARD: Check for active powerup correctly
    const isSlowTime = player &&
      player.activePowerup &&
      player.activePowerup.type === 'slow_time';

    const timeScale = isSlowTime ? 0.5 : 1.0;
    const dt = delta * timeScale;
    const playerX = player ? player.x : 400;
    const playerY = player ? player.y : 300;

    this.enemies = this.enemies.filter(enemy => {
      enemy.update(dt, playerX, playerY);

      // Shooting
      if (enemy.canShoot() && Math.random() < 0.008 * timeScale) {
        const shots = enemy.shoot(playerX, playerY);
        if (shots) {
          if (Array.isArray(shots)) shots.forEach(s => this.game.scenes.play.bulletManager.addEnemyBullet(s));
          else this.game.scenes.play.bulletManager.addEnemyBullet(shots);
        }
      }

      if (!enemy.active && !enemy.waitingForEntry) {
        this.container.removeChild(enemy.sprite);
        return false;
      }
      return true;
    });
  }



  spawnBeerCan() {
    // Spawn as a standard enemy but with 'beer_challenge' type
    const x = 50 + Math.random() * (this.game.getWidth() - 100);
    const enemy = new Enemy(x, -50, 'beer_challenge', this.level, this.game, 'Gold');

    this.enemies.push(enemy);
    this.container.addChild(enemy.sprite);
    console.log('[EnemyManager] Bonus Beer Can Enemy spawned');
  }

  startNextWave() {
    if (this.currentWaveIndex >= this.waves.length) {
      console.log('[EnemyManager] All waves done. Level Complete.');
      this.state = 'LEVEL_COMPLETE';
      AudioManager.playVoice('mission_complete');
      return;
    }

    console.log(`[EnemyManager] Spawning Wave ${this.currentWaveIndex}`);
    const config = this.waves[this.currentWaveIndex];
    this.spawnWave(config);

    this.currentWaveIndex++;
    this.state = 'WAVE_ACTIVE';

    // Feedback
    AudioManager.playVoice('round');
    if (this.game.scenes.play) {
      this.game.scenes.play.showToast(`WAVE ${this.currentWaveIndex} / ${this.waves.length}`, { fontSize: 20, y: 100, duration: 1500 });
    }
  }

  spawnWave(config) {
    if (config.type === 'BOSS') {
      AudioManager.playVoice('war_target');
      this.spawnBoss(this.level);
      return;
    }

    const { count, formation, type } = config;
    const positions = this.getFormationPositions(formation, count);
    const screenW = this.game.getWidth();
    const startLeft = Math.random() < 0.5;
    const startX = startLeft ? -100 : screenW + 100;

    // Random Color for this wave - Xtra Asset Integration
    const waveColors = ['Blue', 'Green', 'Red', 'Black'];
    const waveColor = waveColors[Math.floor(Math.random() * waveColors.length)];

    positions.forEach((pos, i) => {
      const enemy = new Enemy(startX, -100, type, this.level, this.game, waveColor);
      this.applyModifier(enemy);
      enemy.startEntry(startX, -50, pos.x, pos.y, 2000, i * 150);
      this.enemies.push(enemy);
      this.container.addChild(enemy.sprite);
    });
  }

  getFormationPositions(type, count) {
    const pos = [];
    const cw = this.game.getWidth() / 2;
    const sw = this.game.getWidth();

    switch (type) {
      case 'GRID':
        const cols = 6;
        for (let i = 0; i < count; i++) {
          const x = cw - 150 + (i % cols) * 60;
          const y = 80 + Math.floor(i / cols) * 60;
          pos.push({ x, y });
        }
        break;
      case 'V_SHAPE':
        for (let i = 0; i < count; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const row = Math.floor(i / 2);
          pos.push({ x: cw + (row * 30 + 20) * side, y: 80 + row * 30 });
        }
        break;
      case 'BOX':
        // Box with hole
        const bCols = 5;
        for (let i = 0; i < count; i++) {
          const cx = (i % bCols);
          const cy = Math.floor(i / bCols);
          if (cx === 2 && cy === 1) continue; // Hole
          pos.push({ x: cw - 100 + cx * 50, y: 80 + cy * 50 });
        }
        break;
      case 'SPIRAL':
        // Just a circle/spiral
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const r = 50 + (i * 10);
          pos.push({ x: cw + Math.cos(angle) * r, y: 150 + Math.sin(angle) * r });
        }
        break;
      default:
        // ARC / S_CURVE standard
        for (let i = 0; i < count; i++) {
          const r = i / (count - 1);
          pos.push({ x: cw - 250 + r * 500, y: 100 + Math.sin(r * Math.PI) * 100 });
        }
        break;
    }
    return pos;
  }

  spawnBoss(level) {
    const centerX = this.game.getWidth() / 2;
    const boss = new Boss(centerX, -200, level, this.game);
    this.enemies.push(boss);
    this.container.addChild(boss.sprite);
  }

  applyModifier(enemy) {
    if (this.currentModifier === 'SHIELDED') {
      enemy.health = Math.ceil(enemy.health * 1.5);
      enemy.tint = 0x8888ff;
    } else if (this.currentModifier === 'AGGRESSIVE') {
      enemy.shootDelay *= 0.7;
    }
  }

  onWaveCleared() {
    console.log('Wave Cleared!');

    const prevWaveIdx = this.currentWaveIndex - 1;
    const prevWave = (prevWaveIdx >= 0 && prevWaveIdx < this.waves.length) ? this.waves[prevWaveIdx] : null;

    if (prevWave && prevWave.isChallenge) {
      // Challenge Bonus
      const bonus = 3000;
      this.game.addScore(bonus);
      if (this.game.scenes.play) {
        this.game.scenes.play.showToast("BEER CAN CHALLENGE KLART", { fontSize: 24, fill: '#ffff00', y: 150, duration: 2500 });
        this.game.scenes.play.showToast("BONUS 3000", { fontSize: 32, fill: '#00ff00', y: 190, duration: 2500 });
      }
      AudioManager.playVoice('mission_complete');
    } else {
      // Normal Bonus
      const bonus = 500 * this.currentWaveIndex;
      this.game.addScore(bonus);
      if (this.game.scenes.play) {
        this.game.scenes.play.showToast(`WAVE CLEARED! +${bonus}`, { fontSize: 30, fill: '#00ff00' });
      }
      AudioManager.playVoice('wave_clear');
    }

    // Logic to potentially inject a Challenge Wave
    // Criteria: Not boss level, not first wave, chance 8%, not back-to-back
    const isLevelDone = this.currentWaveIndex >= this.waves.length;

    if (!isLevelDone && !this.isBossLevel && this.currentWaveIndex > 0) {
      // 8% Chance
      if (Math.random() < 0.08) {
        const wasChallenge = prevWave && prevWave.isChallenge;
        if (!wasChallenge) {
          console.log('[EnemyManager] INJECTING BEER CHALLENGE WAVE!');
          this.waves.splice(this.currentWaveIndex, 0, {
            type: 'beer_challenge',
            count: 24,
            formation: 'GRID',
            isChallenge: true
          });
        }
      }
    }

    this.waveTimer = 2000;
  }

  isLevelComplete() {
    return this.state === 'LEVEL_COMPLETE' && this.enemies.length === 0;
  }

  clearEnemies() {
    this.enemies.forEach(e => this.container.removeChild(e.sprite));
    this.enemies = [];
  }
  updateAdaptation(metrics) {
    if (!metrics) return;
    this.adaptation.diagonalShotBias = Math.abs(metrics.avgX) * 0.5;
    this.adaptation.spawnYBias = metrics.bottomRatio > 0.5 ? -100 : 0;
  }
}
