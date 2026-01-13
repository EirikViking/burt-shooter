import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { RankAssets } from '../utils/RankAssets.js';
import { BeerAsset } from '../utils/BeerAsset.js';
import { Player } from '../entities/Player.js';
import { BeerCan } from '../entities/BeerCan.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
import { EnemyManager } from '../managers/EnemyManager.js';
import { BulletManager } from '../managers/BulletManager.js';
import { PowerupManager } from '../managers/PowerupManager.js';
import { ParticleManager } from '../effects/ParticleManager.js';
import { ScreenShake } from '../effects/ScreenShake.js';
import { InputManager } from '../input/InputManager.js';
import { TouchControls } from '../input/TouchControls.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';
import {
  extendLevelIntroTexts,
  getAchievementPopup,
  getEnemyTaunt,
  getMicroMessage
} from '../text/phrasePool.js';

export class PlayScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.gameContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    this.container.addChild(this.gameContainer);
    this.container.addChild(this.uiContainer);

    this.inputManager = new InputManager();
    this.touchControls = null;
    this.player = null;
    this.enemyManager = null;
    this.bulletManager = null;
    this.powerupManager = null;
    this.particleManager = null;
    this.screenShake = null;
    this.hud = null;
    this.isPaused = false;
    this.levelAdvancePending = false;
    this.levelAdvanceTimeout = null;
    this.capState = {
      bullets: false,
      enemies: false,
      particles: false
    };
    this.pausePressed = false;
    this.achievementTimer = 0;
    this.tauntTimer = 0;
    this.lowLivesShownFor = null;
    this.ambientBeerTimer = 0;
    this.easterEggTimer = 0;
    this.ambientBeers = []; // Lists for update
    this.easterEggBeer = null;
    this.isReady = false;

    // Voice throttle
    this.lastRankVoiceTime = 0;

    // Score Boost State
    this.scoreMultiplier = 1;
    this.scoreBoostTimer = 0;

    // White Can State
    this.lastWhiteCanTime = 0;
    this.hasActiveWhiteCan = false;
  }

  init() {
    this.isReady = false;
    this.gameContainer.removeChildren();
    this.uiContainer.removeChildren();
    this.uiContainer.sortableChildren = true;

    // --- Hud & UI ---
    this.hud = new HUD(this.uiContainer, this.game);
    // Note: HUD creates itself in constructor

    // Internal Debug Stats
    this.debugStats = {
      beerPickupsSpawned: 0,
      beerPickupsCollected: 0,
      beerBossSpawned: 0,
      photoEnemiesSpawned: 0,
      legendaryFlybyTriggered: 0
    };

    this.gameTime = 0;
    this.levelAdvancePending = false;
    this.levelAdvanceTimeout = null;
    this.capState = { bullets: false, enemies: false, particles: false };

    const { width, height } = this.game.app.screen;

    // Initialize managers
    const capHandler = this.logCap.bind(this);
    this.bulletManager = new BulletManager(this.gameContainer, capHandler);
    this.bulletManager.setScreenBounds(width, height);
    this.particleManager = new ParticleManager(this.gameContainer, capHandler);
    this.powerupManager = new PowerupManager(this.gameContainer, this.game);
    this.screenShake = new ScreenShake(this.gameContainer);

    // Initial load of ships AND Ranks
    Promise.all([
      GameAssets.loadShips(),
      RankAssets.preloadAll()
    ]).then(() => {
      // Create player AFTER ships are loaded to ensure texture is ready
      if (this.player) {
        this.gameContainer.removeChild(this.player.sprite);
      }
      this.player = new Player(width / 2, height - 100, this.inputManager, this.game);
      this.gameContainer.addChild(this.player.sprite);
      console.log('[PlayScene] Assets (Ships+Ranks) ready');
    });

    // Create placeholder player immediately (will be replaced)
    if (!this.player) {
      this.player = new Player(width / 2, height - 100, this.inputManager, this.game);
      this.gameContainer.addChild(this.player.sprite);
    }

    // Create enemy manager
    this.enemyManager = new EnemyManager(this.gameContainer, this.game, capHandler);

    // Ensure Assets are ready for gameplay
    GameAssets.ensureBeerTexture().then(tex => {
      if (!GameAssets.isValidTexture(tex)) {
        console.error('[PlayScene] Beer texture failed to load.');
      } else {
        console.log('[PlayScene] Beer texture ready.');
      }
    });
    GameAssets.loadPhotos();

    // Initialize touch controls
    this.touchControls = new TouchControls(this.uiContainer, this.game);
    this.touchControls.init();

    // Add Debug Keys
    window.addEventListener('keydown', (e) => this.handleDebugKeys(e));

    // Start first level
    this.startLevel();

    this.isReady = true;
  }

  handleDebugKeys(e) {
    if (e.key === 'F1') {
      console.log('DEBUG STATS:', this.debugStats);
      this.showToast('DEBUG STATS LOGGED (Console)', { fontSize: 20 });
    }
    if (e.key === 'F2') {
      this.powerupManager.spawn(this.player.x, 100);
      this.showToast('SPAWNED BEER PICKUP', { fontSize: 20 });
    }
    if (e.key === 'F3') {
      this.enemyManager.spawnBoss(this.game.level);
      this.showToast('SPAWNED BOSS', { fontSize: 20 });
    }
    if (e.key === 'F4') {
      for (let i = 0; i < 5; i++) this.enemyManager.spawnEnemy();
      this.showToast('SPAWNED ENEMIES', { fontSize: 20 });
    }
    if (e.key === 'F5') {
      this.spawnEasterEgg();
      this.showToast('TRIGGERED FLYBY', { fontSize: 20 });
    }
  }

  startLevel() {
    this.levelAdvancePending = false;
    if (this.levelAdvanceTimeout) {
      clearTimeout(this.levelAdvanceTimeout);
      this.levelAdvanceTimeout = null;
    }

    // Update music for the new level
    AudioManager.playMusicContext('gameplay');
    this.powerupManager.checkLevelReset(this.game.level); // Reset powerup caps

    this.enemyManager.startLevel(this.game.level);
    this.showLevelIntro();
    this.showToast(getMicroMessage('levelStart'), { fontSize: 20, y: this.game.getHeight() * 0.25 });
    this.showToast(getMicroMessage('newWave'), { fontSize: 22, y: this.game.getHeight() * 0.35 });

    if (this.game.level % 5 === 0) {
      this.showToast(getMicroMessage('bossIntro'), { fontSize: 26, y: this.game.getHeight() * 0.4 });
    }

    this.resetRandomTimers();
    this.ambientBeerTimer = 2000 + Math.random() * 3000; // First drunk beer VERY soon (2-5s)
    this.easterEggTimer = 20000; // Deterministic first flyby at 20s
  }

  showLevelIntro() {
    const { width, height } = this.game.app.screen;

    const levelTexts = [
      'Wave 1: Grunnleggende gris',
      'Wave 2: Mongo intensifiserer',
      'Wave 3: Deili fetta kommer inn',
      'Wave 4: R\u00f8lp mode aktiverer',
      'BOSS: MEGA TUFS',
      'Wave 6: Tilbake til Melbu',
      'Wave 7: Stokmarknes raids',
      'Wave 8: Kj\u00f8ttdeig overload',
      'Wave 9: Isbjørn chaos',
      'BOSS: ULTIMATE SVIN'
    ];
    const introList = extendLevelIntroTexts(levelTexts, this.game.level, this.game.level % 5 === 0);

    const text = new PIXI.Text(
      introList[(this.game.level - 1) % introList.length] || `LEVEL ${this.game.level}`,
      {
        fontFamily: 'Courier New',
        fontSize: 48,
        fill: '#ffff00',
        stroke: '#ff8800',
        strokeThickness: 3,
        dropShadow: true,
        dropShadowColor: '#ffff00',
        dropShadowBlur: 10
      }
    );
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = height / 2;
    text.alpha = 0;
    this.container.addChild(text);

    // Fade in/out animation
    let elapsed = 0;
    const duration = 2000;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.6;

      if (elapsed < 500) {
        text.alpha = elapsed / 500;
      } else if (elapsed > duration - 500) {
        text.alpha = (duration - elapsed) / 500;
      } else {
        text.alpha = 1;
      }

      if (elapsed >= duration) {
        this.game.app.ticker.remove(ticker);
        this.container.removeChild(text);
      }
    };
    this.game.app.ticker.add(ticker);
  }

  update(delta) {
    if (!Number.isFinite(delta) || delta > 100 || delta < 0) return;
    if (!this.isReady) return;

    try {
      this.gameTime += delta / 60;

      // Score Boost Timer
      if (this.scoreBoostTimer > 0) {
        this.scoreBoostTimer -= delta * 16.67;
        if (this.scoreBoostTimer <= 0) {
          this.scoreMultiplier = 1;
          this.showToast("SCORE BOOST ENDED", { fontSize: 20, fill: '#cccccc' });
        }
      }

      this.handlePauseToggle();
      if (this.isPaused) return;

      // Mobile inputs
      if (this.touchControls && this.touchControls.active) {
        const movement = this.touchControls.getMovement();
        this.inputManager.setKeyPressed('KeyA', movement.dx < -0.3);
        this.inputManager.setKeyPressed('KeyD', movement.dx > 0.3);
        this.inputManager.setKeyPressed('KeyW', movement.dy < -0.3);
        this.inputManager.setKeyPressed('KeyS', movement.dy > 0.3);
      }

      // Player update
      if (this.game.lives > 0 && this.player) {
        this.player.update(delta);
      }

      // Fire logic
      const firePressed = this.inputManager.isFiring() ||
        (this.touchControls && this.touchControls.isFirePressed());

      if (firePressed && this.player) {
        if (this.player.canShoot()) {
          const bullets = this.player.shoot();
          bullets.forEach(bullet => this.bulletManager.addPlayerBullet(bullet));
          AudioManager.playSfx('shoot_small');
        }
      }

      // Managers update
      if (this.bulletManager) this.bulletManager.update(delta);
      if (this.enemyManager) this.enemyManager.update(delta);
      if (this.powerupManager) this.powerupManager.update(delta);
      if (this.particleManager) this.particleManager.update(delta);
      if (this.screenShake) this.screenShake.update(delta);

      // Audio Update (Sequencer)
      if (AudioManager && AudioManager.update) AudioManager.update(delta);

      // Tractor beam
      // Tractor Beam Removed

      // Adaptive Enemy Feature: Track Player Position
      this.updatePlayerMetrics(delta);

      this.checkCollisions();

      // Level progression
      // Level progression
    }, i * 100);
  }

  if(this.enemyManager.isBossLevel) this.showWantedPoster();

