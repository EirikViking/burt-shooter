const STORAGE_KEY = 'novaSwarm.mayhemPerformanceDiagnostics.v1';
const STORAGE_REPORT_KEY = 'novaSwarm.mayhemPerformanceDiagnostics.latestReport.v1';
const GLOBAL_KEY = '__novaMayhemPerformanceDiagnostics';
const FRAME_COUNTER_KEY = '__novaMayhemFrameCounters';
const STORAGE_PATCH_KEY = '__novaMayhemStorageProbe';
const AUTO_DIAGNOSTICS_ENABLED = false;
const SLOW_FRAME_MS = 20;
const NOTICEABLE_SLOW_FRAME_MS = 25;
const IMPORTANT_SLOW_FRAME_MS = 33;
const SEVERE_SLOW_FRAME_MS = 50;

const DEFAULT_OPTIONS = Object.freeze({
  enabled: AUTO_DIAGNOSTICS_ENABLED,
  showOverlay: false,
  hideHighscoreChase: false,
  hudLite: false,
  noParticles: false,
  noStarfield: false,
  noScorePopups: false,
  noLeaderboardTargets: false,
  noHitAudio: false,
  noCollisionSideEffects: false,
  rawCollisionOnly: false
});

const HOTKEYS = Object.freeze({
  Digit1: 'hideHighscoreChase',
  Digit2: 'hudLite',
  Digit3: 'noParticles',
  Digit4: 'noStarfield',
  Digit5: 'noScorePopups',
  Digit6: 'noLeaderboardTargets',
  Digit7: 'noHitAudio',
  Digit8: 'noCollisionSideEffects',
  Digit9: 'rawCollisionOnly'
});

function getWindow() {
  return typeof window !== 'undefined' ? window : null;
}

function parseBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'off'].includes(text)) return false;
  return fallback;
}

function safeReadStorage() {
  const win = getWindow();
  if (!win?.localStorage) return {};
  try {
    const raw = win.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function safeWriteStorage(options) {
  const win = getWindow();
  if (!win?.localStorage) return;
  try {
    win.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      enabled: Boolean(options.enabled),
      showOverlay: Boolean(options.showOverlay),
      hideHighscoreChase: Boolean(options.hideHighscoreChase),
      hudLite: Boolean(options.hudLite),
      noParticles: Boolean(options.noParticles),
      noStarfield: Boolean(options.noStarfield),
      noScorePopups: Boolean(options.noScorePopups),
      noLeaderboardTargets: Boolean(options.noLeaderboardTargets),
      noHitAudio: Boolean(options.noHitAudio),
      noCollisionSideEffects: Boolean(options.noCollisionSideEffects),
      rawCollisionOnly: Boolean(options.rawCollisionOnly)
    }));
  } catch {
    // Diagnostics must never break gameplay storage.
  }
}

function readQueryOptions() {
  const win = getWindow();
  if (!win?.location?.search) return {};
  try {
    const params = new URLSearchParams(win.location.search);
    return {
      enabled: params.has('novaPerfDiag')
        ? parseBoolean(params.get('novaPerfDiag'))
        : (params.has('perf') ? parseBoolean(params.get('perf')) : undefined),
      showOverlay: parseBoolean(params.get('novaDiagOverlay'), undefined),
      hideHighscoreChase: parseBoolean(params.get('novaDiagHideHighscore'), undefined),
      hudLite: parseBoolean(params.get('novaDiagHudLite'), undefined),
      noParticles: parseBoolean(params.get('novaDiagNoParticles'), undefined),
      noStarfield: parseBoolean(params.get('novaDiagNoStarfield'), undefined),
      noScorePopups: parseBoolean(params.get('novaDiagNoScorePopups'), undefined),
      noLeaderboardTargets: parseBoolean(params.get('novaDiagNoLeaderboardTargets'), undefined),
      noHitAudio: parseBoolean(params.get('novaDiagNoHitAudio'), undefined),
      noCollisionSideEffects: parseBoolean(params.get('novaDiagNoCollisionSideEffects'), undefined),
      rawCollisionOnly: parseBoolean(params.get('novaDiagRawCollisionOnly'), undefined)
    };
  } catch {
    return {};
  }
}

function normalizeOptions(options = {}) {
  const next = { ...DEFAULT_OPTIONS };
  for (const key of Object.keys(DEFAULT_OPTIONS)) {
    if (options[key] !== undefined) next[key] = Boolean(options[key]);
  }
  return next;
}

export function readMayhemPerformanceDiagnosticsOptions() {
  const options = normalizeOptions({
    ...safeReadStorage(),
    ...readQueryOptions()
  });
  if (AUTO_DIAGNOSTICS_ENABLED) options.enabled = true;
  return options;
}

export function isMayhemPerformanceOptionEnabled(option) {
  const options = readMayhemPerformanceDiagnosticsOptions();
  return Boolean(options.enabled && options[option]);
}

function makeSectionStats() {
  return {
    count: 0,
    totalMs: 0,
    maxMs: 0,
    lastMs: 0
  };
}

function roundMs(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[index];
}

function makeCombatReadabilityState() {
  return {
    enemies: new Map(),
    waveTransitions: new Map(),
    completedWaveTransitions: [],
    projectileRetirements: [],
    playerHeatmap: {
      columns: 6,
      rows: 4,
      samples: 0,
      cells: Array(24).fill(0)
    },
    projectileSamples: 0,
    friendlyProjectileTotal: 0,
    hostileProjectileTotal: 0,
    friendlyProjectileMax: 0,
    hostileProjectileMax: 0,
    lastSpatialSampleAt: 0
  };
}

