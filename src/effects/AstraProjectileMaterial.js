import {Texture} from 'pixi.js';

const textures=new Map();
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
 c.fillStyle='#120b23';c.fill();c.lineWidth=3;c.strokeStyle=hex;c.stroke();
 const core=c.createRadialGradient(4,-4,1,0,0,17);core.addColorStop(0,'#ffffff');core.addColorStop(.30,'#fff9df');core.addColorStop(.60,hex);core.addColorStop(1,hex+'60');
 c.fillStyle=core;c.fill();
 c.beginPath();c.ellipse(2,-2,shape==='lance'?10:7,shape==='lance'?4.5:7,-.2,0,Math.PI*2);c.fillStyle='#fffdec';c.fill();
 c.beginPath();c.arc(0,0,14,-2.7,-.7);c.lineWidth=1.6;c.strokeStyle='#ffffffc0';c.stroke();
 if(shape==='crescent'){c.beginPath();c.arc(-5,0,12,-1.2,1.2);c.strokeStyle=hex;c.lineWidth=4;c.stroke();}
 const texture=Texture.from(canvas);texture.label=`astra_projectile_${key}`;textures.set(key,texture);return texture;
}
