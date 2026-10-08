import {chromium} from 'playwright';import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:1920,height:1080}});
await page.addInitScript(()=>{window.__allocations=new Map();const proto=WebGL2RenderingContext.prototype;const make=proto.createTexture,remove=proto.deleteTexture;
 proto.createTexture=function(...args){const result=make.apply(this,args);if(this.getContextAttributes()?.preserveDrawingBuffer)window.__allocations.set(result,new Error().stack);return result;};
 proto.deleteTexture=function(t){window.__allocations.delete(t);return remove.call(this,t);};});
await page.goto('http://127.0.0.1:5199/?skipIntro=1&offlineLeaderboard=1');await page.waitForFunction(()=>window.__game?.scenes.menu.astraMenuShip?.ready,{},{timeout:90000});
await page.evaluate(()=>{window.__liveSolid=window.__game.scenes.menu.astraMenuShip.solid.constructor;});
const snapshots=[];async function snap(stage){snapshots.push(await page.evaluate(stage=>({stage,counts:window.__liveSolid.diagnostics,allocations:[...window.__allocations.values()]}),stage));}
await snap('menu');await page.evaluate(()=>window.__game.showShipSelect());await page.waitForTimeout(2500);await snap('hangar');
await page.keyboard.press('ArrowRight');await page.waitForTimeout(2500);await snap('neighbor');await page.keyboard.press('ArrowLeft');await page.waitForTimeout(2500);await snap('sparrow');
await page.evaluate(()=>window.__game.scenes.shipSelect.rotatingCard.turntable.solid.dispose());await snap('disposed');await fs.writeFile('docs/ship-art-v2/resource-diagnosis.json',JSON.stringify(snapshots,null,2));await browser.close();console.log(snapshots.map(x=>({stage:x.stage,counts:x.counts})));
