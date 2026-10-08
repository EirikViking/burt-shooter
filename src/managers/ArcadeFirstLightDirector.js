import { FirstLightModel, CONVOY_PAYBACK, convoyPaybackTarget, firstLightEligible, firstLightShotTouches, firstLightRivalDroneValue } from '../game/ArcadeFirstLight.js';
import { SPACE_SNAKES } from '../config/SpaceSnakes.js';
import { getFirstLightDesign } from '../config/FirstLightDesigns.js';
import { FirstLightVisual, loadFirstLightArt } from '../effects/ArcadeFirstLightVisual.js';
import { Bullet } from '../entities/Bullet.js';
import { AudioManager } from '../audio/AudioManager.js';
import { GLOBAL_CHALLENGE_TUNING } from '../config/BalanceConfig.js';
import {recoveringFromCombination} from '../config/EncounterPacing.js';
import {convoySurpriseReady,recordConvoySurprise} from '../config/ConvoySurpriseCatalog.js';
import {convoyPartPoses,makeConvoySurprise} from '../game/ConvoySurprises.js';
import {prewarmConvoySurpriseSounds,playConvoySurpriseSound} from '../audio/ConvoySurpriseAudio.js';
import {consumeReactorDischarge,reactorTowPosition,updateReactorTow} from '../game/ReactorTow.js';
import {consumeCounterweightVolley,counterweightWorldPoses,updateCounterweight} from '../game/Counterweight.js';

