import {Texture} from 'pixi.js';

// Two shared tiny rasters, admitted once before combat. No filters, timers,
// per-hit texture creation, gameplay randomness or collision surfaces.
const cache=new Map();
export function combatFinishTexture(kind='halo'){
 const key=kind==='shock'?'shock':'halo';if(cache.has(key))return cache.get(key);
 if(typeof document==='undefined')return Texture.EMPTY;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const c=canvas.getContext('2d');c.translate(64,64);
 if(key==='halo'){
  const g=c.createRadialGradient(0,0,2,0,0,60);g.addColorStop(0,'#ffffffb0');g.addColorStop(.24,'#ffffff70');g.addColorStop(.6,'#ffffff18');g.addColorStop(1,'#ffffff00');
  c.fillStyle=g;c.fillRect(-64,-64,128,128);
 }else{
  const g=c.createRadialGradient(0,0,37,0,0,57);g.addColorStop(0,'#ffffff00');g.addColorStop(.5,'#ffffff10');g.addColorStop(.78,'#ffffffba');g.addColorStop(.9,'#ffffff42');g.addColorStop(1,'#ffffff00');
  c.fillStyle=g;c.beginPath();c.arc(0,0,59,0,Math.PI*2);c.fill();
  c.beginPath();c.arc(0,0,45,-2.7,-.25);c.lineWidth=1.5;c.strokeStyle='#ffffffbb';c.stroke();
 }
 const texture=Texture.from(canvas);texture.label=`combat_finish_${key}`;cache.set(key,texture);return texture;
}
