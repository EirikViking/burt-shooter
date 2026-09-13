import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const phase=process.argv[2]||'before',out=`docs/sparrow-showcase/evidence/${phase}`;
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5201/?skipIntro=1&offlineLeaderboard=1&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.__game?.scenes.menu.astraMenuShip?.ready,null,{timeout:90000});
 await page.evaluate(()=>{const t=window.__game.scenes.menu.astraMenuShip;t.targetAngle=0;t.targetPitch=0;t.manualUntil=1e8;});
 await page.waitForTimeout(1500);await page.screenshot({path:`${out}/menu.png`});
 await page.evaluate(()=>window.__game.showShipSelect());
 await page.waitForFunction(()=>window.__game.scenes.shipSelect.rotatingCard?.turntable?.ready,null,{timeout:60000});
 await page.evaluate(()=>{const t=window.__game.scenes.shipSelect.rotatingCard.turntable;t.targetAngle=0;t.targetPitch=0;t.manualUntil=1e8;});
 await page.waitForTimeout(1500);await page.screenshot({path:`${out}/hangar.png`});
 await fs.writeFile(`${out}/capture.json`,JSON.stringify({phase,errors,source:'Actual running game, isolated browser profile, 1920x1080'},null,2));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