this.levelAdvanceTimeout = setTimeout(() => {
  this.levelAdvancePending = false;
  this.levelAdvanceTimeout = null;
  this.game.nextLevel();
}, 3000); // Increased wait time for celebration
      }

this.hud.update();
this.updateAmbientBeers(delta); // Handles both Red Hazards and White Powerups
this.updateEasterEgg(delta);
this.updateRandomPopups(delta);
this.checkLowLives();

    } catch (e) {
  console.error('GAME LOOP CRASH:', e);
  if (this.game && this.game.app && this.game.app.ticker) {
    this.game.app.ticker.stop();
  }
  this.showErrorOverlay(e);
}
  }

onRankUp(newRank) {
  this.showRankUp();
}

showRankUp() {
  // Visuals
  const rank = this.game.rankIndex;
  const msg = `RANK UP! ${rank}`;
  this.showToast(msg, { fontSize: 32, fill: '#ffff00', y: this.game.getHeight() * 0.15 });

  // Ship Swap
  if (this.player) {
    this.player.swapSprite();
  }

  // SFX
  AudioManager.playSfx('pickup'); // Placeholder for "good event"

  // Voice (Throttled 20s)
  const now = Date.now();
  if (now - this.lastRankVoiceTime > 20000) {
    AudioManager.playVoice('mission_complete');
    this.lastRankVoiceTime = now;
  }

  // Particles
  if (this.player && this.player.active) {
    this.particleManager.createExplosion(this.player.x, this.player.y, 0xffff00);
    // Screen flash?
    const flash = new PIXI.Graphics();
    flash.rect(0, 0, this.game.getWidth(), this.game.getHeight()).fill({ color: 0xffff00, alpha: 0.2 });
    this.uiContainer.addChild(flash);
    setTimeout(() => this.uiContainer.removeChild(flash), 100);
  }
}

