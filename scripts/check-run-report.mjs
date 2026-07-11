import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4420));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/run-report-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rectRight(rect) {
  return Number(rect?.x) + Number(rect?.width);
}

function rectBottom(rect) {
  return Number(rect?.y) + Number(rect?.height);
}

function assertContains(outer, inner, message) {
  assert(outer && inner, `${message}: missing bounds.`);
  assert(Number(inner.x) >= Number(outer.x) - 1, `${message}: left edge escaped.`);
  assert(Number(inner.y) >= Number(outer.y) - 1, `${message}: top edge escaped.`);
  assert(rectRight(inner) <= rectRight(outer) + 1, `${message}: right edge escaped.`);
  assert(rectBottom(inner) <= rectBottom(outer) + 1, `${message}: bottom edge escaped.`);
}

function rectanglesOverlap(first, second) {
  return Number(first.x) < rectRight(second)
    && rectRight(first) > Number(second.x)
    && Number(first.y) < rectBottom(second)
    && rectBottom(first) > Number(second.y);
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
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
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
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function assertLocalOnlyHelper() {
  const helperPath = path.resolve('src/game/RunReport.js');
  const source = readFileSync(helperPath, 'utf8');
  const forbidden = /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|submitScore|upload|leaderboard|steam)\b/i;
  assert(!forbidden.test(source), 'RunReport helper must stay local-only and free of network/upload/leaderboard calls.');
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function installNetworkGuard(page) {
  await page.evaluate(() => {
    window.__runReportNetworkCalls = [];
    if (window.__runReportNetworkGuardInstalled) return;
    window.__runReportNetworkGuardInstalled = true;
    const capture = (kind, value) => {
      window.__runReportNetworkCalls.push({ kind, value: String(value || '') });
    };

    const originalFetch = window.fetch?.bind(window);
    if (originalFetch) {
      window.fetch = (...args) => {
        capture('fetch', args[0]);
        return originalFetch(...args);
      };
    }

    const OriginalXHR = window.XMLHttpRequest;
    if (OriginalXHR) {
      window.XMLHttpRequest = class RunReportGuardedXHR extends OriginalXHR {
        open(method, url, ...rest) {
          capture('xhr', `${method || 'GET'} ${url || ''}`);
          return super.open(method, url, ...rest);
        }
      };
    }

    const originalSendBeacon = navigator.sendBeacon?.bind(navigator);
    if (originalSendBeacon) {
      navigator.sendBeacon = (url, data) => {
        capture('sendBeacon', url);
        return originalSendBeacon(url, data);
      };
    }

    const OriginalWebSocket = window.WebSocket;
    if (OriginalWebSocket) {
      window.WebSocket = class RunReportGuardedWebSocket extends OriginalWebSocket {
        constructor(url, protocols) {
          capture('websocket', url);
          super(url, protocols);
        }
      };
    }
  });
}

async function forceRunReportScenario(page) {
  await page.evaluate(() => {
    window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!game || !play) throw new Error('Play scene not ready for run-report check.');

    game.runMode = 'ranked';
    game.runModeReason = null;
    game.isDebugRun = false;
    game.score = 54321;
    game.level = 6;
    game.lives = 0;
    play.gameTime = 187;
    play.totalKills = 73;
    play.bossKills = 2;
    play.wavesCleared = 9;
    play.lifeLossesThisRun = 3;
    play.respawnsThisRun = 2;
    play.extraLivesEarnedThisRun = 1;
    play.powerupsCollectedThisRun = 5;
    const tacticalNames = [
      'DAMAGE UP', 'SPEED UP', 'PIERCE', 'CHAIN', 'TARGET POINT', 'DRONES',
      'DAMAGE UP', 'SPEED UP', 'PIERCE', 'CHAIN', 'TARGET POINT', 'DRONES',
      'DAMAGE UP', 'SPEED UP', 'DAMAGE UP',
      'RAPID FIRE', 'PLASMA LIGHTNING', 'MAGNET: PICKUPS', 'BOMB', 'RAIL SURGE', 'SHIELD MATRIX'
    ];
    play.tacticalDraftHistory = tacticalNames.map((name, index) => ({
      sectorCleared: index + 1,
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name,
      category: index % 2 === 0 ? 'offense' : 'utility',
      stacks: 1
    }));
    play.player.runAugmentIds = ['damage_up', 'speed_up'];
    play.grazeBreaksThisRun = 2;
    play.nearMissSurgesThisRun = 4;
    play.finalLifeLossSource = 'enemy_bullet';
    play.lastLifeLossSource = 'enemy_bullet';
    game.gameOver({ fromInterlude: true });
  });

  await page.waitForFunction(() => window.__game?.currentSceneName === 'gameOver', null, { timeout: 10000 });
  await page.evaluate(() => {
    const scene = window.__game?.scenes?.gameOver;
    scene?.enterRunbackStage?.('run_report_check');
    scene?.refreshPrimaryCta?.();
    scene?.layoutScreen?.();
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver?.state === 'runback' && state.gameOver?.runReportCta?.visible;
  }, null, { timeout: 5000 });
}

