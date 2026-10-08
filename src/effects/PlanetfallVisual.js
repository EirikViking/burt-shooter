import {Container,Graphics,Sprite,Texture,Rectangle} from 'pixi.js';
import {premiumTexture} from './PremiumArt.js';
import {getReducedMotionEnabled,getFlashIntensityScale} from '../config/AccessibilitySettings.js';
import {PLANETFALL} from '../game/Planetfall.js';
import {createText} from '../utils/pixiText.js';
import {translateText} from '../i18n/index.js';
import {planetfallText} from '../i18n/planetfallText.js';
import {PlanetfallFoundryView} from './PlanetfallFoundryView.js';

export function planetfallLayout(width,height){
  const rx=Math.min(width*.40,height*.68),ry=Math.min(height*.18,rx*.46);
  return {cx:width*.5,cy:height*.37,rx,ry,coreWidth:Math.max(64,Math.min(144,width*.14)),anchorWidth:Math.max(32,Math.min(82,width*.085))};
}
// The warning and discharge share these exact origins and directions.
export function planetfallShots(origin){
  return Array.from({length:origin.count},(_,i)=>({x:origin.x+(origin.count===2?(i?12:-12):0),y:origin.y,
    angle:origin.angle+(i-(origin.count-1)/2)*.18}));
}