showErrorOverlay(e) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.width = '100%';
  div.style.height = '100%';
  div.style.background = 'rgba(50, 0, 0, 0.9)';
  div.style.color = '#ff5555';
  div.style.padding = '20px';
  div.style.zIndex = '99999';
  div.innerHTML = `<h1>GAME LOOP CRASH</h1><pre>${e.message}\n\n${e.stack}</pre>`;
  document.body.appendChild(div);
}

checkCollisions() {
  const { width, height } = this.game.app.screen;

  // Safety checks for managers
  if (!this.bulletManager || !this.enemyManager || !this.powerupManager || !this.player) return;

  // Player bullets vs enemies
  this.bulletManager.playerBullets.forEach(bullet => {
    if (bullet.active) {
      this.enemyManager.enemies.forEach(enemy => {
        if (enemy.active && this.checkCollision(bullet, enemy)) {
          bullet.active = false;
          const destroyed = enemy.takeDamage(bullet.damage);

          if (destroyed) {
            // XP Logic handled by score now

            // Feature: Slow Time Trade-off
            if (this.player.activePowerup && this.player.activePowerup.type !== 'slow_time') {
              this.game.addScore(enemy.scoreValue * this.scoreMultiplier);
            }
            this.particleManager.createExplosion(enemy.x, enemy.y, enemy.color);
            AudioManager.playSfx('enemy_explode');
            this.screenShake.shake(3);

            // Powerup Drop Check (Manager handles chance & guarantees)
            this.powerupManager.spawn(enemy.x, enemy.y);
          } else {
            this.particleManager.createHitSpark(enemy.x, enemy.y);
            AudioManager.playSfx('hit');
          }
        }
      });
    }
  });

  // Enemy bullets vs player
  this.bulletManager.enemyBullets.forEach(bullet => {
    if (bullet.active && this.player.active) {
      if (this.checkCollision(bullet, this.player)) {
        // Feature: Ghost Ship prevents hit
        if (this.player.activePowerup && this.player.activePowerup.type === 'ghost') return;

        bullet.active = false;
        if (!this.player.invulnerable) {
          const damageTaken = this.player.takeDamage();
          if (damageTaken) {
            this.game.loseLife();
            this.particleManager.createExplosion(this.player.x, this.player.y, 0x00ffff);
            AudioManager.playSfx('playerHit');
            this.screenShake.shake(8);
          } else {
            // Shield absorbed it
            this.screenShake.shake(3);
            this.particleManager.createHitSpark(this.player.x, this.player.y);
          }
        }
      }
    }
  });

  // Ambient Beers (Hazard RED or Powerup WHITE)
  this.ambientBeers.forEach(beer => {
    if (beer.active && this.player.active) {
      if (this.checkCollision(beer, this.player)) {
        if (beer.type === 'POWERUP') {
          // Collect!
          beer.collect(this.player, this);
          this.hasActiveWhiteCan = false; // Reset spawn flag
        } else {
          // HAZARD
          // Feature: Ghost Ship prevents hit
          if (this.player.activePowerup && this.player.activePowerup.type === 'ghost') return;

          // FATAL COLLISION
          beer.active = false;

          if (!this.player.invulnerable) {
            const damageTaken = this.player.takeDamage();
            if (damageTaken) {
              this.game.loseLife();
              this.particleManager.createExplosion(this.player.x, this.player.y, 0x00ffff);
              AudioManager.playSfx('playerHit');
              this.screenShake.shake(8);
            } else {
              this.screenShake.shake(3);
              this.particleManager.createHitSpark(this.player.x, this.player.y);
            }
          }
          this.particleManager.createExplosion(beer.x, beer.y, 0xffaa00);
          this.showToast('OUCH!', { fontSize: 20, fill: '#ff0000' });
        }
      }
    }
  });

  // Player bullets vs Ambient Beer (Shoot them down for points)
  this.bulletManager.playerBullets.forEach(bullet => {
    if (bullet.active) {
      this.ambientBeers.forEach(beer => {
        if (beer.active && this.checkCollision(bullet, beer)) {
          bullet.active = false;
          beer.hp--;
          if (beer.hp <= 0) {
            beer.active = false;
            if (this.player.activePowerup && this.player.activePowerup.type !== 'slow_time') {
              this.game.addScore(500 * this.scoreMultiplier);
            }
            this.particleManager.createExplosion(beer.x, beer.y, 0xffaa00);
            AudioManager.playSfx('enemy_explode');
            this.showToast('BEER SMASH!', { fontSize: 18, y: beer.y, fill: '#ffff00' });
          } else {
            this.particleManager.createHitSpark(beer.x, beer.y);
          }
        }
      });
    }
  });

  // Enemies vs player
  this.enemyManager.enemies.forEach(enemy => {
    if (enemy.active && this.player.active) {
      if (this.checkCollision(enemy, this.player)) {
        // Feature: Ghost Ship prevents hit
        if (this.player.activePowerup && this.player.activePowerup.type === 'ghost') return;

        enemy.active = false;
        if (!this.player.invulnerable) {
          const damageTaken = this.player.takeDamage();
          if (damageTaken) {
            this.game.loseLife();
            this.particleManager.createExplosion(this.player.x, this.player.y, 0x00ffff);
            AudioManager.playSfx('playerHit');
            this.screenShake.shake(8);
          } else {
            this.screenShake.shake(3);
            this.particleManager.createHitSpark(this.player.x, this.player.y);
          }
        }
        this.particleManager.createExplosion(enemy.x, enemy.y, enemy.color);
      }
    }
  });

  // Powerups vs player
  this.powerupManager.powerups.forEach(powerup => {
    if (powerup.active && this.player.active) {
      if (this.checkCollision(powerup, this.player)) {
        powerup.collect(this.player, this);
        AudioManager.playSfx('pickup');
        this.particleManager.createPickupEffect(powerup.x, powerup.y, powerup.color);
      }
    }
  });
}

