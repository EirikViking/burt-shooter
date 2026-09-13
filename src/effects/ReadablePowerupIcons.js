import * as PIXI from 'pixi.js';
const colors={void_crown:'#d790ff',stasis_net:'#73eedf',chrono_anchor:'#ffcb72'};
const cache=new Map();
export function readablePowerupTexture(id,original){
 if(!colors[id]||typeof document==='undefined')return original;
 if(cache.has(id))return cache.get(id);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
 const color=colors[id],gradient=c.createRadialGradient(54,43,6,64,64,61);gradient.addColorStop(0,'#26354c');gradient.addColorStop(1,'#030a15');
 c.beginPath();c.moveTo(28,8);c.lineTo(100,8);c.lineTo(120,28);c.lineTo(120,100);c.lineTo(100,120);c.lineTo(28,120);c.lineTo(8,100);c.lineTo(8,28);c.closePath();c.fillStyle=gradient;c.fill();c.strokeStyle=color;c.lineWidth=5;c.stroke();
 c.strokeStyle='#f5fbff';c.fillStyle=color;c.lineWidth=8;c.lineCap='round';c.lineJoin='round';
 if(id==='void_crown'){c.beginPath();c.moveTo(29,49);c.lineTo(43,65);c.lineTo(64,33);c.lineTo(85,65);c.lineTo(99,49);c.lineTo(90,88);c.lineTo(38,88);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(42,99);c.lineTo(86,99);c.stroke();}
 if(id==='stasis_net'){c.lineWidth=6;for(let i=0;i<3;i++){const x=38+i*26;c.beginPath();c.moveTo(x,30);c.lineTo(x,98);c.stroke();c.beginPath();c.moveTo(30,x);c.lineTo(98,x);c.stroke();}c.fillStyle=color;for(const x of [32,96])for(const y of [32,96]){c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.fill();}}
 if(id==='chrono_anchor'){c.beginPath();c.arc(64,32,12,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(64,45);c.lineTo(64,99);c.moveTo(42,56);c.lineTo(86,56);c.moveTo(32,77);c.quadraticCurveTo(64,119,96,77);c.stroke();c.beginPath();c.moveTo(25,81);c.lineTo(31,65);c.lineTo(43,79);c.moveTo(85,79);c.lineTo(97,65);c.lineTo(103,81);c.stroke();}
 const texture=PIXI.Texture.from(canvas);texture.source.label=`readable-powerup:${id}`;cache.set(id,texture);return texture;
}