function summarizeDurations(values = []) {
  const finite = values.filter(Number.isFinite).map(value => Math.max(0, Number(value)));
  if (!finite.length) return { count: 0, minMs: null, averageMs: null, medianMs: null, p95Ms: null, maxMs: null };
  const total = finite.reduce((sum, value) => sum + value, 0);
  return {
    count: finite.length,
    minMs: roundMs(Math.min(...finite)),
    averageMs: roundMs(total / finite.length),
    medianMs: roundMs(percentile(finite, 50)),
    p95Ms: roundMs(percentile(finite, 95)),
    maxMs: roundMs(Math.max(...finite))
  };
}

function installStorageProbe() {
  const win = getWindow();
  const StorageCtor = win?.Storage;
  if (!StorageCtor?.prototype?.setItem || !StorageCtor?.prototype?.getItem || win[STORAGE_PATCH_KEY]) return;
  const originalSetItem = StorageCtor.prototype.setItem;
  const originalGetItem = StorageCtor.prototype.getItem;
  win[STORAGE_PATCH_KEY] = { originalSetItem, originalGetItem };
  StorageCtor.prototype.getItem = function novaMayhemStorageReadProbe(key) {
    const counters = win[FRAME_COUNTER_KEY];
    const startedAt = counters ? performance.now() : 0;
    try {
      return originalGetItem.call(this, key);
    } finally {
      if (counters) {
        const textKey = String(key ?? 'unknown');
        counters.localStorageReads = (Number(counters.localStorageReads) || 0) + 1;
        counters.localStorageReadMs = (Number(counters.localStorageReadMs) || 0) + (performance.now() - startedAt);
        counters.localStorageReadKeys = counters.localStorageReadKeys || {};
        counters.localStorageReadKeys[textKey] = (Number(counters.localStorageReadKeys[textKey]) || 0) + 1;
      }
    }
  };
  StorageCtor.prototype.setItem = function novaMayhemStorageProbe(key, value) {
    const counters = win[FRAME_COUNTER_KEY];
    const startedAt = counters ? performance.now() : 0;
    try {
      return originalSetItem.call(this, key, value);
    } finally {
      if (counters) {
        const textKey = String(key ?? 'unknown');
        counters.localStorageWrites = (Number(counters.localStorageWrites) || 0) + 1;
        counters.localStorageWriteMs = (Number(counters.localStorageWriteMs) || 0) + (performance.now() - startedAt);
        counters.localStorageWriteBytes = (Number(counters.localStorageWriteBytes) || 0) + String(value ?? '').length;
        counters.localStorageKeys = counters.localStorageKeys || {};
        counters.localStorageKeys[textKey] = (Number(counters.localStorageKeys[textKey]) || 0) + 1;
      }
    }
  };
}

function startFrameCounters() {
  const win = getWindow();
  if (!win) return null;
  const counters = {
    sfxAttempts: 0,
    sfxPlayed: 0,
    sfxSuppressed: 0,
    localStorageReads: 0,
    localStorageReadMs: 0,
    localStorageReadKeys: {},
    localStorageWrites: 0,
    localStorageWriteMs: 0,
    localStorageWriteBytes: 0,
    localStorageKeys: {},
    lastSfxEvent: null
  };
  win[FRAME_COUNTER_KEY] = counters;
  return counters;
}

function consumeFrameCounters() {
  const win = getWindow();
  const counters = win?.[FRAME_COUNTER_KEY] || null;
  if (win && counters) delete win[FRAME_COUNTER_KEY];
  if (!counters) {
    return {
      sfxAttempts: 0,
      sfxPlayed: 0,
      sfxSuppressed: 0,
      localStorageReads: 0,
      localStorageReadMs: 0,
      localStorageReadKeys: {},
      localStorageWrites: 0,
      localStorageWriteMs: 0,
      localStorageWriteBytes: 0,
      localStorageKeys: {},
      lastSfxEvent: null
    };
  }
  return {
    sfxAttempts: Math.max(0, Math.floor(Number(counters.sfxAttempts) || 0)),
    sfxPlayed: Math.max(0, Math.floor(Number(counters.sfxPlayed) || 0)),
    sfxSuppressed: Math.max(0, Math.floor(Number(counters.sfxSuppressed) || 0)),
    localStorageReads: Math.max(0, Math.floor(Number(counters.localStorageReads) || 0)),
    localStorageReadMs: roundMs(counters.localStorageReadMs),
    localStorageReadKeys: { ...(counters.localStorageReadKeys || {}) },
    localStorageWrites: Math.max(0, Math.floor(Number(counters.localStorageWrites) || 0)),
    localStorageWriteMs: roundMs(counters.localStorageWriteMs),
    localStorageWriteBytes: Math.max(0, Math.floor(Number(counters.localStorageWriteBytes) || 0)),
    localStorageKeys: { ...(counters.localStorageKeys || {}) },
    lastSfxEvent: counters.lastSfxEvent || null
  };
}

function makeFrameCounterTotals() {
  return {
    sfxAttempts: 0,
    sfxPlayed: 0,
    sfxSuppressed: 0,
    localStorageReads: 0,
    localStorageReadMs: 0,
    localStorageReadKeys: {},
    localStorageWrites: 0,
    localStorageWriteMs: 0,
    localStorageWriteBytes: 0,
    localStorageKeys: {},
    lastSfxEvent: null
  };
}

