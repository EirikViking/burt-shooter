import * as PIXI from 'pixi.js';

export const FONT_DISPLAY = 'Orbitron, Rajdhani, Bahnschrift, Eurostile, Bank Gothic, Impact, sans-serif';
export const FONT_BODY = 'Rajdhani, Orbitron, Bahnschrift, Segoe UI, sans-serif';
export const FONT_MONO = 'Rajdhani, Cascadia Mono, Consolas, Courier New, monospace';

function normalizeFontFamily(fontFamily) {
  const family = String(fontFamily || '').trim();
  if (!family) return FONT_BODY;
  if (/orbitron|rajdhani/i.test(family)) return family;
  if (/courier new|monospace/i.test(family)) return FONT_MONO;
  return family;
}

export function normalizeTextStyle(style = {}) {
  const next = { ...style };
  next.fontFamily = normalizeFontFamily(next.fontFamily);
  if (next.strokeThickness !== undefined) {
    const stroke = next.stroke;
    const strokeConfig = stroke && typeof stroke === 'object'
      ? { ...stroke }
      : { color: stroke || '#000000' };
    strokeConfig.width = next.strokeThickness;
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
