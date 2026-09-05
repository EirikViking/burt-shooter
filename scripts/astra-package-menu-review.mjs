import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';
import {mkdirSync,readFileSync,writeFileSync,createWriteStream,openSync,closeSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
const out=path.resolve(`test-results/astra-packaged-menus${process.argv[2]?`-${process.argv[2]}`:''}`);mkdirSync(out,{recursive:true});
const executable=JSON.parse(readFileSync('test-results/astra-build-location.json')).executable;
const app=await electron.launch({executablePath:executable,args:['--nova-fresh-profile','--windowed','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'],cwd:process.cwd(),env:{...process.env,NOVA_SWARM_USER_DATA_DIR:path.join(out,'profile'),NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000});
const log=createWriteStream(path.join(out,'process.log'));app.process().stdout?.pipe(log,{end:false});app.process().stderr?.pipe(log,{end:false});
const report={executable,errors:[],captures:[]};
try{
 const page=await app.firstWindow();page.on('pageerror',e=>report.errors.push(e.message));
 await app.context().route('**/*',r=>/^(nova-swarm:|data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setContentSize(1280,720);w.webContents.setBackgroundThrottling(false);w.showInactive();});
 await page.waitForFunction(()=>innerWidth===1280&&innerHeight===720);
 async function shot(name){await page.waitForTimeout(1400);await page.screenshot({path:path.join(out,`${name}.png`)});report.captures.push(name);console.log(name);}
 await shot('01-menu');
 const cdp=await app.context().newCDPSession(page),frames=[],frameDir=path.join(out,'menu-frames');mkdirSync(frameDir,{recursive:true});
 const onFrame=e=>{const file=path.join(frameDir,`${String(frames.length).padStart(5,'0')}.jpg`);writeFileSync(file,Buffer.from(e.data,'base64'));frames.push({file,time:e.metadata.timestamp});cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});};
 cdp.on('Page.screencastFrame',onFrame);await cdp.send('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:1280,maxHeight:720,everyNthFrame:1});
 await page.waitForTimeout(1800);
 await page.mouse.move(615,365);await page.mouse.down();await page.mouse.move(840,365,{steps:45});await page.mouse.up();
 await page.waitForTimeout(6500);await cdp.send('Page.stopScreencast');cdp.off('Page.screencastFrame',onFrame);assert.ok(frames.length>100);
 assert.ok(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.viewAngle>2),'Packaged main ship rotates');
 const lines=[];for(let i=0;i<frames.length-1;i++)lines.push(`file '${frames[i].file.replaceAll('\\','/')}'`,`duration ${Math.max(.001,frames[i+1].time-frames[i].time).toFixed(6)}`);lines.push(`file '${frames.at(-1).file.replaceAll('\\','/')}'`);
 const list=path.join(out,'menu-frames.txt');writeFileSync(list,lines.join('\n'));const fd=openSync(path.join(out,'ffmpeg.log'),'w');
 const video=path.join(out,'menu-normal-speed.mp4');const encoder=spawn('ffmpeg',['-y','-f','concat','-safe','0','-i',list,'-vf','fps=30,format=yuv420p','-c:v','libx264','-preset','fast','-crf','20','-movflags','+faststart',video],{windowsHide:true,stdio:['ignore',fd,fd]});
 const code=await new Promise((resolve,reject)=>{encoder.once('error',reject);encoder.once('exit',resolve);});closeSync(fd);assert.equal(code,0);
 report.animation={video,seconds:frames.at(-1).time-frames[0].time,frames:frames.length,description:'Actual packaged main menu at original wall-clock speed, silent.'};
 await page.evaluate(()=>window.__game.scenes.menu.openSettingsOverlay());await shot('02-settings');
 await page.evaluate(()=>window.__game.scenes.menu.closeSettingsOverlay());
 await page.evaluate(()=>window.__game.scenes.menu.openHowToPlayOverlay());await shot('03-help');
 await page.evaluate(()=>window.__game.scenes.menu.closeHowToPlayOverlay());
 await page.evaluate(()=>window.__game.showShipSelect());
 await page.waitForFunction(()=>window.__game.scenes.shipSelect?.shipCards?.[0]?.turntable?.ready,null,{timeout:120000});await shot('04-hangar');
 const center=await page.evaluate(()=>window.__game.scenes.shipSelect.shipCards[0].turntable.toGlobal({x:0,y:0}));
 await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+210,center.y,{steps:40});await page.mouse.up();await page.waitForTimeout(600);
 assert.ok(await page.evaluate(()=>window.__game.scenes.shipSelect.shipCards[0].turntable.viewAngle>2),'Packaged hangar ship rotates');
 await shot('04b-hangar-rotated');
 report.starterLayouts=[];
 for(let i=0;i<3;i++){
  await page.evaluate(i=>window.__game.scenes.shipSelect.navigateTo(i),i);
  await page.waitForFunction(i=>window.__game.scenes.shipSelect.shipCards[i]?.turntable?.ready,i,{timeout:120000});
  assert.ok(await page.evaluate(i=>!window.__game.scenes.shipSelect.shipCards[i].locked,i),'Every starter is available in a fresh packaged profile');
  await shot(`starter-${i+1}`);
 }
 for(const [width,height] of [[1920,1080],[800,600]]){
  await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setContentSize(...size),[width,height]);
  await page.waitForFunction(size=>innerWidth===size[0]&&innerHeight===size[1],[width,height]);
  await page.waitForTimeout(900);
  const bounds=await page.evaluate(()=>{const s=window.__game.scenes.shipSelect,c=s.shipCards[s.selectedIndex];return {preview:c.weaponPreview.getBounds(),dots:s.dotContainer.getBounds()};});
  assert.ok(bounds.preview.y+bounds.preview.height<bounds.dots.y,'Firing preview clears carousel controls after resize');
  report.starterLayouts.push({width,height,...bounds});await shot(`starter-3-${width}`);
 }
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1280,720));await page.waitForTimeout(700);
 await page.evaluate(()=>window.__game.switchScene('achievements'));await shot('05-achievements');
 await page.evaluate(()=>window.__game.switchScene('highscore'));await shot('06-leaderboard');
 await page.evaluate(()=>{
  const g=window.__game;g.showThreatCodex();const c=g.scenes.threatCodex,items={};
  for(const [category,entries]of Object.entries(c.catalog)){if(!Array.isArray(entries))continue;items[category]={};for(const e of entries)items[category][e.id]={timesSeen:5,timesDefeated:2,discoveredAt:Date.now(),lastSeenAt:Date.now(),unread:false};}
  localStorage.setItem('nova.threatDiscovery.v1',JSON.stringify({version:1,items}));
  const s=g.scenes.shipSelect;localStorage.setItem('nova.hangarProgress.v1',JSON.stringify({...s.unlockProgress,unlockedShipIds:s.ships.map(x=>x.baseId||x.id),lastNewlyUnlockedShipIds:[]}));
 });
 await page.reload();await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuLights?.target,null,{timeout:120000});
 await page.evaluate(()=>{const g=window.__game;g.showThreatCodex();const c=g.scenes.threatCodex;c.categoryIndex=7;c.entryIndex=0;c.init();});await shot('07-codex-boss');
 await page.evaluate(()=>{const c=window.__game.scenes.threatCodex;c.categoryIndex=0;c.entryIndex=0;c.init();});await shot('08-codex-enemy');
 await page.evaluate(()=>{const c=window.__game.scenes.threatCodex;c.categoryIndex=0;c.entryIndex=c.getEntriesForCategory().findIndex(e=>e.id==='boss_support_ship_058');c.init();});await shot('08b-codex-patch-rig');
 await page.evaluate(()=>window.__game.showShipSelect());await page.waitForFunction(()=>window.__game.scenes.shipSelect?.shipCards?.length===30,null,{timeout:120000});
 await page.evaluate(()=>window.__game.scenes.shipSelect.navigateTo(28));
 await page.waitForFunction(()=>window.__game.scenes.shipSelect.shipCards[28]?.turntable?.ready,null,{timeout:120000});
 assert.ok(await page.evaluate(()=>{const c=window.__game.scenes.shipSelect.shipCards[28],hint=c.turntable.caption.getBounds(),badge=c.tierBadge.getBounds();return hint.y+hint.height<badge.y;}),'Rotation hint clears the Ascendant badge');
 await shot('09-hangar-railbreaker');
 report.runtime=await app.evaluate(({app})=>({packaged:app.isPackaged,userData:app.getPath('userData')}));assert.ok(report.runtime.packaged);assert.equal(report.runtime.userData,path.join(out,'profile'));assert.deepEqual(report.errors,[]);report.status='passed';
}finally{writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await app.close().catch(()=>{});log.end();}
