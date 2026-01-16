import * as PIXI from 'pixi.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Hijacker } from '../entities/Hijacker.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
import { getMicroMessage } from '../text/phrasePool.js';
import { AudioManager } from '../audio/AudioManager.js';
import { isHijackerEnabled } from '../config/isExtrasEnabled.js';

// TASK D: Boss system - always enabled, no gate
// Bosses are now core gameplay, spawn at end of every level

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

    // Hijacker (Galaga-inspired special enemy, max once per level)
    this.hijacker = null;
    this.hijackerSpawnedThisLevel = false;

    // TASK 3: Wave cleanup timer to prevent stalls
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE'; // NONE, SLOWING, CLEARING

    // WAVE FIX: Wave ending state to prevent beer can spawning
    this.waveEnding = false;

    // BOSS FIX: Boss state machine
    this.boss = null;
    this.bossGateTimer = 0;
  }

  startLevel(level) {
    console.log(`[EnemyManager] STARTING LEVEL ${level}`);
    this.level = level;
    this.clearEnemies();

    this.currentWaveIndex = 0;
    this.state = 'IDLE';
    this.waveTimer = 2000;

    // Reset hijacker state for new level
    this.hijacker = null;
    this.hijackerSpawnedThisLevel = false;

    // WAVE FIX: Reset wave ending state
    this.waveEnding = false;
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE';

    // BOSS FIX: Reset boss state
    this.boss = null;
    this.bossGateTimer = 0;

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
    // TASK D: Normal waves, then boss at end of every level
    this.isBossLevel = true;
    const normalWaves = this.generateWaves(level);
    const bossWave = { type: 'BOSS', count: 1 };
    this.waves = [...normalWaves, bossWave];
    console.log(`[EnemyManager] Level ${level}: ${normalWaves.length} waves + boss`);
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

  // WAVE FIX: Helper to identify objective enemies (ships, not beer cans)
  isObjectiveEnemy(enemy) {
    if (!enemy || !enemy.active) return false;
    // Beer cans and bosses are not objective enemies
    return enemy.kind !== 'beer_can' && enemy.kind !== 'boss';
  }

  // WAVE FIX: Count objective enemies only
  getObjectiveEnemyCount() {
    return this.enemies.filter(e => this.isObjectiveEnemy(e)).length;
  }

  // WAVE FIX: Gate for beer can spawning
  allowBeerCanSpawns() {
    // Only allow during WAVE_ACTIVE, not during wave ending or cleanup
    return this.state === 'WAVE_ACTIVE' &&
      !this.waveEnding &&
      this.cleanupPhase === 'NONE';
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
        // WAVE FIX: Check objective enemies only, not beer cans
        const objectiveCount = this.getObjectiveEnemyCount();
        if (objectiveCount === 0 && !this.waveEnding) {
          // Start wave ending immediately when last objective enemy dies
          this.waveEnding = true;

          // WAVE FIX: Diagnostic - wave ending start
          const playScene = this.game.scenes.play;
          let beerCount = 0;
          if (playScene && playScene.getWaveCleanupTargets) {
            beerCount = playScene.getWaveCleanupTargets().length;
          }
          console.log(`[WaveCleanup] start objectiveAlive=0 beerAlive=${beerCount} state=${this.state}`);

          // Immediately start cleanup phase
          this.cleanupTimer = 0;
          this.cleanupPhase = 'SLOWING';
        }

        // WAVE FIX: Run cleanup during wave ending
        if (this.waveEnding) {
          this.cleanupTimer += delta * 16.67;

          const playScene = this.game.scenes.play;
          let allTargets = [];
          if (playScene && playScene.getWaveCleanupTargets) {
            allTargets = playScene.getWaveCleanupTargets();
          }

          // Phase 1: Slow beer cans immediately (already in SLOWING)
          if (this.cleanupPhase === 'SLOWING' && this.cleanupTimer > 100) {
            // Slow beer cans to 20% speed
            allTargets.forEach(t => {
              if (t.vx) t.vx *= 0.2;
              if (t.vy) t.vy *= 0.2;
            });
            this.cleanupPhase = 'CLEARING';
          }

          // Phase 2: Clear all beer cans after 2 seconds
          if (this.cleanupTimer > 2000 && this.cleanupPhase === 'CLEARING') {
            const clearedCount = allTargets.length;
            this.forceClearAllEnemies();

            // WAVE FIX: Diagnostic - cleanup end
            console.log(`[WaveCleanup] end objectiveAlive=0 beerAlive=0 cleared=${clearedCount}`);

            this.cleanupPhase = 'NONE';
          }
        }

        // After cleanup finishes, transition to WAVE_CLEARED
        if (this.waveEnding && this.cleanupPhase === 'NONE') {
          this.state = 'WAVE_CLEARED';
          this.onWaveCleared();
          this.waveEnding = false; // Reset for next wave
        }
        break;

      case 'WAVE_CLEARED':
        this.waveTimer -= delta * 16.67;
        if (this.waveTimer <= 0) {
          this.startNextWave();
        }
        break;

      case 'BOSS_GATE':
        // BOSS FIX: Show wanted poster, wait for gate duration, then spawn boss
        this.bossGateTimer += delta * 16.67;

        // Show wanted poster at start of gate
        if (this.bossGateTimer < 100 && this.game.scenes.play) {
          this.game.scenes.play.showWantedPoster();
        }

        // After gate duration (1000ms), spawn boss and enter BOSS_ACTIVE
        if (this.bossGateTimer > 1000 && !this.bossSpawning) {
          console.log(`[BossFlow] spawn boss level=${this.level}`);
          AudioManager.playVoice('war_target');
          this.bossSpawning = true;
          this.spawnBoss(this.level).then(() => {
            this.state = 'BOSS_ACTIVE';
            this.bossGateTimer = 0;
            this.bossSpawning = false;
          });
        }
        break;

      case 'BOSS_ACTIVE':
        // BOSS FIX: Wait for boss to be defeated
        // Boss is in this.enemies array or this.boss reference
        const bossAlive = this.boss && this.boss.active;
        const bossInEnemies = this.enemies.some(e => e.kind === 'boss' && e.active);

        if (!bossAlive && !bossInEnemies) {
          console.log(`[BossFlow] boss defeated level=${this.level}`);
          this.state = 'LEVEL_COMPLETE';
          AudioManager.playVoice('mission_complete');
        }
        break;

      case 'LEVEL_COMPLETE':
        // CLEANUP FIX: Check for beer cans across all tracking systems
        const playScene = this.game.scenes.play;
        let allTargets = [];
        if (playScene && playScene.getWaveCleanupTargets) {
          allTargets = playScene.getWaveCleanupTargets();
        }
        const hasRemainingEntities = this.enemies.length > 0 || allTargets.length > 0;

        if (hasRemainingEntities) {
          this.cleanupTimer += delta * 16.67;

          // Phase 1: Slow down entities after 2 seconds
          if (this.cleanupTimer > 2000 && this.cleanupPhase === 'NONE') {
            this.cleanupPhase = 'SLOWING';
            console.log(`[EnemyManager] Cleanup Phase 1: Slowing ${this.enemies.length} enemies + ${allTargets.length} beer cans`);
            // Slow enemies
            this.enemies.forEach(e => {
              if (e.vx) e.vx *= 0.2;
              if (e.vy) e.vy *= 0.2;
            });
            // Slow beer cans
            allTargets.forEach(t => {
              if (t.vx) t.vx *= 0.2;
              if (t.vy) t.vy *= 0.2;
            });
          }

          // Phase 2: Auto-clear after 3 seconds total
          if (this.cleanupTimer > 3000 && this.cleanupPhase === 'SLOWING') {
            this.cleanupPhase = 'CLEARING';
            console.log(`[EnemyManager] Cleanup Phase 2: Auto-clearing ${this.enemies.length} enemies + ${allTargets.length} beer cans`);
            this.forceClearAllEnemies();
          }

          // TASK C: Emergency failsafe at 10 seconds
          if (this.cleanupTimer > 10000) {
            console.warn(`[EnemyManager] EMERGENCY CLEANUP: Force clearing ${this.enemies.length} enemies + ${allTargets.length} beer cans after 10s`);
            this.forceClearAllEnemies();
          }
        } else {
          // Reset cleanup when all entities cleared normally
          this.cleanupTimer = 0;
          this.cleanupPhase = 'NONE';
        }
        break;
    }

    // 2. Chance to spawn Beer Can (Rare Powerup Source)
    // WAVE FIX: Use spawn gate
    if (this.allowBeerCanSpawns() && this.enemies.length < 20) {
      if (Math.random() < 0.0005) { // very rare per tick
        this.spawnBeerCan('bonus');
      }
    }

    // 3. Update Entities
    this.updateEnemies(delta);

    // 4. Update Hijacker (if present)
    if (this.hijacker && this.hijacker.active) {
      const player = this.game.scenes.play ? this.game.scenes.play.player : null;
      const playerX = player ? player.x : 400;
      const playerY = player ? player.y : 300;
      this.hijacker.update(delta, playerX, playerY);

      // Hijacker can shoot
      if (this.hijacker.canShoot()) {
        const bullet = this.hijacker.shoot(playerX, playerY);
        if (bullet && this.game.scenes.play) {
          this.game.scenes.play.bulletManager.addEnemyBullet(bullet);
        }
      }
    }

    // Remove hijacker if destroyed
    if (this.hijacker && !this.hijacker.active) {
      this.container.removeChild(this.hijacker.sprite);
      this.hijacker = null;
    }
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



  spawnBeerCan(reason = 'bonus') {
    // WAVE FIX: Double-check gate
    if (!this.allowBeerCanSpawns()) {
      return;
    }

    // Spawn as a standard enemy but with 'beer_challenge' type
    const x = 50 + Math.random() * (this.game.getWidth() - 100);
    const enemy = new Enemy(x, -50, 'beer_challenge', this.level, this.game, 'Gold');

    this.enemies.push(enemy);
    this.container.addChild(enemy.sprite);
  }

  startNextWave() {
    if (this.currentWaveIndex >= this.waves.length) {
      // BOSS FIX: Should not reach here - boss should be last wave
      console.log('[EnemyManager] All waves done. Level Complete.');
      this.state = 'LEVEL_COMPLETE';
      AudioManager.playVoice('mission_complete');
      return;
    }

    const config = this.waves[this.currentWaveIndex];

    // BOSS FIX: If this is a boss wave, enter BOSS_GATE state instead
    if (config.type === 'BOSS') {
      console.log(`[BossFlow] enter gate level=${this.level}`);
      this.state = 'BOSS_GATE';
      this.bossGateTimer = 0;
      this.currentWaveIndex++;
      return;
    }

    console.log(`[EnemyManager] Spawning Wave ${this.currentWaveIndex}`);
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
      this.spawnBoss(this.level); // Fire and forget
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

  async spawnBoss(level) {
    const centerX = this.game.getWidth() / 2;
    const boss = new Boss(centerX, 100, level, this.game); // VISIBILITY FIX: Spawn at visible position

    // Wait for boss visual to load
    await boss.createSprite();

    this.boss = boss;
    this.enemies.push(boss);
    this.container.addChild(boss.sprite);

    // Force visibility
    boss.sprite.visible = true;
    boss.sprite.alpha = 1;

    // Diagnostic
    const textureOk = boss.sprite.children.length > 0;
    console.log(`[BossVisual] type=${boss.bossType || 'UNKNOWN'} level=${level} textureOk=${textureOk}`);
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

    // Maybe spawn hijacker (once per level, after wave 1, non-boss levels)
    this.maybeSpawnHijacker();
  }

  maybeSpawnHijacker() {
    // Check conditions for hijacker spawn
    if (!isHijackerEnabled()) return;
    if (this.hijackerSpawnedThisLevel) return;
    if (this.hijacker && this.hijacker.active) return;
    // TASK 5: Removed boss level restriction - UFO can appear on any level
    if (this.currentWaveIndex < 1) return; // Only after wave 1

    // TASK 5: Increased spawn chance from 30% to 40% for more frequent UFO appearances
    if (Math.random() < 0.4) {
      this.spawnHijacker();
    }
  }

  spawnHijacker() {
    if (!isHijackerEnabled()) return;

    console.log('[EnemyManager] Spawning Hijacker!');
    this.hijackerSpawnedThisLevel = true;

    const centerX = this.game.getWidth() / 2;
    const spawnX = centerX + (Math.random() - 0.5) * 200; // Spawn near center with some variance
    const spawnY = 50; // Top of screen

    this.hijacker = new Hijacker(spawnX, spawnY, this.level, this.game);
    this.container.addChild(this.hijacker.sprite);

    // Play spawn audio
    AudioManager.playVoice('war_look_out');

    // Show toast
    if (this.game.scenes.play) {
      this.game.scenes.play.showToast('HIJACKER INCOMING!', { fontSize: 24, fill: '#ff4444' });
    }
  }

  isLevelComplete() {
    // Level is complete when all waves are done and no enemies (including hijacker)
    const noHijacker = !this.hijacker || !this.hijacker.active;
    return this.state === 'LEVEL_COMPLETE' && this.enemies.length === 0 && noHijacker;
  }

  forceClearAllEnemies() {
    // CLEANUP FIX: Use authoritative collector to clear ALL beer cans
    const playScene = this.game.scenes.play;
    let beerCanCount = 0;
    let enemyCount = 0;

    if (playScene && playScene.getWaveCleanupTargets) {
      // Get all beer cans from all tracking systems
      const beerCans = playScene.getWaveCleanupTargets();
      beerCanCount = beerCans.length;

      // Clear each beer can with particle effect
      beerCans.forEach(target => {
        if (playScene.particleManager) {
          playScene.particleManager.createExplosion(target.x, target.y, 0xcccccc, 5);
        }
        // Mark as inactive (their managers will clean up sprites)
        target.active = false;
        // Remove sprite immediately
        if (target.sprite && target.sprite.parent) {
          target.sprite.parent.removeChild(target.sprite);
        }
      });
    }

    // Also clear any remaining regular enemies from this.enemies array
    // BOSS FIX: Never clear boss during cleanup
    this.enemies.forEach(e => {
      if (e.kind !== 'beer_can' && e.kind !== 'boss') {
        // Regular enemies get cleared too
        enemyCount++;
        if (this.game.scenes.play && this.game.scenes.play.particleManager) {
          this.game.scenes.play.particleManager.createExplosion(e.x, e.y, 0xcccccc, 5);
        }
        this.container.removeChild(e.sprite);
      }
    });
    // BOSS FIX: Filter out cleared enemies but keep boss
    this.enemies = this.enemies.filter(e => e.active && (e.kind === 'boss' || e.kind === 'beer_can'));
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE';

    // CLEANUP FIX: Diagnostic - cleanup complete
    console.log(`[EnemyManager] Wave cleanup complete: cleared ${enemyCount} enemies + ${beerCanCount} beer cans`);
  }

  clearEnemies() {
    this.enemies.forEach(e => this.container.removeChild(e.sprite));
    this.enemies = [];

    // Also clear hijacker
    if (this.hijacker) {
      this.container.removeChild(this.hijacker.sprite);
      this.hijacker = null;
    }
  }
  updateAdaptation(metrics) {
    if (!metrics) return;
    this.adaptation.diagonalShotBias = Math.abs(metrics.avgX) * 0.5;
    this.adaptation.spawnYBias = metrics.bottomRatio > 0.5 ? -100 : 0;
  }
}
