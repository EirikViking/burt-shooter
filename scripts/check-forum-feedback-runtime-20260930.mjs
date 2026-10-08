import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const failures=[],checks=[],errors=[];
async function check(name,fn){try{const detail=await fn();checks.push({name,...detail});console.log('PASS',name);}catch(e){failures.push({name,error:e.message});console.error('FAIL',name,e.message);}}
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4897'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=molt`);
  await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.localTestChain,null,{timeout:90000});
  await page.evaluate(()=>window.__game.app.ticker.stop());
  await check('Phase/respawn contact preserves snake health, objectives, ownership and rewards',async()=>{
    const result=await page.evaluate(()=>{
      const g=window.__game,s=g.scenes.play,c=s.firstLightDirector.localTestChain;
      // The crossing happens after entry, when body contact is normally active.
      for(const e of c.sections){e.contactSafeDuringEntry=false;e.contactSafeUntil=0;}
      const before={score:g.score,lives:g.lives,active:c.sections.filter(e=>e.active).length,hp:c.sections.map(e=>e.health)};
      s.bulletManager.clearAll('forum-test');s.player.isDodging=true;s.player.invulnerable=true;
      for(const e of c.sections){s.player.x=e.x;s.player.y=e.y;s.checkCollisions();}
      s.player.isDodging=false;s.player.x=30;s.player.y=s.gameplayGame.getHeight()*.9;
      return {before,after:{score:g.score,lives:g.lives,active:c.sections.filter(e=>e.active).length,hp:c.sections.map(e=>e.health)},prototype:g.runPolicy.prototype};
    });assert(result.prototype);assert.deepEqual(result.after,result.before);return result;
  });
  await check('real convoy director holds pose and health through ordinary briefing, suspends for major threats',async()=>{
    const result=await page.evaluate(async()=>{
      const {FirstLightModel}=await import('/src/game/ArcadeFirstLight.js');
      const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;
      const saved={enemies:m.enemies,state:m.state,phase:m.phase,waveEnding:m.waveEnding,level:g.level,model:d.model,intro:s.introComplete};
      m.enemies=[];m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;s.introComplete=true;g.level=1;
      d.model=new FirstLightModel('forum-continuity');
      for(let i=0;i<65;i++)d.update(6);
      const e=d.model.encounter;if(!e)throw new Error('convoy fixture did not spawn');
      e.age=3;d.update(1);const before={age:e.age,hp:{...e.hp},pose:{...d.view.pose},resume:d.view.resumeAge};
      const {Bullet}=await import('/src/entities/Bullet.js');
      const hostile=new Bullet(100,100,0,1,1,0xff0000,false);hostile.firstLightOwner=d;s.bulletManager.addEnemyBullet(hostile);
      m.state='WAVE_BRIEFING';m.waveEnding=true;
      for(let i=0;i<60;i++)d.update(1);
      const held={same:d.model.encounter===e,suspended:e.suspended,age:e.age,hp:{...e.hp},pose:{...d.view.pose},resume:d.view.resumeAge,visible:d.view.body.visible,hostileActive:hostile.active};
      m.state='WAVE_ACTIVE';m.waveEnding=false;d.update(1);
      const resumed={suspended:e.suspended,age:e.age,resume:d.view.resumeAge};
      m.enemies=[{active:true,kind:'space_snake'}];d.update(1);
      const major={suspended:e.suspended,age:e.age};
      m.enemies=saved.enemies;m.state=saved.state;m.phase=saved.phase;m.waveEnding=saved.waveEnding;g.level=saved.level;d.model=saved.model;s.introComplete=saved.intro;
      return {before,held,resumed,major};
    });
    assert(result.held.same);assert(!result.held.suspended);assert(result.held.visible);assert(!result.held.hostileActive);
    assert.equal(result.held.age,result.before.age);assert.deepEqual(result.held.hp,result.before.hp);assert.deepEqual(result.held.pose,result.before.pose);
    assert(result.held.resume>=result.before.resume);assert(!result.resumed.suspended);assert(result.resumed.age>result.held.age);assert(result.resumed.resume>=result.held.resume);
    assert(result.major.suspended);assert.equal(result.major.age,result.resumed.age);return result;
  });
  await check('controller highlight and Hangar Back/reopen recovery',async()=>{
    await page.evaluate(async()=>{const g=window.__game;await g.showShipSelect();g.app.ticker.start();});
    await page.waitForFunction(()=>window.__game?.currentScene===window.__game.scenes.shipSelect);
    await page.evaluate(()=>window.__game.scenes.shipSelect.startSelectedShipInMode({id:'overrun_tactical'}));
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button',{name:'NEXT SHIP',exact:true}).click();
    await page.evaluate(()=>{window.__burtGamepadOverride={id:'forum-fixture',connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};});
    await page.waitForTimeout(150);
    await page.evaluate(()=>window.__burtGamepadOverride.buttons[15].pressed=true);
    await page.waitForTimeout(100);
    await page.evaluate(()=>window.__burtGamepadOverride.buttons[15].pressed=false);
    const focus=await page.evaluate(()=>{const e=document.activeElement,c=getComputedStyle(e);return {text:e.textContent,outline:c.outlineStyle,width:c.outlineWidth,inDialog:!!e.closest('.onslaught-loadout-overlay')};});
    await page.screenshot({path:path.join(out,'controller-focus.png')});
    assert(focus.inDialog);assert.notEqual(focus.outline,'none');assert.notEqual(focus.width,'0px');
    await page.evaluate(()=>window.__burtGamepadOverride.buttons[1].pressed=true);await page.waitForTimeout(100);
    await page.evaluate(()=>window.__burtGamepadOverride.buttons[1].pressed=false);await page.waitForTimeout(100);
    assert.equal(await page.getByRole('dialog').count(),0);
    const locked=await page.evaluate(()=>window.__game.scenes.shipSelect.launchInProgress);assert.equal(locked,false);
    await page.evaluate(()=>window.__game.scenes.shipSelect.launchSelectedShip('forum-fixture'));
    assert(await page.evaluate(()=>!!window.__game.scenes.shipSelect.launchModeOverlay));
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>!!window.__game.scenes.shipSelect.launchModeOverlay),false);
    // Reopen the picker, close its inner chooser and then the whole dialog with Escape.
    await page.evaluate(()=>window.__game.scenes.shipSelect.startSelectedShipInMode({id:'overrun_tactical'}));
    await page.getByRole('dialog').waitFor();await page.locator('.onslaught-loadout-slots button').first().click();
    await page.keyboard.press('Escape');assert(await page.getByRole('dialog').count());
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
    assert.equal(await page.evaluate(()=>window.__game.scenes.shipSelect.launchInProgress),false);
    await page.screenshot({path:path.join(out,'hangar-recovered.png')});return {focus};
  });
  await check('actual achievement scrolling uses row order and matching controller directions',async()=>{
    const result=await page.evaluate(async()=>{
      const {AchievementsScene}=await import('/src/scenes/AchievementsScene.js');const g=window.__game;
      const s=new AchievementsScene(g,{overlay:true,onClose(){}});g.app.stage.addChild(s.container);await s.init();
      s.groupFilter='all';s.refreshFilteredRows();s.scrollOffset=0;s.focusedIndex=0;s.layoutScreen();
      const before=s.getDebugState();const offset=s.columns;s.scrollOffset=offset;s.focusedIndex=offset;s.drawRows();
      const after=s.getDebugState();g.app.render();window.__forumAchievementScene=s;
      return {columns:s.columns,before:before.rows,after:after.rows};
    });assert.equal(result.columns,2);
    for(let i=0;i<result.before.length;i++){const r=result.before[i];assert(Math.abs(r.bounds.y-result.before[Math.floor(i/2)*2].bounds.y)<1);}
    for(const r of result.after){const old=result.before.find(x=>x.id===r.id);if(old)assert.equal(r.bounds.x,old.bounds.x);}
    await page.screenshot({path:path.join(out,'achievement-row-order.png')});
    await page.evaluate(()=>{const s=window.__forumAchievementScene;s.destroy();s.container.parent?.removeChild(s.container);});return {columns:result.columns};
  });
}finally{await browser.close();writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,failures,errors},null,2));}
assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
