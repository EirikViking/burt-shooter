import assert from 'node:assert/strict';
import { MYSTERIES } from '../src/config/Mysteries.js';
import { VeilbornPerformance, sampleVeilbornPose, sampleVeilbornDissolve } from '../src/effects/VeilbornPerformance.js';

const vector = (x = 0, y = x) => ({ x, y, set(a, b = a) { this.x = a; this.y = b; } });
const part = (name, x, angle = .1) => ({ name, active: true, localX: x, localY: 24, x: 640 + x, y: 320,
  radius: 22, hitRadius: 22, sprite: { visible: true, rotation: angle, scale: vector(.4), skew: vector(), position: vector(x, 24) } });
const makeActor = (definition) => {
  const body = part('body', 0, -Math.PI / 2);
  return { definition, type: definition.id, age: 3, state: 'FORMATION', active: true,
    parts: [body, part('wing_-1', -70), part('wing_1', 70), part('gun', 20), part('leg_-1_0', -40), part('core', 0), part('cable', -30)],
    body, zones: [], canAttack: () => true, combat: { p: { index: MYSTERIES.indexOf(definition) }, next: 8 } };
};
const geometry = a => a.parts.map(p => [p.localX, p.localY, p.x, p.y, p.radius, p.hitRadius, p.sprite.position.x, p.sprite.position.y]);

const signatures = new Set();
for (const definition of MYSTERIES) {
  const a = makeActor(definition), rig = new VeilbornPerformance(a), before = geometry(a);
  const base = a.parts.map(p => [p.sprite.rotation, p.sprite.scale.x, p.sprite.scale.y]);
  rig.cue('attack');
  for (let frame = 0; frame < 300; frame++) {
    rig.restore(); a.age += 1 / 60; rig.update(false);
    assert.deepEqual(geometry(a), before, `${definition.id}: presentation changed combat geometry`);
    for (const p of a.parts) {
      assert.ok(Number.isFinite(p.sprite.rotation + p.sprite.scale.x + p.sprite.skew.x));
      assert.ok(p.sprite.scale.x > .32 && p.sprite.scale.x < .48, 'bounded scale');
    }
    if (frame === 8) signatures.add(a.parts.map(p => p.sprite.rotation.toFixed(4)).join(','));
  }
  rig.restore();
  assert.deepEqual(a.parts.map(p => [p.sprite.rotation, p.sprite.scale.x, p.sprite.scale.y]), base, 'no accumulated drift');
  rig.update(true);
  assert.deepEqual(a.parts.map(p => [p.sprite.rotation, p.sprite.scale.x, p.sprite.scale.y]), base, 'reduced motion has no added deformation');
  rig.restore();
  a.body.sprite.scale.set(.7); // A real controller can replace and resize its hull during a molt.
  rig.update(false); rig.restore();
  assert.equal(a.body.sprite.scale.x, .7, 'molt dimensions survive restoration');
  a.zones = [{ age: .4, warning: .5, fired: false, owner: { active: true } }];
  rig.update(false); assert.ok(rig.energy > .5, 'actual warning drives wind-up'); rig.restore();
  a.zones[0].owner.active = false;
  a.combat.next = a.age + 4;
  rig.clear(); rig.update(false); assert.equal(rig.energy, 0, 'cancelled owner cannot keep a warning pose');
  rig.restore(); rig.cue('attack'); a.age += .05; rig.update(false);
  assert.ok(rig.release > 0, 'actual discharge drives release');
  const paused = a.parts.map(p => p.sprite.rotation);
  rig.restore(); rig.update(false);
  assert.deepEqual(a.parts.map(p => p.sprite.rotation), paused, 'same actor time freezes pose');
  rig.clear(); assert.equal(rig.release, 0);
}
assert.ok(signatures.size >= 40, `individual rig signatures: ${signatures.size}`);
const pose = t => sampleVeilbornPose({ family: 'predator', index: 0, role: 'limb', side: 1, order: 0, age: 4,
  tension: t, released: Infinity, hit: Infinity, arrival: 0, retreat: 0, reduced: false }, {});
assert.ok(Math.abs(pose(1).rotation - pose(0).rotation) > .2, 'wind-up must have a readable silhouette change');
for (const family of new Set(MYSTERIES.map(d => d.family))) {
  for (let i = 0; i < 12; i++) for (let f = 0; f <= 90; f++) {
    const p = sampleVeilbornDissolve(family, i, f / 60, false, {});
    assert.ok(Object.values(p).every(Number.isFinite));
    assert.ok(p.alpha >= 0 && p.alpha <= 1 && p.scale >= 0 && p.scale <= 1.1);
    if (f === 90) assert.equal(p.alpha, 0, 'death must be fully retired by 1.5 seconds');
    const still = sampleVeilbornDissolve(family, i, f / 60, true, {});
    assert.equal(still.travel, 0); assert.equal(still.spin, 0);
  }
}
console.log(`PASS Veilborn performance: ${MYSTERIES.length} identities, geometry, bounded poses, restore/molt, warnings, pause, cancellation, reduced motion and death lifecycle.`);
