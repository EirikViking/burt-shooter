import { Container, Graphics, Sprite } from 'pixi.js';
import {premiumTexture} from './PremiumArt.js';
import {getReducedMotionEnabled,getFlashIntensityScale} from '../config/AccessibilitySettings.js';
import { Bullet } from '../entities/Bullet.js';
import { planRiftEchoes,capturedVolley,CAPTURE_RULES } from '../game/BehavioralFusions.js';
import { AudioManager } from '../audio/AudioManager.js';
import { getRunModeProfile } from '../game/RunMode.js';
import { recordExpansionEvent } from '../game/EncounterExpansionEvents.js';

export class BehavioralFusions{
  constructor(manager){this.manager=manager;this.game=manager.game;this.age=0;this.queue=[];this.capture=null;this.lastLives=this.game.lives;
    this.root=new Container();this.root.label='behavioral_fusion_sources';this.root.zIndex=75;manager.container.addChild(this.root);
    this.echoInk=new Graphics();this.root.addChild(this.echoInk);this.echoes=[];
    this.echoViews=Array.from({length:2},()=>{const s=new Sprite();s.anchor.set(.5);s.visible=false;s.tint=0xbba0ff;this.root.addChild(s);return s;});}
  targets(){const w=this.game.getWidth(),h=this.game.getHeight();return this.manager.enemies.filter(e=>e.active&&!e.untargetable
    &&e.health>0&&e.x>=0&&e.x<=w&&e.y>=0&&e.y<h*.8&&!e.isDeparting?.());}
  tactical(){return getRunModeProfile(this.game.runMode).tacticalDraftEnabled
    &&this.game.scenes.play.player?.runAugmentModifiers;}
  queueRift({start,end,count,damage,token}){
    const mods=this.tactical();if(!mods?.riftCrossfire)return 0;
    const target=this.targets().sort((a,b)=>Math.hypot(a.x-end.x,a.y-end.y)-Math.hypot(b.x-end.x,b.y-end.y))[0];
    const plan=planRiftEchoes(start,end,count,Boolean(target),this.game.getWidth()*.0375);
    // Replace an older pending pulse; no backlog can multiply the five-shot cap.
    this.queue=this.queue.filter(q=>q.id!=='rift_crossfire');this.echoes=[];
    for(const p of plan){this.queue.push({...p,at:this.age+p.delay,damage,target,id:'rift_crossfire',token});
      if(!this.echoes.some(e=>e.x===p.x&&e.y===p.y))this.echoes.push({x:p.x,y:p.y,until:this.age+.9});}
    if(plan.length){this.game.scenes.play.recordThreatDiscovery?.('fusion_rift_crossfire','enemies',{sector:this.game.level},{scoreBonus:false,silent:true});
      AudioManager.playSfx('premium_rift_ignite',{preserveGameplayRng:true});}
    return plan.length;
  }
  clearCapture(reason='expired'){
    if(this.capture){this.game.scenes.play.player.lastTacticalFusionEvent={id:'salvage_crown',status:reason,at:Date.now()};
      this.capture.view.destroy({children:true});this.capture=null;}
    this.queue=this.queue.filter(q=>q.id!=='salvage_crown');
  }
  update(delta){const dt=Math.min(.1,Math.max(0,delta/60));this.age+=dt;const play=this.game.scenes.play,player=play.player,mods=this.tactical();
    if(this.game.lives<this.lastLives){this.clear();this.manager.combatWrecks.clear();this.lastLives=this.game.lives;return;}this.lastLives=this.game.lives;
    if(!player?.active||!mods){this.clear();return;}
    if(!mods.salvageCrown)this.clearCapture('unavailable');
    if(mods.salvageCrown&&!this.capture){
      const r=this.manager.combatWrecks.reserve(this,r=>!r.owner&&r.texture&&!r.fromCapture&&r.y<this.game.getHeight()*.8);
      if(r&&this.manager.combatWrecks.consume(r,this)){
        const view=new Container(),weapon=new Sprite(r.texture),edge=new Graphics();weapon.anchor.set(.5);weapon.width=42;weapon.scale.y=weapon.scale.x;
        const cradle=new Sprite(premiumTexture('captureCradle'));cradle.anchor.set(.5);cradle.width=68;cradle.scale.y=cradle.scale.x;cradle.tint=0x82fff1;
        view.addChild(cradle,weapon,edge);this.root.addChild(view);
        edge.moveTo(-27,12).lineTo(-18,20).lineTo(18,20).lineTo(27,12).stroke({color:0x82fff1,width:3});
        this.capture={record:r,view,age:0,ammo:CAPTURE_RULES.ammunition,next:this.age+.25};
        player.lastTacticalFusionEvent={id:'salvage_crown',status:'captured',pattern:r.pattern,at:Date.now(),ammunition:9};
        play.recordThreatDiscovery?.('fusion_salvage_crown','enemies',{sector:this.game.level},{scoreBonus:false,silent:true});
        AudioManager.playSfx('premium_salvage_capture',{preserveGameplayRng:true});
      }
    }
    if(this.capture){const c=this.capture;c.age+=dt;
      // Player drone containers store local offsets, as ordinary drone shots do.
      const wing=player.drones?.at(-1);c.x=player.x+(wing?.x??62);c.y=player.y+(wing?.y??0)-35;c.view.position.set(c.x,c.y);
      if(c.age>=CAPTURE_RULES.seconds||c.ammo===0&&!this.queue.some(q=>q.id==='salvage_crown')){
        if(c.ammo<CAPTURE_RULES.ammunition)recordExpansionEvent(this.game,'salvage',{pattern:c.record.pattern});this.clearCapture();}
      else if(this.age>=c.next&&c.ammo>0){const target=this.targets().sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
        if(target){const shots=capturedVolley(c.record.pattern,c.ammo);c.next=this.age+CAPTURE_RULES.cooldown;c.ammo-=shots.length;
          for(const p of shots)this.queue.push({...p,at:this.age+p.delay,x:c.x,y:c.y,damage:Math.max(.25,Math.min(CAPTURE_RULES.damageCap,player.bulletDamage*.7)),target,
            id:'salvage_crown',pattern:c.record.pattern});
          player.lastTacticalFusionEvent={id:'salvage_crown',status:'active',pattern:c.record.pattern,ammunition:c.ammo,remainingSeconds:Math.max(0,6-c.age),at:Date.now()};}
      }
    }
    const due=this.queue.filter(q=>q.at<=this.age);this.queue=this.queue.filter(q=>q.at>this.age);
    for(const q of due){if(!q.target.active||q.target.untargetable||q.target.isDeparting?.())continue;
      const dx=q.target.x-q.x,dy=q.target.y-q.y,angle=Math.atan2(dy,dx)+(q.angle||0),speed=q.speed||player.bulletSpeed*1.36;
      const b=new Bullet(q.x,q.y,Math.cos(angle)*speed,Math.sin(angle)*speed,q.damage,q.id==='salvage_crown'?0x82fff1:0xd86bff,true,
        {fusionShard:true,maxLifetimeMs:3500});b.isTacticalFusionShot=true;b.isBehavioralFusionShot=true;b.tacticalFusionId=q.id;
      if(q.id==='rift_crossfire'){b.isTacticalRiftShard=true;b.riftPulseToken=q.token;b.riftShardIndex=q.index;
        b.riftTargetId=String(q.target.id||q.target.type||q.target.kind);}
      if(play.bulletManager.addPlayerBullet(b)){play.recordCombatVolley?.([b]);
        if(q.id==='rift_crossfire')player.tacticalFusionStats.riftShardsFired++;
        else player.tacticalFusionStats.salvageShotsFired=(player.tacticalFusionStats.salvageShotsFired||0)+1;}
    }
    this.echoes=this.echoes.filter(e=>e.until>this.age);this.echoInk.clear();
    for(let i=0;i<this.echoViews.length;i++){const v=this.echoViews[i],e=this.echoes[i];v.visible=Boolean(e);if(!e)continue;
      const texture=premiumTexture('reactorOpen');if(texture)v.texture=texture;
      const fade=Math.min(1,(e.until-this.age)/.25);v.position.set(e.x,e.y);v.width=54+(getReducedMotionEnabled()?0:Math.sin((e.until-this.age)*5)*5);v.scale.y=v.scale.x;v.alpha=fade*(.45+getFlashIntensityScale()*.2);}
    for(const e of this.echoes)this.echoInk.moveTo(e.x,e.y-17).lineTo(e.x-12,e.y+10).lineTo(e.x,e.y+3).lineTo(e.x+12,e.y+10).closePath()
      .stroke({color:0xb99bff,width:2,alpha:Math.min(.85,(e.until-this.age)*2)});
  }
  clear(){this.clearCapture('cleanup');this.queue=[];this.echoes=[];for(const v of this.echoViews)if(!v.destroyed)v.visible=false;if(!this.echoInk.destroyed)this.echoInk.clear();}
  snapshot(){const c=this.capture,queued=this.queue.filter(q=>q.id==='rift_crossfire').length;
    return {salvage_crown:{label:c?'CAPTURE ACTIVE · {shots} SHOTS · {seconds}s':this.game.scenes.play.player.lastTacticalFusionEvent?.status==='expired'?'CAPTURE EXPIRED':'AWAITING WRECK',
      parameters:{shots:c?.ammo||0,seconds:Math.ceil(Math.max(0,6-(c?.age||0)))}},
      rift_crossfire:{label:queued?'ECHOES QUEUED · {shots}':'FUSION PROTOCOL',parameters:{shots:queued}}};}
  destroy(){this.clear();if(!this.root.destroyed)this.root.destroy({children:true});}
}























































