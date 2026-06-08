import { RunPacingConfig, getRunElapsedSeconds } from '../config/RunPacingConfig.js';
import {
  RunContentDirectorConfig,
  getContentPoolForElapsedSeconds
} from '../config/RunContentDirectorConfig.js';
import {
  getDiscoveryStats,
  readThreatDiscoveryState,
  recordRunThemeSeen
} from '../progression/ThreatDiscoveryState.js';

function hashString(value) {
  const text = String(value || 'nova-swarm');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom(list, random) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(random() * list.length)] || list[0];
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export class RunContentDirector {
  constructor(game, { seed = null } = {}) {
    this.game = game;
    this.seed = seed || `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.random = mulberry32(hashString(this.seed));
    this.runTheme = null;
    this.unseenBoostedCount = 0;
    this.recentlySuppressedCount = 0;
    this.selectionLog = [];
  }

  get enabled() {
    return RunPacingConfig.contentDirectorEnabled !== false &&
      RunContentDirectorConfig.enabled !== false;
  }

  startRun({ seed = this.seed } = {}) {
    this.seed = seed;
    this.random = mulberry32(hashString(seed));
    this.runTheme = this.pickRunTheme();
    if (this.runTheme && this.game?.isRankedRun?.()) {
      recordRunThemeSeen(this.runTheme.id, {
        name: this.runTheme.label,
        role: this.runTheme.role
      });
    }
    this.selectionLog = [];
    return this.runTheme;
  }

  pickRunTheme() {
    const useDiscoveryHistory = this.game?.isRankedRun?.() !== false;
    const state = useDiscoveryHistory ? readThreatDiscoveryState() : { items: {}, recentRunThemes: [] };
    const stats = useDiscoveryHistory ? getDiscoveryStats(state) : { totalDiscovered: 0 };
    const themes = RunContentDirectorConfig.runThemes;
    const recentlySeen = new Set(safeArray(state.recentRunThemes).slice(-2));
    const weighted = themes.map((theme, index) => {
      const seen = Boolean(state.items?.runThemes?.[theme.id]);
      const recent = recentlySeen.has(theme.id);
      let weight = 1 + (index % 3) * 0.04;
      if (!seen) {
        weight *= RunContentDirectorConfig.unseenWeightMult;
        this.unseenBoostedCount += 1;
      }
      if (recent) {
        weight *= RunContentDirectorConfig.seenRecentlyWeightMult;
        this.recentlySuppressedCount += 1;
      }
      if (stats.totalDiscovered > 25 && seen) {
        weight *= RunContentDirectorConfig.masteredContentWeightMult;
      }
      return { theme, weight };
    });
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.random() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.theme;
    }
    return themes[0];
  }

  getCurrentPool() {
    return getContentPoolForElapsedSeconds(getRunElapsedSeconds(this.game));
  }

  shapeWaveConfig(config = {}, { level = 1, waveIndex = 0 } = {}) {
    if (!this.enabled || !this.runTheme) return { ...config };
    const pool = this.getCurrentPool();
    const usePrimary = (Number(level) + Number(waveIndex)) % 3 !== 1;
    const formationPool = usePrimary
      ? safeArray(this.runTheme.primaryFormations)
      : [...safeArray(this.runTheme.secondaryFormations), ...safeArray(pool.formations)];
    const tacticPool = [...safeArray(this.runTheme.waveTactics), ...safeArray(pool.waveTactics)];
    const shaped = {
      ...config,
      formation: pickFrom(formationPool, this.random) || config.formation,
      tactic: pickFrom(tacticPool, this.random) || config.tactic,
      runTheme: this.runTheme.id,
      contentPool: pool.id
    };
    this.selectionLog.push({
      level,
      waveIndex,
      pool: pool.id,
      formation: shaped.formation,
      tactic: shaped.tactic,
      type: shaped.type
    });
    if (this.selectionLog.length > 24) this.selectionLog.shift();
    return shaped;
  }

  scoreThreatAction(action, baseScore = 1) {
    if (!this.enabled || !this.runTheme || !action) return baseScore;
    let score = baseScore;
    if (safeArray(this.runTheme.threatActions).includes(action.id)) {
      score *= RunContentDirectorConfig.runThemePrimaryWeightMult;
    }
    const pool = this.getCurrentPool();
    if (safeArray(pool.threatActions).includes(action.id)) {
      score *= RunContentDirectorConfig.runThemeSecondaryWeightMult;
    }
    if (this.game?.isRankedRun?.() === false) return score;
    const state = readThreatDiscoveryState();
    const seen = Boolean(state.items?.attackPatterns?.[action.id]);
    if (!seen) score *= RunContentDirectorConfig.unseenWeightMult;
    return score;
  }

  getDebugState() {
    const pool = this.getCurrentPool();
    return {
      enabled: this.enabled,
      seed: this.seed,
      runTheme: this.runTheme ? {
        id: this.runTheme.id,
        label: this.runTheme.label,
        role: this.runTheme.role
      } : null,
      contentPoolSummary: {
        id: pool.id,
        formations: safeArray(pool.formations).slice(),
        threatActions: safeArray(pool.threatActions).slice(),
        waveTactics: safeArray(pool.waveTactics).slice(),
        enemyLevelMin: pool.enemyLevelMin,
        enemyLevelMax: pool.enemyLevelMax
      },
      selectedEnemyFamilies: safeArray(this.runTheme?.enemyFamilies),
      selectedThreatActions: safeArray(this.runTheme?.threatActions),
      selectedWaveTactics: safeArray(this.runTheme?.waveTactics),
      selectedElitePool: safeArray(this.runTheme?.eliteRoles),
      unseenBoostedCount: this.unseenBoostedCount,
      recentlySuppressedCount: this.recentlySuppressedCount,
      recentSelections: this.selectionLog.slice(-8)
    };
  }
}
