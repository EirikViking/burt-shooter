import * as PIXI from 'pixi.js';
import { AssetManifest } from '../assets/assetManifest.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { translateText } from '../i18n/index.js';
import { GameAssets } from '../utils/GameAssets.js';
import { createText } from '../utils/pixiText.js';
import { destroyMenuFx, installMenuFx, playMenuConfirmSfx, playMenuFocusSfx, updateMenuFx } from './MenuFxLayer.js';

const FONT_BODY = 'Rajdhani, Orbitron, Bahnschrift, Segoe UI, sans-serif';
const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';

const HELP_ROWS = Object.freeze([
  {
    code: '01',
    icon: 'NAV',
    label: 'MOVE',
    control: 'WASD / ARROWS / LEFT STICK',
    tip: 'Stay mobile. Controlled movement keeps you alive longer than drifting into open space.',
    accent: 0x37f5ff
  },
  {
    code: '02',
    icon: 'FOCUS',
    label: 'FOCUS DRIFT',
    control: 'HOLD CTRL / LT',
    tip: 'Hold Focus to slow your ship for tight weaving without changing your weapon.',
    accent: 0xffef7e
  },
  {
    code: '03',
    icon: 'FIRE',
    label: 'SHOOT',
    control: 'SPACE / LEFT MOUSE / GAMEPAD A',
    tip: 'Hold fire and choose targets. Clearing the right enemies keeps the run under control.',
    accent: 0xffef7e
  },
  {
    code: '04',
    icon: 'PHASE',
    label: 'DODGE / PHASE',
    control: 'LEFT/RIGHT SHIFT / GAMEPAD B',
    tip: 'Tap Phase Burst to pass safely through bullets or contact for a heartbeat. It protects you; it is not a movement dash.',
    accent: 0xff55d9
  },
  {
    code: '05',
    icon: 'CHAIN',
    label: 'CHAINED DODGE',
    control: 'GRAZE AGAIN BEFORE THE TIMER ENDS',
    tip: 'Several close grazes in a row count as a chained danger-dodge streak. These streaks drive the Danger Dodge achievements.',
    accent: 0xff8f5a
  },
  {
    code: '06',
    icon: 'SKIM',
    label: 'GRAZE',
    control: 'PASS CLOSE TO ENEMY SHOTS',
    tip: 'Skim enemy bullets without getting hit to earn NEAR MISS score popups and build your graze streak.',
    accent: 0x66ff9d
  },
  {
    code: '07',
    icon: 'BREAK',
    label: 'GRAZE BREAK',
    control: '3 GRAZES ARM YOUR NEXT SHOT',
    tip: 'After three quick grazes, fire the charged magenta shot into enemy fire to clear bullets, damage nearby threats, and score.',
    accent: 0xff66ff
  },
  {
    code: '08',
    icon: 'COMBO',
    label: 'COMBOS',
    control: 'FAST KILLS KEEP THE CHAIN',
    tip: 'Destroy enemies quickly to keep the chain alive. Tough targets can slow the rhythm, so target choice matters.',
    accent: 0xff8f5a
  },
  {
    code: '09',
    icon: 'BEAM',
    label: 'TRACTOR SHIPS',
    control: 'BREAK ACTIVE BEAMS',
    tip: 'Destroy tractor ships during their beam to break the pull, clear nearby shots, and earn bonus score from nearby enemies.',
    accent: 0x7ee9ff
  },
  {
    code: '10',
    icon: 'LOOT',
    label: 'PICKUPS & BONUS',
    control: 'BRIGHT ICONS ARE SAFE',
    tip: 'Collect bright pickup icons. Shoot bonus drones for extra score and watch for the BONUS popup.',
    accent: 0xb285ff
  },
  {
    code: '11',
    icon: 'MODE',
    label: 'RUN MODES',
    control: 'MAYHEM / SCOUT / SECTOR RUN',
    tip: 'Mayhem is the ranked climb. Scout is practice. Sector Run lets you practice unlocked later starts.',
    accent: 0xff8f5a
  },
  {
    code: '12',
    icon: 'ORDER',
    label: 'PILOT ORDERS',
    control: 'OPTIONAL MAYHEM DRILLS',
    tip: 'Use main-menu Pilot Orders as optional combat drills. Review cleared orders in Ship Hangar Career Intel.',
    accent: 0x7fffd8
  }
]);

const RUN_HELP_ROWS = Object.freeze([
  HELP_ROWS[9],
  HELP_ROWS[10],
  {
    code: '12',
    icon: 'DRAFT',
    label: 'TACTICAL DRAFT',
    control: 'AFTER EACH BOSS: CHOOSE 1 OF 3',
    tip: 'Choose one augment after each boss. Active augments stay visible in the HUD; open Tactical upgrades from pause to inspect every stack.',
    accent: 0xffef7e
  },
  {
    code: '13',
    icon: 'SCAN',
    label: 'DRAFT RESCAN',
    control: 'R / GAMEPAD Y: ONE RESCAN PER RUN',
    tip: 'Spend your one rescan when all three offers miss your build. It replaces the offers, never grants an extra augment.',
    accent: 0x37f5ff
  },
  {
    code: '14',
    icon: 'HOLD',
    label: 'DRAFT HOLD',
    control: 'L / GAMEPAD X: HOLD ONE OFFER FOR NEXT DRAFT',
    tip: 'Hold one promising offer for the next boss Draft. Holding a new card replaces the old hold; choosing the held card consumes it.',
    accent: 0xffd15c
  },
  {
    code: '15',
    icon: 'SLOT',
    label: 'POWERUP OVERLAP',
    control: 'SAME NAME: TIMED PICKUP TAKES PRIORITY',
    tip: 'You have one ordinary timed pickup slot. The same pickup refreshes; a different pickup replaces it. A matching Draft effect returns when the timed pickup ends.',
    accent: 0xb285ff
  },
  {
    code: '16',
    icon: 'CAP',
    label: 'STACK LIMITS',
    control: 'FIRST STACK FULL / SECOND STACK 55%',
    tip: 'Most augments cap at two stacks. Direct Draft weapon output is capped at +45%, so choices add power without removing the challenge.',
    accent: 0xff8f5a
  },
  {
    code: '17',
    icon: 'SYNC',
    label: 'THREAT RESPONSE',
    control: 'HULL POWER + DRAFT PICKS SET PRESSURE',
    tip: 'Strong hulls still clear faster. Threat Response adds some hardened targets and attack pressure, but preserves a meaningful power advantage from every late-game hull.',
    accent: 0x66ff9d
  }
]);

const HELP_PAGES = Object.freeze([
  Object.freeze({ id: 'flight', label: 'FLIGHT', rows: Object.freeze(HELP_ROWS.slice(0, 4)) }),
  Object.freeze({ id: 'combat', label: 'COMBAT', rows: Object.freeze(HELP_ROWS.slice(4, 9)) }),
  Object.freeze({ id: 'runs', label: 'RUNS', rows: RUN_HELP_ROWS })
]);