updatePlayerMetrics(delta) {
  if (!this.playerMetrics) {
    this.playerMetrics = {
      totalX: 0,
      samples: 0,
      bottomTime: 0,
      totalTime: 0,
      sampleTimer: 0
    };
  }

  const metrics = this.playerMetrics;
  const { width, height } = this.game.app.screen;

  // Sample every 1s (60 frames approx) to save perf, or just run lightly every frame
  // Let's sample continuously but aggregate
  metrics.sampleTimer += delta;
  if (metrics.sampleTimer >= 60) { // Approx 1 sec
    metrics.sampleTimer = 0;
    metrics.samples++;
    metrics.totalX += this.player.x;

    // Bottom 25% check
    if (this.player.y > height * 0.75) {
      metrics.bottomTime++;
    }

    metrics.totalTime++;

    // Pass simple derived metrics to enemy manager
    const avgX = metrics.totalX / metrics.samples;
    const bottomRatio = metrics.bottomTime / Math.max(1, metrics.totalTime);

    // Normalize X (-1 left, 0 center, 1 right)
    const normalizedX = (avgX - width / 2) / (width / 2);

    this.enemyManager.updateAdaptation({
      avgX: normalizedX,
      bottomRatio: bottomRatio
    });
  }
}

checkCollision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = (a.radius || 10) + (b.radius || 10);
  return distance < minDistance;
}

