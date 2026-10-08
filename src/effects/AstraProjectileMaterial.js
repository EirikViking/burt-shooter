import {Texture} from 'pixi.js';

const textures=new Map();
const friendlyTextures=new Map();
let wakeTexture;

// Friendly fire is a painted plasma drop with a soft silhouette. It has no
// wire ring or keyline, and one cached texture serves every shot of a color.
export function getAstraFriendlyProjectileTexture(color=0x7dffcc){
 const key=Number(color)>>>0;if(friendlyTextures.has(key))return friendlyTextures.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const c=canvas.getContext('2d'),hex=`#${key.toString(16).padStart(6,'0').slice(-6)}`;
 c.translate(64,64);
 const halo=c.createRadialGradient(0,0,2,0,0,43);
 halo.addColorStop(0,'#ffffff90');halo.addColorStop(.22,hex+'72');
 halo.addColorStop(.62,hex+'1c');halo.addColorStop(1,hex+'00');
 c.fillStyle=halo;c.fillRect(-46,-46,92,92);
 for(const side of [-1,1]){
  c.beginPath();c.moveTo(-34,side*3);
  c.bezierCurveTo(-17,side*18,8,side*19,28,0);
  c.bezierCurveTo(9,side*8,-12,side*6,-34,side*3);
  const plume=c.createLinearGradient(-34,0,28,0);
  plume.addColorStop(0,hex+'00');plume.addColorStop(.36,hex+'70');
  plume.addColorStop(.72,hex+'cc');plume.addColorStop(1,'#ffffffdd');
  c.fillStyle=plume;c.fill();
 }
 const heart=c.createRadialGradient(8,-2,1,5,0,20);
 heart.addColorStop(0,'#ffffff');heart.addColorStop(.32,'#fff9da');
 heart.addColorStop(.7,hex+'e0');heart.addColorStop(1,hex+'00');
 c.beginPath();c.ellipse(5,0,27,12,0,0,Math.PI*2);c.fillStyle=heart;c.fill();
 const texture=Texture.from(canvas);texture.label=`astra_friendly_plasma_${key}`;
 friendlyTextures.set(key,texture);return texture;
}

// A shared soft volume for both friendly and hostile shot wakes. Its taper is
// baked into alpha, so dense volleys do not stack hundreds of graphic strokes.
export function getAstraProjectileWakeTexture(){
 if(typeof document==='undefined')return Texture.WHITE; // Headless simulation has no rendered material.
 if(wakeTexture)return wakeTexture;
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=48;
 const c=canvas.getContext('2d'),data=c.createImageData(128,48);
 for(let y=0;y<48;y++)for(let x=0;x<128;x++){
  const u=x/127,v=(y-23.5)/23.5;
  const width=.34+.46*u,side=Math.exp(-Math.pow(v/width,2)*3.2);
  const head=Math.sin(Math.PI*Math.pow(u,.72));
  const turbulence=.82+.18*Math.sin(u*29+v*8)*Math.sin(u*13-v*5);
  const i=(y*128+x)*4;
  data.data[i]=data.data[i+1]=data.data[i+2]=255;
  data.data[i+3]=Math.round(170*Math.max(0,head)*side*turbulence);
 }
 c.putImageData(data,0,0);
 wakeTexture=Texture.from(canvas);wakeTexture.label='astra_projectile_soft_wake';
 return wakeTexture;
}
// Small premultiplied sprite materials: a sharp collision core, colored rim
// and a restrained optical halo. The center is registered to the hit circle.
export function getAstraProjectileTexture(style='pulse',color=0xff6349){
 const shape=/needle|lance|spear|dart|shard|seed/.test(style)?'lance':/mine|star|saw|disc/.test(style)?'star':/crescent|spiral/.test(style)?'crescent':'orb';
 const key=`${shape}:${color}`;if(textures.has(key))return textures.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const c=canvas.getContext('2d'),hex=`#${(color>>>0).toString(16).padStart(6,'0').slice(-6)}`;
 c.translate(64,64);
 const halo=c.createRadialGradient(0,0,10,0,0,36);halo.addColorStop(0,hex+'95');halo.addColorStop(.45,hex+'32');halo.addColorStop(1,hex+'00');
 c.fillStyle=halo;c.fillRect(-40,-40,80,80);
 c.beginPath();
 if(shape==='lance'){c.moveTo(27,0);c.bezierCurveTo(12,-15,-15,-15,-22,0);c.bezierCurveTo(-15,15,12,15,27,0);}
 else if(shape==='star'){for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2?14:22;if(i)c.lineTo(Math.cos(a)*r,Math.sin(a)*r);else c.moveTo(r,0);}c.closePath();}
 else if(shape==='crescent'){c.ellipse(0,0,17,19,0,0,Math.PI*2);}
 else c.arc(0,0,18,0,Math.PI*2);
 c.fillStyle='#120b23';c.fill();
 // Opaque keyline survives both luminous clouds and empty space. It is baked
 // once into the shared material, with no extra runtime filter or draw layer.
 c.lineWidth=8;c.strokeStyle='#080b15';c.stroke();
 c.lineWidth=3;c.strokeStyle=hex;c.stroke();
 const core=c.createRadialGradient(4,-4,1,0,0,17);core.addColorStop(0,'#ffffff');core.addColorStop(.30,'#fff9df');core.addColorStop(.60,hex);core.addColorStop(1,hex+'60');
 c.fillStyle=core;c.fill();
 c.beginPath();c.ellipse(2,-2,shape==='lance'?10:7,shape==='lance'?4.5:7,-.2,0,Math.PI*2);c.fillStyle='#fffdec';c.fill();
 c.beginPath();c.arc(0,0,14,-2.7,-.7);c.lineWidth=1.6;c.strokeStyle='#ffffffc0';c.stroke();
 if(shape==='crescent'){c.beginPath();c.arc(-5,0,12,-1.2,1.2);c.strokeStyle=hex;c.lineWidth=4;c.stroke();}
 const texture=Texture.from(canvas);texture.label=`astra_projectile_${key}`;textures.set(key,texture);return texture;
}
