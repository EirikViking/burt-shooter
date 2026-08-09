import { getPowerupMeta } from './PowerupCatalog.js';
import { SHIP_THREAT_RESPONSE_TARGETS } from './ShipThreatResponse.js';

export const TACTICAL_DRAFT_VERSION = 2;
export const TACTICAL_DRAFT_OFFER_COUNT = 3;
export const TACTICAL_DRAFT_BAN_COUNT = 2;
export const TACTICAL_DRAFT_BAN_EARN_INTERVAL = 15;
export const TACTICAL_DRAFT_BAN_BANK_MAX = 5;
export const TACTICAL_SCORE_ROUTE_SECTOR = 5;

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
    maxStacks: 3,
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
  defineAugment({ id: 'damage_up', evolutionName: 'WARHEAD AUTHORITY', category: 'offense', previewMetric: 'damage', draftDescription: 'Damage +12%', modifiers: { damageMult: 1.12 } }),
  defineAugment({ id: 'rapid_fire', evolutionName: 'REDLINE CYCLER', category: 'offense', previewMetric: 'fireDelay', draftDescription: 'Fire rate +9%', modifiers: { fireDelayMult: 0.92 } }),
  defineAugment({ id: 'rail_surge', evolutionName: 'HYPER-RAIL', category: 'offense', previewMetric: 'damage', previewMetrics: ['directDps', 'bulletSpeed'], draftDescription: 'Damage +5% and bullet speed +14%', modifiers: { damageMult: 1.05, bulletSpeedMult: 1.14 } }),
  defineAugment({ id: 'double_shot', evolutionName: 'TWIN VERDICT', category: 'offense', previewMetric: 'shots', previewMetrics: ['directDps', 'shots'], draftDescription: 'Extra shot; damage -6%', modifiers: { shotBonus: 1, damageMult: 0.94 } }),
  defineAugment({ id: 'pierce', category: 'offense', previewMetric: 'piercing', previewMetrics: ['piercing', 'directDps'], draftDescription: 'Piercing shots; damage -3%', modifiers: { pierce: true, damageMult: 0.97 }, maxStacks: 1 }),
  defineAugment({ id: 'target_paint', evolutionName: 'KILL WARRANT', category: 'offense', previewMetric: 'damage', previewMetrics: ['directDps'], draftDescription: 'Damage +7% and fire rate +4%', modifiers: { damageMult: 1.07, fireDelayMult: 0.96 } }),
  defineAugment({ id: 'plasma_lance', evolutionName: 'SUNSPEAR', category: 'offense', previewMetric: 'damage', previewMetrics: ['directDps', 'bulletSpeed'], draftDescription: 'Damage +14%, bullet speed +8%, fire rate -4%', modifiers: { damageMult: 1.14, fireDelayMult: 1.04, bulletSpeedMult: 1.08 } }),
  defineAugment({ id: 'chain_lightning', evolutionName: 'STORM COURT', category: 'offense', previewMetric: 'chainReach', draftDescription: 'Chain reach +1', modifiers: { chainMax: 1 } }),
  defineAugment({ id: 'speed_up', evolutionName: 'COMET DRIVE', category: 'mobility', previewMetric: 'movement', draftDescription: 'Movement speed +10%', modifiers: { speedMult: 1.1 } }),
  defineAugment({ id: 'blink_drive', evolutionName: 'NULLSTEP DRIVE', category: 'mobility', previewMetric: 'dodgeCooldown', previewMetrics: ['movement', 'dodgeCooldown'], draftDescription: 'Movement speed +4% and dodge cooldown -16%', modifiers: { speedMult: 1.04, dodgeDelayMult: 0.84 } }),
  defineAugment({ id: 'vector_boost', evolutionName: 'VECTOR CROWN', category: 'mobility', previewMetric: 'movement', previewMetrics: ['movement', 'dodgeDuration'], draftDescription: 'Movement speed +8% and dodge duration +10%', modifiers: { speedMult: 1.08, dodgeDurationMult: 1.1 } }),
  defineAugment({ id: 'shield', category: 'defense', draftDescription: 'Start each sector with a shield', sectorStart: { shield: true }, maxStacks: 1 }),
  defineAugment({ id: 'ghost', evolutionName: 'WRAITH SHELL', category: 'defense', draftDescription: 'Start each sector with 1 second of invulnerability', sectorStart: { invulnerabilityMs: 1000 } }),
  defineAugment({ id: 'point_defense', evolutionName: 'AEGIS GRID', category: 'defense', draftDescription: 'Start each sector with 4.5 seconds of point defense', sectorStart: { pointDefenseMs: 4500 } }),
  defineAugment({ id: 'nano_patch', category: 'defense', draftDescription: 'Repair 1 life immediately', immediate: { repairLives: 1 }, consumedOnApply: true, maxStacks: 1 }),
  defineAugment({ id: 'magnet', evolutionName: 'GRAVITY WELL', category: 'utility', previewMetric: 'pickupRange', draftDescription: 'Pickup radius +90', modifiers: { magnetRadiusBonus: 90, magnetStrengthBonus: 0.03 } }),
  defineAugment({ id: 'drones', evolutionName: 'DRONE WING', category: 'utility', previewMetric: 'supportDrones', draftDescription: 'Add 1 permanent support drone', modifiers: { droneCount: 1 } }),
  defineAugment({ id: 'bomb', evolutionName: 'SIEGE RACK', category: 'utility', draftDescription: 'Start each sector with 2 bomb shots', sectorStart: { bombShots: 2 } }),
  defineAugment({ id: 'orbital_strike', evolutionName: 'SKY TRIBUNAL', category: 'utility', draftDescription: 'Start each sector with 2 orbital charges', sectorStart: { orbitalCharges: 2 } }),
  defineAugment({ id: 'phase_reactor', name: 'PHASE REACTOR', category: 'mobility', color: 0xff5bd6, sfx: 'tactical_phase_reactor', draftDescription: 'Phase instantly primes your next volley', detail: 'The reactor converts one tasteful violation of spacetime into a fully stamped firing permit. Phase, then shoot. Physics has filed a complaint and is waiting in the wrong queue.', modifiers: { phaseReload: true }, maxStacks: 1 }),
  defineAugment({ id: 'focus_lens', name: 'FOCUS LENS', category: 'mobility', color: 0xffef7e, sfx: 'tactical_focus_lens', draftDescription: 'Focused shots deal +18% damage with hull-tuned spread', detail: 'Holding Focus routes every loose photon through the expensive glass. Focus stays armed through Ghost and Phase, while spread tightens according to the hull weapon profile without changing projectile count or fire rate. Broad batteries receive stronger correction than already-precise cannons.', modifiers: { focusDamageMult: 1.18, focusSpreadMult: 0.6 }, maxStacks: 1 }),
  defineAugment({ id: 'inertial_dampers', name: 'INERTIAL DAMPERS', category: 'mobility', color: 0x63f4ff, sfx: 'tactical_inertial_dampers', draftDescription: 'Focus movement keeps 22% more speed', detail: 'A padded cup holder for momentum. Tight weaving stays precise without making the ship feel like it is towing a municipal moon. The manual insists this was always intentional.', modifiers: { focusSpeedMult: 1.22 }, maxStacks: 1 }),
  defineAugment({ id: 'phase_wake', name: 'PHASE WAKE', category: 'mobility', color: 0x8d7dff, sfx: 'tactical_phase_wake', draftDescription: 'Phase exit clears hostile bullets within 58px', detail: 'Your phase exit leaves a tiny hole in causality and a much larger hole in nearby enemy paperwork. It clears danger, not score. Heroism still needs witnesses.', modifiers: { phaseClearRadius: 58 }, maxStacks: 1 }),
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

