import { Container, Graphics, Sprite } from 'pixi.js';
import { Bullet } from '../Bullet.js';
import { MysteryCombat } from './MysteryCombat.js';
import { MysteryEffects, MysteryAftermath } from '../../effects/MysteryEffects.js';
import { MysteryAudio } from '../../audio/MysteryAudio.js';

export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const mix = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const distanceToLine = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / Math.max(1, dx * dx + dy * dy), 0, 1);
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
};

class MysteryPart {
  constructor(root, name, slot, { x = 0, y = 0, height = 80, hp = 0, radius = 20, anchor = [.5, .5], angle = 0 } = {}) {
    this.root = root; this.name = name; this.type = `${root.type}:${name}`;
    this.kind = 'mystery_part'; this.game = root.game; this.color = root.color;
    this.active = true; this.state = 'ENTRY'; this.contactSafeDuringEntry = true;
    this.health = this.maxHealth = hp; this.scoreValue = 0; this.radius = this.hitRadius = hp > 0 ? radius * root.scale : 0;
    this.localX = x; this.localY = y; this.baseAngle = angle;
    this.sprite = new Sprite(root.lease.frames[slot]); this.sprite.anchor.set(...anchor);
    this.sprite.height = height * root.scale; this.sprite.scale.x = this.sprite.scale.y;
    this.sprite.rotation = angle; this.sprite.label = `mystery_part:${root.type}:${name}`;
    root.sprite.addChild(this.sprite); this.update();
  }
  update() {
    const angle=this.root.bank||0,c=Math.cos(angle),s=Math.sin(angle);
    this.x = this.root.x + (this.localX*c-this.localY*s)*this.root.scale;
    this.y = this.root.y + (this.localX*s+this.localY*c)*this.root.scale;
    this.sprite.position.set(this.localX * this.root.scale, this.localY * this.root.scale);
    this.state = this.root.state;
    this.radius = this.sprite.visible ? this.hitRadius : 0;
  }
  canShoot() { return false; }
  takeDamage(amount) {
    if (!this.active || !this.root.active || this.maxHealth <= 0) return false;
    this.health = Math.max(0, this.health - Math.max(0, Number(amount) || 0));
    this.root.play.particleManager?.createHitSpark(this.x,this.y,this.color,.65);
    if (this.health === 0) {
      this.root.fx.breakPart(this);
      this.active = false; this.sprite.visible = false;
      this.root.stats.breaks.push(this.name); this.root.onPartBroken(this);
      this.root.play.particleManager?.createHitSpark(this.x, this.y, this.color, 1.5);
      this.root.sound('break');
    }
    // A component break changes the encounter, but never grants a kill, combo,
    // pickup or farmable score in the existing projectile/bomb/chain paths.
    return false;
  }
  deactivateVisuals() { if (!this.sprite.destroyed) this.sprite.visible = false; }
  destroy() { this.active = false; this.destroyed = true; if (!this.sprite.destroyed) this.sprite.destroy(); }
}

