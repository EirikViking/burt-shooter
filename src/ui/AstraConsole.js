import { FillGradient } from 'pixi.js';

// Shared presentation materials. Cached textures stay bounded; these never
// touch the simulation clock, input routing, or gameplay random stream.
const materials = new Map();
function mix(a, b, t) {
  let color = 0;
  for (const shift of [16, 8, 0]) color |= Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t) << shift;
  return color;
}
function material(color, luminous) {
  const lifted = ((color >> 8) & 255) > 48;
  const key = luminous ? `light-${color}` : lifted ? 'titanium-lit' : 'titanium';
  if (!materials.has(key)) {
    const base = luminous ? color : lifted ? 0x254552 : 0x13232f;
    materials.set(key, new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0.2, y: 1 }, textureSpace: 'local',
      colorStops: [
        { offset: 0, color: mix(base, 0xe2edf0, luminous ? 0.32 : 0.16) },
        { offset: 0.07, color: mix(base, 0x839ca7, luminous ? 0.14 : 0.1) },
        { offset: 0.48, color: base },
        { offset: 1, color: mix(base, 0x000308, luminous ? 0.18 : 0.62) }
      ]
    }));
  }
  return materials.get(key);
}
export function drawAstraPanel(g, x, y, width, height, radius = 7, fillStyle = {}, strokeStyle = {}) {
  if (!(width > 0 && height > 0)) return g;
  const color = typeof fillStyle?.color === 'number' ? fillStyle.color : 0x08131e;
  const alpha = fillStyle?.alpha ?? 1;
  const accent = strokeStyle?.color ?? 0x79b9c4;
  const strokeAlpha = strokeStyle?.alpha ?? 0.5;
  const brightness = (((color >> 16) & 255) + ((color >> 8) & 255) + (color & 255)) / 3;
  const luminous = brightness > 110 && alpha > 0.68;
  const cut = Math.min(Math.max(3, radius), 12, height * 0.2);
  g.poly([x + cut, y, x + width - cut, y, x + width, y + cut, x + width, y + height - cut, x + width - cut, y + height, x + cut, y + height, x, y + height - cut, x, y + cut]);
  if (fillStyle) g.fill({ fill: material(color, luminous), alpha });
  if (strokeStyle) g.stroke({ ...strokeStyle, color: luminous ? 0xd9f8ff : mix(typeof accent === 'number' ? accent : 0x79b9c4, 0x718896, 0.55), alpha: Math.min(0.8, strokeAlpha) });
  // Crisp edge illumination and a recessed lower lip give even small controls
  // physical depth without bloom or a separate filter/render pass.
  if (width > 42 && height > 25 && alpha > 0.35) {
    g.moveTo(x + cut + 5, y + 3).lineTo(x + width - cut - 5, y + 3);
    g.stroke({ color: 0xd5eff2, width: 1, alpha: luminous ? 0.68 : 0.19 });
    g.moveTo(x + cut + 4, y + height - 3).lineTo(x + width - cut - 4, y + height - 3);
    g.stroke({ color: 0x00040a, width: 2, alpha: 0.55 });
    if (width > 180 && height > 72) {
      for (const px of [x + 9, x + width - 9]) for (const py of [y + 10, y + height - 10]) {
        g.circle(px, py, 2.3).fill({ color: 0x03070b, alpha: 0.9 });
        g.moveTo(px - 1.3, py - 0.6).lineTo(px + 1.3, py - 0.6).stroke({ color: 0x90a5ad, width: 1, alpha: 0.5 });
      }
      g.moveTo(x + 15, y + 14).lineTo(x + 15, y + height - 14).stroke({ color: 0x8096a2, width: 1, alpha: 0.09 });
      g.moveTo(x + width - 15, y + 14).lineTo(x + width - 15, y + height - 14).stroke({ color: 0x00050b, width: 1, alpha: 0.45 });
    }
  }
  return g;
}
