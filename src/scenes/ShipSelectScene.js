import * as PIXI from 'pixi.js';
import { GameAssets } from '../utils/GameAssets.js';
import { BonusAsset } from '../utils/BonusAsset.js';
import {
  getSelectableShips,
  getDefaultShipKey,
  getShipUnlockHistoryLine,
  getShipUnlockLabel,
  getShipUnlockProgressDetails,
  getShipUnlockProgress,
  getShipUnlockRequirementLine,
  getShipUsage,
  isShipUnlocked,
  isValidShipKey,
  resolveShipKey
} from '../config/ShipMetadata.js';
import { setSelectedShipKey } from '../utils/ShipSelectionState.js';
import { AudioManager } from '../audio/AudioManager.js';
import { createText } from '../utils/pixiText.js';
import { getCurrentLayout } from '../ui/responsiveLayout.js';
import { EXIT_GAME_WEB_MESSAGE, requestExitGame } from '../utils/ExitGame.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { computeShipStatRanges, createShipStatPanel, getShipCombatRole, getShipTierLabel } from '../ui/ShipStatPanel.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { getTraitHudHint } from '../config/ShipTraitDescriptions.js';
import { MAX_RANK_INDEX, getPilotRankProgress, getRankTitle } from '../shared/RankPolicy.js';
import { translateText } from '../i18n/index.js';
import { destroyMenuFx, installMenuFx, playMenuFocusSfx, updateMenuFx } from '../ui/MenuFxLayer.js';
import { acknowledgeHangarUnlockPresentation } from '../progression/HangarProgressState.js';
import { formatRunContractProgressValue, getRunContractCompletionReviewState } from '../progression/RunContracts.js';
import { RUN_MODES } from '../game/RunMode.js';
import { HangarLaunchModeOverlay } from '../ui/HangarLaunchModeOverlay.js';
import {
  acknowledgeHangarRecommendation,
  getHangarRecommendationKey,
  isHangarRecommendationAcknowledged
} from '../config/HangarRecommendationSettings.js';
import { getShipMasteryView, SHIP_MASTERY_TIERS } from '../progression/ShipMastery.js';
import {
  fitMasteryTextScale,
  getMasteryBadgeRegionDebug,
  getShipMasteryBadgeLayout
} from '../ui/ShipMasteryBadgeLayout.js';

const STORAGE_KEY = 'burt.selectedShip.v1';
const DEBUG = false; // Set to true to enable debug logs
const FONT_BODY = 'Rajdhani, Orbitron, Bahnschrift, sans-serif';
const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, sans-serif';
const CAREER_INTEL_BODY = 'Your career profile grows between runs. Score, sectors, bosses, Codex discoveries, clean waves, and clears feed Career XP.';
const CAREER_INTEL_KICKER = 'PILOT DOSSIER // LIVE ARCADE SIGNAL';
const CAREER_INTEL_VALUE = 'EVERY RUN LEAVES A RECEIPT';
const CAREER_INTEL_FLOW = 'CAREER XP FLOW';
const PILOT_ORDERS_ARCHIVE_EMPTY = 'No Pilot Orders cleared yet.';
const PILOT_ORDERS_ARCHIVE_HINT = 'Review cleared Pilot Orders here.';
const PILOT_ORDERS_ARCHIVE_DONE = 'DONE';
const HANGAR_ACTION_FOCUS_ORDER = ['details', 'start', 'random'];
const HANGAR_UNLOCK_PRESENTATION_MS = 5400;
const HANGAR_PROFILE_REPAIR_REASONS = new Set([
  'legacy_codex_rescue_inflation',
  'legacy_codex_rescue_preserved'
]);
const HANGAR_UNLOCK_STRINGS = {
  titleSingle: 'NEW HULL ARRIVED',
  titlePlural: 'NEW HULLS ARRIVED',
  kicker: 'HANGAR DOORS OPEN',
  subtitle: 'The paint is still warm. Try not to make it emotional.',
  rolePrefix: 'COMBAT ROLE',
  continue: 'ENTER / CLICK / A: KEEP THE KEYS',
  countPrefix: 'HULLS ADDED'
};

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

function bottomOf(display) {
  if (!display) return 0;
  return (Number(display.y) || 0) + Math.max(0, Number(display.height) || 0);
}

function hexColor(color) {
  return `#${Number(color || 0xffffff).toString(16).padStart(6, '0')}`;
}

function createHangarSignature(art, heroSize, heroY, accent, glowColor, locked) {
  const profile = art?.hangarSignature;
  if (!profile) return null;
  const signature = new PIXI.Container();
  signature.position.set(0, heroY);
  signature.alpha = locked ? 0.1 : 0.34;
  signature.__rotationSpeed = 0.0015 + (Number(profile.phase) || 0) * 0.004;

  const spokes = Math.max(2, Math.min(18, Number(profile.spokes) || 6));
  const phase = Number(profile.phase) || 0;
  const radius = heroSize * (0.56 + phase * 0.08);
  const crest = new PIXI.Graphics();
  for (let i = 0; i < spokes; i += 1) {
    const angle = (Math.PI * 2 * i) / spokes + phase;
    const alternate = i % 2 ? 0.72 : 1;
    const inner = radius * (0.3 + (i % 3) * 0.055);
    crest.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    crest.lineTo(Math.cos(angle) * radius * alternate, Math.sin(angle) * radius * alternate);
  }
  crest.stroke({ color: accent, width: profile.style === 'viking' ? 2.4 : 1.4, alpha: 0.72 });

  const inner = new PIXI.Graphics();
  const sides = Math.max(3, Math.min(10, 3 + (spokes % 8)));
  for (let i = 0; i <= sides; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / sides + phase * 0.4;
    const r = heroSize * (i % 2 && sides > 5 ? 0.31 : 0.38);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) inner.moveTo(x, y);
    else inner.lineTo(x, y);
  }
  inner.stroke({ color: glowColor, width: 2, alpha: 0.52 });

  const satellites = new PIXI.Graphics();
  const satelliteCount = Math.max(0, Math.min(8, Number(profile.satellites) || 0));
  for (let i = 0; i < satelliteCount; i += 1) {
    const angle = (Math.PI * 2 * i) / Math.max(1, satelliteCount) - phase;
    const orbitRadius = heroSize * (0.68 + (i % 2) * 0.07);
    const dotRadius = profile.style === 'sovereign' ? 5.5 : 2.6 + (i % 3);
    satellites.circle(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, dotRadius);
  }
  satellites.fill({ color: accent, alpha: profile.style === 'sovereign' ? 0.86 : 0.58 });

  signature.addChild(crest, inner, satellites);
  signature.__profile = { ...profile };
  return signature;
}

function getHangarProfileFooterLines(progress = {}) {
  if (HANGAR_PROFILE_REPAIR_REASONS.has(progress?.integrityRepairReason)) {
    return [
      translateText('PROFILE REPAIRED'),
      translateText('RUN EVIDENCE VERIFIED')
    ];
  }
  return [translateText('LOCAL PROFILE')];
}

function shipRecommendationScore(ship) {
  if (!ship) return -Infinity;
  const unlockDepth = Number(ship.unlock?.level) || 1;
  const stats = ship.stats || {};
  const weapon = ship.weapon || {};
  const damage = Number(stats.damage) || 1;
  const speed = Number(stats.speed) || 1;
  const bulletSpeed = Number(stats.bulletSpeed) || 1;
  const fireRate = Number(stats.fireRate) || 140;
  const bullets = Math.max(1, Number(weapon.bullets) || 1);
  const hitbox = Number(ship.hitbox?.radius) || 12;
  return unlockDepth * 12 +
    damage * bullets * 28 +
    speed * 8 +
    bulletSpeed * 3 -
    fireRate * 0.05 -
    hitbox * 0.6;
}

export class ShipSelectScene {
  constructor(game, options = {}) {
    this.game = game;
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
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
    this.launchModeOverlay = null;
    this.backButton = null;
    this.hangarMenuOverlay = null;
    this.careerInfoOverlay = null;
    this.careerInfoDebugState = null;
    this.careerInfoRefs = null;
    this.careerInfoAnimatedNodes = [];
    this.careerInfoTicker = null;
    this.careerInfoPilotOrdersPage = 0;
    this.careerSignalTicker = null;
    this.overlayButtons = [];
    this.overlayFocusedIndex = 0;
    this.mainMenuButtonFocused = false;
    this.controllerFocus = 'ship';
    this.actionFocusedIndex = 0;
    this.actionButtons = [];
    this.gamepadMenuWasPressed = false;
    this.gamepadActionWasPressed = false;
    this.gamepadCancelWasPressed = false;
    this.gamepadVerticalWasPressed = false;
    this.gamepadNavigator = new GamepadNavigator();
    this.lastInputDevice = 'keyboard';
    this.inputPromptSwitchCount = 0;
    this.inputPromptLastChangedAt = 0;
    this.hangarPointerDeviceHandler = null;
    this.menuFx = null;
    this.exitNoticeTimeout = null;
    this.recommendedShip = this.getRecommendedShip();
    this.recommendationKey = getHangarRecommendationKey(this.recommendedShip);
    this.recommendationDismissed = isHangarRecommendationAcknowledged(this.recommendedShip);
    this.recommendationBanner = null;
    this.recommendationText = null;
    this.recommendationReasonText = null;
    this.recommendationDismissText = null;
    this.recommendationJumpText = null;
    this.pendingHangarUnlockShips = this.resolvePendingHangarUnlockShips();
    this.hangarUnlockPresentation = null;
    this.hangarUnlockPresentationRefs = null;
    this.hangarUnlockPresentationSprites = [];
    this.hangarUnlockPresentationParticles = [];
    this.hangarUnlockPresentationStartedAt = 0;
    this.hangarUnlockPresentationActive = false;
    this.hangarUnlockPresentationAcked = false;
    this.hangarUnlockPresentationTimer = null;
    this.hangarUnlockPresentationTicker = null;

    // Load saved selection
    const preferredSpriteKey = options.preferredSpriteKey;
    const saved = this.loadSelection();
    const canRestoreSelection = saved && isValidShipKey(saved) && isShipUnlocked(saved, this.unlockProgress);
    const activeSpriteKey = isValidShipKey(this.game?.selectedShipSpriteKey)
      ? resolveShipKey(this.game.selectedShipSpriteKey)
      : (canRestoreSelection ? resolveShipKey(saved) : getDefaultShipKey());
    this.activeShipSpriteKey = activeSpriteKey;
    if (preferredSpriteKey && isValidShipKey(preferredSpriteKey)) {
      const resolvedPreferred = resolveShipKey(preferredSpriteKey);
      const index = this.ships.findIndex(s => s.spriteKey === resolvedPreferred);
      if (index >= 0) this.selectedIndex = index;
    } else if (canRestoreSelection) {
      const resolvedSaved = resolveShipKey(saved);
      const index = this.ships.findIndex(s => s.spriteKey === resolvedSaved);
      if (index >= 0) this.selectedIndex = index;
    }

    // A newly unlocked hull is the subject of the presentation, so keep the
    // Hangar preview aligned with the reveal instead of showing the old hull
    // behind it. This does not equip the hull until the player presses Start.
    const pendingRevealKey = this.pendingHangarUnlockShips[0]?.spriteKey;
    if (pendingRevealKey) {
      const revealIndex = this.ships.findIndex(ship => ship.spriteKey === pendingRevealKey);
      if (revealIndex >= 0) this.selectedIndex = revealIndex;
    }

    setSelectedShipKey(activeSpriteKey);
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
    installMenuFx(this, {
      label: 'ui_menuFxHangar',
      zIndex: 0,
      accent: 0x66ffdd,
      secondary: 0xff55d9,
      gold: 0xffd15c,
      intensity: 0.78,
      density: 0.82,
      alpha: 0.46,
      openVolume: 0.2
    });

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
      showLeftIntel: width >= 1120,
      uiScale: Math.max(1, Math.min(2, Number(getCurrentLayout()?.uiScale) || 1))
    };

