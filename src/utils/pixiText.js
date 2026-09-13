import * as PIXI from 'pixi.js';
import { getCurrentLayout } from '../ui/responsiveLayout.js';

export const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, sans-serif';
export const FONT_BODY = 'Rajdhani, Bahnschrift, Segoe UI, Arial, sans-serif';
export const FONT_MONO = 'Rajdhani, Bahnschrift, Segoe UI, monospace';

function normalizeFontFamily(fontFamily) {
  const family = String(fontFamily || '').trim();
  if (!family) return FONT_BODY;
  if (/orbitron|rajdhani/i.test(family)) return family;
  if (/courier new|monospace/i.test(family)) return FONT_MONO;
  return family;
}

export function normalizeTextStyle(style = {}) {
  const next = { ...style };
  const uiScale = Math.max(1, Math.min(2, Number(getCurrentLayout?.()?.uiScale) || 1));
  const uiScaleMode = next.uiScaleMode || next.accessibilityScale || 'capped';
  delete next.uiScaleMode;
  delete next.accessibilityScale;
  const textScale = uiScaleMode === 'full'
    ? uiScale
    : uiScaleMode === 'none' || uiScaleMode === false
      ? 1
      : Math.min(1.35, 1 + (uiScale - 1) * 0.35);
  next.fontFamily = normalizeFontFamily(next.fontFamily);
  if (Number.isFinite(Number(next.fontSize))) next.fontSize = Math.round(Number(next.fontSize) * textScale);
  if (Number.isFinite(Number(next.padding))) next.padding = Math.round(Number(next.padding) * textScale);
  if (next.strokeThickness !== undefined) {
    const stroke = next.stroke;
    const strokeConfig = stroke && typeof stroke === 'object'
      ? { ...stroke }
      : { color: stroke || '#000000' };
    strokeConfig.width = Number.isFinite(Number(next.strokeThickness))
      ? Math.round(Number(next.strokeThickness) * textScale)
      : next.strokeThickness;
    next.stroke = strokeConfig;
    delete next.strokeThickness;
  }
  return next;
}

export function createText(text = '', style = {}) {
  return new PIXI.Text({
    text: String(text ?? ''),
    style: normalizeTextStyle(style)
  });
}
