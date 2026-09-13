import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4727));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/cinematic-hangar-menu-${timestamp()}`);
const referenceImage = path.resolve(process.env.REFERENCE_IMAGE || 'C:/Users/cromk/AppData/Local/Temp/codex-clipboard-67d128d6-84ab-4f32-b1a1-1468cb9f73a0.png');
const viewports = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1280, height: 800, name: '1280x800' }
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
  throw new Error(`No available cinematic menu check port found starting at ${startPort}`);
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
    bestRank: 5,
    bestRunTimeSeconds: 720,
    survivedSeconds: 720,
    totalBossesDefeated: 10,
    totalWavesCleared: 72,
    totalCodexDiscoveries: 25,
    runClears: 0,
    noHitWaves: 0,
    noHitSectors: 0,
    clearWithLivesRemaining: 0,
    highestScoreMultiplier: 1,
    shipSpecificMilestones: {},
    discoveredThreatIds: [],
    defeatedBossIds: [],
    runThemesSurvived: [],
    secretShipUnlockIds: [],
    creditsEasterEggFound: false,
    unlockedShipIds: ['nova_ship_01'],
    lastNewlyUnlockedShipIds: [],
    newRanksThisRun: [],
    rankAchievementsUnlocked: [],
    updatedAt: '2026-06-17T00:00:00.000Z'
  };
}

function challengeRecords() {
  return {
    version: 1,
    updatedAt: '2026-06-17T00:00:00.000Z',
    byCheckpoint: {
      30: {
        startSector: 30,
        scoreEarned: 8848,
        highestSectorReached: 32,
        finalSector: 32,
        shipId: 'nova_ship_01',
        shipName: 'Nova Sparrow',
        completedAt: '2026-06-17T00:00:00.000Z'
      }
    }
  };
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function seedProfile(page) {
  await page.addInitScript(({ progress, records }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: progress.bestScore,
      bestRank: progress.bestRank,
      bestLevel: progress.bestLevel
    }));
    localStorage.setItem('novaSwarm.sectorStartChallengeRecords.v1', JSON.stringify(records));
  }, { progress: makeProgress(), records: challengeRecords() });
}

async function waitForMenu(page) {
  await page.waitForFunction(() => document.body?.dataset?.menuReady === '1', null, { timeout: 30000 });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'menu', null, { timeout: 30000 });
  await refreshLoadedMenuProfile(page);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const height = state.menu?.screen?.height || 0;
    const menu = window.__game?.scenes?.menu;
    return height > 0 &&
      (state.menu?.panel?.y || 0) > height * 0.72 &&
      (state.menu?.items?.exitButton?.y || height) < height * 0.16 &&
      (menu?.tacticalStartBtn?.alpha || 0) > 0.95 &&
      (menu?.exitBtn?.alpha || 0) > 0.95;
  }, null, { timeout: 12000 });
  await page.waitForTimeout(250);
  return readState(page);
}

async function refreshLoadedMenuProfile(page) {
  await page.evaluate(({ progress, records }) => {
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: progress.bestScore,
      bestRank: progress.bestRank,
      bestLevel: progress.bestLevel
    }));
    localStorage.setItem('novaSwarm.sectorStartChallengeRecords.v1', JSON.stringify(records));
    const menu = window.__game?.scenes?.menu;
    if (!menu) throw new Error('Menu scene missing while refreshing cinematic test profile');
    menu.refreshSectorStartState?.();
    const checkpoints = menu.sectorStartState?.checkpoints || [];
    const index = checkpoints.indexOf(30);
    if (index < 0) throw new Error(`Sector checkpoint 30 did not unlock; checkpoints=${checkpoints.join(',')}`);
    menu.selectedSectorStartIndex = index;
    menu.sectorStartState = {
      ...menu.sectorStartState,
      selectedCheckpoint: checkpoints[index]
    };
    menu.updateSectorStartButton?.({ forceGpuRefresh: true });
    menu.layoutMenu?.({ forceLabelGpuRefresh: true });
  }, { progress: makeProgress(), records: challengeRecords() });
}

async function cropReferenceOptionB() {
  if (!existsSync(referenceImage)) return null;
  const metadata = await sharp(referenceImage).metadata();
  const referenceCrop = {
    left: Math.round(metadata.width * 0.475),
    top: Math.round(metadata.height * 0.013),
    width: Math.round(metadata.width * 0.518),
    height: Math.round(metadata.height * 0.484)
  };
  const outputPath = path.join(outputDir, 'reference-option-b.png');
  await sharp(referenceImage)
    .extract(referenceCrop)
    .png()
    .toFile(outputPath);
  return { path: outputPath, crop: referenceCrop, source: referenceImage, sourceSize: { width: metadata.width, height: metadata.height } };
}

function svgText(width, height, text, x, y, size = 22, fill = '#dffcff') {
  const safeText = String(text).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" fill="${fill}" font-weight="700">${safeText}</text></svg>`;
}

