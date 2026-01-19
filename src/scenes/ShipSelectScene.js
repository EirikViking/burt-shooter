import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { getSelectableShips, getDefaultShipId, isValidShipId } from '../config/ShipMetadata.js';

const STORAGE_KEY = 'burt.selectedShip.v1';

export class ShipSelectScene {
  constructor(game) {
    this.game = game;
    this.container = new PIXI.Container();
    this.ships = getSelectableShips();
    this.selectedIndex = 0;
    this.shipCards = [];
    this.confirmed = false;

    // Load saved selection
    const saved = this.loadSelection();
    if (saved && isValidShipId(saved)) {
      const index = this.ships.findIndex(s => s.id === saved);
      if (index >= 0) this.selectedIndex = index;
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
      'Arrow Keys / Touch to Select | Enter / Tap to Confirm',
      {
        fontFamily: 'Courier New',
        fontSize: 16,
        fill: '#ffffff',
        align: 'center'
      }
    );
    instructions.anchor.set(0.5, 0);
    instructions.position.set(width / 2, height - 50);
    this.container.addChild(instructions);

    // Start button (for mobile)
    this.createStartButton();

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
    const cardWidth = 180;
    const cardHeight = 220;
    const spacing = 20;
    const gridWidth = cols * cardWidth + (cols - 1) * spacing;
    const gridHeight = rows * cardHeight + (rows - 1) * spacing;
    const startX = (width - gridWidth) / 2;
    const startY = 120;

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
    const shipTexture = GameAssets.getRankShipTexture(index);
    if (shipTexture && shipTexture.width > 0) {
      const sprite = new PIXI.Sprite(shipTexture);
      sprite.anchor.set(0.5);
      sprite.position.set(width / 2, height / 3);

      // Scale to fit
      const maxSize = 80;
      const scale = Math.min(maxSize / sprite.width, maxSize / sprite.height);
      sprite.scale.set(scale);

      card.addChild(sprite);
      card.sprite = sprite;
    }

    // Ship name
    const name = new PIXI.Text(ship.name, {
      fontFamily: 'Courier New',
      fontSize: 14,
      fill: '#00ff00',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width - 20
    });
    name.anchor.set(0.5, 0);
    name.position.set(width / 2, height / 2 + 20);
    card.addChild(name);

    // Ship description
    const desc = new PIXI.Text(ship.description, {
      fontFamily: 'Courier New',
      fontSize: 11,
      fill: '#aaaaaa',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width - 20
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(width / 2, height / 2 + 45);
    card.addChild(desc);

    // Click handler
    card.on('pointerdown', () => {
      this.selectedIndex = index;
      this.updateSelection();
    });

    return card;
  }

  createStartButton() {
    const { width, height } = { width: this.game.getWidth(), height: this.game.getHeight() };

    const button = new PIXI.Container();
    button.position.set(width / 2, height - 80);
    button.eventMode = 'static';
    button.cursor = 'pointer';

    const bg = new PIXI.Graphics();
    bg.rect(-80, -20, 160, 40);
    bg.fill({ color: 0x00ff00 });
    bg.stroke({ color: 0xffffff, width: 2 });
    button.addChild(bg);
    button.bg = bg;

    const text = new PIXI.Text('START', {
      fontFamily: 'Courier New',
      fontSize: 24,
      fill: '#000000',
      fontWeight: 'bold'
    });
    text.anchor.set(0.5);
    button.addChild(text);

    button.on('pointerdown', () => {
      this.confirmSelection();
    });

    this.container.addChild(button);
    this.startButton = button;
  }

  updateSelection() {
    // Update card highlights
    this.shipCards.forEach((card, i) => {
      if (i === this.selectedIndex) {
        card.bg.clear();
        card.bg.rect(0, 0, 180, 220);
        card.bg.fill({ color: 0x2a2a2a });
        card.bg.stroke({ color: 0x00ff00, width: 4 });
        if (card.sprite) card.sprite.tint = 0xffffff;
      } else {
        card.bg.clear();
        card.bg.rect(0, 0, 180, 220);
        card.bg.fill({ color: 0x1a1a1a });
        card.bg.stroke({ color: 0x00ff00, width: 2 });
        if (card.sprite) card.sprite.tint = 0x888888;
      }
    });
  }

  setupInput() {
    this.keyHandler = (e) => {
      if (this.confirmed) return;

      if (e.key === 'ArrowLeft') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateSelection();
      } else if (e.key === 'ArrowRight') {
        this.selectedIndex = Math.min(this.ships.length - 1, this.selectedIndex + 1);
        this.updateSelection();
      } else if (e.key === 'ArrowUp') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 3);
        this.updateSelection();
      } else if (e.key === 'ArrowDown') {
        this.selectedIndex = Math.min(this.ships.length - 1, this.selectedIndex + 3);
        this.updateSelection();
      } else if (e.key === 'Enter' || e.key === ' ') {
        this.confirmSelection();
      }
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  confirmSelection() {
    if (this.confirmed) return;
    this.confirmed = true;

    const selectedShip = this.ships[this.selectedIndex];
    this.saveSelection(selectedShip.id);

    // Transition to game
    this.game.startGame(selectedShip.id);
  }

  saveSelection(shipId) {
    try {
      localStorage.setItem(STORAGE_KEY, shipId);
    } catch (e) {
      console.warn('[ShipSelect] Failed to save selection:', e);
    }
  }

  loadSelection() {
    try {
      return localStorage.getItem(STORAGE_KEY) || getDefaultShipId();
    } catch (e) {
      console.warn('[ShipSelect] Failed to load selection:', e);
      return getDefaultShipId();
    }
  }

  cleanup() {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
  }

  getContainer() {
    return this.container;
  }
}
