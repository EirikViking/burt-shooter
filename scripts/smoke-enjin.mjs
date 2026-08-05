import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
const outputDir = path.join(root, 'test-results', `enjin-mvp-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}`);
const port = 4174;
const remoteBaseUrl = process.env.ENJIN_SMOKE_BASE_URL?.replace(/\/$/, '');
const baseUrl = remoteBaseUrl || `http://127.0.0.1:${port}`;
const navigationWaitUntil = remoteBaseUrl ? 'domcontentloaded' : 'networkidle';
const interactionTimeout = remoteBaseUrl ? 60_000 : 30_000;
const smokeUrl = () => `${baseUrl}/?enjin_test=1&cb=${Date.now()}`;
const chromeExecutablePath = process.env.CHROME_PATH
  || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/?enjin_test=1`);
      if (response.ok) return;
    } catch {
      // The preview process is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Enjin preview did not start');
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const server = remoteBaseUrl ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverLog = '';
  server?.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
  server?.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });
  const browser = await chromium.launch({
    headless: true,
    ...(chromeExecutablePath ? { executablePath: chromeExecutablePath } : {})
  });
  try {
    await waitForServer();
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.addInitScript(() => {
      window.__fullscreenRequestCount = 0;
      const nativeRequestFullscreen = Element.prototype.requestFullscreen;
      if (typeof nativeRequestFullscreen === 'function') {
        Element.prototype.requestFullscreen = function (...args) {
          window.__fullscreenRequestCount += 1;
          return nativeRequestFullscreen.apply(this, args);
        };
      }
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const localApiFallbacks = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const location = message.location();
        if (location.url?.startsWith(`${baseUrl}/api/enjin/`)) {
          localApiFallbacks.push(`${message.text()} @ ${location.url}`);
          return;
        }
        consoleErrors.push(`${message.text()}${location.url ? ` @ ${location.url}` : ''}`);
      }
    });

    await page.goto(smokeUrl(), { waitUntil: navigationWaitUntil });
    await page.waitForFunction(() => window.__enjinMvp?.mode === 'menu' && window.__game?.currentSceneName === 'menu', null, { timeout: 60_000 });
    await page.screenshot({ path: path.join(outputDir, 'main-menu-1280x720.png'), fullPage: true });
    assert.equal(await page.locator('[data-enjin-action="start"]').count(), 0, 'Enjin landing screen still intercepts the main menu');
    const mainMenuState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(mainMenuState.enjin.mode, 'menu');
    assert.equal(mainMenuState.menu.launchDeck.cards.mayhemTactical.runMode, 'ranked_tactical');
    assert.equal(mainMenuState.menu.launchDeck.cards.daily.sublabel, 'STEAM BUILD ONLY');
    assert.equal(mainMenuState.menu.launchDeck.cards.scout.sublabel, 'STEAM BUILD ONLY');
    assert.equal(mainMenuState.menu.launchDeck.cards.overrun.sublabel, 'STEAM BUILD ONLY');
    assert.ok(!mainMenuState.menu.optionOrder.includes('dailySignal'), 'Enjin menu made Daily Challenge selectable');
    assert.ok(!mainMenuState.menu.optionOrder.includes('scout'), 'Enjin menu made Scout Run selectable');
    assert.ok(!mainMenuState.menu.optionOrder.includes('overrun'), 'Enjin menu made Overrun selectable');
    assert.equal(await page.locator('#enjin-shell').innerText(), '', 'Enjin menu shell should not replace the game menu');

    const blockedModeBounds = mainMenuState.menu.launchDeck.cards.daily.bounds;
    await page.mouse.click(blockedModeBounds.x + blockedModeBounds.width / 2, blockedModeBounds.y + blockedModeBounds.height / 2);
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text());
      return state.scene === 'menu' && state.enjin?.mode === 'menu' && state.menu?.exitNoticeText === 'FULL STEAM VERSION REQUIRED';
    }, null, { timeout: interactionTimeout });
    const blockedModeState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(blockedModeState.scene, 'menu');
    assert.equal(blockedModeState.enjin.mode, 'menu');
    assert.equal(blockedModeState.menu.exitNoticeText, 'FULL STEAM VERSION REQUIRED');
    assert.equal(new URL(page.url()).hostname, new URL(baseUrl).hostname, 'Steam-only mode click navigated away from the game');
    await page.screenshot({ path: path.join(outputDir, 'steam-only-notice-1280x720.png'), fullPage: true });

    const launchBounds = mainMenuState.menu.launchDeck.cards.mayhemTactical.bounds;
    await page.mouse.click(launchBounds.x + launchBounds.width / 2, launchBounds.y + launchBounds.height / 2);
    await page.waitForFunction(() => window.__enjinMvp?.mode === 'playing', null, { timeout: interactionTimeout });
    const playingState = await page.evaluate(() => window.__enjinMvp.debugState());
    assert.equal(playingState.runMode, 'ranked_tactical');
    assert.equal(playingState.modeLock, 'ranked_tactical');
    assert.equal(await page.evaluate(() => window.__fullscreenRequestCount), 1, 'Mayhem Tactical launch did not request browser fullscreen');
    assert.equal(playingState.fullscreenRequested, true);
    assert.equal(new URL(page.url()).hostname, new URL(baseUrl).hostname, 'Mayhem Tactical launch navigated away from the game');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.advanceTime(900));
    const combatState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(combatState.scene, 'play');
    assert.ok(combatState.counts.enemies > 0, 'Enjin gameplay has no visible enemies after the fast opening beat');
    assert.equal(combatState.highscoreChase.source, 'enjin_edition');
    const firstKillCueState = await page.evaluate(() => {
      window.__game.addScore(100, 'mvp_test_first_enemy');
      const text = JSON.parse(window.render_game_to_text());
      return {
        highscoreChase: text.highscoreChase,
        personalBestCelebration: text.personalBestCelebration,
        personalBestToasts: (text.toast?.active || []).filter((toast) => /PERSONAL BEST/i.test(String(toast.text || '')))
      };
    });
    assert.equal(firstKillCueState.highscoreChase.targetScore, 0, 'Enjin run loaded a personal-best target');
    assert.equal(firstKillCueState.personalBestCelebration.active, false, 'Enjin first kill opened a personal-best celebration');
    assert.equal(firstKillCueState.personalBestToasts.length, 0, 'Enjin first kill showed a personal-best toast');
    await page.screenshot({ path: path.join(outputDir, 'playing-1280x720.png'), fullPage: true });
    assert.match(await page.locator('#enjin-shell').innerText(), /VAULT SCORE/);
    await page.evaluate(async () => window.__enjinMvp.debugCompleteForTest());
    await page.waitForFunction(() => window.__enjinMvp?.mode === 'complete', null, { timeout: interactionTimeout });
    await page.waitForSelector('[data-enjin-qr] svg');
    const completionCopy = await page.locator('#enjin-shell').innerText();
    assert.match(completionCopy, /CLAIM YOUR FREE ENJIN NFT/);
    assert.match(completionCopy, /CONTINUE BEYOND 30,000 ON STEAM/);
    assert.match(completionCopy, /THE FULL SWARM DOESN'T STOP HERE/);
    await page.screenshot({ path: path.join(outputDir, 'vault-complete-1280x720.png'), fullPage: true });

    const frozenState = await page.evaluate(() => {
      const before = window.__enjinMvp.debugState();
      window.advanceTime(5000);
      const after = window.__enjinMvp.debugState();
      return { before, after, text: window.render_game_to_text() };
    });
    assert.equal(frozenState.before.score, 30_000);
    assert.equal(frozenState.after.score, 30_000);
    assert.equal(frozenState.after.frozen, true);
    assert.equal(frozenState.after.completed, true);
    assert.match(frozenState.text, /"score":30000/);
    assert.ok(!await page.locator('[data-enjin-action="retry"]').count(), 'completed identity received retry');

    const steamHref = await page.locator('[data-enjin-action="steam"]').getAttribute('href');
    assert.equal(steamHref, null, 'Steam action must be a tracked button');
    const steamUrl = await page.evaluate(() => window.__enjinMvp.debugState().steamUrl);
    const parsedSteam = new URL(steamUrl);
    assert.equal(parsedSteam.pathname, '/app/4765070/');
    assert.equal(parsedSteam.searchParams.get('utm_source'), 'tinyfoundry');
    assert.equal(parsedSteam.searchParams.get('utm_medium'), 'enjin_web3_arcade');
    assert.equal(parsedSteam.searchParams.get('utm_campaign'), 'eirik_viking_vault');
    assert.equal(parsedSteam.searchParams.get('utm_content'), 'vault_complete');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outputDir, 'claim-mobile-390x844.png'), fullPage: true });
    assert.ok(await page.locator('.enjin-mobile-only[data-enjin-action="open-claim"]').count(), 'mobile claim CTA missing');
    assert.match(await page.locator('.enjin-mobile-only[data-enjin-action="open-claim"]').innerText(), /OPEN ENJIN CLAIM/);
    await page.reload({ waitUntil: navigationWaitUntil });
    await page.waitForFunction(() => window.__enjinMvp?.mode === 'complete');
    assert.ok(!await page.locator('[data-enjin-action="start"]').count(), 'completed identity can start again after refresh');

    const retryContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await retryContext.addInitScript(() => {
      window.__fullscreenRequestCount = 0;
      const nativeRequestFullscreen = Element.prototype.requestFullscreen;
      if (typeof nativeRequestFullscreen === 'function') {
        Element.prototype.requestFullscreen = function (...args) {
          window.__fullscreenRequestCount += 1;
          return nativeRequestFullscreen.apply(this, args);
        };
      }
    });
    const retryPage = await retryContext.newPage();
    await retryPage.goto(smokeUrl(), { waitUntil: navigationWaitUntil });
    await retryPage.waitForFunction(() => window.__enjinMvp?.mode === 'menu' && window.__game?.currentSceneName === 'menu', null, { timeout: 60_000 });
    const retryMenuState = await retryPage.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(retryMenuState.menu.launchDeck.cards.mayhemTactical.runMode, 'ranked_tactical');
    await retryPage.keyboard.press('Enter');
    await retryPage.waitForFunction(() => window.__enjinMvp?.mode === 'playing', null, { timeout: interactionTimeout });
    assert.equal(await retryPage.evaluate(() => window.__fullscreenRequestCount), 1, 'Keyboard Mayhem Tactical launch did not request browser fullscreen');
    await retryPage.evaluate(() => window.__enjinMvp.debugFailForTest());
    await retryPage.waitForFunction(() => window.__enjinMvp?.mode === 'failed');
    assert.match(await retryPage.locator('#enjin-shell').innerText(), /TRY AGAIN/);
    await retryPage.locator('[data-enjin-action="retry"]').click();
    await retryPage.waitForFunction(() => window.__enjinMvp?.mode === 'playing', null, { timeout: interactionTimeout });
    await retryPage.screenshot({ path: path.join(outputDir, 'below-threshold-retry-1280x720.png'), fullPage: true });
    await retryContext.close();

    assert.equal(consoleErrors.length, 0, `browser console errors: ${consoleErrors.join(' | ')}`);
    await context.close();
    const report = {
      status: 'passed',
      baseUrl,
      outputDir,
      assertions: [
        'main_menu_free_play',
        'direct_main_menu_entry',
        'mayhem_tactical_only_mode_lock',
        'steam_only_mode_notice',
        'exact_30000_completion',
        'post_gate_state_is_frozen_after_5_seconds',
        'claim_qr_renders_locally',
        'steam_utm_link',
        'refresh_restores_completion_without_replay',
        'below_threshold_retry'
      ],
      consoleErrors,
      localApiFallbacks,
      serverLog: serverLog.replaceAll(/https:\/\/[^\s]+/g, '[redacted-url]')
    };
    await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    server?.kill();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
