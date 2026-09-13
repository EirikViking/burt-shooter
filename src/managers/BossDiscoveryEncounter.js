import { bossCombinationAdmission, claimMajorTelegraph } from '../config/EncounterPacing.js';
import {Boss} from '../entities/Boss.js';
import {getBossProfileForRun} from '../config/BossRoster.js';
import {getSpaceSnakesForLevel} from '../config/SpaceSnakes.js';
import {planBossDiscovery} from '../config/DiscoveryProgression.js';
import {translateText} from '../i18n/index.js';
import {AudioManager} from '../audio/AudioManager.js';
import {CreatureAudio} from '../audio/CreatureAudio.js';

// A rare encounter replaces the ordinary support lottery. It never owns score,
// sector completion or a draft. EnemyManager completes the encounter once.
export class BossDiscoveryEncounter {
  constructor(manager, primary, options={}) {
    this.manager=manager;this.primary=primary;this.baseHealth=primary.maxHealth;
    this.seed=manager.game?.contentDirector?.seed||manager.game?.gameId||'nova-swarm';
    const candidate=planBossDiscovery(manager.level,this.seed,options);
    this.deferred=candidate ? bossCombinationAdmission(manager, options.forced) : null;
    const mysteryPlan=manager.mysteryDirector?.plan;
    if(candidate && !options.forced && mysteryPlan?.selected && mysteryPlan.bossWave && !mysteryPlan.spawned) this.deferred='scheduled-mystery-escort';
    this.plan=this.deferred ? null : candidate;
    this.age=0;this.stage='waiting';this.snake=null;this.guest=null;
    this.immediateReinforcement=Boolean(options.immediateReinforcement);
    this.nextWarningAt=0;this.lastLives=manager.game.lives;
    if(this.plan){
      primary.health*=this.plan.primaryHealthRatio;
      primary.maxHealth*=this.plan.primaryHealthRatio;
      this.prepareBoss(primary);
      primary.updateHealthBar?.();
      if(this.plan.kind!=='snake') void this.prepareGuest();
    }
  }
  prepareBoss(boss){
    boss.discoveryCoordinator=this;
    // Durability comes from visible health, not the ordinary fast-kill armor
    // gate, which also silences a boss while its health is being depleted.
    boss.minimumFightMs=0;boss.armorBleedGuideMs=0;boss.finishGateUntilMs=0;
  }
  claimAttack(source,category){
    if(this.disposed||!this.plan)return true;
    if(this.age<this.nextWarningAt)return false;
    const bosses=[this.primary,this.guest].filter(b=>b?.active);
    if(bosses.some(b=>b!==source&&b.attackWarningToken))return false;
    const play=this.manager.game.scenes.play;
    // Existing shots stay in flight. Back-pressure postpones the NEXT windup;
    // it never erases a telegraphed attack or creates periodic free-screen wipes.
    const liveShots=play.bulletManager?.enemyBullets?.filter(b=>b.active).length||0;
    if(liveShots>=this.plan.maxHostileProjectiles)return false;
    if(category==='signature' && !claimMajorTelegraph(this.manager.game,source,1.4))return false;
    this.nextWarningAt=this.age+this.plan.warningSpacingMs;
    return true;
  }
  announce(key) {
    this.manager.game.scenes.play.showToast?.(translateText(key),{
      slot:'top',channel:'major',priority:8,duration:1800,fontSize:24,restrained:true
    });
    AudioManager.playSfx('boss_reveal_stinger',{volume:.8,minIntervalMs:1000});
  }
  update(delta) {
    if(!this.plan||this.disposed)return false;
    this.age+=Math.max(0,Math.min(100,delta*1000/60));
    const m=this.manager, p=this.primary;
    if(this.stage==='waiting'&&(p.active||p.health<=0)&&(this.immediateReinforcement||p.health/p.maxHealth<this.plan.threshold)){
      this.stage='warning';this.releaseAt=this.age+this.plan.warningMs;
      this.announce(this.plan.kind==='snake'?'SERPENT CONTACT — COMBINED ASSAULT':'SECOND BOSS SIGNAL — CROSSFIRE');
    }
    if(this.stage==='warning'&&this.age>=this.releaseAt){
      this.stage='loading';
      if(this.plan.kind==='snake'){this.spawnSnake();this.stage='active';}
      else if(this.readyGuest)this.attachGuest();
    }
    if(this.stage==='loading'&&this.readyGuest)this.attachGuest();
    if(this.stage==='loading'&&this.age-this.releaseAt>8000){this.stage='failed';this.destroyPreparedGuest();}
    const guest=this.guest;
    if(guest?.active && p.health<=0){m.boss=guest;m.bossSpawnedAtMs=guest.spawnedAtMs-2000;}
    if(this.plan.kind==='relay_snake'&&guest?.active&&guest.health/guest.maxHealth<.20&&!this.snakeTriggered){
      this.snakeTriggered=true;this.snakeReleaseAt=this.age+1800;
      this.announce('SERPENT CONTACT — COMBINED ASSAULT');
    }
    if(this.snakeReleaseAt&&this.age>=this.snakeReleaseAt){this.snakeReleaseAt=null;this.spawnSnake();}
    const liveSnake=this.snake?.sections.some(section=>section.active);
    if(liveSnake&&this.age-this.snakeAt>=this.plan.snakeSeconds*1000)this.clearSnake();
    const snakeActive=this.snake?.sections.some(section=>section.active);
    const pair=p.active&&guest?.active;
    for(const [index,boss] of [p,guest].entries())if(boss?.active){
      boss.discoveryLane=pair?(index===0?.28:.72):null;
      boss.baseX=m.game.getWidth()*(boss.discoveryLane??.5);
      boss.discoveryHoldUntil=0;
    }
    if(Number.isFinite(this.lastLives)&&m.game.lives<this.lastLives){
      for(const boss of [p,guest])if(boss?.active)boss.applyRecoveryPause(1800,'discovery_life_recovery');
      for(const section of this.snake?.sections||[])section.shootCooldown=Math.max(section.shootCooldown,108);
      this.nextWarningAt=this.age+1800;
    }
    this.lastLives=m.game.lives;
    // A surviving snake remains a real opponent after the boss dies. Arrival
    // and eventual retreat are bounded so a failed load cannot strand a run.
    return p.health<=0&&(snakeActive||this.snakeReleaseAt!=null||this.stage==='warning'||this.stage==='loading');
  }
  spawnSnake() {
    if(this.disposed)return;
    const pool=getSpaceSnakesForLevel(this.manager.level);
    if(!pool.length)return;
    const profile=pool[(this.manager.level*7)%pool.length];
    this.snake=this.manager.spawnSpaceSnake(profile);this.snakeAt=this.age;
    const hp=this.baseHealth*this.plan.snakeHealthRatio/this.snake.sections.length;
    for(const section of this.snake.sections){
      section.health=section.maxHealth=Math.max(1,hp);section.shootDelay*=1.35;
      section.discoveryGuest=true;
      section.discoveryCoordinator=this;
    }
    // Preserve attacks already visible on screen; arrival is warned, not a wipe.
  }
  async prepareGuest() {
    const m=this.manager;
    // A previously eligible boss; never spoil an unrevealed identity.
    const candidates=[3,6,9,12].map(offset=>getBossProfileForRun(Math.max(1,m.level-offset),{seed:this.seed}));
    const profile=candidates.find(p=>p.id!==this.primary.profile.id && p.signature!==this.primary.profile.signature && p.attack!==this.primary.profile.attack)
      || candidates.find(p=>p.id!==this.primary.profile.id) || candidates[0];
    const boss=new Boss(m.game.getWidth()*.72,100,m.level,m.game,profile);
    this.pendingBoss=boss;
    try{
      await boss.createSprite();
      if(this.disposed||this.stage==='failed'||m.discoveryEncounter!==this){this.pendingBoss=null;boss.destroy();boss.sprite?.destroy({children:true});return;}
      boss.health=boss.maxHealth=Math.max(1,this.baseHealth*this.plan.guestHealthRatio);
      boss.updateHealthBar();
      this.prepareBoss(boss);
      boss.discoveryGuest=true;
      this.readyGuest=boss;this.pendingBoss=null;
    }catch(error){
      this.pendingBoss=null;this.stage='failed';boss.destroy();boss.sprite?.destroy({children:true});
      console.warn('[Boss discovery] Guest unavailable; primary completion preserved',error);
    }
  }
  attachGuest() {
    const m=this.manager,boss=this.readyGuest;
    if(!boss||this.disposed||this.stage==='failed')return;
    this.readyGuest=null;this.guest=boss;this.guestAt=this.age;this.stage='active';
    // Loading off-scene must not consume the actual arrival animation or the
    // opening fire delay. It grants no extra health or invulnerability.
    const now=Date.now();boss.spawnedAtMs=now;boss.entryStartMs=now;
    boss.regularAttackReadyAt=now+boss.getOpeningAttackDelayMs();
    boss.invulnerableUntilMs=0;boss.baseX=m.game.getWidth()*.72;
    boss.x=boss.baseX;boss.y=boss.entryFromY;boss.sprite.position.set(boss.x,boss.y);
    boss.discoveryLane=.72;this.primary.discoveryLane=.28;
    boss.setPresentationState('arrival',boss.entryDurationMs+420);
    m.enemies.push(boss);m.container.addChild(boss.sprite);
    m.game.scenes.play.recordThreatDiscovery?.(boss.profile.id,'bosses',{name:boss.profile.name,role:boss.profile.title,sector:m.level});
  }
  destroyPreparedGuest(){
    const boss=this.readyGuest;this.readyGuest=null;
    if(boss){boss.destroy();if(!boss.sprite?.destroyed)boss.sprite?.destroy({children:true});}
    // An in-flight createSprite owns its temporary object until it resolves.
    // The disposed/failed checks above then destroy it exactly once.
  }
  clearSnake(){
    this.snake?.brood?.dispose();
    if(this.snake)CreatureAudio.stopOwner(this.snake);
    for(const section of this.snake?.sections||[]){section.active=false;section.discoveryCoordinator=null;this.manager.removeEnemySprite(section,'discovery_departure');}
    this.snake=null;
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;this.clearSnake();this.destroyPreparedGuest();
    for(const boss of [this.primary,this.guest])if(boss){boss.discoveryHoldUntil=0;boss.discoveryLane=null;boss.discoveryCoordinator=null;}
  }
}