export class MysteryActor {
  constructor(manager, definition, lease) {
    this.manager = manager; this.game = manager.game; this.play = this.game.scenes.play; this.audio = MysteryAudio;
    this.definition = definition; this.type = definition.id; this.kind = 'mystery'; this.lease = lease;
    this.width = this.game.getWidth(); this.height = this.game.getHeight();
    this.scale = this.width / 1920; this.x = this.width * .5; this.y = -240 * this.scale;
    this.radius = (definition.radius || 55) * this.scale;
    this.level = manager.level; this.health = this.maxHealth = definition.durability.hull;
    this.color = definition.color; this.scoreValue = 0;
    this.active = true; this.destroyed = false; this.state = 'ENTRY'; this.contactSafeDuringEntry = true;
    this.sprite = new Container(); this.sprite.label = `mystery:${this.type}`; this.sprite.__enemyOwner = this;
    this.sprite.position.set(this.x, this.y);
    this.field = new Graphics(); this.field.label = `mystery_field:${this.type}`;
    this.field.zIndex = 55; this.sprite.zIndex = 60;
    this.parts = []; this.pendingTargets = []; this.zones = []; this.bullets = []; this.age = 0; this.cycle = -1;
    this.stats = { attacks: 0, warnings: 0, breaks: [], outcome: null, bonus: 0 };
    this.lastLives = this.game.lives; this.recoveryUntil = 1.2; this.nextPresence = 8;
    this.fx = new MysteryEffects(this); this.combat = new MysteryCombat(this);
    this.body = this.part('body', 'topLeft', { height: definition.bodyHeight || 235 });
    this.bar = new Graphics(); this.sprite.addChild(this.bar);

  }
  part(name, slot, options) { const part = new MysteryPart(this, name, slot, options); this.parts.push(part); return part; }
  attach() {
    this.manager.mysteryAftermath ||= new MysteryAftermath(this.manager.container);
    this.manager.container.addChild(this.field, this.fx.container, this.sprite);
    this.manager.enemies.push(this, ...this.parts.filter(part => part.maxHealth > 0));
    this.game.mysteriesSeen = [...new Set([...(this.game.mysteriesSeen || []), this.type])];
    this.game.mysteriesRecent = [...(this.game.mysteriesRecent || []), this.type].slice(-5);
    // Reveal on actual arrival, never from loading the atlas or opening the Codex.
    this.play.recordThreatDiscovery?.(this.type, 'mysteries', {
      name: this.definition.name, sector: this.level
    }, { scoreBonus: false, silent: true });
    this.play.announceMystery?.(this);
    this.sound('arrival');
  }
  sound(event) { this.audio?.play(this, this.definition, event, { x: this.x / this.width }); }
  player() { return this.play.player || { x: this.width * .5, y: this.height * .82, radius: 8 }; }
  point(x, y) { return { x: x * this.width, y: y * this.height }; }
  move(x, y, dt, rate = 3) { this.x = mix(this.x, x, 1 - Math.exp(-rate * dt)); this.y = mix(this.y, y, 1 - Math.exp(-rate * dt)); }
  bob(dt, amplitude = .18, speed = .55, y = .28) {
    this.move(this.width * (.5 + Math.sin(this.age * speed) * amplitude), this.height * y, dt);
  }
  beat(period) {
    const cycle = Math.floor(Math.max(0, this.age - 2.5) / period);
    const fresh = cycle !== this.cycle;
    if (fresh) this.cycle = cycle;
    return { fresh, cycle, time: Math.max(0, this.age - 2.5) % period };
  }
  canAttack() { return this.active && this.age >= this.recoveryUntil && this.state === 'FORMATION'; }
  canShoot() { return false; } // Each authored controller owns its attack cadence.
  volley(x, y, angle, count, spacing = .16, speed = 3.6, options = {}) {
    if (!this.canAttack()) return [];
    const live = this.play.bulletManager.enemyBullets.filter(b => b.active).length;
    if (live >= 180 || this.bullets.filter(b=>b.active).length >= 48) return [];
    const shots = [];
    for (let i = 0; i < Math.min(count, 180 - live, 48 - this.bullets.filter(b=>b.active).length); i++) {
      const a = angle + (i - (count - 1) / 2) * spacing;
      const bullet = new Bullet(x, y, Math.cos(a) * speed * this.scale, Math.sin(a) * speed * this.scale,
        1, this.color, false, { shape: 'lance', maxLifetimeMs: 9000, ...options });
      if (bullet.threatArmingLayer) {
        bullet.updateThreatArmingCue = () => { bullet.threatArmingLayer.clear(); };
        bullet.updateThreatArmingCue();
      }
      bullet.mysteryOwner = this; this.play.bulletManager.addEnemyBullet(bullet); shots.push(bullet); this.bullets.push(bullet);
    }
    this.rememberAttack({ kind: 'volley', from: { x: x / this.width, y: y / this.height }, angle, count, spacing, speed });
    this.stats.attacks++; this.sound('attack'); return shots;
  }
  aimed(count = 5, spacing = .18, speed = 3.6, origin = this) {
    const p = this.player(); return this.volley(origin.x, origin.y, Math.atan2(p.y - origin.y, p.x - origin.x), count, spacing, speed);
  }
  beam(from, to, { width = 30, warning = 1.2, duration = .65, owner = null, delay = 0, onFire = null } = {}) {
    return this.hazard({ kind: 'beam', from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, radius: width * this.scale / 2, warning, duration, owner, delay, onFire });
  }
  zone(point, { radius = 58, warning = 1.2, duration = .65, owner = null, delay = 0, onFire = null } = {}) {
    return this.hazard({ kind: 'zone', from: { x: point.x, y: point.y }, radius: radius * this.scale, warning, duration, owner, delay, onFire });
  }
  hazard(spec) {
    if (!this.canAttack() || this.zones.length >= 18) return null;
    const zone = { ...spec, age: -spec.delay, fired: false, hit: false };
    this.zones.push(zone); this.stats.warnings++; this.sound('warning'); return zone;
  }
  rememberAttack(record) {
    if (this.type === 'witness') return;
    const history = this.game.mysteryMemories ||= {};
    const rows = history[this.type] ||= [];
    if (rows.length < 5) rows.push(record);
  }
  update(delta, playerX, playerY) {
    if (!this.active) return;
    const dt = Math.min(.1, Math.max(0, delta / 60)); this.age += dt;
    if (this.game.lives < this.lastLives) { this.zones.length = 0; this.recoveryUntil = this.age + 2.8; this.onRecovery(); }
    this.lastLives = this.game.lives;
    this.state = this.age < 1.2 ? 'ENTRY' : this.age > (this.definition.escapeSeconds || 48) - 2.2 ? 'RETREAT' : 'FORMATION';
    if (this.state === 'ENTRY') this.move(this.width * (.3+(this.combat.p.index%3)*.2), this.height * .27, dt, 3.8);
    else if (this.state === 'RETREAT') {
      if (!this.retreatStarted) { this.retreatStarted = true; this.zones.length = 0; this.sound('escape'); }
      this.y -= (220 + (this.age - (this.definition.escapeSeconds || 48) + 2.2) * 140) * this.scale * dt;
    }
    else this.tick(dt, playerX, playerY);
    if (this.age > this.nextPresence) { this.sound('presence'); this.nextPresence = this.age + 9; }
    this.parts.forEach(part => { if (part.active) part.update(); });
    this.sprite.position.set(this.x, this.y);
    this.sprite.rotation=this.bank||0;
    this.updateFields(dt);
    this.bar.clear();
    if (this.health < this.maxHealth) {
      const w = 100 * this.scale, y = -142 * this.scale;
      this.bar.roundRect(-w / 2, y, w, 4 * this.scale, 2 * this.scale).fill({ color: 0x06121a, alpha: .9 });
      this.bar.roundRect(-w / 2, y, Math.max(1, w * this.health / this.maxHealth), 4 * this.scale, 2 * this.scale).fill(this.color);
    }
    this.bullets = this.bullets.filter(b => b.active);
    // Encounters leave by an authored retreat, never secretly award a kill.
    if (this.age > (this.definition.escapeSeconds || 48)) this.escape();
    this.sprite._debugMystery = { id: this.type, age: this.age, health: this.health, ...this.stats };
  }
  updateFields(dt) {
    this.field.clear(); const p = this.player();
    // A fired attack may create a new hazard. Keep that new queue separate
    // so those attacks are neither discarded by filter nor advanced early.
    const pending = this.zones;
    this.zones = [];
    this.zones.push(...pending.filter(zone => {
      zone.age += dt;
      if (zone.owner?.active === false || zone.age >= zone.warning + zone.duration) return false;
      if (zone.age < 0) return true;
      const active = zone.age >= zone.warning, progress = clamp(zone.age / zone.warning, 0, 1);
      if (active && !zone.fired) {
        zone.fired = true; this.stats.attacks++; this.sound('attack');
        if (!zone.onFire) this.rememberAttack({ kind: zone.kind,
          from: { x: zone.from.x / this.width, y: zone.from.y / this.height },
          ...(zone.to ? { to: { x: zone.to.x / this.width, y: zone.to.y / this.height } } : {}),
          radius: zone.radius / this.scale, duration: zone.duration });
        zone.onFire?.(zone);
      }
      const distance = zone.kind === 'beam' ? distanceToLine(p, zone.from, zone.to) : Math.hypot(p.x - zone.from.x, p.y - zone.from.y);
      if (active && !zone.hit && distance < zone.radius + (p.radius || 8) && this.canAttack()) {
        zone.hit = true;
        this.play.handleBossCausedPlayerHit?.('mystery_hazard', this, { balanceSource: `mystery:${this.type}`, shieldShake: 3 });
      }
      return true;
    }));
    this.fx.update(dt,this.zones);
  }
  tick(dt) { this.combat.update(dt); }
  onPartBroken(part) { this.combat.partBroken(part); }
  onRecovery() { this.combat.clear(); }
  takeDamage(amount) {
    if (!this.active) return false;
    this.health = Math.max(0, this.health - Math.max(0, Number(amount) || 0) * (this.damageMultiplier?.() ?? 1));
    if (this.health > 0) { this.combat.damageStage(); return false; }
    this.stats.outcome = 'defeated'; this.active = false;
    const bonus = 2500 + Math.min(7500, Math.max(0, this.level - 11) * 100)
      + clamp(Math.floor(Number(this.additionalBonus?.()) || 0), 0, 2500);
    this.stats.bonus = this.game.addBonusScore(bonus);
    this.manager.mysteryAftermath?.emit(this);
    this.play.particleManager?.createExplosion(this.x, this.y, this.color, 1.9, 'combustion');
    this.play.showScorePopup?.(this.x, this.y, this.stats.bonus, { comboEligible: false });
    this.parts.filter(p=>p.structural&&p.active).forEach((p,i)=>{if(i<5)this.play.particleManager?.createExplosion(p.x,p.y,this.color,.55,'combustion');});
    this.sound('death'); this.deactivateVisuals('death'); return true;
  }
  escape() { this.stats.outcome = 'escaped'; this.active = false; if (!this.retreatStarted) this.sound('escape'); this.deactivateVisuals('escape'); }
  deactivateVisuals() {
    this.sprite.visible = false; this.field.visible = false; this.zones.length = 0;
    this.combat.clear(); this.fx.clear();
    for (const part of this.parts) { part.active = false; part.sprite.visible = false; }
    // Attack projectiles retire through the normal bullet manager on cleanup.
    for (const bullet of this.bullets) if (bullet.active) this.play.bulletManager.deactivateBullet?.(bullet, 'mystery_complete');
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.active = false; this.deactivateVisuals('cleanup');
    if (!['defeated', 'escaped'].includes(this.stats.outcome)) this.audio?.stopOwner(this);
    this.fx.destroy(); this.field.destroy(); this.sprite.destroy({ children: true }); this.lease.release();
  }
}