export class PlanetfallVisual{
  constructor(boss){
    this.boss=boss;this.root=new Container();this.root.label='planetfall_orbital_ring';boss.sprite.addChildAt(this.root,0);
    this.structure=new Graphics();this.root.addChild(this.structure);this.ownedTextures=[];this.detachedAt=new Map();this.hits=new Map();
    this.power=new Graphics();this.root.addChild(this.power);this.powerRoutes=[];this.recoilAt=-100;
    const hull=premiumTexture('dreadnought');
    const texture=hull?new Texture({source:hull.source,frame:new Rectangle(hull.frame.x+300,hull.frame.y+210,240,190)}):Texture.EMPTY;
    if(hull)this.ownedTextures.push(texture);
    this.keelSegments=Array.from({length:32},(_,i)=>{const sprite=new Sprite(texture);sprite.anchor.set(.5);this.root.addChild(sprite);return {sprite,index:i,quadrant:Math.floor(i/8)};});
    this.ribs=new Graphics();this.root.addChild(this.ribs);
    this.segments=Array.from({length:32},(_,i)=>{const sprite=new Sprite(texture);sprite.anchor.set(.5);this.root.addChild(sprite);return {sprite,index:i,quadrant:Math.floor(i/8)};});
    for(const {sprite}of [...this.segments].sort((a,b)=>Math.sin((a.index+.5)*Math.PI/16)-Math.sin((b.index+.5)*Math.PI/16)))this.root.addChild(sprite);
    this.seams=new Graphics();this.root.addChild(this.seams);
    this.fractureJets=Array.from({length:32},()=>{const s=new Sprite(premiumTexture('rupture')||Texture.EMPTY);s.anchor.set(.5);s.visible=false;this.root.addChild(s);return s;});
    this.sparks=new Graphics();this.root.addChild(this.sparks);this.sparkCount=0;
    this.cradle=new Sprite(premiumTexture('captureCradle')||Texture.EMPTY);this.cradle.anchor.set(.5);this.root.addChild(this.cradle);
    this.irisLeaves=Array.from({length:6},()=>{const s=new Sprite(premiumTexture('moltArmour')||Texture.EMPTY);s.anchor.set(.5);this.root.addChild(s);return s;});
    this.signals=new Graphics();boss.sprite.addChild(this.signals);this.opening=0;
    this.label=createText('',{fontSize:16,fontWeight:'700',fill:0xffd59d,stroke:{color:0x081018,width:4},letterSpacing:0});
    this.label.anchor.set(.5);boss.sprite.addChild(this.label);this.ruptureAt=null;
    try{
      this.foundry=new PlanetfallFoundryView();this.foundrySprite=new Sprite(Texture.from(this.foundry.canvas));
      boss.sprite.addChildAt(this.foundrySprite,0);
    }catch(error){
      this.foundrySprite?.destroy({texture:true,textureSource:true});this.foundrySprite=null;
      this.foundry?.destroy();this.foundry=null;console.warn('[Planetfall] Solid presentation unavailable; using existing art',error);
    }
  }
  detach(index){if(!this.detachedAt.has(index))this.detachedAt.set(index,this.boss.planetfall.age);}
  hit(component){this.hits.set(component.type,this.boss.planetfall.age);}
  fire(){this.recoilAt=this.boss.planetfall.age;}
  update(delta){
    const b=this.boss,m=b.planetfall,layout=planetfallLayout(b.game.getWidth(),b.game.getHeight()),{cx,cy,rx,ry,coreWidth}=layout;
    const reduced=getReducedMotionEnabled(),flash=getFlashIntensityScale(),entry=Math.min(1,m.age/PLANETFALL.arrivalSeconds);
    const solid=this.foundry?.update(m,layout,b.game.getWidth(),b.game.getHeight(),{reduced,flash,detachedAt:this.detachedAt,recoilAt:this.recoilAt,delta,hits:this.hits})===true;
    this.root.visible=!solid;
    if(this.foundrySprite){this.foundrySprite.visible=solid;
      this.foundrySprite.texture.source.resize(this.foundry.canvas.width,this.foundry.canvas.height);
      this.foundrySprite.width=b.game.getWidth();this.foundrySprite.height=b.game.getHeight();this.foundrySprite.texture.source.update();}
    const rise=reduced?0:(1-entry)*(1-entry)*ry*1.5;
    this.root.alpha=.35+.65*entry;this.structure.clear();this.signals.clear();this.power.clear();this.powerRoutes=[];
    this.ribs.clear();this.seams.clear();this.sparks.clear();this.sparkCount=0;
    const sinceFire=m.age-this.recoilAt,recoil=reduced||sinceFire<0||sinceFire>.28?0:Math.sin(sinceFire/.28*Math.PI)*4;
    this.opening+=(Number(m.irisOpen)-this.opening)*Math.min(1,Math.max(0,delta/60)*12);
    if(m.stage==='rupture'&&this.ruptureAt===null)this.ruptureAt=m.age;
    this.label.text=translateText(planetfallText(m,this.ruptureAt!==null&&m.age-this.ruptureAt<1.4));
    const displayScale=Math.max(.01,Math.abs(b.game.scenes.play.gameContainer?.scale.x||1));
    this.warningLineWidth=Math.max(1.5,1.2/displayScale);
    this.label.visible=m.stage!=='arrival';this.label.scale.set(1);
    this.label.scale.set(Math.min(1/displayScale,(b.game.getWidth()*.76)/Math.max(1,this.label.width)));
    this.label.position.set(cx,cy+ry+Math.max(46,this.label.height*.5+8/displayScale));
    for(let q=0;q<4;q++){
      const dead=this.detachedAt.has(q),start=q*Math.PI/2;
      for(let j=0;j<8;j++){
        const a=start+j*Math.PI/16,aa=a+Math.PI/16;
        this.structure.moveTo(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry-rise).lineTo(cx+Math.cos(aa)*rx,cy+Math.sin(aa)*ry-rise)
          .stroke({color:dead?0x304149:0x95d7d2,width:dead?2:5,alpha:dead?.32:.7});
      }
      const a=start+Math.PI/4,x=cx+Math.cos(a)*rx*.94,y=cy+Math.sin(a)*ry*.94-rise,
        endX=cx+Math.cos(a)*coreWidth*.58,endY=cy+Math.sin(a)*coreWidth*.48-rise+recoil;
      const active=!dead&&m.parts[q].health>0;this.powerRoutes.push({active,x,y,endX,endY});
      if(active){
        this.structure.moveTo(x,y).lineTo(endX,endY).stroke({color:0x15272d,width:13,alpha:.95});
        this.structure.moveTo(x,y).lineTo(endX,endY).stroke({color:0x607981,width:7,alpha:.9});
        this.power.moveTo(x,y).lineTo(endX,endY).stroke({color:0x70d4cd,width:2.2,alpha:.3+this.opening*.35});
        if(!reduced&&entry===1){const t=(m.age*.65+q*.18)%1,tail=Math.max(0,t-.16);
          this.power.moveTo(x+(endX-x)*tail,y+(endY-y)*tail).lineTo(x+(endX-x)*t,y+(endY-y)*t)
            .stroke({color:0xb3f3e7,width:3,alpha:.8});}
      }
    }
    for(const piece of this.segments){
      const {sprite:s,index:i,quadrant:q}=piece,a=(i+.5)*Math.PI/16;
      const elapsed=this.detachedAt.has(q)?m.age-this.detachedAt.get(q):0,delay=Math.abs(i%8-3.5)*.08;
      // Failure propagates from the anchor, but every plate shares the old expiry.
      const falling=this.detachedAt.has(q)&&elapsed>=delay,t=Math.max(0,elapsed-delay),drift=falling&&!reduced?t:0;
      piece.fractureProgress=falling?Math.min(1,t/(2.2-delay)):0;
      s.visible=!falling||elapsed<2.2;s.position.set(cx+Math.cos(a)*(rx+drift*38),cy+Math.sin(a)*ry-rise+drift*22);
      s.rotation=Math.atan2(ry*Math.cos(a),-rx*Math.sin(a))+(reduced?0:drift*(q%2?-.16:.16));
      const depth=(Math.sin(a)+1)*.5;
      s.width=Math.max(24,Math.hypot(rx*Math.sin(a),ry*Math.cos(a))*Math.PI/16*1.20);s.height=Math.min(66,layout.anchorWidth*.72)*(.66+depth*.34);
      s.alpha=falling?Math.max(0,1-piece.fractureProgress):.65+depth*.35;s.tint=falling?0x687777:m.stage==='rupture'?0xb7c4bf:0xcbd8e5;
      const keel=this.keelSegments[i].sprite,thickness=7+depth*17;
      keel.position.set(s.x,s.y+thickness);keel.rotation=s.rotation;keel.width=s.width*.96;keel.height=s.height*.78;
      keel.alpha=s.alpha*.9;keel.tint=0x344954;keel.visible=s.visible;
      if(s.visible&&!falling){
        const dx=Math.cos(s.rotation)*s.width*.32,dy=Math.sin(s.rotation)*s.width*.32;
        if(i%2===0)for(const sign of [-1,1])this.ribs.moveTo(s.x+dx*sign,s.y+dy*sign).lineTo(s.x-dx*sign*.3,s.y+dy*sign+thickness)
          .stroke({color:0x829798,width:3,alpha:.48});
        const energized=!this.detachedAt.has(q)&&entry>i/40;
        if(energized)this.seams.moveTo(s.x-dx*.42,s.y-dy*.42).lineTo(s.x+dx*.42,s.y+dy*.42)
          .stroke({color:0x80d6d0,width:1.8,alpha:.28+depth*.17});
      }
      const jet=this.fractureJets[i],heat=falling?Math.max(0,1-t/.6):0;
      jet.visible=s.visible&&heat>0&&flash>0;jet.alpha=heat*.62*flash;
      if(jet.visible){jet.position.copyFrom(s.position);jet.width=jet.height=layout.anchorWidth*(.65+Math.min(1,t/.18)*.65);jet.rotation=a;}
      if(falling&&t<.65&&flash>0&&!reduced)for(let j=0;j<2;j++){
        const angle=a+(j?.7:-.7),travel=t*(34+j*15),x=s.x+Math.cos(angle)*travel,y=s.y+Math.sin(angle)*travel;
        this.sparks.moveTo(x,y).lineTo(x+Math.cos(angle)*5,y+Math.sin(angle)*5)
          .stroke({color:0xd5e6df,width:1.4,alpha:(1-t/.65)*flash*.65});this.sparkCount++;
      }
    }
    this.cradle.position.set(cx,cy-rise+recoil);this.cradle.width=coreWidth*1.85;this.cradle.scale.y=this.cradle.scale.x;this.cradle.tint=0xa7c6c8;
    for(let i=0;i<6;i++){
      const s=this.irisLeaves[i],a=i*Math.PI/3,r=coreWidth*(.43+this.opening*.32);
      s.position.set(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.65-rise+recoil);s.width=coreWidth*.44;s.scale.y=s.scale.x;
      s.rotation=a+Math.PI/2+(reduced?0:this.opening*.25);s.alpha=.8;s.tint=0x80999c;
    }
    for(const c of b.components){
      if(!c.active||c.sprite.destroyed)continue;
      const p=c.part,isCore=p.role==='core',radius=c.radius;
      c.body.visible=!solid;
      if(isCore)c.body.texture=premiumTexture(m.irisOpen?'reactorOpen':'reactorClosed')||Texture.EMPTY;
      c.body.tint=c.untargetable?0x78858e:0xffffff;c.ring.clear();
      const color=isCore?(m.irisOpen?0xffc16c:0xa7b6c3):0x8be8db;
      c.ring.circle(0,0,radius+3).stroke({color,width:c.untargetable?1.5:2.5,alpha:c.untargetable?.6:.95});
      c.ring.arc(0,0,radius+7,-Math.PI/2,-Math.PI/2+Math.PI*2*p.health/p.max).stroke({color,width:3,alpha:.85});
      if(!premiumTexture('reactorClosed'))c.ring.circle(0,0,radius*.7).fill({color,alpha:.7});
      if(isCore)for(const side of [-1,1])this.signals.roundRect(c.x+side*12-4,c.y+radius*.8-6,8,12,2).fill({color:0xebaa72,alpha:.9});
      const hit=m.age-(this.hits.get(c.type)??-100);
      if(hit<.18&&flash>0)this.signals.circle(c.x,c.y,radius+10).stroke({color:0xffedd1,width:3,alpha:(1-hit/.18)*flash*.75});
    }
    if(m.warning){
      const charge=Math.min(1,(m.age-m.warning.at)/PLANETFALL.warningSeconds);
      for(const origin of m.warning.origins){
        if(!m.parts.find(p=>p.id===origin.part)?.health)continue;
        for(const shot of planetfallShots(origin)){
          const length=Math.max(b.game.getWidth(),b.game.getHeight())*1.4,cos=Math.cos(shot.angle),sin=Math.sin(shot.angle);
          for(let d=10;d<length;d+=28)this.signals.moveTo(shot.x+cos*d,shot.y+sin*d).lineTo(shot.x+cos*(d+12),shot.y+sin*(d+12))
            .stroke({color:0xffa376,width:this.warningLineWidth,alpha:.38+charge*.4});
          this.signals.circle(shot.x,shot.y,9+charge*8).stroke({color:0xffe2a4,width:2,alpha:.85});
        }
      }
    }
  }
  destroy(){if(this.root.destroyed)return;this.foundry?.destroy();this.foundrySprite?.destroy({texture:true,textureSource:true});
    this.root.destroy({children:true});this.signals.destroy();this.label.destroy();this.ownedTextures.forEach(t=>t.destroy(false));this.ownedTextures=[];}
}

