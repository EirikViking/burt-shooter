import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  TACTICAL_DRAFT_BAN_COUNT,
  TACTICAL_DRAFT_AUGMENTS,
  TACTICAL_SCORE_ROUTE_SECTOR,
  buildTacticalDraftModifiers,
  buildTacticalDraftOffers,
  getActiveTacticalAugmentIds,
  getTacticalDraftDisplayMeta,
  getTacticalDraftMeta,
  getTacticalFusionBlueprints
} from '../src/config/TacticalDraft.js';
import {
  SHIP_THREAT_RESPONSE_TARGETS,
  getHybridDraftMovementMultiplier
} from '../src/config/ShipThreatResponse.js';
import { ShipData } from '../src/config/ShipData.js';
import { analyzeTacticalDoctrine } from '../src/config/TacticalDoctrine.js';
import { RUN_MODES } from '../src/game/RunMode.js';

const host = '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findAvailablePort(4560);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/tactical-draft-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error('No tactical draft check port available');
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startPreview() {
  if (await canFetch(baseUrl)) return null;
  const vite = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [vite, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error('Tactical draft preview did not start');
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForPlay(page) {
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && state.player?.active === true;
  }, null, { timeout: 20000 });
  await page.evaluate((tacticalRunMode) => {
    window.__game.runMode = tacticalRunMode;
    const play = window.__game?.scenes?.play;
    if (play) play.debugInvincible = true;
    play?.player?.grantInvulnerability?.(120000, 'tactical_draft_check');
  }, RUN_MODES.MAYHEM_TACTICAL);
}

function overlap(a, b, margin = 4) {
  return a.x < b.x + b.width + margin && a.x + a.width + margin > b.x &&
    a.y < b.y + b.height + margin && a.y + a.height + margin > b.y;
}

function assertDraftLayout(state, width, height, label, expectedOfferCount = 3) {
  assert(state.tacticalDraft?.active, `${label}: draft not active`);
  assert(state.tacticalDraft.offers.length === expectedOfferCount, `${label}: expected ${expectedOfferCount} offers`);
  const ids = state.tacticalDraft.offers.map((offer) => offer.id);
  assert(new Set(ids).size === expectedOfferCount, `${label}: duplicate offers ${ids.join(', ')}`);
  const bounds = state.tacticalDraft.offers.map((offer) => offer.bounds);
  bounds.forEach((box, index) => {
    assert(box && box.width > 80 && box.height > 80, `${label}: invalid card ${index} bounds`);
    assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 2 && box.y + box.height <= height + 2, `${label}: card ${index} outside viewport`);
  });
  for (let a = 0; a < bounds.length; a += 1) {
    for (let b = a + 1; b < bounds.length; b += 1) {
      assert(!overlap(bounds[a], bounds[b]), `${label}: cards ${a} and ${b} overlap: ${JSON.stringify([bounds[a], bounds[b]])}`);
    }
  }
  const holdBounds = state.tacticalDraft.holdBounds;
  const rescanBounds = state.tacticalDraft.rescanBounds;
  const banBounds = state.tacticalDraft.banBounds;
  const passBounds = state.tacticalDraft.passBounds;
  assert(holdBounds && rescanBounds && banBounds && passBounds, `${label}: missing Draft controls`);
  assert(!overlap(holdBounds, rescanBounds), `${label}: hold and rescan controls overlap`);
  assert(!overlap(holdBounds, banBounds), `${label}: hold and ban controls overlap`);
  assert(!overlap(holdBounds, passBounds), `${label}: hold and pass controls overlap`);
  assert(!overlap(rescanBounds, banBounds), `${label}: rescan and ban controls overlap`);
  assert(!overlap(rescanBounds, passBounds), `${label}: rescan and pass controls overlap`);
  assert(!overlap(banBounds, passBounds), `${label}: ban and pass controls overlap`);
  for (const box of bounds) {
    assert(!overlap(holdBounds, box, 0), `${label}: hold control overlaps a card`);
    assert(!overlap(rescanBounds, box, 0), `${label}: rescan control overlaps a card`);
    assert(!overlap(banBounds, box, 0), `${label}: ban control overlaps a card`);
    assert(!overlap(passBounds, box, 0), `${label}: pass control overlaps a card`);
  }
  const buildSummary = state.tacticalDraft.buildSummary;
  assert(buildSummary?.bounds && buildSummary.bounds.width > 120 && buildSummary.bounds.height > 20,
    `${label}: active-build summary is missing`);
  assert(String(buildSummary.title || '').trim(), `${label}: active-build summary title is missing`);
  for (const box of bounds) {
    assert(!overlap(buildSummary.bounds, box, 0),
      `${label}: active-build summary overlaps a card: ${JSON.stringify({ summary: buildSummary.bounds, card: box })}`);
  }
  state.tacticalDraft.offers.forEach((offer, index) => {
    const card = bounds[index];
    for (const [name, textBounds] of [
      ['name', offer.nameBounds],
      ['description', offer.descriptionBounds],
      ['category badge', offer.categoryBadgeBounds],
      ['impact badge', offer.impactBadgeBounds],
      ['doctrine badge', offer.doctrineBadgeBounds],
      ['permanence badge', offer.permanenceBadgeBounds]
    ]) {
      assert(textBounds && textBounds.width > 0 && textBounds.height > 0, `${label}: ${name} ${index} has invalid bounds`);
      assert(textBounds.x >= card.x - 2 && textBounds.y >= card.y - 2 && textBounds.x + textBounds.width <= card.x + card.width + 2 && textBounds.y + textBounds.height <= card.y + card.height + 2, `${label}: ${name} ${index} escapes card`);
    }
    if (!offer.fixedScoreRoute) {
      assert(offer.stackBadgeBounds?.width > 0 && String(offer.stackText || '').trim(), `${label}: offer ${offer.id} is missing stack state`);
    }
    assert(['stat', 'contextual'].includes(offer.statPreview?.kind), `${label}: offer ${offer.id} has no trustworthy impact mode`);
    assert(String(offer.impactLabelText || '').trim(), `${label}: offer ${offer.id} is missing impact context`);
    if (offer.statPreview.kind === 'stat') {
      assert(String(offer.impactValueText || '').includes('→'), `${label}: offer ${offer.id} is missing before/after impact`);
      assert(offer.impactLabelBounds?.width > 0 && offer.impactValueBounds?.width > 0,
        `${label}: offer ${offer.id} is missing impact text bounds`);
      assert(!overlap(offer.impactLabelBounds, offer.impactValueBounds, 0),
        `${label}: offer ${offer.id} impact label overlaps its values`);
    } else {
      assert(!offer.impactValueText, `${label}: contextual offer ${offer.id} exposed a misleading number`);
    }
    assert(String(offer.categoryText || '').trim() && String(offer.permanenceText || '').trim(),
      `${label}: offer ${offer.id} is missing category or permanence`);
    assert(offer.doctrineProjection?.afterId || offer.doctrineProjection?.consumed, `${label}: offer ${offer.id} missing doctrine forecast`);
    assert(String(offer.doctrinePreviewText || '').trim(), `${label}: offer ${offer.id} missing doctrine forecast text`);
    if (offer.fusionBlueprint) {
      for (const [name, textBounds] of [
        ['fusion badge', offer.fusionBadgeBounds],
        ['fusion label', offer.fusionLabelBounds],
        ['fusion name', offer.fusionNameBounds],
        ['fusion hint', offer.fusionHintBounds]
      ]) {
        assert(textBounds && textBounds.width > 0 && textBounds.height > 0, `${label}: ${name} ${index} has invalid bounds`);
        assert(textBounds.x >= card.x - 2 && textBounds.y >= card.y - 2 && textBounds.x + textBounds.width <= card.x + card.width + 2 && textBounds.y + textBounds.height <= card.y + card.height + 2,
          `${label}: ${name} ${index} escapes card`);
      }
      assert(['blueprint', 'completes'].includes(offer.fusionBlueprint.status), `${label}: invalid Fusion forecast status for ${offer.id}`);
      assert(String(offer.fusionLabelText || '').trim() && String(offer.fusionNameText || '').trim() && String(offer.fusionHintText || '').trim(),
        `${label}: Fusion forecast for ${offer.id} is missing player-facing copy`);
    }
  });
  assert(state.tacticalDraft.initialFocusIndex === state.tacticalDraft.focusIndex, `${label}: neutral initial focus was not applied`);
}

