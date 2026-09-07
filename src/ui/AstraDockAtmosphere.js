import {Container,Graphics} from 'pixi.js';

// Presentation-only gantry illumination. No small craft, atlases, filters or RNG.
export class AstraDockAtmosphere extends Container {
 constructor(){super();this.eventMode='none';this.clock=0;this.shafts=new Graphics();this.addChild(this.shafts);}
 update(delta,width,height,reducedMotion,anchorX=.485){
  if(!reducedMotion)this.clock+=Math.min(3,Math.max(0,delta))/60;
  const t=reducedMotion?0:this.clock,g=this.shafts;g.clear();
  for(let i=0;i<3;i++){
   const x=width*(.34+i*.16),drift=Math.sin(t*.12+i)*width*.018;
   g.poly([x-3,height*.1,x+3,height*.1,x+width*.11+drift,height*.76,x-width*.06+drift,height*.76]).fill({color:0x91d7e2,alpha:.022});
   g.poly([x-1,height*.1,x+1,height*.1,x+width*.046+drift,height*.76,x-width*.016+drift,height*.76]).fill({color:0xc5eafa,alpha:.024});
  }
  const cx=width*anchorX,cy=height*.73,rx=Math.min(width*.23,height*.36),ry=rx*.18;
  for(let i=0;i<3;i++){
   g.ellipse(cx,cy,rx*(1+i*.09),ry*(1+i*.09)).stroke({color:i===1?0xe5c288:0x7ccbdc,width:i===1?1.3:.7,alpha:i===1?.24:.12});
  }
  for(let i=0;i<24;i++){
   const a=i/24*Math.PI*2,brightness=.08+.24*Math.pow(.5+.5*Math.cos(a-t*.3),8);
   g.moveTo(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry).lineTo(cx+Math.cos(a)*rx*1.065,cy+Math.sin(a)*ry*1.065).stroke({color:0xb9e9ed,width:2,alpha:brightness});
  }
 }
 destroy(options){if(!this.destroyed)super.destroy({...options,children:true});}
}