    this.createHangarFrame(width, height);
    this.createHeader(width, height);
    this.createRecommendationBanner(width, height);
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
      this.getHangarFooterPrompt(),
      {
        fontFamily: FONT_BODY,
        fontSize: this.layout.isMobile ? 14 : 17,
        fill: '#ccefff',
        align: 'center'
      }
    );
    instructions.anchor.set(0.5, 1);
    instructions.position.set(width / 2, height - 6);
    footerContainer.addChild(instructions);
    this.footerInstructions = instructions;
    this.container.addChild(footerContainer);

    // Setup carousel navigation
    this.setupScrolling();

    // Update selection
    this.updateSelection();

    // Setup input
    this.setupInput();
    this.createHangarUnlockPresentation(width, height);
    this.startHangarUnlockPresentation();

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

      if (centerShip.hangarSignature) {
        centerShip.hangarSignature.rotation += centerShip.hangarSignature.__rotationSpeed || 0.002;
        centerShip.hangarSignature.alpha = 0.2 + pulse * 0.24;
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
      fontSize: this.layout.isMobile ? 14 : 17,
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
      const activatedHere = this.backButton.active;
      this.backButton.active = false;
      drawButton();
      // A pointer release can arrive immediately after the main-menu Hangar
      // button swaps scenes. Only accept a release that began on this button.
      if (!activatedHere) return;
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
    this.setControllerFocus(focused ? 'back' : 'ship');
  }

  getControllerFocus() {
    if (this.controllerFocus === 'back') return 'back';
    if (HANGAR_ACTION_FOCUS_ORDER.includes(this.controllerFocus)) return this.controllerFocus;
    return 'ship';
  }

  getFocusedActionButtonId() {
    const focus = this.getControllerFocus();
    return HANGAR_ACTION_FOCUS_ORDER.includes(focus) ? focus : null;
  }

  setControllerFocus(focus) {
    const nextFocus = focus === 'back' || HANGAR_ACTION_FOCUS_ORDER.includes(focus) ? focus : 'ship';
    this.controllerFocus = nextFocus;
    this.mainMenuButtonFocused = nextFocus === 'back';
    if (HANGAR_ACTION_FOCUS_ORDER.includes(nextFocus)) {
      this.actionFocusedIndex = HANGAR_ACTION_FOCUS_ORDER.indexOf(nextFocus);
    }
    this.backButton?.redraw?.();
    this.syncActionButtonFocus();
  }

  setActionFocusByOffset(delta) {
    const nextIndex = (this.actionFocusedIndex + delta + HANGAR_ACTION_FOCUS_ORDER.length) % HANGAR_ACTION_FOCUS_ORDER.length;
    this.actionFocusedIndex = nextIndex;
    this.setControllerFocus(HANGAR_ACTION_FOCUS_ORDER[nextIndex]);
  }

  focusActionRow() {
    this.setControllerFocus(HANGAR_ACTION_FOCUS_ORDER[this.actionFocusedIndex] || 'details');
  }

  syncActionButtonFocus() {
    const focusedId = this.getFocusedActionButtonId();
    for (const button of this.actionButtons || []) {
      button._focused = Boolean(focusedId && button.actionId === focusedId);
      button.redraw?.();
    }
  }

  activateControllerFocus(source = 'controller') {
    const focus = this.getControllerFocus();
    if (focus === 'back') {
      this.returnToMenu(source);
      return;
    }
    if (focus === 'details') {
      this.openSelectedShipDetails();
      return;
    }
    if (focus === 'random') {
      this.navigateRandom();
      return;
    }
    this.launchSelectedShip(source);
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
    if (source === 'controller') this.setControllerFocus('ship');
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
        focus.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 5);
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

  rebuildCareerInfoOverlay() {
    const wasVisible = Boolean(this.careerInfoOverlay?.visible);
    if (this.careerInfoOverlay?.parent) {
      this.careerInfoOverlay.parent.removeChild(this.careerInfoOverlay);
    }
    this.careerInfoOverlay?.destroy?.({ children: true });
    this.careerInfoOverlay = null;
    this.careerInfoRefs = null;
    this.createCareerInfoOverlay(this.game.getWidth(), this.game.getHeight());
    if (this.careerInfoOverlay) {
      this.careerInfoOverlay.visible = wasVisible;
    }
  }

  setCareerInfoPilotOrdersPage(page) {
    const pageCount = Math.max(1, Number(this.careerInfoRefs?.pilotOrdersArchive?._pilotOrdersArchive?.pageCount) || 1);
    const nextPage = Math.max(0, Math.min(pageCount - 1, Math.floor(Number(page) || 0)));
    if (nextPage === this.careerInfoPilotOrdersPage) return false;
    this.careerInfoPilotOrdersPage = nextPage;
    if (this.careerInfoOverlay?.visible) {
      this.rebuildCareerInfoOverlay();
      AudioManager.playSfx('thrusterFire', { volume: 0.11, minIntervalMs: 80 });
    }
    return true;
  }

  flipCareerInfoPilotOrdersPage(delta) {
    const pageCount = Math.max(1, Number(this.careerInfoRefs?.pilotOrdersArchive?._pilotOrdersArchive?.pageCount) || 1);
    const nextPage = ((this.careerInfoPilotOrdersPage + Math.sign(delta || 1)) % pageCount + pageCount) % pageCount;
    return this.setCareerInfoPilotOrdersPage(nextPage);
  }

  createCareerStatTile(label, value, x, y, width, height, accent, compact = false, subline = '') {
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
    valueText.position.set(12, compact ? 10 : 12);
    fitDisplayToBox(valueText, width - 24, subline ? (compact ? 19 : 23) : (compact ? 24 : 30), { minScale: 0.62 });

    const sublineText = createText(String(subline || ''), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 12 : 14,
      fontWeight: '900',
      fill: '#d8fbff',
      align: 'left',
      letterSpacing: 0
    });
    sublineText.visible = Boolean(subline);
    sublineText.position.set(12, compact ? 30 : 34);
    fitDisplayToBox(sublineText, width - 24, compact ? 12 : 14, { minScale: 0.72 });

    const labelText = createText(translateText(label), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 12 : 14,
      fontWeight: '900',
      fill: hexColor(accent),
      align: 'left',
      letterSpacing: 0
    });
    labelText.position.set(12, height - (compact ? 19 : 22));
    fitDisplayToBox(labelText, width - 24, compact ? 16 : 18, { minScale: 0.58 });
    tile.addChild(valueText, sublineText, labelText);
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
      fontSize: compact ? 14 : 16,
      fontWeight: '900',
      fill: hexColor(accent),
      letterSpacing: 0
    });
    h.position.set(18, 10);
    fitDisplayToBox(h, width - 44, compact ? 18 : 20, { minScale: 0.56 });

    const p = createText(translateText(copy), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 13 : 15,
      fontWeight: '700',
      fill: '#d8fbff',
      wordWrap: true,
      wordWrapWidth: width - 30,
      lineHeight: compact ? 12 : 15,
      letterSpacing: 0
    });
    p.position.set(18, compact ? 30 : 34);
    fitDisplayToBox(p, width - 30, height - (compact ? 34 : 40), { minScale: 0.78 });
    card.addChild(h, p);
    return card;
  }

  createPilotOrdersArchivePanel(review, x, y, width, height, compact = false) {
    const panel = new PIXI.Container();
    panel.label = 'ui_pilotOrdersArchive';
    panel.position.set(x, y);

    const completedOrders = Array.isArray(review?.completed) ? review.completed : [];
    const activeOrders = Array.isArray(review?.active) ? review.active : [];
    const nextOrders = Array.isArray(review?.next) ? review.next : [];
    const pendingOrders = Array.isArray(review?.pending) ? review.pending : [];
    const activeIds = new Set(activeOrders.map((entry) => entry?.id).filter(Boolean));
    const nextIds = new Set(nextOrders.map((entry) => entry?.id).filter(Boolean));
    const orderNumberLabel = (entry, fallbackIndex = 0) => {
      const orderNumber = Number(entry?.orderNumber);
      const normalized = Number.isFinite(orderNumber) && orderNumber > 0
        ? Math.floor(orderNumber)
        : fallbackIndex + 1;
      return String(normalized).padStart(2, '0');
    };
    const allEntries = [...completedOrders, ...pendingOrders]
      .filter((entry) => entry?.id)
      .sort((a, b) => {
        const aIndex = Number.isFinite(Number(a.orderIndex)) ? Number(a.orderIndex) : Number.MAX_SAFE_INTEGER;
        const bIndex = Number.isFinite(Number(b.orderIndex)) ? Number(b.orderIndex) : Number.MAX_SAFE_INTEGER;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return String(a.id).localeCompare(String(b.id));
      });
    const lineEntries = allEntries.map((entry, index) => {
      const title = translateText(entry.shortTitle || entry.title || entry.id);
      const number = orderNumberLabel(entry, index);
      if (entry.completed) {
        return {
          text: `${number} ${translateText(PILOT_ORDERS_ARCHIVE_DONE)} // ${title}`,
          tone: 'done'
        };
      }
      const progress = translateText('{progress}/{target}', formatRunContractProgressValue(entry.progress || 0, entry.target || 1));
      if (activeIds.has(entry.id)) {
        return {
          text: `${number} ${translateText('ACTIVE')} ${progress} // ${title}`,
          tone: 'active'
        };
      }
      if (nextIds.has(entry.id)) {
        return {
          text: `${number} ${translateText('NEXT')} ${progress} // ${title}`,
          tone: 'next'
        };
      }
      return {
        text: `${number} ${progress} // ${title}`,
        tone: 'pending'
      };
    });
    const fullText = lineEntries.length
      ? lineEntries.map((entry) => entry.text).join('\n')
      : translateText(PILOT_ORDERS_ARCHIVE_EMPTY);
    const accent = completedOrders.length || activeOrders.length ? 0x9cfbff : 0x49677a;

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, width, height, 8);
    bg.fill({ color: 0x071b2a, alpha: 0.9 });
    bg.stroke({ color: accent, width: 1.5, alpha: 0.72 });
    bg.rect(0, 0, 7, height);
    bg.fill({ color: accent, alpha: 0.86 });
    bg.moveTo(18, height - 10);
    bg.lineTo(width - 18, height - 10);
    bg.stroke({ color: accent, width: 1, alpha: 0.3 });
    panel.addChild(bg);

    const headingLabel = translateText('PILOT ORDERS');
    const heading = createText(headingLabel, {
      fontFamily: FONT_BODY,
      fontSize: compact ? 14 : 16,
      fontWeight: '900',
      fill: hexColor(accent),
      letterSpacing: 0
    });
    heading.position.set(18, 10);
    fitDisplayToBox(heading, width - 124, compact ? 18 : 20, { minScale: 0.56 });

    const countLabel = translateText('COMPLETED: {count}', {
      count: Math.max(0, Math.floor(Number(review?.completedCount) || 0))
    });
    const count = createText(countLabel, {
      fontFamily: FONT_DISPLAY,
      fontSize: compact ? 14 : 16,
      fontWeight: '900',
      fill: '#fff3a2',
      stroke: '#020711',
      strokeThickness: 2,
      align: 'right',
      letterSpacing: 0
    });
    count.anchor.set(1, 0);
    count.position.set(width - 18, 10);
    fitDisplayToBox(count, 92, compact ? 18 : 20, { minScale: 0.52 });

    const archiveSummaryParts = [
      activeOrders.length ? `${translateText('ACTIVE')} ${activeOrders.length}` : null,
      nextOrders.length ? `${translateText('NEXT')} ${nextOrders.length}` : null,
      completedOrders.length
        ? translateText('COMPLETED: {count}', {
            count: Math.max(0, Math.floor(Number(review?.completedCount) || 0))
          })
        : null
    ].filter(Boolean);
    const archiveSummary = archiveSummaryParts.length
      ? archiveSummaryParts.join(' // ')
      : translateText(PILOT_ORDERS_ARCHIVE_HINT);
    const listTop = compact ? 56 : 62;
    const listHeight = Math.max(18, height - listTop - 18);
    const columnCount = width >= 980 && height >= 176
      ? 3
      : width >= 640
        ? 2
        : 1;
    const columnGap = columnCount > 1 ? (columnCount >= 3 ? 10 : 14) : 0;
    const listLineHeight = compact ? 16 : 19;
    const rowsPerColumn = Math.max(3, Math.floor(listHeight / listLineHeight));
    const rowsPerPage = Math.max(1, rowsPerColumn * columnCount);
    const pageCount = Math.max(1, Math.ceil((lineEntries.length || 1) / rowsPerPage));
    const currentPage = Math.max(0, Math.min(pageCount - 1, Math.floor(Number(this.careerInfoPilotOrdersPage) || 0)));
    this.careerInfoPilotOrdersPage = currentPage;
    const pageStart = currentPage * rowsPerPage;
    const displayLines = lineEntries.length
      ? lineEntries.slice(pageStart, pageStart + rowsPerPage)
      : [{ text: fullText, tone: 'empty' }];
    const visibleText = displayLines.map((entry) => entry.text).join('\n');
    const hintWidth = pageCount > 1 ? Math.max(120, width - 188) : width - 36;
    const hint = createText(archiveSummary, {
      fontFamily: FONT_BODY,
      fontSize: compact ? 12 : 14,
      fontWeight: '800',
      fill: '#fff3a2',
      wordWrap: true,
      wordWrapWidth: hintWidth,
      lineHeight: compact ? 10 : 12,
      letterSpacing: 0
    });
    hint.position.set(18, compact ? 28 : 32);
    fitDisplayToBox(hint, hintWidth, compact ? 14 : 17, { minScale: 0.64 });

    const pageWidgets = [];
    if (pageCount > 1) {
      const pageLabel = createText(String(currentPage + 1) + '/' + String(pageCount), {
        fontFamily: FONT_BODY,
        fontSize: compact ? 13 : 15,
        fontWeight: '900',
        fill: '#ffffff',
        stroke: '#020711',
        strokeThickness: 2,
        align: 'center',
        letterSpacing: 0
      });
      pageLabel.anchor.set(0.5, 0);
      pageLabel.position.set(width - 72, compact ? 33 : 36);
      const makePageButton = (label, buttonX, delta) => {
        const button = new PIXI.Container();
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.position.set(buttonX, compact ? 40 : 44);
        button.hitArea = new PIXI.Rectangle(-16, -12, 32, 24);
        const bg = new PIXI.Graphics();
        bg.roundRect(-14, -10, 28, 20, 5);
        bg.fill({ color: 0x071b2a, alpha: 0.96 });
        bg.stroke({ color: 0x37f5ff, width: 1.2, alpha: 0.68 });
        const copy = createText(label, {
          fontFamily: FONT_DISPLAY,
          fontSize: compact ? 12 : 14,
          fontWeight: '900',
          fill: '#9cfbff',
          stroke: '#020711',
          strokeThickness: 2,
          letterSpacing: 0
        });
        copy.anchor.set(0.5);
        button.addChild(bg, copy);
        button.on('pointerdown', (event) => {
          event.stopPropagation();
          this.flipCareerInfoPilotOrdersPage(delta);
        });
        return button;
      };
      pageWidgets.push(
        makePageButton('<', width - 116, -1),
        pageLabel,
        makePageButton('>', width - 28, 1)
      );
    }

    const columnWidth = Math.floor((width - 36 - columnGap * (columnCount - 1)) / columnCount);
    const columnLists = Array.from({ length: columnCount }, () => []);
    displayLines.forEach((entry, index) => {
      const column = Math.min(columnCount - 1, Math.floor(index / rowsPerColumn));
      columnLists[column].push(entry);
    });
    const denseArchive = rowsPerPage >= 22;
    const listFontSize = compact ? (denseArchive ? 12 : 13) : (denseArchive ? 13 : 15);
    const toneFill = {
      active: '#fff3a2',
      next: '#9cfbff',
      done: '#d8fbff',
      pending: '#8fb5c2',
      empty: '#90aeba'
    };
    const listTexts = [];
    columnLists.forEach((lines, column) => {
      lines.forEach((entry, rowIndex) => {
        const copy = createText(entry.text, {
          fontFamily: FONT_BODY,
          fontSize: listFontSize,
          fontWeight: entry.tone === 'active' || entry.tone === 'next' ? '900' : '800',
          fill: toneFill[entry.tone] || '#d8fbff',
          wordWrap: false,
          wordWrapWidth: columnWidth,
          lineHeight: listLineHeight,
          letterSpacing: 0
        });
        copy.position.set(
          18 + column * (columnWidth + columnGap),
          listTop + rowIndex * listLineHeight
        );
        fitDisplayToBox(copy, columnWidth, listLineHeight + 2, { minScale: denseArchive ? 0.54 : 0.62 });
        listTexts.push(copy);
      });
    });
    if (!listTexts.length) {
      const copy = createText(fullText, {
        fontFamily: FONT_BODY,
        fontSize: listFontSize,
        fontWeight: '800',
        fill: '#90aeba',
        wordWrap: true,
        wordWrapWidth: columnWidth,
        lineHeight: listLineHeight,
        letterSpacing: 0
      });
      copy.position.set(18, listTop);
      fitDisplayToBox(copy, columnWidth, listHeight, { minScale: denseArchive ? 0.48 : 0.58 });
      listTexts.push(copy);
    }
    panel.addChild(heading, count, hint, ...pageWidgets, ...listTexts);

    panel._pilotOrdersArchive = {
      heading: headingLabel,
      countLabel,
      text: fullText,
      visibleText,
      activeCount: activeOrders.length,
      nextCount: nextOrders.length,
      completedCount: review?.completedCount || 0,
      total: review?.total || 0,
      totalRows: lineEntries.length,
      page: currentPage,
      pageCount,
      rowsPerPage,
      visibleCount: displayLines.length,
      summary: archiveSummary
    };
    return panel;
  }

  getNextShipUnlockSummary(progress = this.unlockProgress) {
    const locked = this.ships
      .filter(ship => !isShipUnlocked(ship.spriteKey, progress))
      .sort((a, b) => (Number(a.unlock?.level) || 1) - (Number(b.unlock?.level) || 1));
    const nextShip = locked[0] || null;
    if (!nextShip) {
      return {
        label: 'ALL SHIPS UNLOCKED',
        value: `${this.ships.length}/${this.ships.length}`,
        detail: translateText('HANGAR COMPLETE: ALL SHIPS UNLOCKED')
      };
    }
    const details = getShipUnlockProgressDetails(nextShip.spriteKey, progress);
    const requirementProgress = details.requirements?.length
      ? details.requirements.slice(0, 3).map((requirement) => {
        const current = Math.min(Number(requirement?.current) || 0, Number(requirement?.target) || 0);
        const target = Number(requirement?.target) || 0;
        const suffix = requirement?.key === 'survivedSeconds' ? 's' : '';
        return `${current.toLocaleString('en-US')}${suffix}/${target.toLocaleString('en-US')}${suffix}`;
      }).join('  ')
      : String(details.label || '');
    return {
      label: 'NEXT SHIP UNLOCK',
      value: nextShip.name,
      detail: `${translateText(String(details.label || 'SHIP PROGRESS').toUpperCase())}: ${requirementProgress}`
    };
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
      nextUnlock: refs.nextUnlock || null,
      stats: (refs.stats || []).map((tile) => bounds(tile)),
      cards: (refs.cards || []).map((card) => bounds(card)),
      snapshot: bounds(refs.snapshot),
      pilotOrdersArchive: refs.pilotOrdersArchive ? {
        bounds: bounds(refs.pilotOrdersArchive),
        heading: refs.pilotOrdersArchive._pilotOrdersArchive?.heading || '',
        countLabel: refs.pilotOrdersArchive._pilotOrdersArchive?.countLabel || '',
        text: refs.pilotOrdersArchive._pilotOrdersArchive?.text || '',
        visibleText: refs.pilotOrdersArchive._pilotOrdersArchive?.visibleText || '',
        activeCount: refs.pilotOrdersArchive._pilotOrdersArchive?.activeCount || 0,
        nextCount: refs.pilotOrdersArchive._pilotOrdersArchive?.nextCount || 0,
        completedCount: refs.pilotOrdersArchive._pilotOrdersArchive?.completedCount || 0,
        total: refs.pilotOrdersArchive._pilotOrdersArchive?.total || 0,
        totalRows: refs.pilotOrdersArchive._pilotOrdersArchive?.totalRows || 0,
        page: refs.pilotOrdersArchive._pilotOrdersArchive?.page || 0,
        pageCount: refs.pilotOrdersArchive._pilotOrdersArchive?.pageCount || 1,
        rowsPerPage: refs.pilotOrdersArchive._pilotOrdersArchive?.rowsPerPage || 0,
        visibleCount: refs.pilotOrdersArchive._pilotOrdersArchive?.visibleCount || 0,
        summary: refs.pilotOrdersArchive._pilotOrdersArchive?.summary || ''
      } : null,
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
    const panelHeight = Math.min(compact ? height - 18 : Math.min(640, height - 44), height - 22);
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const progress = getPilotRankProgress(this.unlockProgress.pilotXp || 0);
    const rankProgress = Math.max(0, Math.min(1, Number(progress.progress) || 0));
    const displayRank = getDisplayRankNumber(progress.rankIndex);
    const nextRank = progress.rankIndex >= MAX_RANK_INDEX
      ? translateText('MAX')
      : getRankTitle(Math.min(MAX_RANK_INDEX, progress.rankIndex + 1)).toUpperCase();
    const unlockedCount = this.ships.filter(candidate => isShipUnlocked(candidate.spriteKey, this.unlockProgress)).length;
    const nextUnlock = this.getNextShipUnlockSummary(this.unlockProgress);
    const pilotOrdersReview = getRunContractCompletionReviewState(this.unlockProgress);

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
      fontSize: compact ? 13 : 15,
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
      [nextUnlock.label, nextUnlock.value, 0xffd15c, nextUnlock.detail],
      ['HULLS READY', `${unlockedCount}/${this.ships.length}`, 0x66ffdd],
      ['XP TO NEXT', Number(progress.xpToNextRank || 0).toLocaleString('en-US'), 0xffef7e],
      ['CODEX SCANS', this.unlockProgress.totalCodexDiscoveries || 0, 0xff55d9],
      ['BOSS RECEIPTS', this.unlockProgress.totalBossesDefeated || 0, 0xff8f5c],
      ['BEST SCORE', Number(this.unlockProgress.bestScore || 0).toLocaleString('en-US'), 0xffffff]
    ].slice(0, short && !narrow ? 3 : 6);
    const statGap = compact ? 7 : 9;
    const statCols = narrow ? 2 : 3;
    const statW = (panelWidth - 80 - statGap * (statCols - 1)) / statCols;
    const statH = compact ? 56 : 64;
    const statStartX = panelX + 40;
    const statTiles = stats.map(([label, value, accent, subline], index) => {
      const col = index % statCols;
      const row = Math.floor(index / statCols);
      const tile = this.createCareerStatTile(label, value, statStartX + col * (statW + statGap), statsTop + row * (statH + statGap), statW, statH, accent, compact, subline);
      overlay.addChild(tile);
      return tile;
    });

    const cardW = panelWidth - 80;
    const cardTop = statsTop + Math.ceil(stats.length / statCols) * (statH + statGap) + (compact ? 8 : 14);
    const cardH = Math.max(
      compact ? 70 : 88,
      Math.min(narrow ? 144 : short ? 108 : 168, panelY + panelHeight - cardTop - (compact ? 68 : 76))
    );
    const pilotOrdersArchive = this.createPilotOrdersArchivePanel(
      pilotOrdersReview,
      panelX + 40,
      cardTop,
      cardW,
      cardH,
      compact
    );
    overlay.addChild(pilotOrdersArchive);
    const cards = [pilotOrdersArchive];

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
      pilotOrdersArchive,
      close,
      nextUnlock
    };
    this.careerInfoOverlay = overlay;
    this.container.addChild(overlay);
    this.startCareerInfoAnimation();
  }

  async exitGameFromHangar() {
    try {
      const result = await requestExitGame();
      if (!result.ok && !result.canceled) this.showHangarMenuNotice(result.message || EXIT_GAME_WEB_MESSAGE);
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
      letterSpacing: 0,
      uiScaleMode: 'none'
    });
    text.position.set(x, y);
    return text;
  }

  getRecommendedShip() {
    const unlocked = this.ships.filter(ship => isShipUnlocked(ship.spriteKey, this.unlockProgress));
    const pool = unlocked.length ? unlocked : this.ships.slice(0, 1);
    return pool
      .slice()
      .sort((a, b) => shipRecommendationScore(b) - shipRecommendationScore(a))[0] || null;
  }

  createRecommendationBanner(width, height) {
    const recommended = this.recommendedShip;
    if (!recommended || this.recommendationDismissed) return;
    const compact = width < 760;
    const uiScale = Math.max(1, Math.min(2, Number(this.layout?.uiScale) || 1));
    const bannerWidth = Math.max(280, Math.min(760, width - (compact ? 32 : 360)));
    const bannerHeight = compact ? 56 : 42;
    const dismissWidth = compact ? 94 : 160;
    const jumpWidth = compact ? 0 : 166;
    const banner = new PIXI.Container();
    banner.label = 'ui_shipRecommendationBanner';
    banner.position.set(width / 2 - bannerWidth / 2, Math.round((compact ? 86 : 100) * Math.min(uiScale, 1.45)));
    banner.zIndex = 50;
    banner.bannerWidth = bannerWidth;
    banner.textWidth = bannerWidth - dismissWidth - jumpWidth - 54;
    banner.eventMode = 'static';
    banner.cursor = compact ? 'default' : 'pointer';

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, bannerWidth, bannerHeight, 8);
    bg.fill({ color: 0x041322, alpha: 0.9 });
    bg.stroke({ color: 0xffd15c, width: 1.8, alpha: 0.86 });
    bg.rect(10, 7, 4, bannerHeight - 14);
    bg.fill({ color: 0x66ffdd, alpha: 0.85 });
    bg.rect(bannerWidth - 14, 7, 4, bannerHeight - 14);
    bg.fill({ color: 0xff55d9, alpha: 0.76 });

    const label = createText('', {
      fontFamily: FONT_BODY,
      fontSize: 14,
      fontWeight: '900',
      fill: '#ffef7e',
      stroke: '#000000',
      strokeThickness: 2,
      letterSpacing: 0
    });
    label.position.set(24, 6);

    const reason = createText('', {
      fontFamily: FONT_BODY,
      fontSize: 12,
      fontWeight: '800',
      fill: '#c9fbff',
      letterSpacing: 0
    });
    reason.position.set(24, compact ? 30 : 24);

    const dismissButton = new PIXI.Container();
    dismissButton.label = 'ui_shipRecommendationDismiss';
    dismissButton.position.set(bannerWidth - dismissWidth - 8, compact ? 11 : 7);
    dismissButton.eventMode = 'static';
    dismissButton.cursor = 'pointer';
    dismissButton.hitArea = new PIXI.Rectangle(0, 0, dismissWidth, compact ? 34 : 28);
    const dismissBg = new PIXI.Graphics();
    dismissBg.roundRect(0, 0, dismissWidth, compact ? 34 : 28, 6);
    dismissBg.fill({ color: 0x13243a, alpha: 0.96 });
    dismissBg.stroke({ color: 0xffd15c, width: 1.2, alpha: 0.8 });
    const dismissText = createText(translateText('DISMISS RECOMMENDATION [X]'), {
      fontFamily: FONT_BODY,
      fontSize: compact ? 10 : 11,
      fontWeight: '900',
      fill: '#ffffff',
      align: 'center',
      letterSpacing: 0
    });
    dismissText.anchor.set(0.5);
    dismissText.position.set(dismissWidth / 2, compact ? 17 : 14);
    fitDisplayToBox(dismissText, dismissWidth - 10, compact ? 23 : 19, { minScale: 0.58 });
    dismissButton.addChild(dismissBg, dismissText);
    dismissButton.on('pointertap', (event) => {
      event.stopPropagation();
      this.dismissRecommendation('pointer');
    });

    let jumpText = null;
    let jumpButton = null;
    if (!compact) {
      jumpButton = new PIXI.Container();
      jumpButton.label = 'ui_shipRecommendationJump';
      jumpButton.position.set(bannerWidth - dismissWidth - jumpWidth - 16, 7);
      jumpButton.eventMode = 'static';
      jumpButton.cursor = 'pointer';
      jumpButton.hitArea = new PIXI.Rectangle(0, 0, jumpWidth, 28);
      const jumpBg = new PIXI.Graphics();
      jumpBg.roundRect(0, 0, jumpWidth, 28, 6);
      jumpBg.fill({ color: 0x083b45, alpha: 0.96 });
      jumpBg.stroke({ color: 0x66ffdd, width: 1.2, alpha: 0.84 });
      jumpText = createText(translateText('VIEW RECOMMENDED [J]'), {
        fontFamily: FONT_BODY,
        fontSize: 11,
        fontWeight: '900',
        fill: '#eafff8',
        align: 'center',
        letterSpacing: 0
      });
      jumpText.anchor.set(0.5);
      jumpText.position.set(jumpWidth / 2, 14);
      fitDisplayToBox(jumpText, jumpWidth - 10, 19, { minScale: 0.58 });
      jumpButton.addChild(jumpBg, jumpText);
      jumpButton.on('pointertap', (event) => {
        event.stopPropagation();
        this.jumpToRecommendedShip('pointer');
      });
    }

    banner.addChild(bg, label, reason);
    if (jumpButton) banner.addChild(jumpButton);
    banner.addChild(dismissButton);
    this.recommendationBanner = banner;
    this.recommendationText = label;
    this.recommendationReasonText = reason;
    this.recommendationDismissText = dismissText;
    this.recommendationJumpText = jumpText;
    this.container.addChild(banner);
    this.updateRecommendationBanner();
  }

  dismissRecommendation(source = 'unknown') {
    if (!this.recommendedShip || this.recommendationDismissed) return false;
    const persisted = acknowledgeHangarRecommendation(this.recommendedShip);
    this.recommendationDismissed = true;
    if (this.recommendationBanner) this.recommendationBanner.visible = false;
    if (typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
    AudioManager.playSfx('menuMove', { volume: 0.18 });
    if (DEBUG) console.log(`[ShipSelect] Recommendation dismissed via ${source}:`, this.recommendationKey, { persisted });
    return true;
  }

  jumpToRecommendedShip(source = 'unknown') {
    if (!this.recommendedShip) return false;
    const index = this.ships.findIndex((ship) => ship.spriteKey === this.recommendedShip.spriteKey);
    if (index < 0) return false;
    if (index !== this.selectedIndex) this.navigateTo(index);
    if (DEBUG) console.log(`[ShipSelect] Recommendation viewed via ${source}:`, this.recommendationKey);
    return true;
  }

  updateRecommendationBanner() {
    if (!this.recommendationBanner || !this.recommendedShip) return;
    const selected = this.ships[this.selectedIndex];
    const usingRecommended = selected?.spriteKey === this.recommendedShip.spriteKey;
    const role = getShipCombatRole(this.recommendedShip, this.statRanges);
    this.recommendationText.text = [translateText('RECOMMENDED HULL'), this.recommendedShip.name].join(': ');
    this.recommendationReasonText.text = usingRecommended
      ? translateText('USING RECOMMENDED HULL')
      : [translateText('BEST UNLOCKED'), role, translateText('HANGAR SAYS THIS ONE HAS THE BEST ODDS')].join(' // ');
    this.recommendationText.scale.set(1);
    this.recommendationReasonText.scale.set(1);
    const textWidth = Number.isFinite(this.recommendationBanner.textWidth)
      ? this.recommendationBanner.textWidth
      : (this.recommendationBanner.width - 48);
    fitDisplayToBox(this.recommendationText, textWidth, 18, { minScale: 0.7 });
    fitDisplayToBox(this.recommendationReasonText, textWidth, 16, { minScale: 0.68 });
  }

  resolvePendingHangarUnlockShips() {
    const ids = [...new Set((this.unlockProgress?.lastNewlyUnlockedShipIds || [])
      .map(id => String(id || '').trim())
      .filter(Boolean))];
    if (!ids.length) return [];
    const idSet = new Set(ids);
    const seen = new Set();
    return this.ships.filter((ship) => {
      const keys = [ship?.baseId, ship?.id, ship?.spriteKey, ship?.baseSpriteKey].filter(Boolean);
      const matched = keys.some(key => idSet.has(String(key)));
      const stableKey = String(ship?.baseId || ship?.id || ship?.spriteKey || '');
      if (!matched || seen.has(stableKey)) return false;
      seen.add(stableKey);
      return true;
    });
  }

  createHangarUnlockPresentation(width, height) {
    const ships = this.pendingHangarUnlockShips || [];
    if (!ships.length) return;
    const displayedShips = ships.slice(0, 5);

    const overlay = new PIXI.Container();
    overlay.label = 'ui_hangarUnlockPresentation';
    overlay.visible = false;
    overlay.zIndex = 1100000;
    overlay.eventMode = 'static';
    overlay.hitArea = new PIXI.Rectangle(0, 0, width, height);

    const dim = new PIXI.Graphics();
    const frameFx = new PIXI.Graphics();
    const panel = new PIXI.Graphics();
    const stageFx = new PIXI.Graphics();
    const shipStage = new PIXI.Container();
    const textLayer = new PIXI.Container();
    overlay.addChild(dim, frameFx, panel, shipStage, textLayer);
    shipStage.addChild(stageFx);

    const narrow = width < 860;
    const panelWidth = Math.min(width - 96, narrow ? width - 48 : 940);
    const panelHeight = Math.min(height - 96, narrow ? height - 72 : 520);
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const title = createText('', {
      fontFamily: FONT_DISPLAY,
      fontSize: narrow ? 34 : 54,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#001018',
      strokeThickness: narrow ? 5 : 7,
      align: 'center',
      letterSpacing: 0
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, panelY + (narrow ? 82 : 88));
    title.style.dropShadow = true;
    title.style.dropShadowColor = '#66ffdd';
    title.style.dropShadowBlur = 14;
    title.style.dropShadowDistance = 0;

    const kicker = createText(translateText(HANGAR_UNLOCK_STRINGS.kicker), {
      fontFamily: FONT_BODY,
      fontSize: narrow ? 12 : 15,
      fontWeight: '900',
      fill: '#ffef7e',
      align: 'center',
      letterSpacing: 0
    });
    kicker.anchor.set(0.5);
    kicker.position.set(width / 2, panelY + 38);

    const subtitle = createText(translateText(HANGAR_UNLOCK_STRINGS.subtitle), {
      fontFamily: FONT_BODY,
      fontSize: narrow ? 14 : 18,
      fontWeight: '800',
      fill: '#b8fff1',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 96,
      letterSpacing: 0
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(width / 2, panelY + (narrow ? 126 : 148));

    const nameText = createText('', {
      fontFamily: FONT_DISPLAY,
      fontSize: narrow ? 23 : 34,
      fontWeight: '900',
      fill: '#ffef7e',
      stroke: '#1d0c00',
      strokeThickness: narrow ? 4 : 5,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 112,
      letterSpacing: 0
    });
    nameText.anchor.set(0.5);
    nameText.position.set(width / 2, panelY + panelHeight - (narrow ? 118 : 126));

    const roleText = createText('', {
      fontFamily: FONT_BODY,
      fontSize: narrow ? 13 : 16,
      fontWeight: '900',
      fill: '#9cfbff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 132,
      letterSpacing: 0
    });
    roleText.anchor.set(0.5);
    roleText.position.set(width / 2, panelY + panelHeight - (narrow ? 76 : 82));

    const hintText = createText(translateText(HANGAR_UNLOCK_STRINGS.continue), {
      fontFamily: FONT_BODY,
      fontSize: narrow ? 12 : 15,
      fontWeight: '900',
      fill: '#ffffff',
      align: 'center',
      letterSpacing: 0
    });
    hintText.anchor.set(0.5);
    hintText.position.set(width / 2, panelY + panelHeight - 36);

    const countText = createText('', {
      fontFamily: FONT_BODY,
      fontSize: narrow ? 12 : 15,
      fontWeight: '900',
      fill: '#ff55d9',
      align: 'right',
      letterSpacing: 0
    });
    countText.anchor.set(1, 0);
    countText.position.set(panelX + panelWidth - 34, panelY + 34);

    textLayer.addChild(kicker, title, subtitle, nameText, roleText, hintText, countText);
    shipStage.position.set(width / 2, panelY + panelHeight * (narrow ? 0.48 : 0.5));

    this.hangarUnlockPresentationSprites = [];
    displayedShips.forEach((ship, index) => {
      const texture = GameAssets.getRankShipTexture(ship.textureIndex) || PIXI.Texture.EMPTY;
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.alpha = 0;
      sprite.__unlockIndex = index;
      sprite.__unlockSeed = index * 1.7 + (Number(ship.textureIndex) || 0) * 0.09;
      const shipPath = GameAssets.getRankShipPath(ship.textureIndex)
        || AssetManifest.sprites.playerRankShips?.[ship.textureIndex]
        || null;
      if ((!texture || texture === PIXI.Texture.EMPTY || texture.width <= 1 || texture.height <= 1) && shipPath) {
        PIXI.Assets.load(shipPath)
          .then((loadedTexture) => {
            if (loadedTexture && loadedTexture.width > 0 && loadedTexture.height > 0) sprite.texture = loadedTexture;
          })
          .catch((error) => console.warn('[ShipSelect] Hangar unlock texture failed:', shipPath, error));
      }
      this.hangarUnlockPresentationSprites.push(sprite);
      shipStage.addChild(sprite);
    });

    const names = displayedShips.map(ship => ship.name).join(' // ');
    const primaryRole = getShipCombatRole(ships[0], this.statRanges);
    title.text = translateText(ships.length === 1 ? HANGAR_UNLOCK_STRINGS.titleSingle : HANGAR_UNLOCK_STRINGS.titlePlural);
    nameText.text = names;
    roleText.text = [translateText(HANGAR_UNLOCK_STRINGS.rolePrefix), primaryRole].join(': ');
    countText.text = [translateText(HANGAR_UNLOCK_STRINGS.countPrefix), String(ships.length)].join(' ');
    const titleBaseScale = fitDisplayToBox(title, panelWidth - 112, narrow ? 54 : 72, { minScale: 0.58 });
    const nameBaseScale = fitDisplayToBox(nameText, panelWidth - 112, narrow ? 36 : 44, { minScale: 0.5 });
    const roleBaseScale = fitDisplayToBox(roleText, panelWidth - 132, narrow ? 24 : 28, { minScale: 0.62 });
    const hintBaseScale = fitDisplayToBox(hintText, panelWidth - 128, 22, { minScale: 0.62 });

    overlay.on('pointerdown', (event) => {
      event.stopPropagation();
      this.dismissHangarUnlockPresentation('pointer');
    });

    this.hangarUnlockPresentationRefs = {
      width,
      height,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      narrow,
      dim,
      frameFx,
      panel,
      stageFx,
      shipStage,
      title,
      kicker,
      subtitle,
      nameText,
      roleText,
      hintText,
      countText,
      displayedShips,
      baseScales: {
        title: titleBaseScale,
        name: nameBaseScale,
        role: roleBaseScale,
        hint: hintBaseScale
      }
    };
    this.hangarUnlockPresentation = overlay;
    this.container.addChild(overlay);
    this.drawHangarUnlockPresentation();
  }

  startHangarUnlockPresentation() {
    if (!this.hangarUnlockPresentation || this.hangarUnlockPresentationActive || !this.pendingHangarUnlockShips?.length) return false;
    this.hangarUnlockPresentation.visible = true;
    this.hangarUnlockPresentationActive = true;
    this.hangarUnlockPresentationStartedAt = Date.now();
    this.hangarUnlockPresentationAcked = false;
    this.drawHangarUnlockPresentation();

    AudioManager.playSfx('forceField', { force: true, volume: 0.52 });
    AudioManager.playSfx('ship_lock_chime', { force: true, volume: 0.62 });
    this.menuFx?.burst?.(this.game.getWidth() / 2, this.game.getHeight() * 0.5, {
      color: this.pendingHangarUnlockShips[0]?.visuals?.variant?.accent || 0xffef7e,
      radius: 260,
      durationMs: 980
    });

    this.hangarUnlockPresentationTicker = () => this.drawHangarUnlockPresentation();
    this.game.app.ticker.add(this.hangarUnlockPresentationTicker);
    this.hangarUnlockPresentationTimer = setTimeout(() => {
      this.dismissHangarUnlockPresentation('auto');
    }, HANGAR_UNLOCK_PRESENTATION_MS);
    return true;
  }

  dismissHangarUnlockPresentation(source = 'unknown') {
    if (!this.hangarUnlockPresentation || (!this.hangarUnlockPresentationActive && this.hangarUnlockPresentationAcked)) return false;
    if (this.hangarUnlockPresentationTimer) {
      clearTimeout(this.hangarUnlockPresentationTimer);
      this.hangarUnlockPresentationTimer = null;
    }
    if (this.hangarUnlockPresentationTicker) {
      this.game.app.ticker.remove(this.hangarUnlockPresentationTicker);
      this.hangarUnlockPresentationTicker = null;
    }
    this.hangarUnlockPresentationActive = false;
    this.hangarUnlockPresentation.visible = false;
    if (!this.hangarUnlockPresentationAcked) {
      this.hangarUnlockPresentationAcked = true;
      try {
        this.unlockProgress = acknowledgeHangarUnlockPresentation();
      } catch (error) {
        console.warn('[ShipSelect] Failed to acknowledge hangar unlock presentation:', error);
      }
      this.pendingHangarUnlockShips = [];
      this.updateIntelPanels();
    }
    if (source !== 'auto') AudioManager.playSfx('powerup', { force: false, volume: 0.22 });
    return true;
  }

  drawHangarUnlockPresentation() {
    const refs = this.hangarUnlockPresentationRefs;
    if (!refs) return;
    const {
      width,
      height,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      narrow,
      dim,
      frameFx,
      panel,
      stageFx,
      title,
      kicker,
      subtitle,
      nameText,
      roleText,
      hintText,
      countText,
      baseScales
    } = refs;
    const startedAt = this.hangarUnlockPresentationStartedAt || Date.now();
    const age = Math.max(0, Date.now() - startedAt);
    const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.5;
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const intro = clamp01(age / 780);
    const easeOutBack = (value) => {
      const x = clamp01(value);
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };

    dim.clear();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x010711, alpha: 0.18 + intro * 0.74 });

    frameFx.clear();
    const centerX = width / 2;
    const centerY = panelY + panelHeight * 0.5;
    for (let i = 0; i < 5; i += 1) {
      const radius = ((age * 0.12 + i * 86) % Math.max(160, panelWidth * 0.58)) + 42;
      frameFx.circle(centerX, centerY, radius);
      frameFx.stroke({ color: i % 2 === 0 ? 0x66ffdd : 0xff55d9, width: 1.4, alpha: (1 - radius / Math.max(180, panelWidth * 0.72)) * 0.18 * intro });
    }
    for (let i = 0; i < 12; i += 1) {
      const x = panelX + 32 + i * ((panelWidth - 64) / 11);
      frameFx.moveTo(x, panelY + 18);
      frameFx.lineTo(x + Math.sin(Date.now() * 0.001 + i) * 42, panelY + panelHeight - 18);
    }
    frameFx.stroke({ color: 0x37f5ff, width: 1, alpha: 0.06 + pulse * 0.035 });

    panel.clear();
    panel.roundRect(panelX - 12, panelY - 10, panelWidth + 24, panelHeight + 20, 16);
    panel.fill({ color: 0x66ffdd, alpha: 0.05 + pulse * 0.04 });
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
    panel.fill({ color: 0x06101c, alpha: 0.86 + intro * 0.1 });
    panel.stroke({ color: 0x66ffdd, width: 2.6, alpha: 0.62 + pulse * 0.28 });
    panel.roundRect(panelX + 14, panelY + 14, panelWidth - 28, panelHeight - 28, 10);
    panel.stroke({ color: 0xff55d9, width: 1.5, alpha: 0.38 + pulse * 0.18 });
    panel.rect(panelX + 28, panelY + 28, panelWidth - 56, 3);
    panel.fill({ color: 0xffef7e, alpha: 0.76 });
    panel.rect(panelX + 28, panelY + panelHeight - 30, panelWidth - 56, 2);
    panel.fill({ color: 0x37f5ff, alpha: 0.5 });

    const scanX = panelX + 36 + ((age * 0.34) % Math.max(1, panelWidth - 72));
    panel.rect(scanX, panelY + 42, 4, panelHeight - 84);
    panel.fill({ color: 0xffffff, alpha: 0.18 + pulse * 0.12 });

    const titleScale = 0.78 + easeOutBack(age / 620) * 0.22;
    title.scale.set((baseScales?.title || 1) * titleScale);
    title.alpha = intro;
    kicker.alpha = 0.65 + pulse * 0.35;
    subtitle.alpha = 0.82 + pulse * 0.18;
    nameText.alpha = intro;
    nameText.scale.set((baseScales?.name || 1) * (1 + pulse * 0.025));
    roleText.scale.set(baseScales?.role || 1);
    hintText.scale.set(baseScales?.hint || 1);
    roleText.alpha = 0.86 + pulse * 0.14;
    hintText.alpha = 0.44 + pulse * 0.56;
    countText.alpha = 0.58 + pulse * 0.42;

    stageFx.clear();
    const sprites = this.hangarUnlockPresentationSprites || [];
    const spriteSize = narrow ? 126 : 172;
    const gap = Math.min(narrow ? 132 : 164, Math.max(narrow ? 92 : 122, panelWidth / Math.max(2.8, sprites.length + 1)));
    const startX = -((sprites.length - 1) * gap) / 2;
    sprites.forEach((sprite, index) => {
      const textureWidth = Math.max(1, sprite.texture.width || sprite.width || spriteSize);
      const textureHeight = Math.max(1, sprite.texture.height || sprite.height || spriteSize);
      const baseScale = Math.min(spriteSize / textureWidth, spriteSize / textureHeight);
      const localAge = age - index * 170;
      const pop = easeOutBack(localAge / 700);
      const settle = clamp01(localAge / 820);
      const x = startX + index * gap;
      const y = Math.sin(Date.now() * 0.004 + (sprite.__unlockSeed || index)) * (narrow ? 5 : 8) - (1 - settle) * 76;
      const spritePulse = 1 + Math.sin(Date.now() * 0.006 + index) * 0.035;
      sprite.x = x;
      sprite.y = y;
      sprite.alpha = clamp01(localAge / 340);
      sprite.rotation = Math.sin(Date.now() * 0.0028 + index) * 0.045 + (1 - settle) * (index % 2 ? 0.18 : -0.18);
      sprite.scale.set(baseScale * (0.48 + pop * 0.52) * spritePulse);

      const ringPulse = 0.5 + Math.sin(Date.now() * 0.007 + index * 0.9) * 0.5;
      stageFx.circle(x, y, spriteSize * (0.52 + ringPulse * 0.08));
      stageFx.stroke({ color: index % 2 ? 0xff55d9 : 0x66ffdd, width: narrow ? 1.6 : 2.2, alpha: 0.24 + ringPulse * 0.24 });
      stageFx.circle(x, y, spriteSize * (0.68 + pulse * 0.05));
      stageFx.stroke({ color: 0xffef7e, width: 1, alpha: 0.16 + pulse * 0.12 });
      const exhaustY = y + spriteSize * 0.34;
      stageFx.moveTo(x - spriteSize * 0.18, exhaustY);
      stageFx.lineTo(x - spriteSize * 0.32, exhaustY + spriteSize * (0.16 + ringPulse * 0.08));
      stageFx.moveTo(x + spriteSize * 0.18, exhaustY);
      stageFx.lineTo(x + spriteSize * 0.32, exhaustY + spriteSize * (0.16 + ringPulse * 0.08));
      stageFx.stroke({ color: 0x9cfbff, width: narrow ? 2 : 3, alpha: 0.26 + ringPulse * 0.22 });
    });

    refs.layout = {
      panel: {
        x: Math.round(panelX),
        y: Math.round(panelY),
        width: Math.round(panelWidth),
        height: Math.round(panelHeight)
      },
      spriteSize,
      spriteCount: sprites.length,
      ageMs: Math.round(age)
    };
  }

  getHangarUnlockPresentationDebugState(getBounds) {
    const bounds = typeof getBounds === 'function' ? getBounds : () => null;
    const ships = this.pendingHangarUnlockShips || [];
    return {
      visible: Boolean(this.hangarUnlockPresentation?.visible),
      active: Boolean(this.hangarUnlockPresentationActive),
      acknowledged: Boolean(this.hangarUnlockPresentationAcked),
      count: ships.length,
      names: ships.map(ship => ship.name),
      displayedNames: (this.hangarUnlockPresentationRefs?.displayedShips || []).map(ship => ship.name),
      hiddenNameCount: Math.max(0, ships.length - (this.hangarUnlockPresentationRefs?.displayedShips?.length || 0)),
      spriteKeys: ships.map(ship => ship.spriteKey),
      selectedUnlockFocused: ships.some(ship => ship.spriteKey === this.ships[this.selectedIndex]?.spriteKey),
      animated: Boolean(this.hangarUnlockPresentationStartedAt && (Date.now() - this.hangarUnlockPresentationStartedAt) > 80),
      layout: this.hangarUnlockPresentationRefs?.layout || null,
      bounds: bounds(this.hangarUnlockPresentation),
      panelBounds: this.hangarUnlockPresentationRefs?.layout?.panel || null,
      title: this.hangarUnlockPresentationRefs?.title?.text || null,
      textBounds: {
        title: bounds(this.hangarUnlockPresentationRefs?.title),
        names: bounds(this.hangarUnlockPresentationRefs?.nameText),
        role: bounds(this.hangarUnlockPresentationRefs?.roleText),
        hint: bounds(this.hangarUnlockPresentationRefs?.hintText)
      }
    };
  }

  createIntelPanels(width, height) {
    this.intelPanels = new PIXI.Container();
    this.container.addChild(this.intelPanels);
    const uiScale = Math.max(1, Math.min(2, Number(this.layout?.uiScale) || 1));
    const panelMargin = Math.round(22 * Math.min(uiScale, 1.45));
    const panelTop = Math.round((this.layout.isMobile ? 118 : 128) * Math.min(uiScale, 1.45));

    if (this.layout.showLeftIntel) {
      const left = this.createPanel(260, 336, 0x66ffdd);
      left.position.set(panelMargin, panelTop);
      left.scale.set(uiScale);
      left.eventMode = 'static';
      left.cursor = 'pointer';
      left.hitArea = new PIXI.Rectangle(0, 0, 260, 336);
      left.on('pointerdown', (e) => {
        e.stopPropagation();
        this.openCareerInfoOverlay('pointer');
      });
      const alertGlow = new PIXI.Graphics();
      const rankRail = new PIXI.Graphics();
      const title = this.createIntelText('CAREER SIGNAL', 16, 14, 17, '#ffffff', '900');
      const count = this.createIntelText('', 16, 54, 19, '#ffef7e', '900');
      const progress = this.createIntelText('', 16, 108, 15, '#b8fff1');
      const stats = this.createIntelText('', 16, 210, 15, '#d8fbff');
      const hint = this.createIntelText('CLICK FOR CAREER + PILOT ORDERS', 16, 286, 15, '#ffef7e', '900');
      [progress, stats, hint].forEach(text => {
        text.style.wordWrapWidth = 226;
      });
      left.addChild(alertGlow, title, count, rankRail, progress, stats, hint);
      this.leftIntel = { panel: left, alertGlow, rankRail, count, progress, stats, hint };
      this.intelPanels.addChild(left);
    }

    if (this.layout.showSideIntel) {
      const right = this.createPanel(300, 434, 0xffd166);
      right.position.set(width - panelMargin - 300 * uiScale, panelTop);
      right.scale.set(uiScale);
      const title = this.createIntelText('COMBAT READOUT', 16, 12, 16, '#ffffff', '900');
      const role = this.createIntelText('', 16, 50, 20, '#ffef7e', '900');
      const weapon = this.createIntelText('', 16, 96, 15, '#d8fbff');
      const trait = this.createIntelText('', 16, 158, 15, '#9ceeff');
      const unlock = this.createIntelText('', 16, 370, 15, '#ffd166', '900');
      role.style.wordWrapWidth = 268;
      weapon.style.wordWrapWidth = 268;
      trait.style.wordWrapWidth = 268;
      unlock.style.wordWrapWidth = 268;
      const statPanel = createShipStatPanel(this.ships[this.selectedIndex], {
        compact: true,
        width: 266,
        accent: 0xffd166,
        ranges: this.statRanges,
        title: 'LIVE TUNE',
        uiScaleMode: 'none'
      });
      statPanel.position.set(150, 236);
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
    // Reserve a clear gutter before the side readouts on compact desktop.
    const offset = this.layout.isMobile
      ? (width / 2 - 64)
      : Math.min(width < 1400 && this.layout.showSideIntel ? 280 : 330, width * 0.28);
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
    this.compactHangar = !this.layout.isMobile && carouselHeight < 660;
    this.centerScale = this.layout.isMobile ? 1.02 : (this.compactHangar ? 1.08 : 1.22);
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
    const usageCount = getShipUsage(ship.spriteKey);
    const firstFlight = !locked && usageCount === 0;
    const accent = variant?.accent || 0x00ffff;
    const textAccent = this.getReadableAccent(variant);
    const glowColor = variant?.glow || variant?.tint || 0x00ff00;
    const tierLabel = getShipTierLabel(ship);

    const art = ship.art || {};
    const heroY = this.layout.isMobile
      ? (Number.isFinite(art.hangarHeroYMobile) ? art.hangarHeroYMobile : -38)
      : (!this.compactHangar
        ? (Number.isFinite(art.hangarHeroY) ? art.hangarHeroY : -58)
        : (Number.isFinite(art.hangarHeroYCompact) ? art.hangarHeroYCompact : -58));
    const baseHeroSize = this.layout.isMobile ? 128 : 172;
    const authoredHeroScale = this.layout.isMobile
      ? art.hangarHeroScaleMobile
      : (!this.compactHangar ? art.hangarHeroScale : art.hangarHeroScaleCompact);
    const prestigeScale = Number.isFinite(authoredHeroScale)
      ? authoredHeroScale
      : (art.inscription ? (this.layout.showSideIntel ? 1.24 : 1.05) : 1);
    const heroSize = Math.round(baseHeroSize * prestigeScale);
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

    const hangarSignature = createHangarSignature(art, heroSize, heroY, accent, glowColor, locked);
    if (hangarSignature) {
      container.addChild(hangarSignature);
      container.hangarSignature = hangarSignature;
    }

    // Ship sprite (large for better visibility)
    const shipTexture = GameAssets.getRankShipTexture(ship.textureIndex)
      || await GameAssets.ensureRankShipTexture(ship.textureIndex);
    if (shipTexture && shipTexture.width > 0) {
      const sprite = new PIXI.Sprite(shipTexture);
      sprite.anchor.set(0.5);
      sprite.position.set(0, heroY);
      if (Number.isFinite(variant?.tint) && ship.art?.temporaryFallback !== false) {
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

    if (tierLabel) {
      const badgeWidth = this.layout.isMobile ? 156 : 190;
      const badge = new PIXI.Container();
      badge.position.set(-badgeWidth / 2, this.layout.isMobile ? 50 : (this.compactHangar ? 48 : 60));
      const badgeBg = new PIXI.Graphics();
      badgeBg.roundRect(0, 0, badgeWidth, 24, 6);
      badgeBg.fill({ color: 0x13061f, alpha: 0.9 });
      badgeBg.stroke({ color: 0xffef7e, width: 1.4, alpha: 0.88 });
      const badgeText = createText(tierLabel, {
        fontFamily: FONT_DISPLAY,
        fontSize: this.layout.isMobile ? 12 : 14,
        fill: '#ffef7e',
        align: 'center',
        fontWeight: '900',
        letterSpacing: 0,
        stroke: '#000000',
        strokeThickness: 2
      });
      badgeText.anchor.set(0.5);
      badgeText.position.set(badgeWidth / 2, 12);
      badge.addChild(badgeBg, badgeText);
      container.addChild(badge);
      container.tierBadge = badge;
    }

    if (firstFlight) {
      const badgeWidth = this.layout.isMobile ? 116 : 138;
      const badgeHeight = this.layout.isMobile ? 24 : 28;
      const badge = new PIXI.Container();
      const preferredBadgeY = heroY - heroSize * (this.layout.isMobile ? 0.7 : 0.66);
      const viewportSafeBadgeY = (10 - this.carouselContainer.y) / this.centerScale;
      badge.position.set(-badgeWidth / 2, Math.max(preferredBadgeY, viewportSafeBadgeY));
      const badgeGlow = new PIXI.Graphics();
      badgeGlow.roundRect(-4, -4, badgeWidth + 8, badgeHeight + 8, 9);
      badgeGlow.fill({ color: 0xffef7e, alpha: 0.11 });
      const badgeBg = new PIXI.Graphics();
      badgeBg.roundRect(0, 0, badgeWidth, badgeHeight, 7);
      badgeBg.fill({ color: 0x13061f, alpha: 0.96 });
      badgeBg.stroke({ color: 0xffef7e, width: 1.8, alpha: 0.96 });
      const badgeText = createText(translateText('FIRST FLIGHT'), {
        fontFamily: FONT_DISPLAY,
        fontSize: this.layout.isMobile ? 13 : 15,
        fill: '#ffef7e',
        align: 'center',
        fontWeight: '900',
        stroke: '#000000',
        strokeThickness: 2
      });
      badgeText.anchor.set(0.5);
      badgeText.position.set(badgeWidth / 2, badgeHeight / 2);
      badge.addChild(badgeGlow, badgeBg, badgeText);
      container.addChild(badge);
      container.firstFlightBadge = badge;
      container.firstFlightBadgeText = badgeText;
    }

    const mastery = getShipMasteryView(this.unlockProgress?.shipSpecificMilestones?.[ship.id], ship);
    const masteryLayout = getShipMasteryBadgeLayout({ mobile: this.layout.isMobile });
    const masteryBadge = new PIXI.Container();
    masteryBadge.label = 'hangarShipMasteryBadge';
    const masteryWidth = masteryLayout.width;
    const masteryHeight = masteryLayout.height;
    masteryBadge.position.set(
      heroSize * (this.layout.isMobile ? 0.38 : 0.42),
      heroY + heroSize * (this.layout.isMobile ? 0.36 : 0.38)
    );
    const masteryBg = new PIXI.Graphics();
    masteryBg.roundRect(0, 0, masteryWidth, masteryHeight, 7);
    masteryBg.fill({ color: 0x020711, alpha: 0.92 });
    masteryBg.stroke({ color: mastery.tier.color, width: 1.4, alpha: mastery.tier.rank > 0 ? 0.88 : 0.44 });
    masteryBadge.addChild(masteryBg);
    [SHIP_MASTERY_TIERS.bronze, SHIP_MASTERY_TIERS.silver, SHIP_MASTERY_TIERS.gold].forEach((tier, medalIndex) => {
      const earned = mastery.tier.rank >= tier.rank;
      const medal = new PIXI.Graphics();
      const medalX = masteryLayout.medalStartX + medalIndex * masteryLayout.medalSpacing;
      medal.circle(medalX, masteryHeight / 2, masteryLayout.medalRadius);
      medal.fill({ color: earned ? tier.color : 0x173044, alpha: earned ? 0.98 : 0.72 });
      medal.stroke({ color: earned ? 0xffffff : 0x527084, width: earned ? 1.2 : 0.8, alpha: earned ? 0.82 : 0.45 });
      masteryBadge.addChild(medal);
    });
    const clearLabel = createText(translateText('CLEARS'), {
      fontFamily: FONT_DISPLAY,
      fontSize: this.layout.isMobile ? 13 : 16,
      fill: mastery.tier.rank > 0 ? hexColor(mastery.tier.color) : '#91a8b8',
      fontWeight: '900',
      stroke: '#000000',
      strokeThickness: 2
    });
    clearLabel.label = 'hangarShipMasteryClearsLabel';
    clearLabel.anchor.set(0, 0.5);
    clearLabel.position.set(masteryLayout.labelX, masteryHeight / 2);
    const clearLabelMeasuredWidth = clearLabel.width;
    const clearLabelScale = fitMasteryTextScale(clearLabelMeasuredWidth, masteryLayout.labelMaxWidth);
    clearLabel.scale.set(clearLabelScale);
    masteryBadge.addChild(clearLabel);

    const clearCount = createText(String(Math.max(0, Math.round(Number(mastery.clears) || 0))), {
      fontFamily: FONT_DISPLAY,
      fontSize: this.layout.isMobile ? 14 : 16,
      fill: mastery.tier.rank > 0 ? '#f5ffff' : '#b8cad6',
      fontWeight: '900',
      stroke: '#000000',
      strokeThickness: 2
    });
    clearCount.label = 'hangarShipMasteryClearsCount';
    clearCount.anchor.set(1, 0.5);
    clearCount.position.set(masteryLayout.countRightX, masteryHeight / 2);
    const clearCountMeasuredWidth = clearCount.width;
    const clearCountScale = fitMasteryTextScale(clearCountMeasuredWidth, masteryLayout.countMaxWidth);
    clearCount.scale.set(clearCountScale);
    masteryBadge.addChild(clearCount);

    const identityDivider = new PIXI.Graphics();
    identityDivider.moveTo(masteryLayout.dividerX, 6);
    identityDivider.lineTo(masteryLayout.dividerX, masteryHeight - 6);
    identityDivider.stroke({ color: mastery.tier.color, width: 1, alpha: 0.28 });
    masteryBadge.addChild(identityDivider);
    const identityIcon = new PIXI.Graphics();
    const identity = mastery.identity || { accent: textAccent, spokes: 6, satellites: 2, phase: 0, key: 'balanced' };
    const iconX = masteryLayout.identityX;
    const iconRadius = masteryLayout.identityRadius;
    const iconPhase = Number(identity.phase) || 0;
    const spokeCount = Math.max(3, Math.min(10, Number(identity.spokes) || 6));
    for (let index = 0; index < spokeCount; index += 1) {
      const angle = iconPhase + (Math.PI * 2 * index) / spokeCount;
      identityIcon.moveTo(Math.cos(angle) * 1.8, Math.sin(angle) * 1.8);
      identityIcon.lineTo(Math.cos(angle) * iconRadius, Math.sin(angle) * iconRadius);
    }
    identityIcon.stroke({ color: identity.accent, width: 1.1, alpha: 0.9 });
    const satelliteCount = Math.max(0, Math.min(4, Number(identity.satellites) || 0));
    for (let index = 0; index < satelliteCount; index += 1) {
      const angle = iconPhase + (Math.PI * 2 * index) / Math.max(1, satelliteCount);
      identityIcon.circle(Math.cos(angle) * (iconRadius + 2), Math.sin(angle) * (iconRadius + 2), 1.2);
    }
    identityIcon.fill({ color: identity.accent, alpha: 0.9 });
    identityIcon.position.set(iconX, masteryHeight / 2);
    identityIcon.label = 'hangarShipMasteryIdentity';
    masteryBadge.addChild(identityIcon);
    const masteryRegions = getMasteryBadgeRegionDebug(masteryLayout, {
      labelWidth: clearLabelMeasuredWidth * clearLabelScale,
      countWidth: clearCountMeasuredWidth * clearCountScale
    });
    masteryBadge.__debugMastery = {
      tier: mastery.tier.id,
      medalCount: mastery.medalCount,
      renderedMedalCount: 3,
      clears: mastery.clears,
      clearLabel: clearLabel.text,
      clearCount: clearCount.text,
      identity: { ...identity },
      layout: { ...masteryLayout },
      regions: masteryRegions,
      overlapFree: Object.values(masteryRegions.overlaps).every((value) => value === false),
      threeDigitCapacity: true,
      rewardsAdded: false
    };
    container.addChild(masteryBadge);
    container.masteryBadge = masteryBadge;
    container.masteryIdentityIcon = identityIcon;

    if (mastery.overrunClears > 0) {
      const overrunBadge = new PIXI.Container();
      overrunBadge.label = 'hangarShipOverrunBadge';
      const overrunWidth = this.layout.isMobile ? 132 : 154;
      const overrunHeight = this.layout.isMobile ? 23 : 26;
      overrunBadge.position.set(masteryBadge.x + masteryWidth - overrunWidth, masteryBadge.y + masteryHeight + 6);
      const overrunBg = new PIXI.Graphics();
      overrunBg.roundRect(0, 0, overrunWidth, overrunHeight, 7);
      overrunBg.fill({ color: 0x06111b, alpha: 0.94 });
      overrunBg.stroke({ color: 0x61f6ff, width: 1.2, alpha: 0.82 });
      const overrunText = createText(translateText('OVERRUN ×{count}', { count: mastery.overrunClears }), {
        fontFamily: FONT_DISPLAY,
        fontSize: this.layout.isMobile ? 9 : 10,
        fill: '#ffd76a',
        fontWeight: '900',
        stroke: '#000000',
        strokeThickness: 2
      });
      overrunText.label = 'hangarShipOverrunText';
      overrunText.anchor.set(0.5);
      overrunText.position.set(overrunWidth / 2, overrunHeight / 2);
      fitDisplayToBox(overrunText, overrunWidth - 18, overrunHeight - 6, { minScale: 0.7 });
      overrunBadge.addChild(overrunBg, overrunText);
      overrunBadge.__debugOverrun = {
        clears: mastery.overrunClears,
        label: overrunText.text,
        separateFromRankedMastery: true,
        visibleOnlyWhenEarned: true,
        bounds: { width: overrunWidth, height: overrunHeight }
      };
      container.addChild(overrunBadge);
      container.overrunBadge = overrunBadge;
    }

    // Ship name below sprite - LARGER and more readable
    const name = createText(ship.name, {
      fontFamily: FONT_DISPLAY,
      fontSize: this.layout.isMobile ? 22 : (this.compactHangar ? 26 : 30),
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
    name.position.set(0, this.layout.isMobile ? 77 : (this.compactHangar ? 78 : 88));
    container.addChild(name);
    container.nameText = name;

    // Ship description - BETTER spacing and size
    const description = ship.baseDescription || ship.description || '';
    const desc = createText(description, {
      fontFamily: FONT_BODY,
      fontSize: this.layout.isMobile ? 14 : (this.compactHangar ? 15 : 16),
      fill: '#d8fbff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: this.layout.isMobile ? 310 : (this.compactHangar ? 540 : 560),
      lineHeight: this.layout.isMobile ? 18 : (this.compactHangar ? 19 : 21),
      fontWeight: '700'
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(0, this.layout.isMobile ? 108 : (this.compactHangar ? 112 : 126));
    container.addChild(desc);
    container.descText = desc;

    const traitText = this.getShipTraitText(ship);
    const trait = createText(traitText, {
      fontFamily: FONT_BODY,
      fontSize: this.layout.isMobile ? 14 : (this.compactHangar ? 14 : 16),
      fill: this.toHexText(textAccent),
      align: 'center',
      wordWrap: true,
      wordWrapWidth: this.layout.isMobile ? 330 : (this.compactHangar ? 600 : 560),
      lineHeight: this.layout.isMobile ? 19 : (this.compactHangar ? 18 : 21),
      stroke: '#000000',
      strokeThickness: 2
    });
    trait.anchor.set(0.5, 0);
    trait.position.set(0, bottomOf(desc) + (this.layout.isMobile ? 10 : (this.compactHangar ? 8 : 12)));
    fitDisplayToBox(trait, this.layout.isMobile ? 330 : (this.compactHangar ? 600 : 580), this.layout.isMobile ? 62 : (this.compactHangar ? 58 : 82), { minScale: 0.68 });
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
    statPanel.position.set(0, Math.max(this.layout.isMobile ? 176 : 194, bottomOf(trait) + 10));
    statPanel.visible = !this.compactHangar;
    container.addChild(statPanel);
    container.statPanel = statPanel;

    container.shipData = ship;
    container.locked = locked;
    container.usageCount = usageCount;
    container.firstFlightEligible = firstFlight;
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
      if (shipContainer.tierBadge) shipContainer.tierBadge.visible = isCenter;
      if (shipContainer.firstFlightBadge) {
        // Compact desktop already states FIRST FLIGHT in the right-side combat
        // readout. Hiding the duplicate badge keeps the title/recommendation
        // header clear at 1280x720 and 1280x800.
        shipContainer.firstFlightBadge.visible = isCenter && this.layout.showSideIntel && !this.compactHangar;
      }
      if (shipContainer.masteryBadge) shipContainer.masteryBadge.visible = isCenter && !this.layout.showSideIntel;
      if (shipContainer.overrunBadge) shipContainer.overrunBadge.visible = isCenter && !this.layout.showSideIntel;
      if (shipContainer.statPanel) shipContainer.statPanel.visible = isCenter && !this.layout.showSideIntel && !this.compactIntel;
      if (shipContainer.lockPlate) shipContainer.lockPlate.visible = isCenter;
      if (shipContainer.lockText) shipContainer.lockText.visible = isCenter;
      if (shipContainer.pedestal) shipContainer.pedestal.visible = isCenter;
      if (shipContainer.hangarSignature) shipContainer.hangarSignature.visible = isCenter;

      if (!isCenter) {
        if (shipContainer.outerRing) shipContainer.outerRing.alpha = 0;
        if (shipContainer.midRing) shipContainer.midRing.alpha = 0;
        if (shipContainer.innerGlow) shipContainer.innerGlow.alpha = 0;
        if (shipContainer.lightRays) shipContainer.lightRays.alpha = 0;
        if (shipContainer.scanLine) shipContainer.scanLine.alpha = 0;
        if (shipContainer.hangarSignature) shipContainer.hangarSignature.alpha = 0;
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
    // Reserve a real footer lane: buttons sit above the prompt rather than
    // sharing the same pixels with it.
    const buttonY = height - (isMobile ? 104 : 94);
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
    this.detailsButton.actionId = 'details';
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
    this.startButton.actionId = 'start';
    this.container.addChild(this.startButton);

    this.randomButton = this.createButton(
      'RANDOM',
      isMobile ? rowX + buttonWidth * 2 + buttonSpacing * 2 : width - randomWidth - 28,
      isMobile ? buttonY : height - 52,
      randomWidth,
      isMobile ? buttonHeight : 30,
      0x101a33,
      0x66ffff,
      () => this.navigateRandom()
    );
    this.randomButton.actionId = 'random';
    this.container.addChild(this.randomButton);
    this.actionButtons = [this.detailsButton, this.startButton, this.randomButton];
    this.syncActionButtonFocus();
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
    const ship = this.ships[this.selectedIndex];

    // More dramatic navigation sound
    AudioManager.playSfx('thrusterFire', { volume: 0.25 });
    playMenuFocusSfx(0.12);
    this.menuFx?.burst?.(this.game.getWidth() / 2, this.game.getHeight() * 0.52, {
      color: ship?.visuals?.variant?.accent || ship?.visuals?.variant?.glow || 0x66ffdd,
      radius: 160,
      durationMs: 520
    });

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
    const unlocked = ship && isShipUnlocked(ship.spriteKey, this.unlockProgress);
    const status = unlocked
      ? (getShipUsage(ship.spriteKey) === 0 ? translateText('FIRST FLIGHT') : translateText('READY'))
      : getShipUnlockLabel(ship?.spriteKey);
    const activeKey = isValidShipKey(this.game?.selectedShipSpriteKey)
      ? resolveShipKey(this.game.selectedShipSpriteKey)
      : this.activeShipSpriteKey;
    const activeIndex = Math.max(0, this.ships.findIndex((candidate) => candidate.spriteKey === activeKey));
    const viewing = translateText('VIEWING HULL {current} OF {total}', {
      current: this.selectedIndex + 1,
      total: this.ships.length
    });
    const active = translateText('ACTIVE HULL {current} OF {total}', {
      current: activeIndex + 1,
      total: this.ships.length
    });
    this.selectionInfoText.text = [viewing, active, status].join('  |  ');
    this.updateRecommendationBanner();
  }

  updateIntelPanels() {
    const ship = this.ships[this.selectedIndex];
    if (!ship) return;
    const unlocked = isShipUnlocked(ship.spriteKey, this.unlockProgress);
    const role = getShipCombatRole(ship, this.statRanges);
    const tierLabel = getShipTierLabel(ship);
    const roleLine = tierLabel ? `${tierLabel} // ${role}` : role;
    const weapon = this.getWeaponSummary(ship);
    const unlockDetails = getShipUnlockProgressDetails(ship.spriteKey, this.unlockProgress);
    const usageCount = getShipUsage(ship.spriteKey);
    const mastery = getShipMasteryView(this.unlockProgress?.shipSpecificMilestones?.[ship.id], ship);
    const firstFlight = unlocked && usageCount === 0;
    const progressLine = !unlocked && Array.isArray(unlockDetails.requirements) && unlockDetails.requirements.length
      ? unlockDetails.requirements
        .slice(0, 2)
        .map(item => `${Math.min(Number(item.current) || 0, Number(item.target) || 0)}/${item.target}`)
        .join('  ')
      : '';
    const masterySummary = [
      `${translateText('CLEARS')}: ${Math.max(0, Math.round(Number(mastery.clears) || 0))}`,
      ...(mastery.overrunClears > 0
        ? [translateText('OVERRUN ×{count}', { count: mastery.overrunClears })]
        : [])
    ].join('  //  ');
    const unlock = unlocked
      ? [
        firstFlight
          ? `${translateText('FIRST FLIGHT')} // ${translateText('YOUR LAUNCHES')}: 0`
          : translateText('STATUS: READY FOR LAUNCH'),
        masterySummary,
        getShipUnlockHistoryLine(ship.spriteKey, this.unlockProgress, { translate: translateText })
      ].join('\n')
      : `${getShipUnlockRequirementLine(ship.spriteKey, { translate: translateText })}${progressLine ? `\n${translateText('PROGRESS')}: ${progressLine}` : ''}`;
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
        this.leftIntel.rankRail.roundRect(16, 86, 226, 12, 6);
        this.leftIntel.rankRail.fill({ color: 0x031323, alpha: 0.92 });
        this.leftIntel.rankRail.stroke({ color: 0x66ffdd, width: 1.2, alpha: 0.52 });
        this.leftIntel.rankRail.roundRect(18, 88, 222 * fill, 8, 4);
        this.leftIntel.rankRail.fill({ color: 0xffef7e, alpha: 0.94 });
      }
      this.setCareerSignalPulse(Boolean(
        (Number(this.unlockProgress.pilotXp) || 0) > 0 ||
        (this.unlockProgress.lastNewlyUnlockedShipIds || []).length > 0 ||
        (this.unlockProgress.newRanksThisRun || []).length > 0 ||
        (Number(this.unlockProgress.totalCodexDiscoveries) || 0) > 0
      ));
      if (this.leftIntel.stats) {
        this.leftIntel.stats.text = [
          `${translateText('CODEX SCANS')}: ${this.unlockProgress.totalCodexDiscoveries || 0}`,
          `${translateText('BEST SCORE')}: ${Number(this.unlockProgress.bestScore || 0).toLocaleString('en-US')}`,
          ...getHangarProfileFooterLines(this.unlockProgress)
        ].join('\n');
      }
      if (this.leftIntel.hint) {
        this.leftIntel.hint.text = translateText('CLICK FOR CAREER INTEL');
      }
    }

    if (this.rightIntel) {
      this.rightIntel.role.text = roleLine;
      this.rightIntel.weapon.text = weapon;
      this.rightIntel.trait.text = this.getShipTraitText(ship);
      this.rightIntel.unlock.text = unlock;
      this.rightIntel.role.scale.set(1);
      this.rightIntel.weapon.scale.set(1);
      this.rightIntel.trait.scale.set(1);
      fitDisplayToBox(this.rightIntel.role, 268, 54, { minScale: 0.84 });
      this.rightIntel.role.y = 50;
      this.rightIntel.weapon.y = Math.max(96, bottomOf(this.rightIntel.role) + 8);
      fitDisplayToBox(this.rightIntel.weapon, 268, 46, { minScale: 0.84 });
      this.rightIntel.trait.y = Math.max(158, bottomOf(this.rightIntel.weapon) + 18);
      fitDisplayToBox(this.rightIntel.trait, 268, 78, { minScale: 0.76 });
      this.rightIntel.unlock.scale.set(1);
      if (this.rightIntel.statPanel?.parent) {
        this.rightIntel.statPanel.parent.removeChild(this.rightIntel.statPanel);
      }
      const accent = this.getReadableAccent(ship.visuals?.variant);
      const statPanel = createShipStatPanel(ship, {
        compact: true,
        width: 266,
        accent,
        ranges: this.statRanges,
        title: 'LIVE TUNE',
        uiScaleMode: 'none'
      });
      statPanel.position.set(150, Math.max(236, bottomOf(this.rightIntel.trait) + 14));
      this.rightIntel.panel.addChild(statPanel);
      this.rightIntel.statPanel = statPanel;
      this.rightIntel.unlock.y = Math.min(380, bottomOf(statPanel) + 16);
      fitDisplayToBox(this.rightIntel.unlock, 268, 48, { minScale: 0.76 });
    }

    if (this.compactIntel) {
      const compactStatus = unlocked
        ? (firstFlight ? translateText('FIRST FLIGHT') : translateText('READY'))
        : getShipUnlockLabel(ship.spriteKey);
      this.compactIntel.role.text = [roleLine, compactStatus].join(' | ');
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
      glow.roundRect(4, 4, 252, 328, 7);
      glow.stroke({ color: 0xffef7e, width: 2 + pulse * 2, alpha: 0.34 + pulse * 0.38 });
      glow.roundRect(10, 10, 240, 316, 6);
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
    button.hovered = false;
    button._focused = false;

    // Background with glow
    const bgGlow = new PIXI.Graphics();
    bgGlow.rect(-2, -2, width + 4, height + 4);
    bgGlow.fill({ color: 0x00ff00, alpha: 0 });
    button.addChild(bgGlow);
    button.bgGlow = bgGlow;

    const focusRing = new PIXI.Graphics();
    button.addChild(focusRing);
    button.focusRing = focusRing;

    const bg = new PIXI.Graphics();
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
    button.activate = () => onClick?.();
    button.redraw = () => {
      const hovered = Boolean(button.hovered);
      const focused = Boolean(button._focused);
      bg.clear();
      bg.rect(0, 0, width, height);
      bg.fill({ color: label === 'START' && (hovered || focused) ? 0x00ffff : bgColor, alpha: hovered || focused ? 0.92 : 1 });
      bg.stroke({
        color: hovered ? 0xffffff : focused ? 0xffef7e : 0x00ff00,
        width: hovered || focused ? 3 : 2,
        alpha: hovered || focused ? 0.95 : 1
      });

      focusRing.clear();
      if (focused) {
        focusRing.rect(-5, -5, width + 10, height + 10);
        focusRing.stroke({ color: 0xffef7e, width: 2, alpha: 0.8 });
      }

      bgGlow.alpha = focused ? 0.24 : 0;
      if (!hovered) button.scale.set(1);
    };
    button.redraw();

    button.on('pointerdown', (e) => {
      e.stopPropagation();
      // Buttons live outside the carousel, so they should not inherit the
      // carousel's delayed drag flag after a swipe.
      button.scale.set(0.95);
      setTimeout(() => {
        if (button.parent) button.scale.set(1);
      }, 100);
      AudioManager.playSfx('powerup', { force: true, volume: 0.4 });
      button.activate();
    });

    button.on('pointerover', () => {
      button.hovered = true;
      if (button.actionId) this.setControllerFocus(button.actionId);
      button.redraw();
      button.scale.set(1.05);

      // Hover sound
      AudioManager.playSfx('thrusterFire', { volume: 0.1 });
    });

    button.on('pointerout', () => {
      button.hovered = false;
      button.redraw();
      button.scale.set(1);
    });

    return button;
  }

  setupScrolling() {
    // Wheel navigation - scroll one ship at a time
    this.wheelHandler = (e) => {
      e.preventDefault();
      if (this.careerInfoOverlay?.visible) {
        if (e.deltaY > 0) this.flipCareerInfoPilotOrdersPage(1);
        else if (e.deltaY < 0) this.flipCareerInfoPilotOrdersPage(-1);
        return;
      }
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
    const weakness = ship?.tier === 'ascendant' && ship?.weakness
      ? `\nWEAKNESS: ${ship.weakness}`
      : '';
    return `TRAIT: ${trait.label} - ${getTraitHudHint(trait, ship)}${weakness}`;
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
    this.updateSelectionInfo();
  }

  getHangarFooterPrompt(device = this.lastInputDevice) {
    return device === 'controller'
      ? translateText('STICK: SHIP | A: LAUNCH | X: DETAILS | Y: RANDOM | B: BACK')
      : translateText('ARROWS: SHIP | ENTER: LAUNCH | X: DETAILS | R: RANDOM | ESC: BACK');
  }

  setHangarInputDevice(device, reason = 'input') {
    const normalized = device === 'controller' ? 'controller' : 'keyboard';
    if (this.lastInputDevice === normalized) return false;
    this.lastInputDevice = normalized;
    this.inputPromptSwitchCount += 1;
    this.inputPromptLastChangedAt = Date.now();
    if (this.footerInstructions) {
      this.footerInstructions.text = this.getHangarFooterPrompt(normalized);
    }
    this.lastInputPromptChange = {
      device: normalized,
      reason,
      at: this.inputPromptLastChangedAt
    };
    return true;
  }

  getHangarInputPromptDebugState() {
    return {
      device: this.lastInputDevice,
      text: this.footerInstructions?.text || this.getHangarFooterPrompt(),
      switchCount: this.inputPromptSwitchCount,
      lastChangedAt: this.inputPromptLastChangedAt,
      lastChange: this.lastInputPromptChange ? { ...this.lastInputPromptChange } : null
    };
  }

  setupInput() {
    console.log('[ShipSelectInput] attached');
    const canvas = this.game.app.canvas || this.game.app.view;
    this.hangarPointerDeviceHandler = () => this.setHangarInputDevice('keyboard', 'pointerdown');
    canvas?.addEventListener?.('pointerdown', this.hangarPointerDeviceHandler, true);
    this.keyHandler = (e) => {
      this.setHangarInputDevice('keyboard', 'keydown');
      // Log first key press for debug
      if (DEBUG) console.log(`[ShipSelectInput] key=${e.key} code=${e.code}`);

      const presentationVisible = Boolean(this.hangarUnlockPresentation?.visible);
      const handledKey = presentationVisible ||
        this.hangarMenuOverlay?.visible ||
        this.careerInfoOverlay?.visible ||
        e.key === 'Tab' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'PageUp' ||
        e.key === 'PageDown' ||
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.code === 'KeyA' ||
        e.code === 'KeyD' ||
        e.code === 'KeyQ' ||
        e.code === 'KeyE' ||
        e.code === 'KeyI' ||
        e.code === 'KeyR' ||
        e.code === 'KeyJ' ||
        e.code === 'KeyX' ||
        e.code === 'Space' ||
        e.code === 'Enter' ||
        e.code === 'NumpadEnter';
      if (handledKey) e.stopImmediatePropagation();

      if (presentationVisible) {
        e.preventDefault();
        if (
          e.key === 'Escape' ||
          e.code === 'Escape' ||
          e.key === 'Enter' ||
          e.code === 'Enter' ||
          e.code === 'NumpadEnter' ||
          e.code === 'Space'
        ) {
          this.dismissHangarUnlockPresentation('keyboard');
        }
        return;
      }

      if (this.launchModeOverlay) {
        e.stopImmediatePropagation();
        this.launchModeOverlay.handleKey(e);
        return;
      }

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
      } else if (e.code === 'KeyJ' && this.recommendationBanner?.visible) {
        e.preventDefault();
        this.jumpToRecommendedShip('keyboard');
      } else if (e.code === 'KeyI') {
        e.preventDefault();
        this.openCareerInfoOverlay('keyboard');
      } else if (e.code === 'KeyX') {
        e.preventDefault();
        this.setMainMenuButtonFocus(false);
        this.openSelectedShipDetails();
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
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      this.flipCareerInfoPilotOrdersPage(-1);
      return true;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      this.flipCareerInfoPilotOrdersPage(1);
      return true;
    }
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
    this.setHangarInputDevice('controller', 'gamepad');

    if (this.launchModeOverlay) {
      this.launchModeOverlay.handleGamepad(nav);
      return;
    }

    if (this.hangarUnlockPresentation?.visible) {
      if (nav.pressed.confirm || nav.pressed.cancel || nav.pressed.menu || nav.pressed.back) {
        this.dismissHangarUnlockPresentation('controller');
      }
      return;
    }

    if (this.careerInfoOverlay?.visible) {
      if (nav.pressed.left || nav.pressed.up) {
        this.flipCareerInfoPilotOrdersPage(-1);
        return;
      }
      if (nav.pressed.right || nav.pressed.down) {
        this.flipCareerInfoPilotOrdersPage(1);
        return;
      }
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
    const focus = this.getControllerFocus();
    if (nav.pressed.down) {
      if (focus === 'ship') this.focusActionRow();
      else if (HANGAR_ACTION_FOCUS_ORDER.includes(focus)) this.setControllerFocus('back');
      else this.setControllerFocus('ship');
    }
    if (nav.pressed.up) {
      if (focus === 'ship') this.setControllerFocus('back');
      else if (focus === 'back') this.focusActionRow();
      else this.setControllerFocus('ship');
    }
    if (nav.pressed.left) {
      if (HANGAR_ACTION_FOCUS_ORDER.includes(focus)) {
        this.setActionFocusByOffset(-1);
      } else if (focus === 'back') {
        this.focusActionRow();
      } else {
        this.setControllerFocus('ship');
        this.navigateLeft();
      }
    }
    if (nav.pressed.right) {
      if (HANGAR_ACTION_FOCUS_ORDER.includes(focus)) {
        this.setActionFocusByOffset(1);
      } else if (focus === 'back') {
        this.focusActionRow();
      } else {
        this.setControllerFocus('ship');
        this.navigateRight();
      }
    }
    if (nav.pressed.lb) {
      this.setControllerFocus('ship');
      this.navigateModel(-1);
    }
    if (nav.pressed.rb) {
      this.setControllerFocus('ship');
      this.navigateModel(1);
    }
    if (nav.pressed.y) {
      this.setControllerFocus('ship');
      this.navigateRandom();
    }
    if (nav.pressed.x) {
      this.setControllerFocus('ship');
      this.openSelectedShipDetails();
    }
    if (nav.pressed.confirm) {
      this.activateControllerFocus('controller');
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
    if (this.launchInProgress || this.launchModeOverlay) return;
    const ship = this.ships[this.selectedIndex];
    if (!ship?.spriteKey) return;

    if (!isShipUnlocked(ship.spriteKey, this.unlockProgress)) {
      AudioManager.playSfx('ship_lock_chime', { force: true, volume: 0.7 });
      this.updateSelectionInfo();
      return;
    }

    const spriteKey = ship.spriteKey;
    AudioManager.playSfx('ship_lock_chime', { force: true, volume: 0.8 });

    if (DEBUG) console.log(`[ShipSelect] Opening launch mode choice via ${source}:`, spriteKey);
    this.openLaunchModeOverlay(ship);
  }

  openLaunchModeOverlay(ship = this.ships[this.selectedIndex]) {
    if (!ship?.spriteKey || this.launchModeOverlay) return;
    this.launchModeOverlay = new HangarLaunchModeOverlay({
      parent: this.container,
      width: this.game.getWidth(),
      height: this.game.getHeight(),
      shipName: ship.name,
      onLaunch: (option) => this.startSelectedShipInMode(option),
      onCancel: () => this.closeLaunchModeOverlay()
    });
    this.gamepadNavigator.suppressUntilReleased();
  }

  closeLaunchModeOverlay() {
    this.launchModeOverlay?.destroy();
    this.launchModeOverlay = null;
    this.gamepadNavigator.suppressUntilReleased();
  }

  startSelectedShipInMode(option = { id: RUN_MODES.MAYHEM_TACTICAL }) {
    if (this.launchInProgress) return;
    const ship = this.ships[this.selectedIndex];
    if (!ship?.spriteKey || !isShipUnlocked(ship.spriteKey, this.unlockProgress)) return;
    const runMode = option.id || RUN_MODES.MAYHEM_TACTICAL;
    this.launchInProgress = true;
    const spriteKey = option.launchShipKey || ship.spriteKey;
    this.activeShipSpriteKey = spriteKey;
    setSelectedShipKey(spriteKey);
    this.saveSelection(ship.spriteKey);
    const launchOptions = {
      runMode,
      dailySignalContract: option.dailySignalContract || undefined,
      scoutAnomalyId: option.scoutAnomalyId || undefined,
      startSector: option.startSector || undefined
    };
    this.closeLaunchModeOverlay();
    if (DEBUG) console.log(`[ShipSelect] Starting game in ${runMode}:`, spriteKey);
    Promise.resolve(this.game.startGame(spriteKey, launchOptions)).catch((error) => {
      this.launchInProgress = false;
      console.error('[ShipSelect] Failed to start selected ship:', error);
    });
  }

  openSelectedShipDetails() {
    const ship = this.ships[this.selectedIndex];
    if (!ship?.spriteKey) return;
    const spriteKey = ship.spriteKey;
    if (DEBUG) console.log('[ShipSelect] Opening details for:', spriteKey);
    this.game.showShipDetails(spriteKey);
  }

  saveSelection(spriteKey, { syncCloud = true } = {}) {
    try {
      localStorage.setItem(STORAGE_KEY, spriteKey);
      if (syncCloud && typeof window !== 'undefined') window.__novaSteamCloudDiagnostics?.sync?.();
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
    this.closeLaunchModeOverlay();
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler, true);
    }
    if (this.hangarPointerDeviceHandler) {
      const canvas = this.game.app.canvas || this.game.app.view;
      canvas?.removeEventListener?.('pointerdown', this.hangarPointerDeviceHandler, true);
      this.hangarPointerDeviceHandler = null;
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
    if (this.hangarUnlockPresentationTicker) {
      this.game.app.ticker.remove(this.hangarUnlockPresentationTicker);
      this.hangarUnlockPresentationTicker = null;
    }
    if (this.hangarUnlockPresentationTimer) {
      clearTimeout(this.hangarUnlockPresentationTimer);
      this.hangarUnlockPresentationTimer = null;
    }
    if (this.exitNoticeTimeout) {
      clearTimeout(this.exitNoticeTimeout);
      this.exitNoticeTimeout = null;
    }
    destroyMenuFx(this);
  }

  destroy() {
    this.cleanup();
  }

  init() {
    // Called when scene is shown
  }

  update(delta = 1) {
    updateMenuFx(this, delta);
  }

  getContainer() {
    return this.container;
  }
}
