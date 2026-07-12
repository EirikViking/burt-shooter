import { getPowerupMeta } from './PowerupCatalog.js';
import { SHIP_THREAT_RESPONSE_TARGETS } from './ShipThreatResponse.js';

export const TACTICAL_DRAFT_VERSION = 1;
export const TACTICAL_DRAFT_OFFER_COUNT = 3;

const TACTICAL_AUGMENT_DETAIL_COPY = Object.freeze({
  damage_up: 'The cannon receives twelve percent more confidence and no additional supervision. Excellent for honest damage builds, less useful for pilots who consider aiming a rumor.',
  rapid_fire: 'The firing assembly signs a shorter lunch agreement. More shots mean faster clears, louder desks, and a slightly increased chance that the barrel begins referring to itself as management.',
  rail_surge: 'Projectiles leave faster and arrive with extra paperwork attached to the nose. It is the polite choice for distant targets and the impolite choice for anything standing behind them.',
  double_shot: 'A second lane joins every volley while each round gives up a little damage. Two smaller arguments often solve a formation faster than one magnificent speech.',
  pierce: 'Shots continue through the first hull they meet. Damage takes a tiny haircut because the projectile now has travel plans and refuses to unpack after one enemy.',
  target_paint: 'The targeting computer marks every hostile with a bright suggestion and several legal assumptions. Damage and cadence both improve; subtlety is removed from the approved equipment list.',
  plasma_lance: 'The weapon hits harder and travels faster, but takes a fraction longer to breathe. Choose it when one decisive line matters more than spraying the entire postcode.',
  chain_lightning: 'A successful hit introduces itself to the next target without waiting for permission. Best used on packed formations where personal space has already failed.',
  speed_up: 'Ten percent more movement speed, delivered without brakes, lessons, or a revised insurance premium. Use the extra pace to change lanes early, not to reach the same mistake sooner.',
  blink_drive: 'Movement improves and Phase comes back sooner. The drive is called Blink because "responsible short-range reality disagreement" did not fit on the casing.',
  vector_boost: 'The ship moves faster and remains phased a little longer. It is not a dash; it is simply momentum wearing formal clothes.',
  shield: 'Every new sector begins with one shield. It absorbs a hit, breaks dramatically, and leaves before anyone can ask it to cover overtime.',
  ghost: 'Each sector opens with a brief window in which bullets are suggestions. One second is enough to choose a lane and not enough to write a memoir.',
  point_defense: 'The opening seconds gain an interception ring that deletes nearby hostile shots. It is a doorman with excellent reflexes and absolutely no guest list.',
  nano_patch: 'The patch repairs one life immediately, then consumes itself. It remains in the report because the repair crew demands credit even after becoming vapor.',
  magnet: 'Pickup reach expands and loose rewards begin reconsidering their independence. It does not affect the evasive two-life prize, which has retained counsel.',
  drones: 'One permanent support drone joins the run. It copies your firing rhythm, follows your ship, and submits no timesheets whatsoever.',
  bomb: 'Every sector loads two heavy bomb shots before ordinary fire resumes. The launcher calls this preparedness. The floor calls it structural optimism.',
  orbital_strike: 'Every sector begins with two priority-target orbital charges. The sky handles the aiming; you handle the awkward pause while space decides where "down" is.'
});

function defineAugment(config) {
  return Object.freeze({
    maxStacks: 2,
    category: 'utility',
    consumedOnApply: false,
    modifiers: Object.freeze({}),
    sectorStart: Object.freeze({}),
    ...config,
    modifiers: Object.freeze({ ...(config.modifiers || {}) }),
    sectorStart: Object.freeze({ ...(config.sectorStart || {}) })
  });
}

