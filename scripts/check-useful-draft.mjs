import assert from 'node:assert/strict';
import { buildTacticalDraftOffers } from '../src/config/TacticalDraft.js';
for (let seed = 0; seed < 50; seed++) {
  const args = { seed: `build-progress-${seed}`, sectorCleared: 11, selectedIds: ['damage_up', 'damage_up'], preferBuildProgress: true };
  const offers = buildTacticalDraftOffers(args);
  assert.ok(offers.some(offer => offer.id === 'damage_up' && offer.nextStack === 3), 'a third level must not require taking unwanted new cards');
  for (const owned of ['shield', 'drones']) {
    const fusionOffers = buildTacticalDraftOffers({ ...args, selectedIds: [...args.selectedIds, owned] });
    assert.ok(fusionOffers.some(offer => offer.id === 'damage_up' && offer.nextStack === 3), 'a fusion option must not force out useful level three when both fit');
  }
  assert.equal(offers.filter(offer => offer.currentStacks > 0).length, 1, 'keep two exploration choices');
  assert.deepEqual(offers, buildTacticalDraftOffers(args), 'deterministic seed');
  assert.ok(!buildTacticalDraftOffers({ ...args, bannedIds: ['damage_up'] }).some(offer => offer.id === 'damage_up'));
  assert.ok(!buildTacticalDraftOffers({ ...args, ineffectiveIds: ['damage_up'] }).some(offer => offer.id === 'damage_up'));
  assert.ok(buildTacticalDraftOffers({ ...args, heldId: 'shield' }).some(offer => offer.id === 'shield'));
  const legacy = buildTacticalDraftOffers({ ...args, preferBuildProgress: false });
  assert.ok(!legacy.some(offer => offer.nextStack === 3), 'Daily default remains its recorded deterministic policy');
}
globalThis.Audio = class { addEventListener() {} };
assert.deepEqual(buildTacticalDraftOffers({ seed: 'daily-fixed-0', sectorCleared: 7,
  selectedIds: ['point_defense', 'point_defense', 'damage_up'], baseShotCount: 2 }).map(o => o.id),
['pierce', 'vector_boost', 'shield'], 'legacy default cap eligibility remains stable');
const { PlayScene } = await import('../src/scenes/PlayScene.js');
const scene = Object.assign(Object.create(PlayScene.prototype), { player: {
  runAugmentModifiers: { fusionIds: ['aegis_reactor'] },
  getRunAugmentStatPreview: id => ({ kind: 'stat', capped: true,
    projectedFusionIds: id === 'phase_wake' ? ['aegis_reactor', 'rift_reprisal'] : ['aegis_reactor'] })
} });
const ineffective = scene.getIneffectiveTacticalDraftOfferIds();
assert.ok(ineffective.includes('damage_up'), 'existing fusion must not exempt an unrelated capped card');
assert.ok(!ineffective.includes('phase_wake'), 'a genuinely new fusion still makes a capped card useful');
console.log('[useful-draft] PASS third levels, diversity, determinism, bans, held choices and meaningful fusion exception');
