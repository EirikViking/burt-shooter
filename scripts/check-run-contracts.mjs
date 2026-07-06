import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

class MemoryStorage {
  constructor(entries = []) {
    this.map = new Map(entries.map(([key, value]) => [String(key), String(value)]));
  }

  getItem(key) {
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }

  setItem(key, value) {
    this.map.set(String(key), String(value));
  }

  removeItem(key) {
    this.map.delete(String(key));
  }

  clear() {
    this.map.clear();
  }
}

globalThis.Storage = MemoryStorage;
globalThis.window = { localStorage: new MemoryStorage() };
globalThis.localStorage = globalThis.window.localStorage;

const { RUN_MODES } = await import('../src/game/RunMode.js');
const { createRunReport } = await import('../src/game/RunReport.js');
const { SHOW_PILOT_ORDERS_KEY } = await import('../src/config/MenuSettings.js');
const {
  HANGAR_PROGRESS_KEY,
  readHangarProgressState,
  writeHangarProgressState
} = await import('../src/progression/HangarProgressState.js');
const {
  DEFAULT_ACTIVE_RUN_CONTRACT_IDS,
  RUN_CONTRACTS_VERSION,
  RUN_CONTRACT_ORDER_IDS,
  acknowledgeRunContractCompletionNotice,
  applyRunContractEvent,
  getDefaultShowPilotOrders,
  getRunContractCatalog,
  getRunContractCompletionReviewState,
  getRunContractMenuState,
  mergeRunContractsState,
  normalizeRunContractsState,
  prepareRunContractsForEligibleRun,
  recordRunContractCompletion,
  recordRunContractSessionProgress,
  startRunContractSession
} = await import('../src/progression/RunContracts.js');

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4778));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/run-contracts-${timestamp()}`);

const FIRST_THREE = ['graze_10', 'boss_breaker', 'enemy_sweep_1000'];
const SECOND_THREE = ['support_hunter', 'phase_runner', 'powerup_collector_10'];
const EXPECTED_ORDER_IDS = [
  'graze_10',
  'boss_breaker',
  'enemy_sweep_1000',
  'support_hunter',
  'phase_runner',
  'powerup_collector_10',
  'near_miss_streak',
  'shield_pickup',
  'slow_mo_finisher',
  'sector_5_survivor',
  'blink_control',
  'sector_3_signal',
  'bomb_pickup',
  'enemy_sweep_2500',
  'graze_50',
  'boss_hunter_10',
  'support_hunter_10',
  'enemy_variety_50',
  'pilot_rank_5',
  'sector_7_signal',
  'slow_time_pickup',
  'phase_veteran_10',
  'powerup_collector_25',
  'chrono_anchor_pickup',
  'extra_life_found',
  'near_miss_streak_10',
  'sector_10_signal',
  'blink_veteran_3',
  'shield_collector_5',
  'bomb_collector_5',
  'enemy_sweep_10000',
  'boss_hunter_25',
  'support_hunter_25',
  'enemy_variety_75',
  'graze_150',
  'point_defense_pickup',
  'repair_pickup',
  'shockwave_pickup',
  'sector_15_signal',
  'powerup_collector_50',
  'phase_master_25',
  'boss_hunter_50',
  'support_hunter_50',
  'enemy_variety_100',
  'pilot_rank_10',
  'ranked_launch_3',
  'ranked_regular_10',
  'enemy_sweep_25000',
  'boss_hunter_100',
  'support_hunter_100'
];
const ACTIVE_DESCRIPTIONS = Object.fromEntries(
  getRunContractCatalog().map((contract) => [contract.id, contract.shortDescription])
);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function setStorage(storage) {
  globalThis.window.localStorage = storage;
  globalThis.localStorage = storage;
  return storage;
}

function completion(id, overrides = {}) {
  return {
    id,
    count: overrides.count || 1,
    completedAt: overrides.completedAt || '2026-07-02T12:00:00.000Z',
    lastRunMode: overrides.lastRunMode || RUN_MODES.RANKED,
    lastSector: overrides.lastSector || 1,
    buildVersion: overrides.buildVersion || 'check-run-contracts'
  };
}

function runContractState({ activeIds = DEFAULT_ACTIVE_RUN_CONTRACT_IDS, completedIds = [], completionNoticeSeen = false } = {}) {
  return normalizeRunContractsState({
    activeIds,
    completedIds,
    completed: Object.fromEntries(completedIds.map((id) => [id, completion(id)])),
    completionNoticeSeen
  });
}

function completeIds(state, ids) {
  return ids.reduce((next, id) => recordRunContractCompletion(next, completion(id)), state);
}

function sessionFor(activeIds) {
  const requested = new Set(activeIds);
  const session = startRunContractSession({
    runMode: RUN_MODES.RANKED,
    progress: {
      runContracts: normalizeRunContractsState({ activeIds })
    }
  });
  return {
    ...session,
    active: session.active.filter((item) => requested.has(item.id))
  };
}

function applyEvents(session, events) {
  let next = session;
  let completed = [];
  for (const event of events) {
    const result = applyRunContractEvent(next, event);
    next = result.session;
    completed = completed.concat(result.completed || []);
  }
  return { session: next, completed };
}

function findSessionItem(session, id) {
  return session.active.find((item) => item.id === id);
}

function assertDistinctActiveGroups(stateOrIds, label = 'active orders') {
  const catalogById = new Map(getRunContractCatalog().map((contract) => [contract.id, contract]));
  const ids = Array.isArray(stateOrIds) ? stateOrIds : (stateOrIds.activeIds || []);
  const groups = ids.map((id) => catalogById.get(id)?.group || id);
  assert.equal(new Set(groups).size, groups.length, `${label} should not contain two orders from the same group`);
}

function runCatalogAndSaveTests() {
  const storage = setStorage(new MemoryStorage());
  const catalog = getRunContractCatalog();
  assert.equal(catalog.length, 50, 'Pilot Orders should expose the finite starter catalog');
  assert.equal(new Set(catalog.map((contract) => contract.id)).size, catalog.length, 'contract ids must be unique');
  assert.equal(catalog.every((contract) => typeof contract.group === 'string' && contract.group), true, 'contract catalog should tag every order with a display group');
  assert.deepEqual(RUN_CONTRACT_ORDER_IDS, EXPECTED_ORDER_IDS);
  assert.deepEqual(DEFAULT_ACTIVE_RUN_CONTRACT_IDS, FIRST_THREE);

  const migrated = readHangarProgressState();
  assert.equal(migrated.runContracts.version, RUN_CONTRACTS_VERSION, 'default profile should gain runContracts state');
  assert.deepEqual(migrated.runContracts.activeIds, DEFAULT_ACTIVE_RUN_CONTRACT_IDS);
  assertDistinctActiveGroups(migrated.runContracts, 'default Pilot Orders');
  const menuState = getRunContractMenuState(migrated);
  assert.equal(menuState.title, 'PILOT ORDERS');
  assert.equal(menuState.progressLabel, '0/50');
  assert.equal(menuState.completedCount, 0);
  assert.equal(menuState.total, 50);
  assert.equal(menuState.subtitle, 'Review cleared orders in Ship Hangar.');
  assert.equal(menuState.status, 'active');
  assert.equal(menuState.active.length, 3, 'menu state should expose three active orders');
  assert.equal(menuState.next?.[0]?.id, 'support_hunter', 'menu state should expose the next queued Pilot Order after active slots');
  assert.equal(menuState.rewardsEnabled, false, 'rewards should stay disabled');
  const disabledMenuState = getRunContractMenuState(migrated, { showPilotOrders: false });
  assert.equal(disabledMenuState.status, 'hidden', 'settings toggle should hide unfinished Pilot Orders');
  assert.equal(disabledMenuState.disabledBySetting, true, 'hidden unfinished board should identify the toggle as the reason');
  assert.equal(getDefaultShowPilotOrders({ bestSector: 1, totalRuns: 0 }), true, 'fresh profiles should show Pilot Orders by default');
  assert.equal(getDefaultShowPilotOrders({ bestSector: 10 }), false, 'mature profiles should hide Pilot Orders by default');

  const dedupedEnemyOrders = normalizeRunContractsState({
    activeIds: ['near_miss_streak', 'enemy_sweep_1000', 'enemy_sweep_2500']
  });
  assertDistinctActiveGroups(dedupedEnemyOrders, 'normalized duplicate enemy orders');
  assert.equal(dedupedEnemyOrders.activeIds.includes('enemy_sweep_2500'), false, 'normalization should not show two enemy-kill orders together');

  let session = startRunContractSession({ runMode: RUN_MODES.RANKED, progress: migrated });
  const bossResult = applyRunContractEvent(session, { type: 'boss_defeated', sector: 2 });
  assert.deepEqual(bossResult.completed.map((entry) => entry.id), ['boss_breaker'], 'first Mayhem boss defeat should complete Boss Breaker');

  const grazePartial = applyEvents(sessionFor(['graze_10']), Array.from({ length: 9 }, (_, index) => ({
    type: 'near_miss',
    streak: index + 1,
    sector: 1
  })));
  assert.equal(grazePartial.completed.length, 0, 'Graze x10 should wait until ten grazes');
  assert.equal(findSessionItem(grazePartial.session, 'graze_10').progress, 9);
  const grazeResult = applyRunContractEvent(grazePartial.session, { type: 'near_miss', streak: 10, sector: 1 });
  assert.deepEqual(grazeResult.completed.map((entry) => entry.id), ['graze_10']);

  const enemyNope = applyRunContractEvent(sessionFor(['enemy_sweep_1000']), { type: 'near_miss', streak: 3, sector: 1 });
  assert.equal(enemyNope.completed.length, 0, 'enemy kill orders should only advance on enemy defeats');
  const enemy1000Partial = applyEvents(enemyNope.session, [
    { type: 'enemy_defeated', sector: 2, count: 400 },
    { type: 'enemy_defeated', sector: 3, count: 500 }
  ]);
  assert.equal(enemy1000Partial.completed.length, 0, '1000 Enemies should wait until the target is reached');
  assert.equal(findSessionItem(enemy1000Partial.session, 'enemy_sweep_1000').progress, 900);
  const enemy1000Result = applyRunContractEvent(enemy1000Partial.session, { type: 'enemy_defeated', sector: 4, count: 100 });
  assert.deepEqual(enemy1000Result.completed.map((entry) => entry.id), ['enemy_sweep_1000']);
  assert.equal(findSessionItem(enemy1000Result.session, 'enemy_sweep_1000').progress, 1000);

  const enemy2500Partial = applyRunContractEvent(sessionFor(['enemy_sweep_2500']), { type: 'enemy_defeated', sector: 5, count: 2400 });
  assert.equal(enemy2500Partial.completed.length, 0, '2500 Enemies should wait until the target is reached');
  assert.equal(findSessionItem(enemy2500Partial.session, 'enemy_sweep_2500').progress, 2400);
  const enemy2500Result = applyRunContractEvent(enemy2500Partial.session, { type: 'enemy_defeated', sector: 6, count: 100 });
  assert.deepEqual(enemy2500Result.completed.map((entry) => entry.id), ['enemy_sweep_2500']);
  assert.equal(findSessionItem(enemy2500Result.session, 'enemy_sweep_2500').progress, 2500);

  const enemy10000Result = applyRunContractEvent(sessionFor(['enemy_sweep_10000']), { type: 'enemy_defeated', sector: 8, count: 10000 });
  assert.deepEqual(enemy10000Result.completed.map((entry) => entry.id), ['enemy_sweep_10000']);
  const enemy25000Result = applyRunContractEvent(sessionFor(['enemy_sweep_25000']), { type: 'enemy_defeated', sector: 12, count: 25000 });
  assert.deepEqual(enemy25000Result.completed.map((entry) => entry.id), ['enemy_sweep_25000']);

  const supportResult = applyEvents(sessionFor(['support_hunter']), [
    { type: 'boss_support_defeated', sector: 4 },
    { type: 'boss_support_defeated', sector: 4 }
  ]);
  assert.deepEqual(supportResult.completed.map((entry) => entry.id), ['support_hunter']);
  const supportTenResult = applyEvents(sessionFor(['support_hunter_10']), Array.from({ length: 10 }, () => ({ type: 'boss_support_defeated', sector: 4 })));
  assert.deepEqual(supportTenResult.completed.map((entry) => entry.id), ['support_hunter_10']);
  for (const [id, target] of [['support_hunter_25', 25], ['support_hunter_50', 50], ['support_hunter_100', 100]]) {
    const result = applyEvents(sessionFor([id]), Array.from({ length: target }, () => ({ type: 'boss_support_defeated', sector: 7 })));
    assert.deepEqual(result.completed.map((entry) => entry.id), [id], `${id} should complete at ${target} support defeats`);
  }

  const bossTenPartial = applyEvents(sessionFor(['boss_hunter_10']), Array.from({ length: 9 }, () => ({ type: 'boss_defeated', sector: 4 })));
  assert.equal(bossTenPartial.completed.length, 0, '10 Bosses should wait until the tenth boss defeat');
  assert.equal(findSessionItem(bossTenPartial.session, 'boss_hunter_10').progress, 9);
  const bossTenResult = applyRunContractEvent(bossTenPartial.session, { type: 'boss_defeated', sector: 5 });
  assert.deepEqual(bossTenResult.completed.map((entry) => entry.id), ['boss_hunter_10']);
  for (const [id, target] of [['boss_hunter_25', 25], ['boss_hunter_50', 50], ['boss_hunter_100', 100]]) {
    const result = applyEvents(sessionFor([id]), Array.from({ length: target }, () => ({ type: 'boss_defeated', sector: 7 })));
    assert.deepEqual(result.completed.map((entry) => entry.id), [id], `${id} should complete at ${target} boss defeats`);
  }

  const enemyVarietyPartial = applyEvents(sessionFor(['enemy_variety_50']), Array.from({ length: 49 }, (_, index) => ({
    type: 'enemy_defeated',
    sector: 3,
    enemyType: `enemy_type_${index}`
  })));
  assert.equal(enemyVarietyPartial.completed.length, 0, 'enemy variety should wait for distinct enemy types');
  assert.equal(findSessionItem(enemyVarietyPartial.session, 'enemy_variety_50').progress, 49);
  const enemyVarietyDuplicate = applyRunContractEvent(enemyVarietyPartial.session, {
    type: 'enemy_defeated',
    sector: 3,
    enemyType: 'enemy_type_10'
  });
  assert.equal(findSessionItem(enemyVarietyDuplicate.session, 'enemy_variety_50').progress, 49, 'duplicate enemy types should not advance variety orders');
  const enemyVarietyResult = applyRunContractEvent(enemyVarietyDuplicate.session, {
    type: 'enemy_defeated',
    sector: 3,
    enemyType: 'enemy_type_49'
  });
  assert.deepEqual(enemyVarietyResult.completed.map((entry) => entry.id), ['enemy_variety_50']);
  for (const [id, target] of [['enemy_variety_75', 75], ['enemy_variety_100', 100]]) {
    const result = applyEvents(sessionFor([id]), Array.from({ length: target }, (_, index) => ({
      type: 'enemy_defeated',
      sector: 8,
      enemyType: `${id}_type_${index}`
    })));
    assert.deepEqual(result.completed.map((entry) => entry.id), [id], `${id} should complete at ${target} distinct enemy types`);
  }

  const rankPartial = applyRunContractEvent(sessionFor(['pilot_rank_5']), { type: 'pilot_rank_reached', rankIndex: 3, sector: 1 });
  assert.equal(rankPartial.completed.length, 0, 'Rank 5 should wait for display rank 5');
  assert.equal(findSessionItem(rankPartial.session, 'pilot_rank_5').progress, 4);
  const rankResult = applyRunContractEvent(rankPartial.session, { type: 'pilot_rank_reached', rankIndex: 4, sector: 1 });
  assert.deepEqual(rankResult.completed.map((entry) => entry.id), ['pilot_rank_5']);
  const rankTenResult = applyRunContractEvent(sessionFor(['pilot_rank_10']), { type: 'pilot_rank_reached', displayRank: 10, sector: 1 });
  assert.deepEqual(rankTenResult.completed.map((entry) => entry.id), ['pilot_rank_10']);


  const slowNope = applyRunContractEvent(sessionFor(['slow_mo_finisher']), { type: 'boss_defeated', slowTimeActive: false, sector: 2 });
  assert.equal(slowNope.completed.length, 0, 'boss defeat without Slow Time should not satisfy Slow-Mo Finisher');
  const slowResult = applyRunContractEvent(slowNope.session, { type: 'boss_defeated', slowTimeActive: true, sector: 2 });
  assert.deepEqual(slowResult.completed.map((entry) => entry.id), ['slow_mo_finisher']);

  const phaseResult = applyRunContractEvent(sessionFor(['phase_runner']), { type: 'phase_used', dangerous: true, sector: 1 });
  assert.deepEqual(phaseResult.completed.map((entry) => entry.id), ['phase_runner']);
  const phaseVeteran = applyEvents(sessionFor(['phase_veteran_10']), Array.from({ length: 10 }, () => ({ type: 'phase_used', dangerous: false, sector: 3 })));
  assert.deepEqual(phaseVeteran.completed.map((entry) => entry.id), ['phase_veteran_10']);
  const phaseMaster = applyEvents(sessionFor(['phase_master_25']), Array.from({ length: 25 }, () => ({ type: 'phase_used', dangerous: false, sector: 6 })));
  assert.deepEqual(phaseMaster.completed.map((entry) => entry.id), ['phase_master_25']);

  const nearMissResult = applyRunContractEvent(sessionFor(['near_miss_streak']), { type: 'near_miss', streak: 5, sector: 1 });
  assert.deepEqual(nearMissResult.completed.map((entry) => entry.id), ['near_miss_streak']);
  const nearMissTenResult = applyRunContractEvent(sessionFor(['near_miss_streak_10']), { type: 'near_miss', streak: 10, sector: 1 });
  assert.deepEqual(nearMissTenResult.completed.map((entry) => entry.id), ['near_miss_streak_10']);

  const blinkResult = applyRunContractEvent(sessionFor(['blink_control']), { type: 'blink_drive_survived', survivedSeconds: 6, sector: 1 });
  assert.deepEqual(blinkResult.completed.map((entry) => entry.id), ['blink_control']);

  const powerupTotal = applyEvents(sessionFor(['powerup_collector_10']), Array.from({ length: 10 }, () => ({ type: 'powerup_collected', powerupType: 'shield', sector: 2 })));
  assert.deepEqual(powerupTotal.completed.map((entry) => entry.id), ['powerup_collector_10']);
  const shieldNope = applyRunContractEvent(sessionFor(['shield_pickup']), { type: 'powerup_collected', powerupType: 'bomb', sector: 2 });
  assert.equal(shieldNope.completed.length, 0, 'Shield Check should require a shield pickup');
  const shieldResult = applyRunContractEvent(shieldNope.session, { type: 'powerup_collected', powerupType: 'shield', sector: 2 });
  assert.deepEqual(shieldResult.completed.map((entry) => entry.id), ['shield_pickup']);
  const blinkVeteran = applyEvents(sessionFor(['blink_veteran_3']), Array.from({ length: 3 }, () => ({ type: 'powerup_collected', powerupType: 'blink_drive', sector: 4 })));
  assert.deepEqual(blinkVeteran.completed.map((entry) => entry.id), ['blink_veteran_3']);
  const repairResult = applyRunContractEvent(sessionFor(['repair_pickup']), { type: 'powerup_collected', powerupType: 'nano_patch', sector: 2 });
  assert.deepEqual(repairResult.completed.map((entry) => entry.id), ['repair_pickup']);

  const runLaunches = applyEvents(sessionFor(['ranked_launch_3']), Array.from({ length: 3 }, () => ({ type: 'run_started', sector: 1 })));
  assert.deepEqual(runLaunches.completed.map((entry) => entry.id), ['ranked_launch_3']);

  const noLifeLossFail = applyEvents(sessionFor(['sector_5_survivor']), [
    { type: 'life_lost', sector: 2 },
    { type: 'sector_reached', sector: 5 }
  ]);
  assert.equal(noLifeLossFail.completed.length, 0, 'Sector 5 Survivor should fail after life loss');
  const noLifeLossResult = applyRunContractEvent(sessionFor(['sector_5_survivor']), { type: 'sector_reached', sector: 5 });
  assert.deepEqual(noLifeLossResult.completed.map((entry) => entry.id), ['sector_5_survivor']);

  const sectorThree = applyRunContractEvent(sessionFor(['sector_3_signal']), { type: 'sector_reached', sector: 3 });
  assert.deepEqual(sectorThree.completed.map((entry) => entry.id), ['sector_3_signal']);
  const sectorTen = applyRunContractEvent(sessionFor(['sector_10_signal']), { type: 'sector_reached', sector: 10 });
  assert.deepEqual(sectorTen.completed.map((entry) => entry.id), ['sector_10_signal']);

  const enemySweepBase = normalizeRunContractsState({ activeIds: ['enemy_sweep_1000'] });
  const enemySweepPartial = applyEvents(sessionFor(['enemy_sweep_1000']), [
    { type: 'enemy_defeated', sector: 2, count: 250 },
    { type: 'enemy_defeated', sector: 3, count: 250 }
  ]);
  assert.equal(findSessionItem(enemySweepPartial.session, 'enemy_sweep_1000').progress, 500, 'enemy sweep should count cumulative enemy defeats');
  const savedSweep = recordRunContractSessionProgress(enemySweepBase, enemySweepPartial.session);
  const progressReport = createRunReport({
    runMode: RUN_MODES.RANKED,
    runContracts: {
      progressThisRun: [{
        id: 'enemy_sweep_1000',
        shortTitle: '1000 Enemies',
        previousProgress: 0,
        progress: 500,
        target: 1000
      }],
      next: [{
        id: 'support_hunter',
        shortTitle: 'Support Hunter',
        progress: 0,
        target: 2
      }]
    }
  });
  const pilotOrdersRow = progressReport.sections
    .find((section) => section.id === 'rewards')
    ?.rows.find((row) => row.id === 'pilotOrders');
  assert.equal(pilotOrdersRow?.value?.[0]?.type, 'pilotOrderProgress', 'run report should summarize non-completing Pilot Orders progress');
  assert.equal(pilotOrdersRow?.value?.[0]?.progress, 500);
  assert.equal(pilotOrdersRow?.value?.[1]?.type, 'pilotOrderNext', 'run report should expose the next queued Pilot Order');
  assert.equal(pilotOrdersRow?.value?.[1]?.title, 'Support Hunter');
  const resumedSweep = startRunContractSession({
    runMode: RUN_MODES.RANKED,
    progress: {
      runContracts: normalizeRunContractsState({
        ...savedSweep,
        activeIds: ['enemy_sweep_1000']
      })
    }
  });
  assert.equal(findSessionItem(resumedSweep, 'enemy_sweep_1000').progress, 500, 'enemy sweep should preserve progress across eligible Mayhem starts');
  const enemySweepComplete = applyRunContractEvent(resumedSweep, { type: 'enemy_defeated', sector: 4, count: 500 });
  assert.deepEqual(enemySweepComplete.completed.map((entry) => entry.id), ['enemy_sweep_1000']);

  const enemyVarietyBase = normalizeRunContractsState({ activeIds: ['enemy_variety_50'] });
  const enemyVarietySavedPartial = applyEvents(sessionFor(['enemy_variety_50']), [
    { type: 'enemy_defeated', sector: 2, enemyType: 'codex_scout' },
    { type: 'enemy_defeated', sector: 2, enemyType: 'codex_diver' },
    { type: 'enemy_defeated', sector: 2, enemyType: 'codex_scout' }
  ]);
  const savedVariety = recordRunContractSessionProgress(enemyVarietyBase, enemyVarietySavedPartial.session);
  assert.equal(savedVariety.progress.enemy_variety_50.progress, 2, 'enemy variety should persist unique enemy type count');
  assert.deepEqual(savedVariety.progress.enemy_variety_50.uniqueIds.sort(), ['codex_diver', 'codex_scout']);
  const resumedVariety = startRunContractSession({
    runMode: RUN_MODES.RANKED,
    progress: {
      runContracts: normalizeRunContractsState({
        ...savedVariety,
        activeIds: ['enemy_variety_50']
      })
    }
  });
  assert.equal(findSessionItem(resumedVariety, 'enemy_variety_50').progress, 2, 'enemy variety should resume unique progress');

  const scoutSession = startRunContractSession({ runMode: RUN_MODES.SCOUT, progress: migrated });
  const scoutResult = applyRunContractEvent(scoutSession, { type: 'near_miss', streak: 1, sector: 1 });
  assert.equal(scoutResult.completed.length, 0, 'Scout runs should not complete Mayhem-only orders');
  assert.equal(findSessionItem(scoutResult.session, 'enemy_sweep_1000').eligible, false);

  const firstSave = recordRunContractCompletion(migrated.runContracts, bossResult.completed[0]);
  const grazePartialSave = recordRunContractSessionProgress(
    normalizeRunContractsState({ activeIds: ['graze_10'] }),
    applyEvents(sessionFor(['graze_10']), Array.from({ length: 3 }, (_, index) => ({
      type: 'near_miss',
      streak: index + 1,
      sector: 1
    }))).session
  );
  assert.equal(grazePartialSave.progress.graze_10.progress, 3, 'partial progress should persist for active unfinished orders');

  const completedFirstThree = completeIds(migrated.runContracts, FIRST_THREE);
  assert.deepEqual(completedFirstThree.activeIds, FIRST_THREE, 'completed orders should linger in active slots before transition');
  const completedMenu = getRunContractMenuState(completedFirstThree);
  assert.equal(completedMenu.active[0].progress, completedMenu.active[0].target, 'completed active row should report target progress');
  assert.equal(completedMenu.active[0].completed, true);

  const rotated = prepareRunContractsForEligibleRun(completedFirstThree);
  assert.deepEqual(rotated.activeIds, SECOND_THREE, 'next eligible Mayhem run should rotate completed starters out');
  assertDistinctActiveGroups(rotated, 'rotated Pilot Orders');
  assert.deepEqual(Object.keys(rotated.progress), [], 'rotation should clear old partial active progress');

  const allComplete = completeIds(migrated.runContracts, RUN_CONTRACT_ORDER_IDS);
  assert.ok(allComplete.allCompletedAt, 'all-complete state should keep a lightweight completion timestamp');
  const completionReview = getRunContractCompletionReviewState(allComplete);
  assert.equal(completionReview.completedCount, RUN_CONTRACT_ORDER_IDS.length, 'completed review should expose every cleared starter order');
  assert.ok(completionReview.completed.some((entry) => entry.id === 'enemy_sweep_2500'), 'completed review should include the 2500 Enemies order');
  const allCompleteMenu = getRunContractMenuState(allComplete);
  assert.equal(allCompleteMenu.status, 'complete');
  assert.equal(allCompleteMenu.completionTitle, 'PILOT ORDERS COMPLETE');
  assert.equal(allCompleteMenu.completionNoticeSeen, false);
  assert.ok(allCompleteMenu.allCompletedAt, 'menu state should expose all-complete timestamp');
  const allCompleteMenuWithToggleOff = getRunContractMenuState(allComplete, { showPilotOrders: false });
  assert.equal(allCompleteMenuWithToggleOff.status, 'complete', 'final completion notice should show once even if the toggle is off');
  assert.equal(allCompleteMenuWithToggleOff.disabledBySetting, false);
  const acknowledged = acknowledgeRunContractCompletionNotice(allComplete);
  assert.equal(acknowledged.completionNoticeSeen, true);
  assert.ok(acknowledged.completionNoticeSeenAt, 'acknowledged state should record notice seen time');
  const hiddenMenu = getRunContractMenuState(acknowledged);
  assert.equal(hiddenMenu.status, 'hidden', 'all-complete board should hide after the completion notice is seen');
  assert.equal(hiddenMenu.completionNoticeSeen, true);
  assert.ok(hiddenMenu.completionNoticeSeenAt, 'hidden menu state should expose notice seen time');
  const hiddenMenuWithToggleOff = getRunContractMenuState(acknowledged, { showPilotOrders: false });
  assert.equal(hiddenMenuWithToggleOff.status, 'hidden', 'acknowledged completion should stay hidden regardless of setting');
  assert.equal(hiddenMenuWithToggleOff.disabledBySetting, false);

  const merged = mergeRunContractsState(
    { completed: { support_hunter: { id: 'support_hunter', count: 1, completedAt: '2026-07-02T10:00:00.000Z' } } },
    { completed: { support_hunter: { id: 'support_hunter', count: 4, completedAt: '2026-07-02T11:00:00.000Z' } } }
  );
  assert.equal(merged.completed.support_hunter.count, 4, 'cloud/local merge should keep the higher completion count');
  const mergedAcknowledged = mergeRunContractsState(acknowledged, {});
  assert.equal(mergedAcknowledged.completionNoticeSeen, true, 'merge should preserve completion notice acknowledgement');
  assert.ok(mergedAcknowledged.completionNoticeSeenAt, 'merge should preserve notice seen timestamp');
  const mergedProgress = mergeRunContractsState(
    {
      activeIds: ['enemy_sweep_1000', 'enemy_variety_50'],
      progress: {
        enemy_sweep_1000: { id: 'enemy_sweep_1000', progress: 500, target: 1000 },
        enemy_variety_50: { id: 'enemy_variety_50', progress: 1, target: 50, uniqueIds: ['scout'] }
      }
    },
    {
      activeIds: ['enemy_sweep_1000', 'enemy_variety_50'],
      progress: {
        enemy_sweep_1000: { id: 'enemy_sweep_1000', progress: 750, target: 1000 },
        enemy_variety_50: { id: 'enemy_variety_50', progress: 1, target: 50, uniqueIds: ['diver'] }
      }
    }
  );
  assert.equal(mergedProgress.progress.enemy_sweep_1000.progress, 750, 'merge should keep higher enemy-kill progress');
  assert.deepEqual(mergedProgress.progress.enemy_variety_50.uniqueIds.sort(), ['diver', 'scout'], 'merge should union unique enemy type progress');

  writeHangarProgressState({
    ...migrated,
    runContracts: completedFirstThree
  });
  const written = JSON.parse(storage.getItem(HANGAR_PROGRESS_KEY));
  assert.equal(written.runContracts.completed.boss_breaker.count, 1, 'hangar profile should persist order completions');

  const normalized = normalizeRunContractsState({
    activeIds: ['unknown', 'support_hunter', 'support_hunter'],
    completed: {
      missing: { id: 'missing', count: 99 },
      support_hunter: { id: 'support_hunter', count: 1 }
    }
  });
  assert.deepEqual(normalized.activeIds, [
    'support_hunter',
    'graze_10',
    'boss_breaker'
  ], 'normalization should drop invalid/duplicate ids and refill active slots');

  const legacyOpeningState = normalizeRunContractsState({
    version: RUN_CONTRACTS_VERSION - 1,
    activeIds: ['graze_break_drill', 'support_hunter', 'slow_mo_finisher'],
    progress: {
      graze_break_drill: { id: 'graze_break_drill', progress: 2, target: 3 }
    }
  });
  assert.deepEqual(legacyOpeningState.activeIds, FIRST_THREE, 'older unfinished starter saves should move to the easier opening ladder');
  assert.equal(legacyOpeningState.progress.graze_break_drill, undefined, 'old Graze partial progress should not become misleading Graze Break progress');

  const oldCatalogIds = [
    'boss_breaker',
    'near_miss_streak',
    'enemy_sweep_1000',
    'support_hunter',
    'phase_runner',
    'blink_control',
    'slow_mo_finisher',
    'sector_10_signal',
    'enemy_sweep_2500',
    'boss_hunter_10',
    'support_hunter_10',
    'enemy_variety_50',
    'enemy_sweep_10000',
    'pilot_rank_5',
    'boss_hunter_50',
    'support_hunter_50',
    'enemy_variety_100',
    'enemy_sweep_25000',
    'boss_hunter_100',
    'support_hunter_100'
  ];
  const expandedCompleteState = normalizeRunContractsState({
    version: RUN_CONTRACTS_VERSION - 1,
    activeIds: FIRST_THREE,
    completedIds: oldCatalogIds,
    completed: Object.fromEntries(oldCatalogIds.map((id) => [id, completion(id)])),
    completionNoticeSeen: true
  });
  assert.equal(expandedCompleteState.completedIds.length, oldCatalogIds.length, 'catalog expansion should preserve old completed orders');
  assert.equal(expandedCompleteState.allCompletedAt, null, 'expanded catalog should no longer count old all-complete saves as finished');
  assert.equal(expandedCompleteState.completionNoticeSeen, false, 'catalog expansion should let the final completion notice show again after new orders');
  assertDistinctActiveGroups(expandedCompleteState, 'expanded catalog active orders');
  assert.ok(expandedCompleteState.activeIds.some((id) => !oldCatalogIds.includes(id)), 'expanded catalog should surface newly added unfinished orders');
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available run-contract check port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForMenu(page) {
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 30000 });
}

async function seedMenuProfile(page, runContracts, uiScale, { showPilotOrders = null, hangarPatch = null } = {}) {
  await page.evaluate(({
    key,
    showPilotOrdersKey,
    runContracts: seededRunContracts,
    uiScale: seededUiScale,
    showPilotOrders: seededShowPilotOrders,
    hangarPatch: seededHangarPatch
  }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova_ui_scale_v1', String(seededUiScale));
    if (seededShowPilotOrders !== null) {
      localStorage.setItem(showPilotOrdersKey, seededShowPilotOrders ? '1' : '0');
    }
    if (seededRunContracts || seededHangarPatch) {
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        ...(seededHangarPatch || {}),
        ...(seededRunContracts ? { runContracts: seededRunContracts } : {})
      }));
    }
  }, {
    key: HANGAR_PROGRESS_KEY,
    showPilotOrdersKey: SHOW_PILOT_ORDERS_KEY,
    runContracts,
    uiScale,
    showPilotOrders,
    hangarPatch
  });
}

async function captureMenuProof(page, {
  label,
  width,
  height,
  uiScale = 1,
  runContracts = null,
  showPilotOrders = null,
  hangarPatch = null,
  expectedStatus = 'active',
  expectedDisabledBySetting = null,
  waitMs = 2400
}) {
  await page.setViewportSize({ width, height });
  await seedMenuProfile(page, runContracts, uiScale, { showPilotOrders, hangarPatch });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForMenu(page);
  await page.waitForTimeout(waitMs);
  const state = await readState(page);
  const screenshot = path.join(outputDir, `${label}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  assertPilotOrdersLayout(state.menu, expectedStatus, { expectedDisabledBySetting });
  return {
    label,
    width,
    height,
    uiScale,
    screenshot,
    focusedOption: state.menu?.focusedOption || null,
    state
  };
}

