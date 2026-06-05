import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BonusAsset } from '../utils/BonusAsset.js';
import {
  getSelectableShips,
  getDefaultShipKey,
  getShipUnlockLabel,
  getShipUnlockProgressDetails,
  getShipUnlockProgress,
  isShipUnlocked,
  isValidShipKey,
  resolveShipKey
} from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';
import { AudioManager } from '../audio/AudioManager.js';
import { createText } from '../utils/pixiText.js';
import { EXIT_GAME_WEB_MESSAGE, requestExitGame } from '../utils/ExitGame.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { computeShipStatRanges, createShipStatPanel, getShipCombatRole } from '../ui/ShipStatPanel.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { getTraitHudHint } from '../config/ShipTraitDescriptions.js';
import { MAX_RANK_INDEX, getPilotRankProgress, getRankTitle } from '../shared/RankPolicy.js';
import { translateText } from '../i18n/index.js';

const STORAGE_KEY = 'burt.selectedShip.v1';
const DEBUG = false; // Set to true to enable debug logs
const FONT_BODY = 'Rajdhani, Orbitron, Bahnschrift, sans-serif';
const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, sans-serif';
const CAREER_INTEL_BODY = 'Your career profile grows between runs. Score, sectors, bosses, Codex discoveries, clean waves, and clears feed Career XP.';
const CAREER_INTEL_RANK_COPY = 'Pilot Rank is your long-term arcade signal. Rank progress unlocks achievements and helps open the hangar.';
const CAREER_INTEL_HANGAR_COPY = 'Ship unlocks read milestones from this profile, so even a failed run can move the roster forward.';
const CAREER_INTEL_CODEX_COPY = 'Codex scans are discoveries from your own profile. New threats are knowledge, score, XP, and future ship progress.';
const CAREER_INTEL_KICKER = 'PILOT DOSSIER // LIVE ARCADE SIGNAL';
const CAREER_INTEL_VALUE = 'EVERY RUN LEAVES A RECEIPT';
const CAREER_INTEL_FLOW = 'CAREER XP FLOW';

function getDisplayRankNumber(rankIndex) {
  return Math.min(MAX_RANK_INDEX + 1, Math.max(1, Math.floor(Number(rankIndex) || 0) + 1));
}

function fitDisplayToBox(display, maxWidth, maxHeight, { minScale = 0.5, maxScale = 1 } = {}) {
  if (!display || !maxWidth || !maxHeight) return 1;
  const width = Math.max(1, display.width || 1);
  const height = Math.max(1, display.height || 1);
  const scale = Math.max(minScale, Math.min(maxScale, maxWidth / width, maxHeight / height));
  display.scale.set(scale);
  return scale;
}

