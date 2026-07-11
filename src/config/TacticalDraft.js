import { getPowerupMeta } from './PowerupCatalog.js';
import { SHIP_THREAT_RESPONSE_TARGETS } from './ShipThreatResponse.js';

export const TACTICAL_DRAFT_VERSION = 1;
export const TACTICAL_DRAFT_OFFER_COUNT = 3;

function defineAugment(config) {
  return Object.freeze({
    maxStacks: 2,
    category: 'utility',
    modifiers: Object.freeze({}),
    sectorStart: Object.freeze({}),
    ...config,
    modifiers: Object.freeze({ ...(config.modifiers || {}) }),
    sectorStart: Object.freeze({ ...(config.sectorStart || {}) })
  });
}

export const TACTICAL_DRAFT_AUGMENTS = Object.freeze([
  defineAugment({ id: 'damage_up', category: 'offense', draftDescription: 'Damage +12%', modifiers: { damageMult: 1.12 } }),
  defineAugment({ id: 'rapid_fire', category: 'offense', draftDescription: 'Fire rate +9%', modifiers: { fireDelayMult: 0.92 } }),
  defineAugment({ id: 'rail_surge', category: 'offense', draftDescription: 'Damage +5% and bullet speed +14%', modifiers: { damageMult: 1.05, bulletSpeedMult: 1.14 } }),
  defineAugment({ id: 'double_shot', category: 'offense', draftDescription: 'Extra shot; damage -6%', modifiers: { shotBonus: 1, damageMult: 0.94 } }),
  defineAugment({ id: 'pierce', category: 'offense', draftDescription: 'Piercing shots; damage -3%', modifiers: { pierce: true, damageMult: 0.97 }, maxStacks: 1 }),
  defineAugment({ id: 'target_paint', category: 'offense', draftDescription: 'Damage +7% and fire rate +4%', modifiers: { damageMult: 1.07, fireDelayMult: 0.96 } }),
  defineAugment({ id: 'plasma_lance', category: 'offense', draftDescription: 'Damage +14%, bullet speed +8%, fire rate -4%', modifiers: { damageMult: 1.14, fireDelayMult: 1.04, bulletSpeedMult: 1.08 } }),
  defineAugment({ id: 'chain_lightning', category: 'offense', draftDescription: 'Chain reach +1', modifiers: { chainMax: 1 } }),
  defineAugment({ id: 'speed_up', category: 'mobility', draftDescription: 'Movement speed +10%', modifiers: { speedMult: 1.1 } }),
  defineAugment({ id: 'blink_drive', category: 'mobility', draftDescription: 'Movement speed +4% and dodge cooldown -16%', modifiers: { speedMult: 1.04, dodgeDelayMult: 0.84 } }),
  defineAugment({ id: 'vector_boost', category: 'mobility', draftDescription: 'Movement speed +8% and dodge duration +10%', modifiers: { speedMult: 1.08, dodgeDurationMult: 1.1 } }),
  defineAugment({ id: 'shield', category: 'defense', draftDescription: 'Start each sector with a shield', sectorStart: { shield: true }, maxStacks: 1 }),
  defineAugment({ id: 'ghost', category: 'defense', draftDescription: 'Start each sector with 1 second of invulnerability', sectorStart: { invulnerabilityMs: 1000 } }),
  defineAugment({ id: 'point_defense', category: 'defense', draftDescription: 'Start each sector with 4.5 seconds of point defense', sectorStart: { pointDefenseMs: 4500 } }),
  defineAugment({ id: 'nano_patch', category: 'defense', draftDescription: 'Repair 1 life immediately', immediate: { repairLives: 1 }, maxStacks: 1 }),
  defineAugment({ id: 'magnet', category: 'utility', draftDescription: 'Pickup radius +90', modifiers: { magnetRadiusBonus: 90, magnetStrengthBonus: 0.03 } }),
  defineAugment({ id: 'drones', category: 'utility', draftDescription: 'Add 1 permanent support drone', modifiers: { droneCount: 1 }, maxStacks: 2 }),
  defineAugment({ id: 'bomb', category: 'utility', draftDescription: 'Start each sector with 2 bomb shots', sectorStart: { bombShots: 2 } }),
  defineAugment({ id: 'orbital_strike', category: 'utility', draftDescription: 'Start each sector with 2 orbital charges', sectorStart: { orbitalCharges: 2 } })
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
  if (!augment || !powerup) return null;
  return {
    ...augment,
    name: powerup.name,
    description: augment.draftDescription || powerup.effectDescription,
    color: powerup.color,
    duration: powerup.duration
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
  excludedIds = []
} = {}) {
  const counts = getStackCounts(selectedIds);
  const context = { lives, maxLives, activePowerupType, runTheme };
  let candidates = TACTICAL_DRAFT_AUGMENTS.filter((augment) => {
    if ((counts.get(augment.id) || 0) >= augment.maxStacks) return false;
    if (augment.id === 'nano_patch' && lives >= maxLives) return false;
    return Boolean(getPowerupMeta(augment.id));
  });
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
  return offers.slice(0, TACTICAL_DRAFT_OFFER_COUNT).map((augment) => ({
    ...getTacticalDraftMeta(augment.id),
    currentStacks: counts.get(augment.id) || 0,
    nextStack: (counts.get(augment.id) || 0) + 1
  }));
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

export function summarizeTacticalDraftPicks(selectedIds = []) {
  return selectedIds.map((id) => getTacticalDraftMeta(id)?.name).filter(Boolean);
}
