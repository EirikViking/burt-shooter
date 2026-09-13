import {Container,Sprite} from 'pixi.js';
import {SpaceSnakeBaby} from '../entities/SpaceSnakeBaby.js';
import {Bullet} from '../entities/Bullet.js';
import {SnakeBroodArt} from '../assets/SnakeBroodArt.js';
import {SnakeBroodAudio} from '../audio/SnakeBroodAudio.js';
import {AudioManager} from '../audio/AudioManager.js';
import {planSnakeBrood,broodRandom} from '../config/SnakeBroods.js';

const TAU=Math.PI*2;
export class SnakeBrood{
 constructor(manager,chain,profile,options={}){
   this.manager=manager;this.chain=chain;this.profile=profile;
   this.plan=planSnakeBrood({seed:`${manager.game.contentDirector?.seed||manager.game.gameId||'nova'}:${manager.level}:${manager.currentWaveIndex}:${chain.routeSeed}`,profile,...options});
   this.family=this.plan.family;this.random=broodRandom(this.plan.seed+':flight');
   this.age=0;this.scale=Math.max(.7,manager.game.getWidth()/1280);this.babies=[];this.fx=[];this.eggs=[];this.disposed=false;
   this.nextAction=0;this.cursor=0;this.born=0;this.orphanAt=null;this.healed=0;this.shots=0;this.kills=0;this.nextCall=11;
   this.layer=new Container();this.layer.eventMode='none';this.layer.label='snake_brood_membranes';manager.container.addChild(this.layer);
   this.promise=SnakeBroodArt.load(this.family).then(art=>{if(!this.disposed)this.art=art;}).catch(e=>{this.failed=true;console.warn('[SnakeBrood] Art unavailable; keeping the normal snake',e.message);});
   SnakeBroodAudio.prepare(this.family);
 }
 livingMother(){return this.chain.sections.filter(s=>s.active);}
 positionFor(baby){
   const mother=this.livingMother();if(!mother.length)return null;
   const a=baby.action;
   if(a){
     if(a.phase==='warning')return a.from;
     if(a.phase==='strike')return a.target;
   }
   const host=mother[(baby.index*3)%mother.length],f=this.family.formation;
   const t=this.age*(f==='spiral'?2.3:1.35)*(this.family.orbitSpeed/.14)*(baby.index%2?1:-1)+baby.index*2.399;
   const r=(f==='shield'?49:f==='sentinels'?87:65)+(baby.index%3)*11;
   let dx=Math.cos(t)*r,dy=Math.sin(t)*r*.72;
   if(f==='shield'){dx=Math.sin(t*.75)*r;dy=32+Math.abs(Math.cos(t*.75))*r*.5;}
   if(f==='pincers'){dx=(baby.index%2?1:-1)*(65+Math.sin(t)*25);dy=Math.cos(t)*35;}
   if(f==='menders'){dx=Math.cos(t)*48;dy=Math.sin(t)*43;}
   const w=this.manager.game.getWidth(),h=this.manager.game.getHeight();
   return{x:Math.max(30,Math.min(w-30,host.x+dx*this.scale)),y:Math.max(35,Math.min(h*.76,host.y+dy*this.scale))};
 }
 bloom(x,y,{size=40,color=this.family.color,duration=.55,texture=this.art?.plasma,vx=0,vy=0,rotation=0}={}){
   if(!texture||this.fx.length>=100)return;
   const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.position.set(x,y);sprite.tint=color;sprite.rotation=rotation;sprite.blendMode='add';
   this.layer.addChild(sprite);this.fx.push({sprite,age:0,size:size*this.scale,duration,vx,vy});
 }
 update(delta,player){
   if(this.disposed)return;const dt=Math.max(0,Math.min(3,delta))/60;this.age+=dt;
   const mother=this.livingMother();
   if(!mother.length){
     if(this.orphanAt===null){this.orphanAt=this.age;SnakeBroodAudio.stopOwner(this);for(const b of this.babies)b.action=null;}
     if(this.age-this.orphanAt>=2){this.dispose();return;}
   }
   if(this.failed){this.dispose();return;}
   if(this.art&&mother.length){
     if(!this.hatchStarted&&this.age>=this.plan.hatchAt){
       this.hatchStarted=this.age;this.initialHealth=mother.reduce((n,s)=>n+s.maxHealth,0);this.healBudget=this.initialHealth*.08;
       SnakeBroodAudio.play(this,'hatch');
       for(let i=0;i<this.plan.count;i++){
         const sprite=new Sprite(this.art.egg);sprite.anchor.set(.5);sprite.tint=this.family.core;sprite.alpha=.65;this.layer.addChild(sprite);
         this.eggs.push({sprite,index:i,host:mother[(i*3)%mother.length],at:this.age+.75+i*.085});
       }
     }
     for(const egg of this.eggs){
       if(egg.done)continue;const host=egg.host.active?egg.host:mother[0];
       const a=egg.index*2.399+this.age*.5;egg.sprite.position.set(host.x+Math.cos(a)*30*this.scale,host.y+Math.sin(a)*24*this.scale);
       const p=Math.max(0,1-(egg.at-this.age)/1.5),size=(18+p*17)*this.scale;
       egg.sprite.width=size*.76;egg.sprite.height=size;egg.sprite.rotation=Math.sin(this.age*18+egg.index)*.07;
       if(this.age>=egg.at){
         egg.done=true;const{x,y}=egg.sprite;egg.sprite.destroy();
         const baby=new SpaceSnakeBaby(this,egg.index,x,y);this.babies.push(baby);this.manager.enemies.push(baby);this.manager.container.addChild(baby.sprite);this.born++;
         this.bloom(x,y,{size:53,duration:.5});
         for(let j=0;j<3;j++){const angle=a+j*TAU/3;this.bloom(x,y,{texture:this.art.egg,size:13,duration:.6,vx:Math.cos(angle)*75*this.scale,vy:Math.sin(angle)*75*this.scale,rotation:angle});}
       }
     }
     const live=this.babies.filter(b=>b.active);
     for(const b of live){const a=b.action;if(!a)continue;
       if(a.phase==='warning'&&this.age-a.at>=.65){a.phase='strike';a.at=this.age;this.fire(b,player);}
       else if(a.phase==='strike'&&this.age-a.at>=.65){a.phase='return';a.at=this.age;}
       else if(a.phase==='return'&&this.age-a.at>=1.1)b.action=null;
     }
     if(live.length&&this.age>=this.nextAction&&player?.active!==false){
       this.nextAction=this.age+(this.chain.sections.some(s=>s.discoveryGuest)?1.25:.7);
       const candidates=live.filter(b=>b.age>1.1&&!b.action),busy=live.filter(b=>b.action&&b.action.phase!=='return').length;
       const coordinator=mother[0]?.discoveryCoordinator;
       if(candidates.length&&busy<2&&(!coordinator||coordinator.claimAttack(this,'regular'))){
         const b=candidates[this.cursor++%candidates.length],w=this.manager.game.getWidth(),h=this.manager.game.getHeight();
         const prediction=this.family.weapon==='lance'?Math.max(-110,Math.min(110,(player?.x-(this.lastPlayerX??player?.x))*12)):0;
         const target={x:Math.max(30,Math.min(w-30,(player?.x||w*.5)+prediction)),y:Math.max(h*.25,Math.min(h*.83,(player?.y||h*.82)-45*this.scale))};
         b.action={phase:'warning',at:this.age,from:{x:b.x,y:b.y},aim:target,target:['divers','raiders','pincers','feint'].includes(this.family.formation)?target:this.positionFor(b)};
       }
     }
     if(this.age>=this.nextCall&&live.length){
       if(!AudioManager.activeVoices?.size){SnakeBroodAudio.play(this,'chorus');this.chain.nextCryAt=Math.max(this.chain.nextCryAt||0,this.chain.age+5);this.nextCall=this.age+10+this.random()*4;}
       else this.nextCall=this.age+1;
     }
   }
   this.lastPlayerX=player?.x;
   this.fx=this.fx.filter(f=>{f.age+=dt;if(f.age>=f.duration){f.sprite.destroy();return false;}const p=f.age/f.duration;f.sprite.x+=f.vx*dt;f.sprite.y+=f.vy*dt;f.sprite.width=f.size*(.35+p*1.5);f.sprite.height=f.size*(.35+p*1.5);f.sprite.alpha=(1-p)*.65;return true;});
   SnakeBroodAudio.update();
 }
 heal(baby,amount){
   const living=this.livingMother().filter(s=>s.health<s.maxHealth).sort((a,b)=>a.health/a.maxHealth-b.health/b.maxHealth);
   const target=living[0];if(!target||this.healed>=this.healBudget)return 0;
   const gain=Math.min(amount,this.healBudget-this.healed,target.maxHealth-target.health);target.health+=gain;this.healed+=gain;
   for(let i=0;i<7;i++){const t=i/6;this.bloom(baby.x+(target.x-baby.x)*t,baby.y+(target.y-baby.y)*t,{size:11,color:0xb0ffe4,duration:.3+t*.4});}
   SnakeBroodAudio.play(this,'support');return gain;
 }
 fire(baby,player){
   if(this.disposed||this.orphanAt!==null||!baby.active)return;
   const weapon=this.family.weapon,a=baby.action.aim,angle=Math.atan2(a.y-baby.y,a.x-baby.x),speed=(2.5+Math.min(1.0,this.manager.level*.02))*this.scale;
   const shots=[];
   const add=(offset=0,opts={})=>{
     const shot=new Bullet(baby.x,baby.y,Math.cos(angle+offset)*speed*(opts.speed||1),Math.sin(angle+offset)*speed*(opts.speed||1),1,this.family.color,false,{weaponProfileId:`snake_brood_${weapon}`,animationStyle:opts.style||'pulse',radius:(opts.radius||5)*this.scale,trailColor:this.family.color,maxLifetimeMs:opts.life||5000,...opts});
     shot.core.tint=this.family.core;
     // Reuse the authored luminous anatomy for ion/egg weapons. Collision stays
     // on the normal hostile bullet, with a crisp bright center at real size.
     if(['bomb','mine','siphon','solar','gravity','phase'].includes(weapon)){
       shot.core.texture=weapon==='mine'?this.art.egg:this.art.plasma;
       shot.core.tint=this.family.core;shot.core.rotation=angle+Math.PI/2;
       shot.core.scale.set((opts.radius||5)*this.scale*4/280);shot.baseScale=shot.core.scale.x;
     }
     shots.push(shot);
   };
   switch(weapon){
     case 'bomb':add(0,{speed:.65,radius:9,behavior:'brake_then_accelerate',brakeMs:650,dashSpeed:speed*1.6,releaseAngle:angle,style:'pulse'});break;
     case 'needles':for(const o of [-.20,0,.20])add(o,{speed:1.4,radius:4,style:'needle'});break;
     case 'venom':add(-.13,{behavior:'seed_sway',behaviorStrength:.045,style:'dart'});add(.13,{behavior:'seed_sway',behaviorStrength:-.045,style:'dart'});break;
     case 'gravity':for(const sign of [-1,1])add(sign*.27,{behavior:'spiral_curve',behaviorStrength:sign*.023,behaviorFrequency:.045,radius:6,style:'spiral'});break;
     case 'bone':add(0,{behavior:'boomerang_arc',arcSign:baby.index%2?1:-1,arcStrength:.015,style:'crescent'});if(baby.index%3===0)this.heal(baby,this.initialHealth*.006);break;
     case 'charge':add(0,{speed:.85,radius:8,style:'lance'});break;
     case 'scissor':for(const sign of [-1,1])add(sign*.45,{behavior:'boomerang_arc',arcSign:-sign,arcStrength:.016,style:'crescent',speed:1.2});break;
     case 'solar':for(const o of [-.24,0,.24])add(o,{speed:.85,behavior:'accelerate',behaviorStrength:.006});if(baby.index%3===0)this.heal(baby,this.initialHealth*.005);break;
     case 'razor':add(-.15,{behavior:'boomerang_arc',arcSign:1,style:'saw',radius:7});add(.15,{behavior:'boomerang_arc',arcSign:-1,style:'saw',radius:7});break;
     case 'siphon':add(0,{speed:.9,behavior:'spiral_curve',behaviorStrength:.008});if(Math.hypot(baby.x-a.x,baby.y-a.y)<220*this.scale)this.heal(baby,this.initialHealth*.004);break;
     case 'arc':add(-.13,{behavior:'fork_zig',behaviorStrength:.12,behaviorFrequency:.09,style:'lance'});add(.13,{behavior:'fork_zig',behaviorStrength:-.12,behaviorFrequency:.09,style:'lance'});break;
     case 'lance':add(0,{speed:2.05,radius:4,style:'lance',life:3200});break;
     case 'mine':add(-.30,{speed:.35,radius:8,behavior:'brake_then_accelerate',brakeMs:1250,dashSpeed:speed,releaseAngle:angle,style:'mine',life:5000});break;
     case 'phase':add(-.3,{behavior:'boomerang_arc',arcSign:1,arcStrength:.012,style:'spiral'});add(.3,{behavior:'boomerang_arc',arcSign:-1,arcStrength:.012,style:'spiral'});break;
   }
   for(const shot of shots)this.manager.game.scenes.play.bulletManager.addEnemyBullet(shot);
   this.shots+=shots.length;SnakeBroodAudio.play(this,'attack');this.bloom(baby.x,baby.y,{size:32,duration:.22});
 }
 onBabyDeath(baby){this.kills++;SnakeBroodAudio.play(this,'death');this.bloom(baby.x,baby.y,{size:65,duration:.4});for(let i=0;i<4;i++){const a=i*TAU/4+this.random();this.bloom(baby.x,baby.y,{texture:this.art.egg,size:12,duration:.6,vx:Math.cos(a)*95*this.scale,vy:Math.sin(a)*95*this.scale});}}
 dispose(){
   if(this.disposed)return;this.disposed=true;SnakeBroodAudio.stopOwner(this);
   for(const b of this.babies)if(!b.destroyed){b.active=false;this.manager.removeEnemySprite(b,'brood_departure');}
   this.layer.destroy({children:true,texture:false,textureSource:false});this.eggs=[];this.fx=[];
   this.manager.snakeBroods?.delete(this);
   (this.manager.game.snakeBroodLog||=[]).push({family:this.family.id,born:this.born,kills:this.kills,shots:this.shots,healed:this.healed,healBudget:this.healBudget||0});
   if(this.manager.game.snakeBroodLog.length>30)this.manager.game.snakeBroodLog.shift();
 }
}
