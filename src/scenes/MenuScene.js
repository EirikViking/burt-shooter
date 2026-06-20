import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { AudioManager } from '../audio/AudioManager.js';
import { BUILD_ID } from '../buildInfo.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { SettingsOverlay } from '../ui/SettingsOverlay.js';
import { HowToPlayOverlay } from '../ui/HowToPlayOverlay.js';
import { destroyMenuFx, installMenuFx, playMenuConfirmSfx, playMenuFocusSfx, resizeMenuFx, updateMenuFx } from '../ui/MenuFxLayer.js';
import { isMobile, isIOS, isStandalone } from '../utils/Mobile.js';
import { EXIT_GAME_WEB_MESSAGE, requestExitGame } from '../utils/ExitGame.js';
import { getDefaultShipKey, isShipUnlocked, isValidShipKey, resolveShipKey } from '../config/ShipMetadata.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { formatNumber, translateText } from '../i18n/index.js';
import { readHangarProgressState } from '../progression/HangarProgressState.js';
import { getSectorStartChallengeRecord } from '../progression/SectorStartChallengeRecords.js';
import { getSectorInfo } from '../config/SectorCatalog.js';
import { RUN_MODES, SECTOR_START_CHECKPOINT_INTERVAL, getRunModeProfile, getSectorStartPlaySector, getSectorStartState } from '../game/RunMode.js';
// PART A: Dynamic story rotation
import { tauntDirector } from '../game/TauntDirector.js';
import { TypewriterText } from '../utils/TypewriterText.js';
import { getDiscoveryStats } from '../progression/ThreatDiscoveryState.js';

const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';
const FONT_ARCADE = 'Rajdhani, Orbitron, Bahnschrift, Segoe UI, sans-serif';
const FONT_MONO = 'Rajdhani, Orbitron, Bahnschrift, sans-serif';
const FONT_BUTTON = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';

const MENU_ICON_ASSET_KEYS = {
  launch: 'launch',
  target: 'sectorChallenge',
  hangar: 'shipHangar',
  bars: 'leaderboard',
  codex: 'threatCodex',
  star: 'achievements',
  gear: 'settings',
  music: 'music',
  help: 'howToPlay',
  exit: 'exit'
};

const DERIVED_MENU_ICON_SOURCES = {
  launch: '/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-launch-run.png',
  sectorChallenge: '/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-sector-challenge.png',
  shipHangar: '/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-ship-hangar.png',
  leaderboard: '/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-leaderboard.png',
  threatCodex: '/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-threat-codex.png',
  achievements: '/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-achievements.png',
  settings: '/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-settings.png',
  music: '/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-music.png',
  howToPlay: '/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-how-to-play.png',
  exit: '/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-exit.png'
};

function getMenuIconVariant() {
  try {
    const variant = new URLSearchParams(window.location.search).get('menuIconVariant');
    return variant === 'approved' || variant === 'full' ? 'approved' : 'derived';
  } catch {
    return 'derived';
  }
}

function normalizeFontFamily(fontFamily) {
  const family = String(fontFamily || '').trim();
  if (!family) return FONT_ARCADE;
  if (/orbitron|rajdhani/i.test(family)) return family;
  if (/courier new|monospace/i.test(family)) return FONT_MONO;
  return family;
}

function normalizeTextStyle(style = {}) {
  const next = { ...style };
  next.fontFamily = normalizeFontFamily(next.fontFamily);
  if (next.strokeThickness !== undefined) {
    next.stroke = {
      color: next.stroke || '#000000',
      width: next.strokeThickness
    };
    delete next.strokeThickness;
  }
  return next;
}

function createText(text, style) {
  return new PIXI.Text({ text, style: normalizeTextStyle(style) });
}

function refreshTextTexture(text, { forceGpuRefresh = false } = {}) {
  if (!text) return;
  if (forceGpuRefresh && typeof text.unload === 'function') {
    text.unload();
  }
  text.updateText?.(false);
  text.onViewUpdate?.();
}

