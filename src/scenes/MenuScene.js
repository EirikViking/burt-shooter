import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BeerAsset } from '../utils/BeerAsset.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { AudioManager } from '../audio/AudioManager.js';
import { BUILD_ID } from '../buildInfo.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize } from '../ui/textLayout.js';
import { SettingsOverlay } from '../ui/SettingsOverlay.js';
import { isMobile, isIOS, isStandalone } from '../utils/Mobile.js';
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
    GameAssets.loadBeer().then(() => {
      GameAssets.loadPhotos().then(() => {
        GameAssets.loadShips().then(() => {
          this.initBeerDecorations();
        });
      });
    });
    this.createElements();
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
        alias: 'beervan',
        src: AssetManifest.sprites.beervan
      });

      // 2. Validate texture BEFORE using dimensions
      console.log('DEBUG: Texture loaded', texture);
      if (!texture) {
        throw new Error('Texture invalid after load');
      }

      // 3. Create Sprite
      const sprite = new PIXI.Sprite(texture);
      sprite.label = 'DebugBeerVan';
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
      console.error('DEBUG: Error loading beervan', e);
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
    consoleLayer.eventMode = 'none';
    consoleLayer.interactiveChildren = false;
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
      { align: -1, label: 'NAV', sub: 'ARCTIC LINK' },
      { align: 1, label: 'PILOT', sub: 'COMMS HOT' }
    ];

    specs.forEach((spec, index) => {
      const card = new PIXI.Container();
      card.label = `ui_menuCrewComms_${index}`;
      card.zIndex = 2;
      card.eventMode = 'none';
      card.interactiveChildren = false;
      card.avatarSize = 76;
      card.baseY = 0;

      const bg = new PIXI.Graphics();
      bg.roundRect(-62, -58, 124, 116, 8);
      bg.fill({ color: 0x06111d, alpha: 0.58 });
      bg.stroke({ color: spec.align < 0 ? 0x37f5ff : 0xff55d9, width: 1, alpha: 0.74 });
      card.addChild(bg);

      const inner = new PIXI.Graphics();
      inner.roundRect(-46, -46, 92, 78, 5);
      inner.stroke({ color: 0xffffff, width: 1, alpha: 0.13 });
      card.addChild(inner);

      const avatarSlot = new PIXI.Container();
      avatarSlot.y = -4;
      card.avatarSlot = avatarSlot;
      card.addChild(avatarSlot);

      const placeholder = new PIXI.Graphics();
      placeholder.roundRect(-38, -44, 76, 76, 5);
      placeholder.fill({ color: 0x0b2234, alpha: 0.74 });
      placeholder.stroke({ color: 0x37f5ff, width: 1, alpha: 0.3 });
      avatarSlot.addChild(placeholder);

      const scan = new PIXI.Graphics();
      scan.rect(-42, -18, 84, 2);
      scan.fill({ color: 0x7fffd8, alpha: 0.3 });
      scan.label = 'ui_menuCrewScan';
      scan.phase = index * 1.4;
      card.scan = scan;
      card.addChild(scan);

      const label = createText(spec.label, {
        fontFamily: 'Courier New',
        fontSize: 14,
        fill: '#f6fbff',
        fontWeight: 'bold',
        align: 'center'
      });
      label.anchor.set(0.5);
      label.y = 35;
      card.addChild(label);

      const sub = createText(spec.sub, {
        fontFamily: 'Courier New',
        fontSize: 9,
        fill: spec.align < 0 ? '#37f5ff' : '#ff8ae8',
        align: 'center'
      });
      sub.anchor.set(0.5);
      sub.y = 49;
      card.addChild(sub);

      card.align = spec.align;
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

    this.title = createText('BURT SHOOTER', {
      fontFamily: 'Courier New',
      fontSize: titleSize,
      fill: '#00ffff',
      stroke: '#0088ff',
      strokeThickness: layout.isMobile ? 2 : 3,
      dropShadow: true,
      dropShadowColor: '#00ffff',
      dropShadowBlur: titleBlur,
      dropShadowDistance: 0,
      dropShadowAlpha: layout.isMobile ? 0.4 : 0.6
    });
    this.title.anchor.set(0.5);
    this.title.alpha = 0;  // Start invisible for fade-in
    this.title.zIndex = 10;
    this.container.addChild(this.title);

    const subtitleSize = getResponsiveFontSize(layout, 'subtitle');
    this.subtitle = createText('Kurt Edgar & Eirik sitt Galaga', {
      fontFamily: 'Courier New',
      fontSize: subtitleSize,
      fill: '#ff00ff',
      align: 'center'
    });
    this.subtitle.anchor.set(0.5);
    this.subtitle.alpha = 0;  // Start invisible
    this.container.addChild(this.subtitle);

    const storySize = getResponsiveFontSize(layout, 'body');
    const storyLineHeight = Math.round(storySize * 1.5);
    this.flavor = createText(
      'Stokmarknes er under angrep!\nRølp, gris og mongo invaderer.\nKun Eirik kan redde dagen.',
      {
        fontFamily: 'Courier New',
        fontSize: storySize,
        fill: '#ffffff',
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
        fontFamily: 'Courier New',
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

    this.startBtn = this.createButton('START SPILL', layout);
    this.startBtn.alpha = 0;  // Start invisible
    this.startBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        AudioManager.playSfx('ui_open');
        AudioManager.playMusicContext('gameplay', { resetForNewRun: true });
        this.game.showShipSelect();
      } catch (e) {
        console.error('[MenuScene] Start Game Error:', e);
      }
    });
    this.container.addChild(this.startBtn);

    this.highscoreBtn = this.createButton('HIGHSCORES', layout);
    this.highscoreBtn.alpha = 0;  // Start invisible
    this.highscoreBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        // Removed annoying ui_open sound - no audio needed for viewing leaderboard
        AudioManager.playMusicContext('scoreboard');
        this.game.showHighscores();
      } catch (e) {
        console.error('[MenuScene] Highscore Error:', e);
      }
    });
    this.container.addChild(this.highscoreBtn);

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
      fontFamily: 'Courier New',
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

    this.easter = createText('Burt Shooter // Arctic Arcade Build', {
      fontFamily: 'Courier New',
      fontSize: 10,
      fill: '#58717f'
    });
    this.easter.anchor.set(0.5);
    this.container.addChild(this.easter);

    // Mute/Music Toggle (Small corner button)
    this.musicBtn = this.createButton('MUSIKK: PÅ', layout);
    // Overwrite style for small button
    const scale = 0.6;
    this.musicBtn.scale.set(scale);
    this.musicBtn.on('pointerdown', () => {
      try {
        AudioManager.init();
        const enabled = AudioManager.toggleMute();
        const label = this.musicBtn._label;
        label.text = enabled ? 'MUSIKK: PÅ' : 'MUSIKK: AV';
        label.updateText?.(false);
      } catch (e) {
        console.error('[MenuScene] Music Toggle Error:', e);
      }
    });
    this.container.addChild(this.musicBtn);

    const stampFont = Math.max(10, getResponsiveFontSize(layout, 'small') - 2);
    this.buildStamp = createText(`build: ${BUILD_ID}`, {
      fontFamily: 'Courier New',
      fontSize: stampFont,
      fill: '#66fffe',
      align: 'right'
    });
    this.buildStamp.anchor.set(1, 1);
    this.container.addChild(this.buildStamp);
  }

  async initBeerDecorations() {
    try {
      const texture = await BeerAsset.ensureLoaded();

      const { width, height } = this.game.app.screen;

      // 1. HERO Beer (LEFT side - large, prominent, animated)
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
      this.heroBeer = hero;
      this.heroBaseY = hero.y;

      // 2. Secondary Hero Beer (RIGHT side)
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
      this.heroBeer2 = hero2;
      this.heroBaseY2 = hero2.y;

      // 3. Floating cluster (More cans, more variation)
      this.floatingBeers = [];
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
        this.floatingBeers.push(sprite);
      }

    } catch (e) {
      console.error('Menu beer decorations failed:', e);
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
    this.title.style.stroke = { color: '#0088ff', width: layout.isMobile ? 2 : 3 };
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
    const buttonHeight = layout.isMobile ? 36 : 40;
    const buttonSpacing = layout.isMobile ? 8 : 12;
    const sectionSpacing = layout.isMobile ? 12 : 20;

    // Measure actual text heights
    const titleHeight = this.title.height || titleSize * 1.2;
    const subtitleHeight = this.subtitle.height || subtitleSize * 1.2;
    const flavorHeight = this.flavor.height || (storySize * 3 * 1.5);
    const buttonsHeight = buttonHeight * 2 + buttonSpacing;
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

    this.settingsBtn.x = width / 2;
    this.settingsBtn.y = stack.getCurrentY();
    stack.addGap(buttonHeight + sectionSpacing);

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

    // Reposition beer cans
    if (this.leftBeer) {
      this.leftBeer.x = width * 0.15;
      this.leftBeer.y = height * 0.3;
    }
    if (this.rightBeer) {
      this.rightBeer.x = width * 0.85;
      this.rightBeer.y = height * 0.3;
    }

    // Reposition install button if exists
    if (this.installButton && this.installButton.visible) {
      this.installButton.x = width / 2;
      this.installButton.y = height - 100; // Adjusted to be above footer
    }
  }

  getControlsText(layout) {
    return layout.isMobile
      ? 'Joystick: Beveg | FIRE-knapp: Skyt'
      : 'WASD/Piler/Stick: Beveg | Space/A: Skyt | Shift/B: Dodge | P/Start: Pause';
  }

  getDisclaimerText(layout) {
    const objective = 'DEFEND STOKMARKNES // SURVIVE THE BOSS WAVES';
    return layout.isMobile ? objective : `${objective}\n${this.getControlsText(layout)}`;
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

    const btnWidth = layout?.isMobile ? 200 : 240;
    const btnHeight = layout?.isMobile ? 36 : 40;
    const fontSize = getResponsiveFontSize(layout || { isMobile: false }, 'button');

    const bg = new PIXI.Graphics();
    bg.rect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    bg.fill({ color: 0x0088ff, alpha: 0.3 });
    bg.stroke({ color: 0x00ffff, width: 2 });
    container.addChild(bg);

    const label = createText(text, {
      fontFamily: 'Courier New',
      fontSize: fontSize,
      fill: '#00ffff'
    });
    label.anchor.set(0.5);
    container.addChild(label);

    // Store dimensions for hover redraw
    container._btnWidth = btnWidth;
    container._btnHeight = btnHeight;
    container._bg = bg;
    container._label = label;

    container.on('pointerover', () => {
      bg.clear();
      bg.rect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
      bg.fill({ color: 0x00ffff, alpha: 0.5 });
      bg.stroke({ color: 0x00ffff, width: 2 });
      label.style.fill = '#ffffff';
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.rect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
      bg.fill({ color: 0x0088ff, alpha: 0.3 });
      bg.stroke({ color: 0x00ffff, width: 2 });
      label.style.fill = '#00ffff';
    });

    return container;
  }

  startAnimations() {
    // Staggered fade-in animations
    this.animateElement(this.title, 0, 0.5);
    this.animateElement(this.subtitle, 0.3, 0.5);
    this.animateElement(this.flavor, 0.6, 0.5);
    this.animateElement(this.startBtn, 0.9, 0.4);
    this.animateElement(this.highscoreBtn, 1.1, 0.4);
    this.animateElement(this.settingsBtn, 1.25, 0.4);
    this.animateElement(this.disclaimer, 1.4, 0.4);
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
          this.musicBtn._label.text = AudioManager.getSettings().musicEnabled ? 'MUSIKK: PÅ' : 'MUSIKK: AV';
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

    // Animate Hero Beers
    if (this.heroBeer) {
      this.heroBeer.y = this.heroBaseY + Math.sin(this.animationTime * 2) * 12;
      this.heroBeer.rotation = -0.15 + Math.sin(this.animationTime) * 0.12;
    }
    if (this.heroBeer2) {
      this.heroBeer2.y = this.heroBaseY2 + Math.sin(this.animationTime * 1.7) * 10;
      this.heroBeer2.rotation = 0.2 + Math.sin(this.animationTime * 1.3) * 0.1;
    }

    // Animate Floating Beers
    if (this.floatingBeers) {
      this.floatingBeers.forEach(beer => {
        beer.x += beer.driftSpeedX;
        beer.y += beer.driftSpeedY;
        beer.rotation += beer.rotSpeed;

        // Wrap around with respect to side columns
        if (beer.y < -50) beer.y = this.game.app.screen.height + 50;
        if (beer.y > this.game.app.screen.height + 50) beer.y = -50;

        // Horizontal constraint buffer
        if (beer.boundsX) {
          if (beer.x < beer.boundsX.min) beer.driftSpeedX = Math.abs(beer.driftSpeedX);
          if (beer.x > beer.boundsX.max) beer.driftSpeedX = -Math.abs(beer.driftSpeedX);
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
