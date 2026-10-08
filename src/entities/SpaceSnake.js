import * as PIXI from 'pixi.js';
import { Enemy } from './Enemy.js';
import { Bullet } from './Bullet.js';
import { getSpaceSnakeProfile, sampleSpaceSnake, getSpaceSnakeSectionHealth, getSpaceSnakeMotionRate, getSpaceSnakeDamageMultiplier, ONSLAUGHT_SNAKE_EXPOSED_SECONDS } from '../config/SpaceSnakes.js';
import { GameAssets } from '../utils/GameAssets.js';
import { CreatureAudio } from '../audio/CreatureAudio.js';
import { GLOBAL_CHALLENGE_TUNING, getSectorAttackPressure } from '../config/BalanceConfig.js';
import { isOverrunRunMode } from '../game/RunMode.js';
import {premiumTexture} from '../effects/PremiumArt.js';


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
    this.shootDelay = Math.max(95, this.snakeProfile.fireDelay - Math.min(65, this.level * .7)) / (1.18 * 1.25 * 1.1 * getSectorAttackPressure(this.game?.level ?? this.level) * GLOBAL_CHALLENGE_TUNING.snakeCadence);
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
      // Commit to the attack before firing so slower hulls can catch the head.
      // Keep the route clock shared when another live section becomes leader.
      this.chain.motionAge = (this.chain.motionAge ?? this.chain.age) + delta / 60 * getSpaceSnakeMotionRate(this.chain.age, this.shootCooldown, live.length)
        * (this.chain.molt?.model.phase==='exposed'?1.22:1);
      this.chain.age += delta / 60;
      if (this.chain.age >= (this.chain.nextCryAt || 8)) {
        CreatureAudio.play(this.chain, this.snakeProfile, live.length < this.chain.sections.length / 2 ? 'rage' : 'hunt', { x: this.x / this.game.getWidth() });
        this.chain.nextCryAt = this.chain.age + 8 + this.snakeProfile.index % 4;
      }
    }
    const profile = this.snakeProfile;
    const molt=this.chain.molt?.model;
    const exposed=molt?.phase==='exposed';
    const fracture=molt?.phase==='fracturing'?Math.min(1,molt.age/.65):0;
    const previousX = this.x, previousY = this.y;
    const target = this.chain.migration?{x:this.game.getWidth()*(-.05+1.1*Math.min(1,(this.chain.migrationAge||0)/14)),
      y:-140+(this.game.getHeight()*.30+140)*Math.min(1,this.chain.age/3),route:'brood_migration'}
      :sampleSpaceSnake(profile, this.chain.motionAge ?? this.chain.age, this.game.getWidth(), this.game.getHeight(), this.chain.routeSeed || 0);
    if(exposed){
      const emerge=Math.min(1,molt.age/.8);
      target.x=Math.max(this.game.getWidth()*.09,Math.min(this.game.getWidth()*.91,
        target.x+Math.sin(molt.age*2.4)*this.game.getWidth()*.045*emerge));
      target.y-=this.game.getHeight()*.035*emerge;
    }
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
    const authoredMolt=this.chain.molt&&premiumTexture(exposed?(part==='head'?'moltExposedHead':part==='tail'?'moltTail':'moltSpine'):(part==='head'?'moltHead':part==='tail'?'moltTail':'moltArmour'));
    const texture = authoredMolt|| (exposed&&part!=='head'&&this.chain.molt.coreTexture?this.chain.molt.coreTexture
      :GameAssets.serpentTextures?.[`${profile.index}-${part}`]);
    if (texture && (this.body.texture !== texture || this.bodyPart !== part)) {
      this.bodyPart = part;
      this.body.texture = texture;
      this.body.width = this.body.height = (part === 'head' ? 100 : part === 'tail' ? 57 : 76) * this.snakeScale * profile.bodyScale;
      this.body.tint = part === 'head' ? 0xffffff : profile.color;
    }
    this.joint.clear();
    // Retain the authored anatomy, then reveal a narrow connected living core.
    // This is still the same damageable section with the same remaining health.
    const shrink=exposed?1:fracture;
    const size=(part==='head'?100:part==='tail'?57:76)*this.snakeScale*profile.bodyScale;
    this.body.width=size*(1-shrink*.55);this.body.height=size*(1-shrink*.14);
    if(authoredMolt)this.body.tint=0xffffff;
    this.radius=(exposed?part==='head'?22:16:23)*this.snakeScale;
    if (index > 0) {
      this.joint.moveTo(0,0).lineTo(ahead.x-this.x,ahead.y-this.y).stroke({ color: exposed?0x481526:0x14232d, width: (exposed?12:22) * this.snakeScale, alpha: 1 });
      this.joint.moveTo(0,0).lineTo(ahead.x-this.x,ahead.y-this.y).stroke({ color: profile.color, width: 3, alpha: .75 });
    }
    if(fracture>0)this.joint.moveTo(-20*this.snakeScale,-18*this.snakeScale).lineTo(4,0).lineTo(-13,19*this.snakeScale)
      .stroke({color:0xffd7a2,width:3,alpha:.85});
    if(exposed)this.joint.ellipse(0,0,7*this.snakeScale,19*this.snakeScale).fill({color:0xffc078,alpha:.8});
    if (getSpaceSnakeDamageMultiplier(this.game?.runMode, this.chain.age, this.chain.exposureUntilAge) > 1) {
      this.joint.circle(0, 0, (part === 'head' ? 32 : 27) * this.snakeScale)
        .stroke({ color: 0xffe9a0, width: 3, alpha: 0.88 });
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
    this.healthTrail = Math.max(this.health, (this.healthTrail ?? this.maxHealth) - this.maxHealth * delta / 90);
    this.updateHealthBar();
    this.sprite._debugSpaceSnake = { id: this.type, section: index, liveSections: live.length, part, age: this.chain.age, route: target.route };
  }

  updateHealthBar() {
    if (!this.healthBar) return;
    const width = 42 * this.snakeScale, y = -32 * this.snakeScale;
    const ratio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    const trail = Math.max(ratio, Math.min(1, (this.healthTrail ?? this.health) / this.maxHealth));
    this.healthBar.clear().roundRect(-width / 2 - 2, y - 2, width + 4, 7, 2).fill({ color: 0x07151f, alpha: .95 });
    this.healthBar.rect(-width / 2, y, width * trail, 3).fill({ color: 0xffb768, alpha: .9 });
    this.healthBar.rect(-width / 2, y, width * ratio, 3).fill({ color: 0x83efce, alpha: 1 });
  }

  canShoot() {
    if (!this.active || this.state === 'ENTRY' || this.chain?.sections.find(s => s.active) !== this || this.shootCooldown > 0) return false;
    return !this.discoveryCoordinator || this.discoveryCoordinator.claimAttack(this, 'snake');
  }
  shoot(playerX, playerY) {
    CreatureAudio.play(this.chain, this.snakeProfile, 'attack', { x: this.x / this.game.getWidth() });
    this.shootCooldown = this.shootDelay;
    if (isOverrunRunMode(this.game?.runMode)) this.chain.exposureUntilAge = this.chain.age + ONSLAUGHT_SNAKE_EXPOSED_SECONDS;
    const angle = Math.atan2(playerY-this.y, playerX-this.x);
    this.chain.shots = (this.chain.shots || 0) + 1;
    const speed = (2.45 + Math.min(1.65, Math.max(0,this.level-6)*.035)) * 1.25 * 1.1;
    const count = this.level >= 25 ? 5 : 3;
    const spacing = this.chain.shots % 2 ? .24 : .38;
    return Array.from({length:count},(_,i) => {const a=angle+(i-(count-1)/2)*spacing;return new Bullet(this.x,this.y,Math.cos(a)*speed,Math.sin(a)*speed,1,this.color,false);});
  }

  takeDamage(amount, options = {}) {
    return super.takeDamage(amount * getSpaceSnakeDamageMultiplier(this.game?.runMode, this.chain?.age, this.chain?.exposureUntilAge), options);
  }
}
