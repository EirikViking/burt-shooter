import * as PIXI from 'pixi.js';
import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';
import { AstraReactorRupture, getReactorMaterials } from './AstraReactorRupture.js';

let frameTextures = null;
let readyPromise = null;
let frameSize = 384;
export function loadDetonationFrames() {
  readyPromise ||= Promise.all([PIXI.Assets.load('/art/astra/detonation/combustion.webp'), PIXI.Assets.load('/art/astra/detonation/combustion.json')]).then(([atlas, data]) => {
    frameSize = data.size;
    frameTextures = Array.from({ length: data.count }, (_, i) => new PIXI.Texture({
      source: atlas.source, frame: new PIXI.Rectangle((i % data.columns) * frameSize, Math.floor(i / data.columns) * frameSize, frameSize, frameSize)
    }));
    return frameTextures;
  }).catch(error => { readyPromise = null; throw error; });
  return readyPromise;
}

// Render-only flipbook and pressure front. No RNG, gameplay clock, allocator,
// collision hooks or callbacks. Existing particle lifetimes remain independent.
export class AstraDetonation {
  constructor(container) {
    this.container = container;
    this.active = [];
    this.pool = [];
    this.sequence = 0;
    this.maxActive = 18;
    this.lastBoss = null;
    getReactorMaterials();
    this.pool.push(this.createDisplay(true));
    loadDetonationFrames().catch(() => {});
  }
  emit(x, y, intensity = 1, boss = false) {
    if (!frameTextures) return false;
    if (this.lastBoss && this.lastBoss.age < 84 && Math.hypot(x - this.lastBoss.x, y - this.lastBoss.y) < 360) return true;
    if (boss) {
      // A boss callback also emits local ordinary bursts for its armor pieces.
      // Keep their legacy particles, but let one coherent reactor event own
      // this area instead of layering eight unrelated fireballs over the hull.
      this.active = this.active.filter(e => {
        if (!e.boss && e.age < 12 && Math.hypot(x-e.x,y-e.y)<250) { this.retire(e); return false; }
        return true;
      });
    }
    if (this.active.length >= this.maxActive) {
      const oldest = this.active.findIndex(e => !e.boss);
      if (oldest < 0) return true;
      this.retire(this.active.splice(oldest, 1)[0]);
    }
    const reduced = getReducedMotionEnabled();
    const display = this.pool.pop() || this.createDisplay();
    if (boss && !display.reactor) { display.reactor = new AstraReactorRupture(); display.addChild(display.reactor); }
    const id = ++this.sequence;
    const pixels = boss ? 560 : 106 + Math.sqrt(Math.max(.2, intensity)) * 39;
    display.position.set(x, y);display.visible = true;display.alpha = 1;
    display.flames.rotation = (id * 2.399963) % (Math.PI * 2);
    display.flames.scale.set(pixels / frameSize);
    const entry = { display, x, y, boss, age: 0, lifetime: boss ? 96 : 32 + Math.min(12, intensity * 5), pixels, reduced, flash: getFlashIntensityScale() };
    this.active.push(entry);if(boss)this.lastBoss = entry;
    this.draw(entry);return true;
  }
  createDisplay(boss = false) {
    const c = new PIXI.Container();c.eventMode = 'none';
    c.front = new PIXI.Graphics();c.front.blendMode = 'add';
    if(boss)c.reactor = new AstraReactorRupture();
    c.flames = new PIXI.Container();
    c.a = new PIXI.Sprite();c.b = new PIXI.Sprite();c.a.anchor.set(.5);c.b.anchor.set(.5);
    c.flames.addChild(c.a, c.b);c.addChild(c.flames, c.front);if(c.reactor)c.addChild(c.reactor);this.container.addChild(c);return c;
  }
  async prepare(renderer) {
    const frames = await loadDetonationFrames();
    if (!renderer?.prepare?.upload) return;
    // Upload the shared atlas and small optics while the launch is preparing,
    // rather than making the first kill pay for their GPU allocation.
    for (const texture of [frames[0], ...Object.values(getReactorMaterials())]) {
      await renderer.prepare.upload(texture);
    }
  }
  draw(e) {
    const t = Math.min(1, e.age / e.lifetime), c = e.display;
    const last = frameTextures.length - 1;
    const frame = e.boss ? last * (.38 + t * .62) : e.reduced || e.flash < .2 ? last * (.58 + t * .42) : t * last;
    const i = Math.min(last - 1, Math.floor(frame)), mix = frame - i;
    c.a.texture = frameTextures[i];c.b.texture = frameTextures[i + 1];
    const fade = Math.pow(1 - t, .5) * (e.boss ? .55 * Math.min(1,t*8) : .9);
    c.flames.scale.set(e.pixels / frameSize * (e.boss ? .32 + t * .3 : 1));
    c.a.alpha = (1 - mix) * fade;c.b.alpha = mix * fade;
    c.front.clear();
    if(c.reactor) {
      c.reactor.visible = e.boss;
      if(e.boss)c.reactor.draw(e.age,e.pixels,e.reduced,e.flash);
    }
  }

  retire(e) { e.display.visible = false;this.pool.push(e.display); }
  update(delta) {
    let write = 0;
    for (const e of this.active) {
      e.age += delta;
      if (e.age >= e.lifetime) { this.retire(e);continue; }
      this.draw(e);this.active[write++] = e;
    }
    this.active.length = write;
  }
  clear() { for(const e of this.active)this.retire(e);this.active.length=0;this.lastBoss=null; }
}
