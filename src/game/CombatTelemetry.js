export const COMBAT_DAMAGE_SOURCES = Object.freeze({
  primary: Object.freeze({ id: 'primary', label: 'Primary fire' }),
  bomb: Object.freeze({ id: 'bomb', label: 'Bomb blast' }),
  plasma_lance: Object.freeze({ id: 'plasma_lance', label: 'Plasma Lance' }),
  chain_lightning: Object.freeze({ id: 'chain_lightning', label: 'Chain Lightning' }),
  ship_trait: Object.freeze({ id: 'ship_trait', label: 'Ship trait' }),
  tactical_drone: Object.freeze({ id: 'tactical_drone', label: 'Tactical drones' }),
  tactical_fusion: Object.freeze({ id: 'tactical_fusion', label: 'Fusion Protocol' }),
  shockwave: Object.freeze({ id: 'shockwave', label: 'Shockwave' }),
  row_core: Object.freeze({ id: 'row_core', label: 'Row Core' }),
  graze_break: Object.freeze({ id: 'graze_break', label: 'Graze Break' }),
  orbital_strike: Object.freeze({ id: 'orbital_strike', label: 'Orbital Strike' }),
  other: Object.freeze({ id: 'other', label: 'Other damage' })
});

const SOURCE_IDS = new Set(Object.keys(COMBAT_DAMAGE_SOURCES));

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value, fallback = 0) {
  return Math.max(0, finite(value, fallback));
}

function whole(value, fallback = 0) {
  return Math.max(0, Math.floor(finite(value, fallback)));
}

export function normalizeCombatDamageSourceId(value) {
  const id = String(value || '').trim().toLowerCase();
  return SOURCE_IDS.has(id) ? id : 'other';
}

export function getCombatDamageSourceLabel(sourceId) {
  return COMBAT_DAMAGE_SOURCES[normalizeCombatDamageSourceId(sourceId)].label;
}

export function getCombatDamageSourceForBullet(bullet = {}) {
  if (bullet?.isBomb || bullet?.powerupType === 'bomb') return 'bomb';
  if (bullet?.isPlasmaLance || bullet?.powerupType === 'plasma_lance') return 'plasma_lance';
  if (bullet?.tacticalFusionId) return 'tactical_fusion';
  if (bullet?.isTacticalDroneShot) return 'tactical_drone';
  if (
    bullet?.isTraitCriticalShot ||
    bullet?.isTraitPiercingShot ||
    bullet?.isTraitBonusShot ||
    bullet?.isTraitWingShot
  ) return 'ship_trait';
  return 'primary';
}

export function createCombatTelemetryState() {
  return {
    volleysFired: 0,
    projectilesFired: 0,
    projectilesHit: 0,
    totalDamage: 0,
    damageBySource: {},
    damageBySecond: {},
    peakDps: 0
  };
}

export function recordCombatVolley(state, bullets = []) {
  if (!state || !Array.isArray(bullets) || bullets.length === 0) return state;
  const launched = bullets.filter((bullet) => bullet && bullet.active !== false);
  if (!launched.length) return state;
  state.volleysFired = whole(state.volleysFired) + 1;
  state.projectilesFired = whole(state.projectilesFired) + launched.length;
  return state;
}

export function recordCombatProjectileHit(state, bullet = null) {
  if (!state || !bullet || bullet.__novaCombatTelemetryHitRecorded) return false;
  bullet.__novaCombatTelemetryHitRecorded = true;
  state.projectilesHit = whole(state.projectilesHit) + 1;
  return true;
}

export function recordCombatDamage(state, {
  sourceId = 'other',
  amount = 0,
  elapsedSeconds = 0
} = {}) {
  if (!state) return 0;
  const damage = nonNegative(amount);
  if (damage <= 0) return 0;
  const source = normalizeCombatDamageSourceId(sourceId);
  const second = Math.max(0, Math.floor(nonNegative(elapsedSeconds)));
  state.totalDamage = nonNegative(state.totalDamage) + damage;
  state.damageBySource[source] = nonNegative(state.damageBySource[source]) + damage;
  state.damageBySecond[second] = nonNegative(state.damageBySecond[second]) + damage;
  state.peakDps = Math.max(nonNegative(state.peakDps), state.damageBySecond[second]);
  return damage;
}

export function getCombatTelemetrySummary(state = {}, elapsedSeconds = 0) {
  const runtimeSeconds = Math.max(0, nonNegative(elapsedSeconds));
  const projectilesFired = whole(state.projectilesFired);
  const projectilesHit = Math.min(projectilesFired, whole(state.projectilesHit));
  const totalDamage = nonNegative(state.totalDamage);
  const damageBySource = Object.fromEntries(
    Object.entries(state.damageBySource || {})
      .map(([sourceId, damage]) => [normalizeCombatDamageSourceId(sourceId), nonNegative(damage)])
      .filter(([, damage]) => damage > 0)
  );
  const sourceEntries = Object.entries(damageBySource)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const topSourceId = sourceEntries[0]?.[0] || 'primary';
  const topSourceDamage = sourceEntries[0]?.[1] || 0;
  const currentSecond = Math.max(0, Math.floor(runtimeSeconds));
  let recentDamage = 0;
  for (let second = Math.max(0, currentSecond - 4); second <= currentSecond; second += 1) {
    recentDamage += nonNegative(state.damageBySecond?.[second]);
  }
  return {
    volleysFired: whole(state.volleysFired),
    projectilesFired,
    projectilesHit,
    accuracyPercent: projectilesFired > 0 ? Math.min(100, (projectilesHit / projectilesFired) * 100) : 0,
    totalDamage,
    averageDps: runtimeSeconds > 0 ? totalDamage / runtimeSeconds : 0,
    recentDps: recentDamage / Math.min(5, Math.max(1, currentSecond + 1)),
    peakDps: nonNegative(state.peakDps),
    topSourceId,
    topSourceDamage,
    topSourcePercent: totalDamage > 0 ? (topSourceDamage / totalDamage) * 100 : 0,
    damageBySource
  };
}
