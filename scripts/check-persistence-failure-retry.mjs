import assert from 'node:assert/strict';
import { createPersistenceScheduler } from '../src/persistence/PersistenceScheduler.js';

for (const failure of ['negative_ack', 'throw']) {
  const timers = new Map();
  let calls = 0;
  const scheduler = createPersistenceScheduler({
    collectSnapshot: () => ({ completedScore: 899255, previouslyCommittedRank: 29 }),
    mergeSnapshot: async () => {
      calls++;
      if (calls > 1) return { ok: true };
      if (failure === 'throw') throw new Error('disk unavailable');
      return { ok: false, error: 'disk unavailable' };
    },
    setTimeoutFn: (fn, delay) => { timers.set(fn, delay); return fn; },
    clearTimeoutFn: fn => timers.delete(fn)
  });
  scheduler.markDirty('runResults');
  const failed = await scheduler.flush({ force: true });
  assert.equal(failed.ok, false);
  assert.equal(scheduler.getDebugState().dirtyDomains.includes('runResults'), true,
    `${failure}: rejected writes must retain pending progress`);
  assert.ok([...timers.values()].every(delay => delay >= 1000), 'failure retries must not spin');
  await scheduler.flush({ force: true });
  assert.equal(calls, 2, 'identical failed snapshot must actually be retried');
  assert.equal(scheduler.getDebugState().dirtyDomains.length, 0);
}
console.log('PASS: rejected/throwing persistence retains progress and retries without spinning');
