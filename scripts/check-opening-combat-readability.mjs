import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {getDeathCoachAdvice} from '../src/game/RunReport.js';
import {usesOpeningCombatReadability, getHostileProjectileInk} from '../src/config/OpeningCombatReadability.js';

const out=process.env.CHECK_OUTPUT_DIR || 'test-results/opening-combat-readability';
mkdirSync(out,{recursive:true});
const baseline='e8f635e10996b92e976b03d92308f497be711d6f';
const oldBullet=execFileSync('git',['show',`${baseline}:src/entities/Bullet.js`],{encoding:'utf8'});
const report={baseline,checks:[],errors:[]};
for(const sector of [0,1,2,3,4,90]) assert.equal(usesOpeningCombatReadability({level:sector}),sector>=1&&sector<=3);
for(const cause of ['enemy_bullet','boss_bullet','hostile_fire','boss_hazard','boss_wall','ship_contact']) {
  const advice=getDeathCoachAdvice(cause);
  assert.notEqual(advice.advice,getDeathCoachAdvice('unknown').advice,cause);
}
assert.equal(getHostileProjectileInk(0x00ffff),0xffb34f);
assert.equal(getHostileProjectileInk(0x00ff00),0xffb34f);
report.checks.push('sector bounds, damage aliases, friendly/hostile palette separation');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720}});
await context.route('**/*',r=>/^(data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
try {
  await page.goto((process.env.CHECK_URL || 'http://127.0.0.1:4399')+'/?offlineLeaderboard=1&autostart=1&seed=1290904');
  await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);g.app.ticker.stop();});
  const parity=await page.evaluate(async oldSource=>{
    const {Bullet}=await import('/src/entities/Bullet.js');
    const transformed=await (await fetch('/src/entities/Bullet.js')).text();
    const pixi=transformed.match(/from ["']([^"']*pixi[^"']*)["']/)[1];
    const source=oldSource.replace(/from (['"])([^'"]+)\1/g,(_m,_q,s)=>`from ${JSON.stringify(new URL(s==='pixi.js'?pixi:s,new URL('/src/entities/Bullet.js',location.href)).href)}`);
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    const Old=(await import(url)).Bullet;URL.revokeObjectURL(url);
    const snapshots=Type=>{
      const original=Math.random;let calls=0;
      Math.random=()=>{calls++;return .371;};
      try {
        const rows=[];
        for(const style of ['pulse','needle','orb','shard','boss']) {
          const b=new Type(400,200,1.1,2.8,2,0x00ffff,false,{animationStyle:style});
          b.setScreenBounds(1280,720);
          for(let i=0;i<60;i++)b.update(1);
          rows.push(Object.fromEntries(['x','y','vx','vy','radius','damage','active','age','ageMs','threatSplitTriggered','threatReleaseTriggered'].map(k=>[k,b[k]])));
          b.destroy?.();
        }
        return {rows,calls};
      } finally {Math.random=original;}
    };
    return {before:snapshots(Old),after:snapshots(Bullet)};
  },oldBullet);
  assert.deepEqual(parity.after,parity.before,'Bullet motion, collision, lifecycle and RNG parity');
  report.checks.push('baseline/candidate projectile simulation and RNG parity: five styles, 60 frames each');
  const state=await page.evaluate(async()=>{
    const g=window.__game,p=g.scenes.play,h=p.hud;
    const {Bullet}=await import('/src/entities/Bullet.js');
    const {Graphics}=await import('pixi.js').catch(async()=>{
      const src=await(await fetch('/src/entities/Bullet.js')).text();
      return import(src.match(/from ["']([^"']*pixi[^"']*)["']/)[1]);
    });
    const {drawAstraWarningLane}=await import('/src/effects/AstraWarningField.js');
    p.clearToastState();
    const originalBullets=p.bulletManager.enemyBullets;
    p.bulletManager.enemyBullets=Array.from({length:8},()=>({active:true}));
    const now=Date.now();
    const notice={message:'RANK 2',options:{type:'rank_up',duration:1800},notBefore:0,expiresAt:now+100};
    const warning={message:'BOSS',options:{type:'boss_warning',duration:1100},notBefore:0,expiresAt:now+100};
    p.toastCornerQueue=[notice,warning];p.deferOpeningCombatNotices(now);
    const held=notice.notBefore>now&&notice.expiresAt>notice.notBefore;
    const immediate=warning.notBefore===0;
    p.bulletManager.enemyBullets=[];
    p.enemyManager.enemies.forEach(e=>e.eliteAbility&&(e.eliteAbility.state='cooldown'));
    p.bossHazards=[];p.enemyManager.boss=null;
    const until=notice.notBefore;p.deferOpeningCombatNotices(now+300);
    const released=notice.notBefore===until&&notice.options.duration===1800;
    p.clearToastState();p.bulletManager.enemyBullets=originalBullets;
    g.level=1;h.updateOpeningCombatReadability();const hidden=h.highscoreChaseGroup.renderable===false;
    p.isPaused=true;h.updateOpeningCombatReadability();const pauseRestored=h.highscoreChaseGroup.renderable;
    p.isPaused=false;g.level=4;h.updateOpeningCombatReadability();const laterRestored=h.highscoreChaseGroup.renderable;g.level=1;
    const polygons=[];
    const recorder={poly(v){polygons.push(v);return this;},fill(){return this;},moveTo(){return this;},lineTo(){return this;},stroke(){return this;}};
    drawAstraWarningLane(recorder,{x:100,y:80,angle:Math.PI/2,start:20,length:300,halfWidth:8,progress:.6});
    const chargePolygon=polygons[0];polygons.length=0;
    drawAstraWarningLane(recorder,{x:100,y:80,angle:Math.PI/2,start:20,length:300,halfWidth:8,progress:1,active:true});
    const activePolygon=polygons[0];
    // A stationary staged comparison: identical positions at actual game size.
    for(const e of p.enemyManager.enemies)e.sprite.visible=false;
    for(const b of [...p.bulletManager.enemyBullets,...p.bulletManager.playerBullets])b.sprite.visible=false;
    const layer=new Graphics();p.gameContainer.addChild(layer);window.readabilityLane=layer;
    p.player.invulnerable=false;p.player.invulnerableTime=0;p.player.x=640;p.player.y=620;p.player.sprite.position.set(640,620);
    p.player.updateFocusRing(0);p.player.focusDriftActive=true;p.player.updateHitboxReticle(0);p.player.focusDriftActive=false;
    for(let i=0;i<18;i++) {
      const b=new Bullet(180+(i%6)*175,270+Math.floor(i/6)*110,0,2,1,[0xff4455,0x66ffff,0xaa55ff][i%3],false,{animationStyle:i%2?'needle':'orb'});
      p.gameContainer.addChild(b.sprite);
    }
    for(const x of [420,850])drawAstraWarningLane(layer,{x,y:160,length:500,angle:Math.PI/2,halfWidth:10,progress:.65});
    h.update();g.app.renderer.render(g.app.stage);
    return {held,immediate,released,hidden,pauseRestored,laterRestored,chargePolygon,activePolygon,reticleRadius:p.player.radius};
  });
  for(const key of ['held','immediate','released','hidden','pauseRestored','laterRestored'])assert.equal(state[key],true,key);
  assert.deepEqual(state.chargePolygon,state.activePolygon,'Arming/active lane boundaries coincide');
  assert.deepEqual(state.chargePolygon.map(Math.round),[108,100,108,380,92,380,92,100]);
  report.checks.push('secondary notice held/released without losing duration; warnings immediate; HUD restores; exact lane boundaries');
  await page.screenshot({path:`${out}/combat.png`});
  await page.evaluate(async()=>{
    const {drawAstraWarningLane}=await import('/src/effects/AstraWarningField.js');
    const layer=window.readabilityLane;layer.clear();
    for(const x of [420,850])drawAstraWarningLane(layer,{x,y:160,length:500,angle:Math.PI/2,halfWidth:10,progress:1,active:true});
    window.__game.app.renderer.render(window.__game.app.stage);
  });
  await page.screenshot({path:`${out}/active-lanes.png`});
  await page.evaluate(()=>{const g=window.__game;g.runSummary={...g.runSummary,finalDeathSource:'boss_hazard',lastLifeLossSource:'boss_hazard'};g.gameOver();g.app.ticker.start();});
  await page.waitForFunction(()=>window.__game.scenes.gameOver?.counterAdviceCardDebug?.visible,null,{timeout:45000});
  const advice=await page.evaluate(()=>{
    const s=window.__game.scenes.gameOver;
    s.game.runSummary.finalDeathSource='boss_hazard';s.game.runSummary.lastLifeLossSource='boss_hazard';
    s.refreshPrimaryCta();return s.counterAdviceCardDebug;
  });
  assert.ok(advice.label.includes('HAZARD IMPACT'));assert.ok(!advice.text.includes('Run it back'));
  await page.screenshot({path:`${out}/death.png`});report.checks.push('fatal hazard label and specific counter-advice in immediate result card');
  for(const locale of ['en','de','es','ru','zh-CN','pt-BR','ko','ja']) {
    await page.evaluate(async locale=>{
      await window.__novaI18n.setLanguagePreference(locale);window.__game.scenes.gameOver.layoutScreen();
    },locale);
    await page.waitForTimeout(100);
    const bounds=await page.evaluate(()=>{
      const s=window.__game.scenes.gameOver,card=s.counterAdviceCardBg.getBounds();
      return {card:{x:card.x,y:card.y,right:card.x+card.width,bottom:card.y+card.height},
        nodes:[s.counterAdviceLabel,s.counterAdviceBody].map(n=>{const b=n.getBounds();return {text:n.text,x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};})};
    });
    for(const b of bounds.nodes){assert.ok(b.x>=bounds.card.x-1&&b.right<=bounds.card.right+1,`${locale}: horizontal card fit`);assert.ok(b.y>=bounds.card.y-1&&b.bottom<=bounds.card.bottom+1,`${locale}: vertical card fit`);}
    if(locale!=='en')assert.notEqual(bounds.nodes[1].text,'Move out of the marked area before it fires.');
    await page.screenshot({path:`${out}/death-${locale}.png`});
  }
  report.checks.push('eight-language fatal hazard card: translated body and bounded label/body');
  assert.deepEqual(report.errors,[]);report.ok=true;
} finally {writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await context.close();await browser.close();}
console.log(JSON.stringify(report));
