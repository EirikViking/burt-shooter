import * as PIXI from 'pixi.js';
import { GamepadNavigator } from '../input/GamepadNavigator.js';
import { translateText } from '../i18n/index.js';
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
    icon: 'FIRE',
    label: 'SHOOT',
    control: 'SPACE / LEFT MOUSE / GAMEPAD A',
    tip: 'Hold fire and choose targets. Clearing the right enemies keeps the run under control.',
    accent: 0xffef7e
  },
  {
    code: '03',
    icon: 'PHASE',
    label: 'DODGE / PHASE',
    control: 'LEFT/RIGHT SHIFT / GAMEPAD B',
    tip: 'Tap Phase Burst to pass safely through bullets or contact for a heartbeat. It protects you; it is not a movement dash.',
    accent: 0xff55d9
  },
  {
    code: '04',
    icon: 'CHAIN',
    label: 'CHAINED DODGE',
    control: 'GRAZE AGAIN BEFORE THE TIMER ENDS',
    tip: 'Several close grazes in a row count as a chained danger-dodge streak. These streaks drive the Danger Dodge achievements.',
    accent: 0xff8f5a
  },
  {
    code: '05',
    icon: 'SKIM',
    label: 'GRAZE',
    control: 'PASS CLOSE TO ENEMY SHOTS',
    tip: 'Skim enemy bullets without getting hit to earn NEAR MISS score popups and build your graze streak.',
    accent: 0x66ff9d
  },
  {
    code: '06',
    icon: 'BREAK',
    label: 'GRAZE BREAK',
    control: '3 GRAZES ARM YOUR NEXT SHOT',
    tip: 'After three quick grazes, fire the charged magenta shot into enemy fire to clear bullets, damage nearby threats, and score.',
    accent: 0xff66ff
  },
  {
    code: '07',
    icon: 'COMBO',
    label: 'COMBOS',
    control: 'FAST KILLS KEEP THE CHAIN',
    tip: 'Destroy enemies quickly to keep the chain alive. Tough targets can slow the rhythm, so target choice matters.',
    accent: 0xff8f5a
  },
  {
    code: '08',
    icon: 'BEAM',
    label: 'TRACTOR SHIPS',
    control: 'BREAK ACTIVE BEAMS',
    tip: 'Destroy tractor ships during their beam to break the pull, clear nearby shots, and earn bonus score from nearby enemies.',
    accent: 0x7ee9ff
  },
  {
    code: '09',
    icon: 'LOOT',
    label: 'PICKUPS & BONUS',
    control: 'BRIGHT ICONS ARE SAFE',
    tip: 'Collect bright pickup icons. Shoot bonus drones for extra score and watch for the BONUS popup.',
    accent: 0xb285ff
  },
  {
    code: '10',
    icon: 'MODE',
    label: 'RUN MODES',
    control: 'MAYHEM / SCOUT / SECTOR RUN',
    tip: 'Mayhem is the ranked climb. Scout is practice. Sector Run lets you practice unlocked later starts.',
    accent: 0xff8f5a
  }
]);

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

