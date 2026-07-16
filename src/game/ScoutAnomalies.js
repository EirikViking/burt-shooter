export const SCOUT_ANOMALY_STORAGE_KEY = 'nova.scoutAnomaly.v1';
export const DEFAULT_SCOUT_ANOMALY_ID = 'calibration';

export const SCOUT_ANOMALIES = Object.freeze([
  Object.freeze({
    id: 'calibration',
    name: 'CALIBRATION',
    shortLabel: 'CALIBRATION',
    description: 'Lower-pressure route and hull practice.',
    ruleSummary: 'Scout pressure // Scout bosses',
    profileOverrides: Object.freeze({})
  }),
  Object.freeze({
    id: 'bullet_school',
    name: 'BULLET SCHOOL',
    shortLabel: 'BULLET SCHOOL',
    description: 'Ranked-speed shots and firing pressure with Scout sustain.',
    ruleSummary: 'Ranked bullet pressure // Scout sustain',
    profileOverrides: Object.freeze({
      normalWaveDifficultyLevelOffsetDelta: -1,
      bossDifficultyMult: 0.85,
      bossAttackDangerMult: 0.95,
      pressureMultipliers: Object.freeze({
        fireChanceMult: 1,
        projectileSpeedMult: 1,
        enemySpeedMult: 0.9,
        eliteChanceMult: 0.62,
        specialThreatMult: 0.58,
        sustainMult: 1.18,
        scoreMult: 1,
        contentRarityMult: 0.8
      })
    })
  }),
  Object.freeze({
    id: 'boss_lab',
    name: 'BOSS LAB',
    shortLabel: 'BOSS LAB',
    description: 'Scout waves followed by full-strength Mayhem bosses.',
    ruleSummary: 'Scout waves // Mayhem bosses',
    profileOverrides: Object.freeze({
      bossDifficultyMult: 1,
      bossAttackDangerMult: 1
    })
  })
]);

const ANOMALY_BY_ID = new Map(SCOUT_ANOMALIES.map((entry) => [entry.id, entry]));

export function normalizeScoutAnomalyId(value) {
  const id = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ANOMALY_BY_ID.has(id) ? id : DEFAULT_SCOUT_ANOMALY_ID;
}

export function getScoutAnomaly(value = DEFAULT_SCOUT_ANOMALY_ID) {
  return ANOMALY_BY_ID.get(normalizeScoutAnomalyId(value)) || ANOMALY_BY_ID.get(DEFAULT_SCOUT_ANOMALY_ID);
}

export function cycleScoutAnomaly(value, delta = 1) {
  const currentId = normalizeScoutAnomalyId(value);
  const index = Math.max(0, SCOUT_ANOMALIES.findIndex((entry) => entry.id === currentId));
  const step = Number(delta) < 0 ? -1 : 1;
  return SCOUT_ANOMALIES[(index + step + SCOUT_ANOMALIES.length) % SCOUT_ANOMALIES.length];
}

export function applyScoutAnomalyToProfile(baseProfile = {}, anomalyValue = DEFAULT_SCOUT_ANOMALY_ID) {
  const anomaly = getScoutAnomaly(anomalyValue);
  const overrides = anomaly.profileOverrides || {};
  return Object.freeze({
    ...baseProfile,
    ...overrides,
    id: baseProfile.id,
    difficultyProfileId: `${baseProfile.difficultyProfileId || 'scout'}:${anomaly.id}`,
    pressureMultipliers: Object.freeze({
      ...(baseProfile.pressureMultipliers || {}),
      ...(overrides.pressureMultipliers || {})
    }),
    scoutAnomalyId: anomaly.id,
    scoutAnomalyName: anomaly.name,
    scoutAnomalyRuleSummary: anomaly.ruleSummary
  });
}

export function readScoutAnomalySelection(targetStorage = null) {
  try {
    const storage = targetStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
    return getScoutAnomaly(storage?.getItem?.(SCOUT_ANOMALY_STORAGE_KEY));
  } catch {
    return getScoutAnomaly(DEFAULT_SCOUT_ANOMALY_ID);
  }
}

export function writeScoutAnomalySelection(value, targetStorage = null) {
  const anomaly = getScoutAnomaly(value);
  try {
    const storage = targetStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
    storage?.setItem?.(SCOUT_ANOMALY_STORAGE_KEY, anomaly.id);
  } catch {
    // A missing storage surface should never block an unranked practice launch.
  }
  return anomaly;
}
