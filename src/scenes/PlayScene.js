import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { RankAssets } from '../utils/RankAssets.js';
import { BeerAsset } from '../utils/BeerAsset.js';
import { Player } from '../entities/Player.js';
import { BeerCan } from '../entities/BeerCan.js';
import { BalanceConfig } from '../config/BalanceConfig.js';
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
import { BUILD_ID } from '../buildInfo.js';
import {
  extendLevelIntroTexts,
  getAchievementPopup,
  getEnemyTaunt,
  getMicroMessage,
  getAllNewPhrases
} from '../text/phrasePool.js';
import { getShipMetadata } from '../config/ShipMetadata.js';
import { propertyTracer } from '../utils/PropertyWriteTracer.js';
import { crashCapture } from '../utils/CrashCapture.js';
import { tickerSpy } from '../utils/TickerSpy.js';



// DEBUG: Runtime flags for flicker isolation
export const FLICKER_FLAGS = {
  disableScreenShake: false,
  disableOverlays: false,
  disableToasts: false,
  disableLorePortrait: false,
  disablePostProcessing: false,
  disableRankUps: false,
  traceEnabled: true
};
if (typeof window !== 'undefined') window.__flickerFlags = FLICKER_FLAGS;

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
    this.lowLivesShownFor = null;
    this.ambientBeerTimer = 0;
    this.easterEggTimer = 0;
    this.ambientBeers = []; // Lists for update
    this.easterEggBeer = null;
    this.isReady = false;

    // Voice throttle
    this.lastRankVoiceTime = 0;

    // Score Boost State
    this.scoreMultiplier = 1;
    this.scoreBoostTimer = 0;

    // White Can State
    this.lastWhiteCanTime = 0;
    this.hasActiveWhiteCan = false;

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

    // Ship intro state
    this.introActive = false;
    this.introComplete = false;
    this.introOverlay = null;
    this.introStartTime = 0;
    this.activeTopToast = null;
    this.activeCornerToast = null;
    this.centerToastLockUntil = 0;
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
    this.comboWindowMs = 3200;
    this.killStreak = 0;
    this.lastKillAt = 0;
    this.lastHitAt = 0;
    this.nearMissCooldownAt = 0;

    // Synergy + Meta
    this.synergyBadge = null;
    this.comboDisplay = null;
    this.devOverlay = null;
    this.seasonXp = 0;
    this.seasonLevel = 0;
    this.seasonUnlocks = {};
    this.lastScoreSeen = 0;
    this.lastBossDefeatedLevel = 0;
    this.lastBossDefeatedLevel = 0;
    this.freezeTimerMs = 0;

    // TASK: Fix duplicate wave start
    this._lastStartedLevel = -1;
    this._deathTimeouts = [];
    this._activeTickers = [];
    this._introAnimationFrame = null; // Track intro animation
  }

  init() {
    this.isReady = false;
    this.gameContainer.removeChildren();
    this.uiContainer.removeChildren();
    this.uiOverlay.removeChildren();
    this.uiContainer.sortableChildren = true;
    this.uiOverlay.sortableChildren = true;

    // TASK D: Create procedural starfield background
    this.createStarfield();

    // DEBUG: Instrument Containers for Flicker Trace
    if (this.game && this.game.app && this.game.app.stage) {
      propertyTracer.track(this.game.app.stage, 'app.stage');
    }
    propertyTracer.track(this.container, 'rootContext');
    propertyTracer.track(this.gameContainer, 'gameContainer');
    propertyTracer.track(this.uiOverlay, 'uiOverlay');
    propertyTracer.track(this.uiContainer, 'uiContainer');

    // FORENSICS: Enable Ticker Spy
    if (this.game && this.game.app) {
      tickerSpy.enable(this.game.app);
    }

    // --- Hud & UI ---
    this.hud = new HUD(this.uiContainer, this.game);
    // Note: HUD creates itself in constructor
    this.initMetaProgress();
    this.createComboDisplay();
    this.createSynergyBadge();

    // TASK C: Debug diagnostics removed from gameplay screen
    // const diagStyle = {
    //   fontFamily: 'Courier New',
    //   fontSize: 12,
    //   fill: '#66fffe',
    //   align: 'left'
    // };
    // this.playerDiagText = new PIXI.Text('', diagStyle);
    // this.playerDiagText.anchor.set(0, 1);
    // this.playerDiagText.zIndex = 9999;
    // this.uiContainer.addChild(this.playerDiagText);

    // this.rankDiagText = new PIXI.Text('', diagStyle);
    // this.rankDiagText.anchor.set(0, 1);
    // this.rankDiagText.zIndex = 9999;
    // this.uiContainer.addChild(this.rankDiagText);

    // this.buildStamp = new PIXI.Text(`build: ${BUILD_ID}`, {
    //   ...diagStyle,
    //   align: 'right'
    // });
    // this.buildStamp.anchor.set(1, 1);
    // this.buildStamp.zIndex = 9999;
    // this.uiContainer.addChild(this.buildStamp);

    // this.updateDiagnosticsLayout();

    // Internal Debug Stats
    this.debugStats = {
      beerPickupsSpawned: 0,
      beerPickupsCollected: 0,
      beerBossSpawned: 0,
      photoEnemiesSpawned: 0,
      legendaryFlybyTriggered: 0
    };

    this.gameTime = 0;
    this.levelAdvancePending = false;
    this.levelAdvanceTimeout = null;
    this.capState = { bullets: false, enemies: false, particles: false };

    const { width, height } = this.game.app.screen;

    // Initialize managers
    const capHandler = this.logCap.bind(this);
    this.bulletManager = new BulletManager(this.gameContainer, capHandler);
    this.bulletManager.setScreenBounds(width, height);
    this.particleManager = new ParticleManager(this.gameContainer, capHandler);
    this.powerupManager = new PowerupManager(this.gameContainer, this.game);
    this.screenShake = new ScreenShake(this.gameContainer);
    this.scorePopupManager = new ScorePopupManager(this.uiContainer);

    // Initialize touch controls for mobile
    try {
      this.touchControls = new TouchControls();
      this.touchControls.init();
    } catch (error) {
      console.warn('[PlayScene] TouchControls init failed, using NullTouchControls', error);
      this.touchControls = new NullTouchControls();
    }

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
      const spriteKey = this.game.selectedShipSpriteKey || 'row2_ship_1.png';
      console.log('[PlayScene] Assets ready, creating player with spriteKey=' + spriteKey);
      this.player = new Player(width / 2, height - 100, this.inputManager, this.game, spriteKey);
      this.gameContainer.addChild(this.player.sprite);

      // Patch player sprite for property write tracking
      patchDisplayObject(this.player.sprite, 'player.sprite');
      if (this.player.shipSprite) {
        patchDisplayObject(this.player.shipSprite, 'player.shipSprite');
      }
      const initialRank = Number.isFinite(this.game.rankIndex) ? this.game.rankIndex : 1;
      this.player.setRank(initialRank, 'init');

      this.applySeasonCosmetics();

      // DEBUG: Log ship selection details
      if (this.player) {
        console.log(`[ShipDebug] Build: ${BUILD_ID || 'OPTIMIZED'}`);
        console.log(`[ShipDebug] Selected: ${this.game.selectedShipSpriteKey}`);
        console.log(`[ShipDebug] Active: ${this.player.selectedShipSpriteKey}`);
        console.log(`[ShipDebug] PlayerSprite: exists=${!!this.player.sprite} alpha=${this.player.sprite?.alpha} visible=${this.player.sprite?.visible} x=${this.player.sprite?.x} y=${this.player.sprite?.y}`);
        console.log(`[ShipDebug] Texture: ${this.player.shipSprite?.texture?.baseTexture?.resource?.url || 'unknown'}`);
      }

      // Start ship intro animation
      this.startShipIntro(spriteKey);
    });

    // Create placeholder player immediately (will be replaced)
    if (!this.player) {
      const spriteKey = this.game.selectedShipSpriteKey || 'row2_ship_1.png';
      this.player = new Player(width / 2, height - 100, this.inputManager, this.game, spriteKey);
      this.gameContainer.addChild(this.player.sprite);

      // Patch player sprite for property write tracking
      patchDisplayObject(this.player.sprite, 'player.sprite_placeholder');
      if (this.player.shipSprite) {
        patchDisplayObject(this.player.shipSprite, 'player.shipSprite_placeholder');
      }
      if (this.player.setRank) {
        const initialRank = Number.isFinite(this.game.rankIndex) ? this.game.rankIndex : 1;
        this.player.setRank(initialRank, 'init_placeholder');
      }
      this.applySeasonCosmetics();
    }

    // Create enemy manager
    this.enemyManager = new EnemyManager(this.gameContainer, this.game, capHandler);

    const params = new URLSearchParams(window.location.search);
    const debugToken = params.get('debugBossToken');
    if (debugToken === 'KURT_DEBUG_2026') {
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

    // Initialize Forensics
    crashCapture.enable(this);
    if (params.get('trace') === '1') {
      propertyTracer.enable();
    }


    // Ensure Assets are ready for gameplay
    GameAssets.ensureBeerTexture().then(tex => {
      if (!GameAssets.isValidTexture(tex)) {
        console.error('[PlayScene] Beer texture failed to load.');
      } else {
        console.log('[PlayScene] Beer texture ready.');
      }
    });
    GameAssets.loadPhotos();

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
      this.powerupManager.spawn(this.player.x, 100);
      this.showToast('SPAWNED BEER PICKUP', { fontSize: 20 });
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
      this.spawnEasterEgg();
      this.showToast('TRIGGERED FLYBY', { fontSize: 20 });
    }
    // Property Write Trace Dump
    if (e.key === 't' || e.key === 'T') {
      propertyTracer.dump();
      this.showToast('FLICKER REPORT (CONSOLE)', { fontSize: 20 });
    }
    // Crash Dump
    if (e.key === 'y' || e.key === 'Y') {
      crashCapture.dump();
      this.showToast('CRASH REPORT (CONSOLE)', { fontSize: 20 });
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

  startLevel(source = 'unknown') {
    // GUARD: specific level start
    if (this._lastStartedLevel === this.game.level) {
      console.log(`[LevelStart] suppressed duplicate source=${source} level=${this.game.level}`);
      return;
    }
    console.log(`[LevelStart] starting source=${source} level=${this.game.level}`);
    this._lastStartedLevel = this.game.level;

    this.levelAdvancePending = false;
    if (this.levelAdvanceTimeout) {
      clearTimeout(this.levelAdvanceTimeout);
      this.levelAdvanceTimeout = null;
    }

    if (Number.isFinite(this.debugStartLevel)) {
      this.game.level = this.debugStartLevel;
    }

    // Update music for the new level
    AudioManager.playMusicContext('gameplay');
    this.powerupManager.checkLevelReset(this.game.level); // Reset powerup caps

    this.enemyManager.startLevel(this.game.level);
    if (this.debugStartAtBoss) {
      this.enemyManager.forceBossStart(this.game.level);
    }
    this.showLevelIntro();
    this.showToast(getMicroMessage('levelStart'), { fontSize: 18, y: this.game.getHeight() * 0.12, slot: 'corner', type: 'level_up' });
    this.showToast(getMicroMessage('newWave'), { fontSize: 18, y: this.game.getHeight() * 0.16, slot: 'corner', type: 'level_up' });

    if (this.game.level % 5 === 0) {
      this.showToast(getMicroMessage('bossIntro'), { fontSize: 22, y: this.game.getHeight() * 0.25, slot: 'center', type: 'level_up' });
    }

    // Task 3: Show portrait banner on level start (every 2 levels)
    if (this.game.level % 2 === 0) {
      const loreLine = this.getNextLoreLine();
      if (loreLine) {
        this.showLoreBanner(loreLine);
      }
    }

    this.resetRandomTimers();
    this.ambientBeerTimer = 2000 + Math.random() * 3000; // First drunk beer VERY soon (2-5s)
    this.easterEggTimer = 20000; // Deterministic first flyby at 20s
  }

  showLevelIntro() {
    const levelTexts = [
      'Wave 1: Grunnleggende gris',
      'Wave 2: Mongo intensifiserer',
      'Wave 3: Deili fetta kommer inn',
      'Wave 4: R\u00f8lp mode aktiverer',
      'BOSS: MEGA TUFS',
      'Wave 6: Tilbake til Melbu',
      'Wave 7: Stokmarknes raids',
      'Wave 8: Kj\u00f8ttdeig overload',
      'Wave 9: Isbjørn chaos',
      'BOSS: ULTIMATE SVIN'
    ];
    const introList = extendLevelIntroTexts(levelTexts, this.game.level, this.game.level % 5 === 0);
    const message = introList[(this.game.level - 1) % introList.length] || `LEVEL ${this.game.level}`;
    this.showToast(message, {
      fontSize: 42,
      fill: '#ffff00',
      stroke: '#ff8800',
      strokeThickness: 3,
      duration: 2000,
      type: 'level_up',
      slot: 'center'
    });
  }

  update(delta) {
    // Safety check
    if (!Number.isFinite(delta) || delta > 100 || delta < 0) return;
    if (!this.isReady) return;

    // Polling Tracer
    propertyTracer.update();

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
    if (this.isPaused) return;

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
        // FIX: Do NOT override alpha if player is in a special visual state
        // Player.update() handles alpha for: invulnerable blink, dodge, ghost powerup
        if (!this.player.invulnerable && !this.player.isDodging && this.player.activePowerup?.type !== 'ghost') {
          sprite.alpha = 1;
        }
        if (!sprite.parent && this.gameContainer) {
          this.gameContainer.addChild(sprite);
        }
      }
    }

    this.updateComboTimers(delta);
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
        bullets.forEach(bullet => this.bulletManager.addPlayerBullet(bullet));

        // TASK 4: Shooting sound with health check
        this.playShootSoundWithHealthCheck();
      }
    }

    // Managers update
    const enemyBulletScale = (this.player && this.player.activePowerup && this.player.activePowerup.type === 'slow_time') ? 0.6 : 1;
    if (this.bulletManager) this.bulletManager.update(delta, enemyBulletScale);
    if (this.enemyManager) this.enemyManager.update(delta);
    if (this.powerupManager) this.powerupManager.update(delta, this);
    if (this.particleManager) this.particleManager.update(delta);
    if (!FLICKER_FLAGS.disableScreenShake && this.screenShake) this.screenShake.update(delta);
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
      this.game.addScore(1000); // Completion Bonus
      if (!FLICKER_FLAGS.disableOverlays) {
        this.showToast('LEVEL COMPLETE!', { fontSize: 40, fill: '#00ff00', duration: 2000 });
      }

      // Show portrait lore on wave clear
      const loreLine = this.getNextLoreLine();
      if (loreLine) {
        setTimeout(() => this.showPortraitPopup(loreLine), 1200);
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

      if (this.enemyManager.isBossLevel) {
        this.showWantedPoster();
        // Show portrait lore on boss spawn
        const bossLore = this.getNextLoreLine();
        if (bossLore) {
          setTimeout(() => this.showPortraitPopup(bossLore), 2200);
        }
      }

      this.levelAdvanceTimeout = setTimeout(() => {
        this.levelAdvancePending = false;
        this.levelAdvanceTimeout = null;
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
      }, 3000);
    }

    this.hud.update();
    this.updateStarfield(delta); // TASK D: Animate background stars
    this.updateAmbientBeers(delta); // Handles both Red Hazards and White Powerups
    this.applyMagnetPull(delta);
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
    if (FLICKER_FLAGS.disableRankUps) return;
    const nr = Number(newRank);
    if (!Number.isFinite(nr)) return;

    if (this._rankUpAnimating) return;
    this._rankUpAnimating = true;
    this._showRankUpCount++;
    this.centerToastLockUntil = Date.now() + 2500;

    // TASK 4: Enhanced rank up animation with rank sprite and title
    const rank = (newRank !== undefined) ? newRank : this.game.rankIndex;
    const rankTitle = this.game.getRankTitle ? this.game.getRankTitle(rank) : '';

    // TASK 4: Audio - SFX first, then optional voice
    AudioManager.playSfx('powerup', { force: true, volume: 1.0 });
    setTimeout(() => {
      AudioManager.playVoice('powerup'); // Optional celebratory voice
    }, 200);

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
    }, 2500);

    // Task 3: Show portrait banner on rank up (delayed to avoid overlap)
    setTimeout(() => {
      const loreLine = this.getNextLoreLine();
      if (loreLine) {
        this.showLoreBanner(loreLine);
      }
    }, 3000);
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

    // Background panel
    const panel = new PIXI.Graphics();
    panel.roundRect(-200, -80, 400, 160, 10);
    panel.fill({ color: 0x000000, alpha: 0.85 });
    panel.stroke({ color: 0xffff00, width: 3 });
    container.addChild(panel);

    // Inner glow
    const glow = new PIXI.Graphics();
    glow.roundRect(-195, -75, 390, 150, 8);
    glow.stroke({ color: 0xffaa00, width: 1, alpha: 0.6 });
    container.addChild(glow);

    // Rank sprite (if available)
    const rankTexture = this.game.getRankTexture ? this.game.getRankTexture(rank) : null;
    if (rankTexture) {
      const rankSprite = new PIXI.Sprite(rankTexture);
      rankSprite.anchor.set(0.5);
      rankSprite.scale.set(0.6);
      rankSprite.y = -20;
      container.addChild(rankSprite);
    }

    // "RANK UP!" text
    const rankUpText = new PIXI.Text('RANK UP!', {
      fontFamily: 'Courier New',
      fontSize: 24,
      fill: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4
    });
    rankUpText.anchor.set(0.5);
    rankUpText.y = rankTexture ? 30 : -30;
    container.addChild(rankUpText);

    // Rank title text
    if (rankTitle) {
      const titleText = new PIXI.Text(rankTitle.toUpperCase(), {
        fontFamily: 'Courier New',
        fontSize: 20,
        fill: '#00ffff',
        stroke: '#000000',
        strokeThickness: 3
      });
      titleText.anchor.set(0.5);
      titleText.y = rankTexture ? 55 : 0;
      container.addChild(titleText);
    }

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
        const idx = this._activeTickers.indexOf(animate);
        if (idx >= 0) this._activeTickers.splice(idx, 1);
        if (container.parent) {
          this.uiContainer.removeChild(container);
        }
      }
    };

    this.game.app.ticker.add(animate);
    this._activeTickers.push(animate); // Track for cleanup
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

    // Player bullets vs enemies
    this.bulletManager.playerBullets.forEach(bullet => {
      if (bullet.active) {
        this.enemyManager.enemies.forEach(enemy => {
          if (enemy.active && this.checkCollision(bullet, enemy)) {
            if (!bullet.piercing) bullet.active = false;
            const destroyed = enemy.takeDamage(bullet.damage);

            if (destroyed) {
              // XP Logic handled by score now

              // Feature: Slow Time Trade-off
              if (this.player.activePowerup && this.player.activePowerup.type !== 'slow_time') {
                const scoreAwarded = this.getComboScore(enemy.scoreValue);
                this.game.addScore(scoreAwarded);
                // Score popup with combo
                if (this.scorePopupManager) {
                  this.scorePopupManager.addScorePopup(enemy.x, enemy.y, scoreAwarded);
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

    // Player bullets vs enemy bullets (Bullet Shield powerup)
    if (this.player.activePowerup && this.player.activePowerup.type === 'bullet_shield') {
      this.bulletManager.playerBullets.forEach(playerBullet => {
        if (playerBullet.active) {
          this.bulletManager.enemyBullets.forEach(enemyBullet => {
            if (enemyBullet.active && this.checkCollision(playerBullet, enemyBullet)) {
              // Destroy both bullets
              playerBullet.active = false;
              enemyBullet.active = false;
              // Visual feedback
              this.particleManager.createHitSpark(enemyBullet.x, enemyBullet.y);
              AudioManager.playSfx('shield', { volume: 0.3 });
              console.log('[BulletShield] Destroyed enemy bullet at', enemyBullet.x.toFixed(0), enemyBullet.y.toFixed(0));
            }
          });
        }
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
          if (this.player.activePowerup && this.player.activePowerup.type === 'ghost') return;

          bullet.active = false;
          if (!this.player.invulnerable) {
            const damageTaken = this.player.takeDamage();
            if (damageTaken) {
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

    // Ambient Beers (Hazard RED or Powerup WHITE)
    this.ambientBeers.forEach(beer => {
      if (beer.active && this.player.active) {
        if (this.checkCollision(beer, this.player)) {
          if (beer.type === 'POWERUP') {
            // Collect!
            beer.collect(this.player, this);
            this.hasActiveWhiteCan = false; // Reset spawn flag
          } else {
            // HAZARD
            // Feature: Ghost Ship prevents hit
            if (this.player.activePowerup && this.player.activePowerup.type === 'ghost') return;

            // FATAL COLLISION
            beer.active = false;

            if (!this.player.invulnerable) {
              const damageTaken = this.player.takeDamage();
              if (damageTaken) {
                this.lastHitAt = Date.now();
                this.game.loseLife();
                this.triggerPlayerDeathFeedback();
              } else {
                this.screenShake.shake(3);
                this.particleManager.createHitSpark(this.player.x, this.player.y);
              }
            }
            this.particleManager.createExplosion(beer.x, beer.y, 0xffaa00);
            this.showToast('OUCH!', { fontSize: 20, fill: '#ff0000' });
          }
        }
      }
    });

    // Player bullets vs Ambient Beer (Shoot them down for points - RED HAZARD ONLY)
    this.bulletManager.playerBullets.forEach(bullet => {
      if (bullet.active) {
        this.ambientBeers.forEach(beer => {
          // Only damage HAZARD type beers (red cans), not POWERUP (white cans)
          if (beer.active && beer.type === 'HAZARD' && this.checkCollision(bullet, beer)) {
            if (!bullet.piercing) bullet.active = false;
            // Use the BeerCan's takeDamage method properly
            const destroyed = beer.takeDamage(bullet.damage || 1);
            if (destroyed) {
              if (this.player.activePowerup && this.player.activePowerup.type !== 'slow_time') {
                this.game.addScore(this.getComboScore(500));
              }
              this.onEnemyKilled(beer);
              this.particleManager.createExplosion(beer.x, beer.y, 0xffaa00);
              AudioManager.playSfx('enemy_explode', { volume: 0.5 });
              this.showToast('BEER SMASH!', { fontSize: 18, y: beer.y, fill: '#ffff00' });
            } else {
              this.particleManager.createHitSpark(beer.x, beer.y);
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
          if (this.player.activePowerup && this.player.activePowerup.type === 'ghost') return;

          enemy.active = false;
          if (!this.player.invulnerable) {
            const damageTaken = this.player.takeDamage();
            if (damageTaken) {
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
      const nameA = a?.name || a?.sprite?.name;
      const nameB = b?.name || b?.sprite?.name;
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

    // 3 parallax layers: far (slow), mid (medium), near (fast)
    this.starLayers = [];

    // Layer 1: Far stars (small, slow, many)
    const farStars = [];
    for (let i = 0; i < 100; i++) {
      const star = new PIXI.Graphics();
      star.circle(0, 0, 0.8 + Math.random() * 0.4); // 0.8-1.2 px
      star.fill({ color: 0xffffff, alpha: 0.3 + Math.random() * 0.3 }); // 0.3-0.6 alpha
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
      star.circle(0, 0, 1.2 + Math.random() * 0.6); // 1.2-1.8 px
      star.fill({ color: 0xffffff, alpha: 0.5 + Math.random() * 0.3 }); // 0.5-0.8 alpha
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
      star.circle(0, 0, 1.5 + Math.random() * 1); // 1.5-2.5 px
      star.fill({ color: 0xffffff, alpha: 0.6 + Math.random() * 0.4 }); // 0.6-1.0 alpha
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
      }
    }

    // Fail-safe: if firing but no sound in >500ms, force recover once
    if (!played && now - check.lastSoundTime > 500) {
      AudioManager.playSfx(sfxKey, { force: true, pool: true, volume: 0.8 });
      check.lastSoundTime = now;
      if (!check.recoveredLogged) {
        console.warn('[AudioFix] shooting sound recovered');
        check.recoveredLogged = true;
      }
    }

    // Health check: If we've fired 10+ shots without sound recovery
    if (check.shotsFired >= 10) {
      const timeSinceRecovery = now - check.lastRecoveryAttempt;

      // If it's been >5s since last recovery attempt and we're still shooting
      if (timeSinceRecovery > 5000) {
        if (check.recoveryAttempts === 0) {
          if (!window._hasLoggedAudioHealthCheck) {
            console.log('[PlayScene] Shooting sound health check: Attempting recovery (first attempt)');
            window._hasLoggedAudioHealthCheck = true;
          }
        }
        check.lastRecoveryAttempt = now;
        check.recoveryAttempts++;

        // Resume AudioContext if suspended
        if (AudioManager && AudioManager.audioContext) {
          if (AudioManager.audioContext.state === 'suspended') {
            AudioManager.audioContext.resume().catch(() => { });
          }
        }

        // Reset counter after recovery attempt
        check.shotsFired = 0;

        // Rate limit recovery attempts
        if (check.recoveryAttempts > 3) {
          console.warn('[PlayScene] Too many recovery attempts, stopping health check');
          check.shotsFired = -999; // Disable further checks
        }
      }
    }
  }

  destroy() {
    if (this.levelAdvanceTimeout) {
      clearTimeout(this.levelAdvanceTimeout);
      this.levelAdvanceTimeout = null;
    }
    if (this._debugKeyHandler) {
      window.removeEventListener('keydown', this._debugKeyHandler);
      this._debugKeyHandler = null;
    }
    this.inputManager.destroy();
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
    // Lifecycle hardening
    if (this._deathTimeouts) {
      this._deathTimeouts.forEach(id => clearTimeout(id));
      this._deathTimeouts = [];
    }
    if (this._activeTickers) {
      this._activeTickers.forEach(fn => this.game.app.ticker.remove(fn));
      this._activeTickers = [];
    }
    if (this._introAnimationFrame) {
      cancelAnimationFrame(this._introAnimationFrame);
      this._introAnimationFrame = null;
    }

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
      const counts = this.getPerfCounts();
      console.warn(`CAP bullets=${counts.bullets} enemies=${counts.enemies} particles=${counts.particles}`);
    }
  }

  handlePauseToggle() {
    const pressed = this.inputManager.isKeyPressed('KeyP');
    if (pressed && !this.pausePressed) {
      this.isPaused = !this.isPaused;
      this.showToast(getMicroMessage(this.isPaused ? 'pause' : 'resume'), {
        fontSize: 26,
        y: this.game.getHeight() * 0.45
      });
    }
    this.pausePressed = pressed;
  }

  resetRandomTimers() {
    this.achievementTimer = this.getRandomTimer(8000, 14000);
    this.tauntTimer = this.getRandomTimer(6000, 11000);
  }

  updateRandomPopups(delta) {
    if (this.achievementTimer > 0) {
      this.achievementTimer -= delta * 16.67;
    } else {
      const line = this.getNextLoreLine();
      if (line && this.canShowLore()) this.showLoreBanner(line);
      this.achievementTimer = this.getRandomTimer(18000, 26000);
    }

    if (this.tauntTimer > 0) {
      this.tauntTimer -= delta * 16.67;
    } else {
      const line = this.getNextLoreLine();
      if (line && this.canShowLore()) this.showLoreBanner(line);
      this.tauntTimer = this.getRandomTimer(16000, 24000);
    }
  }

  checkLowLives() {
    if (this.game.lives <= 1 && this.lowLivesShownFor !== this.game.lives) {
      this.lowLivesShownFor = this.game.lives;
      this.showToast(getMicroMessage('lowHealth'), { fontSize: 22, y: this.game.getHeight() * 0.3 });
    }
  }

  triggerPlayerDeathFeedback() {
    if (!this.player) return;

    // Store player position before death
    const deathX = this.player.x;
    const deathY = this.player.y;

    // Hide/deactivate player immediately
    this.player.active = false;
    if (this.player.sprite) this.player.sprite.visible = false;

    // NO FREEZE - Player must keep moving
    // this.freezeTimerMs = 500; // REMOVED

    // Heavy Screenshake
    if (this.screenShake) this.screenShake.shake('strong');

    // 3. Fullscreen Red Flash
    const flash = new PIXI.Graphics();
    flash.rect(0, 0, this.game.getWidth(), this.game.getHeight()).fill({ color: 0xff0000, alpha: 0.6 });
    this.uiOverlay.addChild(flash);

    let frames = 0;
    const fadeTicker = (ticker) => {
      if (!flash.parent) {
        this.game.app.ticker.remove(fadeTicker);
        return;
      }
      flash.alpha -= 0.03 * ticker.deltaTime;
      if (flash.alpha <= 0) {
        if (flash.parent) flash.parent.removeChild(flash);
        this.game.app.ticker.remove(fadeTicker);
      }
    };
    this.game.app.ticker.add(fadeTicker);
    if (!this._activeTickers) this._activeTickers = [];
    this._activeTickers.push(fadeTicker);

    // 4. Enhanced explosions - more dramatic
    if (this.particleManager) {
      // Immediate huge one
      this.particleManager.createBossExplosion(deathX, deathY, 0xff0000);
      // Cascading explosions
      for (let i = 1; i <= 5; i++) {
        const id = setTimeout(() => {
          if (this.particleManager) {
            this.particleManager.createExplosion(
              deathX + (Math.random() - 0.5) * 80,
              deathY + (Math.random() - 0.5) * 80,
              i % 2 === 0 ? 0xff8800 : 0xffff00,
              2
            );
          }
        }, i * 90);
        if (!this._deathTimeouts) this._deathTimeouts = [];
        this._deathTimeouts.push(id);
      }
    }

    // 5. Audio
    AudioManager.playSfx('explosionCrunch', { force: true, volume: 1.0 });
    setTimeout(() => AudioManager.playSfx('boss_explode', { force: true, volume: 0.7 }), 150);

    // Show death message with delay
    if (!FLICKER_FLAGS.disableOverlays) {
      setTimeout(() => {
        const { width, height } = this.game.app.screen;
        this.showToast('YOU DIED!', {
          fontSize: 52,
          fill: '#ff0000',
          stroke: '#000000',
          strokeThickness: 6,
          slot: 'center',
          type: 'death',
          duration: 1800,
          banner: false
        });
      }, 300);
    }
  }

  onLifeLost() {
    // Don't show immediate toast - death message handles this

    // RESPAWN LOGIC - Quick respawn with clear invulnerability
    if (this.player && this.game.lives > 0) {
      const respawnTimeout = setTimeout(() => {
        if (this.player && this.game.lives > 0) {
          // Respawn immediately - no "GET READY" delay
          this.player.forceRespawn(this.game.getWidth(), this.game.getHeight());

          // FORENSICS: Reset tracer and track new/existing sprite
          propertyTracer.reset();
          if (this.player.sprite) propertyTracer.track(this.player.sprite, 'player.sprite');
          if (this.player.shipSprite) propertyTracer.track(this.player.shipSprite, 'player.shipSprite');

          AudioManager.playSfx('powerup', { force: true, volume: 0.7 });
          AudioManager.recoverSfx('respawn');

          // Show invulnerability message
          this.showToast('INVULNERABLE!', {
            fontSize: 28,
            fill: '#00ffff',
            stroke: '#000000',
            strokeThickness: 4,
            slot: 'center',
            type: 'respawn',
            duration: 1000
          });

          // Small screen shake
          if (this.screenShake) this.screenShake.shake(5);

          // Spawn particles
          if (this.particleManager) {
            this.particleManager.createExplosion(this.player.x, this.player.y, 0x00ffff, 2);
          }
        }
      }, 800); // Reduced from 2000+800 to just 800ms

      if (!this._deathTimeouts) this._deathTimeouts = [];
      this._deathTimeouts.push(respawnTimeout);
    }
    const boss = this.enemyManager?.boss;
    if (boss && boss.active) {
      console.log(`[BossHP] player_death level=${this.game.level} hp=${boss.health} max=${boss.maxHealth} bossActive=true`);
      this.showBossTaunt('boss_life_lost');
    }
  }

  getRandomTimer(minMs, maxMs) {
    return minMs + Math.random() * (maxMs - minMs);
  }

  showToast(message, options = {}) {
    if (FLICKER_FLAGS.disableToasts) return;
    this.enqueueToast(message, options);
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
    const priorityMap = { rank_up: 3, rank_boost: 2, level_up: 1 };
    const priority = Number.isFinite(options.priority) ? options.priority : (priorityMap[type] || 0);
    const entry = { message, options: { ...options, type, slot }, priority, createdAt: Date.now() };

    if (slot === 'corner') {
      this.toastCornerQueue.push(entry);
      this.toastCornerQueue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    } else if (slot === 'top') {
      this.toastTopQueue.push(entry);
      this.toastTopQueue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    } else {
      this.toastQueue.push(entry);
      this.toastQueue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    }

    this.processToastQueue();
  }

  processToastQueue() {
    const now = Date.now();
    if (!this.activeCenterToast && now >= this.centerToastLockUntil && this.toastQueue.length > 0) {
      const entry = this.toastQueue.shift();
      this.activeCenterToast = this.showToastNow(entry.message, entry.options, 'center');
    }
    if (!this.activeTopToast && this.toastTopQueue.length > 0) {
      const entry = this.toastTopQueue.shift();
      this.activeTopToast = this.showToastNow(entry.message, entry.options, 'top');
    }
    if (!this.activeCornerToast && this.toastCornerQueue.length > 0) {
      const entry = this.toastCornerQueue.shift();
      this.activeCornerToast = this.showToastNow(entry.message, entry.options, 'corner');
    }
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

  showLoreBanner(text) {
    if (FLICKER_FLAGS.disableLorePortrait) return;
    if (!text) return;
    if (!this.canShowLore()) return;
    this.showPortraitPopup(text);
  }

  showPortraitPopup(text) {
    if (!text) return;
    const { width, height } = this.game.app.screen;
    const duration = 3500;

    // Portrait container
    const popup = new PIXI.Container();
    popup.x = width / 2;
    popup.y = height * 0.25;
    popup.alpha = 0;

    // Portrait image (144px - 2x original size)
    const photos = Object.keys(GameAssets.photos || {});
    if (photos.length > 0) {
      const pick = photos[Math.floor(Math.random() * photos.length)];
      const tex = GameAssets.getPhoto(pick);
      if (GameAssets.isValidTexture(tex)) {
        const portrait = new PIXI.Sprite(tex);
        portrait.anchor.set(0.5);
        portrait.width = 144;
        portrait.height = 144;
        portrait.y = -80;

        // Circular border
        const border = new PIXI.Graphics();
        border.circle(0, -80, 76);
        border.stroke({ color: 0x00ff00, width: 4, alpha: 0.9 });
        popup.addChild(border);
        popup.addChild(portrait);
      }
    }

    // Text box below portrait (semi-transparent background)
    const textBg = new PIXI.Graphics();
    textBg.roundRect(-200, 20, 400, 80, 10);
    textBg.fill({ color: 0x000000, alpha: 0.85 });
    textBg.stroke({ color: 0x00ff00, width: 3 });
    popup.addChild(textBg);

    // Lore text
    const loreText = new PIXI.Text(text, {
      fontFamily: 'Courier New',
      fontSize: 18,
      fill: '#ffffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 360,
      lineHeight: 24
    });
    loreText.anchor.set(0.5);
    loreText.y = 60;
    popup.addChild(loreText);

    this.uiOverlay.addChild(popup);
    this.lastLoreAt = Date.now();

    // Fade in/out animation
    let elapsed = 0;
    const fadeIn = 300;
    const fadeOut = 400;
    const ticker = (delta) => {
      elapsed += delta.deltaTime * 16.67;

      if (elapsed < fadeIn) {
        popup.alpha = elapsed / fadeIn;
      } else if (elapsed > duration - fadeOut) {
        popup.alpha = Math.max(0, (duration - elapsed) / fadeOut);
      } else {
        popup.alpha = 1;
      }

      if (elapsed >= duration) {
        this.game.app.ticker.remove(ticker);
        const idx = this._activeTickers.indexOf(ticker);
        if (idx >= 0) this._activeTickers.splice(idx, 1);
        if (popup.parent) popup.parent.removeChild(popup);
      }
    };
    this._activeTickers.push(ticker);
    this.game.app.ticker.add(ticker);
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
    if (FLICKER_FLAGS.disableToasts) return null;
    const { width, height } = this.game.app.screen;
    const fontSize = options.fontSize || (slot === 'corner' ? 16 : 24);
    const maxWidth = Number.isFinite(options.maxWidth)
      ? options.maxWidth
      : (slot === 'corner' ? width * 0.45 : slot === 'top' ? width * 0.7 : width * 0.9);
    const y = options.y || (slot === 'corner' ? height * 0.12 : slot === 'top' ? height * 0.18 : height * 0.2);

    let display = null;
    if (options.banner) {
      const banner = new PIXI.Container();
      const bannerText = new PIXI.Text(message, {
        fontFamily: 'Courier New',
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

      const photos = Object.keys(GameAssets.photos || {});
      const hasAvatar = photos.length > 0;
      // Make portraits 50% bigger (was 88, now 132)
      const avatarSlot = hasAvatar ? 132 : 0;
      const contentWidth = Math.max(180, maxWidth - paddingX * 2 - avatarSlot);
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

      const panelWidth = Math.min(maxWidth, bannerText.width + paddingX * 2 + avatarSlot + 20);
      const panelHeight = Math.max(80, bannerText.height + paddingY * 2 + 10);
      const panel = new PIXI.Graphics();
      panel.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 14);
      panel.fill({ color: 0x111111, alpha: 0.92 });
      panel.stroke({ color: 0xffff00, width: 4 });

      const accent = new PIXI.Graphics();
      accent.roundRect(-panelWidth / 2 + 6, -panelHeight / 2 + 6, panelWidth - 12, panelHeight - 12, 10);
      accent.stroke({ color: 0xff66cc, width: 2, alpha: 0.8 });

      const noise = new PIXI.Graphics();
      for (let i = 0; i < 32; i++) {
        const nx = -panelWidth / 2 + 10 + Math.random() * (panelWidth - 20);
        const ny = -panelHeight / 2 + 10 + Math.random() * (panelHeight - 20);
        noise.circle(nx, ny, 1.5);
      }
      noise.fill({ color: 0xffffff, alpha: 0.1 });

      banner.addChild(panel);
      banner.addChild(accent);
      banner.addChild(noise);
      banner.addChild(bannerText);

      bannerText.x = -panelWidth / 2 + paddingX + avatarSlot;
      bannerText.y = options.title ? 10 : 0; // Shift down if title

      // TASK 3: Add Title Label if present
      if (options.title) {
        const titleLabel = new PIXI.Text(String(options.title).toUpperCase(), {
          fontFamily: 'Courier New',
          fontSize: 16,
          fill: '#ffff00', // Yellow for visibility
          fontWeight: 'bold',
          stroke: '#000000',
          strokeThickness: 4
        });
        titleLabel.anchor.set(0, 0.5);
        titleLabel.x = bannerText.x;
        titleLabel.y = -panelHeight / 2 + 20;
        banner.addChild(titleLabel);
      }

      if (hasAvatar) {
        const pick = photos[Math.floor(Math.random() * photos.length)];
        const tex = GameAssets.getPhoto(pick);
        if (GameAssets.isValidTexture(tex)) {
          const sticker = new PIXI.Sprite(tex);
          sticker.anchor.set(0.5);
          // 50% bigger portraits (was 72px, now 108px)
          sticker.width = 108;
          sticker.height = 108;
          sticker.x = -panelWidth / 2 + paddingX + avatarSlot / 2;
          sticker.y = 0;
          sticker.alpha = 0.92;
          // Border radius 50% bigger (was 38, now 57)
          const portraitBorder = new PIXI.Graphics();
          portraitBorder.circle(sticker.x, sticker.y, 57);
          portraitBorder.stroke({ color: 0x00ffff, width: 2, alpha: 0.7 });
          banner.addChild(portraitBorder);
          banner.addChild(sticker);
        }
      }

      banner.x = width / 2;
      banner.y = y;
      banner.alpha = 0;
      display = banner;
      this.uiOverlay.addChild(banner);
    } else {
      const text = new PIXI.Text(message, {
        fontFamily: 'Courier New',
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
    if (slot === 'center' && ['rank_up', 'level_up', 'rank_boost'].includes(options.type)) {
      this.lastMajorToastAt = now;
      this.centerToastLockUntil = Math.max(this.centerToastLockUntil, now + duration);
    }
    if (slot === 'center' && options.type === 'lore') {
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
        // Remove from tracked tickers
        const idx = this._activeTickers.indexOf(ticker);
        if (idx >= 0) this._activeTickers.splice(idx, 1);

        if (display.parent) display.parent.removeChild(display);
        if (slot === 'corner') {
          this.activeCornerToast = null;
        } else if (slot === 'top') {
          this.activeTopToast = null;
        } else {
          this.activeCenterToast = null;
        }
        this.processToastQueue();
      }
    };
    this.game.app.ticker.add(ticker);
    this._activeTickers.push(ticker); // Track toast ticker for cleanup
    return display;
  }

  createComboDisplay() {
    if (!this.comboDisplay) {
      this.comboDisplay = new PIXI.Text('', {
        fontFamily: 'Courier New',
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
      this.synergyBadge = new PIXI.Text('', {
        fontFamily: 'Courier New',
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
    if (now - this.lastKillAt > this.comboWindowMs) {
      this.comboCount = 0;
      this.comboMultiplier = 1;
      this.killStreak = 0;
    }
    this.comboCount += 1;
    this.killStreak += 1;
    this.lastKillAt = now;
    this.comboTimerMs = this.comboWindowMs;

    const prevMultiplier = this.comboMultiplier;
    if (this.comboCount >= 50) this.comboMultiplier = 4;
    else if (this.comboCount >= 25) this.comboMultiplier = 3;
    else if (this.comboCount >= 10) this.comboMultiplier = 2;
    else this.comboMultiplier = 1;

    // Special bonuses for 5x and 10x combos
    if (this.comboCount === 5) {
      const bonus = 1000;
      this.game.addScore(bonus);
      this.enqueueToast(`5x COMBO! +${bonus}`, {
        fontSize: 32,
        fill: '#00ffff',
        stroke: '#000000',
        strokeThickness: 4,
        slot: 'center',
        type: 'combo_bonus',
        duration: 1400,
        banner: true,
        title: 'COMBO BONUS!'
      });
      AudioManager.playSfx('powerup', { force: true, volume: 0.9 });
      if (this.particleManager && this.player) {
        this.particleManager.createExplosion(this.player.x, this.player.y, 0x00ffff, 2);
      }
    } else if (this.comboCount === 10) {
      const bonus = 2500;
      this.game.addScore(bonus);
      this.enqueueToast(`10x COMBO! +${bonus}`, {
        fontSize: 38,
        fill: '#ff8800',
        stroke: '#000000',
        strokeThickness: 5,
        slot: 'center',
        type: 'combo_bonus',
        duration: 1600,
        banner: true,
        title: 'MASSIVE COMBO!'
      });
      AudioManager.playSfx('powerup', { force: true, volume: 1.0 });
      setTimeout(() => AudioManager.playSfx('ui_open', { force: true, volume: 0.8 }), 100);
      if (this.particleManager && this.player) {
        this.particleManager.createExplosion(this.player.x, this.player.y, 0xff8800, 3);
        setTimeout(() => this.particleManager.createExplosion(this.player.x, this.player.y, 0xffff00, 2), 100);
      }
      if (this.screenShake) {
        this.screenShake.shake('medium');
        this.game.app.ticker.speed = 0.3;
        setTimeout(() => {
          if (this.game.app.ticker) this.game.app.ticker.speed = 1.0;
        }, 100);
      }
    }

    if (this.comboMultiplier !== prevMultiplier) {
      // Task 4: Enhanced combo milestone feedback
      const label = this.comboMultiplier >= 4 ? 'MEGA COMBO x4!' : this.comboMultiplier >= 3 ? 'SUPER COMBO x3!' : 'COMBO x2!';
      const color = this.comboMultiplier >= 4 ? '#ff00ff' : this.comboMultiplier >= 3 ? '#ff8800' : '#00ffff';
      const fontSize = this.comboMultiplier >= 3 ? 36 : 28;

      // Task 4: Large center banner instead of top toast
      this.enqueueToast(label, { fontSize, fill: color, slot: 'center', type: 'combo', duration: 1500, banner: true, title: 'COMBO!' });

      // Task 4: Enhanced audio - double sound for big combos
      AudioManager.playSfx('powerup', { force: true, volume: 1.0 });
      if (this.comboMultiplier >= 3) {
        setTimeout(() => AudioManager.playSfx('ui_open', { force: true, volume: 0.8 }), 100);
      }

      // Task 4: Enhanced particles - multiple explosions
      if (this.particleManager && this.player) {
        const particleColor = this.comboMultiplier >= 4 ? 0xff00ff : this.comboMultiplier >= 3 ? 0xff8800 : 0x00ffff;
        this.particleManager.createExplosion(this.player.x, this.player.y, particleColor, this.comboMultiplier);
        // Additional particle bursts for bigger combos
        if (this.comboMultiplier >= 3) {
          setTimeout(() => this.particleManager.createExplosion(this.player.x, this.player.y, particleColor, 2), 100);
        }
      }

      // Task 4: Screen punch effect (brief pause + shake)
      if (this.comboMultiplier >= 2 && this.screenShake) {
        this.screenShake.shake('medium');
        // Brief freeze frame for dramatic effect
        this.game.app.ticker.speed = 0.3;
        setTimeout(() => {
          if (this.game.app.ticker) this.game.app.ticker.speed = 1.0;
        }, 80);
      }

      // Task 3: Portrait banner on combo milestones
      if (this.comboMultiplier >= 2) {
        const loreLine = this.getNextLoreLine();
        if (loreLine) {
          setTimeout(() => this.showLoreBanner(loreLine), 800);
        }
      }
    }

    if (this.comboCount > 0 && this.comboCount % 10 === 0) {
      const bonus = this.getComboScore(100 * (this.comboCount / 10));
      this.game.addScore(bonus);
      this.enqueueToast(`COMBO BONUS +${bonus}`, { fontSize: 18, fill: '#ffff00', slot: 'top', type: 'combo', duration: 1200 });
      AudioManager.playSfx('pickup', { force: true, volume: 0.8 });
    }

    const clutchChance = 0;
    const danger = this.game.lives <= 1;
    if (danger && this.powerupManager && Math.random() < clutchChance) {
      this.powerupManager.spawn(enemy.x, enemy.y);
    }
  }

  updateComboTimers(delta) {
    if (this.comboCount <= 0) return;
    this.comboTimerMs -= delta * 16.67;
    if (this.comboTimerMs <= 0) {
      this.comboCount = 0;
      this.comboMultiplier = 1;
      this.killStreak = 0;
    }
  }

  applyNearMiss(bullet) {
    const now = Date.now();
    if (now < this.nearMissCooldownAt) return;
    this.nearMissCooldownAt = now + 450;
    this.game.addScore(25 * Math.max(1, this.comboMultiplier));
    this.enqueueToast('NEAR MISS +25', { fontSize: 16, fill: '#ffcc00', slot: 'top', type: 'combo', duration: 900 });
    if (this.particleManager) {
      this.particleManager.createHitSpark(this.player.x, this.player.y);
    }
  }

  getComboScore(points) {
    const base = Number(points) || 0;
    return Math.round(base * Math.max(1, this.comboMultiplier));
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
      this.devOverlay = new PIXI.Text('', {
        fontFamily: 'Courier New',
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
  updateAmbientBeers(delta) {
    // WAVE FIX: Use spawn gate from EnemyManager
    const canSpawn = this.enemyManager && this.enemyManager.allowBeerCanSpawns();

    // 1. Spawning Hazard Beers (Red)
    // WAVE FIX: Don't spawn during wave ending or cleanup
    if (canSpawn) {
      this.ambientBeerTimer -= delta * 16.67;
      if (this.ambientBeerTimer <= 0) {
        this.spawnAmbientBeer('HAZARD');
        this.ambientBeerTimer = 4000 + Math.random() * 4000;
      }
    }

    // 2. Spawn White Can (Powerup) Logic
    // WAVE FIX: Don't spawn during wave ending or cleanup
    if (canSpawn) {
      const config = BalanceConfig.powerups.whiteCan;
      const now = Date.now();
      const runTime = this.gameTime * 1000; // approx ms

      // Conditions:
      // - Not waiting for cooldown
      // - Game time > 20s
      // - No white can currently exists
      // - Player not already boosted (optional, but requested "If player already has the same active effect, do NOT spawn" - checking boost simpler here)
      if (!this.hasActiveWhiteCan &&
        now - this.lastWhiteCanTime > config.cooldown &&
        runTime > config.minTime &&
        this.scoreMultiplier === 1) { // Don't spawn if boost active

        if (Math.random() < config.spawnChance) {
          this.spawnAmbientBeer('POWERUP');
          this.lastWhiteCanTime = now;
          this.hasActiveWhiteCan = true;
          this.showToast("BONUS CAN APPEARED!", { fontSize: 24, fill: '#ffffff', y: 100 });
        }
      }
    }

    // Update existing
    // TASK 1: Count remaining hazard cans for wave easing
    const hazardCount = this.ambientBeers.filter(b => b.type === 'HAZARD' && b.active).length;

    this.ambientBeers = this.ambientBeers.filter(beer => {
      // Check if manually removed or destroyed
      if (!beer.active) {
        if (beer.sprite && beer.sprite.parent) beer.sprite.parent.removeChild(beer.sprite);
        if (beer.type === 'POWERUP' && !beer.active) this.hasActiveWhiteCan = false; // Reset if despot
        return false;
      }

      beer.update(delta, hazardCount); // Pass hazard count for wave easing
      return true;
    });
  }

  applyMagnetPull(delta) {
    if (!this.player?.magnetActive) return;
    const range = this.player.magnetRadius || 140;
    const strength = this.player.magnetStrength || 0.08;
    const pull = strength * delta;
    const px = this.player.x;
    const py = this.player.y;

    this.powerupManager?.powerups?.forEach(p => {
      if (!p.active) return;
      const dx = px - p.x;
      const dy = py - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range && dist > 1) {
        p.x += (dx / dist) * pull * dist * 0.25;
        p.y += (dy / dist) * pull * dist * 0.25;
        p.sprite.x = p.x;
        p.sprite.y = p.y;
      }
    });

    this.ambientBeers.forEach(b => {
      if (!b.active) return;
      const dx = px - b.x;
      const dy = py - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range && dist > 1) {
        b.x += (dx / dist) * pull * dist * 0.18;
        b.y += (dy / dist) * pull * dist * 0.18;
        b.sprite.x = b.x;
        b.sprite.y = b.y;
      }
    });
  }

  spawnAmbientBeer(type) {
    // Use BeerCan class
    const x = Math.random() * (this.game.getWidth() - 100) + 50;
    const y = -50;

    const beer = new BeerCan(x, y, this.game, type);
    this.gameContainer.addChild(beer.sprite);
    this.ambientBeers.push(beer);
  }

  // CLEANUP FIX: Authoritative collector for wave cleanup targets
  // Returns all beer cans across all tracking systems
  getWaveCleanupTargets() {
    const targets = [];

    // Collect beer cans from EnemyManager.enemies array (type='beer_challenge')
    if (this.enemyManager && this.enemyManager.enemies) {
      const enemyBeerCans = this.enemyManager.enemies.filter(e =>
        e.active && e.kind === 'beer_can'
      );
      targets.push(...enemyBeerCans);
    }

    // Collect beer cans from PlayScene.ambientBeers array (BeerCan instances)
    const ambientBeerCans = this.ambientBeers.filter(b =>
      b.active && b.kind === 'beer_can'
    );
    targets.push(...ambientBeerCans);

    return targets;
  }

  updateEasterEgg(delta) {
    this.easterEggTimer -= delta * 16.67;
    if (this.easterEggTimer <= 0 && !this.easterEggBeer) {
      this.spawnEasterEgg();
    }

    if (this.easterEggBeer) {
      const egg = this.easterEggBeer;
      egg.x += egg.vx * delta;
      egg.y += egg.vy * delta;
      egg.sprite.x = egg.x;
      egg.sprite.y = egg.y;
      egg.sprite.rotation += 0.01 * delta;

      if (egg.x > this.game.getWidth() + 200 || egg.y > this.game.getHeight() + 200) {
        this.gameContainer.removeChild(egg.sprite);
        this.easterEggBeer = null;
        this.easterEggTimer = 45000 + Math.random() * 30000; // Reset timer
      }
    }
  }

  spawnEasterEgg() {
    // Legendary Flyby - Eirik & Kurt
    // Use one of the photos
    const photos = ['eirik_kurt2', 'burtelurt', 'eriikviking'];
    const picked = photos[Math.floor(Math.random() * photos.length)];
    const tex = GameAssets.getPhoto(picked);

    if (!GameAssets.isValidTexture(tex)) return;

    const sprite = new PIXI.Sprite(tex);
    sprite.anchor.set(0.5);
    // Scale based on photo aspect
    const aspect = tex.width / tex.height;
    sprite.height = 300;
    sprite.width = 300 * aspect;

    sprite.alpha = 0.4;
    sprite.zIndex = 0; // Behind UI

    const startLeft = Math.random() < 0.5;

    const egg = {
      sprite: sprite,
      x: startLeft ? -300 : this.game.getWidth() + 300,
      y: Math.random() * (this.game.getHeight() - 200) + 100,
      vx: startLeft ? 1 : -1,
      vy: (Math.random() - 0.5) * 0.5
    };

    sprite.x = egg.x;
    sprite.y = egg.y;

    this.gameContainer.addChildAt(sprite, 0);
    this.easterEggBeer = egg;

    this.showToast('LEGENDARY SIGHTING!', { fontSize: 24, fill: '#ff00ff' });
    AudioManager.playSfx('pickup');
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
    if (FLICKER_FLAGS.disableOverlays) return; // DEBUG: Disable wanted posters for flicker isolation
    const caption = this.getBossTauntCaption(reason);
    if (!caption) return;
    const photoKeys = Object.keys(GameAssets.photos || {});
    const pickedKey = photoKeys.length
      ? photoKeys[Math.floor(Math.random() * photoKeys.length)]
      : 'kurt2';
    const tex = GameAssets.getPhoto(pickedKey) || GameAssets.getPhoto('kurt2');
    if (!GameAssets.isValidTexture(tex)) return;

    // Lore: Map photo keys to character names from Burt's universe
    const loreLookup = {
      'kurt2': 'KURT EDGAR - Havnemann fra Stokmarknes',
      'eirik1': 'EIRIK - Legendarisk Pilot',
      'eirik_briller': 'EIRIK - Nattevaktkongen',
      'eirik_kurt2': 'EIRIK & KURT - Melbu-Gjengen',
      'eirikanja': 'EIRIK & ANJA - Havneduoen'
    };
    const characterName = loreLookup[pickedKey] || 'UKJENT AGENT';

    const poster = new PIXI.Container();
    poster.name = 'ui_wanted_poster';
    poster.eventMode = 'none';
    poster.interactive = false;

    const bg = new PIXI.Graphics();
    bg.rect(-200, -250, 400, 500);
    bg.fill({ color: 0xffffff });
    bg.stroke({ color: 0x000000, width: 4 });
    poster.addChild(bg);

    const sprite = new PIXI.Sprite(tex);
    sprite.anchor.set(0.5);
    const aspect = tex.width / tex.height;
    sprite.width = 360;
    sprite.height = 360 / aspect;
    if (sprite.height > 350) {
      sprite.height = 350;
      sprite.width = 350 * aspect;
    }
    sprite.y = -20;
    poster.addChild(sprite);

    const headerLabel = reason === 'boss_spawn'
      ? 'BOSS INCOMING'
      : reason === 'boss_life_lost'
        ? 'HIT TAKEN'
        : reason === 'boss_defeat'
          ? 'BOSS DEFEATED'
          : 'BOSS ALERT';
    const topText = new PIXI.Text(headerLabel, {
      fontFamily: 'Courier New',
      fontSize: 20,
      fill: 'black',
      fontWeight: 'bold'
    });
    topText.anchor.set(0.5);
    topText.y = -215;
    poster.addChild(topText);

    const subText = new PIXI.Text(characterName, {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#333333',
      fontWeight: 'bold'
    });
    subText.anchor.set(0.5);
    subText.y = -190;
    poster.addChild(subText);

    const bottomText = new PIXI.Text(caption, {
      fontFamily: 'Courier New',
      fontSize: 18,
      fill: '#111111',
      fontWeight: 'bold'
    });
    bottomText.anchor.set(0.5);
    bottomText.y = 190;
    poster.addChild(bottomText);

    const margin = 20;
    poster.x = margin + 90;
    poster.y = margin + 120;
    poster.rotation = -0.05;

    this.uiOverlay.addChild(poster);
    console.log('[UI] wanted poster shown uiOnly=true');

    // Animate Pop
    poster.scale.set(0.16);
    let elapsed = 0;
    const fadeDelay = 1200;
    const fadeDuration = 600;
    const animate = (delta) => {
      elapsed += delta.deltaTime * 16.67;
      if (elapsed < 200) {
        const t = elapsed / 200;
        poster.scale.set(0.16 + t * 0.05);
      } else if (elapsed > fadeDelay) {
        const t = Math.min(1, (elapsed - fadeDelay) / fadeDuration);
        poster.alpha = 1 - t;
        if (t >= 1) {
          this.game.app.ticker.remove(animate);
          const idx = this._activeTickers.indexOf(animate);
          if (idx >= 0) this._activeTickers.splice(idx, 1);
          if (this.uiOverlay) this.uiOverlay.removeChild(poster);
        }
      }
    };
    this.game.app.ticker.add(animate);
    this._activeTickers.push(animate); // Track for cleanup
    AudioManager.play('menuSelect');
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

    const title = new PIXI.Text(name || 'BOSS', {
      fontFamily: 'Courier New',
      fontSize: 26,
      fill: '#ff3300',
      stroke: '#000000',
      strokeThickness: 4
    });
    title.anchor.set(0.5);
    title.y = -18;
    card.addChild(title);

    const line = new PIXI.Text(taunt || 'LET\'S GO!', {
      fontFamily: 'Courier New',
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
    AudioManager.playSfx('ui_open', { force: true, volume: 1.0 });

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
        const idx = this._activeTickers.indexOf(ticker);
        if (idx >= 0) this._activeTickers.splice(idx, 1);
        if (card.parent) card.parent.removeChild(card);
      }
    };
    this.game.app.ticker.add(ticker);
    this._activeTickers.push(ticker); // Track for cleanup
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
        const idx = this._activeTickers.indexOf(ticker);
        if (idx >= 0) this._activeTickers.splice(idx, 1);
        if (ring.parent) ring.parent.removeChild(ring);
      }
    };
    this.game.app.ticker.add(ticker);
    this._activeTickers.push(ticker); // Track for cleanup
  }

  onBossPhaseChange(phase, boss) {
    const label = phase === 2 ? 'BOSS PHASE 2' : 'BOSS PHASE 3';
    this.enqueueToast(label, { fontSize: 22, fill: '#ff3300', slot: 'top', type: 'boss' });
    this.triggerShockwave(boss.x, boss.y, phase === 2 ? 0xffaa00 : 0xff3300);
    AudioManager.playSfx('powerup', { force: true, volume: 1.0 });
  }

  showWantedPoster() {
    this.showBossTaunt('boss_spawn');
  }

  showBossCelebration({ level = this.game.level, type = 'UNKNOWN' } = {}) {
    if (!this.uiOverlay) return;

    this.showToast('BOSS NEDKJEMPET!', { fontSize: 34, fill: '#ffff00', duration: 2000 });
    this.showToast(getAchievementPopup(), { fontSize: 20, y: this.game.getHeight() * 0.28, duration: 2000 });

    if (this.screenShake) this.screenShake.shake(12);
    if (this.particleManager) {
      for (let i = 0; i < 18; i++) {
        const x = this.game.getWidth() * 0.2 + Math.random() * this.game.getWidth() * 0.6;
        const y = this.game.getHeight() * 0.2 + Math.random() * this.game.getHeight() * 0.3;
        this.particleManager.createExplosion(x, y, 0xffff33);
      }
    }

    AudioManager.playSfx('boss_explode', { force: true, volume: 1.0 });
    if (type === 'BIG_BEER_CAN') AudioManager.playSfx('pickup', { force: true, volume: 0.9 });
    else if (type === 'ICON_192') AudioManager.playSfx('ui_open', { force: true, volume: 0.8 });
    else AudioManager.playSfx('powerup', { force: true, volume: 0.8 });
    console.log(`[BossCelebration] level=${level} type=${type} fired=true`);
  }

  startShipIntro(spriteKey) {
    if (this.introComplete || !this.player) return;

    console.log('[Intro] start');

    this.introActive = true;
    this.introStartTime = Date.now();

    const shipMeta = getShipMetadata(spriteKey);
    const shipName = (shipMeta ? shipMeta.name : 'UNKNOWN SHIP').toUpperCase();

    // Create intro overlay
    this.introOverlay = new PIXI.Container();
    this.introOverlay.zIndex = 999999;

    // Dark vignette for readability + Flash Layer
    const overlayBg = new PIXI.Graphics();
    overlayBg.rect(0, 0, this.game.getWidth(), this.game.getHeight());
    overlayBg.fill({ color: 0x000000, alpha: 0.3 });
    this.introOverlay.addChild(overlayBg);

    // Ship name (Big, Readable)
    const nameText = new PIXI.Text(shipName, {
      fontFamily: 'Courier New',
      fontSize: 52, // 1080p readable
      fill: '#00ff00',
      stroke: '#000000',
      strokeThickness: 6,
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: '#004400',
      dropShadowBlur: 10,
      dropShadowDistance: 4,
      align: 'center'
    });
    nameText.anchor.set(0.5);
    nameText.position.set(this.game.getWidth() / 2, this.game.getHeight() / 2 - 50); // Start higher
    nameText.alpha = 0;
    this.introOverlay.addChild(nameText);

    // Subtitle
    const subText = new PIXI.Text("CLASSIFIED COMBAT VESSEL", {
      fontFamily: 'Courier New',
      fontSize: 20, // Readable subtitle
      fill: '#aaaaaa',
      align: 'center',
      letterSpacing: 4
    });
    subText.anchor.set(0.5);
    subText.position.set(this.game.getWidth() / 2, this.game.getHeight() / 2 + 10);
    subText.alpha = 0;
    this.introOverlay.addChild(subText);

    this.uiOverlay.addChild(this.introOverlay);

    // Impact Flash (White overlay)
    const flash = new PIXI.Graphics();
    flash.rect(0, 0, this.game.getWidth(), this.game.getHeight());
    flash.fill({ color: 0xffffff, alpha: 0.15 });
    flash.alpha = 0;
    this.uiOverlay.addChild(flash);

    // Setup Player Sprite State
    const startY = this.game.getHeight() + 300;
    const endY = this.game.getHeight() - 150;
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
    const duration = 1800; // 1.8s
    const textDuration = 3600; // 3.6s
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
        nameText.y = (this.game.getHeight() / 2 - 50) + (tAlpha * 10);
      } else if (elapsed < 2800) {
        tAlpha = 1;
        nameText.y = (this.game.getHeight() / 2 - 40);
      } else {
        tAlpha = 1 - ((elapsed - 2800) / 800);
        nameText.y = (this.game.getHeight() / 2 - 40);
      }
      nameText.alpha = tAlpha;
      subText.alpha = tAlpha;

      const pulse = 1.0 + Math.sin(now * 0.005) * 0.025;
      nameText.scale.set(pulse);

      // --- Logic Gating ---
      if (elapsed >= duration && !gameplayEnabled) {
        gameplayEnabled = true;
        this.completeShipIntro();
      }

      if (elapsed < textDuration) {
        this._introAnimationFrame = requestAnimationFrame(animate);
      } else {
        // Cleanup
        if (this.introOverlay && this.introOverlay.parent) {
          this.introOverlay.parent.removeChild(this.introOverlay);
          this.introOverlay.destroy({ children: true });
          this.introOverlay = null;
        }
        if (flash.parent) flash.parent.removeChild(flash);
        this._introAnimationFrame = null;
        console.log('[Intro] complete (text finished)');
      }
    };

    this._introAnimationFrame = requestAnimationFrame(animate);
  }

  completeShipIntro() {
    this.introActive = false;
    this.introComplete = true;

    // Cancel animation frame if still running
    if (this._introAnimationFrame) {
      cancelAnimationFrame(this._introAnimationFrame);
      this._introAnimationFrame = null;
    }

    // Remove overlay
    if (this.introOverlay && this.introOverlay.parent) {
      this.introOverlay.parent.removeChild(this.introOverlay);
      this.introOverlay.destroy({ children: true });
      this.introOverlay = null;
    }

    // Start enemy waves - use startLevel, not startWave
    if (this.enemyManager && this.game.level) {
      this.startLevel('introComplete');
    }

    console.log('[PlayScene] Ship intro complete, gameplay enabled');
  }
}