export const TACTICAL_DRAFT_AUGMENTS = Object.freeze([
  defineAugment({ id: 'damage_up', evolutionName: 'WARHEAD AUTHORITY', category: 'offense', draftDescription: 'Damage +12%', modifiers: { damageMult: 1.12 } }),
  defineAugment({ id: 'rapid_fire', evolutionName: 'REDLINE CYCLER', category: 'offense', draftDescription: 'Fire rate +9%', modifiers: { fireDelayMult: 0.92 } }),
  defineAugment({ id: 'rail_surge', evolutionName: 'HYPER-RAIL', category: 'offense', draftDescription: 'Damage +5% and bullet speed +14%', modifiers: { damageMult: 1.05, bulletSpeedMult: 1.14 } }),
  defineAugment({ id: 'double_shot', evolutionName: 'TWIN VERDICT', category: 'offense', draftDescription: 'Extra shot; damage -6%', modifiers: { shotBonus: 1, damageMult: 0.94 } }),
  defineAugment({ id: 'pierce', category: 'offense', draftDescription: 'Piercing shots; damage -3%', modifiers: { pierce: true, damageMult: 0.97 }, maxStacks: 1 }),
  defineAugment({ id: 'target_paint', evolutionName: 'KILL WARRANT', category: 'offense', draftDescription: 'Damage +7% and fire rate +4%', modifiers: { damageMult: 1.07, fireDelayMult: 0.96 } }),
  defineAugment({ id: 'plasma_lance', evolutionName: 'SUNSPEAR', category: 'offense', draftDescription: 'Damage +14%, bullet speed +8%, fire rate -4%', modifiers: { damageMult: 1.14, fireDelayMult: 1.04, bulletSpeedMult: 1.08 } }),
  defineAugment({ id: 'chain_lightning', evolutionName: 'STORM COURT', category: 'offense', draftDescription: 'Chain reach +1', modifiers: { chainMax: 1 } }),
  defineAugment({ id: 'speed_up', evolutionName: 'COMET DRIVE', category: 'mobility', draftDescription: 'Movement speed +10%', modifiers: { speedMult: 1.1 } }),
  defineAugment({ id: 'blink_drive', evolutionName: 'NULLSTEP DRIVE', category: 'mobility', draftDescription: 'Movement speed +4% and dodge cooldown -16%', modifiers: { speedMult: 1.04, dodgeDelayMult: 0.84 } }),
  defineAugment({ id: 'vector_boost', evolutionName: 'VECTOR CROWN', category: 'mobility', draftDescription: 'Movement speed +8% and dodge duration +10%', modifiers: { speedMult: 1.08, dodgeDurationMult: 1.1 } }),
  defineAugment({ id: 'shield', category: 'defense', draftDescription: 'Start each sector with a shield', sectorStart: { shield: true }, maxStacks: 1 }),
  defineAugment({ id: 'ghost', evolutionName: 'WRAITH SHELL', category: 'defense', draftDescription: 'Start each sector with 1 second of invulnerability', sectorStart: { invulnerabilityMs: 1000 } }),
  defineAugment({ id: 'point_defense', evolutionName: 'AEGIS GRID', category: 'defense', draftDescription: 'Start each sector with 4.5 seconds of point defense', sectorStart: { pointDefenseMs: 4500 } }),
  defineAugment({ id: 'nano_patch', category: 'defense', draftDescription: 'Repair 1 life immediately', immediate: { repairLives: 1 }, consumedOnApply: true, maxStacks: 1 }),
  defineAugment({ id: 'magnet', evolutionName: 'GRAVITY WELL', category: 'utility', draftDescription: 'Pickup radius +90', modifiers: { magnetRadiusBonus: 90, magnetStrengthBonus: 0.03 } }),
  defineAugment({ id: 'drones', evolutionName: 'DRONE WING', category: 'utility', draftDescription: 'Add 1 permanent support drone', modifiers: { droneCount: 1 }, maxStacks: 2 }),
  defineAugment({ id: 'bomb', evolutionName: 'SIEGE RACK', category: 'utility', draftDescription: 'Start each sector with 2 bomb shots', sectorStart: { bombShots: 2 } }),
  defineAugment({ id: 'orbital_strike', evolutionName: 'SKY TRIBUNAL', category: 'utility', draftDescription: 'Start each sector with 2 orbital charges', sectorStart: { orbitalCharges: 2 } }),
  defineAugment({ id: 'phase_reactor', name: 'PHASE REACTOR', category: 'mobility', color: 0xff5bd6, sfx: 'tactical_phase_reactor', draftDescription: 'Phase instantly primes your next volley', detail: 'The reactor converts one tasteful violation of spacetime into a fully stamped firing permit. Phase, then shoot. Physics has filed a complaint and is waiting in the wrong queue.', modifiers: { phaseReload: true }, maxStacks: 1 }),
  defineAugment({ id: 'focus_lens', name: 'FOCUS LENS', category: 'mobility', color: 0xffef7e, sfx: 'tactical_focus_lens', draftDescription: 'Focused shots deal +18% damage', detail: 'Holding Focus routes every loose photon through the expensive glass. The beam gets meaner, the ship gets deliberate, and nearby insurance forms begin filling themselves out.', modifiers: { focusDamageMult: 1.18 }, maxStacks: 1 }),
  defineAugment({ id: 'inertial_dampers', name: 'INERTIAL DAMPERS', category: 'mobility', color: 0x63f4ff, sfx: 'tactical_inertial_dampers', draftDescription: 'Focus movement keeps 22% more speed', detail: 'A padded cup holder for momentum. Tight weaving stays precise without making the ship feel like it is towing a municipal moon. The manual insists this was always intentional.', modifiers: { focusSpeedMult: 1.22 }, maxStacks: 1 }),
  defineAugment({ id: 'phase_wake', name: 'PHASE WAKE', category: 'mobility', color: 0x8d7dff, sfx: 'tactical_phase_wake', draftDescription: 'Phase clears hostile bullets within 58px', detail: 'Your phase exit leaves a tiny hole in causality and a much larger hole in nearby enemy paperwork. It clears danger, not score. Heroism still needs witnesses.', modifiers: { phaseClearRadius: 58 }, maxStacks: 1 }),
  defineAugment({ id: 'slipstream_coils', name: 'SLIPSTREAM COILS', category: 'mobility', color: 0x4dffbf, sfx: 'tactical_slipstream_coils', draftDescription: 'Moving recharges Phase 18% faster', detail: 'The coils steal charge from the trail you were going to leave behind anyway. Standing still remains technically legal and spiritually suspicious.', modifiers: { movingDodgeRecoveryMult: 1.18 }, maxStacks: 1 }),
  defineAugment({ id: 'emergency_bulkhead', name: 'EMERGENCY BULKHEAD', category: 'defense', color: 0x62ffae, sfx: 'tactical_emergency_bulkhead', draftDescription: 'At 1 life, each sector starts with a 6s shield', detail: 'When the life counter reaches one, a bulkhead slams shut around the important bits. Nobody agrees which bits are important, so the shield covers the whole ship for six seconds.', modifiers: { lowLifeSectorShieldMs: 6000 }, maxStacks: 1 }),
  defineAugment({ id: 'impact_foam', name: 'IMPACT FOAM', category: 'defense', color: 0x9effe5, sfx: 'tactical_impact_foam', draftDescription: 'Post-hit safety lasts 0.3s longer', detail: 'The hull fills every fresh crater with fluorescent safety foam and one strongly worded memo. You get three extra tenths to leave before the memo catches fire.', modifiers: { hitInvulnerabilityBonusMs: 300 }, maxStacks: 1 }),
  defineAugment({ id: 'graze_plating', name: 'GRAZE PLATING', category: 'defense', color: 0xffd85c, sfx: 'tactical_graze_plating', draftDescription: '6 near misses grant one shield per sector', detail: 'The plating collects microscopic flakes of bad decisions. Six clean grazes weld them into one real shield, once per sector. Please stop asking what happens at five and a half.', modifiers: { grazeShieldThreshold: 6 }, maxStacks: 1 }),
  defineAugment({ id: 'last_light', name: 'LAST LIGHT', category: 'defense', color: 0xff788f, sfx: 'tactical_last_light', draftDescription: 'At 1 life, Phase recharges 15% faster', detail: 'The final warning lamp is wired directly into the phase drive. At one life it stops blinking, starts screaming, and somehow improves the recharge schedule.', modifiers: { lowLifeDodgeRecoveryMult: 1.15 }, maxStacks: 1 }),
  defineAugment({ id: 'combo_anchor', name: 'COMBO ANCHOR', category: 'utility', color: 0xffa84d, sfx: 'tactical_combo_anchor', draftDescription: 'Combo chains get +0.65s breathing room', detail: 'A small anchor is dropped into the scoring clock. It cannot stop time, but it can make time fill out docking forms for six hundred and fifty milliseconds.', modifiers: { comboWindowBonusMs: 650 }, maxStacks: 1 }),
  defineAugment({ id: 'salvage_clock', name: 'SALVAGE CLOCK', category: 'utility', color: 0x72d8ff, sfx: 'tactical_salvage_clock', draftDescription: 'Dropped pickups linger 22% longer', detail: 'This clock measures time in almost-lost opportunities. Pickups receive an extension and a stern reminder that floating offscreen is not a retirement plan.', modifiers: { pickupLifetimeMult: 1.22 }, maxStacks: 1 }),
  defineAugment({ id: 'power_saver', name: 'POWER SAVER', category: 'utility', color: 0xc2ff52, sfx: 'tactical_power_saver', draftDescription: 'Timed powerups last 18% longer', detail: 'A heroic low-power mode that somehow makes the dangerous parts last longer. Screen brightness is unchanged because morale is not a battery setting.', modifiers: { powerupDurationMult: 1.18 }, maxStacks: 1 }),
  defineAugment({ id: 'drone_link', name: 'DRONE LINK', category: 'utility', color: 0x5ca7ff, sfx: 'tactical_drone_link', draftDescription: 'Tactical drone shots deal +18% damage', detail: 'The support drones finally share targeting data instead of restaurant recommendations. Their shots hit harder. Their restaurant recommendations remain alarmingly specific.', modifiers: { droneDamageMult: 1.18 }, maxStacks: 1 })
]);

