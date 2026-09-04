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
    const neighbors = [i - 1, i + 1, i - width, i + width];
    let total = 0, count = 0;
    for (const j of neighbors) if (j >= 0 && j < luma.length && input[j * 4 + 3] > 128) { total += luma[j]; count++; }
    const detail = count ? Math.max(-0.07, Math.min(0.07, (lum - total / count) * 0.48)) : 0;
    const value = Math.pow(lum, 0.79) * 0.98 + detail;
    // Retain hull markings and faction hues; cool reflected light lifts dark metal.
    for (let c = 0; c < 3; c++) {
      const chroma = input[p + c] / 255 - lum;
      const bounce = (1 - lum) * [0.006, 0.016, 0.027][c];
      output[p + c] = Math.max(0, Math.min(255, (value + chroma * 0.77 + bounce) * 255));
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
  if (String(image.src || texture.source.label || '').includes('/art/astra/')) return texture;
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