async function writeSideBySide(referencePath, currentPath, outputPath) {
  if (!referencePath) return null;
  const targetHeight = 540;
  const gap = 18;
  const refBuffer = await sharp(referencePath).resize({ height: targetHeight }).png().toBuffer();
  const currentBuffer = await sharp(currentPath).resize({ height: targetHeight }).png().toBuffer();
  const refMeta = await sharp(refBuffer).metadata();
  const currentMeta = await sharp(currentBuffer).metadata();
  const canvasWidth = refMeta.width + currentMeta.width + gap;
  const canvasHeight = targetHeight + 48;
  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 4, g: 8, b: 14, alpha: 1 }
    }
  })
    .composite([
      { input: refBuffer, left: 0, top: 48 },
      { input: currentBuffer, left: refMeta.width + gap, top: 48 },
      { input: Buffer.from(svgText(canvasWidth, canvasHeight, 'REFERENCE B', 16, 32, 24, '#fff1a8')), left: 0, top: 0 },
      { input: Buffer.from(svgText(canvasWidth, canvasHeight, 'IMPLEMENTED MENU', refMeta.width + gap + 16, 32, 24, '#72f6ff')), left: 0, top: 0 }
    ])
    .png()
    .toFile(outputPath);
  return outputPath;
}

function svgBox({ x, y, width, height, label, color }) {
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="4" />`,
    `<rect x="${x}" y="${Math.max(0, y - 28)}" width="${Math.max(120, label.length * 10)}" height="26" fill="rgba(0,0,0,0.72)" stroke="${color}" stroke-width="1" />`,
    `<text x="${x + 8}" y="${Math.max(19, y - 9)}" font-family="Arial, sans-serif" font-size="16" fill="${color}" font-weight="700">${label}</text>`
  ].join('');
}

async function writeAnnotatedShot(state, currentPath, outputPath) {
  const title = state.menu?.items?.title;
  const launch = state.menu?.items?.launchButton;
  const panel = state.menu?.panel;
  const exit = state.menu?.items?.exitButton;
  const boxes = [
    title && svgBox({ ...title, label: 'title/subtitle cluster', color: '#72f6ff' }),
    panel && svgBox({ ...panel, label: 'bottom command dock', color: '#fff1a8' }),
    launch && svgBox({ ...launch, label: 'primary launch tile', color: '#ffd64a' }),
    exit && svgBox({ ...exit, label: 'compact exit utility', color: '#ff5a6e' })
  ].filter(Boolean).join('');
  const overlay = `<svg width="${state.menu.screen.width}" height="${state.menu.screen.height}" xmlns="http://www.w3.org/2000/svg">${boxes}</svg>`;
  await sharp(currentPath)
    .composite([{ input: Buffer.from(overlay), left: 0, top: 0 }])
    .png()
    .toFile(outputPath);
  return outputPath;
}

function assertInside(bounds, screen, label) {
  assert.ok(bounds?.width > 0 && bounds?.height > 0, `${label}: missing visible bounds`);
  assert.ok(bounds.x >= -2, `${label}: left edge offscreen`);
  assert.ok(bounds.y >= -2, `${label}: top edge offscreen`);
  assert.ok(bounds.right <= screen.width + 2, `${label}: right edge offscreen`);
  assert.ok(bounds.bottom <= screen.height + 2, `${label}: bottom edge offscreen`);
}

function assertContained(inner, outer, label, padding = 3) {
  assert.ok(inner?.width > 0 && outer?.width > 0, `${label}: missing visible bounds`);
  assert.ok(inner.x >= outer.x + padding, `${label}: crosses left edge`);
  assert.ok(inner.y >= outer.y + padding, `${label}: crosses top edge`);
  assert.ok(inner.right <= outer.right - padding, `${label}: crosses right edge`);
  assert.ok(inner.bottom <= outer.bottom - padding, `${label}: crosses bottom edge`);
}

function assertHorizontalDock(state, label) {
  const menu = state.menu;
  const screen = menu.screen;
  const panel = menu.panel;
  const buttons = [
    ['hangar', menu.items.hangarButton],
    ['highscores', menu.items.highscoresButton],
    ['threatCodex', menu.items.threatCodexButton],
    ['achievements', menu.items.achievementsButton],
    ['settings', menu.items.settingsButton]
  ];

  assertInside(panel, screen, `${label}: dock panel`);
  assert.ok(panel.y > screen.height * 0.72, `${label}: dock panel should live at the bottom`);
  assert.ok(panel.width > screen.width * 0.86, `${label}: dock panel should span most of the screen`);
  assert.ok(panel.height >= 70 && panel.height <= 150, `${label}: dock panel height should feel like a dock`);
  assert.deepEqual(menu.optionOrder.slice(0, 10), ['launchTactical', 'dailySignal', 'scout', 'sectorStart', 'overrun', 'hangar', 'highscores', 'threatCodex', 'achievements', 'settings'], `${label}: wrong navigation order`);

  for (const [name, bounds] of buttons) assertInside(bounds, screen, `${label}: ${name} tile`);
  const [hangar, highscores, threatCodex, achievements, settings] = buttons.map(([, bounds]) => bounds);
  assert.ok(hangar.x < screen.width * 0.16, `${label}: hangar utility should anchor left side of dock`);
  assert.ok(settings.right > screen.width * 0.82, `${label}: settings tile should anchor the right side of the dock`);
  assert.ok(Math.abs(hangar.y - settings.y) < 24, `${label}: dock tiles should align on one row`);
  const sorted = [hangar, highscores, threatCodex, achievements, settings];
  const allowedGlowBleed = screen.width < 1500 ? 28 : 12;
  for (let index = 1; index < sorted.length; index += 1) {
    assert.ok(sorted[index - 1].right <= sorted[index].x + allowedGlowBleed, `${label}: dock tiles overlap around index ${index}`);
  }
}

function assertLaunchDeck(state, label) {
  const menu = state.menu;
  const screen = menu.screen;
  const deck = menu.launchDeck;
  assertInside(deck?.bounds, screen, `${label}: launch deck`);
  assert.ok(deck.bounds.y > menu.items.subtitle.bottom + 40, `${label}: Launch Deck should sit below the title block`);
  assert.ok(deck.bounds.bottom < menu.panel.y, `${label}: Launch Deck should stay above the utility dock`);
  const cards = [
    ['mayhemTactical', deck.cards?.mayhemTactical],
    ['daily', deck.cards?.daily],
    ['scout', deck.cards?.scout],
    ['sector', deck.cards?.sector],
    ['overrun', deck.cards?.overrun]
  ];
  for (const [name, card] of cards) {
    assertInside(card?.bounds, screen, `${label}: ${name} Launch Deck card`);
    assert.ok(card.bounds.height >= 42 && card.bounds.height <= 94, `${label}: ${name} should stay compact`);
    assert.ok(card.bounds.width >= 220 && card.bounds.width <= 560, `${label}: ${name} should not become oversized`);
  }
  assert.equal(deck.cards?.mayhemTactical?.sublabel, 'MAIN MODE · RECOMMENDED · RANKED', `${label}: Tactical card protocol`);
  assert.match(deck.cards?.scout?.sublabel || '', /^ANOMALY: /, `${label}: Scout card should expose the selected practice anomaly`);
  assert.equal(deck.cards?.sector?.sublabel, 'CHECKPOINT 30', `${label}: Sector card should expose the selected checkpoint`);
  assert.ok(deck.cards.mayhemTactical.bounds.height >= deck.cards.daily.bounds.height * 1.25, `${label}: Mayhem should be the largest mode card`);
  assert.equal(deck.cards?.scout?.body || '', '', `${label}: Scout card should stay paragraph-free`);
  assert.equal(deck.cards?.sector?.body || '', '', `${label}: Sector card should stay paragraph-free`);
  assert.ok(deck.bounds.right < screen.width * 0.5, `${label}: Launch Deck should avoid the center ship showcase lane`);
  assert.ok(Math.abs(deck.cards.mayhemTactical.bounds.x - deck.cards.daily.bounds.x) < 36, `${label}: Mayhem/Daily cards should share the left command stack`);
  assert.ok(Math.abs(deck.cards.daily.bounds.x - deck.cards.scout.bounds.x) < 36, `${label}: Daily/Scout cards should share the left command stack`);
  assert.ok(Math.abs(deck.cards.scout.bounds.x - deck.cards.sector.bounds.x) < 36, `${label}: Scout/Sector cards should share the left command stack`);
  assert.ok(Math.abs(deck.cards.sector.bounds.x - deck.cards.overrun.bounds.x) < 36, `${label}: Sector/Overrun cards should share the left command stack`);
  assert.ok(deck.cards.mayhemTactical.bounds.bottom < deck.cards.daily.bounds.y + 36, `${label}: Mayhem/Daily card overlap`);
  assert.ok(deck.cards.daily.bounds.bottom < deck.cards.scout.bounds.y + 36, `${label}: Daily/Scout card overlap`);
  assert.ok(deck.cards.scout.bounds.bottom < deck.cards.sector.bounds.y + 36, `${label}: Scout/Sector card overlap`);
  assert.ok(deck.cards.sector.bounds.bottom < deck.cards.overrun.bounds.y + 36, `${label}: Sector/Overrun card overlap`);

  const briefing = menu.missionBriefing;
  assertInside(briefing?.panelBounds, screen, `${label}: Mission Briefing panel`);
  assert.ok(briefing.panelBounds.x > screen.width * 0.58, `${label}: Mission Briefing should sit on the right side`);
  assert.ok(briefing.panelBounds.x > deck.bounds.right + 48, `${label}: Mission Briefing should not overlap Launch Deck`);
  assert.ok(briefing.panelBounds.bottom < menu.panel.y, `${label}: Mission Briefing should stay above the utility dock`);
  assert.ok((briefing.titleBounds?.bottom || 0) < (briefing.bodyBounds?.y || 0) + 8, `${label}: Mission Briefing title/body collision`);
  assert.ok((briefing.bodyBounds?.bottom || 0) <= briefing.panelBounds.bottom + 4, `${label}: Mission Briefing body should stay inside frame`);
  assertInside(briefing.launchButtonBounds, screen, `${label}: Mission Briefing launch button`);
  assert.ok(
    ['START PLAYING', 'PLAY', 'LAUNCH RUN'].includes(briefing.launchButtonLabel),
    `${label}: Mission Briefing should expose the context-appropriate primary launch action`
  );
  assert.ok(briefing.launchButtonBounds.width >= 150, `${label}: launch action is too small to read as primary`);
  if (briefing.detailsButtonBounds?.width > 0) {
    assert.ok(briefing.launchButtonBounds.right <= briefing.detailsButtonBounds.x + 2, `${label}: launch and details actions overlap`);
    assertContained(briefing.detailsButtonLabelBounds, briefing.detailsButtonBounds, `${label}: details label`, 2);
    if (briefing.detailsButtonIconBounds) {
      assertContained(briefing.detailsButtonIconBounds, briefing.detailsButtonBounds, `${label}: details icon`, 2);
    }
  }
  assertContained(briefing.launchButtonLabelBounds, briefing.launchButtonBounds, `${label}: launch label`, 2);
}

function assertUtilityCluster(state, label) {
  const menu = state.menu;
  const screen = menu.screen;
  const music = menu.items.musicButton;
  const help = menu.items.helpButton;
  const exit = menu.items.exitButton;
  for (const [name, bounds] of [['music', music], ['howToPlay', help], ['exit', exit]]) {
    assertInside(bounds, screen, `${label}: ${name} utility`);
    assert.ok(bounds.x > screen.width * 0.55, `${label}: ${name} utility should live in the top-right system cluster ${JSON.stringify(bounds)}`);
    assert.ok(bounds.y < screen.height * 0.16, `${label}: ${name} utility should stay above the cinematic play space`);
    assert.ok(bounds.width <= 190, `${label}: ${name} utility should be compact, not a destination tile`);
  }
  const utilityVertical = exit.y < help.y && help.y < music.y;
  const utilityHorizontal = exit.x < help.x && help.x < music.x;
  assert.ok(utilityVertical || utilityHorizontal, `${label}: utility cluster should read Music, How To Play, Exit ${JSON.stringify({ music, help, exit })}`);
  assert.ok(music.right > screen.width * 0.9, `${label}: utility cluster should terminate near the right edge`);
  assert.ok(exit.height <= 66, `${label}: exit utility should remain compact`);
  assert.deepEqual(menu.optionOrder.slice(10), ['music', 'howToPlay', 'exit'], `${label}: wrong utility navigation order`);
}

function assertMenuState(state, viewport) {
  assert.equal(state.scene, 'menu', `${viewport.name}: expected menu scene`);
  const menu = state.menu;
  assert.ok(menu, `${viewport.name}: missing menu debug state`);
  const screen = menu.screen;
  assert.equal(screen.width, viewport.width, `${viewport.name}: width mismatch`);
  assert.equal(screen.height, viewport.height, `${viewport.name}: height mismatch`);

  const title = menu.items.title;
  const subtitle = menu.items.subtitle;
  assertInside(title, screen, `${viewport.name}: title`);
  assertInside(subtitle, screen, `${viewport.name}: subtitle`);
  assert.ok(title.x < screen.width * 0.18, `${viewport.name}: title should be top-left, not centered in a console`);
  assert.ok(title.y < screen.height * 0.14, `${viewport.name}: title should sit near the top`);
  assert.ok(subtitle.y > title.y, `${viewport.name}: subtitle should sit below title`);

  assertHorizontalDock(state, viewport.name);
  assertLaunchDeck(state, viewport.name);
  assertUtilityCluster(state, viewport.name);
  assert.equal(menu.sectorStart.buttonVisualText, 'SECTOR RUN', `${viewport.name}: sector tile visual label`);
  assert.equal(menu.sectorStart.buttonText, 'SECTOR RUN', `${viewport.name}: sector dock label should stay stable`);
  assert.equal(menu.sectorStart.buttonSubtext, 'CHECKPOINT 30', `${viewport.name}: sector card should show the selected checkpoint`);
  const briefingCopy = [
    menu.missionBriefing?.eyebrow,
    menu.missionBriefing?.title,
    menu.missionBriefing?.body,
    menu.missionBriefing?.status,
    menu.missionBriefing?.restriction
  ].filter(Boolean).join('\n');
  assert.match(briefingCopy, /RUN MODE[\s\S]*MAYHEM[\s\S]*Draft one permanent tactical upgrade after each boss[\s\S]*TACTICAL LEADERBOARD[\s\S]*RANKED/i, `${viewport.name}: mission briefing should explain the focused Tactical run mode`);
  assert.doesNotMatch(JSON.stringify(menu), /Sector 1 climb/i, `${viewport.name}: old Sector 1 climb wording should not be player-facing`);
  assert.doesNotMatch(menu.sectorStart.buttonSubtext || '', /BEGINS AT SECTOR 31|BEST/, `${viewport.name}: dock tile should not carry overrun start detail`);
  assert.equal(menu.sectorStart.arrowCueVisible, false, `${viewport.name}: sector tile should not show dock stepper arrows`);
  assert.ok((menu.items.runModePanel?.width || 0) > 0, `${viewport.name}: mission briefing panel should be visible`);
  assert.ok((menu.items.flavor?.width || 0) === 0, `${viewport.name}: old flavor text should not be visible`);
}

function assertF12Unclaimed() {
  const source = readFileSync(path.resolve('src/scenes/MenuScene.js'), 'utf8');
  assert.ok(!/F12|event\.code\s*===\s*['"]F12['"]|keyCode\s*===\s*123/.test(source), 'MenuScene should not claim F12/devtools screenshot keys');
}

mkdirSync(outputDir, { recursive: true });
const reference = await cropReferenceOptionB();
assertF12Unclaimed();

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await seedProfile(page);
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  reference,
  cases: []
};

try {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(withQuery({ skipIntro: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
    const state = await waitForMenu(page);
    assertMenuState(state, viewport);
    const screenshot = path.join(outputDir, `menu-current-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    const annotated = viewport.name === '1920x1080'
      ? await writeAnnotatedShot(state, screenshot, path.join(outputDir, 'menu-current-1920x1080-annotated.png'))
      : null;
    const comparison = viewport.name === '1920x1080'
      ? await writeSideBySide(reference?.path, screenshot, path.join(outputDir, 'reference-vs-current-1920x1080.png'))
      : null;
    report.cases.push({
      viewport,
      screenshot,
      annotated,
      comparison,
      titleBounds: state.menu.items.title,
      subtitleBounds: state.menu.items.subtitle,
      dockBounds: state.menu.panel,
      optionOrder: state.menu.optionOrder,
      sectorStart: {
        buttonText: state.menu.sectorStart.buttonText,
        buttonVisualText: state.menu.sectorStart.buttonVisualText,
        buttonSubtext: state.menu.sectorStart.buttonSubtext
      }
    });
  }

  await page.keyboard.press('F12');
  await page.waitForTimeout(150);
  const afterF12 = await readState(page);
  assert.equal(afterF12.scene, 'menu', 'F12 should not route through menu actions');

  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(consoleErrors, [], `Console errors: ${consoleErrors.join('; ')}`);
  report.ok = true;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[cinematic-hangar-menu] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  report.ok = false;
  report.error = error?.stack || String(error);
  report.pageErrors = pageErrors;
  report.consoleErrors = consoleErrors;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.error(`[cinematic-hangar-menu] FAIL report=${path.join(outputDir, 'report.json')}`);
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
