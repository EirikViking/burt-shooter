import assert from 'node:assert/strict';

const {
  MENU_TIPS,
  MenuTipRotation,
  MENU_TIP_INITIAL_DELAY_MS,
  MENU_TIP_SHOW_RANGE_MS,
  MENU_TIP_WAIT_RANGE_MS
} = await import('../src/ui/MenuTipRotation.js');

assert.equal(MENU_TIPS.length, 15, 'the complete approved tip pool is present');
assert.equal(new Set(MENU_TIPS).size, MENU_TIPS.length, 'tip source keys are unique');
assert.equal(MENU_TIP_INITIAL_DELAY_MS, 3000, 'first tip waits three seconds');
assert.deepEqual(MENU_TIP_SHOW_RANGE_MS, [8000, 10000], 'visible duration stays in the approved range');
assert.deepEqual(MENU_TIP_WAIT_RANGE_MS, [12000, 18000], 'between-tip delay stays in the approved range');

const rngValues = [0.13, 0.91, 0.37, 0.68, 0.04, 0.55, 0.82, 0.22, 0.74, 0.46];
let rngIndex = 0;
const rotation = new MenuTipRotation({
  tipCount: MENU_TIPS.length,
  rng: () => rngValues[(rngIndex++) % rngValues.length]
});

let state = rotation.update(2999);
assert.equal(state.visible, false, 'tip remains hidden before initial delay');
state = rotation.update(1);
assert.equal(state.visible, true, 'first tip appears at the initial delay');
assert.ok(state.showDurationMs >= 8000 && state.showDurationMs <= 10000);

const heldIndex = state.index;
const heldElapsed = state.phaseElapsedMs;
state = rotation.update(5000, { suspended: true });
assert.equal(state.visible, false, 'substantial overlays hide the tip');
assert.equal(state.index, heldIndex, 'suspension preserves the current tip');
assert.equal(state.phaseElapsedMs, heldElapsed, 'suspension pauses the cycle');
state = rotation.update(0);
assert.equal(state.visible, true, 'tip resumes after the overlay closes');

const shown = [state.index];
let guard = 0;
while (shown.length < MENU_TIPS.length + 1 && guard < 200) {
  const before = rotation.getState();
  const step = before.phase === 'showing'
    ? before.showDurationMs - before.phaseElapsedMs
    : before.waitDurationMs - before.phaseElapsedMs;
  const next = rotation.update(Math.max(1, step));
  if (next.visible && shown.at(-1) !== next.index) shown.push(next.index);
  guard += 1;
}

assert.equal(shown.length, MENU_TIPS.length + 1, 'rotation advances into a reshuffled cycle');
assert.equal(new Set(shown.slice(0, MENU_TIPS.length)).size, MENU_TIPS.length, 'every tip appears before any repeats');
assert.notEqual(shown[MENU_TIPS.length - 1], shown[MENU_TIPS.length], 'reshuffle avoids an immediate repeat');

console.log(`[menu-tips] PASS pool=${MENU_TIPS.length} firstDelayMs=${MENU_TIP_INITIAL_DELAY_MS}`);
