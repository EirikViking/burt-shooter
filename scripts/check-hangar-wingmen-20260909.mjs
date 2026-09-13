import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='test-results/hangar-wingmen-20260909';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}});const report={errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
const bounds=async(label)=>page.evaluate(label=>{const walk=n=>{if(n?.label===label)return n;for(const c of n?.children||[]){const found=walk(c);if(found)return found;}};const n=walk(window.__game.currentScene.container);if(!n)throw Error(label);const r=n.getBounds();return{x:r.x+r.width/2,y:r.y+r.height/2};},label);
try{
await page.goto('http://127.0.0.1:5192/?offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction(()=>window.__game?.scenes.menu?.astraMenuShip?.ready,null,{timeout:180000});
await page.evaluate(()=>{window.__game.scenes.menu.launchHome.openModes();window.__game.scenes.menu.openShipSelect();});await page.waitForFunction(()=>window.__game.currentSceneName==='shipSelect'&&window.__game.scenes.shipSelect.backButton,null,{timeout:120000});
report.selection=await page.evaluate(()=>{const h=window.__game.scenes.shipSelect;h.navigateTo(1);return h.ships[1].spriteKey;});
await page.waitForTimeout(1800);let b=await bounds('ui_hangarBackButton');await page.mouse.click(b.x,b.y);
await page.waitForFunction(()=>window.__game.currentSceneName==='menu',null,{timeout:15000});
report.back=await page.evaluate(()=>({surface:window.__game.scenes.menu.launchHome.surface,active:window.__game.selectedShipSpriteKey,saved:localStorage.getItem('burt.selectedShip.v1')}));
assert.equal(report.back.surface,'home');assert.equal(report.back.active,report.selection);assert.equal(report.back.saved,report.selection);
await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});await page.screenshot({path:out+'/selected-home.png'});
await page.evaluate(()=>window.__game.scenes.menu.openSettingsOverlay());
let tab=await page.evaluate(()=>{const b=window.__game.scenes.menu.settingsOverlay.pageButtons.audio.getBounds();return{x:b.x+b.width/2,y:b.y+b.height/2};});await page.mouse.click(tab.x,tab.y);
let audio=await page.evaluate(()=>{const s=window.__game.scenes.menu.settingsOverlay;const c=s.controls.find(c=>c.id==='menu_audio_mode');return{keys:Object.keys(c),y:c.y};});report.audioControl=audio;
await page.screenshot({path:out+'/audio-settings.png'});
let control=await page.evaluate(()=>{const s=window.__game.scenes.menu.settingsOverlay;const c=s.controls.find(c=>c.id==='menu_audio_mode');const n=c.button||c.target||c.container;const b=n.getBounds();return{x:b.x+b.width/2,y:b.y+b.height/2};});
await page.mouse.click(control.x,control.y);await page.waitForFunction(async()=>{const {AudioManager:a}=await import('/src/audio/AudioManager.js');return a.menuAudioMode==='music'&&a.musicAudio&&!a.musicAudio.paused;},null,{timeout:120000});
report.music='actual Audio button starts music';await page.mouse.click(control.x,control.y);await page.evaluate(()=>window.__game.scenes.menu.closeSettingsOverlay());
await page.evaluate(()=>window.__game.startGame(window.__game.selectedShipSpriteKey));await page.waitForFunction(()=>window.__game.scenes.play?.player,null,{timeout:120000});
await page.waitForTimeout(12000);report.wingmen=[];for(const count of [1,2,4]){report.wingmen.push(await page.evaluate(count=>{const p=window.__game.scenes.play.player;if(!p.runAugmentIds.includes('drones'))p.applyRunAugment('drones');p.runAugmentModifiers.droneCount=count;p.dronesExpiresAt=Number.MAX_SAFE_INTEGER;p.createDrones(count);p.updateDrones(.016);return p.drones.map(d=>({x:d.x,y:d.y,width:d.width,above:p.sprite.getChildIndex(d)>p.sprite.getChildIndex(p.shipSprite)}));},count));await page.screenshot({path:out+`/wingmen-${count}.png`});}
for(const drones of report.wingmen)for(const d of drones){assert.ok(d.above);assert.ok(Math.abs(d.x)-d.width/2>20);}
report.icons=await page.evaluate(async()=>{const {GameAssets:a}=await import('/src/utils/GameAssets.js');await a.loadPowerupAssets();return Object.keys(a.xtra.powerups).map(k=>{const id=k.replace('xtra_powerup_','');return{id,original:a.getPowerupTexture(id)===a.getXtraPowerup(id),valid:a.isValidTexture(a.getPowerupTexture(id))};});});assert.ok(report.icons.length>=60);assert.ok(report.icons.every(i=>i.original&&i.valid));
await page.setViewportSize({width:1920,height:1440});await page.evaluate(async()=>{const {GameAssets:a}=await import('/src/utils/GameAssets.js');const g=window.__game;const p=g.scenes.play;const P={Container:p.gameContainer.constructor,Sprite:p.player.shipSprite.constructor,Graphics:p.player.drones[0].children[0].constructor,Text:p.hud.locationText.constructor};g.scenes.play.container.visible=false;const sheet=new P.Container();g.app.stage.addChild(sheet);const bg=new P.Graphics().rect(0,0,1920,1440).fill(0x061222);sheet.addChild(bg);Object.keys(a.xtra.powerups).forEach((key,i)=>{const id=key.replace('xtra_powerup_','');const sprite=new P.Sprite(a.getPowerupTexture(id));sprite.anchor.set(.5);sprite.width=sprite.height=76;sprite.position.set(85+(i%10)*187,70+Math.floor(i/10)*148);sheet.addChild(sprite);const t=new P.Text({text:id,style:{fontSize:15,fill:0xffffff}});t.anchor.set(.5,0);t.position.set(sprite.x,sprite.y+43);sheet.addChild(t);});});await page.screenshot({path:out+'/all-powerup-art.png'});
assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.failure=e.stack;throw e;}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}





