import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium, _electron} from 'playwright';

const out = process.env.CHECK_OUTPUT_DIR;
const url = process.env.CHECK_URL;
const executable = process.env.PLANETFALL_NATIVE_EXE;
assert(out?.startsWith('E:') && (url || executable), 'Explicit compiled URL/executable and owned E: output required');
if (executable) assert(process.env.TEMP?.startsWith('E:'), 'Native profiles require E: TEMP');
mkdirSync(out, {recursive: true});
const browser = executable ? null : await chromium.launch({channel: 'chrome', headless: true});
let native;
const errors = [], warnings = [], rows = [];
try {
 for (const [width, height, loseContext] of [[1280, 720, false], [390, 844, false], [1280, 720, true]]) {
  if (executable) native = await _electron.launch({executablePath: executable, timeout: 120000,
   args: ['--windowed', '--nova-fresh-profile', '--nova-encounter-test=boss-snake', `--nova-qa-user-data=${process.env.TEMP}/planetfall-native-${width}-${loseContext}`],
   env: {...process.env, NOVA_SWARM_FRESH_PROFILE: '1'}});
  const page = native ? await native.firstWindow() : await browser.newPage({viewport: {width, height}});
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'warning') warnings.push(e.text()); });
  if (!native) {
   await page.addInitScript(() => { window.__novaEncounterTest = {getPreset: async () => 'boss-snake'}; });
   await page.goto(`${url}/?offlineLeaderboard=1`);
  }
  await page.waitForFunction(() => window.__game?.currentSceneName === 'shipSelect' && document.body.dataset.menuReady === '1', null, {timeout: 90000});
  if (native) {
   // Renderer startup restores display settings after the first window exists.
   await native.evaluate(({BrowserWindow}, size) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setFullScreen(false); win.unmaximize(); win.setMinimumSize(0, 0);
    win.setContentSize(size.width, size.height);
   }, {width, height});
  }
  await page.waitForFunction(size => innerWidth === size.width && innerHeight === size.height, {width, height}, {timeout: 10000});
  const viewport = await page.evaluate(() => ({width: innerWidth, height: innerHeight}));
  await page.evaluate(() => window.__game.startGame(undefined, {countShipUsage: false}));
  await page.waitForFunction(() => window.__game?.scenes.play?.enemyManager?.boss?.active && window.__game.scenes.play.introComplete && !window.__game.scenes.play.enemyManager.spawning, null, {timeout: 90000});
  const admission = await page.evaluate(async () => {
   const g = window.__game, s = g.scenes.play, m = s.enemyManager;
   g.app.ticker.stop();
   if (!g.runPolicy.prototype || Object.entries(g.runPolicy).some(([k, v]) => k.startsWith('allow') && v)) throw Error('Unsafe release fixture');
   m.clearEnemies(); m.clearPendingWaveSpawns(); s.firstLightDirector?.cancel('compiled-foundry');
   m.mysteryDirector?.clear?.(); if (m.mysteryDirector) m.mysteryDirector.plan = null;
   if (m.environment?.active) m.environment.destroy();
   // The bootstrap boss preset is ineligible for normal admission. Keep its
   // immutable no-progression policy, but remove only the selection override.
   g.encounterTest = null; g.encounterEvolutionTest = null; g.encounterPacing = null; g.lastDreadnoughtSector = null;
   g.level = m.level = 18; m.state = 'BOSS_ACTIVE'; m.phase = 'BOSS';
   const started = performance.now(), b = await m.spawnBoss(18), admissionMs = performance.now() - started;
   s.bossIntroActive = false; s.activeBossIntroCard?.destroy({children: true}); s.activeBossIntroCard = null;
   s.clearToastState(); s.applyGameplayViewportTransform();
   if (!b?.isPlanetfall || !b.visual.foundry?.ready) throw Error('Compiled eligible factory lacks current Three.js presentation: ' + JSON.stringify({planetfall: b?.isPlanetfall, id: b?.profile?.id, foundry: !!b?.visual?.foundry, ready: b?.visual?.foundry?.ready, pacing: g.encounterPacing, elapsed: g.runElapsedSeconds}));
   for (let i = 0; i < 210; i++) b.update(1);
   b.clearOwnedShots(); s.bulletManager.clearAll('compiled-foundry'); s.hud.update(); g.app.render();
   window.__releaseFoundry = {b, v: b.visual.foundry};
   const pixels = b.visual.foundry.context.getImageData(0, 0, b.visual.foundry.canvas.width, b.visual.foundry.canvas.height).data;
   let visible = 0; for (let i = 3; i < pixels.length; i += 64) if (pixels[i] > 32) visible++;
   return {admitted: g.encounterPacing.planetfallSector, id: b.profile.id, visible, admissionMs, frameSections: b.visual.foundry.frameSections.length};
  });
  assert.equal(admission.admitted, 18); assert.equal(admission.id, 'planetfall');
  assert(admission.visible > 300); assert.equal(admission.frameSections, 8);
  await page.screenshot({path: path.join(out, `combat-${width}-${loseContext}.png`)});
  const collapse = await page.evaluate(async loseContext => {
   const g = window.__game, s = g.scenes.play, m = s.enemyManager, {b, v} = window.__releaseFoundry;
   const before = {score: g.score, kills: s.totalKills}, owned = v.renderer.getContext(), main = g.app.canvas.getContext('webgl2');
   b.hitComponent(b.components[4], b.maxHealth);
   const effect = b.collapse;
   if (!effect || effect.foundry !== v) throw Error('Collapse ownership was not transferred');
   if (loseContext) { owned.getExtension('WEBGL_lose_context').loseContext(); await new Promise(resolve => setTimeout(resolve, 100)); }
   const cpu = [], frames = [], costs = [];
   let last, paused = false, fallback = false;
   await new Promise(resolve => {
    const frame = t => {
     if (last !== undefined) frames.push(t - last); last = t;
     const start = performance.now(), age = effect.age; effect.update(1); const updated = performance.now(); g.app.render(); const end = performance.now();
     cpu.push(end - start); costs.push({frame: cpu.length, age, update: updated - start, render: end - updated, total: end - start});
     if (cpu.length === 1) fallback = !effect.foundrySprite.visible && effect.fragments.every(p => p.sprite.visible);
     if (cpu.length === 30) {
      s.isPaused = true; const age = effect.age; effect.update(60); paused = effect.age === age; s.isPaused = false;
     }
     if (effect.done) resolve(); else requestAnimationFrame(frame);
    }; requestAnimationFrame(frame);
   });
   await new Promise(resolve => setTimeout(resolve, 100));
   m.bossSpawnedAtMs = Date.now(); m.update(1);
   const victory = {state: m.state, kills: s.totalKills - before.kills, score: g.score - before.score, discovered: s.defeatedBossIds.includes('planetfall')};
   const stats = values => { const a = [...values].sort((x, y) => x - y); return {n: a.length, first: values[0], p95: a[Math.floor(a.length * .95)], p99: a[Math.floor(a.length * .99)], max: a.at(-1), over50: a.filter(x => x > 50).length}; };
   const result = {victory, paused, fallback, cpu: stats(cpu), raf: stats(frames), slowest: costs.sort((a,b) => b.total-a.total).slice(0,8), done: effect.done, disposed: v.disposed, released: owned.isContextLost(), mainAlive: !main.isContextLost(), effects: m.breachCollapses.size};
   m.clearEnemies(); m.clearPendingWaveSpawns(); g.level = m.level = 19;
   const next = await m.spawnBoss(19); result.noRepeat = !next.isPlanetfall; m.clearEnemies(); m.clearPendingWaveSpawns();
   return result;
  }, loseContext);
  rows.push({width, height, viewport, loseContext, admission, collapse});
  writeFileSync(path.join(out, 'report.json'), JSON.stringify({status: 'running', rows, errors, warnings}, null, 2));
  assert(collapse.paused && collapse.done && collapse.disposed && collapse.released && collapse.mainAlive && collapse.noRepeat);
  assert.equal(collapse.effects, 0); assert.equal(collapse.victory.kills, 1); assert(collapse.victory.score > 0 && collapse.victory.discovered);
  assert.equal(collapse.victory.state, 'LEVEL_COMPLETE'); if (loseContext) assert(collapse.fallback);
  if (!loseContext) assert(collapse.cpu.p99 < 25 && collapse.cpu.max < 50, `Investigate cold collapse frame cost: ${JSON.stringify(collapse.cpu)}`);
  console.log(JSON.stringify(rows.at(-1)));
  if (native) { await native.close(); native = null; } else await page.close();
 }
 assert.deepEqual(errors, []);
 writeFileSync(path.join(out, 'report.json'), JSON.stringify({status: 'pass', rows, errors, warnings, scope: 'Current compiled normal factory at controlled sector18; actual Three/Pixi pixels, first collapse including transparency shader transitions, pause, context loss, once-only victory and next-sector admission. Not an unforced campaign or target-hardware performance guarantee.'}, null, 2));
} finally {
 writeFileSync(path.join(out, 'diagnostics.json'), JSON.stringify({rows, errors, warnings}, null, 2));
 await native?.close(); await browser?.close();
}