const HELP_DETAIL_COPY = Object.freeze({
  MOVE: 'Small corrections beat heroic sightseeing. Enter a lane, solve one threat, then leave before the lane develops opinions. Wide circles look elegant right up until every bullet agrees on your address.',
  'FOCUS DRIFT': 'Focus does not slow time and it does not improve your tax status. It reduces ship movement so tiny gaps become flyable. Hold it for the difficult weave, release it before your escape route becomes a historical document.',
  SHOOT: 'The trigger is unlimited; safe attention is not. Sweep fragile lane-blockers first, then burn the expensive target. Firing at everything equally is democracy, not tactics, and the swarm has already counted the votes.',
  'DODGE / PHASE': 'Phase Burst is a brief permission slip to occupy the same space as danger. It does not move the ship for you. Tap it late, cross the threat, and be somewhere useful when reality notices the paperwork.',
  'CHAINED DODGE': 'A chain is several near misses before the graze timer expires. The cabinet is impressed by controlled nerve, not random panic. Stay close enough to be brave and far enough to remain employed.',
  GRAZE: 'A graze happens just outside the hitbox. The bright ring tells you where courage ends and spare parts begin. Graze when the lane is readable; do not rub the ship against every bullet like an unlucky lottery ticket.',
  'GRAZE BREAK': 'Three quick grazes arm one magenta shot. Fire it into enemy bullets or a crowded threat pocket. The shot clears space, hurts nearby enemies, and proves that reckless proximity can occasionally produce an invoice in your favor.',
  COMBOS: 'Every fast kill refreshes the combo clock. Fragile enemies are rhythm fuel; armored enemies are rhythm potholes. Change targets when a tough hull would otherwise make your multiplier quietly pack a suitcase.',
  'TRACTOR SHIPS': 'A live beam is the opportunity. Break the tractor while it is pulling to clear nearby shots and punish the formation around it. Destroying it too early is safe; destroying it during the beam is safe with applause.',
  'PICKUPS & BONUS': 'Bright capsules help. Orange hazard hardware does not. Rare prizes may drift, dodge, or expire because the universe has confused loot with a job interview. Cut off the route instead of chasing the icon from behind.',
  'RUN MODES': "Mayhem owns the ranked receipt. Scout lets you learn without signing it. Sector Run begins later using unlocked checkpoints. Pick the mode that answers today's question; the leaderboard cannot teach a pattern you never stopped to read.",
  'PILOT ORDERS': 'Orders are optional drills, not commandments from a clipboard deity. Use them to practice one behavior inside a real run. If an order makes survival worse, survive first and let the bureaucracy experience personal growth.',
  'TACTICAL DRAFT': 'Every boss leaves behind three run-only hardware proposals. Pick the effect that changes your next decisions, not merely the largest number. The best build has a plan; the worst build has seventeen unrelated souvenirs.',
  'DRAFT RESCAN': 'One rescan replaces all three offers and cannot be refunded, photocopied, or argued with. Spend it when the entire page misses your build. Mild disappointment is not an emergency; three dead choices are.',
  'DRAFT HOLD': 'Hold is a promise to your future build. Mark one card, choose something else, and the marked hardware returns after the next boss. Holding a different card replaces the promise; taking the held card closes the contract.',
  'POWERUP OVERLAP': 'The ordinary timed slot holds one effect. A matching pickup refreshes it; a different pickup replaces it. Permanent Draft hardware waits underneath and resumes when the temporary celebrity leaves the stage.',
  'STACK LIMITS': 'Most repeatable augments stop at two stacks, and the second contributes only fifty-five percent. This keeps a favorite lane useful without turning one lucky draft into a legally distinct supernova.',
  'THREAT RESPONSE': 'Threat Response notices stronger hulls and larger builds, then adds measured pressure. It is not allowed to erase progression. Better ships still clear faster; the swarm simply arrives with a clipboard and slightly better shoes.'
});

function getHelpDetail(row) {
  return HELP_DETAIL_COPY[row?.label] || row?.tip || '';
}

function rectsOverlap(a, b, pad = 0) {
  if (!a || !b) return false;
  return !(
    a.x + a.width + pad <= b.x
    || b.x + b.width + pad <= a.x
    || a.y + a.height + pad <= b.y
    || b.y + b.height + pad <= a.y
  );
}

function fitTextToBox(text, maxWidth, maxHeight = Infinity, { minScale = 0.62 } = {}) {
  if (!text || !Number.isFinite(maxWidth) || maxWidth <= 0) return 1;
  text.scale.set(1);
  text.updateText?.(false);
  const measuredWidth = Math.max(1, text.width || 1);
  const measuredHeight = Math.max(1, text.height || 1);
  const widthScale = maxWidth / measuredWidth;
  const heightScale = Number.isFinite(maxHeight) && maxHeight > 0 ? maxHeight / measuredHeight : 1;
  const scale = Math.min(1, Math.max(minScale, Math.min(widthScale, heightScale)));
  text.scale.set(scale);
  return scale;
}

function addGlowLine(container, x1, y1, x2, y2, color, alpha = 0.45) {
  const glow = new PIXI.Graphics();
  glow.moveTo(x1, y1);
  glow.lineTo(x2, y2);
  glow.stroke({ color, width: 3, alpha: alpha * 0.28 });
  glow.moveTo(x1, y1);
  glow.lineTo(x2, y2);
  glow.stroke({ color, width: 1, alpha });
  container.addChild(glow);
  return glow;
}

function drawCornerBrackets(container, x, y, width, height, color) {
  const g = new PIXI.Graphics();
  const l = Math.min(32, Math.max(18, width * 0.035));
  const points = [
    [x, y + l, x, y, x + l, y],
    [x + width - l, y, x + width, y, x + width, y + l],
    [x + width, y + height - l, x + width, y + height, x + width - l, y + height],
    [x + l, y + height, x, y + height, x, y + height - l]
  ];
  for (const [x1, y1, x2, y2, x3, y3] of points) {
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
  }
  g.stroke({ color, width: 3, alpha: 0.92 });
  container.addChild(g);
  return g;
}

export class HowToPlayOverlay {
  constructor(game, { onClose = null } = {}) {
    this.game = game;
    this.onClose = onClose;
    this.container = new PIXI.Container();
    this.container.zIndex = 2100000;
    this.container.label = 'ui_howToPlayOverlay';
    this.container.sortableChildren = true;
    this.menuFx = null;
    this.closeButton = null;
    this.pageIndex = 0;
    this.pageButtons = [];
    this.cards = [];
    this.focusedCardIndex = 0;
    this.detailRow = null;
    this.detailContainer = null;
    this.keyHandler = null;
    this.debugLayout = null;
    this.heroMotionNodes = [];
    this.heroTextureSprites = [];
    this.reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    this.gamepadNavigator = new GamepadNavigator();
    this.gamepadNavigator.suppressUntilReleased();
    this.build();
    this.setupKeyboardNavigation();
  }