function assertInside(bounds, screen, label) {
  assert.ok(bounds?.width > 0 && bounds?.height > 0, `${label}: missing bounds`);
  const right = bounds.right ?? bounds.x + bounds.width;
  const bottom = bounds.bottom ?? bounds.y + bounds.height;
  assert.ok(bounds.x >= -2, `${label}: left edge offscreen`);
  assert.ok(bounds.y >= -2, `${label}: top edge offscreen`);
  assert.ok(right <= screen.width + 2, `${label}: right edge offscreen`);
  assert.ok(bottom <= screen.height + 2, `${label}: bottom edge offscreen`);
}

function boundsOverlap(a, b, pad = 0) {
  if (!a || !b) return false;
  return !(
    a.x + a.width + pad <= b.x
    || b.x + b.width + pad <= a.x
    || a.y + a.height + pad <= b.y
    || b.y + b.height + pad <= a.y
  );
}

function assertPilotOrdersLayout(menu, expectedStatus = 'active', { expectedDisabledBySetting = null } = {}) {
  const screen = menu?.screen;
  const board = menu?.missionBoard;
  assert.ok(screen?.width > 0 && screen?.height > 0, 'menu screen bounds should be exposed');
  assert.match(menu?.missionBriefing?.title || '', /^RUN MODES \/\/ /, 'run mode panel should avoid Mission wording repetition');
  assert.equal(board?.status, expectedStatus);
  if (expectedDisabledBySetting !== null) {
    assert.equal(board?.disabledBySetting, expectedDisabledBySetting, 'Pilot Orders hidden reason should match expectation');
  }

  if (expectedStatus === 'hidden') {
    assert.equal(board?.hidden, true, 'completed Pilot Orders board should be hidden after notice is seen');
    assert.equal(board?.rows?.length, 0, 'hidden Pilot Orders board should expose no visible rows');
    return;
  }

  assertInside(board.bounds, screen, 'Pilot Orders');
  assertInside(board.titleBounds, screen, 'Pilot Orders title');
  assertInside(board.subtitleBounds, screen, 'Pilot Orders subtitle');
  assert.ok(Math.abs(board.bounds.x - menu.launchDeck.bounds.x) <= 2, 'Pilot Orders should align with launch deck x');
  assert.ok(Math.abs(board.bounds.width - menu.launchDeck.bounds.width) <= 8, 'Pilot Orders should align with launch deck width');
  assert.ok(board.bounds.y >= menu.launchDeck.bounds.bottom - 6, 'Pilot Orders should sit below the launch deck');
  assert.ok(board.bounds.bottom <= menu.panel.y + 6, 'Pilot Orders should stay above the utility dock');

  if (expectedStatus === 'complete') {
    assert.equal(board.title, 'PILOT ORDERS COMPLETE');
    assert.equal(board.subtitle, 'All starter combat goals cleared.');
    assert.equal(board.rows.length, 0, 'complete notice should not show active rows');
    return;
  }

  assert.match(board?.title || '', /^PILOT ORDERS [0-9,]+\/[0-9,]+$/);
  assert.equal(board?.subtitle, 'Review cleared orders in Ship Hangar.');
  assert.equal(board?.rows?.length, 3, 'Pilot Orders should show exactly three active rows');
  assert.equal(new Set(board.rows.map((row) => row.group)).size, board.rows.length, 'Pilot Orders should not show two similar order groups at once');
  for (const row of board.rows) {
    assertInside(row.bounds, screen, `${row.id} row`);
    assertInside(row.titleBounds, screen, `${row.id} title`);
    assertInside(row.detailBounds, screen, `${row.id} detail`);
    assertInside(row.progressBounds, screen, `${row.id} progress`);
    assert.ok(!boundsOverlap(row.titleBounds, row.detailBounds, 0), `${row.id} title/detail text should not overlap`);
    assert.ok(!boundsOverlap(row.titleBounds, row.progressBounds, 2), `${row.id} title/progress text should not overlap`);
    assert.ok(!boundsOverlap(row.detailBounds, row.progressBounds, 2), `${row.id} detail/progress text should not overlap`);
    assert.equal(row.detail, ACTIVE_DESCRIPTIONS[row.id], `${row.id} should show its starter goal description`);
    assert.match(row.progress, /^(COMPLETE|[0-9,]+\/[0-9,]+)$/, `${row.id} should show clear progress`);
    assert.ok(Number(row.progressRatio) >= 0 && Number(row.progressRatio) <= 1, `${row.id} should expose a bounded visual progress ratio`);
  }
}

