import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { RankAssets } from '../utils/RankAssets.js';
import { Player, RESPAWN_INVULNERABILITY_MS } from '../entities/Player.js';
import { BonusDrone } from '../entities/BonusDrone.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { BalanceConfig, MAX_PLAYER_LIVES } from '../config/BalanceConfig.js';
import { COMBO_MILESTONES, COMBO_WINDOW_MS } from '../config/ComboConfig.js';
import { EnemyManager } from '../managers/EnemyManager.js';
import { BulletManager } from '../managers/BulletManager.js';
import { PowerupManager } from '../managers/PowerupManager.js';
import { rankManager } from '../managers/RankManager.js';
import { ParticleManager } from '../effects/ParticleManager.js';
import { ScreenShake } from '../effects/ScreenShake.js';
import { ScorePopupManager } from '../ui/ScorePopup.js';
import { InputManager } from '../input/InputManager.js';
import { TouchControls } from '../input/TouchControls.js';
import { NullTouchControls } from '../input/NullTouchControls.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';
import { SettingsOverlay } from '../ui/SettingsOverlay.js';
import { HowToPlayOverlay } from '../ui/HowToPlayOverlay.js';
import { getCurrentLayout } from '../ui/responsiveLayout.js';
import {
  MenuFxLayer,
  playMenuBackSfx,
  playMenuConfirmSfx,
  playMenuFocusSfx,
  playMenuOpenSfx
} from '../ui/MenuFxLayer.js';
import { BUILD_ID } from '../buildInfo.js';
import { getDefaultShipKey } from '../config/ShipMetadata.js';
import { createText } from '../utils/pixiText.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import {
  getAchievementPopup,
  getEnemyTaunt,
  getMicroMessage,
  getAllNewPhrases,
  getCabinetLogEntry,
  getStoryTransmission
} from '../text/phrasePool.js';
import { getShipMetadata } from '../config/ShipMetadata.js';
import { formatSectorLabel } from '../config/SectorCatalog.js';
import { translateText } from '../i18n/index.js';
import { isMaintainerDevtoolsEnabled } from '../config/MaintainerDevtools.js';
import { getNovaPerformanceFlags } from '../config/PerformanceFlags.js';
import { RunPacingConfig } from '../config/RunPacingConfig.js';
import {
  getOverrunMilestoneCelebration,
  isOverrunMilestoneSector,
  resolveOverrunMilestoneVoiceCue
} from '../config/OverrunMilestoneCelebrations.js';
import { getSectorCodexArt, getThreatCodexCatalog } from '../config/ThreatCodexCatalog.js';
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
  getRunContractSessionState,
  prepareRunContractsForEligibleRun,
  recordRunContractCompletion,
  recordRunContractSessionProgress,
  startRunContractSession
} from '../progression/RunContracts.js';
import { getBossProfile } from '../config/BossRoster.js';
import { RUN_MODES, getRunModeNormalWaveScoreXpMultiplier } from '../game/RunMode.js';
import { createMayhemPerformanceDiagnostics } from '../debug/MayhemPerformanceDiagnostics.js';

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
const BOSS_DEATH_VOICE_LOCK_MS = 9400;
const SECTOR_ARRIVAL_STINGER_MS = 2400;
const COLLISION_GRID_CELL_SIZE = 96;
const COLLISION_POWERUP_SPAWN_ATTEMPT_BUDGET = 6;
const DEFERRED_GAMEPLAY_PERSISTENCE_IDLE_MS = 1200;

