import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BonusAsset } from '../utils/BonusAsset.js';
import {
  getSelectableShips,
  getDefaultShipKey,
  getShipUnlockLabel,
  getShipUnlockProgress,
  isShipUnlocked,
  isValidShipKey,
  resolveShipKey
} from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';
import { AudioManager } from '../audio/AudioManager.js';
import { createText } from '../utils/pixiText.js';
import { AssetManifest } from '../assets/assetManifest.js';

const STORAGE_KEY = 'burt.selectedShip.v1';
const DEBUG = false; // Set to true to enable debug logs

export class ShipSelectScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.ships = this.orderShips(getSelectableShips());
    this.selectedIndex = 0;
    this.shipCards = [];
    this.scrollY = 0;
    this.isDragging = false;
    this.lastPointerY = 0;
    this.statRanges = this.computeStatRanges(this.ships);
    this.baseOrder = [...new Set(this.ships.map(ship => ship.baseId).filter(Boolean))];
    this.unlockProgress = getShipUnlockProgress();

    // Load saved selection
    const saved = this.loadSelection();
    if (saved && isValidShipKey(saved) && isShipUnlocked(saved, this.unlockProgress)) {
      const resolvedSaved = resolveShipKey(saved);
      const index = this.ships.findIndex(s => s.spriteKey === resolvedSaved);
      if (index >= 0) this.selectedIndex = index;
    }

    // Set initial selection in state
    if (this.ships[this.selectedIndex]) {
      setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
    }
  }

  async create() {
    const { width, height } = { width: this.game.getWidth(), height: this.game.getHeight() };

    // Background
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, width, height);
    bg.fill({ color: 0x000000 });
    this.container.addChild(bg);

    await this.createHangarBackdrop(width, height);

    // Animated background layer
    this.bgAnimationContainer = new PIXI.Container();
    this.container.addChild(this.bgAnimationContainer);
    await BonusAsset.ensureLoaded();
    this.createAnimatedBackground(width, height);

    // Fixed header with enhanced styling
    const headerContainer = new PIXI.Container();
    const title = createText('SELECT YOUR SHIP', {
      fontFamily: 'Courier New',
      fontSize: 36,
      fill: '#00ff00',
      stroke: '#000000',
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: '#00ff00',
      dropShadowBlur: 8,
      dropShadowDistance: 0,
      fontWeight: 'bold'
    });
    title.anchor.set(0.5, 0);
    title.position.set(width / 2, 20);
    headerContainer.addChild(title);

    // Subtitle
    const subtitle = createText('Choose Your Combat Vessel', {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#888888',
      align: 'center'
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(width / 2, 60);
    headerContainer.addChild(subtitle);

    this.container.addChild(headerContainer);

    // Carousel container
    const carouselY = 95;
    const carouselHeight = height - 135;

    this.carouselContainer = new PIXI.Container();
    this.carouselContainer.y = carouselY + carouselHeight / 2; // Center vertically
    this.carouselContainer.x = width / 2; // Center horizontally
    this.container.addChild(this.carouselContainer);

    // Create ship carousel
    await this.createShipCarousel(width, carouselHeight);

    // Fixed footer
    const footerContainer = new PIXI.Container();
    const instructions = createText(
      '< / > SHIP  |  Q / E TIER JUMP  |  R RANDOM UNLOCKED  |  ENTER START',
      {
        fontFamily: 'Courier New',
        fontSize: 14,
        fill: '#cccccc',
        align: 'center'
      }
    );
    instructions.anchor.set(0.5, 1);
    instructions.position.set(width / 2, height - 15);
    footerContainer.addChild(instructions);
    this.container.addChild(footerContainer);

    this.selectionInfoText = createText('', {
      fontFamily: 'Courier New',
      fontSize: 13,
      fill: '#66ffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.selectionInfoText.anchor.set(0.5, 0);
    this.selectionInfoText.position.set(width / 2, 82);
    this.container.addChild(this.selectionInfoText);
    this.updateSelectionInfo();

    // Setup carousel navigation
    this.setupScrolling();

    // Update selection
    this.updateSelection();

    // Setup input
    this.setupInput();

    // Continuous animation ticker for glow effects
    this.selectionAnimTicker = () => {
      const centerShip = this.shipCards[this.selectedIndex];
      if (!centerShip || this.animating) return;

      const now = Date.now();
      const pulse = Math.sin(now * 0.004) * 0.5 + 0.5;

      // Animate center ship effects continuously
      if (centerShip.outerRing) {
        centerShip.outerRing.alpha = pulse * 0.35;
        centerShip.outerRing.scale.set(1 + pulse * 0.1);
      }

      if (centerShip.midRing) {
        centerShip.midRing.alpha = pulse * 0.2;
      }

      if (centerShip.innerGlow) {
        centerShip.innerGlow.alpha = pulse * 0.12;
      }

      if (centerShip.lightRays) {
        centerShip.lightRays.alpha = pulse * 0.5;
        centerShip.lightRays.rotation += 0.005;
        centerShip.lightRays.children.forEach((ray, idx) => {
          ray.alpha = (Math.sin(now * 0.003 + idx) * 0.5 + 0.5);
        });
      }

      // Holographic scan line continuous sweep
      if (centerShip.scanLine) {
        const scanProgress = ((now * 0.5) % 1000) / 1000;
        centerShip.scanLine.y = -130 + scanProgress * 160;
        centerShip.scanLine.alpha = (1 - Math.abs(scanProgress - 0.5) * 2) * 0.5;
      }

      // Update any lingering particles
      this.updateParticles(centerShip, now);
    };

    this.game.app.ticker.add(this.selectionAnimTicker);
  }

  async createHangarBackdrop(width, height) {
    if (!AssetManifest.generated.shipHangar) return;
    try {
      const texture = await PIXI.Assets.load(AssetManifest.generated.shipHangar);
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      const scale = Math.max(width / texture.width, height / texture.height);
      sprite.scale.set(scale);
      sprite.x = width / 2;
      sprite.y = height / 2;
      sprite.alpha = 0.72;
      this.container.addChild(sprite);

      const shade = new PIXI.Graphics();
      shade.rect(0, 0, width, height);
      shade.fill({ color: 0x020711, alpha: 0.54 });
      shade.rect(0, 0, width, 110);
      shade.fill({ color: 0x000000, alpha: 0.36 });
      shade.rect(0, height - 84, width, 84);
      shade.fill({ color: 0x000000, alpha: 0.42 });
      this.container.addChild(shade);
    } catch (error) {
      console.warn('[ShipSelect] Failed to load hangar backdrop', error);
    }
  }

  createAnimatedBackground(width, height) {
    // Starfield - drifting stars
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      const star = new PIXI.Graphics();
      const size = Math.random() * 2 + 1;
      star.circle(0, 0, size);
      star.fill({ color: 0xffffff, alpha: Math.random() * 0.5 + 0.3 });
      star.x = Math.random() * width;
      star.y = Math.random() * height;
      star.vx = (Math.random() - 0.5) * 0.3;
      star.vy = (Math.random() - 0.5) * 0.3;
      this.bgAnimationContainer.addChild(star);
      this.stars.push(star);
    }

    // Drifting bonus cores (subtle)
    this.bgBonusCores = [];
    const bonusTexture = BonusAsset.getTexture();
    if (bonusTexture && bonusTexture.width > 0) {
      for (let i = 0; i < 4; i++) {
        const core = new PIXI.Sprite(bonusTexture);
        core.anchor.set(0.5);
        core.scale.set(0.15 + Math.random() * 0.1);
        core.alpha = 0.2 + Math.random() * 0.15;
        core.x = Math.random() * width;
        core.y = Math.random() * height;
        core.vx = (Math.random() - 0.5) * 0.4;
        core.vy = (Math.random() - 0.5) * 0.4;
        core.rotation = Math.random() * Math.PI * 2;
        core.rotationSpeed = (Math.random() - 0.5) * 0.01;
        this.bgAnimationContainer.addChild(core);
        this.bgBonusCores.push(core);
      }
    }

    // Animation ticker
    this.bgAnimationTicker = (delta) => {
      // Animate stars
      this.stars.forEach(star => {
        star.x += star.vx * delta.deltaTime;
        star.y += star.vy * delta.deltaTime;

        // Wrap around
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;
      });

      // Animate bonus cores
      this.bgBonusCores.forEach(core => {
        core.x += core.vx * delta.deltaTime;
        core.y += core.vy * delta.deltaTime;
        core.rotation += core.rotationSpeed * delta.deltaTime;

        // Wrap around
        if (core.x < -50) core.x = width + 50;
        if (core.x > width + 50) core.x = -50;
        if (core.y < -50) core.y = height + 50;
        if (core.y > height + 50) core.y = -50;
      });
    };

    this.game.app.ticker.add(this.bgAnimationTicker);
  }

  async createShipCarousel(width, carouselHeight) {
    this.shipSpacing = 450; // Horizontal spacing between ships
    this.centerScale = 1.2; // Center ship is larger
    this.sideScale = 0.5;   // Side ships are smaller
    this.sideAlpha = 0.6;   // Side ships are dimmer
    this.animating = false;

    // Create ship display containers
    for (let i = 0; i < this.ships.length; i++) {
      const ship = this.ships[i];
      const shipContainer = await this.createCarouselShip(ship, i);
      this.shipCards.push(shipContainer);
      this.carouselContainer.addChild(shipContainer);
    }

    // Position all ships based on selected index
    this.updateCarouselPositions(false); // No animation on init
  }

  async createCarouselShip(ship, index) {
    const container = new PIXI.Container();
    container.shipIndex = index;
    const variant = ship.visuals?.variant || null;
    const locked = !isShipUnlocked(ship.spriteKey, this.unlockProgress);
    const accent = variant?.accent || 0x00ffff;
    const textAccent = this.getReadableAccent(variant);
    const glowColor = variant?.glow || variant?.tint || 0x00ff00;

    // DRAMATIC MULTI-LAYER GLOW SYSTEM
    const glowLayers = new PIXI.Container();

    // Outer pulse ring (large)
    const outerRing = new PIXI.Graphics();
    outerRing.circle(0, -50, 140);
    outerRing.stroke({ color: accent, width: 3, alpha: 0 });
    glowLayers.addChild(outerRing);
    container.outerRing = outerRing;

    // Mid glow ring
    const midRing = new PIXI.Graphics();
    midRing.circle(0, -50, 110);
    midRing.fill({ color: glowColor, alpha: 0 });
    glowLayers.addChild(midRing);
    container.midRing = midRing;

    // Inner intense glow
    const innerGlow = new PIXI.Graphics();
    innerGlow.circle(0, -50, 85);
    innerGlow.fill({ color: variant?.tint || 0xffffff, alpha: 0 });
    glowLayers.addChild(innerGlow);
    container.innerGlow = innerGlow;

    container.addChild(glowLayers);
    container.glowLayers = glowLayers;

    // Light rays container
    const lightRays = new PIXI.Container();
    lightRays.position.set(0, -50);
    for (let i = 0; i < 8; i++) {
      const ray = new PIXI.Graphics();
      const angle = (Math.PI * 2 * i) / 8;
      ray.moveTo(0, 0);
      ray.lineTo(Math.cos(angle) * 120, Math.sin(angle) * 120);
      ray.stroke({ color: accent, width: 2, alpha: 0 });
      lightRays.addChild(ray);
    }
    container.addChild(lightRays);
    container.lightRays = lightRays;

    // Ship sprite (large for better visibility)
    const shipTexture = GameAssets.getRankShipTexture(ship.textureIndex);
    if (shipTexture && shipTexture.width > 0) {
      const sprite = new PIXI.Sprite(shipTexture);
      sprite.anchor.set(0.5);
      sprite.position.set(0, -50);
      if (Number.isFinite(variant?.tint)) {
        sprite.tint = variant.tint;
      }

      const maxSize = 150; // Larger base size for center ship
      const scale = Math.min(maxSize / sprite.width, maxSize / sprite.height);
      sprite.scale.set(scale);

      container.addChild(sprite);
      container.sprite = sprite;
    }

    if (locked) {
      const lockPlate = new PIXI.Graphics();
      lockPlate.roundRect(-108, -158, 216, 216, 10);
      lockPlate.fill({ color: 0x020711, alpha: 0.62 });
      lockPlate.stroke({ color: 0xffcc00, width: 2, alpha: 0.7 });
      container.addChild(lockPlate);
      container.lockPlate = lockPlate;

      const lockText = createText('LOCKED', {
        fontFamily: 'Courier New',
        fontSize: 20,
        fill: '#ffcc00',
        align: 'center',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      });
      lockText.anchor.set(0.5);
      lockText.position.set(0, -50);
      container.addChild(lockText);
      container.lockText = lockText;
    }

    // Holographic scan line effect
    const scanLine = new PIXI.Graphics();
    scanLine.rect(-80, -50, 160, 3);
    scanLine.fill({ color: 0x00ffff, alpha: 0 });
    container.addChild(scanLine);
    container.scanLine = scanLine;

    // Particle container for selection effects
    container.particles = [];

    // Legacy glow for compatibility
    const glow = new PIXI.Graphics();
    glow.circle(0, -50, 100);
    glow.fill({ color: accent, alpha: 0 });
    container.addChild(glow);
    container.glowEffect = glow;

    // Ship name below sprite - LARGER and more readable
    const name = createText(ship.name, {
      fontFamily: 'Courier New',
      fontSize: 28,
      fill: this.toHexText(textAccent),
      align: 'center',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: this.toHexText(textAccent),
      dropShadowBlur: 6,
      dropShadowDistance: 0
    });
    name.anchor.set(0.5, 0);
    name.position.set(0, 65);
    container.addChild(name);
    container.nameText = name;

    // Ship description - BETTER spacing and size
    const teaser = this.getShortTeaser(ship.baseDescription || ship.description);
    const desc = createText(teaser, {
      fontFamily: 'Courier New',
      fontSize: 15,
      fill: '#cccccc',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 380,
      lineHeight: 20
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(0, 105);
    container.addChild(desc);
    container.descText = desc;

    const traitText = this.getShipTraitText(ship);
    const trait = createText(traitText, {
      fontFamily: 'Courier New',
      fontSize: 13,
      fill: this.toHexText(textAccent),
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 620,
      lineHeight: 17,
      stroke: '#000000',
      strokeThickness: 2
    });
    trait.anchor.set(0.5, 0);
    trait.position.set(0, 130);
    container.addChild(trait);
    container.traitText = trait;

    // Stats - CLEARER and larger
    const statsText = this.getShipStats(ship);
    const stats = createText(statsText, {
      fontFamily: 'Courier New',
      fontSize: 12,
      fill: '#00ff00',
      align: 'center',
      lineHeight: 14,
      stroke: '#000000',
      strokeThickness: 2
    });
    stats.anchor.set(0.5, 0);
    stats.position.set(0, 168);
    container.addChild(stats);
    container.statsText = stats;

    container.shipData = ship;
    container.locked = locked;
    return container;
  }

  toHexText(value) {
    if (!Number.isFinite(value)) return '#00ff00';
    return `#${(value >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
  }

  getReadableAccent(variant) {
    const candidates = [variant?.accent, variant?.glow, variant?.tint, 0x00ffcc];
    return candidates.find(value => Number.isFinite(value) && this.getColorLuma(value) >= 95) || 0x00ffcc;
  }

  getColorLuma(value) {
    if (!Number.isFinite(value)) return 255;
    const r = (value >> 16) & 0xff;
    const g = (value >> 8) & 0xff;
    const b = value & 0xff;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  updateCarouselPositions(animate = true) {
    const duration = animate ? 500 : 0; // Longer animation for more drama

    this.shipCards.forEach((shipContainer, i) => {
      const offset = i - this.selectedIndex;
      const targetX = offset * this.shipSpacing;
      const isCenter = (i === this.selectedIndex);
      const targetScale = isCenter ? this.centerScale : this.sideScale;
      const targetAlpha = isCenter ? (shipContainer.locked ? 0.82 : 1.0) : (shipContainer.locked ? 0.34 : this.sideAlpha);

      // More dramatic tilt for side ships
      const targetRotation = isCenter ? 0 : (offset < 0 ? -0.15 : 0.15);

      if (duration > 0 && !this.animating) {
        // DRAMATIC animation with elastic bounce
        this.animating = true;
        const startX = shipContainer.x;
        const startScale = shipContainer.scale.x;
        const startAlpha = shipContainer.alpha;
        const startRotation = shipContainer.rotation;
        const startTime = Date.now();

        // Trigger particle burst for newly selected ship
        if (isCenter && animate) {
          this.createSelectionParticles(shipContainer);
          // Whoosh sound effect
          AudioManager.playSfx('forceField', { volume: 0.3, force: false });
        }

        const animateFrame = () => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(1, elapsed / duration);

          // ELASTIC EASING for more bounce
          const eased = t < 0.5
            ? 0.5 * Math.pow(2 * t, 3)
            : 1 - 0.5 * Math.pow(-2 * t + 2, 3);

          // Add overshoot for center ship selection
          const bounceT = isCenter && t > 0.7
            ? t + Math.sin((t - 0.7) * Math.PI * 4) * 0.03 * (1 - t)
            : t;

          shipContainer.x = startX + (targetX - startX) * eased;
          shipContainer.scale.set(startScale + (targetScale - startScale) * bounceT);
          shipContainer.alpha = startAlpha + (targetAlpha - startAlpha) * eased;
          shipContainer.rotation = startRotation + (targetRotation - startRotation) * eased;

          // DRAMATIC multi-layer glow animation
          if (isCenter) {
            const pulse = Math.sin(elapsed * 0.008) * 0.5 + 0.5;

            // Outer ring pulse
            if (shipContainer.outerRing) {
              shipContainer.outerRing.alpha = pulse * 0.4 * eased;
              shipContainer.outerRing.scale.set(1 + pulse * 0.15);
            }

            // Mid ring glow
            if (shipContainer.midRing) {
              shipContainer.midRing.alpha = pulse * 0.25 * eased;
            }

            // Inner bright core
            if (shipContainer.innerGlow) {
              shipContainer.innerGlow.alpha = pulse * 0.15 * eased;
            }

            // Light rays rotation
            if (shipContainer.lightRays) {
              shipContainer.lightRays.alpha = pulse * 0.6 * eased;
              shipContainer.lightRays.rotation += 0.02;
              shipContainer.lightRays.children.forEach((ray, idx) => {
                ray.alpha = (Math.sin(elapsed * 0.01 + idx) * 0.5 + 0.5) * eased;
              });
            }

            // Holographic scan line sweep
            if (shipContainer.scanLine) {
              const scanProgress = (elapsed % 1000) / 1000;
              shipContainer.scanLine.y = -130 + scanProgress * 160;
              shipContainer.scanLine.alpha = (1 - Math.abs(scanProgress - 0.5) * 2) * 0.6 * eased;
            }

            // Legacy glow
            if (shipContainer.glowEffect) {
              shipContainer.glowEffect.alpha = pulse * 0.2 * eased;
            }
          } else {
            // Hide all effects for non-center ships
            if (shipContainer.outerRing) shipContainer.outerRing.alpha = 0;
            if (shipContainer.midRing) shipContainer.midRing.alpha = 0;
            if (shipContainer.innerGlow) shipContainer.innerGlow.alpha = 0;
            if (shipContainer.lightRays) shipContainer.lightRays.alpha = 0;
            if (shipContainer.scanLine) shipContainer.scanLine.alpha = 0;
            if (shipContainer.glowEffect) shipContainer.glowEffect.alpha = 0;
          }

          // Animate particles
          this.updateParticles(shipContainer, elapsed);

          if (t < 1) {
            requestAnimationFrame(animateFrame);
          } else {
            this.animating = false;
            this.updateButtons(); // Update buttons after animation
          }
        };
        animateFrame();
      } else {
        // Immediate positioning
        shipContainer.x = targetX;
        shipContainer.scale.set(targetScale);
        shipContainer.alpha = targetAlpha;
        shipContainer.rotation = targetRotation;

        // Immediate glow state - hide all effects for non-center
        if (shipContainer.outerRing) shipContainer.outerRing.alpha = 0;
        if (shipContainer.midRing) shipContainer.midRing.alpha = 0;
        if (shipContainer.innerGlow) shipContainer.innerGlow.alpha = 0;
        if (shipContainer.lightRays) shipContainer.lightRays.alpha = 0;
        if (shipContainer.scanLine) shipContainer.scanLine.alpha = 0;
        if (shipContainer.glowEffect) shipContainer.glowEffect.alpha = isCenter ? 0.15 : 0;
      }

      // Hide/show text based on whether it's center
      if (shipContainer.nameText) shipContainer.nameText.visible = isCenter;
      if (shipContainer.descText) shipContainer.descText.visible = isCenter;
      if (shipContainer.traitText) shipContainer.traitText.visible = isCenter;
      if (shipContainer.statsText) shipContainer.statsText.visible = isCenter;
      if (shipContainer.lockPlate) shipContainer.lockPlate.visible = isCenter;
      if (shipContainer.lockText) shipContainer.lockText.visible = isCenter;
    });

    if (!animate) {
      this.updateButtons();
    }
  }

  updateButtons() {
    // Remove old buttons if they exist
    if (this.detailsButton) {
      this.container.removeChild(this.detailsButton);
      this.detailsButton = null;
    }
    if (this.startButton) {
      this.container.removeChild(this.startButton);
      this.startButton = null;
    }
    if (this.randomButton) {
      this.container.removeChild(this.randomButton);
      this.randomButton = null;
    }

    // Create buttons for center ship
    const ship = this.ships[this.selectedIndex];
    const locked = ship ? !isShipUnlocked(ship.spriteKey, this.unlockProgress) : true;
    const { width, height } = { width: this.game.getWidth(), height: this.game.getHeight() };
    const buttonY = height - 80;
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonSpacing = 20;
    const randomWidth = 112;

    this.detailsButton = this.createButton(
      'DETAILS',
      (width - buttonWidth * 2 - buttonSpacing) / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x333333,
      0x00ff00,
      () => {
        const spriteKey = ship.spriteKey;
        setSelectedShipKey(spriteKey);
        this.saveSelection(spriteKey);
        if (DEBUG) console.log('[ShipSelect] Opening details for:', spriteKey);
        this.game.showShipDetails(spriteKey);
      }
    );
    this.container.addChild(this.detailsButton);

    this.startButton = this.createButton(
      locked ? 'LOCKED' : 'START',
      (width - buttonWidth * 2 - buttonSpacing) / 2 + buttonWidth + buttonSpacing,
      buttonY,
      buttonWidth,
      buttonHeight,
      locked ? 0x2a2134 : 0x00ff00,
      locked ? 0xffcc00 : 0x000000,
      () => {
        if (locked) {
          AudioManager.playSfx('ship_lock_chime', { force: true, volume: 0.7 });
          this.updateSelectionInfo();
          return;
        }
        const spriteKey = ship.spriteKey;
        setSelectedShipKey(spriteKey);
        this.saveSelection(spriteKey);

        // Confirm sound for starting game
        AudioManager.playSfx('ship_lock_chime', { force: true, volume: 0.8 });

        if (DEBUG) console.log('[ShipSelect] Starting game with:', spriteKey);
        this.game.startGame(spriteKey);
      }
    );
    this.container.addChild(this.startButton);

    this.randomButton = this.createButton(
      'RANDOM',
      width - randomWidth - 28,
      height - 53,
      randomWidth,
      30,
      0x101a33,
      0x66ffff,
      () => this.navigateRandom()
    );
    this.container.addChild(this.randomButton);
    this.updateSelectionInfo();
  }

  createSelectionParticles(shipContainer) {
    // Create burst of particles when ship is selected
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.2;
      const speed = 2 + Math.random() * 3;
      const size = 2 + Math.random() * 3;

      const particle = new PIXI.Graphics();
      particle.circle(0, 0, size);
      particle.fill({ color: i % 3 === 0 ? 0x00ffff : 0x00ff00, alpha: 0.8 });

      particle.x = 0;
      particle.y = -50;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 1.0; // Fade out over time
      particle.maxLife = 0.6 + Math.random() * 0.4;

      shipContainer.addChild(particle);
      if (!shipContainer.particles) shipContainer.particles = [];
      shipContainer.particles.push(particle);
    }
  }

  updateParticles(shipContainer, elapsed) {
    if (!shipContainer.particles) return;

    shipContainer.particles.forEach((particle, idx) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 0.02;
      particle.alpha = Math.max(0, particle.life / particle.maxLife);

      if (particle.life <= 0) {
        shipContainer.removeChild(particle);
        shipContainer.particles[idx] = null;
      }
    });

    // Clean up dead particles
    shipContainer.particles = shipContainer.particles.filter(p => p !== null);
  }

  navigateTo(newIndex) {
    if (newIndex < 0 || newIndex >= this.ships.length || this.animating) return;
    this.selectedIndex = newIndex;
    setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);

    // More dramatic navigation sound
    AudioManager.playSfx('thrusterFire', { volume: 0.25 });

    this.updateCarouselPositions(true);
    this.updateSelectionInfo();
  }

  navigateLeft() {
    const next = (this.selectedIndex - 1 + this.ships.length) % this.ships.length;
    this.navigateTo(next);
  }

  navigateRight() {
    const next = (this.selectedIndex + 1) % this.ships.length;
    this.navigateTo(next);
  }

  navigateModel(delta) {
    if (this.animating || this.ships.length <= 1) return;
    const jump = 5;
    const next = (this.selectedIndex + delta * jump + this.ships.length) % this.ships.length;
    this.navigateTo(next);
  }

  navigateRandom() {
    if (this.animating || this.ships.length <= 1) return;
    let next = this.selectedIndex;
    const unlocked = this.ships.filter(ship => isShipUnlocked(ship.spriteKey, this.unlockProgress));
    const pool = unlocked.length ? unlocked : this.ships;
    for (let tries = 0; tries < 5 && next === this.selectedIndex; tries += 1) {
      next = this.ships.indexOf(pool[Math.floor(Math.random() * pool.length)]);
    }
    this.navigateTo(next === this.selectedIndex ? (next + 1) % this.ships.length : next);
  }

  updateSelectionInfo() {
    if (!this.selectionInfoText) return;
    const ship = this.ships[this.selectedIndex];
    const modelIndex = Math.max(0, this.baseOrder.indexOf(ship?.baseId)) + 1;
    const modelTotal = Math.max(1, this.baseOrder.length);
    const status = ship && isShipUnlocked(ship.spriteKey, this.unlockProgress) ? 'READY' : getShipUnlockLabel(ship?.spriteKey);
    this.selectionInfoText.text = `SHIP ${this.selectedIndex + 1}/${this.ships.length}  |  TIER ${modelIndex}/${modelTotal}  |  ${status}`;
  }

  createButton(label, x, y, width, height, bgColor, textColor, onClick) {
    const button = new PIXI.Container();
    button.position.set(x, y);
    button.eventMode = 'static';
    button.cursor = 'pointer';

    // Background with glow
    const bgGlow = new PIXI.Graphics();
    bgGlow.rect(-2, -2, width + 4, height + 4);
    bgGlow.fill({ color: 0x00ff00, alpha: 0 });
    button.addChild(bgGlow);
    button.bgGlow = bgGlow;

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, width, height);
    bg.fill({ color: bgColor });
    bg.stroke({ color: 0x00ff00, width: 2 });
    button.addChild(bg);
    button.bg = bg;

    const text = createText(label, {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: textColor,
      fontWeight: 'bold'
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    button.addChild(text);
    button.text = text;

    button.on('pointerdown', (e) => {
      e.stopPropagation();
      if (!this.isDragging) {
        // Button press effect
        button.scale.set(0.95);
        setTimeout(() => button.scale.set(1), 100);
        AudioManager.playSfx('powerup', { force: true, volume: 0.4 });
        onClick();
      }
    });

    button.on('pointerover', () => {
      // Dramatic hover effect
      bg.clear();
      bg.rect(0, 0, width, height);
      bg.fill({ color: label === 'START' ? 0x00ffff : bgColor, alpha: 0.9 });
      bg.stroke({ color: 0xffffff, width: 3 });

      bgGlow.alpha = 0.3;
      button.scale.set(1.05);

      // Hover sound
      AudioManager.playSfx('thrusterFire', { volume: 0.1 });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.rect(0, 0, width, height);
      bg.fill({ color: bgColor });
      bg.stroke({ color: 0x00ff00, width: 2 });

      bgGlow.alpha = 0;
      button.scale.set(1);
    });

    return button;
  }

  setupScrolling() {
    // Wheel navigation - scroll one ship at a time
    this.wheelHandler = (e) => {
      e.preventDefault();
      if (this.animating) return;

      if (e.deltaY > 0) {
        this.navigateRight();
      } else if (e.deltaY < 0) {
        this.navigateLeft();
      }
    };

    // Horizontal drag navigation
    this.carouselContainer.eventMode = 'static';
    this.dragStartX = 0;
    this.dragThreshold = 50; // Minimum drag distance to trigger navigation

    this.carouselContainer.on('pointerdown', (e) => {
      this.isDragging = false;
      this.dragStartX = e.global.x;
      this.dragStartIndex = this.selectedIndex;
    });

    this.carouselContainer.on('pointermove', (e) => {
      if (this.dragStartX !== undefined) {
        const deltaX = e.global.x - this.dragStartX;
        if (Math.abs(deltaX) > 10) {
          this.isDragging = true;
        }
      }
    });

    this.carouselContainer.on('pointerup', (e) => {
      if (this.dragStartX !== undefined) {
        const deltaX = e.global.x - this.dragStartX;

        // Navigate based on drag direction
        if (Math.abs(deltaX) > this.dragThreshold) {
          if (deltaX > 0) {
            // Dragged right, go to previous ship (left)
            this.navigateLeft();
          } else {
            // Dragged left, go to next ship (right)
            this.navigateRight();
          }
        }
      }

      this.dragStartX = undefined;
      setTimeout(() => {
        this.isDragging = false;
      }, 100);
    });

    this.carouselContainer.on('pointerupoutside', () => {
      this.dragStartX = undefined;
      setTimeout(() => {
        this.isDragging = false;
      }, 100);
    });

    // Add wheel listener to canvas
    const canvas = this.game.app.canvas || this.game.app.view;
    if (canvas) {
      canvas.addEventListener('wheel', this.wheelHandler, { passive: false });
    } else {
      window.addEventListener('wheel', this.wheelHandler, { passive: false });
    }
  }

  getShortTeaser(description) {
    if (description.length <= 40) return description;
    const truncated = description.substring(0, 40);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  getShipStats(ship) {
    const stats = ship?.stats || { speed: 6, fireRate: 150, damage: 1 };
    const ranges = this.statRanges || this.computeStatRanges(this.ships);
    const segments = 5;
    const barChar = '#';
    const emptyChar = '-';
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const makeBar = (value) => {
      const filled = Math.max(1, Math.min(segments, Math.round(value * segments)));
      return barChar.repeat(filled) + emptyChar.repeat(segments - filled);
    };

    const speedNorm = ranges.speed.max > ranges.speed.min
      ? (stats.speed - ranges.speed.min) / (ranges.speed.max - ranges.speed.min)
      : 0.5;
    const damageNorm = ranges.damage.max > ranges.damage.min
      ? (stats.damage - ranges.damage.min) / (ranges.damage.max - ranges.damage.min)
      : 0.5;
    const fireRateNorm = ranges.fireRate.max > ranges.fireRate.min
      ? (ranges.fireRate.max - stats.fireRate) / (ranges.fireRate.max - ranges.fireRate.min)
      : 0.5;

    const speedBar = makeBar(clamp01(speedNorm));
    const damageBar = makeBar(clamp01(damageNorm));
    const fireRateBar = makeBar(clamp01(fireRateNorm));
    return `DMG: ${damageBar}
SPD: ${speedBar}
FIR: ${fireRateBar}`;
  }

  getShipTraitText(ship) {
    const trait = ship?.trait || ship?.visuals?.trait;
    if (!trait?.label) return 'TRAIT: BALANCED TUNE';
    const effectTags = this.getTraitEffectTags(trait);
    return `TRAIT: ${trait.label} - ${trait.description || 'Balanced arcade handling.'}${effectTags ? ` | ${effectTags}` : ''}`;
  }

  getTraitEffectTags(trait) {
    const combat = trait?.effects?.combat || {};
    const tags = [];
    if (combat.critEvery) tags.push(`OVERCHARGE/${combat.critEvery}`);
    if (combat.wingShotEvery) tags.push(`WING/${combat.wingShotEvery}`);
    if (combat.bonusShotEvery) tags.push(`BONUS/${combat.bonusShotEvery}`);
    if (combat.pierceEvery) tags.push(`PIERCE/${combat.pierceEvery}`);
    if (combat.dodgePulseRadius) tags.push(`DODGE PULSE`);
    if (combat.nearMissScoreMult && combat.nearMissScoreMult !== 1) tags.push(`NEAR x${combat.nearMissScoreMult}`);
    return tags.slice(0, 3).join(' ');
  }

  computeStatRanges(ships) {
    const list = Array.isArray(ships) ? ships : [];
    const defaults = { speed: 6, fireRate: 150, damage: 1 };
    const values = {
      speed: list.map(s => Number(s?.stats?.speed ?? defaults.speed)).filter(Number.isFinite),
      fireRate: list.map(s => Number(s?.stats?.fireRate ?? defaults.fireRate)).filter(Number.isFinite),
      damage: list.map(s => Number(s?.stats?.damage ?? defaults.damage)).filter(Number.isFinite)
    };
    const range = (arr, fallback) => {
      if (!arr.length) return { min: fallback, max: fallback };
      return { min: Math.min(...arr), max: Math.max(...arr) };
    };
    return {
      speed: range(values.speed, defaults.speed),
      fireRate: range(values.fireRate, defaults.fireRate),
      damage: range(values.damage, defaults.damage)
    };
  }

  orderShips(ships) {
    const list = Array.isArray(ships) ? [...ships] : [];
    return list.sort((a, b) => {
      const textureDelta = (a.textureIndex ?? 0) - (b.textureIndex ?? 0);
      if (textureDelta !== 0) return textureDelta;
      const variantDelta = (a.variantIndex ?? 0) - (b.variantIndex ?? 0);
      if (variantDelta !== 0) return variantDelta;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  updateSelection() {
    // Carousel handles selection visually via position/scale/alpha
    // Just ensure the selection state is saved
    setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
  }

  setupInput() {
    console.log('[ShipSelectInput] attached');
    this.keyHandler = (e) => {
      // Log first key press for debug
      if (DEBUG) console.log(`[ShipSelectInput] key=${e.key} code=${e.code}`);

      if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.navigateLeft();
      } else if (e.key === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.navigateRight();
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        this.navigateModel(-1);
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        this.navigateModel(1);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        this.navigateRandom();
      } else if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        // Start game with selected ship
        const ship = this.ships[this.selectedIndex];
        if (!isShipUnlocked(ship.spriteKey, this.unlockProgress)) {
          AudioManager.playSfx('ship_lock_chime', { force: true, volume: 0.7 });
          this.updateSelectionInfo();
          return;
        }
        setSelectedShipKey(ship.spriteKey);
        this.saveSelection(ship.spriteKey);
        this.game.startGame(ship.spriteKey);
      }
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  saveSelection(spriteKey) {
    try {
      localStorage.setItem(STORAGE_KEY, spriteKey);
    } catch (e) {
      console.warn('[ShipSelect] Failed to save selection:', e);
    }
  }

  loadSelection() {
    try {
      return localStorage.getItem(STORAGE_KEY) || getDefaultShipKey();
    } catch (e) {
      console.warn('[ShipSelect] Failed to load selection:', e);
      return getDefaultShipKey();
    }
  }

  cleanup() {
    console.log('[ShipSelectInput] detached');
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    if (this.wheelHandler) {
      window.removeEventListener('wheel', this.wheelHandler);
      const canvas = this.game.app.canvas || this.game.app.view;
      if (canvas) canvas.removeEventListener('wheel', this.wheelHandler);
    }
    // Clean up background animation ticker
    if (this.bgAnimationTicker) {
      this.game.app.ticker.remove(this.bgAnimationTicker);
      this.bgAnimationTicker = null;
    }
    // Clean up selection animation ticker
    if (this.selectionAnimTicker) {
      this.game.app.ticker.remove(this.selectionAnimTicker);
      this.selectionAnimTicker = null;
    }
  }

  destroy() {
    this.cleanup();
  }

  init() {
    // Called when scene is shown
  }

  getContainer() {
    return this.container;
  }
}
