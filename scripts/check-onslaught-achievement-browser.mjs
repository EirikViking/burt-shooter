import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const output = process.env.CHECK_OUTPUT_DIR;
if (!output) throw new Error('Set CHECK_OUTPUT_DIR to task-owned E: output');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', error => errors.push(error.stack));
const report = { isolatedBrowser: true, productionUnlocks: false, checks: [] };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); console.log('PASS', name); };
try {
  await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:4197'}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scenes?.menu?.menuOptions?.length > 0
    && document.querySelector('#loading')?.style.display === 'none', null, { timeout: 120000 });
  await page.evaluate(() => window.__game.showAchievements());
  await page.waitForFunction(() => window.__game.currentSceneName === 'achievements');
  check('Challenges open separately from rank milestones', await page.evaluate(() => {
    const scene = window.__game.scenes.achievements;
    return scene.groupFilter === 'challenges' && scene.rows.every(row => row.achievement.type !== 'rank');
  }));
  await page.keyboard.press('g');
  check('Rank view contains only pilot ranks', await page.evaluate(() => window.__game.scenes.achievements.rows.every(row => row.achievement.type === 'rank')));
  await page.keyboard.press('g');
  await page.waitForFunction(() => window.__game?.currentSceneName === 'achievements'
    && window.__game.scenes.achievements.rows.length === 100);
  check('All 100 achievements remain browseable', await page.evaluate(() => window.__game.scenes.achievements.rows.length === 100));
  await page.evaluate(() => {
    const scene = window.__game.scenes.achievements;
    scene.init(); scene.init(); scene.init();
  });
  await page.waitForTimeout(250);
  check('Repeated opens cannot install stale asynchronous backdrops', await page.evaluate(() => {
    return window.__game.scenes.achievements.container.children.filter(child => child.texture && child.anchor).length <= 1;
  }));
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.evaluate(() => { const scene = window.__game.scenes.achievements; scene.init(); scene.moveFocus(37); scene.layoutScreen(); });
    check(`Reopen and redraw ${cycle + 1} do not duplicate rows`, await page.evaluate(() => {
      const state = window.__game.scenes.achievements.getDebugState();
      return state.rowCount === state.uniqueRowCount && state.renderedRowCount === state.renderedUniqueRowCount;
    }));
  }
  await page.evaluate(() => {
    const scene = window.__game.scenes.achievements;
    scene.openAchievementDetail(scene.rows.find(row => row.achievement.id === 'ACH_OS_STARTER_WINGS'));
  });
  check('Starter ship checklist names every eligible hull', await page.evaluate(() => {
    const text = window.__game.scenes.achievements.detailOverlay.children.map(child => child.text || '').join('\n');
    return ['NOVA SPARROW', 'COMET COURIER', 'PIXEL NEEDLE', 'MINT SKATER', 'CRIMSON BITE'].every(name => text.includes(name))
      && !text.includes('QUASAR FAN');
  }));
  await page.screenshot({ path: path.join(output, 'starter-collection-1280x720.png') });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(output, 'achievements-1280x720.png') });
  await page.keyboard.press('m');
  check('Mode selector advances with keyboard', await page.evaluate(() => window.__game.scenes.achievements.modeFilter === 'ranked'));
  await page.keyboard.press('f');
  check('Available filter narrows the list while retaining earned entries', await page.evaluate(() => {
    const scene = window.__game.scenes.achievements;
    return scene.availableOnly && scene.rows.length < 100 && scene.rows.length > 0;
  }));
  await page.keyboard.press('Enter');
  check('Keyboard opens full details', await page.evaluate(() => Boolean(window.__game.scenes.achievements.detailOverlay)));
  await page.screenshot({ path: path.join(output, 'achievement-detail-1280x720.png') });
  await page.keyboard.press('Escape');
  check('Escape restores the browser and focus', await page.evaluate(() => !window.__game.scenes.achievements.detailOverlay));
  await page.evaluate(() => {
    const scene = window.__game.scenes.achievements;
    scene.availableOnly = false;
    scene.modeFilter = 'overrun_tactical';
    scene.refreshFilteredRows();
    window.__burtGamepadOverride = { connected: true, axes: [0, 0], buttons: [] };
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__burtGamepadOverride.buttons = [{ pressed: true }]; });
  await page.waitForFunction(() => Boolean(window.__game.scenes.achievements.detailOverlay));
  check('Controller confirm opens details', true);
  await page.evaluate(() => { window.__burtGamepadOverride.buttons = []; });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__burtGamepadOverride.buttons = [null, { pressed: true }]; });
  await page.waitForFunction(() => !window.__game.scenes.achievements.detailOverlay);
  check('Controller cancel returns to the same browser', await page.evaluate(() => window.__game.currentSceneName === 'achievements'));
  await page.evaluate(() => { window.__burtGamepadOverride = null; });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(output, 'achievements-1920x1080.png') });
  check('No browser exceptions', errors.length === 0);
} finally {
  writeFileSync(path.join(output, 'report.json'), JSON.stringify({ ...report, errors }, null, 2));
  await browser.close();
}
