const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
const impulse = (t, speed = 1) => t < 0 || !Number.isFinite(t) ? 0
  : (1 - Math.exp(-t * 110)) * Math.exp(-t * 8 * speed);
// Pace, hinge range, recoil weight and secondary settling differ by material.
const FAMILIES = {
  predator: [2.2, 1.1, 1.05, 1.15], spatial: [1.1, .85, .7, .6],
  ecosystem: [1.5, 1.2, .8, 1.35], machine: [.7, .65, 1.3, .45],
  deceiver: [1.3, 1, .9, .9], sculptor: [.9, .75, 1.2, .65],
  temptation: [1.7, 1.05, .75, 1.15], legend: [.8, .9, 1.2, .8],
};

function roleOf(name) {
  if (/cable|scout_/.test(name)) return 'fixed';
  if (name === 'body' || /red_twin|shell_/.test(name)) return 'hull';
  if (/leg|jaw|fang|blade|claw|branch|tendril/.test(name)) return 'limb';
  if (/wing|foil|mantle|sail|vane|membrane|fin|petal/.test(name)) return 'wing';
  if (/gun|barrel|lance|weapon|cannon|turret|nozzle/.test(name)) return 'weapon';
  if (/core|iris|clock|magnet|furnace|aperture|sensor|eye|lens|sonar/.test(name)) return 'core';
  return 'satellite';
}

export function sampleVeilbornPose(s, out) {
  out.rotation = out.skew = 0; out.sx = out.sy = 1;
  if (s.reduced || s.role === 'fixed') return out;
  const [pace, hinge, weight, elasticity] = FAMILIES[s.family] || FAMILIES.predator;
  const identity = 1 + (s.index % 7 - 3) * .035;
  const phase = s.age * pace + s.index * 1.71 - s.order * .34;
  const breath = Math.sin(phase) * .65 + Math.sin(phase * .47) * .35;
  const delayed = s.released - (s.role === 'hull' ? 0 : (s.order % 4) * .018);
  const strike = impulse(delayed, weight) * weight;
  const settle = delayed > 0 && delayed < 1.2
    ? Math.sin(delayed * 15) * Math.exp(-delayed * 6) * elasticity : 0;
  const hit = impulse(s.hit, 1.6);
  const fold = ease(s.tension) + s.arrival * .75 + s.retreat * .6;
  const side = s.side, h = hinge * identity;
  switch (s.role) {
    case 'limb':
      out.rotation = side * (breath * .065 - fold * .32 + strike * .42 + settle * .085) * h;
      out.sy = 1 - fold * .055 + strike * .055;
      out.skew = side * settle * .055;
      break;
    case 'wing':
      // The hinge stays at its authored anchor. Foreshortening sells the turn
      // without moving a weapon port, damage circle or connected cable.
      out.rotation = side * (breath * .12 + fold * .34 - strike * .26 - settle * .13) * h;
      out.sx = 1 - fold * .105 - (breath + 1) * .025 + strike * .06;
      out.sy = 1 + breath * .025 - strike * .035;
      out.skew = side * (fold * .055 + settle * .055);
      break;
    case 'weapon':
      out.rotation = side * (fold * .055 - strike * .075 + settle * .04);
      out.sx = 1 + strike * .055;
      out.sy = 1 - fold * .045 - strike * .105 + settle * .035;
      break;
    case 'core':
      out.rotation = side * (breath * .04 - fold * .14 + strike * .19) * h;
      out.sx = out.sy = 1 + breath * .02 - fold * .07 + strike * .09;
      break;
    case 'hull':
      out.rotation = side * (breath * .008 + settle * .018 + hit * .018);
      out.sx = 1 + breath * .006 + strike * .016 + hit * .018;
      out.sy = 1 - breath * .006 - fold * .018 - strike * .025 - hit * .02;
      break;
    default:
      out.rotation = side * (breath * .06 - fold * .15 + strike * .19 + settle * .07) * h;
      out.sx = out.sy = 1 + breath * .012 - fold * .035 + strike * .025;
  }
  return out;
}