export class PlanetfallCollapse{
  constructor(manager,visual){
    this.manager=manager;this.age=0;this.root=new Container();this.root.label='nonlethal_planetfall_collapse';this.root.zIndex=1;this.textures=[];
    const pieces=[...(visual.keelSegments||[]).filter(({sprite})=>sprite.visible).map(p=>({...p,index:p.index+39})),...visual.segments.filter(({sprite})=>sprite.visible),
      ...visual.irisLeaves.map((sprite,i)=>({sprite,index:32+i})),{sprite:visual.cradle,index:38}];
    this.fragments=pieces.map(({sprite:p,index})=>{
      const t=new Texture({source:p.texture.source,frame:p.texture.frame});this.textures.push(t);const s=new Sprite(t);s.anchor.copyFrom(p.anchor);
      s.position.copyFrom(p.position);s.scale.copyFrom(p.scale);s.rotation=p.rotation;s.alpha=p.alpha;s.tint=p.tint;this.root.addChild(s);
      return {sprite:s,x:s.x,y:s.y,angle:s.rotation,index};
    });
    this.burst=new Sprite(premiumTexture('rupture')||Texture.EMPTY);this.burst.anchor.set(.5);this.root.addChild(this.burst);
    const {cx,cy,rx,ry,coreWidth}=planetfallLayout(manager.game.getWidth(),manager.game.getHeight());
    const origins=[{x:cx,y:cy,at:.06,size:coreWidth*1.8}];
    for(let q=0;q<4;q++)if(visual.segments.some(p=>p.quadrant===q&&p.sprite.visible)){
      const a=q*Math.PI/2+Math.PI/4;origins.push({x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry,at:.18+q*.12,size:coreWidth});
    }
    this.charges=origins.map(origin=>{const sprite=new Sprite(premiumTexture('rupture')||Texture.EMPTY);sprite.anchor.set(.5);sprite.alpha=0;this.root.addChild(sprite);return {...origin,sprite};});
    if(visual.foundry&&!visual.foundry.failed){
      this.foundry=visual.foundry;this.foundrySprite=visual.foundrySprite;visual.foundry=null;visual.foundrySprite=null;
      this.foundry.beginCollapse();this.root.addChildAt(this.foundrySprite,0);
    }
    manager.container.addChild(this.root);
    this.onBlur=()=>{this.focusLost=true;this.audio?.suspend();};this.onFocus=()=>{this.focusLost=false;};
    this.onVisibility=()=>this.syncInterruption();window.addEventListener('blur',this.onBlur);window.addEventListener('focus',this.onFocus);
    document.addEventListener('visibilitychange',this.onVisibility);
  }
  syncInterruption(){
    const s=this.manager.game.scenes.play,blocked=this.focusLost||document.visibilityState==='hidden'||s.isPaused||s.tacticalDraft?.active
      ||s.overrunMilestoneInterlude?.active||s.gameOverSequenceStarted||s.gameOverInterlude?.active;
    if(blocked)this.audio?.suspend();return Boolean(blocked);
  }
  update(delta){
    if(this.done||!Number.isFinite(delta)||delta<0||this.syncInterruption())return;this.age+=Math.min(.1,Math.max(0,delta/60));const reduced=getReducedMotionEnabled(),w=this.manager.game.getWidth(),h=this.manager.game.getHeight();
    const solid=this.foundry?.updateCollapse(this.age,reduced,getFlashIntensityScale())===true;
    if(this.foundrySprite){this.foundrySprite.visible=solid;this.foundrySprite.texture.source.update();}
    for(const {sprite:s,x,y,angle,index}of this.fragments){const core=index>=32&&index<39,plate=index>=39?index-39:index,stagger=core?(index-32)*.025:.18+plate/32*.42,t=Math.max(0,this.age-stagger);
      s.visible=!solid;
      s.x=x+(reduced?0:Math.sign(x-w*.5)*t*30);s.y=y+(reduced?0:t*t*22);s.rotation=angle+(reduced?0:t*(index%2?-.12:.12));s.alpha=Math.max(0,1-t/2.8);}
    const flash=getFlashIntensityScale();
    for(const c of this.charges){const t=this.age-c.at;c.sprite.position.set(c.x,c.y);
      c.sprite.width=c.sprite.height=c.size*(reduced?1:.55+Math.min(1,Math.max(0,t)*3));
      c.sprite.alpha=t<0?0:Math.max(0,1-t/.65)*flash*.68;}
    const layout=planetfallLayout(w,h);this.burst.position.set(layout.cx,layout.cy);this.burst.width=this.burst.height=120+Math.min(1,this.age/.5)*140;
    this.burst.alpha=Math.max(0,1-this.age/1.3)*getFlashIntensityScale()*.7;
    if(this.age>=3.8)this.destroy();
  }
  destroy(){if(this.done)return;this.done=true;window.removeEventListener('blur',this.onBlur);window.removeEventListener('focus',this.onFocus);
    document.removeEventListener('visibilitychange',this.onVisibility);this.foundry?.destroy();this.foundrySprite?.destroy({texture:true,textureSource:true});
    this.root.destroy({children:true});this.textures.forEach(t=>t.destroy(false));this.audio?.destroy();this.manager.breachCollapses?.delete(this);}
}