  build() {
    this.cards = [];
    this.heroMotionNodes = [];
    this.heroTextureSprites = [];
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const helpPage = HELP_PAGES[this.pageIndex] || HELP_PAGES[0];
    const helpRows = helpPage.rows;
    const compact = width < 900 || height < 700;
    const veryShort = height < 560;
    const shortDesktop = !compact && height < 780;
    const spacious = width >= 1800 && height >= 980;
    const panelWidth = Math.min(spacious ? 1320 : 1160, width * (compact ? 0.96 : 0.9));
    const panelHeight = Math.min(spacious ? 860 : 820, height * (compact ? 0.96 : 0.92));
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const pad = veryShort ? 18 : compact ? 24 : shortDesktop ? 28 : 34;
    const headerHeight = veryShort ? 98 : compact ? 124 : shortDesktop ? 132 : 166;
    const footerHeight = veryShort ? 62 : compact ? 76 : shortDesktop ? 76 : 86;
    const gridGap = veryShort ? 8 : compact ? 10 : shortDesktop ? 10 : 14;
    const columns = width >= 700 ? 2 : 1;
    const visualRows = columns === 1 ? helpRows.length : Math.ceil(helpRows.length / columns);
    const gridX = panelX + pad;
    const gridY = panelY + headerHeight;
    const gridWidth = panelWidth - pad * 2;
    const gridHeight = panelHeight - headerHeight - footerHeight - pad * 0.35;
    const cardWidth = columns === 1
      ? gridWidth
      : (gridWidth - gridGap) / 2;
    const minCardHeight = veryShort ? 42 : compact ? 54 : shortDesktop || visualRows >= 6 ? 76 : 92;
    const cardHeight = Math.max(
      minCardHeight,
      Math.floor((gridHeight - gridGap * (visualRows - 1)) / visualRows)
    );
    const titleSize = veryShort ? 24 : spacious ? 48 : compact ? 31 : 42;
    const subtitleSize = veryShort ? 11 : spacious ? 16 : compact ? 12 : 14;
    const labelSize = veryShort ? 11 : spacious ? 16 : compact ? 13 : shortDesktop ? 12 : 15;
    const controlSize = veryShort ? 11 : spacious ? 17 : compact ? 13 : shortDesktop ? 12 : 15;
    const tipSize = veryShort ? 11 : spacious ? 16 : compact ? 12 : shortDesktop ? 11 : 15;
    const cardLayouts = [];

    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, width, height);

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x010611, alpha: 0.88 });
    dim.eventMode = 'static';
    this.container.addChild(dim);
    installMenuFx(this, {
      label: 'ui_menuFxHowToPlay',
      zIndex: 0,
      accent: 0x37f5ff,
      secondary: 0xff55d9,
      gold: 0xffef7e,
      intensity: 0.72,
      density: 0.8,
      alpha: 0.46,
      openVolume: 0.2
    });

    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x050d1a, alpha: 0.98 });
    panel.stroke({ color: 0x37f5ff, width: 2, alpha: 0.95 });
    panel.roundRect(panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20, 6);
    panel.stroke({ color: 0xff55d9, width: 1, alpha: 0.28 });
    panel.roundRect(panelX + pad * 0.62, panelY + pad * 0.62, panelWidth - pad * 1.24, panelHeight - pad * 1.24, 6);
    panel.stroke({ color: 0x2affd8, width: 1, alpha: 0.12 });
    this.container.addChild(panel);
    drawCornerBrackets(this.container, panelX + 6, panelY + 6, panelWidth - 12, panelHeight - 12, 0x37f5ff);

    const trainingBand = new PIXI.Graphics();
    trainingBand.roundRect(panelX + pad, panelY + pad + (veryShort ? 18 : 24), panelWidth - pad * 2, headerHeight - pad * 0.78, 8);
    trainingBand.fill({ color: 0x02111f, alpha: 0.82 });
    trainingBand.stroke({ color: 0x37f5ff, width: 1, alpha: 0.28 });
    trainingBand.rect(panelX + pad + 10, panelY + headerHeight - (veryShort ? 12 : 20), panelWidth - pad * 2 - 20, 2);
    trainingBand.fill({ color: 0xff55d9, alpha: 0.35 });
    this.container.addChild(trainingBand);

    for (let i = 1; i <= 5; i += 1) {
      const y = panelY + headerHeight + i * (gridHeight / 6);
      addGlowLine(this.container, panelX + pad, y, panelX + panelWidth - pad, y, 0x174f70, 0.18);
    }

    const sideRail = new PIXI.Graphics();
    sideRail.roundRect(panelX + pad, panelY + pad, compact ? 6 : 8, headerHeight - pad * 0.8, 4);
    sideRail.fill({ color: 0x37f5ff, alpha: 0.68 });
    sideRail.roundRect(panelX + panelWidth - pad - (compact ? 6 : 8), panelY + pad, compact ? 6 : 8, headerHeight - pad * 0.8, 4);
    sideRail.fill({ color: 0xff55d9, alpha: 0.54 });
    this.container.addChild(sideRail);

    if (!veryShort) {
      const scopeRadius = compact ? 38 : spacious ? 66 : 56;
      this.addTrainingHeroPod({
        x: panelX + pad + scopeRadius + (compact ? 18 : 32),
        y: panelY + headerHeight * 0.5 + 6,
        radius: scopeRadius,
        compact,
        side: -1,
        palette: { primary: 0x37f5ff, secondary: 0xff55d9, danger: 0xff8f5a }
      });
      this.addTrainingHeroPod({
        x: panelX + panelWidth - pad - scopeRadius - (compact ? 18 : 32),
        y: panelY + headerHeight * 0.5 + 6,
        radius: scopeRadius,
        compact,
        side: 1,
        palette: { primary: 0xff55d9, secondary: 0xffef7e, danger: 0x66ff9d }
      });
    }

    const title = createText(translateText('HOW TO PLAY'), {
      fontFamily: FONT_DISPLAY,
      fontSize: titleSize,
      fontWeight: '900',
      fill: '#f6fbff',
      stroke: '#003344',
      strokeThickness: 5,
      align: 'center'
    });
    title.anchor.set(0.5);
    title.position.set(width / 2, panelY + (veryShort ? 34 : compact ? 44 : 54));
    fitTextToBox(title, panelWidth - pad * 3, 54, { minScale: 0.58 });
    this.container.addChild(title);

    const subtitle = createText(translateText('FIGHT SMART. SCORE HIGH. SURVIVE LONGER.'), {
      fontFamily: FONT_BODY,
      fontSize: subtitleSize,
      fontWeight: '800',
      fill: '#9bf8ff',
      stroke: '#00111d',
      strokeThickness: 2,
      letterSpacing: 0,
      align: 'center'
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(width / 2, panelY + (veryShort ? 61 : compact ? 72 : 84));
    fitTextToBox(subtitle, panelWidth - pad * 4, 22, { minScale: 0.62 });
    this.container.addChild(subtitle);

    helpRows.forEach((row, index) => {
      const isWideFinalCard = false;
      const column = columns === 1 ? 0 : index % columns;
      const rowIndex = columns === 1 ? index : Math.floor(index / columns);
      const cardX = gridX + column * (cardWidth + gridGap);
      const cardY = gridY + rowIndex * (cardHeight + gridGap);
      const actualCardWidth = isWideFinalCard ? gridWidth : cardWidth;
      this.addHelpCard(row, {
        x: cardX,
        y: cardY,
        width: actualCardWidth,
        height: cardHeight,
        compact,
        veryShort,
        shortDesktop,
        labelSize,
        controlSize,
        tipSize
      });
      cardLayouts.push({
        code: row.code,
        label: row.label,
        x: Math.round(cardX),
        y: Math.round(cardY),
        width: Math.round(actualCardWidth),
        height: Math.round(cardHeight)
      });
    });

    this.pageButtons = HELP_PAGES.map((page, index) => {
      const tabWidth = Math.min(compact ? 92 : 126, (panelWidth - pad * 3) / HELP_PAGES.length);
      const gap = compact ? 8 : 12;
      const totalWidth = tabWidth * HELP_PAGES.length + gap * (HELP_PAGES.length - 1);
      const x = width / 2 - totalWidth / 2 + tabWidth / 2 + index * (tabWidth + gap);
      const y = panelY + headerHeight - (veryShort ? 13 : compact ? 17 : 20);
      const tab = this.createPageTab(page.label, x, y, index === this.pageIndex, () => this.setPage(index), {
        width: tabWidth,
        height: veryShort ? 22 : compact ? 26 : 30,
        fontSize: veryShort ? 10 : compact ? 11 : 13
      });
      this.container.addChild(tab);
      return tab;
    });

    const footerY = panelY + panelHeight - footerHeight;
    const footerRail = new PIXI.Graphics();
    footerRail.roundRect(panelX + pad, footerY + 8, panelWidth - pad * 2, footerHeight - 16, 7);
    footerRail.fill({ color: 0x03121d, alpha: 0.72 });
    footerRail.stroke({ color: 0x37f5ff, width: 1, alpha: 0.28 });
    this.container.addChild(footerRail);

    const footer = createText(translateText('ESC / B: BACK'), {
      fontFamily: FONT_BODY,
      fontSize: veryShort ? 11 : spacious ? 16 : compact ? 12 : 14,
      fontWeight: '900',
      fill: '#9ed9e8',
      stroke: '#00111d',
      strokeThickness: 2,
      align: compact ? 'center' : 'left'
    });
    footer.anchor.set(compact ? 0.5 : 0, 0.5);
    footer.position.set(
      compact ? width / 2 : panelX + pad + 20,
      footerY + (compact ? 22 : footerHeight / 2)
    );
    fitTextToBox(footer, compact ? panelWidth - pad * 4 : panelWidth * 0.44, 24, { minScale: 0.62 });
    this.container.addChild(footer);

    const buttonWidth = Math.min(compact ? 230 : 260, panelWidth - pad * 2.5);
    const buttonHeight = veryShort ? 30 : compact ? 34 : 40;
    const buttonX = compact ? width / 2 : panelX + panelWidth - pad - buttonWidth / 2 - 8;
    const buttonY = compact ? footerY + footerHeight - 24 : footerY + footerHeight / 2;
    this.closeButton = this.createButton(translateText('BACK'), buttonX, buttonY, () => this.close(), {
      width: buttonWidth,
      height: buttonHeight,
      fontSize: veryShort ? 13 : compact ? 16 : 18
    });
    this.container.addChild(this.closeButton);

    const footerBounds = {
      x: Math.round(panelX + pad),
      y: Math.round(footerY + 8),
      width: Math.round(panelWidth - pad * 2),
      height: Math.round(footerHeight - 16)
    };
    const buttonBounds = {
      x: Math.round(buttonX - buttonWidth / 2 - 5),
      y: Math.round(buttonY - buttonHeight / 2 - 5),
      width: Math.round(buttonWidth + 10),
      height: Math.round(buttonHeight + 10)
    };
    const layoutWarnings = [];
    for (const card of cardLayouts) {
      if (rectsOverlap(card, footerBounds, 4)) {
        layoutWarnings.push(`card ${card.code} overlaps footer`);
      }
      if (rectsOverlap(card, buttonBounds, 4)) {
        layoutWarnings.push(`card ${card.code} overlaps back button`);
      }
    }
    for (let i = 0; i < cardLayouts.length; i += 1) {
      for (let j = i + 1; j < cardLayouts.length; j += 1) {
        if (rectsOverlap(cardLayouts[i], cardLayouts[j], 2)) {
          layoutWarnings.push(`card ${cardLayouts[i].code} overlaps card ${cardLayouts[j].code}`);
        }
      }
    }
    this.debugLayout = {
      compact,
      veryShort,
      shortDesktop,
      columns,
      panel: {
        x: Math.round(panelX),
        y: Math.round(panelY),
        width: Math.round(panelWidth),
        height: Math.round(panelHeight)
      },
      cards: cardLayouts,
      footer: footerBounds,
      button: buttonBounds,
      layoutWarnings
    };
  }

  addTrainingHeroPod({ x, y, radius, compact, side, palette }) {
    const pod = new PIXI.Container();
    pod.label = side < 0 ? 'ui_howToPlayHeroPod_left' : 'ui_howToPlayHeroPod_right';
    pod.position.set(x, y);
    pod.eventMode = 'none';
    pod.interactiveChildren = false;
    this.container.addChild(pod);

    const primary = palette.primary;
    const secondary = palette.secondary;
    const danger = palette.danger;
    const backGlow = new PIXI.Graphics();
    backGlow.circle(0, 0, radius * 1.18);
    backGlow.fill({ color: primary, alpha: 0.12 });
    backGlow.circle(0, 0, radius * 0.8);
    backGlow.fill({ color: 0x020a18, alpha: 0.84 });
    backGlow.circle(0, 0, radius * 1.08);
    backGlow.stroke({ color: primary, width: compact ? 1.4 : 2, alpha: 0.72 });
    backGlow.circle(0, 0, radius * 0.7);
    backGlow.stroke({ color: secondary, width: 1.2, alpha: 0.38 });
    backGlow.circle(0, 0, radius * 0.42);
    backGlow.stroke({ color: 0xffffff, width: 1, alpha: 0.14 });
    pod.addChild(backGlow);

    const scan = new PIXI.Graphics();
    scan.moveTo(0, 0);
    scan.arc(0, 0, radius * 1.05, -0.2, 0.35);
    scan.lineTo(0, 0);
    scan.closePath();
    scan.fill({ color: primary, alpha: 0.16 });
    scan.moveTo(0, 0);
    scan.lineTo(radius * 1.05, 0);
    scan.stroke({ color: primary, width: 2, alpha: 0.42 });
    pod.addChild(scan);
    this.heroMotionNodes.push({ target: scan, kind: 'rotate', speed: 0.018 * side, pulse: 0.05, baseAlpha: 0.78 });

    const cross = new PIXI.Graphics();
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2;
      const inner = radius * 0.5;
      const outer = radius * 1.08;
      cross.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      cross.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    cross.stroke({ color: 0x7ee9ff, width: 1, alpha: 0.25 });
    pod.addChild(cross);

    const trail = new PIXI.Graphics();
    trail.arc(0, 0, radius * 0.92, side < 0 ? -1.15 : 2.0, side < 0 ? 0.55 : 3.55);
    trail.stroke({ color: danger, width: compact ? 3.4 : 4.4, alpha: 0.74 });
    trail.arc(0, 0, radius * 0.76, side < 0 ? -0.55 : 2.55, side < 0 ? 1.0 : 4.0);
    trail.stroke({ color: secondary, width: compact ? 1.8 : 2.4, alpha: 0.62 });
    pod.addChild(trail);
    this.heroMotionNodes.push({ target: trail, kind: 'pulse', baseAlpha: 0.8, amp: 0.18, speed: 0.035, phase: side > 0 ? 1.4 : 0 });

    const fallbackShip = new PIXI.Graphics();
    fallbackShip.moveTo(0, -radius * 0.42);
    fallbackShip.lineTo(radius * 0.28, radius * 0.3);
    fallbackShip.lineTo(0, radius * 0.14);
    fallbackShip.lineTo(-radius * 0.28, radius * 0.3);
    fallbackShip.closePath();
    fallbackShip.fill({ color: 0x9bf8ff, alpha: 0.86 });
    fallbackShip.stroke({ color: 0xffffff, width: 1.4, alpha: 0.9 });
    pod.addChild(fallbackShip);
    this.heroMotionNodes.push({ target: fallbackShip, kind: 'hover', baseX: 0, baseY: 0, amp: radius * 0.04, speed: 0.035, phase: 0, rotationSpeed: 0.002 * side });

    const shipSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    shipSprite.anchor.set(0.5);
    shipSprite.visible = false;
    shipSprite.label = side < 0 ? 'ui_howToPlayHeroShip_art' : 'ui_howToPlayHeroPhaseShip_art';
    pod.addChild(shipSprite);
    this.loadHeroTexture(shipSprite, side < 0 ? AssetManifest.generated.playerShips[10] : AssetManifest.generated.playerShips[15], radius * (compact ? 0.92 : 1.02), fallbackShip);
    this.heroMotionNodes.push({ target: shipSprite, kind: 'hover', baseX: 0, baseY: 0, amp: radius * 0.04, speed: 0.035, phase: 0.35, rotationSpeed: 0.002 * side });

    const enemySource = side < 0
      ? AssetManifest.generated.enemies[16]
      : AssetManifest.generated.eliteMiddleShips[11];
    const enemyA = this.createHeroSprite(pod, enemySource, {
      x: side * radius * 0.72,
      y: -radius * 0.38,
      size: radius * 0.46,
      fallbackColor: danger,
      label: side < 0 ? 'ui_howToPlayThreat_art' : 'ui_howToPlayPhaseThreat_art'
    });
    const enemyB = this.createHeroSprite(pod, AssetManifest.generated.enemies[38], {
      x: side * radius * 0.58,
      y: radius * 0.48,
      size: radius * 0.35,
      fallbackColor: secondary,
      label: side < 0 ? 'ui_howToPlayGrazeThreat_art' : 'ui_howToPlayChainThreat_art'
    });
    this.heroMotionNodes.push({ target: enemyA, kind: 'orbit', baseX: enemyA.x, baseY: enemyA.y, amp: radius * 0.07, speed: 0.028, phase: side > 0 ? 1.1 : 0.2, rotationSpeed: -0.005 * side });
    this.heroMotionNodes.push({ target: enemyB, kind: 'orbit', baseX: enemyB.x, baseY: enemyB.y, amp: radius * 0.06, speed: 0.033, phase: side > 0 ? 2.4 : 1.6, rotationSpeed: 0.006 * side });

    const weaponSprite = this.createHeroSprite(pod, side < 0 ? AssetManifest.generated.enemyWeapons[3] : AssetManifest.generated.enemyWeapons[10], {
      x: -side * radius * 0.56,
      y: side < 0 ? radius * 0.44 : -radius * 0.42,
      size: radius * 0.32,
      fallbackColor: side < 0 ? 0xff66ff : 0x66ff9d,
      label: side < 0 ? 'ui_howToPlayGrazeBreakProjectile_art' : 'ui_howToPlayDodgeProjectile_art'
    });
    this.heroMotionNodes.push({ target: weaponSprite, kind: 'projectile', baseX: weaponSprite.x, baseY: weaponSprite.y, amp: radius * 0.22, speed: 0.045, phase: side > 0 ? 1.8 : 0.3, rotationSpeed: 0.035 * side });

    const sparks = [];
    for (let index = 0; index < 5; index += 1) {
      const spark = new PIXI.Graphics();
      spark.circle(0, 0, Math.max(2, radius * (0.025 + index * 0.002)));
      spark.fill({ color: index % 2 ? secondary : primary, alpha: 0.78 });
      pod.addChild(spark);
      const angle = index * 1.26 + (side > 0 ? 0.4 : 0);
      spark.position.set(Math.cos(angle) * radius * 0.92, Math.sin(angle) * radius * 0.92);
      sparks.push(spark);
      this.heroMotionNodes.push({
        target: spark,
        kind: 'spark',
        baseAngle: angle,
        radius: radius * (0.78 + index * 0.045),
        speed: (0.018 + index * 0.003) * side,
        phase: index * 0.8,
        baseAlpha: 0.72
      });
    }
    pod._debugHeroSparkCount = sparks.length;

    return pod;
  }

  createHeroSprite(parent, source, { x, y, size, fallbackColor, label }) {
    const fallback = new PIXI.Graphics();
    fallback.circle(0, 0, size * 0.32);
    fallback.fill({ color: fallbackColor, alpha: 0.72 });
    fallback.circle(0, 0, size * 0.46);
    fallback.stroke({ color: fallbackColor, width: 2, alpha: 0.42 });
    fallback.position.set(x, y);
    fallback.label = `${label}_fallback`;
    parent.addChild(fallback);

    const sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    sprite.visible = false;
    sprite.label = label;
    parent.addChild(sprite);
    this.loadHeroTexture(sprite, source, size, fallback);
    return sprite;
  }

  loadHeroTexture(sprite, source, maxSide, fallback = null) {
    if (!sprite || !source) return;
    this.heroTextureSprites.push(sprite);
    PIXI.Assets.load(source)
      .then((texture) => {
        if (!sprite || sprite.destroyed || !this.container || this.container.destroyed || !GameAssets.isValidTexture(texture)) return;
        sprite.texture = texture;
        const textureMax = Math.max(texture.width || 1, texture.height || 1);
        sprite.scale.set(maxSide / textureMax);
        sprite.visible = true;
        if (fallback && !fallback.destroyed) fallback.visible = false;
      })
      .catch((error) => {
        console.warn(`[HowToPlayOverlay] Failed to load hero art ${source}`, error);
      });
  }

  updateHeroMotion(delta = 1) {
    if (!this.heroMotionNodes?.length || this.reducedMotion) return;
    const step = Math.max(0.25, Math.min(2.2, Number(delta) || 1));
    for (const node of this.heroMotionNodes) {
      const target = node.target;
      if (!target || target.destroyed) continue;
      node.phase = (Number(node.phase) || 0) + step * (node.speed || 0.02);
      if (node.kind === 'rotate') {
        target.rotation += step * (node.speed || 0.01);
        target.alpha = Math.max(0.35, Math.min(1, (node.baseAlpha || 0.8) + Math.sin(node.phase * 2.4) * (node.pulse || 0.08)));
      } else if (node.kind === 'pulse') {
        target.alpha = Math.max(0.38, Math.min(1, (node.baseAlpha || 0.75) + Math.sin(node.phase * 2.8) * (node.amp || 0.12)));
      } else if (node.kind === 'hover') {
        target.x = node.baseX + Math.cos(node.phase * 2.1) * (node.amp || 2);
        target.y = node.baseY + Math.sin(node.phase * 2.8) * (node.amp || 2);
        target.rotation += step * (node.rotationSpeed || 0);
      } else if (node.kind === 'orbit') {
        target.x = node.baseX + Math.cos(node.phase * 2.5) * (node.amp || 3);
        target.y = node.baseY + Math.sin(node.phase * 1.8) * (node.amp || 3);
        target.rotation += step * (node.rotationSpeed || 0);
      } else if (node.kind === 'projectile') {
        target.x = node.baseX + Math.cos(node.phase * 3.4) * (node.amp || 8);
        target.y = node.baseY + Math.sin(node.phase * 2.5) * (node.amp || 8) * 0.42;
        target.rotation += step * (node.rotationSpeed || 0.02);
        target.alpha = 0.72 + Math.sin(node.phase * 5) * 0.2;
      } else if (node.kind === 'spark') {
        const angle = node.baseAngle + node.phase;
        target.position.set(Math.cos(angle) * node.radius, Math.sin(angle) * node.radius);
        target.alpha = Math.max(0.32, Math.min(0.9, (node.baseAlpha || 0.7) + Math.sin(node.phase * 3) * 0.18));
      }
    }
  }

  addHelpCard(row, layout) {
    const { x, y, width, height, compact, veryShort, shortDesktop, labelSize, controlSize, tipSize } = layout;
    const accent = row.accent;
    const card = new PIXI.Graphics();
    card.roundRect(x, y, width, height, 8);
    card.fill({ color: 0x061a2b, alpha: 0.92 });
    card.stroke({ color: accent, width: 1.2, alpha: 0.66 });
    card.rect(x, y, Math.max(4, Math.min(7, width * 0.018)), height);
    card.fill({ color: accent, alpha: 0.78 });
    card.moveTo(x + width * 0.48, y);
    card.lineTo(x + width, y);
    card.lineTo(x + width, y + height);
    card.lineTo(x + width * 0.62, y + height);
    card.closePath();
    card.fill({ color: accent, alpha: 0.055 });
    card.rect(x + 14, y + height - 7, width - 28, 1.5);
    card.fill({ color: accent, alpha: 0.2 });
    card.roundRect(x + 12, y + 12, veryShort ? 34 : shortDesktop ? 38 : 44, veryShort ? 24 : shortDesktop ? 28 : 34, 6);
    card.fill({ color: 0x010814, alpha: 0.88 });
    card.stroke({ color: accent, width: 1, alpha: 0.74 });
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.hitArea = new PIXI.Rectangle(x, y, width, height);
    card.label = `how_to_card_${String(row.label).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    card._helpRow = row;
    card._accent = accent;
    card.on('pointerover', () => {
      card.tint = 0xc8f5ff;
      playMenuFocusSfx(0.06);
    });
    card.on('pointerout', () => { card.tint = 0xffffff; });
    card.on('pointertap', () => {
      playMenuConfirmSfx(0.13);
      this.openDetail(row);
    });
    this.container.addChild(card);
    this.cards.push(card);

    const code = createText(row.code, {
      fontFamily: FONT_DISPLAY,
      fontSize: veryShort ? 9 : 11,
      fontWeight: '900',
      fill: '#f6fbff',
      align: 'center'
    });
    code.anchor.set(0.5);
    code.position.set(x + 12 + (veryShort ? 17 : shortDesktop ? 19 : 22), y + 12 + (veryShort ? 8 : shortDesktop ? 9 : 10));
    this.container.addChild(code);

    const icon = createText(translateText(row.icon || row.label), {
      fontFamily: FONT_BODY,
      fontSize: veryShort ? 7 : compact || shortDesktop ? 8 : 9,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#00111d',
      strokeThickness: 2,
      align: 'center',
      letterSpacing: 0
    });
    icon.anchor.set(0.5);
    icon.position.set(x + 12 + (veryShort ? 17 : shortDesktop ? 19 : 22), y + 12 + (veryShort ? 18 : shortDesktop ? 21 : 25));
    fitTextToBox(icon, veryShort ? 30 : shortDesktop ? 34 : 40, veryShort ? 9 : 12, { minScale: 0.5 });
    this.container.addChild(icon);

    const textX = x + (veryShort ? 56 : shortDesktop ? 64 : 72);
    const rightPad = compact || shortDesktop ? 18 : 22;
    const labelMax = compact ? Math.min(230, width * 0.36) : Math.min(190, width * 0.36);
    const controlX = textX + labelMax + (compact || shortDesktop ? 10 : 16);
    const controlMax = Math.max(120, x + width - rightPad - controlX);
    const topY = y + (veryShort ? 17 : shortDesktop ? 19 : 23);
    const tipY = y + (veryShort ? 31 : shortDesktop ? 40 : 52);
    const tipMaxHeight = Math.max(14, y + height - tipY - (veryShort ? 6 : shortDesktop ? 8 : 10));

    const label = createText(translateText(row.label), {
      fontFamily: FONT_DISPLAY,
      fontSize: labelSize,
      fontWeight: '900',
      fill: '#f6fbff',
      stroke: '#00111d',
      strokeThickness: 3,
      wordWrap: true,
      breakWords: true,
      wordWrapWidth: labelMax,
      lineHeight: Math.round(labelSize * 1.02)
    });
    label.anchor.set(0, 0.5);
    label.position.set(textX, topY);
    fitTextToBox(label, labelMax, height * 0.38, { minScale: 0.36 });
    this.container.addChild(label);

    const control = createText(translateText(row.control), {
      fontFamily: FONT_BODY,
      fontSize: controlSize,
      fontWeight: '900',
      fill: '#ffef7e',
      stroke: '#00111d',
      strokeThickness: 3,
      wordWrap: true,
      breakWords: true,
      wordWrapWidth: controlMax,
      lineHeight: Math.round(controlSize * 1.05)
    });
    control.anchor.set(0, 0.5);
    control.position.set(controlX, topY);
    fitTextToBox(control, controlMax, height * 0.42, { minScale: 0.42 });
    this.container.addChild(control);

    const tip = createText(translateText(row.tip), {
      fontFamily: FONT_BODY,
      fontSize: tipSize,
      fontWeight: '700',
      fill: '#cfefff',
      stroke: '#00111d',
      strokeThickness: 2,
      wordWrap: true,
      breakWords: true,
      wordWrapWidth: width - (textX - x) - rightPad,
      lineHeight: Math.round(tipSize * (shortDesktop ? 1.05 : 1.12))
    });
    tip.anchor.set(0, 0);
    tip.position.set(textX, tipY);
    fitTextToBox(tip, width - (textX - x) - rightPad, tipMaxHeight, { minScale: veryShort ? 0.48 : shortDesktop ? 0.46 : 0.56 });
    this.container.addChild(tip);
  }

  setFocusedCard(index = 0) {
    if (!this.cards.length) return;
    this.focusedCardIndex = (Math.floor(Number(index) || 0) + this.cards.length) % this.cards.length;
    this.cards.forEach((card, cardIndex) => {
      card.tint = cardIndex === this.focusedCardIndex ? 0xc8f5ff : 0xffffff;
    });
  }

  openDetail(row) {
    if (!row) return false;
    this.closeDetail();
    this.detailRow = row;
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 900 || height < 680;
    const panelWidth = Math.min(compact ? 720 : 900, width - 40);
    const panelHeight = Math.min(compact ? 500 : 590, height - 40);
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;
    const accent = row.accent || 0x37f5ff;
    const detail = new PIXI.Container();
    detail.label = `how_to_detail_${String(row.label).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    detail.zIndex = 60;
    detail.eventMode = 'static';
    detail.hitArea = new PIXI.Rectangle(0, 0, width, height);

    const dim = new PIXI.Graphics();
    dim.rect(0, 0, width, height);
    dim.fill({ color: 0x01050d, alpha: 0.9 });
    detail.addChild(dim);
    const panel = new PIXI.Graphics();
    panel.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    panel.fill({ color: 0x04111f, alpha: 0.99 });
    panel.stroke({ color: accent, width: 2.2, alpha: 0.94 });
    panel.roundRect(panelX + 9, panelY + 9, panelWidth - 18, panelHeight - 18, 6);
    panel.stroke({ color: 0xff55d9, width: 1, alpha: 0.26 });
    panel.rect(panelX + 24, panelY + 116, panelWidth - 48, 2);
    panel.fill({ color: accent, alpha: 0.32 });
    detail.addChild(panel);

    const code = createText(row.code, { fontFamily: FONT_DISPLAY, fontSize: compact ? 20 : 24, fontWeight: '900', fill: '#ffffff' });
    code.anchor.set(0.5);
    code.position.set(panelX + 56, panelY + 58);
    detail.addChild(code);
    const label = createText(translateText(row.label), {
      fontFamily: FONT_DISPLAY, fontSize: compact ? 30 : 40, fontWeight: '900', fill: '#ffffff', stroke: '#00111d', strokeThickness: 4
    });
    label.position.set(panelX + 98, panelY + 34);
    fitTextToBox(label, panelWidth - 128, 58, { minScale: 0.58 });
    detail.addChild(label);
    const control = createText(translateText(row.control), {
      fontFamily: FONT_BODY, fontSize: compact ? 15 : 18, fontWeight: '900', fill: '#ffef7e', wordWrap: true, wordWrapWidth: panelWidth - 128
    });
    control.position.set(panelX + 98, panelY + 82);
    fitTextToBox(control, panelWidth - 128, 30, { minScale: 0.62 });
    detail.addChild(control);

    const summary = createText(translateText(row.tip), {
      fontFamily: FONT_BODY, fontSize: compact ? 17 : 20, fontWeight: '900', fill: '#9bf8ff', wordWrap: true,
      breakWords: true, wordWrapWidth: panelWidth - 56, lineHeight: compact ? 21 : 25
    });
    summary.position.set(panelX + 28, panelY + 140);
    fitTextToBox(summary, panelWidth - 56, compact ? 88 : 102, { minScale: 0.62 });
    detail.addChild(summary);

    const body = createText(translateText(getHelpDetail(row)), {
      fontFamily: FONT_BODY, fontSize: compact ? 17 : 20, fontWeight: '700', fill: '#e4f7ff', wordWrap: true,
      breakWords: true, wordWrapWidth: panelWidth - 56, lineHeight: compact ? 22 : 27
    });
    body.position.set(panelX + 28, panelY + (compact ? 248 : 270));
    fitTextToBox(body, panelWidth - 56, compact ? 150 : 190, { minScale: 0.62 });
    detail.addChild(body);

    const close = this.createButton(translateText('BACK'), width / 2, panelY + panelHeight - 44, () => this.closeDetail(), {
      width: 220, height: 38, fontSize: 17
    });
    close.label = 'how_to_detail_back';
    detail.addChild(close);
    detail._debugDetail = {
      label: row.label,
      translatedLabel: translateText(row.label),
      detail: getHelpDetail(row),
      translatedDetail: translateText(getHelpDetail(row)),
      panel: { x: Math.round(panelX), y: Math.round(panelY), width: Math.round(panelWidth), height: Math.round(panelHeight) }
    };
    this.detailContainer = detail;
    this.container.addChild(detail);
    return true;
  }

  closeDetail() {
    if (this.detailContainer?.parent) this.detailContainer.parent.removeChild(this.detailContainer);
    this.detailContainer?.destroy?.({ children: true });
    this.detailContainer = null;
    this.detailRow = null;
  }

  createButton(label, x, y, onPress, { width = 220, height = 38, fontSize = 18 } = {}) {
    const button = new PIXI.Container();
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.activate = onPress;

    const focus = new PIXI.Graphics();
    const bg = new PIXI.Graphics();
    const sweep = new PIXI.Graphics();
    button.addChild(focus, bg, sweep);

    const draw = (hovered = false) => {
      focus.clear();
      focus.roundRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, 8);
      focus.stroke({ color: hovered ? 0xffffff : 0xffef7e, width: 2, alpha: hovered ? 0.92 : 0.74 });
      bg.clear();
      bg.roundRect(-width / 2, -height / 2, width, height, 6);
      bg.fill({ color: hovered ? 0x0b6f8f : 0x07334e, alpha: hovered ? 0.94 : 0.9 });
      bg.stroke({ color: hovered ? 0xffffff : 0x00ffff, width: hovered ? 2 : 1, alpha: 0.95 });
      sweep.clear();
      sweep.rect(-width / 2 + 8, -height / 2 + 5, width - 16, 3);
      sweep.fill({ color: hovered ? 0xffffff : 0x37f5ff, alpha: hovered ? 0.5 : 0.32 });
    };
    draw(false);
    button.redraw = draw;

    const text = createText(label, {
      fontFamily: FONT_DISPLAY,
      fontSize,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#00111d',
      strokeThickness: 3
    });
    text.anchor.set(0.5);
    fitTextToBox(text, width - 24, height - 8, { minScale: 0.62 });
    button.addChild(text);
    button.position.set(x, y);
    button.on('pointerover', () => {
      playMenuFocusSfx(0.1);
      draw(true);
    });
    button.on('pointerout', () => draw(false));
    button.on('pointertap', () => {
      playMenuConfirmSfx(0.16);
      this.menuFx?.burst?.(x, y, { color: 0xffef7e, radius: 86, durationMs: 420 });
      onPress?.();
    });
    return button;
  }

  createPageTab(label, x, y, active, onPress, { width = 120, height = 28, fontSize = 12 } = {}) {
    const tab = new PIXI.Container();
    tab.eventMode = 'static';
    tab.cursor = 'pointer';
    const bg = new PIXI.Graphics();
    bg.roundRect(-width / 2, -height / 2, width, height, 5);
    bg.fill({ color: active ? 0x0b6f8f : 0x03121d, alpha: active ? 0.96 : 0.88 });
    bg.stroke({ color: active ? 0xffef7e : 0x37f5ff, width: active ? 2 : 1, alpha: active ? 0.96 : 0.58 });
    tab.addChild(bg);
    const text = createText(translateText(label), {
      fontFamily: FONT_DISPLAY,
      fontSize,
      fontWeight: '900',
      fill: active ? '#fff3a0' : '#bdefff',
      stroke: '#00111d',
      strokeThickness: 2,
      align: 'center'
    });
    text.anchor.set(0.5);
    fitTextToBox(text, width - 16, height - 7, { minScale: 0.62 });
    tab.addChild(text);
    tab.position.set(x, y);
    tab.on('pointerover', () => playMenuFocusSfx(0.08));
    tab.on('pointertap', () => {
      playMenuConfirmSfx(0.12);
      onPress?.();
    });
    return tab;
  }

  setPage(index) {
    const next = ((Math.floor(Number(index) || 0) % HELP_PAGES.length) + HELP_PAGES.length) % HELP_PAGES.length;
    if (next === this.pageIndex) return;
    this.pageIndex = next;
    this.focusedCardIndex = 0;
    this.closeDetail();
    destroyMenuFx(this);
    const children = this.container.removeChildren();
    children.forEach((child) => child.destroy?.({ children: true }));
    this.build();
  }

  setupKeyboardNavigation() {
    this.keyHandler = (event) => {
      const key = event.key || event.code;
      const pageLeft = key === 'ArrowLeft' || key === 'a' || key === 'A';
      const pageRight = key === 'ArrowRight' || key === 'd' || key === 'D';
      const up = key === 'ArrowUp' || key === 'w' || key === 'W';
      const down = key === 'ArrowDown' || key === 's' || key === 'S';
      const confirm = ['Enter', ' '].includes(key) || event.code === 'Space' || event.code === 'NumpadEnter';
      const handled = pageLeft || pageRight || up || down || confirm || key === 'Escape';
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
      if (this.detailRow) {
        if (confirm || key === 'Escape') this.closeDetail();
        return;
      }
      if (pageLeft) {
        this.setPage(this.pageIndex - 1);
        return;
      }
      if (pageRight) {
        this.setPage(this.pageIndex + 1);
        return;
      }
      if (up || down) {
        this.setFocusedCard(this.focusedCardIndex + (up ? -1 : 1));
        return;
      }
      if (confirm) {
        this.openDetail(this.cards[this.focusedCardIndex]?._helpRow);
        return;
      }
      this.close();
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  update(delta = 1) {
    updateMenuFx(this, delta);
    this.updateHeroMotion(delta);
    const nav = this.gamepadNavigator.update();
    if (!nav.connected || !nav.active) return;
    if (this.detailRow) {
      if (nav.pressed.confirm || nav.pressed.cancel || nav.pressed.menu || nav.pressed.back) this.closeDetail();
      return;
    }
    if (nav.pressed.left) this.setPage(this.pageIndex - 1);
    if (nav.pressed.right) this.setPage(this.pageIndex + 1);
    if (nav.pressed.up || nav.pressed.down) this.setFocusedCard(this.focusedCardIndex + (nav.pressed.up ? -1 : 1));
    if (nav.pressed.confirm) this.openDetail(this.cards[this.focusedCardIndex]?._helpRow);
    if (nav.pressed.cancel || nav.pressed.menu || nav.pressed.back) this.close();
  }

  getDebugState() {
    const helpPage = HELP_PAGES[this.pageIndex] || HELP_PAGES[0];
    return {
      visible: Boolean(this.container?.parent),
      pageIndex: this.pageIndex,
      pageId: helpPage.id,
      pageLabel: helpPage.label,
      pages: HELP_PAGES.map((page) => ({ id: page.id, label: page.label, cardCount: page.rows.length })),
      rows: helpPage.rows.map((row) => row.label),
      cards: helpPage.rows.map((row) => ({
        label: row.label,
        control: row.control,
        tip: row.tip,
        translatedLabel: translateText(row.label),
        translatedControl: translateText(row.control),
        translatedTip: translateText(row.tip)
      })),
      cardCount: helpPage.rows.length,
      trainingFlow: 'GRAZE -> CHAIN -> GRAZE BREAK -> SURVIVE',
      translatedTrainingFlow: translateText('GRAZE -> CHAIN -> GRAZE BREAK -> SURVIVE'),
      focusedControl: 'back',
      focusedCardIndex: this.focusedCardIndex,
      detail: this.detailContainer?._debugDetail || null,
      layout: this.debugLayout,
      heroArt: {
        motionNodes: this.heroMotionNodes?.length || 0,
        textureSprites: this.heroTextureSprites?.length || 0,
        visibleTextureSprites: this.heroTextureSprites?.filter((sprite) => sprite?.visible).length || 0,
        reducedMotion: this.reducedMotion
      },
      menuFx: this.menuFx?.getDebugState?.() || null
    };
  }

  close() {
    this.closeDetail();
    if (this.keyHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.container?.parent) {
      this.container.parent.removeChild(this.container);
    }
    destroyMenuFx(this);
    this.container.destroy({ children: true });
    this.onClose?.();
  }
}
