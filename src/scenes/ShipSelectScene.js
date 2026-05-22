import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BonusAsset } from '../utils/BonusAsset.js';
import {
  getSelectableShips,
  getDefaultShipKey,
  getShipUnlockLabel,
  getShipUnlockProgress,
  isShipUnlocked,
  isValidShipKey,
  resolveShipKey
} from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';
import { AudioManager } from '../audio/AudioManager.js';
import { createText } from '../utils/pixiText.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { computeShipStatRanges, createShipStatPanel, getShipCombatRole } from '../ui/ShipStatPanel.js';

const STORAGE_KEY = 'burt.selectedShip.v1';
const DEBUG = false; // Set to true to enable debug logs
const FONT_BODY = 'Rajdhani, Orbitron, Bahnschrift, sans-serif';
const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, sans-serif';

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
      'A/D OR ARROWS: SHIP  |  Q/E: JUMP 5  |  R: RANDOM READY  |  ENTER: LAUNCH  |  ESC: MENU',
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

    this.backButton = this.createButton(
      'MAIN MENU',
      isMobile ? 12 : 24,
      isMobile ? 18 : 24,
      isMobile ? 106 : 126,
      isMobile ? 30 : 32,
      0x101a33,
      0x66ffff,
      () => this.returnToMenu('button')
    );

    this.container.addChild(this.backButton);
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
      const title = this.createIntelText('ROSTER SIGNAL', 16, 10, 13, '#ffffff', '900');
      const count = this.createIntelText('', 16, 46, 14, '#ffef7e', '900');
      const progress = this.createIntelText('', 16, 78, 13, '#b8fff1');
      const hint = this.createIntelText('Locked craft stay visible so the next target is obvious before a run starts.', 16, 126, 13, '#9fc8d8');
      left.addChild(title, count, progress, hint);
      this.leftIntel = { panel: left, count, progress };
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
        const spriteKey = ship.spriteKey;
        setSelectedShipKey(spriteKey);
        this.saveSelection(spriteKey);
        if (DEBUG) console.log('[ShipSelect] Opening details for:', spriteKey);
        this.game.showShipDetails(spriteKey);
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
    const unlock = unlocked ? 'STATUS: READY FOR LAUNCH' : getShipUnlockLabel(ship.spriteKey);
    const unlockedCount = this.ships.filter(candidate => isShipUnlocked(candidate.spriteKey, this.unlockProgress)).length;

    if (this.leftIntel) {
      this.leftIntel.count.text = `${unlockedCount}/${this.ships.length} HULLS READY`;
      this.leftIntel.progress.text = `BEST SCORE ${Number(this.unlockProgress.bestScore || 0).toLocaleString('en-US')}\nBEST RANK ${this.unlockProgress.bestRank || 0}\nBEST LEVEL ${this.unlockProgress.bestLevel || 1}`;
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
    const effectTags = this.getTraitEffectTags(trait);
    return `TRAIT: ${trait.label} - ${trait.description || 'Balanced arcade handling.'}${effectTags ? ` | ${effectTags}` : ''}`;
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

      if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.navigateLeft();
      } else if (e.key === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.navigateRight();
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        this.navigateModel(-1);
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        this.navigateModel(1);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        this.navigateRandom();
      } else if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        this.returnToMenu('keyboard');
      } else if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.launchSelectedShip('keyboard');
      }
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  returnToMenu(source = 'unknown') {
    if (this.launchInProgress) return;

    if (DEBUG) console.log(`[ShipSelect] Returning to main menu via ${source}`);

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