function defineFusion(config) {
  return Object.freeze({
    category: 'fusion',
    color: 0xff5bd6,
    sfx: 'achievement',
    requiredIds: Object.freeze([]),
    ...config,
    requiredIds: Object.freeze([...(config.requiredIds || [])])
  });
}

export const TACTICAL_FUSION_PROTOCOLS = Object.freeze([
  defineFusion({
    id: 'rift_reprisal',
    name: 'RIFT REPRISAL',
    color: 0xd86bff,
    sfx: 'tactical_phase_reactor',
    requiredIds: ['phase_reactor', 'phase_wake'],
    description: 'Phase-cleared bullets return as up to five rift shards.',
    detail: 'PHASE REACTOR + PHASE WAKE. Phase no longer merely erases nearby fire. The first five cleared shots are recast into fast return-fire shards. The counterattack grants no score by itself; it still has to hit something.'
  }),
  defineFusion({
    id: 'drone_constellation',
    name: 'DRONE CONSTELLATION',
    color: 0x58e8ff,
    sfx: 'tactical_drone_link',
    requiredIds: ['drones', 'drone_link'],
    description: 'Every fourth volley sends converging drone crossfire.',
    detail: 'DRONES + DRONE LINK. Every fourth trigger pull turns the support wing into a brief crossfire formation. The angled drone shots converge above the ship, rewarding pilots who line the formation up before firing.'
  }),
  defineFusion({
    id: 'aegis_reactor',
    name: 'AEGIS REACTOR',
    color: 0x74ffd4,
    sfx: 'tactical_point_defense',
    requiredIds: ['shield', 'point_defense'],
    description: 'Shield break purges nearby bullets and arms 2.4s point defense.',
    detail: 'SHIELD + POINT DEFENSE. A broken shield dumps its remaining charge into the interception grid. Nearby hostile fire is purged immediately and the point-defense ring stays online for a short counterattack window.'
  }),
  defineFusion({
    id: 'sky_verdict',
    name: 'SKY VERDICT',
    color: 0xffb34f,
    sfx: 'tactical_orbital_strike',
    requiredIds: ['bomb', 'orbital_strike'],
    description: 'Bomb impacts call charged verdicts, plus one reduced emergency beam per sector.',
    detail: 'BOMB + ORBITAL STRIKE. Bomb detonations spend orbital charges at the blast marker. With no charges left, one visibly tracked emergency verdict remains each sector: a smaller, reduced-damage beam that can only fire once.'
  })
]);

