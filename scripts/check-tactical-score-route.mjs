import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  TACTICAL_SCORE_ROUTE_SECTOR,
  buildTacticalDraftOffers
} from '../src/config/TacticalDraft.js';
import { RUN_MODES } from '../src/game/RunMode.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4742));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/tactical-score-route-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error('No tactical score-route check port available');
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error(`Tactical score-route server did not start at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

function inside(inner, outer, margin = 2) {
  return inner && outer &&
    inner.x >= outer.x - margin &&
    inner.y >= outer.y - margin &&
    inner.x + inner.width <= outer.x + outer.width + margin &&
    inner.y + inner.height <= outer.y + outer.height + margin;
}

const before = buildTacticalDraftOffers({
  seed: 'now-or-never',
  sectorCleared: TACTICAL_SCORE_ROUTE_SECTOR - 1
});
const atRoute = buildTacticalDraftOffers({
  seed: 'now-or-never',
  sectorCleared: TACTICAL_SCORE_ROUTE_SECTOR,
  bannedIds: ['combo_anchor'],
  heldId: 'damage_up'
});
const after = buildTacticalDraftOffers({
  seed: 'now-or-never',
  sectorCleared: TACTICAL_SCORE_ROUTE_SECTOR + 1
});
assert(!before.some((offer) => offer.id === 'combo_anchor'));
assert(atRoute.filter((offer) => offer.id === 'combo_anchor' && offer.fixedScoreRoute).length === 1);
assert(!after.some((offer) => offer.id === 'combo_anchor'));

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(`${baseUrl}?autostart=1&offlineLeaderboard=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.player), null, { timeout: 30000 });
  await page.evaluate((runMode) => {
    const game = window.__game;
    const play = game.scenes.play;
    game.runMode = runMode;
    play.introActive = false;
    play.player.invulnerable = true;
    play.player.invulnerableTime = 60000;
    play.tacticalDraftHeldId = 'damage_up';
    play.tacticalDraftBannedIds = ['combo_anchor'];
    play.openTacticalDraft({ sectorCleared: 5 });
  }, RUN_MODES.MAYHEM_TACTICAL);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);

  let state = await readState(page);
  const routeOffer = state.tacticalDraft.offers.find((offer) => offer.fixedScoreRoute);
  const routeIndex = state.tacticalDraft.offers.findIndex((offer) => offer.fixedScoreRoute);
  const failures = [];
  if (!routeOffer || routeOffer.id !== 'combo_anchor' || routeIndex !== state.tacticalDraft.focusIndex ||
      routeIndex !== state.tacticalDraft.recommendedIndex) {
    failures.push(`score route did not receive forced focus: ${JSON.stringify(state.tacticalDraft)}`);
  }
  if (!/NOW OR NEVER/i.test(state.tacticalDraft.title || '') ||
      !/SCORE ROUTE/i.test(state.tacticalDraft.eyebrow || '') ||
      !/COMBO ANCHOR/i.test(state.tacticalDraft.subtitle || '') ||
      !/NOW OR NEVER/i.test(routeOffer.scoreRouteBadgeText || '') ||
      !inside(routeOffer.scoreRouteBadgeBounds, routeOffer.bounds)) {
    failures.push(`score route hierarchy missing: ${JSON.stringify(routeOffer)}`);
  }
  if (!/CANNOT HOLD/i.test(state.tacticalDraft.holdLabel || '') ||
      !/CANNOT BAN/i.test(state.tacticalDraft.banLabel || '')) {
    failures.push(`score route restrictions unclear: ${JSON.stringify({
      hold: state.tacticalDraft.holdLabel,
      ban: state.tacticalDraft.banLabel
    })}`);
  }

  const initialBannedIds = [...state.tacticalDraft.bannedIds];
  const initialBansRemaining = state.tacticalDraft.bansRemaining;
  await page.keyboard.press('l');
  await page.waitForTimeout(80);
  let restrictionState = await readState(page);
  const holdRestriction = restrictionState.tacticalDraft.lastScoreRouteRestriction;
  await page.keyboard.press('b');
  await page.waitForTimeout(80);
  restrictionState = await readState(page);
  const banRestriction = restrictionState.tacticalDraft.lastScoreRouteRestriction;
  if (holdRestriction?.action !== 'hold' || banRestriction?.action !== 'ban' ||
      restrictionState.tacticalDraft.heldId === 'combo_anchor' ||
      JSON.stringify(restrictionState.tacticalDraft.bannedIds) !== JSON.stringify(initialBannedIds) ||
      restrictionState.tacticalDraft.bansRemaining !== initialBansRemaining ||
      !restrictionState.tacticalDraft.offers.some((offer) => offer.id === 'combo_anchor' && offer.fixedScoreRoute)) {
    failures.push(`score route restriction controls failed: ${JSON.stringify(restrictionState.tacticalDraft)}`);
  }

  await page.keyboard.press('r');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.rescansRemaining === 0);
  state = await readState(page);
  const rescannedRoute = state.tacticalDraft.offers.find((offer) => offer.fixedScoreRoute);
  if (!rescannedRoute || state.tacticalDraft.focusIndex !== state.tacticalDraft.offers.indexOf(rescannedRoute)) {
    failures.push(`rescan dropped or de-prioritized the one-time score route: ${JSON.stringify(state.tacticalDraft.offers)}`);
  }

  const desktopScreenshot = path.join(outputDir, 'score-route-now-or-never-1280x720.png');
  await page.screenshot({ path: desktopScreenshot, fullPage: true });

  const alternativeIndex = state.tacticalDraft.offers.findIndex((offer) => !offer.fixedScoreRoute);
  await page.evaluate((index) => window.__game.scenes.play.setTacticalDraftFocus(index), alternativeIndex);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });
  const closedState = await readState(page);
  if (closedState.tacticalDraft.scoreRouteDecision !== 'closed' ||
      closedState.tacticalDraft.scoreRouteState?.selectedId === 'combo_anchor') {
    failures.push(`declining the route did not close it for the run: ${JSON.stringify(closedState.tacticalDraft)}`);
  }

  await page.setViewportSize({ width: 760, height: 640 });
  await page.evaluate(async (runMode) => {
    await window.__novaI18n.setLanguagePreference('de');
    const game = window.__game;
    const play = game.scenes.play;
    game.runMode = runMode;
    play.tacticalScoreRouteDecision = null;
    play.tacticalDraftHeldId = null;
    play.tacticalDraftBannedIds = [];
    play.tacticalDraftRescansRemaining = 1;
    play.player.runAugmentIds = play.player.runAugmentIds.filter((id) => id !== 'combo_anchor');
    play.player.consumedRunAugmentIds = play.player.consumedRunAugmentIds.filter((id) => id !== 'combo_anchor');
    play.player.recomputeRunAugmentModifiers?.();
    play.openTacticalDraft({ sectorCleared: 5 });
  }, RUN_MODES.MAYHEM_TACTICAL);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  const localized = await readState(page);
  const localizedRoute = localized.tacticalDraft.offers.find((offer) => offer.fixedScoreRoute);
  if (!localizedRoute || /NOW OR NEVER|TAKE SCORE ROUTE|ONE CHANCE/i.test(
    `${localized.tacticalDraft.title} ${localizedRoute.scoreRouteBadgeText} ${localizedRoute.descriptionText}`
  )) {
    failures.push(`German score-route presentation retained English: ${JSON.stringify(localized.tacticalDraft)}`);
  }
  if (!inside(localizedRoute.scoreRouteBadgeBounds, localizedRoute.bounds) ||
      !inside(localizedRoute.chooseBounds, localizedRoute.bounds) ||
      localizedRoute.bounds.x < 0 || localizedRoute.bounds.y < 0 ||
      localizedRoute.bounds.x + localizedRoute.bounds.width > 760 ||
      localizedRoute.bounds.y + localizedRoute.bounds.height > 640) {
    failures.push(`compact localized score-route layout escaped viewport: ${JSON.stringify(localizedRoute)}`);
  }
  const compactScreenshot = path.join(outputDir, 'score-route-now-or-never-760x640-de.png');
  await page.screenshot({ path: compactScreenshot, fullPage: true });

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });
  const takenState = await readState(page);
  if (takenState.tacticalDraft.scoreRouteDecision !== 'taken' ||
      takenState.tacticalDraft.scoreRouteState?.selectedId !== 'combo_anchor' ||
      !takenState.tacticalDraft.selectedIds.includes('combo_anchor') ||
      (takenState.tacticalDraft.player?.modifiers?.comboWindowBonusMs || 0) < 650) {
    failures.push(`taking the score route did not apply it: ${JSON.stringify(takenState.tacticalDraft)}`);
  }

  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(' | ')}`);
  const report = {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    baseUrl,
    staticOffers: {
      before: before.map((offer) => offer.id),
      atRoute: atRoute.map((offer) => ({ id: offer.id, fixedScoreRoute: offer.fixedScoreRoute })),
      after: after.map((offer) => offer.id)
    },
    desktop: {
      state,
      holdRestriction,
      banRestriction,
      closedState: closedState.tacticalDraft,
      screenshot: desktopScreenshot
    },
    compactLocalized: {
      state: localized.tacticalDraft,
      takenState: takenState.tacticalDraft,
      screenshot: compactScreenshot
    },
    pageErrors,
    consoleErrors,
    failures
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[tactical-score-route] ${failures.join('; ')}`);
  console.log(`[tactical-score-route] PASS output=${outputDir}`);
} finally {
  await page.close({ runBeforeUnload: false }).catch(() => {});
  await browser.close();
  if (server) server.kill();
}
