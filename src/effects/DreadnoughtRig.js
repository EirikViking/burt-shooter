import {Container,Graphics,Sprite} from 'pixi.js';
import {premiumTexture} from './PremiumArt.js';
import {presentationFrame} from '../game/PremiumPresentation.js';
import {getReducedMotionEnabled,getFlashIntensityScale} from '../config/AccessibilitySettings.js';
import {combatFinishTexture} from './CombatFinish.js';
import {IonDriveVisual,updateCapitalDrives} from './IonDriveVisual.js';
export class DreadnoughtRig{
 constructor(boss){this.boss=boss;this.root=new Container();this.root.label='dreadnought_mechanics';boss.sprite.addChildAt(this.root,0);
  this.coreLight=new Sprite(combatFinishTexture());this.coreLight.anchor.set(.5);this.coreLight.tint=0x64e5ec;this.coreLight.blendMode='add';this.root.addChild(this.coreLight);
  this.drives=Array.from({length:6},()=>new IonDriveVisual(this.root));
  this.interior=new Sprite(premiumTexture('captureCradle'));this.interior.anchor.set(.5);this.root.addChild(this.interior);
  this.details=new Graphics();boss.sprite.addChild(this.details);this.damage=new Map();this.opening=0;this.lastStage='battery';}
 hit(component){this.damage.set(component.type,.18);}
 update(delta){const b=this.boss,w=b.game.getWidth(),h=b.game.getHeight(),reduced=getReducedMotionEnabled(),flash=getFlashIntensityScale(),dt=Math.min(.1,delta/60);
  const charge=b.warning?Math.min(1,(b.age-b.warning.at)/.95):0;
  const frame=presentationFrame({age:b.age,stage:b.breach.stage,charge,reduced,flash});
  this.opening+=(frame.hullOffset-this.opening)*Math.min(1,dt*6);const socket=b.components.find(c=>c.type===(frame.reactorReveal?'reactor':'hull'));this.interior.position.set(socket?.x??w*.5,socket?.y??h*.30);this.interior.width=w*.14;this.interior.scale.y=this.interior.scale.x;
  this.interior.alpha=.18+this.opening*.5;this.interior.tint=0x93b7bf;
  this.coreLight.position.copyFrom(this.interior.position);this.coreLight.width=this.coreLight.height=w*.15;this.coreLight.alpha=flash*(frame.reactorReveal?.16:.035);
  for(let i=0;i<b.panels.length;i++){const p=b.panels[i],side=i?1:-1;
   p.position.set(w*.5+side*(reduced?this.opening*w*.07:this.opening*w*.10+(1-frame.entry)*w*.2),h*.26-(reduced?0:(1-frame.entry)*h*.42));
   p.rotation=reduced?0:side*this.opening*.025;p.alpha=1;}
  updateCapitalDrives(this.drives,b.panels,{age:b.age,entry:frame.entry,charge,reduced,flash});
  this.details.clear();
  for(const c of b.components){if(!c.active||c.sprite.destroyed)continue;const p=c.part,damaged=1-p.health/p.max;
   c.body.tint=c.untargetable?0x566575:p.role==='gun'&&!b.breach.powered(p)?0x6b7980:0xffffff;
   if(p.role==='reactor')c.body.texture=premiumTexture(frame.reactorReveal?'reactorOpen':'reactorClosed');
   if(p.role==='gun'){
    const relay=b.components.find(r=>r.type===p.link);if(relay?.active&&b.breach.powered(p)){const t=reduced?.5:(b.age*.38)%1;this.details.circle(c.x+(relay.x-c.x)*t,c.y+(relay.y-c.y)*t,2.5).fill({color:0xb2fff1,alpha:.7});}
    const aim=b.warning?.origins.find(o=>o.c===c)?.angle;
    if(aim!=null&&!reduced)c.body.rotation=aim-Math.PI/2;
    const recoilAge=Math.max(0,b.age-(c.lastFiredAt??-100));c.body.y=reduced?0:-Math.max(0,1-recoilAge/.18)*7;
    if(charge&&b.breach.powered(p))this.details.circle(c.x,c.y,18+charge*5).stroke({color:0xffb564,width:2,alpha:.35+flash*charge*.3});
   }
   if(damaged>0)this.details.moveTo(c.x-16,c.y+5).lineTo(c.x+3,c.y-5).lineTo(c.x+15,c.y+10).stroke({color:0x211721,width:3,alpha:Math.min(.85,damaged+.25)});
   const remaining=this.damage.get(c.type)||0;
   if(remaining>0){this.damage.set(c.type,Math.max(0,remaining-dt));this.details.circle(c.x,c.y,12).stroke({color:0xffcc94,width:3,alpha:remaining/.18*flash*.6});}
  }
 }
 destroy(){this.drives.forEach(d=>d.destroy());if(!this.root.destroyed)this.root.destroy({children:true});if(!this.details.destroyed)this.details.destroy();}
}
