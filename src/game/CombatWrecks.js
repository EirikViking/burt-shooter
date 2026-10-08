// Gameplay wrecks are independent of cosmetic debris and particle settings.
// Claims run in the combat tick: attached builders precede player salvage;
// within either family the oldest eligible record wins. No gameplay RNG.
export const WRECK_RULES = Object.freeze({ cap: 6, seconds: 4.5, assembly: 1.2,
  warning: .85, platformSeconds: 7, searchSeconds: 7 });
export const WRECK_TEMPLATES = Object.freeze({ grunt: 'burst', chaser: 'burst',
  striker: 'fan', turret: 'lance' });

export class CombatWrecks {
  constructor() { this.records = []; this.seen = new WeakSet(); this.serial = 0; }
  record(enemy) {
    if (!enemy || this.seen.has(enemy) || enemy.root || enemy.kind !== 'enemy'
      || enemy.health > 0 || !Number.isFinite(enemy.x) || !Number.isFinite(enemy.y)) return null;
    if(enemy.lastDamageWasSalvage)return null;
    const pattern = WRECK_TEMPLATES[enemy.type]||({single:'burst',delayedBurst:'burst',fan:'fan',fanPulse:'fan',needle:'lance',laneShot:'lance'})[enemy.generatedProfile?.attackStyle];
    if (!pattern) return null;
    this.seen.add(enemy);
    const texture = enemy.body?.texture || enemy.bodySprite?.texture || enemy.visualSprite?.texture
      || enemy.sprite?.children?.find(c => c.texture)?.texture;
    const record = { id: ++this.serial, pattern, x: enemy.x, y: enemy.y, texture,
      age: 0, active: true, owner: null, consumed: false };
    if (this.records.length >= WRECK_RULES.cap) this.records.shift().active = false;
    this.records.push(record); return record;
  }
  reserve(owner, predicate = () => true) {
    const record = this.records.find(r => r.active && !r.owner && !r.consumed && predicate(r));
    if (record) record.owner = owner;
    return record || null;
  }
  consume(record, owner) {
    if (!record?.active || record.owner !== owner || record.consumed) return false;
    record.consumed = true; record.active = false; return true;
  }
  // Interrupted/expired wrecks stay spent; they cannot fuel a second attempt.
  abandon(record, owner) {
    if (record?.owner === owner) { record.active = false; record.consumed = true; }
  }
  update(dt) {
    for (const r of this.records) { r.age += dt; if (r.age >= WRECK_RULES.seconds) r.active = false; }
    this.records = this.records.filter(r => r.active);
  }
  clear() { for (const r of this.records) r.active = false; this.records.length = 0; }
}

export class Reassembly {
  constructor(owner, registry) { this.owner = owner; this.registry = registry;
    this.state = 'search'; this.age = 0; this.elapsed = 0; this.record = null; this.attempted = false; }
  update(dt, { alive = true, ready = true, anchorAlive = true, platformAlive = true } = {}) {
    this.elapsed += dt;
    if (!alive || !anchorAlive || !platformAlive) return this.stop('shutdown');
    if (!ready) return;
    if (this.state === 'search') {
      this.record = this.registry.reserve(this.owner, r => r.y > 0);
      if (this.record) { this.attempted = true; this.state = 'assembly'; this.age = 0; }
      else if (this.elapsed >= (this.searchSeconds || WRECK_RULES.searchSeconds)) this.stop('empty');
      return;
    }
    this.age += dt;
    if (this.state === 'assembly') {
      if (!this.record.active) return this.stop('expired');
      if (this.age >= WRECK_RULES.assembly) {
        if (!this.registry.consume(this.record, this.owner)) return this.stop('conflict');
        this.state = 'warning'; this.age = 0;
      }
    } else if (this.state === 'warning' && this.age >= WRECK_RULES.warning) {
      this.state = 'active'; this.age = 0;
    } else if (this.state === 'active' && this.age >= WRECK_RULES.platformSeconds) this.stop('expired');
  }
  recover() { if (this.state === 'active') { this.state = 'warning'; this.age = 0; } }
  stop(reason) { this.registry.abandon(this.record, this.owner); this.state = 'done'; this.reason ||= reason; }
}

// Reservations attach to actual Molt plates; no duplicate cover or wreck pool.
export class MoltPlateClaims {
  constructor(molt) { this.molt = molt; }
  reserve(owner) {
    if(this.molt.disposed)return null;
    const p=this.molt.model.plates.find(p=>p.active&&!p.owner&&!p.consumed);
    if(p){p.owner=owner;p.pattern='serpent';}return p||null;
  }
  consume(p,owner){if(this.molt.disposed||!p?.active||p.owner!==owner||p.consumed)return false;
    p.consumed=true;p.active=false;return true;}
  abandon(p,owner){if(p?.owner===owner){p.owner=null;p.consumed=true;}}
}
