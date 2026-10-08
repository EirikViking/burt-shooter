import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { _electron as electron } from 'playwright';

const exe = process.env.NOVA_SWARM_PACKAGED_EXE;
const output = process.env.CHECK_OUTPUT_DIR;
const deviceScale = Number(process.env.CHECK_DEVICE_SCALE_FACTOR || 1);
assert.ok(exe && output && /^E:[\\/]/i.test(output), 'Use packaged EXE and task-owned E: evidence');
assert.ok(Number.isFinite(deviceScale) && deviceScale >= 1 && deviceScale <= 3);
mkdirSync(output, { recursive: true });
const report = { isolatedFixture: true, productionUploads: false, deviceScale, checks: [], errors: [] };
const app = await electron.launch({
  executablePath: exe,
  args: ['--nova-fresh-profile', '--windowed', ...(deviceScale > 1 ? [`--force-device-scale-factor=${deviceScale}`] : [])],
  env: { ...process.env, NOVA_SWARM_FRESH_PROFILE: '1', NOVA_SWARM_USER_DATA_DIR: path.join(output, 'profile') },
  timeout: 120000
});

try {
  const page = await app.firstWindow();
  page.on('pageerror', error => report.errors.push(error.stack || error.message));
  await page.waitForFunction(() => window.__game?.scenes?.menu?.launchHome
    && document.querySelector('#loading')?.style.display === 'none', null, { timeout: 120000 });
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await app.evaluate(({ BrowserWindow }, [w, h]) => BrowserWindow.getAllWindows()[0].setSize(w, h), [width, height]);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(output, `menu-${width}.png`) });
    const badge = await page.evaluate(() => {
      const home = window.__game.scenes.menu.launchHome;
      const button = home.buttons.onslaught.getBounds();
      const label = home.buttons.onslaught._newBadge.getBounds();
      return { button: { x: button.x, y: button.y, width: button.width, height: button.height },
        label: { x: label.x, y: label.y, width: label.width, height: label.height } };
    });
    assert.ok(badge.label.x >= badge.button.x && badge.label.y >= badge.button.y
      && badge.label.x + badge.label.width <= badge.button.x + badge.button.width
      && badge.label.y + badge.label.height <= badge.button.y + badge.button.height,
    `NEW badge must stay inside Onslaught card: ${JSON.stringify(badge)}`);
    report.checks.push(`menu badge inside Onslaught ${width}`);
  }
  await page.evaluate(() => window.__game.showAchievements());
  await page.waitForFunction(() => window.__game.currentSceneName === 'achievements');
  await page.screenshot({ path: path.join(output, 'achievements-1920.png') });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 720));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(output, 'achievements-1280.png') });
  const rows = await page.evaluate(() => {
    const scene = window.__game.scenes.achievements;
    return { rowsPerColumn: scene.rowsPerColumn, rowHeight: scene.rowHeight, listTop: scene.listTop,
      viewportHeight: window.__game.app.screen.height };
  });
  assert.ok(rows.rowsPerColumn <= 2 && rows.listTop + rows.rowsPerColumn * rows.rowHeight < rows.viewportHeight - 50,
    `Achievement rows must leave the footer clear: ${JSON.stringify(rows)}`);
  report.checks.push('achievement rows clear footer');
  await page.evaluate(() => window.__game.showMenu());
  await page.waitForFunction(() => window.__game.currentSceneName === 'menu');
  await page.evaluate(() => { void window.__game.startGame(window.__game.selectedShipSpriteKey, { runMode: 'overrun_tactical' }); });
  await page.getByRole('dialog').waitFor({ timeout: 60000 });
  await page.screenshot({ path: path.join(output, 'loadout-1280.png') });
  await page.getByRole('button', { name: 'BACK', exact: true }).click();
  await page.evaluate(() => window.__game.showHighscores({ view: 'onslaught' }));
  await page.waitForFunction(() => window.__game.currentSceneName === 'highscore'
    && window.__game.scenes.highscore.comment && window.__game.scenes.highscore.runAgainBtn);
  await page.evaluate(async () => {
    const scene = window.__game.scenes.highscore;
    scene.applyLeaderboardResult({ status: 'available', entries: [{ rank: 1, score: 118181, name: 'QA PILOT' }] });
    scene.entriesNormalized[0].startingLoadout = {
      shipId: 'nova_ship_01', augmentIds: ['damage_up', 'rapid_fire', 'rail_surge']
    };
    await scene.layoutHighscore();
    scene.onslaughtRowControls[0].activate();
  });
  const opening = await page.evaluate(() => {
    const inspector = window.__game.scenes.highscore.onslaughtInspector;
    return { imageReady: Boolean(inspector?.liveTexture),
      sprites: inspector?.container?.children?.filter(child => child.constructor?.name === 'Sprite').length || 0 };
  });
  assert.ok(opening.imageReady || opening.sprites === 0, 'Inspector must not flash a 2D ship');
  await page.screenshot({ path: path.join(output, 'inspect-opening-1280.png') });
  await page.waitForFunction(() => window.__game.scenes.highscore.onslaughtInspector?.view?.ready, null, { timeout: 30000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(output, 'inspect-3d-1280.png') });
  report.checks.push('packaged Inspect waits for 3D ship');
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error.stack;
  throw error;
} finally {
  writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await app.close();
}