async function runBrowserSmoke() {
  const server = await startDevServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  try {
    await page.goto(`${baseUrl}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__game && window.render_game_to_text), null, { timeout: 30000 });
    mkdirSync(outputDir, { recursive: true });

    const activeState = runContractState();
    const completedOrderState = runContractState({ completedIds: ['graze_10'] });
    const completedReviewState = runContractState({ completedIds: ['boss_breaker', 'enemy_sweep_1000', 'enemy_sweep_2500'] });
    const completeNoticeState = runContractState({ completedIds: RUN_CONTRACT_ORDER_IDS, completionNoticeSeen: false });
    const hiddenState = runContractState({ completedIds: RUN_CONTRACT_ORDER_IDS, completionNoticeSeen: true });
    const finalRunState = runContractState({
      activeIds: ['enemy_sweep_2500'],
      completedIds: RUN_CONTRACT_ORDER_IDS.filter((id) => id !== 'enemy_sweep_2500'),
      completionNoticeSeen: false
    });

    const activeProof = await captureMenuProof(page, {
      label: 'pilot-orders-active-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: activeState,
      expectedStatus: 'active'
    });
    assert.deepEqual(activeProof.state.menu.missionBoard.rows.map((row) => row.id), FIRST_THREE);
    assert.deepEqual(activeProof.state.menu.missionBoard.rows.map((row) => row.progress), ['0/10', '0/1', '0/1,000']);
    assert.match(activeProof.state.menu.missionBriefing.body || '', /PILOT ORDERS 0\/50: Graze x10 0\/10/, 'Mayhem briefing should surface the next active Pilot Order');

    await seedMenuProfile(page, activeState, 1);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForMenu(page);
    await page.evaluate(() => window.__game?.scenes?.menu?.openSettingsOverlay?.());
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.overlays?.settings === true && state.settingsOverlay?.display?.showPilotOrders === true;
    }, null, { timeout: 10000 });
    const settingsState = await readState(page);
    assert.equal(settingsState.settingsOverlay?.display?.showPilotOrdersLabel, 'ON', 'settings toggle should default on for unfinished fresh players');
    const settingsScreenshot = path.join(outputDir, 'pilot-orders-settings-toggle.png');
    await page.screenshot({ path: settingsScreenshot, fullPage: true });
    await page.evaluate(() => window.__game?.scenes?.menu?.closeSettingsOverlay?.());
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').overlays?.settings !== true, null, { timeout: 10000 });

    const steamDeckProof = await captureMenuProof(page, {
      label: 'pilot-orders-steam-deck',
      width: 1280,
      height: 800,
      uiScale: 1,
      runContracts: activeState,
      expectedStatus: 'active'
    });

    const largeUiProof = await captureMenuProof(page, {
      label: 'pilot-orders-1080p-ui150',
      width: 1920,
      height: 1080,
      uiScale: 1.5,
      runContracts: activeState,
      expectedStatus: 'active'
    });

    const settingHiddenProof = await captureMenuProof(page, {
      label: 'pilot-orders-hidden-by-setting-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: activeState,
      showPilotOrders: false,
      expectedStatus: 'hidden',
      expectedDisabledBySetting: true
    });

    const veteranHiddenProof = await captureMenuProof(page, {
      label: 'pilot-orders-veteran-default-hidden-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: activeState,
      hangarPatch: { bestSector: 10, bestLevel: 10, totalRuns: 8 },
      expectedStatus: 'hidden',
      expectedDisabledBySetting: true
    });

    const completedProof = await captureMenuProof(page, {
      label: 'pilot-orders-completed-order-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: completedOrderState,
      expectedStatus: 'active'
    });
    assert.equal(completedProof.state.menu.missionBoard.rows[0].progress, 'COMPLETE');
    assert.equal(completedProof.state.menu.missionBoard.rows[0].progressRatio, 1, 'completed Pilot Order row should expose a full progress meter');

    const completeProof = await captureMenuProof(page, {
      label: 'pilot-orders-complete-state-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: completeNoticeState,
      expectedStatus: 'complete'
    });
    assert.equal(completeProof.state.menu.missionBoard.completionNoticePending, true, 'complete notice should wait to be acknowledged until visible');

    const hiddenProof = await captureMenuProof(page, {
      label: 'pilot-orders-hidden-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: hiddenState,
      expectedStatus: 'hidden'
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await seedMenuProfile(page, completedReviewState, 1);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForMenu(page);
    await page.evaluate(async () => {
      await window.__game?.showShipSelect?.();
    });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'shipSelect', null, { timeout: 30000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__game?.scenes?.shipSelect?.openCareerInfoOverlay?.('check'));
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.shipSelect?.careerInfo?.visible === true
        && state.shipSelect?.careerInfo?.pilotOrdersArchive?.completedCount === 3;
    }, null, { timeout: 10000 });
    const hangarReviewState = await readState(page);
    const archive = hangarReviewState.shipSelect?.careerInfo?.pilotOrdersArchive;
    assert.equal(archive?.total, RUN_CONTRACT_ORDER_IDS.length, 'Hangar review should expose the full finite order count');
    assert.equal(archive?.activeCount, 1, 'Hangar review should show active unfinished Pilot Orders');
    assert.ok(archive?.nextCount >= 1, 'Hangar review should expose at least one queued Pilot Order');
    assert.match(archive?.text || '', /ACTIVE Graze x10 0\/10/, 'Hangar review should list active Pilot Orders with progress');
    assert.match(archive?.text || '', /NEXT Support Hunter 0\/2/, 'Hangar review should list the next queued Pilot Order');
    assert.match(archive?.text || '', /Boss Breaker/, 'Hangar review should list completed Boss Breaker');
    assert.match(archive?.text || '', /1000 Enemies/, 'Hangar review should list completed 1000 Enemies');
    assert.match(archive?.text || '', /2500 Enemies/, 'Hangar review should list completed 2500 Enemies');
    assertInside(archive?.bounds, { width: 1280, height: 720 }, 'Pilot Orders archive');
    const hangarReviewScreenshot = path.join(outputDir, 'pilot-orders-hangar-completed-review.png');
    await page.screenshot({ path: hangarReviewScreenshot, fullPage: true });

    const autoHiddenProof = await captureMenuProof(page, {
      label: 'pilot-orders-hidden-after-completion-notice',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: completeNoticeState,
      expectedStatus: 'hidden',
      waitMs: 4400
    });
    assert.equal(autoHiddenProof.state.menu.missionBoard.completionNoticeSeen, true, 'visible completion notice should be marked seen before hiding');

    await page.setViewportSize({ width: 1280, height: 720 });
    await seedMenuProfile(page, finalRunState, 1);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForMenu(page);
    await page.waitForTimeout(500);

    await page.evaluate(async () => {
      window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
      await window.__game?.startGame?.(undefined, { runMode: 'ranked' });
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'play' && Boolean(window.__game?.scenes?.play?.emitRunContractEvent);
    }, null, { timeout: 30000 });

    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return (state.toast?.active || []).some((toast) => toast.type === 'runContractStart');
    }, null, { timeout: 7000 });
    const startNudgeState = await readState(page);
    const startNudge = (startNudgeState.toast?.active || []).find((toast) => toast.type === 'runContractStart');
    assert.match(startNudge?.message || '', /PILOT ORDERS 49\/50: 2500 Enemies 0\/2,500/, 'run start should nudge the first active Pilot Order with track progress');
    const startNudgeScreenshot = path.join(outputDir, 'pilot-orders-run-start-nudge.png');
    await page.screenshot({ path: startNudgeScreenshot, fullPage: true });
    await page.waitForTimeout(2700);

    await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      play.emitRunContractEvent('enemy_defeated', { sector: window.__game?.level || 1, count: 625 });
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return (state.toast?.active || []).some((toast) => String(toast.message || '').includes('ORDER PROGRESS'));
    }, null, { timeout: 5000 });
    const progressResult = await page.evaluate(() => {
      const textState = JSON.parse(window.render_game_to_text?.() || '{}');
      return {
        runContracts: textState.runContracts,
        toastActive: textState.toast?.active || [],
        pauseOverlay: textState.pauseOverlay || null
      };
    });
    const progressSweep = progressResult.runContracts?.active?.find((item) => item.id === 'enemy_sweep_2500');
    assert.equal(progressSweep?.progress, 625, 'in-run 2500 Enemies order should show partial progress');
    assert.equal(progressResult.runContracts?.progressThisRun?.[0]?.progress, 625, 'partial Pilot Orders progress should be exposed for run report state');
    const progressToast = progressResult.toastActive.find((toast) => String(toast.message || '').includes('ORDER PROGRESS'));
    assert.equal(progressToast?.slot, 'top', 'progress toast should use the top queue');
    assert.equal(progressToast?.type, 'runContractProgress', 'progress toast should expose the runContractProgress type');
    assert.ok(progressToast?.duration >= 2000, 'progress toast should stay visible long enough to notice');
    const progressToastScreenshot = path.join(outputDir, 'pilot-order-progress-toast.png');
    await page.screenshot({ path: progressToastScreenshot, fullPage: true });

    await page.evaluate(() => {
      window.__game?.scenes?.play?.setPaused?.(true);
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.isPaused && state.pauseOverlay?.visible === true;
    }, null, { timeout: 5000 });
    const pauseState = await readState(page);
    assert.match(pauseState.pauseOverlay?.pilotOrders || '', /2500 Enemies/, 'pause overlay should show the active Pilot Order');
    assert.match(pauseState.pauseOverlay?.pilotOrders || '', /PILOT ORDERS 49\/50/, 'pause overlay should show Pilot Orders track progress');
    assert.match(pauseState.pauseOverlay?.pilotOrders || '', /625\/2,500/, 'pause overlay should show active Pilot Order progress');
    const pauseScreenshot = path.join(outputDir, 'pilot-orders-pause-line.png');
    await page.screenshot({ path: pauseScreenshot, fullPage: true });
    await page.evaluate(() => {
      window.__game?.scenes?.play?.setPaused?.(false);
    });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').isPaused === false, null, { timeout: 5000 });

    await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      play.emitRunContractEvent('enemy_defeated', { sector: window.__game?.level || 1, count: 2500 });
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return (state.toast?.active || []).some((toast) => String(toast.message || '').includes('ORDER COMPLETE'));
    }, null, { timeout: 5000 });
    const completionResult = await page.evaluate(() => {
      const textState = JSON.parse(window.render_game_to_text?.() || '{}');
      const profile = JSON.parse(localStorage.getItem('nova.hangarProgress.v1') || '{}');
      return {
        runContracts: textState.runContracts,
        toastActive: textState.toast?.active || [],
        toastMessages: (textState.toast?.active || []).map((toast) => toast.message),
        savedRunContracts: profile.runContracts || null
      };
    });
    const sweep = completionResult.runContracts?.active?.find((item) => item.id === 'enemy_sweep_2500');
    assert.equal(sweep?.progress, 2500, 'in-run 2500 Enemies order should reach target');
    assert.equal(sweep?.completed, true, 'in-run 2500 Enemies order should mark complete');
    assert.equal(completionResult.runContracts?.allCompleteThisRun, true, 'final order completion should be exposed to run report state');
    assert.equal(
      completionResult.savedRunContracts?.completed?.enemy_sweep_2500?.count,
      1,
      'completion should persist to hangar profile'
    );
    assert.ok(
      completionResult.toastMessages.some((message) => message.includes('ORDER COMPLETE: 2500 Enemies')),
      'completion toast should be visible through text state'
    );
    assert.ok(
      completionResult.toastMessages.some((message) => message.includes('PILOT ORDERS 50/50')),
      'completion toast should include the Pilot Orders track progress'
    );
    const orderToast = completionResult.toastActive.find((toast) => String(toast.message || '').includes('ORDER COMPLETE'));
    assert.equal(orderToast?.slot, 'top', 'completion toast should use the top queue instead of the crowded corner');
    assert.equal(orderToast?.type, 'runContract', 'completion toast should expose the runContract type');
    assert.ok(orderToast?.duration >= 3200, 'completion toast should stay visible long enough to notice');

    await page.waitForTimeout(250);
    const playScreenshot = path.join(outputDir, 'pilot-order-complete-play.png');
    await page.screenshot({ path: playScreenshot, fullPage: true });

    await page.evaluate(() => {
      const game = window.__game;
      game.score = Math.max(game.score || 0, 12345);
      game.gameOver();
    });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'gameOver', null, { timeout: 30000 });
    await page.evaluate(() => {
      window.__game?.scenes?.gameOver?.openRunReport?.();
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'gameOver' && state.gameOver?.runReportOverlay?.visible === true;
    }, null, { timeout: 10000 });
    const reportState = await readState(page);
    assert.match(reportState.gameOver?.runReportOverlay?.text || '', /Pilot orders: PILOT ORDERS COMPLETE\s+PILOT ORDERS 50\/50\s+2500 Enemies/);
    const reportScreenshot = path.join(outputDir, 'pilot-orders-run-report.png');
    await page.screenshot({ path: reportScreenshot, fullPage: true });

    const report = {
      ok: pageErrors.length === 0 && consoleErrors.length === 0,
      baseUrl,
      activeRows: activeProof.state.menu.missionBoard.rows.map((row) => ({
        id: row.id,
        title: row.title,
        detail: row.detail,
        progress: row.progress,
        bounds: row.bounds
      })),
      completionResult,
      runReportText: reportState.gameOver?.runReportOverlay?.text || '',
      pageErrors,
      consoleErrors,
      screenshots: {
        activeMenu: activeProof.screenshot,
        settingsToggle: settingsScreenshot,
        steamDeckMenu: steamDeckProof.screenshot,
        largeUiMenu: largeUiProof.screenshot,
        hiddenBySettingMenu: settingHiddenProof.screenshot,
        veteranDefaultHiddenMenu: veteranHiddenProof.screenshot,
        completedOrderMenu: completedProof.screenshot,
        completeStateMenu: completeProof.screenshot,
        hiddenMenu: hiddenProof.screenshot,
        hangarCompletedReview: hangarReviewScreenshot,
        hiddenAfterCompletionNotice: autoHiddenProof.screenshot,
        runStartNudge: startNudgeScreenshot,
        progressToast: progressToastScreenshot,
        pauseOrdersLine: pauseScreenshot,
        playToast: playScreenshot,
        runReport: reportScreenshot
      }
    };
    writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    assert.deepEqual(pageErrors, [], 'browser page errors should be empty');
    assert.deepEqual(consoleErrors, [], 'browser console errors should be empty');
    console.log(`[run-contracts] PASS active=${activeProof.screenshot} toast=${playScreenshot} report=${reportScreenshot}`);
    return report;
  } finally {
    await browser.close();
    if (server) server.kill();
  }
}

runCatalogAndSaveTests();
await runBrowserSmoke();
