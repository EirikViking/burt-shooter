import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BeerAsset } from '../utils/BeerAsset.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { AudioManager } from '../audio/AudioManager.js';
import { BUILD_ID } from '../buildInfo.js';
import { addResponsiveListener, getCurrentLayout } from '../ui/responsiveLayout.js';
import { createTextLayout, createVerticalStack, clampTextWidth, getResponsiveFontSize, calculateCenteredStartY } from '../ui/textLayout.js';
import { isMobile, isIOS, isStandalone } from '../utils/Mobile.js';
// PART A: Dynamic story rotation
import { tauntDirector } from '../game/TauntDirector.js';
import { TypewriterText } from '../utils/TypewriterText.js';

export class MenuScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.layoutUnsubscribe = null;
    this.title = null;
    this.subtitle = null;
    this.flavor = null;
    this.startBtn = null;
    this.highscoreBtn = null;
    this.musicBtn = null;
    this.controls = null;
    this.easter = null;
    this.stars = [];
    this.animationTime = 0;
    this.buildStamp = null;

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
    const text = new PIXI.Text(textStr, {
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
      const errText = new PIXI.Text('LOAD FAIL', { fill: 'red', fontSize: 24 });
      errText.anchor.set(0.5);
      errText.x = width / 2;
      errText.y = height / 2;
      errText.zIndex = 100;
      this.container.addChild(errText);
    }
  }

  createStarfield() {
    const { width, height } = this.game.app.screen;
    const starCount = 100;

    for (let i = 0; i < starCount; i++) {
      const star = new PIXI.Graphics();
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.5 + 0.3;
      star.circle(0, 0, size);
      star.fill({ color: 0xffffff, alpha });

      star.x = Math.random() * width;
      star.y = Math.random() * height;
      star.speedY = Math.random() * 0.3 + 0.1;
      star.twinkleSpeed = Math.random() * 0.02 + 0.01;
      star.twinkleOffset = Math.random() * Math.PI * 2;

      this.stars.push(star);
      this.container.addChild(star);
    }
  }

  createElements() {
    const { width, height } = this.game.app.screen;
    const responsiveLayout = getCurrentLayout();
    const layout = createTextLayout(width, height, responsiveLayout);

    const titleSize = getResponsiveFontSize(layout, 'title');
    const titleBlur = layout.isMobile ? 4 : 8;

    this.title = new PIXI.Text('BURT SHOOTER', {
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
    this.subtitle = new PIXI.Text('Kurt Edgar & Eirik sitt Galaga', {
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
    this.flavor = new PIXI.Text(
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
    this.container.addChild(this.flavor);

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

    // ... (controls and easter code unchanged) ...

    const controlsText = layout.isMobile
      ? 'Joystick: Beveg | FIRE-knapp: Skyt'
      : 'WASD/Piltaster: Beveg | SPACE: Skyt | SHIFT: Dodge';
    const controlsSize = getResponsiveFontSize(layout, 'small');
    this.controls = new PIXI.Text(controlsText, {
      fontFamily: 'Courier New',
      fontSize: controlsSize,
      fill: '#666666',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: clampTextWidth(width * 0.9, layout),
      lineHeight: Math.round(controlsSize * 1.4)
    });
    this.controls.anchor.set(0.5);
    this.container.addChild(this.controls);

    this.easter = new PIXI.Text('Powered by Kjøttdeig Engine v1.0', {
      fontFamily: 'Courier New',
      fontSize: 10,
      fill: '#333333'
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
    this.buildStamp = new PIXI.Text(`build: ${BUILD_ID}`, {
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
      hero.height = 180; // Much bigger!
      hero.scale.x = hero.scale.y; // Maintain aspect ratio
      hero.x = width * 0.12; // LEFT side, safe from text
      hero.y = height * 0.5;
      hero.rotation = -0.15;
      hero.zIndex = 0; // Behind UI
      hero.alpha = 0.85; // More visible
      this.container.addChild(hero);

      // Store for animation
      this.heroBeer = hero;
      this.heroBaseY = hero.y;

      // 2. Secondary Hero Beer (RIGHT side)
      const hero2 = new PIXI.Sprite(texture);
      hero2.anchor.set(0.5);
      hero2.height = 160;
      hero2.scale.x = hero2.scale.y;
      hero2.x = width * 0.88;
      hero2.y = height * 0.55;
      hero2.rotation = 0.2;
      hero2.zIndex = 0;
      hero2.alpha = 0.75;
      this.container.addChild(hero2);

      // Store for animation
      this.heroBeer2 = hero2;
      this.heroBaseY2 = hero2.y;

      // 3. Floating cluster (More cans, more variation)
      this.floatingBeers = [];
      for (let i = 0; i < 6; i++) {
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        const scale = 0.25 + Math.random() * 0.4; // Bigger range
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

        sprite.alpha = 0.5 + Math.random() * 0.35; // More visible
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

    // Update font sizes based on current layout
    const titleSize = getResponsiveFontSize(layout, 'title');
    const subtitleSize = getResponsiveFontSize(layout, 'subtitle');
    const storySize = getResponsiveFontSize(layout, 'body');
    const controlsSize = getResponsiveFontSize(layout, 'small');

    this.title.style.fontSize = titleSize;
    this.title.style.strokeThickness = layout.isMobile ? 2 : 3;
    this.subtitle.style.fontSize = subtitleSize;
    this.flavor.style.fontSize = storySize;
    this.flavor.style.lineHeight = Math.round(storySize * 1.5);
    this.flavor.style.wordWrapWidth = clampTextWidth(width * (layout.isMobile ? 0.9 : 0.7), layout);
    this.controls.style.fontSize = controlsSize;
    this.controls.style.wordWrapWidth = clampTextWidth(width * 0.9, layout);

    // Force text measurement update
    this.title.updateText?.(false);
    this.subtitle.updateText?.(false);
    this.flavor.updateText?.(false);
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

    // Spacing between sections: title->subtitle, subtitle->flavor, flavor->buttons
    const totalContentHeight = titleHeight + subtitleHeight + flavorHeight + buttonsHeight + sectionSpacing * 3;

    // Calculate starting Y for better vertical centering
    const footerReserve = layout.isMobile ? 70 : 60; // Space for controls and easter egg
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

    // Footer elements - position from bottom with safe margin
    const easterY = height - safeMargin.bottom - (layout.isMobile ? 8 : 12);
    const controlsY = easterY - (layout.isMobile ? 20 : 28);

    this.controls.x = width / 2;
    this.controls.y = controlsY;

    this.easter.x = width / 2;
    this.easter.y = easterY;

    // Position Music Btn (Top Right)
    this.musicBtn.x = width - 60;
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

  createButton(text, layout) {
    const container = new PIXI.Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const btnWidth = layout?.isMobile ? 200 : 240;
    const btnHeight = layout?.isMobile ? 36 : 40;
    const fontSize = getResponsiveFontSize(layout || { isMobile: false }, 'button');

    const bg = new PIXI.Graphics();
    bg.rect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    bg.fill({ color: 0x0088ff, alpha: 0.3 });
    bg.stroke({ color: 0x00ffff, width: 2 });
    container.addChild(bg);

    const label = new PIXI.Text(text, {
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
  }

  destroy() {
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