export class PlayScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.gameContainer = new PIXI.Container();
    this.decorativeOverlay = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    this.uiOverlay = new PIXI.Container();
    this.container.addChild(this.gameContainer);
    this.container.addChild(this.decorativeOverlay);
    this.container.addChild(this.uiContainer);
    this.container.addChild(this.uiOverlay);

    this.inputManager = new InputManager();
    this.touchControls = new NullTouchControls();
    this.player = null;
    this.companionShip = null; // Double ship powerup from hijacker rescue
    this.enemyManager = null;
    this.bulletManager = null;
    this.powerupManager = null;
    this.particleManager = null;
    this.screenShake = null;
    this.hud = null;
    this.isPaused = false;
    this.pauseOverlay = null;
    this.pauseMenuFx = null;
    this.pauseMenuDecor = null;
    this.pauseButtons = [];
    this.pauseFocusedIndex = 0;
    this.pauseGamepadNavigator = new GamepadNavigator();
    this.settingsOverlay = null;
    this.howToPlayOverlay = null;
    this.hadGameplayGamepadConnection = false;
    this.lastGameplayGamepadConnected = false;
    this.controlSmokeMode = false;
    this.autoPauseHandlersInstalled = false;
    this.visibilityPauseHandler = null;
    this.blurPauseHandler = null;
    this.nativeBlurPauseHandler = null;
    this.levelAdvancePending = false;
    this.levelAdvanceTimeout = null;
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
      playerExplosions: []
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
    this.gameplayBackdrop = null;
    this.gameplayStormBackdrop = null;
    this.gameplayBossBackdrop = null;
    this.gameplayBackdropShade = null;
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

    // TASK 4: Shooting sound health check
    this.shootSoundHealthCheck = {
      shotsFired: 0,
      lastShotTime: 0,
      lastSoundTime: 0,
      lastSoundKey: 'shoot_small',
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
    this.overrunSealTexture = null;
    this.bossWarningEmblemTextures = [];
    this.bossWarningBossTextures = [];
    this.bossWarningArtTextures = [];
    this.bossHazards = [];
    this.bossHazardLayer = null;
    this.lastBossHazardHit = null;
    this.sectorArrivalStinger = null;
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
    this.lastComboCelebration = null;
    this.lastPowerupPickupJuice = null;
    this.lastTraitImpactToastAt = 0;
    this.runContractSession = null;
    this.runContractProgressThisRun = new Map();
    this.runContractProgressToastMarkers = new Map();
    this.runContractStartNudgeTimeout = null;
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

    // TASK: Fix duplicate wave start
    this._lastStartedLevel = -1;
    this._deathTimeouts = [];
    this._activeTickers = [];
    this.balanceDebug = null;
    this.bossClearRecoveryLevels = new Set();
    this.performanceDiagnostics = null;
  }

  init() {
    this.isReady = false;
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
      playerExplosions: []
    };
    this.deferredLiveRankRefreshRequested = false;
    this.deferredScoreCueRefreshRequested = false;
    if (!this.inputManager || this.inputManager.destroyed) {
      this.inputManager = new InputManager();
    }
    this.inputManager.resetAllKeys();
    this.isPaused = false;
    this.bossClearRecoveryLevels.clear();
    this.pauseOverlay = null;
    this.pauseMenuDecor = null;
    this.settingsOverlay = null;
    this.howToPlayOverlay = null;
    this.pausePressed = false;
    this.hadGameplayGamepadConnection = false;
    this.lastGameplayGamepadConnected = false;
    this.setupAutoPauseHandlers();
    this.gameContainer.removeChildren();
    this.decorativeOverlay.removeChildren();
    this.uiContainer.removeChildren();
    this.uiOverlay.removeChildren();
    this.decorativeOverlay.sortableChildren = true;
    this.decorativeOverlay.eventMode = 'none';
    this.uiContainer.sortableChildren = true;
    this.uiOverlay.sortableChildren = true;
    this.criticalHullOverlay = null;
    this.overrunClearEffects = [];
    this.overrunCelebratedMilestones = new Set();
    this.clearSectorArrivalStinger();
    this.gameOverSequenceStarted = false;
    this.finalDeathFeedbackShown = false;
    this.gameOverAnimationLayer = null;
    this.overrunClearLayer = new PIXI.Container();
    this.overrunClearLayer.zIndex = 9600;
    this.overrunClearLayer.sortableChildren = true;
    this.uiOverlay.addChild(this.overrunClearLayer);
    this.overrunMilestoneInterlude = null;

    // TASK D: Create procedural starfield background
    this.createStarfield();
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
    this.shownCabinetLogIds.clear();
    this.lastCabinetLog = null;
    this.totalKills = 0;
    this.bossKills = 0;
    this.wavesCleared = 0;
    this.noHitWavesThisRun = 0;
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
    this.lastGrazeBreak = null;
    this.lastComboCelebration = null;
    this.lastPowerupPickupJuice = null;
    this.clearRunContractStartNudge();
    this.runContractProgressThisRun = new Map();
    this.runContractProgressToastMarkers = new Map();
    let runContractProgress = this.game?.hangarProgressAtRunStart || readHangarProgressState();
    if ((this.game?.runMode || RUN_MODES.RANKED) === RUN_MODES.RANKED) {
      const preparedRunContracts = prepareRunContractsForEligibleRun(runContractProgress.runContracts);
      runContractProgress = writeHangarProgressState({
        ...runContractProgress,
        runContracts: preparedRunContracts
      });
      if (this.game) this.game.hangarProgressAtRunStart = runContractProgress;
    }
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
    this.scheduleRunContractStartNudge();
    this.blinkDriveOrderStartedAt = null;
    this.blinkDriveOrderCompleted = false;
    this.playerPhaseWasActive = false;
    this.levelAdvancePending = false;
    this.postBossLevelIntroPending = false;
    this.levelAdvanceTimeout = null;
    this.clearPendingEnemyStart();
    this.capState = { bullets: false, enemies: false, particles: false };
    this.firstRunKillCount = 0;
    this.firstRunPickupDropped = false;
    this.bossClutchShieldLevel = null;
    this._lastStartedLevel = -1;
    this.introActive = false;
    this.introComplete = false;
    this.shipIntroToken += 1;
    if (this.introOverlay?.parent) {
      this.introOverlay.parent.removeChild(this.introOverlay);
    }
    this.introOverlay = null;

    const { width, height } = this.game.app.screen;

    // Initialize managers
    const capHandler = this.logCap.bind(this);
    this.bulletManager = new BulletManager(this.gameContainer, capHandler);
    this.bulletManager.setScreenBounds(width, height);
    this.particleManager = new ParticleManager(this.gameContainer, capHandler);
    this.particleManager.prewarm?.(384);
    this.powerupManager = new PowerupManager(this.gameContainer, this.game);
    this.screenShake = new ScreenShake(this.gameContainer);
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
    this.bossHazardLayer = new PIXI.Graphics();
    this.bossHazardLayer.zIndex = 66;
    this.gameContainer.addChild(this.bossHazardLayer);

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
    this.player = new Player(width / 2, height - 100, this.inputManager, this.game, spriteKey);
    this.gameContainer.addChild(this.player.sprite);
    if (this.player.setRank) {
      this.player.setRank(initialRank, 'init_placeholder');
    }
    this.applySeasonCosmetics();

    // Create enemy manager
    this.enemyManager = new EnemyManager(this.gameContainer, this.game, capHandler);
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
    const expectedStartLevel = Number.isFinite(this.debugStartLevel) ? this.debugStartLevel : (this.game?.level || 1);
    this.preloadSectorArrivalArt(expectedStartLevel, { ahead: 2 }).catch((error) => {
      console.warn('[PlayScene] Sector arrival art prewarm failed:', error);
    });

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
    }

    // Start first level - DEFERRED until intro complete
    // this.startLevel();
    this.initLoreBag();

    console.log(`PlayScene build:${BUILD_ID}`);
    this.isReady = true;
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
    const removeBullets = (bullets = []) => {
      bullets.forEach((bullet) => {
        bullet.active = false;
        if (bullet.sprite?.parent) bullet.sprite.parent.removeChild(bullet.sprite);
      });
    };
    removeBullets(this.bulletManager?.playerBullets || []);
    removeBullets(this.bulletManager?.enemyBullets || []);
    if (this.bulletManager) {
      this.bulletManager.playerBullets = [];
      this.bulletManager.enemyBullets = [];
    }
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
    this.bossHazards = [];
    this.lastBossHazardHit = null;
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
    const x = Math.max(90, Math.min(this.game.getWidth() - 90, this.player.x + (Math.random() < 0.5 ? -150 : 150)));
    const y = Math.max(88, this.game.getHeight() * 0.24);
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
    const { suppressProgressToast = false, ...eventPayload } = payload || {};
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
      this.persistRunContractSessionProgress();
    }
    for (const completion of result.completed || []) {
      this.persistRunContractCompletion(completion);
      this.showRunContractCompletion(completion.id);
    }
    return result.completed || [];
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
    const orderSlot = change.orderSlot || formatRunContractOrderSlotLabel(change.id);
    const orderTitle = orderSlot ? `${orderSlot} ${title}` : title;
    const progressLabel = this.getRunContractTrackProgressLabel();
    const progressMessage = translateText('ORDER PROGRESS: {title} {progress}/{target}', {
      title: orderTitle,
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
      duration: progressLabel ? 3000 : 2600,
      banner: true,
      title: translateText('PILOT ORDERS'),
      align: 'left',
      y: Math.min(this.game.getHeight() - 132, Math.max(compactHud ? 154 : 202, this.game.getHeight() * 0.28)),
      maxWidth: compactHud ? this.game.getWidth() * 0.72 : Math.min(480, this.game.getWidth() * 0.38),
      accent: contract?.accent || 0x7fffd8
    });
  }

  clearRunContractStartNudge() {
    if (!this.runContractStartNudgeTimeout) return;
    clearTimeout(this.runContractStartNudgeTimeout);
    this.runContractStartNudgeTimeout = null;
  }

  getRunContractStartNudgeSummary() {
    const active = (this.getRunContractDebugState()?.active || [])
      .find((item) => item.eligible && !item.completed);
    if (!active) return null;
    const title = translateText(active.shortTitle || active.title || active.id);
    const orderSlot = active.orderSlot || formatRunContractOrderSlotLabel(active.id);
    const progress = translateText('{progress}/{target}', formatRunContractProgressValue(active.progress, active.target));
    return {
      title: orderSlot ? `${orderSlot} ${title}` : title,
      progress,
      trackProgress: this.getRunContractTrackProgressLabel()
    };
  }

  scheduleRunContractStartNudge() {
    this.clearRunContractStartNudge();
    if (!this.getRunContractStartNudgeSummary()) return;
    this.runContractStartNudgeTimeout = setTimeout(() => {
      this.runContractStartNudgeTimeout = null;
      if (this.gameOverSequenceStarted) return;
      const summary = this.getRunContractStartNudgeSummary();
      if (!summary) return;
      const compactHud = this.game.getWidth() < 620;
      const prefix = summary.trackProgress
        ? `${translateText('PILOT ORDERS')} ${summary.trackProgress}`
        : translateText('PILOT ORDERS');
      this.enqueueToast(`${prefix} // ${summary.title} ${summary.progress}`, {
        fontSize: compactHud ? 16 : 20,
        fill: '#dffcff',
        stroke: '#031321',
        strokeThickness: compactHud ? 3 : 4,
        slot: 'top',
        type: 'runContractStart',
        priority: 1,
        bypassFocusLock: false,
        duration: 3000,
        banner: true,
        align: 'center',
        y: Math.max(compactHud ? 118 : 132, this.game.getHeight() * 0.15),
        maxWidth: compactHud ? this.game.getWidth() * 0.78 : Math.min(520, this.game.getWidth() * 0.46),
        accent: 0x7fffd8
      });
    }, 3500);
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
    const previous = readHangarProgressState();
    const runContracts = recordRunContractSessionProgress(previous.runContracts, this.runContractSession);
    writeHangarProgressState({
      ...previous,
      runContracts
    });
  }

  showRunContractCompletion(contractId) {
    const contract = getRunContractById(contractId);
    if (!contract) return;
    const title = translateText(contract.shortTitle || contract.title);
    const orderSlot = formatRunContractOrderSlotLabel(contractId);
    const orderTitle = orderSlot ? `${orderSlot} ${title}` : title;
    const progressLabel = this.getRunContractTrackProgressLabel();
    const nextSummary = this.getNextRunContractSummary();
    const message = [
      translateText('ORDER COMPLETE: {title}', { title: orderTitle }),
      progressLabel ? `${translateText('PILOT ORDERS')} ${progressLabel}` : null,
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
      duration: nextSummary ? 4400 : 3600,
      banner: true,
      title: translateText('PILOT ORDERS'),
      align: 'center',
      y: Math.min(height - 132, Math.max(compactHud ? 132 : 158, height * 0.22)),
      maxWidth: compactHud ? width * 0.86 : Math.min(500, width * 0.42),
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
    return menuState.progressLabel || null;
  }

  getNextRunContractSummary(state = null) {
    const source = state || this.getRunContractDebugState();
    const item = (source?.next || []).find((entry) => entry?.id && !entry.completed);
    if (!item) return null;
    const orderSlot = item.orderSlot || formatRunContractOrderSlotLabel(item.id);
    const title = translateText(item.shortTitle || item.title || item.id);
    return {
      title: orderSlot ? `${orderSlot} ${title}` : title,
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
    this.emitRunContractEvent('sector_reached', { sector: this.game.level });

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
    const showArrivalStinger = this.shouldShowSectorArrivalStinger(this.game.level);
    const enemyStartDelayMs = showArrivalStinger
      ? this.getSectorArrivalStingerDuration({ postBoss: postBossLevelIntro }) + 120
      : 0;
    measurePerformance('incoming_wave_banner.sector_arrival', () => this.showSectorArrivalStinger({ postBoss: postBossLevelIntro }));
    measurePerformance('incoming_wave_banner.level_intro', () => this.showLevelIntro({ postBoss: postBossLevelIntro }));
    this.scheduleEnemyStartForLevel(this.game.level, {
      startAtBoss,
      delayMs: enemyStartDelayMs,
      source
    });
    this.scheduleBackgroundLevelEntryWarmup(Math.max(1, Math.floor(Number(this.game.level) || 1) + 1), {
      ahead: 2,
      delayMs: showArrivalStinger ? 1200 : 900
    });
    const compactHud = this.game.getWidth() < 620;
    if (!compactHud && !postBossLevelIntro) {
      this.showToast(getMicroMessage('levelStart'), { fontSize: 18, y: this.game.getHeight() * 0.12, slot: 'corner', type: 'level_up' });
      this.showToast(getMicroMessage('newWave'), { fontSize: 18, y: this.game.getHeight() * 0.16, slot: 'corner', type: 'level_up' });
    }

    if (this.game.level % 5 === 0) {
      this.showToast(getMicroMessage('bossIntro'), { fontSize: 22, y: this.game.getHeight() * 0.25, slot: 'center', type: 'level_up' });
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
    return postBoss ? SECTOR_ARRIVAL_STINGER_MS + 560 : SECTOR_ARRIVAL_STINGER_MS;
  }

  scheduleEnemyStartForLevel(level, { startAtBoss = false, delayMs = 0, source = 'unknown' } = {}) {
    const targetLevel = Math.max(1, Math.floor(Number(level) || 1));
    const startEnemies = () => {
      this.pendingEnemyStartTimeout = null;
      if (this.game?.currentScene !== this || !this.enemyManager) return;
      if (this._lastStartedLevel !== targetLevel || this.game?.level !== targetLevel) return;
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
    this.reserveMessageFocus(postBoss ? 1550 : 800, {
      priority: 2,
      slots: ['center', 'top', 'corner']
    });
    this.showToast(localizedMessage, {
      fontSize,
      fill: '#ffff00',
      stroke: '#ff8800',
      strokeThickness: compactHud ? 2 : 3,
      duration: postBoss ? 1450 : 2000,
      type: 'level_up',
      priority: 2,
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
      const id = `sector_${String(safeLevel).padStart(3, '0')}`;
      return getThreatCodexCatalog()?.sectors?.find((entry) => entry?.id === id) || null;
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

    const eliteCount = AssetManifest.generated?.eliteMiddleShips?.length || 0;
    for (let index = 0; index < eliteCount; index += 1) {
      addTexture(GameAssets.getEliteMiddleShipTexture(index), `elite_middle:${index}`);
    }

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
          this.preloadSectorArrivalArt(safeLevel, { ahead: aheadCount }),
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
    if (!this.uiContainer || !this.game?.app?.ticker || this.game?.currentScene !== this) return;

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
    const accentHex = `#${accent.toString(16).padStart(6, '0').slice(-6)}`;
    const sectorLabel = formatSectorLabel(level, {
      sectorWord: translateText('SECTOR'),
      compact: true
    }).toUpperCase();
    const pressure = translateText(entry.pressureStyle || entry.role || 'SECTOR').toUpperCase();
    const hint = translateText(entry.tip || 'Read the line, then make one calmer decision.');

    this.clearSectorArrivalStinger();

    const root = new PIXI.Container();
    root.label = 'sector_arrival_stinger';
    root.eventMode = 'none';
    root.interactive = false;
    root.zIndex = -20;
    root.alpha = 0;
    root.sortableChildren = true;
    this.uiContainer.addChild(root);
    this.uiContainer.sortChildren?.();

    const backdrop = new PIXI.Sprite(PIXI.Texture.EMPTY);
    backdrop.anchor.set(0.5);
    backdrop.position.set(width / 2, height / 2);
    backdrop.alpha = 0.84;
    root.addChild(backdrop);
    const backdropBaseScale = { value: 1 };

    if (getNovaPerformanceFlags().disableSectorArt) {
      backdrop.visible = false;
      backdrop.renderable = false;
    } else {
      this.preloadSectorArrivalArt(level, { ahead: 0 })
        .then((texture) => {
          if (!root.parent || backdrop.destroyed || !GameAssets.isValidTexture(texture)) return;
          backdrop.texture = texture;
          const scale = Math.max(width / texture.width, height / texture.height);
          backdropBaseScale.value = scale;
          backdrop.scale.set(scale);
        })
        .catch((error) => {
          console.warn('[SectorArrival] sector art failed to load:', error);
        });
    }

    const shade = new PIXI.Graphics();
    shade.rect(0, 0, width, height);
    shade.fill({ color: 0x020712, alpha: 0.36 });
    root.addChild(shade);

    const vignette = new PIXI.Graphics();
    vignette.rect(0, 0, width, height);
    vignette.stroke({ color: accent, width: compact ? 3 : 5, alpha: 0.52 });
    vignette.rect(0, 0, width, Math.max(4, height * 0.008));
    vignette.fill({ color: accent, alpha: 0.34 });
    vignette.rect(0, height - Math.max(4, height * 0.008), width, Math.max(4, height * 0.008));
    vignette.fill({ color: accent, alpha: 0.22 });
    root.addChild(vignette);

    const lockLayer = new PIXI.Container();
    lockLayer.position.set(width / 2, height / 2);
    lockLayer.blendMode = 'add';
    root.addChild(lockLayer);

    const radius = Math.min(width, height) * (compact ? 0.28 : 0.34);
    const rings = new PIXI.Graphics();
    rings.circle(0, 0, radius);
    rings.stroke({ color: accent, width: compact ? 2 : 3, alpha: 0.42 });
    rings.circle(0, 0, radius * 0.64);
    rings.stroke({ color: 0x7dffcc, width: 1.5, alpha: 0.36 });
    rings.circle(0, 0, radius * 0.28);
    rings.stroke({ color: accent, width: 1, alpha: 0.3 });
    lockLayer.addChild(rings);

    const sweep = new PIXI.Graphics();
    sweep.moveTo(0, 0);
    sweep.lineTo(radius * 1.08, 0);
    sweep.stroke({ color: 0x7dffcc, width: compact ? 4 : 6, alpha: 0.86 });
    lockLayer.addChild(sweep);

    const scan = new PIXI.Graphics();
    root.addChild(scan);

    const textY = compact ? height * 0.24 : height * 0.18;
    const kicker = createText(translateText('NEON RADAR LOCK'), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 13 : 18,
      fontWeight: '900',
      fill: '#7dffcc',
      letterSpacing: 0
    });
    kicker.anchor?.set?.(0.5, 0);
    kicker.position.set(width / 2, textY);
    root.addChild(kicker);

    const title = createText(sectorLabel, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 32 : 58,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#001018',
      strokeThickness: compact ? 3 : 5,
      letterSpacing: 0,
      wordWrap: true,
      wordWrapWidth: Math.min(width * 0.9, compact ? 560 : 980),
      align: 'center'
    });
    title.anchor?.set?.(0.5, 0);
    title.position.set(width / 2, textY + (compact ? 22 : 32));
    root.addChild(title);

    const meta = createText(pressure, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 12 : 16,
      fontWeight: '900',
      fill: accentHex,
      letterSpacing: 0,
      wordWrap: true,
      wordWrapWidth: Math.min(width * 0.82, compact ? 500 : 820),
      align: 'center'
    });
    meta.anchor?.set?.(0.5, 0);
    meta.position.set(width / 2, title.y + title.height + (compact ? 6 : 8));
    root.addChild(meta);

    const hintText = createText(translateText('THREAT DOSSIER: {hint}', { hint }), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 13 : 17,
      fontWeight: '700',
      fill: '#d7fbff',
      letterSpacing: 0,
      wordWrap: true,
      wordWrapWidth: Math.min(width * 0.78, compact ? 520 : 860),
      align: 'center',
      lineHeight: compact ? 15 : 20
    });
    hintText.anchor?.set?.(0.5, 0);
    hintText.position.set(width / 2, height * (compact ? 0.66 : 0.70));
    root.addChild(hintText);

    this.reserveMessageFocus(durationMs + 120, {
      priority: 2,
      slots: ['center', 'top']
    });

    const startedAt = performance.now();
    const ticker = () => {
      if (!root.parent || this.game?.currentScene !== this) {
        this.clearSectorArrivalStinger();
        return;
      }
      const elapsed = performance.now() - startedAt;
      const progress = Math.min(1, elapsed / durationMs);
      const fadeIn = Math.min(1, elapsed / 150);
      const fadeOut = Math.max(0, (durationMs - elapsed) / 390);
      const alpha = Math.min(fadeIn, fadeOut);
      root.alpha = alpha;
      backdrop.scale.set(backdropBaseScale.value * (1 + progress * 0.035));
      lockLayer.rotation = progress * Math.PI * 2.15;
      rings.alpha = 0.42 + Math.sin(elapsed * 0.018) * 0.18;
      sweep.alpha = 0.48 + Math.sin(elapsed * 0.026) * 0.28;
      scan.clear();
      const scanX = width * (progress * 1.18 - 0.09);
      scan.rect(Math.max(0, scanX - width * 0.018), 0, width * 0.036, height);
      scan.fill({ color: 0x7dffcc, alpha: 0.18 * alpha });
      if (elapsed >= durationMs) {
        this.clearSectorArrivalStinger();
      }
    };

    this.sectorArrivalStinger = { container: root, ticker };
    this.game.app.ticker.add(ticker);
  }

  update(delta) {
    if (!Number.isFinite(delta) || delta > 100 || delta < 0) return;
    if (!this.isReady) return;
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
        measure('gameover_interlude', () => this.updateGameOverInterlude(delta));
        return;
      }

      if (this.overrunMilestoneInterlude?.active) {
        this.cleanupSkippedFrameVisuals('overrun_interlude');
        this.updateCriticalHullOverlay(delta);
        measure('overrun_interlude', () => this.updateOverrunMilestoneInterlude(delta));
        return;
      }

      this.gameTime += delta / 60;

      // Score Boost Timer
      if (this.scoreBoostTimer > 0) {
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
        this.updateDevOverlay();
        return;
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
          bullets.forEach(bullet => this.bulletManager.addPlayerBullet(bullet));

          // TASK 4: Shooting sound with health check
          this.playShootSoundWithHealthCheck();
        });
      }

      // Managers update
      const slowTimeActive = this.player?.isSlowTimeActive?.() === true;
      const enemyBulletScale = slowTimeActive ? (this.player?.getSlowTimeEnemyBulletScale?.() ?? 0.35) : 1;
      const hazardTimeScale = slowTimeActive ? (this.player?.getSlowTimeHazardScale?.() ?? 0.35) : 1;
      measure('bullets', () => {
        if (this.bulletManager) this.bulletManager.update(delta, enemyBulletScale);
      });
      measure('enemies', () => {
        if (this.enemyManager) this.enemyManager.update(delta);
      });
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
        this.playLevelClearVoice({ bossCompletion });

        // Particles
        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            if (this.particleManager) {
              this.particleManager.createExplosion(
                this.game.getWidth() * 0.2 + Math.random() * this.game.getWidth() * 0.6,
                this.game.getHeight() * 0.2 + Math.random() * this.game.getHeight() * 0.6,
                0xffff00
              );
            }
          }, i * 100);
        }

        const nextSectorLevel = Math.max(1, Math.floor(Number(this.game.level) || 1) + 1);
        this.levelAdvanceWarmupPromise = this.prewarmLevelEntryAssets(nextSectorLevel, { ahead: 2 })
          .catch((error) => {
            console.warn(`[PlayScene] next sector warmup failed for level ${nextSectorLevel}:`, error);
            return true;
          });

        this.levelAdvanceTimeout = setTimeout(() => {
          const advanceWhenWarm = this.levelAdvanceWarmupPromise || Promise.resolve(true);
          advanceWhenWarm.finally(() => {
            if (this.game?.currentScene !== this) return;
            this.levelAdvancePending = false;
            this.levelAdvanceTimeout = null;
            this.levelAdvanceWarmupPromise = null;
            this.postBossLevelIntroPending = bossCompletion;
            const sectorCleared = Number(this.game.level) || 1;
            this.maybeTriggerOverrunCelebration({ sectorCleared, bossCompletion, compactHud });
            if (bossCompletion) {
              this.damageTakenThisSector = 0;
            }
            this.game.nextLevel();
            if (this.player) {
              const sprite = this.player.sprite;
              if (sprite) {
                sprite.visible = true;
                sprite.alpha = 1;
                sprite.renderable = true;
                if (!sprite.parent && this.gameContainer) {
                  this.gameContainer.addChild(sprite);
                }
              }
              const shipSprite = this.player.shipSprite;
              const texValid = shipSprite && shipSprite instanceof PIXI.Sprite && GameAssets.isValidTexture(shipSprite.texture);
              if (!texValid && this.player.rebuildShipSprite) {
                this.player.rebuildShipSprite('afterNextLevel');
              } else if (shipSprite?.scale) {
                const baseScale = Number.isFinite(this.player.baseScale) ? this.player.baseScale : (shipSprite.scale.x || 1);
                shipSprite.scale.set(baseScale);
              }
            }
          });
        }, BalanceConfig.level.sequenceDuration || 3000);
      }
      });

      if (!perfOptions?.hudLite) {
        measure('hud', () => {
          this.hud?.update?.();
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
      }
      measure('ambient_bonus_drones', () => this.updateAmbientBonusDrones(delta)); // Handles hazard drones and collectible power cores
      measure('magnet_pull', () => this.applyMagnetPull(delta));
      measure('orbital_strike', () => this.updateOrbitalStrike(delta));
      measure('random_popups', () => this.updateRandomPopups(delta));
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

  playLevelClearVoice({ bossCompletion = false } = {}) {
    const delayMs = bossCompletion ? BOSS_DEATH_VOICE_LOCK_MS + 450 : 260;
    const token = (this.levelClearVoiceToken || 0) + 1;
    this.levelClearVoiceToken = token;
    setTimeout(() => {
      if (this.game?.currentScene !== this || this.levelClearVoiceToken !== token) return;
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
    }, delayMs);
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
    this.showRankUp(nr);
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

  showRankUp(newRank) {
    const nr = Number(newRank);
    if (!Number.isFinite(nr)) return;

    if (this._rankUpAnimating) return;
    this._rankUpAnimating = true;
    this._showRankUpCount++;
    this.centerToastLockUntil = Date.now() + 8000; // 8 second cooldown to prevent spam

    // TASK 4: Enhanced rank up animation with rank sprite and title
    const rank = (newRank !== undefined) ? newRank : this.game.rankIndex;
    const rankTitle = this.game.getRankTitle ? this.game.getRankTitle(rank) : '';

    // Keep rank-up feedback punchy without routine announcer chatter.
    AudioManager.playSfx('powerup', { force: true, volume: 1.0 });

    // TASK 4: Polished arcade animation
    this.createRankUpAnimation(rank, rankTitle);

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

    // Release Lock after animation
    setTimeout(() => {
      this._rankUpAnimating = false;
    }, 8000); // Match cooldown duration
  }

  createRankUpAnimation(rank, rankTitle) {
    const { width, height } = this.game.app.screen;
    const compact = width < 720;
    const panelWidth = Math.min(width - 32, compact ? 304 : 356);
    const panelHeight = compact ? 124 : 142;
    const container = new PIXI.Container();
    container.label = 'ui_rank_up_badge';
    container.x = compact ? width / 2 : width - panelWidth / 2 - 28;
    const safeTop = compact ? 176 : 190;
    container.y = Math.max(safeTop + panelHeight / 2, height * (compact ? 0.34 : 0.3));
    container.alpha = 0;
    container.scale.set(0.78);
    container.zIndex = 10000;
    this.uiOverlay.addChild(container);

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
    rankUpText.y = rankTitle ? -30 : -12;
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
      titleText.y = 0;
      container.addChild(titleText);
    }

    const lore = createText(getAchievementPopup(), {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 11 : 13,
      fill: '#d8fbff',
      stroke: '#000000',
      strokeThickness: 2,
      align: rankTexture ? 'left' : 'center',
      wordWrap: true,
      wordWrapWidth: maxTextWidth,
      lineHeight: compact ? 13 : 15
    });
    lore.anchor.set(textAnchorX, 0);
    lore.x = textX;
    lore.y = rankTitle ? 22 : 14;
    container.addChild(lore);

    let elapsed = 0;
    const phases = { easeIn: 260, hold: 1850, easeOut: 500 };
    const totalDuration = phases.easeIn + phases.hold + phases.easeOut;
    const animate = (delta) => {
      if (container.destroyed || !container.scale || !this.game?.app?.ticker) {
        this.game?.app?.ticker?.remove?.(animate);
        return;
      }
      elapsed += delta.deltaTime * 16.67;
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
      }
    };
    this.game.app.ticker.add(animate);
  }

  // Wave bonus WOW effect with premium arcade feel
  showWaveBonusEffect(bonusAmount, label = 'WAVE CLEARED!', options = {}) {
    const { width, height } = this.game.app.screen;
    const compact = Boolean(options.compact);
    const panelWidth = compact ? 340 : 400;
    const panelHeight = compact ? 108 : 130;
    const panelRadius = compact ? 8 : 10;
    const ringCount = compact ? 1 : 3;
    const ringRadius = compact ? 155 : 220;
    const effectY = compact ? height * 0.38 : height * 0.35;

    // Create dedicated isolated effect container
    const effectContainer = new PIXI.Container();
    effectContainer.x = width / 2;
    effectContainer.y = effectY;
    effectContainer.alpha = 0;
    effectContainer.scale.set(compact ? 0.55 : 0.3); // Bigger for more wow factor
    effectContainer.zIndex = 9999;
    this.uiContainer.addChild(effectContainer);

    // Outer glow rings for extra wow
    for (let i = 0; i < ringCount; i++) {
      const outerRing = new PIXI.Graphics();
      outerRing.circle(0, 0, ringRadius + i * 30);
      outerRing.stroke({ color: 0x00ff00, width: 2, alpha: compact ? 0.22 : 0.3 - i * 0.1 });
      effectContainer.addChild(outerRing);
    }

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

    // Star burst decoration
    const starCount = compact ? 4 : 8;
    for (let i = 0; i < starCount; i++) {
      const angle = (Math.PI * 2 * i) / starCount;
      const star = new PIXI.Graphics();
      star.moveTo(0, 0);
      star.lineTo(Math.cos(angle) * (compact ? 18 : 25), Math.sin(angle) * (compact ? 18 : 25));
      star.stroke({ color: 0xffff00, width: 2, alpha: compact ? 0.45 : 0.7 });
      star.x = Math.cos(angle) * (compact ? 150 : 180);
      star.y = Math.sin(angle) * (compact ? 38 : 50);
      effectContainer.addChild(star);
    }

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
    bonusText.y = compact && options.subtitle ? 8 : 30;
    effectContainer.addChild(bonusText);

    if (options.subtitle) {
      const subtitleText = createText(String(options.subtitle), {
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

    // Animation sequence: explosive entry, hold, smooth exit
    let elapsed = 0;
    const phases = {
      entry: compact ? 220 : 400,    // Fast explosive entry
      hold: compact ? 650 : 1800,    // Hold for readability
      exit: compact ? 350 : 600,     // Smooth fade out
      flashPeak: compact ? 90 : 150  // Flash duration
    };
    const totalDuration = phases.entry + phases.hold + phases.exit;
    this.reserveMessageFocus(totalDuration + 300, { priority: 3 });

    const animate = (delta) => {
      elapsed += delta.deltaTime * 16.67;

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
      }
    };

    this.game.app.ticker.add(animate);
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
    bullet.active = false;

    const radius = Math.max(110, Number(bullet.blastRadius) || 150);
    const damage = Math.max(1, Number(bullet.damage) || 1);
    const x = Number.isFinite(bullet.x) ? bullet.x : this.player?.x || this.game.getWidth() / 2;
    const y = Number.isFinite(bullet.y) ? bullet.y : this.player?.y || this.game.getHeight() * 0.45;

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
      const destroyed = enemy.takeDamage(damage);
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
        const destroyed = hijacker.takeDamage(damage);
        this.particleManager?.createHitSpark(hijacker.x, hijacker.y, 0xffaa00);
        if (destroyed) this.particleManager?.createExplosion(hijacker.x, hijacker.y, 0xff9900);
      }
    }

    console.log(`[BombPowerup] detonated reason=${reason} x=${Math.round(x)} y=${Math.round(y)} radius=${Math.round(radius)}`);
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
      screenShakes: []
    };
  }

  queueCollisionSideEffect(queue, type, payload = {}) {
    if (!queue?.[type]) return false;
    queue[type].push(payload);
    return true;
  }

  processCollisionSideEffects(queue, stats, measure) {
    if (!queue) return;
    const measured = measure || ((_label, callback) => callback());
    const diagnosticOptions = this.performanceDiagnostics?.options || {};
    const skipAllSideEffects = Boolean(diagnosticOptions.rawCollisionOnly || diagnosticOptions.noCollisionSideEffects);

    measured('collision.side_effects.score_popups', () => {
      if (skipAllSideEffects || diagnosticOptions.noScorePopups) {
        stats.scorePopupQueued = (stats.scorePopupQueued || 0) + queue.scorePopups.length;
        stats.scorePopupDropped = (stats.scorePopupDropped || 0) + queue.scorePopups.length;
        return;
      }
      for (const popup of queue.scorePopups) {
        this.scorePopupManager?.queueScorePopup?.(popup.x, popup.y, popup.score, popup.options || {});
      }
      const flushed = this.scorePopupManager?.flushQueuedPopups?.(3) || {
        queued: queue.scorePopups.length,
        created: 0,
        dropped: queue.scorePopups.length,
        remaining: 0
      };
      stats.scorePopupQueued = (stats.scorePopupQueued || 0) + flushed.queued;
      stats.scorePopupCreated = (stats.scorePopupCreated || 0) + flushed.created;
      stats.scorePopupDropped = (stats.scorePopupDropped || 0) + flushed.dropped;
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
      const maxHitSparks = 4;
      const maxDeathFeedback = 1;
      for (const spark of queue.hitSparks.slice(0, maxHitSparks)) {
        if (!this.particleManager || spark?.enabled === false) continue;
        this.particleManager.createHitSpark(spark.x, spark.y, spark.color, spark.intensity);
        hitSparkCreated += 1;
      }
      for (const entry of queue.deathFeedback.slice(0, maxDeathFeedback)) {
        if (!entry?.enemy) continue;
        this.playEnemyDeathFeedback(entry.enemy, entry.options || {});
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
      const maxPowerupSpawns = COLLISION_POWERUP_SPAWN_ATTEMPT_BUDGET;
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
    });
  }

  getCollisionRadius(entity) {
    const radius = Number(entity?.radius) || 10;
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

  checkCollisions() {
    const { width, height } = this.game.app.screen;
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
    const screenHeight = this.game.app.screen.height;
    const detonationY = screenHeight * 0.45; // Detonate at 45% of screen height
    this.bulletManager.playerBullets.forEach(bullet => {
      collisionStats.bombApexChecks += 1;
      if (bullet.active && bullet.isBomb && bullet.y <= detonationY) {
        collisionStats.bombApexDetonations += 1;
        this.detonateBombBullet(bullet, 'apex');
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
          collisionStats.playerBulletEnemyHits += 1;
          if (bulletProxy.isPlasmaLance) collisionStats.plasmaLanceHitEvents += 1;
          hitEvents.push({ bullet, enemy, bulletProxy });
          if (bulletProxy.isBomb) break;
          if (!bulletProxy.piercing) bullet.active = false;
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
        const destroyed = enemy.takeDamage(bulletProxy.damage);
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
              score: appliedScore
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
            x: enemy.x,
            y: enemy.y,
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
            collisionStats.playerBulletHijackerHits += 1;
            if (bullet.isBomb) {
              this.detonateBombBullet(bullet, 'hijacker_impact');
              return;
            }
            if (!bullet.piercing) bullet.active = false;
            const destroyed = hijacker.takeDamage(bullet.damage);

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

    // Point Defense and Graze Break: Player bullets vs enemy bullets
    measure('collision.projectile_defense', () => {
    const hasGrazeBreaker = this.bulletManager.playerBullets.some(playerBullet =>
      playerBullet?.active !== false && playerBullet.isGrazeBreaker
    );
    const pointDefenseActive = this.player.pointDefenseActive && !this.player.isPowerupSuppressed?.();
    if (pointDefenseActive || hasGrazeBreaker) {
      this.bulletManager.playerBullets.forEach(playerBullet => {
        if (!playerBullet.active) return;

        this.bulletManager.enemyBullets.forEach(enemyBullet => {
          if (!enemyBullet.active) return;
          if (!pointDefenseActive && !playerBullet.isGrazeBreaker) return;
          collisionStats.projectileDefensePairs += 1;

          // Check collision between player bullet and enemy bullet
          const dx = playerBullet.x - enemyBullet.x;
          const dy = playerBullet.y - enemyBullet.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitRadius = (playerBullet.radius || 4) + (enemyBullet.radius || 6);

          if (dist < hitRadius) {
            collisionStats.projectileDefenseHits += 1;
            if (playerBullet.isGrazeBreaker) {
              this.triggerGrazeBreak(playerBullet, enemyBullet);
              return;
            }

            // Destroy both projectiles
            playerBullet.active = false;
            enemyBullet.active = false;

            // Subtle hit sound (NOT annoying blip blop)
            AudioManager.playSfx('impactMetal', { volume: 0.15 });

            // Small visual feedback
            if (this.particleManager) {
              this.particleManager.createHitSpark(enemyBullet.x, enemyBullet.y, 0x00ddff);
            }
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

          bullet.active = false;
          if (this.isBossOwnedBullet(bullet)) {
            this.handleBossCausedPlayerHit('boss_bullet', this.enemyManager?.boss, {
              balanceSource: `boss_bullet:${bullet.sourceFireStyle || bullet.weaponProfileId || 'unknown'}`,
              shieldShake: 4
            });
            return;
          }

          if (!this.player.invulnerable) {
            const damageTaken = this.player.takeDamage();
            if (damageTaken) {
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
            collisionStats.playerBulletAmbientHits += 1;
            if (!bullet.piercing) bullet.active = false;
            const destroyed = bonusDrone.takeDamage(bullet.damage || 1);
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
        collisionStats.enemyPlayerChecks += 1;
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
          AudioManager.playSfx('powerup_pickup', { volume: 0.35, minIntervalMs: 120 });
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
    const { width, height } = this.game.app.screen;

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

  // TASK D: Procedural starfield background with parallax layers
  createStarfield() {
    const { width, height } = this.game.app.screen;

    // Create container for starfield (behind everything)
    this.starfieldContainer = new PIXI.Container();
    this.starfieldContainer.zIndex = -1000;
    this.gameContainer.addChild(this.starfieldContainer);
    this.gameContainer.sortableChildren = true;
    this.initGameplayBackdrop(width, height);

    // 3 parallax layers: far (slow), mid (medium), near (fast)
    this.starLayers = [];

    // Layer 1: Far stars (small, slow, many)
    const farStars = [];
    for (let i = 0; i < 100; i++) {
      const star = new PIXI.Graphics();
      star.circle(0, 0, 0.7 + Math.random() * 0.35); // 0.7-1.05 px
      star.fill({ color: 0x8fb9e6, alpha: 0.16 + Math.random() * 0.18 }); // keep white reserved for threats
      star.x = Math.random() * width;
      star.y = Math.random() * height;
      star._speed = 15 + Math.random() * 10; // 15-25 px/s
      this.starfieldContainer.addChild(star);
      farStars.push(star);
    }
    this.starLayers.push(farStars);

    // Layer 2: Mid stars (medium, medium speed)
    const midStars = [];
    for (let i = 0; i < 50; i++) {
      const star = new PIXI.Graphics();
      star.circle(0, 0, 0.95 + Math.random() * 0.45); // 0.95-1.4 px
      star.fill({ color: 0xa6d7ff, alpha: 0.2 + Math.random() * 0.2 });
      star.x = Math.random() * width;
      star.y = Math.random() * height;
      star._speed = 40 + Math.random() * 20; // 40-60 px/s
      this.starfieldContainer.addChild(star);
      midStars.push(star);
    }
    this.starLayers.push(midStars);

    // Layer 3: Near stars (larger, fast, fewer)
    const nearStars = [];
    for (let i = 0; i < 25; i++) {
      const star = new PIXI.Graphics();
      star.circle(0, 0, 1.1 + Math.random() * 0.7); // 1.1-1.8 px
      star.fill({ color: 0xb8ddff, alpha: 0.24 + Math.random() * 0.22 });
      star.x = Math.random() * width;
      star.y = Math.random() * height;
      star._speed = 80 + Math.random() * 40; // 80-120 px/s
      this.starfieldContainer.addChild(star);
      nearStars.push(star);
    }
    this.starLayers.push(nearStars);

    // Optional: Add subtle nebula haze
    const nebula = new PIXI.Graphics();
    nebula.circle(width * 0.3, height * 0.2, 150);
    nebula.fill({ color: 0x4444ff, alpha: 0.03 });
    nebula.circle(width * 0.7, height * 0.6, 200);
    nebula.fill({ color: 0xff4488, alpha: 0.02 });
    this.starfieldContainer.addChildAt(nebula, 0); // Behind stars
  }

  async initGameplayBackdrop(width, height) {
    if (getNovaPerformanceFlags().disableDecorativeBackgrounds) return;
    const baseBackdrop = AssetManifest.generated?.gameplayArenaBackdrop || AssetManifest.generated?.menuBackdrop;
    if (!baseBackdrop) return;

    try {
      const texture = await PIXI.Assets.load({
        alias: 'generated_gameplay_backdrop',
        src: baseBackdrop
      });
      const stormTexture = AssetManifest.generated.stormGameplayBackdrop
        ? await PIXI.Assets.load({
            alias: 'generated_storm_gameplay_backdrop',
            src: AssetManifest.generated.stormGameplayBackdrop
          })
        : null;
      const bossTexture = AssetManifest.generated.bossArenaBackdrop
        ? await PIXI.Assets.load({
            alias: 'generated_boss_gameplay_backdrop',
            src: AssetManifest.generated.bossArenaBackdrop
          })
        : null;
      if (!this.starfieldContainer || !this.starfieldContainer.parent) return;

      const backdrop = new PIXI.Sprite(texture);
      backdrop.anchor.set(0.5);
      backdrop.label = 'gameplayBackdrop';
      this.fitBackdropToScreen(backdrop, width, height);

      let stormBackdrop = null;
      if (stormTexture) {
        stormBackdrop = new PIXI.Sprite(stormTexture);
        stormBackdrop.anchor.set(0.5);
        stormBackdrop.label = 'gameplayStormBackdrop';
        this.fitBackdropToScreen(stormBackdrop, width, height);
      }
      let bossBackdrop = null;
      if (bossTexture) {
        bossBackdrop = new PIXI.Sprite(bossTexture);
        bossBackdrop.anchor.set(0.5);
        bossBackdrop.label = 'gameplayBossBackdrop';
        this.fitBackdropToScreen(bossBackdrop, width, height);
      }

      const shade = new PIXI.Graphics();
      shade.label = 'gameplayBackdropShade';
      shade.rect(0, 0, width, height);
      shade.fill({ color: 0x020713, alpha: 1 });

      this.gameplayBackdrop = backdrop;
      this.gameplayStormBackdrop = stormBackdrop;
      this.gameplayBossBackdrop = bossBackdrop;
      this.gameplayBackdropShade = shade;
      this.starfieldContainer.addChildAt(backdrop, 0);
      if (stormBackdrop) this.starfieldContainer.addChildAt(stormBackdrop, 1);
      if (bossBackdrop) this.starfieldContainer.addChildAt(bossBackdrop, stormBackdrop ? 2 : 1);
      this.starfieldContainer.addChildAt(shade, (stormBackdrop ? 1 : 0) + (bossBackdrop ? 1 : 0) + 1);
      this.applyGameplayBackdropLevel(this.game?.level || 1);
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

  applyGameplayBackdropLevel(level = 1) {
    const stormActive = level >= 3;
    const bossActive = level % 5 === 0 || this.enemyManager?.state === 'BOSS' || this.enemyManager?.boss?.active;
    if (this.gameplayBackdrop) {
      this.gameplayBackdrop.alpha = bossActive ? 0.18 : stormActive ? 0.26 : 0.42;
    }
    if (this.gameplayStormBackdrop) {
      this.gameplayStormBackdrop.alpha = bossActive ? 0.16 : stormActive ? 0.34 : 0;
    }
    if (this.gameplayBossBackdrop) {
      this.gameplayBossBackdrop.alpha = bossActive ? 0.4 : 0;
    }
    if (this.gameplayBackdropShade) {
      this.gameplayBackdropShade.alpha = bossActive ? 0.54 : stormActive ? 0.5 : 0.46;
    }
  }

  fitBackdropToScreen(sprite, width, height) {
    const textureWidth = sprite.texture?.width || width;
    const textureHeight = sprite.texture?.height || height;
    const scale = Math.max(width / textureWidth, height / textureHeight);
    sprite.scale.set(scale);
    sprite.position.set(width / 2, height / 2);
  }

  updateStarfield(delta) {
    if (!this.starLayers || !this.game?.app?.screen) return;

    const { width, height } = this.game.app.screen;
    const dtSec = Math.min(0.05, delta / 60); // Convert to seconds, clamp for safety

    // Update all star layers
    this.starLayers.forEach(layer => {
      layer.forEach(star => {
        // Move star downward (forward motion)
        star.y += star._speed * dtSec;

        // Wrap around when star goes off bottom
        if (star.y > height + 10) {
          star.y = -10;
          star.x = Math.random() * width; // Randomize X for variety
        }
      });
    });
  }

  // TASK 4: Play shooting sound with self-healing health check
  playShootSoundWithHealthCheck() {
    const now = Date.now();
    const check = this.shootSoundHealthCheck;
    const sfxKey = this.player?.getShootSfxKey ? this.player.getShootSfxKey() : 'shoot_small';
    check.lastSoundKey = sfxKey;

    // Track shot
    check.shotsFired++;
    check.lastShotTime = now;

    // Try to play sound with a minimum interval to avoid choking the pool
    let played = false;
    if (now - check.lastSoundTime >= 80) {
      played = AudioManager.playSfx(sfxKey, { pool: true, minIntervalMs: 60 }) === true;
      if (played) {
        check.lastSoundTime = now;
        check.shotsFired = 0;
        check.recoveryAttempts = 0;
        check.recoveredLogged = false;
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
      AudioManager.playSfx(sfxKey, { force: true, pool: true, volume: 0.8 });
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
    this.flushDeferredSeasonProgress(true);
    if (this.deferredThreatDefeats?.length) {
      this.processDeferredThreatDefeats(this.deferredThreatDefeats.length);
    }
    this.performanceDiagnostics?.destroy?.();
    this.performanceDiagnostics = null;
    this.closeSettingsOverlay();
    this.closeHowToPlayOverlay();
    this.destroyPauseOverlay();
    this.clearRunContractStartNudge();
    this.clearPendingEnemyStart();
    this.clearSectorArrivalStinger();
    this.clearBackgroundLevelEntryWarmup();
    this.removeAutoPauseHandlers();
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

  logCap(type) {
    if (!this.capState[type]) {
      this.capState[type] = true;
      if (this.debugCaps) {
        const counts = this.getPerfCounts();
        console.warn(`CAP bullets=${counts.bullets} enemies=${counts.enemies} particles=${counts.particles}`);
      }
    }
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
    this.isPaused = paused;
    if (paused) {
      this.showPauseOverlay();
      AudioManager.setPauseDucked(true);
      AudioManager.playSfx('pause_in', { force: true, volume: 0.45 });
    } else {
      this.closeSettingsOverlay();
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
    if (this.controlSmokeMode) return;
    if (this.game?.currentScene !== this || !this.isReady || this.isPaused || (this.game?.lives || 0) <= 0) return;
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
    const panelWidth = Math.min(620 * uiScale, Math.max(500 * uiScale, width * 0.34 * uiScale));
    const panelHeight = Math.min(height * 0.86, 430 * uiScale);
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

    const status = createText(translateText('ARCADE PATROL ON HOLD'), {
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

    const makeChip = (label, value, x, y, color = 0x00eaff) => {
      const chip = new PIXI.Container();
      chip.label = `ui_pauseChip_${label}`;
      chip.zIndex = 6;
      chip.position.set(x, y);
      const bg = new PIXI.Graphics();
      bg.roundRect(-92, -20, 184, 40, 7);
      bg.fill({ color: 0x031321, alpha: 0.82 });
      bg.stroke({ color, width: 1, alpha: 0.58 });
      const top = createText(label, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: 10,
        fontWeight: 'bold',
        fill: '#8df6ff',
        align: 'center'
      });
      top.anchor.set(0.5);
      top.y = -8;
      const bottom = createText(value, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: 17,
        fontWeight: 'bold',
        fill: '#ffffff',
        align: 'center'
      });
      bottom.anchor.set(0.5);
      bottom.y = 8;
      chip.addChild(bg, top, bottom);
      chip.valueText = bottom;
      return chip;
    };

    const scoreChip = makeChip(translateText('SCORE'), Number(this.game.score || 0).toLocaleString('en-US'), centerX - 104, panelY + 150, 0xffd15c);
    const sectorChip = makeChip(translateText('SECTOR'), String(this.game.level || 1).padStart(2, '0'), centerX + 104, panelY + 150, 0x00eaff);
    decorLayer.addChild(scoreChip, sectorChip);

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
    pilotOrdersLine.position.set(centerX, panelY + 184 * uiScale);
    pilotOrdersLine.zIndex = 7;
    overlay.addChild(pilotOrdersLine);

    this.pauseButtons = [
      this.createPauseButton(translateText('RESUME'), centerX, panelY + 228 * uiScale, () => this.setPaused(false), { accent: 0xffd15c, hot: true }),
      this.createPauseButton(translateText('SETTINGS'), centerX, panelY + 280 * uiScale, () => this.openSettingsOverlay(), { accent: 0x00eaff }),
      this.createPauseButton(translateText('HOW TO PLAY'), centerX, panelY + 332 * uiScale, () => this.openHowToPlayOverlay(), { accent: 0x7fffd8 }),
      this.createPauseButton(translateText('QUIT TO MENU'), centerX, panelY + 384 * uiScale, () => {
        this.closeSettingsOverlay();
        this.closeHowToPlayOverlay();
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
      pilotOrdersValue: pilotOrdersLine,
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
    if (decor.pilotOrdersValue) decor.pilotOrdersValue.text = this.getPausePilotOrdersSummary();
  }

  getPauseDebugState() {
    const decor = this.pauseMenuDecor;
    return {
      visible: Boolean(this.pauseOverlay?.visible && this.pauseOverlay?.parent),
      score: decor?.scoreValue?.text ?? null,
      sector: decor?.sectorValue?.text ?? null,
      pilotOrders: decor?.pilotOrdersValue?.text ?? null
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
    const orderSlot = item.orderSlot || formatRunContractOrderSlotLabel(item.id);
    const progress = translateText('{progress}/{target}', formatRunContractProgressValue(item.progress, item.target));
    return `${prefix} // ${orderSlot ? `${orderSlot} ` : ''}${title} ${progress}`;
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
    overlay.visible = true;
    overlay._debugCriticalHull = {
      visible: true,
      lives,
      edge: Math.round(edge),
      hotAlpha: Number(hotAlpha.toFixed(3)),
      lineAlpha: Number(lineAlpha.toFixed(3)),
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  triggerPlayerDeathFeedback(options = {}) {
    const finalDeath = Boolean(options.final || this.game?.lives <= 0);
    if (finalDeath && this.finalDeathFeedbackShown) return;
    if (finalDeath) this.finalDeathFeedbackShown = true;
    if (!this.player && !finalDeath) return;

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const impactX = this.player?.x ?? width / 2;
    const impactY = this.player?.y ?? height * 0.72;

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
    this.clearToastState();
    this.triggerPlayerDeathFeedback({ final: true });
    this.showInGameGameOverAnimation();
    const id = setTimeout(() => {
      if (this.game?.currentScene === this) {
        this.game.gameOver();
      }
    }, 1500);
    if (!this._deathTimeouts) this._deathTimeouts = [];
    this._deathTimeouts.push(id);
    return true;
  }

  showInGameGameOverAnimation() {
    if (!this.uiOverlay || this.gameOverAnimationLayer?.parent) return;
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const layer = new PIXI.Container();
    layer.label = 'ui_in_game_game_over_animation';
    layer.zIndex = 1000000;
    layer.alpha = 0;
    layer.scale.set(0.92);
    this.gameOverAnimationLayer = layer;

    const shade = new PIXI.Graphics();
    shade.rect(0, 0, width, height);
    shade.fill({ color: 0x020711, alpha: 0.58 });
    layer.addChild(shade);

    const ring = new PIXI.Graphics();
    ring.x = width / 2;
    ring.y = height * 0.46;
    layer.addChild(ring);

    const titleSize = width < 720 ? 48 : 86;
    const title = createText(translateText('GAME OVER'), {
      fontFamily: 'Orbitron, Rajdhani, Bahnschrift, sans-serif',
      fontSize: titleSize,
      fontWeight: '900',
      fill: '#fff3a2',
      stroke: '#2a0013',
      strokeThickness: width < 720 ? 5 : 8,
      align: 'center',
      letterSpacing: 0,
      dropShadow: true,
      dropShadowColor: '#ff55d9',
      dropShadowBlur: 12,
      dropShadowDistance: 0
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = height * 0.43;
    layer.addChild(title);

    const subtitle = createText(`${translateText('SCORE')}: ${Number(this.game.score || 0).toLocaleString('en-US')}  //  ${translateText('SECTOR')} ${this.game.level || 1}`, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: width < 720 ? 17 : 24,
      fontWeight: '900',
      fill: '#9cfbff',
      stroke: '#020711',
      strokeThickness: 4,
      align: 'center'
    });
    subtitle.anchor.set(0.5);
    subtitle.x = width / 2;
    subtitle.y = title.y + (width < 720 ? 52 : 82);
    layer.addChild(subtitle);

    this.uiOverlay.addChild(layer);
    this.uiOverlay.sortChildren?.();
    AudioManager.playSfx('swarm_chatter_stinger', { force: true, volume: 0.92, minIntervalMs: 0 });

    let elapsed = 0;
    const duration = 1480;
    const ticker = (tick) => {
      elapsed += tick.deltaTime * 16.67;
      const t = Math.min(1, elapsed / duration);
      const intro = Math.min(1, elapsed / 260);
      layer.alpha = intro < 1 ? intro : Math.max(0, 1 - Math.max(0, t - 0.82) / 0.18);
      layer.scale.set(0.92 + Math.sin(Math.min(1, intro) * Math.PI * 0.5) * 0.08);
      const pulse = 0.5 + Math.sin(elapsed * 0.014) * 0.5;
      ring.clear();
      ring.circle(0, 0, Math.min(width, height) * (0.22 + pulse * 0.03));
      ring.stroke({ color: 0xff55d9, width: 4, alpha: 0.52 + pulse * 0.28 });
      ring.circle(0, 0, Math.min(width, height) * (0.34 + pulse * 0.04));
      ring.stroke({ color: 0x37f5ff, width: 2, alpha: 0.36 + pulse * 0.18 });
      if (elapsed >= duration) {
        this.game.app.ticker.remove(ticker);
        this._activeTickers = (this._activeTickers || []).filter(fn => fn !== ticker);
      }
    };
    this.game.app.ticker.add(ticker);
    if (!this._activeTickers) this._activeTickers = [];
    this._activeTickers.push(ticker);
  }

  onLifeLost(lives, context = {}) {
    const source = String(context?.source || 'unknown');
    this.lastLifeLossSource = source;
    if (context?.final || (Number(lives) || 0) <= 0) {
      this.finalLifeLossSource = source;
    }
    this.lifeLossesThisRun = (Number(this.lifeLossesThisRun) || 0) + 1;
    this.damageTakenThisWave = (Number(this.damageTakenThisWave) || 0) + 1;
    this.damageTakenThisSector = (Number(this.damageTakenThisSector) || 0) + 1;
    this.emitRunContractEvent('life_lost', { sector: this.game?.level || 1, source });
    this.recordBalanceLifeLost();
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
      this.player.forceRespawn(this.game.getWidth(), this.game.getHeight());
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
    const width = this.game.getWidth ? this.game.getWidth() : this.game.app.screen.width;
    const height = this.game.getHeight ? this.game.getHeight() : this.game.app.screen.height;
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
    this.player.forceRespawn(this.game.getWidth(), this.game.getHeight());
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
    const compact = width < 620;
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

    const width = this.game.getWidth();
    const height = this.game.getHeight();
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
      bullet.active = false;
      if (bullet.sprite?.parent) bullet.sprite.parent.removeChild(bullet.sprite);
      this.particleManager?.createHitSpark(bullet.x, bullet.y, 0x66ffff);
    });
    if (bullets.length > 0 && this.bulletManager) {
      this.bulletManager.enemyBullets = this.bulletManager.enemyBullets.filter(bullet => bullet?.active !== false);
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

    const width = this.game.getWidth ? this.game.getWidth() : this.game.app.screen.width;
    const height = this.game.getHeight ? this.game.getHeight() : this.game.app.screen.height;
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
    const now = Date.now();
    const alpha = Math.max(0, Math.sin((1 - progress) * Math.PI)) * 0.82;
    const pulse = 1 + Math.sin(now * 0.05) * 0.08;
    const shimmer = 0.5 + Math.sin(now * 0.07) * 0.5;
    const color = hazard.color || 0xfff45c;
    const palette = this.getBossHazardVfxPalette(hazard, color);
    const hotColor = palette.hot;

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
    const bullets = this.bulletManager?.enemyBullets;
    if (!Array.isArray(bullets) || bullets.length === 0) return 0;

    let cleared = 0;
    for (const bullet of bullets) {
      if (!bullet) continue;
      if (bullet.sprite?.parent) bullet.sprite.parent.removeChild(bullet.sprite);
      if (bullet.active !== false) cleared += 1;
      bullet.active = false;
    }
    this.bulletManager.enemyBullets = [];
    if (cleared > 0 && this.debugPowerups) {
      console.log(`[BulletCleanup] reason=${reason} cleared=${cleared}`);
    }
    return cleared;
  }

  clearBossHazards(reason = 'cleanup') {
    const hazards = Array.isArray(this.bossHazards) ? this.bossHazards : [];
    const cleared = hazards.length;
    this.bossHazards = [];
    this.lastBossHazardHit = null;
    this.bossHazardLayer?.clear?.();
    if (cleared > 0 && this.debugPowerups) {
      console.log(`[BossHazardCleanup] reason=${reason} cleared=${cleared}`);
    }
    return cleared;
  }

  clearRespawnHazards(reason = 'respawn') {
    let cleared = this.clearEnemyBullets(reason);
    const height = this.game.getHeight();
    const dangerY = height * 0.62;
    const playerX = this.player?.x ?? this.game.getWidth() / 2;
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
      this.player.scoreBoostExpiresAt = Date.now() + durationMs;
    }
    if (this.player?.noteScoreMultiplier) this.player.noteScoreMultiplier();
    this.showToast(`SCORE x${mult}`, { fontSize: 34, fill: '#ffff00', duration: 1800, slot: 'center', type: 'score_boost' });
    console.log(`[Powerup] pickup type=SCORE_X2 durationMs=${durationMs} source=${source}`);
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
      this.triggerOverrunClearCelebration({
        nextSector,
        milestoneSector,
        eventKind: 'run_clear',
        clearBonus,
        livesBonus
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
    this.overrunCelebratedMilestones.add(milestoneSector);
    this.triggerOverrunClearCelebration({
      nextSector,
      milestoneSector,
      eventKind: 'overrun_milestone'
    });
    return true;
  }

  triggerOverrunClearCelebration({
    nextSector = (this.game?.level || 10) + 1,
    milestoneSector = this.game?.level || 10,
    eventKind = 'run_clear',
    clearBonus = 0,
    livesBonus = 0
  } = {}) {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const centerX = width * 0.5;
    const centerY = height * (width < 620 ? 0.36 : 0.42);
    const celebration = getOverrunMilestoneCelebration({ milestoneSector, eventKind });
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
      livesBonus
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
      requiresConfirm: eventKind === 'run_clear' || eventKind === 'overrun_milestone',
      confirmReadyAt: Date.now() + 1250,
      confirmed: false,
      confirmedBy: null,
      eventKind,
      milestoneSector,
      nextSector,
      variantId: celebration.id,
      effect
    };
    effect.requiresConfirm = eventKind === 'run_clear' || eventKind === 'overrun_milestone';
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
    livesBonus = 0
  }) {
    const compact = width < 720;
    const cardWidth = Math.min(width - 32, compact ? 540 : 820);
    const cardHeight = Math.min(height * (compact ? 0.72 : 0.64), compact ? 330 : 364);
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

    const bonusLine = eventKind === 'run_clear' && (clearBonus || livesBonus)
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

    const warning = createText(translateText('STRAP IN, PILOT. OVERRUN DOES NOT DO EASY.'), {
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
    warning.y = compact ? cardHeight / 2 - 92 : cardHeight / 2 - 96;
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
    this.updateStarfield(delta);
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
      interlude.active = false;
      this.overrunMilestoneInterlude = null;
      this.clearOverrunConfirmationHandlers();
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
    const notBefore = bypassFocusLock ? (Number(options.notBefore) || 0) : Math.max(Number(options.notBefore) || 0, lockUntil);
    const entry = {
      message,
      options: { ...options, type, slot, priority, notBefore },
      priority,
      createdAt: now,
      notBefore
    };

    if (priority >= 3) {
      this.dropLowerPriorityToastBacklog(priority);
      this.dismissActiveToastsBelowPriority(priority);
    }

    const queue = this.getToastQueueForSlot(slot);
    if (!queue) return;

    const duplicate = queue.find(item => item.message === message && item.options?.type === type);
    if (duplicate && duplicate.priority >= priority) {
      duplicate.createdAt = entry.createdAt;
      duplicate.options = { ...duplicate.options, ...entry.options };
    } else {
      queue.push(entry);
      queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
      const limit = this.getToastQueueLimit(slot);
      while (queue.length > limit) queue.pop();
    }

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

  dropLowerPriorityToastBacklog(priority) {
    this.toastQueue = this.toastQueue.filter(entry => entry.priority >= priority);
    this.toastTopQueue = this.toastTopQueue.filter(entry => entry.priority >= priority);
    this.toastCornerQueue = this.toastCornerQueue.filter(entry => entry.priority >= priority);
  }

  dismissActiveToastsBelowPriority(priority) {
    this.dismissActiveToastSlotsBelowPriority(['center', 'top', 'corner'], priority);
  }

  dismissActiveToastSlotsBelowPriority(slots, priority) {
    [
      ['center', this.activeCenterToast],
      ['top', this.activeTopToast],
      ['corner', this.activeCornerToast]
    ].forEach(([slot, display]) => {
      if (!slots.includes(slot)) return;
      const activePriority = display?.__toastMeta?.priority ?? 0;
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
    const activeRemaining = (this.activeCenterToast || this.activeTopToast) ? minMs : 0;
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

    if (slot === 'corner' && this.activeCornerToast === display) {
      this.activeCornerToast = null;
    } else if (slot === 'top' && this.activeTopToast === display) {
      this.activeTopToast = null;
    } else if (this.activeCenterToast === display) {
      this.activeCenterToast = null;
    }
  }

  clearToastState() {
    this.toastQueue = [];
    this.toastTopQueue = [];
    this.toastCornerQueue = [];
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
    const duration = Math.max(500, Math.min(Number(remainingMs) || Number(sourceOptions.duration) || 1300, 1500));
    const nextEntry = {
      message: entry.message,
      priority: Math.max(Number(entry.priority) || Number(sourceOptions.priority) || 0, 1),
      createdAt: now,
      notBefore: now,
      options: {
        ...sourceOptions,
        slot: 'top',
        type: sourceOptions.type || entry.type || 'generic',
        priority: Math.max(Number(entry.priority) || Number(sourceOptions.priority) || 0, 1),
        fontSize: Math.min(baseFontSize, this.game.getWidth() < 620 ? 15 : 18),
        duration,
        notBefore: now,
        combatRelocated: true
      }
    };
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
    const remaining = Math.max(550, Math.min((meta.duration || 1200) - elapsed, 1200));
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
    let centerReady = !this.activeCenterToast && now >= this.getToastSlotLockUntil('center')
      ? this.peekReadyToast(this.toastQueue, now)
      : null;
    let topReady = !this.activeTopToast && now >= this.getToastSlotLockUntil('top')
      ? this.peekReadyToast(this.toastTopQueue, now)
      : null;
    if (centerReady && this.shouldRelocateCenterToastForCombat(centerReady)) {
      const entry = this.dequeueReadyToast(this.toastQueue, now);
      if (entry) this.queueCombatRelocatedToast(entry, now);
      centerReady = !this.activeCenterToast && now >= this.getToastSlotLockUntil('center')
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
    const activeCenterMeta = this.activeCenterToast?.__toastMeta || null;
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
    if (!this.activeCenterToast && now >= this.getToastSlotLockUntil('center') && this.toastQueue.length > 0) {
      const entry = this.dequeueReadyToast(this.toastQueue, now);
      if (entry) this.activeCenterToast = this.showToastNow(entry.message, entry.options, 'center');
    }
    const blockingCenterMeta = this.activeCenterToast?.__toastMeta || null;
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
    return type === 'level_clear' || type === 'level_up' || type === 'boss' || type === 'run_clear';
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
      combatRelocated: Boolean(meta.combatRelocated),
      ageMs: Math.max(0, Date.now() - meta.createdAt),
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
        this.describeToastDisplay(this.activeCenterToast, getBounds),
        this.describeToastDisplay(this.activeTopToast, getBounds),
        this.describeToastDisplay(this.activeCornerToast, getBounds)
      ].filter(Boolean),
      comboDisplay: null,
      scorePopups,
      achievement: this.activeAchievementToast ? {
        id: this.activeAchievementToast.__achievementToastId,
        queued: this.achievementToastQueue.length
      } : {
        id: null,
        queued: this.achievementToastQueue.length
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
    if (this.activeCenterToast) return false;
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
    const y = slot === 'corner'
      ? Math.min(height - 80, Math.max(requestedY, 156))
      : requestedY;

    let display = null;
    if (options.banner) {
      const runContractBanner = options.type === 'runContract'
        || options.type === 'runContractStart'
        || options.type === 'runContractProgress';
      const banner = new PIXI.Container();
      const bannerText = createText(message, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize,
        fill: options.fill || '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'left',
        wordWrap: true,
        wordWrapWidth: maxWidth * 0.6,
        lineHeight: fontSize + 6
      });
      bannerText.anchor.set(0, 0.5);

      const paddingX = 24;
      const paddingY = 16;
      const minFontSize = 16;
      const maxTextHeight = options.type === 'lore' ? 106 : 80;

      const commsPortraits = Object.keys(GameAssets.commsPortraits || {});
      const requestedAvatar = options.imageAlias && GameAssets.isValidTexture(GameAssets.getCommsPortrait(options.imageAlias))
        ? options.imageAlias
        : null;
      const hasAvatar = Boolean(requestedAvatar) || commsPortraits.length > 0;
      const avatarSize = options.type === 'lore' ? 54 : 44;
      const avatarSlot = hasAvatar ? avatarSize + 16 : 0;
      const contentWidth = Math.max(140, maxWidth - paddingX * 2 - avatarSlot);
      bannerText.style.wordWrapWidth = contentWidth;
      if (bannerText.updateText) bannerText.updateText(false);

      while (bannerText.height > maxTextHeight && bannerText.style.fontSize > minFontSize) {
        bannerText.style.fontSize -= 2;
        bannerText.style.lineHeight = bannerText.style.fontSize + 6;
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
      panel.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 14);
      panel.fill({
        color: options.type === 'lore' ? 0x05121c : (runContractBanner ? 0x031321 : 0x111111),
        alpha: options.type === 'lore' ? 0.78 : (runContractBanner ? 0.94 : 0.88)
      });
      panel.stroke({
        color: options.type === 'lore' || runContractBanner ? (options.accent || 0x6fe7ff) : 0xffff00,
        width: options.type === 'lore' ? 1.5 : (runContractBanner ? 3.5 : 3),
        alpha: options.type === 'lore' ? 0.78 : 1
      });

      const accent = new PIXI.Graphics();
      accent.roundRect(-panelWidth / 2 + 6, -panelHeight / 2 + 6, panelWidth - 12, panelHeight - 12, 10);
      accent.stroke({ color: runContractBanner ? 0xffef7e : 0xff66cc, width: runContractBanner ? 1.4 : 1, alpha: runContractBanner ? 0.82 : 0.7 });

      const noise = new PIXI.Graphics();
      for (let i = 0; i < 24; i++) {
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
          fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
          fontSize: options.type === 'lore' ? 12 : 14,
          fill: options.type === 'lore' ? '#7ee9ff' : (runContractBanner ? '#ffef7e' : '#ffff00'),
          fontWeight: 'bold',
          stroke: '#000000',
          strokeThickness: options.type === 'lore' ? 2 : 3
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
      display = banner;
      this.uiOverlay.addChild(banner);
    } else {
      const text = createText(message, {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize,
        fill: options.fill || '#ffffff',
        stroke: options.stroke,
        strokeThickness: options.strokeThickness,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: maxWidth,
        lineHeight: fontSize + 6
      });

      if (slot === 'corner') {
        text.anchor.set(1, 0.5);
        text.x = width - 16;
        text.y = y;
      } else {
        text.anchor.set(0.5);
        text.x = width / 2;
        text.y = y;
      }
      text.alpha = 0;

      if (text.width > maxWidth) {
        const scale = maxWidth / text.width;
        text.scale.set(scale);
      }

      this.container.addChild(text);
      display = text;
    }

    const duration = options.duration || (slot === 'corner' ? 1800 : 2200);
    const now = Date.now();
    display.__toastMeta = {
      message,
      type: options.type || 'generic',
      slot,
      priority: Number.isFinite(options.priority) ? options.priority : 0,
      duration,
      title: options.title || null,
      imageAlias: options.imageAlias || null,
      combatRelocated: options.combatRelocated === true,
      originalOptions: { ...options },
      createdAt: now
    };

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

      if (elapsed < 250) {
        display.alpha = elapsed / 250;
        if (options.banner) {
          const t = elapsed / 250;
          display.scale.set(0.9 + t * 0.1);
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
    this.deferredCollisionUiFeedback = {
      toasts: [],
      screenShakes: [],
      playerExplosions: []
    };
    for (const toast of (feedback.toasts || []).slice(0, 1)) {
      if (toast?.message) this.enqueueToast(toast.message, toast.options || {});
    }
    for (const shake of (feedback.screenShakes || []).slice(0, 3)) {
      this.screenShake?.shake?.(shake.intensity, shake.duration);
    }
    if (!this.performanceDiagnostics?.options?.noParticles) {
      for (const entry of (feedback.playerExplosions || []).slice(0, 1)) {
        const x = Number.isFinite(entry?.x) ? entry.x : this.player?.x;
        const y = Number.isFinite(entry?.y) ? entry.y : this.player?.y;
        if (Number.isFinite(x) && Number.isFinite(y)) {
          this.particleManager?.createExplosion?.(x, y, entry.color, entry.intensity);
        }
      }
    }
    return {
      toasts: feedback.toasts?.length || 0,
      screenShakes: feedback.screenShakes?.length || 0,
      playerExplosions: feedback.playerExplosions?.length || 0
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
    const profile = enemy.generatedProfile || enemy.dangerMidShipProfile || enemy.middleShipProfile || {};
    const lateMayhem = Boolean(profile.lateMayhem) && Math.max(1, Number(this.game?.level || enemy.level) || 1) >= 11;
    const x = Number(enemy.x) || 0;
    const y = Number(enemy.y) || 0;
    const palette = Array.isArray(profile.palette) && profile.palette.length
      ? profile.palette
      : [options.color, profile.accent, profile.tint, enemy.color].filter(Number.isFinite);
    const baseColor = Number.isFinite(options.color)
      ? options.color
      : (Number.isFinite(palette[0]) ? palette[0] : enemy.color || 0xffaa00);
    const intensity = Number.isFinite(options.intensity)
      ? options.intensity
      : (lateMayhem ? 0.86 : 1);
    this.particleManager?.createExplosion(x, y, baseColor, intensity);

    if (lateMayhem) {
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

  triggerPowerupPickupJuice(powerup = {}) {
    const type = powerup?.type || 'powerup';
    const x = Number.isFinite(this.player?.x) ? this.player.x : (Number.isFinite(powerup?.x) ? powerup.x : this.game.getWidth() / 2);
    const y = Number.isFinite(this.player?.y) ? this.player.y : (Number.isFinite(powerup?.y) ? powerup.y : this.game.getHeight() * 0.72);
    const color = Number.isFinite(powerup?.color)
      ? powerup.color
      : (this.player?.visualVariant?.accent || this.player?.visualVariant?.glow || 0x66ffff);
    const major = ['super_extra_life', 'bomb', 'row_core', 'plasma_lance', 'shockwave'].includes(type);

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
    this.screenShake?.shake?.(this.game.getWidth() < 620 ? 2 : (major ? 5 : 3), major ? 14 : 9);

    this.lastPowerupPickupJuice = {
      triggered: true,
      startedAt: Date.now(),
      durationMs: major ? 950 : 720,
      type,
      major,
      x: Math.round(x),
      y: Math.round(y)
    };
    return this.lastPowerupPickupJuice;
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

  onEnemyKilled(enemy, options = {}) {
    const now = Date.now();
    const sideEffects = options.sideEffects || null;
    const queueToast = (message, toastOptions) => {
      if (!this.queueCollisionSideEffect(sideEffects, 'toasts', { message, options: toastOptions })) {
        this.enqueueToast(message, toastOptions);
      }
    };
    const queuePlayerExplosion = (x, y, color, intensity) => {
      if (!this.queueCollisionSideEffect(sideEffects, 'playerExplosions', { x, y, color, intensity })) {
        this.particleManager?.createExplosion?.(x, y, color, intensity);
      }
    };
    const queueScreenShake = (intensity, duration) => {
      if (!this.queueCollisionSideEffect(sideEffects, 'screenShakes', { intensity, duration })) {
        this.screenShake?.shake?.(intensity, duration);
      }
    };
    if (enemy?.kind === 'boss') {
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
      const threatId = isEliteMiddleShip
        ? (enemy?.middleShipProfile?.id || enemy?.type)
        : enemy?.type;
      this.queueThreatDefeat(threatId, threatCategory, {
        name: isEliteMiddleShip
          ? (enemy?.middleShipProfile?.displayName || enemy?.middleShipProfile?.label || threatId)
          : (enemy?.generatedProfile?.displayName || enemy?.middleShipProfile?.displayName || enemy?.middleShipProfile?.label || threatId),
        role: isEliteMiddleShip
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
          supportId: enemy?.bossSupportShipProfile?.id || enemy?.bossFuelProfile?.id || BOSS_FUEL_SHIP_CODEX_ID
        });
      }
      if ((this.runContractSession?.active || []).some((item) => {
        const contract = getRunContractById(item.id);
        return (contract?.objective === 'enemy_defeats' || contract?.objective === 'unique_enemy_defeats')
          && item.eligible
          && !item.completed;
      })) {
        this.emitRunContractEvent('enemy_defeated', {
          sector: this.game?.level || 1,
          enemyType: enemy?.type || enemy?.kind || 'enemy'
        });
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
    this.maybeDropFirstRunPickup(enemy);

    // Check for milestone bonuses (5x, 10x, 15x, 20x)
    for (const milestone of COMBO_MILESTONES) {
      if (this.comboCount === milestone.threshold && !this.comboMilestonesReached.has(milestone.threshold)) {
        this.comboMilestonesReached.add(milestone.threshold);
        const appliedBonus = this.addNormalWaveScore(milestone.bonus, 'baseScore', enemy);
        queueToast(`${milestone.label} +${appliedBonus}`, {
          fontSize: 26,
          fill: '#ffaa00',
          slot: 'center',
          type: 'milestone',
          duration: 1800
        });
        queuePlayerExplosion(this.player?.x, (this.player?.y || 0) - 40, 0xffaa00);
        queueScreenShake(6, 15);
        this.triggerComboMilestoneFlare({
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
      queueToast(label, { fontSize: 24, fill: '#00ffff', slot: 'top', type: 'combo' });
      queuePlayerExplosion(this.player?.x, this.player?.y, 0x00ffff);
      if (!COMBO_MILESTONES.some((milestone) => milestone.threshold === this.comboCount)) {
        this.triggerComboMilestoneFlare({
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
        queueToast(`COMBO BONUS +${appliedBonus}`, { fontSize: 16, fill: '#fff3a2', slot: 'top', type: 'combo', duration: 900, priority: 1 });
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
    this.comboTimerMs -= delta * 16.67;
    if (this.comboTimerMs <= 0) {
      this.comboCount = 0;
      this.comboMultiplier = 1;
      this.killStreak = 0;
      this.comboMilestonesReached.clear(); // Reset milestones when combo expires
    }
  }

  maybeDropFirstRunPickup(enemy) {
    if (this.firstRunPickupDropped || !enemy || this.game?.level !== 1 || this.enemyManager?.currentWaveIndex !== 0) return false;
    this.firstRunKillCount = (this.firstRunKillCount || 0) + 1;
    if (this.firstRunKillCount < 3 || !this.powerupManager || !this.player) return false;

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const x = Math.max(width * 0.34, Math.min(width * 0.66, enemy.x || width / 2));
    const y = Math.max(112, Math.min(height * 0.42, (enemy.y || height * 0.2) + 26));
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
    if (this.grazeBreakReady && Date.now() > this.grazeBreakExpiresAt) {
      this.grazeBreakReady = false;
      this.grazeBreakNeedsFireRelease = false;
      this.grazeBreakReleasePrimed = false;
    }
  }

  updateGrazeBreakFireIntent(firePressed = false) {
    const pressed = Boolean(firePressed);
    if (this.grazeBreakReady && this.grazeBreakNeedsFireRelease && this.fireInputWasPressed && !pressed) {
      this.primeGrazeBreakAfterRelease();
    }
    this.currentFirePressed = pressed;
    this.fireInputWasPressed = pressed;
  }

  primeGrazeBreakAfterRelease() {
    if (!this.grazeBreakReady || !this.grazeBreakNeedsFireRelease) return false;
    if (Date.now() > this.grazeBreakExpiresAt) {
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
    const now = Date.now();
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
    if (!this.grazeBreakReady || Date.now() > this.grazeBreakExpiresAt || !Array.isArray(bullets) || !bullets.length) {
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

  triggerGrazeBreak(playerBullet, enemyBullet) {
    if (!playerBullet?.active || !enemyBullet?.active) return null;

    const impactX = Number.isFinite(enemyBullet.x) ? enemyBullet.x : playerBullet.x;
    const impactY = Number.isFinite(enemyBullet.y) ? enemyBullet.y : playerBullet.y;
    const radius = Math.max(92, Math.min(150, this.game.getWidth() * 0.13));
    const token = playerBullet.grazeBreakToken || 0;

    playerBullet.active = false;
    enemyBullet.active = false;
    if (playerBullet.sprite?.parent) playerBullet.sprite.parent.removeChild(playerBullet.sprite);
    if (enemyBullet.sprite?.parent) enemyBullet.sprite.parent.removeChild(enemyBullet.sprite);
    this.bulletManager.playerBullets = this.bulletManager.playerBullets.filter(bullet => bullet?.active !== false);

    const cleared = [{ x: Math.round(enemyBullet.x), y: Math.round(enemyBullet.y) }];
    for (const bullet of this.bulletManager.enemyBullets || []) {
      if (!bullet || bullet === enemyBullet || bullet.active === false) continue;
      const dist = Math.hypot((bullet.x || 0) - impactX, (bullet.y || 0) - impactY);
      if (dist > radius + (bullet.radius || 6)) continue;
      bullet.active = false;
      if (bullet.sprite?.parent) bullet.sprite.parent.removeChild(bullet.sprite);
      cleared.push({ x: Math.round(bullet.x), y: Math.round(bullet.y) });
      this.particleManager?.createHitSpark(bullet.x, bullet.y, 0xff66ff);
    }
    this.bulletManager.enemyBullets = this.bulletManager.enemyBullets.filter(bullet => bullet?.active !== false);

    let enemiesHit = 0;
    let enemiesDestroyed = 0;
    for (const enemy of this.enemyManager?.enemies || []) {
      if (!enemy?.active || enemy.waitingForEntry || enemy.kind === 'boss') continue;
      const dist = Math.hypot((enemy.x || 0) - impactX, (enemy.y || 0) - impactY);
      if (dist > radius + (enemy.radius || 16)) continue;
      enemiesHit += 1;
      const destroyed = enemy.takeDamage(Math.max(1.25, Number(playerBullet.damage || 1) * 1.25));
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
    this.particleManager?.createNearMissEffect(impactX, impactY, Math.max(4, this.dangerDodgeCount + 2));
    this.screenShake?.shake(this.game.getWidth() < 620 ? 5 : 8, 16);
    AudioManager.playSfx('combo_breakout', { force: true, volume: 0.82, minIntervalMs: 220 });
    AudioManager.playSfx('impactMetal', { volume: 0.34, minIntervalMs: 90 });

    this.lastGrazeBreak = {
      triggered: true,
      startedAt: Date.now(),
      durationMs: 950,
      token,
      x: Math.round(impactX),
      y: Math.round(impactY),
      radius: Math.round(radius),
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
    this.grazeBreakCooldownAt = Date.now() + 5200;
    return this.lastGrazeBreak;
  }

  applyNearMiss(bullet) {
    const now = Date.now();
    if (now < this.nearMissCooldownAt) return;
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
      streak: this.dangerDodgeCount
    });
    const comboMult = Math.max(1, this.comboMultiplier);
    const traitMult = Number(this.player?.traitCombat?.nearMissScoreMult || 1);
    const streakBonus = Math.min(100, 25 + this.dangerDodgeCount * 15);
    const score = Math.round(streakBonus * comboMult * (Number.isFinite(traitMult) ? traitMult : 1));
    const appliedScore = this.game.addScore(score);
    this.lastDangerDodgeScore = appliedScore;
    this.player?.pulseHitboxReticle?.('near_miss', this.dangerDodgeCount >= 3 ? 1250 : 850);
    const nearMissLabel = translateText('NEAR MISS');
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
      this.scorePopupManager.addScorePopup(this.player.x, this.player.y - 34, appliedScore, {
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
        const destroyed = enemy.takeDamage(splashDamage);
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
        bullet.active = false;
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
    if (!this.player?.chainLightningActive) return;

    const maxChains = this.player.chainLightningMaxChains || 3;
    const chainRange = 150; // pixels
    const damageMultiplier = 0.5; // 50% of original damage per chain

    const chainedEnemies = [sourceEnemy];
    let currentEnemy = sourceEnemy;

    for (let i = 0; i < maxChains; i++) {
      // Find nearest unchained enemy
      let nearest = null;
      let nearestDist = chainRange;

      this.enemyManager.enemies.forEach(enemy => {
        if (enemy.active && !chainedEnemies.includes(enemy)) {
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
      const destroyed = nearest.takeDamage(chainDamage);

      if (destroyed) {
        // Award score
        if (!this.player.isSlowTimeActive?.()) {
          const scoreAwarded = this.getComboScore(nearest.scoreValue);
          const appliedScore = this.game.addScore(this.getNormalWaveScoreAward(scoreAwarded, nearest));
          if (this.scorePopupManager) {
            this.scorePopupManager.addScorePopup(nearest.x, nearest.y, appliedScore);
          }
        }
        this.onEnemyKilled(nearest);
        this.playEnemyDeathFeedback(nearest, { volume: 0.4 });
      } else {
        this.particleManager.createHitSpark(nearest.x, nearest.y);
      }

      chainedEnemies.push(nearest);
      currentEnemy = nearest;
    }

    // Play lightning sound if any chains happened
    if (chainedEnemies.length > 1) {
      AudioManager.playSfx('chain_lightning_arc', { volume: 0.62 });
    }
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
        return false;
      });
    }
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
      }
      return;
    }
    const range = this.player.magnetRadius || 140;
    const strength = this.player.magnetStrength || 0.08;
    const pull = strength * delta * 15; // MUCH stronger pull (was too weak before)
    const px = this.player.x;
    const py = this.player.y;

    // Draw visual indicator for magnet field
    if (!this.magnetFieldVisual) {
      this.magnetFieldVisual = new PIXI.Graphics();
      this.gameContainer.addChild(this.magnetFieldVisual);
    }

    // Update magnet field visual
    this.magnetFieldVisual.visible = true;
    this.magnetFieldVisual.clear();
    const now = Date.now();
    const pulse = Math.sin(now * 0.005) * 0.5 + 0.5;
    const alpha = 0.15 + pulse * 0.1;

    // Outer ring
    this.magnetFieldVisual.circle(px, py, range);
    this.magnetFieldVisual.stroke({ color: 0x99ffcc, width: 2, alpha: alpha * 0.8 });
    this.magnetFieldVisual.fill({ color: 0x99ffcc, alpha: alpha * 0.15 });

    // Inner ring
    this.magnetFieldVisual.circle(px, py, range * 0.6);
    this.magnetFieldVisual.stroke({ color: 0xccffee, width: 1, alpha: alpha * 0.5 });

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
      }
    });

    this.ambientBonusDrones.forEach(b => {
      if (!b.active) return;
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
      }
    });
  }

  updateOrbitalStrike(delta) {
    if (!this.player?.orbitalStrikeActive || !this.player?.orbitalStrikeCharges || this.player.orbitalStrikeCharges <= 0) {
      return;
    }

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

  triggerOrbitalStrike() {
    // Find a random active enemy to target
    const activeEnemies = this.enemyManager.enemies.filter(e => e.active);
    if (activeEnemies.length === 0) return;

    const target = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
    const targetX = target.x;
    const targetY = target.y;
    const debug = {
      targetX: Math.round(targetX || 0),
      targetY: Math.round(targetY || 0),
      chargesBefore: this.player?.orbitalStrikeCharges || 0,
      damageEvents: [],
      completed: false
    };
    this.lastOrbitalStrikeDebug = debug;

    // Decrement charges
    this.player.orbitalStrikeCharges--;
    debug.chargesAfter = this.player.orbitalStrikeCharges;

    // Show warning indicator
    const warning = new PIXI.Graphics();
    warning.circle(0, 0, 60);
    warning.stroke({ color: 0xff6600, width: 3, alpha: 0.8 });
    warning.circle(0, 0, 40);
    warning.stroke({ color: 0xff6600, width: 2, alpha: 0.5 });
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
      const screenHeight = this.game.app.screen.height;
      beam.moveTo(targetX, 0);
      beam.lineTo(targetX, screenHeight);
      beam.stroke({ color: 0xffaa00, width: 40, alpha: 0.6 });

      // Add glow effect
      beam.moveTo(targetX, 0);
      beam.lineTo(targetX, screenHeight);
      beam.stroke({ color: 0xffff00, width: 20, alpha: 0.8 });

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
          const destroyed = enemy.takeDamage(damage);
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
      if (target?.active && !damagedEnemies.has(target)) {
        applyStrikeDamage(target, true);
      }
      debug.completed = true;

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
  }

  spawnAmbientBonusDrone(type) {
    const x = Math.random() * (this.game.getWidth() - 100) + 50;
    const y = -50;

    const bonusDrone = new BonusDrone(x, y, this.game, type);
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

    const bossProfile = this.enemyManager?.boss?.profile || getBossProfile(this.game?.level || 1);
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
    scanOverlay.moveTo(-122, -18);
    scanOverlay.lineTo(122, -18);
    scanOverlay.moveTo(0, -138);
    scanOverlay.lineTo(0, 88);
    scanOverlay.stroke({ color: accentColor, width: 1, alpha: 0.55 });
    poster.addChild(scanOverlay);

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

    const sweep = new PIXI.Graphics();
    sweep.blendMode = 'add';
    sweep.moveTo(0, 0);
    sweep.lineTo(108, -26);
    sweep.stroke({ color: 0xffffff, width: 2, alpha: 0.28 });
    sweep.moveTo(0, 0);
    sweep.lineTo(94, 44);
    sweep.stroke({ color: accentColor, width: 1.4, alpha: 0.24 });
    emblem.addChild(sweep);

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

    const sweep = new PIXI.Graphics();
    sweep.blendMode = 'add';
    sweep.moveTo(0, 0);
    sweep.lineTo(108, -26);
    sweep.stroke({ color: 0xffffff, width: 2, alpha: 0.28 });
    sweep.moveTo(0, 0);
    sweep.lineTo(94, 44);
    sweep.stroke({ color: accentColor, width: 1.4, alpha: 0.24 });
    emblem.addChild(sweep);

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

  showMayhemReinforcementStormWarning({ groupCount = 1, boss = false, superStorm = false } = {}) {
    const count = Math.max(1, Math.min(6, Math.floor(Number(groupCount) || 1)));
    if (count < 2) return false;

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compactHud = width < 620;
    this.enqueueToast(`${translateText('REINFORCEMENT STORM')} x${count}`, {
      fontSize: compactHud ? 18 : 24,
      fill: superStorm ? '#ff5df7' : boss ? '#ff8f9c' : '#ffef7e',
      stroke: '#160006',
      strokeThickness: compactHud ? 3 : 4,
      slot: 'top',
      type: 'warning',
      priority: 6,
      duration: 1500,
      y: compactHud ? height * 0.24 : 96,
      maxWidth: width * (compactHud ? 0.86 : 0.62)
    });

    const layer = this.uiOverlay || this.gameContainer || this.container;
    if (!layer || !this.game?.app?.ticker) {
      AudioManager.playSfx(count >= 3 ? 'swarm_chatter_stinger' : 'enemy_threat_soft_warn', {
        force: count >= 3,
        volume: count >= 3 ? 0.68 : 0.34
      });
      return true;
    }

    const overlay = new PIXI.Graphics();
    overlay.label = 'mayhem_reinforcement_storm_warning';
    overlay.blendMode = 'add';
    overlay.alpha = 0.92;
    layer.addChild(overlay);

    const laneWidth = width / (count + 1);
    const duration = 1350;
    let elapsed = 0;
    const ticker = (delta) => {
      elapsed += (Number(delta?.deltaTime) || Number(delta) || 1) * 16.67;
      const t = Math.min(1, elapsed / duration);
      const alpha = Math.max(0, 1 - t);
      overlay.clear();
      for (let i = 1; i <= count; i += 1) {
        const x = laneWidth * i;
        const sweepY = -height * 0.18 + (height * 1.28) * t;
        const color = i % 2 ? 0xffef7e : 0xff3d7f;
        overlay.moveTo(x, 0);
        overlay.lineTo(x, height);
        overlay.stroke({ color, width: compactHud ? 2 : 3, alpha: 0.18 * alpha });
        overlay.moveTo(x - 44, sweepY - 40);
        overlay.lineTo(x + 44, sweepY + 40);
        overlay.stroke({ color, width: compactHud ? 5 : 7, alpha: 0.55 * alpha });
      }
      overlay.rect(0, 0, width, height);
      overlay.stroke({ color: superStorm ? 0xff5df7 : boss ? 0xff3d7f : 0xffef7e, width: 2, alpha: 0.16 * alpha });
      if (t >= 1 || this.game?.currentScene !== this) {
        this.game.app.ticker.remove(ticker);
        if (overlay.parent) overlay.parent.removeChild(overlay);
        overlay.destroy?.();
      }
    };
    this.game.app.ticker.add(ticker);

    AudioManager.playSfx(count >= 3 ? 'swarm_chatter_stinger' : 'enemy_threat_soft_warn', {
      force: count >= 3,
      volume: count >= 3 ? 0.68 : 0.34
    });
    if (count >= 3) this.screenShake?.shake?.(5, 12);
    return true;
  }

  showBossIntro(name, taunt) {
    const { width, height } = this.game.app.screen;
    const compact = width < 720;
    const panelWidth = Math.max(300, Math.min(compact ? width - 36 : 540, width * 0.72));
    const panelHeight = compact ? 154 : 148;
    const fitText = (text, maxWidth, maxHeight, minScale = 0.68) => {
      if (!text) return;
      text.scale.set(1);
      text.style.wordWrap = true;
      text.style.wordWrapWidth = maxWidth;
      text.style.align = 'center';
      text.updateText?.(false);
      const widthScale = maxWidth / Math.max(1, text.width || maxWidth);
      const heightScale = maxHeight / Math.max(1, text.height || maxHeight);
      text.scale.set(Math.max(minScale, Math.min(1, widthScale, heightScale)));
    };
    const card = new PIXI.Container();
    card.x = width / 2;
    card.y = height * 0.28;
    card.alpha = 0;

    const panel = new PIXI.Graphics();
    panel.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 12);
    panel.fill({ color: 0x111111, alpha: 0.9 });
    panel.stroke({ color: 0xff3300, width: 3 });
    card.addChild(panel);

    const title = createText(name || 'BOSS', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 26,
      fill: '#ff3300',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 38,
      lineHeight: compact ? 25 : 29
    });
    title.anchor.set(0.5);
    title.y = -24;
    fitText(title, panelWidth - 38, 56, 0.6);
    card.addChild(title);

    const line = createText(taunt || 'LET\'S GO!', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: compact ? 16 : 18,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 48,
      lineHeight: compact ? 18 : 21
    });
    line.anchor.set(0.5);
    line.y = 28;
    fitText(line, panelWidth - 48, 54, 0.68);
    card.addChild(line);

    this.uiOverlay.addChild(card);
    this.lastHitStopRequestMs = 250;
    this.freezeTimerMs = this.lastHitStopRequestMs;
    AudioManager.play('menuSelect'); // Calmer sound for boss intro (removed annoying computerNoise)

    let elapsed = 0;
    const duration = 1400;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      if (elapsed < 200) {
        card.alpha = elapsed / 200;
      } else if (elapsed > duration - 300) {
        card.alpha = Math.max(0, (duration - elapsed) / 300);
      } else {
        card.alpha = 1;
      }
      if (elapsed >= duration) {
        this.game.app.ticker.remove(ticker);
        if (card.parent) card.parent.removeChild(card);
      }
    };
    this.game.app.ticker.add(ticker);
  }

  triggerShockwave(x, y, color = 0xffff00) {
    const ring = new PIXI.Graphics();
    ring.circle(0, 0, 10);
    ring.stroke({ color, width: 3, alpha: 0.9 });
    ring.x = x;
    ring.y = y;
    this.uiOverlay.addChild(ring);
    let radius = 10;
    const ticker = (delta) => {
      radius += delta.deltaTime * 2.4;
      ring.scale.set(radius / 10);
      ring.alpha -= 0.02 * delta.deltaTime;
      if (ring.alpha <= 0) {
        this.game.app.ticker.remove(ticker);
        if (ring.parent) ring.parent.removeChild(ring);
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
    const spokes = style.spokes || 10;
    const radius = style.radius || Math.min(this.game.getWidth(), this.game.getHeight()) * 0.16;
    const draw = (t = 0) => {
      sigil.clear();
      const spin = t * (style.spin || 0.8);
      sigil.circle(bossX, bossY, radius * (0.42 + t * 0.42));
      sigil.stroke({ color: baseColor, width: 5, alpha: 0.34 * (1 - t) });
      sigil.circle(bossX, bossY, radius * (0.72 + t * 0.32));
      sigil.stroke({ color: accent, width: 2.5, alpha: 0.24 * (1 - t) });
      for (let i = 0; i < spokes; i += 1) {
        const angle = (Math.PI * 2 * i) / spokes + spin;
        const inner = radius * (0.28 + (i % 2) * 0.08);
        const outer = radius * (style.longSpokes ? 1.42 : 1.05) * (0.9 + t * 0.55);
        sigil.moveTo(bossX + Math.cos(angle) * inner, bossY + Math.sin(angle) * inner);
        sigil.lineTo(bossX + Math.cos(angle) * outer, bossY + Math.sin(angle) * outer);
        sigil.stroke({ color: i % 2 ? accent : baseColor, width: i % 2 ? 2 : 3.5, alpha: 0.42 * (1 - t) });
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
      { id: 'kurt_mirror_crack', pattern: 'mirror', sfx: 'nova_boss_death_kurt', accent: 0x7fffd8, spokes: 12, spin: 1.4 },
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
    const burstCount = 12 + (seed % 5) + (style.pattern === 'confetti' ? 5 : 0);
    const ringCount = 3 + (seed % 3) + (style.pattern === 'vortex' || style.pattern === 'spiral' ? 2 : 0);

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
        if (i === 1 || i === Math.floor(burstCount / 2)) {
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
    this.recordThreatDefeat(bossId, 'bosses', {
      name: bossName,
      role: this.enemyManager?.boss?.profile?.title || 'boss',
      sector: level
    });
    const repairDelta = this.applyBossClearRecovery(level);

    const compactHud = this.game.getWidth() < 620;
    const repairLine = repairDelta > 0 ? `\nHULL REPAIR +${repairDelta}` : '';
    this.showToast(`BOSS DEFEATED! +1000${repairLine}\n${getAchievementPopup()}`, {
      fontSize: compactHud ? 20 : 28,
      fill: '#ffff00',
      stroke: '#330000',
      strokeThickness: compactHud ? 3 : 5,
      duration: 2300,
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
    const isNarrowIntro = introWidth < 620;
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
    const startY = introHeight + 300;
    const endY = introHeight - (isNarrowIntro ? 170 : 150);
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
    const duration = isNarrowIntro ? 1500 : 1800;
    const textDuration = isNarrowIntro ? 2600 : 3200;
    const startTime = Date.now();
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
      const progress = Math.min(elapsed / duration, 1);

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

      // 5. Impact (at ~80% of fly-in duration, ~1.4s)
      if (elapsed > 1400 && elapsed < 1550) {
        flash.alpha = 0.1;
        this.gameContainer.x = (Math.random() - 0.5) * 6;
        this.gameContainer.y = (Math.random() - 0.5) * 6;
      } else {
        flash.alpha = Math.max(0, flash.alpha - 0.02);
        this.gameContainer.x = 0;
        this.gameContainer.y = 0;
      }

      // --- Text Animation ---
      // Text Animation (Fade In 0.6s -> Hold -> Fade Out 0.8s)
      let tAlpha = 0;
      if (elapsed < 600) {
        tAlpha = elapsed / 600;
        nameText.y = (introHeight / 2 - (isNarrowIntro ? 72 : 50)) + (tAlpha * 10);
      } else if (elapsed < 2800) {
        tAlpha = 1;
        nameText.y = (introHeight / 2 - (isNarrowIntro ? 62 : 40));
      } else {
        tAlpha = 1 - ((elapsed - 2800) / 800);
        nameText.y = (introHeight / 2 - (isNarrowIntro ? 62 : 40));
      }
      nameText.alpha = tAlpha;
      subText.alpha = tAlpha;

      const pulse = 1.0 + Math.sin(now * 0.005) * 0.025;
      nameText.scale.set(baseNameScale * pulse);
      subText.scale.set(baseSubScale);

      // --- Logic Gating ---
      if (elapsed >= textDuration && !gameplayEnabled) {
        gameplayEnabled = true;
        this.completeShipIntro();
      }

      if (elapsed < textDuration) {
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
