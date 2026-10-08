import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { BOSS_ROSTER } from '../src/config/BossRoster.js';

const out = process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\', '/').startsWith('E:/'));
assert(process.env.BASELINE_URL && process.env.CANDIDATE_URL);
mkdirSync(out, { recursive: true });
const families = ['conductor', 'clock'];
const targets = [['baseline', process.env.BASELINE_URL], ['candidate', process.env.CANDIDATE_URL]];
if (process.env.REVERSE_ORDER === '1') targets.reverse();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const [label, url] of targets) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /game loop|uncaught|TypeError|ReferenceError/i.test(message.text())) errors.push(message.text());
    });
    await page.addInitScript(() => {
      window.__novaEncounterTest = { getPreset: async () => 'boss-snake' };
      localStorage.setItem('burt_voice_enabled', 'false');
    });
    await page.goto(`${url}/?offlineLeaderboard=1`);
    await page.waitForFunction(() => window.__game?.currentSceneName === 'shipSelect' && document.body.dataset.menuReady === '1', null, { timeout: 120000 });
    await page.evaluate(() => window.__game.startGame(undefined, { countShipUsage: false }));
    await page.waitForFunction(() => {
      const s = window.__game?.scenes.play;
      return s?.enemyManager?.boss?.active && s.introComplete && !s.levelStartWarmupPending;
    }, null, { timeout: 120000 });
    await page.evaluate(() => {
      const g = window.__game, s = g.scenes.play, m = s.enemyManager;
      g.app.ticker.stop();
      if (!g.runPolicy.prototype || Object.entries(g.runPolicy).some(([key, value]) => key.startsWith('allow') && value)) throw Error('Unsafe benchmark policy');
      window.__benchBossType = m.boss.constructor;
      m.clearEnemies(); m.clearPendingWaveSpawns(); m.boss = null;
      s.firstLightDirector.cancel('mechanical-benchmark');
      s.clearToastState(); s.clearBossHazards('mechanical-benchmark');
      s.activeBossIntroCard?.parent?.removeChild(s.activeBossIntroCard);
      s.activeBossIntroCard = null; s.introActive = false;
      s.cosmicFauna?.destroy(); s.cosmicFauna = null;
      s.bulletManager.clearAll('mechanical-benchmark');
      const Bullet = s.player.shoot()[0].constructor;
      for (let i = 0; i < 160; i++) s.bulletManager.addEnemyBullet(new Bullet(80 + i % 20 * 85, 150 + Math.floor(i / 20) * 55, 0, .2, 1, 0xff795a, false));
    });
    for (const family of families) {
      const profile = BOSS_ROSTER.find(row => row.archetype === family);
      assert(profile);
      const result = await page.evaluate(async ({ label, profile }) => {
        const g = window.__game, s = g.scenes.play, m = s.enemyManager;
        m.clearEnemies(); m.boss = null;
        const w = s.gameplayGame.getWidth(), h = s.gameplayGame.getHeight();
        const boss = new window.__benchBossType(w * .5, h * .28, 3, s.gameplayGame, profile);
        await boss.createSprite(); m.enemies.push(boss); m.boss = boss; s.gameContainer.addChild(boss.sprite);
        boss.x = w * .5; boss.y = h * .28; boss.sprite.position.set(boss.x, boss.y);
        boss.entryStartMs = Date.now() - boss.entryDurationMs - 1000;
        if (label === 'candidate' && !boss.colossusRig?.mechanicalPose) throw Error('Candidate mechanical rig absent');
        const invariant = () => JSON.stringify({ health: boss.health, radius: boss.radius, x: boss.x, y: boss.y, score: g.score, lives: g.lives });
        const before = invariant(), samples = [], gaps = [];
        const step = () => {
          const start = performance.now();
          boss.updateBossAnimation(1, w * .5, h * .85);
          s.updateStarfield(1); g.app.render();
          return performance.now() - start;
        };
        for (let frame = 0; frame < 600; frame++) { const elapsed = step(); if (frame >= 120) samples.push(elapsed); }
        let last, warm = 60;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(Error('Rendered-frame timeout')), 20000);
          const tick = time => {
            try {
              step(); if (warm) warm--; else gaps.push(time - last); last = time;
              if (gaps.length === 180) { clearTimeout(timeout); resolve(); } else requestAnimationFrame(tick);
            } catch (error) { clearTimeout(timeout); reject(error); }
          };
          requestAnimationFrame(tick);
        });
        const stats = list => {
          const a = [...list].sort((a, b) => a - b);
          return { n: a.length, p50: a[Math.floor(a.length * .5)], p95: a[Math.floor(a.length * .95)], p99: a[Math.floor(a.length * .99)], max: a.at(-1), over50: a.filter(v => v > 50).length };
        };
        return { label, family: profile.archetype, cpu: stats(samples), raf: stats(gaps), unchanged: invariant() === before, health: boss.health, radius: boss.radius, children: boss.colossusRig.children.length, bullets: s.bulletManager.enemyBullets.filter(b => b.active).length, prototype: g.runPolicy.prototype, version: JSON.parse(window.render_game_to_text()).buildId };
      }, { label, profile });
      assert(result.unchanged && result.prototype); assert.equal(result.bullets, 160);
      results.push(result);
      await page.screenshot({ path: `${out}/${label}-${family}.png` });
      console.log(JSON.stringify(result));
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  for (const family of families) {
    const pair = results.filter(row => row.family === family);
    assert.equal(pair.length, 2);
    for (const key of ['health', 'radius', 'children', 'bullets']) assert.equal(pair[0][key], pair[1][key], `${family}: mismatched ${key}`);
  }
  writeFileSync(`${out}/report.json`, JSON.stringify({ conditions: 'Sequential compiled baseline and candidate; actual conductor and clock boss constructors, same 1280x720 viewport, 160 static hostile projectile visuals, no live attacks or collision simulation; 120 CPU warmup/480 samples and 60 RAF warmup/180 samples. Rendering/animation tail comparison only, not a whole-run or hardware performance guarantee.', results }, null, 2));
} finally { await browser.close(); }
