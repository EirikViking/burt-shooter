import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4763));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/cinematic-hangar-menu-icons-${timestamp()}`);

const expectedIcons = {
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
};

const retiredDeterministicIconNames = [
  'menu-icon-launch-run.png',
  'menu-icon-sector-challenge.png',
  'menu-icon-ship-hangar.png',
  'menu-icon-leaderboard.png',
  'menu-icon-threat-codex.png',
  'menu-icon-achievements.png',
  'menu-icon-settings.png',
  'menu-icon-music.png',
  'menu-icon-how-to-play.png',
  'menu-icon-exit.png'
];

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
  throw new Error(`No available cinematic icon check port found starting at ${startPort}`);
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

async function assertIconFiles() {
  const checked = {};
  for (const [key, relativePath] of Object.entries(expectedIcons)) {
    assert.ok(relativePath.includes('/approved-menu-icon-'), `${key}: menu icon must use the approved imagegen filename`);
    assert.ok(!relativePath.includes('/powerups/'), `${key}: menu icon must not use a powerup asset path`);
    const absolutePath = path.resolve(relativePath);
    assert.ok(existsSync(absolutePath), `${key}: missing icon asset ${relativePath}`);
    const metadata = await sharp(absolutePath).metadata();
    assert.equal(metadata.format, 'png', `${key}: icon must be PNG`);
    assert.ok(metadata.hasAlpha, `${key}: icon must have transparency`);
    assert.ok(metadata.width >= 128 && metadata.height >= 128, `${key}: icon should have enough source resolution`);
    const raw = await sharp(absolutePath).ensureAlpha().raw().toBuffer();
    let visiblePixels = 0;
    let chromaGreenPixels = 0;
    for (let index = 0; index < raw.length; index += 4) {
      const r = raw[index];
      const g = raw[index + 1];
      const b = raw[index + 2];
      const a = raw[index + 3];
      if (a <= 12) continue;
      visiblePixels += 1;
      if (g > 210 && r < 60 && b < 80) chromaGreenPixels += 1;
    }
    const greenRatio = visiblePixels ? chromaGreenPixels / visiblePixels : 0;
    assert.ok(greenRatio < 0.001, `${key}: likely chroma green remains in icon (${greenRatio})`);
    checked[key] = {
      path: relativePath,
      width: metadata.width,
      height: metadata.height,
      hasAlpha: metadata.hasAlpha,
      visiblePixels,
      chromaGreenPixels
    };
  }
  return checked;
}

async function writeContactSheet(icons) {
  const entries = Object.entries(icons);
  const cols = 5;
  const rows = Math.ceil(entries.length / cols);
  const cell = 220;
  const pad = 22;
  const width = cols * cell + pad * 2;
  const height = rows * cell + pad * 2;
  const grid = [];
  for (let x = pad; x <= width - pad; x += cell) {
    grid.push(`<line x1="${x}" y1="${pad}" x2="${x}" y2="${height - pad}" stroke="#1ee8ff" stroke-opacity="0.22"/>`);
  }
  for (let y = pad; y <= height - pad; y += cell) {
    grid.push(`<line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}" stroke="#1ee8ff" stroke-opacity="0.22"/>`);
  }
  const labels = entries.map(([key], index) => {
    const x = (index % cols) * cell + cell / 2 + pad;
    const y = Math.floor(index / cols) * cell + pad + 184;
    return `<text x="${x}" y="${y}" font-family="Rajdhani, Arial, sans-serif" font-size="15" fill="#aeefff" text-anchor="middle">${key}</text>`;
  });
  const base = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#020710"/>${grid.join('')}${labels.join('')}</svg>`);
  const composites = [];
  for (const [index, [, icon]] of entries.entries()) {
    const input = await sharp(path.resolve(icon.path)).resize(156, 156, { fit: 'contain' }).png().toBuffer();
    composites.push({
      input,
      left: Math.round((index % cols) * cell + pad + (cell - 156) / 2),
      top: Math.round(Math.floor(index / cols) * cell + pad + 12)
    });
  }
  const contactSheet = path.join(outputDir, 'approved-icons-used-contact-sheet.png');
  await sharp(base).composite(composites).png().toFile(contactSheet);
  return contactSheet;
}

function unreadDiscoveryPayload(unread = true) {
  return {
    version: 1,
    items: {
      enemies: {
        icon_check_enemy: {
          id: 'icon_check_enemy',
          category: 'enemies',
          name: 'Icon Check Enemy',
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
    unreadIds: unread ? ['enemies:icon_check_enemy'] : [],
    updatedAt: '2026-06-18T00:00:00.000Z'
  };
}

async function seedUnreadProfile(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.threatDiscovery.v1', JSON.stringify({
      version: 1,
      items: {},
      discoveriesThisRun: [],
      recentRunThemes: [],
      unreadIds: [],
      updatedAt: '2026-06-18T00:00:00.000Z'
    }));
  });
}

