import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4492));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/tactical-augment-tray-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
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
  throw new Error(`No available tactical augment tray port found starting at ${startPort}`);
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

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function overlaps(a, b, margin = 0) {
  return a && b
    && a.x < b.x + b.width + margin
    && a.x + a.width + margin > b.x
    && a.y < b.y + b.height + margin
    && a.y + a.height + margin > b.y;
}

async function setAugments(page, ids, consumedIds = []) {
  return page.evaluate(({ selectedIds, consumedIds: consumed }) => {
    const play = window.__game?.scenes?.play;
    const player = play?.player;
    const hud = play?.hud;
    if (!play || !player || !hud) return { ok: false, reason: 'missing play/player/hud' };
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    player.runAugmentIds = [...selectedIds];
    player.consumedRunAugmentIds = [...consumed];
    hud.update();
    const toBounds = (display) => {
      const bounds = display?.getBounds?.();
      return bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null;
    };
    return {
      ok: true,
      debug: structuredClone(hud.tacticalAugmentGroup?._debugTacticalAugments || null),
      items: hud.tacticalAugmentItems
        .filter((item) => item.container.visible)
        .map((item) => structuredClone(item.container._debugTacticalAugment)),
      bounds: {
        tray: toBounds(hud.tacticalAugmentGroup),
        leftPanel: toBounds(hud.leftPanel),
        rightPanel: toBounds(hud.rightPanel),
        activePowerup: hud.activePowerupGroup?.visible ? toBounds(hud.activePowerupGroup) : null
      }
    };
  }, { selectedIds: ids, consumedIds });
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const failures = [];
const report = { ok: false, baseUrl, outputDir, scenarios: {}, pageErrors, consoleErrors, failures };
try {
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.hud, null, { timeout: 90000 });
  await page.waitForTimeout(650);

  const desktopIds = [
    'damage_up', 'damage_up', 'drones', 'drones', 'rapid_fire', 'pierce', 'speed_up',
    'shield', 'magnet', 'bomb', 'orbital_strike'
  ];
  const desktop = await setAugments(page, desktopIds);
  await page.waitForTimeout(180);
  desktop.screenshot = path.join(outputDir, 'tactical-augment-tray-1920x1080.png');
  await page.screenshot({ path: desktop.screenshot, fullPage: true });
  report.scenarios.desktop = desktop;
  if (!desktop.ok || !desktop.debug?.visible) failures.push(`desktop tray missing: ${JSON.stringify(desktop)}`);
  if (desktop.debug?.doctrine?.id !== 'arsenal_network' || desktop.debug?.doctrine?.stage !== 'ASCENDANT') {
    failures.push(`desktop doctrine mismatch: ${JSON.stringify(desktop.debug?.doctrine)}`);
  }
  if (desktop.debug?.selectedCount !== desktopIds.length) failures.push(`desktop selected count mismatch: ${desktop.debug?.selectedCount}`);
  if (desktop.debug?.uniqueCount !== 10 || desktop.debug?.fusionCount !== 1) failures.push(`desktop augment/fusion count mismatch: ${JSON.stringify(desktop.debug)}`);
  if (desktop.debug?.visibleEntries?.[0] !== 'sky_verdict') failures.push('active Fusion Protocol was not prioritized in the HUD tray');
  if (desktop.debug?.entries?.find((entry) => entry.id === 'damage_up')?.stacks !== 2) failures.push('damage stack was not grouped as x2');
  if (desktop.debug?.entries?.find((entry) => entry.id === 'damage_up')?.name !== 'WARHEAD AUTHORITY') failures.push('damage stack did not use its evolution identity');
  if (desktop.debug?.entries?.find((entry) => entry.id === 'drones')?.stacks !== 2) failures.push('drone stack was not grouped as x2');
  if (desktop.debug?.entries?.find((entry) => entry.id === 'drones')?.name !== 'DRONE WING') failures.push('drone stack did not use its evolution identity');
  if (!desktop.items?.some((item) => item.id === 'damage_up' && item.stacks === 2)) failures.push('visible damage x2 badge debug state missing');
  if (!desktop.items?.some((item) => item.id === 'drones' && item.stacks === 2)) failures.push('visible drones x2 badge debug state missing');
  if (!(desktop.debug?.hiddenCount > 0) || !desktop.items?.some((item) => item.overflow && item.hiddenCount === desktop.debug.hiddenCount)) {
    failures.push(`desktop overflow indicator mismatch: ${JSON.stringify(desktop.items)}`);
  }
  if (desktop.debug?.overlapsRightHud || overlaps(desktop.bounds?.tray, desktop.bounds?.rightPanel)) failures.push('desktop tray overlaps right HUD');
  if (overlaps(desktop.bounds?.tray, desktop.bounds?.leftPanel)) failures.push('desktop tray overlaps left status panel');
  if (desktop.bounds?.tray?.x < 0 || desktop.bounds?.tray?.y < 0 || desktop.bounds?.tray?.x + desktop.bounds?.tray?.width > 1920 || desktop.bounds?.tray?.y + desktop.bounds?.tray?.height > 1080) {
    failures.push(`desktop tray outside viewport: ${JSON.stringify(desktop.bounds?.tray)}`);
  }

  const aceClearance = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const toBounds = (node) => {
      const bounds = node?.getBounds?.();
      return bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null;
    };
    const display = play?.createAceContactDossier?.({
      edgeAligned: true,
      accent: 0xffd15c,
      secondaryAccent: 0x7df9ff,
      aceDossier: {
        title: 'ACE CONTRACT',
        primary: '#0026',
        action: 'DESTROY THE GOLD-MARKED ACE',
        reward: 'REWARD: SCORE CACHE',
        danger: 'ATTACK: VOLLEY',
        protocol: 'NEMESIS',
        wing: 'RIVAL WING'
      }
    }, { width: 1920, height: 1080, maxWidth: 500, y: 270 });
    if (display) display.alpha = 1;
    const result = {
      dossier: toBounds(display),
      augments: toBounds(play?.hud?.tacticalAugmentGroup),
      debug: structuredClone(display?.__aceDossierDebug || null)
    };
    return result;
  });
  aceClearance.screenshot = path.join(outputDir, 'ace-contract-augment-clearance-1920x1080.png');
  await page.screenshot({ path: aceClearance.screenshot, fullPage: true });
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const display = play?.uiOverlay?.children?.find?.((child) => child?.label === 'ace_contact_dossier');
    if (display?.parent) display.parent.removeChild(display);
    display?.destroy?.({ children: true });
  });
  report.scenarios.aceClearance = aceClearance;
  if (!aceClearance.dossier || !aceClearance.augments || overlaps(aceClearance.dossier, aceClearance.augments, 10)) {
    failures.push(`Ace Contract overlaps active augments: ${JSON.stringify(aceClearance)}`);
  }
  if (aceClearance.debug?.avoidsAugmentTray !== true) {
    failures.push(`Ace Contract did not report augment clearance: ${JSON.stringify(aceClearance.debug)}`);
  }

  await page.setViewportSize({ width: 840, height: 640 });
  await page.waitForTimeout(320);
  const compact = await setAugments(page, desktopIds);
  await page.waitForTimeout(180);
  compact.screenshot = path.join(outputDir, 'tactical-augment-tray-840x640.png');
  await page.screenshot({ path: compact.screenshot, fullPage: true });
  report.scenarios.compact = compact;
  if (!compact.debug?.visible || !compact.debug?.compact) failures.push(`compact mode not active: ${JSON.stringify(compact.debug)}`);
  if (!compact.debug?.doctrine?.display || compact.debug.doctrine.display === 'ARSENAL NETWORK') failures.push(`compact doctrine display missing stage: ${JSON.stringify(compact.debug?.doctrine)}`);
  if (compact.debug?.visibleEntries?.length !== 8) failures.push(`compact tray should expose the requested 2x4 grid: ${compact.debug?.visibleEntries?.length}`);
  if (compact.debug?.columns !== 4 || compact.debug?.rows !== 2) failures.push(`compact tray grid mismatch: ${JSON.stringify(compact.debug)}`);
  if (!(compact.debug?.hiddenCount > 0)) failures.push('compact tray did not cap with overflow');
  if (compact.debug?.overlapsRightHud || overlaps(compact.bounds?.tray, compact.bounds?.rightPanel)) failures.push('compact tray overlaps right HUD');
  if (overlaps(compact.bounds?.tray, compact.bounds?.leftPanel)) failures.push('compact tray overlaps left status panel');
  if (compact.bounds?.tray?.x < 0 || compact.bounds?.tray?.y < 0 || compact.bounds?.tray?.x + compact.bounds?.tray?.width > 840 || compact.bounds?.tray?.y + compact.bounds?.tray?.height > 640) {
    failures.push(`compact tray outside viewport: ${JSON.stringify(compact.bounds?.tray)}`);
  }
  const compactAceClearance = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const toBounds = (node) => {
      const bounds = node?.getBounds?.();
      return bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null;
    };
    const display = play?.createAceContactDossier?.({
      edgeAligned: true,
      accent: 0xffd15c,
      secondaryAccent: 0x7df9ff,
      aceDossier: {
        title: 'ACE CONTRACT', primary: '#0026', action: 'DESTROY THE GOLD-MARKED ACE',
        reward: 'REWARD: SCORE CACHE', danger: 'ATTACK: VOLLEY'
      }
    }, { width: 840, height: 640, maxWidth: 460, y: 176 });
    if (display) display.alpha = 1;
    return {
      dossier: toBounds(display),
      augments: toBounds(play?.hud?.tacticalAugmentGroup),
      debug: structuredClone(display?.__aceDossierDebug || null)
    };
  });
  report.scenarios.compactAceClearance = compactAceClearance;
  if (!compactAceClearance.dossier || !compactAceClearance.augments || overlaps(compactAceClearance.dossier, compactAceClearance.augments, 10)) {
    failures.push(`compact Ace Contract overlaps active augments: ${JSON.stringify(compactAceClearance)}`);
  }
  if (compactAceClearance.debug?.avoidsAugmentTray !== true) {
    failures.push(`compact Ace Contract did not report augment clearance: ${JSON.stringify(compactAceClearance.debug)}`);
  }
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const display = play?.uiOverlay?.children?.find?.((child) => child?.label === 'ace_contact_dossier');
    if (display?.parent) display.parent.removeChild(display);
    display?.destroy?.({ children: true });
  });

  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('de'));
  await page.waitForTimeout(100);
  const localized = await setAugments(page, desktopIds);
  localized.screenshot = path.join(outputDir, 'tactical-augment-tray-840x640-de.png');
  await page.screenshot({ path: localized.screenshot, fullPage: true });
  report.scenarios.localized = localized;
  if (!localized.debug?.doctrine?.display || /ARSENAL NETWORK|ASCENDANT/.test(localized.debug.doctrine.display)) {
    failures.push(`localized doctrine remained English: ${JSON.stringify(localized.debug?.doctrine)}`);
  }
  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('en'));

  const consumed = await setAugments(page, ['nano_patch', 'damage_up'], ['nano_patch']);
  report.scenarios.consumed = consumed;
  if (consumed.debug?.visibleEntries?.includes('nano_patch') || consumed.debug?.activeCount !== 1 || consumed.debug?.consumedCount !== 1) {
    failures.push(`consumed one-shot augment leaked into HUD: ${JSON.stringify(consumed.debug)}`);
  }
  if (consumed.debug?.doctrine?.id !== 'gunship' || consumed.debug?.doctrine?.totalPicks !== 1) failures.push(`consumed doctrine mismatch: ${JSON.stringify(consumed.debug?.doctrine)}`);

  const unknownOnly = await setAugments(page, ['not_a_real_augment']);
  report.scenarios.unknownOnly = unknownOnly;
  if (unknownOnly.debug?.visible || unknownOnly.debug?.uniqueCount !== 0 || unknownOnly.debug?.selectedCount !== 1) {
    failures.push(`unknown augment handling mismatch: ${JSON.stringify(unknownOnly.debug)}`);
  }
  const empty = await setAugments(page, []);
  report.scenarios.empty = empty;
  if (empty.debug?.visible || empty.debug?.selectedCount !== 0) failures.push(`empty tray did not hide: ${JSON.stringify(empty.debug)}`);

  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);
  report.ok = failures.length === 0;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[tactical-augment-tray] ${failures.join('; ')}`);
  console.log(`[tactical-augment-tray] PASS desktop=${desktop.screenshot} compact=${compact.screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
