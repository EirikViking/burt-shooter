import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[],states=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/crash|fatal|game.?loop|TypeError/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{localStorage.setItem('burt_voice_enabled','false');localStorage.setItem('nova_accessibility_reduced_motion','1');localStorage.setItem('nova_accessibility_flash_intensity','0.25');});
 async function route(id){await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4896'}/?encounterEvolution=${id}&autostart=1&offlineLeaderboard=1`);
  await page.waitForFunction(()=>window.__game?.scenes?.play?.encounterExpansionTestReady,null,{timeout:90000});
  await page.evaluate(()=>{const g=window.__game,m=g.scenes.play.enemyManager;assertSafe(g);function assertSafe(g){if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe fixture');}g.app.ticker.stop();m.spawning=true;});}
 async function capture(name){assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,`${name}.png`)});}
 await route('reassembly');
 states.push(await page.evaluate(()=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager,a=m.enemies.find(e=>e.kind==='mystery'),e=m.enemies.find(e=>e.type==='grunt');
  a.age=3;a.state='FORMATION';a.recoveryUntil=0;e.x=430;e.y=340;e.health=0;s.onEnemyKilled(e);
  for(let i=0;i<30;i++)m.updateEnemies(1);m.combatWreckVisual.update();g.app.render();return{feature:'reassembly',state:a.reassembly.model.state};}));
 assert.equal(states.at(-1).state,'assembly');await capture('reassembly-pieces');
 states.push(await page.evaluate(()=>{const g=window.__game,m=g.scenes.play.enemyManager;for(let i=0;i<115;i++)m.updateEnemies(1);g.app.render();return{feature:'reassembly',state:m.enemies.find(e=>e.kind==='mystery').reassembly.model.state};}));
 assert.equal(states.at(-1).state,'active');await capture('reassembly-armed');
 await route('fusions');
 states.push(await page.evaluate(async()=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager,p=s.player,e=m.enemies.find(e=>e.type==='striker');
  const {Enemy}=await import('/src/entities/Enemy.js');const target=new Enemy(640,180,'grunt',16,s.gameplayGame);target.health=target.maxHealth=100;m.enemies.push(target);m.container.addChild(target.sprite);
  p.x=640;p.y=560;p.sprite.position.set(p.x,p.y);e.health=0;s.onEnemyKilled(e);for(let i=0;i<22;i++)m.behavioralFusions.update(1);const shotRefs=s.bulletManager.playerBullets.filter(b=>b.tacticalFusionId==='salvage_crown');s.bulletManager.update(1);g.app.render();return{feature:'salvage',pattern:m.behavioralFusions.capture?.record.pattern,shots:s.bulletManager.playerBullets.filter(b=>b.tacticalFusionId==='salvage_crown').length,ammo:m.behavioralFusions.capture?.ammo,queue:m.behavioralFusions.queue.length,shotRefs:shotRefs.map(b=>({x:b.x,y:b.y,age:b.ageMs,active:b.active,reason:b.__novaDisposedReason})),targetCount:m.behavioralFusions.targets().length,damage:p.bulletDamage};}));
 console.log(JSON.stringify(states.at(-1)));
 assert.equal(states.at(-1).pattern,'fan');assert(states.at(-1).shots>0);await capture('salvage-crown-fan');
 states.push(await page.evaluate(async()=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager,p=s.player;const {Bullet}=await import('/src/entities/Bullet.js');
  p.x=400;p.y=570;p.startDodge();p.x=800;p.y=520;for(let i=0;i<8;i++)s.bulletManager.addEnemyBullet(new Bullet(p.x+i*2,p.y-8,0,1,1,0xff6633,false));
  p.resolveDodgeExitPulse();p.sprite.position.set(p.x,p.y);for(let i=0;i<23;i++)m.behavioralFusions.update(1);g.app.render();return{feature:'crossfire',sources:m.behavioralFusions.echoes.length,shots:s.bulletManager.playerBullets.filter(b=>b.tacticalFusionId==='rift_crossfire').length};}));
 assert.equal(states.at(-1).sources,2);assert(states.at(-1).shots>0);await capture('rift-crossfire-sources');
 for(const background of ['modern','legacy']){
  await page.evaluate(background=>localStorage.setItem('nova_gameplay_background_v1',background),background);
  await route('breach');
  states.push(await page.evaluate(()=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager;for(let i=0;i<110;i++)m.updateEnemies(1);s.hud.update();g.app.render();
   return{feature:'breach',name:m.boss.name,phase:m.boss.phase,hud:s.hud.missionText.text,panelY:m.boss.panels[0].y};}));
  assert.equal(states.at(-1).name,'Dreadnought Breach');assert(states.at(-1).hud.includes('Dreadnought Breach'));assert(states.at(-1).panelY>0);await capture(`breach-${background}`);
 }
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',conditions:'Muted voices, Reduced Motion, Flash Intensity 25%, actual existing art and real killed wreck/earned Phase allocation; progression-free DEV fixtures.',states,errors},null,2));console.log(JSON.stringify(states));
}finally{await browser.close();}
