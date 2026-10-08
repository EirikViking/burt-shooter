import {Container,Sprite} from 'pixi.js';
import {premiumTexture} from './PremiumArt.js';
import {effectEnvelope,PREMIUM_LIMITS} from '../game/PremiumPresentation.js';
import {getReducedMotionEnabled,getFlashIntensityScale} from '../config/AccessibilitySettings.js';
import {combatFinishTexture} from './CombatFinish.js';
// Fixed sprite pool, transform animation only. It has no collision or rewards.
export class PremiumImpacts{
 constructor(container){this.root=new Container();this.root.label='premium_local_impacts';this.root.zIndex=3;container.addChild(this.root);
  const shock=combatFinishTexture('shock');this.slots=Array.from({length:PREMIUM_LIMITS.impacts},()=>{const accent=new Sprite(shock);accent.anchor.set(.5);accent.visible=false;accent.blendMode='add';const sprite=new Sprite();sprite.anchor.set(.5);sprite.visible=false;this.root.addChild(accent,sprite);return{sprite,accent,active:false};});this.serial=0;}
 emit(x,y,size=35,kind='impact',angle=-Math.PI/2,color=0xffbd7f){if(this.root.destroyed)return false;const texture=premiumTexture(kind==='impact'?'muzzle':kind==='debris'?'wreckA':'rupture');if(!texture)return false;
  const slot=this.slots.find(s=>!s.active);if(!slot)return false;slot.active=true;slot.age=0;slot.life=kind==='debris'?.7:kind==='impact'?.2:.48;
  slot.kind=kind;slot.x=x;slot.y=y;slot.size=Math.max(12,Math.min(kind==='impact'?55:180,size));slot.index=this.serial++;
  const s=slot.sprite;s.texture=texture;s.position.set(x,y);s.rotation=kind==='impact'?angle:slot.index*1.7;
  s.width=slot.size*.65;s.scale.y=s.scale.x;s.alpha=kind==='debris'?.7:.28+getFlashIntensityScale()*.42;s.visible=true;
  slot.accent.position.set(x,y);slot.accent.tint=color;slot.accent.width=slot.accent.height=slot.size*.5;slot.accent.alpha=0;slot.accent.visible=kind==='impact';
  return true;}
 update(delta){if(this.root.destroyed)return;const reduced=getReducedMotionEnabled(),flash=getFlashIntensityScale(),dt=Math.min(.1,Math.max(0,delta/60));
  for(const slot of this.slots){if(!slot.active)continue;slot.age+=dt;const e=effectEnvelope(slot.age,slot.life),s=slot.sprite;
   if(!e.alpha){slot.active=false;s.visible=false;slot.accent.visible=false;continue;}
   s.width=slot.size*e.scale;s.scale.y=s.scale.x;s.alpha=e.alpha*(slot.kind==='debris'?.7:.28+flash*.42);
   slot.accent.width=slot.accent.height=slot.size*(reduced?.85:.5+Math.min(1,slot.age/.16)*.7);slot.accent.alpha=e.alpha*flash*.4;
   if(!reduced&&slot.kind==='debris'){s.x=slot.x+Math.cos(slot.index*1.7)*slot.age*35;s.y=slot.y+slot.age*28;s.rotation+=dt*(slot.index%2?1:-1);}}
 }
 clear(){if(this.root.destroyed)return;for(const s of this.slots){s.active=false;s.sprite.visible=false;s.accent.visible=false;}}
 destroy(){this.root.destroy({children:true});}
}
