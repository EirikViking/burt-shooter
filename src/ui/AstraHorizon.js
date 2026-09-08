import {Assets,Container,Graphics,Sprite,Texture} from 'pixi.js';
let glowTexture;
function glow(){
 if(glowTexture)return glowTexture;
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);
 g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.12,'rgba(255,255,255,.5)');g.addColorStop(.42,'rgba(255,255,255,.09)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);glowTexture=Texture.from(c);return glowTexture;
}
// Menu-owned, bounded geometry. No timers, filters, gameplay RNG or input capture.
export class AstraHorizon extends Container {
 constructor(){
  super();this.label='astraHorizon';this.eventMode='none';this.interactiveChildren=false;this.clock=0;this.pan={x:0,y:0};
  this.sun=new Sprite(glow());this.sun.anchor.set(.5);this.sun.tint=0xffb45f;this.sun.blendMode='add';
  this.haze=new Sprite(glow());this.haze.anchor.set(.5);this.haze.tint=0x52bfff;this.haze.blendMode='add';
  this.sky=new Graphics();this.trails=new Graphics();this.floor=new Graphics();this.addChild(this.sun,this.haze,this.sky,this.trails,this.floor);
  this.ships=[];
  for(let i=0;i<3;i++){const s=new Sprite(Texture.EMPTY);s.anchor.set(.5);s.rotation=-.8;this.addChild(s);this.ships.push(s);Assets.load(`/art/astra/player/${['01','03','07'][i]}.png`).then(t=>{if(!this.destroyed)s.texture=t;}).catch(()=>{});}
 }
 update(delta,w,h,{reduced=false,home=true,modal=false,pointer=null}={}){
  const dt=Math.min(3,Math.max(0,delta))/60;if(!reduced&&!modal)this.clock+=dt;
  const t=reduced?0:this.clock,enter=reduced?1:Math.min(1,this.clock/1.8),reveal=1-(1-enter)**3;
  const px=pointer?.x>0?(pointer.x/w-.5):0,py=pointer?.y>0?(pointer.y/h-.5):0;
  this.pan.x+=(Math.max(-.5,Math.min(.5,reduced||modal?0:px))-this.pan.x)*Math.min(1,dt*3);
  this.pan.y+=(Math.max(-.5,Math.min(.5,reduced||modal?0:py))-this.pan.y)*Math.min(1,dt*3);
  this.alpha=home?(modal?.28:1):.24;
  this.sun.position.set(w*.69+this.pan.x*7,h*.215+this.pan.y*5);this.sun.width=w*(.52+.012*Math.sin(t*.37));this.sun.height=h*.44;this.sun.alpha=.38*reveal;
  this.haze.position.set(w*.73,h*.66);this.haze.width=w*.54;this.haze.height=h*.67;this.haze.alpha=.22;
  const g=this.sky;g.clear();
  for(let i=0;i<65;i++){const x=w*(.43+((i*.6180339+t*(.00015+i%3*.00006))% .56)),y=h*(.06+(i*.381966% .58));g.circle(x,y,i%7===0?1.2:.55).fill({color:i%4===0?0xffd5a2:0xcce9ff,alpha:(.16+.36*(.5+.5*Math.sin(t*.55+i)))*reveal});}
  // Soft moving shafts emerge from the sunrise, behind the flagship.
  for(let i=0;i<3;i++){const x=w*(.68+i*.055+Math.sin(t*.09+i)*.01);g.poly([w*.69,h*.2,x+w*.065,h*.85,x-w*.02,h*.85]).fill({color:i===1?0xffc58e:0x84cfff,alpha:.018*reveal});}
  const trails=this.trails;trails.clear();
  this.ships.forEach((s,i)=>{const p=(t*.025+i*.31)%1,x=w*(.48+p*.59),y=h*(.34-i*.075-p*.09);s.position.set(x,y);const size=(i===0?25:15)*w/1920;s.width=size;s.height=size*1.25;s.alpha=reduced?0:Math.sin(Math.PI*p)*.66;trails.moveTo(x-size*.15,y+size*.3).lineTo(x-size*2.5,y+size*1.3).stroke({color:0x82ddff,width:1,alpha:s.alpha*.65});});
  const f=this.floor;f.clear();const cx=w*.73,cy=h*.754,rx=Math.min(w*.235,h*.42),ry=rx*.19;
  for(let i=0;i<34;i++){const a=i/34*Math.PI*2,pulse=reduced?.3:.2+.65*Math.pow(.5+.5*Math.sin(a*2-t*1.3),10);f.moveTo(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry).lineTo(cx+Math.cos(a)*rx*1.045,cy+Math.sin(a)*ry*1.045).stroke({color:i%4?0x76dce5:0xffc987,width:i%4?2:3,alpha:pulse});}
  for(let i=0;i<22;i++){const p=(i*.618+t*(.035+i%3*.009))%1,x=w*(.47+(i*.283% .48))+Math.sin(t*.2+i)*10,y=h*(.85-p*.47);f.circle(x,y,i%5===0?1.6:.65).fill({color:i%3?0x95d9e8:0xffc37c,alpha:Math.sin(p*Math.PI)*.35});}
  this.debug={clock:this.clock,reduced,home,modal,ships:this.ships.length,motes:87,reveal};
 }
}
