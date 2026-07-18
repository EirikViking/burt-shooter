import assert from 'node:assert/strict';

import { RUN_MODES } from '../src/game/RunMode.js';
import {
  applyRunContractEvent,
  getRunContractCatalog,
  normalizeRunContractsState,
  startRunContractSession
} from '../src/progression/RunContracts.js';

const OPENING_ORDERS = ['graze_10', 'boss_breaker', 'enemy_sweep_1000'];
const completion = {
  id: 'graze_10',
  count: 1,
  completedAt: '2026-07-15T00:00:00.000Z',
  lastRunMode: RUN_MODES.RANKED,
  lastSector: 1,
  buildVersion: 'check-run-contract-mode-eligibility'
};
const progress = {
  runContracts: normalizeRunContractsState({
    activeIds: OPENING_ORDERS,
    completedIds: ['graze_10'],
    completed: { graze_10: completion }
  })
};

for (const contract of getRunContractCatalog()) {
  assert.deepEqual(
    contract.modes,
    [RUN_MODES.RANKED, RUN_MODES.MAYHEM_TACTICAL],
    `${contract.id} should be available in both ranked Mayhem modes only`
  );
}

for (const runMode of [RUN_MODES.RANKED, RUN_MODES.MAYHEM_TACTICAL]) {
  const session = startRunContractSession({ runMode, progress });
  assert.equal(
    session.active.some((item) => item.id === 'graze_10'),
    false,
    `${runMode} should rotate cleared Pilot Orders before the run starts`
  );
  const bossOrder = session.active.find((item) => item.id === 'boss_breaker');
  assert.equal(bossOrder?.eligible, true, `${runMode} should make Pilot Orders eligible`);
  const result = applyRunContractEvent(session, { type: 'boss_defeated', sector: 2 });
  assert.deepEqual(
    result.completed.map((entry) => entry.id),
    ['boss_breaker'],
    `${runMode} should progress and complete eligible Pilot Orders`
  );
}

for (const runMode of [RUN_MODES.SCOUT, RUN_MODES.SECTOR_START]) {
  const session = startRunContractSession({ runMode, progress });
  assert.equal(
    session.active.some((item) => item.id === 'graze_10'),
    true,
    `${runMode} should not prepare or rotate Pilot Orders`
  );
  const bossOrder = session.active.find((item) => item.id === 'boss_breaker');
  assert.equal(bossOrder?.eligible, false, `${runMode} should keep Pilot Orders ineligible`);
  const result = applyRunContractEvent(session, { type: 'boss_defeated', sector: 2 });
  assert.equal(result.completed.length, 0, `${runMode} should not complete Pilot Orders`);
  assert.equal(
    result.session.active.find((item) => item.id === 'boss_breaker')?.progress,
    0,
    `${runMode} should leave Pilot Order progress unchanged`
  );
}

console.log('[run-contract-mode-eligibility] PASS pure+tactical eligible; scout+sector excluded');
