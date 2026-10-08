import * as PIXI from 'pixi.js';

// A load-time material pass, never a per-entity filter. Alpha, canvas size and
// registration are unchanged, so hitbox references retain their exact bounds.
const cache = new WeakMap();
export const astraMaterialStats = { textures: 0, milliseconds: 0, failures: 0 };

export function shadeHullPixels(input, width, height) {
  const output = new Uint8ClampedArray(input);
  const luma = new Float32Array(width * height);
  for (let i = 0; i < luma.length; i++) {
    const p = i * 4;
    luma[i] = (input[p] * 0.2126 + input[p + 1] * 0.7152 + input[p + 2] * 0.0722) / 255;
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, p = i * 4;
    if (input[p + 3] === 0) continue;
    const lum = luma[i];
    // Preserve the exact summation order without allocating a neighbor array
    // for every visible pixel during a hull's first appearance.
    let total = 0, count = 0;
    if (x > 0 && input[p - 1] > 128) { total += luma[i - 1]; count++; }
    if (x + 1 < width && input[p + 7] > 128) { total += luma[i + 1]; count++; }
    if (i >= width && input[p - width * 4 + 3] > 128) { total += luma[i - width]; count++; }
    if (i + width < luma.length && input[p + width * 4 + 3] > 128) { total += luma[i + width]; count++; }
    const detail = count ? Math.max(-0.055, Math.min(0.055, (lum - total / count) * 0.65)) : 0;
    // Retain dark cavities and bright bevels instead of washing both into pale
    // plastic. Alpha, geometry and faction markings remain unchanged.
    const value = lum + (lum - 0.5) * lum * (1 - lum) * 0.55 + detail;
    for (let c = 0; c < 3; c++) {
      const chroma = input[p + c] / 255 - lum;
      const bounce = lum * (1 - lum) * (c === 0 ? 0.002 : c === 1 ? 0.014 : 0.027);
      output[p + c] = Math.max(0, Math.min(255, (value + chroma * 0.96 + bounce) * 255));
    }
  }
  return output;
}

export function getAstraHullTexture(texture) {
  if (!texture || texture === PIXI.Texture.EMPTY || typeof document === 'undefined') return texture;
  if (cache.has(texture)) return cache.get(texture);
  cache.set(texture, texture);
  const image = texture.source?.resource;
  if (!image || !texture.width || !texture.height) return texture;
  const sourceName = String(image.src || texture.source.label || '');
  if (sourceName.includes('/art/astra/') || sourceName.includes('/art/material-rebuild/')) return texture;
  const start = performance.now();
  try {
    const canvas = document.createElement('canvas');
    canvas.width = texture.width;
    canvas.height = texture.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    pixels.data.set(shadeHullPixels(pixels.data, canvas.width, canvas.height));
    context.putImageData(pixels, 0, 0);
    const result = PIXI.Texture.from(canvas);
    result.source.label = `astra-hull:${texture.source.label || 'material'}`;
    cache.set(texture, result);
    astraMaterialStats.textures++;
    astraMaterialStats.milliseconds += performance.now() - start;
    return result;
  } catch (error) {
    astraMaterialStats.failures++;
    console.warn('[AstraHullMaterial] Using original hull:', error.message);
    return texture;
  }
}
