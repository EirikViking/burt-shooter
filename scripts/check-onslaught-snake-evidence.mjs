import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { AchievementManager } from '../src/achievements/AchievementManager.js';
import { getAchievementById } from '../src/achievements/AchievementCatalog.js';
import { evidenceFromOnslaughtRun, getOnslaughtAchievementProgress, mergeOnslaughtEvidence } from '../src/achievements/OnslaughtAchievementProgress.js';
import { ONSLAUGHT_BOARD_V2, ONSLAUGHT_LOADOUT_V2, ONSLAUGHT_RULESET_V2 } from '../electron/onslaughtContract.cjs';
import { getSelectableShips } from '../src/config/ShipMetadata.js';
globalThis.Audio = class { addEventListener() {} };
globalThis.window = { location: { origin: 'http://localhost', search: '' }, addEventListener() {}, removeEventListener() {} };
const { PlayScene } = await import('../src/scenes/PlayScene.js');
const { Game } = await import('../src/game/Game.js');
const ship = getSelectableShips()[0];
const definition = getAchievementById('ACH_OS_SNAKE_DUEL');
const { sanitizeAchievements } = createRequire(import.meta.url)('../electron/steamCloudSave.cjs');
function summary(scene, overrides = {}) {
  return {
    runId: 'snake-evidence-test', runMode: 'overrun_tactical', startSector: 51,
    shipId: ship.id, selectedShipSpriteKey: ship.spriteKey, score: 1000,
    leaderboardName: ONSLAUGHT_BOARD_V2, leaderboardKind: 'overrun_tactical', rulesetVersion: ONSLAUGHT_RULESET_V2,
    competitionStart: { runId: 'snake-evidence-test', shipId: ship.id, startSector: 51, startScore: 0,
      rulesetVersion: ONSLAUGHT_RULESET_V2, loadoutVersion: ONSLAUGHT_LOADOUT_V2,
      augmentIds: ['damage_up', 'blink_drive', 'shield'], checkpoint: null, prototype: false },
    lifeLosses: scene.lifeLossesThisRun, defeatedSnakeIds: scene.defeatedSnakeIds,
    snakeDefeats: scene.snakeDefeats, ...overrides
  };
}
for (const losses of [0, 1, 2]) {
  const data = new Map();
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  const manager = new AchievementManager({ storage, steamSync: false });
  const scene = Object.assign(Object.create(PlayScene.prototype), {
    lifeLossesThisRun: losses, defeatedSnakeIds: [], snakeDefeats: [],
    game: { level: 53, runMode: 'overrun_tactical', achievementManager: manager,
      buildRunSummary: () => summary(scene) }
  });
  const section = { kind: 'space_snake', type: 'space_snake_cinder', active: false };
  section.chain = { sections: [section, { active: true }] };
  assert.equal(scene.recordSpaceSnakeDefeat(section), false, 'a partial snake cannot qualify');
  section.chain.sections[1].active = false;
  assert.equal(scene.recordSpaceSnakeDefeat(section), true, 'the final section records one full defeat');
  assert.equal(scene.recordSpaceSnakeDefeat(section), false, 'repeated callbacks cannot add another defeat');
  assert.equal(scene.snakeDefeats.length, 1);
  assert.equal(manager.isUnlocked(definition.id), losses <= 1, `immediate unlock boundary at ${losses} losses`);
  scene.lifeLossesThisRun += 5;
  const evidence = evidenceFromOnslaughtRun(summary(scene));
  assert.equal(getOnslaughtAchievementProgress(definition, [evidence]).complete, losses <= 1,
    'later deaths cannot erase a qualifying defeat or convert a nonqualifying defeat');
  const merged = mergeOnslaughtEvidence([evidence], [evidence]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].snakeDefeats[0].lifeLosses, losses, 'Cloud round trip retains the event boundary');
  assert.deepEqual(sanitizeAchievements({ version: 2, unlocked: [], onslaughtRuns: merged }).onslaughtRuns,
    merged, 'Electron Cloud serialization must preserve collection evidence, including the defeat event');
  manager.recordOnslaughtRun(summary(scene));
  assert.equal(new AchievementManager({ storage, steamSync: false }).isUnlocked(definition.id), losses <= 1);
  assert.equal(evidenceFromOnslaughtRun(summary(scene, { isDebugRun: true })), null);
}
for (const mode of ['overrun_tactical', 'overrun_pure', 'ranked']) {
  const events = [];
  const game = Object.assign(Object.create(Game.prototype), {
    runMode: mode, currentSceneName: 'play', runFinalized: false,
    finalizeRunProgression(options) { events.push(['finalized', options.runCleared]); this.runFinalized = true; },
    switchScene(name) { events.push(['scene', name]); }
  });
  game.quitRunToMenu();
  assert.deepEqual(events, mode === 'ranked' ? [['scene', 'menu']] : [['finalized', false], ['scene', 'menu']],
    'voluntary Onslaught exit persists earned progress before leaving; Arcade behavior stays unchanged');
}
console.log('[onslaught-snake-evidence] PASS full defeat, event losses, immediate grant, later deaths, exit, restart and Cloud');
{
  const completeSet = getAchievementById('ACH_OS_COMPLETE_SET');
  const manager = new AchievementManager({ storage: { getItem: () => null, setItem() {} }, steamSync: false });
  manager.unlockedIds = new Set(completeSet.otherIds.filter(id => id !== definition.id));
  manager.recordOnslaughtSnakeDefeat(summary({ lifeLossesThisRun: 0,
    defeatedSnakeIds: ['space_snake_cinder'], snakeDefeats: [{ type: 'space_snake_cinder', lifeLosses: 0, sector: 53 }] }));
  assert.equal(manager.isUnlocked('ACH_OS_COMPLETE_SET'), true, 'last prerequisite immediately completes the collection');
  assert.equal(manager.onslaughtRuns.length, 0, 'immediate unlock does not finalize the unfinished run');
}

// Unknown historical loss totals must not fabricate a new Serpent Duel grant.
for (const previouslyUnlocked of [false, true]) for (const legacyLosses of [undefined, 0]) {
  const legacy = { runId: 'legacy-snake-unknown', mode: 'overrun_pure', hullId: ship.id,
    snakeTypes: ['space_snake_cinder'], lifeLosses: legacyLosses };
  const data = new Map([['nova_swarm_achievements_v1', JSON.stringify({ version: 2,
    unlocked: previouslyUnlocked ? [definition.id] : [], onslaughtRuns: [legacy] })]]);
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  const manager = new AchievementManager({ storage, steamSync: false });
  const result = manager.recordOnslaughtRun(summary({ lifeLossesThisRun: 4, defeatedSnakeIds: [], snakeDefeats: [] },
    { runId: 'current-snake-no-defeat', runMode: 'overrun_pure' }));
  assert.equal(result.unlocked.includes(definition.id), false, 'unknown legacy evidence cannot grant a new unlock');
  assert.equal(manager.isUnlocked(definition.id), previouslyUnlocked, 'existing saved unlocks remain intact');
  assert.equal(new AchievementManager({ storage, steamSync: false }).isUnlocked(definition.id), previouslyUnlocked);
}
console.log('[onslaught-snake-evidence] PASS unknown legacy evidence and preserved historical unlocks');
