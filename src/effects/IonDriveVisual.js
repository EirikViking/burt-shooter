import {Container,Rectangle,Sprite,Texture} from 'pixi.js';
import {premiumTexture} from './PremiumArt.js';

const unit=n=>Math.max(0,Math.min(1,Number(n)||0));
const capitalSockets=[-.255,-.115,.025];

// The atlas points right: a rigid nozzle on the left, exhaust to the right.
// Separate the two so throttling cannot stretch the metal housing. These are
// owned texture views of a prewarmed shared source, never combat particles.
export class IonDriveVisual {
  constructor(parent){
    const texture=premiumTexture('ionPlume'),f=texture.frame,neck=Math.round(f.width*.22);
    this.textures=[
      new Texture({source:texture.source,frame:new Rectangle(f.x,f.y,neck,f.height)}),
      new Texture({source:texture.source,frame:new Rectangle(f.x+neck,f.y,f.width-neck,f.height)})
    ];
    this.root=new Container();this.root.label='ion_drive';this.root.eventMode='none';parent.addChild(this.root);
    this.nozzle=new Sprite(this.textures[0]);this.nozzle.anchor.set(1,.5);
    this.flame=new Sprite(this.textures[1]);this.flame.anchor.set(0,.5);this.flame.blendMode='add';
    this.root.addChild(this.flame,this.nozzle);this.root.visible=false;this.destroyed=false;
  }
  update({x,y,angle=Math.PI/2,beam=12,length=48,throttle=.5,age=0,reduced=false,flash=1,opacity=1}){
    const power=unit(throttle),a=unit(opacity),f=unit(flash);
    this.root.visible=a>0;if(!this.root.visible)return;
    this.root.position.set(x,y);this.root.rotation=angle;this.root.alpha=a;
    const width=Math.max(1,beam),flutter=reduced?1:1+Math.sin(age*9)*.035;
    this.nozzle.height=width;this.nozzle.scale.x=this.nozzle.scale.y;
    this.flame.height=width*(.82+power*.18);
    this.flame.width=Math.max(1,length)*(.52+power*.48)*flutter;
    this.flame.alpha=.22+f*.43;
  }
  hide(){this.root.visible=false;}
  destroy(){
    if(this.destroyed)return;this.destroyed=true;
    this.root.destroy({children:true});
    for(const texture of this.textures)texture.destroy(false);
    this.textures=[];
  }
}

// Follow the painted twin aft sockets, including the existing bank angle.
// Changing flame length leaves the nozzle and every gameplay position intact.
export function updateRescueDrives(drives,ships,escorts,{reduced=false,flash=1}={}){
  for(const drive of drives)drive.hide();
  for(const escort of escorts){
    const index=escort.side<0?0:1,ship=ships[index];
    if(!ship?.visible)continue;
    const angle=ship.rotation-Math.PI/2,dx=Math.cos(angle),dy=Math.sin(angle);
    const arrival=unit(1-(escort.joinAge??escort.age)/.9),exit=unit(1-ship.alpha);
    for(let j=0;j<2;j++){
      const side=j?1:-1,rear=ship.height*.42,lateral=side*ship.width*.105;
      drives[index*2+j].update({x:ship.x+dx*rear-dy*lateral,y:ship.y+dy*rear+dx*lateral,
        angle,beam:ship.width*.13,length:ship.height*(.62+arrival*.45+exit*.8),
        throttle:.35+arrival*.4+exit*.65,age:escort.age,reduced,flash,opacity:ship.alpha});
    }
  }
}

// Six stabilizers belong to the painted outer hull sockets. Follow each panel
// through entry and breach separation instead of leaving jets floating below it.
export function updateCapitalDrives(drives,panels,{age=0,entry=1,charge=0,reduced=false,flash=1}={}){
  for(let i=0;i<2;i++){
    const panel=panels[i],side=i?1:-1,c=Math.cos(panel.rotation),s=Math.sin(panel.rotation);
    for(let j=0;j<3;j++){
      const x=side*panel.width*.945,y=panel.height*capitalSockets[j];
      drives[i*3+j].update({x:panel.x+c*x-s*y,y:panel.y+s*x+c*y,
        angle:(i?0:Math.PI)+panel.rotation,beam:panel.height*.13,length:panel.width*.16,
        throttle:.4+(1-unit(entry))*.6,age:age+j*.35,reduced,flash,
        opacity:panel.visible?panel.alpha*.52*(1-unit(charge)*.55):0});
    }
  }
}