function hexColor(color) {
  return `#${Number(color || 0xffffff).toString(16).padStart(6, '0')}`;
}

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
    this.statRanges = computeShipStatRanges(this.ships);
    this.baseOrder = [...new Set(this.ships.map(ship => ship.baseId).filter(Boolean))];
    this.unlockProgress = getShipUnlockProgress();
    this.launchInProgress = false;
    this.backButton = null;
    this.hangarMenuOverlay = null;
    this.careerInfoOverlay = null;
    this.careerInfoDebugState = null;
    this.careerInfoAnimatedNodes = [];
    this.careerInfoTicker = null;
    this.careerSignalTicker = null;
    this.overlayButtons = [];
    this.overlayFocusedIndex = 0;
    this.mainMenuButtonFocused = false;
    this.gamepadMenuWasPressed = false;
    this.gamepadActionWasPressed = false;
    this.gamepadCancelWasPressed = false;
    this.gamepadVerticalWasPressed = false;
    this.gamepadNavigator = new GamepadNavigator();
    this.exitNoticeTimeout = null;

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
    this.gamepadNavigator.suppressUntilReleased();
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

    this.layout = {
      width,
      height,
      isMobile: width < 640,
      showSideIntel: width >= 980,
      showLeftIntel: width >= 1120
    };

    this.createHangarFrame(width, height);
    this.createHeader(width, height);
    this.createBackButton(width, height);

    // Carousel container
    const carouselY = this.layout.isMobile ? 120 : 108;
    const carouselHeight = height - (this.layout.isMobile ? 250 : 214);

    this.carouselContainer = new PIXI.Container();
    this.carouselContainer.y = carouselY + carouselHeight * (this.layout.isMobile ? 0.43 : 0.45);
    this.carouselContainer.x = width / 2; // Center horizontally
    this.carouselContainer.sortableChildren = true;
    this.container.addChild(this.carouselContainer);

    // Create ship carousel
    await this.createShipCarousel(width, carouselHeight);
    this.createIntelPanels(width, height);
    this.createRosterStrip(width, height);
    this.createNavArrows(width, height);

    // Fixed footer
    const footerContainer = new PIXI.Container();
    const instructions = createText(
      translateText('ARROWS/STICK: SHIP  |  A/ENTER: LAUNCH  |  X: DETAILS  |  Y/R: RANDOM  |  B/ESC: BACK'),
      {
        fontFamily: FONT_BODY,
        fontSize: this.layout.isMobile ? 11 : 14,
        fill: '#ccefff',
        align: 'center'
      }
    );
    instructions.anchor.set(0.5, 1);
    instructions.position.set(width / 2, height - 12);
    footerContainer.addChild(instructions);
    this.footerInstructions = instructions;
    this.container.addChild(footerContainer);

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
    this.menuInputTicker = () => this.pollHangarMenuGamepad();
    this.game.app.ticker.add(this.menuInputTicker);
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

  createHangarFrame(width, height) {
    const frame = new PIXI.Graphics();
    const top = this.layout.isMobile ? 108 : 96;
    const bottom = height - (this.layout.isMobile ? 146 : 124);
    const centerX = width / 2;

    frame.rect(0, 0, width, height);
    frame.fill({ color: 0x01040a, alpha: 0.18 });

    for (let i = 0; i < 9; i += 1) {
      const y = top + i * ((bottom - top) / 8);
      const alpha = i % 2 === 0 ? 0.18 : 0.08;
      frame.moveTo(0, y);
      frame.lineTo(width, y);
      frame.stroke({ color: 0x2deeff, width: 1, alpha });
    }

    for (let i = -5; i <= 5; i += 1) {
      const x = centerX + i * Math.min(94, width / 10);
      frame.moveTo(x, top);
      frame.lineTo(x + i * 18, bottom);
      frame.stroke({ color: 0x66ffdd, width: 1, alpha: i === 0 ? 0.22 : 0.08 });
    }

    frame.ellipse(centerX, bottom + 30, Math.min(width * 0.34, 360), 82);
    frame.stroke({ color: 0x00ffcc, width: 2, alpha: 0.36 });
    frame.ellipse(centerX, bottom + 30, Math.min(width * 0.22, 250), 50);
    frame.stroke({ color: 0xffd166, width: 1, alpha: 0.22 });
    this.container.addChild(frame);
  }

  createHeader(width, height) {
    const headerContainer = new PIXI.Container();
    const capWidth = Math.min(width - 32, this.layout.isMobile ? 420 : 760);
    const cap = new PIXI.Graphics();
    cap.roundRect(-capWidth / 2, 12, capWidth, this.layout.isMobile ? 78 : 84, 8);
    cap.fill({ color: 0x020916, alpha: 0.74 });
    cap.stroke({ color: 0x00ffcc, width: 1.5, alpha: 0.52 });
    cap.rect(-capWidth / 2 + 2, 14, capWidth - 4, 18);
    cap.fill({ color: 0x00ffcc, alpha: 0.08 });
    cap.x = width / 2;
    headerContainer.addChild(cap);

    const title = createText('NOVA SWARM HANGAR', {
      fontFamily: FONT_DISPLAY,
      fontSize: this.layout.isMobile ? 24 : 34,
      fill: '#f4fbff',
      stroke: '#001018',
      strokeThickness: 5,
      dropShadow: true,
      dropShadowColor: '#00ffcc',
      dropShadowBlur: 8,
      dropShadowDistance: 0,
      fontWeight: '900',
      letterSpacing: 0
    });
    title.anchor.set(0.5, 0);
    title.position.set(width / 2, 20);
    headerContainer.addChild(title);

    const subtitle = createText('Pick the hull, read the trait, launch the next run.', {
      fontFamily: FONT_BODY,
      fontSize: this.layout.isMobile ? 12 : 15,
      fill: '#9ceeff',
      align: 'center',
      fontWeight: '700'
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(width / 2, this.layout.isMobile ? 52 : 58);
    headerContainer.addChild(subtitle);

    this.selectionInfoText = createText('', {
      fontFamily: FONT_BODY,
      fontSize: this.layout.isMobile ? 12 : 14,
      fill: '#ffef7e',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2,
      fontWeight: '900'
    });
    this.selectionInfoText.anchor.set(0.5, 0);
    this.selectionInfoText.position.set(width / 2, this.layout.isMobile ? 75 : 82);
    headerContainer.addChild(this.selectionInfoText);

    this.container.addChild(headerContainer);
    this.updateSelectionInfo();
  }

  createBackButton(width, height) {
    const isMobile = width < 640;
    const buttonWidth = isMobile ? 132 : 154;
    const buttonHeight = isMobile ? 34 : 38;
    const buttonX = isMobile ? 14 : 28;
    const buttonY = height - (isMobile ? 58 : 64);

    this.backButton = new PIXI.Container();
    this.backButton.label = 'ui_hangarBackButton';
    this.backButton.position.set(buttonX, buttonY);
    this.backButton.eventMode = 'static';
    this.backButton.cursor = 'pointer';
    this.backButton.hitArea = new PIXI.Rectangle(0, 0, buttonWidth, buttonHeight);
    this.backButton.hovered = false;
    this.backButton.active = false;

    const drawButton = () => {
      const hovered = Boolean(this.backButton.hovered);
      const focused = Boolean(this.mainMenuButtonFocused);
      const active = Boolean(this.backButton.active);
      bg.clear();
      bg.roundRect(0, 0, buttonWidth, buttonHeight, 7);
      bg.fill({ color: active ? 0x1d6a77 : (hovered || focused ? 0x103a54 : 0x06172d), alpha: hovered || focused ? 0.94 : 0.84 });
      bg.stroke({ color: hovered || focused ? 0xffffff : 0x2deeff, width: hovered || focused ? 2.5 : 1.5, alpha: hovered || focused ? 0.95 : 0.76 });
      bg.rect(7, 6, 4, buttonHeight - 12);
      bg.fill({ color: 0xff55d9, alpha: hovered || focused ? 0.9 : 0.58 });
      bg.rect(buttonWidth - 11, 6, 4, buttonHeight - 12);
      bg.fill({ color: 0xffd15c, alpha: hovered || focused ? 0.82 : 0.5 });
      bg.moveTo(20, buttonHeight - 6);
      bg.lineTo(buttonWidth - 20, buttonHeight - 6);
      bg.stroke({ color: 0x7fffd8, width: 1, alpha: hovered || focused ? 0.42 : 0.18 });

      focusRing.clear();
      if (focused) {
        focusRing.roundRect(-5, -5, buttonWidth + 10, buttonHeight + 10, 9);
        focusRing.stroke({ color: 0xffef7e, width: 2, alpha: 0.86 });
      }
    };

    const bg = new PIXI.Graphics();
    const focusRing = new PIXI.Graphics();
    this.backButton.addChild(focusRing);
    this.backButton.addChild(bg);
    drawButton();

    const label = createText(translateText('BACK'), {
      fontFamily: FONT_BODY,
      fontSize: isMobile ? 12 : 15,
      fill: '#f4fbff',
      fontWeight: '900',
      letterSpacing: 0
    });
    label.anchor.set(0.5);
    label.position.set(buttonWidth / 2, buttonHeight / 2);
    this.backButton.addChild(label);
    this.backButton.redraw = drawButton;

    this.backButton.on('pointerdown', (e) => {
      e.stopPropagation();
      this.backButton.active = true;
      drawButton();
      AudioManager.playSfx('powerup', { force: true, volume: 0.24 });
    });
    this.backButton.on('pointerup', (e) => {
      e.stopPropagation();
      this.backButton.active = false;
      drawButton();
      this.openHangarMenu('button');
    });
    this.backButton.on('pointerupoutside', () => {
      this.backButton.active = false;
      drawButton();
    });
    this.backButton.on('pointerover', () => {
      this.backButton.hovered = true;
      this.setMainMenuButtonFocus(true);
      AudioManager.playSfx('thrusterFire', { volume: 0.08 });
    });
    this.backButton.on('pointerout', () => {
      this.backButton.hovered = false;
      drawButton();
    });

    this.container.addChild(this.backButton);
  }

  setMainMenuButtonFocus(focused) {
    this.mainMenuButtonFocused = Boolean(focused);
    this.backButton?.redraw?.();
  }

  openHangarMenu(source = 'unknown') {
    if (this.launchInProgress) return;

    this.setMainMenuButtonFocus(true);
    if (!this.hangarMenuOverlay) {
      this.createHangarMenuOverlay(this.game.getWidth(), this.game.getHeight());
    }

    this.hangarMenuOverlay.visible = true;
    this.setOverlayFocus(0);
    this.showHangarMenuNotice('');
    AudioManager.playSfx('pause_in', { force: true, volume: source === 'button' ? 0.32 : 0.4 });
  }

  closeHangarMenu(source = 'unknown') {
    if (!this.hangarMenuOverlay?.visible) return;
    this.hangarMenuOverlay.visible = false;
    this.showHangarMenuNotice('');
    AudioManager.playSfx('pause_out', { force: true, volume: source === 'keyboard' ? 0.28 : 0.24 });
  }

  createHangarMenuOverlay(width, height) {
    const overlay = new PIXI.Container();
    overlay.label = 'ui_hangarMenuOverlay';
    overlay.visible = false;
    overlay.zIndex = 1000000;

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x020713, alpha: 0.72 });
    overlay.addChild(dim);

    const panelWidth = Math.min(460, width * 0.78);
    const panelHeight = 318;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x06111f, alpha: 0.95 });
    panel.stroke({ color: 0x00ffff, width: 2, alpha: 0.88 });
    panel.rect(panelX + 12, panelY + 12, 5, panelHeight - 24);
    panel.fill({ color: 0xff55d9, alpha: 0.58 });
    panel.rect(panelX + panelWidth - 17, panelY + 12, 5, panelHeight - 24);
    panel.fill({ color: 0xffd15c, alpha: 0.48 });
    overlay.addChild(panel);

    const title = createText('HANGAR MENU', {
      fontFamily: FONT_DISPLAY,
      fontSize: width < 640 ? 28 : 34,
      fontWeight: '900',
      fill: '#f6fbff',
      stroke: '#003344',
      strokeThickness: 4,
      align: 'center',
      letterSpacing: 0
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, panelY + 54);
    overlay.addChild(title);

    const subtitle = createText('SHIP SELECTION ON HOLD', {
      fontFamily: FONT_BODY,
      fontSize: 14,
      fontWeight: '800',
      fill: '#7ee9ff',
      align: 'center'
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(width / 2, panelY + 88);
    overlay.addChild(subtitle);

    this.overlayButtons = [
      this.createHangarMenuOption('resume', 'RESUME', width / 2, panelY + 134, 0, () => this.closeHangarMenu('overlay')),
      this.createHangarMenuOption('mainMenu', 'MAIN MENU', width / 2, panelY + 184, 1, () => this.returnToMenu('overlay')),
      this.createHangarMenuOption('exitGame', 'EXIT GAME', width / 2, panelY + 234, 2, () => this.exitGameFromHangar())
    ];
    this.overlayButtons.forEach(button => overlay.addChild(button));

    this.overlayNoticeText = createText('', {
      fontFamily: FONT_BODY,
      fontSize: 13,
      fontWeight: '800',
      fill: '#ffef7e',
      align: 'center'
    });
    this.overlayNoticeText.anchor.set(0.5);
    this.overlayNoticeText.position.set(width / 2, panelY + panelHeight - 28);
    overlay.addChild(this.overlayNoticeText);

    this.hangarMenuOverlay = overlay;
    this.container.addChild(overlay);
  }

  createHangarMenuOption(id, label, x, y, index, onPress) {
    const button = new PIXI.Container();
    button.label = `ui_hangarMenuOption_${id}`;
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.id = id;
    button.activate = onPress;

    const width = 260;
    const height = 38;
    button.hitArea = new PIXI.Rectangle(-width / 2, -height / 2, width, height);

    const bg = new PIXI.Graphics();
    const focus = new PIXI.Graphics();
    button.addChild(focus);
    button.addChild(bg);

    button.redraw = () => {
      const hovered = Boolean(button.hovered);
      const focused = this.overlayFocusedIndex === index;
      const active = Boolean(button.active);
      bg.clear();
      bg.roundRect(-width / 2, -height / 2, width, height, 6);
      bg.fill({ color: active ? 0x1d6a77 : (hovered || focused ? 0x0b6f8f : 0x07334e), alpha: hovered || focused ? 0.92 : 0.84 });
      bg.stroke({ color: hovered || focused ? 0xffffff : 0x00ffff, width: hovered || focused ? 2 : 1, alpha: 0.95 });
      bg.rect(-width / 2 + 9, -height / 2 + 7, 4, height - 14);
      bg.fill({ color: id === 'exitGame' ? 0xffd15c : 0xff55d9, alpha: hovered || focused ? 0.86 : 0.52 });

      focus.clear();
      if (focused) {
        focus.roundRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, 8);
        focus.stroke({ color: 0xffef7e, width: 2, alpha: 0.82 });
      }
    };

    const text = createText(label, {
      fontFamily: FONT_BODY,
      fontSize: 18,
      fontWeight: '900',
      fill: '#ffffff',
      letterSpacing: 0
    });
    text.anchor.set(0.5);
    button.addChild(text);
    button.position.set(x, y);
    button.redraw();

    button.on('pointerover', () => {
      button.hovered = true;
      this.setOverlayFocus(index);
      AudioManager.playSfx('thrusterFire', { volume: 0.07 });
    });
    button.on('pointerout', () => {
      button.hovered = false;
      button.redraw();
    });
    button.on('pointerdown', (e) => {
      e.stopPropagation();
      button.active = true;
      button.redraw();
    });
    button.on('pointerup', (e) => {
      e.stopPropagation();
      button.active = false;
      button.redraw();
      button.activate();
    });
    button.on('pointerupoutside', () => {
      button.active = false;
      button.redraw();
    });

    return button;
  }

  setOverlayFocus(index) {
    if (!this.overlayButtons?.length) return;
    const count = this.overlayButtons.length;
    this.overlayFocusedIndex = (index + count) % count;
    this.overlayButtons.forEach(button => button.redraw?.());
  }

  activateOverlayFocus() {
    const button = this.overlayButtons?.[this.overlayFocusedIndex];
    if (!button?.activate) return;
    AudioManager.playSfx('powerup', { force: true, volume: 0.26 });
    button.activate();
  }

  showHangarMenuNotice(message) {
    if (!this.overlayNoticeText) return;
    this.overlayNoticeText.text = message || '';
    this.overlayNoticeText.alpha = message ? 1 : 0;
    this.overlayNoticeText.updateText?.(false);

    if (this.exitNoticeTimeout) {
      clearTimeout(this.exitNoticeTimeout);
      this.exitNoticeTimeout = null;
    }
    if (message) {
      this.exitNoticeTimeout = setTimeout(() => {
        this.showHangarMenuNotice('');
      }, 2600);
    }
  }

  openCareerInfoOverlay(source = 'unknown') {
    if (!this.careerInfoOverlay) {
      this.createCareerInfoOverlay(this.game.getWidth(), this.game.getHeight());
    }
    this.careerInfoOverlay.visible = true;
    AudioManager.playSfx('powerup', { force: true, volume: source === 'pointer' ? 0.18 : 0.22 });
  }

  closeCareerInfoOverlay(source = 'unknown') {
    if (!this.careerInfoOverlay?.visible) return;
    this.careerInfoOverlay.visible = false;
    AudioManager.playSfx('pause_out', { force: true, volume: source === 'keyboard' ? 0.24 : 0.2 });
  }

  createCareerStatTile(label, value, x, y, width, height, accent, compact = false) {
    const tile = new PIXI.Container();
    tile.label = `ui_careerIntelTile_${label}`;
    tile.position.set(x, y);

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, width, height, 7);
    bg.fill({ color: 0x061827, alpha: 0.9 });
    bg.stroke({ color: accent, width: 1.4, alpha: 0.72 });
    bg.rect(0, 0, width, 4);
    bg.fill({ color: accent, alpha: 0.82 });
    tile.addChild(bg);

    const valueText = createText(String(value), {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 15 : 20,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#020711',
      strokeThickness: 3,
      align: 'left',
      letterSpacing: 0
    });
    valueText.position.set(12, compact ? 12 : 14);
    fitDisplayToBox(valueText, width - 24, compact ? 22 : 28, { minScale: 0.58 });

    const labelText = createText(translateText(label), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 9 : 11,
      fontWeight: '900',
      fill: hexColor(accent),
      align: 'left',
      letterSpacing: 0
    });
    labelText.position.set(12, height - (compact ? 19 : 22));
    fitDisplayToBox(labelText, width - 24, compact ? 16 : 18, { minScale: 0.54 });
    tile.addChild(valueText, labelText);
    return tile;
  }

  createCareerCopyCard(heading, copy, x, y, width, height, accent, compact = false) {
    const card = new PIXI.Container();
    card.position.set(x, y);
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, width, height, 8);
    bg.fill({ color: 0x071b2a, alpha: 0.88 });
    bg.stroke({ color: accent, width: 1.5, alpha: 0.72 });
    bg.rect(0, 0, 7, height);
    bg.fill({ color: accent, alpha: 0.84 });
    bg.rect(width - 18, 10, 8, 8);
    bg.stroke({ color: accent, width: 1.2, alpha: 0.68 });
    card.addChild(bg);

    const h = createText(translateText(heading), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 11 : 13,
      fontWeight: '900',
      fill: hexColor(accent),
      letterSpacing: 0
    });
    h.position.set(18, 10);
    fitDisplayToBox(h, width - 44, compact ? 18 : 20, { minScale: 0.56 });

    const p = createText(translateText(copy), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 9 : 11,
      fontWeight: '700',
      fill: '#d8fbff',
      wordWrap: true,
      wordWrapWidth: width - 30,
      lineHeight: compact ? 11 : 14,
      letterSpacing: 0
    });
    p.position.set(18, compact ? 30 : 34);
    fitDisplayToBox(p, width - 30, height - (compact ? 36 : 42), { minScale: 0.7 });
    card.addChild(h, p);
    return card;
  }

  startCareerInfoAnimation() {
    if (this.careerInfoTicker) return;
    this.careerInfoTicker = () => {
      if (!this.careerInfoOverlay?.visible) return;
      const now = Date.now();
      const pulse = Math.sin(now * 0.004) * 0.5 + 0.5;
      this.careerInfoAnimatedNodes.forEach((entry) => {
        if (!entry?.node || entry.node.destroyed) return;
        if (entry.kind === 'scan') {
          entry.node.y = entry.baseY + ((now * entry.speed) % Math.max(1, entry.range));
          entry.node.alpha = 0.16 + pulse * 0.22;
        } else if (entry.kind === 'ring') {
          entry.node.rotation += entry.speed;
          entry.node.alpha = 0.42 + pulse * 0.22;
        } else if (entry.kind === 'pulse') {
          const scale = entry.baseScale + pulse * entry.amount;
          entry.node.scale.set(scale);
          entry.node.alpha = entry.baseAlpha + pulse * entry.amount;
        }
      });
    };
    this.game.app.ticker.add(this.careerInfoTicker);
  }

  getCareerInfoDebugState(getBounds) {
    const bounds = typeof getBounds === 'function' ? getBounds : () => null;
    const refs = this.careerInfoRefs || {};
    return {
      visible: Boolean(this.careerInfoOverlay?.visible),
      panel: refs.panelBounds || null,
      title: bounds(refs.title),
      rankGauge: bounds(refs.rankGauge),
      valueChip: bounds(refs.valueChip),
      body: bounds(refs.body),
      flowBar: bounds(refs.flowBar),
      stats: (refs.stats || []).map((tile) => bounds(tile)),
      cards: (refs.cards || []).map((card) => bounds(card)),
      snapshot: bounds(refs.snapshot),
      backButton: bounds(refs.close)
    };
  }

  createCareerInfoOverlay(width, height) {
    const overlay = new PIXI.Container();
    overlay.label = 'ui_careerInfoOverlay';
    overlay.visible = false;
    overlay.zIndex = 1000001;
    overlay.eventMode = 'static';
    overlay.hitArea = new PIXI.Rectangle(0, 0, width, height);
    this.careerInfoAnimatedNodes = [];

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x010711, alpha: 0.82 });
    overlay.addChild(dim);

    const narrow = width < 720;
    const short = height < 620;
    const compact = narrow || short;
    const panelWidth = Math.min(compact ? width - 22 : 900, width - 28);
    const panelHeight = Math.min(compact ? height - 18 : 560, height - 22);
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const progress = getPilotRankProgress(this.unlockProgress.pilotXp || 0);
    const rankProgress = Math.max(0, Math.min(1, Number(progress.progress) || 0));
    const displayRank = getDisplayRankNumber(progress.rankIndex);
    const nextRank = progress.rankIndex >= MAX_RANK_INDEX
      ? translateText('MAX')
      : getRankTitle(Math.min(MAX_RANK_INDEX, progress.rankIndex + 1)).toUpperCase();
    const unlockedCount = this.ships.filter(candidate => isShipUnlocked(candidate.spriteKey, this.unlockProgress)).length;

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 9);
    panel.fill({ color: 0x03101f, alpha: 0.985 });
    panel.stroke({ color: 0x66ffdd, width: 2, alpha: 0.95 });
    panel.roundRect(panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20, 7);
    panel.stroke({ color: 0xff55d9, width: 1.4, alpha: 0.55 });
    panel.rect(panelX + 18, panelY + 16, 5, panelHeight - 32);
    panel.fill({ color: 0xffd15c, alpha: 0.92 });
    panel.rect(panelX + panelWidth - 23, panelY + 16, 5, panelHeight - 32);
    panel.fill({ color: 0x37f5ff, alpha: 0.68 });
    for (let i = 0; i < 11; i += 1) {
      const y = panelY + 74 + i * 36;
      panel.moveTo(panelX + 30, y);
      panel.lineTo(panelX + panelWidth - 30, y + 12);
    }
    panel.stroke({ color: 0x37f5ff, width: 1, alpha: 0.07 });
    overlay.addChild(panel);

    const sweep = new PIXI.Graphics();
    sweep.rect(panelX + 30, 0, panelWidth - 60, 3);
    sweep.fill({ color: 0x9cfbff, alpha: 0.85 });
    overlay.addChild(sweep);
    this.careerInfoAnimatedNodes.push({ node: sweep, kind: 'scan', baseY: panelY + 58, range: panelHeight - 116, speed: compact ? 0.18 : 0.14 });

    const kicker = createText(translateText(CAREER_INTEL_KICKER), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 10 : 12,
      fontWeight: '900',
      fill: '#ffef7e',
      align: 'center',
      letterSpacing: 0
    });
    kicker.anchor.set(0.5, 0);
    kicker.position.set(width / 2, panelY + (compact ? 18 : 22));
    fitDisplayToBox(kicker, panelWidth - 90, compact ? 16 : 18, { minScale: 0.55 });
    overlay.addChild(kicker);

    const title = createText(translateText('CAREER INTEL'), {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 28 : 38,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#003344',
      strokeThickness: compact ? 4 : 5,
      align: 'center',
      letterSpacing: 0
    });
    title.anchor.set(0.5, 0);
    title.position.set(width / 2, kicker.y + (compact ? 16 : 18));
    title.style.dropShadow = true;
    title.style.dropShadowColor = '#37f5ff';
    title.style.dropShadowBlur = 10;
    fitDisplayToBox(title, panelWidth - 84, compact ? 40 : 52, { minScale: 0.58 });
    overlay.addChild(title);

    const valueChip = new PIXI.Container();
    valueChip.position.set(width / 2, title.y + (compact ? 43 : 54));
    const valueBg = new PIXI.Graphics();
    valueBg.roundRect(-Math.min(310, panelWidth - 92) / 2, -12, Math.min(310, panelWidth - 92), 24, 6);
    valueBg.fill({ color: 0x2a1744, alpha: 0.86 });
    valueBg.stroke({ color: 0xff55d9, width: 1.2, alpha: 0.75 });
    valueChip.addChild(valueBg);
    const valueText = createText(translateText(CAREER_INTEL_VALUE), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 10 : 12,
      fontWeight: '900',
      fill: '#fff3a2',
      align: 'center',
      letterSpacing: 0
    });
    valueText.anchor.set(0.5);
    fitDisplayToBox(valueText, Math.min(282, panelWidth - 118), 16, { minScale: 0.54 });
    valueChip.addChild(valueText);
    overlay.addChild(valueChip);

    const contentTop = panelY + (compact ? 108 : 126);
    const leftW = compact ? Math.min(220, panelWidth - 72) : 250;
    const leftX = panelX + 40;
    const gauge = new PIXI.Container();
    gauge.label = 'ui_careerIntelRankGauge';
    gauge.position.set(narrow ? width / 2 : leftX + leftW / 2, contentTop + (compact ? 64 : 82));
    const gaugeRadius = compact ? 58 : 78;
    const ring = new PIXI.Graphics();
    ring.circle(0, 0, gaugeRadius + 18);
    ring.stroke({ color: 0xff55d9, width: 1.4, alpha: 0.38 });
    ring.circle(0, 0, gaugeRadius + 6);
    ring.stroke({ color: 0x37f5ff, width: 2, alpha: 0.44 });
    ring.arc(0, 0, gaugeRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * rankProgress);
    ring.stroke({ color: 0xffef7e, width: compact ? 8 : 10, alpha: 0.95 });
    ring.arc(0, 0, gaugeRadius - 14, -Math.PI / 2, Math.PI * 1.5);
    ring.stroke({ color: 0x0b6f8f, width: 2, alpha: 0.62 });
    gauge.addChild(ring);
    this.careerInfoAnimatedNodes.push({ node: ring, kind: 'ring', speed: 0.006 });

    const rankNumber = createText(String(displayRank), {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 42 : 56,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#020711',
      strokeThickness: 5,
      align: 'center',
      letterSpacing: 0
    });
    rankNumber.anchor.set(0.5);
    rankNumber.y = -10;
    const rankLabel = createText(translateText('PILOT RANK'), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 10 : 12,
      fontWeight: '900',
      fill: '#9cfbff',
      align: 'center',
      letterSpacing: 0
    });
    rankLabel.anchor.set(0.5);
    rankLabel.y = compact ? 34 : 42;
    fitDisplayToBox(rankLabel, gaugeRadius * 1.6, 16, { minScale: 0.52 });
    gauge.addChild(rankNumber, rankLabel);
    overlay.addChild(gauge);

    const rightX = narrow ? panelX + 34 : leftX + leftW + 34;
    const rightW = narrow ? panelWidth - 68 : panelX + panelWidth - 42 - rightX;
    const body = createText(translateText(CAREER_INTEL_BODY), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 11 : 14,
      fontWeight: '800',
      fill: '#d8fbff',
      align: 'left',
      wordWrap: true,
      wordWrapWidth: rightW,
      lineHeight: compact ? 14 : 18,
      letterSpacing: 0
    });
    body.position.set(rightX, narrow ? contentTop + 134 : contentTop + 2);
    fitDisplayToBox(body, rightW, compact ? 46 : 58, { minScale: 0.72 });
    overlay.addChild(body);

    const flowY = narrow ? body.y + 52 : contentTop + (short ? 66 : 78);
    const flowBar = new PIXI.Container();
    flowBar.label = 'ui_careerIntelFlowBar';
    flowBar.position.set(rightX, flowY);
    const flowBg = new PIXI.Graphics();
    flowBg.roundRect(0, 0, rightW, compact ? 40 : 48, 7);
    flowBg.fill({ color: 0x020916, alpha: 0.86 });
    flowBg.stroke({ color: 0xffef7e, width: 1.2, alpha: 0.7 });
    const fillW = Math.max(12, (rightW - 18) * rankProgress);
    flowBg.roundRect(9, compact ? 23 : 29, rightW - 18, 8, 4);
    flowBg.fill({ color: 0x123044, alpha: 0.95 });
    flowBg.roundRect(9, compact ? 23 : 29, fillW, 8, 4);
    flowBg.fill({ color: 0xffef7e, alpha: 0.94 });
    flowBar.addChild(flowBg);
    const flowTitle = createText(translateText(CAREER_INTEL_FLOW), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 10 : 12,
      fontWeight: '900',
      fill: '#ffef7e',
      letterSpacing: 0
    });
    flowTitle.position.set(12, 8);
    const flowValueText = [`${Math.round(rankProgress * 100)}%`, translateText('TO'), nextRank].join(' ');
    const flowValue = createText(flowValueText, {
      fontFamily: FONT_BODY,
      fontSize: compact ? 10 : 12,
      fontWeight: '900',
      fill: '#ffffff',
      align: 'right',
      letterSpacing: 0
    });
    flowValue.anchor.set(1, 0);
    flowValue.position.set(rightW - 12, 8);
    fitDisplayToBox(flowValue, rightW * 0.48, 16, { minScale: 0.5 });
    flowBar.addChild(flowTitle, flowValue);
    overlay.addChild(flowBar);

    const statsTop = narrow ? flowY + 48 : contentTop + (short ? 132 : 146);
    const stats = [
      ['HULLS READY', `${unlockedCount}/${this.ships.length}`, 0x66ffdd],
      ['XP TO NEXT', Number(progress.xpToNextRank || 0).toLocaleString('en-US'), 0xffef7e],
      ['CODEX SCANS', this.unlockProgress.totalCodexDiscoveries || 0, 0xff55d9],
      ['BOSS RECEIPTS', this.unlockProgress.totalBossesDefeated || 0, 0xff8f5c],
      ['CLEAN WAVES', this.unlockProgress.noHitWaves || 0, 0x9cfbff],
      ['BEST SCORE', Number(this.unlockProgress.bestScore || 0).toLocaleString('en-US'), 0xffffff]
    ].slice(0, short && !narrow ? 3 : 6);
    const statGap = compact ? 7 : 9;
    const statCols = narrow ? 2 : 3;
    const statW = (panelWidth - 80 - statGap * (statCols - 1)) / statCols;
    const statH = compact ? 48 : 56;
    const statStartX = panelX + 40;
    const statTiles = stats.map(([label, value, accent], index) => {
      const col = index % statCols;
      const row = Math.floor(index / statCols);
      const tile = this.createCareerStatTile(label, value, statStartX + col * (statW + statGap), statsTop + row * (statH + statGap), statW, statH, accent, compact);
      overlay.addChild(tile);
      return tile;
    });

    const cardData = [
      ['EARN XP', CAREER_INTEL_CODEX_COPY, 0xffe76a],
      ['PILOT RANK', CAREER_INTEL_RANK_COPY, 0x66ffdd],
      ['HANGAR UNLOCKS', CAREER_INTEL_HANGAR_COPY, 0xff55d9]
    ];
    const cardGap = compact ? 7 : 10;
    const cardCols = narrow ? 1 : 3;
    const cardW = narrow ? panelWidth - 80 : (panelWidth - 80 - cardGap * 2) / 3;
    const cardH = narrow ? 44 : short ? 64 : 72;
    const cardTop = statsTop + Math.ceil(stats.length / statCols) * (statH + statGap) + (compact ? 8 : 14);
    const cards = cardData.map(([heading, copy, accent], index) => {
      const col = narrow ? 0 : index;
      const row = narrow ? index : 0;
      const card = this.createCareerCopyCard(heading, copy, panelX + 40 + col * (cardW + cardGap), cardTop + row * (cardH + 7), cardW, cardH, accent, compact);
      overlay.addChild(card);
      return card;
    });

    const snapshot = createText(
      `${translateText('PROFILE SNAPSHOT')}: ${translateText('RANK')} ${displayRank} / ${translateText('NEXT RANK')} ${nextRank} / ${translateText('TOTAL RUNS')} ${this.unlockProgress.totalRuns || 0} / ${translateText('BEST SECTOR')} ${this.unlockProgress.bestSector || 1}`,
      {
        fontFamily: FONT_BODY,
        fontSize: compact ? 9 : 12,
        fontWeight: '900',
        fill: '#fff3a2',
        align: 'center',
        wordWrap: true,
        wordWrapWidth: panelWidth - 90,
        lineHeight: compact ? 11 : 15,
        letterSpacing: 0
      }
    );
    snapshot.anchor.set(0.5, 1);
    snapshot.position.set(width / 2, cardTop - (compact ? 5 : 6));
    snapshot.visible = !short && !narrow && panelHeight >= 540;
    fitDisplayToBox(snapshot, panelWidth - 90, compact ? 24 : 30, { minScale: 0.58 });
    overlay.addChild(snapshot);

    const close = this.createHangarMenuOption('careerClose', translateText('BACK'), width / 2, panelY + panelHeight - 28, 0, () => this.closeCareerInfoOverlay('button'));
    close.redraw?.();
    overlay.addChild(close);

    overlay.on('pointerdown', (e) => {
      if (e.target === overlay || e.target === dim) {
        e.stopPropagation();
        this.closeCareerInfoOverlay('pointer');
      }
    });

    this.careerInfoRefs = {
      panelBounds: {
        x: Math.round(panelX),
        y: Math.round(panelY),
        width: Math.round(panelWidth),
        height: Math.round(panelHeight),
        right: Math.round(panelX + panelWidth),
        bottom: Math.round(panelY + panelHeight)
      },
      title,
      valueChip,
      rankGauge: gauge,
      body,
      flowBar,
      stats: statTiles,
      cards,
      snapshot,
      close
    };
    this.careerInfoOverlay = overlay;
    this.container.addChild(overlay);
    this.startCareerInfoAnimation();
  }

  async exitGameFromHangar() {
    try {
      const result = await requestExitGame();
      if (!result.ok) this.showHangarMenuNotice(result.message || EXIT_GAME_WEB_MESSAGE);
    } catch (e) {
      console.error('[ShipSelect] Exit Game Error:', e);
      this.showHangarMenuNotice(EXIT_GAME_WEB_MESSAGE);
    }
  }

  getHangarMenuDebugState(getBounds) {
    const bounds = typeof getBounds === 'function' ? getBounds : () => null;
    return {
      visible: Boolean(this.hangarMenuOverlay?.visible),
      mainMenuFocused: Boolean(this.mainMenuButtonFocused),
      focusedOption: this.overlayButtons?.[this.overlayFocusedIndex]?.id || null,
      notice: this.overlayNoticeText?.text || '',
      buttons: {
        resume: bounds(this.overlayButtons?.find(button => button.id === 'resume')),
        mainMenu: bounds(this.overlayButtons?.find(button => button.id === 'mainMenu')),
        exitGame: bounds(this.overlayButtons?.find(button => button.id === 'exitGame'))
      }
    };
  }

  createPanel(width, height, accent = 0x00ffcc) {
    const panel = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, width, height, 8);
    bg.fill({ color: 0x020916, alpha: 0.78 });
    bg.stroke({ color: accent, width: 1.5, alpha: 0.58 });
    bg.rect(1, 1, width - 2, 28);
    bg.fill({ color: accent, alpha: 0.1 });
    panel.addChild(bg);
    panel.bg = bg;
    return panel;
  }

  createIntelText(label, x, y, size = 13, fill = '#d8fbff', weight = '700') {
    const text = createText(label, {
      fontFamily: FONT_BODY,
      fontSize: size,
      fill,
      fontWeight: weight,
      wordWrap: true,
      wordWrapWidth: 210,
      lineHeight: Math.round(size * 1.24),
      letterSpacing: 0
    });
    text.position.set(x, y);
    return text;
  }

  createIntelPanels(width, height) {
    this.intelPanels = new PIXI.Container();
    this.container.addChild(this.intelPanels);

    if (this.layout.showLeftIntel) {
      const left = this.createPanel(230, 292, 0x66ffdd);
      left.position.set(22, 128);
      left.eventMode = 'static';
      left.cursor = 'pointer';
      left.hitArea = new PIXI.Rectangle(0, 0, 230, 292);
      left.on('pointerdown', (e) => {
        e.stopPropagation();
        this.openCareerInfoOverlay('pointer');
      });
      const alertGlow = new PIXI.Graphics();
      const rankRail = new PIXI.Graphics();
      const title = this.createIntelText('CAREER SIGNAL', 16, 12, 15, '#ffffff', '900');
      const count = this.createIntelText('', 16, 48, 16, '#ffef7e', '900');
      const progress = this.createIntelText('', 16, 96, 12, '#b8fff1');
      const stats = this.createIntelText('', 16, 176, 12, '#d8fbff');
      const hint = this.createIntelText('CLICK FOR CAREER INTEL', 16, 244, 12, '#ffef7e', '900');
      [progress, stats, hint].forEach(text => {
        text.style.wordWrapWidth = 196;
      });
      left.addChild(alertGlow, title, count, rankRail, progress, stats, hint);
      this.leftIntel = { panel: left, alertGlow, rankRail, count, progress, stats, hint };
      this.intelPanels.addChild(left);
    }

    if (this.layout.showSideIntel) {
      const right = this.createPanel(262, 380, 0xffd166);
      right.position.set(width - 284, 128);
      const title = this.createIntelText('COMBAT READOUT', 16, 10, 13, '#ffffff', '900');
      const role = this.createIntelText('', 16, 44, 17, '#ffef7e', '900');
      const weapon = this.createIntelText('', 16, 76, 13, '#d8fbff');
      const trait = this.createIntelText('', 16, 126, 13, '#9ceeff');
      const unlock = this.createIntelText('', 16, 302, 13, '#ffd166', '900');
      const statPanel = createShipStatPanel(this.ships[this.selectedIndex], {
        compact: true,
        width: 228,
        accent: 0xffd166,
        ranges: this.statRanges,
        title: 'LIVE TUNE'
      });
      statPanel.position.set(131, 186);
      right.addChild(title, role, weapon, trait, statPanel, unlock);
      this.rightIntel = { panel: right, role, weapon, trait, statPanel, unlock };
      this.intelPanels.addChild(right);
    }

    if (!this.layout.showSideIntel) {
      const strip = this.createPanel(Math.min(width - 24, 560), 82, 0x00ffcc);
      strip.position.set((width - strip.width) / 2, height - (this.layout.isMobile ? 224 : 204));
      const role = this.createIntelText('', 14, 10, this.layout.isMobile ? 13 : 15, '#ffef7e', '900');
      const weapon = this.createIntelText('', 14, 39, this.layout.isMobile ? 12 : 13, '#d8fbff');
      role.style.wordWrapWidth = strip.width - 28;
      weapon.style.wordWrapWidth = strip.width - 28;
      strip.addChild(role, weapon);
      this.compactIntel = { panel: strip, role, weapon };
      this.intelPanels.addChild(strip);
    }

    this.updateIntelPanels();
    this.shipCards.forEach((shipCard, index) => {
      if (shipCard.statPanel) {
        shipCard.statPanel.visible = index === this.selectedIndex && !this.layout.showSideIntel && !this.compactIntel;
      }
    });
  }

  createRosterStrip(width, height) {
    this.rosterStrip = new PIXI.Container();
    this.rosterStrip.position.set(width / 2, height - (this.layout.isMobile ? 138 : 118));
    this.container.addChild(this.rosterStrip);
    this.updateRosterStrip();
  }

  createNavArrows(width, height) {
    const y = this.carouselContainer.y - (this.layout.isMobile ? 8 : 22);
    const offset = this.layout.isMobile ? (width / 2 - 64) : Math.min(330, width * 0.28);
    this.prevButton = this.createButton('<', width / 2 - offset - 22, y, 44, 44, 0x061426, 0x9ceeff, () => this.navigateLeft());
    this.nextButton = this.createButton('>', width / 2 + offset - 22, y, 44, 44, 0x061426, 0x9ceeff, () => this.navigateRight());
    this.container.addChild(this.prevButton, this.nextButton);
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
    this.shipSpacing = Math.min(470, Math.max(250, width * (this.layout.isMobile ? 0.72 : 0.38)));
    this.centerScale = this.layout.isMobile ? 1.02 : 1.22;
    this.sideScale = this.layout.isMobile ? 0.42 : 0.52;
    this.sideAlpha = this.layout.isMobile ? 0.38 : 0.54;
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

    const heroY = this.layout.isMobile ? -38 : -58;
    const heroSize = this.layout.isMobile ? 128 : 172;
    container.heroY = heroY;

    const pedestal = new PIXI.Graphics();
    pedestal.ellipse(0, this.layout.isMobile ? 55 : 62, heroSize * 0.72, 18);
    pedestal.fill({ color: accent, alpha: locked ? 0.1 : 0.18 });
    pedestal.stroke({ color: accent, width: 2, alpha: locked ? 0.28 : 0.46 });
    container.addChild(pedestal);
    container.pedestal = pedestal;

    // DRAMATIC MULTI-LAYER GLOW SYSTEM
    const glowLayers = new PIXI.Container();

    // Outer pulse ring (large)
    const outerRing = new PIXI.Graphics();
    outerRing.circle(0, heroY, heroSize * 0.86);
    outerRing.stroke({ color: accent, width: 3, alpha: 0 });
    glowLayers.addChild(outerRing);
    container.outerRing = outerRing;

    // Mid glow ring
    const midRing = new PIXI.Graphics();
    midRing.circle(0, heroY, heroSize * 0.68);
    midRing.fill({ color: glowColor, alpha: 0 });
    glowLayers.addChild(midRing);
    container.midRing = midRing;

    // Inner intense glow
    const innerGlow = new PIXI.Graphics();
    innerGlow.circle(0, heroY, heroSize * 0.52);
    innerGlow.fill({ color: variant?.tint || 0xffffff, alpha: 0 });
    glowLayers.addChild(innerGlow);
    container.innerGlow = innerGlow;

    container.addChild(glowLayers);
    container.glowLayers = glowLayers;

    // Light rays container
    const lightRays = new PIXI.Container();
    lightRays.position.set(0, heroY);
    for (let i = 0; i < 8; i++) {
      const ray = new PIXI.Graphics();
      const angle = (Math.PI * 2 * i) / 8;
      ray.moveTo(0, 0);
      ray.lineTo(Math.cos(angle) * heroSize * 0.82, Math.sin(angle) * heroSize * 0.82);
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
      sprite.position.set(0, heroY);
      if (Number.isFinite(variant?.tint)) {
        sprite.tint = variant.tint;
      }

      const scale = Math.min(heroSize / sprite.width, heroSize / sprite.height);
      sprite.scale.set(scale);

      container.addChild(sprite);
      container.sprite = sprite;
    }

    if (locked) {
      const lockPlate = new PIXI.Graphics();
      lockPlate.roundRect(-heroSize * 0.72, heroY - heroSize * 0.52, heroSize * 1.44, heroSize * 1.08, 10);
      lockPlate.fill({ color: 0x020711, alpha: 0.62 });
      lockPlate.stroke({ color: 0xffcc00, width: 2, alpha: 0.7 });
      container.addChild(lockPlate);
      container.lockPlate = lockPlate;

      const lockText = createText('LOCKED', {
        fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
        fontSize: 20,
        fill: '#ffcc00',
        align: 'center',
        fontWeight: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      });
      lockText.anchor.set(0.5);
      lockText.position.set(0, heroY);
      container.addChild(lockText);
      container.lockText = lockText;
    }

    // Holographic scan line effect
    const scanLine = new PIXI.Graphics();
    scanLine.rect(-heroSize * 0.52, heroY, heroSize * 1.04, 3);
    scanLine.fill({ color: 0x00ffff, alpha: 0 });
    container.addChild(scanLine);
    container.scanLine = scanLine;

    // Particle container for selection effects
    container.particles = [];

    // Legacy glow for compatibility
    const glow = new PIXI.Graphics();
    glow.circle(0, heroY, heroSize * 0.62);
    glow.fill({ color: accent, alpha: 0 });
    container.addChild(glow);
    container.glowEffect = glow;

    // Ship name below sprite - LARGER and more readable
    const name = createText(ship.name, {
      fontFamily: FONT_DISPLAY,
      fontSize: this.layout.isMobile ? 22 : 30,
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
    name.position.set(0, this.layout.isMobile ? 77 : 88);
    container.addChild(name);
    container.nameText = name;

    // Ship description - BETTER spacing and size
    const teaser = this.getShortTeaser(ship.baseDescription || ship.description, this.layout.isMobile ? 54 : 68);
    const desc = createText(teaser, {
      fontFamily: FONT_BODY,
      fontSize: this.layout.isMobile ? 14 : 16,
      fill: '#d8fbff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: this.layout.isMobile ? 310 : 430,
      lineHeight: this.layout.isMobile ? 18 : 21,
      fontWeight: '700'
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(0, this.layout.isMobile ? 108 : 126);
    container.addChild(desc);
    container.descText = desc;

    const traitText = this.getShipTraitText(ship);
    const trait = createText(traitText, {
      fontFamily: FONT_BODY,
      fontSize: this.layout.isMobile ? 12 : 13,
      fill: this.toHexText(textAccent),
      align: 'center',
      wordWrap: true,
      wordWrapWidth: this.layout.isMobile ? 330 : 560,
      lineHeight: 17,
      stroke: '#000000',
      strokeThickness: 2
    });
    trait.anchor.set(0.5, 0);
    trait.position.set(0, this.layout.isMobile ? 145 : 160);
    container.addChild(trait);
    container.traitText = trait;

    const statPanel = createShipStatPanel(ship, {
      compact: true,
      width: 352,
      accent: textAccent,
      ranges: this.statRanges,
      title: 'SHIP TUNE'
    });
    statPanel.scale.set(1 / this.centerScale);
    statPanel.position.set(0, this.layout.isMobile ? 176 : 194);
    container.addChild(statPanel);
    container.statPanel = statPanel;

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
    const duration = animate ? 460 : 0;
    const targets = this.shipCards.map((shipContainer, i) => {
      const offset = i - this.selectedIndex;
      const clampedOffset = Math.max(-3, Math.min(3, offset));
      const isCenter = (i === this.selectedIndex);
      const targetX = clampedOffset * this.shipSpacing;
      const targetScale = isCenter ? this.centerScale : this.sideScale;
      const targetAlpha = isCenter ? (shipContainer.locked ? 0.82 : 1.0) : (shipContainer.locked ? 0.34 : this.sideAlpha);
      const targetRotation = isCenter ? 0 : (offset < 0 ? -0.15 : 0.15);
      return {
        shipContainer,
        isCenter,
        hidden: Math.abs(offset) > 3,
        startX: shipContainer.x,
        startScale: shipContainer.scale.x || targetScale,
        startAlpha: shipContainer.alpha,
        startRotation: shipContainer.rotation,
        targetX,
        targetScale,
        targetAlpha: Math.abs(offset) > 3 ? 0 : targetAlpha,
        targetRotation
      };
    });

    const applyTarget = ({ shipContainer, isCenter, hidden, targetX, targetScale, targetAlpha, targetRotation }) => {
      shipContainer.x = targetX;
      shipContainer.scale.set(targetScale);
      shipContainer.alpha = targetAlpha;
      shipContainer.rotation = targetRotation;
      shipContainer.visible = !hidden || targetAlpha > 0.01;
      shipContainer.zIndex = isCenter ? 10 : Math.max(0, 4 - Math.abs(shipContainer.shipIndex - this.selectedIndex));
      if (shipContainer.nameText) shipContainer.nameText.visible = isCenter;
      if (shipContainer.descText) shipContainer.descText.visible = isCenter;
      if (shipContainer.traitText) shipContainer.traitText.visible = isCenter;
      if (shipContainer.statPanel) shipContainer.statPanel.visible = isCenter && !this.layout.showSideIntel && !this.compactIntel;
      if (shipContainer.lockPlate) shipContainer.lockPlate.visible = isCenter;
      if (shipContainer.lockText) shipContainer.lockText.visible = isCenter;
      if (shipContainer.pedestal) shipContainer.pedestal.visible = isCenter;

      if (!isCenter) {
        if (shipContainer.outerRing) shipContainer.outerRing.alpha = 0;
        if (shipContainer.midRing) shipContainer.midRing.alpha = 0;
        if (shipContainer.innerGlow) shipContainer.innerGlow.alpha = 0;
        if (shipContainer.lightRays) shipContainer.lightRays.alpha = 0;
        if (shipContainer.scanLine) shipContainer.scanLine.alpha = 0;
        if (shipContainer.glowEffect) shipContainer.glowEffect.alpha = 0;
      } else if (shipContainer.glowEffect) {
        shipContainer.glowEffect.alpha = 0.16;
      }
    };

    if (!duration) {
      targets.forEach(applyTarget);
      this.updateButtons();
      this.updateIntelPanels();
      this.updateRosterStrip();
      return;
    }

    this.animating = true;
    const centerTarget = targets.find(target => target.isCenter);
    if (centerTarget) {
      this.createSelectionParticles(centerTarget.shipContainer);
      AudioManager.playSfx('forceField', { volume: 0.3, force: false });
    }

    const startTime = Date.now();
    const animateFrame = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5
        ? 0.5 * Math.pow(2 * t, 3)
        : 1 - 0.5 * Math.pow(-2 * t + 2, 3);

      targets.forEach((target) => {
        const { shipContainer, isCenter } = target;
        const bounce = isCenter && t > 0.62
          ? Math.sin((t - 0.62) * Math.PI * 3.6) * 0.035 * (1 - t)
          : 0;
        shipContainer.x = target.startX + (target.targetX - target.startX) * eased;
        const scale = target.startScale + (target.targetScale - target.startScale) * eased + bounce;
        shipContainer.scale.set(scale);
        shipContainer.alpha = target.startAlpha + (target.targetAlpha - target.startAlpha) * eased;
        shipContainer.rotation = target.startRotation + (target.targetRotation - target.startRotation) * eased;
        shipContainer.visible = shipContainer.alpha > 0.01;
        applyTarget({ ...target, targetX: shipContainer.x, targetScale: scale, targetAlpha: shipContainer.alpha, targetRotation: shipContainer.rotation });
        if (isCenter) this.updateParticles(shipContainer, elapsed);
      });

      if (t < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        this.animating = false;
        targets.forEach(applyTarget);
        this.updateButtons();
        this.updateIntelPanels();
        this.updateRosterStrip();
      }
    };
    animateFrame();
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
    const isMobile = width < 640;
    const buttonY = height - (isMobile ? 80 : 80);
    const buttonWidth = isMobile ? 104 : 120;
    const buttonHeight = isMobile ? 36 : 40;
    const buttonSpacing = isMobile ? 10 : 20;
    const randomWidth = isMobile ? 104 : 112;
    const rowWidth = isMobile
      ? buttonWidth * 2 + randomWidth + buttonSpacing * 2
      : buttonWidth * 2 + buttonSpacing;
    const rowX = isMobile ? Math.max(12, (width - rowWidth) / 2) : (width - rowWidth) / 2;

    this.detailsButton = this.createButton(
      'DETAILS',
      rowX,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x333333,
      0x00ff00,
      () => {
        this.openSelectedShipDetails();
      }
    );
    this.container.addChild(this.detailsButton);

    this.startButton = this.createButton(
      locked ? 'LOCKED' : 'START',
      rowX + buttonWidth + buttonSpacing,
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
        this.launchSelectedShip('button');
      }
    );
    this.container.addChild(this.startButton);

    this.randomButton = this.createButton(
      'RANDOM',
      isMobile ? rowX + buttonWidth * 2 + buttonSpacing * 2 : width - randomWidth - 28,
      isMobile ? buttonY : height - 53,
      randomWidth,
      isMobile ? buttonHeight : 30,
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
      particle.y = shipContainer.heroY ?? -50;
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
    this.selectionInfoText.text = `HULL ${this.selectedIndex + 1}/${this.ships.length}  |  SERIES ${modelIndex}/${modelTotal}  |  ${status}`;
  }

  updateIntelPanels() {
    const ship = this.ships[this.selectedIndex];
    if (!ship) return;
    const unlocked = isShipUnlocked(ship.spriteKey, this.unlockProgress);
    const role = getShipCombatRole(ship, this.statRanges);
    const weapon = this.getWeaponSummary(ship);
    const unlockDetails = getShipUnlockProgressDetails(ship.spriteKey, this.unlockProgress);
    const progressLine = !unlocked && Array.isArray(unlockDetails.requirements) && unlockDetails.requirements.length
      ? unlockDetails.requirements
        .slice(0, 2)
        .map(item => `${Math.min(Number(item.current) || 0, Number(item.target) || 0)}/${item.target}`)
        .join('  ')
      : '';
    const unlock = unlocked
      ? 'STATUS: READY FOR LAUNCH'
      : `${getShipUnlockLabel(ship.spriteKey)}${progressLine ? `\nPROGRESS: ${progressLine}` : ''}`;
    const unlockedCount = this.ships.filter(candidate => isShipUnlocked(candidate.spriteKey, this.unlockProgress)).length;

    if (this.leftIntel) {
      const rankProgress = getPilotRankProgress(this.unlockProgress.pilotXp || 0);
      const rankTitle = String(rankProgress.title || getRankTitle(this.unlockProgress.pilotRank || 0)).toUpperCase();
      const isMaxRank = rankProgress.rankIndex >= MAX_RANK_INDEX || rankProgress.progress >= 1;
      const nextTitle = getRankTitle(Math.min(MAX_RANK_INDEX, rankProgress.rankIndex + 1)).toUpperCase();
      const displayRank = getDisplayRankNumber(rankProgress.rankIndex);
      const rankLine = isMaxRank
        ? [rankTitle, translateText('MAX RANK')].join('  ')
        : `${Math.round((rankProgress.progress || 0) * 100)}% ${translateText('TO')} ${nextTitle}`;
      this.leftIntel.count.text = translateText(`${unlockedCount}/${this.ships.length} HULLS READY`);
      this.leftIntel.progress.text = `${translateText('PILOT RANK')} ${displayRank}: ${rankTitle}\n${rankLine}\n${translateText('XP TO NEXT')}: ${Number(rankProgress.xpToNextRank || 0).toLocaleString('en-US')}`;
      if (this.leftIntel.rankRail) {
        const fill = Math.max(0, Math.min(1, Number(rankProgress.progress) || 0));
        this.leftIntel.rankRail.clear();
        this.leftIntel.rankRail.roundRect(16, 78, 196, 10, 5);
        this.leftIntel.rankRail.fill({ color: 0x031323, alpha: 0.92 });
        this.leftIntel.rankRail.stroke({ color: 0x66ffdd, width: 1.2, alpha: 0.52 });
        this.leftIntel.rankRail.roundRect(18, 80, 192 * fill, 6, 3);
        this.leftIntel.rankRail.fill({ color: 0xffef7e, alpha: 0.94 });
      }
      this.setCareerSignalPulse(Boolean(
        (Number(this.unlockProgress.pilotXp) || 0) > 0 ||
        (this.unlockProgress.lastNewlyUnlockedShipIds || []).length > 0 ||
        (this.unlockProgress.newRanksThisRun || []).length > 0 ||
        (Number(this.unlockProgress.totalCodexDiscoveries) || 0) > 0
      ));
      if (this.leftIntel.stats) {
        this.leftIntel.stats.text = `${translateText('CODEX SCANS')}: ${this.unlockProgress.totalCodexDiscoveries || 0}\n${translateText('BEST SCORE')}: ${Number(this.unlockProgress.bestScore || 0).toLocaleString('en-US')}\n${translateText('LOCAL PROFILE')}`;
      }
      if (this.leftIntel.hint) {
        this.leftIntel.hint.text = translateText('CLICK FOR CAREER INTEL');
      }
    }

    if (this.rightIntel) {
      this.rightIntel.role.text = role;
      this.rightIntel.weapon.text = weapon;
      this.rightIntel.trait.text = this.getShipTraitText(ship);
      this.rightIntel.unlock.text = unlock;
      if (this.rightIntel.statPanel?.parent) {
        this.rightIntel.statPanel.parent.removeChild(this.rightIntel.statPanel);
      }
      const accent = this.getReadableAccent(ship.visuals?.variant);
      const statPanel = createShipStatPanel(ship, {
        compact: true,
        width: 228,
        accent,
        ranges: this.statRanges,
        title: 'LIVE TUNE'
      });
      statPanel.position.set(131, 186);
      this.rightIntel.panel.addChild(statPanel);
      this.rightIntel.statPanel = statPanel;
    }

    if (this.compactIntel) {
      this.compactIntel.role.text = `${role} | ${unlock}`;
      this.compactIntel.weapon.text = weapon;
    }
  }

  setCareerSignalPulse(active = false) {
    if (!this.leftIntel?.alertGlow) return;
    this.leftIntel.careerPulseActive = Boolean(active);
    if (!active) {
      this.leftIntel.alertGlow.clear();
      return;
    }
    if (this.careerSignalTicker) return;
    this.careerSignalTicker = () => {
      if (!this.leftIntel?.alertGlow || !this.leftIntel.careerPulseActive) return;
      const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.5;
      const glow = this.leftIntel.alertGlow;
      glow.clear();
      glow.roundRect(-5, -5, 240, 302, 10);
      glow.stroke({ color: 0xffef7e, width: 2 + pulse * 2, alpha: 0.34 + pulse * 0.38 });
      glow.roundRect(6, 6, 218, 280, 8);
      glow.stroke({ color: 0x66ffdd, width: 1.5, alpha: 0.24 + pulse * 0.28 });
      glow.circle(202, 24, 6 + pulse * 5);
      glow.fill({ color: 0xffef7e, alpha: 0.28 + pulse * 0.34 });
    };
    this.game.app.ticker.add(this.careerSignalTicker);
  }

  updateRosterStrip() {
    if (!this.rosterStrip) return;
    this.rosterStrip.removeChildren();
    const dotGap = this.layout.isMobile ? 12 : 18;
    const dotRadius = this.layout.isMobile ? 4 : 5;
    const totalWidth = (this.ships.length - 1) * dotGap;
    const rail = new PIXI.Graphics();
    rail.roundRect(-totalWidth / 2 - 12, -16, totalWidth + 24, 32, 8);
    rail.fill({ color: 0x020916, alpha: 0.76 });
    rail.stroke({ color: 0x2deeff, width: 1, alpha: 0.4 });
    this.rosterStrip.addChild(rail);

    this.ships.forEach((ship, index) => {
      const unlocked = isShipUnlocked(ship.spriteKey, this.unlockProgress);
      const isSelected = index === this.selectedIndex;
      const variant = ship.visuals?.variant;
      const accent = this.getReadableAccent(variant);
      const dot = new PIXI.Container();
      dot.position.set(-totalWidth / 2 + index * dotGap, 0);
      dot.eventMode = 'static';
      dot.cursor = 'pointer';
      const g = new PIXI.Graphics();
      g.circle(0, 0, isSelected ? dotRadius + 3 : dotRadius);
      g.fill({ color: unlocked ? accent : 0x3b4963, alpha: unlocked ? 0.96 : 0.68 });
      g.stroke({ color: isSelected ? 0xffffff : 0x0c2238, width: isSelected ? 2 : 1, alpha: 0.86 });
      dot.addChild(g);
      dot.on('pointerdown', (event) => {
        event.stopPropagation();
        this.navigateTo(index);
      });
      this.rosterStrip.addChild(dot);
    });
  }

  getWeaponSummary(ship) {
    const weapon = ship?.weapon || {};
    const stats = ship?.stats || {};
    const bullets = Number(weapon.bullets || 1);
    const spread = Number(weapon.spread || 0);
    const fireRate = Math.max(1, Number(stats.fireRate || 150));
    const cadence = Math.max(1, Math.round(1000 / fireRate));
    const hitbox = Number(ship?.hitbox?.radius || 0);
    return `WEAPON: ${bullets} LANE${bullets === 1 ? '' : 'S'} / ${cadence} SHOTS-S  |  SPREAD ${spread.toFixed(2)}  |  CORE ${hitbox.toFixed(0)}PX`;
  }

  createButton(label, x, y, width, height, bgColor, textColor, onClick) {
    const button = new PIXI.Container();
    button.position.set(x, y);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.hitArea = new PIXI.Rectangle(0, 0, width, height);

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
      fontFamily: 'Rajdhani, Orbitron, Bahnschrift, sans-serif',
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
      // Buttons live outside the carousel, so they should not inherit the
      // carousel's delayed drag flag after a swipe.
      button.scale.set(0.95);
      setTimeout(() => {
        if (button.parent) button.scale.set(1);
      }, 100);
      AudioManager.playSfx('powerup', { force: true, volume: 0.4 });
      onClick();
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

  getShortTeaser(description, maxLength = 48) {
    if (!description || description.length <= maxLength) return description || '';
    const truncated = description.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  getShipTraitText(ship) {
    const trait = ship?.trait || ship?.visuals?.trait;
    if (!trait?.label) return 'TRAIT: BALANCED TUNE';
    return `TRAIT: ${trait.label} - ${getTraitHudHint(trait, ship)}`;
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

      const handledKey = this.hangarMenuOverlay?.visible ||
        this.careerInfoOverlay?.visible ||
        e.key === 'Tab' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.code === 'KeyA' ||
        e.code === 'KeyD' ||
        e.code === 'KeyQ' ||
        e.code === 'KeyE' ||
        e.code === 'KeyI' ||
        e.code === 'KeyR' ||
        e.code === 'Space' ||
        e.code === 'Enter' ||
        e.code === 'NumpadEnter';
      if (handledKey) e.stopImmediatePropagation();

      if (this.hangarMenuOverlay?.visible) {
        this.handleHangarMenuKey(e);
        return;
      }

      if (this.careerInfoOverlay?.visible) {
        this.handleCareerInfoKey(e);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        this.setMainMenuButtonFocus(true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.setMainMenuButtonFocus(true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setMainMenuButtonFocus(false);
      } else if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.setMainMenuButtonFocus(false);
        this.navigateLeft();
      } else if (e.key === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.setMainMenuButtonFocus(false);
        this.navigateRight();
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        this.setMainMenuButtonFocus(false);
        this.navigateModel(-1);
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        this.setMainMenuButtonFocus(false);
        this.navigateModel(1);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        this.setMainMenuButtonFocus(false);
        this.navigateRandom();
      } else if (e.code === 'KeyI') {
        e.preventDefault();
        this.openCareerInfoOverlay('keyboard');
      } else if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        this.openHangarMenu('keyboard');
      } else if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
        e.preventDefault();
        if (this.mainMenuButtonFocused) {
          this.openHangarMenu('keyboard');
          return;
        }
        this.launchSelectedShip('keyboard');
      }
    };

    window.addEventListener('keydown', this.keyHandler, true);
  }

  handleHangarMenuKey(e) {
    if (e.key === 'Escape' || e.code === 'Escape') {
      e.preventDefault();
      this.closeHangarMenu('keyboard');
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.setOverlayFocus(this.overlayFocusedIndex - 1);
      return true;
    }
    if (e.key === 'ArrowDown' || e.key === 'Tab') {
      e.preventDefault();
      this.setOverlayFocus(this.overlayFocusedIndex + (e.shiftKey ? -1 : 1));
      return true;
    }
    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
      e.preventDefault();
      this.activateOverlayFocus();
      return true;
    }
    return false;
  }

  handleCareerInfoKey(e) {
    if (
      e.key === 'Escape' ||
      e.code === 'Escape' ||
      e.key === 'Enter' ||
      e.code === 'Enter' ||
      e.code === 'NumpadEnter' ||
      e.code === 'Space'
    ) {
      e.preventDefault();
      this.closeCareerInfoOverlay('keyboard');
      return true;
    }
    return false;
  }

  pollHangarMenuGamepad() {
    const nav = this.gamepadNavigator.update();
    if (!nav.connected || !nav.active) return;

    if (this.careerInfoOverlay?.visible) {
      if (nav.pressed.cancel || nav.pressed.confirm || nav.pressed.menu || nav.pressed.back) {
        this.closeCareerInfoOverlay('controller');
      }
      return;
    }

    if (nav.pressed.menu) {
      this.setMainMenuButtonFocus(true);
      if (this.hangarMenuOverlay?.visible) {
        this.closeHangarMenu('controller');
      } else {
        this.openHangarMenu('controller');
      }
      return;
    }

    if (nav.pressed.back) {
      this.setMainMenuButtonFocus(true);
      if (this.hangarMenuOverlay?.visible) {
        this.closeHangarMenu('controller');
      } else {
        this.returnToMenu('controller');
      }
      return;
    }

    if (this.hangarMenuOverlay?.visible) {
      if (nav.pressed.up) this.setOverlayFocus(this.overlayFocusedIndex - 1);
      if (nav.pressed.down) this.setOverlayFocus(this.overlayFocusedIndex + 1);
      if (nav.pressed.confirm) this.activateOverlayFocus();
      if (nav.pressed.cancel) this.closeHangarMenu('controller');
      return;
    }

    if (nav.pressed.cancel) {
      this.setMainMenuButtonFocus(true);
      this.returnToMenu('controller');
      return;
    }
    if (nav.pressed.down) this.setMainMenuButtonFocus(true);
    if (nav.pressed.up) this.setMainMenuButtonFocus(false);
    if (nav.pressed.left) {
      this.setMainMenuButtonFocus(false);
      this.navigateLeft();
    }
    if (nav.pressed.right) {
      this.setMainMenuButtonFocus(false);
      this.navigateRight();
    }
    if (nav.pressed.lb) {
      this.setMainMenuButtonFocus(false);
      this.navigateModel(-1);
    }
    if (nav.pressed.rb) {
      this.setMainMenuButtonFocus(false);
      this.navigateModel(1);
    }
    if (nav.pressed.y) {
      this.setMainMenuButtonFocus(false);
      this.navigateRandom();
    }
    if (nav.pressed.x) {
      this.setMainMenuButtonFocus(false);
      this.openSelectedShipDetails();
    }
    if (nav.pressed.confirm) {
      if (this.mainMenuButtonFocused) {
        this.returnToMenu('controller');
      } else {
        this.launchSelectedShip('controller');
      }
    }
  }

  returnToMenu(source = 'unknown') {
    if (this.launchInProgress) return;

    if (DEBUG) console.log(`[ShipSelect] Returning to main menu via ${source}`);

    if (this.hangarMenuOverlay) this.hangarMenuOverlay.visible = false;
    if (this.careerInfoOverlay) this.careerInfoOverlay.visible = false;
    this.game.showMenu();
  }

  launchSelectedShip(source = 'unknown') {
    if (this.launchInProgress) return;
    const ship = this.ships[this.selectedIndex];
    if (!ship?.spriteKey) return;

    if (!isShipUnlocked(ship.spriteKey, this.unlockProgress)) {
      AudioManager.playSfx('ship_lock_chime', { force: true, volume: 0.7 });
      this.updateSelectionInfo();
      return;
    }

    this.launchInProgress = true;
    const spriteKey = ship.spriteKey;
    setSelectedShipKey(spriteKey);
    this.saveSelection(spriteKey);
    AudioManager.playSfx('ship_lock_chime', { force: true, volume: 0.8 });

    if (DEBUG) console.log(`[ShipSelect] Starting game via ${source}:`, spriteKey);
    this.game.startGame(spriteKey).catch((error) => {
      this.launchInProgress = false;
      console.error('[ShipSelect] Failed to start selected ship:', error);
    });
  }

  openSelectedShipDetails() {
    const ship = this.ships[this.selectedIndex];
    if (!ship?.spriteKey) return;
    const spriteKey = ship.spriteKey;
    setSelectedShipKey(spriteKey);
    this.saveSelection(spriteKey);
    if (DEBUG) console.log('[ShipSelect] Opening details for:', spriteKey);
    this.game.showShipDetails(spriteKey);
  }

  saveSelection(spriteKey) {
    try {
      localStorage.setItem(STORAGE_KEY, spriteKey);
      if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
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
      window.removeEventListener('keydown', this.keyHandler, true);
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
    if (this.menuInputTicker) {
      this.game.app.ticker.remove(this.menuInputTicker);
      this.menuInputTicker = null;
    }
    if (this.careerInfoTicker) {
      this.game.app.ticker.remove(this.careerInfoTicker);
      this.careerInfoTicker = null;
    }
    if (this.careerSignalTicker) {
      this.game.app.ticker.remove(this.careerSignalTicker);
      this.careerSignalTicker = null;
    }
    if (this.exitNoticeTimeout) {
      clearTimeout(this.exitNoticeTimeout);
      this.exitNoticeTimeout = null;
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