function addFrameCounterTotals(totals, counters) {
  if (!totals || !counters) return;
  totals.sfxAttempts += Number(counters.sfxAttempts) || 0;
  totals.sfxPlayed += Number(counters.sfxPlayed) || 0;
  totals.sfxSuppressed += Number(counters.sfxSuppressed) || 0;
  totals.localStorageReads += Number(counters.localStorageReads) || 0;
  totals.localStorageReadMs = roundMs((Number(totals.localStorageReadMs) || 0) + (Number(counters.localStorageReadMs) || 0));
  totals.localStorageWrites += Number(counters.localStorageWrites) || 0;
  totals.localStorageWriteMs = roundMs((Number(totals.localStorageWriteMs) || 0) + (Number(counters.localStorageWriteMs) || 0));
  totals.localStorageWriteBytes += Number(counters.localStorageWriteBytes) || 0;
  if (counters.lastSfxEvent) totals.lastSfxEvent = counters.lastSfxEvent;
  for (const [key, count] of Object.entries(counters.localStorageReadKeys || {})) {
    totals.localStorageReadKeys[key] = (Number(totals.localStorageReadKeys[key]) || 0) + (Number(count) || 0);
  }
  for (const [key, count] of Object.entries(counters.localStorageKeys || {})) {
    totals.localStorageKeys[key] = (Number(totals.localStorageKeys[key]) || 0) + (Number(count) || 0);
  }
}

function getFrameTiming(scene, delta) {
  const timing = scene?.game?.lastTickerFrameTiming || {};
  const fallbackDelta = Number.isFinite(delta) ? delta : 0;
  const rawDelta = Number.isFinite(timing.rawDelta) ? timing.rawDelta : fallbackDelta;
  const clampedDelta = Number.isFinite(timing.clampedDelta) ? timing.clampedDelta : fallbackDelta;
  return {
    source: timing.source || 'unknown',
    rawDelta: roundMs(rawDelta),
    clampedDelta: roundMs(clampedDelta),
    rawDeltaMs: roundMs(Number.isFinite(timing.rawDeltaMs) ? timing.rawDeltaMs : rawDelta * (1000 / 60)),
    clampedDeltaMs: roundMs(Number.isFinite(timing.clampedDeltaMs) ? timing.clampedDeltaMs : clampedDelta * (1000 / 60)),
    simulationStepsPerRender: Math.max(0, Math.floor(Number(timing.simulationStepsPerRender) || 1)),
    interpolationAlpha: Number.isFinite(timing.interpolationAlpha) ? roundMs(timing.interpolationAlpha) : null,
    timeScale: Number.isFinite(timing.timeScale) ? roundMs(timing.timeScale) : 1
  };
}

function getCombatTiming(scene) {
  const freezeTimerMs = Math.max(0, Number(scene?.freezeTimerMs) || 0);
  const screenShakeFreezeFrames = Math.max(0, Number(scene?.screenShake?.freezeFrames) || 0);
  const activePowerup = scene?.player?.activePowerup;
  const plasmaLanceActive = activePowerup?.type === 'plasma_lance';
  return {
    plasmaLanceActive,
    plasmaLanceRemainingMs: plasmaLanceActive
      ? Math.max(0, Math.round(scene?.player?.getActivePowerupRemainingMs?.() || activePowerup?.remainingMs || 0))
      : 0,
    hitStopActive: freezeTimerMs > 0,
    hitStopRequestedMs: Math.max(0, Number(scene?.lastHitStopRequestMs) || 0),
    hitStopRemainingMs: roundMs(freezeTimerMs),
    screenShakeFreezeFrames: roundMs(screenShakeFreezeFrames),
    timeScale: freezeTimerMs > 0 ? 0 : 1
  };
}

function getDisplayTreeCounts(root) {
  if (!root) return { activeTextObjects: 0, displayObjectCount: 0 };
  let activeTextObjects = 0;
  let displayObjectCount = 0;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || node.destroyed) continue;
    displayObjectCount += 1;
    const constructorName = node.constructor?.name || '';
    if (node.visible !== false && (constructorName === 'Text' || constructorName === 'BitmapText')) {
      activeTextObjects += 1;
    }
    if (Array.isArray(node.children)) stack.push(...node.children);
  }
  return { activeTextObjects, displayObjectCount };
}

function getCounts(scene, includeDisplayTree = false) {
  const bulletManager = scene?.bulletManager;
  const enemyManager = scene?.enemyManager;
  const playerBullets = bulletManager?.playerBullets?.length || 0;
  const enemyBullets = bulletManager?.enemyBullets?.length || 0;
  const pendingEnemyBullets = bulletManager?.pendingEnemyBullets?.length || 0;
  const particles = scene?.particleManager?.particles?.length || 0;
  const scorePopups = scene?.scorePopupManager?.popups?.length || 0;
  const pendingScorePopups = scene?.scorePopupManager?.pendingPopups?.length || 0;
  const displayTree = includeDisplayTree
    ? getDisplayTreeCounts(scene?.container || scene?.gameContainer)
    : { activeTextObjects: null, displayObjectCount: null };
  const persistence = getWindow()?.__novaSteamCloudDiagnostics?.getSchedulerState?.() || null;
  return {
    sector: Math.max(1, Math.floor(Number(scene?.game?.level) || 1)),
    score: Math.max(0, Math.floor(Number(scene?.game?.score) || 0)),
    lives: Math.max(0, Math.floor(Number(scene?.game?.lives) || 0)),
    runMode: scene?.game?.runMode || 'unknown',
    enemyManagerState: enemyManager?.state || null,
    tacticalDraftActive: scene?.tacticalDraft?.active === true,
    overrunInterludeActive: scene?.overrunMilestoneInterlude?.active === true,
    paused: scene?.isPaused === true,
    enemies: enemyManager?.enemies?.length || 0,
    enemyCount: enemyManager?.enemies?.length || 0,
    bossActive: Boolean(enemyManager?.boss?.active),
    playerBullets,
    enemyBullets,
    pendingEnemyBullets,
    projectileCount: playerBullets + enemyBullets + pendingEnemyBullets,
    particles,
    particleCount: particles,
    particlePoolCount: scene?.particleManager?.pool?.length || 0,
    energyBloomCount: scene?.particleManager?.energyBlooms?.length || 0,
    energyBloomPoolCount: scene?.particleManager?.energyBloomPool?.length || 0,
    scorePopups,
    pendingScorePopups,
    combatTextCount: scorePopups + pendingScorePopups,
    activeTextObjects: displayTree.activeTextObjects,
    displayObjectCount: displayTree.displayObjectCount,
    gameContainerChildCount: scene?.gameContainer?.children?.length || 0,
    pendingCloudSyncCount: persistence?.pendingCloudSyncCount || 0,
    activePersistenceOperations: persistence?.activeOperations || 0,
    bossHazards: scene?.bossHazards?.length || 0,
    ambientBonusDrones: scene?.ambientBonusDrones?.length || 0,
    deferredThreatDefeats: scene?.deferredThreatDefeats?.length || 0,
    deferredThreatDefeatStats: scene?.deferredThreatDefeatStats || null,
    collision: scene?.collisionDiagnosticStats || null,
    timing: getCombatTiming(scene)
  };
}

