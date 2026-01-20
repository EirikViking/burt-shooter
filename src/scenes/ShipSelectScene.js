import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { getSelectableShips, getDefaultShipKey, isValidShipKey } from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';

const STORAGE_KEY = 'burt.selectedShip.v1';
const DEBUG = false;

export class ShipSelectScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.ships = getSelectableShips();
    this.selectedIndex = 0;
    this.activeTickers = []; // Track all active animation tickers

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

    // Header
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
    this.container.addChild(title);

    // Create carousel container
    this.carouselContainer = new PIXI.Container();
    this.carouselContainer.position.set(width / 2, height / 2);
    this.container.addChild(this.carouselContainer);

    // Create left arrow button
    this.leftArrow = this.createArrowButton(-150, 0, true);
    this.container.addChild(this.leftArrow);

    // Create right arrow button
    this.rightArrow = this.createArrowButton(width - 100, 0, false);
    this.container.addChild(this.rightArrow);

    // Footer instructions
    const instructions = new PIXI.Text(
      'Arrow Keys or Click Arrows to Navigate',
      {
        fontFamily: 'Courier New',
        fontSize: 14,
        fill: '#cccccc',
        align: 'center'
      }
    );
    instructions.anchor.set(0.5, 1);
    instructions.position.set(width / 2, height - 15);
    this.container.addChild(instructions);

    // Setup input
    this.setupInput();

    // Show initial ship
    this.updateCarousel();
  }

  createArrowButton(x, y, isLeft) {
    const button = new PIXI.Container();
    button.position.set(x, y);
    button.eventMode = 'static';
    button.cursor = 'pointer';

    // Arrow background
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, 80, 80);
    bg.fill({ color: 0x1a1a1a });
    bg.stroke({ color: 0x00ff00, width: 2 });
    button.addChild(bg);

    // Arrow symbol
    const arrow = new PIXI.Graphics();
    if (isLeft) {
      arrow.moveTo(50, 25);
      arrow.lineTo(30, 40);
      arrow.lineTo(50, 55);
    } else {
      arrow.moveTo(30, 25);
      arrow.lineTo(50, 40);
      arrow.lineTo(30, 55);
    }
    arrow.stroke({ color: 0x00ff00, width: 3 });
    button.addChild(arrow);

    button.on('pointerdown', () => {
      if (isLeft) {
        this.navigateLeft();
      } else {
        this.navigateRight();
      }
    });

    button.on('pointerover', () => {
      bg.clear();
      bg.rect(0, 0, 80, 80);
      bg.fill({ color: 0x2a2a2a });
      bg.stroke({ color: 0xffffff, width: 3 });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.rect(0, 0, 80, 80);
      bg.fill({ color: 0x1a1a1a });
      bg.stroke({ color: 0x00ff00, width: 2 });
    });

    return button;
  }

  async updateCarousel(direction = null) {
    const ship = this.ships[this.selectedIndex];
    const { width, height } = { width: this.game.getWidth(), height: this.game.getHeight() };

    // Slide out animation
    if (direction && this.carouselContainer.children.length > 0) {
      const slideOutDirection = direction === 'left' ? 200 : -200;
      let elapsed = 0;
      const duration = 200;

      await new Promise(resolve => {
        const ticker = (delta) => {
          elapsed += delta.deltaTime * 16.67;
          const progress = Math.min(1, elapsed / duration);
          this.carouselContainer.x = (width / 2) + slideOutDirection * progress;
          this.carouselContainer.alpha = 1 - progress;

          if (progress >= 1) {
            this.game.app.ticker.remove(ticker);
            const idx = this.activeTickers.indexOf(ticker);
            if (idx >= 0) this.activeTickers.splice(idx, 1);
            resolve();
          }
        };
        this.activeTickers.push(ticker);
        this.game.app.ticker.add(ticker);
      });
    }

    // Clear carousel
    this.carouselContainer.removeChildren();

    // Reset carousel position for slide in
    if (direction) {
      const slideInDirection = direction === 'left' ? -200 : 200;
      this.carouselContainer.x = (width / 2) + slideInDirection;
      this.carouselContainer.alpha = 0;
    }

    // Large ship sprite
    const shipTexture = GameAssets.getRankShipTexture(ship.textureIndex);
    let shipSprite = null;
    if (shipTexture && shipTexture.width > 0) {
      shipSprite = new PIXI.Sprite(shipTexture);
      shipSprite.anchor.set(0.5);
      shipSprite.position.set(0, -80);

      const maxSize = 150;
      const scale = Math.min(maxSize / shipSprite.width, maxSize / shipSprite.height);
      shipSprite.scale.set(scale);

      this.carouselContainer.addChild(shipSprite);

      // Add glow effect around ship
      const glow = new PIXI.Graphics();
      glow.circle(0, 0, maxSize * 0.7);
      glow.fill({ color: 0x00ff00, alpha: 0.15 });
      glow.filters = [new PIXI.BlurFilter(20)];
      glow.position.set(0, -80);
      this.carouselContainer.addChildAt(glow, 0);
    }

    // Ship name
    const name = new PIXI.Text(ship.name, {
      fontFamily: 'Courier New',
      fontSize: 24,
      fill: '#00ff00',
      align: 'center',
      fontWeight: 'bold'
    });
    name.anchor.set(0.5, 0);
    name.position.set(0, 20);
    this.carouselContainer.addChild(name);

    // Short lore
    const lore = this.getShortTeaser(ship.description);
    const loreText = new PIXI.Text(lore, {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#cccccc',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 400
    });
    loreText.anchor.set(0.5, 0);
    loreText.position.set(0, 60);
    this.carouselContainer.addChild(loreText);

    // Stat bars
    const statsY = 110;
    const statSpacing = 35;

    // HP bar
    this.createStatBar('HP', 3, 0, statsY);

    // DMG bar
    this.createStatBar('DMG', 3, 0, statsY + statSpacing);

    // SPD bar
    this.createStatBar('SPD', 4, 0, statsY + statSpacing * 2);

    // Buttons
    const buttonY = 230;
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonSpacing = 20;

    // DETAILS button
    const detailsBtn = this.createButton(
      'DETAILS',
      -buttonWidth - buttonSpacing / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x333333,
      0x00ff00,
      () => {
        const spriteKey = ship.spriteKey;
        setSelectedShipKey(spriteKey);
        this.saveSelection(spriteKey);
        this.game.showShipDetails(spriteKey);
      }
    );
    this.carouselContainer.addChild(detailsBtn);

    // START button
    const startBtn = this.createButton(
      'START',
      buttonSpacing / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x00ff00,
      0x000000,
      () => {
        const spriteKey = ship.spriteKey;
        setSelectedShipKey(spriteKey);
        this.saveSelection(spriteKey);
        this.game.startGame(spriteKey);
      }
    );
    this.carouselContainer.addChild(startBtn);

    // Counter text
    const counter = new PIXI.Text(`${this.selectedIndex + 1} / ${this.ships.length}`, {
      fontFamily: 'Courier New',
      fontSize: 16,
      fill: '#888888'
    });
    counter.anchor.set(0.5, 0);
    counter.position.set(0, 290);
    this.carouselContainer.addChild(counter);

    // Slide in animation
    if (direction) {
      let elapsed = 0;
      const duration = 250;

      const ticker = (delta) => {
        elapsed += delta.deltaTime * 16.67;
        const progress = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        this.carouselContainer.x = width / 2 - (direction === 'left' ? -200 : 200) * (1 - eased);
        this.carouselContainer.alpha = eased;

        if (progress >= 1) {
          this.carouselContainer.x = width / 2;
          this.carouselContainer.alpha = 1;
          this.game.app.ticker.remove(ticker);
          const idx = this.activeTickers.indexOf(ticker);
          if (idx >= 0) this.activeTickers.splice(idx, 1);
        }
      };
      this.activeTickers.push(ticker);
      this.game.app.ticker.add(ticker);
    }
  }

  createSparkles(shipSprite) {
    if (!shipSprite) return;

    const sparkleCount = 8;
    const shipX = shipSprite.x;
    const shipY = shipSprite.y;
    const radius = 100;

    for (let i = 0; i < sparkleCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkleCount;
      const sparkle = new PIXI.Graphics();
      sparkle.star(0, 0, 4, 4, 3);
      sparkle.fill({ color: 0xffff00, alpha: 0.4 });

      const x = shipX + Math.cos(angle) * radius;
      const y = shipY + Math.sin(angle) * radius;
      sparkle.position.set(x, y);
      sparkle.rotation = Math.random() * Math.PI * 2;

      this.carouselContainer.addChild(sparkle);
    }
  }

  createStatBar(label, value, x, y) {
    const maxBars = 5;
    const barWidth = 25;
    const barHeight = 15;
    const barSpacing = 5;
    const totalWidth = maxBars * barWidth + (maxBars - 1) * barSpacing;

    // Label
    const labelText = new PIXI.Text(label, {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#00ff00',
      fontWeight: 'bold'
    });
    labelText.anchor.set(1, 0.5);
    labelText.position.set(x - totalWidth / 2 - 15, y);
    this.carouselContainer.addChild(labelText);

    // Bars
    for (let i = 0; i < maxBars; i++) {
      const bar = new PIXI.Graphics();
      const barX = x - totalWidth / 2 + i * (barWidth + barSpacing);

      if (i < value) {
        // Filled bar
        bar.rect(barX, y - barHeight / 2, barWidth, barHeight);
        bar.fill({ color: 0x00ff00 });
      } else {
        // Empty bar
        bar.rect(barX, y - barHeight / 2, barWidth, barHeight);
        bar.stroke({ color: 0x00ff00, width: 2 });
      }

      this.carouselContainer.addChild(bar);
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
      fontSize: 16,
      fill: textColor,
      fontWeight: 'bold'
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    button.addChild(text);

    button.on('pointerdown', onClick);

    button.on('pointerover', () => {
      bg.clear();
      bg.rect(0, 0, width, height);
      bg.fill({ color: bgColor, alpha: 0.8 });
      bg.stroke({ color: 0xffffff, width: 3 });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.rect(0, 0, width, height);
      bg.fill({ color: bgColor });
      bg.stroke({ color: 0x00ff00, width: 2 });
    });

    return button;
  }

  navigateLeft() {
    this.selectedIndex = (this.selectedIndex - 1 + this.ships.length) % this.ships.length;
    setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
    this.updateCarousel('left');

    // SFX and voice
    import('../audio/AudioManager.js').then(({ AudioManager }) => {
      AudioManager.playSfx('ui_open', { force: true, volume: 0.6 });
    });
  }

  navigateRight() {
    this.selectedIndex = (this.selectedIndex + 1) % this.ships.length;
    setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
    this.updateCarousel('right');

    // SFX and voice
    import('../audio/AudioManager.js').then(({ AudioManager }) => {
      AudioManager.playSfx('ui_open', { force: true, volume: 0.6 });
    });
  }

  setupInput() {
    this.keyHandler = (e) => {
      if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
        this.navigateLeft();
      } else if (e.key === 'ArrowRight' || e.code === 'KeyD') {
        this.navigateRight();
      } else if (e.key === 'Enter' || e.code === 'Space') {
        const ship = this.ships[this.selectedIndex];
        const spriteKey = ship.spriteKey;
        setSelectedShipKey(spriteKey);
        this.saveSelection(spriteKey);
        this.game.startGame(spriteKey);
      }
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  getShortTeaser(description) {
    if (description.length <= 60) return description;
    const truncated = description.substring(0, 60);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
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
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    // Clean up all animation tickers to prevent visual glitches
    this.activeTickers.forEach(ticker => {
      this.game.app.ticker.remove(ticker);
    });
    this.activeTickers = [];
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
