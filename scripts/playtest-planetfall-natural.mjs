import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const out=process.env.CHECK_OUTPUT_DIR,url=process.env.CHECK_URL||'http://127.0.0.1:5010';
assert(out?.startsWith('E:'));assert(['localhost','127.0.0.1'].includes(new URL(url).hostname));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],samples=[],bosses=[];
let held=new Set();
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${url}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&!window.__game.scenes.play.introActive,null,{timeout:90000});
 const setup=await page.evaluate(()=>{
  const g=window.__game,p=g.runPolicy;
  if(!p.prototype||Object.entries(p).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe natural playtest');
  return {seed:g.contentDirector.seed,policy:p,sector:g.level,lives:g.lives,damage:g.scenes.play.player.bulletDamage};
 });assert.equal(setup.sector,1);
 const until=Date.now()+(Number(process.env.PLAYTEST_SECONDS)||1500)*1000;
 let lastBoss='',seen=false,won=false,continued=false;
 while(Date.now()<until){
  const row=await page.evaluate(()=>{
   const g=window.__game,s=g.scenes.play,p=s.player,m=s.enemyManager;
   if(g.currentSceneName!=='play'||!p)return {ended:true,sector:g.level,lives:g.lives};
   const w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight(),b=m.boss;
   const components=b?.components?.filter(e=>e.active&&!e.untargetable)||[];
   const target=components.find(e=>e.part?.role==='core')||components.sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
   const enemies=m.enemies.filter(e=>e.active&&!e.untargetable&&!e.root&&e.y>20&&e.y<h*.78&&e.x>30&&e.x<w-30);
   const nearest=enemies.sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
   const pickup=(s.powerupManager.powerups||[]).find(e=>e.active&&e.y>h*.65&&Math.abs(e.x-p.x)<140);
   const preferred=target?.x??pickup?.x??nearest?.x??w*.4;
   const threats=s.bulletManager.enemyBullets.filter(e=>e.active&&Math.abs(e.y-p.y)<340&&Math.abs(e.x-p.x)<380);
   const options=[-1,0,1].map(dir=>{
    let risk=0;for(const t of [6,12,20,30]){
     const px=Math.max(45,Math.min(w-45,p.x+dir*p.speed*t));
     for(const b of threats){const d=Math.hypot(px-(b.x+b.vx*t),p.y-(b.y+b.vy*t));risk+=Math.max(0,70-d)**2*(t<=12?2:1);}
     for(const e of enemies)if(Math.abs(e.y-p.y)<120&&!e.noContactDamage)risk+=Math.max(0,100-Math.hypot(px-e.x,p.y-e.y))**2;
    }
    return {dir,cost:risk+Math.abs(preferred-(p.x+dir*p.speed*20))*.7};
   }).sort((a,b)=>a.cost-b.cost);
   return {elapsed:g.runElapsedSeconds,sector:g.level,lives:g.lives,score:g.score,state:m.state,x:p.x,y:p.y,w,h,dir:options[0].dir,
    danger:threats.some(b=>b.y<p.y&&b.y>p.y-150&&Math.abs(b.x-p.x)<55),paused:s.isPaused,draft:s.tacticalDraft?.active,
    boss:b?.active?{id:b.profile?.id,planetfall:!!b.isPlanetfall,breach:!!b.isDreadnought,health:b.health}:null,
    admitted:g.encounterPacing?.planetfallSector??null,defeated:s.defeatedBossIds.includes('planetfall'),damage:p.bulletDamage,
    recovery:g.encounterPacing?{levels:g.encounterPacing.eligibleLevels,through:g.encounterPacing.recoveryThrough,seconds:g.encounterPacing.ordinarySeconds,waves:g.encounterPacing.ordinaryWaves}:null};
  });
  samples.push(row);if(row.ended)break;
  if(row.boss&&`${row.sector}:${row.boss.id}`!==lastBoss){lastBoss=`${row.sector}:${row.boss.id}`;bosses.push(row);console.log(JSON.stringify({event:'boss',...row}));}
  const next=new Set(['Space']);if(row.dir)next.add(row.dir<0?'ArrowLeft':'ArrowRight');
  if(row.y<row.h*.79)next.add('ArrowDown');else if(row.y>row.h*.87)next.add('ArrowUp');if(row.danger)next.add('Shift');
  for(const key of held)if(!next.has(key))await page.keyboard.up(key);
  for(const key of next)if(!held.has(key))await page.keyboard.down(key);held=next;
  if(row.draft){for(const key of held)await page.keyboard.up(key);held.clear();await page.waitForTimeout(400);await page.keyboard.press('Enter');}
  if(row.paused)await page.keyboard.press('p');
  if(row.boss?.planetfall&&!seen){seen=true;await page.screenshot({path:path.join(out,'natural-planetfall.png')});}
  if(row.defeated&&!won){won=true;await page.screenshot({path:path.join(out,'natural-victory.png')});}
  if(won&&row.sector>row.admitted){continued=true;await page.screenshot({path:path.join(out,'continued.png')});break;}
  if(samples.length%100===0)console.log(JSON.stringify({elapsed:row.elapsed,sector:row.sector,lives:row.lives,state:row.state,seen,won}));
  await page.waitForTimeout(100);
 }
 for(const key of held)await page.keyboard.up(key);
 const final=await page.evaluate(()=>({policy:window.__game.runPolicy,runtime:JSON.parse(window.render_game_to_text())}));
 const status=seen&&won&&continued?'pass':'not-reached-or-not-completed';
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status,scope:'Unforced sector1 run, finite lives, ordinary damage, real keyboard/earned Phase/drafts; no forced enemies, kills, sectors, immunity, RNG or pacing counters. Automated pilot, not human fun evidence.',setup,seen,won,continued,bosses,samples,final,errors},null,2));
 assert.deepEqual(errors,[]);assert(seen&&won&&continued,'Natural discovery, victory and continuation not yet demonstrated');
 console.log('[planetfall-natural] PASS unforced discovery, victory and continuation');
}finally{await browser.close();}
