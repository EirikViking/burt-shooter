import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BonusAsset } from '../utils/BonusAsset.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { AudioManager } from '../audio/AudioManager.js';
import { BUILD_ID } from '../buildInfo.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { SettingsOverlay } from '../ui/SettingsOverlay.js';
import { isMobile, isIOS, isStandalone } from '../utils/Mobile.js';
import { getDefaultShipKey, isShipUnlocked, isValidShipKey, resolveShipKey } from '../config/ShipMetadata.js';
// PART A: Dynamic story rotation
import { tauntDirector } from '../game/TauntDirector.js';
import { TypewriterText } from '../utils/TypewriterText.js';

function normalizeTextStyle(style = {}) {
  const next = { ...style };
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

const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, Impact, sans-serif';
const FONT_ARCADE = 'Rajdhani, Bahnschrift, Eurostile, Trebuchet MS, sans-serif';
const FONT_MONO = 'Cascadia Mono, Consolas, Courier New, monospace';

export class MenuScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.layoutUnsubscribe = null;
    this.title = null;
    this.subtitle = null;
    this.flavor = null;
    this.disclaimer = null;
    this.startBtn = null;
    this.highscoreBtn = null;
    this.storyBtn = null;
    this.settingsBtn = null;
    this.musicBtn = null;
    this.controls = null;
    this.easter = null;
    this.stars = [];
    this.animationTime = 0;
    this.buildStamp = null;
    this.backdrop = null;
    this.backdropShade = null;
    this.missionConsole = null;
    this.menuPanel = null;
    this.radarSweep = null;
    this.radarBlips = [];
    this.crewComms = [];
    this.settingsOverlay = null;

    // PWA install prompt
    this.installPrompt = null;
    this.installButton = null;

    // PART A: Story rotation
    this.storyTypewriter = null;
    this.storyRotationTimer = null;
    this.skipHandler = null;
  }

  init() {
    this.container.removeChildren();
    this.stars = [];
    this.animationTime = 0;
    this.container.sortableChildren = true;
    this.createStarfield();
    this.initBackdrop();
    this.initMissionConsole();
    // Preload all game assets here for simplicity
    // Preload all game assets here for simplicity
    GameAssets.loadBonusCore().then(() => {
      GameAssets.loadCommsPortraits().then(() => {
        GameAssets.loadShips().then(() => {
          this.initBonusDecorations();
        });
      });
    });
    this.createElements();
    this.warmMenuFonts();
    this.layoutUnsubscribe = addResponsiveListener(() => this.layoutMenu());
    this.layoutMenu();
    this.startAnimations();
    AudioManager.playMusicContext('menu');
    console.log(`MenuScene build:${BUILD_ID}`);

    // TASK C: Setup PWA install prompt
    this.setupInstallPrompt();

    // PART A: Initialize story rotation
    this.initStoryRotation();
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
      fontFamily: 'Courier New',
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
      this.backdrop.alpha = 0.68;
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
        letterSpacing: 1.2,
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

    const titleSize = getResponsiveFontSize(layout, 'title');
    const titleBlur = layout.isMobile ? 4 : 8;

    this.title = createText('NOVA SWARM', {
      fontFamily: FONT_DISPLAY,
      fontSize: titleSize,
      fill: '#dffcff',
      fontWeight: '900',
      letterSpacing: layout.isMobile ? 1 : 2,
      stroke: '#062a54',
      strokeThickness: layout.isMobile ? 4 : 6,
      padding: layout.isMobile ? 12 : 26,
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: titleBlur + 6,
      dropShadowDistance: 0,
      dropShadowAlpha: layout.isMobile ? 0.62 : 0.86
    });
    this.title.anchor.set(0.5);
    this.title.alpha = 0;  // Start invisible for fade-in
    this.title.zIndex = 10;
    this.container.addChild(this.title);

    const subtitleSize = getResponsiveFontSize(layout, 'subtitle');
    this.subtitle = createText('FORMATION PANIC // COIN-SLOT HEROICS // BOSS-WAVE BRAVADO', {
      fontFamily: FONT_ARCADE,
      fontSize: subtitleSize,
      fontWeight: '700',
      fill: '#ff67dc',
      letterSpacing: 1.4,
      align: 'center'
    });
    this.subtitle.anchor.set(0.5);
    this.subtitle.alpha = 0;  // Start invisible
    this.container.addChild(this.subtitle);

    const storySize = getResponsiveFontSize(layout, 'body');
    const storyLineHeight = Math.round(storySize * 1.5);
    this.flavor = createText(
      'The alien formation union has gone rogue.\nDodge the patterns, roast the swarm, chase the high score.',
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
    this.flavor.alpha = 0;  // Start invisible
    this.container.addChild(this.flavor);

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

    this.startBtn = this.createButton('PLAY NOW', layout);
    this.startBtn.alpha = 0;  // Start invisible
    this.startBtn.on('pointerdown', () => {
      this.quickStartRun();
    });
    this.container.addChild(this.startBtn);

    this.highscoreBtn = this.createButton('SHIP HANGAR', layout);
    this.highscoreBtn.alpha = 0;  // Start invisible
    this.highscoreBtn.on('pointerdown', () => {
      this.openShipSelect();
    });
    this.container.addChild(this.highscoreBtn);

    this.storyBtn = this.createButton('HIGHSCORES', layout);
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

    this.settingsBtn = this.createButton('SETTINGS', layout);
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

    this.easter = createText('Nova Swarm // Arcade Patrol Build', {
      fontFamily: FONT_MONO,
      fontSize: 10,
      fill: '#58717f'
    });
    this.easter.anchor.set(0.5);
    this.container.addChild(this.easter);

    // Mute/Music Toggle (Small corner button)
    this.musicBtn = this.createButton('MUSIC: ON', layout);
    // Overwrite style for small button
    const scale = 0.6;
    this.musicBtn.scale.set(scale);
    this.musicBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        const enabled = AudioManager.toggleMute();
        const label = this.musicBtn._label;
        label.text = enabled ? 'MUSIC: ON' : 'MUSIC: OFF';
        label.updateText?.(false);
      } catch (e) {
        console.error('[MenuScene] Music Toggle Error:', e);
      }
    });
    this.container.addChild(this.musicBtn);

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
    if (typeof document === 'undefined' || !document.fonts?.load) return;

    Promise.all([
      document.fonts.load('900 56px Orbitron'),
      document.fonts.load('800 20px Orbitron'),
      document.fonts.load('700 18px Rajdhani')
    ]).then(() => {
      this.refreshMenuText();
    }).catch(() => {
      // System fallbacks are acceptable if a browser blocks local font loading.
    });
  }

  refreshMenuText() {
    [
      this.title,
      this.subtitle,
      this.flavor,
      this.disclaimer,
      this.controls,
      this.easter,
      this.buildStamp,
      this.musicBtn?._label,
      this.startBtn?._label,
      this.highscoreBtn?._label,
      this.storyBtn?._label,
      this.settingsBtn?._label,
      ...this.crewComms.flatMap((card) => card.children.filter((child) => child instanceof PIXI.Text))
    ].filter(Boolean).forEach((text) => text.onViewUpdate?.());
    this.layoutMenu();
  }

  async initBonusDecorations() {
    try {
      const texture = await BonusAsset.ensureLoaded();

      const { width, height } = this.game.app.screen;

      // 1. Hero bonus core (left side)
      const hero = new PIXI.Sprite(texture);
      hero.anchor.set(0.5);
      hero.height = 110;
      hero.scale.x = hero.scale.y; // Maintain aspect ratio
      hero.x = width * 0.08;
      hero.y = height * 0.5;
      hero.rotation = -0.15;
      hero.zIndex = 0; // Behind UI
      hero.alpha = 0.42;
      this.container.addChild(hero);

      // Store for animation
      this.heroBonusCore = hero;
      this.heroBaseY = hero.y;

      // 2. Secondary hero bonus core (right side)
      const hero2 = new PIXI.Sprite(texture);
      hero2.anchor.set(0.5);
      hero2.height = 100;
      hero2.scale.x = hero2.scale.y;
      hero2.x = width * 0.92;
      hero2.y = height * 0.55;
      hero2.rotation = 0.2;
      hero2.zIndex = 0;
      hero2.alpha = 0.34;
      this.container.addChild(hero2);

      // Store for animation
      this.heroBonusCore2 = hero2;
      this.heroBaseY2 = hero2.y;

      // 3. Floating bonus-core cluster
      this.floatingBonusCores = [];
      for (let i = 0; i < 3; i++) {
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        const scale = 0.18 + Math.random() * 0.18;
        sprite.scale.set(scale);

        // Divide screen: left and right columns (avoid center text area)
        const isLeft = Math.random() < 0.5;
        const minX = isLeft ? 0 : width * 0.8;
        const maxX = isLeft ? width * 0.2 : width;

        sprite.x = minX + Math.random() * (maxX - minX);
        sprite.y = Math.random() * height;

        sprite.driftSpeedX = (Math.random() - 0.5) * 0.35; // More movement
        sprite.driftSpeedY = (Math.random() - 0.5) * 0.35;
        sprite.rotSpeed = (Math.random() - 0.5) * 0.025;

        sprite.boundsX = { min: isLeft ? -50 : width * 0.75, max: isLeft ? width * 0.25 : width + 50 };

        sprite.alpha = 0.22 + Math.random() * 0.14;
        sprite.rotation = Math.random() * Math.PI * 2;
        sprite.zIndex = 1; // Just above stars

        this.container.addChild(sprite);
        this.floatingBonusCores.push(sprite);
      }

    } catch (e) {
      console.error('Menu bonus decorations failed:', e);
    }
  }



  layoutMenu() {
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);
    const safeMargin = responsiveLayout.safeArea;
    this.layoutBackdrop(width, height);
    this.layoutMissionConsole(width, height);

    // Update font sizes based on current layout
    const titleSize = getResponsiveFontSize(layout, 'title');
    const subtitleSize = getResponsiveFontSize(layout, 'subtitle');
    const storySize = getResponsiveFontSize(layout, 'body');
    const controlsSize = getResponsiveFontSize(layout, 'small');

    this.title.style.fontSize = titleSize;
    this.title.style.stroke = { color: '#062a54', width: layout.isMobile ? 4 : 6 };
    this.title.style.letterSpacing = layout.isMobile ? 1 : 2;
    this.title.style.padding = layout.isMobile ? 12 : 26;
    this.subtitle.style.fontSize = subtitleSize;
    this.flavor.style.fontSize = storySize;
    this.flavor.style.lineHeight = Math.round(storySize * 1.5);
    this.flavor.style.wordWrapWidth = clampTextWidth(width * (layout.isMobile ? 0.9 : 0.7), layout);
    this.disclaimer.text = this.getDisclaimerText(layout);
    this.controls.text = layout.isMobile ? this.getControlsText(layout) : '';
    this.controls.style.fontSize = controlsSize;
    this.controls.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);

    const disclaimerSize = Math.max(12, controlsSize);
    this.disclaimer.style.fontSize = disclaimerSize;
    this.disclaimer.style.wordWrapWidth = clampTextWidth(width * (layout.isMobile ? 0.75 : 0.86), layout);

    // Force text measurement update
    this.title.updateText?.(false);
    this.subtitle.updateText?.(false);
    this.flavor.updateText?.(false);
    this.disclaimer.updateText?.(false);
    this.controls.updateText?.(false);

    // Use MEASURED heights instead of estimates
    const buttonHeight = layout.isMobile ? 38 : 46;
    const buttonSpacing = layout.isMobile ? 9 : 12;
    const sectionSpacing = layout.isMobile ? 12 : 20;

    // Measure actual text heights
    const titleHeight = this.title.height || titleSize * 1.2;
    const subtitleHeight = this.subtitle.height || subtitleSize * 1.2;
    const flavorHeight = this.flavor.height || (storySize * 3 * 1.5);
    const buttonsHeight = buttonHeight * 4 + buttonSpacing * 3;
    const disclaimerHeight = this.disclaimer.height || disclaimerSize * 2;

    // Spacing between sections: title->subtitle, subtitle->flavor, flavor->buttons, buttons->disclaimer
    const totalContentHeight = titleHeight + subtitleHeight + flavorHeight + buttonsHeight + disclaimerHeight + sectionSpacing * 4;

    // Calculate starting Y for better vertical centering
    const footerReserve = layout.isMobile ? 70 : 86; // Space for controls and easter egg
    const availableHeight = height - footerReserve - safeMargin.top;
    const startY = Math.max(
      safeMargin.top,
      safeMargin.top + (availableHeight - totalContentHeight) / 2 * (layout.isMobile ? 0.6 : 0.75)
    );

    const stack = createVerticalStack(layout, { startY, spacing: 0 });

    // Position elements using actual measured heights with explicit spacing
    this.title.x = width / 2;
    this.title.y = stack.getCurrentY();
    stack.addGap(titleHeight + (layout.isMobile ? 4 : 8));

    this.subtitle.x = width / 2;
    this.subtitle.y = stack.getCurrentY();
    stack.addGap(subtitleHeight + (layout.isMobile ? 12 : 40));  // Much more spacing on desktop

    // Flavor text must come AFTER subtitle with guaranteed spacing
    this.flavor.x = width / 2;
    this.flavor.y = stack.getCurrentY();
    stack.addGap(flavorHeight + (layout.isMobile ? 16 : 32));

    // Position buttons with proper spacing
    this.startBtn.x = width / 2;
    this.startBtn.y = stack.getCurrentY();
    stack.addGap(buttonHeight + buttonSpacing);

    this.highscoreBtn.x = width / 2;
    this.highscoreBtn.y = stack.getCurrentY();
    stack.addGap(buttonHeight + buttonSpacing);

    this.storyBtn.x = width / 2;
    this.storyBtn.y = stack.getCurrentY();
    stack.addGap(buttonHeight + buttonSpacing);

    this.settingsBtn.x = width / 2;
    this.settingsBtn.y = stack.getCurrentY();
    stack.addGap(buttonHeight + sectionSpacing);

    this.drawMenuPanel(layout);

    this.disclaimer.x = width / 2;
    this.disclaimer.y = stack.getCurrentY();

    // Footer elements - position from bottom with safe margin
    const easterY = height - safeMargin.bottom - (layout.isMobile ? 8 : 12);
    const controlsY = easterY - (layout.isMobile ? 20 : 46);

    this.controls.x = width / 2;
    this.controls.y = controlsY;

    this.easter.x = width / 2;
    this.easter.y = easterY;

    // Position Music Btn (Top Right)
    this.musicBtn.x = width - Math.max(88, layout.padding);
    this.musicBtn.y = 40;

    if (this.buildStamp) {
      this.buildStamp.x = width - layout.padding / 2;
      this.buildStamp.y = height - layout.padding / 2;
    }

    // Reposition install button if exists
    if (this.installButton && this.installButton.visible) {
      this.installButton.x = width / 2;
      this.installButton.y = height - 100; // Adjusted to be above footer
    }
  }

  getControlsText(layout) {
    return layout.isMobile
      ? 'Joystick: Move | FIRE button: Shoot'
      : 'WASD/Arrows/Stick: Move | Space/A: Shoot | Shift/B: Dodge | P/Start: Pause';
  }

  getDisclaimerText(layout) {
    const objective = 'DEFEND THE CABINET // SURVIVE THE BOSS WAVES';
    return layout.isMobile ? objective : `${objective}\n${this.getControlsText(layout)}`;
  }

  drawMenuPanel(layout) {
    if (!this.menuPanel || !this.startBtn || !this.settingsBtn) return;

    const panelWidth = layout.isMobile ? 256 : 342;
    const panelHeight = Math.max(236, (this.settingsBtn.y - this.startBtn.y) + 100);
    const x = this.game.getWidth() / 2 - panelWidth / 2;
    const y = this.startBtn.y - 52;

    this.menuPanel.clear();
    this.menuPanel.roundRect(x, y, panelWidth, panelHeight, 8);
    this.menuPanel.fill({ color: 0x020915, alpha: 0.48 });
    this.menuPanel.stroke({ color: 0x37f5ff, width: 1, alpha: 0.28 });
    this.menuPanel.roundRect(x + 8, y + 8, panelWidth - 16, panelHeight - 16, 6);
    this.menuPanel.stroke({ color: 0xff55d9, width: 1, alpha: 0.22 });
    this.menuPanel.rect(x + 22, y + 15, panelWidth - 44, 2);
    this.menuPanel.fill({ color: 0x37f5ff, alpha: 0.32 });
    this.menuPanel.rect(x + 22, y + panelHeight - 17, panelWidth - 44, 2);
    this.menuPanel.fill({ color: 0xffd15c, alpha: 0.28 });

    const notchWidth = 72;
    this.menuPanel.rect(this.game.getWidth() / 2 - notchWidth / 2, y - 3, notchWidth, 6);
    this.menuPanel.fill({ color: 0xff55d9, alpha: 0.34 });
  }

  layoutMissionConsole(width = this.game.app.screen.width, height = this.game.app.screen.height) {
    if (!this.missionConsole) return;
    const responsiveLayout = getCurrentLayout();
    this.missionConsole.alpha = responsiveLayout.isMobile ? 0.34 : 0.78;

    if (this.radar) {
      this.radar.x = width / 2;
      this.radar.y = height * (responsiveLayout.isMobile ? 0.54 : 0.56);
      this.radar.scale.set(responsiveLayout.isMobile ? 0.84 : 1);
    }

    this.crewComms.forEach((card) => {
      const x = card.align < 0 ? width * 0.16 : width * 0.84;
      const y = height * 0.32;
      card.x = x;
      card.y = y;
      card.baseY = y;
      card.visible = !responsiveLayout.isMobile && width >= 860;
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
      this.backdropShade.fill({ color: 0x020711, alpha: 0.46 });
      this.backdropShade.rect(0, 0, width, height);
      this.backdropShade.fill({ color: 0x000000, alpha: 0.12 });
    }
  }

  createButton(text, layout) {
    const container = new PIXI.Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.zIndex = 10;

    const btnWidth = layout?.isMobile ? 218 : 286;
    const btnHeight = layout?.isMobile ? 38 : 46;
    const fontSize = getResponsiveFontSize(layout || { isMobile: false }, 'button');

    const bg = new PIXI.Graphics();
    container.addChild(bg);

    const shine = new PIXI.Graphics();
    container.addChild(shine);

    const label = createText(text, {
      fontFamily: FONT_DISPLAY,
      fontSize: fontSize,
      fontWeight: '800',
      letterSpacing: 1.5,
      fill: '#c9fbff',
      stroke: '#031323',
      strokeThickness: 3
    });
    label.anchor.set(0.5);
    container.addChild(label);

    // Store dimensions for hover redraw
    container._btnWidth = btnWidth;
    container._btnHeight = btnHeight;
    container._bg = bg;
    container._shine = shine;
    container._label = label;
    this.drawMenuButton(container, false);

    container.on('pointerover', () => {
      label.style.fill = '#ffffff';
      this.drawMenuButton(container, true);
    });

    container.on('pointerout', () => {
      label.style.fill = '#c9fbff';
      this.drawMenuButton(container, false);
    });

    return container;
  }

  drawMenuButton(container, isHover = false) {
    const bg = container?._bg;
    const shine = container?._shine;
    if (!bg || !shine) return;

    const w = container._btnWidth || 286;
    const h = container._btnHeight || 46;
    const x = -w / 2;
    const y = -h / 2;
    const cyanAlpha = isHover ? 0.72 : 0.48;

    bg.clear();
    bg.roundRect(x, y, w, h, 7);
    bg.fill({ color: isHover ? 0x064766 : 0x041c35, alpha: isHover ? 0.76 : 0.62 });
    bg.stroke({ color: 0x37f5ff, width: isHover ? 3 : 2, alpha: cyanAlpha });
    bg.rect(x + 9, y + 7, 4, h - 14);
    bg.fill({ color: 0xff55d9, alpha: isHover ? 0.82 : 0.56 });
    bg.rect(x + w - 13, y + 7, 4, h - 14);
    bg.fill({ color: 0xffd15c, alpha: isHover ? 0.76 : 0.48 });

    shine.clear();
    shine.roundRect(x + 4, y + 4, w - 8, Math.max(8, h * 0.36), 5);
    shine.fill({ color: 0xffffff, alpha: isHover ? 0.1 : 0.045 });
    shine.moveTo(x + 22, y + h - 7);
    shine.lineTo(x + w - 22, y + h - 7);
    shine.stroke({ color: 0x7fffd8, width: 1, alpha: isHover ? 0.34 : 0.18 });
  }

  startAnimations() {
    // Staggered fade-in animations
    this.animateElement(this.title, 0, 0.5);
    this.animateElement(this.subtitle, 0.3, 0.5);
    this.animateElement(this.flavor, 0.6, 0.5);
    this.animateElement(this.menuPanel, 0.75, 0.45);
    this.animateElement(this.startBtn, 0.9, 0.4);
    this.animateElement(this.highscoreBtn, 1.1, 0.4);
    this.animateElement(this.storyBtn, 1.25, 0.4);
    this.animateElement(this.settingsBtn, 1.35, 0.4);
    this.animateElement(this.disclaimer, 1.5, 0.4);
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
    try {
      AudioManager.init();
      AudioManager.playSfx('start_game_confirm', { force: true, volume: 0.78 });
      AudioManager.playMusicContext('gameplay', { resetForNewRun: true });
      this.game.startGame(this.getQuickStartShipKey());
    } catch (e) {
      console.error('[MenuScene] Quick Start Error:', e);
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
        if (this.musicBtn?._label) {
          this.musicBtn._label.text = AudioManager.getSettings().musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF';
        }
      }
    });
    this.container.addChild(this.settingsOverlay.container);
  }

  closeSettingsOverlay() {
    if (this.settingsOverlay) {
      this.settingsOverlay.close();
      this.settingsOverlay = null;
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

    // PART A: Update typewriter
    if (this.storyTypewriter) {
      this.storyTypewriter.update(delta);
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

    // PART A: Cleanup story rotation
    if (this.storyRotationTimer) {
      clearInterval(this.storyRotationTimer);
      this.storyRotationTimer = null;
    }
    if (this.skipHandler) {
      window.removeEventListener('keydown', this.skipHandler);
      this.container.off('pointerdown', this.skipHandler);
      this.skipHandler = null;
    }

    if (this.layoutUnsubscribe) {
      this.layoutUnsubscribe();
      this.layoutUnsubscribe = null;
    }
  }
}
