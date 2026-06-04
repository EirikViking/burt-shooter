import * as PIXI from 'pixi.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Hijacker } from '../entities/Hijacker.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
import { getMicroMessage } from '../text/phrasePool.js';
import { AudioManager } from '../audio/AudioManager.js';
import { isHijackerEnabled } from '../config/isExtrasEnabled.js';
import { translateText } from '../i18n/index.js';
import {
  GENERATED_ENEMY_TYPES,
  getGeneratedEnemyProfile,
  getGeneratedEnemyTypeAtLevelProgress,
  pickGeneratedEnemyTypeForLevel
} from '../config/GeneratedEnemyProfiles.js';
import {
  getEnemyThreatAction,
  pickThreatActionsForWave
} from '../config/EnemyThreatActions.js';
import {
  ELITE_MIDDLE_SHIP_IDS,
  getEliteMiddleShipMaxActive,
  getEliteMiddleShipProfile,
  planEliteMiddleShipSpawns
} from '../config/EliteMiddleShips.js';
import { WAVE_TACTIC_VARIANTS } from '../config/WaveTacticVariants.js';

// TASK D: Boss system - always enabled, no gate
// Bosses are now core gameplay, spawn at end of every level
const WAVE_OBJECTIVE_FAILSAFE_MS = 45000;

const BASE_WAVE_TACTICS = [
  {
    id: 'strafe_sweep',
    minLevel: 1,
    label: 'STRAFE SWEEP',
    move: 'sweep',
    shot: 'sweep',
    volley: 'staggered',
    fireScalar: 1.12,
    fireDelayMult: 1.08,
    diveBias: 0.9,
    entrySpeed: 0.88
  },
  {
    id: 'crossfire_pincer',
    minLevel: 4,
    label: 'CROSSFIRE PINCER',
    move: 'pincer',
    shot: 'crossfire',
    volley: 'crossfire',
    fireScalar: 1.16,
    fireDelayMult: 1.02,
    diveBias: 1.15,
    entrySpeed: 0.95
  },
  {
    id: 'dive_chain',
    minLevel: 1,
    label: 'DIVE CHAIN',
    move: 'chain',
    shot: 'burst_pair',
    volley: 'staggered',
    fireScalar: 0.9,
    fireDelayMult: 1.18,
    diveBias: 2.6,
    forcedDive: true,
    entrySpeed: 0.86
  },
  {
    id: 'pulse_net',
    minLevel: 2,
    label: 'PULSE NET',
    move: 'pulse',
    shot: 'net',
    volley: 'pulse',
    fireScalar: 1.22,
    fireDelayMult: 1.0,
    diveBias: 0.55,
    entrySpeed: 1.02
  },
  {
    id: 'orbit_snare',
    minLevel: 8,
    label: 'ORBIT SNARE',
    move: 'orbit',
    shot: 'fan',
    volley: 'staggered',
    fireScalar: 1.02,
    fireDelayMult: 1.12,
    diveBias: 0.72,
    entrySpeed: 1.06
  },
  {
    id: 'needle_stagger',
    minLevel: 1,
    label: 'NEEDLE STAGGER',
    move: 'needle',
    shot: 'needle',
    volley: 'staggered',
    fireScalar: 0.94,
    fireDelayMult: 1.22,
    diveBias: 0.7,
    entrySpeed: 1.0
  },
  {
    id: 'weave_wall',
    minLevel: 10,
    label: 'WEAVE WALL',
    move: 'weave_wall',
    shot: 'fan',
    volley: 'pulse',
    fireScalar: 1.04,
    fireDelayMult: 1.08,
    diveBias: 0.82,
    entrySpeed: 0.92
  },
  {
    id: 'rush_feint',
    minLevel: 7,
    label: 'RUSH FEINT',
    move: 'feint',
    shot: 'burst_pair',
    volley: 'crossfire',
    fireScalar: 0.98,
    fireDelayMult: 1.14,
    diveBias: 1.9,
    forcedDive: true,
    entrySpeed: 0.72
  },
  {
    id: 'split_sweep',
    minLevel: 12,
    label: 'SPLIT SWEEP',
    move: 'split_sweep',
    shot: 'sweep',
    volley: 'staggered',
    fireScalar: 1.08,
    fireDelayMult: 1.05,
    diveBias: 1.05,
    entrySpeed: 0.84
  },
  {
    id: 'ambush_lattice',
    minLevel: 16,
    label: 'AMBUSH LATTICE',
    move: 'ambush',
    shot: 'net',
    volley: 'pulse',
    fireScalar: 1.12,
    fireDelayMult: 1.1,
    diveBias: 1.2,
    entrySpeed: 0.98
  }
];

const WAVE_TACTICS = [
  ...BASE_WAVE_TACTICS,
  ...WAVE_TACTIC_VARIANTS
];

const TACTIC_BY_ID = Object.fromEntries(WAVE_TACTICS.map((tactic) => [tactic.id, tactic]));

export class EnemyManager {
  constructor(container, game, onCap) {
    this.container = container;
    this.game = game;
    this.enemies = []; // Regular enemies
    this.onCap = onCap;

    // STATE MACHINE
    this.state = 'IDLE';
    this.currentWaveIndex = 0;
    this.waves = [];
    this.waveTimer = 0;
    this.normalWavesTotal = 0;
    this.bossWaveIndex = 0;
    this.phase = 'WAVES';
    this.pendingWaveConfig = null;
    this.waveBriefingTimer = 0;
    this.waveBriefingAnnounced = false;
    this.currentWaveTactic = null;
    this.marketingDebugMode = false;
    this.marketingDebugBossSpawnCount = 0;

    // Debug Stats
    this.totalEnemiesSpawned = 0;
    this.wavesCompleted = 0;
    this.isBossLevel = false;
    this.adaptation = { diagonalShotBias: 0, spawnYBias: 0 };
    this.currentModifier = null;

    // Hijacker capture-style special enemy, max once per level.
    this.hijacker = null;
    this.hijackerSpawnedThisLevel = false;
    this.hijackerSpawnAttemptedThisLevel = false;
    this.eliteMiddleShipPlan = [];
    this.eliteMiddleShipsSpawnedThisLevel = 0;

    // TASK 3: Wave cleanup timer to prevent stalls
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE'; // NONE, SLOWING, CLEARING
    this.waveActiveTimer = 0;
    this.waveObjectiveFailsafeTriggered = false;

    // WAVE FIX: Wave ending state to prevent bonus drone spawning
    this.waveEnding = false;
    this.currentWaveThreatState = null;

    // BOSS FIX: Boss state machine
    this.boss = null;
    this.bossGateTimer = 0;
    this.bossGateTauntShown = false;
    this.bossGateTauntDelayMs = 0;
    this.bossGateTauntDelayResolved = false;
    this.bossSpawnedThisLevel = false;
    this.bossDefeatedThisLevel = false;
    this.bossDefeatCelebrated = false;
    this.bossBlockLogged = false;
    this.levelStartTime = 0;
    this.bossSpawnedAtMs = 0;
    this.bossAddWaveCooldownUntilMs = 0;
    this.bossAddWaveCount = 0;
    this.bossIntervalExtraWaves = 0;
    this.bossChaosEventsThisBoss = 0;
    this.bossChaosNextCheckAtMs = 0;
    this.bossChaosCooldownUntilMs = 0;
    this.bossChaosPressureReliefUntilMs = 0;
    this.directorState = { tier: 0, spawnCadenceScale: 1, eliteChance: 0.02, clutchDropChance: 0.04 };

    // TASK 1: Voice history to prevent duplicates
    this.voiceHistory = {};
  }

  startLevel(level) {
    console.log(`[EnemyManager] STARTING LEVEL ${level}`);
    this.marketingDebugMode = false;
    this.marketingDebugBossSpawnCount = 0;
    this.level = level;
    this.clearEnemies();

    this.currentWaveIndex = 0;
    this.state = 'WAVE_ACTIVE';
    this.waveTimer = 0;
    this.normalWavesTotal = 0;
    this.bossWaveIndex = 0;
    this.levelStartTime = Date.now();
    this.phase = 'WAVES';
    this.pendingWaveConfig = null;
    this.waveBriefingTimer = 0;
    this.waveBriefingAnnounced = false;

    // Reset hijacker state for new level
    this.hijacker = null;
    this.hijackerSpawnedThisLevel = false;
    this.hijackerSpawnAttemptedThisLevel = false;
    this.eliteMiddleShipPlan = [];
    this.eliteMiddleShipsSpawnedThisLevel = 0;

    // WAVE FIX: Reset wave ending state
    this.waveEnding = false;
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE';
    this.resetWaveWatchdog();

    // BOSS FIX: Reset boss state
    this.boss = null;
    this.bossGateTimer = 0;
    this.resetBossGateMessaging();
    this.bossSpawnedThisLevel = false;
    this.bossDefeatedThisLevel = false;
    this.bossDefeatCelebrated = false;
    this.bossBlockLogged = false;
    this.bossSpawnedAtMs = 0;
    this.bossAddWaveCooldownUntilMs = 0;
    this.bossAddWaveCount = 0;
    this.bossIntervalExtraWaves = 0;
    this.bossChaosEventsThisBoss = 0;
    this.bossChaosNextCheckAtMs = 0;
    this.bossChaosCooldownUntilMs = 0;
    this.bossChaosPressureReliefUntilMs = 0;

    // Play Voice
    // Play Voice (TASK 1: Prevent duplicates per level)
    if (!this.voiceHistory[level]) {
      console.log(`[IntroVoice] play requested source=EnemyManager level=${level}`);
      AudioManager.playSfx('ui_open');
      const briefing = level === 1 ? 'mission_control_launch' : 'mission_control_level_start';
      if (level === 1 || level % 5 === 0) {
        const cooldownMs = level === 1 ? 2600 : 18000;
        setTimeout(() => AudioManager.playVoice(briefing, { cooldownMs, duckMs: 1700 }), 500);
      }
      this.voiceHistory[level] = true;
    } else {
      console.log(`[IntroVoice] suppressed duplicate for level=${level}`);
    }

    // Modifier Logic
    if (BalanceConfig.modifiers.enabled && level >= 5) {
      const mods = BalanceConfig.modifiers.types;
      this.currentModifier = mods[Math.floor(Math.random() * mods.length)];
    } else {
      this.currentModifier = null;
    }

    // Generate Waves
    // TASK D: Normal waves, then boss at end of every level
    this.isBossLevel = true;
    const normalWaves = this.generateWaves(level);
    this.waves = normalWaves;
    this.normalWavesTotal = normalWaves.length;
    this.bossWaveIndex = this.normalWavesTotal;
    console.log(`[EnemyManager] Level ${level}: ${normalWaves.length} waves + boss`);
    console.log(`[BossPlan] level=${level} normalWaves=${this.normalWavesTotal} bossWaveIndex=${this.bossWaveIndex} hasBoss=${this.isBossLevel}`);
    this.logBossStatus('level_start');
    console.log(`[BossPhase] level=${level} phase=${this.phase} waveIndex=${this.currentWaveIndex} normalWaves=${this.normalWavesTotal} hasBoss=${this.isBossLevel}`);
    this.logLevelDifficulty(level, normalWaves.length);

    if (this.normalWavesTotal > 0) {
      const config = this.waves[this.currentWaveIndex];
      this.spawnWave(config);
      this.state = 'WAVE_ACTIVE';
    } else if (this.isBossLevel) {
      this.phase = 'BOSS';
      this.state = 'BOSS_GATE';
      this.bossGateTimer = 0;
      this.resetBossGateMessaging();
    } else {
      this.phase = 'COMPLETE';
      this.state = 'LEVEL_COMPLETE';
      console.log(`[BossPhase] level=${level} phase=${this.phase} bossDefeated=true`);
    }
  }

  enableMarketingDebugMode() {
    if (!this.marketingDebugMode) {
      this.marketingDebugBossSpawnCount = this.enemies.filter(enemy => enemy?.kind === 'boss' && enemy?.active !== false).length;
    }
    this.marketingDebugMode = true;
    this.state = 'MARKETING_DEBUG';
    this.phase = 'MARKETING';
    this.pendingWaveConfig = null;
    this.waveEnding = false;
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE';
    this.resetWaveWatchdog();
  }

  pickMarketingDebugLevel() {
    const current = Math.max(1, Number(this.game?.level || this.level) || 1);
    const maxLevel = 40;
    const spread = Math.min(maxLevel, Math.max(current + 4, 12));
    return 1 + Math.floor(Math.random() * spread);
  }

  spawnMarketingDebugWave() {
    this.enableMarketingDebugMode();
    const previousLevel = this.level || 1;
    const level = this.pickMarketingDebugLevel();
    const waves = this.generateWaves(level).filter((wave) => wave?.type && wave.type !== 'BOSS');
    const picked = waves[Math.floor(Math.random() * Math.max(1, waves.length))] || {
      type: pickGeneratedEnemyTypeForLevel(level),
      count: this.getWaveEnemyCount(level, 0),
      formation: 'PINCER',
      tactic: this.pickWaveTactic(level, 0, 'PINCER'),
      entry: 'split',
      cadence: 1.18
    };
    const config = {
      ...picked,
      eliteMiddleShipId: null,
      count: Math.max(picked.count || 0, 10 + Math.floor(Math.random() * 7)),
      cadence: Math.max(1.05, (picked.cadence || 1) + 0.2)
    };

    this.level = level;
    this.spawnWave(config);
    this.level = previousLevel;
    console.log(`[MarketingDebug] wave level=${level} type=${config.type} formation=${config.formation} count=${config.count}`);
    return {
      kind: 'wave',
      level,
      type: config.type,
      formation: config.formation,
      count: config.count
    };
  }

  spawnMarketingDebugMiniBoss() {
    this.enableMarketingDebugMode();
    const ids = Array.isArray(ELITE_MIDDLE_SHIP_IDS) ? ELITE_MIDDLE_SHIP_IDS : [];
    const profileId = ids[Math.floor(Math.random() * Math.max(1, ids.length))];
    const profile = getEliteMiddleShipProfile(profileId);
    const previousLevel = this.level || 1;
    this.level = Math.max(previousLevel, profile?.minLevel || 1, this.pickMarketingDebugLevel());
    const enemy = this.spawnEliteMiddleShip(profileId, {
      marketingDebug: true,
      ignoreCaps: true,
      ignoreLevelGate: true,
      entry: Math.random() < 0.5 ? 'split' : 'alternating',
      delayMs: 80
    });
    this.level = previousLevel;
    console.log(`[MarketingDebug] miniBoss id=${profileId} spawned=${!!enemy}`);
    return {
      kind: 'mini_boss',
      id: profileId,
      displayName: profile?.displayName || profileId,
      spawned: Boolean(enemy)
    };
  }

