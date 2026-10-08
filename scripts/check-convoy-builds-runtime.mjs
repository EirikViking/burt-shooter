import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL}/?autostart=1&offlineLeaderboard=1&encounterEvolution=rescue-twin-jailers`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.model.encounter?.surprise,null,{timeout:90000});
 const rows=await page.evaluate(async()=>{
  const {Player}=await import('/src/entities/Player.js'),{ShipData}=await import('/src/config/ShipData.js'),{CONVOY_SURPRISES}=await import('/src/config/ConvoySurpriseCatalog.js'),{FirstLightModel}=await import('/src/game/ArcadeFirstLight.js'),{makeConvoySurprise}=await import('/src/game/ConvoySurprises.js');
  const g=window.__game,s=g.scenes.play,d=s.firstLightDirector;g.app.ticker.stop();const results=[];
  for(const recipe of CONVOY_SURPRISES.filter(row=>row.parts.left&&row.parts.right))for(const [name,gear]of [['Nova Sparrow','low'],['Circuit Tap','weak rapid'],['Quasar Fan','broad'],['Iron Orbit','slow'],['Glacier Scope','precision'],['Nova Sparrow','ghost'],['Nova Sparrow','drone'],['Nova Sparrow','chain'],['Nova Sparrow','piercing']]){
   d.cancel('build-fixture');s.bulletManager.clearAll('build-fixture');d.model=new FirstLightModel('hull-matrix');d.model.encounter={kind:'convoy',sector:3,age:2,suspended:false,...makeConvoySurprise(recipe.id,1)};d.update(1);
   const hull=ShipData.find(h=>h.name.toLowerCase()===name.toLowerCase()),p=new Player(s.gameplayGame.getWidth()*.5,s.gameplayGame.getHeight()*.8,s.inputManager,s.gameplayGame,hull.spriteKey);
   if(gear==='ghost')p.applyPowerup('ghost');if(gear==='drone')p.applyRunAugment('drones');if(gear==='chain')p.applyPowerup('chain_lightning');if(gear==='piercing')p.applyPowerup('pierce');
   let shots=0,droneShots=0,frames=0;
   for(;frames<720&&d.model.encounter&&d.model.rescued<2;frames++){
    d.update(1);const target=d.view.targets.filter(t=>!t.cover&&!t.blocked).sort((a,b)=>Number(!['lock','tow'].includes(a.role))-Number(!['lock','tow'].includes(b.role)))[0];
    if(!target)continue;p.x+=Math.max(-5,Math.min(5,target.x-p.x));p.y=target.y+145;
    p.shootCooldown=Math.max(0,p.shootCooldown-1000/60);p.updateDrones(1/60);
    if(p.canShoot()){const volley=p.shoot();shots+=volley.length;droneShots+=volley.filter(b=>b.isTacticalDroneShot).length;for(const b of volley)s.bulletManager.addPlayerBullet(b);d.onPlayerVolley();}
    s.bulletManager.update(1);d.interceptShots();
   }
   results.push({id:recipe.id,name,gear,shots,droneShots,seconds:frames/60,rescued:d.model.rescued,rewards:d.model.rewardCount});p.destroy();
  }
  d.cancel('build-fixture-end');s.bulletManager.clearAll('build-fixture-end');return results;
 });
 writeFileSync(path.join(out,'report.json'),JSON.stringify({rows,errors,conditions:'Actual Player hull/powerup volleys and bullet updates; deterministic bounded target steering; fixture does not measure player survival or fun'},null,2));
 assert.equal(rows.length,72);assert(rows.every(x=>x.shots>0&&x.rescued===2&&x.rewards===0),JSON.stringify(rows.filter(x=>x.rescued!==2)));assert(rows.filter(x=>x.gear==='drone').every(x=>x.droneShots>0));assert.deepEqual(errors,[]);
 console.log('[convoy-builds] PASS 72 actual hull/augment interactions, bounded rescues, no rival reward');
}finally{await browser.close();}
