import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],samples=[],inputs=[];
page.on('pageerror',e=>errors.push(e.message));let direction=null,found=false;
try{
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4970'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&!window.__game.scenes.play.introActive,null,{timeout:90000});
 const setup=await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;assertPolicy(g);function assertPolicy(g){if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe probe policy');}
  s.player.invulnerable=true;s.player.invulnerableTime=999999;s.player.bulletDamage=8;
  return {seed:g.contentDirector.seed,hull:g.selectedSpriteKey,damage:8,policy:g.runPolicy};});
 const started=Date.now();await page.keyboard.down('Space');
 while(Date.now()-started<240000){
  const row=await page.evaluate(()=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager,p=s.player,w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
   const target=s.firstLightDirector.view?.targets?.find(t=>!t.blocked&&!t.cover&&t.part!=='core')
    ||(m.enemies||[]).filter(e=>e.active&&!e.untargetable&&e.y>20&&e.y<h*.8&&e.x>30&&e.x<w-30).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0]||m.boss;
   const dx=(target?.x??w*.5)-p.x;
   return {sector:g.level,elapsed:g.runElapsedSeconds,score:g.score,lives:g.lives,direction:Math.abs(dx)>18?(dx<0?'ArrowLeft':'ArrowRight'):null,
    paused:s.isPaused,draft:s.tacticalDraft?.active,state:m.state,ordinary:(m.enemies||[]).filter(e=>e.active&&!e.root&&!['boss','space_snake','mystery','mystery_part'].includes(e.kind)).length,
    recovery:s.firstLightDirector.model.ordinaryRecovery,encounter:s.firstLightDirector.snapshot(),events:g.encounterEvolutionLog};});
  if(direction!==row.direction){if(direction)await page.keyboard.up(direction);direction=row.direction;if(direction)await page.keyboard.down(direction);}
  if(row.paused)await page.keyboard.press('p');
  if(row.draft){await page.keyboard.up('Space');if(direction)await page.keyboard.up(direction);direction=null;await page.waitForTimeout(500);await page.keyboard.press('Enter');await page.keyboard.down('Space');}
  inputs.push({wall:(Date.now()-started)/1000,elapsed:row.elapsed,keys:['Space',direction].filter(Boolean)});
  if(inputs.length%50===0){samples.push(row);console.log(JSON.stringify({sector:row.sector,elapsed:row.elapsed,ordinary:row.ordinary,contact:row.encounter.encounter?.surprise}));}
  if(row.encounter.encounter?.surprise){samples.push(row);found=true;await page.screenshot({path:path.join(out,'natural-rescue.png')});break;}
  await page.waitForTimeout(100);
 }
 if(direction)await page.keyboard.up(direction);await page.keyboard.up('Space');
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:found&&errors.length===0?'passed':'failed',conditions:'Controlled availability probe: real keyboard/autofire and normal sector/spawn selection; test invulnerability and damage8. No forced contact, kill, sector skip or production progression. Not finite-life pace, balance or human fun evidence.',setup,found,samples,inputs,errors},null,2));
 assert(found,'A new rescue must arrive through normal early-sector selection');assert.deepEqual(errors,[]);
 console.log('[convoy-natural] PASS new contact admitted through normal sector transitions');
}finally{await browser.close();}
