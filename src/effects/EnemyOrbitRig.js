import * as PIXI from 'pixi.js';
import { getReducedMotionEnabled } from '../config/AccessibilitySettings.js';

export const ORBIT_FAMILIES = ['gyroscope', 'razor_crown', 'double_helix', 'eclipse', 'crystal_carousel', 'reactor_turbine'];
let materialLoad;
export function preloadEnemyOrbitMaterial() {
  return materialLoad ||= PIXI.Assets.load('/art/core-serpent/orbit-ring-imagegen.png').then(texture => {
    texture.source.autoGenerateMipmaps = true; texture.source.scaleMode = 'linear'; texture.source.updateMipmaps();
    return texture;
  });
}

// Build once. Animation changes transforms, never rebuilds paths or uses RNG.
export class EnemyOrbitRig extends PIXI.Container {
  constructor(enemy) {
    super();
    const seed = [...String(enemy.type)].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0)|0,0) >>> 0;
    this.familyIndex = seed % ORBIT_FAMILIES.length;
    this.family = ORBIT_FAMILIES[this.familyIndex];
    this.label = `enemyOrbit:${this.family}`;
    this.phase = 0;
    this.radius = Math.min(53, Math.max(27, enemy.radius * 1.65));
    this.accent = enemy.visualVariant?.accent || 0x7edbff;
    this.rings = [];
    this.satellites = [];
    const count = this.familyIndex === 2 ? 2 : 3;
    for(let j=0;j<count;j++) {
      const g = new PIXI.Graphics();
      const radius = this.radius + j * 5;
      const blades = [3,5,6,2,4,8][this.familyIndex];
      for(let i=0;i<blades;i++) {
        const a = i * Math.PI*2/blades;
        const sweep = Math.PI*2/blades * [.62,.5,.25,.83,.3,.62][this.familyIndex];
        const r = radius;
        g.moveTo(Math.cos(a)*r,Math.sin(a)*r).arc(0,0,r,a,a+sweep)
          .stroke({color:0x09131d,width:6.5,alpha:.94});
        g.moveTo(Math.cos(a)*r,Math.sin(a)*r).arc(0,0,r,a,a+sweep)
          .stroke({color:j%2?0x9bbacb:0x426079,width:3.8,alpha:.92});
        g.moveTo(Math.cos(a)*r,Math.sin(a)*r).arc(0,0,r,a,a+sweep*.7)
          .stroke({color:this.accent,width:1.7,alpha:.92});
        const x=Math.cos(a+sweep)*r,y=Math.sin(a+sweep)*r;
        const tip=this.familyIndex===1?12:this.familyIndex===4?9:5;
        g.poly([x,y,x+Math.cos(a)*tip,y+Math.sin(a)*tip,x-Math.sin(a)*4,y+Math.cos(a)*4])
          .fill({color:j%2?0xc2dce4:this.accent,alpha:.92});
        g.circle(x,y,2.4).fill({color:0xffffff,alpha:.92});
      }
      this.rings.push(g);this.addChild(g);
    }
    preloadEnemyOrbitMaterial().then(texture => {
      if(this.destroyed)return;
      for(let i=0;i<this.rings.length;i++) {
        const ring = this.rings[i];
        const armor = new PIXI.Sprite(texture);armor.anchor.set(.5);
        armor.width=armor.height=(this.radius+i*5)*2.9;
        armor.tint=[0xd6f3ff,0xffd3ac,0xc9b7ff,0xffd98c,0xceffbe,0xaaffee][this.familyIndex];
        ring.addChildAt(armor,0);
        // Existing arcs become tight internal energy tracks, framed by armor.
      }
    });
    const satellites = [3,5,4,2,6,8][this.familyIndex];
    for(let i=0;i<satellites;i++) {
      const shard = new PIXI.Graphics();
      const long = this.familyIndex === 1 ? 15 : this.familyIndex === 4 ? 12 : 7;
      shard.poly([0,-long,5,0,0,long,-4,0]).fill({color:0x27465a,alpha:1})
        .stroke({color:this.accent,width:1.8,alpha:.95});
      shard.poly([0,-long,2,0,0,long,0,0]).fill({color:0xe7faff,alpha:.9});
      shard.circle(0,0,2.5).fill({color:0xffffff,alpha:1});
      this.addChild(shard);this.satellites.push(shard);
    }
    this._debugOrbit = { family:this.family, layers:count, cachedGeometry:true, decorative:true };
  }
  update(delta) {
    const reduced = getReducedMotionEnabled();
    if(!reduced)this.phase += Math.min(3,Math.max(0,delta)) * .017;
    this.rings.forEach((ring,i)=>{
      const sign=i%2?-1:1;
      ring.rotation = (reduced ? .7 : this.phase) * sign * (1+i*.19+this.familyIndex*.08) + i*.7;
      const tilt = reduced ? .68 : .25 + .72 * Math.abs(Math.cos(this.phase*(.35+this.familyIndex*.08)+i*1.1));
      ring.scale.set(1,tilt);
      ring.alpha = .6 + tilt*.3;
    });
    this.satellites.forEach((s,i)=>{
      const a=i*Math.PI*2/this.satellites.length + (reduced?.7:this.phase)*(this.familyIndex%2?-1.2:1.5);
      const r=this.radius*1.4 + (this.familyIndex===2?Math.sin(a*2)*9:0);
      s.position.set(Math.cos(a)*r,Math.sin(a)*r*(this.familyIndex===3?.45:.85));
      s.rotation=a+Math.PI/2;s.alpha=.65+.35*Math.abs(Math.sin(a));
    });
    this._debugOrbit.reducedMotion=reduced;
  }
}
