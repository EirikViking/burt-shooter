import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { getShipMetadata } from '../config/ShipMetadata.js';

export class ShipDetailsScene {
    constructor(game, spriteKey) {
        this.game = game;
        this.spriteKey = spriteKey;
        this.container = new PIXI.Container();
        this.ship = getShipMetadata(spriteKey);

        if (!this.ship) {
            console.error('[ShipDetails] Invalid sprite key:', spriteKey);
            this.ship = getShipMetadata('row2_ship_1.png');
            this.spriteKey = 'row2_ship_1.png';
        }
    }

    async create() {
        const { width, height } = { width: this.game.getWidth(), height: this.game.getHeight() };

        // Background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, width, height);
        bg.fill({ color: 0x000000 });
        this.container.addChild(bg);

        // Main panel
        const panelWidth = Math.min(700, width - 40);
        const panelHeight = Math.min(600, height - 80);
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;

        const panel = new PIXI.Graphics();
        panel.rect(panelX, panelY, panelWidth, panelHeight);
        panel.fill({ color: 0x1a1a1a });
        panel.stroke({ color: 0x00ff00, width: 3 });
        this.container.addChild(panel);

        // Title
        const title = new PIXI.Text(this.ship.name, {
            fontFamily: 'Courier New',
            fontSize: 32,
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        });
        title.anchor.set(0.5, 0);
        title.position.set(width / 2, panelY + 20);
        this.container.addChild(title);

        // Ship sprite (large)
        const shipTexture = GameAssets.getRankShipTexture(this.ship.textureIndex);
        if (shipTexture && shipTexture.width > 0) {
            const sprite = new PIXI.Sprite(shipTexture);
            sprite.anchor.set(0.5);
            sprite.position.set(panelX + panelWidth / 4, panelY + 150);

            const maxSize = 150;
            const scale = Math.min(maxSize / sprite.width, maxSize / sprite.height);
            sprite.scale.set(scale);

            this.container.addChild(sprite);
        }

        // Description
        const desc = new PIXI.Text(this.ship.description, {
            fontFamily: 'Courier New',
            fontSize: 16,
            fill: '#ffffff',
            align: 'center',
            wordWrap: true,
            wordWrapWidth: panelWidth - 40
        });
        desc.anchor.set(0.5, 0);
        desc.position.set(width / 2, panelY + 280);
        this.container.addChild(desc);

        // Buttons
        this.createButtons(panelX, panelY, panelWidth, panelHeight);

        // Setup input
        this.setupInput();
    }

    createButtons(panelX, panelY, panelWidth, panelHeight) {
        const buttonY = panelY + panelHeight - 60;
        const buttonWidth = 140;
        const buttonHeight = 40;
        const spacing = 20;

        // Back button
        const backButton = new PIXI.Container();
        backButton.position.set(panelX + panelWidth / 2 - buttonWidth - spacing / 2, buttonY);
        backButton.eventMode = 'static';
        backButton.cursor = 'pointer';

        const backBg = new PIXI.Graphics();
        backBg.rect(0, 0, buttonWidth, buttonHeight);
        backBg.fill({ color: 0x333333 });
        backBg.stroke({ color: 0x00ff00, width: 2 });
        backButton.addChild(backBg);

        const backText = new PIXI.Text('BACK', {
            fontFamily: 'Courier New',
            fontSize: 20,
            fill: '#00ff00'
        });
        backText.anchor.set(0.5);
        backText.position.set(buttonWidth / 2, buttonHeight / 2);
        backButton.addChild(backText);

        backButton.on('pointerdown', () => this.goBack());
        this.container.addChild(backButton);

        // Start button
        const startButton = new PIXI.Container();
        startButton.position.set(panelX + panelWidth / 2 + spacing / 2, buttonY);
        startButton.eventMode = 'static';
        startButton.cursor = 'pointer';

        const startBg = new PIXI.Graphics();
        startBg.rect(0, 0, buttonWidth, buttonHeight);
        startBg.fill({ color: 0x00ff00 });
        startBg.stroke({ color: 0xffffff, width: 2 });
        startButton.addChild(startBg);

        const startText = new PIXI.Text('START GAME', {
            fontFamily: 'Courier New',
            fontSize: 20,
            fill: '#000000',
            fontWeight: 'bold'
        });
        startText.anchor.set(0.5);
        startText.position.set(buttonWidth / 2, buttonHeight / 2);
        startButton.addChild(startText);

        startButton.on('pointerdown', () => this.startGame());
        this.container.addChild(startButton);

        this.backButton = backButton;
        this.startButton = startButton;
    }

    setupInput() {
        this.keyHandler = (e) => {
            if (e.key === 'Escape') {
                this.goBack();
            } else if (e.key === 'Enter') {
                this.startGame();
            }
        };

        window.addEventListener('keydown', this.keyHandler);
    }

    goBack() {
        console.log('[ShipDetails] Going back to ship select');
        this.game.showShipSelect();
    }

    startGame() {
        console.log('[ShipDetails] Starting game with ship:', this.spriteKey);
        this.game.startGame(this.spriteKey);
    }

    cleanup() {
        if (this.keyHandler) {
            window.removeEventListener('keydown', this.keyHandler);
        }
    }

    destroy() {
        this.cleanup();
        if (this.container) {
            this.container.destroy({ children: true });
            this.container = null;
        }
    }

    getContainer() {
        return this.container;
    }
}