function getMemorySignal() {
  const win = getWindow();
  const memory = win?.performance?.memory;
  if (!memory) return null;
  return {
    usedJSHeapSize: Math.round(Number(memory.usedJSHeapSize) || 0),
    totalJSHeapSize: Math.round(Number(memory.totalJSHeapSize) || 0),
    jsHeapSizeLimit: Math.round(Number(memory.jsHeapSizeLimit) || 0)
  };
}

function getFrameTopSections(sections = {}) {
  return Object.entries(sections)
    .map(([label, ms]) => ({ label, ms: roundMs(ms) }))
    .sort((a, b) => b.ms - a.ms);
}

function getSlowFrameCost(sample = {}) {
  return Math.max(Number(sample.frameMs) || 0, Number(sample.preFrameGapMs) || 0);
}

class MayhemPerformanceDiagnostics {
  constructor(scene) {
    this.scene = scene;
    this.options = readMayhemPerformanceDiagnosticsOptions();
    this.enabled = Boolean(this.options.enabled);
    this.sessionId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
    this.samples = [];
    this.frameTimes = [];
    this.preFrameGaps = [];
    this.slowFrames = [];
    this.longFrameBuckets = {
      over20Ms: 0,
      over25Ms: 0,
      over33Ms: 0,
      over50Ms: 0
    };
    this.frameCounterTotals = makeFrameCounterTotals();
    this.sections = new Map();
    this.frameStartedAt = 0;
    this.previousFrameStartedAt = 0;
    this.lastOverlayUpdateAt = 0;
    this.lastReportWriteAt = 0;
    this.lastWrittenSlowFrameCount = 0;
    this.lastWriteResult = null;
    this.reportWritePending = false;
    this.periodicWriteInterval = null;
    this.initialWriteTimeout = null;
    this.lastCounts = getCounts(scene);
    this.pendingEvents = [];
    this.eventLog = [];
    this.eventCounts = {};
    this.pendingLongFrameContexts = [];
    this.longFrameContexts = [];
    this.combatReadability = makeCombatReadabilityState();
    this.overlay = null;
    this.hotkeyHandler = this.handleHotkey.bind(this);
    this.visibilityHandler = this.handleVisibilityChange.bind(this);
    this.installHotkeys();
    this.installLifecycleFlush();
    this.installPeriodicWrites();
    this.publishGlobal();
    if (this.enabled) installStorageProbe();
    if (this.enabled && this.options.showOverlay) this.ensureOverlay();
  }

  installHotkeys() {
    const win = getWindow();
    if (!win?.addEventListener) return;
    win.addEventListener('keydown', this.hotkeyHandler);
  }

  installLifecycleFlush() {
    const win = getWindow();
    if (!win?.addEventListener) return;
    win.addEventListener('pagehide', this.visibilityHandler);
    win.document?.addEventListener?.('visibilitychange', this.visibilityHandler);
  }

  installPeriodicWrites() {
    // Keep the capture in memory during play. Serializing and writing a large
    // diagnostic report from the frame that is being diagnosed would perturb
    // the measurement and can create the exact kind of stall we are tracing.
    // Reports are exported manually or at lifecycle-safe visibility/destroy points.
  }

  destroy() {
    const win = getWindow();
    if (win?.removeEventListener) win.removeEventListener('keydown', this.hotkeyHandler);
    if (win?.removeEventListener) win.removeEventListener('pagehide', this.visibilityHandler);
    win?.document?.removeEventListener?.('visibilitychange', this.visibilityHandler);
    if (this.initialWriteTimeout && win?.clearTimeout) win.clearTimeout(this.initialWriteTimeout);
    if (this.periodicWriteInterval && win?.clearInterval) win.clearInterval(this.periodicWriteInterval);
    this.writeReport('scene_destroy');
    if (this.overlay?.parentNode) this.overlay.parentNode.removeChild(this.overlay);
    this.overlay = null;
    if (win?.[GLOBAL_KEY]?.owner === this) {
      delete win[GLOBAL_KEY];
    }
  }

  handleHotkey(event) {
    if (!event?.ctrlKey || !event?.shiftKey) return;
    if (event.code === 'F8') {
      event.preventDefault?.();
      this.setOptions({ showOverlay: !this.options.showOverlay });
      return;
    }
    const key = HOTKEYS[event.code];
    if (!key || !this.enabled) return;
    event.preventDefault?.();
    this.setOptions({ [key]: !this.options[key] });
  }

  publishGlobal() {
    const win = getWindow();
    if (!win) return;
    win[GLOBAL_KEY] = {
      owner: this,
      getReport: () => this.getReport(),
      getOptions: () => ({ ...this.options }),
      setOptions: (options = {}) => this.setOptions(options),
      enable: (options = {}) => this.setOptions({ ...options, enabled: true }),
      disable: () => this.setOptions({ enabled: false }),
      mark: (label, details = {}) => this.mark(label, details),
      reset: () => this.resetSamples(),
      writeReport: (reason = 'manual') => this.writeReport(reason),
      exportJson: () => JSON.stringify(this.getReport(), null, 2)
    };
  }

