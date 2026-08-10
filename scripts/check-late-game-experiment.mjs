import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEFAULT_LATE_GAME_EXPERIMENT_DRAFT,
  LATE_GAME_EXPERIMENT_MATURE_LIVES,
  createLateGamePressureExperimentRun,
  getLateGameExperimentFixtures
} from '../src/game/LateGamePressureExperiment.js';
import { getRunElapsedSeconds } from '../src/config/RunPacingConfig.js';
import {
  HIGH_SECTOR_PROTOTYPE_SETTINGS_KEY,
  getHighSectorPrototypeSettings,
  migrateLegacyHighSectorPrototypeSettings
} from '../src/config/HighSectorPrototypeSettings.js';

class MemoryStorage {
  constructor(entries = {}) {
    this.entries = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.entries.has(key) ? this.entries.get(key) : null;
  }

  setItem(key, value) {
    this.entries.set(key, String(value));
  }

  removeItem(key) {
    this.entries.delete(key);
  }
}

assert.equal(createLateGamePressureExperimentRun(DEFAULT_LATE_GAME_EXPERIMENT_DRAFT), null, 'launch must require acknowledgement');

const standardA = createLateGamePressureExperimentRun({
  ...DEFAULT_LATE_GAME_EXPERIMENT_DRAFT,
  acknowledged: true
});
const standardB = createLateGamePressureExperimentRun({
  ...DEFAULT_LATE_GAME_EXPERIMENT_DRAFT,
  acknowledged: true
});
assert.equal(standardA.scenario, 'standard');
assert.equal(standardA.startSector, 75);
assert.equal(standardA.endSectorExclusive, 85);
assert.equal(standardA.lives, 3);
assert.equal(standardA.pressureProfile.elapsedSeconds, 1500);
assert.equal(standardA.draftMode, 'disabled');
assert.equal(standardA.seed, standardB.seed, 'equivalent Standard fixtures must have deterministic seeds');
assert.equal(standardA.underlyingRunMode, 'ranked_tactical');
assert.equal(standardA.permanentPierceContract, 'bounded');

const pure = createLateGamePressureExperimentRun({
  acknowledged: true,
  scenario: 'endurance',
  ruleset: 'pure',
  fixtureId: 'pure_control',
  startSector: 120,
  lifeStock: 'mature_stock',
  phasePulseAvailable: false
});
assert.equal(pure.underlyingRunMode, 'ranked');
assert.deepEqual(pure.baselineAugmentIds, [], 'Pure experiment must receive zero Tactical augments');
assert.equal(pure.lives, LATE_GAME_EXPERIMENT_MATURE_LIVES);
assert.equal(pure.endSectorExclusive, null);
assert.equal(pure.pressureProfile.id, 'sector_120_deep_endurance');
assert.equal(pure.pressureProfile.elapsedSeconds, 2100);
assert.equal(pure.phasePulseAvailable, false);

const tacticalFixtures = getLateGameExperimentFixtures('tactical');
assert.deepEqual(
  tacticalFixtures.map((fixture) => fixture.id),
  [
    'tactical_control_no_pierce',
    'tactical_saturation_bounded',
    'tactical_saturation_unlimited'
  ]
);
assert.equal(tacticalFixtures.find((fixture) => fixture.id === 'tactical_control_no_pierce').baselineAugmentIds.includes('pierce'), false);
assert.equal(tacticalFixtures.find((fixture) => fixture.id === 'tactical_saturation_bounded').permanentPierceContract, 'bounded');
assert.equal(tacticalFixtures.find((fixture) => fixture.id === 'tactical_saturation_unlimited').permanentPierceContract, 'unlimited');

const pressureGame = {
  lateGameExperiment: pure,
  scenes: { play: { gameTime: 7.5 } },
  runElapsedSeconds: 7.5
};
assert.equal(getRunElapsedSeconds(pressureGame), 2107.5, 'experiment must hydrate late-run pressure instead of opening-time pressure');
assert.equal(getRunElapsedSeconds({ scenes: { play: { gameTime: 7.5 } } }), 7.5, 'normal pressure timing must remain unchanged');

const storage = new MemoryStorage({
  [HIGH_SECTOR_PROTOTYPE_SETTINGS_KEY]: JSON.stringify({ enabled: true, quickStart: true })
});
const migration = migrateLegacyHighSectorPrototypeSettings({ storage });
assert.equal(migration.removed, true);
assert.deepEqual(migration.legacy, { enabled: true, quickStart: true });
assert.equal(storage.getItem(HIGH_SECTOR_PROTOTYPE_SETTINGS_KEY), null, 'legacy gameplay toggle must be removed');
assert.deepEqual(getHighSectorPrototypeSettings({ storage }), { enabled: false, quickStart: false });

const gameSource = fs.readFileSync('src/game/Game.js', 'utf8');
const settingsSource = fs.readFileSync('src/ui/SettingsOverlay.js', 'utf8');
const playSource = fs.readFileSync('src/scenes/PlayScene.js', 'utf8');
assert.match(gameSource, /createLateGamePressureExperimentRun\(options\.lateGameExperiment\)/);
assert.match(gameSource, /clearLateGameExperimentState\('return_to_menu'\)/);
assert.doesNotMatch(gameSource, /getHighSectorPrototypeSettings\(\)/, 'legacy preferences must not arm gameplay');
assert.match(settingsSource, /allowExperimentLaunch/);
assert.match(settingsSource, /acknowledged: true/);
assert.match(settingsSource, /START EXPERIMENT/);
assert.match(settingsSource, /EXPERIMENTAL TEST \/\/ NO AWARDS/);
assert.doesNotMatch(settingsSource, /saveHighSectorPrototypeSettings/);
assert.match(playSource, /late_game_experiment_window_complete/);
assert.match(playSource, /draftMode !== 'disabled'/);

console.log(JSON.stringify({
  pass: true,
  standard: {
    sector: standardA.startSector,
    endSectorExclusive: standardA.endSectorExclusive,
    seed: standardA.seed,
    pressureSeconds: standardA.pressureProfile.elapsedSeconds
  },
  endurance: {
    sector: pure.startSector,
    lives: pure.lives,
    pressureSeconds: pure.pressureProfile.elapsedSeconds,
    pureAugments: pure.baselineAugmentIds.length
  },
  fixtures: tacticalFixtures.map((fixture) => fixture.id),
  legacyKeyRemoved: migration.removed
}, null, 2));
