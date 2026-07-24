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
  RUN_CONTRACT_REWARDS_ENABLED,
  RUN_CONTRACTS_VERSION,
  RUN_CONTRACT_ORDER_IDS,
  acknowledgeRunContractCompletionNotice,
  applyRunContractEvent,
  getDefaultShowPilotOrders,
  getRunContractCatalog,
  getRunContractCompletionReviewState,
  getRunContractMenuState,
  getRunContractReward,
  getRunContractRewardXpForRun,
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
const ACTIVE_HOW_TO = Object.fromEntries(
  getRunContractMenuState(runContractState()).active.map((contract) => [contract.id, contract.howTo])
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
  assert.equal(menuState.progressLabel, '0', 'public Pilot Orders progress should reveal completed orders without exposing the catalog total');
  assert.equal(menuState.completedCount, 0);
  assert.equal(menuState.total, 50);
  assert.equal(menuState.subtitle, 'Learn key Mayhem tactics.');
  assert.equal(menuState.status, 'active');
  assert.equal(menuState.active.length, 3, 'menu state should expose three active orders');
  assert.deepEqual(menuState.active.map((entry) => entry.orderSlot), ['01', '02', '03'], 'menu state should expose order numbers without the catalog total');
  assert.equal(menuState.next?.[0]?.id, 'support_hunter', 'menu state should expose the next queued Pilot Order after active slots');
  assert.equal(menuState.next?.[0]?.orderSlot, '04', 'menu state should expose queued order numbers without the catalog total');
  assert.equal(RUN_CONTRACT_REWARDS_ENABLED, true, 'Pilot Order rewards should be enabled for retention patch');
  assert.equal(menuState.rewardsEnabled, true, 'menu state should advertise enabled rewards');
  assert.equal(menuState.active[0]?.reward?.pilotXp, 175, 'first Pilot Order should expose a Career XP reward');
  assert.equal(menuState.active[1]?.reward?.pilotXp, 180, 'second Pilot Order should scale its Career XP reward');
  assert.equal(getRunContractReward('graze_10')?.label, '+175 Career XP', 'reward helper should format first order Career XP');
  assert.equal(getRunContractRewardXpForRun({ completedThisRun: [{ id: 'graze_10' }, { id: 'graze_10' }] }), 175, 'run reward XP should dedupe repeated completion entries');
  const completedSubtitleState = getRunContractMenuState(completeIds(migrated.runContracts, ['graze_10']));
  assert.equal(completedSubtitleState.subtitle, 'Review cleared orders in Ship Hangar.', 'completed Pilot Orders should point players to Ship Hangar review');
  const disabledMenuState = getRunContractMenuState(migrated, { showPilotOrders: false });
  assert.equal(disabledMenuState.status, 'hidden', 'settings toggle should hide unfinished Pilot Orders');
  assert.equal(disabledMenuState.disabledBySetting, true, 'hidden unfinished board should identify the toggle as the reason');
  assert.equal(getDefaultShowPilotOrders({ bestSector: 1, totalRuns: 0 }), true, 'fresh profiles should show Pilot Orders by default');
  assert.equal(getDefaultShowPilotOrders({ bestSector: 10 }), true, 'unfinished Pilot Orders should remain visible for mature profiles by default');

  const modeEligibilityState = runContractState({
    activeIds: FIRST_THREE,
    completedIds: ['graze_10']
  });
  for (const runMode of [RUN_MODES.RANKED, RUN_MODES.MAYHEM_TACTICAL]) {
    const eligibleSession = startRunContractSession({
      runMode,
      progress: { runContracts: modeEligibilityState }
    });
    assert.equal(
      eligibleSession.active.some((item) => item.id === 'graze_10'),
      false,
      `${runMode} should rotate cleared Pilot Orders before the run starts`
    );
    const bossOrder = findSessionItem(eligibleSession, 'boss_breaker');
    assert.equal(bossOrder?.eligible, true, `${runMode} should make Pilot Orders eligible`);
    const bossResult = applyRunContractEvent(eligibleSession, { type: 'boss_defeated', sector: 2 });
    assert.deepEqual(
      bossResult.completed.map((entry) => entry.id),
      ['boss_breaker'],
      `${runMode} should progress and complete eligible Pilot Orders`
    );
  }
  for (const runMode of [RUN_MODES.SCOUT, RUN_MODES.SECTOR_START]) {
    const excludedSession = startRunContractSession({
      runMode,
      progress: { runContracts: modeEligibilityState }
    });
    assert.equal(
      excludedSession.active.some((item) => item.id === 'graze_10'),
      true,
      `${runMode} should not prepare or rotate Pilot Orders`
    );
    const bossOrder = findSessionItem(excludedSession, 'boss_breaker');
    assert.equal(bossOrder?.eligible, false, `${runMode} should keep Pilot Orders ineligible`);
    const bossResult = applyRunContractEvent(excludedSession, { type: 'boss_defeated', sector: 2 });
    assert.equal(bossResult.completed.length, 0, `${runMode} should not progress Pilot Orders`);
    assert.equal(
      findSessionItem(bossResult.session, 'boss_breaker')?.progress,
      0,
      `${runMode} should leave excluded Pilot Order progress unchanged`
    );
  }

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
  assert.equal(grazeResult.completed[0]?.reward?.pilotXp, 175, 'completion payload should carry Career XP reward');

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

  const savedPartialOrders = normalizeRunContractsState({
    activeIds: ['near_miss_streak', 'support_hunter', 'enemy_sweep_2500'],
    progress: {
      near_miss_streak: {
        id: 'near_miss_streak',
        progress: 3,
        target: 5,
        updatedAt: '2026-07-09T12:00:00.000Z',
        lastRunMode: RUN_MODES.RANKED,
        lastSector: 1
      },
      support_hunter: {
        id: 'support_hunter',
        progress: 1,
        target: 2,
        updatedAt: '2026-07-09T12:00:00.000Z',
        lastRunMode: RUN_MODES.RANKED,
        lastSector: 2
      },
      enemy_sweep_2500: {
        id: 'enemy_sweep_2500',
        progress: 723,
        target: 2500,
        updatedAt: '2026-07-09T12:00:00.000Z',
        lastRunMode: RUN_MODES.RANKED,
        lastSector: 4
      }
    }
  });
  const savedNearMissMenuEntry = getRunContractMenuState(savedPartialOrders).active.find((entry) => entry.id === 'near_miss_streak');
  assert.equal(savedNearMissMenuEntry.progress, 3, 'near-miss saved menu progress should start at 3/5');
  const seededPartialSession = startRunContractSession({
    runMode: RUN_MODES.RANKED,
    progress: { runContracts: savedPartialOrders }
  });
  assert.equal(findSessionItem(seededPartialSession, 'near_miss_streak').progress, 3, 'near-miss session progress should seed from the menu value');
  const tacticalNearMissSession = startRunContractSession({
    runMode: RUN_MODES.MAYHEM_TACTICAL,
    progress: { runContracts: savedPartialOrders }
  });
  const tacticalNearMissFour = applyRunContractEvent(tacticalNearMissSession, {
    type: 'near_miss',
    streak: 4,
    sector: 1
  });
  assert.equal(
    findSessionItem(tacticalNearMissFour.session, 'near_miss_streak').progress,
    4,
    'Mayhem Tactical near-miss streak should advance saved 3/5 progress to 4/5'
  );
  const tacticalNearMissSeven = applyRunContractEvent(tacticalNearMissFour.session, {
    type: 'near_miss',
    streak: 7,
    sector: 1
  });
  assert.deepEqual(
    tacticalNearMissSeven.completed.map((entry) => entry.id),
    ['near_miss_streak'],
    'Mayhem Tactical 7x near-miss streak should complete the saved 3/5 order'
  );
  assert.equal(findSessionItem(seededPartialSession, 'support_hunter').progress, 1, 'saved multi-count orders should seed from the menu value');
  const lowerNearMissSession = {
    ...seededPartialSession,
    active: seededPartialSession.active.map((item) => (
      item.id === 'near_miss_streak' ? { ...item, progress: 1, lastSector: 1 } :
        item.id === 'support_hunter' ? { ...item, progress: 0, lastSector: 1 } :
          item
    ))
  };
  const recordedNearMiss = recordRunContractSessionProgress(savedPartialOrders, lowerNearMissSession);
  assert.equal(
    getRunContractMenuState(recordedNearMiss).active.find((entry) => entry.id === 'near_miss_streak').progress,
    3,
    'near-miss saved menu progress must not regress from 3/5 to 1/5 after a run'
  );
  assert.equal(
    getRunContractMenuState(recordedNearMiss).active.find((entry) => entry.id === 'support_hunter').progress,
    1,
    'saved multi-count order progress must not regress when a later session reports a lower value'
  );
  const lowerCountSession = {
    ...seededPartialSession,
    active: seededPartialSession.active.map((item) => (
      item.id === 'enemy_sweep_2500' ? { ...item, progress: 728, lastSector: 5 } : item
    ))
  };
  const recordedCount = recordRunContractSessionProgress(savedPartialOrders, lowerCountSession);
  assert.equal(
    getRunContractMenuState(recordedCount).active.find((entry) => entry.id === 'enemy_sweep_2500').progress,
    728,
    'counting orders should still advance when the current run exceeds the saved value'
  );
  const staleCountSession = {
    ...seededPartialSession,
    active: seededPartialSession.active.map((item) => (
      item.id === 'enemy_sweep_2500' ? { ...item, progress: 700, lastSector: 5 } : item
    ))
  };
  const recordedStaleCount = recordRunContractSessionProgress(savedPartialOrders, staleCountSession);
  assert.equal(
    getRunContractMenuState(recordedStaleCount).active.find((entry) => entry.id === 'enemy_sweep_2500').progress,
    723,
    'saved counting order progress must not regress when a stale session reports a lower value'
  );

  const blinkResult = applyRunContractEvent(sessionFor(['blink_control']), { type: 'blink_drive_survived', survivedSeconds: 6, sector: 1 });
  assert.deepEqual(blinkResult.completed.map((entry) => entry.id), ['blink_control']);

  const powerupTotal = applyEvents(sessionFor(['powerup_collector_10']), Array.from({ length: 10 }, () => ({ type: 'powerup_collected', powerupType: 'shield', sector: 2 })));
  assert.deepEqual(powerupTotal.completed.map((entry) => entry.id), ['powerup_collector_10']);
  const inactivePowerups = applyEvents(
    sessionFor(FIRST_THREE),
    Array.from({ length: 10 }, () => ({ type: 'powerup_collected', powerupType: 'shield', sector: 2 }))
  );
  assert.equal(inactivePowerups.completed.length, 0, 'non-active powerup orders must not complete from powerup pickups');
  assert.equal(findSessionItem(inactivePowerups.session, 'powerup_collector_10'), undefined, 'non-active powerup orders must not enter the current run session');
  const inactivePowerupSave = recordRunContractSessionProgress(runContractState(), inactivePowerups.session);
  assert.equal(inactivePowerupSave.progress.powerup_collector_10, undefined, 'non-active powerup orders must not persist progress');
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
  assert.equal(pilotOrdersRow?.value?.[0]?.orderSlot, '03', 'run report should keep the progressed order number without the catalog total');
  assert.equal(pilotOrdersRow?.value?.[0]?.progress, 500);
  assert.equal(pilotOrdersRow?.value?.[1]?.type, 'pilotOrderNext', 'run report should expose the next queued Pilot Order');
  assert.equal(pilotOrdersRow?.value?.[1]?.title, 'Support Hunter');
  assert.equal(pilotOrdersRow?.value?.[1]?.orderSlot, '04', 'run report should keep the next order number without the catalog total');
  const completionReport = createRunReport({
    runMode: RUN_MODES.RANKED,
    runContracts: {
      progressLabel: '1',
      completedThisRun: [{
        id: 'graze_10',
        shortTitle: 'Graze x10'
      }],
      next: [{
        id: 'support_hunter',
        shortTitle: 'Support Hunter',
        progress: 0,
        target: 2
      }]
    }
  });
  const completionPilotOrdersRow = completionReport.sections
    .find((section) => section.id === 'rewards')
    ?.rows.find((row) => row.id === 'pilotOrders');
  assert.equal(completionPilotOrdersRow?.value?.[0]?.type, 'pilotOrderTrack', 'run report should keep structured track progress after a completion');
  assert.equal(completionPilotOrdersRow?.value?.[0]?.progressLabel, '1', 'run report should keep the completed count without exposing the catalog total');
  assert.equal(completionPilotOrdersRow?.value?.[1]?.type, 'pilotOrderDone', 'run report should keep completed order entries structured');
  assert.equal(completionPilotOrdersRow?.value?.[1]?.title, 'Graze x10', 'run report should keep the completed order title');
  assert.equal(completionPilotOrdersRow?.value?.[1]?.orderSlot, '01', 'run report should keep completed order number without the catalog total');
  assert.equal(completionPilotOrdersRow?.value?.[1]?.reward?.pilotXp, 175, 'run report should expose completed order reward XP');
  assert.equal(completionPilotOrdersRow?.value?.[1]?.rewardXp, 175, 'run report should expose completed order reward XP as a numeric summary');
  assert.equal(completionPilotOrdersRow?.value?.[2]?.type, 'pilotOrderNext', 'run report should reserve room for the next queued order after a completion');
  assert.equal(completionPilotOrdersRow?.value?.[2]?.title, 'Support Hunter');
  assert.equal(completionPilotOrdersRow?.value?.[2]?.orderSlot, '04', 'run report should keep next-order number without the catalog total');
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

  const inactiveCareerSession = startRunContractSession({
    runMode: RUN_MODES.RANKED,
    progress: {
      runContracts: normalizeRunContractsState({
        activeIds: ['graze_10', 'boss_breaker', 'phase_runner']
      })
    }
  });
  const inactiveCareerEvents = applyEvents(inactiveCareerSession, [
    { type: 'enemy_defeated', sector: 2, count: 400, enemyType: 'career_scout' },
    { type: 'enemy_defeated', sector: 2, count: 600, enemyType: 'career_diver' },
    { type: 'boss_defeated', sector: 2 },
    { type: 'run_started', sector: 2 }
  ]);
  const inactiveCareerSaved = recordRunContractSessionProgress(
    normalizeRunContractsState({ activeIds: ['graze_10', 'boss_breaker', 'phase_runner'] }),
    inactiveCareerEvents.session
  );
  const inheritedCareerSession = startRunContractSession({
    runMode: RUN_MODES.RANKED,
    progress: {
      runContracts: normalizeRunContractsState({
        ...inactiveCareerSaved,
        activeIds: ['enemy_sweep_2500', 'enemy_variety_50', 'boss_hunter_10']
      })
    }
  });
  assert.equal(
    findSessionItem(inheritedCareerSession, 'enemy_sweep_2500').progress,
    1000,
    'inactive cumulative enemy defeats should seed a later enemy-sweep order'
  );
  assert.equal(
    findSessionItem(inheritedCareerSession, 'enemy_variety_50').progress,
    2,
    'inactive unique enemy defeats should seed a later variety order'
  );
  assert.equal(
    findSessionItem(inheritedCareerSession, 'boss_hunter_10').progress,
    1,
    'inactive boss defeats should seed a later boss-hunter order'
  );

  const migratedCareerSession = startRunContractSession({
    runMode: RUN_MODES.RANKED,
    progress: {
      totalRuns: 46,
      totalBossesDefeated: 88,
      runContracts: normalizeRunContractsState({
        activeIds: ['ranked_regular_10', 'enemy_sweep_25000', 'boss_hunter_100'],
        completed: {
          enemy_sweep_1000: completion('enemy_sweep_1000'),
          enemy_sweep_2500: completion('enemy_sweep_2500'),
          enemy_sweep_10000: completion('enemy_sweep_10000'),
          enemy_variety_50: completion('enemy_variety_50')
        }
      })
    }
  });
  assert.equal(
    findSessionItem(migratedCareerSession, 'ranked_regular_10').progress,
    10,
    'saved career run totals should backfill the late Mayhem-start order'
  );
  assert.equal(
    findSessionItem(migratedCareerSession, 'enemy_sweep_25000').progress,
    10000,
    'completed enemy-sweep tiers should backfill the late 25000-enemy order'
  );
  assert.equal(
    findSessionItem(migratedCareerSession, 'boss_hunter_100').progress,
    88,
    'saved career boss totals should backfill the late 100-boss order'
  );
  const migratedVarietySession = startRunContractSession({
    runMode: RUN_MODES.RANKED,
    progress: {
      runContracts: normalizeRunContractsState({
        activeIds: ['enemy_variety_100'],
        completed: {
          enemy_variety_50: completion('enemy_variety_50')
        }
      })
    }
  });
  assert.equal(
    findSessionItem(migratedVarietySession, 'enemy_variety_100').progress,
    50,
    'completed variety tiers should backfill the late 100-type order'
  );
  const migratedVarietyAdvanced = applyRunContractEvent(migratedVarietySession, {
    type: 'enemy_defeated',
    sector: 12,
    enemyType: 'new_after_migration'
  });
  assert.equal(
    findSessionItem(migratedVarietyAdvanced.session, 'enemy_variety_100').progress,
    51,
    'new unique types should advance a migrated variety total even when legacy IDs were unavailable'
  );

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
  assert.equal(completionReview.completed[0]?.orderNumber, 1, 'review entries should expose their catalog order number');
  assert.equal(completionReview.completed.at(-1)?.orderNumber, RUN_CONTRACT_ORDER_IDS.length, 'last review entry should expose the final catalog order number');
  const shuffledCompleteState = normalizeRunContractsState({
    activeIds: FIRST_THREE,
    completed: {
      enemy_sweep_2500: completion('enemy_sweep_2500'),
      boss_breaker: completion('boss_breaker'),
      enemy_sweep_1000: completion('enemy_sweep_1000')
    }
  });
  const shuffledReview = getRunContractCompletionReviewState(shuffledCompleteState);
  assert.deepEqual(
    shuffledReview.completed.map((entry) => entry.id),
    ['boss_breaker', 'enemy_sweep_1000', 'enemy_sweep_2500'],
    'completed review should sort cleared orders by the designed Pilot Orders path'
  );
  assert.deepEqual(
    shuffledReview.completed.map((entry) => entry.orderNumber),
    [2, 3, 14],
    'completed review should keep catalog order numbers for sparse completed lists'
  );
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
      },
      careerProgress: {
        enemy_kills: { progress: 500 },
        enemy_variety: { progress: 1, uniqueIds: ['scout'] }
      }
    },
    {
      activeIds: ['enemy_sweep_1000', 'enemy_variety_50'],
      progress: {
        enemy_sweep_1000: { id: 'enemy_sweep_1000', progress: 750, target: 1000 },
        enemy_variety_50: { id: 'enemy_variety_50', progress: 1, target: 50, uniqueIds: ['diver'] }
      },
      careerProgress: {
        enemy_kills: { progress: 750 },
        enemy_variety: { progress: 1, uniqueIds: ['diver'] }
      }
    }
  );
  assert.equal(mergedProgress.progress.enemy_sweep_1000.progress, 750, 'merge should keep higher enemy-kill progress');
  assert.deepEqual(mergedProgress.progress.enemy_variety_50.uniqueIds.sort(), ['diver', 'scout'], 'merge should union unique enemy type progress');
  assert.equal(mergedProgress.careerProgress.enemy_kills.progress, 750, 'merge should keep the higher career enemy total');
  assert.deepEqual(
    mergedProgress.careerProgress.enemy_variety.uniqueIds.sort(),
    ['diver', 'scout'],
    'merge should union career enemy type history'
  );

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

