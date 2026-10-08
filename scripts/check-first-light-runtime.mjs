import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const out=process.env.CHECK_OUTPUT_DIR;
assert(out, 'Set CHECK_OUTPUT_DIR to an isolated test directory');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const snap=async name=>{await page.evaluate(()=>{const s=window.__game.scenes.play,d=s.firstLightDirector;d.view.update(d.model,0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,d.charges);window.__game.app.render();});await page.screenshot({path:path.join(out,`${name}.png`)});};
try{
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4880'}/?autostart=1&offlineLeaderboard=1`);
  await page.waitForFunction(()=>window.__game?.scenes?.play?.firstLightDirector?.view,{},{timeout:90000});
  await page.evaluate(()=>{const p=window.__game.scenes.play.player;p.invulnerable=true;p.invulnerableTime=999999;});
  // Natural game scheduling proves the encounter can actually be reached.
  await page.waitForFunction(()=>window.__game?.scenes?.play?.firstLightDirector?.model.encounter?.age>2,{},{timeout:60000});
  assert.equal(await page.evaluate(()=>window.__game.scenes.play.firstLightDirector.model.encounter.kind),'convoy');
  await snap('01-convoy-natural');
  await page.evaluate(()=>{window.__game.app.ticker.stop();});
  const setup=await page.evaluate(async()=>{
    const g=window.__game,s=g.scenes.play,d=s.firstLightDirector;
    const {Bullet}=await import('/src/entities/Bullet.js');window.__firstLightBullet=Bullet;
    window.__firstLightHit=(part,damage=100,piercing=false)=>{
      d.view.update(d.model,0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,d.charges);
      const t=d.view.targets.find(x=>x.part===part);if(!t)return false;
      const b=new Bullet(t.x,t.y,0,0,damage,0x66ffee,true);b.piercing=piercing;
      s.bulletManager.addPlayerBullet(b);d.interceptShots();return b;
    };
    window.__firstLightSafe=sector=>{
      d.cancel('test-fixture');d.model.seen.delete(sector);d.model.clock=0;
      g.level=sector;s.introActive=false;s.introComplete=true;
      const m=s.enemyManager;m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
      m.waves[m.currentWaveIndex].isChallenge=false;m.challengeFlightState=null;
      if(m.discoveryEncounter)m.discoveryEncounter.plan=null;
      s.clearToastState?.();s.activeMayhemReinforcementWarning=null;s.activeMayhemRoutineWarning=null;m.mayhemReinforcementState=null;
      for(let i=0;i<450;i++)d.update(1);
    };
    return {mode:g.runMode,targets:d.snapshot().targets};
  });
  assert.equal(setup.targets.length,2);
  const rescueCue=await page.evaluate(async()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector;
    const {AudioManager}=await import('/src/audio/AudioManager.js');
    const {getFirstLightDesign}=await import('/src/config/FirstLightDesigns.js');
    const expected=`first_light_convoy_${getFirstLightDesign('convoy',d.model.encounter.variant).id}_rescue`;
    const played=[],original=AudioManager.playSfx;
    AudioManager.playSfx=function(name,...args){played.push(name);return original.call(this,name,...args);};
    try{window.__firstLightHit('left');window.__firstLightHit('right');}finally{AudioManager.playSfx=original;}
    return played.filter(name=>name===expected).length===2;
  });
  assert(rescueCue,'both locks must trigger the hull-specific rescue cue');
  await page.evaluate(()=>{const d=window.__game.scenes.play.firstLightDirector;for(let i=0;i<12;i++)d.update(1);});
  await snap('02a-convoy-launch');
  const rescued=await page.evaluate(()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector;
    for(let i=0;i<50;i++)d.update(1);
    const before=s.bulletManager.playerBullets.filter(b=>b.firstLightSupport).length;
    d.onPlayerVolley();const after=s.bulletManager.playerBullets.filter(b=>b.firstLightSupport).length;
    return {rescued:d.model.rescued,escorts:d.model.escorts.length,shots:after-before};
  });
  assert.deepEqual(rescued,{rescued:2,escorts:2,shots:3});
  await snap('02-rescued-wing');
  assert(await page.evaluate(()=>window.__game.scenes.play.firstLightDirector.view.allies.every(s=>s.visible&&s.texture.width>1&&s.texture.height>1)), 'both escorts have real, visible hull textures');
  assert(await page.evaluate(()=>{
    const d=window.__game.scenes.play.firstLightDirector;
    return d.view.allies.every(s=>s.width>=58&&s.height>=60);
  }), 'rescued fighters must read clearly during their launch');
  const exit=await page.evaluate(()=>{
    const d=window.__game.scenes.play.firstLightDirector,x=d.view.pose.x;
    for(let i=0;i<65;i++)d.update(1);
    return {moved:Math.abs(d.view.pose.x-x),retained:d.model.escorts.length};
  });
  assert(exit.moved>70&&exit.retained===2,JSON.stringify(exit));
  await snap('02b-convoy-powered-exit');
  const pause=await page.evaluate(()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector,b=d.model.escorts[0].age;
    s.isPaused=true;d.update(300);s.isPaused=false;return d.model.escorts[0].age===b;
  });assert(pause,'pause freezes allies');
  const supportTransition=await page.evaluate(()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector;
    for(const a of d.model.escorts)a.shotTimer=0;
    const before=s.bulletManager.playerBullets.length;
    s.enemyManager.state='BOSS_ACTIVE';d.onPlayerVolley();
    const blocked=s.bulletManager.playerBullets.length===before;d.update(1);
    return {blocked,cleared:!s.bulletManager.playerBullets.some(b=>b.active&&b.firstLightSupport&&b.firstLightOwner===d),retained:d.model.escorts.length===2};
  });assert(supportTransition.blocked&&supportTransition.cleared&&supportTransition.retained);
  await page.evaluate(()=>window.__firstLightSafe(2));
  await snap('03-rival');
  const result=await page.evaluate(()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector;
    const armored=d.model.encounter.hp.core;
    const rejected=window.__firstLightHit('core')===false;
    d.fireRival('left');d.fireRival('right');
    const left=s.bulletManager.enemyBullets.filter(b=>b.active&&b.firstLightOwner===d&&b.firstLightPart==='left').length;
    const right=s.bulletManager.enemyBullets.filter(b=>b.active&&b.firstLightOwner===d&&b.firstLightPart==='right').length;
    window.__firstLightHit('left');
    return {armored,rejected,left,right,leftOff:!d.model.attackEnabled('left'),rightOn:d.model.attackEnabled('right')};
  });assert(result.rejected&&result.armored>0&&result.leftOff&&result.rightOn);assert(result.left>=3&&result.right>=1);
  await snap('04-rival-one-gun');
  await page.evaluate(()=>window.__firstLightHit('right'));await snap('05-rival-core');
  const phase=await page.evaluate(async()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector;
    const {AudioManager}=await import('/src/audio/AudioManager.js');
    const played=[],original=AudioManager.playSfx;
    AudioManager.playSfx=function(name,...args){played.push(name);return original.call(this,name,...args);};
    try{
      const hp=d.model.encounter.hp.core;
      s.enemyManager.state='WAVE_BRIEFING';d.update(1);d.update(1);
      const visible=d.view.contact.alpha>.8;
      for(let i=0;i<65;i++)d.update(1);
      const faded=d.view.contact.alpha<.1;
      s.enemyManager.state='WAVE_ACTIVE';d.update(1);
      const protectedOnEntry=d.view.targets.length===0;
      for(let i=0;i<65;i++)d.update(1);
      return {visible,faded,preserved:d.model.encounter.hp.core===hp,
        protectedOnEntry,
        retreat:played.filter(x=>x==='first_light_rival_retreat').length,
        reentry:played.filter(x=>x.includes('_arrive')).length};
    }finally{AudioManager.playSfx=original;}
  });
  assert.deepEqual(phase,{visible:true,faded:true,preserved:true,protectedOnEntry:true,retreat:1,reentry:1},JSON.stringify(phase));
  const victory=await page.evaluate(async()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector;
    const {firstLightRivalDroneValue}=await import('/src/game/ArcadeFirstLight.js');
    const expected=firstLightRivalDroneValue(d.model.encounter.sector,d.model.encounter.variant);
    const spawn=s.spawnAmbientBonusDrone.bind(s),calls=[];
    s.spawnAmbientBonusDrone=(...args)=>{const drone=spawn(...args);calls.push({type:args[0],drone});return drone;};
    window.__firstLightHit('core');d.interceptShots();
    s.spawnAmbientBonusDrone=spawn;
    d.view.update(d.model,.1,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,d.charges);
    const reward=calls[0]?.drone;
    return {won:d.model.encounter.won,calls:calls.length,type:calls[0]?.type,
      score:reward?.scoreValue,expected,label:reward?.targetLabel?.text,
      persists:reward?.active&&!s.getWaveCleanupTargets().includes(reward)&&reward.firstLightReward,
      bullets:s.bulletManager.enemyBullets.filter(b=>b.active&&b.firstLightOwner===d).length};
  });
  assert(victory.won&&victory.calls===1&&victory.type==='HAZARD'&&victory.score===victory.expected
    &&victory.label?.includes(String(victory.score))&&victory.persists&&victory.bullets===0,JSON.stringify(victory));
  await snap('06-rival-victory');
  assert(await page.evaluate(()=>{
    const d=window.__game.scenes.play.firstLightDirector;
    return d.view.body.visible && d.view.wreckage.length>=3;
  }), 'core defeat must keep the hull visible for staged breakup');
  await page.evaluate(()=>{const s=window.__game.scenes.play,d=s.firstLightDirector;d.model.encounter.age+=.5;
    d.view.update(d.model,.5,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,d.charges);});
  await snap('06b-rival-breakup');
  assert(await page.evaluate(()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector,v=d.view;
    return v.wreckage.every(piece=>piece.visible&&piece.y>60&&piece.y<s.gameplayGame.getHeight()*.72)
      && v.contact.alpha>.9;
  }), 'hull must split visibly inside the playfield');
  await page.evaluate(()=>{const s=window.__game.scenes.play,d=s.firstLightDirector;d.model.encounter.age+=.7;
    d.view.update(d.model,.7,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,d.charges);});
  await snap('06c-rival-rupture');
  const scoredDrone=await page.evaluate(()=>{
    const s=window.__game.scenes.play,g=window.__game;
    const drone=s.ambientBonusDrones.find(item=>item.firstLightReward&&item.active);
    const claims=[],original=g.addBonusScore,before=g.score;
    g.addBonusScore=function(value,...rest){claims.push(value);return original.call(this,value,...rest);};
    try{
      const bullet=new window.__firstLightBullet(drone.x,drone.y,0,0,2,0xffffff,true);
      s.bulletManager.addPlayerBullet(bullet);s.checkCollisions();s.checkCollisions();
    }finally{g.addBonusScore=original;}
    return {value:drone.scoreValue,claims,delta:g.score-before,active:drone.active};
  });
  assert.deepEqual(scoredDrone.claims,[scoredDrone.value],JSON.stringify(scoredDrone));
  assert(scoredDrone.delta===scoredDrone.value&&!scoredDrone.active,JSON.stringify(scoredDrone));
  const lifecycle=await page.evaluate(()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector;
    window.__firstLightSafe(52);d.fireRival('left');s.enemyManager.waves[s.enemyManager.currentWaveIndex].isChallenge=true;d.update(1);
    const clean=d.model.encounter?.suspended&&!s.bulletManager.enemyBullets.some(b=>b.active&&b.firstLightOwner===d);
    window.__firstLightSafe(52);s.activeMayhemReinforcementWarning={overlay:{parent:{}}};d.update(1);
    const warning=d.model.encounter?.suspended&&d.view.targets.length===0;
    window.__firstLightSafe(51);window.__firstLightHit('left');s.game.lives=0;d.syncVisibility();
    return {clean,warning,dead:d.model.escorts.length===0&&!d.view.root.visible};
  });assert(lifecycle.clean&&lifecycle.warning&&lifecycle.dead,JSON.stringify(lifecycle));
  const bomb=await page.evaluate(()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector;window.__game.lives=3;window.__firstLightSafe(52);
    const t=d.view.targets[0],b=new window.__firstLightBullet(t.x,t.y,0,0,999,0xffff88,true);
    b.isBomb=true;b.blastRadius=500;s.bulletManager.addPlayerBullet(b);d.interceptShots();
    return {detonated:b.bombDetonated,left:d.model.encounter.hp.left,right:d.model.encounter.hp.right,core:d.model.encounter.hp.core};
  });assert(bomb.detonated&&bomb.left===0&&bomb.right===0&&bomb.core>0);
  await page.evaluate(async()=>{
    const {setLanguagePreference}=await import('/src/i18n/index.js');
    const {HowToPlayOverlay}=await import('/src/ui/HowToPlayOverlay.js');
    window.__firstLightHelp={setLanguagePreference,HowToPlayOverlay};
  });
  const help=[];
  for(const locale of ['en','de','es','ru','zh-CN','pt-BR','ko','ja']){
    const state=await page.evaluate(async locale=>{
      const g=window.__game,{setLanguagePreference,HowToPlayOverlay}=window.__firstLightHelp;
      await setLanguagePreference(locale);const overlay=new HowToPlayOverlay(g);g.app.stage.addChild(overlay.container);overlay.setPage(2);
      window.__helpPreview=overlay;return overlay.getDebugState();
    },locale);
    assert.equal(state.pageId,'encounters');assert.equal(state.cardCount,2);assert.deepEqual(state.layout.layoutWarnings,[]);
    if(locale!=='en')for(const card of state.cards){assert.notEqual(card.label,card.translatedLabel);assert.notEqual(card.tip,card.translatedTip);}
    await page.waitForFunction(()=>window.__helpPreview.cards.every(c=>!c._illustration||c._illustration.encounterShip));
    await snap(`help-${locale}`);help.push({locale,state});await page.evaluate(()=>window.__helpPreview.close());
  }
  await page.setViewportSize({width:760,height:640});
  await page.waitForTimeout(300);
  await page.evaluate(async()=>{
    await window.__firstLightHelp.setLanguagePreference('de');
    const g=window.__game,s=g.scenes.play;g.lives=3;
    s.screenShake.shakeDuration=0;s.screenShake.freezeFrames=0;s.applyGameplayViewportTransform();
    const {setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
    setReducedMotionEnabled(true);setFlashIntensityScale(0);window.__firstLightSafe(52);
    s.firstLightDirector.view.update(s.firstLightDirector.model,0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,{});
  });await snap('07-compact-low-flash-german');
  const bounds=await page.evaluate(()=>{
    const s=window.__game.scenes.play,d=s.firstLightDirector;
    return {depth:d.view.root.zIndex<s.player.sprite.zIndex,targets:d.view.targets.map(t=>({x:t.x,y:t.y})),width:s.gameplayGame.getWidth(),height:s.gameplayGame.getHeight()};
  });assert(bounds.depth,'encounter must not hide player');for(const t of bounds.targets)assert(t.x>=0&&t.x<=bounds.width&&t.y>=0&&t.y<=bounds.height);
  await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(300);
  await page.evaluate(async()=>{await window.__firstLightHelp.setLanguagePreference('en');const a=await import('/src/config/AccessibilitySettings.js');a.setReducedMotionEnabled(false);a.setFlashIntensityScale(1);});
  const designs=[];
  for(const [kind,count] of [['convoy',4],['rival',6]])for(let variant=0;variant<count;variant++){
    const row=await page.evaluate(async({kind,variant})=>{
      const s=window.__game.scenes.play,d=s.firstLightDirector;window.__firstLightSafe(kind==='convoy'?1:2);
      d.model.encounter.variant=variant;d.model.encounter.age=3;d.view.contact.alpha=1;
      d.view.update(d.model,0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,{});
      const {getFirstLightDesign}=await import('/src/config/FirstLightDesigns.js');
      return {kind,variant,id:getFirstLightDesign(kind,variant).id,targets:d.snapshot().targets};
    },{kind,variant});
    assert.equal(row.targets.length,2);await snap(`design-${kind}-${row.id}`);
    if(kind==='rival'){
      await page.evaluate(()=>{window.__firstLightHit('left');window.__firstLightHit('right');});
      await snap(`design-rival-${row.id}-core`);
      assert(await page.evaluate(()=>{const d=window.__game.scenes.play.firstLightDirector;return d.view.modules.every(s=>!s.visible)&&d.view.targets.length===1&&d.view.targets[0].part==='core';}));
    }
    designs.push(row);
  }
  const codex=await page.evaluate(async()=>{
    const {getThreatCodexCatalog}=await import('/src/config/ThreatCodexCatalog.js');
    return Object.fromEntries(['en','de','es','ru','zh-CN','pt-BR','ko','ja'].map(locale=>[locale,getThreatCodexCatalog({locale}).enemies.filter(e=>e.id.startsWith('first_light_'))]));
  });
  for(const entries of Object.values(codex)){assert.equal(entries.length,10);assert(entries.every(e=>e.art&&e.description&&e.tip));}
  writeFileSync(path.join(out,'result.json'),JSON.stringify({setup,rescued,result,victory,lifecycle,bomb,help,bounds,designs,codex,errors},null,2));
  assert.deepEqual(errors,[]);
  console.log('[first-light-runtime] PASS natural admission, real projectiles, rescue support, pause, rival guns/core, one scaling bonus drone, later sectors and lifecycle');
}finally{await browser.close();}
