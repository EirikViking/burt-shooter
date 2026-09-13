function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

/**
 * Non-competitive elapsed time owned by the loaded run session.
 *
 * The ticker supplies real monotonic frame deltas before simulation clamping,
 * so pause and presentation time count while calendar/offline time never does.
 */
export class RunSessionClock {
  constructor(initialElapsedMs = 0) {
    this.elapsedMs = finiteNonNegative(initialElapsedMs);
    this.running = false;
    this.finalized = false;
  }

  start(initialElapsedMs = 0) {
    this.elapsedMs = finiteNonNegative(initialElapsedMs);
    this.running = true;
    this.finalized = false;
    return this.elapsedMs;
  }

  advanceRealFrame(deltaMs = 0) {
    if (!this.running || this.finalized) return this.elapsedMs;
    this.elapsedMs += finiteNonNegative(deltaMs);
    return this.elapsedMs;
  }

  restore(raw = {}, activeElapsedSeconds = 0) {
    const activeMs = finiteNonNegative(activeElapsedSeconds) * 1000;
    const persistedMs = raw?.elapsedMs ?? raw?.runTotalElapsedMs;
    this.elapsedMs = Math.max(activeMs, finiteNonNegative(persistedMs, activeMs));
    this.running = true;
    this.finalized = false;
    return this.elapsedMs;
  }

  finalize(activeElapsedSeconds = 0) {
    this.elapsedMs = Math.max(this.elapsedMs, finiteNonNegative(activeElapsedSeconds) * 1000);
    this.running = false;
    this.finalized = true;
    return this.elapsedMs;
  }

  get elapsedSeconds() {
    return this.elapsedMs / 1000;
  }

  snapshot() {
    return {
      elapsedMs: this.elapsedMs,
      running: this.running,
      finalized: this.finalized
    };
  }
}
