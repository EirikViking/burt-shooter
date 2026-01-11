import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';

export class EnemyManager {
  constructor(container, game, onCap) {
    this.container = container;
    this.game = game;
    this.enemies = [];
    this.spawning = false;
    this.spawnTimer = 0;
    this.spawnDelay = 60;
    this.enemiesToSpawn = 0;
    this.isBossLevel = false;
    this.maxEnemies = 120;
    this.onCap = onCap;
  }

  startLevel(level) {
    this.clearEnemies();

    // Boss every 5th level
    this.isBossLevel = level % 5 === 0;

    if (this.isBossLevel) {
      this.spawnBoss(level);
    } else {
      this.spawning = true;
      this.enemiesToSpawn = 5 + level * 2;
      this.spawnTimer = 0;
      this.spawnDelay = Math.max(20, 60 - level * 2);
    }
  }

  spawnBoss(level) {
    if (this.enemies.length >= this.maxEnemies) {
      if (this.onCap) this.onCap('enemies');
      this.spawning = false;
      return;
    }
    const boss = new Boss(400, 100, level);
    this.enemies.push(boss);
    this.container.addChild(boss.sprite);
    this.spawning = false;
  }

  update(delta) {
    // Spawn enemies
    if (this.spawning && this.enemiesToSpawn > 0) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnDelay) {
        this.spawnEnemy();
        this.spawnTimer = 0;
        this.enemiesToSpawn--;
        if (this.enemiesToSpawn <= 0) {
          this.spawning = false;
        }
      }
    }

    // Update enemies
    const player = this.game.scenes.play.player;
    const playerX = player ? player.x : 400;
    const playerY = player ? player.y : 300;

    this.enemies = this.enemies.filter(enemy => {
      enemy.update(delta, playerX, playerY);

      // Enemy shooting
      if (enemy.canShoot() && Math.random() < 0.02) {
        const bullets = enemy.shoot ? enemy.shoot(playerX, playerY) : [enemy.shoot(playerX, playerY)];
        if (Array.isArray(bullets)) {
          bullets.forEach(bullet => {
            if (bullet) {
              this.game.scenes.play.bulletManager.addEnemyBullet(bullet);
            }
          });
        } else if (bullets) {
          this.game.scenes.play.bulletManager.addEnemyBullet(bullets);
        }
      }

      if (!enemy.active) {
        this.container.removeChild(enemy.sprite);
        return false;
      }
      return true;
    });
  }

  spawnEnemy() {
    if (this.enemies.length >= this.maxEnemies) {
      if (this.onCap) this.onCap('enemies');
      return;
    }
    const level = this.game.level;
    const types = ['gris', 'mongo', 'tufs', 'deili', 'rolp', 'svin'];

    // Choose enemy type based on level
    let type;
    const rand = Math.random();
    if (level < 3) {
      type = rand < 0.7 ? 'gris' : 'mongo';
    } else if (level < 6) {
      type = rand < 0.4 ? 'gris' : rand < 0.7 ? 'mongo' : 'tufs';
    } else if (level < 10) {
      type = rand < 0.3 ? 'gris' : rand < 0.5 ? 'mongo' : rand < 0.7 ? 'tufs' : 'deili';
    } else {
      type = types[Math.floor(Math.random() * types.length)];
    }

    const x = Math.random() * 700 + 50;
    const y = -30;

    const enemy = new Enemy(x, y, type, level);
    this.enemies.push(enemy);
    this.container.addChild(enemy.sprite);
  }

  isLevelComplete() {
    return this.enemies.length === 0 && !this.spawning;
  }

  clearEnemies() {
    this.enemies.forEach(enemy => {
      this.container.removeChild(enemy.sprite);
    });
    this.enemies = [];
  }
}
