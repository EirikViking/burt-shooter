import assert from 'node:assert/strict';
import {_electron as electron} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync,createWriteStream} from 'node:fs';
import path from 'node:path';
const build=JSON.parse(readFileSync('test-results/astra-build-location.json'));
const out=path.resolve('test-results/astra-opening-playthrough'+(process.argv[2]?'-'+process.argv[2]:''));mkdirSync(out,{recursive:true});
const report={executable:build.executable,description:'Automated native Tactical playthrough with ordinary keyboard firing and movement. QA invulnerability only; no forced waves, damage, kills, clock acceleration or live services. Not a human engagement test.',errors:[],events:[]};
const log=createWriteStream(path.join(out,'process.log'));
const app=await electron.launch({executablePath:build.executable,args:['--nova-fresh-profile','--windowed','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'],env:{...process.env,NOVA_SWARM_USER_DATA_DIR:path.join(out,'profile'),NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000});
app.process().stdout?.pipe(log,{end:false});app.process().stderr?.pipe(log,{end:false});const page=await app.firstWindow();
await app.context().route('**/*',r=>/^(nova-swarm:|data:|blob:)/.test(r.request().url())?r.continue():r.abort());
page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(1280,720);w.webContents.setBackgroundThrottling(false);});
 const start=Date.now();await page.evaluate(()=>window.__game.scenes.menu.quickStartRun('ranked_tactical'));
 await page.waitForFunction(()=>window.__game?.scenes?.play?.player?.active,null,{timeout:120000});report.playerActiveMs=Date.now()-start;
 await page.evaluate(()=>{const p=window.__game.scenes.play;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;if(p.isPaused)p.setPaused(false);p.player.invulnerable=true;p.player.invulnerableTime=1e9;});
 let stage='',moving=null;
 while(Date.now()-start<240000){
  const s=await page.evaluate(()=>{const p=window.__game.scenes.play,m=p.enemyManager;const targets=m.enemies.filter(e=>e.active&&!e.waitingForEntry&&Number.isFinite(e.x));const target=targets.find(e=>e.kind==='boss')||targets.sort((a,b)=>b.y-a.y)[0];return {stage:`${m.state}/${m.currentWaveIndex}`,boss:!!m.boss?.active,waves:m.waves?.length,playerX:p.player.x,targetX:target?.x,score:window.__game.score,draft:p.tacticalDraft?.active,offers:p.tacticalDraft?.offers?.map(x=>x.id)};});
  if(s.stage!==stage){stage=s.stage;report.events.push({ms:Date.now()-start,...s});writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
  if(s.boss&&!report.firstBossMs){report.firstBossMs=Date.now()-start;await page.screenshot({path:path.join(out,'first-boss.png')});}
  if(s.draft){report.firstDraftMs=Date.now()-start;report.offers=s.offers;await page.keyboard.up('Space');if(moving)await page.keyboard.up(moving);await page.screenshot({path:path.join(out,'first-choice.png')});break;}
  const delta=Number.isFinite(s.targetX)?s.targetX-s.playerX:0,key=Math.abs(delta)<22?null:delta>0?'ArrowRight':'ArrowLeft';
  if(key!==moving){if(moving)await page.keyboard.up(moving);if(key)await page.keyboard.down(key);moving=key;}
  await page.keyboard.down('Space');await page.waitForTimeout(180);
 }
 assert.ok(report.firstBossMs,'Natural opening must reach a boss');assert.ok(report.firstDraftMs,'Ordinary weapon damage must reach the first reward');
 assert.deepEqual(report.offers,['pierce','double_shot','drones']);assert.deepEqual(report.errors,[]);
 await page.waitForFunction(()=>window.__game.scenes.play.tacticalDraft.inputArmed,null,{timeout:5000});
 await page.keyboard.press('Enter');await page.waitForFunction(()=>!window.__game.scenes.play.tacticalDraft?.active,null,{timeout:10000});
 report.selected=await page.evaluate(()=>window.__game.scenes.play.player.runAugmentIds);assert.equal(report.selected.length,1);
 report.status='passed';console.log(JSON.stringify({firstBossMs:report.firstBossMs,firstDraftMs:report.firstDraftMs,selected:report.selected}));
}catch(e){report.status='failed';report.failure=e.stack;throw e;}finally{writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await app.close();log.end();}
