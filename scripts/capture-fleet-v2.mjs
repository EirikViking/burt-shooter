// Isolated QA profile; captures actual game scenes, never modifies player saves.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {ShipData} from '../src/config/ShipData.js';
const phase=process.argv[2]||'before', out=`docs/fleet-art-v2/evidence/${phase}`;
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5199/?skipIntro=1&offlineLeaderboard=1&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c');
 await page.waitForFunction(()=>window.__game?.scenes.menu.astraMenuShip?.ready,{},{timeout:90000});
 await page.evaluate(async ids=>{const m=await import('/src/progression/HangarProgressState.js');m.updateHangarProgress({unlockedShipIds:ids});},ShipData.map(s=>s.id));
 for(const ship of [...ShipData].sort((a,b)=>a.textureIndex-b.textureIndex)) {
  const id=String(ship.textureIndex+1).padStart(2,'0');
  await page.evaluate(key=>{localStorage.setItem('burt.selectedShip.v1',key);const g=window.__game;g.selectedShipSpriteKey=key;g.showMenu();},ship.spriteKey);
  await page.waitForFunction(i=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraMenuShip.index===i,ship.textureIndex,{timeout:60000});
  await page.evaluate(()=>{const t=window.__game.scenes.menu.astraMenuShip;t.targetAngle=0;t.targetPitch=0;t.manualUntil=1e8;});
  await page.waitForTimeout(650);await page.screenshot({path:`${out}/${id}-menu.png`});
  const info=await page.evaluate(()=>{const t=window.__game.scenes.menu.astraMenuShip;return {index:t.index,...t.solid.constructor.diagnostics};});
  await page.evaluate(()=>window.__game.showShipSelect());
  await page.waitForFunction(()=>window.__game.scenes.shipSelect.rotatingCard?.turntable?.ready,{},{timeout:60000});
  await page.waitForTimeout(550);await page.screenshot({path:`${out}/${id}-hangar.png`});
  await page.evaluate(key=>window.__game.startGame(key),ship.spriteKey);
  await page.waitForFunction(()=>window.__game.currentSceneName==='play',{},{timeout:60000});
  await page.keyboard.down('Space');await page.waitForTimeout(1900);await page.keyboard.up('Space');
  await page.screenshot({path:`${out}/${id}-combat.png`});
  rows.push({id,name:ship.name,spriteKey:ship.spriteKey,...info});
  console.log('CAPTURED',phase,id,ship.name);
 }
 await fs.writeFile(`${out}/capture.json`,JSON.stringify({phase,rows,errors},null,2));
 if(errors.length)throw new Error(errors.join('\n'));
} finally {await browser.close();}