  async spawnMarketingDebugBoss() {
    this.enableMarketingDebugMode();
    const level = this.pickMarketingDebugLevel();
    const bossIndex = this.marketingDebugBossSpawnCount++;
    const width = this.game?.getWidth ? this.game.getWidth() : 800;
    const height = this.game?.getHeight ? this.game.getHeight() : 600;
    const columns = [0.22, 0.42, 0.62, 0.78];
    const lanes = [0.18, 0.24, 0.30];
    const xJitter = (Math.random() - 0.5) * Math.min(130, width * 0.08);
    const yJitter = (Math.random() - 0.5) * Math.min(58, height * 0.045);
    const x = Math.max(140, Math.min(width - 140, width * columns[bossIndex % columns.length] + xJitter));
    const y = Math.max(100, Math.min(height * 0.36, height * lanes[Math.floor(bossIndex / columns.length) % lanes.length] + yJitter));
    const boss = await this.spawnBoss(level, { marketingDebug: true, x, y });
    console.log(`[MarketingDebug] boss level=${level} name=${boss?.name || 'unknown'}`);
    return {
      kind: 'boss',
      level,
      name: boss?.name || null,
      spawned: Boolean(boss)
    };
  }

  resetBossGateMessaging() {
    this.bossGateTauntShown = false;
    this.bossGateTauntDelayMs = 0;
    this.bossGateTauntDelayResolved = false;
  }

  generateWaves(level) {
    const curatedWaves = this.getCuratedWaves(level);
    if (curatedWaves) {
      const shapedCurated = curatedWaves.map((wave, waveIndex) =>
        this.game?.contentDirector?.shapeWaveConfig?.(wave, { level, waveIndex }) || wave
      );
      return this.applyEliteMiddleShipPlan(shapedCurated, level);
    }

    const numWaves = this.getNormalWaveCount(level);
    const waves = [];
    const patterns = [
      'GRID',
      'V_SHAPE',
      'ARC',
      'BOX',
      'SPIRAL',
      'DOUBLE_ARC',
      'STAGGERED_WING',
      'PINCER',
      'DIAGONAL_RAID',
      'SIDEWINDER',
      'ORBIT_RING',
      'CROSS_STREAM',
      'SCREEN_DOOR'
    ];

    for (let i = 0; i < numWaves; i++) {
      const progress = Math.min(0.98, (i + 1) / Math.max(1, numWaves) * 0.72 + (level / 40) * 0.24);
      const pattern = patterns[Math.abs((level * 5 + i * 7 + Math.floor(Math.random() * 3)) % patterns.length)];

      // 60% chance for a pure generated squadron for visual cohesion.
      const useFighterSquadron = Math.random() < 0.6;
      let selectedType;

      if (useFighterSquadron) {
        selectedType = pickGeneratedEnemyTypeForLevel(level);
      } else {
        // Normal progression through enemy types
        selectedType = getGeneratedEnemyTypeAtLevelProgress(level, progress);
      }

      const wave = {
        type: selectedType,
        count: this.getWaveEnemyCount(level, i),
        formation: pattern,
        tactic: this.pickWaveTactic(level, i, pattern),
        entry: i % 3 === 0 ? 'split' : i % 3 === 1 ? 'alternating' : 'single',
        cadence: 0.9 + Math.min(0.45, level * 0.022 + i * 0.035)
      };
      waves.push(this.game?.contentDirector?.shapeWaveConfig?.(wave, { level, waveIndex: i }) || wave);
    }
    return this.applyEliteMiddleShipPlan(waves, level);
  }

  applyEliteMiddleShipPlan(waves, level) {
    const plannedWaves = waves.map((wave) => ({ ...wave }));
    const plan = planEliteMiddleShipSpawns(level, plannedWaves.length);
    this.eliteMiddleShipPlan = plan;
    plan.forEach(({ waveIndex, eliteMiddleShipId }) => {
      if (!plannedWaves[waveIndex]) return;
      plannedWaves[waveIndex] = {
        ...plannedWaves[waveIndex],
        eliteMiddleShipId
      };
    });
    if (plan.length) {
      console.log(`[EliteMiddleShipPlan] level=${level} waves=${plannedWaves.length} plan=${plan.map(item => `${item.waveIndex + 1}:${item.eliteMiddleShipId}`).join(',')}`);
    }
    this.applyMultiEliteWaveVariant(plannedWaves, level, new Set(plan.map((item) => item.waveIndex)));
    return plannedWaves;
  }

  getEligibleEliteMiddleShipIds(level, { includeGentleFallback = false } = {}) {
    const safeLevel = Math.max(1, Number(level) || 1);
    const eligible = ELITE_MIDDLE_SHIP_IDS
      .map((id) => getEliteMiddleShipProfile(id))
      .filter(Boolean)
      .filter((profile) => profile.minLevel <= safeLevel)
      .map((profile) => profile.id);
    if (eligible.length || !includeGentleFallback) return eligible;
    return ELITE_MIDDLE_SHIP_IDS
      .map((id) => getEliteMiddleShipProfile(id))
      .filter(Boolean)
      .filter((profile) => profile.minLevel <= safeLevel + 1)
      .slice(0, 2)
      .map((profile) => profile.id);
  }

  pickEliteMiddleShipIds(level, count, { includeGentleFallback = false } = {}) {
    const pool = this.getEligibleEliteMiddleShipIds(level, { includeGentleFallback });
    const picked = [];
    const used = new Set();
    while (picked.length < count && used.size < pool.length) {
      const id = pool[Math.floor(Math.random() * pool.length)];
      if (!id || used.has(id)) continue;
      used.add(id);
      picked.push(id);
    }
    return picked;
  }

  applyMultiEliteWaveVariant(plannedWaves, level, reservedWaveIndices = new Set()) {
    const safeLevel = Math.max(1, Number(level) || 1);
    if (safeLevel < 2 || plannedWaves.length < 4) return;

    const chance = safeLevel <= 4 ? 0.045 : safeLevel < 10 ? 0.11 : 0.15;
    if (Math.random() > chance) return;

    const eliteCount = safeLevel >= 10 && Math.random() < 0.14 ? 3 : 2;
    const ids = this.pickEliteMiddleShipIds(safeLevel, eliteCount, { includeGentleFallback: safeLevel <= 4 });
    if (ids.length < 2) return;

    const eligibleWaveIndices = plannedWaves
      .map((wave, index) => ({ wave, index }))
      .filter(({ wave, index }) =>
        index > 0 &&
        index < plannedWaves.length - 1 &&
        !reservedWaveIndices.has(index) &&
        !wave.eliteMiddleShipId &&
        !wave.isChallenge &&
        wave.type !== 'bonus_challenge'
      )
      .map(({ index }) => index);
    if (!eligibleWaveIndices.length) return;

    const waveIndex = eligibleWaveIndices[Math.floor(Math.random() * eligibleWaveIndices.length)];
    const wave = plannedWaves[waveIndex];
    const originalCount = Math.max(4, Number(wave.count) || this.getWaveEnemyCount(safeLevel, waveIndex));
    const normalCountScalar = ids.length >= 3 ? 0.42 : safeLevel <= 4 ? 0.5 : 0.58;
    const compensatedCount = Math.max(3, Math.round(originalCount * normalCountScalar));
    const compensation = {
      normalCountBefore: originalCount,
      normalCountAfter: compensatedCount,
      normalFireScalar: ids.length >= 3 ? 0.48 : 0.58,
      normalFireDelayMult: ids.length >= 3 ? 1.36 : 1.24,
      eliteHealthScalar: ids.length >= 3 ? 0.44 : safeLevel <= 4 ? 0.48 : 0.58,
      eliteFireDelayMult: ids.length >= 3 ? 1.85 : 1.58,
      eliteTacticFireScalar: ids.length >= 3 ? 0.38 : 0.48,
      specialDelayStepMs: ids.length >= 3 ? 3000 : 2500
    };

    plannedWaves[waveIndex] = {
      ...wave,
      count: compensatedCount,
      multiEliteMiddleShipIds: ids,
      multiEliteCompensation: compensation
    };
    console.log(`[MultiEliteWave] level=${safeLevel} wave=${waveIndex + 1} elites=${ids.length} compensation=count:${originalCount}->${compensatedCount},normalFire:${compensation.normalFireScalar},eliteHp:${compensation.eliteHealthScalar}`);
  }

  getNormalWaveCount(level) {
    const diff = BalanceConfig.difficulty;
    const base = diff.wavesPerBossBase ?? diff.waveCountBase ?? 4;
    const perLevel = diff.wavesPerBossPerLevel ?? 0;
    const max = diff.wavesPerBossMax ?? diff.waveCountMax ?? 6;
    const min = diff.MIN_WAVES_BETWEEN_BOSSES ?? diff.minWavesBetweenBosses ?? 1;
    return Math.max(min, Math.min(max, Math.round(base + Math.max(0, level - 1) * perLevel)));
  }

  getWaveEnemyCount(level, waveIndex = 0) {
    const diff = BalanceConfig.difficulty;
    const earlyCounts = diff.earlyWaveEnemyCounts?.[level];
    if (Array.isArray(earlyCounts) && Number.isFinite(earlyCounts[waveIndex])) {
      return earlyCounts[waveIndex];
    }

    const levelScale = Math.max(0, level - 1);
    const waveScale = Math.max(0, waveIndex);
    const variance = Math.floor(Math.random() * Math.max(1, diff.waveEnemyRandom ?? 1));
    const count = Math.round(
      (diff.waveEnemyBase ?? 7) +
      levelScale * (diff.waveEnemyPerLevel ?? 0.35) +
      waveScale * (diff.waveEnemyPerWave ?? 0.45) +
      variance
    );
    return Math.max(4, Math.min(diff.waveEnemyMax ?? 14, count));
  }

  getCuratedWaves(level) {
    const scripts = {
      1: [
        { type: 'nova_enemy_001', count: 6, formation: 'TUTORIAL_ARC', tactic: 'strafe_sweep', entry: 'split', cadence: 0.78 },
        { type: 'nova_enemy_003', count: 8, formation: 'STAGGERED_WING', tactic: 'needle_stagger', entry: 'alternating', cadence: 0.86 },
        { type: 'nova_enemy_001', count: 8, formation: 'GRID', tactic: 'pulse_net', entry: 'single', cadence: 0.94 },
        { type: 'nova_enemy_003', count: 8, formation: 'DOUBLE_ARC', tactic: 'dive_chain', entry: 'split', cadence: 0.94 },
        { type: 'nova_enemy_003', count: 8, formation: 'PINCER', tactic: 'crossfire_pincer', entry: 'alternating', cadence: 1.0 },
        { type: 'nova_enemy_003', count: 6, formation: 'DOUBLE_ARC', tactic: 'needle_stagger', entry: 'split', cadence: 0.98 }
      ],
      2: [
        { type: 'nova_enemy_003', count: 7, formation: 'GRID', tactic: 'pulse_net', entry: 'alternating', cadence: 0.98 },
        { type: 'nova_enemy_005', count: 8, formation: 'STAGGERED_WING', tactic: 'crossfire_pincer', entry: 'split', cadence: 1.04 },
        { type: 'nova_enemy_007', count: 8, formation: 'PINCER', tactic: 'strafe_sweep', entry: 'alternating', cadence: 1.1 },
        { type: 'nova_enemy_008', count: 9, formation: 'SIDEWINDER', tactic: 'rush_feint', entry: 'split', cadence: 1.16 },
        { type: 'nova_enemy_007', count: 9, formation: 'CROSS_STREAM', tactic: 'split_sweep', entry: 'alternating', cadence: 1.2 },
        { type: 'nova_enemy_009', count: 10, formation: 'ORBIT_RING', tactic: 'orbit_snare', entry: 'single', cadence: 1.24 }
      ],
      3: [
        { type: 'nova_enemy_005', count: 7, formation: 'ARC', tactic: 'orbit_snare', entry: 'split', cadence: 1.06 },
        { type: 'nova_enemy_008', count: 8, formation: 'PINCER', tactic: 'rush_feint', entry: 'alternating', cadence: 1.14 },
        { type: 'nova_enemy_010', count: 9, formation: 'CROSS_STREAM', tactic: 'crossfire_pincer', entry: 'split', cadence: 1.2 },
        { type: 'nova_enemy_011', count: 9, formation: 'SCREEN_DOOR', tactic: 'weave_wall', entry: 'alternating', cadence: 1.26 },
        { type: 'nova_enemy_010', count: 10, formation: 'DIAGONAL_RAID', tactic: 'dive_chain', entry: 'split', cadence: 1.3 },
        { type: 'nova_enemy_011', count: 10, formation: 'DOUBLE_ARC', tactic: 'needle_stagger', entry: 'alternating', cadence: 1.34 }
      ],
      4: [
        { type: 'nova_enemy_008', count: 8, formation: 'SIDEWINDER', tactic: 'split_sweep', entry: 'split', cadence: 1.16 },
        { type: 'nova_enemy_010', count: 9, formation: 'DOUBLE_ARC', tactic: 'weave_wall', entry: 'alternating', cadence: 1.22 },
        { type: 'nova_enemy_012', count: 9, formation: 'ORBIT_RING', tactic: 'orbit_snare', entry: 'single', cadence: 1.28 },
        { type: 'nova_enemy_013', count: 10, formation: 'DIAGONAL_RAID', tactic: 'rush_feint', entry: 'split', cadence: 1.34 },
        { type: 'nova_enemy_012', count: 10, formation: 'PINCER', tactic: 'ambush_lattice', entry: 'alternating', cadence: 1.38 },
        { type: 'nova_enemy_013', count: 11, formation: 'SPIRAL', tactic: 'orbit_snare', entry: 'single', cadence: 1.42 }
      ]
    };
    const script = scripts[level];
    if (!script) return null;
    const waveCount = Math.max(1, Math.min(script.length, this.getNormalWaveCount(level)));
    return script.slice(0, waveCount).map((wave) => ({ ...wave }));
  }

  createBossSpacingWave() {
    const level = this.level || 1;
    const progress = Math.min(0.98, 0.58 + this.bossIntervalExtraWaves * 0.08);
    const formations = ['STAGGERED_WING', 'PINCER', 'DOUBLE_ARC', 'SCREEN_DOOR', 'CROSS_STREAM'];
    const formation = formations[(level + this.bossIntervalExtraWaves) % formations.length];
    const tactic = this.pickWaveTactic(level, this.normalWavesTotal + this.bossIntervalExtraWaves, formation);
    return {
      type: getGeneratedEnemyTypeAtLevelProgress(level, progress) || GENERATED_ENEMY_TYPES[0],
      count: this.getWaveEnemyCount(level, this.normalWavesTotal + this.bossIntervalExtraWaves),
      formation,
      tactic,
      entry: this.bossIntervalExtraWaves % 2 === 0 ? 'alternating' : 'split',
      cadence: 1.08 + Math.min(0.32, level * 0.02 + this.bossIntervalExtraWaves * 0.04),
      bossSpacingWave: true
    };
  }

