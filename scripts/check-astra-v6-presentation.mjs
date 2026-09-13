import {chromium,_electron} from 'playwright';
import path from 'node:path';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,createWriteStream} from 'node:fs';
let url=process.env.CHECK_URL||'http://127.0.0.1:4406';
const out=process.env.CHECK_OUTPUT_DIR||'test-results/astra-v6-presentation';mkdirSync(out,{recursive:true});
const app=process.env.ASTRA_EXE?await _electron.launch({executablePath:process.env.ASTRA_EXE,args:['--nova-fresh-profile','--windowed'],env:{...process.env,NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1',NOVA_SWARM_USER_DATA_DIR:path.resolve(out,'profile')},timeout:120000}):null;
const log=app?createWriteStream(path.join(out,'process.log')):null;
if(app){app.process().stdout?.pipe(log,{end:false});app.process().stderr?.pipe(log,{end:false});}
const browser=app?null:await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=app?await app.firstWindow():await browser.newPage({viewport:{width:1280,height:720}}),errors=[],checks=[];
if(app){await page.waitForFunction(()=>window.__game,null,{timeout:120000});const initial=new URL(page.url());url=`${initial.protocol}//${initial.host}`;await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setContentSize(1280,720);w.webContents.setBackgroundThrottling(false);});await page.waitForFunction(()=>innerWidth===1280&&innerHeight===720);}
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{localStorage.setItem('nova_display_mode_v1','windowed');localStorage.setItem('nova_display_window_size_v1',JSON.stringify({width:1280,height:720}));});
await page.route('**/*',r=>/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(nova-swarm:|data:|blob:)/.test(r.request().url())?r.continue():r.abort());
async function shot(name){await page.screenshot({path:`${out}/${name}.png`});}
async function resize(width,height){
 if(app){await page.evaluate(s=>window.__novaDisplay.applySettings({mode:'windowed',windowSize:{width:s[0],height:s[1]},uiScale:1}),[width,height]);await page.waitForTimeout(400);await app.evaluate(({BrowserWindow},s)=>BrowserWindow.getAllWindows()[0].setContentSize(...s),[width,height]);}
 else await page.setViewportSize({width,height});
 await page.waitForFunction(s=>innerWidth===s[0]&&innerHeight===s[1]&&window.__game.app.screen.width===s[0]&&window.__game.app.screen.height===s[1],[width,height]);
}
async function open(params=''){await page.goto(`${url}/?offlineLeaderboard=1&${params}`);await page.waitForFunction(()=>window.__game&&document.body.dataset.menuReady==='1',null,{timeout:120000});if(app)await resize(1280,720);}
try{
 await open();await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
 // Resize while the staggered entrance is pending, then compare settled bounds.
 for(const [width,height] of [[1920,1080],[1280,720]]){
  await page.evaluate(()=>window.__game.scenes.menu.startAnimations());
  await resize(width,height);
  // Native pointer hover can select a different menu item during resize.
  // Exercise the Mayhem selector explicitly before checking its bounds.
  await page.waitForTimeout(200);
  const tactical=await page.evaluate(()=>{const b=window.__game.scenes.menu.tacticalStartBtn.getBounds();return{x:b.x+b.width/2,y:b.y+b.height/2};});
  await page.mouse.move(tactical.x,tactical.y);
  await page.waitForFunction(()=>window.__game.scenes.menu.runModeVariantSelector.visible);
  await page.waitForTimeout(200);
  const getBounds=()=>page.evaluate(()=>{const m=window.__game.scenes.menu;return Object.fromEntries(['runModeTitle','runModeVariantSelector','runModeExplainer'].map(k=>{const b=m[k].getBounds();return[k,{x:b.x,y:b.y,width:b.width,height:b.height}]}));});
  const initial=await getBounds();await page.waitForTimeout(2600);const settled=await getBounds();
  assert.deepEqual(settled,initial,'Entrance must not overwrite responsive layout');
  assert.ok(settled.runModeTitle.y+settled.runModeTitle.height<=settled.runModeVariantSelector.y,'Selector clears heading');
  assert.ok(settled.runModeVariantSelector.y+settled.runModeVariantSelector.height<=settled.runModeExplainer.y,'Summary clears selector');
  checks.push({menuResolution:[width,height],bounds:settled});await shot(`menu-${width}`);
 }
 const a=await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.targetAngle);await page.waitForTimeout(4000);
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.targetAngle),a,'No idle frame stepping');
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.astraDock.children.length),1,'No service craft sprites');
 await shot('01-menu');checks.push('menu stable orientation and no small ships');
 assert.match(await page.evaluate(()=>window.__game.scenes.menu.getRunModeExplainerText()),/Three starter ships/);
 await page.evaluate(()=>window.__game.scenes.menu.openShipSelect());
 await page.waitForTimeout(1500);
 await page.waitForTimeout(1000);await shot('02-starter-hangar');
 const hangar=await page.evaluate(()=>({scene:window.__game.currentSceneName,subtitle:window.__game.scenes.shipSelect.hangarHeaderNodes.subtitle.text}));
 assert.match(hangar.subtitle,/Three starter ships/);checks.push(hangar);
 await page.evaluate(()=>{const s=window.__game.scenes.shipSelect;s.navigateTo(1);s.startSelectedShipInMode();});
 await page.waitForFunction(()=>window.__game.currentSceneName==='play'&&window.__game.scenes.play.isReady&&window.__game.scenes.play.player?.selectedShipTextureIndex>0,null,{timeout:120000});
 const selected=await page.evaluate(()=>({index:window.__game.scenes.play.player.selectedShipTextureIndex,key:localStorage.getItem('burt.selectedShip.v1')}));
 await page.evaluate(()=>window.__game.showMenu());
 await page.waitForFunction(index=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraMenuShip.index===index,selected.index,{timeout:120000});
 await page.waitForTimeout(2400);
 await shot('menu-last-hangar-ship');
 await open();
 await page.waitForFunction(index=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraMenuShip.index===index,selected.index,{timeout:120000});
 // A run-specific loaner can change the active game key without changing Hangar storage.
 await page.evaluate(()=>{window.__game.selectedShipSpriteKey='nova-player-ship-04.png';window.__game.showShipSelect();});
 await page.waitForFunction(()=>window.__game.currentSceneName==='shipSelect');
 await page.evaluate(()=>window.__game.showMenu());
 await page.waitForFunction(index=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraMenuShip.index===index,selected.index,{timeout:120000});
 assert.equal(await page.evaluate(()=>localStorage.getItem('burt.selectedShip.v1')),selected.key);
 checks.push({lastHangarShip:selected,restoredAcrossReload:true,transientLoanerIgnored:true});
 await open('autostart=1&debugBossToken=NOVA_DEBUG_2026&startLevel=10&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c');
 await page.waitForFunction(()=>window.__game.scenes.play?.isReady&&window.__game.scenes.play?.player?.shipSprite?.texture?.width>1,null,{timeout:120000});
 const layers=await page.evaluate(()=>{const p=window.__game.scenes.play,t=p.createNovaCommandPilotToast({novaCommandVariant:'major',primaryText:'RANK UP'},{width:innerWidth,height:innerHeight,y:150,slot:'corner'});const result={ceremony:p.overrunClearLayer.zIndex,rankBanner:t.zIndex};t.destroy({children:true});return result;});
 assert.ok(layers.ceremony>layers.rankBanner,'Rank-up banner must stay behind the paused ceremony');checks.push({layers});
 for(const sector of [10,20,30,40,50,60,70]){
  await page.evaluate(sector=>{const game=window.__game,p=game.scenes.play;p.introActive=false;p.introComplete=true;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;if(p.isPaused)p.setPaused(false);p.enemyManager.clearEnemies();p.clearOverrunConfirmationHandlers();for(const e of p.overrunClearEffects)e.container.destroy({children:true});p.overrunClearEffects=[];p.overrunMilestoneInterlude=null;game.level=sector;p.triggerOverrunClearCelebration({milestoneSector:sector,nextSector:sector+1,eventKind:sector===10?'run_clear':'overrun_milestone',clearBonus:10000,livesBonus:7500});},sector);
  await page.waitForFunction(()=>window.__game.scenes.play.overrunMilestoneInterlude?.effect?.interludeCard?._coronation?.ready,null,{timeout:30000});
  await page.waitForTimeout(1700);
  const state=await page.evaluate(()=>{const p=window.__game.scenes.play,c=p.overrunMilestoneInterlude.effect.interludeCard;return{active:p.overrunMilestoneInterlude.active,texture:c._coronation.hull.texture.width,visible:c._coronation.hull.visible,ready:c._coronation.ready,score:window.__game.score,children:c._coronation.children.length,text:JSON.parse(window.render_game_to_text()).overrunInterlude};});
  assert.ok(state.ready&&state.visible&&state.texture>1,`Portrait ${sector}`);assert.equal(state.children,2);checks.push({sector,...state});
  await shot(`overrun-${sector}`);
  if(sector%30===20){const b=state.text.buttonBounds;await page.mouse.click(b.x+b.width/2,b.y+b.height/2);}
  else if(sector%30===0){await page.evaluate(()=>{window.__burtGamepadOverride={connected:true,id:'Astra QA',axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===0,value:i===0?1:0}))};});}
  else await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);assert.equal(await page.evaluate(()=>Boolean(window.__game.scenes.play.overrunMilestoneInterlude?.active)),false,`Milestone ${sector} confirms`);
  await page.evaluate(()=>{window.__burtGamepadOverride=null;});
 }
 await page.keyboard.press('Enter');await page.waitForTimeout(2500);assert.equal(await page.evaluate(()=>Boolean(window.__game.scenes.play.overrunMilestoneInterlude?.active)),false,'Confirm resumes');
 assert.equal(await page.evaluate(()=>window.__game.currentSceneName),'play');
 for(const [width,height,language,reduced] of app?[]:[[800,600,'de',false],[600,800,'ja',true]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(300);
  await page.evaluate(async({language,reduced})=>{
   window.__novaI18n.setLanguagePreference(language);
   const settings=await import('/src/config/AccessibilitySettings.js');
   settings.setReducedMotionEnabled?.(reduced);
   const p=window.__game.scenes.play;p.triggerOverrunClearCelebration({milestoneSector:40,nextSector:41,eventKind:'overrun_milestone',clearBonus:10000,livesBonus:7500});
  },{language,reduced});
  await page.waitForTimeout(1800);
  const state=await page.evaluate(()=>JSON.parse(window.render_game_to_text()).overrunInterlude);
  for(const node of state.textNodes||[]){const b=node.bounds;if(node.visible&&b)assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width+2&&b.y+b.height<=height+2,`${language} ${node.id} on screen`);}
  checks.push({width,height,language,reduced});await shot(`overrun-${width}-${language}`);
  await page.keyboard.press('Enter');await page.waitForTimeout(2800);
 }
 if(!app)await page.setViewportSize({width:1280,height:720});
 await open();
 await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(()=>{const progress=JSON.parse(localStorage.getItem('nova.hangarProgress.v1')||'{}');localStorage.setItem('nova.hangarProgress.v1',JSON.stringify({...progress,bestSector:30,overrunUnlockCelebrationPending:true,overrunUnlockCelebrationSeen:false}));const m=window.__game.scenes.menu;m.overrunStartState={available:true};m.layoutOverrunUnlockCelebration(innerWidth,innerHeight);});
 await page.waitForTimeout(1800);
 assert.ok(await page.evaluate(()=>window.__game.scenes.menu.overrunUnlockCelebration?._coronation?.ready));await shot('overrun-menu-unlock');
 await page.evaluate(()=>window.__game.scenes.menu.dismissOverrunUnlockCelebration());
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.overrunUnlockCelebrationVisible),false);
 checks.push('menu unlock confirmation');
 assert.deepEqual(errors,[]);writeFileSync(`${out}/report.json`,JSON.stringify({status:'passed',checks,errors},null,2));
 console.log(`PASS ${out}`);
}catch(e){await shot('failure');writeFileSync(`${out}/report.json`,JSON.stringify({status:'failed',checks,errors,error:e.stack},null,2));throw e;}finally{if(app){await app.close();log.end();}else await browser.close();}
