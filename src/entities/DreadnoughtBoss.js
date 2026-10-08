import { Assets, Container, Graphics, Sprite, Texture, Rectangle } from 'pixi.js';
import { Boss } from './Boss.js';
import { Bullet } from './Bullet.js';
import { EncounterComponent } from './EncounterComponent.js';
import { BreachModel } from '../game/DreadnoughtBreach.js';
import { prewarmPremiumArt } from '../effects/PremiumArt.js';
import { DreadnoughtRig } from '../effects/DreadnoughtRig.js';
import { claimMajorTelegraph } from '../config/EncounterPacing.js';
import { AudioManager } from '../audio/AudioManager.js';
import { getReducedMotionEnabled } from '../config/AccessibilitySettings.js';
import { BreachCollapse } from '../effects/BreachCollapse.js';
import { recordExpansionEvent } from '../game/EncounterExpansionEvents.js';

let artPromise;
export class DreadnoughtBoss extends Boss {
  static prewarm(){return artPromise ||= prewarmPremiumArt().then(a=>[a.dreadnought,a.battery,a.relay,a.reactorClosed]);}
  constructor(x,y,level,game,profile,layout=0){
    super(x,y,level,game,{...profile,name:'Dreadnought Breach',title:'Dreadnought Breach'});
    this.isDreadnought=true;this.untargetable=true;this.noContactDamage=true;
    this.breach=new BreachModel(this.health,layout);this.age=0;this.warning=null;this.nextAttack=1.8;
    this.lastLives=game.lives;this.shots=[];this.x=-game.getWidth();this.y=-game.getHeight();
    this.bossType='DREADNOUGHT BREACH';this.name='Dreadnought Breach';this.ownedTextures=[];this.components=[];
  }
  async createSprite(){
    // EnemyManager applies its deep-run health cap after construction. Build
    // components from that final budget, before any damage can be taken.
    this.breach=new BreachModel(this.health,this.breach.layout.id==='diagonal_battery'?1:0);
    const [hull,gun,relay,reactor]=await DreadnoughtBoss.prewarm();
    const w=this.game.getWidth(),h=this.game.getHeight();this.sprite=new Container();this.sprite.label='dreadnought_battlefield';this.sprite.zIndex=0;
    this.panels=[-1,1].map(side=>{
      const frame=new Rectangle(hull.frame.x+(side<0?0:Math.floor(hull.width*.5)),hull.frame.y,Math.floor(hull.width*.5),hull.height);
      const texture=new Texture({source:hull.source,frame});this.ownedTextures.push(texture);
      const panel=new Sprite(texture);panel.anchor.set(side<0?1:0,.5);panel.width=w*.49;panel.scale.y=panel.scale.x;
      panel.position.set(w*.5,h*.26);panel.alpha=1;this.sprite.addChild(panel);return panel;
    });
    this.links=new Graphics();this.sprite.addChild(this.links);
    for(const p of this.breach.parts){
      const texture=p.role==='gun'?gun:p.role==='relay'?relay:reactor;
      const component=new EncounterComponent(this,{id:p.id,health:p.health,width:p.role==='gun'?105:p.role==='relay'?47:90,
        rotation:0,radius:p.role==='relay'?30:43},texture,(c,amount)=>this.hitComponent(c,amount));
      component.part=p;this.components.push(component);
    }
    this.rig=new DreadnoughtRig(this);this.syncParts();
    AudioManager.playSfx('premium_breach_arrive',{preserveGameplayRng:true});return this.sprite;
  }
  syncParts(){
    this.phase=['reactor','collapse'].includes(this.breach.stage)?3:this.breach.stage==='hull'?2:1;
    const w=this.game.getWidth(),h=this.game.getHeight();
    for(const c of this.components){const p=c.part;
      // EnemyManager sweeps dead components independently while the root
      // continues fighting. Their irreversible model state remains valid.
      if(c.sprite?.destroyed||!c.sprite?.position){c.active=false;continue;}
      c.x=w*p.pos[0];c.y=h*p.pos[1];c.sprite.position.set(c.x,c.y);
      c.health=p.health;c.active=this.active&&p.health>0;c.untargetable=!this.breach.targetable(p);
      c.sprite.visible=c.active;c.body.alpha=c.untargetable?.27:1;c.ring.clear();
      if(c.active&&!c.untargetable)c.ring.circle(0,0,c.radius).stroke({color:p.role==='relay'?0x80efd7:p.role==='reactor'?0xffae76:0xd5e8f1,width:2});
    }
    this.health=this.breach.health;
  }
  hitComponent(component,amount){
    const old=this.breach.stage,spent=this.breach.hit(component.type,amount);if(!spent)return;
    this.game.scenes.play.particleManager?.createHitSpark(component.x,component.y,0xffb566,.6);
    this.rig?.hit(component);
    if(component.part.health===0)AudioManager.playSfx('premium_armour_break',{preserveGameplayRng:true});
    this.syncParts();
    if(old!==this.breach.stage){this.warning=null;this.nextAttack=this.age+.95;
      AudioManager.playSfx(this.breach.stage==='reactor'?'premium_reactor_open':'premium_hull_open',{preserveGameplayRng:true});}
    if(this.breach.defeated)this.finishFromComponent(component);
  }
  finishFromComponent(component){
    if(!this.active||this.clearCredited)return;this.clearCredited=true;this.health=0;this.active=false;this.x=component.x;this.y=component.y;
    recordExpansionEvent(this.game,'breach',{layout:this.breach.layout.id});
    this.clearOwnedShots();const play=this.game.scenes.play;
    // This is reached only from real component damage, never a scripted phase
    // timer. Preserve the ordinary boss score hook once, with no part rewards.
    if(!play.player?.isSlowTimeActive?.())this.game.addScore(play.getNormalWaveScoreAward(play.getComboScore(this.scoreValue),this));
    play.onEnemyKilled(this);this.triggerDefeatPresentation();
    const manager=play.enemyManager;manager.breachCollapses||=new Set();manager.breachCollapses.add(new BreachCollapse(manager,this.panels));
    AudioManager.playSfx('premium_breach_collapse',{preserveGameplayRng:true});
    for(const c of this.components){c.active=false;c.sprite.visible=false;}
    play.particleManager?.createExplosion(component.x,component.y,0xffab72,1.8);
    this.warning=null;
  }
  canShoot(){return false;}
  takeDamage(){return false;}
  updateHealthBar(){}
  update(delta){
    if(!this.active)return;const dt=Math.min(.1,Math.max(0,delta/60));this.age+=dt;
    if(this.game.lives<this.lastLives){this.warning=null;this.nextAttack=this.age+2.8;this.clearOwnedShots();}
    this.lastLives=this.game.lives;this.syncParts();this.links.clear();
    const w=this.game.getWidth(),h=this.game.getHeight(),entry=Math.min(1,this.age/1.25),reduced=getReducedMotionEnabled();
    this.rig.update(delta);
    for(const c of this.components){if(!c.active||c.part.role!=='gun')continue;
      const relay=this.components.find(r=>r.type===c.part.link);
      if(relay?.active)this.links.moveTo(c.x,c.y).lineTo(relay.x,relay.y).stroke({color:0x80efd7,width:2,alpha:.75});
      c.body.tint=this.breach.powered(c.part)?0xffffff:0x53676c;
    }
    const player=this.game.scenes.play.player;
    if(this.age>=this.nextAttack&&!this.warning&&claimMajorTelegraph(this.game,this,.95)){
      const origins=this.components.filter(c=>c.active&&c.part.role==='gun'&&this.breach.powered(c.part));
      if(this.breach.stage==='reactor')origins.push(this.components.find(c=>c.part.role==='reactor'));
      // Hull discharge replaces lost batteries, with fewer rounds and a wide
      // open flank. No wall, collision slab, compulsory Phase or blind crush.
      if(!origins.length&&this.breach.stage==='hull')origins.push(this.components.find(c=>c.part.role==='hull'));
      this.warning={at:this.age,origins:origins.filter(c=>c?.active).map(c=>({c,angle:Math.atan2(player.y-c.y,player.x-c.x)}))};
      AudioManager.playSfx('premium_battery_charge',{preserveGameplayRng:true});
    }
    if(this.warning){
      for(const {c,angle}of this.warning.origins)if(c.active)this.links.moveTo(c.x,c.y).lineTo(c.x+Math.cos(angle)*h*.40,c.y+Math.sin(angle)*h*.40)
        .stroke({color:0xffbb7b,width:3,alpha:.85});
      if(this.age-this.warning.at>=.95){
        for(const {c,angle}of this.warning.origins)if(c.active&&(c.part.role!=='gun'||this.breach.powered(c.part))){
          const count=c.part.role==='reactor'?5:3;c.lastFiredAt=this.age;
          this.game.scenes.play.particleManager?.premiumImpacts.emit(c.x,c.y,45,'impact',angle);
          for(let i=0;i<count;i++){
            const a=angle+(i-(count-1)/2)*.22,speed=3.2;
            const b=new Bullet(c.x,c.y,Math.cos(a)*speed,Math.sin(a)*speed,1,0xff795a,false,
              {weaponProfileId:'dreadnought_battery',maxLifetimeMs:5000});b.bossOwner=this;
            if(this.game.scenes.play.bulletManager.addEnemyBullet(b))this.shots.push(b);
          }
        }
        this.warning=null;this.nextAttack=this.age+(this.breach.stage==='reactor'?1.8:2.5);
        AudioManager.playSfx('premium_battery_fire',{preserveGameplayRng:true});
      }
    }
    this.shots=this.shots.filter(b=>b.active);
  }
  clearOwnedShots(){for(const b of this.shots)if(b.active)this.game.scenes.play.bulletManager.deactivateBullet(b,'dreadnought_cleanup');this.shots=[];}
  destroy(){if(this.breachDestroyed)return;this.breachDestroyed=true;this.active=false;this.warning=null;this.clearOwnedShots();
    this.rig?.destroy();super.destroy();for(const c of this.components)c.destroy();if(this.sprite&&!this.sprite.destroyed)this.sprite.destroy({children:true});
    this.ownedTextures.forEach(t=>t.destroy(false));this.ownedTextures=[];}
}
