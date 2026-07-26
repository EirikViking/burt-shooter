import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import {
    getDefaultShipKey,
    getShipMetadata,
    getShipUnlockHistoryLine,
    getShipUnlockProgress,
    getShipUnlockRequirementLine,
    getShipUsage,
    getTotalUsage,
    isShipUnlocked
} from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';
import { createText } from '../utils/pixiText.js';
import { createShipStatPanel, getShipTierLabel } from '../ui/ShipStatPanel.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { getTraitExplanation } from '../config/ShipTraitDescriptions.js';
import { translateText } from '../i18n/index.js';
import { destroyMenuFx, installMenuFx, playMenuConfirmSfx, playMenuFocusSfx, updateMenuFx } from '../ui/MenuFxLayer.js';
import { getShipMasteryView, SHIP_MASTERY_TIERS } from '../progression/ShipMastery.js';
import { RUN_MODES } from '../game/RunMode.js';
import { HangarLaunchModeOverlay } from '../ui/HangarLaunchModeOverlay.js';

export class ShipDetailsScene {
    constructor(game, spriteKey) {
        this.game = game;
        this.spriteKey = spriteKey;
        this.container = new PIXI.Container();
        this.container.sortableChildren = true;
        this.ship = getShipMetadata(spriteKey);
        this.gamepadNavigator = new GamepadNavigator();
        this.buttons = [];
        this.menuFx = null;
        this.focusedButtonIndex = 1;
        this.launchModeOverlay = null;
        this.launchInProgress = false;

        if (!this.ship) {
            console.error('[ShipDetails] Invalid sprite key:', spriteKey);
            this.ship = getShipMetadata(getDefaultShipKey());
            this.spriteKey = getDefaultShipKey();
        }
        this.unlockProgress = getShipUnlockProgress();

        // Ensure state is updated
        setSelectedShipKey(this.spriteKey);
    }

