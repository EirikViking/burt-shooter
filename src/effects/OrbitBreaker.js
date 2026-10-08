import {Container,Graphics,Sprite} from 'pixi.js';
import {OrbitBreakerModel,ORBIT_BREAKER,sweptOrbitTouches,sweptOrbitTouchesEllipse} from '../game/OrbitBreaker.js';
import {premiumTexture} from './PremiumArt.js';
import {AudioManager} from '../audio/AudioManager.js';
import {getReducedMotionEnabled,getFlashIntensityScale} from '../config/AccessibilitySettings.js';
import {combatFinishTexture} from './CombatFinish.js';
export class OrbitBreaker{
 constructor(player){this.player=player;this.model=new OrbitBreakerModel();this.age=0;this.hits=0;this.clears=0;this.ribbon=[];this.root=new Container();this.root.label='orbit_breaker';this.root.zIndex=4;
  player.game.scenes.play.gameContainer.addChild(this.root);this.trail=new Graphics();this.root.addChild(this.trail);
  this.headLight=new Sprite(combatFinishTexture());this.headLight.anchor.set(.5);this.headLight.tint=0xffbd69;this.headLight.blendMode='add';this.headLight.alpha=0;this.root.addChild(this.headLight);
  this.hammer=new Sprite(premiumTexture('orbitBreaker'));this.hammer.anchor.set(.8,.5);this.hammer.width=76;this.hammer.scale.y=this.hammer.scale.x;this.root.addChild(this.hammer);
  const scale=Math.max(.65,Math.min(1.25,player.game.getWidth()/1280));this.model.update(0,{x:player.x,y:player.y},ORBIT_BREAKER.radius*scale);this.hammer.position.set(this.model.position.x,this.model.position.y);this.hammer.rotation=this.model.angle;
  AudioManager.playSfx('premium_orbit_activate',{preserveGameplayRng:true});}
 update(dt){if(this.destroyed||!(dt>0))return;const p=this.player,s=p.game.scenes.play,m=s.enemyManager;
  if(!p.active||this.root.destroyed){this.destroy();return;}this.age+=Math.max(0,Math.min(.1,dt));
  const scale=Math.max(.65,Math.min(1.25,p.game.getWidth()/1280)),radius=ORBIT_BREAKER.radius*scale;
  this.model.update(dt,{x:p.x,y:p.y},radius);const {x,y}=this.model.position,reduced=getReducedMotionEnabled(),flash=getFlashIntensityScale();
  this.hammer.position.set(x,y);this.hammer.rotation=this.model.angle;this.hammer.width=76*scale;this.hammer.scale.y=this.hammer.scale.x;
  this.headLight.position.set(x,y);this.headLight.width=this.headLight.height=46*scale;this.headLight.alpha=flash*(this.impactUntil>this.age?.4:.16);
  this.ribbon.push({x,y});if(this.ribbon.length>8)this.ribbon.shift();
  this.trail.clear();if(!reduced){const points=this.ribbon;for(let i=1;i<points.length;i++)this.trail.moveTo(points[i-1].x,points[i-1].y).lineTo(points[i].x,points[i].y)
    .stroke({color:0xf6b266,width:6*scale,alpha:.12+i/points.length*.25});
    for(let i=Math.max(1,points.length-4);i<points.length;i++)this.trail.moveTo(points[i-1].x,points[i-1].y).lineTo(points[i].x,points[i].y).stroke({color:0xffe1ad,width:1.6*scale,alpha:.16+i/points.length*.25});}
  this.trail.moveTo(p.x,p.y).lineTo(x,y).stroke({color:0x77c9d2,width:1,alpha:.18});
  if(flash>0&&this.impactUntil>this.age)this.trail.circle(x,y,23*scale).stroke({color:0xffc56e,width:3,alpha:flash*.55});
  const hitRadius=ORBIT_BREAKER.hitRadius*scale,damage=Math.max(2,Math.min(8,(Number(p.bulletDamage)||1)*2.5));let budget=ORBIT_BREAKER.maxTargetsPerTick;
  const touches=(target,r)=>Math.abs(target.x-p.x)<radius+r+25&&Math.abs(target.y-p.y)<radius+r+25
    &&sweptOrbitTouches(this.model.samples,target.x,target.y,r+hitRadius);
  for(const e of m.enemies){if(budget<=0)break;if(!e?.active||e.untargetable||e.waitingForEntry||e.isDeparting?.()||!this.model.canHit(e,this.age))continue;
   if(!touches(e,s.getCollisionRadius(e)))continue;this.model.noteHit(e,this.age);budget--;this.impact(e.x,e.y);
   const killed=s.applyCombatDamage(e,damage,'orbit_breaker');
   if(killed){if(!p.isSlowTimeActive?.())p.game.addScore(s.getNormalWaveScoreAward(s.getComboScore(e.scoreValue),e));
     s.onEnemyKilled(e);s.playEnemyDeathFeedback(e,{color:0xffb45d,intensity:.8});}
  }
  for(const b of s.bulletManager.enemyBullets){if(!b.active||!touches(b,Number(b.radius)||5))continue;
    s.bulletManager.deactivateBullet(b,'orbit_breaker');this.clears++;}
  const director=s.firstLightDirector,event=director?.model.encounter;
  if(event&&director.view){
    if(this.contactOwner!==event){this.contactOwner=event;this.contactHits=new Map();}
    // Snapshot the currently exposed parts. Newly exposed cores wait for the
    // next actual swing, just like the existing projectile/blast lifecycle.
    for(const t of [...director.view.targets]){if(budget<=0||!touches(t,t.radius)||this.age-(this.contactHits.get(t.part)??-100)<ORBIT_BREAKER.hitCooldown)continue;
      const result=director.model.hit(t.part,damage,{});if(!result)continue;this.contactHits.set(t.part,this.age);budget--;
      director.presentHit(result,t,event);this.impact(t.x,t.y);}
  }
  // Actual neutral cover is damageable, and never enters enemy reward hooks.
  for(const molt of m.serpentMolts||[])for(const plate of molt.model.plates){if(!plate.active||!this.model.canHit(plate,this.age)||!sweptOrbitTouchesEllipse(this.model.samples,plate.x,plate.y,plate.rx,plate.ry,hitRadius))continue;
   this.model.noteHit(plate,this.age);molt.model.hitPlate(plate,damage,{});this.impact(plate.x,plate.y);if(!plate.active)molt.destroyedPlates++;}
  for(const cover of m.environment?.covers||[]){if(!cover.active||!this.model.canHit(cover,this.age)||!sweptOrbitTouchesEllipse(this.model.samples,cover.x,cover.y,cover.rx,cover.ry,hitRadius))continue;
   this.model.noteHit(cover,this.age);m.environment.hitCover(cover,damage,{});this.impact(cover.x,cover.y);}
 }
 impact(x,y){this.hits++;this.impactUntil=this.age+.1;const s=this.player.game.scenes.play;
  s.particleManager?.premiumImpacts.emit(x,y,42,'impact',this.model.angle);AudioManager.playSfx('premium_orbit_hit',{preserveGameplayRng:true});}
 destroy(){if(this.destroyed)return;this.destroyed=true;this.model.clear();if(!this.root.destroyed)this.root.destroy({children:true});}
}
