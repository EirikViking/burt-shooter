import {Container,Sprite,Texture,Graphics} from 'pixi.js';
import {getReducedMotionEnabled,getFlashIntensityScale} from '../config/AccessibilitySettings.js';
import {premiumTexture} from './PremiumArt.js';
// Post-defeat presentation has no gameplay entities, shots or collision.
export class BreachCollapse{
  constructor(manager,panels){this.manager=manager;this.age=0;this.root=new Container();this.root.label='nonlethal_breach_collapse';this.root.zIndex=1;
    this.textures=[];this.panels=panels.map(p=>{const t=new Texture({source:p.texture.source,frame:p.texture.frame});this.textures.push(t);
      const s=new Sprite(t);s.anchor.copyFrom(p.anchor);s.position.copyFrom(p.position);s.width=p.width;s.height=p.height;s.alpha=p.alpha;
      s.rotation=p.rotation;this.root.addChild(s);return s;});
    this.bursts=Array.from({length:3},(_,i)=>{const s=new Sprite(premiumTexture('rupture'));s.anchor.set(.5);s.visible=false;
      s.position.set(manager.game.getWidth()*(.3+i*.2),manager.game.getHeight()*(i===1?.29:.24));this.root.addChild(s);return s;});
    this.glow=new Graphics();this.root.addChild(this.glow);manager.container.addChild(this.root);}
  update(delta){if(this.done)return;this.age+=Math.min(.1,Math.max(0,delta/60));const reduced=getReducedMotionEnabled();
    for(let i=0;i<2;i++){const p=this.panels[i];p.alpha=.9*Math.max(0,1-this.age/1.6);if(!reduced){p.x+=(i?1:-1)*delta*.85;p.y+=delta*.3;p.rotation+=(i?1:-1)*delta*.0018;}}
    for(let i=0;i<this.bursts.length;i++){const s=this.bursts[i],t=this.age-i*.18;s.visible=t>=0&&t<.65;
      if(s.visible){s.width=70+Math.min(1,t/.12)*65;s.scale.y=s.scale.x;s.alpha=(1-t/.65)*(.22+getFlashIntensityScale()*.45);}}
    this.glow.clear();const flash=getFlashIntensityScale();if(flash>0&&this.age<.5)this.glow.ellipse(this.manager.game.getWidth()*.5,this.manager.game.getHeight()*.3,
      60+this.age*80,24).stroke({color:0xffbb88,width:3,alpha:(.5-this.age)*flash});
    if(this.age>=1.6)this.destroy();}
  destroy(){if(this.done)return;this.done=true;this.root.destroy({children:true});this.textures.forEach(t=>t.destroy(false));this.manager.breachCollapses?.delete(this);}
}
