import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getPressureMultipliers } from '../src/config/RunPacingConfig.js';
import { RunPressureDirector } from '../src/game/RunPressureDirector.js';
import { RUN_MODES } from '../src/game/RunMode.js';

const samples = [0, 149.999, 150, 299.999, 300, 300.001, 600, 900, 1200, 1500, 3600];
const tempoKeys = new Set(['fireChanceMult', 'projectileSpeedMult', 'enemySpeedMult']);
const overrunModes = [RUN_MODES.OVERRUN_PURE, RUN_MODES.OVERRUN_TACTICAL];
const nonOverrunModes = [
  RUN_MODES.RANKED,
  RUN_MODES.MAYHEM_TACTICAL,
  RUN_MODES.DAILY_SIGNAL,
  RUN_MODES.SCOUT,
  RUN_MODES.SECTOR_START,
  RUN_MODES.UNRANKED
];

function makeGame(runMode, seconds, overrides = {}) {
  const play = { gameTime: seconds };
  return {
    runMode,
    level: 51,
    runElapsedSeconds: seconds,
    scenes: { play },
    ...overrides
  };
}

function multipliers(runMode, seconds, overrides = {}) {
  return new RunPressureDirector(makeGame(runMode, seconds, overrides)).getMultipliers();
}

function assertOnlyTempoFieldsDiffer(actual, baseline, label) {
  for (const key of Object.keys(baseline)) {
    if (tempoKeys.has(key)) continue;
    assert.equal(actual[key], baseline[key], `${label}: ${key} must stay on the production curve`);
  }
}

for (const mode of overrunModes) {
  for (const seconds of samples) {
    const game = makeGame(mode, seconds);
    const director = new RunPressureDirector(game);
    const actual = director.getMultipliers();
    const baseline = getPressureMultipliers(seconds);
    if (seconds < 300) {
      assert.equal(actual.fireChanceMult, 1.15, `${mode} t=${seconds}: routine fire floor`);
      assert.equal(actual.projectileSpeedMult, 1.06, `${mode} t=${seconds}: projectile floor`);
      assert.equal(actual.enemySpeedMult, 1.04, `${mode} t=${seconds}: enemy-speed floor`);
      assertOnlyTempoFieldsDiffer(actual, baseline, `${mode} t=${seconds}`);
    } else {
      assert.deepEqual(actual, baseline, `${mode} t=${seconds}: full production curve must resume exactly`);
    }
    const debugState = director.getDebugState();
    assert.deepEqual(debugState.pressureMultipliers, actual, `${mode} t=${seconds}: diagnostics must report applied pressure`);
    assert.equal(
      debugState.overrunOpeningTempoFloorActive,
      seconds < 300,
      `${mode} t=${seconds}: diagnostics must report floor ownership`
    );
  }
}

for (const mode of nonOverrunModes) {
  for (const seconds of samples) {
    const actual = multipliers(mode, seconds);
    const baseline = getPressureMultipliers(seconds);
    if (mode === RUN_MODES.SCOUT) {
      const profile = new RunPressureDirector(makeGame(mode, seconds)).getRunModeProfile();
      const expected = Object.fromEntries(Object.entries(baseline).map(([key, value]) => [
        key,
        Number((value * profile.pressureMultipliers[key]).toFixed(4))
      ]));
      assert.deepEqual(actual, expected, `${mode} t=${seconds}: existing profile scaling must remain exact`);
    } else {
      assert.deepEqual(actual, baseline, `${mode} t=${seconds}: normal-mode pacing must remain exact`);
    }
  }
}

for (const mode of overrunModes) {
  const experiment = multipliers(mode, 0, {
    lateGameExperiment: {
      active: true,
      pressureProfile: { elapsedSeconds: 0 }
    }
  });
  assert.deepEqual(experiment, getPressureMultipliers(0), `${mode}: experiment must bypass the Overrun floor`);
}

const identityAliases = ['overrun', 'OVERRUN_PURE', 'overrun-pure', 'overrun tactical'];
for (const alias of identityAliases) {
  assert.deepEqual(
    multipliers(alias, 0),
    getPressureMultipliers(0),
    `${alias}: only canonical runtime identities may activate the floor`
  );
}

const heldGame = makeGame(RUN_MODES.OVERRUN_TACTICAL, 299);
const heldDirector = new RunPressureDirector(heldGame);
const beforeHold = heldDirector.getMultipliers();
for (const state of ['pause', 'tactical_draft', 'cabinet_wonder']) {
  heldGame.scenes.play.noAgencyState = state;
  assert.deepEqual(heldDirector.getMultipliers(), beforeHold, `${state}: a held active-time clock must not age the floor`);
}
heldGame.scenes.play.gameTime = 300;
assert.deepEqual(
  heldDirector.getMultipliers(),
  getPressureMultipliers(300),
  'active-time handoff at 300 seconds must join the production curve without a cliff'
);

let rngState = 0x12345678;
let rngCalls = 0;
function nextRng() {
  rngCalls += 1;
  rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
  return rngState;
}
const rngTrace = [];
for (const seconds of samples) {
  rngTrace.push(nextRng());
  multipliers(RUN_MODES.OVERRUN_PURE, seconds);
  rngTrace.push(nextRng());
}
assert.equal(rngCalls, samples.length * 2, 'pacing lookup must not consume RNG calls');
let controlState = 0x12345678;
const controlTrace = Array.from({ length: samples.length * 2 }, () => {
  controlState = (Math.imul(controlState, 1664525) + 1013904223) >>> 0;
  return controlState;
});
assert.deepEqual(rngTrace, controlTrace, 'RNG state and sequence must remain identical through and beyond 300 seconds');

const directorSource = readFileSync(new URL('../src/game/RunPressureDirector.js', import.meta.url), 'utf8');
assert.match(directorSource, /runMode === RUN_MODES\.OVERRUN_PURE/);
assert.match(directorSource, /runMode === RUN_MODES\.OVERRUN_TACTICAL/);
assert.match(directorSource, /lateGameExperiment\?\.active === true/);
assert.doesNotMatch(directorSource, /Math\.random|randomInt|rng\s*\(/i, 'the tempo floor must not alter RNG topology');

const playSceneSource = readFileSync(new URL('../src/scenes/PlayScene.js', import.meta.url), 'utf8');
assert.match(
  playSceneSource,
  /!this\.isPaused[\s\S]*?!this\.tacticalDraft\?\.active[\s\S]*?!this\.isCabinetWonderNoAgencyPresentationActive\(\)/,
  'pause, Tactical Draft, and Cabinet Wonder must continue holding the active gameplay clock'
);
assert.match(
  playSceneSource,
  /if \(this\.isGameplayClockAdvancing\(\)\) \{\s*this\.gameTime \+= delta \/ 60;/,
  'the pressure clock must still advance only with gameplay agency'
);

console.log(`[overrun-opening-tempo] PASS ${overrunModes.length} Overrun modes, ${nonOverrunModes.length} isolated modes, ${samples.length} boundaries, experiment/RNG/active-time invariants`);
