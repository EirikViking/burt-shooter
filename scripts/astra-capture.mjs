import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
const label = process.argv[2] || 'baseline';
const out = path.resolve('test-results', `astra-${label}`);
mkdirSync(out, { recursive: true });
const base = process.env.ASTRA_URL || 'http://127.0.0.1:4399/';
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.route('**/*', route => {
  const url=route.request().url();
  // Transport-only adapter for the starting checkout's broken Vite CJS import.
  // The policy implementation is byte-for-byte unchanged; only export syntax differs.
  if(url.includes('/electron/pilotNamePolicy.cjs')) return route.fulfill({contentType:'text/javascript',body:readFileSync('electron/pilotNamePolicy.cjs','utf8').replace(/exports\.(\w+) = \1;/g,'export { $1 };')});
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url) || /^(data|blob):/.test(url) ? route.continue() : route.abort();
});
const page = await context.newPage();
const report = { label, viewport: [1280,720], captures: [], errors: [], performance: [] };
page.on('pageerror', e => report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log(m.type(),m.text().slice(0,320));});
page.on('requestfailed',r=>console.log('requestfailed',r.url().slice(0,180),r.failure()));
async function open(params={}) {
  const url = new URL(base);
  for (const [k,v] of Object.entries({ offlineLeaderboard: '1', seed: '1290904', ...params })) url.searchParams.set(k,v);
  const start = Date.now();
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => window.__game && window.render_game_to_text, null, { timeout: 90000 }).catch(async e=>{await page.screenshot({path:path.join(out,'load-failure.png')});console.log(await page.locator('body').innerText(),report.errors);throw e;});
  if(params.autostart) await page.waitForFunction(() => {const p=window.__game?.scenes?.play;return p?.player?.shipSprite?.texture && p?.gameplayBackdrop && p?.enemyManager?.state!=='IDLE';}, null, { timeout: 120000 });
  report.performance.push({stage:params.startLevel || 'opening', loadMs:Date.now()-start});
}
async function shot(name) {
  await page.screenshot({path:path.join(out,`${name}.png`)});
  report.captures.push({name, state:await page.evaluate(()=>JSON.parse(window.render_game_to_text()))});
  writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(name);
}
async function measure(name, ms=6000) {
  const result=await page.evaluate(async ms=>{
    const frames=[]; let last=performance.now(); const start=last;
    await new Promise(resolve=>{function frame(now){frames.push(now-last);last=now;if(now-start<ms)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
    frames.shift();frames.sort((a,b)=>a-b);
    return {frames:frames.length,medianMs:frames[Math.floor(frames.length*.5)],p95Ms:frames[Math.floor(frames.length*.95)],p99Ms:frames[Math.floor(frames.length*.99)],heapMB:performance.memory?.usedJSHeapSize/1048576,perf:window.__perfStats};
  },ms); report.performance.push({name,...result});
}
try {
  await open();
  await page.waitForFunction(()=>window.__game?.scenes?.menu?.backdrop?.texture,null,{timeout:120000}); await page.waitForTimeout(1400); await shot('01-menu');
  await open({autostart:'1'}); await page.waitForTimeout(2500); await shot('02-opening');
  await page.keyboard.down('Space'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.up('ArrowRight');
  await measure('ordinary'); await page.keyboard.up('Space'); await shot('03-combat');
  await page.keyboard.press('p'); await page.waitForTimeout(300); await shot('04-pause');
  await open({autostart:'1',debugBossToken:'NOVA_DEBUG_2026',startLevel:'30','nova-devtools-hash':'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c'});
  await page.evaluate(()=>{const p=window.__game.scenes.play.player;p.invulnerable=true;p.invulnerableTime=120000;});
  await page.waitForTimeout(5000); await measure('dense'); await shot('05-dense');
  await open({autostart:'1',debugBossToken:'NOVA_DEBUG_2026',startAtBoss:'1',startLevel:'1','nova-devtools-hash':'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c'});
  await page.waitForFunction(()=>window.__game.scenes.play.enemyManager?.state==='BOSS_ACTIVE',null,{timeout:45000});
  await page.evaluate(()=>{const p=window.__game.scenes.play.player;p.invulnerable=true;p.invulnerableTime=120000;});
  await page.waitForTimeout(2500); await shot('06-boss'); await measure('boss');
  await page.evaluate(()=>{const b=window.__game.scenes.play.enemyManager.boss;b.invulnerableUntilMs=0;b.minimumFightMs=0;b.finishGateUntilMs=0;b.takeDamage(b.maxHealth+9999);});
  await page.waitForTimeout(180); await shot('07-destruction');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).tacticalDraft?.active,null,{timeout:30000});
  await page.waitForTimeout(800); await shot('08-reward');
  await open({autostart:'1'}); await page.waitForTimeout(2000);
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play.player;g.lives=1;p.invulnerable=false;p.invulnerableTime=0;p.takeDamage?.();if(g.currentScene!==g.scenes.gameOver)g.gameOver();});
  await page.waitForTimeout(1300); await shot('09-death');
} finally {writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
