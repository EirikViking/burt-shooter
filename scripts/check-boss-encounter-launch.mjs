import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const require = createRequire(import.meta.url);
const { readBossEncounterTest } = require('../electron/bossEncounterTest.cjs');
for (const id of ['dual-boss', 'boss-snake']) assert.equal(readBossEncounterTest([`--nova-encounter-test=${id}`]), id);
for (const args of [[], ['--nova-encounter-test=all'], ['--nova-encounter-test=dual-boss', '--nova-encounter-test=boss-snake']]) {
  assert.equal(readBossEncounterTest(args), null);
}
const out = path.resolve(process.env.CHECK_OUTPUT_DIR || 'test-results/discovery-celebrations/launch');
mkdirSync(out, { recursive: true });
const results = [];
for (const id of ['dual-boss', 'boss-snake']) {
  const port = await new Promise(resolve => { const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));}); });
  const child = spawn(process.env.NOVA_SWARM_PACKAGED_EXE || require('electron'),
    [...(process.env.NOVA_SWARM_PACKAGED_EXE ? [] : ['electron/main.cjs']), '--windowed', `--remote-debugging-port=${port}`, `--nova-encounter-test=${id}`],
    {env:{...process.env,NOVA_SWARM_DISABLE_STEAMWORKS:'1'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  let logs='', browser;
  const log = d => { logs+=d;writeFileSync(path.join(out, `${id}.log`),logs); };
  child.stdout.on('data',log);child.stderr.on('data',log);
  try {
    let endpoint;
    for(let i=0;i<45;i++){try{endpoint=await (await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1500)})).json();break;}catch{}await new Promise(r=>setTimeout(r,500));}
    assert.ok(endpoint,logs);
    browser=await chromium.connectOverCDP(endpoint.webSocketDebuggerUrl);
    const page=browser.contexts()[0].pages()[0] || await browser.contexts()[0].waitForEvent('page');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({width:1920,height:1080});
 await launchEncounterTestFromHangar(page);
    await page.bringToFront();
    await page.waitForFunction(() => {
      const d = window.__game?.scenes.play?.enemyManager?.discoveryEncounter;
      return d?.plan && d.primary?.active;
    }, null, { timeout: 120000 });
    const initial=await page.evaluate(()=>{const g=window.__game,d=g.scenes.play.enemyManager.discoveryEncounter;
      return {healthRatio:d.primary.health/d.primary.maxHealth,stage:d.stage,guestActive:!!d.guest?.active,snakeActive:!!d.snake};});
    assert.ok(initial.healthRatio>.95 && initial.stage==='waiting'&&!initial.guestActive&&!initial.snakeActive,
      'Practice starts at full health and reinforcements remain health-gated');
    // The old harness waited for an ungated guest without firing a shot.
    // Exercise the real launch and threshold using ordinary keyboard input.
    await page.keyboard.down('Space');
    for(let i=0;i<600;i++){
      const s=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,d=p.enemyManager.discoveryEncounter;
        return {ready:d?.stage==='active',dx:(d?.primary.x||960)-p.player.x,paused:p.isPaused,lives:g.lives};});
      if(s.ready)break;
      assert.ok(s.lives>0,'Pilot survived to the reinforcement trigger');
      if(s.paused){await page.bringToFront();await page.keyboard.press('Escape');await page.keyboard.down('Space');}
      if(s.dx>25){await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowRight');}
      else if(s.dx < -25){await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowLeft');}
      else {await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');}
      await page.waitForTimeout(100);
    }
    await page.keyboard.up('Space');await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');
    const state = await page.evaluate(async () => {
      const g = window.__game, p = g.scenes.play, d = p.enemyManager.discoveryEncounter;
      return {
        preset: g.encounterTest?.id, sector: g.level, mode: g.runMode, policy: g.runPolicy,
        lives: g.lives, invincible: Boolean(p.debugInvincible), augments: p.overrunBaselineAugmentIds,
        kind: d.plan.kind, bossCount: p.enemyManager.enemies.filter(e => e.active && e.kind === 'boss').length,
        snakeSections: d.snake?.sections.filter(s => s.active).length || 0,
        primaryHealthRatio: d.primary.health / d.primary.maxHealth,
        guestHealthRatio: d.guest?.maxHealth / d.baseHealth || 0,
        runtime: await window.__novaSteamBridge.getRuntimeInfo(),
        profile: await window.__novaSteamCloud.getProfileContext(),
        leaderboardProbe: await window.__novaSteamLeaderboard.submitScore({ score: 123 }),
        achievementProbe: await window.__novaSteamAchievements.unlockAchievement('INVALID_TEST_ACHIEVEMENT')
      };
    });
    state.userData = (await page.evaluate(()=>window.__novaSteamCloud.getDiagnostics())).profileDir;
    assert.equal(state.preset, id);assert.equal(state.sector, 30);assert.equal(state.mode, 'unranked');
    assert.ok(!state.invincible && state.augments.length === 5);
    assert.equal(state.kind, id === 'dual-boss' ? 'relay' : 'snake');
    assert.equal(state.bossCount, id === 'dual-boss' ? 2 : 1);
    assert.equal(state.snakeSections > 0, id === 'boss-snake');
    if (id === 'dual-boss') assert.equal(state.guestHealthRatio, 2);
    state.initial=initial;
    assert.ok(state.primaryHealthRatio <= .65, 'Guest arrived only after normal fire crossed the threshold');
    assert.equal(state.runtime.steamIntegrationIsolated, true);
    assert.equal(state.profile.type, 'local');assert.equal(state.profile.steamId, null);
    assert.match(state.userData, /nova-swarm-encounter-tests/);
    assert.equal(state.leaderboardProbe.ignored, true);assert.equal(state.achievementProbe.ignored, true);
    for (const [key, value] of Object.entries(state.policy)) if (key.startsWith('allow')) assert.equal(value, false, key);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(out, `${id}.png`) });
    results.push(state);console.log('PASS', id, 'real desktop launch, encounter, fixed loadout and isolated profile');
  } catch(error) { console.error(logs.slice(-12000));throw error; } finally { await browser?.close().catch(()=>{});child.kill(); }
}
writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));

