import { Graphics, Sprite, Texture, Rectangle } from 'pixi.js';
import { Reassembly, MoltPlateClaims } from '../../game/CombatWrecks.js';
import { recordExpansionEvent } from '../../game/EncounterExpansionEvents.js';
import { getReducedMotionEnabled } from '../../config/AccessibilitySettings.js';
import {premiumTexture} from '../../effects/PremiumArt.js';
import {AudioManager} from '../../audio/AudioManager.js';

// Uses the existing Carrion atlas: salvage shell, tendon and gun pieces.
// Both targets use MysteryPart's score-free break lifecycle, never Enemy kills.
export class WreckweaverReassembly {
  constructor(actor) {
    this.actor = actor; this.model = new Reassembly(actor, actor.crossoverMolt
      ?new MoltPlateClaims(actor.crossoverMolt):actor.manager.combatWrecks);
    if(actor.crossoverMolt)this.model.searchSeconds=18;
    this.pieces=[];this.pieceTextures=[];
    this.lines = new Graphics(); this.lines.label = 'wreckweaver_tether'; actor.manager.container.addChild(this.lines);
    this.claws=[-1,1].map(side=>{const sprite=new Sprite(premiumTexture('weaverClaw'));sprite.anchor.set(.2,.15);sprite.width=58*actor.scale;sprite.scale.y=sprite.scale.x;
      sprite.visible=false;actor.manager.container.addChild(sprite);return{sprite,side};});
    actor.wreck.sprite.visible = false; this.lastState = 'search'; this.nextShot = 0;
  }
  worldTarget(part, name, textureSlot, x, y, hp, radius) {
    const a=this.actor;
    if (!part) {
      part=a.part(name,textureSlot,{height:76,hp,radius});
      part.contactSafeDuringEntry=true; part.noContactDamage=true; part.reassemblyTarget=true;
      part.update=()=>{
        const c=Math.cos(a.bank||0),s=Math.sin(a.bank||0),dx=part.x-a.x,dy=part.y-a.y;
        part.sprite.position.set(dx*c+dy*s,-dx*s+dy*c); part.sprite.rotation=(part.worldRotation||0)-(a.bank||0);
        part.state='ENTRY'; // Targetable projectile component; harmless to touch.
        part.radius=part.sprite.visible?part.hitRadius:0;
      };
      a.pendingTargets.push(part);
    }
    part.x=x; part.y=y; part.update(); return part;
  }
  update(dt) {
    const a=this.actor,m=this.model;
    const previous=m.state;
    m.update(dt,{alive:a.active&&(!a.crossoverMolt||!a.crossoverMolt.disposed&&a.crossoverMolt.chain.sections.some(e=>e.active)),ready:a.canAttack(),anchorAlive:this.anchor?.active!==false,platformAlive:this.platform?.active!==false});
    if(m.state!==previous){a.sound(m.state==='active'?'attack':m.state==='done'?'break':'warning');
      const cue={assembly:'weaver_claim',warning:'weaver_assembly',active:'weaver_arm',done:'tether_snap'}[m.state];
      if(cue)AudioManager.playSfx(`premium_${cue}`,{preserveGameplayRng:true});}
    if(m.state==='done'&&previous!=='done'&&a.active&&(this.anchor?.health===0||this.platform?.health===0))
      recordExpansionEvent(a.game,a.crossoverMolt?'crossover':'reassembly');
    this.lines.clear();
    if(['assembly','warning','active'].includes(m.state)) {
      const r=m.record,w=a.width,h=a.height;
      this.x=Math.max(w*.16,Math.min(w*.84,r.x)); this.y=Math.max(h*.32,Math.min(h*.56,r.y));
      this.anchor=this.worldTarget(this.anchor,'wreck_anchor','bottomLeft',this.x,this.y-36*a.scale,
        Math.max(3,a.maxHealth*.045),35);
      if(premiumTexture('captureCradle'))this.anchor.sprite.texture=premiumTexture('captureCradle');
      for(const {sprite,side}of this.claws){sprite.visible=true;sprite.position.set(a.x+side*36*a.scale,a.y+12*a.scale);
        sprite.rotation=getReducedMotionEnabled()?side*.35:Math.atan2(this.y-a.y,this.x-a.x)-Math.PI/2+side*(.25+Math.sin(m.age*3)*.06);}
      this.lines.circle(this.anchor.x,this.anchor.y,35*a.scale).stroke({color:0x83f6dd,width:2});
      if(m.state==='assembly') {
        this.lines.moveTo(a.x,a.y+30*a.scale).lineTo(this.anchor.x,this.anchor.y)
          .stroke({color:0xffb36e,width:3});
        // Several separate atlas pieces visibly rise towards the platform.
        if(!this.pieces.length){
          const source=r.texture||a.crossoverMolt?.texture||a.lease.frames.bottomRight;
          for(let i=0;i<3;i++){
            const f=source.frame,w=Math.floor(f.width/3);
            const texture=new Texture({source:source.source,frame:new Rectangle(f.x+i*w,f.y,w,f.height)});
            const piece=new Sprite(texture);piece.anchor.set(.5);piece.height=56*a.scale;piece.scale.x=piece.scale.y;
            this.pieceTextures.push(texture);this.pieces.push(piece);a.manager.container.addChild(piece);
          }
        }
        for(let i=0;i<3;i++) {
          a.wreck.sprite.visible=true; a.wreck.sprite.alpha=.85;
          const t=Math.min(1,m.age/1.2),piece=this.pieces[i];piece.visible=true;
          const reduced=getReducedMotionEnabled();piece.alpha=reduced?t:1;
          piece.position.set(reduced?this.x+(i-1)*14*a.scale:r.x+(i-1)*30*a.scale*(1-t),
            reduced?this.y:r.y+(this.y-r.y)*t-20*a.scale*t);
          this.lines.moveTo(r.x+(i-1)*22*a.scale,r.y).lineTo(this.x+(i-1)*14*a.scale,this.y-16*a.scale*m.age)
            .stroke({color:0xcbe6d2,width:2});
        }
        a.wreck.localX=(this.x-a.x)/a.scale; a.wreck.localY=(this.y-a.y)/a.scale;
      } else {
        this.pieces.forEach(p=>p.visible=false);
        a.wreck.sprite.visible=false;
        this.platform=this.worldTarget(this.platform,'rebuilt_gun','bottomRight',this.x,this.y,
          Math.max(4,a.maxHealth*.10),43);
        if(!a.crossoverMolt&&premiumTexture('weaverGun'))this.platform.sprite.texture=premiumTexture('weaverGun');
        if(a.crossoverMolt){this.platform.sprite.width=130*a.scale;this.platform.sprite.height=55*a.scale;}
        else{this.platform.sprite.height=100*a.scale;this.platform.sprite.scale.x=this.platform.sprite.scale.y;}
        if(a.crossoverMolt&&!this.core){
          this.platform.worldRotation=0;
          this.platform.sprite.texture=a.crossoverMolt.texture;
          this.platform.sprite.rotation=Math.PI/2-(a.bank||0);
          this.platform.sprite.width=130*a.scale;this.platform.sprite.height=55*a.scale;
          const base=this.platform.takeDamage.bind(this.platform);
          this.platform.takeDamage=amount=>base(amount*.35);
          this.core=this.worldTarget(null,'serpent_exposed_core','topRight',this.x-52*a.scale,this.y,
            this.platform.health,29);
          this.core.takeDamage=amount=>{const result=base(amount);this.core.health=this.platform.health;
            if(!this.platform.active){this.core.active=false;this.core.sprite.visible=false;}return result;};
        }
        if(this.core){this.core.health=this.platform.health;this.core.sprite.tint=0x83f6dd;
          this.lines.circle(this.core.x,this.core.y,29*a.scale).stroke({color:0x83f6dd,width:3});}
        this.lines.circle(this.x,this.y,48*a.scale).stroke({color:m.state==='warning'?0xffca75:0xff795e,width:3});
        this.lines.circle(this.anchor.x,this.anchor.y,35*a.scale).stroke({color:0x83f6dd,width:2});
        this.lines.moveTo(a.x,a.y+30*a.scale).quadraticCurveTo((a.x+this.anchor.x)/2,this.anchor.y-18*a.scale,this.anchor.x,this.anchor.y)
          .stroke({color:0xbca18b,width:4,alpha:.85});
        if(!a.crossoverMolt&&this.platform?.active&&!getReducedMotionEnabled())this.platform.sprite.rotation=Math.atan2(a.player().y-this.y,a.player().x-this.x)-Math.PI/2-(a.bank||0);
        if(m.state==='active'&&a.canAttack()&&a.age>=this.nextShot) {
          this.nextShot=a.age+1.75;
          const p=a.player(),angle=Math.atan2(p.y-this.y,p.x-this.x);
          a.volley(this.x,this.y,angle,3,.19,3.5,{weaponProfileId:'wreckweaver_platform',maxLifetimeMs:4800});
        }
      }
    } else if(m.state==='done') this.shutdown();
    if(previous!==m.state&&a.game.encounterEvolutionDiagnostics) {
      const log=a.game.encounterEvolutionLog;
      log.push({event:'reassembly',state:m.state,reason:m.reason,sector:a.level,at:a.game.runElapsedSeconds});
      if(log.length>160)log.shift();
    }
  }
  shutdown() {
    for(const part of [this.anchor,this.platform,this.core]) if(part){part.active=false;part.radius=0;part.sprite.visible=false;}
    this.pieces.forEach(p=>p.visible=false);
    this.claws.forEach(c=>c.sprite.visible=false);
    this.actor.wreck.sprite.visible=false;if(!this.lines.destroyed)this.lines.clear();
    for(const b of this.actor.bullets) if(b.active&&b.weaponProfileId==='wreckweaver_platform')
      this.actor.play.bulletManager.deactivateBullet(b,'reassembly_shutdown');
  }
  recover() { this.model.recover();this.nextShot=this.actor.age+.9;this.shutdownBullets(); }
  shutdownBullets(){for(const b of this.actor.bullets)if(b.active&&b.weaponProfileId==='wreckweaver_platform')this.actor.play.bulletManager.deactivateBullet(b,'reassembly_recovery');}
  stop(){this.model.stop('owner_cleanup');this.shutdown();}
  destroy(){this.stop();if(!this.lines.destroyed)this.lines.destroy();
    this.claws.forEach(c=>{if(!c.sprite.destroyed)c.sprite.destroy();});
    this.pieces.forEach(p=>{if(!p.destroyed)p.destroy();});this.pieceTextures.forEach(t=>t.destroy(false));this.pieceTextures=[];}
}
