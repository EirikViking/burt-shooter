import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const exe = process.env.NOVA_SWARM_PACKAGED_EXE;
const out = process.env.CHECK_OUTPUT_DIR;
assert.ok(exe && out, 'Set packaged executable and task-owned output directory');
mkdirSync(out, { recursive: true });
const report = { fixtures: true, productionUploads: false, errors: [] };
const app = await electron.launch({ executablePath: exe, args: ['--nova-fresh-profile', '--windowed'], env: { ...process.env, NOVA_SWARM_FRESH_PROFILE: '1', NOVA_SWARM_USER_DATA_DIR: path.join(out, 'profile') }, timeout: 120000 });
try {
  const page = await app.firstWindow();
  page.on('pageerror', e => report.errors.push(e.message));
  await page.waitForFunction(() => window.__game?.scenes?.menu?.astraMenuShip?.ready && document.querySelector('#loading')?.style.display === 'none', null, { timeout: 120000 });
  report.isolation = await page.evaluate(() => window.__novaSteamBridge.getStatus());
  assert.equal(report.isolation.reason, 'fresh_profile_isolated');
  await page.screenshot({ path: path.join(out, 'menu-arcade-first.png') });
  await page.evaluate(() => window.__game.showHighscores({ view: 'onslaught' }));
  await page.waitForFunction(() => window.__game.scenes.highscore.comment && window.__game.currentSceneName === 'highscore');
  for (const count of [0, 1, 3]) {
    await page.evaluate(n => { const s = window.__game.scenes.highscore; s.fetchToken++; s.applyLeaderboardResult({ status: n ? 'available' : 'empty', entries: Array.from({ length: n }, (_, i) => ({ rank: i + 1, name: `QA PILOT ${i + 1}`, score: (n - i) * 10000 })) }); }, count);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `onslaught-${count}-fixture.png`) });
  }
  if (process.env.NOVA_SWARM_REAL_RECORD_REPORT) {
    const live = JSON.parse(readFileSync(process.env.NOVA_SWARM_REAL_RECORD_REPORT, 'utf8')).globalBefore?.entries?.[0];
    assert.ok(live?.details?.length >= 15, 'Read-only Steam probe must supply a complete v2 entry');
    report.liveInspector = await page.evaluate(async entry => {
      const scene = window.__game.scenes.highscore;
      scene.applyLeaderboardResult({ status: 'available', entries: [entry] });
      await scene.layoutHighscore();
      scene.onslaughtRowControls[0].activate();
      return { score: scene.onslaughtInspector?.entry?.score,
        startingLoadout: scene.onslaughtInspector?.entry?.startingLoadout,
        actionCount: scene.onslaughtInspector?.buttons?.length };
    }, live);
    assert.equal(report.liveInspector.score, live.score);
    assert.equal(report.liveInspector.startingLoadout?.augmentIds?.length, 3);
    await page.screenshot({ path: path.join(out, 'real-v2-inspect.png') });
    await page.keyboard.press('Escape');
  }
  await page.evaluate(() => { void window.__game.startGame(window.__game.selectedShipSpriteKey, { runMode: 'overrun_tactical' }); });
  await page.waitForFunction(() => document.querySelector('[role="dialog"]') || (window.__game.competitionStart && window.__game.currentSceneName === 'play'), null, { timeout: 60000 });
  if (await page.getByRole('dialog').isVisible()) await page.getByRole('button', { name: 'LAUNCH ONSLAUGHT', exact: true }).click();
  await page.waitForFunction(() => window.__game.competitionStart && window.__game.currentSceneName === 'play', null, { timeout: 60000 });
  report.start = await page.evaluate(() => ({ start: window.__game.competitionStart, result: window.__game.getLeaderboardAdapter().createRunResult(window.__game) }));
  assert.equal(report.start.start.startSector, 51);
  assert.equal(report.start.start.startScore, 0);
  assert.equal(report.start.result.eligibleForSubmission, true);
  await page.screenshot({ path: path.join(out, 'onslaught-start.png') });
  report.native = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].nativePresentation?.diagnostics());
  assert.ok(report.native?.transport?.accepted > 0, 'Native presentation must accept frames');
  report.steam = await app.evaluate(async ({ app }) => {
    const { createRequire } = process.getBuiltinModule('module');
    const load = createRequire(process.getBuiltinModule('path').join(app.getAppPath(), 'electron/main.cjs'));
    const steam = load('steamworks-ffi-node').SteamworksSDK.getInstance();
    const board = await steam.leaderboards.findLeaderboard('nova_swarm_overrun_tactical_score_v2');
    if (!board?.handle) throw new Error('Active Steam board not found');
    const entries = await steam.leaderboards.downloadLeaderboardEntries(board.handle, 0, 1, 5);
    if (!Array.isArray(entries)) throw new Error('Steam read failed');
    return {
      name: board.name, sortMethod: board.sortMethod, displayType: board.displayType,
      readCount: entries.length, overlayEnabled: steam.utils.isOverlayEnabled(),
      entryDetails: entries.slice(0, 5).map(entry => ({
        score: entry.score ?? entry.m_nScore ?? null,
        details: Array.isArray(entry.details) ? entry.details.slice(0, 64) : [],
        detailShape: entry.details == null ? null : Object.prototype.toString.call(entry.details)
      }))
    };
  });
  assert.equal(report.steam.sortMethod, 2);
  assert.equal(report.steam.displayType, 1);
  await app.evaluate(({ app }) => {
    const load = process.getBuiltinModule('module').createRequire(process.getBuiltinModule('path').join(app.getAppPath(), 'electron/main.cjs'));
    load('steamworks-ffi-node').SteamworksSDK.getInstance().overlay.activateGameOverlay('Achievements');
  });
  for (let attempt = 0; attempt < 20; attempt++) {
    await page.waitForTimeout(250);
    report.overlayActivated = await app.evaluate(({ BrowserWindow }) => Boolean(BrowserWindow.getAllWindows()[0].nativePresentation?.diagnostics()?.overlayActive));
    if (report.overlayActivated) break;
  }
  assert.equal(report.overlayActivated, true, 'Steam overlay activation callback must reach native presentation');
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.failure = error.stack; throw error; }
finally { writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, (_, v) => typeof v === 'bigint' ? String(v) : v, 2)); await app.close(); }
