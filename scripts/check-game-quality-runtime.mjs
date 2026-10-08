import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.startsWith('E:'),'Explicit E: evidence directory required');
mkdirSync(out,{recursive:true});
const errors=[],failures=[],results=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.addInitScript(()=>localStorage.setItem('burt_first_run_completed','true'));
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await page.goto(`${process.env.CHECK_URL}/?encounterEvolution=orbit-breaker&autostart=1&offlineLeaderboard=1`,{waitUntil:'domcontentloaded'});
  try{await page.waitForFunction(()=>window.__game?.scenes.play?.encounterExpansionTestReady,null,{timeout:90000});}
  catch(error){writeFileSync(`${out}/startup.json`,JSON.stringify({errors,state:await page.evaluate(()=>({scene:window.__game?.currentSceneName,body:document.body.innerText.slice(0,500)}))},null,2));throw error;}
  await page.evaluate(()=>{const g=window.__game;g.app.ticker.stop();
    if(!g.runPolicy.prototype||g.runPolicy.submitGlobalScores||g.runPolicy.recordAchievements)throw Error('Expected isolated prototype policy');
    g.score=18160;g.level=4;g.runMode='scout';g.runElapsedSeconds=279;g.gameOver();});
  await page.waitForFunction(()=>window.__game?.currentSceneName==='gameOver',null,{timeout:30000});
  const fixtures=[
    {width:1280,height:720,locale:'en',stage:'prompt'},
    {width:1366,height:768,locale:'de',stage:'prompt'},
    {width:1920,height:1080,locale:'en',stage:'runback'},
    {width:1024,height:768,locale:'zh-CN',stage:'runback'},
    {width:540,height:900,locale:'ko',stage:'runback'},
    {width:1280,height:720,locale:'en',stage:'runback',firstFlight:true},
    ...['en','de','zh-CN','ru','es','pt-BR','ko','ja'].map(locale=>({width:1280,height:720,locale,stage:'runback'}))
  ];
  for(const f of fixtures){
    await page.setViewportSize({width:f.width,height:f.height});
    await page.waitForFunction(f=>window.__game?.app.screen.width===f.width&&window.__game?.app.screen.height===f.height,f,{timeout:5000});
    const result=await page.evaluate(async f=>{
      const {translateTextForLocale}=await import('/src/i18n/index.js');
      await window.__novaI18n.setLanguagePreference(f.locale);
      const translateText=source=>translateTextForLocale(f.locale,source);
      const g=window.__game,s=g.scenes.gameOver;g.app.ticker.stop();s.removeAchievementToast();s.achievementToastQueue=[];
      s.state=f.stage;s.firstFlightResult=Boolean(f.firstFlight);s.layoutScreen();
      // A real long result title and actual translated achievement text; no unlock call.
      if(f.stage==='prompt')s.title.text=translateText('FIRST FLIGHT COMPLETE');
      s.layoutScreen();
      const beforeGoal=s.nextGoalText?.text,sourceGoal=s.nextGoal?.text;
      s.layoutScreen();
      const stableGoal=beforeGoal===s.nextGoalText?.text&&sourceGoal===s.nextGoal?.text;
      s.showAchievementToast({achievement:{id:'quality-layout-fixture',name:translateText('FIRST FLIGHT COMPLETE')}});
      s.achievementToastTicker({deltaTime:20});g.app.render();
      const read=n=>{const b=n.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
      const toast=read(s.achievementToast);
      const nodes=['title','scoreText','levelText','unlockText','rankProgressText','shipUnlockProgressText','nextGoalGroup','comment','leaderboardStatusText','promptText','nameDisplay','instructions','retryButton','runReportButton','leaderboardButton','hangarButton','mainMenuButton','counterAdviceCard'];
      const overlaps=nodes.flatMap(name=>{const n=s[name];if(!n?.visible||n.alpha<=.02)return[];const b=read(n);
        return b.width>0&&b.height>0&&toast.x<b.x+b.width&&toast.x+toast.width>b.x&&toast.y<b.y+b.height&&toast.y+toast.height>b.y?[name]:[];});
      return{...f,screen:{width:g.app.screen.width,height:g.app.screen.height},toast,overlaps,
        nextGoal:s.nextGoalText?.text,stableGoal,visible:s.achievementToast.visible&&s.achievementToast.alpha>.5};
    },f);
    results.push(result);
    await page.screenshot({path:`${out}/toast-${f.locale}-${f.width}-${f.firstFlight?'first-flight':f.stage}.png`});
    if(result.overlaps.length)failures.push(`Achievement overlaps ${result.overlaps.join(',')} at ${f.locale} ${f.width} ${f.stage}`);
    if(!result.stableGoal)failures.push(`Relayout rewrites/grows ${f.locale} result guidance`);
    if(f.locale!=='en'&&/run ranked for the boards/i.test(result.nextGoal))failures.push(`Untranslated ${f.locale} Scout goal in actual renderer`);
    if(!result.visible||result.toast.x<0||result.toast.y<0||result.toast.x+result.toast.width>result.screen.width||result.toast.y+result.toast.height>result.screen.height)failures.push(`Achievement hidden/clipped at ${f.locale} ${f.width}`);
  }
  const longNames=await page.evaluate(async()=>{
    const {ACHIEVEMENTS}=await import('/src/achievements/AchievementCatalog.js');
    const {translateTextForLocale}=await import('/src/i18n/index.js');
    const s=window.__game.scenes.gameOver,rows=[];
    for(const locale of ['en','de','zh-CN','ru','es','pt-BR','ko','ja']){
      await window.__novaI18n.setLanguagePreference(locale);s.removeAchievementToast();s.achievementToastQueue=[];
      const name=ACHIEVEMENTS.map(a=>translateTextForLocale(locale,a.name)).sort((a,b)=>b.length-a.length)[0];
      s.showAchievementToast({achievement:{id:'long-name-fixture',name}});
      const title=s.achievementToast.children[1].getBounds(),label=s.achievementToast.children[2].getBounds();
      const overlap=title.y+title.height>label.y;
      rows.push({locale,name,overlap,titleHeight:title.height,labelHeight:label.height});
    }return rows;
  });
  for(const name of longNames)if(name.overlap)failures.push(`Achievement name overlaps its own heading in ${name.locale}`);
  const lifecycle=await page.evaluate(()=>{
    const g=window.__game,s=g.scenes.gameOver;s.removeAchievementToast();s.achievementToastQueue=[];
    s.showAchievementToast({achievement:{id:'a',name:'A'}});const banner=s.achievementToast,children=[...banner.children];
    s.showAchievementToast({achievement:{id:'a',name:'A'}});s.showAchievementToast({achievement:{id:'b',name:'B'}});s.showAchievementToast({achievement:{id:'b',name:'B'}});
    const queued=s.achievementToastQueue.map(x=>(x.achievement||x).id);
    const ticker=s.achievementToastTicker;s.removeAchievementToast();s.removeAchievementToast();
    const destroyed=Boolean(banner.destroyed)&&children.every(c=>c.destroyed),detached=!banner.parent,tickerRemoved=!s.achievementToastTicker;
    s.achievementToastQueue=[];s.showAchievementToast({achievement:{id:'expiry',name:'A'}});const expiredBanner=s.achievementToast;
    s.achievementToastTicker({deltaTime:220});const expired=!s.achievementToast&&expiredBanner.destroyed;
    return{queued,destroyed,detached,tickerRemoved,expired,score:g.score};
  });
  if(JSON.stringify(lifecycle.queued)!=='["b"]')failures.push('Duplicate active achievement requeued');
  if(!lifecycle.destroyed||!lifecycle.expired)failures.push('Achievement banner/text resources survive removal/expiry');
  if(!lifecycle.detached||!lifecycle.tickerRemoved)failures.push('Achievement ticker/container survives removal');
  if(lifecycle.score!==18160)failures.push('Presentation changed score');
  writeFileSync(`${out}/report.json`,JSON.stringify({results,longNames,lifecycle,errors,failures},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  console.log('[game-quality] PASS achievement placement, identity, expiry and GPU/text cleanup');
} finally {await browser.close();}