function assertContained(inner, outer, label, pad = 2) {
  assert.ok(inner?.width > 0 && inner?.height > 0, `${label}: missing inner bounds`);
  assert.ok(outer?.width > 0 && outer?.height > 0, `${label}: missing outer bounds`);
  assert.ok(inner.x >= outer.x - pad, `${label}: left edge outside container`);
  assert.ok(inner.y >= outer.y - pad, `${label}: top edge outside container`);
  assert.ok(inner.right <= outer.right + pad, `${label}: right edge outside container`);
  assert.ok(inner.bottom <= outer.bottom + pad, `${label}: bottom edge outside container`);
}

function assertPilotOrdersLayout(menu, expectedStatus = 'active', { expectedDisabledBySetting = null } = {}) {
  const screen = menu?.screen;
  const board = menu?.missionBoard;
  assert.ok(screen?.width > 0 && screen?.height > 0, 'menu screen bounds should be exposed');
  assert.match(
    menu?.missionBriefing?.title || '',
    /^RUN MODES(?: \/\/| ·) /,
    'run mode panel should avoid Mission wording repetition'
  );
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
  const placement = board.bounds?.placement || 'belowDeck';
  assert.ok(['belowDeck', 'rightRail'].includes(placement), 'Pilot Orders should expose a supported placement');
  if (placement === 'rightRail') {
    const briefing = menu?.missionBriefing?.panelBounds;
    assert.ok(briefing, 'right-rail Pilot Orders require briefing bounds');
    assert.ok(Math.abs(board.bounds.x - briefing.x) <= 2, 'right-rail Pilot Orders should align with briefing x');
    assert.ok(Math.abs(board.bounds.width - briefing.width) <= 4, 'right-rail Pilot Orders should match briefing width');
    assert.ok(board.bounds.y >= briefing.bottom + 4, 'right-rail Pilot Orders should sit below the briefing');
    assert.ok(!boundsOverlap(board.bounds, menu.launchDeck.bounds, 2), 'right-rail Pilot Orders must not overlap the launch deck');
  } else {
    assert.ok(Math.abs(board.bounds.x - menu.launchDeck.bounds.x) <= 2, 'below-deck Pilot Orders should align with launch deck x');
    assert.ok(board.bounds.width >= menu.launchDeck.bounds.width - 8, 'below-deck Pilot Orders should be at least as wide as the launch deck');
    assert.ok(board.bounds.width <= screen.width * 0.38, 'below-deck Pilot Orders should stay in the left command lane');
    assert.ok(board.bounds.y >= menu.launchDeck.bounds.bottom - 6, 'below-deck Pilot Orders should sit below the launch deck');
  }
  const featuredDaily = menu?.launchDeck?.featuredDailySignal?.bounds;
  if (featuredDaily) {
    assertInside(featuredDaily, screen, 'Daily Signal feature');
    assert.ok(featuredDaily.y >= menu.launchDeck.bounds.y - 2, 'Daily Challenge should be integrated into the launch deck');
    assert.ok(featuredDaily.bottom <= menu.launchDeck.bounds.bottom + 2, 'Daily Challenge should stay inside the launch deck');
    assert.ok(!boundsOverlap(featuredDaily, board.bounds, 2), 'Daily Signal feature must not overlap Pilot Orders');
  }
  assert.ok(board.bounds.bottom <= menu.panel.y + 6, 'Pilot Orders should stay above the utility dock');

  if (expectedStatus === 'complete') {
    assert.equal(board.title, 'PILOT ORDERS COMPLETE');
    assert.equal(board.subtitle, 'All starter combat goals cleared.');
    assert.equal(board.rows.length, 0, 'complete notice should not show active rows');
    return;
  }

  assert.match(board?.title || '', /^PILOT ORDERS \/\/ COMPLETED: [0-9,]+$/);
  assert.doesNotMatch(board?.title || '', /\/50/, 'Pilot Orders board title must not reveal the catalog total');
  assert.ok(Number(board?.trackProgressRatio) >= 0 && Number(board?.trackProgressRatio) <= 1, 'Pilot Orders should expose a bounded track progress ratio');
  assert.equal(board?.rows?.length, 3, 'Pilot Orders should show exactly three active rows');
  assert.equal(new Set(board.rows.map((row) => row.group)).size, board.rows.length, 'Pilot Orders should not show two similar order groups at once');
  const selectedRows = board.rows.filter((row) => row.selected);
  assert.equal(selectedRows.length, 1, 'Pilot Orders should expose one selected row for the detail strip');
  const selectedRow = selectedRows[0];
  const expectedDetail = ACTIVE_HOW_TO[selectedRow.id];
  assert.equal(board.selectedOrder?.id, selectedRow.id, 'Pilot Orders selected detail should match the highlighted row');
  assert.equal(board.selectedOrder?.title, selectedRow.title, 'Pilot Orders selected detail should reuse the visible title');
  assert.equal(board.selectedOrder?.detail, expectedDetail, 'Pilot Orders selected detail should use the catalog guidance');
  assert.equal(board.subtitle, expectedDetail, 'Pilot Orders subtitle should explain exactly how to progress the selected row');
  assert.ok(!boundsOverlap(board.subtitleBounds, selectedRow.bounds, 2), 'Pilot Orders detail strip should not overlap the selected row');
  for (const row of board.rows) {
    assertInside(row.bounds, screen, `${row.id} row`);
    assertInside(row.titleBounds, screen, `${row.id} title`);
    assertInside(row.progressBounds, screen, `${row.id} progress`);
    assertInside(row.progressSlotBounds, screen, `${row.id} progress slot`);
    assertContained(row.progressBounds, row.progressSlotBounds, `${row.id} progress text`);
    assert.ok(!boundsOverlap(row.titleBounds, row.progressBounds, 2), `${row.id} title/progress text should not overlap`);
    assert.ok(!String(row.detail || '').trim(), `${row.id} should keep the main-menu row compact`);
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
      activeIds: ['support_hunter_100'],
      completedIds: RUN_CONTRACT_ORDER_IDS.filter((id) => id !== 'support_hunter_100'),
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
    assert.equal(activeProof.state.menu.missionBoard.selectedOrder?.id, 'graze_10', 'fresh Pilot Orders board should explain the first active order by default');
    assert.equal(activeProof.state.menu.missionBoard.subtitle, 'Fly close to enemy bullets without touching them.', 'fresh Pilot Orders board should show exact action guidance');
    assert.equal(activeProof.state.menu.menuIcons?.shipHangar?.sublabel, 'UPGRADE & CUSTOMIZE', 'fresh Ship Hangar card should keep its normal subtitle');
    assert.equal(activeProof.state.menu.missionBoard.title, 'PILOT ORDERS // COMPLETED: 0', 'main-menu header should show completed orders without revealing the endpoint');
    assert.doesNotMatch(activeProof.state.menu.missionBoard.title || '', /\/50/, 'main-menu Pilot Orders header must keep the catalog total hidden');
    assert.deepEqual(activeProof.state.menu.missionBoard.rows.map((row) => row.orderSlot), ['01', '02', '03'], 'main-menu rows should expose order numbers without the catalog total');
    assert.match(activeProof.state.menu.missionBoard.rows[0]?.title || '', /^Graze x10$/, 'main-menu row title should stay compact');
    assert.doesNotMatch(activeProof.state.menu.missionBriefing.body || '', /PILOT ORDERS/i, 'Run Modes briefing should not duplicate Pilot Orders progress');

    const secondRowBounds = activeProof.state.menu.missionBoard.rows[1]?.bounds;
    await page.mouse.move(
      secondRowBounds.x + secondRowBounds.width / 2,
      secondRowBounds.y + secondRowBounds.height / 2
    );
    await page.waitForTimeout(150);
    const hoverState = await readState(page);
    assertPilotOrdersLayout(hoverState.menu, 'active');
    assert.equal(hoverState.menu.missionBoard.selectedOrder?.id, 'boss_breaker', 'hovering a Pilot Order row should update the detail strip');
    assert.equal(hoverState.menu.missionBoard.subtitle, 'Survive to a boss wave, then destroy the boss.', 'hover detail should explain the hovered order');
    await page.screenshot({ path: path.join(outputDir, 'pilot-orders-hover-detail-menu.png'), fullPage: true });

    const wideOverrunProof = await captureMenuProof(page, {
      label: 'pilot-orders-wide-overrun-menu',
      width: 1920,
      height: 1080,
      uiScale: 1,
      runContracts: activeState,
      showPilotOrders: true,
      hangarPatch: { bestSector: 60, bestLevel: 60, totalRuns: 12 },
      expectedStatus: 'active'
    });
    assert.equal(
      wideOverrunProof.state.menu.launchDeck.cards.overrun.available,
      true,
      'wide mature-profile proof should include the unlocked Overrun card'
    );
    assert.equal(
      wideOverrunProof.state.menu.missionBoard.bounds.placement,
      'rightRail',
      'Pilot Orders should move beside the six-card deck when it cannot fit below'
    );
    assert.equal(
      boundsOverlap(
        wideOverrunProof.state.menu.launchDeck.bounds,
        wideOverrunProof.state.menu.missionBoard.bounds
      ),
      false,
      'wide six-card launch deck and Pilot Orders must not overlap'
    );

    await seedMenuProfile(page, activeState, 1);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForMenu(page);
    await page.evaluate(async () => {
      window.__burtGamepadOverride = {
        connected: true,
        id: 'Idle Connected Controller',
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
      };
      window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
      await window.__game?.startGame?.(undefined, { runMode: 'ranked', inputDevice: 'keyboard' });
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'play' && Boolean(window.__game?.scenes?.play?.emitRunContractEvent);
    }, null, { timeout: 30000 });
    await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      for (let index = 0; index < 10; index += 1) {
        play.emitRunContractEvent('near_miss', { sector: window.__game?.level || 1, streak: index + 1 });
      }
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return (state.toast?.active || []).some((toast) => String(toast.message || '').includes('ORDER COMPLETE'));
    }, null, { timeout: 5000 });
    const nonFinalCompletionResult = await page.evaluate(() => {
      const textState = JSON.parse(window.render_game_to_text?.() || '{}');
      return {
        runContracts: textState.runContracts,
        toastActive: textState.toast?.active || [],
        toastMessages: (textState.toast?.active || []).map((toast) => toast.message)
      };
    });
    assert.equal(nonFinalCompletionResult.runContracts?.completedCount, 1, 'first Pilot Order completion should update track progress');
    assert.equal(nonFinalCompletionResult.runContracts?.next?.[0]?.id, 'support_hunter', 'non-final completion should expose the next queued order');
    assert.equal(nonFinalCompletionResult.runContracts?.next?.[0]?.orderSlot, '04', 'non-final completion should expose the next queued order number without the catalog total');
    assert.ok(
      nonFinalCompletionResult.toastMessages.some((message) => message.includes('ORDER COMPLETE: Graze x10')),
      'non-final completion toast should name the completed order'
    );
    assert.ok(
      nonFinalCompletionResult.toastMessages.some((message) => message.includes('REWARD: +175 Career XP')),
      'non-final completion toast should expose the Career XP reward'
    );
    assert.ok(
      nonFinalCompletionResult.toastMessages.some((message) => message.includes('NEXT: Support Hunter 0/2')),
      'non-final completion toast should point to the next queued order'
    );
    const nonFinalToast = nonFinalCompletionResult.toastActive.find((toast) => String(toast.message || '').includes('ORDER COMPLETE'));
    assert.ok(nonFinalToast?.duration >= 6400, 'next-order completion toast should stay visible long enough to read');
    const nonFinalToastScreenshot = path.join(outputDir, 'pilot-order-next-completion-toast.png');
    await page.screenshot({ path: nonFinalToastScreenshot, fullPage: true });

    await page.evaluate(() => {
      const game = window.__game;
      game.score = Math.max(game.score || 0, 4321);
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
    const nonFinalReportState = await readState(page);
    assert.match(nonFinalReportState.gameOver?.runReportOverlay?.text || '', /PILOT ORDERS: COMPLETED: 1\s+Graze x10 \+175 XP\s+NEXT: Support Hunter 0\/2/);
    assert.doesNotMatch(nonFinalReportState.gameOver?.runReportOverlay?.text || '', /PILOT ORDERS:[^\n]*\/50/, 'run report must keep the Pilot Orders endpoint hidden');
    const nonFinalReportScreenshot = path.join(outputDir, 'pilot-orders-next-run-report.png');
    await page.screenshot({ path: nonFinalReportScreenshot, fullPage: true });

    const singleSlotState = runContractState({ activeIds: ['graze_10'] });
    await seedMenuProfile(page, singleSlotState, 1);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForMenu(page);
    await page.evaluate(async () => {
      window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
      await window.__game?.startGame?.(undefined, { runMode: 'ranked' });
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'play' && Boolean(window.__game?.scenes?.play?.emitRunContractEvent);
    }, null, { timeout: 30000 });
    await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      for (let index = 0; index < 10; index += 1) {
        play.emitRunContractEvent('near_miss', { sector: window.__game?.level || 1, streak: index + 1 });
      }
      play.setPaused(true);
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.isPaused && state.pauseOverlay?.visible === true;
    }, null, { timeout: 5000 });
    const singleSlotPauseState = await readState(page);
    assert.match(singleSlotPauseState.pauseOverlay?.pilotOrders || '', /PILOT ORDERS COMPLETED: 1 \/\/ Boss Breaker 0\/1/, 'pause overlay should point to the follow-up order without revealing the endpoint');
    const singleSlotPauseScreenshot = path.join(outputDir, 'pilot-orders-next-pause-line.png');
    await page.screenshot({ path: singleSlotPauseScreenshot, fullPage: true });

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

    const veteranVisibleProof = await captureMenuProof(page, {
      label: 'pilot-orders-veteran-default-visible-menu',
      width: 1280,
      height: 720,
      uiScale: 1,
      runContracts: activeState,
      hangarPatch: { bestSector: 10, bestLevel: 10, totalRuns: 8 },
      expectedStatus: 'active',
      expectedDisabledBySetting: false
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
    assert.equal(completedProof.state.menu.missionBoard.selectedOrder?.id, 'boss_breaker', 'completed active rows should default the detail strip to the next unfinished order');
    assert.equal(completedProof.state.menu.missionBoard.subtitle, 'Survive to a boss wave, then destroy the boss.', 'completed active rows should still explain the next unfinished order');
    assert.equal(completedProof.state.menu.menuIcons?.shipHangar?.sublabel, 'PILOT ORDERS // COMPLETED: 1', 'Ship Hangar dock card should advertise completed orders without revealing the endpoint');

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
    assert.equal(archive?.heading, 'PILOT ORDERS', 'Hangar review should be framed as the full Pilot Orders review');
    assert.equal(archive?.countLabel, 'COMPLETED: 3', 'Hangar review should label the completed-order counter without revealing the endpoint');
    assert.equal(archive?.activeCount, 1, 'Hangar review should show active unfinished Pilot Orders');
    assert.ok(archive?.nextCount >= 1, 'Hangar review should expose at least one queued Pilot Order');
    assert.match(archive?.summary || '', /ACTIVE 1/, 'Hangar review header should summarize active Pilot Orders');
    assert.match(archive?.summary || '', /NEXT [1-9]/, 'Hangar review header should summarize queued Pilot Orders');
    assert.match(archive?.summary || '', /COMPLETED: 3/, 'Hangar review header should summarize completed Pilot Orders without revealing the endpoint');
    assert.doesNotMatch(`${archive?.countLabel || ''} ${archive?.summary || ''}`, /\/50/, 'Hangar review counters must keep the catalog total hidden');
    assert.equal(archive?.totalRows, RUN_CONTRACT_ORDER_IDS.length, 'Hangar review should build all 50 Pilot Order rows');
    assert.ok(archive?.pageCount > 1, 'Hangar review should page the full Pilot Orders catalog');
    assert.ok(archive?.visibleCount > 0 && archive.visibleCount < archive.totalRows, 'Hangar review should show a readable page slice');
    assert.match(archive?.text || '', /01 ACTIVE 0\/10 \/\/ Graze x10/, 'Hangar review should list active Pilot Orders with progress');
    assert.match(archive?.text || '', /04 NEXT 0\/2 \/\/ Support Hunter/, 'Hangar review should list the next queued Pilot Order with progress');
    assert.match(archive?.text || '', /02 DONE \/\/ Boss Breaker/, 'Hangar review should show completed Boss Breaker');
    assert.match(archive?.text || '', /03 DONE \/\/ 1000 Enemies/, 'Hangar review should show completed 1000 Enemies');
    assert.match(archive?.text || '', /14 DONE \/\/ 2500 Enemies/, 'Hangar review should show completed 2500 Enemies');
    assertInside(archive?.bounds, { width: 1280, height: 720 }, 'Pilot Orders archive');
    const hangarReviewScreenshot = path.join(outputDir, 'pilot-orders-hangar-completed-review.png');
    await page.screenshot({ path: hangarReviewScreenshot, fullPage: true });
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.shipSelect?.careerInfo?.pilotOrdersArchive?.page === 1;
    }, null, { timeout: 5000 });
    const pagedArchive = (await readState(page)).shipSelect?.careerInfo?.pilotOrdersArchive;
    assert.equal(pagedArchive?.page, 1, 'Hangar review should advance pages from keyboard');
    assert.notEqual(pagedArchive?.visibleText, archive?.visibleText, 'Hangar review page turn should change the visible order rows');
    await page.mouse.wheel(0, -400);
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.shipSelect?.careerInfo?.pilotOrdersArchive?.page === 0;
    }, null, { timeout: 5000 });

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
    await seedMenuProfile(page, activeState, 1, { hangarPatch: { totalRuns: 0 } });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForMenu(page);
    await page.evaluate(async () => {
      window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
      await window.__game?.startGame?.(undefined, { runMode: 'ranked' });
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return window.__game?.scenes?.play?.introActive === false
        && (state.toast?.active || []).some((toast) => toast.type === 'firstRunControls');
    }, null, { timeout: 10000 });
    await page.waitForTimeout(250);
    const firstRunNudgeState = await readState(page);
    const firstRunNudge = (firstRunNudgeState.toast?.active || []).find((toast) => toast.type === 'firstRunControls');
    assert.match(firstRunNudge?.message || '', /WASD\/Arrows: Move.*Space: Shoot.*Shift: Phase/, 'first ranked run should teach core controls before Pilot Orders');
    assert.equal((firstRunNudgeState.toast?.active || []).some((toast) => toast.type === 'runContractStart'), false, 'first ranked run should not stack the Pilot Orders banner over controls');
    assert.equal((firstRunNudgeState.toast?.active || []).some((toast) => toast.type === 'level_up' && toast.slot === 'corner'), false, 'first ranked run should suppress ambient opening quips while controls are visible');
    assert.equal(firstRunNudgeState.shipIntro?.timing?.totalMs, 3200, 'first ranked run should preserve the full ship introduction');
    assert.equal(firstRunNudgeState.toast?.achievement?.id || null, null, 'first-run achievement should wait until the controls lesson is complete');
    await page.evaluate(() => window.__game?.handleAchievementUnlocked?.({
      id: 'ACH_EARLY_PILOT',
      unlockedAt: new Date().toISOString()
    }));
    const pendingFirstRunAchievements = await page.evaluate(() => window.__game?.pendingAchievementToasts?.length || 0);
    assert.ok(pendingFirstRunAchievements > 0, 'deferred first-run achievements should remain in the game-level queue');
    const firstRunOverlap = await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      const controls = play?.activeTopToast?.getBounds?.();
      const highscore = play?.hud?.highscoreChaseGroup?.getBounds?.();
      if (!controls) return null;
      if (!highscore || play?.hud?.highscoreChaseGroup?.visible === false) return false;
      return !(
        controls.x + controls.width <= highscore.x
        || highscore.x + highscore.width <= controls.x
        || controls.y + controls.height <= highscore.y
        || highscore.y + highscore.height <= controls.y
      );
    });
    assert.equal(firstRunOverlap, false, 'first-run controls should not overlap the high-score target HUD');
    const firstRunNudgeScreenshot = path.join(outputDir, 'pilot-orders-first-run-controls.png');
    await page.screenshot({ path: firstRunNudgeScreenshot, fullPage: true });
    await page.evaluate(() => {
      delete window.__burtGamepadOverride;
      window.__game?.gameOver?.();
    });
    await page.waitForFunction(() => {
      const game = window.__game;
      return JSON.parse(window.render_game_to_text?.() || '{}').scene === 'gameOver'
        && Boolean(game?.scenes?.gameOver?.achievementToast);
    }, null, { timeout: 10000 });
    const earlyGameOverAchievement = await page.evaluate(() => ({
      active: Boolean(window.__game?.scenes?.gameOver?.achievementToast),
      pending: window.__game?.pendingAchievementToasts?.length || 0
    }));
    assert.equal(earlyGameOverAchievement.active, true, 'an achievement deferred by onboarding should transfer to an early Game Over scene');
    assert.equal(earlyGameOverAchievement.pending, 0, 'transferred early-run achievements should leave the game-level queue');
    await page.screenshot({ path: path.join(outputDir, 'pilot-orders-first-run-early-gameover-achievement.png'), fullPage: true });

    await seedMenuProfile(page, activeState, 1, { hangarPatch: { totalRuns: 0 } });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForMenu(page);
    await page.evaluate(async () => {
      window.__burtGamepadOverride = {
        connected: true,
        id: 'Nova Virtual Controller',
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }))
      };
      window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
      await window.__game?.startGame?.(undefined, { runMode: 'ranked', inputDevice: 'controller' });
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return window.__game?.scenes?.play?.introActive === false
        && (state.toast?.active || []).some((toast) => toast.type === 'firstRunControls');
    }, null, { timeout: 10000 });
    await page.waitForTimeout(250);
    const controllerFirstRunState = await readState(page);
    const controllerFirstRunNudge = (controllerFirstRunState.toast?.active || []).find((toast) => toast.type === 'firstRunControls');
    assert.match(controllerFirstRunNudge?.message || '', /Stick\/D-Pad: Move.*A\/RT: Shoot.*B\/LB: Phase/, 'controller first run should teach controller controls after the ship intro');
    assert.equal(controllerFirstRunState.toast?.achievement?.id || null, null, 'controller first-run achievement should wait until the controls lesson is complete');
    const controllerFirstRunOverlap = await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      const controls = play?.activeTopToast?.getBounds?.();
      const highscore = play?.hud?.highscoreChaseGroup?.getBounds?.();
      if (!controls) return null;
      if (!highscore || play?.hud?.highscoreChaseGroup?.visible === false) return false;
      return !(
        controls.x + controls.width <= highscore.x
        || highscore.x + highscore.width <= controls.x
        || controls.y + controls.height <= highscore.y
        || highscore.y + highscore.height <= controls.y
      );
    });
    assert.equal(controllerFirstRunOverlap, false, 'controller first-run controls should not overlap the high-score target HUD');
    const controllerFirstRunScreenshot = path.join(outputDir, 'pilot-orders-first-run-controller-controls.png');
    await page.screenshot({ path: controllerFirstRunScreenshot, fullPage: true });
    await page.evaluate(() => { delete window.__burtGamepadOverride; });

    await seedMenuProfile(page, finalRunState, 1, { hangarPatch: { totalRuns: 1 } });
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
      return state.shipIntro?.complete === true && state.shipIntro?.returningPilot === true;
    }, null, { timeout: 7000 });
    await page.waitForTimeout(2400);
    const startNudgeState = await readState(page);
    assert.equal(
      (startNudgeState.toast?.active || []).some((toast) => toast.type === 'runContractStart'),
      false,
      'returning runs should not cover opening combat with a repeated Pilot Orders banner'
    );
    assert.equal(
      (startNudgeState.toast?.active || []).some((toast) => toast.type === 'level_up' && toast.slot === 'corner'),
      false,
      'returning runs should not stack randomized opening quips over combat'
    );
    assert.equal(startNudgeState.shipIntro?.timing?.totalMs, 1600, 'returning desktop runs should use the shorter ship intro');
    const startNudgeScreenshot = path.join(outputDir, 'pilot-orders-returning-run-clean-start.png');
    await page.screenshot({ path: startNudgeScreenshot, fullPage: true });

    await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      play.emitRunContractEvent('boss_support_defeated', { sector: window.__game?.level || 1, count: 25 });
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
    const progressSupport = progressResult.runContracts?.active?.find((item) => item.id === 'support_hunter_100');
    assert.equal(progressSupport?.progress, 75, 'late support-hunter order should inherit 50 career defeats and show new progress');
    assert.equal(progressResult.runContracts?.progressThisRun?.[0]?.progress, 75, 'partial Pilot Orders progress should be exposed for run report state');
    assert.equal(progressResult.runContracts?.progressThisRun?.[0]?.orderSlot, '50', 'partial Pilot Orders progress should expose the order number without the catalog total');
    const progressToast = progressResult.toastActive.find((toast) => String(toast.message || '').includes('ORDER PROGRESS'));
    assert.equal(progressToast?.slot, 'top', 'progress toast should use the top queue');
    assert.equal(progressToast?.type, 'runContractProgress', 'progress toast should expose the runContractProgress type');
    assert.match(progressToast?.message || '', /PILOT ORDERS COMPLETED: 49/, 'progress toast should include the completed count without revealing the endpoint');
    assert.match(progressToast?.message || '', /ORDER PROGRESS: 100 Supports 75\/100/, 'progress toast should include inherited career progress for the active order');
    assert.ok(progressToast?.duration >= 4000, 'progress toast should stay visible long enough to notice');
    const progressToastScreenshot = path.join(outputDir, 'pilot-order-progress-toast.png');
    await page.waitForTimeout(300);
    await page.screenshot({ path: progressToastScreenshot, fullPage: true });

    await page.evaluate(() => {
      window.__game?.scenes?.play?.setPaused?.(true);
    });
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.isPaused && state.pauseOverlay?.visible === true;
    }, null, { timeout: 5000 });
    const pauseState = await readState(page);
    assert.match(pauseState.pauseOverlay?.pilotOrders || '', /100 Supports/, 'pause overlay should show the active Pilot Order');
    assert.match(pauseState.pauseOverlay?.pilotOrders || '', /PILOT ORDERS COMPLETED: 49/, 'pause overlay should show completed Pilot Orders without revealing the endpoint');
    assert.match(pauseState.pauseOverlay?.pilotOrders || '', /75\/100/, 'pause overlay should show active Pilot Order progress');
    const pauseScreenshot = path.join(outputDir, 'pilot-orders-pause-line.png');
    await page.screenshot({ path: pauseScreenshot, fullPage: true });
    await page.evaluate(() => {
      window.__game?.scenes?.play?.setPaused?.(false);
    });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').isPaused === false, null, { timeout: 5000 });

    await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      play.emitRunContractEvent('boss_support_defeated', { sector: window.__game?.level || 1, count: 25 });
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
    const supportOrder = completionResult.runContracts?.active?.find((item) => item.id === 'support_hunter_100');
    assert.equal(supportOrder?.progress, 100, 'in-run 100 Supports order should reach target');
    assert.equal(supportOrder?.completed, true, 'in-run 100 Supports order should mark complete');
    assert.equal(completionResult.runContracts?.allCompleteThisRun, true, 'final order completion should be exposed to run report state');
    assert.equal(
      completionResult.savedRunContracts?.completed?.support_hunter_100?.count,
      1,
      'completion should persist to hangar profile'
    );
    assert.ok(
      completionResult.toastMessages.some((message) => message.includes('ORDER COMPLETE: 100 Supports')),
      'completion toast should be visible through text state'
    );
    assert.ok(
      completionResult.toastMessages.some((message) => message.includes('REWARD: +420 Career XP')),
      'completion toast should expose the final order Career XP reward'
    );
    const orderToast = completionResult.toastActive.find((toast) => String(toast.message || '').includes('ORDER COMPLETE'));
    assert.equal(orderToast?.slot, 'top', 'completion toast should use the top queue instead of the crowded corner');
    assert.equal(orderToast?.type, 'runContract', 'completion toast should expose the runContract type');
    assert.ok(orderToast?.duration >= 6400, 'completion toast should stay visible long enough to notice');

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
    assert.match(reportState.gameOver?.runReportOverlay?.text || '', /PILOT ORDERS: COMPLETE\s+COMPLETED: 50\s+100 Supports \+420 XP/);
    assert.doesNotMatch(reportState.gameOver?.runReportOverlay?.text || '', /PILOT ORDERS:[^\n]*\/50/, 'final run report must keep the Pilot Orders endpoint hidden');
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
        wideOverrunMenu: wideOverrunProof.screenshot,
        settingsToggle: settingsScreenshot,
        steamDeckMenu: steamDeckProof.screenshot,
        largeUiMenu: largeUiProof.screenshot,
        hiddenBySettingMenu: settingHiddenProof.screenshot,
        veteranDefaultVisibleMenu: veteranVisibleProof.screenshot,
        nextCompletionToast: nonFinalToastScreenshot,
        nextRunReport: nonFinalReportScreenshot,
        nextPauseLine: singleSlotPauseScreenshot,
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