const AUGMENT_BY_ID = new Map(TACTICAL_DRAFT_AUGMENTS.map((augment) => [augment.id, augment]));

function hashString(value) {
  const text = String(value || 'nova-swarm-draft');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getStackCounts(selectedIds = []) {
  const counts = new Map();
  for (const id of selectedIds) counts.set(id, (counts.get(id) || 0) + 1);
  return counts;
}

function stableScore(seed, augment, sectorCleared, context = {}) {
  const hash = hashString(`${seed}:${sectorCleared}:${augment.id}`) / 4294967295;
  let score = hash;
  if (context.lives <= 1 && augment.category === 'defense') score += 2.5;
  if (context.lives >= context.maxLives && augment.id === 'nano_patch') score -= 10;
  if (context.activePowerupType === augment.id) score -= 0.35;
  const theme = String(context.runTheme || '');
  if (/hunter|crossfire|jury|turnpike|switchboard/.test(theme) && augment.category === 'mobility') score += 0.4;
  if (/swarm|minefield|mandala|trellis|hazard/.test(theme) && augment.category === 'defense') score += 0.35;
  if (/glitch|auction|overrun|receipt/.test(theme) && augment.category === 'offense') score += 0.25;
  return score;
}

function pickBest(candidates, category, used, seed, sectorCleared, context) {
  const match = candidates
    .filter((augment) => augment.category === category && !used.has(augment.id))
    .sort((a, b) => stableScore(seed, b, sectorCleared, context) - stableScore(seed, a, sectorCleared, context))[0];
  if (match) used.add(match.id);
  return match || null;
}

export function getTacticalDraftAugment(id) {
  return AUGMENT_BY_ID.get(id) || null;
}

export function getTacticalDraftMeta(id) {
  const augment = getTacticalDraftAugment(id);
  const powerup = getPowerupMeta(id);
  if (!augment) return null;
  return {
    ...augment,
    name: augment.name || powerup?.name || String(id).replace(/_/g, ' ').toUpperCase(),
    description: augment.draftDescription || powerup?.effectDescription || '',
    detail: augment.detail || TACTICAL_AUGMENT_DETAIL_COPY[id] || powerup?.tip || augment.draftDescription || '',
    color: augment.color || powerup?.color || 0x37f5ff,
    duration: powerup?.duration || 'permanent this run',
    sfx: augment.sfx || powerup?.sfx || 'powerup'
  };
}

export function getTacticalDraftDisplayMeta(id, stacks = 1) {
  const meta = getTacticalDraftMeta(id);
  if (!meta) return null;
  const evolved = Number(stacks) >= 2 && Boolean(meta.evolutionName);
  return {
    ...meta,
    evolved,
    displayName: evolved ? meta.evolutionName : meta.name
  };
}

export function buildTacticalDraftOffers({
  seed = 'nova-swarm-draft',
  sectorCleared = 1,
  selectedIds = [],
  lives = 3,
  maxLives = 3,
  activePowerupType = null,
  runTheme = null,
  excludedIds = [],
  heldId = null
} = {}) {
  const counts = getStackCounts(selectedIds);
  const context = { lives, maxLives, activePowerupType, runTheme };
  const eligibleCandidates = TACTICAL_DRAFT_AUGMENTS.filter((augment) => {
    if ((counts.get(augment.id) || 0) >= augment.maxStacks) return false;
    if (augment.id === 'nano_patch' && lives >= maxLives) return false;
    return Boolean(getTacticalDraftMeta(augment.id));
  });
  let candidates = eligibleCandidates;
  const unseenCandidates = candidates.filter((augment) => (counts.get(augment.id) || 0) === 0);
  const excluded = new Set(Array.isArray(excludedIds) ? excludedIds : []);
  const allowEvolution = sectorCleared >= 3 && counts.size > 0;
  const evolutionCandidate = allowEvolution
    ? candidates
      .filter((augment) => (counts.get(augment.id) || 0) > 0 && !excluded.has(augment.id))
      .sort((a, b) => stableScore(seed, b, sectorCleared, context) - stableScore(seed, a, sectorCleared, context))[0] || null
    : null;
  if (unseenCandidates.length >= TACTICAL_DRAFT_OFFER_COUNT) candidates = unseenCandidates;
  const freshCandidates = candidates.filter((augment) => !excluded.has(augment.id));
  if (freshCandidates.length >= TACTICAL_DRAFT_OFFER_COUNT) candidates = freshCandidates;
  const used = new Set();
  const offers = [];
  const categoryOrder = lives <= 1
    ? ['defense', 'offense', 'mobility']
    : ['offense', 'mobility', sectorCleared % 2 === 0 ? 'defense' : 'utility'];
  for (const category of categoryOrder) {
    const picked = pickBest(candidates, category, used, seed, sectorCleared, context);
    if (picked) offers.push(picked);
  }
  const remaining = candidates
    .filter((augment) => !used.has(augment.id))
    .sort((a, b) => stableScore(seed, b, sectorCleared, context) - stableScore(seed, a, sectorCleared, context));
  for (const augment of remaining) {
    if (offers.length >= TACTICAL_DRAFT_OFFER_COUNT) break;
    offers.push(augment);
  }
  if (evolutionCandidate && offers.length >= TACTICAL_DRAFT_OFFER_COUNT) {
    const alternatives = [
      ...offers,
      ...candidates.slice().sort((a, b) => stableScore(seed, b, sectorCleared, context) - stableScore(seed, a, sectorCleared, context))
    ].filter((augment, index, all) => (
      augment.id !== evolutionCandidate.id
      && all.findIndex((candidate) => candidate.id === augment.id) === index
    ));
    if (alternatives.length >= 2) offers.splice(0, offers.length, alternatives[0], evolutionCandidate, alternatives[1]);
  }
  const heldCandidate = eligibleCandidates.find((augment) => augment.id === heldId) || null;
  if (heldCandidate && !offers.some((augment) => augment.id === heldCandidate.id)) {
    const replacementIndex = offers.findIndex((augment) => augment.id !== evolutionCandidate?.id);
    offers.splice(replacementIndex >= 0 ? replacementIndex : offers.length - 1, 1, heldCandidate);
  }
  return offers.slice(0, TACTICAL_DRAFT_OFFER_COUNT).map((augment) => {
    const currentStacks = counts.get(augment.id) || 0;
    const nextStack = currentStacks + 1;
    return {
      ...getTacticalDraftDisplayMeta(augment.id, nextStack),
      currentStacks,
      nextStack,
      held: augment.id === heldId
    };
  });
}

export function buildTacticalDraftModifiers(selectedIds = [], { activePowerupType = null } = {}) {
  const result = {
    damageMult: 1,
    fireDelayMult: 1,
    speedMult: 1,
    bulletSpeedMult: 1,
    dodgeDelayMult: 1,
    dodgeDurationMult: 1,
    shotBonus: 0,
    pierce: false,
    magnetRadiusBonus: 0,
    magnetStrengthBonus: 0,
    droneCount: 0,
    chainMax: 0,
    focusDamageMult: 1,
    focusSpeedMult: 1,
    phaseReload: false,
    phaseClearRadius: 0,
    movingDodgeRecoveryMult: 1,
    lowLifeSectorShieldMs: 0,
    hitInvulnerabilityBonusMs: 0,
    grazeShieldThreshold: 0,
    lowLifeDodgeRecoveryMult: 1,
    comboWindowBonusMs: 0,
    pickupLifetimeMult: 1,
    powerupDurationMult: 1,
    droneDamageMult: 1,
    sectorStart: {
      shield: false,
      invulnerabilityMs: 0,
      pointDefenseMs: 0,
      bombShots: 0,
      orbitalCharges: 0
    }
  };
  const stackCounts = new Map();
  for (const id of selectedIds) {
    const augment = getTacticalDraftAugment(id);
    if (!augment) continue;
    const stackIndex = stackCounts.get(id) || 0;
    stackCounts.set(id, stackIndex + 1);
    const effectiveness = stackIndex === 0 ? 1 : SHIP_THREAT_RESPONSE_TARGETS.secondStackEffectiveness;
    const modifiers = augment.modifiers || {};
    const suppressMatchingTimedEffect = activePowerupType === id;
    if (!suppressMatchingTimedEffect) {
      result.damageMult *= Math.pow(Number(modifiers.damageMult) || 1, effectiveness);
      result.fireDelayMult *= Math.pow(Number(modifiers.fireDelayMult) || 1, effectiveness);
      result.speedMult *= Math.pow(Number(modifiers.speedMult) || 1, effectiveness);
      result.bulletSpeedMult *= Math.pow(Number(modifiers.bulletSpeedMult) || 1, effectiveness);
      result.dodgeDelayMult *= Math.pow(Number(modifiers.dodgeDelayMult) || 1, effectiveness);
      result.dodgeDurationMult *= Math.pow(Number(modifiers.dodgeDurationMult) || 1, effectiveness);
      result.shotBonus += (Number(modifiers.shotBonus) || 0) * effectiveness;
      result.pierce = result.pierce || modifiers.pierce === true;
      result.magnetRadiusBonus += (Number(modifiers.magnetRadiusBonus) || 0) * effectiveness;
      result.magnetStrengthBonus += (Number(modifiers.magnetStrengthBonus) || 0) * effectiveness;
      result.droneCount += (Number(modifiers.droneCount) || 0) * effectiveness;
      result.chainMax += (Number(modifiers.chainMax) || 0) * effectiveness;
      result.focusDamageMult *= Math.pow(Number(modifiers.focusDamageMult) || 1, effectiveness);
      result.focusSpeedMult *= Math.pow(Number(modifiers.focusSpeedMult) || 1, effectiveness);
      result.phaseReload = result.phaseReload || modifiers.phaseReload === true;
      result.phaseClearRadius = Math.max(result.phaseClearRadius, (Number(modifiers.phaseClearRadius) || 0) * effectiveness);
      result.movingDodgeRecoveryMult *= Math.pow(Number(modifiers.movingDodgeRecoveryMult) || 1, effectiveness);
      result.lowLifeSectorShieldMs = Math.max(result.lowLifeSectorShieldMs, (Number(modifiers.lowLifeSectorShieldMs) || 0) * effectiveness);
      result.hitInvulnerabilityBonusMs += (Number(modifiers.hitInvulnerabilityBonusMs) || 0) * effectiveness;
      result.grazeShieldThreshold = Math.max(result.grazeShieldThreshold, Math.round(Number(modifiers.grazeShieldThreshold) || 0));
      result.lowLifeDodgeRecoveryMult *= Math.pow(Number(modifiers.lowLifeDodgeRecoveryMult) || 1, effectiveness);
      result.comboWindowBonusMs += (Number(modifiers.comboWindowBonusMs) || 0) * effectiveness;
      result.pickupLifetimeMult *= Math.pow(Number(modifiers.pickupLifetimeMult) || 1, effectiveness);
      result.powerupDurationMult *= Math.pow(Number(modifiers.powerupDurationMult) || 1, effectiveness);
      result.droneDamageMult *= Math.pow(Number(modifiers.droneDamageMult) || 1, effectiveness);
    }
    const sectorStart = augment.sectorStart || {};
    result.sectorStart.shield = result.sectorStart.shield || sectorStart.shield === true;
    result.sectorStart.invulnerabilityMs += Number(sectorStart.invulnerabilityMs) || 0;
    result.sectorStart.pointDefenseMs += Number(sectorStart.pointDefenseMs) || 0;
    result.sectorStart.bombShots += Number(sectorStart.bombShots) || 0;
    result.sectorStart.orbitalCharges += Number(sectorStart.orbitalCharges) || 0;
  }
  result.overlapSuppressedId = activePowerupType && selectedIds.includes(activePowerupType)
    ? activePowerupType
    : null;
  return result;
}

export function getActiveTacticalAugmentIds(selectedIds = [], consumedIds = []) {
  const consumed = new Set(Array.isArray(consumedIds) ? consumedIds : []);
  return (Array.isArray(selectedIds) ? selectedIds : []).filter((id) => !consumed.has(id));
}

export function summarizeTacticalDraftPicks(selectedIds = []) {
  return selectedIds.map((id) => getTacticalDraftMeta(id)?.name).filter(Boolean);
}
