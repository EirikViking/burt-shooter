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

    await page.goto(`${baseUrl}/?enjin_test=1`, { waitUntil: navigationWaitUntil });
    await page.waitForSelector('[data-enjin-action="start"]');
    await page.waitForFunction(() => window.__enjinMvp?.mode === 'landing', null, { timeout: 60_000 });
    await page.screenshot({ path: path.join(outputDir, 'landing-1280x720.png'), fullPage: true });
    assert.match(await page.locator('#enjin-shell').innerText(), /NOVA SWARM: WEB3 ARCADE/);
    assert.match(await page.locator('#enjin-shell').innerText(), /NO PURCHASE NECESSARY/);
    assert.match(await page.locator('#enjin-shell').innerText(), /MAYHEM TACTICAL/);
    assert.match(await page.locator('#enjin-shell').innerText(), /MAIN MODE/);
    assert.match(await page.locator('#enjin-shell').innerText(), /STEAM BUILD ONLY/);
    assert.match(await page.locator('#enjin-shell').innerText(), /THE EIRIK VAULT/);
    assert.match(await page.locator('#enjin-shell').innerText(), /THE FULL SWARM CONTINUES ON STEAM/);
    assert.ok(await page.locator('.enjin-mode-card.disabled').count() >= 2, 'Enjin edition exposes another active mode');

    await page.locator('[data-enjin-action="start"]').click();
    await page.waitForFunction(() => window.__enjinMvp?.mode === 'playing', null, { timeout: interactionTimeout });
    const playingState = await page.evaluate(() => window.__enjinMvp.debugState());
    assert.equal(playingState.runMode, 'ranked_tactical');
    assert.equal(playingState.modeLock, 'ranked_tactical');
    await page.evaluate(async () => window.__enjinMvp.debugCompleteForTest());
    await page.waitForFunction(() => window.__enjinMvp?.mode === 'complete', null, { timeout: interactionTimeout });
    await page.waitForSelector('[data-enjin-qr] svg');
    const completionCopy = await page.locator('#enjin-shell').innerText();
    assert.match(completionCopy, /CLAIM YOUR FREE ENJIN NFT/);
    assert.match(completionCopy, /CONTINUE BEYOND 25,000 ON STEAM/);
    assert.match(completionCopy, /THE FULL SWARM DOESN'T STOP HERE/);
    await page.screenshot({ path: path.join(outputDir, 'vault-complete-1280x720.png'), fullPage: true });

    const frozenState = await page.evaluate(() => {
      const before = window.__enjinMvp.debugState();
      window.advanceTime(5000);
      const after = window.__enjinMvp.debugState();
      return { before, after, text: window.render_game_to_text() };
    });
    assert.equal(frozenState.before.score, 25_000);
    assert.equal(frozenState.after.score, 25_000);
    assert.equal(frozenState.after.frozen, true);
    assert.equal(frozenState.after.completed, true);
    assert.match(frozenState.text, /"score":25000/);
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
    const retryPage = await retryContext.newPage();
    await retryPage.goto(`${baseUrl}/?enjin_test=1`, { waitUntil: navigationWaitUntil });
    await retryPage.waitForFunction(() => window.__enjinMvp?.mode === 'landing', null, { timeout: 60_000 });
    await retryPage.locator('[data-enjin-action="start"]').click();
    await retryPage.waitForFunction(() => window.__enjinMvp?.mode === 'playing', null, { timeout: interactionTimeout });
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
        'landing_copy_and_free_play',
        'mayhem_tactical_only_mode_lock',
        'exact_25000_completion',
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
