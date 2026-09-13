import {Container,Sprite,Graphics,Assets,Texture} from 'pixi.js';
import {getAccessibilitySettings} from '../config/AccessibilitySettings.js';

let lightTexture,hardwarePromise;
function light(){
 if(lightTexture)return lightTexture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
 const g=c.createRadialGradient(64,64,0,64,64,60);g.addColorStop(0,'#ffffff');g.addColorStop(.065,'#ffffff');g.addColorStop(.16,'#ffffffac');g.addColorStop(.34,'#ffffff38');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,128,128);
 for(const [w,h,a]of [[47,1.2,.48],[1.2,29,.36]]){c.fillStyle=`rgba(255,255,255,${a})`;c.beginPath();c.ellipse(64,64,w,h,0,0,Math.PI*2);c.fill();}
 return lightTexture=Texture.from(canvas);
}

// A finite, local weapon presentation. All phases are supplied by existing
// attack state; the rig has no firing callbacks or authority over simulation.
export class AstraAttackRig extends Container{
 constructor(radius,color=0xffbd63,{hardware=true}={}){
  super();this.eventMode='none';this.radius=radius;this.color=color;this.label='astra_attack_assembly';
  this.filaments=new Graphics();this.filaments.blendMode='add';this.addChild(this.filaments);
  this.mounts=[-1,1].map(side=>{
   const node=new Container();node.side=side;node.position.set(side*radius*.48,radius*.12);this.addChild(node);
   if(hardware){const s=new Sprite(Texture.EMPTY);s.anchor.set(.5,.4);s.rotation=Math.PI;node.addChild(s);node.hardware=s;
    hardwarePromise ||= Assets.load('/art/astra/component/03.png');hardwarePromise.then(t=>{if(s.destroyed)return;s.texture=t;s.width=radius*.37;s.height=radius*.72;}).catch(()=>{});
   }
   const charge=new Sprite(light());charge.anchor.set(.5);charge.tint=color;charge.blendMode='add';node.addChild(charge);node.charge=charge;
   const flash=new Sprite(light());flash.anchor.set(.5);flash.tint=0xfff4d8;flash.blendMode='add';node.addChild(flash);node.flash=flash;
   return node;
  });
 }
 update({charge=0,recoil=0,time=0,active=false,aim=Math.PI/2}={}){
  const settings=getAccessibilitySettings(),motion=!settings.prefersReducedMotion,r=this.radius;
  const t=motion?time:0;this.filaments.clear();this.visible=charge>0||recoil>0||this.mounts.some(n=>n.hardware);
  this.mounts.forEach((node,i)=>{
   const side=node.side;node.x=side*r*(.48+charge*.10);node.y=r*(.12+charge*.10-recoil*.17);
   node.rotation=motion?Math.max(-.5,Math.min(.5,aim-Math.PI/2))*(.25+charge*.5):0;
   const energy=(.08+charge*.8+recoil*.2)*settings.flashIntensity;
   node.charge.width=node.charge.height=r*(.18+charge*.66);node.charge.y=r*.34;node.charge.alpha=energy;
   node.flash.width=r*(.18+recoil*.9);node.flash.height=r*(.3+recoil*1.5);node.flash.y=r*(.37+recoil*.16);node.flash.alpha=recoil*.85*settings.flashIntensity;
   if(charge>.03){
    const endX=node.x,endY=node.y+r*.25;
    for(let k=0;k<3;k++){
     const u=((t*1.1+k/3+i*.14)%1),x=endX*u,y=endY*u;
     this.filaments.moveTo(x,y).lineTo(x+endX*.08,y+endY*.08).stroke({color:k===1?0xfff2d4:this.color,width:k===1?1.2:.7,alpha:charge*(.25+.55*u)*settings.flashIntensity});
    }
    // A tiny contained discharge crawls over the emitter mouth.
    if(motion&&charge>.5){
     for(let j=0;j<6;j++){const x=endX+(j/5-.5)*r*.25,y=endY+Math.sin(j*3.1+t*21+i)*r*.035;if(j)this.filaments.lineTo(x,y);else this.filaments.moveTo(x,y);}
     this.filaments.stroke({color:0xfff7e0,width:.75,alpha:(charge-.5)*settings.flashIntensity});
    }
   }
  });
  this._debugAstraAttack={charge,recoil,active,motion,mounts:this.mounts.length};
 }
}