const AUGMENT_BY_ID = new Map(TACTICAL_DRAFT_AUGMENTS.map((augment) => [augment.id, augment]));
const FUSION_BY_ID = new Map(TACTICAL_FUSION_PROTOCOLS.map((fusion) => [fusion.id, fusion]));

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

export function getTacticalFusionProtocol(id) {
  return FUSION_BY_ID.get(id) || null;
}

export function getActiveTacticalFusionProtocols(selectedIds = []) {
  const selected = new Set(Array.isArray(selectedIds) ? selectedIds : []);
  return TACTICAL_FUSION_PROTOCOLS.filter((fusion) => fusion.requiredIds.every((id) => selected.has(id)));
}

export function getTacticalFusionBlueprints(augmentId, selectedIds = []) {
  const selected = new Set(Array.isArray(selectedIds) ? selectedIds : []);
  return TACTICAL_FUSION_PROTOCOLS
    .filter((fusion) => fusion.requiredIds.includes(augmentId))
    .map((fusion) => {
      const partnerIds = fusion.requiredIds.filter((id) => id !== augmentId);
      const ownedPartnerIds = partnerIds.filter((id) => selected.has(id));
      const missingPartnerIds = partnerIds.filter((id) => !selected.has(id));
      const alreadyActive = fusion.requiredIds.every((id) => selected.has(id));
      const completesOnPick = !alreadyActive
        && !selected.has(augmentId)
        && partnerIds.every((id) => selected.has(id));
      return Object.freeze({
        id: fusion.id,
        name: fusion.name,
        color: fusion.color,
        requiredIds: fusion.requiredIds,
        partnerIds: Object.freeze(partnerIds),
        partnerNames: Object.freeze(partnerIds.map((id) => getTacticalDraftMeta(id)?.name || id)),
        ownedPartnerIds: Object.freeze(ownedPartnerIds),
        missingPartnerIds: Object.freeze(missingPartnerIds),
        alreadyActive,
        completesOnPick,
        status: alreadyActive ? 'active' : completesOnPick ? 'completes' : 'blueprint'
      });
    })
    .filter((blueprint) => !blueprint.alreadyActive)
    .sort((a, b) => Number(b.completesOnPick) - Number(a.completesOnPick));
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
  const overdriven = Number(stacks) >= 3 && Boolean(meta.evolutionName);
  return {
    ...meta,
    evolved,
    overdriven,
    displayName: evolved ? meta.evolutionName : meta.name
  };
}