    async create() {
        this.gamepadNavigator.suppressUntilReleased();
        const { width, height } = { width: this.game.getWidth(), height: this.game.getHeight() };

        // Background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, width, height);
        bg.fill({ color: 0x000000 });
        this.container.addChild(bg);
        installMenuFx(this, {
            label: 'ui_menuFxShipDetails',
            zIndex: 0,
            accent: this.ship?.visuals?.variant?.accent || 0x66ffcc,
            secondary: 0xff55d9,
            gold: 0xffef7e,
            intensity: 0.68,
            density: 0.7,
            alpha: 0.42,
            openVolume: 0.18
        });

        // Determine layout
        const isMobile = width < 900;
        const panelWidth = Math.min(850, width - 40);
        const panelHeight = Math.min(750, height - 60);
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;
        const accent = this.ship?.visuals?.variant?.accent || 0x37f5ff;

        // Main panel
        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
        panel.fill({ color: 0x06111f, alpha: 0.92 });
        panel.stroke({ color: accent, width: 2, alpha: 0.88 });
        panel.roundRect(panelX + 12, panelY + 12, panelWidth - 24, panelHeight - 24, 6);
        panel.stroke({ color: 0xff55d9, width: 1, alpha: 0.2 });
        panel.rect(panelX + 26, panelY + 22, Math.max(120, panelWidth * 0.22), 2);
        panel.fill({ color: 0xffef7e, alpha: 0.34 });
        panel.rect(panelX + panelWidth - Math.max(170, panelWidth * 0.26) - 26, panelY + panelHeight - 28, Math.max(150, panelWidth * 0.22), 2);
        panel.fill({ color: accent, alpha: 0.32 });
        this.container.addChild(panel);

        // Content container
        const contentContainer = new PIXI.Container();
        contentContainer.x = panelX;
        contentContainer.y = panelY;
        this.container.addChild(contentContainer);

        let yOffset = 20;

        // Title
        const title = createText(this.ship.name, {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: isMobile ? 26 : 32,
            fill: '#f5fdff',
            stroke: '#00d5ff',
            strokeThickness: 5,
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
            const variant = this.ship.visuals?.variant;
            if (Number.isFinite(variant?.tint)) {
                sprite.tint = variant.tint;
            }

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
        const locked = !isShipUnlocked(this.spriteKey, this.unlockProgress);
        const usageText = createText([translateText('YOUR LAUNCHES') + ':', usageCount, '//', translateText('LOCAL PROFILE')].join(' '), {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: 13,
            fill: '#999999',
            align: 'center'
        });
        usageText.anchor.set(0.5, 0);
        usageText.position.set(panelWidth / 2, yOffset);
        contentContainer.addChild(usageText);
        yOffset += 24;
        yOffset = this.createShipMasterySection(contentContainer, panelWidth, yOffset, isMobile);

        const unlockLine = locked
            ? getShipUnlockRequirementLine(this.spriteKey, { translate: translateText })
            : getShipUnlockHistoryLine(this.spriteKey, this.unlockProgress, { translate: translateText });
        const unlockText = createText(unlockLine, {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: isMobile ? 13 : 15,
            fill: locked ? '#ffcc00' : '#ffef7e',
            align: 'center',
            wordWrap: true,
            wordWrapWidth: panelWidth - 80,
            lineHeight: isMobile ? 16 : 18,
            stroke: '#000000',
            strokeThickness: 2,
            fontWeight: '700'
        });
        unlockText.anchor.set(0.5, 0);
        unlockText.position.set(panelWidth / 2, yOffset);
        unlockText.label = 'ui_shipDetailsUnlockProvenance';
        contentContainer.addChild(unlockText);
        this.unlockProvenanceText = unlockText;
        yOffset += unlockText.height + 16;

        // Lore section with better formatting. Keep it inside the space above the fixed buttons.
        const buttonTop = panelHeight - (isMobile ? 78 : 84);
        const loreMaxHeight = Math.max(0, buttonTop - yOffset - 10);
        if (loreMaxHeight >= (isMobile ? 38 : 44)) {
            yOffset = this.createLoreSection(contentContainer, panelWidth, yOffset, isMobile, loreMaxHeight);
        }

        // Buttons
        this.createButtons(panelX, panelY, panelWidth, panelHeight, isMobile);

        // Setup input
        this.setupInput();
    }

    createStatsSection(container, panelWidth, yOffset, isMobile) {
        const stats = this.ship.stats || { speed: 6, fireRate: 150, damage: 1 };
        const trait = this.ship.trait || this.ship.visuals?.trait;
        console.log(`[ShipStats] details shipId=${this.ship.id} trait=${trait?.label || 'none'} damage=${stats.damage} fireRate=${stats.fireRate} speed=${stats.speed}`);

        const accent = this.ship.visuals?.variant?.accent || this.ship.visuals?.variant?.glow || 0x00eaff;
        const statPanel = createShipStatPanel(this.ship, {
            compact: false,
            width: Math.min(panelWidth - 80, isMobile ? 520 : 620),
            accent,
            title: 'COMBAT READOUT'
        });
        statPanel.position.set(panelWidth / 2, yOffset);
        container.addChild(statPanel);
        yOffset += statPanel.height + 18;

        const tierLabel = getShipTierLabel(this.ship);
        if (tierLabel || this.ship.role || this.ship.weakness) {
            const metaLine = [
                tierLabel,
                this.ship.role ? String(this.ship.role).toUpperCase() : '',
                this.ship.weakness ? `WEAKNESS: ${this.ship.weakness}` : ''
            ].filter(Boolean).join(' // ');
            const metaText = createText(metaLine, {
                fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
                fontSize: isMobile ? 11 : 13,
                fill: tierLabel ? '#ffef7e' : '#d8fbff',
                align: 'center',
                wordWrap: true,
                wordWrapWidth: panelWidth - 100,
                lineHeight: isMobile ? 14 : 16,
                stroke: '#000000',
                strokeThickness: 2,
                fontWeight: '800'
            });
            metaText.anchor.set(0.5, 0);
            metaText.position.set(panelWidth / 2, yOffset);
            container.addChild(metaText);
            yOffset += metaText.height + 12;
        }

        const explanation = getTraitExplanation(trait, this.ship);
        const traitTitleText = 'TRAIT: ' + explanation.label;
        const traitTitle = createText(traitTitleText, {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: isMobile ? 13 : 15,
            fill: '#66ffcc',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 2,
            fontWeight: 'bold'
        });
        traitTitle.anchor.set(0.5, 0);
        traitTitle.position.set(panelWidth / 2, yOffset);
        container.addChild(traitTitle);
        yOffset += traitTitle.height + 5;

        const traitBody = createText(explanation.lines.map(line => `- ${line}`).join('\n'), {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: isMobile ? 10 : 12,
            fill: '#d8fbff',
            align: 'left',
            wordWrap: true,
            wordWrapWidth: panelWidth - 100,
            lineHeight: isMobile ? 13 : 15,
            stroke: '#000000',
            strokeThickness: 2
        });
        traitBody.position.set(50, yOffset);
        container.addChild(traitBody);

        return yOffset + traitBody.height + 16;
    }

    createShipMasterySection(container, panelWidth, yOffset, isMobile) {
        const mastery = getShipMasteryView(this.unlockProgress?.shipSpecificMilestones?.[this.ship.id]);
        const row = new PIXI.Container();
        row.label = 'ui_shipMasteryMedals';
        row.position.set(panelWidth / 2, yOffset);
        container.addChild(row);

        const title = createText(translateText('SHIP MASTERY'), {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: isMobile ? 12 : 14,
            fill: '#d8fbff',
            fontWeight: '800'
        });
        title.anchor.set(1, 0.5);
        title.position.set(-42, 10);
        row.addChild(title);

        const tiers = [
            SHIP_MASTERY_TIERS.bronze,
            SHIP_MASTERY_TIERS.silver,
            SHIP_MASTERY_TIERS.gold
        ];
        tiers.forEach((tier, index) => {
            const earned = mastery.tier.rank >= tier.rank;
            const medal = new PIXI.Graphics();
            const x = index * 34;
            medal.circle(x, 10, 11);
            medal.fill({ color: earned ? tier.color : 0x142433, alpha: earned ? 0.96 : 0.72 });
            medal.stroke({ color: earned ? 0xffffff : 0x4c6578, width: earned ? 2 : 1, alpha: earned ? 0.82 : 0.48 });
            medal.moveTo(x - 6, 18);
            medal.lineTo(x - 2, 28);
            medal.lineTo(x + 1, 19);
            medal.lineTo(x + 6, 28);
            medal.lineTo(x + 7, 18);
            medal.stroke({ color: earned ? tier.color : 0x4c6578, width: 3, alpha: earned ? 0.88 : 0.42 });
            row.addChild(medal);
        });

        const tierLabel = createText(translateText(mastery.tier.label), {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: isMobile ? 12 : 14,
            fill: mastery.tier.id === 'none' ? '#8298aa' : `#${mastery.tier.color.toString(16).padStart(6, '0')}`,
            fontWeight: '900'
        });
        tierLabel.anchor.set(0, 0.5);
        tierLabel.position.set(110, 10);
        row.addChild(tierLabel);

        const goal = mastery.maxed
            ? translateText('MASTERY COMPLETE')
            : mastery.nextGoal.id === 'clear_run'
                ? translateText('CLEAR A RANKED RUN FOR {tier}', {
                    tier: translateText(mastery.nextGoal.targetTier.label)
                })
                : translateText('REACH SECTOR {sector} FOR {tier}', {
                    sector: mastery.nextGoal.target,
                    tier: translateText(mastery.nextGoal.targetTier.label)
                });
        const goalText = createText(goal, {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: isMobile ? 10 : 12,
            fill: '#91b7c7',
            align: 'center'
        });
        goalText.anchor.set(0.5, 0);
        goalText.position.set(34, 31);
        row.addChild(goalText);

        return yOffset + 51;
    }

    createLoreSection(container, panelWidth, yOffset, isMobile, maxHeight = Infinity) {
        // Format lore into paragraphs
        const loreLong = this.ship.loreLong || this.ship.description;
        const paragraphs = this.formatLoreIntoParagraphs(loreLong);
        const startY = yOffset;

        for (const para of paragraphs) {
            const paraText = createText(para, {
                fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
                fontSize: isMobile ? 11 : 13,
                fill: '#dddddd',
                align: 'left',
                wordWrap: true,
                wordWrapWidth: panelWidth - 80,
                lineHeight: isMobile ? 16 : 18
            });
            paraText.position.set(40, yOffset);
            const nextBottom = (yOffset - startY) + paraText.height;
            if (nextBottom > maxHeight) {
                paraText.destroy();
                break;
            }
            container.addChild(paraText);
            yOffset += paraText.height + (isMobile ? 10 : 12);
        }

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
        const accent = this.ship?.visuals?.variant?.accent || 0x37f5ff;

        // Back button
        const backButton = new PIXI.Container();
        backButton.position.set(panelX + panelWidth / 2 - buttonWidth - spacing / 2, buttonY);
        backButton.eventMode = 'static';
        backButton.cursor = 'pointer';
        backButton.activate = () => this.goBack();

        const backFocus = new PIXI.Graphics();
        const backBg = new PIXI.Graphics();
        backButton.addChild(backFocus, backBg);

        const backText = createText('BACK', {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: isMobile ? 18 : 22,
            fill: '#d8fbff',
            fontWeight: 'bold'
        });
        backText.anchor.set(0.5);
        backText.position.set(buttonWidth / 2, buttonHeight / 2);
        backButton.addChild(backText);

        backButton.redraw = (hovered = false) => {
            backFocus.clear();
            if (backButton._focused) {
                backFocus.roundRect(-5, -5, buttonWidth + 10, buttonHeight + 10, 8);
                backFocus.stroke({ color: 0xffef7e, width: 2, alpha: 0.88 });
            }
            backBg.clear();
            backBg.roundRect(0, 0, buttonWidth, buttonHeight, 5);
            backBg.fill({ color: hovered ? 0x0b6f8f : 0x07334e, alpha: 0.92 });
            backBg.stroke({ color: hovered || backButton._focused ? 0xffffff : accent, width: 2, alpha: 0.94 });
            backBg.rect(10, 7, buttonWidth - 20, 2);
            backBg.fill({ color: 0xff55d9, alpha: 0.38 });
        };
        backButton.redraw(false);
        backButton.on('pointerover', () => {
            this.setButtonFocus(0);
            playMenuFocusSfx(0.09);
            backButton.redraw(true);
        });
        backButton.on('pointerout', () => backButton.redraw(false));
        backButton.on('pointerdown', () => {
            playMenuConfirmSfx(0.14);
            this.goBack();
        });
        this.container.addChild(backButton);

        // Start button
        const startButton = new PIXI.Container();
        startButton.position.set(panelX + panelWidth / 2 + spacing / 2, buttonY);
        startButton.eventMode = 'static';
        startButton.cursor = 'pointer';
        startButton.activate = () => this.startGame();

        const startFocus = new PIXI.Graphics();
        const startBg = new PIXI.Graphics();
        const locked = !isShipUnlocked(this.spriteKey, this.unlockProgress);
        startButton.addChild(startFocus, startBg);

        const startText = createText(locked ? 'LOCKED' : 'START GAME', {
            fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
            fontSize: isMobile ? 18 : 22,
            fill: locked ? '#ffcc00' : '#081522',
            fontWeight: 'bold'
        });
        startText.anchor.set(0.5);
        startText.position.set(buttonWidth / 2, buttonHeight / 2);
        startButton.addChild(startText);

        startButton.redraw = (hovered = false) => {
            startFocus.clear();
            if (startButton._focused) {
                startFocus.roundRect(-5, -5, buttonWidth + 10, buttonHeight + 10, 8);
                startFocus.stroke({ color: 0xffef7e, width: 2, alpha: 0.88 });
            }
            startBg.clear();
            startBg.roundRect(0, 0, buttonWidth, buttonHeight, 5);
            startBg.fill({ color: locked ? 0x2a2134 : (hovered ? 0xffef7e : 0xffd15c), alpha: 0.96 });
            startBg.stroke({ color: hovered || startButton._focused ? 0xffffff : accent, width: 2, alpha: 0.95 });
            startBg.rect(10, 7, buttonWidth - 20, 2);
            startBg.fill({ color: locked ? 0xff55d9 : 0x00eaff, alpha: 0.42 });
        };
        startButton.redraw(false);
        startButton.on('pointerover', () => {
            this.setButtonFocus(1);
            playMenuFocusSfx(0.09);
            startButton.redraw(true);
        });
        startButton.on('pointerout', () => startButton.redraw(false));
        startButton.on('pointerdown', () => {
            playMenuConfirmSfx(0.18);
            this.startGame();
        });
        this.container.addChild(startButton);

        this.backButton = backButton;
        this.startButton = startButton;
        this.buttons = [backButton, startButton];
        this.setButtonFocus(locked ? 0 : 1);
    }

    setupInput() {
        this.keyHandler = (e) => {
            if (this.launchModeOverlay) {
                this.launchModeOverlay.handleKey(e);
            } else if (e.key === 'Escape') {
                this.goBack();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                this.setButtonFocus(this.focusedButtonIndex === 0 ? 1 : 0);
            } else if (e.key === 'Enter') {
                this.buttons[this.focusedButtonIndex]?.activate?.();
            }
        };

        window.addEventListener('keydown', this.keyHandler);
    }

    setButtonFocus(index) {
        if (!this.buttons?.length) return;
        const next = ((index % this.buttons.length) + this.buttons.length) % this.buttons.length;
        this.buttons.forEach((button, buttonIndex) => {
            button._focused = buttonIndex === next;
            button.redraw?.(false);
        });
        if (next !== this.focusedButtonIndex) playMenuFocusSfx(0.08);
        this.focusedButtonIndex = next;
    }

    update(delta = 1) {
        updateMenuFx(this, delta);
        const nav = this.gamepadNavigator.update();
        if (!nav.connected || !nav.active) return;
        if (this.launchModeOverlay) {
            this.launchModeOverlay.handleGamepad(nav);
            return;
        }
        if (nav.pressed.left || nav.pressed.right) this.setButtonFocus(this.focusedButtonIndex === 0 ? 1 : 0);
        if (nav.pressed.confirm) {
            playMenuConfirmSfx(0.16);
            this.buttons[this.focusedButtonIndex]?.activate?.();
        }
        if (nav.pressed.cancel || nav.pressed.back || nav.pressed.menu) this.goBack();
    }

    goBack() {
        console.log('[ShipDetails] Going back to ship select');
        this.game.showShipSelect();
    }

    startGame() {
        if (!isShipUnlocked(this.spriteKey, this.unlockProgress) || this.launchInProgress || this.launchModeOverlay) return;
        this.launchModeOverlay = new HangarLaunchModeOverlay({
            parent: this.container,
            width: this.game.getWidth(),
            height: this.game.getHeight(),
            shipName: this.ship?.name,
            onLaunch: (runMode) => this.startGameInMode(runMode),
            onCancel: () => this.closeLaunchModeOverlay()
        });
        this.gamepadNavigator.suppressUntilReleased();
    }

    closeLaunchModeOverlay() {
        this.launchModeOverlay?.destroy();
        this.launchModeOverlay = null;
        this.gamepadNavigator.suppressUntilReleased();
    }

    startGameInMode(runMode = RUN_MODES.MAYHEM_TACTICAL) {
        if (!isShipUnlocked(this.spriteKey, this.unlockProgress) || this.launchInProgress) return;
        this.launchInProgress = true;
        this.closeLaunchModeOverlay();
        console.log(`[ShipDetails] Starting ${runMode} with ship:`, this.spriteKey);
        Promise.resolve(this.game.startGame(this.spriteKey, { runMode })).catch((error) => {
            this.launchInProgress = false;
            console.error('[ShipDetails] Failed to start selected ship:', error);
        });
    }

    cleanup() {
        this.closeLaunchModeOverlay();
        if (this.keyHandler) {
            window.removeEventListener('keydown', this.keyHandler);
        }
        destroyMenuFx(this);
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