function assertDefaultGameOver(state) {
  assert(state.scene === 'gameOver', 'Expected Game Over scene.');
  assert(state.gameOver?.state === 'runback', 'Expected runback Game Over state.');
  assert(state.gameOver?.primaryCta?.visible, 'Primary restart CTA should remain visible.');
  assert(/ONE MORE|RUN|RELAUNCH/i.test(state.gameOver?.primaryCta?.label || ''), 'Primary CTA should still be the restart flow.');
  assert(state.gameOver?.leaderboardCta?.visible, 'Leaderboard action should remain visible by default.');
  assert(state.gameOver?.runReportCta?.visible, 'Run Report CTA should be visible.');
  assert(Number(state.gameOver?.runReportCta?.width) >= 280, 'Run Report CTA should be prominent enough to notice.');
  assert(Number(state.gameOver?.runReportCta?.height) >= 46, 'Run Report CTA should use the normal action-button height.');
  assert(/Counter advice/i.test(state.gameOver?.runReportCta?.hint || ''), 'Run Report CTA should advertise counter advice.');
  assert(state.gameOver?.counterAdviceCard?.visible === true, 'Counter advice card should be visible on Game Over.');
  assert(Number(state.gameOver?.counterAdviceCard?.height) >= 60, 'Counter advice card should be readable.');
  assert(state.gameOver?.runReportOverlay?.visible === false, 'Run Report overlay must be hidden by default.');
  assert(state.runReport?.localOnly === true, 'render_game_to_text should expose a local-only runReport summary.');
  assert(state.runReport?.score === 54321, 'runReport summary should include score.');
  assert(state.runReport?.sectorReached >= 6, 'runReport summary should include sector reached.');
  assert(state.runReport?.sectionIds?.includes('combat'), 'runReport summary should include section ids.');
  assert(state.runReport?.tacticalDraftPicks?.length === 21, 'runReport summary should preserve every tactical draft pick.');
  assert(state.gameOver?.deathCoach?.source === 'enemy_bullet', 'game over debug state should expose death-specific coach advice.');
  assert(state.gameOver?.runReport?.deathCoach?.source === 'enemy_bullet', 'run report debug state should expose death-specific coach advice.');
}

function assertOpenReport(state, viewport) {
  const overlay = state.gameOver?.runReportOverlay;
  assert(overlay?.visible, 'Run Report overlay should open on command.');
  for (const sectionId of ['run', 'combat', 'survival', 'rewards']) {
    assert(overlay.sectionIds?.includes(sectionId), `Run Report overlay missing ${sectionId} section.`);
  }
  const text = overlay.text || '';
  for (const expected of ['Score:', 'Ship:', 'Kills:', 'Lives lost:', 'COUNTER ADVICE: LAST DEATH:', 'Powerups:', 'Tactical upgrades:']) {
    assert(text.includes(expected), `Run Report overlay missing core field: ${expected}`);
  }

  const panel = { x: overlay.x, y: overlay.y, width: overlay.width, height: overlay.height };
  assert(Number(panel.x) >= 0 && Number(panel.y) >= 0, `Run Report panel escaped ${viewport.width}x${viewport.height}.`);
  assert(rectRight(panel) <= viewport.width && rectBottom(panel) <= viewport.height, `Run Report panel clipped at ${viewport.width}x${viewport.height}.`);

  const tactical = overlay.tacticalLoadout;
  assert(tactical?.totalPicks === 21, 'Tactical Loadout should preserve all 21 picks.');
  assert(tactical?.uniquePicks === 12, 'Tactical Loadout should group 21 picks into 12 unique chips.');
  assert(tactical?.chips?.length === 12, 'Tactical Loadout should render one chip per grouped upgrade.');
  assertContains(panel, tactical.bounds, 'Tactical Loadout band');

  const expectedStacks = new Map([
    ['DAMAGE UP', 4], ['SPEED UP', 3], ['PIERCE', 2], ['CHAIN', 2],
    ['TARGET POINT', 2], ['DRONES', 2], ['RAPID FIRE', 1], ['PLASMA LIGHTNING', 1],
    ['MAGNET: PICKUPS', 1], ['BOMB', 1], ['RAIL SURGE', 1], ['SHIELD MATRIX', 1]
  ]);
  tactical.chips.forEach((chip, index) => {
    assertContains(tactical.bounds, chip, `Tactical chip ${chip.label}`);
    assert(expectedStacks.get(chip.label) === chip.count, `Unexpected grouped stack for ${chip.label}: ${chip.count}.`);
    for (let otherIndex = index + 1; otherIndex < tactical.chips.length; otherIndex += 1) {
      assert(!rectanglesOverlap(chip, tactical.chips[otherIndex]), `Tactical chips overlap: ${chip.label} / ${tactical.chips[otherIndex].label}.`);
    }
  });
  for (const [label, count] of expectedStacks) {
    const expectedText = count > 1 ? `${label} x${count}` : label;
    assert(text.includes(expectedText), `Tactical Loadout missing readable chip text: ${expectedText}`);
  }

  for (const section of overlay.sections || []) {
    assertContains(panel, section, `Report section ${section.id}`);
    assert(!rectanglesOverlap(section, tactical.bounds), `Report section ${section.id} overlaps Tactical Loadout.`);
  }
  assert(!rectanglesOverlap(tactical.bounds, overlay.deathCoachBounds), 'Tactical Loadout overlaps counter advice.');
  assert(!rectanglesOverlap(overlay.deathCoachBounds, overlay.pilotOrdersBounds), 'Counter advice overlaps Pilot Orders.');
  assert(!rectanglesOverlap(overlay.pilotOrdersBounds, overlay.closeButtonBounds), 'Pilot Orders overlaps Close button.');
  for (const bounds of [overlay.deathCoachBounds, overlay.pilotOrdersBounds, overlay.closeButtonBounds]) {
    assertContains(panel, bounds, 'Run Report lower band');
  }
}

