import {
  COMBAT_CLARITY_PRESENTATION,
  getCombatClarityBackdropTreatment,
  resolveCombatClarityPressure,
  stepCombatClarityLevel
} from '../src/config/CombatClarityPresentation.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let state = resolveCombatClarityPressure({ activeHostileProjectiles: 37 });
assert(state.pressure === 0 && state.latched === false, `Quiet field activated: ${JSON.stringify(state)}`);

state = resolveCombatClarityPressure({ activeHostileProjectiles: 38 });
assert(state.pressure > 0 && state.latched === true, `Onset did not latch: ${JSON.stringify(state)}`);

const held = resolveCombatClarityPressure({ activeHostileProjectiles: 30, latched: true });
assert(held.pressure > 0 && held.latched === true, `Hysteresis did not hold: ${JSON.stringify(held)}`);

const released = resolveCombatClarityPressure({ activeHostileProjectiles: 25, latched: true });
assert(released.pressure === 0 && released.latched === false, `Hysteresis did not release: ${JSON.stringify(released)}`);

const warning = resolveCombatClarityPressure({ activeHostileProjectiles: 0, attackWarningActive: true });
assert(
  warning.pressure >= COMBAT_CLARITY_PRESENTATION.warningMinimumPressure,
  `Visible warning did not create clarity pressure: ${JSON.stringify(warning)}`
);

const experimental = resolveCombatClarityPressure({
  activeHostileProjectiles: 999,
  attackWarningActive: true,
  latched: true,
  experimentalMode: true
});
assert(experimental.pressure === 0 && experimental.latched === false,
  `Experimental mode was not isolated: ${JSON.stringify(experimental)}`);

let level = 0;
for (let elapsed = 0; elapsed < COMBAT_CLARITY_PRESENTATION.attackMs; elapsed += 20) {
  level = stepCombatClarityLevel(level, 1, 20);
}
assert(level > 0.63 && level < 1, `Attack easing is not gradual: ${level}`);
for (let elapsed = 0; elapsed < 1400; elapsed += 20) level = stepCombatClarityLevel(level, 1, 20);
const treatment = getCombatClarityBackdropTreatment(level);
assert(treatment.suppression <= 0.18 && treatment.suppression > 0.17,
  `Suppression escaped subtle cap: ${JSON.stringify(treatment)}`);
assert(treatment.decorativeAlphaScale >= 0.82,
  `Decorative treatment became a visible blackout: ${JSON.stringify(treatment)}`);

const reducedMotionStep = stepCombatClarityLevel(0, 1, 100, { reducedMotion: true });
const normalStep = stepCombatClarityLevel(0, 1, 100, { reducedMotion: false });
assert(reducedMotionStep < normalStep,
  `Reduced Motion transition was not slower/stable: ${JSON.stringify({ reducedMotionStep, normalStep })}`);

console.log('Combat clarity presentation checks passed.');
console.log(JSON.stringify({ warning, treatment, reducedMotionStep, normalStep }, null, 2));