const lowLifeOffers = buildTacticalDraftOffers({ seed: 'check', sectorCleared: 2, lives: 1, maxLives: 3 });
assert(TACTICAL_DRAFT_AUGMENTS.length === 32, `expected curated 32-augment pool, got ${TACTICAL_DRAFT_AUGMENTS.length}`);
const evolutionAugments = TACTICAL_DRAFT_AUGMENTS.filter((augment) => augment.maxStacks === 3);
assert(evolutionAugments.length === 16, `expected 16 repeatable overdrives, got ${evolutionAugments.length}`);
assert(evolutionAugments.every((augment) => augment.evolutionName), 'every repeatable augment needs an evolution identity');
assert(new Set(evolutionAugments.map((augment) => augment.evolutionName)).size === 16, 'evolution identities must remain unique');
assert(getTacticalDraftDisplayMeta('damage_up', 1)?.displayName === 'DAMAGE UP', 'stack I should keep its base identity');
assert(getTacticalDraftDisplayMeta('damage_up', 2)?.displayName === 'WARHEAD AUTHORITY', 'stack II should expose its evolution identity');
assert(getTacticalDraftDisplayMeta('damage_up', 3)?.overdriven === true, 'stack III should expose its diminishing overdrive state');
assert(TACTICAL_DRAFT_BAN_COUNT === 2, 'each run should provide exactly two upgrade bans');
const beforeScoreRoute = buildTacticalDraftOffers({ seed: 'score-route', sectorCleared: TACTICAL_SCORE_ROUTE_SECTOR - 1 });
const scoreRoute = buildTacticalDraftOffers({ seed: 'score-route', sectorCleared: TACTICAL_SCORE_ROUTE_SECTOR });
const afterScoreRoute = buildTacticalDraftOffers({ seed: 'score-route', sectorCleared: TACTICAL_SCORE_ROUTE_SECTOR + 1 });
assert(!beforeScoreRoute.some((offer) => offer.id === 'combo_anchor'), 'score route must not be random before its fixed sector');
assert(scoreRoute.filter((offer) => offer.id === 'combo_anchor' && offer.fixedScoreRoute).length === 1, 'fixed sector must offer one clearly marked scoring choice');
assert(!afterScoreRoute.some((offer) => offer.id === 'combo_anchor'), 'score route must not randomly reappear after its fixed sector');
const bannedScoreRoute = buildTacticalDraftOffers({ seed: 'score-route', sectorCleared: TACTICAL_SCORE_ROUTE_SECTOR, bannedIds: ['combo_anchor'] });
assert(bannedScoreRoute.some((offer) => offer.id === 'combo_anchor' && offer.fixedScoreRoute),
  'the one-time scoring route must ignore stale bans and remain available at Sector 5');
for (const category of ['offense', 'mobility', 'defense', 'utility']) {
  assert(TACTICAL_DRAFT_AUGMENTS.filter((augment) => augment.category === category).length === 8,
    `expected 8 ${category} augments`);
}
const newAugmentIds = [
  'phase_reactor', 'focus_lens', 'inertial_dampers', 'phase_wake', 'slipstream_coils',
  'emergency_bulkhead', 'impact_foam', 'graze_plating', 'last_light',
  'combo_anchor', 'salvage_clock', 'power_saver', 'drone_link'
];
for (const id of newAugmentIds) {
  const meta = getTacticalDraftMeta(id);
  assert(meta?.name && meta?.description && meta?.detail, `${id} missing complete player-facing metadata`);
  assert(meta?.sfx === `tactical_${id}`, `${id} missing unique tactical SFX alias`);
  assert(existsSync(path.resolve(`public/art/generated/nova-swarm/augments/nova-augment-${id}-20260711.png`)), `${id} missing generated icon`);
  assert(existsSync(path.resolve(`public/audio/sfx/nova-swarm/nova_tactical_${id}.mp3`)), `${id} missing generated SFX`);
}
const expanded = buildTacticalDraftModifiers(newAugmentIds);
for (const modifier of [
  'phaseReload', 'focusDamageMult', 'focusSpreadMult', 'focusSpeedMult', 'phaseClearRadius', 'movingDodgeRecoveryMult',
  'lowLifeSectorShieldMs', 'hitInvulnerabilityBonusMs', 'grazeShieldThreshold', 'lowLifeDodgeRecoveryMult',
  'comboWindowBonusMs', 'pickupLifetimeMult', 'powerupDurationMult', 'droneDamageMult'
]) {
  assert(expanded[modifier] !== undefined, `expanded tactical modifiers missing ${modifier}`);
}
assert(getActiveTacticalAugmentIds(['damage_up', 'nano_patch'], ['nano_patch']).join(',') === 'damage_up',
  'consumed augments must be excluded from active modifiers');
assert(lowLifeOffers.length === 3, 'pure draft must return three offers');
assert(lowLifeOffers.some((offer) => offer.category === 'defense'), 'low-life draft must include defense');
assert(!lowLifeOffers.some((offer) => offer.id === 'nano_patch') || lowLifeOffers[0].category === 'defense', 'repair must remain in defense lane');
const followupOffers = buildTacticalDraftOffers({ seed: 'check', sectorCleared: 3, lives: 3, maxLives: 3, selectedIds: [lowLifeOffers[0].id] });
assert(followupOffers.filter((offer) => offer.currentStacks > 0).length === 1, 'follow-up draft should offer exactly one controlled evolution lane');
assert(followupOffers.filter((offer) => offer.currentStacks === 0).length === 2, 'follow-up draft should preserve two fresh choices');
const stacked = buildTacticalDraftModifiers(['damage_up', 'rapid_fire', 'double_shot', 'magnet']);
assert(stacked.damageMult > 1 && stacked.fireDelayMult < 1 && stacked.shotBonus === 1 && stacked.magnetRadiusBonus > 0, 'stacked modifiers incomplete');
const doubleDamage = buildTacticalDraftModifiers(['damage_up', 'damage_up']);
assert(doubleDamage.damageMult > 1.12 && doubleDamage.damageMult < 1.12 * 1.12, 'second stack should have diminishing returns');
const tripleDamage = buildTacticalDraftModifiers(['damage_up', 'damage_up', 'damage_up']);
assert(tripleDamage.damageMult > doubleDamage.damageMult && tripleDamage.damageMult < doubleDamage.damageMult * 1.12, 'third stack should extend the late pool with stronger diminishing returns');
const latePoolSelected = TACTICAL_DRAFT_AUGMENTS.flatMap((augment) => Array(Math.min(augment.maxStacks, augment.maxStacks === 3 ? 2 : 1)).fill(augment.id));
const latePoolOffers = buildTacticalDraftOffers({
  seed: 'sector-forty-proof',
  sectorCleared: 40,
  selectedIds: latePoolSelected,
  bannedIds: ['damage_up', 'rapid_fire']
});
assert(latePoolOffers.length === 3 && latePoolOffers.every((offer) => offer.nextStack === 3),
  `sector-forty pool should still provide three overdrive choices: ${JSON.stringify(latePoolOffers)}`);
const matchingTimedPickup = buildTacticalDraftModifiers(['damage_up', 'rapid_fire'], { activePowerupType: 'damage_up' });
assert(matchingTimedPickup.overlapSuppressedId === 'damage_up', 'matching timed pickup should suppress only its duplicate Draft effect');
assert(Math.abs(matchingTimedPickup.damageMult - 1) < 0.0001 && matchingTimedPickup.fireDelayMult < 1, 'matching timed pickup suppression affected unrelated Draft effects');
const matchingDoubleShot = buildTacticalDraftModifiers(['double_shot'], { activePowerupType: 'double_shot' });
assert(!matchingDoubleShot.overlapSuppressedId && matchingDoubleShot.shotBonus === 1,
  'timed Double Shot should stack on, not suppress, the permanent Tactical shot bonus');
const evolutionOffers = buildTacticalDraftOffers({
  seed: 'evolution-proof',
  sectorCleared: 3,
  selectedIds: ['damage_up', 'speed_up'],
  lives: 3,
  maxLives: 4
});
assert(evolutionOffers.filter((offer) => offer.currentStacks === 1 && offer.nextStack === 2).length === 1,
  `sector-three Draft should contain exactly one evolution offer: ${JSON.stringify(evolutionOffers)}`);
assert(evolutionOffers.filter((offer) => offer.currentStacks === 0).length === 2,
  'sector-three Draft should preserve two fresh choices beside the evolution');
assert(evolutionOffers.find((offer) => offer.currentStacks === 1)?.evolved === true, 'stack-II offer should be marked evolved');
assert(evolutionOffers.find((offer) => offer.currentStacks === 1)?.displayName !== evolutionOffers.find((offer) => offer.currentStacks === 1)?.name,
  'stack-II offer should use a distinct evolution name');
const heldOfferId = lowLifeOffers[1].id;
const heldOffers = buildTacticalDraftOffers({
  seed: 'held-proof',
  sectorCleared: 3,
  lives: 3,
  maxLives: 4,
  excludedIds: lowLifeOffers.map((offer) => offer.id),
  heldId: heldOfferId
});
assert(heldOffers.some((offer) => offer.id === heldOfferId && offer.held === true),
  `held offer did not survive exclusion/rescan: ${JSON.stringify(heldOffers)}`);
assert(heldOffers.filter((offer) => offer.held).length === 1, 'Draft should expose exactly one held offer');

const exhaustedSelectedIds = TACTICAL_DRAFT_AUGMENTS.flatMap((augment) => (
  augment.id === 'shield' ? [] : Array.from({ length: augment.maxStacks }, () => augment.id)
));
const exhaustedOffers = buildTacticalDraftOffers({
  seed: 'exhausted-draft-fixture',
  sectorCleared: 99,
  selectedIds: exhaustedSelectedIds,
  lives: 2,
  maxLives: 4
});
assert(exhaustedOffers.length === 1 && exhaustedOffers[0].id === 'shield',
  `exhausted Draft should stay usable with one valid offer: ${JSON.stringify(exhaustedOffers)}`);

const phaseBlueprint = getTacticalFusionBlueprints('phase_reactor', []);
assert(phaseBlueprint.length === 1 && phaseBlueprint[0].id === 'rift_reprisal', 'Phase Reactor should expose the Rift Reprisal blueprint');
assert(phaseBlueprint[0].status === 'blueprint' && phaseBlueprint[0].missingPartnerIds.includes('phase_wake'),
  `unpaired Phase Reactor should name Phase Wake as missing: ${JSON.stringify(phaseBlueprint)}`);
