import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const out = process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\', '/').startsWith('E:/Codex/builds/nova-swarm/'));
assert(process.env.CHECK_URL);
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const errors = [];
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 720}});
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL}/?autostart=1&offlineLeaderboard=1&encounterEvolution=molt`);
  await page.waitForFunction(() => window.__game?.scenes.play?.firstLightDirector?.view && window.__game.scenes.play.introComplete, null, {timeout: 90000});
  const result = await page.evaluate(async () => {
    const {FirstLightModel} = await import('/src/game/ArcadeFirstLight.js');
    const g = window.__game, s = g.scenes.play, d = s.firstLightDirector, m = s.enemyManager;
    if (!g.runPolicy.prototype || g.runPolicy.allowGlobalLeaderboard) throw Error('Unsafe fixture');
    g.app.ticker.stop(); d.localTestStarted = true;
    m.state = 'WAVE_ACTIVE'; m.phase = 'WAVES'; m.waveEnding = false;
    m.enemies = []; m.waves = []; m.boss = null; m.mysteryDirector = null;
    m.hijacker = null; m.discoveryEncounter = null; m.environment = null; m.challengeFlightState = null;
    s.introActive = false; s.introComplete = true;
    s.activeBossIntroCard?.destroy({children: true}); s.activeBossIntroCard = null;
    s.clearToastState(); g.level = 2;
    d.model = new FirstLightModel('result-runtime');
    for (let i = 0; i < 60; i++) d.model.update(.1, {sector: 2, safe: true});
    d.model.hit('left', 1000, {}); d.model.hit('right', 1000, {}); d.model.hit('core', 1000, {});
    s.showMayhemReinforcementStormWarning({groupCount: 2, boss: false, superStorm: false, warningMs: 5000});
    d.update(1);
    const initial = {safe: d.safe(), visible: d.view.contact.visible, text: d.view.title.text, age: d.model.encounter.age};
    for (let i = 0; i < 130; i++) d.update(1);
    g.app.render();
    return {initial, expired: d.model.encounter === null, visible: d.view.contact.visible,
      victories: d.model.victories, rewards: d.model.rewardCount, warningRemains: Boolean(s.activeMayhemReinforcementWarning?.root?.parent),
      policy: g.runPolicy};
  });
  await page.screenshot({path: path.join(out, 'warning-after-result.png')});
  writeFileSync(path.join(out, 'report.json'), JSON.stringify({result, errors}, null, 2));
  assert.equal(result.initial.safe, false);
  assert.equal(result.initial.visible, true);
  assert.equal(result.expired, true);
  assert.equal(result.visible, false);
  assert.equal(result.victories, 1); assert.equal(result.rewards, 1);
  assert.equal(result.warningRemains, true);
  assert.deepEqual(errors, []);
  console.log('PASS: actual director/model/visual clears won rival during ordinary warning; warning and one reward retained.');
} finally { await browser.close(); }