export class ArcadeFirstLightDirector {
  constructor(scene) {
    this.scene=scene;this.enabled=firstLightEligible(scene.game);this.destroyed=false;
    this.model=new FirstLightModel(scene.game.encounterEvolutionTest?.seed||scene.game.contentDirector?.seed || scene.game.gameId);
    this.view=null;this.attackTimers={left:2.5,right:3.3};this.aim={};this.charges={};this.event=null;this.eventSuspended=false;
    this.artLoadAttempts=0;this.artRetryAt=0;this.artLoading=false;
    this.rescueAudioReady=false;this.audioLoadAttempts=0;this.audioRetryAt=0;
    if(this.enabled)this.loadRescueAudio();
    if(this.enabled)this.loadArt();
  }
  loadArt() {
    if(this.destroyed||this.artLoading||this.artLoadAttempts>=3)return;
    this.artLoadAttempts++;this.artLoading=true;
    loadFirstLightArt().then(art=>{if(art&&!this.destroyed)this.view=new FirstLightVisual(this.scene,art);})
      .finally(()=>{this.artLoading=false;this.artRetryAt=Date.now()+2000;});
  }
  loadRescueAudio(){
    if(this.audioLoading||this.destroyed||this.audioLoadAttempts>=3)return;
    this.audioLoading=true;this.audioLoadAttempts++;
    prewarmConvoySurpriseSounds().then(()=>{if(!this.destroyed)this.rescueAudioReady=true;})
      .catch(()=>{this.audioRetryAt=Date.now()+2000;}).finally(()=>{this.audioLoading=false;});
  }
  safe() {
    const s=this.scene,m=s.enemyManager;
    return m?.state==='WAVE_ACTIVE' && m.phase==='WAVES' && !m.waveEnding
      && !m.waves?.[m.currentWaveIndex]?.isChallenge && !m.challengeFlightState?.active
      && !m.mysteryDirector?.busy && !m.hijacker?.active && !m.boss?.active
      && !m.discoveryEncounter?.plan && !m.environment?.active && !s.activeBossIntroCard?.parent
      && !this.majorWarningActive()
      && !(m.enemies||[]).some(e=>e.active&&['boss','space_snake','mystery','mystery_part'].includes(e.kind));
  }
  majorWarningActive() {
    const s=this.scene,state=s.enemyManager?.mayhemReinforcementState;
    return Boolean(s.activeMayhemReinforcementWarning?.overlay?.parent
      ||s.activeMayhemRoutineWarning?.overlay?.parent||s.activeBossIntroCard?.parent
      ||(state?.warningFired&&!state.spawned));
  }
  headlineWarningActive() {
    const s=this.scene,state=s.enemyManager?.mayhemReinforcementState;
    if(s.activeBossIntroCard?.parent)return true;
    if(state?.warningFired&&!state.spawned
      &&(state.isSuperStorm||!['routine','major'].includes(state.warningTier)))return true;
    if(!s.activeMayhemReinforcementWarning?.overlay?.parent)return false;
    const presentation=s.lastMayhemReinforcementPresentation;
    // Unknown warning metadata stays conservative. Ordinary warnings still
    // freeze combat through safe(), but need not repeatedly fly the hull away.
    return !presentation||Boolean(presentation.boss||presentation.superStorm);
  }
  syncVisibility() {
    const s=this.scene;
    if(this.model.encounter?.counterweight&&(s.isPaused||s.tacticalDraft?.active||s.overrunMilestoneInterlude?.active))
      updateCounterweight(this.model.encounter,0,{paused:true});
    if(s.isPaused||s.tacticalDraft?.active||s.overrunMilestoneInterlude?.active){
      if(this.model.encounter?.reactor)updateReactorTow(this.model.encounter,0,{safe:false});
      AudioManager.stopSfxGroup?.('convoy-surprise');
      this.reactorChargeCued=false;
      this.counterweightChargeCued=false;
    }
    if(!this.view)return;
    if(s.gameOverSequenceStarted||s.gameOverInterlude?.active||s.game.lives<=0){
      this.cancel('player-death');for(const molt of s.enemyManager?.serpentMolts||[])molt.dispose('player-death');
    }
    this.view.root.visible=!this.destroyed&&s.game.lives>0&&!s.gameOverSequenceStarted&&!s.gameOverInterlude?.active
      && !s.tacticalDraft?.active&&!s.overrunMilestoneInterlude?.active;
  }
  clearOwnedBullets() {
    const m=this.scene.bulletManager;
    for(const bullet of [...(m?.enemyBullets||[]),...(m?.pendingEnemyBullets||[])]) {
      if(bullet.firstLightOwner===this&&bullet.active)m.deactivateBullet(bullet,'first_light_contact_ended');
    }
  }
  clearSupportBullets() {
    const m=this.scene.bulletManager;
    for(const bullet of m?.playerBullets||[])if(bullet.active&&bullet.firstLightSupport&&bullet.firstLightOwner===this)
      m.deactivateBullet(bullet,'first_light_support_suspended');
  }
  cancel(reason) {this.clearOwnedBullets();this.clearSupportBullets();AudioManager.stopSfxGroup?.('convoy-surprise');this.model.cancel(reason);this.event=null;this.eventSuspended=false;this.charges={};this.counterweightChargeCued=false;this.counterweightFieldSize=null;}
  update(delta) {
    const s=this.scene;if(!this.enabled||this.destroyed)return;
    if(!this.rescueAudioReady&&Date.now()>=this.audioRetryAt)this.loadRescueAudio();
    if(!this.view){if(Date.now()>=this.artRetryAt)this.loadArt();return;}
    if(s.isPaused){if(this.model.encounter?.counterweight)updateCounterweight(this.model.encounter,0,{paused:true});return;}
    if(!s.player?.active||s.game.lives<=0){this.cancel('player-death');this.view.root.visible=false;return;}
    this.setupLocalTest();
    const safe=this.safe(),e=this.model.encounter;
    if(e?.counterweight){
      const size=`${s.gameplayGame.getWidth()}:${s.gameplayGame.getHeight()}`;
      if(this.counterweightFieldSize&&this.counterweightFieldSize!==size)updateCounterweight(e,0,{safe:false});
      this.counterweightFieldSize=size;
    }
    // The spectacle never occupies a boss, mystery, challenge or final sector transition.
    const m=s.enemyManager;
    const major=!['WAVE_ACTIVE','WAVE_BRIEFING'].includes(m?.state)||m?.phase!=='WAVES'
      ||m?.boss?.active||m?.mysteryDirector?.busy||m?.hijacker?.active||m?.discoveryEncounter?.plan||m?.environment?.active
      ||m?.waves?.[m.currentWaveIndex]?.isChallenge||m?.challengeFlightState?.active
      ||this.headlineWarningActive()
      ||(m?.enemies||[]).some(enemy=>enemy.active&&['boss','space_snake','mystery','mystery_part'].includes(enemy.kind));
    // An ordinary briefing keeps the hull present, but retains the previous
    // transition's projectile clear and recharge safety.
    if(major||!safe){this.clearOwnedBullets();this.clearSupportBullets();this.attackTimers={left:Math.max(.85,this.attackTimers.left),right:Math.max(1.15,this.attackTimers.right)};this.aim={};this.charges={};}
    const dt=Math.max(0,Math.min(.1,delta/60));
    // Preserve the original ordinary-wave support scope. A boss does not gain
    // extra friendly damage merely because a rescue now survives transitions.
    const combat = safe && s.introComplete && !s.introActive
      && !s.tacticalDraft?.active && !s.overrunMilestoneInterlude?.active;
    const present = !major && s.introComplete && !s.introActive
      && !s.tacticalDraft?.active && !s.overrunMilestoneInterlude?.active;
    const ordinary=Boolean((m.enemies||[]).some(enemy=>enemy.active&&!enemy.root&&!['boss','space_snake','mystery','mystery_part'].includes(enemy.kind)));
    this.model.update(dt,{sector:s.game.level,safe:present&&safe,combat,present,ordinary,
      paybackPart:this.model.payback?.status==='ready'&&e?.age>=CONVOY_PAYBACK.rivalAdmissionAge
        ?convoyPaybackTarget(e,this.view.targets,s.player.x):null,
      allowSurprise:this.rescueAudioReady&&convoySurpriseReady(s.game,this.model.nextSurpriseId())&&!recoveringFromCombination(s.game)});
    if(this.event!==this.model.encounter){
      if(this.event?.surprise){
        this.log('contact-end',{family:this.event.recipe?.family||'rescue_contact',surprise:this.event.surprise,duration:this.event.age,
          won:Boolean(this.event.won),rescued:this.model.rescued,reason:this.model.lastEnd?.reason||'departed',
          ...(this.event.counterweight?{outcome:this.event.counterweight.phase,volleys:this.event.counterweight.volleys}:{})});
        AudioManager.stopSfxGroup?.('convoy-surprise');
      }
      if(this.event&&!this.event.won)AudioManager.playSfx(`first_light_${this.event.kind==='convoy'?'convoy_depart':'rival_retreat'}`,{preserveGameplayRng:Boolean(this.event.surprise)});
      this.clearOwnedBullets();this.event=this.model.encounter;this.eventSuspended=Boolean(this.event?.suspended);
      this.attackTimers={left:2.5,right:3.3};this.aim={};this.charges={};
      if(this.event){
        if(this.event.kind==='convoy')recordConvoySurprise(s.game,this.event.surprise);
        this.log('contact-arrive',{family:this.event.recipe?.family||(this.event.kind==='convoy'?'rescue_contact':'convoy-payback'),surprise:this.event.surprise||null,hp:{...this.event.hp}});
        const design=getFirstLightDesign(this.event.kind,this.event.variant);
        if(this.event.surprise)playConvoySurpriseSound('arrive');else {
          AudioManager.playSfx(`first_light_${this.event.kind}_${design.id}_arrive`);
          if(this.rescueAudioReady)playConvoySurpriseSound(this.event.kind==='convoy'?'arrive':'rival');
        }
        if(!this.event.reactor&&!this.event.counterweight)s.recordThreatDiscovery?.(`first_light_${this.event.kind}_${design.id}`,'enemies',
          {sector:s.game.level},{scoreBonus:false,silent:true});
      }
    }
    if(this.event && this.event.suspended!==this.eventSuspended){
      this.eventSuspended=this.event.suspended;
      if(this.event.suspended){
        if(this.event.kind==='rival')AudioManager.playSfx('first_light_rival_retreat',{force:true});
      } else {
        const design=getFirstLightDesign(this.event.kind,this.event.variant);
        AudioManager.playSfx(`first_light_${this.event.kind}_${design.id}_arrive`,{force:true,preserveGameplayRng:Boolean(this.event.surprise)});
        AudioManager.duckMusic(.72,650);
      }
    }
    for(const a of this.model.escorts){
      if(combat)a.shotTimer=Math.max(0,a.shotTimer-dt);
      if((a.joinAge??a.age)>=.9&&!a.joined){a.joined=true;AudioManager.playSfx('first_light_convoy_rescue_join',{preserveGameplayRng:Boolean(this.event?.surprise)});if(this.rescueAudioReady)playConvoySurpriseSound('launch');}
    }
    const firingParts=this.event?.surprise?convoyPartPoses(this.event).filter(p=>p.role==='gun').map(p=>p.part):['left','right'];
    if((this.event?.kind==='rival'||this.event?.surprise)&&!this.event.won&&safe){
      for(const part of firingParts){
        this.attackTimers[part]??=2.7;
        if(this.event.surprise){
          this.attackTimers[part]-=dt;this.charges[part]=Math.max(0,Math.min(1,1-this.attackTimers[part]/.85));
          if(this.charges[part]>0&&!this.aim[part]){this.aim[part]={x:s.player.x,y:s.player.y};AudioManager.playSfx('first_light_rival_charge_mechanical',{preserveGameplayRng:true});}
          continue;
        }
        if(!this.model.attackEnabled(part)){this.charges[part]=0;continue;}
        this.attackTimers[part]-=dt;
        this.charges[part]=Math.max(0,Math.min(1,1-this.attackTimers[part]/.7));
        if(this.charges[part]>0&&!this.aim[part]){
          this.aim[part]={x:s.player.x,y:s.player.y};
          AudioManager.playSfx(`first_light_rival_charge_${getFirstLightDesign('rival',this.event.variant).sound}`);
        }
      }
    }
    this.view.update(this.model,dt,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,this.charges);
    // Keep routine status banners off the interactive hull and its weapon tells.
    // Use the existing bounded/coalesced queue; danger warnings still pass.
    if(this.event&&!this.event.won&&!this.event.suspended&&this.view.root.visible&&this.view.contact.alpha>.05)
      s.deferRoutineFocusLaneForActionWarning?.(250,'first_light_contact');
    this.updatePaybackShots(safe);
    if(this.event?.surprise&&safe)for(const part of firingParts)if(this.attackTimers[part]<=0)this.fireRescueGun(part);
    if(this.event?.kind==='rival'&&!this.event.won&&safe)for(const part of ['left','right']){
      if(this.model.attackEnabled(part)&&this.attackTimers[part]<=0)this.fireRival(part);
    }
    this.interceptShots();
    if(this.event?.reactor)this.updateReactorDischarge(combat);
    if(this.event?.counterweight)this.updateCounterweightShots(combat);
    this.syncVisibility();
  }
  updateReactorDischarge(safe){
    const e=this.event,r=e.reactor,s=this.scene;
    if(!safe||!r.warning){
      if(!safe&&this.reactorChargeCued)AudioManager.stopSfxGroup?.('convoy-surprise');
      this.reactorChargeCued=false;return;
    }
    if(!this.reactorChargeCued){
      this.reactorChargeCued=AudioManager.playSfx('first_light_rival_charge_mechanical',
        {preserveGameplayRng:true,sfxGroup:'convoy-surprise'})!==false;
    }
    // Intercept the player's last-frame vent hit before committing this release.
    if(!consumeReactorDischarge(e))return;
    const at=reactorTowPosition(e),pose=this.view.pose;
    for(const offset of [-28,-14,0,14,28]){
      const b=new Bullet(pose.x+at.x*pose.width+offset,pose.y+at.y*pose.height+42,0,3.3,1,0xffb66e,false,{cosmeticPhase:offset*.1});
      b.firstLightOwner=this;b.firstLightPart='vent';b.maxLifetimeMs=2800;s.bulletManager.addEnemyBullet(b);
    }
    AudioManager.playSfx('first_light_rival_fire_mechanical',{preserveGameplayRng:true,sfxGroup:'convoy-surprise'});
    this.log('reactor-discharge',{family:'reactor_freight',released:r.releaseAt!==null,projectiles:5});
  }
  updateCounterweightShots(safe){
    const e=this.event,c=e.counterweight;
    const warning=safe&&!e.suspended&&['warning','ready'].includes(c.phase);
    if(!warning){if(this.counterweightChargeCued)AudioManager.stopSfxGroup?.('convoy-surprise');this.counterweightChargeCued=false;return;}
    if(!this.counterweightChargeCued){
      this.counterweightChargeCued=AudioManager.playSfx('first_light_rival_charge_mechanical',
        {preserveGameplayRng:true,sfxGroup:'convoy-surprise'})!==false;}
    // Actual player hits resolve before committing a ready volley.
    const positions=counterweightWorldPoses(e,this.view.pose),shots=consumeCounterweightVolley(e);
    if(!shots.length)return;
    for(const shot of shots){const at=positions.find(p=>p.part===shot.part);
      const b=new Bullet(at.muzzleX,at.muzzleY,Math.cos(shot.angle)*3.2,Math.sin(shot.angle)*3.2,1,0xffb875,false,{cosmeticPhase:e.age*.73});
      b.firstLightOwner=this;b.firstLightPart=shot.part;b.maxLifetimeMs=3000;this.scene.bulletManager.addEnemyBullet(b);
    }
    this.counterweightChargeCued=false;
    AudioManager.playSfx('first_light_rival_fire_mechanical',{preserveGameplayRng:true,sfxGroup:'convoy-surprise'});
    this.log('counterweight-volley',{family:'linked_battery',parts:shots.map(p=>p.part),angle:c.angle,volley:c.volleys,projectiles:shots.length});
  }
  fireRescueGun(part){
    const target=this.view.targets.find(t=>t.part===part);if(!target)return;
    const s=this.scene,e=this.event,aim=this.aim[part]||s.player;
    const angle=e.fixedGun?Math.PI/2:Math.atan2(Math.max(60,aim.y-target.y),aim.x-target.x);
    const b=new Bullet(target.x,target.y+24,Math.cos(angle)*3,Math.sin(angle)*3,1,0xffa16b,false,{cosmeticPhase:e.age*.73});
    b.firstLightOwner=this;b.firstLightPart=part;b.maxLifetimeMs=3000;s.bulletManager.addEnemyBullet(b);
    this.attackTimers[part]=3.1;this.charges[part]=0;delete this.aim[part];
    AudioManager.playSfx('first_light_rival_fire_mechanical',{preserveGameplayRng:true});
  }
  fireRival(part){
    const target=this.view.targets.find(t=>t.part===part);if(!target)return;
    const e=this.model.encounter,s=this.scene,aim=this.aim[part]||s.player;
    const angle=Math.atan2(Math.max(60,aim.y-target.y),aim.x-target.x);
    const late=e.sector>10,fan=part==='left',design=getFirstLightDesign('rival',e.variant);
    const patterns={fan:[-.22,0,.22],spear:[-.065,0,.065],split:[-.25,-.16,.16],crescent:[-.25,-.08,.12],fork:[-.18,.05,.23],cross:[-.23,0,.23]};
    const angles=fan?(late&&e.variant%3===2?[-.28,-.14,0,.14,.28]:(patterns[design.pattern]||patterns.fan)):(late?[-.065,.065]:[0]);
    const speed=2.8+Math.min(3.4,Math.max(0,e.sector-2)*.035);
    for(const offset of angles){const b=new Bullet(target.x,target.y+30,Math.cos(angle+offset)*speed,Math.sin(angle+offset)*speed,1,fan?0xffac65:0xe69aff,false);
      b.firstLightOwner=this;b.firstLightPart=part; s.bulletManager.addEnemyBullet(b);}
    this.attackTimers[part]=(fan?2.6:2.9)/GLOBAL_CHALLENGE_TUNING.rivalCadence;this.charges[part]=0;delete this.aim[part];
    AudioManager.playSfx(`first_light_rival_fire_${design.sound}`);
  }
  interceptShots(){
    const s=this.scene,e=this.model.encounter;if(!e||e.won||e.suspended||!this.safe())return;
    if(e.surprise)for(const bullet of s.bulletManager.enemyBullets){
      if(!bullet.active)continue;
      const cover=this.view.targets.find(t=>t.cover&&firstLightShotTouches(bullet,t));
      if(cover&&this.model.hit(cover.part,Number(bullet.damage)||1,bullet))s.bulletManager.deactivateBullet(bullet,'rescue_cover');
    }
    for(const bullet of s.bulletManager.playerBullets){
      if(!bullet.active)continue;
      for(const t of this.view.targets){
        if(bullet.firstLightSupport&&!bullet.firstLightPayback&&!bullet.firstLightRescueSupport&&!t.cover)continue;
        if(bullet.firstLightRescueSupport&&t.part!==bullet.firstLightPart&&!t.cover)continue;
        if(bullet.firstLightPayback&&t.part!==bullet.firstLightPart)continue;
        if(!firstLightShotTouches(bullet,t))continue;
        if(bullet.isBomb){s.detonateBombBullet(bullet,'first_light_contact');break;}
        const result=bullet.firstLightRescueSupport&&!t.cover?this.model.hitRescueSupport(t.part,Number(bullet.damage)||0,bullet)
          :bullet.firstLightPayback?this.model.hitPayback(t.part,Number(bullet.damage)||0,bullet)
          :this.model.hit(t.part,Number(bullet.damage)||0,bullet);
        if(bullet.firstLightPayback)s.bulletManager.deactivateBullet(bullet,'payback_target');
        if(!result)continue;
        if(!bullet.firstLightPayback&&!bullet.firstLightRescueSupport&&result.credit!==false)s.recordCombatProjectileHit?.(bullet);
        if(result.credit===false||(!bullet.piercing&&!bullet.isPlasmaLance))s.bulletManager.deactivateBullet(bullet,'first_light_target_hit');
        this.presentHit(result,t,e);
        break;
      }
    }
  }
  presentHit(result,t,e){
    if(result.type==='blocked'||result.type==='cover')return;
    if(e.counterweight&&result.type!=='hit'){
      if(this.counterweightChargeCued)AudioManager.stopSfxGroup?.('convoy-surprise');
      this.counterweightChargeCued=false;
    }
    AudioManager.playSfx('hit',{volume:.22,minIntervalMs:90,preserveGameplayRng:Boolean(e.surprise)});
    if(result.type!=='hit'){
      this.view.burst(t.x,t.y,e.kind,result.type==='victory');
      if(result.type==='victory'){
        const design=getFirstLightDesign('rival',e.variant);
        AudioManager.playSfx(`first_light_rival_${design.id}_destroy`);
        AudioManager.duckMusic(.48,1700);
      } else if(result.type==='rescue'){
        const design=getFirstLightDesign('convoy',e.variant);
        AudioManager.playSfx(`first_light_convoy_${design.id}_rescue`,{preserveGameplayRng:Boolean(e.surprise)});
        AudioManager.duckMusic(.7,760);
      } else if(e.surprise){
        const cue=e.counterweight?(result.type==='counterweight-disable'?'engine':'weapon'):e.reactor?(result.type==='vent'?'engine':'tether'):e.surprise==='stolen-callsign'?'mimic':result.part.includes('Shield')?'shield':result.part==='drive'?'engine':'tether';
        playConvoySurpriseSound(cue);
      } else {AudioManager.playSfx('first_light_rival_weapon_break');if(this.rescueAudioReady)playConvoySurpriseSound('weapon');}
    }
    if(result.type==='rescue'){
      const ally=this.model.escorts.at(-1);ally.origin={x:t.x,y:t.y-12};
      ally.rank=getFirstLightDesign('convoy',e.variant).escortRanks[ally.side<0?0:1];
    }
    if(result.type==='weapon'&&!e.surprise&&e.hp.left<=0&&e.hp.right<=0)AudioManager.playSfx('first_light_rival_core_exposed');
    if(e.surprise&&result.type!=='hit')this.log('contact-part',{family:e.recipe?.family||'rescue_contact',surprise:e.surprise,part:result.part,outcome:result.type,hp:{...e.hp},rescued:this.model.rescued});
    if(result.type==='victory'){
      this.clearOwnedBullets();
      const pose=this.view.pose;
      const width=this.scene.gameplayGame.getWidth();
      const side=t.x<width/2?1:-1;
      const rewardX=Math.max(42,Math.min(width-42,t.x+side*(pose.width*.52+35)));
      const rewardY=t.y+Math.min(45,pose.height*.18);
      const drone=this.scene.spawnAmbientBonusDrone('HAZARD',{x:rewardX,y:rewardY},
        {scoreValue:firstLightRivalDroneValue(e.sector,e.variant)});
      if(drone){drone.firstLightReward=true;drone.vx=side*.9;drone.vy=1.2;}
    }
  }
  hitBombBlast(x,y,radius,damage,bullet){
    const e=this.model.encounter;if(!e||e.won||e.suspended||!this.view||!this.safe())return;
    // Only parts exposed before the blast can be hit; one blast cannot also kill a newly exposed core.
    for(const t of this.view.targets){
      if((x-t.x)**2+(y-t.y)**2>(radius+t.radius)**2)continue;
      const result=this.model.hit(t.part,damage,{});if(!result)continue;
      if(result.credit!==false)this.scene.recordCombatProjectileHit?.(bullet);this.presentHit(result,t,e);
    }
  }
  onPlayerVolley(){
    const s=this.scene;if(!this.enabled||!this.view||this.destroyed||s.isPaused||!s.player?.active||!this.model.supportActive)return;
    if(!this.safe()||!s.introComplete||s.introActive||s.tacticalDraft?.active||s.overrunMilestoneInterlude?.active)return;
    const shots=[];
    for(const ally of this.model.escorts){
      if(ally.age<.9||ally.age>=9.3||ally.shotTimer>0||!Number.isFinite(ally.x))continue;
      ally.shotTimer=.32;
      const angles=ally.side<0?[-.12,.12]:[0];
      const pressure=this.model.encounter?.surprise==='twin-jailers'&&this.model.escorts.length===1
        ?this.view.targets.find(t=>t.part===this.model.encounter.supportPart):null;
      for(const angle of angles){
        const heading=pressure?Math.atan2(pressure.y-ally.y,pressure.x-ally.x):null;
        const b=new Bullet(ally.x,ally.y-18,pressure?Math.cos(heading)*10:Math.sin(angle)*10,pressure?Math.sin(heading)*10:-Math.cos(angle)*10,Math.max(.6,(Number(s.player.bulletDamage)||1)*(ally.side<0?.4:.8)),ally.side<0?0x73e8d1:0xffd08b,true,this.model.encounter?.surprise?{cosmeticPhase:ally.age*1.3}:null);
        if(pressure){const heading=Math.atan2(pressure.y-ally.y,pressure.x-ally.x);b.vx=Math.cos(heading)*10;b.vy=Math.sin(heading)*10;b.firstLightRescueSupport=true;b.firstLightPart=pressure.part;b.maxLifetimeMs=800;}
        b.firstLightSupport=true;b.firstLightOwner=this;b.isTacticalDroneShot=true;
        if(s.bulletManager.addPlayerBullet(b))shots.push(b);
      }
    }
    if(shots.length)s.recordCombatVolley(shots);
  }
  log(event,extra={}){
    const g=this.scene.game;if(!g.encounterEvolutionDiagnostics)return;
    const rows=g.encounterEvolutionLog||=[];rows.push({family:'convoy-payback',event,sector:g.level,
      at:g.runElapsedSeconds||0,score:g.score,...extra});if(rows.length>80)rows.shift();
  }
  updatePaybackShots(safe){
    const p=this.model.payback,s=this.scene;
    if(p?.status!==this.lastPaybackStatus){
      this.lastPaybackStatus=p?.status;
      if(p)this.log(p.status,{identity:p.identity,part:p.part,budget:p.budget,damage:p.spentDamage});
      if(p?.status==='active'){AudioManager.playSfx('premium_wing_arrive',{preserveGameplayRng:true});if(this.rescueAudioReady)playConvoySurpriseSound('launch');}
      if(p?.status==='active')this.paybackDepartureCued=false;
    }
    if(p?.status==='active'&&(p.departAt!=null||p.age>=CONVOY_PAYBACK.arrival+CONVOY_PAYBACK.firingSeconds)&&!this.paybackDepartureCued){this.paybackDepartureCued=true;AudioManager.playSfx('premium_wing_depart',{preserveGameplayRng:true});}
    const firing=p?.status==='active'&&safe&&p.departAt==null&&p.age>=CONVOY_PAYBACK.arrival
      &&p.age<CONVOY_PAYBACK.arrival+CONVOY_PAYBACK.firingSeconds;
    if(!firing){
      for(const b of s.bulletManager.playerBullets)if(b.active&&b.firstLightPayback&&b.firstLightOwner===this)
        s.bulletManager.deactivateBullet(b,'payback_window_ended');
      return;
    }
    const target=this.view.targets.find(t=>t.part===p.part);if(!target)return;
    for(const a of p.escorts){
      if(a.shotTimer>0||!Number.isFinite(a.x)||p.spentDamage>=p.budget)continue;
      a.shotTimer=.3;const angle=Math.atan2(target.y-a.y,target.x-a.x);
      const b=new Bullet(a.x,a.y-18,Math.cos(angle)*12,Math.sin(angle)*12,p.budget/16,a.side<0?0x73e8d1:0xffd08b,true);
      b.firstLightSupport=true;b.firstLightPayback=true;b.firstLightOwner=this;b.firstLightPart=p.part;b.isTacticalDroneShot=true;
      b.maxLifetimeMs=650;s.bulletManager.addPlayerBullet(b);
    }
  }
  setupLocalTest(){
    const g=this.scene.game,s=this.scene,preset=g.encounterEvolutionTest,m=s.enemyManager;
    if(!preset||preset.id==='natural'||!s.introComplete||s.introActive)return;
    if(preset.id.startsWith('rescue-')||['reactor-tow','counterweight'].includes(preset.id)){
      if(this.localTestStarted||m.state!=='WAVE_ACTIVE'||m.spawning)return;
      this.localTestStarted=true;m.forceClearAllEnemies();m.clearPendingWaveSpawns();m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
      m.waves=[{type:'grunt',count:0,isChallenge:false}];m.currentWaveIndex=0;m.spawning=true;
      this.cancel('local-test');g.level=m.level=3;
      this.model.encounter={kind:'convoy',sector:3,age:0,suspended:false,...makeConvoySurprise(preset.id.startsWith('rescue-')?preset.id.slice(7):preset.id,1)};
      return;
    }
    if(!['molt','payback'].includes(preset.id)){
      if(!this.localTestStarted&&m.state==='WAVE_ACTIVE'&&!m.spawning){this.localTestStarted=true;
        void setupEncounterExpansionTest(s,preset.id).catch(error=>{console.error('[ExpansionTest]',error);s.encounterExpansionTestError=error.message;});}
      return;
    }
    if(!this.localTestStarted){
      if(m.state!=='WAVE_ACTIVE'||m.phase!=='WAVES'||m.spawning)return;
      this.localTestStarted=true;m.forceClearAllEnemies();m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
      m.clearPendingWaveSpawns();m.waves=[{type:'grunt',count:0,isChallenge:false}];m.currentWaveIndex=0;m.spawning=true;
      this.cancel('local-test');this.model.seen.clear();this.model.clock=0;
      if(preset.id==='molt'){
        g.level=m.level=6;
        const chain=m.spawnSpaceSnake(SPACE_SNAKES[0],{molt:true,force:false});
        this.localTestChain=chain;
      }else g.level=m.level=1;
    }
    if(preset.id==='payback'&&this.model.payback?.status==='ready'&&!this.model.encounter){
      g.level=m.level=2;this.model.clock=0;
    }
  }
  snapshot(){return {enabled:this.enabled,artReady:Boolean(this.view),...this.model.snapshot(),targets:this.view?.targets.map(t=>({...t}))||[],charges:{...this.charges}};}
  destroy(){if(this.destroyed)return;this.destroyed=true;this.cancel('scene-destroy');this.view?.destroy();this.view=null;}
}
import { setupEncounterExpansionTest } from '../config/EncounterExpansionTest.js';
