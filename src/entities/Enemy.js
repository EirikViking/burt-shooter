import * as PIXI from 'pixi.js';
import { Bullet } from './Bullet.js';
import { GameAssets } from '../utils/GameAssets.js';
import { AssetManifest } from '../assets/assetManifest.js';
// TASK 3: Import difficulty multiplier
import { BalanceConfig } from '../config/BalanceConfig.js';
import { enhanceEnemyVisuals } from '../utils/EnemyVisualEnhancer.js';

const ENABLE_ENEMY_WEAPON_FX_VARIETY = true;

export class Enemy {
  constructor(x, y, type, level, game, waveColor = null) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = level;
    this.game = game;
    this.waveColor = waveColor; // 'Blue', 'Green', 'Red', 'Black'
    this.active = true;
    this.radius = 15;

    // CLEANUP FIX: Add kind tag for cleanup targeting
    this.kind = (type === 'beer_challenge') ? 'beer_can' : 'enemy';
    this.vx = 0;
    this.vy = 0;
    this.health = 1;
    this.maxHealth = 1;
    this.shootCooldown = 0;
    this.shootDelay = 120;
    this.movePattern = 'sine';
    this.moveTimer = 0;
    this.scoreValue = 10;
    this.slow_time = 0;

    // GALAGA STATE MACHINE
    this.state = 'ENTRY';
    this.formationX = x;
    this.formationY = y;

    this.entryCurve = null;
    this.diveCurve = null;
    this.returnCurve = null;

    this.idlePhase = Math.random() * Math.PI * 2;
    this.spriteKey = null;
    this.xtraType = 1; // 1-5
    this.usingXtraAsset = false;

