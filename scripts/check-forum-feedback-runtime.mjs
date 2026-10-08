import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const out = process.env.CHECK_OUTPUT_DIR || 'E:/Codex/builds/nova-swarm/forum-feedback-20260913/qa/correctness';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const report = { errors: [], cases: [] };
page.on('pageerror', error => report.errors.push(error.message));
await page.route('**/*', route => /^(https?:\/\/127\.0\.0\.1|blob:|data:)/.test(route.request().url()) ? route.continue() : route.abort());
try {
  await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:5223'}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'commit' });
  await page.waitForFunction(() => document.body.dataset.menuReady === '1', null, { timeout: 120000 });
  await page.evaluate(async () => {
    const { writeHangarProgressState, readHangarProgressState } = await import('/src/progression/HangarProgressState.js');
    const { getPilotXpThresholds } = await import('/src/shared/RankPolicy.js');
    writeHangarProgressState({ ...readHangarProgressState(), pilotXp: getPilotXpThresholds()[28], pilotXpExact: String(getPilotXpThresholds()[28]), totalRuns: 3, bestSector: 60 });
    window.__game.achievementManager.steamSync = { unlock: async () => ({ ok: true }) };
  });
  for (const mode of ['overrun_pure', 'unranked', 'sector_start', 'ranked', 'ranked_tactical']) {
    await page.evaluate(mode => window.__game.startGame(undefined, { runMode: mode, countShipUsage: false }), mode);
    await page.waitForFunction(() => window.__game.currentSceneName === 'play' && window.__game.scenes.play.player, null, { timeout: 90000 });
    const result = await page.evaluate(mode => {
      const g = window.__game; g.app.ticker.stop();
      g.achievementManager.unlockedIds.clear();
      const summary = g.finalizeRunProgression({ score: 0 });
      return { mode, eligible: g.isRankedRun(), actualMode: g.runMode, newRanks: summary.newRanksThisRun,
        rank: summary.next.pilotRank, unlocked: g.achievementManager.getUnlocked().filter(id => id.startsWith('ACH_RANK_')) };
    }, mode);
    assert.equal(result.actualMode, mode);
    assert.equal(result.unlocked.includes('ACH_RANK_28'), result.eligible);
    assert.equal(result.newRanks.length, 0, 'Catch-up works without crossing a new rank');
    report.cases.push(result);
    await page.evaluate(() => window.__game.app.ticker.start());
  }
  report.bomb = await page.evaluate(() => {
    const g = window.__game, p = g.scenes.play, player = p.player;
    g.app.ticker.stop(); p.setPaused(false); g.runFinalized = false;
    const target = { x: player.x, y: player.y - 200, active: true, health: 100, kind: 'boss' };
    player.bombShotsLeft = 2; player.bombArmedAt = 0;
    player.getBombCommitState = () => ({ ready: true, target, reason: 'boss', clusterCount: 1 });
    const check = (condition, message) => { if (!condition) throw Error(message); };
    p.updateGrazeBreakFireIntent(false); p.updateGrazeBreakFireIntent(true);
    let bullets = player.shoot();
    check(player.bombShotsLeft === 2, 'Ordinary fire preserves Bombs');
    p.updateGrazeBreakFireIntent(false); p.updateGrazeBreakFireIntent(true);
    player.shootCooldown = 0; player.shoot();
    check(player.bombShotsLeft === 2, 'Fire re-entry preserves Bombs');
    player.queueBombTriggerIntent(); player.shootCooldown = 0; bullets = player.shoot();
    check(player.bombShotsLeft === 1 && bullets.some(b => b.isBomb), 'Deliberate Bomb fires exactly once');
    player.shootCooldown = 0; player.shoot();
    check(player.bombShotsLeft === 1, 'Holding fire preserves remaining Bomb');
    p.grazeBreakReady = true; p.grazeBreakNeedsFireRelease = true; p.grazeBreakExpiresAt = p.getGameplayClockMs() + 6500;
    p.updateGrazeBreakFireIntent(false);
    check(p.grazeBreakReleasePrimed, 'Graze release behavior preserved');
    return { stock: player.bombShotsLeft, grazePrimed: p.grazeBreakReleasePrimed };
  });
  report.results = await page.evaluate(async () => {
    const { GameOverScene } = await import('/src/scenes/GameOverScene.js');
    const prototype = GameOverScene.prototype;
    const pending = new Promise(() => {});
    const started = performance.now();
    let timedOut = false;
    try { await prototype.withSubmissionTimeout(pending, 30, 'fixture timeout'); } catch { timedOut = true; }
    if (!timedOut) throw Error('Unresolved platform promise must time out');
    // An accepted cloud submission must stay accepted if its optional placement
    // lookup never returns; the results flow must regain control.
    const result = { globalProvider: 'cloud', globalStatus: 'submitted', score: 1000 };
    const scene = { isRankedRun: true, game: { runMode: 'ranked', isDebugRun: false }, finalScore: 1000,
      unlockSwarmEliteForAcceptedSubmission() {}, getRunLeaderboardQuery: () => ({}),
      leaderboardAdapter: { getGlobalScoresForPlacement: () => pending },
      withSubmissionTimeout: (promise, milliseconds, message) => prototype.withSubmissionTimeout(promise, Math.min(milliseconds, 40), message) };
    await prototype.confirmGlobalLeaderboardAchievements.call(scene, result);
    if (result.achievementConfirmationStatus !== 'post_submit_global_read_failed') throw Error(JSON.stringify(result));
    return { timedOut, elapsed: performance.now() - started, result };
  });
  await page.screenshot({ path: `${out}/gameplay.png` });
  await page.waitForFunction(() => window.__game.scenes.play.gameplayBackdrop, null, { timeout: 60000 });
  report.backdrop = await page.evaluate(() => {
    const g=window.__game,p=g.scenes.play;g.app.ticker.stop();
    p.setGameplayBackdropMode('base',{immediate:true});p.updateGameplayBackdrop(30);
    const before={x:p.gameplayBackdrop.x,y:p.gameplayBackdrop.y,scale:p.gameplayBackdrop.scale.x};
    p.setGameplayBackdropMode('boss');
    const after={x:p.gameplayBackdrop.x,y:p.gameplayBackdrop.y,scale:p.gameplayBackdrop.scale.x};
    p.updateGameplayBackdrop(1);
    if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Backdrop snapped entering boss');
    if(Math.hypot(p.gameplayBackdrop.x-before.x,p.gameplayBackdrop.y-before.y)>1)throw Error('Backdrop motion discontinuity');
    const x=p.gameplayBackdrop.x,y=p.gameplayBackdrop.y;
    p.setGameplayBackdropMode('base');
    if(p.gameplayBackdrop.x!==x||p.gameplayBackdrop.y!==y)throw Error('Backdrop snapped leaving boss');
    return {before,after};
  });
  report.cores = await page.evaluate(async () => {
    const {BonusDrone}=await import('/src/entities/BonusDrone.js');
    const {GameAssets}=await import('/src/utils/GameAssets.js');
    await GameAssets.loadPowerupAssets();
    const g=window.__game,p=g.scenes.play,W=p.gameplayGame.getWidth(),H=p.gameplayGame.getHeight();
    g.markUnrankedRun('forum_visual_qa');p.clearToastState();
    p.enemyManager.clearPendingWaveSpawns();p.enemyManager.clearEnemies();
    for(const b of [...p.bulletManager.enemyBullets,...p.bulletManager.playerBullets])b.active=false;
    p.bulletManager.pruneInactiveBullets?.('enemy');p.bulletManager.pruneInactiveBullets?.('player');
    const rows=[];
    for(const [i,type]of ['HAZARD','POWERUP'].entries()){
      const drone=new BonusDrone(W*(.3+i*.35),H-35,p.gameplayGame,type);
      p.gameContainer.addChild(drone.sprite);drone.update(0);
      if(!(drone.active&&drone.sprite.alpha<1&&drone.sprite.scale.x<1))throw Error('Missing escape shimmer');
      rows.push({type,alpha:drone.sprite.alpha,scale:drone.sprite.scale.x});
    }
    for(const [i,type]of ['rail_surge','stasis_net','void_crown','chrono_anchor'].entries())p.powerupManager.spawnSpecific(W*(.26+i*.16),H*.47,type);
    g.app.renderer.render({container:g.app.stage});return rows;
  });
  await page.screenshot({path:`${out}/pickups-and-escape.png`});
  await page.evaluate(async()=>{
    const {HangarLaunchModeOverlay}=await import('/src/ui/HangarLaunchModeOverlay.js');
    const {rememberLastRunMode}=await import('/src/game/LastRunMode.js');
    const g=window.__game;rememberLastRunMode('ranked');
    window.__forumModeOverlay=new HangarLaunchModeOverlay({parent:g.app.stage,width:g.getWidth(),height:g.getHeight(),shipName:'NOVA SPARROW'});
    const overlay=window.__forumModeOverlay;
    if(overlay.options[overlay.focusedIndex].id!=='ranked')throw Error('Last mode not focused');
    overlay.handleKey({key:'ArrowRight',preventDefault(){}});
    if(overlay.options[overlay.focusedIndex].id!=='daily_signal')throw Error('Keyboard focus failed');
    g.app.renderer.render({container:g.app.stage});
  });
  await page.screenshot({path:`${out}/launch-focus.png`});
  await page.evaluate(()=>window.__forumModeOverlay.destroy());
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
  console.log(JSON.stringify(report));
} catch (error) {
  report.failure = error.stack;
  await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});
  throw error;
} finally {
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
