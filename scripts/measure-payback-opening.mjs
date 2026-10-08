import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {ShipData} from '../src/config/ShipData.js';

const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  const compiled=process.env.PAYBACK_COMPILED==='1';
  if(compiled){
    assert(!process.env.PAYBACK_ADMISSION_SECONDS&&!process.env.PAYBACK_COORDINATE,'Compiled verification uses unmodified product code');
    await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=>'boss-snake'};});
  }
  // Optional tuning hypothesis exists only in this isolated browser, never on disk.
  const hypothesis=process.env.PAYBACK_ADMISSION_SECONDS;
  if(hypothesis!==undefined){
    const n=Number(hypothesis);assert(Number.isFinite(n)&&n>=.4&&n<=2);
    await page.route('**/src/game/ArcadeFirstLight.js',async route=>{
      const response=await route.fetch(),body=await response.text();
      const named=/rivalAdmissionAge:\s*[\d.]+/;
      assert(named.test(body)||/e\.age\s*<\s*2/.test(body),'Admission tuning must be present');
      await route.fulfill({response,body:named.test(body)?body.replace(named,`rivalAdmissionAge: ${n}`)
        :body.replace(/e\.age\s*<\s*2/,`e.age < ${n}`)});
    });
  }
  await page.goto(`${process.env.CHECK_URL}/${compiled?'?offlineLeaderboard=1':'?autostart=1&offlineLeaderboard=1&encounterEvolution=natural'}`);
  if(compiled){
    await page.waitForFunction(()=>window.__game?.currentSceneName==='shipSelect'&&document.body.dataset.menuReady==='1',null,{timeout:120000});
    await page.evaluate(()=>window.__game.startGame(undefined,{countShipUsage:false}));
    await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.active&&window.__game.scenes.play.introComplete&&!window.__game.scenes.play.levelStartWarmupPending,null,{timeout:120000});
    await page.evaluate(()=>{
      const g=window.__game,s=g.scenes.play;
      if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe compiled fixture');
      g.app.ticker.stop();g.encounterEvolutionTest={id:'natural',seed:'encounter-evolution-local-v1'};
      s.enemyManager.clearEnemies();s.enemyManager.boss=null;s.clearBossHazards('payback-matrix');
      s.firstLightDirector.enabled=true;s.firstLightDirector.loadArt();s.firstLightDirector.loadRescueAudio();
    });
  }
  await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.view&&window.__game.scenes.play.introComplete&&!window.__game.scenes.play.introActive,null,{timeout:120000});
  const result=await page.evaluate(async({coordinate,compiled,ships})=>{
    const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;
    g.app.ticker.stop();
    if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe fixture policy');
    const FirstLightModel=compiled?d.model.constructor:(await import('/src/game/ArcadeFirstLight.js')).FirstLightModel;
    const Player=compiled?s.player.constructor:(await import('/src/entities/Player.js')).Player;
    if(!compiled){const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;}
    m.clearEnemies();m.clearPendingWaveSpawns();s.bulletManager.clearAll('payback-opening');
    s.clearToastState();s.activeMayhemReinforcementWarning=null;s.activeMayhemRoutineWarning=null;m.mayhemReinforcementState=null;
    s.introComplete=true;s.introActive=false;s.isPaused=false;
    m.waves=[{type:'grunt',count:0,isChallenge:false}];m.currentWaveIndex=0;m.spawning=true;m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
    const originalPlayer=s.player,w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight(),rows=[];
    const cases=[['Nova Sparrow','allies-only'],['Nova Sparrow','low'],['Circuit Tap','weak-rapid'],['Quasar Fan','broad'],
      ['Iron Orbit','slow'],['Glacier Scope','precision'],['Nova Sparrow','ghost'],['Nova Sparrow','drone'],
      ['Nova Sparrow','chain'],['Nova Sparrow','piercing']];
    for(const [name,gear] of cases){
      d.cancel('payback-matrix');s.bulletManager.clearAll('payback-matrix');
      const model=d.model=new FirstLightModel('encounter-evolution-local-v1');d.lastPaybackStatus=null;
      if(coordinate){
        const update=model.updatePayback.bind(model);
        model.updatePayback=(dt,context)=>{
          const ready=model.payback?.status==='ready';update(dt,context);
          if(ready&&model.payback?.status==='active'){
            const targets=d.view.targets.filter(t=>['left','right'].includes(t.part)&&model.encounter.hp[t.part]>0);
            targets.sort((a,b)=>Math.abs(b.x-s.player.x)-Math.abs(a.x-s.player.x));
            if(targets[0])model.payback.part=targets[0].part;
          }
        };
      }
      for(let i=0;i<310;i++)model.update(1/60,{sector:1,safe:true});
      model.hit('left',100,{});model.hit('right',100,{});
      for(let i=0;i<680;i++)model.update(1/60,{sector:1,safe:true});
      if(model.payback?.status!=='ready')throw Error('Original escort service did not finish');
      g.level=m.level=2;
      while(!model.encounter)model.update(1/60,{sector:2,safe:true});
      const hull=ships.find(x=>x.name.toLowerCase()===name.toLowerCase());if(!hull)throw Error(name);
      const player=new Player(w*.5,h*.84,s.inputManager,s.gameplayGame,hull.spriteKey);s.player=player;
      if(gear==='ghost')player.applyPowerup('ghost');
      if(gear==='drone')player.applyRunAugment('drones');
      if(gear==='chain')player.applyPowerup('chain_lightning');
      if(gear==='piercing')player.applyPowerup('pierce');
      d.view.update(model,0,w,h,player,d.charges);
      const e=model.encounter,sideHp=e.maxHp.side;
      let playerDamage=0;
      const hit=model.hit.bind(model);
      model.hit=(part,amount,projectile)=>{const before=e.hp[part],result=hit(part,amount,projectile);
        if(result&&!projectile?.firstLightPayback)playerDamage+=Math.max(0,before-e.hp[part]);return result;};
      let activeAt=null,damageAt=null,playerShots=0,droneShots=0,alliedShots=0,peakPlayerBullets=0;
      for(let frame=0;frame<600;frame++){
        const targets=d.view.targets.filter(t=>!t.cover&&!t.blocked);
        const target=targets.find(t=>t.part==='left')||targets.find(t=>t.part==='right')||targets[0];
        if(target)player.x+=Math.max(-player.speed,Math.min(player.speed,target.x-player.x));
        if(!Number.isFinite(player.x))throw Error('Non-finite fixture steering');
        player.shootCooldown=Math.max(0,player.shootCooldown-1000/60);player.updateDrones(1/60);
        if(gear!=='allies-only'&&player.canShoot()){
          const shots=player.shoot();playerShots+=shots.length;droneShots+=shots.filter(b=>b.isTacticalDroneShot).length;
          for(const b of shots)s.bulletManager.addPlayerBullet(b);
        }
        s.bulletManager.update(1);
        const before=new Set(s.bulletManager.playerBullets);
        d.update(1);
        alliedShots+=s.bulletManager.playerBullets.filter(b=>b.firstLightPayback&&!before.has(b)).length;
        peakPlayerBullets=Math.max(peakPlayerBullets,s.bulletManager.playerBullets.filter(b=>b.active).length);
        if(model.payback.status==='active')activeAt??=frame/60;
        if(model.payback.spentDamage>0)damageAt??=frame/60;
      }
      const row={name,gear,sideHp,playerShots,playerDamage,droneShots,alliedShots,peakPlayerBullets,activeAt,damageAt,
        spent:model.payback.spentDamage,part:model.payback.part,status:model.payback.status,hp:{...e.hp},won:e.won,rewards:model.rewardCount,
        mode:g.runMode,damage:player.bulletDamage,shootDelay:player.shootDelay};
      if(gear==='drone'&&!droneShots)throw Error('Real drone volleys missing');
      rows.push(row);d.cancel('case-end');s.bulletManager.clearAll('case-end');player.destroy();s.player=originalPlayer;
    }
    g.app.render();return {rows,policy:g.runPolicy,version:JSON.parse(window.render_game_to_text()).buildId};
  },{coordinate:process.env.PAYBACK_COORDINATE==='1',compiled,ships:ShipData.map(({name,spriteKey})=>({name,spriteKey}))});
  writeFileSync(path.join(out,'report.json'),JSON.stringify({compiled,hypothesis:hypothesis??null,coordinatePrototype:process.env.PAYBACK_COORDINATE==='1',
    conditions:'Fixed 600 simulation steps per case; actual Player volleys and moving FirstLight targets, bounded target-following steering. Isolated earned-rescue setup, no other enemies, no human skill/fun or whole-run perf claim.',...result,errors},null,2));
  assert.deepEqual(errors,[]);
  assert(result.rows.slice(1).every(r=>r.playerDamage>0),'Every firing fixture must actually damage a target');
  assert(result.rows.every(r=>r.spent<=r.sideHp*.7+1e-8&&r.rewards<=1));
  const only=result.rows[0];assert(only.spent>0&&!only.won&&only.rewards===0&&only.hp[only.part==='left'?'right':'left']===only.sideHp);
  console.log(JSON.stringify({ok:true,hypothesis:hypothesis??null,rows:result.rows}));
}finally{await browser.close();}
