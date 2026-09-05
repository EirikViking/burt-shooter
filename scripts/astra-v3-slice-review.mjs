import {chromium} from 'playwright';import {mkdirSync,writeFileSync} from 'node:fs';
const label=process.argv[2]||'slice',out=`test-results/astra-v3-${label}`;mkdirSync(out,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={errors:[],warnings:[],captures:[]};
try{
 const page=await b.newPage({viewport:{width:1280,height:720}});
 await page.route('**/*',r=>/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))report.warnings.push(m.text());});
 const shot=async name=>{await page.waitForTimeout(500);await page.screenshot({path:`${out}/${name}.png`});report.captures.push(name);writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(name);};
 await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1');
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await shot('01-main-ready');
 await page.mouse.move(615,370);
 report.viewer=await page.evaluate(()=>{const s=window.__game.scenes.menu.astraMenuShip;return {mode:s.eventMode,measurable:s.measurable,visible:s.visible,renderable:s.renderable,alpha:s.alpha,scale:s.scale.x,position:{x:s.x,y:s.y},area:s.hitArea,world:s.worldTransform,screen:window.__game.app.screen,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),listeners:s.listenerCount('pointerdown'),sources:performance.getEntriesByType('resource').map(x=>x.name).filter(x=>x.includes('ThreatDiscoveryState'))};});
 report.hit=await page.evaluate(()=>{let e=window.__game.app.renderer.events.rootBoundary.hitTest(615,370),a=[];while(e){a.push({label:e.label,type:e.constructor.name,z:e.zIndex,mode:e.eventMode});e=e.parent;}return a;});
 await page.mouse.move(615,370);await page.mouse.down();await page.mouse.move(840,370,{steps:32});await page.mouse.up();await page.waitForTimeout(500);
 report.menuAngle=await page.evaluate(()=>({view:window.__game.scenes.menu.astraMenuShip.viewAngle,target:window.__game.scenes.menu.astraMenuShip.targetAngle}));await shot('02-main-rotated');
 await page.evaluate(()=>window.__game.showShipSelect());
 await page.waitForFunction(()=>window.__game.scenes.shipSelect?.shipCards?.[0]?.turntable?.ready,null,{timeout:120000});await shot('03-hangar-ready');
 await page.mouse.move(640,280);await page.mouse.down();await page.mouse.move(440,280,{steps:32});await page.mouse.up();await page.waitForTimeout(500);await shot('04-hangar-rotated');
 report.seed=await page.evaluate(async()=>{
  const {THREAT_DISCOVERY_KEY,writeThreatDiscoveryState}=await import('/src/progression/ThreatDiscoveryState.js');const {getThreatCodexCatalog}=await import('/src/config/ThreatCodexCatalog.js');const items={};
  for(const [cat,list]of Object.entries(getThreatCodexCatalog())){if(!Array.isArray(list))continue;items[cat]={};for(const e of list)items[cat][e.id]={timesSeen:5,timesDefeated:2,discoveredAt:Date.now(),lastSeenAt:Date.now(),unread:false};}
  const applied=writeThreatDiscoveryState({version:1,items});
  window.__game.showThreatCodex();const c=window.__game.scenes.threatCodex;c.categoryIndex=0;c.entryIndex=c.getEntriesForCategory().findIndex(e=>e.id==='boss_support_ship_058');c.init();return {input:Object.keys(items.enemies||{}).length,applied:Object.keys(applied.items.enemies||{}).length,scene:Object.keys(c.discoveryState.items.enemies||{}).length};
 });await shot('05-reactor-nurse');
 await page.evaluate(()=>{const g=window.__game;g.switchScene('menu');g.startGame(g.selectedShipSpriteKey);});
 await page.waitForFunction(()=>window.__game.scenes.play?.player?.shipSprite?.texture,null,{timeout:120000});await page.waitForTimeout(5500);await shot('06-opening');
 await page.evaluate(async()=>{
  const {Bullet}=await import('/src/entities/Bullet.js');const p=window.__game.scenes.play;p.isPaused=true;
  for(let i=0;i<12;i++){const shot=new Bullet(280+i*62,350+Math.sin(i)*80,0,2.2,1,[0xff6349,0xffb83d,0xef5eb5,0x7d9bff][i%4],false,{radius:6,animationStyle:['orb','needle','crescent','star'][i%4],weaponProfileId:['amber_plasma_orb','cyan_rail_needle','magenta_crescent','violet_star_mine'][i%4]});p.bulletManager.addEnemyBullet(shot);}
 });await shot('07-hostile-materials');
 writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
 if(report.errors.length||report.warnings.length)throw Error(JSON.stringify(report));
}finally{await b.close();}