destroy() {
  if (this.levelAdvanceTimeout) {
    clearTimeout(this.levelAdvanceTimeout);
    this.levelAdvanceTimeout = null;
  }
  this.inputManager.destroy();
  if (this.touchControls) {
    this.touchControls.destroy();
    this.touchControls = null;
  }
  if (this.hud) {
    this.hud.destroy();
  }
  // Music continues to next scene
}

getPerfCounts() {
  return {
    bullets: this.bulletManager ? this.bulletManager.getTotalCount() : 0,
    enemies: this.enemyManager ? this.enemyManager.enemies.length : 0,
    particles: this.particleManager ? this.particleManager.particles.length : 0,
    children: this.gameContainer ? this.gameContainer.children.length : 0
  };
}

logCap(type) {
  if (!this.capState[type]) {
    this.capState[type] = true;
    const counts = this.getPerfCounts();
    console.warn(`CAP bullets=${counts.bullets} enemies=${counts.enemies} particles=${counts.particles}`);
  }
}

handlePauseToggle() {
  const pressed = this.inputManager.isKeyPressed('KeyP');
  if (pressed && !this.pausePressed) {
    this.isPaused = !this.isPaused;
    this.showToast(getMicroMessage(this.isPaused ? 'pause' : 'resume'), {
      fontSize: 26,
      y: this.game.getHeight() * 0.45
    });
  }
  this.pausePressed = pressed;
}

resetRandomTimers() {
  this.achievementTimer = this.getRandomTimer(8000, 14000);
  this.tauntTimer = this.getRandomTimer(6000, 11000);
}

updateRandomPopups(delta) {
  if (this.achievementTimer > 0) {
    this.achievementTimer -= delta * 16.67;
  } else {
    this.showToast(getAchievementPopup(), { fontSize: 20, y: 70 });
    this.achievementTimer = this.getRandomTimer(12000, 20000);
  }

  if (this.tauntTimer > 0) {
    this.tauntTimer -= delta * 16.67;
  } else {
    this.showToast(getEnemyTaunt(), { fontSize: 18, y: 110 });
    this.tauntTimer = this.getRandomTimer(9000, 15000);
  }
}

