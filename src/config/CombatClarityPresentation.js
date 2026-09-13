export const COMBAT_CLARITY_PRESENTATION = Object.freeze({
  projectileOnset: 38,
  projectileRelease: 26,
  projectileFull: 120,
  warningEquivalentProjectiles: 64,
  warningMinimumPressure: 0.48,
  maxBackdropSuppression: 0.18,
  attackMs: 400,
  releaseMs: 850,
  reducedMotionAttackMs: 900,
  reducedMotionReleaseMs: 1200
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function resolveCombatClarityPressure({
  activeHostileProjectiles = 0,
  attackWarningActive = false,
  latched = false,
  experimentalMode = false
} = {}) {
  if (experimentalMode) return { latched: false, pressure: 0 };

  const hostileProjectiles = Math.max(0, Math.floor(Number(activeHostileProjectiles) || 0));
  const effectiveProjectiles = Math.max(
    hostileProjectiles,
    attackWarningActive ? COMBAT_CLARITY_PRESENTATION.warningEquivalentProjectiles : 0
  );
  const nextLatched = latched
    ? effectiveProjectiles >= COMBAT_CLARITY_PRESENTATION.projectileRelease || attackWarningActive
    : effectiveProjectiles >= COMBAT_CLARITY_PRESENTATION.projectileOnset || attackWarningActive;
  if (!nextLatched) return { latched: false, pressure: 0 };

  const range = Math.max(
    1,
    COMBAT_CLARITY_PRESENTATION.projectileFull - COMBAT_CLARITY_PRESENTATION.projectileRelease
  );
  let pressure = clamp01(
    (effectiveProjectiles - COMBAT_CLARITY_PRESENTATION.projectileRelease) / range
  );
  if (attackWarningActive) {
    pressure = Math.max(pressure, COMBAT_CLARITY_PRESENTATION.warningMinimumPressure);
  }
  return { latched: true, pressure };
}

export function stepCombatClarityLevel(current, target, deltaMs, { reducedMotion = false } = {}) {
  const from = clamp01(current);
  const to = clamp01(target);
  const duration = to > from
    ? reducedMotion
      ? COMBAT_CLARITY_PRESENTATION.reducedMotionAttackMs
      : COMBAT_CLARITY_PRESENTATION.attackMs
    : reducedMotion
      ? COMBAT_CLARITY_PRESENTATION.reducedMotionReleaseMs
      : COMBAT_CLARITY_PRESENTATION.releaseMs;
  const progress = clamp01(Math.max(0, Number(deltaMs) || 0) / Math.max(1, duration));
  return from + (to - from) * progress;
}

export function getCombatClarityBackdropTreatment(level) {
  const pressure = clamp01(level);
  const suppression = pressure * COMBAT_CLARITY_PRESENTATION.maxBackdropSuppression;
  return {
    pressure,
    suppression,
    decorativeAlphaScale: 1 - suppression,
    shadeLift: suppression * 0.65
  };
}
