import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const out='test-results/astra-v2-regressions';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.route('**/*',r=>/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4399'}/?offlineLeaderboard=1`);
  await page.waitForFunction(()=>window.__game?.scenes?.menu?.runModeInfoTiles,null,{timeout:120000});
  const result=await page.evaluate(async()=>{
    const i18n=await import('/src/i18n/index.js');
    const {GameAssets}=await import('/src/utils/GameAssets.js');
    const {AssetManifest}=await import('/src/assets/assetManifest.js');
    const menu=window.__game.scenes.menu;
    menu.isNewPilot=false;
    menu.layoutMenu();
    // Reuse one visible tile container and identical English source data across
    // a live language switch: the cached-signature regression trigger.
    const options={tiles:[{label:'RANKING',value:'UNRANKED'},{label:'ROUTE',value:'SECTOR 1'}],x:400,y:400,width:420,height:100,accent:0x37f5ff,secondary:0xff55d9,compactScale:1};
    await i18n.setLanguagePreference('de');menu.layoutRunModeInfoTiles(options.tiles,options);
    const german=menu.runModeInfoTileItems.map(n=>({label:n._nodes.label.text,value:n._nodes.value.text}));
    await i18n.setLanguagePreference('zh-CN');menu.layoutRunModeInfoTiles(options.tiles,options);
    const chinese=menu.runModeInfoTileItems.map(n=>({label:n._nodes.label.text,value:n._nodes.value.text}));
    const expected=options.tiles.map(t=>({label:i18n.translateText(t.label),value:i18n.translateText(t.value)}));
    const sprite=GameAssets.createDeferredSprite(AssetManifest.sprites.rankPresentation.endlessHalo);
    sprite.width=137;sprite.height=137;
    await new Promise(r=>setTimeout(r,800));
    const halo={width:sprite.width,height:sprite.height,textureWidth:sprite.texture.width};sprite.destroy();
    return{german,chinese,expected,halo};
  });
  await page.screenshot({path:`${out}/german-to-chinese.png`});
  assert.notDeepEqual(result.german,result.chinese);
  assert.deepEqual(result.chinese,result.expected);
  assert.equal(result.halo.width,137);assert.equal(result.halo.height,137);assert.ok(result.halo.textureWidth>1);
  assert.deepEqual(errors,[]);
  writeFileSync(`${out}/report.json`,JSON.stringify({ok:true,...result,errors},null,2));
  console.log('PASS: live German-to-Chinese tile switch; lazy halo load preserves layout size; no page errors.');
} finally{await browser.close();}
