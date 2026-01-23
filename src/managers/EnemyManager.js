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
    this.normalWavesTotal = 0;
    this.bossWaveIndex = 0;
    this.phase = 'WAVES';

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
    this.bossSpawnedThisLevel = false;
    this.bossDefeatedThisLevel = false;
    this.bossDefeatCelebrated = false;
    this.bossBlockLogged = false;
    this.levelStartTime = 0;
    this.bossSpawnedAtMs = 0;
    this.directorState = { tier: 0, spawnCadenceScale: 1, eliteChance: 0.02, clutchDropChance: 0.04 };

    // TASK 1: Voice history to prevent duplicates
    this.voiceHistory = {};
  }

  startLevel(level) {
    console.log(`[EnemyManager] STARTING LEVEL ${level}`);
    this.level = level;
    this.clearEnemies();

    this.currentWaveIndex = 0;
    this.state = 'WAVE_ACTIVE';
    this.waveTimer = 0;
    this.normalWavesTotal = 0;
    this.bossWaveIndex = 0;
    this.levelStartTime = Date.now();
    this.phase = 'WAVES';

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
    this.bossSpawnedThisLevel = false;
    this.bossDefeatedThisLevel = false;
    this.bossDefeatCelebrated = false;
    this.bossBlockLogged = false;
    this.bossSpawnedAtMs = 0;

    // Play Voice
    // Play Voice (TASK 1: Prevent duplicates per level)
    if (!this.voiceHistory[level]) {
      console.log(`[IntroVoice] play requested source=EnemyManager level=${level}`);
      AudioManager.playSfx('ui_open');
      setTimeout(() => AudioManager.playVoice('ready'), 500);
      setTimeout(() => AudioManager.playVoice('go'), 2000);
      this.voiceHistory[level] = true;
    } else {
      console.log(`[IntroVoice] suppressed duplicate for level=${level}`);
    }

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
    this.waves = normalWaves;
    this.normalWavesTotal = normalWaves.length;
    this.bossWaveIndex = this.normalWavesTotal;
    console.log(`[EnemyManager] Level ${level}: ${normalWaves.length} waves + boss`);
    console.log(`[BossPlan] level=${level} normalWaves=${this.normalWavesTotal} bossWaveIndex=${this.bossWaveIndex} hasBoss=${this.isBossLevel}`);
    this.logBossStatus('level_start');
    console.log(`[BossPhase] level=${level} phase=${this.phase} waveIndex=${this.currentWaveIndex} normalWaves=${this.normalWavesTotal} hasBoss=${this.isBossLevel}`);
    this.logLevelDifficulty(level, normalWaves.length);

    if (this.normalWavesTotal > 0) {
      const config = this.waves[this.currentWaveIndex];
      this.spawnWave(config);
      this.state = 'WAVE_ACTIVE';
    } else if (this.isBossLevel) {
      this.phase = 'BOSS';
      this.state = 'BOSS_GATE';
      this.bossGateTimer = 0;
    } else {
      this.phase = 'COMPLETE';
      this.state = 'LEVEL_COMPLETE';
      console.log(`[BossPhase] level=${level} phase=${this.phase} bossDefeated=true`);
    }
  }

  generateWaves(level) {
    // GALAGA STYLE: Large Waves
    // 8-16 on early levels, 12-24 on high
    const diff = BalanceConfig.difficulty;
    const numWaves = Math.min(diff.waveCountBase + Math.floor(level / diff.waveCountPerLevel), diff.waveCountMax);
    const waves = [];
    const patterns = ['GRID', 'V_SHAPE', 'ARC', 'BOX', 'SPIRAL', 'DOUBLE_ARC'];

    // Mix original enemies with fighter variants (player ships as enemies)
    const enemyTypes = [
      'gris', 'mongo', 'tufs', 'deili', 'rolp',  // Original types
      'fighter_0', 'fighter_1', 'fighter_2',      // Light fighters
      'fighter_3', 'fighter_4', 'fighter_5',      // Medium fighters
      'fighter_6', 'fighter_7', 'fighter_8'       // Fast/special fighters
    ];

    for (let i = 0; i < numWaves; i++) {
      let count = diff.waveEnemyBase + Math.floor(level * diff.waveEnemyPerLevel) + Math.floor(Math.random() * diff.waveEnemyRandom);
      if (count > diff.waveEnemyMax) count = diff.waveEnemyMax;

      let typeIndex = Math.min(Math.floor(level / 2) + Math.floor(i / 2), enemyTypes.length - 1);
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];

      // 60% chance for pure fighter squadron (all same ship type for visual cohesion)
      const useFighterSquadron = Math.random() < 0.6; // Increased from 30% to 60%, starts level 1
      let selectedType;

      if (useFighterSquadron) {
        // Pick a random fighter type for the whole squadron
        const fighterTypes = ['fighter_0', 'fighter_1', 'fighter_2', 'fighter_3', 'fighter_4',
                              'fighter_5', 'fighter_6', 'fighter_7', 'fighter_8'];
        selectedType = fighterTypes[Math.floor(Math.random() * fighterTypes.length)];
      } else {
        // Normal progression through enemy types
        selectedType = enemyTypes[typeIndex];
      }

      waves.push({
        type: selectedType,
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

  setDirectorState(state) {
    if (!state) return;
    this.directorState = state;
  }

  update(delta) {
    // 1. Update State Machine
    switch (this.state) {
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
          this.logBossStatus('wave_cleanup_start');

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
            this.logBossStatus('wave_cleanup_end');

            this.cleanupPhase = 'NONE';
          }
        }

        // After cleanup finishes, progress phase
        if (this.waveEnding && this.cleanupPhase === 'NONE') {
          this.onWaveCleared();
          this.waveEnding = false; // Reset for next wave
        }
        break;

      case 'BOSS_GATE':
        // BOSS FIX: Show wanted poster, wait for gate duration, then spawn boss
        this.bossGateTimer += delta * 16.67;

        // Show wanted poster at start of gate
        if (this.bossGateTimer < 100 && this.game.scenes.play) {
          const playScene = this.game.scenes.play;
          if (playScene.showBossTaunt) playScene.showBossTaunt('boss_spawn');
          else if (playScene.showWantedPoster) playScene.showWantedPoster();
        }

        // After gate duration (1000ms), spawn boss and enter BOSS_ACTIVE
        if (this.bossGateTimer > 1000 && !this.bossSpawning) {
          this.logBossStatus('boss_gate_spawn');
          console.log(`[BossFlow] spawn boss level=${this.level}`);
          AudioManager.playVoice('war_target');
          this.bossSpawning = true;
          this.spawnBoss(this.level).then(() => {
            this.state = 'BOSS_ACTIVE';
            this.bossGateTimer = 0;
            this.bossSpawning = false;
            this.logBossStatus('boss_spawned');
          });
        }
        break;

      case 'BOSS_ACTIVE':
        // BOSS FIX: Wait for boss to be defeated
        // Boss is in this.enemies array or this.boss reference
        const bossAlive = this.boss && this.boss.active;
        const bossInEnemies = this.enemies.some(e => e.kind === 'boss' && e.active);

        if (this.boss) {
          const dt = Date.now() - (this.bossSpawnedAtMs || this.boss.spawnedAtMs || 0);
          if (this.boss.health <= 0) {
            console.log(`[BossDefeatAttempt] level=${this.level} hp=${this.boss.health} dt=${dt} reason=hp_zero`);
            if (dt < 1500) {
              console.warn(`[BossFix] prevented instant boss defeat level=${this.level} dt=${dt}`);
              this.boss.health = this.boss.maxHealth;
              this.boss.active = true;
              return;
            }
            this.bossDefeatedThisLevel = true;
            if (!this.bossDefeatCelebrated) {
              this.bossDefeatCelebrated = true;
              const playScene = this.game.scenes.play;
              if (playScene?.showBossCelebration) {
                playScene.showBossCelebration({ level: this.level, type: this.boss?.bossType || 'UNKNOWN' });
              }
            }
            this.logBossStatus('boss_defeated');
            console.log(`[BossDefeatProof] level=${this.level} hp=0 dt=${dt} reason=hp_zero`);
            console.log(`[BossFlow] boss defeated level=${this.level}`);
            this.phase = 'COMPLETE';
            console.log(`[BossPhase] level=${this.level} phase=${this.phase} bossDefeated=true`);
            this.state = 'LEVEL_COMPLETE';
            AudioManager.playVoice('mission_complete');
            return;
          }
        }

        if (!bossAlive && !bossInEnemies) {
          const dt = Date.now() - (this.bossSpawnedAtMs || this.boss?.spawnedAtMs || 0);
          const hp = this.boss ? this.boss.health : -1;
          console.log(`[BossDefeatAttempt] level=${this.level} hp=${hp} dt=${dt} reason=missing_entity`);
          if (!this.bossSpawning) {
            console.warn(`[BossFix] boss missing, respawning level=${this.level}`);
            this.bossSpawning = true;
            this.spawnBoss(this.level).finally(() => {
              this.bossSpawning = false;
            });
          }
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

    this.ensureBossActive();

    // 2. Chance to spawn Beer Can (Rare Powerup Source)
    // WAVE FIX: Use spawn gate
    if (this.allowBeerCanSpawns() && this.enemies.length < 20) {
      const clutchBoost = this.directorState?.clutchDropChance || 0;
      const chance = 0.0005 + clutchBoost * 0.0008;
      if (Math.random() < chance) { // very rare per tick
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
      if (this.hijacker.destroy) this.hijacker.destroy();
      if (this.hijacker.sprite && this.hijacker.sprite.parent) {
        this.hijacker.sprite.parent.removeChild(this.hijacker.sprite);
      }
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
    const tier = this.directorState?.tier || 0;
    const fireChance = BalanceConfig.difficulty.enemyFireChance * (1 + tier * 0.1);
    const dt = delta * timeScale;
    const playerX = player ? player.x : 400;
    const playerY = player ? player.y : 300;

    this.enemies = this.enemies.filter(enemy => {
      enemy.update(dt, playerX, playerY);

      // Shooting
      if (enemy.canShoot() && Math.random() < fireChance * timeScale) {
        const shots = enemy.shoot(playerX, playerY);
        if (shots) {
          if (Array.isArray(shots)) shots.forEach(s => this.game.scenes.play.bulletManager.addEnemyBullet(s));
          else this.game.scenes.play.bulletManager.addEnemyBullet(shots);
        }
      }

      if (!enemy.active && !enemy.waitingForEntry) {
        if (enemy.destroy) enemy.destroy();
        // Always remove sprite from container, regardless of destroy method
        if (enemy.sprite && enemy.sprite.parent) {
          enemy.sprite.parent.removeChild(enemy.sprite);
        }
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

  startNextWave() { }

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

    // Show wave modifier toast
    if (this.currentModifier && this.game.scenes.play) {
      const modLabels = {
        'SHIELDED': 'SHIELDED WAVE! (+50% HP)',
        'AGGRESSIVE': 'AGGRESSIVE WAVE! (Rapid Fire)',
        'SWIFT': 'SWIFT WAVE! (+40% Speed)'
      };
      const label = modLabels[this.currentModifier] || this.currentModifier;
      this.game.scenes.play.showToast(label, { fontSize: 20, fill: '#ffaa00', y: 130, duration: 2000 });
    }

    const cadence = this.directorState?.spawnCadenceScale || 1;
    const delayStep = Math.max(60, 150 / cadence);
    const eliteChance = this.directorState?.eliteChance || 0.02;
    positions.forEach((pos, i) => {
      const enemy = new Enemy(startX, -100, type, this.level, this.game, waveColor);
      this.applyModifier(enemy);
      if (Math.random() < eliteChance) enemy.applyElite?.();
      enemy.startEntry(startX, -50, pos.x, pos.y, 2000, i * delayStep);
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
    this.bossSpawnedThisLevel = true;
    this.bossSpawnedAtMs = Date.now();
    this.enemies.push(boss);
    this.container.addChild(boss.sprite);

    // Force visibility
    boss.sprite.visible = true;
    boss.sprite.alpha = 1;

    // Diagnostic
    const textureOk = boss.sprite.children.length > 0;
    console.log(`[BossVisual] type=${boss.bossType || 'UNKNOWN'} level=${level} textureOk=${textureOk}`);
    console.log(`[BossFlow] boss active level=${level} bossSpawned=true bossActive=${boss.active}`);
    let bulletsCleared = false;
    const playScene = this.game.scenes && this.game.scenes.play ? this.game.scenes.play : null;
    if (playScene?.showBossIntro) {
      const taunt = playScene.getBossTauntCaption ? playScene.getBossTauntCaption('boss_spawn') : getMicroMessage('bossIntro');
      playScene.showBossIntro(boss.name, taunt);
    }
    if (playScene && playScene.bulletManager) {
      const bm = playScene.bulletManager;
      bm.playerBullets.forEach(b => {
        b.active = false;
        if (b.sprite && b.sprite.parent) b.sprite.parent.removeChild(b.sprite);
      });
      bm.enemyBullets.forEach(b => {
        b.active = false;
        if (b.sprite && b.sprite.parent) b.sprite.parent.removeChild(b.sprite);
      });
      bm.playerBullets = [];
      bm.enemyBullets = [];
      bulletsCleared = true;
    }
    console.log(`[BossSpawnProof] level=${level} hp=${boss.health} x=${Math.round(boss.x)} y=${Math.round(boss.y)} invulnMs=${boss.invulnerableUntilMs - boss.spawnedAtMs} bulletsCleared=${bulletsCleared}`);
    console.log(`[BossPhase] level=${level} phase=${this.phase} spawned bossSpawned=true bossActive=${boss.active}`);
    this.logBossStatus('boss_spawn_complete');
  }

  spawnBossAdds(count = 6) {
    const positions = this.getFormationPositions('ARC', count);
    const screenW = this.game.getWidth();
    const startX = Math.random() < 0.5 ? -80 : screenW + 80;
    const waveColor = 'Red';

    // 50% chance to spawn fighter squadron instead of standard enemies
    const useFighters = Math.random() < 0.5;
    let enemyType = 'gris';

    if (useFighters) {
      // Random fighter type for variety
      const fighterTypes = ['fighter_0', 'fighter_1', 'fighter_2', 'fighter_3', 'fighter_4',
                            'fighter_5', 'fighter_6', 'fighter_7', 'fighter_8'];
      enemyType = fighterTypes[Math.floor(Math.random() * fighterTypes.length)];
    }

    positions.forEach((pos, i) => {
      const enemy = new Enemy(startX, -100, enemyType, this.level, this.game, waveColor);
      enemy.startEntry(startX, -50, pos.x, pos.y + 40, 1600, i * 120);
      this.enemies.push(enemy);
      this.container.addChild(enemy.sprite);
    });
  }

  applyModifier(enemy) {
    if (this.currentModifier === 'SHIELDED') {
      enemy.health = Math.ceil(enemy.health * 1.5);
      if (enemy.sprite) enemy.sprite.tint = 0x8888ff;
    } else if (this.currentModifier === 'AGGRESSIVE') {
      enemy.shootDelay *= 0.7;
      if (enemy.sprite) enemy.sprite.tint = 0xff8888;
    } else if (this.currentModifier === 'SWIFT') {
      enemy.speed = enemy.speed ? enemy.speed * 1.4 : 1.4;
      if (enemy.sprite) enemy.sprite.tint = 0xffff88;
    }
  }

  onWaveCleared() {
    console.log('Wave Cleared!');
    console.log(`[BossPhase] level=${this.level} phase=${this.phase} waveCleared waveIndex=${this.currentWaveIndex} of ${this.normalWavesTotal}`);
    if (this.phase !== 'WAVES') return;

    const prevWaveIdx = this.currentWaveIndex - 1;
    const prevWave = (prevWaveIdx >= 0 && prevWaveIdx < this.normalWavesTotal) ? this.waves[prevWaveIdx] : null;

    if (prevWave && prevWave.isChallenge) {
      // Challenge Bonus
      const bonus = 3000;
      this.game.addScore(bonus);
      if (this.game.scenes.play) {
        this.game.scenes.play.showWaveBonusEffect(bonus, 'BEER CAN CHALLENGE KLART!');
      }
      AudioManager.playVoice('mission_complete');
    } else {
      // Normal Bonus
      const bonus = 500 * this.currentWaveIndex;
      this.game.addScore(bonus);
      if (this.game.scenes.play) {
        this.game.scenes.play.showWaveBonusEffect(bonus, 'WAVE CLEARED!');
      }
      AudioManager.playVoice('wave_clear');
    }

    // Logic to potentially inject a Challenge Wave
    // Criteria: Not boss level, not first wave, chance 8%, not back-to-back
    const isLevelDone = this.currentWaveIndex >= this.normalWavesTotal;

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

    if (this.currentWaveIndex < this.normalWavesTotal - 1) {
      this.currentWaveIndex += 1;
      const config = this.waves[this.currentWaveIndex];
      this.spawnWave(config);
      this.state = 'WAVE_ACTIVE';
      AudioManager.playVoice('round');
      if (this.game.scenes.play) {
        this.game.scenes.play.showToast(`WAVE ${this.currentWaveIndex + 1} / ${this.normalWavesTotal}`, { fontSize: 20, y: 100, duration: 1500 });
      }
      return;
    }

    if (this.isBossLevel && !this.bossSpawnedThisLevel && !this.bossDefeatedThisLevel) {
      this.phase = 'BOSS';
      console.log(`[BossFlow] spawning boss level=${this.level} waveIndex=${this.currentWaveIndex + 1} bossWaveIndex=${this.bossWaveIndex}`);
      this.state = 'BOSS_GATE';
      this.bossGateTimer = 0;
      return;
    }

    this.phase = 'COMPLETE';
    this.state = 'LEVEL_COMPLETE';
    console.log(`[BossPhase] level=${this.level} phase=${this.phase} bossDefeated=true`);
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
    if (this.phase !== 'COMPLETE') return false;
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
        if (target.destroy) target.destroy(); // CLEANUP: Force destroy

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
        e.active = false;
        if (e.destroy) e.destroy(); // Call destroy to clean up tickers
        if (this.game.scenes.play && this.game.scenes.play.particleManager) {
          this.game.scenes.play.particleManager.createExplosion(e.x, e.y, 0xcccccc, 5);
        }
        // Always remove sprite
        if (e.sprite && e.sprite.parent) {
          e.sprite.parent.removeChild(e.sprite);
        }
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
    this.enemies.forEach(e => {
      e.active = false; // Disable update
      if (e.destroy) e.destroy(); // CLEANUP: Call destroy to stop tickers
      // Always remove sprite from container
      if (e.sprite && e.sprite.parent) {
        e.sprite.parent.removeChild(e.sprite);
      }
    });
    this.enemies = [];
    if (this.boss) {
      this.boss.active = false;
      if (this.boss.destroy) this.boss.destroy();
      // Always remove boss sprite
      if (this.boss.sprite && this.boss.sprite.parent) {
        this.boss.sprite.parent.removeChild(this.boss.sprite);
      }
      this.boss = null;
    }
    // Also clear hijacker
    if (this.hijacker) {
      this.hijacker.active = false;
      if (this.hijacker.destroy) this.hijacker.destroy();
      // Always remove hijacker sprite
      if (this.hijacker.sprite && this.hijacker.sprite.parent) {
        this.hijacker.sprite.parent.removeChild(this.hijacker.sprite);
      }
      this.hijacker = null;
    }
  }
  updateAdaptation(metrics) {
    if (!metrics) return;
    this.adaptation.diagonalShotBias = Math.abs(metrics.avgX) * 0.5;
    this.adaptation.spawnYBias = metrics.bottomRatio > 0.5 ? -100 : 0;
  }

  forceBossStart(level) {
    this.clearEnemies();
    this.currentWaveIndex = this.normalWavesTotal;
    this.phase = 'BOSS';
    this.state = 'BOSS_GATE';
    this.waveEnding = false;
    this.cleanupPhase = 'NONE';
    this.cleanupTimer = 0;
    this.bossGateTimer = 0;
    this.bossSpawnedThisLevel = false;
    this.bossDefeatedThisLevel = false;
    console.log(`[BossPhase] level=${level} phase=${this.phase} forced boss start`);
  }

  ensureBossActive() {
    if (!this.boss || !this.boss.active) return;
    const bossInEnemies = this.enemies.includes(this.boss);
    if (!bossInEnemies) {
      this.enemies.push(this.boss);
      console.warn(`[BossGuard] boss reattached to enemies level=${this.level}`);
    }
    if (this.boss.sprite && !this.boss.sprite.parent) {
      this.container.addChild(this.boss.sprite);
      console.warn(`[BossGuard] boss sprite reattached level=${this.level}`);
    }
    this.boss.sprite.visible = true;
    this.boss.sprite.renderable = true;
  }

  getBossStatus() {
    const bossEntityExists = !!this.boss;
    const bossActive = !!(this.boss && this.boss.active);
    const bossDefeated = bossEntityExists && !this.boss.active;
    const bossInEnemies = bossEntityExists && this.enemies.includes(this.boss);
    const bossContainerChildrenCount = this.boss?.sprite?.children?.length ?? 0;
    return {
      bossEntityExists,
      bossActive,
      bossDefeated,
      bossInEnemies,
      bossContainerChildrenCount
    };
  }

  logBossStatus(tag) {
    const status = this.getBossStatus();
    const bossWaveIndex = this.bossWaveIndex ?? -1;
    console.log(
      `[BossStatus] tag=${tag} level=${this.level} state=${this.state} waveIndex=${this.currentWaveIndex}` +
      ` wavesTotal=${this.normalWavesTotal} bossWaveIndex=${bossWaveIndex} hasBoss=${this.isBossLevel}` +
      ` bossSpawned=${this.bossSpawnedThisLevel} bossActive=${status.bossActive} bossDefeated=${status.bossDefeated}` +
      ` bossEntityExists=${status.bossEntityExists} bossInEnemies=${status.bossInEnemies}` +
      ` bossContainerChildrenCount=${status.bossContainerChildrenCount}`
    );
  }

  getDifficultyScalars(level) {
    const diff = BalanceConfig.difficulty;
    const levelScale = Math.max(0, level - 1);
    return {
      hpScale: diff.baseEnemyHealthMultiplier + levelScale * diff.hpScalePerLevel,
      speedScale: diff.enemySpeedMultiplier + levelScale * diff.enemySpeedPerLevel,
      fireDelayScale: 1 + levelScale * diff.enemyFireDelayPerLevel
    };
  }

  logLevelDifficulty(level, waveCount) {
    const diff = BalanceConfig.difficulty;
    const scalars = this.getDifficultyScalars(level);
    const bossHp = Math.round(diff.bossBaseHealth + level * diff.bossHealthPerLevel);
    console.log(
      `[Difficulty] level=${level} waves=${waveCount} waveDelayMs=${diff.waveDelayMs}` +
      ` countBase=${diff.waveEnemyBase} countScale=${diff.waveEnemyPerLevel} countMax=${diff.waveEnemyMax}` +
      ` hpScale=${scalars.hpScale.toFixed(2)} speedScale=${scalars.speedScale.toFixed(2)} fireDelayScale=${scalars.fireDelayScale.toFixed(2)}` +
      ` fireChance=${diff.enemyFireChance} projSpeed=${diff.enemyProjectileSpeed}` +
      ` bossHp=${bossHp} bossDelay=${diff.bossShootDelayBase}`
    );
  }

  logWaveDifficulty(config) {
    const scalars = this.getDifficultyScalars(this.level);
    const waveIndex = this.currentWaveIndex + 1;
    const waveTotal = this.normalWavesTotal;
    console.log(
      `[DifficultyWave] level=${this.level} wave=${waveIndex}/${waveTotal} type=${config.type}` +
      ` count=${config.count} formation=${config.formation}` +
      ` hpScale=${scalars.hpScale.toFixed(2)} speedScale=${scalars.speedScale.toFixed(2)} fireDelayScale=${scalars.fireDelayScale.toFixed(2)}`
    );
  }
}
