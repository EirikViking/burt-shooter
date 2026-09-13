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
 }
 destroy(options){if(!this.destroyed)super.destroy({...options,children:true});}
}
