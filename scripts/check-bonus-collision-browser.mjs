import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
const b=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1920,height:1080}});
try{await p.goto('http://127.0.0.1:5192/?offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});await p.waitForFunction(()=>window.__game?.currentSceneName==='menu',null,{timeout:120000});
await p.evaluate(()=>{window.__game.scenes.menu.openSettingsOverlay();window.__game.scenes.menu.settingsOverlay.setActiveSettingsPage('audio');});
const bounds=await p.evaluate(()=>window.__game.scenes.menu.settingsOverlay.getDebugState().visibleControls.find(c=>c.id==='menu_audio_mode').bounds);await p.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);assert.equal(await p.evaluate(()=>localStorage.getItem('burt_menu_audio_mode')),'music');
await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__game?.currentSceneName==='menu');assert.equal(await p.evaluate(()=>JSON.parse(window.render_game_to_text()).audio.menuAudioMode),'music');
await p.evaluate(()=>window.__game.scenes.menu.launchHome.buttons.launchTactical.activate());await p.waitForFunction(()=>window.__game.scenes.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
const result=await p.evaluate(async()=>{
 const g=window.__game,s=g.scenes.play;g.app.ticker.stop();g.markUnrankedRun('bonus_reward_qa');const {BonusDrone}=await import('/src/entities/BonusDrone.js');const {Bullet}=await import('/src/entities/Bullet.js');
 s.enemyManager.enemies.forEach(e=>e.active=false);s.bulletManager.playerBullets=[];s.bulletManager.enemyBullets=[];s.ambientBonusDrones=[];g.scoreMultiplier=3;s.player.scoreMultiplier=4;
 const drone=new BonusDrone(700,400,g,'HAZARD');s.ambientBonusDrones.push(drone);s.container.addChild(drone.sprite);const bullet=new Bullet(700,400,0,-1,5,0xffffff,true);s.bulletManager.playerBullets.push(bullet);s.container.addChild(bullet.sprite);
 const before=g.score;s.checkCollisions();const droneResult={advertised:drone.scoreValue,delta:g.score-before,active:drone.active};
 const core=new BonusDrone(s.player.x,s.player.y,g,'POWERUP','bonus_core_treasure');s.ambientBonusDrones=[core];s.container.addChild(core.sprite);const start=g.score;s.checkCollisions();const coreResult={delta:g.score-start,active:core.active};
 return{droneResult,coreResult};
});assert.equal(result.droneResult.delta,result.droneResult.advertised);assert.equal(result.droneResult.active,false);assert.equal(result.coreResult.delta,600);assert.equal(result.coreResult.active,false);fs.writeFileSync('test-results/bonus-clarity/collision-qa.json',JSON.stringify(result,null,2));console.log('PASS real bullet kill/core pickup payouts at elevated multipliers; menu setting click and reload persistence');
}finally{await b.close();}
