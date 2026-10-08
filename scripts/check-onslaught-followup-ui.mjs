import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const output = process.env.CHECK_OUTPUT_DIR;
assert.ok(output && /^E:[\\/]/i.test(output), 'Use task-owned E: screenshot directory');
assert.match(readFileSync(new URL('../src/ui/OnslaughtLoadoutPicker.js', import.meta.url), 'utf8'),
  /AudioManager\.playSfx\('ship_lock_chime'/, 'augment selection must request its catalogued confirmation sound');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack));
    await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:4199'}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.currentScene === window.__game?.scenes?.menu
      && document.querySelector('#loading')?.style.display === 'none', null, { timeout: 120000 });
    await page.evaluate(() => { void window.__game.startGame(window.__game.selectedShipSpriteKey, { runMode: 'overrun_tactical' }); });
    await page.getByRole('dialog').waitFor();
    const ships = [];
    for (let index = 0; index < 3; index += 1) {
      ships.push(await page.locator('.ship-identity strong').textContent());
      await page.getByRole('button', { name: 'NEXT SHIP' }).click();
    }
    assert.equal(new Set(ships).size, 3, 'fresh profile must cycle through three unlocked hulls');
    assert.equal(await page.locator('.ship-identity strong').textContent(), ships[0]);
    await page.evaluate(() => { window.__burtGamepadOverride = { id: 'fixture-pad', connected: true,
      axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) }; });
    await page.waitForTimeout(120);
    await page.evaluate(() => { window.__burtGamepadOverride.buttons[0].pressed = true; });
    await page.waitForTimeout(120);
    await page.evaluate(() => { window.__burtGamepadOverride.buttons[0].pressed = false; });
    assert.equal(await page.locator('.ship-identity strong').textContent(), ships[1], 'controller confirm on next-ship must switch hull');
    await page.getByRole('button', { name: 'PREVIOUS SHIP' }).click();
    assert.equal(await page.locator('.ship-identity strong').textContent(), ships[0]);
    await page.screenshot({ path: path.join(output, `loadout-${viewport.width}.png`) });
    await page.locator('.onslaught-loadout-slots button').nth(1).click();
    assert.equal(await page.locator('.onslaught-loadout-picker').evaluate(node => node.hidden), false);
    await page.screenshot({ path: path.join(output, `augment-picker-${viewport.width}.png`) });
    const choices = page.locator('.onslaught-loadout-choices button:not([hidden])[aria-pressed="false"]');
    await choices.last().click();
    assert.equal(await page.locator('.onslaught-loadout-picker').evaluate(node => node.hidden), true);
    assert.equal(await page.locator('.onslaught-loadout-slots button').nth(1).evaluate(node => node.classList.contains('augment-equipped')), true,
      'new augment should click into its selected slot');
    await page.screenshot({ path: path.join(output, `augment-equipped-${viewport.width}.png`) });
    await page.getByRole('button', { name: 'BACK', exact: true }).click();
    await page.evaluate(() => window.__game.showHighscores());
    await page.waitForFunction(() => window.__game?.currentScene === window.__game?.scenes?.highscore
      && window.__game.scenes.highscore.comment && window.__game.scenes.highscore.runAgainBtn);
    await page.evaluate(async () => {
      const { openOnslaughtLoadoutInspector } = await import('/src/ui/OnslaughtRecordsPanel.js');
      openOnslaughtLoadoutInspector(window.__game.scenes.highscore, {
        rank: 1, score: 118181, name: 'FIXTURE PILOT',
        startingLoadout: { shipId: 'nova_ship_01', augmentIds: ['damage_up', 'rapid_fire', 'rail_surge'] }
      });
    });
    const initialPortrait = await page.evaluate(() => {
      const inspector = window.__game.scenes.highscore.onslaughtInspector;
      const sprite = inspector.container.children.find(child => child.constructor?.name === 'Sprite');
      return { width: sprite?.width || 0, ready: Boolean(inspector.liveTexture) };
    });
    assert.ok(initialPortrait.ready || initialPortrait.width < 10,
      `Inspect must not flash a 2D ship before 3D is ready: ${JSON.stringify(initialPortrait)}`);
    await page.screenshot({ path: path.join(output, `inspect-opening-${viewport.width}.png`) });
    await page.waitForFunction(() => window.__game.scenes.highscore.onslaughtInspector?.view?.ready, null, { timeout: 30000 });
    await page.waitForTimeout(500);
    const inspection = await page.evaluate(() => {
      const s = window.__game.scenes.highscore.onslaughtInspector;
      return { ready: s.view?.ready, image: Boolean(s.liveTexture),
        text: s.container.children.filter(c => typeof c.text === 'string').map(c => c.text).join(' | '),
        buttons: s.buttons.length };
    });
    assert.ok(inspection.ready && inspection.image && inspection.buttons === 2, JSON.stringify(inspection));
    assert.ok(inspection.text.includes('FIXTURE PILOT') && inspection.text.includes('NOVA SPARROW'), JSON.stringify(inspection));
    await page.screenshot({ path: path.join(output, `inspect-${viewport.width}.png`) });
    await page.keyboard.press('Escape');
    for (const locale of ['en', 'de']) {
      await page.evaluate(async code => {
        await window.__novaI18n.setLanguagePreference(code);
        const { openOnslaughtLoadoutInspector } = await import('/src/ui/OnslaughtRecordsPanel.js');
        openOnslaughtLoadoutInspector(window.__game.scenes.highscore, {
          rank: 1, score: 31302, name: 'REAL-RECORD FIXTURE',
          startingLoadout: { shipId: 'nova_ship_30', augmentIds: ['shield', 'impact_foam', 'drones'] }
        });
      }, locale);
      await page.waitForFunction(() => window.__game.scenes.highscore.onslaughtInspector?.view?.ready, null, { timeout: 30000 });
      const locked = await page.evaluate(() => {
        const inspector = window.__game.scenes.highscore.onslaughtInspector;
        const warning = inspector.container.children.filter(child => typeof child.text === 'string').at(-1);
        const box = warning.getBounds();
        const button = inspector.buttons[0].button.getBounds();
        const panelHeight = Math.min(450, window.__game.app.screen.height - 54);
        const panelY = (window.__game.app.screen.height - panelHeight) / 2;
        return { warning: warning.text, top: box.y, bottom: box.y + box.height,
          cardBottom: panelY + 177 + 2 * 48 + 42, buttonTop: button.y };
      });
      assert.ok(locked.top >= locked.cardBottom + 4 && locked.bottom <= locked.buttonTop - 4,
        `Locked record explanation must clear cards and actions (${locale}): ${JSON.stringify(locked)}`);
      await page.screenshot({ path: path.join(output, `inspect-locked-${locale}-${viewport.width}.png`) });
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => window.__novaI18n.setLanguagePreference('en'));
    await page.evaluate(() => window.__game.switchScene('menu'));
    await page.evaluate(() => { void window.__game.startGame(window.__game.selectedShipSpriteKey, { runMode: 'overrun_tactical' }); });
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'LAUNCH ONSLAUGHT', exact: true }).click();
    await page.waitForFunction(() => window.__game.currentScene === window.__game.scenes.play, null, { timeout: 60000 });
    await page.evaluate(() => window.__game.scenes.play.showMayhemRoutineReinforcementWarning({ route: 'bottom', warningMs: 1200 }));
    await page.waitForTimeout(280);
    const bottomCue = await page.evaluate(() => window.__game.scenes.play.uiOverlay.children
      .some(child => child.label === 'onslaught_bottom_entry_warning'));
    assert.equal(bottomCue, true, 'bottom reinforcement warning must mark the incoming edge');
    await page.screenshot({ path: path.join(output, `bottom-warning-${viewport.width}.png`) });
    await page.waitForTimeout(1300);
    assert.equal(await page.evaluate(() => window.__game.scenes.play.uiOverlay.children
      .some(child => child.label === 'onslaught_bottom_entry_warning')), false, 'warning must clean up after entry');
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`[onslaught-followup-ui] PASS ${viewport.width}x${viewport.height}`);
  }
} finally {
  await browser.close();
}
