import * as PIXI from 'pixi.js';
import { Enemy } from './Enemy.js';
import { Bullet } from './Bullet.js';
import { getSpaceSnakeProfile, sampleSpaceSnake, getSpaceSnakeSectionHealth } from '../config/SpaceSnakes.js';
import { GameAssets } from '../utils/GameAssets.js';
import { CreatureAudio } from '../audio/CreatureAudio.js';

// Sections are real enemies in the existing collision/score/cleanup pipeline.
// A shared route keeps the vertebrae connected, including after a section dies.
export class SpaceSnake extends Enemy {
  setupByType() {
    this.snakeProfile = getSpaceSnakeProfile(this.type);
    this.color = this.snakeProfile.color;
    this.snakeScale = Math.max(.7, this.game.getWidth() / 1280);
    this.radius = 23 * this.snakeScale;
    this.health = getSpaceSnakeSectionHealth(this.level);
    this.maxHealth = this.health;
    this.scoreValue = 55 + Math.min(90, this.level * 3);
    this.shootDelay = Math.max(95, this.snakeProfile.fireDelay - Math.min(65, this.level * .7)) / 1.18;
    this.shootCooldown = 180;
    this.kind = 'space_snake';
    // The inherited damage flash must restore authored texture colors.
    this.usingGeneratedEnemyTexture = true;
  }

  createSprite() {
    this.sprite = new PIXI.Container();
    this.sprite.label = `enemy_visual:${this.type}`;
    this.sprite.__enemyOwner = this;
    this.sprite.position.set(this.x, this.y);
    this.joint = new PIXI.Graphics();
    this.sprite.addChild(this.joint);
    this.body = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this.body.anchor.set(.5);
    this.sprite.addChild(this.body);
    this.healthBar = new PIXI.Graphics();
    this.sprite.addChild(this.healthBar);
  }

  update(delta) {
    if (!this.active || !this.chain) return;
    const live = this.chain.sections.filter(s => s.active);
    const index = live.indexOf(this);
    if (index === 0) {
      this.chain.age += delta / 60;
      if (this.chain.age >= (this.chain.nextCryAt || 8)) {
        CreatureAudio.play(this.chain, this.snakeProfile, live.length < this.chain.sections.length / 2 ? 'rage' : 'hunt', { x: this.x / this.game.getWidth() });
        this.chain.nextCryAt = this.chain.age + 8 + this.snakeProfile.index % 4;
      }
    }
    const profile = this.snakeProfile;
    const previousX = this.x, previousY = this.y;
    const target = sampleSpaceSnake(profile, this.chain.age, this.game.getWidth(), this.game.getHeight(), this.chain.routeSeed || 0);
    if (index === 0) {
      this.x = target.x; this.y = this.discoveryGuest ? target.y*.65 : target.y;
    } else {
      const ahead = live[index - 1];
      const dx = this.x - ahead.x, dy = this.y - ahead.y;
      const distance = Math.hypot(dx, dy) || 1;
      // Fixed, touching joints instead of rubber-band spacing at sharp turns.
      this.x = ahead.x + dx / distance * 43 * this.snakeScale * profile.bodyScale;
      this.y = ahead.y + dy / distance * 43 * this.snakeScale * profile.bodyScale;
    }
    const ahead = index === 0 ? target : live[index - 1];
    const dx = index === 0 ? this.x - previousX : ahead.x - this.x;
    const dy = index === 0 ? this.y - previousY : ahead.y - this.y;
    if (Math.hypot(dx, dy) > .01) this.body.rotation = Math.atan2(dy, dx) - Math.PI / 2;
    const part = index === 0 ? 'head' : index === live.length - 1 ? 'tail' : 'body';
    const texture = GameAssets.serpentTextures?.[`${profile.index}-${part}`];
    if (texture && (this.body.texture !== texture || this.bodyPart !== part)) {
      this.bodyPart = part;
      this.body.texture = texture;
      this.body.width = this.body.height = (part === 'head' ? 100 : part === 'tail' ? 57 : 76) * this.snakeScale * profile.bodyScale;
      this.body.tint = part === 'head' ? 0xffffff : profile.color;
    }
    this.joint.clear();
    if (index > 0) {
      this.joint.moveTo(0,0).lineTo(ahead.x-this.x,ahead.y-this.y).stroke({ color: 0x14232d, width: 22 * this.snakeScale, alpha: 1 });
      this.joint.moveTo(0,0).lineTo(ahead.x-this.x,ahead.y-this.y).stroke({ color: profile.color, width: 3, alpha: .75 });
    }
    this.sprite.position.set(this.x,this.y);
    if (index === 0 && this.shootCooldown < 30 && this.chain.age >= 3) {
      this.joint.circle(0,0,(28+Math.min(30,30-this.shootCooldown)*.32)*this.snakeScale).stroke({color:profile.color,width:2,alpha:.8});
    }
    this.state = this.chain.age < 3 ? 'ENTRY' : 'FORMATION';
    this.contactSafeDuringEntry = true;
    this.waitingForEntry = false;
    this.shootCooldown -= delta;
    this.healthBar.visible = this.health < this.maxHealth;
    this.updateHealthBar();
    this.sprite._debugSpaceSnake = { id: this.type, section: index, liveSections: live.length, part, age: this.chain.age, route: target.route };
  }

  canShoot() {
    if (!this.active || this.state === 'ENTRY' || this.chain?.sections.find(s => s.active) !== this || this.shootCooldown > 0) return false;
    return !this.discoveryCoordinator || this.discoveryCoordinator.claimAttack(this, 'snake');
  }
  shoot(playerX, playerY) {
    CreatureAudio.play(this.chain, this.snakeProfile, 'attack', { x: this.x / this.game.getWidth() });
    this.shootCooldown = this.shootDelay;
    const angle = Math.atan2(playerY-this.y, playerX-this.x);
    this.chain.shots = (this.chain.shots || 0) + 1;
    const speed = 2.45 + Math.min(1.65, Math.max(0,this.level-6)*.035);
    const count = this.level >= 25 ? 5 : 3;
    const spacing = this.chain.shots % 2 ? .24 : .38;
    return Array.from({length:count},(_,i) => {const a=angle+(i-(count-1)/2)*spacing;return new Bullet(this.x,this.y,Math.cos(a)*speed,Math.sin(a)*speed,1,this.color,false);});
  }
}
