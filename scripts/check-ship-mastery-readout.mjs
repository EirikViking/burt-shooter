import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getShipMasteryView } from '../src/progression/ShipMastery.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
assert.deepEqual([
  getShipMasteryView({ bestSector: 1, clears: 0 }).tier.id,
  getShipMasteryView({ bestSector: 3, clears: 0 }).tier.id,
  getShipMasteryView({ bestSector: 6, clears: 0 }).tier.id,
  getShipMasteryView({ bestSector: 6, clears: 4 }).tier.id
], ['none', 'bronze', 'silver', 'gold']);
assert.equal(getShipMasteryView({ clears: 7 }).clears, 7);
assert.equal(getShipMasteryView({ clears: 7 }).tours, 7, 'legacy clears must normalize into Tours');

const hangar = read('../src/scenes/ShipSelectScene.js');
const hud = read('../src/ui/HUD.js');
const main = read('../src/main.js');
for (const token of ["masteryBadge.label = 'hangarShipMasteryBadge'", 'SHIP_MASTERY_TIERS.bronze', "translateText('TOURS')", 'getShipMasteryBadgeLayout', 'fitMasteryTextScale', 'overlapFree:', 'threeDigitCapacity: true', 'renderedMedalCount: 3', 'rewardsAdded: false', 'shipContainer.masteryBadge.visible = isCenter']) {
  assert.ok(hangar.includes(token), `Hangar mastery readout missing: ${token}`);
}
for (const token of ["this.shipMasteryMedals.label = 'cockpitShipMasteryMedals'", 'this.shipMasteryView = getShipMasteryView', "translateText('TOURS ×{count}'", '_debugShipMastery', 'rewardsAdded: false']) {
  assert.ok(hud.includes(token), `cockpit mastery readout missing: ${token}`);
}
assert.ok(main.includes('mastery: shipSelectScene.shipCards'));
assert.ok(main.includes('cockpitMastery: playScene?.hud?.livesGroup?._debugShipMastery'));
for (const localePath of ['de.js', 'es.js', 'ja.js', 'ko.js', 'pt-BR.js', 'ru.js', 'zh-CN.js']) {
  assert.ok(read(`../src/i18n/locales/${localePath}`).includes('getTyrian112SourceText'));
}
assert.ok(!hangar.includes('recordShipMasteryRun'));
assert.ok(!hud.includes('recordShipMasteryRun'));
console.log('[ship-mastery-readout] PASS Hangar medals and cockpit Tour tally are visible and reward-neutral');
