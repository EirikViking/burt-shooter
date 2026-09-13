import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.env.CHECK_OUTPUT_DIR||'test-results/launch-menu-layout';mkdirSync(out,{recursive:true});
const base=process.env.CHECK_URL||'http://127.0.0.1:4403';
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}});const report={checks:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
async function tap(index){await page.evaluate(index=>{const b=Array.from({length:17},()=>({pressed:false,value:0}));b[index]={pressed:true,value:1};window.__burtGamepadOverride={id:'launch-menu-qa',connected:true,axes:[0,0],buttons:b};},index);await page.waitForTimeout(180);await page.evaluate(()=>window.__burtGamepadOverride.buttons=Array.from({length:17},()=>({pressed:false,value:0})));await page.waitForTimeout(180);}
try{
 await page.goto(`${base}/?offlineLeaderboard=1`);await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 for(const [width,height,scale,locale] of [[960,600,1,'en'],[960,540,2,'de'],[1280,720,2,'ru'],[390,844,1,'en'],[390,568,1,'ja']]){
  await page.setViewportSize({width,height});await page.evaluate(async({scale,locale})=>{localStorage.setItem('nova_ui_scale_v1',String(scale));await window.__novaI18n.setLanguagePreference(locale);window.dispatchEvent(new Event('resize'));window.__game.scenes.menu.refreshMenuText();},{scale,locale});await page.waitForTimeout(600);
  const data=await page.evaluate(()=>{const h=window.__game.scenes.menu.launchHome;const b=h.invitation.getBounds();return{...h.debug(),invitation:{x:b.x,y:b.y,width:b.width,height:b.height}};});
  const visible=Object.entries(data.buttons).filter(([,b])=>b.visible);for(const [id,b]of visible){assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${width} ${id} in viewport`);}
  assert.ok(data.invitation.x+data.invitation.width<=width+1, `${locale} invitation stays inside viewport`);const p=data.buttons.launchTactical;assert.ok(data.invitation.y+data.invitation.height<p.y,`${locale} invitation above Play`);
  await page.screenshot({path:`${out}/${locale}-${width}-${height}-scale${scale}.png`});report.checks.push({width,height,scale,locale});
 }
 await page.setViewportSize({width:1280,height:720});await page.evaluate(async()=>{localStorage.setItem('nova_ui_scale_v1','1');await window.__novaI18n.setLanguagePreference('en');window.dispatchEvent(new Event('resize'));window.__game.scenes.menu.setMenuFocus(0);});
 await tap(13);assert.equal(await page.evaluate(()=>window.__game.scenes.menu.getSelectedMenuOptionId()),'otherModes');await tap(0);assert.equal(await page.evaluate(()=>window.__game.scenes.menu.launchHome.surface),'modes');await tap(1);assert.equal(await page.evaluate(()=>window.__game.scenes.menu.launchHome.surface),'home');await tap(15);await tap(14);await tap(0);
 await page.waitForFunction(()=>window.__game.currentScene===window.__game.scenes.play&&window.__game.scenes.play.player,null,{timeout:120000});assert.equal(await page.evaluate(()=>window.__game.runMode),'ranked_tactical');report.checks.push('Gamepad Other Modes/back and direct Tactical launch');assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;throw e;}finally{writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
