import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const out = process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\', '/').startsWith('E:/Codex/'), 'Owned E: output required');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], errors = [];
const compiled = process.env.CONTACT_NOTICE_COMPILED === '1';
const expectDeferred = process.env.CONTACT_NOTICE_EXPECT_DEFER !== '0';
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /game loop|uncaught|TypeError|ReferenceError/i.test(message.text())) errors.push(message.text()); });
  if (compiled) await page.addInitScript(() => { window.__novaEncounterTest = { getPreset: async () => 'boss-snake' }; });
  await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:4983'}/${compiled ? '?offlineLeaderboard=1' : '?autostart=1&offlineLeaderboard=1&encounterEvolution=molt'}`);
  if (compiled) {
    await page.waitForFunction(() => window.__game?.currentSceneName === 'shipSelect' && document.body.dataset.menuReady === '1', null, { timeout: 120000 });
    await page.evaluate(() => window.__game.startGame(undefined, { countShipUsage: false }));
    await page.waitForFunction(() => window.__game?.scenes.play?.enemyManager?.boss?.active && window.__game.scenes.play.introComplete && !window.__game.scenes.play.levelStartWarmupPending, null, { timeout: 120000 });
    await page.evaluate(() => {
      const g = window.__game, s = g.scenes.play;
      if (!g.runPolicy.prototype || Object.entries(g.runPolicy).some(([k, v]) => k.startsWith('allow') && v)) throw Error('Unsafe compiled fixture');
      g.app.ticker.stop(); s.enemyManager.clearEnemies(); s.clearBossHazards('contact-notice-fixture');
      g.encounterEvolutionTest = { id: 'natural', seed: 'contact-notice-fixture' };
      s.firstLightDirector.enabled = true; s.firstLightDirector.loadArt();
    });
    await page.waitForFunction(() => window.__game?.scenes.play?.firstLightDirector?.view, null, { timeout: 90000 });
  } else await page.waitForFunction(() => window.__game?.scenes?.play?.firstLightDirector?.localTestChain, null, { timeout: 90000 });
  await page.evaluate(() => window.__game.app.ticker.stop());
  const isolation = await page.evaluate(() => ({ prototype: window.__game.runPolicy.prototype,
    permissions: Object.entries(window.__game.runPolicy).filter(([key, value]) => key.startsWith('allow') && value) }));
  const version = await page.evaluate(async () => (await (await fetch('/version.json', { cache: 'no-store' })).json()).version);
  assert(isolation.prototype); assert.equal(isolation.permissions.length, 0);
  const cases = [1, 2, 51, 401].flatMap(sector => ['convoy', 'rival'].map(kind => ({ sector, kind })));
  // Recipe integration is checked through source definitions; compiled tests use
  // only constructors available in the delivered payload, without source imports.
  if (!compiled) for (const surprise of ['twin-jailers', 'crossed-chains', 'prisoner-exchange', 'last-shuttle',
    'convoy-split', 'shielded-evacuation', 'stolen-callsign', 'rescue-tow']) cases.push({ sector: 3, kind: 'convoy', surprise });
  for (const fixture of cases) {
    const { sector, kind } = fixture;
    const row = await page.evaluate(async ({ sector, kind, surprise, compiled }) => {
      const g = window.__game, s = g.scenes.play, d = s.firstLightDirector, m = s.enemyManager;
      const FirstLightModel = compiled ? d.model.constructor : (await import('/src/game/ArcadeFirstLight.js')).FirstLightModel;
      s.clearToastState(); s.bulletManager.clearAll('notice-fixture');
      m.enemies = []; m.state = 'WAVE_ACTIVE'; m.phase = 'WAVES'; m.waveEnding = false;
      m.waves = []; m.challengeFlightState = null; m.discoveryEncounter = null; m.environment = null;
      m.boss = null; m.hijacker = null; m.mysteryDirector = null; m.mayhemReinforcementState = null;
      s.introComplete = true; s.introActive = false; s.isPaused = false; g.level = sector;
      d.model = new FirstLightModel('contact-notice-fixture');
      for (let i = 0; i < 70; i++) d.model.update(.1, { sector: kind === 'convoy' ? 1 : 2, safe: true });
      d.event = d.model.encounter; d.event.age = 3; d.event.sector = sector;
      if (surprise) Object.assign(d.event, (await import('/src/game/ConvoySurprises.js')).makeConvoySurprise(surprise));
      d.view.root.visible = true;
      d.view.update(d.model, .1, s.gameplayGame.getWidth(), s.gameplayGame.getHeight(), s.player);
      const original = { score: g.score, lives: g.lives, hp: { ...d.event.hp } };
      s.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN' });
      const initiallyVisible = s.activeTopToast?.__toastMeta?.type === 'tacticalDirective';
      d.update(1); s.processToastQueue();
      const cleared = !s.activeTopToast;
      s.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN' });
      s.processToastQueue();
      const deferred = !s.activeTopToast && s.toastTopQueue.some(e => e.options.type === 'tacticalDirective');
      const expiry = s.toastTopQueue.find(e => e.options.type === 'tacticalDirective')?.expiresAt;
      for (let i = 0; i < 80; i++) { d.update(1); s.processToastQueue(); }
      const bounded = s.toastTopQueue.filter(e => e.options.type === 'tacticalDirective').length <= 1
        && s.toastTopQueue.every(e => e.expiresAt <= expiry);
      s.enqueueToast('BOSS WEAPON HIT', { type: 'boss_phase', priority: 8, duration: 1100 });
      s.processToastQueue();
      const dangerVisible = s.activeTopToast?.__toastMeta?.type === 'boss_phase';
      const unchanged = original.score === g.score && original.lives === g.lives
        && JSON.stringify(original.hp) === JSON.stringify(d.event.hp);
      s.clearToastState();
      d.update(1); s.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN' });
      for (const e of s.toastTopQueue) e.expiresAt = Date.now() - 1;
      s.processToastQueue();
      const staleDropped = !s.toastTopQueue.length && !s.activeTopToast;
      // Leave the actual rival visible for a screenshot with the directive held.
      s.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN' });
      d.update(1); s.processToastQueue(); g.app.render();
      return { sector, kind, surprise, initiallyVisible, cleared, deferred, bounded, dangerVisible, unchanged, staleDropped,
        contactAlpha: d.view.contact.alpha, permissions: Object.entries(g.runPolicy).filter(([k, v]) => k.startsWith('allow') && v) };
    }, { ...fixture, compiled });
    checks.push(row);
    if (sector === 2 && kind === 'rival') await page.screenshot({ path: path.join(out, 'rival-directive.png') });
  }
  const performanceEvidence = process.env.CONTACT_NOTICE_PERF === '1' ? await page.evaluate(async () => {
    const g = window.__game, s = g.scenes.play, d = s.firstLightDirector;
    const samples = [], gaps = [];
    s.clearToastState(); s.bulletManager.clearAll('contact-notice-performance');
    const Bullet = s.player.shoot()[0].constructor;
    for (let i = 0; i < 160; i++) s.bulletManager.addEnemyBullet(new Bullet(70 + i % 20 * 88, 145 + Math.floor(i / 20) * 58, 0, .2, 1, 0xff795a, false));
    s.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN' });
    const before = JSON.stringify({ score: g.score, lives: g.lives, hp: d.event.hp });
    const step = () => {
      // Fixed live hull with real rendering and held notice; no attacks or collision simulation.
      d.event.age = 3; d.attackTimers.left = 100; d.attackTimers.right = 100;
      const start = performance.now(); d.update(1); s.processToastQueue();
      s.updateStarfield(1); g.app.render(); return performance.now() - start;
    };
    for (let i = 0; i < 600; i++) { const elapsed = step(); if (i >= 120) samples.push(elapsed); }
    let last, warm = 60;
    await new Promise(resolve => {
      const frame = at => {
        if (last != null && warm-- <= 0) gaps.push(at - last);
        last = at; step(); if (gaps.length >= 180) resolve(); else requestAnimationFrame(frame);
      }; requestAnimationFrame(frame);
    });
    const stats = values => { const a = [...values].sort((a, b) => a - b); return { n: a.length,
      p50: a[Math.floor(a.length * .5)], p95: a[Math.floor(a.length * .95)], p99: a[Math.floor(a.length * .99)], max: a.at(-1), over50: a.filter(x => x > 50).length }; };
    return { cpu: stats(samples), raf: stats(gaps), unchanged: before === JSON.stringify({ score: g.score, lives: g.lives, hp: d.event.hp }),
      bullets: s.bulletManager.enemyBullets.length, version: document.querySelector('meta[name="build-version"]')?.content || null };
  }) : null;
  const release = await page.evaluate(async () => {
    const g = window.__game, s = g.scenes.play, d = s.firstLightDirector;
    s.clearToastState(); d.update(1); s.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN' });
    const heldUntil = s.routineFocusLaneBlockUntil;
    s.isPaused = true; d.update(60);
    const pauseStable = s.routineFocusLaneBlockUntil === heldUntil;
    s.isPaused = false;
    d.event.suspended = true;
    // A headline owns visibility; the existing scene reset clears all holds.
    d.cancel('test-contact-ended');
    await new Promise(resolve => setTimeout(resolve, 300)); s.processToastQueue();
    const pendingReleased = s.activeTopToast?.__toastMeta?.type === 'tacticalDirective';
    s.clearToastState();
    s.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN' }); s.processToastQueue();
    const afterEnd = s.activeTopToast?.__toastMeta?.type === 'tacticalDirective';
    s.clearToastState(); d.destroy(); s.firstLightDirector = null;
    s.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN' }); s.processToastQueue();
    return { pauseStable, pendingReleased, afterEnd, afterDestroy: s.activeTopToast?.__toastMeta?.type === 'tacticalDirective' };
  });
  writeFileSync(path.join(out, 'report.json'), JSON.stringify({ compiled, expectDeferred, version, checks, release, isolation, performanceEvidence, errors }, null, 2));
  assert(checks.every(row => row.initiallyVisible && row.cleared === expectDeferred && row.deferred === expectDeferred && row.bounded && row.dangerVisible
    && row.unchanged && row.staleDropped === expectDeferred && row.contactAlpha > .05 && row.permissions.length === 0), JSON.stringify(checks));
  assert(release.pauseStable && release.pendingReleased && release.afterEnd && release.afterDestroy); assert.equal(errors.length, 0);
  if (performanceEvidence) assert(performanceEvidence.unchanged && performanceEvidence.bullets === 160);
  console.log(`PASS contact notice priority: ${checks.length} contact/sector cases, active preemption, bounded queue, hazard priority, expiry and cleanup`);
} finally { await browser.close(); }