  shouldAddBossSpacingWave() {
    if (!this.isBossLevel || this.bossSpawnedThisLevel || this.bossDefeatedThisLevel) return false;
    const diff = BalanceConfig.difficulty;
    const minWaves = diff.MIN_WAVES_BETWEEN_BOSSES ?? diff.minWavesBetweenBosses ?? 6;
    const completedWaves = this.currentWaveIndex + 1;
    if (completedWaves < minWaves) return true;

    const minSeconds = diff.MIN_SECONDS_BETWEEN_BOSSES ?? diff.minSecondsBetweenBosses ?? 0;
    if (minSeconds <= 0 || !this.levelStartTime) return false;
    const elapsedSeconds = (Date.now() - this.levelStartTime) / 1000;
    const maxCatchup = diff.bossIntervalCatchupWaveMax ?? 4;
    return elapsedSeconds < minSeconds && this.bossIntervalExtraWaves < maxCatchup;
  }

  pickWaveTactic(level, waveIndex, formation = 'ARC') {
    const safeLevel = Math.max(1, Number(level) || 1);
    const formationBias = {
      PINCER: 'crossfire_pincer',
      STAGGERED_WING: waveIndex % 2 ? 'dive_chain' : 'strafe_sweep',
      SPIRAL: 'orbit_snare',
      ORBIT_RING: 'orbit_snare',
      GRID: 'pulse_net',
      BOX: 'ambush_lattice',
      SIDEWINDER: 'split_sweep',
      SCREEN_DOOR: 'weave_wall',
      DIAGONAL_RAID: 'rush_feint',
      CROSS_STREAM: 'crossfire_pincer'
    };
    if (formationBias[formation] && (safeLevel + waveIndex) % 3 !== 0) {
      const biased = TACTIC_BY_ID[formationBias[formation]];
      if (!biased || (Number(biased.minLevel) || 1) <= safeLevel) return formationBias[formation];
    }
    const allowed = WAVE_TACTICS.filter((tactic) => (Number(tactic.minLevel) || 1) <= safeLevel);
    const pool = allowed.length ? allowed : WAVE_TACTICS;
    const index = Math.abs((safeLevel * 7 + waveIndex * 3 + String(formation).length) % pool.length);
    return pool[index].id;
  }

  resolveWaveTactic(config) {
    const id = typeof config?.tactic === 'string'
      ? config.tactic
      : config?.tactic?.id;
    const fallbackId = this.pickWaveTactic(this.level || 1, this.currentWaveIndex || 0, config?.formation || 'ARC');
    const level = Math.max(1, Number(this.level) || 1);
    const requested = TACTIC_BY_ID[id] || null;
    const fallback = TACTIC_BY_ID[fallbackId] || WAVE_TACTICS[0];
    const allowed = requested && (Number(requested.minLevel) || 1) <= level
      ? requested
      : ((Number(fallback.minLevel) || 1) <= level
        ? fallback
        : WAVE_TACTICS.find((tactic) => (Number(tactic.minLevel) || 1) <= level) || WAVE_TACTICS[0]);
    return {
      ...allowed,
      ...(typeof config?.tactic === 'object' ? config.tactic : {})
    };
  }

  // WAVE FIX: Helper to identify objective enemies (ships, not bonus drones)
  isObjectiveEnemy(enemy) {
    if (!enemy || !enemy.active) return false;
    // bonus drones and bosses are not objective enemies
    return enemy.kind !== 'bonus_drone' && enemy.kind !== 'boss';
  }

  resetWaveWatchdog() {
    this.waveActiveTimer = 0;
    this.waveObjectiveFailsafeTriggered = false;
  }

  maybeClearStalledWave(objectiveCount = this.getObjectiveEnemyCount()) {
    if (objectiveCount <= 0 || this.waveEnding || this.waveObjectiveFailsafeTriggered) return false;
    const failsafeMs = BalanceConfig.difficulty.waveObjectiveFailsafeMs || WAVE_OBJECTIVE_FAILSAFE_MS;
    if (this.waveActiveTimer < failsafeMs) return false;

    this.waveObjectiveFailsafeTriggered = true;
    const objectiveEnemies = this.enemies.filter(enemy => this.isObjectiveEnemy(enemy));
    const summary = objectiveEnemies
      .slice(0, 5)
      .map(enemy => `${enemy.kind || enemy.type || 'enemy'}@${Math.round(enemy.x || 0)},${Math.round(enemy.y || 0)}`)
      .join(' | ');
    console.warn(`[WaveStallWatchdog] level=${this.level} wave=${this.currentWaveIndex + 1}/${this.normalWavesTotal} objectiveAlive=${objectiveCount} activeMs=${Math.round(this.waveActiveTimer)} clearing stuck wave ${summary}`);
    this.forceClearAllEnemies();
    this.waveEnding = true;
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE';
    this.game?.scenes?.play?.clearEnemyBullets?.('wave_stall_watchdog');
    return true;
  }

  // WAVE FIX: Count objective enemies only
  getObjectiveEnemyCount() {
    return this.enemies.filter(e => this.isObjectiveEnemy(e)).length;
  }

  // WAVE FIX: Gate for bonus drone spawning
  allowBonusDroneSpawns() {
    // Only allow during WAVE_ACTIVE, not during wave ending or cleanup
    return this.state === 'WAVE_ACTIVE' &&
      this.level > 1 &&
      !this.waveEnding &&
      this.cleanupPhase === 'NONE';
  }

  setDirectorState(state) {
    if (!state) return;
    this.directorState = state;
  }

  getOpeningFireScalar() {
    if (this.level !== 1 || this.state !== 'WAVE_ACTIVE') return 1;
    const scalars = [0.32, 0.45, 0.58, 0.68];
    return scalars[this.currentWaveIndex] ?? 0.74;
  }

  update(delta) {
    // 1. Update State Machine
    switch (this.state) {
      case 'WAVE_ACTIVE':
        if (!this.waveEnding) {
          this.waveActiveTimer += Math.max(0, Math.min(1000, delta * 16.67));
        }
        // WAVE FIX: Check objective enemies only, not bonus drones
        const objectiveCount = this.getObjectiveEnemyCount();
        if (objectiveCount === 0 && !this.waveEnding) {
          // Start wave ending immediately when last objective enemy dies
          this.waveEnding = true;

          // WAVE FIX: Diagnostic - wave ending start
          const playScene = this.game.scenes.play;
          if (playScene?.clearEnemyBullets) {
            playScene.clearEnemyBullets('wave_clear');
          }
          let bonusDroneCount = 0;
          if (playScene && playScene.getWaveCleanupTargets) {
            bonusDroneCount = playScene.getWaveCleanupTargets().length;
          }
          console.log(`[WaveCleanup] start objectiveAlive=0 bonusDroneAlive=${bonusDroneCount} state=${this.state}`);
          this.logBossStatus('wave_cleanup_start');

          // Immediately start cleanup phase
          this.cleanupTimer = 0;
          this.cleanupPhase = 'SLOWING';
        } else if (objectiveCount > 0 && !this.waveEnding) {
          this.maybeClearStalledWave(objectiveCount);
        }

        // WAVE FIX: Run cleanup during wave ending
        if (this.waveEnding) {
          this.cleanupTimer += delta * 16.67;

          const playScene = this.game.scenes.play;
          let allTargets = [];
          if (playScene && playScene.getWaveCleanupTargets) {
            allTargets = playScene.getWaveCleanupTargets();
          }

          // Phase 1: Slow bonus drones immediately (already in SLOWING)
          if (this.cleanupPhase === 'SLOWING' && this.cleanupTimer > 100) {
            // Slow bonus drones to 20% speed
            allTargets.forEach(t => {
              if (t.vx) t.vx *= 0.2;
              if (t.vy) t.vy *= 0.2;
            });
            this.cleanupPhase = 'CLEARING';
          }

          const waveCleanupMs = BalanceConfig.difficulty.waveCleanupMs || 2000;
          if (this.cleanupTimer > waveCleanupMs && this.cleanupPhase === 'CLEARING') {
            const clearedCount = allTargets.length;
            this.forceClearAllEnemies();

            // WAVE FIX: Diagnostic - cleanup end
            console.log(`[WaveCleanup] end objectiveAlive=0 bonusDroneAlive=0 cleared=${clearedCount}`);
            this.logBossStatus('wave_cleanup_end');

            this.cleanupPhase = 'NONE';
          }
        }

        // After cleanup finishes, progress phase
        if (this.waveEnding && this.cleanupPhase === 'NONE') {
          this.onWaveCleared();
          this.waveEnding = false; // Reset for next wave
        }
        break;

      case 'WAVE_BRIEFING':
        this.waveBriefingTimer += delta * 16.67;
        const diff = BalanceConfig.difficulty;
        const announceMs = diff.waveBriefingAnnounceMs || 650;
        const briefingMs = diff.waveDelayMs || 1600;
        if (!this.waveBriefingAnnounced && this.waveBriefingTimer >= announceMs) {
          this.announceWaveBriefing();
          this.waveBriefingAnnounced = true;
        }
        if (this.waveBriefingTimer >= briefingMs && this.pendingWaveConfig) {
          const config = this.pendingWaveConfig;
          this.pendingWaveConfig = null;
          this.waveBriefingTimer = 0;
          this.waveBriefingAnnounced = false;
          this.spawnWave(config);
          this.state = 'WAVE_ACTIVE';
        }
        break;

      case 'BOSS_GATE':
        // BOSS FIX: Show wanted poster, wait for gate duration, then spawn boss
        this.bossGateTimer += delta * 16.67;

        if (!this.bossGateTauntDelayResolved) {
          const playScene = this.game.scenes.play;
          this.bossGateTauntDelayMs = playScene?.getTransitionMessageDelayMs
            ? playScene.getTransitionMessageDelayMs({ minMs: 900, maxMs: 1400 })
            : 900;
          this.bossGateTauntDelayResolved = true;
        }

        // Show wanted poster after transition reward messaging has had focus.
        if (!this.bossGateTauntShown && this.bossGateTimer >= this.bossGateTauntDelayMs && this.game.scenes.play) {
          const playScene = this.game.scenes.play;
          if (playScene.showBossTaunt) playScene.showBossTaunt('boss_spawn');
          else if (playScene.showWantedPoster) playScene.showWantedPoster();
          this.bossGateTauntShown = true;
        }

        const bossGateMs = BalanceConfig.difficulty.bossGateMs || 1000;
        const resolvedBossGateMs = Math.max(bossGateMs, this.bossGateTauntDelayMs + 2300);
        if (this.bossGateTimer > resolvedBossGateMs && !this.bossSpawning) {
          this.logBossStatus('boss_gate_spawn');
          console.log(`[BossFlow] spawn boss level=${this.level}`);
          AudioManager.playVoice('mission_control_boss_inbound', { cooldownMs: 14000, duckMs: 1800, bypassGlobalCooldown: true });
          this.bossSpawning = true;
          this.spawnBoss(this.level).then(() => {
            this.state = 'BOSS_ACTIVE';
            this.bossGateTimer = 0;
            this.bossSpawning = false;
            this.logBossStatus('boss_spawned');
          });
        }
        break;

      case 'BOSS_ACTIVE':
        // BOSS FIX: Wait for boss to be defeated
        // Boss is in this.enemies array or this.boss reference
        const bossAlive = this.boss && this.boss.active;
        const bossInEnemies = this.enemies.some(e => e.kind === 'boss' && e.active);

        if (this.boss) {
          const dt = Date.now() - (this.bossSpawnedAtMs || this.boss.spawnedAtMs || 0);
          if (this.boss.health <= 0) {
            console.log(`[BossDefeatAttempt] level=${this.level} hp=${this.boss.health} dt=${dt} reason=hp_zero`);
            if (dt < 1500) {
              if (this.game?.scenes?.play?.debugPowerups) {
                console.warn(`[BossFix] prevented instant boss defeat level=${this.level} dt=${dt}`);
              }
              this.boss.health = this.boss.maxHealth;
              this.boss.active = true;
              return;
            }
            this.bossDefeatedThisLevel = true;
            if (!this.bossDefeatCelebrated) {
              this.bossDefeatCelebrated = true;
              const playScene = this.game.scenes.play;
              if (playScene) {
                playScene.bossKills = (Number(playScene.bossKills) || 0) + 1;
              }
              if (playScene?.clearEnemyBullets) {
                playScene.clearEnemyBullets('boss_defeated');
              }
              if (playScene?.showBossCelebration) {
                playScene.showBossCelebration({ level: this.level, type: this.boss?.bossType || 'UNKNOWN' });
              }
            }
            const clearedSupport = this.clearNonBossEnemyVisuals('boss_defeated');
            if (clearedSupport > 0) {
              console.log(`[BossCleanup] cleared non-boss support ships=${clearedSupport}`);
            }
            this.logBossStatus('boss_defeated');
            console.log(`[BossDefeatProof] level=${this.level} hp=0 dt=${dt} reason=hp_zero`);
            console.log(`[BossFlow] boss defeated level=${this.level}`);
            this.phase = 'COMPLETE';
            console.log(`[BossPhase] level=${this.level} phase=${this.phase} bossDefeated=true`);
            this.state = 'LEVEL_COMPLETE';
            AudioManager.playVoice('mission_control_victory', { cooldownMs: 18000, duckMs: 1800, bypassGlobalCooldown: true });
            return;
          }
        }

        if (!bossAlive && !bossInEnemies) {
          const dt = Date.now() - (this.bossSpawnedAtMs || this.boss?.spawnedAtMs || 0);
          const hp = this.boss ? this.boss.health : -1;
          console.log(`[BossDefeatAttempt] level=${this.level} hp=${hp} dt=${dt} reason=missing_entity`);
          if (!this.bossSpawning) {
            console.warn(`[BossFix] boss missing, respawning level=${this.level}`);
            this.bossSpawning = true;
            this.spawnBoss(this.level).finally(() => {
              this.bossSpawning = false;
            });
          }
        }
        this.maybeTriggerBossChaos();
        break;

      case 'LEVEL_COMPLETE':
        // CLEANUP FIX: Check for bonus drones across all tracking systems
        const playScene = this.game.scenes.play;
        let allTargets = [];
        if (playScene && playScene.getWaveCleanupTargets) {
          allTargets = playScene.getWaveCleanupTargets();
        }
        const hasHijacker = Boolean(this.hijacker?.active);
        const hasRemainingEntities = this.enemies.length > 0 || allTargets.length > 0 || hasHijacker;

        if (hasRemainingEntities) {
          this.cleanupTimer += delta * 16.67;

          // Phase 1: Slow down entities after 2 seconds
          if (this.cleanupTimer > 2000 && this.cleanupPhase === 'NONE') {
            this.cleanupPhase = 'SLOWING';
            console.log(`[EnemyManager] Cleanup Phase 1: Slowing ${this.enemies.length} enemies + ${allTargets.length} bonus drones + hijacker=${hasHijacker}`);
            // Slow enemies
            this.enemies.forEach(e => {
              if (e.vx) e.vx *= 0.2;
              if (e.vy) e.vy *= 0.2;
            });
            // Slow bonus drones
            allTargets.forEach(t => {
              if (t.vx) t.vx *= 0.2;
              if (t.vy) t.vy *= 0.2;
            });
          }

          // Phase 2: Auto-clear after 3 seconds total
          if (this.cleanupTimer > 3000 && this.cleanupPhase === 'SLOWING') {
            this.cleanupPhase = 'CLEARING';
            console.log(`[EnemyManager] Cleanup Phase 2: Auto-clearing ${this.enemies.length} enemies + ${allTargets.length} bonus drones + hijacker=${hasHijacker}`);
            this.forceClearAllEnemies();
          }

          // TASK C: Emergency failsafe at 10 seconds
          if (this.cleanupTimer > 10000) {
            console.warn(`[EnemyManager] EMERGENCY CLEANUP: Force clearing ${this.enemies.length} enemies + ${allTargets.length} bonus drones + hijacker=${hasHijacker} after 10s`);
            this.forceClearAllEnemies();
          }
        } else {
          // Reset cleanup when all entities cleared normally
          this.cleanupTimer = 0;
          this.cleanupPhase = 'NONE';
        }
        break;
    }

    this.ensureBossActive();

    // 2. Chance to spawn Bonus Drone (Rare Powerup Source)
    // WAVE FIX: Use spawn gate
    if (this.allowBonusDroneSpawns() && this.enemies.length < 20) {
      const clutchBoost = this.directorState?.clutchDropChance || 0;
      const chance = 0.0005 + clutchBoost * 0.0008;
      if (Math.random() < chance) { // very rare per tick
        this.spawnBonusDrone('bonus');
      }
    }

    // 3. Update Entities
    this.updateEnemies(delta);

    // 4. Update Hijacker (if present)
    if (this.hijacker && this.hijacker.active) {
      const player = this.game.scenes.play ? this.game.scenes.play.player : null;
      const playerX = player ? player.x : 400;
      const playerY = player ? player.y : 300;
      this.hijacker.update(delta, playerX, playerY);

      // Hijacker can shoot
      if (this.hijacker.canShoot()) {
        const bullet = this.hijacker.shoot(playerX, playerY);
        if (bullet && this.game.scenes.play) {
          this.game.scenes.play.bulletManager.addEnemyBullet(bullet);
        }
      }
    }

    // Remove hijacker if destroyed
    if (this.hijacker && !this.hijacker.active) {
      if (this.hijacker.destroy) this.hijacker.destroy();
      if (this.hijacker.sprite && this.hijacker.sprite.parent) {
        this.hijacker.sprite.parent.removeChild(this.hijacker.sprite);
      }
      this.hijacker = null;
    }
  }

