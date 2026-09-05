import * as PIXI from 'pixi.js';

// Original, cached optical materials. Thirty-two sprites per boss event;
// no filters, per-frame geometry, random numbers or gameplay callbacks.
let materials;
function texture(size, paint) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  paint(canvas.getContext('2d'), size);
  return PIXI.Texture.from(canvas);
}
export function getReactorMaterials() {
  if (materials) return materials;
  const core = texture(128, (c, n) => {
    const g = c.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);
    for (const [p, color] of [[0,'#ffffff'],[.09,'#fffbe8'],[.19,'#ffde83'],[.38,'#ff8a2544'],[1,'#ff441100']]) g.addColorStop(p,color);
    c.fillStyle = g; c.fillRect(0,0,n,n);
  });
  const wave = texture(512, (c, n) => {
    const data = c.createImageData(n,n);
    for (let y=0;y<n;y++) for(let x=0;x<n;x++) {
      const dx=x-n/2,dy=y-n/2,r=Math.hypot(dx,dy)/(n*.46),a=Math.atan2(dy,dx);
      const ridge = 1 + Math.sin(a*19)*.005 + Math.sin(a*47)*.003;
      const edge = Math.exp(-Math.pow((r-ridge)/.008,2));
      const wake = Math.exp(-Math.pow((r-.968)/.028,2))*.22;
      const filament = .72+.28*Math.sin(a*61+r*140);
      const i=(y*n+x)*4;
      data.data[i]=153;data.data[i+1]=216;data.data[i+2]=255;
      data.data[i+3]=Math.min(255,(edge+wake)*filament*255);
    }
    c.putImageData(data,0,0);
  });
  const jet = texture(256, (c, n) => {
    // A tapered, broken plasma plume with filament structure, pointing right.
    const data=c.createImageData(n,n);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
      const t=x/n, center=n*.5+Math.sin(t*14)*2*t;
      const width=2+Math.sin(t*Math.PI)**.7*21;
      const d=Math.abs(y-center)/width;
      const filaments=.6+.4*Math.sin(t*95+d*11)*Math.sin(t*31-d*23);
      const alpha=Math.exp(-d*d*3)*Math.sin(t*Math.PI)**.7*filaments;
      const i=(y*n+x)*4;data.data[i]=255;data.data[i+1]=Math.round(220-t*105);data.data[i+2]=Math.round(160-t*130);data.data[i+3]=Math.round(alpha*255);
    }c.putImageData(data,0,0);
  });
  materials={core,wave,jet};return materials;
}

export class AstraReactorRupture extends PIXI.Container {
  constructor() {
    super();this.eventMode='none';
    const m=getReactorMaterials();
    const sprite=(tex)=>{const s=new PIXI.Sprite(tex);s.anchor.set(.5);s.blendMode='add';this.addChild(s);return s;};
    this.wave=sprite(m.wave);this.echo=sprite(m.wave);
    this.jets=Array.from({length:6},()=>sprite(m.jet));
    this.sparks=Array.from({length:20},()=>sprite(m.core));
    this.core=sprite(m.core);this.flare=sprite(m.core);
  }
  draw(age, pixels, reduced, flash) {
    const t=age/60;
    this.visible=!reduced && flash>.05;
    if(!this.visible)return;
    const scale=pixels/560;
    const pressure=Math.max(0,t-.09);
    const radius=(26+290*(1-Math.exp(-pressure*4.3)))*scale;
    this.wave.width=radius*2;this.wave.height=radius*.96;
    this.wave.alpha=Math.max(0,1-pressure/1.15)**2*.72*flash;
    this.echo.width=radius*1.54;this.echo.height=radius*.74;
    this.echo.alpha=Math.max(0,1-pressure/.55)**2*.17*flash;
    const ignition=Math.exp(-Math.pow((t-.13)/.12,2));
    this.core.width=this.core.height=(92+ignition*110)*scale;
    this.core.alpha=ignition*.95*flash;
    this.flare.width=(170+ignition*390)*scale;this.flare.height=9*scale;
    this.flare.alpha=ignition*.85*flash;
    for(let i=0;i<this.jets.length;i++) {
      const s=this.jets[i],a=i*2.399963+.25,delay=.07+(i%3)*.027;
      const q=Math.max(0,t-delay),life=Math.max(0,1-q/.78);
      const length=(40+145*(1-Math.exp(-q*8)))*(i%2?.75:1)*scale;
      const distance=(22+q*62)*scale;
      s.position.set(Math.cos(a)*(distance+length*.45),Math.sin(a)*(distance+length*.45));
      s.rotation=a;s.width=length;s.height=(46-q*25)*scale;
      s.alpha=t<delay?0:Math.min(1,q*25)*life*life*.72*flash;
    }
    for(let i=0;i<this.sparks.length;i++) {
      const s=this.sparks[i],a=i*2.399963+.4;
      const distance=(22+(110+i%7*17)*(1-Math.exp(-t*2.5)))*scale;
      s.position.set(Math.cos(a)*distance,Math.sin(a)*distance*.8+t*t*8*scale);
      s.rotation=a;s.width=(8+(i%3)*4)*(1-t*.24)*scale;s.height=3.8*scale;
      s.alpha=Math.max(0,1-t/(1.2+i%5*.19))**1.4*flash;
    }
  }
}
