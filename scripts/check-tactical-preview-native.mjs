import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const [label, executable] = process.argv.slice(2);
const candidate = label !== 'before';
const out = path.resolve('test-results', `tactical-choice-native-${label}`);
mkdirSync(out, { recursive: true });
const report = { executable, viewport: [1280,720], errors: [], checks: [] };
const log = createWriteStream(path.join(out,'process.log'));
const app = await electron.launch({ executablePath: executable, args: ['--nova-fresh-profile','--windowed','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'], env: {...process.env,NOVA_SWARM_USER_DATA_DIR:path.join(out,'profile'),NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'}, timeout:120000 });
app.process().stdout?.pipe(log,{end:false});app.process().stderr?.pipe(log,{end:false});
const p = await app.firstWindow();p.on('pageerror',e=>report.errors.push(e.message));
await app.context().route('**/*',r=>/^(nova-swarm:|data:|blob:)/.test(r.request().url())?r.continue():r.abort());
try {
 await p.waitForFunction(()=>window.__game?.scenes.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(1280,720);w.webContents.setBackgroundThrottling(false);});
 await p.evaluate(()=>window.__game.scenes.menu.quickStartRun('ranked_tactical'));
 await p.waitForFunction(()=>window.__game?.scenes.play?.player?.active,null,{timeout:120000});
 await p.evaluate(()=>{const s=window.__game.scenes.play;s.introActive=false;s.introComplete=true;s.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;s.setPaused(false);s.player.invulnerable=true;s.player.invulnerableTime=1e9;s.openTacticalDraft({sectorCleared:1});});
 await p.waitForFunction(()=>window.__game.scenes.play.tacticalDraft?.inputArmed);
 await p.waitForTimeout(1000);
 report.runtime=await p.evaluate(()=>JSON.parse(window.render_game_to_text()).gitSha);
 report.offers=await p.evaluate(()=>window.__game.scenes.play.tacticalDraft.offers.map(x=>x.id));assert.deepEqual(report.offers,['pierce','double_shot','drones']);
 const session=await app.context().newCDPSession(p);await session.send('Performance.enable');await session.send('HeapProfiler.collectGarbage');
 report.performance=await p.evaluate(async()=>{const frames=[];let prev=performance.now();const start=prev;await new Promise(resolve=>{function tick(t){frames.push(t-prev);prev=t;if(t-start<20000)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});frames.shift();frames.sort((a,b)=>a-b);return {durationMs:prev-start,frames:frames.length,p95Ms:frames[Math.floor(frames.length*.95)],p99Ms:frames[Math.floor(frames.length*.99)],maxMs:frames.at(-1)};});
 await session.send('HeapProfiler.collectGarbage');const metrics=await session.send('Performance.getMetrics');report.performance.retainedHeapMiB=metrics.metrics.find(x=>x.name==='JSHeapUsedSize').value/1048576;await session.detach();
 await p.screenshot({path:path.join(out,'first-choice.png')});
 if(candidate){
  const recorder=await app.context().newCDPSession(p);const frames=[];const dir=path.join(out,'frames');mkdirSync(dir,{recursive:true});
  recorder.on('Page.screencastFrame',e=>{const file=path.join(dir,`${String(frames.length).padStart(5,'0')}.jpg`);writeFileSync(file,Buffer.from(e.data,'base64'));frames.push({file,time:e.metadata.timestamp});recorder.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
  await recorder.send('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:1280,maxHeight:720,everyNthFrame:2});
  for(const [key,id] of [['ArrowLeft','pierce'],['ArrowRight','double_shot'],['ArrowRight','drones']]){await p.keyboard.press(key);assert.equal(await p.evaluate(()=>{let d=window.__game.scenes.play.tacticalDraft;return d.offers[d.focusIndex]?.id;}),id);await p.waitForTimeout(2800);await p.screenshot({path:path.join(out,id+'.png')});}
  const target=await p.evaluate(()=>{const d=window.__game.scenes.play.tacticalDraft;return d.cards[2]._nodes.weaponPreview.model.after;});
  await p.keyboard.press('Enter');await p.waitForFunction(()=>!window.__game.scenes.play.tacticalDraft?.active,null,{timeout:15000});
  assert.equal(await p.evaluate(()=>window.__game.scenes.play.player.droneCount),target.drones);
  await p.keyboard.down('Space');await p.keyboard.down('ArrowLeft');await p.waitForTimeout(450);await p.keyboard.up('ArrowLeft');await p.waitForTimeout(3000);await p.keyboard.up('Space');
  await p.screenshot({path:path.join(out,'back-in-combat.png')});await recorder.send('Page.stopScreencast');await recorder.detach();assert.ok(frames.length>100);
  const lines=[];for(let i=0;i<frames.length-1;i++)lines.push(`file '${frames[i].file.replaceAll('\\','/')}'`,`duration ${Math.max(.001,frames[i+1].time-frames[i].time).toFixed(6)}`);lines.push(`file '${frames.at(-1).file.replaceAll('\\','/')}'`);
  const list=path.join(out,'frames.txt');writeFileSync(list,lines.join('\n'));const ff=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-safe','0','-f','concat','-i',list,'-vsync','vfr','-c:v','libx264','-pix_fmt','yuv420p',path.join(out,'choice-to-combat.mp4')],{encoding:'utf8',windowsHide:true});assert.equal(ff.status,0,ff.stderr);report.video={frames:frames.length,seconds:frames.at(-1).time-frames[0].time,note:'Actual packaged runtime at wall-clock speed. Staged reward; scripted keyboard input; QA invulnerability; silent.'};
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(960,640));
  await p.evaluate(()=>{let s=window.__game.scenes.play;s.player.runAugmentIds=[];s.player.recalculateStats();s.openTacticalDraft({sectorCleared:1});});await p.waitForTimeout(500);await p.screenshot({path:path.join(out,'compact.png')});
  assert.ok(await p.evaluate(()=>window.__game.scenes.play.tacticalDraft.cards.every(c=>c._nodes.weaponPreview?.compact.visible)));
  report.checks.push('keyboard focus all three cards, confirm Drones, actual applied drone count, fire/move on return, compact resize');
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
} catch(e){report.status='failed';report.failure=e.stack;throw e;}
finally {writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await app.close();log.end();console.log(JSON.stringify({label,status:report.status,performance:report.performance}));}
