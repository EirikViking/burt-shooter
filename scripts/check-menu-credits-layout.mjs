import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4346));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-credits-layout-${timestamp()}`);
const viewport = {
  width: Number(process.env.CHECK_WIDTH) || 1920,
  height: Number(process.env.CHECK_HEIGHT) || 1000
};
const checkMenuFrame = process.env.CHECK_MENU_FRAME !== '0';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available check port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function contains(outer, inner, pad = 0) {
  if (!outer || !inner) return false;
  return (
    inner.x >= outer.x - pad &&
    inner.y >= outer.y - pad &&
    inner.right <= outer.x + outer.width + pad &&
    inner.bottom <= outer.y + outer.height + pad
  );
}

function outsideFrameFailures(panel, items, keys) {
  return keys
    .map((key) => ({ key, bounds: items?.[key] }))
    .filter(({ bounds }) => bounds && !contains(panel, bounds, 5));
}

function intersects(a, b, pad = 0) {
  if (!a || !b) return false;
  return !(
    a.right <= b.x + pad ||
    b.right <= a.x + pad ||
    a.bottom <= b.y + pad ||
    b.bottom <= a.y + pad
  );
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', { timeout: 30000 });
  await page.waitForTimeout(700);

  const menuState = await readState(page);
  const menuPanel = menuState.menu?.panel;
  const menuItems = menuState.menu?.items || {};
  const menuFailures = outsideFrameFailures(menuPanel, menuItems, [
    'hangarButton',
    'highscoresButton',
    'threatCodexButton',
    'achievementsButton',
    'settingsButton'
  ]);

  await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    scene?.openSettingsOverlay?.();
    scene?.settingsOverlay?.openCreditsPanel?.();
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return Boolean(state?.overlays?.credits && state?.settingsOverlay?.credits?.panel);
  }, { timeout: 5000 });
  await page.waitForTimeout(1300);
  const creditsState = await readState(page);
  const credits = creditsState.settingsOverlay?.credits || {};
  const creditsFailures = outsideFrameFailures(credits.panel, credits, [
    'title',
    'subtitle',
    'art',
    'body',
    'footer',
    'coin',
    'eggStatus',
    'backButton'
  ]);
  const overlapFailures = [
    intersects(credits.subtitle, credits.art, 4) ? 'credits subtitle overlaps art' : null,
    intersects(credits.subtitle, credits.body, 4) ? 'credits subtitle overlaps body text' : null,
    intersects(credits.subtitle, credits.footer, 4) ? 'credits subtitle overlaps footer' : null,
    intersects(credits.art, credits.body, 8) ? 'credits art overlaps body text' : null,
    intersects(credits.art, credits.footer, 8) ? 'credits art overlaps footer' : null,
    intersects(credits.art, credits.backButton, 8) ? 'credits art overlaps back button' : null,
    intersects(credits.body, credits.footer, 8) ? 'credits body overlaps footer' : null,
    intersects(credits.body, credits.backButton, 8) ? 'credits body overlaps back button' : null,
    intersects(credits.footer, credits.backButton, 6) ? 'credits footer overlaps back button' : null,
    intersects(credits.footer, credits.coin, 4) ? 'credits footer overlaps cabinet seal' : null,
    intersects(credits.footer, credits.eggStatus, 4) ? 'credits footer overlaps cabinet seal status' : null,
    intersects(credits.backButton, credits.coin, 4) ? 'credits back button overlaps cabinet seal' : null,
    intersects(credits.backButton, credits.eggStatus, 4) ? 'credits back button overlaps cabinet seal status' : null,
    intersects(credits.coin, credits.eggStatus, 2) ? 'credits cabinet seal overlaps status text' : null
  ].filter(Boolean);

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, `menu-credits-layout-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const eggTrigger = await page.evaluate(() => {
    const overlay = window.__game?.currentScene?.settingsOverlay;
    const coin = overlay?.creditsPanel?.children?.find((child) => child?.label === 'ui_creditsCabinetSeal');
    if (!overlay || !coin || typeof overlay.triggerCreditsEasterEgg !== 'function') {
      return { ok: false, reason: 'credits cabinet seal unavailable' };
    }
    window.__novaCreditsAscendantEasterEggRandom = () => 1;
    overlay.triggerCreditsEasterEgg(coin);
    overlay.triggerCreditsEasterEgg(coin);
    overlay.triggerCreditsEasterEgg(coin);
    return { ok: true };
  });
  await page.waitForTimeout(520);
  const revealState = await readState(page);
  const revealCredits = revealState.settingsOverlay?.credits || {};
  const unlockText = revealCredits.unlockRevealText || {};
  const revealFailures = [
    !eggTrigger.ok ? eggTrigger.reason : null,
    !revealCredits.unlockReveal ? 'credits unlock reveal missing' : null,
    !/CONGRATULATIONS/i.test(String(unlockText.title || '')) ? 'credits unlock reveal title missing congratulations' : null,
    !/NEW SHIP/i.test(String(unlockText.subtitle || '')) ? 'credits unlock reveal subtitle missing new ship result' : null,
    !/QUASAR FAN/i.test(String(unlockText.ship || '')) ? 'credits unlock reveal ship name missing' : null
  ].filter(Boolean);

  const revealScreenshot = path.join(outputDir, `menu-credits-unlock-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: revealScreenshot, fullPage: true });

  const alreadyUnlockedTrigger = await page.evaluate(() => {
    const overlay = window.__game?.currentScene?.settingsOverlay;
    const coin = overlay?.creditsPanel?.children?.find((child) => child?.label === 'ui_creditsCabinetSeal');
    if (!overlay || !coin) return { ok: false, reason: 'credits cabinet seal unavailable for repeat trigger' };
    if (overlay.creditsRevealTicker) {
      overlay.game.app.ticker.remove(overlay.creditsRevealTicker);
      overlay.creditsRevealTicker = null;
    }
    if (overlay.creditsUnlockReveal?.parent) {
      overlay.creditsUnlockReveal.parent.removeChild(overlay.creditsUnlockReveal);
    }
    overlay.creditsUnlockReveal = null;
    overlay.creditsCoinClicks = 0;
    overlay.triggerCreditsEasterEgg(coin);
    overlay.triggerCreditsEasterEgg(coin);
    overlay.triggerCreditsEasterEgg(coin);
    return {
      ok: true,
      revealActive: Boolean(overlay.creditsUnlockReveal?.parent),
      status: overlay.creditsEggStatusText?.text || ''
    };
  });
  const repeatFailures = [
    !alreadyUnlockedTrigger.ok ? alreadyUnlockedTrigger.reason : null,
    alreadyUnlockedTrigger.revealActive ? 'already-unlocked credits trigger opened a duplicate celebration' : null,
    !/already signed/i.test(String(alreadyUnlockedTrigger.status || '')) ? 'already-unlocked credits trigger lost its inline status' : null
  ].filter(Boolean);

  const report = {
    ok: Boolean(
      menuPanel &&
      (!checkMenuFrame || menuFailures.length === 0) &&
      credits.panel &&
      creditsFailures.length === 0 &&
      overlapFailures.length === 0 &&
      revealFailures.length === 0 &&
      repeatFailures.length === 0 &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    viewport,
    baseUrl,
    menuPanel,
    menuItems,
    menuFailures: checkMenuFrame ? menuFailures : [],
    skippedMenuFailures: checkMenuFrame ? [] : menuFailures,
    credits,
    creditsFailures,
    overlapFailures,
    revealCredits,
    revealFailures,
    alreadyUnlockedTrigger,
    repeatFailures,
    pageErrors,
    consoleErrors,
    screenshot,
    revealScreenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[menu-credits-layout] PASS screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