  setOptions(options = {}) {
    this.options = normalizeOptions({ ...this.options, ...options });
    if (AUTO_DIAGNOSTICS_ENABLED) this.options.enabled = true;
    this.enabled = Boolean(this.options.enabled);
    if (this.enabled) installStorageProbe();
    safeWriteStorage(this.options);
    if (this.enabled && this.options.showOverlay) {
      this.ensureOverlay();
      this.updateOverlay(true);
    } else if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    return { ...this.options };
  }

  resetSamples() {
    this.samples = [];
    this.frameTimes = [];
    this.preFrameGaps = [];
    this.slowFrames = [];
    this.longFrameBuckets = {
      over20Ms: 0,
      over25Ms: 0,
      over33Ms: 0,
      over50Ms: 0
    };
    this.frameCounterTotals = makeFrameCounterTotals();
    this.sections.clear();
    this.pendingEvents = [];
    this.eventLog = [];
    this.eventCounts = {};
    this.pendingLongFrameContexts = [];
    this.longFrameContexts = [];
    this.combatReadability = makeCombatReadabilityState();
  }

  handleVisibilityChange() {
    const win = getWindow();
    if (win?.document?.visibilityState === 'hidden') {
      this.writeReport('visibility_hidden');
    }
  }

  beginFrame(delta, scene = this.scene) {
    if (!this.enabled) return;
    installStorageProbe();
    startFrameCounters();
    const previousStartedAt = this.previousFrameStartedAt;
    this.frameStartedAt = performance.now();
    this.previousFrameStartedAt = this.frameStartedAt;
    this.lastCounts = getCounts(scene, false);
    const frameTiming = getFrameTiming(scene, delta);
    this.currentFrame = {
      delta: roundMs(delta),
      rawDelta: frameTiming.rawDelta,
      clampedDelta: frameTiming.clampedDelta,
      rawDeltaMs: frameTiming.rawDeltaMs,
      clampedDeltaMs: frameTiming.clampedDeltaMs,
      simulationStepsPerRender: frameTiming.simulationStepsPerRender,
      interpolationAlpha: frameTiming.interpolationAlpha,
      timeScale: frameTiming.timeScale,
      frameTiming,
      combat: getCombatTiming(scene),
      startedAt: this.frameStartedAt,
      preFrameGapMs: previousStartedAt > 0 ? roundMs(this.frameStartedAt - previousStartedAt) : 0,
      counts: this.lastCounts,
      memory: getMemorySignal(),
      sections: {},
      events: this.pendingEvents.splice(0, 24)
    };
  }

  measure(label, callback) {
    if (!this.enabled) return callback();
    const startedAt = performance.now();
    try {
      return callback();
    } finally {
      const elapsed = performance.now() - startedAt;
      this.recordSection(label, elapsed);
    }
  }

  recordSection(label, elapsed) {
    const section = this.sections.get(label) || makeSectionStats();
    section.count += 1;
    section.totalMs += elapsed;
    section.maxMs = Math.max(section.maxMs, elapsed);
    section.lastMs = elapsed;
    this.sections.set(label, section);
    if (this.currentFrame) this.currentFrame.sections[label] = roundMs(elapsed);
  }

  mark(label, details = {}) {
    if (!this.enabled || !label) return;
    const event = {
      label: String(label),
      at: roundMs(performance.now()),
      counts: getCounts(this.scene),
      details: details && typeof details === 'object' ? { ...details } : {}
    };
    if (this.currentFrame) {
      this.currentFrame.events = [...(this.currentFrame.events || []), event].slice(-24);
    } else {
      this.pendingEvents.push(event);
      if (this.pendingEvents.length > 48) this.pendingEvents.shift();
    }
    this.eventLog.push(event);
    if (this.eventLog.length > 180) this.eventLog.shift();
    this.eventCounts[event.label] = (Number(this.eventCounts[event.label]) || 0) + 1;
    for (const context of this.pendingLongFrameContexts) {
      if (event.at >= context.windowStartAt && event.at <= context.captureUntilAt) {
        context.events.push(event);
      }
    }
    this.recordCombatReadabilityEvent(event.label, event.details);
  }

  finalizeLongFrameContexts(now = performance.now()) {
    const stillPending = [];
    for (const context of this.pendingLongFrameContexts) {
      if (now < context.captureUntilAt) {
        stillPending.push(context);
        continue;
      }
      this.longFrameContexts.push({
        ...context,
        events: context.events.slice(-60)
      });
      if (this.longFrameContexts.length > 60) this.longFrameContexts.shift();
    }
    this.pendingLongFrameContexts = stillPending;
  }