  deactivateEnemyVisual(enemy, reason = 'inactive') {
    if (!enemy) return false;
    if (typeof enemy.deactivateVisuals === 'function') {
      enemy.deactivateVisuals(reason);
      return true;
    }

    const sprite = enemy.sprite;
    if (!sprite) return false;
    sprite.visible = false;
    sprite.renderable = false;
    if (Array.isArray(sprite.children)) {
      sprite.children.forEach(child => {
        if (!child) return;
        child.visible = false;
        child.renderable = false;
      });
    }
    return true;
  }

  removeEnemySprite(enemy, reason = 'cleanup') {
    if (!enemy) return false;
    enemy.active = false;
    if ('waitingForEntry' in enemy) enemy.waitingForEntry = false;
    this.deactivateEnemyVisual(enemy, reason);
    if (typeof enemy.destroy === 'function') enemy.destroy();
    if (enemy.sprite?.parent) {
      enemy.sprite.parent.removeChild(enemy.sprite);
    }
    return true;
  }

  updateEnemies(delta) {
    const player = this.game.scenes.play ? this.game.scenes.play.player : null;

    // SAFEGUARD: Check for active powerup correctly
    const isSlowTime = player &&
      player.activePowerup &&
      player.activePowerup.type === 'slow_time' &&
      !player.isPowerupSuppressed?.();

    const timeScale = isSlowTime ? 0.5 : 1.0;
    const tier = this.directorState?.tier || 0;
    const diff = BalanceConfig.difficulty;
    const levelScale = Math.max(0, (this.level || 1) - 1);
    const baseFireChance = Math.min(
      diff.enemyFireChanceMax ?? Number.POSITIVE_INFINITY,
      (diff.enemyFireChance ?? 0.0036) + levelScale * (diff.enemyFireChancePerLevel ?? 0)
    );
    const pressureDirector = this.game?.runPressureDirector;
    const fireChance = (pressureDirector?.scaleEnemyFireChance?.(baseFireChance) ?? baseFireChance) *
      diff.pressureScalar *
      this.getOpeningFireScalar() *
      (1 + tier * 0.1);
    const enemySpeedMult = pressureDirector?.scaleEnemySpeed?.(1) || 1;
    const dt = delta * timeScale;
    const playerX = player ? player.x : 400;
    const playerY = player ? player.y : 300;

    this.enemies = this.enemies.filter(enemy => {
      if (!enemy) return false;
      if (!enemy.active && !enemy.waitingForEntry) {
        this.removeEnemySprite(enemy, 'inactive_update_pre');
        return false;
      }

      const isBoss = enemy.kind === 'boss';
      enemy.update(isBoss ? dt : dt * enemySpeedMult, playerX, playerY);

      if (!enemy.active && !enemy.waitingForEntry) {
        this.removeEnemySprite(enemy, 'inactive_update');
        return false;
      }
      if (!enemy.active || enemy.waitingForEntry) return true;

      // Shooting
      const enemyFireChance = fireChance * (enemy.getTacticalFireScalar?.() || enemy.tacticalFireScalar || 1);
      const shouldShoot = isBoss
        ? enemy.canShoot()
        : enemy.canShoot() && Math.random() < enemyFireChance * timeScale;
      if (shouldShoot) {
        const shots = enemy.shoot(playerX, playerY);
        if (shots) {
          if (Array.isArray(shots)) shots.forEach(s => this.game.scenes.play.bulletManager.addEnemyBullet(s));
          else this.game.scenes.play.bulletManager.addEnemyBullet(shots);
          this.playEnemyShotFeedback(enemy, playerX, playerY);
        }
      }

      return true;
    });
  }

  playEnemyShotFeedback(enemy, playerX, playerY) {
    const playScene = this.game?.scenes?.play;
    const angle = Math.atan2(playerY - enemy.y, playerX - enemy.x);
    playScene?.particleManager?.createMuzzleFlash(enemy.x, enemy.y, angle, enemy.color || 0xff5544);

    // Enemy fire is intentionally visual-only. The old recurring enemy_shoot
    // chirp became grating during normal play because enemies fire every few seconds.
  }



  spawnBonusDrone(reason = 'bonus') {
    // WAVE FIX: Double-check gate
    if (!this.allowBonusDroneSpawns()) {
      return;
    }

    // Spawn as a standard enemy but with 'bonus_challenge' type
    const x = 50 + Math.random() * (this.game.getWidth() - 100);
    const enemy = new Enemy(x, -50, 'bonus_challenge', this.level, this.game, 'Gold');

    this.enemies.push(enemy);
    this.container.addChild(enemy.sprite);
  }

  startNextWave() { }

  spawnWave(config) {
    if (config.type === 'BOSS') {
      AudioManager.playVoice('mission_control_boss_inbound', { cooldownMs: 14000, duckMs: 1800, bypassGlobalCooldown: true });
      this.spawnBoss(this.level); // Fire and forget
      return;
    }

    this.resetWaveWatchdog();
    const { count, formation, type } = config;
    let tactic = { ...this.resolveWaveTactic(config) };
    const multiEliteIds = Array.isArray(config.multiEliteMiddleShipIds) ? config.multiEliteMiddleShipIds : [];
    const multiEliteCompensation = config.multiEliteCompensation || null;
    if (multiEliteIds.length && multiEliteCompensation) {
      tactic = {
        ...tactic,
        fireScalar: (tactic.fireScalar || 1) * (multiEliteCompensation.normalFireScalar || 0.58),
        fireDelayMult: (tactic.fireDelayMult || 1) * (multiEliteCompensation.normalFireDelayMult || 1.24),
        entrySpeed: (tactic.entrySpeed || 1) * 1.08
      };
    }
    const positions = this.getFormationPositions(formation, count);
    const threatPlan = this.createThreatActionPlan({ count, formation, tactic, config });
    tactic = this.applyThreatPressureCompensation(tactic, threatPlan);
    this.currentWaveTactic = tactic;
    const screenW = this.game.getWidth();
    const startLeft = Math.random() < 0.5;
    const combatBounds = this.getCombatBoundsForPositions(positions, formation);
    const center = positions.reduce((acc, pos) => ({
      x: acc.x + pos.x / Math.max(1, positions.length),
      y: acc.y + pos.y / Math.max(1, positions.length)
    }), { x: 0, y: 0 });

    // Random Color for this wave - Xtra Asset Integration
    const waveColors = ['Blue', 'Green', 'Red', 'Black'];
    const waveColor = waveColors[Math.floor(Math.random() * waveColors.length)];

    // Show wave modifier toast
    if (this.currentModifier && this.game.scenes.play) {
      const modLabels = {
        'SHIELDED': 'SHIELDED WAVE! (+50% HP)',
        'AGGRESSIVE': 'AGGRESSIVE WAVE! (Rapid Fire)',
        'SWIFT': 'SWIFT WAVE! (+40% Speed)'
      };
      const label = modLabels[this.currentModifier] || this.currentModifier;
      this.game.scenes.play.showToast(label, { fontSize: 20, fill: '#ffaa00', y: 130, duration: 2000 });
    }

    const diff = BalanceConfig.difficulty;
    const cadence = (this.directorState?.spawnCadenceScale || 1) * (config.cadence || 1);
    const delayStep = Math.max(55, (diff.enemyEntryDelayBaseMs || 150) / cadence);
    const entryDurationMs = Math.max(760, (diff.enemyEntryDurationMs || 2000) * (tactic.entrySpeed || 1));
    positions.forEach((pos, i) => {
      const startX = this.getWaveEntryX(config.entry || 'single', i, startLeft, screenW);
      const enemy = new Enemy(startX, -100, type, this.level, this.game, waveColor);
      const lanePressure = this.getLanePressureForPosition(pos.x, formation);
      const enemyTactic = this.applyLanePressureToTactic(tactic, lanePressure);
      this.applyModifier(enemy);
      enemy.applyWaveTactic?.(enemyTactic, {
        index: i,
        count,
        formation,
        centerX: center.x || screenW / 2,
        centerY: center.y || 128,
        side: pos.x < screenW / 2 ? -1 : 1,
        combatBounds
      });
      const threatAction = threatPlan.assignmentBySlot.get(i) || null;
      if (threatAction) {
        enemy.applyThreatAction?.(threatAction, {
          index: i,
          waveIndex: this.currentWaveIndex,
          count
        });
      }
      if (enemyTactic.forcedDive) {
        enemy.tacticalDiveAt = Date.now() + entryDurationMs + i * (enemyTactic.id === 'dive_chain' ? 260 : 190) + 520;
      }
      enemy.startEntry(startX, -50, pos.x, pos.y, entryDurationMs, i * delayStep);
      this.enemies.push(enemy);
      this.container.addChild(enemy.sprite);
    });
    if (config.eliteMiddleShipId) {
      this.spawnEliteMiddleShip(config.eliteMiddleShipId, {
        formation,
        tactic,
        waveColor,
        entry: config.entry || 'single',
        delayMs: Math.min(900, Math.max(220, positions.length * delayStep * 0.35))
      });
    }
    if (multiEliteIds.length) {
      this.spawnMultiEliteMiddleShips(multiEliteIds, {
        formation,
        tactic,
        waveColor,
        entry: 'split',
        compensation: multiEliteCompensation
      });
    }
    if (positions.length > 1) {
      const xs = positions.map((pos) => pos.x);
      const span = Math.max(...xs) - Math.min(...xs);
      console.log(`[FormationWidth] level=${this.level} wave=${this.currentWaveIndex + 1}/${this.normalWavesTotal} formation=${formation} count=${count} spanPct=${(span / screenW).toFixed(2)} policy=engagement_band`);
    }
    const playScene = this.game?.scenes?.play;
    playScene?.recordThreatDiscovery?.(tactic.id, 'waveTactics', {
      name: tactic.label || tactic.id,
      role: tactic.move || 'formation pressure',
      sector: this.level
    });
    const enemyProfile = getGeneratedEnemyProfile(type);
    playScene?.recordThreatDiscovery?.(type, 'enemies', {
      name: enemyProfile?.displayName || type,
      role: enemyProfile?.role || config.type || 'wave enemy',
      movementStyle: enemyProfile?.movementStyle || null,
      fireStyle: enemyProfile?.fireStyle || null,
      rarity: enemyProfile?.tier || null,
      sector: this.level,
      waveIndex: this.currentWaveIndex || 0
    });
    threatPlan.assignedIds.forEach((actionId) => {
      const action = getEnemyThreatAction(actionId);
      playScene?.recordThreatDiscovery?.(actionId, 'attackPatterns', {
        name: action?.label || actionId,
        role: action?.description || 'special attack',
        sector: this.level
      });
    });
    console.log(`[WaveTactic] level=${this.level} wave=${this.currentWaveIndex + 1}/${this.normalWavesTotal} tactic=${tactic.id} formation=${formation} count=${count} threats=${threatPlan.assignedIds.join(',') || 'none'}`);
  }

  createThreatActionPlan({ count, formation, tactic, config } = {}) {
    const result = pickThreatActionsForWave({
      level: this.level,
      formation,
      tactic,
      waveIndex: this.currentWaveIndex || 0,
      count
    });
    const assignmentBySlot = new Map();
    const assignedIds = [];
    for (const assignment of result.assignments || []) {
      const action = getEnemyThreatAction(assignment.actionId);
      if (!action) continue;
      assignmentBySlot.set(assignment.slot, action);
      assignedIds.push(action.id);
    }
    this.currentWaveThreatState = {
      maxActive: result.budget?.maxActive || 0,
      dangerBudget: result.budget?.dangerBudget || 0,
      activeCount: 0,
      activeCost: 0,
      activeById: {},
      assignedIds,
      assignmentCount: assignedIds.length,
      level: this.level,
      waveIndex: this.currentWaveIndex || 0,
      formation,
      tacticId: tactic?.id || config?.tactic || null
    };
    return {
      budget: result.budget,
      assignments: result.assignments || [],
      assignmentBySlot,
      assignedIds
    };
  }

