import * as PIXI from 'pixi.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Hijacker } from '../entities/Hijacker.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BalanceConfig, getNormalWaveDangerMoment, getNormalWaveDifficultyLevel, getNormalWavePressureTuning } from '../config/BalanceConfig.js';
import { getMicroMessage } from '../text/phrasePool.js';
import { AudioManager } from '../audio/AudioManager.js';
import { isHijackerEnabled } from '../config/isExtrasEnabled.js';
import { translateText } from '../i18n/index.js';
import { canRunModeUseMayhemReinforcements } from '../game/RunMode.js';
import {
  isDailySignalReinforcementSector,
  isDailySignalSuperStormSector
} from '../config/DailyCabinetSignal.js';
import {
  GENERATED_ENEMY_TYPES,
  getGeneratedEnemyProfile,
  getGeneratedEnemyTypeAtLevelProgress,
  getGeneratedEnemyTypeForSpriteIndex,
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
import { getDangerMidShipProfile, pickDangerMidShipProfile } from '../config/DangerMidShips.js';
import { WAVE_TACTIC_VARIANTS } from '../config/WaveTacticVariants.js';
import { getBossSupportShipEventSeed, pickBossSupportShipProfile } from '../config/BossSupportShips.js';
import {
  getRareChaosVisitorVariant,
  planRareChaosVisitorSpawn
} from '../config/RareChaosVisitors.js';
import {
  CHALLENGE_FLIGHT_TARGET_WINDOW_MS,
  getChallengeFlightPattern,
  gradeChallengeFlight
} from '../config/ChallengeFlights.js';

// TASK D: Boss system - always enabled, no gate
// Bosses are now core gameplay, spawn at end of every level
const WAVE_OBJECTIVE_FAILSAFE_MS = 45000;
const WAVE_STRAGGLER_PRESSURE_MS = 26000;
const WAVE_STRAGGLER_PRESSURE_REPEAT_MS = 6500;
const WAVE_STRAGGLER_RETREAT_MS = 38000;
const BOSS_FUEL_TETHER_COLOR = 0x7dffcc;
const BOSS_FUEL_TETHER_ACCENT = 0xffec8a;
const BOSS_FUEL_SINGLE_SUPPORT_HEAL_MULT = 1.25;
const BOSS_FUEL_ARMOR_BLEED_DELAY_MS = 3200;
const BOSS_FUEL_DEFAULT_DELAY_MS = 5200;
const BOSS_FUEL_ARMOR_BLEED_SPEED_BONUS = 0.22;
const BOSS_FUEL_MAX_ACTIVE_SUPPORT_SHIPS = 8;
const BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE = 8;
const BOSS_FUEL_EIGHT_SHIP_SWARM_CHANCE = 0.05;
const BOSS_FUEL_EIGHT_SHIP_SWARM_MIN_LEVEL = 3;
const BOSS_FUEL_ORDINARY_EVENT_BUDGET = 6;
const BOSS_FUEL_DOUBLE_SUPPORT_ROLL = 0.30;
const BOSS_FUEL_TRIPLE_SUPPORT_ROLL = 0.12;
const BOSS_FUEL_FOUR_SUPPORT_ROLL = 0.03;
const BOSS_FUEL_FIVE_SUPPORT_ROLL = 0.01;
const BOSS_FUEL_SIX_SUPPORT_ROLL = 0.003;
export const MAYHEM_REINFORCEMENT_WAVE_SOUND_ID = 'mission_control_reinforcements_incoming';
export const MAYHEM_SUPER_STORM_WARNING_SOUND_ID = 'boss_mayhem_super_storm_warning';
export const MAYHEM_SUPER_STORM_SURVIVED_SOUND_ID = 'boss_mayhem_super_storm_survived';
export const MAYHEM_REINFORCEMENT_WARNING_TEXT = 'INCOMING REINFORCEMENTS';
const MAYHEM_REINFORCEMENT_HARD_REASONS = new Set([
  'disabled',
  'not_mayhem',
  'not_normal_wave_phase',
  'boss_active_or_pending',
  'wave_not_stable',
  'sector_stinger_active',
  'player_respawn_or_invulnerable',
  'already_scheduled',
  'already_triggered_for_wave',
  'no_next_wave',
  'too_early_in_sector',
  'next_wave_not_normal',
  'multi_wave_gated',
  'not_enough_future_waves'
]);
const MAYHEM_REINFORCEMENT_SOFT_REASONS = new Set([
  'wave_too_young',
  'not_enough_wave_progress',
  'too_many_enemies',
  'too_many_bullets'
]);

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
    this.spawning = false;
    this.waveSpawnPendingCount = 0;
    this.waveSpawnSerial = 0;
    this.waveSpawnTimers = [];
    this.currentNormalWaveDifficultyLevel = 1;
    this.marketingDebugMode = false;
    this.marketingDebugBossSpawnCount = 0;

    // Debug Stats
    this.totalEnemiesSpawned = 0;
    this.wavesCompleted = 0;
    this.rareChaosVisitorStats = { eligibleWaves: 0, spawned: 0, defeated: 0, lastPlan: null, lastSpawn: null };
    this.rareChaosVisitorSpawnedWaveKeys = new Set();
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
    this.waveStragglerPressureLastAt = 0;
    this.waveStragglerPressureCount = 0;
    this.waveStragglerRetreatTriggered = false;

    // WAVE FIX: Wave ending state to prevent bonus drone spawning
    this.waveEnding = false;
    this.currentWaveThreatState = null;
    this.challengeFlightState = null;
    this.lastChallengeFlightResult = null;
    this.mayhemReinforcementState = null;
    this.mayhemReinforcementTriggeredWaves = new Set();
    this.mayhemReinforcementConsumedWaveIndices = new Set();
    this.mayhemSuperStormSurvivalWaveCounts = new Map();
    this.mayhemReinforcementRunMissedWaveKeys = new Set();
    this.mayhemReinforcementEligibleMisses = 0;
    this.mayhemReinforcementRunSpawned = 0;
    this.mayhemSuperStormRunMissedWaveKeys = new Set();
    this.mayhemSuperStormEligibleMisses = 0;
    this.mayhemSuperStormRunSpawned = 0;
    this.dailySignalForcedReinforcementSectors = new Set();
    this.dailySignalForcedSuperStormSectors = new Set();
    this.bossReinforcementState = null;
    this.bossReinforcementAttemptIndex = 0;
    this.bossReinforcementEventsThisBoss = 0;
    this.bossReinforcementNextCheckAtMs = 0;
    this.bossReinforcementCooldownUntilMs = 0;
    this.mayhemReinforcementStats = {
      scheduled: 0,
      spawned: 0,
      warnings: 0,
      superStorms: 0,
      lastWarningLeadMs: null,
      lastRoll: null,
      lastEligibility: null,
      lastSuperStormRoll: null
    };

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
    this.bossFuelShipCooldownUntilMs = 0;
    this.bossFuelShipNextCheckAtMs = 0;
    this.bossFuelShipsSpawnedThisBoss = 0;
    this.bossFuelEightShipSwarmPlanned = false;
    this.bossFuelEightShipSwarmTriggered = false;
    this.bossReinforcementState = null;
    this.bossReinforcementAttemptIndex = 0;
    this.bossReinforcementEventsThisBoss = 0;
    this.bossReinforcementNextCheckAtMs = 0;
    this.bossReinforcementCooldownUntilMs = 0;
    this.directorState = { tier: 0, spawnCadenceScale: 1, eliteChance: 0.02, clutchDropChance: 0.04 };
    this.lastAlienAttackBarkAt = 0;
    this.alienAttackBarkWindowCount = 0;
    this.alienAttackBarkWindowStartedAt = 0;

    // TASK 1: Voice history to prevent duplicates
    this.voiceHistory = {};
  }

  startLevel(level) {
    console.log(`[EnemyManager] STARTING LEVEL ${level}`);
    this.markPerformance('level_start.begin', { level });
    this.marketingDebugMode = false;
    this.marketingDebugBossSpawnCount = 0;
    this.level = level;
    this.clearPendingWaveSpawns();
    this.measurePerformance('level_start.array_cleanup_compaction', () => this.clearEnemies());

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
    this.challengeFlightState = null;

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
    if (level <= 1) {
      this.resetMayhemReinforcementRunState();
      this.rareChaosVisitorStats = { eligibleWaves: 0, spawned: 0, defeated: 0, lastPlan: null, lastSpawn: null };
      this.rareChaosVisitorSpawnedWaveKeys = new Set();
    }
    this.resetMayhemReinforcementState();

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
    this.bossFuelShipCooldownUntilMs = 0;
    this.bossFuelShipNextCheckAtMs = 0;
    this.bossFuelShipsSpawnedThisBoss = 0;
    this.bossFuelEightShipSwarmPlanned = false;
    this.bossFuelEightShipSwarmTriggered = false;

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
    const normalWaves = this.measurePerformance('level_start.enemy_generation', () => this.generateWaves(level));
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
      this.measurePerformance('level_start.initial_wave_spawn', () => this.spawnWave(config));
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

  beginLevelEntryHold(level) {
    const targetLevel = Math.max(1, Math.floor(Number(level) || 1));
    console.log(`[EnemyManager] HOLDING LEVEL ${targetLevel} ENTRY`);
    this.marketingDebugMode = false;
    this.marketingDebugBossSpawnCount = 0;
    this.level = targetLevel;
    this.clearPendingWaveSpawns();
    this.clearEnemies();

    this.currentWaveIndex = 0;
    this.state = 'LEVEL_ENTRY_HOLD';
    this.waveTimer = 0;
    this.waves = [];
    this.normalWavesTotal = 0;
    this.bossWaveIndex = 0;
    this.levelStartTime = 0;
    this.phase = 'ENTRY_HOLD';
    this.pendingWaveConfig = null;
    this.waveBriefingTimer = 0;
    this.waveBriefingAnnounced = false;
    this.currentWaveTactic = null;
    this.challengeFlightState = null;
    this.currentModifier = null;
    this.isBossLevel = false;

    this.hijacker = null;
    this.hijackerSpawnedThisLevel = false;
    this.hijackerSpawnAttemptedThisLevel = false;
    this.eliteMiddleShipPlan = [];
    this.eliteMiddleShipsSpawnedThisLevel = 0;

    this.waveEnding = false;
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE';
    this.resetWaveWatchdog();

    this.boss = null;
    this.bossGateTimer = 0;
    this.bossSpawning = false;
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
    this.bossFuelShipCooldownUntilMs = 0;
    this.bossFuelShipNextCheckAtMs = 0;
    this.bossFuelShipsSpawnedThisBoss = 0;
    this.bossFuelEightShipSwarmPlanned = false;
    this.bossFuelEightShipSwarmTriggered = false;
    this.bossReinforcementState = null;
    this.bossReinforcementAttemptIndex = 0;
    this.bossReinforcementEventsThisBoss = 0;
    this.bossReinforcementNextCheckAtMs = 0;
    this.bossReinforcementCooldownUntilMs = 0;
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

  measurePerformance(label, callback) {
    const diagnostics = this.game?.scenes?.play?.performanceDiagnostics;
    return diagnostics?.measure ? diagnostics.measure(label, callback) : callback();
  }

  markPerformance(label, details = {}) {
    this.game?.scenes?.play?.performanceDiagnostics?.mark?.(label, details);
  }

  getNormalWaveDifficultyLevel(level = this.level) {
    return this.game?.runPressureDirector?.getNormalWaveDifficultyLevel?.(level) ?? getNormalWaveDifficultyLevel(level);
  }

  generateWaves(level) {
    const sourceLevel = Math.max(1, Number(level) || 1);
    const normalWaveLevel = this.getNormalWaveDifficultyLevel(sourceLevel);
    const curatedWaves = this.getCuratedWaves(normalWaveLevel);
    if (curatedWaves) {
      const shapedCurated = curatedWaves.map((wave, waveIndex) =>
        this.game?.contentDirector?.shapeWaveConfig?.(wave, { level: normalWaveLevel, sourceLevel, waveIndex }) || wave
      );
      const threatShapedCurated = shapedCurated.map((wave, waveIndex) => {
        const dangerMoment = this.applyNormalWaveDangerMoment(wave, normalWaveLevel, waveIndex, shapedCurated.length);
        return this.applyDangerMidShipPlan(dangerMoment, normalWaveLevel, waveIndex, shapedCurated.length);
      });
      return this.applyEliteMiddleShipPlan(threatShapedCurated, normalWaveLevel)
        .map((wave) => ({ ...wave, sourceLevel, normalWaveDifficultyLevel: normalWaveLevel }));
    }

    const numWaves = this.getNormalWaveCount(normalWaveLevel);
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
      const progress = Math.min(0.98, (i + 1) / Math.max(1, numWaves) * 0.72 + (normalWaveLevel / 40) * 0.24);
      const pattern = patterns[Math.abs((normalWaveLevel * 5 + i * 7 + Math.floor(Math.random() * 3)) % patterns.length)];

      // 60% chance for a pure generated squadron for visual cohesion.
      const useFighterSquadron = Math.random() < 0.6;
      let selectedType;

      if (useFighterSquadron) {
        selectedType = pickGeneratedEnemyTypeForLevel(normalWaveLevel);
      } else {
        // Normal progression through enemy types
        selectedType = getGeneratedEnemyTypeAtLevelProgress(normalWaveLevel, progress);
      }

      const wave = {
        type: selectedType,
        count: this.getWaveEnemyCount(normalWaveLevel, i),
        formation: pattern,
        tactic: this.pickWaveTactic(normalWaveLevel, i, pattern),
        entry: i % 3 === 0 ? 'split' : i % 3 === 1 ? 'alternating' : 'single',
        cadence: 0.9 + Math.min(0.45, normalWaveLevel * 0.022 + i * 0.035),
        sourceLevel,
        normalWaveDifficultyLevel: normalWaveLevel
      };
      const shaped = this.game?.contentDirector?.shapeWaveConfig?.(wave, { level: normalWaveLevel, sourceLevel, waveIndex: i }) || wave;
      const dangerMoment = this.applyNormalWaveDangerMoment(shaped, normalWaveLevel, i, numWaves);
      waves.push(this.applyDangerMidShipPlan(dangerMoment, normalWaveLevel, i, numWaves));
    }
    return this.applyEliteMiddleShipPlan(waves, normalWaveLevel)
      .map((wave) => ({ ...wave, sourceLevel, normalWaveDifficultyLevel: normalWaveLevel }));
  }

  applyDangerMidShipPlan(wave, level, waveIndex, waveCount) {
    const safeLevel = Math.max(1, Number(level) || 1);
    if (safeLevel < 8 || wave?.type === 'BOSS') return wave;
    const count = Math.max(0, Number(wave?.count) || 0);
    if (count < 4) return wave;
    const progress = waveCount > 1 ? waveIndex / Math.max(1, waveCount - 1) : 0;
    const chance = Math.min(0.78, 0.18 + Math.max(0, safeLevel - 8) * 0.026 + progress * 0.12);
    if (Math.random() > chance) return wave;

    const maxDangerSlots = safeLevel < 14 ? 1 : safeLevel < 26 ? 2 : 3;
    const desired = Math.min(maxDangerSlots, Math.max(1, Math.floor(count / 5)));
    const startSlot = Math.abs((safeLevel * 7 + waveIndex * 5) % count);
    const dangerMidShipIds = Array.from({ length: desired }, (_, index) => {
      const profile = pickDangerMidShipProfile(safeLevel, waveIndex * 11 + index * 17);
      return {
        slot: (startSlot + index * Math.max(2, Math.floor(count / Math.max(1, desired)))) % count,
        id: profile.id
      };
    });
    return {
      ...wave,
      dangerMidShipIds
    };
  }

  applyNormalWaveDangerMoment(wave, level, waveIndex, waveCount) {
    const moment = this.game?.runPressureDirector?.getNormalWaveDangerMoment?.(level, waveIndex, waveCount) ??
      getNormalWaveDangerMoment(level, waveIndex, waveCount);
    if (!moment) return wave;

    const tacticId = this.getAllowedThreatMomentTacticId(moment, level, waveIndex);
    const tactic = TACTIC_BY_ID[tacticId] || TACTIC_BY_ID[this.pickWaveTactic(level, waveIndex, moment.formation)] || WAVE_TACTICS[0];
    const diff = BalanceConfig.difficulty;
    const pressureTuning = getNormalWavePressureTuning(level);
    const max = (diff.waveEnemyMax ?? 14) +
      (Number(pressureTuning.waveEnemyMaxBonus) || 0) +
      Math.max(0, Number(moment.countBonus) || 0);
    const baseCount = Math.max(4, Number(wave.count) || this.getWaveEnemyCount(level, waveIndex));
    const count = Math.max(baseCount, Math.min(max, baseCount + Math.max(0, Number(moment.countBonus) || 0)));

    return {
      ...wave,
      count,
      formation: moment.formation,
      tactic: {
        ...tactic,
        fireScalar: (tactic.fireScalar || 1) * (moment.fireMult || 1),
        fireDelayMult: (tactic.fireDelayMult || 1) * (moment.fireDelayMult || 1),
        projectileSpeedScalar: (tactic.projectileSpeedScalar || 1) * (moment.projectileSpeedMult || 1),
        threatProjectileSpeedScalar: (tactic.threatProjectileSpeedScalar || 1) * (moment.threatProjectileSpeedMult || moment.projectileSpeedMult || 1),
        diveBias: (tactic.diveBias || 1) * (moment.diveBiasMult || 1),
        entrySpeed: (tactic.entrySpeed || 1) * (moment.entrySpeedMult || 1),
        earlyThreatMoment: moment.id
      },
      entry: moment.entry || wave.entry,
      cadence: (wave.cadence || 1) * (moment.cadenceMult || 1),
      earlyThreatMoment: moment.id,
      eliteMiddleShipId: moment.eliteMiddleShipId || wave.eliteMiddleShipId || null,
      eliteHealthScalar: moment.eliteHealthScalar || wave.eliteHealthScalar || null,
      eliteFireDelayMult: moment.eliteFireDelayMult || wave.eliteFireDelayMult || null,
      eliteSpecialDelayMs: moment.eliteSpecialDelayMs || wave.eliteSpecialDelayMs || null,
      threatStartDelayMult: moment.threatInitialDelayMult || 1,
      threatStartDelayMs: moment.threatInitialDelayMs || 0,
      forcedThreatActionIds: Array.isArray(moment.forcedThreatActionIds) ? moment.forcedThreatActionIds : [],
      threatBudgetModifiers: {
        dangerBudgetBonus: moment.threatDangerBudgetBonus || 0,
        maxActiveBonus: moment.threatMaxActiveBonus || 0,
        plannedActionBonus: moment.threatPlannedActionBonus || 0
      }
    };
  }

  getAllowedThreatMomentTacticId(moment, level, waveIndex) {
    const requested = TACTIC_BY_ID[moment?.tactic];
    const safeLevel = Math.max(1, Number(level) || 1);
    if (requested && (Number(requested.minLevel) || 1) <= safeLevel) {
      return moment.tactic;
    }
    return this.pickWaveTactic(safeLevel, waveIndex, moment?.formation || 'ARC');
  }

  applyEliteMiddleShipPlan(waves, level) {
    const plannedWaves = waves.map((wave) => ({ ...wave }));
    const reservedWaveIndices = new Set();
    plannedWaves.forEach((wave, index) => {
      if (wave.eliteMiddleShipId) reservedWaveIndices.add(index);
    });
    const plan = planEliteMiddleShipSpawns(level, plannedWaves.length);
    this.eliteMiddleShipPlan = plan;
    plan.forEach(({ waveIndex, eliteMiddleShipId }) => {
      if (!plannedWaves[waveIndex]) return;
      if (plannedWaves[waveIndex].eliteMiddleShipId) return;
      plannedWaves[waveIndex] = {
        ...plannedWaves[waveIndex],
        eliteMiddleShipId
      };
    });
    if (plan.length) {
      console.log(`[EliteMiddleShipPlan] level=${level} waves=${plannedWaves.length} plan=${plan.map(item => `${item.waveIndex + 1}:${item.eliteMiddleShipId}`).join(',')}`);
    }
    const reserved = new Set([...reservedWaveIndices, ...plan.map((item) => item.waveIndex)]);
    this.applyMultiEliteWaveVariant(plannedWaves, level, reserved);
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

    const pressureTuning = getNormalWavePressureTuning(safeLevel);
    const baseChance = safeLevel <= 4 ? 0.045 : safeLevel < 10 ? 0.11 : 0.15;
    const chance = Math.min(0.34, baseChance * (pressureTuning.multiEliteChanceMult || 1));
    if (Math.random() > chance) return;

    const triChance = safeLevel >= 50
      ? (pressureTuning.multiEliteTriChance || 0)
      : (safeLevel >= 10 ? 0.14 : 0);
    const eliteCount = triChance > 0 && Math.random() < triChance ? 3 : 2;
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
    const pressureTuning = getNormalWavePressureTuning(level);
    const waveBonus = Math.max(0, Number(pressureTuning.waveCountBonus) || 0);
    const planned = Math.round(base + Math.max(0, level - 1) * perLevel) + waveBonus;
    return Math.max(min, Math.min(max + waveBonus, planned));
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
    const pressureTuning = getNormalWavePressureTuning(level);
    const count = Math.round(
      (diff.waveEnemyBase ?? 7) +
      levelScale * (diff.waveEnemyPerLevel ?? 0.35) +
      waveScale * (diff.waveEnemyPerWave ?? 0.45) +
      variance +
      (Number(pressureTuning.waveEnemyCountBonus) || 0)
    );
    const max = (diff.waveEnemyMax ?? 14) + (Number(pressureTuning.waveEnemyMaxBonus) || 0);
    return Math.max(4, Math.min(max, count));
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
    const level = Math.max(1, Number(config?.normalWaveDifficultyLevel) || this.getNormalWaveDifficultyLevel(this.level));
    const fallbackId = this.pickWaveTactic(level, this.currentWaveIndex || 0, config?.formation || 'ARC');
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
    if (!enemy || enemy.destroyed) return false;
    if (enemy.active === false && !enemy.waitingForEntry) return false;
    // bonus drones and bosses are not objective enemies
    return enemy.kind !== 'bonus_drone' && enemy.kind !== 'boss';
  }

  resetWaveWatchdog() {
    this.waveActiveTimer = 0;
    this.waveObjectiveFailsafeTriggered = false;
    this.waveStragglerPressureLastAt = 0;
    this.waveStragglerPressureCount = 0;
    this.waveStragglerRetreatTriggered = false;
  }

  maybePressureStalledWave(objectiveCount = this.getObjectiveEnemyCount()) {
    if (objectiveCount <= 0 || this.waveEnding || this.waveObjectiveFailsafeTriggered) return false;
    const failsafeMs = BalanceConfig.difficulty.waveObjectiveFailsafeMs || WAVE_OBJECTIVE_FAILSAFE_MS;
    const pressureStartMs = Math.min(
      WAVE_STRAGGLER_PRESSURE_MS,
      Math.max(12000, failsafeMs - 14000)
    );
    if (this.waveActiveTimer < pressureStartMs) return false;
    if (this.waveActiveTimer - (Number(this.waveStragglerPressureLastAt) || 0) < WAVE_STRAGGLER_PRESSURE_REPEAT_MS) return false;

    const playScene = this.game?.scenes?.play;
    const player = playScene?.player || null;
    const width = this.game?.getWidth?.() || 1280;
    const height = this.game?.getHeight?.() || 720;
    const playerX = Number.isFinite(player?.x) ? player.x : width / 2;
    const playerY = Number.isFinite(player?.y) ? player.y : height * 0.72;
    const objectiveEnemies = this.enemies
      .filter(enemy => this.isObjectiveEnemy(enemy))
      .filter(enemy => enemy?.kind !== 'boss_fuel_ship' && enemy?.kind !== 'boss_chaos_support');
    let pressured = 0;
    for (const enemy of objectiveEnemies.slice(0, 8)) {
      if (!enemy || enemy.destroyed || enemy.active === false || enemy.waitingForEntry) continue;
      if (enemy.state === 'RETURN') {
        enemy.state = 'FORMATION';
        enemy.sprite && (enemy.sprite.tint = enemy.color || 0xffffff);
      }
      if (enemy.state === 'FORMATION' && typeof enemy.startDive === 'function') {
        const diveStyle = enemy.tacticalMoveStyle === 'split_sweep' || enemy.tacticalMoveStyle === 'sweep'
          ? 'sweep'
          : enemy.tacticalMoveStyle === 'feint'
            ? 'feint'
            : 'chain';
        enemy.startDive(playerX, playerY, diveStyle);
        pressured += 1;
        continue;
      }
      if (enemy.state === 'ENTRY' && Number.isFinite(enemy.y)) {
        enemy.y = Math.min(enemy.y + 24, height * 0.34);
        pressured += 1;
      }
    }
    if (pressured <= 0) return false;
    this.waveStragglerPressureLastAt = this.waveActiveTimer;
    this.waveStragglerPressureCount = (Number(this.waveStragglerPressureCount) || 0) + 1;
    return true;
  }

  maybeRetreatStalledWave(objectiveCount = this.getObjectiveEnemyCount()) {
    if (objectiveCount <= 0 || this.waveEnding || this.waveObjectiveFailsafeTriggered || this.waveStragglerRetreatTriggered) return false;
    const retreatableRealEnemy = this.enemies.some(enemy =>
      this.isObjectiveEnemy(enemy) && typeof enemy?.startDive === 'function'
    );
    if ((Number(this.waveStragglerPressureCount) || 0) <= 0 && !retreatableRealEnemy) return false;
    const failsafeMs = BalanceConfig.difficulty.waveObjectiveFailsafeMs || WAVE_OBJECTIVE_FAILSAFE_MS;
    const retreatMs = Math.min(WAVE_STRAGGLER_RETREAT_MS, Math.max(16000, failsafeMs - 7000));
    if (this.waveActiveTimer < retreatMs) return false;

    this.waveStragglerRetreatTriggered = true;
    this.forceClearAllEnemies();
    this.waveEnding = true;
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE';
    this.game?.scenes?.play?.clearEnemyBullets?.('wave_straggler_retreat');
    return true;
  }

  resetMayhemReinforcementState() {
    this.mayhemReinforcementState = null;
    this.mayhemReinforcementTriggeredWaves = new Set();
    this.mayhemReinforcementConsumedWaveIndices = new Set();
    this.mayhemSuperStormSurvivalWaveCounts = new Map();
    this.mayhemReinforcementStats = {
      scheduled: 0,
      spawned: 0,
      warnings: 0,
      superStorms: 0,
      lastWarningLeadMs: null,
      lastRoll: null,
      lastEligibility: null,
      lastPityForced: false,
      lastSuperStormRoll: null
    };
  }

  resetMayhemReinforcementRunState() {
    this.mayhemReinforcementRunMissedWaveKeys = new Set();
    this.mayhemReinforcementEligibleMisses = 0;
    this.mayhemReinforcementRunSpawned = 0;
    this.mayhemSuperStormRunMissedWaveKeys = new Set();
    this.mayhemSuperStormEligibleMisses = 0;
    this.mayhemSuperStormRunSpawned = 0;
    this.dailySignalForcedReinforcementSectors = new Set();
    this.dailySignalForcedSuperStormSectors = new Set();
  }

  getMayhemReinforcementConfig() {
    const config = BalanceConfig.difficulty?.mayhemReinforcements || {};
    if (config.enabled !== true) return null;
    return {
      chance: Math.max(0, Math.min(1, Number(config.chance) || 0)),
      bossFightChance: Math.max(0, Math.min(1, Number(config.bossFightChance ?? config.chance) || 0)),
      bossFightMinAgeMs: Math.max(0, Number(config.bossFightMinAgeMs) || 8000),
      bossFightCheckIntervalMs: Math.max(1000, Number(config.bossFightCheckIntervalMs) || 3600),
      bossFightCooldownMs: Math.max(3000, Number(config.bossFightCooldownMs) || 14500),
      bossFightMaxEvents: Math.max(0, Math.floor(Number(config.bossFightMaxEvents) || 0)),
      minWaveAgeMs: Math.max(0, Number(config.minWaveAgeMs) || 0),
      minClearRatio: Math.max(0, Math.min(1, Number(config.minClearRatio) || 0.75)),
      maxActiveEnemies: Math.max(0, Math.floor(Number(config.maxActiveEnemies) || 0)),
      maxActiveEnemyBullets: Math.max(0, Math.floor(Number(config.maxActiveEnemyBullets) || 0)),
      warningMs: Math.max(0, Number(config.warningMs) || 2000),
      minNextWaveIndex: Math.max(0, Math.floor(Number(config.minNextWaveIndex) || 0)),
      firstPityEligibleMisses: Math.max(1, Math.floor(Number(config.firstPityEligibleMisses) || 14)),
      firstPityMinLevel: Math.max(1, Math.floor(Number(config.firstPityMinLevel) || 6)),
      firstPityMaxLevel: Math.max(1, Math.floor(Number(config.firstPityMaxLevel) || 9)),
      repeatPityEligibleMisses: Math.max(1, Math.floor(Number(config.repeatPityEligibleMisses) || 24)),
      doubleWaveChance: Math.max(0, Math.min(1, Number(config.doubleWaveChance) || 0)),
      tripleWaveChance: Math.max(0, Math.min(1, Number(config.tripleWaveChance) || 0)),
      doubleWaveMinLevel: Math.max(1, Math.floor(Number(config.doubleWaveMinLevel) || 8)),
      doubleWaveRequiresPriorReinforcement: config.doubleWaveRequiresPriorReinforcement !== false,
      normalMinWaveCount: Math.max(1, Math.min(3, Math.floor(Number(config.normalMinWaveCount) || 1))),
      normalMaxWaveCount: Math.max(1, Math.min(3, Math.floor(Number(config.normalMaxWaveCount) || Number(config.normalMinWaveCount) || 1))),
      normalMaxWaveChance: Math.max(0, Math.min(1, Number(config.normalMaxWaveChance) || 0)),
      normalMultiWaveMinLevel: Math.max(1, Math.floor(Number(config.normalMultiWaveMinLevel) || 1)),
      superStormChance: Math.max(0, Math.min(1, Number(config.superStormChance) || 0)),
      superStormWaveCount: Math.max(1, Math.min(3, Math.floor(Number(config.superStormWaveCount) || 3))),
      superStormMinLevel: Math.max(1, Math.floor(Number(config.superStormMinLevel) || 8)),
      superStormFirstPityMinLevel: Math.max(1, Math.floor(Number(config.superStormFirstPityMinLevel) || 12)),
      superStormFirstPityMaxLevel: Math.max(1, Math.floor(Number(config.superStormFirstPityMaxLevel) || 18)),
      superStormFirstPityEligibleMisses: Math.max(1, Math.floor(Number(config.superStormFirstPityEligibleMisses) || 16)),
      superStormWarningMs: Math.max(2000, Math.min(3000, Number(config.superStormWarningMs) || 2600)),
      superStormEntryDelayMs: Math.max(0, Math.min(600, Number(config.superStormEntryDelayMs) || 220)),
      superStormLaneOffsetPx: Math.max(0, Math.min(96, Number(config.superStormLaneOffsetPx) || 58)),
      reinforcementScoreMultiplier: Math.max(1, Number(config.reinforcementScoreMultiplier) || 1),
      bossReinforcementScoreMultiplier: Math.max(1, Number(config.bossReinforcementScoreMultiplier ?? config.reinforcementScoreMultiplier) || 1),
      pityMinWaveAgeMs: Math.max(0, Number(config.pityMinWaveAgeMs) || 3200),
      pityMinClearRatio: Math.max(0, Math.min(1, Number(config.pityMinClearRatio) || 0.25)),
      pityMaxActiveEnemies: Math.max(0, Math.floor(Number(config.pityMaxActiveEnemies) || 12)),
      pityMaxActiveEnemyBullets: Math.max(0, Math.floor(Number(config.pityMaxActiveEnemyBullets) || 30))
    };
  }

  getStableReinforcementRoll(level = this.level, waveIndex = this.currentWaveIndex, salt = 'mayhem-reinforcement') {
    const seed = String(this.game?.contentDirector?.seed || this.game?.gameId || 'nova-swarm');
    const input = `${seed}:${salt}:${Math.max(1, Math.floor(Number(level) || 1))}:${Math.max(0, Math.floor(Number(waveIndex) || 0))}`;
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) % 1000000) / 1000000;
  }

  getMayhemReinforcementWaveKey(level = this.level, waveIndex = this.currentWaveIndex) {
    return `${Math.max(1, Math.floor(Number(level) || 1))}:${Math.max(0, Math.floor(Number(waveIndex) || 0))}`;
  }

  shouldForceMayhemReinforcementByPity(config = this.getMayhemReinforcementConfig()) {
    if (!config) return false;
    const misses = Math.max(0, Math.floor(Number(this.mayhemReinforcementEligibleMisses) || 0));
    const spawned = Math.max(0, Math.floor(Number(this.mayhemReinforcementRunSpawned) || 0));
    const level = Math.max(1, Math.floor(Number(this.level) || 1));
    if (spawned <= 0) {
      const overdueMisses = Math.max(1, Math.ceil(config.firstPityEligibleMisses * 0.5));
      return level >= config.firstPityMinLevel &&
        (
          misses >= config.firstPityEligibleMisses ||
          (level >= config.firstPityMaxLevel && misses >= overdueMisses)
        );
    }
    return misses >= config.repeatPityEligibleMisses;
  }

  recordMayhemReinforcementMiss(eligibility) {
    const key = this.getMayhemReinforcementWaveKey(this.level, eligibility?.currentWaveIndex ?? this.currentWaveIndex);
    if (this.mayhemReinforcementRunMissedWaveKeys?.has(key)) return false;
    this.mayhemReinforcementRunMissedWaveKeys.add(key);
    this.mayhemReinforcementEligibleMisses = Math.max(0, Math.floor(Number(this.mayhemReinforcementEligibleMisses) || 0)) + 1;
    return true;
  }

  shouldForceMayhemSuperStormByPity(config = this.getMayhemReinforcementConfig()) {
    if (!config) return false;
    const spawned = Math.max(0, Math.floor(Number(this.mayhemSuperStormRunSpawned) || 0));
    if (spawned > 0) return false;
    const level = Math.max(1, Math.floor(Number(this.level) || 1));
    if (config.superStormChance <= 0) return false;
    if (level < config.superStormFirstPityMinLevel) return false;
    if (level >= config.superStormFirstPityMaxLevel) return true;
    const misses = Math.max(0, Math.floor(Number(this.mayhemSuperStormEligibleMisses) || 0));
    return misses >= config.superStormFirstPityEligibleMisses;
  }

  recordMayhemSuperStormMiss(eligibility) {
    const key = this.getMayhemReinforcementWaveKey(this.level, eligibility?.currentWaveIndex ?? this.currentWaveIndex);
    if (this.mayhemSuperStormRunMissedWaveKeys?.has(key)) return false;
    this.mayhemSuperStormRunMissedWaveKeys.add(key);
    this.mayhemSuperStormEligibleMisses = Math.max(0, Math.floor(Number(this.mayhemSuperStormEligibleMisses) || 0)) + 1;
    return true;
  }

  canRecordMayhemReinforcementMiss(eligibility) {
    if (!eligibility?.config || !eligibility.reasons?.includes('roll_failed')) return false;
    return (eligibility.hardReasons || []).length === 0;
  }

  canRelaxMayhemReinforcementPityGates({ config, waveAgeMs, clearRatio, objectiveCount, expected, activeEnemyBullets }) {
    if (!config) return false;
    const pityMinAge = Math.min(config.minWaveAgeMs, config.pityMinWaveAgeMs);
    const pityMinClear = Math.min(config.minClearRatio, config.pityMinClearRatio);
    const pityMaxEnemies = Math.max(
      config.maxActiveEnemies,
      config.pityMaxActiveEnemies,
      Math.ceil(Math.max(1, expected) * 0.75)
    );
    const pityMaxBullets = Math.max(config.maxActiveEnemyBullets, config.pityMaxActiveEnemyBullets);
    return waveAgeMs >= pityMinAge &&
      clearRatio >= pityMinClear &&
      objectiveCount <= pityMaxEnemies &&
      activeEnemyBullets <= pityMaxBullets;
  }

  getMayhemReinforcementWaveExpectedCount(config = this.waves?.[this.currentWaveIndex]) {
    if (!config) return 0;
    let expected = Math.max(1, Math.floor(Number(config.count) || 1));
    if (config.eliteMiddleShipId) expected += 1;
    if (Array.isArray(config.multiEliteMiddleShipIds)) expected += config.multiEliteMiddleShipIds.length;
    return expected;
  }

  isMayhemReinforcementWaveConfig(config) {
    return Boolean(config && config.type !== 'BOSS' && config.type !== 'bonus_challenge' && !config.isChallenge);
  }

  getNormalMayhemReinforcementWaveIndices({ config, currentWaveIndex, extraWaveRoll }) {
    if (!config) return [];
    const minCount = Math.max(1, Math.min(3, Math.floor(Number(config.normalMinWaveCount) || 1)));
    const maxCount = Math.max(minCount, Math.min(3, Math.floor(Number(config.normalMaxWaveCount) || minCount)));
    const desiredCount = maxCount > minCount && extraWaveRoll < config.normalMaxWaveChance ? maxCount : minCount;
    const indices = [];
    for (let waveIndex = currentWaveIndex + 1; waveIndex < this.normalWavesTotal && indices.length < desiredCount; waveIndex += 1) {
      const wave = this.waves?.[waveIndex] || null;
      if (!this.isMayhemReinforcementWaveConfig(wave)) break;
      indices.push(waveIndex);
    }
    return indices;
  }

  createMayhemSuperStormSyntheticWaveConfig(groupIndex = 0, groupCount = 5, currentWaveIndex = this.currentWaveIndex) {
    const sourceLevel = Math.max(1, Math.floor(Number(this.level) || 1));
    const normalWaveLevel = Math.max(1, Number(this.getNormalWaveDifficultyLevel(sourceLevel)) || sourceLevel);
    const waveIndex = Math.max(0, Math.floor(Number(currentWaveIndex) || 0)) + 1 + Math.max(0, Math.floor(Number(groupIndex) || 0));
    const formations = ['STAGGERED_WING', 'PINCER', 'DOUBLE_ARC', 'CROSS_STREAM', 'SCREEN_DOOR'];
    const formation = formations[Math.abs((sourceLevel * 3 + waveIndex * 5 + groupIndex) % formations.length)];
    const baseWave = {
      type: pickGeneratedEnemyTypeForLevel(normalWaveLevel),
      count: this.getWaveEnemyCount(normalWaveLevel, waveIndex),
      formation,
      tactic: this.pickWaveTactic(normalWaveLevel, waveIndex, formation),
      entry: groupIndex % 3 === 0 ? 'split' : groupIndex % 3 === 1 ? 'alternating' : 'single',
      cadence: 1.08 + Math.min(0.38, normalWaveLevel * 0.014 + groupIndex * 0.045),
      sourceLevel,
      normalWaveDifficultyLevel: normalWaveLevel,
      syntheticMayhemSuperStormWave: true
    };
    const shaped = this.game?.contentDirector?.shapeWaveConfig?.(baseWave, {
      level: normalWaveLevel,
      sourceLevel,
      waveIndex
    }) || baseWave;
    const dangerMoment = this.applyNormalWaveDangerMoment(shaped, normalWaveLevel, waveIndex, groupCount);
    return this.applyDangerMidShipPlan(dangerMoment, normalWaveLevel, waveIndex, groupCount);
  }

  getMayhemSuperStormWavePlan({ config, currentWaveIndex }) {
    const groupCount = Math.max(1, Math.min(3, Math.floor(Number(config?.superStormWaveCount) || 3)));
    const reinforcementWaveIndices = [];
    const reinforcementWaveConfigs = [];
    for (
      let waveIndex = currentWaveIndex + 1;
      waveIndex < this.normalWavesTotal && reinforcementWaveConfigs.length < groupCount;
      waveIndex += 1
    ) {
      const wave = this.waves?.[waveIndex] || null;
      if (!this.isMayhemReinforcementWaveConfig(wave)) break;
      reinforcementWaveIndices.push(waveIndex);
      reinforcementWaveConfigs.push({ ...wave });
    }
    while (reinforcementWaveConfigs.length < groupCount) {
      reinforcementWaveConfigs.push(this.createMayhemSuperStormSyntheticWaveConfig(
        reinforcementWaveConfigs.length,
        groupCount,
        currentWaveIndex
      ));
    }
    return {
      reinforcementWaveIndices,
      reinforcementWaveConfigs,
      groupCount,
      syntheticWaveCount: Math.max(0, reinforcementWaveConfigs.length - reinforcementWaveIndices.length)
    };
  }

  getMayhemReinforcementEligibility(objectiveCount = this.getObjectiveEnemyCount()) {
    const config = this.getMayhemReinforcementConfig();
    const currentWaveIndex = Math.max(0, Math.floor(Number(this.currentWaveIndex) || 0));
    const nextWaveIndex = currentWaveIndex + 1;
    const nextWave = this.waves?.[nextWaveIndex] || null;
    const currentWave = this.waves?.[currentWaveIndex] || null;
    const playScene = this.game?.scenes?.play || null;
    const activeEnemyBullets = playScene?.bulletManager?.enemyBullets
      ?.filter((bullet) => bullet?.active !== false).length || 0;
    const expected = this.getMayhemReinforcementWaveExpectedCount(currentWave);
    const clearRatio = expected > 0 ? Math.max(0, Math.min(1, (expected - objectiveCount) / expected)) : 0;
    const level = Math.max(1, Math.floor(Number(this.level) || 1));
    const roll = config ? this.getStableReinforcementRoll(this.level, currentWaveIndex) : 1;
    const extraWaveRoll = config ? this.getStableReinforcementRoll(this.level, currentWaveIndex, 'mayhem-reinforcement-fourth-wave') : 1;
    const superStormRoll = config ? this.getStableReinforcementRoll(this.level, currentWaveIndex, 'mayhem-reinforcement-super-storm') : 1;
    const dailySignalContract = this.game?.dailySignalContract || null;
    const dailySignalReinforcementForced = Boolean(
      isDailySignalReinforcementSector(dailySignalContract, level) &&
      !this.dailySignalForcedReinforcementSectors?.has(level)
    );
    const dailySignalSuperStormForced = Boolean(
      isDailySignalSuperStormSector(dailySignalContract, level) &&
      !this.dailySignalForcedSuperStormSectors?.has(level)
    );
    let reasons = [];

    if (!config) reasons.push('disabled');
    if (!canRunModeUseMayhemReinforcements(this.game?.runMode)) reasons.push('not_mayhem');
    if (this.phase !== 'WAVES' || this.state !== 'WAVE_ACTIVE') reasons.push('not_normal_wave_phase');
    if (this.boss?.active || this.bossSpawnedThisLevel || this.state === 'BOSS_GATE') reasons.push('boss_active_or_pending');
    if (this.waveEnding || this.spawning || this.pendingWaveConfig) reasons.push('wave_not_stable');
    if (playScene?.sectorArrivalStinger?.active) reasons.push('sector_stinger_active');
    if (playScene?.player?.invulnerable) reasons.push('player_respawn_or_invulnerable');
    if (this.mayhemReinforcementState) reasons.push('already_scheduled');
    if (this.mayhemReinforcementTriggeredWaves?.has(currentWaveIndex)) reasons.push('already_triggered_for_wave');
    if (nextWaveIndex < (config?.minNextWaveIndex || 0)) reasons.push('too_early_in_sector');
    const superStormGateReasons = [...reasons];
    if (config && level < config.superStormMinLevel && !dailySignalSuperStormForced) superStormGateReasons.push('super_storm_level_gated');
    const superStormNaturalHit = Boolean(
      config &&
      level >= config.superStormMinLevel &&
      config.superStormChance > 0 &&
      superStormRoll < config.superStormChance
    );
    const superStormPityForced = Boolean(
      config &&
      config.superStormChance > 0 &&
      this.shouldForceMayhemSuperStormByPity(config)
    );
    const superStormCandidate = Boolean(dailySignalSuperStormForced || superStormNaturalHit || superStormPityForced);
    if (!superStormCandidate) {
      if (nextWaveIndex >= this.normalWavesTotal) reasons.push('no_next_wave');
      if (!nextWave || nextWave.type === 'BOSS' || nextWave.type === 'bonus_challenge' || nextWave.isChallenge) reasons.push('next_wave_not_normal');
    }
    const waveAgeMs = Number(this.waveActiveTimer) || 0;
    if (waveAgeMs < (config?.minWaveAgeMs || 0)) reasons.push('wave_too_young');
    if (clearRatio < (config?.minClearRatio || 0)) reasons.push('not_enough_wave_progress');
    if (objectiveCount > (config?.maxActiveEnemies || 0)) reasons.push('too_many_enemies');
    if (activeEnemyBullets > (config?.maxActiveEnemyBullets || 0)) reasons.push('too_many_bullets');

    const reinforcementWaveIndices = this.getNormalMayhemReinforcementWaveIndices({ config, currentWaveIndex, extraWaveRoll });
    if (!superStormCandidate) {
      if (config && level < config.normalMultiWaveMinLevel && !dailySignalReinforcementForced) reasons.push('multi_wave_gated');
      if (config && reinforcementWaveIndices.length < config.normalMinWaveCount) reasons.push('not_enough_future_waves');
    }
    const superStormPlan = superStormCandidate && reasons.length === 0
      ? this.getMayhemSuperStormWavePlan({ config, currentWaveIndex })
      : null;
    const canRecordSuperStormMiss = Boolean(
      config &&
      config.superStormChance > 0 &&
      !superStormCandidate &&
      level >= config.superStormMinLevel &&
      superStormGateReasons.length === 0 &&
      waveAgeMs >= (config?.minWaveAgeMs || 0) &&
      clearRatio >= (config?.minClearRatio || 0) &&
      objectiveCount <= (config?.maxActiveEnemies || 0) &&
      activeEnemyBullets <= (config?.maxActiveEnemyBullets || 0)
    );
    const hardReasons = reasons.filter((reason) => MAYHEM_REINFORCEMENT_HARD_REASONS.has(reason));
    const pityReady = Boolean(config && !superStormCandidate && roll >= config.chance && this.shouldForceMayhemReinforcementByPity(config));
    const pityRelaxed = Boolean(pityReady &&
      hardReasons.length === 0 &&
      this.canRelaxMayhemReinforcementPityGates({
        config,
        waveAgeMs,
        clearRatio,
        objectiveCount,
        expected,
        activeEnemyBullets
      }));
    if (pityRelaxed) {
      reasons = reasons.filter((reason) => !MAYHEM_REINFORCEMENT_SOFT_REASONS.has(reason));
    }
    const pityForced = Boolean(config && !superStormCandidate && reasons.length === 0 && roll >= config.chance && this.shouldForceMayhemReinforcementByPity(config));
    if (config && !superStormCandidate && roll >= config.chance && !pityForced && !dailySignalReinforcementForced) reasons.push('roll_failed');

    const result = {
      eligible: reasons.length === 0,
      reasons,
      hardReasons: reasons.filter((reason) => MAYHEM_REINFORCEMENT_HARD_REASONS.has(reason)),
      softReasons: reasons.filter((reason) => MAYHEM_REINFORCEMENT_SOFT_REASONS.has(reason)),
      config,
      currentWaveIndex,
      nextWaveIndex,
      objectiveCount,
      expected,
      clearRatio,
      activeEnemyBullets,
      waveAgeMs,
      roll,
      extraWaveRoll,
      superStormRoll,
      chance: config?.chance || 0,
      doubleWaveChance: config?.doubleWaveChance || 0,
      normalMinWaveCount: config?.normalMinWaveCount || 1,
      normalMaxWaveCount: config?.normalMaxWaveCount || 1,
      normalMaxWaveChance: config?.normalMaxWaveChance || 0,
      superStormChance: config?.superStormChance || 0,
      superStormWaveCount: config?.superStormWaveCount || 0,
      superStormNaturalHit,
      superStormPityForced,
      dailySignalReinforcementForced,
      dailySignalSuperStormForced,
      dailySignalForced: dailySignalReinforcementForced || dailySignalSuperStormForced,
      canRecordSuperStormMiss,
      isSuperStorm: Boolean(superStormPlan),
      reinforcementWaveIndices: superStormPlan
        ? superStormPlan.reinforcementWaveIndices
        : (reinforcementWaveIndices.length ? reinforcementWaveIndices : [nextWaveIndex]),
      reinforcementWaveConfigs: superStormPlan?.reinforcementWaveConfigs || null,
      syntheticWaveCount: superStormPlan?.syntheticWaveCount || 0,
      warningMs: superStormPlan ? config.superStormWarningMs : config?.warningMs,
      pityForced,
      pityRelaxed,
      eligibleMisses: this.mayhemReinforcementEligibleMisses || 0,
      runSpawned: this.mayhemReinforcementRunSpawned || 0,
      superStormEligibleMisses: this.mayhemSuperStormEligibleMisses || 0,
      superStormRunSpawned: this.mayhemSuperStormRunSpawned || 0
    };
    if (this.mayhemReinforcementStats) this.mayhemReinforcementStats.lastEligibility = result;
    return result;
  }

  maybeScheduleMayhemReinforcement(objectiveCount = this.getObjectiveEnemyCount()) {
    const eligibility = this.getMayhemReinforcementEligibility(objectiveCount);
    if (this.mayhemReinforcementStats) {
      this.mayhemReinforcementStats.lastRoll = eligibility.roll;
      this.mayhemReinforcementStats.lastSuperStormRoll = eligibility.superStormRoll;
    }
    if (eligibility.canRecordSuperStormMiss && !eligibility.isSuperStorm) {
      this.recordMayhemSuperStormMiss(eligibility);
    }
    if (!eligibility.eligible && this.canRecordMayhemReinforcementMiss(eligibility)) {
      this.recordMayhemReinforcementMiss(eligibility);
    }
    if (!eligibility.eligible) return false;

    const warningMs = eligibility.warningMs || eligibility.config.warningMs;
    const now = Date.now();
    this.mayhemReinforcementState = {
      currentWaveIndex: eligibility.currentWaveIndex,
      reinforcementWaveIndex: eligibility.nextWaveIndex,
      reinforcementWaveIndices: eligibility.reinforcementWaveIndices,
      reinforcementWaveConfigs: eligibility.reinforcementWaveConfigs,
      syntheticWaveCount: eligibility.syntheticWaveCount,
      isSuperStorm: eligibility.isSuperStorm,
      scheduledAt: now,
      spawnAt: now + warningMs,
      warningMs,
      warningFired: false,
      spawned: false
    };
    this.mayhemReinforcementTriggeredWaves.add(eligibility.currentWaveIndex);
    if (eligibility.dailySignalSuperStormForced) {
      this.dailySignalForcedSuperStormSectors.add(Math.max(1, Math.floor(Number(this.level) || 1)));
    } else if (eligibility.dailySignalReinforcementForced) {
      this.dailySignalForcedReinforcementSectors.add(Math.max(1, Math.floor(Number(this.level) || 1)));
    }
    this.mayhemReinforcementStats.scheduled += 1;
    if (eligibility.isSuperStorm) this.mayhemReinforcementStats.superStorms += 1;
    this.mayhemReinforcementStats.lastPityForced = eligibility.pityForced;
    this.fireMayhemReinforcementWarning(this.mayhemReinforcementState);
    const targetLabel = eligibility.isSuperStorm
      ? `${eligibility.reinforcementWaveConfigs?.length || eligibility.superStormWaveCount || 3}groups` +
        (eligibility.syntheticWaveCount ? `+${eligibility.syntheticWaveCount}synthetic` : '')
      : eligibility.reinforcementWaveIndices.map((index) => index + 1).join('+');
    console.log(
      `[MayhemReinforcement] scheduled${eligibility.isSuperStorm ? '_super_storm' : ''} level=${this.level}` +
      ` wave=${eligibility.currentWaveIndex + 1}->${targetLabel}` +
      ` roll=${eligibility.roll.toFixed(4)} chance=${eligibility.chance}` +
      ` extraWaveRoll=${eligibility.extraWaveRoll.toFixed(4)} normalMaxWaveChance=${eligibility.normalMaxWaveChance}` +
      ` superStormRoll=${eligibility.superStormRoll.toFixed(4)} superStormChance=${eligibility.superStormChance}` +
      ` clear=${eligibility.clearRatio.toFixed(2)} enemies=${eligibility.objectiveCount}/${eligibility.expected}` +
      ` bullets=${eligibility.activeEnemyBullets}` +
      ` pity=${eligibility.pityForced ? 'yes' : 'no'} misses=${eligibility.eligibleMisses}` +
      ` superPity=${eligibility.superStormPityForced ? 'yes' : 'no'} superMisses=${eligibility.superStormEligibleMisses}`
    );
    return true;
  }

  forceMayhemSuperStormForDebug() {
    const config = this.getMayhemReinforcementConfig();
    if (!config) return { ok: false, reason: 'disabled' };
    if (this.phase !== 'WAVES' || this.state !== 'WAVE_ACTIVE') return { ok: false, reason: 'not_wave_active' };
    if (this.waveEnding) return { ok: false, reason: 'wave_ending' };
    if (this.mayhemReinforcementState) return { ok: false, reason: 'already_scheduled' };

    const currentWaveIndex = Math.max(0, Math.floor(Number(this.currentWaveIndex) || 0));
    const plan = this.getMayhemSuperStormWavePlan({ config, currentWaveIndex });
    if (!plan?.reinforcementWaveConfigs?.length) return { ok: false, reason: 'no_wave_plan' };

    const now = Date.now();
    const warningMs = config.superStormWarningMs;
    this.mayhemReinforcementState = {
      currentWaveIndex,
      reinforcementWaveIndex: currentWaveIndex + 1,
      reinforcementWaveIndices: plan.reinforcementWaveIndices,
      reinforcementWaveConfigs: plan.reinforcementWaveConfigs,
      reinforcementGroupCount: plan.groupCount,
      syntheticWaveCount: plan.syntheticWaveCount,
      isSuperStorm: true,
      debugForced: true,
      scheduledAt: now,
      spawnAt: now + warningMs,
      warningMs,
      warningFired: false,
      spawned: false
    };
    this.mayhemReinforcementTriggeredWaves.add(currentWaveIndex);
    if (this.mayhemReinforcementStats) {
      this.mayhemReinforcementStats.scheduled += 1;
      this.mayhemReinforcementStats.superStorms += 1;
      this.mayhemReinforcementStats.lastPityForced = false;
      this.mayhemReinforcementStats.lastSuperStormRoll = 0;
    }
    this.fireMayhemReinforcementWarning(this.mayhemReinforcementState);
    console.log(
      `[MayhemReinforcement] debug_forced_super_storm level=${this.level}` +
      ` wave=${currentWaveIndex + 1} groups=${plan.groupCount}` +
      ` synthetic=${plan.syntheticWaveCount} warningMs=${warningMs}`
    );
    return {
      ok: true,
      groupCount: plan.groupCount,
      syntheticWaveCount: plan.syntheticWaveCount,
      warningMs
    };
  }

  fireMayhemReinforcementWarning(state = this.mayhemReinforcementState) {
    if (!state || state.warningFired) return false;
    state.warningFired = true;
    this.mayhemReinforcementStats.warnings += 1;
    this.mayhemReinforcementStats.lastWarningLeadMs = Math.max(0, state.spawnAt - Date.now());

    const playScene = this.game?.scenes?.play;
    const groupCount = Math.max(
      1,
      Math.floor(Number(state.reinforcementGroupCount) ||
        Math.min(3, Number(state.reinforcementWaveConfigs?.length) || 0) ||
        Math.min(3, Number(state.reinforcementWaveIndices?.length) || 0) ||
        1)
    );
    const useSuperStormVoice = state.isSuperStorm === true;
    const specializedPresentationShown = playScene?.showMayhemReinforcementStormWarning?.({
      groupCount,
      boss: this.state === 'BOSS_ACTIVE',
      superStorm: state.isSuperStorm === true,
      warningMs: state.warningMs
    });
    if (!specializedPresentationShown && playScene?.showToast) {
      const compactHud = this.game.getWidth() < 1100 || this.game.getHeight() < 700;
      playScene.showToast(translateText(MAYHEM_REINFORCEMENT_WARNING_TEXT), {
        fontSize: compactHud ? 17 : 22,
        fill: '#ffef7e',
        stroke: '#1d0500',
        strokeThickness: 4,
        y: compactHud ? this.game.getHeight() * 0.25 : 118,
        duration: Math.max(1200, Math.min(2200, state.warningMs + 250)),
        slot: 'top',
        type: 'warning',
        priority: 4,
        maxWidth: this.game.getWidth() * (compactHud ? 0.86 : 0.64)
      });
    }
    AudioManager.playVoice(useSuperStormVoice ? MAYHEM_SUPER_STORM_WARNING_SOUND_ID : MAYHEM_REINFORCEMENT_WAVE_SOUND_ID, {
      force: true,
      bypassGlobalCooldown: true,
      cooldownMs: useSuperStormVoice ? 0 : 2200,
      eventCooldownMs: useSuperStormVoice ? 0 : 2200,
      duckMs: useSuperStormVoice ? 2400 : 1150,
      voicePriority: useSuperStormVoice ? 8 : 7
    });
    return true;
  }

  updateMayhemReinforcement() {
    const state = this.mayhemReinforcementState;
    if (!state || state.spawned) return false;
    if (this.phase !== 'WAVES' || this.state !== 'WAVE_ACTIVE' || this.waveEnding) {
      this.mayhemReinforcementState = null;
      return false;
    }
    if (Date.now() < state.spawnAt) return false;

    const reinforcementWaveIndices = Array.isArray(state.reinforcementWaveIndices) && state.reinforcementWaveIndices.length
      ? state.reinforcementWaveIndices
      : (state.isSuperStorm ? [] : [state.reinforcementWaveIndex]);
    const configs = Array.isArray(state.reinforcementWaveConfigs) && state.reinforcementWaveConfigs.length
      ? state.reinforcementWaveConfigs
      : reinforcementWaveIndices.map((waveIndex) => this.waves?.[waveIndex] || null);
    if (!configs.length || configs.some((config) => !this.isMayhemReinforcementWaveConfig(config))) {
      this.mayhemReinforcementState = null;
      return false;
    }

    state.spawned = true;
    for (const waveIndex of reinforcementWaveIndices) {
      this.mayhemReinforcementConsumedWaveIndices.add(waveIndex);
    }
    this.mayhemReinforcementStats.spawned += reinforcementWaveIndices.length;
    if (state.isSuperStorm) this.mayhemSuperStormSurvivalWaveCounts.set(
      state.currentWaveIndex,
      Math.max(1, Math.min(3, Math.floor(Number(configs.length) || Number(state.reinforcementGroupCount) || 3)))
    );
    if (state.isSuperStorm) {
      this.mayhemSuperStormRunSpawned = Math.max(0, Math.floor(Number(this.mayhemSuperStormRunSpawned) || 0)) + 1;
      this.mayhemSuperStormEligibleMisses = 0;
      this.mayhemSuperStormRunMissedWaveKeys?.clear();
    }
    this.mayhemReinforcementStats.spawned += state.isSuperStorm
      ? Math.max(0, configs.length - reinforcementWaveIndices.length)
      : 0;
    this.mayhemReinforcementRunSpawned = Math.max(0, Math.floor(Number(this.mayhemReinforcementRunSpawned) || 0)) + 1;
    this.mayhemReinforcementEligibleMisses = 0;
    this.mayhemReinforcementRunMissedWaveKeys?.clear();
    const reinforcementConfig = this.getMayhemReinforcementConfig();
    configs.forEach((config, index) => {
      const centeredIndex = index - (configs.length - 1) / 2;
      const isSuperStorm = state.isSuperStorm === true;
      this.measurePerformance('mayhem_reinforcement.spawn_wave', () => this.spawnWave({
        ...config,
        entry: index % 3 === 0 ? 'split' : index % 3 === 1 ? 'alternating' : 'single',
        isMayhemReinforcement: true,
        reinforcedFromWaveIndex: state.currentWaveIndex,
        reinforcementGroupIndex: index,
        reinforcementGroupCount: configs.length,
        isMayhemSuperStorm: isSuperStorm,
        reinforcementEntryDelayMs: index * (isSuperStorm
          ? (reinforcementConfig?.superStormEntryDelayMs || 220)
          : 900),
        reinforcementLaneOffsetPx: configs.length > 1
          ? centeredIndex * (isSuperStorm ? (reinforcementConfig?.superStormLaneOffsetPx || 58) : 72)
          : 0,
        reinforcementScoreMultiplier: reinforcementConfig?.reinforcementScoreMultiplier || 1,
        allowConcurrentSpawn: isSuperStorm || index > 0
      }));
    });
    console.log(
      `[MayhemReinforcement] spawned${state.isSuperStorm ? '_super_storm' : ''} level=${this.level}` +
      ` waves=${reinforcementWaveIndices.length ? reinforcementWaveIndices.map((index) => index + 1).join('+') : 'synthetic'}/${this.normalWavesTotal}` +
      ` groups=${configs.length}` +
      ` warningLeadMs=${Math.round(this.mayhemReinforcementStats.lastWarningLeadMs || 0)}`
    );
    return true;
  }

  maybeScheduleBossMayhemReinforcement() {
    const config = this.getMayhemReinforcementConfig();
    if (!config || config.bossFightChance <= 0 || config.bossFightMaxEvents <= 0) return false;
    if (!canRunModeUseMayhemReinforcements(this.game?.runMode)) return false;
    if (this.state !== 'BOSS_ACTIVE' || !this.boss?.active || this.bossDefeatedThisLevel) return false;
    if (this.bossReinforcementState && !this.bossReinforcementState.spawned) return false;
    if (this.bossReinforcementEventsThisBoss >= config.bossFightMaxEvents) return false;

    const now = Date.now();
    const bossAgeMs = now - (this.bossSpawnedAtMs || this.boss.spawnedAtMs || now);
    if (bossAgeMs < config.bossFightMinAgeMs) return false;
    if (now < this.bossReinforcementCooldownUntilMs || now < this.bossReinforcementNextCheckAtMs) return false;

    const playScene = this.game?.scenes?.play;
    const activeBossAdds = this.enemies.filter((enemy) =>
      enemy?.kind !== 'boss' && (enemy.active || enemy.waitingForEntry)
    ).length;
    const activeBullets = playScene?.bulletManager?.enemyBullets?.filter((bullet) => bullet?.active !== false).length || 0;
    const level = Math.max(1, Math.floor(Number(this.level) || 1));
    const addCap = level <= 4 ? 4 : level <= 9 ? 6 : 8;
    const bulletCap = level <= 4 ? 18 : level <= 9 ? 26 : 34;
    if (activeBossAdds > addCap || activeBullets > bulletCap) {
      this.bossReinforcementNextCheckAtMs = now + Math.round(config.bossFightCheckIntervalMs * 0.75);
      return false;
    }
    if (playScene?.lastHitAt && now - playScene.lastHitAt < 4200) {
      this.bossReinforcementNextCheckAtMs = now + Math.round(config.bossFightCheckIntervalMs * 0.75);
      return false;
    }

    const attemptIndex = Math.max(0, Math.floor(Number(this.bossReinforcementAttemptIndex) || 0));
    const roll = this.getStableReinforcementRoll(level, attemptIndex, 'mayhem-boss-reinforcement');
    const doubleWaveRoll = this.getStableReinforcementRoll(level, attemptIndex, 'mayhem-boss-reinforcement-double-wave');
    const tripleWaveRoll = this.getStableReinforcementRoll(level, attemptIndex, 'mayhem-boss-reinforcement-triple-wave');
    this.bossReinforcementAttemptIndex = attemptIndex + 1;
    this.bossReinforcementNextCheckAtMs = now + config.bossFightCheckIntervalMs + Math.random() * 1600;
    if (roll >= config.bossFightChance) return false;
    const canMultiWave = level >= config.doubleWaveMinLevel &&
      (!config.doubleWaveRequiresPriorReinforcement || this.mayhemReinforcementRunSpawned > 0);
    const canTripleWave = canMultiWave && tripleWaveRoll < config.tripleWaveChance;
    const canDoubleWave = canMultiWave && !canTripleWave && doubleWaveRoll < config.doubleWaveChance;
    const reinforcementGroupCount = canTripleWave ? 3 : canDoubleWave ? 2 : 1;
    const reinforcementWaveConfigs = this.createBossMayhemReinforcementWaveConfigs(reinforcementGroupCount, attemptIndex);
    if (reinforcementWaveConfigs.length < reinforcementGroupCount) return false;

    this.bossReinforcementState = {
      bossLevel: level,
      attemptIndex,
      reinforcementGroupCount,
      reinforcementWaveConfigs,
      scheduledAt: now,
      spawnAt: now + config.warningMs,
      warningMs: config.warningMs,
      warningFired: false,
      spawned: false,
      roll,
      doubleWaveRoll,
      tripleWaveRoll
    };
    this.fireMayhemReinforcementWarning(this.bossReinforcementState);
    this.bossReinforcementCooldownUntilMs = now + config.bossFightCooldownMs;
    this.mayhemReinforcementStats.scheduled += 1;
    console.log(
      `[MayhemReinforcement] boss_scheduled level=${level}` +
      ` attempt=${attemptIndex} roll=${roll.toFixed(4)} chance=${config.bossFightChance}` +
      ` doubleRoll=${doubleWaveRoll.toFixed(4)} doubleChance=${config.doubleWaveChance}` +
      ` tripleRoll=${tripleWaveRoll.toFixed(4)} tripleChance=${config.tripleWaveChance}` +
      ` fullWaves=${reinforcementWaveConfigs.length}`
    );
    return true;
  }

  updateBossMayhemReinforcement() {
    const state = this.bossReinforcementState;
    if (!state || state.spawned) return false;
    if (this.state !== 'BOSS_ACTIVE' || !this.boss?.active || this.bossDefeatedThisLevel) {
      this.bossReinforcementState = null;
      return false;
    }
    if (Date.now() < state.spawnAt) return false;
    const groupCount = Math.max(1, Math.min(3, Math.floor(Number(state.reinforcementGroupCount) || 1)));
    const spawned = this.spawnBossMayhemReinforcementWave(groupCount, state);
    state.spawned = true;
    if (spawned > 0) {
      this.bossReinforcementEventsThisBoss += 1;
      this.mayhemReinforcementStats.spawned += groupCount;
      this.mayhemReinforcementRunSpawned = Math.max(0, Math.floor(Number(this.mayhemReinforcementRunSpawned) || 0)) + 1;
      console.log(
        `[MayhemReinforcement] boss_spawned level=${this.level}` +
        ` fullWaves=${groupCount} expectedEnemies=${spawned}` +
        ` warningLeadMs=${Math.round(this.mayhemReinforcementStats.lastWarningLeadMs || 0)}`
      );
      return true;
    }
    return false;
  }

  hasPendingMayhemReinforcement() {
    const state = this.mayhemReinforcementState;
    return Boolean(state && !state.spawned && this.phase === 'WAVES' && this.state === 'WAVE_ACTIVE');
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
    if (this.getNormalWaveDifficultyLevel(this.level) > 1 || this.state !== 'WAVE_ACTIVE') return 1;
    const scalars = [0.32, 0.45, 0.58, 0.68];
    return scalars[this.currentWaveIndex] ?? 0.74;
  }

  getOpeningMomentumTuning(sourceLevel = this.level) {
    const config = BalanceConfig.difficulty?.openingMomentum || {};
    const level = Math.max(1, Math.floor(Number(sourceLevel) || 1));
    const enabled = config.enabled === true && level <= (Number(config.maxSourceLevel) || 0);
    const levelValue = (key, fallback = 1) => {
      const value = Number(config?.[key]?.[level]);
      return enabled && Number.isFinite(value) && value > 0 ? value : fallback;
    };
    return {
      enabled,
      sourceLevel: level,
      waveBriefingMs: levelValue('waveBriefingMsByLevel', BalanceConfig.difficulty.waveDelayMs || 1600),
      waveToastDurationMs: levelValue('waveToastDurationMsByLevel', 2800),
      waveCleanupMs: levelValue('waveCleanupMsByLevel', BalanceConfig.difficulty.waveCleanupMs || 2000),
      entryDurationMult: levelValue('entryDurationMultByLevel'),
      entryDelayMult: levelValue('entryDelayMultByLevel'),
      enemySpeedMult: levelValue('enemySpeedMultByLevel'),
      diveBiasMult: levelValue('diveBiasMultByLevel')
    };
  }

  update(delta) {
    // 1. Update State Machine
    switch (this.state) {
      case 'WAVE_ACTIVE':
        if (!this.waveEnding) {
          this.waveActiveTimer += Math.max(0, Math.min(1000, delta * 16.67));
        }
        this.updateMayhemReinforcement();
        // WAVE FIX: Check objective enemies only, not bonus drones
        const objectiveCount = this.getObjectiveEnemyCount();
        if (objectiveCount === 0 && !this.waveEnding) {
          if (this.spawning) {
            break;
          }
          if (this.hasPendingMayhemReinforcement()) {
            break;
          }
          // Start wave ending immediately when last objective enemy dies
          this.waveEnding = true;
          this.markPerformance('wave_clear.objectives_zero', {
            level: this.level,
            wave: this.currentWaveIndex + 1,
            total: this.normalWavesTotal
          });

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
          this.maybeScheduleMayhemReinforcement(objectiveCount);
          this.maybePressureStalledWave(objectiveCount);
          if (!this.maybeRetreatStalledWave(objectiveCount)) {
            this.maybeClearStalledWave(objectiveCount);
          }
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
            this.measurePerformance('wave_clear.cleanup_slow_targets', () => allTargets.forEach(t => {
              if (t.vx) t.vx *= 0.2;
              if (t.vy) t.vy *= 0.2;
            }));
            this.cleanupPhase = 'CLEARING';
          }

          const waveCleanupMs = this.getOpeningMomentumTuning().waveCleanupMs;
          if (this.cleanupTimer > waveCleanupMs && this.cleanupPhase === 'CLEARING') {
            const clearedCount = allTargets.length;
            this.measurePerformance('wave_clear.array_cleanup_compaction', () => this.forceClearAllEnemies());

            // WAVE FIX: Diagnostic - cleanup end
            console.log(`[WaveCleanup] end objectiveAlive=0 bonusDroneAlive=0 cleared=${clearedCount}`);
            this.logBossStatus('wave_cleanup_end');

            this.cleanupPhase = 'NONE';
          }
        }

        // After cleanup finishes, progress phase
        if (this.waveEnding && this.cleanupPhase === 'NONE') {
          this.measurePerformance('wave_clear.reward_and_transition', () => this.onWaveCleared());
          this.waveEnding = false; // Reset for next wave
        }
        break;

      case 'WAVE_BRIEFING':
        const waveBriefingPlayScene = this.game.scenes.play;
        waveBriefingPlayScene?.flushPendingRankUpPresentation?.('wave_briefing');
        if (waveBriefingPlayScene?.shouldHoldProgressionPresentation?.()) break;
        this.waveBriefingTimer += delta * 16.67;
        const diff = BalanceConfig.difficulty;
        const announceMs = diff.waveBriefingAnnounceMs || 650;
        const briefingMs = this.getOpeningMomentumTuning().waveBriefingMs;
        if (!this.waveBriefingAnnounced && this.waveBriefingTimer >= announceMs) {
          this.measurePerformance('incoming_wave_banner', () => this.announceWaveBriefing());
          this.waveBriefingAnnounced = true;
        }
        if (this.waveBriefingTimer >= briefingMs && this.pendingWaveConfig) {
          const config = this.pendingWaveConfig;
          this.pendingWaveConfig = null;
          this.waveBriefingTimer = 0;
          this.waveBriefingAnnounced = false;
          this.state = 'WAVE_ACTIVE';
          this.measurePerformance('incoming_wave.spawn_wave', () => this.spawnWave(config));
        }
        break;

      case 'BOSS_GATE':
        // BOSS FIX: Show wanted poster, wait for gate duration, then spawn boss
        const bossGatePlayScene = this.game.scenes.play;
        bossGatePlayScene?.flushPendingRankUpPresentation?.('boss_gate');
        if (bossGatePlayScene?.shouldHoldProgressionPresentation?.()) break;
        this.bossGateTimer += delta * 16.67;

        if (!this.bossGateTauntDelayResolved) {
          const playScene = this.game.scenes.play;
          this.bossGateTauntDelayMs = playScene?.getTransitionMessageDelayMs
            ? playScene.getTransitionMessageDelayMs({ minMs: 900, maxMs: 3600 })
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
          this.markPerformance('boss_event_telegraph_start', { level: this.level, phase: 'boss_gate_spawn' });
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
        this.updateBossMayhemReinforcement();
        this.maybeScheduleBossMayhemReinforcement();
        this.maybeTriggerBossChaos();
        this.maybeSpawnBossFuelShip();
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

  isPendingEntryEnemy(enemy) {
    if (!enemy || enemy.destroyed === true) return false;
    if (enemy.waitingForEntry === true) return true;
    const entryStart = Number(enemy.entryCurve?.startTime);
    return enemy.active === false &&
      enemy.state === 'ENTRY' &&
      Number.isFinite(entryStart) &&
      entryStart > Date.now();
  }

  shouldSweepInactiveEnemy(enemy) {
    if (!enemy) return true;
    if (enemy.destroyed === true) return true;
    if (enemy.active !== false) return false;
    return !this.isPendingEntryEnemy(enemy);
  }

  sweepInactiveEnemyVisuals(reason = 'inactive_sweep') {
    let swept = 0;
    this.enemies = this.enemies.filter(enemy => {
      if (!enemy) return false;
      if (!this.shouldSweepInactiveEnemy(enemy)) return true;
      this.removeEnemySprite(enemy, reason);
      swept += 1;
      return false;
    });

    if (this.hijacker && (this.hijacker.active === false || this.hijacker.destroyed === true)) {
      this.removeEnemySprite(this.hijacker, `${reason}_hijacker`);
      this.hijacker = null;
      swept += 1;
    }
    return swept;
  }

  updateEnemies(delta) {
    const player = this.game.scenes.play ? this.game.scenes.play.player : null;

    // SAFEGUARD: Check for active time-slow powerups correctly.
    const isSlowTime = player?.isSlowTimeActive?.() === true;

    const timeScale = isSlowTime ? (player?.getSlowTimeEnemyScale?.() ?? 0.33) : 1.0;
    const tier = this.directorState?.tier || 0;
    const diff = BalanceConfig.difficulty;
    const pressureLevel = this.phase === 'BOSS' || this.state === 'BOSS_ACTIVE'
      ? Math.max(1, Number(this.level) || 1)
      : Math.max(1, Number(this.currentNormalWaveDifficultyLevel) || this.getNormalWaveDifficultyLevel(this.level));
    const levelScale = Math.max(0, pressureLevel - 1);
    const baseFireChance = Math.min(
      diff.enemyFireChanceMax ?? Number.POSITIVE_INFINITY,
      (diff.enemyFireChance ?? 0.0036) + levelScale * (diff.enemyFireChancePerLevel ?? 0)
    );
    const pressureDirector = this.game?.runPressureDirector;
    const pressureTuning = getNormalWavePressureTuning(pressureLevel);
    const fireChance = (pressureDirector?.scaleEnemyFireChance?.(baseFireChance, pressureLevel) ?? baseFireChance * pressureTuning.fireChanceMult) *
      diff.pressureScalar *
      this.getOpeningFireScalar() *
      (1 + tier * 0.1);
    const openingMomentum = this.getOpeningMomentumTuning();
    const enemySpeedMult = (pressureDirector?.scaleEnemySpeed?.(1, pressureLevel) || pressureTuning.enemySpeedMult || 1) *
      openingMomentum.enemySpeedMult;
    const dt = delta * timeScale;
    const playerX = player ? player.x : 400;
    const playerY = player ? player.y : 300;

    this.enemies = this.enemies.filter(enemy => {
      if (!enemy) return false;
      if (this.shouldSweepInactiveEnemy(enemy)) {
        this.removeEnemySprite(enemy, 'inactive_update_pre');
        return false;
      }

      const isBoss = enemy.kind === 'boss';
      enemy.update(isBoss ? dt : dt * enemySpeedMult, playerX, playerY);

      if (enemy.challengeFlightReticle) {
        enemy.challengeFlightReticle.rotation += delta * 0.018;
        enemy.challengeFlightReticle.alpha = 0.72 + (Math.sin(Date.now() * 0.009 + (enemy.x || 0) * 0.01) * 0.5 + 0.5) * 0.28;
      }

      if (this.expireChallengeFlightTarget(enemy)) {
        this.removeEnemySprite(enemy, 'challenge_flight_escape');
        return false;
      }

      if (this.shouldSweepInactiveEnemy(enemy)) {
        this.removeEnemySprite(enemy, 'inactive_update');
        return false;
      }
      if (!enemy.active || enemy.waitingForEntry) return true;

      if (enemy.kind === 'boss_fuel_ship') {
        this.updateBossFuelShip(enemy, dt);
        return true;
      }

      // Shooting
      const rareFireMultiplier = enemy.isRareChaosVisitor ? 2.45 : 1;
      const enemyFireChance = fireChance * (enemy.getTacticalFireScalar?.() || enemy.tacticalFireScalar || 1) * rareFireMultiplier;
      const shouldShoot = enemy.challengeFlightTarget
        ? false
        : isBoss
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
    const challengeNow = Date.now();
    if (this.challengeFlightState?.active && challengeNow >= (this.challengeFlightState.nextHudUpdateAt || 0)) {
      this.challengeFlightState.nextHudUpdateAt = challengeNow + 200;
      this.game?.scenes?.play?.updateChallengeFlightHud?.(this.getChallengeFlightDebugState());
    }
  }

  playEnemyShotFeedback(enemy, playerX, playerY) {
    const playScene = this.game?.scenes?.play;
    const angle = Math.atan2(playerY - enemy.y, playerX - enemy.x);
    playScene?.particleManager?.createMuzzleFlash(enemy.x, enemy.y, angle, enemy.color || 0xff5544);
    this.maybePlayAlienAttackBark(enemy, playerX, playerY);
    if (enemy?.isRareChaosVisitor) {
      AudioManager.playSfx('rare_visitor_barrage', { volume: 0.42, minIntervalMs: 520 });
    }

    // Most enemy fire stays visual-only. The old recurring enemy_shoot chirp
    // became grating; alien barks are rare, diegetic, and globally gated.
  }

  maybePlayAlienAttackBark(enemy, playerX, playerY) {
    if (!enemy || enemy.kind === 'boss' || enemy.kind === 'boss_fuel_ship' || enemy.kind === 'bonus_drone') return false;
    if (enemy.waitingForEntry || enemy.y < 32 || enemy.y > (this.game?.getHeight?.() || 720) + 60) return false;

    const now = Date.now();
    if (!this.alienAttackBarkWindowStartedAt || now - this.alienAttackBarkWindowStartedAt > 30000) {
      this.alienAttackBarkWindowStartedAt = now;
      this.alienAttackBarkWindowCount = 0;
    }
    if (this.alienAttackBarkWindowCount >= 4) return false;

    const level = Math.max(1, Number(this.level || this.game?.level) || 1);
    const playerDistance = Math.hypot((playerX || 0) - enemy.x, (playerY || 0) - enemy.y);
    const isPriorityEnemy = enemy.kind === 'elite_middle_ship' ||
      enemy.kind === 'danger_mid_ship' ||
      enemy.kind === 'boss_add' ||
      enemy.kind === 'boss_chaos_support' ||
      enemy.isEliteMiddleShip ||
      Boolean(enemy.middleShipProfile);
    const isDiveThreat = enemy.state === 'DIVE' || enemy.waveTactic?.forcedDive || enemy.tacticalDiveUsed;
    const isClose = playerDistance < Math.max(180, (this.game?.getWidth?.() || 1280) * 0.22);

    let chance = level <= 1 ? 0.028 : 0.045;
    if (isPriorityEnemy) chance += 0.08;
    if (isDiveThreat) chance += 0.055;
    if (isClose) chance += 0.035;
    if (this.phase === 'BOSS') chance *= 0.65;
    chance = Math.max(0.018, Math.min(0.19, chance));

    const minGapMs = isPriorityEnemy || isDiveThreat ? 6800 : 9200;
    if (now - this.lastAlienAttackBarkAt < minGapMs) return false;
    if (Math.random() > chance) return false;

    const width = Math.max(1, this.game?.getWidth?.() || 1280);
    const pan = Math.max(-0.52, Math.min(0.52, ((enemy.x || width / 2) / width - 0.5) * 1.04));
    const intensity = 0.58 +
      (isPriorityEnemy ? 0.22 : 0) +
      (isDiveThreat ? 0.16 : 0) +
      (isClose ? 0.08 : 0) +
      Math.min(0.22, level * 0.008);
    const played = AudioManager.playAlienAttackBark({
      intensity,
      pan,
      minIntervalMs: minGapMs
    });
    if (played) {
      this.lastAlienAttackBarkAt = now;
      this.alienAttackBarkWindowCount += 1;
    }
    return played;
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

  beginChallengeFlight(config = {}, targetCount = 0) {
    const pattern = getChallengeFlightPattern(config.sourceLevel || this.level, this.currentWaveIndex);
    const now = Date.now();
    this.challengeFlightState = {
      active: true,
      patternId: config.challengeFlightPatternId || pattern.id,
      patternLabel: config.challengeFlightPatternLabel || pattern.label,
      targetCount: Math.max(1, Math.floor(Number(targetCount || config.count) || 1)),
      kills: 0,
      escaped: 0,
      resolvedTargetIds: new Set(),
      startedAt: now,
      deadlineAt: now + CHALLENGE_FLIGHT_TARGET_WINDOW_MS,
      nextHudUpdateAt: now,
      completedAt: 0
    };
    this.game?.scenes?.play?.clearEnemyBullets?.('challenge_flight_start');
    this.game?.scenes?.play?.showChallengeFlightHud?.(this.getChallengeFlightDebugState());
    return this.challengeFlightState;
  }

  registerChallengeFlightTarget(enemy, { index = 0, entryDelayMs = 0, entryDurationMs = 0 } = {}) {
    const state = this.challengeFlightState;
    if (!state?.active || !enemy) return false;
    const safeIndex = Math.max(0, Math.floor(Number(index) || 0));
    enemy.challengeFlightTarget = true;
    enemy.challengeFlightResolved = false;
    enemy.challengeFlightTargetId = `${this.level}:${this.currentWaveIndex}:${safeIndex}`;
    enemy.challengeFlightPatternId = state.patternId;
    enemy.challengeFlightExitAt = Date.now() + Math.max(0, Number(entryDelayMs) || 0) + Math.max(600, Number(entryDurationMs) || 0) + CHALLENGE_FLIGHT_TARGET_WINDOW_MS;
    enemy.health = 1;
    enemy.maxHealth = 1;
    enemy.shootDelay = Number.MAX_SAFE_INTEGER;
    enemy.tacticalFireScalar = 0;
    if (enemy.sprite) {
      const reticle = new PIXI.Graphics();
      const radius = Math.max(23, (Number(enemy.radius) || 16) * 1.65);
      reticle.circle(0, 0, radius);
      reticle.stroke({ color: 0xffdf66, width: 2.5, alpha: 0.9 });
      reticle.circle(0, 0, radius + 7);
      reticle.stroke({ color: 0x7ee9ff, width: 1.4, alpha: 0.62 });
      for (let marker = 0; marker < 4; marker += 1) {
        const angle = marker * Math.PI / 2;
        reticle.moveTo(Math.cos(angle) * (radius + 3), Math.sin(angle) * (radius + 3));
        reticle.lineTo(Math.cos(angle) * (radius + 13), Math.sin(angle) * (radius + 13));
      }
      reticle.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
      reticle.label = 'challengeFlightTargetReticle';
      enemy.sprite.addChildAt(reticle, 0);
      enemy.ownedVisuals?.push(reticle);
      enemy.challengeFlightReticle = reticle;
    }
    enemy.updateHealthBar?.();
    state.deadlineAt = Math.max(state.deadlineAt, enemy.challengeFlightExitAt);
    return true;
  }

  resolveChallengeFlightTarget(enemy, outcome = 'kill') {
    const state = this.challengeFlightState;
    if (!state?.active || !enemy?.challengeFlightTarget || enemy.challengeFlightResolved) return false;
    const id = enemy.challengeFlightTargetId || `${this.level}:${this.currentWaveIndex}:unknown`;
    if (state.resolvedTargetIds.has(id)) return false;
    state.resolvedTargetIds.add(id);
    enemy.challengeFlightResolved = true;
    if (outcome === 'kill') state.kills += 1;
    else state.escaped += 1;
    this.game?.scenes?.play?.updateChallengeFlightHud?.(this.getChallengeFlightDebugState());
    return true;
  }

  recordChallengeFlightKill(enemy) {
    return this.resolveChallengeFlightTarget(enemy, 'kill');
  }

  expireChallengeFlightTarget(enemy, now = Date.now()) {
    if (!enemy?.challengeFlightTarget || enemy.challengeFlightResolved || !enemy.active) return false;
    if (now < (Number(enemy.challengeFlightExitAt) || Number.POSITIVE_INFINITY)) return false;
    this.resolveChallengeFlightTarget(enemy, 'escape');
    enemy.active = false;
    enemy.deactivateVisuals?.('challenge_flight_escape');
    return true;
  }

  finishChallengeFlight() {
    const state = this.challengeFlightState;
    if (!state?.active) return this.lastChallengeFlightResult;
    const unresolved = Math.max(0, state.targetCount - state.kills - state.escaped);
    state.escaped += unresolved;
    state.active = false;
    state.completedAt = Date.now();
    const performance = gradeChallengeFlight(state.kills, state.targetCount);
    const result = {
      ...performance,
      patternId: state.patternId,
      patternLabel: state.patternLabel,
      targetCount: state.targetCount,
      kills: state.kills,
      escaped: state.escaped,
      elapsedMs: Math.max(0, state.completedAt - state.startedAt),
      completedAt: state.completedAt
    };
    this.lastChallengeFlightResult = result;
    this.game?.scenes?.play?.clearChallengeFlightHud?.('complete');
    return result;
  }

  getChallengeFlightDebugState() {
    const state = this.challengeFlightState;
    if (!state) return this.lastChallengeFlightResult ? { active: false, lastResult: { ...this.lastChallengeFlightResult } } : null;
    return {
      active: Boolean(state.active),
      patternId: state.patternId,
      patternLabel: state.patternLabel,
      targetCount: state.targetCount,
      kills: state.kills,
      escaped: state.escaped,
      unresolved: Math.max(0, state.targetCount - state.kills - state.escaped),
      remainingMs: Math.max(0, state.deadlineAt - Date.now()),
      lastResult: this.lastChallengeFlightResult ? { ...this.lastChallengeFlightResult } : null
    };
  }

  applyDangerMidShipProfile(enemy, profile) {
    if (!enemy || !profile) return;
    enemy.kind = 'danger_mid_ship';
    enemy.dangerMidShipProfile = profile;
    enemy.health = Math.max(2, Math.ceil((enemy.health || 1) * (profile.healthScalar || 1.9)));
    enemy.maxHealth = enemy.health;
    enemy.scoreValue = Math.max(enemy.scoreValue || 10, Math.round((enemy.scoreValue || 40) * (profile.scoreScalar || 2.4)));
    enemy.speed = (enemy.speed || 1) * (profile.speedScalar || 1);
    enemy.shootDelay = Math.max(52, (enemy.shootDelay || 120) * (profile.fireDelayMult || 1.18));
    enemy.radius = Math.round((enemy.radius || 16) * (profile.radiusScalar || 1.1));
    enemy.color = profile.tint || enemy.color;
    enemy.tacticalFireScalar = (enemy.tacticalFireScalar || 1) * (profile.fireScalar || 0.48);
    enemy.tacticalProjectileSpeedScalar = (enemy.tacticalProjectileSpeedScalar || 1) * (profile.projectileSpeedScalar || 1);
    enemy.visualVariant = {
      ...(enemy.visualVariant || {}),
      slug: profile.id,
      tint: profile.tint || enemy.color,
      accent: profile.accent || profile.tint || enemy.color,
      scale: profile.spriteScale || 1.08,
      alpha: 0.28
    };
    if (enemy.body) {
      enemy.body.tint = profile.hullTint || 0xffffff;
    }
    if (enemy.sprite) {
      enemy.sprite.label = `enemy_visual:danger_mid_ship:${profile.id}`;
      const glow = new PIXI.Graphics();
      const radius = Math.max(24, enemy.radius * 2.2);
      glow.circle(0, 0, radius);
      glow.fill({ color: profile.accent || 0xffb84a, alpha: 0.14 });
      glow.circle(0, 0, radius * 0.62);
      glow.stroke({ color: profile.tint || 0xff5d7a, width: 3, alpha: 0.35 });
      glow.label = `dangerMidShipGlow:${profile.id}`;
      enemy.sprite.addChildAt(glow, 0);
      enemy.ownedVisuals?.push(glow);
    }
    enemy.updateHealthBar?.();
  }

  spawnWave(config) {
    this.markPerformance('wave_spawn.begin', {
      level: this.level,
      wave: this.currentWaveIndex + 1,
      total: this.normalWavesTotal,
      type: config?.type,
      count: config?.count
    });
    if (!config.allowConcurrentSpawn) {
      this.clearPendingWaveSpawns();
    }
    if (config.type === 'BOSS') {
      AudioManager.playVoice('mission_control_boss_inbound', { cooldownMs: 14000, duckMs: 1800, bypassGlobalCooldown: true });
      this.spawnBoss(this.level); // Fire and forget
      return;
    }

    this.resetWaveWatchdog();
    const { count, formation, type } = config;
    let normalWaveLevel = 1;
    let tactic = null;
    let positions = [];
    let threatPlan = null;
    this.measurePerformance('next_wave_spawn_planning', () => {
      normalWaveLevel = Math.max(1, Number(config.normalWaveDifficultyLevel) || this.getNormalWaveDifficultyLevel(this.level));
      this.currentNormalWaveDifficultyLevel = normalWaveLevel;
      tactic = { ...this.resolveWaveTactic(config) };
      positions = this.getFormationPositions(formation, count);
      if (config.isChallenge) {
        const height = this.game.getHeight();
        const safeTop = height < 720 ? 150 : 205;
        const safeBottom = height * 0.5;
        positions = positions.map((position, index) => ({
          ...position,
          y: Math.min(safeBottom, Math.max(position.y, safeTop + (index % 2) * (height < 720 ? 18 : 24)))
        }));
      }
      if (config.isMayhemReinforcement && Number(config.reinforcementGroupCount) > 1) {
        const laneOffset = Number(config.reinforcementLaneOffsetPx) || 0;
        const groupIndex = Math.max(0, Math.floor(Number(config.reinforcementGroupIndex) || 0));
        const yOffset = groupIndex % 2 === 0 ? -10 : 18;
        positions = positions.map((pos) => ({
          ...pos,
          x: Math.max(36, Math.min(this.game.getWidth() - 36, pos.x + laneOffset)),
          y: Math.max(56, pos.y + yOffset)
        }));
      }
      threatPlan = this.createThreatActionPlan({ count, formation, tactic, config, level: normalWaveLevel });
    });
    this.currentNormalWaveDifficultyLevel = normalWaveLevel;
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
    tactic = this.applyThreatPressureCompensation(tactic, threatPlan);
    tactic = this.applyNormalWavePressureToTactic(tactic);
    this.currentWaveTactic = tactic;
    const screenW = this.game.getWidth();
    if (config.isMayhemReinforcement) {
      this.game?.scenes?.play?.showMayhemReinforcementEntryBurst?.({
        groupIndex: Math.max(0, Math.floor(Number(config.reinforcementGroupIndex) || 0)),
        groupCount: Math.max(1, Math.floor(Number(config.reinforcementGroupCount) || 1)),
        laneOffsetPx: Number(config.reinforcementLaneOffsetPx) || 0,
        boss: config.isBossMayhemReinforcement === true,
        superStorm: config.isMayhemSuperStorm === true,
        delayMs: Math.max(0, Number(config.reinforcementEntryDelayMs) || 0)
      });
    }
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
    const openingMomentum = this.getOpeningMomentumTuning(config.sourceLevel);
    const delayStep = Math.max(55, ((diff.enemyEntryDelayBaseMs || 150) * openingMomentum.entryDelayMult) / cadence);
    const entryDurationMs = Math.max(760, (diff.enemyEntryDurationMs || 2000) * (tactic.entrySpeed || 1) * openingMomentum.entryDurationMult);
    if (config.isChallenge) this.beginChallengeFlight(config, count);
    const spawnChunkSize = config.isChallenge
      ? Math.max(1, positions.length)
      : Math.max(3, Math.min(6, Math.floor(Number(diff.enemyEntrySpawnChunkSize) || 4)));
    const spawnChunkDelayMs = Math.max(8, Math.min(24, Math.floor(Number(diff.enemyEntrySpawnChunkDelayMs) || 16)));
    const waveSpawnSerial = this.waveSpawnSerial;
    const allowBossReinforcementSpawn = config.isBossMayhemReinforcement === true;
    const dangerAssignments = new Map((Array.isArray(config.dangerMidShipIds) ? config.dangerMidShipIds : [])
      .map((entry) => [Number(entry.slot), getDangerMidShipProfile(entry.id)])
      .filter((entry) => Number.isFinite(entry[0]) && entry[1]));
    this.spawning = this.spawning || positions.length > 0;
    this.waveSpawnPendingCount = Math.max(0, Number(this.waveSpawnPendingCount) || 0) + positions.length;

    const markWaveSpawnDone = () => {
      this.waveSpawnPendingCount = Math.max(0, (Number(this.waveSpawnPendingCount) || 0) - 1);
      if (this.waveSpawnPendingCount <= 0) {
        this.waveSpawnPendingCount = 0;
        this.spawning = false;
      }
    };

    const spawnEnemyAtSlot = (pos, i, scheduledDelayMs = 0) => {
      const validState = this.state === 'WAVE_ACTIVE' || (allowBossReinforcementSpawn && this.state === 'BOSS_ACTIVE');
      if (this.waveSpawnSerial !== waveSpawnSerial || !validState) {
        markWaveSpawnDone();
        return;
      }
      this.measurePerformance('enemy_batch_creation', () => {
        const startX = this.getWaveEntryX(config.entry || 'single', i, startLeft, screenW);
        const dangerProfile = dangerAssignments.get(i);
        const dangerMidType = dangerProfile && Number.isFinite(dangerProfile.spriteIndex)
          ? getGeneratedEnemyTypeForSpriteIndex(dangerProfile.spriteIndex)
          : null;
        const enemyType = dangerMidType || type;
        const enemy = this.measurePerformance('enemy_generation.create_enemy', () => new Enemy(startX, -100, enemyType, normalWaveLevel, this.game, waveColor));
        if (config.isChallenge && enemy.kind === 'bonus_drone') {
          enemy.kind = 'enemy';
        }
        if (config.isMayhemReinforcement) {
          enemy.isMayhemReinforcement = true;
          enemy.reinforcementGroupIndex = Math.max(0, Math.floor(Number(config.reinforcementGroupIndex) || 0));
          enemy.reinforcementGroupCount = Math.max(1, Math.floor(Number(config.reinforcementGroupCount) || 1));
          enemy.isMayhemSuperStorm = config.isMayhemSuperStorm === true;
          enemy.isReinforcementSwarmEntry = enemy.reinforcementGroupCount > 1;
          const scoreMultiplier = Math.max(1, Number(config.reinforcementScoreMultiplier) || 1);
          if (scoreMultiplier > 1) {
            enemy.scoreValue = Math.max(1, Math.round((enemy.scoreValue || 0) * scoreMultiplier));
            enemy.mayhemReinforcementScoreMultiplier = scoreMultiplier;
          }
        }
        if (config.isBossMayhemReinforcement) {
          enemy.kind = 'boss_mayhem_reinforcement';
          enemy.isBossMayhemReinforcement = true;
        }
        const lanePressure = this.getLanePressureForPosition(pos.x, formation);
        const enemyTactic = this.applyLanePressureToTactic(tactic, lanePressure);
        this.applyModifier(enemy);
        if (config.isChallenge) {
          enemy.kind = 'enemy';
          enemy.health = 1;
          enemy.maxHealth = 1;
          enemy.shootDelay = Number.MAX_SAFE_INTEGER;
          enemy.tacticalFireScalar = 0;
        }
        if (dangerProfile) {
          this.applyDangerMidShipProfile(enemy, dangerProfile);
        }
        const resolvedEnemyTactic = dangerProfile
          ? {
              ...enemyTactic,
              move: dangerProfile.move || enemyTactic.move,
              shot: dangerProfile.shot || enemyTactic.shot,
              fireScalar: (enemyTactic.fireScalar || 1) * (dangerProfile.fireScalar || 1),
              fireDelayMult: (enemyTactic.fireDelayMult || 1) * (dangerProfile.fireDelayMult || 1),
              projectileSpeedScalar: (enemyTactic.projectileSpeedScalar || 1) * (dangerProfile.projectileSpeedScalar || 1)
            }
          : enemyTactic;
        enemy.applyWaveTactic?.(resolvedEnemyTactic, {
          index: i,
          count,
          formation,
          centerX: center.x || screenW / 2,
          centerY: center.y || 128,
          side: pos.x < screenW / 2 ? -1 : 1,
          combatBounds
        });
        const threatAction = config.isChallenge ? null : (threatPlan.assignmentBySlot.get(i) || null);
        if (threatAction && !dangerProfile) {
          enemy.applyThreatAction?.(threatAction, {
            index: i,
            waveIndex: this.currentWaveIndex,
            count,
            initialDelayMult: config.threatStartDelayMult,
            initialDelayMs: config.threatStartDelayMs
          });
        }
        if (!config.isChallenge) {
          this.game?.scenes?.play?.maybePromoteAceEnemy?.(enemy, {
            sector: this.level,
            waveIndex: this.currentWaveIndex,
            slotIndex: i,
            count
          });
          this.game?.scenes?.play?.maybeApplyRivalWingEnemy?.(enemy, {
            sector: this.level,
            waveIndex: this.currentWaveIndex,
            slotIndex: i,
            count
          });
        }
        if (enemyTactic.forcedDive) {
          enemy.tacticalDiveAt = Date.now() + entryDurationMs + i * (enemyTactic.id === 'dive_chain' ? 260 : 190) + 520;
        }
        const entryDelayMs = Math.max(0, i * delayStep - scheduledDelayMs + (Number(config.reinforcementEntryDelayMs) || 0));
        const resolvedEntryDurationMs = entryDurationMs * Math.max(0.6, Math.min(1.2, Number(enemy.nemesisOpeningEntryDurationMult) || 1));
        enemy.startEntry(startX, -50, pos.x, pos.y, resolvedEntryDurationMs, entryDelayMs);
        if (config.isChallenge) {
          this.registerChallengeFlightTarget(enemy, {
            index: i,
            entryDelayMs,
            entryDurationMs: resolvedEntryDurationMs
          });
        }
        this.enemies.push(enemy);
        this.container.addChild(enemy.sprite);
        markWaveSpawnDone();
      });
    };

    positions.forEach((pos, i) => {
      const scheduledDelayMs = Math.floor(i / spawnChunkSize) * spawnChunkDelayMs;
      if (scheduledDelayMs <= 0) {
        spawnEnemyAtSlot(pos, i, 0);
        return;
      }

      const timer = setTimeout(() => {
        this.waveSpawnTimers = this.waveSpawnTimers.filter((pendingTimer) => pendingTimer !== timer);
        spawnEnemyAtSlot(pos, i, scheduledDelayMs);
      }, scheduledDelayMs);
      this.waveSpawnTimers.push(timer);
    });
    if (!config.isChallenge) {
      this.maybeSpawnRareChaosVisitor(config, {
        tactic,
        formation,
        normalWaveLevel,
        combatBounds,
        waveColor,
        entryDurationMs
      });
    }
    if (!config.isChallenge && config.eliteMiddleShipId) {
      this.markPerformance('elite_signal_start', { id: config.eliteMiddleShipId, level: this.level });
      this.measurePerformance('elite_signal_start', () => this.spawnEliteMiddleShip(config.eliteMiddleShipId, {
        formation,
        tactic,
        waveColor,
        entry: config.entry || 'single',
        normalWaveDifficultyLevel: normalWaveLevel,
        delayMs: Math.min(900, Math.max(180, positions.length * delayStep * 0.28)),
        healthScalar: Number.isFinite(Number(config.eliteHealthScalar)) ? Number(config.eliteHealthScalar) : undefined,
        fireDelayMult: Number.isFinite(Number(config.eliteFireDelayMult)) ? Number(config.eliteFireDelayMult) : undefined,
        specialDelayMs: Number.isFinite(Number(config.eliteSpecialDelayMs)) ? Number(config.eliteSpecialDelayMs) : undefined
      }));
    }
    if (!config.isChallenge && multiEliteIds.length) {
      this.markPerformance('elite_signal_start', { ids: multiEliteIds, level: this.level });
      this.measurePerformance('elite_signal_start', () => this.spawnMultiEliteMiddleShips(multiEliteIds, {
        formation,
        tactic,
        waveColor,
        entry: 'split',
        normalWaveDifficultyLevel: normalWaveLevel,
        compensation: multiEliteCompensation
      }));
    }
    if (positions.length > 1) {
      const xs = positions.map((pos) => pos.x);
      const span = Math.max(...xs) - Math.min(...xs);
      console.log(`[FormationWidth] level=${this.level} wave=${this.currentWaveIndex + 1}/${this.normalWavesTotal} formation=${formation} count=${count} spanPct=${(span / screenW).toFixed(2)} policy=engagement_band`);
    }
    const runDiscoveryHooks = () => {
      if (this.waveSpawnSerial !== waveSpawnSerial || this.game?.currentScene !== this.game?.scenes?.play) return;
      this.measurePerformance('wave_spawn.discovery_hooks', () => {
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
        dangerAssignments.forEach((profile) => {
          playScene?.recordThreatDiscovery?.(profile.id, 'enemies', {
            name: profile.displayName,
            role: profile.role,
            movementStyle: profile.move,
            fireStyle: profile.shot,
            rarity: profile.tier,
            sector: this.level,
            waveIndex: this.currentWaveIndex || 0
          });
        });
        threatPlan.assignedIds.forEach((actionId) => {
          const action = getEnemyThreatAction(actionId);
          playScene?.recordThreatDiscovery?.(actionId, 'attackPatterns', {
            name: action?.label || actionId,
            role: action?.description || 'special attack',
            sector: this.level
          });
        });
      });
    };
    if (!config.isChallenge) {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(runDiscoveryHooks);
      } else {
        setTimeout(runDiscoveryHooks, 0);
      }
    }
    console.log(`[WaveTactic] level=${this.level} wave=${this.currentWaveIndex + 1}/${this.normalWavesTotal} tactic=${tactic.id} formation=${formation} count=${count} threats=${threatPlan.assignedIds.join(',') || 'none'}`);
  }

  getRareChaosVisitorWaveKey(level = this.level, waveIndex = this.currentWaveIndex) {
    return `${Math.max(1, Math.floor(Number(level) || 1))}:${Math.max(0, Math.floor(Number(waveIndex) || 0))}`;
  }

  maybeSpawnRareChaosVisitor(config = {}, context = {}) {
    const seed = this.game?.contentDirector?.seed || this.game?.gameId || 'nova-swarm';
    const plan = planRareChaosVisitorSpawn({ seed, level: this.level, waveIndex: this.currentWaveIndex, config });
    this.rareChaosVisitorStats.lastPlan = {
      eligible: plan.eligible,
      chance: plan.chance,
      roll: plan.roll,
      shouldSpawn: plan.shouldSpawn,
      variantId: plan.variant?.id || null,
      level: this.level,
      waveIndex: this.currentWaveIndex
    };
    if (plan.eligible) this.rareChaosVisitorStats.eligibleWaves += 1;
    if (!plan.shouldSpawn) return null;
    return this.spawnRareChaosVisitor(plan.variant, { ...context, source: 'rare_wave_roll', plan });
  }

  spawnRareChaosVisitor(variantOrNumber = 1, context = {}) {
    const variant = typeof variantOrNumber === 'object' ? variantOrNumber : getRareChaosVisitorVariant(variantOrNumber);
    if (!variant || this.phase !== 'WAVES' || this.state === 'BOSS_ACTIVE') return null;
    const waveKey = this.getRareChaosVisitorWaveKey();
    if (!context.force && this.rareChaosVisitorSpawnedWaveKeys.has(waveKey)) return null;
    if (this.enemies.some((enemy) => enemy?.active && enemy.isRareChaosVisitor)) return null;

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const fromLeft = variant.number % 2 === 0;
    const startX = fromLeft ? 30 : width - 30;
    const sideLane = fromLeft ? 0.34 : 0.66;
    const formationX = Math.max(width * 0.28, Math.min(width * 0.72, width * (sideLane + ((variant.number % 3) - 1) * 0.03)));
    const formationY = Math.max(210, Math.min(height * 0.36, 228 + (variant.number % 4) * 18));
    const enemy = new Enemy(startX, -120, variant.enemyType, Math.max(1, Number(context.normalWaveLevel) || this.level), this.game, context.waveColor || 'Red');
    enemy.applyRareChaosVisitor?.(variant);
    enemy.applyWaveTactic?.({
      id: `rare_${variant.weaponId}`,
      label: variant.loadoutName,
      move: variant.move,
      shot: variant.shot,
      volley: variant.shot === 'fan' ? 'pulse' : 'staggered',
      fireScalar: variant.fireScalar,
      fireDelayMult: variant.fireDelayMult,
      projectileSpeedScalar: variant.projectileSpeedScalar,
      diveBias: 0.28,
      entrySpeed: 0.76
    }, {
      index: 0,
      count: 1,
      formation: context.formation || 'RARE_CONTACT',
      centerX: formationX,
      centerY: formationY,
      side: formationX < width / 2 ? -1 : 1,
      combatBounds: context.combatBounds || { minX: width * 0.12, maxX: width * 0.88 }
    });
    enemy.applyThreatAction?.(getEnemyThreatAction(variant.threatActionId), {
      index: 0,
      waveIndex: this.currentWaveIndex,
      count: 1,
      initialDelayMult: 0.58,
      initialDelayMs: 760
    });
    enemy.threatActionCooldown = Math.min(enemy.threatActionCooldown || 4400, 4400);
    enemy.startEntry(startX, -90, formationX, formationY, Math.max(1180, Number(context.entryDurationMs) * 0.8 || 1380), 260);
    this.enemies.push(enemy);
    this.container.addChild(enemy.sprite);
    this.rareChaosVisitorSpawnedWaveKeys.add(waveKey);
    this.rareChaosVisitorStats.spawned += 1;
    this.rareChaosVisitorStats.lastSpawn = {
      id: variant.id,
      number: variant.number,
      level: this.level,
      waveIndex: this.currentWaveIndex,
      source: context.source || 'unknown'
    };
    this.game?.scenes?.play?.announceRareChaosVisitor?.(enemy, context.plan || null);
    console.log(`[RareChaosVisitor] spawned id=${variant.id} number=${variant.number} level=${this.level} wave=${this.currentWaveIndex + 1} source=${context.source || 'unknown'}`);
    return enemy;
  }

  debugForceRareChaosVisitor(variantNumber = 1, source = 'console') {
    const variant = getRareChaosVisitorVariant(variantNumber) || getRareChaosVisitorVariant(1);
    const enemy = this.spawnRareChaosVisitor(variant, {
      force: true,
      source: `debug_${source}`,
      formation: 'RARE_CONTACT',
      normalWaveLevel: this.currentNormalWaveDifficultyLevel || this.level,
      waveColor: 'Red',
      entryDurationMs: 1080
    });
    return enemy?.getRareChaosVisitorDebugState?.() || null;
  }

  createThreatActionPlan({ count, formation, tactic, config, level = this.getNormalWaveDifficultyLevel(this.level) } = {}) {
    const result = pickThreatActionsForWave({
      level,
      formation,
      tactic,
      waveIndex: this.currentWaveIndex || 0,
      count,
      threatBudgetModifiers: config?.threatBudgetModifiers || {}
    });
    const assignments = this.applyForcedThreatActions(result.assignments || [], {
      count,
      maxAssignments: result.budget?.plannedActions || count || 0,
      forcedThreatActionIds: config?.forcedThreatActionIds || [],
      level
    });
    const assignmentBySlot = new Map();
    const assignedIds = [];
    for (const assignment of assignments) {
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
      level,
      waveIndex: this.currentWaveIndex || 0,
      formation,
      tacticId: tactic?.id || config?.tactic || null
    };
    return {
      budget: result.budget,
      assignments,
      assignmentBySlot,
      assignedIds
    };
  }

  applyForcedThreatActions(assignments = [], { count = 0, maxAssignments = 0, forcedThreatActionIds = [], level: actionLevel = this.getNormalWaveDifficultyLevel(this.level) } = {}) {
    const forcedIds = Array.isArray(forcedThreatActionIds)
      ? forcedThreatActionIds.filter(Boolean)
      : [];
    if (!forcedIds.length) return assignments;

    const level = Math.max(1, Number(this.level) || 1);
    const limit = Math.max(1, Math.min(Math.max(1, count || assignments.length || forcedIds.length), maxAssignments || forcedIds.length));
    const next = assignments.slice(0, limit).map((assignment) => ({ ...assignment }));
    const preferredSlots = [
      Math.floor((count || 1) * 0.24),
      Math.floor((count || 1) * 0.76),
      Math.floor((count || 1) * 0.5),
      0,
      Math.max(0, (count || 1) - 1)
    ];

    forcedIds.forEach((actionId, index) => {
      const action = getEnemyThreatAction(actionId);
      if (!action || (Number(action.minLevel) || 1) > level) return;

      const usedSlots = new Set(next.map((assignment) => assignment.slot));
      let slot = preferredSlots.find((candidate) =>
        Number.isFinite(candidate) &&
        candidate >= 0 &&
        candidate < Math.max(1, count || 1) &&
        !usedSlots.has(candidate)
      );
      if (!Number.isFinite(slot)) {
        slot = index % Math.max(1, count || 1);
      }

      const forced = { slot, actionId: action.id, forced: true };
      const existingIndex = next.findIndex((assignment) => assignment.actionId === action.id);
      if (existingIndex >= 0) {
        next[existingIndex] = forced;
        return;
      }
      if (next.length < limit) {
        next.push(forced);
        return;
      }

      const slotIndex = next.findIndex((assignment) => assignment.slot === slot);
      next[slotIndex >= 0 ? slotIndex : index % next.length] = forced;
    });

    return next
      .filter((assignment, index, all) =>
        all.findIndex((candidate) => candidate.slot === assignment.slot) === index
      )
      .sort((a, b) => a.slot - b.slot);
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

  applyNormalWavePressureToTactic(tactic = {}) {
    const pressureTuning = getNormalWavePressureTuning(this.currentNormalWaveDifficultyLevel || this.getNormalWaveDifficultyLevel(this.level));
    const openingMomentum = this.getOpeningMomentumTuning();
    return {
      ...tactic,
      fireScalar: (tactic.fireScalar || 1) * (pressureTuning.tacticFireMult || 1),
      fireDelayMult: (tactic.fireDelayMult || 1) * (pressureTuning.tacticFireDelayMult || 1),
      diveBias: (tactic.diveBias || 1) * (pressureTuning.diveBiasMult || 1) * openingMomentum.diveBiasMult,
      entrySpeed: (tactic.entrySpeed || 1) * (pressureTuning.entrySpeedMult || 1),
      normalWavePressureBand: pressureTuning.id
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
    const spawnLevel = Math.max(1, Number(context.normalWaveDifficultyLevel) || Number(this.level) || 1);
    if (!marketingDebug && !context.ignoreLevelGate && spawnLevel < profile.minLevel) return null;

    const activeElites = this.enemies.filter(enemy =>
      enemy?.kind === 'elite_middle_ship' && (enemy.active !== false || enemy.waitingForEntry)
    ).length;
    const maxActive = getEliteMiddleShipMaxActive(spawnLevel);
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
    const enemy = new Enemy(startX, -124, profile.id, spawnLevel, this.game, context.waveColor || 'Black');
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
    playScene?.showSpecialEnemySignal?.({
      title: translateText('ELITE ARRIVAL'),
      message: `${profile.displayName}\n${translateText('ARRIVAL GUARD ACTIVE')}`,
      type: 'elite_middle_ship',
      priority: 4,
      duration: 1450,
      accent: profile.accent || 0xffd166
    });
    console.log(`[EliteMiddleShipSpawn] level=${this.level} wave=${this.currentWaveIndex + 1}/${this.normalWavesTotal} id=${profile.id} role=${profile.role} marketing=${marketingDebug}`);
    return enemy;
  }

  spawnMultiEliteMiddleShips(profileIds, context = {}) {
    const ids = Array.isArray(profileIds) ? profileIds.filter(Boolean) : [];
    if (ids.length < 2) return [];

    const screenW = this.game.getWidth();
    const screenH = this.game.getHeight();
    const level = Math.max(1, Number(context.normalWaveDifficultyLevel) || Number(this.level) || 1);
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
        normalWaveDifficultyLevel: level,
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
      playScene?.showSpecialEnemySignal?.({
        title: translateText('ELITE ARRIVAL'),
        message: `${translateText(spawned.length >= 3 ? 'ELITE TRIO INBOUND!' : 'ELITE DUO INBOUND!')}\n${translateText('ARRIVAL GUARD ACTIVE')}`,
        type: 'elite_middle_ship',
        priority: 4,
        duration: 1550,
        accent: 0xffd166
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
      this.bossReinforcementState = null;
      this.bossReinforcementAttemptIndex = 0;
      this.bossReinforcementEventsThisBoss = 0;
      this.bossReinforcementNextCheckAtMs = Date.now() + 1200;
      this.bossReinforcementCooldownUntilMs = 0;
      this.bossFuelEightShipSwarmPlanned = level >= BOSS_FUEL_EIGHT_SHIP_SWARM_MIN_LEVEL
        && Math.random() < BOSS_FUEL_EIGHT_SHIP_SWARM_CHANCE;
      this.bossFuelEightShipSwarmTriggered = false;
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
      const descriptor = boss.profile?.title
        || (playScene.getBossTauntCaption ? playScene.getBossTauntCaption('boss_spawn') : getMicroMessage('bossIntro'));
      playScene.showBossIntro(boss.name, descriptor);
    }
    if (!marketingDebug) {
      AudioManager.playMusicContext('boss', { resetPlaylist: true });
    } else {
      AudioManager.playSfx('boss_reveal_stinger', { force: true, volume: 0.72, minIntervalMs: 0 });
    }
    if (!marketingDebug && playScene && playScene.bulletManager) {
      const bm = playScene.bulletManager;
      bm.clearAll?.('boss_spawn');
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

  getBossFuelShipMaxEvents(level = this.level) {
    return this.bossFuelEightShipSwarmPlanned
      ? BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE
      : BOSS_FUEL_ORDINARY_EVENT_BUDGET;
  }

  getBossFuelShipSupportCount(level = this.level, random = Math.random) {
    const spawned = Math.max(0, Math.floor(Number(this.bossFuelShipsSpawnedThisBoss) || 0));
    const maxEvents = Math.max(0, Math.floor(Number(this.getBossFuelShipMaxEvents?.(level)) || BOSS_FUEL_MAX_ACTIVE_SUPPORT_SHIPS));
    const active = Math.max(0, Math.floor(Number(this.getActiveBossFuelShips?.().length) || 0));
    const activeCap = this.bossFuelEightShipSwarmPlanned
      ? BOSS_FUEL_MAX_ACTIVE_SUPPORT_SHIPS
      : BOSS_FUEL_ORDINARY_EVENT_BUDGET;
    const remaining = Math.max(0, Math.min(maxEvents - spawned, activeCap - active));
    if (remaining <= 0) return 0;

    if (this.bossFuelEightShipSwarmPlanned && !this.bossFuelEightShipSwarmTriggered && spawned === 0) {
      return Math.min(remaining, BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE);
    }

    const roll = typeof random === 'function' ? random() : Math.random();
    let desired = 1;
    if (roll < BOSS_FUEL_SIX_SUPPORT_ROLL) desired = 6;
    else if (roll < BOSS_FUEL_FIVE_SUPPORT_ROLL) desired = 5;
    else if (roll < BOSS_FUEL_FOUR_SUPPORT_ROLL) desired = 4;
    else if (roll < BOSS_FUEL_TRIPLE_SUPPORT_ROLL) desired = 3;
    else if (roll < BOSS_FUEL_DOUBLE_SUPPORT_ROLL) desired = 2;
    return Math.max(1, Math.min(remaining, desired));
  }

  getActiveBossFuelShips() {
    return this.enemies.filter((enemy) =>
      enemy?.kind === 'boss_fuel_ship' && (enemy.active || enemy.waitingForEntry)
    );
  }

  maybeSpawnBossFuelShip() {
    if (this.state !== 'BOSS_ACTIVE' || !this.boss?.active || this.bossDefeatedThisLevel) return;
    const level = Math.max(1, Number(this.level) || 1);
    const maxEvents = this.getBossFuelShipMaxEvents(level);
    if (this.bossFuelShipsSpawnedThisBoss >= maxEvents) return;
    const now = Date.now();
    const armorBleedActive = Boolean(this.boss?.isFinishPacingActive?.(now));
    const supportDelayMs = armorBleedActive ? BOSS_FUEL_ARMOR_BLEED_DELAY_MS : BOSS_FUEL_DEFAULT_DELAY_MS;
    if (now < (this.bossSpawnedAtMs || this.boss.spawnedAtMs || now) + supportDelayMs) return;
    if (now < this.bossFuelShipCooldownUntilMs || now < this.bossFuelShipNextCheckAtMs) return;
    this.bossFuelShipNextCheckAtMs = now + 2800 + Math.random() * 1800;

    const healthRatio = this.boss.health / Math.max(1, this.boss.maxHealth || 1);
    if (healthRatio > 0.86 || healthRatio <= 0.025) return;
    if (this.getActiveBossFuelShips().length >= BOSS_FUEL_MAX_ACTIVE_SUPPORT_SHIPS) return;

    const playScene = this.game?.scenes?.play;
    const activeBullets = playScene?.bulletManager?.enemyBullets?.filter((bullet) => bullet?.active !== false).length || 0;
    if (activeBullets > (level <= 6 ? 18 : 28)) return;

    const guaranteedFirstSupport = this.bossFuelShipsSpawnedThisBoss === 0 && (healthRatio <= 0.82 || armorBleedActive);
    const chance = guaranteedFirstSupport ? 1 : armorBleedActive ? 0.48 : level <= 3 ? 0.2 : level <= 9 ? 0.28 : 0.34;
    if (Math.random() > chance) return;
    const supportCount = this.getBossFuelShipSupportCount(level);
    if (supportCount <= 0) return;
    const spawnedCount = this.spawnBossFuelShipSquad(supportCount);
    if (spawnedCount > 0) {
      if (supportCount === BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE) {
        this.bossFuelEightShipSwarmTriggered = true;
        playScene?.showMayhemReinforcementStormWarning?.({
          groupCount: spawnedCount,
          boss: true,
          superStorm: true
        });
        AudioManager.playVoice(MAYHEM_SUPER_STORM_WARNING_SOUND_ID, {
          force: true,
          cooldownMs: 0,
          duckMs: 2400
        });
      }
      this.bossFuelShipsSpawnedThisBoss += spawnedCount;
      this.bossFuelShipCooldownUntilMs = now + (level <= 5 ? 17500 : 13500) + Math.random() * 4500;
    }
  }

  spawnBossFuelShipSquad(count = 1) {
    const desiredCount = Math.max(1, Math.min(BOSS_FUEL_MAX_ACTIVE_SUPPORT_SHIPS, Math.floor(Number(count) || 1)));
    const baseEventIndex = Math.max(0, Math.floor(Number(this.bossFuelShipsSpawnedThisBoss) || 0));
    const formationFlip = Math.random() < 0.5 ? -1 : 1;
    let spawned = 0;
    for (let slot = 0; slot < desiredCount; slot += 1) {
      if (this.spawnBossFuelShip({
        eventIndex: baseEventIndex + slot,
        groupSize: desiredCount,
        groupSlot: slot,
        formationFlip
      })) {
        spawned += 1;
      }
    }
    return spawned;
  }

  spawnBossFuelShip(options = {}) {
    if (!this.boss?.active) return false;
    const level = Math.max(1, Number(this.level) || 1);
    const eventIndex = Math.max(0, Math.floor(Number(options.eventIndex ?? this.bossFuelShipsSpawnedThisBoss) || 0));
    const groupSize = Math.max(1, Math.min(BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE, Math.floor(Number(options.groupSize) || 1)));
    const groupSlot = Math.max(0, Math.min(groupSize - 1, Math.floor(Number(options.groupSlot) || 0)));
    const slotOffset = groupSlot - (groupSize - 1) / 2;
    const formationFlip = Number(options.formationFlip) === -1 ? -1 : 1;
    const supportProfile = pickBossSupportShipProfile(
      level,
      getBossSupportShipEventSeed(level, eventIndex)
    );
    const armorBleedActive = Boolean(this.boss?.isFinishPacingActive?.());
    const screenW = this.game.getWidth();
    const side = groupSize === 1
      ? (Math.random() < 0.5 ? -1 : 1)
      : (groupSlot % 2 === 0 ? formationFlip : -formationFlip);
    const startLeft = side < 0;
    const startX = startLeft ? -46 : screenW + 46;
    const flankSpacing = 158 + Math.abs(slotOffset) * 42;
    const targetX = Math.max(58, Math.min(screenW - 58, this.boss.x + side * flankSpacing + slotOffset * 28));
    const targetY = Math.max(90, Math.min(this.game.getHeight() * 0.35, (this.boss.y || 150) + 20 + Math.abs(slotOffset) * 30));
    const type = getGeneratedEnemyTypeForSpriteIndex(supportProfile.spriteIndex) ||
      pickGeneratedEnemyTypeForLevel(Math.max(1, Math.min(level, 18)));
    const enemy = new Enemy(startX, -96, type, level, this.game, 'Green');
    enemy.kind = 'boss_fuel_ship';
    enemy.bossSupportShipProfile = supportProfile;
    enemy.isMayhemReinforcement = groupSize > 1;
    enemy.reinforcementGroupIndex = groupSlot;
    enemy.reinforcementGroupCount = groupSize;
    enemy.isMayhemSuperStorm = groupSize >= BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE;
    enemy.isReinforcementSwarmEntry = groupSize > 1;
    const singleSupportHealMultiplier = groupSize === 1 ? BOSS_FUEL_SINGLE_SUPPORT_HEAL_MULT : 1;
    const swarmHealMultiplier = groupSize >= BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE ? 0.3 : 1;
    const baseHealCap = level <= 4 ? 0.075 : 0.09;
    const baseHealPercent = supportProfile.healPercent + Math.min(0.016, level * 0.0015);
    enemy.bossFuelProfile = {
      id: supportProfile.id,
      displayName: supportProfile.displayName,
      healPercent: Math.min(baseHealCap * singleSupportHealMultiplier, baseHealPercent * singleSupportHealMultiplier) * swarmHealMultiplier,
      baseHealPercent: Math.min(baseHealCap, baseHealPercent),
      singleSupportHealMultiplier,
      swarmHealMultiplier,
      speed: supportProfile.speed + Math.min(0.28, level * 0.01) + (armorBleedActive ? BOSS_FUEL_ARMOR_BLEED_SPEED_BONUS : 0),
      groupSize,
      groupSlot,
      eventIndex,
      beamStyle: supportProfile.beamStyle,
      deliveryFx: supportProfile.deliveryFx
    };
    enemy.health = Math.max(2, Math.min(5, supportProfile.health + (level >= 10 && supportProfile.health < 4 ? 1 : 0)));
    enemy.maxHealth = enemy.health;
    enemy.scoreValue = supportProfile.scoreValue;
    enemy.shootDelay = 999999;
    enemy.radius = supportProfile.radius;
    enemy.color = supportProfile.tint;
    enemy.visualVariant = {
      ...(enemy.visualVariant || {}),
      slug: supportProfile.id,
      tint: supportProfile.tint,
      accent: supportProfile.accent,
      scale: supportProfile.spriteScale,
      alpha: 0.34
    };
    if (enemy.body) {
      enemy.body.tint = 0xffffff;
      enemy.body.scale.set(enemy.body.scale.x * supportProfile.spriteScale, enemy.body.scale.y * supportProfile.spriteScale);
    }
    if (enemy.sprite) {
      enemy.sprite.label = `enemy_visual:${supportProfile.id}`;
      const halo = new PIXI.Graphics();
      const haloRadius = enemy.radius * supportProfile.haloScale;
      const outerRadius = enemy.radius * (2.1 + supportProfile.haloScale * 0.24 + (groupSize - 1) * 0.08);
      halo.circle(0, 0, outerRadius);
      halo.fill({ color: supportProfile.tint, alpha: 0.14 });
      halo.circle(0, 0, haloRadius);
      halo.stroke({ color: supportProfile.accent, width: 3, alpha: 0.56 });
      halo.circle(0, 0, haloRadius * 0.58);
      halo.stroke({ color: 0xffffff, width: 1.2, alpha: 0.32 });

      const spokeCount = supportProfile.glyph === 'spark' ? 10 : supportProfile.glyph === 'brackets' ? 4 : 6;
      for (let i = 0; i < spokeCount; i += 1) {
        const a = (Math.PI * 2 * i) / spokeCount + groupSlot * 0.38;
        const inner = haloRadius * 0.72;
        const outer = haloRadius * (supportProfile.glyph === 'chevron' ? 1.32 : 1.14);
        halo.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        halo.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      }
      halo.stroke({ color: supportProfile.glyph === 'spark' ? 0xffffff : supportProfile.accent, width: 1.5, alpha: 0.38 });

      if (supportProfile.glyph === 'cross') {
        halo.moveTo(-haloRadius * 0.34, 0);
        halo.lineTo(haloRadius * 0.34, 0);
        halo.moveTo(0, -haloRadius * 0.34);
        halo.lineTo(0, haloRadius * 0.34);
        halo.stroke({ color: 0xffffff, width: 2.4, alpha: 0.58 });
      } else if (supportProfile.glyph === 'brackets') {
        for (const sideX of [-1, 1]) {
          halo.moveTo(sideX * haloRadius * 0.46, -haloRadius * 0.36);
          halo.lineTo(sideX * haloRadius * 0.62, -haloRadius * 0.36);
          halo.lineTo(sideX * haloRadius * 0.62, haloRadius * 0.36);
          halo.lineTo(sideX * haloRadius * 0.46, haloRadius * 0.36);
        }
        halo.stroke({ color: 0xffffff, width: 1.8, alpha: 0.5 });
      } else if (supportProfile.glyph === 'cells') {
        for (let i = 0; i < 3; i += 1) {
          halo.circle((i - 1) * haloRadius * 0.23, 0, haloRadius * 0.1);
        }
        halo.fill({ color: supportProfile.accent, alpha: 0.5 });
      } else if (supportProfile.glyph === 'tow') {
        halo.moveTo(-haloRadius * 0.42, -haloRadius * 0.1);
        halo.lineTo(0, haloRadius * 0.2);
        halo.lineTo(haloRadius * 0.42, -haloRadius * 0.1);
        halo.stroke({ color: 0xffffff, width: 2, alpha: 0.52 });
      } else {
        halo.circle(0, 0, haloRadius * 0.2);
        halo.fill({ color: supportProfile.accent, alpha: 0.46 });
      }
      halo.label = 'bossFuelShipHalo';
      enemy.sprite.addChildAt(halo, 0);
      enemy.ownedVisuals?.push(halo);
    }
    enemy.updateHealthBar?.();
    enemy.applyWaveTactic?.({
      id: 'boss_fuel_ship',
      move: 'pulse',
      shot: 'needle',
      fireScalar: 0,
      fireDelayMult: 99,
      diveBias: 0,
      entrySpeed: 0.86 + Math.min(0.16, supportProfile.speed * 0.04)
    }, {
      index: 0,
      count: 1,
      formation: 'BOSS_FUEL',
      centerX: targetX + supportProfile.routeDrift * 22,
      centerY: targetY,
      side: startLeft ? -1 : 1
    });
    if (groupSize > 1) {
      this.game?.scenes?.play?.showMayhemReinforcementEntryBurst?.({
        groupIndex: groupSlot,
        groupCount: groupSize,
        boss: true,
        superStorm: groupSize >= BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE,
        delayMs: groupSlot * (groupSize >= BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE ? 70 : 95)
      });
    }
    enemy.startEntry(startX, -70, targetX + supportProfile.routeDrift * 26, targetY, supportProfile.entryMs, 0);
    this.enemies.push(enemy);
    this.container.addChild(enemy.sprite);
    this.attachBossFuelTether(enemy);
    this.game?.scenes?.play?.recordThreatDiscovery?.(supportProfile.id, 'enemies', {
      name: supportProfile.displayName,
      role: translateText('Boss support'),
      movementStyle: translateText('intercept run'),
      fireStyle: translateText('unarmed'),
      rarity: translateText('Boss Support'),
      sector: level
    });
    this.game?.scenes?.play?.recordThreatDiscovery?.('boss_fuel_ship', 'enemies', {
      name: translateText('Boss Fuel Ship'),
      role: translateText('Boss healer'),
      movementStyle: translateText('intercept run'),
      fireStyle: translateText('unarmed'),
      rarity: translateText('Boss Support'),
      sector: level
    });
    if (groupSlot === 0) {
      this.game?.scenes?.play?.showToast?.(translateText('FUEL SHIP INBOUND'), {
        fontSize: this.game.getWidth() < 1100 || this.game.getHeight() < 700 ? 15 : 18,
        fill: `#${supportProfile.tint.toString(16).padStart(6, '0')}`,
        stroke: '#032015',
        strokeThickness: 4,
        duration: 1250,
        slot: 'top',
        type: 'boss',
        priority: 5,
        maxWidth: this.game.getWidth() * 0.76
      });
    }
    AudioManager.playSfx('nova_fuel_ship_spawn', { volume: 0.68, minIntervalMs: 900 });
    return true;
  }

  attachBossFuelTether(enemy) {
    if (!enemy || enemy.bossFuelTether || !this.container) return enemy?.bossFuelTether || null;
    const tether = new PIXI.Graphics();
    tether.label = 'bossFuelShipHealTether';
    tether.zIndex = -6;
    tether.blendMode = 'add';
    tether.visible = false;
    tether.renderable = false;
    enemy.bossFuelTether = tether;
    enemy.ownedVisuals?.push(tether);
    if (typeof this.container.addChildAt === 'function') {
      this.container.addChildAt(tether, 0);
    } else {
      this.container.addChild?.(tether);
    }
    return tether;
  }

  clearBossFuelTether(enemy) {
    const tether = enemy?.bossFuelTether;
    if (!tether) return;
    tether.clear?.();
    tether.visible = false;
    tether.renderable = false;
    tether._debugBossFuelTether = { visible: false };
  }

  updateBossFuelTether(enemy, boss, distance = 0) {
    const tether = enemy?.bossFuelTether || this.attachBossFuelTether(enemy);
    if (!tether || !enemy?.active || !boss?.active) return;

    const now = Date.now();
    const supportProfile = enemy.bossSupportShipProfile || {};
    const baseColor = supportProfile.tint || BOSS_FUEL_TETHER_COLOR;
    const accentColor = supportProfile.accent || BOSS_FUEL_TETHER_ACCENT;
    const beamStyle = supportProfile.beamStyle || enemy.bossFuelProfile?.beamStyle || 'pulse';
    const groupSize = Math.max(1, Math.min(BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE, Number(enemy.bossFuelProfile?.groupSize) || 1));
    const groupSlot = Math.max(0, Number(enemy.bossFuelProfile?.groupSlot) || 0);
    const dx = boss.x - enemy.x;
    const dy = boss.y - enemy.y;
    const angle = Math.atan2(dy, dx);
    const px = -Math.sin(angle);
    const py = Math.cos(angle);
    const supportRadius = Math.max(10, enemy.radius || 18) * 0.72;
    const bossRadius = Math.max(36, boss.getVisualRadius?.() || boss.radius || 70) * 0.36;
    const startX = enemy.x + Math.cos(angle) * supportRadius;
    const startY = enemy.y + Math.sin(angle) * supportRadius;
    const endX = boss.x - Math.cos(angle) * bossRadius;
    const endY = boss.y - Math.sin(angle) * bossRadius;
    const pulse = Math.sin(now * 0.011 + distance * 0.018 + groupSlot * 0.7) * 0.5 + 0.5;
    const fastPulse = Math.sin(now * 0.032 + groupSlot) * 0.5 + 0.5;
    const tension = Math.max(0.38, Math.min(1, 1 - distance / 620));
    const styleBoost = beamStyle === 'surge' || beamStyle === 'reactor' ? 1.22 : beamStyle === 'towline' ? 0.92 : 1;
    const beamWidth = (8.5 + groupSize * 1.2 + pulse * 1.6) * styleBoost;
    let directionChevronCount = 0;
    let intakeBracketCount = 0;
    let offscreenEdgeMarkerCount = 0;

    tether.clear();
    tether.visible = true;
    tether.renderable = true;
    tether.alpha = 0.88 + pulse * 0.12;

    const drawOffsetLine = (offset, width, color, alpha) => {
      const wobble = Math.sin(now * 0.006 + offset * 0.31 + groupSlot) * (beamStyle === 'braid' ? 4.5 : 2.5);
      tether.moveTo(startX + px * (offset + wobble), startY + py * (offset + wobble));
      tether.lineTo(endX + px * (offset - wobble * 0.5), endY + py * (offset - wobble * 0.5));
      tether.stroke({ color, width, alpha });
    };

    drawOffsetLine(0, beamWidth + 7, baseColor, 0.1 + tension * 0.16);
    drawOffsetLine(-beamWidth * 0.34, 2.6 + pulse * 0.9, accentColor, 0.28 + tension * 0.2);
    drawOffsetLine(beamWidth * 0.34, 2.6 + fastPulse * 0.9, accentColor, 0.24 + tension * 0.2);
    drawOffsetLine(0, 2 + pulse * 1.5, 0xffffff, 0.34 + tension * 0.28);

    if (beamStyle === 'shield' || beamStyle === 'towline') {
      for (const offset of [-beamWidth * 0.72, beamWidth * 0.72]) {
        drawOffsetLine(offset, 1.7, beamStyle === 'shield' ? 0xffffff : accentColor, 0.2 + tension * 0.22);
      }
    }

    const packetCount = groupSize >= 3 ? 6 : groupSize === 2 ? 5 : 4;
    for (let i = 0; i < packetCount; i += 1) {
      const t = (now * (beamStyle === 'towline' ? 0.0009 : 0.00145) + i / packetCount + groupSlot * 0.11) % 1;
      const side = i % 2 ? -1 : 1;
      const lane = side * (beamWidth * 0.18 + Math.sin(now * 0.012 + i) * 3.4);
      const packetX = startX + (endX - startX) * t + px * lane;
      const packetY = startY + (endY - startY) * t + py * lane;
      const packetRadius = 2.8 + pulse * 1.4 + (beamStyle === 'reactor' ? 1 : 0);
      tether.circle(packetX, packetY, packetRadius);
      tether.fill({ color: i % 2 ? accentColor : baseColor, alpha: 0.34 + tension * 0.3 });
      tether.circle(packetX, packetY, packetRadius * 0.38);
      tether.fill({ color: 0xffffff, alpha: 0.24 + tension * 0.2 });
    }

    const nodeCount = beamStyle === 'stitch' ? 6 : 4;
    for (let i = 1; i <= nodeCount; i += 1) {
      const t = i / (nodeCount + 1);
      const nodeX = startX + (endX - startX) * t;
      const nodeY = startY + (endY - startY) * t;
      const nodeOffset = (i % 2 ? -1 : 1) * (beamWidth * 0.5 + fastPulse * 3);
      tether.circle(nodeX + px * nodeOffset, nodeY + py * nodeOffset, 2.2 + (i % 2) + pulse);
      tether.fill({ color: beamStyle === 'stitch' ? 0xffffff : accentColor, alpha: 0.22 + tension * 0.18 });
    }

    const chevronCount = groupSize >= 3 ? 5 : groupSize === 2 ? 4 : 3;
    const chevronLength = 11 + groupSize * 1.8 + pulse * 2.8;
    const chevronSpread = 6.6 + groupSize * 1.1;
    for (let i = 0; i < chevronCount; i += 1) {
      const t = (0.18 + (i / chevronCount) * 0.66 + now * 0.00055 + groupSlot * 0.04) % 0.84;
      const safeT = 0.1 + t;
      const centerX = startX + (endX - startX) * safeT + px * Math.sin(now * 0.01 + i) * 2.6;
      const centerY = startY + (endY - startY) * safeT + py * Math.cos(now * 0.01 + i) * 2.6;
      const tipX = centerX + Math.cos(angle) * chevronLength;
      const tipY = centerY + Math.sin(angle) * chevronLength;
      const baseX = centerX - Math.cos(angle) * chevronLength * 0.45;
      const baseY = centerY - Math.sin(angle) * chevronLength * 0.45;
      tether.moveTo(baseX + px * (chevronSpread + 1.8), baseY + py * (chevronSpread + 1.8));
      tether.lineTo(tipX, tipY);
      tether.lineTo(baseX - px * (chevronSpread + 1.8), baseY - py * (chevronSpread + 1.8));
      tether.stroke({ color: baseColor, width: 4.5, alpha: 0.12 + tension * 0.14 });
      tether.moveTo(baseX + px * chevronSpread, baseY + py * chevronSpread);
      tether.lineTo(tipX, tipY);
      tether.lineTo(baseX - px * chevronSpread, baseY - py * chevronSpread);
      tether.stroke({ color: i % 2 ? accentColor : 0xffffff, width: 3.2, alpha: 0.36 + tension * 0.34 });
      directionChevronCount += 1;
    }

    for (let i = 0; i < 3; i += 1) {
      tether.circle(startX, startY, 4.5 + pulse * 2 + i * 4.2);
      tether.stroke({ color: i % 2 ? accentColor : baseColor, width: 1.5 + i * 0.35, alpha: (0.28 + tension * 0.18) / (1 + i * 0.35) });
    }
    tether.circle(startX, startY, 2.8 + pulse);
    tether.fill({ color: 0xffffff, alpha: 0.36 + tension * 0.2 });
    for (let i = 0; i < 3; i += 1) {
      tether.circle(endX, endY, 6.8 + fastPulse * 3 + i * 5.6);
      tether.stroke({ color: i % 2 ? baseColor : accentColor, width: 1.8 + i * 0.45, alpha: (0.3 + tension * 0.25) / (1 + i * 0.38) });
    }
    tether.circle(endX, endY, 3.6 + pulse * 1.4);
    tether.fill({ color: baseColor, alpha: 0.32 + tension * 0.22 });

    const intakeArcRadius = 14 + groupSize * 1.8 + fastPulse * 4;
    const intakeDepth = 8 + pulse * 3;
    for (const side of [-1, 1]) {
      const outerX = endX + px * side * intakeArcRadius;
      const outerY = endY + py * side * intakeArcRadius;
      const mouthX = endX + px * side * (intakeArcRadius * 0.56);
      const mouthY = endY + py * side * (intakeArcRadius * 0.56);
      const innerX = mouthX + Math.cos(angle) * intakeDepth;
      const innerY = mouthY + Math.sin(angle) * intakeDepth;
      tether.moveTo(outerX - Math.cos(angle) * intakeDepth * 0.6, outerY - Math.sin(angle) * intakeDepth * 0.6);
      tether.lineTo(mouthX, mouthY);
      tether.lineTo(innerX, innerY);
      tether.stroke({ color: accentColor, width: 2.4, alpha: 0.3 + tension * 0.28 });
      intakeBracketCount += 1;
    }
    for (let i = 0; i < 2; i += 1) {
      const bracketOffset = (i ? -1 : 1) * (beamWidth * 0.38 + 4);
      const baseX = endX - Math.cos(angle) * (8 + i * 4) + px * bracketOffset;
      const baseY = endY - Math.sin(angle) * (8 + i * 4) + py * bracketOffset;
      tether.moveTo(baseX - px * bracketOffset * 0.35, baseY - py * bracketOffset * 0.35);
      tether.lineTo(baseX + Math.cos(angle) * (8 + fastPulse * 4), baseY + Math.sin(angle) * (8 + fastPulse * 4));
      tether.stroke({ color: 0xffffff, width: 1.8, alpha: 0.22 + tension * 0.24 });
      intakeBracketCount += 1;
    }

    const width = Math.max(
      320,
      Number(this.game?.getWidth?.()) ||
      Number(this.game?.app?.screen?.width) ||
      Number(this.game?.width) ||
      1280
    );
    const height = Math.max(
      240,
      Number(this.game?.getHeight?.()) ||
      Number(this.game?.app?.screen?.height) ||
      Number(this.game?.height) ||
      720
    );
    const edgeInset = Math.max(26, Math.min(54, Math.min(width, height) * 0.045));
    const safeLeft = edgeInset;
    const safeRight = width - edgeInset;
    const safeTop = Math.max(edgeInset, Math.min(92, height * 0.14));
    const safeBottom = height - edgeInset;
    const edgeX = Math.max(safeLeft, Math.min(safeRight, enemy.x));
    const edgeY = Math.max(safeTop, Math.min(safeBottom, enemy.y));
    const needsEdgeMarker = Math.abs(edgeX - enemy.x) > 0.5 || Math.abs(edgeY - enemy.y) > 0.5;
    if (needsEdgeMarker) {
      let markerDx = enemy.x - edgeX;
      let markerDy = enemy.y - edgeY;
      let markerDist = Math.hypot(markerDx, markerDy);
      if (!Number.isFinite(markerDist) || markerDist < 0.01) {
        markerDx = enemy.x < width / 2 ? -1 : 1;
        markerDy = 0;
        markerDist = 1;
      }
      const nx = markerDx / markerDist;
      const ny = markerDy / markerDist;
      const tx = -ny;
      const ty = nx;
      const markerPulse = Math.sin(now * 0.026 + groupSlot) * 0.5 + 0.5;
      const markerRadius = 14 + groupSize * 2.2 + markerPulse * 3.4;
      const arrowLength = 13 + groupSize * 2 + markerPulse * 2.2;
      const arrowBack = arrowLength * 0.9;
      const arrowWing = 7.5 + groupSize * 1.2;
      const markerX = edgeX + nx * (2 + markerPulse * 2);
      const markerY = edgeY + ny * (2 + markerPulse * 2);

      tether.circle(markerX, markerY, markerRadius + 8);
      tether.stroke({ color: baseColor, width: 2.4, alpha: 0.12 + tension * 0.16 });
      tether.circle(markerX, markerY, markerRadius);
      tether.stroke({ color: accentColor, width: 1.6, alpha: 0.2 + tension * 0.22 });
      tether.moveTo(markerX + nx * arrowLength, markerY + ny * arrowLength);
      tether.lineTo(markerX - nx * arrowBack + tx * arrowWing, markerY - ny * arrowBack + ty * arrowWing);
      tether.lineTo(markerX - nx * arrowBack - tx * arrowWing, markerY - ny * arrowBack - ty * arrowWing);
      tether.lineTo(markerX + nx * arrowLength, markerY + ny * arrowLength);
      tether.stroke({ color: 0xffffff, width: 2.3, alpha: 0.36 + tension * 0.28 });
      tether.moveTo(markerX - nx * (arrowBack + 8), markerY - ny * (arrowBack + 8));
      tether.lineTo(markerX - nx * (arrowBack + 24), markerY - ny * (arrowBack + 24));
      tether.stroke({ color: baseColor, width: 2.8, alpha: 0.28 + tension * 0.28 });
      for (let i = 0; i < 2; i += 1) {
        tether.circle(markerX - nx * (arrowBack + 18 + i * 9), markerY - ny * (arrowBack + 18 + i * 9), 2.8 + markerPulse * 1.2);
      }
      tether.fill({ color: 0xffffff, alpha: 0.2 + tension * 0.22 });
      offscreenEdgeMarkerCount += 1;
    }

    tether._debugBossFuelTether = {
      visible: true,
      beamStyle,
      groupSize,
      packetCount,
      nodeCount,
      directionChevronCount,
      intakeBracketCount,
      offscreenEdgeMarkerCount
    };
  }

  createBossFuelDeliveryBurst(enemy, boss, healed = 0) {
    if (!enemy || !boss || !this.container) return;
    const supportProfile = enemy.bossSupportShipProfile || {};
    const baseColor = supportProfile.tint || BOSS_FUEL_TETHER_COLOR;
    const accentColor = supportProfile.accent || BOSS_FUEL_TETHER_ACCENT;
    const groupSize = Math.max(1, Math.min(BOSS_FUEL_EIGHT_SHIP_SWARM_SIZE, Number(enemy.bossFuelProfile?.groupSize) || 1));
    const burst = new PIXI.Graphics();
    burst.label = 'bossFuelShipDeliveryBurst';
    burst.zIndex = 26;
    burst.blendMode = 'add';
    const startedAt = Date.now();
    const durationMs = 360;
    const draw = () => {
      const progress = Math.max(0, Math.min(1, (Date.now() - startedAt) / durationMs));
      const fade = 1 - progress;
      const pulse = Math.sin(progress * Math.PI);
      const dx = boss.x - enemy.x;
      const dy = boss.y - enemy.y;
      const angle = Math.atan2(dy, dx);
      const px = -Math.sin(angle);
      const py = Math.cos(angle);
      burst.clear();
      burst.alpha = Math.max(0, fade);
      burst.moveTo(enemy.x, enemy.y);
      burst.lineTo(boss.x, boss.y);
      burst.stroke({ color: baseColor, width: 8 + groupSize * 2 + pulse * 6, alpha: 0.16 * fade });
      burst.moveTo(enemy.x, enemy.y);
      burst.lineTo(boss.x, boss.y);
      burst.stroke({ color: 0xffffff, width: 2.4 + pulse * 2, alpha: 0.32 * fade });
      for (let i = 0; i < 3 + groupSize; i += 1) {
        const t = i / (3 + groupSize);
        const cx = enemy.x + dx * t + px * Math.sin(progress * Math.PI * 2 + i) * 12;
        const cy = enemy.y + dy * t + py * Math.cos(progress * Math.PI * 2 + i) * 12;
        burst.circle(cx, cy, 3 + pulse * 4 + i * 0.3);
        burst.fill({ color: i % 2 ? accentColor : baseColor, alpha: 0.24 * fade });
      }
      const bossRadius = Math.max(38, boss.getVisualRadius?.() || boss.radius || 70);
      for (let i = 0; i < 4; i += 1) {
        burst.circle(boss.x, boss.y, bossRadius * (0.28 + i * 0.13 + progress * 0.22));
        burst.stroke({ color: i % 2 ? accentColor : baseColor, width: 2.2 + pulse * 2, alpha: (0.22 + i * 0.04) * fade });
      }
      const spokes = 8 + groupSize * 2;
      for (let i = 0; i < spokes; i += 1) {
        const a = (Math.PI * 2 * i) / spokes + progress * 1.8;
        const inner = bossRadius * 0.18;
        const outer = bossRadius * (0.38 + pulse * 0.22);
        burst.moveTo(boss.x + Math.cos(a) * inner, boss.y + Math.sin(a) * inner);
        burst.lineTo(boss.x + Math.cos(a) * outer, boss.y + Math.sin(a) * outer);
      }
      burst.stroke({ color: healed > 0 ? 0xffffff : accentColor, width: 1.7 + pulse * 1.4, alpha: 0.24 * fade });
    };
    draw();
    this.container.addChild(burst);
    const ticker = this.game?.app?.ticker;
    let tick = null;
    if (ticker?.add && ticker?.remove) {
      tick = () => draw();
      ticker.add(tick);
    }
    setTimeout(() => {
      if (tick) ticker?.remove?.(tick);
      burst.clear?.();
      if (burst.parent) burst.parent.removeChild(burst);
    }, durationMs + 40);
  }

  updateBossFuelShip(enemy, delta) {
    if (!enemy?.active || !this.boss?.active) {
      this.clearBossFuelTether(enemy);
      return;
    }
    const boss = this.boss;
    const targetX = boss.x;
    const targetY = boss.y;
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = (enemy.bossFuelProfile?.speed || 1.55) * Math.max(0.5, delta || 1);
    enemy.x += (dx / distance) * speed;
    enemy.y += (dy / distance) * speed;
    enemy.sprite.rotation = Math.atan2(dy, dx) + Math.PI / 2;
    enemy.sprite.x = enemy.x;
    enemy.sprite.y = enemy.y;
    this.updateBossFuelTether(enemy, boss, distance);
    const contactDistance = (enemy.radius || 18) + (boss.getVisualRadius?.() || boss.radius || 70) * 0.45;
    if (distance <= contactDistance) {
      const healAmount = Math.max(2, Math.round((boss.maxHealth || 1) * (enemy.bossFuelProfile?.healPercent || 0.08)));
      const healed = boss.heal?.(healAmount, { source: 'boss_fuel_ship' }) || 0;
      enemy.active = false;
      enemy.deactivateVisuals?.('boss_fuel_delivered');
      const supportColor = enemy.bossSupportShipProfile?.tint || 0x7dffcc;
      const accentColor = enemy.bossSupportShipProfile?.accent || 0xffec8a;
      this.createBossFuelDeliveryBurst(enemy, boss, healed);
      this.game?.scenes?.play?.particleManager?.createHitSpark?.(enemy.x, enemy.y, supportColor, 1.8);
      this.game?.scenes?.play?.particleManager?.createBossChargeSparks?.(boss.x, boss.y, accentColor, 1.35);
      this.game?.scenes?.play?.showToast?.(translateText('BOSS REFUELED +{amount} HP', { amount: Math.max(0, Math.round(healed)) }), {
        fontSize: this.game.getWidth() < 620 ? 14 : 17,
        fill: '#ffec8a',
        stroke: '#241800',
        strokeThickness: 4,
        duration: 1150,
        slot: 'top',
        type: 'boss',
        priority: 5,
        maxWidth: this.game.getWidth() * 0.72
      });
      AudioManager.playSfx('nova_fuel_ship_heal', { force: true, volume: 0.76, minIntervalMs: 0 });
    }
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

  createBossMayhemReinforcementWaveConfigs(groupCount = 1, attemptIndex = 0) {
    const level = Math.max(1, Math.floor(Number(this.level) || 1));
    const normalWaveLevel = Math.max(1, Number(this.getNormalWaveDifficultyLevel(level)) || level);
    const config = this.getMayhemReinforcementConfig();
    const waveGroups = Math.max(1, Math.min(3, Math.floor(Number(groupCount) || 1)));
    const formations = ['STAGGERED_WING', 'PINCER', 'DOUBLE_ARC', 'CROSS_STREAM'];
    const configs = [];
    for (let groupIndex = 0; groupIndex < waveGroups; groupIndex += 1) {
      const centeredIndex = groupIndex - (waveGroups - 1) / 2;
      const waveIndex = Math.max(0, attemptIndex * 3 + groupIndex);
      const formation = formations[Math.abs((level + attemptIndex + groupIndex * 3) % formations.length)];
      const baseWave = {
        type: pickGeneratedEnemyTypeForLevel(normalWaveLevel),
        count: this.getWaveEnemyCount(normalWaveLevel, waveIndex),
        formation,
        tactic: this.pickWaveTactic(normalWaveLevel, waveIndex, formation),
        entry: groupIndex % 2 === 0 ? 'split' : 'alternating',
        cadence: 1.02 + Math.min(0.34, normalWaveLevel * 0.012 + groupIndex * 0.04),
        sourceLevel: level,
        normalWaveDifficultyLevel: normalWaveLevel,
        isMayhemReinforcement: true,
        isBossMayhemReinforcement: true,
        reinforcedFromWaveIndex: this.currentWaveIndex,
        reinforcementGroupIndex: groupIndex,
        reinforcementGroupCount: waveGroups,
        reinforcementEntryDelayMs: groupIndex * 1200,
        reinforcementLaneOffsetPx: waveGroups > 1 ? centeredIndex * 84 : 0,
        reinforcementScoreMultiplier: config?.bossReinforcementScoreMultiplier || config?.reinforcementScoreMultiplier || 1,
        allowConcurrentSpawn: true
      };
      const shaped = this.game?.contentDirector?.shapeWaveConfig?.(baseWave, {
        level: normalWaveLevel,
        sourceLevel: level,
        waveIndex
      }) || baseWave;
      const dangerMoment = this.applyNormalWaveDangerMoment(shaped, normalWaveLevel, waveIndex, waveGroups);
      configs.push(this.applyDangerMidShipPlan(dangerMoment, normalWaveLevel, waveIndex, waveGroups));
    }
    return configs;
  }

  spawnBossMayhemReinforcementWave(groupCount = 1, state = this.bossReinforcementState) {
    if (this.state !== 'BOSS_ACTIVE' || !this.boss?.active || this.bossDefeatedThisLevel) return 0;
    const configs = Array.isArray(state?.reinforcementWaveConfigs) && state.reinforcementWaveConfigs.length
      ? state.reinforcementWaveConfigs
      : this.createBossMayhemReinforcementWaveConfigs(groupCount, state?.attemptIndex || 0);
    let expectedSpawned = 0;
    configs.forEach((config, index) => {
      expectedSpawned += this.getMayhemReinforcementWaveExpectedCount(config);
      this.measurePerformance('boss_mayhem_reinforcement.spawn_full_wave', () => this.spawnWave({
        ...config,
        isMayhemReinforcement: true,
        isBossMayhemReinforcement: true,
        reinforcementGroupIndex: index,
        reinforcementGroupCount: configs.length,
        reinforcementEntryDelayMs: index * 1200,
        reinforcementLaneOffsetPx: configs.length > 1 ? (index - (configs.length - 1) / 2) * 84 : 0,
        reinforcementScoreMultiplier: config.reinforcementScoreMultiplier || 1,
        allowConcurrentSpawn: true
      }));
    });
    return expectedSpawned;
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
    const consumedReinforcementWaveIndices = [];
    let nextConsumedWaveIndex = clearedWaveIndex + 1;
    while (this.mayhemReinforcementConsumedWaveIndices?.has(nextConsumedWaveIndex)) {
      consumedReinforcementWaveIndices.push(nextConsumedWaveIndex);
      nextConsumedWaveIndex += 1;
    }
    const transitionWaveIndex = consumedReinforcementWaveIndices.length
      ? consumedReinforcementWaveIndices[consumedReinforcementWaveIndices.length - 1]
      : clearedWaveIndex;
    const consumedReinforcementWaveIndex = consumedReinforcementWaveIndices[0] ?? null;
    const clearedWaveCount = 1 + consumedReinforcementWaveIndices.length;
    const superStormGroupCount = this.mayhemSuperStormSurvivalWaveCounts?.get(clearedWaveIndex) || 0;
    const survivedMayhemSuperStorm = superStormGroupCount > 0;
    if (survivedMayhemSuperStorm) this.mayhemSuperStormSurvivalWaveCounts.delete(clearedWaveIndex);
    let suppressPositiveAfterWaveCompliment = false;
    if (this.game?.scenes?.play) {
      const playScene = this.game.scenes.play;
      suppressPositiveAfterWaveCompliment = playScene.shouldSuppressPositiveAfterWaveCompliment?.() === true;
      playScene.wavesCleared = (Number(playScene.wavesCleared) || 0) + clearedWaveCount;
      if (!clearedWave?.isChallenge) {
        if ((Number(playScene.damageTakenThisWave) || 0) === 0) {
          playScene.noHitWavesThisRun = (Number(playScene.noHitWavesThisRun) || 0) + 1;
          playScene.flawlessWaveStreak = (Number(playScene.flawlessWaveStreak) || 0) + 1;
          const noHitBonus = playScene.addNormalWaveScore?.(400, 'noHitBonus') ?? this.game.addScore(400, 'noHitBonus');
          playScene.showFlawlessWaveCelebration?.(playScene.flawlessWaveStreak, noHitBonus);
        } else {
          playScene.flawlessWaveStreak = 0;
        }
      }
      if (consumedReinforcementWaveIndices.length >= 2) {
        const stormBonus = 600 * consumedReinforcementWaveIndices.length;
        const appliedStormBonus = playScene.addNormalWaveScore?.(stormBonus, 'reinforcementStormSurvived') ??
          this.game.addScore(stormBonus, 'reinforcementStormSurvived');
        const presentationShown = playScene.showMayhemReinforcementStormSurvived?.({
          groupCount: consumedReinforcementWaveIndices.length,
          score: Number(appliedStormBonus || stormBonus),
          superStorm: survivedMayhemSuperStorm
        });
        if (!presentationShown) {
          playScene.enqueueToast?.(translateText('STORM SURVIVED +{score}', {
            score: Number(appliedStormBonus || stormBonus).toLocaleString('en-US')
          }), {
            fontSize: this.game.getWidth() < 620 ? 16 : 20,
            fill: '#ffef7e',
            stroke: '#160006',
            strokeThickness: 3,
            slot: 'top',
            type: 'bonus',
            priority: 5,
            duration: 1500,
            maxWidth: this.game.getWidth() * (this.game.getWidth() < 620 ? 0.86 : 0.58)
          });
          AudioManager.playSfx('combo_breakout', { volume: 0.5, minIntervalMs: 0 });
        }
      }
      if (survivedMayhemSuperStorm && !suppressPositiveAfterWaveCompliment) {
        AudioManager.playVoice(MAYHEM_SUPER_STORM_SURVIVED_SOUND_ID, {
          force: true,
          bypassGlobalCooldown: true,
          cooldownMs: 0,
          eventCooldownMs: 0,
          duckMs: 2200,
          voicePriority: 8
        });
      }
      playScene.damageTakenThisWave = 0;
    }
    let hasUpcomingWave = transitionWaveIndex < this.normalWavesTotal - 1;

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
      const challengeResult = this.finishChallengeFlight();
      const bonus = Math.max(0, Number(challengeResult?.bonus) || 0);
      const appliedBonus = this.game.scenes.play?.addNormalWaveScore?.(bonus, 'waveClearBonus') ??
        this.game.addScore(bonus, 'waveClearBonus');
      if (this.game.scenes.play) {
        this.measurePerformance('first_use_asset_effect_creation.wave_bonus_effect', () => {
          this.game.scenes.play.showChallengeFlightResult?.({
            ...challengeResult,
            appliedBonus
          });
        });
      }
      if (hasUpcomingWave) {
        AudioManager.playVoice('mission_control_wave_clear', { cooldownMs: 30000, duckMs: 1300 });
      }
    } else {
      // Normal Bonus
      const rewardConfig = BalanceConfig.rewards || {};
      const waveClearScoreBase = rewardConfig.waveClearScoreBase || 500;
      const bonus = waveClearScoreBase * clearedWaveNumber +
        (consumedReinforcementWaveIndex !== null ? waveClearScoreBase * (consumedReinforcementWaveIndex + 1) : 0);
      const appliedBonus = this.game.scenes.play?.addNormalWaveScore?.(bonus, 'waveClearBonus') ?? this.game.addScore(bonus, 'waveClearBonus');
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
          ? `NEXT WAVE ${transitionWaveIndex + 2}/${this.normalWavesTotal}`
          : 'BOSS GATE NEXT';
        const repairLabel = repairDelta > 0 ? ` - REPAIR +${repairDelta}` : '';
        const transitionLabel = hasUpcomingWave ? 'WAVE CLEARED!' : 'SECTOR CLEAR';
        this.measurePerformance('first_use_asset_effect_creation.wave_bonus_effect', () => {
          this.game.scenes.play.showWaveBonusEffect(appliedBonus, transitionLabel, {
            compact: hasUpcomingWave,
            subtitle: `${nextLabel}${repairLabel}`,
            sfxKey: hasUpcomingWave ? 'nova_wave_clear_sweep' : 'levelComplete'
          });
        });
      }
    }

    this.maybeSpawnHijacker({
      clearedWaveNumber: transitionWaveIndex + 1,
      hasUpcomingWave
    });
    if (this.game?.scenes?.play) {
      this.game.scenes.play.lifeLostThisWave = false;
    }

    // Logic to potentially inject a short score-risk challenge wave.
    const normalWaveLevel = this.getNormalWaveDifficultyLevel(this.level);
    if (consumedReinforcementWaveIndex === null && normalWaveLevel > 1 && hasUpcomingWave && this.currentWaveIndex > 0) {
      const diff = BalanceConfig.difficulty;
      const pressureTuning = getNormalWavePressureTuning(normalWaveLevel);
      const challengeMinLevel = Number(pressureTuning.challengeMinLevel) || 1;
      const challengeWaveChance = Math.min(
        0.18,
        ((diff.challengeWaveChance ?? 0.08) * (pressureTuning.challengeChanceMult || 1)) +
        (normalWaveLevel >= challengeMinLevel ? (Number(pressureTuning.challengeChanceBonus) || 0) : 0)
      );
      if (Math.random() < challengeWaveChance) {
        const wasChallenge = clearedWave && clearedWave.isChallenge;
        if (!wasChallenge) {
          const pattern = getChallengeFlightPattern(normalWaveLevel, this.currentWaveIndex + 1);
          console.log(`[EnemyManager] injecting Cabinet Skill Flight pattern=${pattern.id}`);
          this.waves.splice(this.currentWaveIndex + 1, 0, {
            type: 'bonus_challenge',
            count: (diff.challengeWaveCount || 24) + (Number(pressureTuning.challengeWaveCountBonus) || 0),
            formation: pattern.formation,
            tactic: pattern.tactic,
            entry: pattern.entry,
            cadence: pattern.cadence,
            challengeFlightPatternId: pattern.id,
            challengeFlightPatternLabel: pattern.label,
            sourceLevel: this.level,
            normalWaveDifficultyLevel: normalWaveLevel,
            isChallenge: true
          });
          this.normalWavesTotal += 1;
          this.bossWaveIndex = this.normalWavesTotal;
          hasUpcomingWave = true;
        }
      }
    }

    this.game?.scenes?.play?.maybeShowCabinetWonder?.({
      sector: this.level,
      waveNumber: transitionWaveIndex + 1,
      hasUpcomingWave,
      isChallenge: Boolean(clearedWave?.isChallenge || this.waves[transitionWaveIndex + 1]?.isChallenge),
      busyTransition: survivedMayhemSuperStorm || consumedReinforcementWaveIndices.length > 0
    });

    if (transitionWaveIndex < this.normalWavesTotal - 1) {
      this.currentWaveIndex = transitionWaveIndex + 1;
      this.mayhemReinforcementState = null;
      const config = this.waves[this.currentWaveIndex];
      this.beginWaveBriefing(config);
      return;
    }
    this.currentWaveIndex = transitionWaveIndex;
    this.mayhemReinforcementState = null;

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
    return this.measurePerformance('incoming_wave_banner', () => {
    if (this.game.scenes.play) {
      const compactHud = this.game.getWidth() < 620;
      const openingMomentum = this.getOpeningMomentumTuning();
      const isChallenge = Boolean(this.pendingWaveConfig?.isChallenge || this.pendingWaveConfig?.type === 'bonus_challenge');
      const challengePattern = this.pendingWaveConfig?.challengeFlightPatternLabel ||
        getChallengeFlightPattern(this.pendingWaveConfig?.sourceLevel || this.level, this.currentWaveIndex).label;
      const descriptor = this.getWaveDescriptor(this.pendingWaveConfig);
      const waveLabel = `${translateText('WAVE')} ${this.currentWaveIndex + 1}/${this.normalWavesTotal}`;
      const message = isChallenge
        ? translateText('SKILL FLIGHT: {pattern}\nBREAK TARGETS BEFORE THEY EXIT', {
          pattern: translateText(challengePattern)
        })
        : `${waveLabel}: ${descriptor}`;
      this.game.scenes.play.showToast(message, {
        fontSize: compactHud ? (isChallenge ? 18 : 15) : (isChallenge ? 25 : 18),
        fill: isChallenge ? '#fff3a0' : '#7ee9ff',
        stroke: '#00111d',
        strokeThickness: isChallenge ? 5 : 4,
        y: isChallenge ? this.game.getHeight() * 0.32 : (compactHud ? this.game.getHeight() * 0.25 : 112),
        duration: isChallenge ? Math.max(1700, openingMomentum.waveToastDurationMs) : openingMomentum.waveToastDurationMs,
        slot: isChallenge ? 'center' : 'top',
        type: isChallenge ? 'bonus' : 'level_up',
        priority: isChallenge ? 7 : 2,
        maxWidth: this.game.getWidth() * (compactHud ? 0.86 : 0.7)
      });
      AudioManager.playSfx(isChallenge ? 'combo_breakout' : 'ui_open', {
        volume: isChallenge ? 0.58 : 0.25,
        minIntervalMs: isChallenge ? 0 : 500
      });
    }
    });
  }

  getWaveDescriptor(config) {
    if (!config) return translateText('INCOMING');
    if (config.isChallenge || config.type === 'bonus_challenge') return translateText('CABINET SKILL FLIGHT');
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

    // The Hijacker warning is a combat-critical callout, so keep it out of voice pileups.
    AudioManager.playVoice('mission_control_hijacker', {
      cooldownMs: 24000,
      eventCooldownMs: 24000,
      duckMs: 1500,
      stopOtherVoices: true,
      exclusiveGroup: 'announcer',
      exclusiveLockMs: 1700,
      exclusiveLockReason: 'hijacker_warning',
      voicePriority: 80
    });

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
    this.sweepInactiveEnemyVisuals('force_clear_sweep');
    this.cleanupTimer = 0;
    this.cleanupPhase = 'NONE';

    // CLEANUP FIX: Diagnostic - cleanup complete
    console.log(`[EnemyManager] Wave cleanup complete: cleared ${enemyCount} enemies + ${bonusDroneCount} bonus drones + hijacker=${hijackerCleared}`);
  }

  clearEnemies() {
    this.game?.scenes?.play?.clearChallengeFlightHud?.('clear_enemies');
    this.challengeFlightState = null;
    this.clearPendingWaveSpawns();
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

  clearPendingWaveSpawns() {
    if (Array.isArray(this.waveSpawnTimers) && this.waveSpawnTimers.length) {
      this.waveSpawnTimers.forEach((timer) => clearTimeout(timer));
    }
    this.waveSpawnTimers = [];
    this.waveSpawnPendingCount = 0;
    this.spawning = false;
    this.waveSpawnSerial = (Number(this.waveSpawnSerial) || 0) + 1;
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