  recordCombatReadabilityEvent(label, details = {}) {
    const state = this.combatReadability;
    if (!state || !String(label).includes('combat_readability') && label !== 'wave_clear.objectives_zero') return;
    const atMs = Number(details.atMs) || Date.now();
    if (label === 'combat_readability.enemy_spawn') {
      state.enemies.set(details.id, {
        id: details.id,
        kind: details.kind || 'enemy',
        signature: Boolean(details.signature),
        boss: Boolean(details.boss),
        spawnedAtMs: atMs,
        firstAttackAtMs: null,
        deathAtMs: null
      });
      return;
    }
    if (label === 'combat_readability.enemy_first_attack') {
      const enemy = state.enemies.get(details.id);
      if (enemy && !enemy.firstAttackAtMs) enemy.firstAttackAtMs = atMs;
      return;
    }
    if (label === 'combat_readability.enemy_death') {
      const enemy = state.enemies.get(details.id);
      if (enemy && !enemy.deathAtMs) {
        enemy.deathAtMs = atMs;
        enemy.attackedBeforeDeath = Boolean(details.attackedBeforeDeath || enemy.firstAttackAtMs);
      }
      return;
    }
    if (label === 'wave_clear.objectives_zero') {
      const key = `${details.level || 0}:${details.wave || 0}`;
      state.waveTransitions.set(key, {
        key,
        level: details.level || null,
        wave: details.wave || null,
        objectivesZeroAtMs: atMs,
        presentationAtMs: null,
        activeAtMs: null
      });
      return;
    }
    if (label === 'combat_readability.wave_clear_presentation') {
      const key = `${details.level || 0}:${details.wave || 0}`;
      const transition = state.waveTransitions.get(key);
      if (transition) {
        transition.presentationAtMs = atMs;
        transition.cleanupDurationMs = Number.isFinite(details.cleanupDurationMs)
          ? Number(details.cleanupDurationMs)
          : Math.max(0, atMs - transition.objectivesZeroAtMs);
      }
      return;
    }
    if (label === 'combat_readability.wave_transition_complete') {
      const candidates = [...state.waveTransitions.values()].filter(transition => !transition.activeAtMs);
      const transition = candidates[candidates.length - 1];
      if (transition) {
        transition.activeAtMs = atMs;
        transition.totalDurationMs = Math.max(0, atMs - transition.objectivesZeroAtMs);
        state.completedWaveTransitions.push({ ...transition });
      }
      return;
    }
    if (label === 'combat_readability.friendly_projectile_retirement') {
      state.projectileRetirements.push({
        atMs,
        count: Math.max(0, Number(details.count) || 0),
        durationMs: Math.max(0, Number(details.durationMs) || 0)
      });
      if (state.projectileRetirements.length > 24) state.projectileRetirements.shift();
    }
  }

  sampleCombatReadability(scene = this.scene) {
    const state = this.combatReadability;
    const now = performance.now();
    if (!state || now - state.lastSpatialSampleAt < 100) return;
    state.lastSpatialSampleAt = now;
    const width = Math.max(1, Number(scene?.game?.getWidth?.()) || 1);
    const height = Math.max(1, Number(scene?.game?.getHeight?.()) || 1);
    const playerX = Math.max(0, Math.min(width - 0.001, Number(scene?.player?.x) || width / 2));
    const playerY = Math.max(0, Math.min(height - 0.001, Number(scene?.player?.y) || height / 2));
    const column = Math.max(0, Math.min(state.playerHeatmap.columns - 1, Math.floor(playerX / width * state.playerHeatmap.columns)));
    const row = Math.max(0, Math.min(state.playerHeatmap.rows - 1, Math.floor(playerY / height * state.playerHeatmap.rows)));
    state.playerHeatmap.cells[row * state.playerHeatmap.columns + column] += 1;
    state.playerHeatmap.samples += 1;
    const friendlyCount = scene?.bulletManager?.playerBullets?.filter(bullet => bullet?.active !== false).length || 0;
    const hostileCount = scene?.bulletManager?.enemyBullets?.filter(bullet => bullet?.active !== false).length || 0;
    state.projectileSamples += 1;
    state.friendlyProjectileTotal += friendlyCount;
    state.hostileProjectileTotal += hostileCount;
    state.friendlyProjectileMax = Math.max(state.friendlyProjectileMax, friendlyCount);
    state.hostileProjectileMax = Math.max(state.hostileProjectileMax, hostileCount);
  }

  getCombatReadabilityReport() {
    const state = this.combatReadability;
    const defeated = [...state.enemies.values()].filter(enemy => Number.isFinite(enemy.deathAtMs));
    const attacked = defeated.filter(enemy => Number.isFinite(enemy.firstAttackAtMs));
    const signatureDefeated = defeated.filter(enemy => enemy.signature);
    const signatureAttacked = signatureDefeated.filter(enemy => enemy.attackedBeforeDeath);
    const bossDefeated = defeated.filter(enemy => enemy.boss);
    const heatmapSamples = Math.max(1, state.playerHeatmap.samples);
    return {
      enemySpawnToFirstAttack: summarizeDurations(attacked.map(enemy => enemy.firstAttackAtMs - enemy.spawnedAtMs)),
      enemySpawnToDeath: summarizeDurations(defeated.map(enemy => enemy.deathAtMs - enemy.spawnedAtMs)),
      signatureEnemies: {
        defeated: signatureDefeated.length,
        attackedBeforeDeath: signatureAttacked.length,
        attackedBeforeDeathPercent: signatureDefeated.length
          ? roundMs(signatureAttacked.length / signatureDefeated.length * 100)
          : null
      },
      bossTimeToKill: summarizeDurations(bossDefeated.map(enemy => enemy.deathAtMs - enemy.spawnedAtMs)),
      waveClearCleanupDuration: summarizeDurations(
        [...state.waveTransitions.values()].map(transition => transition.cleanupDurationMs)
      ),
      waveClearToNextActive: summarizeDurations(
        state.completedWaveTransitions.map(transition => transition.totalDurationMs)
      ),
      projectileCounts: {
        samples: state.projectileSamples,
        friendlyAverage: state.projectileSamples
          ? roundMs(state.friendlyProjectileTotal / state.projectileSamples)
          : null,
        hostileAverage: state.projectileSamples
          ? roundMs(state.hostileProjectileTotal / state.projectileSamples)
          : null,
        friendlyMax: state.friendlyProjectileMax,
        hostileMax: state.hostileProjectileMax
      },
      playerPositionHeatmap: {
        columns: state.playerHeatmap.columns,
        rows: state.playerHeatmap.rows,
        samples: state.playerHeatmap.samples,
        cells: state.playerHeatmap.cells.map(count => ({
          count,
          percent: roundMs(count / heatmapSamples * 100)
        }))
      },
      projectileRetirements: state.projectileRetirements.map(entry => ({ ...entry }))
    };
  }

