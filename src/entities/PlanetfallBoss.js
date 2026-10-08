import {Container,Texture} from 'pixi.js';
import {Boss} from './Boss.js';
import {Bullet} from './Bullet.js';
import {EncounterComponent} from './EncounterComponent.js';
import {PlanetfallModel,PLANETFALL} from '../game/Planetfall.js';
import {prewarmPremiumArt,premiumTexture} from '../effects/PremiumArt.js';
import {PlanetfallVisual,PlanetfallCollapse,planetfallLayout,planetfallShots} from '../effects/PlanetfallVisual.js';
import {claimMajorTelegraph} from '../config/EncounterPacing.js';
import {AudioManager} from '../audio/AudioManager.js';
import {PlanetfallAudio} from '../audio/PlanetfallAudio.js';

export class PlanetfallBoss extends Boss{
  constructor(x,y,level,game,profile){
    super(x,y,level,game,{...profile,id:'planetfall',name:'Planetfall',title:'Planetfall'});
    this.isPlanetfall=true;this.untargetable=true;this.noContactDamage=true;this.name='Planetfall';this.bossType='Planetfall';
    this.x=-game.getWidth();this.y=-game.getHeight();this.components=[];this.shots=[];this.lastLives=game.lives;
    this.planetfall=new PlanetfallModel(this.health);this.interrupted=false;this.lastSize='';
  }
  async createSprite(){
    this.planetfall=new PlanetfallModel(this.health);
    try{await prewarmPremiumArt();}catch(error){console.warn('[Planetfall] Art unavailable; readable fallback active',error);}
    if(this.planetfallDestroyed)return null;
    this.sprite=new Container();this.sprite.label='planetfall_battlefield';
    for(const part of this.planetfall.parts){
      const c=new EncounterComponent(this,{id:part.id,health:part.health,width:80,radius:35},
        premiumTexture(part.role==='core'?'reactorClosed':'relay')||Texture.EMPTY,(component,amount)=>this.hitComponent(component,amount));
      c.part=part;this.components.push(c);
    }
    this.visual=new PlanetfallVisual(this);this.audio=new PlanetfallAudio(AudioManager);this.syncParts();this.visual.update(0);
    this.onInterruption=()=>this.interrupt();this.onBlur=()=>{this.focusLost=true;this.interrupt();};this.onFocus=()=>{this.focusLost=false;this.interrupt();};
    window.addEventListener('blur',this.onBlur);window.addEventListener('focus',this.onFocus);document.addEventListener('visibilitychange',this.onInterruption);
    return this.sprite;
  }
  syncParts(){
    const m=this.planetfall,{cx,cy,rx,ry,coreWidth,anchorWidth}=planetfallLayout(this.game.getWidth(),this.game.getHeight());
    this.phase=m.stage==='rupture'?2:1;
    for(const [i,c]of this.components.entries()){
      if(c.sprite?.destroyed){c.active=false;continue;}
      const core=c.part.role==='core',angle=i*Math.PI/2+Math.PI/4,width=core?coreWidth:anchorWidth;
      c.x=core?cx:cx+Math.cos(angle)*rx;c.y=core?cy:cy+Math.sin(angle)*ry;
      c.sprite.position.set(c.x,c.y);c.body.width=width;c.body.scale.y=c.body.scale.x;c.radius=width*(core?.42:.48);
      c.health=c.part.health;c.active=this.active&&c.health>0;c.untargetable=!m.targetable(c.part);c.sprite.visible=c.active;
    }
    this.health=m.health;
  }
  hitComponent(component,amount){
    const previous=this.planetfall.stage,spent=this.planetfall.hit(component.type,amount);if(!spent)return;
    this.visual.hit(component);this.game.scenes.play.particleManager?.createHitSpark(component.x,component.y,0xf4cf87,.6);
    if(component.part.health===0&&component.part.role==='anchor'){this.visual.detach(Number(component.type.slice(-1)));this.audio?.event('anchor');}
    if(previous!=='rupture'&&this.planetfall.stage==='rupture')this.audio?.event('rupture');
    this.syncParts();if(this.planetfall.defeated)this.finishFromComponent(component);
  }
  finishFromComponent(component){
    if(!this.active||this.clearCredited)return;this.clearCredited=true;this.active=false;this.health=0;this.x=component.x;this.y=component.y;
    this.interrupt();const play=this.game.scenes.play;
    if(!play.player?.isSlowTimeActive?.())this.game.addScore(play.getNormalWaveScoreAward(play.getComboScore(this.scoreValue),this));
    play.onEnemyKilled(this);this.triggerDefeatPresentation();
    const manager=play.enemyManager,collapse=new PlanetfallCollapse(manager,this.visual);this.collapse=collapse;manager.breachCollapses||=new Set();manager.breachCollapses.add(collapse);
    this.sprite.visible=false;
    this.audio?.event('collapse');collapse.audio=this.audio;this.audio=null;
    for(const c of this.components){c.active=false;if(!c.sprite.destroyed)c.sprite.visible=false;}
  }
  syncInterruption(){
    if(!this.collapse?.done)this.collapse?.syncInterruption();
    const s=this.game.scenes.play,size=`${this.game.getWidth()}:${this.game.getHeight()}`;
    const blocked=Boolean(s.isPaused||s.tacticalDraft?.active||s.overrunMilestoneInterlude?.active||s.gameOverSequenceStarted||s.gameOverInterlude?.active
      ||!s.player?.active||this.game.lives<=0||this.focusLost||document.visibilityState==='hidden'||s.introActive||s.bossIntroActive||s.activeBossIntroCard?.parent);
    if(blocked||this.game.lives<this.lastLives||(this.lastSize&&size!==this.lastSize))this.interrupt();
    this.interrupted=blocked;this.lastLives=this.game.lives;this.lastSize=size;return blocked;
  }
  interrupt(){this.planetfall.interrupt();this.clearOwnedShots();this.audio?.suspend();this.visual?.signals.clear();}
  update(delta){
    if(!this.active||!Number.isFinite(delta)||delta<0||this.syncInterruption())return;
    const m=this.planetfall;m.update(delta/60);this.syncParts();const player=this.game.scenes.play.player;
    if(!m.warning&&m.age>=m.nextAttack&&claimMajorTelegraph(this.game,this,PLANETFALL.warningSeconds)){
      m.beginWarning(this.components.filter(c=>c.active).map(c=>{const y=c.y+(c.part.role==='core'?c.radius*.8:0);
        return {part:c.type,x:c.x,y,angle:Math.atan2(player.y-y,player.x-c.x)};}));
    }
    this.audio?.update(m);const volley=m.consumeVolley();if(volley.length){this.audio?.event('fire');this.visual.fire();}
    for(const origin of volley)for(const shot of planetfallShots(origin)){
      const b=new Bullet(shot.x,shot.y,Math.cos(shot.angle)*3.2,Math.sin(shot.angle)*3.2,1,0xffa376,false,
        {weaponProfileId:'planetfall_discharge',maxLifetimeMs:5000});b.bossOwner=this;
      if(this.game.scenes.play.bulletManager.addEnemyBullet(b))this.shots.push(b);
    }
    this.shots=this.shots.filter(b=>b.active);this.visual.update(delta);
  }
  canShoot(){return false;}
  takeDamage(){return false;}
  updateHealthBar(){}
  clearOwnedShots(){for(const b of this.shots)if(b.active)this.game.scenes.play.bulletManager.deactivateBullet(b,'planetfall_cleanup');this.shots=[];}
  destroy(){
    if(this.planetfallDestroyed)return;this.planetfallDestroyed=true;this.active=false;this.interrupt();
    window.removeEventListener('blur',this.onBlur);window.removeEventListener('focus',this.onFocus);document.removeEventListener('visibilitychange',this.onInterruption);
    this.audio?.destroy();this.visual?.destroy();super.destroy();for(const c of this.components)c.destroy();
    if(this.sprite&&!this.sprite.destroyed)this.sprite.destroy({children:true});
  }
}