const phaseCompletion = getTacticalFusionBlueprints('phase_reactor', ['phase_wake']);
assert(phaseCompletion.length === 1 && phaseCompletion[0].status === 'completes' && phaseCompletion[0].completesOnPick,
  `Phase Reactor should forecast a completed Fusion when Phase Wake is owned: ${JSON.stringify(phaseCompletion)}`);
assert(getTacticalFusionBlueprints('phase_reactor', ['phase_reactor', 'phase_wake']).length === 0,
  'already-active Fusions should not keep advertising a Draft blueprint');

const doctrineArgs = {
  seed: 'doctrine-descriptive-only',
  sectorCleared: 4,
  selectedIds: ['damage_up', 'damage_up', 'rapid_fire'],
  lives: 3,
  maxLives: 4,
  baseShotCount: 1
};
const gunshipDoctrine = analyzeTacticalDoctrine(doctrineArgs.selectedIds);
assert(gunshipDoctrine?.id === 'gunship', `expected Gunship doctrine for eligibility proof: ${JSON.stringify(gunshipDoctrine)}`);
const doctrineOffersA = buildTacticalDraftOffers({ ...doctrineArgs, doctrine: gunshipDoctrine });
const doctrineOffersB = buildTacticalDraftOffers({
  ...doctrineArgs,
  doctrine: { id: 'bastion', weights: { defense: 999 }, eligibleIds: ['shield'] }
});
assert(
  JSON.stringify(doctrineOffersA) === JSON.stringify(doctrineOffersB),
  'Run Doctrine metadata affected candidate eligibility, ordering, or weights'
);

const allExceptPhaseWake = TACTICAL_DRAFT_AUGMENTS
  .filter((augment) => augment.id !== 'phase_wake')
  .flatMap((augment) => Array(Math.min(augment.maxStacks, augment.maxStacks === 3 ? 2 : 1)).fill(augment.id));
const fusionBeforeThirdStack = buildTacticalDraftOffers({
  seed: 'fusion-before-third-stack',
  sectorCleared: 14,
  selectedIds: allExceptPhaseWake,
  lives: 3,
  maxLives: 4
});
assert(
  fusionBeforeThirdStack.some((offer) => offer.id === 'phase_wake' && offer.fusionCompletionPriority),
  `eligible Fusion partner was not reserved ahead of Stack III: ${JSON.stringify(fusionBeforeThirdStack)}`
);

const heldAndFixed = buildTacticalDraftOffers({
  seed: 'held-fixed-fusion-priority',
  sectorCleared: TACTICAL_SCORE_ROUTE_SECTOR,
  selectedIds: ['phase_reactor'],
  heldId: 'damage_up',
  lives: 3,
  maxLives: 4
});
assert(heldAndFixed.some((offer) => offer.id === 'phase_wake' && offer.fusionCompletionPriority),
  `Fusion priority disappeared beside held/fixed choices: ${JSON.stringify(heldAndFixed)}`);
assert(heldAndFixed.some((offer) => offer.id === 'damage_up' && offer.held),
  `held choice did not survive Fusion priority: ${JSON.stringify(heldAndFixed)}`);
assert(heldAndFixed.some((offer) => offer.id === 'combo_anchor' && offer.fixedScoreRoute),
  `fixed Sector 5 score route did not survive Fusion priority: ${JSON.stringify(heldAndFixed)}`);

for (let index = 0; index < 40; index += 1) {
  const capSafeOffers = buildTacticalDraftOffers({
    seed: `ineffective-cap-filter-${index}`,
    sectorCleared: 12,
    selectedIds: ['damage_up'],
    ineffectiveIds: ['damage_up'],
    heldId: 'damage_up',
    lives: 3,
    maxLives: 4
  });
  assert(!capSafeOffers.some((offer) => offer.id === 'damage_up'),
    `ineffective damage-only choice survived the cap filter for seed ${index}: ${JSON.stringify(capSafeOffers)}`);
  assert(capSafeOffers.length === 3,
    `cap filter did not backfill three useful choices for seed ${index}: ${JSON.stringify(capSafeOffers)}`);
}

for (let index = 0; index < 40; index += 1) {
  const bannedPartner = buildTacticalDraftOffers({
    seed: `banned-fusion-partner-${index}`,
    sectorCleared: 9,
    selectedIds: ['phase_reactor'],
    bannedIds: ['phase_wake']
  });
  assert(!bannedPartner.some((offer) => offer.id === 'phase_wake'),
    `banned Fusion partner was forced for seed ${index}: ${JSON.stringify(bannedPartner)}`);
  const cappedConsumedPartner = buildTacticalDraftOffers({
    seed: `capped-fusion-partner-${index}`,
    sectorCleared: 9,
    selectedIds: ['phase_reactor', 'phase_wake'],
    consumedIds: ['phase_wake']
  });
  assert(!cappedConsumedPartner.some((offer) => offer.id === 'phase_wake'),
    `capped/consumed Fusion partner was forced for seed ${index}: ${JSON.stringify(cappedConsumedPartner)}`);
}

const prioritySelected = TACTICAL_DRAFT_AUGMENTS
  .filter((augment) => augment.id !== 'focus_lens')
  .flatMap((augment) => Array(Math.min(augment.maxStacks, augment.id === 'damage_up' || augment.id === 'rapid_fire' ? 2 : 1)).fill(augment.id));
for (let index = 0; index < 80; index += 1) {
  const offers = buildTacticalDraftOffers({
    seed: `unseen-before-stack-three-${index}`,
    sectorCleared: 12,
    selectedIds: prioritySelected,
    lives: 3,
    maxLives: 4
  });
  const hasThirdStack = offers.some((offer) => offer.nextStack === 3);
  if (hasThirdStack) {
    assert(offers.some((offer) => offer.id === 'focus_lens'),
      `Stack III crowded out an unseen valid choice for seed ${index}: ${JSON.stringify(offers)}`);
  }
}

const singleLaneOfferSectors = [];
for (let sectorCleared = 1; sectorCleared <= 12; sectorCleared += 1) {
  const offers = buildTacticalDraftOffers({
    seed: 'gunship-single-lane-catchup',
    sectorCleared,
    selectedIds: ['damage_up', 'rapid_fire'],
    baseShotCount: 1,
    lives: 3,
    maxLives: 4,
    doctrine: gunshipDoctrine
  });
  if (offers.some((offer) => offer.id === 'double_shot')) singleLaneOfferSectors.push(sectorCleared);
}
assert(singleLaneOfferSectors.some((sector) => sector <= 3),
  `single-lane Gunship build was starved of Double Shot: ${singleLaneOfferSectors.join(',')}`);
assert([3, 6, 9, 12].every((sector) => singleLaneOfferSectors.includes(sector)),
  `single-lane catch-up cadence was not bounded: ${singleLaneOfferSectors.join(',')}`);

for (let index = 0; index < 80; index += 1) {
  const args = {
    seed: `determinism-${index}`,
    sectorCleared: 1 + (index % 18),
    selectedIds: index % 2 ? ['phase_reactor', 'damage_up', 'damage_up'] : ['shield', 'speed_up'],
    baseShotCount: index % 3 === 0 ? 1 : 2,
    lives: 1 + (index % 3),
    maxLives: 4,
    heldId: index % 5 === 0 ? 'magnet' : null,
    bannedIds: index % 7 === 0 ? ['rapid_fire'] : []
  };
  assert(
    JSON.stringify(buildTacticalDraftOffers(args)) === JSON.stringify(buildTacticalDraftOffers(args)),
    `seeded offers changed between identical calls for seed ${args.seed}`
  );
}

const offerSimulation = [];
let recentOfferIds = [];
let previousOfferIds = [];
for (let index = 0; index < 120; index += 1) {
  const offers = buildTacticalDraftOffers({
    seed: `long-offer-simulation-${index}`,
    sectorCleared: 1 + (index % 24),
    lives: 2 + (index % 2),
    maxLives: 4,
    baseShotCount: 2,
    recentOfferIds
  });
  const repeats = offers.filter((offer) => previousOfferIds.includes(offer.id));
  const unexplainedRepeats = repeats.filter((offer) => !(
    offer.fusionCompletionPriority || offer.singleLaneCatchup || offer.fixedScoreRoute || offer.held
  ));
  assert(unexplainedRepeats.length === 0,
    `long simulation repeated ordinary offers at step ${index}: ${unexplainedRepeats.map((offer) => offer.id).join(', ')}`);
  offerSimulation.push({ index, offers: offers.map((offer) => offer.id), repeats: repeats.map((offer) => offer.id) });
  previousOfferIds = offers.map((offer) => offer.id);
  recentOfferIds = [...recentOfferIds, ...previousOfferIds].slice(-9);
}