function fitTextToWidth(text, maxWidth, { minScale = 0.62 } = {}) {
  if (!text || !Number.isFinite(maxWidth) || maxWidth <= 0) return 1;
  text.scale.set(1);
  refreshTextTexture(text);
  const measuredWidth = text.width || 0;
  const nextScale = measuredWidth > maxWidth
    ? Math.max(minScale, maxWidth / measuredWidth)
    : 1;
  text.scale.set(nextScale);
  refreshTextTexture(text);
  return nextScale;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function drawCutPanel(graphics, x, y, w, h, cut, fillStyle = null, strokeStyle = null) {
  const c = clampNumber(cut, 0, Math.min(w, h) * 0.45);
  graphics.moveTo(x + c, y);
  graphics.lineTo(x + w - c, y);
  graphics.lineTo(x + w, y + c);
  graphics.lineTo(x + w, y + h - c);
  graphics.lineTo(x + w - c, y + h);
  graphics.lineTo(x + c, y + h);
  graphics.lineTo(x, y + h - c);
  graphics.lineTo(x, y + c);
  graphics.lineTo(x + c, y);
  if (fillStyle) graphics.fill(fillStyle);
  if (strokeStyle) graphics.stroke(strokeStyle);
}

function boundsForDisplayObject(displayObject) {
  if (!displayObject?.getBounds) return null;
  try {
    const bounds = displayObject.getBounds();
    return {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      right: Math.round(bounds.x + bounds.width),
      bottom: Math.round(bounds.y + bounds.height)
    };
  } catch {
    return null;
  }
}

export class MenuScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.layoutUnsubscribe = null;
    this.kicker = null;
    this.title = null;
    this.subtitle = null;
    this.flavor = null;
    this.primaryHint = null;
    this.runModePanel = null;
    this.runModeBriefingTitle = null;
    this.runModeExplainer = null;
    this.launchDeckBounds = null;
    this.disclaimer = null;
    this.startBtn = null;
    this.scoutRunBtn = null;
    this.sectorStartBtn = null;
    this.sectorStartState = { available: false, checkpoints: [], selectedCheckpoint: null, highestReachedSector: 1 };
    this.selectedSectorStartIndex = 0;
    this.sectorSelectorOpen = false;
    this.sectorSelectorOverlay = null;
    this.sectorSelectorPanel = null;
    this.sectorSelectorTitle = null;
    this.sectorSelectorSubtitle = null;
    this.sectorSelectorGrid = null;
    this.sectorSelectorDetail = null;
    this.sectorSelectorLaunchButton = null;
    this.sectorSelectorLaunchBg = null;
    this.sectorSelectorLaunchText = null;
    this.sectorSelectorBackButton = null;
    this.sectorSelectorBackBg = null;
    this.sectorSelectorBackText = null;
    this.sectorSelectorHint = null;
    this.sectorSelectorItems = [];
    this.sectorSelectorSectors = [];
    this.selectedSectorSelectorIndex = 0;
    this.lastSectorSelectorPanelBounds = null;
    this.sectorSelectorOpenAge = 0;
    this.highscoreBtn = null;
    this.introBtn = null;
    this.storyBtn = null;
    this.threatCodexBtn = null;
    this.codexUnreadCount = 0;
    this.codexCuePollMs = 0;
    this.achievementsBtn = null;
    this.settingsBtn = null;
    this.helpBtn = null;
    this.exitBtn = null;
    this.exitNotice = null;
    this.exitNoticeTimeout = null;
    this.quitConfirmOpen = false;
    this.quitConfirmFocusIndex = 0;
    this.quitConfirmOverlay = null;
    this.quitConfirmPanel = null;
    this.quitConfirmTitle = null;
    this.quitConfirmButtons = [];
    this.musicBtn = null;
    this.controls = null;
    this.easter = null;
    this.stars = [];
    this.animationTime = 0;
    this.buildStamp = null;
    this.backdrop = null;
    this.backdropShade = null;
    this.idleMotionLayer = null;
    this.missionConsole = null;
    this.menuFx = null;
    this.menuPanel = null;
    this.menuDockBounds = null;
    this.radarSweep = null;
    this.radarBlips = [];
    this.crewComms = [];
    this.deckGlints = [];
    this.settingsOverlay = null;
    this.howToPlayOverlay = null;
    this.lastMenuPanelBounds = null;
    this.menuFontsReady = false;

    // PWA install prompt
    this.installPrompt = null;
    this.installButton = null;

    // PART A: Story rotation
    this.storyTypewriter = null;
    this.storyRotationTimer = null;
    this.skipHandler = null;
    this.keyHandler = null;
    this.menuGamepadActionWasPressed = false;
    this.launchingRun = false;
    this.menuOptions = [];
    this.focusedMenuIndex = 0;
    this.menuGamepadNavigator = new GamepadNavigator();
    this.lastInputDevice = 'keyboard';
    this.menuIconTextures = {};
    this.menuIconLoadPromise = null;
    this.menuIconVariant = getMenuIconVariant();
  }

  init() {
    this.container.removeChildren();
    this.stars = [];
    this.deckGlints = [];
    this.floatingBonusCores = [];
    this.heroBonusCore = null;
    this.heroBonusCore2 = null;
    this.animationTime = 0;
    this.launchingRun = false;
    this.menuGamepadActionWasPressed = false;
    this.menuGamepadNavigator.suppressUntilReleased();
    this.container.sortableChildren = true;
    this.createStarfield();
    this.initBackdrop();
    this.initMissionConsole();
    installMenuFx(this, {
      label: 'ui_menuFxMain',
      zIndex: 3,
      intensity: 1.32,
      density: 1.25,
      alpha: 0.86,
      playOpen: false
    });
    this.initIdleMotionLayer();
    this.loadMenuIconAssets();
    GameAssets.loadBonusCore().catch((error) => console.warn('[MenuScene] Bonus core preload failed:', error));
    GameAssets.loadCommsPortraits()
      .then(() => GameAssets.loadShips())
      .catch((error) => console.warn('[MenuScene] Menu asset preload failed:', error));
    this.initBonusDecorations();
    this.createElements();
    const menuTypographyReady = this.warmMenuFonts();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutMenu());
    this.layoutMenu();
    menuTypographyReady.finally(() => {
      if (this.game?.currentScene !== this) return;
      this.refreshMenuText();
      this.startAnimations();
    });
    AudioManager.playMusicContext('menu');
    console.log(`MenuScene build:${BUILD_ID}`);

    // TASK C: Setup PWA install prompt
    this.setupInstallPrompt();

    // PART A: Initialize story rotation
    this.initStoryRotation();
    this.setupPrimaryInput();
  }

  setupPrimaryInput() {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    this.keyHandler = (event) => {
      const target = event.target;
      const tagName = String(target?.tagName || '').toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) return;
      if (this.settingsOverlay || this.howToPlayOverlay) return;

      const isPrimaryStart = event.key === 'Enter' || event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space';
      const isMoveUp = event.key === 'ArrowUp' || event.code === 'ArrowUp';
      const isMoveDown = event.key === 'ArrowDown' || event.code === 'ArrowDown' || event.key === 'Tab';
      const isMoveLeft = event.key === 'ArrowLeft' || event.code === 'ArrowLeft';
      const isMoveRight = event.key === 'ArrowRight' || event.code === 'ArrowRight';
      const isCancel = event.key === 'Escape';
      if (!isPrimaryStart && !isMoveUp && !isMoveDown && !isMoveLeft && !isMoveRight && !isCancel) return;

      event.preventDefault();
      this.setInputDevice('keyboard');
      if (this.quitConfirmOpen) {
        if (isMoveLeft || isMoveRight || isMoveUp || isMoveDown || event.key === 'Tab') {
          this.setQuitConfirmFocus(this.quitConfirmFocusIndex === 0 ? 1 : 0);
        } else if (isCancel) {
          this.closeQuitConfirmation();
        } else {
          this.activateQuitConfirmation();
        }
        return;
      }
      if (this.sectorSelectorOpen) {
        if (isMoveUp) this.moveSectorSelectorFocus(-this.getSectorSelectorColumns());
        else if (isMoveDown) this.moveSectorSelectorFocus(this.getSectorSelectorColumns());
        else if (isMoveLeft) this.moveSectorSelectorFocus(-1);
        else if (isMoveRight) this.moveSectorSelectorFocus(1);
        else if (isCancel) this.closeSectorSelector();
        else this.activateSectorSelectorSelection();
        return;
      }
      if (isMoveUp) {
        this.moveMenuFocus(-1);
      } else if (isMoveDown) {
        this.moveMenuFocus(event.shiftKey ? -1 : 1);
      } else if (isMoveLeft) {
        this.moveMenuFocus(-1);
      } else if (isMoveRight) {
        this.moveMenuFocus(1);
      } else if (isCancel) {
        this.openQuitConfirmation();
      } else {
        this.activateFocusedMenuOption();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  // PART A: Story rotation system
  initStoryRotation() {
    tauntDirector.setScene(this);

    // Start with a fresh line
    this.rotateStory();

    // Rotate every 15 seconds
    this.storyRotationTimer = setInterval(() => {
      this.rotateStory();
    }, 15000);

    // Skip typewriter on any input
    this.skipHandler = () => {
      if (this.storyTypewriter && !this.storyTypewriter.complete) {
        this.storyTypewriter.skip();
      }
    };

    // Add skip listeners
    window.addEventListener('keydown', this.skipHandler);
    this.container.eventMode = 'static';
    this.container.on('pointerdown', this.skipHandler);
  }

  rotateStory() {
    if (!this.flavor) return;

    const line = tauntDirector.getRotatingText('start_story');
    this.flavor.text = ''; // Clear for typewriter
    this.storyTypewriter = new TypewriterText(this.flavor, line, { charDelay: 30 });
  }

  setupInstallPrompt() {
    // Only valid on mobile and if not already installed
    if (!isMobile() || isStandalone()) return;

    if (isIOS()) {
      // iOS doesn't support programmatic install, show hint
      this.createInstallUI('iOS');
    } else {
      // Android / Chrome supports deferred install prompt
      // Check if we already have a stashed prompt event from global scope or wait for it
      if (window.deferredInstallPrompt) {
        this.installPrompt = window.deferredInstallPrompt;
        this.createInstallUI('Android');
      } else {
        window.addEventListener('beforeinstallprompt', (e) => {
          // Prevent Chrome 67 and earlier from automatically showing the prompt
          e.preventDefault();
          // Stash the event so it can be triggered later.
          this.installPrompt = e;
          window.deferredInstallPrompt = e;

          this.createInstallUI('Android');
        }, { once: true });
      }
    }
  }

  createInstallUI(platform) {
    if (this.installButton) return; // Already created

    const { width, height } = this.game.app.screen;
    const isPortrait = height > width;

    // Create container for install UI
    this.installButton = new PIXI.Container();

    // Background pill
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, 160, 40, 20); // width, height, radius
    bg.fill({ color: 0x000000, alpha: 0.8 });
    bg.stroke({ width: 2, color: 0x00ffff });
    this.installButton.addChild(bg);

    // Icon (simple circle for now, or could use a sprite if available)
    const icon = new PIXI.Graphics();
    icon.circle(20, 20, 10);
    icon.fill({ color: 0x00ffff });
    // Minimal "download" arrow shape
    icon.moveTo(20, 14);
    icon.lineTo(20, 24);
    icon.lineTo(16, 20);
    icon.moveTo(20, 24);
    icon.lineTo(24, 20);
    icon.stroke({ width: 2, color: 0x000000 });
    this.installButton.addChild(icon);

    // Text
    const textStr = platform === 'iOS' ? 'INSTALL APP' : 'INSTALL APP';
    const text = createText(textStr, {
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
      fontSize: 16,
      fill: 0x00ffff,
      fontWeight: 'bold'
    });
    text.anchor.set(0, 0.5);
    text.x = 45;
    text.y = 20;
    this.installButton.addChild(text);

    // Interactive
    this.installButton.eventMode = 'static';
    this.installButton.cursor = 'pointer';

    // Position: Bottom center
    this.installButton.pivot.set(80, 40); // Pivot at bottom center
    this.installButton.x = width / 2;
    this.installButton.y = height - 80; // Above footer/version text

    // Interaction Logic
    this.installButton.on('pointertap', async () => {
      if (platform === 'iOS') {
        // Show iOS instructions popup
        alert('To install on iOS:\n1. Tap the Share button below\n2. Select "Add to Home Screen"');
      } else if (this.installPrompt) {
        // Show the native prompt
        this.installPrompt.prompt();
        // Wait for usage
        const { outcome } = await this.installPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        // We can't use the prompt again, discard it
        this.installPrompt = null;
        window.deferredInstallPrompt = null;
        // Hide button
        this.installButton.visible = false;
      }
    });

    this.container.addChild(this.installButton);
    this.installButton.zIndex = 20; // High z-index
  }

  async loadAndCreateDebugSprite() {
    console.log('DEBUG: Starting loadAndCreateDebugSprite');
    try {
      // 1. Explicitly load the asset (async/await)
      const texture = await PIXI.Assets.load({
        alias: 'bonus_core',
        src: AssetManifest.sprites.bonusCore
      });

      // 2. Validate texture BEFORE using dimensions
      console.log('DEBUG: Texture loaded', texture);
      if (!texture) {
        throw new Error('Texture invalid after load');
      }

      // 3. Create Sprite
      const sprite = new PIXI.Sprite(texture);
      sprite.label = 'DebugBonusCore';
      sprite.anchor.set(0.5);

      // 4. Set dimensions safely
      sprite.width = 120;
      sprite.scale.y = sprite.scale.x; // Keep aspect ratio

      // 5. Position (Center)
      const { width, height } = this.game.app.screen;
      sprite.x = width / 2;
      sprite.y = height / 2;
      sprite.alpha = 1;
      sprite.tint = 0xFFFFFF;

      // 6. Z-Index (Over stars(0), Under UI(10))
      sprite.zIndex = 5;

      // 7. Add to container
      this.container.addChild(sprite);
      console.log('DEBUG: Debug sprite added to container at', sprite.x, sprite.y);

    } catch (e) {
      console.error('DEBUG: Error loading bonus core', e);
      // Fallback visual
      const { width, height } = this.game.app.screen;
      const errText = createText('LOAD FAIL', { fill: 'red', fontSize: 24 });
      errText.anchor.set(0.5);
      errText.x = width / 2;
      errText.y = height / 2;
      errText.zIndex = 100;
      this.container.addChild(errText);
    }
  }

  createStarfield() {
    const { width, height } = this.game.app.screen;
    const starCount = 60;

    for (let i = 0; i < starCount; i++) {
      const star = new PIXI.Graphics();
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.35 + 0.15;
      star.circle(0, 0, size);
      star.fill({ color: 0xffffff, alpha });

      star.x = Math.random() * width;
      star.y = Math.random() * height;
      star.speedY = Math.random() * 0.3 + 0.1;
      star.twinkleSpeed = Math.random() * 0.02 + 0.01;
      star.twinkleOffset = Math.random() * Math.PI * 2;
      star.zIndex = -5;

      this.stars.push(star);
      this.container.addChild(star);
    }
  }

  async initBackdrop() {
    try {
      const texture = await PIXI.Assets.load({
        alias: 'generated_menu_backdrop',
        src: AssetManifest.generated.menuBackdrop
      });

      this.backdrop = new PIXI.Sprite(texture);
      this.backdrop.anchor.set(0.5);
      this.backdrop.alpha = 0.98;
      this.backdrop.zIndex = -20;
      this.container.addChild(this.backdrop);

      this.backdropShade = new PIXI.Graphics();
      this.backdropShade.zIndex = -15;
      this.container.addChild(this.backdropShade);

      this.layoutBackdrop();
    } catch (error) {
      console.warn('[MenuScene] Generated menu backdrop failed to load:', error);
    }
  }

  initIdleMotionLayer() {
    if (this.idleMotionLayer?.parent) {
      this.idleMotionLayer.parent.removeChild(this.idleMotionLayer);
    }
    this.idleMotionLayer?.destroy?.();
    this.idleMotionLayer = new PIXI.Graphics();
    this.idleMotionLayer.label = 'ui_menuIdleMotionLayer';
    this.idleMotionLayer.zIndex = -12;
    this.idleMotionLayer.eventMode = 'none';
    this.container.addChild(this.idleMotionLayer);
  }

  drawIdleMotionLayer() {
    if (!this.idleMotionLayer) return;
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const t = this.animationTime;
    const g = this.idleMotionLayer;
    const modalFade = this.sectorSelectorOpen ? 0.28 : 1;
    const enginePulse = 0.5 + Math.sin(t * 4.9) * 0.5;
    const engineFlicker = 0.5 + Math.sin(t * 12.7 + Math.sin(t * 2.1)) * 0.5;
    const cx = width * 0.5;
    const engineY = height * 0.685;
    const engineSpread = clampNumber(width * 0.058, 54, 116);
    const engineRadius = clampNumber(height * 0.026, 20, 34);
    const scanY = (height * 0.14 + ((t * height * 0.065) % (height * 0.54)));
    const driftX = Math.sin(t * 0.22) * width * 0.006;

    g.clear();
    g.rect(0, scanY, width, 2);
    g.fill({ color: 0x7fffd8, alpha: 0.055 * modalFade });
    g.rect(0, scanY + 5, width * 0.46, 1);
    g.fill({ color: 0xff55d9, alpha: 0.045 * modalFade });
    g.moveTo(width * 0.08 + driftX, height * 0.19);
    g.lineTo(width * 0.28 + driftX, height * 0.19);
    g.moveTo(width * 0.76 - driftX, height * 0.36);
    g.lineTo(width * 0.94 - driftX, height * 0.36);
    g.stroke({ color: 0x37f5ff, width: 1.25, alpha: 0.13 * modalFade });

    const engineSpecs = [
      { x: cx - engineSpread, color: 0xff8a32, radius: engineRadius * 0.76, phase: 0.2 },
      { x: cx, color: 0x37f5ff, radius: engineRadius * 1.16, phase: 1.2 },
      { x: cx + engineSpread, color: 0xffb45c, radius: engineRadius * 0.76, phase: 2.3 }
    ];
    engineSpecs.forEach((spec, index) => {
      const pulse = 0.58 + Math.sin(t * 6.4 + spec.phase) * 0.24 + engineFlicker * 0.18;
      const radius = spec.radius * (1 + pulse * 0.34);
      g.circle(spec.x, engineY + Math.sin(t * 4.2 + index) * 2, radius);
      g.fill({ color: spec.color, alpha: (0.075 + pulse * 0.05) * modalFade });
      g.circle(spec.x, engineY + 1, radius * 0.46);
      g.fill({ color: index === 1 ? 0xdffcff : 0xffef7e, alpha: (0.1 + enginePulse * 0.075) * modalFade });
      g.moveTo(spec.x, engineY + radius * 0.44);
      g.lineTo(spec.x + Math.sin(t * 7 + index) * 8, engineY + radius * (1.65 + pulse * 0.35));
      g.stroke({ color: spec.color, width: index === 1 ? 4.4 : 3, alpha: (0.17 + pulse * 0.1) * modalFade });
    });
  }

  async initMissionConsole() {
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();

    const consoleLayer = new PIXI.Container();
    consoleLayer.label = 'ui_menuMissionConsole';
    consoleLayer.zIndex = 2;
    consoleLayer.eventMode = 'passive';
    consoleLayer.interactiveChildren = true;
    consoleLayer.alpha = responsiveLayout.isMobile ? 0.42 : 0.78;
    this.missionConsole = consoleLayer;
    this.container.addChild(consoleLayer);

    this.createRadarDecoration(consoleLayer, width, height, responsiveLayout);
    this.createCommsFrames(consoleLayer, width, height, responsiveLayout);
    this.layoutMissionConsole(width, height);

    const portraits = AssetManifest.generated?.crewPortraits || [];
    portraits.slice(0, 2).forEach(async (src, index) => {
      try {
        const texture = await PIXI.Assets.load({
          alias: `menu_crew_portrait_${index}`,
          src
        });
        const card = this.crewComms[index];
        if (card && GameAssets.isValidTexture(texture)) {
          const sprite = new PIXI.Sprite(texture);
          sprite.anchor.set(0.5);
          sprite.width = card.avatarSize;
          sprite.height = card.avatarSize;
          sprite.alpha = 0.72;
          sprite.x = 0;
          sprite.y = -6;
          card.avatarSlot.addChild(sprite);
        }
      } catch (error) {
        console.warn('[MenuScene] Crew comm portrait failed to load:', error);
      }
    });
  }

  createRadarDecoration(parent, width, height, layout) {
    const radar = new PIXI.Container();
    radar.label = 'ui_menuRadar';
    radar.zIndex = 0;
    radar.eventMode = 'none';
    radar.interactiveChildren = false;
    parent.addChild(radar);
    this.radar = radar;

    const radius = layout.isMobile ? Math.min(width, height) * 0.34 : Math.min(width, height) * 0.42;
    for (let i = 0; i < 4; i++) {
      const ring = new PIXI.Graphics();
      ring.circle(0, 0, radius * (0.35 + i * 0.2));
      ring.stroke({ color: i % 2 ? 0xff55d9 : 0x37f5ff, width: 1, alpha: 0.12 - i * 0.014 });
      ring.label = 'ui_menuRadarRing';
      radar.addChild(ring);
    }

    const cross = new PIXI.Graphics();
    cross.moveTo(-radius, 0);
    cross.lineTo(radius, 0);
    cross.moveTo(0, -radius);
    cross.lineTo(0, radius);
    cross.stroke({ color: 0x37f5ff, width: 1, alpha: 0.1 });
    radar.addChild(cross);

    this.radarSweep = new PIXI.Graphics();
    this.radarSweep.moveTo(0, 0);
    this.radarSweep.lineTo(0, -radius * 0.94);
    this.radarSweep.stroke({ color: 0x7fffd8, width: 2, alpha: 0.28 });
    radar.addChild(this.radarSweep);

    this.radarBlips = [];
    const blipLayout = [
      { x: -0.32, y: -0.08, r: 3.5, phase: 0.1 },
      { x: 0.26, y: 0.18, r: 2.5, phase: 1.4 },
      { x: 0.08, y: -0.32, r: 2.8, phase: 2.1 },
      { x: -0.12, y: 0.34, r: 2.4, phase: 2.9 }
    ];
    blipLayout.forEach((item) => {
      const blip = new PIXI.Graphics();
      blip.circle(0, 0, item.r);
      blip.fill({ color: 0xffe76a, alpha: 0.55 });
      blip.x = item.x * radius;
      blip.y = item.y * radius;
      blip.phase = item.phase;
      radar.addChild(blip);
      this.radarBlips.push(blip);
    });
  }

  createCommsFrames(parent, width, height, layout) {
    this.crewComms = [];
    if (layout.isMobile) return;

    const specs = [
      {
        align: -1,
        role: 'NAVIGATOR',
        action: 'STORY BRIEFING',
        hint: 'OPEN INTRO',
        color: 0x37f5ff,
        accent: 0x7fffd8,
        onActivate: () => this.openStoryIntro()
      },
      {
        align: 1,
        role: 'PILOT',
        action: 'SHIP HANGAR',
        hint: 'SELECT SHIP',
        color: 0xff55d9,
        accent: 0xffd15c,
        onActivate: () => this.openShipSelect()
      }
    ];

    specs.forEach((spec, index) => {
      const card = new PIXI.Container();
      card.label = `ui_menuCrewComms_${index}`;
      card.zIndex = 2;
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.interactiveChildren = true;
      card.hitArea = new PIXI.Rectangle(-86, -76, 172, 158);
      card.avatarSize = 82;
      card.baseY = 0;

      const bg = new PIXI.Graphics();
      bg.roundRect(-78, -68, 156, 142, 8);
      bg.fill({ color: 0x051120, alpha: 0.66 });
      bg.stroke({ color: spec.color, width: 2, alpha: 0.84 });
      card.bg = bg;
      card.addChild(bg);

      const glow = new PIXI.Graphics();
      glow.roundRect(-86, -76, 172, 158, 8);
      glow.stroke({ color: spec.color, width: 1, alpha: 0.22 });
      card.glow = glow;
      card.addChild(glow);

      const inner = new PIXI.Graphics();
      inner.roundRect(-49, -52, 98, 82, 5);
      inner.stroke({ color: 0xffffff, width: 1, alpha: 0.16 });
      card.addChild(inner);

      const avatarSlot = new PIXI.Container();
      avatarSlot.y = -10;
      card.avatarSlot = avatarSlot;
      card.addChild(avatarSlot);

      const placeholder = new PIXI.Graphics();
      placeholder.roundRect(-41, -47, 82, 82, 5);
      placeholder.fill({ color: 0x0b2234, alpha: 0.74 });
      placeholder.stroke({ color: spec.color, width: 1, alpha: 0.36 });
      avatarSlot.addChild(placeholder);

      const scan = new PIXI.Graphics();
      scan.rect(-48, -22, 96, 2);
      scan.fill({ color: spec.accent, alpha: 0.34 });
      scan.label = 'ui_menuCrewScan';
      scan.phase = index * 1.4;
      card.scan = scan;
      card.addChild(scan);

      const role = createText(spec.role, {
        fontFamily: FONT_DISPLAY,
        fontSize: 13,
        fill: '#f6fbff',
        fontWeight: '800',
        letterSpacing: 0,
        align: 'center'
      });
      role.anchor.set(0.5);
      role.y = 38;
      card.addChild(role);

      const action = createText(spec.action, {
        fontFamily: FONT_ARCADE,
        fontSize: 12,
        fontWeight: '700',
        fill: spec.align < 0 ? '#37f5ff' : '#ff8ae8',
        align: 'center'
      });
      action.anchor.set(0.5);
      action.y = 54;
      card.addChild(action);

      const hintBg = new PIXI.Graphics();
      hintBg.roundRect(-54, 62, 108, 18, 5);
      hintBg.fill({ color: spec.color, alpha: 0.14 });
      hintBg.stroke({ color: spec.color, width: 1, alpha: 0.42 });
      card.addChild(hintBg);

      const hint = createText(spec.hint, {
        fontFamily: FONT_MONO,
        fontSize: 9,
        fontWeight: 'bold',
        fill: '#f6fbff',
        align: 'center'
      });
      hint.anchor.set(0.5);
      hint.y = 71;
      card.addChild(hint);

      card.align = spec.align;
      card.spec = spec;
      card.on('pointertap', () => spec.onActivate());
      card.on('pointerover', () => this.setCommsCardHover(card, true));
      card.on('pointerout', () => this.setCommsCardHover(card, false));
      parent.addChild(card);
      this.crewComms.push(card);
    });
  }

  getCinematicSubtitleText() {
    return `${translateText('DEFEND THE CABINET')}\n${translateText('SURVIVE THE BOSS WAVES')}`;
  }

  getMenuButtonList() {
    return [
      this.startBtn,
      this.scoutRunBtn,
      this.sectorStartBtn,
      this.highscoreBtn,
      this.storyBtn,
      this.threatCodexBtn,
      this.achievementsBtn,
      this.settingsBtn,
      this.musicBtn,
      this.helpBtn,
      this.exitBtn
    ].filter(Boolean);
  }

  loadMenuIconAssets() {
    const iconManifest = AssetManifest.generated?.menuIcons || {};
    if (!iconManifest || this.menuIconLoadPromise) return this.menuIconLoadPromise;
    this.menuIconLoadPromise = Promise.all(Object.entries(iconManifest).map(async ([key, src]) => {
      try {
        const variantSrc = this.menuIconVariant === 'derived' ? (DERIVED_MENU_ICON_SOURCES[key] || src) : src;
        const texture = await PIXI.Assets.load({ alias: `menu_icon_${this.menuIconVariant}_${key}`, src: variantSrc });
        if (GameAssets.isValidTexture(texture)) this.menuIconTextures[key] = texture;
      } catch (error) {
        console.warn(`[MenuScene] Menu icon failed to load: ${key}`, error);
      }
    })).then(() => {
      this.getMenuButtonList().forEach((button) => this.drawMenuButton(button, false));
      return this.menuIconTextures;
    });
    return this.menuIconLoadPromise;
  }

  createElements() {
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);

    this.kicker = createText('TINYFOUNDRY GAMES // NOVA RESPONSE DECK', {
      fontFamily: FONT_MONO,
      fontSize: Math.max(11, getResponsiveFontSize(layout, 'small')),
      fontWeight: '800',
      letterSpacing: 0,
      fill: '#7fffd8',
      stroke: '#020711',
      strokeThickness: 3,
      align: 'center'
    });
    this.kicker.anchor.set(0.5);
    this.kicker.alpha = 0;
    this.kicker.zIndex = 10;
    this.container.addChild(this.kicker);

    const titleSize = getResponsiveFontSize(layout, 'title');
    const titleBlur = layout.isMobile ? 4 : 8;

    this.title = createText('NOVA SWARM', {
      fontFamily: FONT_DISPLAY,
      fontSize: titleSize,
      fill: '#dffcff',
      fontWeight: '900',
      letterSpacing: 0,
      stroke: '#031527',
      strokeThickness: layout.isMobile ? 5 : 8,
      padding: layout.isMobile ? 12 : 26,
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: titleBlur + 10,
      dropShadowDistance: 0,
      dropShadowAlpha: layout.isMobile ? 0.7 : 0.95
    });
    this.title.anchor.set(0.5);
    this.title.alpha = 0;  // Start invisible for fade-in
    this.title.zIndex = 10;
    this.container.addChild(this.title);

    const subtitleSize = getResponsiveFontSize(layout, 'subtitle');
    this.subtitle = createText(this.getCinematicSubtitleText(), {
      fontFamily: FONT_ARCADE,
      fontSize: subtitleSize,
      fontWeight: '800',
      fill: '#37f5ff',
      stroke: '#050813',
      strokeThickness: 3,
      letterSpacing: 0,
      align: 'center'
    });
    this.subtitle.anchor.set(0.5);
    this.subtitle.alpha = 0;  // Start invisible
    this.container.addChild(this.subtitle);

    const storySize = getResponsiveFontSize(layout, 'body');
    const storyLineHeight = Math.round(storySize * 1.5);
    this.flavor = createText(
      'The swarm is not invading. It is answering an old arcade signal.\nLaunch before the broadcast learns your name.',
      {
        fontFamily: FONT_ARCADE,
        fontSize: storySize,
        fontWeight: '600',
        fill: '#f6fbff',
        stroke: '#020711',
        strokeThickness: 3,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: clampTextWidth(width * (layout.isMobile ? 0.9 : 0.7), layout),
        lineHeight: storyLineHeight
      }
    );
    this.flavor.anchor.set(0.5);
    this.flavor.alpha = 0;  // Start invisible
    this.flavor.zIndex = 10;
    this.container.addChild(this.flavor);

    this.primaryHint = createText(this.getPrimaryHintText(), {
      fontFamily: FONT_MONO,
      fontSize: Math.max(11, getResponsiveFontSize(layout, 'small')),
      fontWeight: '800',
      fill: '#8ffcff',
      stroke: '#020711',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.72, layout)
    });
    this.primaryHint.anchor.set(0.5);
    this.primaryHint.alpha = 0;
    this.primaryHint.zIndex = 10;
    this.container.addChild(this.primaryHint);

    this.runModePanel = new PIXI.Graphics();
    this.runModePanel.zIndex = 9;
    this.runModePanel.alpha = 0;
    this.container.addChild(this.runModePanel);

    const runModeSize = Math.max(11, getResponsiveFontSize(layout, 'small'));
    this.runModeBriefingTitle = createText('', {
      fontFamily: FONT_MONO,
      fontSize: Math.max(11, Math.round(runModeSize * 0.94)),
      fontWeight: '900',
      fill: '#ffd15c',
      stroke: '#020711',
      strokeThickness: 3,
      align: 'left',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.7, layout),
      lineHeight: Math.round(runModeSize * 1.18)
    });
    this.runModeBriefingTitle.anchor.set(0, 0);
    this.runModeBriefingTitle.alpha = 0;
    this.runModeBriefingTitle.zIndex = 10;
    this.container.addChild(this.runModeBriefingTitle);

    this.runModeExplainer = createText(this.getRunModeExplainerText(), {
      fontFamily: FONT_MONO,
      fontSize: runModeSize,
      fontWeight: '800',
      fill: '#dffcff',
      stroke: '#020711',
      strokeThickness: 3,
      align: 'left',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.7, layout),
      lineHeight: Math.round(runModeSize * 1.32)
    });
    this.runModeExplainer.anchor.set(0, 0);
    this.runModeExplainer.alpha = 0;
    this.runModeExplainer.zIndex = 10;
    this.container.addChild(this.runModeExplainer);

    this.disclaimer = createText(
      this.getDisclaimerText(layout),
      {
        fontFamily: FONT_MONO,
        fontSize: 14,
        fontWeight: 'bold',
        fill: '#f6fbff',
        stroke: '#052c3a',
        strokeThickness: 4,
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 6,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: clampTextWidth(width * 0.75, layout)
      }
    );
    this.disclaimer.anchor.set(0.5);
    this.disclaimer.alpha = 0;
    this.container.addChild(this.disclaimer);

    this.menuPanel = new PIXI.Graphics();
    this.menuPanel.zIndex = 8;
    this.menuPanel.alpha = 0;
    this.container.addChild(this.menuPanel);
    this.createSectorSelectorOverlay(layout);

    this.startBtn = this.createButton('MAYHEM RUN', layout, {
      variant: 'primary',
      accent: 0xffd15c,
      icon: 'launch',
      subLabel: 'RANKED'
    });
    this.configureRunModeCard(this.startBtn, { id: 'mayhem', secondary: 0xffef7e });
    this.startBtn.alpha = 0;  // Start invisible
    this.startBtn.on('pointerdown', () => {
      this.quickStartRun();
    });
    this.container.addChild(this.startBtn);

    this.scoutRunBtn = this.createButton('SCOUT RUN', layout, {
      accent: 0x7fffd8,
      icon: 'hangar',
      subLabel: 'PRACTICE'
    });
    this.configureRunModeCard(this.scoutRunBtn, { id: 'scout', secondary: 0x37f5ff });
    this.scoutRunBtn.alpha = 0;
    this.scoutRunBtn.on('pointerdown', () => this.quickStartRun(RUN_MODES.SCOUT));
    this.container.addChild(this.scoutRunBtn);

    this.sectorStartBtn = this.createButton('SECTOR RUN', layout, {
      accent: 0x37f5ff,
      icon: 'target',
      subLabel: 'CHECKPOINT PUSH'
    });
    this.configureRunModeCard(this.sectorStartBtn, { id: 'sector', secondary: 0xffd15c });
    this.sectorStartBtn.alpha = 0;
    this.sectorStartBtn.on('pointerdown', (event) => this.handleSectorStartPointerDown(event));
    this.container.addChild(this.sectorStartBtn);

    this.highscoreBtn = this.createButton('SHIP HANGAR', layout, { accent: 0x37f5ff, icon: 'hangar', subLabel: 'UPGRADE & CUSTOMIZE' });
    this.highscoreBtn.alpha = 0;  // Start invisible
    this.highscoreBtn.on('pointerdown', () => {
      this.openShipSelect();
    });
    this.container.addChild(this.highscoreBtn);

    this.storyBtn = this.createButton('LEADERBOARD', layout, { accent: 0x37f5ff, icon: 'bars', subLabel: 'GLOBAL RANKINGS' });
    this.storyBtn.alpha = 0;
    this.storyBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        // Removed annoying ui_open sound - no audio needed for viewing leaderboard
        AudioManager.playMusicContext('scoreboard');
        this.game.showHighscores();
      } catch (e) {
        console.error('[MenuScene] Highscore Error:', e);
      }
    });
    this.container.addChild(this.storyBtn);

    this.achievementsBtn = this.createButton('ACHIEVEMENTS', layout, { accent: 0x37f5ff, icon: 'star', subLabel: 'TRACK PROGRESS' });
    this.achievementsBtn.alpha = 0;
    this.achievementsBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        AudioManager.playSfx('ui_open', { volume: 0.28 });
        this.game.showAchievements();
      } catch (e) {
        console.error('[MenuScene] Achievements Error:', e);
      }
    });
    this.container.addChild(this.achievementsBtn);

    this.threatCodexBtn = this.createButton('THREAT CODEX', layout, { accent: 0x37f5ff, icon: 'codex', subLabel: 'ENEMY INTEL' });
    this.threatCodexBtn.alpha = 0;
    this.attachCodexSignalCue(this.threatCodexBtn);
    this.threatCodexBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        AudioManager.playSfx('codex_open', { volume: 0.16, minIntervalMs: 180 });
        this.game.showThreatCodex();
      } catch (e) {
        console.error('[MenuScene] Threat Codex Error:', e);
      }
    });
    this.container.addChild(this.threatCodexBtn);

    this.settingsBtn = this.createButton('SETTINGS', layout, { accent: 0x37f5ff, icon: 'gear', subLabel: 'AUDIO & VIDEO' });
    this.settingsBtn.alpha = 0;
    this.settingsBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        AudioManager.playSfx('ui_open', { volume: 0.35 });
        this.openSettingsOverlay();
      } catch (e) {
        console.error('[MenuScene] Settings Error:', e);
      }
    });
    this.container.addChild(this.settingsBtn);

    this.helpBtn = this.createButton('HOW TO PLAY', layout, { compact: true, accent: 0xffef7e, icon: 'help' });
    this.helpBtn.alpha = 0;
    this.helpBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        AudioManager.playSfx('ui_open', { volume: 0.32 });
        this.openHowToPlayOverlay();
      } catch (e) {
        console.error('[MenuScene] How To Play Error:', e);
      }
    });
    this.container.addChild(this.helpBtn);

    this.exitBtn = this.createButton('EXIT GAME', layout, {
      compact: true,
      variant: 'utilityDanger',
      accent: 0xff6b6b,
      icon: 'exit'
    });
    this.exitBtn.alpha = 0;
    this.exitBtn.on('pointerdown', () => {
      this.openQuitConfirmation();
    });
    this.container.addChild(this.exitBtn);

    this.exitNotice = createText('', {
      fontFamily: FONT_MONO,
      fontSize: Math.max(11, getResponsiveFontSize(layout, 'small')),
      fill: '#ffd15c',
      fontWeight: 'bold',
      stroke: '#04121d',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.7, layout)
    });
    this.exitNotice.anchor.set(0.5);
    this.exitNotice.alpha = 0;
    this.container.addChild(this.exitNotice);

    // ... (controls and easter code unchanged) ...

    const controlsText = this.getControlsText(layout);
    const controlsSize = getResponsiveFontSize(layout, 'small');
    this.controls = createText(controlsText, {
      fontFamily: FONT_MONO,
      fontSize: controlsSize,
      fill: '#cfefff',
      fontWeight: 'bold',
      stroke: '#04121d',
      strokeThickness: 3,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.9, layout),
      lineHeight: Math.round(controlsSize * 1.4)
    });
    this.controls.anchor.set(0.5);
    this.container.addChild(this.controls);

    this.easter = createText('', {
      fontFamily: FONT_MONO,
      fontSize: 10,
      fill: '#58717f'
    });
    this.easter.anchor.set(0.5);
    this.container.addChild(this.easter);

    // Mute/Music Toggle (Small corner button)
    this.musicBtn = this.createButton('MUSIC: ON', layout, {
      compact: true,
      accent: 0x7fffd8,
      icon: 'music',
      dynamicLabel: () => translateText(AudioManager.getSettings().musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF')
    });
    // Overwrite style for small button
    const scale = 0.6;
    this.musicBtn.scale.set(scale);
    this.musicBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        const enabled = AudioManager.toggleMute();
        const label = this.musicBtn._label;
        label.text = translateText(enabled ? 'MUSIC: ON' : 'MUSIC: OFF');
        this.refreshButtonCopy(this.musicBtn, { forceGpuRefresh: true });
      } catch (e) {
        console.error('[MenuScene] Music Toggle Error:', e);
      }
    });
    this.container.addChild(this.musicBtn);
    this.refreshSectorStartState();
    this.updateSectorStartButton();
    this.buildMenuNavigation();

    const stampFont = Math.max(10, getResponsiveFontSize(layout, 'small') - 2);
    this.buildStamp = createText(`build: ${BUILD_ID}`, {
      fontFamily: FONT_MONO,
      fontSize: stampFont,
      fill: '#66fffe',
      align: 'right'
    });
    this.buildStamp.anchor.set(1, 1);
    this.container.addChild(this.buildStamp);
  }

  warmMenuFonts() {
    if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve(false);

    const loadFonts = Promise.all([
      document.fonts.load('900 56px Orbitron'),
      document.fonts.load('800 20px Orbitron'),
      document.fonts.load('700 18px Rajdhani')
    ]);

    document.fonts.ready?.then?.(() => {
      this.menuFontsReady = true;
      this.refreshMenuText({ forceGpuRefresh: true });
    }).catch(() => {
      // System fallbacks are acceptable if a browser blocks local font loading.
    });

    return Promise.race([
      loadFonts.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 2800))
    ]).then((ready) => {
      this.menuFontsReady = ready;
      this.refreshMenuText({ forceGpuRefresh: ready });
      return ready;
    }).catch(() => {
      this.refreshMenuText();
      return false;
    });
  }

  refreshMenuText({ forceGpuRefresh = false } = {}) {
    [
      this.kicker,
      this.title,
      this.subtitle,
      this.flavor,
      this.primaryHint,
      this.runModePanel,
      this.runModeBriefingTitle,
      this.runModeExplainer,
      this.disclaimer,
      this.controls,
      this.easter,
      this.buildStamp,
      this.musicBtn?._label,
      this.startBtn?._label,
      this.scoutRunBtn?._label,
      this.sectorStartBtn?._label,
      this.highscoreBtn?._label,
      this.storyBtn?._label,
      this.threatCodexBtn?._label,
      this.achievementsBtn?._label,
      this.settingsBtn?._label,
      this.helpBtn?._label,
      this.exitBtn?._label,
      this.exitNotice,
      ...this.crewComms.flatMap((card) => card.children.filter((child) => child instanceof PIXI.Text))
    ].filter(Boolean).forEach((text) => refreshTextTexture(text, { forceGpuRefresh }));
    this.layoutMenu({ forceLabelGpuRefresh: forceGpuRefresh });
  }

  refreshMenuButtonLabel(button, maxWidth, { minScale = 0.68, forceGpuRefresh = false, texturePadding = null } = {}) {
    const label = button?._label;
    if (!label) return 1;
    const targetPadding = Number.isFinite(texturePadding)
      ? texturePadding
      : (this.menuFontsReady ? 44 : 36);
    if (label.style.padding !== targetPadding) {
      label.style.padding = targetPadding;
      forceGpuRefresh = true;
    }
    refreshTextTexture(label, { forceGpuRefresh });
    const scale = fitTextToWidth(label, maxWidth, { minScale });
    refreshTextTexture(label, { forceGpuRefresh });
    return scale;
  }

  refreshMenuButtonSubLabel(button, maxWidth, { minScale = 0.72, forceGpuRefresh = false } = {}) {
    const label = button?._sublabel;
    if (!label) return 1;
    refreshTextTexture(label, { forceGpuRefresh });
    const scale = fitTextToWidth(label, maxWidth, { minScale });
    refreshTextTexture(label, { forceGpuRefresh });
    return scale;
  }

  refreshButtonCopy(button, { forceGpuRefresh = false } = {}) {
    if (!button) return;
    if (button._dynamicLabel) {
      button._label.text = button._dynamicLabel();
    } else if (button._labelKey) {
      button._label.text = translateText(button._labelKey);
    }
    if (button._dynamicSubLabel) {
      button._sublabel.text = button._dynamicSubLabel();
    } else if (button._sublabelKey) {
      button._sublabel.text = translateText(button._sublabelKey);
    }
    if (button._bodyLabel) {
      if (button._dynamicBodyLabel) {
        button._bodyLabel.text = button._dynamicBodyLabel();
      } else if (button._bodyKey) {
        button._bodyLabel.text = translateText(button._bodyKey);
      } else {
        button._bodyLabel.text = '';
      }
    }
    if (button._isRunModeCard) {
      const w = button._btnWidth || 320;
      const compactCard = (button._btnHeight || 0) < 92;
      const labelMaxWidth = Math.max(compactCard ? 148 : 160, w - (compactCard ? 78 : 128));
      this.refreshMenuButtonLabel(button, labelMaxWidth, { minScale: compactCard ? 0.58 : 0.7, forceGpuRefresh });
      this.refreshMenuButtonSubLabel(button, labelMaxWidth, { minScale: compactCard ? 0.5 : 0.62, forceGpuRefresh });
      if (button._bodyLabel) {
        button._bodyLabel.style.wordWrapWidth = Math.max(180, w - 42);
        refreshTextTexture(button._bodyLabel, { forceGpuRefresh });
        fitTextToWidth(button._bodyLabel, Math.max(180, w - 42), { minScale: 0.68 });
        refreshTextTexture(button._bodyLabel, { forceGpuRefresh });
      }
      return;
    }
    const isPrimaryButton = button._variant === 'primary';
    const isCompactButton = (button._btnHeight || 0) <= 38;
    const isDockButton = Number.isFinite(button._dockIndex);
    const isNarrowDockButton = isDockButton && !isPrimaryButton && (button._btnWidth || 0) < 158;
    const labelInset = button._iconType
      ? (isPrimaryButton ? 138 : (isCompactButton ? 40 : (isNarrowDockButton ? 58 : 92)))
      : (isCompactButton ? 36 : 48);
    const labelRightPad = isPrimaryButton ? 16 : (isCompactButton ? 12 : 10);
    const labelMaxWidth = Math.max(36, (button._btnWidth || 180) - labelInset - labelRightPad);
    const fitMinScale = Number.isFinite(button._labelMinScale)
      ? button._labelMinScale
      : (isDockButton ? (isPrimaryButton ? 0.42 : (isNarrowDockButton ? 0.38 : 0.46)) : 0.62);
    const labelTexturePadding = isDockButton
      ? (isCompactButton ? 12 : (isPrimaryButton ? 24 : 18))
      : null;
    const sublabelFitMinScale = isDockButton ? (isNarrowDockButton ? 0.38 : 0.5) : 0.62;
    this.refreshMenuButtonLabel(button, labelMaxWidth, { minScale: fitMinScale, forceGpuRefresh, texturePadding: labelTexturePadding });
    this.refreshMenuButtonSubLabel(button, labelMaxWidth, { minScale: sublabelFitMinScale, forceGpuRefresh });
  }

  async initBonusDecorations() {
    try {
      const { width, height } = this.game.app.screen;
      this.deckGlints = [];

      for (let i = 0; i < 5; i++) {
        const glint = new PIXI.Graphics();
        const y = height * (0.72 + i * 0.035);
        glint.moveTo(width * 0.04, y);
        glint.lineTo(width * (0.3 + i * 0.08), y - height * (0.05 + i * 0.01));
        glint.stroke({ color: i % 2 ? 0xff55d9 : 0x37f5ff, width: 1, alpha: 0.16 });
        glint.zIndex = 1;
        glint.phase = i * 0.7;
        this.container.addChild(glint);
        this.deckGlints.push(glint);
      }

    } catch (e) {
      console.error('Menu deck glints failed:', e);
    }
  }



  layoutMenu({ forceLabelGpuRefresh = false } = {}) {
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    const safeMargin = responsiveLayout.safeArea;
    const isMobileLayout = layout.isMobile || width < 760;
    const isShortLayout = height < 820;
    this.layoutBackdrop(width, height);
    this.layoutMissionConsole(width, height);
    resizeMenuFx(this, width, height);

    const titleSize = Math.round(clampNumber(width * (isMobileLayout ? 0.076 : 0.035), isMobileLayout ? 38 : 46, isMobileLayout ? 58 : 72));
    const subtitleSize = Math.round(clampNumber(width * 0.009, isMobileLayout ? 12 : 14, isMobileLayout ? 16 : 18));
    const controlsSize = getResponsiveFontSize(layout, 'small');
    const titleX = isMobileLayout ? width * 0.5 : clampNumber(width * 0.05, 44, 96);
    const titleY = safeMargin.top + clampNumber(height * 0.075, isMobileLayout ? 46 : 58, isMobileLayout ? 72 : 92);
    const titleWidth = isMobileLayout ? width * 0.88 : Math.min(width * 0.42, 560);

    this.kicker.visible = false;
    this.kicker.alpha = 0;
    this.title.style.fontSize = titleSize;
    this.title.style.stroke = { color: '#031527', width: isMobileLayout ? 5 : 7 };
    this.title.style.letterSpacing = 0;
    this.title.style.padding = isMobileLayout ? 12 : 26;
    this.title.anchor.set(isMobileLayout ? 0.5 : 0, 0.5);
    this.title.x = titleX;
    this.title.y = titleY;
    this.subtitle.text = this.getCinematicSubtitleText();
    this.subtitle.style.fontSize = subtitleSize;
    this.subtitle.style.align = isMobileLayout ? 'center' : 'left';
    this.subtitle.style.wordWrap = true;
    this.subtitle.style.wordWrapWidth = clampTextWidth(titleWidth, layout);
    this.subtitle.style.lineHeight = Math.round(subtitleSize * 1.28);
    this.subtitle.anchor.set(isMobileLayout ? 0.5 : 0, 0.5);
    this.subtitle.x = titleX;
    this.subtitle.y = titleY + titleSize * (isMobileLayout ? 0.78 : 0.74);
    this.title._layoutY = this.title.y;
    this.subtitle._layoutY = this.subtitle.y;

    this.flavor.visible = false;
    this.flavor.alpha = 0;
    this.primaryHint.visible = false;
    this.runModePanel.visible = true;
    this.runModeBriefingTitle.visible = true;
    this.runModeExplainer.visible = true;
    this.disclaimer.visible = false;
    this.controls.visible = false;
    this.primaryHint.text = this.getPrimaryHintText();
    this.primaryHint.style.fontSize = Math.max(10, controlsSize);
    const runModeBriefing = this.getRunModeBriefing();
    this.runModeBriefingTitle.text = translateText('MISSION BRIEFING') + ' // ' + runModeBriefing.title;
    this.runModeExplainer.text = runModeBriefing.menuBody || runModeBriefing.body;
    this.disclaimer.text = this.getDisclaimerText(layout);

    this.title.updateText?.(false);
    this.subtitle.updateText?.(false);
    this.primaryHint.updateText?.(false);
    this.runModeBriefingTitle.updateText?.(false);
    this.runModeExplainer.updateText?.(false);
    fitTextToWidth(this.title, titleWidth, { minScale: 0.54 });
    fitTextToWidth(this.subtitle, titleWidth, { minScale: 0.72 });

    this.refreshSectorStartState();
    this.updateSectorStartButton({ forceGpuRefresh: forceLabelGpuRefresh });
    const runModeCards = [
      this.startBtn,
      this.scoutRunBtn,
      this.sectorStartBtn
    ].filter(Boolean);
    const dockButtons = [
      this.highscoreBtn,
      this.storyBtn,
      this.threatCodexBtn,
      this.achievementsBtn,
      this.settingsBtn
    ].filter(Boolean);

    const marginX = clampNumber(width * 0.018, 16, 34);
    const gap = clampNumber(width * 0.007, 8, 16);
    const dockWidth = Math.max(0, width - marginX * 2);
    const dockHeight = clampNumber(height * 0.118, isShortLayout ? 82 : 96, isMobileLayout ? 112 : 128);
    const safeBottomEdge = Number.isFinite(safeMargin.bottom)
      ? (safeMargin.bottom > height * 0.5 ? safeMargin.bottom : height - safeMargin.bottom)
      : height;
    const dockBottom = Math.min(height - 8, safeBottomEdge - clampNumber(height * 0.015, 10, 18));
    const tileHeight = dockHeight - (isShortLayout ? 14 : 18);
    const dockTop = Math.max(8, dockBottom - dockHeight);
    this.menuDockBounds = {
      x: marginX,
      y: dockTop,
      width: dockWidth,
      height: Math.min(height - dockTop - 8, dockHeight),
      right: marginX + dockWidth,
      bottom: Math.min(height - 8, dockTop + dockHeight)
    };
    const briefingHeight = Math.round(clampNumber(height * 0.15, isShortLayout ? 118 : 132, isShortLayout ? 142 : 164));
    const titleClearForDeck = (this.subtitle?.y || safeMargin.top) + ((this.subtitle?.height || 0) / 2) + 12;
    const cardGap = clampNumber(height * 0.008, 6, 9);
    const cardWidth = Math.round(clampNumber(width * 0.17, isMobileLayout ? 238 : 246, isMobileLayout ? 300 : 320));
    const cardHeight = Math.round(clampNumber(height * 0.052, isShortLayout ? 44 : 50, isMobileLayout ? 58 : 62));
    const deckHeight = cardHeight * 3 + cardGap * 2;
    const deckX = Math.round(isMobileLayout
      ? (width - cardWidth) / 2
      : clampNumber(width * 0.018, 20, 46));
    const minimumDeckTop = titleClearForDeck + clampNumber(height * 0.055, 34, 58);
    const preferredDeckTop = safeMargin.top + clampNumber(height * 0.34, isMobileLayout ? 200 : 246, isMobileLayout ? 272 : 326);
    const cardTop = Math.round(clampNumber(
      preferredDeckTop,
      minimumDeckTop,
      Math.max(safeMargin.top + 120, dockTop - deckHeight - clampNumber(height * 0.022, 14, 24))
    ));
    this.launchDeckBounds = {
      x: deckX,
      y: Math.round(cardTop),
      width: cardWidth,
      height: Math.round(deckHeight),
      right: Math.round(deckX + cardWidth),
      bottom: Math.round(cardTop + deckHeight)
    };
    runModeCards.forEach((button, index) => {
      if (!button) return;
      button.visible = true;
      button._btnWidth = cardWidth;
      button._btnHeight = cardHeight;
      button._variant = button === this.startBtn ? 'primary' : 'secondary';
      button._dockIndex = null;
      button._launchDeckIndex = index;
      button._label.style.fontSize = Math.round(clampNumber(cardWidth * 0.05, 13, 17));
      button._sublabel.style.fontSize = Math.round(clampNumber(cardWidth * 0.031, 8, 10));
      if (button._bodyLabel) {
        button._bodyLabel.text = '';
        button._bodyLabel.visible = false;
      }
      this.refreshButtonCopy(button, { forceGpuRefresh: forceLabelGpuRefresh });
      button.x = deckX + cardWidth / 2;
      button.y = cardTop + index * (cardHeight + cardGap) + cardHeight / 2;
      button._layoutY = button.y;
      button._motionY = button.y;
      if (!Number.isFinite(button._motionScale)) button._motionScale = 1;
      this.drawMenuButton(button, false);
    });

    const remainingWidth = dockWidth - gap * (dockButtons.length - 1);
    const secondaryWidth = Math.max(isMobileLayout ? 132 : 156, remainingWidth / Math.max(1, dockButtons.length));
    let cursorX = marginX;

    dockButtons.forEach((button, index) => {
      if (!button) return;
      const btnWidth = secondaryWidth;
      button.visible = true;
      button._btnWidth = btnWidth;
      button._btnHeight = tileHeight;
      button._variant = button === this.exitBtn ? 'danger' : 'secondary';
      button._dockIndex = index;
      button._label.style.fontSize = Math.round(clampNumber(btnWidth * 0.056, 11, 16));
      button._sublabel.style.fontSize = Math.round(clampNumber(btnWidth * 0.039, 8, 11));
      this.refreshButtonCopy(button, { forceGpuRefresh: forceLabelGpuRefresh });
      button.x = cursorX + btnWidth / 2;
      button.y = dockTop + dockHeight * (isShortLayout ? 0.54 : 0.56);
      button._layoutY = button.y;
      button._motionY = button.y;
      if (!Number.isFinite(button._motionScale)) button._motionScale = 1;
      this.drawMenuButton(button, false);
      cursorX += btnWidth + gap;
    });

    const briefingWidth = Math.min(
      width - marginX * 2,
      Math.round(clampNumber(width * (isMobileLayout ? 0.36 : 0.29), isMobileLayout ? 360 : 420, isMobileLayout ? 470 : 560))
    );
    const briefingX = Math.round(clampNumber(
      width - marginX - briefingWidth,
      Math.max((this.launchDeckBounds?.right || 0) + 42, width * 0.61),
      width - marginX - briefingWidth
    ));
    const plannedUtilityHeight = isMobileLayout ? 28 : 32;
    const plannedUtilityGap = isMobileLayout ? 6 : 7;
    const plannedUtilityBottom = safeMargin.top + (isMobileLayout ? 22 : 28) + (plannedUtilityHeight + plannedUtilityGap) * 2 + plannedUtilityHeight / 2;
    const utilityBottom = Math.max(
      plannedUtilityBottom,
      boundsForDisplayObject(this.musicBtn)?.bottom || 0,
      boundsForDisplayObject(this.helpBtn)?.bottom || 0,
      boundsForDisplayObject(this.exitBtn)?.bottom || 0
    );
    const titleClearY = (this.subtitle?.y || safeMargin.top) + ((this.subtitle?.height || 0) / 2) + 14;
    const briefingY = Math.round(clampNumber(
      Math.max(titleClearY, utilityBottom + clampNumber(height * 0.02, 14, 24)),
      safeMargin.top + clampNumber(height * 0.12, 92, 142),
      Math.max(safeMargin.top + 90, dockTop - briefingHeight - 24)
    ));
    const briefingPadX = isMobileLayout ? 18 : 22;
    const briefingPadY = isShortLayout ? 12 : 14;
    this.runModeBriefingTitle.style.fontSize = isMobileLayout ? 12 : 14;
    this.runModeBriefingTitle.style.wordWrapWidth = briefingWidth - briefingPadX * 2;
    this.runModeBriefingTitle.x = briefingX + briefingPadX;
    this.runModeBriefingTitle.y = briefingY + briefingPadY;
    this.runModeBriefingTitle.alpha = this.runModeBriefingTitle.alpha || 1;
    this.runModeExplainer.style.fontSize = Math.max(11, isMobileLayout ? controlsSize - 1 : controlsSize);
    this.runModeExplainer.style.wordWrapWidth = briefingWidth - briefingPadX * 2;
    this.runModeExplainer.style.lineHeight = Math.round(this.runModeExplainer.style.fontSize * 1.24);
    this.runModeExplainer.x = briefingX + briefingPadX;
    this.runModeExplainer.y = briefingY + briefingPadY + (isShortLayout ? 26 : 31);
    this.runModeExplainer.alpha = this.runModeExplainer.alpha || 1;
    this.runModePanel.alpha = this.runModePanel.alpha || 1;
    this.runModePanel._briefingBounds = {
      x: Math.round(briefingX),
      y: Math.round(briefingY),
      width: Math.round(briefingWidth),
      height: Math.round(briefingHeight),
      right: Math.round(briefingX + briefingWidth),
      bottom: Math.round(briefingY + briefingHeight)
    };
    this.runModePanel._briefingAccent = runModeBriefing.accent;
    this.runModePanel._briefingSecondary = runModeBriefing.secondary;
    this.drawRunModeExplainerPanel(layout, width, height);

    if (this.exitNotice) {
      this.exitNotice.style.fontSize = Math.max(11, controlsSize);
      this.exitNotice.style.align = 'center';
      this.exitNotice.style.wordWrapWidth = clampTextWidth(width * 0.54, layout);
      this.exitNotice.updateText?.(false);
      fitTextToWidth(this.exitNotice, width * 0.54, { minScale: 0.72 });
      this.exitNotice.visible = Boolean(this.exitNotice.text);
      this.exitNotice.x = width / 2;
      this.exitNotice.y = dockBottom - dockHeight - 18;
    }

    this.drawMenuPanel(layout);

    this.easter.x = marginX + 2;
    this.easter.y = dockBottom + 4;
    this.easter.anchor.set(0, 0.5);

    const utilityWidth = isMobileLayout ? 132 : 158;
    const utilityHeight = isMobileLayout ? 28 : 32;
    const utilityGap = isMobileLayout ? 6 : 7;
    const utilityButtons = [this.musicBtn, this.helpBtn, this.exitBtn].filter(Boolean);
    utilityButtons.forEach((button, index) => {
      button.visible = true;
      button._btnWidth = utilityWidth;
      button._btnHeight = utilityHeight;
      button._variant = button === this.exitBtn ? 'utilityDanger' : 'utility';
      button._label.style.fontSize = Math.max(9, controlsSize - 1);
      this.refreshButtonCopy(button, { forceGpuRefresh: forceLabelGpuRefresh });
      button.scale.set(1);
      button.x = width - marginX - utilityWidth / 2;
      button.y = safeMargin.top + (isMobileLayout ? 22 : 28) + index * (utilityHeight + utilityGap);
      button._layoutY = button.y;
      button._motionY = button.y;
      if (!Number.isFinite(button._motionScale)) button._motionScale = 1;
      this.drawMenuButton(button, false);
    });

    if (this.buildStamp) {
      this.buildStamp.x = width - layout.padding / 2;
      this.buildStamp.y = height - layout.padding / 2;
    }

    // Reposition install button if exists
    if (this.installButton && this.installButton.visible) {
      this.installButton.x = width / 2;
      this.installButton.y = height - 100;
    }
    this.applyMenuModalDimming();
    this.layoutSectorSelector(layout, width, height);
    this.layoutQuitConfirmation(width, height);
  }

  applyMenuModalDimming() {
    const modalOpen = Boolean(this.sectorSelectorOpen || this.quitConfirmOpen);
    const dockAlpha = 0.42;
    const utilityAlpha = 0.34;
    [
      this.startBtn,
      this.scoutRunBtn,
      this.sectorStartBtn,
      this.highscoreBtn,
      this.storyBtn,
      this.threatCodexBtn,
      this.achievementsBtn,
      this.settingsBtn
    ].filter(Boolean).forEach((button) => {
      if (modalOpen) {
        if (button._preSelectorAlpha == null) button._preSelectorAlpha = button.alpha;
        button.alpha = dockAlpha;
      } else if (button._preSelectorAlpha != null) {
        button.alpha = Math.max(button._preSelectorAlpha, 1);
        button._preSelectorAlpha = null;
      }
    });
    [this.musicBtn, this.helpBtn, this.exitBtn].filter(Boolean).forEach((button) => {
      if (modalOpen) {
        if (button._preSelectorAlpha == null) button._preSelectorAlpha = button.alpha;
        button.alpha = utilityAlpha;
      } else if (button._preSelectorAlpha != null) {
        button.alpha = Math.max(button._preSelectorAlpha, 1);
        button._preSelectorAlpha = null;
      }
    });
    [
      [this.menuPanel, 0.72],
      [this.runModePanel, 0.14],
      [this.runModeBriefingTitle, 0.06],
      [this.runModeExplainer, 0.06]
    ].forEach(([item, alpha]) => {
      if (!item) return;
      if (modalOpen) {
        if (item._preSelectorAlpha == null) item._preSelectorAlpha = item.alpha;
        item.alpha = alpha;
      } else if (item._preSelectorAlpha != null) {
        item.alpha = Math.max(item._preSelectorAlpha, 1);
        item._preSelectorAlpha = null;
      }
    });
  }

  getControlsText(layout) {
    if (layout.isMobile) return 'Joystick: Move | FIRE button: Shoot';
    return this.lastInputDevice === 'controller'
      ? 'Left Stick/D-Pad: Move | A/RT: Shoot | B/LB: Dodge | Start: Pause'
      : 'WASD/Arrows: Move | Space: Shoot | Shift: Dodge | P/Esc: Pause';
  }

  getDisclaimerText(layout) {
    const objective = `${translateText('DEFEND THE CABINET')} // ${translateText('SURVIVE THE BOSS WAVES')}`;
    return layout.isMobile ? objective : `${objective}\n${this.getControlsText(layout)}`;
  }

  getPrimaryHintText() {
    if (this.sectorSelectorOpen) {
      return this.lastInputDevice === 'controller'
        ? translateText('D-PAD/STICK: SELECT // A: START // B: BACK')
        : translateText('ARROWS: SELECT // ENTER/SPACE: START // ESC: BACK');
    }
    return this.lastInputDevice === 'controller'
      ? 'D-PAD/STICK: NAVIGATE // A: CONFIRM // B: BACK'
      : 'ARROWS: NAVIGATE // ENTER/SPACE: CONFIRM // ESC: BACK';
  }

  getRunModeExplainerText() {
    return this.getRunModeBriefing().body;
  }

  getRunModeBriefing() {
    const focused = this.getSelectedMenuOptionId();
    if (focused === 'scout') {
      return {
        id: 'scout',
        title: translateText('SCOUT RUN'),
        accent: 0x7fffd8,
        secondary: 0x37f5ff,
        menuBody: [
          translateText('UNRANKED PRACTICE'),
          translateText('Lower pressure practice for testing ships and learning routes. No leaderboard submission, achievements, career XP, or checkpoint unlocks.')
        ].join('\n'),
        body: translateText('Lower pressure practice for testing ships and learning routes. No leaderboard submission, achievements, career XP, or checkpoint unlocks.')
      };
    }
    if (focused === 'sectorStart') {
      return {
        id: 'sectorStart',
        title: translateText('SECTOR RUN'),
        accent: 0x37f5ff,
        secondary: 0xffd15c,
        menuBody: [
          translateText('CHECKPOINT PUSH'),
          translateText('Jump to checkpoints unlocked in Mayhem. Push deeper for fun, routing, and practice without replaying the early sectors. No achievements. Sector records are separate.')
        ].join('\n'),
        body: translateText('Jump to checkpoints unlocked in Mayhem. Push deeper for fun, routing, and practice without replaying the early sectors. No achievements. Sector records are separate.')
      };
    }
    if (focused === 'launch') {
      return {
        id: 'launch',
        title: translateText('MAYHEM RUN'),
        accent: 0xffd15c,
        secondary: 0x7fffd8,
        menuBody: [
          translateText('MAIN RANKED RUN'),
          translateText('Start from Sector 1 and fight as far as you can. Scores go to the global leaderboard. Achievements, career XP, and checkpoint unlocks happen here.')
        ].join('\n'),
        body: translateText('Start from Sector 1 and fight as far as you can. Scores go to the global leaderboard. Achievements, career XP, and checkpoint unlocks happen here.')
      };
    }
    return {
      id: 'overview',
      title: translateText('RUN MODES'),
      accent: 0x37f5ff,
      secondary: 0xffd15c,
      menuBody: [
        translateText('MAYHEM RUN: ranked. SCOUT RUN: practice. SECTOR RUN: checkpoint starts.'),
        translateText('Mayhem is ranked. Scout is unranked practice. Sector Run starts from unlocked Mayhem checkpoints.')
      ].join('\n'),
      body: translateText('Mayhem is ranked. Scout is unranked practice. Sector Run starts from unlocked Mayhem checkpoints.')
    };
  }

  drawRunModeExplainerPanel(layout, width, height) {
    if (!this.runModePanel) return;
    const panelBounds = this.runModePanel._briefingBounds;
    if (!panelBounds) return;
    const x = panelBounds.x;
    const y = panelBounds.y;
    const panelWidth = panelBounds.width;
    const panelHeight = panelBounds.height;
    const accent = this.runModePanel._briefingAccent || 0x37f5ff;
    const secondary = this.runModePanel._briefingSecondary || 0x7fffd8;

    this.runModePanel.clear();
    drawCutPanel(this.runModePanel, x, y, panelWidth, panelHeight, 10, { color: 0x031323, alpha: 0.78 }, { color: accent, width: 1.5, alpha: 0.82 });
    this.runModePanel.rect(x + 10, y + 9, 3, Math.max(6, panelHeight - 18));
    this.runModePanel.fill({ color: secondary, alpha: 0.9 });
    this.runModePanel.rect(x + panelWidth - 13, y + 9, 3, Math.max(6, panelHeight - 18));
    this.runModePanel.fill({ color: accent, alpha: 0.64 });
    this.runModePanel.rect(x + 22, y + 38, panelWidth - 44, 1);
    this.runModePanel.fill({ color: 0xffffff, alpha: 0.16 });
    this.runModePanel.rect(x + 22, y + panelHeight - 10, panelWidth - 44, 1);
    this.runModePanel.fill({ color: secondary, alpha: 0.2 });
  }

  drawMenuPanel(layout) {
    if (!this.menuPanel || !this.startBtn || !this.settingsBtn) return;

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const isShortLayout = height < 820;
    const dockBounds = this.menuDockBounds;
    if (dockBounds) {
      const x = Math.max(8, dockBounds.x - 6);
      const y = Math.max(8, dockBounds.y - 4);
      const panelWidth = Math.min(width - x - 8, dockBounds.width + 12);
      const panelHeight = Math.min(height - y - 8, dockBounds.height + 8);
      this.lastMenuPanelBounds = {
        x,
        y,
        width: panelWidth,
        height: panelHeight,
        right: x + panelWidth,
        bottom: y + panelHeight
      };

      this.menuPanel.clear();
      const dockSweep = ((this.animationTime * Math.max(260, panelWidth / 3.6)) % Math.max(1, panelWidth + 240)) - 120;
      const dockPulse = 0.5 + Math.sin(this.animationTime * 2.2) * 0.5;
      this.menuPanel.roundRect(x + 6, y + 10, panelWidth, panelHeight, 5);
      this.menuPanel.fill({ color: 0x000000, alpha: 0.46 });
      drawCutPanel(this.menuPanel, x - 2, y - 2, panelWidth + 4, panelHeight + 4, 12, { color: 0x37f5ff, alpha: 0.045 }, { color: 0x37f5ff, width: 1, alpha: 0.26 });
      drawCutPanel(this.menuPanel, x, y, panelWidth, panelHeight, 10, { color: 0x020711, alpha: 0.68 }, { color: 0x37f5ff, width: 1, alpha: 0.5 });
      drawCutPanel(this.menuPanel, x + 6, y + 6, panelWidth - 12, panelHeight - 12, 8, { color: 0x062034, alpha: 0.32 }, { color: 0x7fffd8, width: 1, alpha: 0.2 });
      this.menuPanel.rect(x + 2, y + 2, panelWidth - 4, Math.max(28, panelHeight * 0.42));
      this.menuPanel.fill({ color: 0x0b2a42, alpha: 0.28 });
      this.menuPanel.rect(x + 16, y + 12, panelWidth - 32, 2);
      this.menuPanel.fill({ color: 0x7fffd8, alpha: 0.5 });
      const sweepTopX = x + clampNumber(dockSweep, 18, Math.max(18, panelWidth - 142));
      this.menuPanel.rect(sweepTopX, y + 9, Math.min(180, panelWidth * 0.18), 4);
      this.menuPanel.fill({ color: 0xdffcff, alpha: 0.3 + dockPulse * 0.18 });
      this.menuPanel.rect(sweepTopX + 16, y + 14, Math.min(132, panelWidth * 0.12), 1);
      this.menuPanel.fill({ color: 0x37f5ff, alpha: 0.24 + dockPulse * 0.1 });
      this.menuPanel.rect(x + 16, y + panelHeight - 15, panelWidth - 32, 2);
      this.menuPanel.fill({ color: 0xffd15c, alpha: 0.32 });
      const sweepBottomX = x + clampNumber(dockSweep + 42, 24, Math.max(24, panelWidth - 120));
      this.menuPanel.rect(sweepBottomX, y + panelHeight - 18, Math.min(142, panelWidth * 0.15), 3);
      this.menuPanel.fill({ color: 0xffef7e, alpha: 0.28 + dockPulse * 0.14 });
      this.menuPanel.moveTo(x + panelWidth * 0.32, y + panelHeight - 3);
      this.menuPanel.lineTo(x + panelWidth * 0.68, y + panelHeight - 3);
      this.menuPanel.stroke({ color: 0x37f5ff, width: 2, alpha: 0.42 });
      this.menuPanel.rect(x + 18, y + panelHeight - 9, panelWidth - 36, 1);
      this.menuPanel.fill({ color: 0x000000, alpha: 0.42 });
      return;
    }
    const contentItems = [
      this.highscoreBtn,
      this.storyBtn,
      this.threatCodexBtn,
      this.achievementsBtn,
      this.settingsBtn
    ].filter(Boolean);
    const itemBounds = contentItems.map(boundsForDisplayObject).filter(Boolean);
    const minX = itemBounds.length ? Math.min(...itemBounds.map((bounds) => bounds.x)) : this.startBtn.x - this.startBtn._btnWidth / 2;
    const maxX = itemBounds.length ? Math.max(...itemBounds.map((bounds) => bounds.right)) : this.startBtn.x + this.startBtn._btnWidth / 2;
    const minY = itemBounds.length ? Math.min(...itemBounds.map((bounds) => bounds.y)) : this.startBtn.y - 180;
    const maxY = itemBounds.length ? Math.max(...itemBounds.map((bounds) => bounds.bottom)) : this.settingsBtn.y + 60;
    const padX = 8;
    const padTop = isShortLayout ? 7 : 9;
    const padBottom = isShortLayout ? 7 : 9;
    const x = Math.max(8, minX - padX);
    const y = Math.max(8, minY - padTop);
    let panelWidth = (maxX - minX) + padX * 2;
    let panelHeight = (maxY - minY) + padTop + padBottom;

    panelWidth = Math.min(width - x - 8, panelWidth);
    panelHeight = Math.min(height - y - 8, Math.max(isShortLayout ? 92 : 106, panelHeight));
    this.lastMenuPanelBounds = {
      x,
      y,
      width: panelWidth,
      height: panelHeight,
      right: x + panelWidth,
      bottom: y + panelHeight
    };
    this.menuDockBounds = this.lastMenuPanelBounds;

    this.menuPanel.clear();
    const dockSweep = ((this.animationTime * Math.max(260, panelWidth / 3.6)) % Math.max(1, panelWidth + 240)) - 120;
    const dockPulse = 0.5 + Math.sin(this.animationTime * 2.2) * 0.5;
    this.menuPanel.roundRect(x + 6, y + 10, panelWidth, panelHeight, 5);
    this.menuPanel.fill({ color: 0x000000, alpha: 0.46 });
    drawCutPanel(this.menuPanel, x - 2, y - 2, panelWidth + 4, panelHeight + 4, 12, { color: 0x37f5ff, alpha: 0.045 }, { color: 0x37f5ff, width: 1, alpha: 0.26 });
    drawCutPanel(this.menuPanel, x, y, panelWidth, panelHeight, 10, { color: 0x020711, alpha: 0.68 }, { color: 0x37f5ff, width: 1, alpha: 0.5 });
    drawCutPanel(this.menuPanel, x + 5, y + 5, panelWidth - 10, panelHeight - 10, 8, { color: 0x062034, alpha: 0.32 }, { color: 0x7fffd8, width: 1, alpha: 0.2 });
    this.menuPanel.rect(x + 2, y + 2, panelWidth - 4, Math.max(24, panelHeight * 0.42));
    this.menuPanel.fill({ color: 0x0b2a42, alpha: 0.28 });
    this.menuPanel.rect(x + 16, y + 12, panelWidth - 32, 2);
    this.menuPanel.fill({ color: 0x7fffd8, alpha: 0.48 });
    const sweepTopX = x + clampNumber(dockSweep, 18, Math.max(18, panelWidth - 142));
    this.menuPanel.rect(sweepTopX, y + 9, Math.min(180, panelWidth * 0.18), 4);
    this.menuPanel.fill({ color: 0xdffcff, alpha: 0.28 + dockPulse * 0.18 });
    this.menuPanel.rect(sweepTopX + 16, y + 14, Math.min(132, panelWidth * 0.12), 1);
    this.menuPanel.fill({ color: 0x37f5ff, alpha: 0.22 + dockPulse * 0.1 });
    this.menuPanel.rect(x + 16, y + panelHeight - 15, panelWidth - 32, 2);
    this.menuPanel.fill({ color: 0xffd15c, alpha: 0.28 });
    const sweepBottomX = x + clampNumber(dockSweep + 42, 24, Math.max(24, panelWidth - 120));
    this.menuPanel.rect(sweepBottomX, y + panelHeight - 18, Math.min(142, panelWidth * 0.15), 3);
    this.menuPanel.fill({ color: 0xffef7e, alpha: 0.26 + dockPulse * 0.14 });
  }

  layoutSectorSelector(layout, width, height) {
    if (!this.sectorSelectorOverlay) return;
    this.sectorSelectorOverlay.hitArea = new PIXI.Rectangle(0, 0, width, height);
    if (!this.sectorSelectorOpen) {
      this.sectorSelectorOverlay.visible = false;
      return;
    }
    this.sectorSelectorOverlay.visible = true;
    this.sectorSelectorSectors = this.sectorSelectorSectors?.length
      ? this.sectorSelectorSectors
      : this.buildSectorSelectorSectors();

    const isCompact = width < 1450 || height < 850;
    const panelWidth = clampNumber(width * (isCompact ? 0.78 : 0.66), 720, Math.min(1180, width - 72));
    const panelHeight = clampNumber(height * (isCompact ? 0.58 : 0.5), 460, Math.min(570, height - 150));
    const panelX = Math.round((width - panelWidth) / 2);
    const panelY = Math.round(Math.max(40, height * 0.12));
    const pad = isCompact ? 24 : 34;
    this.lastSectorSelectorPanelBounds = {
      x: panelX,
      y: panelY,
      width: Math.round(panelWidth),
      height: Math.round(panelHeight),
      right: Math.round(panelX + panelWidth),
      bottom: Math.round(panelY + panelHeight)
    };

    this.sectorSelectorPanel.x = 0;
    this.sectorSelectorPanel.y = 0;
    this.sectorSelectorPanel.hitArea = new PIXI.Rectangle(panelX, panelY, panelWidth, panelHeight);
    this.sectorSelectorTitle.style.fontSize = Math.round(clampNumber(width * 0.022, 24, 38));
    this.sectorSelectorTitle.text = translateText('SELECT START POINT');
    this.sectorSelectorTitle.x = panelX + pad;
    this.sectorSelectorTitle.y = panelY + pad + 18;
    this.sectorSelectorSubtitle.style.fontSize = Math.round(clampNumber(width * 0.0085, 12, 16));
    this.sectorSelectorSubtitle.style.lineHeight = Math.round(this.sectorSelectorSubtitle.style.fontSize * 1.22);
    this.sectorSelectorSubtitle.style.wordWrapWidth = Math.max(360, panelWidth * 0.52);
    this.sectorSelectorSubtitle.text = [
      translateText('Use Mayhem-unlocked checkpoints to push deeper.'),
      translateText('New start points unlock every 5 sectors in Mayhem.')
    ].join('\n');
    this.sectorSelectorSubtitle.x = panelX + pad + 2;
    this.sectorSelectorSubtitle.y = this.sectorSelectorTitle.y + 44;

    const detailWidth = clampNumber(panelWidth * 0.31, 260, 360);
    const gridX = panelX + pad;
    const gridY = panelY + (isCompact ? 112 : 126);
    const gridW = panelWidth - pad * 3 - detailWidth;
    const gridH = panelHeight - (isCompact ? 186 : 206);
    const columns = Math.min(this.getSectorSelectorColumns(), Math.max(1, this.sectorSelectorSectors.length));
    const rows = Math.ceil(this.sectorSelectorSectors.length / columns);
    const gap = isCompact ? 8 : 10;
    const cellW = Math.floor((gridW - gap * (columns - 1)) / columns);
    const cellH = Math.floor(Math.min(82, (gridH - gap * Math.max(0, rows - 1)) / rows));
    const actualGridH = rows * cellH + Math.max(0, rows - 1) * gap;

    this.sectorSelectorGrid.x = gridX;
    this.sectorSelectorGrid.y = gridY;
    this.sectorSelectorGrid.removeChildren();
    this.sectorSelectorItems = [];

    this.sectorSelectorSectors.forEach((entry, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const item = this.createSectorSelectorCell(entry, index, cellW, cellH);
      item.x = column * (cellW + gap);
      item.y = row * (cellH + gap);
      item._bounds = {
        x: Math.round(gridX + item.x),
        y: Math.round(gridY + item.y),
        width: cellW,
        height: cellH,
        right: Math.round(gridX + item.x + cellW),
        bottom: Math.round(gridY + item.y + cellH)
      };
      this.sectorSelectorGrid.addChild(item);
      this.sectorSelectorItems.push(item);
    });

    this.sectorSelectorDetail.style.fontSize = Math.round(clampNumber(width * 0.0085, 12, 16));
    this.sectorSelectorDetail.style.wordWrapWidth = detailWidth - 18;
    this.sectorSelectorDetail.text = this.getSectorSelectorDetailText();
    this.sectorSelectorDetail.x = gridX + gridW + pad;
    this.sectorSelectorDetail.y = gridY + 4;

    const actionW = detailWidth;
    const actionH = isCompact ? 44 : 50;
    const actionX = gridX + gridW + pad;
    const actionY = gridY + Math.max(188, Math.min(actualGridH - 96, panelHeight * 0.36));
    if (this.sectorSelectorLaunchButton) {
      this.sectorSelectorLaunchButton.x = actionX;
      this.sectorSelectorLaunchButton.y = actionY;
      this.sectorSelectorLaunchButton._btnWidth = actionW;
      this.sectorSelectorLaunchButton._btnHeight = actionH;
      this.sectorSelectorLaunchButton.hitArea = new PIXI.Rectangle(0, 0, actionW, actionH);
    }
    if (this.sectorSelectorBackButton) {
      this.sectorSelectorBackButton.x = actionX;
      this.sectorSelectorBackButton.y = actionY + actionH + 10;
      this.sectorSelectorBackButton._btnWidth = actionW;
      this.sectorSelectorBackButton._btnHeight = isCompact ? 34 : 38;
      this.sectorSelectorBackButton.hitArea = new PIXI.Rectangle(0, 0, actionW, this.sectorSelectorBackButton._btnHeight);
    }
    this.drawSectorSelectorActionButtons();

    this.sectorSelectorHint.style.fontSize = Math.round(clampNumber(width * 0.0076, 11, 14));
    this.sectorSelectorHint.text = this.lastInputDevice === 'controller'
      ? translateText('D-PAD/STICK: SELECT // A: START // B: BACK')
      : translateText('ARROWS: SELECT // ENTER/SPACE: START // ESC: BACK');
    this.sectorSelectorHint.x = panelX + panelWidth / 2;
    this.sectorSelectorHint.y = panelY + panelHeight - (isCompact ? 28 : 32);

    this.drawSectorSelectorPanel(panelX, panelY, panelWidth, panelHeight, {
      gridX,
      gridY,
      gridW,
      gridH: actualGridH,
      detailX: gridX + gridW + pad,
      detailY: gridY,
      detailWidth,
      detailHeight: Math.max(180, actualGridH)
    });
  }

  createSectorSelectorCell(entry, index, width, height) {
    const item = new PIXI.Container();
    item.eventMode = 'static';
    item.cursor = entry.unlocked ? 'pointer' : 'default';
    item._sector = entry.sector;
    const bg = new PIXI.Graphics();
    item.addChild(bg);
    const number = createText(translateText('CHECKPOINT {sector}', { sector: entry.sector }), {
      fontFamily: FONT_DISPLAY,
      fontSize: Math.round(clampNumber(width * 0.095, 13, 18)),
      fontWeight: '900',
      fill: entry.unlocked ? '#dffcff' : '#5f7283',
      stroke: '#020711',
      strokeThickness: 3,
      padding: 10
    });
    number.anchor.set(0.5);
    number.x = width * 0.5;
    number.y = height * 0.3;
    item.addChild(number);
    const play = createText(translateText('Begins at Sector {sector}', {
      sector: entry.playSector || getSectorStartPlaySector(entry.sector) || entry.sector
    }), {
      fontFamily: FONT_MONO,
      fontSize: Math.round(clampNumber(width * 0.055, 8, 11)),
      fontWeight: '900',
      fill: entry.unlocked ? '#9feeff' : '#6c7884',
      stroke: '#020711',
      strokeThickness: 2,
      padding: 8
    });
    play.anchor.set(0.5);
    play.x = width * 0.5;
    play.y = height * 0.54;
    item.addChild(play);
    const status = createText(entry.unlocked
      ? translateText(entry.overrunCheckpoint ? 'OVERRUN' : 'READY')
      : translateText('LOCKED'), {
      fontFamily: FONT_MONO,
      fontSize: Math.round(clampNumber(width * 0.07, 8, 10)),
      fontWeight: '900',
      fill: entry.unlocked ? '#7fffd8' : '#6c7884',
      stroke: '#020711',
      strokeThickness: 2,
      padding: 8
    });
    status.anchor.set(0.5);
    status.x = width * 0.5;
    status.y = height * 0.78;
    item.addChild(status);
    item.on('pointerover', () => {
      this.setInputDevice('keyboard');
      this.selectedSectorSelectorIndex = index;
      this.drawSectorSelectorOverlay();
      playMenuFocusSfx(0.09);
    });
    item.on('pointerdown', (event) => {
      event.stopPropagation?.();
      this.selectedSectorSelectorIndex = index;
      this.drawSectorSelectorOverlay();
      if (!entry.unlocked) return;
      this.activateSectorSelectorSelection();
    });
    item._cellBg = bg;
    item._cellNumber = number;
    item._cellPlay = play;
    item._cellStatus = status;
    item._cellWidth = width;
    item._cellHeight = height;
    this.drawSectorSelectorCell(item, entry, index === this.selectedSectorSelectorIndex);
    return item;
  }

  drawSectorSelectorPanel(x, y, width, height, zones = {}) {
    const g = this.sectorSelectorPanel;
    if (!g) return;
    const openProgress = this.sectorSelectorOpen ? this.easeOutCubic(clampNumber(this.sectorSelectorOpenAge || 0, 0, 1)) : 1;
    const settle = (1 - openProgress) * 18;
    const panelY = y + settle;
    g.clear();
    g.rect(0, 0, this.game.getWidth(), this.game.getHeight());
    g.fill({ color: 0x00040a, alpha: 0.62 * openProgress });
    drawCutPanel(g, x - 14, panelY - 14, width + 28, height + 28, 20, { color: 0x37f5ff, alpha: 0.055 * openProgress }, { color: 0x37f5ff, width: 1, alpha: 0.24 * openProgress });
    drawCutPanel(g, x - 7, panelY - 7, width + 14, height + 14, 18, { color: 0x000000, alpha: 0.42 * openProgress }, { color: 0xff55d9, width: 1, alpha: 0.22 * openProgress });
    drawCutPanel(g, x, panelY, width, height, 16, { color: 0x020a14, alpha: 0.9 * openProgress }, { color: 0x37f5ff, width: 2, alpha: 0.72 * openProgress });
    drawCutPanel(g, x + 8, panelY + 8, width - 16, height - 16, 12, { color: 0x031827, alpha: 0.46 * openProgress }, { color: 0x7fffd8, width: 1, alpha: 0.22 * openProgress });
    g.rect(x + 14, panelY + 12, width - 28, 2);
    g.fill({ color: 0x7fffd8, alpha: 0.42 * openProgress });
    g.rect(x + 14, panelY + height - 16, width - 28, 2);
    g.fill({ color: 0xffd15c, alpha: 0.34 * openProgress });
    g.rect(x + 1, panelY + 1, width - 2, Math.max(72, height * 0.18));
    g.fill({ color: 0x0a2b43, alpha: 0.28 * openProgress });
    g.rect(x + width * 0.58, panelY + 1, width * 0.38, Math.max(72, height * 0.18));
    g.fill({ color: 0xff55d9, alpha: 0.035 * openProgress });
    g.moveTo(x + 28, panelY + 72);
    g.lineTo(x + width - 28, panelY + 72);
    g.stroke({ color: 0x37f5ff, width: 1, alpha: 0.18 * openProgress });
    g.moveTo(x + width - 42, panelY + 22);
    g.lineTo(x + width - 18, panelY + 22);
    g.lineTo(x + width - 18, panelY + 46);
    g.stroke({ color: 0xffd15c, width: 1.2, alpha: 0.48 * openProgress });

    if (zones.gridW > 0) {
      drawCutPanel(g, zones.gridX - 12, zones.gridY - 12, zones.gridW + 24, zones.gridH + 24, 12, { color: 0x010812, alpha: 0.5 }, { color: 0x37f5ff, width: 1, alpha: 0.34 });
      for (let i = 0; i < 4; i += 1) {
        const yy = zones.gridY + (zones.gridH * i) / 3;
        g.moveTo(zones.gridX - 4, yy);
        g.lineTo(zones.gridX + zones.gridW + 4, yy);
        g.stroke({ color: i % 2 ? 0xff55d9 : 0x37f5ff, width: 1, alpha: 0.08 });
      }
      for (let i = 1; i < 4; i += 1) {
        const xx = zones.gridX + (zones.gridW * i) / 4;
        g.moveTo(xx, zones.gridY - 6);
        g.lineTo(xx, zones.gridY + zones.gridH + 6);
        g.stroke({ color: 0x37f5ff, width: 1, alpha: 0.055 });
      }
    }
    if (zones.detailWidth > 0) {
      drawCutPanel(g, zones.detailX - 12, zones.detailY - 12, zones.detailWidth + 24, zones.detailHeight + 20, 12, { color: 0x010812, alpha: 0.58 }, { color: 0xffd15c, width: 1, alpha: 0.4 });
      g.rect(zones.detailX, zones.detailY + 92, zones.detailWidth, 1);
      g.fill({ color: 0x37f5ff, alpha: 0.14 });
      g.rect(zones.detailX, zones.detailY + 100, zones.detailWidth * 0.44, 2);
      g.fill({ color: 0xff55d9, alpha: 0.3 });
    }
    this.drawSectorSelectorOverlay();
  }

  drawSectorSelectorOverlay() {
    if (!this.sectorSelectorOpen) return;
    this.sectorSelectorItems.forEach((item, index) => {
      const entry = this.sectorSelectorSectors[index];
      this.drawSectorSelectorCell(item, entry, index === this.selectedSectorSelectorIndex);
    });
    if (this.sectorSelectorDetail) {
      this.sectorSelectorDetail.text = this.getSectorSelectorDetailText();
      this.sectorSelectorDetail.updateText?.(false);
    }
    this.drawSectorSelectorActionButtons();
  }

  getSectorSelectorLaunchLabel(entry = this.sectorSelectorSectors[this.selectedSectorSelectorIndex]) {
    if (!entry?.unlocked) return translateText('LOCKED');
    const playSector = entry.playSector || entry.sector;
    return entry.overrunCheckpoint
      ? translateText('LAUNCH FROM SECTOR {sector}', { sector: playSector })
      : translateText('LAUNCH SECTOR {sector}', { sector: playSector });
  }

  drawSectorSelectorActionButtons() {
    const entry = this.sectorSelectorSectors?.[this.selectedSectorSelectorIndex];
    const launchButton = this.sectorSelectorLaunchButton;
    const launchBg = this.sectorSelectorLaunchBg;
    const launchText = this.sectorSelectorLaunchText;
    if (launchButton && launchBg && launchText) {
      const w = launchButton._btnWidth || 260;
      const h = launchButton._btnHeight || 48;
      const unlocked = Boolean(entry?.unlocked);
      launchButton.cursor = unlocked ? 'pointer' : 'default';
      launchText.text = this.getSectorSelectorLaunchLabel(entry);
      launchText.style.fontSize = Math.round(clampNumber(w * 0.062, 13, 18));
      launchText.style.fill = unlocked ? '#ffe584' : '#7b8794';
      launchText.x = w / 2;
      launchText.y = h / 2;
      launchText.updateText?.(false);
      fitTextToWidth(launchText, w - 28, { minScale: 0.58 });
      launchBg.clear();
      const pulse = unlocked ? (0.5 + Math.sin(this.animationTime * 4.2) * 0.5) : 0;
      drawCutPanel(launchBg, 4, 6, w, h, 10, { color: 0x000000, alpha: 0.38 });
      drawCutPanel(launchBg, -3, -3, w + 6, h + 6, 12, { color: 0xffd15c, alpha: unlocked ? 0.04 + pulse * 0.025 : 0.01 }, { color: 0xffef7e, width: 1, alpha: unlocked ? 0.24 + pulse * 0.12 : 0.08 });
      drawCutPanel(launchBg, 0, 0, w, h, 10, {
        color: unlocked ? 0x2f2108 : 0x07101a,
        alpha: unlocked ? 0.9 : 0.62
      }, {
        color: unlocked ? 0xffd15c : 0x5c6a77,
        width: unlocked ? 2 : 1,
        alpha: unlocked ? 0.82 : 0.32
      });
      drawCutPanel(launchBg, 7, 7, w - 14, h - 14, 7, {
        color: unlocked ? 0x5a3a0b : 0x152432,
        alpha: unlocked ? 0.24 : 0.12
      }, {
        color: 0xffffff,
        width: 1,
        alpha: unlocked ? 0.1 : 0.05
      });
      launchBg.rect(12, h - 9, w - 24, 3);
      launchBg.fill({ color: unlocked ? 0xffef7e : 0x6a7784, alpha: unlocked ? 0.62 : 0.22 });
      launchBg.rect(14 + (w - 88) * pulse, 5, 52, 2);
      launchBg.fill({ color: 0xffffff, alpha: unlocked ? 0.28 : 0 });
      launchBg.moveTo(w - 38, h * 0.5);
      launchBg.lineTo(w - 24, h * 0.5);
      launchBg.lineTo(w - 31, h * 0.5 - 7);
      launchBg.moveTo(w - 24, h * 0.5);
      launchBg.lineTo(w - 31, h * 0.5 + 7);
      launchBg.stroke({ color: unlocked ? 0xffef7e : 0x72808b, width: 2, alpha: unlocked ? 0.86 : 0.32 });
    }

    const backButton = this.sectorSelectorBackButton;
    const backBg = this.sectorSelectorBackBg;
    const backText = this.sectorSelectorBackText;
    if (backButton && backBg && backText) {
      const w = backButton._btnWidth || 260;
      const h = backButton._btnHeight || 36;
      backText.text = translateText('BACK');
      backText.style.fontSize = Math.round(clampNumber(w * 0.044, 11, 14));
      backText.x = w / 2;
      backText.y = h / 2;
      backText.updateText?.(false);
      fitTextToWidth(backText, w - 24, { minScale: 0.62 });
      backBg.clear();
      drawCutPanel(backBg, 0, 0, w, h, 8, { color: 0x041420, alpha: 0.72 }, { color: 0x37f5ff, width: 1, alpha: 0.38 });
      backBg.rect(10, h - 7, w - 20, 2);
      backBg.fill({ color: 0x37f5ff, alpha: 0.18 });
    }
  }

  drawSectorSelectorCell(item, entry, selected) {
    const g = item?._cellBg;
    if (!g || !entry) return;
    const w = item._cellWidth || 90;
    const h = item._cellHeight || 46;
    const unlocked = Boolean(entry.unlocked);
    const isOverrun = Boolean(entry.overrunCheckpoint);
    const accent = unlocked
      ? (selected ? 0xffef7e : (isOverrun ? 0xff55d9 : 0x37f5ff))
      : 0x52606f;
    const fill = unlocked ? (selected ? 0x1d311f : (isOverrun ? 0x180d24 : 0x041927)) : 0x07101a;
    const pulse = 0.5 + Math.sin(this.animationTime * 6) * 0.5;
    g.clear();
    drawCutPanel(g, 2, 3, w, h, 8, { color: 0x000000, alpha: selected ? 0.34 : 0.24 });
    drawCutPanel(g, 0, 0, w, h, 8, { color: fill, alpha: unlocked ? 0.82 : 0.48 }, { color: accent, width: selected ? 2.3 : 1.1, alpha: selected ? 0.95 : (unlocked ? 0.46 : 0.18) });
    drawCutPanel(g, 5, 5, w - 10, Math.max(12, h * 0.34), 5, { color: unlocked ? (isOverrun ? 0xff55d9 : 0x37f5ff) : 0x334150, alpha: selected ? 0.18 : 0.07 });
    g.rect(8, h - 7, w - 16, 2);
    g.fill({ color: accent, alpha: selected ? 0.72 : 0.28 });
    if (selected) {
      drawCutPanel(g, -5, -5, w + 10, h + 10, 10, null, { color: 0xffef7e, width: 1.2, alpha: 0.52 + pulse * 0.18 });
    }
    if (!unlocked) {
      g.moveTo(w * 0.3, h * 0.5);
      g.lineTo(w * 0.7, h * 0.5);
      g.stroke({ color: 0x8b96a3, width: 2, alpha: 0.42 });
    }
    if (item._cellNumber) item._cellNumber.style.fill = unlocked ? (selected ? '#fff7bf' : '#dffcff') : '#6b7785';
    if (item._cellStatus) {
      item._cellStatus.text = unlocked
        ? translateText(isOverrun ? 'OVERRUN' : 'READY')
        : translateText('LOCKED');
      item._cellStatus.style.fill = unlocked ? (selected ? '#ffe584' : (isOverrun ? '#ff9bff' : '#7fffd8')) : '#68727c';
      item._cellStatus.updateText?.(false);
    }
    if (item._cellPlay) {
      item._cellPlay.text = translateText('Begins at Sector {sector}', {
        sector: entry.playSector || getSectorStartPlaySector(entry.sector) || entry.sector
      });
      item._cellPlay.style.fill = unlocked ? (selected ? '#dffcff' : '#9feeff') : '#6f7a84';
      item._cellPlay.updateText?.(false);
    }
  }

  getSectorSelectorDetailText() {
    const entry = this.sectorSelectorSectors[this.selectedSectorSelectorIndex];
    if (!entry) return '';
    const startPointLine = entry.overrunCheckpoint
      ? translateText('CHECKPOINT {sector}', { sector: entry.sector })
      : translateText('START POINT {sector}', { sector: entry.sector });
    if (!entry.unlocked) {
      const required = getSectorStartPlaySector(entry.sector);
      const requirement = entry.overrunCheckpoint
        ? translateText('CLEAR SECTOR {sector} IN MAYHEM RUN', { sector: entry.sector })
        : translateText('REACH SECTOR {sector} IN MAYHEM RUN', { sector: required || entry.sector });
      return [
        translateText('LOCKED CHECKPOINT'),
        translateText('Unlock new start points every 5 sectors in Mayhem.'),
        requirement,
        required && required !== entry.sector ? translateText('Begins at Sector {sector}', { sector: required }) : '',
        translateText('Use Sector Run later to jump deeper without replaying early sectors.')
      ].filter(Boolean).join('\n');
    }
    const playSector = entry.playSector || entry.sector;
    const startLine = translateText('Begins at Sector {sector}', { sector: playSector });
    const launchLine = this.getSectorSelectorLaunchLabel(entry);
    const record = entry.record;
    const best = record?.scoreEarned > 0
      ? `${translateText('BEST')} ${this.formatSectorStartMenuBestScore(record.scoreEarned)}`
      : translateText('NO RECORD YET');
    return [
      startPointLine,
      startLine,
      translateText('Unlocked in Mayhem'),
      translateText('Sector record only'),
      translateText('No achievements'),
      launchLine,
      best
    ].join('\n');
  }

  getLayoutDebugState() {
    const textItems = {
      kicker: this.kicker,
      title: this.title,
      subtitle: this.subtitle,
      flavor: this.flavor,
      primaryHint: this.primaryHint,
      runModePanel: this.runModePanel,
      runModeBriefingTitle: this.runModeBriefingTitle,
      runModeExplainer: this.runModeExplainer,
      disclaimer: this.disclaimer,
      controls: this.controls,
      launchButton: this.startBtn,
      scoutRunButton: this.scoutRunBtn,
      sectorStartButton: this.sectorStartBtn?.visible ? this.sectorStartBtn : null,
      hangarButton: this.highscoreBtn,
      highscoresButton: this.storyBtn,
      threatCodexButton: this.threatCodexBtn,
      achievementsButton: this.achievementsBtn,
      settingsButton: this.settingsBtn,
      exitButton: this.exitBtn,
      exitNotice: this.exitNotice,
      helpButton: this.helpBtn,
      musicButton: this.musicBtn
    };
    return {
      screen: {
        width: Math.round(this.game.getWidth()),
        height: Math.round(this.game.getHeight())
      },
      panel: this.lastMenuPanelBounds,
      focusedOption: this.menuOptions?.[this.focusedMenuIndex]?.id || null,
      optionOrder: this.menuOptions?.map((option) => option.id).filter(Boolean) || [],
      inputDevice: this.lastInputDevice,
      menuIconVariant: this.menuIconVariant,
      missionBriefing: {
        title: this.runModeBriefingTitle?.text || null,
        body: this.runModeExplainer?.text || null,
        mode: this.getRunModeBriefing().id,
        panelBounds: this.runModePanel?._briefingBounds || boundsForDisplayObject(this.runModePanel),
        titleBounds: boundsForDisplayObject(this.runModeBriefingTitle),
        bodyBounds: boundsForDisplayObject(this.runModeExplainer)
      },
      launchDeck: {
        bounds: this.launchDeckBounds,
        cards: {
          mayhem: {
            label: this.startBtn?._label?.text || null,
            sublabel: this.startBtn?._sublabel?.text || null,
            body: this.startBtn?._bodyLabel?.text || null,
            focused: Boolean(this.startBtn?._focused),
            bounds: boundsForDisplayObject(this.startBtn)
          },
          scout: {
            label: this.scoutRunBtn?._label?.text || null,
            sublabel: this.scoutRunBtn?._sublabel?.text || null,
            body: this.scoutRunBtn?._bodyLabel?.text || null,
            focused: Boolean(this.scoutRunBtn?._focused),
            bounds: boundsForDisplayObject(this.scoutRunBtn)
          },
          sector: {
            label: this.sectorStartBtn?._label?.text || null,
            sublabel: this.sectorStartBtn?._sublabel?.text || null,
            body: this.sectorStartBtn?._bodyLabel?.text || null,
            focused: Boolean(this.sectorStartBtn?._focused),
            bounds: boundsForDisplayObject(this.sectorStartBtn?.visible ? this.sectorStartBtn : null)
          }
        }
      },
      quitConfirmation: {
        open: Boolean(this.quitConfirmOpen),
        focusedIndex: this.quitConfirmFocusIndex,
        focusedLabel: this.quitConfirmButtons?.[this.quitConfirmFocusIndex]?._label?.text || null,
        defaultFocusIsCancel: this.quitConfirmFocusIndex === 0 && this.quitConfirmButtons?.[0]?._label?.text === translateText('CANCEL'),
        overlayBounds: boundsForDisplayObject(this.quitConfirmOverlay?.visible ? this.quitConfirmOverlay : null),
        panelBounds: boundsForDisplayObject(this.quitConfirmPanel),
        buttons: (this.quitConfirmButtons || []).map((button) => ({
          label: button?._label?.text || null,
          focused: Boolean(button?._focused),
          bounds: boundsForDisplayObject(button)
        }))
      },
      howToPlay: this.howToPlayOverlay?.getDebugState ? this.howToPlayOverlay.getDebugState() : null,
      menuIcons: Object.fromEntries(this.getMenuButtonList().map((button) => [
        button?._iconAssetKey || button?._iconType || 'unknown',
        {
          loaded: Boolean(this.menuIconTextures?.[button?._iconAssetKey]),
          spriteVisible: Boolean(button?._iconSprite?.visible),
          fallbackVisible: Boolean(button?._icon?.visible),
          bounds: boundsForDisplayObject(button?._iconSprite?.visible ? button?._iconSprite : button?._icon),
          tileBounds: button ? {
            x: Math.round(button.x - (button._btnWidth || 0) / 2),
            y: Math.round(button.y - (button._btnHeight || 0) / 2),
            width: Math.round(button._btnWidth || 0),
            height: Math.round(button._btnHeight || 0),
            right: Math.round(button.x + (button._btnWidth || 0) / 2),
            bottom: Math.round(button.y + (button._btnHeight || 0) / 2)
          } : null,
          buttonBounds: boundsForDisplayObject(button),
          labelBounds: boundsForDisplayObject(button?._label),
          sublabelBounds: boundsForDisplayObject(button?._sublabel?.alpha > 0.05 ? button?._sublabel : null)
        }
      ])),
      threatCodex: {
        unreadCount: Number(this.codexUnreadCount || 0),
        markerVisible: Boolean(this.threatCodexBtn?._signalCue?.visible),
        markerBounds: boundsForDisplayObject(this.threatCodexBtn?._signalCue?.visible ? this.threatCodexBtn?._signalCue : null)
      },
      sectorStart: {
        available: Boolean(this.sectorStartState?.available),
        highestReachedSector: this.sectorStartState?.highestReachedSector || 1,
        checkpoints: this.sectorStartState?.checkpoints || [],
        selectedCheckpoint: this.getSelectedSectorStartCheckpoint(),
        selectedRecord: getSectorStartChallengeRecord(this.getSelectedSectorStartCheckpoint()),
        primaryHintText: this.primaryHint?.text || null,
        runModeExplainerText: this.runModeExplainer?.text || null,
        buttonVisible: Boolean(this.sectorStartBtn?.visible),
        buttonText: this.getSectorStartButtonLabel(),
        buttonVisualText: this.sectorStartBtn?._label?.text || null,
        buttonSubtext: this.sectorStartBtn?._sublabel?.text || null,
        buttonBounds: boundsForDisplayObject(this.sectorStartBtn?.visible ? this.sectorStartBtn : null),
        buttonConfiguredWidth: Number(this.sectorStartBtn?._btnWidth || 0),
        buttonConfiguredHeight: Number(this.sectorStartBtn?._btnHeight || 0),
        labelBounds: boundsForDisplayObject(this.sectorStartBtn?.visible ? this.sectorStartBtn?._label : null),
        labelScale: Number(this.sectorStartBtn?._label?.scale?.x || 1),
        arrowCueVisible: Boolean(this.sectorStartBtn?._stepperCue?.visible),
        arrowCueBounds: boundsForDisplayObject(this.sectorStartBtn?._stepperCue?.visible ? this.sectorStartBtn?._stepperCue : null),
        coreButtonBounds: this.sectorStartBtn?.visible ? {
          x: Math.round(this.sectorStartBtn.x - (this.sectorStartBtn._btnWidth || 0) / 2),
          y: Math.round(this.sectorStartBtn.y - (this.sectorStartBtn._btnHeight || 0) / 2),
          width: Math.round(this.sectorStartBtn._btnWidth || 0),
          height: Math.round(this.sectorStartBtn._btnHeight || 0),
          right: Math.round(this.sectorStartBtn.x + (this.sectorStartBtn._btnWidth || 0) / 2),
          bottom: Math.round(this.sectorStartBtn.y + (this.sectorStartBtn._btnHeight || 0) / 2)
        } : null,
        selector: this.getSectorSelectorDebugState()
      },
      scoutRun: {
        buttonVisible: Boolean(this.scoutRunBtn?.visible),
        buttonText: this.scoutRunBtn?._label?.text || null,
        buttonSubtext: this.scoutRunBtn?._sublabel?.text || null,
        buttonBounds: boundsForDisplayObject(this.scoutRunBtn?.visible ? this.scoutRunBtn : null),
        profile: getRunModeProfile(RUN_MODES.SCOUT)
      },
      menuFx: this.menuFx?.getDebugState?.() || null,
      exitNoticeText: this.exitNotice?.text || '',
      items: Object.fromEntries(
        Object.entries(textItems).map(([key, item]) => [key, boundsForDisplayObject(item)])
      )
    };
  }

  layoutMissionConsole(width = this.game.app.screen.width, height = this.game.app.screen.height) {
    if (!this.missionConsole) return;
    const responsiveLayout = getCurrentLayout();
    this.missionConsole.visible = false;
    this.missionConsole.alpha = 0;

    if (this.radar) {
      this.radar.x = responsiveLayout.isMobile ? width * 0.54 : width * 0.73;
      this.radar.y = height * (responsiveLayout.isMobile ? 0.57 : 0.58);
      this.radar.scale.set(responsiveLayout.isMobile ? 0.68 : 0.9);
    }

    this.crewComms.forEach((card) => {
      const x = card.align < 0 ? width * 0.68 : width * 0.86;
      const y = height * 0.76;
      card.x = x;
      card.y = y;
      card.baseY = y;
      card.visible = false;
    });
  }

  layoutBackdrop(width = this.game.app.screen.width, height = this.game.app.screen.height) {
    if (this.backdrop?.texture) {
      const textureWidth = this.backdrop.texture.width || width;
      const textureHeight = this.backdrop.texture.height || height;
      const scale = Math.max(width / textureWidth, height / textureHeight);
      this.backdrop.scale.set(scale);
      this.backdrop.x = width / 2;
      this.backdrop.y = height / 2;
    }

    if (this.backdropShade) {
      this.backdropShade.clear();
      this.backdropShade.rect(0, 0, width, height);
      this.backdropShade.fill({ color: 0x020711, alpha: 0.08 });
      this.backdropShade.rect(0, 0, Math.min(width * 0.38, 660), height * 0.38);
      this.backdropShade.fill({ color: 0x020711, alpha: 0.18 });
      this.backdropShade.rect(0, height * 0.72, width, height * 0.28);
      this.backdropShade.fill({ color: 0x000000, alpha: 0.44 });
      this.backdropShade.rect(0, height * 0.88, width, height * 0.12);
      this.backdropShade.fill({ color: 0x020711, alpha: 0.42 });
    }
  }

  getSectorSelectorDebugState() {
    const selected = this.sectorSelectorSectors?.[this.selectedSectorSelectorIndex] || null;
    return {
      open: Boolean(this.sectorSelectorOpen),
      visible: Boolean(this.sectorSelectorOverlay?.visible),
      selectedIndex: this.selectedSectorSelectorIndex,
      selectedSector: selected?.sector || null,
      selectedUnlocked: Boolean(selected?.unlocked),
      selectedPlaySector: selected?.playSector || null,
      selectedOverrunCheckpoint: Boolean(selected?.overrunCheckpoint),
      launchLabel: this.getSectorSelectorLaunchLabel(selected),
      columns: this.getSectorSelectorColumns(),
      title: this.sectorSelectorTitle?.text || null,
      subtitle: this.sectorSelectorSubtitle?.text || null,
      hint: this.sectorSelectorHint?.text || null,
      detailText: this.sectorSelectorDetail?.text || null,
      launchButtonBounds: boundsForDisplayObject(this.sectorSelectorLaunchButton),
      launchButtonText: this.sectorSelectorLaunchText?.text || null,
      backButtonBounds: boundsForDisplayObject(this.sectorSelectorBackButton),
      panelBounds: this.lastSectorSelectorPanelBounds,
      gridBounds: boundsForDisplayObject(this.sectorSelectorGrid),
      sectors: (this.sectorSelectorSectors || []).map((entry, index) => ({
        sector: entry.sector,
        checkpointEligible: Boolean(entry.checkpointEligible),
        unlocked: Boolean(entry.unlocked),
        playSector: entry.playSector || null,
        overrunCheckpoint: Boolean(entry.overrunCheckpoint),
        hasRecord: Boolean(entry.record?.scoreEarned > 0),
        bounds: this.sectorSelectorItems?.[index]?._bounds || null
      }))
    };
  }

  createButton(text, layout, options = {}) {
    const container = new PIXI.Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.zIndex = 10;

    const btnWidth = options.compact ? 164 : (layout?.isMobile ? 218 : 286);
    const btnHeight = options.compact ? 36 : (layout?.isMobile ? 38 : 46);
    const fontSize = getResponsiveFontSize(layout || { isMobile: false }, 'button');

    const bg = new PIXI.Graphics();
    const focus = new PIXI.Graphics();
    container.addChild(focus);
    container.addChild(bg);

    const shine = new PIXI.Graphics();
    container.addChild(shine);

    const icon = new PIXI.Graphics();
    icon.label = `ui_menuTileIcon_${options.icon || 'panel'}`;
    container.addChild(icon);

    const iconSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    iconSprite.label = `ui_menuTileIconAsset_${options.icon || 'panel'}`;
    iconSprite.anchor.set(0.5);
    iconSprite.visible = false;
    container.addChild(iconSprite);

    const label = createText(text, {
      fontFamily: FONT_BUTTON,
      fontSize: fontSize,
      fontWeight: '800',
      letterSpacing: 0,
      fill: '#c9fbff',
      stroke: '#031323',
      strokeThickness: 3,
      padding: 36
    });
    label.anchor.set(0.5);
    container.addChild(label);

    const sublabel = createText('', {
      fontFamily: FONT_MONO,
      fontSize: Math.max(8, Math.round(fontSize * 0.46)),
      fontWeight: '800',
      letterSpacing: 0,
      fill: '#9feeff',
      stroke: '#031323',
      strokeThickness: 2,
      padding: 18,
      align: 'left'
    });
    sublabel.anchor.set(0.5);
    container.addChild(sublabel);

    const body = createText('', {
      fontFamily: FONT_MONO,
      fontSize: Math.max(10, Math.round(fontSize * 0.58)),
      fontWeight: '800',
      letterSpacing: 0,
      fill: '#dffcff',
      stroke: '#031323',
      strokeThickness: 2,
      padding: 18,
      align: 'left',
      wordWrap: true,
      wordWrapWidth: Math.max(180, btnWidth - 48),
      lineHeight: Math.max(14, Math.round(fontSize * 0.8))
    });
    body.anchor.set(0, 0);
    body.visible = false;
    container.addChild(body);

    // Store dimensions for hover redraw
    container._btnWidth = btnWidth;
    container._btnHeight = btnHeight;
    container._variant = options.variant || 'secondary';
    container._accent = options.accent || 0x37f5ff;
    container._labelKey = options.labelKey || text;
    container._sublabelKey = options.subLabel || '';
    container._bodyKey = options.bodyLabel || '';
    container._dynamicLabel = options.dynamicLabel || null;
    container._dynamicSubLabel = options.dynamicSubLabel || null;
    container._dynamicBodyLabel = options.dynamicBodyLabel || null;
    container._iconType = options.icon || 'panel';
    container._iconAssetKey = options.iconAsset || MENU_ICON_ASSET_KEYS[container._iconType] || container._iconType;
    container._labelMinScale = Number.isFinite(options.labelMinScale) ? options.labelMinScale : null;
    container._bg = bg;
    container._shine = shine;
    container._icon = icon;
    container._iconSprite = iconSprite;
    container._label = label;
    container._sublabel = sublabel;
    container._bodyLabel = body;
    this.refreshButtonCopy(container);
    container._focus = focus;
    this.drawMenuButton(container, false);

    container.on('pointerover', () => {
      this.setInputDevice('keyboard');
      this.setMenuFocusByButton(container);
      playMenuFocusSfx(0.11);
      label.style.fill = '#ffffff';
      sublabel.style.fill = '#dffcff';
      this.drawMenuButton(container, true);
    });

    container.on('pointerout', () => {
      label.style.fill = '#c9fbff';
      sublabel.style.fill = '#9feeff';
      this.drawMenuButton(container, false);
    });

    container.on('pointerdown', () => {
      playMenuConfirmSfx(container._variant === 'primary' ? 0.32 : 0.24);
      this.menuFx?.burst?.(container.x, container.y, {
        color: container._accent || 0xffd15c,
        radius: container._variant === 'primary' ? 132 : 92,
        durationMs: 460
      });
    });

    return container;
  }

  configureRunModeCard(button, { id, secondary = 0x7fffd8 } = {}) {
    if (!button) return button;
    button._isRunModeCard = true;
    button._runModeCardId = id || button._runModeCardId || 'runMode';
    button._secondaryAccent = secondary;
    if (button._bodyLabel) button._bodyLabel.visible = false;
    return button;
  }

  createSectorSelectorOverlay(layout) {
    const overlay = new PIXI.Container();
    overlay.label = 'ui_sectorChallengeSelector';
    overlay.zIndex = 36;
    overlay.visible = false;
    overlay.alpha = 0;
    overlay.eventMode = 'static';
    overlay.cursor = 'default';
    overlay.on('pointerdown', (event) => event.stopPropagation?.());
    this.sectorSelectorOverlay = overlay;

    this.sectorSelectorPanel = new PIXI.Graphics();
    this.sectorSelectorPanel.label = 'ui_sectorChallengeSelectorPanel';
    this.sectorSelectorPanel.eventMode = 'static';
    this.sectorSelectorPanel.on('pointerdown', (event) => event.stopPropagation?.());
    overlay.addChild(this.sectorSelectorPanel);

    this.sectorSelectorTitle = createText(translateText('SELECT START POINT'), {
      fontFamily: FONT_DISPLAY,
      fontSize: Math.max(24, getResponsiveFontSize(layout, 'subtitle') * 1.45),
      fontWeight: '900',
      fill: '#dffcff',
      stroke: '#031527',
      strokeThickness: 5,
      padding: 20,
      dropShadow: true,
      dropShadowColor: '#37f5ff',
      dropShadowBlur: 10,
      dropShadowDistance: 0,
      dropShadowAlpha: 0.72
    });
    this.sectorSelectorTitle.anchor.set(0, 0.5);
    overlay.addChild(this.sectorSelectorTitle);

    this.sectorSelectorSubtitle = createText(translateText('START POINTS UNLOCK EVERY 5 SECTORS'), {
      fontFamily: FONT_MONO,
      fontSize: Math.max(12, getResponsiveFontSize(layout, 'small')),
      fontWeight: '900',
      fill: '#7fffd8',
      stroke: '#020711',
      strokeThickness: 3,
      padding: 12,
      lineHeight: Math.max(15, Math.round(getResponsiveFontSize(layout, 'small') * 1.26)),
      wordWrap: true
    });
    this.sectorSelectorSubtitle.anchor.set(0, 0.5);
    overlay.addChild(this.sectorSelectorSubtitle);

    this.sectorSelectorGrid = new PIXI.Container();
    this.sectorSelectorGrid.label = 'ui_sectorChallengeSelectorGrid';
    overlay.addChild(this.sectorSelectorGrid);

    this.sectorSelectorDetail = createText('', {
      fontFamily: FONT_MONO,
      fontSize: Math.max(12, getResponsiveFontSize(layout, 'small')),
      fontWeight: '900',
      fill: '#dffcff',
      stroke: '#020711',
      strokeThickness: 3,
      padding: 18,
      lineHeight: Math.max(17, Math.round(getResponsiveFontSize(layout, 'small') * 1.45)),
      wordWrap: true,
      wordWrapWidth: 260
    });
    this.sectorSelectorDetail.anchor.set(0, 0);
    overlay.addChild(this.sectorSelectorDetail);

    this.sectorSelectorLaunchButton = new PIXI.Container();
    this.sectorSelectorLaunchButton.label = 'ui_sectorChallengeSelectorLaunch';
    this.sectorSelectorLaunchButton.eventMode = 'static';
    this.sectorSelectorLaunchButton.cursor = 'pointer';
    this.sectorSelectorLaunchBg = new PIXI.Graphics();
    this.sectorSelectorLaunchButton.addChild(this.sectorSelectorLaunchBg);
    this.sectorSelectorLaunchText = createText('', {
      fontFamily: FONT_DISPLAY,
      fontSize: Math.max(14, getResponsiveFontSize(layout, 'button') * 0.82),
      fontWeight: '900',
      fill: '#ffe584',
      stroke: '#020711',
      strokeThickness: 4,
      padding: 14,
      align: 'center'
    });
    this.sectorSelectorLaunchText.anchor.set(0.5);
    this.sectorSelectorLaunchButton.addChild(this.sectorSelectorLaunchText);
    this.sectorSelectorLaunchButton.on('pointerdown', (event) => {
      event.stopPropagation?.();
      this.activateSectorSelectorSelection();
    });
    overlay.addChild(this.sectorSelectorLaunchButton);

    this.sectorSelectorBackButton = new PIXI.Container();
    this.sectorSelectorBackButton.label = 'ui_sectorChallengeSelectorBack';
    this.sectorSelectorBackButton.eventMode = 'static';
    this.sectorSelectorBackButton.cursor = 'pointer';
    this.sectorSelectorBackBg = new PIXI.Graphics();
    this.sectorSelectorBackButton.addChild(this.sectorSelectorBackBg);
    this.sectorSelectorBackText = createText(translateText('BACK'), {
      fontFamily: FONT_MONO,
      fontSize: Math.max(11, getResponsiveFontSize(layout, 'small')),
      fontWeight: '900',
      fill: '#9feeff',
      stroke: '#020711',
      strokeThickness: 3,
      padding: 12,
      align: 'center'
    });
    this.sectorSelectorBackText.anchor.set(0.5);
    this.sectorSelectorBackButton.addChild(this.sectorSelectorBackText);
    this.sectorSelectorBackButton.on('pointerdown', (event) => {
      event.stopPropagation?.();
      this.closeSectorSelector();
    });
    overlay.addChild(this.sectorSelectorBackButton);

    this.sectorSelectorHint = createText('', {
      fontFamily: FONT_MONO,
      fontSize: Math.max(11, getResponsiveFontSize(layout, 'small') - 1),
      fontWeight: '900',
      fill: '#9feeff',
      stroke: '#020711',
      strokeThickness: 3,
      padding: 12,
      align: 'center'
    });
    this.sectorSelectorHint.anchor.set(0.5);
    overlay.addChild(this.sectorSelectorHint);

    this.container.addChild(overlay);
  }

  getSectorSelectorColumns() {
    const width = this.game?.getWidth?.() || this.game?.app?.screen?.width || 1280;
    if (width < 900) return 2;
    if (width < 1450) return 3;
    return 5;
  }

  buildSectorSelectorSectors() {
    const highest = Math.max(1, Math.floor(Number(this.sectorStartState?.highestReachedSector) || 1));
    const checkpoints = this.sectorStartState?.checkpoints || [];
    const maxCheckpoint = checkpoints.length ? Math.max(...checkpoints) : 0;
    const displayMax = Math.max(
      SECTOR_START_CHECKPOINT_INTERVAL,
      Math.min(65, Math.ceil(Math.max(highest, maxCheckpoint, 5) / SECTOR_START_CHECKPOINT_INTERVAL) * SECTOR_START_CHECKPOINT_INTERVAL)
    );
    const sectors = [];
    for (let sector = SECTOR_START_CHECKPOINT_INTERVAL; sector <= displayMax; sector += SECTOR_START_CHECKPOINT_INTERVAL) {
      sectors.push(sector);
    }
    return sectors.map((sector) => {
      const record = getSectorStartChallengeRecord(sector);
      const unlocked = checkpoints.includes(sector);
      const playSector = unlocked ? getSectorStartPlaySector(sector) : null;
      const info = getSectorInfo(playSector || sector);
      const overrunCheckpoint = sector % 10 === 0;
      return {
        sector,
        checkpointEligible: true,
        unlocked,
        playSector,
        record,
        name: info.name,
        bossCheckpoint: info.bossCheckpoint,
        overrunCheckpoint
      };
    });
  }

  openSectorSelector() {
    this.refreshSectorStartState();
    this.sectorSelectorSectors = this.buildSectorSelectorSectors();
    const selected = this.getSelectedSectorStartCheckpoint();
    const selectedIndex = this.sectorSelectorSectors.findIndex((entry) => entry.sector === selected);
    const firstUnlocked = this.sectorSelectorSectors.findIndex((entry) => entry.unlocked);
    this.selectedSectorSelectorIndex = selectedIndex >= 0 ? selectedIndex : Math.max(0, firstUnlocked);
    this.sectorSelectorOpen = true;
    this.sectorSelectorOpenAge = 0;
    this.sectorSelectorOverlay.visible = true;
    this.sectorSelectorOverlay.alpha = 0;
    this.setMenuFocusByButton(this.sectorStartBtn);
    this.layoutMenu({ forceLabelGpuRefresh: true });
    AudioManager.playSfx('ui_open', { volume: 0.24, minIntervalMs: 120 });
  }

  closeSectorSelector() {
    if (!this.sectorSelectorOpen) return;
    this.sectorSelectorOpen = false;
    this.sectorSelectorOpenAge = 0;
    if (this.sectorSelectorOverlay) {
      this.sectorSelectorOverlay.visible = false;
      this.sectorSelectorOverlay.alpha = 0;
    }
    this.setMenuFocusByButton(this.sectorStartBtn);
    this.menuGamepadNavigator.suppressUntilReleased();
    AudioManager.playSfx('ui_open', { volume: 0.18, minIntervalMs: 120 });
  }

  moveSectorSelectorFocus(delta) {
    if (!this.sectorSelectorOpen || !this.sectorSelectorSectors.length) return;
    const count = this.sectorSelectorSectors.length;
    this.selectedSectorSelectorIndex = (this.selectedSectorSelectorIndex + delta + count) % count;
    this.drawSectorSelectorOverlay();
    AudioManager.playSfx('thrusterFire', { volume: 0.07, minIntervalMs: 90 });
  }

  activateSectorSelectorSelection() {
    const entry = this.sectorSelectorSectors[this.selectedSectorSelectorIndex];
    if (!entry?.unlocked) {
      this.showExitNotice(translateText('SECTOR START LOCKED'));
      AudioManager.playSfx('ui_open', { volume: 0.14, minIntervalMs: 180 });
      return;
    }
    const checkpoints = this.sectorStartState?.checkpoints || [];
    const index = checkpoints.indexOf(entry.sector);
    if (index >= 0) {
      this.selectedSectorStartIndex = index;
      this.sectorStartState = {
        ...this.sectorStartState,
        selectedCheckpoint: checkpoints[index]
      };
    }
    this.updateSectorStartButton({ forceGpuRefresh: true });
    this.launchSectorStartRun(entry.sector);
  }

  attachSectorStartStepperCue(button) {
    if (!button || button._stepperCue) return;
    const cue = new PIXI.Graphics();
    cue.label = 'ui_sectorStartCheckpointArrows';
    cue.eventMode = 'none';
    button._stepperCue = cue;
    button.addChild(cue);
  }

  drawSectorStartStepperCue(button = this.sectorStartBtn) {
    const cue = button?._stepperCue;
    if (!cue) return;
    const checkpoints = this.sectorStartState?.checkpoints || [];
    const focused = Boolean(button._focused);
    const w = button._btnWidth || 286;
    const h = button._btnHeight || 46;
    const dockMode = Number.isFinite(button._dockIndex);
    const visible = Boolean(button?.visible
      && !this.sectorSelectorOpen
      && !button._isRunModeCard
      && this.sectorStartState?.available
      && checkpoints.length > 1
      && (!dockMode || focused));
    button.hitArea = dockMode
      ? new PIXI.Rectangle(-w / 2, -h / 2, w, h)
      : new PIXI.Rectangle(-w / 2 - 58, -h / 2 - 6, w + 116, h + 12);
    cue.visible = visible;
    cue.clear();
    if (!visible) return;

    const pulse = 0.5 + Math.sin(this.animationTime * 6) * 0.5;
    const alpha = focused ? 0.86 + pulse * 0.14 : 0.58;
    const boxW = Math.max(34, Math.min(42, h * 0.86));
    const boxH = Math.max(32, Math.min(42, h * 0.86));
    const sideX = dockMode ? (w / 2 - boxW / 2 - 7) : (w / 2 + boxW / 2 + 9);
    const color = focused ? 0xffef7e : 0x37f5ff;

    for (const side of [-1, 1]) {
      const centerX = side * sideX;
      if (!dockMode) {
        cue.moveTo(side * (w / 2 + 3), 0);
        cue.lineTo(side * (sideX - boxW / 2 - 4), 0);
        cue.stroke({ color, width: focused ? 2 : 1.25, alpha: focused ? 0.7 : 0.32 });
      }
      cue.roundRect(centerX - boxW / 2, -boxH / 2, boxW, boxH, 7);
      cue.fill({ color: 0x031323, alpha: focused ? 0.58 : 0.34 });
      cue.roundRect(centerX - boxW / 2, -boxH / 2, boxW, boxH, 7);
      cue.stroke({ color, width: focused ? 2 : 1.5, alpha: dockMode ? alpha * 0.72 : alpha });

      const pointX = centerX + side * 6;
      const backX = centerX - side * 7;
      cue.moveTo(backX, -9);
      cue.lineTo(pointX, 0);
      cue.lineTo(backX, 9);
      cue.stroke({ color: 0xffffff, width: focused ? 2.8 : 2.2, alpha: focused ? 0.92 : 0.68 });
      cue.moveTo(backX - side * 4, -9);
      cue.lineTo(pointX - side * 3, 0);
      cue.lineTo(backX - side * 4, 9);
      cue.stroke({ color, width: focused ? 2 : 1.5, alpha });
    }
  }

  attachCodexSignalCue(button) {
    if (!button || button._signalCue) return;
    const cue = new PIXI.Graphics();
    cue.label = 'ui_codexUnreadSignal';
    cue.visible = false;
    button._signalCue = cue;
    button.addChild(cue);
  }

  updateCodexSignalCue(delta = 0) {
    if (!this.threatCodexBtn?._signalCue) return;
    this.codexCuePollMs -= delta * 16.67;
    if (this.codexCuePollMs <= 0) {
      this.codexCuePollMs = 600;
      try {
        this.codexUnreadCount = getDiscoveryStats().unreadCount || 0;
      } catch {
        this.codexUnreadCount = 0;
      }
    }
    const cue = this.threatCodexBtn._signalCue;
    const active = this.codexUnreadCount > 0;
    cue.visible = active;
    if (!active) {
      cue.clear();
      return;
    }
    const w = this.threatCodexBtn._btnWidth || 286;
    const h = this.threatCodexBtn._btnHeight || 46;
    const pulse = 0.5 + Math.sin(this.animationTime * 5.6) * 0.5;
    const x = w / 2 - 24;
    const y = -h / 2 + 16;
    const chipW = 32;
    const chipH = 20;
    cue.clear();
    cue.roundRect(x - chipW / 2 + 2, y - chipH / 2 + 3, chipW, chipH, 5);
    cue.fill({ color: 0x000000, alpha: 0.34 });
    cue.roundRect(x - chipW / 2, y - chipH / 2, chipW, chipH, 5);
    cue.fill({ color: 0x051524, alpha: 0.9 });
    cue.roundRect(x - chipW / 2, y - chipH / 2, chipW, chipH, 5);
    cue.stroke({ color: 0xffef7e, width: 1.45, alpha: 0.72 + pulse * 0.18 });
    cue.rect(x - chipW / 2 + 4, y - chipH / 2 + 5, 4, chipH - 10);
    cue.fill({ color: 0x7fffd8, alpha: 0.58 + pulse * 0.16 });
    cue.rect(x + chipW / 2 - 8, y - chipH / 2 + 5, 4, chipH - 10);
    cue.fill({ color: 0x7fffd8, alpha: 0.42 + pulse * 0.14 });
    cue.circle(x, y, 4.2 + pulse * 0.8);
    cue.fill({ color: 0xffd15c, alpha: 0.82 + pulse * 0.14 });
    cue.circle(x, y, 8.4 + pulse * 2.2);
    cue.stroke({ color: 0xffef7e, width: 1, alpha: 0.24 + pulse * 0.18 });
    for (const pinY of [-5, 0, 5]) {
      cue.moveTo(x - chipW / 2 - 4, y + pinY);
      cue.lineTo(x - chipW / 2, y + pinY);
      cue.moveTo(x + chipW / 2, y + pinY);
      cue.lineTo(x + chipW / 2 + 4, y + pinY);
    }
    cue.stroke({ color: 0x7fffd8, width: 1, alpha: 0.34 + pulse * 0.12 });
  }

  updateMenuButtonMotion(delta = 0) {
    const buttons = [
      this.startBtn,
      this.scoutRunBtn,
      this.sectorStartBtn,
      this.highscoreBtn,
      this.storyBtn,
      this.threatCodexBtn,
      this.achievementsBtn,
      this.settingsBtn,
      this.musicBtn,
      this.helpBtn,
      this.exitBtn
    ].filter(Boolean);
    const modalOpen = Boolean(this.sectorSelectorOpen);
    const smoothing = Math.min(1, Math.max(0.12, delta * 0.16));
    buttons.forEach((button) => {
      if (!Number.isFinite(button._layoutY)) return;
      const focused = Boolean(button._focused && !modalOpen);
      const primary = button === this.startBtn;
      const utility = button._variant === 'utility' || button._variant === 'utilityDanger';
      const breathe = primary && !modalOpen ? Math.sin(this.animationTime * 2.25) * 0.018 : 0;
      const targetScale = focused ? (utility ? 1.04 : 1.056) : (primary ? 1 + breathe : 1);
      const targetY = button._layoutY - (focused ? (utility ? 3 : 5) : 0);
      button._motionScale = Number.isFinite(button._motionScale)
        ? button._motionScale + (targetScale - button._motionScale) * smoothing
        : targetScale;
      button._motionY = Number.isFinite(button._motionY)
        ? button._motionY + (targetY - button._motionY) * smoothing
        : targetY;
      button.scale.set(button._motionScale);
      button.y = button._motionY;
      if ((focused || primary || utility) && button.visible && button.alpha > 0.05) {
        this.drawMenuButton(button, false);
      }
    });
    if (this.menuPanel?.visible && this.menuPanel.alpha > 0.05 && !modalOpen) {
      this.drawMenuPanel();
    }
  }

  drawMenuButtonIcon(icon, type, centerX, centerY, size, color, alpha = 0.82) {
    if (!icon) return;
    const s = size;
    icon.clear();
    const stroke = { color, width: Math.max(1.4, s * 0.085), alpha };
    const thin = { color, width: Math.max(1, s * 0.055), alpha: alpha * 0.72 };
    if (type === 'launch') {
      icon.moveTo(centerX, centerY - s * 0.42);
      icon.lineTo(centerX + s * 0.34, centerY + s * 0.32);
      icon.lineTo(centerX, centerY + s * 0.14);
      icon.lineTo(centerX - s * 0.34, centerY + s * 0.32);
      icon.lineTo(centerX, centerY - s * 0.42);
      icon.stroke(stroke);
      icon.moveTo(centerX, centerY - s * 0.18);
      icon.lineTo(centerX, centerY + s * 0.28);
      icon.moveTo(centerX - s * 0.2, centerY + s * 0.08);
      icon.lineTo(centerX - s * 0.42, centerY + s * 0.02);
      icon.moveTo(centerX + s * 0.2, centerY + s * 0.08);
      icon.lineTo(centerX + s * 0.42, centerY + s * 0.02);
      icon.stroke(thin);
      return;
    }
    if (type === 'target') {
      icon.circle(centerX, centerY, s * 0.34);
      icon.stroke(stroke);
      icon.circle(centerX, centerY, s * 0.13);
      icon.stroke(thin);
      icon.moveTo(centerX - s * 0.48, centerY);
      icon.lineTo(centerX + s * 0.48, centerY);
      icon.moveTo(centerX, centerY - s * 0.48);
      icon.lineTo(centerX, centerY + s * 0.48);
      icon.stroke(thin);
      return;
    }
    if (type === 'hangar') {
      icon.moveTo(centerX - s * 0.42, centerY + s * 0.36);
      icon.lineTo(centerX, centerY - s * 0.42);
      icon.lineTo(centerX + s * 0.42, centerY + s * 0.36);
      icon.stroke(stroke);
      icon.moveTo(centerX - s * 0.18, centerY + s * 0.16);
      icon.lineTo(centerX, centerY - s * 0.1);
      icon.lineTo(centerX + s * 0.18, centerY + s * 0.16);
      icon.stroke(thin);
      return;
    }
    if (type === 'bars') {
      [-0.26, 0, 0.26].forEach((offset, index) => {
        const h = s * (0.38 + index * 0.18);
        icon.rect(centerX + offset * s - s * 0.055, centerY + s * 0.36 - h, s * 0.11, h);
        icon.stroke(stroke);
      });
      return;
    }
    if (type === 'codex') {
      icon.roundRect(centerX - s * 0.38, centerY - s * 0.36, s * 0.76, s * 0.72, s * 0.06);
      icon.stroke(stroke);
      icon.moveTo(centerX, centerY - s * 0.34);
      icon.lineTo(centerX, centerY + s * 0.34);
      icon.moveTo(centerX - s * 0.24, centerY - s * 0.12);
      icon.lineTo(centerX - s * 0.08, centerY - s * 0.12);
      icon.moveTo(centerX + s * 0.08, centerY - s * 0.12);
      icon.lineTo(centerX + s * 0.24, centerY - s * 0.12);
      icon.stroke(thin);
      return;
    }
    if (type === 'star') {
      const points = [
        [0, -0.42], [0.12, -0.12], [0.42, -0.12], [0.18, 0.08],
        [0.28, 0.4], [0, 0.2], [-0.28, 0.4], [-0.18, 0.08],
        [-0.42, -0.12], [-0.12, -0.12], [0, -0.42]
      ];
      points.forEach(([px, py], index) => {
        const x = centerX + px * s;
        const y = centerY + py * s;
        if (index === 0) icon.moveTo(x, y);
        else icon.lineTo(x, y);
      });
      icon.stroke(stroke);
      return;
    }
    if (type === 'gear') {
      icon.circle(centerX, centerY, s * 0.25);
      icon.stroke(stroke);
      icon.circle(centerX, centerY, s * 0.1);
      icon.stroke(thin);
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        const x1 = centerX + Math.cos(angle) * s * 0.34;
        const y1 = centerY + Math.sin(angle) * s * 0.34;
        const x2 = centerX + Math.cos(angle) * s * 0.45;
        const y2 = centerY + Math.sin(angle) * s * 0.45;
        icon.moveTo(x1, y1);
        icon.lineTo(x2, y2);
      }
      icon.stroke(thin);
      return;
    }
    if (type === 'exit') {
      icon.moveTo(centerX - s * 0.34, centerY - s * 0.36);
      icon.lineTo(centerX - s * 0.34, centerY + s * 0.36);
      icon.lineTo(centerX + s * 0.08, centerY + s * 0.36);
      icon.moveTo(centerX - s * 0.08, centerY);
      icon.lineTo(centerX + s * 0.42, centerY);
      icon.moveTo(centerX + s * 0.22, centerY - s * 0.18);
      icon.lineTo(centerX + s * 0.42, centerY);
      icon.lineTo(centerX + s * 0.22, centerY + s * 0.18);
      icon.stroke(stroke);
      return;
    }
    if (type === 'music') {
      icon.moveTo(centerX - s * 0.05, centerY - s * 0.38);
      icon.lineTo(centerX - s * 0.05, centerY + s * 0.2);
      icon.circle(centerX - s * 0.2, centerY + s * 0.28, s * 0.12);
      icon.moveTo(centerX - s * 0.05, centerY - s * 0.34);
      icon.lineTo(centerX + s * 0.28, centerY - s * 0.26);
      icon.lineTo(centerX + s * 0.28, centerY + s * 0.08);
      icon.circle(centerX + s * 0.13, centerY + s * 0.16, s * 0.12);
      icon.stroke(stroke);
      return;
    }
    icon.circle(centerX, centerY, s * 0.32);
    icon.stroke(stroke);
  }

  drawRunModeCard(container, isHover = false) {
    const bg = container?._bg;
    const shine = container?._shine;
    const focus = container?._focus;
    if (!bg || !shine) return;

    const w = container._btnWidth || 340;
    const h = container._btnHeight || 138;
    const x = -w / 2;
    const y = -h / 2;
    const isMayhem = container === this.startBtn;
    const accent = container._accent || 0x37f5ff;
    const secondary = container._secondaryAccent || 0x7fffd8;
    const isFocused = Boolean(container._focused && !this.sectorSelectorOpen);
    const active = isHover || isFocused;
    const pulse = 0.5 + Math.sin(this.animationTime * (isMayhem ? 2.6 : 3.3)) * 0.5;
    const sweep = active ? (0.5 + Math.sin(this.animationTime * 4.9) * 0.5) : pulse;
    const hotAccent = isMayhem ? 0xffef7e : (active ? 0xdffcff : secondary);

    focus.clear();
    if (isFocused) {
      drawCutPanel(focus, x - 8, y - 8, w + 16, h + 16, 12, { color: hotAccent, alpha: 0.05 + pulse * 0.035 }, { color: hotAccent, width: 2, alpha: 0.78 + pulse * 0.16 });
      focus.rect(x + w * 0.18, y - 7, w * 0.64, 2);
      focus.fill({ color: hotAccent, alpha: 0.28 + pulse * 0.12 });
    }

    bg.clear();
    drawCutPanel(bg, x + 10, y + 12, w, h, 14, { color: 0x000000, alpha: 0.52 });
    drawCutPanel(bg, x - 3, y - 3, w + 6, h + 6, 14, { color: accent, alpha: active ? 0.2 : (isMayhem ? 0.13 + pulse * 0.06 : 0.09) }, { color: accent, width: active ? 2 : 1.35, alpha: active ? 0.8 : (isMayhem ? 0.5 + pulse * 0.12 : 0.38) });
    drawCutPanel(bg, x, y, w, h, 12, { color: isMayhem ? 0x241704 : 0x031321, alpha: 0.88 }, { color: active ? hotAccent : accent, width: active ? 2.2 : 1.4, alpha: active ? 0.9 : 0.52 });
    drawCutPanel(bg, x + 6, y + 6, w - 12, h - 12, 10, { color: isMayhem ? 0x3b2506 : 0x06243a, alpha: active ? 0.6 : 0.46 }, { color: 0xffffff, width: 1, alpha: active ? 0.16 : 0.08 });
    bg.rect(x + 8, y + 8, w - 16, Math.max(34, h * 0.34));
    bg.fill({ color: isMayhem ? 0xffd15c : accent, alpha: active ? 0.18 : 0.1 });
    bg.rect(x + 12, y + h - 13, w - 24, 4);
    bg.fill({ color: isMayhem ? 0xffd15c : accent, alpha: active ? 0.56 : 0.34 });
    bg.rect(x + 12, y + 12, 4, h - 24);
    bg.fill({ color: hotAccent, alpha: active ? 0.82 : 0.48 });
    bg.rect(x + w - 16, y + 12, 4, h - 24);
    bg.fill({ color: accent, alpha: active ? 0.52 : 0.28 });
    const sweepX = x + 24 + (w - 118) * sweep;
    bg.rect(sweepX, y + 12, 82, 3);
    bg.fill({ color: 0xffffff, alpha: active ? 0.26 : 0.12 + pulse * 0.08 });
    bg.rect(x + 24, y + Math.round(h * 0.55), w - 48, 1);
    bg.fill({ color: secondary, alpha: active ? 0.34 : 0.18 });

    const label = container._label;
    const sublabel = container._sublabel;
    const body = container._bodyLabel;
    const compactCard = h < 92;
    const icon = container._icon;
    const iconSprite = container._iconSprite;
    const assetKey = container._iconAssetKey;
    const texture = assetKey ? this.menuIconTextures?.[assetKey] : null;
    const useAssetIcon = Boolean(iconSprite && GameAssets.isValidTexture(texture));
    const iconSize = compactCard ? clampNumber(h * 0.3, 24, 30) : clampNumber(h * 0.26, 34, 48);
    const iconX = x + (compactCard ? 32 : 42);
    const iconY = y + (compactCard ? h * 0.5 : 40);

    bg.circle(iconX + 2, iconY + 4, iconSize * 0.72);
    bg.fill({ color: 0x000000, alpha: 0.38 });
    bg.circle(iconX, iconY, iconSize * 0.82);
    bg.fill({ color: active ? accent : 0x031323, alpha: active ? 0.16 : 0.54 });
    bg.circle(iconX, iconY, iconSize * 0.86);
    bg.stroke({ color: hotAccent, width: active ? 2 : 1.4, alpha: active ? 0.78 : 0.48 });

    if (label) {
      label.visible = true;
      label.anchor.set(0, 0.5);
      label.style.align = 'left';
      label.style.fill = isMayhem ? '#ffe584' : '#dffcff';
      label.style.strokeThickness = 4;
      label.x = x + (compactCard ? 66 : 82);
      label.y = compactCard ? (y + h * 0.38) : (y + 32);
    }
    if (sublabel) {
      sublabel.visible = true;
      sublabel.anchor.set(0, 0.5);
      sublabel.style.align = 'left';
      sublabel.style.fill = isMayhem ? '#fff3b6' : '#9feeff';
      sublabel.alpha = sublabel.text ? (active ? 1 : 0.84) : 0;
      sublabel.x = x + (compactCard ? 66 : 82);
      sublabel.y = compactCard ? (y + h * 0.66) : (y + 56);
    }
    if (body) {
      body.visible = false;
      body.anchor.set(0, 0);
      body.style.align = 'left';
      body.style.fill = active ? '#ffffff' : '#dffcff';
      body.alpha = active ? 0.96 : 0.82;
      body.style.wordWrap = true;
      body.style.wordWrapWidth = Math.max(180, w - 48);
      body.x = x + 24;
      body.y = y + Math.max(70, h * 0.58);
    }
    if (icon) {
      if (useAssetIcon) {
        icon.visible = false;
        iconSprite.visible = true;
        iconSprite.texture = texture;
        iconSprite.x = iconX;
        iconSprite.y = iconY;
        const maxSide = Math.max(texture.width || 1, texture.height || 1);
        iconSprite.scale.set((iconSize * 1.2) / maxSide);
        iconSprite.alpha = active ? 1 : 0.94;
      } else {
        if (iconSprite) iconSprite.visible = false;
        icon.visible = true;
        this.drawMenuButtonIcon(icon, container._iconType, iconX, iconY, iconSize * 0.56, hotAccent, active ? 1 : 0.84);
      }
    }

    shine.clear();
    shine.moveTo(x + 20, y + 9);
    shine.lineTo(x + w - 20, y + 9);
    shine.stroke({ color: 0xffffff, width: 1.2, alpha: active ? 0.24 : 0.12 });
    shine.moveTo(x + 24, y + h - 9);
    shine.lineTo(x + w - 24, y + h - 9);
    shine.stroke({ color: hotAccent, width: active ? 1.8 : 1.2, alpha: active ? 0.42 : 0.22 });
    if (active) {
      shine.moveTo(x + 28 + (w - 132) * sweep, y + h - 17);
      shine.lineTo(x + 112 + (w - 132) * sweep, y + h - 17);
      shine.stroke({ color: 0xffffff, width: 1.4, alpha: 0.24 });
    }

    container.hitArea = new PIXI.Rectangle(x, y, w, h);
    if (container?._stepperCue) {
      container._stepperCue.visible = false;
      container._stepperCue.clear();
    }
  }

  drawMenuButton(container, isHover = false) {
    if (container?._isRunModeCard) {
      this.drawRunModeCard(container, isHover);
      return;
    }
    const bg = container?._bg;
    const shine = container?._shine;
    const focus = container?._focus;
    if (!bg || !shine) return;

    const w = container._btnWidth || 286;
    const h = container._btnHeight || 46;
    const x = -w / 2;
    const y = -h / 2;
    const isPrimary = container._variant === 'primary';
    const isUtility = container._variant === 'utility' || container._variant === 'utilityDanger';
    const isUtilityDanger = container._variant === 'utilityDanger';
    const isDanger = container._variant === 'danger';
    const isCompact = h <= 38;
    const isDockButton = Number.isFinite(container._dockIndex);
    const isNarrowDockButton = isDockButton && !isPrimary && !isUtility && w < 158;
    const accent = container._accent || 0x37f5ff;
    const isModalOpen = Boolean(this.sectorSelectorOpen);
    const isFocused = Boolean(container._focused && !isModalOpen);
    const active = isHover || isFocused;
    const sweep = active ? (0.5 + Math.sin(this.animationTime * 4.8) * 0.5) : 0;
    const ignition = isPrimary ? (0.5 + Math.sin(this.animationTime * 2.7) * 0.5) : 0;
    const drawAccent = isUtilityDanger
      ? (active ? 0xff6b6b : 0x6e8492)
      : (isDanger ? 0xff5f6a : (isPrimary ? 0xffd15c : accent));
    const hotAccent = isUtilityDanger
      ? 0xff9aa5
      : (isDanger ? 0xff98a2 : (isPrimary ? 0xffef7e : 0x8effff));
    const baseColor = isPrimary ? 0x261904 : (isDanger ? 0x19070e : 0x031321);
    const glassColor = isPrimary
      ? 0x3b2506
      : (isDanger ? 0x2b1019 : (isUtility ? 0x061d2c : 0x06243a));
    const cut = clampNumber(h * 0.16, 5, 10);
    const iconRenderSize = isCompact
      ? clampNumber(h * 0.82, 24, 30)
      : clampNumber(h * (isPrimary ? 0.63 : (isNarrowDockButton ? 0.36 : 0.465)), isPrimary ? 78 : (isNarrowDockButton ? 40 : 56), isPrimary ? 90 : (isNarrowDockButton ? 50 : 68));
    const iconPlateSize = iconRenderSize + (isCompact ? 4 : (isPrimary ? 18 : 12));
    const label = container._label;
    const sublabel = container._sublabel;
    const icon = container._icon;
    const iconSprite = container._iconSprite;
    const assetKey = container._iconAssetKey;
    const texture = assetKey ? this.menuIconTextures?.[assetKey] : null;
    const useAssetIcon = Boolean(iconSprite && GameAssets.isValidTexture(texture));
    const hasSubLabel = Boolean(sublabel?.text);

    focus?.clear();
    if (isFocused) {
      const focusPulse = 0.5 + Math.sin(this.animationTime * 5.2) * 0.5;
      drawCutPanel(focus, x - 8, y - 8, w + 16, h + 16, cut + 5, { color: hotAccent, alpha: 0.04 + focusPulse * 0.03 }, { color: hotAccent, width: 1.8, alpha: 0.72 + focusPulse * 0.16 });
      focus.rect(x + w * 0.22, y - 7, w * 0.56, 2);
      focus.fill({ color: hotAccent, alpha: 0.22 + focusPulse * 0.12 });
      focus.rect(x + 14 + (w - 84) * sweep, y - 5, 56, 2);
      focus.fill({ color: 0xffffff, alpha: 0.2 + focusPulse * 0.12 });
    }

    bg.clear();
    drawCutPanel(bg, x + 8, y + 10, w, h, cut, { color: 0x000000, alpha: isPrimary ? 0.58 : 0.48 });
    drawCutPanel(bg, x + 3, y + 4, w, h, cut, { color: 0x000000, alpha: 0.22 });
    drawCutPanel(bg, x + 1, y + h - 4, w - 2, 8, Math.max(2, cut - 5), { color: 0x000000, alpha: isPrimary ? 0.42 : 0.32 });
    drawCutPanel(bg, x - 3, y - 3, w + 6, h + 6, cut + 3, { color: drawAccent, alpha: active ? 0.2 : (isPrimary ? 0.09 + ignition * 0.075 : (isUtilityDanger ? 0.035 : 0.075)) }, { color: drawAccent, width: 1, alpha: active ? 0.56 : (isPrimary ? 0.26 + ignition * 0.22 : (isUtilityDanger ? 0.18 : 0.22)) });
    drawCutPanel(bg, x, y, w, h, cut, { color: baseColor, alpha: active ? 0.94 : 0.84 }, { color: active ? hotAccent : drawAccent, width: active ? 2.15 : 1.35, alpha: active ? 0.88 : (isPrimary ? 0.78 : 0.48) });
    drawCutPanel(bg, x + 4, y + 4, w - 8, h - 8, Math.max(2, cut - 3), { color: glassColor, alpha: active ? 0.66 : 0.48 }, { color: 0xffffff, width: 1, alpha: active ? 0.18 : 0.08 });
    drawCutPanel(bg, x + 8, y + h * 0.17, w - 16, h * 0.48, Math.max(2, cut - 4), { color: isPrimary ? 0x5a3a0b : (isDanger ? 0x3b101b : 0x0a3750), alpha: active ? 0.18 : 0.11 });
    if (isPrimary) {
      bg.rect(x + 16, y + h - 13, w - 32, 5);
      bg.fill({ color: 0xffa83d, alpha: active ? 0.42 : 0.2 + ignition * 0.14 });
      drawCutPanel(bg, x + 12, y + 12, w - 24, h - 24, Math.max(3, cut - 4), { color: 0xffef7e, alpha: active ? 0.08 : 0.034 + ignition * 0.055 });
      bg.circle(x + 42, y + h * 0.5, Math.max(18, h * 0.26));
      bg.stroke({ color: 0xffef7e, width: 1.4, alpha: active ? 0.62 : 0.3 + ignition * 0.22 });
      bg.circle(x + 42, y + h * 0.5, Math.max(9, h * 0.13));
      bg.fill({ color: 0xffd15c, alpha: active ? 0.2 : 0.08 + ignition * 0.09 });
    }

    bg.rect(x + 7, y + 6, w - 14, Math.max(12, h * 0.34));
    bg.fill({ color: isPrimary ? 0xffd15c : (isUtilityDanger ? 0x6e8492 : (isDanger ? 0xff5f6a : 0x37f5ff)), alpha: active ? 0.2 : (isUtilityDanger ? 0.055 : 0.1) });
    bg.rect(x + 9, y + h - 8, w - 18, 3);
    bg.fill({ color: drawAccent, alpha: isPrimary ? (active ? 0.72 : 0.5) : (active ? 0.5 : 0.28) });

    const railW = isPrimary ? 5 : 3;
    bg.rect(x + 9, y + 9, railW, h - 18);
    bg.fill({ color: hotAccent, alpha: active ? 0.86 : 0.46 });
    bg.rect(x + w - 12, y + 9, railW, h - 18);
    bg.fill({ color: drawAccent, alpha: active ? 0.5 : 0.25 });

    const cornerLen = clampNumber(w * 0.11, 18, isPrimary ? 42 : 30);
    const cornerAlpha = active ? 0.72 : 0.36;
    bg.moveTo(x + cut + 4, y + 6);
    bg.lineTo(x + cut + cornerLen, y + 6);
    bg.stroke({ color: hotAccent, width: 1.4, alpha: cornerAlpha });
    bg.moveTo(x + w - cut - 4, y + h - 6);
    bg.lineTo(x + w - cut - cornerLen, y + h - 6);
    bg.stroke({ color: drawAccent, width: 1.4, alpha: cornerAlpha });
    bg.moveTo(x + 6, y + h * 0.56);
    bg.lineTo(x + 6 + Math.min(26, w * 0.12), y + h * 0.56);
    bg.stroke({ color: 0xffffff, width: 1, alpha: active ? 0.22 : 0.1 });

    if (!isCompact && icon) {
      const iconCenterX = x + (isPrimary ? 76 : (isNarrowDockButton ? 34 : 50));
      const iconCenterY = hasSubLabel ? -h * 0.08 : 0;
      const plateX = iconCenterX - iconPlateSize / 2;
      const plateY = iconCenterY - iconPlateSize / 2;
      if (useAssetIcon) {
        bg.circle(iconCenterX + 2, iconCenterY + 4, iconPlateSize * (isPrimary ? 0.44 : 0.41));
        bg.fill({ color: 0x000000, alpha: active ? 0.42 : 0.34 });
        bg.circle(iconCenterX, iconCenterY, iconPlateSize * (isPrimary ? 0.54 : 0.48));
        bg.fill({ color: hotAccent, alpha: active ? 0.1 : (isPrimary ? 0.05 + ignition * 0.06 : 0.052) });
        if (isPrimary) {
          bg.circle(iconCenterX, iconCenterY, iconPlateSize * (0.26 + ignition * 0.07));
          bg.fill({ color: 0xffd15c, alpha: 0.045 + ignition * 0.07 });
          bg.moveTo(iconCenterX, iconCenterY - iconPlateSize * 0.44);
          bg.lineTo(iconCenterX, iconCenterY + iconPlateSize * 0.56);
          bg.stroke({ color: 0xffef7e, width: 2.6 + ignition * 1.2, alpha: 0.1 + ignition * 0.22 });
        }
      } else {
        drawCutPanel(bg, plateX + 3, plateY + 4, iconPlateSize, iconPlateSize, Math.max(4, iconPlateSize * 0.18), { color: 0x000000, alpha: 0.32 });
        drawCutPanel(bg, plateX, plateY, iconPlateSize, iconPlateSize, Math.max(4, iconPlateSize * 0.18), { color: 0x020711, alpha: active ? 0.78 : 0.58 }, { color: hotAccent, width: 1.55, alpha: active ? 0.82 : (isPrimary ? 0.5 + ignition * 0.18 : 0.44) });
        drawCutPanel(bg, plateX + 4, plateY + 4, iconPlateSize - 8, iconPlateSize - 8, Math.max(2, iconPlateSize * 0.12), { color: drawAccent, alpha: active ? 0.16 : (isPrimary ? 0.09 + ignition * 0.04 : 0.08) });
        bg.circle(plateX + iconPlateSize / 2, plateY + iconPlateSize / 2, iconPlateSize * 0.35);
        bg.stroke({ color: drawAccent, width: 1, alpha: active ? 0.38 : 0.18 });
        bg.moveTo(plateX + iconPlateSize * 0.22, plateY + iconPlateSize * 0.24);
        bg.lineTo(plateX + iconPlateSize * 0.78, plateY + iconPlateSize * 0.24);
        bg.stroke({ color: 0xffffff, width: 1, alpha: active ? 0.22 : 0.1 });
      }
    }

    shine.clear();
    shine.moveTo(x + 18, y + 8);
    shine.lineTo(x + w - 18, y + 8);
    shine.stroke({ color: 0xffffff, width: 1.1, alpha: active ? 0.24 : 0.12 });
    shine.moveTo(x + 22, y + 13);
    shine.lineTo(x + w * 0.7, y + 13);
    shine.stroke({ color: 0x7fffd8, width: 1, alpha: isPrimary ? 0.12 : 0.18 });
    if (active) {
      const sweepX = x + 18 + (w - 86) * sweep;
      shine.moveTo(sweepX, y + 12);
      shine.lineTo(sweepX + 54, y + 12);
      shine.stroke({ color: 0xffffff, width: 1.2, alpha: isUtilityDanger ? 0.18 : 0.28 });
      shine.moveTo(sweepX + 12, y + h - 10);
      shine.lineTo(sweepX + 66, y + h - 10);
      shine.stroke({ color: hotAccent, width: 1.4, alpha: isPrimary ? 0.36 : 0.26 });
    }
    shine.moveTo(x + 20, y + h - 13);
    shine.lineTo(x + w - 20, y + h - 13);
    shine.stroke({ color: hotAccent, width: 1.1, alpha: active ? 0.42 : 0.17 });
    shine.moveTo(x + w * 0.18, y + h - 5);
    shine.lineTo(x + w * 0.82, y + h - 5);
    shine.stroke({ color: drawAccent, width: active ? 2 : 1, alpha: isPrimary ? 0.5 : 0.28 });

    if (label) {
      label.anchor.set(0, 0.5);
      label.style.align = 'left';
      label.style.fill = active
        ? '#ffffff'
          : (isPrimary ? '#ffe584' : (isDanger ? '#ff7a86' : (isUtilityDanger ? '#c9fbff' : '#c9fbff')));
      label.style.strokeThickness = isPrimary ? 4 : 3;
      label.x = x + (isCompact ? 40 : (isPrimary ? 138 : (isNarrowDockButton ? 58 : 92)));
      label.y = hasSubLabel ? -h * (isPrimary ? 0.095 : 0.085) : 0;
    }
    if (sublabel) {
      sublabel.anchor.set(0, 0.5);
      sublabel.style.align = 'left';
      sublabel.style.fill = isPrimary ? '#fff3b6' : (isUtilityDanger ? '#98aab8' : (isDanger ? '#ff9aa5' : '#8deeff'));
      sublabel.alpha = hasSubLabel ? (active ? 1 : 0.78) : 0;
      sublabel.x = label?.x || (x + 44);
      sublabel.y = h * (isPrimary ? 0.175 : 0.155);
    }
    if (icon) {
      const iconSize = clampNumber(h * (isCompact ? 0.34 : (isPrimary ? 0.32 : 0.29)), 16, isPrimary ? 30 : 23);
      const iconX = x + (isCompact ? 22 : (isPrimary ? 76 : (isNarrowDockButton ? 34 : 50)));
      const iconY = hasSubLabel ? -h * 0.08 : 0;
      if (useAssetIcon) {
        icon.visible = false;
        iconSprite.visible = true;
        iconSprite.texture = texture;
        iconSprite.x = iconX;
        iconSprite.y = iconY;
        const maxSide = Math.max(texture.width || 1, texture.height || 1);
        iconSprite.scale.set(iconRenderSize / maxSide);
        iconSprite.alpha = active ? 1 : (isUtilityDanger ? 0.84 : 0.94);
      } else {
        if (iconSprite) iconSprite.visible = false;
        icon.visible = true;
        this.drawMenuButtonIcon(icon, container._iconType, iconX, iconY, iconSize, active ? hotAccent : drawAccent, active ? 1 : 0.82);
      }
    }
    container.hitArea = new PIXI.Rectangle(x, y, w, h);
    if (container?._stepperCue) this.drawSectorStartStepperCue(container);
  }

  startAnimations() {
    // Staggered fade-in animations
    this.animateElement(this.kicker, 0, 0.4);
    this.animateElement(this.title, 0.1, 0.55);
    this.animateElement(this.subtitle, 0.35, 0.5);
    this.animateElement(this.flavor, 0.55, 0.5);
    this.animateElement(this.primaryHint, 0.68, 0.42);
    this.animateElement(this.runModePanel, 0.74, 0.42);
    this.animateElement(this.runModeBriefingTitle, 0.75, 0.42);
    this.animateElement(this.runModeExplainer, 0.77, 0.42);
    this.animateElement(this.menuPanel, 0.78, 0.45);
    this.animateElement(this.startBtn, 0.92, 0.4);
    this.animateElement(this.scoutRunBtn, 1.02, 0.4);
    this.animateElement(this.sectorStartBtn?.visible ? this.sectorStartBtn : null, 1.12, 0.4);
    this.animateElement(this.highscoreBtn, 1.22, 0.4);
    this.animateElement(this.storyBtn, 1.32, 0.4);
    this.animateElement(this.threatCodexBtn, 1.42, 0.4);
    this.animateElement(this.achievementsBtn, 1.52, 0.4);
    this.animateElement(this.settingsBtn, 1.62, 0.4);
    this.animateElement(this.exitBtn, 1.72, 0.4);
    this.animateElement(this.helpBtn, 1.78, 0.4);
    this.animateElement(this.disclaimer, 1.84, 0.4);
  }

  buildMenuNavigation() {
    const previousFocusedId = this.getSelectedMenuOptionId();
    this.menuOptions = [
      { id: 'launch', button: this.startBtn, activate: () => this.quickStartRun(RUN_MODES.RANKED) },
      { id: 'scout', button: this.scoutRunBtn, activate: () => this.quickStartRun(RUN_MODES.SCOUT) },
      ...(this.sectorStartBtn?.visible
        ? [{ id: 'sectorStart', button: this.sectorStartBtn, activate: () => this.openSectorSelector() }]
        : []),
      { id: 'hangar', button: this.highscoreBtn, activate: () => this.openShipSelect() },
      {
        id: 'highscores',
        button: this.storyBtn,
        activate: () => {
          AudioManager.init();
          AudioManager.playMusicContext('scoreboard');
          this.game.showHighscores();
        }
      },
      {
        id: 'threatCodex',
        button: this.threatCodexBtn,
        activate: () => {
          AudioManager.init();
          AudioManager.playSfx('codex_open', { volume: 0.16, minIntervalMs: 180 });
          this.game.showThreatCodex();
        }
      },
      {
        id: 'achievements',
        button: this.achievementsBtn,
        activate: () => {
          AudioManager.init();
          AudioManager.playSfx('ui_open', { volume: 0.28 });
          this.game.showAchievements();
        }
      },
      {
        id: 'settings',
        button: this.settingsBtn,
        activate: () => {
          AudioManager.init();
          AudioManager.playSfx('ui_open', { volume: 0.35 });
          this.openSettingsOverlay();
        }
      },
      {
        id: 'music',
        button: this.musicBtn,
        activate: () => {
          AudioManager.init();
          const enabled = AudioManager.toggleMute();
          if (this.musicBtn?._label) {
            this.musicBtn._label.text = translateText(enabled ? 'MUSIC: ON' : 'MUSIC: OFF');
            this.refreshButtonCopy(this.musicBtn, { forceGpuRefresh: true });
          }
        }
      },
      {
        id: 'howToPlay',
        button: this.helpBtn,
        activate: () => {
          AudioManager.init();
          AudioManager.playSfx('ui_open', { volume: 0.32 });
          this.openHowToPlayOverlay();
        }
      },
      { id: 'exit', button: this.exitBtn, activate: () => this.openQuitConfirmation() }
    ].filter((option) => option.button);

    this.menuOptions.forEach((option) => {
      option.button.activate = option.activate;
    });
    const restoredIndex = this.menuOptions.findIndex((option) => option.id === previousFocusedId);
    this.setMenuFocus(restoredIndex >= 0 ? restoredIndex : 0);
  }

  getSelectedMenuOptionId() {
    return this.menuOptions?.[this.focusedMenuIndex]?.id || null;
  }

  setInputDevice(device) {
    if (this.lastInputDevice === device) return;
    this.lastInputDevice = device;
    if (this.primaryHint) this.primaryHint.text = this.getPrimaryHintText();
    this.layoutMenu();
  }

  setMenuFocusByButton(button) {
    const index = this.menuOptions.findIndex((option) => option.button === button);
    if (index >= 0) this.setMenuFocus(index);
  }

  setMenuFocus(index) {
    if (!this.menuOptions.length) return;
    const count = this.menuOptions.length;
    const next = ((index % count) + count) % count;
    this.menuOptions.forEach((option, optionIndex) => {
      if (!option.button) return;
      option.button._focused = optionIndex === next;
      this.drawMenuButton(option.button, false);
    });
    this.focusedMenuIndex = next;
    if (this.primaryHint) this.primaryHint.text = this.getPrimaryHintText();
    if (this.runModeBriefingTitle || this.runModeExplainer) {
      const briefing = this.getRunModeBriefing();
      if (this.runModeBriefingTitle) this.runModeBriefingTitle.text = translateText('MISSION BRIEFING') + ' // ' + briefing.title;
      if (this.runModeExplainer) this.runModeExplainer.text = briefing.menuBody || briefing.body;
    }
    this.drawSectorStartStepperCue();
    this.layoutMenu();
  }

  moveMenuFocus(delta) {
    this.setMenuFocus(this.focusedMenuIndex + delta);
    AudioManager.playSfx('thrusterFire', { volume: 0.07, minIntervalMs: 90 });
  }

  activateFocusedMenuOption() {
    const option = this.menuOptions[this.focusedMenuIndex] || this.menuOptions[0];
    option?.activate?.();
  }

  processMenuGamepad() {
    const nav = this.menuGamepadNavigator.update();
    if (!nav.connected || !nav.active) return;
    this.setInputDevice('controller');
    if (this.quitConfirmOpen) {
      if (nav.pressed.left || nav.pressed.right || nav.pressed.up || nav.pressed.down) {
        this.setQuitConfirmFocus(this.quitConfirmFocusIndex === 0 ? 1 : 0);
      }
      if (nav.pressed.confirm) this.activateQuitConfirmation();
      if (nav.pressed.cancel || nav.pressed.back) this.closeQuitConfirmation();
      return;
    }
    if (this.sectorSelectorOpen) {
      if (nav.pressed.left) this.moveSectorSelectorFocus(-1);
      if (nav.pressed.right) this.moveSectorSelectorFocus(1);
      if (nav.pressed.up) this.moveSectorSelectorFocus(-this.getSectorSelectorColumns());
      if (nav.pressed.down) this.moveSectorSelectorFocus(this.getSectorSelectorColumns());
      if (nav.pressed.confirm) this.activateSectorSelectorSelection();
      if (nav.pressed.cancel || nav.pressed.back) this.closeSectorSelector();
      return;
    }
    if (nav.pressed.left) this.moveMenuFocus(-1);
    if (nav.pressed.right) this.moveMenuFocus(1);
    if (nav.pressed.up) this.moveMenuFocus(-1);
    if (nav.pressed.down) this.moveMenuFocus(1);
    if (nav.pressed.confirm) this.activateFocusedMenuOption();
    if (nav.pressed.cancel || nav.pressed.back) this.openQuitConfirmation();
  }

  openShipSelect() {
    try {
      AudioManager.init();
      AudioManager.playSfx('ui_open');
      AudioManager.playMusicContext('gameplay', { resetForNewRun: true });
      this.game.showShipSelect();
    } catch (e) {
      console.error('[MenuScene] Ship Select Error:', e);
    }
  }

  getQuickStartShipKey() {
    try {
      const saved = localStorage.getItem('burt.selectedShip.v1');
      if (saved && isValidShipKey(saved)) {
        const resolved = resolveShipKey(saved);
        if (isShipUnlocked(resolved)) return resolved;
      }
    } catch (e) {
      console.warn('[MenuScene] Could not read saved ship for quick start:', e);
    }
    return getDefaultShipKey();
  }

  quickStartRun(runMode = RUN_MODES.RANKED) {
    if (this.launchingRun) return;
    this.launchingRun = true;
    try {
      AudioManager.init();
      AudioManager.playSfx('start_game_confirm', { force: true, volume: 0.78 });
      AudioManager.playMusicContext('gameplay', { resetForNewRun: true });
      this.game.startGame(this.getQuickStartShipKey(), { runMode });
    } catch (e) {
      console.error('[MenuScene] Quick Start Error:', e);
      this.launchingRun = false;
    }
  }

  refreshSectorStartState() {
    const progress = readHangarProgressState();
    const previousSelection = this.getSelectedSectorStartCheckpoint();
    const state = getSectorStartState(progress, previousSelection);
    const checkpoints = state.checkpoints || [];
    if (checkpoints.length) {
      const preferredIndex = checkpoints.indexOf(state.selectedCheckpoint);
      this.selectedSectorStartIndex = preferredIndex >= 0 ? preferredIndex : checkpoints.length - 1;
    } else {
      this.selectedSectorStartIndex = 0;
    }
    this.sectorStartState = {
      ...state,
      selectedCheckpoint: checkpoints[this.selectedSectorStartIndex] || null
    };
    return this.sectorStartState;
  }

  getSelectedSectorStartCheckpoint() {
    const checkpoints = this.sectorStartState?.checkpoints || [];
    return checkpoints[this.selectedSectorStartIndex] || this.sectorStartState?.selectedCheckpoint || null;
  }

  formatSectorStartMenuBestScore(value) {
    const score = Math.max(0, Math.floor(Number(value) || 0));
    if (score >= 1_000_000_000) {
      const compact = (score / 1_000_000_000).toFixed(score >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '');
      return `${compact}B`;
    }
    if (score >= 1_000_000) {
      const compact = (score / 1_000_000).toFixed(score >= 10_000_000 ? 0 : 1).replace(/\.0$/, '');
      return `${compact}M`;
    }
    return formatNumber(score);
  }

  getSectorStartButtonLabel() {
    return translateText('SECTOR RUN');
  }

  getSectorStartButtonSubLabel() {
    if (!this.sectorStartState?.available) return translateText('LOCKED');
    return translateText('CHECKPOINT PUSH');
  }

  updateSectorStartButton({ forceGpuRefresh = false } = {}) {
    if (!this.sectorStartBtn) return;
    const available = Boolean(this.sectorStartState?.available);
    this.sectorStartBtn.visible = true;
    this.sectorStartBtn.eventMode = 'static';
    this.sectorStartBtn.cursor = available ? 'pointer' : 'default';
    this.refreshButtonCopy(this.sectorStartBtn, { forceGpuRefresh });
    this.drawMenuButton(this.sectorStartBtn, false);
    this.drawSectorStartStepperCue();
  }

  cycleSectorStartCheckpoint(delta) {
    if (this.getSelectedMenuOptionId() !== 'sectorStart') return false;
    const checkpoints = this.sectorStartState?.checkpoints || [];
    if (checkpoints.length <= 1) return false;
    this.selectedSectorStartIndex = (this.selectedSectorStartIndex + delta + checkpoints.length) % checkpoints.length;
    this.sectorStartState = {
      ...this.sectorStartState,
      selectedCheckpoint: checkpoints[this.selectedSectorStartIndex]
    };
    this.updateSectorStartButton({ forceGpuRefresh: true });
    AudioManager.playSfx('thrusterFire', { volume: 0.07, minIntervalMs: 90 });
    return true;
  }

  handleSectorStartPointerDown(event) {
    this.setInputDevice('keyboard');
    this.setMenuFocusByButton(this.sectorStartBtn);
    event?.stopPropagation?.();
    this.openSectorSelector();
  }

  launchSectorStartRun(requestedCheckpoint = null) {
    if (this.launchingRun) return;
    const checkpoint = requestedCheckpoint || this.getSelectedSectorStartCheckpoint();
    if (!checkpoint) {
      this.showExitNotice(translateText('SECTOR START LOCKED'));
      return;
    }
    this.launchingRun = true;
    try {
      AudioManager.init();
      AudioManager.playSfx('start_game_confirm', { force: true, volume: 0.7 });
      AudioManager.playMusicContext('gameplay', { resetForNewRun: true });
      Promise.resolve(this.game.startGame(this.getQuickStartShipKey(), {
        runMode: RUN_MODES.SECTOR_START,
        startSector: checkpoint
      })).then((started) => {
        if (started !== false) return;
        this.launchingRun = false;
        this.refreshSectorStartState();
        this.updateSectorStartButton({ forceGpuRefresh: true });
        this.showExitNotice(translateText('SECTOR START LOCKED'));
      }).catch((error) => {
        this.launchingRun = false;
        console.error('[MenuScene] Sector Start Error:', error);
        this.showExitNotice(translateText('SECTOR START LOCKED'));
      });
    } catch (e) {
      console.error('[MenuScene] Sector Start Error:', e);
      this.launchingRun = false;
    }
  }

  openStoryIntro() {
    try {
      AudioManager.init();
      AudioManager.playSfx('coin_portal_open', { force: true, volume: 0.55 });
      this.game.showIntro();
    } catch (e) {
      console.error('[MenuScene] Story Intro Error:', e);
    }
  }

  ensureQuitConfirmation() {
    if (this.quitConfirmOverlay) return;
    const overlay = new PIXI.Container();
    overlay.label = 'ui_quitConfirmation';
    overlay.zIndex = 12000;
    overlay.visible = false;
    overlay.alpha = 0;
    overlay.eventMode = 'static';
    overlay.on('pointerdown', (event) => {
      if (event.target === overlay) this.closeQuitConfirmation();
    });

    const shade = new PIXI.Graphics();
    shade.label = 'ui_quitConfirmationShade';
    overlay.addChild(shade);
    this.quitConfirmShade = shade;

    const panel = new PIXI.Container();
    panel.label = 'ui_quitConfirmationPanel';
    panel.eventMode = 'static';
    const panelBg = new PIXI.Graphics();
    panel.addChild(panelBg);
    this.quitConfirmPanel = panel;
    this.quitConfirmPanelBg = panelBg;

    const title = createText(translateText('QUIT NOVA SWARM?'), {
      fontFamily: FONT_DISPLAY,
      fontSize: 26,
      fill: '#ffe66d',
      fontWeight: '900',
      stroke: '#02060d',
      strokeThickness: 4,
      align: 'center'
    });
    title.anchor.set(0.5);
    panel.addChild(title);
    this.quitConfirmTitle = title;

    const makeButton = (label, action, variant = 'secondary') => {
      const button = new PIXI.Container();
      button.label = `ui_quitConfirm_${label}`;
      button.eventMode = 'static';
      button.cursor = 'pointer';
      button._variant = variant;
      button._action = action;
      button._bg = new PIXI.Graphics();
      button._label = createText(translateText(label), {
        fontFamily: FONT_BUTTON,
        fontSize: 18,
        fill: '#e6fbff',
        fontWeight: '900',
        stroke: '#02060d',
        strokeThickness: 3,
        align: 'center'
      });
      button._label.anchor.set(0.5);
      button.addChild(button._bg, button._label);
      button.on('pointerover', () => {
        this.setQuitConfirmFocus(this.quitConfirmButtons.indexOf(button));
      });
      button.on('pointerdown', (event) => {
        event.stopPropagation();
        this.setQuitConfirmFocus(this.quitConfirmButtons.indexOf(button));
        this.activateQuitConfirmation();
      });
      return button;
    };

    this.quitConfirmButtons = [
      makeButton('CANCEL', () => this.closeQuitConfirmation(), 'secondary'),
      makeButton('EXIT GAME', () => this.exitGame({ confirmed: true }), 'danger')
    ];
    this.quitConfirmButtons.forEach((button) => panel.addChild(button));
    overlay.addChild(panel);
    this.container.addChild(overlay);
    this.quitConfirmOverlay = overlay;
  }

  openQuitConfirmation() {
    this.ensureQuitConfirmation();
    this.closeSectorSelector();
    this.quitConfirmOpen = true;
    this.quitConfirmOverlay.visible = true;
    this.quitConfirmOverlay.alpha = 1;
    this.setQuitConfirmFocus(0);
    AudioManager.init();
    AudioManager.playSfx('ui_open', { volume: 0.28 });
    this.layoutQuitConfirmation();
  }

  closeQuitConfirmation({ silent = false } = {}) {
    if (!this.quitConfirmOverlay) return;
    const wasOpen = this.quitConfirmOpen;
    this.quitConfirmOpen = false;
    this.quitConfirmFocusIndex = 0;
    this.quitConfirmOverlay.visible = false;
    this.quitConfirmOverlay.alpha = 0;
    if (wasOpen && !silent) AudioManager.playSfx('ui_cancel', { volume: 0.26, minIntervalMs: 80 });
    this.applyMenuModalDimming();
  }

  setQuitConfirmFocus(index = 0) {
    if (!this.quitConfirmButtons?.length) return;
    const next = ((Math.floor(Number(index) || 0) % this.quitConfirmButtons.length) + this.quitConfirmButtons.length) % this.quitConfirmButtons.length;
    this.quitConfirmFocusIndex = next;
    this.quitConfirmButtons.forEach((button, buttonIndex) => {
      button._focused = buttonIndex === next;
    });
    this.layoutQuitConfirmation();
  }

  activateQuitConfirmation() {
    const button = this.quitConfirmButtons?.[this.quitConfirmFocusIndex] || this.quitConfirmButtons?.[0];
    button?._action?.();
  }

  layoutQuitConfirmation(width = this.game.app.screen.width, height = this.game.app.screen.height) {
    if (!this.quitConfirmOverlay) return;
    const layout = getCurrentLayout();
    const panelW = Math.min(width - 40, layout.isMobile ? 420 : 500);
    const panelH = layout.isMobile ? 190 : 210;
    const panelX = Math.round((width - panelW) / 2);
    const panelY = Math.round((height - panelH) / 2);
    this.quitConfirmShade?.clear();
    this.quitConfirmShade?.rect(0, 0, width, height);
    this.quitConfirmShade?.fill({ color: 0x020610, alpha: 0.62 });

    this.quitConfirmPanel.position.set(panelX, panelY);
    this.quitConfirmPanelBg.clear();
    drawCutPanel(this.quitConfirmPanelBg, 0, 0, panelW, panelH, 18, { color: 0x061321, alpha: 0.96 }, { color: 0xff6b6b, alpha: 0.82, width: 2.5 });
    this.quitConfirmPanelBg.rect(18, 14, panelW - 36, 2);
    this.quitConfirmPanelBg.fill({ color: 0xffe66d, alpha: 0.5 });

    if (this.quitConfirmTitle) {
      this.quitConfirmTitle.text = translateText('QUIT NOVA SWARM?');
      this.quitConfirmTitle.style.fontSize = layout.isMobile ? 22 : 27;
      this.quitConfirmTitle.x = panelW / 2;
      this.quitConfirmTitle.y = layout.isMobile ? 54 : 62;
      fitTextToWidth(this.quitConfirmTitle, panelW - 60, { minScale: 0.72 });
    }

    const gap = layout.isMobile ? 14 : 18;
    const buttonW = Math.min(190, (panelW - 58 - gap) / 2);
    const buttonH = layout.isMobile ? 48 : 54;
    const startX = (panelW - buttonW * 2 - gap) / 2;
    const y = panelH - buttonH - (layout.isMobile ? 32 : 38);
    this.quitConfirmButtons.forEach((button, index) => {
      button.x = startX + buttonW / 2 + index * (buttonW + gap);
      button.y = y + buttonH / 2;
      button._btnWidth = buttonW;
      button._btnHeight = buttonH;
      button.hitArea = new PIXI.Rectangle(-buttonW / 2, -buttonH / 2, buttonW, buttonH);
      const focused = Boolean(button._focused);
      const danger = button._variant === 'danger';
      button._bg.clear();
      drawCutPanel(
        button._bg,
        -buttonW / 2,
        -buttonH / 2,
        buttonW,
        buttonH,
        10,
        { color: danger ? 0x35121a : 0x092237, alpha: focused ? 0.95 : 0.78 },
        { color: focused ? 0xffe66d : (danger ? 0xff6b6b : 0x6adfff), alpha: focused ? 0.96 : 0.62, width: focused ? 3 : 1.8 }
      );
      button._label.text = translateText(index === 0 ? 'CANCEL' : 'EXIT GAME');
      button._label.style.fontSize = layout.isMobile ? 16 : 18;
      button._label.x = 0;
      button._label.y = 0;
      fitTextToWidth(button._label, buttonW - 28, { minScale: 0.72 });
    });
  }

  async exitGame({ confirmed = false } = {}) {
    if (!confirmed) {
      this.openQuitConfirmation();
      return;
    }
    if (this.game?.isMenuExitGuardActive?.()) {
      return;
    }
    try {
      this.closeQuitConfirmation({ silent: true });
      AudioManager.init();
      AudioManager.playSfx('ui_open', { volume: 0.28 });
      const result = await requestExitGame();
      if (!result.ok && !result.canceled) this.showExitNotice(result.message || EXIT_GAME_WEB_MESSAGE);
    } catch (e) {
      console.error('[MenuScene] Exit Game Error:', e);
      this.showExitNotice(EXIT_GAME_WEB_MESSAGE);
    }
  }

  showExitNotice(message) {
    if (!this.exitNotice) return;
    this.exitNotice.text = message;
    this.exitNotice.alpha = 1;
    this.exitNotice.updateText?.(false);
    this.layoutMenu();

    if (this.exitNoticeTimeout) {
      clearTimeout(this.exitNoticeTimeout);
    }
    this.exitNoticeTimeout = setTimeout(() => {
      if (!this.exitNotice) return;
      this.exitNotice.text = '';
      this.exitNotice.alpha = 0;
      this.exitNoticeTimeout = null;
      this.layoutMenu();
    }, 2600);
  }

  setCommsCardHover(card, isHover) {
    if (!card?.spec) return;
    const color = card.spec.color;
    if (card.bg) {
      card.bg.clear();
      card.bg.roundRect(-78, -68, 156, 142, 8);
      card.bg.fill({ color: isHover ? 0x082846 : 0x051120, alpha: isHover ? 0.78 : 0.66 });
      card.bg.stroke({ color, width: isHover ? 3 : 2, alpha: isHover ? 1 : 0.84 });
    }
    if (card.glow) {
      card.glow.clear();
      card.glow.roundRect(-86, -76, 172, 158, 8);
      card.glow.stroke({ color, width: isHover ? 2 : 1, alpha: isHover ? 0.46 : 0.22 });
    }
    card.scale.set(isHover ? 1.045 : 1);
  }

  openSettingsOverlay() {
    if (this.settingsOverlay) {
      this.closeSettingsOverlay();
    }

    this.settingsOverlay = new SettingsOverlay(this.game, {
      title: 'SETTINGS',
      onClose: () => {
        this.settingsOverlay = null;
        this.menuGamepadNavigator.suppressUntilReleased();
        if (this.musicBtn?._label) {
          this.musicBtn._label.text = translateText(AudioManager.getSettings().musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF');
          this.refreshButtonCopy(this.musicBtn, { forceGpuRefresh: true });
        }
      }
    });
    this.container.addChild(this.settingsOverlay.container);
  }

  openHowToPlayOverlay() {
    if (this.howToPlayOverlay) {
      this.closeHowToPlayOverlay();
    }

    this.howToPlayOverlay = new HowToPlayOverlay(this.game, {
      onClose: () => {
        this.howToPlayOverlay = null;
        this.menuGamepadNavigator.suppressUntilReleased();
      }
    });
    this.container.addChild(this.howToPlayOverlay.container);
  }

  handleLanguageChanged() {
    if (this.primaryHint) this.primaryHint.text = this.getPrimaryHintText();
    if (this.disclaimer) this.disclaimer.text = this.getDisclaimerText(getCurrentLayout());
    if (this.controls) this.controls.text = getCurrentLayout().isMobile ? this.getControlsText(getCurrentLayout()) : '';
    if (this.musicBtn?._label) {
      this.musicBtn._label.text = translateText(AudioManager.getSettings().musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF');
    }
    [
      this.startBtn,
      this.scoutRunBtn,
      this.sectorStartBtn,
      this.highscoreBtn,
      this.storyBtn,
      this.threatCodexBtn,
      this.achievementsBtn,
      this.settingsBtn,
      this.helpBtn,
      this.exitBtn,
      this.musicBtn
    ].filter(Boolean).forEach((button) => this.refreshButtonCopy(button, { forceGpuRefresh: true }));
    this.refreshSectorStartState();
    this.updateSectorStartButton({ forceGpuRefresh: true });
    this.settingsOverlay?.rebuild?.();
    this.layoutMenu();
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

  animateElement(element, delay, duration) {
    if (!element) return;

    const animationToken = (element._introAnimationToken || 0) + 1;
    element._introAnimationToken = animationToken;
    const startTime = Date.now() + delay * 1000;
    const targetY = Number.isFinite(element._layoutY) ? element._layoutY : element.y;
    const offsetY = 20;
    element.y = targetY + offsetY;

    const animate = () => {
      if (element._introAnimationToken !== animationToken) return;
      const now = Date.now();
      if (now < startTime) {
        requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(1, (now - startTime) / (duration * 1000));
      const eased = this.easeOutCubic(progress);

      element.alpha = eased;
      element.y = targetY + offsetY * (1 - eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  update(delta) {
    this.animationTime += delta * 0.016;
    updateMenuFx(this, delta);
    this.drawIdleMotionLayer();

    if (this.backdrop?.texture) {
      const width = this.game.getWidth();
      const height = this.game.getHeight();
      this.backdrop.x = width / 2 + Math.sin(this.animationTime * 0.18) * width * 0.0045;
      this.backdrop.y = height / 2 + Math.cos(this.animationTime * 0.16) * height * 0.003;
      this.backdrop.alpha = 0.965 + Math.sin(this.animationTime * 0.42) * 0.018;
    }

    // PART A: Update typewriter
    if (this.storyTypewriter) {
      this.storyTypewriter.update(delta);
    }
    this.updateCodexSignalCue(delta);
    this.updateMenuButtonMotion(delta);
    this.drawSectorStartStepperCue();
    if (this.sectorSelectorOpen) {
      this.sectorSelectorOpenAge = Math.min(1, (this.sectorSelectorOpenAge || 0) + delta * 0.016 / 0.34);
      if (this.sectorSelectorOpenAge < 1) {
        this.sectorSelectorOverlay.alpha = this.easeOutCubic(this.sectorSelectorOpenAge);
        this.drawSectorSelectorOverlay();
      }
    }

    // Update starfield
    const { height } = this.game.app.screen;
    this.stars.forEach(star => {
      star.y += star.speedY * delta;

      // Wrap around
      if (star.y > height) {
        star.y = -5;
        star.x = Math.random() * this.game.app.screen.width;
      }

      // Twinkling effect
      const twinkle = Math.sin(this.animationTime * star.twinkleSpeed + star.twinkleOffset);
      star.alpha = 0.3 + twinkle * 0.3;
    });

    // Pulsating glow on title
    if (this.title && this.title.alpha >= 1) {
      const pulse = Math.sin(this.animationTime * 0.5) * 0.3 + 0.7;
      this.title.style.dropShadowAlpha = pulse * 0.8;
    }

    if (this.radarSweep) {
      this.radarSweep.rotation += delta * 0.012;
    }
    if (this.radarBlips?.length) {
      this.radarBlips.forEach((blip) => {
        const pulse = Math.sin(this.animationTime * 3.5 + blip.phase) * 0.5 + 0.5;
        blip.alpha = 0.22 + pulse * 0.48;
        blip.scale.set(0.85 + pulse * 0.28);
      });
    }
    if (this.crewComms?.length) {
      this.crewComms.forEach((card, index) => {
        card.y = card.baseY + Math.sin(this.animationTime * 1.3 + index) * 5;
        if (card.scan) {
          card.scan.y = -36 + ((this.animationTime * 28 + index * 31) % 72);
          card.scan.alpha = 0.12 + Math.sin(this.animationTime * 4 + index) * 0.08;
        }
      });
    }
    if (this.deckGlints?.length) {
      this.deckGlints.forEach((glint) => {
        glint.alpha = 0.42 + Math.sin(this.animationTime * 2.1 + glint.phase) * 0.18;
      });
    }

    if (this.howToPlayOverlay) {
      this.howToPlayOverlay.update?.(delta);
    } else if (this.settingsOverlay) {
      this.settingsOverlay.update?.(delta);
    } else if (!this.launchingRun) {
      this.processMenuGamepad();
    }

    // Animate hero bonus cores
    if (this.heroBonusCore) {
      this.heroBonusCore.y = this.heroBaseY + Math.sin(this.animationTime * 2) * 12;
      this.heroBonusCore.rotation = -0.15 + Math.sin(this.animationTime) * 0.12;
    }
    if (this.heroBonusCore2) {
      this.heroBonusCore2.y = this.heroBaseY2 + Math.sin(this.animationTime * 1.7) * 10;
      this.heroBonusCore2.rotation = 0.2 + Math.sin(this.animationTime * 1.3) * 0.1;
    }

    // Animate floating bonus cores
    if (this.floatingBonusCores) {
      this.floatingBonusCores.forEach(core => {
        core.x += core.driftSpeedX;
        core.y += core.driftSpeedY;
        core.rotation += core.rotSpeed;

        // Wrap around with respect to side columns
        if (core.y < -50) core.y = this.game.app.screen.height + 50;
        if (core.y > this.game.app.screen.height + 50) core.y = -50;

        // Horizontal constraint buffer
        if (core.boundsX) {
          if (core.x < core.boundsX.min) core.driftSpeedX = Math.abs(core.driftSpeedX);
          if (core.x > core.boundsX.max) core.driftSpeedX = -Math.abs(core.driftSpeedX);
        }
      });
    }

    // Subtle tagline breathing.
    if (this.disclaimer && this.disclaimer.alpha > 0) {
      const pulse = 1 + Math.sin(this.animationTime * 3) * 0.015;
      this.disclaimer.scale.set(pulse);
      this.disclaimer.rotation = 0;
    }
  }

  destroy() {
    this.closeQuitConfirmation();
    this.closeSectorSelector();
    this.closeSettingsOverlay();
    this.closeHowToPlayOverlay();
    destroyMenuFx(this);
    if (this.idleMotionLayer?.parent) {
      this.idleMotionLayer.parent.removeChild(this.idleMotionLayer);
    }
    this.idleMotionLayer?.destroy?.();
    this.idleMotionLayer = null;

    // PART A: Cleanup story rotation
    if (this.storyRotationTimer) {
      clearInterval(this.storyRotationTimer);
      this.storyRotationTimer = null;
    }
    if (this.exitNoticeTimeout) {
      clearTimeout(this.exitNoticeTimeout);
      this.exitNoticeTimeout = null;
    }
    if (this.skipHandler) {
      window.removeEventListener('keydown', this.skipHandler);
      this.container.off('pointerdown', this.skipHandler);
      this.skipHandler = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    if (this.layoutUnsubscribe) {
      this.layoutUnsubscribe();
      this.layoutUnsubscribe = null;
    }
  }
}
