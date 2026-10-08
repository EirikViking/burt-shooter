import assert from 'node:assert/strict';
import {FirstLightModel} from '../src/game/ArcadeFirstLight.js';

function rival() {
  const model = new FirstLightModel('recorded-result-expiry');
  for (let i = 0; i < 60; i++) model.update(.1, {sector: 2, safe: true});
  assert.equal(model.encounter?.kind, 'rival');
  return model;
}

for (const present of [true, false]) {
  const model = rival(), encounter = model.encounter;
  const age = encounter.age;
  for (let i = 0; i < 30; i++) model.update(.1, {sector: 2, safe: false, present});
  assert.equal(encounter.age, age, 'Unfinished contact must retain its playable time');
  model.update(0, {sector: 2, safe: true});
  model.hit('left', 1000, {}); model.hit('right', 1000, {});
  assert.equal(model.hit('core', 1000, {}).type, 'victory');
  const wonAge = encounter.age;
  for (let i = 0; i < 50; i++) model.update(.1, {sector: 2, safe: false, present, paused: true});
  assert.equal(encounter.age, wonAge, 'Pause must freeze the finished presentation too');
  for (let i = 0; i < 17; i++) model.update(.1, {sector: 2, safe: false, present});
  assert.equal(model.encounter, encounter, 'Keep the full existing breakup duration');
  for (let i = 0; i < 3; i++) model.update(.1, {sector: 2, safe: false, present});
  assert.equal(model.encounter, null, 'Completed rival must expire during later warnings');
  assert.equal(model.victories, 1);
  assert.equal(model.rewardCount, 1);
  assert.equal(model.escorts.length, 0);
}
console.log('PASS: completed rival expires during warnings; unfinished contacts, pause, rewards and breakup duration preserved.');
