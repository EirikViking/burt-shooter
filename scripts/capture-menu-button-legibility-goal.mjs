import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4788));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-button-legibility-goal-${timestamp()}`);
const viewports = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1280, height: 800, name: '1280x800' }
];
const variants = ['approved', 'derived'];
const focusCases = [
  { id: 'launch', index: 0, file: 'launch-focused' },
  { id: 'sectorStart', index: 1, file: 'sector-challenge-focused' },
  { id: 'threatCodex', index: 4, file: 'threat-codex-focused-unread-marker' },
  { id: 'exit', index: 9, file: 'top-right-utility-exit-focused' }
];
const iconFiles = {
  approved: {
    launch: 'public/art/generated/nova-swarm/menu/icons/approved-menu-icon-launch-run.png',
    sectorChallenge: 'public/art/generated/nova-swarm/menu/icons/approved-menu-icon-sector-challenge.png',
    shipHangar: 'public/art/generated/nova-swarm/menu/icons/approved-menu-icon-ship-hangar.png',
    leaderboard: 'public/art/generated/nova-swarm/menu/icons/approved-menu-icon-leaderboard.png',
    threatCodex: 'public/art/generated/nova-swarm/menu/icons/approved-menu-icon-threat-codex.png',
    achievements: 'public/art/generated/nova-swarm/menu/icons/approved-menu-icon-achievements.png',
    settings: 'public/art/generated/nova-swarm/menu/icons/approved-menu-icon-settings.png',
    music: 'public/art/generated/nova-swarm/menu/icons/approved-menu-icon-music.png',
    howToPlay: 'public/art/generated/nova-swarm/menu/icons/approved-menu-icon-how-to-play.png',
    exit: 'public/art/generated/nova-swarm/menu/icons/approved-menu-icon-exit.png'
  },
  derived: {
    launch: 'public/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-launch-run.png',
    sectorChallenge: 'public/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-sector-challenge.png',
    shipHangar: 'public/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-ship-hangar.png',
    leaderboard: 'public/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-leaderboard.png',
    threatCodex: 'public/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-threat-codex.png',
    achievements: 'public/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-achievements.png',
    settings: 'public/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-settings.png',
    music: 'public/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-music.png',
    howToPlay: 'public/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-how-to-play.png',
    exit: 'public/art/generated/nova-swarm/menu/icons/derived/derived-menu-glyph-exit.png'
  }
};

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
  throw new Error(`No available menu capture port found starting at ${startPort}`);
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
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function withQuery(query) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url.toString();
}

function makeProgress() {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 6800,
    pilotRank: 5,
    highestPilotRank: 5,
    totalRuns: 12,
    bestScore: 8848,
    bestSector: 32,
    bestLevel: 32,
    totalBossesDefeated: 10,
    totalWavesCleared: 72,
    totalCodexDiscoveries: 25,
    unlockedShipIds: ['nova_ship_01'],
    updatedAt: '2026-06-18T00:00:00.000Z'
  };
}

function challengeRecords() {
  return {
    version: 1,
    updatedAt: '2026-06-18T00:00:00.000Z',
    byCheckpoint: {
      30: {
        startSector: 30,
        scoreEarned: 8848,
        highestSectorReached: 32,
        finalSector: 32,
        shipId: 'nova_ship_01',
        shipName: 'Nova Sparrow',
        completedAt: '2026-06-18T00:00:00.000Z'
      }
    }
  };
}

function unreadDiscoveryPayload() {
  return {
    version: 1,
    items: {
      enemies: {
        menu_button_legibility_enemy: {
          id: 'menu_button_legibility_enemy',
          category: 'enemies',
          name: 'Menu Button Legibility Enemy',
          firstSeenAt: '2026-06-18T00:00:00.000Z',
          lastSeenAt: '2026-06-18T00:00:00.000Z',
          timesSeen: 1,
          timesDefeated: 0,
          timesSurvived: 0,
          timesKilledPlayer: 0,
          highestScoreDuringEncounter: 0,
          metadata: {}
        }
      }
    },
    discoveriesThisRun: [],
    recentRunThemes: [],
    unreadIds: ['enemies:menu_button_legibility_enemy'],
    updatedAt: '2026-06-18T00:00:00.000Z'
  };
}

async function seedProfile(page) {
  await page.addInitScript(({ progress, records, discovery }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: progress.bestScore,
      bestRank: progress.bestRank,
      bestLevel: progress.bestLevel
    }));
    localStorage.setItem('novaSwarm.sectorStartChallengeRecords.v1', JSON.stringify(records));
    localStorage.setItem('nova.threatDiscovery.v1', JSON.stringify(discovery));
  }, { progress: makeProgress(), records: challengeRecords(), discovery: unreadDiscoveryPayload() });
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function refreshMenuProfile(page) {
  await page.evaluate(({ progress, records, discovery }) => {
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: progress.bestScore,
      bestRank: progress.bestRank,
      bestLevel: progress.bestLevel
    }));
    localStorage.setItem('novaSwarm.sectorStartChallengeRecords.v1', JSON.stringify(records));
    localStorage.setItem('nova.threatDiscovery.v1', JSON.stringify(discovery));
    const menu = window.__game?.scenes?.menu;
    if (!menu) throw new Error('Menu scene missing while refreshing menu capture profile');
    menu.codexCuePollMs = 0;
    menu.refreshSectorStartState?.();
    const checkpoints = menu.sectorStartState?.checkpoints || [];
    const index = checkpoints.indexOf(30);
    if (index >= 0) {
      menu.selectedSectorStartIndex = index;
      menu.sectorStartState = { ...menu.sectorStartState, selectedCheckpoint: checkpoints[index] };
    }
    menu.updateSectorStartButton?.({ forceGpuRefresh: true });
    menu.layoutMenu?.({ forceLabelGpuRefresh: true });
  }, { progress: makeProgress(), records: challengeRecords(), discovery: unreadDiscoveryPayload() });
}

async function waitForMenu(page) {
  await page.waitForFunction(() => document.body?.dataset?.menuReady === '1', null, { timeout: 30000 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 30000 });
  await refreshMenuProfile(page);
  await page.waitForFunction(() => {
    const menu = JSON.parse(window.render_game_to_text?.() || '{}').menu;
    return menu?.menuIcons && Object.values(menu.menuIcons).every((entry) => entry.loaded && entry.spriteVisible);
  }, null, { timeout: 12000 });
  await page.waitForFunction(() => {
    const menu = window.__game?.scenes?.menu;
    return (menu?.startBtn?.alpha || 0) > 0.95 &&
      (menu?.sectorStartBtn?.alpha || 0) > 0.95 &&
      (menu?.threatCodexBtn?.alpha || 0) > 0.95 &&
      (menu?.exitBtn?.alpha || 0) > 0.95;
  }, null, { timeout: 12000 });
  await page.waitForFunction(() => {
    const menu = JSON.parse(window.render_game_to_text?.() || '{}').menu;
    return menu?.threatCodex?.markerVisible === true;
  }, null, { timeout: 12000 });
  await page.waitForTimeout(350);
  return readState(page);
}

async function focusMenuOption(page, index) {
  await page.evaluate((nextIndex) => {
    const menu = window.__game?.scenes?.menu;
    if (!menu) throw new Error('Menu scene missing while focusing option');
    menu.setMenuFocus(nextIndex);
    menu.updateMenuButtonMotion?.(10);
    menu.drawMenuPanel?.();
  }, index);
  await page.waitForTimeout(220);
  return readState(page);
}

async function cropImage(source, bounds, output) {
  const left = Math.max(0, Math.round(bounds.x));
  const top = Math.max(0, Math.round(bounds.y));
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  await sharp(source).extract({ left, top, width, height }).png().toFile(output);
  return output;
}

async function writeIconContactSheet(variant, state, output) {
  const entries = Object.entries(iconFiles[variant]);
  const cellWidth = 178;
  const cellHeight = 128;
  const pad = 18;
  const cols = 5;
  const rows = Math.ceil(entries.length / cols);
  const width = cols * cellWidth + pad * 2;
  const height = rows * cellHeight + pad * 2;
  const labels = entries.map(([key], index) => {
    const x = (index % cols) * cellWidth + pad + cellWidth / 2;
    const y = Math.floor(index / cols) * cellHeight + pad + 108;
    return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="11" fill="#dffcff" text-anchor="middle">${key}</text>`;
  }).join('');
  const base = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#030812"/>${entries.map(([,], index) => {
    const x = (index % cols) * cellWidth + pad + 14;
    const y = Math.floor(index / cols) * cellHeight + pad + 10;
    return `<rect x="${x}" y="${y}" width="${cellWidth - 28}" height="82" rx="8" fill="#061d2c" stroke="#24788f" stroke-opacity="0.55"/>`;
  }).join('')}${labels}</svg>`);
  const composites = [];
  for (const [index, [key, source]] of entries.entries()) {
    const bounds = state.menu?.menuIcons?.[key]?.bounds;
    const targetSize = Math.max(20, Math.round(Math.max(bounds?.width || 0, bounds?.height || 0)));
    const input = await sharp(path.resolve(source)).resize(targetSize, targetSize, { fit: 'contain' }).png().toBuffer();
    composites.push({
      input,
      left: Math.round((index % cols) * cellWidth + pad + (cellWidth - targetSize) / 2),
      top: Math.round(Math.floor(index / cols) * cellHeight + pad + 14 + (82 - targetSize) / 2)
    });
  }
  await sharp(base).composite(composites).png().toFile(output);
  return output;
}

function assertIconSizing(state, label) {
  const icons = state.menu?.menuIcons || {};
  const launch = icons.launch?.bounds;
  assert.ok(launch?.width >= 74 && launch.width <= 94, `${label}: launch icon width ${launch?.width} outside approval range`);
  for (const key of ['sectorChallenge', 'shipHangar', 'leaderboard', 'threatCodex', 'achievements', 'settings']) {
    assert.ok(icons[key]?.bounds?.width >= 50 && icons[key].bounds.width <= 66, `${label}: ${key} icon width ${icons[key]?.bounds?.width} outside secondary range`);
  }
  for (const key of ['music', 'howToPlay', 'exit']) {
    assert.ok(icons[key]?.bounds?.width >= 23 && icons[key].bounds.width <= 33, `${label}: ${key} icon width ${icons[key]?.bounds?.width} outside utility range`);
  }
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const report = { generatedAt: new Date().toISOString(), baseUrl, outputDir, variants: {} };

try {
  for (const variant of variants) {
    const variantDir = path.join(outputDir, variant);
    mkdirSync(variantDir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await seedProfile(page);
    const query = { skipIntro: '1', offlineLeaderboard: '1', menuIconVariant: variant };
    await page.goto(withQuery(query), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.mouse.move(1, 1);
    const initialState = await waitForMenu(page);
    assert.equal(initialState.menu.menuIconVariant, variant, `${variant}: runtime icon variant mismatch`);
    assertIconSizing(initialState, variant);

    const mainShot = path.join(variantDir, 'main-menu-1920x1080.png');
    await page.screenshot({ path: mainShot, fullPage: false });
    const dockCrop = await cropImage(mainShot, initialState.menu.panel, path.join(variantDir, 'dock-crop-1920x1080.png'));
    const contactSheet = await writeIconContactSheet(variant, initialState, path.join(variantDir, 'icon-contact-sheet-actual-size.png'));

    const focusShots = [];
    for (const focusCase of focusCases) {
      const focusedState = await focusMenuOption(page, focusCase.index);
      assert.equal(focusedState.menu.focusedOption, focusCase.id, `${variant}: failed to focus ${focusCase.id}`);
      const screenshot = path.join(variantDir, `${focusCase.file}-1920x1080.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      focusShots.push({ ...focusCase, screenshot });
    }

    const idleFrames = [];
    await focusMenuOption(page, 0);
    for (const seconds of [0, 2, 4, 6, 8, 10]) {
      if (seconds > 0) await page.waitForTimeout(2000);
      const frame = path.join(variantDir, `idle-frame-${String(seconds).padStart(2, '0')}s-1920x1080.png`);
      await page.screenshot({ path: frame, fullPage: false });
      idleFrames.push(frame);
    }

    const viewportShots = [];
    for (const viewport of viewports.slice(1)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(withQuery(query), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForMenu(page);
      const screenshot = path.join(variantDir, `main-menu-${viewport.name}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      viewportShots.push({ viewport, screenshot });
    }

    assert.deepEqual(pageErrors, [], `${variant}: page errors: ${pageErrors.join('; ')}`);
    assert.deepEqual(consoleErrors, [], `${variant}: console errors: ${consoleErrors.join('; ')}`);
    await page.close();
    report.variants[variant] = {
      mainShot,
      dockCrop,
      contactSheet,
      focusShots,
      idleFrames,
      viewportShots,
      iconBounds: initialState.menu.menuIcons
    };
  }
  report.ok = true;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[menu-button-legibility-goal] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  report.ok = false;
  report.error = error?.stack || String(error);
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.error(`[menu-button-legibility-goal] FAIL report=${path.join(outputDir, 'report.json')}`);
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