  applyThreatPressureCompensation(tactic = {}, threatPlan = {}) {
    const ids = new Set(threatPlan.assignedIds || []);
    if (!ids.size) return tactic;
    const handlers = new Set([...ids].map((id) => {
      const action = getEnemyThreatAction(id);
      return action?.handlerId || id;
    }));
    let fireScalar = tactic.fireScalar || 1;
    let fireDelayMult = tactic.fireDelayMult || 1;
    if (handlers.has('mine_drop') || handlers.has('orbiting_satellites')) {
      fireScalar *= 0.86;
      fireDelayMult *= 1.1;
    }
    if (handlers.has('telegraph_rail_lance') || handlers.has('lane_cutter')) {
      fireScalar *= 0.9;
      fireDelayMult *= 1.08;
    }
    if (handlers.has('pulse_ring_bloom') && handlers.has('shotgun_fan_feint')) {
      fireScalar *= 0.88;
      fireDelayMult *= 1.06;
    }
    return {
      ...tactic,
      fireScalar,
      fireDelayMult,
      threatActions: [...ids]
    };
  }

  tryReserveThreatAction(enemy, action) {
    const state = this.currentWaveThreatState;
    if (!state || !action || enemy?.kind !== 'enemy') return false;
    const cost = action.dangerBudgetCost || 1;
    const activeForId = state.activeById[action.id] || 0;
    if (state.maxActive <= 0 || state.activeCount >= state.maxActive) return false;
    if (state.activeCost + cost > state.dangerBudget) return false;
    if (activeForId >= (action.maxActivePerWave || 1)) return false;
    if (action.activeBulletCap && this.countActiveThreatBullets(action.id) >= action.activeBulletCap) return false;

    state.activeCount += 1;
    state.activeCost += cost;
    state.activeById[action.id] = activeForId + 1;
    return true;
  }

  releaseThreatAction(_enemy, action) {
    const state = this.currentWaveThreatState;
    if (!state || !action) return;
    const cost = action.dangerBudgetCost || 1;
    state.activeCount = Math.max(0, state.activeCount - 1);
    state.activeCost = Math.max(0, state.activeCost - cost);
    state.activeById[action.id] = Math.max(0, (state.activeById[action.id] || 0) - 1);
  }

  countActiveThreatBullets(actionId) {
    const bullets = this.game?.scenes?.play?.bulletManager?.enemyBullets || [];
    return bullets.filter((bullet) => bullet?.active !== false && bullet.threatActionId === actionId).length;
  }

  getWaveEntryX(entry, index, startLeft, screenW) {
    if (entry === 'split') {
      return index % 2 === 0 ? -100 : screenW + 100;
    }
    if (entry === 'alternating') {
      return (startLeft ? index % 2 === 0 : index % 2 !== 0) ? -100 : screenW + 100;
    }
    return startLeft ? -100 : screenW + 100;
  }

  spawnEliteMiddleShip(profileId, context = {}) {
    const profile = getEliteMiddleShipProfile(profileId);
    if (!profile) return null;
    const marketingDebug = context.marketingDebug === true;
    if (!marketingDebug && !context.ignoreLevelGate && (Number(this.level) || 1) < profile.minLevel) return null;

    const activeElites = this.enemies.filter(enemy =>
      enemy?.kind === 'elite_middle_ship' && (enemy.active !== false || enemy.waitingForEntry)
    ).length;
    const maxActive = getEliteMiddleShipMaxActive(this.level);
    if (!marketingDebug && !context.ignoreCaps && activeElites >= maxActive) {
      console.log(`[EliteMiddleShipSpawn] skipped id=${profile.id} active=${activeElites} cap=${maxActive}`);
      return null;
    }

    const screenW = this.game.getWidth();
    const screenH = this.game.getHeight();
    const startLeft = Math.random() < 0.5;
    const startX = this.getWaveEntryX(context.entry || 'single', this.eliteMiddleShipsSpawnedThisLevel, startLeft, screenW);
    const targetX = Number.isFinite(context.targetX)
      ? Math.max(74, Math.min(screenW - 74, context.targetX))
      : Math.max(74, Math.min(screenW - 74, screenW * (0.32 + Math.random() * 0.36)));
    const eliteMinY = Math.max(126, Math.min(156, screenH * 0.12));
    const targetY = Number.isFinite(context.targetY)
      ? Math.max(eliteMinY, Math.min(screenH * 0.38, context.targetY))
      : Math.max(eliteMinY, Math.min(screenH * 0.36, 138 + Math.random() * 72));
    const enemy = new Enemy(startX, -124, profile.id, this.level, this.game, context.waveColor || 'Black');
    enemy.kind = 'elite_middle_ship';
    enemy.marketingDebug = marketingDebug;
    enemy.applyWaveTactic?.(context.tactic || { id: 'elite_priority', fireScalar: 0.86, fireDelayMult: 1.16 }, {
      index: 0,
      count: 1,
      formation: context.formation || 'ELITE',
      centerX: targetX,
      centerY: targetY,
      side: targetX < screenW / 2 ? -1 : 1
    });
    if (Number.isFinite(context.healthScalar)) {
      enemy.health = Math.max(1, Math.round((enemy.health || 1) * context.healthScalar));
      enemy.maxHealth = enemy.health;
      enemy.updateHealthBar?.();
    }
    if (Number.isFinite(context.fireDelayMult)) {
      enemy.shootDelay = Math.round((enemy.shootDelay || 120) * context.fireDelayMult);
    }
    if (enemy.eliteAbility && Number.isFinite(context.specialDelayMs)) {
      const now = Date.now();
      enemy.eliteAbility.state = 'cooldown';
      enemy.eliteAbility.nextAt = now + context.specialDelayMs;
    }
    enemy.startEntry(startX, -124, targetX, targetY, context.entryDurationMs || 1450, context.delayMs || 260);
    this.enemies.push(enemy);
    this.container.addChild(enemy.sprite);
    this.eliteMiddleShipsSpawnedThisLevel += 1;

    AudioManager.playSfx(profile.sfx?.spawn || 'elite_spawn_alert', { volume: 0.54, minIntervalMs: 900 });
    const playScene = this.game.scenes?.play;
    playScene?.recordThreatDiscovery?.(profile.id, 'elites', {
      name: profile.displayName || profile.id,
      role: profile.role || 'elite',
      sector: this.level
    });
    playScene?.showToast?.(`ELITE SIGNAL: ${profile.displayName}`, {
      fontSize: this.game.getWidth() < 620 ? 14 : 18,
      fill: '#ffd166',
      stroke: '#1c0b00',
      strokeThickness: 4,
      duration: 1500,
      slot: 'top',
      type: 'elite_middle_ship',
      priority: 4,
      maxWidth: this.game.getWidth() * 0.76
    });
    console.log(`[EliteMiddleShipSpawn] level=${this.level} wave=${this.currentWaveIndex + 1}/${this.normalWavesTotal} id=${profile.id} role=${profile.role} marketing=${marketingDebug}`);
    return enemy;
  }

  spawnMultiEliteMiddleShips(profileIds, context = {}) {
    const ids = Array.isArray(profileIds) ? profileIds.filter(Boolean) : [];
    if (ids.length < 2) return [];

    const screenW = this.game.getWidth();
    const screenH = this.game.getHeight();
    const level = Math.max(1, Number(this.level) || 1);
    const levelBonus = Math.min(0.04, Math.max(0, level - 1) * 0.004);
    const desiredFraction = (ids.length >= 3 ? 0.49 : 0.42) + levelBonus;
    const span = Math.min(screenW * 0.6, Math.max(screenW * 0.38, screenW * desiredFraction));
    const left = screenW / 2 - span / 2;
    const compensation = context.compensation || {};
    const spawned = [];
    ids.forEach((id, index) => {
      const r = ids.length <= 1 ? 0.5 : index / (ids.length - 1);
      const targetX = left + r * span;
      const targetY = Math.max(Math.max(132, screenH * 0.125), Math.min(screenH * 0.34, 138 + (index % 2) * 58));
      const enemy = this.spawnEliteMiddleShip(id, {
        formation: context.formation || 'MULTI_ELITE',
        tactic: {
          ...(context.tactic || {}),
          id: 'multi_elite_pressure',
          fireScalar: compensation.eliteTacticFireScalar || 0.48,
          fireDelayMult: compensation.eliteFireDelayMult || 1.58,
          entrySpeed: 0.9
        },
        waveColor: context.waveColor || 'Black',
        entry: context.entry || 'split',
        ignoreCaps: true,
        ignoreLevelGate: true,
        targetX,
        targetY,
        delayMs: 420 + index * 620,
        entryDurationMs: 1550 + index * 140,
        healthScalar: compensation.eliteHealthScalar || 0.55,
        fireDelayMult: compensation.eliteFireDelayMult || 1.58,
        specialDelayMs: 2200 + index * (compensation.specialDelayStepMs || 2500)
      });
      if (enemy) spawned.push(enemy);
    });

    const playScene = this.game?.scenes?.play;
    if (spawned.length >= 2) {
      playScene?.showToast?.(translateText(spawned.length >= 3 ? 'ELITE TRIO INBOUND!' : 'ELITE DUO INBOUND!'), {
        fontSize: this.game.getWidth() < 620 ? 15 : 19,
        fill: '#ffd166',
        stroke: '#1c0b00',
        strokeThickness: 4,
        duration: 1500,
        slot: 'top',
        type: 'elite_middle_ship',
        priority: 4,
        maxWidth: this.game.getWidth() * 0.76
      });
    }
    console.log(`[MultiEliteWave] level=${this.level} wave=${this.currentWaveIndex + 1} elites=${spawned.length} compensation=${JSON.stringify({
      count: `${compensation.normalCountBefore}->${compensation.normalCountAfter}`,
      eliteHp: compensation.eliteHealthScalar,
      eliteFireDelay: compensation.eliteFireDelayMult
    })}`);
    return spawned;
  }

  spawnEliteSupportDrone(source, { count = 2, split = false } = {}) {
    if (!source?.active && !split) return 0;
    const screenW = this.game.getWidth();
    const type = pickGeneratedEnemyTypeForLevel(Math.max(1, Math.min(this.level || 1, 18)));
    const spawnCount = Math.max(1, Math.min(3, count));
    let spawned = 0;
    for (let i = 0; i < spawnCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const startX = Math.max(42, Math.min(screenW - 42, (source.x || screenW / 2) + side * (42 + i * 18)));
      const enemy = new Enemy(startX, (source.y || 90) + 12, type, this.level, this.game, source.waveColor || 'Blue');
      enemy.kind = 'elite_support';
      enemy.health = Math.max(1, Math.min(enemy.health, split ? 3 : 4));
      enemy.maxHealth = enemy.health;
      enemy.scoreValue = split ? 45 : 70;
      enemy.shootDelay *= split ? 1.45 : 1.25;
      enemy.radius = Math.max(12, Math.round(enemy.radius * 0.82));
      enemy.updateHealthBar?.();
      enemy.applyWaveTactic?.({ id: 'elite_support', fireScalar: split ? 0.35 : 0.5, fireDelayMult: 1.2, entrySpeed: 0.8 }, {
        index: i,
        count: spawnCount,
        formation: 'ELITE_SUPPORT',
        centerX: source.x || screenW / 2,
        centerY: (source.y || 90) + 70,
        side
      });
      enemy.startEntry(startX, (source.y || 90) - 24, startX + side * 36, (source.y || 90) + 78 + i * 22, 780, i * 120);
      this.enemies.push(enemy);
      this.container.addChild(enemy.sprite);
      spawned += 1;
    }
    if (spawned > 0) {
      AudioManager.playSfx('drone_launch_blip', { volume: 0.44, minIntervalMs: 260 });
      console.log(`[EliteSupportDrone] source=${source.type} spawned=${spawned} split=${Boolean(split)}`);
    }
    return spawned;
  }

  getLanePressureForPosition(x, formation = 'ARC') {
    const screenW = Math.max(1, this.game.getWidth());
    const centerOffset = Math.abs(x - screenW / 2) / (screenW / 2);
    const formationName = String(formation || 'ARC');
    const tacticalWideFormation = ['PINCER', 'SCREEN_DOOR', 'CROSS_STREAM', 'SIDEWINDER'].includes(formationName);

    if (centerOffset >= 0.54) {
      return { label: 'outer', fireScalar: tacticalWideFormation ? 0.72 : 0.66, fireDelayMult: 1.18, diveBias: 0.62 };
    }
    if (centerOffset >= 0.42) {
      return { label: 'wide', fireScalar: tacticalWideFormation ? 0.84 : 0.78, fireDelayMult: 1.1, diveBias: 0.76 };
    }
    if (centerOffset >= 0.3) {
      return { label: 'mid', fireScalar: 0.92, fireDelayMult: 1.04, diveBias: 0.9 };
    }
    return { label: 'center', fireScalar: 1, fireDelayMult: 1, diveBias: 1 };
  }

  applyLanePressureToTactic(tactic = {}, lanePressure = null) {
    if (!lanePressure) return tactic;
    return {
      ...tactic,
      fireScalar: (tactic.fireScalar || 1) * lanePressure.fireScalar,
      fireDelayMult: (tactic.fireDelayMult || 1) * lanePressure.fireDelayMult,
      diveBias: (tactic.diveBias || 1) * lanePressure.diveBias,
      lanePressure: lanePressure.label
    };
  }

  getCombatBoundsForPositions(positions = [], formation = 'ARC') {
    const screenW = this.game.getWidth();
    const centerX = screenW / 2;
    const xs = positions.map((pos) => pos.x).filter(Number.isFinite);
    if (!xs.length) {
      return {
        minX: centerX - screenW * 0.2,
        maxX: centerX + screenW * 0.2,
        swayScalar: 0.72
      };
    }

    const level = Math.max(1, Number(this.level) || 1);
    const wideFormation = ['PINCER', 'SCREEN_DOOR', 'CROSS_STREAM', 'SIDEWINDER'].includes(String(formation || 'ARC'));
    const padding = Math.max(42, Math.min(82, screenW * (wideFormation ? 0.035 : 0.028)));
    const levelCap = Math.min(
      screenW * (wideFormation ? 0.6 : 0.5),
      screenW * ((wideFormation ? 0.46 : 0.4) + Math.min(0.1, Math.max(0, level - 1) * 0.006))
    );
    const rawMin = Math.min(...xs) - padding;
    const rawMax = Math.max(...xs) + padding;
    const rawSpan = rawMax - rawMin;
    const span = Math.min(rawSpan, levelCap);
    const mid = (rawMin + rawMax) / 2;
    const minX = Math.max(72, mid - span / 2);
    const maxX = Math.min(screenW - 72, mid + span / 2);
    return {
      minX,
      maxX,
      swayScalar: level <= 2 ? 0.58 : level <= 5 ? 0.7 : 0.82
    };
  }

