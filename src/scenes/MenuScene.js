import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { AudioManager } from '../audio/AudioManager.js';
import { BUILD_ID } from '../buildInfo.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
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
        this.cycleSectorStartCheckpoint(-1);
      } else if (isMoveRight) {
        this.cycleSectorStartCheckpoint(1);
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
    this.subtitle = createText('ONE SHIP. FIFTY BOSS SIGNALS. THE LAST CABINET STILL CALLS.', {
      fontFamily: FONT_ARCADE,
      fontSize: subtitleSize,
      fontWeight: '800',
      fill: '#ffd15c',
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

    const runModeSize = Math.max(11, getResponsiveFontSize(layout, 'small'));
    this.runModeExplainer = createText(this.getRunModeExplainerText(), {
      fontFamily: FONT_MONO,
      fontSize: runModeSize,
      fontWeight: '800',
      fill: '#dffcff',
      stroke: '#020711',
      strokeThickness: 3,
      align: 'center',
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

    this.startBtn = this.createButton('LAUNCH RUN', layout, { variant: 'primary', accent: 0xffd15c });
    this.startBtn.alpha = 0;  // Start invisible
    this.startBtn.on('pointerdown', () => {
      this.quickStartRun();
    });
    this.container.addChild(this.startBtn);

    this.sectorStartBtn = this.createButton(this.getSectorStartButtonLabel(), layout, { accent: 0xffef7e });
    this.attachSectorStartStepperCue(this.sectorStartBtn);
    this.sectorStartBtn.alpha = 0;
    this.sectorStartBtn.on('pointerdown', (event) => this.handleSectorStartPointerDown(event));
    this.container.addChild(this.sectorStartBtn);

    this.highscoreBtn = this.createButton('SHIP HANGAR', layout, { accent: 0x37f5ff });
    this.highscoreBtn.alpha = 0;  // Start invisible
    this.highscoreBtn.on('pointerdown', () => {
      this.openShipSelect();
    });
    this.container.addChild(this.highscoreBtn);

    this.storyBtn = this.createButton(translateText('LEADERBOARD'), layout, { accent: 0xff55d9 });
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

    this.achievementsBtn = this.createButton('ACHIEVEMENTS', layout, { accent: 0xffd15c });
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

    this.threatCodexBtn = this.createButton(translateText('THREAT CODEX'), layout, { accent: 0x7dffcc });
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

    this.settingsBtn = this.createButton('SETTINGS', layout, { accent: 0x7fffd8 });
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

    this.helpBtn = this.createButton(translateText('HOW TO PLAY'), layout, { compact: true, accent: 0xffef7e });
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

    this.exitBtn = this.createButton('EXIT GAME', layout, { accent: 0xff6b6b });
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
    this.musicBtn = this.createButton('MUSIC: ON', layout, { compact: true, accent: 0x7fffd8 });
    // Overwrite style for small button
    const scale = 0.6;
    this.musicBtn.scale.set(scale);
    this.musicBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        const enabled = AudioManager.toggleMute();
        const label = this.musicBtn._label;
        label.text = enabled ? 'MUSIC: ON' : 'MUSIC: OFF';
        this.refreshMenuButtonLabel(this.musicBtn, this.musicBtn._btnWidth - 26, { minScale: 0.72 });
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
    const isMobileLayout = layout.isMobile || width < 720;
    this.layoutBackdrop(width, height);
    this.layoutMissionConsole(width, height);
    resizeMenuFx(this, width, height);

    const titleSize = Math.round(getResponsiveFontSize(layout, 'title') * (isMobileLayout ? 0.9 : 1.18));
    const subtitleSize = Math.round(getResponsiveFontSize(layout, 'subtitle') * (isMobileLayout ? 0.92 : 0.96));
    const storySize = getResponsiveFontSize(layout, 'body');
    const controlsSize = getResponsiveFontSize(layout, 'small');
    const contentWidth = isMobileLayout
      ? Math.min(width - 34, 430)
      : Math.min(Math.max(390, width * 0.39), 530);
    const contentX = isMobileLayout
      ? width / 2
      : Math.max(layout.padding + contentWidth / 2, width * 0.28);
    const align = isMobileLayout ? 'center' : 'left';
    const anchorX = isMobileLayout ? 0.5 : 0;
    const leftX = isMobileLayout ? contentX : contentX - contentWidth / 2;

    this.kicker.style.fontSize = Math.max(11, controlsSize + 1);
    this.kicker.style.align = align;
    this.title.style.fontSize = titleSize;
    this.title.style.stroke = { color: '#031527', width: isMobileLayout ? 5 : 8 };
    this.title.style.letterSpacing = 0;
    this.title.style.padding = isMobileLayout ? 12 : 32;
    this.subtitle.text = isMobileLayout
      ? '50 BOSS SIGNALS\nLAST CABINET ONLINE'
      : 'ONE SHIP. FIFTY BOSS SIGNALS. THE LAST CABINET STILL CALLS.';
    this.subtitle.style.fontSize = subtitleSize;
    this.subtitle.style.align = align;
    this.subtitle.style.wordWrap = true;
    this.subtitle.style.wordWrapWidth = clampTextWidth(contentWidth, layout);
    this.subtitle.style.lineHeight = Math.round(subtitleSize * 1.22);
    this.flavor.style.fontSize = storySize;
    this.flavor.style.lineHeight = Math.round(storySize * 1.5);
    this.flavor.style.align = align;
    this.flavor.style.wordWrapWidth = clampTextWidth(contentWidth, layout);
    this.primaryHint.style.fontSize = Math.max(10, controlsSize);
    this.primaryHint.text = this.getPrimaryHintText();
    this.primaryHint.style.align = align;
    this.primaryHint.style.wordWrapWidth = clampTextWidth(contentWidth, layout);
    this.runModeExplainer.text = this.getRunModeExplainerText();
    this.runModeExplainer.style.fontSize = Math.max(10, controlsSize - 1);
    this.runModeExplainer.style.lineHeight = Math.round(Math.max(10, controlsSize - 1) * 1.28);
    this.runModeExplainer.style.align = align;
    this.runModeExplainer.style.wordWrapWidth = clampTextWidth(isMobileLayout ? contentWidth - 8 : contentWidth, layout);
    this.disclaimer.text = this.getDisclaimerText(layout);
    this.controls.text = layout.isMobile ? this.getControlsText(layout) : '';
    this.controls.style.fontSize = controlsSize;
    this.controls.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);

    const disclaimerSize = Math.max(12, controlsSize);
    this.disclaimer.style.fontSize = disclaimerSize;
    this.disclaimer.style.align = align;
    this.disclaimer.style.wordWrapWidth = clampTextWidth(isMobileLayout ? width * 0.84 : contentWidth, layout);

    this.kicker.updateText?.(false);
    this.title.updateText?.(false);
    this.subtitle.updateText?.(false);
    this.flavor.updateText?.(false);
    this.primaryHint.updateText?.(false);
    this.runModeExplainer.updateText?.(false);
    this.disclaimer.updateText?.(false);
    this.controls.updateText?.(false);

    const fitWidth = isMobileLayout ? contentWidth - 12 : contentWidth - 8;
    fitTextToWidth(this.kicker, fitWidth, { minScale: 0.72 });
    fitTextToWidth(this.title, fitWidth, { minScale: 0.52 });
    fitTextToWidth(this.subtitle, fitWidth, { minScale: 0.72 });
    fitTextToWidth(this.primaryHint, fitWidth, { minScale: 0.74 });
    fitTextToWidth(this.runModeExplainer, fitWidth, { minScale: 0.72 });
    fitTextToWidth(this.disclaimer, fitWidth, { minScale: 0.72 });

    const isShortLayout = !isMobileLayout && height < 820;
    const buttonHeight = isMobileLayout ? 42 : (isShortLayout ? 42 : 48);
    const primaryButtonHeight = isMobileLayout ? 48 : (isShortLayout ? 52 : 58);
    const buttonWidth = isMobileLayout ? Math.min(286, contentWidth - 10) : Math.min(390, contentWidth - 38);
    const primaryButtonWidth = isMobileLayout ? Math.min(304, contentWidth) : Math.min(438, contentWidth - 8);
    const buttonSpacing = isMobileLayout ? 10 : (isShortLayout ? 8 : 12);
    const sectionSpacing = isMobileLayout ? 13 : (isShortLayout ? 12 : 18);

    this.refreshSectorStartState();
    this.updateSectorStartButton({ forceGpuRefresh: forceLabelGpuRefresh });
    const secondaryButtons = [
      ...(this.sectorStartBtn?.visible ? [this.sectorStartBtn] : []),
      this.highscoreBtn,
      this.storyBtn,
      this.threatCodexBtn,
      this.achievementsBtn,
      this.settingsBtn,
      this.exitBtn
    ].filter(Boolean);

    [
      [this.startBtn, primaryButtonWidth, primaryButtonHeight, true],
      ...secondaryButtons.map((button) => [button, buttonWidth, buttonHeight, false])
    ].forEach(([button, btnWidth, btnHeight, isPrimary]) => {
      if (!button) return;
      button._btnWidth = btnWidth;
      button._btnHeight = btnHeight;
      if (isPrimary) button._variant = 'primary';
      button._label.style.fontSize = Math.round(getResponsiveFontSize(layout, 'button') * (isPrimary ? 1 : 0.9));
      this.refreshMenuButtonLabel(button, btnWidth - 48, {
        minScale: button === this.sectorStartBtn ? 0.74 : 0.78,
        forceGpuRefresh: forceLabelGpuRefresh
      });
      this.drawMenuButton(button, false);
    });

    const kickerHeight = this.kicker.height || controlsSize * 1.3;
    const titleHeight = this.title.height || titleSize * 1.2;
    const subtitleHeight = this.subtitle.height || subtitleSize * 1.2;
    const flavorHeight = this.flavor.height || (storySize * 3 * 1.5);
    const primaryHintHeight = this.primaryHint.height || controlsSize * 1.5;
    const runModeExplainerHeight = this.runModeExplainer.height || controlsSize * 3;
    const buttonCount = 1 + secondaryButtons.length;
    const buttonsHeight = primaryButtonHeight + buttonHeight * secondaryButtons.length + buttonSpacing * Math.max(0, buttonCount - 1);
    const exitNoticeHeight = this.exitNotice?.text ? (this.exitNotice.height || controlsSize * 1.2) : 0;
    const disclaimerHeight = this.disclaimer.height || disclaimerSize * 2;
    const totalContentHeight = kickerHeight + titleHeight + subtitleHeight + flavorHeight + primaryHintHeight + runModeExplainerHeight + buttonsHeight + exitNoticeHeight + disclaimerHeight + sectionSpacing * 8;

    const footerReserve = isMobileLayout ? 86 : (isShortLayout ? 16 : 64);
    const availableHeight = height - footerReserve - safeMargin.top;
    const startY = Math.max(
      safeMargin.top + (isMobileLayout ? 18 : 38),
      safeMargin.top + (availableHeight - totalContentHeight) / 2 * (isMobileLayout ? 0.72 : 0.58)
    );

    const stack = createVerticalStack(layout, { startY, spacing: 0 });
    const placeCentered = (item, itemHeight, gapAfter = 0) => {
      if (!item) return;
      item.y = stack.getCurrentY() + itemHeight / 2;
      stack.addGap(itemHeight + gapAfter);
    };

    [this.kicker, this.title, this.subtitle, this.flavor, this.primaryHint, this.runModeExplainer, this.disclaimer].forEach((text) => {
      if (!text) return;
      text.anchor.set(anchorX, 0.5);
      text.x = leftX;
    });

    placeCentered(this.kicker, kickerHeight, isMobileLayout ? 4 : 8);
    placeCentered(this.title, titleHeight, isMobileLayout ? 8 : 10);
    placeCentered(this.subtitle, subtitleHeight, isMobileLayout ? 10 : 18);
    placeCentered(this.flavor, flavorHeight, isMobileLayout ? 12 : 18);
    placeCentered(this.primaryHint, primaryHintHeight, isMobileLayout ? 8 : 10);
    placeCentered(this.runModeExplainer, runModeExplainerHeight, sectionSpacing);

    const buttonX = isMobileLayout ? contentX : leftX + primaryButtonWidth / 2;
    this.startBtn.x = buttonX;
    placeCentered(this.startBtn, primaryButtonHeight, buttonSpacing);

    if (this.sectorStartBtn?.visible) {
      this.sectorStartBtn.x = buttonX;
      placeCentered(this.sectorStartBtn, buttonHeight, buttonSpacing);
    }

    this.highscoreBtn.x = buttonX;
    placeCentered(this.highscoreBtn, buttonHeight, buttonSpacing);

    this.storyBtn.x = buttonX;
    placeCentered(this.storyBtn, buttonHeight, buttonSpacing);

    this.threatCodexBtn.x = buttonX;
    placeCentered(this.threatCodexBtn, buttonHeight, buttonSpacing);

    this.achievementsBtn.x = buttonX;
    placeCentered(this.achievementsBtn, buttonHeight, buttonSpacing);

    this.settingsBtn.x = buttonX;
    placeCentered(this.settingsBtn, buttonHeight, buttonSpacing);

    this.exitBtn.x = buttonX;
    placeCentered(this.exitBtn, buttonHeight, this.exitNotice?.text ? 6 : sectionSpacing);

    if (this.exitNotice) {
      this.exitNotice.style.fontSize = Math.max(11, controlsSize);
      this.exitNotice.style.align = align;
      this.exitNotice.style.wordWrapWidth = clampTextWidth(isMobileLayout ? contentWidth : buttonWidth, layout);
      this.exitNotice.updateText?.(false);
      fitTextToWidth(this.exitNotice, buttonWidth, { minScale: 0.72 });
      if (this.exitNotice.text) {
        this.exitNotice.x = buttonX;
        placeCentered(this.exitNotice, exitNoticeHeight, sectionSpacing);
      } else {
        this.exitNotice.x = buttonX;
        this.exitNotice.y = this.exitBtn.y + buttonHeight / 2 + 6;
      }
    }

    placeCentered(this.disclaimer, disclaimerHeight, 0);

    if (isMobileLayout) {
      [this.kicker, this.title, this.subtitle, this.flavor, this.primaryHint, this.runModeExplainer, this.disclaimer].forEach((text) => {
        if (!text) return;
        text.x = contentX;
        text.anchor.set(0.5);
      });
    }

    const overflow = this.disclaimer.y + disclaimerHeight / 2 - (height - footerReserve);
    if (overflow > 0) {
      const lift = Math.min(overflow + 10, isMobileLayout ? 56 : 90);
      [this.kicker, this.title, this.subtitle, this.flavor, this.primaryHint, this.runModeExplainer, this.startBtn, this.sectorStartBtn?.visible ? this.sectorStartBtn : null, this.highscoreBtn, this.storyBtn, this.threatCodexBtn, this.achievementsBtn, this.settingsBtn, this.exitBtn, this.exitNotice, this.disclaimer].forEach((item) => {
        if (item) item.y -= lift;
      });
    }

    this.drawMenuPanel(layout);

    const easterY = height - safeMargin.bottom - (isMobileLayout ? 8 : 12);
    const controlsY = easterY - (isMobileLayout ? 22 : 32);

    this.controls.x = width / 2;
    this.controls.y = controlsY;

    this.easter.x = isMobileLayout ? width / 2 : layout.padding;
    this.easter.y = easterY;
    this.easter.anchor.set(isMobileLayout ? 0.5 : 0, 0.5);

    this.musicBtn._btnWidth = isMobileLayout ? 150 : 164;
    this.musicBtn._btnHeight = isMobileLayout ? 34 : 36;
    this.musicBtn._label.style.fontSize = Math.max(12, controlsSize);
    this.refreshMenuButtonLabel(this.musicBtn, this.musicBtn._btnWidth - 26, { minScale: 0.72 });
    this.drawMenuButton(this.musicBtn, false);
    this.musicBtn.scale.set(1);
    this.musicBtn.x = width - Math.max(92, layout.padding + this.musicBtn._btnWidth / 2);
    this.musicBtn.y = safeMargin.top + (isMobileLayout ? 32 : 38);

    this.helpBtn._btnWidth = isMobileLayout ? 150 : 164;
    this.helpBtn._btnHeight = isMobileLayout ? 34 : 36;
    this.helpBtn._label.style.fontSize = Math.max(12, controlsSize);
    this.refreshMenuButtonLabel(this.helpBtn, this.helpBtn._btnWidth - 26, { minScale: 0.72 });
    this.drawMenuButton(this.helpBtn, false);
    this.helpBtn.scale.set(1);
    this.helpBtn.x = this.musicBtn.x;
    this.helpBtn.y = this.musicBtn.y + (isMobileLayout ? 42 : 46);

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
    const objective = 'DEFEND THE CABINET // SURVIVE THE BOSS WAVES';
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
    const ranked = translateText('RANKED RUN: Sector 1 climb. Scores, Career XP, achievements, and unlocks count. The leaderboard is watching.');
    const sector = this.sectorStartState?.available
      ? translateText('SECTOR START: checkpoint practice. Local checkpoint record only; no leaderboard or career changes. Great for revenge.')
      : translateText('SECTOR START: unlocks after Sector 5. Then it is checkpoint practice: local records only, no leaderboard or career changes.');
    return `${ranked}\n${sector}`;
  }

  drawMenuPanel(layout) {
    if (!this.menuPanel || !this.startBtn || !this.settingsBtn) return;

    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const isMobileLayout = layout.isMobile || width < 720;
    const isShortLayout = !isMobileLayout && height < 820;
    const contentItems = [
      this.kicker,
      this.title,
      this.subtitle,
      this.flavor,
      this.primaryHint,
      this.runModeExplainer,
      this.startBtn,
      this.sectorStartBtn?.visible ? this.sectorStartBtn : null,
      this.highscoreBtn,
      this.storyBtn,
      this.threatCodexBtn,
      this.achievementsBtn,
      this.settingsBtn,
      this.exitBtn,
      this.exitNotice?.text ? this.exitNotice : null,
      this.disclaimer
    ].filter(Boolean);
    const itemBounds = contentItems.map(boundsForDisplayObject).filter(Boolean);
    const minX = itemBounds.length ? Math.min(...itemBounds.map((bounds) => bounds.x)) : this.startBtn.x - this.startBtn._btnWidth / 2;
    const maxX = itemBounds.length ? Math.max(...itemBounds.map((bounds) => bounds.right)) : this.startBtn.x + this.startBtn._btnWidth / 2;
    const minY = itemBounds.length ? Math.min(...itemBounds.map((bounds) => bounds.y)) : this.startBtn.y - 180;
    const maxY = itemBounds.length ? Math.max(...itemBounds.map((bounds) => bounds.bottom)) : this.settingsBtn.y + 60;
    const padX = isMobileLayout ? 18 : 34;
    const padTop = isMobileLayout ? 16 : (isShortLayout ? 46 : 20);
    const padBottom = isMobileLayout ? 18 : 24;
    let x = Math.max(12, minX - padX);
    let y = Math.max(8, minY - padTop);
    let panelWidth = (maxX - minX) + padX * 2;
    let panelHeight = (maxY - minY) + padTop + padBottom;

    if (isMobileLayout) {
      panelWidth = Math.min(width - 24, Math.max(316, panelWidth));
      x = width / 2 - panelWidth / 2;
    } else {
      panelWidth = Math.min(width * 0.43, Math.max(506, panelWidth));
      if (x + panelWidth > width - 18) x = Math.max(18, width - panelWidth - 18);
    }

    panelHeight = Math.min(height - y - 18, Math.max(390, panelHeight));
    this.lastMenuPanelBounds = { x, y, width: panelWidth, height: panelHeight };

    this.menuPanel.clear();
    this.menuPanel.roundRect(x, y, panelWidth, panelHeight, 8);
    this.menuPanel.fill({ color: 0x020711, alpha: isMobileLayout ? 0.56 : 0.42 });
    this.menuPanel.stroke({ color: 0x37f5ff, width: 1, alpha: 0.42 });
    this.menuPanel.roundRect(x + 9, y + 9, panelWidth - 18, panelHeight - 18, 6);
    this.menuPanel.stroke({ color: 0xff55d9, width: 1, alpha: 0.2 });
    this.menuPanel.rect(x, y + 28, 4, panelHeight - 56);
    this.menuPanel.fill({ color: 0x37f5ff, alpha: 0.56 });
    this.menuPanel.rect(x + panelWidth - 4, y + 54, 4, panelHeight - 108);
    this.menuPanel.fill({ color: 0xff55d9, alpha: 0.42 });
    this.menuPanel.rect(x + 24, y + 18, panelWidth - 48, 2);
    this.menuPanel.fill({ color: 0x7fffd8, alpha: 0.36 });
    this.menuPanel.rect(x + 24, y + panelHeight - 22, panelWidth - 48, 2);
    this.menuPanel.fill({ color: 0xffd15c, alpha: 0.32 });

    const tabWidth = isMobileLayout ? 84 : 118;
    this.menuPanel.roundRect(x + 24, y - 5, tabWidth, 10, 4);
    this.menuPanel.fill({ color: 0xffd15c, alpha: 0.42 });
  }

  getLayoutDebugState() {
    const textItems = {
      kicker: this.kicker,
      title: this.title,
      subtitle: this.subtitle,
      flavor: this.flavor,
      primaryHint: this.primaryHint,
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
        buttonText: this.sectorStartBtn?._label?.text || null,
        buttonBounds: boundsForDisplayObject(this.sectorStartBtn?.visible ? this.sectorStartBtn : null),
        buttonConfiguredWidth: Number(this.sectorStartBtn?._btnWidth || 0),
        buttonConfiguredHeight: Number(this.sectorStartBtn?._btnHeight || 0),
        labelBounds: boundsForDisplayObject(this.sectorStartBtn?.visible ? this.sectorStartBtn?._label : null),
        labelScale: Number(this.sectorStartBtn?._label?.scale?.x || 1),
        arrowCueVisible: Boolean(this.sectorStartBtn?._stepperCue?.visible),
        arrowCueBounds: boundsForDisplayObject(this.sectorStartBtn?._stepperCue?.visible ? this.sectorStartBtn?._stepperCue : null)
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
    this.missionConsole.alpha = responsiveLayout.isMobile ? 0.2 : 0.48;

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
      this.backdropShade.fill({ color: 0x020711, alpha: 0.12 });
      this.backdropShade.rect(0, 0, Math.min(width * 0.54, 760), height);
      this.backdropShade.fill({ color: 0x020711, alpha: 0.46 });
      this.backdropShade.rect(0, height * 0.68, width, height * 0.32);
      this.backdropShade.fill({ color: 0x000000, alpha: 0.16 });
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

    // Store dimensions for hover redraw
    container._btnWidth = btnWidth;
    container._btnHeight = btnHeight;
    container._variant = options.variant || 'secondary';
    container._accent = options.accent || 0x37f5ff;
    container._bg = bg;
    container._shine = shine;
    container._label = label;
    container._focus = focus;
    this.drawMenuButton(container, false);

    container.on('pointerover', () => {
      this.setInputDevice('keyboard');
      this.setMenuFocusByButton(container);
      playMenuFocusSfx(0.11);
      label.style.fill = '#ffffff';
      this.drawMenuButton(container, true);
    });

    container.on('pointerout', () => {
      label.style.fill = '#c9fbff';
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
    const visible = Boolean(button?.visible && this.sectorStartState?.available && checkpoints.length > 1);
    const w = button._btnWidth || 286;
    const h = button._btnHeight || 46;
    button.hitArea = new PIXI.Rectangle(
      -w / 2 - (visible ? 30 : 0),
      -h / 2 - 4,
      w + (visible ? 60 : 0),
      h + 8
    );
    cue.visible = visible;
    cue.clear();
    if (!visible) return;

    const focused = Boolean(button._focused);
    const pulse = 0.5 + Math.sin(this.animationTime * 6) * 0.5;
    const alpha = focused ? 0.86 + pulse * 0.14 : 0.58;
    const sideX = w / 2 + (focused ? 13 : 10);
    const boxW = Math.max(22, Math.min(30, h * 0.64));
    const boxH = Math.max(28, Math.min(36, h * 0.84));
    const color = focused ? 0xffef7e : 0x37f5ff;

    for (const side of [-1, 1]) {
      const centerX = side * sideX;
      cue.roundRect(centerX - boxW / 2, -boxH / 2, boxW, boxH, 7);
      cue.fill({ color: 0x031323, alpha: 0.52 });
      cue.roundRect(centerX - boxW / 2, -boxH / 2, boxW, boxH, 7);
      cue.stroke({ color, width: focused ? 2 : 1.5, alpha });

      const pointX = centerX + side * 5;
      const backX = centerX - side * 5;
      cue.moveTo(backX, -8);
      cue.lineTo(pointX, 0);
      cue.lineTo(backX, 8);
      cue.stroke({ color: 0xffffff, width: focused ? 3 : 2.4, alpha: focused ? 0.92 : 0.72 });
      cue.moveTo(backX - side * 3, -8);
      cue.lineTo(pointX - side * 3, 0);
      cue.lineTo(backX - side * 3, 8);
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
    const accent = container._accent || 0x37f5ff;
    const isFocused = Boolean(container._focused);
    const edgeAlpha = isHover || isFocused ? 0.9 : (isPrimary ? 0.68 : 0.48);

    focus?.clear();
    if (isFocused) {
      focus.roundRect(x - 5, y - 5, w + 10, h + 10, 9);
      focus.stroke({ color: 0xffef7e, width: 2, alpha: 0.86 });
    }

    bg.clear();
    bg.roundRect(x, y, w, h, 7);
    bg.fill({ color: isPrimary ? 0x10203b : (isHover ? 0x06314f : 0x04182d), alpha: isHover ? 0.82 : (isPrimary ? 0.74 : 0.6) });
    bg.stroke({ color: isFocused ? 0xffffff : accent, width: isHover || isFocused ? 3 : 2, alpha: edgeAlpha });
    bg.rect(x + 10, y + 7, 4, h - 14);
    bg.fill({ color: isPrimary ? 0xffd15c : 0xff55d9, alpha: isHover ? 0.9 : 0.62 });
    bg.rect(x + w - 14, y + 7, 4, h - 14);
    bg.fill({ color: isPrimary ? 0x37f5ff : 0xffd15c, alpha: isHover ? 0.82 : 0.48 });
    bg.moveTo(x + 22, y);
    bg.lineTo(x + w - 22, y);
    bg.stroke({ color: 0xffffff, width: 1, alpha: isHover ? 0.18 : 0.08 });

    shine.clear();
    shine.roundRect(x + 4, y + 4, w - 8, Math.max(8, h * 0.36), 5);
    shine.fill({ color: 0xffffff, alpha: isHover ? 0.12 : (isPrimary ? 0.075 : 0.045) });
    shine.moveTo(x + 22, y + h - 7);
    shine.lineTo(x + w - 22, y + h - 7);
    shine.stroke({ color: 0x7fffd8, width: 1, alpha: isHover ? 0.38 : 0.18 });
    if (container?._stepperCue) this.drawSectorStartStepperCue(container);
  }

  startAnimations() {
    // Staggered fade-in animations
    this.animateElement(this.kicker, 0, 0.4);
    this.animateElement(this.title, 0.1, 0.55);
    this.animateElement(this.subtitle, 0.35, 0.5);
    this.animateElement(this.flavor, 0.55, 0.5);
    this.animateElement(this.primaryHint, 0.68, 0.42);
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
            this.musicBtn._label.text = enabled ? 'MUSIC: ON' : 'MUSIC: OFF';
            this.refreshMenuButtonLabel(this.musicBtn, this.musicBtn._btnWidth - 26, { minScale: 0.72 });
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
    this.drawSectorStartStepperCue();
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
    if (nav.pressed.left) this.cycleSectorStartCheckpoint(-1);
    if (nav.pressed.right) this.cycleSectorStartCheckpoint(1);
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

  updateSectorStartButton({ forceGpuRefresh = false } = {}) {
    if (!this.sectorStartBtn) return;
    const available = Boolean(this.sectorStartState?.available);
    this.sectorStartBtn.visible = available;
    this.sectorStartBtn.eventMode = available ? 'static' : 'none';
    this.sectorStartBtn.cursor = available ? 'pointer' : 'default';
    if (this.sectorStartBtn._label) {
      this.sectorStartBtn._label.text = this.getSectorStartButtonLabel();
      this.refreshMenuButtonLabel(this.sectorStartBtn, (this.sectorStartBtn._btnWidth || 286) - 48, {
        minScale: 0.72,
        forceGpuRefresh
      });
    }
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
      const edgeWidth = width * 0.28;
      if (localX <= -width / 2 + edgeWidth) {
        this.cycleSectorStartCheckpoint(-1);
        return;
      }
      if (localX >= width / 2 - edgeWidth) {
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
          this.musicBtn._label.text = AudioManager.getSettings().musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF';
          this.refreshMenuButtonLabel(this.musicBtn, this.musicBtn._btnWidth - 26, { minScale: 0.72 });
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
      this.musicBtn._label.text = AudioManager.getSettings().musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF';
      this.refreshMenuButtonLabel(this.musicBtn, this.musicBtn._btnWidth - 26, { minScale: 0.72 });
    }
    if (this.threatCodexBtn?._label) {
      this.threatCodexBtn._label.text = translateText('THREAT CODEX');
    }
    if (this.helpBtn?._label) {
      this.helpBtn._label.text = translateText('HOW TO PLAY');
      this.refreshMenuButtonLabel(this.helpBtn, this.helpBtn._btnWidth - 26, { minScale: 0.72 });
    }
    this.refreshSectorStartState();
    this.updateSectorStartButton({ forceGpuRefresh: true });
    if (this.storyBtn?._label) {
      this.storyBtn._label.text = translateText('LEADERBOARD');
      this.refreshMenuButtonLabel(this.storyBtn, this.storyBtn._btnWidth - 48, { minScale: 0.78 });
    }
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

    const startTime = Date.now() + delay * 1000;
    const initialY = element.y;
    const offsetY = 20;

    const animate = () => {
      const now = Date.now();
      if (now < startTime) {
        requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(1, (now - startTime) / (duration * 1000));
      const eased = this.easeOutCubic(progress);

      element.alpha = eased;
      element.y = initialY + offsetY * (1 - eased);  // Slide up from below

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
