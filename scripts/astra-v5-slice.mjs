import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=`test-results/astra-v5-slice${process.argv[2]?'-'+process.argv[2]:''}`;mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>/^(data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
const shot=async name=>{await page.waitForTimeout(1300);await page.screenshot({path:`${out}/${name}.png`});console.log(name);};
try {
 await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1');
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await shot('01-menu');
 await page.evaluate(()=>{
  window.__game.showThreatCodex();
  const items={};for(const [cat,list]of Object.entries(window.__game.scenes.threatCodex.catalog)){if(!Array.isArray(list))continue;items[cat]={};for(const e of list)items[cat][e.id]={timesSeen:5,timesDefeated:2,discoveredAt:Date.now(),lastSeenAt:Date.now(),unread:false};}
  localStorage.setItem('nova.threatDiscovery.v1',JSON.stringify({version:1,items}));
 });
 await page.reload();await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(()=>window.__game.showThreatCodex());
 assert.ok(await page.evaluate(()=>Object.keys(window.__game.scenes.threatCodex.discoveryState.items.enemies).length>2000),'Fully discovered isolated Codex profile');
 for(const [id,name]of [['nova_enemy_001','02-interceptor'],['nova_enemy_002','03-crab'],['nova_enemy_009','04-lance'],['pilot_rank_00','05-rank-cadet'],['pilot_rank_19','06-rank-veteran'],['pilot_rank_39','07-rank-legend'],['boss_support_ship_040','10-support-bandage-rig'],['nova_enemy_1778','11-late-hull']]){
  const found=await page.evaluate(id=>{const c=window.__game.scenes.threatCodex;c.categoryIndex=id.startsWith('pilot_')?11:0;c.entryIndex=c.getEntriesForCategory().findIndex(e=>e.id===id);c.init();return c.entryIndex>=0;},id);assert.ok(found,id);await shot(name);
 }
 await page.evaluate(()=>{const g=window.__game;g.switchScene('menu');g.startGame(g.selectedShipSpriteKey);});
 await page.waitForFunction(()=>window.__game.scenes.play?.player?.shipSprite?.texture,null,{timeout:120000});
 await page.waitForTimeout(6000);
 await page.evaluate(async()=>{
  const {GameAssets}=await import('/src/utils/GameAssets.js');await GameAssets.ensureBonusCoreTexture();
  const {BonusDrone}=await import('/src/entities/BonusDrone.js');const p=window.__game.scenes.play;
  p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.isPaused=true;
  p.player.createDrones(4);
  for(let i=0;i<8;i++){const d=new BonusDrone(240+i%4*250,270+Math.floor(i/4)*150,window.__game,i<4?'HAZARD':'POWERUP');d.visualVariant=i%4;d.mainSprite.texture=GameAssets.getBonusDroneTexture(i);d.mainSprite.width=d.mainSprite.height=i<4?46:52;p.container.addChild(d.sprite);p.ambientBonusDrones.push(d);}
 });await shot('08-drone-encounter');
 await page.evaluate(()=>{const p=window.__game.scenes.play;p.isPaused=false;p.player.invulnerable=true;p.player.invulnerableTime=1e9;});
 await page.keyboard.down('Space');await page.keyboard.down('ArrowRight');await page.waitForTimeout(1000);await page.keyboard.up('ArrowRight');await page.waitForTimeout(2000);await shot('09-combat');
 assert.deepEqual(errors,[]);writeFileSync(`${out}/report.json`,JSON.stringify({errors,ok:true},null,2));
}finally{await browser.close();}
