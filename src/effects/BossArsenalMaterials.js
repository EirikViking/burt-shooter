import { Texture } from 'pixi.js';

const cache = new Map();
const hex = color => `#${(color >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
const contours = {
  blade: [[-15,-100],[8,-108],[32,-45],[22,57],[0,112],[-24,45],[-29,-48]],
  hammer: [[-39,-85],[34,-85],[47,-52],[42,81],[24,100],[-38,91],[-48,52]],
  prism: [[0,-112],[43,-36],[31,69],[0,113],[-34,64],[-44,-32]],
  rail: [[-23,-116],[23,-116],[29,-82],[22,105],[8,120],[-8,120],[-22,105],[-29,-82]],
  scythe: [[-36,-95],[-5,-115],[30,-73],[46,-14],[30,54],[-15,112],[2,28],[-8,-38]],
  bay: [[-42,-85],[34,-85],[44,-65],[44,84],[-44,84],[-44,-65]]
};
function polygon(c, points) { c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); }

// Original machined armor sprites: offline-style shaded drawing baked once,
// not hundreds of Graphics primitives rebuilt on every frame. No random calls.
export function getArsenalModule(kind, color) {
  const key = `module:${kind}:${color}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width=256;canvas.height=512;
  const c=canvas.getContext('2d');c.translate(128,256);c.scale(2,2);
  const shape=contours[kind] || contours.rail, ink=hex(color);
  polygon(c,shape);c.fillStyle='#080f19';c.shadowColor='#000c';c.shadowBlur=8;c.fill();c.shadowBlur=0;
  c.lineWidth=3;c.strokeStyle='#adc0c9';c.stroke();
  const metal=c.createLinearGradient(-40,-45,40,35);metal.addColorStop(0,'#182535');metal.addColorStop(.32,'#607789');metal.addColorStop(.43,'#273d51');metal.addColorStop(.78,'#12212c');metal.addColorStop(1,'#8499a4');
  c.save();c.clip();c.fillStyle=metal;c.fillRect(-60,-125,120,250);
  c.fillStyle='#09121d';c.fillRect(-15,-73,30,145);
  for(let j=0;j<15;j++) { const y=-65+j*9;c.fillStyle=j%3===0?'#b19260':'#6d8591';c.fillRect(-13,y,26,2);c.fillStyle='#101821';c.fillRect(-13,y+2,26,4); }
  // Side armor facets and inset illumination rails.
  for(const side of [-1,1]) {
    polygon(c,[[side*17,-82],[side*31,-69],[side*29,52],[side*20,78]]);c.fillStyle=side<0?'#8ba1ae':'#294355';c.fill();
    c.strokeStyle='#d9e6e7';c.lineWidth=.7;c.stroke();
    c.fillStyle=ink;c.fillRect(side*24-1,-53,2,62);
    c.strokeStyle='#c5a771';c.lineWidth=1.5;c.beginPath();c.moveTo(side*35,-54);c.lineTo(side*35,34);c.lineTo(side*23,58);c.stroke();
    for(let j=0;j<4;j++){c.fillStyle='#09101a';c.beginPath();c.arc(side*29,-61+j*37,2.8,0,Math.PI*2);c.fill();c.fillStyle='#b9c3c7';c.fillRect(side*29-1,-62+j*37,2,1);}
  }
  if(kind==='prism') {
    polygon(c,[[0,-99],[24,-28],[0,82],[-22,-28]]);const crystal=c.createLinearGradient(-25,0,25,0);crystal.addColorStop(0,'#172434');crystal.addColorStop(.48,ink);crystal.addColorStop(.51,'#efffff');crystal.addColorStop(.55,ink);crystal.addColorStop(1,'#092038');c.fillStyle=crystal;c.fill();c.strokeStyle='#bff9ff';c.lineWidth=1;c.stroke();
  } else if(kind==='bay') {
    c.fillStyle='#030a13';c.fillRect(-30,-65,60,128);
    for(let j=0;j<4;j++)for(const side of [-1,1]){c.fillStyle='#82929d';polygon(c,[[side*14-5,-52+j*29],[side*14+5,-52+j*29],[side*14+5,-32+j*29],[side*14,-24+j*29],[side*14-5,-32+j*29]]);c.fill();c.fillStyle=ink;c.fillRect(side*14-2,-47+j*29,4,5);}
  }
  c.restore();
  const texture=Texture.from(canvas);texture.label=key;cache.set(key,texture);return texture;
}

