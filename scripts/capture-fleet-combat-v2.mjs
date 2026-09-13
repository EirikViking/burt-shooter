import {chromium} from 'playwright';
import {ShipData} from '../src/config/ShipData.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/fleet-art-v2/evidence/combat-active';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),rows=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5199/?skipIntro=1&offlineLeaderboard=1&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c');
 await page.waitForFunction(()=>window.__game?.scenes.menu.astraMenuShip?.ready,null,{timeout:90000});
 await page.evaluate(async ids=>{const m=await import('/src/progression/HangarProgressState.js');m.updateHangarProgress({unlockedShipIds:ids});},ShipData.map(s=>s.id));
 for(const ship of [...ShipData].sort((a,b)=>a.textureIndex-b.textureIndex)){
  const id=String(ship.textureIndex+1).padStart(2,'0');
  await page.evaluate(key=>window.__game.startGame(key),ship.spriteKey);
  await page.waitForFunction(()=>window.__game.currentSceneName==='play'&&window.__game.scenes.play.enemyManager?.enemies?.filter(e=>!e.dead).length>=3,null,{timeout:60000});
  await page.waitForFunction(()=>{const p=window.__game.scenes.play.player;return p&&!p.invulnerable&&p.sprite.alpha>.95;},null,{timeout:30000});
  await page.keyboard.down('Space');await page.waitForTimeout(650);await page.keyboard.up('Space');
  const state=await page.evaluate(()=>{const s=window.__game.scenes.play,p=s.player,b=p.shipSprite.getBounds();return{scene:window.__game.currentSceneName,enemies:s.enemyManager.enemies.filter(e=>!e.dead).length,player:{spriteKey:p.selectedShipSpriteKey,x:p.x,y:p.y,frameWidth:b.width,frameHeight:b.height,alpha:p.sprite.alpha},level:window.__game.level};});
  assert.equal(state.player.spriteKey,ship.spriteKey);
  assert.equal(state.scene,'play');assert.ok(state.enemies>0);
  await page.screenshot({path:`${out}/${id}.png`});rows.push({id,name:ship.name,...state});console.log('CAPTURED_ACTIVE_COMBAT',id,state.enemies);
  await page.evaluate(()=>window.__game.showMenu());
 }
 await fs.writeFile(`${out}/capture.json`,JSON.stringify({rows,errors},null,2));assert.deepEqual(errors,[]);
}finally{await browser.close();}
