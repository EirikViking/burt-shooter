import assert from 'node:assert/strict';
import { getOnslaughtCollectionItems } from '../src/achievements/OnslaughtAchievementProgress.js';
const run = (hullId, startingTriple, sectorsCleared = 3) => ({ runId: `${hullId}-${startingTriple}-run`,
  mode: 'overrun_tactical', rulesetVersion: 'overrun_tactical_score_v2', hullId, startingTriple, sectorsCleared,
  completedAt: '2026-09-27T12:00:00Z' });
const definitions = await import('../src/achievements/OnslaughtAchievementDefinitions.js');
const catalog = Object.values(definitions).find(v => Array.isArray(v) && v[0]?.criterion);
const small = catalog.find(d => d.criterion === 'starterHullsThreeSectors');
const same = catalog.find(d => d.criterion === 'oneHullThreeLoadouts');
const runs = [run('nova_ship_01', 'blink_drive+damage_up+shield'), run('nova_ship_02', 'blink_drive+damage_up+shield'),
  run('nova_ship_07', 'blink_drive+damage_up+shield'), run('nova_ship_01', 'damage_up+rapid_fire+shield')];
const starter = getOnslaughtCollectionItems(small, runs);
assert.equal(starter.length, 5);
assert.deepEqual(starter.filter(i => i.counted).map(i => i.hullId), ['nova_ship_01', 'nova_ship_02']);
assert.ok(!starter.some(i => i.hullId === 'nova_ship_07'));
assert.equal(getOnslaughtCollectionItems(same, runs).length, 2);
assert.ok(getOnslaughtCollectionItems(same, runs).every(i => i.hullId === 'nova_ship_01'));
console.log('[achievement-collections] PASS eligible hulls and overlapping custom loadout evidence');


// Every starting option displayed in a collection has an explicit functional name in all locales.
const { ONSLAUGHT_START_POOL } = await import('../electron/onslaughtContract.cjs');
const { getOnslaughtCollectionAugmentName } = await import('../src/i18n/onslaughtCollectionNames.js');
for (const locale of ['en', 'de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
  for (const id of ONSLAUGHT_START_POOL) {
    const name = getOnslaughtCollectionAugmentName(id, locale);
    assert.notEqual(name, id, `${locale}: missing ${id} collection label`);
    if (['zh-CN', 'ko', 'ja'].includes(locale)) assert.match(name, /[^\u0000-\u007f]/, `${locale}: native-script name required for ${id}`);
  }
}
console.log('[achievement-collections] PASS15 starting labels in8 locales');