checkLowLives() {
  if (this.game.lives <= 1 && this.lowLivesShownFor !== this.game.lives) {
    this.lowLivesShownFor = this.game.lives;
    this.showToast(getMicroMessage('lowHealth'), { fontSize: 22, y: this.game.getHeight() * 0.3 });
  }
}

onLifeLost() {
  this.showToast(getMicroMessage('lifeLost'), { fontSize: 22, y: this.game.getHeight() * 0.32 });

  // RESPONDER LOGIC
  if (this.player && this.game.lives > 0) {
    this.player.forceRespawn(this.game.getWidth(), this.game.getHeight());
    // Small screen shake
    if (this.screenShake) this.screenShake.shake(5);
  }
}

getRandomTimer(minMs, maxMs) {
  return minMs + Math.random() * (maxMs - minMs);
}

showToast(message, options = {}) {
  const { width, height } = this.game.app.screen;
  const fontSize = options.fontSize || 24;
  const y = options.y || height * 0.2;
  const maxWidth = width * 0.9;

  const text = new PIXI.Text(message, {
    fontFamily: 'Courier New',
    fontSize,
    fill: options.fill || '#ffffff',
    align: 'center',
    wordWrap: true,
    wordWrapWidth: maxWidth,
    lineHeight: fontSize + 6
  });
  text.anchor.set(0.5);
  text.x = width / 2;
  text.y = y;
  text.alpha = 0;

  if (text.width > maxWidth) {
    const scale = maxWidth / text.width;
    text.scale.set(scale);
  }

  this.container.addChild(text);

  let elapsed = 0;
  const duration = options.duration || 2200;
  const ticker = (delta) => {
    elapsed += delta.deltaTime * 16.67;

    if (elapsed < 250) {
      text.alpha = elapsed / 250;
    } else if (elapsed > duration - 350) {
      text.alpha = Math.max(0, (duration - elapsed) / 350);
    } else {
      text.alpha = 1;
    }

    if (elapsed >= duration) {
      this.game.app.ticker.remove(ticker);
      this.container.removeChild(text);
    }
  };
  this.game.app.ticker.add(ticker);
}
updateAmbientBeers(delta) {
  // 1. Spawning Hazard Beers (Red)
  this.ambientBeerTimer -= delta * 16.67;
  if (this.ambientBeerTimer <= 0) {
    this.spawnAmbientBeer('HAZARD');
    this.ambientBeerTimer = 4000 + Math.random() * 4000;
  }

  // 2. Spawn White Can (Powerup) Logic
  const config = BalanceConfig.powerups.whiteCan;
  const now = Date.now();
  const runTime = this.gameTime * 1000; // approx ms

  // Conditions:
  // - Not waiting for cooldown
  // - Game time > 20s
  // - No white can currently exists
  // - Player not already boosted (optional, but requested "If player already has the same active effect, do NOT spawn" - checking boost simpler here)
  if (!this.hasActiveWhiteCan &&
    now - this.lastWhiteCanTime > config.cooldown &&
    runTime > config.minTime &&
    this.scoreMultiplier === 1) { // Don't spawn if boost active

    if (Math.random() < config.spawnChance) {
      this.spawnAmbientBeer('POWERUP');
      this.lastWhiteCanTime = now;
      this.hasActiveWhiteCan = true;
      this.showToast("BONUS CAN APPEARED!", { fontSize: 24, fill: '#ffffff', y: 100 });
    }
  }

  // Update existing
  this.ambientBeers = this.ambientBeers.filter(beer => {
    // Check if manually removed or destroyed
    if (!beer.active) {
      if (beer.sprite && beer.sprite.parent) beer.sprite.parent.removeChild(beer.sprite);
      if (beer.type === 'POWERUP' && !beer.active) this.hasActiveWhiteCan = false; // Reset if despot
      return false;
    }

    beer.update(delta);
    return true;
  });
}

spawnAmbientBeer(type) {
  // Use BeerCan class
  const x = Math.random() * (this.game.getWidth() - 100) + 50;
  const y = -50;

  const beer = new BeerCan(x, y, this.game, type);
  this.gameContainer.addChild(beer.sprite);
  this.ambientBeers.push(beer);
}

