import assert from 'node:assert/strict';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const out = process.env.CHECK_OUTPUT_DIR;
assert(out?.startsWith('E:') && process.env.CHECK_URL);
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const errors = [], rows = [], failures = [];
const locales = process.env.CHECK_LOCALES?.split(',') || ['en', 'de', 'es', 'pt-BR', 'ru', 'zh-CN', 'ko', 'ja'];
const uiScale = Number(process.env.CHECK_UI_SCALE || 1);
const activeTools = process.env.CHECK_ACTIVE_TOOLS === '1';
try {
 const page = await browser.newPage();
 page.on('pageerror', e => errors.push(e.message));
 await page.route('**/*', route => /^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(route.request().url()) ? route.continue() : route.abort());
 if (process.env.CHECK_HUD_BASELINE) await page.route('**/src/ui/HUD.js*', async route => {
  const current = await (await route.fetch()).text();
  const pixiImport = current.split('\n').find(line => line.startsWith('import * as PIXI from '));
  assert(pixiImport, 'Vite Pixi import missing');
  const baseline = readFileSync(process.env.CHECK_HUD_BASELINE, 'utf8');
  assert(baseline.startsWith("import * as PIXI from 'pixi.js';"));
  await route.fulfill({contentType: 'text/javascript', body: baseline.replace("import * as PIXI from 'pixi.js';", pixiImport)});
 });
 for (const locale of locales) {
  const sizes = process.env.CHECK_SIZES ? JSON.parse(process.env.CHECK_SIZES) : process.env.CHECK_QUICK ? [[390, 844]] : [[390, 844], [320, 780], [600, 960], [1280, 720], [1920, 1080]];
  for (const [width, height] of sizes) {
   await page.setViewportSize({width, height});
   if (width === sizes[0][0]) {
    await page.goto(process.env.CHECK_URL + '/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall');
    await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.boss?.isPlanetfall, null, {timeout: 90000});
   }
   await page.waitForFunction(width => window.__game.getWidth() === width, width, {timeout: 10000});
   const state = await page.evaluate(async ({locale, uiScale, activeTools}) => {
    const g = window.__game, s = g.scenes.play, h = s.hud, b = s.enemyManager.boss;
    assertSafe();
    function assertSafe() { if (!g.runPolicy.prototype || g.runPolicy.allowGlobalLeaderboard) throw Error('Unsafe test policy'); }
    const {setLanguagePreference} = await import('/src/i18n/index.js'); await setLanguagePreference(locale);
    g.app.ticker.stop(); s.introActive = false; s.introComplete = true; s.bossIntroActive = false;
    s.activeBossIntroCard?.destroy({children: true}); s.activeBossIntroCard = null; s.clearToastState(); s.gameTime = 30;
    g.score = 987654321; g.lives = 1; g.scoreMultiplier = 4;
    g.getHighscoreChaseState = () => ({targetScore: 999999999, runMode: 'ranked'});
    g.getGlobalRivalChaseState = () => null;
    s.comboCount = 8; s.comboMultiplier = 3; s.comboTimerMs = 1500; s.comboWindowMs = 2000;
    const {TACTICAL_DRAFT_AUGMENTS} = await import('/src/config/TacticalDraft.js');
    s.player.runAugmentIds = TACTICAL_DRAFT_AUGMENTS.slice(0, 14).map(a => a.id);
    if (activeTools) {
     s.player.getActivePowerupStates = () => [
      {type: 'shield', label: 'SHIELD', remainingMs: 6500, durationMs: 10000, color: 0x66ffff, category: 'defense'},
      {type: 'rapid_fire', label: 'RAPID FIRE', remainingMs: 2500, durationMs: 8000, color: 0xff9a44, category: 'offense'}
     ];
     s.player.getTraitState = () => ({label: 'PULSE', experimentalPulse: {available: true, remainingMs: 1200, rechargeMs: 2000}});
    }
    for (let n = 0; n < 205; n++) b.update(1);
    localStorage.setItem('nova_ui_scale_v1', String(uiScale));
    const {getCurrentLayout, applyResponsiveLayout} = await import('/src/ui/responsiveLayout.js');
    applyResponsiveLayout(innerWidth, innerHeight);
    const worldBefore = {x: s.gameContainer.x, y: s.gameContainer.y, scale: s.gameContainer.scale.x};
    h.applyLayout(getCurrentLayout()); h.update(); h.update(); g.app.render();
    const rect = o => { const r = o.getBounds(); return {x: r.x, y: r.y, width: r.width, height: r.height}; };
    const controls = ['joystick-hint', 'autofire-hint'].map(id => document.getElementById(id)).filter(Boolean)
     .map(el => {const r = el.getBoundingClientRect(); return {id: el.id, x: r.x, y: r.y, width: r.width, height: r.height};});
    return {locale, uiScale, activeTools, viewport: {width: innerWidth, height: innerHeight}, worldBefore,
     playfield: s.getActivePlayfieldRect(), controls,
     bounds: Object.fromEntries(['rankGroup','scoreText','scoreMultiplierText','comboMeterGroup','livesGroup','highscoreChaseGroup','tacticalAugmentGroup','activePowerupGroup','traitGroup'].filter(k => h[k].visible).map(k => [k, rect(h[k])])),
     mission: {...h.missionPanel.__layout}, tray: h.tacticalAugmentGroup._debugTacticalAugments,
     chaseText: ['highscoreChaseTitle','highscoreChaseTarget','highscoreChaseGap','highscoreChaseBarBg'].map(k => ({name: k, ...rect(h[k])})),
     world: {x: s.gameContainer.x, y: s.gameContainer.y, scale: s.gameContainer.scale.x},
     texts: [h.scoreText.text, h.livesText.text, h.locationText.text, h.missionText.text], policy: g.runPolicy};
   }, {locale, uiScale, activeTools});
   assert.deepEqual(state.world, state.worldBefore, 'HUD updates changed world geometry');
   if (process.env.CHECK_TIMING === '1') state.hudUpdateCpuMs = await page.evaluate(() => {
    const hud = window.__game.scenes.play.hud, samples = [];
    for (let i = 0; i < 660; i++) {
     const start = performance.now(); hud.update();
     if (i >= 60) samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    return {count: samples.length, p50: samples[300], p95: samples[570], p99: samples[594], max: samples.at(-1), mean: samples.reduce((a,b) => a+b,0)/samples.length};
   });
   rows.push(state);
   await page.screenshot({path: path.join(out, `${locale}-${width}.png`)});
   const overlaps = (a, b) => a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;
   const bounds = {...state.bounds, mission: state.mission};
   if (process.env.CHECK_LETTERBOX === '1' && width < 720) {
    const panels = ['activePowerupGroup','traitGroup'].map(k => bounds[k]).filter(Boolean);
    const panelHeight = panels.reduce((sum, r) => sum + r.height + 8, 0);
    const controlTop = Math.min(height - 14, ...state.controls.map(r => r.y));
    if (state.playfield.y + state.playfield.height + panelHeight + 16 <= controlTop) {
     for (const r of panels) if (overlaps(r, state.playfield)) failures.push({locale, width, type: 'unused-letterbox', r});
    }
   }
   const chase = state.chaseText;
   for (let i = 0; i < chase.length; i++) for (let j = i + 1; j < chase.length; j++) {
    if (overlaps(chase[i], chase[j])) failures.push({locale, width, type: 'chase-overlap', a: chase[i], b: chase[j]});
   }
   if (state.tray.visibleEntries.length + state.tray.hiddenCount !== state.tray.uniqueCount) failures.push({locale, width, type: 'lost-upgrade-count'});
   for (const [name, r] of Object.entries(bounds)) {
    if (r.x < -1 || r.x + r.width > width + 1 || r.y < -1 || r.y + r.height > height + 1) failures.push({locale, width, type: 'outside', name, r});
   }
   for (const [a, b] of [['rankGroup','livesGroup'], ['scoreText','livesGroup'], ['scoreText','rankGroup'], ['scoreText','comboMeterGroup'], ['scoreMultiplierText','comboMeterGroup'], ['highscoreChaseGroup','mission'], ['tacticalAugmentGroup','mission'], ...['activePowerupGroup','traitGroup'].flatMap(a => ['mission','highscoreChaseGroup','tacticalAugmentGroup','scoreText','comboMeterGroup'].map(b => [a,b])), ['activePowerupGroup','traitGroup']]) {
    if (bounds[a] && bounds[b] && overlaps(bounds[a], bounds[b])) failures.push({locale, width, type: 'overlap', a, b, bounds: [bounds[a], bounds[b]]});
   }
   console.log(JSON.stringify({locale, width, failures: failures.filter(f => f.locale === locale && f.width === width)}));
  }
 }
} finally {
 await browser.close();
 writeFileSync(path.join(out, 'report.json'), JSON.stringify({status: failures.length || errors.length ? 'failed' : 'passed', rows, failures, errors, scope: 'Controlled unranked actual-renderer HUD geometry and screenshots, not a natural campaign.'}, null, 2));
}
assert.deepEqual(errors, []); assert.deepEqual(failures, []);
