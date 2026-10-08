import {Container,Graphics,Sprite,Texture,Rectangle} from 'pixi.js';
import {SerpentMoltModel,SERPENT_MOLT} from '../game/SerpentMolt.js';
import {GameAssets} from '../utils/GameAssets.js';
import {AudioManager} from '../audio/AudioManager.js';
import {getReducedMotionEnabled,getFlashIntensityScale} from '../config/AccessibilitySettings.js';
import {premiumTexture} from './PremiumArt.js';

// Swept ellipse: the collision silhouette follows the horizontal armour plate,
// including fast needles. It has no player/contact/graze collision surface.
export function serpentPlateTouches(bullet,p){
  const rx=p.rx+Math.min(12,Number(bullet.radius)||0),ry=p.ry+Math.min(12,Number(bullet.radius)||0);
  const ax=((Number.isFinite(bullet.previousX)?bullet.previousX:bullet.x)-p.x)/rx;
  const ay=((Number.isFinite(bullet.previousY)?bullet.previousY:bullet.y)-p.y)/ry;
  const dx=(bullet.x-p.x)/rx-ax,dy=(bullet.y-p.y)/ry-ay;
  const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  return (ax+t*dx)**2+(ay+t*dy)**2<=1;
}
export class SerpentMolt {
  constructor(manager,chain){
    this.manager=manager;this.chain=chain;this.model=new SerpentMoltModel(chain.sections.reduce((n,s)=>n+s.maxHealth,0));
    this.root=new Container();this.root.label='cinder_shed_cover';this.root.zIndex=-1;
    manager.container.addChildAt(this.root,0);this.disposed=false;this.blocked=0;this.destroyedPlates=0;
    const source=GameAssets.serpentTextures?.['0-body'];
    this.texture=source?new Texture({source:source.source,frame:new Rectangle(source.frame.x+Math.floor(source.frame.width*.1),
      source.frame.y+Math.floor(source.frame.height*.2),Math.max(1,Math.floor(source.frame.width*.36)),Math.floor(source.frame.height*.58))}):Texture.EMPTY;
    this.coreTexture=source?(GameAssets.serpentMoltCoreTexture ||= new Texture({source:source.source,
      frame:new Rectangle(source.frame.x+Math.floor(source.frame.width*.4),source.frame.y,
        Math.max(1,Math.floor(source.frame.width*.2)),source.frame.height)})):null;
    this.ownedTexture=this.texture;
    this.texture=premiumTexture('moltPlate')||this.texture;
    this.coreTexture=premiumTexture('moltSpine')||this.coreTexture;
    this.views=Array.from({length:SERPENT_MOLT.maxPlates},()=>{
      const root=new Container(),backing=new Graphics(),shell=new Sprite(this.texture),edge=new Graphics();shell.anchor.set(.5);
      root.addChild(backing,shell,edge);this.root.addChild(root);root.visible=false;return {root,backing,shell,edge};
    });
    this.phase=this.model.phase;
  }
  log(event,extra={}){
    const g=this.manager.game;if(!g.encounterEvolutionDiagnostics)return;
    const rows=g.encounterEvolutionLog||=[];
    rows.push({family:'serpent-molt',event,sector:this.manager.level,at:g.runElapsedSeconds||0,
      phase:this.model.phase,score:g.score,...extra});if(rows.length>80)rows.shift();
  }
  update(delta){
    if(this.disposed)return;
    const living=this.chain.sections.filter(s=>s.active),health=living.reduce((n,s)=>n+Math.max(0,s.health),0);
    const dt=Math.max(0,Math.min(.1,delta/60));
    this.model.update(dt,{age:this.chain.age,health,living:living.length});
    if(this.model.phase==='ended'){this.dispose('mother-ended');return;}
    if(this.phase!==this.model.phase){
      this.phase=this.model.phase;this.log(this.phase,{health});
      if(this.phase==='fracturing')AudioManager.playSfx('premium_molt_fracture',{preserveGameplayRng:true});
      if(this.phase==='exposed'){
        const w=this.manager.game.getWidth(),h=this.manager.game.getHeight();
        for(const p of this.model.plates){
          const host=living[Math.min(living.length-1,Math.floor((p.index+.5)*living.length/2))];
          p.from={x:host.x,y:host.y};p.x=host.x;p.y=host.y;
          p.destinationX=w*(p.index?.72:.28);p.destinationY=Math.max(h*.48,Math.min(h*.65,host.y+h*.1));
          p.rx=Math.min(64,w*.07);p.ry=p.rx*.42;
        }
        AudioManager.playSfx('premium_molt_emerge',{preserveGameplayRng:true});
      }
    }
    const reduced=getReducedMotionEnabled(),flash=getFlashIntensityScale();
    for(let i=0;i<this.views.length;i++){
      const v=this.views[i],p=this.model.plates[i];v.root.visible=Boolean(p?.active);if(!p?.active)continue;
      const t=Math.min(1,p.age/.75),u=t*t*(3-2*t);
      p.x=p.from.x+(p.destinationX-p.from.x)*u;
      p.y=p.from.y+(p.destinationY-p.from.y)*u+Math.max(0,p.age-.75)*15;
      const h=this.manager.game.getHeight();p.y=Math.min(h*.76,p.y);
      v.root.position.set(p.x,p.y);v.root.rotation=reduced?0:(1-u)*(p.index?-.25:.25);
      v.shell.rotation=0;v.shell.width=p.rx*2;v.shell.height=p.ry*2;v.shell.tint=0xffffff;
      // Still-solid cover remains readable until its real expiry. Damage
      // changes the material, never the collision shape or reward ownership.
      v.root.alpha=Math.max(.65,Math.min(1,(SERPENT_MOLT.plateSeconds-p.age)/.45));
      const capacity=this.model.initialHealth*SERPENT_MOLT.durabilityFraction/SERPENT_MOLT.maxPlates;
      const wear=Math.max(0,Math.min(1,1-p.health/capacity));v.root.__coverWear=wear;
      v.backing.clear().poly([-p.rx,0,-p.rx*.6,-p.ry,p.rx*.6,-p.ry,p.rx,0,p.rx*.6,p.ry,-p.rx*.6,p.ry])
        .fill({color:0x40303a,alpha:.96});
      v.edge.clear().ellipse(0,0,p.rx,p.ry).stroke({color:0xffb57c,width:2,alpha:.9});
      // Fracture seams and a steady underside distinguish solid cover from shots.
      v.edge.moveTo(-p.rx*.8,0).lineTo(-p.rx*.15,5).lineTo(p.rx*.2,-4).lineTo(p.rx*.75,0)
        .stroke({color:0x26131b,width:3,alpha:1});
      v.edge.moveTo(-p.rx*.65,p.ry*.62).lineTo(p.rx*.65,p.ry*.62).stroke({color:0x7eeacb,width:2,alpha:.8});
      if(wear>.28){
        v.edge.moveTo(-p.rx*.35,-p.ry*.8).lineTo(-p.rx*.23,-p.ry*.12).lineTo(-p.rx*.48,p.ry*.52)
          .stroke({color:0x130c16,width:4,alpha:1});
        v.edge.moveTo(-p.rx*.32,-p.ry*.77).lineTo(-p.rx*.20,-p.ry*.12).lineTo(-p.rx*.45,p.ry*.49)
          .stroke({color:0xffd09a,width:1,alpha:.9});
      }
      if(wear>.62){
        v.edge.moveTo(p.rx*.42,-p.ry*.64).lineTo(p.rx*.18,p.ry*.05).lineTo(p.rx*.38,p.ry*.73)
          .stroke({color:0x130c16,width:4,alpha:1});
        v.edge.moveTo(p.rx*.45,-p.ry*.62).lineTo(p.rx*.21,p.ry*.05).lineTo(p.rx*.41,p.ry*.71)
          .stroke({color:0xffd09a,width:1,alpha:.9});
      }
      if(!reduced&&flash>0&&p.age<.45)v.edge.ellipse(0,0,p.rx+3,p.ry+3).stroke({color:0xffd3a2,width:1,alpha:(.45-p.age)*flash});
    }
  }
  intercept(){
    if(this.disposed||this.model.phase!=='exposed')return;
    const s=this.manager.game.scenes.play,bm=s.bulletManager;
    for(const p of this.model.plates){
      if(!p.active)continue;
      for(const b of bm.playerBullets){
        if(!b.active||!serpentPlateTouches(b,p))continue;
        if(b.isBomb){s.detonateBombBullet(b,'shed_cover');continue;}
        if(this.model.hitPlate(p,Number(b.damage)||0,b)){
          // Solid armour stops Pierce/Chain/beam/drone shots too. No enemy hit,
          // chain propagation, score, XP, loot or achievement hook is invoked.
          bm.deactivateBullet(b,'shed_cover');
          if(!p.active){this.destroyedPlates++;this.log('plate-destroyed',{index:p.index});
            AudioManager.playSfx('premium_cover_break',{preserveGameplayRng:true});s.particleManager?.premiumImpacts.emit(p.x,p.y,50,'debris');break;}
        }
      }
      if(!p.active)continue;
      for(const b of bm.enemyBullets)if(b.active&&serpentPlateTouches(b,p)){
        bm.deactivateBullet(b,'shed_cover');this.blocked++;
      }
    }
  }
  hitBombBlast(x,y,radius,damage,bullet){
    for(const p of this.model.plates)if(p.active&&(p.x-x)**2+(p.y-y)**2<=(radius+p.rx)**2){
      const active=p.active;if(this.model.hitPlate(p,damage,bullet)&&active&&!p.active){this.destroyedPlates++;this.log('plate-destroyed',{index:p.index});}
    }
  }
  dispose(reason='cleanup'){
    if(this.disposed)return;this.log('cleanup',{reason,blocked:this.blocked,destroyedPlates:this.destroyedPlates});
    this.disposed=true;this.model.end();this.root.destroy({children:true});
    if(this.ownedTexture!==Texture.EMPTY)this.ownedTexture.destroy(false);
    // The single shared core wrapper is retained with the authored snake art.
    this.manager.serpentMolts?.delete(this);
  }
}