    this.setupByType();
    this.createSprite();
  }

  setupByType() {
    switch (this.type) {
      case 'gris':
        this.color = 0xff69b4;
        this.health = 2;
        this.maxHealth = 2;
        this.scoreValue = 15;
        this.speed = 0.85;
        this.shootDelay = 120;
        this.xtraType = 1;
        break;

      case 'mongo':
        this.color = 0x8b4513;
        this.health = 3;
        this.maxHealth = 3;
        this.scoreValue = 25;
        this.speed = 1.1;
        this.shootDelay = 90;
        this.radius = 18;
        this.xtraType = 2;
        break;

      case 'tufs':
        this.color = 0xffaa00;
        this.health = 4;
        this.maxHealth = 4;
        this.scoreValue = 40;
        this.speed = 0.65;
        this.shootDelay = 60;
        this.radius = 20;
        this.movePattern = 'zigzag';
        this.xtraType = 3;
        break;

      case 'deili':
        this.color = 0x00ff00;
        this.health = 5;
        this.maxHealth = 5;
        this.scoreValue = 60;
        this.speed = 1.35;
        this.shootDelay = 80;
        this.radius = 16;
        this.movePattern = 'circle';
        this.xtraType = 4;
        break;

      case 'rolp':
        this.color = 0xff00ff;
        this.health = 6;
        this.maxHealth = 6;
        this.scoreValue = 80;
        this.speed = 0.9;
        this.shootDelay = 50;
        this.radius = 22;
        this.movePattern = 'drunk';
        this.xtraType = 5;
        break;

      case 'svin':
        this.color = 0xff0000;
        this.health = 10;
        this.maxHealth = 10;
        this.scoreValue = 120;
        this.speed = 0.35;
        this.shootDelay = 90;
        this.radius = 25;
        this.movePattern = 'aggressive';
        this.xtraType = 5;
        break;

      case 'beer_challenge':
        this.color = 0xffd700; // Gold
        this.health = 5;
        this.maxHealth = 5;
        this.scoreValue = 500;
        this.speed = 1.2;
        this.shootDelay = 60;
        this.radius = 25;
        this.movePattern = 'aggressive';
        this.spriteKey = 'beer_challenge';
        this.xtraType = 1;
        break;
    }

    // TASK 3: Apply difficulty scalars
    const diff = BalanceConfig.difficulty;
    const levelScale = Math.max(0, this.level - 1);
    const hpScale = diff.baseEnemyHealthMultiplier + levelScale * diff.hpScalePerLevel;
    const speedScale = diff.enemySpeedMultiplier + levelScale * diff.enemySpeedPerLevel;
    const fireDelayScale = 1 + levelScale * diff.enemyFireDelayPerLevel;
    const globalMult = BalanceConfig.DIFFICULTY_MULTIPLIER;

    this.health = Math.ceil(this.health * hpScale);
    this.maxHealth = this.health;
    this.speed *= speedScale * globalMult;
    this.shootDelay = (this.shootDelay * fireDelayScale) / globalMult;

    // Sprite Selection
    if (this.type === 'beer_challenge') {
      this.spriteKey = 'beer_challenge';
    } else {
      const r = Math.random();
      if (this.type === 'gris' || this.type === 'mongo') {
        const idx = 1 + Math.floor(Math.random() * 3);
        this.spriteKey = `spaceShips_00${idx}`;
      } else if (this.type === 'tufs' || this.type === 'deili') {
        const idx = 4 + Math.floor(Math.random() * 3);
        this.spriteKey = `spaceShips_00${idx}`;
      } else {
        const idx = 7 + Math.floor(Math.random() * 3);
        this.spriteKey = `spaceShips_00${idx}`;
      }
    }
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.x = this.x;
    this.sprite.y = this.y;

    let tex;
    // Check Xtra Assets First
    if (this.spriteKey === 'beer_challenge') {
      tex = GameAssets.getBeer();
    } else {
      // Map Type to Color if not provided
      let c = this.waveColor;
      if (!c) {
        // Default map
        const map = [null, 'Blue', 'Green', 'Red', 'Black', 'Blue'];
        c = map[this.xtraType] || 'Blue';
      }
      tex = GameAssets.getXtraEnemy(c, this.xtraType);

      if (GameAssets.isValidTexture(tex)) {
        this.usingXtraAsset = true;
      } else {
        // Fallback
        tex = this.spriteKey ? GameAssets.getEnemyTexture(this.spriteKey) : null;
      }
    }

    if (GameAssets.isValidTexture(tex)) {
      const s = new PIXI.Sprite(tex);
      s.anchor.set(0.5);
      const targetWidth = 45;
      const scale = targetWidth / tex.width;
      s.scale.set(scale);
      s.rotation = Math.PI;
      s.tint = this.usingXtraAsset ? 0xFFFFFF : this.color;
      this.sprite.addChild(s);
      this.body = s;
    } else {
      this.createFallbackGraphics();
    }

    this.healthBar = new PIXI.Graphics();
    this.updateHealthBar();
    this.sprite.addChild(this.healthBar);

    // Apply visual enhancements to make enemies look distinct and menacing
    if (this.usingXtraAsset && this.game?.app) {
      const color = this.waveColor || 'blue';
      const model = this.xtraType || 1;
      this.visualEnhancementCleanup = enhanceEnemyVisuals(
        this.sprite,
        model,
        color.toLowerCase(),
        this.game.app
      );
    }
  }

  createFallbackGraphics() {
    this.body = new PIXI.Graphics();
    this.body.circle(0, 0, this.radius);
    this.body.fill({ color: this.color });
    this.sprite.addChild(this.body);
  }

  updateHealthBar() {
    if (!this.healthBar) return;
    this.healthBar.clear();
    const barWidth = this.radius * 2;
    const barHeight = 3;
    const healthPercent = this.health / this.maxHealth;
    this.healthBar.rect(-barWidth / 2, this.radius + 5, barWidth, barHeight);
    this.healthBar.fill({ color: 0x333333 });
    this.healthBar.rect(-barWidth / 2, this.radius + 5, barWidth * healthPercent, barHeight);
    this.healthBar.fill({ color: healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000 });
  }

  // --- GALAGA BEHAVIOR ---

  startEntry(startX, startY, endX, endY, duration, delay = 0) {
    this.x = startX;
    this.y = startY;
    this.formationX = endX;
    this.formationY = endY;
    this.state = 'ENTRY';

    // Randomized Control Point based on side
    const centerX = 400; // Game Width / 2 roughly
    const cpX = (startX < centerX) ? startX + 300 : startX - 300;
    const cpY = startY + 400;

    this.entryCurve = {
      p0: { x: startX, y: startY },
      p1: { x: cpX, y: cpY },
      p2: { x: endX, y: endY },
      duration: duration,
      startTime: Date.now() + delay,
      delay: delay
    };

    if (delay > 0) {
      this.sprite.visible = false;
      this.active = false;
      this.waitingForEntry = true;
    }
  }

  startDive(playerX, playerY) {
    if (this.state !== 'FORMATION') return;
    this.state = 'DIVE';

    const start = { x: this.x, y: this.y };

    // Choose dive pattern randomly for variety
    const diveType = Math.random();
    let cp, end, duration = 1500;

    if (diveType < 0.4) {
      // Standard dive (40%)
      end = { x: playerX, y: 700 };
      cp = { x: (this.x + playerX) / 2 + (Math.random() - 0.5) * 200, y: (this.y + playerY) / 2 };
    } else if (diveType < 0.6) {
      // Spiral dive (20%) - wide arc
      const side = this.x < playerX ? -1 : 1;
      end = { x: playerX + side * 150, y: 700 };
      cp = { x: this.x + side * 300, y: playerY };
      duration = 1800; // Slower for more dramatic curve
    } else if (diveType < 0.8) {
      // Flanking dive (20%) - comes from side
      const flankSide = Math.random() < 0.5 ? -1 : 1;
      end = { x: flankSide * 100, y: 700 };
      cp = { x: playerX + flankSide * 250, y: playerY - 50 };
      duration = 1600;
    } else {
      // Kamikaze dive (20%) - straight at player then down
      end = { x: playerX, y: 750 };
      cp = { x: playerX, y: playerY + 100 };
      duration = 1200; // Faster!
    }

    this.diveCurve = {
      p0: start,
      p1: cp,
      p2: end,
      startTime: Date.now(),
      duration: duration
    };

    this.sprite.tint = 0xff0000; // Aggressive Color
  }

  update(delta, playerX, playerY) {
    if (!this.active && !this.waitingForEntry) return;

    if (this.waitingForEntry) {
      if (Date.now() >= this.entryCurve.startTime) {
        this.waitingForEntry = false;
        this.active = true;
        this.sprite.visible = true;
        this.entryCurve.startTime = Date.now();
      } else {
        return;
      }
    }

    this.moveTimer += delta;

    switch (this.state) {
      case 'ENTRY':
        this.updateBezier(this.entryCurve, 'FORMATION');
        break;

      case 'FORMATION':
        // Enhanced idle movement - more varied and alive
        const swaySpeed = 0.04 + (this.idlePhase % 0.02); // Varied speed per enemy
        const swayX = Math.sin(this.moveTimer * swaySpeed + this.idlePhase) * 12;
        const swayY = Math.cos(this.moveTimer * (swaySpeed * 0.7) + this.idlePhase) * 6;
        this.x = this.formationX + swayX;
        this.y = this.formationY + swayY;

        // Subtle rotation wobble
        const wobbleAngle = Math.sin(this.moveTimer * 0.03 + this.idlePhase) * 0.1;
        this.sprite.rotation = wobbleAngle;

        // Chance to dive (low)
        if (this.active && Math.random() < 0.001) {
          this.startDive(playerX, playerY);
        }
        break;

      case 'DIVE':
        this.updateBezier(this.diveCurve, 'RETURN');
        if (this.state === 'RETURN') {
          // Setup return
          this.returnToFormation();
        }
        break;

      case 'RETURN':
        this.updateBezier(this.returnCurve, 'FORMATION');
        if (this.state === 'FORMATION') {
          this.sprite.tint = this.color; // Reset color
        }
        break;
    }

    this.sprite.x = this.x;
    this.sprite.y = this.y;

    // Shooting
    if (this.shootCooldown > 0) this.shootCooldown -= delta;
  }

  returnToFormation() {
    this.state = 'RETURN';
    const start = { x: this.x, y: this.y };
    // Loop back up
    // If at bottom, wrap to top? Or fly back up? Galaga usually loops top.
    // Let's fly back up.
    const end = { x: this.formationX, y: this.formationY };
    const cpVal = (this.x < 400) ? -300 : 1100; // Wide arc outside screen

    this.returnCurve = {
      p0: start,
      p1: { x: cpVal, y: 300 },
      p2: end,
      startTime: Date.now(),
      duration: 2000
    };
  }

  updateBezier(curve, nextState) {
    if (!curve) {
      this.state = nextState;
      return;
    }
    const now = Date.now();
    const elapsed = now - curve.startTime;
    const t = Math.min(1, elapsed / curve.duration);

    const invT = 1 - t;
    const p0 = curve.p0;
    const p1 = curve.p1;
    const p2 = curve.p2;

    const nextX = (invT * invT * p0.x) + (2 * invT * t * p1.x) + (t * t * p2.x);
    const nextY = (invT * invT * p0.y) + (2 * invT * t * p1.y) + (t * t * p2.y);

    // Calc rotation based on delta
    const dx = nextX - this.x;
    const dy = nextY - this.y;
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      this.sprite.rotation = Math.atan2(dy, dx) - Math.PI / 2;
    }

    this.x = nextX;
    this.y = nextY;

    if (t >= 1) {
      this.state = nextState;
    }
  }

  canShoot() {
    return this.shootCooldown <= 0 && this.y > 0 && this.y < 700 && this.sprite.visible;
  }

  shoot(playerX, playerY) {
    // Higher fire rate during Dive
    const delayMult = (this.state === 'DIVE') ? 0.3 : 1.0;
    this.shootCooldown = this.shootDelay * delayMult;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return null;

    const accuracy = 0.8 + Math.random() * 0.2;
    const speed = BalanceConfig.difficulty.enemyProjectileSpeed;
    const vx = (dx / distance) * speed * accuracy;
    const vy = (dy / distance) * speed * accuracy;

    // Visual Config based on wave color (Default)
    let vColor = 'Red';
    if (this.waveColor && this.waveColor !== 'Black') vColor = this.waveColor;
    let vConfig = { color: vColor, index: 8 }; // Orb-like laser

    // Feature Flag + Kill Switch Check
    // Kill Switch: localStorage key "bs_disable_weapon_fx" == "1"
    const killSwitch = typeof localStorage !== 'undefined' && localStorage.getItem("bs_disable_weapon_fx") === "1";

    if (ENABLE_ENEMY_WEAPON_FX_VARIETY && !killSwitch) {
      // Look up specific style mapping
      const style = AssetManifest.enemyWeaponMap[this.type];
      if (style && style.projectile) {
        // Parse projectile path: .../laser(Color)(Index).png
        const match = style.projectile.match(/laser(Red|Green|Blue)(\d+)\./);
        if (match) {
          vConfig = {
            color: match[1],
            index: parseInt(match[2], 10)
          };
        }
      }
    }

    return new Bullet(this.x, this.y, vx, vy, 1, this.color, false, vConfig);
  }

  applyElite() {
    if (this.isElite) return;
    this.isElite = true;
    this.health = Math.ceil(this.health * 1.6);
    this.maxHealth = this.health;
    if (this.sprite) {
      this.sprite.scale.set(this.sprite.scale.x * 1.12);
      this.sprite.tint = 0xffcc00;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    this.updateHealthBar();
    this.sprite.tint = 0xffffff;
    // Flashing Logic: Restore correct tint
    const restoreColor = this.usingXtraAsset ? (this.state === 'DIVE' ? 0xffaaaa : 0xffffff) : (this.state === 'DIVE' ? 0xff0000 : this.color);
    setTimeout(() => { if (this.sprite) this.sprite.tint = restoreColor; }, 50);

    // Spawn debris if dead? (Handled by manager usually)

    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }
}
