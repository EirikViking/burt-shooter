import {Container,Graphics,Sprite,Texture,Rectangle} from 'pixi.js';
import {premiumTexture} from './PremiumArt.js';
import {COUNTERWEIGHT,counterweightWorldPoses} from '../game/Counterweight.js';

// Existing prewarmed machinery art. All solid hardware is harmless; only the
// two dashed lanes anticipate normal bullets. No filters or texture copies.
export class CounterweightVisual {
  constructor(parent){
    this.root=new Container();this.root.label='counterweight';parent.addChild(this.root);
    this.arms=new Graphics();this.root.addChild(this.arms);
    const relay=premiumTexture('relay'),f=relay.frame;
    this.pistonTexture=new Texture({source:relay.source,frame:new Rectangle(f.x+Math.floor(f.width*.35),f.y+Math.floor(f.height*.20),Math.floor(f.width*.30),Math.floor(f.height*.55))});
    this.pistons=Array.from({length:2},()=>{const s=new Sprite(this.pistonTexture);s.anchor.set(.5);this.root.addChild(s);return s;});
    this.guns=['portGun','starboardGun'].map(part=>{
      const sprite=new Sprite(premiumTexture('weaverGun'));sprite.anchor.set(.5);
      this.root.addChild(sprite);return {part,sprite};
    });
    this.pivot=new Sprite(premiumTexture('reactorClosed'));this.pivot.anchor.set(.5);this.root.addChild(this.pivot);
    this.tells=new Graphics();this.root.addChild(this.tells);
    this.root.visible=false;this.lastEvent=null;this.lastVolley=0;this.recoilAt=-99;
  }
  update(e,pose,{reduced=false,flash=1}={}){
    const c=e.counterweight,w=pose.width,cx=pose.x,cy=pose.y+.05*w;
    if(this.lastEvent!==e){this.lastEvent=e;this.lastVolley=0;this.recoilAt=-99;}
    if(this.lastVolley!==c.volleys){this.lastVolley=c.volleys;this.recoilAt=e.age;}
    const terminal=['disabled','spent','expired'].includes(c.phase);
    const charge=c.phase==='ready'?1:c.phase==='warning'?Math.max(0,1-c.remaining/COUNTERWEIGHT.warning):0;
    const recoil=reduced?0:Math.max(0,1-(e.age-this.recoilAt)/.18)*3;
    this.root.visible=true;this.arms.clear();this.tells.clear();
    const targets=counterweightWorldPoses(e,pose);
    for(const [index,{part,sprite}]of this.guns.entries()){
      sprite.visible=e.hp[part]>0;
      const piston=this.pistons[index];piston.visible=sprite.visible;
      if(!sprite.visible)continue;
      const sign=part==='portGun'?-1:1,cos=Math.cos(c.angle),sin=Math.sin(c.angle);
      const x=cx+(sign*.37*cos-.10*sin)*w,y=cy+(sign*.37*sin+.10*cos)*w;
      const size=Math.min(112,w*.28);
      // Reinforced arm, polished piston and seated bearing stay physically joined.
      this.arms.moveTo(cx,cy).lineTo(x,y).stroke({color:0x091019,width:18})
        .stroke({color:0x394957,width:13}).stroke({color:0x78929f,width:3});
      const mx=(cx+x)*.5,my=(cy+y)*.5;
      piston.position.set(mx,my);piston.width=Math.min(26,w*.07);piston.height=Math.hypot(x-cx,y-cy)*.8;
      piston.rotation=Math.atan2(y-cy,x-cx)-Math.PI/2;piston.tint=terminal?0x718189:0xffffff;
      this.arms.moveTo(cx+(x-cx)*.32,cy+(y-cy)*.32).lineTo(cx+(x-cx)*.72,cy+(y-cy)*.72)
        .stroke({color:0x102430,width:8}).stroke({color:0xb9babc,width:2});
      this.arms.circle(mx,my,7).fill(0x12202b).stroke({color:0x88949a,width:2});
      sprite.position.set(x+Math.sin(c.angle)*recoil,y-Math.cos(c.angle)*recoil);
      sprite.width=size;sprite.scale.y=sprite.scale.x;sprite.rotation=c.angle;
      sprite.tint=terminal?0x697781:0xffffff;
      const target=targets.find(t=>t.part===part);
      if(target&&charge>0){
        const dx=Math.cos(target.angle),dy=Math.sin(target.angle),end=pose.fieldHeight||pose.y+w;
        let length=Math.max(0,(end-18-target.muzzleY)/dy);
        if(dx>0&&pose.fieldWidth)length=Math.min(length,(pose.fieldWidth-18-target.muzzleX)/dx);
        if(dx<0)length=Math.min(length,(18-target.muzzleX)/dx);
        for(let distance=9;distance<length;distance+=34){
          const far=Math.min(distance+13,length);
          this.tells.moveTo(target.muzzleX+dx*distance,target.muzzleY+dy*distance)
            .lineTo(target.muzzleX+dx*far,target.muzzleY+dy*far)
            .stroke({color:0xffb875,width:1.5,alpha:.2+charge*.26});
        }
        this.tells.circle(target.muzzleX,target.muzzleY,3+charge*3)
          .fill({color:0xffc47d,alpha:.35+charge*(.1+.25*flash)});
      }
    }
    this.pivot.position.set(cx,cy);this.pivot.width=Math.min(100,w*.24);this.pivot.scale.y=this.pivot.scale.x;
    this.pivot.rotation=c.angle;this.pivot.tint=terminal?0x788793:0xffffff;
    for(const t of targets){
      const hp=e.hp[t.part]/e.maxHp[t.part],half=t.size*.34;
      this.tells.roundRect(t.x-half,t.y-t.size*.62,half*2,4,2).fill(0x06111b)
        .roundRect(t.x-half,t.y-t.size*.62,half*2*hp,4,2).fill(t.part==='pivot'?0x9bc9d4:0xffb875);
    }
    return targets;
  }
  destroy(){if(!this.root.destroyed){this.root.destroy({children:true});this.pistonTexture.destroy(false);}}
}
