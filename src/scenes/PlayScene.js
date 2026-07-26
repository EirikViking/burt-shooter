import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { RankAssets } from '../utils/RankAssets.js';
import { Player, RESPAWN_INVULNERABILITY_MS } from '../entities/Player.js';
import { BonusDrone } from '../entities/BonusDrone.js';
import { AssetManifest } from '../assets/assetManifest.js';
import {
  commitGameOverFinalTransmissionVariant,
  reserveNextGameOverFinalTransmissionVariant
} from '../config/GameOverFinalTransmissionVariants.js';
import { getEliteMiddleShipsForLevel } from '../config/EliteMiddleShips.js';
import { BalanceConfig, MAX_PLAYER_LIVES } from '../config/BalanceConfig.js';
import { COMBO_MILESTONES, COMBO_WINDOW_MS } from '../config/ComboConfig.js';
import { EnemyManager } from '../managers/EnemyManager.js';
import { BulletManager } from '../managers/BulletManager.js';
import { PowerupManager } from '../managers/PowerupManager.js';
import { rankManager } from '../managers/RankManager.js';
import { ParticleManager } from '../effects/ParticleManager.js';
import { ScreenShake } from '../effects/ScreenShake.js';
import { SpectacleDirector } from '../effects/SpectacleDirector.js';
import {
  hideMicroSignals,
  presentDirectionalSignal
} from '../effects/MicroSignalVfx.js';
import { ScorePopupManager } from '../ui/ScorePopup.js';
import { InputManager } from '../input/InputManager.js';
import { TouchControls } from '../input/TouchControls.js';
import { NullTouchControls } from '../input/NullTouchControls.js';
import { AudioManager } from '../audio/AudioManager.js';
import { SFX_MIX } from '../audio/SoundCatalog.js';
import { HUD } from '../ui/HUD.js';
import { SettingsOverlay } from '../ui/SettingsOverlay.js';
import { HowToPlayOverlay } from '../ui/HowToPlayOverlay.js';
import { TacticalLoadoutOverlay } from '../ui/TacticalLoadoutOverlay.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import {
  MenuFxLayer,
  playMenuBackSfx,
  playMenuConfirmSfx,
  playMenuFocusSfx,
  playMenuOpenSfx
} from '../ui/MenuFxLayer.js';
import { BUILD_ID } from '../buildInfo.js';
import { getDefaultShipKey } from '../config/ShipMetadata.js';
import { createText, FONT_BODY, FONT_DISPLAY } from '../utils/pixiText.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import {
  getEnemyTaunt,
  getMicroMessage,
  getAllNewPhrases,
  getCabinetLogEntry,
  getStoryTransmission
} from '../text/phrasePool.js';
import { getShipMetadata } from '../config/ShipMetadata.js';
import { formatSectorLabel } from '../config/SectorCatalog.js';
import { translateText } from '../i18n/index.js';
import { tauntDirector } from '../game/TauntDirector.js';
import { isMaintainerDevtoolsEnabled } from '../config/MaintainerDevtools.js';
import { getNovaPerformanceFlags } from '../config/PerformanceFlags.js';
import { getAccessibilitySettings } from '../config/AccessibilitySettings.js';
import {
  getGameplayBackdropCoverScale,
  getGameplayBackdropProfile,
  resolveGameplayBackdropMode,
  sampleGameplayBackdropMotion
} from '../config/GameplayBackdropMotion.js';
import { RunPacingConfig } from '../config/RunPacingConfig.js';
import { getShipIntroTiming, isReturningPilot } from '../config/RetentionPresentation.js';
import { getPowerupMeta } from '../config/PowerupCatalog.js';
import {
  RARE_CHAOS_VISITOR_VARIANT_COUNT,
  RARE_CHAOS_VISITOR_WAVE_CHANCE
} from '../config/RareChaosVisitors.js';
import {
  TACTICAL_DRAFT_AUGMENTS,
  TACTICAL_DRAFT_BAN_COUNT,
  buildTacticalDraftOffers,
  getActiveTacticalAugmentIds,
  getActiveTacticalFusionProtocols,
  getTacticalDraftMeta,
  getTacticalFusionBlueprints,
  summarizeTacticalDraftPicks
} from '../config/TacticalDraft.js';
import { getTacticalBossBanterEvent } from '../config/TacticalBossBanterLines.js';
import { analyzeTacticalDoctrine, projectTacticalDoctrine } from '../config/TacticalDoctrine.js';
import {
  TACTICAL_DIRECTIVE_MINIMUM_FINAL_SECTOR,
  TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP,
  TACTICAL_DIRECTIVE_VARIANT_COUNT,
  applyTacticalDirectiveEvent,
  createTacticalDirectiveSession,
  getNextTacticalDirectiveEligibleSector,
  getTacticalDirectiveState,
  getTacticalDirectiveTierCeiling,
  pickTacticalDirective
} from '../config/TacticalDirectives.js';
import {
  ACE_BOUNTY_VARIANT_COUNT,
  getAceBountyById,
  planAceBountyEncounter
} from '../config/AceBounties.js';
import {
  NEMESIS_PROTOCOL_VARIANT_COUNT,
  getNemesisProtocolById,
  pickNemesisProtocol
} from '../config/NemesisProtocols.js';
import { RIVAL_WING_VARIANT_COUNT, getRivalWingDoctrineById, pickRivalWingDoctrine } from '../config/RivalWingDoctrines.js';
import {
  getOverrunMilestoneCelebration,
  isOverrunMilestoneSector,
  resolveOverrunMilestoneVoiceCue
} from '../config/OverrunMilestoneCelebrations.js';
import { getSectorArrivalSignal, getSectorCodexArt } from '../config/ThreatCodexCatalog.js';
import {
  getGeneratedEnemyProfilesForLevel
} from '../config/GeneratedEnemyProfiles.js';
import {
  getBossSupportShipEventSeed,
  pickBossSupportShipProfile
} from '../config/BossSupportShips.js';
import {
  readThreatDiscoveryState,
  recordThreatDefeated,
  recordThreatDefeatedBatch,
  recordThreatSeen
} from '../progression/ThreatDiscoveryState.js';
import { BOSS_FUEL_SHIP_CODEX_ID, getBossSupportCodexDefeatEntries } from '../progression/BossSupportCodexTracking.js';
import { readHangarProgressState, updateHangarProgress, writeHangarProgressState } from '../progression/HangarProgressState.js';
import {
  areAllRunContractsComplete,
  applyRunContractEvent,
  formatRunContractOrderSlotLabel,
  formatRunContractProgressValue,
  getRunContractById,
  getRunContractMenuState,
  getRunContractReward,
  getRunContractSessionState,
  prepareRunContractsForEligibleRun,
  recordRunContractCompletion,
  recordRunContractSessionProgress,
  startRunContractSession
} from '../progression/RunContracts.js';
import { getBossProfile, getBossProfileForRun } from '../config/BossRoster.js';
import {
  RUN_MODES,
  canRunModeUseTacticalDraft,
  getRunModeNormalWaveScoreXpMultiplier,
  isRankedRunMode
} from '../game/RunMode.js';
import {
  CABINET_WONDER_VARIANT_COUNT,
  evaluateCabinetWonder
} from '../game/CabinetWonders.js';
import { createMayhemPerformanceDiagnostics } from '../debug/MayhemPerformanceDiagnostics.js';
import { claimPiercingTargetHit, isWithinPointDefenseRadius } from '../game/ProjectileDefenseRules.js';
import {
  createCombatTelemetryState,
  getCombatDamageSourceLabel,
  getCombatDamageSourceForBullet,
  getCombatTelemetrySummary,
  recordCombatDamage,
  recordCombatProjectileHit,
  recordCombatVolley
} from '../game/CombatTelemetry.js';

const BOSS_WARNING_JOKES = [
  'Mission Control is hiding under the desk.',
  'The boss brought paperwork. This is not a drill.',
  'Please stop the boss before it invoices us.',
  'Cabinet says this is fine. Cabinet is lying.',
  'Warning: enormous problem with excellent lighting.'
];

function pickBossWarningJoke(profile, level = 1) {
  const seed = Number(profile?.index || level || 1);
  return BOSS_WARNING_JOKES[Math.max(0, seed - 1) % BOSS_WARNING_JOKES.length];
}

const OVERRUN_CLEAR_VFX_MS = 5600;
const OVERRUN_INTERLUDE_MS = 4300;
const GAME_OVER_INTERLUDE_MS = 3600;
const GAME_OVER_DEATH_HOLD_MS = 1100;
const BOSS_DEATH_VOICE_LOCK_MS = 9400;
const LIFE_LOSS_COMPLIMENT_GRACE_MS = 4000;
const GAMEPLAY_MESSAGE_EXTRA_READ_MS = 1000;
const SECTOR_ARRIVAL_STINGER_MS = 1100 + GAMEPLAY_MESSAGE_EXTRA_READ_MS;
const FIRST_RUN_CONTROLS_DELAY_MS = 240;
const FIRST_RUN_ENEMY_HOLD_MS = 2450;
const FIRST_RUN_CONTROLS_DURATION_MS = 6200;
const FIRST_RUN_CONTROLS_TOTAL_MS = FIRST_RUN_CONTROLS_DURATION_MS + GAMEPLAY_MESSAGE_EXTRA_READ_MS;
const FIRST_RUN_CONTROLS_MIN_VISIBLE_MS = 5000;
const RANK_UP_PRESENTATION_MS = 2610;
const COLLISION_GRID_CELL_SIZE = 96;
const COLLISION_SCORE_POPUP_QUEUE_BUDGET = 12;
const COLLISION_POWERUP_SPAWN_ATTEMPT_BUDGET = 6;
const TACTICAL_BOSS_BANTER_FOCUS_DELAY_MS = 520;
const TACTICAL_BOSS_BANTER_MAX_BUSY_RETRIES = 24;
const GAME_OVER_CELEBRATION_DURATION_MS = 3800;
const TACTICAL_DRAFT_CATEGORY_COLORS = Object.freeze({
  offense: 0xff647f,
  mobility: 0x58d8ff,
  defense: 0x64ffb0,
  utility: 0xffd15c
});
const DEFERRED_GAMEPLAY_PERSISTENCE_IDLE_MS = 1200;
const STRAGGLER_BEACON_MAX_TARGETS = 3;
const ACE_REWARD_PICKUP_OPTIONS = Object.freeze({
  rewardClaim: true,
  lifeTimeMs: 42000,
  verticalSpeed: 0.42,
  pickupAssistRadius: 40
});
const ACE_REWARD_PICKUP_PAIR_OFFSET = 60;

export class PlayScene {
  constructor(game) {
    this.game = game;
    this.gameplayGame = game.createGameplayFacade?.() || game;
    this.container = new PIXI.Container();
    this.gameContainer = new PIXI.Container();
    this.gameplayViewportMask = new PIXI.Graphics();
    this.decorativeOverlay = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    this.uiOverlay = new PIXI.Container();
    this.container.addChild(this.gameContainer);
    this.container.addChild(this.gameplayViewportMask);
    this.container.addChild(this.decorativeOverlay);
    this.container.addChild(this.uiContainer);
    this.container.addChild(this.uiOverlay);
    GameAssets.ensurePlasmaBloomTextures?.().catch(() => {});
    GameAssets.ensureMicroSignalTextures?.().catch(() => {});
    GameAssets.ensureTacticalDraftFieldTexture?.().catch(() => {});
    this.gameOverFinalTransmissionVariant = null;
    this.gameOverFinalTransmissionReady = null;
    GameAssets.ensureCabinetWonderTextures?.().catch(() => {});
    this.gameplayViewportMask.eventMode = 'none';
    this.applyGameplayViewportMask();

    this.inputManager = new InputManager();
    this.touchControls = new NullTouchControls();
    this.player = null;
    this.combatTelemetry = createCombatTelemetryState();
    this.companionShip = null; // Double ship powerup from hijacker rescue
    this.enemyManager = null;
    this.bulletManager = null;
    this.powerupManager = null;
    this.particleManager = null;
    this.screenShake = null;
    this.spectacleDirector = null;
    this.hud = null;
    this.isPaused = false;
    this.pauseOverlay = null;
    this.pauseMenuFx = null;
    this.pauseMenuDecor = null;
    this.pauseButtons = [];
    this.pauseFocusedIndex = 0;
    this.pauseGamepadNavigator = new GamepadNavigator();
    this.tacticalDraftNavigator = new GamepadNavigator();
    this.settingsOverlay = null;
    this.howToPlayOverlay = null;
    this.tacticalLoadoutOverlay = null;
    this.hadGameplayGamepadConnection = false;
    this.lastGameplayGamepadConnected = false;
    this.controlSmokeMode = false;
    this.autoPauseHandlersInstalled = false;
    this.visibilityPauseHandler = null;
    this.blurPauseHandler = null;
    this.nativeBlurPauseHandler = null;
    this.levelAdvancePending = false;
    this.dailySignalFinishPending = false;
    this.levelAdvanceTimeout = null;
    this.tacticalDraft = null;
    this.tacticalDraftHistory = [];
    this.tacticalDraftRescansRemaining = 1;
    this.tacticalDraftRescansUsed = 0;
    this.tacticalDraftHeldId = null;
    this.tacticalDraftBansRemaining = TACTICAL_DRAFT_BAN_COUNT;
    this.tacticalDraftBannedIds = [];
    this.tacticalDraftConfirmTimeout = null;
    this.tacticalScoreRouteRestrictionTimeout = null;
    this.tacticalScoreRouteDecision = null;
    this.tacticalBossBanterTimer = null;
    this.tacticalBossBanterToken = 0;
    this.pendingTacticalBossBanterId = null;
    this.pendingTacticalBossBanterContext = null;
    this.lastTacticalBossBanterId = null;
    this.lastTacticalBossBanterEvent = null;
    this.lastTacticalBossBanterContext = null;
    this.lastTacticalBossBanterAt = 0;
    this.tacticalDirectiveSession = null;
    this.tacticalDirectiveHistory = [];
    this.tacticalDirectiveSequence = 0;
    this.lastTacticalDirectiveCompletion = null;
    this.aceBountyActive = null;
    this.aceBountyHistory = [];
    this.aceBountySequence = 0;
    this.lastAceBountyCompletion = null;
    this.activeCabinetWonder = null;
    this.cabinetWonderHistory = [];
    this.cabinetWonderEligibleChecks = 0;
    this.cabinetWonderLastDecision = null;
    this.pendingCabinetWonder = null;
    this.pendingEnemyStartTimeout = null;
    this.capState = {
      bullets: false,
      enemies: false,
      particles: false
    };
    this.pausePressed = false;
    this.achievementTimer = 0;
    this.tauntTimer = 0;
    this.storyTransmissionTimer = 0;
    this.shownStoryTransmissionIds = new Set();
    this.shownCabinetLogIds = new Set();
    this.commsPortraitsReady = null;
    this.lowLivesShownFor = null;
    this.lastMaxLivesVoiceAt = 0;
    this.bossMercyUntilMs = 0;
    this.lastBossMercyBlockLogAt = 0;
    this.lastBossMercyFeedbackAt = 0;
    this.lastBossLifeLossCapBlockLogAt = 0;
    this.bossWipeoutGuard = null;
    this.pendingBossWipeoutRecovery = null;
    this.bossLifeLossCapState = null;
    this.deferredThreatDefeats = [];
    this.deferredThreatDefeatStats = {
      queued: 0,
      flushed: 0,
      firstDefeats: 0
    };
    this.threatDefeatSeenKeys = null;
    this.isCollisionHotPathActive = false;
    this.deferredHotPathScoreProgress = null;
    this.deferredHotPathScoreAwards = {};
    this.deferredCollisionUiFeedback = {
      toasts: [],
      screenShakes: [],
      playerExplosions: [],
      comboFlares: []
    };
    this.deferredLiveRankRefreshRequested = false;
    this.deferredScoreCueRefreshRequested = false;
    this.debugInvincible = false;
    this.debugLastBlockedDamageAt = 0;
    this.debugLevelToolsUsed = false;
    this.maintainerDevtoolsEnabled = false;
    this.ambientBonusDroneTimer = 0;
    this.ambientBonusDrones = []; // Lists for update
    this.isReady = false;
    this.starfieldContainer = null;
    this.starLayers = [];
    this.cosmicTravelLayers = [];
    this.cosmicAuroraBands = [];
    this.cosmicTravelElapsed = 0;
    this.ultrawideAmbience = null;
    this.ultrawideAmbienceDebug = null;
    this.gameplayBackdrop = null;
    this.gameplayStormBackdrop = null;
    this.gameplayBossBackdrop = null;
    this.gameplayBackdropShade = null;
    this.gameplayBackdropLoadGeneration = 0;
    this.gameplayBackdropMode = 'base';
    this.gameplayBackdropTransition = null;
    this.gameplayBackdropElapsedMs = 0;
    this.gameplayBackdropWidth = 0;
    this.gameplayBackdropHeight = 0;
    this.activeMayhemReinforcementWarning = null;
    this.lastMayhemReinforcementPresentation = null;
    this.firstRunOnboardingComplete = true;
    this.firstRunOnboardingUntil = 0;
    this.firstRunOnboardingCompletionTimeout = null;
    this.firstRunControlsShownAt = 0;
    this.bossDossierTexture = null;

    // Voice throttle
    this.lastRankVoiceTime = 0;

    // Score Boost State
    this.scoreMultiplier = 1;
    this.scoreBoostTimer = 0;

    // Bonus Core State
    this.lastBonusCoreTime = 0;
    this.hasActiveBonusCore = false;

    this.buildStamp = null;
    this.playerDiagText = null;
    this.rankDiagText = null;
    this.diagLayout = { width: 0, height: 0 };
    this._lastRankUpSeen = null;
    this._rankUpCount = 0;
    this._rankUpAnimating = false;
    this.pendingRankUpPresentation = null;
    this.activeRankUpPresentation = null;
    this.activeWaveBonusEffect = null;
    this.challengeFlightHud = null;
    this.lastChallengeFlightPresentation = null;
    this.activePersonalBestCelebration = null;
    this.lastPersonalBestCelebration = null;

    // TASK 4: Shooting sound health check
    this.shootSoundHealthCheck = {
      shotsFired: 0,
      lastShotTime: 0,
      lastSoundTime: 0,
      lastSoundKey: 'shoot_small',
      lastRequestIntervalMs: 0,
      totalVolleys: 0,
      totalRequests: 0,
      totalPlayed: 0,
      totalSuppressed: 0,
      recoveredLogged: false,
      lastRecoveryAttempt: 0,
      recoveryAttempts: 0
    };
    this.sceneId = Math.random().toString(36).substring(7);
    this._showRankUpCount = 0;
    this.toastQueue = [];
    this.toastTopQueue = [];
    this.toastCornerQueue = [];
    this.activeCenterToast = null;
    this.activeBossIntroCard = null;
    this.tractorHijack = null;
    this.lastTractorHijack = null;
    this.tractorHijackLayer = null;
    this.overrunClearLayer = null;
    this.overrunClearEffects = [];
    this.overrunMilestoneInterlude = null;
    this.overrunCelebratedMilestones = new Set();
    this._overrunConfirmKeyHandler = null;
    this._overrunConfirmPointerHandler = null;
    this._overrunConfirmPointerTarget = null;
    this.overrunConfirmGamepadWasPressed = false;
    this.gameOverInterlude = null;
    this.criticalHullOverlay = null;
    this.slowTimeVisualField = null;
    this.overrunSealTexture = null;
    this.bossWarningEmblemTextures = [];
    this.bossWarningBossTextures = [];
    this.bossWarningArtTextures = [];
    this.bossHazards = [];
    this.bossHazardLayer = null;
    this.bossHazardLayerHasGeometry = false;
    this.lastBossHazardHit = null;
    this.lastBossHazardCleanup = null;
    this.sectorArrivalStinger = null;
    this.activePickupEffects = new Set();
    this.sectorArrivalArtCache = new Map();
    this.entryAssetWarmupCache = new Map();
    this.preparedRenderTextureKeys = new Set();
    this.levelStartWarmupPending = false;
    this.levelAdvanceWarmupPromise = null;
    this.backgroundLevelEntryWarmupTimeout = null;
    this.backgroundLevelEntryWarmupIdleHandle = null;

    // Ship intro state
    this.introActive = false;
    this.introComplete = false;
    this.introOverlay = null;
    this.shipIntroToken = 0;
    this.introStartTime = 0;
    this.shipIntroTiming = null;
    this.shipIntroReturningPilot = false;
    this.shipCatalogReady = Promise.resolve();
    this.shipCatalogLoaded = false;
    this.shipIntroAssetGatePending = false;
    this.activeTopToast = null;
    this.activeCornerToast = null;
    this.activeAchievementToast = null;
    this.achievementToastQueue = [];
    this.achievementToastTicker = null;
    this.centerToastLockUntil = 0;
    this.toastSlotLockUntil = { center: 0, top: 0, corner: 0 };
    this.loreBag = [];
    this.loreBagIndex = 0;
    this.lastLoreLine = null;
    this.lastLoreAt = 0;
    this.loreCooldownMs = 7200;
    this.lastCabinetLog = null;
    this.lastMajorToastAt = 0;
    this.majorToastCooldownMs = 3500;

    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.bestComboCount = 0;
    this.comboTimerMs = 0;
    this.comboWindowMs = COMBO_WINDOW_MS;
    this.killStreak = 0;
    this.totalKills = 0;
    this.bossKills = 0;
    this.wavesCleared = 0;
    this.noHitWavesThisRun = 0;
    this.flawlessWaveStreak = 0;
    this.noHitSectorsThisRun = 0;
    this.damageTakenThisWave = 0;
    this.damageTakenThisSector = 0;
    this.discoveryBonus = 0;
    this.defeatedBossIds = [];
    this.lifeLossesThisRun = 0;
    this.respawnsThisRun = 0;
    this.extraLivesEarnedThisRun = 0;
    this.lastLifeLossSource = null;
    this.finalLifeLossSource = null;
    this.lifeLostThisWave = false;
    this.lastLifeLossAtMs = 0;
    this.lastLevelClearVoiceDecision = null;
    this.powerupsCollectedThisRun = 0;
    this.repairsGrantedThisRun = 0;
    this.lastKillAt = 0;
    this.lastHitAt = 0;
    this.lastStandReadyAt = 0;
    this.bossClutchShieldLevel = null;
    this.nearMissCooldownAt = 0;
    this.lastNearMissAt = 0;
    this.dangerDodgeCount = 0;
    this.dangerDodgeTimerMs = 0;
    this.bestDangerDodgeStreak = 0;
    this.lastDangerDodgeScore = 0;
    this.nearMissSurgesThisRun = 0;
    this.lastNearMissSurge = null;
    this.grazeBreakReady = false;
    this.grazeBreakArmedAt = 0;
    this.grazeBreakExpiresAt = 0;
    this.grazeBreakCooldownAt = 0;
    this.grazeBreakToken = 0;
    this.grazeBreakNeedsFireRelease = false;
    this.grazeBreakReleasePrimed = false;
    this.currentFirePressed = false;
    this.fireInputWasPressed = false;
    this.grazeBreaksThisRun = 0;
    this.lastGrazeBreak = null;
    this.activeGrazeBreakVisual = null;
    this.lastGrazeBreakVisualDebug = null;
    this.lastComboCelebration = null;
    this.lastPowerupPickupJuice = null;
    this.lastPowerupPickupClaimCue = null;
    this.powerupPickupClaimCue = null;
    this.lastTraitImpactToastAt = 0;
    this.runContractSession = null;
    this.runContractProgressThisRun = new Map();
    this.runContractProgressToastMarkers = new Map();
    this.runContractStartNudgeTimeout = null;
    this.runContractPersistenceDirty = false;
    this.deferredRunContractCompletions = [];
    this.deferredRunContractEnemyDefeats = [];
    this.processingDeferredRunContractEvents = false;
    this.lastRunContractProgressWriteAt = 0;
    this.comboMilestonesReached = new Set(); // Track milestones achieved in current combo

    // Powerup mechanics (orbital strike timer tracked in scene)
    this.orbitalStrikeTimer = 0;

    // Synergy + Meta
    this.synergyBadge = null;
    this.devOverlay = null;
    this.seasonXp = 0;
    this.seasonLevel = 0;
    this.seasonUnlocks = {};
    this.lastScoreSeen = 0;
    this.seasonProgressDirty = false;
    this.lastSeasonProgressWriteAt = 0;
    this.lastBossDefeatedLevel = 0;
    this.postBossLevelIntroPending = false;
    this.freezeTimerMs = 0;
    this.lastHitStopRequestMs = 0;
    this.gameOverSequenceStarted = false;
    this.finalDeathFeedbackShown = false;
    this.gameOverAnimationLayer = null;
    this.gameOverAnimationDebug = null;
    this.stragglerBeaconLayer = null;
    this.lastStragglerBeaconDebug = null;

    // TASK: Fix duplicate wave start
    this._lastStartedLevel = -1;
    this._deathTimeouts = [];
    this._activeTickers = [];
    this.balanceDebug = null;
    this.bossClearRecoveryLevels = new Set();
    this.performanceDiagnostics = null;
    this.viewportLayoutUnsubscribe = null;
  }

  init() {
    this.isReady = false;
    this.clearPickupEffects('scene_init');
    this.activePickupEffects ||= new Set();
    this.clearPersonalBestCelebration('scene_init');
    this.lastPersonalBestCelebration = null;
    this.performanceDiagnostics?.destroy?.();
    this.performanceDiagnostics = createMayhemPerformanceDiagnostics(this);
    this.deferredThreatDefeats = [];
    this.deferredThreatDefeatStats = {
      queued: 0,
      flushed: 0,
      firstDefeats: 0
    };
    this.threatDefeatSeenKeys = this.createThreatDefeatSeenKeyCache();
    this.isCollisionHotPathActive = false;
    this.deferredHotPathScoreProgress = null;
    this.deferredHotPathScoreAwards = {};
    this.deferredCollisionUiFeedback = {
      toasts: [],
      screenShakes: [],
      playerExplosions: [],
      comboFlares: []
    };
    this.deferredLiveRankRefreshRequested = false;
    this.deferredScoreCueRefreshRequested = false;
    if (!this.inputManager || this.inputManager.destroyed) {
      this.inputManager = new InputManager();
    }
    this.inputManager.resetTransientState({ preserveFire: true, suppressUntilReleased: true });
    this.gameplayGame = this.game.createGameplayFacade?.() || this.game;
    this.isPaused = false;
    this.bossClearRecoveryLevels.clear();
    this.pauseOverlay = null;
    this.pauseMenuDecor = null;
    this.settingsOverlay = null;
    this.howToPlayOverlay = null;
    this.tacticalLoadoutOverlay = null;
    this.pausePressed = false;
    this.hadGameplayGamepadConnection = false;
    this.lastGameplayGamepadConnected = false;
    this.setupAutoPauseHandlers();
    this.resetGameplayBackdropState();
    this.clearCabinetWonder('scene_init');
    this.spectacleDirector?.destroy?.();
    this.spectacleDirector = null;
    this.gameContainer.removeChildren();
    this.decorativeOverlay.removeChildren();
    this.uiContainer.removeChildren();
    this.uiOverlay.removeChildren();
    this.applyGameplayViewportMask();
    this.gameContainer.scale.set(1);
    this.gameContainer.position.set(0, 0);
    this.decorativeOverlay.sortableChildren = true;
    this.decorativeOverlay.eventMode = 'none';
    this.ultrawideAmbience = null;
    this.ultrawideAmbienceDebug = null;
    this.uiContainer.sortableChildren = true;
    this.uiOverlay.sortableChildren = true;
    this.spectacleDirector = new SpectacleDirector({
      container: this.decorativeOverlay,
      ticker: this.game?.app?.ticker,
      getWidth: () => this.game.getWidth(),
      getHeight: () => this.game.getHeight(),
      getAccessibilitySettings
    });
    this.criticalHullOverlay = null;
    this.slowTimeVisualField = null;
    this.overrunClearEffects = [];
    this.overrunCelebratedMilestones = new Set();
    this.clearSectorArrivalStinger();
    this.gameOverSequenceStarted = false;
    this.finalDeathFeedbackShown = false;
    this.gameOverAnimationLayer = null;
    this.gameOverAnimationDebug = null;
    this.gameOverFinalTransmissionVariant = reserveNextGameOverFinalTransmissionVariant();
    this.gameOverFinalTransmissionReady = Promise.all([
      GameAssets.ensureGameOverFinalTransmissionTexture?.(this.gameOverFinalTransmissionVariant),
      GameAssets.ensureGameOverFinalSignalTexture?.(this.gameOverFinalTransmissionVariant)
    ]).catch(() => [null, null]);
    this.overrunClearLayer = new PIXI.Container();
    this.overrunClearLayer.zIndex = 9600;
    this.overrunClearLayer.sortableChildren = true;
    this.uiOverlay.addChild(this.overrunClearLayer);
    this.overrunMilestoneInterlude = null;

    // TASK D: Create procedural starfield background
    this.createStarfield();
    this.createUltrawideSideAmbience();
    this.loadBossDossierTexture();
    this.loadBossWarningTextures();
    this.loadOverrunSealTexture();

    // --- Hud & UI ---
    this.hud = new HUD(this.uiContainer, this.game);
    // Note: HUD creates itself in constructor
    this.initMetaProgress();
    this.createSynergyBadge();

    // TASK C: Debug diagnostics removed from gameplay screen
    // const diagStyle = {
    //   fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
    //   fontSize: 12,
    //   fill: '#66fffe',
    //   align: 'left'
    // };
    // this.playerDiagText = createText('', diagStyle);
    // this.playerDiagText.anchor.set(0, 1);
    // this.playerDiagText.zIndex = 9999;
    // this.uiContainer.addChild(this.playerDiagText);

    // this.rankDiagText = createText('', diagStyle);
    // this.rankDiagText.anchor.set(0, 1);
    // this.rankDiagText.zIndex = 9999;
    // this.uiContainer.addChild(this.rankDiagText);

    // this.buildStamp = createText(`build: ${BUILD_ID}`, {
    //   ...diagStyle,
    //   align: 'right'
    // });
    // this.buildStamp.anchor.set(1, 1);
    // this.buildStamp.zIndex = 9999;
    // this.uiContainer.addChild(this.buildStamp);

    // this.updateDiagnosticsLayout();

    // Internal Debug Stats
    this.debugStats = {
      bonusPickupsSpawned: 0,
      bonusPickupsCollected: 0,
      bonusBossSpawned: 0,
      commsPortraitsSpawned: 0
    };

    this.gameTime = 0;
    this.combatTelemetry = createCombatTelemetryState();
    this.shownCabinetLogIds.clear();
    this.lastCabinetLog = null;
    this.totalKills = 0;
    this.bossKills = 0;
    this.wavesCleared = 0;
    this.noHitWavesThisRun = 0;
    this.flawlessWaveStreak = 0;
    this.noHitSectorsThisRun = 0;
    this.bestComboCount = 0;
    this.damageTakenThisWave = 0;
    this.damageTakenThisSector = 0;
    this.discoveryBonus = 0;
    this.defeatedBossIds = [];
    this.lifeLossesThisRun = 0;
    this.respawnsThisRun = 0;
    this.extraLivesEarnedThisRun = 0;
    this.lastLifeLossSource = null;
    this.finalLifeLossSource = null;
    this.lifeLostThisWave = false;
    this.lastLifeLossAtMs = 0;
    this.lastLevelClearVoiceDecision = null;
    this.powerupsCollectedThisRun = 0;
    this.grazeBreaksThisRun = 0;
    this.repairsGrantedThisRun = 0;
    this.dangerDodgeCount = 0;
    this.dangerDodgeTimerMs = 0;
    this.bestDangerDodgeStreak = 0;
    this.lastDangerDodgeScore = 0;
    this.nearMissSurgesThisRun = 0;
    this.lastNearMissSurge = null;
    this.grazeBreakReady = false;
    this.grazeBreakArmedAt = 0;
    this.grazeBreakExpiresAt = 0;
    this.grazeBreakCooldownAt = 0;
    this.grazeBreakToken = 0;
    this.grazeBreakNeedsFireRelease = false;
    this.grazeBreakReleasePrimed = false;
    this.currentFirePressed = false;
    this.fireInputWasPressed = false;
    this.clearGrazeBreakVisual('scene_init');
    this.lastGrazeBreak = null;
    this.lastGrazeBreakVisualDebug = null;
    this.lastComboCelebration = null;
    this.lastPowerupPickupJuice = null;
    this.lastPowerupPickupClaimCue = null;
    this.powerupPickupClaimCue = null;
    this.clearRunContractStartNudge();
    this.clearFirstRunOnboardingCompletion();
    this.firstRunOnboardingUntil = 0;
    this.firstRunControlsShownAt = 0;
    this.firstRunOnboardingComplete = !this.getFirstRunControlsNudge();
    this._rankUpAnimating = false;
    this.pendingRankUpPresentation = null;
    this.activeRankUpPresentation = null;
    this.activeWaveBonusEffect = null;
    this.clearChallengeFlightHud('scene_create');
    this.lastChallengeFlightPresentation = null;
    this.clearPersonalBestCelebration('scene_destroy');
    this.runContractProgressThisRun = new Map();
    this.runContractProgressToastMarkers = new Map();
    this.runContractPersistenceDirty = false;
    this.deferredRunContractCompletions = [];
    this.deferredRunContractEnemyDefeats = [];
    this.processingDeferredRunContractEvents = false;
    this.lastRunContractProgressWriteAt = 0;
    let runContractProgress = this.game?.hangarProgressAtRunStart || readHangarProgressState();
    const runContractsEnabledForRun = isRankedRunMode(this.game?.runMode || RUN_MODES.RANKED);
    if (runContractsEnabledForRun) {
      const preparedRunContracts = prepareRunContractsForEligibleRun(runContractProgress.runContracts);
      runContractProgress = writeHangarProgressState({
        ...runContractProgress,
        runContracts: preparedRunContracts
      });
      if (this.game) this.game.hangarProgressAtRunStart = runContractProgress;
      this.runContractSession = startRunContractSession({
        runMode: this.game?.runMode || RUN_MODES.RANKED,
        progress: runContractProgress
      });
      const currentPilotRankIndex = Math.max(
        0,
        Math.floor(Number(runContractProgress?.pilotRank) || 0),
        Math.floor(Number(runContractProgress?.highestPilotRank) || 0),
        Math.floor(Number(runContractProgress?.bestRank) || 0)
      );
      this.emitRunContractEvent('pilot_rank_reached', {
        rankIndex: currentPilotRankIndex,
        displayRank: currentPilotRankIndex + 1,
        sector: this.game?.level || 1,
        suppressProgressToast: true
      });
      this.emitRunContractEvent('run_started', {
        sector: this.game?.level || 1,
        suppressProgressToast: true
      });
    } else {
      this.runContractSession = null;
    }
    this.blinkDriveOrderStartedAt = null;
    this.blinkDriveOrderCompleted = false;
    this.playerPhaseWasActive = false;
    this.levelAdvancePending = false;
    this.dailySignalFinishPending = false;
    this.postBossLevelIntroPending = false;
    this.levelAdvanceTimeout = null;
    this.clearTacticalDraft('run_reset');
    this.tacticalDraftHistory = [];
    this.tacticalDraftRescansRemaining = 1;
    this.tacticalDraftRescansUsed = 0;
    this.tacticalDraftHeldId = null;
    this.tacticalDraftBansRemaining = TACTICAL_DRAFT_BAN_COUNT;
    this.tacticalDraftBannedIds = [];
    this.tacticalScoreRouteDecision = null;
    this.tacticalDirectiveSession = null;
    this.tacticalDirectiveHistory = [];
    this.tacticalDirectiveSequence = 0;
    this.lastTacticalDirectiveCompletion = null;
    this.aceBountyActive = null;
    this.aceBountyHistory = [];
    this.aceBountySequence = 0;
    this.lastAceBountyCompletion = null;
    this.cabinetWonderHistory = [];
    this.cabinetWonderEligibleChecks = 0;
    this.cabinetWonderLastDecision = null;
    this.pendingCabinetWonder = null;
    this.clearPendingEnemyStart();
    this.capState = { bullets: false, enemies: false, particles: false };
    this.firstRunKillCount = 0;
    this.firstRunPickupDropped = false;
    this.bossClutchShieldLevel = null;
    this._lastStartedLevel = -1;
    this.introActive = false;
    this.introComplete = false;
    this.introStartTime = 0;
    this.shipIntroTiming = null;
    this.shipIntroReturningPilot = false;
    this.shipIntroToken += 1;
    if (this.introOverlay?.parent) {
      this.introOverlay.parent.removeChild(this.introOverlay);
    }
    this.introOverlay = null;

    const width = this.gameplayGame.getWidth();
    const height = this.gameplayGame.getHeight();

    // Initialize managers
    const capHandler = this.logCap.bind(this);
    this.bulletManager = new BulletManager(this.gameContainer, capHandler);
    this.bulletManager.setScreenBounds(width, height);
    this.particleManager = new ParticleManager(this.gameContainer, capHandler);
    this.particleManager.prewarm?.(384);
    this.powerupManager = new PowerupManager(this.gameContainer, this.gameplayGame);
    this.screenShake = new ScreenShake(this.gameContainer);
    this.applyGameplayViewportTransform();
    this.viewportLayoutUnsubscribe?.();
    this.viewportLayoutUnsubscribe = addResponsiveListener(() => {
      this.applyGameplayViewportTransform();
      this.layoutTacticalDraft();
    });
    this.scorePopupManager = new ScorePopupManager(this.uiContainer);
    this.gameContainer.sortableChildren = true;
    this.tractorHijack = null;
    this.lastTractorHijack = null;
    this.tractorHijackLayer = new PIXI.Graphics();
    this.tractorHijackLayer.zIndex = 65;
    this.tractorHijackLayer.blendMode = 'add';
    this.gameContainer.addChild(this.tractorHijackLayer);
    this.bossHazards = [];
    this.lastBossHazardHit = null;
    this.lastBossHazardCleanup = null;
    this.bossHazardLayerHasGeometry = false;
    this.bossHazardLayer = new PIXI.Graphics();
    this.bossHazardLayer.zIndex = 66;
    this.gameContainer.addChild(this.bossHazardLayer);
    this.stragglerBeaconLayer = new PIXI.Graphics();
    this.stragglerBeaconLayer.label = 'stragglerBeaconLayer';
    this.stragglerBeaconLayer.zIndex = 72;
    this.stragglerBeaconLayer.blendMode = 'add';
    this.stragglerBeaconLayer.visible = false;
    this.gameContainer.addChild(this.stragglerBeaconLayer);

    const params = new URLSearchParams(window.location.search);
    const spriteKey = this.game.selectedShipSpriteKey || getDefaultShipKey();
    const initialRank = Number.isFinite(this.game.rankIndex) ? this.game.rankIndex : 1;
    const selectedShipTextureIndex = getShipMetadata(spriteKey)?.textureIndex ?? 0;
    const controlSmoke = params.get('controlSmoke') === '1';
    this.controlSmokeMode = controlSmoke;
    this.maintainerDevtoolsEnabled = isMaintainerDevtoolsEnabled();
    const logShipDebug = () => {
      if (!this.player) return;
      console.log(`[ShipDebug] Build: ${BUILD_ID || 'OPTIMIZED'}`);
      console.log(`[ShipDebug] Selected: ${this.game.selectedShipSpriteKey}`);
      console.log(`[ShipDebug] Active: ${this.player.selectedShipSpriteKey}`);
      console.log(`[ShipDebug] PlayerSprite: exists=${!!this.player.sprite} alpha=${this.player.sprite?.alpha} visible=${this.player.sprite?.visible} x=${this.player.sprite?.x} y=${this.player.sprite?.y}`);
      const textureSource = this.player.shipSprite?.texture?.source;
      console.log(`[ShipDebug] Texture: ${textureSource?.resource?.url || textureSource?.label || 'loaded'}`);
    };
    const startIntroFromPlayer = (source) => {
      if (this.game?.currentScene !== this || !this.player || this.introActive || this.introComplete) return;
      const currentRank = Number.isFinite(this.game.rankIndex) ? this.game.rankIndex : initialRank;
      this._lastRankUpSeen = currentRank;
      this.player.setRank(currentRank, source);
      this.applySeasonCosmetics();
      logShipDebug();
      if (controlSmoke) {
        this.introActive = false;
        this.introComplete = true;
        this.startLevelWhenWarm('controlSmoke');
      } else {
        this.startShipIntro(spriteKey);
      }
    };
    const selectedShipReady = GameAssets.ensureRankShipTexture(selectedShipTextureIndex)
      .then(() => {
        if (this.game?.currentScene === this && this.player?.rebuildShipSprite) {
          this.player.rebuildShipSprite('selected_ship_ready');
        }
      })
      .catch((error) => {
        console.warn('[PlayScene] Selected ship texture preload failed:', error);
      });
    Promise.race([
      selectedShipReady,
      new Promise((resolve) => setTimeout(resolve, 2500))
    ]).then(() => startIntroFromPlayer('selected_ship_ready'));
    this.shipCatalogLoaded = false;
    this.shipIntroAssetGatePending = false;
    this.shipCatalogReady = selectedShipReady.finally(() => {
      return GameAssets.loadShips()
        .then(() => {
          this.shipCatalogLoaded = true;
          if (this.game?.currentScene !== this || !this.player?.rebuildShipSprite) return;
          this.player.rebuildShipSprite('ship_catalog_ready');
          console.log('[PlayScene] Ship catalog ready for current run');
          if (this.shipIntroAssetGatePending && this.introComplete && this.enemyManager && this.game.level) {
            this.shipIntroAssetGatePending = false;
            this.startLevelWhenWarm('introCompleteAssetsReady');
          }
        })
        .catch((error) => {
          this.shipCatalogLoaded = true;
          console.warn('[PlayScene] Ship catalog preload failed:', error);
          if (this.shipIntroAssetGatePending && this.introComplete && this.enemyManager && this.game.level) {
            this.shipIntroAssetGatePending = false;
            this.startLevelWhenWarm('introCompleteAssetFallback');
          }
        });
    });
    this.shipCatalogReady.finally(() => {
      RankAssets.preloadAll().catch((error) => {
        console.warn('[PlayScene] Rank badge preload failed:', error);
      });
    });

    // Create a fresh player for each run so movement reads the current InputManager.
    if (this.player) {
      this.player.destroy?.();
      if (this.player.sprite?.parent) {
        this.player.sprite.parent.removeChild(this.player.sprite);
      }
    }
    this.player = new Player(width / 2, height - 100, this.inputManager, this.gameplayGame, spriteKey);
    this.gameContainer.addChild(this.player.sprite);
    if (this.player.setRank) {
      this.player.setRank(initialRank, 'init_placeholder');
    }
    const tacticalBaselineAugmentIds = this.game?.getRunModeProfile?.()?.tacticalBaselineAugmentIds || [];
    this.overrunBaselineAugmentIds = tacticalBaselineAugmentIds
      .filter((id) => this.player.applyRunAugment?.(id)?.applied);
    this.applySeasonCosmetics();
    this.startNextTacticalDirective('run_start');

    // Create enemy manager
    this.enemyManager = new EnemyManager(this.gameContainer, this.gameplayGame, capHandler);
    this.game.flushAchievementToasts?.(this);

    this.initBalanceDebug(params);
    const debugToken = params.get('debugBossToken');
    if (this.canUseMaintainerDevtools() && debugToken === 'NOVA_DEBUG_2026') {
      this.game.markUnrankedRun?.('debug_route');
      const startLevel = Number(params.get('startLevel'));
      const startAtBoss = params.get('startAtBoss') === '1';
      const debugPowerups = params.get('debugPowerups') === '1';
      const debugOverlay = params.get('debugOverlay') === '1';
      if (Number.isFinite(startLevel) && startLevel > 0) {
        this.debugStartLevel = Math.floor(startLevel);
      }
      this.debugStartAtBoss = startAtBoss;
      this.debugPowerups = debugPowerups;
      this.debugOverlayEnabled = debugOverlay;
      console.log(`[Debug] enabled startLevel=${this.debugStartLevel ?? 'default'} startAtBoss=${startAtBoss} debugPowerups=${debugPowerups} debugOverlay=${debugOverlay}`);
    }
    // Ensure Assets are ready for gameplay
    GameAssets.ensureBonusCoreTexture().then(tex => {
      if (!GameAssets.isValidTexture(tex)) {
        console.error('[PlayScene] Bonus core texture failed to load.');
      } else {
        console.log('[PlayScene] Bonus core texture ready.');
      }
    });
    this.powerupAssetsReady = GameAssets.loadPowerupAssets()
      .then((textures) => {
        console.log('[PlayScene] Powerup textures ready:', Object.keys(textures || {}).length);
      })
      .catch((error) => {
        console.warn('[PlayScene] Powerup texture preload failed:', error);
      });
    this.commsPortraitsReady = GameAssets.loadCommsPortraits();

    // Initialize touch controls
    try {
      this.touchControls = new TouchControls(this.uiContainer, this.game);
      this.touchControls.init();
    } catch (error) {
      console.warn('[PlayScene] TouchControls init failed, using NullTouchControls', error);
      this.touchControls = new NullTouchControls();
    }

    // Add Debug Keys
    if (!this.canUseMaintainerDevtools() && this._debugKeyHandler) {
      window.removeEventListener('keydown', this._debugKeyHandler);
      this._debugKeyHandler = null;
    }
    if (this.canUseMaintainerDevtools() && !this._debugKeyHandler) {
      this._debugKeyHandler = (e) => this.handleDebugKeys(e);
      window.addEventListener('keydown', this._debugKeyHandler);
    }
    if (this.canUseMaintainerDevtools() && typeof window !== 'undefined') {
      const forceSuperStorm = () => this.debugForceMayhemSuperStorm('console');
      forceSuperStorm.playScene = this;
      window.__novaForceMayhemSuperStorm = forceSuperStorm;
      const forceSuperExtraLife = () => this.debugForceSuperExtraLife('console');
      forceSuperExtraLife.playScene = this;
      window.__novaForceSuperExtraLife = forceSuperExtraLife;
      const forceNovaMiracle = () => this.debugForceNovaMiracle('console');
      forceNovaMiracle.playScene = this;
      window.__novaForceNovaMiracle = forceNovaMiracle;
      const forceRareChaosVisitor = (variantNumber = 1) => this.enemyManager?.debugForceRareChaosVisitor?.(variantNumber, 'console');
      forceRareChaosVisitor.playScene = this;
      window.__novaForceRareChaosVisitor = forceRareChaosVisitor;
    }

    // Start first level - DEFERRED until intro complete
    // this.startLevel();
    this.initLoreBag();

    console.log(`PlayScene build:${BUILD_ID}`);
    this.isReady = true;
  }

  getActivePlayfieldRect() {
    if (typeof this.game?.getActivePlayfieldRect === 'function') {
      return this.game.getActivePlayfieldRect();
    }
    const width = this.game?.getWidth?.() || this.game?.app?.screen?.width || 1920;
    const height = this.game?.getHeight?.() || this.game?.app?.screen?.height || 1080;
    return { x: 0, y: 0, width, height, scale: 1 };
  }

  applyGameplayViewportTransform() {
    if (!this.gameContainer) return null;
    const rect = this.getActivePlayfieldRect();
    const scale = Math.max(0.01, Number(rect.scale) || 1);
    this.gameContainer.scale.set(scale);
    this.updateGameplayViewportMask(rect);
    this.screenShake?.setOrigin?.(rect.x, rect.y);
    if (!this.screenShake || this.screenShake.shakeDuration <= 0) {
      this.gameContainer.x = rect.x;
      this.gameContainer.y = rect.y;
    }
    this.syncUltrawideSideAmbienceLayout(rect);
    this.bulletManager?.setScreenBounds?.(this.gameplayGame.getWidth(), this.gameplayGame.getHeight());
    return rect;
  }

  updateGameplayViewportMask(rect = this.getActivePlayfieldRect()) {
    if (!this.gameplayViewportMask || !rect) return;
    const x = Math.round(Number(rect.x) || 0);
    const y = Math.round(Number(rect.y) || 0);
    const width = Math.max(1, Math.round(Number(rect.width) || this.gameplayGame?.getWidth?.() || 1920));
    const height = Math.max(1, Math.round(Number(rect.height) || this.gameplayGame?.getHeight?.() || 1080));
    this.gameplayViewportMask.clear();
    this.gameplayViewportMask.rect(x, y, width, height);
    this.gameplayViewportMask.fill({ color: 0xffffff, alpha: 1 });
    this.gameplayViewportMask.renderable = true;
    this.gameplayViewportMask.includeInBuild = false;
  }

  applyGameplayViewportMask() {
    if (!this.gameContainer || !this.gameplayViewportMask) return;
    this.gameplayViewportMask.eventMode = 'none';
    this.gameContainer.mask = this.gameplayViewportMask;
    this.gameplayViewportMask.renderable = true;
    this.gameplayViewportMask.includeInBuild = false;
  }

  getGameplayContainerOrigin() {
    const rect = this.getActivePlayfieldRect();
    return { x: rect.x || 0, y: rect.y || 0 };
  }

  canUseMaintainerDevtools() {
    return this.maintainerDevtoolsEnabled === true || isMaintainerDevtoolsEnabled();
  }

  handleDebugKeys(e) {
    if (!this.canUseMaintainerDevtools()) return;
    if (e.repeat) return;
    if (this.handleDebugNumberKey(e)) {
      e.preventDefault?.();
      return;
    }
    if (e.key === 'F1') {
      console.log('DEBUG STATS:', this.debugStats);
      this.showToast('DEBUG STATS LOGGED (Console)', { fontSize: 20 });
    }
    if (e.key === 'F2') {
      this.powerupManager.spawn(this.player.x, 100, true);
      this.showToast('SPAWNED BONUS PICKUP', { fontSize: 20 });
    }
    if (e.key === 'F3') {
      this.enemyManager.spawnBoss(this.game.level);
      this.showToast('SPAWNED BOSS', { fontSize: 20 });
    }
    if (e.key === 'F4') {
      for (let i = 0; i < 5; i++) this.enemyManager.spawnEnemy();
      this.showToast('SPAWNED ENEMIES', { fontSize: 20 });
    }
    if (e.key === 'F5') {
      this.showStoryTransmission({ force: true });
      this.showToast('TRIGGERED STORY SIGNAL', { fontSize: 20 });
    }
  }

  handleDebugNumberKey(e) {
    const key = e.code || e.key;
    if (key === 'Digit1' || key === 'Numpad1' || e.key === '1') {
      this.toggleDebugInvincibility();
      return true;
    }
    if ((key === 'KeyM' || e.key?.toLowerCase?.() === 'm') && e.shiftKey) {
      this.debugForceMayhemSuperStorm('debug_key');
      return true;
    }
    if ((key === 'KeyL' || e.key?.toLowerCase?.() === 'l') && e.shiftKey) {
      this.debugForceSuperExtraLife('debug_key');
      return true;
    }
    if (key === 'KeyL' || e.key?.toLowerCase?.() === 'l') {
      this.promptDebugLevelJump();
      return true;
    }
    if (key === 'PageUp') {
      this.debugJumpToLevel((Number(this.game?.level) || 1) + 1, 'debug_level_up_key');
      return true;
    }
    if (key === 'PageDown') {
      this.debugJumpToLevel((Number(this.game?.level) || 1) - 1, 'debug_level_down_key');
      return true;
    }
    return false;
  }

  handleMarketingSpawnKey() {
    // Retired: number keys are reserved for debug survival/level tooling now.
    // Keep the marker for release-line guards until the old marketing hotkeys are fully removed.
    return false;
  }

  isDebugInvincibleActive() {
    return this.canUseMaintainerDevtools() && this.debugInvincible === true;
  }

  toggleDebugInvincibility() {
    if (!this.canUseMaintainerDevtools()) return false;
    this.debugInvincible = !this.debugInvincible;
    this.game?.markUnrankedRun?.('debug_invincible');
    if (this.debugInvincible && this.player?.grantInvulnerability) {
      this.player.grantInvulnerability(1200, 'debug_invincible_toggle');
    }
    this.showToast(translateText(this.debugInvincible ? 'DEBUG INVINCIBLE ON' : 'DEBUG INVINCIBLE OFF'), {
      fontSize: 18,
      fill: this.debugInvincible ? '#7dffcc' : '#ffb35c',
      duration: 1400,
      slot: 'corner',
      type: 'debug',
      priority: 4
    });
    console.log(`[DebugTools] invincible=${this.debugInvincible}`);
    return true;
  }

  onDebugDamageBlocked(source = 'damage') {
    const now = Date.now();
    if (now - (this.debugLastBlockedDamageAt || 0) < 900) return false;
    this.debugLastBlockedDamageAt = now;
    this.particleManager?.createHitSpark(this.player?.x || 0, this.player?.y || 0, 0x7dffcc);
    this.showToast(translateText('DEBUG SHIELD'), {
      fontSize: 14,
      fill: '#7dffcc',
      duration: 650,
      slot: 'corner',
      type: 'debug',
      priority: 2
    });
    console.log(`[DebugTools] blocked_damage source=${source}`);
    return true;
  }

  promptDebugLevelJump() {
    if (!this.canUseMaintainerDevtools()) return false;
    const current = Math.max(1, Number(this.game?.level) || 1);
    const input = window.prompt?.(translateText('Debug jump to level'), String(current));
    if (input == null) return false;
    return this.debugJumpToLevel(Number(input), 'debug_level_prompt');
  }

  clearDebugProjectiles() {
    return this.bulletManager?.clearAll?.('debug_projectile_clear') || 0;
  }

  debugJumpToLevel(level, reason = 'debug_level_jump') {
    if (!this.canUseMaintainerDevtools()) return false;
    const targetLevel = Math.max(1, Math.min(999, Math.floor(Number(level) || 1)));
    if (!this.game || !this.enemyManager) return false;
    this.game.markUnrankedRun?.(reason);
    this.debugLevelToolsUsed = true;
    this.introActive = false;
    this.introComplete = true;
    this.levelAdvancePending = false;
    this.postBossLevelIntroPending = false;
    this.debugStartLevel = null;
    this.debugStartAtBoss = false;
    if (this.levelAdvanceTimeout) {
      clearTimeout(this.levelAdvanceTimeout);
      this.levelAdvanceTimeout = null;
    }
    this.clearPendingEnemyStart();
    this.clearDebugProjectiles();
    this.clearBossHazards('debug_level_jump');
    this.bossMercyUntilMs = 0;
    this.resetBossLifeLossCap('debug_level_jump');
    this.resetBossWipeoutGuard('debug_level_jump');
    this.game.level = targetLevel;
    const computedRank = rankManager.getRankFromLevel(targetLevel);
    this.game.rankIndex = computedRank;
    this.game.lastRankIndex = Math.max(Number(this.game.lastRankIndex) || 0, computedRank);
    this.player?.setRank?.(computedRank, reason);
    this._lastStartedLevel = null;
    this.startLevel(reason);
    this.showToast(translateText('DEBUG LEVEL {level}', { level: targetLevel }), {
      fontSize: 18,
      fill: '#7ee9ff',
      duration: 1400,
      slot: 'corner',
      type: 'debug',
      priority: 4
    });
    console.log(`[DebugTools] jump_level=${targetLevel} rank=${computedRank} reason=${reason}`);
    return true;
  }

  debugForceMayhemSuperStorm(reason = 'debug_mayhem_super_storm') {
    if (!this.canUseMaintainerDevtools()) return false;
    this.game?.markUnrankedRun?.(reason);
    this.debugLevelToolsUsed = true;
    const result = this.enemyManager?.forceMayhemSuperStormForDebug?.();
    if (result?.ok) {
      this.showToast(`FORCED SUPER STORM x${result.groupCount}`, {
        fontSize: this.game.getWidth() < 620 ? 16 : 20,
        fill: '#ff5df7',
        stroke: '#160006',
        strokeThickness: 3,
        type: 'debug',
        slot: 'top',
        priority: 7,
        duration: 1400
      });
      return true;
    }
    this.showToast(`SUPER STORM BLOCKED: ${result?.reason || 'unknown'}`, {
      fontSize: this.game.getWidth() < 620 ? 14 : 18,
      fill: '#ffb35c',
      stroke: '#160006',
      strokeThickness: 3,
      type: 'debug',
      slot: 'top',
      priority: 7,
      duration: 1600
    });
    return false;
  }

  debugForceSuperExtraLife(reason = 'debug_super_extra_life') {
    if (!this.canUseMaintainerDevtools()) return false;
    if (!this.powerupManager || !this.player || !this.game) return false;
    this.game?.markUnrankedRun?.(reason);
    this.debugLevelToolsUsed = true;
    const gameplayWidth = this.gameplayGame.getWidth();
    const gameplayHeight = this.gameplayGame.getHeight();
    const x = Math.max(90, Math.min(gameplayWidth - 90, this.player.x + (Math.random() < 0.5 ? -150 : 150)));
    const y = Math.max(88, gameplayHeight * 0.24);
    const spawned = this.powerupManager.spawnSpecific(x, y, 'super_extra_life', {
      source: reason
    });
    this.showToast(spawned ? 'SUPER EXTRA LIFE SPAWNED' : 'SUPER EXTRA LIFE BLOCKED', {
      fontSize: this.game.getWidth() < 620 ? 14 : 18,
      fill: spawned ? '#ff5df7' : '#ffb35c',
      stroke: '#160006',
      strokeThickness: 3,
      type: 'debug',
      slot: 'top',
      priority: 7,
      duration: 1500
    });
    return Boolean(spawned);
  }

  debugForceNovaMiracle(reason = 'debug_nova_miracle') {
    if (!this.canUseMaintainerDevtools()) return false;
    if (!this.powerupManager || !this.player || !this.game) return false;
    this.game?.markUnrankedRun?.(reason);
    this.debugLevelToolsUsed = true;
    const gameplayWidth = this.gameplayGame.getWidth();
    const gameplayHeight = this.gameplayGame.getHeight();
    const x = Math.max(90, Math.min(gameplayWidth - 90, this.player.x));
    const y = Math.max(88, gameplayHeight * 0.22);
    const spawned = this.powerupManager.spawnSpecific(x, y, 'nova_miracle', {
      source: reason
    });
    this.showToast(spawned ? 'NOVA MIRACLE SPAWNED' : 'NOVA MIRACLE BLOCKED', {
      fontSize: this.game.getWidth() < 620 ? 14 : 18,
      fill: spawned ? '#fff3a0' : '#ffb35c',
      stroke: '#160006',
      strokeThickness: 3,
      type: 'debug',
      slot: 'top',
      priority: 7,
      duration: 1500
    });
    return Boolean(spawned);
  }

  activateMarketingSpawnMode(reason = 'marketing_spawn_debug') {
    if (!this.canUseMaintainerDevtools()) return false;
    if (!this.enemyManager || !this.game || this.game?.currentScene !== this || !this.isReady) {
      return false;
    }
    this.game.markUnrankedRun?.(reason);
    this.enemyManager.enableMarketingDebugMode?.();
    this.introActive = false;
    this.introComplete = true;
    return true;
  }

  spawnMarketingDebugWave() {
    if (!this.activateMarketingSpawnMode()) return;
    const result = this.enemyManager.spawnMarketingDebugWave?.();
    const count = result?.count || 0;
    this.showToast(`MARKETING WAVE +${count}`, {
      fontSize: 18,
      fill: '#8fffd5',
      duration: 1200,
      slot: 'corner',
      type: 'debug',
      priority: 4
    });
  }

  spawnMarketingDebugMiniBoss() {
    if (!this.activateMarketingSpawnMode()) return;
    const result = this.enemyManager.spawnMarketingDebugMiniBoss?.();
    this.showToast(result?.displayName ? `MINI-BOSS: ${result.displayName}` : 'MINI-BOSS SPAWNED', {
      fontSize: 18,
      fill: '#ffd166',
      duration: 1300,
      slot: 'corner',
      type: 'debug',
      priority: 4,
      maxWidth: this.game.getWidth() * 0.46
    });
  }

  spawnMarketingDebugBoss() {
    if (!this.activateMarketingSpawnMode()) return;
    this.showToast('BOSS INBOUND...', {
      fontSize: 18,
      fill: '#ff8fdf',
      duration: 1100,
      slot: 'corner',
      type: 'debug',
      priority: 4,
      maxWidth: this.game.getWidth() * 0.46
    });
    this.enemyManager.spawnMarketingDebugBoss?.().then((result) => {
      this.showToast(result?.name ? `BOSS: ${result.name}` : 'BOSS SPAWNED', {
        fontSize: 18,
        fill: '#ff8fdf',
        duration: 1500,
        slot: 'corner',
        type: 'debug',
        priority: 4,
        maxWidth: this.game.getWidth() * 0.46
      });
    }).catch((error) => {
      console.warn('[MarketingDebug] boss spawn failed:', error?.message || error);
    });
  }

  updateDiagnosticsLayout() {
    if (!this.game || !this.game.app) return;
    const { width, height } = this.game.app.screen;
    if (this.diagLayout.width === width && this.diagLayout.height === height) return;
    this.diagLayout.width = width;
    this.diagLayout.height = height;

    const margin = 8;
    const fontSize = width < 500 ? 10 : 12;
    const lineHeight = Math.round(fontSize * 1.2);

    if (this.playerDiagText) {
      this.playerDiagText.style.fontSize = fontSize;
      this.playerDiagText.x = margin;
      this.playerDiagText.y = height - margin - lineHeight;
    }

    if (this.rankDiagText) {
      this.rankDiagText.style.fontSize = fontSize;
      this.rankDiagText.x = margin;
      this.rankDiagText.y = height - margin;
    }

    if (this.buildStamp) {
      this.buildStamp.style.fontSize = fontSize;
      this.buildStamp.x = width - margin;
      this.buildStamp.y = height - margin;
    }

    if (this.synergyBadge) {
      this.synergyBadge.x = width * 0.82;
      this.synergyBadge.y = height * 0.1;
    }
    if (this.devOverlay) {
      this.devOverlay.y = height - margin;
    }
  }

  initBalanceDebug(params = null) {
    const enabled = this.isBalanceDebugRequested(params);
    this.balanceDebug = null;
    if (!enabled) return;

    this.game?.markUnrankedRun?.('balance_debug');
    this.balanceDebug = {
      startedAt: Date.now(),
      selectedShip: this.game?.selectedShipSpriteKey || getDefaultShipKey(),
      runMode: this.game?.runMode || 'unranked',
      killsByEnemyType: {},
      damageTakenBySource: {},
      pickupsCollected: {},
      deaths: 0,
      respawns: 0,
      lastDamageSource: null,
      lastDeathSource: null,
      finalDeathSource: null,
      bossEncounters: [],
      currentBossEncounter: null,
      currentBossRef: null,
      lastBossSampleAt: 0,
      flushed: false
    };
    console.log('[BalanceDebug] enabled; run marked unranked. Use ?balanceDebug=1 or localStorage nova.balanceDebug=1.');
  }

  isBalanceDebugRequested(params = null) {
    if (!this.canUseMaintainerDevtools()) return false;
    const queryEnabled = params?.get?.('balanceDebug') === '1' || params?.get?.('balance_debug') === '1';
    if (queryEnabled) return true;
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('nova.balanceDebug') === '1';
    } catch {
      return false;
    }
  }

  recordBalanceKill(enemy) {
    const stats = this.balanceDebug;
    if (!stats || !enemy) return;
    const key = enemy.type || enemy.id || enemy.kind || enemy.bossType || 'unknown';
    stats.killsByEnemyType[key] = (stats.killsByEnemyType[key] || 0) + 1;
  }

  recordBalanceDamage(source = 'unknown') {
    const stats = this.balanceDebug;
    if (!stats) return;
    const key = String(source || 'unknown');
    stats.damageTakenBySource[key] = (stats.damageTakenBySource[key] || 0) + 1;
    stats.lastDamageSource = key;
    if ((Number(this.game?.lives) || 0) <= 1) {
      stats.finalDeathSource = key;
    }
  }

  recordBalanceLifeLost() {
    const stats = this.balanceDebug;
    if (!stats) return;
    stats.deaths += 1;
    stats.lastDeathSource = stats.lastDamageSource || 'unknown';
    if ((Number(this.game?.lives) || 0) <= 0) {
      stats.finalDeathSource = stats.lastDeathSource;
    }
  }

  recordBalanceRespawn() {
    if (this.balanceDebug) this.balanceDebug.respawns += 1;
  }

  recordBalancePickup(powerup) {
    if (powerup) this.powerupsCollectedThisRun = (Number(this.powerupsCollectedThisRun) || 0) + 1;
    if (powerup?.type) {
      this.emitRunContractEvent('powerup_collected', {
        powerupType: powerup.type,
        sector: this.game?.level || 1
      });
      this.emitTacticalDirectiveEvent('powerup_collected', {
        powerupType: powerup.type,
        sector: this.game?.level || 1
      });
      if (powerup.type === 'blink_drive') {
        this.blinkDriveOrderStartedAt = Number(this.gameTime) || 0;
        this.blinkDriveOrderCompleted = false;
      }
    }
    const stats = this.balanceDebug;
    if (!stats || !powerup) return;
    const key = powerup.type || 'unknown';
    stats.pickupsCollected[key] = (stats.pickupsCollected[key] || 0) + 1;
  }

  emitRunContractEvent(type, payload = {}) {
    if (!this.runContractSession) return [];
    const { suppressProgressToast = false, deferPersistence = false, ...eventPayload } = payload || {};
    const previousActive = Array.isArray(this.runContractSession.active)
      ? this.runContractSession.active.map((item) => ({ ...item }))
      : [];
    const result = applyRunContractEvent(this.runContractSession, {
      ...eventPayload,
      type,
      sector: eventPayload.sector || this.game?.level || 1
    });
    this.runContractSession = result.session;
    const progressChanges = this.getRunContractProgressChanges(previousActive, result.session?.active || [], result.completed || []);
    progressChanges.forEach((change) => {
      this.recordRunContractProgressThisRun(change);
      if (!suppressProgressToast) this.showRunContractProgress(change);
    });
    if (this.shouldPersistRunContractProgress(type, result)) {
      if (deferPersistence) {
        this.runContractPersistenceDirty = true;
      } else {
        this.persistRunContractSessionProgress();
      }
    }
    for (const completion of result.completed || []) {
      if (deferPersistence) {
        this.queueDeferredRunContractCompletion(completion);
      } else {
        this.persistRunContractCompletion(completion);
      }
      this.showRunContractCompletion(completion.id);
    }
    return result.completed || [];
  }

  startNextTacticalDirective(reason = 'advance') {
    if (this.tacticalDirectiveHistory.length >= TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP) {
      this.tacticalDirectiveSession = null;
      return null;
    }
    const currentSector = Math.max(1, Math.floor(Number(this.game?.level) || 1));
    const recentHistory = this.tacticalDirectiveHistory.slice(-3);
    const seed = this.game?.contentDirector?.seed
      || `${BUILD_ID || 'nova-swarm'}:${this.game?.runStartedAtMs || 0}:${this.game?.selectedShipSpriteKey || 'ship'}`;
    const maxTier = getTacticalDirectiveTierCeiling(currentSector, this.tacticalDirectiveHistory.length);
    const directive = pickTacticalDirective(seed, this.tacticalDirectiveSequence, {
      excludeIds: this.tacticalDirectiveHistory.map((entry) => entry.directiveId),
      excludeObjectiveIds: recentHistory.map((entry) => entry.objectiveId),
      excludeRewardIds: recentHistory.slice(-2).map((entry) => entry.rewardId),
      maxTier
    });
    this.tacticalDirectiveSequence += 1;
    this.tacticalDirectiveSession = createTacticalDirectiveSession(directive);
    if (this.tacticalDirectiveSession) {
      const eligibleFromSector = getNextTacticalDirectiveEligibleSector(this.tacticalDirectiveHistory, currentSector);
      this.tacticalDirectiveSession.eligibleFromSector = eligibleFromSector;
      this.tacticalDirectiveSession.startedInSector = eligibleFromSector;
      this.tacticalDirectiveSession.lastProgressSector = eligibleFromSector;
      this.tacticalDirectiveSession.lastCalibrationSector = eligibleFromSector;
      this.tacticalDirectiveSession.reason = reason;
    }
    return this.getTacticalDirectiveDebugState();
  }

  emitTacticalDirectiveEvent(type, payload = {}) {
    const before = getTacticalDirectiveState(this.tacticalDirectiveSession);
    if (!before || before.event !== type || before.completed) return false;
    const result = applyTacticalDirectiveEvent(this.tacticalDirectiveSession, {
      ...payload,
      type,
      sector: payload.sector || this.game?.level || 1
    });
    this.tacticalDirectiveSession = result.session;
    if (!result.changed) return false;
    const after = getTacticalDirectiveState(this.tacticalDirectiveSession);
    this.showTacticalDirectiveMomentum(before, after);
    if (!result.completed) return true;

    const completedAt = Date.now();
    const completion = {
      directiveId: before.id,
      objectiveId: before.objectiveId,
      objectiveLabel: before.objectiveLabel,
      target: before.target,
      tier: before.tier,
      rewardId: before.rewardId,
      rewardLabel: before.rewardLabel,
      rewardKind: before.rewardKind,
      rewardPowerupType: before.rewardPowerupType,
      sector: Math.max(1, Math.floor(Number(this.game?.level) || 1)),
      completedAt,
      rewardSpawnKey: `tactical_directive:${this.game?.runStartedAtMs || 0}:${this.tacticalDirectiveHistory.length}:${before.id}:${completedAt}`
    };
    const sectorsUsed = Math.max(0, completion.sector - Math.max(1, Number(this.tacticalDirectiveSession?.startedInSector) || completion.sector));
    completion.momentumBonus = sectorsUsed <= 1
      ? Number(this.addNormalWaveScore(300 + completion.tier * 40, 'directiveMomentumBonus')) || 0
      : 0;
    this.tacticalDirectiveHistory.push(completion);
    this.lastTacticalDirectiveCompletion = completion;
    this.applyTacticalDirectiveReward(completion);
    this.showTacticalDirectiveCompletion(completion);
    this.startNextTacticalDirective('completion');
    return true;
  }

  showTacticalDirectiveMomentum(before, after) {
    if (!before || !after || after.completed) return false;
    const shown = new Set(this.tacticalDirectiveSession?.milestonesShown || []);
    const milestone = [0.75, 0.5, 0.25].find((value) => before.ratio < value && after.ratio >= value && !shown.has(value));
    if (!milestone) return false;
    shown.add(milestone);
    this.tacticalDirectiveSession.milestonesShown = [...shown].sort((a, b) => a - b);
    const percent = Math.round(milestone * 100);
    this.enqueueToast(`${translateText('DIRECTIVE MOMENTUM')} ${percent}%\n${translateText(after.objectiveLabel)} ${after.progressLabel}`, {
      fontSize: this.game.getWidth() < 720 ? 14 : 17,
      fill: milestone >= 0.75 ? '#fff3a0' : '#9cfbff',
      slot: 'corner',
      type: 'tacticalDirective',
      priority: 3,
      duration: 1100,
      accent: after.accent
    });
    AudioManager.playSfx(milestone >= 0.75 ? 'combo_breakout' : 'combo_tick', { volume: milestone >= 0.75 ? 0.42 : 0.24, minIntervalMs: 0 });
    return true;
  }

  adaptTacticalDirectiveForSector(sector = this.game?.level || 1) {
    const state = getTacticalDirectiveState(this.tacticalDirectiveSession);
    const safeSector = Math.max(1, Math.floor(Number(sector) || 1));
    if (!state || state.completed || safeSector <= Number(this.tacticalDirectiveSession?.startedInSector || safeSector)) return state;
    if (this.tacticalDirectiveSession.lastAdaptedSector === safeSector) return state;
    this.tacticalDirectiveSession.lastAdaptedSector = safeSector;
    const startedInSector = Math.max(1, Math.floor(Number(this.tacticalDirectiveSession.startedInSector) || safeSector));
    const lastProgressSector = Math.max(startedInSector, Math.floor(Number(this.tacticalDirectiveSession.lastProgressSector) || startedInSector));
    const lastCalibrationSector = Math.max(startedInSector, Math.floor(Number(this.tacticalDirectiveSession.lastCalibrationSector) || startedInSector));
    const stalledSectors = Math.max(0, safeSector - Math.max(lastProgressSector, lastCalibrationSector));
    const remaining = Math.max(0, state.target - state.progress);
    if (stalledSectors < 2 || remaining <= 1) return state;

    const reduction = Math.max(1, Math.ceil(state.target * (state.objectiveId === 'support_hunts' ? 0.28 : 0.16)));
    const nextTarget = Math.max(state.progress + 1, state.target - reduction);
    if (nextTarget >= state.target) return state;
    this.tacticalDirectiveSession.target = nextTarget;
    this.tacticalDirectiveSession.calibrationCount = Math.max(0, Number(this.tacticalDirectiveSession.calibrationCount) || 0) + 1;
    this.tacticalDirectiveSession.lastCalibrationSector = safeSector;
    const adapted = getTacticalDirectiveState(this.tacticalDirectiveSession);
    this.enqueueToast(`${translateText('DIRECTIVE RECALIBRATED')}\n${translateText('PROGRESS CARRIED {progress}', { progress: adapted.progressLabel })}`, {
      fontSize: this.game.getWidth() < 720 ? 14 : 17,
      fill: '#9cfbff',
      slot: 'corner',
      type: 'tacticalDirective',
      priority: 4,
      duration: 1500,
      accent: adapted.accent
    });
    AudioManager.playSfx('tactical_focus_lens', { volume: 0.5, minIntervalMs: 0 });
    return adapted;
  }

  applyTacticalDirectiveReward(completion = {}) {
    if (completion.rewardKind === 'rescan') {
      this.tacticalDraftRescansRemaining = Math.min(3, Math.max(0, Number(this.tacticalDraftRescansRemaining) || 0) + 1);
      return { granted: true, kind: 'rescan', remaining: this.tacticalDraftRescansRemaining };
    }
    const type = completion.rewardPowerupType;
    if (!type || !this.powerupManager || !this.player) return { granted: false, kind: completion.rewardKind || null };
    const powerup = this.powerupManager.spawnSpecific(
      Number(this.player.x) || this.game.getWidth() / 2,
      Math.max(96, (Number(this.player.y) || this.game.getHeight() * 0.72) - 42),
      type,
      {
        source: 'tactical_directive',
        spawnKey: completion.rewardSpawnKey || null
      }
    );
    return { granted: Boolean(powerup), kind: 'powerup', type };
  }

  showTacticalDirectiveCompletion(completion = {}) {
    const title = translateText('SIDE DIRECTIVE COMPLETE');
    const objective = translateText(completion.objectiveLabel || 'SIDE DIRECTIVE');
    const reward = translateText(completion.rewardLabel || 'EXTRA RESCAN');
    const cabinetQuip = tauntDirector.getRotatingText('directive_complete_quip');
    const momentum = completion.momentumBonus > 0
      ? `\n${translateText('MOMENTUM BONUS +{score}', { score: Number(completion.momentumBonus).toLocaleString('en-US') })}`
      : '';
    this.lastDirectiveHumor = tauntDirector.getRotationDebugState();
    this.enqueueToast(`${title}\n${objective} // ${translateText('REWARD: {reward}', { reward })}\n${cabinetQuip}${momentum}`, {
      fontSize: this.game.getWidth() < 720 ? 15 : 18,
      fill: '#fff3a0',
      slot: 'corner',
      type: 'tacticalDirective',
      priority: 4,
      duration: 1800,
      accent: 0xffef7e
    });
    AudioManager.playSfx('achievement', { force: true, volume: 0.72, minIntervalMs: 280 });
  }

  showFlawlessWaveCelebration(streak = 1, score = 400) {
    const milestone = streak >= 3 && streak % 3 === 0;
    const message = milestone
      ? `${translateText('FLAWLESS STREAK')} x${streak}\n${translateText('NO-HIT BONUS +{score}', { score: Number(score).toLocaleString('en-US') })}`
      : translateText('FLAWLESS WAVE +{score}', { score: Number(score).toLocaleString('en-US') });
    this.enqueueToast(message, {
      fontSize: milestone ? (this.game.getWidth() < 720 ? 18 : 25) : 15,
      fill: milestone ? '#fff3a0' : '#9cfbff',
      stroke: '#071019',
      strokeThickness: milestone ? 5 : 3,
      slot: milestone ? 'center' : 'corner',
      type: 'flawlessWave',
      priority: milestone ? 7 : 2,
      duration: milestone ? 1800 : 900,
      accent: milestone ? 0xffef7e : 0x9cfbff
    });
    AudioManager.playSfx(milestone ? 'rare_visitor_reward' : 'combo_tick', {
      volume: milestone ? 0.62 : 0.2,
      minIntervalMs: milestone ? 800 : 900
    });
    if (milestone) {
      this.particleManager?.createExplosion?.(this.player?.x, (this.player?.y || 0) - 36, 0xffef7e, 1.05);
      this.screenShake?.shake?.(3, 12);
    }
    return true;
  }

  deferCenterToastForWaveBonus(durationMs = 0) {
    const display = this.activeCenterToast;
    if (!display?.__toastMeta) return false;
    const type = display.__toastMeta.type || 'generic';
    if (type === 'boss' || type === 'boss_intro' || type === 'run_clear') return false;
    return this.deferActiveToastDisplay(display, 'center', Math.max(0, Number(durationMs) || 0) + 180, {
      minRemainingMs: 1100
    });
  }

  finishPersonalBestCelebration(reason = 'complete', { preserveCarry = false } = {}) {
    const active = this.activePersonalBestCelebration;
    if (!active) return false;
    if (active.ticker && this.game?.app?.ticker) {
      this.game.app.ticker.remove(active.ticker);
      this._activeTickers = (this._activeTickers || []).filter((ticker) => ticker !== active.ticker);
    }
    if (active.container?.parent) active.container.parent.removeChild(active.container);
    active.container?.destroy?.({ children: true });
    if (this.lastPersonalBestCelebration) {
      this.lastPersonalBestCelebration.active = false;
      this.lastPersonalBestCelebration.completed = reason === 'complete';
      this.lastPersonalBestCelebration.endedReason = reason;
      this.lastPersonalBestCelebration.endedAt = Date.now();
      this.lastPersonalBestCelebration.elapsedMs = Math.max(0, Number(active.elapsedMs) || 0);
      this.lastPersonalBestCelebration.durationMs = Math.max(0, Number(active.durationMs) || 0);
    }
    if (!preserveCarry && reason === 'complete' && this.game) {
      this.game.personalBestCelebrationCarry = null;
    }
    this.activePersonalBestCelebration = null;
    return true;
  }

  clearPersonalBestCelebration(reason = 'cleared') {
    return this.finishPersonalBestCelebration(reason);
  }

  preparePersonalBestCelebrationCarry(reason = 'game_over_transition') {
    const active = this.activePersonalBestCelebration;
    const last = this.lastPersonalBestCelebration;
    if (!active || !last || !this.game) return false;
    const previousScore = Math.max(0, Math.floor(Number(last.previousScore) || 0));
    const triggerScore = Math.max(previousScore + 1, Math.floor(Number(last.triggerScore) || 0));
    const currentScore = Math.max(triggerScore, Math.floor(Number(this.game.score) || 0));
    const remainingMs = Math.max(0, (Number(active.durationMs) || 0) - (Number(active.elapsedMs) || 0));
    const carryDurationMs = Math.max(4200, Math.min(5200, remainingMs || 4200));
    this.game.personalBestCelebrationCarry = {
      previousScore,
      triggerScore,
      currentScore,
      delta: Math.max(1, currentScore - previousScore),
      source: last.source || 'ranked_best_score',
      reducedMotion: Boolean(last.reducedMotion),
      scoreNeutral: true,
      durationMs: carryDurationMs,
      handoffReason: reason,
      preparedAt: Date.now()
    };
    last.currentScore = currentScore;
    last.delta = Math.max(1, currentScore - previousScore);
    last.carryPrepared = true;
    last.carryDurationMs = carryDurationMs;
    return this.finishPersonalBestCelebration(reason, { preserveCarry: true });
  }

  getPersonalBestCelebrationDebugState() {
    const active = this.activePersonalBestCelebration;
    const last = this.lastPersonalBestCelebration;
    return {
      active: Boolean(active?.container?.parent),
      visible: Boolean(active?.container?.visible && active?.container?.renderable && active?.container?.alpha > 0.02),
      overlayCount: this.uiOverlay?.children?.filter?.((child) => child?.label === 'ui_personal_best_celebration')?.length || 0,
      previousScore: last?.previousScore || 0,
      triggerScore: last?.triggerScore || 0,
      currentScore: last?.currentScore || 0,
      delta: last?.delta || 0,
      source: last?.source || null,
      completed: Boolean(last?.completed),
      endedReason: last?.endedReason || null,
      reducedMotion: Boolean(last?.reducedMotion),
      scoreNeutral: last?.scoreNeutral !== false,
      elapsedMs: Math.round(Math.max(0, Number(active?.elapsedMs ?? last?.elapsedMs) || 0)),
      durationMs: Math.round(Math.max(0, Number(active?.durationMs ?? last?.durationMs) || 0)),
      remainingMs: Math.round(Math.max(0, (Number(active?.durationMs) || 0) - (Number(active?.elapsedMs) || 0))),
      phase: active?.phase || last?.phase || null,
      settled: Boolean(active?.settled || last?.settled),
      carryPrepared: Boolean(last?.carryPrepared),
      carryDurationMs: Math.round(Math.max(0, Number(last?.carryDurationMs) || 0)),
      rayCount: last?.rayCount || 0,
      sparkCount: last?.sparkCount || 0,
      hasCrown: Boolean(last?.hasCrown),
      hasLiveCounter: Boolean(last?.hasLiveCounter)
    };
  }

  showPersonalBestCelebration({ previousScore = 0, newScore = this.game?.score || 0, source = 'ranked_best_score' } = {}) {
    const previous = Math.max(0, Math.floor(Number(previousScore) || 0));
    const triggerScore = Math.max(0, Math.floor(Number(newScore) || 0));
    if (
      previous <= 0
      || triggerScore <= previous
      || !this.uiOverlay
      || !this.game?.app?.ticker
      || this.game?.currentScene !== this
    ) return false;
    if (this.activePersonalBestCelebration) return false;

    const width = Math.max(480, Number(this.game.getWidth?.() || this.game.app.screen?.width) || 1280);
    const height = Math.max(360, Number(this.game.getHeight?.() || this.game.app.screen?.height) || 720);
    const compact = width < 720;
    const reducedMotion = Boolean(getAccessibilitySettings().prefersReducedMotion);
    const centerX = width / 2;
    const centerY = height * (compact ? 0.46 : 0.44);
    const panelWidth = Math.min(width - (compact ? 28 : 80), compact ? 520 : 760);
    const panelHeight = compact ? 184 : 224;
    const ribbonCount = reducedMotion ? 3 : 6;
    const sparkCount = reducedMotion ? 14 : 38;
    const durationMs = reducedMotion ? 6200 : 7600;
    const impactMs = reducedMotion ? 720 : 920;
    const settleEndMs = reducedMotion ? 1320 : 1780;
    const outroMs = reducedMotion ? 720 : 920;
    const settledPanelY = height * (compact ? 0.25 : 0.275);
    const settledPanelScale = compact ? 0.68 : 0.6;
    this.game.personalBestCelebrationCarry = null;

    const container = new PIXI.Container();
    container.label = 'ui_personal_best_celebration';
    container.zIndex = 9850;
    container.eventMode = 'none';
    container.alpha = 0;

    const wash = new PIXI.Graphics();
    wash.rect(0, 0, width, height);
    wash.fill({ color: 0x020713, alpha: reducedMotion ? 0.18 : 0.3 });
    container.addChild(wash);

    const flash = new PIXI.Graphics();
    flash.rect(0, 0, width, height);
    flash.fill({ color: 0xc8ffff, alpha: 0.18 });
    flash.blendMode = 'add';
    container.addChild(flash);

    const frame = new PIXI.Graphics();
    frame.rect(12, 12, width - 24, height - 24);
    frame.stroke({ color: 0x4ef8ff, width: compact ? 2 : 3, alpha: 0.8 });
    frame.rect(20, 20, width - 40, height - 40);
    frame.stroke({ color: 0xffe66d, width: 1, alpha: 0.42 });
    frame.blendMode = 'add';
    container.addChild(frame);

    const burstLayer = new PIXI.Graphics();
    burstLayer.position.set(centerX, centerY);
    for (let index = 0; index < ribbonCount; index += 1) {
      const side = index % 2 ? 1 : -1;
      const lane = Math.floor(index / 2) - 1;
      const reach = Math.max(width, height) * (0.38 + (index % 3) * 0.07);
      burstLayer.moveTo(side * 38, lane * 28);
      burstLayer.bezierCurveTo(
        side * reach * 0.28, lane * 62 - side * 38,
        side * reach * 0.7, lane * 78 + side * 52,
        side * reach, lane * 44 + side * 12
      );
      burstLayer.stroke({
        color: index % 2 ? 0x4ef8ff : 0xffe66d,
        width: index % 3 === 0 ? 4.2 : 2.2,
        alpha: index % 3 === 0 ? 0.16 : 0.1
      });
    }
    burstLayer.blendMode = 'add';
    container.addChild(burstLayer);

    const waveLayer = new PIXI.Graphics();
    waveLayer.position.set(centerX, centerY);
    for (let lane = -1; lane <= 1; lane += 1) {
      const span = (compact ? 118 : 168) + lane * 12;
      waveLayer.moveTo(-span, lane * 24);
      waveLayer.bezierCurveTo(-span * 0.28, lane * 38 - 24, span * 0.34, lane * 38 + 18, span, lane * 20);
      waveLayer.stroke({ color: lane === 0 ? 0xffe66d : 0x4ef8ff, width: lane === 0 ? 2.4 : 1.5, alpha: lane === 0 ? 0.5 : 0.34 });
    }
    waveLayer.blendMode = 'add';
    container.addChild(waveLayer);

    const sparkLayer = new PIXI.Container();
    sparkLayer.position.set(centerX, centerY);
    const sparks = [];
    const sparkPalette = [0x4ef8ff, 0xffe66d, 0xff55d9, 0xffffff];
    for (let index = 0; index < sparkCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkCount + (index % 5) * 0.08;
      const size = 2 + (index % 4);
      const spark = new PIXI.Graphics();
      spark.poly([0, -size * 1.45, size * 0.52, size * 0.32, -size * 0.24, size, -size * 0.4, -size * 0.08]);
      spark.fill({ color: sparkPalette[index % sparkPalette.length], alpha: 0.96 });
      spark.blendMode = 'add';
      sparkLayer.addChild(spark);
      sparks.push({
        display: spark,
        angle,
        distance: Math.min(width, height) * (0.2 + (index % 7) * 0.035),
        orbit: (index % 2 ? 1 : -1) * (0.12 + (index % 5) * 0.025)
      });
    }
    container.addChild(sparkLayer);

    const panel = new PIXI.Container();
    panel.position.set(centerX, centerY);
    const panelGlow = new PIXI.Graphics();
    panelGlow.roundRect(-panelWidth / 2 - 7, -panelHeight / 2 - 7, panelWidth + 14, panelHeight + 14, 24);
    panelGlow.stroke({ color: 0x4ef8ff, width: 7, alpha: 0.2 });
    panelGlow.blendMode = 'add';
    panel.addChild(panelGlow);

    const panelBg = new PIXI.Graphics();
    panelBg.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 18);
    panelBg.fill({ color: 0x031421, alpha: 0.94 });
    panelBg.stroke({ color: 0xffe66d, width: compact ? 3 : 4, alpha: 0.95 });
    panelBg.roundRect(-panelWidth / 2 + 9, -panelHeight / 2 + 9, panelWidth - 18, panelHeight - 18, 12);
    panelBg.stroke({ color: 0x4ef8ff, width: 2, alpha: 0.72 });
    panel.addChild(panelBg);

    const crown = new PIXI.Graphics();
    crown.poly([-54, 18, -43, -19, -15, 5, 0, -31, 15, 5, 43, -19, 54, 18]);
    crown.fill({ color: 0xffe66d, alpha: 0.92 });
    crown.stroke({ color: 0xffffff, width: 2, alpha: 0.84 });
    crown.position.set(0, -panelHeight / 2 - (compact ? 19 : 25));
    crown.blendMode = 'add';
    panel.addChild(crown);

    const title = createText(translateText(source === 'daily_signal_local_best' ? 'NEW DAILY SIGNAL BEST' : 'NEW PERSONAL BEST'), {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 29 : 46,
      fill: '#fff4a3',
      stroke: '#261400',
      strokeThickness: compact ? 5 : 7,
      fontWeight: '900',
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#ffe66d',
      dropShadowBlur: 12,
      wordWrap: true,
      wordWrapWidth: panelWidth - 38
    });
    title.anchor.set(0.5);
    title.position.set(0, compact ? -53 : -65);
    panel.addChild(title);

    const formatScore = (value) => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
    const scoreLine = createText('', {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 16 : 23,
      fill: '#d9feff',
      stroke: '#001018',
      strokeThickness: 4,
      fontWeight: '800',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 36
    });
    scoreLine.anchor.set(0.5);
    scoreLine.position.set(0, compact ? 0 : 3);
    panel.addChild(scoreLine);

    const deltaLine = createText('', {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 16 : 21,
      fill: '#ff7ee8',
      stroke: '#190018',
      strokeThickness: 4,
      fontWeight: '900',
      align: 'center'
    });
    deltaLine.anchor.set(0.5);
    deltaLine.position.set(0, compact ? 36 : 48);
    panel.addChild(deltaLine);

    const footer = createText(translateText('THE CABINET HAS STARTED BRAGGING. KEEP GOING.'), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 12 : 16,
      fill: '#9cfbff',
      stroke: '#001018',
      strokeThickness: 3,
      fontWeight: '700',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 40
    });
    footer.anchor.set(0.5);
    footer.position.set(0, compact ? 68 : 83);
    panel.addChild(footer);

    const scanLine = new PIXI.Graphics();
    scanLine.roundRect(-panelWidth * 0.4, -2, panelWidth * 0.8, 4, 2);
    scanLine.fill({ color: 0xffffff, alpha: 0.7 });
    scanLine.blendMode = 'add';
    scanLine.y = -panelHeight * 0.36;
    panel.addChild(scanLine);

    container.addChild(panel);
    this.uiOverlay.addChild(container);
    this.uiOverlay.sortChildren?.();
    this.reserveMessageFocus(durationMs, { priority: 8, slots: ['center', 'top'] });

    this.lastPersonalBestCelebration = {
      active: true,
      completed: false,
      endedReason: null,
      previousScore: previous,
      triggerScore,
      currentScore: triggerScore,
      delta: triggerScore - previous,
      source,
      reducedMotion,
      scoreNeutral: true,
      rayCount: 0,
      ribbonCount,
      sparkCount,
      hasCrown: true,
      hasLiveCounter: true,
      elapsedMs: 0,
      durationMs,
      phase: 'impact',
      settled: false,
      carryPrepared: false,
      startedAt: Date.now()
    };

    AudioManager.playSfx('nova_highscore_chime', { force: true, volume: 0.98, minIntervalMs: 0 });
    AudioManager.playSfx('achievement', { force: true, volume: 0.68, minIntervalMs: 0 });
    AudioManager.playVoice('mission_control_personal_best', {
      force: true,
      stopOtherVoices: true,
      exclusiveGroup: 'announcer',
      cooldownMs: 7000,
      duckMs: 2300,
      duckFactor: 0.38,
      volume: 0.92
    });
    if (!reducedMotion) {
      const playerX = Number(this.player?.x) || centerX;
      const playerY = Number(this.player?.y) || height * 0.72;
      this.particleManager?.createExplosion?.(playerX, playerY - 26, 0xffe66d, 1.1);
      this.particleManager?.createExplosion?.(playerX, playerY - 26, 0x4ef8ff, 0.9);
      this.screenShake?.shake?.(5, 15);
    }

    const active = {
      container,
      ticker: null,
      elapsedMs: 0,
      durationMs,
      phase: 'impact',
      settled: false
    };
    const ticker = (delta) => {
      if (!container.parent || this.game?.currentScene !== this) {
        this.finishPersonalBestCelebration('scene_changed');
        return;
      }
      const deltaFrames = Number(delta?.deltaTime) || Number(delta) || 0;
      const advancing = this.isGameplayClockAdvancing();
      if (advancing) {
        active.elapsedMs += deltaFrames * 16.67;
      }
      const animationDeltaFrames = advancing ? deltaFrames : 0;
      const elapsed = active.elapsedMs;
      const intro = Math.min(1, elapsed / 260);
      const introEase = 1 - Math.pow(1 - intro, 3);
      const settle = Math.max(0, Math.min(1, (elapsed - impactMs) / Math.max(1, settleEndMs - impactMs)));
      const settleEase = 1 - Math.pow(1 - settle, 3);
      const outro = Math.max(0, Math.min(1, (elapsed - (durationMs - outroMs)) / outroMs));
      active.phase = elapsed < impactMs
        ? 'impact'
        : elapsed < settleEndMs
          ? 'settle'
          : elapsed < durationMs - outroMs
            ? 'hold'
            : 'outro';
      active.settled = settle >= 1;
      container.alpha = introEase * (1 - outro);
      const impactScale = 0.78 + introEase * 0.22;
      const settledScale = impactScale + (settledPanelScale - impactScale) * settleEase;
      panel.scale.set(settledScale + Math.sin(elapsed * 0.008) * (reducedMotion ? 0.003 : 0.009) * (1 - settleEase * 0.55));
      panel.position.set(centerX, centerY + (settledPanelY - centerY) * settleEase);
      crown.alpha = 1 - settleEase * 0.58;
      flash.alpha = Math.max(0, (1 - elapsed / 520) * (reducedMotion ? 0.22 : 0.7));
      wash.alpha = Math.max(0.14, 1 - settleEase * 0.86);
      frame.alpha = (0.58 + Math.sin(elapsed * 0.01) * 0.18) * (1 - settleEase * 0.58);
      burstLayer.alpha = (0.48 + Math.max(0, Math.sin(elapsed * 0.006)) * 0.36) * (1 - settleEase * 0.72);
      waveLayer.alpha = 1 - settleEase * 0.58;
      waveLayer.scale.set(1 + Math.sin(elapsed * 0.006) * (reducedMotion ? 0.01 : 0.045), 1);
      const travel = Math.min(1, elapsed / (reducedMotion ? 900 : 1500));
      const travelEase = 1 - Math.pow(1 - travel, 3);
      sparks.forEach((spark, index) => {
        const angle = spark.angle + elapsed * 0.001 * spark.orbit;
        const distance = spark.distance * travelEase;
        spark.display.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance);
        spark.display.rotation += reducedMotion ? 0 : animationDeltaFrames * (0.02 + (index % 3) * 0.01);
        spark.display.alpha = Math.max(0.04, (1 - outro) * (1 - settleEase * 0.62) * (0.58 + Math.sin(elapsed * 0.012 + index) * 0.36));
      });
      scanLine.y = -panelHeight * 0.38 + (panelHeight * 0.76) * ((elapsed % 1250) / 1250);

      const liveScore = Math.max(triggerScore, Math.floor(Number(this.game?.score) || 0));
      const liveDelta = Math.max(1, liveScore - previous);
      scoreLine.text = translateText('OLD RECORD {oldScore} // LIVE RECORD {liveScore}', {
        oldScore: formatScore(previous),
        liveScore: formatScore(liveScore)
      });
      deltaLine.text = translateText('RECORD ADVANTAGE +{score}', { score: formatScore(liveDelta) });
      if (this.lastPersonalBestCelebration) {
        this.lastPersonalBestCelebration.currentScore = liveScore;
        this.lastPersonalBestCelebration.delta = liveDelta;
        this.lastPersonalBestCelebration.elapsedMs = elapsed;
        this.lastPersonalBestCelebration.durationMs = durationMs;
        this.lastPersonalBestCelebration.phase = active.phase;
        this.lastPersonalBestCelebration.settled = active.settled;
      }

      if (elapsed >= durationMs) this.finishPersonalBestCelebration('complete');
    };
    active.ticker = ticker;
    this.activePersonalBestCelebration = active;
    this._activeTickers.push(ticker);
    this.game.app.ticker.add(ticker);
    ticker({ deltaTime: 0 });
    return true;
  }

  getTacticalDirectiveDebugState() {
    const currentSector = Math.max(1, Math.floor(Number(this.game?.level) || 1));
    const baseActive = getTacticalDirectiveState(this.tacticalDirectiveSession);
    const active = baseActive ? {
      ...baseActive,
      queued: Number(baseActive.eligibleFromSector) > currentSector
    } : null;
    return {
      active,
      completedCount: this.tacticalDirectiveHistory.length,
      completionCap: TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP,
      currentOrdinal: active ? Math.min(TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP, this.tacticalDirectiveHistory.length + 1) : null,
      currentSector,
      minimumFinalSector: TACTICAL_DIRECTIVE_MINIMUM_FINAL_SECTOR,
      completionsThisSector: this.tacticalDirectiveHistory.filter((entry) => Number(entry?.sector) === currentSector).length,
      availableVariants: TACTICAL_DIRECTIVE_VARIANT_COUNT,
      sequence: this.tacticalDirectiveSequence,
      lastCompletion: this.lastTacticalDirectiveCompletion ? { ...this.lastTacticalDirectiveCompletion } : null,
      history: this.tacticalDirectiveHistory.map((entry) => ({ ...entry }))
    };
  }

  prepareAceBountyForSector(sector = this.game?.level || 1, options = {}) {
    const safeSector = Math.max(1, Math.floor(Number(sector) || 1));
    if (!options.force && this.aceBountyActive?.sector === safeSector) {
      return this.getAceBountyDebugState();
    }
    const previousId = this.aceBountyActive?.id || this.aceBountyHistory.at(-1)?.variantId || null;
    const previousProtocolId = this.aceBountyActive?.protocolId || this.aceBountyHistory.at(-1)?.protocolId || null;
    const previousWingId = this.aceBountyActive?.rivalWingId || this.aceBountyHistory.at(-1)?.rivalWingId || null;
    const seed = this.game?.contentDirector?.seed
      || `${BUILD_ID || 'nova-swarm'}:${this.game?.runStartedAtMs || 0}:${this.game?.selectedShipSpriteKey || 'ship'}`;
    const waveCount = Math.max(1, Math.floor(Number(options.waveCount || this.enemyManager?.normalWavesTotal) || 5));
    const sequence = this.aceBountySequence;
    const encounter = planAceBountyEncounter(seed, safeSector, waveCount, {
      sequence,
      excludeId: previousId,
      variantId: options.variantId,
      targetWaveIndex: options.targetWaveIndex
    });
    const protocol = options.protocolId
      ? getNemesisProtocolById(options.protocolId)
      : pickNemesisProtocol(seed, sequence, { excludeId: previousProtocolId });
    const rivalWing = options.rivalWingId
      ? getRivalWingDoctrineById(options.rivalWingId)
      : pickRivalWingDoctrine(seed, sequence, { excludeId: previousWingId });
    this.aceBountySequence += 1;
    this.aceBountyActive = encounter && protocol && rivalWing ? {
      ...encounter,
      protocolId: protocol.id,
      protocolNumber: protocol.number,
      openingId: protocol.openingId,
      openingLabel: protocol.openingLabel,
      defenseId: protocol.defenseId,
      defenseLabel: protocol.defenseLabel,
      enrageId: protocol.enrageId,
      enrageLabel: protocol.enrageLabel,
      bonusId: protocol.bonusId,
      bonusLabel: protocol.bonusLabel,
      bonusKind: protocol.bonusKind,
      bonusPowerupType: protocol.bonusPowerupType,
      rivalWingId: rivalWing.id,
      rivalWingNumber: rivalWing.number,
      rivalWingFormationId: rivalWing.formationId,
      rivalWingFormationLabel: rivalWing.formationLabel,
      rivalWingDisciplineId: rivalWing.disciplineId,
      rivalWingVolleyId: rivalWing.volleyId,
      rivalWingMoraleId: rivalWing.moraleId,
      rivalWingMoraleLabel: rivalWing.moraleLabel,
      rivalWingEscortCount: 0,
      rivalWingMoraleActivated: false,
      preparedAt: Date.now(),
      preparedReason: options.reason || 'sector_start'
    } : null;
    return this.getAceBountyDebugState();
  }

  getAceRewardPresentation(encounter = {}) {
    const primaryLabel = encounter.rewardLabel ? translateText(encounter.rewardLabel) : '';
    const bonusLabel = encounter.bonusLabel ? translateText(encounter.bonusLabel) : '';
    const duplicateReward = Boolean(
      primaryLabel
      && bonusLabel
      && encounter.rewardKind === encounter.bonusKind
      && (
        (encounter.rewardKind === 'powerup' && encounter.rewardPowerupType === encounter.bonusPowerupType)
        || (encounter.rewardKind === 'rescan' && encounter.rewardId === encounter.bonusId)
      )
    );
    const summary = duplicateReward
      ? translateText('2X {reward}', { reward: primaryLabel })
      : [primaryLabel, bonusLabel].filter(Boolean).join(' + ');
    return { primaryLabel, bonusLabel, duplicateReward, summary };
  }

  maybePromoteAceEnemy(enemy, context = {}) {
    const active = this.aceBountyActive;
    if (!active || active.spawned || active.completed || !enemy) return false;
    const sector = Math.max(1, Math.floor(Number(context.sector || this.game?.level) || 1));
    const waveIndex = Math.max(0, Math.floor(Number(context.waveIndex) || 0));
    if (sector !== active.sector || waveIndex !== active.targetWaveIndex) return false;
    if (enemy.kind !== 'enemy' || enemy.middleShipProfile || enemy.dangerMidShipProfile || enemy.isEliteMiddleShip || enemy.isBossMayhemReinforcement) return false;
    const applied = enemy.applyAceBounty?.(active.id);
    if (!applied) return false;
    const protocolApplied = enemy.applyNemesisProtocol?.(active.protocolId);
    if (!protocolApplied) return false;
    if (!enemy.attachRivalWingCommand?.(active.rivalWingId)) return false;
    active.spawned = true;
    active.spawnedAt = Date.now();
    active.spawnedWaveIndex = waveIndex;
    active.enemyType = enemy.type || null;
    const number = String(active.number).padStart(4, '0');
    const rewardPresentation = this.getAceRewardPresentation(active);
    const contact = translateText('DESTROY ACE {number} // {reward}', {
      number,
      reward: rewardPresentation.summary
    });
    const protocolContact = translateText('NEMESIS {number} // {opening} + {defense}', {
      number: String(active.protocolNumber).padStart(5, '0'),
      opening: translateText(active.openingLabel),
      defense: translateText(active.defenseLabel)
    });
    const wingContact = translateText('RIVAL WING {number} // {formation} + {morale}', {
      number: String(active.rivalWingNumber).padStart(5, '0'),
      formation: translateText(active.rivalWingFormationLabel),
      morale: translateText(active.rivalWingMoraleLabel)
    });
    const rewardContact = translateText('REWARD: {reward}', {
      reward: rewardPresentation.summary
    });
    const dangerContact = translateText('ATTACK: {threat}', {
      threat: translateText(active.weaponLabel)
    });
    this.enqueueToast(contact, {
      fontSize: this.game.getWidth() < 720 ? 20 : 24,
      fill: '#fff3a0',
      slot: 'top',
      type: 'aceContact',
      priority: 5,
      duration: 3900,
      minVisibleMs: 3300,
      extraReadTimeMs: 0,
      y: Math.max(176, this.game.getHeight() * 0.25),
      maxWidth: Math.min(540, Math.max(360, this.game.getWidth() - 32)),
      accent: active.color || 0xffd15c,
      secondaryAccent: active.accent || 0x7df9ff,
      edgeAligned: this.game.getWidth() >= 720,
      placement: this.game.getWidth() >= 720 ? 'left-edge' : 'upper-center-edge-safe',
      aceDossier: {
        title: translateText('ACE CONTRACT'),
        primary: `#${number}`,
        action: translateText('DESTROY THE GOLD-MARKED ACE'),
        reward: rewardContact,
        danger: dangerContact,
        protocol: protocolContact,
        wing: wingContact
      }
    });
    AudioManager.playSfx('elite_spawn_alert', { force: true, volume: 0.64, minIntervalMs: 700 });
    return true;
  }

  maybeApplyRivalWingEnemy(enemy, context = {}) {
    const active = this.aceBountyActive;
    if (!active?.rivalWingId || !enemy || enemy.isAce || enemy.rivalWingDoctrine) return false;
    const sector = Math.max(1, Math.floor(Number(context.sector || this.game?.level) || 1));
    const waveIndex = Math.max(0, Math.floor(Number(context.waveIndex) || 0));
    if (sector !== active.sector || waveIndex !== active.targetWaveIndex) return false;
    if (!enemy.applyRivalWingDoctrine?.(active.rivalWingId)) return false;
    active.rivalWingEscortCount += 1;
    if (active.rivalWingMoraleActivated) enemy.activateRivalWingMorale?.();
    return true;
  }

  activateRivalWingMorale(reason = 'nemesis_enrage') {
    const active = this.aceBountyActive;
    if (!active?.rivalWingId || active.rivalWingMoraleActivated) return 0;
    let count = 0;
    for (const enemy of this.enemyManager?.enemies || []) {
      if (enemy?.rivalWingDoctrine?.id !== active.rivalWingId || Number(enemy.health) <= 0) continue;
      if (enemy.activateRivalWingMorale?.()) count += 1;
    }
    active.rivalWingMoraleActivated = true;
    active.rivalWingMoraleReason = reason;
    active.rivalWingMoraleCount = count;
    return count;
  }

  onNemesisProtocolEnraged(enemy, enrage = enemy?.nemesisProtocol?.enrage) {
    const protocol = enemy?.nemesisProtocol;
    if (!protocol || !enrage) return null;
    this.activateRivalWingMorale('nemesis_enrage');
    const message = translateText('PROTOCOL SURGE: {number} // {enrage}', {
      number: String(protocol.number).padStart(5, '0'),
      enrage: translateText(protocol.enrageLabel)
    });
    this.enqueueToast(message, {
      fontSize: this.game.getWidth() < 720 ? 15 : 18,
      fill: '#ff9d66',
      slot: 'corner',
      type: 'nemesisSurge',
      priority: 4,
      duration: 1500
    });
    AudioManager.playSfx('elite_spawn_alert', { force: true, volume: 0.58, minIntervalMs: 500 });
    return { protocolId: protocol.id, enrageId: enrage.id };
  }

  completeAceBounty(enemy) {
    const variant = enemy?.aceVariant || getAceBountyById(enemy?.aceVariant?.id);
    if (!enemy?.isAce || !variant || enemy.aceRewardClaimed) return null;
    enemy.aceRewardClaimed = true;
    const completedAt = Date.now();
    const completion = {
      variantId: variant.id,
      number: variant.number,
      chassisId: variant.chassisId,
      flightId: variant.flightId,
      weaponId: variant.weaponId,
      rewardId: variant.rewardId,
      rewardLabel: variant.rewardLabel,
      rewardKind: variant.rewardKind,
      rewardPowerupType: variant.rewardPowerupType,
      protocolId: enemy.nemesisProtocol?.id || null,
      protocolNumber: enemy.nemesisProtocol?.number || 0,
      openingId: enemy.nemesisProtocol?.openingId || null,
      defenseId: enemy.nemesisProtocol?.defenseId || null,
      enrageId: enemy.nemesisProtocol?.enrageId || null,
      bonusId: enemy.nemesisProtocol?.bonusId || null,
      bonusLabel: enemy.nemesisProtocol?.bonusLabel || null,
      bonusKind: enemy.nemesisProtocol?.bonusKind || null,
      bonusPowerupType: enemy.nemesisProtocol?.bonusPowerupType || null,
      protocolEnraged: enemy.nemesisEnraged === true,
      rivalWingId: enemy.rivalWingCommand?.id || null,
      rivalWingNumber: enemy.rivalWingCommand?.number || 0,
      rivalWingFormationId: enemy.rivalWingCommand?.formationId || null,
      rivalWingDisciplineId: enemy.rivalWingCommand?.disciplineId || null,
      rivalWingVolleyId: enemy.rivalWingCommand?.volleyId || null,
      rivalWingMoraleId: enemy.rivalWingCommand?.moraleId || null,
      sector: Math.max(1, Math.floor(Number(this.game?.level) || 1)),
      completedAt,
      rewardSpawnKey: `ace_reward:${this.game?.runStartedAtMs || 0}:${this.aceBountyHistory.length}:${variant.id}:${enemy.nemesisProtocol?.id || 'none'}:${completedAt}`
    };
    if (this.aceBountyActive?.id === variant.id) {
      this.aceBountyActive.completed = true;
      this.aceBountyActive.completedAt = completion.completedAt;
    }
    this.aceBountyHistory.push(completion);
    this.lastAceBountyCompletion = completion;
    this.activateRivalWingMorale('ace_down');
    const rewardPresentation = this.getAceRewardPresentation(completion);
    const { reward, protocolReward } = this.applyAceNemesisRewards(completion, enemy);
    const number = String(variant.number).padStart(4, '0');
    const completionMessage = translateText('ACE DOWN: {number} // REWARD: {reward}', {
      number,
      reward: rewardPresentation.summary
    });
    this.enqueueToast(completionMessage, {
      fontSize: this.game.getWidth() < 720 ? 16 : 20,
      fill: '#88ffb0',
      slot: 'corner',
      type: 'aceBounty',
      priority: 5,
      duration: 1900
    });
    AudioManager.playSfx('achievement', { force: true, volume: 0.76, minIntervalMs: 280 });
    return { completion, reward, protocolReward };
  }

  applyAceNemesisRewards(completion = {}, enemy = null) {
    const canBundlePhysicalRewards = completion.protocolId
      && !enemy?.nemesisBonusRewardClaimed
      && completion.rewardKind === 'powerup'
      && completion.bonusKind === 'powerup'
      && completion.rewardPowerupType
      && completion.bonusPowerupType
      && this.powerupManager;
    if (!canBundlePhysicalRewards) {
      return {
        reward: this.applyAceBountyReward(completion, enemy),
        protocolReward: this.applyNemesisProtocolReward(completion, enemy)
      };
    }

    if (enemy) enemy.nemesisBonusRewardClaimed = true;
    const x = Number.isFinite(enemy?.x) ? enemy.x : (this.player?.x || this.game.getWidth() / 2);
    const y = Number.isFinite(enemy?.y)
      ? enemy.y
      : Math.max(96, (this.player?.y || this.game.getHeight() * 0.72) - 42);
    const duplicateType = completion.rewardPowerupType === completion.bonusPowerupType;
    const screenWidth = Math.max(320, Number(this.game?.getWidth?.()) || 1280);
    const offset = ACE_REWARD_PICKUP_PAIR_OFFSET;
    const pairCenterX = Math.max(52 + offset, Math.min(screenWidth - 52 - offset, x));
    const first = this.powerupManager.spawnSpecific(pairCenterX - offset, y, completion.rewardPowerupType, {
      ...ACE_REWARD_PICKUP_OPTIONS,
      source: 'ace_nemesis_pair',
      spawnKey: completion.rewardSpawnKey ? `${completion.rewardSpawnKey}:ace` : null
    });
    const second = this.powerupManager.spawnSpecific(pairCenterX + offset, y, completion.bonusPowerupType, {
      ...ACE_REWARD_PICKUP_OPTIONS,
      source: 'ace_nemesis_pair',
      spawnKey: completion.rewardSpawnKey ? `${completion.rewardSpawnKey}:nemesis` : null,
      // Keep the second reward's cosmetic motion off the gameplay RNG stream.
      // This preserves the random-call footprint of the former bundled pickup.
      visualSeed: `${completion.rewardSpawnKey || 'ace-nemesis-pair'}:${completion.bonusPowerupType}:${pairCenterX}:${y}`
    });
    return {
      reward: {
        granted: Boolean(first),
        kind: 'powerup',
        type: completion.rewardPowerupType,
        physicalPair: true,
        duplicatePair: duplicateType
      },
      protocolReward: {
        granted: Boolean(second),
        kind: 'powerup',
        type: completion.bonusPowerupType,
        physicalPair: true,
        duplicatePair: duplicateType,
        coalesced: false
      }
    };
  }

  applyAceBountyReward(completion = {}, enemy = null) {
    if (completion.rewardKind === 'rescan') {
      this.tacticalDraftRescansRemaining = Math.min(3, Math.max(0, Number(this.tacticalDraftRescansRemaining) || 0) + 1);
      return { granted: true, kind: 'rescan', remaining: this.tacticalDraftRescansRemaining };
    }
    const type = completion.rewardPowerupType;
    if (!type || !this.powerupManager) return { granted: false, kind: completion.rewardKind || null };
    const x = Number.isFinite(enemy?.x) ? enemy.x : (this.player?.x || this.game.getWidth() / 2);
    const y = Number.isFinite(enemy?.y) ? enemy.y : Math.max(96, (this.player?.y || this.game.getHeight() * 0.72) - 42);
    const powerup = this.powerupManager.spawnSpecific(x, y, type, {
      ...ACE_REWARD_PICKUP_OPTIONS,
      source: 'ace_bounty',
      spawnKey: completion.rewardSpawnKey ? `${completion.rewardSpawnKey}:ace` : null
    });
    return { granted: Boolean(powerup), kind: 'powerup', type };
  }

  applyNemesisProtocolReward(completion = {}, enemy = null) {
    if (!completion.protocolId || enemy?.nemesisBonusRewardClaimed) return null;
    if (enemy) enemy.nemesisBonusRewardClaimed = true;
    if (completion.bonusKind === 'rescan') {
      this.tacticalDraftRescansRemaining = Math.min(3, Math.max(0, Number(this.tacticalDraftRescansRemaining) || 0) + 1);
      return { granted: true, kind: 'rescan', remaining: this.tacticalDraftRescansRemaining };
    }
    const type = completion.bonusPowerupType;
    if (!type || !this.powerupManager) return { granted: false, kind: completion.bonusKind || null };
    const x = Number.isFinite(enemy?.x) ? enemy.x + 24 : (this.player?.x || this.game.getWidth() / 2) + 24;
    const y = Number.isFinite(enemy?.y) ? enemy.y : Math.max(96, (this.player?.y || this.game.getHeight() * 0.72) - 42);
    const powerup = this.powerupManager.spawnSpecific(x, y, type, {
      ...ACE_REWARD_PICKUP_OPTIONS,
      source: 'nemesis_protocol',
      spawnKey: completion.rewardSpawnKey ? `${completion.rewardSpawnKey}:nemesis` : null
    });
    return { granted: Boolean(powerup), kind: 'powerup', type };
  }

  getAceBountyDebugState() {
    const active = this.aceBountyActive ? { ...this.aceBountyActive } : null;
    return {
      active,
      completedCount: this.aceBountyHistory.length,
      availableVariants: ACE_BOUNTY_VARIANT_COUNT,
      completedProtocolCount: this.aceBountyHistory.filter((entry) => entry.protocolId).length,
      availableProtocolVariants: NEMESIS_PROTOCOL_VARIANT_COUNT,
      completedRivalWingCount: this.aceBountyHistory.filter((entry) => entry.rivalWingId).length,
      availableRivalWingVariants: RIVAL_WING_VARIANT_COUNT,
      sequence: this.aceBountySequence,
      lastCompletion: this.lastAceBountyCompletion ? { ...this.lastAceBountyCompletion } : null,
      history: this.aceBountyHistory.map((entry) => ({ ...entry }))
    };
  }

  maybeShowCabinetWonder(context = {}) {
    if (this.pendingCabinetWonder || this.activeCabinetWonder) return false;
    const debugForce = context.debugForce === true;
    if (debugForce) {
      this.game?.markUnrankedRun?.('debug_cabinet_wonder');
      this.debugLevelToolsUsed = true;
    }
    const eligibleChecks = this.cabinetWonderEligibleChecks + (debugForce ? 0 : 1);
    const seed = this.game?.contentDirector?.seed
      || `${BUILD_ID || 'nova-swarm'}:${this.game?.runStartedAtMs || 0}:${this.game?.selectedShipSpriteKey || 'ship'}`;
    const decision = evaluateCabinetWonder(seed, {
      ...context,
      eligibleChecks,
      sectorAlreadyShown: this.cabinetWonderHistory.some((entry) => entry.sector === Math.max(1, Math.floor(Number(context.sector) || 1))),
      recentVariantIds: this.cabinetWonderHistory.slice(-12).map((entry) => entry.id)
    });
    if (decision.eligible && !debugForce) this.cabinetWonderEligibleChecks = eligibleChecks;
    this.cabinetWonderLastDecision = {
      ...decision,
      variantId: decision.variant?.id || null,
      variant: undefined
    };
    if (!decision.triggered || !decision.variant) return false;
    if (GameAssets.getCabinetWonderTexture?.(decision.variant.id)) {
      return this.showCabinetWonder(decision);
    }
    const pendingKey = `${decision.variant.id}:${decision.sector}:${decision.waveNumber}`;
    if (this.pendingCabinetWonder?.key === pendingKey) return true;
    this.pendingCabinetWonder = { key: pendingKey, decision };
    GameAssets.ensureCabinetWonderTexture?.(decision.variant.id)
      .catch(() => null)
      .then(() => {
        if (this.pendingCabinetWonder?.key !== pendingKey) return;
        this.pendingCabinetWonder = null;
        if (this.game?.currentScene !== this || this.activeCabinetWonder) return;
        if (this.cabinetWonderHistory.some((entry) => entry.sector === decision.sector)) return;
        this.showCabinetWonder(decision);
      });
    return true;
  }

  debugForceCabinetWonder(variantId = 'ghost_fleet_salute') {
    if (!this.canUseMaintainerDevtools()) return false;
    return this.maybeShowCabinetWonder({
      debugForce: true,
      forceVariantId: variantId,
      sector: this.game?.level || 1,
      waveNumber: Math.max(2, (this.enemyManager?.currentWaveIndex || 0) + 1),
      hasUpcomingWave: true
    });
  }

  createCabinetWonderVisual(variant, width, height, reducedMotion) {
    const root = new PIXI.Container();
    root.label = `cabinet_wonder_${variant.id}`;
    root.zIndex = -500;
    root.eventMode = 'none';
    root.interactive = false;
    const palette = variant.palette || [0x7df9ff, 0xff70d7, 0xffef9a];
    let elementCount = 0;
    let authoredBounds = { x: width * 0.12, y: height * 0.15, width: width * 0.76, height: height * 0.3 };
    let animate = () => {};
    const generatedTexture = GameAssets.getCabinetWonderTexture?.(variant.id);
    let generatedArt = null;
    if (generatedTexture) {
      generatedArt = new PIXI.Sprite(generatedTexture);
      generatedArt.label = `cabinet_wonder_imagegen_${variant.id}`;
      generatedArt.anchor.set(0.5);
      generatedArt.x = width * 0.5;
      generatedArt.y = height * 0.29;
      const sourceWidth = Math.max(1, generatedTexture.width || 1);
      const sourceHeight = Math.max(1, generatedTexture.height || 1);
      const scale = Math.min((width * 0.72) / sourceWidth, (height * 0.54) / sourceHeight);
      generatedArt.scale.set(scale);
      generatedArt.alpha = reducedMotion ? 0.7 : 0.82;
      generatedArt.blendMode = 'add';
      generatedArt.eventMode = 'none';
      root.addChild(generatedArt);
      elementCount += 1;
    }
    const sparkField = new PIXI.Container();
    sparkField.label = 'cabinet_wonder_spark_field';
    const sparkCount = reducedMotion ? 12 : 26;
    for (let index = 0; index < sparkCount; index += 1) {
      const spark = new PIXI.Graphics();
      const radius = 0.8 + (index % 5) * 0.34;
      const color = palette[index % palette.length];
      spark.circle(0, 0, radius * 3.6);
      spark.fill({ color, alpha: 0.045 + (index % 4) * 0.012 });
      spark.circle(0, 0, radius);
      spark.fill({ color: index % 7 === 0 ? 0xffffff : color, alpha: 0.42 + (index % 3) * 0.12 });
      spark.x = width * (0.08 + (((index * 79) % 839) / 839) * 0.84);
      spark.y = height * (0.09 + (((index * 47 + 13) % 293) / 293) * 0.35);
      spark.blendMode = 'add';
      sparkField.addChild(spark);
      elementCount += 1;
    }
    root.addChild(sparkField);

    if (variant.id === 'ghost_fleet_salute') {
      const fleet = new PIXI.Container();
      fleet.label = 'cabinet_wonder_ghost_fleet';
      const fleetHalo = new PIXI.Graphics();
      fleetHalo.circle(width * 0.5, height * 0.34, Math.min(width * 0.29, height * 0.36));
      fleetHalo.stroke({ color: palette[1], width: Math.max(8, width * 0.012), alpha: 0.035 });
      fleetHalo.circle(width * 0.5, height * 0.34, Math.min(width * 0.23, height * 0.29));
      fleetHalo.stroke({ color: palette[0], width: Math.max(1.4, width * 0.0015), alpha: 0.2 });
      fleetHalo.blendMode = 'add';
      root.addChild(fleetHalo);
      elementCount += 1;
      for (let index = 0; index < 6; index += 1) {
        const ship = new PIXI.Graphics();
        const size = Math.max(20, Math.min(32, width * (0.018 + index * 0.001)));
        const color = palette[index % palette.length];
        ship.circle(-size * 0.1, 0, size * 1.35);
        ship.fill({ color, alpha: 0.065 + index * 0.008 });
        ship.moveTo(-size * 3.8, 0);
        ship.lineTo(-size * 0.7, 0);
        ship.stroke({ color, width: Math.max(2, size * 0.13), alpha: 0.4 + index * 0.035 });
        ship.moveTo(-size * 2.8, -size * 0.24);
        ship.lineTo(-size * 0.74, -size * 0.08);
        ship.moveTo(-size * 2.8, size * 0.24);
        ship.lineTo(-size * 0.74, size * 0.08);
        ship.stroke({ color: 0xffffff, width: 1, alpha: 0.18 });
        ship.poly([size, 0, -size * 0.72, -size * 0.64, -size * 0.34, 0, -size * 0.72, size * 0.64]);
        ship.fill({ color, alpha: 0.38 + index * 0.025 });
        ship.stroke({ color: 0xffffff, width: Math.max(1.3, size * 0.075), alpha: 0.86 });
        ship.circle(-size * 0.44, 0, Math.max(1.5, size * 0.12));
        ship.fill({ color, alpha: 0.8 });
        ship.x = width * (0.16 + index * 0.135);
        ship.y = height * (0.31 + (index % 3) * 0.06);
        ship.rotation = -0.08 + index * 0.018;
        ship.blendMode = 'add';
        fleet.addChild(ship);
        elementCount += 1;
      }
      root.addChild(fleet);
      authoredBounds = { x: width * 0.08, y: height * 0.22, width: width * 0.84, height: height * 0.28 };
      animate = (progress, elapsedMs) => {
        root.x = reducedMotion ? 0 : width * (-0.07 + progress * 0.14);
        root.y = reducedMotion ? 0 : Math.sin(elapsedMs * 0.003) * 3;
        fleetHalo.rotation = reducedMotion ? 0 : elapsedMs * 0.00012;
      };
    } else if (variant.id === 'starwhale_constellation') {
      const scale = Math.max(0.62, Math.min(1.15, Math.min(width / 1280, height / 720)));
      const centerX = width * 0.54;
      const centerY = height * 0.29;
      const points = [
        [-220, -12], [-178, -52], [-112, -72], [-38, -68], [38, -48], [112, -14],
        [162, 18], [212, -12], [188, 34], [132, 58], [52, 70], [-34, 62],
        [-108, 42], [-166, 18], [-226, -38], [-278, -72], [-244, -10]
      ].map(([x, y]) => [centerX + x * scale, centerY + y * scale]);
      const glowLines = new PIXI.Graphics();
      glowLines.moveTo(points[0][0], points[0][1]);
      for (let index = 1; index < points.length; index += 1) glowLines.lineTo(points[index][0], points[index][1]);
      glowLines.stroke({ color: palette[1], width: Math.max(5, 9 * scale), alpha: 0.07 });
      glowLines.blendMode = 'add';
      root.addChild(glowLines);
      const lines = new PIXI.Graphics();
      lines.moveTo(points[0][0], points[0][1]);
      for (let index = 1; index < points.length; index += 1) lines.lineTo(points[index][0], points[index][1]);
      lines.stroke({ color: palette[0], width: Math.max(1.3, 2.1 * scale), alpha: 0.54 });
      lines.blendMode = 'add';
      root.addChild(lines);
      for (let index = 0; index < points.length; index += 1) {
        const star = new PIXI.Graphics();
        const radius = Math.max(1.8, (index % 5 === 0 ? 4.6 : 2.8) * scale);
        star.circle(points[index][0], points[index][1], radius * 2.2);
        star.fill({ color: palette[index % palette.length], alpha: 0.18 });
        star.circle(points[index][0], points[index][1], radius);
        star.fill({ color: index % 5 === 0 ? 0xffffff : palette[index % palette.length], alpha: 0.96 });
        star.blendMode = 'add';
        root.addChild(star);
        elementCount += 1;
      }
      const eye = new PIXI.Graphics();
      eye.circle(centerX + 103 * scale, centerY - 18 * scale, 3.4 * scale);
      eye.fill({ color: palette[2], alpha: 0.95 });
      eye.blendMode = 'add';
      root.addChild(eye);
      elementCount += 1;
      for (let index = 0; index < 4; index += 1) {
        const breath = new PIXI.Graphics();
        const length = (46 + index * 24) * scale;
        breath.moveTo(centerX + 205 * scale, centerY - 9 * scale);
        breath.bezierCurveTo(
          centerX + (220 + index * 8) * scale,
          centerY - (22 + index * 4) * scale,
          centerX + (240 + index * 12) * scale,
          centerY + (12 + index * 7) * scale,
          centerX + (205 * scale) + length,
          centerY - (5 + index * 3) * scale
        );
        breath.stroke({ color: palette[(index + 1) % palette.length], width: Math.max(1, 2.6 * scale), alpha: 0.12 + index * 0.035 });
        breath.blendMode = 'add';
        root.addChild(breath);
        elementCount += 1;
      }
      authoredBounds = { x: width * 0.2, y: height * 0.15, width: width * 0.68, height: height * 0.3 };
      animate = (_progress, elapsedMs) => {
        root.x = reducedMotion ? 0 : Math.sin(elapsedMs * 0.0018) * 10;
        root.y = reducedMotion ? 0 : Math.cos(elapsedMs * 0.0021) * 4;
        const pulse = reducedMotion ? 0 : Math.sin(elapsedMs * 0.004) * 0.006;
        root.scale.set(1 + pulse);
      };
    } else if (variant.id === 'aurora_crown') {
      for (let index = 0; index < 5; index += 1) {
        const glow = new PIXI.Graphics();
        const y = height * (0.24 + index * 0.032);
        glow.moveTo(width * 0.13, y + index * 2);
        glow.bezierCurveTo(
          width * 0.34,
          y - height * (0.085 + index * 0.005),
          width * 0.62,
          y + height * (0.095 - index * 0.004),
          width * 0.87,
          y - height * 0.025
        );
        glow.stroke({ color: palette[index % palette.length], width: 17 - index * 1.5, alpha: 0.1 + index * 0.018 });
        glow.blendMode = 'add';
        const ribbon = new PIXI.Graphics();
        ribbon.moveTo(width * 0.13, y + index * 2);
        ribbon.bezierCurveTo(
          width * 0.34,
          y - height * (0.085 + index * 0.005),
          width * 0.62,
          y + height * (0.095 - index * 0.004),
          width * 0.87,
          y - height * 0.025
        );
        ribbon.stroke({ color: palette[index % palette.length], width: Math.max(1.6, 4.2 - index * 0.4), alpha: 0.42 + index * 0.06 });
        ribbon.blendMode = 'add';
        root.addChild(glow, ribbon);
        elementCount += 2;
      }
      const crown = new PIXI.Graphics();
      const crownX = width * 0.52;
      const crownY = height * 0.245;
      const crownW = Math.min(150, width * 0.12);
      const crownH = Math.min(58, height * 0.075);
      crown.poly([
        crownX - crownW * 0.5, crownY + crownH * 0.4,
        crownX - crownW * 0.34, crownY - crownH * 0.22,
        crownX - crownW * 0.12, crownY + crownH * 0.12,
        crownX, crownY - crownH * 0.5,
        crownX + crownW * 0.12, crownY + crownH * 0.12,
        crownX + crownW * 0.34, crownY - crownH * 0.22,
        crownX + crownW * 0.5, crownY + crownH * 0.4
      ]);
      crown.stroke({ color: 0xffffff, width: 1.5, alpha: 0.42 });
      crown.blendMode = 'add';
      root.addChild(crown);
      elementCount += 1;
      animate = (_progress, elapsedMs) => {
        const pulse = reducedMotion ? 0 : Math.sin(elapsedMs * 0.006) * 0.008;
        root.scale.set(1 + pulse);
      };
    } else if (variant.id === 'singularity_bloom') {
      const centerX = width * 0.52;
      const centerY = height * 0.285;
      const baseRadius = Math.min(width * 0.11, height * 0.16);
      const rings = [];
      for (let index = 0; index < 9; index += 1) {
        const ring = new PIXI.Graphics();
        const radius = baseRadius * (0.62 + index * 0.13);
        ring.circle(0, 0, radius);
        ring.stroke({
          color: palette[index % palette.length],
          width: Math.max(1.2, 5.2 - index * 0.38),
          alpha: 0.13 + (index % 3) * 0.055
        });
        ring.x = centerX;
        ring.y = centerY;
        ring.scale.set(1, 0.27 + (index % 3) * 0.055);
        ring.rotation = -0.28 + index * 0.071;
        ring.blendMode = 'add';
        root.addChild(ring);
        rings.push(ring);
        elementCount += 1;
      }
      const lens = new PIXI.Graphics();
      lens.circle(centerX, centerY, baseRadius * 1.36);
      lens.fill({ color: palette[0], alpha: 0.035 });
      lens.circle(centerX, centerY, baseRadius * 0.72);
      lens.fill({ color: 0x02020c, alpha: 0.96 });
      lens.circle(centerX - baseRadius * 0.12, centerY - baseRadius * 0.11, baseRadius * 0.18);
      lens.fill({ color: 0xffffff, alpha: 0.08 });
      root.addChild(lens);
      elementCount += 1;
      const jets = [];
      for (let index = 0; index < 12; index += 1) {
        const jet = new PIXI.Graphics();
        const angle = (Math.PI * 2 * index) / 12;
        const inner = baseRadius * 0.78;
        const outer = baseRadius * (1.4 + (index % 4) * 0.18);
        jet.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner * 0.46);
        jet.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer * 0.46);
        jet.stroke({ color: palette[(index + 1) % palette.length], width: index % 3 === 0 ? 2.8 : 1.2, alpha: 0.17 + (index % 3) * 0.06 });
        jet.blendMode = 'add';
        root.addChild(jet);
        jets.push(jet);
        elementCount += 1;
      }
      authoredBounds = { x: width * 0.31, y: height * 0.08, width: width * 0.42, height: height * 0.4 };
      animate = (_progress, elapsedMs) => {
        rings.forEach((ring, index) => {
          ring.rotation += (index % 2 === 0 ? 1 : -1) * (reducedMotion ? 0.0002 : 0.0012);
        });
        const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsedMs * 0.005) * 0.025;
        lens.scale.set(pulse);
        jets.forEach((jet, index) => {
          jet.alpha = 0.58 + Math.sin(elapsedMs * 0.006 + index) * 0.28;
        });
      };
    } else if (variant.id === 'celestial_koi_procession') {
      const school = new PIXI.Container();
      const fish = [];
      for (let index = 0; index < 5; index += 1) {
        const koi = new PIXI.Container();
        const size = Math.max(17, Math.min(31, width * (0.018 + index * 0.0014)));
        const color = palette[index % palette.length];
        const aura = new PIXI.Graphics();
        aura.circle(0, 0, size * 1.45);
        aura.fill({ color, alpha: 0.07 });
        aura.blendMode = 'add';
        const body = new PIXI.Graphics();
        body.poly([
          size * 1.12, 0,
          size * 0.28, -size * 0.48,
          -size * 0.72, -size * 0.32,
          -size * 0.94, 0,
          -size * 0.72, size * 0.32,
          size * 0.28, size * 0.48
        ]);
        body.fill({ color, alpha: 0.52 });
        body.stroke({ color: 0xffffff, width: Math.max(1, size * 0.055), alpha: 0.72 });
        body.poly([-size * 0.78, 0, -size * 1.52, -size * 0.58, -size * 1.28, 0, -size * 1.52, size * 0.58]);
        body.fill({ color: palette[(index + 1) % palette.length], alpha: 0.38 });
        body.circle(size * 0.55, -size * 0.1, Math.max(1.2, size * 0.075));
        body.fill({ color: 0xffffff, alpha: 0.95 });
        const trail = new PIXI.Graphics();
        for (let strand = 0; strand < 3; strand += 1) {
          trail.moveTo(-size * 1.3, (strand - 1) * size * 0.16);
          trail.bezierCurveTo(
            -size * 2.2,
            (strand - 1) * size * 0.42,
            -size * 3,
            (1 - strand) * size * 0.38,
            -size * (3.6 + strand * 0.28),
            (strand - 1) * size * 0.12
          );
        }
        trail.stroke({ color: palette[(index + 2) % palette.length], width: Math.max(1.2, size * 0.085), alpha: 0.22 });
        trail.blendMode = 'add';
        koi.addChild(aura, trail, body);
        koi.x = width * (0.14 + index * 0.17);
        koi.y = height * (0.19 + (index % 3) * 0.085);
        koi.rotation = -0.08 + index * 0.035;
        school.addChild(koi);
        fish.push(koi);
        elementCount += 3;
      }
      root.addChild(school);
      authoredBounds = { x: width * 0.08, y: height * 0.11, width: width * 0.84, height: height * 0.34 };
      animate = (progress, elapsedMs) => {
        school.x = reducedMotion ? 0 : width * (-0.035 + progress * 0.07);
        fish.forEach((koi, index) => {
          koi.y += reducedMotion ? 0 : Math.sin(elapsedMs * 0.0032 + index * 1.4) * 0.32;
          koi.rotation = -0.05 + Math.sin(elapsedMs * 0.0025 + index) * 0.08;
          koi.scale.y = 0.96 + Math.sin(elapsedMs * 0.004 + index * 0.8) * 0.04;
        });
      };
    } else if (variant.id === 'prismatic_supernova') {
      const centerX = width * 0.52;
      const centerY = height * 0.285;
      const radius = Math.min(width * 0.09, height * 0.135);
      const rayField = new PIXI.Container();
      const rays = [];
      for (let index = 0; index < 28; index += 1) {
        const ray = new PIXI.Graphics();
        const angle = (Math.PI * 2 * index) / 28;
        const inner = radius * (0.58 + (index % 4) * 0.08);
        const outer = radius * (1.5 + (index % 7) * 0.18);
        ray.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
        ray.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
        ray.stroke({
          color: palette[index % palette.length],
          width: index % 4 === 0 ? 3.4 : 1.2,
          alpha: 0.16 + (index % 5) * 0.035
        });
        ray.blendMode = 'add';
        rayField.addChild(ray);
        rays.push(ray);
        elementCount += 1;
      }
      root.addChild(rayField);
      const crystal = new PIXI.Graphics();
      const facets = 12;
      const points = [];
      for (let index = 0; index < facets; index += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / facets;
        const facetRadius = radius * (index % 2 === 0 ? 1 : 0.58);
        points.push(centerX + Math.cos(angle) * facetRadius, centerY + Math.sin(angle) * facetRadius);
      }
      crystal.poly(points);
      crystal.fill({ color: palette[1], alpha: 0.18 });
      crystal.stroke({ color: 0xffffff, width: 2.2, alpha: 0.82 });
      for (let index = 0; index < facets; index += 2) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / facets;
        crystal.moveTo(centerX, centerY);
        crystal.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      }
      crystal.stroke({ color: palette[2], width: 1.2, alpha: 0.55 });
      crystal.circle(centerX, centerY, radius * 0.32);
      crystal.fill({ color: 0xffffff, alpha: 0.9 });
      crystal.blendMode = 'add';
      root.addChild(crystal);
      elementCount += 1;
      authoredBounds = { x: width * 0.3, y: height * 0.06, width: width * 0.44, height: height * 0.44 };
      animate = (progress, elapsedMs) => {
        rayField.rotation = reducedMotion ? 0 : elapsedMs * 0.00012;
        rays.forEach((ray, index) => {
          ray.alpha = 0.55 + Math.sin(elapsedMs * 0.006 + index * 0.7) * 0.3;
        });
        const bloom = reducedMotion ? 1 : 0.92 + Math.sin(elapsedMs * 0.005) * 0.08 + progress * 0.04;
        crystal.scale.set(bloom);
      };
    } else if (variant.id === 'warp_cathedral') {
      const centerX = width * 0.5;
      const horizonY = height * 0.29;
      const arches = [];
      for (let index = 0; index < 9; index += 1) {
        const depth = (index + 1) / 9;
        const arch = new PIXI.Graphics();
        const archW = width * (0.08 + depth * 0.54);
        const archH = height * (0.05 + depth * 0.26);
        arch.moveTo(centerX - archW * 0.5, horizonY + archH * 0.48);
        arch.lineTo(centerX - archW * 0.5, horizonY);
        arch.bezierCurveTo(
          centerX - archW * 0.46,
          horizonY - archH,
          centerX + archW * 0.46,
          horizonY - archH,
          centerX + archW * 0.5,
          horizonY
        );
        arch.lineTo(centerX + archW * 0.5, horizonY + archH * 0.48);
        arch.stroke({
          color: palette[index % palette.length],
          width: Math.max(1.1, 4.8 - index * 0.32),
          alpha: 0.11 + depth * 0.22
        });
        arch.blendMode = 'add';
        root.addChild(arch);
        arches.push(arch);
        elementCount += 1;
      }
      const aisle = new PIXI.Graphics();
      for (let index = 0; index < 7; index += 1) {
        const spread = width * (0.08 + index * 0.052);
        aisle.moveTo(centerX - width * 0.012, horizonY);
        aisle.lineTo(centerX - spread, height * 0.48);
        aisle.moveTo(centerX + width * 0.012, horizonY);
        aisle.lineTo(centerX + spread, height * 0.48);
      }
      aisle.stroke({ color: palette[0], width: 1.2, alpha: 0.12 });
      aisle.blendMode = 'add';
      root.addChild(aisle);
      elementCount += 1;
      const gate = new PIXI.Graphics();
      gate.circle(centerX, horizonY - height * 0.015, Math.min(width, height) * 0.038);
      gate.fill({ color: 0xffffff, alpha: 0.18 });
      gate.circle(centerX, horizonY - height * 0.015, Math.min(width, height) * 0.021);
      gate.fill({ color: palette[2], alpha: 0.84 });
      gate.blendMode = 'add';
      root.addChild(gate);
      elementCount += 1;
      authoredBounds = { x: width * 0.18, y: height * 0.06, width: width * 0.64, height: height * 0.43 };
      animate = (_progress, elapsedMs) => {
        arches.forEach((arch, index) => {
          const wave = reducedMotion ? 0 : Math.sin(elapsedMs * 0.003 + index * 0.8) * 0.035;
          arch.scale.set(1 + wave);
          arch.alpha = 0.68 + Math.sin(elapsedMs * 0.004 + index) * 0.22;
        });
        gate.scale.set(reducedMotion ? 1 : 0.92 + Math.sin(elapsedMs * 0.007) * 0.12);
      };
    } else if (variant.id === 'quantum_eclipse') {
      const centerX = width * 0.53;
      const centerY = height * 0.28;
      const radius = Math.min(width * 0.075, height * 0.115);
      const corona = new PIXI.Container();
      const coronaRays = [];
      for (let index = 0; index < 24; index += 1) {
        const ray = new PIXI.Graphics();
        const angle = (Math.PI * 2 * index) / 24;
        const inner = radius * 0.96;
        const outer = radius * (1.28 + (index % 6) * 0.11);
        ray.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
        ray.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
        ray.stroke({ color: palette[index % palette.length], width: index % 3 === 0 ? 3 : 1.25, alpha: 0.18 + (index % 4) * 0.045 });
        ray.blendMode = 'add';
        corona.addChild(ray);
        coronaRays.push(ray);
        elementCount += 1;
      }
      root.addChild(corona);
      for (let index = 0; index < 4; index += 1) {
        const halo = new PIXI.Graphics();
        halo.circle(centerX, centerY, radius * (1.05 + index * 0.16));
        halo.stroke({ color: palette[(index + 1) % palette.length], width: 2.6 + index, alpha: 0.08 });
        halo.blendMode = 'add';
        root.addChild(halo);
        elementCount += 1;
      }
      const moon = new PIXI.Graphics();
      moon.circle(centerX, centerY, radius);
      moon.fill({ color: 0x030411, alpha: 0.97 });
      moon.circle(centerX - radius * 0.23, centerY - radius * 0.19, radius * 0.18);
      moon.fill({ color: 0x182142, alpha: 0.34 });
      moon.circle(centerX + radius * 0.31, centerY + radius * 0.24, radius * 0.12);
      moon.fill({ color: 0x2f1747, alpha: 0.28 });
      root.addChild(moon);
      elementCount += 1;
      const satellite = new PIXI.Graphics();
      satellite.circle(0, 0, Math.max(4, radius * 0.1));
      satellite.fill({ color: palette[2], alpha: 0.82 });
      satellite.circle(0, 0, Math.max(8, radius * 0.2));
      satellite.stroke({ color: 0xffffff, width: 1, alpha: 0.28 });
      satellite.blendMode = 'add';
      root.addChild(satellite);
      elementCount += 1;
      authoredBounds = { x: width * 0.35, y: height * 0.07, width: width * 0.36, height: height * 0.4 };
      animate = (_progress, elapsedMs) => {
        corona.rotation = reducedMotion ? 0 : elapsedMs * 0.00018;
        coronaRays.forEach((ray, index) => {
          ray.alpha = 0.58 + Math.sin(elapsedMs * 0.006 + index * 0.9) * 0.32;
        });
        const orbit = reducedMotion ? 0.55 : elapsedMs * 0.00125;
        satellite.x = centerX + Math.cos(orbit) * radius * 1.72;
        satellite.y = centerY + Math.sin(orbit) * radius * 0.62;
      };
    } else if (variant.id === 'nebula_jellyfish') {
      const swarm = new PIXI.Container();
      const creatures = [];
      for (let index = 0; index < 3; index += 1) {
        const jelly = new PIXI.Container();
        const radius = Math.max(28, Math.min(52, width * (0.031 + index * 0.004)));
        const color = palette[index % palette.length];
        const halo = new PIXI.Graphics();
        halo.circle(0, 0, radius * 1.35);
        halo.fill({ color, alpha: 0.055 });
        halo.scale.y = 0.68;
        halo.blendMode = 'add';
        const bell = new PIXI.Graphics();
        bell.circle(0, 0, radius);
        bell.fill({ color, alpha: 0.2 });
        bell.stroke({ color: 0xffffff, width: Math.max(1.4, radius * 0.055), alpha: 0.5 });
        bell.scale.y = 0.58;
        bell.blendMode = 'add';
        const core = new PIXI.Graphics();
        core.circle(0, -radius * 0.08, radius * 0.28);
        core.fill({ color: palette[(index + 1) % palette.length], alpha: 0.72 });
        core.blendMode = 'add';
        jelly.addChild(halo, bell, core);
        for (let strand = 0; strand < 7; strand += 1) {
          const tentacle = new PIXI.Graphics();
          const startX = (strand - 3) * radius * 0.18;
          tentacle.moveTo(startX, radius * 0.34);
          tentacle.bezierCurveTo(
            startX - radius * 0.18,
            radius * 0.78,
            startX + radius * 0.28,
            radius * 1.12,
            startX + (strand % 2 === 0 ? 1 : -1) * radius * 0.12,
            radius * (1.38 + (strand % 3) * 0.16)
          );
          tentacle.stroke({ color: palette[(index + strand) % palette.length], width: strand % 2 === 0 ? 2.2 : 1.2, alpha: 0.22 + (strand % 3) * 0.05 });
          tentacle.blendMode = 'add';
          jelly.addChild(tentacle);
          elementCount += 1;
        }
        jelly.x = width * (0.24 + index * 0.27);
        jelly.y = height * (0.2 + (index % 2) * 0.07);
        jelly.scale.set(0.82 + index * 0.12);
        swarm.addChild(jelly);
        creatures.push(jelly);
        elementCount += 3;
      }
      root.addChild(swarm);
      authoredBounds = { x: width * 0.14, y: height * 0.08, width: width * 0.72, height: height * 0.42 };
      animate = (_progress, elapsedMs) => {
        creatures.forEach((jelly, index) => {
          const drift = reducedMotion ? 0 : Math.sin(elapsedMs * 0.0023 + index * 2.1);
          jelly.y += drift * 0.42;
          jelly.x += reducedMotion ? 0 : Math.cos(elapsedMs * 0.0018 + index) * 0.18;
          jelly.rotation = drift * 0.045;
          const pulse = 0.82 + index * 0.12 + (reducedMotion ? 0 : Math.sin(elapsedMs * 0.005 + index) * 0.025);
          jelly.scale.set(pulse, pulse * (0.96 + Math.sin(elapsedMs * 0.005 + index) * 0.035));
        });
      };
    } else if (variant.id === 'phoenix_comet') {
      const centerX = width * 0.52;
      const centerY = height * 0.31;
      const scale = Math.max(0.72, Math.min(1.35, Math.min(width / 1280, height / 720)));
      const phoenix = new PIXI.Container();
      phoenix.x = centerX;
      phoenix.y = centerY;
      const tail = new PIXI.Graphics();
      for (let strand = 0; strand < 7; strand += 1) {
        tail.moveTo(0, 12 * scale);
        tail.bezierCurveTo(
          (-44 + strand * 14) * scale,
          42 * scale,
          (-72 + strand * 24) * scale,
          88 * scale,
          (-94 + strand * 31) * scale,
          132 * scale
        );
      }
      tail.stroke({ color: palette[1], width: Math.max(1.4, 3.8 * scale), alpha: 0.18 });
      tail.blendMode = 'add';
      phoenix.addChild(tail);
      const wings = [];
      for (const side of [-1, 1]) {
        const wing = new PIXI.Container();
        for (let feather = 0; feather < 9; feather += 1) {
          const plume = new PIXI.Graphics();
          const angle = (-0.18 - feather * 0.085) * side;
          const length = (62 + feather * 12) * scale;
          plume.moveTo(0, 0);
          plume.bezierCurveTo(
            side * length * 0.35,
            -length * 0.18,
            side * length * 0.72,
            -length * 0.5,
            side * length,
            -length * (0.36 + feather * 0.018)
          );
          plume.stroke({
            color: palette[(feather + (side > 0 ? 1 : 0)) % palette.length],
            width: Math.max(1.2, (5.2 - feather * 0.34) * scale),
            alpha: 0.18 + feather * 0.025
          });
          plume.rotation = angle * 0.12;
          plume.blendMode = 'add';
          wing.addChild(plume);
          elementCount += 1;
        }
        phoenix.addChild(wing);
        wings.push({ wing, side });
      }
      const body = new PIXI.Graphics();
      body.poly([
        0, -44 * scale,
        18 * scale, -8 * scale,
        10 * scale, 26 * scale,
        0, 46 * scale,
        -10 * scale, 26 * scale,
        -18 * scale, -8 * scale
      ]);
      body.fill({ color: palette[1], alpha: 0.48 });
      body.stroke({ color: 0xffffff, width: Math.max(1.3, 2.2 * scale), alpha: 0.78 });
      body.circle(0, -50 * scale, 8 * scale);
      body.fill({ color: palette[0], alpha: 0.82 });
      body.poly([6 * scale, -53 * scale, 20 * scale, -49 * scale, 7 * scale, -45 * scale]);
      body.fill({ color: palette[2], alpha: 0.8 });
      body.blendMode = 'add';
      phoenix.addChild(body);
      elementCount += 1;
      const cometHalo = new PIXI.Graphics();
      cometHalo.circle(0, -8 * scale, 56 * scale);
      cometHalo.fill({ color: palette[0], alpha: 0.045 });
      cometHalo.blendMode = 'add';
      phoenix.addChildAt(cometHalo, 0);
      elementCount += 1;
      root.addChild(phoenix);
      authoredBounds = { x: width * 0.26, y: height * 0.05, width: width * 0.52, height: height * 0.44 };
      animate = (progress, elapsedMs) => {
        phoenix.y = centerY + (reducedMotion ? 0 : Math.sin(elapsedMs * 0.003) * 6 - progress * height * 0.035);
        phoenix.rotation = reducedMotion ? 0 : Math.sin(elapsedMs * 0.002) * 0.035;
        wings.forEach(({ wing, side }) => {
          wing.rotation = side * (reducedMotion ? 0 : Math.sin(elapsedMs * 0.005) * 0.045);
        });
        const pulse = reducedMotion ? 1 : 0.96 + Math.sin(elapsedMs * 0.006) * 0.045;
        phoenix.scale.set(pulse);
      };
    }

    const variantAnimate = animate;
    animate = (progress, elapsedMs) => {
      sparkField.x = reducedMotion ? 0 : Math.sin(elapsedMs * 0.0008) * width * 0.008;
      sparkField.y = reducedMotion ? 0 : Math.cos(elapsedMs * 0.0011) * height * 0.004;
      sparkField.alpha = reducedMotion ? 0.48 : 0.4 + Math.sin(elapsedMs * 0.0035) * 0.12;
      if (generatedArt) {
        const pulse = reducedMotion ? 1 : 0.985 + Math.sin(elapsedMs * 0.0019) * 0.025;
        generatedArt.scale.set(generatedArt._baseScale * pulse);
        generatedArt.y = height * 0.29 + (reducedMotion ? 0 : Math.sin(elapsedMs * 0.00135) * height * 0.008);
        generatedArt.rotation = reducedMotion ? 0 : Math.sin(elapsedMs * 0.00085) * 0.008;
        generatedArt.alpha = (reducedMotion ? 0.7 : 0.78 + Math.sin(elapsedMs * 0.0024) * 0.08) * (0.92 + Math.min(1, progress / 0.2) * 0.08);
      }
      variantAnimate(progress, elapsedMs);
    };
    let proceduralAccentAlpha = 1;
    if (generatedArt) {
      generatedArt._baseScale = generatedArt.scale.x;
      const proceduralAccentLayer = new PIXI.Container();
      proceduralAccentLayer.label = `cabinet_wonder_procedural_accents_${variant.id}`;
      proceduralAccentAlpha = 0.16;
      proceduralAccentLayer.alpha = proceduralAccentAlpha;
      root.children
        .filter((child) => child !== generatedArt)
        .forEach((child) => proceduralAccentLayer.addChild(child));
      root.addChild(proceduralAccentLayer);
    }
    return { root, elementCount, authoredBounds, animate, generatedArtReady: Boolean(generatedArt), proceduralAccentAlpha };
  }

  showCabinetWonder(decision = {}) {
    if (!decision.variant || this.activeCabinetWonder || !this.gameContainer) return false;
    if (decision.reason !== 'debug_force' && this.cabinetWonderHistory.some((entry) => entry.sector === decision.sector)) return false;
    const width = Math.max(320, Number(this.gameplayGame?.getWidth?.()) || Number(this.game?.getWidth?.()) || 1280);
    const height = Math.max(240, Number(this.gameplayGame?.getHeight?.()) || Number(this.game?.getHeight?.()) || 720);
    const reducedMotion = Boolean(getAccessibilitySettings().prefersReducedMotion);
    const durationMs = reducedMotion ? 1400 : 2300;
    const visual = this.createCabinetWonderVisual(decision.variant, width, height, reducedMotion);
    visual.root.alpha = 0;
    this.gameContainer.addChild(visual.root);
    this.gameContainer.sortChildren?.();
    AudioManager.init();
    const audioPlayed = AudioManager.playSpectacleAccent('wonder', {
      force: true,
      cooldownKey: 'cabinet_wonder',
      minIntervalMs: 0,
      intensity: reducedMotion ? 0.5 : 0.72,
      volume: 0.76,
      pitchScale: decision.variant.pitchScale || 1,
      durationSeconds: reducedMotion ? 0.7 : 1.18
    });
    const codexDiscovery = recordThreatSeen(decision.variant.id, 'wonders', {
      name: decision.variant.title,
      signalClass: decision.variant.signalClass,
      source: 'cabinet_wonder'
    });
    const historyEntry = {
      id: decision.variant.id,
      title: decision.variant.title,
      sector: decision.sector,
      waveNumber: decision.waveNumber,
      chance: decision.chance,
      roll: decision.roll,
      reason: decision.reason,
      scoreNeutral: true,
      gameplayNeutral: true,
      reducedMotion,
      durationMs,
      elementCount: visual.elementCount,
      authoredBounds: { ...visual.authoredBounds },
      audioProfile: 'wonder',
      audioPlayed,
      codexDiscovered: Boolean(codexDiscovery?.isNew),
      layer: 'gameplay_background',
      visualLanguage: visual.generatedArtReady ? 'cabinet_wonder_imagegen_v2' : 'cabinet_wonder_procedural_fallback',
      generatedArtReady: visual.generatedArtReady,
      proceduralAccentAlpha: visual.proceduralAccentAlpha,
      active: true,
      completed: false,
      startedAt: Date.now()
    };
    this.cabinetWonderHistory.push(historyEntry);
    const active = {
      root: visual.root,
      ticker: null,
      elapsedMs: 0,
      durationMs,
      animate: visual.animate,
      historyEntry
    };
    const ticker = (delta) => {
      if (!active.root?.parent || this.game?.currentScene !== this) {
        this.clearCabinetWonder('scene_changed');
        return;
      }
      active.elapsedMs += (Number(delta?.deltaTime) || Number(delta) || 1) * 16.67;
      const progress = Math.min(1, active.elapsedMs / durationMs);
      const intro = Math.min(1, progress / 0.18);
      const outro = Math.max(0, (progress - 0.72) / 0.28);
      active.root.alpha = (1 - Math.pow(1 - intro, 3)) * (1 - outro);
      active.animate(progress, active.elapsedMs);
      if (active.elapsedMs >= durationMs) this.clearCabinetWonder('complete');
    };
    active.ticker = ticker;
    this.activeCabinetWonder = active;
    this.game?.app?.ticker?.add?.(ticker);
    this._activeTickers ||= [];
    this._activeTickers.push(ticker);
    return true;
  }

  clearCabinetWonder(reason = 'cleared') {
    const active = this.activeCabinetWonder;
    if (!active) return false;
    if (active.ticker && this.game?.app?.ticker) this.game.app.ticker.remove(active.ticker);
    this._activeTickers = (this._activeTickers || []).filter((ticker) => ticker !== active.ticker);
    if (active.root?.parent) active.root.parent.removeChild(active.root);
    active.root?.destroy?.({ children: true });
    active.historyEntry.active = false;
    active.historyEntry.completed = reason === 'complete';
    active.historyEntry.endedReason = reason;
    active.historyEntry.elapsedMs = Math.round(active.elapsedMs);
    active.historyEntry.endedAt = Date.now();
    this.activeCabinetWonder = null;
    return true;
  }

  getCabinetWonderDebugState() {
    const active = this.activeCabinetWonder;
    const last = this.cabinetWonderHistory.at(-1) || null;
    const screenHeight = Math.max(240, Number(this.gameplayGame?.getHeight?.()) || Number(this.game?.getHeight?.()) || 720);
    return {
      availableVariants: CABINET_WONDER_VARIANT_COUNT,
      shownCount: this.cabinetWonderHistory.length,
      eligibleChecks: this.cabinetWonderEligibleChecks,
      onePerRun: false,
      onePerSector: true,
      cadenceSectors: 3,
      pending: this.pendingCabinetWonder ? {
        id: this.pendingCabinetWonder.decision?.variant?.id || null,
        sector: this.pendingCabinetWonder.decision?.sector || null
      } : null,
      scoreNeutral: true,
      gameplayNeutral: true,
      active: active ? {
        id: active.historyEntry.id,
        elapsedMs: Math.round(active.elapsedMs),
        durationMs: active.durationMs,
        reducedMotion: active.historyEntry.reducedMotion,
        elementCount: active.historyEntry.elementCount,
        audioProfile: active.historyEntry.audioProfile,
        layer: active.historyEntry.layer,
        visualLanguage: active.historyEntry.visualLanguage,
        generatedArtReady: active.historyEntry.generatedArtReady,
        proceduralAccentAlpha: active.historyEntry.proceduralAccentAlpha,
        authoredBounds: { ...active.historyEntry.authoredBounds },
        upperFieldSafe: active.historyEntry.authoredBounds.y + active.historyEntry.authoredBounds.height <= screenHeight * 0.5
      } : null,
      overlayCount: this.gameContainer?.children?.filter?.((child) => String(child?.label || '').startsWith('cabinet_wonder_')).length || 0,
      lastDecision: this.cabinetWonderLastDecision ? { ...this.cabinetWonderLastDecision } : null,
      last: last ? { ...last, authoredBounds: { ...last.authoredBounds } } : null,
      history: this.cabinetWonderHistory.map((entry) => ({ ...entry, authoredBounds: { ...entry.authoredBounds } }))
    };
  }

  getRunContractProgressChanges(previousActive = [], nextActive = [], completed = []) {
    const completedIds = new Set((completed || []).map((entry) => entry?.id).filter(Boolean));
    const previousById = new Map(previousActive.map((item) => [item.id, item]));
    return (nextActive || [])
      .map((item) => {
        const contract = getRunContractById(item.id);
        if (!contract || !item.eligible) return null;
        const previous = previousById.get(item.id) || {};
        const previousProgress = Math.max(0, Math.floor(Number(previous.progress) || 0));
        const progress = Math.max(0, Math.floor(Number(item.progress) || 0));
        const target = Math.max(1, Math.floor(Number(item.target || contract.target) || 1));
        if (progress <= previousProgress) return null;
        return {
          id: item.id,
          title: contract.title,
          shortTitle: contract.shortTitle || contract.title,
          orderSlot: formatRunContractOrderSlotLabel(item.id),
          progress: Math.min(target, progress),
          previousProgress: Math.min(target, previousProgress),
          target,
          completed: Boolean(item.completed || completedIds.has(item.id)),
          lastSector: Math.max(1, Math.floor(Number(item.lastSector || this.game?.level) || 1))
        };
      })
      .filter(Boolean);
  }

  recordRunContractProgressThisRun(change = {}) {
    if (!change.id || !this.runContractProgressThisRun) return;
    const existing = this.runContractProgressThisRun.get(change.id);
    const previousProgress = existing
      ? Math.min(existing.previousProgress, change.previousProgress)
      : change.previousProgress;
    this.runContractProgressThisRun.set(change.id, {
      id: change.id,
      title: change.title,
      shortTitle: change.shortTitle || change.title,
      orderSlot: change.orderSlot || existing?.orderSlot || formatRunContractOrderSlotLabel(change.id),
      previousProgress,
      progress: Math.max(Number(existing?.progress) || 0, Number(change.progress) || 0),
      target: Math.max(1, Number(change.target) || Number(existing?.target) || 1),
      completed: Boolean(change.completed || existing?.completed),
      lastSector: Math.max(1, Number(change.lastSector) || Number(existing?.lastSector) || 1)
    });
  }

  getRunContractProgressToastMarker(change = {}) {
    const progress = Math.max(0, Math.floor(Number(change.progress) || 0));
    const previous = Math.max(0, Math.floor(Number(change.previousProgress) || 0));
    const target = Math.max(1, Math.floor(Number(change.target) || 1));
    if (change.completed || target <= 1 || progress <= previous || progress >= target) return null;
    if (target <= 10) return String(progress);
    const previousPercent = previous / target;
    const progressPercent = progress / target;
    const thresholds = [0.25, 0.5, 0.75];
    const crossed = thresholds.find((threshold) => previousPercent < threshold && progressPercent >= threshold);
    return crossed ? String(Math.round(crossed * 100)) : null;
  }

  showRunContractProgress(change = {}) {
    const marker = this.getRunContractProgressToastMarker(change);
    if (!marker) return;
    const previousMarker = this.runContractProgressToastMarkers?.get(change.id);
    if (previousMarker === marker) return;
    this.runContractProgressToastMarkers?.set(change.id, marker);
    const contract = getRunContractById(change.id);
    const title = translateText(contract?.shortTitle || change.shortTitle || change.title || change.id);
    const progressLabel = this.getRunContractTrackProgressLabel();
    const progressMessage = translateText('ORDER PROGRESS: {title} {progress}/{target}', {
      title,
      ...formatRunContractProgressValue(change.progress, change.target)
    });
    const message = progressLabel
      ? `${progressMessage}\n${translateText('PILOT ORDERS')} ${progressLabel}`
      : progressMessage;
    const compactHud = this.game.getWidth() < 620;
    this.enqueueToast(message, {
      fontSize: compactHud ? 15 : 18,
      fill: '#fff3a2',
      stroke: '#031321',
      strokeThickness: compactHud ? 3 : 4,
      slot: 'top',
      type: 'runContractProgress',
      priority: 2,
      bypassFocusLock: false,
      duration: progressLabel ? 4600 : 4000,
      banner: true,
      title: translateText('PILOT ORDERS'),
      fontSize: compactHud ? 17 : 18,
      fill: '#eafcff',
      align: 'left',
      y: Math.min(this.game.getHeight() - 132, Math.max(compactHud ? 154 : 202, this.game.getHeight() * 0.28)),
      maxWidth: compactHud ? this.game.getWidth() * 0.82 : Math.min(620, this.game.getWidth() * 0.46),
      accent: contract?.accent || 0x7fffd8
    });
  }

  clearRunContractStartNudge() {
    if (!this.runContractStartNudgeTimeout) return;
    clearTimeout(this.runContractStartNudgeTimeout);
    this.runContractStartNudgeTimeout = null;
  }

  clearFirstRunOnboardingCompletion() {
    if (!this.firstRunOnboardingCompletionTimeout) return;
    clearTimeout(this.firstRunOnboardingCompletionTimeout);
    this.firstRunOnboardingCompletionTimeout = null;
  }

  completeFirstRunOnboarding() {
    this.firstRunOnboardingComplete = true;
    this.firstRunOnboardingUntil = 0;
    this.firstRunOnboardingCompletionTimeout = null;
    this.game?.flushAchievementToasts?.(this);
    if (!this.activeAchievementToast && this.achievementToastQueue.length > 0) {
      const next = this.achievementToastQueue.shift();
      this.showAchievementToastNow(next);
    }
  }

  getFirstRunControlsNudge() {
    const progress = this.game?.hangarProgressAtRunStart || readHangarProgressState();
    if ((Number(progress?.totalRuns) || 0) > 0) return null;
    const usingController = this.game?.runStartInputDevice === 'controller';
    return translateText(usingController
      ? 'Stick/D-Pad: Move | LT: Focus | A/RT: Shoot | B/LB: Phase | Start: Pause'
      : 'WASD/Arrows: Move | Ctrl: Focus | Space: Shoot | Shift: Phase | P/Esc: Pause');
  }

  scheduleRunContractStartNudge({ delayMs = null, onFirstRunControlsShown = null } = {}) {
    this.clearRunContractStartNudge();
    const firstRunControls = this.getFirstRunControlsNudge();
    if (!firstRunControls) return;
    this.runContractStartNudgeTimeout = setTimeout(() => {
      this.runContractStartNudgeTimeout = null;
      if (this.gameOverSequenceStarted) return;
      const controls = this.getFirstRunControlsNudge();
      if (!controls) return;
      const compactHud = this.game.getWidth() < 620;
      this.enqueueToast(controls, {
        fontSize: compactHud ? 14 : 18,
        fill: '#eafcff',
        stroke: '#031321',
        strokeThickness: compactHud ? 3 : 4,
        slot: 'top',
        type: 'firstRunControls',
        priority: 1,
        bypassFocusLock: false,
        duration: FIRST_RUN_CONTROLS_DURATION_MS,
        minVisibleMs: FIRST_RUN_CONTROLS_MIN_VISIBLE_MS,
        banner: true,
        align: 'center',
        y: Math.max(compactHud ? 154 : 184, this.game.getHeight() * 0.17),
        maxWidth: compactHud ? this.game.getWidth() * 0.84 : Math.min(760, this.game.getWidth() * 0.58),
        accent: 0xffd15c,
        onShown: ({ shownAt }) => {
          this.firstRunControlsShownAt = shownAt;
          this.firstRunOnboardingUntil = shownAt + FIRST_RUN_CONTROLS_TOTAL_MS;
          this.reserveMessageFocus(FIRST_RUN_CONTROLS_TOTAL_MS, {
            priority: 2,
            slots: ['corner']
          });
          this.clearFirstRunOnboardingCompletion();
          this.firstRunOnboardingCompletionTimeout = setTimeout(
            () => this.completeFirstRunOnboarding(),
            FIRST_RUN_CONTROLS_TOTAL_MS + 160
          );
          onFirstRunControlsShown?.({ shownAt });
        }
      });
    }, Number.isFinite(Number(delayMs)) ? Math.max(0, Number(delayMs)) : FIRST_RUN_CONTROLS_DELAY_MS);
  }

  shouldPersistRunContractProgress(type, result = {}) {
    if ((result.completed || []).length > 0) return true;
    if (type === 'near_miss') {
      const trackedGrazeOrder = (result.session?.active || []).find((item) => {
        const contract = getRunContractById(item.id);
        return contract?.objective === 'grazes'
          && item.eligible
          && !item.completed;
      });
      if (!trackedGrazeOrder) return true;
      const progress = Math.max(0, Math.floor(Number(trackedGrazeOrder.progress) || 0));
      return progress <= 5 || progress % 5 === 0;
    }
    if (type !== 'enemy_defeated') return true;
    const trackedEnemyOrder = (result.session?.active || []).find((item) => {
      const contract = getRunContractById(item.id);
      return (contract?.objective === 'enemy_defeats' || contract?.objective === 'unique_enemy_defeats')
        && item.eligible
        && !item.completed;
    });
    if (!trackedEnemyOrder) return false;
    const progress = Math.max(0, Math.floor(Number(trackedEnemyOrder.progress) || 0));
    const contract = getRunContractById(trackedEnemyOrder.id);
    if (contract?.objective === 'unique_enemy_defeats') return progress <= 5 || progress % 5 === 0;
    return progress <= 5 || progress % 25 === 0;
  }

  persistRunContractCompletion(completion) {
    if (!completion?.id) return;
    if (this.isCollisionHotPathActive) {
      this.queueDeferredRunContractCompletion(completion);
      return;
    }
    if (this.runContractPersistenceDirty || this.deferredRunContractCompletions?.length) {
      this.flushDeferredRunContractProgress(true);
    }
    const previous = readHangarProgressState();
    const wasAllComplete = areAllRunContractsComplete(previous.runContracts);
    const runContracts = recordRunContractCompletion(previous.runContracts, completion);
    const isAllComplete = areAllRunContractsComplete(runContracts);
    if (!wasAllComplete && isAllComplete && this.runContractSession) {
      this.runContractSession.allCompleteThisRun = true;
      this.runContractSession.allCompletedAt = runContracts.allCompletedAt || completion.completedAt || null;
    }
    writeHangarProgressState({
      ...previous,
      runContracts
    });
  }

  persistRunContractSessionProgress() {
    if (!this.runContractSession) return;
    if (this.isCollisionHotPathActive) {
      this.runContractPersistenceDirty = true;
      return;
    }
    if (this.runContractPersistenceDirty || this.deferredRunContractCompletions?.length) {
      const flushed = this.flushDeferredRunContractProgress(true);
      if (flushed.flushed) return;
    }
    const previous = readHangarProgressState();
    const runContracts = recordRunContractSessionProgress(previous.runContracts, this.runContractSession);
    writeHangarProgressState({
      ...previous,
      runContracts
    });
    this.lastRunContractProgressWriteAt = Date.now();
  }

  queueDeferredRunContractCompletion(completion = {}) {
    if (!completion?.id) return;
    if (!Array.isArray(this.deferredRunContractCompletions)) this.deferredRunContractCompletions = [];
    const existingIndex = this.deferredRunContractCompletions.findIndex((entry) => entry?.id === completion.id);
    if (existingIndex >= 0) {
      this.deferredRunContractCompletions[existingIndex] = {
        ...this.deferredRunContractCompletions[existingIndex],
        ...completion
      };
    } else {
      this.deferredRunContractCompletions.push({ ...completion });
    }
    this.runContractPersistenceDirty = true;
  }

  queueDeferredRunContractEnemyDefeat(payload = {}) {
    if (!Array.isArray(this.deferredRunContractEnemyDefeats)) this.deferredRunContractEnemyDefeats = [];
    this.deferredRunContractEnemyDefeats.push({ ...payload });
  }

  flushDeferredRunContractEvents(maxEvents = 100) {
    const pending = Array.isArray(this.deferredRunContractEnemyDefeats)
      ? this.deferredRunContractEnemyDefeats
      : [];
    if (pending.length === 0) return { flushed: 0, pending: 0 };
    const limit = Math.max(1, Math.floor(Number(maxEvents) || 100));
    const batch = pending.splice(0, limit);
    this.processingDeferredRunContractEvents = true;
    try {
      for (const payload of batch) {
        this.emitRunContractEvent('enemy_defeated', {
          ...payload,
          deferPersistence: true
        });
      }
    } finally {
      this.processingDeferredRunContractEvents = false;
    }
    return {
      flushed: batch.length,
      pending: pending.length
    };
  }

  markRunContractAllCompleteTransition(previousRunContracts, nextRunContracts, completion = {}) {
    const wasAllComplete = areAllRunContractsComplete(previousRunContracts);
    const isAllComplete = areAllRunContractsComplete(nextRunContracts);
    if (!wasAllComplete && isAllComplete && this.runContractSession) {
      this.runContractSession.allCompleteThisRun = true;
      this.runContractSession.allCompletedAt = nextRunContracts.allCompletedAt || completion.completedAt || null;
    }
  }

  showRunContractCompletion(contractId) {
    const contract = getRunContractById(contractId);
    if (!contract) return;
    const title = translateText(contract.shortTitle || contract.title);
    const nextSummary = this.getNextRunContractSummary();
    const reward = getRunContractReward(contract);
    const rewardLine = reward?.pilotXp
      ? translateText('REWARD: +{xp} Career XP', { xp: Number(reward.pilotXp).toLocaleString('en-US') })
      : null;
    const message = [
      translateText('ORDER COMPLETE: {title}', { title }),
      rewardLine,
      nextSummary ? `${translateText('NEXT')}: ${nextSummary.title} ${nextSummary.progress}` : null
    ].filter(Boolean).join('\n');
    const compactHud = this.game.getWidth() < 620;
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    this.enqueueToast(message, {
      fontSize: compactHud ? 17 : 22,
      fill: '#f6fbff',
      stroke: '#031321',
      strokeThickness: compactHud ? 3 : 4,
      slot: 'top',
      type: 'runContract',
      priority: 4,
      bypassFocusLock: false,
      duration: nextSummary ? 7600 : 6400,
      banner: true,
      title: translateText('PILOT ORDERS'),
      fontSize: compactHud ? 18 : 20,
      fill: '#f4fdff',
      align: 'center',
      y: Math.min(height - 132, Math.max(compactHud ? 132 : 158, height * 0.22)),
      maxWidth: compactHud ? width * 0.92 : Math.min(680, width * 0.54),
      accent: contract.accent || 0x7fffd8
    });
  }

  getRunContractDebugState() {
    const state = getRunContractSessionState(this.runContractSession);
    if (!state) return state;
    const menuState = getRunContractMenuState(readHangarProgressState(), {
      forceCompletionVisible: true,
      showPilotOrders: true
    });
    state.completedCount = menuState.completedCount || 0;
    state.total = menuState.total || 0;
    state.progressLabel = menuState.progressLabel || null;
    state.progressThisRun = Array.from(this.runContractProgressThisRun?.values?.() || [])
      .filter((entry) => !entry.completed && Number(entry.progress) > Number(entry.previousProgress))
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        shortTitle: entry.shortTitle || entry.title,
        orderSlot: entry.orderSlot || formatRunContractOrderSlotLabel(entry.id),
        previousProgress: Math.max(0, Math.floor(Number(entry.previousProgress) || 0)),
        progress: Math.max(0, Math.floor(Number(entry.progress) || 0)),
        target: Math.max(1, Math.floor(Number(entry.target) || 1)),
        lastSector: Math.max(1, Math.floor(Number(entry.lastSector) || 1))
      }));
    state.next = Array.isArray(menuState.next) ? menuState.next : [];
    return state;
  }

  getRunContractTrackProgressLabel() {
    const menuState = getRunContractMenuState(readHangarProgressState(), {
      forceCompletionVisible: true,
      showPilotOrders: true
    });
    return translateText('COMPLETED: {count}', {
      count: menuState.progressLabel || '0'
    });
  }

  getNextRunContractSummary(state = null) {
    const source = state || this.getRunContractDebugState();
    const item = (source?.next || []).find((entry) => entry?.id && !entry.completed);
    if (!item) return null;
    const title = translateText(item.shortTitle || item.title || item.id);
    return {
      title,
      progress: translateText('{progress}/{target}', formatRunContractProgressValue(item.progress, item.target))
    };
  }

  countDangerousBulletsNearPlayer(radius = 96) {
    if (!this.player || !this.bulletManager?.enemyBullets) return 0;
    const px = Number(this.player.x) || 0;
    const py = Number(this.player.y) || 0;
    const threshold = Math.max(radius, (Number(this.player.radius) || 12) + 72);
    let count = 0;
    for (const bullet of this.bulletManager.enemyBullets) {
      if (!bullet?.active) continue;
      const dx = (Number(bullet.x) || 0) - px;
      const dy = (Number(bullet.y) || 0) - py;
      if ((dx * dx + dy * dy) <= threshold * threshold) count += 1;
    }
    return count;
  }

  updateRunContractActionWatchers() {
    const phaseActive = Boolean(this.player?.isDodging);
    if (phaseActive && !this.playerPhaseWasActive) {
      const nearbyBullets = this.countDangerousBulletsNearPlayer();
      this.emitRunContractEvent('phase_used', {
        sector: this.game?.level || 1,
        dangerous: nearbyBullets > 0,
        nearbyBullets
      });
      this.emitTacticalDirectiveEvent('phase_used', {
        sector: this.game?.level || 1,
        dangerous: nearbyBullets > 0,
        nearbyBullets
      });
    }
    this.playerPhaseWasActive = phaseActive;

    if (
      this.blinkDriveOrderStartedAt !== null &&
      !this.blinkDriveOrderCompleted &&
      (this.gameTime - this.blinkDriveOrderStartedAt) >= 6
    ) {
      this.blinkDriveOrderCompleted = true;
      this.emitRunContractEvent('blink_drive_survived', {
        sector: this.game?.level || 1,
        survivedSeconds: Math.floor(this.gameTime - this.blinkDriveOrderStartedAt)
      });
    }
  }

  recordBalanceBossStart(boss) {
    const stats = this.balanceDebug;
    if (!stats || !boss || stats.currentBossRef === boss) return;
    const now = Date.now();
    const encounter = {
      level: Number(boss.level || this.game?.level || 1),
      name: boss.name || boss.bossType || 'UNKNOWN BOSS',
      archetype: boss.profile?.archetype || null,
      startedAt: now,
      timeToBossMs: now - stats.startedAt,
      hpMax: Math.round(Number(boss.maxHealth) || 0),
      playerLivesAtStart: Number(this.game?.lives) || 0,
      playerShieldAtStart: Boolean(this.player?.shieldActive),
      phases: [],
      hpSamples: []
    };
    stats.currentBossRef = boss;
    stats.currentBossEncounter = encounter;
    stats.bossEncounters.push(encounter);
    this.recordBalanceBossHp(boss, true);
  }

  recordBalanceBossHp(boss, force = false) {
    const stats = this.balanceDebug;
    const encounter = stats?.currentBossEncounter;
    if (!stats || !encounter || !boss) return;
    const now = Date.now();
    if (!force && now - stats.lastBossSampleAt < 1000) return;
    stats.lastBossSampleAt = now;
    encounter.hpSamples.push({
      tSec: Number(((now - encounter.startedAt) / 1000).toFixed(1)),
      hp: Math.max(0, Number((Number(boss.health) || 0).toFixed(2)))
    });
  }

  sampleBalanceBoss() {
    const stats = this.balanceDebug;
    if (!stats) return;
    const boss = this.enemyManager?.boss;
    if (!boss) return;
    if (boss.active && stats.currentBossRef !== boss) {
      this.recordBalanceBossStart(boss);
    }
    if (boss.active) {
      this.recordBalanceBossHp(boss);
    }
  }

  recordBalanceBossPhase(phase, boss) {
    const stats = this.balanceDebug;
    if (!stats) return;
    if (boss && stats.currentBossRef !== boss) {
      this.recordBalanceBossStart(boss);
    }
    const encounter = stats.currentBossEncounter;
    if (!encounter) return;
    encounter.phases.push({
      phase,
      tSec: Number(((Date.now() - encounter.startedAt) / 1000).toFixed(1)),
      hp: Math.max(0, Math.round(Number(boss?.health) || 0))
    });
  }

  recordBalanceBossEnd() {
    const stats = this.balanceDebug;
    const encounter = stats?.currentBossEncounter;
    if (!stats || !encounter) return;
    const now = Date.now();
    encounter.durationMs = now - encounter.startedAt;
    if (stats.currentBossRef) {
      this.recordBalanceBossHp(stats.currentBossRef, true);
    }
    stats.currentBossRef = null;
    stats.currentBossEncounter = null;
  }

  flushBalanceDebugSummary(reason = 'scene_end') {
    const stats = this.balanceDebug;
    if (!stats || stats.flushed) return;
    stats.flushed = true;
    if (stats.currentBossEncounter) {
      this.recordBalanceBossEnd();
    }
    const summary = {
      reason,
      runDurationSec: Number(((Date.now() - stats.startedAt) / 1000).toFixed(1)),
      waveOrLevelReached: Number(this.game?.level) || 1,
      selectedShip: stats.selectedShip,
      runMode: stats.runMode,
      killsByEnemyType: stats.killsByEnemyType,
      damageTakenBySource: stats.damageTakenBySource,
      deathSource: stats.finalDeathSource || stats.lastDeathSource || stats.lastDamageSource || null,
      timeToFirstBossSec: stats.bossEncounters[0]
        ? Number((stats.bossEncounters[0].timeToBossMs / 1000).toFixed(1))
        : null,
      bossEncounters: stats.bossEncounters.map((encounter) => ({
        level: encounter.level,
        name: encounter.name,
        archetype: encounter.archetype,
        durationSec: Number(((encounter.durationMs || Date.now() - encounter.startedAt) / 1000).toFixed(1)),
        hpMax: encounter.hpMax,
        playerLivesAtStart: encounter.playerLivesAtStart,
        playerShieldAtStart: encounter.playerShieldAtStart,
        phases: encounter.phases,
        hpSamples: encounter.hpSamples
      })),
      pickupsCollected: stats.pickupsCollected,
      deaths: stats.deaths,
      respawns: stats.respawns,
      score: Number(this.game?.score) || 0
    };
    console.log('[BalanceDebugSummary]', summary);
  }

  startLevel(source = 'unknown') {
    const measurePerformance = this.performanceDiagnostics?.measure?.bind(this.performanceDiagnostics) || ((_label, callback) => callback());
    this.performanceDiagnostics?.mark?.('level_start.scene_begin', {
      source,
      level: this.game?.level || 1
    });
    if (this.game?.currentScene && this.game.currentScene !== this) {
      return;
    }
    if (!this.canUseMaintainerDevtools()) {
      this.debugStartLevel = null;
      this.debugStartAtBoss = false;
      this.debugPowerups = false;
      this.debugOverlayEnabled = false;
    }
    if (Number.isFinite(this.debugStartLevel)) {
      this.game.level = this.debugStartLevel;
      this.debugStartLevel = null;
    }
    const startAtBoss = this.debugStartAtBoss;
    this.debugStartAtBoss = false;

    // GUARD: specific level start
    if (this._lastStartedLevel === this.game.level) {
      console.log(`[LevelStart] suppressed duplicate source=${source} level=${this.game.level}`);
      return;
    }
    console.log(`[LevelStart] starting source=${source} level=${this.game.level}`);
    this._lastStartedLevel = this.game.level;
    this.adaptTacticalDirectiveForSector(this.game.level);
    this.emitRunContractEvent('sector_reached', { sector: this.game.level });
    this.emitTacticalDirectiveEvent('sector_reached', { sector: this.game.level });
    this.prepareAceBountyForSector(this.game.level, { reason: source });

    this.levelAdvancePending = false;
    this.resetBossLifeLossCap('level_start');
    this.resetBossWipeoutGuard('level_start');
    const postBossLevelIntro = Boolean(this.postBossLevelIntroPending);
    this.postBossLevelIntroPending = false;
    if (this.levelAdvanceTimeout) {
      clearTimeout(this.levelAdvanceTimeout);
      this.levelAdvanceTimeout = null;
    }

    // Update music for the new level
    AudioManager.playMusicContext('gameplay', {
      resetForNewRun: this.game.level === 1 && source === 'introComplete'
    });
    this.applyGameplayBackdropLevel(this.game.level);
    this.powerupManager.checkLevelReset(this.game.level); // Reset powerup caps
    const augmentSectorStart = this.player?.applyRunAugmentSectorStartEffects?.(this.game.level);
    if (augmentSectorStart?.triggered?.length) {
      this.lastTacticalDraftSectorStart = augmentSectorStart;
    }
    this.recordThreatDiscovery(`sector_${String(this.game.level).padStart(3, '0')}`, 'sectors', {
      name: formatSectorLabel(this.game.level, { sectorWord: translateText('SECTOR'), compact: true }),
      role: 'sector reached',
      sector: this.game.level
    }, { silent: true, scoreBonus: false });
    if (this.game.level === 1) {
      this.shownStoryTransmissionIds.clear();
      this.shownCabinetLogIds.clear();
    }

    measurePerformance('first_use_asset_effect_creation.level_entry_prewarm_start', () => {
      this.prewarmLevelEntryAssets(this.game.level, { ahead: 2 }).catch((error) => {
        console.warn('[PlayScene] level entry asset prewarm failed:', error);
      });
    });
    const showingFirstRunControls = Boolean(
      this.game.level === this.getRunStartSector() && this.getFirstRunControlsNudge()
    );
    const showArrivalStinger = !showingFirstRunControls && this.shouldShowSectorArrivalStinger(this.game.level);
    const enemyStartDelayMs = showArrivalStinger
      ? this.getSectorArrivalStingerDuration({ postBoss: postBossLevelIntro }) + 120
      : showingFirstRunControls
        ? FIRST_RUN_CONTROLS_DELAY_MS + FIRST_RUN_CONTROLS_TOTAL_MS
        : 0;
    if (showArrivalStinger) {
      measurePerformance('incoming_wave_banner.sector_arrival', () => this.showSectorArrivalStinger({ postBoss: postBossLevelIntro }));
    } else if (!showingFirstRunControls) {
      measurePerformance('incoming_wave_banner.level_intro', () => this.showLevelIntro({ postBoss: postBossLevelIntro }));
    }
    this.scheduleEnemyStartForLevel(this.game.level, {
      startAtBoss,
      delayMs: enemyStartDelayMs,
      source
    });
    this.scheduleBackgroundLevelEntryWarmup(Math.max(1, Math.floor(Number(this.game.level) || 1) + 1), {
      ahead: 2,
      delayMs: showArrivalStinger ? 1200 : 900
    });
    if (showingFirstRunControls) {
      const targetLevel = this.game.level;
      this.scheduleRunContractStartNudge({
        delayMs: FIRST_RUN_CONTROLS_DELAY_MS,
        onFirstRunControlsShown: () => {
          this.scheduleEnemyStartForLevel(targetLevel, {
            startAtBoss,
            delayMs: FIRST_RUN_ENEMY_HOLD_MS,
            source: `${source}:first_run_controls`
          });
        }
      });
    }
    this.resetRandomTimers();
    this.ambientBonusDroneTimer = 2000 + Math.random() * 3000;
  }

  clearPendingEnemyStart() {
    if (!this.pendingEnemyStartTimeout) return;
    clearTimeout(this.pendingEnemyStartTimeout);
    this.pendingEnemyStartTimeout = null;
  }

  getSectorArrivalStingerDuration({ postBoss = false } = {}) {
    return postBoss ? SECTOR_ARRIVAL_STINGER_MS + 320 : SECTOR_ARRIVAL_STINGER_MS;
  }

  isGameplayClockAdvancing() {
    return Boolean(
      this.game?.currentScene === this
      && !this.introActive
      && !this.pendingEnemyStartTimeout
      && !this.isPaused
      && !this.tacticalDraft?.active
      && !(this.freezeTimerMs > 0)
      && (this.game?.lives || 0) > 0
    );
  }

  getGameplayClockMs() {
    return Math.max(0, Number(this.gameTime) || 0) * 1000;
  }

  isEnemyStartBlocked() {
    return Boolean(
      this.introActive
      || this.isPaused
      || this.tacticalDraft?.active
      || this.overrunMilestoneInterlude?.active
      || this.gameOverInterlude?.active
      || this.gameOverSequenceStarted
      || this.game?.gameOverTransitionPending
    );
  }

  scheduleEnemyStartForLevel(level, { startAtBoss = false, delayMs = 0, source = 'unknown' } = {}) {
    const targetLevel = Math.max(1, Math.floor(Number(level) || 1));
    const startEnemies = () => {
      this.pendingEnemyStartTimeout = null;
      if (this.game?.currentScene !== this || !this.enemyManager) return;
      if (this._lastStartedLevel !== targetLevel || this.game?.level !== targetLevel) return;
      // Wall-clock entry timers continue even while the simulation is held.
      // Keep the next wave behind every no-agency screen instead of allowing
      // enemies, projectiles, or guaranteed pickups to begin underneath it.
      if (this.isEnemyStartBlocked()) {
        this.pendingEnemyStartTimeout = setTimeout(startEnemies, 100);
        return;
      }
      this.enemyManager.startLevel(targetLevel);
      if (startAtBoss) {
        this.enemyManager.forceBossStart(targetLevel);
      }
      if (delayMs > 0) {
        console.log(`[LevelStart] enemies released source=${source} level=${targetLevel} delayMs=${Math.round(delayMs)}`);
      }
    };

    this.clearPendingEnemyStart();
    if (delayMs > 0) {
      this.enemyManager?.beginLevelEntryHold?.(targetLevel);
      this.pendingEnemyStartTimeout = setTimeout(startEnemies, delayMs);
      return;
    }
    startEnemies();
  }

  showLevelIntro({ postBoss = false } = {}) {
    const localizedMessage = formatSectorLabel(this.game.level, {
      sectorWord: translateText('SECTOR')
    });
    const compactHud = this.game.getWidth() < 620;
    const fontSize = compactHud ? (postBoss ? 21 : 25) : (postBoss ? 34 : 42);
    const baseDuration = postBoss ? 1450 : 2000;
    const readableDuration = baseDuration + GAMEPLAY_MESSAGE_EXTRA_READ_MS;
    const priority = postBoss ? 5 : 2;
    if (postBoss) {
      this.deferActiveToastDisplay(this.activeTopToast, 'top', readableDuration + 180, { minRemainingMs: 1400 });
      this.deferActiveToastDisplay(this.activeCornerToast, 'corner', readableDuration + 180, { minRemainingMs: 1200 });
    }
    this.reserveMessageFocus(readableDuration + 220, {
      priority,
      slots: postBoss ? ['center', 'top', 'corner'] : ['center']
    });
    this.showToast(localizedMessage, {
      fontSize,
      fill: '#fff06a',
      stroke: '#05070f',
      strokeThickness: compactHud ? 3 : 6,
      accent: 0xffd24d,
      dropShadowColor: '#ff9d22',
      dropShadowBlur: compactHud ? 3 : 5,
      duration: baseDuration,
      type: 'level_up',
      priority,
      bypassFocusLock: true,
      transition: true,
      slot: 'center',
      y: compactHud ? this.game.getHeight() * 0.25 : this.game.getHeight() * (postBoss ? 0.18 : 0.2),
      maxWidth: compactHud ? this.game.getWidth() * 0.82 : this.game.getWidth() * (postBoss ? 0.78 : 0.9)
    });
  }

  getSectorArrivalEntry(level = this.game?.level || 1) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    try {
      return getSectorArrivalSignal(safeLevel);
    } catch (error) {
      console.warn('[SectorArrival] failed to read sector Codex entry:', error);
      return null;
    }
  }

  getSectorArrivalArtSource(level = this.game?.level || 1) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const entry = this.getSectorArrivalEntry(safeLevel) || {};
    return entry.art || getSectorCodexArt(safeLevel);
  }

  getRunStartSector() {
    if (this.game?.runMode === RUN_MODES.SECTOR_START) {
      return Math.max(1, Math.floor(Number(this.game?.sectorStartPlaySector || this.game?.level) || 1));
    }
    return 1;
  }

  shouldShowSectorArrivalStinger(level = this.game?.level || 1) {
    if (getNovaPerformanceFlags().disableSectorFlyins) return false;
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    return safeLevel > this.getRunStartSector();
  }

  prepareTextureForRender(texture, key = 'texture') {
    if (!GameAssets.isValidTexture(texture)) return Promise.resolve(texture);
    const cacheKey = String(key || texture?.label || texture?.source?.label || 'texture');
    if (this.preparedRenderTextureKeys?.has(cacheKey)) return Promise.resolve(texture);
    const prepare = this.game?.app?.renderer?.prepare;
    if (!prepare?.upload) {
      this.preparedRenderTextureKeys?.add(cacheKey);
      return Promise.resolve(texture);
    }

    return prepare.upload(texture)
      .then(() => {
        this.preparedRenderTextureKeys?.add(cacheKey);
        return texture;
      })
      .catch((error) => {
        console.warn(`[PlayScene] texture prepare failed for ${cacheKey}:`, error);
        return texture;
      });
  }

  preloadSectorArrivalArt(level = this.game?.level || 1, { ahead = 0 } = {}) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const aheadCount = Math.max(0, Math.min(4, Math.floor(Number(ahead) || 0)));
    const loads = [];

    for (let offset = 0; offset <= aheadCount; offset += 1) {
      const sectorLevel = safeLevel + offset;
      if (!this.shouldShowSectorArrivalStinger(sectorLevel)) continue;
      const artSource = this.getSectorArrivalArtSource(sectorLevel);
      if (!artSource) continue;

      if (!this.sectorArrivalArtCache.has(artSource)) {
        const loadPromise = PIXI.Assets.load(artSource)
          .then((texture) => this.prepareTextureForRender(texture, `sector_arrival:${artSource}`))
          .catch((error) => {
            this.sectorArrivalArtCache.delete(artSource);
            console.warn(`[PlayScene] sector arrival art load failed for level ${sectorLevel}:`, error);
            return null;
          });
        this.sectorArrivalArtCache.set(artSource, loadPromise);
      }

      loads.push(this.sectorArrivalArtCache.get(artSource));
    }

    if (!loads.length) return Promise.resolve(null);
    return Promise.allSettled(loads).then((results) => results[0]?.value || null);
  }

  prewarmGeneratedEnemyTexturesForLevel(level = this.game?.level || 1, { aheadLevels = 1 } = {}) {
    if (!this.shipCatalogLoaded) return Promise.resolve(false);
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const aheadCount = Math.max(0, Math.min(4, Math.floor(Number(aheadLevels) || 0)));
    const textures = [];
    const usedKeys = new Set();
    const addTexture = (texture, key) => {
      if (!GameAssets.isValidTexture(texture) || !key || usedKeys.has(key)) return;
      usedKeys.add(key);
      if (!this.preparedRenderTextureKeys?.has(key)) textures.push({ texture, key });
    };

    for (let sectorLevel = safeLevel; sectorLevel <= safeLevel + aheadCount; sectorLevel += 1) {
      const profiles = getGeneratedEnemyProfilesForLevel(sectorLevel);
      profiles.forEach((profile) => {
        if (!Number.isFinite(profile?.spriteIndex)) return;
        const index = Math.max(0, Math.floor(profile.spriteIndex));
        addTexture(GameAssets.getGeneratedEnemyTexture(index), `generated_enemy:${index}`);
      });
      for (let eventIndex = 0; eventIndex < 3; eventIndex += 1) {
        const supportProfile = pickBossSupportShipProfile(
          sectorLevel,
          getBossSupportShipEventSeed(sectorLevel, eventIndex)
        );
        if (!Number.isFinite(supportProfile?.spriteIndex)) continue;
        const index = Math.max(0, Math.floor(supportProfile.spriteIndex));
        addTexture(GameAssets.getGeneratedEnemyTexture(index), `generated_enemy:${index}`);
      }
    }

    const eligibleEliteProfiles = getEliteMiddleShipsForLevel(safeLevel + aheadCount);
    eligibleEliteProfiles.forEach((profile) => {
      if (!Number.isFinite(profile?.spriteIndex)) return;
      const index = Math.max(0, Math.floor(profile.spriteIndex));
      addTexture(GameAssets.getEliteMiddleShipTexture(index), `elite_middle:${index}`);
    });

    if (!textures.length) return Promise.resolve(true);
    return Promise.allSettled(
      textures.map(({ texture, key }) => this.prepareTextureForRender(texture, key))
    ).then(() => true);
  }

  prewarmLevelEntryAssets(level = this.game?.level || 1, { ahead = 1 } = {}) {
    const measurePerformance = this.performanceDiagnostics?.measure?.bind(this.performanceDiagnostics) || ((_label, callback) => callback());
    return measurePerformance('first_use_asset_effect_creation.level_entry_prewarm_start', () => {
      const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
      const aheadCount = Math.max(0, Math.min(4, Math.floor(Number(ahead) || 0)));
      const key = `${safeLevel}:${aheadCount}:${this.shipCatalogLoaded ? 'ships' : 'art'}`;
      if (!this.entryAssetWarmupCache.has(key)) {
        const warmup = Promise.allSettled([
          this.prewarmGeneratedEnemyTexturesForLevel(safeLevel, { aheadLevels: aheadCount })
        ]).then(() => true);
        this.entryAssetWarmupCache.set(key, warmup);
      }
      return this.entryAssetWarmupCache.get(key);
    });
  }

  clearBackgroundLevelEntryWarmup() {
    if (this.backgroundLevelEntryWarmupTimeout) {
      clearTimeout(this.backgroundLevelEntryWarmupTimeout);
      this.backgroundLevelEntryWarmupTimeout = null;
    }
    if (this.backgroundLevelEntryWarmupIdleHandle && typeof window !== 'undefined' && window.cancelIdleCallback) {
      window.cancelIdleCallback(this.backgroundLevelEntryWarmupIdleHandle);
      this.backgroundLevelEntryWarmupIdleHandle = null;
    }
  }

  scheduleBackgroundLevelEntryWarmup(level = (this.game?.level || 1) + 1, { ahead = 2, delayMs = 900 } = {}) {
    this.clearBackgroundLevelEntryWarmup();
    const targetLevel = Math.max(1, Math.floor(Number(level) || 1));
    const aheadCount = Math.max(0, Math.min(4, Math.floor(Number(ahead) || 0)));
    const startWarmup = () => {
      this.backgroundLevelEntryWarmupIdleHandle = null;
      if (this.game?.currentScene !== this) return;
      this.prewarmLevelEntryAssets(targetLevel, { ahead: aheadCount }).catch((error) => {
        console.warn(`[PlayScene] background level entry warmup failed for level ${targetLevel}:`, error);
      });
    };
    this.backgroundLevelEntryWarmupTimeout = setTimeout(() => {
      this.backgroundLevelEntryWarmupTimeout = null;
      if (this.game?.currentScene !== this) return;
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        this.backgroundLevelEntryWarmupIdleHandle = window.requestIdleCallback(startWarmup, { timeout: 1200 });
      } else {
        startWarmup();
      }
    }, Math.max(0, Math.floor(Number(delayMs) || 0)));
  }

  startLevelWhenWarm(source = 'introComplete') {
    if (this.levelStartWarmupPending) return;
    const targetLevel = Number.isFinite(this.debugStartLevel) ? this.debugStartLevel : (this.game?.level || 1);
    this.levelStartWarmupPending = true;
    const catalogReady = this.shipCatalogLoaded
      ? Promise.resolve(true)
      : (this.shipCatalogReady || Promise.resolve(true)).catch(() => true);
    catalogReady
      .then(() => this.prewarmLevelEntryAssets(targetLevel, { ahead: 2 }))
      .finally(() => {
        this.levelStartWarmupPending = false;
        if (this.game?.currentScene !== this || !this.introComplete || !this.enemyManager || !this.game?.level) return;
        this.startLevel(source);
      });
  }

  clearSectorArrivalStinger() {
    const stinger = this.sectorArrivalStinger;
    if (!stinger) return;
    if (stinger.timeout) clearTimeout(stinger.timeout);
    if (stinger.ticker && this.game?.app?.ticker) {
      this.game.app.ticker.remove(stinger.ticker);
    }
    if (stinger.container?.parent) {
      stinger.container.parent.removeChild(stinger.container);
    }
    stinger.container?.destroy?.({ children: true });
    this.sectorArrivalStinger = null;
  }

  showSectorArrivalStinger({ postBoss = false } = {}) {
    if (!this.game?.app || this.game?.currentScene !== this) return;

    const level = Math.max(1, Math.floor(Number(this.game?.level) || 1));
    if (!this.shouldShowSectorArrivalStinger(level)) {
      this.clearSectorArrivalStinger();
      return;
    }
    const entry = this.getSectorArrivalEntry(level) || {};
    const durationMs = this.getSectorArrivalStingerDuration({ postBoss });
    const { width, height } = this.game.app.screen;
    const compact = width < 620 || height < 520;
    const accent = Number.isFinite(entry.accent) ? entry.accent : (level >= 30 ? 0xffe76a : 0x37f5ff);
    const sectorLabel = formatSectorLabel(level, {
      sectorWord: translateText('SECTOR'),
      compact: true
    }).toUpperCase();
    const pressure = translateText(entry.pressureStyle || entry.role || 'SECTOR').toUpperCase();

    this.clearSectorArrivalStinger();
    const priority = postBoss ? 5 : 2;
    this.reserveMessageFocus(durationMs + 120, {
      priority,
      slots: ['top']
    });
    this.enqueueToast(`${sectorLabel} // ${pressure}`, {
      fontSize: compact ? 17 : (postBoss ? 22 : 24),
      fill: '#f6fbff',
      stroke: '#02131f',
      strokeThickness: compact ? 2 : 3,
      slot: 'top',
      type: 'sector_arrival',
      priority,
      bypassFocusLock: true,
      duration: Math.max(600, durationMs - GAMEPLAY_MESSAGE_EXTRA_READ_MS),
      extraReadTimeMs: GAMEPLAY_MESSAGE_EXTRA_READ_MS,
      minVisibleMs: durationMs,
      accent,
      transition: true,
      y: Math.max(compact ? 84 : 104, height * (compact ? 0.16 : 0.14)),
      maxWidth: Math.min(width * (compact ? 0.82 : 0.62), compact ? 520 : 820)
    });

    const token = Symbol('sector_arrival');
    const timeout = setTimeout(() => {
      if (this.sectorArrivalStinger?.token === token) this.sectorArrivalStinger = null;
    }, durationMs);
    this.sectorArrivalStinger = { timeout, token };
  }

  update(delta) {
    if (!Number.isFinite(delta) || delta > 100 || delta < 0) return;
    if (!this.isReady) return;
    this.inputManager?.recordFrameContinuity?.(delta * (1000 / 60), {
      level: this.game?.level || null,
      bossWarning: Boolean(this.bossWarningActive || this.bossIntroActive),
      reinforcementWarning: Boolean(this.mayhemReinforcementWarning?.active),
      tacticalDraft: Boolean(this.tacticalDraft?.active),
      gameOver: Boolean(this.gameOverSequenceStarted)
    });
    const perfDiag = this.performanceDiagnostics;
    const perfOptions = perfDiag?.enabled ? perfDiag.options : null;
    const measure = perfDiag?.measure?.bind(perfDiag) || ((_label, callback) => callback());
    perfDiag?.beginFrame?.(delta, this);

    try {
      measure('frame_start', () => {
        this.updateDiagnosticsLayout();
        this.cleanupSkippedFrameVisuals('frame_start');
      });

      if (this.gameOverInterlude?.active) {
        this.cleanupSkippedFrameVisuals('gameover_interlude');
        this.updateCriticalHullOverlay(delta);
        this.updateSlowTimeVisualField(delta);
        measure('gameover_interlude', () => this.updateGameOverInterlude(delta));
        return;
      }

      if (this.gameOverSequenceStarted) {
        this.cleanupSkippedFrameVisuals('gameover_sequence');
        this.updateCriticalHullOverlay(delta);
        this.updateSlowTimeVisualField(delta);
        return;
      }

      if (this.overrunMilestoneInterlude?.active) {
        this.cleanupSkippedFrameVisuals('overrun_interlude');
        this.updateCriticalHullOverlay(delta);
        this.updateSlowTimeVisualField(delta);
        measure('overrun_interlude', () => this.updateOverrunMilestoneInterlude(delta));
        return;
      }

      if (this.tacticalDraft?.active) {
        this.cleanupSkippedFrameVisuals('tactical_draft');
        this.updateCriticalHullOverlay(delta);
        this.updateSlowTimeVisualField(delta);
        measure('tactical_draft', () => this.updateTacticalDraft(delta));
        return;
      }

      // Score Boost Timer
      if (this.scoreBoostTimer > 0 && this.isGameplayClockAdvancing()) {
        this.scoreBoostTimer -= delta * 16.67;
        if (this.scoreBoostTimer <= 0) {
          this.scoreMultiplier = 1;
          this.game.scoreMultiplier = 1;
          if (this.player) {
            this.player.scoreMultiplier = 1;
            this.player.scoreBoostExpiresAt = 0;
          }
          this.showToast("SCORE BOOST ENDED", { fontSize: 20, fill: '#cccccc', slot: 'corner', type: 'score_boost' });
          console.log('[Powerup] expire type=SCORE_X2 restored multiplier=1');
          if (this.debugPowerups) {
            console.log('[PowerupTest] expired type=score_x2 restoredOk=true');
          }
        }
      } else if (this.game.scoreMultiplier !== this.scoreMultiplier) {
        this.game.scoreMultiplier = this.scoreMultiplier;
      }

      this.handlePauseToggle();
      this.updateControllerPresencePause();
      if (this.isPaused) {
        this.cleanupSkippedFrameVisuals('pause');
        this.updateCriticalHullOverlay(delta);
        this.updateSlowTimeVisualField(delta);
        measure('pause_menu', () => {
          this.pauseMenuFx?.update?.(delta);
          this.updatePauseMenuControls(delta);
        });
        return;
      }

      // Player update
      measure('player', () => {
        if (!(this.game.lives > 0 && this.player)) return;
        // Pass touch input to player
        if (this.touchControls) {
          const touchInput = this.touchControls.getInput();
          this.player.touchInput = { moveX: touchInput.moveX, moveY: touchInput.moveY };
        }

        this.player.update(delta);
        this.updateRunContractActionWatchers();
        const sprite = this.player.sprite;
        if (sprite) {
          sprite.visible = true;
          sprite.renderable = true;
          if ((!Number.isFinite(sprite.alpha) || sprite.alpha <= 0) &&
            !this.player.isDodging &&
            !this.player.invulnerable &&
            !this.player.isGhostActive?.()) {
            sprite.alpha = 1;
          }
          if (!sprite.parent && this.gameContainer) {
            this.gameContainer.addChild(sprite);
          }
        }
      });

      measure('player_state', () => {
        this.updateComboTimers(delta);
        this.updateDangerDodgeTimer(delta);
        this.updateGrazeBreakTimer();
        this.maybeRelocateActiveCenterToastForCombat();
        if (this.player?.synergyState?.type) {
          this.setSynergyBadge(this.player.synergyState.label || this.player.synergyState.type);
        } else {
          this.setSynergyBadge('');
        }
      });


      if (this.freezeTimerMs > 0) {
        this.freezeTimerMs -= delta * 16.67;
        this.cleanupSkippedFrameVisuals('freeze');
        this.updateCriticalHullOverlay(delta);
        this.updateSlowTimeVisualField(delta);
        this.updateDevOverlay();
        return;
      }

      // Run time measures playable combat. Ship intros and guarded sector-entry
      // holds must not tax a score run before the player has agency.
      if (this.isGameplayClockAdvancing()) {
        this.gameTime += delta / 60;
      }

      // TASK C: Debug diagnostics removed
      // if (this.playerDiagText) {
      //   const sprite = this.player?.sprite;
      //   const vis = sprite?.visible ? 't' : 'f';
      //   const alpha = sprite && Number.isFinite(sprite.alpha) ? sprite.alpha.toFixed(2) : 'na';
      //   const texOk = GameAssets.isValidTexture(this.player?.shipSprite?.texture) ? 'ok' : 'bad';
      //   const parent = sprite?.parent ? 'yes' : 'no';
      //   this.playerDiagText.text = `pVis:${vis} a:${alpha} tex:${texOk} parent:${parent}`;
      // }

      // if (this.rankDiagText) {
      //   // Safe accessors for diagnostics to prevent crash
      //   const rank = (this.game && Number.isFinite(this.game.rankIndex)) ? this.game.rankIndex : 0;
      //   const score = (this.game && Number.isFinite(this.game.score)) ? this.game.score : 0;
      //   const rankEv = Number.isFinite(this._rankUpCount) ? this._rankUpCount : 0;
      //   const seen = Number.isFinite(this._lastRankUpSeen) ? this._lastRankUpSeen : 'null';

      //   // Detailed Prod Diagnostics
      //   const d = this.game.diag || {};
      //   const asEv = d.asEv || 0;
      //   const asComp = d.asComp || 0;
      //   const asBefore = d.asBefore || 0;
      //   const asAfter = d.asAfter || 0;
      //   const rkFromAdd = d.rkFromAdd || 0;
      //   const uiRankEv = this._showRankUpCount || 0;

      //   this.rankDiagText.text = `S:${score} R:${rank} (seen:${seen}) REV:${rankEv} UI:${uiRankEv}\n` +
      //     `AS: evt=${asEv} cmp=${asComp} bef=${asBefore} aft=${asAfter} YES=${rkFromAdd}\n` +
      //     `ID: G=${this.game.gameId} S=${this.sceneId}`;
      //   this.rankDiagText.style.fontSize = 10; // Smaller font for more data
      // }

      // Fire logic - merge keyboard and touch input
      const touchInput = this.touchControls ? this.touchControls.getInput() : { firing: false };
      const firePressed = this.inputManager.isFiring() || touchInput.firing;
      this.updateGrazeBreakFireIntent(firePressed);

      if (firePressed && this.player && !this.introActive) {
        measure('shooting', () => {
          if (!this.player.canShoot()) return;
          const bullets = this.player.shoot();
          this.markGrazeBreakShot(bullets);
          const launchedBullets = bullets.filter((bullet) => this.bulletManager.addPlayerBullet(bullet));
          recordCombatVolley(this.combatTelemetry, launchedBullets);

          // TASK 4: Shooting sound with health check
          this.playShootSoundWithHealthCheck();
        });
      }

      // Managers update
      const slowTimeActive = this.player?.isSlowTimeActive?.() === true;
      const enemyBulletScale = slowTimeActive ? (this.player?.getSlowTimeEnemyBulletScale?.() ?? 0.35) : 1;
      const hazardTimeScale = slowTimeActive ? (this.player?.getSlowTimeHazardScale?.() ?? 0.35) : 1;
      measure('bullets', () => {
        if (this.bulletManager) {
          this.bulletManager.update(delta, enemyBulletScale);
          this.bulletManager.setFocusCombatClarity(Boolean(this.player?.focusDriftActive));
        }
      });
      measure('enemies', () => {
        if (this.enemyManager) this.enemyManager.update(delta);
      });
      measure('straggler_beacon', () => this.updateStragglerBeacon(delta));
      measure('boss_director', () => {
        this.sampleBalanceBoss();
        this.maybeSpawnBossClutchShield();
      });
      measure('backdrop_level', () => this.applyGameplayBackdropLevel(this.game?.level || 1));
      measure('powerups', () => {
        if (this.powerupManager) this.powerupManager.update(delta, this);
      });
      measure('tractor', () => this.updateTractorHijack(delta));
      measure('boss_hazards', () => this.updateBossHazards(delta, hazardTimeScale));
      if (!perfOptions?.noParticles) {
        measure('particles', () => {
          if (this.particleManager) this.particleManager.update(delta);
        });
      }
      measure('screen_shake', () => {
        if (this.screenShake) this.screenShake.update(delta);
      });
      if (!perfOptions?.noScorePopups) {
        measure('score_popups', () => {
          measure('score_combo_popup_cleanup', () => {
            if (this.scorePopupManager) this.scorePopupManager.update(delta);
          });
        });
      }

      // Audio Update (Sequencer)
      measure('audio', () => {
        if (AudioManager && AudioManager.update) AudioManager.update(delta);
      });

      // Tractor beam
      // Tractor Beam Removed

      // Adaptive Enemy Feature: Track Player Position
      measure('player_metrics', () => this.updatePlayerMetrics(delta));

      measure('collisions', () => this.checkCollisions());
      measure('deferred_progression.score_progress', () => {
        if (this.shouldDeferActiveGameplayPersistence()) {
          return {
            progressFlushed: false,
            liveRankRefreshed: false,
            scoreCuesRefreshed: false,
            deferred: true
          };
        }
        return this.flushDeferredHotPathProgress();
      });
      measure('deferred_progression.run_contract_events', () => this.flushDeferredRunContractEvents());
      measure('deferred_progression.run_contracts', () => this.flushDeferredRunContractProgress());
      measure('deferred_progression.threat_defeats', () => {
        if (this.shouldDeferActiveGameplayPersistence()) {
          return {
            flushed: 0,
            pending: this.deferredThreatDefeats?.length || 0,
            firstDefeats: 0,
            deferred: true
          };
        }
        return this.processDeferredThreatDefeats(40);
      });
      measure('deferred_progression.season_progress', () => this.flushDeferredSeasonProgress());
      measure('deferred_visual_feedback.collision_ui', () => this.flushDeferredCollisionUiFeedback());
      measure('overrun_celebrations', () => this.updateOverrunClearCelebrations());

      // Level progression
      measure('level_progression', () => {
      this.flushPendingRankUpPresentation('level_progression');
      if (this.enemyManager.isLevelComplete() && !this.enemyManager.spawning && !this.levelAdvancePending) {
        this.levelAdvancePending = true;

        AudioManager.playSfx('levelComplete');
        const rewardConfig = BalanceConfig.rewards || {};
        const levelClearScore = rewardConfig.levelClearScore || BalanceConfig.level.completionBonus || 1000;
        const appliedLevelClearScore = this.game.addScore(levelClearScore, 'sectorClearBonus');
        const bossCompletion = Boolean(this.enemyManager?.bossDefeatedThisLevel);
        if (bossCompletion && this.damageTakenThisSector === 0) {
          this.noHitSectorsThisRun += 1;
          const appliedNoHitSector = this.game.addScore(1500, 'noHitBonus');
          this.enqueueToast(`${translateText('NO-HIT SECTOR')} +${appliedNoHitSector}`, {
            fontSize: 18,
            fill: '#7dffcc',
            slot: 'top',
            type: 'bonus',
            duration: 1400
          });
        }
        const compactHud = this.game.getWidth() < 620;
        const completedSector = Math.max(1, Math.floor(Number(this.game.level) || 1));
        const dailySignalFinish = this.game.shouldFinishDailySignal?.(completedSector, bossCompletion) === true;
        const repairTarget = rewardConfig.levelClearRepairTargetLives || 0;
        const repairDelta = repairTarget > 0
          ? this.applyLifeRepair(repairTarget, rewardConfig.repairInvulnerabilityMs || 0)
          : 0;
        const repairSuffix = repairDelta > 0 ? `  REPAIR +${repairDelta}` : '';
        if (!bossCompletion) {
          this.showToast(`SECTOR CLEAR +${appliedLevelClearScore}${repairSuffix}`, {
            fontSize: compactHud ? 20 : 26,
            fill: '#8fffd5',
            stroke: '#001616',
            strokeThickness: compactHud ? 2 : 3,
            duration: 1500,
            slot: 'top',
            type: 'level_clear',
            priority: 3,
            y: this.game.getHeight() * (compactHud ? 0.22 : 0.17),
            maxWidth: this.game.getWidth() * (compactHud ? 0.82 : 0.7)
          });
        }
        if (!dailySignalFinish) this.playLevelClearVoice({ bossCompletion });

        // Particles
        const gameplayWidth = this.gameplayGame.getWidth();
        const gameplayHeight = this.gameplayGame.getHeight();
        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            if (this.particleManager) {
              this.particleManager.createExplosion(
                gameplayWidth * 0.2 + Math.random() * gameplayWidth * 0.6,
                gameplayHeight * 0.2 + Math.random() * gameplayHeight * 0.6,
                0xffff00
              );
            }
          }, i * 100);
        }

        if (dailySignalFinish) {
          this.beginDailySignalFinish({ sectorCleared: completedSector, compactHud });
          return;
        }

        const nextSectorLevel = Math.max(1, Math.floor(Number(this.game.level) || 1) + 1);
        this.levelAdvanceWarmupPromise = this.prewarmLevelEntryAssets(nextSectorLevel, { ahead: 2 })
          .catch((error) => {
            console.warn(`[PlayScene] next sector warmup failed for level ${nextSectorLevel}:`, error);
            return true;
          });

        const advanceLevelWhenPresentationReady = () => {
          if (this.game?.currentScene !== this) return;
          if (this.shouldHoldProgressionPresentation()) {
            this.levelAdvanceTimeout = setTimeout(advanceLevelWhenPresentationReady, 120);
            return;
          }
          const advanceWhenWarm = this.levelAdvanceWarmupPromise || Promise.resolve(true);
          advanceWhenWarm.finally(() => {
            if (this.game?.currentScene !== this) return;
            const sectorCleared = Number(this.game.level) || 1;
            const finishAdvance = () => {
              if (this.game?.currentScene !== this) return;
              this.levelAdvancePending = false;
              this.levelAdvanceTimeout = null;
              this.levelAdvanceWarmupPromise = null;
              this.postBossLevelIntroPending = bossCompletion;
              this.maybeTriggerOverrunCelebration({ sectorCleared, bossCompletion, compactHud });
              if (bossCompletion) this.damageTakenThisSector = 0;
              this.lifeLostThisWave = false;
              this.game.nextLevel();
              if (!this.player) return;
              const sprite = this.player.sprite;
              if (sprite) {
                sprite.visible = true;
                sprite.alpha = 1;
                sprite.renderable = true;
                if (!sprite.parent && this.gameContainer) this.gameContainer.addChild(sprite);
              }
              const shipSprite = this.player.shipSprite;
              const texValid = shipSprite && shipSprite instanceof PIXI.Sprite && GameAssets.isValidTexture(shipSprite.texture);
              if (!texValid && this.player.rebuildShipSprite) {
                this.player.rebuildShipSprite('afterNextLevel');
              } else if (shipSprite?.scale) {
                const baseScale = Number.isFinite(this.player.baseScale) ? this.player.baseScale : (shipSprite.scale.x || 1);
                shipSprite.scale.set(baseScale);
              }
            };
            if (
              bossCompletion
              && canRunModeUseTacticalDraft(this.game?.runMode)
              && this.openTacticalDraft({ sectorCleared, onComplete: finishAdvance })
            ) return;
            finishAdvance();
          });
        };
        this.levelAdvanceTimeout = setTimeout(advanceLevelWhenPresentationReady, BalanceConfig.level.sequenceDuration || 3000);
      }
      });

      if (!perfOptions?.hudLite) {
        measure('hud', () => {
          const skipHighscoreChase = this.player?.activePowerup?.type === 'plasma_lance'
            && (
              (this.enemyManager?.enemies?.filter?.((enemy) => enemy?.active !== false).length || 0) >= 32
              || (this.bulletManager?.enemyBullets?.length || 0) >= 80
            );
          this.hud?.update?.({ skipHighscoreChase });
          if (this.hud?.highscoreChaseGroup) {
            const showHighscoreChase = !perfOptions?.hideHighscoreChase;
            this.hud.highscoreChaseGroup.visible = showHighscoreChase;
            this.hud.highscoreChaseGroup.renderable = showHighscoreChase;
          }
        });
      } else if (this.hud?.highscoreChaseGroup) {
        this.hud.highscoreChaseGroup.visible = false;
        this.hud.highscoreChaseGroup.renderable = false;
      }
      if (!perfOptions?.noStarfield) {
        measure('starfield', () => this.updateStarfield(delta)); // TASK D: Animate background stars
        measure('ultrawide_ambience', () => this.updateUltrawideSideAmbience(delta));
      }
      measure('ambient_bonus_drones', () => this.updateAmbientBonusDrones(delta)); // Handles hazard drones and collectible power cores
      measure('magnet_pull', () => this.applyMagnetPull(delta));
      measure('orbital_strike', () => this.updateOrbitalStrike(delta));
      measure('random_popups', () => this.updateRandomPopups(delta));
      measure('slow_time_visual_field', () => this.updateSlowTimeVisualField(delta));
      measure('critical_hull_overlay', () => this.updateCriticalHullOverlay(delta));
      measure('low_lives', () => this.checkLowLives());

      const scoreDelta = this.game.score - this.lastScoreSeen;
      if (scoreDelta > 0) {
        this.updateMetaProgress(scoreDelta, false);
        this.lastScoreSeen = this.game.score;
      }
      if (this.enemyManager?.bossDefeatedThisLevel && this.lastBossDefeatedLevel !== this.game.level) {
        this.lastBossDefeatedLevel = this.game.level;
        this.updateMetaProgress(0, true);
      }
      measure('dev_overlay', () => this.updateDevOverlay());

    } catch (e) {
      console.error('GAME LOOP CRASH:', e);
      if (this.game && this.game.app && this.game.app.ticker) {
        this.game.app.ticker.stop();
      }
      this.showErrorOverlay(e);
    } finally {
      perfDiag?.endFrame?.(this);
    }
  }

  shouldSuppressPositiveAfterWaveCompliment(now = Date.now()) {
    const recentLifeLoss = this.lastLifeLossAtMs > 0
      && Math.max(0, Number(now) || 0) - this.lastLifeLossAtMs < LIFE_LOSS_COMPLIMENT_GRACE_MS;
    return this.lifeLostThisWave === true || recentLifeLoss;
  }

  playLevelClearVoice({ bossCompletion = false } = {}) {
    const scheduledAt = Date.now();
    if (this.shouldSuppressPositiveAfterWaveCompliment(scheduledAt)) {
      this.levelClearVoiceToken = (this.levelClearVoiceToken || 0) + 1;
      this.lastLevelClearVoiceDecision = {
        status: 'suppressed',
        reason: this.lifeLostThisWave ? 'life_lost_this_wave' : 'life_loss_grace',
        bossCompletion,
        scheduledAt,
        graceMs: LIFE_LOSS_COMPLIMENT_GRACE_MS
      };
      return false;
    }
    const delayMs = bossCompletion ? BOSS_DEATH_VOICE_LOCK_MS + 450 : 260;
    const token = (this.levelClearVoiceToken || 0) + 1;
    this.levelClearVoiceToken = token;
    this.lastLevelClearVoiceDecision = {
      status: 'scheduled',
      reason: 'survived_wave',
      bossCompletion,
      scheduledAt,
      delayMs,
      graceMs: LIFE_LOSS_COMPLIMENT_GRACE_MS
    };
    setTimeout(() => {
      if (this.game?.currentScene !== this || this.levelClearVoiceToken !== token) return;
      if (this.shouldSuppressPositiveAfterWaveCompliment()) {
        this.lastLevelClearVoiceDecision = {
          ...this.lastLevelClearVoiceDecision,
          status: 'suppressed',
          reason: this.lifeLostThisWave ? 'life_lost_this_wave' : 'life_loss_grace',
          suppressedAt: Date.now()
        };
        return;
      }
      AudioManager.playDiegeticVoice('level_clear_flirt', {
        force: true,
        bypassGlobalCooldown: true,
        bypassEventCooldown: true,
        exclusiveGroup: 'level_clear_flirt',
        delayIfVoiceLocked: true,
        maxVoiceLockDelayMs: bossCompletion ? BOSS_DEATH_VOICE_LOCK_MS + 1600 : 1600,
        voicePriority: bossCompletion ? 10 : 4,
        cooldownMs: 0,
        eventCooldownMs: 0,
        volume: bossCompletion ? 1.85 : 1.55,
        duckFactor: bossCompletion ? 0.28 : 0.36,
        duckMs: bossCompletion ? 2100 : 1600
      });
      this.lastLevelClearVoiceDecision = {
        ...this.lastLevelClearVoiceDecision,
        status: 'played',
        playedAt: Date.now()
      };
    }, delayMs);
    return true;
  }

  onRankUp(newRank) {
    const nr = this.normalizeRankValue(newRank);
    if (!Number.isFinite(nr)) {
      console.warn('[PlayScene] Invalid rank payload for rank up:', newRank);
      return;
    }

    if (this._lastRankUpSeen === nr) return;
    this._lastRankUpSeen = nr;
    this._rankUpCount = (this._rankUpCount || 0) + 1;
    if (this.player && this.player.setRank) {
      this.player.setRank(nr, 'rank_up');
    }
    this.emitRunContractEvent('pilot_rank_reached', {
      rankIndex: nr,
      displayRank: nr + 1,
      sector: this.game?.level || 1
    });
    this.pendingRankUpPresentation = nr;
  }

  normalizeRankValue(payload) {
    if (payload == null) return NaN;
    if (typeof payload === 'number') return payload;
    if (typeof payload === 'string') return Number(payload);
    if (typeof payload === 'object') {
      const candidate = payload.rankIndex ?? payload.newRank ?? payload.rank ?? payload.rank_index ?? payload.value ?? payload.index;
      return Number(candidate);
    }
    return NaN;
  }

  shouldHoldProgressionPresentation() {
    if (this.gameOverSequenceStarted || this.game?.currentScene !== this) return false;
    return Boolean(
      this.activeRankUpPresentation?.parent
      || (
        this.pendingRankUpPresentation !== null
        && this.pendingRankUpPresentation !== undefined
        && Number.isFinite(Number(this.pendingRankUpPresentation))
      )
    );
  }

  flushPendingRankUpPresentation(source = 'unknown') {
    if (this.pendingRankUpPresentation === null || this.pendingRankUpPresentation === undefined) return false;
    const rank = Number(this.pendingRankUpPresentation);
    if (!Number.isFinite(rank) || this._rankUpAnimating || this.activeRankUpPresentation?.parent) return false;
    if (this.gameOverSequenceStarted || this.game?.currentScene !== this) return false;
    if (this.activeWaveBonusEffect?.parent || this.hasActiveCombatThreats()) return false;
    const transitionState = this.enemyManager?.state;
    if (!['WAVE_BRIEFING', 'BOSS_GATE', 'LEVEL_COMPLETE'].includes(transitionState)) return false;
    if (this.activeBossIntroCard || this.activeCenterToast) return false;
    const now = Date.now();
    const hasMessageLock = ['center', 'top', 'corner'].some((slot) => this.getToastSlotLockUntil(slot) > now);
    if (hasMessageLock) return false;

    if (!this.showRankUp(rank)) return false;
    this.pendingRankUpPresentation = null;
    console.log(`[RankUp] presentation released source=${source} rank=${rank}`);
    return true;
  }

  showRankUp(newRank) {
    const nr = Number(newRank);
    if (!Number.isFinite(nr)) return false;

    if (this._rankUpAnimating) return false;
    this._rankUpAnimating = true;
    this._showRankUpCount++;
    this.reserveMessageFocus(RANK_UP_PRESENTATION_MS + 180, { priority: 3 });

    // TASK 4: Enhanced rank up animation with rank sprite and title
    const rank = (newRank !== undefined) ? newRank : this.game.rankIndex;
    const rankTitle = this.game.getRankTitle ? this.game.getRankTitle(rank) : '';

    // Keep rank-up feedback punchy without routine announcer chatter.
    AudioManager.playSfx('powerup', { force: true, volume: 1.0 });

    // TASK 4: Polished arcade animation
    this.activeRankUpPresentation = this.createRankUpAnimation(rank, rankTitle);

    // Particles
    if (this.player && this.player.active) {
      this.particleManager.createExplosion(this.player.x, this.player.y, 0xffff00);
      // Screen flash
      const flash = new PIXI.Graphics();
      flash.rect(0, 0, this.game.getWidth(), this.game.getHeight()).fill({ color: 0xffff00, alpha: 0.2 });
      this.uiContainer.addChild(flash);

      // Cleanup Flash
      setTimeout(() => {
        if (this.uiContainer && flash.parent) this.uiContainer.removeChild(flash);
      }, 100);
    }

    return true;
  }

  createRankUpAnimation(rank, rankTitle) {
    const { width, height } = this.game.app.screen;
    const compact = width < 720;
    const panelWidth = Math.min(width - 32, compact ? 304 : 356);
    const panelHeight = compact ? 112 : 124;
    const container = new PIXI.Container();
    container.label = 'ui_rank_up_badge';
    container.x = compact ? width / 2 : width - panelWidth / 2 - 28;
    const safeTop = compact ? 176 : 190;
    container.y = Math.max(safeTop + panelHeight / 2, height * (compact ? 0.34 : 0.3));
    container.alpha = 0;
    container.scale.set(0.78);
    container.zIndex = 10000;
    this.uiOverlay.addChild(container);

    const burstLayer = new PIXI.Container();
    burstLayer.label = 'rank_up_broadcast_burst';
    burstLayer.alpha = 0.82;
    container.addChild(burstLayer);

    const burst = new PIXI.Graphics();
    const burstRadius = panelWidth * (compact ? 0.5 : 0.56);
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const inner = burstRadius * (i % 2 === 0 ? 0.78 : 0.88);
      const outer = burstRadius + (i % 2 === 0 ? 28 : 16);
      burst.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      burst.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    burst.stroke({ color: 0xffef7e, width: 2, alpha: 0.42 });
    burst.circle(0, 0, burstRadius * 0.82);
    burst.stroke({ color: 0x66f7ff, width: 1.5, alpha: 0.34 });
    burst.circle(0, 0, burstRadius + 20);
    burst.stroke({ color: 0xffef7e, width: 1, alpha: 0.28 });
    burstLayer.addChild(burst);

    const panel = new PIXI.Graphics();
    panel.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x041019, alpha: 0.94 });
    panel.stroke({ color: 0xffff66, width: 2.5, alpha: 0.94 });
    panel.rect(-panelWidth / 2 + 12, -panelHeight / 2 + 10, panelWidth - 24, 3);
    panel.fill({ color: 0x61f6ff, alpha: 0.82 });
    container.addChild(panel);

    const glow = new PIXI.Graphics();
    glow.roundRect(-panelWidth / 2 + 8, -panelHeight / 2 + 8, panelWidth - 16, panelHeight - 16, 6);
    glow.stroke({ color: 0xffd15c, width: 1.2, alpha: 0.58 });
    container.addChild(glow);

    const rankTexture = this.game.getRankTexture ? this.game.getRankTexture(rank) : null;
    const chevronTrail = new PIXI.Container();
    chevronTrail.label = 'rank_up_chevron_trail';
    const chevronCount = compact ? 3 : 4;
    const chevronStartX = rankTexture ? -panelWidth / 2 + 94 : -46;
    for (let i = 0; i < chevronCount; i++) {
      const chevron = new PIXI.Graphics();
      const alpha = 0.34 + i * 0.12;
      chevron.moveTo(-4, -7);
      chevron.lineTo(4, 0);
      chevron.lineTo(-4, 7);
      chevron.stroke({ color: i % 2 ? 0x66f7ff : 0xffef7e, width: 2, alpha });
      chevron.x = chevronStartX + i * (compact ? 14 : 16);
      chevron.y = rankTitle ? -32 : -15;
      chevronTrail.addChild(chevron);
    }
    container.addChild(chevronTrail);

    const signalPips = new PIXI.Container();
    signalPips.label = 'rank_up_signal_pips';
    const pipCount = compact ? 4 : 5;
    for (let i = 0; i < pipCount; i++) {
      const pip = new PIXI.Graphics();
      const pipW = 24 + i * 5;
      pip.roundRect(-pipW / 2, 0, pipW, 4, 2);
      pip.fill({ color: i % 2 === 0 ? 0xffef7e : 0x66f7ff, alpha: 0.86 - i * 0.08 });
      pip.x = -panelWidth / 2 + 40 + i * 44;
      pip.y = panelHeight / 2 - 17;
      signalPips.addChild(pip);
    }
    container.addChild(signalPips);

    const rankHalo = new PIXI.Graphics();
    rankHalo.label = 'rank_up_rank_halo';
    const haloX = -panelWidth / 2 + 58;
    const haloY = -6;
    const haloRadius = compact ? 34 : 39;
    rankHalo.x = haloX;
    rankHalo.y = haloY;
    rankHalo.circle(0, 0, haloRadius);
    rankHalo.stroke({ color: 0xffef7e, width: 2, alpha: 0.62 });
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      rankHalo.moveTo(Math.cos(angle) * (haloRadius + 4), Math.sin(angle) * (haloRadius + 4));
      rankHalo.lineTo(Math.cos(angle) * (haloRadius + 12), Math.sin(angle) * (haloRadius + 12));
    }
    rankHalo.stroke({ color: 0x66f7ff, width: 2, alpha: 0.72 });
    if (!rankTexture) {
      rankHalo.moveTo(0, -haloRadius * 0.38);
      rankHalo.lineTo(haloRadius * 0.34, 0);
      rankHalo.lineTo(0, haloRadius * 0.38);
      rankHalo.lineTo(-haloRadius * 0.34, 0);
      rankHalo.lineTo(0, -haloRadius * 0.38);
      rankHalo.stroke({ color: 0xffef7e, width: 2, alpha: 0.78 });
    }
    container.addChild(rankHalo);

    if (rankTexture) {
      const rankSprite = new PIXI.Sprite(rankTexture);
      rankSprite.anchor.set(0.5);
      rankSprite.scale.set(compact ? 0.52 : 0.6);
      rankSprite.x = -panelWidth / 2 + 58;
      rankSprite.y = -6;
      container.addChild(rankSprite);
    }

    const textX = rankTexture ? -panelWidth / 2 + 116 : 0;
    const textAnchorX = rankTexture ? 0 : 0.5;
    const maxTextWidth = rankTexture ? panelWidth - 136 : panelWidth - 36;
    const rankUpLabel = `${translateText('RANK UP')}!`;
    const rankUpText = createText(rankUpLabel, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 22 : 26,
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4,
      fontWeight: '900',
      align: rankTexture ? 'left' : 'center',
      wordWrap: true,
      wordWrapWidth: maxTextWidth
    });
    rankUpText.anchor.set(textAnchorX, 0.5);
    rankUpText.x = textX;
    rankUpText.y = rankTitle ? -22 : 0;
    container.addChild(rankUpText);

    if (rankTitle) {
      const titleText = createText(rankTitle.toUpperCase(), {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 17 : 20,
        fill: '#00ffff',
        stroke: '#000000',
        strokeThickness: 3,
        fontWeight: '900',
        align: rankTexture ? 'left' : 'center',
        wordWrap: true,
        wordWrapWidth: maxTextWidth
      });
      titleText.anchor.set(textAnchorX, 0.5);
      titleText.x = textX;
      titleText.y = 14;
      container.addChild(titleText);
    }

    container._debugRankUpClarity = {
      broadcastBurst: true,
      signalPips: pipCount,
      chevronTrail: chevronCount,
      rankHalo: Boolean(rankHalo),
      panelWidth,
      panelHeight,
      compact
    };

    let elapsed = 0;
    const phases = { easeIn: 260, hold: 1850, easeOut: 500 };
    const totalDuration = phases.easeIn + phases.hold + phases.easeOut;
    const animate = (delta) => {
      if (container.destroyed || !container.scale || !this.game?.app?.ticker) {
        this.game?.app?.ticker?.remove?.(animate);
        if (this.activeRankUpPresentation === container) this.activeRankUpPresentation = null;
        this._rankUpAnimating = false;
        return;
      }
      elapsed += delta.deltaTime * 16.67;
      const shimmer = Math.sin(elapsed * 0.008);
      burstLayer.rotation = shimmer * 0.012;
      burstLayer.alpha = 0.62 + Math.max(0, shimmer) * 0.24;
      chevronTrail.alpha = 0.58 + Math.max(0, Math.sin(elapsed * 0.014)) * 0.34;
      chevronTrail.x = Math.sin(elapsed * 0.012) * 2.5;
      signalPips.alpha = 0.74 + Math.max(0, Math.sin(elapsed * 0.012)) * 0.22;
      if (rankHalo) rankHalo.rotation += delta.deltaTime * 0.028;
      if (elapsed < phases.easeIn) {
        const t = elapsed / phases.easeIn;
        const eased = 1 - Math.pow(1 - t, 3);
        container.alpha = eased;
        container.scale.set(0.78 + eased * 0.22);
      } else if (elapsed < phases.easeIn + phases.hold) {
        const pulse = Math.sin((elapsed - phases.easeIn) * 0.005) * 0.035;
        container.alpha = 1;
        container.scale.set(1 + pulse);
      } else if (elapsed < totalDuration) {
        const t = (elapsed - phases.easeIn - phases.hold) / phases.easeOut;
        container.alpha = 1 - t;
      } else {
        this.game.app.ticker.remove(animate);
        if (container.parent) container.parent.removeChild(container);
        container.destroy?.({ children: true });
        if (this.activeRankUpPresentation === container) this.activeRankUpPresentation = null;
        this._rankUpAnimating = false;
        this.processToastQueue();
      }
    };
    this.game.app.ticker.add(animate);
    return container;
  }

  // Wave bonus WOW effect with premium arcade feel
  showWaveBonusEffect(bonusAmount, label = 'WAVE CLEARED!', options = {}) {
    const { width, height } = this.game.app.screen;
    const compact = Boolean(options.compact);
    const defaultQuipAllowed = !this.shouldSuppressPositiveAfterWaveCompliment();
    const subtitle = Object.prototype.hasOwnProperty.call(options, 'subtitle')
      ? options.subtitle
      : defaultQuipAllowed
        ? tauntDirector.getRotatingText('wave_clear_quip')
        : '';
    const humorState = Object.prototype.hasOwnProperty.call(options, 'subtitle')
      ? null
      : defaultQuipAllowed
        ? tauntDirector.getRotationDebugState()
        : null;
    const panelWidth = compact ? 340 : 400;
    const panelHeight = compact ? 108 : 130;
    const panelRadius = compact ? 8 : 10;
    const ringCount = 0;
    const effectY = compact ? height * 0.38 : height * 0.35;
    const phases = {
      entry: compact ? 220 : 400,
      hold: compact ? 650 : 1800,
      exit: compact ? 350 : 600,
      flashPeak: compact ? 90 : 150
    };
    const totalDuration = phases.entry + phases.hold + phases.exit;
    this.deferCenterToastForWaveBonus(totalDuration);
    this.reserveMessageFocus(totalDuration + 300, { priority: 8, slots: ['center'] });

    // Create dedicated isolated effect container
    const effectContainer = new PIXI.Container();
    effectContainer.x = width / 2;
    effectContainer.y = effectY;
    effectContainer.alpha = 0;
    effectContainer.scale.set(compact ? 0.55 : 0.3); // Bigger for more wow factor
    effectContainer.zIndex = 9999;
    effectContainer.label = 'ui_wave_bonus_effect';
    this.uiContainer.addChild(effectContainer);
    this.activeWaveBonusEffect = effectContainer;

    const sweepLayer = new PIXI.Graphics();
    sweepLayer.label = 'waveClearSweepLayer';
    const sweepBandCount = compact ? 3 : 4;
    const sweepChevronCount = compact ? 6 : 10;
    for (let i = 0; i < sweepBandCount; i += 1) {
      const bandY = (i - (sweepBandCount - 1) / 2) * (compact ? 24 : 28);
      const bandHeight = compact ? 6 : 8;
      sweepLayer.roundRect(-width * 0.42, bandY - bandHeight / 2, width * 0.84, bandHeight, bandHeight / 2);
      sweepLayer.fill({ color: i % 2 ? 0x7ee9ff : 0x00ff66, alpha: compact ? 0.08 : 0.11 });
      sweepLayer.moveTo(-width * 0.36, bandY + bandHeight * 1.15);
      sweepLayer.lineTo(width * 0.36, bandY + bandHeight * 1.15);
      sweepLayer.stroke({ color: i % 2 ? 0xffffff : 0x7ee9ff, width: 1, alpha: compact ? 0.12 : 0.18 });
    }
    for (let i = 0; i < sweepChevronCount; i += 1) {
      const ratio = (i + 0.5) / sweepChevronCount;
      const side = i % 2 === 0 ? -1 : 1;
      const x = -width * 0.34 + ratio * width * 0.68;
      const y = side * (compact ? 45 : 56);
      const size = compact ? 9 : 12;
      sweepLayer.moveTo(x - size, y - size * 0.7);
      sweepLayer.lineTo(x, y);
      sweepLayer.lineTo(x - size, y + size * 0.7);
      sweepLayer.stroke({ color: 0xffff66, width: compact ? 1.4 : 1.8, alpha: compact ? 0.34 : 0.48 });
    }
    effectContainer.addChild(sweepLayer);

    // Background panel with glow
    const panel = new PIXI.Graphics();
    panel.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, panelRadius);
    panel.fill({ color: 0x000000, alpha: 0.95 });
    panel.stroke({ color: 0x00ff00, width: 4 });
    effectContainer.addChild(panel);

    // Inner glow with multiple layers for depth
    const glow = new PIXI.Graphics();
    glow.roundRect(-panelWidth / 2 + 5, -panelHeight / 2 + 5, panelWidth - 10, panelHeight - 10, Math.max(4, panelRadius - 2));
    glow.stroke({ color: 0x00ff00, width: 3, alpha: 0.6 });
    effectContainer.addChild(glow);

    const innerGlow = new PIXI.Graphics();
    innerGlow.roundRect(-panelWidth / 2 + 10, -panelHeight / 2 + 10, panelWidth - 20, panelHeight - 20, Math.max(3, panelRadius - 3));
    innerGlow.stroke({ color: 0xffff00, width: 2, alpha: 0.3 });
    effectContainer.addChild(innerGlow);

    const accentRails = new PIXI.Graphics();
    const accentRailCount = compact ? 2 : 4;
    for (let i = 0; i < accentRailCount; i += 1) {
      const side = i % 2 ? 1 : -1;
      const lane = Math.floor(i / 2);
      const x = side * (panelWidth / 2 + 18 + lane * 14);
      const y = (lane - 0.5) * (compact ? 34 : 46);
      accentRails.moveTo(x - side * 18, y - 7);
      accentRails.lineTo(x, y);
      accentRails.lineTo(x - side * 18, y + 7);
    }
    accentRails.stroke({ color: 0x7ee9ff, width: compact ? 1.4 : 1.8, alpha: 0.46 });
    effectContainer.addChild(accentRails);

    // Main label (WAVE CLEARED!) - Big and bold
    const labelText = createText(label, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 28 : 38,
      fill: '#00ff00',
      stroke: '#004400',
      strokeThickness: 6,
      dropShadow: true,
      dropShadowColor: '#00ff00',
      dropShadowBlur: 10,
      dropShadowDistance: 3
    });
    labelText.anchor.set(0.5);
    labelText.y = compact ? -30 : -30;
    effectContainer.addChild(labelText);

    // Bonus amount with coin icon
    const bonusText = createText(`+${bonusAmount}`, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 34 : 48,
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 8,
      dropShadow: true,
      dropShadowColor: '#ffff00',
      dropShadowBlur: 15,
      dropShadowDistance: 4
    });
    bonusText.anchor.set(0.5);
    bonusText.y = compact && subtitle ? 8 : 30;
    effectContainer.addChild(bonusText);

    if (subtitle) {
      const subtitleText = createText(String(subtitle), {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: compact ? 15 : 18,
        fill: '#7ee9ff',
        stroke: '#00111d',
        strokeThickness: 4,
        align: 'center'
      });
      subtitleText.anchor.set(0.5);
      subtitleText.y = compact ? 39 : 56;
      effectContainer.addChild(subtitleText);
    }

    // Isolated flash effect (contained, not global stage)
    const flash = new PIXI.Graphics();
    flash.rect(-width / 2, -height / 2, width, height);
    flash.fill({ color: 0x00ff00, alpha: 0 });
    effectContainer.addChild(flash);

    // Particle burst at center screen
    if (this.particleManager) {
      if (compact) {
        this.particleManager.createExplosion(width / 2, effectY, 0x00ff00, 0.35);
      } else {
        this.particleManager.createExplosion(width / 2, effectY, 0x00ff00);
        this.particleManager.createExplosion(width / 2 - 50, effectY, 0xffff00);
        this.particleManager.createExplosion(width / 2 + 50, effectY, 0xffff00);
      }
    }

    // Screen shake isolated to game container (NOT stage)
    if (this.screenShake) {
      this.screenShake.shake(compact ? 4 : 8, compact ? 10 : 20); // Strong but controlled shake
    }

    // Satisfying sound (NOT the annoying blip blop)
    AudioManager.playSfx(options.sfxKey || 'nova_wave_clear_sweep', {
      force: true,
      volume: compact ? 0.52 : 0.72,
      minIntervalMs: 620
    });
    this.emitSpectacle('wave', {
      x: width * 0.5,
      y: effectY,
      color: 0x00ff66,
      accent: 0xffff66,
      intensity: compact ? 0.72 : 1.08,
      audioIntensity: compact ? 0.68 : 1,
      audioVolume: compact ? 0.58 : 0.84,
      pitchScale: 1.04,
      force: true
    });

    // Animation sequence: explosive entry, hold, smooth exit
    let elapsed = 0;
    effectContainer._debugWaveClearEffect = {
      compact,
      panelWidth,
      panelHeight,
      ringCount,
      glintCount: 0,
      accentRailCount,
      sweepBandCount,
      sweepChevronCount,
      subtitle: Boolean(subtitle),
      subtitleText: subtitle ? String(subtitle) : '',
      humor: humorState
    };

    const animate = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      const sweepPulse = Math.sin(elapsed * 0.018) * 0.5 + 0.5;
      sweepLayer.alpha = 0.72 + sweepPulse * 0.22;
      sweepLayer.x = Math.sin(elapsed * 0.012) * (compact ? 5 : 8);

      if (elapsed < phases.entry) {
        // Explosive entry: scale up with ease-out elastic
        const t = elapsed / phases.entry;
        const eased = 1 - Math.pow(1 - t, 4); // Ease out quart
        effectContainer.alpha = Math.min(1, t * 2); // Fade in fast
        const baseScale = compact ? 0.55 : 0.3;
        const scaleBoost = compact ? 0.45 : 2;
        effectContainer.scale.set(baseScale * (1 + eased * scaleBoost)); // Scale to final size with overshoot
        effectContainer.rotation = Math.sin(t * Math.PI * 2) * 0.1 * (1 - t); // Wobble entry

        // Flash effect (isolated, peaks early then fades)
        if (elapsed < phases.flashPeak) {
          const flashT = elapsed / phases.flashPeak;
          flash.alpha = Math.sin(flashT * Math.PI) * (compact ? 0.16 : 0.4); // Brighter flash
        } else {
          flash.alpha = 0;
        }
      } else if (elapsed < phases.entry + phases.hold) {
        // Hold: stable with subtle pulse
        const holdT = (elapsed - phases.entry) / phases.hold;
        const pulse = Math.sin(holdT * Math.PI * 3) * 0.03; // Gentle pulse
        effectContainer.alpha = 1;
        effectContainer.scale.set(1 + pulse);
        flash.alpha = 0;
      } else if (elapsed < totalDuration) {
        // Exit: smooth fade out
        const t = (elapsed - phases.entry - phases.hold) / phases.exit;
        effectContainer.alpha = 1 - t;
        effectContainer.scale.set(1 - t * 0.2); // Shrink slightly
        flash.alpha = 0;
      } else {
        // Complete cleanup - remove ticker and container
        this.game.app.ticker.remove(animate);
        if (effectContainer.parent) {
          this.uiContainer.removeChild(effectContainer);
        }
        // Ensure flash is cleaned up
        effectContainer.destroy({ children: true });
        if (this.activeWaveBonusEffect === effectContainer) this.activeWaveBonusEffect = null;
        this.flushPendingRankUpPresentation('wave_bonus_complete');
        this.processToastQueue();
      }
    };

    this.game.app.ticker.add(animate);
  }

  showChallengeFlightHud(state = {}) {
    this.clearChallengeFlightHud('replace');
    if (!this.uiContainer || !this.game?.app?.ticker) return null;

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 720;
    const panelWidth = Math.min(width - 28, compact ? 330 : 410);
    const panelHeight = compact ? 88 : 102;
    const container = new PIXI.Container();
    container.x = 18;
    container.y = height - panelHeight - 18;
    container.zIndex = 8800;
    container.label = 'ui_challenge_flight_hud';

    const shadow = new PIXI.Graphics();
    shadow.roundRect(5, 6, panelWidth, panelHeight, 10);
    shadow.fill({ color: 0x000000, alpha: 0.46 });
    container.addChild(shadow);

    const frame = new PIXI.Graphics();
    frame.roundRect(0, 0, panelWidth, panelHeight, 10);
    frame.fill({ color: 0x06111c, alpha: 0.94 });
    frame.stroke({ color: 0xffd85a, width: 3, alpha: 0.96 });
    frame.roundRect(6, 6, panelWidth - 12, panelHeight - 12, 7);
    frame.stroke({ color: 0x7ee9ff, width: 1.4, alpha: 0.55 });
    container.addChild(frame);

    const rail = new PIXI.Graphics();
    rail.roundRect(12, panelHeight - 14, panelWidth - 24, 5, 2.5);
    rail.fill({ color: 0x0b2936, alpha: 0.95 });
    container.addChild(rail);

    const progress = new PIXI.Graphics();
    progress.label = 'challengeFlightProgress';
    container.addChild(progress);

    const reticle = new PIXI.Graphics();
    const reticleRadius = compact ? 15 : 18;
    const reticleOuter = compact ? 22 : 26;
    const reticleInner = compact ? 11 : 14;
    reticle.circle(0, 0, reticleRadius);
    reticle.stroke({ color: 0xffd85a, width: 2.5, alpha: 0.9 });
    reticle.moveTo(0, -reticleOuter);
    reticle.lineTo(0, -reticleInner);
    reticle.moveTo(0, reticleOuter);
    reticle.lineTo(0, reticleInner);
    reticle.moveTo(-reticleOuter, 0);
    reticle.lineTo(-reticleInner, 0);
    reticle.moveTo(reticleOuter, 0);
    reticle.lineTo(reticleInner, 0);
    reticle.stroke({ color: 0x7ee9ff, width: 2, alpha: 0.85 });
    reticle.x = compact ? 34 : 39;
    reticle.y = compact ? 42 : 48;
    container.addChild(reticle);

    const title = createText(translateText('CABINET SKILL FLIGHT'), {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 17 : 21,
      fill: '#fff3a0',
      stroke: '#160d00',
      strokeThickness: 3,
      fontWeight: '800',
      letterSpacing: 0.7
    });
    title.x = compact ? 61 : 72;
    title.y = compact ? 9 : 11;
    const titleMaxWidth = panelWidth - title.x - 18;
    const titleScale = title.width > titleMaxWidth ? titleMaxWidth / title.width : 1;
    title.scale.set(titleScale);
    container.addChild(title);

    const pattern = createText(translateText(state.patternLabel || 'STAR PARADE'), {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 13 : 16,
      fill: '#7ee9ff',
      fontWeight: '700'
    });
    pattern.x = title.x;
    pattern.y = compact ? 32 : 39;
    container.addChild(pattern);

    const status = createText('', {
      fontFamily: FONT_BODY,
      fontSize: compact ? 13 : 15,
      fill: '#ffffff',
      fontWeight: '700',
      align: 'right'
    });
    status.anchor.set(1, 0);
    status.x = panelWidth - 15;
    status.y = compact ? 54 : 63;
    container.addChild(status);

    this.uiContainer.addChild(container);
    this.uiContainer.sortChildren?.();

    let elapsed = 0;
    const animate = (delta) => {
      if (!container.parent || container.destroyed) {
        this.game?.app?.ticker?.remove?.(animate);
        return;
      }
      elapsed += delta.deltaTime * 16.67;
      reticle.rotation += delta.deltaTime * 0.018;
      const pulse = Math.sin(elapsed * 0.009) * 0.5 + 0.5;
      frame.alpha = 0.9 + pulse * 0.1;
      progress.alpha = 0.78 + pulse * 0.22;
    };
    this.game.app.ticker.add(animate);

    this.challengeFlightHud = {
      container,
      frame,
      progress,
      pattern,
      status,
      reticle,
      animate,
      panelWidth,
      panelHeight,
      titleScale,
      compact,
      state: null
    };
    this.updateChallengeFlightHud(state);
    return container;
  }

  updateChallengeFlightHud(state = {}) {
    const hud = this.challengeFlightHud;
    if (!hud?.container?.parent) return false;
    const total = Math.max(1, Math.floor(Number(state.targetCount) || 1));
    const kills = Math.max(0, Math.min(total, Math.floor(Number(state.kills) || 0)));
    const seconds = Math.max(0, Math.ceil((Number(state.remainingMs) || 0) / 1000));
    hud.status.text = translateText('TARGETS {kills}/{total} // {seconds}s', { kills, total, seconds });
    hud.pattern.text = translateText(state.patternLabel || 'STAR PARADE');
    hud.progress.clear();
    const railWidth = hud.panelWidth - 24;
    const fillWidth = railWidth * (kills / total);
    if (fillWidth > 0) {
      hud.progress.roundRect(12, hud.panelHeight - 14, fillWidth, 5, 2.5);
      hud.progress.fill({ color: kills === total ? 0xffef7e : 0x7ee9ff, alpha: 0.98 });
    }
    hud.state = { ...state, targetCount: total, kills, remainingSeconds: seconds };
    hud.container._debugChallengeFlight = {
      ...hud.state,
      title: translateText('CABINET SKILL FLIGHT'),
      pattern: hud.pattern.text,
      status: hud.status.text,
      panelWidth: hud.panelWidth,
      panelHeight: hud.panelHeight,
      titleScale: hud.titleScale,
      compact: hud.compact
    };
    return true;
  }

  clearChallengeFlightHud(reason = 'clear') {
    const hud = this.challengeFlightHud;
    if (!hud) return false;
    this.game?.app?.ticker?.remove?.(hud.animate);
    if (hud.container?.parent) hud.container.parent.removeChild(hud.container);
    hud.container?.destroy?.({ children: true });
    this.challengeFlightHud = null;
    this.lastChallengeFlightHudClearReason = reason;
    return true;
  }

  showChallengeFlightResult(result = {}) {
    this.clearChallengeFlightHud('result');
    if (this.activeRankUpPresentation?.parent) {
      this.pendingRankUpPresentation = Number.isFinite(Number(this.game?.rankIndex))
        ? Number(this.game.rankIndex)
        : this.pendingRankUpPresentation;
      this.activeRankUpPresentation.parent.removeChild(this.activeRankUpPresentation);
      this.activeRankUpPresentation.destroy?.({ children: true });
      this.activeRankUpPresentation = null;
      this._rankUpAnimating = false;
    }
    const kills = Math.max(0, Math.floor(Number(result.kills) || 0));
    const targetCount = Math.max(1, Math.floor(Number(result.targetCount) || 1));
    const appliedBonus = Math.max(0, Math.round(Number(result.appliedBonus) || 0));
    const label = translateText(result.label || 'FLIGHT MISSED');
    const subtitle = translateText('TARGETS {kills}/{total} // +{score}', {
      kills,
      total: targetCount,
      score: appliedBonus.toLocaleString('en-US')
    });
    this.showWaveBonusEffect(appliedBonus, label, {
      compact: result.grade !== 'PERFECT',
      subtitle,
      sfxKey: result.grade === 'PERFECT' ? 'levelComplete' : 'nova_wave_clear_sweep'
    });
    if (result.grade === 'PERFECT') {
      const width = this.game.getWidth();
      const height = this.game.getHeight();
      [-1, 0, 1].forEach((offset, index) => {
        this.particleManager?.createExplosion?.(
          width / 2 + offset * Math.min(140, width * 0.12),
          height * 0.45 + (index % 2) * 34,
          index === 1 ? 0xffffff : 0xffef7e,
          1.1
        );
      });
      this.screenShake?.shake?.(10, 24);
    }
    this.lastChallengeFlightPresentation = {
      ...result,
      kills,
      targetCount,
      appliedBonus,
      label,
      subtitle,
      presentedAt: Date.now()
    };
    return this.lastChallengeFlightPresentation;
  }

  showErrorOverlay(e) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.background = 'rgba(50, 0, 0, 0.9)';
    div.style.color = '#ff5555';
    div.style.padding = '20px';
    div.style.zIndex = '99999';
    div.innerHTML = `<h1>GAME LOOP CRASH</h1><pre>${e.message}\n\n${e.stack}</pre>`;
    document.body.appendChild(div);
  }

  detonateBombBullet(bullet, reason = 'unknown') {
    if (!bullet?.active || !bullet.isBomb || bullet.bombDetonated) return false;
    bullet.bombDetonated = true;
    this.bulletManager?.deactivateBullet?.(bullet, `bomb_${reason}`);

    const radius = Math.max(110, Number(bullet.blastRadius) || 150);
    const damage = Math.max(1, Number(bullet.damage) || 1);
    const gameplayWidth = this.gameplayGame.getWidth();
    const gameplayHeight = this.gameplayGame.getHeight();
    const x = Number.isFinite(bullet.x) ? bullet.x : this.player?.x || gameplayWidth / 2;
    const y = Number.isFinite(bullet.y) ? bullet.y : this.player?.y || gameplayHeight * 0.45;

    if (this.particleManager) {
      const burstCount = this.game.getWidth() < 620 ? 9 : 14;
      for (let i = 0; i < burstCount; i += 1) {
        const angle = (Math.PI * 2 * i) / burstCount;
        const distance = radius * (0.28 + Math.random() * 0.68);
        this.particleManager.createExplosion(
          x + Math.cos(angle) * distance,
          y + Math.sin(angle) * distance,
          i % 3 === 0 ? 0xffff66 : 0xff6600,
          0.72
        );
      }
      this.particleManager.createExplosion(x, y, 0xffff00, 1.15);
    }
    this.triggerShockwave?.(x, y, 0xffaa00);
    this.screenShake?.shake(reason === 'apex' ? 12 : 16, 28);
    AudioManager.playSfx('explosion', { force: true, volume: 1.0 });

    this.enemyManager.enemies.forEach(enemy => {
      if (!enemy?.active) return;
      const dist = Math.hypot((enemy.x || 0) - x, (enemy.y || 0) - y);
      if (dist > radius + (enemy.radius || 16)) return;
      this.recordCombatProjectileHit(bullet);
      const destroyed = this.applyCombatDamage(enemy, damage, 'bomb');
      this.particleManager?.createHitSpark(enemy.x, enemy.y, 0xffaa00);
      if (destroyed) {
        this.addNormalWaveScore(enemy.scoreValue || 0, 'baseScore', enemy);
        if (enemy.kind !== 'boss') {
          this.onEnemyKilled(enemy);
          this.enemyManager?.removeEnemySprite?.(enemy, 'bomb_blast');
        }
        this.playEnemyDeathFeedback(enemy, { color: 0xff6600, intensity: 0.74, volume: 0.44 });
      }
    });

    const hijacker = this.enemyManager.hijacker;
    if (hijacker?.active) {
      const dist = Math.hypot((hijacker.x || 0) - x, (hijacker.y || 0) - y);
      if (dist <= radius + (hijacker.radius || 18)) {
        this.recordCombatProjectileHit(bullet);
        const destroyed = this.applyCombatDamage(hijacker, damage, 'bomb');
        this.particleManager?.createHitSpark(hijacker.x, hijacker.y, 0xffaa00);
        if (destroyed) this.particleManager?.createExplosion(hijacker.x, hijacker.y, 0xff9900);
      }
    }

    console.log(`[BombPowerup] detonated reason=${reason} x=${Math.round(x)} y=${Math.round(y)} radius=${Math.round(radius)}`);
    if (this.player?.runAugmentModifiers?.skyVerdict && this.player?.orbitalStrikeCharges > 0) {
      this.orbitalStrikeTimer = 0;
      this.triggerOrbitalStrike({ targetX: x, targetY: y, fusionId: 'sky_verdict' });
    }
    return true;
  }

  createCollisionSideEffectQueue() {
    return {
      scorePopups: [],
      hitSparks: [],
      deathFeedback: [],
      audio: [],
      powerupSpawns: [],
      toasts: [],
      playerExplosions: [],
      screenShakes: [],
      comboFlares: []
    };
  }

  queueCollisionSideEffect(queue, type, payload = {}) {
    if (!queue?.[type]) return false;
    if (type === 'scorePopups' && queue[type].length >= COLLISION_SCORE_POPUP_QUEUE_BUDGET) {
      queue.scorePopupsDropped = (Number(queue.scorePopupsDropped) || 0) + 1;
      return true;
    }
    queue[type].push(payload);
    return true;
  }

  processCollisionSideEffects(queue, stats, measure) {
    if (!queue) return;
    const measured = measure || ((_label, callback) => callback());
    const diagnosticOptions = this.performanceDiagnostics?.options || {};
    const skipAllSideEffects = Boolean(diagnosticOptions.rawCollisionOnly || diagnosticOptions.noCollisionSideEffects);
    const activeParticles = this.particleManager?.particles?.length || 0;
    const activeCombatText = (this.scorePopupManager?.popups?.length || 0)
      + (this.scorePopupManager?.pendingPopups?.length || 0);
    const activeEnemyCount = this.enemyManager?.enemies?.filter?.((enemy) => enemy?.active !== false).length || 0;
    const plasmaSweepLoad = this.player?.activePowerup?.type === 'plasma_lance'
      && (activeEnemyCount >= 32 || queue.deathFeedback.length > 0 || queue.scorePopups.length >= 2);
    const denseVisualLoad = activeParticles >= 500 || activeCombatText >= 20;
    const extremeVisualLoad = activeParticles >= 585 || activeCombatText >= 28;

    measured('collision.side_effects.score_popups', () => {
      const overflowDropped = Number(queue.scorePopupsDropped) || 0;
      if (skipAllSideEffects || diagnosticOptions.noScorePopups) {
        stats.scorePopupQueued = (stats.scorePopupQueued || 0) + queue.scorePopups.length + overflowDropped;
        stats.scorePopupDropped = (stats.scorePopupDropped || 0) + queue.scorePopups.length + overflowDropped;
        return;
      }
      const visiblePopupEntries = plasmaSweepLoad
        ? queue.scorePopups.slice(0, 1)
        : queue.scorePopups;
      const visuallyDroppedPopups = Math.max(0, queue.scorePopups.length - visiblePopupEntries.length);
      for (const popup of visiblePopupEntries) {
        this.scorePopupManager?.queueScorePopup?.(popup.x, popup.y, popup.score, popup.options || {});
      }
      const scorePopupBudget = plasmaSweepLoad
        ? 6
        : (denseVisualLoad || activeCombatText >= 18 ? 16 : 24);
      this.scorePopupManager?.setActiveBudget?.(scorePopupBudget);
      const maxScorePopups = overflowDropped > 0 || plasmaSweepLoad || activeCombatText >= 8
        ? 1
        : (queue.scorePopups.length >= 8 ? 2 : 3);
      const flushed = this.scorePopupManager?.flushQueuedPopups?.(maxScorePopups) || {
        queued: visiblePopupEntries.length,
        created: 0,
        dropped: visiblePopupEntries.length,
        remaining: 0
      };
      stats.scorePopupQueued = (stats.scorePopupQueued || 0) + flushed.queued + overflowDropped + visuallyDroppedPopups;
      stats.scorePopupCreated = (stats.scorePopupCreated || 0) + flushed.created;
      stats.scorePopupDropped = (stats.scorePopupDropped || 0) + flushed.dropped + overflowDropped + visuallyDroppedPopups;
      stats.scorePopupPending = flushed.remaining;
    });

    measured('collision.side_effects.particles', () => {
      if (skipAllSideEffects || diagnosticOptions.noParticles) {
        stats.hitSparkQueued = (stats.hitSparkQueued || 0) + queue.hitSparks.length;
        stats.deathFeedbackQueued = (stats.deathFeedbackQueued || 0) + queue.deathFeedback.length;
        return;
      }
      let hitSparkCreated = 0;
      let deathFeedbackCreated = 0;
      const massiveBurst = (queue.hitSparks.length + queue.deathFeedback.length) >= 32;
      const maxHitSparks = extremeVisualLoad ? 1 : (massiveBurst || denseVisualLoad || plasmaSweepLoad ? 2 : 4);
      const maxDeathFeedback = (massiveBurst || extremeVisualLoad || plasmaSweepLoad) ? 0 : 1;
      for (const spark of queue.hitSparks.slice(0, maxHitSparks)) {
        if (!this.particleManager || spark?.enabled === false) continue;
        this.particleManager.createHitSpark(spark.x, spark.y, spark.color, spark.intensity);
        hitSparkCreated += 1;
      }
      for (const entry of queue.deathFeedback.slice(0, maxDeathFeedback)) {
        if (!entry?.enemy) continue;
        this.playEnemyDeathFeedback(entry.enemy, {
          ...(entry.options || {}),
          performanceLite: plasmaSweepLoad || denseVisualLoad || extremeVisualLoad || entry.options?.performanceLite === true
        });
        deathFeedbackCreated += 1;
      }
      stats.hitSparkQueued = (stats.hitSparkQueued || 0) + queue.hitSparks.length;
      stats.hitSparkCreated = (stats.hitSparkCreated || 0) + hitSparkCreated;
      stats.hitSparkDropped = (stats.hitSparkDropped || 0) + Math.max(0, queue.hitSparks.length - hitSparkCreated);
      stats.deathFeedbackQueued = (stats.deathFeedbackQueued || 0) + queue.deathFeedback.length;
      stats.deathFeedbackCreated = (stats.deathFeedbackCreated || 0) + deathFeedbackCreated;
      stats.deathFeedbackDropped = (stats.deathFeedbackDropped || 0) + Math.max(0, queue.deathFeedback.length - deathFeedbackCreated);
    });

    measured('collision.side_effects.audio', () => {
      if (skipAllSideEffects || diagnosticOptions.noHitAudio) {
        stats.audioQueued = (stats.audioQueued || 0) + queue.audio.length;
        return;
      }
      let played = 0;
      const maxAudioEvents = 8;
      for (const entry of queue.audio.slice(0, maxAudioEvents)) {
        if (!entry?.sfx) continue;
        AudioManager.playSfx(entry.sfx, entry.options || {});
        played += 1;
      }
      stats.audioQueued = (stats.audioQueued || 0) + queue.audio.length;
      stats.audioPlayed = (stats.audioPlayed || 0) + played;
    });

    measured('collision.side_effects.powerups', () => {
      if (skipAllSideEffects) {
        stats.powerupSpawnQueued = (stats.powerupSpawnQueued || 0) + queue.powerupSpawns.length;
        stats.powerupSpawnDropped = (stats.powerupSpawnDropped || 0) + queue.powerupSpawns.length;
        return;
      }
      let spawned = 0;
      const maxPowerupSpawns = plasmaSweepLoad ? 1 : COLLISION_POWERUP_SPAWN_ATTEMPT_BUDGET;
      for (const entry of queue.powerupSpawns.slice(0, maxPowerupSpawns)) {
        this.powerupManager?.spawn?.(entry.x, entry.y);
        spawned += 1;
      }
      stats.powerupSpawnQueued = (stats.powerupSpawnQueued || 0) + queue.powerupSpawns.length;
      stats.powerupSpawned = (stats.powerupSpawned || 0) + spawned;
      stats.powerupSpawnDropped = (stats.powerupSpawnDropped || 0) + Math.max(0, queue.powerupSpawns.length - spawned);
    });

    measured('collision.side_effects.ui_feedback', () => {
      if (skipAllSideEffects) return;
      this.deferredCollisionUiFeedback.toasts.push(...queue.toasts);
      this.deferredCollisionUiFeedback.screenShakes.push(...queue.screenShakes);
      this.deferredCollisionUiFeedback.playerExplosions.push(...queue.playerExplosions);
      this.deferredCollisionUiFeedback.comboFlares.push(...queue.comboFlares);
    });
  }

  getCollisionRadius(entity) {
    const radius = Number(entity?.radius) || 10;
    const pickupAssistRadius = Number(entity?.pickupAssistRadius ?? entity?.collectionRadius);
    if (entity?.effect && Number.isFinite(pickupAssistRadius) && pickupAssistRadius > radius) {
      return pickupAssistRadius;
    }
    if (entity?.kind === 'boss') {
      const fairness = BalanceConfig.difficulty?.bossFairness || {};
      const level = Number(entity.level) || Number(this.game?.level) || 1;
      const scalar = level <= 1
        ? (fairness.contactRadiusScalarEarly ?? fairness.contactRadiusScalar ?? 0.5)
        : (fairness.contactRadiusScalar ?? 0.62);
      return Math.max(42, radius * scalar);
    }
    return radius;
  }

  interceptPointDefenseBullets(collisionStats = null) {
    const bullets = this.bulletManager?.enemyBullets;
    if (!Array.isArray(bullets) || !this.player?.pointDefenseActive || this.player.isPowerupSuppressed?.()) {
      return 0;
    }

    let intercepted = 0;
    let visibleFeedback = 0;
    let firstIntercept = null;
    for (const bullet of bullets) {
      if (!bullet?.active) continue;
      if (collisionStats) collisionStats.projectileDefensePairs += 1;
      if (!isWithinPointDefenseRadius(this.player, bullet)) continue;

      if (!firstIntercept) {
        firstIntercept = { x: Number(bullet.x) || this.player.x, y: Number(bullet.y) || this.player.y };
      }
      this.bulletManager.deactivateBullet?.(bullet, 'point_defense');
      intercepted += 1;
      if (collisionStats) collisionStats.projectileDefenseHits += 1;
      if (visibleFeedback < 8) {
        this.particleManager?.createHitSpark?.(
          bullet.x,
          bullet.y,
          visibleFeedback % 2 === 0 ? 0x7df9ff : 0xffffff,
          visibleFeedback === 0 ? 1.1 : 0.78
        );
        visibleFeedback += 1;
      }
    }

    if (intercepted > 0) {
      this.bulletManager.pruneInactiveBullets?.('enemy', 'point_defense');
      this.player.notePointDefenseIntercept?.({
        x: firstIntercept?.x,
        y: firstIntercept?.y,
        count: intercepted
      });
      AudioManager.playSfx('tactical_point_defense', {
        volume: intercepted >= 4 ? 0.5 : 0.36,
        playbackRate: intercepted >= 4 ? 0.94 : 1.04,
        minIntervalMs: 90
      });
    }
    return intercepted;
  }

  checkCollisions() {
    const perfDiag = this.performanceDiagnostics;
    const measure = perfDiag?.measure?.bind(perfDiag) || ((_label, callback) => callback());
    const sideEffects = this.createCollisionSideEffectQueue();
    const collisionStats = {
      runMode: this.game?.runMode || 'unknown',
      sector: Math.max(1, Math.floor(Number(this.game?.level) || 1)),
      playerBullets: this.bulletManager?.playerBullets?.length || 0,
      enemyBullets: this.bulletManager?.enemyBullets?.length || 0,
      enemies: this.enemyManager?.enemies?.length || 0,
      powerups: this.powerupManager?.powerups?.length || 0,
      ambientBonusDrones: this.ambientBonusDrones?.length || 0,
      bossHazards: this.bossHazards?.length || 0,
      bombApexChecks: 0,
      bombApexDetonations: 0,
      playerBulletEnemyPairs: 0,
      playerBulletEnemyCandidateCells: 0,
      playerBulletEnemyCandidateChecks: 0,
      playerBulletEnemyHits: 0,
      playerBulletEnemyHitEvents: 0,
      playerBulletEnemyKills: 0,
      playerBulletEnemyDamageOnly: 0,
      playerBulletEnemyProxies: 0,
      enemyCollisionProxies: 0,
      plasmaLanceActive: this.player?.activePowerup?.type === 'plasma_lance',
      plasmaLanceHitEvents: 0,
      plasmaLanceKills: 0,
      playerBulletHijackerPairs: 0,
      playerBulletHijackerHits: 0,
      projectileDefensePairs: 0,
      projectileDefenseHits: 0,
      enemyBulletPlayerChecks: 0,
      enemyBulletPlayerNearMisses: 0,
      enemyBulletPlayerHits: 0,
      ambientDronePlayerChecks: 0,
      ambientDronePlayerHits: 0,
      playerBulletAmbientPairs: 0,
      playerBulletAmbientHits: 0,
      playerBulletAmbientKills: 0,
      enemyPlayerChecks: 0,
      enemyPlayerHits: 0,
      powerupPlayerChecks: 0,
      powerupPickups: 0,
      scorePopupQueued: 0,
      scorePopupCreated: 0,
      scorePopupDropped: 0,
      scorePopupPending: 0,
      hitSparkQueued: 0,
      hitSparkCreated: 0,
      hitSparkDropped: 0,
      deathFeedbackQueued: 0,
      deathFeedbackCreated: 0,
      deathFeedbackDropped: 0,
      audioQueued: 0,
      audioPlayed: 0,
      powerupSpawnQueued: 0,
      powerupSpawned: 0,
      powerupSpawnDropped: 0
    };
    this.collisionDiagnosticStats = collisionStats;

    // Safety checks for managers
    if (!this.bulletManager || !this.enemyManager || !this.powerupManager || !this.player) return;
    this.isCollisionHotPathActive = true;
    try {

    // Bomb detonation check
    measure('collision.bomb_apex', () => {
    const screenHeight = this.gameplayGame.getHeight();
    const fallbackDetonationY = screenHeight * 0.12;
    this.bulletManager.playerBullets.forEach(bullet => {
      collisionStats.bombApexChecks += 1;
      if (!bullet.active || !bullet.isBomb) return;
      const target = bullet.bombTarget;
      const targetActive = Boolean(target && target.active !== false && target.destroyed !== true);
      const targetX = targetActive && Number.isFinite(Number(target.x))
        ? Number(target.x)
        : Number(bullet.bombTargetX);
      const targetY = targetActive && Number.isFinite(Number(target.y))
        ? Number(target.y)
        : Number(bullet.bombTargetY);
      const targetRadius = targetActive
        ? Math.max(0, Number(target.radius) || Number(bullet.bombTargetRadius) || 0)
        : Math.max(0, Number(bullet.bombTargetRadius) || 0);
      const hasCommitPoint = Number.isFinite(targetX) && Number.isFinite(targetY);
      const fuseRadius = Math.max(18, (Number(bullet.radius) || 0) + targetRadius + 3);
      const reachedCommitPoint = hasCommitPoint
        && Math.hypot((Number(bullet.x) || 0) - targetX, (Number(bullet.y) || 0) - targetY) <= fuseRadius;
      const reachedFallbackApex = !hasCommitPoint && bullet.y <= fallbackDetonationY;
      if (reachedCommitPoint || reachedFallbackApex) {
        collisionStats.bombApexDetonations += 1;
        this.detonateBombBullet(bullet, reachedCommitPoint ? 'target_lock' : 'apex');
      }
    });
    });

    // Player bullets vs enemies
    measure('collision.player_bullets_enemies', () => {
    let bulletProxies = [];
    let enemyProxies = [];
    let hitEvents = [];
    let enemyGrid = null;

    measure('collision.player_bullets_enemies.build_proxies', () => {
      for (const bullet of this.bulletManager.playerBullets) {
        if (!bullet?.active) continue;
        bulletProxies.push({
          ref: bullet,
          x: Number(bullet.x) || 0,
          y: Number(bullet.y) || 0,
          vx: Number(bullet.vx) || 0,
          vy: Number(bullet.vy) || 0,
          radius: this.getCollisionRadius(bullet),
          damage: Math.max(0, Number(bullet.damage) || 0),
          piercing: Boolean(bullet.piercing),
          isBomb: Boolean(bullet.isBomb),
          isPlasmaLance: Boolean(bullet.isPlasmaLance || bullet.powerupType === 'plasma_lance')
        });
      }
      let enemyIndex = 0;
      for (const enemy of this.enemyManager.enemies) {
        if (!enemy?.active) {
          enemyIndex += 1;
          continue;
        }
        enemyProxies.push({
          ref: enemy,
          index: enemyIndex,
          x: Number(enemy.x) || 0,
          y: Number(enemy.y) || 0,
          radius: this.getCollisionRadius(enemy),
          queryToken: 0
        });
        enemyIndex += 1;
      }
      collisionStats.playerBulletEnemyProxies = bulletProxies.length;
      collisionStats.enemyCollisionProxies = enemyProxies.length;
    });

    measure('collision.player_bullets_enemies.broadphase', () => {
      if (!bulletProxies.length || !enemyProxies.length) return;
      const cellSize = COLLISION_GRID_CELL_SIZE;
      const grid = new Map();
      for (const enemyProxy of enemyProxies) {
        const minCellX = Math.floor((enemyProxy.x - enemyProxy.radius) / cellSize);
        const maxCellX = Math.floor((enemyProxy.x + enemyProxy.radius) / cellSize);
        const minCellY = Math.floor((enemyProxy.y - enemyProxy.radius) / cellSize);
        const maxCellY = Math.floor((enemyProxy.y + enemyProxy.radius) / cellSize);
        for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
          for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
            const key = cellX + cellY * 4096;
            let bucket = grid.get(key);
            if (!bucket) {
              bucket = [];
              grid.set(key, bucket);
            }
            bucket.push(enemyProxy);
          }
        }
      }
      enemyGrid = {
        cellSize,
        grid,
        queryToken: 0
      };
      collisionStats.playerBulletEnemyGridCells = grid.size;
    });

    measure('collision.player_bullets_enemies.hit_test', () => {
      const markCandidateEnemies = (bulletProxy) => {
        if (!enemyGrid?.grid) return 0;
        const { cellSize, grid } = enemyGrid;
        const minCellX = Math.floor((bulletProxy.x - bulletProxy.radius) / cellSize);
        const maxCellX = Math.floor((bulletProxy.x + bulletProxy.radius) / cellSize);
        const minCellY = Math.floor((bulletProxy.y - bulletProxy.radius) / cellSize);
        const maxCellY = Math.floor((bulletProxy.y + bulletProxy.radius) / cellSize);
        const queryToken = (enemyGrid.queryToken += 1);
        let candidateCount = 0;
        for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
          for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
            const bucket = grid.get(cellX + cellY * 4096);
            collisionStats.playerBulletEnemyCandidateCells += 1;
            if (!bucket) continue;
            for (const enemyProxy of bucket) {
              if (enemyProxy.queryToken === queryToken) continue;
              enemyProxy.queryToken = queryToken;
              candidateCount += 1;
            }
          }
        }
        collisionStats.playerBulletEnemyCandidateChecks += candidateCount;
        return queryToken;
      };

      for (const bulletProxy of bulletProxies) {
        const bullet = bulletProxy.ref;
        if (!bullet?.active) continue;
        const queryToken = markCandidateEnemies(bulletProxy);
        for (const enemyProxy of enemyProxies) {
          if (queryToken && enemyProxy.queryToken !== queryToken) continue;
          const enemy = enemyProxy.ref;
          if (!bullet.active) break;
          if (!enemy?.active) continue;
          collisionStats.playerBulletEnemyPairs += 1;
          const radius = bulletProxy.radius + enemyProxy.radius;
          const dx = bulletProxy.x - enemyProxy.x;
          const dy = bulletProxy.y - enemyProxy.y;
          if ((dx * dx + dy * dy) >= radius * radius) continue;
          if (!this.claimPlayerBulletTargetHit(bullet, enemy)) continue;
          collisionStats.playerBulletEnemyHits += 1;
          if (bulletProxy.isPlasmaLance) collisionStats.plasmaLanceHitEvents += 1;
          const distance = Math.hypot(dx, dy);
          const fallbackAngle = Math.atan2(bulletProxy.vy || -1, bulletProxy.vx || 0);
          const impactAngle = distance > 0.25 ? Math.atan2(dy, dx) : fallbackAngle;
          const contactDistance = Math.max(enemyProxy.radius * 0.38, Math.min(enemyProxy.radius * 0.96, distance || enemyProxy.radius * 0.72));
          hitEvents.push({
            bullet,
            enemy,
            bulletProxy,
            impactX: enemyProxy.x + Math.cos(impactAngle) * contactDistance,
            impactY: enemyProxy.y + Math.sin(impactAngle) * contactDistance
          });
          if (bulletProxy.isBomb) break;
          if (!bulletProxy.piercing) this.bulletManager?.deactivateBullet?.(bullet, 'player_bullet_enemy_hit');
        }
      }
      collisionStats.playerBulletEnemyHitEvents = hitEvents.length;
    });

    measure('collision.player_bullets_enemies.apply_damage', () => {
      for (const event of hitEvents) {
        const { bullet, enemy, bulletProxy } = event;
        if (!enemy?.active) continue;
        if (bulletProxy.isBomb) {
          this.detonateBombBullet(bullet, 'impact');
          continue;
        }
        this.recordCombatProjectileHit(bullet);
        const destroyed = this.applyCombatDamage(enemy, bulletProxy.damage, getCombatDamageSourceForBullet(bullet), {
          impactX: event.impactX,
          impactY: event.impactY
        });
        this.refreshComboFromBossPressure(enemy);
        event.destroyed = destroyed;
        this.triggerChainLightning(enemy, bulletProxy.damage);
        this.applyShipTraitBulletImpact(bullet, enemy);
      }
    });

    measure('collision.player_bullets_enemies.kill_marking', () => {
      for (const event of hitEvents) {
        const { enemy, destroyed, bulletProxy } = event;
        if (event.bulletProxy?.isBomb) continue;
        const frequentMultiHit = Boolean(bulletProxy?.isPlasmaLance || bulletProxy?.piercing);
        if (destroyed) {
          collisionStats.playerBulletEnemyKills += 1;
          if (bulletProxy?.isPlasmaLance) collisionStats.plasmaLanceKills += 1;
          if (!this.player.isSlowTimeActive?.()) {
            const scoreAwarded = this.getNormalWaveScoreAward(this.getComboScore(enemy.scoreValue), enemy);
            const appliedScore = this.game.addScore(scoreAwarded);
            this.queueCollisionSideEffect(sideEffects, 'scorePopups', {
              x: enemy.x,
              y: enemy.y,
              score: appliedScore,
              options: { comboEligible: true }
            });
          }
          measure('collision.progression_hooks.enemy_killed', () => this.onEnemyKilled(enemy, { sideEffects }));
          this.queueCollisionSideEffect(sideEffects, 'deathFeedback', {
            enemy,
            options: {
              volume: frequentMultiHit ? 0.38 : 0.5,
              intensity: frequentMultiHit ? 0.56 : undefined,
              sfx: frequentMultiHit ? false : undefined
            }
          });
          this.queueCollisionSideEffect(sideEffects, 'screenShakes', {
            intensity: frequentMultiHit ? 1.5 : 3
          });
          this.queueCollisionSideEffect(sideEffects, 'powerupSpawns', {
            x: enemy.x,
            y: enemy.y
          });
        } else {
          collisionStats.playerBulletEnemyDamageOnly += 1;
          this.queueCollisionSideEffect(sideEffects, 'hitSparks', {
            x: event.impactX ?? enemy.x,
            y: event.impactY ?? enemy.y,
            color: enemy.visualVariant?.accent || enemy.color || 0x66f7ff,
            intensity: frequentMultiHit ? 0.6 : undefined
          });
          this.queueCollisionSideEffect(sideEffects, 'audio', {
            sfx: 'hit',
            options: {
              volume: frequentMultiHit ? 0.26 : 0.4,
              minIntervalMs: frequentMultiHit ? 75 : undefined
            }
          });
        }
      }
    });

    measure('collision.player_bullets_enemies.cleanup', () => {
      bulletProxies = null;
      enemyProxies = null;
      enemyGrid = null;
      hitEvents = null;
    });
    });

    // Player bullets vs hijacker
    measure('collision.player_bullets_hijacker', () => {
    if (this.enemyManager.hijacker && this.enemyManager.hijacker.active) {
      this.bulletManager.playerBullets.forEach(bullet => {
        if (bullet.active) {
          const hijacker = this.enemyManager.hijacker;
          collisionStats.playerBulletHijackerPairs += 1;
          if (this.checkCollision(bullet, hijacker)) {
            if (!this.claimPlayerBulletTargetHit(bullet, hijacker)) return;
            collisionStats.playerBulletHijackerHits += 1;
            if (bullet.isBomb) {
              this.detonateBombBullet(bullet, 'hijacker_impact');
              return;
            }
            if (!bullet.piercing) this.bulletManager?.deactivateBullet?.(bullet, 'player_bullet_hijacker_hit');
            this.recordCombatProjectileHit(bullet);
            const destroyed = this.applyCombatDamage(hijacker, bullet.damage, getCombatDamageSourceForBullet(bullet));
            this.triggerChainLightning(hijacker, bullet.damage);

            if (destroyed) {
              // Hijacker explosion
              this.particleManager.createExplosion(hijacker.x, hijacker.y, 0xff4444);
              AudioManager.playSfx('enemy_explode', { volume: 0.5 });
              this.screenShake.shake(5);
              this.onEnemyKilled(hijacker);
              // Score already added in hijacker.destroy()
            } else {
              this.particleManager.createHitSpark(hijacker.x, hijacker.y);
              AudioManager.playSfx('hit', { volume: 0.4 });
            }
          }
        }
      });
    }
    });

    // Point Defense autonomously intercepts hostile shots inside its ring.
    // Graze Break remains a deliberate player-bullet collision.
    measure('collision.projectile_defense', () => {
    const hasGrazeBreaker = this.bulletManager.playerBullets.some(playerBullet =>
      playerBullet?.active !== false && playerBullet.isGrazeBreaker
    );
    const pointDefenseActive = this.player.pointDefenseActive && !this.player.isPowerupSuppressed?.();
    if (pointDefenseActive) {
      this.interceptPointDefenseBullets(collisionStats);
    }
    if (hasGrazeBreaker) {
      this.bulletManager.playerBullets.forEach(playerBullet => {
        if (!playerBullet.active || !playerBullet.isGrazeBreaker) return;

        this.bulletManager.enemyBullets.forEach(enemyBullet => {
          if (!enemyBullet.active) return;
          collisionStats.projectileDefensePairs += 1;

          // Check collision between player bullet and enemy bullet
          const dx = playerBullet.x - enemyBullet.x;
          const dy = playerBullet.y - enemyBullet.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitRadius = (playerBullet.radius || 4) + (enemyBullet.radius || 6);

          if (dist < hitRadius) {
            collisionStats.projectileDefenseHits += 1;
            this.triggerGrazeBreak(playerBullet, enemyBullet);
          }
        });
      });
    }
    });

    // Enemy bullets vs player
    measure('collision.enemy_bullets_player', () => {
    this.bulletManager.enemyBullets.forEach(bullet => {
      if (bullet.active && this.player.active) {
        collisionStats.enemyBulletPlayerChecks += 1;
        const dx = bullet.x - this.player.x;
        const dy = bullet.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nearThreshold = (this.player.radius || 12) + (bullet.radius || 6) + 12;
        if (!bullet.nearMissed && dist < nearThreshold && dist > (this.player.radius || 12)) {
          bullet.nearMissed = true;
          collisionStats.enemyBulletPlayerNearMisses += 1;
          this.applyNearMiss(bullet);
        }
        if (this.checkCollision(bullet, this.player)) {
          collisionStats.enemyBulletPlayerHits += 1;
          // Feature: Ghost Ship prevents hit
          if (this.player.isGhostActive?.()) return;

          this.bulletManager?.deactivateBullet?.(bullet, 'enemy_bullet_player_hit');
          if (this.isBossOwnedBullet(bullet)) {
            this.handleBossCausedPlayerHit('boss_bullet', this.enemyManager?.boss, {
              balanceSource: `boss_bullet:${bullet.sourceFireStyle || bullet.weaponProfileId || 'unknown'}`,
              shieldShake: 4,
              sourceX: bullet.x,
              sourceY: bullet.y
            });
            return;
          }

          if (!this.player.invulnerable) {
            const damageTaken = this.player.takeDamage();
            if (damageTaken) {
              this.triggerPlayerDamageDirectionCue({
                source: 'enemy_bullet',
                sourceX: bullet.x,
                sourceY: bullet.y,
                color: bullet.visualConfig?.color || bullet.color || 0xff6677
              });
              this.recordBalanceDamage('enemy_bullet');
              this.lastHitAt = Date.now();
              this.game.loseLife({ source: 'enemy_bullet' });
              this.triggerPlayerDeathFeedback();
            } else {
              // Shield absorbed it
              this.screenShake.shake(3);
              this.particleManager.createHitSpark(this.player.x, this.player.y);
            }
          }
        }
      }
    });
    });

    // Ambient bonus drones and collectible power cores
    measure('collision.ambient_drones_player', () => {
    this.ambientBonusDrones.forEach(bonusDrone => {
      if (bonusDrone.active && this.player.active) {
        collisionStats.ambientDronePlayerChecks += 1;
        if (this.checkCollision(bonusDrone, this.player)) {
          collisionStats.ambientDronePlayerHits += 1;
          if (bonusDrone.type === 'POWERUP') {
            // Collect!
            this.recordBalancePickup({ type: 'bonus_core' });
            bonusDrone.collect(this.player, this);
            this.hasActiveBonusCore = false; // Reset spawn flag
          } else {
            // HAZARD
            // Feature: Ghost Ship prevents hit
            if (this.player.isGhostActive?.()) return;

            // FATAL COLLISION
            bonusDrone.active = false;

            if (!this.player.invulnerable) {
              const damageTaken = this.player.takeDamage();
              if (damageTaken) {
                this.triggerPlayerDamageDirectionCue({
                  source: 'ambient_hazard_contact',
                  sourceX: bonusDrone.x,
                  sourceY: bonusDrone.y,
                  color: 0xffaa00
                });
                this.recordBalanceDamage('ambient_hazard_contact');
                this.lastHitAt = Date.now();
                this.game.loseLife({ source: 'ambient_hazard_contact' });
                this.triggerPlayerDeathFeedback();
              } else {
                this.screenShake.shake(3);
                this.particleManager.createHitSpark(this.player.x, this.player.y);
              }
            }
            this.particleManager.createExplosion(bonusDrone.x, bonusDrone.y, 0xffaa00);
            this.showToast('OUCH!', { fontSize: 20, fill: '#ff0000' });
          }
        }
      }
    });
    });

    // Player bullets vs ambient hazard drones
    measure('collision.player_bullets_ambient_drones', () => {
    this.bulletManager.playerBullets.forEach(bullet => {
      if (bullet.active) {
        this.ambientBonusDrones.forEach(bonusDrone => {
          // Only damage hazard drones, not collectible power cores.
          if (bonusDrone.active && bonusDrone.type === 'HAZARD') collisionStats.playerBulletAmbientPairs += 1;
          if (bonusDrone.active && bonusDrone.type === 'HAZARD' && this.checkCollision(bullet, bonusDrone)) {
            if (!this.claimPlayerBulletTargetHit(bullet, bonusDrone)) return;
            collisionStats.playerBulletAmbientHits += 1;
            if (!bullet.piercing) this.bulletManager?.deactivateBullet?.(bullet, 'player_bullet_ambient_hit');
            this.recordCombatProjectileHit(bullet);
            const destroyed = this.applyCombatDamage(bonusDrone, bullet.damage || 1, getCombatDamageSourceForBullet(bullet));
            if (destroyed) {
              collisionStats.playerBulletAmbientKills += 1;
              let appliedScore = 0;
              if (!this.player.isSlowTimeActive?.()) {
                appliedScore = this.game.addScore(this.getComboScore(500));
                if (!this.queueCollisionSideEffect(sideEffects, 'scorePopups', {
                  x: bonusDrone.x,
                  y: bonusDrone.y,
                  score: appliedScore,
                  options: {
                    comboEligible: false,
                    color: 0xffef7e,
                    prefix: translateText('BONUS')
                  }
                })) {
                  this.scorePopupManager?.addScorePopup?.(bonusDrone.x, bonusDrone.y, appliedScore, {
                    comboEligible: false,
                    color: 0xffef7e,
                    prefix: translateText('BONUS')
                  });
                }
              }
              this.onEnemyKilled(bonusDrone);
              this.particleManager.createExplosion(bonusDrone.x, bonusDrone.y, 0xffaa00);
              AudioManager.playSfx('enemy_explode', { volume: 0.5 });
              if (!this.queueCollisionSideEffect(sideEffects, 'toasts', {
                message: translateText('BONUS DRONE DOWN!'),
                options: { fontSize: 18, y: bonusDrone.y, fill: '#ffff00' }
              })) {
                this.showToast(translateText('BONUS DRONE DOWN!'), { fontSize: 18, y: bonusDrone.y, fill: '#ffff00' });
              }
            } else {
              this.particleManager.createHitSpark(bonusDrone.x, bonusDrone.y);
            }
          }
        });
      }
    });
    });

    // Enemies vs player
    measure('collision.enemies_player', () => {
    this.enemyManager.enemies.forEach(enemy => {
      if (enemy.active && this.player.active) {
        if (enemy.challengeFlightTarget) return;
        collisionStats.enemyPlayerChecks += 1;
        if (this.tryApplyEnemyShipGraze(enemy)) {
          collisionStats.enemyPlayerShipGrazes = (collisionStats.enemyPlayerShipGrazes || 0) + 1;
        }
        if (this.checkCollision(enemy, this.player)) {
          collisionStats.enemyPlayerHits += 1;
          // Feature: Ghost Ship prevents hit
          if (this.player.isGhostActive?.()) return;

          const isBossContact = enemy.kind === 'boss';
          if (isBossContact) {
            this.handleBossCausedPlayerHit('boss_contact', enemy, {
              balanceSource: 'boss_contact',
              shieldShake: 4
            });
            return;
          }

          if (enemy.kind === 'boss_fuel_ship') {
            enemy.active = false;
            if (!this.enemyManager?.deactivateEnemyVisual?.(enemy, 'player_intercept') && enemy.sprite) {
              enemy.sprite.visible = false;
              enemy.sprite.renderable = false;
            }
            this.particleManager.createExplosion(enemy.x, enemy.y, 0x78ff9a);
            AudioManager.playSfx('nova_fuel_ship_pop', { volume: 0.7, minIntervalMs: 120 });
            this.showToast?.(translateText('FUEL SHIP INTERCEPTED'), {
              fontSize: 18,
              y: Math.max(92, enemy.y - 8),
              fill: '#bfffd0',
              duration: 900
            });
            return;
          }

          enemy.active = false;
          if (!this.enemyManager?.deactivateEnemyVisual?.(enemy, 'player_contact') && enemy.sprite) {
            enemy.sprite.visible = false;
            enemy.sprite.renderable = false;
          }
          if (!this.player.invulnerable) {
            const damageTaken = this.player.takeDamage();
            if (damageTaken) {
              this.triggerPlayerDamageDirectionCue({
                source: 'enemy_contact',
                sourceX: enemy.x,
                sourceY: enemy.y,
                color: enemy.color || enemy.visualVariant?.accent || 0xff6677
              });
              this.recordBalanceDamage('enemy_contact');
              this.lastHitAt = Date.now();
              this.game.loseLife({ source: 'enemy_contact' });
              this.triggerPlayerDeathFeedback();
            } else {
              this.screenShake.shake(3);
              this.particleManager.createHitSpark(this.player.x, this.player.y);
            }
          }
          this.particleManager.createExplosion(enemy.x, enemy.y, enemy.color);
        }
      }
    });
    });

    // Powerups vs player
    measure('collision.powerups_player', () => {
    this.powerupManager.powerups.forEach(powerup => {
      if (powerup.active && this.player.active) {
        collisionStats.powerupPlayerChecks += 1;
        if (this.checkCollision(powerup, this.player)) {
          collisionStats.powerupPickups += 1;
          this.recordBalancePickup(powerup);
          powerup.collect(this.player, this);
          if (powerup.type !== 'nova_miracle') {
            AudioManager.playSfx('powerup_pickup', { volume: 0.35, minIntervalMs: 120 });
          }
          const pickupColor = this.player?.synergyState?.type === 'cash_vacuum' ? 0xffff00 : powerup.color;
          this.particleManager.createPickupEffect(powerup.x, powerup.y, pickupColor);
          this.triggerPowerupPickupJuice(powerup);
          // CRITICAL: Ensure player visibility after powerup pickup
          this.player.ensureRenderable('afterPowerupPickup');
        }
      }
    });
    });

    measure('collision.side_effects.total', () => {
      this.processCollisionSideEffects(sideEffects, collisionStats, measure);
    });
    } finally {
      this.isCollisionHotPathActive = false;
    }
  }

  updatePlayerMetrics(delta) {
    if (!this.playerMetrics) {
      this.playerMetrics = {
        totalX: 0,
        samples: 0,
        bottomTime: 0,
        totalTime: 0,
        sampleTimer: 0
      };
    }

    const metrics = this.playerMetrics;
    const width = this.gameplayGame.getWidth();
    const height = this.gameplayGame.getHeight();

    // Sample every 1s (60 frames approx) to save perf, or just run lightly every frame
    // Let's sample continuously but aggregate
    metrics.sampleTimer += delta;
    if (metrics.sampleTimer >= 60) { // Approx 1 sec
      metrics.sampleTimer = 0;
      metrics.samples++;
      metrics.totalX += this.player.x;

      // Bottom 25% check
      if (this.player.y > height * 0.75) {
        metrics.bottomTime++;
      }

      metrics.totalTime++;

      // Pass simple derived metrics to enemy manager
      const avgX = metrics.totalX / metrics.samples;
      const bottomRatio = metrics.bottomTime / Math.max(1, metrics.totalTime);

      // Normalize X (-1 left, 0 center, 1 right)
      const normalizedX = (avgX - width / 2) / (width / 2);

      this.enemyManager.updateAdaptation({
        avgX: normalizedX,
        bottomRatio: bottomRatio
      });
    }
  }

  checkCollision(a, b) {
    if (!this._uiCollisionWarned) {
      const nameA = a?.label || a?.sprite?.label;
      const nameB = b?.label || b?.sprite?.label;
      if ((nameA && nameA.startsWith('ui_')) || (nameB && nameB.startsWith('ui_'))) {
        console.warn('[UI] ERROR poster reached collision loop');
        this._uiCollisionWarned = true;
      }
    }
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = this.getCollisionRadius(a) + this.getCollisionRadius(b);
    return distance < minDistance;
  }

  claimPlayerBulletTargetHit(bullet, target) {
    return claimPiercingTargetHit(bullet, target);
  }

  recordCombatProjectileHit(bullet) {
    return recordCombatProjectileHit(this.combatTelemetry, bullet);
  }

  recordCombatVolley(bullets = []) {
    return recordCombatVolley(this.combatTelemetry, bullets);
  }

  applyCombatDamage(target, amount, sourceId = 'other', options = undefined) {
    if (!target || typeof target.takeDamage !== 'function') return false;
    const requestedDamage = Math.max(0, Number(amount) || 0);
    const healthBefore = Number(target.health ?? target.hp);
    const damageOptions = target.kind === 'hijacker'
      ? { ...(options && typeof options === 'object' ? options : {}), sourceId }
      : options;
    const destroyed = target.takeDamage(requestedDamage, damageOptions);
    const healthAfter = Number(target.health ?? target.hp);
    let effectiveDamage = 0;
    if (Number.isFinite(healthBefore) && Number.isFinite(healthAfter)) {
      effectiveDamage = Math.max(0, healthBefore - Math.max(0, healthAfter));
    } else if (destroyed === true) {
      effectiveDamage = requestedDamage;
    }
    recordCombatDamage(this.combatTelemetry, {
      sourceId,
      amount: effectiveDamage,
      elapsedSeconds: this.gameTime
    });
    return destroyed;
  }

  getCombatTelemetrySummary() {
    return getCombatTelemetrySummary(this.combatTelemetry, this.gameTime);
  }

  // TASK D: Procedural starfield background with parallax layers
  createStarfield() {
    const width = this.gameplayGame?.getWidth?.() || this.game?.getGameplayWidth?.() || this.game.app.screen.width;
    const height = this.gameplayGame?.getHeight?.() || this.game?.getGameplayHeight?.() || this.game.app.screen.height;

    // Create container for starfield (behind everything)
    this.starfieldContainer = new PIXI.Container();
    this.starfieldContainer.zIndex = -1000;
    this.gameContainer.addChild(this.starfieldContainer);
    this.gameContainer.sortableChildren = true;
    this.initGameplayBackdrop(width, height);

    // Layered travel field: quiet depth at the horizon, obvious velocity near the pilot.
    this.starLayers = [];
    this.cosmicTravelLayers = [];
    this.cosmicAuroraBands = [];
    this.cosmicTravelElapsed = 0;

    // Layer 1: Far stars (small, slow, many)
    const farStars = [];
    for (let i = 0; i < 140; i++) {
      const star = new PIXI.Graphics();
      star.circle(0, 0, 0.7 + Math.random() * 0.35); // 0.7-1.05 px
      star.fill({ color: 0x8fb9e6, alpha: 0.16 + Math.random() * 0.18 }); // keep white reserved for threats
      star.x = Math.random() * width;
      star.y = Math.random() * height;
      star._speed = 28 + Math.random() * 18;
      star._drift = -3 + Math.random() * 6;
      this.starfieldContainer.addChild(star);
      farStars.push(star);
    }
    this.starLayers.push(farStars);

    // Layer 2: Mid stars (medium, medium speed)
    const midStars = [];
    for (let i = 0; i < 70; i++) {
      const star = new PIXI.Graphics();
      star.circle(0, 0, 0.95 + Math.random() * 0.45); // 0.95-1.4 px
      star.fill({ color: 0xa6d7ff, alpha: 0.2 + Math.random() * 0.2 });
      star.x = Math.random() * width;
      star.y = Math.random() * height;
      star._speed = 70 + Math.random() * 45;
      star._drift = -7 + Math.random() * 14;
      this.starfieldContainer.addChild(star);
      midStars.push(star);
    }
    this.starLayers.push(midStars);

    // Layer 3: Near stars (larger, fast, fewer)
    const nearStars = [];
    for (let i = 0; i < 34; i++) {
      const star = new PIXI.Graphics();
      const length = 3 + Math.random() * 8;
      star.roundRect(-0.65, -length * 0.5, 1.3, length, 0.7);
      star.fill({ color: Math.random() > 0.25 ? 0x9fe9ff : 0xd59cff, alpha: 0.2 + Math.random() * 0.23 });
      star.x = Math.random() * width;
      star.y = Math.random() * height;
      star._speed = 170 + Math.random() * 90;
      star._drift = -12 + Math.random() * 24;
      this.starfieldContainer.addChild(star);
      nearStars.push(star);
    }
    this.starLayers.push(nearStars);

    const travelDust = [];
    for (let i = 0; i < 46; i++) {
      const mote = new PIXI.Graphics();
      const radius = 0.8 + Math.random() * 1.25;
      mote.circle(0, 0, radius * 2.2);
      mote.fill({ color: Math.random() > 0.5 ? 0x36dfff : 0xae6cff, alpha: 0.025 + Math.random() * 0.035 });
      mote.circle(0, 0, radius);
      mote.fill({ color: Math.random() > 0.35 ? 0x72e9ff : 0xff78dc, alpha: 0.13 + Math.random() * 0.15 });
      mote.x = Math.random() * width;
      mote.y = Math.random() * height;
      mote._speed = 115 + Math.random() * 130;
      mote._drift = -28 + Math.random() * 56;
      mote._phase = Math.random() * Math.PI * 2;
      this.starfieldContainer.addChild(mote);
      travelDust.push(mote);
    }
    this.cosmicTravelLayers.push(travelDust);

    const warpStreaks = [];
    for (let i = 0; i < 18; i++) {
      const streak = new PIXI.Graphics();
      const length = 12 + Math.random() * 28;
      streak.roundRect(-0.7, -length * 0.5, 1.4, length, 0.7);
      streak.fill({ color: i % 4 === 0 ? 0xcc75ff : 0x4ce9ff, alpha: 0.1 + Math.random() * 0.12 });
      streak.circle(0, length * 0.48, 1.25);
      streak.fill({ color: 0xdaf9ff, alpha: 0.18 });
      streak.x = Math.random() * width;
      streak.y = Math.random() * height;
      streak._speed = 300 + Math.random() * 210;
      streak._drift = -38 + Math.random() * 76;
      streak._phase = Math.random() * Math.PI * 2;
      this.starfieldContainer.addChild(streak);
      warpStreaks.push(streak);
    }
    this.cosmicTravelLayers.push(warpStreaks);

    // Optional: Add subtle nebula haze
    const nebula = new PIXI.Graphics();
    nebula.circle(width * 0.3, height * 0.2, 150);
    nebula.fill({ color: 0x4444ff, alpha: 0.03 });
    nebula.circle(width * 0.7, height * 0.6, 200);
    nebula.fill({ color: 0xff4488, alpha: 0.02 });
    this.starfieldContainer.addChildAt(nebula, 0); // Behind stars

    const auroraPalette = [0x26e6ff, 0xa85cff, 0xff4fc8];
    for (let i = 0; i < 3; i++) {
      const band = new PIXI.Graphics();
      band.moveTo(-width * 0.12, 0);
      band.bezierCurveTo(width * 0.22, -70 - i * 18, width * 0.58, 78 + i * 24, width * 1.12, -12);
      band.stroke({ color: auroraPalette[i], width: 28 + i * 17, alpha: 0.018 + i * 0.007 });
      band.x = 0;
      band.y = height * (0.2 + i * 0.26);
      band._phase = i * 2.1;
      band._baseY = band.y;
      this.starfieldContainer.addChildAt(band, Math.min(4, this.starfieldContainer.children.length));
      this.cosmicAuroraBands.push(band);
    }
  }

  async initGameplayBackdrop(width, height) {
    if (getNovaPerformanceFlags().disableDecorativeBackgrounds) return;
    const baseBackdrop = AssetManifest.generated?.gameplayArenaBackdrop || AssetManifest.generated?.menuBackdrop;
    if (!baseBackdrop) return;

    const generation = ++this.gameplayBackdropLoadGeneration;
    const targetContainer = this.starfieldContainer;
    const loadTexture = (alias, src) => src
      ? PIXI.Assets.load({ alias, src })
      : Promise.resolve(null);

    try {
      const [texture, stormTexture, bossTexture] = await Promise.all([
        loadTexture('generated_gameplay_backdrop', baseBackdrop),
        loadTexture('generated_storm_gameplay_backdrop', AssetManifest.generated.stormGameplayBackdrop),
        loadTexture('generated_boss_gameplay_backdrop', AssetManifest.generated.bossArenaBackdrop)
      ]);
      await Promise.all([
        texture ? this.prepareTextureForRender(texture, 'generated_gameplay_backdrop') : null,
        stormTexture ? this.prepareTextureForRender(stormTexture, 'generated_storm_gameplay_backdrop') : null,
        bossTexture ? this.prepareTextureForRender(bossTexture, 'generated_boss_gameplay_backdrop') : null
      ]);
      if (
        generation !== this.gameplayBackdropLoadGeneration
        || targetContainer !== this.starfieldContainer
        || !targetContainer?.parent
      ) return;

      const backdrop = new PIXI.Sprite(texture);
      backdrop.anchor.set(0.5);
      backdrop.label = 'gameplayBackdrop';

      let stormBackdrop = null;
      if (stormTexture) {
        stormBackdrop = new PIXI.Sprite(stormTexture);
        stormBackdrop.anchor.set(0.5);
        stormBackdrop.label = 'gameplayStormBackdrop';
      }
      let bossBackdrop = null;
      if (bossTexture) {
        bossBackdrop = new PIXI.Sprite(bossTexture);
        bossBackdrop.anchor.set(0.5);
        bossBackdrop.label = 'gameplayBossBackdrop';
      }

      const shade = new PIXI.Graphics();
      shade.label = 'gameplayBackdropShade';
      shade.rect(0, 0, width, height);
      shade.fill({ color: 0x020713, alpha: 1 });

      this.gameplayBackdrop = backdrop;
      this.gameplayStormBackdrop = stormBackdrop;
      this.gameplayBossBackdrop = bossBackdrop;
      this.gameplayBackdropShade = shade;
      this.gameplayBackdropWidth = width;
      this.gameplayBackdropHeight = height;
      targetContainer.addChildAt(backdrop, 0);
      if (stormBackdrop) targetContainer.addChildAt(stormBackdrop, 1);
      if (bossBackdrop) targetContainer.addChildAt(bossBackdrop, stormBackdrop ? 2 : 1);
      targetContainer.addChildAt(shade, (stormBackdrop ? 1 : 0) + (bossBackdrop ? 1 : 0) + 1);
      const mode = resolveGameplayBackdropMode(this.game?.level || 1, {
        enemyState: this.enemyManager?.state,
        bossActive: this.enemyManager?.boss?.active
      });
      this.setGameplayBackdropMode(mode, { immediate: true });
      this.updateGameplayBackdrop(0);
    } catch (error) {
      console.warn('[PlayScene] Generated gameplay backdrop failed to load:', error);
    }
  }

  async loadBossDossierTexture() {
    if (!AssetManifest.generated?.bossDossier) return;
    try {
      const texture = await PIXI.Assets.load({
        alias: 'generated_boss_dossier',
        src: AssetManifest.generated.bossDossier
      });
      if (GameAssets.isValidTexture(texture)) {
        this.bossDossierTexture = texture;
      }
    } catch (error) {
      console.warn('[PlayScene] Boss dossier art failed to load:', error);
    }
  }

  async loadBossWarningTextures() {
    const emblemSources = AssetManifest.generated?.vfx?.bossWarningEmblems || [];
    const bossSources = AssetManifest.generated?.bosses || [];
    const warmupSources = emblemSources.slice(0, Math.min(12, emblemSources.length));
    const bossWarmupSources = bossSources.slice(0, Math.min(12, bossSources.length));
    const loadList = async (sources, aliasPrefix) => Promise.all(sources.map(async (src, index) => {
      try {
        await PIXI.Assets.load(src);
        const texture = PIXI.Texture.from(src);
        return GameAssets.isValidTexture(texture) ? texture : null;
      } catch {
        return null;
      }
    }));

    try {
      const [emblems, bosses] = await Promise.all([
        loadList(warmupSources, 'generated_boss_warning_emblem'),
        loadList(bossWarmupSources, 'generated_boss_warning_boss')
      ]);
      this.bossWarningEmblemTextures = emblems;
      this.bossWarningBossTextures = bosses;
      this.bossWarningArtTextures = [];
    } catch (error) {
      console.warn('[PlayScene] Boss warning art failed to load:', error);
    }
  }

  async loadOverrunSealTexture() {
    const src = AssetManifest.generated?.vfx?.overrunVictorySeal;
    if (!src) return;
    try {
      const texture = await PIXI.Assets.load({
        alias: 'generated_overrun_victory_seal',
        src
      });
      if (GameAssets.isValidTexture(texture)) {
        this.overrunSealTexture = texture;
      }
    } catch (error) {
      console.warn('[PlayScene] Overrun victory seal art failed to load:', error);
    }
  }

  resetGameplayBackdropState() {
    this.gameplayBackdropLoadGeneration += 1;
    this.gameplayBackdrop = null;
    this.gameplayStormBackdrop = null;
    this.gameplayBossBackdrop = null;
    this.gameplayBackdropShade = null;
    this.gameplayBackdropMode = 'base';
    this.gameplayBackdropTransition = null;
    this.gameplayBackdropElapsedMs = 0;
    this.gameplayBackdropWidth = 0;
    this.gameplayBackdropHeight = 0;
    this.gameplayBackdropReducedMotion = Boolean(getAccessibilitySettings().prefersReducedMotion);
  }

  applyGameplayBackdropAlphas(alphas = getGameplayBackdropProfile(this.gameplayBackdropMode).alphas) {
    if (this.gameplayBackdrop) {
      this.gameplayBackdrop.alpha = alphas.base;
      this.gameplayBackdrop.renderable = alphas.base > 0.005;
    }
    if (this.gameplayStormBackdrop) {
      this.gameplayStormBackdrop.alpha = alphas.storm;
      this.gameplayStormBackdrop.renderable = alphas.storm > 0.005;
    }
    if (this.gameplayBossBackdrop) {
      this.gameplayBossBackdrop.alpha = alphas.boss;
      this.gameplayBossBackdrop.renderable = alphas.boss > 0.005;
    }
    if (this.gameplayBackdropShade) this.gameplayBackdropShade.alpha = alphas.shade;
  }

  setGameplayBackdropMode(mode, { immediate = false, durationMs = 1050 } = {}) {
    const nextMode = getGameplayBackdropProfile(mode) === getGameplayBackdropProfile('base') && mode !== 'base'
      ? 'base'
      : mode;
    if (!immediate && nextMode === this.gameplayBackdropMode && !this.gameplayBackdropTransition) return false;
    const target = getGameplayBackdropProfile(nextMode).alphas;
    const current = {
      base: Number(this.gameplayBackdrop?.alpha ?? target.base),
      storm: Number(this.gameplayStormBackdrop?.alpha ?? target.storm),
      boss: Number(this.gameplayBossBackdrop?.alpha ?? target.boss),
      shade: Number(this.gameplayBackdropShade?.alpha ?? target.shade)
    };
    this.gameplayBackdropMode = nextMode;
    this.layoutGameplayBackdrops();
    if (immediate || this.gameplayBackdropReducedMotion || !this.gameplayBackdrop) {
      this.gameplayBackdropTransition = null;
      this.applyGameplayBackdropAlphas(target);
      return true;
    }
    this.gameplayBackdropTransition = {
      from: current,
      to: target,
      elapsedMs: 0,
      durationMs: Math.max(120, Number(durationMs) || 1050)
    };
    return true;
  }

  applyGameplayBackdropLevel(level = 1) {
    const mode = resolveGameplayBackdropMode(level, {
      enemyState: this.enemyManager?.state,
      bossActive: this.enemyManager?.boss?.active
    });
    if (mode !== this.gameplayBackdropMode) this.setGameplayBackdropMode(mode);
    return mode;
  }

  fitBackdropToScreen(sprite, width, height, mode = this.gameplayBackdropMode) {
    if (!sprite) return;
    const scale = getGameplayBackdropCoverScale({
      textureWidth: sprite.texture?.width || width,
      textureHeight: sprite.texture?.height || height,
      width,
      height,
      mode,
      reducedMotion: this.gameplayBackdropReducedMotion
    });
    sprite.scale.set(scale);
    sprite.position.set(width / 2, height / 2);
  }

  layoutGameplayBackdrops() {
    const width = this.gameplayBackdropWidth || this.gameplayGame?.getWidth?.() || 1920;
    const height = this.gameplayBackdropHeight || this.gameplayGame?.getHeight?.() || 1080;
    this.fitBackdropToScreen(this.gameplayBackdrop, width, height);
    this.fitBackdropToScreen(this.gameplayStormBackdrop, width, height);
    this.fitBackdropToScreen(this.gameplayBossBackdrop, width, height);
  }

  updateGameplayBackdrop(delta = 0) {
    if (!this.gameplayBackdrop) return;
    const deltaMs = Math.max(0, Math.min(100, (Number(delta) || 0) * 16.67));
    this.gameplayBackdropElapsedMs += deltaMs;
    const transition = this.gameplayBackdropTransition;
    if (transition) {
      transition.elapsedMs += deltaMs;
      const progress = Math.min(1, transition.elapsedMs / transition.durationMs);
      const eased = progress * progress * (3 - 2 * progress);
      this.applyGameplayBackdropAlphas({
        base: transition.from.base + (transition.to.base - transition.from.base) * eased,
        storm: transition.from.storm + (transition.to.storm - transition.from.storm) * eased,
        boss: transition.from.boss + (transition.to.boss - transition.from.boss) * eased,
        shade: transition.from.shade + (transition.to.shade - transition.from.shade) * eased
      });
      if (progress >= 1) {
        this.gameplayBackdropTransition = null;
        this.applyGameplayBackdropAlphas(transition.to);
      }
    }

    const motion = sampleGameplayBackdropMotion(this.gameplayBackdropMode, this.gameplayBackdropElapsedMs, {
      reducedMotion: this.gameplayBackdropReducedMotion
    });
    const width = this.gameplayBackdropWidth || this.gameplayGame?.getWidth?.() || 1920;
    const height = this.gameplayBackdropHeight || this.gameplayGame?.getHeight?.() || 1080;
    const layers = [
      [this.gameplayBackdrop, 0.55],
      [this.gameplayStormBackdrop, 0.78],
      [this.gameplayBossBackdrop, 1]
    ];
    for (const [sprite, depth] of layers) {
      if (!sprite) continue;
      sprite.position.set(width / 2 + motion.x * depth, height / 2 + motion.y * depth);
    }
  }

  updateStarfield(delta) {
    if (!this.starLayers || !this.game?.app?.screen) return;

    this.updateGameplayBackdrop(delta);

    const width = this.gameplayGame.getWidth();
    const height = this.gameplayGame.getHeight();
    const dtSec = Math.min(0.05, delta / 60); // Convert to seconds, clamp for safety
    const reducedMotion = Boolean(this.gameplayBackdropReducedMotion);
    const travelScale = reducedMotion ? 0.14 : 1;
    this.cosmicTravelElapsed += dtSec * travelScale;

    // Update all star layers
    this.starLayers.forEach(layer => {
      layer.forEach(star => {
        // Move star downward (forward motion)
        star.y += star._speed * dtSec * travelScale;
        star.x += (star._drift || 0) * dtSec * travelScale;

        // Wrap around when star goes off bottom
        if (star.y > height + 10) {
          star.y = -10;
          star.x = Math.random() * width; // Randomize X for variety
        }
        if (star.x < -12) star.x = width + 12;
        if (star.x > width + 12) star.x = -12;
      });
    });

    this.cosmicTravelLayers.forEach((layer, layerIndex) => {
      layer.forEach(item => {
        item.y += item._speed * dtSec * travelScale;
        item.x += ((item._drift || 0) + Math.sin(this.cosmicTravelElapsed * 1.7 + item._phase) * 8) * dtSec * travelScale;
        if (item.y > height + 50) {
          item.y = -50 - Math.random() * 80;
          item.x = Math.random() * width;
        }
        if (item.x < -60) item.x = width + 60;
        if (item.x > width + 60) item.x = -60;
        item.alpha = reducedMotion ? 0.35 : 0.72 + Math.sin(this.cosmicTravelElapsed * 2.4 + item._phase + layerIndex) * 0.18;
      });
    });

    this.cosmicAuroraBands.forEach((band, index) => {
      const time = this.cosmicTravelElapsed;
      band.y = band._baseY + Math.sin(time * (0.32 + index * 0.05) + band._phase) * (reducedMotion ? 3 : 38 + index * 9);
      band.x = Math.cos(time * 0.21 + band._phase) * (reducedMotion ? 2 : 52);
      band.rotation = Math.sin(time * 0.17 + band._phase) * (reducedMotion ? 0.001 : 0.018);
      band.alpha = reducedMotion ? 0.42 : 0.78 + Math.sin(time * 0.43 + band._phase) * 0.16;
    });
  }

  createUltrawideSideAmbience() {
    if (!this.decorativeOverlay || getNovaPerformanceFlags().disableDecorativeBackgrounds) {
      this.ultrawideAmbienceDebug = { visible: false, disabled: true };
      return null;
    }

    const container = new PIXI.Container();
    container.label = 'ultrawideSideAmbience';
    container.eventMode = 'none';
    container.sortableChildren = true;

    const nebula = new PIXI.Graphics();
    nebula.label = 'ultrawideSideNebula';
    nebula.eventMode = 'none';
    nebula.zIndex = 0;

    const starLayer = new PIXI.Container();
    starLayer.label = 'ultrawideSideStarfield';
    starLayer.eventMode = 'none';
    starLayer.zIndex = 1;

    const frame = new PIXI.Graphics();
    frame.label = 'ultrawideCombatZoneFrame';
    frame.eventMode = 'none';
    frame.zIndex = 2;

    container.addChild(nebula);
    container.addChild(starLayer);
    container.addChild(frame);

    const stars = [];
    const layerConfigs = [
      { count: 52, radius: [0.65, 1.05], speed: [12, 24], alpha: [0.12, 0.24], color: 0x8fb9e6 },
      { count: 34, radius: [0.9, 1.45], speed: [28, 48], alpha: [0.14, 0.28], color: 0xa6d7ff },
      { count: 18, radius: [1.05, 1.85], speed: [54, 86], alpha: [0.16, 0.32], color: 0xb8ddff }
    ];

    for (const config of layerConfigs) {
      for (let i = 0; i < config.count; i += 1) {
        const star = new PIXI.Graphics();
        const radius = config.radius[0] + Math.random() * (config.radius[1] - config.radius[0]);
        star.circle(0, 0, radius);
        star.fill({ color: config.color, alpha: 1 });
        star.eventMode = 'none';
        star._speed = config.speed[0] + Math.random() * (config.speed[1] - config.speed[0]);
        star._baseAlpha = config.alpha[0] + Math.random() * (config.alpha[1] - config.alpha[0]);
        star._phase = Math.random() * Math.PI * 2;
        star._twinkleSpeed = 0.45 + Math.random() * 0.7;
        star._drift = 2 + Math.random() * 4;
        star.alpha = star._baseAlpha;
        starLayer.addChild(star);
        stars.push(star);
      }
    }

    this.ultrawideAmbience = { container, nebula, starLayer, frame, stars, layout: null };
    this.decorativeOverlay.addChild(container);
    this.syncUltrawideSideAmbienceLayout(this.getActivePlayfieldRect());
    return this.ultrawideAmbience;
  }

  getUltrawideGutterLayout(rect = this.getActivePlayfieldRect()) {
    const viewportWidth = Math.max(1, Number(this.game?.getViewportWidth?.()) || Number(this.game?.app?.screen?.width) || 1920);
    const viewportHeight = Math.max(1, Number(this.game?.getViewportHeight?.()) || Number(this.game?.app?.screen?.height) || 1080);
    const activeX = Math.max(0, Number(rect?.x) || 0);
    const activeY = Math.max(0, Number(rect?.y) || 0);
    const activeWidth = Math.max(1, Number(rect?.width) || viewportWidth);
    const activeHeight = Math.max(1, Number(rect?.height) || viewportHeight);
    const leftGutterWidth = Math.max(0, activeX);
    const rightX = activeX + activeWidth;
    const rightGutterWidth = Math.max(0, viewportWidth - rightX);
    const gutters = [];
    if (leftGutterWidth > 2) gutters.push({ side: 'left', x: 0, width: leftGutterWidth });
    if (rightGutterWidth > 2) gutters.push({ side: 'right', x: rightX, width: rightGutterWidth });
    return {
      viewportWidth,
      viewportHeight,
      activeRect: { x: activeX, y: activeY, width: activeWidth, height: activeHeight },
      leftGutterWidth,
      rightGutterWidth,
      gutters
    };
  }

  drawUltrawideSideAmbience(layout) {
    const ambience = this.ultrawideAmbience;
    if (!ambience || !layout) return;
    const { nebula, frame } = ambience;
    const { activeRect, viewportHeight, gutters } = layout;
    nebula.clear();
    frame.clear();

    for (const gutter of gutters) {
      const edgeX = gutter.side === 'left' ? gutter.x + gutter.width : gutter.x;
      const edgeSign = gutter.side === 'left' ? -1 : 1;
      nebula.rect(gutter.x, 0, gutter.width, viewportHeight);
      nebula.fill({ color: 0x020714, alpha: 0.58 });
      nebula.rect(gutter.x, 0, gutter.width, viewportHeight);
      nebula.fill({ color: 0x09203a, alpha: 0.08 });

      const glowRadius = Math.max(170, Math.min(620, gutter.width * 0.95));
      const glowX = gutter.side === 'left'
        ? gutter.x + gutter.width * 0.58
        : gutter.x + gutter.width * 0.42;
      nebula.circle(glowX, viewportHeight * 0.28, glowRadius);
      nebula.fill({ color: 0x255b88, alpha: 0.035 });
      nebula.circle(glowX + edgeSign * gutter.width * 0.16, viewportHeight * 0.66, glowRadius * 0.78);
      nebula.fill({ color: 0x7b3a82, alpha: 0.022 });

      const bandWidth = Math.max(10, Math.min(42, gutter.width * 0.08));
      for (let i = 0; i < 5; i += 1) {
        const alpha = 0.018 + i * 0.008;
        const x = gutter.side === 'left'
          ? edgeX - bandWidth * (i + 1)
          : edgeX + bandWidth * i;
        nebula.rect(x, 0, bandWidth, viewportHeight);
        nebula.fill({ color: 0x6be8ff, alpha });
      }
    }

    if (gutters.length > 0) {
      frame.rect(activeRect.x + 0.5, activeRect.y + 0.5, Math.max(1, activeRect.width - 1), Math.max(1, activeRect.height - 1));
      frame.stroke({ color: 0x7dffcc, width: 1.5, alpha: 0.14 });
      frame.rect(activeRect.x + 8.5, activeRect.y + 8.5, Math.max(1, activeRect.width - 17), Math.max(1, activeRect.height - 17));
      frame.stroke({ color: 0xffec8a, width: 1, alpha: 0.055 });
    }
  }

  syncUltrawideSideAmbienceLayout(rect = this.getActivePlayfieldRect()) {
    const ambience = this.ultrawideAmbience;
    if (!ambience) {
      this.ultrawideAmbienceDebug = { visible: false, missing: true };
      return null;
    }

    const layout = this.getUltrawideGutterLayout(rect);
    const visible = layout.gutters.length > 0;
    ambience.container.visible = visible;
    ambience.container.renderable = visible;
    ambience.layout = layout;
    this.drawUltrawideSideAmbience(layout);

    for (const star of ambience.stars) {
      if (!visible) {
        star.visible = false;
        continue;
      }
      const wasInGutter = this.isPointInUltrawideGutter(star.x, layout.gutters);
      if (!wasInGutter || !Number.isFinite(star.y)) {
        this.placeUltrawideAmbienceStar(star, layout, true);
      } else {
        star.y = Math.max(-12, Math.min(layout.viewportHeight + 12, star.y));
        star.visible = true;
      }
    }

    this.ultrawideAmbienceDebug = {
      visible,
      decorativeOnly: true,
      eventMode: ambience.container.eventMode,
      decorativeEventMode: this.decorativeOverlay?.eventMode,
      gameContainerMasked: this.gameContainer?.mask === this.gameplayViewportMask,
      viewportWidth: Math.round(layout.viewportWidth),
      viewportHeight: Math.round(layout.viewportHeight),
      activeRect: {
        x: Math.round(layout.activeRect.x),
        y: Math.round(layout.activeRect.y),
        width: Math.round(layout.activeRect.width),
        height: Math.round(layout.activeRect.height)
      },
      leftGutterWidth: Math.round(layout.leftGutterWidth),
      rightGutterWidth: Math.round(layout.rightGutterWidth),
      starCount: visible ? ambience.stars.length : 0,
      gutterStarCount: visible ? ambience.stars.filter((star) => this.isPointInUltrawideGutter(star.x, layout.gutters)).length : 0,
      combatFrameVisible: visible,
      gameplayWidth: this.gameplayGame?.getWidth?.() || null,
      gameplayHeight: this.gameplayGame?.getHeight?.() || null
    };
    return layout;
  }

  isPointInUltrawideGutter(x, gutters = []) {
    return gutters.some((gutter) => x >= gutter.x && x <= gutter.x + gutter.width);
  }

  placeUltrawideAmbienceStar(star, layout, randomY = false) {
    if (!star || !layout?.gutters?.length) return;
    const totalWidth = layout.gutters.reduce((sum, gutter) => sum + gutter.width, 0);
    let pick = Math.random() * Math.max(1, totalWidth);
    let selected = layout.gutters[0];
    for (const gutter of layout.gutters) {
      if (pick <= gutter.width) {
        selected = gutter;
        break;
      }
      pick -= gutter.width;
    }
    star.x = selected.x + Math.random() * selected.width;
    star.y = randomY ? Math.random() * layout.viewportHeight : -10 - Math.random() * 36;
    star.visible = true;
    star.renderable = true;
  }

  updateUltrawideSideAmbience(delta) {
    const ambience = this.ultrawideAmbience;
    const layout = ambience?.layout;
    if (!ambience?.container?.visible || !layout?.gutters?.length) return;
    const dtSec = Math.min(0.05, Math.max(0, delta) / 60);
    for (const star of ambience.stars) {
      star._phase += dtSec * star._twinkleSpeed;
      star.y += star._speed * dtSec;
      star.x += Math.sin(star._phase) * star._drift * dtSec;
      star.alpha = Math.max(0.06, star._baseAlpha * (0.84 + Math.sin(star._phase) * 0.16));
      if (star.y > layout.viewportHeight + 12 || !this.isPointInUltrawideGutter(star.x, layout.gutters)) {
        this.placeUltrawideAmbienceStar(star, layout, false);
      }
    }
  }

  // TASK 4: Play shooting sound with self-healing health check
  playShootSoundWithHealthCheck() {
    const now = Date.now();
    const check = this.shootSoundHealthCheck;
    const sfxKey = this.player?.getShootSfxKey ? this.player.getShootSfxKey() : 'shoot_small';
    const mix = SFX_MIX[sfxKey] || SFX_MIX.shoot_small || {};
    const requestIntervalMs = Math.max(35, Number(mix.minIntervalMs) || 80);
    check.lastSoundKey = sfxKey;
    check.lastRequestIntervalMs = requestIntervalMs;

    // Track shot
    check.shotsFired++;
    check.totalVolleys++;
    check.lastShotTime = now;

    // Respect each weapon's authored cadence so long samples do not stack into fatigue.
    let played = false;
    if (now - check.lastSoundTime >= requestIntervalMs) {
      check.totalRequests++;
      played = AudioManager.playSfx(sfxKey, { pool: true }) === true;
      if (played) {
        check.totalPlayed++;
        check.lastSoundTime = now;
        check.shotsFired = 0;
        check.recoveryAttempts = 0;
        check.recoveredLogged = false;
      } else {
        check.totalSuppressed++;
      }
    }

    const lastManagerSoundTime = AudioManager?.lastSfxPlayedAt?.[sfxKey] || AudioManager?.lastSfxPlayedAt?.shoot_small || 0;
    const recentlyAudible = now - Math.max(check.lastSoundTime, lastManagerSoundTime) <= 500;
    if (recentlyAudible) {
      check.lastSoundTime = Math.max(check.lastSoundTime, lastManagerSoundTime);
      if (played) {
        check.shotsFired = 0;
        check.recoveryAttempts = 0;
        check.recoveredLogged = false;
      }
      return;
    }

    // Fail-safe: if firing but no sound request has landed in >500ms, force recover once.
    if (!played && now - check.lastSoundTime > 500) {
      check.totalRequests++;
      const recovered = AudioManager.playSfx(sfxKey, { force: true, pool: true }) === true;
      if (recovered) check.totalPlayed++;
      else check.totalSuppressed++;
      check.lastSoundTime = now;
      check.shotsFired = 0;
      check.recoveredLogged = true;
      return;
    }

    // Health check: If we've fired 10+ shots with no recent sound
    if (check.shotsFired >= 10) {
      const timeSinceRecovery = now - check.lastRecoveryAttempt;

      // If it's been >5s since last recovery attempt and we're still shooting
      if (timeSinceRecovery > 5000) {
        if (check.recoveryAttempts === 0 && AudioManager?.isVerboseDiagnostics?.()) {
          if (!window._hasLoggedAudioHealthCheck) {
            console.log('[PlayScene] Shooting sound health check: Attempting recovery (first attempt)');
            window._hasLoggedAudioHealthCheck = true;
          }
        }
        check.lastRecoveryAttempt = now;
        check.recoveryAttempts++;

        // Resume AudioContext if suspended
        if (AudioManager?.context) {
          if (AudioManager.context.state === 'suspended') {
            AudioManager.context.resume().catch(() => { });
          }
        }

        // Reset counter after recovery attempt
        check.shotsFired = 0;

        // Rate limit recovery attempts
        if (check.recoveryAttempts > 3) {
          if (AudioManager?.isVerboseDiagnostics?.()) {
            console.warn('[PlayScene] Too many recovery attempts, stopping health check');
          }
          check.shotsFired = -999; // Disable further checks
        }
      }
    }
  }

  destroy() {
    this.flushBalanceDebugSummary('scene_destroy');
    this.flushDeferredHotPathProgress();
    this.flushDeferredRunContractEvents(Number.MAX_SAFE_INTEGER);
    this.flushDeferredRunContractProgress(true);
    this.flushDeferredSeasonProgress(true);
    if (this.deferredThreatDefeats?.length) {
      this.processDeferredThreatDefeats(this.deferredThreatDefeats.length);
    }
    this.performanceDiagnostics?.destroy?.();
    this.performanceDiagnostics = null;
    this.clearCabinetWonder('scene_destroy');
    this.spectacleDirector?.destroy?.();
    this.spectacleDirector = null;
    this.closeSettingsOverlay();
    this.closeHowToPlayOverlay();
    this.destroyPauseOverlay();
    this.clearTacticalDraft('scene_destroy');
    this.resetGameplayBackdropState();
    this.clearRunContractStartNudge();
    this.clearFirstRunOnboardingCompletion();
    this.firstRunOnboardingUntil = 0;
    this.firstRunControlsShownAt = 0;
    this._rankUpAnimating = false;
    this.pendingRankUpPresentation = null;
    this.activeRankUpPresentation = null;
    this.activeWaveBonusEffect = null;
    this.clearChallengeFlightHud('scene_destroy');
    this.clearPendingEnemyStart();
    this.clearSectorArrivalStinger();
    this.clearPickupEffects('scene_destroy');
    this.clearGrazeBreakVisual('scene_destroy');
    this.bulletManager?.clearAll?.('scene_destroy');
    this.clearBossHazards('scene_destroy');
    if (this.bossHazardLayer?.parent) {
      this.bossHazardLayer.parent.removeChild(this.bossHazardLayer);
    }
    this.bossHazardLayer?.destroy?.();
    this.bossHazardLayer = null;
    this.bossHazardLayerHasGeometry = false;
    this.clearBackgroundLevelEntryWarmup();
    this.removeAutoPauseHandlers();
    this.viewportLayoutUnsubscribe?.();
    this.viewportLayoutUnsubscribe = null;
    this.shipIntroToken += 1;
    this.sectorArrivalArtCache?.clear?.();
    this.entryAssetWarmupCache?.clear?.();
    this.preparedRenderTextureKeys?.clear?.();
    this.levelAdvanceWarmupPromise = null;

    if (this.levelAdvanceTimeout) {
      clearTimeout(this.levelAdvanceTimeout);
      this.levelAdvanceTimeout = null;
    }
    if (this._debugKeyHandler) {
      window.removeEventListener('keydown', this._debugKeyHandler);
      this._debugKeyHandler = null;
    }
    if (typeof window !== 'undefined' && window.__novaForceMayhemSuperStorm?.playScene === this) {
      delete window.__novaForceMayhemSuperStorm;
    }
    if (typeof window !== 'undefined' && window.__novaForceSuperExtraLife?.playScene === this) {
      delete window.__novaForceSuperExtraLife;
    }
    if (typeof window !== 'undefined' && window.__novaForceNovaMiracle?.playScene === this) {
      delete window.__novaForceNovaMiracle;
    }
    if (this.inputManager) {
      this.inputManager.destroy();
      this.inputManager = null;
    }
    if (this.touchControls) {
      this.touchControls.destroy();
      this.touchControls = null;
    }
    if (this.hud) {
      this.hud.destroy();
    }
    if (this.scorePopupManager) {
      this.scorePopupManager.cleanup();
    }
    // Clean up magnet field visual
    if (this.magnetFieldVisual) {
      if (this.magnetFieldVisual.parent) {
        this.magnetFieldVisual.parent.removeChild(this.magnetFieldVisual);
      }
      this.magnetFieldVisual.destroy();
      this.magnetFieldVisual = null;
    }
    this.clearStragglerBeacon('destroy');
    if (this.stragglerBeaconLayer?.parent) {
      this.stragglerBeaconLayer.parent.removeChild(this.stragglerBeaconLayer);
    }
    this.stragglerBeaconLayer?.destroy?.();
    this.stragglerBeaconLayer = null;
    // Lifecycle hardening
    if (this._deathTimeouts) {
      this._deathTimeouts.forEach(id => clearTimeout(id));
      this._deathTimeouts = [];
    }
    if (this._activeTickers) {
      this._activeTickers.forEach(fn => this.game.app.ticker.remove(fn));
      this._activeTickers = [];
    }
    if (this.introOverlay?.parent) {
      this.introOverlay.parent.removeChild(this.introOverlay);
    }
    this.introOverlay = null;
    this.introActive = false;
    this.introComplete = false;
    this.removeAchievementToast();
    this.achievementToastQueue = [];
    this.clearGameOverInterlude();
    this.clearOverrunConfirmationHandlers();

    // Music continues to next scene
  }

  clearGameOverInterlude() {
    if (this.gameOverInterlude?.fallbackTimer) {
      clearTimeout(this.gameOverInterlude.fallbackTimer);
      this.gameOverInterlude.fallbackTimer = null;
    }
    if (this.gameOverInterlude?.overlay?.parent) {
      this.gameOverInterlude.overlay.parent.removeChild(this.gameOverInterlude.overlay);
    }
    this.gameOverInterlude = null;
  }

  completeGameOverInterlude() {
    const interlude = this.gameOverInterlude;
    if (!interlude?.active || interlude.completed) return;
    interlude.completed = true;
    const complete = interlude.onComplete;
    this.clearGameOverInterlude();
    complete?.();
  }

  clearDeathMessageClutterForGameOver() {
    this.toastQueue = [];
    this.toastTopQueue = [];
    this.toastCornerQueue = [];
    this.dismissActiveToastSlotsBelowPriority?.(['center', 'top', 'corner'], 99);
    this.lowLivesShownFor = Number(this.game?.lives) || 0;
    this.reserveMessageFocus?.(GAME_OVER_INTERLUDE_MS + 900, {
      priority: 99,
      slots: ['center', 'top', 'corner']
    });
  }

  showGameOverInterlude(onComplete) {
    if (this.gameOverInterlude?.active) return true;
    if (!this.uiOverlay || !this.game?.app?.screen) return false;
    this.clearDeathMessageClutterForGameOver();

    const { width, height } = this.game.app.screen;
    const compact = width < 720;
    const centerX = width / 2;
    const centerY = height * (compact ? 0.43 : 0.42);
    const maxRadius = Math.min(width, height);
    const overlay = new PIXI.Container();
    overlay.label = 'ui_gameOverInterlude';
    overlay.zIndex = 1000002;
    overlay.eventMode = 'none';

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x020711, alpha: 0.72 });
    overlay.addChild(dim);

    const vignette = new PIXI.Graphics();
    vignette.rect(0, 0, width, height);
    vignette.stroke({ color: 0xff315f, width: Math.max(18, maxRadius * 0.035), alpha: 0.22 });
    vignette.rect(14, 14, Math.max(1, width - 28), Math.max(1, height - 28));
    vignette.stroke({ color: 0x37f5ff, width: compact ? 2 : 3, alpha: 0.18 });
    overlay.addChild(vignette);

    const warningBands = [];
    for (let i = 0; i < 3; i += 1) {
      const band = new PIXI.Graphics();
      const y = centerY - (compact ? 66 : 104) + i * (compact ? 66 : 104);
      band.rect(-width * 0.06, y - 1, width * 1.12, compact ? 3 : 5);
      band.fill({ color: i === 1 ? 0xffd15c : 0xff315f, alpha: i === 1 ? 0.55 : 0.38 });
      band.skew.x = -0.1;
      overlay.addChild(band);
      warningBands.push(band);
    }

    const bloom = new PIXI.Graphics();
    bloom.circle(0, 0, maxRadius * 0.23);
    bloom.fill({ color: 0xff315f, alpha: 0.22 });
    bloom.circle(0, 0, maxRadius * 0.13);
    bloom.fill({ color: 0xfff0a4, alpha: 0.18 });
    bloom.position.set(centerX, centerY);
    overlay.addChild(bloom);

    const rays = new PIXI.Graphics();
    for (let i = 0; i < 28; i += 1) {
      const angle = (Math.PI * 2 * i) / 28;
      const inner = maxRadius * (i % 2 === 0 ? 0.12 : 0.17);
      const outer = maxRadius * (i % 2 === 0 ? 0.45 : 0.36);
      rays.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
      rays.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
    }
    rays.stroke({ color: 0xffd15c, width: compact ? 1 : 2, alpha: 0.28 });
    overlay.addChild(rays);

    const shock = new PIXI.Graphics();
    shock.circle(0, 0, Math.min(width, height) * 0.16);
    shock.stroke({ color: 0xffd15c, width: compact ? 5 : 8, alpha: 0.95 });
    shock.circle(0, 0, Math.min(width, height) * 0.25);
    shock.stroke({ color: 0x37f5ff, width: compact ? 3 : 5, alpha: 0.68 });
    shock.circle(0, 0, Math.min(width, height) * 0.34);
    shock.stroke({ color: 0xffffff, width: compact ? 1 : 2, alpha: 0.38 });
    shock.position.set(centerX, centerY);
    overlay.addChild(shock);

    const titlePlate = new PIXI.Graphics();
    const plateW = Math.min(width * 0.9, compact ? 520 : 820);
    const plateH = compact ? 78 : 118;
    titlePlate.roundRect(-plateW / 2, -plateH / 2, plateW, plateH, compact ? 12 : 18);
    titlePlate.fill({ color: 0x030813, alpha: 0.42 });
    titlePlate.stroke({ color: 0xffd15c, width: compact ? 2 : 3, alpha: 0.72 });
    titlePlate.roundRect(-plateW / 2 + 8, -plateH / 2 + 8, plateW - 16, plateH - 16, compact ? 8 : 12);
    titlePlate.stroke({ color: 0x37f5ff, width: compact ? 1 : 2, alpha: 0.4 });
    titlePlate.position.set(centerX, centerY);
    overlay.addChild(titlePlate);

    const label = createText(translateText('GAME OVER'), {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: compact ? 46 : 86,
      fontWeight: '900',
      fill: '#fff3a2',
      stroke: '#240018',
      strokeThickness: compact ? 6 : 9,
      align: 'center',
      letterSpacing: 0,
      dropShadow: true,
      dropShadowColor: '#ff55d9',
      dropShadowBlur: 14
    });
    label.anchor.set(0.5);
    label.position.set(centerX, centerY);
    overlay.addChild(label);

    const scoreValue = Number(this.game?.score || 0).toLocaleString('en-US');
    const scoreLine = translateText(`SCORE: ${scoreValue}`);
    const score = createText(scoreLine, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 19 : 30,
      fontWeight: '900',
      fill: '#9cfbff',
      stroke: '#020711',
      strokeThickness: compact ? 3 : 5,
      align: 'center',
      letterSpacing: 0
    });
    score.anchor.set(0.5);
    score.position.set(width / 2, label.y + (compact ? 56 : 88));
    overlay.addChild(score);

    const embers = [];
    for (let i = 0; i < (compact ? 18 : 34); i += 1) {
      const ember = new PIXI.Graphics();
      const size = compact ? 2 + Math.random() * 3 : 3 + Math.random() * 5;
      ember.circle(0, 0, size);
      ember.fill({ color: i % 3 === 0 ? 0x37f5ff : i % 3 === 1 ? 0xffd15c : 0xffffff, alpha: 0.82 });
      ember.x = centerX + (Math.random() - 0.5) * width * 0.72;
      ember.y = centerY + (Math.random() - 0.5) * height * 0.42;
      ember._vx = (ember.x - centerX) * 0.0025;
      ember._vy = (ember.y - centerY) * 0.0025 - Math.random() * 0.45;
      overlay.addChild(ember);
      embers.push(ember);
    }

    this.uiOverlay.addChild(overlay);
    this.lastHitStopRequestMs = GAME_OVER_INTERLUDE_MS;
    this.freezeTimerMs = Math.max(this.freezeTimerMs || 0, GAME_OVER_INTERLUDE_MS);
    this.screenShake?.shake(compact ? 12 : 20, compact ? 22 : 34);
    this.screenShake?.freezeFrame?.(compact ? 3 : 5);
    const sfxKey = 'nova_game_over_drop';
    this.gameOverInterlude = {
      active: true,
      overlay,
      dim,
      vignette,
      warningBands,
      bloom,
      rays,
      label,
      titlePlate,
      score,
      shock,
      embers,
      sfxKey,
      elapsedMs: 0,
      startedAtMs: Date.now(),
      durationMs: GAME_OVER_INTERLUDE_MS,
      onComplete: typeof onComplete === 'function' ? onComplete : null,
      fallbackTimer: null,
      completed: false
    };
    const interlude = this.gameOverInterlude;
    interlude.fallbackTimer = setTimeout(() => {
      if (this.gameOverInterlude !== interlude || !interlude.active || interlude.completed) return;
      interlude.elapsedMs = Math.max(interlude.durationMs, Date.now() - interlude.startedAtMs);
      this.completeGameOverInterlude();
    }, GAME_OVER_INTERLUDE_MS + 300);
    AudioManager.playSfx('nova_player_hit_crackle', { force: true, volume: 0.52, minIntervalMs: 0 });
    AudioManager.playSfx(sfxKey, { force: true, volume: 1.0, minIntervalMs: 0 });
    return true;
  }

  updateGameOverInterlude(delta) {
    const interlude = this.gameOverInterlude;
    if (!interlude?.active) return;
    const wallElapsedMs = Number.isFinite(interlude.startedAtMs) ? Date.now() - interlude.startedAtMs : 0;
    interlude.elapsedMs = Math.max(interlude.elapsedMs + delta * 16.67, wallElapsedMs);
    const t = Math.max(0, Math.min(1, interlude.elapsedMs / interlude.durationMs));
    const pulse = Math.sin(interlude.elapsedMs * 0.012) * 0.5 + 0.5;
    if (interlude.label) {
      interlude.label.scale.set(0.94 + Math.min(1, t / 0.22) * 0.08 + pulse * 0.035);
      interlude.label.alpha = t < 0.12 ? t / 0.12 : t > 0.86 ? Math.max(0, (1 - t) / 0.14) : 1;
    }
    if (interlude.titlePlate) {
      interlude.titlePlate.scale.set(0.98 + pulse * 0.018, 1 + pulse * 0.035);
      interlude.titlePlate.alpha = t > 0.88 ? Math.max(0, (1 - t) / 0.12) : 1;
    }
    if (interlude.score) {
      interlude.score.alpha = t < 0.18 ? Math.max(0, (t - 0.06) / 0.12) : t > 0.88 ? Math.max(0, (1 - t) / 0.12) : 1;
      interlude.score.y += Math.sin(interlude.elapsedMs * 0.01) * 0.05;
    }
    if (interlude.shock) {
      interlude.shock.rotation += 0.014 * delta;
      interlude.shock.scale.set(0.92 + t * 1.25);
      interlude.shock.alpha = Math.max(0, 0.95 - t * 0.7);
    }
    if (interlude.rays) {
      interlude.rays.rotation += 0.0035 * delta;
      interlude.rays.alpha = Math.max(0, 0.46 - t * 0.3);
    }
    if (interlude.bloom) {
      interlude.bloom.scale.set(0.7 + t * 0.95 + pulse * 0.08);
      interlude.bloom.alpha = Math.max(0.08, 0.72 - t * 0.45);
    }
    if (Array.isArray(interlude.warningBands)) {
      interlude.warningBands.forEach((band, index) => {
        band.x = Math.sin(interlude.elapsedMs * 0.003 + index) * 18;
        band.alpha = 0.18 + pulse * (index === 1 ? 0.42 : 0.24);
      });
    }
    if (Array.isArray(interlude.embers)) {
      interlude.embers.forEach((ember, index) => {
        ember.x += (ember._vx || 0) * delta * 16.67;
        ember.y += (ember._vy || 0) * delta * 16.67;
        ember.alpha = Math.max(0, 0.92 - t * 0.78 + Math.sin(interlude.elapsedMs * 0.02 + index) * 0.08);
        ember.scale.set(1 + pulse * 0.3);
      });
    }
    if (interlude.elapsedMs < interlude.durationMs) return;
    this.completeGameOverInterlude();
  }

  getGameOverInterludeDebugState(getBounds) {
    const interlude = this.gameOverInterlude;
    if (!interlude?.active) {
      return {
        active: false,
        visible: false
      };
    }
    const bounds = typeof getBounds === 'function' ? getBounds(interlude.label) : null;
    return {
      active: true,
      visible: Boolean(interlude.overlay?.parent),
      label: interlude.label?.text || null,
      sfxKey: interlude.sfxKey || null,
      cinematicLayers: [
        interlude.dim,
        interlude.vignette,
        interlude.bloom,
        interlude.rays,
        interlude.titlePlate,
        interlude.shock,
        interlude.score
      ].filter(Boolean).length + (interlude.warningBands?.length || 0) + (interlude.embers?.length || 0),
      elapsedMs: Math.round(interlude.elapsedMs || 0),
      durationMs: Math.round(interlude.durationMs || 0),
      bounds
    };
  }

  getPerfCounts() {
    return {
      bullets: this.bulletManager ? this.bulletManager.getTotalCount() : 0,
      enemies: this.enemyManager ? this.enemyManager.enemies.length : 0,
      particles: this.particleManager ? this.particleManager.particles.length : 0,
      children: this.gameContainer ? this.gameContainer.children.length : 0
    };
  }

  clearStragglerBeacon(reason = 'clear') {
    if (this.stragglerBeaconLayer) {
      this.stragglerBeaconLayer.clear();
      this.stragglerBeaconLayer.visible = false;
      this.stragglerBeaconLayer._debugStragglerBeacon = {
        visible: false,
        reason,
        targetCount: 0,
        pipCount: 0,
        ringCount: 0,
        edgeArrowCount: 0
      };
    }
    this.lastStragglerBeaconDebug = {
      visible: false,
      reason,
      targetCount: 0,
      pipCount: 0,
      ringCount: 0,
      edgeArrowCount: 0
    };
    return this.lastStragglerBeaconDebug;
  }

  isStragglerBeaconTarget(enemy) {
    if (!enemy || enemy.active === false || enemy.destroyed === true || enemy.waitingForEntry) return false;
    if (!Number.isFinite(enemy.x) || !Number.isFinite(enemy.y)) return false;
    const kind = enemy.kind || 'enemy';
    if (kind === 'boss' || kind === 'boss_fuel_ship' || kind === 'bonus_drone') return false;
    return true;
  }

  updateStragglerBeacon(delta = 1) {
    const layer = this.stragglerBeaconLayer;
    const manager = this.enemyManager;
    if (!layer || !manager) return this.clearStragglerBeacon('missing_layer_or_manager');
    if (this.isPaused || this.introActive || this.gameOverSequenceStarted || this.gameOverInterlude?.active || this.overrunMilestoneInterlude?.active) {
      return this.clearStragglerBeacon('inactive_scene_state');
    }
    if (this.sectorArrivalStinger?.container?.parent) {
      return this.clearStragglerBeacon('sector_stinger');
    }
    const state = manager.state || 'IDLE';
    const phase = manager.phase || 'WAVES';
    if (phase === 'BOSS' || state === 'BOSS_ACTIVE' || state === 'BOSS_GATE' || state === 'LEVEL_COMPLETE') {
      return this.clearStragglerBeacon('boss_or_clear_state');
    }

    const targets = (manager.enemies || []).filter(enemy => this.isStragglerBeaconTarget(enemy));
    if (targets.length <= 0) return this.clearStragglerBeacon('no_targets');
    if (targets.length > STRAGGLER_BEACON_MAX_TARGETS) {
      return this.clearStragglerBeacon('too_many_targets');
    }

    const now = Date.now();
    const safeDelta = Math.max(0, Math.min(3, Number(delta) || 1));
    const pulse = 0.5 + Math.sin(now * 0.012) * 0.5;
    const spin = now * 0.0022;
    const baseAlpha = 0.38 + pulse * 0.28;
    const width = this.game?.getWidth?.() || this.game?.app?.screen?.width || 1280;
    const height = this.game?.getHeight?.() || this.game?.app?.screen?.height || 720;
    const edgeInset = Math.max(30, Math.min(54, Math.min(width, height) * 0.045));
    const safeLeft = edgeInset;
    const safeRight = width - edgeInset;
    const safeTop = Math.max(edgeInset, Math.min(92, height * 0.14));
    const safeBottom = height - edgeInset;
    let pipCount = 0;
    let ringCount = 0;
    let edgeArrowCount = 0;

    layer.clear();
    hideMicroSignals(layer, 'straggler:');
    layer.visible = true;

    targets.forEach((enemy, index) => {
      const x = Number(enemy.x) || 0;
      const y = Number(enemy.y) || 0;
      const radius = Math.max(18, Number(enemy.radius) || 15);
      const isElite = enemy.kind === 'elite_middle_ship' || enemy.isEliteMiddleShip || enemy.middleShipProfile;
      const isDurable = isElite || Number(enemy.maxHealth || 0) >= 4;
      const color = isElite
        ? (enemy.middleShipProfile?.accent || 0xfff07a)
        : (isDurable ? 0xffd36b : 0x66f7ff);
      const accent = isElite ? 0xffffff : (enemy.visualVariant?.accent || enemy.color || 0xffffff);
      const ringRadius = radius * (isElite ? 2.0 : 1.7) + 8 + pulse * 4 + index * 1.5;
      const outerRadius = ringRadius + 8 + safeDelta * 0.4;

      layer.circle(x, y, ringRadius);
      layer.stroke({ color, width: isElite ? 2.2 : 1.8, alpha: baseAlpha });
      layer.circle(x, y, outerRadius);
      layer.stroke({ color: accent, width: 1, alpha: 0.22 + pulse * 0.16 });
      ringCount += 2;

      const pipTotal = isElite || isDurable ? 6 : 4;
      const pipLength = isElite ? 12 : 9;
      for (let i = 0; i < pipTotal; i += 1) {
        const angle = spin + (Math.PI * 2 * i) / pipTotal + index * 0.4;
        const ax = Math.cos(angle);
        const ay = Math.sin(angle);
        layer.moveTo(x + ax * (outerRadius + 2), y + ay * (outerRadius + 2));
        layer.lineTo(x + ax * (outerRadius + pipLength), y + ay * (outerRadius + pipLength));
        pipCount += 1;
      }
      layer.stroke({ color, width: isElite ? 2.4 : 2, alpha: 0.72 });

      const bracketRadius = outerRadius + pipLength + 4;
      const sweep = isElite ? 0.34 : 0.26;
      for (let i = 0; i < 2; i += 1) {
        const angle = spin * 0.7 + Math.PI * i + index * 0.25;
        layer.arc(x, y, bracketRadius, angle - sweep, angle + sweep);
      }
      layer.stroke({ color: 0xffffff, width: isElite ? 1.8 : 1.4, alpha: 0.34 + pulse * 0.2 });

      const arrowX = Math.max(safeLeft, Math.min(safeRight, x));
      const arrowY = Math.max(safeTop, Math.min(safeBottom, y));
      const needsEdgeArrow = Math.abs(arrowX - x) > 0.5 || Math.abs(arrowY - y) > 0.5;
      if (needsEdgeArrow) {
        let dx = x - arrowX;
        let dy = y - arrowY;
        let dist = Math.hypot(dx, dy);
        if (!Number.isFinite(dist) || dist < 0.01) {
          dx = x < width / 2 ? -1 : 1;
          dy = 0;
          dist = 1;
        }
        const nx = dx / dist;
        const ny = dy / dist;
        const arrowSize = isElite ? 15 : 12;
        const anchorX = arrowX + nx * (2 + pulse * 2);
        const anchorY = arrowY + ny * (2 + pulse * 2);
        presentDirectionalSignal(layer, `straggler:${index}`, {
          x: anchorX,
          y: anchorY,
          directionX: nx,
          directionY: ny,
          color,
          size: arrowSize * 3.35,
          alpha: 0.8 + pulse * 0.2,
          pulse
        });
        edgeArrowCount += 1;
      }
    });

    const debug = {
      visible: true,
      reason: 'active',
      targetCount: targets.length,
      targetTypes: targets.map(enemy => enemy.type || enemy.kind || 'enemy'),
      targetKinds: targets.map(enemy => enemy.kind || 'enemy'),
      pipCount,
      ringCount,
      edgeArrowCount,
      maxTargets: STRAGGLER_BEACON_MAX_TARGETS
    };
    layer._debugStragglerBeacon = debug;
    this.lastStragglerBeaconDebug = { ...debug };
    return debug;
  }

  logCap(type) {
    if (!this.capState[type]) {
      this.capState[type] = true;
      if (this.debugCaps) {
        const counts = this.getPerfCounts();
        console.warn(`CAP bullets=${counts.bullets} enemies=${counts.enemies} particles=${counts.particles}`);
      }
    }
  }

  decorateTacticalDraftOffers(offers = []) {
    const selectedIds = this.player?.runAugmentIds || [];
    const consumedIds = this.player?.consumedRunAugmentIds || [];
    return offers.map((offer) => ({
      ...offer,
      doctrineProjection: projectTacticalDoctrine(selectedIds, consumedIds, offer.id),
      fusionBlueprints: getTacticalFusionBlueprints(offer.id, selectedIds),
      statPreview: this.player?.getRunAugmentStatPreview?.(offer.id) || {
        kind: 'contextual',
        metric: null,
        before: null,
        after: null,
        overlapSuppressed: false
      }
    }));
  }

  getIneffectiveTacticalDraftOfferIds() {
    if (!this.player?.getRunAugmentStatPreview) return [];
    return TACTICAL_DRAFT_AUGMENTS
      .filter((augment) => {
        if (augment.consumedOnApply || augment.id === 'combo_anchor') return false;
        const preview = this.player.getRunAugmentStatPreview(augment.id);
        return preview?.kind === 'stat'
          && preview.capped === true
          && !(preview.projectedFusionIds?.length > 0);
      })
      .map((augment) => augment.id);
  }

  formatTacticalDraftStatPreview(preview = null) {
    if (preview?.kind !== 'stat' || !preview.metric) {
      return { kind: 'contextual', label: translateText('CONTEXTUAL EFFECT'), value: '' };
    }
    const definitions = {
      damage: { label: 'DAMAGE', format: (value) => Number(value).toFixed(2) },
      directDps: { label: 'DIRECT DPS', format: (value) => Number(value).toFixed(2) },
      fireDelay: { label: 'FIRE DELAY', format: (value) => `${Math.round(Number(value) || 0)} ms` },
      bulletSpeed: { label: 'BULLET SPEED', format: (value) => Number(value).toFixed(2) },
      shots: { label: 'SHOTS', format: (value) => String(Math.round(Number(value) || 0)) },
      piercing: { label: 'PIERCING', format: (value) => translateText(value ? 'ON' : 'OFF') },
      chainReach: { label: 'CHAIN REACH', format: (value) => String(Math.round(Number(value) || 0)) },
      movement: { label: 'MOVEMENT', format: (value) => Number(value).toFixed(2) },
      dodgeCooldown: { label: 'DODGE COOLDOWN', format: (value) => `${Math.round(Number(value) || 0)} ms` },
      dodgeDuration: { label: 'DODGE DURATION', format: (value) => `${Math.round(Number(value) || 0)} ms` },
      pickupRange: { label: 'PICKUP RANGE', format: (value) => String(Math.round(Number(value) || 0)) },
      supportDrones: { label: 'SUPPORT DRONES', format: (value) => String(Math.round(Number(value) || 0)) }
    };
    const metrics = (Array.isArray(preview.metrics) && preview.metrics.length
      ? preview.metrics
      : [{ metric: preview.metric, before: preview.before, after: preview.after }])
      .map((entry) => ({
        ...entry,
        definition: definitions[entry.metric],
        unchanged: typeof entry.before === 'number' && typeof entry.after === 'number'
          ? Math.abs(entry.before - entry.after) < 0.000001
          : entry.before === entry.after
      }))
      .filter((entry) => entry.definition);
    if (!metrics.length) return { kind: 'contextual', label: translateText('CONTEXTUAL EFFECT'), value: '' };
    const directDamageCapped = metrics.some((entry) => (
      entry.unchanged && (entry.metric === 'damage' || entry.metric === 'directDps')
    ));
    const effectiveMetrics = metrics.filter((entry) => !entry.unchanged);
    if (directDamageCapped && effectiveMetrics.length === 0) {
      return {
        kind: 'capped',
        label: translateText('DIRECT DAMAGE CAP REACHED'),
        value: ''
      };
    }
    const labels = [
      ...(directDamageCapped ? [translateText('DIRECT DAMAGE CAP REACHED')] : []),
      ...effectiveMetrics.map(({ definition }) => translateText(definition.label))
    ];
    return {
      kind: 'stat',
      label: labels.join(' / '),
      value: effectiveMetrics.map(({ before, after, definition }) => (
        `${definition.format(before)} → ${definition.format(after)}`
      )).join(' / ')
    };
  }

  getTacticalDraftBuildSummaryData() {
    const selectedIds = this.player?.runAugmentIds || [];
    const consumedIds = this.player?.consumedRunAugmentIds || [];
    const activeIds = getActiveTacticalAugmentIds(selectedIds, consumedIds);
    const counts = { offense: 0, mobility: 0, defense: 0, utility: 0 };
    activeIds.forEach((id) => {
      const category = getTacticalDraftMeta(id)?.category;
      if (category in counts) counts[category] += 1;
    });
    const doctrine = analyzeTacticalDoctrine(selectedIds, consumedIds);
    const fusions = getActiveTacticalFusionProtocols(activeIds);
    return { activeIds, counts, doctrine, fusions };
  }

  createTacticalDraftBuildSummary() {
    const summary = new PIXI.Container();
    summary.label = 'tactical_draft_active_build';
    summary.eventMode = 'none';
    const bg = new PIXI.Graphics();
    const fieldTexture = GameAssets.getTacticalDraftFieldTexture?.();
    const material = new PIXI.Sprite(GameAssets.isValidTexture(fieldTexture) ? fieldTexture : PIXI.Texture.EMPTY);
    material.anchor.set(0.5);
    material.blendMode = 'add';
    material.eventMode = 'none';
    const materialMask = new PIXI.Graphics();
    material.mask = materialMask;
    const titleRail = new PIXI.Graphics();
    const title = createText(translateText('ACTIVE BUILD'), {
      fontFamily: FONT_BODY,
      fontSize: 10,
      fontWeight: '900',
      fill: '#fff3a0',
      letterSpacing: 1
    });
    title.anchor.set(0, 0.5);
    const empty = createText(translateText('NO AUGMENTS YET'), {
      fontFamily: FONT_BODY,
      fontSize: 11,
      fontWeight: '800',
      fill: '#8ba8b6'
    });
    empty.anchor.set(0, 0.5);
    const categoryNodes = Object.keys(TACTICAL_DRAFT_CATEGORY_COLORS).map((category) => {
      const node = createText('', {
        fontFamily: FONT_BODY,
        fontSize: 10,
        fontWeight: '900',
        fill: TACTICAL_DRAFT_CATEGORY_COLORS[category]
      });
      node.anchor.set(0, 0.5);
      node._category = category;
      return node;
    });
    const categoryBgNodes = Object.keys(TACTICAL_DRAFT_CATEGORY_COLORS).map((category) => {
      const node = new PIXI.Graphics();
      node._category = category;
      return node;
    });
    const categoryCountNodes = Object.keys(TACTICAL_DRAFT_CATEGORY_COLORS).map((category) => {
      const node = createText('', {
        fontFamily: FONT_DISPLAY,
        fontSize: 18,
        fontWeight: '900',
        fill: '#ffffff'
      });
      node.anchor.set(1, 0.5);
      node._category = category;
      return node;
    });
    const categoryMeterNodes = Object.keys(TACTICAL_DRAFT_CATEGORY_COLORS).map((category) => {
      const node = new PIXI.Graphics();
      node._category = category;
      return node;
    });
    const signatureBg = new PIXI.Graphics();
    const doctrine = createText('', {
      fontFamily: FONT_BODY,
      fontSize: 10,
      fontWeight: '900',
      fill: '#d8f7ff'
    });
    doctrine.anchor.set(1, 0.5);
    const fusion = createText('', {
      fontFamily: FONT_BODY,
      fontSize: 10,
      fontWeight: '900',
      fill: '#e0a3ff'
    });
    fusion.anchor.set(1, 0.5);
    const installLabel = createText('', {
      fontFamily: FONT_BODY,
      fontSize: 9,
      fontWeight: '900',
      fill: '#fff3a0',
      stroke: '#020711',
      strokeThickness: 2,
      align: 'center',
      padding: 6
    });
    installLabel.anchor.set(0.5);
    installLabel.visible = false;
    summary.addChild(
      bg,
      material,
      materialMask,
      titleRail,
      title,
      empty,
      ...categoryBgNodes,
      ...categoryMeterNodes,
      ...categoryNodes,
      ...categoryCountNodes,
      signatureBg,
      doctrine,
      fusion,
      installLabel
    );
    summary._nodes = {
      bg,
      material,
      materialMask,
      titleRail,
      title,
      empty,
      categoryNodes,
      categoryBgNodes,
      categoryCountNodes,
      categoryMeterNodes,
      signatureBg,
      doctrine,
      fusion,
      installLabel
    };
    return summary;
  }

  openTacticalDraft({ sectorCleared = this.game?.level || 1, onComplete = null } = {}) {
    if (!canRunModeUseTacticalDraft(this.game?.runMode)) return false;
    if (this.tacticalDraft?.active || !this.player || !this.uiOverlay) return Boolean(this.tacticalDraft?.active);
    const ineffectiveIds = this.getIneffectiveTacticalDraftOfferIds();
    if (ineffectiveIds.includes(this.tacticalDraftHeldId)) this.tacticalDraftHeldId = null;
    const offers = this.decorateTacticalDraftOffers(buildTacticalDraftOffers({
      seed: this.game?.contentDirector?.seed || `run-${this.game?.runStartedAtMs || 0}`,
      sectorCleared,
      selectedIds: this.player.runAugmentIds || [],
      consumedIds: this.player.consumedRunAugmentIds || [],
      lives: Number(this.game?.lives) || 0,
      maxLives: Number(this.game?.maxLives) || MAX_PLAYER_LIVES,
      baseShotCount: Number(this.player?.weaponProfile?.bullets) || 1,
      activePowerupType: this.player?.activePowerup?.type || null,
      runTheme: this.game?.contentDirector?.runTheme?.id || null,
      ineffectiveIds,
      bannedIds: this.tacticalDraftBannedIds,
      heldId: this.tacticalDraftHeldId
    }));
    if (offers.length < 3) return false;
    const scoreRouteOffer = offers.find((offer) => offer.fixedScoreRoute) || null;

    const overlay = new PIXI.Container();
    overlay.label = 'ui_tactical_draft';
    overlay.zIndex = 1000005;
    overlay.sortableChildren = true;
    overlay.eventMode = 'static';
    const dim = new PIXI.Graphics();
    dim.label = 'tactical_draft_dim';
    dim.eventMode = 'static';
    const fieldTexture = GameAssets.getTacticalDraftFieldTexture?.();
    const material = new PIXI.Sprite(GameAssets.isValidTexture(fieldTexture) ? fieldTexture : PIXI.Texture.EMPTY);
    material.label = 'tactical_draft_command_field';
    material.anchor.set(0.5);
    material.blendMode = 'add';
    material.eventMode = 'none';
    const frame = new PIXI.Graphics();
    frame.label = 'tactical_draft_frame';
    const lockInBurst = new PIXI.Graphics();
    lockInBurst.label = 'tactical_draft_lock_in_burst';
    lockInBurst.eventMode = 'none';
    lockInBurst.visible = false;
    const eyebrow = createText(scoreRouteOffer
      ? translateText('SECTOR {sector} SCORE ROUTE', { sector: sectorCleared })
      : translateText('SECTOR {sector} CLEARED', { sector: sectorCleared }), {
      fontFamily: FONT_BODY,
      fontSize: 15,
      fontWeight: '900',
      fill: '#7dffcc',
      align: 'center'
    });
    eyebrow.anchor.set(0.5);
    const title = createText(translateText(scoreRouteOffer ? 'NOW OR NEVER' : 'TACTICAL DRAFT'), {
      fontFamily: FONT_DISPLAY,
      fontSize: 38,
      fontWeight: '900',
      fill: '#fff3a0',
      stroke: '#00111d',
      strokeThickness: 5,
      align: 'center'
    });
    title.anchor.set(0.5);
    const subtitle = createText(scoreRouteOffer
      ? translateText('Take COMBO ANCHOR now or close this score route for the run.')
      : translateText('Choose one permanent run upgrade.'), {
      fontFamily: FONT_BODY,
      fontSize: 17,
      fontWeight: '700',
      fill: '#d8f7ff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 900,
      lineHeight: 20
    });
    subtitle.anchor.set(0.5);
    overlay.addChild(dim, material, frame, lockInBurst, eyebrow, title, subtitle);

    const buildSummary = this.createTacticalDraftBuildSummary();
    overlay.addChild(buildSummary);
    const cards = offers.map((offer, index) => this.createTacticalDraftCard(offer, index));
    cards.forEach((card) => overlay.addChild(card));
    const rescan = this.createTacticalDraftRescanControl();
    const hold = this.createTacticalDraftHoldControl();
    const ban = this.createTacticalDraftBanControl();
    overlay.addChild(rescan, hold, ban);
    const initialFocusIndex = this.getInitialTacticalDraftFocusIndex(offers);
    this.resetTransientGameplayInput('tactical_draft_enter', { preserveFire: true });
    this.tacticalDraft = {
      active: true,
      sectorCleared: Math.max(1, Math.floor(Number(sectorCleared) || 1)),
      offers,
      focusIndex: initialFocusIndex,
      initialFocusIndex,
      confirmedId: null,
      result: null,
      overlay,
      dim,
      material,
      frame,
      lockInBurst,
      eyebrow,
      title,
      subtitle,
      buildSummary,
      cards,
      rescan,
      hold,
      ban,
      scoreRouteOfferId: scoreRouteOffer?.id || null,
      scoreRouteDecision: scoreRouteOffer ? 'pending' : null,
      scoreRouteDefaultSubtitle: scoreRouteOffer
        ? translateText('Take COMBO ANCHOR now or close this score route for the run.')
        : null,
      heldAtOpenId: this.tacticalDraftHeldId,
      rescanCount: 0,
      rescansRemaining: this.tacticalDraftRescansRemaining,
      bansRemaining: this.tacticalDraftBansRemaining,
      onComplete: typeof onComplete === 'function' ? onComplete : null,
      openedAt: Date.now(),
      inputArmed: false,
      pulse: 0,
      compact: false
    };
    this.uiOverlay.addChild(overlay);
    this.layoutTacticalDraft();
    this.tacticalDraftNavigator.suppressUntilReleased();
    this.setTacticalDraftFocus(initialFocusIndex, { silent: true });
    if (scoreRouteOffer) {
      this.tacticalScoreRouteDecision = {
        sector: Math.max(1, Math.floor(Number(sectorCleared) || 1)),
        offerId: scoreRouteOffer.id,
        status: 'pending',
        openedAt: Date.now()
      };
      AudioManager.playSfx(scoreRouteOffer.sfx || 'tactical_combo_anchor', {
        force: true,
        volume: 0.62,
        minIntervalMs: 0
      });
    } else {
      AudioManager.playSfx('nova_rank_fanfare', { force: true, volume: 0.42, minIntervalMs: 120 });
    }
    this.scheduleTacticalBossBanter(offers[initialFocusIndex]?.id, { delayMs: 760, context: 'draft' });
    return true;
  }

  createTacticalDraftCard(offer, index) {
    const card = new PIXI.Container();
    card.label = `tactical_draft_card_${offer.id}`;
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card._draftIndex = index;
    card._offer = offer;
    const glow = new PIXI.Graphics();
    const bg = new PIXI.Graphics();
    const fieldTexture = GameAssets.getTacticalDraftFieldTexture?.();
    const material = new PIXI.Sprite(GameAssets.isValidTexture(fieldTexture) ? fieldTexture : PIXI.Texture.EMPTY);
    material.anchor.set(0.5);
    material.blendMode = 'add';
    material.eventMode = 'none';
    const materialMask = new PIXI.Graphics();
    material.mask = materialMask;
    const heroPlate = new PIXI.Graphics();
    const bloomVariant = { offense: 2, mobility: 1, defense: 0, utility: 3 }[offer.category] ?? 0;
    const bloomTexture = GameAssets.getPlasmaBloomTexture?.(bloomVariant);
    const artBloom = new PIXI.Sprite(GameAssets.isValidTexture(bloomTexture) ? bloomTexture : PIXI.Texture.EMPTY);
    artBloom.anchor.set(0.5);
    artBloom.blendMode = 'add';
    artBloom.eventMode = 'none';
    artBloom._variant = bloomVariant;
    const dataRail = new PIXI.Graphics();
    const categoryBadge = new PIXI.Graphics();
    const categoryLabel = offer.fixedScoreRoute
      ? translateText('ONE-TIME SCORE ROUTE')
      : translateText(String(offer.category || 'utility').toUpperCase());
    const category = createText(categoryLabel, {
      fontFamily: FONT_BODY,
      fontSize: 10,
      fontWeight: '900',
      fill: '#d8f7ff',
      letterSpacing: 0.8
    });
    category.anchor.set(0.5);
    const stackBadge = new PIXI.Graphics();
    const stackLabel = createText(offer.currentStacks > 0
      ? translateText('STACK {current}/{max}', { current: offer.currentStacks, max: offer.maxStacks })
      : translateText('NEW'), {
      fontFamily: FONT_BODY,
      fontSize: 9,
      fontWeight: '900',
      fill: '#d8f7ff'
    });
    stackLabel.anchor.set(0.5);
    const scoreRouteBadge = new PIXI.Container();
    scoreRouteBadge.label = `tactical_score_route_badge_${offer.id}`;
    scoreRouteBadge.eventMode = 'none';
    const scoreRouteBadgeBg = new PIXI.Graphics();
    const scoreRouteBadgeText = createText(translateText('NOW OR NEVER'), {
      fontFamily: FONT_DISPLAY,
      fontSize: 10,
      fontWeight: '900',
      fill: '#fff3a0',
      stroke: '#1b0800',
      strokeThickness: 2,
      align: 'center',
      letterSpacing: 0.6
    });
    scoreRouteBadgeText.anchor.set(0.5);
    scoreRouteBadge.addChild(scoreRouteBadgeBg, scoreRouteBadgeText);
    scoreRouteBadge.visible = Boolean(offer.fixedScoreRoute);
    const texture = GameAssets.getPowerupTexture?.(offer.id);
    const icon = texture && GameAssets.isValidTexture(texture)
      ? new PIXI.Sprite(texture)
      : this.createTacticalDraftFallbackIcon(offer);
    icon.anchor?.set?.(0.5);
    const name = createText(translateText(offer.displayName || offer.name), {
      fontFamily: FONT_DISPLAY,
      fontSize: 23,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#00111d',
      strokeThickness: 3,
      align: 'center'
    });
    name.anchor.set(0.5);
    const description = createText(translateText(offer.description), {
      fontFamily: FONT_BODY,
      fontSize: 15,
      fontWeight: '700',
      fill: '#d8f7ff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 250
    });
    description.anchor.set(0.5);
    const impact = this.formatTacticalDraftStatPreview(offer.statPreview);
    card._impactKind = impact.kind;
    const impactBadge = new PIXI.Graphics();
    const impactLabel = createText(
      impact.kind === 'stat' || impact.kind === 'capped'
        ? impact.label
        : translateText('CONTEXTUAL EFFECT'), {
      fontFamily: FONT_BODY,
      fontSize: 8,
      fontWeight: '900',
      fill: impact.kind === 'capped' ? '#fff3a0' : impact.kind === 'stat' ? '#8df7ff' : '#9fb6c0',
      letterSpacing: 0.7
    });
    impactLabel.anchor.set(0.5);
    const impactValue = createText(impact.value, {
      fontFamily: FONT_DISPLAY,
      fontSize: 14,
      fontWeight: '900',
      fill: '#ffffff',
      align: 'center'
    });
    impactValue.anchor.set(0.5);
    const fusionBlueprint = offer.fusionBlueprints?.[0] || null;
    const fusionBadge = new PIXI.Graphics();
    fusionBadge.label = `tactical_fusion_blueprint_${offer.id}`;
    const fusionLabel = createText(fusionBlueprint?.completesOnPick
      ? translateText('COMPLETES FUSION')
      : translateText('FUSION BLUEPRINT'), {
      fontFamily: FONT_BODY,
      fontSize: 9,
      fontWeight: '900',
      fill: fusionBlueprint?.completesOnPick ? '#fff3a0' : '#8df7ff',
      align: 'center',
      letterSpacing: 1
    });
    fusionLabel.anchor.set(0.5);
    const fusionName = createText(fusionBlueprint ? translateText(fusionBlueprint.name) : '', {
      fontFamily: FONT_DISPLAY,
      fontSize: 12,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#00111d',
      strokeThickness: 2,
      align: 'center'
    });
    fusionName.anchor.set(0.5);
    const fusionPartnerName = fusionBlueprint?.partnerNames?.[0]
      ? translateText(fusionBlueprint.partnerNames[0])
      : '';
    const fusionHint = createText(fusionBlueprint?.completesOnPick
      ? translateText('PARTNER ONLINE: {augment}', { augment: fusionPartnerName })
      : translateText('PAIR WITH {augment}', { augment: fusionPartnerName }), {
      fontFamily: FONT_BODY,
      fontSize: 8,
      fontWeight: '900',
      fill: '#c8f7ff',
      align: 'center'
    });
    fusionHint.anchor.set(0.5);
    fusionBadge.visible = Boolean(fusionBlueprint);
    fusionLabel.visible = Boolean(fusionBlueprint);
    fusionName.visible = Boolean(fusionBlueprint);
    fusionHint.visible = Boolean(fusionBlueprint);
    const permanenceBadge = new PIXI.Graphics();
    const permanence = createText(offer.fixedScoreRoute
      ? translateText('ONE CHANCE // WILL NOT RETURN')
      : offer.currentStacks >= 2
        ? translateText('OVERDRIVE: 30% EFFECT')
        : offer.currentStacks > 0
          ? translateText('EVOLUTION: 55% EFFECT')
          : translateText('PERMANENT THIS RUN'), {
      fontFamily: FONT_BODY,
      fontSize: 11,
      fontWeight: '900',
      fill: '#fff3a0',
      align: 'center'
    });
    permanence.anchor.set(0.5);
    const doctrineBadge = new PIXI.Graphics();
    const doctrineTitle = createText(translateText('BUILD SYNERGY'), {
      fontFamily: FONT_BODY,
      fontSize: 8,
      fontWeight: '900',
      fill: '#9fb6c0',
      letterSpacing: 0.7
    });
    doctrineTitle.anchor.set(0.5);
    const doctrine = createText(this.getTacticalDoctrinePreviewText(offer), {
      fontFamily: FONT_BODY,
      fontSize: 10,
      fontWeight: '900',
      fill: Number(offer.doctrineProjection?.after?.color) || '#7ee9ff',
      align: 'center'
    });
    doctrine.anchor.set(0.5);
    const holdBadge = createText(translateText('HELD'), {
      fontFamily: FONT_BODY,
      fontSize: 10,
      fontWeight: '900',
      fill: '#fff3a0',
      align: 'center'
    });
    holdBadge.anchor.set(0.5);
    const choose = createText(translateText(offer.fixedScoreRoute ? 'TAKE SCORE ROUTE' : 'CHOOSE'), {
      fontFamily: FONT_DISPLAY,
      fontSize: 15,
      fontWeight: '900',
      fill: '#ffffff',
      align: 'center'
    });
    choose.anchor.set(0.5);
    const chooseBg = new PIXI.Graphics();
    card.addChild(
      glow,
      bg,
      material,
      materialMask,
      heroPlate,
      artBloom,
      dataRail,
      categoryBadge,
      category,
      stackBadge,
      stackLabel,
      scoreRouteBadge
    );
    if (icon) card.addChild(icon);
    card.addChild(
      name,
      description,
      impactBadge,
      impactLabel,
      impactValue,
      fusionBadge,
      fusionLabel,
      fusionName,
      fusionHint,
      doctrineBadge,
      doctrineTitle,
      doctrine,
      permanenceBadge,
      permanence,
      holdBadge,
      chooseBg,
      choose
    );
    card._nodes = {
      glow,
      bg,
      material,
      materialMask,
      heroPlate,
      artBloom,
      dataRail,
      categoryBadge,
      category,
      stackBadge,
      stackLabel,
      scoreRouteBadge,
      scoreRouteBadgeBg,
      scoreRouteBadgeText,
      icon,
      name,
      description,
      impactBadge,
      impactLabel,
      impactValue,
      fusionBadge,
      fusionLabel,
      fusionName,
      fusionHint,
      doctrineBadge,
      doctrineTitle,
      doctrine,
      permanenceBadge,
      permanence,
      holdBadge,
      chooseBg,
      choose
    };
    card.on('pointerover', () => this.setTacticalDraftFocus(index));
    card.on('pointertap', () => {
      this.setTacticalDraftFocus(index, { silent: true });
      this.confirmTacticalDraft(index, 'pointer');
    });
    return card;
  }

  createTacticalDraftRescanControl() {
    const control = new PIXI.Container();
    control.label = 'tactical_draft_rescan';
    control.eventMode = 'static';
    control.cursor = 'pointer';
    const bg = new PIXI.Graphics();
    const label = createText('', {
      fontFamily: FONT_DISPLAY,
      fontSize: 13,
      fontWeight: '900',
      fill: '#d8f7ff',
      stroke: '#00111d',
      strokeThickness: 2,
      align: 'center'
    });
    label.anchor.set(0.5);
    control.addChild(bg, label);
    control._nodes = { bg, label };
    control.on('pointertap', () => this.rescanTacticalDraft('pointer'));
    return control;
  }

  createTacticalDraftHoldControl() {
    const control = new PIXI.Container();
    control.label = 'tactical_draft_hold';
    control.eventMode = 'static';
    control.cursor = 'pointer';
    const bg = new PIXI.Graphics();
    const label = createText('', {
      fontFamily: FONT_DISPLAY,
      fontSize: 13,
      fontWeight: '900',
      fill: '#fff3a0',
      stroke: '#00111d',
      strokeThickness: 2,
      align: 'center'
    });
    label.anchor.set(0.5);
    control.addChild(bg, label);
    control._nodes = { bg, label };
    control.on('pointertap', () => this.toggleTacticalDraftHold('pointer'));
    return control;
  }

  createTacticalDraftBanControl() {
    const control = new PIXI.Container();
    control.label = 'tactical_draft_ban';
    control.eventMode = 'static';
    control.cursor = 'pointer';
    const bg = new PIXI.Graphics();
    const label = createText('', {
      fontFamily: FONT_DISPLAY,
      fontSize: 13,
      fontWeight: '900',
      fill: '#ffb0c4',
      stroke: '#00111d',
      strokeThickness: 2,
      align: 'center'
    });
    label.anchor.set(0.5);
    control.addChild(bg, label);
    control._nodes = { bg, label };
    control.on('pointertap', () => this.banTacticalDraftOffer('pointer'));
    return control;
  }

  getTacticalDoctrinePreviewText(offer = null) {
    const projection = offer?.doctrineProjection;
    if (!projection?.valid || projection.consumed || !projection.after) return translateText('ONE-SHOT: NO DOCTRINE SHIFT');
    const doctrine = translateText(projection.after.name);
    if (projection.identityChanged) return translateText('BUILDS: {doctrine}', { doctrine });
    if (projection.stageChanged) {
      return translateText('{name} // {stage}', { name: doctrine, stage: translateText(projection.after.stage) });
    }
    return translateText('REINFORCES: {doctrine}', { doctrine });
  }

  getInitialTacticalDraftFocusIndex(offers = []) {
    if (!Array.isArray(offers) || !offers.length) return 0;
    const scoreRouteIndex = offers.findIndex((offer) => offer.fixedScoreRoute);
    if (scoreRouteIndex >= 0) return scoreRouteIndex;
    const heldIndex = offers.findIndex((offer) => offer.held);
    if (heldIndex >= 0) return heldIndex;
    return Math.min(1, offers.length - 1);
  }

  createTacticalDraftFallbackIcon(offer) {
    const icon = new PIXI.Graphics();
    const color = Number(offer?.color) || 0x37f5ff;
    const category = String(offer?.category || 'utility');
    const outer = [0, -30, 21, -21, 30, 0, 21, 21, 0, 30, -21, 21, -30, 0, -21, -21];
    const inner = [0, -25, 18, -18, 25, 0, 18, 18, 0, 25, -18, 18, -25, 0, -18, -18];
    icon.poly(outer);
    icon.fill({ color: 0x04111f, alpha: 0.96 });
    icon.poly(outer);
    icon.stroke({ color, width: 2.2, alpha: 0.92 });
    icon.poly(inner);
    icon.stroke({ color: 0xffffff, width: 1, alpha: 0.28 });
    if (category === 'offense') {
      icon.poly([-6, -19, 8, -4, 1, -4, 8, 19, -10, 2, -2, 2]);
      icon.fill({ color, alpha: 0.94 });
    } else if (category === 'mobility') {
      icon.moveTo(-14, -10);
      icon.lineTo(0, 0);
      icon.lineTo(-14, 10);
      icon.moveTo(0, -10);
      icon.lineTo(14, 0);
      icon.lineTo(0, 10);
      icon.stroke({ color, width: 4, alpha: 0.92 });
    } else if (category === 'defense') {
      icon.poly([0, -19, 16, -11, 13, 9, 0, 20, -13, 9, -16, -11]);
      icon.fill({ color, alpha: 0.28 });
      icon.poly([0, -19, 16, -11, 13, 9, 0, 20, -13, 9, -16, -11]);
      icon.stroke({ color, width: 2.4, alpha: 0.96 });
    } else {
      [[-10, -10], [10, -10], [-10, 10], [10, 10]].forEach(([x, y]) => {
        icon.poly([x, y - 5, x + 5, y, x, y + 5, x - 5, y]);
        icon.fill({ color, alpha: 0.9 });
      });
      icon.poly([0, -7, 7, 0, 0, 7, -7, 0]);
      icon.stroke({ color: 0xffffff, width: 2, alpha: 0.7 });
    }
    icon._tacticalDraftFallback = true;
    return icon;
  }

  layoutTacticalDraft() {
    const state = this.tacticalDraft;
    if (!state?.active) return;
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 880 || height < 650;
    state.compact = compact;
    state.dim.clear();
    state.dim.rect(0, 0, width, height);
    state.dim.fill({ color: 0x010711, alpha: 0.78 });
    state.dim.hitArea = new PIXI.Rectangle(0, 0, width, height);
    if (state.material) {
      const fieldTexture = GameAssets.getTacticalDraftFieldTexture?.();
      if (GameAssets.isValidTexture(fieldTexture) && state.material.texture !== fieldTexture) {
        state.material.texture = fieldTexture;
      }
      const textureWidth = Math.max(1, state.material.texture?.width || 1);
      const textureHeight = Math.max(1, state.material.texture?.height || 1);
      const coverScale = Math.max(width / textureWidth, height / textureHeight);
      state.material.position.set(width / 2, height / 2);
      state.material.scale.set(coverScale * 1.025);
      state.material._baseScale = coverScale * 1.025;
      state.material.alpha = compact ? 0.42 : 0.56;
      state.material.visible = GameAssets.isValidTexture(state.material.texture);
    }
    state.frame.clear();
    const edge = compact ? 18 : 32;
    const corner = compact ? 24 : 46;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = sx < 0 ? edge : width - edge;
      const y = sy < 0 ? edge : height - edge;
      state.frame.moveTo(x, y + sy * corner);
      state.frame.lineTo(x, y);
      state.frame.lineTo(x + sx * corner, y);
    }
    state.frame.stroke({ color: 0x37f5ff, width: 2, alpha: 0.62 });
    state.frame.moveTo(edge + corner + 16, edge);
    state.frame.lineTo(width * 0.31, edge);
    state.frame.moveTo(width * 0.69, edge);
    state.frame.lineTo(width - edge - corner - 16, edge);
    state.frame.stroke({ color: 0xffd15c, width: 1.4, alpha: 0.38 });
    state.eyebrow.style.fontSize = compact ? 11 : 13;
    state.eyebrow.position.set(width / 2, compact ? 30 : 42);
    state.title.style.fontSize = compact ? 26 : 36;
    state.title.position.set(width / 2, compact ? 57 : 74);
    state.subtitle.style.fontSize = compact ? 12 : 15;
    state.subtitle.style.wordWrapWidth = Math.max(260, width - (compact ? 48 : 120));
    state.subtitle.style.lineHeight = compact ? 14 : 18;
    state.subtitle.updateText?.(false);
    state.subtitle.position.set(width / 2, compact ? 82 : 105);

    if (state.buildSummary?._nodes) {
      const summary = state.buildSummary;
      const nodes = summary._nodes;
      const data = this.getTacticalDraftBuildSummaryData();
      summary._data = data;
      const installingCategory = state.installingCategory || null;
      const summaryWidth = compact ? Math.max(300, width - 52) : Math.min(1120, width - 120);
      const summaryHeight = compact ? 40 : 80;
      summary._draftLayout = { width: summaryWidth, height: summaryHeight, compact };
      summary.position.set(width / 2, compact ? 150 : 158);
      nodes.bg.clear();
      const chamfer = compact ? 8 : 12;
      const summaryPoints = [
        -summaryWidth / 2 + chamfer, -summaryHeight / 2,
        summaryWidth / 2 - chamfer, -summaryHeight / 2,
        summaryWidth / 2, -summaryHeight / 2 + chamfer,
        summaryWidth / 2, summaryHeight / 2 - chamfer,
        summaryWidth / 2 - chamfer, summaryHeight / 2,
        -summaryWidth / 2 + chamfer, summaryHeight / 2,
        -summaryWidth / 2, summaryHeight / 2 - chamfer,
        -summaryWidth / 2, -summaryHeight / 2 + chamfer
      ];
      nodes.bg.poly(summaryPoints);
      nodes.bg.fill({ color: 0x041321, alpha: 0.96 });
      nodes.bg.stroke({ color: 0x37f5ff, width: 1.25, alpha: 0.48 });
      nodes.bg.moveTo(-summaryWidth / 2 + 18, -summaryHeight / 2 + 5);
      nodes.bg.lineTo(-summaryWidth / 2 + summaryWidth * 0.37, -summaryHeight / 2 + 5);
      nodes.bg.moveTo(summaryWidth / 2 - summaryWidth * 0.22, summaryHeight / 2 - 5);
      nodes.bg.lineTo(summaryWidth / 2 - 18, summaryHeight / 2 - 5);
      nodes.bg.stroke({ color: 0xffd15c, width: 1.4, alpha: 0.5 });
      nodes.materialMask.clear();
      nodes.materialMask.poly(summaryPoints);
      nodes.materialMask.fill({ color: 0xffffff, alpha: 1 });
      const summaryTexture = GameAssets.getTacticalDraftFieldTexture?.();
      if (GameAssets.isValidTexture(summaryTexture) && nodes.material.texture !== summaryTexture) {
        nodes.material.texture = summaryTexture;
      }
      if (GameAssets.isValidTexture(nodes.material.texture)) {
        nodes.material.width = summaryWidth;
        nodes.material.height = summaryHeight;
        nodes.material.alpha = compact ? 0.3 : 0.4;
        nodes.material.visible = true;
      } else {
        nodes.material.visible = false;
      }
      nodes.titleRail.clear();
      const railX = -summaryWidth / 2 + (compact ? 78 : 104);
      nodes.titleRail.moveTo(railX, -summaryHeight / 2 + 8);
      nodes.titleRail.lineTo(railX, summaryHeight / 2 - 8);
      nodes.titleRail.stroke({ color: 0x37f5ff, width: 2, alpha: 0.62 });
      for (let bar = 0; bar < 3; bar += 1) {
        nodes.titleRail.roundRect(railX - (compact ? 20 : 27), 7 + bar * 4, (compact ? 16 : 22) - bar * 3, 2, 1);
        nodes.titleRail.fill({ color: bar === 0 ? 0xffd15c : 0x37f5ff, alpha: 0.42 - bar * 0.08 });
      }
      nodes.title.style.fontSize = compact ? 8 : 11;
      nodes.title.position.set(-summaryWidth / 2 + 13, compact ? -1 : -12);
      nodes.title.scale.set(1);
      nodes.title.updateText?.(false);
      nodes.title.scale.set(Math.min(1, (compact ? 58 : 80) / Math.max(1, nodes.title.width)));
      const activeCategories = nodes.categoryNodes.filter((node) => !compact || data.counts[node._category] > 0);
      nodes.categoryNodes.forEach((node, index) => {
        const count = data.counts[node._category];
        const visible = !compact || count > 0;
        node.visible = visible;
        nodes.categoryBgNodes[index].visible = visible;
        nodes.categoryCountNodes[index].visible = visible;
        nodes.categoryMeterNodes[index].visible = visible;
        node.text = translateText(node._category.toUpperCase());
        nodes.categoryCountNodes[index].text = String(count);
        node.style.fontSize = compact ? 8 : 10;
        nodes.categoryCountNodes[index].style.fontSize = compact ? 13 : 21;
        node.scale.set(1);
        node.updateText?.(false);
        nodes.categoryCountNodes[index].scale.set(1);
        nodes.categoryCountNodes[index].updateText?.(false);
      });
      nodes.empty.visible = compact && data.activeIds.length === 0;
      nodes.empty.style.fontSize = compact ? 8 : 11;
      nodes.empty.position.set(-summaryWidth / 2 + (compact ? 92 : 128), 0);
      nodes.doctrine.text = data.doctrine
        ? translateText('{name} // {stage}', {
          name: translateText(data.doctrine.name),
          stage: translateText(data.doctrine.stage)
        })
        : '';
      nodes.doctrine.visible = Boolean(data.doctrine) && (!compact || activeCategories.length <= 2);
      nodes.doctrine.style.fill = data.doctrine?.color || '#d8f7ff';
      nodes.doctrine.style.fontSize = compact ? 8 : 10;
      nodes.doctrine.scale.set(1);
      nodes.doctrine.updateText?.(false);
      nodes.doctrine.position.set(summaryWidth / 2 - 18, 0);
      nodes.doctrine.scale.set(Math.min(1, (compact ? 172 : 270) / Math.max(1, nodes.doctrine.width)));
      nodes.fusion.text = data.fusions.length
        ? translateText('FUSIONS {count}', { count: data.fusions.length })
        : '';
      nodes.fusion.visible = data.fusions.length > 0 && (!compact || !nodes.doctrine.visible);
      nodes.fusion.style.fontSize = compact ? 8 : 10;
      nodes.fusion.scale.set(1);
      nodes.fusion.updateText?.(false);
      nodes.fusion.position.set(summaryWidth / 2 - 18, nodes.doctrine.visible ? 9 : 0);
      nodes.doctrine.y = nodes.fusion.visible ? -8 : 0;
      nodes.signatureBg.clear();
      const signatureVisible = nodes.doctrine.visible || nodes.fusion.visible;
      nodes.signatureBg.visible = signatureVisible;
      const signatureWidth = compact ? 190 : 306;
      if (signatureVisible) {
        nodes.signatureBg.position.set(summaryWidth / 2 - signatureWidth / 2 - 10, 0);
        nodes.signatureBg.poly([
          -signatureWidth / 2 + 9, -summaryHeight / 2 + 7,
          signatureWidth / 2, -summaryHeight / 2 + 7,
          signatureWidth / 2, summaryHeight / 2 - 7,
          -signatureWidth / 2, summaryHeight / 2 - 7,
          -signatureWidth / 2, -summaryHeight / 2 + 16
        ]);
        nodes.signatureBg.fill({ color: 0x0b1026, alpha: 0.88 });
        nodes.signatureBg.stroke({ color: data.fusions.length ? 0xd86bff : 0x37f5ff, width: 1, alpha: 0.42 });
      }
      let categoryX = -summaryWidth / 2 + (compact ? 92 : 126);
      const categoryLimit = signatureVisible ? summaryWidth / 2 - signatureWidth - 24 : summaryWidth / 2 - 18;
      const gap = compact ? 6 : 9;
      const moduleWidth = Math.max(compact ? 58 : 106, (categoryLimit - categoryX - gap * Math.max(0, activeCategories.length - 1)) / Math.max(1, activeCategories.length));
      activeCategories.forEach((node) => {
        const nodeIndex = nodes.categoryNodes.indexOf(node);
        const bgNode = nodes.categoryBgNodes[nodeIndex];
        const countNode = nodes.categoryCountNodes[nodeIndex];
        const meterNode = nodes.categoryMeterNodes[nodeIndex];
        const count = data.counts[node._category] || 0;
        const installing = installingCategory === node._category;
        const chipWidth = Math.max(48, moduleWidth);
        const chipHeight = compact ? 27 : 56;
        const chamferSize = compact ? 5 : 8;
        bgNode.clear();
        bgNode.poly([
          -chipWidth / 2 + chamferSize, -chipHeight / 2,
          chipWidth / 2, -chipHeight / 2,
          chipWidth / 2, chipHeight / 2 - chamferSize,
          chipWidth / 2 - chamferSize, chipHeight / 2,
          -chipWidth / 2, chipHeight / 2,
          -chipWidth / 2, -chipHeight / 2 + chamferSize
        ]);
        bgNode.fill({ color: count > 0 ? 0x071b2a : 0x050d16, alpha: count > 0 ? 0.96 : 0.78 });
        bgNode.stroke({
          color: installing ? 0xffffff : TACTICAL_DRAFT_CATEGORY_COLORS[node._category],
          width: installing ? 3 : count > 0 ? 1.5 : 1,
          alpha: installing ? 0.96 : count > 0 ? 0.72 : 0.22
        });
        bgNode.position.set(categoryX + chipWidth / 2, 0);
        node.anchor.set(0, 0.5);
        node.position.set(categoryX + (compact ? 8 : 12), compact ? -4 : -8);
        node.alpha = count > 0 ? 1 : 0.44;
        node.scale.set(Math.min(1, (chipWidth - (compact ? 34 : 54)) / Math.max(1, node.width)));
        countNode.position.set(categoryX + chipWidth - (compact ? 7 : 12), compact ? -4 : -6);
        countNode.alpha = count > 0 ? 1 : 0.28;
        meterNode.clear();
        const segmentCount = compact ? 3 : 5;
        const meterGap = 3;
        const meterWidth = chipWidth - (compact ? 16 : 24);
        const segmentWidth = (meterWidth - meterGap * (segmentCount - 1)) / segmentCount;
        for (let segment = 0; segment < segmentCount; segment += 1) {
          const segmentX = -meterWidth / 2 + segment * (segmentWidth + meterGap);
          meterNode.roundRect(segmentX, 0, segmentWidth, compact ? 2 : 3, 1);
          meterNode.fill({
            color: segment < count ? TACTICAL_DRAFT_CATEGORY_COLORS[node._category] : 0x27404d,
            alpha: segment < count ? 0.88 : 0.3
          });
        }
        meterNode.position.set(categoryX + chipWidth / 2, compact ? 7 : 13);
        meterNode.visible = !installing;
        if (installing) {
          nodes.installLabel.text = translateText(state.installingName || '');
          nodes.installLabel.style.fontSize = compact ? 7 : 9;
          nodes.installLabel.style.fill = TACTICAL_DRAFT_CATEGORY_COLORS[node._category];
          nodes.installLabel.position.set(categoryX + chipWidth / 2, compact ? 7 : 14);
          nodes.installLabel.scale.set(1);
          nodes.installLabel.updateText?.(false);
          nodes.installLabel.scale.set(Math.min(1, (chipWidth - 12) / Math.max(1, nodes.installLabel.width)));
          nodes.installLabel.visible = true;
        }
        categoryX += chipWidth + gap;
      });
      if (!installingCategory) nodes.installLabel.visible = false;
      summary._visualLanguage = 'active_build_command_deck_v4';
    }

    const cardWidth = compact ? Math.min(width - 42, 650) : Math.min(420, (width - 140) / 3);
    const cardHeight = compact ? Math.max(112, Math.min(132, (height - 192) / 3 - 8)) : Math.min(460, Math.max(410, height - 420));
    const cardTop = compact ? 178 : 246;

    if (state.rescan && state.hold && state.ban) {
      const controlWidth = compact ? Math.min(148, Math.max(92, (width - 48) / 3)) : 190;
      const controlHeight = compact ? 28 : 38;
      state.rescan._draftLayout = { width: controlWidth, height: controlHeight };
      state.hold._draftLayout = { width: controlWidth, height: controlHeight };
      state.ban._draftLayout = { width: controlWidth, height: controlHeight };
      const controlGap = compact ? 8 : 12;
      const controlsWidth = controlWidth * 3 + controlGap * 2;
      const controlY = compact
        ? (state.scoreRouteOfferId ? 118 : 112)
        : Math.min(height - 30, cardTop + cardHeight + 42);
      state.rescan.position.set(width / 2 - controlsWidth / 2 + controlWidth / 2, controlY);
      state.hold.position.set(width / 2, controlY);
      state.ban.position.set(width / 2 + controlsWidth / 2 - controlWidth / 2, controlY);
      state.rescan.hitArea = new PIXI.Rectangle(-controlWidth / 2, -controlHeight / 2, controlWidth, controlHeight);
      state.hold.hitArea = new PIXI.Rectangle(-controlWidth / 2, -controlHeight / 2, controlWidth, controlHeight);
      state.ban.hitArea = new PIXI.Rectangle(-controlWidth / 2, -controlHeight / 2, controlWidth, controlHeight);
      this.redrawTacticalDraftRescan();
      this.redrawTacticalDraftHold();
      this.redrawTacticalDraftBan();
    }

    state.cards.forEach((card, index) => {
      card.position.set(
        compact ? width / 2 : width / 2 + (index - 1) * (cardWidth + 28),
        cardTop + cardHeight / 2 + (compact ? index * (cardHeight + 24) : 0)
      );
      card.hitArea = new PIXI.Rectangle(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
      card._draftLayout = { width: cardWidth, height: cardHeight, compact };
      const nodes = card._nodes;
      const hasFusionBlueprint = Boolean(card._offer?.fusionBlueprints?.length);
      const fitTextWidth = (node, maxWidth, minimumScale = 0.55) => {
        if (!node) return;
        node.scale.set(1);
        node.updateText?.(false);
        node.scale.set(Math.min(1, Math.max(minimumScale, maxWidth / Math.max(1, node.width))));
      };
      if (compact) {
        nodes.category.anchor.set(0, 0.5);
        nodes.category.position.set(-cardWidth / 2 + 86, -cardHeight / 2 + 17);
        fitTextWidth(nodes.category, Math.min(150, cardWidth * 0.28), 0.58);
        nodes.categoryBadge.position.set(nodes.category.x + nodes.category.width / 2, nodes.category.y);
        nodes.categoryBadge._pillLayout = { width: nodes.category.width + 18, height: 19 };
        nodes.stackLabel.style.fontSize = 8;
        nodes.stackLabel.position.set(cardWidth / 2 - 42, -cardHeight / 2 + 17);
        fitTextWidth(nodes.stackLabel, 76, 0.6);
        nodes.stackBadge.position.copyFrom(nodes.stackLabel.position);
        nodes.stackBadge._pillLayout = { width: nodes.stackLabel.width + 14, height: 19 };
        nodes.scoreRouteBadge.position.set(cardWidth / 2 - 58, -cardHeight / 2 + 17);
        nodes.scoreRouteBadgeText.style.fontSize = 8;
        if (nodes.icon) {
          nodes.icon.position.set(-cardWidth / 2 + 46, 0);
          const iconWidth = nodes.icon.texture?.width || nodes.icon.width || 60;
          const iconHeight = nodes.icon.texture?.height || nodes.icon.height || 60;
          nodes.icon.scale.set(Math.min(1, 52 / Math.max(1, iconWidth, iconHeight)));
        }
        nodes.name.anchor.set(0, 0.5);
        nodes.name.style.fontSize = 17;
        nodes.name.position.set(-cardWidth / 2 + 86, -cardHeight / 2 + 39);
        nodes.description.anchor.set(0, 0.5);
        nodes.description.style.fontSize = 11;
        nodes.description.style.align = 'left';
        nodes.description.style.wordWrapWidth = hasFusionBlueprint ? Math.max(175, cardWidth * 0.46) : cardWidth - 190;
        nodes.description.position.set(-cardWidth / 2 + 86, -2);
        const compactImpactWidth = hasFusionBlueprint ? Math.max(170, cardWidth * 0.34) : Math.min(270, cardWidth - 210);
        const compactImpactX = -cardWidth / 2 + 86 + compactImpactWidth / 2;
        const compactImpactY = cardHeight / 2 - 44;
        nodes.impactBadge.position.set(compactImpactX, compactImpactY);
        nodes.impactBadge._pillLayout = { width: compactImpactWidth, height: 30 };
        nodes.impactLabel.anchor.set(0.5);
        nodes.impactLabel.style.fontSize = 7;
        nodes.impactLabel.position.set(compactImpactX, compactImpactY - 6);
        fitTextWidth(nodes.impactLabel, compactImpactWidth - 16, 0.56);
        nodes.impactValue.anchor.set(0.5);
        nodes.impactValue.style.fontSize = 10;
        nodes.impactValue.position.set(compactImpactX, compactImpactY + 7);
        fitTextWidth(nodes.impactValue, compactImpactWidth - 16, 0.58);
        nodes.doctrineTitle.visible = false;
        nodes.doctrineBadge.position.set(-cardWidth / 2 + 86 + Math.min(230, cardWidth * 0.43) / 2, cardHeight / 2 - 18);
        nodes.doctrineBadge._pillLayout = { width: Math.min(230, cardWidth * 0.43), height: 18 };
        nodes.doctrine.anchor.set(0, 0.5);
        nodes.doctrine.style.fontSize = 7;
        nodes.doctrine.position.set(-cardWidth / 2 + 94, cardHeight / 2 - 18);
        fitTextWidth(nodes.doctrine, Math.min(214, cardWidth * 0.4), 0.54);
        nodes.permanenceBadge.position.set(-cardWidth / 2 + 86 + Math.min(230, cardWidth * 0.43) / 2, cardHeight / 2 - 5);
        nodes.permanenceBadge._pillLayout = { width: Math.min(230, cardWidth * 0.43), height: 15 };
        nodes.permanence.anchor.set(0, 0.5);
        nodes.permanence.style.fontSize = 7;
        nodes.permanence.position.set(-cardWidth / 2 + 94, cardHeight / 2 - 5);
        fitTextWidth(nodes.permanence, Math.min(214, cardWidth * 0.4), 0.54);
        nodes.holdBadge.position.set(cardWidth / 2 - 98, -cardHeight / 2 + 17);
        nodes.choose.anchor.set(1, 0.5);
        nodes.choose.position.set(cardWidth / 2 - 16, cardHeight / 2 - 13);
        nodes.choose.style.fontSize = 11;
        if (hasFusionBlueprint) {
          const badgeWidth = Math.min(208, Math.max(156, cardWidth * 0.34));
          const badgeHeight = 46;
          const badgeX = cardWidth / 2 - badgeWidth / 2 - 12;
          const badgeY = -cardHeight / 2 + badgeHeight / 2 + 27;
          nodes.fusionBadge.position.set(badgeX, badgeY);
          nodes.fusionBadge._fusionLayout = { width: badgeWidth, height: badgeHeight, compact: true };
          nodes.fusionLabel.style.fontSize = 8;
          nodes.fusionLabel.position.set(badgeX, badgeY - 13);
          nodes.fusionName.style.fontSize = 11;
          nodes.fusionName.position.set(badgeX, badgeY);
          nodes.fusionHint.style.fontSize = 8;
          nodes.fusionHint.position.set(badgeX, badgeY + 13);
          fitTextWidth(nodes.name, badgeX - badgeWidth / 2 - nodes.name.x - 12, 0.62);
          fitTextWidth(nodes.fusionLabel, badgeWidth - 16, 0.62);
          fitTextWidth(nodes.fusionName, badgeWidth - 16, 0.58);
          fitTextWidth(nodes.fusionHint, badgeWidth - 16, 0.5);
        } else {
          fitTextWidth(nodes.name, cardWidth - 190, 0.62);
        }
      } else {
        nodes.choose.anchor.set(0.5);
        nodes.category.anchor.set(0.5);
        nodes.category.position.set(0, -cardHeight / 2 + 24);
        fitTextWidth(nodes.category, cardWidth - 170, 0.58);
        nodes.categoryBadge.position.copyFrom(nodes.category.position);
        nodes.categoryBadge._pillLayout = { width: nodes.category.width + 24, height: 22 };
        nodes.stackLabel.style.fontSize = 9;
        nodes.stackLabel.position.set(cardWidth / 2 - 48, -cardHeight / 2 + 24);
        fitTextWidth(nodes.stackLabel, 82, 0.6);
        nodes.stackBadge.position.copyFrom(nodes.stackLabel.position);
        nodes.stackBadge._pillLayout = { width: nodes.stackLabel.width + 16, height: 22 };
        nodes.scoreRouteBadge.position.set(cardWidth / 2 - 64, -cardHeight / 2 + 26);
        nodes.scoreRouteBadgeText.style.fontSize = 10;
        if (nodes.icon) {
          nodes.icon.position.set(0, -cardHeight / 2 + 72);
          const iconWidth = nodes.icon.texture?.width || nodes.icon.width || 60;
          const iconHeight = nodes.icon.texture?.height || nodes.icon.height || 60;
          nodes.icon.scale.set(Math.min(1.2, 80 / Math.max(1, iconWidth, iconHeight)));
        }
        nodes.name.anchor.set(0.5);
        nodes.name.style.fontSize = 24;
        nodes.name.position.set(0, -cardHeight / 2 + 132);
        fitTextWidth(nodes.name, cardWidth - 36, 0.62);
        nodes.description.anchor.set(0.5);
        nodes.description.style.fontSize = 16;
        nodes.description.style.align = 'center';
        nodes.description.style.wordWrapWidth = cardWidth - 48;
        nodes.description.position.set(0, -cardHeight / 2 + 184);
        const impactY = -cardHeight / 2 + 252;
        nodes.impactBadge.position.set(0, impactY);
        nodes.impactBadge._pillLayout = {
          width: cardWidth - 52,
          height: card._offer?.statPreview?.kind === 'stat' ? 50 : 30
        };
        nodes.impactLabel.anchor.set(0.5);
        nodes.impactLabel.style.fontSize = 9;
        nodes.impactLabel.position.set(0, impactY + (card._offer?.statPreview?.kind === 'stat' ? -10 : 0));
        fitTextWidth(nodes.impactLabel, cardWidth - 76, 0.58);
        nodes.impactValue.anchor.set(0.5);
        nodes.impactValue.style.fontSize = 16;
        nodes.impactValue.position.set(0, impactY + 11);
        fitTextWidth(nodes.impactValue, cardWidth - 76, 0.62);
        const chooseY = cardHeight / 2 - 20;
        const denseDesktop = cardHeight < 440;
        const doctrineY = impactY + (hasFusionBlueprint
          ? (denseDesktop ? 34 : 46)
          : (denseDesktop ? 52 : 62));
        const fusionY = doctrineY + (denseDesktop ? 42 : 54);
        const permanenceY = hasFusionBlueprint
          ? fusionY + (denseDesktop ? 34 : 48)
          : doctrineY + (denseDesktop ? 42 : 64);
        nodes.doctrineBadge.position.set(0, doctrineY);
        nodes.doctrineBadge._pillLayout = { width: cardWidth - 58, height: 34 };
        nodes.doctrineTitle.visible = true;
        nodes.doctrineTitle.style.fontSize = 7;
        nodes.doctrineTitle.position.set(0, doctrineY - 8);
        nodes.doctrine.anchor.set(0.5);
        nodes.doctrine.style.fontSize = 10;
        nodes.doctrine.position.set(0, doctrineY + 7);
        fitTextWidth(nodes.doctrine, cardWidth - 78, 0.58);
        nodes.permanenceBadge.position.set(0, permanenceY);
        nodes.permanenceBadge._pillLayout = { width: Math.min(cardWidth - 90, nodes.permanence.width + 24), height: 22 };
        nodes.permanence.anchor.set(0.5);
        nodes.permanence.style.fontSize = 10;
        nodes.permanence.position.set(0, permanenceY);
        fitTextWidth(nodes.permanence, cardWidth - 112, 0.58);
        nodes.holdBadge.position.set(cardWidth / 2 - 38, -cardHeight / 2 + 25);
        nodes.choose.position.set(0, chooseY);
        nodes.choose.style.fontSize = 17;
        if (hasFusionBlueprint) {
          const badgeWidth = cardWidth - 40;
          const badgeHeight = 46;
          const badgeX = 0;
          const badgeY = fusionY;
          nodes.fusionBadge.position.set(badgeX, badgeY);
          nodes.fusionBadge._fusionLayout = { width: badgeWidth, height: badgeHeight, compact: false };
          nodes.fusionLabel.style.fontSize = 9;
          nodes.fusionLabel.position.set(badgeX, badgeY - 13);
          nodes.fusionName.style.fontSize = 12;
          nodes.fusionName.position.set(badgeX, badgeY);
          nodes.fusionHint.style.fontSize = 8;
          nodes.fusionHint.position.set(badgeX, badgeY + 13);
          fitTextWidth(nodes.fusionLabel, badgeWidth - 24, 0.62);
          fitTextWidth(nodes.fusionName, badgeWidth - 24, 0.58);
          fitTextWidth(nodes.fusionHint, badgeWidth - 24, 0.5);
        }
      }
      const fieldTexture = GameAssets.getTacticalDraftFieldTexture?.();
      if (GameAssets.isValidTexture(fieldTexture) && nodes.material.texture !== fieldTexture) {
        nodes.material.texture = fieldTexture;
      }
      if (GameAssets.isValidTexture(nodes.material.texture)) {
        nodes.material.width = cardWidth;
        nodes.material.height = cardHeight;
        nodes.material.rotation = 0;
        nodes.material.visible = true;
      } else {
        nodes.material.visible = false;
      }
      const bloomTexture = GameAssets.getPlasmaBloomTexture?.(nodes.artBloom._variant);
      if (GameAssets.isValidTexture(bloomTexture) && nodes.artBloom.texture !== bloomTexture) {
        nodes.artBloom.texture = bloomTexture;
      }
      if (GameAssets.isValidTexture(nodes.artBloom.texture)) {
        const bloomPixels = compact ? 78 : 148;
        const bloomScale = bloomPixels / Math.max(1, nodes.artBloom.texture.width, nodes.artBloom.texture.height);
        nodes.artBloom.position.set(nodes.icon?.x || 0, nodes.icon?.y || (compact ? 0 : -cardHeight / 2 + 72));
        nodes.artBloom.scale.set(bloomScale * (index === 1 ? 1.08 : 1), bloomScale * (index === 2 ? 0.86 : 1));
        nodes.artBloom._baseScaleX = nodes.artBloom.scale.x;
        nodes.artBloom._baseScaleY = nodes.artBloom.scale.y;
        nodes.artBloom.visible = true;
      } else {
        nodes.artBloom.visible = false;
      }
      nodes.chooseBg.position.copyFrom(nodes.choose.position);
      nodes.chooseBg._buttonLayout = {
        width: compact ? Math.min(158, Math.max(112, cardWidth * 0.27)) : Math.min(230, cardWidth - 74),
        height: compact ? 27 : 42,
        align: compact ? 'right' : 'center'
      };
      this.redrawTacticalDraftCard(card);
    });
  }

  redrawTacticalDraftCard(card) {
    const state = this.tacticalDraft;
    const layout = card?._draftLayout;
    const nodes = card?._nodes;
    if (!state?.active || !layout || !nodes) return;
    const focused = card._draftIndex === state.focusIndex;
    const confirmed = card._offer?.id === state.confirmedId;
    const held = card._offer?.id === this.tacticalDraftHeldId;
    const scoreRoute = Boolean(card._offer?.fixedScoreRoute);
    const fusionBlueprint = card._offer?.fusionBlueprints?.[0] || null;
    const completesFusion = Boolean(fusionBlueprint?.completesOnPick);
    const fusionAccent = Number(fusionBlueprint?.color) || 0xff5bd6;
    const categoryAccent = TACTICAL_DRAFT_CATEGORY_COLORS[card._offer?.category] || 0x37f5ff;
    const accent = scoreRoute ? 0xffa84d : categoryAccent;
    const pulse = focused ? 0.5 + Math.sin(state.pulse) * 0.5 : 0;
    nodes.glow.clear();
    nodes.bg.clear();
    const chamfer = layout.compact ? 7 : 12;
    const cardPoints = [
      -layout.width / 2 + chamfer, -layout.height / 2,
      layout.width / 2 - chamfer, -layout.height / 2,
      layout.width / 2, -layout.height / 2 + chamfer,
      layout.width / 2, layout.height / 2 - chamfer,
      layout.width / 2 - chamfer, layout.height / 2,
      -layout.width / 2 + chamfer, layout.height / 2,
      -layout.width / 2, layout.height / 2 - chamfer,
      -layout.width / 2, -layout.height / 2 + chamfer
    ];
    const glowInset = focused || confirmed ? 7 : 4;
    nodes.glow.poly([
      -layout.width / 2 + chamfer - glowInset, -layout.height / 2 - glowInset,
      layout.width / 2 - chamfer + glowInset, -layout.height / 2 - glowInset,
      layout.width / 2 + glowInset, -layout.height / 2 + chamfer - glowInset,
      layout.width / 2 + glowInset, layout.height / 2 - chamfer + glowInset,
      layout.width / 2 - chamfer + glowInset, layout.height / 2 + glowInset,
      -layout.width / 2 + chamfer - glowInset, layout.height / 2 + glowInset,
      -layout.width / 2 - glowInset, layout.height / 2 - chamfer + glowInset,
      -layout.width / 2 - glowInset, -layout.height / 2 + chamfer - glowInset
    ]);
    nodes.glow.fill({
      color: confirmed ? 0xffd15c : accent,
      alpha: confirmed ? 0.28 : focused ? (scoreRoute ? 0.14 + pulse * 0.12 : 0.08 + pulse * 0.08) : scoreRoute ? 0.045 : 0
    });
    nodes.bg.poly(cardPoints);
    nodes.bg.fill({
      color: confirmed ? 0x102616 : scoreRoute ? (focused ? 0x241609 : 0x160f08) : focused ? 0x071d2f : 0x04111f,
      alpha: 0.96
    });
    nodes.bg.poly(cardPoints);
    nodes.bg.stroke({
      color: confirmed ? 0xffef7e : held ? 0xffd15c : scoreRoute ? 0xffa84d : focused ? 0xffffff : accent,
      width: confirmed ? 3 : held ? 2.2 : scoreRoute ? (focused ? 3.2 : 2.2) : focused ? 2.4 : 1.2,
      alpha: focused || confirmed || held || scoreRoute ? 0.96 : 0.55
    });
    nodes.materialMask.clear();
    nodes.materialMask.poly(cardPoints);
    nodes.materialMask.fill({ color: 0xffffff, alpha: 1 });
    nodes.material.alpha = focused ? 0.28 : 0.14;
    nodes.artBloom.alpha = focused ? 0.28 + pulse * 0.12 : 0.13;
    nodes.artBloom.rotation += (focused ? 0.0018 : 0.0005) * (card._draftIndex % 2 ? 1 : -1);
    if (nodes.artBloom._baseScaleX) {
      const bloomPulse = focused ? 1 + pulse * 0.045 : 1;
      nodes.artBloom.scale.set(nodes.artBloom._baseScaleX * bloomPulse, nodes.artBloom._baseScaleY * bloomPulse);
    }
    nodes.bg.rect(-layout.width / 2 + 10, -layout.height / 2 + chamfer + 6, focused || confirmed ? 5 : 2, layout.height - chamfer * 2 - 12);
    nodes.bg.fill({ color: confirmed ? 0xffd15c : accent, alpha: focused || confirmed ? 0.92 : 0.46 });
    nodes.heroPlate.clear();
    if (layout.compact) {
      const plateWidth = 72;
      const plateHeight = layout.height - 28;
      const plateX = -layout.width / 2 + 48;
      nodes.heroPlate.poly([
        plateX - plateWidth / 2 + 7, -plateHeight / 2,
        plateX + plateWidth / 2, -plateHeight / 2,
        plateX + plateWidth / 2, plateHeight / 2 - 7,
        plateX + plateWidth / 2 - 7, plateHeight / 2,
        plateX - plateWidth / 2, plateHeight / 2,
        plateX - plateWidth / 2, -plateHeight / 2 + 7
      ]);
      nodes.heroPlate.fill({ color: 0x020912, alpha: 0.72 });
      nodes.heroPlate.stroke({ color: accent, width: 1.2, alpha: focused ? 0.48 : 0.25 });
    } else {
      const plateWidth = Math.min(176, layout.width - 80);
      const plateHeight = 104;
      const plateY = -layout.height / 2 + 83;
      nodes.heroPlate.poly([
        -plateWidth / 2 + 12, plateY - plateHeight / 2,
        plateWidth / 2, plateY - plateHeight / 2,
        plateWidth / 2, plateY + plateHeight / 2 - 12,
        plateWidth / 2 - 12, plateY + plateHeight / 2,
        -plateWidth / 2, plateY + plateHeight / 2,
        -plateWidth / 2, plateY - plateHeight / 2 + 12
      ]);
      nodes.heroPlate.fill({ color: 0x020912, alpha: 0.62 });
      nodes.heroPlate.stroke({ color: accent, width: 1.2, alpha: focused ? 0.46 : 0.22 });
    }
    nodes.dataRail.clear();
    const railSegments = 7;
    const activeSegments = Math.min(railSegments, 2 + (Number(card._offer?.currentStacks) || 0) * 2);
    for (let index = 0; index < railSegments; index += 1) {
      const railY = -layout.height / 2 + 18 + index * Math.max(8, (layout.height - 36) / railSegments);
      nodes.dataRail.roundRect(-layout.width / 2 + (focused ? 18 : 16), railY, index < activeSegments ? (focused ? 20 : 14) : 7, 2, 1);
      nodes.dataRail.fill({ color: index < activeSegments ? accent : 0x536572, alpha: index < activeSegments ? 0.66 : 0.22 });
    }
    const drawPill = (graphic, pillLayout, { color = accent, fill = 0x071724, alpha = 0.82, width = 1 } = {}) => {
      if (!graphic || !pillLayout) return;
      graphic.clear();
      graphic.roundRect(-pillLayout.width / 2, -pillLayout.height / 2, pillLayout.width, pillLayout.height, pillLayout.height / 2);
      graphic.fill({ color: fill, alpha });
      graphic.roundRect(-pillLayout.width / 2, -pillLayout.height / 2, pillLayout.width, pillLayout.height, pillLayout.height / 2);
      graphic.stroke({ color, width, alpha: focused ? 0.86 : 0.48 });
    };
    drawPill(nodes.categoryBadge, nodes.categoryBadge._pillLayout, { color: accent, fill: 0x071724, alpha: 0.92 });
    nodes.category.style.fill = scoreRoute ? '#ffcf86' : accent;
    nodes.stackBadge.visible = !scoreRoute;
    nodes.stackLabel.visible = !scoreRoute;
    if (!scoreRoute) {
      drawPill(nodes.stackBadge, nodes.stackBadge._pillLayout, {
        color: card._offer?.currentStacks > 0 ? 0xffd15c : 0x6d8794,
        fill: card._offer?.currentStacks > 0 ? 0x241b08 : 0x09131c,
        alpha: 0.9
      });
      nodes.stackLabel.style.fill = card._offer?.currentStacks > 0 ? '#fff3a0' : '#b7d4df';
    }
    drawPill(nodes.impactBadge, nodes.impactBadge._pillLayout, {
      color: card._impactKind === 'capped' ? 0xffd15c : card._impactKind === 'stat' ? 0x37f5ff : 0x536572,
      fill: 0x06131f,
      alpha: 0.9
    });
    nodes.impactValue.visible = card._impactKind === 'stat' && Boolean(nodes.impactValue.text);
    nodes.impactLabel.style.fill = card._impactKind === 'capped'
      ? '#fff3a0'
      : card._impactKind === 'stat'
        ? '#8df7ff'
        : '#9fb6c0';
    drawPill(nodes.doctrineBadge, nodes.doctrineBadge._pillLayout, {
      color: Number(card._offer?.doctrineProjection?.after?.color) || accent,
      fill: 0x081421,
      alpha: 0.84
    });
    drawPill(nodes.permanenceBadge, nodes.permanenceBadge._pillLayout, {
      color: scoreRoute ? 0xffa84d : 0x8d7d55,
      fill: scoreRoute ? 0x241609 : 0x17170d,
      alpha: 0.82
    });
    nodes.fusionBadge.visible = Boolean(fusionBlueprint);
    nodes.fusionLabel.visible = Boolean(fusionBlueprint);
    nodes.fusionName.visible = Boolean(fusionBlueprint);
    nodes.fusionHint.visible = Boolean(fusionBlueprint);
    nodes.fusionBadge.clear();
    if (fusionBlueprint && nodes.fusionBadge._fusionLayout) {
      const fusionLayout = nodes.fusionBadge._fusionLayout;
      const badgeWidth = fusionLayout.width;
      const badgeHeight = fusionLayout.height;
      const badgeAlpha = completesFusion ? 0.95 : focused ? 0.88 : 0.76;
      nodes.fusionBadge.roundRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, 6);
      nodes.fusionBadge.fill({ color: completesFusion ? 0x24122e : 0x071d2f, alpha: 0.96 });
      nodes.fusionBadge.roundRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, 6);
      nodes.fusionBadge.stroke({
        color: completesFusion ? 0xffef7e : fusionAccent,
        width: completesFusion ? 2.2 + pulse * 0.8 : focused ? 1.8 : 1.2,
        alpha: Math.min(1, badgeAlpha + pulse * 0.12)
      });
      const nodeX = badgeWidth / 2 - 11;
      nodes.fusionBadge.moveTo(-nodeX + 5, 0);
      nodes.fusionBadge.lineTo(-badgeWidth / 2 + 3, 0);
      nodes.fusionBadge.moveTo(nodeX - 5, 0);
      nodes.fusionBadge.lineTo(badgeWidth / 2 - 3, 0);
      nodes.fusionBadge.stroke({ color: fusionAccent, width: 1.2, alpha: 0.72 });
      for (const x of [-nodeX, nodeX]) {
        const core = completesFusion ? 4.2 : 3.2;
        nodes.fusionBadge.poly([x, -core, x + core, 0, x, core, x - core, 0]);
        nodes.fusionBadge.fill({ color: completesFusion ? 0xffef7e : fusionAccent, alpha: 0.96 });
        const halo = completesFusion ? 7.4 : 6.2;
        nodes.fusionBadge.poly([x, -halo, x + halo, 0, x, halo, x - halo, 0]);
        nodes.fusionBadge.stroke({ color: fusionAccent, width: 1, alpha: 0.52 + pulse * 0.22 });
      }
      nodes.fusionLabel.style.fill = completesFusion ? '#fff3a0' : '#8df7ff';
      nodes.fusionHint.style.fill = completesFusion ? '#d8ffc8' : '#c8f7ff';
    }
    nodes.scoreRouteBadge.visible = scoreRoute;
    nodes.scoreRouteBadgeBg.clear();
    if (scoreRoute) {
      const badgeWidth = layout.compact ? 104 : 118;
      const badgeHeight = layout.compact ? 20 : 24;
      nodes.scoreRouteBadgeBg.roundRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, 5);
      nodes.scoreRouteBadgeBg.fill({ color: 0x2a1406, alpha: 0.96 });
      nodes.scoreRouteBadgeBg.stroke({
        color: focused ? 0xffef7e : 0xffa84d,
        width: focused ? 1.8 : 1.2,
        alpha: 0.9
      });
      for (let index = 0; index < 4; index += 1) {
        const x = -badgeWidth / 2 + 9 + index * 5;
        const size = index === 0 ? 3.4 : 2.4;
        nodes.scoreRouteBadgeBg.rect(x - size / 2, -size / 2, size, size);
        nodes.scoreRouteBadgeBg.fill({ color: index % 2 ? 0xffd15c : 0xffffff, alpha: 0.72 + pulse * 0.22 });
      }
      nodes.scoreRouteBadgeText.style.fill = focused ? '#ffffff' : '#fff3a0';
      nodes.scoreRouteBadgeText.scale.set(1);
      nodes.scoreRouteBadgeText.updateText?.(false);
      nodes.scoreRouteBadgeText.scale.set(Math.min(1, (badgeWidth - 38) / Math.max(1, nodes.scoreRouteBadgeText.width)));
    }
    nodes.permanence.style.fill = scoreRoute ? '#ffd15c' : '#fff3a0';
    nodes.choose.text = confirmed
      ? translateText('LOCKED IN')
      : translateText(scoreRoute ? 'TAKE SCORE ROUTE' : 'CHOOSE');
    nodes.choose.style.fill = confirmed ? '#fff3a0' : focused ? '#ffffff' : '#b7d4df';
    nodes.choose.scale.set(1);
    nodes.choose.updateText?.(false);
    const chooseMaxWidth = layout.compact
      ? Math.min(190, layout.width * 0.36)
      : layout.width - 36;
    nodes.choose.scale.set(Math.min(1, Math.max(0.52, chooseMaxWidth / Math.max(1, nodes.choose.width))));
    nodes.chooseBg.clear();
    const chooseLayout = nodes.chooseBg._buttonLayout;
    if (chooseLayout) {
      const buttonWidth = chooseLayout.width;
      const buttonHeight = chooseLayout.height;
      const buttonChamfer = layout.compact ? 6 : 8;
      const buttonCenterX = chooseLayout.align === 'right'
        ? nodes.choose.x - buttonWidth / 2 + 7
        : nodes.choose.x;
      nodes.chooseBg.position.set(buttonCenterX, nodes.choose.y);
      nodes.chooseBg.poly([
        -buttonWidth / 2 + buttonChamfer, -buttonHeight / 2,
        buttonWidth / 2, -buttonHeight / 2,
        buttonWidth / 2, buttonHeight / 2 - buttonChamfer,
        buttonWidth / 2 - buttonChamfer, buttonHeight / 2,
        -buttonWidth / 2, buttonHeight / 2,
        -buttonWidth / 2, -buttonHeight / 2 + buttonChamfer
      ]);
      nodes.chooseBg.fill({
        color: confirmed ? 0x39401a : focused ? accent : 0x071724,
        alpha: confirmed ? 0.92 : focused ? 0.78 + pulse * 0.12 : 0.86
      });
      nodes.chooseBg.stroke({
        color: confirmed ? 0xffef7e : focused ? 0xffffff : accent,
        width: focused || confirmed ? 1.8 : 1,
        alpha: focused || confirmed ? 0.94 : 0.42
      });
      if (!layout.compact) {
        for (const side of [-1, 1]) {
          const x = side * (buttonWidth / 2 - 15);
          nodes.chooseBg.moveTo(x - side * 5, -4);
          nodes.chooseBg.lineTo(x, 0);
          nodes.chooseBg.lineTo(x - side * 5, 4);
        }
        nodes.chooseBg.stroke({ color: focused ? 0xffffff : accent, width: 1.4, alpha: focused ? 0.82 : 0.36 });
      }
    }
    nodes.holdBadge.visible = held && !scoreRoute;
    nodes.holdBadge.style.fill = '#fff3a0';
    if (held) {
      nodes.holdBadge.text = translateText('HELD');
      nodes.holdBadge.style.fill = '#fff3a0';
    }
    card._visualLanguage = 'tactical_command_module_v4';
    card.scale.set(focused && !layout.compact ? 1.015 : 1);
  }

  redrawTacticalDraftRescan() {
    const state = this.tacticalDraft;
    const control = state?.rescan;
    const layout = control?._draftLayout;
    const nodes = control?._nodes;
    if (!state?.active || !layout || !nodes) return;
    const available = state.rescansRemaining > 0 && !state.confirmedId;
    nodes.bg.clear();
    nodes.bg.roundRect(-layout.width / 2, -layout.height / 2, layout.width, layout.height, 5);
    nodes.bg.fill({ color: available ? 0x082338 : 0x07111b, alpha: 0.94 });
    nodes.bg.roundRect(-layout.width / 2, -layout.height / 2, layout.width, layout.height, 5);
    nodes.bg.stroke({ color: available ? 0x37f5ff : 0x536572, width: 1.2, alpha: available ? 0.76 : 0.36 });
    nodes.label.text = available
      ? translateText('R / Y  RESCAN ({count})', { count: state.rescansRemaining })
      : translateText('RESCAN USED');
    nodes.label.scale.set(1);
    nodes.label.updateText?.(false);
    nodes.label.scale.set(Math.min(1, Math.max(0.62, (layout.width - 18) / Math.max(1, nodes.label.width))));
    nodes.label.style.fill = available ? '#d8f7ff' : '#71848f';
    control.alpha = available ? 1 : 0.68;
    control.cursor = available ? 'pointer' : 'default';
  }

  showTacticalScoreRouteRestriction(action = 'hold') {
    const state = this.tacticalDraft;
    const offer = state?.offers?.[state.focusIndex];
    if (!state?.active || !offer?.fixedScoreRoute || state.confirmedId) return false;
    const message = translateText(action === 'ban'
      ? 'This one-time score route cannot be banned. Choose it now or leave it behind.'
      : 'This one-time score route cannot be held. Choose it now or leave it behind.');
    state.subtitle.text = message;
    state.lastScoreRouteRestriction = {
      action,
      message,
      at: Date.now()
    };
    if (this.tacticalScoreRouteRestrictionTimeout) {
      clearTimeout(this.tacticalScoreRouteRestrictionTimeout);
    }
    this.tacticalScoreRouteRestrictionTimeout = setTimeout(() => {
      this.tacticalScoreRouteRestrictionTimeout = null;
      if (this.tacticalDraft === state && state.active && !state.confirmedId && state.scoreRouteDefaultSubtitle) {
        state.subtitle.text = state.scoreRouteDefaultSubtitle;
      }
    }, 1600);
    AudioManager.playSfx('ui_error', { volume: 0.34, minIntervalMs: 80 });
    return false;
  }

  redrawTacticalDraftHold() {
    const state = this.tacticalDraft;
    const control = state?.hold;
    const layout = control?._draftLayout;
    const nodes = control?._nodes;
    if (!state?.active || !layout || !nodes) return;
    const focusedOffer = state.offers?.[state.focusIndex] || null;
    const focusedId = focusedOffer?.id || null;
    const scoreRoute = Boolean(focusedOffer?.fixedScoreRoute);
    const held = Boolean(focusedId && focusedId === this.tacticalDraftHeldId);
    const available = Boolean(focusedId && !scoreRoute && !state.confirmedId && state.inputArmed);
    nodes.bg.clear();
    nodes.bg.roundRect(-layout.width / 2, -layout.height / 2, layout.width, layout.height, 5);
    nodes.bg.fill({ color: scoreRoute ? 0x241609 : held ? 0x35260b : available ? 0x16263a : 0x07111b, alpha: 0.94 });
    nodes.bg.roundRect(-layout.width / 2, -layout.height / 2, layout.width, layout.height, 5);
    nodes.bg.stroke({
      color: scoreRoute ? 0xffa84d : held ? 0xffd15c : available ? 0xffef7e : 0x536572,
      width: scoreRoute || held ? 1.8 : 1.2,
      alpha: scoreRoute || available || held ? 0.82 : 0.36
    });
    nodes.label.text = scoreRoute
      ? translateText('CANNOT HOLD')
      : held
        ? translateText('HELD')
        : translateText('L / X  HOLD');
    nodes.label.scale.set(1);
    nodes.label.updateText?.(false);
    nodes.label.scale.set(Math.min(1, Math.max(0.62, (layout.width - 18) / Math.max(1, nodes.label.width))));
    nodes.label.style.fill = scoreRoute ? '#ffcf86' : held ? '#fff3a0' : available ? '#f6e7a6' : '#71848f';
    control.alpha = scoreRoute || available || held ? 1 : 0.68;
    control.cursor = available ? 'pointer' : 'default';
  }

  redrawTacticalDraftBan() {
    const state = this.tacticalDraft;
    const control = state?.ban;
    const layout = control?._draftLayout;
    const nodes = control?._nodes;
    if (!state?.active || !layout || !nodes) return;
    const focusedOffer = state.offers?.[state.focusIndex] || null;
    const focusedId = focusedOffer?.id || null;
    const scoreRoute = Boolean(focusedOffer?.fixedScoreRoute);
    const available = Boolean(focusedId && !scoreRoute && !state.confirmedId && state.inputArmed && state.bansRemaining > 0);
    nodes.bg.clear();
    nodes.bg.roundRect(-layout.width / 2, -layout.height / 2, layout.width, layout.height, 5);
    nodes.bg.fill({ color: scoreRoute ? 0x241609 : available ? 0x311020 : 0x07111b, alpha: 0.94 });
    nodes.bg.roundRect(-layout.width / 2, -layout.height / 2, layout.width, layout.height, 5);
    nodes.bg.stroke({
      color: scoreRoute ? 0xffa84d : available ? 0xff426f : 0x536572,
      width: scoreRoute ? 1.8 : 1.2,
      alpha: scoreRoute || available ? 0.82 : 0.36
    });
    nodes.label.text = scoreRoute
      ? translateText('CANNOT BAN')
      : available
        ? translateText('B / RB  BAN ({count})', { count: state.bansRemaining })
        : translateText('BANS USED');
    nodes.label.scale.set(1);
    nodes.label.updateText?.(false);
    nodes.label.scale.set(Math.min(1, Math.max(0.56, (layout.width - 18) / Math.max(1, nodes.label.width))));
    nodes.label.style.fill = scoreRoute ? '#ffcf86' : available ? '#ffb0c4' : '#71848f';
    control.alpha = scoreRoute || available ? 1 : 0.68;
    control.cursor = available ? 'pointer' : 'default';
  }

  banTacticalDraftOffer(source = 'unknown') {
    const state = this.tacticalDraft;
    if (!state?.active || state.confirmedId || !state.inputArmed) return false;
    const offer = state.offers?.[state.focusIndex];
    if (offer?.fixedScoreRoute) return this.showTacticalScoreRouteRestriction('ban');
    if (state.bansRemaining <= 0) return false;
    if (!offer || this.tacticalDraftBannedIds.includes(offer.id)) return false;
    this.tacticalDraftBannedIds.push(offer.id);
    if (this.tacticalDraftHeldId === offer.id) this.tacticalDraftHeldId = null;
    const previousIds = state.offers.map((entry) => entry.id);
    const offers = this.decorateTacticalDraftOffers(buildTacticalDraftOffers({
      seed: `${this.game?.contentDirector?.seed || `run-${this.game?.runStartedAtMs || 0}`}:ban:${this.tacticalDraftBannedIds.length}`,
      sectorCleared: state.sectorCleared,
      selectedIds: this.player?.runAugmentIds || [],
      consumedIds: this.player?.consumedRunAugmentIds || [],
      lives: Number(this.game?.lives) || 0,
      maxLives: Number(this.game?.maxLives) || MAX_PLAYER_LIVES,
      baseShotCount: Number(this.player?.weaponProfile?.bullets) || 1,
      activePowerupType: this.player?.activePowerup?.type || null,
      runTheme: this.game?.contentDirector?.runTheme?.id || null,
      excludedIds: previousIds,
      ineffectiveIds: this.getIneffectiveTacticalDraftOfferIds(),
      bannedIds: this.tacticalDraftBannedIds,
      heldId: this.tacticalDraftHeldId
    }));
    if (offers.length < 3) {
      this.tacticalDraftBannedIds.pop();
      return false;
    }
    state.cards.forEach((card) => {
      if (card.parent) card.parent.removeChild(card);
      card.destroy?.({ children: true });
    });
    state.offers = offers;
    state.cards = offers.map((entry, index) => this.createTacticalDraftCard(entry, index));
    state.cards.forEach((card) => state.overlay.addChild(card));
    state.bansRemaining -= 1;
    this.tacticalDraftBansRemaining = state.bansRemaining;
    state.initialFocusIndex = this.getInitialTacticalDraftFocusIndex(offers);
    state.focusIndex = state.initialFocusIndex;
    state.lastBannedId = offer.id;
    state.lastBanSource = source;
    this.layoutTacticalDraft();
    this.setTacticalDraftFocus(state.initialFocusIndex, { silent: true });
    this.scheduleTacticalBossBanter(offers[state.initialFocusIndex]?.id, { delayMs: 680, context: 'draft' });
    AudioManager.playSfx('ui_error', { volume: 0.34, minIntervalMs: 80 });
    return true;
  }

  toggleTacticalDraftHold(source = 'unknown') {
    const state = this.tacticalDraft;
    if (!state?.active || state.confirmedId || !state.inputArmed) return false;
    const offer = state.offers?.[state.focusIndex];
    if (!offer) return false;
    if (offer.fixedScoreRoute) return this.showTacticalScoreRouteRestriction('hold');
    this.tacticalDraftHeldId = this.tacticalDraftHeldId === offer.id ? null : offer.id;
    state.offers.forEach((entry) => { entry.held = entry.id === this.tacticalDraftHeldId; });
    state.cards.forEach((card) => this.redrawTacticalDraftCard(card));
    this.redrawTacticalDraftHold();
    state.lastHoldSource = source;
    playMenuConfirmSfx(0.24);
    return true;
  }

  rescanTacticalDraft(source = 'unknown') {
    const state = this.tacticalDraft;
    if (!state?.active || state.confirmedId || !state.inputArmed || state.rescansRemaining <= 0) return false;
    const previousIds = state.offers.map((offer) => offer.id);
    const nextRescanCount = state.rescanCount + 1;
    const offers = this.decorateTacticalDraftOffers(buildTacticalDraftOffers({
      seed: `${this.game?.contentDirector?.seed || `run-${this.game?.runStartedAtMs || 0}`}:rescan:${nextRescanCount}`,
      sectorCleared: state.sectorCleared,
      selectedIds: this.player?.runAugmentIds || [],
      consumedIds: this.player?.consumedRunAugmentIds || [],
      lives: Number(this.game?.lives) || 0,
      maxLives: Number(this.game?.maxLives) || MAX_PLAYER_LIVES,
      baseShotCount: Number(this.player?.weaponProfile?.bullets) || 1,
      activePowerupType: this.player?.activePowerup?.type || null,
      runTheme: this.game?.contentDirector?.runTheme?.id || null,
      excludedIds: previousIds,
      ineffectiveIds: this.getIneffectiveTacticalDraftOfferIds(),
      bannedIds: this.tacticalDraftBannedIds,
      heldId: this.tacticalDraftHeldId
    }));
    if (offers.length < 3) return false;
    state.cards.forEach((card) => {
      if (card.parent) card.parent.removeChild(card);
      card.destroy?.({ children: true });
    });
    state.offers = offers;
    state.cards = offers.map((offer, index) => this.createTacticalDraftCard(offer, index));
    state.cards.forEach((card) => state.overlay.addChild(card));
    state.rescanCount = nextRescanCount;
    state.rescansRemaining -= 1;
    this.tacticalDraftRescansRemaining = state.rescansRemaining;
    this.tacticalDraftRescansUsed += 1;
    state.initialFocusIndex = this.getInitialTacticalDraftFocusIndex(offers);
    state.focusIndex = state.initialFocusIndex;
    state.openedAt = Date.now();
    this.layoutTacticalDraft();
    this.setTacticalDraftFocus(state.initialFocusIndex, { silent: true });
    this.scheduleTacticalBossBanter(offers[state.initialFocusIndex]?.id, { delayMs: 680, context: 'draft' });
    playMenuConfirmSfx(0.3);
    this.redrawTacticalDraftRescan();
    this.redrawTacticalDraftHold();
    this.redrawTacticalDraftBan();
    state.lastRescanSource = source;
    return true;
  }

  setTacticalDraftFocus(index, { silent = false } = {}) {
    const state = this.tacticalDraft;
    if (!state?.active || state.confirmedId) return;
    const next = ((Math.floor(Number(index) || 0) % state.cards.length) + state.cards.length) % state.cards.length;
    if (state.focusIndex === next && !silent) return;
    state.focusIndex = next;
    state.cards.forEach((card) => this.redrawTacticalDraftCard(card));
    this.redrawTacticalDraftHold();
    this.redrawTacticalDraftBan();
    if (!silent) {
      playMenuFocusSfx(0.2);
      this.scheduleTacticalBossBanter(state.offers?.[next]?.id, { context: 'draft' });
    }
  }

  clearPendingTacticalBossBanter({ stopActive = false } = {}) {
    if (this.tacticalBossBanterTimer) {
      clearTimeout(this.tacticalBossBanterTimer);
      this.tacticalBossBanterTimer = null;
    }
    this.pendingTacticalBossBanterId = null;
    this.pendingTacticalBossBanterContext = null;
    this.tacticalBossBanterToken += 1;
    if (stopActive) AudioManager.stopVoiceGroup?.('boss_tactical_inspect');
  }

  getTacticalBossBanterFocusedId(context = 'draft') {
    if (context === 'loadout') {
      const overlay = this.tacticalLoadoutOverlay;
      return overlay?.detailItem?.id || overlay?.cards?.[overlay.focusedCardIndex]?._item?.id || null;
    }
    const state = this.tacticalDraft;
    return state?.active && !state.confirmedId ? state.offers?.[state.focusIndex]?.id || null : null;
  }

  scheduleTacticalBossBanter(augmentId, { delayMs = TACTICAL_BOSS_BANTER_FOCUS_DELAY_MS, context = 'draft' } = {}) {
    const eventName = getTacticalBossBanterEvent(augmentId);
    if (this.getTacticalBossBanterFocusedId(context) !== augmentId || !eventName || AudioManager.isBossVoiceEnabled?.() === false) return false;
    this.clearPendingTacticalBossBanter({ stopActive: true });
    const token = this.tacticalBossBanterToken;
    this.pendingTacticalBossBanterId = augmentId;
    this.pendingTacticalBossBanterContext = context;
    this.tacticalBossBanterTimer = setTimeout(() => {
      this.tacticalBossBanterTimer = null;
      this.tryPlayTacticalBossBanter(augmentId, eventName, token, 0, context);
    }, Math.max(80, Number(delayMs) || TACTICAL_BOSS_BANTER_FOCUS_DELAY_MS));
    return true;
  }

  tryPlayTacticalBossBanter(augmentId, eventName, token, retryCount = 0, context = 'draft') {
    const focusedId = this.getTacticalBossBanterFocusedId(context);
    if (
      token !== this.tacticalBossBanterToken
      || focusedId !== augmentId
      || AudioManager.isBossVoiceEnabled?.() === false
    ) {
      if (token === this.tacticalBossBanterToken) {
        this.pendingTacticalBossBanterId = null;
        this.pendingTacticalBossBanterContext = null;
      }
      return false;
    }

    const audioState = AudioManager.getSettings?.() || {};
    const activeEvents = Array.isArray(audioState.activeVoiceEvents) ? audioState.activeVoiceEvents : [];
    const busyWithOtherVoice = activeEvents.some((entry) => entry?.group !== 'boss_tactical_inspect');
    const lockRemainingMs = Math.max(0, Number(audioState.voicePriorityLock?.remainingMs) || 0);
    if ((busyWithOtherVoice || lockRemainingMs > 0) && retryCount < TACTICAL_BOSS_BANTER_MAX_BUSY_RETRIES) {
      const retryDelayMs = lockRemainingMs > 0
        ? Math.max(420, Math.min(1600, lockRemainingMs + 120))
        : 520;
      this.tacticalBossBanterTimer = setTimeout(() => {
        this.tacticalBossBanterTimer = null;
        this.tryPlayTacticalBossBanter(augmentId, eventName, token, retryCount + 1, context);
      }, retryDelayMs);
      return false;
    }
    if (busyWithOtherVoice || lockRemainingMs > 0) {
      this.pendingTacticalBossBanterId = null;
      this.pendingTacticalBossBanterContext = null;
      return false;
    }

    AudioManager.init();
    const played = AudioManager.playDiegeticVoice(eventName, {
      force: true,
      bypassGlobalCooldown: true,
      bypassEventCooldown: true,
      exclusiveGroup: 'boss_tactical_inspect',
      cooldownMs: 0,
      eventCooldownMs: 0,
      voicePriority: 7,
      duckMs: 1450,
      duckFactor: 0.34,
      volume: 0.94
    });
    this.pendingTacticalBossBanterId = null;
    this.pendingTacticalBossBanterContext = null;
    if (played) {
      this.lastTacticalBossBanterId = augmentId;
      this.lastTacticalBossBanterEvent = eventName;
      this.lastTacticalBossBanterContext = context;
      this.lastTacticalBossBanterAt = Date.now();
    }
    return played;
  }

  updateTacticalDraft(delta = 1) {
    const state = this.tacticalDraft;
    if (!state?.active) return;
    state.pulse += Math.max(0, Number(delta) || 0) * 0.075;
    if (state.material?._baseScale) {
      const materialDrift = Math.sin(state.pulse * 0.22);
      state.material.rotation = materialDrift * 0.0018;
      state.material.scale.set(state.material._baseScale * (1 + materialDrift * 0.004));
      state.material.alpha = (state.compact ? 0.42 : 0.56) + Math.sin(state.pulse * 0.31) * 0.025;
    }
    if (state.buildSummary?._nodes?.material) {
      state.buildSummary._nodes.material.x = Math.sin(state.pulse * 0.27) * 4;
      state.buildSummary._nodes.material.alpha = (state.compact ? 0.3 : 0.4) + Math.sin(state.pulse * 0.42) * 0.035;
    }
    const nav = this.tacticalDraftNavigator.update();
    if (!state.inputArmed) {
      const keyboardHeld = [
        'Space', 'Enter', 'NumpadEnter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyL', 'KeyB', 'a', 'd', 'w', 's', 'l', 'b', 'A', 'D', 'W', 'S', 'L', 'B'
      ].some((key) => this.inputManager?.isKeyPressed?.(key));
      const minimumReadGateOpen = Date.now() - state.openedAt >= 280;
      if (!minimumReadGateOpen || keyboardHeld || nav.active || nav.suppressed) {
        state.cards.forEach((card) => this.redrawTacticalDraftCard(card));
        return;
      }
      state.inputArmed = true;
      this.resetTransientGameplayInput('tactical_draft_armed', { preserveFire: true });
      state.cards.forEach((card) => this.redrawTacticalDraftCard(card));
      return;
    }
    if (state.confirmedId) {
      state.cards.forEach((card) => this.redrawTacticalDraftCard(card));
      this.updateTacticalDraftLockIn();
      return;
    }
    const left = this.inputManager?.consumeKeyPress?.('ArrowLeft', 'KeyA', 'a', 'A');
    const right = this.inputManager?.consumeKeyPress?.('ArrowRight', 'KeyD', 'd', 'D');
    const up = this.inputManager?.consumeKeyPress?.('ArrowUp', 'KeyW', 'w', 'W');
    const down = this.inputManager?.consumeKeyPress?.('ArrowDown', 'KeyS', 's', 'S');
    const confirm = this.inputManager?.consumeKeyPress?.('Enter', 'NumpadEnter', 'Space');
    const rescan = this.inputManager?.consumeKeyPress?.('KeyR', 'r', 'R');
    const hold = this.inputManager?.consumeKeyPress?.('KeyL', 'l', 'L');
    const ban = this.inputManager?.consumeKeyPress?.('KeyB', 'b', 'B');
    if (left || up || nav.pressed.left || nav.pressed.up) this.setTacticalDraftFocus(state.focusIndex - 1);
    if (right || down || nav.pressed.right || nav.pressed.down) this.setTacticalDraftFocus(state.focusIndex + 1);
    if (confirm || nav.pressed.confirm) this.confirmTacticalDraft(state.focusIndex, nav.pressed.confirm ? 'gamepad' : 'keyboard');
    if (rescan || nav.pressed.y) this.rescanTacticalDraft(nav.pressed.y ? 'gamepad' : 'keyboard');
    if (hold || nav.pressed.x) this.toggleTacticalDraftHold(nav.pressed.x ? 'gamepad' : 'keyboard');
    if (ban || nav.pressed.rb) this.banTacticalDraftOffer(nav.pressed.rb ? 'gamepad' : 'keyboard');
    state.cards.forEach((card) => this.redrawTacticalDraftCard(card));
    this.redrawTacticalDraftRescan();
    this.redrawTacticalDraftHold();
    this.redrawTacticalDraftBan();
  }

  updateTacticalDraftLockIn() {
    const state = this.tacticalDraft;
    const burst = state?.lockInBurst;
    const confirmedAt = Number(state?.confirmedAt) || 0;
    const selectedCard = state?.cards?.find((card) => card?._offer?.id === state.confirmedId);
    if (!state?.active || !state.confirmedId || !burst || !selectedCard || !confirmedAt) return;

    const elapsed = Math.max(0, Date.now() - confirmedAt);
    const progress = Math.min(1, elapsed / 560);
    const revealRaw = Math.min(1, elapsed / 135);
    const reveal = 1 - Math.pow(1 - revealRaw, 3);
    const fade = 1 - Math.max(0, (progress - 0.72) / 0.28);
    const accent = Number(selectedCard._offer?.color) || 0x37f5ff;
    const selectedIndex = state.cards.indexOf(selectedCard);
    const selectedOrigin = state.lockInCardOrigins?.[selectedIndex];
    const centerX = Number(selectedOrigin?.x) || selectedCard.position.x;
    const centerY = (Number(selectedOrigin?.y) || selectedCard.position.y) - reveal * 7;
    const cardWidth = Number(selectedCard._draftLayout?.width) || 320;
    const cardHeight = Number(selectedCard._draftLayout?.height) || 340;
    const halfWidth = cardWidth * 0.5 + 8;
    const halfHeight = cardHeight * 0.5 + 8;
    const perimeter = Math.max(1, (halfWidth + halfHeight) * 4);

    burst.visible = true;
    burst.clear();
    if (elapsed < 90) {
      burst.rect(0, 0, this.game.getWidth(), this.game.getHeight());
      burst.fill({ color: 0xffffff, alpha: (1 - elapsed / 90) * 0.055 });
    }

    burst.roundRect(centerX - halfWidth, centerY - halfHeight, halfWidth * 2, halfHeight * 2, 16);
    burst.stroke({ color: accent, width: 3.2, alpha: (0.22 + reveal * 0.58) * fade });
    burst.roundRect(centerX - halfWidth - 7, centerY - halfHeight - 7, halfWidth * 2 + 14, halfHeight * 2 + 14, 20);
    burst.stroke({ color: 0xffffff, width: 1.2, alpha: reveal * 0.3 * fade });

    const cornerLength = Math.min(34, cardWidth * 0.12);
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = centerX + sx * (halfWidth + 13);
      const y = centerY + sy * (halfHeight + 13);
      burst.moveTo(x, y - sy * cornerLength);
      burst.lineTo(x, y);
      burst.lineTo(x - sx * cornerLength, y);
    }
    burst.stroke({ color: accent, width: 4.2, alpha: reveal * fade * 0.78 });

    let traceDistance = (progress * 2.6 * perimeter) % perimeter;
    let traceX = centerX - halfWidth;
    let traceY = centerY - halfHeight;
    let traceAngle = 0;
    const topLength = halfWidth * 2;
    const sideLength = halfHeight * 2;
    if (traceDistance <= topLength) {
      traceX += traceDistance;
    } else if ((traceDistance -= topLength) <= sideLength) {
      traceX = centerX + halfWidth;
      traceY += traceDistance;
      traceAngle = Math.PI / 2;
    } else if ((traceDistance -= sideLength) <= topLength) {
      traceX = centerX + halfWidth - traceDistance;
      traceY = centerY + halfHeight;
      traceAngle = Math.PI;
    } else {
      traceDistance -= topLength;
      traceY = centerY + halfHeight - traceDistance;
      traceAngle = -Math.PI / 2;
    }
    const traceLength = 18 + Math.sin(progress * Math.PI * 7) * 2;
    const traceWidth = 5.5;
    const traceCos = Math.cos(traceAngle);
    const traceSin = Math.sin(traceAngle);
    const traceNormalX = -traceSin;
    const traceNormalY = traceCos;
    burst.poly([
      traceX + traceCos * traceLength * 0.62,
      traceY + traceSin * traceLength * 0.62,
      traceX - traceCos * traceLength * 0.46 + traceNormalX * traceWidth,
      traceY - traceSin * traceLength * 0.46 + traceNormalY * traceWidth,
      traceX - traceCos * traceLength * 0.18,
      traceY - traceSin * traceLength * 0.18,
      traceX - traceCos * traceLength * 0.46 - traceNormalX * traceWidth,
      traceY - traceSin * traceLength * 0.46 - traceNormalY * traceWidth
    ]);
    burst.fill({ color: accent, alpha: reveal * fade * 0.82 });
    burst.moveTo(traceX - traceCos * traceLength * 0.26, traceY - traceSin * traceLength * 0.26);
    burst.lineTo(traceX + traceCos * traceLength * 0.54, traceY + traceSin * traceLength * 0.54);
    burst.stroke({ color: 0xffffff, width: 1.4, alpha: reveal * fade * 0.88 });

    const sparkRadius = Math.max(halfWidth, halfHeight) + 18 + reveal * 18;
    const sparkPattern = [-2.82, -2.05, -0.86, -0.18, 0.61, 1.76, 2.47];
    for (let index = 0; index < sparkPattern.length; index += 1) {
      const angle = sparkPattern[index] + progress * (index % 2 ? -0.22 : 0.32);
      const sparkLength = 8 + (index % 3) * 5;
      const radius = sparkRadius + (index % 2) * 7;
      const startX = centerX + Math.cos(angle) * radius;
      const startY = centerY + Math.sin(angle) * radius;
      const endX = centerX + Math.cos(angle + 0.08) * (radius + sparkLength);
      const endY = centerY + Math.sin(angle + 0.08) * (radius + sparkLength);
      burst.moveTo(startX, startY);
      burst.bezierCurveTo(
        startX + Math.cos(angle + 0.5) * sparkLength * 0.35,
        startY + Math.sin(angle + 0.5) * sparkLength * 0.35,
        endX - Math.cos(angle) * sparkLength * 0.28,
        endY - Math.sin(angle) * sparkLength * 0.28,
        endX,
        endY
      );
    }
    burst.stroke({ color: selectedIndex % 2 === 0 ? accent : 0xffffff, width: 1.6, alpha: reveal * fade * 0.46 });

    state.cards.forEach((card, index) => {
      const selected = card === selectedCard;
      const origin = state.lockInCardOrigins?.[index];
      const direction = Math.sign((Number(origin?.x) || card.x) - centerX) || (index < selectedIndex ? -1 : 1);
      card.x = (Number(origin?.x) || card.x) + (selected ? 0 : direction * reveal * 22);
      card.y = (Number(origin?.y) || card.y) + (selected ? -reveal * 7 : reveal * 4);
      card.alpha = selected ? 1 : Math.max(0.16, 1 - reveal * 0.84);
      if (selected) {
        const punch = Math.sin(Math.min(1, elapsed / 270) * Math.PI);
        const baseScaleX = Number(origin?.scaleX) || 1;
        const baseScaleY = Number(origin?.scaleY) || baseScaleX;
        card.scale.set(baseScaleX * (1 + punch * 0.045), baseScaleY * (1 + punch * 0.045));
      }
    });
    state.rescan.alpha = Math.max(0.18, 1 - reveal * 0.82);
    state.hold.alpha = Math.max(0.18, 1 - reveal * 0.82);
    state.ban.alpha = Math.max(0.18, 1 - reveal * 0.82);
    state.title.scale.set(1 + Math.sin(Math.min(1, elapsed / 270) * Math.PI) * 0.045);
    state.subtitle.alpha = 0.76 + fade * 0.24;
    state.lockInProgress = progress;
  }

  confirmTacticalDraft(index = this.tacticalDraft?.focusIndex || 0, source = 'unknown') {
    const state = this.tacticalDraft;
    if (!state?.active || state.confirmedId) return false;
    if (!state.inputArmed && source !== 'pointer') return false;
    const offer = state.offers[index];
    if (!offer) return false;
    this.clearPendingTacticalBossBanter({ stopActive: true });
    const previousDoctrine = analyzeTacticalDoctrine(this.player?.runAugmentIds || [], this.player?.consumedRunAugmentIds || []);
    const result = this.player?.applyRunAugment?.(offer.id);
    if (!result?.applied) return false;
    const scoreRouteOffer = state.offers.find((entry) => entry.fixedScoreRoute) || null;
    if (scoreRouteOffer) {
      const status = offer.id === scoreRouteOffer.id ? 'taken' : 'closed';
      state.scoreRouteDecision = status;
      this.tacticalScoreRouteDecision = {
        sector: state.sectorCleared,
        offerId: scoreRouteOffer.id,
        selectedId: offer.id,
        status,
        decidedAt: Date.now()
      };
    }
    if (this.tacticalDraftHeldId === offer.id || this.tacticalDraftHeldId === state.heldAtOpenId) {
      this.tacticalDraftHeldId = null;
    }
    state.confirmedId = offer.id;
    state.installingCategory = offer.category;
    state.installingName = offer.displayName || offer.name;
    state.confirmHoldMs = 1000;
    state.result = result;
    state.confirmedAt = Date.now();
    state.lockInCardOrigins = state.cards.map((card) => ({
      x: card.x,
      y: card.y,
      scaleX: card.scale.x,
      scaleY: card.scale.y
    }));
    state.title.text = translateText('LOCKED IN');
    state.subtitle.text = translateText(offer.description);
    const nextDoctrine = analyzeTacticalDoctrine(this.player?.runAugmentIds || [], this.player?.consumedRunAugmentIds || []);
    state.doctrineChanged = nextDoctrine && (
      previousDoctrine?.id !== nextDoctrine.id || previousDoctrine?.stage !== nextDoctrine.stage
    ) ? nextDoctrine : null;
    this.tacticalDraftHistory.push({
      sectorCleared: state.sectorCleared,
      id: offer.id,
      name: offer.displayName || offer.name,
      baseName: offer.name,
      category: offer.category,
      stacks: result.stacks,
      consumed: result.consumed === true,
      fixedScoreRoute: Boolean(offer.fixedScoreRoute),
      scoreRouteDecision: state.scoreRouteDecision || null,
      source
    });
    this.comboWindowMs = COMBO_WINDOW_MS + Math.max(0, Number(this.player?.runAugmentModifiers?.comboWindowBonusMs) || 0);
    this.scorePopupManager?.setComboWindow?.(this.comboWindowMs);
    this.recordThreatDiscovery(offer.id, 'augments', {
      name: offer.displayName || offer.name,
      role: offer.category,
      description: offer.detail || offer.description
    }, { silent: true, scoreBonus: false });
    state.cards.forEach((card) => this.redrawTacticalDraftCard(card));
    this.layoutTacticalDraft();
    this.screenShake?.shake?.(this.game.getWidth() < 620 ? 1.5 : 2.5, 7);
    AudioManager.playSfx(offer.sfx || getPowerupMeta(offer.id)?.sfx || 'powerup', { force: true, volume: 0.88, minIntervalMs: 80 });
    const complete = state.onComplete;
    this.tacticalDraftConfirmTimeout = setTimeout(() => {
      this.tacticalDraftConfirmTimeout = null;
      this.clearTacticalDraft('confirmed');
      this.externalPauseSuppressedUntil = Date.now() + 600;
      if (this.isPaused) this.setPaused(false);
      const status = result.consumed ? translateText('CONSUMED') : translateText('PERMANENT THIS RUN');
      this.enqueueToast(`${translateText(offer.displayName || offer.name)}  ${status}`, {
        fontSize: 18,
        fill: '#fff3a0',
        slot: 'top',
        type: 'tactical_draft',
        duration: 1500,
        priority: 5
      });
      if (state.scoreRouteDecision === 'closed') {
        this.enqueueToast(translateText('SCORE ROUTE CLOSED FOR THIS RUN'), {
          fontSize: 16,
          fill: '#ffcf86',
          slot: 'top',
          type: 'tactical_score_route',
          duration: 1500,
          priority: 6,
          accent: 0xffa84d
        });
      }
      if (state.doctrineChanged) {
        this.enqueueToast(translateText('{name} // {stage}', {
          name: translateText(state.doctrineChanged.name),
          stage: translateText(state.doctrineChanged.stage)
        }), {
          fontSize: 16,
          fill: '#d8f7ff',
          slot: 'top',
          type: 'tactical_doctrine',
          duration: 1300,
          priority: 4
        });
      }
      if (result.newFusions?.length) this.showTacticalFusionUnlock(result.newFusions[0]);
      complete?.();
    }, state.confirmHoldMs);
    return true;
  }

  clearTacticalFusionUnlock(reason = 'cleared') {
    const active = this.activeTacticalFusionUnlock;
    if (!active) return false;
    if (active.ticker && this.game?.app?.ticker) {
      this.game.app.ticker.remove(active.ticker);
      this._activeTickers = (this._activeTickers || []).filter((ticker) => ticker !== active.ticker);
    }
    if (active.container?.parent) active.container.parent.removeChild(active.container);
    active.container?.destroy?.({ children: true });
    if (this.lastTacticalFusionUnlock) {
      this.lastTacticalFusionUnlock.active = false;
      this.lastTacticalFusionUnlock.endedReason = reason;
    }
    this.activeTacticalFusionUnlock = null;
    return true;
  }

  drawTacticalFusionEmblem(graphics, fusion, accent, compact = false) {
    const id = String(fusion?.id || 'fusion');
    const scale = compact ? 0.84 : 1;
    graphics.clear();
    graphics.blendMode = 'add';

    if (id === 'rift_reprisal') {
      for (const side of [-1, 1]) {
        graphics.moveTo(side * 23 * scale, -31 * scale);
        graphics.bezierCurveTo(
          side * 5 * scale, -17 * scale,
          side * 18 * scale, 12 * scale,
          side * 2 * scale, 32 * scale
        );
        graphics.stroke({ color: side < 0 ? accent : 0x66efff, width: 7 * scale, alpha: 0.22 });
        graphics.moveTo(side * 23 * scale, -31 * scale);
        graphics.bezierCurveTo(
          side * 5 * scale, -17 * scale,
          side * 18 * scale, 12 * scale,
          side * 2 * scale, 32 * scale
        );
        graphics.stroke({ color: side < 0 ? 0xffffff : accent, width: 2.2 * scale, alpha: 0.92 });
      }
      graphics.moveTo(-5 * scale, -22 * scale);
      graphics.lineTo(5 * scale, -8 * scale);
      graphics.lineTo(-4 * scale, 7 * scale);
      graphics.lineTo(4 * scale, 22 * scale);
      graphics.stroke({ color: 0xffffff, width: 1.4 * scale, alpha: 0.72 });
    } else if (id === 'drone_constellation') {
      const points = [[0, -30], [-27, 18], [27, 18]];
      graphics.moveTo(points[0][0] * scale, points[0][1] * scale);
      graphics.lineTo(points[1][0] * scale, points[1][1] * scale);
      graphics.lineTo(points[2][0] * scale, points[2][1] * scale);
      graphics.lineTo(points[0][0] * scale, points[0][1] * scale);
      graphics.stroke({ color: 0x66efff, width: 1.4 * scale, alpha: 0.46 });
      points.forEach(([x, y], index) => {
        graphics.poly([
          x * scale, (y - 10) * scale,
          (x + 8) * scale, (y + 7) * scale,
          x * scale, (y + 3) * scale,
          (x - 8) * scale, (y + 7) * scale
        ]);
        graphics.fill({ color: index === 0 ? 0xffffff : accent, alpha: 0.88 });
      });
    } else if (id === 'aegis_reactor') {
      graphics.poly([0, -34, 29, -19, 24, 17, 0, 35, -24, 17, -29, -19].map((value) => value * scale));
      graphics.fill({ color: accent, alpha: 0.12 });
      graphics.stroke({ color: accent, width: 3 * scale, alpha: 0.9 });
      graphics.moveTo(-17 * scale, -12 * scale);
      graphics.bezierCurveTo(-4 * scale, -24 * scale, 16 * scale, -13 * scale, 18 * scale, 2 * scale);
      graphics.bezierCurveTo(17 * scale, 17 * scale, 4 * scale, 25 * scale, -11 * scale, 18 * scale);
      graphics.stroke({ color: 0xffffff, width: 2.2 * scale, alpha: 0.76 });
      graphics.moveTo(-19 * scale, 6 * scale);
      graphics.lineTo(-5 * scale, 6 * scale);
      graphics.lineTo(1 * scale, -5 * scale);
      graphics.lineTo(8 * scale, 11 * scale);
      graphics.lineTo(20 * scale, 11 * scale);
      graphics.stroke({ color: 0x66efff, width: 2.4 * scale, alpha: 0.82 });
    } else {
      graphics.moveTo(0, -35 * scale);
      graphics.lineTo(8 * scale, -9 * scale);
      graphics.lineTo(2 * scale, -13 * scale);
      graphics.lineTo(-7 * scale, 31 * scale);
      graphics.lineTo(-2 * scale, 6 * scale);
      graphics.lineTo(-9 * scale, 10 * scale);
      graphics.closePath();
      graphics.fill({ color: 0xffffff, alpha: 0.88 });
      for (const side of [-1, 1]) {
        graphics.moveTo(side * 31 * scale, -24 * scale);
        graphics.lineTo(side * 18 * scale, -24 * scale);
        graphics.lineTo(side * 18 * scale, -10 * scale);
        graphics.moveTo(side * 31 * scale, 24 * scale);
        graphics.lineTo(side * 18 * scale, 24 * scale);
        graphics.lineTo(side * 18 * scale, 10 * scale);
      }
      graphics.stroke({ color: accent, width: 2.4 * scale, alpha: 0.86 });
    }
    graphics._fusionEmblemId = id;
    return id;
  }

  showTacticalFusionUnlock(fusion) {
    if (!fusion || !this.uiOverlay || !this.game?.app?.ticker) return false;
    this.clearTacticalFusionUnlock('replaced');
    const width = Math.max(480, Number(this.game.getWidth?.() || this.game.app.screen?.width) || 1280);
    const height = Math.max(360, Number(this.game.getHeight?.() || this.game.app.screen?.height) || 720);
    const compact = width < 760 || height < 560;
    const reducedMotion = Boolean(getAccessibilitySettings().prefersReducedMotion);
    const durationMs = reducedMotion ? 1500 : 2050;
    const panelWidth = Math.min(width - (compact ? 28 : 96), compact ? 520 : 690);
    const panelHeight = compact ? 126 : 148;
    const centerX = width / 2;
    const centerY = Math.max(compact ? 160 : 192, height * 0.36);
    const accent = Number(fusion.color) || 0xff5bd6;

    const container = new PIXI.Container();
    container.label = 'tactical_fusion_unlock';
    container.zIndex = 9880;
    container.eventMode = 'none';
    container.alpha = 0;

    const burst = new PIXI.Graphics();
    burst.position.set(centerX, centerY);
    const plasmaRibbonCount = reducedMotion ? 3 : 6;
    for (let index = 0; index < plasmaRibbonCount; index += 1) {
      const side = index % 2 ? 1 : -1;
      const lane = Math.floor(index / 2) - 1;
      const y = lane * (compact ? 44 : 58);
      const reach = panelWidth * (0.52 + (index % 3) * 0.08);
      burst.moveTo(side * 38, y * 0.18);
      burst.bezierCurveTo(
        side * reach * 0.28, y - side * 32,
        side * reach * 0.66, y + side * 46,
        side * reach, y + side * 12
      );
      burst.stroke({
        color: index % 3 === 0 ? 0xffffff : (index % 2 ? accent : 0x66efff),
        width: index % 3 === 0 ? 2.4 : 5.2,
        alpha: index % 3 === 0 ? 0.18 : 0.1
      });
    }
    burst.blendMode = 'add';
    container.addChild(burst);

    const panel = new PIXI.Container();
    panel.position.set(centerX, centerY);
    const glow = new PIXI.Graphics();
    const chamfer = compact ? 15 : 20;
    const panelPoints = [
      -panelWidth / 2 + chamfer, -panelHeight / 2,
      panelWidth / 2 - chamfer, -panelHeight / 2,
      panelWidth / 2, -panelHeight / 2 + chamfer,
      panelWidth / 2, panelHeight / 2 - chamfer,
      panelWidth / 2 - chamfer, panelHeight / 2,
      -panelWidth / 2 + chamfer, panelHeight / 2,
      -panelWidth / 2, panelHeight / 2 - chamfer,
      -panelWidth / 2, -panelHeight / 2 + chamfer
    ];
    glow.poly(panelPoints);
    glow.stroke({ color: accent, width: 9, alpha: 0.18 });
    glow.blendMode = 'add';
    panel.addChild(glow);
    const bg = new PIXI.Graphics();
    bg.poly(panelPoints);
    bg.fill({ color: 0x030812, alpha: 0.94 });
    bg.stroke({ color: accent, width: compact ? 2.5 : 3.5, alpha: 0.96 });
    bg.moveTo(-panelWidth / 2 + 18, -panelHeight / 2 + 10);
    bg.lineTo(panelWidth / 2 - 34, -panelHeight / 2 + 10);
    bg.moveTo(-panelWidth / 2 + 34, panelHeight / 2 - 10);
    bg.lineTo(panelWidth / 2 - 18, panelHeight / 2 - 10);
    bg.stroke({ color: 0x66efff, width: 1.3, alpha: 0.52 });
    panel.addChild(bg);

    const core = new PIXI.Graphics();
    this.drawTacticalFusionEmblem(core, fusion, accent, compact);
    core.position.set(-panelWidth / 2 + (compact ? 54 : 66), 0);
    core.blendMode = 'add';
    panel.addChild(core);

    const label = createText(translateText('FUSION PROTOCOL ONLINE'), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 12 : 15,
      fill: '#8df7ff',
      fontWeight: '900',
      letterSpacing: 1.4
    });
    label.position.set(-panelWidth / 2 + (compact ? 96 : 124), -panelHeight / 2 + (compact ? 16 : 19));
    panel.addChild(label);
    const name = createText(translateText(fusion.name), {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 25 : 34,
      fill: '#fff3a8',
      stroke: '#170019',
      strokeThickness: compact ? 4 : 5,
      fontWeight: '900'
    });
    name.position.set(label.x, compact ? -28 : -34);
    name.scale.set(Math.min(1, (panelWidth - name.x - 24) / Math.max(1, name.width)));
    panel.addChild(name);
    const description = createText(translateText(fusion.description), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 13 : 16,
      fill: '#e0faff',
      fontWeight: '700',
      wordWrap: true,
      wordWrapWidth: panelWidth - (compact ? 126 : 160),
      lineHeight: compact ? 15 : 18
    });
    description.position.set(label.x, compact ? 17 : 22);
    panel.addChild(description);
    container.addChild(panel);

    this.uiOverlay.addChild(container);
    this.uiOverlay.sortChildren?.();
    this.reserveMessageFocus(durationMs, { priority: 8, slots: ['center'] });
    this.lastTacticalFusionUnlock = {
      active: true,
      id: fusion.id,
      name: fusion.name,
      description: fusion.description,
      reducedMotion,
      rayCount: 0,
      plasmaRibbonCount,
      emblemId: core._fusionEmblemId,
      visualLanguage: 'fusion_signature_v2',
      scoreNeutral: true,
      bounds: {
        x: Math.round(centerX - panelWidth / 2),
        y: Math.round(centerY - panelHeight / 2),
        width: Math.round(panelWidth),
        height: Math.round(panelHeight)
      }
    };

    AudioManager.playSfx(fusion.sfx || 'achievement', { force: true, volume: 0.82, minIntervalMs: 0 });
    AudioManager.playSfx('achievement', { force: true, volume: 0.56, minIntervalMs: 0 });
    if (!reducedMotion) {
      this.particleManager?.createExplosion?.(this.player?.x, (this.player?.y || centerY) - 30, accent, 1.0);
      this.particleManager?.createExplosion?.(this.player?.x, (this.player?.y || centerY) - 30, 0x66efff, 0.72);
      this.screenShake?.shake?.(4, 13);
    }

    let elapsed = 0;
    const ticker = (delta) => {
      if (!container.parent || this.game?.currentScene !== this) {
        this.clearTacticalFusionUnlock('scene_changed');
        return;
      }
      elapsed += (Number(delta?.deltaTime) || Number(delta) || 1) * 16.67;
      const intro = Math.min(1, elapsed / 230);
      const outro = Math.max(0, Math.min(1, (elapsed - (durationMs - 420)) / 420));
      const eased = 1 - Math.pow(1 - intro, 3);
      container.alpha = eased * (1 - outro);
      panel.scale.set(0.78 + eased * 0.22 + Math.sin(elapsed * 0.012) * (reducedMotion ? 0.004 : 0.014));
      burst.scale.set(0.78 + eased * 0.22, 0.72 + eased * 0.28);
      burst.alpha = 0.62 + Math.sin(elapsed * 0.009) * (reducedMotion ? 0.02 : 0.12);
      core.scale.set(0.94 + Math.sin(elapsed * 0.014) * (reducedMotion ? 0.01 : 0.045));
      if (elapsed >= durationMs) this.clearTacticalFusionUnlock('complete');
    };
    this.activeTacticalFusionUnlock = { container, ticker };
    this._activeTickers.push(ticker);
    this.game.app.ticker.add(ticker);
    ticker({ deltaTime: 0 });
    return true;
  }

  clearTacticalDraft(reason = 'clear') {
    this.clearPendingTacticalBossBanter({ stopActive: true });
    if (this.tacticalDraftConfirmTimeout) {
      clearTimeout(this.tacticalDraftConfirmTimeout);
      this.tacticalDraftConfirmTimeout = null;
    }
    if (this.tacticalScoreRouteRestrictionTimeout) {
      clearTimeout(this.tacticalScoreRouteRestrictionTimeout);
      this.tacticalScoreRouteRestrictionTimeout = null;
    }
    const state = this.tacticalDraft;
    if (state?.active) {
      this.resetTransientGameplayInput(`tactical_draft_exit:${reason}`, { preserveFire: true });
    }
    if (state?.overlay?.parent) state.overlay.parent.removeChild(state.overlay);
    state?.overlay?.destroy?.({ children: true });
    this.lastTacticalDraftCloseReason = reason;
    this.tacticalDraft = null;
    if (reason === 'confirmed') {
      this.externalPauseSuppressedUntil = Date.now() + 600;
      this.tacticalDraftNavigator.suppressUntilReleased();
      this.pauseGamepadNavigator.suppressUntilReleased();
    }
  }

  getTacticalDraftDebugState() {
    const state = this.tacticalDraft;
    const boundsOf = (display) => {
      if (!display?.getBounds) return null;
      const bounds = display.getBounds();
      return { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height) };
    };
    return {
      active: Boolean(state?.active),
      fusionUnlock: this.lastTacticalFusionUnlock ? { ...this.lastTacticalFusionUnlock } : null,
      sectorCleared: state?.sectorCleared || null,
      focusIndex: state?.focusIndex ?? null,
      initialFocusIndex: state?.initialFocusIndex ?? null,
      confirmedId: state?.confirmedId || null,
      installingCategory: state?.installingCategory || null,
      installingName: state?.installingName || null,
      confirmHoldMs: Number(state?.confirmHoldMs) || 0,
      lockInActive: Boolean(state?.confirmedId && state?.lockInBurst?.visible),
      lockInProgress: Number(state?.lockInProgress) || 0,
      inputArmed: Boolean(state?.inputArmed),
      compact: Boolean(state?.compact),
      materialReady: Boolean(state?.material?.visible && GameAssets.isValidTexture(state.material.texture)),
      title: state?.title?.text || null,
      eyebrow: state?.eyebrow?.text || null,
      subtitle: state?.subtitle?.text || null,
      buildSummary: state?.buildSummary ? {
        bounds: boundsOf(state.buildSummary),
        visualLanguage: state.buildSummary._visualLanguage || null,
        title: state.buildSummary._nodes?.title?.text || null,
        empty: state.buildSummary._nodes?.empty?.visible
          ? state.buildSummary._nodes?.empty?.text || null
          : null,
        categories: state.buildSummary._nodes?.categoryNodes
          ?.filter((node) => node.visible)
          .map((node) => ({ category: node._category, text: node.text, bounds: boundsOf(node) })) || [],
        doctrine: state.buildSummary._nodes?.doctrine?.visible
          ? state.buildSummary._nodes?.doctrine?.text || null
          : null,
        fusion: state.buildSummary._nodes?.fusion?.visible
          ? state.buildSummary._nodes?.fusion?.text || null
          : null,
        activeIds: state.buildSummary._data?.activeIds?.slice?.() || []
      } : null,
      scoreRouteOfferId: state?.scoreRouteOfferId || null,
      scoreRouteDecision: state?.scoreRouteDecision || this.tacticalScoreRouteDecision?.status || null,
      scoreRouteState: this.tacticalScoreRouteDecision ? { ...this.tacticalScoreRouteDecision } : null,
      lastScoreRouteRestriction: state?.lastScoreRouteRestriction
        ? { ...state.lastScoreRouteRestriction }
        : null,
      rescansRemaining: state?.rescansRemaining ?? this.tacticalDraftRescansRemaining,
      rescansUsed: this.tacticalDraftRescansUsed,
      rescanCount: state?.rescanCount || 0,
      rescanLabel: state?.rescan?._nodes?.label?.text || null,
      rescanBounds: boundsOf(state?.rescan),
      heldId: this.tacticalDraftHeldId || null,
      heldAtOpenId: state?.heldAtOpenId || null,
      holdLabel: state?.hold?._nodes?.label?.text || null,
      holdBounds: boundsOf(state?.hold),
      bansRemaining: state?.bansRemaining ?? this.tacticalDraftBansRemaining,
      bannedIds: this.tacticalDraftBannedIds.slice(),
      banLabel: state?.ban?._nodes?.label?.text || null,
      banBounds: boundsOf(state?.ban),
      lastBannedId: state?.lastBannedId || null,
      lastBanSource: state?.lastBanSource || null,
      lastHoldSource: state?.lastHoldSource || null,
      pendingBossBanterId: this.pendingTacticalBossBanterId || null,
      pendingBossBanterContext: this.pendingTacticalBossBanterContext || null,
      lastBossBanterId: this.lastTacticalBossBanterId || null,
      lastBossBanterEvent: this.lastTacticalBossBanterEvent || null,
      lastBossBanterContext: this.lastTacticalBossBanterContext || null,
      lastBossBanterTrack: AudioManager.getSettings?.().lastVoiceTrack || null,
      lastBossBanterAt: this.lastTacticalBossBanterAt || 0,
      titleBounds: boundsOf(state?.title),
      offers: state?.offers?.map((offer, index) => ({
        id: offer.id,
        name: offer.name,
        displayName: offer.displayName || offer.name,
        displayNameSource: offer.displayName || offer.name,
        category: offer.category,
        currentStacks: offer.currentStacks,
        nextStack: offer.nextStack,
        maxStacks: offer.maxStacks,
        fixedScoreRoute: Boolean(offer.fixedScoreRoute),
        scoreRouteBadgeText: state.cards?.[index]?._nodes?.scoreRouteBadgeText?.text || null,
        scoreRouteBadgeBounds: offer.fixedScoreRoute
          ? boundsOf(state.cards?.[index]?._nodes?.scoreRouteBadge)
          : null,
        descriptionSource: offer.description,
        statPreview: offer.statPreview ? { ...offer.statPreview } : null,
        fusionBlueprint: offer.fusionBlueprints?.[0] ? {
          id: offer.fusionBlueprints[0].id,
          nameSource: offer.fusionBlueprints[0].name,
          status: offer.fusionBlueprints[0].status,
          completesOnPick: Boolean(offer.fusionBlueprints[0].completesOnPick),
          partnerIds: offer.fusionBlueprints[0].partnerIds.slice(),
          partnerNameSources: offer.fusionBlueprints[0].partnerNames.slice(),
          ownedPartnerIds: offer.fusionBlueprints[0].ownedPartnerIds.slice(),
          missingPartnerIds: offer.fusionBlueprints[0].missingPartnerIds.slice()
        } : null,
        fusionLabelText: state.cards?.[index]?._nodes?.fusionLabel?.text || null,
        fusionNameText: state.cards?.[index]?._nodes?.fusionName?.text || null,
        fusionHintText: state.cards?.[index]?._nodes?.fusionHint?.text || null,
        fusionBadgeBounds: offer.fusionBlueprints?.length ? boundsOf(state.cards?.[index]?._nodes?.fusionBadge) : null,
        fusionLabelBounds: offer.fusionBlueprints?.length ? boundsOf(state.cards?.[index]?._nodes?.fusionLabel) : null,
        fusionNameBounds: offer.fusionBlueprints?.length ? boundsOf(state.cards?.[index]?._nodes?.fusionName) : null,
        fusionHintBounds: offer.fusionBlueprints?.length ? boundsOf(state.cards?.[index]?._nodes?.fusionHint) : null,
        doctrinePreviewText: state.cards?.[index]?._nodes?.doctrine?.text || null,
        doctrineBadgeBounds: boundsOf(state.cards?.[index]?._nodes?.doctrineBadge),
        doctrinePreviewBounds: boundsOf(state.cards?.[index]?._nodes?.doctrine),
        doctrineProjection: offer.doctrineProjection ? {
          beforeId: offer.doctrineProjection.before?.id || null,
          afterId: offer.doctrineProjection.after?.id || null,
          afterStage: offer.doctrineProjection.after?.stage || null,
          identityChanged: Boolean(offer.doctrineProjection.identityChanged),
          stageChanged: Boolean(offer.doctrineProjection.stageChanged),
          consumed: Boolean(offer.doctrineProjection.consumed)
        } : null,
        held: offer.id === this.tacticalDraftHeldId,
        focused: index === state.focusIndex,
        visualLanguage: state.cards?.[index]?._visualLanguage || null,
        materialReady: Boolean(state.cards?.[index]?._nodes?.material?.visible),
        bloomVariant: state.cards?.[index]?._nodes?.artBloom?._variant ?? null,
        bounds: boundsOf(state.cards?.[index]),
        nameText: state.cards?.[index]?._nodes?.name?.text || null,
        descriptionText: state.cards?.[index]?._nodes?.description?.text || null,
        categoryText: state.cards?.[index]?._nodes?.category?.text || null,
        categoryBadgeBounds: boundsOf(state.cards?.[index]?._nodes?.categoryBadge),
        stackText: state.cards?.[index]?._nodes?.stackLabel?.text || null,
        stackBadgeBounds: boundsOf(state.cards?.[index]?._nodes?.stackBadge),
        impactLabelText: state.cards?.[index]?._nodes?.impactLabel?.text || null,
        impactLabelBounds: boundsOf(state.cards?.[index]?._nodes?.impactLabel),
        impactValueText: state.cards?.[index]?._nodes?.impactValue?.visible
          ? state.cards?.[index]?._nodes?.impactValue?.text || null
          : null,
        impactValueBounds: state.cards?.[index]?._nodes?.impactValue?.visible
          ? boundsOf(state.cards?.[index]?._nodes?.impactValue)
          : null,
        impactBadgeBounds: boundsOf(state.cards?.[index]?._nodes?.impactBadge),
        permanenceText: state.cards?.[index]?._nodes?.permanence?.text || null,
        permanenceBadgeBounds: boundsOf(state.cards?.[index]?._nodes?.permanenceBadge),
        nameBounds: boundsOf(state.cards?.[index]?._nodes?.name),
        descriptionBounds: boundsOf(state.cards?.[index]?._nodes?.description),
        chooseBounds: boundsOf(state.cards?.[index]?._nodes?.choose),
        holdBadgeBounds: boundsOf(state.cards?.[index]?._nodes?.holdBadge)
      })) || [],
      selectedIds: this.player?.runAugmentIds?.slice?.() || [],
      selectedLabels: summarizeTacticalDraftPicks(this.player?.runAugmentIds || []),
      history: this.tacticalDraftHistory.slice(),
      player: this.player?.getRunAugmentDebugState?.() || null,
      closeReason: this.lastTacticalDraftCloseReason || null
    };
  }

  resetTransientGameplayInput(
    reason = 'gameplay_transition',
    { preserveFire = true, preserveMovement = false } = {}
  ) {
    const input = this.inputManager?.resetTransientState?.({
      preserveFire,
      preserveMovement,
      suppressUntilReleased: true
    }) || null;
    this.touchControls?.resetTransientState?.();
    this.player?.resetTransientInputState?.();
    this.lastTransientInputReset = {
      reason,
      preserveFire: Boolean(preserveFire),
      preserveMovement: Boolean(preserveMovement),
      at: Date.now(),
      input
    };
    return this.lastTransientInputReset;
  }

  handlePauseToggle() {
    const pressed = this.inputManager.consumeKeyPress
      ? this.inputManager.consumeKeyPress('KeyP', 'p', 'P', 'Escape')
      : this.inputManager.isKeyPressed('KeyP') ||
        this.inputManager.isKeyPressed('p') ||
        this.inputManager.isKeyPressed('P') ||
        this.inputManager.isKeyPressed('Escape');
    if (pressed) {
      this.setPaused(!this.isPaused);
    }
  }

  setPaused(paused) {
    if (this.isPaused === paused) return;
    this.resetTransientGameplayInput(paused ? 'pause_enter' : 'pause_exit', { preserveFire: true });
    this.isPaused = paused;
    if (paused) {
      this.showPauseOverlay();
      AudioManager.setPauseDucked(true);
      AudioManager.playSfx('pause_in', { force: true, volume: 0.45 });
    } else {
      this.closeSettingsOverlay();
      this.closeHowToPlayOverlay();
      this.closeTacticalLoadoutOverlay();
      this.hidePauseOverlay();
      AudioManager.setPauseDucked(false);
      AudioManager.playSfx('pause_out', { force: true, volume: 0.34 });
    }
  }

  setupAutoPauseHandlers() {
    if (this.autoPauseHandlersInstalled || typeof window === 'undefined') return;
    this.visibilityPauseHandler = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        this.pauseForExternalInterruption('visibility_hidden');
      }
    };
    this.blurPauseHandler = () => this.pauseForExternalInterruption('window_blur');
    this.nativeBlurPauseHandler = () => this.pauseForExternalInterruption('native_window_blur');
    this.focusOutPauseHandler = () => this.pauseForExternalInterruption('focus_out');
    if (typeof document !== 'undefined') {
      document.addEventListener?.('visibilitychange', this.visibilityPauseHandler);
      document.addEventListener?.('blur', this.focusOutPauseHandler, true);
      document.addEventListener?.('focusout', this.focusOutPauseHandler, true);
    }
    window.addEventListener('blur', this.blurPauseHandler);
    window.addEventListener('nova-app-window-blur', this.nativeBlurPauseHandler);
    this.autoPauseHandlersInstalled = true;
  }

  removeAutoPauseHandlers() {
    if (!this.autoPauseHandlersInstalled) return;
    if (typeof document !== 'undefined') {
      document.removeEventListener?.('visibilitychange', this.visibilityPauseHandler);
      document.removeEventListener?.('blur', this.focusOutPauseHandler, true);
      document.removeEventListener?.('focusout', this.focusOutPauseHandler, true);
    }
    window.removeEventListener('blur', this.blurPauseHandler);
    window.removeEventListener('nova-app-window-blur', this.nativeBlurPauseHandler);
    this.visibilityPauseHandler = null;
    this.blurPauseHandler = null;
    this.nativeBlurPauseHandler = null;
    this.focusOutPauseHandler = null;
    this.autoPauseHandlersInstalled = false;
  }

  pauseForExternalInterruption(reason = 'external_interruption') {
    this.resetTransientGameplayInput(`focus_loss:${reason}`, { preserveFire: false });
    if (this.controlSmokeMode) return;
    if (
      this.game?.currentScene !== this
      || !this.isReady
      || this.isPaused
      || this.tacticalDraft?.active
      || Date.now() < (Number(this.externalPauseSuppressedUntil) || 0)
      || (this.game?.lives || 0) <= 0
    ) return;
    this.pauseReason = reason;
    this.setPaused(true);
  }

  updateControllerPresencePause() {
    const state = this.inputManager?.getGamepadState?.();
    const connected = Boolean(state?.connected);
    if (connected) {
      this.hadGameplayGamepadConnection = true;
      this.lastGameplayGamepadConnected = true;
      return;
    }
    if (this.hadGameplayGamepadConnection && this.lastGameplayGamepadConnected) {
      this.lastGameplayGamepadConnected = false;
      this.pauseForExternalInterruption('controller_disconnected');
    }
  }

  showPauseOverlay() {
    this.pauseGamepadNavigator.suppressUntilReleased();
    if (this.pauseOverlay) {
      this.pauseOverlay.visible = true;
      this.pauseMenuFx?.resize?.(this.game.getWidth(), this.game.getHeight());
      this.pauseMenuDecor?.resize?.(this.game.getWidth(), this.game.getHeight());
      this.refreshPauseOverlayStats();
      playMenuOpenSfx(0.22);
      this.setPauseFocus(this.pauseFocusedIndex || 0);
      return;
    }

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const overlay = new PIXI.Container();
    overlay.zIndex = 1000000;
    overlay.label = 'ui_pauseOverlay';
    overlay.sortableChildren = true;

    const dim = new PIXI.Graphics();
    dim.zIndex = 0;
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x020713, alpha: 0.68 });
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x001827, alpha: 0.16 });
    overlay.addChild(dim);

    this.pauseMenuFx?.destroy?.();
    this.pauseMenuFx = new MenuFxLayer({
      game: this.game,
      label: 'ui_menuFxPause',
      zIndex: 1,
      intensity: 0.82,
      density: 0.72,
      alpha: 0.78
    });
    this.pauseMenuFx.resize(width, height);
    overlay.addChild(this.pauseMenuFx.container);

    const decorLayer = new PIXI.Container();
    decorLayer.label = 'ui_pauseDecorLayer';
    decorLayer.zIndex = 2;
    decorLayer.sortableChildren = true;
    overlay.addChild(decorLayer);

    const uiScale = Math.max(1, Math.min(2, Number(getCurrentLayout()?.uiScale) || 1));
    const panelWidth = Math.min(width - 36, 700 * Math.min(uiScale, 1.15));
    const panelHeight = Math.min(height - 28, 650 * Math.min(uiScale, 1.05));
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const centerX = width / 2;
    const centerY = height / 2;

    const deckShadow = new PIXI.Graphics();
    deckShadow.label = 'ui_pauseDeckShadow';
    deckShadow.zIndex = 0;
    deckShadow.roundRect(panelX - 18, panelY - 16, panelWidth + 36, panelHeight + 34, 18);
    deckShadow.fill({ color: 0x000000, alpha: 0.46 });
    deckShadow.roundRect(panelX - 10, panelY - 8, panelWidth + 20, panelHeight + 18, 14);
    deckShadow.stroke({ color: 0xff55d9, width: 8, alpha: 0.08 });
    decorLayer.addChild(deckShadow);

    const leftWing = new PIXI.Graphics();
    leftWing.label = 'ui_pauseLeftWing';
    leftWing.zIndex = 1;
    leftWing.moveTo(panelX - 74, panelY + 86);
    leftWing.lineTo(panelX - 18, panelY + 54);
    leftWing.lineTo(panelX - 18, panelY + panelHeight - 54);
    leftWing.lineTo(panelX - 74, panelY + panelHeight - 86);
    leftWing.closePath();
    leftWing.fill({ color: 0x06233b, alpha: 0.62 });
    leftWing.stroke({ color: 0x00eaff, width: 1.5, alpha: 0.54 });
    decorLayer.addChild(leftWing);

    const rightWing = new PIXI.Graphics();
    rightWing.label = 'ui_pauseRightWing';
    rightWing.zIndex = 1;
    rightWing.moveTo(panelX + panelWidth + 74, panelY + 86);
    rightWing.lineTo(panelX + panelWidth + 18, panelY + 54);
    rightWing.lineTo(panelX + panelWidth + 18, panelY + panelHeight - 54);
    rightWing.lineTo(panelX + panelWidth + 74, panelY + panelHeight - 86);
    rightWing.closePath();
    rightWing.fill({ color: 0x2a1037, alpha: 0.42 });
    rightWing.stroke({ color: 0xff55d9, width: 1.5, alpha: 0.52 });
    decorLayer.addChild(rightWing);

    const panel = new PIXI.Graphics();
    panel.label = 'ui_pauseCommandDeck';
    panel.zIndex = 4;
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 10);
    panel.fill({ color: 0x06111f, alpha: 0.92 });
    panel.roundRect(panelX + 8, panelY + 8, panelWidth - 16, panelHeight - 16, 8);
    panel.stroke({ color: 0x0b5a72, width: 1, alpha: 0.68 });
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 10);
    panel.stroke({ color: 0x00eaff, width: 2.4, alpha: 0.94 });
    panel.roundRect(panelX + 3, panelY + 3, panelWidth - 6, panelHeight - 6, 9);
    panel.stroke({ color: 0xff55d9, width: 1, alpha: 0.24 });
    decorLayer.addChild(panel);

    const headerPlate = new PIXI.Graphics();
    headerPlate.label = 'ui_pauseHeaderPlate';
    headerPlate.zIndex = 5;
    headerPlate.roundRect(panelX + 38, panelY + 26, panelWidth - 76, 94, 8);
    headerPlate.fill({ color: 0x09233a, alpha: 0.62 });
    headerPlate.rect(panelX + 54, panelY + 34, panelWidth - 108, 2);
    headerPlate.fill({ color: 0xffd15c, alpha: 0.52 });
    headerPlate.rect(panelX + 84, panelY + 111, panelWidth - 168, 2);
    headerPlate.fill({ color: 0x00eaff, alpha: 0.38 });
    decorLayer.addChild(headerPlate);

    const scanLine = new PIXI.Graphics();
    scanLine.label = 'ui_pauseScanLine';
    scanLine.zIndex = 6;
    scanLine.rect(panelX + 20, panelY + 28, panelWidth - 40, 2);
    scanLine.fill({ color: 0xffffff, alpha: 0.46 });
    scanLine.rect(panelX + 20, panelY + 31, panelWidth - 124, 1);
    scanLine.fill({ color: 0x00eaff, alpha: 0.7 });
    decorLayer.addChild(scanLine);

    const buildRadar = (x, y, radius, color, label) => {
      const radar = new PIXI.Container();
      radar.label = label;
      radar.zIndex = 3;
      radar.position.set(x, y);
      radar.alpha = 0.58;
      const g = new PIXI.Graphics();
      for (let i = 0; i < 4; i += 1) {
        g.circle(0, 0, radius * (0.28 + i * 0.2));
        g.stroke({ color: i % 2 ? color : 0x00eaff, width: i === 0 ? 2 : 1, alpha: 0.18 + i * 0.03 });
      }
      for (let i = 0; i < 16; i += 1) {
        const a = Math.PI * 2 * i / 16;
        g.moveTo(Math.cos(a) * radius * 0.2, Math.sin(a) * radius * 0.2);
        g.lineTo(Math.cos(a) * radius * 0.98, Math.sin(a) * radius * 0.98);
      }
      g.stroke({ color, width: 1, alpha: 0.08 });
      const sweep = new PIXI.Graphics();
      sweep.label = `${label}_sweep`;
      sweep.moveTo(0, 0);
      sweep.lineTo(radius * 0.95, -radius * 0.12);
      sweep.lineTo(radius * 0.95, radius * 0.12);
      sweep.closePath();
      sweep.fill({ color, alpha: 0.14 });
      radar.addChild(g, sweep);
      radar._sweep = sweep;
      return radar;
    };

    const leftRadar = buildRadar(panelX - 88, centerY, 72, 0x00eaff, 'ui_pauseLeftRadar');
    const rightRadar = buildRadar(panelX + panelWidth + 88, centerY, 72, 0xff55d9, 'ui_pauseRightRadar');
    decorLayer.addChild(leftRadar, rightRadar);

    const title = createText(translateText('PAUSED'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#f6fbff',
      stroke: '#001c2a',
      strokeThickness: 5,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.position.set(centerX, panelY + 72);
    title.zIndex = 7;
    overlay.addChild(title);

    const pauseQuip = tauntDirector.getRotatingText('pause');
    this.lastPauseHumor = tauntDirector.getRotationDebugState();
    const status = createText(pauseQuip, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 15,
      fontWeight: 'bold',
      fill: '#7fffd8',
      align: 'center'
    });
    status.anchor.set(0.5);
    status.position.set(centerX, panelY + 111);
    status.zIndex = 7;
    overlay.addChild(status);

    const makeChip = (label, value, x, y, color = 0x00eaff, options = {}) => {
      const chipWidth = Math.max(116, Number(options.width) || 184);
      const chipHeight = Math.max(34, Number(options.height) || 40);
      const chip = new PIXI.Container();
      chip.label = `ui_pauseChip_${label}`;
      chip.zIndex = 6;
      chip.position.set(x, y);
      const bg = new PIXI.Graphics();
      bg.roundRect(-chipWidth / 2, -chipHeight / 2, chipWidth, chipHeight, 7);
      bg.fill({ color: 0x031321, alpha: 0.82 });
      bg.stroke({ color, width: 1, alpha: 0.58 });
      const top = createText(label, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: Math.max(8, Math.round((options.labelSize || 10) * Math.min(uiScale, 1.15))),
        fontWeight: 'bold',
        fill: '#8df6ff',
        align: 'center'
      });
      top.anchor.set(0.5);
      top.y = -chipHeight * 0.2;
      const bottom = createText(value, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: Math.max(10, Math.round((options.valueSize || 17) * Math.min(uiScale, 1.12))),
        fontWeight: 'bold',
        fill: '#ffffff',
        align: 'center'
      });
      bottom.anchor.set(0.5);
      bottom.y = chipHeight * 0.2;
      chip.addChild(bg, top, bottom);
      const fit = (text) => {
        if (!text) return;
        text.scale.set(1);
        const maxWidth = chipWidth - 14;
        if (text.width > maxWidth) {
          const scale = Math.max(0.68, maxWidth / Math.max(1, text.width));
          text.scale.set(scale);
        }
      };
      fit(top);
      fit(bottom);
      chip.fitText = () => {
        fit(top);
        fit(bottom);
      };
      chip.valueText = bottom;
      chip.topText = top;
      chip.bg = bg;
      chip.accentColor = color;
      return chip;
    };

    const chipY = panelY + 158;
    const chipWidth = Math.min(138 * uiScale, Math.max(118, (panelWidth - 92) / 4));
    const chipGap = Math.min(14 * uiScale, 16);
    const chipStep = chipWidth + chipGap;
    const scoreChip = makeChip(translateText('SCORE'), Number(this.game.score || 0).toLocaleString('en-US'), centerX - chipStep * 1.5, chipY, 0xffd15c, { width: chipWidth, valueSize: 15 });
    const sectorChip = makeChip(translateText('SECTOR'), String(this.game.level || 1).padStart(2, '0'), centerX - chipStep * 0.5, chipY, 0x00eaff, { width: chipWidth, valueSize: 15 });
    const livesChip = makeChip(translateText('LIVES'), String(this.game.lives || 0), centerX + chipStep * 0.5, chipY, this.game.lives <= 1 ? 0xff4f6d : 0x7fffd8, { width: chipWidth, valueSize: 15 });
    const powerupChip = makeChip(translateText('POWERUPS'), this.getPausePowerupSummary(), centerX + chipStep * 1.5, chipY, 0xb39cff, { width: chipWidth, valueSize: 14 });
    decorLayer.addChild(scoreChip, sectorChip, livesChip, powerupChip);

    const intelPlate = new PIXI.Graphics();
    intelPlate.label = 'ui_pauseIntelPlate';
    intelPlate.zIndex = 5;
    intelPlate.roundRect(panelX + 34, panelY + 184, panelWidth - 68, 134, 8);
    intelPlate.fill({ color: 0x020c18, alpha: 0.78 });
    intelPlate.roundRect(panelX + 34, panelY + 184, panelWidth - 68, 134, 8);
    intelPlate.stroke({ color: 0x0b5a72, width: 1, alpha: 0.62 });
    intelPlate.moveTo(panelX + 52, panelY + 223);
    intelPlate.lineTo(panelX + panelWidth - 52, panelY + 223);
    intelPlate.moveTo(panelX + 52, panelY + 257);
    intelPlate.lineTo(panelX + panelWidth - 52, panelY + 257);
    intelPlate.stroke({ color: 0x37f5ff, width: 1, alpha: 0.2 });
    intelPlate.rect(panelX + 40, panelY + 194, 3, 114);
    intelPlate.fill({ color: 0xffd15c, alpha: 0.58 });
    decorLayer.addChild(intelPlate);

    const pilotOrdersLine = createText(this.getPausePilotOrdersSummary(), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: Math.round(13 * Math.min(uiScale, 1.25)),
      fontWeight: 'bold',
      fill: '#b9faff',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 76
    });
    pilotOrdersLine.anchor.set(0.5);
    pilotOrdersLine.position.set(centerX, panelY + 205);
    pilotOrdersLine.zIndex = 7;
    overlay.addChild(pilotOrdersLine);

    const combatTelemetryLine = createText(this.getPauseCombatTelemetrySummary(), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: Math.round(9 * Math.min(uiScale, 1.2)),
      fontWeight: 'bold',
      fill: '#8df6ff',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 100
    });
    combatTelemetryLine.anchor.set(0.5);
    combatTelemetryLine.position.set(centerX, panelY + 240);
    combatTelemetryLine.zIndex = 7;
    overlay.addChild(combatTelemetryLine);

    const tacticalDraftLine = createText([
      this.getPauseTacticalDraftSummary(),
      this.getPauseTacticalDirectiveSummary()
    ].join('\n'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: Math.round(9 * Math.min(uiScale, 1.2)),
      fontWeight: 'bold',
      fill: '#fff3a0',
      stroke: '#031323',
      strokeThickness: 2,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 100,
      lineHeight: Math.round(11 * Math.min(uiScale, 1.2))
    });
    tacticalDraftLine.anchor.set(0.5);
    tacticalDraftLine.position.set(centerX, panelY + 282);
    tacticalDraftLine.zIndex = 7;
    overlay.addChild(tacticalDraftLine);

    this.pauseButtons = [
      this.createPauseButton(translateText('RESUME'), centerX, panelY + 358, () => this.setPaused(false), { accent: 0xffd15c, hot: true }),
      this.createPauseButton(translateText('Tactical upgrades'), centerX, panelY + 410, () => this.openTacticalLoadoutOverlay(), { accent: 0xffef7e }),
      this.createPauseButton(translateText('SETTINGS'), centerX, panelY + 462, () => this.openSettingsOverlay(), { accent: 0x00eaff }),
      this.createPauseButton(translateText('HOW TO PLAY'), centerX, panelY + 514, () => this.openHowToPlayOverlay(), { accent: 0x7fffd8 }),
      this.createPauseButton(translateText('QUIT TO MENU'), centerX, panelY + 566, () => {
        this.closeSettingsOverlay();
        this.closeHowToPlayOverlay();
        this.closeTacticalLoadoutOverlay();
        this.hidePauseOverlay();
        this.isPaused = false;
        this.game.switchScene('menu');
      })
    ];
    this.pauseButtons.forEach((button) => {
      button.zIndex = 4;
      overlay.addChild(button);
    });

    this.pauseOverlay = overlay;
    this.pauseMenuDecor = {
      time: 0,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      scanLine,
      title,
      status,
      scoreValue: scoreChip.valueText,
      sectorValue: sectorChip.valueText,
      livesChip,
      livesValue: livesChip.valueText,
      powerupChip,
      powerupValue: powerupChip.valueText,
      pilotOrdersValue: pilotOrdersLine,
      combatTelemetryValue: combatTelemetryLine,
      tacticalDraftValue: tacticalDraftLine,
      visualLanguage: 'pause_command_deck_v2',
      leftRadar,
      rightRadar,
      resize: () => {}
    };
    this.uiOverlay.addChild(overlay);
    this.refreshPauseOverlayStats();
    playMenuOpenSfx(0.22);
    this.pauseMenuFx.burst?.(centerX, panelY + 72, { color: 0xffd15c, radius: 132, durationMs: 680 });
    this.setPauseFocus(0);
  }

  refreshPauseOverlayStats() {
    const decor = this.pauseMenuDecor;
    if (!decor) return;
    if (decor.scoreValue) decor.scoreValue.text = Number(this.game?.score || 0).toLocaleString('en-US');
    if (decor.sectorValue) decor.sectorValue.text = String(this.game?.level || 1).padStart(2, '0');
    if (decor.livesValue) {
      const lives = Math.max(0, Math.floor(Number(this.game?.lives) || 0));
      decor.livesValue.text = String(lives);
      decor.livesValue.style.fill = lives <= 1 ? '#ff9aa8' : '#ffffff';
    }
    if (decor.powerupValue) {
      decor.powerupValue.text = this.getPausePowerupSummary();
      decor.powerupValue.style.fill = this.player?.getActivePowerupStates?.()?.length ? '#efe8ff' : '#8df6ff';
    }
    decor.livesChip?.fitText?.();
    decor.powerupChip?.fitText?.();
    if (decor.pilotOrdersValue) decor.pilotOrdersValue.text = this.getPausePilotOrdersSummary();
    if (decor.combatTelemetryValue) decor.combatTelemetryValue.text = this.getPauseCombatTelemetrySummary();
    if (decor.tacticalDraftValue) decor.tacticalDraftValue.text = [
      this.getPauseTacticalDraftSummary(),
      this.getPauseTacticalDirectiveSummary()
    ].join('\n');
  }

  getPausePowerupSummary(now = Date.now()) {
    const states = this.player?.getActivePowerupStates?.() || [];
    const state = states.find((item) => !item.spent) || states[0];
    if (!state) return '--';
    const meta = getPowerupMeta(state.type) || {};
    const label = translateText(meta.shortLabel || state.label || state.type || 'POWERUP');
    const remaining = Math.max(0, Math.ceil((Number(state.remainingMs) || 0) / 1000));
    const charges = Number(state.charges || 0);
    const maxCharges = Number(state.maxCharges || 0);
    if (state.spent) return `${label} --`;
    if (remaining > 0) return `${label} ${remaining}s`;
    if (charges > 0 && maxCharges > 0) return `${label} ${charges}/${maxCharges}`;
    if (charges > 0) return `${label} ${charges}`;
    const detail = String(state.detail || '').trim();
    if (detail) return `${label} ${translateText(detail)}`;
    return label;
  }

  getPauseCombatTelemetrySummary() {
    const telemetry = this.getCombatTelemetrySummary();
    const damage = Math.round(telemetry.totalDamage).toLocaleString('en-US');
    const average = Math.round(telemetry.averageDps).toLocaleString('en-US');
    const peak = Math.round(telemetry.peakDps).toLocaleString('en-US');
    const accuracy = Math.round(telemetry.accuracyPercent);
    const source = translateText(getCombatDamageSourceLabel(telemetry.topSourceId));
    return translateText(
      'DAMAGE {damage} // AVG {average} DPS // PEAK {peak} // ACC {accuracy}% // TOP {source}',
      { damage, average, peak, accuracy, source }
    );
  }

  getPauseDebugState() {
    const decor = this.pauseMenuDecor;
    return {
      visible: Boolean(this.pauseOverlay?.visible && this.pauseOverlay?.parent),
      visualLanguage: decor?.visualLanguage || null,
      score: decor?.scoreValue?.text ?? null,
      sector: decor?.sectorValue?.text ?? null,
      lives: decor?.livesValue?.text ?? null,
      powerup: decor?.powerupValue?.text ?? null,
      pilotOrders: decor?.pilotOrdersValue?.text ?? null,
      combatTelemetryText: decor?.combatTelemetryValue?.text ?? null,
      tacticalDraft: decor?.tacticalDraftValue?.text ?? null,
      tacticalDirective: this.getPauseTacticalDirectiveSummary(),
      combatTelemetry: this.getCombatTelemetrySummary(),
      humor: this.lastPauseHumor ? { ...this.lastPauseHumor } : null,
      aceBounty: this.getAceBountyDebugState(),
      tacticalLoadout: this.tacticalLoadoutOverlay?.getDebugState?.() || null
    };
  }

  getPausePilotOrdersSummary() {
    const state = this.getRunContractDebugState();
    const trackProgress = this.getRunContractTrackProgressLabel();
    const prefix = trackProgress
      ? `${translateText('PILOT ORDERS')} ${trackProgress}`
      : translateText('PILOT ORDERS');
    const active = (state?.active || [])
      .filter((item) => item.eligible && !item.completed)
      .slice(0, 1);
    if (!active.length) {
      const nextSummary = this.getNextRunContractSummary(state);
      if (nextSummary) return `${prefix} // ${translateText('NEXT')} ${nextSummary.title} ${nextSummary.progress}`;
      return `${prefix} // ${translateText('COMPLETE')}`;
    }
    const item = active[0];
    const title = translateText(item.shortTitle || item.title || item.id);
    const progress = translateText('{progress}/{target}', formatRunContractProgressValue(item.progress, item.target));
    return `${prefix} // ${title} ${progress}`;
  }

  getPauseTacticalDraftSummary() {
    if (!canRunModeUseTacticalDraft(this.game?.runMode)) {
      return translateText('MAYHEM PURE // TACTICAL UPGRADES OFF');
    }
    const labels = summarizeTacticalDraftPicks(this.player?.runAugmentIds || []).map((label) => translateText(label));
    const prefix = translateText('Tactical upgrades');
    if (!labels.length) return `${prefix}: --`;
    const doctrine = analyzeTacticalDoctrine(this.player?.runAugmentIds || [], this.player?.consumedRunAugmentIds || []);
    const doctrineLabel = doctrine
      ? translateText('{name} // {stage}', { name: translateText(doctrine.name), stage: translateText(doctrine.stage) })
      : '';
    const recent = labels.slice(-2).join(' + ');
    const overflow = labels.length > 2 ? ` +${labels.length - 2}` : '';
    return doctrineLabel
      ? `${doctrineLabel} // ${recent}${overflow}`
      : `${prefix}: ${recent}${overflow}`;
  }

  getPauseTacticalDirectiveSummary() {
    const state = this.getTacticalDirectiveDebugState();
    const active = state?.active;
    if (!active) {
      return translateText('DIRECTIVES COMPLETE {count}/{cap}', {
        count: state?.completedCount || 0,
        cap: state?.completionCap || TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP
      });
    }
    if (active.queued) {
      return translateText('DIRECTIVE {current}/{cap} QUEUED // LEVEL {level}', {
        current: state.currentOrdinal,
        cap: state.completionCap,
        level: active.eligibleFromSector
      });
    }
    return translateText('DIRECTIVE {current}/{cap}: {objective} {progress} // {reward}', {
      current: state.currentOrdinal,
      cap: state.completionCap,
      objective: translateText(active.objectiveLabel),
      progress: active.progressLabel,
      reward: translateText(active.rewardLabel)
    });
  }

  openSettingsOverlay() {
    if (this.settingsOverlay) {
      this.closeSettingsOverlay();
    }

    this.settingsOverlay = new SettingsOverlay(this.game, {
      title: 'SETTINGS',
      onClose: () => {
        this.settingsOverlay = null;
        this.pauseGamepadNavigator.suppressUntilReleased();
      }
    });
    this.uiOverlay.addChild(this.settingsOverlay.container);
  }

  openHowToPlayOverlay() {
    if (this.howToPlayOverlay) {
      this.closeHowToPlayOverlay();
    }

    this.howToPlayOverlay = new HowToPlayOverlay(this.game, {
      onClose: () => {
        this.howToPlayOverlay = null;
        this.pauseGamepadNavigator.suppressUntilReleased();
      }
    });
    this.uiOverlay.addChild(this.howToPlayOverlay.container);
  }

  openTacticalLoadoutOverlay() {
    this.closeTacticalLoadoutOverlay();
    this.tacticalLoadoutOverlay = new TacticalLoadoutOverlay(this.game, {
      title: 'Tactical upgrades',
      selectedIds: this.player?.runAugmentIds || [],
      consumedIds: this.player?.consumedRunAugmentIds || [],
      onInspect: (item, { reason } = {}) => {
        if (item?.fusion) return;
        this.scheduleTacticalBossBanter(item?.id, {
          context: 'loadout',
          delayMs: reason === 'detail' ? 180 : TACTICAL_BOSS_BANTER_FOCUS_DELAY_MS
        });
      },
      onClose: () => {
        this.clearPendingTacticalBossBanter({ stopActive: true });
        this.tacticalLoadoutOverlay = null;
        this.pauseGamepadNavigator.suppressUntilReleased();
      }
    });
    // Modal inspection must sit above transient gameplay toasts. Corner toasts
    // are intentionally hosted on the scene root, so nesting this modal under
    // uiOverlay allowed an older toast to cover an upgrade card while paused.
    this.container.addChild(this.tacticalLoadoutOverlay.container);
    const initialItem = this.tacticalLoadoutOverlay.cards?.[this.tacticalLoadoutOverlay.focusedCardIndex]?._item;
    if (initialItem && !initialItem.fusion) this.scheduleTacticalBossBanter(initialItem.id, { context: 'loadout', delayMs: 760 });
  }

  handleLanguageChanged() {
    this.hud?.update?.();
    this.settingsOverlay?.rebuild?.();
    if (this.howToPlayOverlay) {
      this.closeHowToPlayOverlay();
      this.openHowToPlayOverlay();
    }
    if (this.pauseOverlay?.parent && this.pauseOverlay.visible) {
      const focusedIndex = this.pauseFocusedIndex || 0;
      this.destroyPauseOverlay();
      this.pauseFocusedIndex = focusedIndex;
      this.showPauseOverlay();
      this.setPauseFocus(focusedIndex);
    }
  }

  closeSettingsOverlay() {
    if (this.settingsOverlay) {
      this.settingsOverlay.close();
      this.settingsOverlay = null;
    }
  }

  closeHowToPlayOverlay() {
    if (this.howToPlayOverlay) {
      this.howToPlayOverlay.close();
      this.howToPlayOverlay = null;
    }
  }

  createPauseButton(label, x, y, onPress, options = {}) {
    const uiScale = Math.max(1, Math.min(2, Number(getCurrentLayout()?.uiScale) || 1));
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.activate = onPress;

    const width = 312 * uiScale;
    const height = 44 * uiScale;
    const accent = options.accent || 0x00eaff;
    const hot = options.hot === true;
    const draw = (hovered = false) => {
      const focused = Boolean(button._focused);
      const active = hovered || focused;
      const pulse = button._pulse || 0;
      focus.clear();
      if (focused) {
        focus.roundRect(-width / 2 - 7, -height / 2 - 6, width + 14, height + 12, 9);
        focus.stroke({ color: 0xffef7e, width: 2.5, alpha: 0.72 + pulse * 0.2 });
        focus.roundRect(-width / 2 - 13, -height / 2 - 11, width + 26, height + 22, 11);
        focus.stroke({ color: accent, width: 1.4, alpha: 0.22 + pulse * 0.24 });
      }
      bg.clear();
      bg.roundRect(-width / 2, -height / 2, width, height, 7);
      bg.fill({ color: active ? 0x0b5571 : 0x061d32, alpha: active ? 0.95 : 0.86 });
      bg.rect(-width / 2 + 8, -height / 2 + 6, width - 16, 2);
      bg.fill({ color: 0xffffff, alpha: active ? 0.18 : 0.09 });
      bg.rect(-width / 2 + 14, height / 2 - 9, width - 28, 1);
      bg.fill({ color: accent, alpha: active ? 0.54 : 0.22 });
      bg.rect(-width / 2, -height / 2 + 5, 4, height - 10);
      bg.fill({ color: hot ? 0xffd15c : accent, alpha: active ? 0.98 : 0.7 });
      bg.rect(width / 2 - 4, -height / 2 + 5, 4, height - 10);
      bg.fill({ color: active ? 0xffffff : accent, alpha: active ? 0.88 : 0.42 });
      bg.stroke({ color: active ? 0xffffff : accent, width: active ? 2 : 1.2, alpha: active ? 0.96 : 0.78 });

      marker.clear();
      const markerAlpha = active ? 0.82 : 0.3;
      marker.rect(-width / 2 + 18, -10, 3, 20);
      marker.fill({ color: hot ? 0xffd15c : accent, alpha: markerAlpha });
      marker.rect(width / 2 - 21, -10, 3, 20);
      marker.fill({ color: active ? 0xffffff : accent, alpha: markerAlpha * 0.75 });
      marker.rect(-width / 2 + 26, -1, width - 52, 2);
      marker.fill({ color: accent, alpha: active ? 0.22 : 0.1 });
    };

    const focus = new PIXI.Graphics();
    const bg = new PIXI.Graphics();
    const marker = new PIXI.Graphics();
    button.addChild(focus, bg, marker);
    draw(false);
    button.redraw = draw;

    const text = createText(label, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width - 76
    });
    text.anchor.set(0.5);
    button.addChild(text);
    button.position.set(x, y);
    button.on('pointerover', () => {
      this.setPauseFocusByButton(button);
      draw(true);
    });
    button.on('pointerout', () => draw(false));
    button.on('pointertap', () => {
      playMenuConfirmSfx(0.22);
      onPress?.();
    });
    return button;
  }

  updatePauseMenuMotion(delta = 1) {
    const decor = this.pauseMenuDecor;
    if (!decor) return;
    const dt = Math.max(0.1, Math.min(4, Number(delta) || 1));
    decor.time += dt * 0.016;
    const t = decor.time;
    const scanTravel = Math.max(1, decor.panelHeight - 58);
    decor.scanLine.y = (Math.sin(t * 1.75) * 0.5 + 0.5) * scanTravel;
    decor.scanLine.alpha = 0.34 + Math.sin(t * 5.2) * 0.08;
    decor.title.scale.set(1 + Math.sin(t * 2.1) * 0.012);
    decor.status.alpha = 0.74 + Math.sin(t * 3.4) * 0.18;
    decor.leftRadar.rotation += dt * 0.006;
    decor.rightRadar.rotation -= dt * 0.005;
    if (decor.leftRadar._sweep) decor.leftRadar._sweep.rotation += dt * 0.028;
    if (decor.rightRadar._sweep) decor.rightRadar._sweep.rotation -= dt * 0.024;
    this.pauseButtons?.forEach((button) => {
      button._pulse = button._focused ? (0.5 + Math.sin(t * 5.5) * 0.5) : 0;
      if (button._focused) button.redraw?.(false);
    });
  }

  setPauseFocusByButton(button) {
    const index = this.pauseButtons.findIndex((candidate) => candidate === button);
    if (index >= 0) this.setPauseFocus(index);
  }

  setPauseFocus(index) {
    if (!this.pauseButtons?.length) return;
    const count = this.pauseButtons.length;
    const next = ((index % count) + count) % count;
    const changed = this.pauseFocusedIndex !== next;
    this.pauseButtons.forEach((button, buttonIndex) => {
      button._focused = buttonIndex === next;
      button.redraw?.(false);
    });
    this.pauseFocusedIndex = next;
    if (changed) playMenuFocusSfx(0.08);
  }

  movePauseFocus(delta) {
    this.setPauseFocus(this.pauseFocusedIndex + delta);
    AudioManager.playSfx('thrusterFire', { volume: 0.07, minIntervalMs: 90 });
  }

  updatePauseMenuControls(delta) {
    if (this.tacticalLoadoutOverlay) {
      this.updatePauseMenuMotion(delta);
      this.tacticalLoadoutOverlay.update?.(delta);
      return;
    }
    if (this.howToPlayOverlay) {
      this.updatePauseMenuMotion(delta);
      this.howToPlayOverlay.update?.(delta);
      return;
    }
    if (this.settingsOverlay) {
      this.updatePauseMenuMotion(delta);
      this.settingsOverlay.update?.(delta);
      return;
    }
    this.updatePauseMenuMotion(delta);
    const nav = this.pauseGamepadNavigator.update();
    if (!nav.connected || !nav.active) return;
    if (nav.pressed.up) this.movePauseFocus(-1);
    if (nav.pressed.down) this.movePauseFocus(1);
    if (nav.pressed.confirm) {
      playMenuConfirmSfx(0.22);
      this.pauseButtons[this.pauseFocusedIndex]?.activate?.();
    }
    if (nav.pressed.cancel || nav.pressed.back) {
      playMenuBackSfx(0.18);
      this.setPaused(false);
    }
  }

  hidePauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.visible = false;
    }
  }

  destroyPauseOverlay() {
    this.closeTacticalLoadoutOverlay();
    if (this.pauseMenuFx?.container?.parent) {
      this.pauseMenuFx.container.parent.removeChild(this.pauseMenuFx.container);
    }
    this.pauseMenuFx?.destroy?.();
    this.pauseMenuFx = null;
    this.pauseMenuDecor = null;
    if (this.pauseOverlay?.parent) {
      this.pauseOverlay.parent.removeChild(this.pauseOverlay);
    }
    this.pauseOverlay?.destroy?.({ children: true });
    this.pauseOverlay = null;
    this.pauseButtons = [];
  }

  resetRandomTimers() {
    this.achievementTimer = 0;
    this.tauntTimer = 0;
    this.storyTransmissionTimer = 0;
  }

  updateRandomPopups(delta) {
    if (this.storyTransmissionTimer > 0) this.storyTransmissionTimer -= delta * 16.67;
  }

  queueStoryTransmission(delayMs = 2600) {
    const transmission = getStoryTransmission(this.game.level);
    if (!transmission?.id || this.shownStoryTransmissionIds.has(transmission.id)) return;
    this.storyTransmissionTimer = Math.max(500, delayMs);
  }

  showStoryTransmission({ force = false } = {}) {
    if (this.triggerCabinetLog('codex-discovery', {
      name: translateText('Cabinet Log')
    }, { force, debug: true })) {
      return true;
    }
    const transmission = getStoryTransmission(this.game.level);
    if (!transmission?.line) return false;
    if (!force && this.shownStoryTransmissionIds.has(transmission.id)) return false;
    if (!force && !this.canShowLore()) return false;
    if (transmission.imageAlias && !GameAssets.isValidTexture(GameAssets.getCommsPortrait(transmission.imageAlias))) {
      this.commsPortraitsReady?.then(() => {
        if (this.game?.currentScene === this) {
          this.queueStoryTransmission(500);
        }
      }).catch(() => {});
      return false;
    }
    const shown = this.showLoreBanner(transmission.line, {
      title: transmission.title,
      imageAlias: transmission.imageAlias,
      force
    });
    if (!shown) return false;
    this.shownStoryTransmissionIds.add(transmission.id);
    this.lastStoryTransmissionId = transmission.id;
    return true;
  }

  triggerCabinetLog(id, context = {}, options = {}) {
    if (!id) return false;
    if (!options.force && this.shownCabinetLogIds.has(id)) return false;
    if (!options.force && !this.canShowLore()) return false;

    const entry = getCabinetLogEntry(id, {
      level: this.game?.level || 1,
      score: this.game?.score || 0,
      streak: this.dangerDodgeCount || 0,
      ship: this.player?.shipName || this.player?.shipTrait?.label || 'SHIP',
      ...context
    });
    if (!entry?.line) return false;

    let appliedBonus = 0;
    const discovery = this.recordThreatDiscovery(entry.id, 'cabinetLogs', {
      name: entry.title,
      label: entry.title,
      role: entry.role || translateText('Cabinet Log'),
      description: entry.description,
      tip: entry.tip,
      line: entry.line,
      sector: this.game?.level || 1,
      source: context.source || id
    }, { silent: true });
    if (discovery?.isNew && Number.isFinite(discovery.appliedBonus)) {
      appliedBonus = discovery.appliedBonus;
    }

    const archiveLine = appliedBonus > 0
      ? `\n${translateText('CABINET LOG ARCHIVED')} +${appliedBonus}`
      : '';
    const shown = this.showLoreBanner(`${entry.line}${archiveLine}`, {
      title: entry.title || translateText('CABINET LOG'),
      imageAlias: entry.imageAlias,
      force: options.force,
      accent: entry.accent,
      duration: options.duration || (appliedBonus > 0 ? 4200 : 3600),
      maxWidth: this.game.getWidth() < 620
        ? this.game.getWidth() * 0.82
        : Math.min(460, this.game.getWidth() * 0.38)
    });
    if (!shown) return false;
    this.shownCabinetLogIds.add(id);
    this.lastCabinetLog = {
      id,
      title: entry.title,
      line: entry.line,
      archived: Boolean(discovery?.isNew),
      appliedBonus
    };
    return true;
  }

  checkLowLives() {
    const lives = Number(this.game?.lives) || 0;
    if (this.gameOverInterlude?.active || this.game?.gameOverTransitionPending || this.gameOverSequenceStarted || lives <= 0) return;
    if (lives <= 1 && this.lowLivesShownFor !== lives) {
      this.lowLivesShownFor = lives;
      this.showToast(getMicroMessage('lowHealth'), { fontSize: 22, y: this.game.getHeight() * 0.3 });
      AudioManager.playVoice('mission_control_life_low', { cooldownMs: 18000, duckMs: 1800 });
    }
  }

  closeTacticalLoadoutOverlay() {
    this.clearPendingTacticalBossBanter({ stopActive: true });
    if (this.tacticalLoadoutOverlay) {
      this.tacticalLoadoutOverlay.close();
      this.tacticalLoadoutOverlay = null;
    }
  }

  ensureCriticalHullOverlay() {
    if (this.criticalHullOverlay && this.criticalHullOverlay.parent) return this.criticalHullOverlay;
    if (!this.uiOverlay) return null;
    const overlay = new PIXI.Graphics();
    overlay.label = 'criticalHullOverlay';
    overlay.zIndex = 180;
    overlay.eventMode = 'none';
    overlay.visible = false;
    this.uiOverlay.addChild(overlay);
    this.criticalHullOverlay = overlay;
    return overlay;
  }

  updateCriticalHullOverlay(delta = 1) {
    const overlay = this.ensureCriticalHullOverlay();
    if (!overlay) return;
    const lives = Number(this.game?.lives) || 0;
    const shouldShow = lives === 1 &&
      !this.isPaused &&
      !this.introActive &&
      !this.gameOverInterlude?.active &&
      !this.overrunMilestoneInterlude?.active &&
      !this.gameOverSequenceStarted &&
      !this.game?.gameOverTransitionPending;
    overlay.clear();
    if (!shouldShow) {
      overlay.visible = false;
      overlay._debugCriticalHull = { visible: false, lives, paused: Boolean(this.isPaused) };
      return;
    }

    const width = Math.max(1, Number(this.game?.getWidth?.()) || Number(this.game?.app?.screen?.width) || 1280);
    const height = Math.max(1, Number(this.game?.getHeight?.()) || Number(this.game?.app?.screen?.height) || 720);
    const edge = Math.max(10, Math.min(34, Math.min(width, height) * 0.024));
    const pulse = 0.5 + Math.sin(Date.now() * 0.009 + Number(delta || 0) * 0.1) * 0.5;
    const hotAlpha = 0.12 + pulse * 0.08;
    const lineAlpha = 0.28 + pulse * 0.18;
    overlay.rect(0, 0, width, edge);
    overlay.fill({ color: 0xff315f, alpha: hotAlpha });
    overlay.rect(0, height - edge, width, edge);
    overlay.fill({ color: 0xff315f, alpha: hotAlpha * 0.86 });
    overlay.rect(0, 0, edge * 0.8, height);
    overlay.fill({ color: 0xff315f, alpha: hotAlpha * 0.72 });
    overlay.rect(width - edge * 0.8, 0, edge * 0.8, height);
    overlay.fill({ color: 0xff315f, alpha: hotAlpha * 0.72 });

    const corner = Math.max(34, edge * 2.2);
    const inset = Math.max(8, edge * 0.42);
    const strokeWidth = Math.max(1.5, edge * 0.12);
    const drawCorner = (sx, sy) => {
      const x = sx < 0 ? width - inset : inset;
      const y = sy < 0 ? height - inset : inset;
      overlay.moveTo(x, y + sy * corner);
      overlay.lineTo(x, y);
      overlay.lineTo(x + sx * corner, y);
    };
    drawCorner(1, 1);
    drawCorner(-1, 1);
    drawCorner(1, -1);
    drawCorner(-1, -1);
    overlay.stroke({ color: 0xffd15c, width: strokeWidth, alpha: lineAlpha });
    overlay.rect(inset * 0.62, inset * 0.62, width - inset * 1.24, height - inset * 1.24);
    overlay.stroke({ color: 0x37f5ff, width: Math.max(1, strokeWidth * 0.55), alpha: 0.08 + pulse * 0.08 });

    const edgePipCount = 10;
    for (let i = 0; i < edgePipCount; i += 1) {
      const t = (i + 0.5) / edgePipCount;
      const pipWidth = Math.max(10, edge * 0.55);
      const x = width * t;
      overlay.moveTo(x - pipWidth, inset + edge * 0.22);
      overlay.lineTo(x + pipWidth, inset + edge * 0.22);
      overlay.moveTo(x - pipWidth, height - inset - edge * 0.22);
      overlay.lineTo(x + pipWidth, height - inset - edge * 0.22);
    }
    overlay.stroke({ color: 0xfff08a, width: Math.max(1, strokeWidth * 0.8), alpha: 0.14 + pulse * 0.2 });

    const px = Math.max(edge, Math.min(width - edge, Number(this.player?.x) || width / 2));
    const py = Math.max(edge, Math.min(height - edge, Number(this.player?.y) || height / 2));
    const beaconRadius = Math.max(34, Math.min(width, height) * 0.052 + pulse * 5);
    overlay.circle(px, py, beaconRadius);
    overlay.stroke({ color: 0xffd15c, width: 2, alpha: 0.24 + pulse * 0.2 });
    const beaconTickCount = 4;
    for (let i = 0; i < beaconTickCount; i += 1) {
      const angle = pulse * 0.4 + i * Math.PI * 0.5;
      const tx = Math.cos(angle);
      const ty = Math.sin(angle);
      const sx = -Math.sin(angle);
      const sy = Math.cos(angle);
      const center = beaconRadius + 7;
      const cx = px + tx * center;
      const cy = py + ty * center;
      overlay.moveTo(cx - sx * 8 - tx * 3, cy - sy * 8 - ty * 3);
      overlay.lineTo(cx + tx * 6, cy + ty * 6);
      overlay.lineTo(cx + sx * 8 - tx * 3, cy + sy * 8 - ty * 3);
    }
    overlay.stroke({ color: 0xff4040, width: 2.2, alpha: 0.3 + pulse * 0.3 });
    overlay.visible = true;
    overlay._debugCriticalHull = {
      visible: true,
      lives,
      edge: Math.round(edge),
      hotAlpha: Number(hotAlpha.toFixed(3)),
      lineAlpha: Number(lineAlpha.toFixed(3)),
      edgePipCount,
      beaconTickCount,
      beaconRadius: Number(beaconRadius.toFixed(1)),
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  ensureSlowTimeVisualField() {
    if (this.slowTimeVisualField && this.slowTimeVisualField.parent) return this.slowTimeVisualField;
    if (!this.uiOverlay) return null;
    const field = new PIXI.Graphics();
    field.label = 'slowTimeVisualField';
    field.zIndex = 150;
    field.eventMode = 'none';
    field.visible = false;
    field.blendMode = 'add';
    this.uiOverlay.addChild(field);
    this.slowTimeVisualField = field;
    return field;
  }

  updateSlowTimeVisualField(delta = 1) {
    const field = this.ensureSlowTimeVisualField();
    if (!field) return;
    const active = this.player?.isSlowTimeActive?.() === true;
    const shouldShow = active &&
      !this.isPaused &&
      !this.introActive &&
      !this.gameOverInterlude?.active &&
      !this.overrunMilestoneInterlude?.active &&
      !this.gameOverSequenceStarted &&
      !this.game?.gameOverTransitionPending;
    field.clear();
    if (!shouldShow) {
      field.visible = false;
      field._debugSlowTimeField = { visible: false, active, paused: Boolean(this.isPaused) };
      return;
    }

    const width = Math.max(1, Number(this.game?.getWidth?.()) || Number(this.game?.app?.screen?.width) || 1280);
    const height = Math.max(1, Number(this.game?.getHeight?.()) || Number(this.game?.app?.screen?.height) || 720);
    const px = Math.max(0, Math.min(width, Number(this.player?.x) || width / 2));
    const py = Math.max(0, Math.min(height, Number(this.player?.y) || height / 2));
    const pulse = 0.5 + Math.sin(Date.now() * 0.006 + Number(delta || 0) * 0.05) * 0.5;
    const edge = Math.max(16, Math.min(42, Math.min(width, height) * 0.034));
    const alpha = 0.06 + pulse * 0.035;
    field.rect(0, 0, width, edge);
    field.fill({ color: 0x574dff, alpha });
    field.rect(0, height - edge, width, edge);
    field.fill({ color: 0x37f5ff, alpha: alpha * 0.82 });
    field.rect(0, 0, edge * 0.8, height);
    field.fill({ color: 0x8f6dff, alpha: alpha * 0.72 });
    field.rect(width - edge * 0.8, 0, edge * 0.8, height);
    field.fill({ color: 0x37f5ff, alpha: alpha * 0.72 });

    const timeSliceCount = 7;
    for (let i = 0; i < timeSliceCount; i += 1) {
      const sliceProgress = (i + 1) / (timeSliceCount + 1);
      const sliceY = (height * sliceProgress + Math.sin(Date.now() * 0.0014 + i * 1.7) * edge * 0.32) % height;
      const sliceInset = edge * (1.35 + (i % 2) * 0.34);
      const sliceWidth = Math.max(24, width - sliceInset * 2);
      field.rect(sliceInset, sliceY, sliceWidth, Math.max(1, edge * 0.045));
      field.fill({ color: i % 2 ? 0xb39cff : 0x37f5ff, alpha: 0.045 + pulse * 0.035 });
    }

    const radiusA = Math.max(48, Math.min(width, height) * 0.088 + pulse * 10);
    const radiusB = radiusA + Math.max(22, Math.min(width, height) * 0.044);
    field.circle(px, py, radiusA);
    field.stroke({ color: 0x37f5ff, width: 2, alpha: 0.34 + pulse * 0.18 });
    field.circle(px, py, radiusB);
    field.stroke({ color: 0xb39cff, width: 1.4, alpha: 0.2 + pulse * 0.12 });
    const tickCount = 12;
    const spin = Date.now() * 0.0012;
    for (let i = 0; i < tickCount; i += 1) {
      const angle = spin + (Math.PI * 2 * i) / tickCount;
      const inner = radiusA * 0.72;
      const outer = radiusB + (i % 3 === 0 ? 9 : 3);
      field.moveTo(px + Math.cos(angle) * inner, py + Math.sin(angle) * inner);
      field.lineTo(px + Math.cos(angle) * outer, py + Math.sin(angle) * outer);
    }
    field.stroke({ color: 0xffffff, width: 1, alpha: 0.16 + pulse * 0.12 });
    const clockTickCount = 16;
    for (let i = 0; i < clockTickCount; i += 1) {
      const angle = -spin * 0.55 + (Math.PI * 2 * i) / clockTickCount;
      const center = radiusB + (i % 4 === 0 ? 11 : 6);
      const length = i % 4 === 0 ? 9 : 5;
      const tx = -Math.sin(angle);
      const ty = Math.cos(angle);
      const cx = px + Math.cos(angle) * center;
      const cy = py + Math.sin(angle) * center;
      field.moveTo(cx - tx * length * 0.5, cy - ty * length * 0.5);
      field.lineTo(cx + tx * length * 0.5, cy + ty * length * 0.5);
    }
    field.stroke({ color: 0xb39cff, width: 1.25, alpha: 0.22 + pulse * 0.14 });
    field.visible = true;
    field._debugSlowTimeField = {
      visible: true,
      active: true,
      edge: Math.round(edge),
      radius: Number(radiusB.toFixed(1)),
      alpha: Number(alpha.toFixed(3)),
      timeSliceCount,
      clockTickCount,
      x: Math.round(px),
      y: Math.round(py)
    };
  }

  triggerPlayerDamageDirectionCue(options = {}) {
    if (!this.gameContainer || !this.game?.app?.ticker) return false;
    const playerLayer = this.player?.sprite || null;
    const targetLayer = playerLayer || this.uiOverlay || this.gameContainer;
    const toTargetLocalFromGlobal = (point) => {
      if (!targetLayer?.toLocal) return point;
      return targetLayer.toLocal(point);
    };
    const toTargetLocalFromWorld = (x, y) => {
      const point = new PIXI.Point(Number(x) || 0, Number(y) || 0);
      const global = this.gameContainer?.toGlobal ? this.gameContainer.toGlobal(point) : point;
      return toTargetLocalFromGlobal(global);
    };
    let renderedPlayer = null;
    try {
      const bounds = this.player?.shipSprite?.getBounds?.();
      if (!playerLayer && bounds && (Number(bounds.width) || 0) > 0 && (Number(bounds.height) || 0) > 0) {
        const globalCenter = new PIXI.Point(
          Number(bounds.x || 0) + Number(bounds.width || 0) / 2,
          Number(bounds.y || 0) + Number(bounds.height || 0) / 2
        );
        const local = toTargetLocalFromGlobal(globalCenter);
        if (Number.isFinite(Number(local?.x)) && Number.isFinite(Number(local?.y))) {
          renderedPlayer = { x: Number(local.x), y: Number(local.y) };
        }
      }
    } catch {
      renderedPlayer = null;
    }
    const spriteX = Number(this.player?.sprite?.x);
    const spriteY = Number(this.player?.sprite?.y);
    const width = Number(this.game?.getWidth?.()) || this.game?.app?.screen?.width || 1280;
    const height = Number(this.game?.getHeight?.()) || this.game?.app?.screen?.height || 720;
    const fallbackWorldX = Number.isFinite(spriteX) ? spriteX : Number.isFinite(Number(this.player?.x)) ? Number(this.player.x) : width / 2;
    const fallbackWorldY = Number.isFinite(spriteY) ? spriteY : Number.isFinite(Number(this.player?.y)) ? Number(this.player.y) : height * 0.7;
    const fallbackPlayer = toTargetLocalFromWorld(fallbackWorldX, fallbackWorldY);
    const impactPoint = playerLayer
      ? new PIXI.Point(0, 0)
      : Number.isFinite(Number(options.impactX)) && Number.isFinite(Number(options.impactY))
        ? toTargetLocalFromWorld(Number(options.impactX), Number(options.impactY))
        : (renderedPlayer || fallbackPlayer);
    const fallbackSource = new PIXI.Point(impactPoint.x, impactPoint.y - 1);
    const sourcePoint = Number.isFinite(Number(options.sourceX)) && Number.isFinite(Number(options.sourceY))
      ? toTargetLocalFromWorld(Number(options.sourceX), Number(options.sourceY))
      : fallbackSource;
    const impactX = Number.isFinite(Number(impactPoint?.x)) ? Number(impactPoint.x) : width / 2;
    const impactY = Number.isFinite(Number(impactPoint?.y)) ? Number(impactPoint.y) : height * 0.7;
    const sourceX = Number.isFinite(Number(sourcePoint?.x)) ? Number(sourcePoint.x) : impactX;
    const sourceY = Number.isFinite(Number(sourcePoint?.y)) ? Number(sourcePoint.y) : impactY - 1;
    const source = String(options.source || 'unknown');
    const color = Number.isFinite(Number(options.color)) ? Number(options.color) : 0xff6677;
    let dx = sourceX - impactX;
    let dy = sourceY - impactY;
    let length = Math.hypot(dx, dy);
    if (length < 1) {
      dx = 0;
      dy = -1;
      length = 1;
    }
    const nx = dx / length;
    const ny = dy / length;
    const tx = -ny;
    const ty = nx;
    const angle = Math.atan2(ny, nx);
    const chevronCount = 3;
    const ringCount = 2;
    const durationMs = 760;

    if (this.playerDamageDirectionCue?.ticker) {
      this.game.app.ticker.remove(this.playerDamageDirectionCue.ticker);
      this._activeTickers = (this._activeTickers || []).filter(fn => fn !== this.playerDamageDirectionCue.ticker);
    }
    if (this.playerDamageDirectionCue?.layer?.parent) {
      this.playerDamageDirectionCue.layer.parent.removeChild(this.playerDamageDirectionCue.layer);
    }

    const layer = new PIXI.Graphics();
    layer.label = 'playerDamageDirectionCue';
    layer.x = impactX;
    layer.y = impactY;
    layer.zIndex = 99996;
    layer.blendMode = 'add';
    targetLayer.addChild(layer);
    targetLayer.sortChildren?.();

    const setDebug = (visible, elapsedMs = 0) => {
      layer._debugDamageDirectionCue = {
        visible,
        source,
        sourceX: Math.round(sourceX),
        sourceY: Math.round(sourceY),
        impactX: Math.round(impactX),
        impactY: Math.round(impactY),
        directionAngle: Number(angle.toFixed(3)),
        chevronCount: visible ? chevronCount : 0,
        ringCount: visible ? ringCount : 0,
        elapsedMs: Math.round(elapsedMs)
      };
      this.lastPlayerDamageDirectionCueDebug = { ...layer._debugDamageDirectionCue };
    };

    const drawCue = (elapsedMs) => {
      const t = Math.max(0, Math.min(1, elapsedMs / durationMs));
      const fade = Math.max(0, 1 - t);
      const pulse = 0.5 + Math.sin(elapsedMs * 0.022) * 0.5;
      const baseRadius = 34 + t * 16;
      layer.clear();
      layer.circle(0, 0, baseRadius);
      layer.stroke({ color, width: 3.1, alpha: 0.62 * fade });
      layer.circle(0, 0, baseRadius + 13 + pulse * 3);
      layer.stroke({ color: 0xffffff, width: 1.6, alpha: 0.34 * fade });
      layer.arc(0, 0, baseRadius + 24, angle - 0.42, angle + 0.42);
      layer.stroke({ color: 0xffffff, width: 3.2, alpha: 0.3 * fade });
      layer.moveTo(nx * (baseRadius + 5), ny * (baseRadius + 5));
      layer.lineTo(nx * (baseRadius + 76), ny * (baseRadius + 76));
      layer.stroke({ color, width: 1.25, alpha: 0.2 * fade });
      for (let i = 0; i < chevronCount; i += 1) {
        const r = baseRadius + 25 + i * 13 + t * 9;
        const tipR = r - 14;
        const spread = 10 + i * 0.8;
        const wingInset = 3 + i * 1.7;
        const tipX = nx * tipR;
        const tipY = ny * tipR;
        const wingX = nx * (r + wingInset);
        const wingY = ny * (r + wingInset);
        layer.poly([
          tipX, tipY,
          wingX + tx * spread, wingY + ty * spread,
          wingX - tx * spread, wingY - ty * spread
        ]);
        layer.fill({ color, alpha: (0.12 + i * 0.035) * fade });
        layer.moveTo(wingX + tx * spread, wingY + ty * spread);
        layer.lineTo(tipX, tipY);
        layer.lineTo(wingX - tx * spread, wingY - ty * spread);
      }
      layer.stroke({ color, width: 3.2, alpha: 0.92 * fade });
      layer.circle(nx * (baseRadius + 8), ny * (baseRadius + 8), 4.2 + pulse * 1.4);
      layer.fill({ color: 0xffffff, alpha: 0.72 * fade });
      layer.circle(nx * (baseRadius + 42), ny * (baseRadius + 42), 5.6 + pulse * 1.1);
      layer.stroke({ color: 0xffffff, width: 1.9, alpha: 0.55 * fade });
      layer.visible = true;
      setDebug(true, elapsedMs);
    };

    let elapsedMs = 0;
    drawCue(0);
    const ticker = (tick) => {
      elapsedMs += tick.deltaTime * 16.67;
      if (elapsedMs >= durationMs) {
        layer.clear();
        layer.visible = false;
        setDebug(false, elapsedMs);
        if (layer.parent) layer.parent.removeChild(layer);
        this.game.app.ticker.remove(ticker);
        this._activeTickers = (this._activeTickers || []).filter(fn => fn !== ticker);
        if (this.playerDamageDirectionCue?.ticker === ticker) this.playerDamageDirectionCue = null;
        return;
      }
      drawCue(elapsedMs);
    };
    this.game.app.ticker.add(ticker);
    if (!this._activeTickers) this._activeTickers = [];
    this._activeTickers.push(ticker);
    this.playerDamageDirectionCue = { layer, ticker, source, startedAtMs: Date.now(), durationMs };
    return true;
  }

  triggerPlayerDeathFeedback(options = {}) {
    const finalDeath = Boolean(options.final || this.game?.lives <= 0);
    if (finalDeath && this.finalDeathFeedbackShown) return;
    if (finalDeath) this.finalDeathFeedbackShown = true;
    if (!this.player && !finalDeath) return;

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const gameplayWidth = this.gameplayGame.getWidth();
    const gameplayHeight = this.gameplayGame.getHeight();
    const impactX = this.player?.x ?? gameplayWidth / 2;
    const impactY = this.player?.y ?? gameplayHeight * 0.72;
    if (finalDeath) this.finalDeathImpact = { x: impactX, y: impactY };

    this.lastHitStopRequestMs = finalDeath ? 420 : 180;
    this.freezeTimerMs = this.lastHitStopRequestMs;

    if (this.screenShake) this.screenShake.shake(finalDeath ? 42 : 25);

    const flash = new PIXI.Graphics();
    flash.rect(0, 0, width, height).fill({ color: finalDeath ? 0xff174a : 0xff0000, alpha: finalDeath ? 0.68 : 0.5 });
    this.uiOverlay.addChild(flash);

    const fadeTicker = (ticker) => {
      if (!flash.parent) {
        this.game.app.ticker.remove(fadeTicker);
        return;
      }
      flash.alpha -= (finalDeath ? 0.028 : 0.05) * ticker.deltaTime;
      if (flash.alpha <= 0) {
        if (flash.parent) flash.parent.removeChild(flash);
        this.game.app.ticker.remove(fadeTicker);
      }
    };
    this.game.app.ticker.add(fadeTicker);
    if (!this._activeTickers) this._activeTickers = [];
    this._activeTickers.push(fadeTicker);

    // 4. Multiple Explosions
    if (this.particleManager) {
      // Immediate big one
      this.particleManager.createExplosion(impactX, impactY, finalDeath ? 0xff55d9 : 0x00ffff);
      const burstCount = finalDeath ? 7 : 3;
      for (let i = 1; i <= burstCount; i++) {
        const id = setTimeout(() => {
          if (this.particleManager) {
            this.particleManager.createExplosion(
              impactX + (Math.random() - 0.5) * (finalDeath ? 180 : 50),
              impactY + (Math.random() - 0.5) * (finalDeath ? 130 : 50),
              finalDeath && i % 2 === 0 ? 0x37f5ff : 0xffaa00
            );
          }
        }, i * (finalDeath ? 90 : 80));
        if (!this._deathTimeouts) this._deathTimeouts = [];
        this._deathTimeouts.push(id);
      }
    }

    AudioManager.playSfx('explosionCrunch', { force: true, volume: 1.0 });
  }

  beginGameOverSequence() {
    if (this.gameOverSequenceStarted) return true;
    this.gameOverSequenceStarted = true;
    this.flushDeferredRunContractEvents(Number.MAX_SAFE_INTEGER);
    this.flushDeferredRunContractProgress(true);
    this.game.lockFinalScore?.('final_life_lost');
    this.clearToastState();
    this.triggerPlayerDeathFeedback({ final: true });
    commitGameOverFinalTransmissionVariant(this.gameOverFinalTransmissionVariant);
    let transitioned = false;
    let safetyId = null;
    const complete = () => {
      if (transitioned) return;
      transitioned = true;
      if (safetyId) clearTimeout(safetyId);
      if (this.game?.currentScene === this) {
        this.game.gameOver({ fromInterlude: true });
      }
    };
    this.showInGameGameOverAnimation({ onComplete: complete });
    safetyId = setTimeout(complete, GAME_OVER_DEATH_HOLD_MS + GAME_OVER_CELEBRATION_DURATION_MS + 1200);
    if (!this._deathTimeouts) this._deathTimeouts = [];
    this._deathTimeouts.push(safetyId);
    return true;
  }

  showInGameGameOverAnimation({ onComplete } = {}) {
    if (!this.uiOverlay || this.gameOverAnimationLayer?.parent) return false;
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const variant = this.gameOverFinalTransmissionVariant
      || reserveNextGameOverFinalTransmissionVariant();
    this.gameOverFinalTransmissionVariant = variant;
    const animation = variant.animation || {};
    const colors = variant.colors || { primary: 0x37f5ff, secondary: 0xff55d9, accent: 0xfff3a2 };
    const layer = new PIXI.Container();
    layer.label = 'ui_in_game_game_over_animation';
    layer.zIndex = 1000000;
    layer.alpha = 0;
    layer.scale.set(0.965);
    layer.eventMode = 'static';
    layer.cursor = 'pointer';
    layer.hitArea = new PIXI.Rectangle(0, 0, width, height);
    this.gameOverAnimationLayer = layer;

    const shade = new PIXI.Graphics();
    shade.rect(0, 0, width, height);
    shade.fill({ color: 0x01040b, alpha: 0.46 });
    layer.addChild(shade);

    const heroTexture = GameAssets.getGameOverFinalTransmissionTexture?.(variant);
    const hero = new PIXI.Sprite(GameAssets.isValidTexture(heroTexture) ? heroTexture : PIXI.Texture.EMPTY);
    hero.label = 'game_over_final_transmission_art';
    hero.anchor.set(0.5);
    hero.position.set(width / 2, height / 2);
    hero.eventMode = 'none';
    hero.visible = false;
    const fitHero = (texture) => {
      if (!GameAssets.isValidTexture(texture) || hero.destroyed) return false;
      hero.texture = texture;
      const coverScale = Math.max(width / Math.max(1, texture.width), height / Math.max(1, texture.height));
      hero._baseScale = coverScale * 1.035;
      hero.scale.set(hero._baseScale);
      hero.visible = true;
      if (this.gameOverAnimationDebug) this.gameOverAnimationDebug.generatedArtReady = true;
      return true;
    };
    fitHero(heroTexture);
    layer.addChild(hero);
    if (!hero.visible) {
      GameAssets.ensureGameOverFinalTransmissionTexture?.(variant).then((texture) => {
        if (this.gameOverAnimationLayer === layer) fitHero(texture);
      }).catch(() => {});
    }

    const fractureVeil = new PIXI.Graphics();
    fractureVeil.label = 'game_over_angular_fracture_veil';
    const coreX = width / 2;
    const coreY = height * 0.315;
    const fractureSegments = [
      [-0.34, -0.03, -0.19, 0.02], [-0.27, 0.08, -0.12, 0.04],
      [-0.18, -0.12, -0.07, -0.02], [0.34, -0.04, 0.19, 0.02],
      [0.27, 0.09, 0.12, 0.04], [0.18, -0.13, 0.07, -0.02]
    ];
    fractureSegments.forEach(([x1, y1, x2, y2], index) => {
      fractureVeil.moveTo(coreX + width * x1, coreY + height * y1);
      fractureVeil.lineTo(coreX + width * x2, coreY + height * y2);
      fractureVeil.stroke({ color: index % 2 ? colors.primary : colors.secondary, width: index % 3 === 0 ? 2 : 1, alpha: 0.42 });
    });
    layer.addChild(fractureVeil);

    const signalTexture = GameAssets.getGameOverFinalSignalTexture?.(variant);
    const createSignalSprite = (label) => {
      const sprite = new PIXI.Sprite(GameAssets.isValidTexture(signalTexture) ? signalTexture : PIXI.Texture.EMPTY);
      sprite.label = label;
      sprite.anchor.set(0.5);
      sprite.blendMode = 'add';
      sprite.eventMode = 'none';
      sprite.position.set(coreX, coreY);
      sprite.visible = false;
      sprite.alpha = 0;
      return sprite;
    };
    const signalField = new PIXI.Graphics();
    signalField.label = 'game_over_final_signal_field';
    signalField.blendMode = 'add';
    signalField.eventMode = 'none';
    signalField.position.set(coreX, coreY);
    const signalEchoBack = createSignalSprite('game_over_final_signal_echo_back');
    const signalEchoFront = createSignalSprite('game_over_final_signal_echo_front');
    const coreSignal = createSignalSprite('game_over_final_signal_core');
    const signalSprites = [signalEchoBack, signalEchoFront, coreSignal];
    const fitSignal = (texture) => {
      if (!GameAssets.isValidTexture(texture) || coreSignal.destroyed) return false;
      const targetSize = Math.max(126, Math.min(214, Math.min(width, height) * (width < 720 ? 0.22 : 0.19)));
      const baseScale = targetSize / Math.max(1, texture.width, texture.height);
      signalSprites.forEach((sprite) => {
        sprite.texture = texture;
        sprite._baseScale = baseScale;
        sprite.scale.set(baseScale);
        sprite.visible = true;
      });
      if (this.gameOverAnimationDebug) this.gameOverAnimationDebug.signalAssetReady = true;
      return true;
    };
    fitSignal(signalTexture);
    layer.addChild(signalField, signalEchoBack, signalEchoFront, coreSignal);
    if (!coreSignal.visible) {
      GameAssets.ensureGameOverFinalSignalTexture?.(variant).then((texture) => {
        if (this.gameOverAnimationLayer === layer) fitSignal(texture);
      }).catch(() => {});
    }

    const scanBlade = new PIXI.Graphics();
    scanBlade.label = 'game_over_signal_scan_blade';
    const scanWidth = Math.min(width * 0.72, 900);
    scanBlade.poly([
      -scanWidth / 2, -4,
      scanWidth / 2 - 24, -4,
      scanWidth / 2, 0,
      scanWidth / 2 - 24, 4,
      -scanWidth / 2, 4
    ]);
    scanBlade.fill({ color: colors.primary, alpha: 0.42 });
    scanBlade.position.set(coreX, coreY - height * 0.1);
    scanBlade.rotation = -0.045;
    scanBlade.alpha = 0;
    layer.addChild(scanBlade);

    const shards = Array.from({ length: width < 720 ? 12 : 20 }, (_, index) => {
      const shard = new PIXI.Graphics();
      const side = index % 2 === 0 ? -1 : 1;
      const spread = 0.055 + (index % 10) * 0.034;
      const size = 3 + (index % 4) * 1.5;
      shard.poly([0, -size * 1.8, size, 0, 0, size * 1.8, -size * 0.65, 0]);
      shard.fill({ color: index % 3 === 0 ? colors.primary : colors.secondary, alpha: 0.82 });
      shard.position.set(coreX + side * width * spread, coreY + ((index % 5) - 2) * height * 0.025);
      shard.rotation = side * (0.18 + index * 0.11);
      shard._originX = shard.x;
      shard._originY = shard.y;
      const radialX = side * (54 + (index % 6) * 18);
      const radialY = ((index % 7) - 3) * 18 - 18;
      if (animation.shardMode === 'spiral') {
        shard._driftX = radialY * 0.8;
        shard._driftY = -radialX * 0.45;
      } else if (animation.shardMode === 'shear') {
        shard._driftX = side * (110 + (index % 4) * 24);
        shard._driftY = side * ((index % 5) - 2) * 12;
      } else if (animation.shardMode === 'cascade') {
        shard._driftX = side * (24 + (index % 5) * 12);
        shard._driftY = 82 + (index % 7) * 18;
      } else {
        shard._driftX = radialX;
        shard._driftY = radialY;
      }
      shard._delayMs = 140 + (index % 5) * 55;
      layer.addChild(shard);
      return shard;
    });

    const titlePlate = new PIXI.Graphics();
    titlePlate.label = 'game_over_final_transmission_title_plate';
    const plateWidth = Math.min(width * 0.78, 820);
    const plateHeight = width < 720 ? 118 : 158;
    const plateY = height * 0.62;
    const cut = width < 720 ? 14 : 22;
    titlePlate.poly([
      coreX - plateWidth / 2 + cut, plateY - plateHeight / 2,
      coreX + plateWidth / 2 - cut, plateY - plateHeight / 2,
      coreX + plateWidth / 2, plateY - plateHeight / 2 + cut,
      coreX + plateWidth / 2 - cut, plateY + plateHeight / 2,
      coreX - plateWidth / 2 + cut, plateY + plateHeight / 2,
      coreX - plateWidth / 2, plateY + plateHeight / 2 - cut,
      coreX - plateWidth / 2, plateY - plateHeight / 2 + cut
    ]);
    titlePlate.fill({ color: 0x010711, alpha: 0.78 });
    titlePlate.stroke({ color: colors.primary, width: 1.5, alpha: 0.68 });
    titlePlate.moveTo(coreX - plateWidth / 2 + cut + 18, plateY - plateHeight / 2 + 7);
    titlePlate.lineTo(coreX - 42, plateY - plateHeight / 2 + 7);
    titlePlate.moveTo(coreX + 42, plateY + plateHeight / 2 - 7);
    titlePlate.lineTo(coreX + plateWidth / 2 - cut - 18, plateY + plateHeight / 2 - 7);
    titlePlate.stroke({ color: colors.secondary, width: 2, alpha: 0.68 });
    titlePlate.alpha = 0;
    const titleEntryX = animation.titleEntry === 'left' ? -56 : animation.titleEntry === 'right' ? 56 : 0;
    const titleEntryY = animation.titleEntry === 'rise' ? 42 : animation.titleEntry === 'drop' ? -42 : 0;
    titlePlate.x = titleEntryX;
    titlePlate.y = titleEntryY;
    layer.addChild(titlePlate);

    const titleSize = width < 720 ? 46 : 78;
    const title = createText(translateText('GAME OVER'), {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: titleSize,
      fontWeight: '900',
      fill: `#${colors.accent.toString(16).padStart(6, '0')}`,
      stroke: '#2a0013',
      strokeThickness: width < 720 ? 5 : 8,
      align: 'center',
      letterSpacing: 0,
      dropShadow: true,
      dropShadowColor: `#${colors.secondary.toString(16).padStart(6, '0')}`,
      dropShadowBlur: 12,
      dropShadowDistance: 0
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = plateY - (width < 720 ? 12 : 18);
    title.alpha = 0;
    title.scale.set(0.88);
    layer.addChild(title);

    const finalScore = typeof this.game.getFinalScore === 'function' ? this.game.getFinalScore() : this.game.score;
    const subtitle = createText(`${translateText('SCORE')}: ${Number(finalScore || 0).toLocaleString('en-US')}  //  ${translateText('SECTOR')} ${this.game.level || 1}`, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: width < 720 ? 17 : 24,
      fontWeight: '900',
      fill: `#${colors.primary.toString(16).padStart(6, '0')}`,
      stroke: '#020711',
      strokeThickness: 4,
      align: 'center'
    });
    subtitle.anchor.set(0.5);
    subtitle.x = width / 2;
    subtitle.y = plateY + (width < 720 ? 37 : 48);
    subtitle.alpha = 0;
    layer.addChild(subtitle);

    const handoffShade = new PIXI.Graphics();
    handoffShade.label = 'game_over_direct_handoff_shade';
    handoffShade.rect(0, 0, width, height);
    handoffShade.fill({ color: 0x01030a, alpha: 1 });
    handoffShade.alpha = 0;
    layer.addChild(handoffShade);

    const deathHoldCue = new PIXI.Graphics();
    deathHoldCue.label = 'game_over_death_hold_cue';
    deathHoldCue.zIndex = 999999;
    deathHoldCue.eventMode = 'none';
    this.uiOverlay.addChild(deathHoldCue);
    this.uiOverlay.addChild(layer);
    this.uiOverlay.sortChildren?.();
    this.gameOverAnimationDebug = {
      active: true,
      visualLanguage: 'final_transmission_imagegen_v3_signal_atlas',
      variantId: variant.id,
      variantCount: 30,
      animationSignature: { ...animation },
      generatedArtReady: hero.visible,
      signalAssetReady: coreSignal.visible,
      signalMode: animation.signalMode,
      signalSrc: variant.signalSrc,
      primitiveRingCount: 0,
      shardCount: shards.length,
      titlePlate: true,
      animationPhases: ['death_hold', 'impact', 'fracture', 'title_reveal', 'final_hold', 'direct_handoff'],
      directHandoff: true,
      deathHoldMs: GAME_OVER_DEATH_HOLD_MS,
      deathHoldCue: true,
      skippable: true,
      skipped: false,
      skipReason: null,
      startedAt: Date.now(),
      durationMs: GAME_OVER_DEATH_HOLD_MS + GAME_OVER_CELEBRATION_DURATION_MS
    };

    let elapsed = -GAME_OVER_DEATH_HOLD_MS;
    let presentationStarted = false;
    let completed = false;
    let ticker = null;
    const skipDebounceUntil = Date.now() + 180;
    const initialControllerState = this.inputManager?.getGamepadState?.() || {};
    let controllerReleasedSinceStart = !Object.values(initialControllerState.buttons || {}).some(Boolean);
    const completeAnimation = (reason = 'natural') => {
      if (completed) return;
      completed = true;
      if (this.gameOverAnimationDebug) {
        this.gameOverAnimationDebug.active = false;
        this.gameOverAnimationDebug.skipped = reason !== 'natural';
        this.gameOverAnimationDebug.skipReason = reason === 'natural' ? null : reason;
      }
      if (ticker) this.game.app.ticker.remove(ticker);
      this._activeTickers = (this._activeTickers || []).filter((fn) => fn !== ticker);
      window.removeEventListener('keydown', handleGameOverSkipKey);
      layer.removeAllListeners?.('pointerdown');
      if (deathHoldCue.parent) deathHoldCue.parent.removeChild(deathHoldCue);
      deathHoldCue.destroy?.();
      onComplete?.();
    };
    const requestSkip = (reason) => {
      if (Date.now() < skipDebounceUntil) return false;
      completeAnimation(reason);
      return true;
    };
    const handleGameOverSkipKey = (event) => {
      if (event.repeat) return;
      if (!['Enter', 'NumpadEnter', 'Space', 'Escape'].includes(event.code)) return;
      event.preventDefault?.();
      requestSkip('keyboard');
    };
    window.addEventListener('keydown', handleGameOverSkipKey);
    layer.on('pointerdown', () => requestSkip('pointer'));
    const duration = GAME_OVER_CELEBRATION_DURATION_MS;
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const easeOutCubic = (value) => 1 - Math.pow(1 - clamp01(value), 3);
    const easeInOut = (value) => {
      const t = clamp01(value);
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    ticker = (tick) => {
      elapsed += tick.deltaTime * 16.67;
      const gamepad = this.inputManager?.getGamepadState?.() || {};
      const controllerPressed = Object.values(gamepad.buttons || {}).some(Boolean);
      if (!controllerReleasedSinceStart && !controllerPressed) controllerReleasedSinceStart = true;
      if (controllerReleasedSinceStart && controllerPressed && Date.now() >= skipDebounceUntil) {
        completeAnimation('controller');
        return;
      }
      if (elapsed < 0) {
        const holdProgress = clamp01((elapsed + GAME_OVER_DEATH_HOLD_MS) / GAME_OVER_DEATH_HOLD_MS);
        const holdPulse = 0.5 + Math.sin(holdProgress * Math.PI * 5) * 0.5;
        const impact = this.finalDeathImpact || { x: width / 2, y: height * 0.7 };
        const ringRadius = 44 + holdProgress * 150;
        deathHoldCue.clear();
        deathHoldCue.rect(5, 5, width - 10, height - 10);
        deathHoldCue.stroke({
          color: holdProgress < 0.42 ? 0xff315d : colors.primary,
          width: 3 + holdPulse * 2,
          alpha: 0.22 + holdPulse * 0.32
        });
        deathHoldCue.circle(impact.x, impact.y, ringRadius);
        deathHoldCue.stroke({ color: 0xff315d, width: 5 - holdProgress * 3, alpha: (1 - holdProgress) * 0.7 });
        deathHoldCue.circle(impact.x, impact.y, ringRadius * 0.62);
        deathHoldCue.stroke({ color: colors.primary, width: 2, alpha: 0.32 + holdPulse * 0.3 });
        deathHoldCue.rect(0, 0, width, Math.max(10, height * 0.018));
        deathHoldCue.fill({ color: 0x01040b, alpha: 0.58 });
        deathHoldCue.rect(0, height - Math.max(10, height * 0.018), width, Math.max(10, height * 0.018));
        deathHoldCue.fill({ color: 0x01040b, alpha: 0.58 });
        deathHoldCue.alpha = Math.min(1, holdProgress * 2.4);
        deathHoldCue.visible = true;
        if (this.gameOverAnimationDebug) this.gameOverAnimationDebug.deathHoldProgress = holdProgress;
        layer.alpha = 0;
        return;
      }
      deathHoldCue.visible = false;
      if (!presentationStarted) {
        presentationStarted = true;
        AudioManager.playSfx('swarm_chatter_stinger', { force: true, volume: 0.92, minIntervalMs: 0 });
      }
      const t = Math.min(1, elapsed / duration);
      const intro = easeOutCubic(elapsed / 560);
      const titleIn = easeOutCubic((elapsed - 420) / 520);
      const scoreIn = easeOutCubic((elapsed - 820) / 420);
      const handoff = easeInOut((elapsed - (duration - 420)) / 420);
      const holdPulse = 0.5 + Math.sin(elapsed * 0.0065) * 0.5;
      layer.alpha = intro;
      layer.scale.set(0.965 + intro * 0.035);
      if (hero.visible && hero._baseScale) {
        const cinematicDrift = easeInOut(t);
        const phase = elapsed * 0.001 * (animation.speed || 1) + (animation.phase || 0);
        const ampX = animation.amplitudeX || 6;
        const ampY = animation.amplitudeY || 5;
        let motionX = Math.sin(phase) * ampX;
        let motionY = Math.cos(phase * 0.83) * ampY;
        if (animation.path === 'parallax') {
          motionX = Math.sin(phase * 0.72) * ampX + Math.cos(phase * 1.9) * ampX * 0.45;
          motionY = Math.cos(phase * 0.54) * ampY;
        } else if (animation.path === 'ascend') {
          motionX = Math.sin(phase * 1.4) * ampX;
          motionY = (1 - cinematicDrift) * 30 - cinematicDrift * ampY;
        } else if (animation.path === 'descend') {
          motionX = Math.cos(phase * 1.15) * ampX;
          motionY = -(1 - cinematicDrift) * 30 + cinematicDrift * ampY;
        } else if (animation.path === 'figure_eight') {
          motionX = Math.sin(phase) * ampX;
          motionY = Math.sin(phase * 2) * ampY;
        } else if (animation.path === 'recoil') {
          const recoil = Math.sin(Math.min(1, elapsed / 780) * Math.PI) * (1 - cinematicDrift * 0.35);
          motionX = Math.sin(phase * 2.2) * ampX * 0.55;
          motionY = -recoil * ampY * 2.4 + Math.cos(phase) * ampY * 0.35;
        }
        hero.scale.set(hero._baseScale * (0.98 + intro * 0.028 + cinematicDrift * (animation.zoom || 0.035) + holdPulse * 0.004));
        hero.position.set(
          width / 2 + motionX + (animation.driftX || 0) * cinematicDrift,
          height / 2 - (1 - intro) * 28 + motionY + (animation.driftY || 0) * cinematicDrift
        );
        hero.rotation = Math.sin(phase * 0.64) * (animation.rotation || 0);
        hero.alpha = 0.72 + intro * 0.2 + holdPulse * 0.06;
      }
      fractureVeil.alpha = 0.18 + intro * 0.34 + holdPulse * 0.28;
      const coreBurst = easeOutCubic((elapsed - 100) / 720);
      let corePulse = holdPulse;
      if (animation.coreMode === 'flare') corePulse = Math.max(holdPulse * 0.55, 1 - clamp01((elapsed - 120) / 980));
      if (animation.coreMode === 'breathe') corePulse = 0.5 + Math.sin(elapsed * 0.0035) * 0.5;
      if (animation.coreMode === 'tremor') corePulse = 0.5 + Math.sin(elapsed * 0.014) * 0.5;
      if (animation.coreMode === 'doublebeat') corePulse = Math.pow(Math.max(0, Math.sin(elapsed * 0.009)), 5);
      const signalPhase = elapsed * (animation.signalPulseRate || 0.0045) + (animation.phase || 0);
      const signalSpin = elapsed * (animation.signalSpin || 0.00035);
      const echoSpread = animation.signalEchoSpread || 0.15;
      const orbitCount = animation.signalOrbitCount || 5;
      const signalPulse = 0.5 + Math.sin(signalPhase * Math.PI * 2) * 0.5;
      let signalOffsetX = 0;
      let signalOffsetY = 0;
      if (animation.signalMode === 'cathedral') signalOffsetY = Math.sin(signalPhase) * 8;
      else if (animation.signalMode === 'eclipse') signalOffsetX = Math.cos(signalPhase) * 10;
      else if (animation.signalMode === 'compass') {
        signalOffsetX = Math.sin(signalPhase * 1.7) * 6;
        signalOffsetY = Math.cos(signalPhase * 1.3) * 6;
      } else if (animation.signalMode === 'quantum_knot') {
        signalOffsetX = Math.sin(signalPhase * 2) * 9;
        signalOffsetY = Math.sin(signalPhase * 3) * 5;
      } else if (animation.signalMode === 'nova') {
        signalOffsetY = -Math.pow(signalPulse, 3) * 9;
      }
      const baseSignalScale = coreSignal._baseScale || 0.6;
      const revealScale = 0.42 + coreBurst * 0.58;
      coreSignal.alpha = Math.max(0, 0.6 + corePulse * 0.34);
      coreSignal.scale.set(baseSignalScale * revealScale * (0.94 + signalPulse * 0.1));
      coreSignal.rotation = signalSpin + (animation.signalTilt || 0);
      coreSignal.position.set(coreX + signalOffsetX, coreY + signalOffsetY);
      signalEchoBack.alpha = 0.08 + signalPulse * 0.2;
      signalEchoBack.scale.set(baseSignalScale * revealScale * (1.18 + echoSpread + signalPulse * 0.12));
      signalEchoBack.rotation = -signalSpin * 0.72 - (animation.signalTilt || 0);
      signalEchoBack.position.set(coreX - signalOffsetX * 0.35, coreY - signalOffsetY * 0.35);
      signalEchoFront.alpha = 0.1 + (1 - signalPulse) * 0.16;
      signalEchoFront.scale.set(baseSignalScale * revealScale * (0.78 - echoSpread * 0.2 + signalPulse * 0.08));
      signalEchoFront.rotation = signalSpin * 1.45;
      signalEchoFront.position.set(coreX + signalOffsetX * 0.5, coreY + signalOffsetY * 0.5);
      signalField.clear();
      for (let orbitIndex = 0; orbitIndex < orbitCount; orbitIndex += 1) {
        const angle = signalPhase * (animation.direction || 1) + (Math.PI * 2 * orbitIndex) / orbitCount;
        const radius = 66 + (orbitIndex % 3) * 13 + signalPulse * 8;
        const dotRadius = 1.6 + (orbitIndex % 3) * 0.9;
        signalField.circle(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.58, dotRadius);
        signalField.fill({
          color: orbitIndex % 3 === 0 ? colors.accent : orbitIndex % 2 ? colors.primary : colors.secondary,
          alpha: 0.34 + signalPulse * 0.42
        });
      }
      signalField.alpha = coreBurst;
      signalField.rotation = signalSpin * -0.45;
      const scanProgress = clamp01((elapsed - 260) / 1500);
      if (animation.scanMode === 'up') {
        scanBlade.position.set(coreX, coreY + height * 0.14 - scanProgress * height * 0.25);
      } else if (animation.scanMode === 'left' || animation.scanMode === 'right') {
        const direction = animation.scanMode === 'left' ? -1 : 1;
        scanBlade.rotation = Math.PI / 2;
        scanBlade.position.set(coreX - direction * width * 0.24 + direction * scanProgress * width * 0.48, coreY);
      } else if (animation.scanMode === 'diagonal_down' || animation.scanMode === 'diagonal_up') {
        const direction = animation.scanMode === 'diagonal_down' ? 1 : -1;
        scanBlade.rotation = direction * 0.34;
        scanBlade.position.set(coreX - width * 0.16 + scanProgress * width * 0.32, coreY - direction * height * 0.13 + direction * scanProgress * height * 0.26);
      } else {
        scanBlade.position.set(coreX, coreY - height * 0.11 + scanProgress * height * 0.25);
      }
      scanBlade.alpha = Math.sin(scanProgress * Math.PI) * 0.54;
      shards.forEach((shard, index) => {
        const travel = easeOutCubic((elapsed - shard._delayMs) / (1380 + (index % 4) * 130));
        const returnTravel = animation.shardMode === 'return' ? Math.sin(travel * Math.PI) : travel;
        const spiralX = animation.shardMode === 'spiral' ? Math.sin(travel * Math.PI * 2 + index) * 26 * travel : 0;
        const spiralY = animation.shardMode === 'spiral' ? Math.cos(travel * Math.PI * 2 + index) * 18 * travel : 0;
        shard.x = shard._originX + shard._driftX * returnTravel + spiralX;
        shard.y = shard._originY + shard._driftY * returnTravel + spiralY;
        shard.rotation += (index % 2 ? 1 : -1) * 0.012 * (animation.fragmentSpin || 1) * tick.deltaTime;
        shard.alpha = Math.max(0, 0.22 + travel * 0.72 + holdPulse * 0.08);
      });
      titlePlate.x = titleEntryX * (1 - titleIn);
      titlePlate.y = titleEntryY * (1 - titleIn);
      titlePlate.alpha = titleIn * (0.78 + holdPulse * 0.12);
      title.x = width / 2 + titleEntryX * (1 - titleIn);
      title.y = plateY - (width < 720 ? 12 : 18) + titleEntryY * (1 - titleIn);
      title.alpha = titleIn;
      const titleZoom = animation.titleEntry === 'zoom' ? 0.18 : 0;
      title.scale.set(0.88 - titleZoom * (1 - titleIn) + titleIn * 0.12 + holdPulse * 0.008);
      subtitle.alpha = scoreIn * (0.84 + holdPulse * 0.16);
      handoffShade.alpha = handoff;
      if (elapsed >= duration) {
        completeAnimation('natural');
      }
    };
    this.game.app.ticker.add(ticker);
    if (!this._activeTickers) this._activeTickers = [];
    this._activeTickers.push(ticker);
    return true;
  }

  getGameOverAnimationDebugState(getBounds) {
    const layer = this.gameOverAnimationLayer;
    const debug = this.gameOverAnimationDebug;
    if (!debug) return { active: false, visible: false };
    return {
      ...debug,
      visible: Boolean(layer?.parent),
      bounds: typeof getBounds === 'function' ? getBounds(layer) : null
    };
  }

  onLifeLost(lives, context = {}) {
    const source = String(context?.source || 'unknown');
    this.lifeLostThisWave = true;
    this.lastLifeLossAtMs = Date.now();
    this.levelClearVoiceToken = (this.levelClearVoiceToken || 0) + 1;
    if (this.lastLevelClearVoiceDecision?.status === 'scheduled') {
      this.lastLevelClearVoiceDecision = {
        ...this.lastLevelClearVoiceDecision,
        status: 'suppressed',
        reason: 'life_lost_after_schedule',
        suppressedAt: this.lastLifeLossAtMs
      };
    }
    this.lastLifeLossSource = source;
    if (context?.final || (Number(lives) || 0) <= 0) {
      this.finalLifeLossSource = source;
    }
    this.lifeLossesThisRun = (Number(this.lifeLossesThisRun) || 0) + 1;
    this.damageTakenThisWave = (Number(this.damageTakenThisWave) || 0) + 1;
    this.damageTakenThisSector = (Number(this.damageTakenThisSector) || 0) + 1;
    this.emitRunContractEvent('life_lost', { sector: this.game?.level || 1, source });
    this.recordBalanceLifeLost();
    this.player?.cancelDodgeExitPulse?.('life_lost', { endDodge: true });
    this.player?.clearStatusEffects?.('life_lost');
    if (this.tryLastStandRepair()) {
      if ((Number(this.game?.lives) || 0) > 0) {
        this.respawnsThisRun = (Number(this.respawnsThisRun) || 0) + 1;
      }
      return;
    }
    if (this.game.lives <= 0) {
      this.flushBalanceDebugSummary('game_over');
      return;
    }

    this.showToast(getMicroMessage('lifeLost'), { fontSize: 22, y: this.game.getHeight() * 0.32 });
    if (this.game.lives === 1) {
      this.triggerCabinetLog('low-life-read', {
        source: 'one_life_left'
      });
    }

    // RESPONDER LOGIC
    if (this.player && this.game.lives > 0) {
      this.respawnsThisRun = (Number(this.respawnsThisRun) || 0) + 1;
      this.player.forceRespawn(this.gameplayGame.getWidth(), this.gameplayGame.getHeight());
      this.player.grantInvulnerability?.(RESPAWN_INVULNERABILITY_MS, 'respawn');
      this.recordBalanceRespawn();
      const clearedHazards = this.clearRespawnHazards('life_lost') +
        this.applyBossWipeoutRespawnProtection(this.pendingBossWipeoutRecovery, this.enemyManager?.boss);
      if (clearedHazards > 0) {
        const compactHud = this.game.getWidth() < 620;
        this.showToast(`RESPAWN SHOCKWAVE x${clearedHazards}`, {
          fontSize: compactHud ? 15 : 18,
          fill: '#8fffd5',
          stroke: '#001616',
          strokeThickness: compactHud ? 2 : 3,
          duration: 1200,
          slot: 'top',
          type: 'repair',
          priority: 2,
          y: this.game.getHeight() * (compactHud ? 0.28 : 0.2),
          maxWidth: this.game.getWidth() * (compactHud ? 0.82 : 0.62)
        });
      }
      AudioManager.recoverSfx('respawn');
      this.maybeSpawnBossClutchShield();
      // Small screen shake
      if (this.screenShake) this.screenShake.shake(5);
    }
    const boss = this.enemyManager?.boss;
    if (boss && boss.active) {
      console.log(`[BossHP] player_death level=${this.game.level} hp=${boss.health} max=${boss.maxHealth} bossActive=true`);
      this.showBossTaunt('boss_life_lost');
    }
  }

  maybeSpawnBossClutchShield() {
    const level = Number(this.game?.level) || 1;
    const boss = this.enemyManager?.boss;
    if (!boss?.active || level > 6 || this.game.lives !== 1) return false;
    if (this.bossClutchShieldLevel === level) return false;
    if (!this.powerupManager || !this.player) return false;

    this.bossClutchShieldLevel = level;
    const spawned = this.powerupManager.spawnSpecific(
      this.player.x,
      this.player.y,
      'shield',
      { source: 'boss_clutch_shield' }
    );
    if (!spawned) return false;

    this.enqueueToast('CLUTCH SHIELD CORE', {
      fontSize: this.game.getWidth() < 620 ? 15 : 18,
      fill: '#8fffd5',
      stroke: '#001616',
      strokeThickness: 3,
      duration: 1400,
      slot: 'top',
      type: 'repair',
      priority: 3,
      y: this.game.getHeight() * (this.game.getWidth() < 620 ? 0.28 : 0.2),
      maxWidth: this.game.getWidth() * 0.72
    });
    AudioManager.playSfx('forceField', { force: true, volume: 0.7, minIntervalMs: 250 });
    return true;
  }

  getBossMercyCooldownMs(level = this.game?.level || 1) {
    const config = BalanceConfig.bossMercy || {};
    if (config.enabled !== true) return 0;

    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const maxProtectedLevel = Math.max(1, Math.floor(Number(config.maxProtectedLevel) || 10));
    const earlyCooldownMs = Math.max(0, Number(config.earlyCooldownMs) || 7000);
    const lateCooldownMs = Math.max(0, Number(config.lateCooldownMs) || 5000);
    const minimumCooldownMs = Math.max(0, Number(config.minimumCooldownMs) || 2500);
    const levelReductionMs = Math.max(0, Number(config.levelReductionMs) || 250);

    if (safeLevel <= maxProtectedLevel) {
      return Math.max(lateCooldownMs, earlyCooldownMs - (safeLevel - 1) * levelReductionMs);
    }
    return Math.max(minimumCooldownMs, lateCooldownMs - (safeLevel - maxProtectedLevel) * levelReductionMs);
  }

  getBossWipeoutConfig() {
    const config = BalanceConfig.bossMercy?.wipeoutGuard || {};
    return config.enabled === true ? config : null;
  }

  getBossEncounterKey(boss = this.enemyManager?.boss) {
    const level = Math.max(1, Math.floor(Number(boss?.level) || Number(this.game?.level) || 1));
    const bossId = boss?.profile?.id || boss?.name || boss?.bossType || 'boss';
    return `${level}:${bossId}`;
  }

  resetBossWipeoutGuard(reason = 'reset') {
    if (this.bossWipeoutGuard && this.debugPowerups) {
      console.log(`[BossWipeoutGuard] reset reason=${reason} deaths=${this.bossWipeoutGuard.totalDeaths || 0}`);
    }
    this.bossWipeoutGuard = null;
    this.pendingBossWipeoutRecovery = null;
  }

  getBossLifeLossCapConfig() {
    const config = BalanceConfig.bossMercy?.lifeLossCap || {};
    if (BalanceConfig.bossMercy?.enabled !== true || config.enabled !== true) return null;
    const safeLevel = Math.max(1, Math.floor(Number(this.enemyManager?.boss?.level) || Number(this.game?.level) || 1));
    const baseWindowMs = Math.max(1000, Number(config.windowMs) || 7000);
    const fullWindowThroughLevel = Math.max(1, Math.floor(Number(config.fullWindowThroughLevel) || 30));
    const windowReductionMsPerLevel = Math.max(0, Number(config.windowReductionMsPerLevel) || 0);
    const minimumWindowMs = Math.max(1000, Number(config.minimumWindowMs) || baseWindowMs);
    const levelsPastFullWindow = Math.max(0, safeLevel - fullWindowThroughLevel);
    const windowMs = Math.max(minimumWindowMs, baseWindowMs - levelsPastFullWindow * windowReductionMsPerLevel);
    return {
      maxLives: Math.max(1, Math.floor(Number(config.maxLives) || 2)),
      windowMs
    };
  }

  resetBossLifeLossCap(reason = 'reset') {
    if (this.bossLifeLossCapState && this.debugPowerups) {
      console.log(`[BossLifeLossCap] reset reason=${reason} losses=${this.bossLifeLossCapState.lossTimes?.length || 0}`);
    }
    this.bossLifeLossCapState = null;
  }

  getRecentBossLifeLossTimes(boss = this.enemyManager?.boss, now = Date.now()) {
    const config = this.getBossLifeLossCapConfig();
    if (!config || !boss?.active) return [];
    const encounterKey = this.getBossEncounterKey(boss);
    const state = this.bossLifeLossCapState?.encounterKey === encounterKey
      ? this.bossLifeLossCapState
      : { encounterKey, lossTimes: [] };
    const lossTimes = (state.lossTimes || []).filter((time) => now - time < config.windowMs);
    this.bossLifeLossCapState = { encounterKey, lossTimes };
    return lossTimes;
  }

  canBossLifeLossCapAllowHit(source = 'boss_damage', boss = this.enemyManager?.boss) {
    const config = this.getBossLifeLossCapConfig();
    if (!config || !boss?.active) return true;
    const now = Date.now();
    const lossTimes = this.getRecentBossLifeLossTimes(boss, now);
    if (lossTimes.length < config.maxLives) return true;

    const oldest = Math.min(...lossTimes);
    const remainingMs = Math.max(0, config.windowMs - (now - oldest));
    const feedbackCooldownMs = Math.max(0, Number(BalanceConfig.bossMercy?.blockedHitFeedbackCooldownMs) || 600);
    if (now - (this.lastBossLifeLossCapBlockLogAt || 0) >= feedbackCooldownMs) {
      this.lastBossLifeLossCapBlockLogAt = now;
      console.log(
        `[BossLifeLossCap] block source=${source}` +
        ` level=${Number(boss?.level) || Number(this.game?.level) || 1}` +
        ` recent=${lossTimes.length}/${config.maxLives}` +
        ` windowMs=${Math.round(config.windowMs)} remainingMs=${Math.round(remainingMs)}`
      );
    }
    this.showBossMercyBlockedFeedback(source);
    return false;
  }

  recordBossLifeLossCap(source = 'boss_damage', boss = this.enemyManager?.boss) {
    const config = this.getBossLifeLossCapConfig();
    if (!config || !boss?.active) return null;
    const now = Date.now();
    const encounterKey = this.getBossEncounterKey(boss);
    const lossTimes = this.getRecentBossLifeLossTimes(boss, now);
    lossTimes.push(now);
    this.bossLifeLossCapState = {
      encounterKey,
      lossTimes: lossTimes.filter((time) => now - time < config.windowMs),
      lastSource: source,
      lastLossAt: now
    };
    return this.bossLifeLossCapState;
  }

  recordBossWipeoutLifeLoss(source = 'boss_damage', boss = this.enemyManager?.boss) {
    const config = this.getBossWipeoutConfig();
    if (!config || !boss?.active) return null;

    const now = Date.now();
    const encounterKey = this.getBossEncounterKey(boss);
    const recentWindowMs = Math.max(1000, Number(config.recentDeathWindowMs) || 14000);
    const previous = this.bossWipeoutGuard?.encounterKey === encounterKey
      ? this.bossWipeoutGuard
      : {
          encounterKey,
          level: Math.max(1, Math.floor(Number(boss?.level) || Number(this.game?.level) || 1)),
          bossName: boss?.name || boss?.profile?.name || 'Boss',
          bossArchetype: boss?.profile?.archetype || null,
          totalDeaths: 0,
          deathTimes: []
        };

    const deathTimes = (previous.deathTimes || []).filter((time) => now - time <= recentWindowMs);
    deathTimes.push(now);
    const totalDeaths = (Number(previous.totalDeaths) || 0) + 1;
    const repeatedDeaths = Math.max(totalDeaths, deathTimes.length);
    const secondDeathRecoveryMs = Math.max(0, Number(config.secondDeathRecoveryMs) || 8500);
    const thirdDeathRecoveryMs = Math.max(secondDeathRecoveryMs, Number(config.thirdDeathRecoveryMs) || 11500);
    const thirdDeathControlMs = Math.max(thirdDeathRecoveryMs, Number(config.thirdDeathControlMs) || 10000);
    const attackRunwayMs = Math.max(0, Number(config.attackRunwayMs) || 1800);
    const secondAttackRunwayMs = Math.max(attackRunwayMs, Number(config.secondDeathAttackRunwayMs) || 3200);
    const thirdAttackRunwayMs = Math.max(secondAttackRunwayMs, Number(config.thirdDeathAttackRunwayMs) || 4800);
    const baseMercyMs = this.getBossMercyCooldownMs(previous.level);
    const recoveryMs = repeatedDeaths >= 3
      ? Math.max(baseMercyMs, thirdDeathRecoveryMs, thirdDeathControlMs)
      : repeatedDeaths >= 2
        ? Math.max(baseMercyMs, secondDeathRecoveryMs)
        : baseMercyMs;
    const attackRunway = repeatedDeaths >= 3
      ? thirdAttackRunwayMs
      : repeatedDeaths >= 2
        ? secondAttackRunwayMs
        : attackRunwayMs;

    const guard = {
      ...previous,
      totalDeaths,
      recentDeaths: deathTimes.length,
      deathTimes,
      lastDeathAt: now,
      lastSource: source,
      recoveryMs,
      attackRunwayMs: attackRunway,
      controlUntilMs: now + recoveryMs,
      clearBossHazards: config.clearBossHazardsOnDeath !== false
    };
    this.bossWipeoutGuard = guard;
    this.pendingBossWipeoutRecovery = guard;
    console.log(
      `[BossWipeoutGuard] life_loss level=${guard.level} boss=${guard.bossName}` +
      ` source=${source} deaths=${guard.totalDeaths} recent=${guard.recentDeaths}` +
      ` recoveryMs=${Math.round(recoveryMs)} attackRunwayMs=${Math.round(attackRunway)}`
    );
    return guard;
  }

  applyBossWipeoutRespawnProtection(guard = this.pendingBossWipeoutRecovery, boss = this.enemyManager?.boss) {
    if (!guard || !boss?.active) return 0;
    let cleared = 0;
    if (guard.clearBossHazards) {
      cleared += this.clearBossHazards(`boss_wipeout_guard:${guard.lastSource || 'boss'}`);
    }
    const now = Date.now();
    this.bossMercyUntilMs = Math.max(this.bossMercyUntilMs || 0, now + Math.max(0, Number(guard.recoveryMs) || 0));
    this.player?.grantInvulnerability?.(Math.max(0, Number(guard.recoveryMs) || 0), 'boss_wipeout_guard');
    boss.applyRecoveryPause?.(Math.max(0, Number(guard.attackRunwayMs) || 0), 'boss_wipeout_guard');
    this.pendingBossWipeoutRecovery = null;
    return cleared;
  }

  canBossCauseLifeLoss(source = 'boss_damage', boss = this.enemyManager?.boss) {
    const config = BalanceConfig.bossMercy || {};
    if (config.enabled !== true) return true;
    const now = Date.now();
    if (!this.canBossLifeLossCapAllowHit(source, boss)) return false;
    const remainingMs = Math.max(0, (this.bossMercyUntilMs || 0) - now);
    if (remainingMs <= 0) return true;

    const feedbackCooldownMs = Math.max(0, Number(config.blockedHitFeedbackCooldownMs) || 600);
    if (now - (this.lastBossMercyBlockLogAt || 0) >= feedbackCooldownMs) {
      this.lastBossMercyBlockLogAt = now;
      console.log(`[BossMercy] block source=${source} level=${Number(boss?.level) || Number(this.game?.level) || 1} remainingMs=${Math.round(remainingMs)}`);
    }
    this.showBossMercyBlockedFeedback(source);
    return false;
  }

  startBossMercyWindow(source = 'boss_damage', boss = this.enemyManager?.boss, cooldownMs = this.getBossMercyCooldownMs(boss?.level || this.game?.level || 1)) {
    const duration = Math.max(0, Number(cooldownMs) || 0);
    if (duration <= 0) return 0;
    const now = Date.now();
    this.bossMercyUntilMs = Math.max(this.bossMercyUntilMs || 0, now + duration);
    const level = Number(boss?.level) || Number(this.game?.level) || 1;
    console.log(`[BossMercy] trigger source=${source} level=${level} cooldownMs=${Math.round(duration)}`);
    return duration;
  }

  applyBossRecoverySeparation(boss = this.enemyManager?.boss) {
    if (!this.player || !boss || !this.game) return false;
    const config = BalanceConfig.bossMercy || {};
    const pushback = Math.max(0, Number(config.contactPushbackPx) || 72);
    const width = this.gameplayGame.getWidth();
    const height = this.gameplayGame.getHeight();
    const margin = Math.max(24, (this.player.radius || 12) + 12);
    let dx = this.player.x - boss.x;
    const baseDy = this.player.y - boss.y;
    let dy = baseDy + 0.85 * Math.max(1, Math.abs(dx) + Math.abs(baseDy));
    let length = Math.hypot(dx, dy);
    if (!Number.isFinite(length) || length < 0.01) {
      dx = 0;
      dy = 1;
      length = 1;
    }
    const nx = dx / length;
    const ny = dy / length;
    const targetX = Math.max(margin, Math.min(width - margin, this.player.x + nx * pushback));
    const targetY = Math.max(margin, Math.min(height - margin, this.player.y + ny * pushback));
    this.player.x = targetX;
    this.player.y = targetY;
    this.player.sprite.x = targetX;
    this.player.sprite.y = targetY;
    this.particleManager?.createHitSpark(targetX, targetY, boss.color || 0xfff45c);
    return true;
  }

  showBossMercyBlockedFeedback(source = 'boss_damage') {
    const config = BalanceConfig.bossMercy || {};
    const cooldownMs = Math.max(0, Number(config.blockedHitFeedbackCooldownMs) || 600);
    const now = Date.now();
    if (now - (this.lastBossMercyFeedbackAt || 0) < cooldownMs) return false;
    this.lastBossMercyFeedbackAt = now;
    this.enqueueToast(translateText('RECOVERING'), {
      fontSize: this.game.getWidth() < 620 ? 13 : 15,
      fill: '#8fffd5',
      stroke: '#001616',
      strokeThickness: 2,
      duration: 520,
      slot: 'corner',
      type: 'repair',
      priority: 1
    });
    if (source === 'boss_contact') this.screenShake?.shake(2, 8);
    return true;
  }

  handleBossCausedPlayerHit(source, boss = this.enemyManager?.boss, options = {}) {
    if (!this.player?.active || this.player.isGhostActive?.()) return false;
    if (!this.canBossCauseLifeLoss(source, boss)) {
      this.particleManager?.createHitSpark(this.player.x, this.player.y, boss?.color || 0x8fffd5);
      return false;
    }
    if (this.player.invulnerable) {
      this.showBossMercyBlockedFeedback(source);
      return false;
    }

    const damageTaken = this.player.takeDamage();
    if (!damageTaken) {
      this.screenShake?.shake(options.shieldShake || 4);
      this.particleManager?.createHitSpark(this.player.x, this.player.y, boss?.color || 0x8fffd5);
      return false;
    }

    this.recordBossLifeLossCap(source, boss);
    const wipeoutGuard = this.recordBossWipeoutLifeLoss(source, boss);
    const cooldownMs = this.startBossMercyWindow(
      source,
      boss,
      Math.max(this.getBossMercyCooldownMs(boss?.level || this.game?.level || 1), Number(wipeoutGuard?.recoveryMs) || 0)
    );
    this.player.grantInvulnerability?.(cooldownMs, 'boss_mercy');
    if (source === 'boss_contact') this.applyBossRecoverySeparation(boss);
    this.triggerPlayerDamageDirectionCue({
      source,
      sourceX: Number.isFinite(Number(options.sourceX)) ? Number(options.sourceX) : boss?.x,
      sourceY: Number.isFinite(Number(options.sourceY)) ? Number(options.sourceY) : boss?.y,
      color: boss?.color || 0xff55d9
    });
    this.triggerCabinetLog('boss-mercy-read', {
      source: 'boss_mercy'
    });
    this.recordBalanceDamage(options.balanceSource || source);
    this.lastHitAt = Date.now();
    this.game.loseLife({ source });
    this.triggerPlayerDeathFeedback();
    return true;
  }

  isBossOwnedBullet(bullet) {
    return bullet?.sourceEnemyType === 'boss' || bullet?.visualConfig?.sourceEnemyType === 'boss';
  }

  getMaxLives() {
    const configuredMaxLives = Number(BalanceConfig.survival?.maxLives) || MAX_PLAYER_LIVES;
    return Number.isFinite(configuredMaxLives)
      ? Math.max(1, configuredMaxLives)
      : Number.POSITIVE_INFINITY;
  }

  onLifeGained(lives, context = {}) {
    const before = Number.isFinite(context.before) ? context.before : null;
    const after = Number.isFinite(context.after) ? context.after : (Number.isFinite(lives) ? lives : null);
    const gained = before != null && after != null ? Math.max(0, Math.round(after - before)) : 0;
    if (gained > 0) {
      this.extraLivesEarnedThisRun = (Number(this.extraLivesEarnedThisRun) || 0) + gained;
    }
    const configuredMaxLives = Number(context.maxLives) || this.getMaxLives();
    const maxLives = Number.isFinite(configuredMaxLives)
      ? Math.max(1, configuredMaxLives)
      : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(maxLives)) return;
    const beforeLives = Number.isFinite(context.before) ? context.before : maxLives - 1;
    const currentLives = Number.isFinite(lives) ? lives : Number(this.game?.lives) || 0;
    if (currentLives >= maxLives && beforeLives < maxLives) {
      this.showMaxLivesNotification({ maxLives });
    }
  }

  showMaxLivesNotification({ maxLives = this.getMaxLives() } = {}) {
    const compactHud = this.game.getWidth() < 620;
    this.enqueueToast(translateText('MAX LIVES REACHED!'), {
      fontSize: compactHud ? 21 : 34,
      fill: '#7dffcc',
      stroke: '#001616',
      strokeThickness: compactHud ? 4 : 5,
      duration: 2800,
      slot: 'top',
      type: 'repair',
      priority: 6,
      y: this.game.getHeight() * (compactHud ? 0.26 : 0.2),
      maxWidth: this.game.getWidth() * (compactHud ? 0.9 : 0.7)
    });
    this.spawnMaxLivesVfx();
    this.screenShake?.smallShake?.();
    AudioManager.playSfx('achievement', { force: true, volume: 1.0, minIntervalMs: 250 });

    const now = Date.now();
    if (now - this.lastMaxLivesVoiceAt > 30000) {
      this.lastMaxLivesVoiceAt = now;
      AudioManager.playVoice('mission_control_lives_max', {
        force: true,
        bypassGlobalCooldown: true,
        stopOtherVoices: true,
        cooldownMs: 30000,
        duckMs: 2600,
        duckFactor: 0.28,
        volume: 1.75
      });
    }
    this.triggerCabinetLog('max-lives-read', {
      source: 'max_lives'
    });
    console.log(`[Lives] max_reached lives=${maxLives}`);
  }

  spawnMaxLivesVfx() {
    if (!this.player || !this.gameContainer || !this.game?.app?.ticker) return;

    const burst = new PIXI.Container();
    burst.x = this.player.x;
    burst.y = this.player.y;
    burst.zIndex = 9000;

    const rings = [0, 1, 2, 3].map((index) => {
      const ring = new PIXI.Graphics();
      ring.__delay = index * 120;
      burst.addChild(ring);
      return ring;
    });
    this.gameContainer.addChild(burst);

    let elapsed = 0;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      burst.x = this.player?.x ?? burst.x;
      burst.y = this.player?.y ?? burst.y;
      rings.forEach((ring, index) => {
        const t = Math.max(0, Math.min(1, (elapsed - ring.__delay) / 900));
        ring.clear();
        if (t <= 0 || t >= 1) return;
        const radius = 24 + t * (72 + index * 14);
        ring.circle(0, 0, radius);
        ring.stroke({
          color: index % 2 === 1 ? 0xffffff : 0x7dffcc,
          width: 4 - t * 2,
          alpha: 0.92 * (1 - t)
        });
      });

      if (elapsed >= 1480) {
        this.game.app.ticker.remove(ticker);
        if (burst.parent) burst.parent.removeChild(burst);
      }
    };
    this.game.app.ticker.add(ticker);
    AudioManager.playSfx('life_up', { force: true, volume: 1.0, minIntervalMs: 250 });
  }

  tryLastStandRepair() {
    if (BalanceConfig.survival?.lastStandRepairEnabled !== true) return false;
    if (!this.player || this.game.lives > 0) return false;
    const now = Date.now();
    if (now < this.lastStandReadyAt) return false;

    this.lastStandReadyAt = now + 35000;
    this.game.lives = 2;
    this.lowLivesShownFor = null;
    this.player.forceRespawn(this.gameplayGame.getWidth(), this.gameplayGame.getHeight());
    this.player.grantInvulnerability?.(RESPAWN_INVULNERABILITY_MS, 'last_stand');
    this.recordBalanceRespawn();
    const clearedHazards = this.clearRespawnHazards('last_stand');
    const compactHud = this.game.getWidth() < 620;
    const suffix = clearedHazards > 0 ? ` x${clearedHazards}` : '';

    this.showToast(`LAST STAND REPAIR${suffix}`, {
      fontSize: compactHud ? 16 : 22,
      fill: '#8fffd5',
      stroke: '#001616',
      strokeThickness: compactHud ? 2 : 3,
      duration: 1500,
      slot: 'top',
      type: 'repair',
      priority: 3,
      y: this.game.getHeight() * (compactHud ? 0.28 : 0.2),
      maxWidth: this.game.getWidth() * (compactHud ? 0.84 : 0.64)
    });
    AudioManager.playSfx('powerup', { force: true, volume: 0.78, minIntervalMs: 250 });
    AudioManager.playVoice('mission_control_life_low', { cooldownMs: 18000, duckMs: 1800 });
    if (this.screenShake) this.screenShake.shake(8);
    return true;
  }

  getRandomTimer(minMs, maxMs) {
    return minMs + Math.random() * (maxMs - minMs);
  }

  showSpecialEnemySignal({
    title,
    message,
    type = 'special_enemy',
    accent = 0xffd15c,
    duration = 1500,
    priority = 6,
    y = null,
    maxWidth = null
  } = {}) {
    if (!message) return false;
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 720;
    const resolvedY = Number.isFinite(y)
      ? y
      : compact
        ? Math.min(height - 86, Math.max(250, height * 0.35))
        : Math.max(188, height * 0.27);
    const resolvedMaxWidth = Number.isFinite(maxWidth)
      ? maxWidth
      : compact
        ? Math.min(width - 32, 430)
        : Math.min(440, width * 0.36);
    const align = 'left';
    this.lastSpecialEnemySignal = {
      title: String(title || ''),
      message: String(message),
      type,
      accent,
      align,
      edgeAligned: true,
      duration,
      shownAt: Date.now()
    };
    this.enqueueToast(message, {
      fontSize: compact ? 15 : 17,
      fill: '#f5fbff',
      slot: 'top',
      type,
      priority,
      duration,
      minVisibleMs: Math.min(duration, 1050),
      extraReadTimeMs: 0,
      y: resolvedY,
      maxWidth: resolvedMaxWidth,
      accent,
      banner: true,
      title: title || null,
      align,
      showAvatar: false,
      specialEnemySignal: true,
      edgeAligned: true,
      placement: 'left-edge'
    });
    return true;
  }

  showToast(message, options = {}) {
    this.enqueueToast(message, options);
  }

  showAchievementToast(toast) {
    const achievement = toast?.achievement || toast;
    if (!achievement?.name) return false;
    const id = achievement.id || toast?.id || achievement.name;
    const alreadyActive = this.activeAchievementToast?.__achievementToastId === id;
    const duplicateQueued = this.achievementToastQueue.some((entry) => entry.id === id);
    if (alreadyActive || duplicateQueued) return true;

    const entry = {
      id,
      achievement,
      createdAt: Date.now()
    };
    if (!this.firstRunOnboardingComplete && this.getFirstRunControlsNudge()) {
      return false;
    }
    if (this.activeAchievementToast) {
      this.achievementToastQueue.push(entry);
      return true;
    }
    return this.showAchievementToastNow(entry);
  }

  showAchievementToastNow(entry) {
    const achievement = entry?.achievement;
    if (!achievement?.name || !this.uiOverlay || !this.game?.app?.ticker) return false;

    const { width, height } = this.game.app.screen;
    const compact = width < 1100 || height < 700;
    const panelWidth = Math.min(compact ? width - 28 : 470, width * 0.82);
    const panelHeight = compact ? 78 : 86;
    const banner = new PIXI.Container();
    banner.x = width / 2;
    banner.y = Math.max(compact ? 92 : 96, height * 0.13);
    banner.alpha = 0;
    banner.scale.set(0.94);
    banner.zIndex = 11000;
    banner.__achievementToastId = entry.id;

    const panel = new PIXI.Graphics();
    panel.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x04131d, alpha: 0.9 });
    panel.stroke({ color: 0xffd15c, width: 2, alpha: 0.95 });
    banner.addChild(panel);

    const glow = new PIXI.Graphics();
    glow.roundRect(-panelWidth / 2 + 5, -panelHeight / 2 + 5, panelWidth - 10, panelHeight - 10, 6);
    glow.stroke({ color: 0x00f6ff, width: 1, alpha: 0.72 });
    banner.addChild(glow);

    const accent = new PIXI.Graphics();
    accent.roundRect(-panelWidth / 2 + 14, -panelHeight / 2 + 14, 5, panelHeight - 28, 3);
    accent.fill({ color: 0xffd15c, alpha: 1 });
    banner.addChild(accent);

    const title = createText('ACHIEVEMENT UNLOCKED', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 12 : 14,
      fill: '#ffd15c',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'left'
    });
    title.anchor.set(0, 0.5);
    title.x = -panelWidth / 2 + 34;
    title.y = compact ? -18 : -20;
    banner.addChild(title);

    const name = createText(achievement.name, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 18 : 22,
      fill: '#ffffff',
      stroke: '#00131c',
      strokeThickness: 3,
      align: 'left',
      wordWrap: true,
      wordWrapWidth: panelWidth - 68
    });
    name.anchor.set(0, 0.5);
    name.x = title.x;
    name.y = compact ? 12 : 12;
    if (name.width > panelWidth - 68) {
      name.scale.set((panelWidth - 68) / name.width);
    }
    banner.addChild(name);

    this.uiOverlay.addChild(banner);
    this.activeAchievementToast = banner;
    AudioManager.playSfx('achievement', { force: true, volume: 0.82, minIntervalMs: 0 });

    const duration = 3400;
    let elapsed = 0;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      if (elapsed < 220) {
        const t = elapsed / 220;
        banner.alpha = t;
        banner.scale.set(0.94 + t * 0.06);
      } else if (elapsed > duration - 420) {
        banner.alpha = Math.max(0, (duration - elapsed) / 420);
      } else {
        banner.alpha = 1;
        banner.scale.set(1);
      }

      if (elapsed >= duration) {
        this.removeAchievementToast({ showNext: true });
      }
    };
    this.achievementToastTicker = ticker;
    this.game.app.ticker.add(ticker);
    return true;
  }

  removeAchievementToast({ showNext = false } = {}) {
    if (this.achievementToastTicker && this.game?.app?.ticker) {
      this.game.app.ticker.remove(this.achievementToastTicker);
    }
    this.achievementToastTicker = null;
    if (this.activeAchievementToast?.parent) {
      this.activeAchievementToast.parent.removeChild(this.activeAchievementToast);
    }
    this.activeAchievementToast = null;
    if (showNext && this.achievementToastQueue.length > 0) {
      const next = this.achievementToastQueue.shift();
      setTimeout(() => this.showAchievementToastNow(next), 160);
    }
  }

  applyLifeRepair(targetLives = 3, invulnerabilityMs = 3000) {
    const before = Number.isFinite(this.game?.lives) ? this.game.lives : 0;
    if (before <= 0) return 0;
    const maxLives = this.getMaxLives();
    const target = Math.max(before, Math.min(maxLives, Math.round(targetLives)));
    if (target <= before) return 0;

    this.game.lives = target;
    this.lowLivesShownFor = null;
    this.onLifeGained(target, {
      before,
      after: target,
      maxLives,
      source: 'life_repair',
      reachedMax: target >= maxLives
    });

    if (this.player) {
      this.player.grantInvulnerability?.(invulnerabilityMs, 'life_repair');
    }

    AudioManager.playSfx('powerup', { force: true, volume: 0.72, minIntervalMs: 250 });
    return target - before;
  }

  applyBossClearRecovery(level = this.game?.level || 1) {
    const rewardConfig = BalanceConfig.rewards || {};
    const sustainConfig = RunPacingConfig.sustain || {};
    const repairLives = Math.max(0, Number(rewardConfig.bossClearRepairLives) || 0);
    const maxLives = Math.min(
      Math.max(1, Number(rewardConfig.bossClearRepairMaxLives) || this.getMaxLives()),
      Math.max(1, Number(sustainConfig.bossRepairMaxLives) || 3)
    );
    const levelKey = Number(level) || Number(this.game?.level) || 1;
    if (repairLives <= 0 || this.bossClearRecoveryLevels.has(levelKey)) return 0;

    this.bossClearRecoveryLevels.add(levelKey);
    const before = Number.isFinite(this.game?.lives) ? this.game.lives : 0;
    if (before > (Number(sustainConfig.bossRepairOnlyAtOrBelowLives) || 1)) return 0;
    if ((Number(this.repairsGrantedThisRun) || 0) >= (Number(sustainConfig.controlledRecoveryMaxPerRun) || 1)) return 0;
    if (before <= 0 || before >= maxLives) return 0;

    const targetLives = Math.min(maxLives, before + repairLives);
    const applied = this.applyLifeRepair(
      targetLives,
      rewardConfig.bossClearRepairInvulnerabilityMs || RESPAWN_INVULNERABILITY_MS
    );
    if (applied > 0) this.repairsGrantedThisRun = (Number(this.repairsGrantedThisRun) || 0) + applied;
    return applied;
  }

  triggerTractorHijack({ x, y } = {}) {
    if (!this.player || !this.enemyManager || !this.game) return null;

    const width = this.gameplayGame.getWidth();
    const height = this.gameplayGame.getHeight();
    const sourceX = Number.isFinite(x) ? x : width / 2;
    const sourceY = Number.isFinite(y) ? y : height * 0.2;
    const playerX = Number.isFinite(this.player.x) ? this.player.x : width / 2;
    const playerY = Number.isFinite(this.player.y) ? this.player.y : height * 0.78;
    const maxEnemyPulls = 4;
    const maxBulletPulls = 12;
    const enemyBand = Math.max(70, Math.min(115, width * 0.11));
    const bulletBand = Math.max(55, Math.min(90, width * 0.085));

    const enemies = (this.enemyManager.enemies || [])
      .filter(enemy =>
        enemy?.active !== false &&
        !enemy.waitingForEntry &&
        enemy.kind !== 'boss' &&
        enemy.kind !== 'hijacker' &&
        enemy.kind !== 'bonus_drone'
      )
      .map(enemy => ({
        enemy,
        geometry: this.distanceToSegment(enemy.x, enemy.y, sourceX, sourceY, playerX, playerY)
      }))
      .filter(item => item.geometry.t >= -0.05 && item.geometry.t <= 1.08)
      .filter(item => item.geometry.distance <= enemyBand + (item.enemy.radius || 16))
      .sort((a, b) => a.geometry.distance - b.geometry.distance)
      .slice(0, maxEnemyPulls);

    const enemyBullets = this.bulletManager?.enemyBullets || [];
    const bullets = enemyBullets
      .filter(bullet => bullet?.active !== false)
      .map(bullet => ({
        bullet,
        geometry: this.distanceToSegment(bullet.x, bullet.y, sourceX, sourceY, playerX, playerY)
      }))
      .filter(item => item.geometry.t >= -0.08 && item.geometry.t <= 1.1)
      .filter(item => item.geometry.distance <= bulletBand + (item.bullet.radius || 6))
      .sort((a, b) => a.geometry.distance - b.geometry.distance)
      .slice(0, maxBulletPulls);

    let bonusScore = 0;
    const captured = [];

    enemies.forEach(({ enemy }) => {
      const award = 360;
      const displayAward = this.game.getScoreAward?.(award) || award;
      bonusScore += award;
      captured.push({ x: Math.round(enemy.x), y: Math.round(enemy.y), award: displayAward });
      if (!this.enemyManager?.removeEnemySprite?.(enemy, 'tractor_hijack_capture')) {
        enemy.active = false;
        enemy.destroy?.();
        if (enemy.sprite?.parent) enemy.sprite.parent.removeChild(enemy.sprite);
      }
      this.particleManager?.createExplosion(enemy.x, enemy.y, 0x66ffff, 0.82);
      this.particleManager?.createHitSpark(enemy.x, enemy.y, 0xffffff);
      this.scorePopupManager?.addScorePopup(enemy.x, enemy.y, displayAward, {
        comboEligible: false,
        color: 0x66ffff
      });
    });

    bullets.forEach(({ bullet }) => {
      bonusScore += 25;
      this.bulletManager?.deactivateBullet?.(bullet, 'tractor_hijack');
      this.particleManager?.createHitSpark(bullet.x, bullet.y, 0x66ffff);
    });
    if (bullets.length > 0 && this.bulletManager) {
      this.bulletManager.pruneInactiveBullets?.('enemy', 'tractor_hijack');
    }

    let appliedBonusScore = 0;
    if (bonusScore > 0) {
      bonusScore += 600;
      appliedBonusScore = this.game.addScore(bonusScore);
      AudioManager.playSfx('tractor_break_bloom', { force: true, volume: 0.76, minIntervalMs: 120 });
      AudioManager.playSfx('tractor_beam_active', { volume: 0.34, minIntervalMs: 120 });
      AudioManager.playVoice('mission_control_tractor_hijack', {
        force: true,
        stopOtherVoices: true,
        exclusiveGroup: 'announcer',
        bypassEventCooldown: true,
        bypassGlobalCooldown: true,
        cooldownMs: 26000,
        exclusiveLockMs: 1500,
        exclusiveLockReason: 'tractor_hijack_payoff',
        voicePriority: 100,
        duckMs: 1300
      });
      this.screenShake?.shake(width < 620 ? 5 : 8, 16);
    } else {
      AudioManager.playSfx('tractor_lock_charge', { volume: 0.34, minIntervalMs: 350 });
      this.screenShake?.shake(width < 620 ? 3 : 5, 10);
    }

    const result = {
      triggered: bonusScore > 0,
      startedAt: Date.now(),
      durationMs: bonusScore > 0 ? 1120 : 680,
      sourceX: Math.round(sourceX),
      sourceY: Math.round(sourceY),
      playerX: Math.round(playerX),
      playerY: Math.round(playerY),
      capturedEnemies: captured.length,
      clearedBullets: bullets.length,
      bonusScore: appliedBonusScore,
      captured
    };

    this.tractorHijack = result;
    this.lastTractorHijack = { ...result };
    return result;
  }

  updateTractorHijack() {
    const layer = this.tractorHijackLayer;
    if (!layer) return;
    layer.clear();
    const effect = this.tractorHijack;
    if (!effect) return;

    const elapsed = Date.now() - effect.startedAt;
    const progress = Math.max(0, Math.min(1, elapsed / effect.durationMs));
    const fade = Math.sin(progress * Math.PI);
    const alpha = Math.max(0, fade);
    if (progress >= 1 || alpha <= 0.02) {
      this.tractorHijack = null;
      return;
    }

    const startX = effect.playerX;
    const startY = effect.playerY;
    const endX = effect.sourceX;
    const endY = effect.sourceY;
    const now = Date.now();
    const pulse = 1 + Math.sin(now * 0.04) * 0.08;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const drawSegment = (offset, width, color, strokeAlpha) => {
      const wobble = Math.sin(now * 0.015 + offset * 0.4) * Math.min(18, length * 0.018);
      layer.moveTo(startX + nx * (offset + wobble * 0.3), startY + ny * (offset + wobble * 0.3));
      layer.lineTo(endX + nx * (offset - wobble), endY + ny * (offset - wobble));
      layer.stroke({ color, width, alpha: strokeAlpha * alpha });
    };

    drawSegment(0, 26 * pulse, 0x00f6ff, 0.11);
    drawSegment(0, 17 * pulse, 0xff55d9, 0.12);
    drawSegment(0, 11 * pulse, 0xffffff, 0.22);
    drawSegment(-9, 4.2 * pulse, 0x66ffff, 0.58);
    drawSegment(9, 4.2 * pulse, 0xff66ff, 0.48);
    drawSegment(0, 3.2 * pulse, 0xffffff, 0.78);

    for (let strand = -2; strand <= 2; strand++) {
      if (strand === 0) continue;
      const strandOffset = strand * 6 + Math.sin(now * 0.01 + strand) * 4;
      drawSegment(strandOffset, 1.6, strand > 0 ? 0xffe066 : 0x66ffff, 0.34);
    }

    const ringCount = effect.triggered ? 8 : 5;
    for (let i = 1; i <= ringCount; i++) {
      const t = i / (ringCount + 1);
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;
      const radius = (16 + 32 * t + progress * 20 + Math.sin(now * 0.012 + i) * 5) * pulse;
      layer.circle(x, y, radius);
      layer.stroke({ color: i % 2 ? 0x66ffff : 0xffffff, width: 2.5, alpha: 0.38 * alpha });
      layer.circle(x, y, Math.max(3, radius * 0.08));
      layer.fill({ color: i % 2 ? 0xff66ff : 0x66ffff, alpha: 0.2 * alpha });
    }

    const chevronCount = effect.triggered ? 7 : 4;
    for (let i = 0; i < chevronCount; i += 1) {
      const t = (progress * 1.25 + i / chevronCount) % 1;
      const x = startX + dx * t;
      const y = startY + dy * t;
      const size = (10 + t * 8) * pulse;
      const forwardX = dx / length;
      const forwardY = dy / length;
      layer.moveTo(x - forwardX * size - nx * size * 0.62, y - forwardY * size - ny * size * 0.62);
      layer.lineTo(x + forwardX * size * 0.7, y + forwardY * size * 0.7);
      layer.lineTo(x - forwardX * size + nx * size * 0.62, y - forwardY * size + ny * size * 0.62);
    }
    layer.stroke({ color: 0xffffff, width: 2.2, alpha: 0.28 * alpha });

    effect.captured?.forEach((target, index) => {
      const r = 20 + index * 3 + progress * 28;
      layer.circle(target.x, target.y, r);
      layer.stroke({ color: 0xffe066, width: 4, alpha: 0.62 * alpha });
      layer.circle(target.x, target.y, r * 0.62);
      layer.stroke({ color: 0xff66ff, width: 2, alpha: 0.38 * alpha });
      layer.circle(target.x, target.y, Math.max(5, r * 0.28));
      layer.fill({ color: 0x66ffff, alpha: 0.22 * alpha });
      for (let spoke = 0; spoke < 4; spoke++) {
        const a = now * 0.006 + index + spoke * Math.PI * 0.5;
        layer.moveTo(target.x + Math.cos(a) * r * 0.28, target.y + Math.sin(a) * r * 0.28);
        layer.lineTo(target.x + Math.cos(a) * r, target.y + Math.sin(a) * r);
      }
      layer.stroke({ color: 0xffffff, width: 1.4, alpha: 0.3 * alpha });
    });

    layer.circle(startX, startY, 18 + Math.sin(now * 0.03) * 5);
    layer.fill({ color: 0x66ffff, alpha: 0.18 * alpha });
    layer.circle(endX, endY, 22 + Math.cos(now * 0.026) * 6);
    layer.fill({ color: 0xff66ff, alpha: 0.16 * alpha });
  }

  getBossHazardSfxFamily(hazard) {
    const type = hazard?.type || hazard?.attack || '';
    if (hazard?.kind === 'beam' || type === 'lance' || type === 'sniper') return 'beam';
    if (hazard?.kind === 'ring' || hazard?.kind === 'wall' || ['ring', 'adds', 'radial', 'spiral', 'clock', 'chord', 'wall'].includes(type)) {
      return 'net';
    }
    return 'web';
  }

  playBossHazardFireSfx(hazard) {
    if (!hazard || hazard.category !== 'signature') return;
    const family = this.getBossHazardSfxFamily(hazard);
    AudioManager.playSfx(`boss_${family}_fire`, {
      volume: family === 'beam' ? 0.78 : family === 'net' ? 0.68 : 0.62,
      minIntervalMs: 620
    });
  }

  registerBossHazardFromBoss(boss, category = 'regular', details = {}) {
    if (!boss || !this.player || !this.game) return null;

    const width = this.gameplayGame.getWidth();
    const height = this.gameplayGame.getHeight();
    const sourceX = Number.isFinite(details.sourceX) ? details.sourceX : boss.x;
    const sourceY = Number.isFinite(details.sourceY) ? details.sourceY : boss.y + 18;
    const playerX = Number.isFinite(details.playerX) ? details.playerX : this.player.x;
    const playerY = Number.isFinite(details.playerY) ? details.playerY : this.player.y;
    const attack = details.attack || boss.profile?.attack || null;
    const type = details.type || attack || 'aim';
    const color = boss.profile?.accent || boss.profile?.palette || boss.color || 0xfff45c;
    const startedAt = Date.now();
    const fairness = BalanceConfig.difficulty?.bossFairness || {};
    const hazardArmingMs = fairness.hazardArmingMs ?? 240;
    const earlyHazardType = type || attack;
    const earlyAimedHazard = (category === 'regular' || category === 'signature') &&
      (Number(boss.level) || Number(this.game?.level) || 1) <= 1 &&
      ['aim', 'fan', 'burst', 'fakeout', 'cone', 'mirror'].includes(earlyHazardType);
    if (earlyAimedHazard) {
      return null;
    }
    const base = {
      id: `${startedAt}_${Math.random().toString(36).slice(2)}`,
      category,
      type,
      attack,
      sourceX,
      sourceY,
      startedAt,
      durationMs: category === 'signature' ? 520 : 460,
      armingMs: hazardArmingMs,
      color,
      hit: false
    };

    let hazard;
    if (type === 'wall' || attack === 'wall') {
      const columns = typeof boss.getWallColumnOffsets === 'function'
        ? boss.getWallColumnOffsets().map((offset) => sourceX + offset)
        : [sourceX - 60, sourceX - 30, sourceX + 30, sourceX + 60];
      hazard = {
        ...base,
        kind: 'wall',
        columns,
        startY: sourceY + Math.max(16, boss.radius * 0.25),
        endY: height + 80,
        width: Math.max(18, Math.min(26, width * 0.022)),
        durationMs: 500,
        armingMs: hazardArmingMs
      };
    } else if (['ring', 'adds', 'radial', 'spiral', 'clock', 'chord'].includes(type) || ['spiral', 'clock', 'chord'].includes(attack)) {
      const safeLane = Array.isArray(boss.safeLanes)
        ? boss.safeLanes.find((lane) => lane?.kind === 'ring-wedge')
        : null;
      const safeAngle = Number.isFinite(Number(safeLane?.angle))
        ? Number(safeLane.angle)
        : (typeof boss.getRingSafeAngle === 'function' ? boss.getRingSafeAngle(type === 'adds' ? 14 : 16) : Math.PI / 2);
      const safeWedge = Number.isFinite(Number(safeLane?.width))
        ? Number(safeLane.width) * 1.28
        : (type === 'adds' ? 0.58 : 0.56);
      const outerRadius = Math.max(boss.radius * 2.05, category === 'signature' ? 168 : 142);
      hazard = {
        ...base,
        kind: 'ring',
        innerRadius: outerRadius * 0.48,
        outerRadius,
        safeAngle,
        safeWedge,
        durationMs: 520,
        armingMs: hazardArmingMs
      };
    } else {
      const angle = Number.isFinite(details.angle)
        ? details.angle
        : Math.atan2(playerY - sourceY, playerX - sourceX);
      const isLance = type === 'lance' || attack === 'sniper';
      const isFan = type === 'fan' || ['fan', 'burst', 'fakeout', 'mirror', 'cone'].includes(attack) || ['mirror', 'cone'].includes(type);
      const aimedLane = Array.isArray(boss.safeLanes)
        ? boss.safeLanes.find((lane) => lane?.kind === 'aimed-edges' && Number.isFinite(Number(lane.width)))
        : null;
      const telegraphedSpread = Number(aimedLane?.width);
      const fallbackSpread = isLance
        ? 0.12
        : isFan
          ? (type === 'mirror' ? 0.34 : type === 'cone' ? 0.48 : 0.36)
          : 0.15;
      const spread = Number.isFinite(telegraphedSpread)
        ? Math.min(fallbackSpread, Math.max(0.02, telegraphedSpread))
        : fallbackSpread;
      hazard = {
        ...base,
        kind: isLance ? 'beam' : 'cone',
        angle,
        spread,
        length: Math.max(height * 1.05, 560),
        radius: isLance ? (fairness.beamHazardRadius ?? 13) : (fairness.coneHazardRadius ?? 27),
        durationMs: isLance ? 500 : 520,
        armingMs: hazardArmingMs
      };
    }

    this.bossHazards.push(hazard);
    this.playBossHazardFireSfx(hazard);
    return hazard;
  }

  updateBossHazards(delta = 1, timeScale = 1) {
    const layer = this.bossHazardLayer;
    if (!layer) return;
    layer.clear();
    this.bossHazardLayerHasGeometry = false;
    if (!Array.isArray(this.bossHazards) || this.bossHazards.length === 0) return;

    const now = Date.now();
    const deltaMs = Math.max(0, Number(delta) || 0) * 16.67;
    const safeTimeScale = Math.max(0.05, Math.min(1, Number(timeScale) || 1));
    this.bossHazards = this.bossHazards.filter((hazard) => {
      if (!Number.isFinite(hazard.elapsedMs)) {
        hazard.elapsedMs = Math.max(0, now - hazard.startedAt);
      } else {
        hazard.elapsedMs += deltaMs * safeTimeScale;
      }
      const progress = Math.max(0, Math.min(1, hazard.elapsedMs / hazard.durationMs));
      if (progress >= 1) return false;
      this.drawBossHazard(hazard, progress);
      const armed = hazard.elapsedMs >= (hazard.armingMs || 0);
      if (armed && !hazard.hit && this.isPlayerInsideBossHazard(hazard)) {
        hazard.hit = true;
        this.damagePlayerFromBossHazard(hazard);
      }
      return true;
    });
  }

  getBossHazardVfxPalette(hazard, fallbackColor = 0xfff45c) {
    if (hazard?.kind === 'beam' || hazard?.type === 'lance' || hazard?.attack === 'sniper') {
      return { base: 0x72fff1, hot: 0xffffff, edge: 0xff4fe4 };
    }
    if (hazard?.kind === 'wall' || hazard?.type === 'wall') {
      return { base: 0xff8f3d, hot: 0xffffff, edge: 0x8cffb5 };
    }
    if (hazard?.kind === 'ring' || ['ring', 'adds', 'radial', 'spiral', 'clock', 'chord'].includes(hazard?.type)) {
      return { base: fallbackColor || 0xff3355, hot: 0xffffff, edge: 0xffe066 };
    }
    return { base: fallbackColor || 0xfff45c, hot: 0xffffff, edge: 0xffa83d };
  }

  drawBossHazardMuzzleBurst(layer, hazard, palette, alpha, progress) {
    if (!layer || !hazard) return;
    const shimmer = 0.5 + Math.sin(Date.now() * 0.08) * 0.5;
    const radius = hazard.kind === 'beam'
      ? Math.max(22, (hazard.radius || 13) * 2.4)
      : Math.max(18, (hazard.radius || 24) * 1.25);
    const pulse = 0.78 + shimmer * 0.22 + progress * 0.18;

    for (let i = 0; i < 3; i += 1) {
      layer.circle(hazard.sourceX, hazard.sourceY, radius * (0.58 + i * 0.34 + progress * 0.18) * pulse);
      layer.stroke({
        color: i === 1 ? palette.edge : palette.base,
        width: 2.2 + progress * 2.8,
        alpha: (0.18 + progress * 0.22) * alpha / (1 + i * 0.18)
      });
    }

    const spokes = hazard.kind === 'beam' ? 14 : 10;
    const rotation = Date.now() * 0.004;
    for (let i = 0; i < spokes; i += 1) {
      const a = (Math.PI * 2 * i) / spokes + rotation;
      const inner = radius * 0.5;
      const outer = radius * (1.08 + progress * 0.45 + (i % 2) * 0.18);
      layer.moveTo(hazard.sourceX + Math.cos(a) * inner, hazard.sourceY + Math.sin(a) * inner);
      layer.lineTo(hazard.sourceX + Math.cos(a) * outer, hazard.sourceY + Math.sin(a) * outer);
    }
    layer.stroke({ color: palette.hot, width: 1.5 + progress * 2, alpha: 0.18 * alpha + progress * 0.18 * alpha });
  }

  drawBossHazardReleasePulse(layer, hazard, palette, alpha, progress) {
    if (!layer || !hazard) return;
    const shimmer = 0.5 + Math.sin(Date.now() * 0.065) * 0.5;

    if (hazard.kind === 'wall') {
      const h = Math.max(1, hazard.endY - hazard.startY);
      const y = hazard.startY + h * Math.min(0.96, 0.08 + progress * 0.84);
      for (const x of hazard.columns || []) {
        layer.roundRect(x - hazard.width * 1.65, y - 10, hazard.width * 3.3, 20, 10);
        layer.fill({ color: palette.edge, alpha: (0.1 + progress * 0.16) * alpha });
        layer.roundRect(x - hazard.width, y - 4, hazard.width * 2, 8, 5);
        layer.fill({ color: palette.hot, alpha: (0.18 + shimmer * 0.16) * alpha });
        for (const side of [-1, 1]) {
          layer.moveTo(x + side * hazard.width * 1.1, y - 22);
          layer.lineTo(x + side * hazard.width * 2.2, y - 6);
        }
      }
      layer.stroke({ color: palette.hot, width: 1.6 + progress * 1.2, alpha: 0.2 * alpha });
      return;
    }

    if (hazard.kind === 'ring') {
      const range = Math.max(1, hazard.outerRadius - hazard.innerRadius);
      const wave = hazard.innerRadius + range * Math.min(1, 0.12 + progress * 1.05);
      layer.circle(hazard.sourceX, hazard.sourceY, wave);
      layer.stroke({ color: palette.hot, width: 5 + shimmer * 4, alpha: 0.18 * alpha });
      for (let i = 0; i < 5; i += 1) {
        const start = progress * 2.6 + i * 1.22;
        const radius = hazard.innerRadius + range * (0.18 + i * 0.16);
        layer.arc(hazard.sourceX, hazard.sourceY, radius, start, start + 0.45 + shimmer * 0.18);
      }
      layer.stroke({ color: palette.edge, width: 2.4, alpha: 0.22 * alpha });
      return;
    }

    const angle = hazard.angle || 0;
    const half = Math.max(0.01, (hazard.spread || 0.12) / 2);
    const t = Math.min(1, 0.1 + progress * 1.05);
    const cx = hazard.sourceX + Math.cos(angle) * hazard.length * t;
    const cy = hazard.sourceY + Math.sin(angle) * hazard.length * t;
    const px = -Math.sin(angle);
    const py = Math.cos(angle);
    const frontWidth = hazard.kind === 'beam'
      ? Math.max(24, (hazard.radius || 13) * 3.2)
      : Math.max(22, hazard.length * t * Math.sin(half) * 0.42);
    layer.moveTo(cx - px * frontWidth, cy - py * frontWidth);
    layer.lineTo(cx + px * frontWidth, cy + py * frontWidth);
    layer.stroke({ color: palette.hot, width: hazard.kind === 'beam' ? 7 : 4.5, alpha: 0.28 * alpha });
    layer.moveTo(cx - px * frontWidth * 0.7, cy - py * frontWidth * 0.7);
    layer.lineTo(cx + px * frontWidth * 0.7, cy + py * frontWidth * 0.7);
    layer.stroke({ color: palette.edge, width: hazard.kind === 'beam' ? 3.4 : 2.4, alpha: 0.42 * alpha });

    const chevrons = hazard.kind === 'beam' ? 5 : 4;
    for (let i = 0; i < chevrons; i += 1) {
      const ct = Math.min(0.98, t - 0.035 * i);
      const x = hazard.sourceX + Math.cos(angle) * hazard.length * ct;
      const y = hazard.sourceY + Math.sin(angle) * hazard.length * ct;
      const size = 12 + shimmer * 5 + i * 2;
      layer.moveTo(x - Math.cos(angle) * size + px * size * 0.62, y - Math.sin(angle) * size + py * size * 0.62);
      layer.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
      layer.lineTo(x - Math.cos(angle) * size - px * size * 0.62, y - Math.sin(angle) * size - py * size * 0.62);
    }
    layer.stroke({ color: palette.base, width: 2.2, alpha: 0.28 * alpha });
  }

  drawBossHazard(hazard, progress) {
    const layer = this.bossHazardLayer;
    if (!layer) return;
    this.bossHazardLayerHasGeometry = true;
    const now = Date.now();
    const alpha = Math.max(0, Math.sin((1 - progress) * Math.PI)) * 0.82;
    const pulse = 1 + Math.sin(now * 0.05) * 0.08;
    const shimmer = 0.5 + Math.sin(now * 0.07) * 0.5;
    const color = hazard.color || 0xfff45c;
    const palette = this.getBossHazardVfxPalette(hazard, color);
    const hotColor = palette.hot;
    const armingMs = Math.max(0, Number(hazard.armingMs) || 0);
    const armingProgress = armingMs > 0 ? Math.max(0, Math.min(1, Number(hazard.elapsedMs || 0) / armingMs)) : 1;
    hazard._debugHazardArming = {
      visible: false,
      kind: hazard.kind,
      armed: armingProgress >= 1,
      progress: Number(armingProgress.toFixed(3)),
      gateCount: 0
    };

    if (hazard.kind === 'wall') {
      for (const x of hazard.columns || []) {
        const h = hazard.endY - hazard.startY;
        layer.roundRect(x - hazard.width * 1.35, hazard.startY - 8, hazard.width * 2.7, h + 16, 12);
        layer.fill({ color, alpha: 0.08 * alpha });
        layer.roundRect(x - hazard.width * 0.72, hazard.startY, hazard.width * 1.44, h, 8);
        layer.fill({ color, alpha: 0.24 * alpha });
        layer.roundRect(x - hazard.width * 0.24, hazard.startY, hazard.width * 0.48, h, 5);
        layer.fill({ color: 0xffffff, alpha: 0.18 * alpha });
        layer.moveTo(x, hazard.startY);
        layer.lineTo(x, hazard.endY);
        for (let y = hazard.startY + 24; y < hazard.endY; y += 48) {
          const tick = hazard.width * (0.75 + shimmer * 0.25);
          layer.moveTo(x - tick, y);
          layer.lineTo(x + tick, y + 12);
        }
      }
      layer.stroke({ color: 0xffffff, width: 2.4 * pulse, alpha: 0.52 * alpha });
      for (const x of hazard.columns || []) {
        layer.moveTo(x - hazard.width * 0.62, hazard.startY);
        layer.lineTo(x - hazard.width * 0.62, hazard.endY);
        layer.moveTo(x + hazard.width * 0.62, hazard.startY);
        layer.lineTo(x + hazard.width * 0.62, hazard.endY);
      }
      layer.stroke({ color: hotColor, width: 1.8, alpha: 0.44 * alpha });
      this.drawBossHazardReleasePulse(layer, hazard, palette, alpha, progress);
      this.drawBossHazardArmingGate(layer, hazard, palette, alpha, armingProgress);
      return;
    }

    if (hazard.kind === 'ring') {
      const outer = hazard.outerRadius * pulse;
      const inner = hazard.innerRadius * (0.96 + shimmer * 0.04);
      const mid = (outer + inner) * 0.5;
      layer.circle(hazard.sourceX, hazard.sourceY, outer * 1.06);
      layer.stroke({ color, width: 16, alpha: 0.08 * alpha });
      layer.circle(hazard.sourceX, hazard.sourceY, outer);
      layer.stroke({ color, width: 9, alpha: 0.46 * alpha });
      layer.circle(hazard.sourceX, hazard.sourceY, mid);
      layer.stroke({ color: hotColor, width: 3, alpha: 0.28 * alpha });
      layer.circle(hazard.sourceX, hazard.sourceY, inner);
      layer.stroke({ color: 0xffffff, width: 3, alpha: 0.46 * alpha });
      for (let i = 0; i < 22; i++) {
        const a = (Math.PI * 2 * i) / 22 + progress * 1.1;
        if (Math.abs(this.normalizeBossHazardAngle(a - hazard.safeAngle)) < hazard.safeWedge) continue;
        layer.moveTo(
          hazard.sourceX + Math.cos(a) * (inner + 8),
          hazard.sourceY + Math.sin(a) * (inner + 8)
        );
        layer.lineTo(
          hazard.sourceX + Math.cos(a) * (outer - 8),
          hazard.sourceY + Math.sin(a) * (outer - 8)
        );
      }
      layer.stroke({ color, width: 2.4, alpha: 0.48 * alpha });
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10 - progress * 1.4;
        if (Math.abs(this.normalizeBossHazardAngle(a - hazard.safeAngle)) < hazard.safeWedge) continue;
        layer.circle(
          hazard.sourceX + Math.cos(a) * mid,
          hazard.sourceY + Math.sin(a) * mid,
          3.5 + shimmer * 2
        );
      }
      layer.fill({ color: 0xffffff, alpha: 0.2 * alpha });
      for (const offset of [-hazard.safeWedge, hazard.safeWedge]) {
        const a = hazard.safeAngle + offset;
        layer.moveTo(hazard.sourceX + Math.cos(a) * (inner - 4), hazard.sourceY + Math.sin(a) * (inner - 4));
        layer.lineTo(hazard.sourceX + Math.cos(a) * (outer + 6), hazard.sourceY + Math.sin(a) * (outer + 6));
      }
      layer.stroke({ color: 0x8cffb5, width: 2, alpha: 0.42 * alpha });
      const snap = Math.min(1, progress * 1.24);
      const snapRadius = hazard.innerRadius + (hazard.outerRadius - hazard.innerRadius) * snap;
      layer.circle(hazard.sourceX, hazard.sourceY, snapRadius);
      layer.stroke({ color: hotColor, width: 4 + shimmer * 3, alpha: 0.26 * alpha });
      for (let i = 0; i < 4; i += 1) {
        const start = progress * 2.2 + i * Math.PI * 0.5;
        const end = start + 0.34 + progress * 0.22;
        const r = inner + (outer - inner) * (0.35 + i * 0.13);
        layer.arc(hazard.sourceX, hazard.sourceY, r, start, end);
      }
      layer.stroke({ color: 0xffffff, width: 2, alpha: 0.18 * alpha });
      this.drawBossHazardReleasePulse(layer, hazard, palette, alpha, progress);
      this.drawBossHazardArmingGate(layer, hazard, palette, alpha, armingProgress);
      return;
    }

    const half = Math.max(0.01, hazard.spread / 2);
    const points = [hazard.sourceX, hazard.sourceY];
    const steps = hazard.kind === 'beam' ? 2 : 10;
    for (let i = 0; i <= steps; i++) {
      const t = steps === 1 ? i - 0.5 : i / steps - 0.5;
      const a = hazard.angle + t * hazard.spread;
      points.push(
        hazard.sourceX + Math.cos(a) * hazard.length,
        hazard.sourceY + Math.sin(a) * hazard.length
      );
    }
    layer.poly(points);
    layer.fill({ color, alpha: hazard.kind === 'beam' ? 0.16 * alpha : 0.1 * alpha });
    layer.poly(points);
    layer.fill({ color: 0xffffff, alpha: hazard.kind === 'beam' ? 0.05 * alpha : 0.035 * alpha });
    const laneAngles = hazard.kind === 'beam' ? [-0.035, 0, 0.035] : [-half, -half * 0.42, 0, half * 0.42, half];
    for (const offset of laneAngles) {
      const a = hazard.angle + offset;
      layer.moveTo(hazard.sourceX, hazard.sourceY);
      layer.lineTo(
        hazard.sourceX + Math.cos(a) * hazard.length,
        hazard.sourceY + Math.sin(a) * hazard.length
      );
    }
    layer.stroke({ color: 0xffffff, width: hazard.kind === 'beam' ? 12 * pulse : 5 * pulse, alpha: 0.18 * alpha });
    for (const offset of laneAngles) {
      const a = hazard.angle + offset;
      layer.moveTo(hazard.sourceX, hazard.sourceY);
      layer.lineTo(
        hazard.sourceX + Math.cos(a) * hazard.length,
        hazard.sourceY + Math.sin(a) * hazard.length
      );
    }
    layer.stroke({ color, width: hazard.kind === 'beam' ? 4.4 * pulse : 2.2 * pulse, alpha: 0.72 * alpha });

    if (hazard.kind === 'beam') {
      const coreA = hazard.angle;
      const px = -Math.sin(coreA);
      const py = Math.cos(coreA);
      const railOffset = Math.max(10, (hazard.radius || 13) * 1.28);
      for (const side of [-1, 1]) {
        const offset = railOffset * side;
        layer.moveTo(hazard.sourceX + px * offset, hazard.sourceY + py * offset);
        layer.lineTo(
          hazard.sourceX + Math.cos(coreA) * hazard.length + px * offset,
          hazard.sourceY + Math.sin(coreA) * hazard.length + py * offset
        );
      }
      layer.stroke({ color: 0xff55d9, width: 2.8 * pulse, alpha: 0.32 * alpha });
      for (const side of [-1, 1]) {
        const offset = railOffset * 0.48 * side;
        layer.moveTo(hazard.sourceX + px * offset, hazard.sourceY + py * offset);
        layer.lineTo(
          hazard.sourceX + Math.cos(coreA) * hazard.length + px * offset,
          hazard.sourceY + Math.sin(coreA) * hazard.length + py * offset
        );
      }
      layer.stroke({ color, width: 1.4 * pulse, alpha: 0.44 * alpha });
      layer.moveTo(hazard.sourceX, hazard.sourceY);
      layer.lineTo(
        hazard.sourceX + Math.cos(coreA) * hazard.length,
        hazard.sourceY + Math.sin(coreA) * hazard.length
      );
      layer.stroke({ color: hotColor, width: 2.2 + shimmer * 2, alpha: 0.78 * alpha });
      for (let i = 1; i <= 6; i += 1) {
        const t = i / 7;
        const cx = hazard.sourceX + Math.cos(coreA) * hazard.length * t;
        const cy = hazard.sourceY + Math.sin(coreA) * hazard.length * t;
        const band = 10 + t * 26 + shimmer * 8;
        layer.moveTo(cx - px * band, cy - py * band);
        layer.lineTo(cx + px * band, cy + py * band);
      }
      layer.stroke({ color: 0xffffff, width: 1.8, alpha: 0.26 * alpha });
      for (let i = 0; i < 5; i += 1) {
        const t = ((progress * 1.8 + i / 5) % 1);
        const cx = hazard.sourceX + Math.cos(coreA) * hazard.length * t;
        const cy = hazard.sourceY + Math.sin(coreA) * hazard.length * t;
        const arrow = 9 + shimmer * 4;
        layer.moveTo(cx - Math.cos(coreA) * arrow + px * arrow * 0.55, cy - Math.sin(coreA) * arrow + py * arrow * 0.55);
        layer.lineTo(cx + Math.cos(coreA) * arrow, cy + Math.sin(coreA) * arrow);
        layer.lineTo(cx - Math.cos(coreA) * arrow - px * arrow * 0.55, cy - Math.sin(coreA) * arrow - py * arrow * 0.55);
      }
      layer.stroke({ color, width: 2, alpha: 0.34 * alpha });
    } else {
      for (let i = 1; i <= 5; i++) {
        const t = i / 6;
        const bandWidth = hazard.length * t * Math.sin(half) * 0.58;
        const cx = hazard.sourceX + Math.cos(hazard.angle) * hazard.length * t;
        const cy = hazard.sourceY + Math.sin(hazard.angle) * hazard.length * t;
        const px = -Math.sin(hazard.angle);
        const py = Math.cos(hazard.angle);
        layer.moveTo(cx - px * bandWidth, cy - py * bandWidth);
        layer.lineTo(cx + px * bandWidth, cy + py * bandWidth);
      }
      layer.stroke({ color: hotColor, width: 1.5, alpha: 0.28 * alpha });
      for (let i = 1; i <= 4; i += 1) {
        const t = i / 5;
        const cx = hazard.sourceX + Math.cos(hazard.angle) * hazard.length * t;
        const cy = hazard.sourceY + Math.sin(hazard.angle) * hazard.length * t;
        const webWidth = hazard.length * t * Math.sin(half) * 0.34;
        for (const side of [-1, 1]) {
          const x = cx + -Math.sin(hazard.angle) * webWidth * side;
          const y = cy + Math.cos(hazard.angle) * webWidth * side;
          layer.circle(x, y, 3 + shimmer * 2);
        }
      }
      layer.fill({ color: hotColor, alpha: 0.18 * alpha });
    }

    const front = Math.min(1, 0.08 + progress * 1.08);
    const frontX = hazard.sourceX + Math.cos(hazard.angle) * hazard.length * front;
    const frontY = hazard.sourceY + Math.sin(hazard.angle) * hazard.length * front;
    const frontPx = -Math.sin(hazard.angle);
    const frontPy = Math.cos(hazard.angle);
    const frontWidth = hazard.kind === 'beam'
      ? Math.max(20, (hazard.radius || 13) * 2.4)
      : Math.max(18, hazard.length * front * Math.sin(half) * 0.34);
    layer.moveTo(frontX - frontPx * frontWidth, frontY - frontPy * frontWidth);
    layer.lineTo(frontX + frontPx * frontWidth, frontY + frontPy * frontWidth);
    layer.stroke({ color: 0xffffff, width: hazard.kind === 'beam' ? 4.2 : 2.8, alpha: 0.3 * alpha });
    this.drawBossHazardReleasePulse(layer, hazard, palette, alpha, progress);
    const nodeCount = hazard.kind === 'beam' ? 5 : 7;
    for (let i = 0; i < nodeCount; i += 1) {
      const t = ((progress * 1.35 + i / nodeCount) % 1);
      const x = hazard.sourceX + Math.cos(hazard.angle) * hazard.length * (0.12 + t * 0.78);
      const y = hazard.sourceY + Math.sin(hazard.angle) * hazard.length * (0.12 + t * 0.78);
      const widthAtT = hazard.kind === 'beam'
        ? Math.max(8, (hazard.radius || 13) * 0.78)
        : Math.max(6, hazard.length * (0.12 + t * 0.78) * Math.sin(half) * 0.16);
      const side = i % 2 === 0 ? -1 : 1;
      layer.circle(x + frontPx * widthAtT * side, y + frontPy * widthAtT * side, 2.4 + shimmer * 2.2);
    }
    layer.fill({ color: hotColor, alpha: 0.16 * alpha });

    this.drawBossHazardMuzzleBurst(layer, hazard, palette, alpha, progress);
    layer.circle(hazard.sourceX, hazard.sourceY, hazard.kind === 'beam' ? 14 + shimmer * 5 : 11 + shimmer * 4);
    layer.fill({ color, alpha: 0.24 * alpha });
    layer.circle(hazard.sourceX, hazard.sourceY, hazard.kind === 'beam' ? 6 + shimmer * 3 : 5 + shimmer * 2);
    layer.fill({ color: 0xffffff, alpha: 0.32 * alpha });
    this.drawBossHazardArmingGate(layer, hazard, palette, alpha, armingProgress);
  }

  drawBossHazardArmingGate(layer, hazard, palette, alpha = 1, armingProgress = 1) {
    if (!layer || !hazard || armingProgress >= 1) {
      if (hazard?._debugHazardArming) {
        hazard._debugHazardArming.visible = false;
        hazard._debugHazardArming.armed = true;
        hazard._debugHazardArming.progress = 1;
        hazard._debugHazardArming.gateCount = 0;
      }
      return 0;
    }

    const gateAlpha = (0.22 + (1 - armingProgress) * 0.3) * alpha;
    const hot = palette?.hot || 0xffffff;
    const edge = palette?.edge || palette?.base || 0xfff45c;
    let gateCount = 0;

    if (hazard.kind === 'wall') {
      for (const x of hazard.columns || []) {
        const capY = hazard.startY + Math.max(12, (hazard.endY - hazard.startY) * 0.06);
        const width = Math.max(20, hazard.width * 1.9);
        layer.roundRect(x - width, capY - 7, width * 2, 14, 7);
        layer.stroke({ color: edge, width: 1.6, alpha: gateAlpha });
        layer.roundRect(x - width + 3, capY - 3, Math.max(4, (width * 2 - 6) * armingProgress), 6, 4);
        layer.fill({ color: hot, alpha: gateAlpha * 0.72 });
        layer.moveTo(x - width * 0.82, capY + 14);
        layer.lineTo(x - width * 0.42, capY + 22);
        layer.moveTo(x + width * 0.82, capY + 14);
        layer.lineTo(x + width * 0.42, capY + 22);
        gateCount += 2;
      }
      layer.stroke({ color: hot, width: 1.2, alpha: gateAlpha * 0.8 });
    } else if (hazard.kind === 'ring') {
      const centerR = (hazard.innerRadius + hazard.outerRadius) * 0.5;
      const tickCount = 8;
      for (let i = 0; i < tickCount; i += 1) {
        const a = hazard.safeAngle + (i % 2 ? hazard.safeWedge : -hazard.safeWedge) + (i - tickCount / 2) * 0.015;
        const r0 = centerR - 12 - i * 1.4;
        const r1 = centerR + 12 + i * 1.4;
        layer.moveTo(hazard.sourceX + Math.cos(a) * r0, hazard.sourceY + Math.sin(a) * r0);
        layer.lineTo(hazard.sourceX + Math.cos(a) * r1, hazard.sourceY + Math.sin(a) * r1);
        gateCount += 1;
      }
      layer.stroke({ color: edge, width: 2, alpha: gateAlpha });
      const clockRadius = hazard.innerRadius + (hazard.outerRadius - hazard.innerRadius) * (0.18 + armingProgress * 0.58);
      layer.arc(hazard.sourceX, hazard.sourceY, clockRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * armingProgress);
      layer.stroke({ color: hot, width: 3, alpha: gateAlpha * 0.88 });
    } else {
      const angle = hazard.angle || 0;
      const px = -Math.sin(angle);
      const py = Math.cos(angle);
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const baseDist = hazard.kind === 'beam' ? 44 : 34;
      const halfWidth = hazard.kind === 'beam' ? Math.max(20, (hazard.radius || 13) * 2.6) : Math.max(24, (hazard.radius || 24) * 1.25);
      const cx = hazard.sourceX + nx * baseDist;
      const cy = hazard.sourceY + ny * baseDist;
      layer.moveTo(cx - px * halfWidth, cy - py * halfWidth);
      layer.lineTo(cx + px * halfWidth, cy + py * halfWidth);
      layer.stroke({ color: edge, width: 2.2, alpha: gateAlpha });
      const fillHalf = Math.max(4, halfWidth * armingProgress);
      layer.moveTo(cx - px * fillHalf, cy - py * fillHalf);
      layer.lineTo(cx + px * fillHalf, cy + py * fillHalf);
      layer.stroke({ color: hot, width: 4, alpha: gateAlpha * 0.58 });
      for (let i = 0; i < 4; i += 1) {
        const side = i < 2 ? -1 : 1;
        const t = i % 2 ? 0.72 : 0.28;
        const x = cx + px * halfWidth * side;
        const y = cy + py * halfWidth * side;
        layer.moveTo(x - nx * (8 + t * 8), y - ny * (8 + t * 8));
        layer.lineTo(x + nx * (8 + t * 8), y + ny * (8 + t * 8));
        gateCount += 1;
      }
      layer.stroke({ color: hot, width: 1.4, alpha: gateAlpha * 0.82 });
      gateCount += 2;
    }

    hazard._debugHazardArming = {
      visible: true,
      kind: hazard.kind,
      armed: false,
      progress: Number(armingProgress.toFixed(3)),
      gateCount
    };
    return gateCount;
  }

  isPlayerInsideBossHazard(hazard) {
    if (!this.player?.active) return false;
    if (this.player.isGhostActive?.()) return false;

    const playerRadius = this.player.radius || 12;
    if (hazard.kind === 'wall') {
      const py = this.player.y;
      if (py + playerRadius < hazard.startY || py - playerRadius > hazard.endY) return false;
      return (hazard.columns || []).some((x) => Math.abs(this.player.x - x) <= hazard.width / 2 + playerRadius * 0.55);
    }

    const dx = this.player.x - hazard.sourceX;
    const dy = this.player.y - hazard.sourceY;
    const distance = Math.hypot(dx, dy);
    if (hazard.kind === 'ring') {
      if (distance < hazard.innerRadius - playerRadius * 0.55 || distance > hazard.outerRadius + playerRadius * 0.55) return false;
      const angle = Math.atan2(dy, dx);
      return Math.abs(this.normalizeBossHazardAngle(angle - hazard.safeAngle)) > hazard.safeWedge;
    }

    const angleToPlayer = Math.atan2(dy, dx);
    const diff = Math.abs(this.normalizeBossHazardAngle(angleToPlayer - hazard.angle));
    const along = Math.cos(diff) * distance;
    if (along < -playerRadius || along > hazard.length + playerRadius) return false;
    const perpendicular = Math.sin(diff) * distance;
    const angularHit = diff <= (hazard.spread / 2) * 0.82;
    const lineHit = Math.abs(perpendicular) <= (hazard.radius || 24) + playerRadius * 0.55;
    return angularHit || lineHit;
  }

  damagePlayerFromBossHazard(hazard) {
    if (!this.player) return false;
    this.lastBossHazardHit = {
      type: hazard.type,
      kind: hazard.kind,
      category: hazard.category,
      at: Date.now(),
      playerX: Math.round(this.player.x),
      playerY: Math.round(this.player.y)
    };

    const damageTaken = this.handleBossCausedPlayerHit('boss_hazard', this.enemyManager?.boss, {
      balanceSource: `boss_hazard:${hazard.category || 'unknown'}:${hazard.type || hazard.kind || 'unknown'}`,
      shieldShake: 4
    });

    if (damageTaken) {
      this.screenShake?.shake(7, 18);
      AudioManager.playSfx('boss_hazard_impact', { volume: 0.62, minIntervalMs: 180 });
    } else {
      this.screenShake?.shake(4, 12);
      this.particleManager?.createHitSpark(this.player.x, this.player.y, hazard.color || 0xfff45c);
      AudioManager.playSfx('boss_hazard_impact', { volume: 0.34, minIntervalMs: 180 });
    }

    if (damageTaken) {
      this.particleManager?.createHitSpark(this.player.x, this.player.y, hazard.color || 0xfff45c);
      this.showToast('BOSS WEAPON HIT', {
        fontSize: this.game.getWidth() < 620 ? 16 : 18,
        fill: '#ff6b7a',
        stroke: '#140006',
        strokeThickness: 2,
        duration: 720,
        slot: 'corner',
        type: 'boss_hazard',
        priority: 2
      });
    }
    return damageTaken;
  }

  normalizeBossHazardAngle(angle) {
    let value = angle;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  distanceToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    if (lenSq <= 0.0001) {
      return { distance: Math.hypot(px - ax, py - ay), t: 0 };
    }
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq));
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    return { distance: Math.hypot(px - cx, py - cy), t };
  }

  clearEnemyBullets(reason = 'cleanup') {
    const cleared = this.bulletManager?.clearEnemyBullets?.(reason) || 0;
    if (cleared > 0 && this.debugPowerups) {
      console.log(`[BulletCleanup] reason=${reason} cleared=${cleared}`);
    }
    return cleared;
  }

  clearBossHazards(reason = 'cleanup') {
    const hazards = Array.isArray(this.bossHazards) ? this.bossHazards : [];
    const cleared = hazards.length;
    const layer = this.bossHazardLayer;
    const renderedBefore = Boolean(this.bossHazardLayerHasGeometry);
    this.bossHazards = [];
    this.lastBossHazardHit = null;
    layer?.clear?.();
    this.bossHazardLayerHasGeometry = false;
    this.lastBossHazardCleanup = {
      reason,
      cleared,
      renderedBefore,
      renderedAfter: Boolean(this.bossHazardLayerHasGeometry),
      gameplayClockMs: Math.round(this.getGameplayClockMs?.() || 0),
      at: Date.now()
    };
    if (cleared > 0 && this.debugPowerups) {
      console.log(`[BossHazardCleanup] reason=${reason} cleared=${cleared}`);
    }
    return cleared;
  }

  clearRespawnHazards(reason = 'respawn') {
    let cleared = this.clearEnemyBullets(reason) + this.clearBossHazards(reason);
    const height = this.gameplayGame.getHeight();
    const dangerY = height * 0.62;
    const playerX = this.player?.x ?? this.gameplayGame.getWidth() / 2;
    const playerY = this.player?.y ?? height - 100;
    const enemies = this.enemyManager?.enemies || [];

    enemies.forEach(enemy => {
      if (!enemy?.active || enemy.kind === 'boss') return;
      const dx = enemy.x - playerX;
      const dy = enemy.y - playerY;
      const closeToRespawn = Math.sqrt(dx * dx + dy * dy) < 230;
      const lowDiver = enemy.y > dangerY || enemy.state === 'DIVE';
      if (!closeToRespawn && !lowDiver) return;

      enemy.active = false;
      cleared += 1;
      if (!this.enemyManager?.removeEnemySprite?.(enemy, 'respawn_hazard_clear') && enemy.sprite?.parent) {
        enemy.sprite.parent.removeChild(enemy.sprite);
      }
      if (this.particleManager) {
        this.particleManager.createHitSpark(enemy.x, enemy.y, enemy.color || 0x8fffd5);
      }
    });

    this.ambientBonusDrones.forEach(bonusDrone => {
      if (!bonusDrone?.active || bonusDrone.type !== 'HAZARD') return;
      if (bonusDrone.y <= dangerY) return;
      bonusDrone.active = false;
      cleared += 1;
      if (bonusDrone.sprite?.parent) bonusDrone.sprite.parent.removeChild(bonusDrone.sprite);
      if (this.particleManager) {
        this.particleManager.createExplosion(bonusDrone.x, bonusDrone.y, 0xffaa00, 0.65);
      }
    });

    if (cleared > 0 && this.debugPowerups) {
      console.log(`[RespawnCleanup] reason=${reason} cleared=${cleared}`);
    }
    return cleared;
  }

  applyScoreMultiplier(multiplier, durationMs, source = 'unknown') {
    const mult = Number(multiplier) || 1;
    this.scoreMultiplier = mult;
    this.scoreBoostTimer = durationMs;
    this.game.scoreMultiplier = mult;
    if (this.player) {
      this.player.scoreMultiplier = mult;
      this.player.scoreBoostExpiresAt = this.getGameplayClockMs() + durationMs;
    }
    if (this.player?.noteScoreMultiplier) this.player.noteScoreMultiplier();
    this.showToast(`SCORE x${mult}`, { fontSize: 34, fill: '#ffff00', duration: 1800, slot: 'center', type: 'score_boost' });
    console.log(`[Powerup] pickup type=SCORE_X2 durationMs=${durationMs} source=${source}`);
  }

  beginDailySignalFinish({ sectorCleared = this.game?.level || 10, compactHud = this.game.getWidth() < 620 } = {}) {
    if (this.dailySignalFinishPending || this.game?.runFinalized || this.game?.currentScene !== this) return false;
    const finishSector = Math.max(1, Math.floor(Number(this.game?.dailySignalContract?.finishSector) || 10));
    const completedSector = Math.max(1, Math.floor(Number(sectorCleared) || finishSector));
    if (completedSector < finishSector) return false;

    this.dailySignalFinishPending = true;
    if (this.levelAdvanceTimeout) clearTimeout(this.levelAdvanceTimeout);
    this.levelAdvanceTimeout = null;
    this.levelAdvanceWarmupPromise = null;
    const clearBonus = 10000;
    const livesBonus = Math.max(0, Number(this.game?.lives) || 0) * 2500;
    this.game.markRunClear?.('daily_signal_sector_10_clear');
    const award = this.game.awardRunClearScoreBonuses?.({
      clearBonus,
      livesBonus,
      awardKey: 'daily_signal_finish_v1'
    }) || { clearBonus, livesBonus };
    const celebration = {
      id: 'daily_signal_complete_v1',
      title: 'DAILY SIGNAL CLEARED',
      flavor: 'TEN SECTORS. ONE LOANER. YOUR SCORE IS NOW THE TARGET.',
      statusLine: 'LOCAL CABINET RECORD // {score}',
      warning: 'TODAY\'S CONTRACT COMPLETE // {lives} HULLS RETURNED',
      footerWarning: 'LOCAL ONLY // PUBLIC DAILY BOARD AWAITS DETERMINISTIC VERIFICATION',
      continueText: 'LOCK SCORE & OPEN REPORT',
      voiceCue: 'mission_control_overrun_clear_sector_10',
      visual: {
        motif: 'deep_scan',
        primaryColor: 0x7dffcc,
        accentColor: 0x37f5ff,
        secondaryColor: 0xffd15c,
        frameColor: 0xff55d9,
        backgroundColor: 0x020914,
        flashColor: 0xb8fff3,
        ringCount: compactHud ? 4 : 6,
        rayCount: compactHud ? 20 : 30,
        shardSpeed: 1.08,
        sealScale: 1.04,
        pulseRate: 0.014,
        shardColors: [0x7dffcc, 0x37f5ff, 0xff55d9, 0xffd15c]
      }
    };
    this.triggerOverrunClearCelebration({
      nextSector: completedSector,
      milestoneSector: completedSector,
      eventKind: 'daily_signal_complete',
      clearBonus: award.clearBonus ?? clearBonus,
      livesBonus: award.livesBonus ?? livesBonus,
      celebration,
      onComplete: () => {
        if (this.game?.currentScene !== this || this.game?.runFinalized) return;
        this.game.completeRun?.('daily_signal_sector_10_clear', {
          levelReached: completedSector,
          sectorReached: completedSector,
          dailySignalFinishSector: finishSector
        });
      }
    });
    this.reserveMessageFocus(OVERRUN_INTERLUDE_MS + 900, { priority: 10, slots: ['center', 'top', 'corner'] });
    return true;
  }

  maybeTriggerOverrunCelebration({ sectorCleared, bossCompletion, compactHud = this.game.getWidth() < 620 } = {}) {
    if (!bossCompletion) return false;
    if (this.gameOverInterlude?.active || this.game?.gameOverTransitionPending || this.gameOverSequenceStarted) return false;
    if ((this.game?.lives || 0) <= 0 || this.game?.currentScene !== this) return false;

    const milestoneSector = Math.max(1, Math.floor(Number(sectorCleared) || 1));
    if (!isOverrunMilestoneSector(milestoneSector, RunPacingConfig.targetSectors)) return false;
    if (this.overrunCelebratedMilestones?.has(milestoneSector)) return false;

    const nextSector = milestoneSector + 1;
    if (!this.game.runCleared && milestoneSector >= RunPacingConfig.targetSectors) {
      const clearBonus = 10000;
      const livesBonus = Math.max(0, Number(this.game.lives) || 0) * 2500;
      const markedClear = this.game.markRunClear?.('target_sector_clear');
      if (!markedClear) return false;
      this.game.awardRunClearScoreBonuses?.({ clearBonus, livesBonus });

      this.overrunCelebratedMilestones.add(milestoneSector);
      const celebration = getOverrunMilestoneCelebration({ milestoneSector, eventKind: 'run_clear' });
      const milestoneReward = this.applyOverrunMilestoneReward(celebration);
      this.triggerOverrunClearCelebration({
        nextSector,
        milestoneSector,
        eventKind: 'run_clear',
        clearBonus,
        livesBonus,
        celebration,
        milestoneReward
      });
      this.showToast([
        translateText('RUN CLEAR! OVERRUN UNLOCKED'),
        translateText('CLEAR BONUS +{clearBonus}  SPARE HULLS +{livesBonus}', {
          clearBonus: clearBonus.toLocaleString('en-US'),
          livesBonus: livesBonus.toLocaleString('en-US')
        }),
        translateText('SECTOR {sector} WILL NOT BE POLITE', { sector: nextSector })
      ].join('\n'), {
        fontSize: compactHud ? 21 : 32,
        fill: '#fff3a2',
        stroke: '#150318',
        strokeThickness: compactHud ? 4 : 6,
        duration: 4300,
        slot: 'center',
        type: 'run_clear',
        priority: 10,
        transition: true,
        y: this.game.getHeight() * (compactHud ? 0.29 : 0.37),
        maxWidth: this.game.getWidth() * (compactHud ? 0.9 : 0.78)
      });
      this.reserveMessageFocus(OVERRUN_INTERLUDE_MS + 900, { priority: 10, slots: ['top', 'corner'] });
      return true;
    }

    if (!this.game.runCleared) return false;
    const clearBonus = 10000;
    const livesBonus = Math.max(0, Number(this.game.lives) || 0) * 2500;
    const milestoneAward = this.game.awardRunClearScoreBonuses?.({
      clearBonus,
      livesBonus,
      awardKey: `overrun_${milestoneSector}`
    });
    this.overrunCelebratedMilestones.add(milestoneSector);
    const celebration = getOverrunMilestoneCelebration({ milestoneSector, eventKind: 'overrun_milestone' });
    const milestoneReward = this.applyOverrunMilestoneReward(celebration);
    this.triggerOverrunClearCelebration({
      nextSector,
      milestoneSector,
      eventKind: 'overrun_milestone',
      clearBonus: milestoneAward?.clearBonus ?? clearBonus,
      livesBonus: milestoneAward?.livesBonus ?? livesBonus,
      celebration,
      milestoneReward
    });
    return true;
  }

  applyOverrunMilestoneReward(celebration = {}) {
    const reward = celebration?.reward || {};
    const applied = [];
    if (reward.rescan) {
      this.tacticalDraftRescansRemaining = Math.max(1, Number(this.tacticalDraftRescansRemaining) || 0);
      applied.push('rescan');
    }
    if (reward.shieldMs > 0 && this.player?.activateShield) {
      this.player.activateShield(reward.shieldMs);
      applied.push('shield');
    }
    if (reward.phaseReady && this.player) {
      this.player.dodgeCooldown = 0;
      applied.push('phase');
    }
    if (reward.pointDefenseMs > 0 && this.player) {
      this.player.activatePointDefense?.(reward.pointDefenseMs, {
        now: this.getGameplayClockMs(),
        playSfx: false,
        source: 'overrun_milestone'
      });
      applied.push('point_defense');
    }
    if (reward.sfx) {
      AudioManager.playSfx(reward.sfx, { force: true, volume: 0.86, minIntervalMs: 0 });
    }
    this.lastOverrunMilestoneReward = {
      celebrationId: celebration?.id || null,
      label: reward.label || '',
      applied
    };
    return this.lastOverrunMilestoneReward;
  }

  triggerOverrunClearCelebration({
    nextSector = (this.game?.level || 10) + 1,
    milestoneSector = this.game?.level || 10,
    eventKind = 'run_clear',
    clearBonus = 0,
    livesBonus = 0,
    celebration: suppliedCelebration = null,
    milestoneReward = null,
    onComplete = null
  } = {}) {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const centerX = width * 0.5;
    const centerY = height * (width < 620 ? 0.36 : 0.42);
    const celebration = suppliedCelebration || getOverrunMilestoneCelebration({ milestoneSector, eventKind });
    const visual = celebration.visual || {};
    const shardPalette = Array.isArray(visual.shardColors) && visual.shardColors.length
      ? visual.shardColors
      : [visual.primaryColor || 0xffd15c, visual.accentColor || 0x61f6ff];
    const container = new PIXI.Container();
    container.zIndex = 9600 + this.overrunClearEffects.length;
    container.sortableChildren = true;
    container.label = 'ui_overrun_clear_celebration';

    const flash = new PIXI.Graphics();
    flash.zIndex = 0;
    container.addChild(flash);

    const rays = new PIXI.Graphics();
    rays.blendMode = 'add';
    rays.zIndex = 2;
    container.addChild(rays);

    const sealTexture = this.overrunSealTexture;
    let seal = null;
    if (sealTexture && GameAssets.isValidTexture(sealTexture)) {
      seal = new PIXI.Sprite(sealTexture);
      seal.anchor.set(0.5);
      seal.x = centerX;
      seal.y = centerY;
      seal.alpha = 0;
      seal.blendMode = 'add';
      seal.zIndex = 1;
      container.addChild(seal);
    }

    const rings = new PIXI.Graphics();
    rings.blendMode = 'add';
    rings.zIndex = 3;
    container.addChild(rings);

    const interludeCard = this.createOverrunInterludeCard({
      width,
      height,
      milestoneSector,
      nextSector,
      eventKind,
      celebration,
      clearBonus,
      livesBonus,
      milestoneReward
    });
    if (interludeCard) {
      interludeCard.zIndex = 5;
      container.addChild(interludeCard);
    }

    const shards = Array.from({ length: width < 620 ? 28 : 46 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / (width < 620 ? 28 : 46) + Math.random() * 0.16,
      speed: 0.72 + Math.random() * 0.55,
      size: 4 + Math.random() * 10,
      drift: Math.random() * 0.9,
      color: shardPalette[index % shardPalette.length]
    }));

    const effect = {
      startedAt: Date.now(),
      durationMs: OVERRUN_CLEAR_VFX_MS,
      centerX,
      centerY,
      nextSector,
      milestoneSector,
      eventKind,
      variantId: celebration.id,
      milestoneReward,
      visual,
      container,
      flash,
      rays,
      rings,
      seal,
      interludeCard,
      shards
    };
    this.overrunClearLayer?.addChild(container);
    this.overrunClearEffects.push(effect);
    this.overrunMilestoneInterlude = {
      active: true,
      startedAt: Date.now(),
      durationMs: OVERRUN_INTERLUDE_MS,
      requiresConfirm: eventKind === 'run_clear' || eventKind === 'overrun_milestone' || eventKind === 'daily_signal_complete',
      confirmReadyAt: Date.now() + 1250,
      confirmed: false,
      confirmedBy: null,
      eventKind,
      milestoneSector,
      nextSector,
      variantId: celebration.id,
      milestoneReward,
      onComplete: typeof onComplete === 'function' ? onComplete : null,
      effect
    };
    effect.requiresConfirm = eventKind === 'run_clear' || eventKind === 'overrun_milestone' || eventKind === 'daily_signal_complete';
    effect.confirmed = false;
    if (effect.requiresConfirm) {
      this.installOverrunConfirmationHandlers();
    }
    this.reserveMessageFocus(OVERRUN_INTERLUDE_MS + 900, { priority: 10, slots: ['center', 'top', 'corner'] });

    this.screenShake?.shake(width < 620 ? 16 : 24, width < 620 ? 24 : 34);
    AudioManager.duckMusic?.(0.28, 4300);
    AudioManager.playSfx('overrun_clear_shockwave', { force: true, volume: 1.0, minIntervalMs: 0 });
    AudioManager.playSfx('overrun_clear_coronation', { force: true, volume: 1.0, minIntervalMs: 0 });
    const voiceCue = resolveOverrunMilestoneVoiceCue({ milestoneSector, eventKind, celebration });
    setTimeout(() => {
      if (this.game?.currentScene !== this) return;
      AudioManager.playVoice(voiceCue, {
        force: true,
        stopOtherVoices: true,
        exclusiveGroup: 'announcer',
        bypassEventCooldown: true,
        bypassGlobalCooldown: true,
        cooldownMs: 60000,
        duckFactor: 0.28,
        duckMs: 4200,
        volume: 1.08
      });
    }, 520);
  }

  createOverrunInterludeCard({
    width,
    height,
    milestoneSector,
    nextSector,
    eventKind,
    celebration,
    clearBonus = 0,
    livesBonus = 0,
    milestoneReward = null
  }) {
    const compact = width < 720;
    const cardWidth = Math.min(width - 32, compact ? 540 : 820);
    const cardHeight = Math.min(height * (compact ? 0.72 : 0.64), compact ? 330 : 420);
    const visual = celebration?.visual || {};
    const primaryColor = visual.primaryColor || 0xffd15c;
    const accentColor = visual.accentColor || 0x61f6ff;
    const secondaryColor = visual.secondaryColor || 0xfff2a6;
    const frameColor = visual.frameColor || primaryColor;
    const backgroundColor = visual.backgroundColor || 0x030912;
    const vars = {
      sector: Number(milestoneSector) || 0,
      nextSector: Number(nextSector) || 0,
      score: Number(this.game?.score || 0).toLocaleString('en-US'),
      rank: Math.max(1, Number(this.game?.rankIndex || 0) + 1),
      lives: Math.max(0, Number(this.game?.lives || 0))
    };
    const card = new PIXI.Container();
    card.label = 'ui_overrun_interlude';
    card.x = width / 2;
    card.y = height * (compact ? 0.44 : 0.5);
    card.alpha = 0;
    card.scale.set(0.92);

    const bg = new PIXI.Graphics();
    bg.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);
    bg.fill({ color: backgroundColor, alpha: 0.95 });
    bg.stroke({ color: frameColor, width: 3, alpha: 0.96 });
    bg.roundRect(-cardWidth / 2 + 8, -cardHeight / 2 + 8, cardWidth - 16, cardHeight - 16, 7);
    bg.stroke({ color: accentColor, width: 1.4, alpha: 0.76 });
    bg.rect(-cardWidth / 2 + 18, -cardHeight / 2 + 18, cardWidth - 36, 4);
    bg.fill({ color: secondaryColor, alpha: 0.86 });
    if (visual.motif === 'double_rail') {
      bg.rect(-cardWidth / 2 + 28, -cardHeight / 2 + 32, 4, cardHeight - 64);
      bg.fill({ color: accentColor, alpha: 0.38 });
      bg.rect(cardWidth / 2 - 32, -cardHeight / 2 + 32, 4, cardHeight - 64);
      bg.fill({ color: primaryColor, alpha: 0.42 });
    } else if (visual.motif === 'deep_scan') {
      for (let x = -cardWidth / 2 + 32; x < cardWidth / 2 - 32; x += 46) {
        bg.moveTo(x, -cardHeight / 2 + 28);
        bg.lineTo(x + 22, cardHeight / 2 - 28);
        bg.stroke({ color: accentColor, width: 1, alpha: 0.11 });
      }
    } else if (visual.motif === 'finale') {
      bg.rect(-cardWidth / 2 + 18, cardHeight / 2 - 23, cardWidth - 36, 4);
      bg.fill({ color: 0xff4d6d, alpha: 0.72 });
    }
    card.addChild(bg);

    const icon = new PIXI.Graphics();
    icon.label = 'ui_overrun_card_icon';
    icon.x = -cardWidth / 2 + (compact ? 38 : 48);
    icon.y = -cardHeight / 2 + (compact ? 43 : 50);
    this.drawOverrunMotifIcon(icon, visual.motif, { primaryColor, accentColor, secondaryColor });
    card.addChild(icon);

    const title = createText(translateText(celebration?.title || 'OVERRUN MILESTONE', vars), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 23 : 32,
      fill: '#fff3a2',
      stroke: '#150318',
      strokeThickness: 5,
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: cardWidth - 76,
      lineHeight: compact ? 26 : 34
    });
    title.anchor.set(0.5);
    title.label = 'ui_overrun_card_title';
    title.y = -cardHeight / 2 + (compact ? 42 : 50);
    card.addChild(title);

    const flavorText = createText(translateText(celebration?.flavor || '', vars), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 13 : 17,
      fill: '#d8fbff',
      stroke: '#001016',
      strokeThickness: 2,
      fontWeight: '700',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: cardWidth - (compact ? 56 : 92),
      lineHeight: compact ? 15 : 20
    });
    flavorText.anchor.set(0.5);
    flavorText.label = 'ui_overrun_card_flavor';
    flavorText.y = -cardHeight / 2 + (compact ? 84 : 96);
    card.addChild(flavorText);

    const reportText = createText(translateText(celebration?.statusLine || 'PILOT REPORT', vars), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 13 : 16,
      fill: '#d8fbff',
      stroke: '#001016',
      strokeThickness: 2,
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: cardWidth - 58,
      lineHeight: compact ? 16 : 19
    });
    reportText.anchor.set(0.5);
    reportText.label = 'ui_overrun_card_report';
    reportText.y = compact ? -34 : -36;
    card.addChild(reportText);

    const sectorText = createText(translateText(celebration?.warning || 'STRAP IN, PILOT. OVERRUN DOES NOT DO EASY.', vars), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 14 : 18,
      fill: '#9cfbff',
      stroke: '#001016',
      strokeThickness: 3,
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: cardWidth - 70,
      lineHeight: compact ? 16 : 21
    });
    sectorText.anchor.set(0.5);
    sectorText.label = 'ui_overrun_card_sector';
    sectorText.y = compact ? 15 : 18;
    card.addChild(sectorText);

    const bonusLine = (eventKind === 'run_clear' || eventKind === 'overrun_milestone' || eventKind === 'daily_signal_complete') && (clearBonus || livesBonus)
      ? translateText('CLEAR BONUS +{clearBonus}  SPARE HULLS +{livesBonus}', {
        clearBonus: Number(clearBonus || 0).toLocaleString('en-US'),
        livesBonus: Number(livesBonus || 0).toLocaleString('en-US')
      })
      : '';
    const bonusText = createText(bonusLine, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 12 : 16,
      fill: '#9cfbff',
      stroke: '#001016',
      strokeThickness: 3,
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: cardWidth - 84,
      lineHeight: compact ? 14 : 18
    });
    bonusText.anchor.set(0.5);
    bonusText.label = 'ui_overrun_card_bonus';
    bonusText.visible = Boolean(bonusLine);
    bonusText.y = compact ? 43 : 54;
    card.addChild(bonusText);

    const rewardLine = translateText(milestoneReward?.label || celebration?.reward?.label || '');
    const rewardText = createText(rewardLine, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 12 : 16,
      fill: '#b7ff39',
      stroke: '#001016',
      strokeThickness: 3,
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: cardWidth - 84,
      lineHeight: compact ? 14 : 18
    });
    rewardText.anchor.set(0.5);
    rewardText.label = 'ui_overrun_card_reward';
    rewardText.visible = Boolean(rewardLine);
    rewardText.y = compact ? 65 : 86;
    card.addChild(rewardText);

    const warning = createText(translateText(celebration?.footerWarning || 'STRAP IN, PILOT. OVERRUN DOES NOT DO EASY.'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 12 : 15,
      fill: '#fff3a2',
      stroke: '#160208',
      strokeThickness: 3,
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: cardWidth - 72,
      lineHeight: compact ? 14 : 18
    });
    warning.anchor.set(0.5);
    warning.label = 'ui_overrun_card_warning';
    warning.y = cardHeight / 2 - 72;
    card.addChild(warning);

    const button = new PIXI.Container();
    button.label = 'ui_overrun_confirm_button';
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.y = cardHeight / 2 - (compact ? 38 : 42);
    const buttonWidth = Math.min(cardWidth - 96, compact ? 340 : 430);
    const buttonHeight = compact ? 38 : 44;
    button.hitArea = new PIXI.Rectangle(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);
    const buttonBg = new PIXI.Graphics();
    const drawButton = (hovered = false) => {
      buttonBg.clear();
      buttonBg.roundRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 7);
      buttonBg.fill({ color: hovered ? accentColor : 0x06243a, alpha: hovered ? 0.94 : 0.88 });
      buttonBg.stroke({ color: hovered ? 0xffffff : primaryColor, width: hovered ? 2.4 : 1.8, alpha: 0.92 });
      buttonBg.rect(-buttonWidth / 2 + 14, -buttonHeight / 2 + 8, 4, buttonHeight - 16);
      buttonBg.fill({ color: secondaryColor, alpha: hovered ? 0.82 : 0.56 });
      buttonBg.rect(buttonWidth / 2 - 18, -buttonHeight / 2 + 8, 4, buttonHeight - 16);
      buttonBg.fill({ color: accentColor, alpha: hovered ? 0.82 : 0.56 });
    };
    drawButton(false);
    button.addChild(buttonBg);
    button.on('pointerover', () => drawButton(true));
    button.on('pointerout', () => drawButton(false));
    button.on('pointertap', () => this.confirmOverrunInterlude('pointer'));

    const confirmText = createText(translateText(celebration?.continueText || "I'M READY - BRING THE SWARM", vars), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 13 : 17,
      fill: '#ffffff',
      stroke: '#160208',
      strokeThickness: 3,
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: buttonWidth - 28,
      lineHeight: compact ? 15 : 19
    });
    confirmText.anchor.set(0.5);
    confirmText.label = 'ui_overrun_confirm_prompt';
    button.addChild(confirmText);
    card.addChild(button);

    return card;
  }

  drawOverrunMotifIcon(graphics, motif = 'signal', { primaryColor = 0xffd15c, accentColor = 0x61f6ff, secondaryColor = 0xffffff } = {}) {
    graphics.clear();
    if (motif === 'double_rail') {
      graphics.rect(-12, -18, 6, 36).fill({ color: primaryColor, alpha: 0.85 });
      graphics.rect(6, -18, 6, 36).fill({ color: accentColor, alpha: 0.85 });
      graphics.circle(0, 0, 11).stroke({ color: secondaryColor, width: 2, alpha: 0.86 });
      return;
    }
    if (motif === 'orbit') {
      graphics.circle(0, 0, 8).fill({ color: primaryColor, alpha: 0.82 });
      graphics.ellipse(0, 0, 24, 10).stroke({ color: accentColor, width: 2, alpha: 0.8 });
      graphics.ellipse(0, 0, 10, 24).stroke({ color: secondaryColor, width: 1.5, alpha: 0.72 });
      return;
    }
    if (motif === 'deep_scan') {
      graphics.rect(-18, -14, 36, 28).stroke({ color: accentColor, width: 2, alpha: 0.82 });
      graphics.moveTo(-14, -4).lineTo(14, -4).stroke({ color: primaryColor, width: 2, alpha: 0.86 });
      graphics.moveTo(-14, 5).lineTo(14, 5).stroke({ color: secondaryColor, width: 1.5, alpha: 0.72 });
      graphics.circle(0, 0, 5).fill({ color: accentColor, alpha: 0.72 });
      return;
    }
    if (motif === 'finale') {
      for (let i = 0; i < 10; i += 1) {
        const radius = i % 2 === 0 ? 23 : 10;
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
      }
      graphics.lineTo(0, -23);
      graphics.fill({ color: primaryColor, alpha: 0.82 });
      graphics.circle(0, 0, 24).stroke({ color: accentColor, width: 2, alpha: 0.78 });
      graphics.circle(0, 0, 8).fill({ color: secondaryColor, alpha: 0.88 });
      return;
    }
    graphics.circle(0, 0, 19).stroke({ color: primaryColor, width: 3, alpha: 0.88 });
    graphics.circle(0, 0, 9).fill({ color: accentColor, alpha: 0.82 });
    graphics.moveTo(-24, 0).lineTo(24, 0).stroke({ color: secondaryColor, width: 2, alpha: 0.58 });
  }

  updateOverrunMilestoneInterlude(delta) {
    this.updateOverrunClearCelebrations();
    const perfOptions = this.performanceDiagnostics?.enabled ? this.performanceDiagnostics.options : null;
    if (!perfOptions?.noStarfield) this.updateStarfield(delta);
    if (this.screenShake) this.screenShake.update(delta);
    if (this.scorePopupManager) this.scorePopupManager.update(delta);
    if (this.hud) this.hud.update();
    if (AudioManager && AudioManager.update) AudioManager.update(delta);

    const interlude = this.overrunMilestoneInterlude;
    if (!interlude?.active) return;
    this.pollOverrunConfirmationInput();
    const elapsed = Date.now() - interlude.startedAt;
    const rawProgress = Math.max(0, Math.min(1, elapsed / interlude.durationMs));
    const waitingForConfirm = Boolean(interlude.requiresConfirm && !interlude.confirmed);
    const progress = waitingForConfirm ? Math.min(rawProgress, 0.82) : rawProgress;
    const card = interlude.effect?.interludeCard;
    if (card && !card.destroyed) {
      const intro = Math.min(1, progress * 5.2);
      const outro = !waitingForConfirm && progress > 0.82 ? Math.max(0, 1 - (progress - 0.82) / 0.18) : 1;
      card.alpha = (1 - Math.pow(1 - intro, 3)) * outro;
      card.scale.set((0.92 + Math.sin(elapsed * 0.006) * 0.012) * (0.96 + intro * 0.04));
      const confirmPrompt = this.findOverrunInterludeNode(card, 'ui_overrun_confirm_prompt');
      const confirmButton = this.findOverrunInterludeNode(card, 'ui_overrun_confirm_button');
      if (confirmPrompt) {
        const ready = Date.now() >= (interlude.confirmReadyAt || interlude.startedAt);
        confirmPrompt.visible = Boolean(interlude.requiresConfirm);
        confirmPrompt.alpha = waitingForConfirm
          ? (ready ? 0.72 + Math.sin(elapsed * 0.008) * 0.18 : 0.42)
          : Math.max(0, 1 - rawProgress * 1.4);
      }
      if (confirmButton) {
        const ready = Date.now() >= (interlude.confirmReadyAt || interlude.startedAt);
        confirmButton.alpha = waitingForConfirm ? (ready ? 1 : 0.72) : Math.max(0, 1 - rawProgress * 1.4);
      }
    }
    if (waitingForConfirm) return;
    if (rawProgress >= 1) {
      const onComplete = interlude.onComplete;
      interlude.onComplete = null;
      interlude.active = false;
      this.overrunMilestoneInterlude = null;
      this.clearOverrunConfirmationHandlers();
      onComplete?.();
    }
  }

  updateOverrunClearCelebrations() {
    if (!this.overrunClearEffects?.length) return;
    const now = Date.now();
    const width = this.game.getWidth();
    const height = this.game.getHeight();

    this.overrunClearEffects = this.overrunClearEffects.filter((effect) => {
      const elapsed = now - effect.startedAt;
      const rawProgress = Math.max(0, Math.min(1, elapsed / effect.durationMs));
      const waitingForConfirm = Boolean(effect.requiresConfirm && !effect.confirmed);
      const progress = waitingForConfirm ? Math.min(rawProgress, 0.82) : rawProgress;
      if (rawProgress >= 1 && !waitingForConfirm) {
        effect.container?.parent?.removeChild(effect.container);
        effect.container?.destroy?.({ children: true });
        return false;
      }

      const burst = 1 - Math.pow(1 - Math.min(1, progress * 2.2), 3);
      const fade = Math.sin(progress * Math.PI);
      const lateFade = Math.max(0, 1 - Math.max(0, progress - 0.72) / 0.28);
      const visual = effect.visual || {};
      const primaryColor = visual.primaryColor || 0xffd15c;
      const accentColor = visual.accentColor || 0x61f6ff;
      const secondaryColor = visual.secondaryColor || 0xfff2a6;
      const flashColor = visual.flashColor || secondaryColor;
      const ringCount = Math.max(3, Math.min(8, Math.floor(Number(visual.ringCount) || 4)));
      const rayCount = Math.max(16, Math.min(36, Math.floor(Number(visual.rayCount) || 24)));
      const shardSpeed = Math.max(0.25, Number(visual.shardSpeed) || 1);
      const sealScale = Math.max(0.5, Number(visual.sealScale) || 1);
      const pulse = 1 + Math.sin(now * (Number(visual.pulseRate) || 0.012)) * 0.025;
      const maxRadius = Math.hypot(width, height) * 0.68;

      effect.flash.clear();
      const flashAlpha = Math.max(0, (1 - progress * 5.8) * 0.34);
      if (flashAlpha > 0) {
        effect.flash.rect(0, 0, width, height);
        effect.flash.fill({ color: flashColor, alpha: flashAlpha });
      }

      if (effect.seal) {
        const baseScale = Math.min(width, height) / 1024;
        const introScale = 0.18 + burst * 0.82;
        effect.seal.x = effect.centerX;
        effect.seal.y = effect.centerY;
        effect.seal.scale.set(baseScale * introScale * sealScale * (1.02 + Math.sin(now * 0.006) * 0.025));
        effect.seal.rotation = -0.1 + progress * 0.34;
        effect.seal.alpha = Math.min(0.82, burst * 0.9) * lateFade;
      }

      effect.rays.clear();
      effect.rings.clear();

      for (let i = 0; i < ringCount; i += 1) {
        const local = (progress * 1.7 + i * 0.22) % 1;
        const radius = 48 + local * maxRadius;
        const alpha = Math.max(0, 1 - local) * 0.34 * lateFade;
        effect.rings.circle(effect.centerX, effect.centerY, radius * pulse);
        effect.rings.stroke({ color: i % 2 ? accentColor : primaryColor, width: Math.max(1.2, 4 - i * 0.45), alpha });
      }

      for (let i = 0; i < rayCount; i += 1) {
        const angle = (Math.PI * 2 * i) / rayCount + progress * 0.32;
        const inner = 34 + burst * 70;
        const outer = inner + maxRadius * (0.36 + Math.sin(i + now * 0.004) * 0.04);
        const alpha = (0.1 + 0.16 * Math.sin(progress * Math.PI)) * lateFade;
        effect.rays.moveTo(effect.centerX + Math.cos(angle) * inner, effect.centerY + Math.sin(angle) * inner);
        effect.rays.lineTo(effect.centerX + Math.cos(angle) * outer, effect.centerY + Math.sin(angle) * outer);
        effect.rays.stroke({ color: i % 3 === 0 ? secondaryColor : (i % 2 ? accentColor : primaryColor), width: i % 3 === 0 ? 2.2 : 1.3, alpha });
      }

      for (const shard of effect.shards) {
        const t = Math.min(1, progress * shard.speed * shardSpeed);
        const distance = 70 + t * Math.min(width, height) * (0.42 + shard.drift * 0.25);
        const spin = now * 0.004 + shard.drift * 3;
        const x = effect.centerX + Math.cos(shard.angle) * distance;
        const y = effect.centerY + Math.sin(shard.angle) * distance;
        const dx = Math.cos(shard.angle + Math.PI * 0.5 + spin) * shard.size;
        const dy = Math.sin(shard.angle + Math.PI * 0.5 + spin) * shard.size;
        effect.rays.moveTo(x - dx, y - dy);
        effect.rays.lineTo(x + dx, y + dy);
        effect.rays.stroke({ color: shard.color, width: 2.5, alpha: Math.max(0, (1 - t) * 0.78) * lateFade });
      }

      const coreRadius = 18 + burst * 92 + Math.sin(now * 0.018) * 5;
      effect.rings.circle(effect.centerX, effect.centerY, coreRadius);
      effect.rings.fill({ color: 0xffffff, alpha: 0.08 * fade });
      effect.rings.circle(effect.centerX, effect.centerY, coreRadius * 1.34);
      effect.rings.stroke({ color: secondaryColor, width: 6, alpha: 0.2 * fade * lateFade });

      return true;
    });
  }

  findOverrunInterludeNode(root, label) {
    if (!root || !label) return null;
    if (root.label === label) return root;
    const children = Array.isArray(root.children) ? root.children : [];
    for (const child of children) {
      const match = this.findOverrunInterludeNode(child, label);
      if (match) return match;
    }
    return null;
  }

  collectOverrunInterludeTextNodes(root, getBounds = null, nodes = []) {
    if (!root) return nodes;
    const id = root.label;
    const hasText = typeof root.text === 'string' || typeof root.text === 'number';
    if (hasText && typeof id === 'string' && (
      id.startsWith('ui_overrun_card_') ||
      id === 'ui_overrun_confirm_prompt'
    )) {
      nodes.push({
        id,
        text: root.text || null,
        visible: root.visible !== false && root.alpha > 0.05,
        bounds: typeof getBounds === 'function' ? getBounds(root) : null
      });
    }
    const children = Array.isArray(root.children) ? root.children : [];
    for (const child of children) this.collectOverrunInterludeTextNodes(child, getBounds, nodes);
    return nodes;
  }

  installOverrunConfirmationHandlers() {
    this.clearOverrunConfirmationHandlers();
    this.overrunConfirmGamepadWasPressed = Boolean(this.inputManager?.pollGamepad?.(true)?.buttons?.firing);
    this._overrunConfirmKeyHandler = (event) => {
      if (!this.overrunMilestoneInterlude?.active) return;
      const code = event?.code || '';
      const key = event?.key || '';
      const matches = code === 'Enter' || code === 'NumpadEnter' || code === 'Space' || code === 'Escape' ||
        key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Escape';
      if (!matches) return;
      event?.preventDefault?.();
      this.confirmOverrunInterlude('keyboard');
    };
    window.addEventListener('keydown', this._overrunConfirmKeyHandler);

    this._overrunConfirmPointerHandler = () => this.confirmOverrunInterlude('pointer');
    const target = this.game?.app?.canvas || this.game?.app?.view || window;
    this._overrunConfirmPointerTarget = target;
    target.addEventListener?.('pointerdown', this._overrunConfirmPointerHandler, { passive: true });
  }

  clearOverrunConfirmationHandlers() {
    if (this._overrunConfirmKeyHandler) {
      window.removeEventListener('keydown', this._overrunConfirmKeyHandler);
      this._overrunConfirmKeyHandler = null;
    }
    if (this._overrunConfirmPointerHandler && this._overrunConfirmPointerTarget) {
      this._overrunConfirmPointerTarget.removeEventListener?.('pointerdown', this._overrunConfirmPointerHandler);
    }
    this._overrunConfirmPointerHandler = null;
    this._overrunConfirmPointerTarget = null;
    this.overrunConfirmGamepadWasPressed = false;
  }

  confirmOverrunInterlude(source = 'unknown') {
    const interlude = this.overrunMilestoneInterlude;
    if (!interlude?.active || !interlude.requiresConfirm || interlude.confirmed) return false;
    const now = Date.now();
    if (now < (interlude.confirmReadyAt || interlude.startedAt || 0)) return false;
    interlude.confirmed = true;
    interlude.confirmedBy = source;
    interlude.startedAt = now - Math.round(interlude.durationMs * 0.82);
    if (interlude.effect) {
      interlude.effect.confirmed = true;
      interlude.effect.confirmedBy = source;
      interlude.effect.startedAt = now - Math.round(interlude.effect.durationMs * 0.82);
    }
    this.clearOverrunConfirmationHandlers();
    AudioManager.playSfx('start_game_confirm', { force: true, volume: 0.9, minIntervalMs: 0 });
    return true;
  }

  pollOverrunConfirmationInput() {
    const interlude = this.overrunMilestoneInterlude;
    if (!interlude?.active || !interlude.requiresConfirm || interlude.confirmed) return;
    if (this.inputManager?.consumeKeyPress?.('Enter', 'NumpadEnter', 'Space', 'Escape')) {
      this.confirmOverrunInterlude('keyboard');
      return;
    }
    const gamepad = this.inputManager?.pollGamepad?.(true);
    const pressed = Boolean(gamepad?.buttons?.firing || gamepad?.firing || gamepad?.pauseJustPressed);
    if (pressed && !this.overrunConfirmGamepadWasPressed) {
      this.confirmOverrunInterlude('gamepad');
    }
    this.overrunConfirmGamepadWasPressed = pressed;
  }

  getOverrunInterludeDebugState(getBounds = null) {
    const interlude = this.overrunMilestoneInterlude;
    const effect = interlude?.effect || null;
    const card = effect?.interludeCard || null;
    const confirmPrompt = this.findOverrunInterludeNode(card, 'ui_overrun_confirm_prompt');
    const confirmButton = this.findOverrunInterludeNode(card, 'ui_overrun_confirm_button');
    if (!interlude?.active) {
      return {
        active: false,
        requiresConfirm: false,
        confirmed: false,
        confirmedBy: null,
        eventKind: null,
        milestoneSector: null,
        nextSector: null,
        variantId: null,
        readyForConfirm: false,
        cardVisible: false,
        promptVisible: false,
        promptText: null,
        bounds: null,
        buttonBounds: null,
        promptBounds: null,
        milestoneReward: null,
        textNodes: []
      };
    }
    const textNodes = this.collectOverrunInterludeTextNodes(card, getBounds);
    return {
      active: true,
      requiresConfirm: Boolean(interlude.requiresConfirm),
      confirmed: Boolean(interlude.confirmed),
      confirmedBy: interlude.confirmedBy || effect?.confirmedBy || null,
      eventKind: interlude.eventKind || effect?.eventKind || null,
      milestoneSector: Number(interlude.milestoneSector || effect?.milestoneSector || 0) || null,
      nextSector: Number(interlude.nextSector || 0) || null,
      variantId: interlude.variantId || effect?.variantId || null,
      readyForConfirm: Date.now() >= (interlude.confirmReadyAt || interlude.startedAt || 0),
      cardVisible: Boolean(card && !card.destroyed && card.visible !== false && card.alpha > 0.05),
      promptVisible: Boolean(confirmPrompt && confirmPrompt.visible !== false && confirmPrompt.alpha > 0.05),
      promptText: confirmPrompt?.text || null,
      bounds: typeof getBounds === 'function' ? getBounds(card) : null,
      buttonBounds: typeof getBounds === 'function' ? getBounds(confirmButton) : null,
      promptBounds: typeof getBounds === 'function' ? getBounds(confirmPrompt) : null,
      milestoneReward: interlude.milestoneReward || effect?.milestoneReward || null,
      textNodes
    };
  }

  enqueueToast(message, options = {}) {
    if (!message) return;
    const slot = options.slot || 'center';
    const type = options.type || 'generic';
    const priorityMap = {
      boss: 4,
      run_clear: 5,
      level_clear: 3,
      rank_up: 3,
      repair: 2,
      rank_boost: 2,
      level_up: 1,
      score_boost: 1
    };
    const priority = Number.isFinite(options.priority) ? options.priority : (priorityMap[type] || 0);
    const now = Date.now();
    const lockUntil = this.getToastSlotLockUntil(slot);
    const bypassFocusLock = options.bypassFocusLock === true || (options.bypassFocusLock !== false && priority > 3);
    let notBefore = bypassFocusLock ? (Number(options.notBefore) || 0) : Math.max(Number(options.notBefore) || 0, lockUntil);
    const firstRunOnboardingUntil = Math.max(0, Number(this.firstRunOnboardingUntil) || 0);
    if (slot === 'corner' && firstRunOnboardingUntil > now && priority <= 1) {
      notBefore = Math.max(notBefore, firstRunOnboardingUntil);
    }
    const duplicateKey = this.getToastDuplicateKey(message, type);
    if (duplicateKey && this.hasActiveDuplicateToast(duplicateKey)) {
      return;
    }
    const entry = {
      message,
      options: { ...options, type, slot, priority, notBefore, duplicateKey },
      priority,
      createdAt: now,
      notBefore,
      duplicateKey
    };

    if (priority >= 3) {
      this.dropLowerPriorityToastBacklog(priority);
      this.dismissActiveToastsBelowPriority(priority);
    }

    const queue = this.getToastQueueForSlot(slot);
    if (!queue) return;

    if (
      slot === 'corner'
      && type === 'discovery'
      && firstRunOnboardingUntil > now
      && queue.some((queued) => queued?.options?.type === 'discovery')
    ) {
      return;
    }

    if (duplicateKey && this.collapseQueuedDuplicateToast(entry)) {
      this.processToastQueue();
      return;
    }

    queue.push(entry);
    queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    const limit = this.getToastQueueLimit(slot);
    while (queue.length > limit) queue.pop();

    this.processToastQueue();
  }

  getToastQueueForSlot(slot) {
    if (slot === 'corner') return this.toastCornerQueue;
    if (slot === 'top') return this.toastTopQueue;
    return this.toastQueue;
  }

  getToastQueueLimit(slot) {
    if (slot === 'corner') return 2;
    if (slot === 'top') return 2;
    return 4;
  }

  getToastDuplicateKey(message, type = 'generic') {
    const normalized = String(message || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    if (!normalized) return '';
    return `${String(type || 'generic').toLowerCase()}::${normalized}`;
  }

  getActiveToastDisplays() {
    return [
      this.activeBossIntroCard,
      this.activeCenterToast,
      this.activeTopToast,
      this.activeCornerToast
    ].filter(Boolean);
  }

  hasActiveDuplicateToast(duplicateKey) {
    if (!duplicateKey) return false;
    return this.getActiveToastDisplays().some(display => display?.__toastMeta?.duplicateKey === duplicateKey);
  }

  collapseQueuedDuplicateToast(entry) {
    if (!entry?.duplicateKey) return false;
    const queues = [this.toastQueue, this.toastTopQueue, this.toastCornerQueue].filter(Boolean);
    let collapsed = false;
    for (const queue of queues) {
      for (let index = queue.length - 1; index >= 0; index -= 1) {
        const candidate = queue[index];
        const candidateKey = candidate?.duplicateKey || candidate?.options?.duplicateKey ||
          this.getToastDuplicateKey(candidate?.message, candidate?.options?.type || candidate?.type);
        if (candidateKey !== entry.duplicateKey) continue;
        if ((candidate.priority || 0) >= (entry.priority || 0)) {
          candidate.createdAt = entry.createdAt;
          candidate.notBefore = Math.min(candidate.notBefore || entry.notBefore || 0, entry.notBefore || 0);
          candidate.priority = Math.max(candidate.priority || 0, entry.priority || 0);
          candidate.options = {
            ...candidate.options,
            ...entry.options,
            slot: candidate.options?.slot || entry.options?.slot,
            priority: candidate.priority,
            notBefore: candidate.notBefore,
            duplicateKey: entry.duplicateKey
          };
          collapsed = true;
        } else {
          queue.splice(index, 1);
        }
      }
      queue.sort((a, b) => b.priority - a.priority || (a.notBefore || 0) - (b.notBefore || 0) || a.createdAt - b.createdAt);
    }
    return collapsed;
  }

  dropLowerPriorityToastBacklog(priority) {
    this.toastQueue = this.toastQueue.filter(entry => entry.priority >= priority);
    this.toastTopQueue = this.toastTopQueue.filter(entry => entry.priority >= priority);
    this.toastCornerQueue = this.toastCornerQueue.filter(entry => entry.priority >= priority);
  }

  dismissActiveToastsBelowPriority(priority) {
    this.dismissActiveToastSlotsBelowPriority(['center', 'top', 'corner'], priority);
  }

  dismissActiveToastSlotsBelowPriority(slots, priority) {
    const now = Date.now();
    [
      ['center', this.activeBossIntroCard],
      ['center', this.activeCenterToast],
      ['top', this.activeTopToast],
      ['corner', this.activeCornerToast]
    ].forEach(([slot, display]) => {
      if (!slots.includes(slot)) return;
      const activePriority = display?.__toastMeta?.priority ?? 0;
      const protectedUntil = Number(display?.__toastMeta?.protectedUntil) || 0;
      if (protectedUntil > now && priority <= 3) return;
      if (display && activePriority < priority) {
        this.dismissToastDisplay(display, slot);
      }
    });
  }

  getToastSlotLockUntil(slot) {
    if (slot === 'center') return Math.max(this.centerToastLockUntil || 0, this.toastSlotLockUntil?.center || 0);
    return this.toastSlotLockUntil?.[slot] || 0;
  }

  reserveMessageFocus(durationMs, { priority = 3, slots = ['center', 'top', 'corner'] } = {}) {
    const duration = Math.max(0, Number(durationMs) || 0);
    if (!duration) return;
    const until = Date.now() + duration;
    if (!this.toastSlotLockUntil) this.toastSlotLockUntil = { center: 0, top: 0, corner: 0 };
    slots.forEach((slot) => {
      if (slot === 'center') {
        this.centerToastLockUntil = Math.max(this.centerToastLockUntil || 0, until);
      }
      if (slot in this.toastSlotLockUntil) {
        this.toastSlotLockUntil[slot] = Math.max(this.toastSlotLockUntil[slot] || 0, until);
      }
    });
    this.dismissActiveToastSlotsBelowPriority(slots, priority);
    setTimeout(() => {
      if (this.game?.app) this.processToastQueue();
    }, duration + 20);
  }

  getTransitionMessageDelayMs({ minMs = 900, maxMs = 1400 } = {}) {
    const now = Date.now();
    const lockRemaining = ['center', 'top', 'corner']
      .map(slot => Math.max(0, this.getToastSlotLockUntil(slot) - now))
      .reduce((max, value) => Math.max(max, value), 0);
    const activeRemaining = (this.activeBossIntroCard || this.activeCenterToast || this.activeTopToast) ? minMs : 0;
    const desired = Math.max(lockRemaining, activeRemaining);
    return Math.max(0, Math.min(Math.max(minMs, maxMs), desired));
  }

  dismissToastDisplay(display, slot) {
    if (!display) return;
    if (display.__toastTicker) {
      this.game.app.ticker.remove(display.__toastTicker);
      display.__toastTicker = null;
    }
    if (display.parent) display.parent.removeChild(display);

    if (this.activeBossIntroCard === display) {
      this.activeBossIntroCard = null;
    } else if (slot === 'corner' && this.activeCornerToast === display) {
      this.activeCornerToast = null;
    } else if (slot === 'top' && this.activeTopToast === display) {
      this.activeTopToast = null;
    } else if (this.activeCenterToast === display) {
      this.activeCenterToast = null;
    }
  }

  deferActiveToastDisplay(display, slot, delayMs = 0, { minRemainingMs = 900 } = {}) {
    const meta = display?.__toastMeta;
    if (!display || !meta?.message) return false;
    const now = Date.now();
    const priority = Number.isFinite(meta.priority) ? meta.priority : 0;
    const elapsed = Math.max(0, now - (meta.createdAt || now));
    const originalDuration = Math.max(0, Number(meta.duration) || 0);
    const remaining = Math.max(
      Math.max(0, Number(minRemainingMs) || 0),
      Math.max(0, originalDuration - elapsed)
    );
    const notBefore = now + Math.max(0, Number(delayMs) || 0);
    const type = meta.type || meta.originalOptions?.type || 'generic';
    const duplicateKey = meta.duplicateKey || this.getToastDuplicateKey(meta.message, type);
    const entry = {
      message: meta.message,
      priority,
      createdAt: now,
      notBefore,
      duplicateKey,
      options: {
        ...(meta.originalOptions || {}),
        slot,
        type,
        priority,
        duration: remaining,
        extraReadTimeMs: 0,
        notBefore,
        duplicateKey
      }
    };

    this.dismissToastDisplay(display, slot);
    const queue = this.getToastQueueForSlot(slot);
    if (!queue) return false;
    if (duplicateKey && this.collapseQueuedDuplicateToast(entry)) return true;
    queue.push(entry);
    queue.sort((a, b) => b.priority - a.priority || (a.notBefore || 0) - (b.notBefore || 0) || a.createdAt - b.createdAt);
    while (queue.length > this.getToastQueueLimit(slot)) queue.pop();
    return true;
  }

  clearToastState() {
    this.toastQueue = [];
    this.toastTopQueue = [];
    this.toastCornerQueue = [];
    this.dismissToastDisplay(this.activeBossIntroCard, 'center');
    this.dismissToastDisplay(this.activeCenterToast, 'center');
    this.dismissToastDisplay(this.activeTopToast, 'top');
    this.dismissToastDisplay(this.activeCornerToast, 'corner');
    this.centerToastLockUntil = 0;
    this.toastSlotLockUntil = { center: 0, top: 0, corner: 0 };
  }

  hasActiveCombatThreats() {
    if (this.introActive || this.isPaused || this.overrunMilestoneInterlude?.active) return false;
    const enemies = this.enemyManager?.enemies || [];
    const enemyBullets = this.bulletManager?.enemyBullets || [];
    const activeEnemy = enemies.some(enemy =>
      enemy?.active !== false && enemy.waitingForEntry !== true && enemy.visible !== false
    );
    const activeBullet = enemyBullets.some(bullet => bullet?.active !== false && bullet.visible !== false);
    return activeEnemy || activeBullet;
  }

  shouldRelocateCenterToastForCombat(entryOrMeta) {
    if (!entryOrMeta || !this.hasActiveCombatThreats()) return false;
    const options = entryOrMeta.options || entryOrMeta.originalOptions || entryOrMeta;
    const slot = options.slot || entryOrMeta.slot || 'center';
    if (slot !== 'center') return false;
    if (options.combatSafeCenter === true || options.combatRelocated === true || options.banner === true) return false;
    const type = options.type || entryOrMeta.type || 'generic';
    const priority = Number.isFinite(options.priority)
      ? options.priority
      : Number.isFinite(entryOrMeta.priority)
      ? entryOrMeta.priority
      : 0;
    if (priority >= 4) return false;
    return !this.isTransitionToastType(type);
  }

  queueCombatRelocatedToast(entry, now = Date.now(), remainingMs = null) {
    if (!entry?.message) return false;
    const sourceOptions = entry.options || entry.originalOptions || {};
    const baseFontSize = Number(sourceOptions.fontSize) || (this.game.getWidth() < 620 ? 16 : 20);
    const hasRemainingMs = Number.isFinite(Number(remainingMs));
    const duration = Math.max(500, Math.min(
      hasRemainingMs ? Number(remainingMs) : (Number(sourceOptions.duration) || 1300),
      hasRemainingMs ? 1200 + GAMEPLAY_MESSAGE_EXTRA_READ_MS : 1500
    ));
    const nextEntry = {
      message: entry.message,
      priority: Math.max(Number(entry.priority) || Number(sourceOptions.priority) || 0, 1),
      createdAt: now,
      notBefore: now,
      duplicateKey: sourceOptions.duplicateKey || this.getToastDuplicateKey(entry.message, sourceOptions.type || entry.type || 'generic'),
      options: {
        ...sourceOptions,
        slot: 'top',
        type: sourceOptions.type || entry.type || 'generic',
        priority: Math.max(Number(entry.priority) || Number(sourceOptions.priority) || 0, 1),
        fontSize: Math.min(baseFontSize, this.game.getWidth() < 620 ? 15 : 18),
        duration,
        extraReadTimeMs: hasRemainingMs ? 0 : sourceOptions.extraReadTimeMs,
        notBefore: now,
        combatRelocated: true,
        duplicateKey: sourceOptions.duplicateKey || this.getToastDuplicateKey(entry.message, sourceOptions.type || entry.type || 'generic')
      }
    };
    if (nextEntry.duplicateKey && this.hasActiveDuplicateToast(nextEntry.duplicateKey)) return true;
    if (nextEntry.duplicateKey && this.collapseQueuedDuplicateToast(nextEntry)) return true;
    this.toastTopQueue.push(nextEntry);
    this.toastTopQueue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    while (this.toastTopQueue.length > this.getToastQueueLimit('top')) this.toastTopQueue.pop();
    return true;
  }

  maybeRelocateActiveCenterToastForCombat(now = Date.now()) {
    const display = this.activeCenterToast;
    const meta = display?.__toastMeta;
    if (!display || !meta || !this.shouldRelocateCenterToastForCombat(meta)) return false;
    const elapsed = Math.max(0, now - (meta.createdAt || now));
    const remaining = Math.max(550, Math.min(
      (meta.duration || 1200) - elapsed,
      1200 + GAMEPLAY_MESSAGE_EXTRA_READ_MS
    ));
    const relocated = this.queueCombatRelocatedToast({
      message: meta.message,
      type: meta.type,
      priority: meta.priority,
      originalOptions: meta.originalOptions || {}
    }, now, remaining);
    this.dismissToastDisplay(display, 'center');
    if (relocated) this.processToastQueue();
    return relocated;
  }

  processToastQueue() {
    if (this.overrunMilestoneInterlude?.active) return;
    const now = Date.now();
    this.maybeRelocateActiveCenterToastForCombat(now);
    const centerPresentationActive = Boolean(this.activeWaveBonusEffect?.parent || this.activeRankUpPresentation?.parent);
    let centerReady = !centerPresentationActive && !this.activeBossIntroCard && !this.activeCenterToast && now >= this.getToastSlotLockUntil('center')
      ? this.peekReadyToast(this.toastQueue, now)
      : null;
    let topReady = !this.activeTopToast && now >= this.getToastSlotLockUntil('top')
      ? this.peekReadyToast(this.toastTopQueue, now)
      : null;
    if (centerReady && this.shouldRelocateCenterToastForCombat(centerReady)) {
      const entry = this.dequeueReadyToast(this.toastQueue, now);
      if (entry) this.queueCombatRelocatedToast(entry, now);
      centerReady = !centerPresentationActive && !this.activeBossIntroCard && !this.activeCenterToast && now >= this.getToastSlotLockUntil('center')
        ? this.peekReadyToast(this.toastQueue, now)
        : null;
      topReady = !this.activeTopToast && now >= this.getToastSlotLockUntil('top')
        ? this.peekReadyToast(this.toastTopQueue, now)
        : null;
    }
    if (centerReady && topReady && this.isTransitionToastEntry(centerReady) && this.isTransitionToastEntry(topReady)) {
      if ((centerReady.priority || 0) >= (topReady.priority || 0)) {
        this.delayReadyToast(this.toastTopQueue, topReady, 600, now);
      } else {
        this.delayReadyToast(this.toastQueue, centerReady, 600, now);
      }
    }
    const activeCenterMeta = this.activeBossIntroCard?.__toastMeta || this.activeCenterToast?.__toastMeta || null;
    if (activeCenterMeta && this.isTransitionToastType(activeCenterMeta.type)) {
      const centerPriority = activeCenterMeta.priority || 0;
      if (topReady && (topReady.priority || 0) < centerPriority) {
        this.delayReadyToast(this.toastTopQueue, topReady, 500, now);
      }
      const cornerReady = !this.activeCornerToast && now >= this.getToastSlotLockUntil('corner')
        ? this.peekReadyToast(this.toastCornerQueue, now)
        : null;
      if (cornerReady && (cornerReady.priority || 0) < centerPriority) {
        this.delayReadyToast(this.toastCornerQueue, cornerReady, 500, now);
      }
    }
    if (!centerPresentationActive && !this.activeBossIntroCard && !this.activeCenterToast && now >= this.getToastSlotLockUntil('center') && this.toastQueue.length > 0) {
      const entry = this.dequeueReadyToast(this.toastQueue, now);
      if (entry) this.activeCenterToast = this.showToastNow(entry.message, entry.options, 'center');
    }
    const blockingCenterMeta = this.activeBossIntroCard?.__toastMeta || this.activeCenterToast?.__toastMeta || null;
    if (blockingCenterMeta && this.isTransitionToastType(blockingCenterMeta.type)) {
      const centerPriority = blockingCenterMeta.priority || 0;
      this.dismissActiveToastSlotsBelowPriority(['top', 'corner'], centerPriority);
      const delayedTop = !this.activeTopToast && now >= this.getToastSlotLockUntil('top')
        ? this.peekReadyToast(this.toastTopQueue, now)
        : null;
      const delayedCorner = !this.activeCornerToast && now >= this.getToastSlotLockUntil('corner')
        ? this.peekReadyToast(this.toastCornerQueue, now)
        : null;
      if (delayedTop && (delayedTop.priority || 0) < centerPriority) {
        this.delayReadyToast(this.toastTopQueue, delayedTop, 500, now);
      }
      if (delayedCorner && (delayedCorner.priority || 0) < centerPriority) {
        this.delayReadyToast(this.toastCornerQueue, delayedCorner, 500, now);
      }
      if ((delayedTop && (delayedTop.priority || 0) < centerPriority) ||
        (delayedCorner && (delayedCorner.priority || 0) < centerPriority)) {
        return;
      }
    }
    if (!this.activeTopToast && now >= this.getToastSlotLockUntil('top') && this.toastTopQueue.length > 0) {
      const entry = this.dequeueReadyToast(this.toastTopQueue, now);
      if (entry) this.activeTopToast = this.showToastNow(entry.message, entry.options, 'top');
    }
    if (!this.activeCornerToast && now >= this.getToastSlotLockUntil('corner') && this.toastCornerQueue.length > 0) {
      const entry = this.dequeueReadyToast(this.toastCornerQueue, now);
      if (entry) this.activeCornerToast = this.showToastNow(entry.message, entry.options, 'corner');
    }
  }

  dequeueReadyToast(queue, now) {
    const index = queue.findIndex(entry => (entry.notBefore || 0) <= now);
    if (index < 0) return null;
    return queue.splice(index, 1)[0];
  }

  peekReadyToast(queue, now) {
    return queue.find(entry => (entry.notBefore || 0) <= now) || null;
  }

  isTransitionToastEntry(entry) {
    const type = entry?.options?.type;
    return this.isTransitionToastType(type) || entry?.options?.transition === true;
  }

  isTransitionToastType(type) {
    return type === 'level_clear' || type === 'level_up' || type === 'boss' || type === 'boss_intro' || type === 'run_clear';
  }

  delayReadyToast(queue, entry, delayMs, now = Date.now()) {
    if (!entry) return;
    entry.notBefore = now + Math.max(0, Number(delayMs) || 0);
    entry.options = { ...entry.options, notBefore: entry.notBefore };
    queue.sort((a, b) => b.priority - a.priority || (a.notBefore || 0) - (b.notBefore || 0) || a.createdAt - b.createdAt);
  }

  getToastDisplayBounds(display) {
    try {
      if (!display?.getBounds) return null;
      const bounds = display.getBounds();
      const width = Math.round(bounds.width || 0);
      const height = Math.round(bounds.height || 0);
      if (width <= 0 || height <= 0) return null;
      return {
        x: Math.round(bounds.x || 0),
        y: Math.round(bounds.y || 0),
        width,
        height
      };
    } catch {
      return null;
    }
  }

  describeToastDisplay(display, getBounds = null) {
    const meta = display?.__toastMeta;
    if (!meta) return null;
    return {
      slot: meta.slot,
      type: meta.type,
      message: meta.message,
      title: meta.title || null,
      imageAlias: meta.imageAlias || null,
      duration: meta.duration,
      protectedRemainingMs: Math.max(0, (Number(meta.protectedUntil) || 0) - Date.now()),
      combatRelocated: Boolean(meta.combatRelocated),
      edgeAligned: Boolean(meta.edgeAligned),
      placement: meta.placement || null,
      ageMs: Math.max(0, Date.now() - meta.createdAt),
      dossier: display.__aceDossierDebug ? { ...display.__aceDossierDebug } : null,
      specialSignal: display.__specialEnemySignalDebug ? { ...display.__specialEnemySignalDebug } : null,
      bounds: typeof getBounds === 'function'
        ? getBounds(display)
        : this.getToastDisplayBounds(display)
    };
  }

  getToastDebugState(getBounds = null) {
    const describeVisibleTextNode = (node, id, type) => {
      if (!node || node.visible === false || node.alpha <= 0.05 || !String(node.text || '').trim()) return null;
      const bounds = typeof getBounds === 'function'
        ? getBounds(node)
        : this.getToastDisplayBounds(node);
      return {
        id,
        slot: 'hud',
        type,
        message: String(node.text || ''),
        bounds
      };
    };
    const scorePopups = (this.scorePopupManager?.popups || [])
      .map((popup, index) => {
        const sprite = popup?.sprite;
        if (!popup?.active || !sprite || sprite.visible === false || sprite.alpha <= 0.05) return null;
        const bounds = typeof getBounds === 'function'
          ? getBounds(sprite)
          : this.getToastDisplayBounds(sprite);
        return {
          id: `score-popup-${index}`,
          slot: 'floating',
          type: 'score_popup',
          message: String(sprite.text || ''),
          bounds
        };
      })
      .filter(Boolean);
    return {
      active: [
        this.describeToastDisplay(this.activeBossIntroCard, getBounds),
        this.describeToastDisplay(this.activeCenterToast, getBounds),
        this.describeToastDisplay(this.activeTopToast, getBounds),
        this.describeToastDisplay(this.activeCornerToast, getBounds)
      ].filter(Boolean),
      comboDisplay: null,
      scorePopups,
      achievement: this.activeAchievementToast ? {
        id: this.activeAchievementToast.__achievementToastId,
        queued: this.achievementToastQueue.length,
        bounds: typeof getBounds === 'function' ? getBounds(this.activeAchievementToast) : this.getToastDisplayBounds(this.activeAchievementToast)
      } : {
        id: null,
        queued: this.achievementToastQueue.length,
        bounds: null
      },
      firstRunOnboarding: {
        introActive: Boolean(this.introActive),
        complete: Boolean(this.firstRunOnboardingComplete),
        controlsShownAt: Number(this.firstRunControlsShownAt) || 0,
        remainingMs: Math.max(0, (Number(this.firstRunOnboardingUntil) || 0) - Date.now())
      },
      progressionPresentation: {
        pendingRank: this.pendingRankUpPresentation !== null
          && this.pendingRankUpPresentation !== undefined
          && Number.isFinite(Number(this.pendingRankUpPresentation))
          ? Number(this.pendingRankUpPresentation)
          : null,
        rankUpActive: Boolean(this.activeRankUpPresentation?.parent),
        waveBonusActive: Boolean(this.activeWaveBonusEffect?.parent)
      },
      queued: {
        center: this.toastQueue.length,
        top: this.toastTopQueue.length,
        corner: this.toastCornerQueue.length
      },
      lockedMs: {
        center: Math.max(0, this.getToastSlotLockUntil('center') - Date.now()),
        top: Math.max(0, this.getToastSlotLockUntil('top') - Date.now()),
        corner: Math.max(0, this.getToastSlotLockUntil('corner') - Date.now())
      }
    };
  }

  initLoreBag() {
    const pool = getAllNewPhrases();
    const unique = Array.from(new Set(pool.filter(Boolean)));
    this.loreBag = this.shuffleArray(unique);
    this.loreBagIndex = 0;
    if (this.lastLoreLine && this.loreBag.length > 1 && this.loreBag[0] === this.lastLoreLine) {
      const swapIndex = 1;
      [this.loreBag[0], this.loreBag[swapIndex]] = [this.loreBag[swapIndex], this.loreBag[0]];
    }
  }

  getNextLoreLine() {
    if (!this.loreBag.length || this.loreBagIndex >= this.loreBag.length) {
      this.initLoreBag();
    }
    const idx = this.loreBagIndex;
    const line = this.loreBag[idx];
    this.loreBagIndex += 1;
    this.lastLoreLine = line;
    const remaining = this.loreBag.length - this.loreBagIndex;
    console.log(`[Lore] picked idx=${idx} remaining=${remaining} text="${line}"`);
    return line;
  }

  showLoreBanner(text, options = {}) {
    if (!text) return false;
    if (!options.force && !this.canShowLore()) return false;
    const duration = Number.isFinite(options.duration) ? options.duration : 2500 + Math.random() * 1000;
    const compactHud = this.game.getWidth() < 620;
    const y = compactHud
      ? Math.min(this.game.getHeight() - 170, Math.max(220, this.game.getHeight() * 0.32))
      : Math.max(240, this.game.getHeight() * 0.32);
    this.enqueueToast(text, {
      fontSize: compactHud ? 17 : 18,
      fill: '#ffffff',
      duration,
      slot: 'top',
      type: 'lore',
      banner: true,
      title: options.title || 'QUIET SIGNAL',
      imageAlias: options.imageAlias || null,
      accent: options.accent,
      align: compactHud ? 'center' : 'right',
      y,
      maxWidth: Number.isFinite(options.maxWidth)
        ? options.maxWidth
        : compactHud
        ? this.game.getWidth() * 0.78
        : Math.min(360, this.game.getWidth() * 0.32)
    });
    return true;
  }

  canShowLore() {
    const now = Date.now();
    if (now - this.lastLoreAt < this.loreCooldownMs) return false;
    if (this.activeBossIntroCard || this.activeCenterToast) return false;
    if (this.activeTopToast) return false;
    if (now < this.centerToastLockUntil) return false;
    if (now - this.lastMajorToastAt < this.majorToastCooldownMs) return false;
    const hasMajorQueued = this.toastQueue.some(entry =>
      ['rank_up', 'level_up', 'rank_boost'].includes(entry.options?.type)
    );
    return !hasMajorQueued;
  }

  shuffleArray(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  createAceContactDossier(options = {}, layout = {}) {
    const data = options.aceDossier || {};
    const width = Math.max(1, Number(layout.width) || this.game.getWidth());
    const height = Math.max(1, Number(layout.height) || this.game.getHeight());
    const compact = width < 900 || height < 700;
    const edgeAligned = options.edgeAligned === true && !compact;
    const accentColor = Number.isFinite(Number(options.accent)) ? Number(options.accent) : 0xffd15c;
    const secondaryAccent = Number.isFinite(Number(options.secondaryAccent)) ? Number(options.secondaryAccent) : 0x7df9ff;
    const requestedMaxWidth = Math.max(320, Number(layout.maxWidth) || width * 0.82);
    const panelWidth = Math.min(width - 32, requestedMaxWidth, compact ? 460 : 500);
    const panelHeight = compact ? 108 : 114;
    const glyphColumnWidth = compact ? 64 : 74;
    const textLeft = -panelWidth / 2 + glyphColumnWidth;
    const textWidth = Math.max(220, panelWidth - glyphColumnWidth - (compact ? 18 : 24));
    const dossier = new PIXI.Container();
    dossier.label = 'ace_contact_dossier';
    dossier.eventMode = 'none';
    dossier.interactive = false;

    const burst = new PIXI.Graphics();
    burst.blendMode = 'add';
    const reticleRadius = compact ? 23 : 28;
    burst.x = -panelWidth / 2 + (compact ? 36 : 44);
    burst.y = -4;
    burst.circle(0, 0, reticleRadius);
    burst.stroke({ color: secondaryAccent, width: 2, alpha: 0.66 });
    burst.circle(0, 0, reticleRadius - 8);
    burst.stroke({ color: accentColor, width: 1.2, alpha: 0.42 });
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI * 0.5;
      burst.moveTo(Math.cos(angle) * (reticleRadius - 4), Math.sin(angle) * (reticleRadius - 4));
      burst.lineTo(Math.cos(angle) * (reticleRadius + 8), Math.sin(angle) * (reticleRadius + 8));
    }
    burst.stroke({ color: 0xffffff, width: 2.4, alpha: 0.72 });

    const outerGlow = new PIXI.Graphics();
    outerGlow.roundRect(-panelWidth / 2 - 5, -panelHeight / 2 - 5, panelWidth + 10, panelHeight + 10, 15);
    outerGlow.fill({ color: accentColor, alpha: 0.07 });
    outerGlow.stroke({ color: secondaryAccent, width: 3, alpha: 0.13 });
    dossier.addChild(outerGlow);

    const panel = new PIXI.Graphics();
    panel.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 11);
    panel.fill({ color: 0x050914, alpha: 0.93 });
    panel.stroke({ color: accentColor, width: 2.2, alpha: 0.9 });
    panel.roundRect(-panelWidth / 2 + 6, -panelHeight / 2 + 6, panelWidth - 12, panelHeight - 12, 7);
    panel.stroke({ color: secondaryAccent, width: 1, alpha: 0.34 });
    dossier.addChild(panel);

    const rails = new PIXI.Graphics();
    rails.blendMode = 'add';
    rails.rect(-panelWidth / 2 + 14, -panelHeight / 2 + 7, panelWidth * 0.3, 2);
    rails.fill({ color: accentColor, alpha: 0.82 });
    rails.rect(panelWidth / 2 - panelWidth * 0.22 - 14, panelHeight / 2 - 9, panelWidth * 0.22, 2);
    rails.fill({ color: secondaryAccent, alpha: 0.62 });
    rails.moveTo(-panelWidth / 2 + glyphColumnWidth - 10, -panelHeight / 2 + 16);
    rails.lineTo(-panelWidth / 2 + glyphColumnWidth - 10, panelHeight / 2 - 16);
    rails.stroke({ color: secondaryAccent, width: 1.2, alpha: 0.28 });
    dossier.addChild(rails);
    dossier.addChild(burst);

    const fit = (node, maxWidth, minScale = 0.74) => {
      node.scale.set(1);
      if (node.width > maxWidth) node.scale.set(Math.max(minScale, maxWidth / node.width));
      return node;
    };
    const addLine = (text, style, y, maxLineWidth = textWidth, minScale = 0.74) => {
      const node = createText(String(text || ''), style);
      node.anchor.set(0, 0.5);
      node.x = textLeft;
      node.y = y;
      fit(node, maxLineWidth, minScale);
      dossier.addChild(node);
      return node;
    };
    const addPill = (text, x, y, maxWidth, color) => {
      const node = createText(String(text || ''), {
        fontFamily: FONT_BODY,
        fontSize: compact ? 11 : 12,
        fontWeight: '900',
        fill: '#ffffff',
        stroke: '#020812',
        strokeThickness: 2
      });
      node.anchor.set(0, 0.5);
      fit(node, Math.max(70, maxWidth - 14), 0.68);
      node.x = x + 7;
      node.y = y;
      const background = new PIXI.Graphics();
      const pillWidth = Math.min(maxWidth, node.width + 14);
      background.roundRect(x, y - (compact ? 10 : 11), pillWidth, compact ? 20 : 22, 6);
      background.fill({ color, alpha: 0.16 });
      background.stroke({ color, width: 1.1, alpha: 0.62 });
      dossier.addChild(background, node);
      return { node, width: pillWidth };
    };

    const titleFontSize = compact ? 10 : 11;
    const primaryFontSize = compact ? 23 : 27;
    const actionFontSize = compact ? 12 : 13;
    const titleY = -panelHeight / 2 + 14;
    const primaryY = -panelHeight / 2 + (compact ? 35 : 37);
    const actionY = -panelHeight / 2 + (compact ? 58 : 61);
    const pillsY = -panelHeight / 2 + (compact ? 84 : 89);

    const title = addLine(data.title, {
      fontFamily: FONT_DISPLAY,
      fontSize: titleFontSize,
      fontWeight: '900',
      fill: '#7ee9ff',
      letterSpacing: compact ? 1.2 : 1.8,
      stroke: '#02131f',
      strokeThickness: 2
    }, titleY);
    const primary = addLine(data.primary, {
      fontFamily: FONT_DISPLAY,
      fontSize: primaryFontSize,
      fontWeight: '900',
      fill: '#fff7c4',
      stroke: '#24000c',
      strokeThickness: compact ? 4 : 5,
      dropShadow: true,
      dropShadowColor: `#${accentColor.toString(16).padStart(6, '0')}`,
      dropShadowBlur: compact ? 6 : 8,
      dropShadowDistance: 0
    }, primaryY, textWidth, 0.82);
    const action = addLine(data.action, {
      fontFamily: FONT_BODY,
      fontSize: actionFontSize,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#02131f',
      strokeThickness: 3,
      letterSpacing: compact ? 0.2 : 0.6
    }, actionY, textWidth, 0.76);
    const pillMaxWidth = Math.max(90, (textWidth - 8) / 2);
    const rewardPill = addPill(data.reward, textLeft, pillsY, pillMaxWidth, accentColor);
    const dangerPill = addPill(data.danger, textLeft + pillMaxWidth + 8, pillsY, pillMaxWidth, secondaryAccent);
    const requestedY = Number(layout.y) || height * 0.28;
    const augmentBounds = this.getVisibleHudBounds(this.hud?.tacticalAugmentGroup);
    const dossierX = edgeAligned ? panelWidth / 2 + 18 : width / 2;
    const overlapsAugmentColumns = augmentBounds
      && dossierX + panelWidth / 2 >= augmentBounds.x
      && dossierX - panelWidth / 2 <= augmentBounds.x + augmentBounds.width;
    const augmentSafeY = overlapsAugmentColumns
      ? augmentBounds.y + augmentBounds.height + panelHeight / 2 + 14
      : 0;
    const bottomSafeMargin = compact ? 10 : 28;
    const topSafeY = panelHeight / 2 + (compact ? 160 : 108);
    dossier.x = dossierX;
    dossier.y = Math.min(
      height - panelHeight / 2 - bottomSafeMargin,
      Math.max(topSafeY, requestedY, augmentSafeY)
    );
    dossier.alpha = 0;
    dossier.scale.set(0.94);
    dossier.__aceDossierFx = { burst, outerGlow };
    dossier.__aceDossierDebug = {
      compact,
      panelWidth: Math.round(panelWidth),
      panelHeight: Math.round(panelHeight),
      screenAreaRatio: Number(((panelWidth * panelHeight) / (width * height)).toFixed(4)),
      edgeAligned,
      placement: edgeAligned ? 'left-edge' : 'upper-center-edge-safe',
      x: Math.round(dossier.x),
      y: Math.round(dossier.y),
      augmentSafeY: Math.round(augmentSafeY),
      avoidsAugmentTray: !overlapsAugmentColumns || dossier.y - panelHeight / 2 >= augmentBounds.y + augmentBounds.height + 10,
      title: String(data.title || ''),
      primary: String(data.primary || ''),
      action: String(data.action || ''),
      reward: String(data.reward || ''),
      danger: String(data.danger || ''),
      protocol: String(data.protocol || ''),
      wing: String(data.wing || ''),
      detailsCollapsed: true,
      titleFontSize,
      primaryFontSize,
      actionFontSize,
      titleScale: Number(title.scale.x.toFixed(3)),
      primaryScale: Number(primary.scale.x.toFixed(3)),
      actionScale: Number(action.scale.x.toFixed(3)),
      rewardScale: Number(rewardPill.node.scale.x.toFixed(3)),
      dangerScale: Number(dangerPill.node.scale.x.toFixed(3))
    };
    this.uiOverlay.addChild(dossier);
    return dossier;
  }

  getVisibleHudBounds(node) {
    if (!node || node.visible === false || node.alpha <= 0.05 || !node.getBounds) return null;
    try {
      const bounds = node.getBounds();
      if (!Number.isFinite(bounds?.x) || !Number.isFinite(bounds?.y) || bounds.width <= 0 || bounds.height <= 0) return null;
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    } catch {
      return null;
    }
  }

  showToastNow(message, options, slot) {
    const { width, height } = this.game.app.screen;
    const fontSize = options.fontSize || (slot === 'corner' ? 16 : 24);
    const maxWidth = Number.isFinite(options.maxWidth)
      ? options.maxWidth
      : (slot === 'corner' ? width * 0.45 : slot === 'top' ? width * 0.7 : width * 0.9);
    const defaultY = slot === 'corner'
      ? height * 0.12
      : slot === 'top'
      ? Math.max(96, height * 0.13)
      : Math.max(178, height * 0.28);
    const requestedY = Number.isFinite(options.y) ? options.y : defaultY;
    const hudSafeY = slot === 'corner' && options.avoidHud !== false
      ? this.getCornerToastSafeY(message, fontSize)
      : requestedY;
    const y = slot === 'corner'
      ? Math.min(height - 80, Math.max(requestedY, hudSafeY, 156))
      : requestedY;

    let display = null;
    if (options.type === 'aceContact' && options.aceDossier) {
      display = this.createAceContactDossier(options, { width, height, maxWidth, y });
    } else if (options.banner) {
      const runContractBanner = options.type === 'runContract'
        || options.type === 'runContractStart'
        || options.type === 'runContractProgress'
        || options.type === 'firstRunControls';
      const specialEnemySignal = options.specialEnemySignal === true;
      const banner = new PIXI.Container();
      const bannerText = createText(message, {
        fontFamily: runContractBanner ? '"Rajdhani", "Segoe UI Semibold", "Segoe UI", sans-serif' : 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize,
        fontWeight: runContractBanner ? '600' : specialEnemySignal ? '800' : 'bold',
        fill: options.fill || '#ffffff',
        stroke: runContractBanner || specialEnemySignal ? '#02131f' : '#000000',
        strokeThickness: runContractBanner ? 0.75 : specialEnemySignal ? 2 : 4,
        align: 'left',
        wordWrap: true,
        wordWrapWidth: maxWidth * 0.6,
        lineHeight: fontSize + (runContractBanner ? 8 : 6)
      });
      bannerText.anchor.set(0, 0.5);

      const paddingX = runContractBanner ? 26 : specialEnemySignal ? 20 : 24;
      const paddingY = runContractBanner ? 18 : specialEnemySignal ? 13 : 16;
      const minFontSize = runContractBanner ? (width < 620 ? 13 : 15) : specialEnemySignal ? 13 : 16;
      const maxTextHeight = options.type === 'lore' ? 106 : (runContractBanner ? 132 : specialEnemySignal ? 74 : 80);

      const commsPortraits = Object.keys(GameAssets.commsPortraits || {});
      const requestedAvatar = options.imageAlias && GameAssets.isValidTexture(GameAssets.getCommsPortrait(options.imageAlias))
        ? options.imageAlias
        : null;
      const allowAvatar = options.showAvatar !== false;
      const hasAvatar = allowAvatar && (Boolean(requestedAvatar) || commsPortraits.length > 0);
      const avatarSize = options.type === 'lore' ? 54 : 44;
      const avatarSlot = hasAvatar ? avatarSize + 16 : 0;
      const contentWidth = Math.max(140, maxWidth - paddingX * 2 - avatarSlot);
      bannerText.style.wordWrapWidth = contentWidth;
      if (bannerText.updateText) bannerText.updateText(false);

      while (bannerText.height > maxTextHeight && bannerText.style.fontSize > minFontSize) {
        bannerText.style.fontSize -= 2;
        bannerText.style.lineHeight = bannerText.style.fontSize + (runContractBanner ? 8 : 6);
        if (bannerText.updateText) bannerText.updateText(false);
      }

      if (bannerText.height > maxTextHeight) {
        const raw = message.trim();
        let trimmed = raw;
        let guard = 0;
        while (trimmed.length > 10 && bannerText.height > maxTextHeight && guard < 40) {
          trimmed = trimmed.slice(0, -4).trimEnd();
          bannerText.text = `${trimmed}...`;
          if (bannerText.updateText) bannerText.updateText(false);
          guard += 1;
        }
      }

      const panelWidth = Math.min(maxWidth, bannerText.width + paddingX * 2 + avatarSlot);
      const panelHeight = Math.max(52, bannerText.height + paddingY * 2);
      const panel = new PIXI.Graphics();
      panel.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, specialEnemySignal ? 8 : 14);
      panel.fill({
        color: options.type === 'lore' ? 0x05121c : (runContractBanner || specialEnemySignal ? 0x031321 : 0x111111),
        alpha: options.type === 'lore' ? 0.78 : (runContractBanner ? 0.94 : specialEnemySignal ? 0.9 : 0.88)
      });
      panel.stroke({
        color: options.type === 'lore' || runContractBanner || specialEnemySignal ? (options.accent || 0x6fe7ff) : 0xffff00,
        width: options.type === 'lore' ? 1.5 : (runContractBanner ? 3.5 : specialEnemySignal ? 2.2 : 3),
        alpha: options.type === 'lore' ? 0.78 : 1
      });

      const accent = new PIXI.Graphics();
      accent.roundRect(-panelWidth / 2 + 6, -panelHeight / 2 + 6, panelWidth - 12, panelHeight - 12, specialEnemySignal ? 5 : 10);
      accent.stroke({
        color: runContractBanner ? 0xffef7e : specialEnemySignal ? 0x7ee9ff : 0xff66cc,
        width: runContractBanner ? 1.4 : specialEnemySignal ? 1.1 : 1,
        alpha: runContractBanner ? 0.82 : specialEnemySignal ? 0.46 : 0.7
      });

      const noise = new PIXI.Graphics();
      for (let i = 0; i < (specialEnemySignal ? 8 : 24); i++) {
        const nx = -panelWidth / 2 + 10 + Math.random() * (panelWidth - 20);
        const ny = -panelHeight / 2 + 10 + Math.random() * (panelHeight - 20);
        noise.circle(nx, ny, 1.2);
      }
      noise.fill({ color: 0xffffff, alpha: 0.08 });

      banner.addChild(panel);
      banner.addChild(accent);
      banner.addChild(noise);
      banner.addChild(bannerText);

      bannerText.x = -panelWidth / 2 + paddingX + avatarSlot;
      bannerText.y = options.title ? 10 : 0; // Shift down if title

      // TASK 3: Add Title Label if present
      if (options.title) {
        const titleLabel = createText(String(options.title).toUpperCase(), {
          fontFamily: runContractBanner ? '"Rajdhani", "Segoe UI Semibold", "Segoe UI", sans-serif' : 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: options.type === 'lore' ? 12 : (runContractBanner ? 11 : specialEnemySignal ? 11 : 14),
          fill: options.type === 'lore' ? '#7ee9ff' : (runContractBanner ? '#ffef7e' : specialEnemySignal ? `#${(Number(options.accent) || 0xffd15c).toString(16).padStart(6, '0')}` : '#ffff00'),
          fontWeight: runContractBanner ? '600' : 'bold',
          stroke: runContractBanner ? '#02131f' : '#000000',
          strokeThickness: options.type === 'lore' ? 2 : (runContractBanner ? 0.75 : 3)
        });
        titleLabel.anchor.set(0, 0.5);
        titleLabel.x = bannerText.x;
        titleLabel.y = -panelHeight / 2 + 16;
        banner.addChild(titleLabel);
      }

      if (hasAvatar) {
        const pick = requestedAvatar || commsPortraits[Math.floor(Math.random() * commsPortraits.length)];
        const tex = GameAssets.getCommsPortrait(pick);
        if (GameAssets.isValidTexture(tex)) {
          const sticker = new PIXI.Sprite(tex);
          sticker.anchor.set(0.5);
          sticker.width = avatarSize;
          sticker.height = avatarSize;
          sticker.x = -panelWidth / 2 + paddingX + avatarSlot / 2;
          sticker.y = 0;
          sticker.alpha = options.type === 'lore' ? 0.92 : 0.85;
          banner.addChild(sticker);
        }
      }

      if (options.align === 'right') {
        banner.x = width - panelWidth / 2 - 18;
      } else if (options.align === 'left') {
        banner.x = panelWidth / 2 + 18;
      } else {
        banner.x = width / 2;
      }
      banner.y = y;
      banner.alpha = 0;
      if (specialEnemySignal) {
        banner.__specialEnemySignalDebug = {
          edgeAligned: options.edgeAligned === true,
          placement: options.placement || null,
          align: options.align || 'center',
          panelWidth: Math.round(panelWidth),
          panelHeight: Math.round(panelHeight),
          avatarVisible: hasAvatar,
          title: String(options.title || ''),
          message: String(message)
        };
      }
      display = banner;
      this.uiOverlay.addChild(banner);
    } else {
      const type = options.type || 'generic';
      const isMajorSignal = ['boss', 'level_clear', 'level_up', 'rank_up', 'run_clear', 'score_boost', 'unlock'].includes(type);
      const accentColor = Number.isFinite(Number(options.accent))
        ? Number(options.accent)
        : type === 'boss'
          ? 0xff3d3d
          : type === 'score_boost'
            ? 0xfff45c
            : type === 'repair'
              ? 0x66ff99
              : 0x2ff6ff;
      const accentHex = `#${accentColor.toString(16).padStart(6, '0')}`;
      const useSignalPlate = slot !== 'corner' && (
        options.signalPlate === true ||
        isMajorSignal ||
        (slot === 'top' && type !== 'generic')
      );
      const textMaxWidth = slot === 'corner'
        ? maxWidth
        : Math.max(160, maxWidth - (slot === 'top' ? 46 : 58));
      const text = createText(message, {
        fontFamily: isMajorSignal ? FONT_DISPLAY : FONT_BODY,
        fontSize,
        fontWeight: isMajorSignal ? '900' : '800',
        fill: options.fill || (isMajorSignal ? '#fff7c4' : '#f1fbff'),
        stroke: options.stroke || (type === 'boss' ? '#200008' : '#02131f'),
        strokeThickness: Number.isFinite(Number(options.strokeThickness))
          ? Number(options.strokeThickness)
          : (isMajorSignal ? 4 : 3),
        align: 'center',
        wordWrap: true,
        wordWrapWidth: textMaxWidth,
        lineHeight: Math.round(fontSize + (isMajorSignal ? 7 : 6)),
        dropShadow: true,
        dropShadowColor: options.dropShadowColor || accentHex,
        dropShadowBlur: Number.isFinite(Number(options.dropShadowBlur))
          ? Number(options.dropShadowBlur)
          : (isMajorSignal ? 8 : 5),
        dropShadowDistance: 0
      });

      const minFontSize = slot === 'top' ? 13 : 15;
      const maxTextHeight = slot === 'top'
        ? Math.min(84, height * 0.16)
        : Math.min(122, height * 0.2);
      while (slot !== 'corner' && text.height > maxTextHeight && text.style.fontSize > minFontSize) {
        text.style.fontSize -= 1;
        text.style.lineHeight = Math.round(text.style.fontSize + (isMajorSignal ? 7 : 6));
        text.style.wordWrapWidth = textMaxWidth;
        text.updateText?.(false);
      }

      if (slot === 'corner' || !useSignalPlate) {
        text.anchor.set(1, 0.5);
        text.x = slot === 'corner' ? width - 16 : width / 2;
        text.y = y;
        text.alpha = 0;
        if (slot !== 'corner') text.anchor.set(0.5);

        if (text.width > maxWidth) {
          const scale = maxWidth / text.width;
          text.scale.set(scale);
        }

        this.container.addChild(text);
        display = text;
      } else {
        const plate = new PIXI.Container();
        plate.label = `ui_${slot}_signal_toast`;
        plate.eventMode = 'none';
        plate.interactive = false;
        const paddingX = slot === 'top' ? 23 : 29;
        const paddingY = slot === 'top' ? 12 : 16;
        const minPlateWidth = slot === 'top' ? 244 : 322;
        const panelWidth = Math.min(width - 28, Math.max(minPlateWidth, Math.min(maxWidth, text.width + paddingX * 2)));
        const panelHeight = Math.max(slot === 'top' ? 48 : 62, text.height + paddingY * 2);
        const radius = slot === 'top' ? 7 : 9;

        const panel = new PIXI.Graphics();
        panel.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, radius);
        panel.fill({ color: type === 'boss' ? 0x10070b : 0x04101a, alpha: slot === 'top' ? 0.84 : 0.9 });
        panel.stroke({ color: accentColor, width: isMajorSignal ? 2.4 : 1.8, alpha: isMajorSignal ? 0.9 : 0.72 });
        panel.roundRect(-panelWidth / 2 + 7, -panelHeight / 2 + 7, panelWidth - 14, panelHeight - 14, Math.max(3, radius - 3));
        panel.stroke({ color: 0xffffff, width: 0.8, alpha: 0.13 });
        plate.addChild(panel);

        const rails = new PIXI.Graphics();
        rails.blendMode = 'add';
        rails.rect(-panelWidth / 2 + 13, -panelHeight / 2 + 8, panelWidth - 26, 2);
        rails.fill({ color: accentColor, alpha: isMajorSignal ? 0.46 : 0.32 });
        rails.rect(-panelWidth / 2 + 13, panelHeight / 2 - 10, panelWidth - 26, 2);
        rails.fill({ color: type === 'boss' ? 0xfff45c : 0x7ee9ff, alpha: isMajorSignal ? 0.28 : 0.18 });
        for (const side of [-1, 1]) {
          const x = side * (panelWidth / 2 - 18);
          rails.moveTo(x, -panelHeight / 2 + 12);
          rails.lineTo(x + side * -14, -panelHeight / 2 + 12);
          rails.moveTo(x, panelHeight / 2 - 12);
          rails.lineTo(x + side * -14, panelHeight / 2 - 12);
        }
        rails.stroke({ color: 0xffffff, width: 1.4, alpha: 0.34 });
        plate.addChild(rails);

        text.anchor.set(0.5);
        text.x = 0;
        text.y = 0;
        plate.addChild(text);

        plate.x = width / 2;
        plate.y = Math.min(height - panelHeight / 2 - 28, Math.max(panelHeight / 2 + 28, y));
        plate.alpha = 0;
        display = plate;
        this.uiOverlay.addChild(plate);
      }
    }

    const baseDuration = Number.isFinite(Number(options.duration))
      ? Number(options.duration)
      : (slot === 'corner' ? 1800 : 2200);
    const extraReadTimeMs = Number.isFinite(Number(options.extraReadTimeMs))
      ? Number(options.extraReadTimeMs)
      : GAMEPLAY_MESSAGE_EXTRA_READ_MS;
    const duration = Math.max(0, baseDuration + Math.max(0, extraReadTimeMs));
    const now = Date.now();
    const minVisibleMs = Math.max(0, Math.min(duration, Number(options.minVisibleMs) || 0));
    display.__toastMeta = {
      message,
      type: options.type || 'generic',
      slot,
      priority: Number.isFinite(options.priority) ? options.priority : 0,
      duration,
      title: options.title || null,
      imageAlias: options.imageAlias || null,
      combatRelocated: options.combatRelocated === true,
      edgeAligned: options.edgeAligned === true,
      placement: options.placement || null,
      duplicateKey: options.duplicateKey || this.getToastDuplicateKey(message, options.type || 'generic'),
      originalOptions: { ...options },
      createdAt: now,
      protectedUntil: now + minVisibleMs
    };
    options.onShown?.({ display, shownAt: now, duration });

    const majorTypes = ['boss', 'level_clear', 'rank_up', 'level_up', 'rank_boost'];
    if (majorTypes.includes(options.type)) {
      this.lastMajorToastAt = now;
    }
    if (slot === 'center' && majorTypes.includes(options.type)) {
      this.centerToastLockUntil = Math.max(this.centerToastLockUntil, now + duration);
    }
    if (options.type === 'lore') {
      this.lastLoreAt = now;
    }
    console.log(`[Toast] show type=${options.type} ms=${duration} slot=${slot}`);

    let elapsed = 0;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;

      const aceFx = display.__aceDossierFx;
      if (aceFx) {
        const pulse = Math.sin(elapsed * 0.008) * 0.5 + 0.5;
        aceFx.burst.alpha = 0.76 + pulse * 0.16;
        aceFx.outerGlow.alpha = 0.78 + pulse * 0.12;
      }

      const introDuration = options.aceDossier ? 180 : 250;
      if (elapsed < introDuration) {
        display.alpha = elapsed / introDuration;
        if (options.banner || options.aceDossier) {
          const t = elapsed / introDuration;
          const startScale = options.aceDossier ? 0.94 : 0.88;
          display.scale.set(startScale + t * (1 - startScale));
        }
      } else if (elapsed > duration - 350) {
        display.alpha = Math.max(0, (duration - elapsed) / 350);
      } else {
        display.alpha = 1;
      }

      if (elapsed >= duration) {
        this.game.app.ticker.remove(ticker);
        if (display.parent) display.parent.removeChild(display);
        if (slot === 'corner' && this.activeCornerToast === display) {
          this.activeCornerToast = null;
        } else if (slot === 'top' && this.activeTopToast === display) {
          this.activeTopToast = null;
        } else if (this.activeCenterToast === display) {
          this.activeCenterToast = null;
        }
        this.processToastQueue();
      }
    };
    display.__toastTicker = ticker;
    this.game.app.ticker.add(ticker);
    return display;
  }

  getCornerToastSafeY(message = '', fontSize = 16) {
    const width = Math.max(1, Number(this.game?.getWidth?.()) || Number(this.game?.app?.screen?.width) || 1280);
    const height = Math.max(1, Number(this.game?.getHeight?.()) || Number(this.game?.app?.screen?.height) || 720);
    const rightHudNodes = [
      this.hud?.livesGroup,
      this.hud?.locationText,
      this.hud?.activePowerupGroup,
      this.hud?.traitGroup
    ];
    let rightHudBottom = 0;
    for (const node of rightHudNodes) {
      if (!node || node.visible === false || node.alpha <= 0.05 || !node.getBounds) continue;
      try {
        const bounds = node.getBounds();
        if (bounds.x + bounds.width < width * 0.5) continue;
        rightHudBottom = Math.max(rightHudBottom, bounds.y + bounds.height);
      } catch {
        // A destroyed HUD node should not block the toast queue.
      }
    }
    const lineCount = Math.max(1, String(message || '').split('\n').length);
    const estimatedHalfHeight = lineCount * (Math.max(10, Number(fontSize) || 16) + 6) * 0.5;
    return Math.min(height - 80, Math.max(156, rightHudBottom + estimatedHalfHeight + 12));
  }

  createSynergyBadge() {
    if (!this.synergyBadge) {
      this.synergyBadge = createText('', {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: 16,
        fill: '#ffff00',
        stroke: '#000000',
        strokeThickness: 3
      });
      this.synergyBadge.anchor.set(0.5);
      this.synergyBadge.visible = false;
      this.uiOverlay.addChild(this.synergyBadge);
    }
    const { width, height } = this.game.app.screen;
    this.synergyBadge.x = width * 0.82;
    this.synergyBadge.y = height * 0.1;
  }

  setSynergyBadge(text) {
    if (!this.synergyBadge) return;
    if (!text) {
      this.synergyBadge.visible = false;
      return;
    }
    this.synergyBadge.text = text;
    this.synergyBadge.visible = true;
  }

  recordThreatDiscovery(id, category, metadata = {}, options = {}) {
    if (!RunPacingConfig.threatCodexEnabled || !id || !category) return null;
    if (this.game?.isDailySignalRun?.()) {
      return { item: null, isNew: false, skipped: 'daily_signal_no_codex_progress' };
    }
    const isRankedRun = Boolean(this.game?.isRankedRun?.());
    const result = recordThreatSeen(id, category, metadata);
    if (!result?.isNew) return result;

    if (!isRankedRun) {
      return result;
    }

    const bonus = category === 'runThemes'
      ? RunPacingConfig.discovery.firstRunThemeBonus
      : category === 'cabinetLogs'
        ? (RunPacingConfig.discovery.cabinetLogBonus || RunPacingConfig.discovery.firstSeenBonus)
        : RunPacingConfig.discovery.firstSeenBonus;
    const appliedBonus = options.scoreBonus === false ? 0 : this.game.addScore(bonus, 'discoveryBonus');
    this.discoveryBonus = (Number(this.discoveryBonus) || 0) + appliedBonus;
    result.appliedBonus = appliedBonus;
    if (!options.silent && category !== 'cabinetLogs') {
      this.triggerCabinetLog('codex-discovery', {
        name: metadata.name || metadata.label || id,
        source: `codex:${category}`
      });
    }
    if (options.silent) return result;
    const label = String(metadata.name || metadata.label || id).replace(/_/g, ' ').toUpperCase();
    this.enqueueToast(`${translateText('NEW THREAT SCANNED')}: ${label}\n${translateText('THREAT CODEX UPDATED')} +${appliedBonus}`, {
      fontSize: this.game.getWidth() < 620 ? 14 : 17,
      fill: '#7dffcc',
      stroke: '#001616',
      strokeThickness: 2,
      slot: 'corner',
      type: 'discovery',
      duration: RunPacingConfig.discovery.toastDurationMs,
      priority: 1,
      maxWidth: this.game.getWidth() * (this.game.getWidth() < 620 ? 0.72 : 0.38)
    });
    return result;
  }

  createThreatDefeatSeenKeyCache() {
    const seen = new Set();
    if (!RunPacingConfig.threatCodexEnabled || !this.game?.isRankedRun?.()) return seen;
    try {
      const items = readThreatDiscoveryState()?.items || {};
      for (const category of ['enemies', 'elites', 'bosses']) {
        const bucket = items[category] || {};
        for (const [id, item] of Object.entries(bucket)) {
          if ((Number(item?.timesDefeated) || 0) > 0) seen.add(`${category}:${id}`);
        }
      }
    } catch (error) {
      console.warn('[ThreatDiscoveryState] Failed to warm defeat cache:', error);
    }
    return seen;
  }

  queueThreatDefeat(id, category, metadata = {}, options = {}) {
    if (!RunPacingConfig.threatCodexEnabled || !id || !category) return null;
    if (!this.game?.isRankedRun?.()) return null;

    const key = `${category}:${String(id)}`;
    if (!this.threatDefeatSeenKeys) this.threatDefeatSeenKeys = this.createThreatDefeatSeenKeyCache();
    const isFirstDefeat = !this.threatDefeatSeenKeys.has(key);
    this.threatDefeatSeenKeys.add(key);
    this.deferredThreatDefeats.push({
      threatId: String(id),
      category,
      metadata
    });
    this.deferredThreatDefeatStats.queued += 1;

    if (isFirstDefeat) {
      const bonus = category === 'bosses'
        ? RunPacingConfig.discovery.firstBossDefeatBonus
        : RunPacingConfig.discovery.firstDefeatBonus;
      const scoreBonusEnabled = options.scoreBonus !== false;
      if (scoreBonusEnabled) {
        if (this.isCollisionHotPathActive) {
          this.deferHotPathScoreAward(bonus, category === 'bosses' ? 'bossBonus' : 'discoveryBonus');
        } else {
          const appliedBonus = this.game.addScore(bonus, category === 'bosses' ? 'bossBonus' : 'discoveryBonus');
          if (category !== 'bosses') this.discoveryBonus = (Number(this.discoveryBonus) || 0) + appliedBonus;
        }
      }
      this.deferredThreatDefeatStats.firstDefeats += 1;
      return {
        isFirstDefeat,
        appliedBonus: scoreBonusEnabled && !this.isCollisionHotPathActive ? bonus : 0,
        scoreBonusEnabled
      };
    }

    return { isFirstDefeat, appliedBonus: 0 };
  }

  processDeferredThreatDefeats(maxEntries = 40) {
    if (!this.deferredThreatDefeats?.length) return { flushed: 0, pending: 0, firstDefeats: 0 };
    const batchSize = Math.max(1, Math.floor(Number(maxEntries) || 1));
    const batch = this.deferredThreatDefeats.splice(0, batchSize);
    const result = recordThreatDefeatedBatch(batch);
    const firstDefeats = result.results?.filter((entry) => entry?.isFirstDefeat).length || 0;
    this.deferredThreatDefeatStats.flushed += batch.length;
    return {
      flushed: batch.length,
      pending: this.deferredThreatDefeats.length,
      firstDefeats
    };
  }

  deferHotPathScoreProgress(progress = {}) {
    const previous = this.deferredHotPathScoreProgress || {};
    this.deferredHotPathScoreProgress = {
      bestScore: Math.max(Number(previous.bestScore) || 0, Number(progress.bestScore) || 0),
      bestRank: Math.max(Number(previous.bestRank) || 0, Number(progress.bestRank) || 0),
      bestLevel: Math.max(Number(previous.bestLevel) || 0, Number(progress.bestLevel) || 0),
      bestSector: Math.max(Number(previous.bestSector) || 0, Number(progress.bestSector) || 0)
    };
  }

  deferHotPathScoreAward(points, source = 'baseScore') {
    const key = String(source || 'baseScore');
    this.deferredHotPathScoreAwards[key] = (Number(this.deferredHotPathScoreAwards[key]) || 0) + (Number(points) || 0);
  }

  requestDeferredLiveRankRefresh() {
    this.deferredLiveRankRefreshRequested = true;
  }

  requestDeferredScoreCueRefresh() {
    this.deferredScoreCueRefreshRequested = true;
  }

  flushDeferredRunContractProgress(force = false) {
    const pendingCompletions = Array.isArray(this.deferredRunContractCompletions)
      ? this.deferredRunContractCompletions.filter((entry) => entry?.id)
      : [];
    if (!this.runContractPersistenceDirty && pendingCompletions.length === 0) {
      return { flushed: false, dirty: false };
    }
    const now = Date.now();
    if (!force) {
      if (this.shouldDeferActiveGameplayPersistence()) {
        return {
          flushed: false,
          dirty: true,
          completions: pendingCompletions.length,
          deferred: true
        };
      }
      if (now - this.lastRunContractProgressWriteAt < DEFERRED_GAMEPLAY_PERSISTENCE_IDLE_MS) {
        return {
          flushed: false,
          dirty: true,
          completions: pendingCompletions.length,
          throttled: true
        };
      }
    }

    const previous = readHangarProgressState();
    let runContracts = previous.runContracts;
    for (const completion of pendingCompletions) {
      const beforeCompletion = runContracts;
      runContracts = recordRunContractCompletion(runContracts, completion);
      this.markRunContractAllCompleteTransition(beforeCompletion, runContracts, completion);
    }
    if (this.runContractSession) {
      runContracts = recordRunContractSessionProgress(runContracts, this.runContractSession);
    }
    writeHangarProgressState({
      ...previous,
      runContracts
    });
    this.deferredRunContractCompletions = [];
    this.runContractPersistenceDirty = false;
    this.lastRunContractProgressWriteAt = now;
    return {
      flushed: true,
      dirty: false,
      completions: pendingCompletions.length,
      sessionProgress: Boolean(this.runContractSession)
    };
  }

  flushDeferredHotPathProgress() {
    const measurePerformance = this.performanceDiagnostics?.measure?.bind(this.performanceDiagnostics) || ((_label, callback) => callback());
    const awards = this.deferredHotPathScoreAwards || {};
    this.deferredHotPathScoreAwards = {};
    for (const [source, points] of Object.entries(awards)) {
      if ((Number(points) || 0) > 0) {
        const applied = this.game?.addScore?.(points, source) || 0;
        if (source === 'discoveryBonus') this.discoveryBonus = (Number(this.discoveryBonus) || 0) + applied;
      }
    }

    const progress = this.deferredHotPathScoreProgress;
    this.deferredHotPathScoreProgress = null;
    if (progress && this.game?.canUnlockAchievementsForCurrentRun?.()) {
      updateHangarProgress(progress);
    }
    if (this.deferredLiveRankRefreshRequested) {
      this.deferredLiveRankRefreshRequested = false;
      measurePerformance('rank_highscore_cue_update.live_rank', () => this.game?.updateLiveRunRank?.({ force: true }));
    }
    if (this.deferredScoreCueRefreshRequested) {
      this.deferredScoreCueRefreshRequested = false;
      measurePerformance('rank_highscore_cue_update.global_leaderboard', () => this.game?.updateGlobalLeaderboardVoiceCues?.());
      measurePerformance('rank_highscore_cue_update.highscore_chase', () => this.game?.updateHighscoreChaseCues?.());
    }
    return {
      progressFlushed: Boolean(progress),
      liveRankRefreshed: !this.deferredLiveRankRefreshRequested,
      scoreCuesRefreshed: !this.deferredScoreCueRefreshRequested
    };
  }

  shouldDeferActiveGameplayPersistence() {
    const enemies = this.enemyManager?.enemies?.filter?.((enemy) => enemy?.active !== false).length || 0;
    const projectiles = (this.bulletManager?.playerBullets?.length || 0)
      + (this.bulletManager?.enemyBullets?.length || 0)
      + (this.bulletManager?.pendingEnemyBullets?.length || 0);
    const particles = this.particleManager?.particles?.length || 0;
    const combatText = (this.scorePopupManager?.popups?.length || 0)
      + (this.scorePopupManager?.pendingPopups?.length || 0);
    const playerFiring = Boolean(this.inputManager?.isFiring?.());
    const enemyState = this.enemyManager?.state || '';
    const activeCombatState = enemyState === 'WAVE_ACTIVE' || enemyState === 'BOSS_ACTIVE';
    if (!activeCombatState && !playerFiring && enemies <= 0 && projectiles <= 12) return false;
    return playerFiring || enemies > 0 || projectiles > 12 || particles > 18 || combatText > 3;
  }

  markSeasonProgressDirty() {
    this.seasonProgressDirty = true;
  }

  flushDeferredSeasonProgress(force = false) {
    if (!this.seasonProgressDirty) return { flushed: false, dirty: false };
    const now = Date.now();
    if (!force) {
      if (this.shouldDeferActiveGameplayPersistence()) {
        return { flushed: false, dirty: true, deferred: true };
      }
      if (now - this.lastSeasonProgressWriteAt < DEFERRED_GAMEPLAY_PERSISTENCE_IDLE_MS) {
        return { flushed: false, dirty: true, throttled: true };
      }
    }
    try {
      localStorage.setItem('burt_season_xp', String(this.seasonXp));
      localStorage.setItem('burt_season_unlocks', JSON.stringify(this.seasonUnlocks));
      this.seasonProgressDirty = false;
      this.lastSeasonProgressWriteAt = now;
      return { flushed: true, dirty: false };
    } catch {
      return { flushed: false, dirty: true, error: 'storage_unavailable' };
    }
  }

  flushDeferredCollisionUiFeedback() {
    const feedback = this.deferredCollisionUiFeedback || {};
    const activeEnemyCount = this.enemyManager?.enemies?.filter?.((enemy) => enemy?.active !== false).length || 0;
    const plasmaSweepLoad = this.player?.activePowerup?.type === 'plasma_lance' && activeEnemyCount >= 32;
    this.deferredCollisionUiFeedback = {
      toasts: [],
      screenShakes: [],
      playerExplosions: [],
      comboFlares: []
    };
    for (const toast of (feedback.toasts || []).slice(0, 1)) {
      if (toast?.message) this.enqueueToast(toast.message, toast.options || {});
    }
    for (const shake of (feedback.screenShakes || []).slice(0, plasmaSweepLoad ? 1 : 3)) {
      this.screenShake?.shake?.(shake.intensity, shake.duration);
    }
    if (!plasmaSweepLoad && !this.performanceDiagnostics?.options?.noParticles) {
      for (const entry of (feedback.playerExplosions || []).slice(0, 1)) {
        const x = Number.isFinite(entry?.x) ? entry.x : this.player?.x;
        const y = Number.isFinite(entry?.y) ? entry.y : this.player?.y;
        if (Number.isFinite(x) && Number.isFinite(y)) {
          this.particleManager?.createExplosion?.(x, y, entry.color, entry.intensity);
        }
      }
    }
    for (const flare of (feedback.comboFlares || []).slice(0, plasmaSweepLoad ? 0 : 2)) {
      this.triggerComboMilestoneFlare(flare);
    }
    return {
      toasts: feedback.toasts?.length || 0,
      screenShakes: feedback.screenShakes?.length || 0,
      playerExplosions: feedback.playerExplosions?.length || 0,
      comboFlares: feedback.comboFlares?.length || 0
    };
  }

  recordThreatDefeat(id, category, metadata = {}) {
    if (!RunPacingConfig.threatCodexEnabled || !id || !category) return null;
    const isRankedRun = Boolean(this.game?.isRankedRun?.());
    if (!isRankedRun) return null;
    const result = recordThreatDefeated(id, category, metadata);
    if (result?.isFirstDefeat) {
      const bonus = category === 'bosses'
        ? RunPacingConfig.discovery.firstBossDefeatBonus
        : RunPacingConfig.discovery.firstDefeatBonus;
      const appliedBonus = this.game.addScore(bonus, category === 'bosses' ? 'bossBonus' : 'discoveryBonus');
      if (category !== 'bosses') this.discoveryBonus = (Number(this.discoveryBonus) || 0) + appliedBonus;
    }
    return result;
  }

  playEnemyDeathFeedback(enemy, options = {}) {
    if (!enemy) return;
    const deathProfile = this.resolveEnemyDeathFeedbackProfile(enemy, options);
    const profile = deathProfile.sourceProfile || {};
    const lateMayhem = deathProfile.lateMayhem;
    const x = deathProfile.x;
    const y = deathProfile.y;
    const palette = deathProfile.palette;
    const baseColor = deathProfile.baseColor;
    const intensity = Number.isFinite(options.intensity)
      ? options.intensity
      : (lateMayhem ? 0.86 : 1);
    const activeParticles = this.particleManager?.particles?.length || 0;
    const activeCombatText = (this.scorePopupManager?.popups?.length || 0)
      + (this.scorePopupManager?.pendingPopups?.length || 0);
    const activeEnemyCount = this.enemyManager?.enemies?.filter?.((target) => target?.active !== false).length || 0;
    const plasmaSweepLoad = this.player?.activePowerup?.type === 'plasma_lance'
      && (activeEnemyCount >= 32 || activeCombatText >= 6);
    const performanceLite = options.performanceLite === true
      || activeParticles >= 500
      || activeCombatText >= 20
      || plasmaSweepLoad;
    const resolvedIntensity = performanceLite
      ? Math.min(intensity, lateMayhem ? 0.46 : 0.48)
      : intensity;
    this.particleManager?.createExplosion(x, y, baseColor, resolvedIntensity);
    deathProfile.intensity = resolvedIntensity;
    deathProfile.performanceLite = performanceLite;
    deathProfile.particlePressure = activeParticles;
    deathProfile.combatTextPressure = activeCombatText;
    this.createEnemyDeathClarityBurst(deathProfile);
    if (deathProfile.highTier) {
      this.emitSpectacle('elite', {
        x,
        y,
        color: baseColor,
        accent: deathProfile.accent,
        intensity: deathProfile.tier === 'elite' ? 1.16 : 0.96,
        audioIntensity: deathProfile.tier === 'elite' ? 1.08 : 0.9,
        audioVolume: 0.82,
        pitchScale: Math.max(0.84, Math.min(1.14, 1.08 - Math.min(18, deathProfile.maxHealth) * 0.012)),
        performanceLite
      });
    }

    if (lateMayhem && !performanceLite) {
      const burstCount = Math.max(1, Math.min(3, Math.floor(profile.deathBurstCount || 1)));
      const sparkCount = Math.max(8, Math.min(18, Math.floor(profile.deathSparkCount || 10)));
      for (let i = 0; i < burstCount; i += 1) {
        const color = palette[(i + 1) % palette.length] || baseColor;
        const angle = ((Math.PI * 2) / burstCount) * i + (profile.spriteIndex || 0) * 0.17;
        const radius = (profile.deathBurstRadius || 14) * (0.65 + i * 0.22);
        const burstX = x + Math.cos(angle) * radius;
        const burstY = y + Math.sin(angle) * radius * 0.65;
        this.particleManager?.createRadialBurst?.(burstX, burstY, color, {
          count: sparkCount,
          intensity: 0.52,
          minSpeed: 1.4,
          maxSpeed: 4.8,
          size: 2.1,
          lifetime: 24,
          alternateColor: palette[(i + 2) % palette.length] || baseColor,
          upwardBias: 0.4
        });
      }
      this.particleManager?.createHitSpark?.(x, y, palette[2] || baseColor, 1.15);
    }

    if (options.sfx !== false) {
      const sfx = lateMayhem && profile.deathSfx ? profile.deathSfx : (options.sfx || 'enemy_explode');
      AudioManager.playSfx(sfx, {
        volume: Number.isFinite(options.volume) ? options.volume : (lateMayhem ? 0.56 : 0.5),
        minIntervalMs: lateMayhem ? 55 : 35
      });
    }
  }

  resolveEnemyDeathFeedbackProfile(enemy, options = {}) {
    const sourceProfile = enemy?.generatedProfile || enemy?.dangerMidShipProfile || enemy?.middleShipProfile || {};
    const level = Math.max(1, Number(this.game?.level || enemy?.level) || 1);
    const lateMayhem = Boolean(sourceProfile.lateMayhem) && level >= 11;
    const palette = Array.isArray(sourceProfile.palette) && sourceProfile.palette.length
      ? sourceProfile.palette
      : [options.color, sourceProfile.accent, sourceProfile.tint, enemy?.visualVariant?.accent, enemy?.color].filter(Number.isFinite);
    const baseColor = Number.isFinite(options.color)
      ? options.color
      : (Number.isFinite(palette[0]) ? palette[0] : enemy?.color || 0xffaa00);
    const accent = Number.isFinite(sourceProfile.accent)
      ? sourceProfile.accent
      : (Number.isFinite(palette[1]) ? palette[1] : (enemy?.visualVariant?.accent || 0xffffff));
    const radius = Math.max(12, Number(enemy?.radius) || 15);
    const maxHealth = Math.max(1, Number(enemy?.maxHealth) || Number(enemy?.health) || 1);
    let tier = 'normal';
    let markerCount = 4;
    let radiusMult = 1.5;
    let durationMs = 360;
    let lineWidth = 1.6;
    if (enemy?.middleShipProfile || enemy?.isEliteMiddleShip) {
      tier = 'elite';
      markerCount = 8;
      radiusMult = 2.38;
      durationMs = 560;
      lineWidth = 2.5;
    } else if (enemy?.kind === 'danger_mid_ship') {
      tier = 'danger_mid';
      markerCount = 7;
      radiusMult = 2.18;
      durationMs = 520;
      lineWidth = 2.25;
    } else if (lateMayhem) {
      tier = 'late_mayhem';
      markerCount = 7;
      radiusMult = 2.05;
      durationMs = 500;
      lineWidth = 2.15;
    } else if (enemy?.threatActionDefinition) {
      tier = 'threat_action';
      markerCount = 6;
      radiusMult = 1.9;
      durationMs = 460;
      lineWidth = 2;
    } else if (enemy?.isElite || maxHealth >= 8) {
      tier = 'durable';
      markerCount = 5;
      radiusMult = 1.78;
      durationMs = 430;
      lineWidth = 1.9;
    }
    const healthLift = Math.min(16, Math.max(0, maxHealth - 1) * 1.2);
    const visualRadius = Math.max(22, Math.min(94, radius * radiusMult + healthLift));
    const highTier = tier !== 'normal' && tier !== 'durable';
    return {
      sourceProfile,
      lateMayhem,
      x: Number(enemy?.x) || 0,
      y: Number(enemy?.y) || 0,
      palette,
      baseColor,
      accent,
      tier,
      markerCount,
      visualRadius,
      durationMs,
      lineWidth,
      highTier,
      maxHealth,
      enemyType: enemy?.type || 'unknown'
    };
  }

  createEnemyDeathClarityBurst(profile = {}) {
    const layerTarget = this.gameContainer || this.container;
    const tickerHost = this.game?.app?.ticker;
    if (!layerTarget || !tickerHost) {
      this.lastEnemyDeathFeedbackDebug = {
        visible: false,
        reason: 'missing_layer_or_ticker',
        tier: profile.tier || 'normal',
        enemyType: profile.enemyType || 'unknown'
      };
      return null;
    }

    const layer = new PIXI.Graphics();
    layer.label = 'enemyDeathClarityBurst';
    layer.blendMode = 'add';
    layer.zIndex = 46;
    layer.x = Number(profile.x) || 0;
    layer.y = Number(profile.y) || 0;
    layerTarget.addChild(layer);

    const performanceLite = Boolean(profile.performanceLite);
    const durationMs = Math.max(
      performanceLite ? 140 : 180,
      (Number(profile.durationMs) || 360) * (performanceLite ? 0.62 : 1)
    );
    const markerCount = performanceLite
      ? Math.max(4, Math.min(6, Math.round(Number(profile.markerCount) || 4)))
      : Math.max(4, Math.min(10, Math.round(Number(profile.markerCount) || 4)));
    const visualRadius = Math.max(18, (Number(profile.visualRadius) || 28) * (performanceLite ? 0.82 : 1));
    const baseColor = Number.isFinite(profile.baseColor) ? profile.baseColor : 0xffaa00;
    const accent = Number.isFinite(profile.accent) ? profile.accent : 0xffffff;
    const lineWidth = Math.max(1, (Number(profile.lineWidth) || 1.6) * (performanceLite ? 0.86 : 1));
    const gridRingCount = performanceLite ? 1 : (profile.highTier ? 3 : 2);
    const debrisSpokeCount = performanceLite ? Math.max(4, markerCount - 1) : Math.max(5, markerCount);
    const implosionDiamondCount = performanceLite ? (profile.highTier ? 4 : 3) : (profile.highTier ? 6 : 4);
    const echoBandCount = performanceLite ? 1 : (profile.highTier ? 3 : 2);
    const killWakeCount = performanceLite ? 2 : (profile.highTier ? 5 : 3);
    let elapsedMs = 0;

    const draw = (progress = 0) => {
      const t = Math.max(0, Math.min(1, progress));
      const fade = Math.pow(1 - t, 0.78);
      const ringRadius = visualRadius * (0.64 + t * 0.56);
      const innerRadius = Math.max(6, ringRadius * 0.46);
      const tickInner = ringRadius * 0.82;
      const tickOuter = ringRadius + 7 + (profile.highTier ? 5 : 0);
      layer.clear();
      for (let i = 0; i < gridRingCount; i += 1) {
        const gridRadius = visualRadius * (0.34 + i * 0.24 + t * 0.24);
        layer.circle(0, 0, gridRadius);
      }
      layer.stroke({ color: 0xffffff, width: 0.8, alpha: 0.08 * fade });
      layer.circle(0, 0, ringRadius);
      layer.stroke({ color: baseColor, width: lineWidth, alpha: 0.46 * fade });
      layer.circle(0, 0, innerRadius);
      layer.stroke({ color: accent, width: Math.max(1, lineWidth - 0.45), alpha: 0.22 * fade });
      for (let i = 0; i < markerCount; i += 1) {
        const angle = (Math.PI * 2 * i) / markerCount + t * 0.95;
        layer.moveTo(Math.cos(angle) * tickInner, Math.sin(angle) * tickInner);
        layer.lineTo(Math.cos(angle) * tickOuter, Math.sin(angle) * tickOuter);
      }
      layer.stroke({ color: accent, width: Math.max(1, lineWidth - 0.2), alpha: 0.5 * fade });
      for (let i = 0; i < debrisSpokeCount; i += 1) {
        const angle = (Math.PI * 2 * i) / debrisSpokeCount - t * 0.65;
        const inner = innerRadius * (0.6 + (i % 2) * 0.18);
        const outer = ringRadius * (1.02 + (i % 3) * 0.08 + t * 0.16);
        layer.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        layer.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      }
      layer.stroke({ color: baseColor, width: 0.9, alpha: 0.2 * fade });
      const diamondRadius = Math.max(8, ringRadius * (0.34 - t * 0.12));
      for (let i = 0; i < implosionDiamondCount; i += 1) {
        const angle = t * 1.2 + i * (Math.PI * 2 / implosionDiamondCount);
        const cx = Math.cos(angle) * diamondRadius;
        const cy = Math.sin(angle) * diamondRadius;
        const tangent = angle + Math.PI * 0.5;
        const size = 3.5 + (i % 2) * 0.8;
        layer.poly([
          cx + Math.cos(angle) * size, cy + Math.sin(angle) * size,
          cx + Math.cos(tangent) * size * 0.72, cy + Math.sin(tangent) * size * 0.72,
          cx - Math.cos(angle) * size, cy - Math.sin(angle) * size,
          cx - Math.cos(tangent) * size * 0.72, cy - Math.sin(tangent) * size * 0.72
        ]);
      }
      layer.fill({ color: 0xffffff, alpha: 0.2 * fade });
      for (let i = 0; i < echoBandCount; i += 1) {
        const p = (t + i * 0.22) % 1;
        const echoRadius = visualRadius * (0.5 + p * 0.75);
        layer.circle(0, 0, echoRadius);
        layer.stroke({ color: i % 2 ? accent : baseColor, width: Math.max(0.8, lineWidth - i * 0.35), alpha: (0.16 - i * 0.025) * fade });
      }
      for (let i = 0; i < killWakeCount; i += 1) {
        const lane = i - (killWakeCount - 1) / 2;
        const x = lane * visualRadius * 0.14;
        const startY = -ringRadius * 0.36;
        const endY = ringRadius * (0.72 + t * 0.24);
        layer.moveTo(x, startY);
        layer.lineTo(x + Math.sin(t * 3 + i) * 6, endY);
      }
      layer.stroke({ color: 0xffffff, width: 0.8, alpha: 0.09 * fade });
      if (profile.highTier) {
        const cross = ringRadius * 0.34;
        layer.moveTo(-cross, 0);
        layer.lineTo(cross, 0);
        layer.moveTo(0, -cross);
        layer.lineTo(0, cross);
        layer.stroke({ color: 0xffffff, width: 1.1, alpha: 0.2 * fade });
      }
      layer._debugEnemyDeathClarity = {
        visible: true,
        tier: profile.tier || 'normal',
        enemyType: profile.enemyType || 'unknown',
        markerCount,
        radius: Number(ringRadius.toFixed(1)),
        visualRadius: Number(visualRadius.toFixed(1)),
        progress: Number(t.toFixed(3)),
        highTier: Boolean(profile.highTier),
        performanceLite,
        particlePressure: Number(profile.particlePressure) || 0,
        combatTextPressure: Number(profile.combatTextPressure) || 0,
        gridRingCount,
        debrisSpokeCount,
        implosionDiamondCount,
        echoBandCount,
        killWakeCount
      };
      this.lastEnemyDeathFeedbackDebug = { ...layer._debugEnemyDeathClarity };
    };

    draw(0);
    const ticker = (delta) => {
      const deltaMs = Number(delta?.deltaMS) || ((Number(delta?.deltaTime) || Number(delta) || 1) * 16.67);
      elapsedMs += deltaMs;
      const progress = Math.min(1, elapsedMs / durationMs);
      draw(progress);
      if (progress >= 1 || this.game?.currentScene !== this) {
        tickerHost.remove(ticker);
        if (this._activeTickers) this._activeTickers = this._activeTickers.filter((fn) => fn !== ticker);
        if (layer.parent) layer.parent.removeChild(layer);
        layer.destroy?.();
      }
    };
    tickerHost.add(ticker);
    if (!this._activeTickers) this._activeTickers = [];
    this._activeTickers.push(ticker);
    return layer;
  }

  triggerComboMilestoneFlare(options = {}) {
    const threshold = Math.max(0, Math.round(Number(options.threshold ?? this.comboCount) || 0));
    const multiplier = Math.max(1, Math.round(Number(options.multiplier ?? this.comboMultiplier) || 1));
    const reason = options.reason || 'combo_milestone';
    const x = Number.isFinite(options.x) ? options.x : (this.player?.x ?? this.game.getWidth() / 2);
    const y = Number.isFinite(options.y) ? options.y : (this.player?.y ?? this.game.getHeight() * 0.72);
    const highTier = threshold >= 25 || multiplier >= 3;
    const color = Number.isFinite(options.color) ? options.color : (highTier ? 0xff66ff : 0x00ffff);
    const accent = Number.isFinite(options.accent) ? options.accent : (highTier ? 0xffff66 : 0xffffff);

    this.particleManager?.createRadialBurst?.(x, y, color, {
      count: highTier ? 34 : 24,
      intensity: highTier ? 1.08 : 0.78,
      minSpeed: 1.6,
      maxSpeed: highTier ? 6.2 : 4.8,
      size: highTier ? 2.8 : 2.2,
      lifetime: highTier ? 44 : 34,
      alternateColor: accent,
      upwardBias: 0.35
    });
    this.particleManager?.createHitSpark?.(x, y - 18, accent, highTier ? 1.45 : 1.05);
    this.triggerShockwave?.(x, y, color);
    this.screenShake?.shake?.(this.game.getWidth() < 620 ? 3 : (highTier ? 6 : 4), highTier ? 16 : 11);
    AudioManager.playSfx(highTier ? 'combo_breakout' : 'combo_tick', {
      volume: highTier ? 0.58 : 0.44,
      minIntervalMs: 160
    });
    this.emitSpectacle('combo', {
      x,
      y,
      color,
      accent,
      intensity: highTier ? 1.24 : 0.88,
      audioIntensity: highTier ? 1.14 : 0.82,
      audioVolume: highTier ? 0.92 : 0.68,
      pitchScale: highTier ? 0.94 : 1.08,
      force: true
    });

    this.lastComboCelebration = {
      triggered: true,
      startedAt: Date.now(),
      durationMs: highTier ? 1050 : 850,
      threshold,
      multiplier,
      reason
    };
    return this.lastComboCelebration;
  }

  triggerNovaMiracle(powerup = {}) {
    const sourceX = Number.isFinite(powerup?.x)
      ? powerup.x
      : (Number.isFinite(this.player?.x) ? this.player.x : this.gameplayGame.getWidth() * 0.5);
    const sourceY = Number.isFinite(powerup?.y)
      ? powerup.y
      : (Number.isFinite(this.player?.y) ? this.player.y : this.gameplayGame.getHeight() * 0.65);
    const baseColor = Number.isFinite(powerup?.color) ? powerup.color : 0xfff06a;
    const enemies = Array.isArray(this.enemyManager?.enemies)
      ? [...this.enemyManager.enemies]
      : [];
    let enemiesCleared = 0;
    let scoreAwarded = 0;

    for (const enemy of enemies) {
      if (!enemy?.active || enemy.kind === 'boss') continue;
      const damage = Math.max(100000, (Number(enemy.health) || 1) + (Number(enemy.shieldHealth) || 0) + 1000);
      try {
        this.applyCombatDamage(enemy, damage, 'other');
      } catch (error) {
        console.warn('[NovaMiracle] enemy damage failed', error);
      }
      enemy.active = false;
      enemiesCleared += 1;
      const scoreValue = Math.max(0, Number(enemy.scoreValue) || 0);
      if (scoreValue > 0) {
        scoreAwarded += Number(this.addNormalWaveScore(scoreValue, 'baseScore', enemy)) || scoreValue;
      }
      this.onEnemyKilled?.(enemy);
      if (enemiesCleared <= 24) {
        this.particleManager?.createExplosion?.(
          enemy.x,
          enemy.y,
          enemiesCleared % 3 === 0 ? 0xffffff : (enemiesCleared % 2 === 0 ? 0x43f7ff : 0xff45dd),
          0.78
        );
        this.particleManager?.createHitSpark?.(enemy.x, enemy.y, baseColor, 1.15);
      }
      this.enemyManager?.removeEnemySprite?.(enemy, 'nova_miracle');
    }
    if (Array.isArray(this.enemyManager?.enemies)) {
      this.enemyManager.enemies = this.enemyManager.enemies.filter((enemy) => enemy?.active || enemy?.kind === 'boss');
    }

    let hijackerCleared = 0;
    const hijacker = this.enemyManager?.hijacker;
    if (hijacker?.active && hijacker.kind !== 'boss') {
      hijacker.active = false;
      hijackerCleared = 1;
      this.particleManager?.createExplosion?.(hijacker.x, hijacker.y, 0xff45dd, 0.9);
      this.enemyManager?.removeEnemySprite?.(hijacker, 'nova_miracle_hijacker');
      this.enemyManager.hijacker = null;
    }

    const pendingBulletsCleared = (this.bulletManager?.pendingEnemyBullets || [])
      .filter((bullet) => bullet?.active !== false).length;
    const totalEnemyProjectilesCleared = this.clearEnemyBullets('nova_miracle');
    const bulletsCleared = Math.max(0, totalEnemyProjectilesCleared - pendingBulletsCleared);
    const bossHazardsCleared = this.clearBossHazards('nova_miracle');
    let ambientHazardsCleared = 0;
    for (const drone of this.ambientBonusDrones || []) {
      if (!drone?.active || drone.type !== 'HAZARD') continue;
      ambientHazardsCleared += 1;
      drone.active = false;
      this.particleManager?.createExplosion?.(drone.x, drone.y, 0xfff06a, 0.68);
      if (drone.sprite?.parent) drone.sprite.parent.removeChild(drone.sprite);
    }

    if (scoreAwarded > 0) {
      this.scorePopupManager?.addScorePopup?.(sourceX, sourceY - 56, scoreAwarded, {
        prefix: translateText('MIRACLE'),
        color: '#fff3a0'
      });
    }

    this.particleManager?.createRadialBurst?.(sourceX, sourceY, baseColor, {
      count: this.game.getWidth() < 620 ? 48 : 84,
      intensity: 1.45,
      minSpeed: 2.2,
      maxSpeed: 9.8,
      size: 3.2,
      lifetime: 62,
      alternateColor: 0xffffff,
      upwardBias: 0.15
    });
    this.particleManager?.createRadialBurst?.(sourceX, sourceY, 0x43f7ff, {
      count: this.game.getWidth() < 620 ? 24 : 42,
      intensity: 1.05,
      minSpeed: 1.1,
      maxSpeed: 6.4,
      size: 2.4,
      lifetime: 76,
      alternateColor: 0xff45dd,
      upwardBias: 0
    });
    this.triggerShockwave?.(sourceX, sourceY, baseColor);
    this.screenShake?.shake?.(this.game.getWidth() < 620 ? 7 : 13, 30);
    AudioManager.playSfx('nova_miracle_purge', { force: true, volume: 0.96, minIntervalMs: 0 });
    this.emitSpectacle('miracle', {
      x: sourceX,
      y: sourceY,
      color: baseColor,
      accent: 0x43f7ff,
      intensity: 1.36,
      audioIntensity: 1.2,
      audioVolume: 0.94,
      pitchScale: 1.02,
      force: true
    });

    const layerHost = this.gameContainer || this.container;
    const tickerHost = this.game?.app?.ticker;
    const width = this.gameplayGame.getWidth();
    const height = this.gameplayGame.getHeight();
    const durationMs = 1350;
    if (layerHost && tickerHost) {
      const layer = new PIXI.Graphics();
      layer.label = 'novaMiracleBoardClear';
      layer.zIndex = 99994;
      layer.blendMode = 'add';
      layerHost.addChild(layer);
      layerHost.sortChildren?.();
      let elapsedMs = 0;
      const draw = () => {
        const t = Math.max(0, Math.min(1, elapsedMs / durationMs));
        const intro = Math.min(1, elapsedMs / 120);
        const fade = Math.max(0, 1 - Math.max(0, t - 0.2) / 0.8);
        const pulse = 0.5 + Math.sin(elapsedMs * 0.025) * 0.5;
        const maxRadius = Math.hypot(Math.max(sourceX, width - sourceX), Math.max(sourceY, height - sourceY));
        const waveRadius = 24 + maxRadius * (1 - Math.pow(1 - t, 3));
        layer.clear();
        layer.rect(0, 0, width, height);
        layer.fill({ color: 0xffffff, alpha: 0.14 * intro * fade });
        layer.circle(sourceX, sourceY, waveRadius);
        layer.stroke({ color: 0xffffff, width: 13 - t * 8, alpha: 0.82 * fade });
        layer.circle(sourceX, sourceY, waveRadius * 0.82);
        layer.stroke({ color: 0x43f7ff, width: 7 - t * 3, alpha: 0.64 * fade });
        layer.circle(sourceX, sourceY, waveRadius * 0.65);
        layer.stroke({ color: 0xff45dd, width: 5 - t * 2, alpha: 0.52 * fade });
        const rayLength = Math.min(maxRadius, 110 + t * maxRadius);
        for (let i = 0; i < 16; i += 1) {
          const angle = i * Math.PI / 8 + elapsedMs * 0.00065;
          const inner = 28 + pulse * 12;
          layer.moveTo(sourceX + Math.cos(angle) * inner, sourceY + Math.sin(angle) * inner);
          layer.lineTo(sourceX + Math.cos(angle) * rayLength, sourceY + Math.sin(angle) * rayLength);
        }
        layer.stroke({ color: baseColor, width: 2.2, alpha: 0.34 * fade });
        for (let i = 0; i < 12; i += 1) {
          const angle = -elapsedMs * 0.0018 + i * Math.PI / 6;
          const orbit = 46 + t * 118 + (i % 2) * 18;
          layer.circle(sourceX + Math.cos(angle) * orbit, sourceY + Math.sin(angle) * orbit, 2.8 + pulse * 1.8);
        }
        layer.fill({ color: baseColor, alpha: 0.72 * fade });
      };
      const ticker = (tick) => {
        elapsedMs += (Number(tick?.deltaTime) || Number(tick) || 1) * 16.67;
        draw();
        if (elapsedMs < durationMs && this.game?.currentScene === this) return;
        tickerHost.remove(ticker);
        this._activeTickers = (this._activeTickers || []).filter((entry) => entry !== ticker);
        if (layer.parent) layer.parent.removeChild(layer);
        layer.destroy?.();
      };
      draw();
      tickerHost.add(ticker);
      if (!this._activeTickers) this._activeTickers = [];
      this._activeTickers.push(ticker);
    }

    this.lastNovaMiracle = {
      triggered: true,
      startedAt: Date.now(),
      durationMs,
      enemiesCleared,
      hijackerCleared,
      bulletsCleared,
      pendingBulletsCleared,
      bossHazardsCleared,
      ambientHazardsCleared,
      scoreAwarded
    };
    return this.lastNovaMiracle;
  }

  triggerPowerupPickupJuice(powerup = {}) {
    const type = powerup?.type || 'powerup';
    const x = Number.isFinite(this.player?.x) ? this.player.x : (Number.isFinite(powerup?.x) ? powerup.x : this.game.getWidth() / 2);
    const y = Number.isFinite(this.player?.y) ? this.player.y : (Number.isFinite(powerup?.y) ? powerup.y : this.game.getHeight() * 0.72);
    const color = Number.isFinite(powerup?.color)
      ? powerup.color
      : (this.player?.visualVariant?.accent || this.player?.visualVariant?.glow || 0x66ffff);
    const major = ['super_extra_life', 'nova_miracle', 'bomb', 'row_core', 'plasma_lance', 'shockwave'].includes(type);

    this.particleManager?.createPickupEffect?.(x, y, color);
    this.particleManager?.createRadialBurst?.(x, y, color, {
      count: major ? 30 : 18,
      intensity: major ? 1.05 : 0.7,
      minSpeed: 0.9,
      maxSpeed: major ? 5.4 : 3.8,
      size: major ? 2.8 : 2,
      lifetime: major ? 46 : 32,
      alternateColor: 0xffffff,
      upwardBias: 0.75
    });
    this.triggerShockwave?.(x, y, color);
    const claimCue = this.triggerPowerupPickupClaimCue(powerup, { color, major, type });
    this.screenShake?.shake?.(this.game.getWidth() < 620 ? 2 : (major ? 5 : 3), major ? 14 : 9);
    if (major && type !== 'nova_miracle') {
      this.emitSpectacle('pickup', {
        x,
        y,
        color,
        accent: 0xffffff,
        intensity: type === 'super_extra_life' ? 1.18 : 0.98,
        audioIntensity: type === 'super_extra_life' ? 1.08 : 0.9,
        audioVolume: 0.76,
        pitchScale: type === 'row_core' ? 0.82 : 1.04,
        force: true
      });
    }

    this.lastPowerupPickupJuice = {
      triggered: true,
      startedAt: Date.now(),
      durationMs: major ? 950 : 720,
      type,
      major,
      claimCue: Boolean(claimCue?.triggered),
      claimPips: claimCue?.pipCount || 0,
      claimRings: claimCue?.ringCount || 0,
      x: Math.round(x),
      y: Math.round(y)
    };
    return this.lastPowerupPickupJuice;
  }

  triggerPowerupPickupClaimCue(powerup = {}, options = {}) {
    const targetLayer = this.gameContainer || this.uiContainer;
    const tickerHost = this.game?.app?.ticker;
    if (!targetLayer || !tickerHost || !this.player) return null;

    if (this.powerupPickupClaimCue?.ticker) {
      tickerHost.remove(this.powerupPickupClaimCue.ticker);
      this._activeTickers = (this._activeTickers || []).filter(fn => fn !== this.powerupPickupClaimCue.ticker);
    }
    if (this.powerupPickupClaimCue?.layer?.parent) {
      this.powerupPickupClaimCue.layer.parent.removeChild(this.powerupPickupClaimCue.layer);
    }
    this.powerupPickupClaimCue?.layer?.destroy?.();

    const type = options.type || powerup?.type || 'powerup';
    const color = Number.isFinite(options.color)
      ? options.color
      : (Number.isFinite(powerup?.color) ? powerup.color : (this.player?.visualVariant?.accent || 0x66ffff));
    const major = Boolean(options.major);
    const playerX = Number.isFinite(this.player?.x) ? this.player.x : this.game.getWidth() / 2;
    const playerY = Number.isFinite(this.player?.y) ? this.player.y : this.game.getHeight() * 0.72;
    const sourceX = Number.isFinite(powerup?.x) ? powerup.x : playerX;
    const sourceY = Number.isFinite(powerup?.y) ? powerup.y : playerY - 36;
    const pipCount = major ? 8 : 6;
    const ringCount = major ? 3 : 2;
    const sparkCount = major ? 4 : 3;
    const tetherLineCount = 1;
    const cometStreakCount = major ? 4 : 3;
    const claimDiamondCount = major ? 6 : 4;
    const petalCount = major ? 8 : 0;
    const sourceAnchorRingCount = 1;
    const landingTickCount = 4;
    const durationMs = major ? 880 : 700;
    const layer = new PIXI.Graphics();
    layer.label = 'powerupPickupClaimCue';
    layer.x = playerX;
    layer.y = playerY;
    layer.zIndex = 99995;
    layer.blendMode = 'add';
    targetLayer.addChild(layer);
    targetLayer.sortChildren?.();

    const setDebug = (visible, elapsedMs = 0) => {
      const debug = {
        triggered: true,
        visible,
        type,
        major,
        color,
        pipCount: visible ? pipCount : 0,
        ringCount: visible ? ringCount : 0,
        sparkCount: visible ? sparkCount : 0,
        tetherLineCount: visible ? tetherLineCount : 0,
        cometStreakCount: visible ? cometStreakCount : 0,
        claimDiamondCount: visible ? claimDiamondCount : 0,
        petalCount: visible ? petalCount : 0,
        sourceAnchorRingCount: visible ? sourceAnchorRingCount : 0,
        landingTickCount: visible ? landingTickCount : 0,
        sourceX: Math.round(sourceX),
        sourceY: Math.round(sourceY),
        playerX: Math.round(layer.x),
        playerY: Math.round(layer.y),
        sourceDistance: Math.round(Math.hypot(sourceX - layer.x, sourceY - layer.y)),
        elapsedMs: Math.round(elapsedMs),
        durationMs
      };
      layer._debugPowerupPickupClaimCue = debug;
      this.lastPowerupPickupClaimCue = { ...debug };
      return debug;
    };

    const drawDiamond = (cx, cy, radialX, radialY, tangentX, tangentY, size, fillColor, alpha) => {
      layer.poly([
        cx + radialX * size, cy + radialY * size,
        cx + tangentX * size * 0.72, cy + tangentY * size * 0.72,
        cx - radialX * size, cy - radialY * size,
        cx - tangentX * size * 0.72, cy - tangentY * size * 0.72
      ]);
      layer.fill({ color: fillColor, alpha });
    };

    const drawCue = (elapsedMs) => {
      const currentX = Number.isFinite(this.player?.x) ? this.player.x : playerX;
      const currentY = Number.isFinite(this.player?.y) ? this.player.y : playerY;
      layer.x = currentX;
      layer.y = currentY;

      let dx = sourceX - currentX;
      let dy = sourceY - currentY;
      let distance = Math.hypot(dx, dy);
      if (!Number.isFinite(distance) || distance < 0.01) {
        dx = 0;
        dy = -1;
        distance = 1;
      }
      const nx = dx / distance;
      const ny = dy / distance;
      const t = Math.max(0, Math.min(1, elapsedMs / durationMs));
      const intro = Math.min(1, elapsedMs / 120);
      const fade = Math.max(0, 1 - Math.max(0, t - 0.12) / 0.88);
      const pulse = 0.5 + Math.sin(elapsedMs * 0.024) * 0.5;
      const baseRadius = 22 + t * (major ? 22 : 16);
      layer.clear();

      for (let i = 0; i < ringCount; i += 1) {
        const radius = baseRadius + i * 10 + pulse * (i === 0 ? 2.4 : 1.2);
        layer.circle(0, 0, radius);
        layer.stroke({
          color: i === 0 ? 0xffffff : color,
          width: i === 0 ? 1.4 : 2.1,
          alpha: (i === 0 ? 0.38 : 0.48) * fade * intro
        });
      }

      const orbitRadius = baseRadius + 14 + pulse * 4;
      const orbitSpin = elapsedMs * 0.0045;
      for (let i = 0; i < pipCount; i += 1) {
        const angle = orbitSpin + (Math.PI * 2 * i) / pipCount;
        const rx = Math.cos(angle);
        const ry = Math.sin(angle);
        const tx = -Math.sin(angle);
        const ty = Math.cos(angle);
        const size = (major ? 4.5 : 3.8) + (i % 2) * 0.8;
        drawDiamond(rx * orbitRadius, ry * orbitRadius, rx, ry, tx, ty, size, i % 2 ? color : 0xffffff, (i % 2 ? 0.52 : 0.66) * fade * intro);
      }

      const sourceArcRadius = baseRadius + 28;
      const sourceAngle = Math.atan2(ny, nx);
      const sourceLocalX = sourceX - currentX;
      const sourceLocalY = sourceY - currentY;
      layer.circle(sourceLocalX, sourceLocalY, major ? 17 + pulse * 2 : 13 + pulse * 1.5);
      layer.stroke({ color, width: major ? 1.8 : 1.3, alpha: 0.18 * fade * intro });
      for (let i = 0; i < landingTickCount; i += 1) {
        const angle = orbitSpin * 0.35 + i * Math.PI * 0.5;
        const inner = baseRadius - 6;
        const outer = baseRadius + 5;
        layer.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        layer.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      }
      layer.stroke({ color: 0xffffff, width: 1, alpha: 0.16 * fade * intro });
      layer.moveTo(sourceLocalX * 0.22, sourceLocalY * 0.22);
      layer.lineTo(sourceLocalX * 0.86, sourceLocalY * 0.86);
      layer.stroke({ color: color, width: major ? 2.2 : 1.6, alpha: 0.16 * fade * intro });
      layer.moveTo(sourceLocalX * 0.32, sourceLocalY * 0.32);
      layer.lineTo(sourceLocalX * 0.72, sourceLocalY * 0.72);
      layer.stroke({ color: 0xffffff, width: 0.9, alpha: 0.18 * fade * intro });
      layer.arc(0, 0, sourceArcRadius, sourceAngle - 0.5, sourceAngle + 0.5);
      layer.stroke({ color: 0xffffff, width: 2.4, alpha: 0.34 * fade * intro });
      for (let i = 0; i < sparkCount; i += 1) {
        const offset = (sourceArcRadius - i * 9) - t * 12;
        layer.circle(nx * offset, ny * offset, Math.max(1.8, 4.4 - i * 0.7 + pulse));
        layer.fill({ color: i === 0 ? 0xffffff : color, alpha: (0.68 - i * 0.11) * fade * intro });
      }

      for (let i = 0; i < cometStreakCount; i += 1) {
        const track = (i + 1) / (cometStreakCount + 1);
        const wobble = Math.sin(elapsedMs * 0.012 + i) * (major ? 7 : 5);
        const cx = sourceLocalX * (1 - track * 0.7) + nx * wobble;
        const cy = sourceLocalY * (1 - track * 0.7) + ny * wobble;
        layer.moveTo(cx - nx * (7 + i * 2), cy - ny * (7 + i * 2));
        layer.lineTo(cx + nx * (6 + pulse * 5), cy + ny * (6 + pulse * 5));
      }
      layer.stroke({ color: color, width: major ? 1.8 : 1.35, alpha: 0.2 * fade * intro + 0.08 });

      const diamondRadius = baseRadius + 7 + pulse * 3;
      for (let i = 0; i < claimDiamondCount; i += 1) {
        const angle = -orbitSpin * 0.7 + (Math.PI * 2 * i) / claimDiamondCount;
        const rx = Math.cos(angle);
        const ry = Math.sin(angle);
        const tx = -Math.sin(angle);
        const ty = Math.cos(angle);
        drawDiamond(rx * diamondRadius, ry * diamondRadius, rx, ry, tx, ty, major ? 3.8 : 3.1, i % 2 ? color : 0xffffff, 0.24 * fade * intro);
      }

      if (petalCount > 0) {
        const petalRadius = baseRadius + 24 + pulse * 3;
        for (let i = 0; i < petalCount; i += 1) {
          const angle = orbitSpin * 0.42 + (Math.PI * 2 * i) / petalCount;
          const rx = Math.cos(angle);
          const ry = Math.sin(angle);
          const tx = -Math.sin(angle);
          const ty = Math.cos(angle);
          layer.moveTo(rx * (petalRadius - 5) - tx * 3, ry * (petalRadius - 5) - ty * 3);
          layer.lineTo(rx * (petalRadius + 7), ry * (petalRadius + 7));
          layer.lineTo(rx * (petalRadius - 5) + tx * 3, ry * (petalRadius - 5) + ty * 3);
        }
        layer.stroke({ color: 0xffffff, width: 1, alpha: 0.16 * fade * intro });
      }

      layer.visible = true;
      setDebug(true, elapsedMs);
    };

    let elapsedMs = 0;
    drawCue(0);
    const ticker = (tick) => {
      elapsedMs += tick.deltaTime * 16.67;
      if (elapsedMs >= durationMs) {
        layer.clear();
        layer.visible = false;
        setDebug(false, elapsedMs);
        if (layer.parent) layer.parent.removeChild(layer);
        tickerHost.remove(ticker);
        this._activeTickers = (this._activeTickers || []).filter(fn => fn !== ticker);
        if (this.powerupPickupClaimCue?.ticker === ticker) this.powerupPickupClaimCue = null;
        layer.destroy?.();
        return;
      }
      drawCue(elapsedMs);
    };
    tickerHost.add(ticker);
    if (!this._activeTickers) this._activeTickers = [];
    this._activeTickers.push(ticker);
    this.powerupPickupClaimCue = { layer, ticker, type, startedAtMs: Date.now(), durationMs };
    return this.lastPowerupPickupClaimCue;
  }

  triggerNearMissSurge() {
    const streak = Math.max(0, Math.round(Number(this.dangerDodgeCount) || 0));
    if (streak < 5 || streak % 5 !== 0 || !this.player) return false;

    const now = Date.now();
    if (this.lastNearMissSurge?.streak === streak && now - (this.lastNearMissSurge.startedAt || 0) < 900) {
      return false;
    }

    const beforeCooldown = Math.max(0, Number(this.player.shootCooldown) || 0);
    const readyCooldown = Math.max(0, Math.min(beforeCooldown, Math.round((Number(this.player.shootDelay) || 140) * 0.16)));
    this.player.shootCooldown = readyCooldown;

    const x = this.player.x;
    const y = this.player.y;
    const color = streak >= 10 ? 0xff66ff : 0xffcc00;
    this.particleManager?.createNearMissEffect?.(x, y, Math.min(9, streak + 2));
    this.particleManager?.createRadialBurst?.(x, y, color, {
      count: streak >= 10 ? 28 : 20,
      intensity: streak >= 10 ? 1 : 0.74,
      minSpeed: 1.2,
      maxSpeed: streak >= 10 ? 5.8 : 4.2,
      size: 2.1,
      lifetime: 34,
      alternateColor: 0xffffff,
      upwardBias: 0.6
    });
    this.triggerShockwave?.(x, y, color);
    this.screenShake?.shake?.(this.game.getWidth() < 620 ? 2 : 4, 10);
    AudioManager.playSfx('combo_tick', { volume: 0.68, minIntervalMs: 120 });

    const nearMissLabel = translateText('NEAR MISS');
    this.enqueueToast(`${nearMissLabel} x${streak}`, {
      fontSize: this.game.getWidth() < 620 ? 16 : 20,
      fill: streak >= 10 ? '#ff66ff' : '#ffef7e',
      stroke: '#120018',
      strokeThickness: this.game.getWidth() < 620 ? 2 : 3,
      slot: 'corner',
      type: 'dangerDodge',
      priority: 3,
      duration: 850
    });

    this.nearMissSurgesThisRun = (Number(this.nearMissSurgesThisRun) || 0) + 1;
    this.lastNearMissSurge = {
      triggered: true,
      startedAt: now,
      durationMs: 900,
      streak,
      cooldownBefore: Math.round(beforeCooldown),
      cooldownAfter: Math.round(this.player.shootCooldown || 0)
    };
    return true;
  }

  announceRareChaosVisitor(enemy, plan = null) {
    const variant = enemy?.rareChaosVisitorVariant;
    if (!variant) return false;
    this.recordThreatDiscovery(variant.id, 'enemies', {
      name: variant.displayName,
      role: translateText('EXTINCTION-CLASS CONTACT'),
      movementStyle: variant.move,
      fireStyle: variant.loadoutName,
      rarity: translateText('0.4% WAVE CONTACT'),
      sector: this.game?.level || 1,
      waveIndex: this.enemyManager?.currentWaveIndex || 0
    });
    this.showSpecialEnemySignal({
      title: translateText('EXTINCTION CONTACT {number}/{total}', {
        number: String(variant.number).padStart(2, '0'),
        total: RARE_CHAOS_VISITOR_VARIANT_COUNT
      }),
      message: `${variant.displayName} // ${variant.loadoutName}\n${translateText('THREE PHASES // WATCH THE FRAME')}`,
      type: 'rareChaosVisitor',
      priority: 10,
      duration: 2300,
      maxWidth: this.game.getWidth() < 720
        ? Math.min(this.game.getWidth() - 32, 470)
        : Math.min(500, this.game.getWidth() * 0.4),
      accent: variant.accent
    });
    AudioManager.playSfx('rare_visitor_arrival', { force: true, volume: 0.82, minIntervalMs: 0 });
    setTimeout(() => {
      if (enemy?.active) AudioManager.playSfx('rare_visitor_theme_sting', { force: true, volume: 0.72, minIntervalMs: 0 });
    }, 320);
    if (AudioManager.isBossVoiceEnabled?.() !== false) {
      AudioManager.playVoice('boss_rare_chaos_visitor_warning', {
        force: true,
        bypassGlobalCooldown: true,
        cooldownMs: 0,
        eventCooldownMs: 0,
        duckMs: 2200,
        duckFactor: 0.3,
        voicePriority: 9,
        exclusiveGroup: 'boss_voice'
      });
    }
    const dreadWash = new PIXI.Graphics();
    dreadWash.label = 'rare_contact_dread_wash';
    dreadWash.zIndex = 999990;
    dreadWash.eventMode = 'none';
    dreadWash.rect(0, 0, this.game.getWidth(), this.game.getHeight());
    dreadWash.fill({ color: 0x030006, alpha: 0.22 });
    dreadWash.rect(8, 8, this.game.getWidth() - 16, this.game.getHeight() - 16);
    dreadWash.stroke({ color: 0xff1748, width: 3, alpha: 0.58 });
    this.uiOverlay?.addChild?.(dreadWash);
    let dreadElapsed = 0;
    const dreadTicker = (delta) => {
      dreadElapsed += delta.deltaTime * 16.67;
      const fadeIn = Math.min(1, dreadElapsed / 80);
      const fadeOut = Math.max(0, 1 - Math.max(0, dreadElapsed - 280) / 440);
      dreadWash.alpha = fadeIn * fadeOut;
      if (dreadElapsed < 720) return;
      this.game.app.ticker.remove(dreadTicker);
      dreadWash.parent?.removeChild?.(dreadWash);
      dreadWash.destroy?.();
    };
    this.game.app.ticker.add(dreadTicker);
    this.screenShake?.shake?.(6, 18);
    for (let index = 0; index < 5; index += 1) {
      const angle = (Math.PI * 2 * index) / 5;
      this.particleManager?.createExplosion?.(enemy.x + Math.cos(angle) * (28 + index * 5), enemy.y + Math.sin(angle) * (22 + index * 4), index % 2 ? variant.tint : variant.accent, 0.7 + index * 0.08);
    }
    this.lastRareChaosVisitorAnnouncement = {
      id: variant.id,
      number: variant.number,
      chance: plan?.chance ?? RARE_CHAOS_VISITOR_WAVE_CHANCE,
      roll: plan?.roll ?? null,
      announcedAt: Date.now(),
      presentation: 'edge_signal'
    };
    return true;
  }

  onRareChaosVisitorPhase(enemy, threshold) {
    const variant = enemy?.rareChaosVisitorVariant;
    if (!variant) return false;
    const label = threshold <= 0.25
      ? translateText('FINAL PHASE // TOTAL FIRE')
      : threshold <= 0.5
        ? translateText('PHASE II // HULL FRENZY')
        : translateText('PHASE I // WEAPONS UNSEALED');
    this.enqueueToast(label, {
      fontSize: threshold <= 0.25 ? 24 : 18,
      fill: threshold <= 0.25 ? '#ff315f' : '#ffb0c4',
      stroke: '#15000e',
      strokeThickness: 4,
      slot: 'top',
      type: 'rareChaosPhase',
      priority: 7,
      duration: 1100,
      accent: variant.accent
    });
    AudioManager.playSfx(threshold <= 0.25 ? 'rare_visitor_laser_charge' : 'rare_visitor_armor_crack', { force: true, volume: 0.8, minIntervalMs: 0 });
    this.particleManager?.createExplosion?.(enemy.x, enemy.y, threshold <= 0.25 ? 0xff426f : variant.accent, 1.25);
    this.screenShake?.shake?.(threshold <= 0.25 ? 6 : 3, 14);
    return true;
  }

  completeRareChaosVisitor(enemy) {
    if (!enemy?.isRareChaosVisitor || enemy.rareChaosVisitorRewardClaimed) return false;
    enemy.rareChaosVisitorRewardClaimed = true;
    const variant = enemy.rareChaosVisitorVariant;
    if (this.enemyManager?.rareChaosVisitorStats) this.enemyManager.rareChaosVisitorStats.defeated += 1;
    const bonus = this.addNormalWaveScore(2400 + variant.number * 20, 'rareChaosVisitorBonus', enemy);
    const reward = this.powerupManager?.spawnSpecific?.(enemy.x, enemy.y, variant.rewardPowerupType, { source: 'rare_chaos_visitor' });
    const rewardLabel = translateText(getPowerupMeta(variant.rewardPowerupType)?.name || variant.rewardPowerupType.toUpperCase());
    this.player?.grantInvulnerability?.(1500, 'rare_chaos_visitor_reward');
    this.comboTimerMs = Math.max(this.comboWindowMs, Number(this.comboTimerMs) || 0);
    this.enqueueToast(`${translateText('EXTINCTION CONTACT DESTROYED')}\n${translateText('BONUS +{score}', { score: Number(bonus).toLocaleString('en-US') })} // ${translateText('PRIZE: {reward}', { reward: rewardLabel })}`, {
      fontSize: this.game.getWidth() < 720 ? 18 : 27,
      fill: '#fff3a0',
      stroke: '#120014',
      strokeThickness: 5,
      slot: 'center',
      type: 'rareChaosVictory',
      priority: 10,
      duration: 2500,
      maxWidth: this.game.getWidth() * 0.8,
      accent: variant.accent
    });
    AudioManager.playSfx('rare_visitor_defeat', { force: true, volume: 1, minIntervalMs: 0 });
    setTimeout(() => AudioManager.playSfx('rare_visitor_reward', { force: true, volume: 0.88, minIntervalMs: 0 }), 420);
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      const radius = 24 + (index % 4) * 18;
      this.particleManager?.createExplosion?.(
        enemy.x + Math.cos(angle) * radius,
        enemy.y + Math.sin(angle) * radius,
        [variant.tint, variant.accent, 0xffef7e, 0xffffff][index % 4],
        0.75 + (index % 3) * 0.18
      );
    }
    this.screenShake?.shake?.(10, 26);
    this.lastRareChaosVisitorDefeat = { id: variant.id, number: variant.number, bonus, rewardSpawned: Boolean(reward), defeatedAt: Date.now() };
    return true;
  }

  queueEnemyKillToast(sideEffects, message, options) {
    if (!this.queueCollisionSideEffect(sideEffects, 'toasts', { message, options })) {
      this.enqueueToast(message, options);
    }
  }

  queueEnemyKillExplosion(sideEffects, x, y, color, intensity) {
    if (!this.queueCollisionSideEffect(sideEffects, 'playerExplosions', { x, y, color, intensity })) {
      this.particleManager?.createExplosion?.(x, y, color, intensity);
    }
  }

  queueEnemyKillShake(sideEffects, intensity, duration) {
    if (!this.queueCollisionSideEffect(sideEffects, 'screenShakes', { intensity, duration })) {
      this.screenShake?.shake?.(intensity, duration);
    }
  }

  queueEnemyKillComboFlare(sideEffects, options) {
    if (!this.queueCollisionSideEffect(sideEffects, 'comboFlares', options)) {
      this.triggerComboMilestoneFlare(options);
    }
  }

  onEnemyKilled(enemy, options = {}) {
    const now = Date.now();
    this.enemyManager?.recordChallengeFlightKill?.(enemy);
    const sideEffects = options.sideEffects || null;
    if (enemy?.isRareChaosVisitor) this.completeRareChaosVisitor(enemy);
    if (enemy?.isAce) this.completeAceBounty(enemy);
    if (enemy?.kind === 'boss') {
      this.clearBossHazards('boss_defeated');
      const bossId = enemy?.profile?.id || enemy?.bossType || `boss_${this.game.level}`;
      this.defeatedBossIds = [...new Set([...(this.defeatedBossIds || []), bossId])];
      this.queueThreatDefeat(bossId, 'bosses', {
        name: enemy?.profile?.name || enemy?.name || bossId,
        role: enemy?.profile?.title || 'boss',
        sector: this.game.level
      });
    } else {
      const isEliteMiddleShip = enemy?.kind === 'elite_middle_ship' || enemy?.isEliteMiddleShip || Boolean(enemy?.middleShipProfile);
      const threatCategory = isEliteMiddleShip ? 'elites' : 'enemies';
      const threatId = enemy?.isRareChaosVisitor
        ? enemy?.rareChaosVisitorVariant?.id
        : isEliteMiddleShip
          ? (enemy?.middleShipProfile?.id || enemy?.type)
          : enemy?.type;
      this.queueThreatDefeat(threatId, threatCategory, {
        name: enemy?.isRareChaosVisitor
          ? (enemy?.rareChaosVisitorVariant?.displayName || threatId)
          : isEliteMiddleShip
            ? (enemy?.middleShipProfile?.displayName || enemy?.middleShipProfile?.label || threatId)
            : (enemy?.generatedProfile?.displayName || enemy?.middleShipProfile?.displayName || enemy?.middleShipProfile?.label || threatId),
        role: enemy?.isRareChaosVisitor
          ? translateText('RARE CHAOS VISITOR')
          : isEliteMiddleShip
            ? (enemy?.middleShipProfile?.role || 'elite')
            : (enemy?.generatedProfile?.role || enemy?.middleShipProfile?.role || 'enemy'),
        sector: this.game.level
      });
      for (const entry of getBossSupportCodexDefeatEntries(enemy, this.game.level)) {
        this.queueThreatDefeat(entry.threatId, entry.category, entry.metadata, { scoreBonus: false });
      }
      if (enemy?.kind === BOSS_FUEL_SHIP_CODEX_ID) {
        this.emitRunContractEvent('boss_support_defeated', {
          sector: this.game?.level || 1,
          supportId: enemy?.bossSupportShipProfile?.id || enemy?.bossFuelProfile?.id || BOSS_FUEL_SHIP_CODEX_ID,
          deferPersistence: this.isCollisionHotPathActive
        });
        this.emitTacticalDirectiveEvent('boss_support_defeated', {
          sector: this.game?.level || 1,
          supportId: enemy?.bossSupportShipProfile?.id || enemy?.bossFuelProfile?.id || BOSS_FUEL_SHIP_CODEX_ID
        });
      }
      if ((this.runContractSession?.active || []).some((item) => {
        const contract = getRunContractById(item.id);
        return (contract?.objective === 'enemy_defeats' || contract?.objective === 'unique_enemy_defeats')
          && item.eligible
          && !item.completed;
      })) {
        const runContractPayload = {
          sector: this.game?.level || 1,
          enemyType: enemy?.type || enemy?.kind || 'enemy'
        };
        if (this.isCollisionHotPathActive) {
          this.queueDeferredRunContractEnemyDefeat(runContractPayload);
        } else {
          this.emitRunContractEvent('enemy_defeated', runContractPayload);
        }
      }
    }
    this.recordBalanceKill(enemy);
    if (now - this.lastKillAt > this.comboWindowMs) {
      this.comboCount = 0;
      this.comboMultiplier = 1;
      this.killStreak = 0;
      this.comboMilestonesReached.clear(); // Reset milestone tracking
    }
    this.comboCount += 1;
    this.killStreak += 1;
    this.totalKills += 1;
    this.bestComboCount = Math.max(Number(this.bestComboCount) || 0, this.comboCount);
    this.lastKillAt = now;
    this.comboTimerMs = this.comboWindowMs;
    if (enemy?.kind !== 'boss') {
      this.emitTacticalDirectiveEvent('enemy_defeated', {
        sector: this.game?.level || 1,
        enemyType: enemy?.type || enemy?.kind || 'enemy',
        comboCount: this.comboCount,
        count: 1
      });
    }
    this.maybeDropFirstRunPickup(enemy);

    // Check for milestone bonuses (5x, 10x, 15x, 20x)
    for (const milestone of COMBO_MILESTONES) {
      if (this.comboCount === milestone.threshold && !this.comboMilestonesReached.has(milestone.threshold)) {
        this.comboMilestonesReached.add(milestone.threshold);
        const appliedBonus = this.addNormalWaveScore(milestone.bonus, 'baseScore', enemy);
        this.queueEnemyKillToast(sideEffects, `${milestone.label} +${appliedBonus}`, {
          fontSize: 26,
          fill: '#ffaa00',
          slot: 'center',
          type: 'milestone',
          duration: 1800
        });
        this.queueEnemyKillExplosion(sideEffects, this.player?.x, (this.player?.y || 0) - 40, 0xffaa00);
        this.queueEnemyKillShake(sideEffects, 6, 15);
        this.queueEnemyKillComboFlare(sideEffects, {
          threshold: milestone.threshold,
          multiplier: this.comboMultiplier,
          reason: 'combo_milestone',
          color: 0xffaa00,
          accent: 0xffffff
        });
      }
    }

    const prevMultiplier = this.comboMultiplier;
    if (this.comboCount >= 50) this.comboMultiplier = 4;
    else if (this.comboCount >= 25) this.comboMultiplier = 3;
    else if (this.comboCount >= 10) this.comboMultiplier = 2;
    else this.comboMultiplier = 1;

    if (this.comboMultiplier !== prevMultiplier) {
      const label = this.comboMultiplier >= 4 ? 'COMBO 50!' : this.comboMultiplier >= 3 ? 'COMBO 25!' : 'COMBO 10!';
      this.queueEnemyKillToast(sideEffects, label, { fontSize: 24, fill: '#00ffff', slot: 'top', type: 'combo' });
      this.queueEnemyKillExplosion(sideEffects, this.player?.x, this.player?.y, 0x00ffff);
      if (!COMBO_MILESTONES.some((milestone) => milestone.threshold === this.comboCount)) {
        this.queueEnemyKillComboFlare(sideEffects, {
          threshold: this.comboCount,
          multiplier: this.comboMultiplier,
          reason: 'combo_multiplier',
          color: 0x00ffff,
          accent: 0xff66ff
        });
      }
    }

    if (this.comboCount > 0 && this.comboCount % 10 === 0) {
      const bonus = this.getComboScore(100 * (this.comboCount / 10));
      const appliedBonus = this.addNormalWaveScore(bonus, 'baseScore', enemy);
      if (this.comboCount % 20 === 0) {
        this.queueEnemyKillToast(sideEffects, `COMBO BONUS +${appliedBonus}`, { fontSize: 16, fill: '#fff3a2', slot: 'top', type: 'combo', duration: 900, priority: 1 });
      }
    }

    const clutchChance = 0;
    const danger = this.game.lives <= 1;
    if (danger && this.powerupManager && Math.random() < clutchChance) {
      this.powerupManager.spawn(enemy.x, enemy.y);
    }

    // Vampire: score drain on kills without changing lives.
    if (this.player?.vampireActive) {
      // Increment kill counter (reset to 0 when powerup is picked up in Player.js)
      this.player.vampireKillCount++;

      const killsPerDrain = 8;
      if (this.player.vampireKillCount >= killsPerDrain) {
        this.player.vampireKillCount = 0;

        const drainScore = 650;
        const appliedDrainScore = this.game.addScore(drainScore);

        // Visual feedback
        this.enqueueToast(`VAMPIRE DRAIN +${appliedDrainScore}`, {
          fontSize: 18,
          fill: '#ff3366',
          slot: 'top',
          type: 'powerup',
          duration: 1500
        });

        // Red healing particles
        if (this.particleManager && this.player) {
          this.particleManager.createExplosion(this.player.x, this.player.y, 0xff3366);
        }

        AudioManager.playSfx('pickup', { volume: 0.8 });
      } else {
        // Show vampire progress feedback
        const remaining = killsPerDrain - this.player.vampireKillCount;
        if (this.player.vampireKillCount % 2 === 0) { // Show every 2 kills to avoid spam
          this.enqueueToast(`VAMPIRE: ${remaining} kills to drain`, {
            fontSize: 14,
            fill: '#ff6688',
            slot: 'top',
            type: 'info',
            duration: 800
          });
        }
      }
    }
  }

  updateComboTimers(delta) {
    if (this.comboCount <= 0) return;
    if (this.enemyManager?.state === 'BOSS_GATE') return;
    this.comboTimerMs -= delta * 16.67;
    if (this.comboTimerMs <= 0) {
      this.comboCount = 0;
      this.comboMultiplier = 1;
      this.killStreak = 0;
      this.comboMilestonesReached.clear(); // Reset milestones when combo expires
    }
  }

  refreshComboFromBossPressure(enemy) {
    if (this.comboCount <= 0 || enemy?.kind !== 'boss' || enemy?.active === false) return false;
    const sustainMs = Math.min(Math.max(0, Number(this.comboWindowMs) || COMBO_WINDOW_MS), 1400);
    this.comboTimerMs = Math.max(Number(this.comboTimerMs) || 0, sustainMs);
    return true;
  }

  maybeDropFirstRunPickup(enemy) {
    if (this.firstRunPickupDropped || !enemy || this.game?.level !== 1 || this.enemyManager?.currentWaveIndex !== 0) return false;
    this.firstRunKillCount = (this.firstRunKillCount || 0) + 1;
    if (this.firstRunKillCount < 2 || !this.powerupManager || !this.player) return false;

    const width = this.gameplayGame.getWidth();
    const height = this.gameplayGame.getHeight();
    const x = Math.max(width * 0.34, Math.min(width * 0.66, enemy.x || width / 2));
    const y = Math.max(height * 0.42, Math.min(height * 0.58, (enemy.y || height * 0.2) + 26));
    const spawned = this.powerupManager.spawnSpecific(x, y, 'rapid_fire', {
      countDrop: true,
      source: 'first_run_pickup'
    });
    if (!spawned) return false;

    this.firstRunPickupDropped = true;
    this.enqueueToast('RAPID CORE ONLINE', {
      fontSize: 18,
      fill: '#ffd15c',
      slot: 'corner',
      type: 'powerup',
      duration: 1600,
      priority: 1
    });
    return true;
  }

  updateDangerDodgeTimer(delta) {
    if (this.dangerDodgeCount <= 0) return;
    this.dangerDodgeTimerMs -= delta * 16.67;
    if (this.dangerDodgeTimerMs <= 0) {
      this.dangerDodgeCount = 0;
      this.dangerDodgeTimerMs = 0;
    }
  }

  updateGrazeBreakTimer() {
    if (this.grazeBreakReady && this.getGameplayClockMs() > this.grazeBreakExpiresAt) {
      this.grazeBreakReady = false;
      this.grazeBreakNeedsFireRelease = false;
      this.grazeBreakReleasePrimed = false;
    }
  }

  updateGrazeBreakFireIntent(firePressed = false) {
    const pressed = Boolean(firePressed);
    const justPressed = pressed && !this.fireInputWasPressed;
    if (this.grazeBreakReady && this.grazeBreakNeedsFireRelease && this.fireInputWasPressed && !pressed) {
      this.primeGrazeBreakAfterRelease();
    }
    if (justPressed) {
      this.player?.queueBombTriggerIntent?.(this.getGameplayClockMs());
    }
    this.currentFirePressed = pressed;
    this.fireInputWasPressed = pressed;
  }

  primeGrazeBreakAfterRelease() {
    if (!this.grazeBreakReady || !this.grazeBreakNeedsFireRelease) return false;
    if (this.getGameplayClockMs() > this.grazeBreakExpiresAt) {
      this.grazeBreakReady = false;
      this.grazeBreakNeedsFireRelease = false;
      this.grazeBreakReleasePrimed = false;
      return false;
    }
    this.grazeBreakNeedsFireRelease = false;
    this.grazeBreakReleasePrimed = true;
    this.player?.pulseHitboxReticle?.('graze_break_primed', 1150);
    this.showToast(translateText('GRAZE BREAK PRIMED'), {
      fontSize: this.game.getWidth() < 620 ? 15 : 19,
      fill: '#ff88ff',
      stroke: '#130018',
      strokeThickness: this.game.getWidth() < 620 ? 2 : 3,
      slot: 'corner',
      type: 'dangerDodge',
      priority: 3,
      duration: 900
    });
    AudioManager.playSfx('combo_tick', { volume: 0.44, minIntervalMs: 220 });
    return true;
  }

  armGrazeBreak() {
    const now = this.getGameplayClockMs();
    if (this.grazeBreakReady || now < this.grazeBreakCooldownAt) return false;

    this.grazeBreakReady = true;
    this.grazeBreakArmedAt = now;
    this.grazeBreakExpiresAt = now + 6500;
    this.grazeBreakCooldownAt = now + 2400;
    this.grazeBreakNeedsFireRelease = Boolean(this.currentFirePressed);
    this.grazeBreakReleasePrimed = !this.grazeBreakNeedsFireRelease;
    this.player?.pulseHitboxReticle?.('graze_break_armed', 1200);
    this.showToast(translateText('GRAZE BREAK ARMED'), {
      fontSize: this.game.getWidth() < 620 ? 16 : 21,
      fill: '#ff66ff',
      stroke: '#130018',
      strokeThickness: this.game.getWidth() < 620 ? 2 : 3,
      slot: 'corner',
      type: 'dangerDodge',
      priority: 3,
      duration: 950
    });
    AudioManager.playSfx('combo_tick', { force: true, volume: 0.62, minIntervalMs: 180 });
    return true;
  }

  markGrazeBreakShot(bullets = []) {
    if (!this.grazeBreakReady || this.getGameplayClockMs() > this.grazeBreakExpiresAt || !Array.isArray(bullets) || !bullets.length) {
      this.grazeBreakReady = false;
      this.grazeBreakNeedsFireRelease = false;
      this.grazeBreakReleasePrimed = false;
      return null;
    }
    if (this.grazeBreakNeedsFireRelease) return null;

    const eligible = bullets
      .filter(bullet => bullet?.active !== false && bullet.isPlayer)
      .sort((a, b) => Math.abs(a.vx || 0) - Math.abs(b.vx || 0))[0];
    if (!eligible) return null;

    this.grazeBreakToken += 1;
    eligible.isGrazeBreaker = true;
    eligible.grazeBreakToken = this.grazeBreakToken;
    eligible.damage = Math.max(eligible.damage || 1, (eligible.damage || 1) * 1.18);
    eligible.radius = Math.max(eligible.radius || 7, 11);
    if (eligible.core) eligible.core.tint = 0xff66ff;
    if (eligible.sprite) {
      const ring = new PIXI.Graphics();
      ring.circle(0, 0, eligible.radius + 9);
      ring.stroke({ color: 0xff66ff, width: 3, alpha: 0.85 });
      eligible.sprite.addChild(ring);
    }
    this.grazeBreakReady = false;
    this.grazeBreakNeedsFireRelease = false;
    this.grazeBreakReleasePrimed = false;
    return eligible;
  }

  clearGrazeBreakVisual(reason = 'cleared') {
    const active = this.activeGrazeBreakVisual;
    if (!active) return false;
    if (active.ticker && this.game?.app?.ticker) {
      this.game.app.ticker.remove(active.ticker);
      this._activeTickers = (this._activeTickers || []).filter((ticker) => ticker !== active.ticker);
    }
    if (active.layer?.parent) active.layer.parent.removeChild(active.layer);
    active.layer?.destroy?.({ children: true });
    if (this.lastGrazeBreakVisualDebug) {
      this.lastGrazeBreakVisualDebug.active = false;
      this.lastGrazeBreakVisualDebug.endedReason = reason;
      this.lastGrazeBreakVisualDebug.elapsedMs = Math.round(Math.max(0, Number(active.elapsedMs) || 0));
    }
    this.activeGrazeBreakVisual = null;
    return true;
  }

  createGrazeBreakSpectacle(x, y, mechanicalRadius = 110) {
    const host = this.gameContainer || this.container;
    const tickerHost = this.game?.app?.ticker;
    if (!host || !tickerHost) return null;
    this.clearGrazeBreakVisual('replaced');

    const width = Math.max(1, Number(this.gameplayGame?.getWidth?.() || this.game?.getWidth?.()) || 1280);
    const height = Math.max(1, Number(this.gameplayGame?.getHeight?.() || this.game?.getHeight?.()) || 720);
    const reducedMotion = Boolean(getAccessibilitySettings().prefersReducedMotion);
    const radius = Math.max(1, Number(mechanicalRadius) || 110);
    const visualRadius = Math.max(radius, Math.min(Math.max(width, height) * 0.42, radius * 3));
    const visualScale = visualRadius / radius;
    const ringCount = reducedMotion ? 3 : 5;
    const sparkleCount = reducedMotion ? 14 : (width < 620 ? 22 : 32);
    const filamentCount = reducedMotion ? 8 : 16;
    const durationMs = reducedMotion ? 900 : 1180;
    const sparkleProfiles = Array.from({ length: sparkleCount }, (_, index) => ({
      angle: (Math.PI * 2 * index) / sparkleCount + (index % 5) * 0.07,
      lane: 0.48 + (index % 6) * 0.09,
      phase: index * 1.73,
      size: 2.8 + (index % 4) * 0.85
    }));

    const layer = new PIXI.Container();
    layer.label = 'grazeBreakSpectacle';
    layer.position.set(x, y);
    layer.zIndex = 54;
    layer.eventMode = 'none';

    const graphics = new PIXI.Graphics();
    graphics.blendMode = 'add';
    layer.addChild(graphics);
    host.addChild(layer);
    host.sortChildren?.();

    const active = {
      layer,
      graphics,
      ticker: null,
      elapsedMs: 0,
      durationMs,
      mechanicalRadius: radius,
      visualRadius,
      visualScale,
      ringCount,
      sparkleCount,
      filamentCount,
      reducedMotion
    };

    const drawDiamond = (cx, cy, angle, size, color, alpha) => {
      const radialX = Math.cos(angle);
      const radialY = Math.sin(angle);
      const tangentX = -radialY;
      const tangentY = radialX;
      graphics.poly([
        cx + radialX * size, cy + radialY * size,
        cx + tangentX * size * 0.72, cy + tangentY * size * 0.72,
        cx - radialX * size, cy - radialY * size,
        cx - tangentX * size * 0.72, cy - tangentY * size * 0.72
      ]);
      graphics.fill({ color, alpha });
    };

    const draw = () => {
      const t = Math.max(0, Math.min(1, active.elapsedMs / durationMs));
      const intro = Math.min(1, t / 0.12);
      const fade = Math.pow(1 - t, 0.72);
      const expansion = 1 - Math.pow(1 - Math.min(1, t * 1.12), 3);
      const pulse = reducedMotion ? 0 : Math.sin(active.elapsedMs * 0.018) * 0.5 + 0.5;
      const coreFade = Math.max(0, 1 - t / 0.22);
      const outerRadius = visualRadius * (0.16 + expansion * 0.84);
      graphics.clear();

      if (coreFade > 0) {
        graphics.circle(0, 0, Math.max(8, radius * (0.22 + intro * 0.18)));
        graphics.fill({ color: 0xffffff, alpha: 0.7 * coreFade * intro });
        graphics.circle(0, 0, Math.max(14, radius * (0.44 + intro * 0.16)));
        graphics.stroke({ color: 0xff55dd, width: 5, alpha: 0.86 * coreFade * intro });
      }

      for (let index = 0; index < ringCount; index += 1) {
        const ringProgress = Math.max(0, Math.min(1, expansion + index * 0.055));
        const ringRadius = visualRadius * (0.18 + ringProgress * (0.72 + index * 0.025));
        graphics.circle(0, 0, ringRadius);
        graphics.stroke({
          color: index % 3 === 0 ? 0xffffff : index % 2 === 0 ? 0x42f6ff : 0xff55dd,
          width: Math.max(1.2, 4.2 - index * 0.58),
          alpha: (0.48 - index * 0.055) * fade * intro
        });
      }

      const filamentSpin = reducedMotion ? 0 : active.elapsedMs * 0.0024;
      for (let index = 0; index < filamentCount; index += 1) {
        const angle = filamentSpin + (Math.PI * 2 * index) / filamentCount;
        const inner = outerRadius * (0.24 + (index % 3) * 0.045);
        const outer = outerRadius * (0.74 + (index % 4) * 0.065);
        const bend = angle + (index % 2 ? 0.12 : -0.12);
        graphics.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        graphics.lineTo(Math.cos(bend) * outer, Math.sin(bend) * outer);
      }
      graphics.stroke({ color: 0xff79e8, width: reducedMotion ? 1.2 : 1.8, alpha: 0.22 * fade * intro });

      for (let index = 0; index < sparkleProfiles.length; index += 1) {
        const profile = sparkleProfiles[index];
        const angle = profile.angle + (reducedMotion ? 0 : active.elapsedMs * 0.0018 * (index % 2 ? 1 : -1));
        const sparkleRadius = outerRadius * profile.lane + Math.sin(active.elapsedMs * 0.015 + profile.phase) * (reducedMotion ? 0 : 8);
        const size = profile.size * (0.72 + pulse * 0.42) * Math.max(0.42, fade);
        drawDiamond(
          Math.cos(angle) * sparkleRadius,
          Math.sin(angle) * sparkleRadius,
          angle,
          size,
          index % 4 === 0 ? 0xffffff : index % 2 === 0 ? 0x42f6ff : 0xff55dd,
          (0.5 + (index % 3) * 0.1) * fade * intro
        );
      }

      graphics.circle(0, 0, Math.max(radius * 0.72, outerRadius * 0.34));
      graphics.stroke({ color: 0xffd45c, width: 1.6, alpha: 0.2 * fade * intro });

      this.lastGrazeBreakVisualDebug = {
        active: true,
        visible: Boolean(layer.parent && fade > 0.02),
        endedReason: null,
        mechanicalRadius: Math.round(radius),
        visualRadius: Math.round(visualRadius),
        visualScale: Number(visualScale.toFixed(2)),
        ringCount,
        sparkleCount,
        filamentCount,
        reducedMotion,
        dangerCoreVisible: coreFade > 0.02,
        elapsedMs: Math.round(active.elapsedMs),
        durationMs
      };
    };

    const ticker = (delta) => {
      if (!layer.parent || this.game?.currentScene !== this) {
        this.clearGrazeBreakVisual('scene_changed');
        return;
      }
      if (!this.isGameplayClockAdvancing()) return;
      active.elapsedMs += (Number(delta?.deltaTime) || Number(delta) || 0) * 16.67;
      draw();
      if (active.elapsedMs >= durationMs) this.clearGrazeBreakVisual('complete');
    };
    active.ticker = ticker;
    this.activeGrazeBreakVisual = active;
    if (!this._activeTickers) this._activeTickers = [];
    this._activeTickers.push(ticker);
    tickerHost.add(ticker);
    draw();

    this.particleManager?.createRadialBurst?.(x, y, 0xff55dd, {
      count: reducedMotion ? 24 : 52,
      intensity: reducedMotion ? 0.82 : 1.1,
      minSpeed: 1.8,
      maxSpeed: 7.2,
      size: reducedMotion ? 2.2 : 2.9,
      lifetime: reducedMotion ? 38 : 58,
      alternateColor: 0xffffff,
      upwardBias: 0
    });
    this.particleManager?.createRadialBurst?.(x, y, 0x42f6ff, {
      count: reducedMotion ? 14 : 30,
      intensity: reducedMotion ? 0.68 : 0.88,
      minSpeed: 0.8,
      maxSpeed: 4.6,
      size: reducedMotion ? 1.6 : 2.1,
      lifetime: reducedMotion ? 44 : 68,
      alternateColor: 0xffd45c,
      upwardBias: 0
    });
    return { ...this.lastGrazeBreakVisualDebug };
  }

  triggerGrazeBreak(playerBullet, enemyBullet) {
    if (!playerBullet?.active || !enemyBullet?.active) return null;
    this.recordCombatProjectileHit(playerBullet);

    const impactX = Number.isFinite(enemyBullet.x) ? enemyBullet.x : playerBullet.x;
    const impactY = Number.isFinite(enemyBullet.y) ? enemyBullet.y : playerBullet.y;
    const radius = Math.max(92, Math.min(150, this.game.getWidth() * 0.13));
    const token = playerBullet.grazeBreakToken || 0;

    this.bulletManager.deactivateBullet?.(playerBullet, 'graze_break_trigger');
    this.bulletManager.deactivateBullet?.(enemyBullet, 'graze_break_trigger');
    this.bulletManager.pruneInactiveBullets?.('player', 'graze_break_trigger');

    const cleared = [{ x: Math.round(enemyBullet.x), y: Math.round(enemyBullet.y) }];
    for (const bullet of this.bulletManager.enemyBullets || []) {
      if (!bullet || bullet === enemyBullet || bullet.active === false) continue;
      const dist = Math.hypot((bullet.x || 0) - impactX, (bullet.y || 0) - impactY);
      if (dist > radius + (bullet.radius || 6)) continue;
      this.bulletManager.deactivateBullet?.(bullet, 'graze_break_radius');
      cleared.push({ x: Math.round(bullet.x), y: Math.round(bullet.y) });
      this.particleManager?.createHitSpark(bullet.x, bullet.y, 0xff66ff);
    }
    this.bulletManager.pruneInactiveBullets?.('enemy', 'graze_break_radius');

    let enemiesHit = 0;
    let enemiesDestroyed = 0;
    for (const enemy of this.enemyManager?.enemies || []) {
      if (!enemy?.active || enemy.waitingForEntry || enemy.kind === 'boss') continue;
      const dist = Math.hypot((enemy.x || 0) - impactX, (enemy.y || 0) - impactY);
      if (dist > radius + (enemy.radius || 16)) continue;
      enemiesHit += 1;
      const destroyed = this.applyCombatDamage(
        enemy,
        Math.max(1.25, Number(playerBullet.damage || 1) * 1.25),
        'graze_break'
      );
      this.particleManager?.createHitSpark(enemy.x, enemy.y, 0xff66ff);
      if (destroyed) {
        enemiesDestroyed += 1;
        const scoreAwarded = this.getNormalWaveScoreAward(this.getComboScore(enemy.scoreValue), enemy);
        const appliedScore = this.game.addScore(scoreAwarded);
        this.scorePopupManager?.addScorePopup(enemy.x, enemy.y, appliedScore);
        this.onEnemyKilled(enemy);
        this.playEnemyDeathFeedback(enemy, { color: 0xff66ff, intensity: 0.72, volume: 0.44 });
      }
    }

    const comboMult = Math.max(1, this.comboMultiplier || 1);
    const bonusScore = this.getNormalWaveScoreAward(
      Math.round((520 + cleared.length * 85 + enemiesHit * 160 + enemiesDestroyed * 220) * comboMult)
    );
    const appliedBonusScore = this.game.addScore(bonusScore);
    this.scorePopupManager?.addScorePopup(impactX, impactY, appliedBonusScore, {
      comboEligible: false,
      color: 0xff66ff
    });
    this.enqueueToast(`GRAZE BREAK +${appliedBonusScore}`, {
      fontSize: this.game.getWidth() < 620 ? 18 : 24,
      fill: '#ff66ff',
      stroke: '#140018',
      strokeThickness: this.game.getWidth() < 620 ? 2 : 4,
      slot: 'top',
      type: 'dangerDodge',
      priority: 4,
      duration: 1200
    });
    this.triggerShockwave?.(impactX, impactY, 0xff66ff);
    const spectacle = this.createGrazeBreakSpectacle(impactX, impactY, radius);
    this.particleManager?.createNearMissEffect(impactX, impactY, Math.max(4, this.dangerDodgeCount + 2));
    this.screenShake?.shake(this.game.getWidth() < 620 ? 5 : 8, 16);
    AudioManager.playSfx('combo_breakout', { force: true, volume: 0.92, minIntervalMs: 220 });
    AudioManager.playSfx('nova_highscore_chime', { force: true, volume: 0.34, minIntervalMs: 0 });
    AudioManager.playSfx('impactMetal', { volume: 0.34, minIntervalMs: 90 });

    this.lastGrazeBreak = {
      triggered: true,
      startedAt: Date.now(),
      durationMs: 950,
      token,
      x: Math.round(impactX),
      y: Math.round(impactY),
      radius: Math.round(radius),
      visualRadius: spectacle?.visualRadius || Math.round(radius),
      visualScale: spectacle?.visualScale || 1,
      visualRingCount: spectacle?.ringCount || 0,
      visualSparkleCount: spectacle?.sparkleCount || 0,
      visualFilamentCount: spectacle?.filamentCount || 0,
      bulletsCleared: cleared.length,
      enemiesHit,
      enemiesDestroyed,
      bonusScore
    };
    this.grazeBreaksThisRun = (Number(this.grazeBreaksThisRun) || 0) + 1;
    this.emitRunContractEvent('graze_break', {
      sector: this.game?.level || 1,
      count: this.grazeBreaksThisRun,
      bulletsCleared: cleared.length,
      enemiesDestroyed
    });
    this.grazeBreakCooldownAt = this.getGameplayClockMs() + 5200;
    return this.lastGrazeBreak;
  }

  tryApplyEnemyShipGraze(enemy) {
    if (!enemy || !this.player?.active || enemy.active === false) return false;
    const routeGrazeEligible = enemy.state === 'DIVE'
      || enemy.state === 'RETURN'
      || Boolean(
        (enemy.isMayhemReinforcement || enemy.isReinforcementSwarmEntry)
        && enemy.state === 'ENTRY'
      );
    if (
      !routeGrazeEligible
      || enemy.shipGrazeTriggered
      || this.player.invulnerable
      || this.player.isGhostActive?.()
    ) return false;
    const enemyDistance = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
    const contactRadius = (enemy.radius || 15) + (this.player.radius || 12);
    if (enemyDistance <= contactRadius || enemyDistance >= contactRadius + 20) return false;
    const applied = this.applyNearMiss(enemy, {
      source: 'ship',
      scoreMultiplier: 0.35,
      labelKey: 'SHIP GRAZE'
    });
    if (applied) enemy.shipGrazeTriggered = true;
    return applied;
  }

  applyNearMiss(bullet, {
    source = 'bullet',
    scoreMultiplier = 1,
    labelKey = 'NEAR MISS'
  } = {}) {
    const now = Date.now();
    if (now < this.nearMissCooldownAt) return false;
    this.nearMissCooldownAt = now + 450;
    if (now - this.lastNearMissAt > 2200) {
      this.dangerDodgeCount = 0;
    }
    this.lastNearMissAt = now;
    this.dangerDodgeCount += 1;
    this.dangerDodgeTimerMs = 2200;
    this.bestDangerDodgeStreak = Math.max(this.bestDangerDodgeStreak, this.dangerDodgeCount);
    this.emitRunContractEvent('near_miss', {
      sector: this.game?.level || 1,
      streak: this.dangerDodgeCount,
      source
    });
    this.emitTacticalDirectiveEvent('near_miss', {
      sector: this.game?.level || 1,
      streak: this.dangerDodgeCount,
      source
    });
    const comboMult = Math.max(1, this.comboMultiplier);
    const traitMult = Number(this.player?.traitCombat?.nearMissScoreMult || 1);
    const streakBonus = Math.min(100, 25 + this.dangerDodgeCount * 15);
    const score = Math.max(1, Math.round(
      streakBonus
      * comboMult
      * (Number.isFinite(traitMult) ? traitMult : 1)
      * Math.max(0, Number(scoreMultiplier) || 0)
    ));
    const appliedScore = this.game.addScore(score);
    this.lastDangerDodgeScore = appliedScore;
    this.player?.markNearMissStreakVisual?.(this.dangerDodgeCount, this.dangerDodgeTimerMs || 2200, {
      sourceX: bullet?.x,
      sourceY: bullet?.y
    });
    const grazePlating = this.player?.recordRunAugmentNearMiss?.(this.game?.level || 1);
    if (grazePlating?.granted) {
      this.enqueueToast(translateText('GRAZE PLATING ONLINE'), {
        fontSize: 18,
        fill: '#9effe5',
        slot: 'top',
        type: 'tactical_draft',
        priority: 5,
        duration: 1100
      });
      AudioManager.playSfx('tactical_graze_plating', { force: true, volume: 0.76, minIntervalMs: 500 });
    }
    const nearMissLabel = translateText(labelKey);
    const label = this.dangerDodgeCount >= 2
      ? `${nearMissLabel} x${this.dangerDodgeCount} +${appliedScore}`
      : `${nearMissLabel} +${appliedScore}`;
    this.enqueueToast(label, {
      fontSize: this.dangerDodgeCount >= 3 ? 18 : 16,
      fill: '#ffcc00',
      slot: 'top',
      type: 'dangerDodge',
      priority: this.dangerDodgeCount >= 2 ? 3 : 1,
      duration: 950
    });
    if (this.particleManager) {
      if (typeof this.particleManager.createNearMissEffect === 'function') {
        this.particleManager.createNearMissEffect(this.player.x, this.player.y, this.dangerDodgeCount);
      } else {
        this.particleManager.createHitSpark(this.player.x, this.player.y);
      }
    }
    if (this.scorePopupManager && this.player) {
      const nearMissPopupLift = this.dangerDodgeCount >= 3 ? 62 : 42;
      this.scorePopupManager.addScorePopup(this.player.x, this.player.y - nearMissPopupLift, appliedScore, {
        comboEligible: false,
        color: this.dangerDodgeCount >= 3 ? 0xff66ff : 0xffcc00,
        prefix: this.dangerDodgeCount >= 2 ? `${nearMissLabel} x${this.dangerDodgeCount}` : nearMissLabel,
        type: 'nearMiss',
        fontSize: this.dangerDodgeCount >= 3 ? 21 : 19,
        maxLifetime: 950
      });
    }
    if (this.dangerDodgeCount >= 3) {
      AudioManager.playSfx('combo_tick', { volume: 0.56 });
      this.armGrazeBreak();
      this.triggerCabinetLog('near-miss-streak', {
        streak: this.dangerDodgeCount,
        source: 'near_miss_streak'
      });
    }
    this.triggerNearMissSurge();
    return true;
  }

  applyShipTraitBulletImpact(bullet, sourceEnemy) {
    if (!bullet?.isPlayer || !sourceEnemy || sourceEnemy.__traitImpactSource) return;
    const combat = this.player?.traitCombat || {};
    const accent = this.player?.visualVariant?.accent || this.player?.visualVariant?.glow || 0x66ffff;

    if (bullet.isTraitCriticalShot) {
      const radius = 68 + Math.round(Math.max(0, Number(combat.critDamageMult || 1.35) - 1.3) * 70);
      const splashDamage = Math.max(0.35, Number(bullet.damage || 1) * 0.32);
      let splashed = 0;

      this.enemyManager.enemies.forEach(enemy => {
        if (!enemy?.active || enemy === sourceEnemy) return;
        const dist = Math.hypot((enemy.x || 0) - sourceEnemy.x, (enemy.y || 0) - sourceEnemy.y);
        if (dist > radius) return;

        enemy.__traitImpactSource = true;
        const destroyed = this.applyCombatDamage(enemy, splashDamage, 'ship_trait');
        enemy.__traitImpactSource = false;
        splashed += 1;
        if (this.particleManager) this.particleManager.createHitSpark(enemy.x, enemy.y, accent);

        if (destroyed) {
          const scoreAwarded = this.getNormalWaveScoreAward(this.getComboScore(enemy.scoreValue), enemy);
          const appliedScore = this.game.addScore(scoreAwarded);
          if (this.scorePopupManager) this.scorePopupManager.addScorePopup(enemy.x, enemy.y, appliedScore);
          this.onEnemyKilled(enemy);
          this.playEnemyDeathFeedback(enemy, { color: accent, intensity: 0.82, volume: 0.42 });
        }
      });

      if (splashed > 0) {
        AudioManager.playSfx('trait_crit_splash', { volume: 0.78 });
        this.enqueueToast(`TRAIT SPLASH x${splashed}`, { fontSize: 15, fill: '#fff45c', slot: 'top', type: 'trait', duration: 700 });
        this.screenShake?.shake(2);
      }
    }

    if (bullet.isTraitPiercingShot) {
      bullet.traitPierceHits = (bullet.traitPierceHits || 0) + 1;
      if (this.particleManager) this.particleManager.createHitSpark(sourceEnemy.x, sourceEnemy.y, 0xffffff);
      AudioManager.playSfx('trait_pierce_hit', { volume: 0.58 });
      if (bullet.traitPierceHits >= 3) {
        this.bulletManager?.deactivateBullet?.(bullet, 'trait_pierce_limit');
      }
    }

    if (bullet.isTraitBonusShot) {
      const bonusScore = Math.max(3, Math.round(8 * Number(combat.nearMissScoreMult || 1)));
      const appliedBonusScore = this.game.addScore(bonusScore);
      if (this.scorePopupManager) this.scorePopupManager.addScorePopup(sourceEnemy.x, sourceEnemy.y - 12, appliedBonusScore);
      AudioManager.playSfx('trait_bonus_hit', { volume: 0.12, minIntervalMs: 650 });
      this.triggerCabinetLog('bonus-trait-hit', {
        source: 'trait_bonus_hit'
      });
    }

    if (bullet.isTraitWingShot) {
      const wingScore = Math.max(2, Math.round(5 * Math.max(1, this.comboMultiplier || 1)));
      const appliedWingScore = this.game.addScore(wingScore);
      if (this.scorePopupManager) this.scorePopupManager.addScorePopup(sourceEnemy.x, sourceEnemy.y - 18, appliedWingScore);
      AudioManager.playSfx('trait_wing_hit', { volume: 0.68 });
      const now = Date.now();
      if (now - this.lastTraitImpactToastAt > 900) {
        this.lastTraitImpactToastAt = now;
        this.enqueueToast(`WING HIT +${appliedWingScore}`, { fontSize: 14, fill: '#66ff99', slot: 'top', type: 'trait', duration: 650 });
      }
      this.triggerCabinetLog('wing-trait-hit', {
        source: 'trait_wing_hit'
      });
    }
  }

  getComboScore(points) {
    const base = Number(points) || 0;
    return Math.round(base * Math.max(1, this.comboMultiplier));
  }

  isNormalWaveScoreCompensationEligible(enemy = null) {
    if (this.enemyManager?.phase !== 'WAVES') return false;
    if (enemy?.kind === 'boss' || enemy?.kind === 'bonus_drone' || enemy instanceof BonusDrone) return false;
    return getRunModeNormalWaveScoreXpMultiplier(this.game?.runMode) > 1;
  }

  getNormalWaveScoreAward(points, enemy = null) {
    const base = Number(points) || 0;
    const mult = this.isNormalWaveScoreCompensationEligible(enemy)
      ? getRunModeNormalWaveScoreXpMultiplier(this.game?.runMode)
      : 1;
    return Math.round(base * mult);
  }

  addNormalWaveScore(points, source = 'baseScore', enemy = null) {
    return this.game.addScore(this.getNormalWaveScoreAward(points, enemy), source);
  }

  triggerChainLightning(sourceEnemy, baseDamage) {
    if (!this.player?.chainLightningActive || !sourceEnemy) {
      this.lastChainLightning = {
        triggered: false,
        reason: !sourceEnemy ? 'missing_source' : 'inactive'
      };
      return this.lastChainLightning;
    }

    const maxChains = this.player.chainLightningMaxChains || 3;
    const chainRange = 150; // pixels
    const damageMultiplier = 0.5; // 50% of original damage per chain

    const chainedEnemies = [sourceEnemy];
    const chainedEnemySet = new Set(chainedEnemies);
    const targetPool = (this.enemyManager?.enemies || []).filter(Boolean);
    const hijacker = this.enemyManager?.hijacker;
    if (hijacker?.active && !targetPool.includes(hijacker)) targetPool.push(hijacker);
    const hitTargets = [];
    let currentEnemy = sourceEnemy;

    for (let i = 0; i < maxChains; i++) {
      // Find nearest unchained enemy
      let nearest = null;
      let nearestDist = chainRange;

      targetPool.forEach(enemy => {
        if (enemy.active && !chainedEnemySet.has(enemy)) {
          const dist = Math.hypot(enemy.x - currentEnemy.x, enemy.y - currentEnemy.y);
          if (dist < nearestDist) {
            nearest = enemy;
            nearestDist = dist;
          }
        }
      });

      if (!nearest) break;

      // Draw lightning arc
      this.drawLightningArc(currentEnemy.x, currentEnemy.y, nearest.x, nearest.y);

      // Deal damage
      const chainDamage = baseDamage * damageMultiplier;
      const destroyed = this.applyCombatDamage(nearest, chainDamage, 'chain_lightning');
      const targetIsHijacker = nearest.kind === 'hijacker' || nearest === hijacker;
      hitTargets.push({
        target: nearest,
        kind: nearest.kind || nearest.type || 'enemy',
        distance: nearestDist,
        damage: chainDamage,
        destroyed,
        scoreHandledByTarget: targetIsHijacker && destroyed
      });

      if (destroyed) {
        // Award score
        if (!targetIsHijacker && !this.player.isSlowTimeActive?.()) {
          const scoreAwarded = this.getComboScore(nearest.scoreValue);
          const appliedScore = this.game.addScore(this.getNormalWaveScoreAward(scoreAwarded, nearest));
          if (this.scorePopupManager) {
            this.scorePopupManager.addScorePopup(nearest.x, nearest.y, appliedScore);
          }
        }
        this.onEnemyKilled(nearest);
        this.playEnemyDeathFeedback(nearest, { volume: 0.4 });
      } else {
        this.particleManager?.createHitSpark?.(
          nearest.x,
          nearest.y,
          targetIsHijacker ? 0x8fffff : undefined
        );
      }

      chainedEnemies.push(nearest);
      chainedEnemySet.add(nearest);
      currentEnemy = nearest;
    }

    // Play lightning sound if any chains happened
    if (chainedEnemies.length > 1) {
      AudioManager.playSfx('chain_lightning_arc', { volume: 0.62 });
    }
    this.lastChainLightning = {
      triggered: hitTargets.length > 0,
      reason: hitTargets.length > 0 ? 'chained' : 'no_target',
      source: sourceEnemy,
      sourceKind: sourceEnemy.kind || sourceEnemy.type || 'enemy',
      maxChains,
      chainRange,
      damageMultiplier,
      hitCount: hitTargets.length,
      hitTargets,
      audioEvents: hitTargets.length > 0 ? 1 : 0
    };
    return this.lastChainLightning;
  }

  drawLightningArc(x1, y1, x2, y2) {
    const graphics = new PIXI.Graphics();

    // Draw jagged lightning effect
    const segments = 5;
    const jitter = 8;

    graphics.moveTo(x1, y1);

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
      const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter;
      graphics.lineTo(x, y);
    }

    graphics.lineTo(x2, y2);
    graphics.stroke({ color: 0x88ffff, width: 2, alpha: 0.8 });

    this.container.addChild(graphics);

    // Fade out and remove
    setTimeout(() => {
      if (graphics.parent) {
        graphics.parent.removeChild(graphics);
      }
    }, 100);
  }

  initMetaProgress() {
    try {
      const rawXp = localStorage.getItem('burt_season_xp');
      this.seasonXp = rawXp ? Number(rawXp) : 0;
      const rawUnlocks = localStorage.getItem('burt_season_unlocks');
      this.seasonUnlocks = rawUnlocks ? JSON.parse(rawUnlocks) : {};
    } catch {
      this.seasonXp = 0;
      this.seasonUnlocks = {};
    }
    this.seasonLevel = Math.floor(this.seasonXp / 5000);
  }

  applySeasonCosmetics() {
    if (!this.player) return;
    const style = this.seasonLevel % 3;
    const styles = [
      { auraColor: 0x66ffff, muzzleColor: 0xffffff },
      { auraColor: 0xffcc00, muzzleColor: 0xffcc00 },
      { auraColor: 0x66ff66, muzzleColor: 0x66ff66 }
    ];
    this.player.setCosmetics(styles[style] || styles[0]);
  }

  updateMetaProgress(deltaScore, bossDefeated) {
    const gain = Math.max(0, Math.floor(deltaScore * 0.1)) + (bossDefeated ? 500 : 0);
    if (!gain) return;
    this.seasonXp += gain;
    const newLevel = Math.floor(this.seasonXp / 5000);
    if (newLevel > this.seasonLevel) {
      this.seasonLevel = newLevel;
      const unlockKey = `season_${newLevel}`;
      if (!this.seasonUnlocks[unlockKey]) {
        this.seasonUnlocks[unlockKey] = true;
        this.showUnlockToast(`UNLOCKED STYLE ${newLevel}`);
      }
      this.applySeasonCosmetics();
    }
    this.markSeasonProgressDirty();
  }

  showUnlockToast(text) {
    this.enqueueToast(text, { fontSize: 22, fill: '#ffcc00', slot: 'top', type: 'unlock', duration: 1400 });
    AudioManager.playSfx('pickup', { force: true, volume: 0.8 });
  }

  updateDevOverlay() {
    if (!this.canUseMaintainerDevtools()) return;
    if (!this.debugOverlayEnabled) return;
    if (!this.devOverlay) {
      this.devOverlay = createText('', {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: 12,
        fill: '#00ffcc'
      });
      this.devOverlay.anchor.set(0, 1);
      this.devOverlay.x = 8;
      this.devOverlay.y = this.game.getHeight() - 8;
      this.uiOverlay.addChild(this.devOverlay);
    }
    const synergy = this.player?.synergyState?.type || 'none';
    const powerup = this.player?.activePowerup?.type || 'none';
    const weapon = this.player?.weaponProfileName || 'na';
    this.devOverlay.text =
      `COMBO:${this.comboCount}x${this.comboMultiplier} STREAK:${this.killStreak}\n` +
      `PU:${powerup} SYN:${synergy} WEAPON:${weapon}`;
  }
  updateAmbientBonusDrones(delta) {
    // WAVE FIX: Use spawn gate from EnemyManager
    const canSpawn = this.enemyManager && this.enemyManager.allowBonusDroneSpawns();

    // 1. Spawning hazard drones
    // WAVE FIX: Don't spawn during wave ending or cleanup
    if (canSpawn) {
      this.ambientBonusDroneTimer -= delta * 16.67;
      if (this.ambientBonusDroneTimer <= 0) {
        this.spawnAmbientBonusDrone('HAZARD');
        this.ambientBonusDroneTimer = 4000 + Math.random() * 4000;
      }
    }

    // 2. Spawn bonus core powerup logic
    // WAVE FIX: Don't spawn during wave ending or cleanup
    if (canSpawn) {
      const config = BalanceConfig.powerups.bonusCore;
      const now = Date.now();
      const runTime = this.gameTime * 1000; // approx ms

      // Conditions:
      // - Not waiting for cooldown
      // - Game time > 20s
      // - No bonus core currently exists
      // - Player not already boosted (optional, but requested "If player already has the same active effect, do NOT spawn" - checking boost simpler here)
      if (!this.hasActiveBonusCore &&
        now - this.lastBonusCoreTime > config.cooldown &&
        runTime > config.minTime &&
        this.scoreMultiplier === 1) { // Don't spawn if boost active

        if (Math.random() < config.spawnChance) {
          this.spawnAmbientBonusDrone('POWERUP');
          this.lastBonusCoreTime = now;
          this.hasActiveBonusCore = true;
          this.showToast("BONUS CORE APPEARED!", { fontSize: 24, fill: '#ffffff', y: 100 });
        }
      }
    }

    // Update existing
    // TASK 1: Count remaining hazard drones for wave easing
    const hazardCount = this.ambientBonusDrones.filter(b => b.type === 'HAZARD' && b.active).length;
    const ambientHazardTimeScale = this.player?.isSlowTimeActive?.()
      ? (this.player?.getSlowTimeHazardScale?.() ?? 0.35)
      : 1;

    this.ambientBonusDrones = this.ambientBonusDrones.filter(bonusDrone => {
      // Check if manually removed or destroyed
      if (!bonusDrone.active) {
        bonusDrone.destroy?.();
        if (bonusDrone.sprite && bonusDrone.sprite.parent) bonusDrone.sprite.parent.removeChild(bonusDrone.sprite);
        if (bonusDrone.type === 'POWERUP' && !bonusDrone.active) this.hasActiveBonusCore = false;
        return false;
      }

      const updateDelta = bonusDrone.type === 'HAZARD' ? delta * ambientHazardTimeScale : delta;
      bonusDrone.update(updateDelta, hazardCount); // Pass hazard count for wave easing
      return true;
    });
  }

  cleanupSkippedFrameVisuals(reason = 'skipped_frame') {
    this.enemyManager?.sweepInactiveEnemyVisuals?.(reason);
    this.sweepOrphanEnemyVisuals(reason);
    if (reason !== 'frame_start') this.clearStragglerBeacon(reason);
    if (reason !== 'frame_start') this.clearPickupEffects(reason);
    if (Array.isArray(this.ambientBonusDrones) && this.ambientBonusDrones.length > 0) {
      this.ambientBonusDrones = this.ambientBonusDrones.filter(bonusDrone => {
        if (bonusDrone?.active !== false && bonusDrone?.destroyed !== true) return true;
        if (bonusDrone?.sprite?.parent) bonusDrone.sprite.parent.removeChild(bonusDrone.sprite);
        bonusDrone?.destroy?.();
        if (bonusDrone?.type === 'POWERUP') this.hasActiveBonusCore = false;
        return false;
      });
    }
    if (Array.isArray(this.powerupManager?.powerups) && this.powerupManager.powerups.length > 0) {
      this.powerupManager.powerups = this.powerupManager.powerups.filter(powerup => {
        if (powerup?.active !== false && powerup?.destroyed !== true) return true;
        if (powerup?.sprite?.parent) powerup.sprite.parent.removeChild(powerup.sprite);
        powerup?.sprite?.destroy?.({ children: true });
        return false;
      });
    }
  }

  clearPickupEffects(reason = 'cleanup') {
    const activeEffects = this.activePickupEffects;
    if (!activeEffects?.size) return 0;
    const effects = [...activeEffects];
    effects.forEach(effect => effect?.cleanup?.(reason));
    activeEffects.clear();
    return effects.length;
  }

  sweepOrphanEnemyVisuals(reason = 'orphan_sweep') {
    const root = this.gameContainer;
    const manager = this.enemyManager;
    if (!root || !manager) return 0;
    const trackedSprites = new Set([
      ...(manager.enemies || []).map(enemy => enemy?.sprite),
      manager.boss?.sprite,
      manager.hijacker?.sprite
    ].filter(Boolean));
    const removals = [];
    const walk = (node) => {
      if (!node) return;
      for (const child of node.children || []) walk(child);
      const label = String(node.label || '');
      if (!label.startsWith('enemy_visual:')) return;
      if (trackedSprites.has(node)) return;
      removals.push(node);
    };
    walk(root);
    for (const node of removals) {
      node.__enemyOwner?.deactivateVisuals?.(reason);
      if (node.parent) node.parent.removeChild(node);
      node.destroy?.({ children: true });
    }
    if (removals.length > 0 && this.debugPowerups) {
      console.warn(`[EnemyVisualCleanup] removed orphan enemy visuals=${removals.length} reason=${reason}`);
    }
    return removals.length;
  }

  applyMagnetPull(delta) {
    if (!this.player?.magnetActive) {
      // Hide magnet field visual when not active
      if (this.magnetFieldVisual) {
        this.magnetFieldVisual.clear();
        this.magnetFieldVisual.visible = false;
        this.magnetFieldVisual.__debugMagnetField = { visible: false, range: 0, targetCount: 0 };
      }
      return;
    }
    const range = this.player.magnetRadius || 140;
    const strength = this.player.magnetStrength || 0.08;
    const pull = strength * delta * 15; // MUCH stronger pull (was too weak before)
    const px = this.player.x;
    const py = this.player.y;
    const fieldType = this.player.activePowerup?.type || this.player.scoreMultiplierType || 'magnet';
    const palette = fieldType === 'gravity_well'
      ? { primary: 0xb07cff, secondary: 0x7df9ff }
      : fieldType === 'jackpot_lens'
        ? { primary: 0xffd84d, secondary: 0x7df9ff }
        : fieldType === 'swarm_contract'
          ? { primary: 0xc6ff3d, secondary: 0x40d6ff }
          : { primary: 0x99ffcc, secondary: 0xccffee };
    const pulledTargets = [];

    // Draw visual indicator for magnet field
    if (!this.magnetFieldVisual) {
      this.magnetFieldVisual = new PIXI.Graphics();
      this.magnetFieldVisual.label = 'magnetFieldVisual';
      this.magnetFieldVisual.blendMode = 'add';
      this.magnetFieldVisual.zIndex = 4;
      this.gameContainer.addChild(this.magnetFieldVisual);
    }

    // Update magnet field visual
    this.magnetFieldVisual.visible = true;
    this.magnetFieldVisual.clear();
    const now = Date.now();
    const pulse = Math.sin(now * 0.005) * 0.5 + 0.5;
    const alpha = 0.14 + pulse * 0.08;

    // Outer ring
    this.magnetFieldVisual.circle(px, py, range);
    this.magnetFieldVisual.stroke({ color: palette.primary, width: 2.2, alpha: alpha * 0.92 });
    this.magnetFieldVisual.fill({ color: palette.primary, alpha: alpha * 0.1 });

    // Inner ring
    this.magnetFieldVisual.circle(px, py, range * 0.6);
    this.magnetFieldVisual.stroke({ color: palette.secondary, width: 1.2, alpha: alpha * 0.52 });

    const segmentCount = range >= 220 ? 14 : 10;
    const spin = now * 0.0018;
    for (let i = 0; i < segmentCount; i += 1) {
      const angle = spin + i * (Math.PI * 2 / segmentCount);
      const inner = range * (0.82 + (i % 2) * 0.05);
      const outer = range + 7 + pulse * 4;
      this.magnetFieldVisual.moveTo(px + Math.cos(angle) * inner, py + Math.sin(angle) * inner);
      this.magnetFieldVisual.lineTo(px + Math.cos(angle) * outer, py + Math.sin(angle) * outer);
    }
    this.magnetFieldVisual.stroke({ color: palette.primary, width: 1.4, alpha: 0.16 + pulse * 0.12 });

    this.powerupManager?.powerups?.forEach(p => {
      if (!p.active) return;
      if (p.magnetImmune) return;
      const dx = px - p.x;
      const dy = py - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range && dist > 5) {
        // Stronger pull with distance falloff
        const pullForce = pull * (1 - dist / range) * 2;
        p.x += (dx / dist) * pullForce;
        p.y += (dy / dist) * pullForce;
        p.sprite.x = p.x;
        p.sprite.y = p.y;
        if (pulledTargets.length < 8) {
          pulledTargets.push({ kind: 'powerup', x: p.x, y: p.y, distance: dist, intensity: 1 - dist / range });
        }
      }
    });

    this.ambientBonusDrones.forEach(b => {
      // Only the POWERUP variant is collectible. Pulling HAZARD drones turns
      // the pickup helper into an unavoidable contact-damage source.
      if (!b.active || b.type !== 'POWERUP') return;
      const dx = px - b.x;
      const dy = py - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range && dist > 5) {
        // Stronger pull with distance falloff
        const pullForce = pull * (1 - dist / range) * 1.5;
        b.x += (dx / dist) * pullForce;
        b.y += (dy / dist) * pullForce;
        b.sprite.x = b.x;
        b.sprite.y = b.y;
        if (pulledTargets.length < 8) {
          pulledTargets.push({ kind: 'bonus', x: b.x, y: b.y, distance: dist, intensity: 1 - dist / range });
        }
      }
    });

    let powerupTargetCount = 0;
    let bonusTargetCount = 0;
    let captureHaloCount = 0;
    let funnelBeadCount = 0;
    pulledTargets.forEach((target, index) => {
      if (target.kind === 'powerup') powerupTargetCount += 1;
      if (target.kind === 'bonus') bonusTargetCount += 1;
      const intensity = Math.max(0, Math.min(1, target.intensity || 0));
      const lineAlpha = 0.16 + intensity * 0.34;
      const targetColor = target.kind === 'bonus' ? 0xffe56d : palette.secondary;
      this.magnetFieldVisual.circle(target.x, target.y, 7 + intensity * 8);
      this.magnetFieldVisual.stroke({ color: targetColor, width: 1.4 + intensity * 1.2, alpha: 0.18 + intensity * 0.34 });
      captureHaloCount += 1;
      this.magnetFieldVisual.moveTo(target.x, target.y);
      this.magnetFieldVisual.lineTo(px, py);
      this.magnetFieldVisual.stroke({ color: targetColor, width: 1 + intensity * 1.2, alpha: lineAlpha });
      for (let bead = 1; bead <= 2; bead += 1) {
        const t = bead / 3;
        const bx = target.x + (px - target.x) * t;
        const by = target.y + (py - target.y) * t;
        this.magnetFieldVisual.circle(bx, by, 2.2 + intensity * 1.8 + bead * 0.35);
        this.magnetFieldVisual.fill({ color: bead === 2 ? palette.primary : targetColor, alpha: 0.12 + intensity * 0.26 + pulse * 0.08 });
        funnelBeadCount += 1;
      }
      const angle = Math.atan2(py - target.y, px - target.x);
      const chevronDist = 14 + index * 2;
      const cx = target.x + Math.cos(angle) * chevronDist;
      const cy = target.y + Math.sin(angle) * chevronDist;
      const side = Math.PI * 0.5;
      this.magnetFieldVisual.moveTo(cx + Math.cos(angle + side) * 4, cy + Math.sin(angle + side) * 4);
      this.magnetFieldVisual.lineTo(cx + Math.cos(angle) * 9, cy + Math.sin(angle) * 9);
      this.magnetFieldVisual.lineTo(cx + Math.cos(angle - side) * 4, cy + Math.sin(angle - side) * 4);
      this.magnetFieldVisual.stroke({ color: targetColor, width: 1.4, alpha: 0.28 + intensity * 0.36 });
    });

    this.magnetFieldVisual.__debugMagnetField = {
      visible: true,
      fieldType,
      range: Math.round(range),
      strength: Number(strength.toFixed(3)),
      segmentCount,
      targetCount: pulledTargets.length,
      powerupTargetCount,
      bonusTargetCount,
      captureHaloCount,
      funnelBeadCount
    };
  }

  updateOrbitalStrike(delta) {
    if (!this.player?.orbitalStrikeActive || !this.player?.orbitalStrikeCharges || this.player.orbitalStrikeCharges <= 0) {
      return;
    }
    if (this.player?.runAugmentModifiers?.skyVerdict) return;

    // Initialize timer if not set
    if (!this.orbitalStrikeTimer) {
      this.orbitalStrikeTimer = 0;
    }

    const strikeInterval = 2500; // Fire every 2.5 seconds
    this.orbitalStrikeTimer += delta * 16.67;

    if (this.orbitalStrikeTimer >= strikeInterval) {
      this.orbitalStrikeTimer = 0;
      this.triggerOrbitalStrike();
    }
  }

  triggerOrbitalStrike(options = {}) {
    // Find a random active enemy to target
    const activeEnemies = this.enemyManager.enemies.filter(e => e.active);
    if (activeEnemies.length === 0) return false;

    const requestedX = Number(options.targetX);
    const requestedY = Number(options.targetY);
    const hasRequestedTarget = Number.isFinite(requestedX) && Number.isFinite(requestedY);
    const target = options.target?.active
      ? options.target
      : hasRequestedTarget
        ? activeEnemies.slice().sort((a, b) => Math.hypot(a.x - requestedX, a.y - requestedY) - Math.hypot(b.x - requestedX, b.y - requestedY))[0]
        : activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
    const targetX = hasRequestedTarget ? requestedX : target.x;
    const targetY = hasRequestedTarget ? requestedY : target.y;
    const fusionId = options.fusionId || null;
    const strikeColor = fusionId === 'sky_verdict' ? 0xffb34f : 0xff6600;
    const debug = {
      targetX: Math.round(targetX || 0),
      targetY: Math.round(targetY || 0),
      chargesBefore: this.player?.orbitalStrikeCharges || 0,
      fusionId,
      damageEvents: [],
      completed: false
    };
    this.lastOrbitalStrikeDebug = debug;

    // Decrement charges
    this.player.orbitalStrikeCharges--;
    if (this.player.tacticalOrbitalStrikeCharges > 0) this.player.tacticalOrbitalStrikeCharges--;
    debug.chargesAfter = this.player.orbitalStrikeCharges;

    // Show warning indicator
    const warning = new PIXI.Graphics();
    warning.circle(0, 0, 60);
    warning.stroke({ color: strikeColor, width: fusionId ? 5 : 3, alpha: 0.8 });
    warning.circle(0, 0, 40);
    warning.stroke({ color: fusionId ? 0xff62dc : 0xff6600, width: 2, alpha: 0.5 });
    warning.position.set(targetX, targetY);
    this.gameContainer.addChild(warning);

    // Animate warning pulse
    let pulseTime = 0;
    const pulseTicker = () => {
      pulseTime += 16.67;
      const pulse = Math.sin(pulseTime * 0.01) * 0.5 + 0.5;
      warning.alpha = 0.5 + pulse * 0.5;
      warning.scale.set(0.8 + pulse * 0.2);
    };
    this.game.app.ticker.add(pulseTicker);

    // Fire strike after delay
    setTimeout(() => {
      this.game.app.ticker.remove(pulseTicker);
      if (warning.parent) warning.parent.removeChild(warning);

      // Create beam from top
      const beam = new PIXI.Graphics();
      const screenHeight = this.gameplayGame.getHeight();
      beam.moveTo(targetX, 0);
      beam.lineTo(targetX, screenHeight);
      beam.stroke({ color: strikeColor, width: fusionId ? 52 : 40, alpha: 0.6 });

      // Add glow effect
      beam.moveTo(targetX, 0);
      beam.lineTo(targetX, screenHeight);
      beam.stroke({ color: fusionId ? 0xffffff : 0xffff00, width: fusionId ? 24 : 20, alpha: 0.8 });

      this.gameContainer.addChild(beam);

      // Deal area damage
      const damageRadius = 80;
      const damage = 30;
      const damagedEnemies = new Set();

      const applyStrikeDamage = (enemy, forceTarget = false) => {
        if (!enemy.active) return;
        const dist = Math.hypot(enemy.x - targetX, enemy.y - targetY);
        if (forceTarget || dist <= damageRadius + (enemy.radius || 0)) {
          damagedEnemies.add(enemy);
          const hpBefore = Number(enemy.health) || 0;
          const destroyed = this.applyCombatDamage(
            enemy,
            damage,
            fusionId === 'sky_verdict' ? 'tactical_fusion' : 'orbital_strike'
          );
          debug.damageEvents.push({
            kind: enemy.kind || 'enemy',
            type: enemy.type || enemy.profile?.id || null,
            forced: Boolean(forceTarget),
            dist: Math.round(dist),
            hpBefore,
            hpAfter: Number(enemy.health) || 0,
            destroyed: Boolean(destroyed)
          });
          if (destroyed) {
            if (!this.player.isSlowTimeActive?.()) {
              const scoreAwarded = this.getComboScore(enemy.scoreValue);
              const appliedScore = this.game.addScore(this.getNormalWaveScoreAward(scoreAwarded, enemy));
              if (this.scorePopupManager) {
                this.scorePopupManager.addScorePopup(enemy.x, enemy.y, appliedScore);
              }
            }
            this.onEnemyKilled(enemy);
            this.playEnemyDeathFeedback(enemy, { volume: 0.4 });
          }
        }
      };

      this.enemyManager.enemies.forEach(enemy => applyStrikeDamage(enemy, false));
      if (!fusionId && target?.active && !damagedEnemies.has(target)) {
        applyStrikeDamage(target, true);
      }
      debug.completed = true;
      if (fusionId === 'sky_verdict' && this.player?.tacticalFusionStats) {
        this.player.tacticalFusionStats.skyVerdicts += 1;
        this.player.lastTacticalFusionEvent = {
          id: 'sky_verdict',
          at: Date.now(),
          targetX: Math.round(targetX),
          targetY: Math.round(targetY),
          damageEvents: debug.damageEvents.length,
          verdict: this.player.tacticalFusionStats.skyVerdicts
        };
      }

      // Screen shake and sound
      this.screenShake.shake(4);
      AudioManager.playSfx('enemy_explode', { volume: 0.7 });

      // Create impact explosion at target
      this.particleManager.createExplosion(targetX, targetY, 0xffaa00);

      // Remove beam after short duration
      setTimeout(() => {
        if (beam.parent) beam.parent.removeChild(beam);
      }, 150);
    }, 500); // 0.5 second warning
    return true;
  }

  spawnAmbientBonusDrone(type) {
    const x = Math.random() * (this.gameplayGame.getWidth() - 100) + 50;
    const y = -50;

    const bonusDrone = new BonusDrone(x, y, this.gameplayGame, type);
    this.gameContainer.addChild(bonusDrone.sprite);
    this.ambientBonusDrones.push(bonusDrone);
  }

  // CLEANUP FIX: Authoritative collector for wave cleanup targets
  // Returns all bonus-drone cleanup targets across tracking systems
  getWaveCleanupTargets() {
    const targets = [];

    // Collect challenge drones from EnemyManager.enemies.
    if (this.enemyManager && this.enemyManager.enemies) {
      const challengeDrones = this.enemyManager.enemies.filter(e =>
        e.active && e.kind === 'bonus_drone'
      );
      targets.push(...challengeDrones);
    }

    // Collect ambient bonus drones from PlayScene.
    const ambientBonusDrones = this.ambientBonusDrones.filter(b =>
      b.active && b.kind === 'bonus_drone'
    );
    targets.push(...ambientBonusDrones);

    return targets;
  }

  safeGetEnemyTaunt() {
    try {
      const line = getEnemyTaunt();
      if (typeof line === 'string' && line.trim()) return line;
    } catch (error) {
      console.warn('[PlayScene] getEnemyTaunt failed', error);
    }
    return '';
  }

  getBossTauntCaption(reason) {
    switch (reason) {
      case 'boss_spawn':
        return getMicroMessage('bossIntro');
      case 'boss_life_lost':
        return getMicroMessage('lifeLost');
      case 'boss_row_core':
        return translateText('THE BOSS HEARS THE OARS');
      case 'boss_row_core_perfect':
        return translateText('PERFECT ROW. ANNOYINGLY HEROIC.');
      case 'boss_phase2':
      case 'boss_half':
        return this.safeGetEnemyTaunt();
      default:
        return getMicroMessage('bossIntro');
    }
  }

  showBossTaunt(reason = 'boss_spawn', options = {}) {
    const caption = this.getBossTauntCaption(reason);
    if (!caption) return;

    if (reason !== 'boss_spawn' && this.enemyManager?.state === 'BOSS_ACTIVE') {
      this.showBossCombatNotice(reason, caption);
      return;
    }

    const bossProfile = this.enemyManager?.boss?.profile || getBossProfileForRun(this.game?.level || 1, {
      seed: this.game?.contentDirector?.seed || this.game?.gameId || 'nova-swarm',
      seenThroughSector: this.game?.overrunSeenBossMaxSector || 50
    });
    const primaryColor = bossProfile?.palette || 0xff3030;
    const accentColor = bossProfile?.accent || 0x2ff6ff;
    const spectacular = reason === 'boss_spawn';
    if (spectacular && !options?.allowFallback) {
      const bossIndex = Math.max(0, Math.min(49, (Number(bossProfile?.index) || Number(this.game?.level) || 1) - 1));
      const bossSrc = AssetManifest.generated?.bosses?.[bossIndex] || null;
      const emblemSrc = AssetManifest.generated?.vfx?.bossWarningEmblems?.[bossIndex] || null;
      const isUsable = (texture) => GameAssets.isValidTexture(texture) &&
        (Number(texture.width) || 0) >= 48 &&
        (Number(texture.height) || 0) >= 48;
      const activeBoss = this.enemyManager?.boss || null;
      const activeTexture = [
        activeBoss?.hitboxRef?.texture,
        activeBoss?.visualContainer?.children?.find?.((child) => isUsable(child?.texture))?.texture
      ].find((texture) => isUsable(texture)) || null;
      const hasReadyArt = isUsable(activeTexture) ||
        isUsable(this.bossWarningBossTextures?.[bossIndex]) ||
        isUsable(this.bossWarningEmblemTextures?.[bossIndex]);
      if (!hasReadyArt && (bossSrc || emblemSrc)) {
        const requestToken = `${bossIndex}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        this.pendingBossWarningArtRequest = requestToken;
        const candidates = [bossSrc, emblemSrc].filter(Boolean);
        const loadCandidate = async (candidateIndex = 0) => {
          const candidateSrc = candidates[candidateIndex];
          if (!candidateSrc) return false;
          try {
            await PIXI.Assets.load(candidateSrc);
            const texture = PIXI.Texture.from(candidateSrc);
            if (!isUsable(texture)) return loadCandidate(candidateIndex + 1);
            if (candidateSrc === bossSrc) this.bossWarningBossTextures[bossIndex] = texture;
            if (candidateSrc === emblemSrc) this.bossWarningEmblemTextures[bossIndex] = texture;
            return true;
          } catch {
            return loadCandidate(candidateIndex + 1);
          }
        };
        loadCandidate().finally(() => {
          if (this.pendingBossWarningArtRequest !== requestToken || this.game?.currentScene !== this) return;
          this.showBossTaunt(reason, { allowFallback: true });
        });
        return;
      }
    }
    if (spectacular) {
      this.shipIntroToken += 1;
      this.introActive = false;
      this.introComplete = true;
    }
    if (spectacular && this.introOverlay?.parent) {
      this.introOverlay.parent.removeChild(this.introOverlay);
      this.introOverlay.destroy?.({ children: true });
      this.introOverlay = null;
    }
    if (spectacular && this.uiOverlay?.children?.length) {
      for (const child of [...this.uiOverlay.children]) {
        if (child.label === 'ship_intro_overlay' || child.label === 'ship_intro_flash') {
          this.uiOverlay.removeChild(child);
          child.destroy?.({ children: true });
        }
      }
    }

    const detailLabel = reason === 'boss_life_lost'
      ? 'ARMOR BREACH'
      : reason === 'boss_phase2' || reason === 'boss_half'
        ? 'PATTERN SHIFT'
        : 'NEON RADAR LOCK';

    const poster = new PIXI.Container();
    poster.label = 'ui_boss_dossier';
    poster.eventMode = 'none';
    poster.interactive = false;

    const burst = new PIXI.Graphics();
    burst.blendMode = 'add';
    for (let i = 0; i < 36; i += 1) {
      const angle = (Math.PI * 2 * i) / 36;
      const inner = 150 + (i % 3) * 18;
      const outer = 280 + (i % 5) * 18;
      burst.moveTo(Math.cos(angle) * inner, -24 + Math.sin(angle) * inner);
      burst.lineTo(Math.cos(angle) * outer, -24 + Math.sin(angle) * outer);
      burst.stroke({ color: i % 2 ? accentColor : primaryColor, width: i % 4 === 0 ? 3 : 1.5, alpha: spectacular ? 0.24 : 0.12 });
    }
    burst.circle(0, -24, 246);
    burst.stroke({ color: primaryColor, width: 5, alpha: spectacular ? 0.24 : 0.1 });
    burst.circle(0, -24, 188);
    burst.stroke({ color: accentColor, width: 3, alpha: spectacular ? 0.34 : 0.14 });
    poster.addChild(burst);

    const bg = new PIXI.Graphics();
    bg.roundRect(-188, -220, 376, 440, 12);
    bg.fill({ color: 0x06101a, alpha: 0.94 });
    bg.stroke({ color: primaryColor, width: 4, alpha: 0.92 });
    bg.roundRect(-174, -206, 348, 412, 8);
    bg.stroke({ color: accentColor, width: 1.4, alpha: 0.58 });
    bg.rect(-188, -220, 376, 42);
    bg.fill({ color: primaryColor, alpha: 0.22 });
    poster.addChild(bg);

    const pattern = new PIXI.Graphics();
    this.drawBossWarningSignature(pattern, bossProfile, primaryColor, accentColor);
    poster.addChild(pattern);

    const emblem = this.createBossWarningEmblem(bossProfile, primaryColor, accentColor, spectacular);
    poster.addChild(emblem);

    const scanOverlay = new PIXI.Graphics();
    scanOverlay.roundRect(-136, -148, 272, 268, 7);
    scanOverlay.stroke({ color: primaryColor, width: 2, alpha: 0.72 });
    const bracketLength = 28;
    for (const [x, y, sx, sy] of [
      [-122, -134, 1, 1],
      [122, -134, -1, 1],
      [-122, 106, 1, -1],
      [122, 106, -1, -1]
    ]) {
      scanOverlay.moveTo(x, y + sy * bracketLength);
      scanOverlay.lineTo(x, y);
      scanOverlay.lineTo(x + sx * bracketLength, y);
    }
    scanOverlay.stroke({ color: accentColor, width: 1.4, alpha: 0.58 });
    poster.addChild(scanOverlay);

    const threatMeter = new PIXI.Graphics();
    threatMeter.label = 'boss_warning_threat_meter';
    const threatPipCount = 5;
    const threatLevel = Math.max(2, Math.min(threatPipCount, Math.ceil(((Number(this.game?.level) || 1) % 10 || 10) / 2)));
    for (let i = 0; i < threatPipCount; i += 1) {
      const y = -126 + i * 40;
      const active = i < threatLevel;
      threatMeter.roundRect(146, y, 16, 24, 4);
      threatMeter.fill({ color: active ? (i >= 3 ? primaryColor : accentColor) : 0x07131f, alpha: active ? 0.58 : 0.36 });
      threatMeter.stroke({ color: active ? 0xffffff : accentColor, width: active ? 1.2 : 0.8, alpha: active ? 0.5 : 0.22 });
      threatMeter.moveTo(136, y + 12);
      threatMeter.lineTo(144, y + 12);
      threatMeter.stroke({ color: active ? 0xffff99 : accentColor, width: 1, alpha: active ? 0.42 : 0.18 });
    }
    poster.addChild(threatMeter);

    const approachCue = new PIXI.Graphics();
    approachCue.label = 'boss_warning_approach_cue';
    const approachChevronCount = 4;
    for (let i = 0; i < approachChevronCount; i += 1) {
      const x = -66 + i * 44;
      const y = 104;
      const alpha = 0.28 + i * 0.08;
      approachCue.moveTo(x - 11, y - 10);
      approachCue.lineTo(x, y);
      approachCue.lineTo(x + 11, y - 10);
      approachCue.stroke({ color: i % 2 ? primaryColor : accentColor, width: 2, alpha });
      approachCue.circle(x, y + 9, 2.8);
      approachCue.fill({ color: i % 2 ? primaryColor : accentColor, alpha: alpha + 0.08 });
    }
    poster.addChild(approachCue);

    const headerLabel = reason === 'boss_spawn'
      ? 'BOSS INCOMING'
      : reason === 'boss_life_lost'
        ? 'HIT TAKEN'
        : reason === 'boss_defeat'
          ? 'BOSS DEFEATED'
          : 'BOSS ALERT';
    const topText = createText(headerLabel, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 20,
      fill: '#fff3a2',
      stroke: '#1a0010',
      strokeThickness: 4,
      fontWeight: '900'
    });
    topText.label = 'boss_warning_title';
    topText.anchor.set(0.5);
    topText.y = -194;
    topText.text = translateText(headerLabel);
    poster.addChild(topText);

    const bossName = createText(bossProfile?.name || translateText('BOSS'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 18,
      fill: '#ffffff',
      stroke: '#020711',
      strokeThickness: 4,
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 306
    });
    bossName.anchor.set(0.5);
    bossName.y = 132;
    poster.addChild(bossName);

    const detailParts = [translateText(detailLabel)];
    if (bossProfile?.title) detailParts.push(String(bossProfile.title).toUpperCase());
    const detailText = createText(detailParts.join(' // '), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 11,
      fill: '#d8fbff',
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 310
    });
    detailText.anchor.set(0.5);
    detailText.y = 160;
    poster.addChild(detailText);

    const warningCaption = reason === 'boss_spawn'
      ? translateText(pickBossWarningJoke(bossProfile, this.game?.level || 1))
      : caption;
    const bottomText = createText(warningCaption, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: spectacular ? 17 : 15,
      fill: spectacular ? '#fff3a2' : '#ffffff',
      stroke: '#12020c',
      strokeThickness: spectacular ? 3 : 0,
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 304
    });
    bottomText.label = 'boss_warning_caption';
    bottomText.anchor.set(0.5);
    bottomText.y = 192;
    poster.addChild(bottomText);

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    poster.x = spectacular
      ? Math.min(width - 236, Math.max(220, width * 0.24))
      : Math.min(286, Math.max(210, width * 0.2));
    poster.y = spectacular
      ? Math.min(height - 210, Math.max(348, height * 0.56))
      : Math.min(height - 230, Math.max(382, height * 0.53));
    poster.rotation = spectacular ? -0.035 : -0.025;
    poster._debugBossWarningDossier = {
      threatPipCount,
      threatLevel,
      approachChevronCount,
      spectacular,
      reason,
      bossProfileId: bossProfile?.id || null,
      bossProfileName: bossProfile?.name || null
    };

    this.uiOverlay.addChild(poster);
    console.log('[UI] boss dossier shown uiOnly=true');

    const baseScale = spectacular ? 0.54 : 0.68;
    const popScale = spectacular ? 0.7 : 0.78;
    poster.scale.set(baseScale);
    let elapsed = 0;
    const fadeDelay = spectacular ? 1650 : 1500;
    const fadeDuration = spectacular ? 520 : 600;
    const animate = (delta) => {
      if (poster.destroyed || !poster.scale || !this.game?.app?.ticker) {
        this.game?.app?.ticker?.remove?.(animate);
        return;
      }
      elapsed += delta.deltaTime * 16.67;
      if (elapsed < 200) {
        const t = elapsed / 200;
        poster.scale.set(baseScale + t * (popScale - baseScale));
      } else if (elapsed > fadeDelay) {
        const t = Math.min(1, (elapsed - fadeDelay) / fadeDuration);
        poster.alpha = 1 - t;
        if (t >= 1) {
          this.game.app.ticker.remove(animate);
          if (this.uiOverlay) this.uiOverlay.removeChild(poster);
        }
      } else if (spectacular) {
        const pulse = Math.sin(elapsed * 0.012) * 0.018;
        poster.scale.set(popScale + pulse);
      }
    };
    this.game.app.ticker.add(animate);
    if (spectacular) {
      AudioManager.playSfx('boss_reveal_stinger', { force: true, volume: 0.98, minIntervalMs: 0 });
    } else {
      AudioManager.play('menuSelect');
    }
  }

  drawBossWarningSignature(graphics, profile, primaryColor = 0xff3030, accentColor = 0x2ff6ff) {
    graphics.clear();
    const signature = profile?.signature || 'ring';
    graphics.alpha = 0.78;
    if (signature === 'cone') {
      for (let i = 0; i < 5; i += 1) {
        const x = -142 + i * 71;
        graphics.moveTo(x, -88);
        graphics.lineTo(x + 28, -146);
        graphics.lineTo(x + 56, -88);
        graphics.closePath();
        graphics.stroke({ color: i % 2 ? accentColor : primaryColor, width: 1.6, alpha: 0.36 });
      }
      return;
    }
    if (signature === 'lance') {
      for (let i = 0; i < 6; i += 1) {
        const x = -150 + i * 60;
        graphics.moveTo(x, -152);
        graphics.lineTo(x + 30, 86);
        graphics.stroke({ color: i % 2 ? primaryColor : accentColor, width: 2, alpha: 0.32 });
      }
      return;
    }
    if (signature === 'mirror') {
      for (let i = 0; i < 4; i += 1) {
        const y = -130 + i * 54;
        graphics.moveTo(-146, y);
        graphics.lineTo(-34, y + 30);
        graphics.moveTo(146, y);
        graphics.lineTo(34, y + 30);
        graphics.stroke({ color: i % 2 ? accentColor : primaryColor, width: 2, alpha: 0.34 });
      }
      return;
    }
    if (signature === 'adds') {
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        const x = Math.cos(angle) * 132;
        const y = -18 + Math.sin(angle) * 116;
        graphics.circle(x, y, 8);
        graphics.fill({ color: i % 2 ? accentColor : primaryColor, alpha: 0.28 });
        graphics.moveTo(0, -18);
        graphics.lineTo(x, y);
        graphics.stroke({ color: accentColor, width: 1, alpha: 0.2 });
      }
      return;
    }
    for (let i = 0; i < 4; i += 1) {
      graphics.circle(0, -18, 68 + i * 32);
      graphics.stroke({ color: i % 2 ? accentColor : primaryColor, width: 2, alpha: 0.24 });
    }
  }

  createBossWarningEmblemLegacy(profile, primaryColor = 0xff3030, accentColor = 0x2ff6ff, spectacular = false) {
    const emblem = new PIXI.Container();
    emblem.label = 'boss_warning_emblem';
    emblem.y = -30;
    emblem.alpha = spectacular ? 0.98 : 0.88;

    const radar = new PIXI.Graphics();
    radar.blendMode = 'add';
    for (let i = 0; i < 4; i += 1) {
      radar.circle(0, 0, 52 + i * 24);
      radar.stroke({ color: i % 2 ? accentColor : primaryColor, width: i === 0 ? 2.2 : 1.2, alpha: 0.38 - i * 0.045 });
    }
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      const inner = 36 + (i % 2) * 12;
      const outer = 118;
      radar.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      radar.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      radar.stroke({ color: i % 3 === 0 ? primaryColor : accentColor, width: i % 3 === 0 ? 2 : 1, alpha: 0.2 });
    }
    emblem.addChild(radar);

    const glyph = new PIXI.Graphics();
    const signature = profile?.signature || 'ring';
    glyph.poly([0, -102, 76, 60, 0, 102, -76, 60]);
    glyph.fill({ color: 0x020711, alpha: 0.88 });
    glyph.stroke({ color: primaryColor, width: 4, alpha: 0.95 });
    glyph.poly([0, -78, 48, 42, 0, 72, -48, 42]);
    glyph.stroke({ color: accentColor, width: 2, alpha: 0.78 });
    glyph.moveTo(0, -58);
    glyph.lineTo(0, 38);
    glyph.stroke({ color: 0xffffff, width: 5, alpha: 0.86 });
    glyph.circle(0, 68, 6);
    glyph.fill({ color: 0xffffff, alpha: 0.9 });
    if (signature === 'lance') {
      glyph.moveTo(-52, -64);
      glyph.lineTo(52, 64);
      glyph.moveTo(52, -64);
      glyph.lineTo(-52, 64);
      glyph.stroke({ color: primaryColor, width: 2, alpha: 0.52 });
    } else if (signature === 'adds') {
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        glyph.circle(Math.cos(angle) * 58, Math.sin(angle) * 58, 5);
        glyph.fill({ color: accentColor, alpha: 0.64 });
      }
    } else {
      glyph.circle(0, 0, 42);
      glyph.stroke({ color: accentColor, width: 2, alpha: 0.5 });
    }
    emblem.addChild(glyph);

    const perimeterLock = new PIXI.Graphics();
    perimeterLock.blendMode = 'add';
    for (let index = 0; index < 8; index += 1) {
      const angle = -Math.PI * 0.5 + index * (Math.PI / 4);
      const inner = 104;
      const outer = index % 2 === 0 ? 120 : 114;
      perimeterLock.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      perimeterLock.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      perimeterLock.stroke({
        color: index % 2 === 0 ? primaryColor : accentColor,
        width: index % 2 === 0 ? 2.2 : 1.4,
        alpha: index % 2 === 0 ? 0.46 : 0.3
      });
    }
    perimeterLock.arc(0, 0, 110, -Math.PI * 0.88, -Math.PI * 0.58);
    perimeterLock.arc(0, 0, 110, Math.PI * 0.12, Math.PI * 0.42);
    perimeterLock.stroke({ color: accentColor, width: 2, alpha: 0.34 });
    emblem.addChild(perimeterLock);

    return emblem;
  }

  createBossWarningEmblem(profile, primaryColor = 0xff3030, accentColor = 0x2ff6ff, spectacular = false) {
    const emblem = new PIXI.Container();
    emblem.label = 'boss_warning_emblem';
    emblem.y = -30;
    emblem.alpha = spectacular ? 0.98 : 0.88;

    const radar = new PIXI.Graphics();
    radar.blendMode = 'add';
    for (let i = 0; i < 4; i += 1) {
      radar.circle(0, 0, 52 + i * 24);
      radar.stroke({ color: i % 2 ? accentColor : primaryColor, width: i === 0 ? 2.2 : 1.2, alpha: 0.38 - i * 0.045 });
    }
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      const inner = 36 + (i % 2) * 12;
      const outer = 118;
      radar.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      radar.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      radar.stroke({ color: i % 3 === 0 ? primaryColor : accentColor, width: i % 3 === 0 ? 2 : 1, alpha: 0.2 });
    }
    emblem.addChild(radar);

    const portraitFrame = new PIXI.Graphics();
    portraitFrame.roundRect(-118, -118, 236, 236, 10);
    portraitFrame.fill({ color: 0x020711, alpha: 0.92 });
    portraitFrame.stroke({ color: primaryColor, width: 3.5, alpha: 0.92 });
    portraitFrame.roundRect(-106, -106, 212, 212, 8);
    portraitFrame.stroke({ color: accentColor, width: 1.4, alpha: 0.72 });
    emblem.addChild(portraitFrame);

    const bossIndex = Math.max(0, Math.min(49, (Number(profile?.index) || Number(this.game?.level) || 1) - 1));
    const bossSrc = AssetManifest.generated?.bosses?.[bossIndex] || null;
    const emblemSrc = AssetManifest.generated?.vfx?.bossWarningEmblems?.[bossIndex] || null;
    const sourceCandidates = [bossSrc, emblemSrc].filter(Boolean);
    let fallbackShown = false;
    const addFallbackGlyph = () => {
      if (emblem.destroyed || fallbackShown) return;
      fallbackShown = true;
      const glyph = new PIXI.Graphics();
      glyph.label = 'boss_warning_fallback_glyph';
      glyph.poly([0, -86, 66, 52, 0, 86, -66, 52]);
      glyph.fill({ color: 0x071522, alpha: 0.9 });
      glyph.stroke({ color: primaryColor, width: 4, alpha: 0.92 });
      glyph.moveTo(0, -52);
      glyph.lineTo(0, 34);
      glyph.stroke({ color: 0xffffff, width: 5, alpha: 0.86 });
      glyph.circle(0, 62, 6);
      glyph.fill({ color: accentColor, alpha: 0.9 });
      emblem.addChild(glyph);
    };

    const isWarningTextureUsable = (texture) => GameAssets.isValidTexture(texture) &&
      (Number(texture.width) || 0) >= 48 &&
      (Number(texture.height) || 0) >= 48;

    const installTexture = (texture, source = null) => {
      if (!isWarningTextureUsable(texture) || emblem.destroyed) return false;
      for (const child of [...emblem.children]) {
        if (child.label === 'boss_warning_boss_art' || child.label === 'boss_warning_fallback_glyph') {
          emblem.removeChild(child);
          child.destroy?.({ children: true });
        }
      }
      const sprite = new PIXI.Sprite(texture);
      sprite.label = 'boss_warning_boss_art';
      sprite.__bossWarningSource = source || texture?.source?.resource?.src || texture?.textureCacheIds?.[0] || 'cached_boss_warning_art';
      sprite.__bossWarningContained = true;
      sprite.anchor.set(0.5);
      const tw = texture.width || 1;
      const th = texture.height || 1;
      const usesBossPortrait = /\/bosses\//i.test(String(sprite.__bossWarningSource || ''));
      const scale = Math.min(196 / tw, 196 / th) * (usesBossPortrait ? 1.02 : 0.94);
      sprite.scale.set(scale);
      sprite.x = 0;
      sprite.y = 0;
      emblem.addChildAt(sprite, Math.min(2, emblem.children.length));
      return true;
    };

    const findActiveBossTexture = () => {
      const boss = this.enemyManager?.boss || null;
      const candidates = [
        boss?.hitboxRef?.texture,
        boss?.visualContainer?.children?.find?.((child) => isWarningTextureUsable(child?.texture))?.texture,
        boss?.sprite?.children?.find?.((child) => isWarningTextureUsable(child?.texture))?.texture
      ];
      return candidates.find((texture) => isWarningTextureUsable(texture)) || null;
    };

    const activeBossTexture = findActiveBossTexture();
    const cachedBoss = this.bossWarningBossTextures?.[bossIndex] || null;
    const cachedEmblem = this.bossWarningEmblemTextures?.[bossIndex] || null;
    if (!installTexture(activeBossTexture, bossSrc || 'active_boss_texture') &&
      !installTexture(cachedBoss, bossSrc) &&
      !installTexture(cachedEmblem, emblemSrc)) {
      if (sourceCandidates.length > 0) {
        addFallbackGlyph();
        const loadNextCandidate = (candidateIndex = 0) => {
          const candidateSrc = sourceCandidates[candidateIndex];
          if (!candidateSrc || emblem.destroyed) return;
          const aliasKind = /\/bosses\//i.test(candidateSrc) ? 'boss' : 'emblem';
          PIXI.Assets.load(candidateSrc).then(() => {
            const texture = PIXI.Texture.from(candidateSrc);
            if (!installTexture(texture, candidateSrc)) loadNextCandidate(candidateIndex + 1);
          }).catch(() => loadNextCandidate(candidateIndex + 1));
        };
        loadNextCandidate();
      } else {
        addFallbackGlyph();
      }
    }

    const perimeterLock = new PIXI.Graphics();
    perimeterLock.label = 'boss_warning_perimeter_lock';
    perimeterLock.blendMode = 'add';
    for (let index = 0; index < 8; index += 1) {
      const angle = -Math.PI * 0.5 + index * (Math.PI / 4);
      const inner = 104;
      const outer = index % 2 === 0 ? 120 : 114;
      perimeterLock.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      perimeterLock.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      perimeterLock.stroke({
        color: index % 2 === 0 ? primaryColor : accentColor,
        width: index % 2 === 0 ? 2.2 : 1.4,
        alpha: index % 2 === 0 ? 0.46 : 0.3
      });
    }
    perimeterLock.arc(0, 0, 110, -Math.PI * 0.88, -Math.PI * 0.58);
    perimeterLock.arc(0, 0, 110, Math.PI * 0.12, Math.PI * 0.42);
    perimeterLock.stroke({ color: accentColor, width: 2, alpha: 0.34 });
    emblem.addChild(perimeterLock);

    return emblem;
  }

  showBossCombatNotice(reason, caption) {
    const compactHud = this.game.getWidth() < 620;
    const rawLabel = reason === 'boss_life_lost'
      ? 'HIT TAKEN'
      : reason === 'boss_half'
        ? 'BOSS WEAKENING'
        : reason === 'boss_row_core'
          ? 'ROW CORE'
          : reason === 'boss_row_core_perfect'
            ? 'PERFECT ROW'
            : reason === 'reinforcement_storm'
              ? 'REINFORCEMENT STORM'
              : 'PATTERN SHIFT';
    const label = translateText(rawLabel);
    const text = reason === 'boss_life_lost' ? label : `${label}: ${caption}`;
    this.enqueueToast(text, {
      fontSize: compactHud ? 15 : 18,
      fill: reason === 'boss_life_lost' ? '#ff8f9c' : '#fff45c',
      stroke: '#140006',
      strokeThickness: compactHud ? 2 : 3,
      slot: 'top',
      type: 'boss',
      priority: 3,
      duration: reason === 'boss_life_lost' ? 850 : 1250,
      y: this.game.getHeight() * (compactHud ? 0.28 : 0.2),
      maxWidth: this.game.getWidth() * (compactHud ? 0.84 : 0.64)
    });
  }

  getMayhemReinforcementPreviewTextures(count = 1) {
    const desiredCount = Math.max(1, Math.min(8, Math.floor(Number(count) || 1)));
    const profiles = getGeneratedEnemyProfilesForLevel(Math.max(1, Number(this.game?.level) || 1));
    const textures = [];
    const usedSpriteIndices = new Set();
    for (let index = 0; index < profiles.length && textures.length < desiredCount; index += 1) {
      const profile = profiles[index];
      if (!Number.isFinite(profile?.spriteIndex)) continue;
      const spriteIndex = Math.max(0, Math.floor(profile.spriteIndex));
      if (usedSpriteIndices.has(spriteIndex)) continue;
      const texture = GameAssets.getGeneratedEnemyTexture(spriteIndex);
      if (!GameAssets.isValidTexture(texture)) continue;
      usedSpriteIndices.add(spriteIndex);
      textures.push(texture);
    }
    return textures;
  }

  getMayhemReinforcementPresentationDebugState() {
    const last = this.lastMayhemReinforcementPresentation;
    if (!last) return null;
    return {
      phase: last.phase || null,
      groupCount: Math.max(1, Number(last.groupCount) || 1),
      entryBursts: Math.max(0, Number(last.entryBursts) || 0),
      lastEntryGroup: Number.isFinite(last.lastEntryGroup) ? last.lastEntryGroup : null,
      boss: Boolean(last.boss),
      superStorm: Boolean(last.superStorm),
      score: Math.max(0, Number(last.score) || 0),
      scoreNeutral: last.scoreNeutral !== false,
      gateCount: Math.max(0, Number(last.gateCount) || 0),
      previewShipCount: Math.max(0, Number(last.previewShipCount) || 0),
      signalPlateVisible: Boolean(last.signalPlateVisible && Date.now() < (Number(last.activeUntil) || 0)),
      signalPlateBounds: last.signalPlateBounds ? { ...last.signalPlateBounds } : null,
      hudSafe: last.hudSafe !== false,
      gatePositions: Array.isArray(last.gatePositions) ? [...last.gatePositions] : [],
      entryPositions: Array.isArray(last.entryPositions) ? [...last.entryPositions] : [],
      entryImpactCount: Math.max(0, Number(last.entryImpactCount) || 0),
      arrivalAudioLayerCount: Math.max(0, Number(last.arrivalAudioLayerCount) || 0),
      active: Date.now() < (Number(last.activeUntil) || 0),
      remainingMs: Math.max(0, Math.round((Number(last.activeUntil) || 0) - Date.now()))
    };
  }

  showMayhemRoutineReinforcementWarning({ groupCount = 1, route = 'side', warningMs = 1200 } = {}) {
    const host = this.uiOverlay || this.decorativeOverlay || this.gameContainer || this.container;
    if (!host || !this.game?.app?.ticker) return false;
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const normalizedRoute = String(route || 'side').toLowerCase();
    const duration = Math.max(700, Math.min(1500, Math.floor(Number(warningMs) || 1200)));
    const root = new PIXI.Container();
    root.label = 'mayhem_routine_reinforcement_warning';
    root.eventMode = 'none';
    root.zIndex = 9800;
    const fromLeft = normalizedRoute.includes('left');
    const fromRight = normalizedRoute.includes('right');
    const fromBottom = normalizedRoute.includes('bottom');
    root.position.set(
      fromLeft ? 34 : fromRight ? width - 34 : width / 2,
      fromBottom ? height - 86 : Math.max(150, height * 0.36)
    );
    root.rotation = 0;
    const directionX = fromLeft ? -1 : fromRight ? 1 : 0;
    const directionY = fromBottom ? 1 : -1;
    const beacon = presentDirectionalSignal(root, 'routine-warning', {
      x: 0,
      y: 0,
      directionX,
      directionY,
      color: 0xffdf63,
      size: 54,
      alpha: 0.96
    });
    if (!beacon) {
      const cue = new PIXI.Graphics();
      cue.moveTo(-16, 8);
      cue.lineTo(0, -10);
      cue.lineTo(16, 8);
      cue.stroke({ color: 0xffdf63, width: 3, alpha: 0.9 });
      root.addChild(cue);
    }
    host.addChild(root);
    host.sortChildren?.();

    const startedAt = Date.now();
    this.lastMayhemReinforcementPresentation = {
      phase: 'warning',
      tier: 'routine',
      route: normalizedRoute,
      groupCount: Math.max(1, Math.floor(Number(groupCount) || 1)),
      signalPlateVisible: false,
      scoreNeutral: true,
      startedAt,
      activeUntil: startedAt + duration
    };
    let elapsed = 0;
    const ticker = (delta) => {
      elapsed += (Number(delta?.deltaTime) || Number(delta) || 1) * 16.67;
      const t = Math.min(1, elapsed / duration);
      const pulse = (Math.sin(elapsed * 0.02) + 1) * 0.5;
      root.alpha = Math.pow(Math.max(0, 1 - t), 0.62) * (0.62 + pulse * 0.38);
      root.scale.set(0.9 + pulse * 0.12);
      if (t >= 1 || this.game?.currentScene !== this) {
        this.game.app.ticker.remove(ticker);
        if (root.parent) root.parent.removeChild(root);
        root.destroy?.({ children: true });
      }
    };
    this.game.app.ticker.add(ticker);
    return true;
  }

  showMayhemReinforcementStormWarning({ groupCount = 1, boss = false, superStorm = false, warningMs = 2000 } = {}) {
    const count = Math.max(1, Math.min(8, Math.floor(Number(groupCount) || 1)));
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compactHud = width < 1100 || height < 700;
    const reducedMotion = Boolean(getAccessibilitySettings().prefersReducedMotion);
    const duration = Math.max(1500, Math.min(2800, Math.floor(Number(warningMs) || 2000)));
    const primary = superStorm ? 0xff45f4 : boss ? 0xff5577 : 0xffdf63;
    const secondary = 0x43efff;
    const plateWidth = Math.max(360, Math.min(compactHud ? 480 : 540, width * (compactHud ? 0.5 : 0.34)));
    const plateHeight = compactHud ? 58 : 64;
    const plateY = compactHud
      ? Math.min(168, Math.max(132, height * 0.245))
      : Math.min(170, Math.max(142, height * 0.135));
    const gateY = compactHud
      ? Math.min(height * 0.5, Math.max(220, height * 0.4))
      : Math.min(height * 0.38, Math.max(260, height * 0.255));
    const startedAt = Date.now();
    const previewTextures = this.getMayhemReinforcementPreviewTextures(count);
    const gatePositions = [];
    const signalPlateBounds = {
      x: Math.round(width / 2 - plateWidth / 2),
      y: Math.round(plateY - plateHeight / 2),
      width: Math.round(plateWidth),
      height: Math.round(plateHeight)
    };
    const hudSafe = signalPlateBounds.y >= (compactHud ? 100 : 108) &&
      signalPlateBounds.x >= width * 0.2 &&
      signalPlateBounds.x + signalPlateBounds.width <= width * 0.8;

    this.lastMayhemReinforcementPresentation = {
      phase: 'warning',
      tier: superStorm || boss ? 'headline' : 'major',
      groupCount: count,
      entryBursts: 0,
      lastEntryGroup: null,
      boss,
      superStorm,
      score: 0,
      scoreNeutral: true,
      gateCount: count,
      previewShipCount: previewTextures.length ? count : 0,
      signalPlateVisible: true,
      signalPlateBounds,
      hudSafe,
      gatePositions,
      entryPositions: [],
      entryImpactCount: 0,
      arrivalAudioLayerCount: 0,
      startedAt,
      activeUntil: startedAt + duration
    };

    const layer = this.decorativeOverlay || this.gameContainer || this.container;
    if (!layer || !this.game?.app?.ticker) {
      AudioManager.playSfx(count >= 3 ? 'swarm_chatter_stinger' : 'enemy_threat_soft_warn', {
        force: count >= 3,
        volume: count >= 3 ? 0.68 : 0.34
      });
      return true;
    }

    this.activeMayhemReinforcementWarning?.cleanup?.();

    const overlay = new PIXI.Container();
    overlay.label = 'mayhem_reinforcement_storm_warning';
    overlay.eventMode = 'none';
    overlay.zIndex = 9200;
    layer.addChild(overlay);

    const signalPlate = new PIXI.Container();
    signalPlate.label = 'ui_mayhem_reinforcement_signal_plate';
    signalPlate.position.set(width / 2, plateY);
    signalPlate.eventMode = 'none';
    signalPlate.zIndex = 9900;
    signalPlate.alpha = 0;

    const plateGlow = new PIXI.Graphics();
    plateGlow.roundRect(-plateWidth / 2 - 8, -plateHeight / 2 - 6, plateWidth + 16, plateHeight + 12, 10);
    plateGlow.fill({ color: primary, alpha: 0.12 });
    plateGlow.blendMode = 'add';
    signalPlate.addChild(plateGlow);

    const plate = new PIXI.Graphics();
    plate.roundRect(-plateWidth / 2, -plateHeight / 2, plateWidth, plateHeight, 7);
    plate.fill({ color: 0x040914, alpha: 0.94 });
    plate.stroke({ color: primary, width: compactHud ? 2 : 3, alpha: 0.94 });
    plate.roundRect(-plateWidth / 2 + 6, -plateHeight / 2 + 6, plateWidth - 12, plateHeight - 12, 5);
    plate.stroke({ color: secondary, width: 1.2, alpha: 0.52 });
    signalPlate.addChild(plate);

    const plateRails = new PIXI.Graphics();
    plateRails.moveTo(-plateWidth / 2 + 18, -plateHeight / 2 + 10);
    plateRails.lineTo(plateWidth / 2 - 18, -plateHeight / 2 + 10);
    plateRails.moveTo(-plateWidth / 2 + 18, plateHeight / 2 - 9);
    plateRails.lineTo(plateWidth / 2 - 18, plateHeight / 2 - 9);
    plateRails.stroke({ color: secondary, width: 1.5, alpha: 0.34 });
    signalPlate.addChild(plateRails);

    const title = createText(translateText('INCOMING REINFORCEMENTS'), {
      fontFamily: FONT_DISPLAY,
      fontSize: compactHud ? 18 : 22,
      fill: superStorm ? '#ff83fb' : boss ? '#ff8f9c' : '#fff09a',
      stroke: '#100008',
      strokeThickness: compactHud ? 3 : 4,
      fontWeight: '900',
      letterSpacing: compactHud ? 0.6 : 1.2,
      dropShadow: true,
      dropShadowColor: superStorm ? '#ff45f4' : '#ffcc4d',
      dropShadowBlur: 8,
      dropShadowDistance: 0
    });
    title.anchor.set(0.5);
    title.y = compactHud ? -8 : -9;
    if (title.width > plateWidth - 66) title.scale.set((plateWidth - 66) / title.width);
    signalPlate.addChild(title);

    const subtitle = createText(translateText('REINFORCEMENT STORM') + ' ×' + count, {
      fontFamily: FONT_BODY,
      fontSize: compactHud ? 11 : 13,
      fill: '#72f5ff',
      stroke: '#021018',
      strokeThickness: 2,
      fontWeight: '900',
      letterSpacing: 0.8
    });
    subtitle.anchor.set(0.5);
    subtitle.y = compactHud ? 12 : 14;
    if (subtitle.width > plateWidth - 82) subtitle.scale.set((plateWidth - 82) / subtitle.width);
    signalPlate.addChild(subtitle);

    const platePips = new PIXI.Graphics();
    const pipGap = compactHud ? 10 : 12;
    const pipStart = -((count - 1) * pipGap) / 2;
    for (let index = 0; index < count; index += 1) {
      platePips.poly([
        pipStart + index * pipGap, plateHeight / 2 - 13,
        pipStart + index * pipGap + 3, plateHeight / 2 - 10,
        pipStart + index * pipGap, plateHeight / 2 - 7,
        pipStart + index * pipGap - 3, plateHeight / 2 - 10
      ]);
    }
    platePips.fill({ color: primary, alpha: 0.9 });
    signalPlate.addChild(platePips);

    const plateScan = new PIXI.Graphics();
    plateScan.rect(-plateWidth / 2 + 8, -plateHeight / 2 + 8, compactHud ? 34 : 48, plateHeight - 16);
    plateScan.fill({ color: secondary, alpha: 0.12 });
    plateScan.blendMode = 'add';
    signalPlate.addChild(plateScan);
    this.uiOverlay?.addChild?.(signalPlate);
    this.uiOverlay?.sortChildren?.();

    const wash = new PIXI.Graphics();
    wash.rect(0, 0, width, height);
    wash.fill({ color: superStorm ? 0x18001f : 0x10050b, alpha: reducedMotion ? 0.12 : 0.22 });
    wash.blendMode = 'add';
    overlay.addChild(wash);

    const edge = new PIXI.Graphics();
    const edgeInset = compactHud ? 7 : 13;
    edge.rect(edgeInset, edgeInset, width - edgeInset * 2, height - edgeInset * 2);
    edge.stroke({ color: primary, width: compactHud ? 2 : 4, alpha: 0.52 });
    edge.rect(edgeInset + 8, edgeInset + 8, width - (edgeInset + 8) * 2, height - (edgeInset + 8) * 2);
    edge.stroke({ color: secondary, width: 1.5, alpha: 0.34 });
    const corner = compactHud ? 34 : 62;
    for (const [x, y, sx, sy] of [
      [edgeInset, edgeInset, 1, 1],
      [width - edgeInset, edgeInset, -1, 1],
      [edgeInset, height - edgeInset, 1, -1],
      [width - edgeInset, height - edgeInset, -1, -1]
    ]) {
      edge.moveTo(x, y + sy * corner);
      edge.lineTo(x, y);
      edge.lineTo(x + sx * corner, y);
      edge.stroke({ color: secondary, width: compactHud ? 3 : 5, alpha: 0.8 });
    }
    edge.blendMode = 'add';
    overlay.addChild(edge);

    const laneWidth = width / (count + 1);
    const gateRadius = Math.max(30, Math.min(compactHud ? 46 : 64, laneWidth * 0.27));
    const fleetHorizon = new PIXI.Graphics();
    fleetHorizon.blendMode = 'add';
    fleetHorizon.moveTo(width * 0.06, gateY + gateRadius * 1.85);
    for (let segment = 1; segment <= 18; segment += 1) {
      const ratio = segment / 18;
      const x = width * (0.06 + ratio * 0.88);
      const curve = Math.sin(ratio * Math.PI) * gateRadius * 0.56;
      fleetHorizon.lineTo(x, gateY + gateRadius * 1.85 + curve);
    }
    fleetHorizon.stroke({ color: secondary, width: compactHud ? 2 : 3, alpha: 0.22 });
    fleetHorizon.moveTo(width * 0.12, gateY + gateRadius * 2.16);
    fleetHorizon.lineTo(width * 0.88, gateY + gateRadius * 2.16);
    fleetHorizon.stroke({ color: primary, width: 1.5, alpha: 0.18 });
    overlay.addChild(fleetHorizon);

    const gates = [];
    for (let index = 0; index < count; index += 1) {
      const gate = new PIXI.Container();
      gate.position.set(laneWidth * (index + 1), gateY + (index % 2 ? 9 : -7));
      gate.sortableChildren = true;
      gatePositions.push(Math.round(gate.x));

      const halo = new PIXI.Graphics();
      halo.blendMode = 'add';
      halo.circle(0, 0, gateRadius * 1.28);
      halo.stroke({ color: index % 2 ? secondary : primary, width: compactHud ? 4 : 7, alpha: 0.24 });
      halo.circle(0, 0, gateRadius * 0.84);
      halo.stroke({ color: primary, width: 2, alpha: 0.66 });
      gate.addChild(halo);

      const rotor = new PIXI.Graphics();
      rotor.blendMode = 'add';
      rotor.circle(0, 0, gateRadius);
      rotor.stroke({ color: secondary, width: compactHud ? 2 : 3, alpha: 0.74 });
      for (let spoke = 0; spoke < 8; spoke += 1) {
        const angle = (Math.PI * 2 * spoke) / 8;
        const inner = gateRadius * 0.62;
        const outer = gateRadius * (spoke % 2 ? 1.18 : 1.06);
        rotor.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        rotor.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        rotor.stroke({ color: spoke % 2 ? primary : secondary, width: spoke % 2 ? 2 : 1.2, alpha: 0.7 });
      }
      gate.addChild(rotor);

      let ship = null;
      const ghosts = [];
      const texture = previewTextures[index % Math.max(1, previewTextures.length)] || null;
      if (texture) {
        const textureSize = Math.max(1, Number(texture.width) || 0, Number(texture.height) || 0);
        const shipScale = (gateRadius * (compactHud ? 1.38 : 1.5)) / textureSize;
        for (let ghostIndex = 2; ghostIndex >= 1; ghostIndex -= 1) {
          const ghost = new PIXI.Sprite(texture);
          ghost.anchor.set(0.5);
          ghost.scale.set(shipScale * (1 - ghostIndex * 0.09));
          ghost.y = -gateRadius * ghostIndex * 0.42;
          ghost.alpha = 0.09 + ghostIndex * 0.035;
          ghost.tint = ghostIndex % 2 ? secondary : primary;
          ghost.blendMode = 'add';
          gate.addChild(ghost);
          ghosts.push(ghost);
        }
        ship = new PIXI.Sprite(texture);
        ship.anchor.set(0.5);
        ship.scale.set(shipScale);
        ship.alpha = 0.96;
        ship.zIndex = 3;
        gate.addChild(ship);
      } else {
        ship = new PIXI.Graphics();
        ship.poly([
          -gateRadius * 0.28, gateRadius * 0.18,
          0, -gateRadius * 0.5,
          gateRadius * 0.28, gateRadius * 0.18,
          0, gateRadius * 0.5
        ]);
        ship.fill({ color: index % 2 ? primary : secondary, alpha: 0.92 });
        ship.stroke({ color: 0xffffff, width: 1.4, alpha: 0.8 });
        ship.zIndex = 3;
        gate.addChild(ship);
      }

      const chevrons = new PIXI.Graphics();
      chevrons.blendMode = 'add';
      for (let chevron = 0; chevron < 3; chevron += 1) {
        const y = gateRadius * (1.45 + chevron * 0.42);
        chevrons.moveTo(-gateRadius * 0.36, y - gateRadius * 0.18);
        chevrons.lineTo(0, y);
        chevrons.lineTo(gateRadius * 0.36, y - gateRadius * 0.18);
        chevrons.stroke({ color: chevron % 2 ? secondary : primary, width: compactHud ? 2 : 3, alpha: 0.76 - chevron * 0.14 });
      }
      gate.addChild(chevrons);
      overlay.addChild(gate);
      gates.push({ gate, halo, rotor, ship, ghosts, chevrons, x: gate.x, y: gate.y, phase: index * 0.74 });
    }

    const motion = new PIXI.Graphics();
    motion.blendMode = 'add';
    overlay.addChild(motion);

    let elapsed = 0;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      this.game?.app?.ticker?.remove?.(ticker);
      if (overlay.parent) overlay.parent.removeChild(overlay);
      overlay.destroy?.({ children: true });
      if (signalPlate.parent) signalPlate.parent.removeChild(signalPlate);
      signalPlate.destroy?.({ children: true });
      if (this.activeMayhemReinforcementWarning?.overlay === overlay) {
        this.activeMayhemReinforcementWarning = null;
      }
    };
    const ticker = (delta) => {
      elapsed += (Number(delta?.deltaTime) || Number(delta) || 1) * 16.67;
      const t = Math.min(1, elapsed / duration);
      const intro = Math.min(1, t / 0.2);
      const fade = t > 0.78 ? Math.max(0, (1 - t) / 0.22) : 1;
      const pulse = reducedMotion ? 0.5 : (Math.sin(elapsed * 0.012) + 1) * 0.5;
      overlay.alpha = fade;
      signalPlate.alpha = intro * fade;
      signalPlate.scale.set(0.9 + intro * 0.1 + (reducedMotion ? 0 : pulse * 0.012));
      plateGlow.alpha = 0.45 + pulse * 0.55;
      plateScan.x = -plateWidth * 0.44 + ((elapsed % 760) / 760) * plateWidth * 0.88;
      wash.alpha = (0.28 + pulse * 0.38) * intro;
      edge.alpha = (0.58 + pulse * 0.42) * intro;
      motion.clear();

      const sweepY = -height * 0.08 + height * 0.74 * ((elapsed % 820) / 820);
      motion.moveTo(0, sweepY);
      motion.lineTo(width, sweepY + (superStorm ? 24 : 8));
      motion.stroke({ color: secondary, width: compactHud ? 3 : 5, alpha: 0.1 + pulse * 0.16 });

      const atmosphereStreakCount = reducedMotion ? 8 : 18;
      for (let streak = 0; streak < atmosphereStreakCount; streak += 1) {
        const x = width * ((streak + 0.45) / atmosphereStreakCount);
        const travel = (elapsed * (0.19 + (streak % 5) * 0.018) + streak * 73) % (height * 0.72);
        const y = gateY - gateRadius * 2 + travel;
        const length = compactHud ? 18 + (streak % 3) * 7 : 28 + (streak % 4) * 12;
        motion.moveTo(x, y);
        motion.lineTo(x + (streak % 2 ? 5 : -5), y + length);
        motion.stroke({
          color: streak % 3 === 0 ? primary : streak % 3 === 1 ? secondary : 0xffffff,
          width: streak % 4 === 0 ? 2.4 : 1.1,
          alpha: (streak % 4 === 0 ? 0.28 : 0.13) * intro * fade
        });
      }

      gates.forEach((entry, index) => {
        const gatePulse = reducedMotion ? 0.5 : (Math.sin(elapsed * 0.01 + entry.phase) + 1) * 0.5;
        const gateScale = (0.62 + intro * 0.38) * (1 + gatePulse * (reducedMotion ? 0.018 : 0.08));
        entry.gate.scale.set(gateScale);
        entry.gate.y = entry.y + (reducedMotion ? 0 : Math.sin(elapsed * 0.004 + entry.phase) * 5);
        entry.rotor.rotation += reducedMotion ? 0 : (Number(delta?.deltaTime) || 1) * (index % 2 ? -0.018 : 0.022);
        entry.halo.scale.set(0.88 + gatePulse * 0.24);
        entry.halo.alpha = 0.44 + gatePulse * 0.56;
        entry.ship.alpha = 0.72 + gatePulse * 0.28;
        entry.ship.y = reducedMotion ? 0 : Math.sin(elapsed * 0.006 + entry.phase) * 3;
        entry.ghosts.forEach((ghost, ghostIndex) => {
          ghost.alpha = (0.08 + ghostIndex * 0.05) * (0.58 + gatePulse * 0.42);
          ghost.y -= reducedMotion ? 0 : (Number(delta?.deltaTime) || 1) * (0.08 + ghostIndex * 0.035);
          if (ghost.y < -gateRadius * 1.5) ghost.y = -gateRadius * (0.42 + ghostIndex * 0.34);
        });
        entry.chevrons.y = reducedMotion ? 0 : ((elapsed * 0.045 + index * 11) % 18);

        motion.moveTo(entry.x, 0);
        motion.lineTo(entry.x, entry.y - gateRadius * 1.25);
        motion.stroke({ color: index % 2 ? secondary : primary, width: compactHud ? 3 : 5, alpha: 0.16 + gatePulse * 0.28 });
        motion.moveTo(entry.x - gateRadius * 0.5, entry.y + gateRadius * 1.4);
        motion.lineTo(entry.x - gateRadius * 0.16, height * 0.58);
        motion.lineTo(entry.x + gateRadius * 0.2, height * 0.72);
        motion.stroke({ color: index % 2 ? primary : secondary, width: compactHud ? 4 : 7, alpha: 0.11 + gatePulse * 0.2 });
        for (let spark = 0; spark < (reducedMotion ? 2 : 5); spark += 1) {
          const sparkPhase = (elapsed * (0.11 + spark * 0.013) + index * 97 + spark * 41) % (height * 0.46);
          const x = entry.x + Math.sin(sparkPhase * 0.04 + spark) * gateRadius * 0.9;
          const y = entry.y + gateRadius + sparkPhase;
          motion.circle(x, y, spark % 2 ? 1.5 : 2.5);
          motion.fill({ color: spark % 2 ? primary : secondary, alpha: 0.3 + gatePulse * 0.5 });
        }
      });

      if (gates.length > 1) {
        for (let index = 0; index < gates.length - 1; index += 1) {
          const from = gates[index];
          const to = gates[index + 1];
          motion.moveTo(from.x + gateRadius * 0.72, from.y);
          const segments = 6;
          for (let segment = 1; segment <= segments; segment += 1) {
            const ratio = segment / segments;
            const jitter = segment === segments
              ? 0
              : Math.sin(elapsed * 0.02 + segment * 4.3 + index) * gateRadius * 0.16;
            motion.lineTo(
              from.x + gateRadius * 0.72 + (to.x - from.x - gateRadius * 1.44) * ratio,
              from.y + (to.y - from.y) * ratio + jitter
            );
          }
          motion.stroke({
            color: index % 2 ? primary : secondary,
            width: superStorm ? 3.2 : 2,
            alpha: 0.16 + pulse * 0.22
          });
        }
      }

      if (superStorm && !reducedMotion) {
        const arcRadius = Math.min(width * 0.42, height * 0.46);
        const arcY = gateY + gateRadius * 2.2;
        for (let point = 0; point <= 24; point += 1) {
          const ratio = point / 24;
          const angle = Math.PI + ratio * Math.PI;
          const x = width / 2 + Math.cos(angle) * arcRadius;
          const y = arcY + Math.sin(angle) * arcRadius * 0.34;
          if (point === 0) motion.moveTo(x, y);
          else motion.lineTo(x, y);
        }
        motion.stroke({ color: primary, width: 2 + pulse * 3, alpha: 0.1 + pulse * 0.17 });
      }
      if (t >= 1 || this.game?.currentScene !== this) {
        cleanup();
      }
    };
    this.game.app.ticker.add(ticker);
    this.activeMayhemReinforcementWarning = { overlay, signalPlate, cleanup };

    AudioManager.playSfx('intro_panel_whoosh', { force: count >= 3, volume: superStorm ? 0.72 : 0.52, minIntervalMs: 0 });
    AudioManager.playSfx(count >= 3 ? 'swarm_chatter_stinger' : 'enemy_threat_soft_warn', {
      force: count >= 3,
      volume: count >= 3 ? (superStorm ? 0.84 : 0.72) : 0.38
    });
    if (!reducedMotion && count >= 3) this.screenShake?.shake?.(superStorm ? 7 : 5, superStorm ? 16 : 12);
    return true;
  }

  showMayhemReinforcementEntryBurst({
    groupIndex = 0,
    groupCount = 1,
    laneOffsetPx = 0,
    boss = false,
    superStorm = false,
    delayMs = 0
  } = {}) {
    const layer = this.decorativeOverlay || this.gameContainer || this.container;
    if (!layer || !this.game?.app?.ticker) return false;

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 620;
    const reducedMotion = Boolean(getAccessibilitySettings().prefersReducedMotion);
    const count = Math.max(1, Math.min(8, Math.floor(Number(groupCount) || 1)));
    const index = Math.max(0, Math.min(count - 1, Math.floor(Number(groupIndex) || 0)));
    const startDelay = Math.max(0, Math.floor(Number(delayMs) || 0));
    const primary = superStorm ? 0xff45f4 : boss ? 0xff5577 : 0xffdf63;
    const secondary = 0x43efff;
    const laneX = (width / (count + 1)) * (index + 1);
    const x = Math.max(52, Math.min(width - 52, laneX + (Number(laneOffsetPx) || 0) * 0.12));
    const y = compact
      ? Math.min(height * 0.5, Math.max(220, height * 0.4))
      : Math.min(height * 0.38, Math.max(260, height * 0.255));
    const radius = compact ? 46 : 66;
    const activeDuration = reducedMotion ? 720 : 1180;
    const previewTexture = this.getMayhemReinforcementPreviewTextures(count)[index] ||
      this.getMayhemReinforcementPreviewTextures(1)[0] || null;

    const root = new PIXI.Container();
    root.label = `mayhem_reinforcement_entry_${index + 1}_of_${count}`;
    root.position.set(x, y);
    root.eventMode = 'none';
    root.visible = false;
    root.blendMode = 'add';
    layer.addChild(root);

    const screenFlash = new PIXI.Graphics();
    if (index === 0) {
      screenFlash.rect(-x, -y, width, height);
      screenFlash.fill({ color: superStorm ? 0xff6bfa : boss ? 0xff6d82 : 0xffef9a, alpha: 0.12 });
    } else {
      screenFlash.circle(0, 0, radius * 1.76);
      screenFlash.fill({ color: superStorm ? 0xff6bfa : boss ? 0xff6d82 : 0xffef9a, alpha: 0.075 });
    }
    root.addChild(screenFlash);

    const impactField = new PIXI.Graphics();
    root.addChild(impactField);

    const portal = new PIXI.Container();
    portal.sortableChildren = true;
    root.addChild(portal);

    const halo = new PIXI.Graphics();
    halo.circle(0, 0, radius * 1.45);
    halo.stroke({ color: secondary, width: compact ? 8 : 12, alpha: 0.16 });
    halo.circle(0, 0, radius);
    halo.stroke({ color: primary, width: compact ? 3 : 5, alpha: 0.78 });
    portal.addChild(halo);

    const rotor = new PIXI.Graphics();
    rotor.circle(0, 0, radius * 0.72);
    rotor.stroke({ color: 0xffffff, width: 1.5, alpha: 0.76 });
    for (let spoke = 0; spoke < 10; spoke += 1) {
      const angle = (Math.PI * 2 * spoke) / 10;
      rotor.moveTo(Math.cos(angle) * radius * 0.54, Math.sin(angle) * radius * 0.54);
      rotor.lineTo(Math.cos(angle) * radius * (spoke % 2 ? 0.9 : 1.08), Math.sin(angle) * radius * (spoke % 2 ? 0.9 : 1.08));
      rotor.stroke({ color: spoke % 2 ? primary : secondary, width: spoke % 2 ? 2.4 : 1.4, alpha: 0.78 });
    }
    portal.addChild(rotor);

    const tear = new PIXI.Graphics();
    portal.addChild(tear);
    const streaks = new PIXI.Graphics();
    root.addChild(streaks);

    let previewShip = null;
    if (previewTexture) {
      const textureSize = Math.max(1, Number(previewTexture.width) || 0, Number(previewTexture.height) || 0);
      previewShip = new PIXI.Sprite(previewTexture);
      previewShip.anchor.set(0.5);
      previewShip.scale.set((radius * 1.42) / textureSize);
      previewShip.alpha = 0;
      previewShip.zIndex = 4;
      portal.addChild(previewShip);
    }

    let elapsed = 0;
    let fired = false;
    const ticker = (delta) => {
      elapsed += (Number(delta?.deltaTime) || Number(delta) || 1) * 16.67;
      if (this.game?.currentScene !== this) elapsed = startDelay + activeDuration;
      if (elapsed < startDelay) return;
      if (!fired) {
        fired = true;
        root.visible = true;
        if (this.activeMayhemReinforcementWarning?.signalPlate) {
          this.activeMayhemReinforcementWarning.signalPlate.visible = false;
        }
        const last = this.lastMayhemReinforcementPresentation || {};
        const entryPositions = Array.isArray(last.entryPositions) ? [...last.entryPositions] : [];
        entryPositions[index] = Math.round(x);
        const arrivalAudioLayerCount = index === 0 ? 3 : 1;
        this.lastMayhemReinforcementPresentation = {
          ...last,
          phase: 'entry',
          groupCount: count,
          entryBursts: Math.max(Number(last.entryBursts) || 0, index + 1),
          lastEntryGroup: index,
          boss: Boolean(last.boss || boss),
          superStorm: Boolean(last.superStorm || superStorm),
          scoreNeutral: true,
          signalPlateVisible: false,
          entryPositions,
          entryImpactCount: Math.max(Number(last.entryImpactCount) || 0, index + 1),
          arrivalAudioLayerCount: Math.max(Number(last.arrivalAudioLayerCount) || 0, arrivalAudioLayerCount),
          activeUntil: Date.now() + activeDuration
        };
        AudioManager.playSfx('coin_portal_open', {
          force: index === 0,
          volume: superStorm ? 0.7 : 0.52,
          minIntervalMs: index === 0 ? 0 : 140
        });
        if (index === 0) {
          AudioManager.playSfx('nova_boss_entrance_impact', {
            force: true,
            volume: superStorm ? 0.82 : 0.64,
            minIntervalMs: 0
          });
          AudioManager.playSfx('intro_panel_whoosh', {
            force: true,
            volume: superStorm ? 0.66 : 0.48,
            minIntervalMs: 0
          });
        }
        this.emitSpectacle('reinforcement', {
          x,
          y,
          color: primary,
          accent: secondary,
          intensity: superStorm ? 1.18 : (index === 0 ? 0.98 : 0.78),
          audioIntensity: superStorm ? 1.08 : 0.88,
          audioVolume: 0.74,
          pitchScale: 0.96 + index * 0.035,
          force: true,
          audio: index === 0,
          performanceLite: count >= 3 && index > 0,
          seed: index + count * 0.37
        });
        if (!reducedMotion) {
          this.screenShake?.shake?.(index === 0 ? (superStorm ? 9 : 6) : 3.2, index === 0 ? 18 : 10);
          if (index === 0 && superStorm) this.screenShake?.freezeFrame?.(2);
        }
        this.particleManager?.createExplosion?.(x, y + radius * 0.35, primary, superStorm ? 0.74 : 0.56);
        this.particleManager?.createExplosion?.(x, y + radius * 0.2, secondary, superStorm ? 0.66 : 0.44);
      }

      const t = Math.min(1, (elapsed - startDelay) / activeDuration);
      const impact = Math.min(1, t / 0.18);
      const fade = Math.pow(Math.max(0, 1 - t), 0.8);
      const pulse = reducedMotion ? 0.5 : (Math.sin(elapsed * 0.018 + index) + 1) * 0.5;
      root.alpha = fade;
      portal.scale.set((0.34 + impact * 0.86) * (1 + pulse * (reducedMotion ? 0.02 : 0.1)));
      rotor.rotation += reducedMotion ? 0 : (Number(delta?.deltaTime) || 1) * (index % 2 ? -0.045 : 0.05);
      halo.scale.set(0.72 + impact * 0.48 + pulse * 0.12);
      halo.alpha = 0.48 + pulse * 0.52;
      screenFlash.alpha = Math.max(0, 1 - t / 0.2) * (reducedMotion ? 0.16 : superStorm ? 0.78 : 0.5);

      if (previewShip) {
        const shipTravel = Math.min(1, Math.max(0, (t - 0.06) / 0.58));
        previewShip.alpha = Math.sin(Math.min(1, shipTravel) * Math.PI) * (superStorm ? 0.92 : 0.8);
        previewShip.y = radius * (-0.2 + shipTravel * 2.1);
        previewShip.scale.y = Math.abs(previewShip.scale.x) * (0.62 + shipTravel * 0.58);
      }

      impactField.clear();
      const crowdedArrival = count >= 3;
      const shockwaveCount = reducedMotion
        ? 1
        : (crowdedArrival ? (index === 0 ? 2 : 1) : 3);
      for (let ring = 0; ring < shockwaveCount; ring += 1) {
        const phase = Math.min(1, Math.max(0, t * 1.45 - ring * 0.11));
        const ringRadius = radius * (0.72 + phase * (3.1 + ring * 0.25));
        impactField.circle(0, 0, ringRadius);
        impactField.stroke({
          color: ring % 2 ? secondary : primary,
          width: Math.max(1, (compact ? 6 : 9) * (1 - phase)),
          alpha: (0.58 - ring * 0.08) * (1 - phase) * fade
        });
      }
      const rayCount = reducedMotion
        ? 6
        : (crowdedArrival ? (index === 0 ? 10 : 7) : 16);
      for (let ray = 0; ray < rayCount; ray += 1) {
        const angle = (Math.PI * 2 * ray) / rayCount + index * 0.31;
        const rayTravel = Math.min(1, t * (1.7 + (ray % 4) * 0.08));
        const inner = radius * (0.82 + rayTravel * 0.3);
        const outer = radius * (1.35 + rayTravel * (2.4 + (ray % 5) * 0.38));
        impactField.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        impactField.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        impactField.stroke({
          color: ray % 3 === 0 ? primary : ray % 3 === 1 ? secondary : 0xffffff,
          width: ray % 4 === 0 ? (compact ? 3 : 5) : 1.4,
          alpha: (ray % 4 === 0 ? 0.5 : 0.24) * fade
        });
      }

      tear.clear();
      const slitHeight = radius * (0.2 + impact * 1.8);
      tear.moveTo(0, -slitHeight);
      tear.bezierCurveTo(-radius * 0.28, -slitHeight * 0.34, radius * 0.28, slitHeight * 0.34, 0, slitHeight);
      tear.stroke({ color: 0xffffff, width: compact ? 4 : 7, alpha: 0.72 + pulse * 0.28 });
      tear.moveTo(-radius * 0.18, -slitHeight * 0.78);
      tear.lineTo(radius * 0.2, slitHeight * 0.8);
      tear.stroke({ color: secondary, width: compact ? 8 : 13, alpha: 0.16 + pulse * 0.22 });

      streaks.clear();
      const travel = Math.min(1, t / 0.72);
      const streakCount = reducedMotion ? 5 : (count >= 3 ? 8 : 13);
      for (let streak = 0; streak < streakCount; streak += 1) {
        const side = streak - (streakCount - 1) / 2;
        const startX = side * radius * 0.16;
        const endY = radius * (1.2 + travel * (5.4 + (streak % 4) * 0.72));
        const bend = side * radius * (0.14 + travel * 0.2);
        streaks.moveTo(startX, radius * 0.34);
        streaks.lineTo(startX + bend, endY);
        streaks.stroke({
          color: streak % 3 === 0 ? primary : streak % 3 === 1 ? secondary : 0xffffff,
          width: compact ? 2 + (streak % 2) : 2.5 + (streak % 4),
          alpha: (0.18 + (streak % 3) * 0.13) * fade
        });
      }

      if (t >= 1) {
        this.game.app.ticker.remove(ticker);
        if (root.parent) root.parent.removeChild(root);
        root.destroy?.({ children: true });
      }
    };
    this.game.app.ticker.add(ticker);
    return true;
  }

  showMayhemReinforcementStormSurvived({ groupCount = 2, score = 0, superStorm = false } = {}) {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 620;
    const reducedMotion = Boolean(getAccessibilitySettings().prefersReducedMotion);
    const count = Math.max(2, Math.min(8, Math.floor(Number(groupCount) || 2)));
    const appliedScore = Math.max(0, Math.floor(Number(score) || 0));
    const duration = reducedMotion ? 900 : 1450;
    const startedAt = Date.now();
    const primary = superStorm ? 0xff5df7 : 0xffef7e;
    const secondary = 0x43efff;
    const centerX = Number(this.player?.x) || width / 2;
    const centerY = Math.max(height * 0.28, Math.min(height * 0.64, (Number(this.player?.y) || height * 0.68) - 30));

    this.lastMayhemReinforcementPresentation = {
      ...(this.lastMayhemReinforcementPresentation || {}),
      phase: 'survived',
      groupCount: count,
      superStorm,
      score: appliedScore,
      startedAt,
      activeUntil: startedAt + duration
    };

    this.enqueueToast?.(translateText('STORM SURVIVED +{score}', {
      score: appliedScore.toLocaleString('en-US')
    }), {
      fontSize: compact ? 18 : 24,
      fill: superStorm ? '#ff9cff' : '#ffef7e',
      stroke: '#160006',
      strokeThickness: compact ? 3 : 4,
      slot: 'top',
      type: 'bonus',
      priority: 7,
      duration: Math.min(1800, duration + 250),
      maxWidth: width * (compact ? 0.86 : 0.58)
    });

    const layer = this.decorativeOverlay || this.gameContainer || this.container;
    if (layer && this.game?.app?.ticker) {
      const root = new PIXI.Container();
      root.label = 'mayhem_reinforcement_storm_survived';
      root.position.set(centerX, centerY);
      root.eventMode = 'none';
      root.blendMode = 'add';
      layer.addChild(root);

      const flash = new PIXI.Graphics();
      flash.rect(-centerX, -centerY, width, height);
      flash.fill({ color: superStorm ? 0xff9cff : 0xffefb0, alpha: 0.2 });
      root.addChild(flash);

      const rays = new PIXI.Graphics();
      const rayCount = reducedMotion ? 8 : 18;
      for (let ray = 0; ray < rayCount; ray += 1) {
        const angle = (Math.PI * 2 * ray) / rayCount;
        const inner = compact ? 36 : 54;
        const outer = (compact ? 120 : 210) * (0.76 + (ray % 4) * 0.09);
        rays.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        rays.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        rays.stroke({ color: ray % 3 ? secondary : primary, width: ray % 3 ? 2 : 5, alpha: ray % 3 ? 0.34 : 0.58 });
      }
      root.addChild(rays);

      const rings = new PIXI.Graphics();
      root.addChild(rings);
      const core = new PIXI.Graphics();
      core.poly([0, -28, 18, -10, 38, 0, 18, 10, 0, 28, -18, 10, -38, 0, -18, -10]);
      core.fill({ color: primary, alpha: 0.8 });
      core.stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
      root.addChild(core);

      let elapsed = 0;
      const ticker = (delta) => {
        elapsed += (Number(delta?.deltaTime) || Number(delta) || 1) * 16.67;
        const t = Math.min(1, elapsed / duration);
        const intro = Math.min(1, t / 0.14);
        const fade = Math.pow(Math.max(0, 1 - t), 0.72);
        const pulse = reducedMotion ? 0.5 : (Math.sin(elapsed * 0.018) + 1) * 0.5;
        root.alpha = fade;
        root.scale.set(0.62 + intro * 0.52 + pulse * (reducedMotion ? 0.01 : 0.06));
        flash.alpha = Math.max(0, (1 - t / 0.24) * (reducedMotion ? 0.18 : 0.48));
        rays.rotation += reducedMotion ? 0 : (Number(delta?.deltaTime) || 1) * 0.008;
        core.rotation -= reducedMotion ? 0 : (Number(delta?.deltaTime) || 1) * 0.025;
        rings.clear();
        for (let ring = 0; ring < 4; ring += 1) {
          const phase = Math.min(1, Math.max(0, t * 1.35 - ring * 0.13));
          const radius = (compact ? 48 : 72) + phase * (compact ? 180 : 330);
          rings.circle(0, 0, radius);
          rings.stroke({
            color: ring % 2 ? secondary : primary,
            width: Math.max(1, (compact ? 5 : 8) * (1 - phase)),
            alpha: (0.56 - ring * 0.08) * (1 - phase) * fade
          });
        }
        if (t >= 1 || this.game?.currentScene !== this) {
          this.game.app.ticker.remove(ticker);
          if (root.parent) root.parent.removeChild(root);
          root.destroy?.({ children: true });
        }
      };
      this.game.app.ticker.add(ticker);
    }

    this.particleManager?.createExplosion?.(centerX, centerY, primary, superStorm ? 1.2 : 0.92);
    this.particleManager?.createExplosion?.(centerX, centerY, secondary, superStorm ? 1.0 : 0.72);
    if (!reducedMotion) this.screenShake?.shake?.(superStorm ? 7 : 5, superStorm ? 18 : 14);
    AudioManager.playSfx('combo_breakout', { force: true, volume: superStorm ? 0.72 : 0.58, minIntervalMs: 0 });
    AudioManager.playSfx('nova_wave_clear_sweep', { force: true, volume: superStorm ? 0.72 : 0.56, minIntervalMs: 0 });
    this.emitSpectacle('reinforcement', {
      x: centerX,
      y: centerY,
      color: primary,
      accent: secondary,
      intensity: superStorm ? 1.24 : 0.96,
      audioIntensity: superStorm ? 1.08 : 0.86,
      audioVolume: 0.72,
      pitchScale: 1.06,
      force: true
    });
    return true;
  }

  showBossIntro(name, taunt) {
    this.resetTransientGameplayInput('boss_intro_enter', {
      preserveFire: true,
      preserveMovement: true
    });
    const { width, height } = this.game.app.screen;
    const compact = width < 720;
    const edgeAligned = !compact && width >= 1100;
    const panelWidth = edgeAligned
      ? Math.max(330, Math.min(460, width * 0.3))
      : Math.max(300, Math.min(compact ? width - 34 : 560, width * 0.66));
    const panelHeight = compact ? 148 : (edgeAligned ? 100 : 116);
    const duration = (compact ? 1680 : 1780) + GAMEPLAY_MESSAGE_EXTRA_READ_MS;
    const fitText = (text, maxWidth, maxHeight, minScale = 0.68) => {
      if (!text) return;
      text.scale.set(1);
      text.style.wordWrap = true;
      text.style.wordWrapWidth = maxWidth;
      text.style.align = 'center';
      text.updateText?.(false);
      const widthScale = maxWidth / Math.max(1, text.width || maxWidth);
      const heightScale = maxHeight / Math.max(1, text.height || maxHeight);
      const targetScale = Math.min(1, widthScale, heightScale);
      text.scale.set(targetScale < minScale ? Math.max(0.08, targetScale) : Math.max(minScale, targetScale));
    };
    this.dismissToastDisplay(this.activeBossIntroCard, 'center');
    this.reserveMessageFocus(duration + 360, { priority: 4, slots: ['center', 'top', 'corner'] });

    const card = new PIXI.Container();
    card.label = 'ui_boss_intro_signal';
    card.eventMode = 'none';
    card.interactive = false;
    card.x = edgeAligned ? panelWidth / 2 + 18 : width / 2;
    const preferredY = compact ? height * 0.43 : (edgeAligned ? height * 0.4 : height * 0.35);
    const minimumY = compact ? 190 : (edgeAligned ? 262 : 220);
    const bottomSafeY = height - panelHeight / 2 - (compact ? 82 : 92);
    card.y = Math.min(bottomSafeY, Math.max(minimumY, preferredY));
    card.alpha = 0;

    const accent = 0xff3d2f;
    const gold = 0xffe66d;
    const cyan = 0x57f3ff;
    const glow = new PIXI.Graphics();
    glow.roundRect(-panelWidth / 2 - 10, -panelHeight / 2 - 7, panelWidth + 20, panelHeight + 14, 12);
    glow.fill({ color: accent, alpha: 0.075 });
    glow.roundRect(-panelWidth / 2 - 6, -panelHeight / 2 - 5, panelWidth + 12, panelHeight + 10, 10);
    glow.stroke({ color: cyan, width: 1.4, alpha: 0.12 });
    card.addChild(glow);

    const panel = new PIXI.Graphics();
    panel.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x05090f, alpha: 0.9 });
    panel.stroke({ color: accent, width: 2.2, alpha: 0.88 });
    panel.roundRect(-panelWidth / 2 + 8, -panelHeight / 2 + 8, panelWidth - 16, panelHeight - 16, 5);
    panel.stroke({ color: cyan, width: 1.2, alpha: 0.42 });
    panel.rect(-panelWidth / 2 + 10, -panelHeight / 2 + 10, panelWidth - 20, 5);
    panel.fill({ color: gold, alpha: 0.2 });
    panel.rect(-panelWidth / 2 + 10, panelHeight / 2 - 15, panelWidth - 20, 3);
    panel.fill({ color: cyan, alpha: 0.16 });
    card.addChild(panel);

    const signal = new PIXI.Graphics();
    signal.blendMode = 'add';
    const tickCount = compact ? 8 : 12;
    for (let i = 0; i < tickCount; i += 1) {
      const ratio = tickCount <= 1 ? 0.5 : i / (tickCount - 1);
      const x = -panelWidth / 2 + 34 + ratio * (panelWidth - 68);
      const top = -panelHeight / 2 + 19;
      const bottom = panelHeight / 2 - 19;
      signal.moveTo(x, top);
      signal.lineTo(x + (i % 2 ? 7 : -7), top + 9);
      signal.moveTo(x, bottom);
      signal.lineTo(x + (i % 2 ? -7 : 7), bottom - 9);
    }
    signal.stroke({ color: gold, width: 1.2, alpha: 0.28 });
    for (const side of [-1, 1]) {
      const x = side * (panelWidth / 2 - 18);
      signal.moveTo(x, -panelHeight / 2 + 26);
      signal.lineTo(x - side * 24, -panelHeight / 2 + 26);
      signal.moveTo(x, panelHeight / 2 - 26);
      signal.lineTo(x - side * 24, panelHeight / 2 - 26);
    }
    signal.stroke({ color: cyan, width: 2, alpha: 0.38 });
    card.addChild(signal);

    const title = createText(name || 'BOSS', {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 21 : 25,
      fill: '#ff5c3d',
      stroke: '#080005',
      strokeThickness: 4,
      fontWeight: '900',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 38,
      lineHeight: compact ? 25 : 31,
      dropShadow: true,
      dropShadowColor: '#ff2f4d',
      dropShadowBlur: 8,
      dropShadowDistance: 0
    });
    title.anchor.set(0.5);
    title.y = compact ? -42 : (edgeAligned ? -21 : -31);
    fitText(title, panelWidth - 54, compact ? 38 : (edgeAligned ? 27 : 32), 0.38);
    card.addChild(title);

    const line = createText(taunt || 'LET\'S GO!', {
      fontFamily: FONT_BODY,
      fontSize: compact ? 16 : 18,
      fill: '#d9f8ff',
      stroke: '#020711',
      strokeThickness: 3,
      fontWeight: '800',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 48,
      lineHeight: compact ? 20 : 23,
      dropShadow: true,
      dropShadowColor: '#57f3ff',
      dropShadowBlur: 5,
      dropShadowDistance: 0
    });
    line.anchor.set(0.5);
    fitText(line, panelWidth - 58, compact ? 56 : (edgeAligned ? 32 : 42), 0.5);
    const titleBottom = title.y + Math.max(0, title.height || 0) / 2;
    const lineHalfHeight = Math.max(0, line.height || 0) / 2;
    line.y = Math.min(
      panelHeight / 2 - (edgeAligned ? 14 : 24) - lineHalfHeight,
      Math.max(compact ? 30 : (edgeAligned ? 17 : 25), titleBottom + (edgeAligned ? 7 : 11) + lineHalfHeight)
    );
    card.addChild(line);

    card.__bossIntroDebug = {
      edgeAligned,
      placement: edgeAligned ? 'left-edge' : 'center-compact',
      panelWidth: Math.round(panelWidth),
      panelHeight: Math.round(panelHeight),
      x: Math.round(card.x),
      y: Math.round(card.y)
    };

    this.uiOverlay.addChild(card);
    this.activeBossIntroCard = card;
    card.__toastMeta = {
      message: `${name || 'BOSS'}\n${taunt || 'LET\'S GO!'}`,
      title: name || 'BOSS',
      type: 'boss_intro',
      slot: 'center',
      priority: 4,
      duration,
      edgeAligned,
      placement: edgeAligned ? 'left-edge' : 'center-compact',
      duplicateKey: this.getToastDuplicateKey(`${name || 'BOSS'}\n${taunt || 'LET\'S GO!'}`, 'boss_intro'),
      originalOptions: {
        type: 'boss_intro',
        slot: 'center',
        priority: 4,
        edgeAligned,
        placement: edgeAligned ? 'left-edge' : 'center-compact'
      },
      createdAt: Date.now()
    };
    this.lastHitStopRequestMs = 250;
    this.freezeTimerMs = this.lastHitStopRequestMs;
    AudioManager.play('menuSelect'); // Calmer sound for boss intro (removed annoying computerNoise)

    let elapsed = 0;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      const shimmer = Math.sin(elapsed * 0.018) * 0.5 + 0.5;
      signal.alpha = 0.74 + shimmer * 0.22;
      glow.alpha = 0.82 + shimmer * 0.12;
      if (elapsed < 200) {
        const t = elapsed / 200;
        card.alpha = t;
        card.scale.set(0.96 + t * 0.04);
      } else if (elapsed > duration - 300) {
        card.alpha = Math.max(0, (duration - elapsed) / 300);
      } else {
        card.alpha = 1;
        card.scale.set(1 + Math.sin(elapsed * 0.01) * 0.006);
      }
      if (elapsed >= duration) {
        this.game.app.ticker.remove(ticker);
        if (card.parent) card.parent.removeChild(card);
        if (this.activeBossIntroCard === card) {
          this.resetTransientGameplayInput('boss_intro_exit', {
            preserveFire: true,
            preserveMovement: true
          });
          this.activeBossIntroCard = null;
        }
      }
    };
    card.__toastTicker = ticker;
    this.game.app.ticker.add(ticker);
  }

  emitSpectacle(kind = 'kill', options = {}) {
    const width = Math.max(1, Number(this.game?.getWidth?.()) || 1);
    const height = Math.max(1, Number(this.game?.getHeight?.()) || 1);
    const x = Number.isFinite(options.x)
      ? options.x
      : (Number.isFinite(this.player?.x) ? this.player.x : width * 0.5);
    const y = Number.isFinite(options.y)
      ? options.y
      : (Number.isFinite(this.player?.y) ? this.player.y : height * 0.55);
    const result = this.spectacleDirector?.emit?.({
      kind,
      x,
      y,
      color: Number.isFinite(options.color) ? options.color : 0x43efff,
      accent: Number.isFinite(options.accent) ? options.accent : 0xff5df7,
      intensity: Number.isFinite(options.intensity) ? options.intensity : 1,
      durationMs: options.durationMs,
      force: options.force === true,
      performanceLite: options.performanceLite === true,
      seed: options.seed
    });
    if (!result || options.audio === false) return result;

    const pan = Math.max(-0.78, Math.min(0.78, ((x / width) - 0.5) * 1.42));
    AudioManager.playSpectacleAccent?.(kind, {
      pan,
      intensity: Number.isFinite(options.audioIntensity)
        ? options.audioIntensity
        : (Number.isFinite(options.intensity) ? options.intensity : 1),
      volume: Number.isFinite(options.audioVolume) ? options.audioVolume : 1,
      pitchScale: Number.isFinite(options.pitchScale) ? options.pitchScale : 1,
      force: options.audioForce === true || options.force === true,
      minIntervalMs: options.audioMinIntervalMs,
      cooldownKey: options.audioCooldownKey
    });
    return result;
  }

  triggerShockwave(x, y, color = 0xffff00) {
    const wave = new PIXI.Graphics();
    const paths = [
      [-12, 2, -5, -12, 7, -10, 14, -2],
      [-10, 7, -2, 14, 8, 10, 12, 4],
      [-4, -11, 3, -15, 11, -7, 13, 1]
    ];
    paths.forEach((path, index) => {
      wave.moveTo(path[0], path[1]);
      wave.bezierCurveTo(path[2], path[3], path[4], path[5], path[6], path[7]);
      wave.stroke({
        color: index === 1 ? 0xffffff : color,
        width: index === 1 ? 1.1 : 2.2,
        alpha: index === 1 ? 0.42 : 0.74
      });
    });
    wave.blendMode = 'add';
    wave.x = x;
    wave.y = y;
    wave.rotation = -0.22;
    this.uiOverlay.addChild(wave);
    let radius = 10;
    const ticker = (delta) => {
      radius += delta.deltaTime * 2.4;
      wave.scale.set(radius / 10, radius / 11.8);
      wave.rotation += 0.003 * delta.deltaTime;
      wave.alpha -= 0.022 * delta.deltaTime;
      if (wave.alpha <= 0) {
        this.game.app.ticker.remove(ticker);
        if (wave.parent) wave.parent.removeChild(wave);
        wave.destroy?.();
      }
    };
    this.game.app.ticker.add(ticker);
  }

  scheduleBossDeathFx(callback, delayMs = 0) {
    const id = setTimeout(() => {
      if (this._deathTimeouts) {
        this._deathTimeouts = this._deathTimeouts.filter(timeoutId => timeoutId !== id);
      }
      if (this.game?.currentScene !== this) return;
      callback?.();
    }, delayMs);
    if (!this._deathTimeouts) this._deathTimeouts = [];
    this._deathTimeouts.push(id);
    return id;
  }

  createBossDeathFlash(color = 0xffff33) {
    if (!this.uiOverlay || !this.game?.app?.ticker) return;
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const flash = new PIXI.Graphics();
    flash.label = 'boss_death_flash';
    flash.rect(0, 0, width, height).fill({ color: 0xffffff, alpha: 0.24 });
    flash.rect(0, 0, width, height).fill({ color, alpha: 0.14 });
    flash.blendMode = 'add';
    this.uiOverlay.addChild(flash);

    let elapsed = 0;
    const duration = 520;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      const t = Math.min(1, elapsed / duration);
      flash.alpha = Math.pow(1 - t, 1.8);
      if (t >= 1 || this.game?.currentScene !== this) {
        this.game.app.ticker.remove(ticker);
        if (flash.parent) flash.parent.removeChild(flash);
        flash.destroy?.();
      }
    };
    this.game.app.ticker.add(ticker);
  }

  createBossDeathSigil(bossX, bossY, style = {}, palette = []) {
    if (!this.uiOverlay || !this.game?.app?.ticker) return;
    const sigil = new PIXI.Graphics();
    sigil.label = `boss_death_sigil:${style.id || 'default'}`;
    sigil.blendMode = 'add';
    this.uiOverlay.addChild(sigil);

    const baseColor = style.baseColor || palette[0] || 0xffff33;
    const accent = style.accent || palette[1] || 0xffffff;
    const radius = style.radius || Math.min(this.game.getWidth(), this.game.getHeight()) * 0.16;
    const tendrilCount = Math.max(7, Math.min(15, style.spokes || 10));
    const patternSeed = [...String(style.pattern || style.id || 'boss')]
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const draw = (t = 0) => {
      sigil.clear();
      const drift = t * (style.spin || 0.8) * 0.22;
      const reachScale = 0.5 + t * 0.86;
      for (let i = 0; i < tendrilCount; i += 1) {
        const variation = Math.sin(patternSeed * 0.17 + i * 13.71);
        const angle = i * 2.399963 + patternSeed * 0.013 + drift + variation * 0.28;
        const reach = radius * reachScale * (0.62 + ((i * 7 + patternSeed) % 11) * 0.055)
          * (style.longSpokes ? 1.16 : 1);
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        const tx = -ny;
        const ty = nx;
        const bend = reach * (0.1 + Math.abs(variation) * 0.19) * (i % 2 ? 1 : -1);
        const sx = bossX + nx * radius * 0.08;
        const sy = bossY + ny * radius * 0.08;
        const ex = bossX + nx * reach + tx * bend * 0.24;
        const ey = bossY + ny * reach + ty * bend * 0.24;
        sigil.moveTo(sx, sy);
        sigil.bezierCurveTo(
          bossX + nx * reach * 0.34 + tx * bend,
          bossY + ny * reach * 0.34 + ty * bend,
          bossX + nx * reach * 0.72 - tx * bend * 0.48,
          bossY + ny * reach * 0.72 - ty * bend * 0.48,
          ex,
          ey
        );
        sigil.stroke({
          color: i % 3 ? baseColor : accent,
          width: i % 3 ? 2.8 : 5.2,
          alpha: (i % 3 ? 0.38 : 0.15) * (1 - t)
        });
        if (i % 2 === 0) {
          const fragmentLength = radius * (0.06 + (i % 4) * 0.012);
          const fragmentWidth = Math.max(1.2, fragmentLength * 0.14);
          sigil.poly([
            ex + nx * fragmentLength, ey + ny * fragmentLength,
            ex - nx * fragmentLength * 0.5 + tx * fragmentWidth, ey - ny * fragmentLength * 0.5 + ty * fragmentWidth,
            ex - nx * fragmentLength * 0.24 - tx * fragmentWidth * 0.3, ey - ny * fragmentLength * 0.24 - ty * fragmentWidth * 0.3
          ]);
          sigil.fill({ color: i % 4 ? accent : 0xffffff, alpha: 0.3 * (1 - t) });
        }
      }
    };
    draw(0);

    let elapsed = 0;
    const duration = style.duration || 980;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      const t = Math.min(1, elapsed / duration);
      sigil.alpha = Math.pow(1 - t, 1.25);
      draw(t);
      if (t >= 1 || this.game?.currentScene !== this) {
        this.game.app.ticker.remove(ticker);
        if (sigil.parent) sigil.parent.removeChild(sigil);
        sigil.destroy?.();
      }
    };
    this.game.app.ticker.add(ticker);
  }

  triggerBossDeathImpact({ boss = null, color = 0xffff33, type = 'UNKNOWN' } = {}) {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const bossX = Math.max(44, Math.min(width - 44, Number.isFinite(boss?.x) ? boss.x : width * 0.5));
    const bossY = Math.max(72, Math.min(height * 0.58, Number.isFinite(boss?.y) ? boss.y : height * 0.26));
    const baseColor = Number.isFinite(color) ? color : 0xffff33;
    const seedText = String(type || boss?.profile?.id || 'boss');
    const seed = [...seedText].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const deathStyles = [
      { id: 'sonia_crownfall', pattern: 'crown', sfx: 'nova_boss_death_sonia', accent: 0xff55d9, spokes: 14, longSpokes: true, spin: -1.1 },
      { id: 'forge_meltdown', pattern: 'forge', sfx: 'nova_boss_death_forge', accent: 0xffd15c, spokes: 9, radius: Math.min(width, height) * 0.19 },
      { id: 'mirror_crack', pattern: 'mirror', sfx: 'nova_boss_death_mirror_crack', accent: 0x7fffd8, spokes: 12, spin: 1.4 },
      { id: 'needle_shatter', pattern: 'needle', sfx: 'nova_boss_death_needle', accent: 0x37f5ff, spokes: 18, longSpokes: true },
      { id: 'vortex_unwind', pattern: 'spiral', sfx: 'nova_boss_death_vortex', accent: 0xff55d9, spokes: 16, spin: 2.1 },
      { id: 'jester_finale', pattern: 'confetti', sfx: 'nova_boss_death_jester', accent: 0xffe76a, spokes: 11 },
      { id: 'carrier_collapse', pattern: 'satellite', sfx: 'nova_boss_death_carrier', accent: 0xffd15c, spokes: 8, radius: Math.min(width, height) * 0.2 },
      { id: 'monolith_crumble', pattern: 'columns', sfx: 'nova_boss_death_monolith', accent: 0xf6fbff, spokes: 10, longSpokes: true },
      { id: 'choir_silence', pattern: 'chord', sfx: 'nova_boss_death_choir', accent: 0xff67dc, spokes: 15 },
      { id: 'clock_ungear', pattern: 'clock', sfx: 'nova_boss_death_clock', accent: 0x37f5ff, spokes: 12, spin: -2.4 }
    ];
    const bossIndex = Math.max(0, Number(boss?.profile?.index || 1) - 1);
    const style = {
      ...deathStyles[bossIndex % deathStyles.length],
      baseColor
    };
    const palette = [baseColor, style.accent, 0xfff066, 0xff6633, 0xff3d7f, 0x61f6ff, 0x8cfffb, 0xffffff];
    const burstCount = 8 + (seed % 4) + (style.pattern === 'confetti' ? 2 : 0);
    const ringCount = 1;

    this.emitSpectacle('boss_death', {
      x: bossX,
      y: bossY,
      color: baseColor,
      accent: style.accent,
      intensity: 1.42,
      audioIntensity: 1.22,
      audioVolume: 0.94,
      pitchScale: 0.92 + (bossIndex % 5) * 0.025,
      force: true,
      seed
    });
    this.createBossDeathFlash(baseColor);
    this.createBossDeathSigil(bossX, bossY, style, palette);
    this.screenShake?.shake(22, 34);
    AudioManager.playSfx('boss_death_cascade', { force: true, volume: 0.84, minIntervalMs: 0 });
    AudioManager.playSfx(style.sfx || 'boss_death_cascade', { force: true, volume: 0.82, minIntervalMs: 0 });
    AudioManager.playSfx('boss_explode', { force: true, volume: 0.72, minIntervalMs: 0 });
    AudioManager.playSfx('boss_phase_surge', { force: true, volume: 0.42, minIntervalMs: 0 });
    if (AudioManager.isBossVoiceEnabled?.() !== false) {
      AudioManager.reserveVoiceLock?.('boss_death_agony', {
        durationMs: BOSS_DEATH_VOICE_LOCK_MS,
        voicePriority: 100,
        stopOtherVoices: true,
        force: true,
        reason: 'boss_death_impact'
      });
      this.scheduleBossDeathFx(() => {
        AudioManager.playDiegeticVoice('boss_death_agony', {
          force: true,
          bypassGlobalCooldown: true,
          bypassEventCooldown: true,
          exclusiveGroup: 'boss_death_agony',
          stopOtherVoices: true,
          exclusiveLockMs: BOSS_DEATH_VOICE_LOCK_MS,
          exclusiveLockReason: 'boss_death_agony',
          voicePriority: 100,
          cooldownMs: 0,
          eventCooldownMs: 0,
          volume: 2.6,
          duckFactor: 0.22,
          duckMs: 2300
        });
      }, 70);
    }

    if (!this.particleManager) return;
    if (!boss?.defeatPresentationAt) {
      this.particleManager.createBossExplosion(bossX, bossY, baseColor);
    } else {
      this.particleManager.createExplosion(bossX, bossY, baseColor, 1.45);
    }
    this.triggerShockwave(bossX, bossY, baseColor);

    for (let r = 0; r < ringCount; r += 1) {
      this.scheduleBossDeathFx(() => {
        const ringColor = palette[(seed + r * 2) % palette.length];
        this.triggerShockwave(bossX, bossY, ringColor);
      }, 120 + r * 150);
    }

    for (let i = 0; i < burstCount; i += 1) {
      const delay = 70 + i * 62 + (i % 2) * 34;
      const angle = ((Math.PI * 2 * i) / burstCount) + (seed % 11) * 0.13 + (style.pattern === 'spiral' ? i * 0.18 : 0);
      const mirrorSide = style.pattern === 'mirror' && i % 2 ? -1 : 1;
      const columnBias = style.pattern === 'columns' ? (i % 4 - 1.5) * width * 0.035 : 0;
      const spreadX = width * (0.06 + ((seed + i) % 5) * 0.018) * (style.pattern === 'needle' ? 1.22 : 1);
      const spreadY = height * (0.034 + ((seed + i * 3) % 5) * 0.013) * (style.pattern === 'forge' ? 1.28 : 1);
      const x = Math.max(42, Math.min(width - 42, bossX + Math.cos(angle) * spreadX * mirrorSide + columnBias));
      const y = Math.max(76, Math.min(height * 0.56, bossY + Math.sin(angle) * spreadY + (style.pattern === 'crown' ? -Math.abs(Math.sin(angle)) * 28 : 0)));
      const burstColor = palette[(seed + i) % palette.length];
      const intensity = 0.9 + (i % 3) * 0.2 + (style.pattern === 'forge' ? 0.14 : 0);

      this.scheduleBossDeathFx(() => {
        this.particleManager?.createExplosion(x, y, burstColor, intensity);
        if (i === Math.floor(burstCount / 2)) {
          this.triggerShockwave(x, y, burstColor);
        }
        if (i % 3 === 0) {
          this.screenShake?.shake(6, 14);
          AudioManager.playSfx('explosionCrunch', { volume: 0.62, minIntervalMs: 60 });
        }
      }, delay);
    }
  }

  onBossPhaseChange(phase, boss) {
    this.recordBalanceBossPhase(phase, boss);
    const label = phase === 2 ? 'BOSS PHASE 2' : 'BOSS PHASE 3';
    this.enqueueToast(label, { fontSize: 22, fill: '#ff3300', slot: 'top', type: 'boss' });
    this.triggerShockwave(boss.x, boss.y, phase === 2 ? 0xffaa00 : 0xff3300);
    AudioManager.playSfx('boss_phase_surge', { force: true, volume: 1.0 });
    this.emitSpectacle('boss_phase', {
      x: boss.x,
      y: boss.y,
      color: phase === 2 ? 0xffaa00 : 0xff3300,
      accent: phase === 2 ? 0x43efff : 0xff5df7,
      intensity: phase === 2 ? 1.12 : 1.3,
      audioIntensity: phase === 2 ? 1 : 1.15,
      audioVolume: 0.86,
      pitchScale: phase === 2 ? 1.04 : 0.92,
      force: true
    });
    this.showBossTaunt(phase === 2 ? 'boss_half' : 'boss_phase2');
  }

  showWantedPoster() {
    this.showBossTaunt('boss_spawn');
  }

  showBossCelebration({ level = this.game.level, type = 'UNKNOWN' } = {}) {
    this.resetBossLifeLossCap('boss_defeated');
    this.resetBossWipeoutGuard('boss_defeated');
    if (!this.uiOverlay) return;
    this.recordBalanceBossEnd();
    const bossId = this.enemyManager?.boss?.profile?.id || String(type || `boss_${level}`).toLowerCase();
    const bossName = this.enemyManager?.boss?.profile?.name || String(type || 'Boss').replace(/_/g, ' ');
    this.defeatedBossIds = [...new Set([...(this.defeatedBossIds || []), bossId])];
    this.reserveMessageFocus(2800, { priority: 4, slots: ['top', 'corner'] });
    this.emitRunContractEvent('boss_defeated', {
      sector: level,
      bossId,
      slowTimeActive: Boolean(this.player?.isSlowTimeActive?.()),
      powerupType: this.player?.activePowerup?.type || null
    });
    this.emitTacticalDirectiveEvent('boss_defeated', {
      sector: level,
      bossId
    });
    this.recordThreatDefeat(bossId, 'bosses', {
      name: bossName,
      role: this.enemyManager?.boss?.profile?.title || 'boss',
      sector: level
    });
    const repairDelta = this.applyBossClearRecovery(level);

    const compactHud = this.game.getWidth() < 620;
    const repairLine = repairDelta > 0 ? `\nHULL REPAIR +${repairDelta}` : '';
    this.showToast(`BOSS DEFEATED! +1000${repairLine}`, {
      fontSize: compactHud ? 20 : 28,
      fill: '#ffff00',
      stroke: '#330000',
      strokeThickness: compactHud ? 3 : 5,
      duration: 3600,
      slot: 'center',
      type: 'boss',
      priority: 4,
      y: this.game.getHeight() * (compactHud ? 0.34 : 0.32),
      maxWidth: this.game.getWidth() * (compactHud ? 0.84 : 0.72)
    });
    this.reserveMessageFocus(2800, { priority: 4, slots: ['top', 'corner'] });

    const boss = this.enemyManager?.boss;
    const bossColor = boss?.profile?.accent || boss?.color || 0xffff33;
    this.triggerBossDeathImpact({ boss, color: bossColor, type });

    AudioManager.playMusicContext('victory', { resetPlaylist: true });
    if (type === 'BONUS_CORE') AudioManager.playSfx('pickup', { force: true, volume: 0.9 });
    else if (type === 'ICON_192') AudioManager.playSfx('ui_open', { force: true, volume: 0.8 });
    else AudioManager.playSfx('boss_phase_surge', { force: true, volume: 0.38, minIntervalMs: 300 });
    console.log(`[BossCelebration] level=${level} type=${type} fired=true repairDelta=${repairDelta}`);
  }

  startShipIntro(spriteKey) {
    if (this.introComplete || !this.player) return;

    console.log('[Intro] start');

    this.introActive = true;
    this.introStartTime = Date.now();
    const introToken = ++this.shipIntroToken;

    const shipMeta = getShipMetadata(spriteKey);
    const shipName = (shipMeta ? shipMeta.name : 'UNKNOWN SHIP').toUpperCase();
    const introWidth = this.game.getWidth();
    const introHeight = this.game.getHeight();
    const introGameplayHeight = this.gameplayGame.getHeight();
    const isNarrowIntro = introWidth < 620;
    const returningPilot = isReturningPilot(this.game?.hangarProgressAtRunStart);
    const introTiming = getShipIntroTiming({ compact: isNarrowIntro, returningPilot });
    this.shipIntroReturningPilot = returningPilot;
    this.shipIntroTiming = introTiming;
    const maxTextWidth = Math.max(260, introWidth * 0.9);

    // Create intro overlay
    this.introOverlay = new PIXI.Container();
    this.introOverlay.label = 'ship_intro_overlay';
    this.introOverlay.zIndex = 999999;

    // Dark vignette for readability + Flash Layer
    const overlayBg = new PIXI.Graphics();
    overlayBg.rect(0, 0, introWidth, introHeight);
    overlayBg.fill({ color: 0x000000, alpha: 0.3 });
    this.introOverlay.addChild(overlayBg);

    // Ship name (Big, Readable)
    const nameText = createText(shipName, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isNarrowIntro ? 30 : 52, // 1080p readable, mobile-safe
      fill: '#00ff00',
      stroke: '#000000',
      strokeThickness: isNarrowIntro ? 4 : 6,
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: '#004400',
      dropShadowBlur: 10,
      dropShadowDistance: 4,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: maxTextWidth
    });
    nameText.anchor.set(0.5);
    const baseNameScale = Math.min(1, maxTextWidth / Math.max(1, nameText.width));
    nameText.scale.set(baseNameScale);
    nameText.position.set(introWidth / 2, introHeight / 2 - (isNarrowIntro ? 72 : 50)); // Start higher
    nameText.alpha = 0;
    this.introOverlay.addChild(nameText);

    // Subtitle
    const subText = createText("CLASSIFIED COMBAT VESSEL", {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: isNarrowIntro ? 13 : 20, // Readable subtitle
      fill: '#aaaaaa',
      align: 'center',
      letterSpacing: 0
    });
    subText.anchor.set(0.5);
    const baseSubScale = Math.min(1, maxTextWidth / Math.max(1, subText.width));
    subText.scale.set(baseSubScale);
    subText.position.set(introWidth / 2, introHeight / 2 + (isNarrowIntro ? -20 : 10));
    subText.alpha = 0;
    this.introOverlay.addChild(subText);

    this.uiOverlay.addChild(this.introOverlay);

    // Impact Flash (White overlay)
    const flash = new PIXI.Graphics();
    flash.label = 'ship_intro_flash';
    flash.rect(0, 0, introWidth, introHeight);
    flash.fill({ color: 0xffffff, alpha: 0.15 });
    flash.alpha = 0;
    this.uiOverlay.addChild(flash);

    // Setup Player Sprite State
    const startY = introGameplayHeight + 300;
    const endY = introGameplayHeight - (isNarrowIntro ? 170 : 150);
    this.player.sprite.y = startY;
    this.player.y = startY;
    this.player.sprite.scale.set(0.7);
    this.player.sprite.alpha = 0;

    // Ensure renderable
    this.player.sprite.visible = true;
    if (this.player.shipSprite) {
      this.player.shipSprite.visible = true;
      this.player.shipSprite.alpha = 1;
    }

    AudioManager.playSfx('ui_open', { volume: 0.8 });

    // Animation Config
    const {
      flightMs,
      totalMs,
      fadeInMs,
      holdUntilMs,
      impactStartMs,
      impactEndMs
    } = introTiming;
    const startTime = this.introStartTime;
    let midpointLogged = false;
    let gameplayEnabled = false;

    // Easing: easeOutBack
    const easeOutBack = (x) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };

    const animate = () => {
      if (introToken !== this.shipIntroToken || this.game?.currentScene !== this) {
        if (this.introOverlay?.parent) {
          this.introOverlay.parent.removeChild(this.introOverlay);
        }
        if (flash.parent) flash.parent.removeChild(flash);
        return;
      }
      const now = Date.now();
      const elapsed = now - startTime;

      // --- Fly In Animation ---
      const progress = Math.min(elapsed / flightMs, 1);

      if (progress >= 0.5 && !midpointLogged) {
        console.log('[Intro] midpoint');
        midpointLogged = true;
      }

      // 1. Fly-in Motion (Y)
      const eased = easeOutBack(progress);
      const curY = startY + (endY - startY) * eased;
      this.player.sprite.y = curY;
      this.player.y = curY;

      // 2. Scale (0.7 -> 1.05 -> 1.0)
      let curScale = 1.0;
      if (progress < 0.8) {
        const p = progress / 0.8;
        curScale = 0.7 + (p * 0.35); // Ends at 1.05
      } else {
        const p = (progress - 0.8) / 0.2;
        curScale = 1.05 - (p * 0.05);
      }
      this.player.sprite.scale.set(curScale);

      // 3. Alpha (0 -> 1 in first 40%)
      if (progress < 0.4) {
        this.player.sprite.alpha = progress / 0.4;
      } else {
        this.player.sprite.alpha = 1;
      }

      // 5. Impact near the end of the fly-in.
      const gameOrigin = this.getGameplayContainerOrigin();
      if (elapsed > impactStartMs && elapsed < impactEndMs) {
        flash.alpha = 0.1;
        this.gameContainer.x = gameOrigin.x + (Math.random() - 0.5) * 6;
        this.gameContainer.y = gameOrigin.y + (Math.random() - 0.5) * 6;
      } else {
        flash.alpha = Math.max(0, flash.alpha - 0.02);
        this.gameContainer.x = gameOrigin.x;
        this.gameContainer.y = gameOrigin.y;
      }

      // --- Text Animation ---
      // Text Animation (fade in -> hold -> fade out).
      let tAlpha = 0;
      if (elapsed < fadeInMs) {
        tAlpha = elapsed / fadeInMs;
        nameText.y = (introHeight / 2 - (isNarrowIntro ? 72 : 50)) + (tAlpha * 10);
      } else if (elapsed < holdUntilMs) {
        tAlpha = 1;
        nameText.y = (introHeight / 2 - (isNarrowIntro ? 62 : 40));
      } else {
        tAlpha = Math.max(0, 1 - ((elapsed - holdUntilMs) / Math.max(1, totalMs - holdUntilMs)));
        nameText.y = (introHeight / 2 - (isNarrowIntro ? 62 : 40));
      }
      nameText.alpha = tAlpha;
      subText.alpha = tAlpha;

      const pulse = 1.0 + Math.sin(now * 0.005) * 0.025;
      nameText.scale.set(baseNameScale * pulse);
      subText.scale.set(baseSubScale);

      // --- Logic Gating ---
      if (elapsed >= totalMs && !gameplayEnabled) {
        gameplayEnabled = true;
        this.completeShipIntro();
      }

      if (elapsed < totalMs) {
        requestAnimationFrame(animate);
      } else {
        // Cleanup
        if (this.introOverlay && this.introOverlay.parent) {
          this.introOverlay.parent.removeChild(this.introOverlay);
          this.introOverlay.destroy({ children: true });
          this.introOverlay = null;
        }
        if (flash.parent) flash.parent.removeChild(flash);
        console.log('[Intro] complete (text finished)');
      }
    };

    animate();
  }

  getShipIntroDebugState() {
    const startedAt = Math.max(0, Number(this.introStartTime) || 0);
    return {
      active: Boolean(this.introActive),
      complete: Boolean(this.introComplete),
      returningPilot: Boolean(this.shipIntroReturningPilot),
      elapsedMs: startedAt ? Math.max(0, Date.now() - startedAt) : 0,
      timing: this.shipIntroTiming ? { ...this.shipIntroTiming } : null
    };
  }

  completeShipIntro() {
    this.introActive = false;
    this.introComplete = true;
    if (this.game?.currentScene && this.game.currentScene !== this) {
      return;
    }

    // Start enemy waves - use startLevel, not startWave
    if (this.enemyManager && this.game.level) {
      if (!this.shipCatalogLoaded) {
        this.shipIntroAssetGatePending = true;
        this.shipCatalogReady?.finally?.(() => {
          if (this.game?.currentScene !== this || !this.introComplete || !this.shipIntroAssetGatePending) return;
          this.shipIntroAssetGatePending = false;
          this.startLevelWhenWarm('introCompleteAssetsReady');
        });
        console.log('[PlayScene] Ship intro complete, waiting for enemy art catalog');
        return;
      }
      this.startLevelWhenWarm('introComplete');
    }

    console.log('[PlayScene] Ship intro complete, gameplay enabled');
  }
}
