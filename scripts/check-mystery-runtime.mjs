import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const ids = (process.env.MYSTERY_IDS || 'glass_widow,cinder_manta,needle_saint,blind_leviathan,lantern_eater,scissor_twins,red_wake').split(',');
const out = process.env.CHECK_OUTPUT_DIR || 'test-results/mysteries/first-runtime';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [], results = [];
page.on('pageerror', error => { errors.push(error.message); console.log('[MysteryError]', error.message); });
page.on('console', message => { if(message.type()==='error')console.log('[RuntimeConsole]',message.text().slice(0,220)); });
await page.route('**/*', route => /^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(route.request().url()) ? route.continue() : route.abort());
await page.addInitScript(() => { window.__novaEncounterTest = { getPreset: async () => 'boss-snake' }; });
try {
  await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:5213'}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
 await launchEncounterTestFromHangar(page);
  await page.waitForFunction(() => window.__game?.scenes.play?.enemyManager?.discoveryEncounter?.stage === 'active'
    || document.body.innerText.includes('GAME FREEZE DETECTED'), null, { timeout: 120000 });
  if (await page.locator('body').innerText().then(text => text.includes('GAME FREEZE DETECTED'))) {
    console.log('Cold source startup exceeded the existing eight-second watchdog. Rechecking with warmed resources.');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__game?.scenes.play?.enemyManager?.discoveryEncounter?.stage === 'active', null, { timeout: 120000 });
    assert.ok(!(await page.locator('body').innerText()).includes('GAME FREEZE DETECTED'), 'Warmed source game boots without a diagnostic overlay');
  }
  await page.evaluate(() => {
    const g = window.__game, p = g.scenes.play, m = p.enemyManager;
    g.app.ticker.stop(); m.clearEnemies(); p.clearEnemyBullets(); p.clearBossHazards();
    m.state = 'MYSTERY_QA'; m.phase = 'WAVES'; m.boss = null; m.discoveryEncounter = null;
    m.update = delta => m.updateEnemies(delta);
    p.isDebugInvincibleActive = () => true;
    p.inputManager.isFiring = () => false;
    p.introActive = false; p.introComplete = true;
    if(p.introOverlay)p.introOverlay.visible=false;
    p.player.sprite.visible = true; p.player.shipSprite.visible = true;
    p.inputManager.getMouseSteeringIntent = (x,y) => ({active:true,moveX:Math.sin(performance.now()*.0015),moveY:Math.max(-1,Math.min(1,(g.getHeight()*.8-y)/20))});
  });
  for (const id of ids) {
    await page.evaluate(async id => {
      const { createMysteryEncounter } = await import('/src/entities/mysteries/createMysteryEncounter.js');
      const g = window.__game, p = g.scenes.play, m = p.enemyManager;
      g.app.ticker.stop(); m.clearEnemies(); p.clearEnemyBullets();
      window.__mystery = await createMysteryEncounter(m, id);
      g.app.ticker.start();
    }, id);
    await page.waitForFunction(() => window.__mystery.age >= 4, null, { timeout: 15000 });
    await page.screenshot({ path: `${out}/${id}-arrival.png` });
    await page.waitForFunction(() => window.__mystery.age >= 16, null, { timeout: 26000 });
    await page.screenshot({ path: `${out}/${id}-cycle.png` });
    const result = await page.evaluate(async () => {
      const g = window.__game, p = g.scenes.play, m = p.enemyManager, enemy = window.__mystery;
      g.app.ticker.stop();
      const before = g.score, part = enemy.parts.find(part => part.maxHealth > 0 && part.active);
      const partKill = part ? p.applyCombatDamage(part, 1e6, 'bomb') : null;
      const partScore = g.score - before;
      const expectedBonus = 4500 + Math.max(0, Math.min(2500, Math.floor(Number(enemy.additionalBonus?.()) || 0)));
      const first = p.applyCombatDamage(enemy, 1e6, 'bomb'), after = g.score;
      const again = p.applyCombatDamage(enemy, 1e6, 'bomb');
      const result = { id: enemy.type, age: enemy.age, stats: enemy.stats, partKill, partScore, first, again,
        expectedBonus, awarded: after - before, duplicate: g.score - after, activeParts: enemy.parts.filter(part => part.active).length };
      enemy.destroy(); enemy.destroy(); m.updateEnemies(1);
      const { mysteryAssetDiagnostics } = await import('/src/entities/mysteries/MysteryAssets.js');
      result.resources = mysteryAssetDiagnostics();
      return result;
    });
    results.push(result); writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
    assert.deepEqual(errors, []);
    assert.ok(result.stats.attacks > 0 && result.stats.warnings > 0, `${id} executes a warned attack cycle`);
    assert.ok(result.first && !result.again && result.duplicate === 0, `${id} only confirms one kill`);
    assert.equal(result.awarded, result.expectedBonus, 'Confirmed kill pays the advertised base plus earned optional component bonus');
    assert.equal(result.partScore, 0); assert.ok(result.partKill !== true);
    assert.equal(result.activeParts, 0); assert.ok(result.resources.every(row => row.refs === 0));
    console.log(JSON.stringify(result));
  }
} finally { await browser.close(); }
