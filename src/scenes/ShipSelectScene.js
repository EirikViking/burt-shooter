import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { getSelectableShips, getDefaultShipKey, isValidShipKey } from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';

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

    // Scrollable content area
    const scrollViewportY = 95;
    const scrollViewportHeight = height - 135; // Leave space for header and footer

    // Create scroll viewport with mask
    const scrollMask = new PIXI.Graphics();
    scrollMask.rect(0, scrollViewportY, width, scrollViewportHeight);
    scrollMask.fill({ color: 0xffffff });
    this.container.addChild(scrollMask);

    // Scrollable content container
    this.scrollContent = new PIXI.Container();
    this.scrollContent.y = scrollViewportY;
    this.scrollContent.mask = scrollMask;
    this.container.addChild(this.scrollContent);

    // Ship grid
    await this.createShipGrid(width, scrollViewportHeight);

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

    // Setup scrolling
    this.setupScrolling(width, scrollViewportHeight);

    // Update selection
    this.updateSelection();

    // Setup input
    this.setupInput();
  }

  async createShipGrid(width, viewportHeight) {
    const gridContainer = new PIXI.Container();

    const cols = 3;
    const rows = Math.ceil(this.ships.length / cols);
    const cardWidth = 220;
    const cardHeight = 280;
    const spacing = 20;
    const gridWidth = cols * cardWidth + (cols - 1) * spacing;
    const gridHeight = rows * cardHeight + (rows - 1) * spacing;

    // Store content height for scrolling
    this.contentHeight = gridHeight + 40; // Add padding
    this.viewportHeight = viewportHeight;

    // Center the grid horizontally
    const startX = (width - gridWidth) / 2;
    const startY = 20; // Start from top of scroll area

    for (let i = 0; i < this.ships.length; i++) {
      const ship = this.ships[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardWidth + spacing);
      const y = startY + row * (cardHeight + spacing);

      const card = await this.createShipCard(ship, i, x, y, cardWidth, cardHeight);
      this.shipCards.push(card);
      gridContainer.addChild(card);
    }

    this.scrollContent.addChild(gridContainer);
    this.gridContainer = gridContainer;
  }

  async createShipCard(ship, index, x, y, width, height) {
    const card = new PIXI.Container();
    card.position.set(x, y);
    card.eventMode = 'static';
    card.cursor = 'pointer';

    // Card background
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, width, height);
    bg.fill({ color: 0x1a1a1a });
    bg.stroke({ color: 0x00ff00, width: 2 });
    card.addChild(bg);
    card.bg = bg;

    // Ship sprite
    const shipTexture = GameAssets.getRankShipTexture(ship.textureIndex);
    if (shipTexture && shipTexture.width > 0) {
      const sprite = new PIXI.Sprite(shipTexture);
      sprite.anchor.set(0.5);
      sprite.position.set(width / 2, 70);

      const maxSize = 80;
      const scale = Math.min(maxSize / sprite.width, maxSize / sprite.height);
      sprite.scale.set(scale);

      card.addChild(sprite);
      card.sprite = sprite;
    }

    // Ship name
    const name = new PIXI.Text(ship.name, {
      fontFamily: 'Courier New',
      fontSize: 16,
      fill: '#00ff00',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width - 20,
      fontWeight: 'bold'
    });
    name.anchor.set(0.5, 0);
    name.position.set(width / 2, 130);
    card.addChild(name);

    // Short teaser
    const teaser = this.getShortTeaser(ship.description);
    const desc = new PIXI.Text(teaser, {
      fontFamily: 'Courier New',
      fontSize: 11,
      fill: '#cccccc',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width - 30,
      lineHeight: 14
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(width / 2, 160);
    card.addChild(desc);

    // Ship stats (health, damage, speed indicators)
    const statsY = 200;
    const statsText = this.getShipStats(ship);
    const stats = new PIXI.Text(statsText, {
      fontFamily: 'Courier New',
      fontSize: 10,
      fill: '#00ff00',
      align: 'center',
      lineHeight: 12
    });
    stats.anchor.set(0.5, 0);
    stats.position.set(width / 2, statsY);
    card.addChild(stats);

    // Buttons at bottom
    const buttonY = height - 50;
    const buttonWidth = 85;
    const buttonHeight = 32;
    const buttonSpacing = 10;

    // DETAILS button
    const detailsBtn = this.createButton(
      'DETAILS',
      (width - buttonWidth * 2 - buttonSpacing) / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x333333,
      0x00ff00,
      () => {
        this.selectedIndex = index;
        const spriteKey = ship.spriteKey;
        setSelectedShipKey(spriteKey);
        this.saveSelection(spriteKey);
        if (DEBUG) console.log('[ShipSelect] Opening details for:', spriteKey);
        this.game.showShipDetails(spriteKey);
      }
    );
    card.addChild(detailsBtn);

    // START button
    const startBtn = this.createButton(
      'START',
      (width - buttonWidth * 2 - buttonSpacing) / 2 + buttonWidth + buttonSpacing,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x00ff00,
      0x000000,
      () => {
        this.selectedIndex = index;
        const spriteKey = ship.spriteKey;
        setSelectedShipKey(spriteKey);
        this.saveSelection(spriteKey);
        if (DEBUG) console.log('[ShipSelect] Starting game with:', spriteKey);
        this.game.startGame(spriteKey);
      }
    );
    card.addChild(startBtn);

    // Click on card to select
    card.on('pointerdown', (e) => {
      if (!this.isDragging && (e.target === card || e.target === bg || e.target === card.sprite)) {
        this.selectedIndex = index;
        setSelectedShipKey(ship.spriteKey);
        this.updateSelection();
      }
    });

    return card;
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

  setupScrolling(width, viewportHeight) {
    // Wheel scrolling (desktop)
    this.wheelHandler = (e) => {
      e.preventDefault();
      this.scrollY += e.deltaY * 0.5;
      this.clampScroll();
      this.applyScroll();
    };

    // Touch/drag scrolling (mobile)
    this.scrollContent.eventMode = 'static';

    this.scrollContent.on('pointerdown', (e) => {
      this.isDragging = false;
      this.dragStartY = e.global.y;
      this.dragStartScrollY = this.scrollY;
      this.lastPointerY = e.global.y;
    });

    this.scrollContent.on('pointermove', (e) => {
      if (this.dragStartY !== undefined) {
        const deltaY = e.global.y - this.dragStartY;
        if (Math.abs(deltaY) > 5) {
          this.isDragging = true;
        }
        if (this.isDragging) {
          this.scrollY = this.dragStartScrollY - deltaY;
          this.clampScroll();
          this.applyScroll();
        }
        this.lastPointerY = e.global.y;
      }
    });

    this.scrollContent.on('pointerup', () => {
      this.dragStartY = undefined;
      setTimeout(() => {
        this.isDragging = false;
      }, 100);
    });

    this.scrollContent.on('pointerupoutside', () => {
      this.dragStartY = undefined;
      setTimeout(() => {
        this.isDragging = false;
      }, 100);
    });

    // Add wheel listener to container
    // Add wheel listener to canvas
    const canvas = this.game.app.canvas || this.game.app.view;
    if (canvas) {
      canvas.addEventListener('wheel', this.wheelHandler, { passive: false });
    } else {
      window.addEventListener('wheel', this.wheelHandler, { passive: false });
    }
  }

  clampScroll() {
    const maxScroll = Math.max(0, this.contentHeight - this.viewportHeight);
    this.scrollY = Math.max(0, Math.min(maxScroll, this.scrollY));
  }

  applyScroll() {
    if (this.gridContainer) {
      this.gridContainer.y = -this.scrollY + 20;
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
    this.shipCards.forEach((card, i) => {
      if (i === this.selectedIndex) {
        card.bg.clear();
        card.bg.rect(0, 0, 220, 280);
        card.bg.fill({ color: 0x2a2a2a });
        card.bg.stroke({ color: 0x00ff00, width: 4 });

        // Add glowing outer border for selected card
        card.bg.rect(-4, -4, 228, 288);
        card.bg.stroke({ color: 0x00ff00, width: 1, alpha: 0.5 });

        if (card.sprite) {
          card.sprite.tint = 0xffffff;
          // Subtle pulse animation
          if (!card.pulseAnimating) {
            card.pulseAnimating = true;
            const originalScale = card.sprite.scale.x;
            let pulseTime = 0;
            const pulseAnim = () => {
              if (this.selectedIndex !== i || !card.sprite) {
                card.pulseAnimating = false;
                return;
              }
              pulseTime += 0.05;
              const scale = originalScale + Math.sin(pulseTime) * 0.03;
              card.sprite.scale.set(scale);
              requestAnimationFrame(pulseAnim);
            };
            pulseAnim();
          }
        }
      } else {
        card.bg.clear();
        card.bg.rect(0, 0, 220, 280);
        card.bg.fill({ color: 0x1a1a1a });
        card.bg.stroke({ color: 0x00ff00, width: 2 });
        if (card.sprite) {
          card.sprite.tint = 0x888888;
          card.pulseAnimating = false;
        }
      }
    });
  }

  setupInput() {
    console.log('[ShipSelectInput] attached');
    this.keyHandler = (e) => {
      // Log first key press for debug
      if (DEBUG) console.log(`[ShipSelectInput] key=${e.key} code=${e.code}`);

      if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
        this.updateSelection();
      } else if (e.key === 'ArrowRight' || e.code === 'KeyD') {
        this.selectedIndex = Math.min(this.ships.length - 1, this.selectedIndex + 1);
        setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
        this.updateSelection();
      } else if (e.key === 'ArrowUp' || e.code === 'KeyW') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 3);
        setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
        this.updateSelection();
      } else if (e.key === 'ArrowDown' || e.code === 'KeyS') {
        this.selectedIndex = Math.min(this.ships.length - 1, this.selectedIndex + 3);
        setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
        this.updateSelection();
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