updateEasterEgg(delta) {
  this.easterEggTimer -= delta * 16.67;
  if (this.easterEggTimer <= 0 && !this.easterEggBeer) {
    this.spawnEasterEgg();
  }

  if (this.easterEggBeer) {
    const egg = this.easterEggBeer;
    egg.x += egg.vx * delta;
    egg.y += egg.vy * delta;
    egg.sprite.x = egg.x;
    egg.sprite.y = egg.y;
    egg.sprite.rotation += 0.01 * delta;

    if (egg.x > this.game.getWidth() + 200 || egg.y > this.game.getHeight() + 200) {
      this.gameContainer.removeChild(egg.sprite);
      this.easterEggBeer = null;
      this.easterEggTimer = 45000 + Math.random() * 30000; // Reset timer
    }
  }
}

spawnEasterEgg() {
  // Legendary Flyby - Eirik & Kurt
  // Use one of the photos
  const photos = ['eirik_kurt2', 'burtelurt', 'eriikviking'];
  const picked = photos[Math.floor(Math.random() * photos.length)];
  const tex = GameAssets.getPhoto(picked);

  if (!GameAssets.isValidTexture(tex)) return;

  const sprite = new PIXI.Sprite(tex);
  sprite.anchor.set(0.5);
  // Scale based on photo aspect
  const aspect = tex.width / tex.height;
  sprite.height = 300;
  sprite.width = 300 * aspect;

  sprite.alpha = 0.4;
  sprite.zIndex = 0; // Behind UI

  const startLeft = Math.random() < 0.5;

  const egg = {
    sprite: sprite,
    x: startLeft ? -300 : this.game.getWidth() + 300,
    y: Math.random() * (this.game.getHeight() - 200) + 100,
    vx: startLeft ? 1 : -1,
    vy: (Math.random() - 0.5) * 0.5
  };

  sprite.x = egg.x;
  sprite.y = egg.y;

  this.gameContainer.addChildAt(sprite, 0);
  this.easterEggBeer = egg;

  this.showToast('LEGENDARY SIGHTING!', { fontSize: 24, fill: '#ff00ff' });
  AudioManager.playSfx('pickup');
}

showWantedPoster() {
  const tex = GameAssets.getPhoto('burtelurt') || GameAssets.getPhoto('kurt2');
  if (!tex) return;

  const poster = new PIXI.Container();

  const bg = new PIXI.Graphics();
  bg.rect(-200, -250, 400, 500);
  bg.fill({ color: 0xffffff });
  bg.stroke({ color: 0x000000, width: 4 });
  poster.addChild(bg);

  const sprite = new PIXI.Sprite(tex);
  sprite.anchor.set(0.5);
  const aspect = tex.width / tex.height;
  sprite.width = 360;
  sprite.height = 360 / aspect;
  if (sprite.height > 350) {
    sprite.height = 350;
    sprite.width = 350 * aspect;
  }
  sprite.y = -20;
  poster.addChild(sprite);

  const topText = new PIXI.Text('WANTED', {
    fontFamily: 'Courier New',
    fontSize: 40,
    fill: 'black',
    fontWeight: 'bold'
  });
  topText.anchor.set(0.5);
  topText.y = -200;
  poster.addChild(topText);

  const bottomText = new PIXI.Text('DEFEATED', {
    fontFamily: 'Courier New',
    fontSize: 30,
    fill: 'red',
    fontWeight: 'bold',
    rotation: -0.2
  });
  bottomText.anchor.set(0.5);
  bottomText.y = 180;
  poster.addChild(bottomText);

  poster.x = this.game.getWidth() / 2;
  poster.y = this.game.getHeight() / 2;
  poster.rotation = (Math.random() - 0.5) * 0.2;

  this.uiContainer.addChild(poster);

  // Animate Pop
  poster.scale.set(0.1);
  let t = 0;
  const animate = (delta) => {
    t += 0.1;
    if (t < 1.5) {
      poster.scale.set(Math.min(1, poster.scale.x + 0.1));
    } else if (t > 20) {
      poster.alpha -= 0.05;
      if (poster.alpha <= 0) {
        this.game.app.ticker.remove(animate);
        this.uiContainer.removeChild(poster);
      }
    }
  };
  this.game.app.ticker.add(animate);
  AudioManager.play('menuSelect');
}
}
