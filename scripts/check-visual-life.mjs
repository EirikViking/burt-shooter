import assert from 'node:assert/strict';
import { EXPLOSION_ANIMATIONS, sampleExplosionLobe, selectExplosionAnimation } from '../src/effects/ExplosionChoreography.js';
import { PLANET_VIGNETTES, samplePlanetActor, planetIndexForLevel } from '../src/config/PlanetVignettes.js';

assert.equal(EXPLOSION_ANIMATIONS.length, 120);
const trajectories = new Set();
for (const animation of EXPLOSION_ANIMATIONS) {
  const trace = [];
  for (const t of [0, .08, .22, .4, .65, .9, 1]) {
    for (let i = 0; i < 8; i++) {
      const p = sampleExplosionLobe(animation, i, t);
      assert.ok(Object.values(p).every(Number.isFinite));
      assert.ok(p.alpha >= 0 && p.alpha <= 1 && p.size >= 0);
      trace.push(...Object.values(p).map(v => +v.toFixed(4)));
    }
  }
  trajectories.add(JSON.stringify(trace));
}
assert.equal(trajectories.size, 120, 'All 120 animations need different motion/timing, independent of tint or rotation');
assert.equal(new Set(Array.from({length:120}, (_,i) => selectExplosionAnimation(i).id)).size, 120);
assert.equal(PLANET_VIGNETTES.length, 48);
assert.equal(new Set(PLANET_VIGNETTES.map(v => v.id)).size, 48);
assert.equal(new Set(PLANET_VIGNETTES.map(v => JSON.stringify(v.actors))).size, 48);
for (const [index, vignette] of PLANET_VIGNETTES.entries()) {
  assert.ok(vignette.actors.length <= 6);
  for (const seconds of [0, 2, 6, 11, 18]) for (let i=0;i<vignette.actors.length;i++) {
    const p=samplePlanetActor(vignette,i,seconds);
    assert.ok(Object.values(p).every(Number.isFinite));
    assert.ok(p.x >= -.1 && p.x <= .65 && p.y >= .03 && p.y <= .52, `${index}: actor escaped planet horizon`);
  }
  assert.equal(planetIndexForLevel(index*5+1), index);
  assert.equal(planetIndexForLevel(index*5+5), index);
}
assert.equal(planetIndexForLevel(51),10);
assert.equal(planetIndexForLevel(241),0);
console.log('PASS: 120 distinct motion/timing animations, 48 unique bounded planet vignettes, sector boundaries/51/cycle');
