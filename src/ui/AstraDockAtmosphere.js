import {Assets,Container,Graphics,Rectangle,Sprite,Texture} from 'pixi.js';

// A small baked Blender turntable, never a runtime 3D scene. Menu-only motion
// uses the presentation clock and remains independent of simulation and RNG.
export class AstraDockAtmosphere extends Container {
 constructor(){
  super();this.eventMode='none';this.clock=0;
  this.shafts=new Graphics();this.addChild(this.shafts);
  this.tugs=[];this.frames=[];
  Assets.load('/art/astra/dock-tug-v5.webp').then(sheet=>{
   if(this.destroyed)return;
   this.frames=Array.from({length:32},(_,i)=>new Texture({source:sheet.source,frame:new Rectangle(i%8*192,Math.floor(i/8)*192,192,192)}));
   for(let i=0;i<2;i++){const tug=new Sprite(this.frames[i*13]);tug.anchor.set(.5);tug.alpha=i?.64:.92;this.tugs.push(tug);this.addChild(tug);}
   this.update(0,this.widthInPixels||1280,this.heightInPixels||720,false);
  }).catch(error=>console.warn('[AstraDock] Service craft unavailable',error));
 }
 update(delta,width,height,reducedMotion){
  this.widthInPixels=width;this.heightInPixels=height;
  if(!reducedMotion)this.clock+=Math.min(3,Math.max(0,delta))/60;
  const t=reducedMotion?0:this.clock;
  // Narrow gantry lamps open into broad, faint shafts. No filters, bloom,
  // particles or full-screen intermediate render targets are allocated.
  const g=this.shafts;g.clear();
  for(let i=0;i<3;i++){
   const x=width*(.34+i*.16),drift=Math.sin(t*.12+i)*width*.018;
   g.poly([x-3,height*.1,x+3,height*.1,x+width*.11+drift,height*.76,x-width*.06+drift,height*.76]).fill({color:0x91d7e2,alpha:.018});
   g.poly([x-1,height*.1,x+1,height*.1,x+width*.046+drift,height*.76,x-width*.016+drift,height*.76]).fill({color:0xc5eafa,alpha:.018});
  }
  for(let i=0;i<this.tugs.length;i++){
   const tug=this.tugs[i],phase=t*.09+i*2.5;
   tug.position.set(width*(i?.66:.32)+Math.sin(phase)*width*.023,height*(i?.29:.64)+Math.cos(phase*.73)*height*.024);
   tug.texture=this.frames[((Math.round((i?21:4)+Math.sin(phase)*2.5)%32)+32)%32];
   tug.width=tug.height=Math.min(width*.085,height*(i?.092:.135));
  }
 }
 destroy(options){
  if(this.destroyed)return;
  super.destroy({...options,children:true,texture:false,textureSource:false});
  for(const frame of this.frames)frame.destroy(false);
  this.frames=[];this.tugs=[];
 }
}