assert(ShipData.length === 30, `expected 30 hulls for movement scaling audit, got ${ShipData.length}`);
const movementAudit = ShipData.map((ship) => {
  const speed = Number(ship.stats?.speed) || 1;
  const multiplier = getHybridDraftMovementMultiplier(speed, 1.24);
  assert(multiplier >= 1 && multiplier <= 1 + SHIP_THREAT_RESPONSE_TARGETS.maxDraftMovementGain,
    `${ship.name}: movement multiplier ${multiplier} escaped cap`);
  return { ship: ship.name, speed, multiplier };
});
for (const [offerId, partnerId, fusionId] of [
  ['drones', 'drone_link', 'drone_constellation'],
  ['shield', 'point_defense', 'aegis_reactor'],
  ['bomb', 'orbital_strike', 'sky_verdict']
]) {
  const forecast = getTacticalFusionBlueprints(offerId, [partnerId]);
  assert(forecast.length === 1 && forecast[0].id === fusionId && forecast[0].completesOnPick,
    `${offerId} did not forecast ${fusionId} with ${partnerId} owned`);
}

function findFusionOfferCase(targetId, selectedIds, sectorCleared) {
  for (let index = 0; index < 800; index += 1) {
    const seed = `fusion-blueprint-${targetId}-${index}`;
    const offers = buildTacticalDraftOffers({ seed, sectorCleared, selectedIds, lives: 3, maxLives: 4 });
    if (offers.some((offer) => offer.id === targetId)) return { seed, sectorCleared, selectedIds, offerIds: offers.map((offer) => offer.id) };
  }
  throw new Error(`Unable to find deterministic Draft case for ${targetId}`);
}

const phaseBlueprintCase = findFusionOfferCase('phase_reactor', [], 1);
const phaseCompletionCase = findFusionOfferCase('phase_reactor', ['phase_wake'], 2);

