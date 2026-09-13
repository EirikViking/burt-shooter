import {Assets, Matrix, Texture} from 'pixi.js';
import {getFlashIntensityScale, getReducedMotionEnabled} from '../config/AccessibilitySettings.js';

let materials, loading;
export function preloadEnergyMaterials() {
  return loading ||= Promise.all(['membrane','rift','pressure','corona'].map(name=>Assets.load(`/art/menu-energy/${name}.webp`)))
    .then(values=>{
      for(const texture of values){texture.source.autoGenerateMipmaps=true;texture.source.scaleMode='linear';texture.source.updateMipmaps();}
      materials=Object.fromEntries(['membrane','rift','pressure','corona'].map((name,i)=>[name,values[i]]));return materials;
    })
    .catch(()=>{loading=null;return null;});
}
export function energyTexture(kind) { return materials?.[kind] || Texture.EMPTY; }
export function energyClock(ms=Date.now()) {return getReducedMotionEnabled()?0:ms*.001;}
export function drawEnergyShell(g,x,y,radius,{color=0xffffff,alpha=.5,width=2}={}) {
  drawEnergySurface(g,{kind:radius<16?'corona':'pressure',x,y,width:radius*2,height:radius*2,color,alpha});
}

// Authored plasma is mapped into attack-owned geometry. These helpers have no
// timers, particles, random calls, collisions or resources owned by an entity.
// Normal alpha blending preserves small hostile projectiles through the field.
export function drawEnergySurface(g,{kind='membrane',x=0,y=0,width=80,height=width,angle=0,color=0xffffff,alpha=.5}) {
  const tex=energyTexture(kind);if(tex===Texture.EMPTY||width<=0||height<=0)return;
  const c=Math.cos(angle),s=Math.sin(angle),points=[];
  for(const [u,v]of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]])points.push(x+c*u*width-s*v*height,y+s*u*width+c*v*height);
  const matrix=new Matrix(c*width/tex.width,s*width/tex.width,-s*height/tex.height,c*height/tex.height,points[0],points[1]);
  const flash=getFlashIntensityScale(),exposure=kind==='membrane'?.25+.75*flash:flash;
  g.poly(points).fill({texture:tex,matrix,textureSpace:'global',color,alpha:Math.min(.72,alpha)*exposure});
}
export function drawEnergyLink(g,{x=0,y=0,toX,toY,width=20,color,alpha=.5}) {
  const dx=toX-x,dy=toY-y;
  drawEnergySurface(g,{kind:'rift',x:(x+toX)*.5,y:(y+toY)*.5,width,height:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)-Math.PI/2,color,alpha});
}
export function drawEnergyArc(g,{x=0,y=0,radius,start=0,end=Math.PI*2,thickness=radius*.24,color=0xffffff,alpha=.5}) {
  const tex=energyTexture('pressure');if(tex===Texture.EMPTY||radius<=0||end<=start)return;
  const points=[],steps=Math.max(4,Math.ceil((end-start)*12)),inner=Math.max(0,radius-thickness);
  for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps;points.push(x+Math.cos(a)*radius,y+Math.sin(a)*radius);}
  for(let i=steps;i>=0;i--){const a=start+(end-start)*i/steps;points.push(x+Math.cos(a)*inner,y+Math.sin(a)*inner);}
  const matrix=new Matrix(radius*2/tex.width,0,0,radius*2/tex.height,x-radius,y-radius);
  g.poly(points).fill({texture:tex,matrix,textureSpace:'global',color,alpha:Math.min(.7,alpha)*getFlashIntensityScale()});
}
