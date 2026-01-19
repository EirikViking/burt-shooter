import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { getSelectableShips, getDefaultShipKey, isValidShipKey } from '../config/ShipMetadata.js';
import { setSelectedShipKey, getSelectedShipKey } from '../utils/ShipSelectionState.js';

const STORAGE_KEY = 'burt.selectedShip.v1';

export class ShipSelectScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.ships = getSelectableShips();
    this.selectedIndex = 0;
    this.shipCards = [];

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

    // Title
    const title = new PIXI.Text('SELECT YOUR SHIP', {
      fontFamily: 'Courier New',
      fontSize: 36,
      fill: '#00ff00',
      stroke: '#000000',
      strokeThickness: 4
    });
    title.anchor.set(0.5, 0);
    title.position.set(width / 2, 30);
    this.container.addChild(title);

    // Ship grid
    await this.createShipGrid();

    // Instructions
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
    instructions.position.set(width / 2, height - 20);
    this.container.addChild(instructions);

    // Update selection
    this.updateSelection();

    // Setup input
    this.setupInput();
  }

  async createShipGrid() {
    const { width, height } = { width: this.game.getWidth(), height: this.game.getHeight() };
    const gridContainer = new PIXI.Container();

    const cols = 3;
    const rows = Math.ceil(this.ships.length / cols);
    const cardWidth = 220;
    const cardHeight = 280;
    const spacing = 20;
    const gridWidth = cols * cardWidth + (cols - 1) * spacing;
    const gridHeight = rows * cardHeight + (rows - 1) * spacing;

    // Center the grid properly
    const startX = (width - gridWidth) / 2;
    const startY = 100;

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

    this.container.addChild(gridContainer);
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

    // Short teaser (max 2 lines)
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
        setSelectedShipKey(ship.spriteKey);
        this.saveSelection(ship.spriteKey);
        this.game.showShipDetails(ship.spriteKey);
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
        setSelectedShipKey(ship.spriteKey);
        this.saveSelection(ship.spriteKey);
        this.game.startGame(ship.spriteKey);
      }
    );
    card.addChild(startBtn);

    // Click on card to select
    card.on('pointerdown', (e) => {
      // Only select if not clicking buttons
      if (e.target === card || e.target === bg || e.target === card.sprite) {
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
      onClick();
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

  getShortTeaser(description) {
    // Truncate to ~40 chars for 2 lines max
    if (description.length <= 40) return description;
    const truncated = description.substring(0, 40);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  updateSelection() {
    // Update card highlights
    this.shipCards.forEach((card, i) => {
      if (i === this.selectedIndex) {
        card.bg.clear();
        card.bg.rect(0, 0, 220, 280);
        card.bg.fill({ color: 0x2a2a2a });
        card.bg.stroke({ color: 0x00ff00, width: 4 });
        if (card.sprite) card.sprite.tint = 0xffffff;
      } else {
        card.bg.clear();
        card.bg.rect(0, 0, 220, 280);
        card.bg.fill({ color: 0x1a1a1a });
        card.bg.stroke({ color: 0x00ff00, width: 2 });
        if (card.sprite) card.sprite.tint = 0x888888;
      }
    });
  }

  setupInput() {
    this.keyHandler = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
        this.updateSelection();
      } else if (e.key === 'ArrowRight' || e.key === 'KeyD') {
        this.selectedIndex = Math.min(this.ships.length - 1, this.selectedIndex + 1);
        setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
        this.updateSelection();
      } else if (e.key === 'ArrowUp' || e.key === 'KeyW') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 3);
        setSelectedShipKey(this.ships[this.selectedIndex].spriteKey);
        this.updateSelection();
      } else if (e.key === 'ArrowDown' || e.key === 'KeyS') {
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
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
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
