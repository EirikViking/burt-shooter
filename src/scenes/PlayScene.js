import * as PIXI from 'pixi.js';
import { Player } from '../entities/Player.js';
import { EnemyManager } from '../managers/EnemyManager.js';
import { BulletManager } from '../managers/BulletManager.js';
import { PowerupManager } from '../managers/PowerupManager.js';
import { ParticleManager } from '../effects/ParticleManager.js';
import { ScreenShake } from '../effects/ScreenShake.js';
import { InputManager } from '../input/InputManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';

export class PlayScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.gameContainer = new PIXI.Container();
    this.container.addChild(this.gameContainer);

    this.inputManager = new InputManager();
    this.player = null;
    this.enemyManager = null;
    this.bulletManager = null;
    this.powerupManager = null;
    this.particleManager = null;
    this.screenShake = null;
    this.hud = null;
    this.isPaused = false;
  }

  init() {
    this.gameContainer.removeChildren();

    const { width, height } = this.game.app.screen;

    // Initialize managers
    this.bulletManager = new BulletManager(this.gameContainer);
    this.particleManager = new ParticleManager(this.gameContainer);
    this.powerupManager = new PowerupManager(this.gameContainer, this.game);
    this.screenShake = new ScreenShake(this.gameContainer);

    // Create player
    this.player = new Player(width / 2, height - 100, this.inputManager);
    this.gameContainer.addChild(this.player.sprite);

    // Create enemy manager
    this.enemyManager = new EnemyManager(this.gameContainer, this.game);

    // Create HUD
    this.hud = new HUD(this.container, this.game);

    // Start first level
    this.startLevel();

    AudioManager.playMusic('game');
  }

  startLevel() {
    this.enemyManager.startLevel(this.game.level);
    this.showLevelIntro();
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

    const text = new PIXI.Text(
      levelTexts[(this.game.level - 1) % levelTexts.length] || `LEVEL ${this.game.level}`,
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
      elapsed += delta.deltaTime * 16.67;

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
    if (this.isPaused) return;

    // Update player
    this.player.update(delta);

    // Player shooting
    if (this.inputManager.isKeyPressed('Space') || this.inputManager.isKeyPressed('shoot')) {
      if (this.player.canShoot()) {
        const bullets = this.player.shoot();
        bullets.forEach(bullet => this.bulletManager.addPlayerBullet(bullet));
        AudioManager.play('shoot');
      }
    }

    // Update managers
    this.bulletManager.update(delta);
    this.enemyManager.update(delta);
    this.powerupManager.update(delta);
    this.particleManager.update(delta);
    this.screenShake.update(delta);

    // Collision detection
    this.checkCollisions();

    // Check level completion
    if (this.enemyManager.isLevelComplete() && !this.enemyManager.spawning) {
      setTimeout(() => this.game.nextLevel(), 2000);
    }

    // Update HUD
    this.hud.update();
  }

  checkCollisions() {
    const { width, height } = this.game.app.screen;

    // Player bullets vs enemies
    this.bulletManager.playerBullets.forEach(bullet => {
      if (bullet.active) {
        this.enemyManager.enemies.forEach(enemy => {
          if (enemy.active && this.checkCollision(bullet, enemy)) {
            bullet.active = false;
            const destroyed = enemy.takeDamage(bullet.damage);

            if (destroyed) {
              this.game.addScore(enemy.scoreValue);
              this.particleManager.createExplosion(enemy.x, enemy.y, enemy.color);
              AudioManager.play('explosion');
              this.screenShake.shake(3);

              // Chance to drop powerup
              if (Math.random() < 0.15) {
                this.powerupManager.spawn(enemy.x, enemy.y);
              }
            } else {
              this.particleManager.createHitSpark(enemy.x, enemy.y);
              AudioManager.play('hit');
            }
          }
        });
      }
    });

    // Enemy bullets vs player
    this.bulletManager.enemyBullets.forEach(bullet => {
      if (bullet.active && this.player.active) {
        if (this.checkCollision(bullet, this.player)) {
          bullet.active = false;
          if (!this.player.invulnerable) {
            this.player.takeDamage();
            this.game.loseLife();
            this.particleManager.createExplosion(this.player.x, this.player.y, 0x00ffff);
            AudioManager.play('playerHit');
            this.screenShake.shake(8);
          }
        }
      }
    });

    // Enemies vs player
    this.enemyManager.enemies.forEach(enemy => {
      if (enemy.active && this.player.active) {
        if (this.checkCollision(enemy, this.player)) {
          enemy.active = false;
          if (!this.player.invulnerable) {
            this.player.takeDamage();
            this.game.loseLife();
            this.particleManager.createExplosion(this.player.x, this.player.y, 0x00ffff);
            AudioManager.play('playerHit');
            this.screenShake.shake(8);
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
          AudioManager.play('powerup');
          this.particleManager.createPickupEffect(powerup.x, powerup.y, powerup.color);
        }
      }
    });
  }

  checkCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (a.radius || 10) + (b.radius || 10);
    return distance < minDistance;
  }

  destroy() {
    this.inputManager.destroy();
    AudioManager.stopMusic();
  }
}