export function getArsenalProjectile(material,color) {
  const key=`munition:${material}:${color}`;if(cache.has(key))return cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d');c.translate(64,64);const ink=hex(color);
  const halo=c.createRadialGradient(0,0,4,0,0,33);halo.addColorStop(0,ink+'b0');halo.addColorStop(1,ink+'00');c.fillStyle=halo;c.fillRect(-40,-40,80,80);
  // Every family keeps its opaque impact core centered at (0,0), radius 16.
  c.beginPath();
  if(material==='rail') {c.moveTo(28,0);c.lineTo(8,-12);c.lineTo(-20,-8);c.lineTo(-12,0);c.lineTo(-20,8);c.lineTo(8,12);c.closePath();}
  else if(material==='crystal'){polygon(c,[[24,0],[3,-18],[-22,-9],[-13,0],[-22,9],[3,18]]);}
  else if(material==='missile'){polygon(c,[[23,0],[10,-10],[-13,-10],[-21,-19],[-20,19],[-13,10],[10,10]]);}
  else {for(let j=0;j<24;j++){const a=j*Math.PI/12,r=16+(material==='magma'?Math.sin(j*2.1)*3:Math.sin(j*.8)*2);if(j)c.lineTo(Math.cos(a)*r,Math.sin(a)*r);else c.moveTo(r,0);}c.closePath();}
  c.fillStyle='#080d19';c.lineWidth=7;c.strokeStyle='#050a12';c.stroke();c.fill();
  const hot=c.createLinearGradient(-20,-12,18,12);hot.addColorStop(0,ink);hot.addColorStop(.48,'#ffffff');hot.addColorStop(.62,ink);hot.addColorStop(1,'#472142');c.fillStyle=hot;c.fill();c.lineWidth=2;c.strokeStyle=ink;c.stroke();
  c.beginPath();c.arc(0,0,7,0,Math.PI*2);c.fillStyle='#fffaf0';c.fill();
  c.lineWidth=1.3;c.strokeStyle='#102534';for(let j=0;j<3;j++){c.beginPath();c.moveTo(-9+j*7,-10);c.lineTo(-5+j*7,10);c.stroke();}
  const texture=Texture.from(canvas);texture.label=key;cache.set(key,texture);return texture;
}

export function getArsenalFieldTexture(material,frame=0) {
  const key=`field:${material}:${frame}`;if(cache.has(key))return cache.get(key);
  const size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d'),data=c.createImageData(size,size);
  const shift=frame*Math.PI*.5;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x-128)/122,dy=(y-128)/122,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    const twist=material==='vortex'?r*13:material==='crystal'?Math.sin(a*6)*2:r*3;
    const noise=Math.sin(a*17+twist+shift)*.45+Math.sin(a*31-r*24-shift)*.24+Math.sin(a*61+r*57+shift)*.14;
    const front=.74+noise*.15,thickness=material==='magma'?.18:.095;
    const body=Math.exp(-(((r-front)/thickness)**2));
    const filament=Math.exp(-(((r-front-.025)/.016)**2));
    const grain=.58+.42*Math.sin(a*89+r*113+noise*5)**2;
    const window=Math.max(0,Math.min(1,(r-.47)*12,(1-r)*12));
    const alpha=(body*.48+filament*.7)*window*grain;
    const i=(y*size+x)*4,hot=Math.min(1,filament+body*.35);
    data.data[i]=255;data.data[i+1]=Math.round(130+hot*125);data.data[i+2]=Math.round(55+hot*200);data.data[i+3]=Math.round(Math.min(1,alpha)*255);
  }
  c.putImageData(data,0,0);const texture=Texture.from(canvas);texture.label=key;cache.set(key,texture);return texture;
}
