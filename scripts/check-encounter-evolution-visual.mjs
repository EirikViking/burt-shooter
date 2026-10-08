import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const rows=[],errors=[];
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4895'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
  await page.waitForFunction(()=>window.__game?.scenes?.play?.firstLightDirector?.view,null,{timeout:90000});
  await page.evaluate(()=>window.__game.app.ticker.stop());
  for(const language of ['en','de','es','ru','zh-CN','pt-BR','ko','ja']){
    for(const compact of [false,true]){
      await page.setViewportSize(compact?{width:800,height:600}:{width:1280,height:720});
      await page.evaluate(code=>window.__novaI18n.setLanguagePreference(code),language);
      await page.waitForTimeout(200);
      const fixture=await page.evaluate(async()=>{
        const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;
        const {setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
        setReducedMotionEnabled(true);setFlashIntensityScale(0);
        m.forceClearAllEnemies();s.bulletManager.clearAll('visual-fixture');
        const {FirstLightModel}=await import('/src/game/ArcadeFirstLight.js');
        d.model=new FirstLightModel('visual-wing');d.event=null;
        const run=(sector,n)=>{for(let i=0;i<n;i++)d.model.update(1/60,{sector,safe:true,combat:true});};
        run(1,320);d.model.hit('left',100,{});d.model.hit('right',100,{});run(1,670);run(2,420);
        d.view.update(d.model,0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,{});d.syncVisibility();
        g.app.render();
        return {payback:d.model.payback.status,identity:d.model.payback.identity};
      });
      assert.equal(fixture.payback,'active');
      const suffix=`${language}-${compact?'compact':'desktop'}`;
      await page.screenshot({path:path.join(out,`${suffix}-payback.png`)});
      const help=await page.evaluate(async()=>{
        const g=window.__game;
        const {HowToPlayOverlay}=await import('/src/ui/HowToPlayOverlay.js');
        const overlay=new HowToPlayOverlay(g);g.app.stage.addChild(overlay.container);
        overlay.setPage(overlay.getDebugState().pages.findIndex(p=>p.id==='encounters'));
        window.__evolutionHelp=overlay;g.app.render();return overlay.getDebugState();
      });
      assert.equal(help.cardCount,4);assert.equal(help.layout.layoutWarnings.length,0);
      for(const card of help.cards)assert(!/TODO|MISSING|FALLBACK/.test(card.translatedTip));
      await page.screenshot({path:path.join(out,`${suffix}-help.png`)});
      for(const code of ['34','35']){
        const audit=await page.evaluate(code=>{
          const g=window.__game,o=window.__evolutionHelp;
          o.openDetail(o.cards.find(c=>c._helpRow.code===code)._helpRow);g.app.render();
          const failures=[];
          const visit=n=>{if(n.visible===false)return;if(n.text){const r=n.getBounds();
            if(r.x< -2||r.y< -2||r.x+r.width>g.getWidth()+2||r.y+r.height>g.getHeight()+2)failures.push(String(n.text));}
            for(const c of n.children||[])visit(c);};visit(o.detailContainer);
          return {failures,detail:o.getDebugState().detail};
        },code);
        assert.deepEqual(audit.failures,[],`${suffix} detail ${code}`);
        await page.screenshot({path:path.join(out,`${suffix}-detail-${code}.png`)});
      }
      await page.evaluate(()=>{window.__evolutionHelp.close();window.__evolutionHelp=null;});
      rows.push({language,compact,fixture,help});
    }
  }
  assert.deepEqual(errors,[]);
  writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',conditions:'8 languages, 1280x720 and 800x600; Reduced Motion on and Flash Intensity zero; screenshots require human glyph/readability review',rows,errors},null,2));
  console.log('[encounter-evolution-visual] PASS 16 language/layout cases');
}finally{await browser.close();}