  endFrame(scene = this.scene) {
    if (!this.enabled || !this.currentFrame) return;
    const elapsed = performance.now() - this.frameStartedAt;
    const frameCounters = consumeFrameCounters();
    addFrameCounterTotals(this.frameCounterTotals, frameCounters);
    this.finalizeLongFrameContexts();
    const counts = getCounts(scene, true);
    this.sampleCombatReadability(scene);
    const frameTiming = getFrameTiming(scene, this.currentFrame.delta);
    const combat = getCombatTiming(scene);
    const sample = {
      ...this.currentFrame,
      frameMs: roundMs(elapsed),
      rawDelta: frameTiming.rawDelta,
      clampedDelta: frameTiming.clampedDelta,
      rawDeltaMs: frameTiming.rawDeltaMs,
      clampedDeltaMs: frameTiming.clampedDeltaMs,
      simulationStepsPerRender: frameTiming.simulationStepsPerRender,
      interpolationAlpha: frameTiming.interpolationAlpha,
      timeScale: frameTiming.timeScale,
      frameTiming,
      combat,
      frameCounters,
      counts: {
        ...counts,
        timing: combat
      },
      memory: getMemorySignal(),
      topSections: getFrameTopSections(this.currentFrame.sections)
    };
    this.samples.push(sample);
    this.frameTimes.push(Math.max(sample.frameMs, Number(sample.preFrameGapMs) || 0));
    this.preFrameGaps.push(Number(sample.preFrameGapMs) || 0);
    if (this.frameTimes.length > 20000) this.frameTimes.shift();
    if (this.preFrameGaps.length > 20000) this.preFrameGaps.shift();
    this.lastCounts = sample.counts;
    if (this.samples.length > 900) this.samples.shift();
    const frameCost = elapsed;
    const gapCost = Number(sample.preFrameGapMs) || 0;
    const observedFrameCost = Math.max(frameCost, gapCost);
    if (observedFrameCost >= SLOW_FRAME_MS) this.longFrameBuckets.over20Ms += 1;
    if (observedFrameCost >= NOTICEABLE_SLOW_FRAME_MS) this.longFrameBuckets.over25Ms += 1;
    if (observedFrameCost >= IMPORTANT_SLOW_FRAME_MS) this.longFrameBuckets.over33Ms += 1;
    if (observedFrameCost >= SEVERE_SLOW_FRAME_MS) this.longFrameBuckets.over50Ms += 1;
    if (elapsed >= SLOW_FRAME_MS || sample.preFrameGapMs >= SLOW_FRAME_MS) {
      this.slowFrames.push(sample);
      if (this.slowFrames.length > 120) this.slowFrames.shift();
      if (Math.max(elapsed, sample.preFrameGapMs) >= IMPORTANT_SLOW_FRAME_MS) {
        const frameEndedAt = performance.now();
        const windowStartAt = this.frameStartedAt - 100;
        this.pendingLongFrameContexts.push({
          frameStartedAt: this.frameStartedAt,
          frameEndedAt,
          frameMs: sample.frameMs,
          preFrameGapMs: sample.preFrameGapMs,
          windowStartAt,
          captureUntilAt: frameEndedAt + 100,
          counts: sample.counts,
          topSections: sample.topSections,
          events: this.eventLog.filter((event) => event.at >= windowStartAt && event.at <= frameEndedAt)
        });
        if (this.pendingLongFrameContexts.length > 12) {
          const oldest = this.pendingLongFrameContexts.shift();
          this.longFrameContexts.push(oldest);
        }
      }
      this.scheduleReportWrite(Math.max(frameCost, gapCost) >= IMPORTANT_SLOW_FRAME_MS ? 'important_slow_frame' : 'slow_frame');
    }
    this.currentFrame = null;
    this.updateOverlay(false);
  }

  scheduleReportWrite(reason = 'scheduled') {
    // Captures remain memory-only while the scene is active. Retain the latest
    // reason for the eventual manual/lifecycle export without scheduling work.
    this.pendingAutoWriteReason = reason;
  }

  async writeReport(reason = 'manual') {
    if (!this.enabled) return null;
    const report = this.getReport();
    const payload = {
      ...report,
      reason,
      sessionId: this.sessionId,
      buildId: this.scene?.game?.buildId || null,
      generatedAt: new Date().toISOString()
    };
    const win = getWindow();
    try {
      win?.localStorage?.setItem?.(STORAGE_REPORT_KEY, JSON.stringify(payload));
    } catch {
      // Browser storage is best-effort only.
    }
    this.lastReportWriteAt = Date.now();
    this.lastWrittenSlowFrameCount = this.slowFrames.length;
    if (win?.__novaPerformanceDiagnostics?.writeReport) {
      try {
        this.lastWriteResult = await win.__novaPerformanceDiagnostics.writeReport(payload);
      } catch (error) {
        this.lastWriteResult = { ok: false, error: error?.message || String(error) };
      }
    } else {
      this.lastWriteResult = { ok: false, reason: 'native_writer_unavailable' };
    }
    return this.lastWriteResult;
  }

  ensureOverlay() {
    const win = getWindow();
    if (!win?.document) return null;
    if (this.overlay) {
      this.overlay.style.display = 'block';
      return this.overlay;
    }
    const overlay = win.document.createElement('div');
    overlay.setAttribute('data-nova-mayhem-performance-diagnostics', 'true');
    overlay.style.cssText = [
      'position:fixed',
      'left:10px',
      'top:10px',
      'z-index:2147483647',
      'max-width:390px',
      'padding:8px 10px',
      'background:rgba(1,6,14,0.82)',
      'border:1px solid rgba(125,255,204,0.72)',
      'box-shadow:0 0 18px rgba(55,245,255,0.18)',
      'color:#d7fbff',
      'font:12px/1.35 Consolas, Monaco, monospace',
      'white-space:pre',
      'pointer-events:none',
      'border-radius:4px'
    ].join(';');
    win.document.body.appendChild(overlay);
    this.overlay = overlay;
    return overlay;
  }

