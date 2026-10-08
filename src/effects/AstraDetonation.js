import * as PIXI from 'pixi.js';
import { getReducedMotionEnabled, getFlashIntensityScale } from '../config/AccessibilitySettings.js';
import { AstraReactorRupture, getReactorMaterials } from './AstraReactorRupture.js';
import { sampleExplosionLobe, selectExplosionAnimation } from './ExplosionChoreography.js';

let smokeTexture;
function getSmokeTexture() {
  if(smokeTexture)return smokeTexture;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d');
  for(let i=0;i<13;i++){
    const a=i*2.399963,r=i===0?0:16+(i%4)*5,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;
    const g=c.createRadialGradient(x-5,y-8,2,x,y,30);
    g.addColorStop(0,'#465269aa');g.addColorStop(.35,'#242d3f99');g.addColorStop(1,'#090e1800');
    c.fillStyle=g;c.fillRect(0,0,128,128);
  }
  return smokeTexture=PIXI.Texture.from(canvas);
}

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
    this.destroyed = false;
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
    if (this.destroyed) return false;
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
    // Prefer the prewarmed reactor carrier; ordinary kills never need one.
    const carrier = boss ? this.pool.findIndex(c=>c.reactor) : this.pool.findIndex(c=>!c.reactor);
    const display = carrier >= 0 ? this.pool.splice(carrier,1)[0] : this.pool.pop() || this.createDisplay();
    if (boss && !display.reactor) { display.reactor = new AstraReactorRupture(); display.addChild(display.reactor); }
    const id = ++this.sequence;
    const choreography=selectExplosionAnimation(id-1);
    const pixels = boss ? 560 : 106 + Math.sqrt(Math.max(.2, intensity)) * 39;
    display.position.set(x, y);display.visible = true;display.alpha = 1;
    display.flames.rotation = (id * 2.399963) % (Math.PI * 2);
    display.flames.scale.set(pixels / frameSize);
    const entry = { display, x, y, boss, choreography, age: 0, lifetime: boss ? choreography.bossDuration : choreography.duration, pixels, reduced, flash: getFlashIntensityScale() };
    this.active.push(entry);if(boss)this.lastBoss = entry;
    this.draw(entry);return true;
  }
  createDisplay(boss = false) {
    const c = new PIXI.Container();c.eventMode = 'none';c.visible = false;
    c.front = new PIXI.Graphics();c.front.blendMode = 'add';
    if(boss)c.reactor = new AstraReactorRupture();
    c.flames = new PIXI.Container();
    c.a = new PIXI.Sprite();c.b = new PIXI.Sprite();c.a.anchor.set(.5);c.b.anchor.set(.5);
    const m=getReactorMaterials();
    c.smoke=Array.from({length:4},()=>{const s=new PIXI.Sprite(getSmokeTexture());s.anchor.set(.5);c.addChild(s);return s;});
    c.lobes=Array.from({length:16},()=>{
      const l=new PIXI.Container();l.a=new PIXI.Sprite();l.b=new PIXI.Sprite();l.a.anchor.set(.5);l.b.anchor.set(.5);
      l.addChild(l.a,l.b);c.addChild(l);return l;
    });
    c.embers=Array.from({length:12},()=>{const s=new PIXI.Sprite(m.jet);s.anchor.set(.5);s.blendMode='add';c.addChild(s);return s;});
    c.flames.addChild(c.a, c.b);c.addChild(c.flames, c.front);if(c.reactor)c.addChild(c.reactor);
    c.sample={};this.container.addChild(c);return c;
  }
  async prepare(renderer) {
    if (this.destroyed) return;
    const frames = await loadDetonationFrames();
    if (this.destroyed) return;
    while(this.pool.length+this.active.length<this.maxActive)this.pool.push(this.createDisplay());
    if (!renderer?.prepare?.upload) return;
    // Upload the shared atlas and small optics while the launch is preparing,
    // rather than making the first kill pay for their GPU allocation.
    for (const texture of [frames[0], getSmokeTexture(), ...Object.values(getReactorMaterials())]) {
      if (this.destroyed) return;
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
    c.flames.scale.set(e.pixels / frameSize * (e.boss ? .27 + t * .24 : .48));
    c.a.alpha = (1 - mix) * fade;c.b.alpha = mix * fade;
    c.front.clear();
    const count=e.boss?16:8, calm=e.reduced?.23:1;
    for(let k=0;k<c.lobes.length;k++){
      const l=c.lobes[k];l.visible=k<count;
      if(!l.visible)continue;
      const p=sampleExplosionLobe(e.choreography,k,t,c.sample);
      l.position.set(p.x*e.pixels*calm,p.y*e.pixels*calm);
      l.rotation=e.reduced?0:p.rotation;
      l.scale.set(e.pixels*p.size/frameSize*(e.reduced?.7:1));
      const f=Math.min(last, (e.reduced||e.flash<.2 ? .6+p.frame*.4 : p.frame)*last);
      const n=Math.min(last-1,Math.floor(f)),b=f-n;
      l.a.texture=frameTextures[n];l.b.texture=frameTextures[n+1];
      const opacity=p.alpha*(e.boss?.92:.85)*(e.flash<.2?.55:1);
      l.a.alpha=(1-b)*opacity;l.b.alpha=b*opacity;
    }
    for(let k=0;k<c.smoke.length;k++){
      const s=c.smoke[k],a=k*2.399963+e.choreography.shape*.3;
      const r=e.pixels*(.08+t*.16)*calm;
      s.position.set(Math.cos(a)*r,Math.sin(a)*r*.65-t*t*e.pixels*.07*calm);
      s.width=s.height=e.pixels*(.22+t*.32)*(e.boss?1:.7);
      s.alpha=Math.sin(t*Math.PI)**.8*(e.boss?.56:.3);s.rotation=e.reduced?0:a+t*.2;
    }
    for(let k=0;k<c.embers.length;k++){
      const s=c.embers[k],a=k*2.399963+e.choreography.shape*.3;
      const r=e.pixels*(.08+(1-Math.exp(-t*3))*(.26+(k%3)*.06))*calm;
      s.position.set(Math.cos(a)*r,Math.sin(a)*r*.8+t*t*e.pixels*.11*calm);
      s.rotation=a;s.width=e.pixels*(.04+(k%3)*.012)*(1-t*.6);s.height=e.pixels*.012;
      s.alpha=e.reduced?0:(1-t)**1.5*Math.min(1,t*16)*.78*e.flash;
    }
    if(c.reactor) {
      c.reactor.visible = e.boss;
      if(e.boss)c.reactor.draw(e.age,e.pixels,e.reduced,e.flash);
    }
  }

  retire(e) { e.display.visible = false;this.pool.push(e.display); }
  update(delta) {
    if (this.destroyed) return;
    let write = 0;
    const reduced=getReducedMotionEnabled(),flash=getFlashIntensityScale();
    for (const e of this.active) {
      e.reduced=reduced;e.flash=flash;
      e.age += delta;
      if (e.age >= e.lifetime) { this.retire(e);continue; }
      this.draw(e);this.active[write++] = e;
    }
    this.active.length = write;
  }
  clear() { for(const e of this.active)this.retire(e);this.active.length=0;this.lastBoss=null; }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const display of [...this.pool, ...this.active.map(e => e.display)]) display.destroy({children:true});
    this.active.length = this.pool.length = 0;
    this.lastBoss = null;
  }
}