async function setUnreadState(page, unread) {
  const payload = unreadDiscoveryPayload(unread);
  await page.evaluate(async (nextPayload) => {
    localStorage.setItem('nova.threatDiscovery.v1', JSON.stringify(nextPayload));
    const discoveryState = await import('/src/progression/ThreatDiscoveryState.js');
    discoveryState.invalidateThreatDiscoveryStateCache();
    const menu = window.__game?.scenes?.menu;
    if (menu) {
      menu.codexCuePollMs = 0;
      menu.updateCodexSignalCue?.(0);
    }
  }, payload);
}

async function waitForMenu(page) {
  await page.waitForFunction(() => document.body?.dataset?.menuReady === '1', null, { timeout: 30000 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const menu = JSON.parse(window.render_game_to_text?.() || '{}').menu;
    return menu?.menuIcons && Object.values(menu.menuIcons).every((entry) => entry.loaded && entry.spriteVisible);
  }, null, { timeout: 12000 });
  await page.waitForFunction(() => {
    const menu = window.__game?.scenes?.menu;
    return (menu?.tacticalStartBtn?.alpha || 0) > 0.95 &&
      (menu?.sectorStartBtn?.alpha || 0) > 0.95 &&
      (menu?.threatCodexBtn?.alpha || 0) > 0.95 &&
      (menu?.exitBtn?.alpha || 0) > 0.95;
  }, null, { timeout: 12000 });
  await setUnreadState(page, true);
  await page.waitForFunction(() => {
    const menu = JSON.parse(window.render_game_to_text?.() || '{}').menu;
    return menu?.threatCodex?.unreadCount > 0 && menu?.threatCodex?.markerVisible;
  }, null, { timeout: 12000 });
  await page.waitForTimeout(400);
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

mkdirSync(outputDir, { recursive: true });
const fileReport = await assertIconFiles();
const manifestSource = readFileSync(path.resolve('src/assets/assetManifest.js'), 'utf8');
for (const [key, relativePath] of Object.entries(expectedIcons)) {
  const manifestPath = relativePath.replace(/^public/, '');
  assert.ok(manifestSource.includes(manifestPath), `AssetManifest should reference approved icon ${key}`);
}
for (const oldName of retiredDeterministicIconNames) {
  assert.ok(!manifestSource.includes(`/art/generated/nova-swarm/menu/icons/${oldName}`), `AssetManifest must not reference retired deterministic icon ${oldName}`);
  assert.ok(!existsSync(path.resolve('public/art/generated/nova-swarm/menu/icons', oldName)), `Retired deterministic icon should not remain in menu icon folder: ${oldName}`);
}
const contactSheet = await writeContactSheet(fileReport);

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await seedUnreadProfile(page);
const report = { generatedAt: new Date().toISOString(), baseUrl, outputDir, icons: fileReport, contactSheet };
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(withQuery({ skipIntro: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  const state = await waitForMenu(page);
  assert.equal(state.scene, 'menu', 'expected menu scene');
  assert.deepEqual(Object.keys(state.menu.menuIcons).sort(), Object.keys(expectedIcons).sort(), 'runtime icon keys mismatch');
  for (const [key, iconState] of Object.entries(state.menu.menuIcons)) {
    assert.equal(iconState.loaded, true, `${key}: icon texture did not load`);
    assert.equal(iconState.spriteVisible, true, `${key}: icon sprite not visible`);
    assert.equal(iconState.fallbackVisible, false, `${key}: fallback vector should be hidden after asset load`);
    assert.ok(iconState.bounds?.width > 12 && iconState.bounds?.height > 12, `${key}: icon has no usable bounds`);
  }
  assert.equal(state.menu.sectorStart.arrowCueVisible, false, 'Sector Challenge dock arrows must remain removed');
  assert.equal(state.menu.threatCodex.markerVisible, true, 'Threat Codex unread marker should be visible for seeded unread intel');
  assert.ok(state.menu.threatCodex.markerBounds?.width > 0, 'Threat Codex marker should have visible bounds');
  const screenshot = path.join(outputDir, 'menu-icons-unread-marker-1920x1080.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await setUnreadState(page, false);
  await page.waitForFunction(() => {
    const menu = JSON.parse(window.render_game_to_text?.() || '{}').menu;
    return menu?.threatCodex?.unreadCount === 0 && menu?.threatCodex?.markerVisible === false;
  }, null, { timeout: 12000 });
  const clearedState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(consoleErrors, [], `Console errors: ${consoleErrors.join('; ')}`);
  report.screenshot = screenshot;
  report.runtime = {
    icons: state.menu.menuIcons,
    threatCodex: state.menu.threatCodex,
    threatCodexAfterClear: clearedState.menu.threatCodex,
    sectorStart: state.menu.sectorStart
  };
  report.ok = true;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[cinematic-hangar-menu-icons] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  report.ok = false;
  report.error = error?.stack || String(error);
  report.pageErrors = pageErrors;
  report.consoleErrors = consoleErrors;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.error(`[cinematic-hangar-menu-icons] FAIL report=${path.join(outputDir, 'report.json')}`);
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
