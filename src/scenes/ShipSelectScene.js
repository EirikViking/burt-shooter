import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BeerAsset } from '../utils/BeerAsset.js';
import { getSelectableShips, getDefaultShipKey, isValidShipKey } from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';
import { AudioManager } from '../audio/AudioManager.js';

const STORAGE_KEY = 'burt.selectedShip.v1';
const DEBUG = false; // Set to true to enable debug logs

export class ShipSelectScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.ships = getSelectableShips();
    this.selectedIndex = 0;
    this.shipCards = [];
    this.scrollY = 0;
    this.isDragging = false;
    this.lastPointerY = 0;

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
    const title = new PIXI.Text('SELECT YOUR SHIP', {
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
    const subtitle = new PIXI.Text('Choose Your Combat Vessel', {
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
    const instructions = new PIXI.Text(
      'Arrow Keys to Navigate | Click DETAILS or START',
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

    // Setup carousel navigation
    this.setupScrolling();

    // Update selection
    this.updateSelection();

    // Setup input
    this.setupInput();
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

    // Glow effect for center ship (will be shown/hidden based on selection)
    const glow = new PIXI.Graphics();
    glow.circle(0, -50, 100);
    glow.fill({ color: 0x00ff00, alpha: 0 });
    container.addChildAt(glow, 0);
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
    const duration = animate ? 300 : 0; // Animation duration in ms

    this.shipCards.forEach((shipContainer, i) => {
      const offset = i - this.selectedIndex;
      const targetX = offset * this.shipSpacing;
      const isCenter = (i === this.selectedIndex);
      const targetScale = isCenter ? this.centerScale : this.sideScale;
      const targetAlpha = isCenter ? 1.0 : this.sideAlpha;

      // Slight tilt for side ships
      const targetRotation = isCenter ? 0 : (offset < 0 ? -0.05 : 0.05);

      if (duration > 0 && !this.animating) {
        // Smooth animation with bounce
        this.animating = true;
        const startX = shipContainer.x;
        const startScale = shipContainer.scale.x;
        const startAlpha = shipContainer.alpha;
        const startRotation = shipContainer.rotation;
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(1, elapsed / duration);
          const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic

          shipContainer.x = startX + (targetX - startX) * eased;
          shipContainer.scale.set(startScale + (targetScale - startScale) * eased);
          shipContainer.alpha = startAlpha + (targetAlpha - startAlpha) * eased;
          shipContainer.rotation = startRotation + (targetRotation - startRotation) * eased;

          // Animate glow for center ship
          if (shipContainer.glowEffect) {
            if (isCenter) {
              const glowAlpha = Math.sin(elapsed * 0.005) * 0.15 + 0.15;
              shipContainer.glowEffect.alpha = glowAlpha * eased;
            } else {
              shipContainer.glowEffect.alpha = 0;
            }
          }

          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            this.animating = false;
            this.updateButtons(); // Update buttons after animation
          }
        };
        animate();
      } else {
        // Immediate positioning
        shipContainer.x = targetX;
        shipContainer.scale.set(targetScale);
        shipContainer.alpha = targetAlpha;
        shipContainer.rotation = targetRotation;

        // Immediate glow state
        if (shipContainer.glowEffect) {
          shipContainer.glowEffect.alpha = isCenter ? 0.15 : 0;
        }
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
      'START',
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
      }
    );
    this.container.addChild(this.startButton);
  }

  navigateTo(newIndex) {
    if (newIndex < 0 || newIndex >= this.ships.length || this.animating) return;
    this.selectedIndex = newIndex;
    setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);

    // Subtle navigation sound (NOT the annoying blip blop)
    AudioManager.playSfx('thrusterFire', { volume: 0.15 });

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

  createButton(label, x, y, width, height, bgColor, textColor, onClick) {
    const button = new PIXI.Container();
    button.position.set(x, y);
    button.eventMode = 'static';
    button.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, width, height);
    bg.fill({ color: bgColor });
    bg.stroke({ color: 0x00ff00, width: 2 });
    button.addChild(bg);

    const text = new PIXI.Text(label, {
      fontFamily: 'Courier New',
      fontSize: 13,
      fill: textColor,
      fontWeight: 'bold'
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    button.addChild(text);

    button.on('pointerdown', (e) => {
      e.stopPropagation();
      if (!this.isDragging) {
        onClick();
      }
    });

    button.on('pointerover', () => {
      bg.clear();
      bg.rect(0, 0, width, height);
      bg.fill({ color: bgColor, alpha: 0.8 });
      bg.stroke({ color: 0xffffff, width: 2 });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.rect(0, 0, width, height);
      bg.fill({ color: bgColor });
      bg.stroke({ color: 0x00ff00, width: 2 });
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
    // Generate stat bars based on ship metadata or defaults
    const healthBar = '█'.repeat(3) + '░'.repeat(2); // 3/5
    const damageBar = '█'.repeat(3) + '░'.repeat(2); // 3/5
    const speedBar = '█'.repeat(4) + '░'.repeat(1);  // 4/5
    return `HP: ${healthBar}\nDMG: ${damageBar}\nSPD: ${speedBar}`;
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
