import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const output = process.env.CHECK_OUTPUT_DIR;
assert.ok(output && /^E:[\\/]/i.test(output), 'Use task-owned E: screenshot directory');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const [width, height, dpi] of [[1280, 720, 1], [1920, 1080, 1], [1280, 720, 1.5]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpi });
    await context.addInitScript(() => {
      localStorage.setItem('burt_voice_enabled', 'false');
      localStorage.setItem('burt_boss_voice_enabled', 'false');
      localStorage.setItem('burt_cta_voice_enabled', 'true');
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack));
    await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:4199'}/?skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.scenes?.menu?.menuOptions?.length > 0
      && document.querySelector('#loading')?.style.display === 'none', null, { timeout: 120000 });
    const tab = await page.evaluate(() => {
      const menu = window.__game.scenes.menu;
      menu.openSettingsOverlay();
      return menu.settingsOverlay.getDebugState().pages.audio.bounds;
    });
    await page.mouse.click(tab.x + tab.width / 2, tab.y + tab.height / 2);
    const state = await page.evaluate(async () => {
      const { AudioManager } = await import('/src/audio/AudioManager.js');
      const menu = window.__game.scenes.menu;
      return { audio: AudioManager.getSettings(), debug: menu.settingsOverlay.getDebugState() };
    });
    assert.equal(state.debug.activePage, 'audio');
    const warning = state.debug.visibleControls.find(control => control.id === 'toggle_tactical_warnings');
    const voice = state.debug.visibleControls.find(control => control.id === 'toggle_voice');
    const testButtons = state.debug.visibleControls.filter(control => control.id === 'test_voice' || control.id === 'test_sfx');
    assert.ok(warning && warning.bounds && testButtons.length === 2, `missing tactical warning control at ${width}x${height}`);
    assert.ok(voice && Math.abs(warning.bounds.x - voice.bounds.x) < 4 && warning.bounds.y > voice.bounds.y,
      `tactical warnings should follow Voice in the playback column at ${width}x${height}`);
    assert.ok(warning.bounds.y + warning.bounds.height < Math.min(...testButtons.map(control => control.bounds.y)) - 4,
      `tactical warning control overlaps test buttons at ${width}x${height}: ${JSON.stringify({ warning, testButtons })}`);
    assert.equal(state.audio?.voiceEnabled, false);
    assert.equal(state.audio?.bossVoiceEnabled, false);
    assert.equal(state.audio?.ctaVoiceEnabled, true);
    assert.equal(state.audio?.tacticalVoiceEnabled, true);
    const tooltip = await page.evaluate(() => {
      const overlay = window.__game.scenes.menu.settingsOverlay;
      const getHint = id => {
        const index = overlay.controls.findIndex(control => control.id === id);
        overlay.setControlFocus(index);
        return overlay.audioHelpText?.text;
      };
      return {
        warning: getHint('toggle_tactical_warnings'),
        voice: getHint('toggle_voice'),
        slider: getHint('slider_voice'),
        test: getHint('test_voice'),
        menu: getHint('page_audio')
      };
    });
    assert.match(tooltip.warning, /incoming threats/);
    assert.match(tooltip.voice, /optional gameplay narration/);
    assert.match(tooltip.slider, /including warnings/);
    assert.match(tooltip.test, /sample voice line/);
    assert.match(tooltip.menu, /which sounds play/);
    await page.mouse.move(warning.bounds.x + warning.bounds.width / 2, warning.bounds.y + warning.bounds.height / 2);
    const pointerHint = await page.evaluate(() => window.__game.scenes.menu.settingsOverlay.audioHelpText?.text);
    assert.match(pointerHint, /incoming threats/, 'mouse hover must explain Tactical Warnings');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(output, `audio-warnings-${width}x${height}-${dpi}x.png`) });
    await context.close();
    console.log(`[tactical-warning-settings] PASS ${width}x${height} ${dpi}x`);
  }
} finally { await browser.close(); }
