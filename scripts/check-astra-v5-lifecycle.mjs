import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='test-results/astra-v5-lifecycle';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>/^(data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
try{
 await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1');
 await page.waitForFunction(()=>window.__game?.scenes.menu.astraDock?.tugs.length===2&&window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
 const drones=await page.evaluate(async()=>{
  const {BonusDrone}=await import('/src/entities/BonusDrone.js'),{GameAssets}=await import('/src/utils/GameAssets.js');
  await GameAssets.ensureBonusCoreTexture();const texture=GameAssets.getBonusDroneTexture(0),source=texture.source;
  let disposed=0;for(let i=0;i<200;i++){
   const d=new BonusDrone(100,100,window.__game,i%2?'HAZARD':'POWERUP');const sprite=d.sprite,children=sprite.children.slice();
   window.__game.app.stage.addChild(sprite);d.destroy();d.destroy();
   if(sprite.destroyed&&children.every(c=>c.destroyed)&&d.sprite===null)disposed++;
  }
  return {disposed,sharedTextureValid:GameAssets.isValidTexture(texture)&&!source.destroyed};
 });assert.equal(drones.disposed,200);assert.ok(drones.sharedTextureValid);
 const cycles=[];
 for(let i=0;i<6;i++){
  await page.evaluate(()=>{const g=window.__game,m=g.scenes.menu;window.__oldDock={dock:m.astraDock,ship:m.astraMenuShip,lights:m.astraMenuLights,backdrop:m.backdrop};g.showThreatCodex();g.switchScene('menu');});
  await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraDock?.tugs.length===2,null,{timeout:120000});
  const state=await page.evaluate(async()=>{const {AstraTurntable}=await import('/src/ui/AstraTurntable.js');return {disposed:Object.values(window.__oldDock).every(x=>x.destroyed),residentAtlases:AstraTurntable.getResidentCount(),tugs:window.__game.scenes.menu.astraDock.tugs.length};});
  assert.ok(state.disposed);assert.equal(state.residentAtlases,1);assert.equal(state.tugs,2);cycles.push(state);
 }
 await page.screenshot({path:`${out}/menu-after-reentry.png`});
 assert.deepEqual(errors,[]);writeFileSync(`${out}/report.json`,JSON.stringify({drones,cycles,errors,status:'passed'},null,2));console.log('PASS: 200 drone retirements, shared textures retained, six menu round trips, one resident turntable.');
}finally{await browser.close();}
