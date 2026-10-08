import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const out = process.env.CHECK_OUTPUT_DIR;
if (!out) throw new Error('Set CHECK_OUTPUT_DIR to task-owned E: output');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack));
  await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:4197'}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scenes?.menu?.astraMenuShip?.ready && document.querySelector('#loading')?.style.display === 'none', null, { timeout: 120000 });
  await page.evaluate(() => { void window.__game.startGame(window.__game.selectedShipSpriteKey, { runMode: 'overrun_tactical' }); });
  await page.getByRole('button', { name: 'VIEW ACHIEVEMENTS FOR THIS MODE', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.onslaught-loadout-overlay')?.style.display === 'none');
  assert.equal(await page.evaluate(() => window.__game.currentSceneName), 'menu');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').isVisible(), true, 'loadout choices remain after browser return');
  await page.getByRole('button', { name: 'LAUNCH ONSLAUGHT', exact: true }).click();
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.competitionStart, null, { timeout: 60000 });
  await page.evaluate(() => window.__game.scenes.play.setPaused(true));
  const before = await page.evaluate(() => ({ runId: window.__game.runId, elapsed: window.__game.runElapsedSeconds,
    actions: window.__game.scenes.play.pauseButtons.length }));
  assert.equal(before.actions, 6);
  await page.evaluate(() => window.__game.scenes.play.openPauseAchievementBrowser());
  const open = await page.evaluate(() => ({ scene: window.__game.currentSceneName, paused: window.__game.scenes.play.isPaused,
    mode: window.__game.scenes.play.pauseAchievementScene.modeFilter,
    filtered: window.__game.scenes.play.pauseAchievementScene.availableOnly }));
  assert.deepEqual(open, { scene: 'play', paused: true, mode: 'overrun_tactical', filtered: true });
  await page.screenshot({ path: path.join(out, 'onslaught-paused-achievements-1280.png') });
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => Boolean(window.__game.scenes.play.pauseAchievementScene?.detailOverlay)), true);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.openHowToPlayOverlay();
    play.howToPlayOverlay.setPage(2);
    play.howToPlayOverlay.setFocusedCard(1);
  });
  const helpLayout = await page.evaluate(() => window.__game.scenes.play.howToPlayOverlay.getDebugState().layout);
  assert.deepEqual(helpLayout.layoutWarnings, []);
  assert.ok(helpLayout.achievementsButton);
  await page.screenshot({ path: path.join(out, 'onslaught-help-achievements-1280.png') });
  await page.keyboard.press('v');
  assert.equal(await page.evaluate(() => window.__game.scenes.play.pauseAchievementScene?.modeFilter), 'overrun_tactical');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.openHowToPlayOverlay();
    play.howToPlayOverlay.setPage(2);
    play.howToPlayOverlay.setFocusedCard(1);
  });
  const helpButton = helpLayout.achievementsButton;
  await page.mouse.click(helpButton.x + helpButton.width / 2, helpButton.y + helpButton.height / 2);
  assert.equal(await page.evaluate(() => window.__game.scenes.play.pauseAchievementScene?.modeFilter), 'overrun_tactical');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    window.__game.scenes.play.pauseButtons[4].activate();
    window.__burtGamepadOverride = { connected: true, axes: [0, 0], buttons: [] };
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__burtGamepadOverride.buttons = [{ pressed: true }]; });
  await page.waitForFunction(() => Boolean(window.__game.scenes.play.pauseAchievementScene?.detailOverlay));
  await page.evaluate(() => { window.__burtGamepadOverride.buttons = []; });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__burtGamepadOverride.buttons = [null, { pressed: true }]; });
  await page.waitForFunction(() => !window.__game.scenes.play.pauseAchievementScene?.detailOverlay);
  await page.evaluate(() => { window.__burtGamepadOverride.buttons = []; });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__burtGamepadOverride.buttons = [null, { pressed: true }]; });
  await page.waitForFunction(() => !window.__game.scenes.play.pauseAchievementScene);
  await page.evaluate(() => { window.__burtGamepadOverride = null; });
  const after = await page.evaluate(() => ({ scene: window.__game.currentSceneName, paused: window.__game.scenes.play.isPaused,
    browser: Boolean(window.__game.scenes.play.pauseAchievementScene), runId: window.__game.runId,
    elapsed: window.__game.runElapsedSeconds }));
  assert.equal(after.scene, 'play');
  assert.equal(after.paused, true);
  assert.equal(after.browser, false);
  assert.equal(after.runId, before.runId);
  assert.ok(after.elapsed - before.elapsed < 1, 'pause browser must not add gameplay time');
  assert.deepEqual(errors, []);
  console.log('[onslaught-pause-achievements] PASS six pause actions, filtered shared browser, keyboard/controller return and frozen run');
} finally {
  await browser.close();
}
