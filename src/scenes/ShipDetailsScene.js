import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { getShipMetadata, getShipUsage, getTotalUsage } from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';

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

        // Ensure state is updated
        setSelectedShipKey(this.spriteKey);
    }

    async create() {
        const { width, height } = { width: this.game.getWidth(), height: this.game.getHeight() };

        // Background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, width, height);
        bg.fill({ color: 0x000000 });
        this.container.addChild(bg);

        // Determine layout
        const isMobile = width < 900;
        const panelWidth = Math.min(850, width - 40);
        const panelHeight = Math.min(750, height - 60);
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;

        // Main panel
        const panel = new PIXI.Graphics();
        panel.rect(panelX, panelY, panelWidth, panelHeight);
        panel.fill({ color: 0x1a1a1a });
        panel.stroke({ color: 0x00ff00, width: 3 });
        this.container.addChild(panel);

        // Content container
        const contentContainer = new PIXI.Container();
        contentContainer.x = panelX;
        contentContainer.y = panelY;
        this.container.addChild(contentContainer);

        let yOffset = 20;

        // Title
        const title = new PIXI.Text(this.ship.name, {
            fontFamily: 'Courier New',
            fontSize: isMobile ? 26 : 32,
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4,
            fontWeight: 'bold'
        });
        title.anchor.set(0.5, 0);
        title.position.set(panelWidth / 2, yOffset);
        contentContainer.addChild(title);
        yOffset += isMobile ? 50 : 55;

        // Ship sprite (large)
        const shipTexture = GameAssets.getRankShipTexture(this.ship.textureIndex);
        if (shipTexture && shipTexture.width > 0) {
            const sprite = new PIXI.Sprite(shipTexture);
            sprite.anchor.set(0.5);
            sprite.position.set(panelWidth / 2, yOffset + 60);

            const maxSize = isMobile ? 120 : 140;
            const scale = Math.min(maxSize / sprite.width, maxSize / sprite.height);
            sprite.scale.set(scale);

            contentContainer.addChild(sprite);
        }
        yOffset += isMobile ? 130 : 130;

        // Stats section
        yOffset = this.createStatsSection(contentContainer, panelWidth, yOffset, isMobile);

        // Usage count
        const usageCount = getShipUsage(this.spriteKey);
        const usageText = new PIXI.Text(`Used ${usageCount} times by players`, {
            fontFamily: 'Courier New',
            fontSize: 13,
            fill: '#999999',
            align: 'center'
        });
        usageText.anchor.set(0.5, 0);
        usageText.position.set(panelWidth / 2, yOffset);
        contentContainer.addChild(usageText);
        yOffset += 35;

        // Lore section with better formatting
        yOffset = this.createLoreSection(contentContainer, panelWidth, yOffset, isMobile);

        // Buttons
        this.createButtons(panelX, panelY, panelWidth, panelHeight, isMobile);

        // Setup input
        this.setupInput();
    }

    createStatsSection(container, panelWidth, yOffset, isMobile) {
        const stats = this.ship.stats || { speed: 6, fireRate: 150, damage: 1 };
        console.log(`[ShipStats] details shipId=${this.ship.id} damage=${stats.damage} fireRate=${stats.fireRate} speed=${stats.speed}`);

        // Stats title
        const statsTitle = new PIXI.Text('STATS', {
            fontFamily: 'Courier New',
            fontSize: 16,
            fill: '#00ff00',
            fontWeight: 'bold'
        });
        statsTitle.anchor.set(0.5, 0);
        statsTitle.position.set(panelWidth / 2, yOffset);
        container.addChild(statsTitle);
        yOffset += 28;

        // Stats display
        const statSpacing = isMobile ? 90 : 110;
        const startX = (panelWidth - statSpacing * 2) / 2;

        const statLabels = [
            { label: 'SPEED', value: stats.speed.toFixed(1), color: 0x00ffff },
            { label: 'FIRE RATE', value: `${stats.fireRate}ms`, color: 0xff00ff },
            { label: 'DAMAGE', value: stats.damage.toFixed(1), color: 0xff0000 }
        ];

        statLabels.forEach((stat, index) => {
            const statContainer = new PIXI.Container();
            statContainer.position.set(startX + index * statSpacing, yOffset);

            // Stat value
            const valueText = new PIXI.Text(stat.value, {
                fontFamily: 'Courier New',
                fontSize: isMobile ? 20 : 24,
                fill: stat.color,
                fontWeight: 'bold'
            });
            valueText.anchor.set(0.5, 0);
            statContainer.addChild(valueText);

            // Stat label
            const labelText = new PIXI.Text(stat.label, {
                fontFamily: 'Courier New',
                fontSize: isMobile ? 10 : 11,
                fill: '#aaaaaa'
            });
            labelText.anchor.set(0.5, 0);
            labelText.position.set(0, isMobile ? 24 : 30);
            statContainer.addChild(labelText);

            container.addChild(statContainer);
        });

        return yOffset + 60;
    }

    createLoreSection(container, panelWidth, yOffset, isMobile) {
        // Format lore into paragraphs
        const loreLong = this.ship.loreLong || this.ship.description;
        const paragraphs = this.formatLoreIntoParagraphs(loreLong);

        paragraphs.forEach((para, index) => {
            const paraText = new PIXI.Text(para, {
                fontFamily: 'Courier New',
                fontSize: isMobile ? 11 : 13,
                fill: '#dddddd',
                align: 'left',
                wordWrap: true,
                wordWrapWidth: panelWidth - 80,
                lineHeight: isMobile ? 16 : 18
            });
            paraText.position.set(40, yOffset);
            container.addChild(paraText);
            yOffset += paraText.height + (isMobile ? 10 : 12);
        });

        return yOffset;
    }

    formatLoreIntoParagraphs(lore) {
        // Split long lore into readable paragraphs
        const sentences = lore.match(/[^.!?]+[.!?]+/g) || [lore];
        const paragraphs = [];
        let currentPara = '';

        sentences.forEach((sentence, index) => {
            currentPara += sentence.trim() + ' ';

            // Create new paragraph every 2-3 sentences or at ~150 chars
            if ((index + 1) % 2 === 0 || currentPara.length > 150) {
                paragraphs.push(currentPara.trim());
                currentPara = '';
            }
        });

        // Add remaining
        if (currentPara.trim()) {
            paragraphs.push(currentPara.trim());
        }

        return paragraphs.length > 0 ? paragraphs : [lore];
    }

    createButtons(panelX, panelY, panelWidth, panelHeight, isMobile) {
        const buttonY = panelY + panelHeight - (isMobile ? 50 : 55);
        const buttonWidth = isMobile ? 130 : 150;
        const buttonHeight = isMobile ? 38 : 42;
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
            fontSize: isMobile ? 18 : 22,
            fill: '#00ff00',
            fontWeight: 'bold'
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
            fontSize: isMobile ? 18 : 22,
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
        // Read from state to ensure we have the latest selection
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
