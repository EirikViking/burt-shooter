import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4970'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=rescue-twin-jailers`);
 await page.waitForFunction(()=>{const d=window.__game?.scenes.play?.firstLightDirector;return d?.rescueAudioReady&&d.model.encounter?.surprise;},null,{timeout:90000});
 await page.evaluate(()=>window.__game.app.ticker.stop());
 const result=await page.evaluate(async()=>{
  const {Bullet}=await import('/src/entities/Bullet.js'),{FirstLightModel,firstLightShotTouches}=await import('/src/game/ArcadeFirstLight.js'),{makeConvoySurprise}=await import('/src/game/ConvoySurprises.js');
  const {AudioManager}=await import('/src/audio/AudioManager.js'),{playConvoySurpriseSound}=await import('/src/audio/ConvoySurpriseAudio.js');
  const g=window.__game,s=g.scenes.play,d=s.firstLightDirector;
  d.model.encounter.age=3;d.update(1);
  const rng=Math.random;let calls=0;Math.random=()=>{calls++;return .5;};
  d.fireRescueGun('leftGun');const projectileDraws=calls;
  playConvoySurpriseSound('engine');const audioDraws=calls-projectileDraws;Math.random=rng;
  d.cancel('fixture');d.model=new FirstLightModel('cover');d.model.encounter={kind:'convoy',sector:3,age:3,suspended:false,...makeConvoySurprise('shielded-evacuation',1)};
  d.model.hit('leftShield',100,{});d.model.hit('rightShield',100,{});d.update(1);
  const target=d.view.targets.find(t=>t.cover),hostiles=[];
  for(let i=0;i<2;i++){const b=new Bullet(target.x,target.y,0,1,1,0xffaa77,false);s.bulletManager.addEnemyBullet(b);hostiles.push(b);}
  d.interceptShots();const hostileActive=hostiles.map(b=>b.active);
  const remaining=d.view.targets.find(t=>t.cover&&t.part!==target.part);let credited=0;const original=s.recordCombatProjectileHit;s.recordCombatProjectileHit=()=>credited++;
  const friendly=new Bullet(remaining.x,remaining.y,0,-10,1,0x72dddd,true);friendly.piercing=true;friendly.isTacticalDroneShot=true;s.bulletManager.addPlayerBullet(friendly);d.interceptShots();s.recordCombatProjectileHit=original;
  const outside=firstLightShotTouches({x:remaining.x,y:remaining.y+60,previousX:remaining.x,previousY:remaining.y+60,radius:0},remaining);
  const before={score:g.score,lives:g.lives};d.cancel('retry');
  const ownerBullets=[...s.bulletManager.enemyBullets,...s.bulletManager.playerBullets].filter(b=>b.active&&b.firstLightOwner===d).length;
  const poolKeys=Object.keys(AudioManager.sfxPools).filter(k=>k.startsWith('rescue_'));
  return {projectileDraws,audioDraws,hostileActive,friendlyActive:friendly.active,credited,outside,ownerBullets,poolCount:poolKeys.length,poolSizes:poolKeys.map(k=>AudioManager.sfxPools[k].length),sameScore:g.score===before.score&&g.lives===before.lives};
 });
 writeFileSync(path.join(out,'report.json'),JSON.stringify({result,errors},null,2));
 assert.equal(result.projectileDraws,0,'new bullet cosmetic phase must not advance gameplay RNG');
 assert.equal(result.audioDraws,0,'new cue selection and pitch preserve gameplay RNG');
 assert.deepEqual(result.hostileActive,[false,true],'a destroyed plate stops exactly the bullet that hit it');
 assert(!result.friendlyActive&&result.credited===0&&!result.outside&&result.ownerBullets===0&&result.sameScore);
 assert.equal(result.poolCount,8);assert(result.poolSizes.every(n=>n===2));assert.deepEqual(errors,[]);
 console.log('[convoy-surprise-safety] PASS cosmetic RNG, symmetric finite cover/ownership, sixteen prewarmed audio slots and cleanup');
}finally{await browser.close();}
