import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {BOSS_ROSTER} from '../src/config/BossRoster.js';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=>'boss-snake'};});
  await page.goto(process.env.CHECK_URL+'/?offlineLeaderboard=1');
  await page.waitForFunction(()=>window.__game?.currentSceneName==='shipSelect'&&document.body.dataset.menuReady==='1',null,{timeout:120000});
  await page.evaluate(()=>window.__game.startGame(undefined,{countShipUsage:false}));
  await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.active&&window.__game.scenes.play.introComplete&&!window.__game.scenes.play.levelStartWarmupPending,null,{timeout:120000});
  const initial=await page.evaluate(()=>{
    const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();
    if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe compiled fixture');
    window.__mechanicalBossType=m.boss.constructor;
    m.clearEnemies();m.clearPendingWaveSpawns();s.firstLightDirector.cancel('boss-mechanical-qa');m.boss=null;
    s.clearToastState();s.clearBossHazards('boss-mechanical-qa');s.introActive=false;s.player.active=true;
    return{score:g.score,lives:g.lives,version:JSON.parse(window.render_game_to_text()).buildId};
  });
  for(const profile of [...new Map(BOSS_ROSTER.map(p=>[p.archetype,p])).values()]){
    const row=await page.evaluate(async profile=>{
      const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();
      m.clearEnemies();m.clearPendingWaveSpawns();m.boss=null;
      const w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
      const b=new window.__mechanicalBossType(w*.5,h*.28,3,s.gameplayGame,profile);
      await b.createSprite();m.enemies.push(b);m.boss=b;s.gameContainer.addChild(b.sprite);
      b.x=w*.5;b.y=h*.28;b.sprite.position.set(b.x,b.y);b.entryStartMs=Date.now()-b.entryDurationMs-1000;
      const invariant=()=>JSON.stringify({health:b.health,max:b.maxHealth,radius:b.radius,x:b.x,y:b.y,score:g.score,lives:g.lives});
      const start=invariant(),rig=b.colossusRig;if(!rig?.mechanicalPose)throw Error('Missing new rig: '+profile.archetype);
      const original=Math.random;let draws=0;const cpu=[];Math.random=()=>{draws++;return .5;};
      try{
        for(let i=0;i<180;i++){
          const tick=performance.now();b.updateBossAnimation(1,w*.5,h*.85);g.app.render();
          if(i>=60)cpu.push(performance.now()-tick);
        }
      }finally{Math.random=original;}
      const stable=JSON.stringify([rig.rotation,...rig.halves.flatMap(p=>[p.x,p.y,p.rotation])]);b.updateBossAnimation(0,w*.5,h*.85);
      const pauseStable=stable===JSON.stringify([rig.rotation,...rig.halves.flatMap(p=>[p.x,p.y,p.rotation])]);
      g.app.render();cpu.sort((a,b)=>a-b);
      return{family:profile.archetype,draws,unchanged:invariant()===start,pauseStable,children:rig.children.length,p99:cpu[118],max:cpu.at(-1),score:g.score,lives:g.lives};
    },profile);
    rows.push(row);await page.screenshot({path:`${out}/${profile.archetype}.png`});
    assert(row.unchanged&&row.pauseStable);assert.equal(row.draws,0);assert.equal(row.score,initial.score);assert.equal(row.lives,initial.lives);
  }
  assert.equal(rows.length,10);assert.equal(errors.length,0);
  writeFileSync(`${out}/report.json`,JSON.stringify({ok:true,initial,rows,errors},null,2));console.log(JSON.stringify({ok:true,initial,rows}));
}finally{await browser.close();}