  updateOverlay(force) {
    if (!this.enabled || !this.options.showOverlay) return;
    const now = performance.now();
    if (!force && now - this.lastOverlayUpdateAt < 250) return;
    this.lastOverlayUpdateAt = now;
    const overlay = this.ensureOverlay();
    if (!overlay) return;
    const report = this.getReport();
    const latest = report.recentSamples[report.recentSamples.length - 1] || {};
    const top = report.topSections.slice(0, 4)
      .map((section) => `${section.label}:${section.lastMs.toFixed(2)}ms`)
      .join(' ');
    const counts = report.lastCounts;
    const toggles = Object.entries(this.options)
      .filter(([key, value]) => key !== 'enabled' && value)
      .map(([key]) => key)
      .join(', ') || 'none';
    overlay.textContent = [
      'NOVA PERF DIAG  Ctrl+Shift+F8',
      `frame avg/p95/max ${report.frame.avgMs.toFixed(2)} / ${report.frame.p95Ms.toFixed(2)} / ${report.frame.maxMs.toFixed(2)} ms`,
      `delta raw/clamp ${Number(latest.rawDeltaMs || 0).toFixed(2)} / ${Number(latest.clampedDeltaMs || 0).toFixed(2)} ms  long ${report.longFrames.over20Ms}/${report.longFrames.over33Ms}/${report.longFrames.over50Ms}`,
      `sector ${counts.sector} ${counts.runMode}  enemies ${counts.enemies}  bullets ${counts.playerBullets}/${counts.enemyBullets}`,
      `particles ${counts.particles}  popups ${counts.scorePopups}  plasma ${counts.timing?.plasmaLanceActive ? 'on' : 'off'}  hitstop ${counts.timing?.hitStopRemainingMs || 0}ms`,
      `sfx ${latest.frameCounters?.sfxPlayed || 0}/${latest.frameCounters?.sfxAttempts || 0}  storage ${latest.frameCounters?.localStorageWrites || 0}`,
      `top ${top || 'collecting...'}`,
      `toggles ${toggles}`,
      `log ${this.lastWriteResult?.latestPath || this.lastWriteResult?.reason || 'pending'}`
    ].join('\n');
  }

  getReport() {
    this.finalizeLongFrameContexts();
    const frameValues = this.frameTimes;
    const preFrameGapValues = this.preFrameGaps;
    const maxMs = frameValues.length ? Math.max(...frameValues) : 0;
    const avgMs = frameValues.length
      ? frameValues.reduce((sum, value) => sum + value, 0) / frameValues.length
      : 0;
    const topSections = [...this.sections.entries()]
      .map(([label, stats]) => ({
        label,
        count: stats.count,
        lastMs: roundMs(stats.lastMs),
        avgMs: roundMs(stats.totalMs / Math.max(1, stats.count)),
        maxMs: roundMs(stats.maxMs)
      }))
      .sort((a, b) => b.lastMs - a.lastMs);
    return {
      enabled: this.enabled,
      sessionId: this.sessionId,
      options: { ...this.options },
      sampleCount: this.samples.length,
      slowFrameCount: this.slowFrames.length,
      frame: {
        avgMs: roundMs(avgMs),
        p50Ms: roundMs(percentile(frameValues, 50)),
        p95Ms: roundMs(percentile(frameValues, 95)),
        p99Ms: roundMs(percentile(frameValues, 99)),
        maxMs: roundMs(maxMs),
        preFrameGapP95Ms: roundMs(percentile(preFrameGapValues, 95)),
        preFrameGapMaxMs: roundMs(preFrameGapValues.length ? Math.max(...preFrameGapValues) : 0)
      },
      lastCounts: this.lastCounts,
      longFrames: { ...this.longFrameBuckets },
      frameCounterTotals: {
        ...this.frameCounterTotals,
        localStorageReadKeys: { ...this.frameCounterTotals.localStorageReadKeys },
        localStorageKeys: { ...this.frameCounterTotals.localStorageKeys }
      },
      lastWriteResult: this.lastWriteResult,
      topSections,
      recentEvents: this.eventLog.slice(-60),
      eventCounts: { ...this.eventCounts },
      recentLongFrameContexts: [
        ...this.longFrameContexts,
        ...this.pendingLongFrameContexts
      ].slice(-40),
      combatReadability: this.getCombatReadabilityReport(),
      recentSamples: this.samples.slice(-30),
      recentSlowFrames: this.slowFrames.slice(-40),
      worstSlowFrames: [...this.slowFrames]
        .sort((a, b) => getSlowFrameCost(b) - getSlowFrameCost(a))
        .slice(0, 20),
      worstSlowFrame: [...this.slowFrames]
        .sort((a, b) => getSlowFrameCost(b) - getSlowFrameCost(a))[0] || null
    };
  }
}

export function createMayhemPerformanceDiagnostics(scene) {
  return new MayhemPerformanceDiagnostics(scene);
}

export function markMayhemPerformanceEvent(label, details = {}) {
  getWindow()?.[GLOBAL_KEY]?.mark?.(label, details);
}

export function isMayhemPerformanceDiagnosticsActive() {
  return getWindow()?.[GLOBAL_KEY]?.owner?.enabled === true;
}

export function measureMayhemPerformanceScope(label, callback) {
  const owner = getWindow()?.[GLOBAL_KEY]?.owner;
  return owner?.measure ? owner.measure(label, callback) : callback();
}

export function recordMayhemPerformanceDuration(label, elapsedMs) {
  const owner = getWindow()?.[GLOBAL_KEY]?.owner;
  if (owner?.enabled && Number.isFinite(Number(elapsedMs))) {
    owner.recordSection(label, Math.max(0, Number(elapsedMs)));
  }
}
