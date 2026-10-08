import { Container, Graphics } from 'pixi.js';
import { createText } from '../utils/pixiText.js';
import { translateText } from '../i18n/index.js';
import { MENU_TIPS, MenuTipRotation } from './MenuTipRotation.js';

export class MenuAudioTip extends Container {
  constructor() {
    super();
    this.label = 'rotatingMenuTip';
    this.eventMode = 'none';
    this.interactiveChildren = false;
    this.zIndex = 90;
    this.tipRotation = new MenuTipRotation({ tipCount: MENU_TIPS.length });
    this.currentIndex = null;
    this.plate = new Graphics();
    this.copy = createText('', {
      fontFamily: 'Rajdhani, Bahnschrift, sans-serif',
      fontSize: 16,
      fontWeight: '700',
      fill: '#dffcff',
      stroke: '#020711',
      strokeThickness: 2,
      align: 'center',
      wordWrap: true,
      breakWords: true,
      wordWrapWidth: 698,
      lineHeight: 20
    });
    this.copy.anchor.set(0.5);
    this.addChild(this.plate, this.copy);
    this.visible = false;
    this._debugTipState = this.tipRotation.getState();
  }

  update(width, height, { obstructed = false, deltaMs = 0 } = {}) {
    const state = this.tipRotation.update(Math.max(0, Number(deltaMs) || 0), { suspended: obstructed });
    this._debugTipState = { ...state, obstructed: Boolean(obstructed), poolSize: MENU_TIPS.length };
    this.visible = state.visible;
    this.alpha = state.alpha;
    if (!state.visible || state.index == null) return;

    const localized = translateText(MENU_TIPS[state.index]);
    if (this.currentIndex !== state.index || this.copy.text !== localized) {
      this.currentIndex = state.index;
      this.copy.text = localized;
    }

    const safeWidth = Math.max(280, Number(width) || 1280);
    const compact = safeWidth < 760 || Number(height) < 600;
    const boxWidth = Math.min(compact ? 620 : 760, safeWidth - (compact ? 28 : 48));
    this.copy.style.fontSize = compact ? 14 : 16;
    this.copy.style.lineHeight = compact ? 18 : 20;
    this.copy.style.wordWrapWidth = Math.max(220, boxWidth - 42);
    this.copy.updateText?.(false);
    const boxHeight = Math.max(compact ? 42 : 46, Math.ceil(this.copy.height + (compact ? 16 : 20)));

    this.plate.clear();
    this.plate.roundRect(0, 0, boxWidth, boxHeight, 8);
    this.plate.fill({ color: 0x020711, alpha: 0.78 });
    this.plate.stroke({ color: 0x37f5ff, width: 1, alpha: 0.62 });
    this.plate.rect(12, boxHeight - 3, boxWidth - 24, 1);
    this.plate.fill({ color: 0xff55d9, alpha: 0.42 });
    this.copy.position.set(boxWidth / 2, boxHeight / 2);
    this.position.set((safeWidth - boxWidth) / 2, compact ? 10 : 24);
    this._debugTipState.bounds = { x: this.x, y: this.y, width: boxWidth, height: boxHeight };
  }
}