export function buildTacticalDraftOffers({
  seed = 'nova-swarm-draft',
  sectorCleared = 1,
  selectedIds = [],
  consumedIds = [],
  lives = 3,
  maxLives = 3,
  baseShotCount = 1,
  activePowerupType = null,
  runTheme = null,
  excludedIds = [],
  ineffectiveIds = [],
  bannedIds = [],
  heldId = null,
  recentOfferIds = []
} = {}) {
  const counts = getStackCounts(selectedIds);
  const consumed = new Set(Array.isArray(consumedIds) ? consumedIds : []);
  const activeSelected = new Set((Array.isArray(selectedIds) ? selectedIds : []).filter((id) => !consumed.has(id)));
  const context = { lives, maxLives, baseShotCount, activePowerupType, runTheme };
  const banned = new Set(Array.isArray(bannedIds) ? bannedIds : []);
  const ineffective = new Set(Array.isArray(ineffectiveIds) ? ineffectiveIds : []);
  const fixedScoreRoute = Math.max(1, Math.floor(Number(sectorCleared) || 1)) === TACTICAL_SCORE_ROUTE_SECTOR;
  const eligibleCandidates = TACTICAL_DRAFT_AUGMENTS.filter((augment) => {
    if (augment.id === 'combo_anchor' && !fixedScoreRoute) return false;
    if (augment.id !== 'combo_anchor' && banned.has(augment.id)) return false;
    if (augment.id !== 'combo_anchor' && ineffective.has(augment.id)) return false;
    if ((counts.get(augment.id) || 0) >= augment.maxStacks) return false;
    if (augment.id === 'nano_patch' && lives >= maxLives) return false;
    return Boolean(getTacticalDraftMeta(augment.id));
  });
  let candidates = eligibleCandidates;
  const unseenCandidates = candidates.filter((augment) => (counts.get(augment.id) || 0) === 0);
  const excluded = new Set(Array.isArray(excludedIds) ? excludedIds : []);
  const recent = new Set(Array.isArray(recentOfferIds) ? recentOfferIds : []);
  const eligibleById = new Map(eligibleCandidates.map((augment) => [augment.id, augment]));
  const fusionCompletionCandidate = TACTICAL_FUSION_PROTOCOLS
    .flatMap((fusion) => {
      const missingIds = fusion.requiredIds.filter((id) => !activeSelected.has(id));
      const ownedCount = fusion.requiredIds.length - missingIds.length;
      if (ownedCount !== fusion.requiredIds.length - 1 || missingIds.length !== 1) return [];
      const candidate = eligibleById.get(missingIds[0]);
      if (!candidate || excluded.has(candidate.id)) return [];
      return [candidate];
    })
    .filter((augment, index, all) => all.findIndex((candidate) => candidate.id === augment.id) === index)
    .sort((a, b) => stableScore(seed, b, sectorCleared, context) - stableScore(seed, a, sectorCleared, context))[0] || null;
  const singleLaneCatchupCandidate = Number(baseShotCount) <= 1
    && Math.max(1, Math.floor(Number(sectorCleared) || 1)) >= 3
    && Math.max(1, Math.floor(Number(sectorCleared) || 1)) % 3 === 0
    && (counts.get('double_shot') || 0) === 0
    && !excluded.has('double_shot')
    ? eligibleById.get('double_shot') || null
    : null;
  const allowEvolution = sectorCleared >= 3 && counts.size > 0;
  let evolutionCandidate = allowEvolution
    ? candidates
      .filter((augment) => (counts.get(augment.id) || 0) > 0 && !excluded.has(augment.id))
      .sort((a, b) => stableScore(seed, b, sectorCleared, context) - stableScore(seed, a, sectorCleared, context))[0] || null
    : null;
  if (
    evolutionCandidate
    && (counts.get(evolutionCandidate.id) || 0) >= 2
    && unseenCandidates.length >= TACTICAL_DRAFT_OFFER_COUNT
  ) {
    evolutionCandidate = null;
  }
  if (unseenCandidates.length >= TACTICAL_DRAFT_OFFER_COUNT) candidates = unseenCandidates;
  const nonRecentCandidates = candidates.filter((augment) => !recent.has(augment.id));
  if (nonRecentCandidates.length >= TACTICAL_DRAFT_OFFER_COUNT) candidates = nonRecentCandidates;
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
  const ensurePriorityOffer = (candidate, protectedIds = new Set()) => {
    if (!candidate || offers.some((augment) => augment.id === candidate.id)) return;
    const thirdStackIndex = offers.findIndex((augment) => (
      !protectedIds.has(augment.id)
      && (counts.get(augment.id) || 0) >= 2
    ));
    const fallbackIndex = offers
      .map((augment, index) => ({ augment, index }))
      .reverse()
      .find(({ augment }) => !protectedIds.has(augment.id))?.index;
    const replacementIndex = thirdStackIndex >= 0
      ? thirdStackIndex
      : Number.isInteger(fallbackIndex)
        ? fallbackIndex
        : offers.length;
    if (replacementIndex < offers.length) offers.splice(replacementIndex, 1, candidate);
    else if (offers.length < TACTICAL_DRAFT_OFFER_COUNT) offers.push(candidate);
  };
  unseenCandidates
    .filter((candidate) => !excluded.has(candidate.id))
    .sort((a, b) => stableScore(seed, b, sectorCleared, context) - stableScore(seed, a, sectorCleared, context))
    .forEach((candidate) => {
      const protectedIds = new Set(
        offers
          .filter((augment) => (counts.get(augment.id) || 0) < 2)
          .map((augment) => augment.id)
      );
      ensurePriorityOffer(candidate, protectedIds);
    });
  ensurePriorityOffer(fusionCompletionCandidate);
  ensurePriorityOffer(singleLaneCatchupCandidate, new Set([fusionCompletionCandidate?.id].filter(Boolean)));
  const heldCandidate = eligibleCandidates.find((augment) => augment.id === heldId) || null;
  if (heldCandidate && !offers.some((augment) => augment.id === heldCandidate.id)) {
    const protectedIds = new Set([fusionCompletionCandidate?.id, singleLaneCatchupCandidate?.id].filter(Boolean));
    const replacementIndex = offers.findIndex((augment) => !protectedIds.has(augment.id));
    offers.splice(replacementIndex >= 0 ? replacementIndex : offers.length - 1, 1, heldCandidate);
  }
  const scoreRouteCandidate = fixedScoreRoute
    ? eligibleCandidates.find((augment) => augment.id === 'combo_anchor') || null
    : null;
  if (scoreRouteCandidate) {
    const scoreRouteIndex = offers.findIndex((augment) => augment.id === scoreRouteCandidate.id);
    if (scoreRouteIndex >= 0) offers.splice(scoreRouteIndex, 1);
    const protectedIds = new Set([
      heldCandidate?.id,
      fusionCompletionCandidate?.id,
      singleLaneCatchupCandidate?.id
    ].filter(Boolean));
    const replacementIndex = offers.findIndex((augment) => !protectedIds.has(augment.id));
    if (offers.length >= TACTICAL_DRAFT_OFFER_COUNT) offers.splice(replacementIndex >= 0 ? replacementIndex : offers.length - 1, 1);
    offers.splice(Math.min(1, offers.length), 0, scoreRouteCandidate);
  }
  return offers.slice(0, TACTICAL_DRAFT_OFFER_COUNT).map((augment) => {
    const currentStacks = counts.get(augment.id) || 0;
    const nextStack = currentStacks + 1;
    return {
      ...getTacticalDraftDisplayMeta(augment.id, nextStack),
      currentStacks,
      nextStack,
      held: augment.id === heldId,
      fixedScoreRoute: fixedScoreRoute && augment.id === 'combo_anchor',
      fusionCompletionPriority: augment.id === fusionCompletionCandidate?.id,
      singleLaneCatchup: augment.id === singleLaneCatchupCandidate?.id
    };
  });
}

