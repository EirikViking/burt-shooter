const STORAGE_KEY = 'novaSwarm.mayhemPerformanceDiagnostics.v1';
const GLOBAL_KEY = '__novaMayhemPerformanceDiagnostics';

const DEFAULT_OPTIONS = Object.freeze({
  enabled: false,
  hideHighscoreChase: false,
  hudLite: false,
  noParticles: false,
  noStarfield: false,
  noScorePopups: false,
  noLeaderboardTargets: false
});

const HOTKEYS = Object.freeze({
  Digit1: 'hideHighscoreChase',
  Digit2: 'hudLite',
  Digit3: 'noParticles',
  Digit4: 'noStarfield',
  Digit5: 'noScorePopups',
  Digit6: 'noLeaderboardTargets'
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
      hideHighscoreChase: Boolean(options.hideHighscoreChase),
      hudLite: Boolean(options.hudLite),
      noParticles: Boolean(options.noParticles),
      noStarfield: Boolean(options.noStarfield),
      noScorePopups: Boolean(options.noScorePopups),
      noLeaderboardTargets: Boolean(options.noLeaderboardTargets)
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
      enabled: parseBoolean(params.get('novaPerfDiag'), undefined),
      hideHighscoreChase: parseBoolean(params.get('novaDiagHideHighscore'), undefined),
      hudLite: parseBoolean(params.get('novaDiagHudLite'), undefined),
      noParticles: parseBoolean(params.get('novaDiagNoParticles'), undefined),
      noStarfield: parseBoolean(params.get('novaDiagNoStarfield'), undefined),
      noScorePopups: parseBoolean(params.get('novaDiagNoScorePopups'), undefined),
      noLeaderboardTargets: parseBoolean(params.get('novaDiagNoLeaderboardTargets'), undefined)
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
  return normalizeOptions({
    ...safeReadStorage(),
    ...readQueryOptions()
  });
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

function getCounts(scene) {
  const bulletManager = scene?.bulletManager;
  const enemyManager = scene?.enemyManager;
  return {
    sector: Math.max(1, Math.floor(Number(scene?.game?.level) || 1)),
    score: Math.max(0, Math.floor(Number(scene?.game?.score) || 0)),
    lives: Math.max(0, Math.floor(Number(scene?.game?.lives) || 0)),
    runMode: scene?.game?.runMode || 'unknown',
    enemies: enemyManager?.enemies?.length || 0,
    bossActive: Boolean(enemyManager?.boss?.active),
    playerBullets: bulletManager?.playerBullets?.length || 0,
    enemyBullets: bulletManager?.enemyBullets?.length || 0,
    pendingEnemyBullets: bulletManager?.pendingEnemyBullets?.length || 0,
    particles: scene?.particleManager?.particles?.length || 0,
    scorePopups: scene?.scorePopupManager?.popups?.length || 0,
    bossHazards: scene?.bossHazards?.length || 0,
    ambientBonusDrones: scene?.ambientBonusDrones?.length || 0
  };
}

class MayhemPerformanceDiagnostics {
  constructor(scene) {
    this.scene = scene;
    this.options = readMayhemPerformanceDiagnosticsOptions();
    this.enabled = Boolean(this.options.enabled);
    this.samples = [];
    this.slowFrames = [];
    this.sections = new Map();
    this.frameStartedAt = 0;
    this.lastOverlayUpdateAt = 0;
    this.lastCounts = getCounts(scene);
    this.overlay = null;
    this.hotkeyHandler = this.handleHotkey.bind(this);
    this.installHotkeys();
    this.publishGlobal();
    if (this.enabled) this.ensureOverlay();
  }

  installHotkeys() {
    const win = getWindow();
    if (!win?.addEventListener) return;
    win.addEventListener('keydown', this.hotkeyHandler);
  }

  destroy() {
    const win = getWindow();
    if (win?.removeEventListener) win.removeEventListener('keydown', this.hotkeyHandler);
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
      this.setOptions({ enabled: !this.enabled });
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
      reset: () => this.resetSamples()
    };
  }

  setOptions(options = {}) {
    this.options = normalizeOptions({ ...this.options, ...options });
    this.enabled = Boolean(this.options.enabled);
    safeWriteStorage(this.options);
    if (this.enabled) {
      this.ensureOverlay();
      this.updateOverlay(true);
    } else if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    return { ...this.options };
  }

  resetSamples() {
    this.samples = [];
    this.slowFrames = [];
    this.sections.clear();
  }

  beginFrame(delta, scene = this.scene) {
    if (!this.enabled) return;
    this.frameStartedAt = performance.now();
    this.lastCounts = getCounts(scene);
    this.currentFrame = {
      delta: roundMs(delta),
      startedAt: this.frameStartedAt,
      counts: this.lastCounts,
      sections: {}
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

  endFrame(scene = this.scene) {
    if (!this.enabled || !this.currentFrame) return;
    const elapsed = performance.now() - this.frameStartedAt;
    const sample = {
      ...this.currentFrame,
      frameMs: roundMs(elapsed),
      counts: getCounts(scene)
    };
    this.samples.push(sample);
    if (this.samples.length > 900) this.samples.shift();
    if (elapsed >= 20) {
      this.slowFrames.push(sample);
      if (this.slowFrames.length > 120) this.slowFrames.shift();
    }
    this.currentFrame = null;
    this.updateOverlay(false);
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
    if (!this.enabled) return;
    const now = performance.now();
    if (!force && now - this.lastOverlayUpdateAt < 250) return;
    this.lastOverlayUpdateAt = now;
    const overlay = this.ensureOverlay();
    if (!overlay) return;
    const report = this.getReport();
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
      `sector ${counts.sector} ${counts.runMode}  enemies ${counts.enemies}  bullets ${counts.playerBullets}/${counts.enemyBullets}`,
      `particles ${counts.particles}  popups ${counts.scorePopups}  hazards ${counts.bossHazards}`,
      `top ${top || 'collecting...'}`,
      `toggles ${toggles}`
    ].join('\n');
  }

  getReport() {
    const frameValues = this.samples.map((sample) => sample.frameMs);
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
      options: { ...this.options },
      sampleCount: this.samples.length,
      slowFrameCount: this.slowFrames.length,
      frame: {
        avgMs: roundMs(avgMs),
        p95Ms: roundMs(percentile(frameValues, 95)),
        maxMs: roundMs(maxMs)
      },
      lastCounts: this.lastCounts,
      topSections,
      recentSamples: this.samples.slice(-30),
      recentSlowFrames: this.slowFrames.slice(-20)
    };
  }
}

export function createMayhemPerformanceDiagnostics(scene) {
  return new MayhemPerformanceDiagnostics(scene);
}