function drawTrainingScope(container, cx, cy, radius, compact = false) {
  const scope = new PIXI.Graphics();
  scope.circle(cx, cy, radius);
  scope.fill({ color: 0x020a18, alpha: 0.72 });
  scope.circle(cx, cy, radius);
  scope.stroke({ color: 0x37f5ff, width: compact ? 1.4 : 2, alpha: 0.62 });
  scope.circle(cx, cy, radius * 0.66);
  scope.stroke({ color: 0xff55d9, width: 1, alpha: 0.24 });
  scope.circle(cx, cy, radius * 0.34);
  scope.stroke({ color: 0x66ff9d, width: 1, alpha: 0.28 });
  scope.moveTo(cx - radius * 0.86, cy);
  scope.lineTo(cx - radius * 0.38, cy);
  scope.moveTo(cx + radius * 0.38, cy);
  scope.lineTo(cx + radius * 0.86, cy);
  scope.moveTo(cx, cy - radius * 0.86);
  scope.lineTo(cx, cy - radius * 0.38);
  scope.moveTo(cx, cy + radius * 0.38);
  scope.lineTo(cx, cy + radius * 0.86);
  scope.stroke({ color: 0x7ee9ff, width: 1, alpha: 0.38 });

  const ship = new PIXI.Graphics();
  ship.moveTo(cx, cy - radius * 0.36);
  ship.lineTo(cx + radius * 0.22, cy + radius * 0.27);
  ship.lineTo(cx, cy + radius * 0.14);
  ship.lineTo(cx - radius * 0.22, cy + radius * 0.27);
  ship.closePath();
  ship.fill({ color: 0x9bf8ff, alpha: 0.92 });
  ship.stroke({ color: 0xffffff, width: 1.4, alpha: 0.9 });

  const bullet = new PIXI.Graphics();
  bullet.circle(cx + radius * 0.74, cy - radius * 0.28, compact ? 4 : 5);
  bullet.fill({ color: 0xff66ff, alpha: 0.9 });
  bullet.circle(cx + radius * 0.52, cy + radius * 0.32, compact ? 3 : 4);
  bullet.fill({ color: 0xffcc00, alpha: 0.9 });
  bullet.moveTo(cx + radius * 0.74, cy - radius * 0.28);
  bullet.lineTo(cx + radius * 0.2, cy - radius * 0.05);
  bullet.stroke({ color: 0xff66ff, width: compact ? 1 : 1.4, alpha: 0.36 });

  const graze = new PIXI.Graphics();
  graze.arc(cx, cy, radius * 0.48, -0.35, 0.62);
  graze.stroke({ color: 0x66ff9d, width: compact ? 3 : 4, alpha: 0.82 });
  graze.arc(cx, cy, radius * 0.55, -0.32, 0.55);
  graze.stroke({ color: 0xff66ff, width: compact ? 1.8 : 2.4, alpha: 0.66 });

  container.addChild(scope, ship, bullet, graze);
  return scope;
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
    this.keyHandler = null;
    this.debugLayout = null;
    this.gamepadNavigator = new GamepadNavigator();
    this.gamepadNavigator.suppressUntilReleased();
    this.build();
    this.setupKeyboardNavigation();
  }

  build() {
    const width = this.game.getWidth();
    const height = this.game.getHeight();
    const compact = width < 900 || height < 700;
    const veryShort = height < 560;
    const spacious = width >= 1800 && height >= 980;
    const panelWidth = Math.min(spacious ? 1320 : 1160, width * (compact ? 0.96 : 0.9));
    const panelHeight = Math.min(spacious ? 860 : 820, height * (compact ? 0.96 : 0.92));
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;
    const pad = veryShort ? 18 : compact ? 24 : 34;
    const headerHeight = veryShort ? 98 : compact ? 124 : 166;
    const footerHeight = veryShort ? 62 : compact ? 76 : 86;
    const gridGap = veryShort ? 8 : compact ? 10 : 14;
    const columns = compact ? 1 : 2;
    const visualRows = compact ? HELP_ROWS.length : Math.ceil(HELP_ROWS.length / columns);
    const gridX = panelX + pad;
    const gridY = panelY + headerHeight;
    const gridWidth = panelWidth - pad * 2;
    const gridHeight = panelHeight - headerHeight - footerHeight - pad * 0.35;
    const cardWidth = columns === 1
      ? gridWidth
      : (gridWidth - gridGap) / 2;
    const cardHeight = Math.max(
      veryShort ? 42 : compact ? 54 : 92,
      Math.floor((gridHeight - gridGap * (visualRows - 1)) / visualRows)
    );
    const titleSize = veryShort ? 24 : spacious ? 48 : compact ? 31 : 42;
    const subtitleSize = veryShort ? 11 : spacious ? 16 : compact ? 12 : 14;
    const labelSize = veryShort ? 11 : spacious ? 16 : compact ? 13 : 15;
    const controlSize = veryShort ? 11 : spacious ? 17 : compact ? 13 : 15;
    const tipSize = veryShort ? 11 : spacious ? 16 : compact ? 12 : 15;
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
      const scopeRadius = compact ? 36 : 48;
      drawTrainingScope(this.container, panelX + pad + scopeRadius + 24, panelY + headerHeight * 0.5 + 4, scopeRadius, compact);
      drawTrainingScope(this.container, panelX + panelWidth - pad - scopeRadius - 24, panelY + headerHeight * 0.5 + 4, scopeRadius, compact);
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

    const chipText = createText(translateText('PILOT LINK // MANUAL OVERRIDE'), {
      fontFamily: FONT_BODY,
      fontSize: subtitleSize,
      fontWeight: '900',
      fill: '#ffef7e',
      stroke: '#130a00',
      strokeThickness: 2,
      align: 'center'
    });
    chipText.anchor.set(0.5);
    chipText.position.set(width / 2, panelY + (veryShort ? 80 : compact ? 94 : 110));
    fitTextToBox(chipText, panelWidth - pad * 5, 20, { minScale: 0.58 });
    this.container.addChild(chipText);

    if (!veryShort) {
      const skillText = createText(translateText('GRAZE -> CHAIN -> GRAZE BREAK -> SURVIVE'), {
        fontFamily: FONT_BODY,
        fontSize: spacious ? 15 : compact ? 12 : 13,
        fontWeight: '900',
        fill: '#ffffff',
        stroke: '#00111d',
        strokeThickness: 2,
        align: 'center'
      });
      skillText.anchor.set(0.5);
      skillText.position.set(width / 2, panelY + (compact ? 115 : 134));
      fitTextToBox(skillText, panelWidth - pad * 5, 22, { minScale: 0.58 });
      this.container.addChild(skillText);
    }

    HELP_ROWS.forEach((row, index) => {
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

  addHelpCard(row, layout) {
    const { x, y, width, height, compact, veryShort, labelSize, controlSize, tipSize } = layout;
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
    card.roundRect(x + 12, y + 12, veryShort ? 34 : 44, veryShort ? 24 : 34, 6);
    card.fill({ color: 0x010814, alpha: 0.88 });
    card.stroke({ color: accent, width: 1, alpha: 0.74 });
    this.container.addChild(card);

    const code = createText(row.code, {
      fontFamily: FONT_DISPLAY,
      fontSize: veryShort ? 9 : 11,
      fontWeight: '900',
      fill: '#f6fbff',
      align: 'center'
    });
    code.anchor.set(0.5);
    code.position.set(x + 12 + (veryShort ? 17 : 22), y + 12 + (veryShort ? 8 : 10));
    this.container.addChild(code);

    const icon = createText(translateText(row.icon || row.label), {
      fontFamily: FONT_BODY,
      fontSize: veryShort ? 7 : compact ? 8 : 9,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: '#00111d',
      strokeThickness: 2,
      align: 'center',
      letterSpacing: 0
    });
    icon.anchor.set(0.5);
    icon.position.set(x + 12 + (veryShort ? 17 : 22), y + 12 + (veryShort ? 18 : 25));
    fitTextToBox(icon, veryShort ? 30 : 40, veryShort ? 9 : 12, { minScale: 0.5 });
    this.container.addChild(icon);

    const textX = x + (veryShort ? 56 : 72);
    const rightPad = compact ? 18 : 22;
    const labelMax = compact ? Math.min(230, width * 0.36) : Math.min(190, width * 0.36);
    const controlX = textX + labelMax + (compact ? 10 : 16);
    const controlMax = Math.max(120, x + width - rightPad - controlX);
    const topY = y + (veryShort ? 17 : 23);
    const tipY = y + (veryShort ? 31 : 52);
    const tipMaxHeight = Math.max(14, y + height - tipY - (veryShort ? 6 : 10));

    const label = createText(translateText(row.label), {
      fontFamily: FONT_DISPLAY,
      fontSize: labelSize,
      fontWeight: '900',
      fill: '#f6fbff',
      stroke: '#00111d',
      strokeThickness: 3
    });
    label.anchor.set(0, 0.5);
    label.position.set(textX, topY);
    fitTextToBox(label, labelMax, height * 0.36, { minScale: 0.54 });
    this.container.addChild(label);

    const control = createText(translateText(row.control), {
      fontFamily: FONT_BODY,
      fontSize: controlSize,
      fontWeight: '900',
      fill: '#ffef7e',
      stroke: '#00111d',
      strokeThickness: 3,
      wordWrap: true,
      wordWrapWidth: controlMax,
      lineHeight: Math.round(controlSize * 1.05)
    });
    control.anchor.set(0, 0.5);
    control.position.set(controlX, topY);
    fitTextToBox(control, controlMax, height * 0.42, { minScale: 0.55 });
    this.container.addChild(control);

    const tip = createText(translateText(row.tip), {
      fontFamily: FONT_BODY,
      fontSize: tipSize,
      fontWeight: '700',
      fill: '#cfefff',
      stroke: '#00111d',
      strokeThickness: 2,
      wordWrap: true,
      wordWrapWidth: width - (textX - x) - rightPad,
      lineHeight: Math.round(tipSize * 1.12)
    });
    tip.anchor.set(0, 0);
    tip.position.set(textX, tipY);
    fitTextToBox(tip, width - (textX - x) - rightPad, tipMaxHeight, { minScale: veryShort ? 0.48 : 0.56 });
    this.container.addChild(tip);
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

  setupKeyboardNavigation() {
    this.keyHandler = (event) => {
      const key = event.key || event.code;
      const handled = ['Enter', ' ', 'Escape'].includes(key) || event.code === 'Space' || event.code === 'NumpadEnter';
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
      this.close();
    };
    window.addEventListener('keydown', this.keyHandler, true);
  }

  update(delta = 1) {
    updateMenuFx(this, delta);
    const nav = this.gamepadNavigator.update();
    if (!nav.connected || !nav.active) return;
    if (nav.pressed.confirm || nav.pressed.cancel || nav.pressed.menu || nav.pressed.back) {
      this.close();
    }
  }

  getDebugState() {
    return {
      visible: Boolean(this.container?.parent),
      rows: HELP_ROWS.map((row) => row.label),
      cards: HELP_ROWS.map((row) => ({
        label: row.label,
        control: row.control,
        tip: row.tip,
        translatedLabel: translateText(row.label),
        translatedControl: translateText(row.control),
        translatedTip: translateText(row.tip)
      })),
      cardCount: HELP_ROWS.length,
      trainingFlow: 'GRAZE -> CHAIN -> GRAZE BREAK -> SURVIVE',
      translatedTrainingFlow: translateText('GRAZE -> CHAIN -> GRAZE BREAK -> SURVIVE'),
      focusedControl: 'back',
      layout: this.debugLayout,
      menuFx: this.menuFx?.getDebugState?.() || null
    };
  }

  close() {
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