async function captureViewport(page, viewport) {
  await page.setViewportSize(viewport);
  await page.waitForFunction(({ width, height }) => {
    const screen = window.__game?.app?.screen;
    return Math.round(screen?.width || 0) === width && Math.round(screen?.height || 0) === height;
  }, viewport, { timeout: 5000 });
  await page.evaluate(() => {
    const scene = window.__game?.scenes?.gameOver;
    scene?.layoutScreen?.();
  });
  const state = await readState(page);
  assertOpenReport(state, viewport);
  const screenshotName = `run-report-open-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: path.join(outputDir, screenshotName), fullPage: true });
  return { viewport, screenshotName, overlay: state.gameOver.runReportOverlay };
}

function centerOf(bounds) {
  return {
    x: (Number(bounds.x) || 0) + (Number(bounds.width) || 0) / 2,
    y: (Number(bounds.y) || 0) + (Number(bounds.height) || 0) / 2
  };
}

let server = null;
let browser = null;
const consoleEvents = [];

try {
  assertLocalOnlyHelper();
  mkdirSync(outputDir, { recursive: true });
  server = await startPreviewServer();
  const executablePath = findChrome();
  browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: error.message }));
  await page.addInitScript(() => {
    window.__NOVA_SWARM_SKIP_GAMEOVER_INTERLUDE__ = true;
    window.__NOVA_SWARM_MOCK_STEAM_LEADERBOARD__ = true;
    localStorage.setItem('novaSwarm.mockSteamPersona.v1', 'RUNREPORT');
  });
  await page.goto(`${baseUrl}/?autostart=1&mockSteamLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player && window.render_game_to_text, null, { timeout: 30000 });

  await forceRunReportScenario(page);
  const defaultState = await readState(page);
  assertDefaultGameOver(defaultState);

  await installNetworkGuard(page);
  const target = centerOf(defaultState.gameOver.runReportCta);
  await page.mouse.click(target.x, target.y);
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.gameOver?.runReportOverlay?.visible === true;
  }, null, { timeout: 5000 });
  const viewportResults = [];
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
    { width: 960, height: 640 }
  ]) {
    viewportResults.push(await captureViewport(page, viewport));
  }
  const openState = await readState(page);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'gameOver' && state.gameOver?.runReportOverlay?.visible === false;
  }, null, { timeout: 5000 });
  const closedState = await readState(page);
  assert(closedState.gameOver?.primaryCta?.visible, 'Primary restart CTA should remain visible after closing Run Report.');

  const networkCalls = await page.evaluate(() => window.__runReportNetworkCalls || []);
  assert(networkCalls.length === 0, `Run Report open/close should not call network/upload APIs: ${JSON.stringify(networkCalls, null, 2)}`);

  const report = {
    status: 'passed',
    baseUrl,
    outputDir,
    defaultState: {
      runReport: defaultState.runReport,
      gameOver: {
        primaryCta: defaultState.gameOver.primaryCta,
        leaderboardCta: defaultState.gameOver.leaderboardCta,
        counterAdviceCard: defaultState.gameOver.counterAdviceCard,
        runReportCta: defaultState.gameOver.runReportCta,
        runReportOverlay: defaultState.gameOver.runReportOverlay
      }
    },
    openOverlay: openState.gameOver.runReportOverlay,
    viewportResults,
    closedOverlay: closedState.gameOver.runReportOverlay,
    networkCalls,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (consoleEvents.some((event) => event.type === 'pageerror')) {
    throw new Error(`Page errors during run-report check: ${JSON.stringify(consoleEvents, null, 2)}`);
  }
  console.log(`[run-report] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[run-report] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