mkdirSync(outputDir, { recursive: true });
const server = await startPreview();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const consoleErrors = [];
const report = { ok: false, baseUrl, pure: { augmentCount: TACTICAL_DRAFT_AUGMENTS.length, lowLifeOffers: lowLifeOffers.map((offer) => offer.id) } };

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text()}`);
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlay(page);

  await page.keyboard.down('Space');
  await page.evaluate(() => window.__game.scenes.play.openTacticalDraft({ sectorCleared: 1 }));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === true);
  await page.waitForTimeout(480);
  let heldFireState = await readState(page);
  assert(heldFireState.tacticalDraft.confirmedId === null && heldFireState.tacticalDraft.history.length === 0, 'held fire auto-confirmed a tactical draft choice');
  assert(heldFireState.tacticalDraft.inputArmed === false, 'draft armed before held fire was released');
  await page.keyboard.up('Space');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  let state = await readState(page);
  assertDraftLayout(state, 1280, 720, 'desktop');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(180);
  state = await readState(page);
  assertDraftLayout(state, 1920, 1080, 'first-draft-1920x1080');
  assert(state.tacticalDraft.initialFocusIndex === 1, 'ordinary first Draft should use neutral middle focus');
  const firstDraftScreenshot = path.join(outputDir, 'tactical-draft-first-1920x1080.png');
  await page.screenshot({ path: firstDraftScreenshot });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(180);
  state = await readState(page);
  assertDraftLayout(state, 1280, 720, 'desktop-restored');
  const firstOfferIds = state.tacticalDraft.offers.map((offer) => offer.id);
  assert(state.tacticalDraft.rescansRemaining === 1, 'fresh run should expose one Draft rescan');
  assert(state.tacticalDraft.bansRemaining === 2, 'fresh run should expose two Draft bans');
  const keyboardHeldId = firstOfferIds[state.tacticalDraft.focusIndex];
  await page.keyboard.press('l');
  await page.waitForFunction((id) => JSON.parse(window.render_game_to_text()).tacticalDraft?.heldId === id, keyboardHeldId);
  state = await readState(page);
  assert(/HELD|GEHALTEN|RESERV|СОХРАН|保留|보관/i.test(state.tacticalDraft.holdLabel || ''), 'hold control did not show active state');
  await page.keyboard.press('r');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.rescansRemaining === 0);
  state = await readState(page);
  const rescannedOfferIds = state.tacticalDraft.offers.map((offer) => offer.id);
  assert(rescannedOfferIds.includes(keyboardHeldId), `rescan dropped held offer: ${rescannedOfferIds.join(', ')}`);
  assert(rescannedOfferIds.filter((id) => id !== keyboardHeldId).every((id) => !firstOfferIds.includes(id)),
    `rescan repeated an unheld prior offer: ${rescannedOfferIds.join(', ')}`);
  assert(state.tacticalDraft.offers.filter((offer) => offer.held).length === 1, 'rescan did not retain exactly one held card');
  assert(state.tacticalDraft.offers[state.tacticalDraft.initialFocusIndex]?.id === keyboardHeldId, 'held offer should receive initial focus after rescan');
  assert(/USED/i.test(state.tacticalDraft.rescanLabel || ''), 'rescan control did not show its spent state');
  const banTargetIndex = state.tacticalDraft.offers.findIndex((offer) => offer.id !== keyboardHeldId);
  const banNavigationSteps = (banTargetIndex - state.tacticalDraft.focusIndex + state.tacticalDraft.offers.length) % state.tacticalDraft.offers.length;
  for (let step = 0; step < banNavigationSteps; step += 1) {
    const previousFocus = state.tacticalDraft.focusIndex;
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction((focus) => JSON.parse(window.render_game_to_text()).tacticalDraft?.focusIndex !== focus, previousFocus);
    state = await readState(page);
  }
  assert(state.tacticalDraft.focusIndex === banTargetIndex, `keyboard navigation missed ban target ${banTargetIndex}: ${state.tacticalDraft.focusIndex}`);
  state = await readState(page);
  const keyboardBannedId = state.tacticalDraft.offers[state.tacticalDraft.focusIndex].id;
  await page.keyboard.press('b');
  await page.waitForFunction((id) => {
    const draft = JSON.parse(window.render_game_to_text()).tacticalDraft;
    return draft?.lastBannedId === id && draft?.bansRemaining === 1;
  }, keyboardBannedId);
  state = await readState(page);
  assert(!state.tacticalDraft.offers.some((offer) => offer.id === keyboardBannedId), 'keyboard-banned upgrade remained in the Draft');
  assert(state.tacticalDraft.heldId === keyboardHeldId, 'banning another card discarded the held upgrade');
  const frozenTime = state.arcadeRun.runElapsedSeconds;
  await page.waitForTimeout(450);
  state = await readState(page);
  assert(Math.abs(state.arcadeRun.runElapsedSeconds - frozenTime) < 0.02, 'run clock advanced while draft was active');
  const desktopScreenshot = path.join(outputDir, 'tactical-draft-desktop.png');
  await page.screenshot({ path: desktopScreenshot });

  const keyboardTargetIndex = (state.tacticalDraft.focusIndex + 1) % state.tacticalDraft.offers.length;
  const keyboardTarget = state.tacticalDraft.offers[keyboardTargetIndex];
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((target) => JSON.parse(window.render_game_to_text()).tacticalDraft?.focusIndex === target, keyboardTargetIndex);
  const lockInStartedAt = Date.now();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.lockInActive === true, null, { timeout: 3000 });
  await page.waitForTimeout(180);
  const lockInState = await readState(page);
  assert(lockInState.tacticalDraft.confirmedId, 'lock-in celebration lost the confirmed choice');
  assert(lockInState.tacticalDraft.installingCategory === keyboardTarget.category,
    `selected augment was not shown in its ${keyboardTarget.category} Active Build slot`);
  assert(lockInState.tacticalDraft.installingName === keyboardTarget.name,
    'Active Build slot did not identify the augment being installed');
  assert(lockInState.tacticalDraft.buildSummary.activeIds.includes(lockInState.tacticalDraft.confirmedId),
    'confirmed augment was not present in Active Build before combat resumed');
  assert(lockInState.tacticalDraft.confirmHoldMs === 1000,
    `Active Build confirmation should hold for one second, got ${lockInState.tacticalDraft.confirmHoldMs}ms`);
  assert(lockInState.tacticalDraft.lockInProgress > 0 && lockInState.tacticalDraft.lockInProgress < 1,
    `lock-in celebration did not animate: ${lockInState.tacticalDraft.lockInProgress}`);
  const lockInScreenshot = path.join(outputDir, 'tactical-draft-lock-in.png');
  await page.screenshot({ path: lockInScreenshot });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });
  assert(Date.now() - lockInStartedAt >= 950, 'Tactical Draft did not hold the installed augment for one second');
  state = await readState(page);
  assert(state.tacticalDraft.history.length === 1, 'keyboard selection was not recorded');

  await page.evaluate(() => {
    window.__game.scenes.play.openTacticalDraft({ sectorCleared: 2 });
    window.__burtGamepadOverride = { connected: true, axes: [0, 0], buttons: [] };
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === true);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  state = await readState(page);
  assert(state.tacticalDraft.offers.some((offer) => offer.id === keyboardHeldId && offer.held), 'held card did not return in the next Draft');
  await page.evaluate(() => { window.__burtGamepadOverride.buttons[2] = { pressed: true, value: 1 }; });
  await page.waitForFunction(() => {
    const draft = JSON.parse(window.render_game_to_text()).tacticalDraft;
    return draft?.heldId === null && draft?.lastHoldSource === 'gamepad';
  });
  await page.evaluate(() => { window.__burtGamepadOverride.buttons[2] = { pressed: false, value: 0 }; });
  await page.waitForTimeout(80);
  await page.evaluate(() => { window.__burtGamepadOverride.buttons[5] = { pressed: true, value: 1 }; });
  await page.waitForFunction(() => {
    const draft = JSON.parse(window.render_game_to_text()).tacticalDraft;
    return draft?.lastBanSource === 'gamepad' && draft?.bansRemaining === 0;
  });
  await page.evaluate(() => { window.__burtGamepadOverride.buttons[5] = { pressed: false, value: 0 }; });
  await page.waitForTimeout(80);
  state = await readState(page);
  const gamepadTargetIndex = (state.tacticalDraft.focusIndex + 1) % state.tacticalDraft.offers.length;
  await page.evaluate(() => { window.__burtGamepadOverride.axes = [1, 0]; });
  await page.waitForFunction((target) => JSON.parse(window.render_game_to_text()).tacticalDraft?.focusIndex === target, gamepadTargetIndex);
  await page.evaluate(() => { window.__burtGamepadOverride.axes = [0, 0]; });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__burtGamepadOverride.buttons[0] = { pressed: true, value: 1 }; });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.confirmedId, null, { timeout: 3000 });
  await page.evaluate(() => { window.__burtGamepadOverride.buttons[0] = { pressed: false, value: 0 }; });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });
  state = await readState(page);
  assert(state.tacticalDraft.history.length === 2, 'gamepad selection was not recorded');
  assert(state.tacticalDraft.heldId === null, 'held offer was not consumed after its return Draft resolved');

  await page.setViewportSize({ width: 760, height: 640 });
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    delete window.__burtGamepadOverride;
    window.__game.scenes.play.openTacticalDraft({ sectorCleared: 3 });
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.compact === true);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  state = await readState(page);
  assertDraftLayout(state, 760, 640, 'compact');
  const compactScreenshot = path.join(outputDir, 'tactical-draft-compact.png');
  await page.screenshot({ path: compactScreenshot });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(180);
  state = await readState(page);
  assertDraftLayout(state, 1920, 1080, 'late-draft-1920x1080');
  assert(state.tacticalDraft.history.length === 2 && state.tacticalDraft.buildSummary.activeIds.length >= 1,
    'late Draft did not expose the selected active build');
  assert(state.tacticalDraft.materialReady === true, 'late Draft did not load its command-field material');
  assert(state.tacticalDraft.offers.every((offer) => offer.visualLanguage === 'tactical_command_module_v4' && offer.materialReady),
    'late Draft cards did not use the premium command-module material');
  const lateDraftScreenshot = path.join(outputDir, 'tactical-draft-late-1920x1080.png');
  await page.screenshot({ path: lateDraftScreenshot });
  await page.setViewportSize({ width: 760, height: 640 });
  await page.waitForTimeout(180);
  state = await readState(page);
  assertDraftLayout(state, 760, 640, 'compact-restored');
  const holdTarget = state.tacticalDraft.holdBounds;
  await page.mouse.click(holdTarget.x + holdTarget.width / 2, holdTarget.y + holdTarget.height / 2);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.heldId);
  state = await readState(page);
  assert(state.tacticalDraft.lastHoldSource === 'pointer', 'pointer hold did not record its input source');
  const clickTarget = state.tacticalDraft.offers[1].bounds;
  await page.mouse.click(clickTarget.x + clickTarget.width / 2, clickTarget.y + clickTarget.height / 2);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });
  state = await readState(page);
  assert(state.tacticalDraft.history.length === 3, 'pointer selection was not recorded');
  const summary = await page.evaluate(() => window.__game.buildRunSummary());
  assert(summary.tacticalDraftPicks.length === 3 && summary.tacticalAugmentIds.length === 3, 'run summary did not preserve draft history');
  await page.evaluate(() => window.__game.scenes.play.setPaused(true));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).isPaused === true);
  const pauseState = await readState(page);
  const pauseTacticalSummary = String(pauseState.pauseOverlay?.tacticalDraft || '');
  const pickedNames = (state.tacticalDraft.history || []).map((entry) => String(entry.name || '').toUpperCase()).filter(Boolean);
  assert(pauseTacticalSummary.trim() && pickedNames.some((name) => pauseTacticalSummary.toUpperCase().includes(name)),
    `pause menu did not expose the current tactical build: ${JSON.stringify(pauseState.pauseOverlay)}`);
  await page.evaluate(() => window.__game.scenes.play.setPaused(false));

  await page.evaluate((selectedIds) => {
    const play = window.__game.scenes.play;
    play.tacticalDraftHeldId = null;
    play.tacticalDraftBansRemaining = 0;
    play.tacticalDraftBanMilestonesAwarded = 0;
    play.player.runAugmentIds = selectedIds.slice();
    play.player.consumedRunAugmentIds = [];
    play.player.recomputeRunAugmentModifiers?.();
    play.openTacticalDraft({ sectorCleared: 15 });
  }, exhaustedSelectedIds);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  const exhaustedState = await readState(page);
  assertDraftLayout(exhaustedState, 760, 640, 'exhausted-one-offer', 1);
  assert(exhaustedState.tacticalDraft.bansRemaining === 1,
    `sector-15 milestone did not replenish one Draft ban: ${JSON.stringify(exhaustedState.tacticalDraft.banAward)}`);
  assert(exhaustedState.tacticalDraft.banAward?.newlyEarned === 1,
    `Draft ban milestone was not recorded: ${JSON.stringify(exhaustedState.tacticalDraft.banAward)}`);
  const exhaustedScreenshot = path.join(outputDir, 'tactical-draft-exhausted-one-offer.png');
  await page.screenshot({ path: exhaustedScreenshot });
  await page.keyboard.press('q');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });
  const passedState = await readState(page);
  assert(passedState.tacticalDraft.history.length === 3,
    'passing a Draft polluted the installed-upgrade history');
  assert(passedState.tacticalDraft.passes.length === 1 && passedState.tacticalDraft.passes[0].passed,
    `passing a Draft was not recorded separately: ${JSON.stringify(passedState.tacticalDraft.passes)}`);
  assert(JSON.stringify(passedState.tacticalDraft.selectedIds) === JSON.stringify(exhaustedSelectedIds),
    'passing a Draft installed or removed an augment');
  const summaryAfterPass = await page.evaluate(() => window.__game.buildRunSummary());
  assert(summaryAfterPass.tacticalDraftPicks.length === 3,
    'passing a Draft polluted the run-summary upgrade picks');

  const localeResults = [];
  await page.evaluate(() => {
    const player = window.__game.scenes.play.player;
    player.runAugmentIds = ['damage_up'];
    player.consumedRunAugmentIds = [];
    player.recomputeRunAugmentModifiers?.();
  });
  for (const locale of ['de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
    await page.evaluate((code) => window.__novaI18n.setLanguagePreference(code), locale);
    await page.waitForTimeout(80);
    await page.evaluate((sector) => window.__game.scenes.play.openTacticalDraft({ sectorCleared: sector }), 10 + localeResults.length);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
    const localeState = await readState(page);
    assertDraftLayout(localeState, 760, 640, `locale-${locale}`);
    assert(localeState.tacticalDraft.title && localeState.tacticalDraft.title !== 'TACTICAL DRAFT', `locale-${locale}: tactical title remained English`);
    assert(localeState.tacticalDraft.offers.every((offer) => offer.descriptionText !== offer.descriptionSource), `locale-${locale}: tactical description remained English`);
    const localizedEvolutions = localeState.tacticalDraft.offers.filter((offer) => offer.displayNameSource !== offer.name);
    assert(localizedEvolutions.length === 1,
      `locale-${locale}: expected exactly one evolution offer: ${JSON.stringify(localeState.tacticalDraft.offers.map((offer) => ({ id: offer.id, name: offer.name, displayNameSource: offer.displayNameSource })))}`);
    assert(localizedEvolutions.every((offer) => offer.nameText !== offer.displayNameSource), `locale-${locale}: evolution name remained English`);
    assert(localeState.tacticalDraft.offers.every((offer) => !/BUILDS:|REINFORCES:|ONE-SHOT:/.test(offer.doctrinePreviewText || '')), `locale-${locale}: doctrine forecast remained English`);
    await page.keyboard.press('l');
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.heldId);
    const localeHeldState = await readState(page);
    assert(localeHeldState.tacticalDraft.holdLabel !== 'HELD', `locale-${locale}: hold label remained English`);
    await page.keyboard.press('l');
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.heldId === null);
    if (locale === 'de' || locale === 'ru' || locale === 'zh-CN') {
      await page.screenshot({ path: path.join(outputDir, `tactical-draft-${locale.replace('-', '_')}.png`) });
    }
    localeResults.push({ locale, title: localeState.tacticalDraft.title, offers: localeState.tacticalDraft.offers.map((offer) => offer.nameText) });
    await page.evaluate(() => window.__game.scenes.play.clearTacticalDraft('locale_check'));
  }
  await page.evaluate(() => window.__novaI18n.setLanguagePreference('en'));

  const holdPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await holdPage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlay(holdPage);
  await holdPage.evaluate(() => {
    const play = window.__game.scenes.play;
    play.tacticalDraftHeldId = null;
    play.openTacticalDraft({ sectorCleared: 4 });
  });
  await holdPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  let holdState = await readState(holdPage);
  const carriedId = holdState.tacticalDraft.offers[holdState.tacticalDraft.focusIndex].id;
  await holdPage.keyboard.press('l');
  await holdPage.waitForFunction((id) => JSON.parse(window.render_game_to_text()).tacticalDraft?.heldId === id, carriedId);
  const firstChoiceIndex = holdState.tacticalDraft.offers.findIndex((offer) => offer.id !== carriedId);
  await holdPage.evaluate((index) => window.__game.scenes.play.setTacticalDraftFocus(index), firstChoiceIndex);
  await holdPage.keyboard.press('Enter');
  await holdPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });

  await holdPage.evaluate(() => window.__game.scenes.play.openTacticalDraft({ sectorCleared: 5 }));
  await holdPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  holdState = await readState(holdPage);
  assert(holdState.tacticalDraft.heldAtOpenId === carriedId, 'held upgrade did not carry into the re-hold regression Draft');
  const alternateIndex = holdState.tacticalDraft.offers.findIndex((offer) => offer.id !== carriedId && !offer.fixedScoreRoute);
  await holdPage.evaluate((index) => window.__game.scenes.play.setTacticalDraftFocus(index), alternateIndex);
  await holdPage.evaluate(() => window.__game.scenes.play.toggleTacticalDraftHold('rehold-regression'));
  await holdPage.waitForFunction((id) => JSON.parse(window.render_game_to_text()).tacticalDraft?.heldId !== id, carriedId);
  const carriedIndex = holdState.tacticalDraft.offers.findIndex((offer) => offer.id === carriedId);
  await holdPage.evaluate((index) => window.__game.scenes.play.setTacticalDraftFocus(index), carriedIndex);
  await holdPage.evaluate(() => window.__game.scenes.play.toggleTacticalDraftHold('rehold-regression'));
  await holdPage.waitForFunction((id) => {
    const draft = JSON.parse(window.render_game_to_text()).tacticalDraft;
    return draft?.heldId === id && draft?.holdChangedSinceOpen === true;
  }, carriedId);
  const secondChoiceIndex = holdState.tacticalDraft.offers.findIndex((offer) => offer.id !== carriedId && !offer.fixedScoreRoute);
  await holdPage.evaluate((index) => window.__game.scenes.play.setTacticalDraftFocus(index), secondChoiceIndex);
  await holdPage.keyboard.press('Enter');
  await holdPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });

  await holdPage.evaluate(() => window.__game.scenes.play.openTacticalDraft({ sectorCleared: 6 }));
  await holdPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  holdState = await readState(holdPage);
  assert(holdState.tacticalDraft.heldId === carriedId && holdState.tacticalDraft.heldAtOpenId === carriedId,
    `reselected held upgrade was lost after choosing another card: ${JSON.stringify(holdState.tacticalDraft)}`);
  await holdPage.evaluate(() => window.__game.scenes.play.clearTacticalDraft('rehold_regression_complete'));
  await holdPage.close();

  const fusionPage = await browser.newPage({ viewport: { width: 760, height: 640 } });
  fusionPage.on('pageerror', (error) => consoleErrors.push(`fusion pageerror: ${error.message}`));
  fusionPage.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`fusion console: ${message.text()}`);
  });
  await fusionPage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlay(fusionPage);
  const openFusionCase = async (testCase, locale = 'en') => {
    await fusionPage.evaluate(({ seed, sectorCleared, selectedIds, locale }) => {
      const game = window.__game;
      const play = game.scenes.play;
      play.clearTacticalDraft('fusion_case_reset');
      play.tacticalDraftBannedIds = [];
      play.tacticalDraftBansRemaining = 2;
      play.tacticalDraftHeldId = null;
      play.player.runAugmentIds = selectedIds.slice();
      play.player.consumedRunAugmentIds = [];
      play.player.recomputeRunAugmentModifiers?.();
      game.contentDirector.seed = seed;
      window.__novaI18n.setLanguagePreference(locale);
      play.openTacticalDraft({ sectorCleared });
    }, { ...testCase, locale });
    await fusionPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
    return readState(fusionPage);
  };

  let fusionBlueprintState = await openFusionCase(phaseBlueprintCase);
  assertDraftLayout(fusionBlueprintState, 760, 640, 'fusion-blueprint-compact');
  const blueprintOffer = fusionBlueprintState.tacticalDraft.offers.find((offer) => offer.id === 'phase_reactor');
  assert(blueprintOffer?.fusionBlueprint?.status === 'blueprint', `compact card did not expose its Fusion blueprint: ${JSON.stringify(blueprintOffer)}`);
  assert(blueprintOffer.fusionHintText.includes('PHASE WAKE'), `blueprint did not name its missing partner: ${blueprintOffer.fusionHintText}`);
  const fusionBlueprintScreenshot = path.join(outputDir, 'tactical-draft-fusion-blueprint-compact.png');
  await fusionPage.screenshot({ path: fusionBlueprintScreenshot });

  await fusionPage.setViewportSize({ width: 1280, height: 720 });
  await fusionPage.waitForTimeout(180);
  let fusionCompletionState = await openFusionCase(phaseCompletionCase);
  assertDraftLayout(fusionCompletionState, 1280, 720, 'fusion-completion-desktop');
  let completionOffer = fusionCompletionState.tacticalDraft.offers.find((offer) => offer.id === 'phase_reactor');
  assert(completionOffer?.fusionBlueprint?.status === 'completes' && completionOffer.fusionBlueprint.completesOnPick,
    `Draft card did not identify its completed Fusion: ${JSON.stringify(completionOffer)}`);
  assert(completionOffer.fusionLabelText === 'COMPLETES FUSION', `completion label was unclear: ${completionOffer.fusionLabelText}`);
  assert(completionOffer.fusionHintText.includes('PHASE WAKE'), `completion forecast did not name the owned partner: ${completionOffer.fusionHintText}`);
  const fusionCompletionScreenshot = path.join(outputDir, 'tactical-draft-fusion-completion-desktop.png');
  await fusionPage.screenshot({ path: fusionCompletionScreenshot });

  const germanCompletionState = await openFusionCase(phaseCompletionCase, 'de');
  assertDraftLayout(germanCompletionState, 1280, 720, 'fusion-completion-de');
  const germanCompletionOffer = germanCompletionState.tacticalDraft.offers.find((offer) => offer.id === 'phase_reactor');
  assert(germanCompletionOffer?.fusionLabelText !== 'COMPLETES FUSION', 'German completion label remained English');
  assert(!String(germanCompletionOffer?.fusionHintText || '').includes('PARTNER ONLINE'), 'German Fusion partner hint remained English');
  const fusionGermanScreenshot = path.join(outputDir, 'tactical-draft-fusion-completion-de.png');
  await fusionPage.screenshot({ path: fusionGermanScreenshot });

  fusionCompletionState = await openFusionCase(phaseCompletionCase);
  completionOffer = fusionCompletionState.tacticalDraft.offers.find((offer) => offer.id === 'phase_reactor');
  await fusionPage.evaluate((index) => window.__game.scenes.play.setTacticalDraftFocus(index),
    fusionCompletionState.tacticalDraft.offers.findIndex((offer) => offer.id === 'phase_reactor'));
  await fusionPage.keyboard.press('Enter');
  await fusionPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.fusionUnlock?.active === true, null, { timeout: 5000 });
  const fusionActivatedState = await readState(fusionPage);
  assert(fusionActivatedState.tacticalDraft.player?.fusionIds?.includes('rift_reprisal'),
    `choosing the completion card did not activate Rift Reprisal: ${JSON.stringify(fusionActivatedState.tacticalDraft.player)}`);
  await fusionPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 5000 });
  await fusionPage.setViewportSize({ width: 1920, height: 1080 });
  await fusionPage.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearTacticalFusionUnlock?.('active_build_fixture');
    play.openTacticalDraft({ sectorCleared: 3 });
  });
  await fusionPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  const activeFusionDraftState = await readState(fusionPage);
  assertDraftLayout(activeFusionDraftState, 1920, 1080, 'active-fusion-1920x1080');
  assert(/1/.test(activeFusionDraftState.tacticalDraft.buildSummary.fusion || ''),
    `active Fusion was missing from the build summary: ${JSON.stringify(activeFusionDraftState.tacticalDraft.buildSummary)}`);
  assert(activeFusionDraftState.tacticalDraft.buildSummary.visualLanguage === 'active_build_command_deck_v4',
    `active build retained its legacy flat bar: ${JSON.stringify(activeFusionDraftState.tacticalDraft.buildSummary)}`);
  assert(activeFusionDraftState.tacticalDraft.buildSummary.categories.length === 4,
    `desktop Active Build did not expose all category modules: ${JSON.stringify(activeFusionDraftState.tacticalDraft.buildSummary)}`);
  const activeFusionScreenshot = path.join(outputDir, 'tactical-draft-active-fusion-1920x1080.png');
  await fusionPage.screenshot({ path: activeFusionScreenshot });
  await fusionPage.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearTacticalDraft('drone_constellation_crest_check');
    play.showTacticalFusionUnlock({
      id: 'drone_constellation',
      name: 'DRONE CONSTELLATION',
      description: 'Every fourth volley sends converging drone crossfire.',
      color: 0x58e8ff,
      sfx: 'tactical_drone_link'
    });
  });
  await fusionPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.fusionUnlock?.active === true);
  const droneCrestState = await readState(fusionPage);
  assert(droneCrestState.tacticalDraft.fusionUnlock.emblemId === 'drone_constellation_authored_crest',
    `Drone Constellation lost its authored crest: ${JSON.stringify(droneCrestState.tacticalDraft.fusionUnlock)}`);
  assert(droneCrestState.tacticalDraft.fusionUnlock.emblemSpan <= 72,
    `Drone Constellation crest is oversized in the Fusion popup: ${JSON.stringify(droneCrestState.tacticalDraft.fusionUnlock)}`);
  const droneCrestScreenshot = path.join(outputDir, 'tactical-draft-drone-constellation-crest.png');
  await fusionPage.screenshot({ path: droneCrestScreenshot });
  await fusionPage.close();

  const runtimePage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await runtimePage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlay(runtimePage);
  const runtime = await runtimePage.evaluate(() => {
    const game = window.__game;
    const player = game.scenes.play.player;
    const baseline = {
      damage: player.bulletDamage,
      fireDelay: player.shootDelay,
      speed: player.speed,
      bulletSpeed: player.bulletSpeed,
      shots: player.multiShot,
      lives: game.lives
    };
    const previewIdsBefore = player.runAugmentIds.slice();
    const dronesBeforePreview = player.drones.length;
    const damagePreview = player.getRunAugmentStatPreview('damage_up');
    const damagePreviewRepeated = player.getRunAugmentStatPreview('damage_up');
    const killWarrantPreview = player.getRunAugmentStatPreview('target_paint');
    const killWarrantPreviewRepeated = player.getRunAugmentStatPreview('target_paint');
    const mobilityPreview = player.getRunAugmentStatPreview('blink_drive');
    const dynamicPreview = player.getRunAugmentStatPreview('phase_reactor');
    const dronePreview = player.getRunAugmentStatPreview('drones');
    const selectedBeforeCapOfferCheck = player.runAugmentIds.slice();
    const consumedBeforeCapOfferCheck = player.consumedRunAugmentIds.slice();
    player.runAugmentIds = [
      'damage_up', 'damage_up', 'damage_up',
      'rapid_fire', 'rapid_fire', 'rapid_fire',
      'target_paint', 'target_paint', 'target_paint',
      'rail_surge', 'rail_surge', 'rail_surge',
      'double_shot', 'double_shot', 'double_shot'
    ];
    player.consumedRunAugmentIds = [];
    player.recalculateStats({ preview: true });
    const damageCapPreview = player.getRunAugmentStatPreview('damage_up');
    const plasmaAtDamageCapPreview = player.getRunAugmentStatPreview('plasma_lance');
    const ineffectiveCapOfferIds = game.scenes.play.getIneffectiveTacticalDraftOfferIds();
    const damageCapFormat = game.scenes.play.formatTacticalDraftStatPreview(damageCapPreview);
    const plasmaAtDamageCapFormat = game.scenes.play.formatTacticalDraftStatPreview(plasmaAtDamageCapPreview);
    const mixedDamageCapFormat = game.scenes.play.formatTacticalDraftStatPreview({
      kind: 'stat',
      metric: 'directDps',
      before: 55.33,
      after: 55.33,
      metrics: [
        { metric: 'directDps', before: 55.33, after: 55.33 },
        { metric: 'bulletSpeed', before: 13, after: 14.04 }
      ]
    });
    player.runAugmentIds = selectedBeforeCapOfferCheck;
    player.consumedRunAugmentIds = consumedBeforeCapOfferCheck;
    player.recalculateStats({ preview: true });
    const rankBoostTypeBeforeCapPreview = player.rankBoost?.type || null;
    if (player.rankBoost) player.rankBoost.type = 'fire_rate';
    player.recalculateStats({ preview: true });
    const cappedFireRatePreview = player.getRunAugmentStatPreview('rapid_fire');
    if (player.rankBoost) player.rankBoost.type = rankBoostTypeBeforeCapPreview;
    player.recalculateStats({ preview: true });
    const selectedBeforeFusionPreview = player.runAugmentIds.slice();
    const consumedBeforeFusionPreview = player.consumedRunAugmentIds.slice();
    player.runAugmentIds = ['drone_link'];
    player.consumedRunAugmentIds = [];
    player.recalculateStats({ preview: true });
    const fusionIdsBeforePreview = player.getRunAugmentDebugState().fusionIds.slice();
    const fusionPreview = player.getRunAugmentStatPreview('drones');
    const fusionIdsAfterPreview = player.getRunAugmentDebugState().fusionIds.slice();
    player.runAugmentIds = selectedBeforeFusionPreview;
    player.consumedRunAugmentIds = consumedBeforeFusionPreview;
    player.recalculateStats({ preview: true });
    const previewStateUnchanged = player.runAugmentIds.join(',') === previewIdsBefore.join(',')
      && player.drones.length === dronesBeforePreview
      && Math.abs(player.bulletDamage - baseline.damage) < 0.0001
      && Math.abs(player.shootDelay - baseline.fireDelay) < 0.0001;
    player.grantInvulnerability(5000, 'dodge_overlap_check');
    player.startDodge();
    player.dodgeDuration = 0;
    player.update(400);
    const dodgeOverlap = {
      invulnerable: player.invulnerable,
      remainingMs: player.invulnerableTime
    };
    player.applyRunAugment('damage_up');
    const damageAfterApply = player.bulletDamage;
    ['rapid_fire', 'speed_up', 'rail_surge', 'double_shot', 'pierce', 'blink_drive', 'magnet', 'drones', 'chain_lightning']
      .forEach((id) => player.applyRunAugment(id));
    const boosted = {
      damage: player.bulletDamage,
      fireDelay: player.shootDelay,
      speed: player.speed,
      bulletSpeed: player.bulletSpeed,
      shots: player.multiShot,
      pierce: player.bulletPierce,
      magnet: player.magnetActive,
      drones: player.dronesActive,
      chain: player.chainLightningActive,
      dodgeDelay: player.dodgeDelay
    };
    ['shield', 'ghost', 'point_defense', 'bomb', 'orbital_strike'].forEach((id) => player.applyRunAugment(id));
    const sectorStart = player.applyRunAugmentSectorStartEffects(2);
    game.lives = Math.max(1, game.lives - 1);
    const beforeRepair = game.lives;
    const nanoPatch = player.applyRunAugment('nano_patch');
    const nanoPatchAgain = player.applyRunAugment('nano_patch');
    const directOutputRatio = ((boosted.damage * boosted.shots) / boosted.fireDelay) /
      ((baseline.damage * baseline.shots) / baseline.fireDelay);
    const sectorBeforeOrdinaryPickup = {
      pointDefense: player.pointDefenseActive,
      bombShots: player.bombShotsLeft,
      orbitalCharges: player.orbitalStrikeCharges
    };
    player.applyPowerup('damage_up');
    const overlap = {
      activeType: player.activePowerup.type,
      suppressedId: player.getRunAugmentDebugState().overlapSuppressedId,
      pointDefense: player.pointDefenseActive,
      bombShots: player.bombShotsLeft,
      orbitalCharges: player.orbitalStrikeCharges
    };
    player.resetPowerups();
    const restored = {
      suppressedId: player.getRunAugmentDebugState().overlapSuppressedId,
      pointDefense: player.pointDefenseActive,
      bombShots: player.bombShotsLeft,
      orbitalCharges: player.orbitalStrikeCharges
    };
    const timedStates = player.getActivePowerupStates().map((entry) => ({
      type: entry.type,
      remainingMs: entry.remainingMs
    }));
    return {
      baseline,
      preview: {
        damagePreview,
        damagePreviewRepeated,
        killWarrantPreview,
        killWarrantPreviewRepeated,
        mobilityPreview,
        cappedFireRatePreview,
        fusionPreview,
        fusionIdsBeforePreview,
        fusionIdsAfterPreview,
        dynamicPreview,
        dronePreview,
        damageCapPreview,
        plasmaAtDamageCapPreview,
        ineffectiveCapOfferIds,
        damageCapFormat,
        plasmaAtDamageCapFormat,
        mixedDamageCapFormat,
        previewStateUnchanged,
        damageAfterApply
      },
      boosted,
      sectorStart,
      sectorEffects: {
        shield: player.shieldActive,
        invulnerable: player.invulnerable,
        pointDefense: player.pointDefenseActive,
        bombShots: player.bombShotsLeft,
        orbitalCharges: player.orbitalStrikeCharges
      },
      repair: { before: beforeRepair, after: game.lives, nanoPatch, nanoPatchAgain },
      directOutputRatio,
      threatResponse: game.threatResponse,
      sectorBeforeOrdinaryPickup,
      overlap,
      restored,
      timedStates,
      dodgeOverlap,
      debug: player.getRunAugmentDebugState()
    };
  });
  assert(runtime.directOutputRatio > 1.1, `combined offensive Draft did not raise direct output enough: ${runtime.directOutputRatio}`);
  assert(runtime.boosted.fireDelay < runtime.baseline.fireDelay, 'fire-rate augment did not apply');
  assert(runtime.boosted.speed > runtime.baseline.speed, 'speed augment did not apply');
  assert(runtime.boosted.bulletSpeed > runtime.baseline.bulletSpeed, 'projectile-speed augment did not apply');
  assert(runtime.boosted.shots > runtime.baseline.shots && runtime.boosted.pierce, 'multishot/pierce augments did not apply');
  assert(runtime.boosted.magnet && runtime.boosted.drones && runtime.boosted.chain, 'utility augments did not persist');
  assert(runtime.directOutputRatio <= SHIP_THREAT_RESPONSE_TARGETS.maxDirectDraftOutputMult + 0.002, `Draft direct output exceeded cap: ${runtime.directOutputRatio}`);
  assert(runtime.threatResponse.tacticalPickCount >= 10, 'threat response did not track Draft pick count');
  assert(runtime.sectorEffects.shield && runtime.sectorEffects.invulnerable && runtime.sectorEffects.pointDefense, 'defensive sector-start effects missing');
  assert(runtime.sectorEffects.bombShots >= 2 && runtime.sectorEffects.orbitalCharges >= 2, 'offensive sector-start payload missing');
  assert(runtime.repair.after === runtime.repair.before + 1, 'nano patch did not repair one life');
  assert(runtime.repair.nanoPatch.consumed === true, 'nano patch was not flagged consumed');
  assert(runtime.preview.previewStateUnchanged, `stat preview mutated live player state: ${JSON.stringify(runtime.preview)}`);
  assert(runtime.preview.damagePreview.kind === 'stat' && Math.abs(runtime.preview.damagePreview.after - runtime.preview.damageAfterApply) < 0.0001,
    `damage preview did not match authoritative apply: ${JSON.stringify(runtime.preview)}`);
  assert(JSON.stringify(runtime.preview.damagePreview) === JSON.stringify(runtime.preview.damagePreviewRepeated),
    `repeated Warhead Authority preview drifted: ${JSON.stringify(runtime.preview)}`);
  assert(runtime.preview.damagePreview.after > runtime.preview.damagePreview.before,
    `Warhead Authority projected reduced or unchanged damage: ${JSON.stringify(runtime.preview.damagePreview)}`);
  assert(runtime.preview.killWarrantPreview.kind === 'stat' && runtime.preview.killWarrantPreview.metric === 'directDps'
    && runtime.preview.killWarrantPreview.after > runtime.preview.killWarrantPreview.before,
  `Kill Warrant did not project a positive combined DPS change: ${JSON.stringify(runtime.preview.killWarrantPreview)}`);
  assert(JSON.stringify(runtime.preview.killWarrantPreview) === JSON.stringify(runtime.preview.killWarrantPreviewRepeated),
    `repeated Kill Warrant preview drifted: ${JSON.stringify(runtime.preview.killWarrantPreviewRepeated)}`);
  assert(runtime.preview.mobilityPreview.metrics?.map((entry) => entry.metric).join(',') === 'movement,dodgeCooldown'
    && runtime.preview.mobilityPreview.metrics[0].after > runtime.preview.mobilityPreview.metrics[0].before
    && runtime.preview.mobilityPreview.metrics[1].after < runtime.preview.mobilityPreview.metrics[1].before,
  `multi-stat mobility preview was incomplete or misleading: ${JSON.stringify(runtime.preview.mobilityPreview)}`);
  assert(runtime.preview.cappedFireRatePreview.kind === 'stat' && runtime.preview.cappedFireRatePreview.capped === true
    && runtime.preview.cappedFireRatePreview.after <= runtime.preview.cappedFireRatePreview.before,
  `capped positive fire-rate preview made the weapon slower: ${JSON.stringify(runtime.preview.cappedFireRatePreview)}`);
  assert(JSON.stringify(runtime.preview.fusionIdsBeforePreview) === JSON.stringify(runtime.preview.fusionIdsAfterPreview)
    && runtime.preview.fusionPreview.kind === 'stat'
    && runtime.preview.fusionPreview.projectedFusionIds?.includes('drone_constellation'),
  `Fusion preview mutated active Fusion state: ${JSON.stringify(runtime.preview)}`);
  assert(runtime.preview.dynamicPreview.kind === 'contextual' && runtime.preview.dronePreview.kind === 'stat',
    `dynamic/direct preview classification drifted: ${JSON.stringify(runtime.preview)}`);
  assert(runtime.preview.damageCapPreview.capped === true
    && runtime.preview.ineffectiveCapOfferIds.includes('damage_up'),
  `damage-only cap was not recognized as an ineffective offer: ${JSON.stringify(runtime.preview)}`);
  assert(runtime.preview.damageCapFormat.kind === 'capped'
    && runtime.preview.damageCapFormat.label === 'DIRECT DAMAGE CAP REACHED'
    && /^\d+(?:\.\d+)? → \d+(?:\.\d+)?$/.test(runtime.preview.damageCapFormat.value)
    && runtime.preview.damageCapFormat.value.split(' → ')[0] === runtime.preview.damageCapFormat.value.split(' → ')[1],
  `damage cap did not produce explicit player-facing copy: ${JSON.stringify(runtime.preview.damageCapFormat)}`);
  assert(runtime.preview.mixedDamageCapFormat.kind === 'stat'
    && /DIRECT DAMAGE CAP REACHED/.test(runtime.preview.mixedDamageCapFormat.label)
    && /BULLET SPEED/.test(runtime.preview.mixedDamageCapFormat.label)
    && runtime.preview.mixedDamageCapFormat.value === '13.00 → 14.04',
  `mixed capped/effective offer did not preserve its useful stat: ${JSON.stringify(runtime.preview.mixedDamageCapFormat)}`);
  assert(runtime.repair.nanoPatchAgain.applied === false && runtime.repair.nanoPatchAgain.reason === 'stack_cap', 'consumed nano patch could be applied twice');
  assert(runtime.debug.consumedIds.includes('nano_patch') && !runtime.debug.activeIds.includes('nano_patch'), 'consumed nano patch remained active');
  assert(runtime.overlap.activeType === 'damage_up' && runtime.overlap.suppressedId === 'damage_up', 'matching ordinary pickup did not take temporary priority');
  assert(runtime.overlap.pointDefense && runtime.overlap.bombShots >= 2 && runtime.overlap.orbitalCharges >= 2, 'ordinary pickup cleared Tactical sector-start tools');
  assert(runtime.restored.suppressedId === null, 'Draft effect did not return after ordinary pickup ended');
  assert(!runtime.timedStates.some((entry) => ['magnet', 'drones', 'chain_lightning'].includes(entry.type) && entry.remainingMs > 86400000),
    `permanent Draft utility leaked into timed HUD: ${JSON.stringify(runtime.timedStates)}`);
  assert(runtime.dodgeOverlap.invulnerable && runtime.dodgeOverlap.remainingMs > 3500, 'dodge end cancelled a longer invulnerability window');
  await runtimePage.close();

  const flowPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await flowPage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlay(flowPage);
  await flowPage.evaluate(() => {
    const play = window.__game.scenes.play;
    play.shouldHoldProgressionPresentation = () => false;
    play.enemyManager.isLevelComplete = () => true;
    play.enemyManager.spawning = false;
    play.enemyManager.bossDefeatedThisLevel = true;
  });
  await flowPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === true, null, { timeout: 10000 });
  const gatedLevel = await flowPage.evaluate(() => window.__game.level);
  const interruptionGuard = await flowPage.evaluate(() => {
    const play = window.__game.scenes.play;
    play.pauseForExternalInterruption('focus_out');
    return { isPaused: play.isPaused, pauseVisible: Boolean(play.pauseOverlay?.visible) };
  });
  assert(interruptionGuard.isPaused === false && interruptionGuard.pauseVisible === false,
    `external focus event paused behind Tactical Draft: ${JSON.stringify(interruptionGuard)}`);
  assert(gatedLevel === 1, `sector advanced before tactical choice: ${gatedLevel}`);
  await flowPage.evaluate(() => window.__game.scenes.play.confirmTacticalDraft(1, 'pointer'));
  await flowPage.waitForFunction(() => window.__game.level === 2, null, { timeout: 5000 });
  const flowState = await readState(flowPage);
  assert(flowState.tacticalDraft.history.length === 1, 'automatic boss-clear draft did not retain its pick');
  assert(flowState.isPaused === false && flowState.pauseOverlay?.visible !== true,
    `Tactical Draft returned to Pause instead of combat: ${JSON.stringify(flowState.pauseOverlay)}`);
  await flowPage.close();

  assert(consoleErrors.length === 0, `browser errors: ${consoleErrors.join(' | ')}`);
  report.ok = true;
  report.desktop = { screenshot: desktopScreenshot, firstDraftScreenshot, lateDraftScreenshot };
  report.compact = { screenshot: compactScreenshot };
  report.interactionHistory = state.tacticalDraft.history;
  report.lockInScreenshot = lockInScreenshot;
  report.runtime = runtime;
  report.locales = localeResults;
  report.fusionBlueprints = {
    pure: { phaseBlueprint, phaseCompletion, phaseBlueprintCase, phaseCompletionCase },
    compactScreenshot: fusionBlueprintScreenshot,
    completionScreenshot: fusionCompletionScreenshot,
    germanCompletionScreenshot: fusionGermanScreenshot,
    activeFusionScreenshot,
    activatedFusionIds: fusionActivatedState.tacticalDraft.player?.fusionIds || []
  };
  report.automaticBossClearGate = { gatedLevel, advancedLevel: flowState.arcadeRun.currentSector, interruptionGuard };
  report.consoleErrors = consoleErrors;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[tactical-draft] PASS report=${path.join(outputDir, 'report.json')}`);
  await page.close();
} catch (error) {
  report.error = error.stack || error.message;
  report.consoleErrors = consoleErrors;
  writeFileSync(path.join(outputDir, 'failure-report.json'), JSON.stringify(report, null, 2));
  console.error(`[tactical-draft] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
