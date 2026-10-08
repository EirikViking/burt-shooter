import * as PIXI from 'pixi.js';

let plumeTexture;
export function createEnginePlumePixels(width = 64, height = 192) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    const radius = width * (0.17 + Math.sin(t * Math.PI) * 0.045) * Math.pow(1 - t, 0.65);
    const shock = Math.pow(Math.max(0, Math.cos((t - 0.1) * Math.PI * 11)), 12) * Math.exp(-t * 3);
    for (let x = 0; x < width; x++) {
      const r = Math.abs(x + 0.5 - width / 2) / Math.max(0.01, radius);
      const core = Math.exp(-r * r * 9) * Math.exp(-t * 3.4);
      const envelope = Math.exp(-r * r * 2.2) * Math.pow(1 - t, 1.2);
      const filaments = 0.88 + 0.12 * Math.sin(x * 1.4 + t * 55) * Math.sin(t * 23 - x * 0.6);
      const hot = Math.min(1, core * 1.5 + shock * Math.exp(-r * r * 5) * 0.65);
      const p = (y * width + x) * 4;
      pixels[p] = 24 + hot * 231;
      pixels[p + 1] = 139 + hot * 116;
      pixels[p + 2] = 255;
      pixels[p + 3] = Math.min(255, (envelope * 0.7 * filaments + core * 0.6 + shock * envelope * 0.35) * 255);
    }
  }
  return pixels;
}
// One tiny shared raster, generated once. Animation only changes sprite transforms;
// it never advances a timer, changes thrust, or calls gameplay randomness.
export function createAstraEnginePlume() {
  if (!plumeTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 192;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(canvas.width, canvas.height);
    image.data.set(createEnginePlumePixels(canvas.width, canvas.height));
    ctx.putImageData(image, 0, 0);
    plumeTexture = PIXI.Texture.from(canvas);
  }
  const sprite = new PIXI.Sprite(plumeTexture);
  sprite.anchor.set(0.5, 0);
  sprite.blendMode = 'add';
  return sprite;
}