export function buildTacticalDraftModifiers(selectedIds = [], { activePowerupType = null, activePowerupTypes = [] } = {}) {
  const timedPowerupTypes = new Set([
    activePowerupType,
    ...(Array.isArray(activePowerupTypes) ? activePowerupTypes : [])
  ].filter(Boolean));
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
    focusSpreadMult: 1,
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
    fusionIds: [],
    riftReprisal: false,
    droneConstellation: false,
    aegisReactor: false,
    skyVerdict: false,
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
    const effectiveness = stackIndex === 0
      ? 1
      : stackIndex === 1
        ? SHIP_THREAT_RESPONSE_TARGETS.secondStackEffectiveness
        : SHIP_THREAT_RESPONSE_TARGETS.thirdStackEffectiveness;
    const modifiers = augment.modifiers || {};
    const suppressMatchingTimedEffect = timedPowerupTypes.has(id) && id !== 'double_shot';
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
      result.focusSpreadMult *= Math.pow(Number(modifiers.focusSpreadMult) || 1, effectiveness);
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
  result.overlapSuppressedIds = [...timedPowerupTypes].filter((id) => id !== 'double_shot' && selectedIds.includes(id));
  result.overlapSuppressedId = result.overlapSuppressedIds[0] || null;
  result.fusionIds = getActiveTacticalFusionProtocols(selectedIds).map((fusion) => fusion.id);
  result.riftReprisal = result.fusionIds.includes('rift_reprisal');
  result.droneConstellation = result.fusionIds.includes('drone_constellation');
  result.aegisReactor = result.fusionIds.includes('aegis_reactor');
  result.skyVerdict = result.fusionIds.includes('sky_verdict');
  return result;
}

export function getActiveTacticalAugmentIds(selectedIds = [], consumedIds = []) {
  const consumed = new Set(Array.isArray(consumedIds) ? consumedIds : []);
  return (Array.isArray(selectedIds) ? selectedIds : []).filter((id) => !consumed.has(id));
}

export function summarizeTacticalDraftPicks(selectedIds = []) {
  return selectedIds.map((id) => getTacticalDraftMeta(id)?.name).filter(Boolean);
}