  getFormationPositions(type, count) {
    const pos = [];
    const cw = this.game.getWidth() / 2;
    const sw = this.game.getWidth();
    const edgeMargin = Math.max(72, Math.min(170, sw * 0.075));
    const clampX = (x) => Math.max(edgeMargin, Math.min(sw - edgeMargin, x));
    const available = Math.max(0, sw - edgeMargin * 2);
    const level = Math.max(1, Number(this.level) || 1);
    const baseFractions = {
      TUTORIAL_ARC: 0.34,
      GRID: 0.36,
      V_SHAPE: 0.34,
      BOX: 0.35,
      STAGGERED_WING: 0.38,
      PINCER: 0.42,
      DIAGONAL_RAID: 0.37,
      SIDEWINDER: 0.38,
      ORBIT_RING: 0.3,
      CROSS_STREAM: 0.42,
      SCREEN_DOOR: 0.44,
      DOUBLE_ARC: 0.39,
      SPIRAL: 0.28,
      ARC: 0.36
    };
    const maxFractions = {
      TUTORIAL_ARC: 0.42,
      GRID: 0.48,
      V_SHAPE: 0.46,
      BOX: 0.46,
      STAGGERED_WING: 0.52,
      PINCER: 0.58,
      DIAGONAL_RAID: 0.5,
      SIDEWINDER: 0.52,
      ORBIT_RING: 0.38,
      CROSS_STREAM: 0.56,
      SCREEN_DOOR: 0.58,
      DOUBLE_ARC: 0.52,
      SPIRAL: 0.34,
      ARC: 0.48
    };
    const spanFor = (formation, min = 0) => {
      const key = baseFractions[formation] ? formation : 'ARC';
      const levelBonus = Math.min(0.085, Math.max(0, level - 1) * 0.0045);
      const countScale = count <= 5 ? 0.88 : count <= 7 ? 0.95 : count <= 9 ? 1 : 1.04;
      const fraction = Math.min(maxFractions[key], (baseFractions[key] + levelBonus) * countScale);
      const desired = sw * fraction;
      const floor = Math.min(min, available);
      return Math.max(0, Math.min(available, Math.max(floor, desired)));
    };
    const xAt = (index, total, span, center = cw) => {
      const r = total <= 1 ? 0.5 : index / (total - 1);
      return clampX(center - span / 2 + r * span);
    };

    switch (type) {
      case 'TUTORIAL_ARC': {
        const usable = spanFor(type, 420);
        for (let i = 0; i < count; i++) {
          const r = count <= 1 ? 0.5 : i / (count - 1);
          pos.push({
            x: xAt(i, count, usable),
            y: 92 + Math.sin(r * Math.PI) * 56
          });
        }
        break;
      }
      case 'STAGGERED_WING': {
        const usable = spanFor(type, 520);
        const rows = [88, 130, 172];
        for (let i = 0; i < count; i++) {
          const r = count <= 1 ? 0.5 : i / (count - 1);
          const row = i % rows.length;
          pos.push({
            x: xAt(i, count, usable),
            y: rows[row] + Math.abs(r - 0.5) * 36
          });
        }
        break;
      }
      case 'PINCER': {
        const usable = spanFor(type, 560);
        const left = cw - usable / 2;
        const right = cw + usable / 2;
        const step = Math.max(44, Math.min(92, usable / Math.max(8, count)));
        for (let i = 0; i < count; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const row = Math.floor(i / 2);
          pos.push({
            x: clampX(side < 0 ? left + row * step : right - row * step),
            y: 90 + row * 42 + (side > 0 ? 14 : 0)
          });
        }
        break;
      }
      case 'DIAGONAL_RAID': {
        const usable = spanFor(type, 520);
        for (let i = 0; i < count; i++) {
          const r = count <= 1 ? 0.5 : i / (count - 1);
          pos.push({
            x: xAt(i, count, usable),
            y: 76 + r * 132
          });
        }
        break;
      }
      case 'SIDEWINDER': {
        const usable = spanFor(type, 540);
        for (let i = 0; i < count; i++) {
          const r = count <= 1 ? 0.5 : i / (count - 1);
          pos.push({
            x: xAt(i, count, usable),
            y: 126 + Math.sin(r * Math.PI * 2) * 50
          });
        }
        break;
      }
      case 'ORBIT_RING': {
        const radiusX = spanFor(type, 420) / 2;
        const radiusY = 76;
        for (let i = 0; i < count; i++) {
          const angle = (i / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
          pos.push({
            x: clampX(cw + Math.cos(angle) * radiusX),
            y: 142 + Math.sin(angle) * radiusY
          });
        }
        break;
      }
      case 'CROSS_STREAM': {
        const usable = spanFor(type, 540);
        const left = cw - usable / 2;
        const right = cw + usable / 2;
        for (let i = 0; i < count; i++) {
          const half = Math.ceil(count / 2);
          const lane = i < half ? -1 : 1;
          const idx = i < half ? i : i - half;
          const r = half <= 1 ? 0.5 : idx / (half - 1);
          pos.push({
            x: clampX(lane < 0 ? left + r * usable * 0.46 : right - r * usable * 0.46),
            y: 88 + idx * 30
          });
        }
        break;
      }
      case 'SCREEN_DOOR': {
        const lanes = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(Math.max(1, count))) + 1));
        const usable = spanFor(type, 560);
        for (let i = 0; i < count; i++) {
          const lane = i % lanes;
          const row = Math.floor(i / lanes);
          pos.push({
            x: xAt(lane, lanes, usable) + (row % 2 ? Math.min(34, usable / lanes * 0.22) : 0),
            y: 78 + row * 44
          });
        }
        break;
      }
      case 'GRID': {
        const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(Math.max(1, count))) + 1));
        const usable = spanFor(type, 500);
        for (let i = 0; i < count; i++) {
          const x = xAt(i % cols, cols, usable);
          const y = 80 + Math.floor(i / cols) * 60;
          pos.push({ x, y });
        }
        break;
      }
      case 'V_SHAPE': {
        const usable = spanFor(type, 480);
        const maxRow = Math.max(1, Math.ceil(count / 2));
        for (let i = 0; i < count; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const row = Math.floor((i + 1) / 2);
          const offset = row <= 0 ? 0 : (row / maxRow) * usable / 2;
          pos.push({ x: clampX(cw + offset * side), y: 80 + row * 30 });
        }
        break;
      }
      case 'BOX':
        // Box with hole
        const bCols = 5;
        const boxSpan = spanFor(type, 500);
        for (let i = 0, placed = 0; placed < count && i < count + 4; i++) {
          const cx = (i % bCols);
          const cy = Math.floor(i / bCols);
          if (cx === 2 && cy === 1) continue; // Hole
          pos.push({ x: xAt(cx, bCols, boxSpan), y: 80 + cy * 50 });
          placed += 1;
        }
        break;
      case 'DOUBLE_ARC': {
        const laneCount = Math.ceil(count / 2);
        const usable = spanFor(type, 540);
        for (let i = 0; i < count; i++) {
          const lane = i % 2;
          const index = Math.floor(i / 2);
          const r = laneCount <= 1 ? 0.5 : index / (laneCount - 1);
          pos.push({
            x: xAt(index, laneCount, usable),
            y: 88 + lane * 64 + Math.sin(r * Math.PI) * 42
          });
        }
        break;
      }
      case 'SPIRAL': {
        // Just a circle/spiral
        const radiusXMax = spanFor(type, 380) / 2;
        for (let i = 0; i < count; i++) {
          const angle = (i / Math.max(1, count)) * Math.PI * 2;
          const r = count <= 1 ? 0 : 0.24 + (i / Math.max(1, count - 1)) * 0.76;
          pos.push({ x: clampX(cw + Math.cos(angle) * radiusXMax * r), y: 150 + Math.sin(angle) * 92 * r });
        }
        break;
      }
      default:
        // ARC / S_CURVE standard
        const usable = spanFor('ARC', 500);
        for (let i = 0; i < count; i++) {
          const r = count <= 1 ? 0.5 : i / (count - 1);
          pos.push({ x: xAt(i, count, usable), y: 100 + Math.sin(r * Math.PI) * 100 });
        }
        break;
    }
    const minFormationY = this.game.getHeight() < 620 ? 88 : 104;
    const maxFormationY = Math.max(minFormationY + 40, this.game.getHeight() * 0.34);
    return pos.map(({ x, y }) => ({
      x: clampX(x),
      y: Math.max(minFormationY, Math.min(maxFormationY, y))
    }));
  }

  async spawnBoss(level, options = {}) {
    const marketingDebug = options.marketingDebug === true;
    const centerX = Number.isFinite(options.x)
      ? options.x
      : marketingDebug
        ? Math.max(140, Math.min(this.game.getWidth() - 140, this.game.getWidth() * (0.22 + Math.random() * 0.56)))
        : this.game.getWidth() / 2;
    const spawnY = Number.isFinite(options.y)
      ? options.y
      : marketingDebug
        ? Math.max(82, Math.min(this.game.getHeight() * 0.32, 82 + Math.random() * 110))
        : 100;
    const boss = new Boss(centerX, spawnY, level, this.game); // VISIBILITY FIX: Spawn at visible position

    // Wait for boss visual to load
    await boss.createSprite();

    boss.marketingDebug = marketingDebug;
    if (marketingDebug) {
      boss.baseX = centerX;
      boss.bossLaneY = spawnY;
      boss.entryStartMs = null;
      boss.entryFromY = spawnY;
      boss.entryToY = spawnY;
      boss.x = centerX;
      boss.y = spawnY;
      if (boss.sprite) {
        boss.sprite.x = centerX;
        boss.sprite.y = spawnY;
      }
    }
    if (!marketingDebug) {
      this.boss = boss;
      this.bossSpawnedThisLevel = true;
      this.bossSpawnedAtMs = Date.now();
      this.bossChaosEventsThisBoss = 0;
      this.bossChaosNextCheckAtMs = Date.now() + 8000 + Math.random() * 4000;
      this.bossChaosCooldownUntilMs = 0;
      this.bossChaosPressureReliefUntilMs = 0;
    } else {
      this.boss = boss;
    }
    this.enemies.push(boss);
    this.container.addChild(boss.sprite);

    // Force visibility
    boss.sprite.visible = true;
    boss.sprite.alpha = 1;

    // Diagnostic
    const textureOk = boss.sprite.children.length > 0;
    console.log(`[BossVisual] type=${boss.bossType || 'UNKNOWN'} level=${level} textureOk=${textureOk}`);
    console.log(`[BossFlow] boss active level=${level} bossSpawned=true bossActive=${boss.active}`);
    let bulletsCleared = false;
    const playScene = this.game.scenes && this.game.scenes.play ? this.game.scenes.play : null;
    if (!marketingDebug) {
      const bossId = boss.profile?.id || boss.bossType || `boss_${level}`;
      playScene?.recordThreatDiscovery?.(bossId, 'bosses', {
        name: boss.profile?.name || boss.name || boss.bossType || `Boss ${level}`,
        role: boss.profile?.title || 'boss',
        sector: level
      });
      playScene?.triggerCabinetLog?.('first-boss-spawn', {
        name: boss.profile?.name || boss.name || boss.bossType || `Boss ${level}`,
        source: 'boss_spawn'
      });
    }
    if (!marketingDebug && playScene?.showBossIntro) {
      const taunt = playScene.getBossTauntCaption ? playScene.getBossTauntCaption('boss_spawn') : getMicroMessage('bossIntro');
      playScene.showBossIntro(boss.name, taunt);
    }
    if (!marketingDebug) {
      AudioManager.playMusicContext('boss', { resetPlaylist: true });
    } else {
      AudioManager.playSfx('boss_reveal_stinger', { force: true, volume: 0.72, minIntervalMs: 0 });
    }
    if (!marketingDebug && playScene && playScene.bulletManager) {
      const bm = playScene.bulletManager;
      bm.playerBullets.forEach(b => {
        b.active = false;
        if (b.sprite && b.sprite.parent) b.sprite.parent.removeChild(b.sprite);
      });
      bm.enemyBullets.forEach(b => {
        b.active = false;
        if (b.sprite && b.sprite.parent) b.sprite.parent.removeChild(b.sprite);
      });
      bm.playerBullets = [];
      bm.enemyBullets = [];
      bulletsCleared = true;
    }
    console.log(`[BossSpawnProof] level=${level} hp=${boss.health} x=${Math.round(boss.x)} y=${Math.round(boss.y)} invulnMs=${boss.invulnerableUntilMs - boss.spawnedAtMs} bulletsCleared=${bulletsCleared} marketing=${marketingDebug}`);
    console.log(`[BossPhase] level=${level} phase=${this.phase} spawned bossSpawned=true bossActive=${boss.active}`);
    this.logBossStatus('boss_spawn_complete');
    return boss;
  }

  getBossChaosMaxEvents(level = this.level) {
    const safeLevel = Math.max(1, Number(level) || 1);
    if (safeLevel <= 1) return 0;
    if (safeLevel <= 4) return 1;
    if (safeLevel <= 9) return 2;
    return 3;
  }

  getActiveBossChaosEnemies() {
    return this.enemies.filter((enemy) =>
      enemy?.active !== false &&
      (enemy.waitingForEntry || enemy.active) &&
      enemy.kind !== 'boss' &&
      enemy.kind !== 'bonus_drone'
    );
  }

  maybeTriggerBossChaos() {
    if (this.state !== 'BOSS_ACTIVE' || !this.boss?.active || this.bossDefeatedThisLevel) return;
    const level = Math.max(1, Number(this.level) || 1);
    const maxEvents = this.getBossChaosMaxEvents(level);
    if (maxEvents <= 0 || this.bossChaosEventsThisBoss >= maxEvents) return;

    const now = Date.now();
    if (now < (this.bossSpawnedAtMs || this.boss.spawnedAtMs || now) + 8000) return;
    if (now < this.bossChaosCooldownUntilMs || now < this.bossChaosNextCheckAtMs) return;

    this.bossChaosNextCheckAtMs = now + 2200 + Math.random() * 1600;
    if (this.boss.telegraph || this.boss.regularTelegraph || this.boss.health <= 0) return;

    const playScene = this.game?.scenes?.play;
    if (playScene?.lastHitAt && now - playScene.lastHitAt < 5200) return;

    const activeChaosEnemies = this.getActiveBossChaosEnemies();
    const activeBullets = playScene?.bulletManager?.enemyBullets?.filter((bullet) => bullet?.active !== false).length || 0;
    const enemyCap = level <= 4 ? 2 : level <= 9 ? 5 : 7;
    const bulletCap = level <= 4 ? 14 : level <= 9 ? 22 : 30;
    if (activeChaosEnemies.length > enemyCap || activeBullets > bulletCap) return;

    const chance = level <= 4 ? 0.11 : level <= 9 ? 0.18 : 0.24;
    if (Math.random() > chance) return;

    const roll = Math.random();
    const event = level >= 10 && roll < 0.12
      ? 'BOTH'
      : level >= 5 && roll < 0.42
        ? 'MINI_BOSS'
        : 'SUPPORT_WAVE';
    this.triggerBossChaosEvent(event);
  }

  triggerBossChaosEvent(event) {
    const level = Math.max(1, Number(this.level) || 1);
    const now = Date.now();
    let supportCount = 0;
    let elite = null;

    if (event === 'SUPPORT_WAVE' || event === 'BOTH') {
      supportCount = this.spawnBossChaosSupportWave();
    }
    if (event === 'MINI_BOSS' || event === 'BOTH') {
      elite = this.spawnBossChaosMiniBoss();
    }

    const spawned = supportCount + (elite ? 1 : 0);
    if (spawned <= 0) {
      this.bossChaosCooldownUntilMs = now + 4500;
      return;
    }

    this.bossChaosEventsThisBoss += 1;
    const reliefMs = event === 'BOTH' ? 9800 : event === 'MINI_BOSS' ? 8500 : 6500;
    this.bossChaosPressureReliefUntilMs = Math.max(this.bossChaosPressureReliefUntilMs || 0, now + reliefMs);
    if (this.boss) {
      this.boss.chaosPressureReliefUntilMs = this.bossChaosPressureReliefUntilMs;
      this.boss.regularAttackReadyAt = Math.max(this.boss.regularAttackReadyAt || 0, now + 1300);
      this.boss.signatureCooldown = Math.max(this.boss.signatureCooldown || 0, 90);
    }
    this.bossChaosCooldownUntilMs = now + (level >= 10 ? 14000 : 18000) + Math.random() * 3500;

    const playScene = this.game?.scenes?.play;
    const toastKey = event === 'BOTH'
      ? 'BOSS CHAOS: SUPPORT + ELITE!'
      : event === 'MINI_BOSS'
        ? 'BOSS CHAOS: ELITE SIGNAL!'
        : 'BOSS CHAOS: SUPPORT WAVE!';
    playScene?.showToast?.(translateText(toastKey), {
      fontSize: this.game.getWidth() < 620 ? 15 : 18,
      fill: '#ffcc66',
      stroke: '#1c0b00',
      strokeThickness: 4,
      duration: 1350,
      slot: 'top',
      type: 'boss',
      priority: 4,
      maxWidth: this.game.getWidth() * 0.76
    });
    console.log(`[BossChaos] event=${event} level=${level} count=${spawned}`);
    if (elite) console.log(`[BossChaos] event=MINI_BOSS level=${level} id=${elite.type || elite.middleShipProfile?.id || 'unknown'}`);
    if (supportCount > 0) console.log(`[BossChaos] event=SUPPORT_WAVE level=${level} count=${supportCount}`);
    console.log(`[BossChaos] pressureReliefUntil=${this.bossChaosPressureReliefUntilMs}`);
  }

  spawnBossChaosSupportWave() {
    const level = Math.max(1, Number(this.level) || 1);
    const activeBossAdds = this.enemies.filter((enemy) =>
      enemy?.kind === 'boss_chaos_support' && (enemy.active || enemy.waitingForEntry)
    ).length;
    const maxActive = level <= 4 ? 3 : level <= 9 ? 4 : 5;
    const desired = level <= 4 ? 2 : level <= 9 ? 3 : 4;
    const spawnCount = Math.max(0, Math.min(desired, maxActive - activeBossAdds));
    if (spawnCount <= 0) return 0;

    const positions = this.getFormationPositions(level >= 7 ? 'STAGGERED_WING' : 'ARC', spawnCount);
    const screenW = this.game.getWidth();
    const startLeft = Math.random() < 0.5;
    const type = pickGeneratedEnemyTypeForLevel(Math.max(1, Math.min(level, 18)));
    const tactic = { id: 'boss_chaos_support', fireScalar: 0.34, fireDelayMult: 1.46, entrySpeed: 0.92, volley: 'staggered', shot: 'needle' };
    let spawned = 0;
    positions.forEach((pos, index) => {
      const startX = this.getWaveEntryX(index % 2 === 0 ? 'split' : 'alternating', index, startLeft, screenW);
      const enemy = new Enemy(startX, -118, type, level, this.game, 'Red');
      const lanePressure = this.getLanePressureForPosition(pos.x, 'BOSS_CHAOS_SUPPORT');
      const supportTactic = this.applyLanePressureToTactic(tactic, lanePressure);
      enemy.kind = 'boss_chaos_support';
      enemy.health = Math.max(1, Math.min(enemy.health, level <= 4 ? 2 : 3));
      enemy.maxHealth = enemy.health;
      enemy.scoreValue = Math.max(30, Math.round((enemy.scoreValue || 60) * 0.7));
      enemy.shootDelay = Math.round((enemy.shootDelay || 120) * 1.45);
      enemy.radius = Math.max(12, Math.round((enemy.radius || 16) * 0.88));
      enemy.updateHealthBar?.();
      enemy.applyWaveTactic?.(supportTactic, {
        index,
        count: spawnCount,
        formation: 'BOSS_CHAOS_SUPPORT',
        centerX: screenW / 2,
        centerY: 150,
        side: pos.x < screenW / 2 ? -1 : 1
      });
      enemy.startEntry(startX, -70, pos.x, pos.y + 54, 1280, index * 180);
      this.enemies.push(enemy);
      this.container.addChild(enemy.sprite);
      spawned += 1;
    });
    return spawned;
  }

  spawnBossChaosMiniBoss() {
    const level = Math.max(1, Number(this.level) || 1);
    const activeElites = this.enemies.filter((enemy) =>
      enemy?.kind === 'elite_middle_ship' && (enemy.active || enemy.waitingForEntry)
    ).length;
    if (activeElites > 0) return null;

    const ids = this.pickEliteMiddleShipIds(level, 1, { includeGentleFallback: true });
    const id = ids[0];
    if (!id) return null;

    const screenW = this.game.getWidth();
    const side = (Math.random() < 0.5 ? 0.36 : 0.64) + (Math.random() - 0.5) * 0.04;
    return this.spawnEliteMiddleShip(id, {
      formation: 'BOSS_CHAOS_ELITE',
      tactic: { id: 'boss_chaos_elite', fireScalar: 0.42, fireDelayMult: 1.65, entrySpeed: 0.88 },
      waveColor: 'Black',
      entry: 'split',
      ignoreCaps: true,
      ignoreLevelGate: level < 3,
      targetX: screenW * side,
      targetY: Math.max(108, Math.min(this.game.getHeight() * 0.31, 128 + Math.random() * 56)),
      delayMs: 360,
      entryDurationMs: 1600,
      healthScalar: level <= 4 ? 0.46 : 0.58,
      fireDelayMult: level <= 4 ? 1.8 : 1.58,
      specialDelayMs: 3600
    });
  }

  spawnBossAdds(count = 6) {
    if (this.state !== 'BOSS_ACTIVE' || !this.boss?.active || this.level <= 1) {
      return 0;
    }

    const now = Date.now();
    if (now < this.bossAddWaveCooldownUntilMs) {
      return 0;
    }

    const activeAdds = this.enemies.filter(enemy =>
      enemy?.kind === 'boss_add' && (enemy.active || enemy.waitingForEntry)
    ).length;
    const maxActiveAdds = Math.min(6, 3 + Math.floor(this.level / 2));
    const spawnCount = Math.max(0, Math.min(count, maxActiveAdds - activeAdds));
    if (spawnCount <= 0) {
      this.bossAddWaveCooldownUntilMs = now + 1800;
      return 0;
    }

    const positions = this.getFormationPositions('ARC', spawnCount);
    const screenW = this.game.getWidth();
    const startLeft = Math.random() < 0.5;
    const startX = startLeft ? -80 : screenW + 80;
    const waveColor = 'Red';

    const addTypes = ['nova_enemy_02', 'nova_enemy_09', 'nova_enemy_17', 'nova_enemy_26', 'nova_enemy_35', 'nova_enemy_44'];

    positions.forEach((pos, i) => {
      const enemyType = addTypes[(this.bossAddWaveCount + i) % addTypes.length];
      const enemy = new Enemy(startX, -100, enemyType, this.level, this.game, waveColor);
      enemy.kind = 'boss_add';
      enemy.scoreValue = Math.max(25, Math.round((enemy.scoreValue || 30) * 0.75));
      enemy.health = Math.min(enemy.health, 2 + Math.floor(this.level / 2));
      enemy.maxHealth = enemy.health;
      enemy.shootDelay = Math.round((enemy.shootDelay || 100) * 1.2);
      enemy.radius = Math.max(13, Math.round((enemy.radius || 16) * 0.92));
      enemy.startEntry(startX, -50, pos.x, pos.y + 40, 1350, i * 110);
      this.enemies.push(enemy);
      this.container.addChild(enemy.sprite);
    });

    this.bossAddWaveCount += 1;
    this.bossAddWaveCooldownUntilMs = now + 5200;
    const playScene = this.game?.scenes?.play;
    if (playScene?.enqueueToast) {
      playScene.enqueueToast('BOSS SUPPORT SQUAD!', {
        fontSize: 18,
        fill: '#ff8844',
        slot: 'top',
        type: 'boss_adds',
        duration: 1200
      });
    }
    console.log(`[BossAdds] level=${this.level} spawned=${spawnCount} activeBefore=${activeAdds} cap=${maxActiveAdds} side=${startLeft ? 'left' : 'right'}`);
    return spawnCount;
  }

  clearNonBossEnemyVisuals(reason = 'boss_defeated') {
    let cleared = 0;
    this.enemies = this.enemies.filter(enemy => {
      if (!enemy) return false;
      if (enemy.kind === 'boss' || enemy.kind === 'bonus_drone') return true;
      this.removeEnemySprite(enemy, reason);
      cleared += 1;
      return false;
    });
    return cleared;
  }

  applyModifier(enemy) {
    if (this.currentModifier === 'SHIELDED') {
      enemy.health = Math.ceil(enemy.health * 1.5);
      enemy.maxHealth = Math.max(enemy.maxHealth || enemy.health, enemy.health);
      enemy.updateHealthBar?.();
      if (enemy.sprite) enemy.sprite.tint = 0x8888ff;
    } else if (this.currentModifier === 'AGGRESSIVE') {
      enemy.shootDelay *= 0.7;
      if (enemy.sprite) enemy.sprite.tint = 0xff8888;
    } else if (this.currentModifier === 'SWIFT') {
      enemy.speed = enemy.speed ? enemy.speed * 1.4 : 1.4;
      if (enemy.sprite) enemy.sprite.tint = 0xffff88;
    }
  }

  onWaveCleared() {
    console.log('Wave Cleared!');
    console.log(`[BossPhase] level=${this.level} phase=${this.phase} waveCleared waveIndex=${this.currentWaveIndex} of ${this.normalWavesTotal}`);
    if (this.phase !== 'WAVES') return;

    const clearedWaveIndex = this.currentWaveIndex;
    const clearedWave = (clearedWaveIndex >= 0 && clearedWaveIndex < this.waves.length) ? this.waves[clearedWaveIndex] : null;
    const clearedWaveNumber = clearedWaveIndex + 1;
    if (this.game?.scenes?.play) {
      const playScene = this.game.scenes.play;
      playScene.wavesCleared = (Number(playScene.wavesCleared) || 0) + 1;
      if ((Number(playScene.damageTakenThisWave) || 0) === 0) {
        playScene.noHitWavesThisRun = (Number(playScene.noHitWavesThisRun) || 0) + 1;
        this.game.addScore(400, 'noHitBonus');
      }
      playScene.damageTakenThisWave = 0;
    }
    let hasUpcomingWave = clearedWaveIndex < this.normalWavesTotal - 1;

    if (!hasUpcomingWave && this.shouldAddBossSpacingWave()) {
      const extraWave = this.createBossSpacingWave();
      this.waves.push(extraWave);
      this.normalWavesTotal += 1;
      this.bossWaveIndex = this.normalWavesTotal;
      this.bossIntervalExtraWaves += 1;
      hasUpcomingWave = true;
      const elapsedSeconds = ((Date.now() - this.levelStartTime) / 1000).toFixed(1);
      console.log(`[BossSpacing] inserted wave=${this.normalWavesTotal} level=${this.level} elapsed=${elapsedSeconds}s minWaves=${BalanceConfig.difficulty.MIN_WAVES_BETWEEN_BOSSES} minSeconds=${BalanceConfig.difficulty.MIN_SECONDS_BETWEEN_BOSSES}`);
    }

    if (clearedWave && clearedWave.isChallenge) {
      // Challenge Bonus
      const bonus = 3000;
      const appliedBonus = this.game.addScore(bonus);
      if (this.game.scenes.play) {
        this.game.scenes.play.showWaveBonusEffect(appliedBonus, 'BONUS DRONE RAID CLEAR!');
      }
      AudioManager.playVoice('mission_control_wave_clear', { cooldownMs: 30000, duckMs: 1300 });
    } else {
      // Normal Bonus
      const rewardConfig = BalanceConfig.rewards || {};
      const bonus = (rewardConfig.waveClearScoreBase || 500) * clearedWaveNumber;
      const appliedBonus = this.game.addScore(bonus);
      if (this.game.scenes.play) {
        let repairDelta = 0;
        const repairTarget = rewardConfig.waveClearRepairTargetLives || 0;
        if (repairTarget > 0 && this.game.lives < repairTarget && typeof this.game.scenes.play.applyLifeRepair === 'function') {
          repairDelta = this.game.scenes.play.applyLifeRepair(
            repairTarget,
            rewardConfig.repairInvulnerabilityMs || 0
          );
        }
        const nextLabel = hasUpcomingWave
          ? `NEXT WAVE ${clearedWaveNumber + 1}/${this.normalWavesTotal}`
          : 'BOSS GATE NEXT';
        const repairLabel = repairDelta > 0 ? ` - REPAIR +${repairDelta}` : '';
        const transitionLabel = hasUpcomingWave ? 'WAVE CLEARED!' : 'SECTOR CLEAR';
        this.game.scenes.play.showWaveBonusEffect(appliedBonus, transitionLabel, {
          compact: hasUpcomingWave,
          subtitle: `${nextLabel}${repairLabel}`,
          sfxKey: hasUpcomingWave ? 'nova_wave_clear_sweep' : 'levelComplete'
        });
      }
    }

    this.maybeSpawnHijacker({
      clearedWaveNumber,
      hasUpcomingWave
    });

    // Logic to potentially inject a short score-risk challenge wave.
    if (this.level > 1 && hasUpcomingWave && this.currentWaveIndex > 0) {
      const challengeWaveChance = BalanceConfig.difficulty.challengeWaveChance ?? 0.08;
      if (Math.random() < challengeWaveChance) {
        const wasChallenge = clearedWave && clearedWave.isChallenge;
        if (!wasChallenge) {
          console.log('[EnemyManager] injecting bonus drone challenge wave');
          this.waves.splice(this.currentWaveIndex + 1, 0, {
            type: 'bonus_challenge',
            count: BalanceConfig.difficulty.challengeWaveCount || 24,
            formation: 'GRID',
            tactic: 'rush_feint',
            isChallenge: true
          });
          this.normalWavesTotal += 1;
          this.bossWaveIndex = this.normalWavesTotal;
          hasUpcomingWave = true;
        }
      }
    }

    if (this.currentWaveIndex < this.normalWavesTotal - 1) {
      this.currentWaveIndex += 1;
      const config = this.waves[this.currentWaveIndex];
      this.beginWaveBriefing(config);
      return;
    }

    if (this.isBossLevel && !this.bossSpawnedThisLevel && !this.bossDefeatedThisLevel) {
      this.phase = 'BOSS';
      console.log(`[BossFlow] spawning boss level=${this.level} waveIndex=${this.currentWaveIndex + 1} bossWaveIndex=${this.bossWaveIndex}`);
      this.state = 'BOSS_GATE';
      this.bossGateTimer = 0;
      this.resetBossGateMessaging();
      return;
    }

    this.phase = 'COMPLETE';
    this.state = 'LEVEL_COMPLETE';
    console.log(`[BossPhase] level=${this.level} phase=${this.phase} bossDefeated=true`);
  }

  beginWaveBriefing(config) {
    this.pendingWaveConfig = config;
    this.waveBriefingTimer = 0;
    this.waveBriefingAnnounced = false;
    this.state = 'WAVE_BRIEFING';
  }

  announceWaveBriefing() {
    if (this.game.scenes.play) {
      const compactHud = this.game.getWidth() < 620;
      const descriptor = this.getWaveDescriptor(this.pendingWaveConfig);
      const waveLabel = `WAVE ${this.currentWaveIndex + 1}/${this.normalWavesTotal}`;
      this.game.scenes.play.showToast(`${waveLabel}: ${descriptor}`, {
        fontSize: compactHud ? 15 : 18,
        fill: '#7ee9ff',
        stroke: '#00111d',
        strokeThickness: 4,
        y: compactHud ? this.game.getHeight() * 0.25 : 112,
        duration: 1050,
        slot: 'top',
        type: 'level_up',
        priority: 2,
        maxWidth: this.game.getWidth() * (compactHud ? 0.82 : 0.62)
      });
      AudioManager.playSfx('ui_open', { volume: 0.25, minIntervalMs: 500 });
    }
  }

  getWaveDescriptor(config) {
    if (!config) return 'INCOMING';
    if (config.isChallenge || config.type === 'bonus_challenge') return 'BONUS DRONE RAID';
    const enemy = String(config.type || 'hostiles').replace(/_/g, ' ').toUpperCase();
    const formation = String(config.formation || 'formation').replace(/_/g, ' ').toUpperCase();
    const tactic = this.resolveWaveTactic(config);
    const elite = getEliteMiddleShipProfile(config.eliteMiddleShipId);
    const suffix = elite ? ` + ELITE ${String(elite.role || '').toUpperCase()}` : '';
    return `${tactic.label || 'TACTIC'} / ${enemy} ${formation}${suffix}`;
  }

  shouldGuaranteeHijacker(level = this.level) {
    return level >= 2 && (level - 2) % 3 === 0;
  }

  maybeSpawnHijacker({ clearedWaveNumber = this.currentWaveIndex + 1, hasUpcomingWave = true } = {}) {
    // Check conditions for hijacker spawn
    if (!isHijackerEnabled()) return;
    if (this.level < 2) return;
    if (this.hijackerSpawnedThisLevel) return;
    if (this.hijackerSpawnAttemptedThisLevel) return;
    if (this.hijacker && this.hijacker.active) return;
    if (!hasUpcomingWave) return; // Give the beam a full wave before the boss gate.
    if (clearedWaveNumber < 1) return;

    this.hijackerSpawnAttemptedThisLevel = true;
    const guaranteed = this.shouldGuaranteeHijacker(this.level);
    const chance = this.level >= 3 ? 0.45 : 0.32;
    if (guaranteed || Math.random() < chance) {
      console.log(`[HijackerSpawn] level=${this.level} wave=${clearedWaveNumber} guaranteed=${guaranteed}`);
      this.spawnHijacker();
    } else {
      console.log(`[HijackerSpawn] skipped level=${this.level} wave=${clearedWaveNumber} chance=${chance}`);
    }
  }

  spawnHijacker() {
    if (!isHijackerEnabled()) return;

    console.log('[EnemyManager] Spawning Hijacker!');
    this.hijackerSpawnedThisLevel = true;

    const centerX = this.game.getWidth() / 2;
    const spawnX = centerX + (Math.random() - 0.5) * 200; // Spawn near center with some variance
    const spawnY = Math.max(112, Math.min(this.game.getHeight() * 0.18, 132)); // Clear of HUD, still a top-lane threat.

    this.hijacker = new Hijacker(spawnX, spawnY, this.level, this.game);
    this.container.addChild(this.hijacker.sprite);

    // Play spawn audio
    AudioManager.playVoice('mission_control_hijacker', { cooldownMs: 24000, duckMs: 1500 });

    // Show toast
    if (this.game.scenes.play) {
      this.game.scenes.play.showToast('HIJACKER INCOMING!', { fontSize: 24, fill: '#ff4444' });
    }
  }

  isLevelComplete() {
    // Level is complete when all waves are done and no enemies (including hijacker)
    const noHijacker = !this.hijacker || !this.hijacker.active;
    if (this.phase !== 'COMPLETE') return false;
    const activeBlockers = this.enemies.filter(enemy => {
      if (!enemy || enemy.active === false) return false;
      if (enemy.kind === 'bonus_drone' || enemy.kind === 'boss_add') return false;
      if (enemy.kind === 'boss' && this.bossDefeatedThisLevel) return false;
      return true;
    });
    return this.state === 'LEVEL_COMPLETE' && activeBlockers.length === 0 && noHijacker;
  }

  forceClearAllEnemies() {
    // CLEANUP FIX: Use authoritative collector to clear all bonus drones.
    const playScene = this.game.scenes.play;
    let bonusDroneCount = 0;
    let enemyCount = 0;
    let hijackerCleared = false;

    if (playScene && playScene.getWaveCleanupTargets) {
      const bonusDrones = playScene.getWaveCleanupTargets();
      bonusDroneCount = bonusDrones.length;

      bonusDrones.forEach(target => {
        if (playScene.particleManager) {
          playScene.particleManager.createExplosion(target.x, target.y, 0xcccccc, 1.2);
        }
        // Mark as inactive (their managers will clean up sprites)
        target.active = false;
        if (target.destroy) target.destroy(); // CLEANUP: Force destroy

        // Remove sprite immediately
        if (target.sprite && target.sprite.parent) {
          target.sprite.parent.removeChild(target.sprite);
        }
      });
    }

    // Also clear any remaining regular enemies from this.enemies array
    // BOSS FIX: Never clear boss during cleanup
    this.enemies.forEach(e => {
      if (e.kind !== 'bonus_drone' && e.kind !== 'boss') {
        // Regular enemies get cleared too
        const wasActive = e.active !== false;
        enemyCount++;
        if (wasActive && this.game.scenes.play && this.game.scenes.play.particleManager) {
          this.game.scenes.play.particleManager.createExplosion(e.x, e.y, 0xcccccc, 1.1);
        }
        this.removeEnemySprite(e, 'force_clear');
      }
    });

    if (this.hijacker?.active) {
      hijackerCleared = true;
      if (playScene?.particleManager) {
        playScene.particleManager.createExplosion(this.hijacker.x, this.hijacker.y, 0xff44cc, 1.05);
      }
      this.hijacker.active = false;
      if (this.hijacker.destroy) this.hijacker.destroy();
      if (this.hijacker.sprite && this.hijacker.sprite.parent) {
        this.hijacker.sprite.parent.removeChild(this.hijacker.sprite);
      }
      this.hijacker = null;
    }

    // BOSS FIX: Filter out cleared enemies but keep boss
    this.enemies = this.enemies.filter(e => e.active && (e.kind === 'boss' || e.kind === 'bonus_drone'));
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE';

    // CLEANUP FIX: Diagnostic - cleanup complete
    console.log(`[EnemyManager] Wave cleanup complete: cleared ${enemyCount} enemies + ${bonusDroneCount} bonus drones + hijacker=${hijackerCleared}`);
  }

  clearEnemies() {
    this.enemies.forEach(e => {
      this.removeEnemySprite(e, 'clear_enemies');
    });
    this.enemies = [];
    if (this.boss) {
      this.removeEnemySprite(this.boss, 'clear_boss');
      this.boss = null;
    }
    // Also clear hijacker
    if (this.hijacker) {
      this.removeEnemySprite(this.hijacker, 'clear_hijacker');
      this.hijacker = null;
    }
  }
  updateAdaptation(metrics) {
    if (!metrics) return;
    this.adaptation.diagonalShotBias = Math.abs(metrics.avgX) * 0.5;
    this.adaptation.spawnYBias = metrics.bottomRatio > 0.5 ? -100 : 0;
  }

  forceBossStart(level) {
    this.clearEnemies();
    this.currentWaveIndex = this.normalWavesTotal;
    this.phase = 'BOSS';
    this.state = 'BOSS_GATE';
    this.waveEnding = false;
    this.cleanupPhase = 'NONE';
    this.cleanupTimer = 0;
    this.bossGateTimer = 0;
    this.resetBossGateMessaging();
    this.bossSpawnedThisLevel = false;
    this.bossDefeatedThisLevel = false;
    console.log(`[BossPhase] level=${level} phase=${this.phase} forced boss start`);
  }

  ensureBossActive() {
    if (!this.boss || !this.boss.active) return;
    const bossInEnemies = this.enemies.includes(this.boss);
    if (!bossInEnemies) {
      this.enemies.push(this.boss);
      console.warn(`[BossGuard] boss reattached to enemies level=${this.level}`);
    }
    if (this.boss.sprite && !this.boss.sprite.parent) {
      this.container.addChild(this.boss.sprite);
      console.warn(`[BossGuard] boss sprite reattached level=${this.level}`);
    }
    this.boss.sprite.visible = true;
    this.boss.sprite.renderable = true;
  }

  getBossStatus() {
    const bossEntityExists = !!this.boss;
    const bossActive = !!(this.boss && this.boss.active);
    const bossDefeated = bossEntityExists && !this.boss.active;
    const bossInEnemies = bossEntityExists && this.enemies.includes(this.boss);
    const bossContainerChildrenCount = this.boss?.sprite?.children?.length ?? 0;
    return {
      bossEntityExists,
      bossActive,
      bossDefeated,
      bossInEnemies,
      bossContainerChildrenCount
    };
  }

  logBossStatus(tag) {
    const status = this.getBossStatus();
    const bossWaveIndex = this.bossWaveIndex ?? -1;
    console.log(
      `[BossStatus] tag=${tag} level=${this.level} state=${this.state} waveIndex=${this.currentWaveIndex}` +
      ` wavesTotal=${this.normalWavesTotal} bossWaveIndex=${bossWaveIndex} hasBoss=${this.isBossLevel}` +
      ` bossSpawned=${this.bossSpawnedThisLevel} bossActive=${status.bossActive} bossDefeated=${status.bossDefeated}` +
      ` bossEntityExists=${status.bossEntityExists} bossInEnemies=${status.bossInEnemies}` +
      ` bossContainerChildrenCount=${status.bossContainerChildrenCount}`
    );
  }

  getDifficultyScalars(level) {
    const diff = BalanceConfig.difficulty;
    const levelScale = Math.max(0, level - 1);
    return {
      hpScale: Math.min(
        diff.enemyHealthMaxMultiplier ?? Number.POSITIVE_INFINITY,
        diff.baseEnemyHealthMultiplier + levelScale * diff.hpScalePerLevel
      ),
      speedScale: Math.min(
        diff.enemySpeedMaxMultiplier ?? Number.POSITIVE_INFINITY,
        diff.enemySpeedMultiplier + levelScale * diff.enemySpeedPerLevel
      ),
      fireDelayScale: Math.max(
        diff.enemyFireDelayMinMultiplier ?? 0.85,
        (diff.enemyFireDelayMultiplier ?? 1) + levelScale * diff.enemyFireDelayPerLevel
      )
    };
  }

  logLevelDifficulty(level, waveCount) {
    const diff = BalanceConfig.difficulty;
    const scalars = this.getDifficultyScalars(level);
    const bossHp = Math.max(
      diff.bossMinHealth || 0,
      Math.round(diff.bossBaseHealth + Math.max(0, level - 1) * diff.bossHealthPerLevel)
    );
    const fireChance = Math.min(
      diff.enemyFireChanceMax ?? Number.POSITIVE_INFINITY,
      diff.enemyFireChance + Math.max(0, level - 1) * (diff.enemyFireChancePerLevel ?? 0)
    );
    console.log(
      `[Difficulty] level=${level} waves=${waveCount} waveDelayMs=${diff.waveDelayMs}` +
      ` wavesPerBossBase=${diff.wavesPerBossBase} wavesPerBossMax=${diff.wavesPerBossMax}` +
      ` countBase=${diff.waveEnemyBase} countScale=${diff.waveEnemyPerLevel} countMax=${diff.waveEnemyMax}` +
      ` hpScale=${scalars.hpScale.toFixed(2)} speedScale=${scalars.speedScale.toFixed(2)} fireDelayScale=${scalars.fireDelayScale.toFixed(2)}` +
      ` fireChance=${fireChance.toFixed(4)} projSpeed=${diff.enemyProjectileSpeed}` +
      ` bossHp=${bossHp} bossDelay=${diff.bossShootDelayBase}`
    );
  }

  logWaveDifficulty(config) {
    const scalars = this.getDifficultyScalars(this.level);
    const waveIndex = this.currentWaveIndex + 1;
    const waveTotal = this.normalWavesTotal;
    console.log(
      `[DifficultyWave] level=${this.level} wave=${waveIndex}/${waveTotal} type=${config.type}` +
      ` count=${config.count} formation=${config.formation}` +
      ` hpScale=${scalars.hpScale.toFixed(2)} speedScale=${scalars.speedScale.toFixed(2)} fireDelayScale=${scalars.fireDelayScale.toFixed(2)}`
    );
  }
}
