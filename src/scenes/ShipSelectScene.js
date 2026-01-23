import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BeerAsset } from '../utils/BeerAsset.js';
import { getSelectableShips, getDefaultShipKey, isValidShipKey } from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';
import { AudioManager } from '../audio/AudioManager.js';
import { onLanguageChange, t } from '../i18n/index.ts';

const STORAGE_KEY = 'burt.selectedShip.v1';
const DEBUG = false; // Set to true to enable debug logs

export class ShipSelectScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.ships = this.shuffleShips(getSelectableShips());
    this.selectedIndex = 0;
    this.shipCards = [];
    this.scrollY = 0;
    this.isDragging = false;
    this.lastPointerY = 0;
    this.statRanges = this.computeStatRanges(this.ships);
    this.langUnsubscribe = null;
    this.titleText = null;
    this.subtitleText = null;
    this.instructionsText = null;

    // Load saved selection
    const saved = this.loadSelection();
    if (saved && isValidShipKey(saved)) {
      const index = this.ships.findIndex(s => s.spriteKey === saved);
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

    // Animated background layer
    this.bgAnimationContainer = new PIXI.Container();
    this.container.addChild(this.bgAnimationContainer);
    this.createAnimatedBackground(width, height);

    // Fixed header with enhanced styling
    const headerContainer = new PIXI.Container();
    this.titleText = new PIXI.Text(t('shipselect.title'), {
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
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(width / 2, 20);
    headerContainer.addChild(this.titleText);

    // Subtitle
    this.subtitleText = new PIXI.Text(t('shipselect.subtitle'), {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#888888',
      align: 'center'
    });
    this.subtitleText.anchor.set(0.5, 0);
    this.subtitleText.position.set(width / 2, 60);
    headerContainer.addChild(this.subtitleText);

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
    this.instructionsText = new PIXI.Text(
      t('shipselect.instructions'),
      {
        fontFamily: 'Courier New',
        fontSize: 14,
        fill: '#cccccc',
        align: 'center'
      }
    );
    this.instructionsText.anchor.set(0.5, 1);
    this.instructionsText.position.set(width / 2, height - 15);
    footerContainer.addChild(this.instructionsText);
    this.container.addChild(footerContainer);

    // Setup carousel navigation
    this.setupScrolling();

    // Update selection
    this.updateSelection();

    // Setup input
    this.setupInput();

    this.applyLanguage();
    this.langUnsubscribe = onLanguageChange(() => this.applyLanguage());

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

    // Drifting beer cans (subtle)
    this.bgBeerCans = [];
    const beerTexture = BeerAsset.getTexture();
    if (beerTexture && beerTexture.width > 0) {
      for (let i = 0; i < 4; i++) {
        const beer = new PIXI.Sprite(beerTexture);
        beer.anchor.set(0.5);
        beer.scale.set(0.15 + Math.random() * 0.1);
        beer.alpha = 0.2 + Math.random() * 0.15;
        beer.x = Math.random() * width;
        beer.y = Math.random() * height;
        beer.vx = (Math.random() - 0.5) * 0.4;
        beer.vy = (Math.random() - 0.5) * 0.4;
        beer.rotation = Math.random() * Math.PI * 2;
        beer.rotationSpeed = (Math.random() - 0.5) * 0.01;
        this.bgAnimationContainer.addChild(beer);
        this.bgBeerCans.push(beer);
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

      // Animate beer cans
      this.bgBeerCans.forEach(beer => {
        beer.x += beer.vx * delta.deltaTime;
        beer.y += beer.vy * delta.deltaTime;
        beer.rotation += beer.rotationSpeed * delta.deltaTime;

        // Wrap around
        if (beer.x < -50) beer.x = width + 50;
        if (beer.x > width + 50) beer.x = -50;
        if (beer.y < -50) beer.y = height + 50;
        if (beer.y > height + 50) beer.y = -50;
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

    // DRAMATIC MULTI-LAYER GLOW SYSTEM
    const glowLayers = new PIXI.Container();

    // Outer pulse ring (large)
    const outerRing = new PIXI.Graphics();
    outerRing.circle(0, -50, 140);
    outerRing.stroke({ color: 0x00ffff, width: 3, alpha: 0 });
    glowLayers.addChild(outerRing);
    container.outerRing = outerRing;

    // Mid glow ring
    const midRing = new PIXI.Graphics();
    midRing.circle(0, -50, 110);
    midRing.fill({ color: 0x00ff00, alpha: 0 });
    glowLayers.addChild(midRing);
    container.midRing = midRing;

    // Inner intense glow
    const innerGlow = new PIXI.Graphics();
    innerGlow.circle(0, -50, 85);
    innerGlow.fill({ color: 0xffffff, alpha: 0 });
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
      ray.stroke({ color: 0x00ff00, width: 2, alpha: 0 });
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

      const maxSize = 150; // Larger base size for center ship
      const scale = Math.min(maxSize / sprite.width, maxSize / sprite.height);
      sprite.scale.set(scale);

      container.addChild(sprite);
      container.sprite = sprite;
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
    glow.fill({ color: 0x00ff00, alpha: 0 });
    container.addChild(glow);
    container.glowEffect = glow;

    // Ship name below sprite - LARGER and more readable
    const name = new PIXI.Text(ship.name, {
      fontFamily: 'Courier New',
      fontSize: 28,
      fill: '#00ff00',
      align: 'center',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: '#00ff00',
      dropShadowBlur: 6,
      dropShadowDistance: 0
    });
    name.anchor.set(0.5, 0);
    name.position.set(0, 65);
    container.addChild(name);
    container.nameText = name;

    // Ship description - BETTER spacing and size
    const teaser = this.getShortTeaser(ship.description);
    const desc = new PIXI.Text(teaser, {
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

    // Stats - CLEARER and larger
    const statsText = this.getShipStats(ship);
    const stats = new PIXI.Text(statsText, {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#00ff00',
      align: 'center',
      lineHeight: 18,
      stroke: '#000000',
      strokeThickness: 2
    });
    stats.anchor.set(0.5, 0);
    stats.position.set(0, 150);
    container.addChild(stats);
    container.statsText = stats;

    container.shipData = ship;
    return container;
  }

  updateCarouselPositions(animate = true) {
    const duration = animate ? 500 : 0; // Longer animation for more drama

    this.shipCards.forEach((shipContainer, i) => {
      const offset = i - this.selectedIndex;
      const targetX = offset * this.shipSpacing;
      const isCenter = (i === this.selectedIndex);
      const targetScale = isCenter ? this.centerScale : this.sideScale;
      const targetAlpha = isCenter ? 1.0 : this.sideAlpha;

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
      if (shipContainer.statsText) shipContainer.statsText.visible = isCenter;
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

    // Create buttons for center ship
    const ship = this.ships[this.selectedIndex];
    const { width, height } = { width: this.game.getWidth(), height: this.game.getHeight() };
    const buttonY = height - 80;
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonSpacing = 20;

    this.detailsButton = this.createButton(
      t('shipselect.button.details'),
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
      t('shipselect.button.start'),
      (width - buttonWidth * 2 - buttonSpacing) / 2 + buttonWidth + buttonSpacing,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x00ff00,
      0x000000,
      () => {
        const spriteKey = ship.spriteKey;
        setSelectedShipKey(spriteKey);
        this.saveSelection(spriteKey);

        // Confirm sound for starting game
        AudioManager.playSfx('powerup', { force: true, volume: 0.8 });

        if (DEBUG) console.log('[ShipSelect] Starting game with:', spriteKey);
        this.game.startGame(spriteKey);
      },
      true
    );
    this.container.addChild(this.startButton);
  }

  applyLanguage() {
    if (this.titleText) this.titleText.text = t('shipselect.title');
    if (this.subtitleText) this.subtitleText.text = t('shipselect.subtitle');
    if (this.instructionsText) this.instructionsText.text = t('shipselect.instructions');
    if (this.detailsButton?.text) this.detailsButton.text.text = t('shipselect.button.details');
    if (this.startButton?.text) this.startButton.text.text = t('shipselect.button.start');
    this.shipCards.forEach((shipContainer) => {
      if (shipContainer.statsText && shipContainer.shipData) {
        shipContainer.statsText.text = this.getShipStats(shipContainer.shipData);
      }
    });
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
  }

  navigateLeft() {
    if (this.selectedIndex > 0) {
      this.navigateTo(this.selectedIndex - 1);
    }
  }

  navigateRight() {
    if (this.selectedIndex < this.ships.length - 1) {
      this.navigateTo(this.selectedIndex + 1);
    }
  }

  createButton(label, x, y, width, height, bgColor, textColor, onClick, isPrimary = false) {
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

    const text = new PIXI.Text(label, {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: textColor,
      fontWeight: 'bold'
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    button.addChild(text);
    button.text = text;
    button.isPrimary = isPrimary;

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
      bg.fill({ color: button.isPrimary ? 0x00ffff : bgColor, alpha: 0.9 });
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
    const barChar = '█';
    const emptyChar = '░';
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
    return `${t('shipselect.stats.damage')}: ${damageBar}
${t('shipselect.stats.speed')}: ${speedBar}
${t('shipselect.stats.fireRate')}: ${fireRateBar}`;
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

  shuffleShips(ships) {
    const list = Array.isArray(ships) ? [...ships] : [];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
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
      } else if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        // Start game with selected ship
        const ship = this.ships[this.selectedIndex];
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
    if (this.langUnsubscribe) {
      this.langUnsubscribe();
      this.langUnsubscribe = null;
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