export class VeilbornPerformance {
  constructor(actor) {
    this.a = actor; this.firedAt = this.hitAt = -Infinity; this.energy = this.release = 0;
    this.channels = actor.parts.map((part, order) => ({ part, order, role: roleOf(part.name),
      side: Math.sign(part.localX) || (order % 2 ? -1 : 1), applied: false,
      rotation: 0, sx: 1, sy: 1, skewX: 0, skewY: 0 }));
    this.sample = { family: actor.definition.family, index: actor.combat.p.index };
    this.pose = {};
  }
  cue(event) {
    if (event === 'attack' || event === 'attack_alt') this.firedAt = this.a.age;
    if (event === 'break' || event === 'hit') this.hitAt = this.a.age;
  }
  restore() {
    for (const c of this.channels) {
      if (!c.applied) continue;
      const s = c.part.sprite; c.applied = false;
      if (s.destroyed) continue;
      s.rotation = c.rotation; s.scale.set(c.sx, c.sy); s.skew.set(c.skewX, c.skewY);
    }
  }
  update(reduced = false) {
    // Always unwind before sampling. Rendering twice at the same simulation
    // time is idempotent; pause and skipped frames cannot integrate extra sway.
    this.restore();
    const a = this.a, s = this.sample;
    let tension = 0;
    if (a.canAttack()) {
      const until = a.combat.next - a.age;
      if (until > 0 && until < .36) tension = .7 * ease(1 - until / .36);
      for (const z of a.zones) if (!z.fired && z.age >= 0 && z.owner?.active !== false)
        tension = Math.max(tension, clamp(z.age / Math.max(.01, z.warning)));
      const charge = a.combat.charge;
      if (charge && a.age - charge.born < charge.warning)
        tension = Math.max(tension, clamp((a.age - charge.born) / charge.warning));
    }
    this.energy = tension;
    this.release = impulse(a.age - this.firedAt);
    Object.assign(s, { age: a.age, tension, released: a.age - this.firedAt, hit: a.age - this.hitAt,
      arrival: a.state === 'ENTRY' ? 1 - ease(a.age / 1.2) : 0,
      retreat: a.state === 'RETREAT' ? 1 : 0, reduced });
    for (const c of this.channels) {
      const p = c.part, sprite = p.sprite;
      if (!p.active || !sprite.visible || sprite.destroyed || p.drone || c.role === 'fixed') continue;
      c.rotation = sprite.rotation; c.sx = sprite.scale.x; c.sy = sprite.scale.y;
      c.skewX = sprite.skew.x; c.skewY = sprite.skew.y;
      s.role = c.role; s.order = c.order; s.side = c.side;
      const pose = sampleVeilbornPose(s, this.pose);
      sprite.rotation = c.rotation + pose.rotation;
      sprite.scale.set(c.sx * pose.sx, c.sy * pose.sy);
      sprite.skew.set(c.skewX + pose.skew, c.skewY);
      c.applied = true;
    }
  }
  clear() { this.restore(); this.firedAt = this.hitAt = -Infinity; this.energy = this.release = 0; }
}

export function sampleVeilbornDissolve(family, index, age, reduced, out) {
  const spectral = family === 'spatial' || family === 'deceiver';
  const mechanical = family === 'machine' || family === 'sculptor';
  const delay = (index % 5) * (spectral ? .025 : .014);
  const t = Math.max(0, age - delay), collapse = ease(t / .13);
  const release = 1 - Math.exp(-Math.max(0, t - .09) * (mechanical ? 4.8 : 3.3));
  out.travel = reduced ? 0 : spectral ? -release * 62 : release * (mechanical ? 122 : 94) - collapse * 7;
  out.fall = reduced || spectral ? 0 : Math.max(0, t - .12) ** 2 * 26;
  out.spin = reduced ? 0 : (index % 2 ? 1 : -1) * release * (spectral ? .25 : .9);
  out.scale = reduced ? 1 : spectral ? 1 - ease(t / 1.1) * .96 : 1 - collapse * .07 - ease(t / 1.4) * .1;
  out.alpha = 1 - ease((t - .18) / (1.18 - delay));
  out.heat = Math.max(0, 1 - t / .26);
  return out;
}
