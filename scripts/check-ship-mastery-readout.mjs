import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getShipMasteryView } from '../src/progression/ShipMastery.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

assert.deepEqual(
  [
    getShipMasteryView({ bestSector: 1, clears: 0 }).tier.id,
    getShipMasteryView({ bestSector: 3, clears: 0 }).tier.id,
    getShipMasteryView({ bestSector: 6, clears: 0 }).tier.id,
    getShipMasteryView({ bestSector: 6, clears: 4 }).tier.id
  ],
  ['none', 'bronze', 'silver', 'gold']
);
assert.equal(getShipMasteryView({ clears: 7 }).clears, 7, 'clear tally must preserve repeat clears');

const hangar = read('../src/scenes/ShipSelectScene.js');
const hud = read('../src/ui/HUD.js');
const main = read('../src/main.js');

for (const token of [
  "masteryBadge.label = 'hangarShipMasteryBadge'",
  'SHIP_MASTERY_TIERS.bronze',
  "translateText('CLEARS')",
  'getShipMasteryBadgeLayout',
  'fitMasteryTextScale',
  'overlapFree:',
  'threeDigitCapacity: true',
  'renderedMedalCount: 3',
  'rewardsAdded: false',
  'shipContainer.masteryBadge.visible = isCenter'
]) {
  assert.ok(hangar.includes(token), `Hangar mastery readout missing: ${token}`);
}
for (const token of [
  "this.shipMasteryMedals.label = 'cockpitShipMasteryMedals'",
  'this.shipMasteryView = getShipMasteryView',
  "translateText('CLEARS ×{count}'",
  '_debugShipMastery',
  'rewardsAdded: false'
]) {
  assert.ok(hud.includes(token), `cockpit mastery readout missing: ${token}`);
}
assert.ok(main.includes('mastery: shipSelectScene.shipCards'), 'Hangar mastery diagnostics missing');
assert.ok(main.includes('cockpitMastery: playScene?.hud?.livesGroup?._debugShipMastery'), 'cockpit mastery diagnostics missing');

for (const localePath of ['de.js', 'es.js', 'ja.js', 'ko.js', 'pt-BR.js', 'ru.js', 'zh-CN.js']) {
  assert.ok(read(`../src/i18n/locales/${localePath}`).includes("'CLEARS ×{count}':"), `${localePath} missing clear tally`);
}

assert.ok(!hangar.includes('recordShipMasteryRun'), 'Hangar readout must not write mastery progress');
assert.ok(!hud.includes('recordShipMasteryRun'), 'cockpit readout must not write mastery progress');

console.log('[ship-mastery-readout] PASS Hangar medals and cockpit clear tally are visible and reward-neutral');
