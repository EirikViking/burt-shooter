import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { RankAssets } from '../utils/RankAssets.js';
import { Player, RESPAWN_INVULNERABILITY_MS } from '../entities/Player.js';
import { BonusDrone } from '../entities/BonusDrone.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
import { COMBO_MILESTONES, COMBO_WINDOW_MS } from '../config/ComboConfig.js';
import { EnemyManager } from '../managers/EnemyManager.js';
import { BulletManager } from '../managers/BulletManager.js';
import { PowerupManager } from '../managers/PowerupManager.js';
import { ParticleManager } from '../effects/ParticleManager.js';
import { ScreenShake } from '../effects/ScreenShake.js';
import { ScorePopupManager } from '../ui/ScorePopup.js';
import { InputManager } from '../input/InputManager.js';
import { TouchControls } from '../input/TouchControls.js';
import { NullTouchControls } from '../input/NullTouchControls.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';
import { SettingsOverlay } from '../ui/SettingsOverlay.js';
import { BUILD_ID } from '../buildInfo.js';
import { getDefaultShipKey } from '../config/ShipMetadata.js';
import { createText } from '../utils/pixiText.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import {
  extendLevelIntroTexts,
  getAchievementPopup,
  getEnemyTaunt,
  getMicroMessage,
  getAllNewPhrases,
  getStoryTransmission
} from '../text/phrasePool.js';
import { getShipMetadata } from '../config/ShipMetadata.js';

