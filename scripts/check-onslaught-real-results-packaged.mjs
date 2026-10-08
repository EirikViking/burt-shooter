import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const exe = process.env.NOVA_SWARM_PACKAGED_EXE;
const out = process.env.CHECK_OUTPUT_DIR;
const deviceScale = Number(process.env.CHECK_DEVICE_SCALE_FACTOR || 1);
assert.ok(exe && out, 'Set packaged executable and E: evidence directory');
assert.ok(Number.isFinite(deviceScale) && deviceScale >= 1 && deviceScale <= 3);
mkdirSync(out, { recursive: true });
const report = { productionUploads: false, genuineCombat: true, deviceScale,
  dpiMode: deviceScale > 1 ? 'chromium_renderer_emulation' : 'native_display', errors: [] };
const app = await electron.launch({
  executablePath: exe,
  args: ['--nova-fresh-profile', '--windowed', ...(deviceScale > 1 ? [`--force-device-scale-factor=${deviceScale}`] : [])],
  env: { ...process.env, NOVA_SWARM_FRESH_PROFILE: '1', NOVA_SWARM_USER_DATA_DIR: path.join(out, 'profile') },
  timeout: 120000
});

const snapshot = (page) => page.evaluate(() => {
  const scene = window.__game?.scenes?.gameOver;
  const bounds = (node) => {
    if (!node?.visible) return null;
    const b = node.getBounds();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  };
  return {
    mode: window.__game?.runMode,
    sector: window.__game?.level,
    score: window.__game?.score,
    state: scene?.state,
    title: scene?.title?.text,
    goal: scene?.nextGoalText?.text,
    retry: bounds(scene?.retryButton),
    report: bounds(scene?.runReportButton),
    leaderboard: bounds(scene?.leaderboardButton),
    hangar: bounds(scene?.hangarButton),
    menu: bounds(scene?.mainMenuButton)
  };
});

try {
  const page = await app.firstWindow();
  const dpiSession = deviceScale > 1 ? await page.context().newCDPSession(page) : null;
  const setDpiViewport = async (width, height) => {
    if (dpiSession) await dpiSession.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: deviceScale, mobile: false });
  };
  await setDpiViewport(1280, 720);
  page.on('pageerror', error => report.errors.push(error.stack || error.message));
  await page.waitForFunction(() => window.__game?.scenes?.menu?.astraMenuShip?.ready && document.querySelector('#loading')?.style.display === 'none', null, { timeout: 120000 });
  report.pixelRatio = await page.evaluate(() => window.devicePixelRatio);
  if (deviceScale > 1) assert.ok(report.pixelRatio >= deviceScale - 0.05, 'High-DPI override must be active');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 720));
  await page.screenshot({ path: path.join(out, 'menu-1280.png') });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1920, 1080));
  await setDpiViewport(1920, 1080);
  await page.screenshot({ path: path.join(out, 'menu-1920.png') });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 720));
  await setDpiViewport(1280, 720);
  await page.evaluate(() => window.__game.showHighscores({ view: 'onslaught' }));
  await page.waitForFunction(() => window.__game.currentSceneName === 'highscore' && window.__game.scenes.highscore.comment, null, { timeout: 60000 });
  await page.screenshot({ path: path.join(out, 'leaderboard-1280.png') });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1920, 1080));
  await setDpiViewport(1920, 1080);
  await page.screenshot({ path: path.join(out, 'leaderboard-1920.png') });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 720));
  await setDpiViewport(1280, 720);
  await page.evaluate(() => window.__game.showMenu());
  await page.waitForFunction(() => window.__game.currentSceneName === 'menu');
  await page.evaluate(() => localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, totalRuns: 5, bestLevel: 31, bestSector: 31 })));
  await page.evaluate(() => { void window.__game.startGame(window.__game.selectedShipSpriteKey, { runMode: 'overrun_tactical' }); });
  await page.getByRole('dialog').waitFor({ timeout: 60000 });
  await page.screenshot({ path: path.join(out, 'loadout-1280.png') });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1920, 1080));
  await setDpiViewport(1920, 1080);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, 'loadout-1920.png') });
  await page.getByRole('button', { name: 'LAUNCH ONSLAUGHT', exact: true }).click({ timeout: 60000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.competitionStart, null, { timeout: 60000 });
  report.start = await page.evaluate(() => ({ mode: window.__game.runMode, start: window.__game.competitionStart }));
  assert.equal(report.start.start.startSector, 51);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1920, 1080));
  await setDpiViewport(1920, 1080);
  await page.waitForTimeout(350);
  await page.waitForFunction(() => window.__game?.currentSceneName === 'gameOver' && window.__game?.scenes?.gameOver?.state === 'runback', null, { timeout: 480000 });
  report.completed = await snapshot(page);
  await page.screenshot({ path: path.join(out, 'real-run-result-1920.png') });
  await page.evaluate(() => window.__game.scenes.gameOver.openRunReport());
  report.reportOpen = await page.evaluate(() => window.__game.scenes.gameOver.runReportOverlay?.visible);
  await page.evaluate(() => window.__game.scenes.gameOver.closeRunReport());
  report.afterReport = await snapshot(page);
  await page.evaluate(() => window.__game.scenes.gameOver.layoutScreen());
  report.afterAsyncLayout = await snapshot(page);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 720));
  await setDpiViewport(1280, 720);
  await page.waitForTimeout(350);
  report.small = await snapshot(page);
  await page.screenshot({ path: path.join(out, 'real-run-result-1280.png') });
  for (const [resolution, state, maxHeight] of [['1920x1080', report.completed, 1080], ['1280x720', report.small, 720]]) {
    for (const key of ['retry', 'report', 'leaderboard', 'hangar', 'menu']) {
      const box = state[key];
      assert.ok(box && box.y >= 0 && box.y + box.height <= maxHeight - 4,
        `${resolution} ${key} action must remain fully visible`);
    }
  }
  assert.deepEqual(report.errors, []);
  report.status = 'captured';
} catch (error) {
  report.status = 'failed';
  report.failure = error.stack;
  throw error;
} finally {
  writeFileSync(path.join(out, 'real-run-report.json'), JSON.stringify(report, null, 2));
  await app.close();
}
