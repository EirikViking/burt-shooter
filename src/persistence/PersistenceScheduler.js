const DEFAULT_FLUSH_DELAY_MS = 250;
const COMBAT_RETRY_DELAY_MS = 1000;

function defaultSetTimeout(callback, delay) {
  return globalThis.setTimeout?.(callback, delay) ?? null;
}

function defaultClearTimeout(handle) {
  if (handle != null) globalThis.clearTimeout?.(handle);
}

function serializeSnapshot(snapshot) {
  try {
    return JSON.stringify(snapshot);
  } catch {
    return null;
  }
}

export function createPersistenceScheduler(options = {}) {
  let collectSnapshot = options.collectSnapshot || null;
  let mergeSnapshot = options.mergeSnapshot || null;
  let isCombatActive = options.isCombatActive || (() => false);
  let onEvent = options.onEvent || null;
  let setTimeoutFn = options.setTimeoutFn || defaultSetTimeout;
  let clearTimeoutFn = options.clearTimeoutFn || defaultClearTimeout;
  let flushDelayMs = Math.max(0, Number(options.flushDelayMs) || DEFAULT_FLUSH_DELAY_MS);
  let combatRetryDelayMs = Math.max(1, Number(options.combatRetryDelayMs) || COMBAT_RETRY_DELAY_MS);

  const dirtyDomains = new Set();
  let pendingTimer = null;
  let inFlight = null;
  let followUpRequested = false;
  let lastSentSnapshot = null;
  let lastResult = null;
  const metrics = {
    dirtyNotifications: 0,
    scheduledFlushes: 0,
    deferredForCombat: 0,
    snapshotCollections: 0,
    ipcRequests: 0,
    completedFlushes: 0,
    unchangedSnapshots: 0,
    coalescedWhilePending: 0,
    coalescedWhileInFlight: 0,
    followUpFlushes: 0,
    failures: 0,
    maxConcurrentOperations: 0,
    activeOperations: 0
  };

  const emit = (label, details = {}) => {
    try {
      onEvent?.(label, details);
    } catch {
      // Diagnostics must never interfere with persistence.
    }
  };

  const cancelPendingTimer = () => {
    if (pendingTimer == null) return;
    clearTimeoutFn(pendingTimer);
    pendingTimer = null;
  };

  const schedule = (delayMs = flushDelayMs, reason = 'dirty') => {
    if (!mergeSnapshot || !collectSnapshot || dirtyDomains.size === 0) return false;
    if (pendingTimer != null) {
      metrics.coalescedWhilePending += 1;
      return false;
    }
    if (inFlight) {
      followUpRequested = true;
      metrics.coalescedWhileInFlight += 1;
      return false;
    }
    metrics.scheduledFlushes += 1;
    pendingTimer = setTimeoutFn(() => {
      pendingTimer = null;
      void flush({ reason, force: false });
    }, Math.max(0, Number(delayMs) || 0));
    return pendingTimer != null;
  };

  const markDirty = (domain = 'unknown', { scheduleFlush = true } = {}) => {
    dirtyDomains.add(String(domain || 'unknown'));
    metrics.dirtyNotifications += 1;
    emit('persistence.dirty', {
      domain: String(domain || 'unknown'),
      dirtyDomains: dirtyDomains.size,
      inFlight: Boolean(inFlight)
    });
    if (inFlight) {
      followUpRequested = true;
      metrics.coalescedWhileInFlight += 1;
    } else if (scheduleFlush) {
      schedule(flushDelayMs, 'scheduled_dirty_flush');
    }
    return getDebugState();
  };

  const flush = ({ reason = 'explicit', force = false } = {}) => {
    if (inFlight) {
      if (dirtyDomains.size > 0) {
        followUpRequested = true;
        metrics.coalescedWhileInFlight += 1;
      }
      return inFlight;
    }
    cancelPendingTimer();
    if (dirtyDomains.size === 0) {
      return Promise.resolve({ ok: true, skipped: true, reason: 'clean' });
    }
    if (!force && isCombatActive()) {
      metrics.deferredForCombat += 1;
      emit('persistence.flush_deferred', { reason, dirtyDomains: [...dirtyDomains] });
      schedule(combatRetryDelayMs, 'combat_idle_retry');
      return Promise.resolve({ ok: true, deferred: true, reason: 'combat_active' });
    }

    const domains = [...dirtyDomains].sort();
    dirtyDomains.clear();
    followUpRequested = false;
    inFlight = Promise.resolve().then(async () => {
      metrics.activeOperations += 1;
      metrics.maxConcurrentOperations = Math.max(metrics.maxConcurrentOperations, metrics.activeOperations);
      const collectionStartedAt = globalThis.performance?.now?.() ?? Date.now();
      emit('persistence.snapshot.begin', { reason, domains });
      const snapshot = collectSnapshot({ reason, domains });
      metrics.snapshotCollections += 1;
      const collectionEndedAt = globalThis.performance?.now?.() ?? Date.now();
      const serializationStartedAt = collectionEndedAt;
      const serialized = serializeSnapshot(snapshot);
      const serializationEndedAt = globalThis.performance?.now?.() ?? Date.now();
      emit('persistence.snapshot.end', {
        reason,
        domains,
        durationMs: collectionEndedAt - collectionStartedAt,
        bytes: serialized?.length || 0
      });
      emit('persistence.snapshot_serialization', {
        reason,
        domains,
        durationMs: serializationEndedAt - serializationStartedAt,
        bytes: serialized?.length || 0
      });

      if (serialized != null && serialized === lastSentSnapshot) {
        metrics.unchangedSnapshots += 1;
        metrics.completedFlushes += 1;
        lastResult = { ok: true, skipped: true, unchanged: true, reason, domains };
        emit('persistence.flush_unchanged', { reason, domains });
        return lastResult;
      }

      metrics.ipcRequests += 1;
      emit('persistence.ipc.begin', { reason, domains, bytes: serialized?.length || 0 });
      const ipcStartedAt = globalThis.performance?.now?.() ?? Date.now();
      const result = await mergeSnapshot(snapshot, { reason, domains });
      const ipcDurationMs = (globalThis.performance?.now?.() ?? Date.now()) - ipcStartedAt;
      if (serialized != null) lastSentSnapshot = serialized;
      metrics.completedFlushes += 1;
      lastResult = result ?? { ok: true };
      emit('persistence.ipc.end', {
        reason,
        domains,
        ok: result?.ok !== false,
        durationMs: ipcDurationMs,
        electronIo: result?._persistenceIo || null
      });
      if (result?._persistenceIo) {
        emit('electron.save_read', {
          reason,
          durationMs: result._persistenceIo.readMs || 0,
          fileReads: result._persistenceIo.fileReads || 0
        });
        emit('electron.save_write', {
          reason,
          durationMs: result._persistenceIo.writeMs || 0,
          fileWrites: result._persistenceIo.fileWrites || 0,
          skipped: result._persistenceIo.writeSkipped === true
        });
      }
      return lastResult;
    }).catch((error) => {
      for (const domain of domains) dirtyDomains.add(domain);
      metrics.failures += 1;
      lastResult = { ok: false, error: error?.message || String(error), reason, domains };
      emit('persistence.flush_error', lastResult);
      return lastResult;
    }).finally(() => {
      metrics.activeOperations = Math.max(0, metrics.activeOperations - 1);
      inFlight = null;
      if (dirtyDomains.size > 0 || followUpRequested) {
        followUpRequested = false;
        metrics.followUpFlushes += 1;
        schedule(0, 'in_flight_follow_up');
      }
    });
    return inFlight;
  };

  const configure = (next = {}) => {
    if (next.collectSnapshot) collectSnapshot = next.collectSnapshot;
    if (next.mergeSnapshot) mergeSnapshot = next.mergeSnapshot;
    if (next.isCombatActive) isCombatActive = next.isCombatActive;
    if (next.onEvent) onEvent = next.onEvent;
    if (next.setTimeoutFn) setTimeoutFn = next.setTimeoutFn;
    if (next.clearTimeoutFn) clearTimeoutFn = next.clearTimeoutFn;
    if (Number.isFinite(Number(next.flushDelayMs))) flushDelayMs = Math.max(0, Number(next.flushDelayMs));
    if (Number.isFinite(Number(next.combatRetryDelayMs))) combatRetryDelayMs = Math.max(1, Number(next.combatRetryDelayMs));
    if (dirtyDomains.size > 0) schedule(flushDelayMs, 'configured_dirty_flush');
    return getDebugState();
  };

  function getDebugState() {
    return {
      dirtyDomains: [...dirtyDomains].sort(),
      dirtyDomainCount: dirtyDomains.size,
      pendingTimer: pendingTimer != null,
      pendingCloudSyncCount: (pendingTimer != null ? 1 : 0) + (inFlight ? 1 : 0),
      inFlight: Boolean(inFlight),
      followUpRequested,
      activeOperations: metrics.activeOperations,
      lastResult,
      metrics: { ...metrics }
    };
  }

  const resetForTests = () => {
    cancelPendingTimer();
    dirtyDomains.clear();
    inFlight = null;
    followUpRequested = false;
    lastSentSnapshot = null;
    lastResult = null;
    for (const key of Object.keys(metrics)) metrics[key] = 0;
  };

  return Object.freeze({ configure, markDirty, schedule, flush, getDebugState, resetForTests });
}

const sharedPersistenceScheduler = createPersistenceScheduler();

export function configurePersistenceScheduler(options = {}) {
  return sharedPersistenceScheduler.configure(options);
}

export function markPersistenceDirty(domain, options = {}) {
  return sharedPersistenceScheduler.markDirty(domain, options);
}

export function flushPersistence(options = {}) {
  return sharedPersistenceScheduler.flush(options);
}

export function getPersistenceSchedulerDebugState() {
  return sharedPersistenceScheduler.getDebugState();
}

export function resetPersistenceSchedulerForTests() {
  return sharedPersistenceScheduler.resetForTests();
}