export class PlayScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.gameContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    this.uiOverlay = new PIXI.Container();
    this.container.addChild(this.gameContainer);
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
    this.pauseButtons = [];
    this.pauseFocusedIndex = 0;
    this.pauseGamepadNavigator = new GamepadNavigator();
    this.settingsOverlay = null;
    this.levelAdvancePending = false;
    this.levelAdvanceTimeout = null;
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
    this.commsPortraitsReady = null;
    this.lowLivesShownFor = null;
    this.ambientBonusDroneTimer = 0;
    this.easterEggTimer = 0;
    this.ambientBonusDrones = []; // Lists for update
    this.legendaryFlyby = null;
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
    this.bossHazards = [];
    this.bossHazardLayer = null;
    this.lastBossHazardHit = null;

    // Ship intro state
    this.introActive = false;
    this.introComplete = false;
    this.introOverlay = null;
    this.shipIntroToken = 0;
    this.introStartTime = 0;
    this.activeTopToast = null;
    this.activeCornerToast = null;
    this.centerToastLockUntil = 0;
    this.toastSlotLockUntil = { center: 0, top: 0, corner: 0 };
    this.loreBag = [];
    this.loreBagIndex = 0;
    this.lastLoreLine = null;
    this.lastLoreAt = 0;
    this.loreCooldownMs = 10000;
    this.lastMajorToastAt = 0;
    this.majorToastCooldownMs = 3500;

    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.comboTimerMs = 0;
    this.comboWindowMs = COMBO_WINDOW_MS;
    this.killStreak = 0;
    this.totalKills = 0;
    this.bossKills = 0;
    this.wavesCleared = 0;
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
    this.grazeBreakReady = false;
    this.grazeBreakArmedAt = 0;
    this.grazeBreakExpiresAt = 0;
    this.grazeBreakCooldownAt = 0;
    this.grazeBreakToken = 0;
    this.lastGrazeBreak = null;
    this.lastTraitImpactToastAt = 0;
    this.comboMilestonesReached = new Set(); // Track milestones achieved in current combo

    // Powerup mechanics (orbital strike timer tracked in scene)
    this.orbitalStrikeTimer = 0;

    // Synergy + Meta
    this.synergyBadge = null;
    this.comboDisplay = null;
    this.devOverlay = null;
    this.seasonXp = 0;
    this.seasonLevel = 0;
    this.seasonUnlocks = {};
    this.lastScoreSeen = 0;
    this.lastBossDefeatedLevel = 0;
    this.postBossLevelIntroPending = false;
    this.freezeTimerMs = 0;

    // TASK: Fix duplicate wave start
    this._lastStartedLevel = -1;
    this._deathTimeouts = [];
    this._activeTickers = [];
    this.balanceDebug = null;
    this.bossClearRecoveryLevels = new Set();
  }

  init() {
    this.isReady = false;
    if (!this.inputManager || this.inputManager.destroyed) {
      this.inputManager = new InputManager();
    }
    this.isPaused = false;
    this.bossClearRecoveryLevels.clear();
    this.pauseOverlay = null;
    this.settingsOverlay = null;
    this.pausePressed = false;
    this.gameContainer.removeChildren();
    this.uiContainer.removeChildren();
    this.uiOverlay.removeChildren();
    this.uiContainer.sortableChildren = true;
    this.uiOverlay.sortableChildren = true;

    // TASK D: Create procedural starfield background
    this.createStarfield();
    this.loadBossDossierTexture();

    // --- Hud & UI ---
    this.hud = new HUD(this.uiContainer, this.game);
    // Note: HUD creates itself in constructor
    this.initMetaProgress();
    this.createComboDisplay();
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
      commsPortraitsSpawned: 0,
      legendaryFlybyTriggered: 0
    };

    this.gameTime = 0;
    this.totalKills = 0;
    this.bossKills = 0;
    this.wavesCleared = 0;
    this.levelAdvancePending = false;
    this.postBossLevelIntroPending = false;
    this.levelAdvanceTimeout = null;
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

    // Initial load of ships AND Ranks
    Promise.all([
      GameAssets.loadShips(),
      RankAssets.preloadAll()
    ]).then(() => {
      // Sync rank state to prevent immediate spam if starting with score > 0 (handled in Game, but good safety)
      this._lastRankUpSeen = this.game.rankIndex;

      // Create player AFTER ships are loaded to ensure texture is ready
      if (this.player) {
        this.gameContainer.removeChild(this.player.sprite);
      }
      const spriteKey = this.game.selectedShipSpriteKey || getDefaultShipKey();
      console.log('[PlayScene] Assets ready, creating player with spriteKey=' + spriteKey);
      this.player = new Player(width / 2, height - 100, this.inputManager, this.game, spriteKey);
      this.gameContainer.addChild(this.player.sprite);
      const initialRank = Number.isFinite(this.game.rankIndex) ? this.game.rankIndex : 1;
      this.player.setRank(initialRank, 'init');

      this.applySeasonCosmetics();

      // DEBUG: Log ship selection details
      if (this.player) {
        console.log(`[ShipDebug] Build: ${BUILD_ID || 'OPTIMIZED'}`);
        console.log(`[ShipDebug] Selected: ${this.game.selectedShipSpriteKey}`);
        console.log(`[ShipDebug] Active: ${this.player.selectedShipSpriteKey}`);
        console.log(`[ShipDebug] PlayerSprite: exists=${!!this.player.sprite} alpha=${this.player.sprite?.alpha} visible=${this.player.sprite?.visible} x=${this.player.sprite?.x} y=${this.player.sprite?.y}`);
        const textureSource = this.player.shipSprite?.texture?.source;
        console.log(`[ShipDebug] Texture: ${textureSource?.resource?.url || textureSource?.label || 'loaded'}`);
      }

      const controlSmoke = new URLSearchParams(window.location.search).get('controlSmoke') === '1';
      if (controlSmoke) {
        this.introActive = false;
        this.introComplete = true;
        this.startLevel('controlSmoke');
      } else {
        // Start ship intro animation
        this.startShipIntro(spriteKey);
      }
    });

    // Create placeholder player immediately (will be replaced)
    if (!this.player) {
      const spriteKey = this.game.selectedShipSpriteKey || getDefaultShipKey();
      this.player = new Player(width / 2, height - 100, this.inputManager, this.game, spriteKey);
      this.gameContainer.addChild(this.player.sprite);
      if (this.player.setRank) {
        const initialRank = Number.isFinite(this.game.rankIndex) ? this.game.rankIndex : 1;
        this.player.setRank(initialRank, 'init_placeholder');
      }
      this.applySeasonCosmetics();
    }

    // Create enemy manager
    this.enemyManager = new EnemyManager(this.gameContainer, this.game, capHandler);
    this.game.flushAchievementToasts?.(this);

    const params = new URLSearchParams(window.location.search);
    this.initBalanceDebug(params);
    const debugToken = params.get('debugBossToken');
    if (debugToken === 'NOVA_DEBUG_2026') {
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
    if (!this._debugKeyHandler) {
      this._debugKeyHandler = (e) => this.handleDebugKeys(e);
      window.addEventListener('keydown', this._debugKeyHandler);
    }

    // Start first level - DEFERRED until intro complete
    // this.startLevel();
    this.initLoreBag();

    console.log(`PlayScene build:${BUILD_ID}`);
    this.isReady = true;
  }

  handleDebugKeys(e) {
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

    this.layoutComboDisplay();
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
    const stats = this.balanceDebug;
    if (!stats || !powerup) return;
    const key = powerup.type || 'unknown';
    stats.pickupsCollected[key] = (stats.pickupsCollected[key] || 0) + 1;
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
    if (this.game?.currentScene && this.game.currentScene !== this) {
      return;
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

    this.levelAdvancePending = false;
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
    if (this.game.level === 1) {
      this.shownStoryTransmissionIds.clear();
    }

    this.enemyManager.startLevel(this.game.level);
    if (startAtBoss) {
      this.enemyManager.forceBossStart(this.game.level);
    }
    this.showLevelIntro({ postBoss: postBossLevelIntro });
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
    this.queueStoryTransmission(postBossLevelIntro ? 3200 : 2600);
  }

  showLevelIntro({ postBoss = false } = {}) {
    const levelTexts = [
      'Sector 1: Popcorn Patrol',
      'Sector 2: Spiral Academy',
      'Sector 3: Laser Lane Union',
      'Sector 4: Bonus Stage Panic',
      'BOSS: THE FORMATION FOREMAN',
      'Sector 6: Meteor Queue',
      'Sector 7: Neon Swarm',
      'Sector 8: Hitbox Negotiations',
      'Sector 9: Cabinet Overdrive',
      'BOSS: THE QUARTER EATER'
    ];
    const introList = extendLevelIntroTexts(levelTexts, this.game.level, this.game.level % 5 === 0);
    const message = introList[(this.game.level - 1) % introList.length] || `LEVEL ${this.game.level}`;
    const compactHud = this.game.getWidth() < 620;
    const fontSize = compactHud ? (postBoss ? 21 : 25) : (postBoss ? 34 : 42);
    this.showToast(message, {
      fontSize,
      fill: '#ffff00',
      stroke: '#ff8800',
      strokeThickness: compactHud ? 2 : 3,
      duration: postBoss ? 1450 : 2000,
      type: 'level_up',
      slot: 'center',
      y: compactHud ? this.game.getHeight() * 0.25 : this.game.getHeight() * (postBoss ? 0.18 : 0.2),
      maxWidth: compactHud ? this.game.getWidth() * 0.82 : this.game.getWidth() * (postBoss ? 0.78 : 0.9)
    });
  }

  update(delta) {
    if (!Number.isFinite(delta) || delta > 100 || delta < 0) return;
    if (!this.isReady) return;

    try {
      this.updateDiagnosticsLayout();
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
      if (this.isPaused) {
        this.updatePauseMenuControls(delta);
        return;
      }

      // Mobile inputs
      if (this.touchControls && this.touchControls.active) {
        const movement = this.touchControls.getMovement();
        this.inputManager.setKeyPressed('KeyA', movement.dx < -0.3);
        this.inputManager.setKeyPressed('KeyD', movement.dx > 0.3);
        this.inputManager.setKeyPressed('KeyW', movement.dy < -0.3);
        this.inputManager.setKeyPressed('KeyS', movement.dy > 0.3);
      }

      // Player update
      if (this.game.lives > 0 && this.player) {
        // Pass touch input to player
        if (this.touchControls) {
          const touchInput = this.touchControls.getInput();
          this.player.touchInput = { moveX: touchInput.moveX, moveY: touchInput.moveY };
        }

        this.player.update(delta);
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
      }

      this.updateComboTimers(delta);
      this.updateDangerDodgeTimer(delta);
      this.updateGrazeBreakTimer();
      this.updateComboDisplay(delta);

      if (this.player?.synergyState?.type) {
        this.setSynergyBadge(this.player.synergyState.label || this.player.synergyState.type);
      } else {
        this.setSynergyBadge('');
      }


      if (this.freezeTimerMs > 0) {
        this.freezeTimerMs -= delta * 16.67;
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

      if (firePressed && this.player && !this.introActive) {
        if (this.player.canShoot()) {
          const bullets = this.player.shoot();
          this.markGrazeBreakShot(bullets);
          bullets.forEach(bullet => this.bulletManager.addPlayerBullet(bullet));

          // TASK 4: Shooting sound with health check
          this.playShootSoundWithHealthCheck();
        }
      }

      // Managers update
      const slowTimeActive = this.player?.activePowerup?.type === 'slow_time' && !this.player?.isPowerupSuppressed?.();
      const enemyBulletScale = slowTimeActive ? 0.6 : 1;
      if (this.bulletManager) this.bulletManager.update(delta, enemyBulletScale);
      if (this.enemyManager) this.enemyManager.update(delta);
      this.sampleBalanceBoss();
      this.maybeSpawnBossClutchShield();
      this.applyGameplayBackdropLevel(this.game?.level || 1);
      if (this.powerupManager) this.powerupManager.update(delta, this);
      this.updateTractorHijack(delta);
      this.updateBossHazards(delta);
      if (this.particleManager) this.particleManager.update(delta);
      if (this.screenShake) this.screenShake.update(delta);
      if (this.scorePopupManager) this.scorePopupManager.update(delta);

      // Audio Update (Sequencer)
      if (AudioManager && AudioManager.update) AudioManager.update(delta);

      // Tractor beam
      // Tractor Beam Removed

      // Adaptive Enemy Feature: Track Player Position
      this.updatePlayerMetrics(delta);

      this.checkCollisions();

      // Level progression
      if (this.enemyManager.isLevelComplete() && !this.enemyManager.spawning && !this.levelAdvancePending) {
        this.levelAdvancePending = true;

        AudioManager.playSfx('levelComplete');
        const rewardConfig = BalanceConfig.rewards || {};
        const levelClearScore = rewardConfig.levelClearScore || BalanceConfig.level.completionBonus || 1000;
        const appliedLevelClearScore = this.game.addScore(levelClearScore);
        const bossCompletion = Boolean(this.enemyManager?.bossDefeatedThisLevel);
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

        this.levelAdvanceTimeout = setTimeout(() => {
          this.levelAdvancePending = false;
          this.levelAdvanceTimeout = null;
          this.postBossLevelIntroPending = bossCompletion;
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
        }, BalanceConfig.level.sequenceDuration || 3000);
      }

      this.hud.update();
      this.updateStarfield(delta); // TASK D: Animate background stars
      this.updateAmbientBonusDrones(delta); // Handles hazard drones and collectible power cores
      this.applyMagnetPull(delta);
      this.updateOrbitalStrike(delta);
      this.updateEasterEgg(delta);
      this.updateRandomPopups(delta);
      this.checkLowLives();

      const scoreDelta = this.game.score - this.lastScoreSeen;
      if (scoreDelta > 0) {
        this.updateMetaProgress(scoreDelta, false);
        this.lastScoreSeen = this.game.score;
      }
      if (this.enemyManager?.bossDefeatedThisLevel && this.lastBossDefeatedLevel !== this.game.level) {
        this.lastBossDefeatedLevel = this.game.level;
        this.updateMetaProgress(0, true);
      }
      this.updateDevOverlay();

    } catch (e) {
      console.error('GAME LOOP CRASH:', e);
      if (this.game && this.game.app && this.game.app.ticker) {
        this.game.app.ticker.stop();
      }
      this.showErrorOverlay(e);
    }
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

  // TASK 4: Create polished rank up animation
  createRankUpAnimation(rank, rankTitle) {
    const { width, height } = this.game.app.screen;

    // Container for animation
    const container = new PIXI.Container();
    container.x = width / 2;
    container.y = height * 0.3;
    container.alpha = 0;
    container.scale.set(0.5);
    container.zIndex = 10000;
    this.uiContainer.addChild(container);

    // Background panel (enlarged for bigger portrait and lore text)
    const panel = new PIXI.Graphics();
    panel.roundRect(-220, -110, 440, 220, 10);
    panel.fill({ color: 0x000000, alpha: 0.85 });
    panel.stroke({ color: 0xffff00, width: 3 });
    container.addChild(panel);

    // Inner glow
    const glow = new PIXI.Graphics();
    glow.roundRect(-215, -105, 430, 210, 8);
    glow.stroke({ color: 0xffaa00, width: 1, alpha: 0.6 });
    container.addChild(glow);

    // Rank sprite (50% larger for better visibility)
    const rankTexture = this.game.getRankTexture ? this.game.getRankTexture(rank) : null;
    if (rankTexture) {
      const rankSprite = new PIXI.Sprite(rankTexture);
      rankSprite.anchor.set(0.5);
      rankSprite.scale.set(0.9); // Increased from 0.6 to 0.9 (50% larger)
      rankSprite.y = -35;
      container.addChild(rankSprite);
    }

    // "RANK UP!" trigger reason (clear and prominent)
    const rankUpText = createText('⬆ RANK UP! ⬆', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 26,
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4
    });
    rankUpText.anchor.set(0.5);
    rankUpText.y = rankTexture ? 30 : -30;
    container.addChild(rankUpText);

    // Rank title text
    if (rankTitle) {
      const titleText = createText(rankTitle.toUpperCase(), {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: 22,
        fill: '#00ffff',
        stroke: '#000000',
        strokeThickness: 3
      });
      titleText.anchor.set(0.5);
      titleText.y = rankTexture ? 58 : 0;
      container.addChild(titleText);
    }

    // Funny lore text from lore system
    const loreText = getAchievementPopup();
    const lore = createText(loreText, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 14,
      fill: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 380
    });
    lore.anchor.set(0.5);
    lore.y = rankTexture ? 85 : 30;
    container.addChild(lore);

    // Animation sequence: ease in, hold, ease out
    let elapsed = 0;
    const phases = {
      easeIn: 300,
      hold: 1500,
      easeOut: 500
    };
    const totalDuration = phases.easeIn + phases.hold + phases.easeOut;

    const animate = (delta) => {
      elapsed += delta.deltaTime * 16.67;

      if (elapsed < phases.easeIn) {
        // Ease in: scale up and fade in
        const t = elapsed / phases.easeIn;
        const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic
        container.alpha = eased;
        container.scale.set(0.5 + eased * 0.5);
      } else if (elapsed < phases.easeIn + phases.hold) {
        // Hold: full visibility with subtle pulse
        const pulse = Math.sin((elapsed - phases.easeIn) * 0.005) * 0.05;
        container.alpha = 1;
        container.scale.set(1 + pulse);
      } else if (elapsed < totalDuration) {
        // Ease out: fade out
        const t = (elapsed - phases.easeIn - phases.hold) / phases.easeOut;
        container.alpha = 1 - t;
      } else {
        // Cleanup
        this.game.app.ticker.remove(animate);
        if (container.parent) {
          this.uiContainer.removeChild(container);
        }
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
    AudioManager.playSfx('powerup', { force: true, volume: compact ? 0.65 : 1.0 });

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

  checkCollisions() {
    const { width, height } = this.game.app.screen;

    // Safety checks for managers
    if (!this.bulletManager || !this.enemyManager || !this.powerupManager || !this.player) return;

    // Bomb detonation check
    const screenHeight = this.game.app.screen.height;
    const detonationY = screenHeight * 0.45; // Detonate at 45% of screen height
    this.bulletManager.playerBullets.forEach(bullet => {
      if (bullet.active && bullet.isBomb && bullet.y <= detonationY) {
        // Detonate bomb
        bullet.active = false;

        // Visual explosion
        if (this.particleManager) {
          for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10;
            const distance = Math.random() * bullet.blastRadius;
            this.particleManager.createExplosion(
              bullet.x + Math.cos(angle) * distance,
              bullet.y + Math.sin(angle) * distance,
              0xff3300
            );
          }
          // Center explosion
          this.particleManager.createExplosion(bullet.x, bullet.y, 0xffff00);
        }

        // Screen shake
        if (this.screenShake) {
          this.screenShake.shake(15, 30);
        }

        // Explosion sound
        AudioManager.playSfx('explosion', { force: true, volume: 1.0 });

        // Damage all enemies in blast radius
        this.enemyManager.enemies.forEach(enemy => {
          if (enemy.active) {
            const dx = enemy.x - bullet.x;
            const dy = enemy.y - bullet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bullet.blastRadius) {
              const destroyed = enemy.takeDamage(bullet.damage);
              if (destroyed) {
                this.game.addScore(enemy.scoreValue);
                if (this.particleManager) {
                  this.particleManager.createExplosion(enemy.x, enemy.y, 0xff6600);
                }
              }
            }
          }
        });

        // Also damage hijacker if active
        if (this.enemyManager.hijacker && this.enemyManager.hijacker.active) {
          const hijacker = this.enemyManager.hijacker;
          const dx = hijacker.x - bullet.x;
          const dy = hijacker.y - bullet.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < bullet.blastRadius) {
            const destroyed = hijacker.takeDamage(bullet.damage);
            if (destroyed) {
              if (this.particleManager) {
                this.particleManager.createExplosion(hijacker.x, hijacker.y, 0xff9900);
              }
            }
          }
        }
      }
    });

    // Player bullets vs enemies
    this.bulletManager.playerBullets.forEach(bullet => {
      if (bullet.active) {
        this.enemyManager.enemies.forEach(enemy => {
          if (enemy.active && this.checkCollision(bullet, enemy)) {
            if (!bullet.piercing) bullet.active = false;
            const destroyed = enemy.takeDamage(bullet.damage);

            // Chain Lightning: Arc to nearby enemies
            this.triggerChainLightning(enemy, bullet.damage);
            this.applyShipTraitBulletImpact(bullet, enemy);

            if (destroyed) {
              // XP Logic handled by score now

              // Feature: Slow Time Trade-off
              if (!(this.player.activePowerup?.type === 'slow_time' && !this.player.isPowerupSuppressed?.())) {
                const scoreAwarded = this.getComboScore(enemy.scoreValue);
                const appliedScore = this.game.addScore(scoreAwarded);
                // Score popup with combo
                if (this.scorePopupManager) {
                  this.scorePopupManager.addScorePopup(enemy.x, enemy.y, appliedScore);
                }
              }
              this.onEnemyKilled(enemy);
              this.particleManager.createExplosion(enemy.x, enemy.y, enemy.color);
              AudioManager.playSfx('enemy_explode', { volume: 0.5 });
              this.screenShake.shake(3);

              // Powerup Drop Check (Manager handles chance & guarantees)
              this.powerupManager.spawn(enemy.x, enemy.y);
            } else {
              this.particleManager.createHitSpark(enemy.x, enemy.y);
              AudioManager.playSfx('hit', { volume: 0.4 });
            }
          }
        });
      }
    });

    // Player bullets vs hijacker
    if (this.enemyManager.hijacker && this.enemyManager.hijacker.active) {
      this.bulletManager.playerBullets.forEach(bullet => {
        if (bullet.active) {
          const hijacker = this.enemyManager.hijacker;
          if (this.checkCollision(bullet, hijacker)) {
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

    // Point Defense and Graze Break: Player bullets vs enemy bullets
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

          // Check collision between player bullet and enemy bullet
          const dx = playerBullet.x - enemyBullet.x;
          const dy = playerBullet.y - enemyBullet.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitRadius = (playerBullet.radius || 4) + (enemyBullet.radius || 6);

          if (dist < hitRadius) {
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

    // Enemy bullets vs player
    this.bulletManager.enemyBullets.forEach(bullet => {
      if (bullet.active && this.player.active) {
        const dx = bullet.x - this.player.x;
        const dy = bullet.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nearThreshold = (this.player.radius || 12) + (bullet.radius || 6) + 12;
        if (!bullet.nearMissed && dist < nearThreshold && dist > (this.player.radius || 12)) {
          bullet.nearMissed = true;
          this.applyNearMiss(bullet);
        }
        if (this.checkCollision(bullet, this.player)) {
          // Feature: Ghost Ship prevents hit
          if (this.player.isGhostActive?.()) return;

          bullet.active = false;
          if (!this.player.invulnerable) {
            const damageTaken = this.player.takeDamage();
            if (damageTaken) {
              this.recordBalanceDamage('enemy_bullet');
              this.lastHitAt = Date.now();
              this.game.loseLife();
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

    // Ambient bonus drones and collectible power cores
    this.ambientBonusDrones.forEach(bonusDrone => {
      if (bonusDrone.active && this.player.active) {
        if (this.checkCollision(bonusDrone, this.player)) {
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
                this.game.loseLife();
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

    // Player bullets vs ambient hazard drones
    this.bulletManager.playerBullets.forEach(bullet => {
      if (bullet.active) {
        this.ambientBonusDrones.forEach(bonusDrone => {
          // Only damage hazard drones, not collectible power cores.
          if (bonusDrone.active && bonusDrone.type === 'HAZARD' && this.checkCollision(bullet, bonusDrone)) {
            if (!bullet.piercing) bullet.active = false;
            const destroyed = bonusDrone.takeDamage(bullet.damage || 1);
            if (destroyed) {
              if (!(this.player.activePowerup?.type === 'slow_time' && !this.player.isPowerupSuppressed?.())) {
                this.game.addScore(this.getComboScore(500));
              }
              this.onEnemyKilled(bonusDrone);
              this.particleManager.createExplosion(bonusDrone.x, bonusDrone.y, 0xffaa00);
              AudioManager.playSfx('enemy_explode', { volume: 0.5 });
              this.showToast('BONUS DRONE DOWN!', { fontSize: 18, y: bonusDrone.y, fill: '#ffff00' });
            } else {
              this.particleManager.createHitSpark(bonusDrone.x, bonusDrone.y);
            }
          }
        });
      }
    });

    // Enemies vs player
    this.enemyManager.enemies.forEach(enemy => {
      if (enemy.active && this.player.active) {
        if (this.checkCollision(enemy, this.player)) {
          // Feature: Ghost Ship prevents hit
          if (this.player.isGhostActive?.()) return;

          const isBossContact = enemy.kind === 'boss';
          if (isBossContact) {
            if (!this.player.invulnerable) {
              const damageTaken = this.player.takeDamage();
              if (damageTaken) {
                this.recordBalanceDamage('boss_contact');
                this.lastHitAt = Date.now();
                this.game.loseLife();
                this.triggerPlayerDeathFeedback();
              } else {
                this.screenShake.shake(4);
                this.particleManager.createHitSpark(this.player.x, this.player.y);
              }
              this.particleManager.createHitSpark(this.player.x, this.player.y);
            }
            return;
          }

          enemy.active = false;
          if (!this.player.invulnerable) {
            const damageTaken = this.player.takeDamage();
            if (damageTaken) {
              this.recordBalanceDamage('enemy_contact');
              this.lastHitAt = Date.now();
              this.game.loseLife();
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

    // Powerups vs player
    this.powerupManager.powerups.forEach(powerup => {
      if (powerup.active && this.player.active) {
        if (this.checkCollision(powerup, this.player)) {
          this.recordBalancePickup(powerup);
          powerup.collect(this.player, this);
          AudioManager.playSfx('pickup');
          const pickupColor = this.player?.synergyState?.type === 'cash_vacuum' ? 0xffff00 : powerup.color;
          this.particleManager.createPickupEffect(powerup.x, powerup.y, pickupColor);
          // CRITICAL: Ensure player visibility after powerup pickup
          this.player.ensureRenderable('afterPowerupPickup');
        }
      }
    });
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
    const minDistance = (a.radius || 10) + (b.radius || 10);
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
    this.closeSettingsOverlay();
    this.shipIntroToken += 1;

    if (this.levelAdvanceTimeout) {
      clearTimeout(this.levelAdvanceTimeout);
      this.levelAdvanceTimeout = null;
    }
    if (this._debugKeyHandler) {
      window.removeEventListener('keydown', this._debugKeyHandler);
      this._debugKeyHandler = null;
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

    // Music continues to next scene
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

  showPauseOverlay() {
    this.pauseGamepadNavigator.suppressUntilReleased();
    if (this.pauseOverlay) {
      this.pauseOverlay.visible = true;
      this.setPauseFocus(this.pauseFocusedIndex || 0);
      return;
    }

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const overlay = new PIXI.Container();
    overlay.zIndex = 1000000;
    overlay.label = 'ui_pauseOverlay';

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x020713, alpha: 0.74 });
    overlay.addChild(dim);

    const panelWidth = Math.min(500, width * 0.72);
    const panelHeight = 310;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x06111f, alpha: 0.94 });
    panel.stroke({ color: 0x00ffff, width: 2, alpha: 0.9 });
    overlay.addChild(panel);

    const title = createText('PAUSED', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 42,
      fontWeight: 'bold',
      fill: '#f6fbff',
      stroke: '#003344',
      strokeThickness: 4,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, panelY + 62);
    overlay.addChild(title);

    const status = createText('ARCADE PATROL ON HOLD', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 14,
      fill: '#7ee9ff',
      align: 'center'
    });
    status.anchor.set(0.5);
    status.position.set(width / 2, panelY + 102);
    overlay.addChild(status);

    this.pauseButtons = [
      this.createPauseButton('RESUME', width / 2, panelY + 148, () => this.setPaused(false)),
      this.createPauseButton('SETTINGS', width / 2, panelY + 202, () => this.openSettingsOverlay()),
      this.createPauseButton('QUIT TO MENU', width / 2, panelY + 256, () => {
      this.closeSettingsOverlay();
      this.hidePauseOverlay();
      this.isPaused = false;
      this.game.switchScene('menu');
      })
    ];
    this.pauseButtons.forEach((button) => overlay.addChild(button));

    this.pauseOverlay = overlay;
    this.uiOverlay.addChild(overlay);
    this.setPauseFocus(0);
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

  handleLanguageChanged() {
    this.hud?.update?.();
    this.settingsOverlay?.rebuild?.();
    if (this.pauseOverlay?.parent && this.pauseOverlay.visible) {
      const focusedIndex = this.pauseFocusedIndex || 0;
      this.pauseOverlay.parent.removeChild(this.pauseOverlay);
      this.pauseOverlay.destroy({ children: true });
      this.pauseOverlay = null;
      this.pauseButtons = [];
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

  createPauseButton(label, x, y, onPress) {
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.activate = onPress;

    const width = 260;
    const height = 38;
    const draw = (hovered = false) => {
      focus.clear();
      if (button._focused) {
        focus.roundRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, 8);
        focus.stroke({ color: 0xffef7e, width: 2, alpha: 0.86 });
      }
      bg.clear();
      bg.roundRect(-width / 2, -height / 2, width, height, 6);
      bg.fill({ color: hovered ? 0x0b6f8f : 0x07334e, alpha: hovered ? 0.92 : 0.84 });
      bg.stroke({ color: hovered || button._focused ? 0xffffff : 0x00ffff, width: hovered || button._focused ? 2 : 1, alpha: 0.95 });
    };

    const focus = new PIXI.Graphics();
    const bg = new PIXI.Graphics();
    button.addChild(focus, bg);
    draw(false);
    button.redraw = draw;

    const text = createText(label, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#ffffff'
    });
    text.anchor.set(0.5);
    button.addChild(text);
    button.position.set(x, y);
    button.on('pointerover', () => {
      this.setPauseFocusByButton(button);
      draw(true);
    });
    button.on('pointerout', () => draw(false));
    button.on('pointertap', onPress);
    return button;
  }

  setPauseFocusByButton(button) {
    const index = this.pauseButtons.findIndex((candidate) => candidate === button);
    if (index >= 0) this.setPauseFocus(index);
  }

  setPauseFocus(index) {
    if (!this.pauseButtons?.length) return;
    const count = this.pauseButtons.length;
    const next = ((index % count) + count) % count;
    this.pauseButtons.forEach((button, buttonIndex) => {
      button._focused = buttonIndex === next;
      button.redraw?.(false);
    });
    this.pauseFocusedIndex = next;
  }

  movePauseFocus(delta) {
    this.setPauseFocus(this.pauseFocusedIndex + delta);
    AudioManager.playSfx('thrusterFire', { volume: 0.07, minIntervalMs: 90 });
  }

  updatePauseMenuControls(delta) {
    if (this.settingsOverlay) {
      this.settingsOverlay.update?.(delta);
      return;
    }
    const nav = this.pauseGamepadNavigator.update();
    if (!nav.connected || !nav.active) return;
    if (nav.pressed.up) this.movePauseFocus(-1);
    if (nav.pressed.down) this.movePauseFocus(1);
    if (nav.pressed.confirm) {
      this.pauseButtons[this.pauseFocusedIndex]?.activate?.();
    }
    if (nav.pressed.cancel || nav.pressed.back) {
      this.setPaused(false);
    }
  }

  hidePauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.visible = false;
    }
  }

  resetRandomTimers() {
    this.achievementTimer = 0;
    this.tauntTimer = 0;
    this.storyTransmissionTimer = this.getRandomTimer(18000, 26000);
  }

  updateRandomPopups(delta) {
    if (this.storyTransmissionTimer > 0) {
      this.storyTransmissionTimer -= delta * 16.67;
      return;
    }

    const shown = this.showStoryTransmission();
    this.storyTransmissionTimer = shown ? this.getRandomTimer(16000, 24000) : this.getRandomTimer(3500, 6500);
  }

  queueStoryTransmission(delayMs = 2600) {
    const transmission = getStoryTransmission(this.game.level);
    if (!transmission?.id || this.shownStoryTransmissionIds.has(transmission.id)) return;
    this.storyTransmissionTimer = Math.max(500, delayMs);
  }

  showStoryTransmission({ force = false } = {}) {
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

  checkLowLives() {
    if (this.game.lives <= 1 && this.lowLivesShownFor !== this.game.lives) {
      this.lowLivesShownFor = this.game.lives;
      this.showToast(getMicroMessage('lowHealth'), { fontSize: 22, y: this.game.getHeight() * 0.3 });
      AudioManager.playVoice('mission_control_life_low', { cooldownMs: 18000, duckMs: 1800 });
    }
  }

  triggerPlayerDeathFeedback() {
    if (!this.player) return;

    // 1. Freeze Frame (150-200ms)
    this.freezeTimerMs = 180;

    // 2. Heavy Screenshake
    if (this.screenShake) this.screenShake.shake(25);

    // 3. Fullscreen Red Flash
    const flash = new PIXI.Graphics();
    flash.rect(0, 0, this.game.getWidth(), this.game.getHeight()).fill({ color: 0xff0000, alpha: 0.5 });
    this.uiOverlay.addChild(flash);

    let frames = 0;
    const fadeTicker = (ticker) => {
      if (!flash.parent) {
        this.game.app.ticker.remove(fadeTicker);
        return;
      }
      flash.alpha -= 0.05 * ticker.deltaTime;
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
      this.particleManager.createExplosion(this.player.x, this.player.y, 0x00ffff);
      // Cascading smaller ones
      for (let i = 1; i <= 3; i++) {
        const id = setTimeout(() => {
          if (this.particleManager && this.player) {
            this.particleManager.createExplosion(
              this.player.x + (Math.random() - 0.5) * 50,
              this.player.y + (Math.random() - 0.5) * 50,
              0xffaa00
            );
          }
        }, i * 80);
        if (!this._deathTimeouts) this._deathTimeouts = [];
        this._deathTimeouts.push(id);
      }
    }

    // 5. Audio
    AudioManager.playSfx('explosionCrunch', { force: true, volume: 1.0 });
  }

  onLifeLost() {
    this.recordBalanceLifeLost();
    this.player?.clearStatusEffects?.('life_lost');
    if (this.tryLastStandRepair()) return;
    if (this.game.lives <= 0) {
      this.flushBalanceDebugSummary('game_over');
    }

    this.showToast(getMicroMessage('lifeLost'), { fontSize: 22, y: this.game.getHeight() * 0.32 });

    // RESPONDER LOGIC
    if (this.player && this.game.lives > 0) {
      this.player.forceRespawn(this.game.getWidth(), this.game.getHeight());
      this.player.invulnerableTime = RESPAWN_INVULNERABILITY_MS;
      this.recordBalanceRespawn();
      const clearedHazards = this.clearRespawnHazards('life_lost');
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

  tryLastStandRepair() {
    if (BalanceConfig.survival?.lastStandRepairEnabled !== true) return false;
    if (!this.player || this.game.lives > 0) return false;
    const now = Date.now();
    if (now < this.lastStandReadyAt) return false;

    this.lastStandReadyAt = now + 35000;
    this.game.lives = 2;
    this.lowLivesShownFor = null;
    this.player.forceRespawn(this.game.getWidth(), this.game.getHeight());
    this.player.invulnerableTime = RESPAWN_INVULNERABILITY_MS;
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
    if (!achievement?.name) return;
    this.showToast(`ACHIEVEMENT UNLOCKED\n${achievement.name}`, {
      fontSize: 20,
      fill: '#fff3a2',
      y: this.game.getHeight() * 0.16,
      duration: 3200,
      slot: 'top',
      type: 'achievement',
      priority: 2,
      notBefore: Date.now() + 650
    });
  }

  applyLifeRepair(targetLives = 3, invulnerabilityMs = 3000) {
    const before = Number.isFinite(this.game?.lives) ? this.game.lives : 0;
    if (before <= 0) return 0;
    const target = Math.max(before, Math.min(5, Math.round(targetLives)));
    if (target <= before) return 0;

    this.game.lives = target;
    this.lowLivesShownFor = null;

    if (this.player) {
      this.player.invulnerable = true;
      this.player.invulnerableTime = Math.max(this.player.invulnerableTime || 0, invulnerabilityMs);
    }

    AudioManager.playSfx('powerup', { force: true, volume: 0.72, minIntervalMs: 250 });
    return target - before;
  }

  applyBossClearRecovery(level = this.game?.level || 1) {
    const rewardConfig = BalanceConfig.rewards || {};
    const repairLives = Math.max(0, Number(rewardConfig.bossClearRepairLives) || 0);
    const maxLives = Math.max(1, Number(rewardConfig.bossClearRepairMaxLives) || 5);
    const levelKey = Number(level) || Number(this.game?.level) || 1;
    if (repairLives <= 0 || this.bossClearRecoveryLevels.has(levelKey)) return 0;

    this.bossClearRecoveryLevels.add(levelKey);
    const before = Number.isFinite(this.game?.lives) ? this.game.lives : 0;
    if (before <= 0 || before >= maxLives) return 0;

    const targetLives = Math.min(maxLives, before + repairLives);
    return this.applyLifeRepair(
      targetLives,
      rewardConfig.bossClearRepairInvulnerabilityMs || RESPAWN_INVULNERABILITY_MS
    );
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
      enemy.active = false;
      enemy.destroy?.();
      if (enemy.sprite?.parent) enemy.sprite.parent.removeChild(enemy.sprite);
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
      const spread = isLance
        ? 0.12
        : isFan
          ? (type === 'mirror' ? 0.34 : type === 'cone' ? 0.48 : 0.36)
          : 0.15;
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

  updateBossHazards() {
    const layer = this.bossHazardLayer;
    if (!layer) return;
    layer.clear();
    if (!Array.isArray(this.bossHazards) || this.bossHazards.length === 0) return;

    const now = Date.now();
    this.bossHazards = this.bossHazards.filter((hazard) => {
      const progress = Math.max(0, Math.min(1, (now - hazard.startedAt) / hazard.durationMs));
      if (progress >= 1) return false;
      this.drawBossHazard(hazard, progress);
      const armed = (now - hazard.startedAt) >= (hazard.armingMs || 0);
      if (armed && !hazard.hit && this.isPlayerInsideBossHazard(hazard)) {
        hazard.hit = true;
        this.damagePlayerFromBossHazard(hazard);
      }
      return true;
    });
  }

  drawBossHazard(hazard, progress) {
    const layer = this.bossHazardLayer;
    if (!layer) return;
    const now = Date.now();
    const alpha = Math.max(0, Math.sin((1 - progress) * Math.PI)) * 0.82;
    const pulse = 1 + Math.sin(now * 0.05) * 0.08;
    const shimmer = 0.5 + Math.sin(now * 0.07) * 0.5;
    const color = hazard.color || 0xfff45c;
    const hotColor = hazard.kind === 'beam'
      ? 0x9cfff7
      : hazard.kind === 'ring' || hazard.kind === 'wall'
        ? 0xffe066
        : 0xffffff;

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
      layer.moveTo(hazard.sourceX, hazard.sourceY);
      layer.lineTo(
        hazard.sourceX + Math.cos(coreA) * hazard.length,
        hazard.sourceY + Math.sin(coreA) * hazard.length
      );
      layer.stroke({ color: hotColor, width: 2.2 + shimmer * 2, alpha: 0.78 * alpha });
      const px = -Math.sin(coreA);
      const py = Math.cos(coreA);
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

    layer.circle(hazard.sourceX, hazard.sourceY, hazard.kind === 'beam' ? 14 + shimmer * 5 : 11 + shimmer * 4);
    layer.fill({ color, alpha: 0.24 * alpha });
    layer.circle(hazard.sourceX, hazard.sourceY, hazard.kind === 'beam' ? 6 + shimmer * 3 : 5 + shimmer * 2);
    layer.fill({ color: 0xffffff, alpha: 0.32 * alpha });
  }

  isPlayerInsideBossHazard(hazard) {
    if (!this.player?.active) return false;
    if (this.player.isGhostActive?.()) return false;
    if (this.player.invulnerable) return false;

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
    if (!this.player || this.player.invulnerable) return false;
    const damageTaken = this.player.takeDamage();
    this.lastBossHazardHit = {
      type: hazard.type,
      kind: hazard.kind,
      category: hazard.category,
      at: Date.now(),
      playerX: Math.round(this.player.x),
      playerY: Math.round(this.player.y)
    };

    if (damageTaken) {
      this.recordBalanceDamage(`boss_hazard:${hazard.category || 'unknown'}:${hazard.type || hazard.kind || 'unknown'}`);
      this.lastHitAt = Date.now();
      this.game.loseLife();
      this.triggerPlayerDeathFeedback();
      this.screenShake?.shake(7, 18);
      AudioManager.playSfx('boss_hazard_impact', { volume: 0.62, minIntervalMs: 180 });
    } else {
      this.screenShake?.shake(4, 12);
      this.particleManager?.createHitSpark(this.player.x, this.player.y, hazard.color || 0xfff45c);
      AudioManager.playSfx('boss_hazard_impact', { volume: 0.34, minIntervalMs: 180 });
    }

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
      if (enemy.sprite?.parent) enemy.sprite.parent.removeChild(enemy.sprite);
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

  enqueueToast(message, options = {}) {
    if (!message) return;
    const slot = options.slot || 'center';
    const type = options.type || 'generic';
    const priorityMap = {
      boss: 4,
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
    const bypassFocusLock = options.bypassFocusLock === true || priority > 3;
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

  processToastQueue() {
    const now = Date.now();
    const centerReady = !this.activeCenterToast && now >= this.getToastSlotLockUntil('center')
      ? this.peekReadyToast(this.toastQueue, now)
      : null;
    const topReady = !this.activeTopToast && now >= this.getToastSlotLockUntil('top')
      ? this.peekReadyToast(this.toastTopQueue, now)
      : null;
    if (centerReady && topReady && this.isTransitionToastEntry(centerReady) && this.isTransitionToastEntry(topReady)) {
      if ((centerReady.priority || 0) >= (topReady.priority || 0)) {
        this.delayReadyToast(this.toastTopQueue, topReady, 600, now);
      } else {
        this.delayReadyToast(this.toastQueue, centerReady, 600, now);
      }
    }
    if (!this.activeCenterToast && now >= this.getToastSlotLockUntil('center') && this.toastQueue.length > 0) {
      const entry = this.dequeueReadyToast(this.toastQueue, now);
      if (entry) this.activeCenterToast = this.showToastNow(entry.message, entry.options, 'center');
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
    return type === 'level_clear' || type === 'level_up' || type === 'boss' || entry?.options?.transition === true;
  }

  delayReadyToast(queue, entry, delayMs, now = Date.now()) {
    if (!entry) return;
    entry.notBefore = now + Math.max(0, Number(delayMs) || 0);
    entry.options = { ...entry.options, notBefore: entry.notBefore };
    queue.sort((a, b) => b.priority - a.priority || (a.notBefore || 0) - (b.notBefore || 0) || a.createdAt - b.createdAt);
  }

  describeToastDisplay(display) {
    const meta = display?.__toastMeta;
    if (!meta) return null;
    return {
      slot: meta.slot,
      type: meta.type,
      message: meta.message,
      title: meta.title || null,
      imageAlias: meta.imageAlias || null,
      duration: meta.duration,
      ageMs: Math.max(0, Date.now() - meta.createdAt)
    };
  }

  getToastDebugState() {
    return {
      active: [
        this.describeToastDisplay(this.activeCenterToast),
        this.describeToastDisplay(this.activeTopToast),
        this.describeToastDisplay(this.activeCornerToast)
      ].filter(Boolean),
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
    const duration = 2500 + Math.random() * 1000;
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
      align: compactHud ? 'center' : 'right',
      y,
      maxWidth: compactHud
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
    const requestedY = options.y || (slot === 'corner' ? height * 0.12 : slot === 'top' ? height * 0.18 : height * 0.2);
    const y = slot === 'corner'
      ? Math.min(height - 80, Math.max(requestedY, 156))
      : requestedY;

    let display = null;
    if (options.banner) {
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
      const maxTextHeight = 80;

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
      panel.fill({ color: options.type === 'lore' ? 0x05121c : 0x111111, alpha: options.type === 'lore' ? 0.78 : 0.88 });
      panel.stroke({
        color: options.type === 'lore' ? 0x6fe7ff : 0xffff00,
        width: options.type === 'lore' ? 1.5 : 3,
        alpha: options.type === 'lore' ? 0.78 : 1
      });

      const accent = new PIXI.Graphics();
      accent.roundRect(-panelWidth / 2 + 6, -panelHeight / 2 + 6, panelWidth - 12, panelHeight - 12, 10);
      accent.stroke({ color: 0xff66cc, width: 1, alpha: 0.7 });

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
          fill: options.type === 'lore' ? '#7ee9ff' : '#ffff00',
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

  createComboDisplay() {
    if (!this.comboDisplay) {
      this.comboDisplay = createText('', {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: 26,
        fill: '#00ffff',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
      });
      this.comboDisplay.anchor.set(0.5);
      this.comboDisplay.visible = false;
      this.uiOverlay.addChild(this.comboDisplay);
    }
    this.layoutComboDisplay();
  }

  layoutComboDisplay() {
    if (!this.comboDisplay) return;
    const { width, height } = this.game.app.screen;
    this.comboDisplay.x = width / 2;
    this.comboDisplay.y = height * 0.24;
  }

  updateComboDisplay(delta) {
    if (!this.comboDisplay) return;
    if (this.comboCount <= 0) {
      this.comboDisplay.visible = false;
      return;
    }
    this.comboDisplay.visible = true;
    this.comboDisplay.text = `COMBO x${this.comboMultiplier}  (${this.comboCount})`;
    const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.06;
    this.comboDisplay.scale.set(pulse);
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

  onEnemyKilled(enemy) {
    const now = Date.now();
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
    this.lastKillAt = now;
    this.comboTimerMs = this.comboWindowMs;
    this.maybeDropFirstRunPickup(enemy);

    // Check for milestone bonuses (5x, 10x, 15x, 20x)
    for (const milestone of COMBO_MILESTONES) {
      if (this.comboCount === milestone.threshold && !this.comboMilestonesReached.has(milestone.threshold)) {
        this.comboMilestonesReached.add(milestone.threshold);
        const appliedBonus = this.game.addScore(milestone.bonus);
        this.enqueueToast(`${milestone.label} +${appliedBonus}`, {
          fontSize: 26,
          fill: '#ffaa00',
          slot: 'center',
          type: 'milestone',
          duration: 1800
        });
        AudioManager.playSfx('combo_breakout', { force: true, volume: 0.95 });
        if (this.particleManager && this.player) {
          this.particleManager.createExplosion(this.player.x, this.player.y - 40, 0xffaa00);
        }
        if (this.screenShake) {
          this.screenShake.shake(6, 15); // Medium shake: 6 intensity, 15 duration
        }
      }
    }

    const prevMultiplier = this.comboMultiplier;
    if (this.comboCount >= 50) this.comboMultiplier = 4;
    else if (this.comboCount >= 25) this.comboMultiplier = 3;
    else if (this.comboCount >= 10) this.comboMultiplier = 2;
    else this.comboMultiplier = 1;

    if (this.comboMultiplier !== prevMultiplier) {
      const label = this.comboMultiplier >= 4 ? 'COMBO 50!' : this.comboMultiplier >= 3 ? 'COMBO 25!' : 'COMBO 10!';
      this.enqueueToast(label, { fontSize: 24, fill: '#00ffff', slot: 'top', type: 'combo' });
      AudioManager.playSfx('combo_breakout', { force: true, volume: 0.82 });
      if (this.particleManager && this.player) {
        this.particleManager.createExplosion(this.player.x, this.player.y, 0x00ffff);
      }
    }

    if (this.comboCount > 0 && this.comboCount % 10 === 0) {
      const bonus = this.getComboScore(100 * (this.comboCount / 10));
      const appliedBonus = this.game.addScore(bonus);
      this.enqueueToast(`COMBO BONUS +${appliedBonus}`, { fontSize: 18, fill: '#ffff00', slot: 'top', type: 'combo', duration: 1200 });
      AudioManager.playSfx('combo_tick', { force: true, volume: 0.8 });
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
    }
  }

  armGrazeBreak() {
    const now = Date.now();
    if (this.grazeBreakReady || now < this.grazeBreakCooldownAt) return false;

    this.grazeBreakReady = true;
    this.grazeBreakArmedAt = now;
    this.grazeBreakExpiresAt = now + 6500;
    this.grazeBreakCooldownAt = now + 2400;
    this.showToast('GRAZE BREAK ARMED', {
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
      return null;
    }

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
        const scoreAwarded = this.getComboScore(enemy.scoreValue);
        const appliedScore = this.game.addScore(scoreAwarded);
        this.scorePopupManager?.addScorePopup(enemy.x, enemy.y, appliedScore);
        this.onEnemyKilled(enemy);
        this.particleManager?.createExplosion(enemy.x, enemy.y, 0xff66ff, 0.72);
      }
    }

    const comboMult = Math.max(1, this.comboMultiplier || 1);
    const bonusScore = Math.round((520 + cleared.length * 85 + enemiesHit * 160 + enemiesDestroyed * 220) * comboMult);
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
    const comboMult = Math.max(1, this.comboMultiplier);
    const traitMult = Number(this.player?.traitCombat?.nearMissScoreMult || 1);
    const streakBonus = Math.min(100, 25 + this.dangerDodgeCount * 15);
    const score = Math.round(streakBonus * comboMult * (Number.isFinite(traitMult) ? traitMult : 1));
    const appliedScore = this.game.addScore(score);
    this.lastDangerDodgeScore = appliedScore;
    const label = this.dangerDodgeCount >= 2
      ? `DANGER DODGE x${this.dangerDodgeCount} +${appliedScore}`
      : `CLOSE DODGE +${appliedScore}`;
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
        color: this.dangerDodgeCount >= 3 ? 0xff66ff : 0xffcc00
      });
    }
    if (this.dangerDodgeCount >= 3) {
      AudioManager.playSfx('combo_tick', { volume: 0.56 });
      this.armGrazeBreak();
    }
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
          const scoreAwarded = this.getComboScore(enemy.scoreValue);
          const appliedScore = this.game.addScore(scoreAwarded);
          if (this.scorePopupManager) this.scorePopupManager.addScorePopup(enemy.x, enemy.y, appliedScore);
          this.onEnemyKilled(enemy);
          this.particleManager?.createExplosion(enemy.x, enemy.y, accent);
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
    }
  }

  getComboScore(points) {
    const base = Number(points) || 0;
    return Math.round(base * Math.max(1, this.comboMultiplier));
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
        if (!(this.player.activePowerup?.type === 'slow_time' && !this.player.isPowerupSuppressed?.())) {
          const scoreAwarded = this.getComboScore(nearest.scoreValue);
          const appliedScore = this.game.addScore(scoreAwarded);
          if (this.scorePopupManager) {
            this.scorePopupManager.addScorePopup(nearest.x, nearest.y, appliedScore);
          }
        }
        this.onEnemyKilled(nearest);
        this.particleManager.createExplosion(nearest.x, nearest.y, nearest.color);
        AudioManager.playSfx('enemy_explode', { volume: 0.4 });
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
    if (this.comboDisplay) {
      const colors = [0x00ffff, 0xffcc00, 0x66ff66];
      this.comboDisplay.style.fill = colors[style] || 0x00ffff;
    }
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
    try {
      localStorage.setItem('burt_season_xp', String(this.seasonXp));
      localStorage.setItem('burt_season_unlocks', JSON.stringify(this.seasonUnlocks));
    } catch { }
  }

  showUnlockToast(text) {
    this.enqueueToast(text, { fontSize: 22, fill: '#ffcc00', slot: 'top', type: 'unlock', duration: 1400 });
    AudioManager.playSfx('pickup', { force: true, volume: 0.8 });
  }

  updateDevOverlay() {
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

    this.ambientBonusDrones = this.ambientBonusDrones.filter(bonusDrone => {
      // Check if manually removed or destroyed
      if (!bonusDrone.active) {
        if (bonusDrone.sprite && bonusDrone.sprite.parent) bonusDrone.sprite.parent.removeChild(bonusDrone.sprite);
        if (bonusDrone.type === 'POWERUP' && !bonusDrone.active) this.hasActiveBonusCore = false;
        return false;
      }

      bonusDrone.update(delta, hazardCount); // Pass hazard count for wave easing
      return true;
    });
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

    // Decrement charges
    this.player.orbitalStrikeCharges--;

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
    const pulseInterval = this.game.app.ticker.add(() => {
      pulseTime += 16.67;
      const pulse = Math.sin(pulseTime * 0.01) * 0.5 + 0.5;
      warning.alpha = 0.5 + pulse * 0.5;
      warning.scale.set(0.8 + pulse * 0.2);
    });

    // Fire strike after delay
    setTimeout(() => {
      this.game.app.ticker.remove(pulseInterval);
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

      this.enemyManager.enemies.forEach(enemy => {
        if (!enemy.active) return;
        const dist = Math.hypot(enemy.x - targetX, enemy.y - targetY);
        if (dist < damageRadius) {
          const destroyed = enemy.takeDamage(damage);
          if (destroyed) {
            if (!(this.player.activePowerup?.type === 'slow_time' && !this.player.isPowerupSuppressed?.())) {
              const scoreAwarded = this.getComboScore(enemy.scoreValue);
              const appliedScore = this.game.addScore(scoreAwarded);
              if (this.scorePopupManager) {
                this.scorePopupManager.addScorePopup(enemy.x, enemy.y, appliedScore);
              }
            }
            this.onEnemyKilled(enemy);
            this.particleManager.createExplosion(enemy.x, enemy.y, enemy.color);
            AudioManager.playSfx('enemy_explode', { volume: 0.4 });
          }
        }
      });

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

  updateEasterEgg(delta) {
    if (this.legendaryFlyby) {
      if (this.legendaryFlyby.sprite?.parent) {
        this.legendaryFlyby.sprite.parent.removeChild(this.legendaryFlyby.sprite);
      }
      this.legendaryFlyby = null;
    }
  }

  spawnEasterEgg() {
    return this.showStoryTransmission({ force: true });
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
      case 'boss_phase2':
      case 'boss_half':
        return this.safeGetEnemyTaunt();
      default:
        return getMicroMessage('bossIntro');
    }
  }

  showBossTaunt(reason = 'boss_spawn') {
    const caption = this.getBossTauntCaption(reason);
    if (!caption) return;

    if (reason !== 'boss_spawn' && this.enemyManager?.state === 'BOSS_ACTIVE') {
      this.showBossCombatNotice(reason, caption);
      return;
    }

    const tex = this.bossDossierTexture;

    // Generated threat dossier only. No legacy portrait lookup is used.
    const detailLabel = reason === 'boss_life_lost'
      ? 'ARMOR BREACH'
      : reason === 'boss_phase2' || reason === 'boss_half'
        ? 'PATTERN SHIFT'
        : 'NEON RADAR LOCK';
    const characterData = { subtitle: 'THREAT DOSSIER', detail: detailLabel };

    const poster = new PIXI.Container();
    poster.label = 'ui_boss_dossier';
    poster.eventMode = 'none';
    poster.interactive = false;

    const bg = new PIXI.Graphics();
    bg.roundRect(-170, -205, 340, 410, 10);
    bg.fill({ color: 0x06101a, alpha: 0.94 });
    bg.stroke({ color: 0xff3030, width: 3, alpha: 0.9 });
    bg.roundRect(-158, -193, 316, 386, 7);
    bg.stroke({ color: 0x2ff6ff, width: 1, alpha: 0.45 });
    poster.addChild(bg);

    if (GameAssets.isValidTexture(tex)) {
      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.y = -20;
      sprite.width = 270;
      sprite.height = 270;
      sprite.alpha = 0.96;
      poster.addChild(sprite);
    } else {
      const fallback = new PIXI.Graphics();
      fallback.circle(0, -28, 118);
      fallback.stroke({ color: 0xff3030, width: 3, alpha: 0.8 });
      fallback.moveTo(-110, -28);
      fallback.lineTo(110, -28);
      fallback.moveTo(0, -138);
      fallback.lineTo(0, 82);
      fallback.stroke({ color: 0x2ff6ff, width: 2, alpha: 0.7 });
      poster.addChild(fallback);
    }

    const scanOverlay = new PIXI.Graphics();
    scanOverlay.roundRect(-136, -150, 272, 270, 7);
    scanOverlay.stroke({ color: 0xff3030, width: 2, alpha: 0.72 });
    scanOverlay.moveTo(-120, -18);
    scanOverlay.lineTo(120, -18);
    scanOverlay.moveTo(0, -138);
    scanOverlay.lineTo(0, 88);
    scanOverlay.stroke({ color: 0x2ff6ff, width: 1, alpha: 0.55 });
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
      fontSize: 18,
      fill: '#ff4040',
      fontWeight: 'bold'
    });
    topText.anchor.set(0.5);
    topText.y = -178;
    poster.addChild(topText);

    const subText = createText(characterData.subtitle, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 12,
      fill: '#2ff6ff',
      fontWeight: 'bold'
    });
    subText.anchor.set(0.5);
    subText.y = -154;
    poster.addChild(subText);

    // Additional detail text for context
    const detailText = createText(characterData.detail, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 11,
      fill: '#d8fbff',
      fontWeight: 'bold'
    });
    detailText.anchor.set(0.5);
    detailText.y = 132;
    poster.addChild(detailText);

    const bottomText = createText(caption, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 15,
      fill: '#ffffff',
      fontWeight: 'bold',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 286
    });
    bottomText.anchor.set(0.5);
    bottomText.y = 166;
    poster.addChild(bottomText);

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    poster.x = Math.min(260, Math.max(190, width * 0.18));
    poster.y = Math.min(height - 205, Math.max(360, height * 0.52));
    poster.rotation = -0.025;

    this.uiOverlay.addChild(poster);
    console.log('[UI] boss dossier shown uiOnly=true');

    const baseScale = 0.68;
    const popScale = 0.74;
    poster.scale.set(baseScale);
    let elapsed = 0;
    const fadeDelay = 1500; // Display longer for readability
    const fadeDuration = 600;
    const animate = (delta) => {
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
      }
    };
    this.game.app.ticker.add(animate);
    AudioManager.play('menuSelect');
  }

  showBossCombatNotice(reason, caption) {
    const compactHud = this.game.getWidth() < 620;
    const label = reason === 'boss_life_lost'
      ? 'HIT TAKEN'
      : reason === 'boss_half'
        ? 'BOSS WEAKENING'
        : 'PATTERN SHIFT';
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

  showBossIntro(name, taunt) {
    const { width, height } = this.game.app.screen;
    const card = new PIXI.Container();
    card.x = width / 2;
    card.y = height * 0.28;
    card.alpha = 0;

    const panel = new PIXI.Graphics();
    panel.roundRect(-220, -70, 440, 140, 12);
    panel.fill({ color: 0x111111, alpha: 0.9 });
    panel.stroke({ color: 0xff3300, width: 3 });
    card.addChild(panel);

    const title = createText(name || 'BOSS', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 26,
      fill: '#ff3300',
      stroke: '#000000',
      strokeThickness: 4
    });
    title.anchor.set(0.5);
    title.y = -18;
    card.addChild(title);

    const line = createText(taunt || 'LET\'S GO!', {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 18,
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    line.anchor.set(0.5);
    line.y = 22;
    card.addChild(line);

    this.uiOverlay.addChild(card);
    this.freezeTimerMs = 250;
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

  onBossPhaseChange(phase, boss) {
    this.recordBalanceBossPhase(phase, boss);
    const label = phase === 2 ? 'BOSS PHASE 2' : 'BOSS PHASE 3';
    this.enqueueToast(label, { fontSize: 22, fill: '#ff3300', slot: 'top', type: 'boss' });
    this.triggerShockwave(boss.x, boss.y, phase === 2 ? 0xffaa00 : 0xff3300);
    AudioManager.playSfx('boss_phase_surge', { force: true, volume: 1.0 });
  }

  showWantedPoster() {
    this.showBossTaunt('boss_spawn');
  }

  showBossCelebration({ level = this.game.level, type = 'UNKNOWN' } = {}) {
    if (!this.uiOverlay) return;
    this.recordBalanceBossEnd();
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

    if (this.screenShake) this.screenShake.shake(12);
    if (this.particleManager) {
      const boss = this.enemyManager?.boss;
      const bossX = Number.isFinite(boss?.x) ? boss.x : this.game.getWidth() * 0.5;
      const bossY = Number.isFinite(boss?.y) ? boss.y : this.game.getHeight() * 0.26;
      const bossColor = boss?.profile?.accent || boss?.color || 0xffff33;
      if (!boss?.defeatPresentationAt) {
        this.particleManager.createBossExplosion(bossX, bossY, bossColor);
        this.triggerShockwave(bossX, bossY, bossColor);
      }
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 + Math.random() * 0.25;
        const spreadX = this.game.getWidth() * (0.08 + Math.random() * 0.16);
        const spreadY = this.game.getHeight() * (0.04 + Math.random() * 0.1);
        const x = Math.max(40, Math.min(this.game.getWidth() - 40, bossX + Math.cos(a) * spreadX));
        const y = Math.max(70, Math.min(this.game.getHeight() * 0.56, bossY + Math.sin(a) * spreadY));
        this.particleManager.createExplosion(x, y, 0xffff33, 0.75);
      }
    }

    AudioManager.playSfx('boss_explode', { force: true, volume: 1.0 });
    AudioManager.playMusicContext('victory', { resetPlaylist: true });
    if (type === 'BONUS_CORE') AudioManager.playSfx('pickup', { force: true, volume: 0.9 });
    else if (type === 'ICON_192') AudioManager.playSfx('ui_open', { force: true, volume: 0.8 });
    else AudioManager.playSfx('powerup', { force: true, volume: 0.8 });
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
      this.startLevel('introComplete');
    }

    console.log('[PlayScene] Ship intro complete, gameplay enabled');
  }
}
