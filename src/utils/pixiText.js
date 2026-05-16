import * as PIXI from 'pixi.js';

export function normalizeTextStyle(style = {}) {
  const next = { ...style };
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
