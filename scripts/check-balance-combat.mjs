import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert.ok(out);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4377'}/?autostart=1&offlineLeaderboard=1`);
  await page.waitForFunction(()=>window.__game?.scenes.play?.player?.active&&window.__game.scenes.play.enemyManager.waves.length,null,{timeout:90000});
  const snake=await page.evaluate(async()=>{
    const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.app.ticker.stop();p.introActive=false;p.isPaused=false;
    if(p.introOverlay)p.introOverlay.visible=false;
    m.clearEnemies();p.clearEnemyBullets();g.level=m.level=30;m.state='BALANCE_QA';
    const {getSpaceSnakeProfile}=await import('/src/config/SpaceSnakes.js');
    const chain=m.spawnSpaceSnake(getSpaceSnakeProfile('space_snake_grave'),{force:true,count:5});
    await chain.brood.promise;
    for(let i=0;i<300;i++){m.updateEnemies(1);p.bulletManager.update(1);}
    const h=chain.sections[0],shots=h.shoot(p.player.x,p.player.y);
    const speed=Math.hypot(shots[0].vx,shots[0].vy);
    for(const b of shots)p.bulletManager.addEnemyBullet(b);
    p.hud.update();g.app.renderer.render({container:g.app.stage});
    return {speed,shotCount:shots.length,delay:h.shootDelay,health:h.maxHealth,live:chain.sections.filter(s=>s.active).length};
  });
  assert.ok(Math.abs(snake.speed-4.52375)<1e-8);assert.equal(snake.shotCount,5);
  await page.screenshot({path:out+'/snake-combat.png'});
  const veilborn=[];
  for(const id of ['glass_widow','blind_leviathan','witness']){
    const row=await page.evaluate(async id=>{
      const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearEnemies();p.clearEnemyBullets();g.level=m.level=70;
      const {createMysteryEncounter}=await import('/src/entities/mysteries/createMysteryEncounter.js');
      const a=await createMysteryEncounter(m,id);a.audio=null;
      for(let i=0;i<600;i++){a.update(1);p.bulletManager.update(1);}
      p.hud.update();g.app.renderer.render({container:g.app.stage});
      return {id,hp:a.maxHealth,active:a.active,attacks:a.stats.attacks,warnings:a.stats.warnings,next:a.combat.next,age:a.age};
    },id);
    assert.ok(row.active&&row.attacks>0);veilborn.push(row);
    await page.screenshot({path:out+'/'+id+'-combat.png'});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/combat.json',JSON.stringify({snake,veilborn,errors},null,2));
  console.log('PASS actual snake salvo and three Veilborn combat simulations');
} finally {await browser.close();}
