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
import { RUN_MODES, getSectorStartState } from '../game/RunMode.js';
// PART A: Dynamic story rotation
import { tauntDirector } from '../game/TauntDirector.js';
import { TypewriterText } from '../utils/TypewriterText.js';
import { getDiscoveryStats } from '../progression/ThreatDiscoveryState.js';

const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';
const FONT_ARCADE = 'Rajdhani, Orbitron, Bahnschrift, Segoe UI, sans-serif';
const FONT_MONO = 'Rajdhani, Orbitron, Bahnschrift, sans-serif';
const FONT_BUTTON = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';

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
    this.runModeExplainer = null;
    this.disclaimer = null;
    this.startBtn = null;
    this.sectorStartBtn = null;
    this.sectorStartState = { available: false, checkpoints: [], selectedCheckpoint: null, highestReachedSector: 1 };
    this.selectedSectorStartIndex = 0;
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
    this.musicBtn = null;
    this.controls = null;
    this.easter = null;
    this.stars = [];
    this.animationTime = 0;
    this.buildStamp = null;
    this.backdrop = null;
    this.backdropShade = null;
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
      intensity: 1.08,
      density: 1.18,
      alpha: 0.72,
      playOpen: false
    });
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
      if (!isPrimaryStart && !isMoveUp && !isMoveDown && !isMoveLeft && !isMoveRight && event.key !== 'Escape') return;

      event.preventDefault();
      this.setInputDevice('keyboard');
      if (isMoveUp) {
        this.moveMenuFocus(-1);
      } else if (isMoveDown) {
        this.moveMenuFocus(event.shiftKey ? -1 : 1);
      } else if (isMoveLeft) {
        if (!this.cycleSectorStartCheckpoint(-1)) this.moveMenuFocus(-1);
      } else if (isMoveRight) {
        if (!this.cycleSectorStartCheckpoint(1)) this.moveMenuFocus(1);
      } else if (event.key === 'Escape') {
        this.exitGame();
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
    this.runModeExplainer.anchor.set(0.5);
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

    this.startBtn = this.createButton('LAUNCH RUN', layout, { variant: 'primary', accent: 0xffd15c, icon: 'launch', subLabel: 'START YOUR MISSION' });
    this.startBtn.alpha = 0;  // Start invisible
    this.startBtn.on('pointerdown', () => {
      this.quickStartRun();
    });
    this.container.addChild(this.startBtn);

    this.sectorStartBtn = this.createButton('SECTOR CHALLENGE', layout, {
      accent: 0x37f5ff,
      icon: 'target',
      dynamicSubLabel: () => this.getSectorStartButtonSubLabel()
    });
    this.attachSectorStartStepperCue(this.sectorStartBtn);
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

    this.helpBtn = this.createButton('HOW TO PLAY', layout, { compact: true, accent: 0xffef7e, icon: 'codex' });
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

    this.exitBtn = this.createButton('EXIT GAME', layout, { accent: 0xff6b6b, icon: 'exit' });
    this.exitBtn.alpha = 0;
    this.exitBtn.on('pointerdown', () => {
      this.exitGame();
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
      this.runModeExplainer,
      this.disclaimer,
      this.controls,
      this.easter,
      this.buildStamp,
      this.musicBtn?._label,
      this.startBtn?._label,
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

  refreshMenuButtonLabel(button, maxWidth, { minScale = 0.68, forceGpuRefresh = false } = {}) {
    const label = button?._label;
    if (!label) return 1;
    const targetPadding = this.menuFontsReady ? 44 : 36;
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
    const labelPad = button._iconType
      ? (button._variant === 'primary' ? 74 : 58)
      : 48;
    this.refreshMenuButtonLabel(button, (button._btnWidth || 180) - labelPad, { minScale: button._labelMinScale || 0.62, forceGpuRefresh });
    this.refreshMenuButtonSubLabel(button, (button._btnWidth || 180) - 24, { minScale: 0.68, forceGpuRefresh });
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
    this.runModePanel.visible = false;
    this.runModeExplainer.visible = false;
    this.disclaimer.visible = false;
    this.controls.visible = false;
    this.primaryHint.text = this.getPrimaryHintText();
    this.primaryHint.style.fontSize = Math.max(10, controlsSize);
    this.runModeExplainer.text = this.getRunModeExplainerText();
    this.disclaimer.text = this.getDisclaimerText(layout);

    this.title.updateText?.(false);
    this.subtitle.updateText?.(false);
    this.primaryHint.updateText?.(false);
    this.runModeExplainer.updateText?.(false);
    fitTextToWidth(this.title, titleWidth, { minScale: 0.54 });
    fitTextToWidth(this.subtitle, titleWidth, { minScale: 0.72 });

    this.refreshSectorStartState();
    this.updateSectorStartButton({ forceGpuRefresh: forceLabelGpuRefresh });
    const dockButtons = [
      this.startBtn,
      this.sectorStartBtn,
      this.highscoreBtn,
      this.storyBtn,
      this.threatCodexBtn,
      this.achievementsBtn,
      this.settingsBtn,
      this.exitBtn
    ].filter(Boolean);

    const marginX = clampNumber(width * 0.018, 16, 34);
    const gap = clampNumber(width * 0.004, 4, 8);
    const dockWidth = Math.max(0, width - marginX * 2);
    const dockHeight = clampNumber(height * 0.132, isShortLayout ? 92 : 104, isMobileLayout ? 118 : 142);
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
    const launchWidth = clampNumber(dockWidth * 0.15, isMobileLayout ? 150 : 188, isMobileLayout ? 210 : 286);
    const remainingWidth = dockWidth - launchWidth - gap * (dockButtons.length - 1);
    const secondaryWidth = Math.max(112, remainingWidth / Math.max(1, dockButtons.length - 1));
    let cursorX = marginX;

    dockButtons.forEach((button, index) => {
      if (!button) return;
      const isPrimary = index === 0;
      const btnWidth = isPrimary ? launchWidth : secondaryWidth;
      button.visible = true;
      button._btnWidth = btnWidth;
      button._btnHeight = tileHeight;
      button._variant = isPrimary ? 'primary' : (button === this.exitBtn ? 'danger' : 'secondary');
      button._dockIndex = index;
      button._label.style.fontSize = Math.round(clampNumber(btnWidth * (isPrimary ? 0.105 : 0.068), isPrimary ? 15 : 11, isPrimary ? 24 : 16));
      button._sublabel.style.fontSize = Math.round(clampNumber(btnWidth * 0.041, 8, 11));
      this.refreshButtonCopy(button, { forceGpuRefresh: forceLabelGpuRefresh });
      button.x = cursorX + btnWidth / 2;
      button.y = dockTop + dockHeight * (isShortLayout ? 0.54 : 0.56);
      button._layoutY = button.y;
      this.drawMenuButton(button, false);
      cursorX += btnWidth + gap;
    });

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
    const utilityHeight = isMobileLayout ? 30 : 34;
    this.musicBtn._btnWidth = utilityWidth;
    this.musicBtn._btnHeight = utilityHeight;
    this.musicBtn._label.style.fontSize = Math.max(10, controlsSize - 1);
    this.refreshButtonCopy(this.musicBtn, { forceGpuRefresh: forceLabelGpuRefresh });
    this.drawMenuButton(this.musicBtn, false);
    this.musicBtn.scale.set(1);
    this.musicBtn.x = width - marginX - utilityWidth / 2;
    this.musicBtn.y = safeMargin.top + (isMobileLayout ? 24 : 30);
    this.musicBtn._layoutY = this.musicBtn.y;

    this.helpBtn._btnWidth = utilityWidth;
    this.helpBtn._btnHeight = utilityHeight;
    this.helpBtn._label.style.fontSize = Math.max(10, controlsSize - 1);
    this.refreshButtonCopy(this.helpBtn, { forceGpuRefresh: forceLabelGpuRefresh });
    this.drawMenuButton(this.helpBtn, false);
    this.helpBtn.scale.set(1);
    this.helpBtn.x = this.musicBtn.x;
    this.helpBtn.y = this.musicBtn.y + utilityHeight + 8;
    this.helpBtn._layoutY = this.helpBtn.y;

    if (this.buildStamp) {
      this.buildStamp.x = width - layout.padding / 2;
      this.buildStamp.y = height - layout.padding / 2;
    }

    // Reposition install button if exists
    if (this.installButton && this.installButton.visible) {
      this.installButton.x = width / 2;
      this.installButton.y = height - 100;
    }
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
    const sectorFocused = this.getSelectedMenuOptionId() === 'sectorStart'
      && (this.sectorStartState?.checkpoints || []).length > 1;
    if (sectorFocused) {
      return this.lastInputDevice === 'controller'
        ? translateText('D-PAD/STICK: NAVIGATE // LEFT/RIGHT: SECTOR // A: CONFIRM // B: BACK')
        : translateText('ARROWS: NAVIGATE // LEFT/RIGHT: SECTOR // ENTER/SPACE: CONFIRM // ESC: BACK');
    }
    return this.lastInputDevice === 'controller'
      ? 'D-PAD/STICK: NAVIGATE // A: CONFIRM // B: BACK'
      : 'ARROWS: NAVIGATE // ENTER/SPACE: CONFIRM // ESC: BACK';
  }

  getRunModeExplainerText() {
    const sectorStatus = this.sectorStartState?.available
      ? translateText('CHECKPOINT')
      : translateText('LOCKED');
    const ranked = translateText('RANKED');
    const leaderboard = translateText('LEADERBOARD');
    const sector = translateText('SECTOR');
    return `${ranked}: ${leaderboard}  //  ${sector}: ${sectorStatus}`;
  }

  drawRunModeExplainerPanel(layout, width, height) {
    if (!this.runModePanel || !this.runModeExplainer) return;
    const textBounds = boundsForDisplayObject(this.runModeExplainer);
    if (!textBounds) return;
    const isMobileLayout = layout.isMobile || width < 720;
    const padX = isMobileLayout ? 12 : 18;
    const padY = isMobileLayout ? 7 : 8;
    const x = textBounds.x - padX;
    const y = textBounds.y - padY;
    const panelWidth = textBounds.width + padX * 2;
    const panelHeight = textBounds.height + padY * 2;
    const focusedId = this.getSelectedMenuOptionId();
    const accent = focusedId === 'sectorStart' ? 0xffef7e : 0x37f5ff;
    const secondary = focusedId === 'sectorStart' ? 0xff55d9 : 0x7fffd8;

    this.runModePanel.clear();
    this.runModePanel.roundRect(x, y, panelWidth, panelHeight, 6);
    this.runModePanel.fill({ color: 0x031323, alpha: 0.56 });
    this.runModePanel.roundRect(x, y, panelWidth, panelHeight, 6);
    this.runModePanel.stroke({ color: accent, width: 1.5, alpha: 0.72 });
    this.runModePanel.rect(x + 7, y + 6, 3, Math.max(6, panelHeight - 12));
    this.runModePanel.fill({ color: secondary, alpha: 0.88 });
    this.runModePanel.rect(x + panelWidth - 10, y + 6, 3, Math.max(6, panelHeight - 12));
    this.runModePanel.fill({ color: 0xffd15c, alpha: 0.58 });
    this.runModePanel.moveTo(x + 18, y + panelHeight - 6);
    this.runModePanel.lineTo(x + panelWidth - 18, y + panelHeight - 6);
    this.runModePanel.stroke({ color: 0x7fffd8, width: 1, alpha: 0.2 });
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
      this.menuPanel.roundRect(x, y, panelWidth, panelHeight, 5);
      this.menuPanel.fill({ color: 0x020711, alpha: 0.52 });
      this.menuPanel.roundRect(x, y, panelWidth, panelHeight, 5);
      this.menuPanel.stroke({ color: 0x37f5ff, width: 1, alpha: 0.42 });
      this.menuPanel.rect(x + 1, y + 1, panelWidth - 2, Math.max(18, panelHeight * 0.34));
      this.menuPanel.fill({ color: 0x0b2a42, alpha: 0.22 });
      this.menuPanel.rect(x + 12, y + 10, panelWidth - 24, 1.5);
      this.menuPanel.fill({ color: 0x7fffd8, alpha: 0.34 });
      this.menuPanel.rect(x + 12, y + panelHeight - 12, panelWidth - 24, 1.5);
      this.menuPanel.fill({ color: 0xffd15c, alpha: 0.22 });
      return;
    }
    const contentItems = [
      this.startBtn,
      this.sectorStartBtn,
      this.highscoreBtn,
      this.storyBtn,
      this.threatCodexBtn,
      this.achievementsBtn,
      this.settingsBtn,
      this.exitBtn
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
    this.menuPanel.roundRect(x, y, panelWidth, panelHeight, 5);
    this.menuPanel.fill({ color: 0x020711, alpha: 0.52 });
    this.menuPanel.roundRect(x, y, panelWidth, panelHeight, 5);
    this.menuPanel.stroke({ color: 0x37f5ff, width: 1, alpha: 0.42 });
    this.menuPanel.rect(x + 1, y + 1, panelWidth - 2, Math.max(18, panelHeight * 0.34));
    this.menuPanel.fill({ color: 0x0b2a42, alpha: 0.22 });
    this.menuPanel.rect(x + 12, y + 10, panelWidth - 24, 1.5);
    this.menuPanel.fill({ color: 0x7fffd8, alpha: 0.34 });
    this.menuPanel.rect(x + 12, y + panelHeight - 12, panelWidth - 24, 1.5);
    this.menuPanel.fill({ color: 0xffd15c, alpha: 0.22 });
  }

  getLayoutDebugState() {
    const textItems = {
      kicker: this.kicker,
      title: this.title,
      subtitle: this.subtitle,
      flavor: this.flavor,
      primaryHint: this.primaryHint,
      runModePanel: this.runModePanel,
      runModeExplainer: this.runModeExplainer,
      disclaimer: this.disclaimer,
      controls: this.controls,
      launchButton: this.startBtn,
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
      howToPlay: this.howToPlayOverlay?.getDebugState ? this.howToPlayOverlay.getDebugState() : null,
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
        } : null
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

    // Store dimensions for hover redraw
    container._btnWidth = btnWidth;
    container._btnHeight = btnHeight;
    container._variant = options.variant || 'secondary';
    container._accent = options.accent || 0x37f5ff;
    container._labelKey = options.labelKey || text;
    container._sublabelKey = options.subLabel || '';
    container._dynamicLabel = options.dynamicLabel || null;
    container._dynamicSubLabel = options.dynamicSubLabel || null;
    container._iconType = options.icon || 'panel';
    container._labelMinScale = options.labelMinScale || 0.62;
    container._bg = bg;
    container._shine = shine;
    container._icon = icon;
    container._label = label;
    container._sublabel = sublabel;
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
    const pulse = 0.5 + Math.sin(this.animationTime * 8) * 0.5;
    const x = w / 2 - 22;
    const y = -h / 2 + 14;
    cue.clear();
    cue.circle(x, y, 7 + pulse * 6);
    cue.fill({ color: 0xffef7e, alpha: 0.16 + pulse * 0.16 });
    cue.circle(x, y, 6);
    cue.fill({ color: 0xffef7e, alpha: 0.92 });
    cue.circle(x, y, 2.2);
    cue.fill({ color: 0x061827, alpha: 0.95 });
    cue.moveTo(x - 15, y + 10);
    cue.lineTo(x + 15, y + 10);
    cue.stroke({ color: 0x7dffcc, width: 1.5, alpha: 0.35 + pulse * 0.35 });
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

  drawMenuButton(container, isHover = false) {
    const bg = container?._bg;
    const shine = container?._shine;
    const focus = container?._focus;
    if (!bg || !shine) return;

    const w = container._btnWidth || 286;
    const h = container._btnHeight || 46;
    const x = -w / 2;
    const y = -h / 2;
    const isPrimary = container._variant === 'primary';
    const isDanger = container._variant === 'danger' || container === this.exitBtn;
    const isCompact = h <= 38;
    const accent = container._accent || 0x37f5ff;
    const isFocused = Boolean(container._focused);
    const drawAccent = isDanger ? 0xff5f6a : (isPrimary ? 0xffd15c : accent);
    const edgeAlpha = isHover || isFocused ? 0.94 : (isPrimary ? 0.78 : (isDanger ? 0.62 : 0.46));
    const label = container._label;
    const sublabel = container._sublabel;
    const icon = container._icon;
    const hasSubLabel = Boolean(sublabel?.text);

    focus?.clear();
    if (isFocused) {
      focus.roundRect(x - 5, y - 5, w + 10, h + 10, 6);
      focus.stroke({ color: isDanger ? 0xff8aa0 : 0xffef7e, width: 2, alpha: 0.9 });
    }

    bg.clear();
    bg.roundRect(x, y, w, h, 5);
    bg.fill({
      color: isPrimary ? 0x211806 : (isDanger ? 0x17080d : 0x041625),
      alpha: isHover || isFocused ? (isPrimary ? 0.88 : 0.78) : (isPrimary ? 0.76 : 0.62)
    });
    bg.roundRect(x, y, w, h, 5);
    bg.stroke({ color: isFocused ? 0xffffff : drawAccent, width: isHover || isFocused ? 2.4 : 1.4, alpha: edgeAlpha });
    bg.rect(x + 1, y + 1, w - 2, Math.max(12, h * 0.38));
    bg.fill({ color: isPrimary ? 0xffd15c : (isDanger ? 0xff5f6a : 0x37f5ff), alpha: isHover || isFocused ? 0.14 : 0.075 });
    bg.rect(x + 1, y + h - 5, w - 2, 4);
    bg.fill({ color: drawAccent, alpha: isPrimary ? 0.48 : 0.26 });
    bg.rect(x + 6, y + 7, 2, h - 14);
    bg.fill({ color: isPrimary ? 0xffef7e : (isDanger ? 0xff5f6a : 0x37f5ff), alpha: isHover || isFocused ? 0.86 : 0.48 });

    shine.clear();
    shine.moveTo(x + 16, y + 8);
    shine.lineTo(x + w - 16, y + 8);
    shine.stroke({ color: 0xffffff, width: 1, alpha: isHover ? 0.22 : 0.09 });
    shine.moveTo(x + 18, y + h - 12);
    shine.lineTo(x + w - 18, y + h - 12);
    shine.stroke({ color: isPrimary ? 0xffef7e : 0x7fffd8, width: 1, alpha: isHover ? 0.36 : 0.16 });

    if (label) {
      label.anchor.set(0, 0.5);
      label.style.align = 'left';
      label.style.fill = isHover || isFocused
        ? '#ffffff'
        : (isPrimary ? '#ffe584' : (isDanger ? '#ff7a86' : '#c9fbff'));
      label.x = x + (isCompact ? 36 : (isPrimary ? 58 : 44));
      label.y = hasSubLabel ? -h * 0.1 : 0;
    }
    if (sublabel) {
      sublabel.anchor.set(0, 0.5);
      sublabel.style.align = 'left';
      sublabel.style.fill = isPrimary ? '#fff3b6' : (isDanger ? '#ff9aa5' : '#8deeff');
      sublabel.alpha = hasSubLabel ? (isHover || isFocused ? 1 : 0.86) : 0;
      sublabel.x = label?.x || (x + 44);
      sublabel.y = h * 0.2;
    }
    if (icon) {
      const iconSize = clampNumber(h * (isCompact ? 0.36 : 0.31), 16, isPrimary ? 32 : 24);
      const iconX = x + (isCompact ? 20 : (isPrimary ? 30 : 23));
      const iconY = hasSubLabel ? -h * 0.08 : 0;
      this.drawMenuButtonIcon(icon, container._iconType, iconX, iconY, iconSize, drawAccent, isHover || isFocused ? 1 : 0.82);
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
    this.animateElement(this.runModeExplainer, 0.76, 0.42);
    this.animateElement(this.menuPanel, 0.78, 0.45);
    this.animateElement(this.startBtn, 0.92, 0.4);
    this.animateElement(this.sectorStartBtn?.visible ? this.sectorStartBtn : null, 1.04, 0.4);
    this.animateElement(this.highscoreBtn, this.sectorStartBtn?.visible ? 1.16 : 1.08, 0.4);
    this.animateElement(this.storyBtn, this.sectorStartBtn?.visible ? 1.28 : 1.22, 0.4);
    this.animateElement(this.threatCodexBtn, this.sectorStartBtn?.visible ? 1.4 : 1.34, 0.4);
    this.animateElement(this.achievementsBtn, this.sectorStartBtn?.visible ? 1.52 : 1.46, 0.4);
    this.animateElement(this.settingsBtn, this.sectorStartBtn?.visible ? 1.64 : 1.58, 0.4);
    this.animateElement(this.exitBtn, this.sectorStartBtn?.visible ? 1.76 : 1.7, 0.4);
    this.animateElement(this.helpBtn, this.sectorStartBtn?.visible ? 1.82 : 1.76, 0.4);
    this.animateElement(this.disclaimer, this.sectorStartBtn?.visible ? 1.88 : 1.82, 0.4);
  }

  buildMenuNavigation() {
    this.menuOptions = [
      { id: 'launch', button: this.startBtn, activate: () => this.quickStartRun() },
      ...(this.sectorStartBtn?.visible
        ? [{ id: 'sectorStart', button: this.sectorStartBtn, activate: () => this.launchSectorStartRun() }]
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
      { id: 'exit', button: this.exitBtn, activate: () => this.exitGame() },
      {
        id: 'howToPlay',
        button: this.helpBtn,
        activate: () => {
          AudioManager.init();
          AudioManager.playSfx('ui_open', { volume: 0.32 });
          this.openHowToPlayOverlay();
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
      }
    ].filter((option) => option.button);

    this.menuOptions.forEach((option) => {
      option.button.activate = option.activate;
    });
    this.setMenuFocus(0);
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
    if (this.runModeExplainer) this.runModeExplainer.text = this.getRunModeExplainerText();
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
    if (nav.pressed.left && !this.cycleSectorStartCheckpoint(-1)) this.moveMenuFocus(-1);
    if (nav.pressed.right && !this.cycleSectorStartCheckpoint(1)) this.moveMenuFocus(1);
    if (nav.pressed.up) this.moveMenuFocus(-1);
    if (nav.pressed.down) this.moveMenuFocus(1);
    if (nav.pressed.confirm) this.activateFocusedMenuOption();
    if (nav.pressed.cancel || nav.pressed.back) this.exitGame();
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

  quickStartRun() {
    if (this.launchingRun) return;
    this.launchingRun = true;
    try {
      AudioManager.init();
      AudioManager.playSfx('start_game_confirm', { force: true, volume: 0.78 });
      AudioManager.playMusicContext('gameplay', { resetForNewRun: true });
      this.game.startGame(this.getQuickStartShipKey());
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
    const checkpoint = this.getSelectedSectorStartCheckpoint();
    if (!checkpoint) return translateText('SECTOR START CHALLENGE');
    const record = getSectorStartChallengeRecord(checkpoint);
    const base = translateText('SECTOR {sector} CHALLENGE', { sector: checkpoint });
    if (record?.scoreEarned > 0) {
      return `${base} | ${translateText('BEST')} ${this.formatSectorStartMenuBestScore(record.scoreEarned)}`;
    }
    return base;
  }

  getSectorStartButtonSubLabel() {
    const checkpoint = this.getSelectedSectorStartCheckpoint();
    if (!checkpoint || !this.sectorStartState?.available) return translateText('LOCKED');
    const record = getSectorStartChallengeRecord(checkpoint);
    if (record?.scoreEarned > 0) {
      return `${translateText('BEST')} ${this.formatSectorStartMenuBestScore(record.scoreEarned)}`;
    }
    return `${translateText('CHECKPOINT')} ${checkpoint}`;
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
    const checkpoints = this.sectorStartState?.checkpoints || [];
    if (checkpoints.length > 1) {
      const width = this.sectorStartBtn?._btnWidth || 286;
      let localX = 0;
      try {
        const point = typeof event?.getLocalPosition === 'function'
          ? event.getLocalPosition(this.sectorStartBtn)
          : this.sectorStartBtn.toLocal(event.global);
        localX = Number(point?.x) || 0;
      } catch {
        localX = 0;
      }
      if (localX < -width / 2) {
        this.cycleSectorStartCheckpoint(-1);
        return;
      }
      if (localX > width / 2) {
        this.cycleSectorStartCheckpoint(1);
        return;
      }
    }
    this.launchSectorStartRun();
  }

  launchSectorStartRun() {
    if (this.launchingRun) return;
    const checkpoint = this.getSelectedSectorStartCheckpoint();
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

  async exitGame() {
    if (this.game?.isMenuExitGuardActive?.()) {
      return;
    }
    try {
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

    // PART A: Update typewriter
    if (this.storyTypewriter) {
      this.storyTypewriter.update(delta);
    }
    this.updateCodexSignalCue(delta);
    this.drawSectorStartStepperCue();

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
    this.closeSettingsOverlay();
    this.closeHowToPlayOverlay();
    destroyMenuFx(this);

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
