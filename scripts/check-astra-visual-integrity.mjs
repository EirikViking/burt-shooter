import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { AssetManifest } from '../src/assets/assetManifest.js';

const registrations=JSON.parse(readFileSync('docs/astra-models/registration.json','utf8'));
assert.equal(registrations.length,75);
for(const row of registrations) {
  assert.equal(row.baseline.width,row.candidate.width);
  assert.equal(row.baseline.height,row.candidate.height);
  for(const key of ['left','top','width','height']) assert.ok(Math.abs(row.baseline.box[key]-row.candidate.box[key])<=1,`${row.family}/${row.file}: alpha registration ${key}`);
}
for(const [list,count] of [[AssetManifest.generated.playerShips.slice(0,25),25],[AssetManifest.generated.enemies.slice(0,50),50]]) {
  assert.equal(new Set(list.map(p=>createHash('sha256').update(readFileSync(`public${p}`)).digest('hex'))).size,count,'Every modeled hull has distinct artwork');
}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720}});
await context.route('**/*',route=>/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(route.request().url())?route.continue():route.abort());
const page=await context.newPage();
try {
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4399'}/?autostart=1&offlineLeaderboard=1`);
  await page.waitForFunction(()=>{const p=window.__game?.scenes?.play;return p?.player?.shipSprite?.texture?.source?.resource && p.enemyManager?.state==='WAVE_ACTIVE';},null,{timeout:120000});
  const result=await page.evaluate(async()=>{
    const {HullBreakup}=await import('/src/effects/HullBreakup.js');
    const {shadeHullPixels,astraMaterialStats}=await import('/src/effects/AstraHullMaterial.js');
    const {setReducedMotionEnabled}=await import('/src/config/AccessibilitySettings.js');
    const game=window.__game;game.app.ticker.stop();
    const player=game.scenes.play.player;
    const layer=new player.sprite.constructor();
    const fragments=new HullBreakup(layer);
    const enemy={body:player.shipSprite,sprite:player.sprite,x:200,y:200,radius:18};
    const rng=Math.random;let calls=0;Math.random=()=>{calls++;throw new Error('Presentation consumed gameplay RNG');};
    try {
      setReducedMotionEnabled(false);
      fragments.emit(enemy);fragments.emit(enemy);
      const duplicateCount=fragments.active.length;
      for(let i=0;i<40;i++)fragments.emit({...enemy});
      const peak=fragments.active.length;
      fragments.update(39);
      const retired=fragments.active.length,pooled=fragments.pool.length;
      setReducedMotionEnabled(true);fragments.emit({...enemy});
      const reducedMotionCount=fragments.active.length;
      const pixels=new Uint8ClampedArray([7,40,70,255,90,80,20,120,255,80,50,0,30,20,120,255]);
      const graded=shadeHullPixels(pixels,2,2),again=shadeHullPixels(pixels,2,2);
      return {duplicateCount,peak,retired,pooled,reducedMotionCount,rngCalls:calls,
        alphaPreserved:[3,7,11,15].every(i=>pixels[i]===graded[i]),deterministic:graded.every((v,i)=>v===again[i]),materialStats:astraMaterialStats};
    } finally {Math.random=rng;layer.destroy({children:true});}
  });
  mkdirSync('test-results/astra-integrity',{recursive:true});writeFileSync('test-results/astra-integrity/report.json',JSON.stringify({registeredHulls:75,...result},null,2));
  assert.equal(result.duplicateCount,4);assert.equal(result.peak,40);assert.equal(result.retired,0);assert.equal(result.pooled,40);assert.equal(result.reducedMotionCount,0);assert.equal(result.rngCalls,0);assert.ok(result.alphaPreserved&&result.deterministic);assert.equal(result.materialStats.failures,0);
  console.log('[astra-visual-integrity] PASS 75 registered unique hulls; alpha and RNG preserved; debris capped, deduplicated, retired and reduced-motion aware');
} finally {await browser.close();}
