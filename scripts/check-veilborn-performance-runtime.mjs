import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { launchEncounterTestFromHangar } from './encounter-test-hangar.mjs';
import { MYSTERIES } from '../src/config/Mysteries.js';
const out = process.env.CHECK_OUTPUT_DIR;
assert.ok(out?.startsWith('E:'), 'Set an owned E: output directory'); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], rows = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('**/*', r => /^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(r.request().url()) ? r.continue() : r.abort());
await page.addInitScript(() => { window.__novaEncounterTest = { getPreset: async () => 'mystery:all' }; });
try {
  await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:5013'}/?skipIntro=1&offlineLeaderboard=1`);
  await launchEncounterTestFromHangar(page);
  await page.evaluate(async () => {
    const g = window.__game, p = g.scenes.play; g.app.ticker.stop(); p.setPaused(false);
    const { AudioManager } = await import('/src/audio/AudioManager.js'); AudioManager.enabled = false; AudioManager.stopAllVoices();
    p.isDebugInvincibleActive = () => true; p.inputManager.isFiring = () => false;
    p.introActive = false; p.introComplete = true; if (p.introOverlay) p.introOverlay.visible = false;
  });
  for (const id of (process.env.CHECK_IDS?.split(',') || MYSTERIES.map(d => d.id))) {
    const result = await page.evaluate(async id => {
      const g = window.__game, p = g.scenes.play, m = p.enemyManager;
      const { createMysteryEncounter } = await import('/src/entities/mysteries/createMysteryEncounter.js');
      const traces = [];
      for (const enabled of [false, true]) {
        m.clearEnemies(); p.clearEnemyBullets(); p.clearBossHazards(); m.state = 'MYSTERY_QA'; m.boss = null; m.discoveryEncounter = null;
        g.level = m.level = 40; g.lives = 4; g.mysteryMemories = {}; m.majorTelegraph = null;
        const a = await createMysteryEncounter(m, id);
        if (!enabled) { a.performance.clear(); a.performance = null; }
        const trace = [];
        for (let n = 0; n < 480; n++) {
          p.player.x = g.getWidth() * (.5 + Math.sin(n / 60 * 1.3) * .32); p.player.y = g.getHeight() * .83;
          if (n === 200) a.takeDamage(a.maxHealth * .34);
          if (n === 320) g.lives--;
          a.update(1); p.bulletManager.update(1); p.particleManager.update(1);
          trace.push([a.x, a.y, a.health, a.combat.next, a.stats.attacks, a.stats.warnings,
            a.parts.map(q => [q.name, q.active, q.localX, q.localY, q.x, q.y, q.radius]),
            a.bullets.filter(b => b.active).map(b => [b.x, b.y, b.vx, b.vy]),
            a.zones.map(z => [z.age, z.warning, z.fired, z.from.x, z.from.y])]);
        }
        traces.push(JSON.stringify(trace));
        a.destroy(); m.mysteryAftermath.clear();
      }
      return { id, identical: traces[0] === traces[1], frames: 480 };
    }, id);
    assert.ok(result.identical, `${id}: audiovisual presentation changed the combat trace`);
    rows.push(result); console.log(JSON.stringify(result));
  }
  const transition = await page.evaluate(async () => {
    const g = window.__game, p = g.scenes.play, m = p.enemyManager;
    m.clearEnemies(); p.clearEnemyBullets();
    const { createMysteryEncounter } = await import('/src/entities/mysteries/createMysteryEncounter.js');
    const a = await createMysteryEncounter(m, 'cinder_manta');
    a.age = 3; a.state = 'FORMATION'; a.combat.next = 3.01; a.update(0);
    const before = a.parts.filter(q => q.active && q.sprite.visible && !q.drone).map(q => ({ skew: [q.sprite.skew.x, q.sprite.skew.y], anchor: [q.sprite.anchor.x, q.sprite.anchor.y] }));
    a.fx.breakPart(a.wings[0]); a.fx.update(0, []);
    const fragment = a.fx.pool[a.fx.used - 1];
    const brokenPose = { skew: [fragment.skew.x, fragment.skew.y], anchor: [fragment.anchor.x, fragment.anchor.y] };
    a.takeDamage(1e9);
    const batch = m.mysteryAftermath.batches.at(-1);
    const after = batch.pieces.map(q => ({ skew: [q.s.skew.x, q.s.skew.y], anchor: [q.s.anchor.x, q.s.anchor.y] }));
    a.destroy(); for (let i = 0; i < 90; i++) m.mysteryAftermath.update(1);
    return { before, after, brokenPose, retired: m.mysteryAftermath.batches.length === 0 };
  });
  assert.deepEqual(transition.after, transition.before, 'death must preserve the exact articulated skew/anchor');
  assert.deepEqual(transition.brokenPose, transition.before[1], 'broken wing preserves articulated skew/anchor');
  assert.ok(transition.retired);
  assert.deepEqual(errors, []);
  writeFileSync(`${out}/performance-runtime.json`, JSON.stringify({ scope: 'Controlled actual renderer actors; identical simulation inputs with presentation enabled/disabled. Not a human balance test.', rows, transition, errors }, null, 2));
  console.log('PASS actual Veilborn combat trace parity and death-pose continuity');
} finally { await browser.close(); }
