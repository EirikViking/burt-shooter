import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[],failures=[],errors=[];
try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4930'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=molt`);
  await page.waitForFunction(()=>{
    const s=window.__game?.scenes.play;
    return s?.firstLightDirector?.view&&s.introComplete&&!s.introActive;
  },null,{timeout:90000});
  await page.evaluate(()=>window.__game.app.ticker.stop());
  const result=await page.evaluate(async()=>{
    const {FirstLightModel}=await import('/src/game/ArcadeFirstLight.js');
    const {FirstLightVisual}=await import('/src/effects/ArcadeFirstLightVisual.js');
    const s=window.__game.scenes.play,d=s.firstLightDirector;
    const w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
    const results=[];
    for(const kind of ['convoy','rival'])for(let variant=0;variant<(kind==='convoy'?4:6);variant++){
      const model=new FirstLightModel('continuity');
      for(let i=0;i<70;i++)model.update(.1,{sector:kind==='convoy'?1:2,safe:true});
      const e=model.encounter;e.variant=variant;
      const view=new FirstLightVisual(s,d.view.art);
      const tick=(dt=1/60)=>{view.update(model,dt,w,h,s.player);return {x:view.pose.x,y:view.pose.y,alpha:view.contact.alpha,targets:view.targets.length};};
      e.age=3;tick();e.suspended=true;for(let i=0;i<10;i++)tick();const retreat=tick();
      e.suspended=false;const resume=tick();
      e.suspended=true;const reverse=tick();
      e.suspended=false;for(let i=0;i<90;i++)tick();
      e.age=1.4-1/6000;const arrivalBefore=tick();e.age=1.4+1/6000;const arrivalAfter=tick();
      e.age=e.duration-1.5-1/6000;const exitBefore=tick();e.age+=2/6000;const exitAfter=tick();
      let rescue=null;
      if(kind==='convoy'){
        e.age=11.25;const before=tick();
        model.hit('left',1e5,{});model.hit('right',1e5,{});const after=tick();
        const path=[];for(let i=0;i<33;i++){model.update(.1,{sector:1,safe:true});path.push(tick());}
        rescue={before,after,path,ended:model.encounter===null,escorts:model.escorts.length};
      }
      results.push({kind,variant,retreat,resume,reverse,arrivalBefore,arrivalAfter,exitBefore,exitAfter,rescue});
      view.destroy();
    }
    return {results,prototype:window.__game.runPolicy.prototype};
  });
  assert(result.prototype);
  const warning=await page.evaluate(async()=>{
    const {FirstLightModel}=await import('/src/game/ArcadeFirstLight.js');
    const {Bullet}=await import('/src/entities/Bullet.js');
    const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;
    // Isolate the warning in an ordinary wave; the DEV Molt fixture is already
    // progression/submission barred and must not install a snake mid-check.
    d.localTestStarted=true;m.enemies=[];m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
    m.waves=[];m.challengeFlightState=null;m.discoveryEncounter=null;m.environment=null;
    m.boss=null;m.hijacker=null;m.mysteryDirector=null;
    if(s.activeBossIntroCard?.parent)s.activeBossIntroCard.parent.removeChild(s.activeBossIntroCard);
    m.mayhemReinforcementState=null;s.introComplete=true;s.introActive=false;g.level=1;
    d.model=new FirstLightModel('warning-continuity');
    for(let i=0;i<60;i++)d.model.update(.1,{sector:1,safe:true});
    const e=d.model.encounter;e.age=3;d.update(1);
    const before={pose:{...d.view.pose},age:e.age,hp:{...e.hp},score:g.score};
    const hostile=new Bullet(100,100,0,1,1,0xff0000,false);hostile.firstLightOwner=d;s.bulletManager.addEnemyBullet(hostile);
    s.showMayhemReinforcementStormWarning({groupCount:2,boss:false,superStorm:false,warningMs:1200});
    for(let i=0;i<60;i++){
      d.update(1);s.activeMayhemReinforcementWarning?.root?.__toastTicker?.(1);
    }
    g.app.render();window.__continuityWarning=e;
    const held={pose:{...d.view.pose},age:e.age,hp:{...e.hp},score:g.score,suspended:e.suspended,safe:d.safe(),hostileActive:hostile.active,
      headline:d.headlineWarningActive?.(),presentation:s.lastMayhemReinforcementPresentation,
      intro:s.introActive,draft:s.tacticalDraft?.active,milestone:s.overrunMilestoneInterlude?.active};
    return {before,held};
  });
  await page.screenshot({path:path.join(out,'ordinary-reinforcement.png')});
  const warningOK=!warning.held.suspended&&!warning.held.safe&&!warning.held.hostileActive
    &&warning.held.age===warning.before.age&&warning.held.score===warning.before.score
    &&JSON.stringify(warning.held.hp)===JSON.stringify(warning.before.hp)
    &&Math.abs(warning.held.pose.y-warning.before.pose.y)<1;
  (warningOK?checks:failures).push({name:'ordinary reinforcement holds hull but freezes attacks/health/time/rewards',detail:warning});
  console.log(warningOK?'PASS':'FAIL','ordinary reinforcement holds hull',JSON.stringify(warning));
  const headline=await page.evaluate(()=>{
    const g=window.__game,s=g.scenes.play,d=s.firstLightDirector;
    s.activeMayhemReinforcementWarning?.cleanup('test');
    s.showMayhemReinforcementStormWarning({groupCount:3,superStorm:true,warningMs:1200});
    for(let i=0;i<65;i++)d.update(1);
    const r={suspended:d.model.encounter.suspended,alpha:d.view.contact.alpha,targets:d.view.targets.length};
    s.activeMayhemReinforcementWarning?.cleanup('test');return r;
  });
  const headlineOK=headline.suspended&&headline.alpha<.01&&headline.targets===0;
  (headlineOK?checks:failures).push({name:'headline storm still clears the encounter presentation',detail:headline});
  for(const r of result.results){
    const check=(name,ok,detail)=>{const row={name:`${r.kind}/${r.variant}: ${name}`,detail};(ok?checks:failures).push(row);console.log(ok?'PASS':'FAIL',row.name,JSON.stringify(detail));};
    check('interrupted retreat resumes without teleport or blink',Math.abs(r.resume.y-r.retreat.y)<20&&Math.abs(r.resume.alpha-r.retreat.alpha)<.1,{before:r.retreat,after:r.resume});
    check('reversing a partial re-entry stays continuous',Math.abs(r.reverse.y-r.resume.y)<20&&Math.abs(r.reverse.alpha-r.resume.alpha)<.1,{before:r.resume,after:r.reverse});
    check('arrival joins drift continuously',Math.abs(r.arrivalAfter.x-r.arrivalBefore.x)<1,{before:r.arrivalBefore.x,after:r.arrivalAfter.x});
    check('departure leaves drift continuously',Math.abs(r.exitAfter.x-r.exitBefore.x)<1,{before:r.exitBefore.x,after:r.exitAfter.x});
    if(r.rescue){const q=r.rescue,direction=r.variant===1?-1:1;
      check('late rescue never returns an already departing hull',Math.abs(q.after.x-q.before.x)<2&&q.path.every((p,i)=>i===0||direction*(p.x-q.path[i-1].x)>-2),{before:q.before,after:q.after});
      check('late rescue expires and keeps exactly two fighters',q.ended&&q.escorts===2,{ended:q.ended,escorts:q.escorts});
    }
  }
  await page.screenshot({path:path.join(out,'runtime.png')});
} finally {
  await browser.close();writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,failures,errors},null,2));
}
assert.deepEqual(errors,[]);assert.equal(failures.length,0,JSON.stringify(failures));
