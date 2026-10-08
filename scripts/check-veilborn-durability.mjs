import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='E:/Codex/builds/nova-swarm/encounter-pacing/durability';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const rows=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>/^https?:\/\/127\.0\.0\.1/.test(r.request().url())?r.continue():r.abort());
 await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=> 'mystery:all'};});
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5218')+'/?skipIntro=1&offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});
 await launchEncounterTestFromHangar(page);
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.waves?.length===57,null,{timeout:120000});
 for(const [sector,ship,extras,ids]of [[20,0,[],['glass_widow','needle_saint']],
   [40,2,['damage_up','rapid_fire'],['rail_cathedral','avalanche_engine']],
   [60,29,['damage_up','rapid_fire','double_shot','focus_lens'],['choir_unbound','worldmolt']]]){
  for(const id of ['boss',...ids]){
   await page.evaluate(async({sector,ship,extras,id})=>{
    const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.app.ticker.stop();p.setPaused(false);
    m.clearEnemies();p.clearEnemyBullets();p.clearBossHazards();m.state='DURABILITY_QA';g.level=m.level=sector;
    p.introActive=false;p.introComplete=true;if(p.introOverlay)p.introOverlay.visible=false;
    const {ShipData}=await import('/src/config/ShipData.js');const {Player}=await import('/src/entities/Player.js');
    const {Boss}=await import('/src/entities/Boss.js');const {getBossProfileForRun}=await import('/src/config/BossRoster.js');
    const {createMysteryEncounter}=await import('/src/entities/mysteries/createMysteryEncounter.js');
    const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;AudioManager.stopAllVoices();
    p.player.destroy();p.player.sprite?.parent?.removeChild(p.player.sprite);
    p.player=new Player(960,890,p.inputManager,p.gameplayGame,ShipData[ship].spriteKey);p.gameContainer.addChild(p.player.sprite);
    g.selectedShipSpriteKey=ShipData[ship].spriteKey;g.refreshThreatResponse(extras.length);
    const applied=extras.map(key=>({key,result:p.player.applyRunAugment(key)}));
    g.lives=3;p.isDebugInvincibleActive=()=>true;p.inputManager.isFiring=()=>true;
    let enemy;
    if(id==='boss'){
      enemy=new Boss(960,100,sector,m.game,getBossProfileForRun(sector));await enemy.createSprite();
      m.enemies.push(enemy);m.container.addChild(enemy.sprite);m.boss=enemy;
    }else enemy=await createMysteryEncounter(m,id);
    const probe=window.__durability={id,sector,ship:ShipData[ship].name,applied,hp:enemy.maxHealth,
      componentHp:enemy.definition?.durability.component,damage:p.player.bulletDamage,shotDelay:p.player.shootDelay,
      scoreStart:g.score,started:performance.now(),done:false};
    p.inputManager.getMouseSteeringIntent=(x,y)=>({active:true,moveX:Math.max(-1,Math.min(1,(enemy.x-x)/24)),moveY:Math.max(-1,Math.min(1,(890-y)/24))});
    const frame=now=>{
      probe.seconds=(now-probe.started)/1000;
      if(!enemy.active||probe.seconds>=70){
        probe.done=true;probe.defeated=enemy.health<=0;probe.outcome=enemy.stats?.outcome;
        probe.health=enemy.health;probe.attacks=enemy.stats?.attacks;probe.breaks=enemy.stats?.breaks;
        probe.scoreEarned=g.score-probe.scoreStart;probe.scorePacing=g.encounterScoreLog?.at(-1);g.app.ticker.stop();
      }else requestAnimationFrame(frame);
    };g.app.ticker.start();requestAnimationFrame(frame);
   },{sector,ship,extras,id});
   await page.waitForTimeout(3500);await page.screenshot({path:`${out}/${sector}-${id}.png`});
   await page.waitForFunction(()=>window.__durability.done,null,{timeout:75000});
   const row=await page.evaluate(()=>window.__durability);rows.push(row);
   fs.writeFileSync(out+'/results.json',JSON.stringify({mode:'Wall-clock projectile and collision fixtures. Scripted aiming through normal Player movement; player invulnerability isolates offense. Same ship/upgrades and normal boss build-response within each sector.',rows,errors},null,2));
   console.log(JSON.stringify(row));assert.deepEqual(errors,[]);assert.ok(row.defeated,`${id} should be killable before escape with the representative loadout`);
  }
 }
}finally{await browser.close();}
