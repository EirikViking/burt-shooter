import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.env.CHECK_URL||'http://127.0.0.1:4406';
const out=process.env.CHECK_OUTPUT_DIR||'test-results/astra-v6-presentation';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data:|blob:)/.test(r.request().url())?r.continue():r.abort());
async function shot(name){await page.screenshot({path:`${out}/${name}.png`});}
async function open(params=''){await page.goto(`${url}/?offlineLeaderboard=1&${params}`);await page.waitForFunction(()=>window.__game&&document.body.dataset.menuReady==='1',null,{timeout:120000});}
try{
 await open();await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
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
 await open('autostart=1&debugBossToken=NOVA_DEBUG_2026&startLevel=10&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c');
 await page.waitForFunction(()=>window.__game.scenes.play?.isReady&&window.__game.scenes.play?.player?.shipSprite?.texture?.width>1,null,{timeout:120000});
 for(const sector of [10,20,30,40,50,60,70]){
  await page.evaluate(sector=>{const game=window.__game,p=game.scenes.play;p.introActive=false;p.introComplete=true;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;if(p.isPaused)p.setPaused(false);p.enemyManager.clearEnemies();p.clearOverrunConfirmationHandlers();for(const e of p.overrunClearEffects)e.container.destroy({children:true});p.overrunClearEffects=[];p.overrunMilestoneInterlude=null;game.level=sector;p.triggerOverrunClearCelebration({milestoneSector:sector,nextSector:sector+1,eventKind:sector===10?'run_clear':'overrun_milestone',clearBonus:10000,livesBonus:7500});},sector);
  await page.waitForFunction(()=>window.__game.scenes.play.overrunMilestoneInterlude?.effect?.interludeCard?._coronation?.ready,null,{timeout:30000});
  await page.waitForTimeout(1700);
  const state=await page.evaluate(()=>{const p=window.__game.scenes.play,c=p.overrunMilestoneInterlude.effect.interludeCard;return{active:p.overrunMilestoneInterlude.active,texture:c._coronation.hull.texture.width,visible:c._coronation.hull.visible,ready:c._coronation.ready,score:window.__game.score,children:c._coronation.children.length,text:JSON.parse(window.render_game_to_text()).overrunInterlude};});
  assert.ok(state.ready&&state.visible&&state.texture>1,`Portrait ${sector}`);assert.equal(state.children,3);checks.push({sector,...state});
  await shot(`overrun-${sector}`);
 }
 await page.keyboard.press('Enter');await page.waitForTimeout(2500);assert.equal(await page.evaluate(()=>Boolean(window.__game.scenes.play.overrunMilestoneInterlude?.active)),false,'Confirm resumes');
 assert.equal(await page.evaluate(()=>window.__game.currentSceneName),'play');
 for(const [width,height,language,reduced] of [[800,600,'de',false],[600,800,'ja',true]]){
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
 await page.setViewportSize({width:1280,height:720});
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
}catch(e){await shot('failure');writeFileSync(`${out}/report.json`,JSON.stringify({status:'failed',checks,errors,error:e.stack},null,2));throw e;}finally{await browser.close();}
