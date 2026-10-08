import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR,choice=process.env.REACTOR_CHOICE||'coupler',natural=process.env.REACTOR_NATURAL==='1';
assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));assert(['coupler','vent'].includes(choice));
const url=new URL(process.env.CHECK_URL||'http://127.0.0.1:4983');assert(['127.0.0.1','localhost'].includes(url.hostname));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],samples=[],inputs=[];let held=new Set(),screens=0;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(url.origin+'/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural');
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&!window.__game.scenes.play.introActive,null,{timeout:120000});
 const setup=await page.evaluate(async natural=>{
  const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,p=g.runPolicy;
  if(!p.prototype||Object.entries(p).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe preview policy');
  const {makeReactorTow}=await import('/src/game/ReactorTow.js');
  const f=window.__reactorPressure={replaced:null,event:null,shots:[],hits:[],initialDamage:s.player.bulletDamage};
  // Substitute ONE existing eligible rescue opportunity. All ordinary enemies,
  // warnings, inputs, damage and sector transitions continue. Not a spawn-frequency test.
  const update=d.model.update.bind(d.model);
  d.model.update=function(dt,context){update(dt,context);if(natural){if(!f.event&&this.encounter?.reactor){f.event=this.encounter;f.at=g.runElapsedSeconds;}return;}if(!f.event&&this.encounter?.surprise){
   f.replaced=this.encounter.surprise;f.at=g.runElapsedSeconds;
   this.encounter={kind:'convoy',sector:g.level,age:0,suspended:false,...makeReactorTow(1+Math.min(4,(g.level-1)/25))};f.event=this.encounter;
  }};
  const add=s.bulletManager.addEnemyBullet.bind(s.bulletManager);
  s.bulletManager.addEnemyBullet=b=>{if(b.firstLightPart==='vent')f.shots.push({x:b.x,y:b.y,at:g.runElapsedSeconds,age:f.event?.age});return add(b);};
  return {seed:g.contentDirector.seed,mode:g.runMode,damage:s.player.bulletDamage,hull:g.selectedSpriteKey,lives:g.lives,policy:p,natural};
 },natural);
 const started=Date.now(),limit=Number(process.env.PLAYTEST_SECONDS)||210;
 while(Date.now()-started<limit*1000){
  const r=await page.evaluate(choice=>{
   const g=window.__game,s=g.scenes.play,f=window.__reactorPressure;
   if(g.currentSceneName!=='play'||!s?.player)return {ended:true,score:g.score,lives:g.lives,sector:g.level};
   const p=s.player,m=s.enemyManager,d=s.firstLightDirector,w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
   const parts=d.view?.targets?.filter(t=>!t.blocked&&!t.cover)||[];
   const chosen=f.event===d.model.encounter?parts.find(t=>t.part===choice):parts.find(t=>t.part!=='core')||parts[0];
   const enemies=m.enemies.filter(e=>e.active&&!e.untargetable&&!e.root&&e.y>20&&e.y<h*.78&&e.x>30&&e.x<w-30);
   const enemy=enemies.sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
   const pickup=(s.powerupManager.powerups||[]).find(e=>e.active&&e.y>h*.65&&Math.abs(e.x-p.x)<110);
   let targetX=chosen?.x??pickup?.x??enemy?.x??w*.35;
   const close=s.bulletManager.enemyBullets.filter(b=>b.active&&b.y<p.y&&b.y>p.y-150&&Math.abs(b.x-p.x)<55);
   if(close.length){const left=p.x>90&&close.every(b=>Math.abs(b.x-(p.x-110))>45);targetX=p.x+(left?-135:135);}
   targetX=Math.max(45,Math.min(w-45,targetX));
   return {elapsed:g.runElapsedSeconds,score:g.score,lives:g.lives,sector:g.level,state:m.state,x:p.x,y:p.y,w,h,targetX,danger:close.length>0,
    paused:s.isPaused,draft:s.tacticalDraft?.active,damage:p.bulletDamage,ordinary:enemies.length,bullets:s.bulletManager.enemyBullets.filter(b=>b.active).length,
    active:f.event===d.model.encounter&&!!f.event,age:f.event?.age,hp:f.event?{...f.event.hp}:null,reactor:f.event?{...f.event.reactor}:null,
    replaced:f.replaced,shots:f.shots,endedContact:!!f.event&&f.event!==d.model.encounter,contact:d.model.encounter?.kind,targets:parts};
  },choice);
  samples.push(r);
  if(r.ended)break;
  const next=new Set(['Space']);if(Math.abs(r.targetX-r.x)>16)next.add(r.targetX<r.x?'ArrowLeft':'ArrowRight');
  if(r.y<r.h*.79)next.add('ArrowDown');else if(r.y>r.h*.87)next.add('ArrowUp');if(r.danger)next.add('Shift');
  for(const k of held)if(!next.has(k))await page.keyboard.up(k);for(const k of next)if(!held.has(k))await page.keyboard.down(k);held=next;
  if(r.draft){for(const k of held)await page.keyboard.up(k);held.clear();await page.waitForTimeout(400);await page.keyboard.press('Enter');}
  if(r.paused)await page.keyboard.press('p');
  inputs.push({wallMs:Date.now()-started,elapsed:r.elapsed,keys:[...held]});
  if(r.active&&r.age>=1.5+screens*2&&screens<5){await page.screenshot({path:path.join(out,'pressure-'+screens+++'.png')});}
  if(samples.length%80===0)console.log(JSON.stringify({choice,elapsed:r.elapsed,sector:r.sector,lives:r.lives,ordinary:r.ordinary,active:r.active,hp:r.hp}));
  if(r.endedContact){await page.screenshot({path:path.join(out,'after-contact.png')});break;}
  await page.waitForTimeout(100);
 }
 for(const k of held)await page.keyboard.up(k);
 const final=await page.evaluate(()=>({policy:window.__game.runPolicy,runtime:JSON.parse(window.render_game_to_text())}));
 const report={natural,conditions:(natural?'Natural admission: no replacement, forced contact/kill/sector, granted damage or invulnerability. ':'Substitution probe: ')+ 'Finite lives, ordinary starting damage, actual keyboard/autofire/earned Phase/drafts. Ordinary waves/enemies intact. Substitution applies only when natural=false. Neither mode establishes population frequency, paired deterministic replay or human fun.',choice,setup,final,samples,inputs,errors};
 writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 assert.deepEqual(errors,[]);assert(final.policy.prototype&&!Object.entries(final.policy).some(([k,v])=>k.startsWith('allow')&&v));
 assert(samples.some(s=>s.active&&s.ordinary>0),'Need actual ordinary pressure');assert(samples.some(s=>s.endedContact),'Need finite contact completion');
 console.log(JSON.stringify({choice,status:'observed',start:samples.find(s=>s.active),end:samples.at(-1)}));
}finally{await browser.close();}
