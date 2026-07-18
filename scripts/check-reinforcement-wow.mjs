import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const requestedUrl = process.env.REINFORCEMENT_WOW_URL || null;
const outputDir = path.resolve(process.env.REINFORCEMENT_WOW_OUTPUT_DIR || 'test-results/reinforcement-wow');
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

function fail(message) {
  throw new Error(`[check-reinforcement-wow] ${message}`);
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, String(value));
  return next.toString();
}

async function findAvailablePort(start = 4498) {
  for (let port = start; port < start + 40; port += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(port, host);
    });
    if (available) return port;
  }
  fail(`no local port available from ${start}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startServer() {
  if (requestedUrl) return { baseUrl: requestedUrl, server: null };
  const port = await findAvailablePort();
  const baseUrl = `http://${host}:${port}`;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (!existsSync(viteEntry)) fail('Vite is missing; run npm ci first');
  const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return { baseUrl, server };
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  fail(`Vite did not start at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function capture(page, filename) {
  const target = path.join(outputDir, filename);
  await page.screenshot({ path: target, fullPage: false });
  return target;
}

mkdirSync(outputDir, { recursive: true });
const pageErrors = [];
const { baseUrl, server } = await startServer();
const executablePath = findChrome();
if (!executablePath) fail('Installed Chrome was not found');
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (error) => pageErrors.push(error.message));

const report = { baseUrl, screenshots: {}, states: {}, pageErrors };
try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    startLevel: '12',
    debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'play' && Boolean(window.__game?.scenes?.play?.enemyManager);
    } catch {
      return false;
    }
  }, { timeout: 30000 });
  await page.waitForTimeout(2800);
  await page.waitForFunction(() => (
    window.__game?.scenes?.play?.getMayhemReinforcementPreviewTextures?.(3)?.length >= 3
  ), { timeout: 30000 });

  const forced = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) throw new Error('play scene is unavailable');
    game.markUnrankedRun?.('reinforcement_wow_visual_check');
    game.level = 12;
    manager.level = 12;
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    manager.waveEnding = false;
    manager.mayhemReinforcementState = null;
    play.shipIntroToken = (Number(play.shipIntroToken) || 0) + 1;
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.introOverlay = null;
    play.uiOverlay?.children
      ?.filter((child) => child?.label === 'ship_intro_overlay' || child?.label === 'ship_intro_flash')
      .forEach((child) => {
        child.parent?.removeChild(child);
        child.destroy?.({ children: true });
      });
    play.clearSectorArrivalStinger?.();
    if (play.player) {
      play.player.invulnerable = true;
      play.player.invulnerableTime = 120000;
    }
    return manager.forceMayhemSuperStormForDebug();
  });
  if (!forced?.ok || forced.groupCount !== 3) fail(`debug super storm did not arm correctly: ${JSON.stringify(forced)}`);

  await page.waitForTimeout(620);
  report.states.warning = await readState(page);
  report.screenshots.warning = await capture(page, '01-warning-desktop.png');
  const warningPresentation = report.states.warning.reinforcementPresentation;
  if (warningPresentation?.phase !== 'warning' || warningPresentation?.groupCount !== 3 || !warningPresentation?.superStorm) {
    fail(`warning presentation state is wrong: ${JSON.stringify(warningPresentation)}`);
  }
  if (warningPresentation.gateCount !== 3 || warningPresentation.previewShipCount !== 3) {
    fail(`warning must preview a real ship in every gate: ${JSON.stringify(warningPresentation)}`);
  }
  if (!warningPresentation.scoreNeutral || !warningPresentation.hudSafe || !warningPresentation.signalPlateVisible) {
    fail(`warning must be score-neutral and HUD-safe: ${JSON.stringify(warningPresentation)}`);
  }
  if (warningPresentation.gatePositions?.length !== 3 ||
    warningPresentation.gatePositions[2] - warningPresentation.gatePositions[0] < 800) {
    fail(`warning gates must span the playfield: ${JSON.stringify(warningPresentation.gatePositions)}`);
  }
  const warningPlacement = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const effect = play?.decorativeOverlay?.children?.find((child) => child?.label === 'mayhem_reinforcement_storm_warning');
    const signalPlate = play?.uiOverlay?.children?.find((child) => child?.label === 'ui_mayhem_reinforcement_signal_plate');
    const plateBounds = signalPlate?.getBounds?.();
    return {
      inDecorativeLayer: Boolean(effect),
      signalPlateVisible: Boolean(signalPlate?.visible),
      plateBounds: plateBounds ? {
        x: Math.round(plateBounds.x),
        y: Math.round(plateBounds.y),
        width: Math.round(plateBounds.width),
        height: Math.round(plateBounds.height)
      } : null,
      decorativeLayerIndex: play?.container?.getChildIndex?.(play.decorativeOverlay) ?? -1,
      uiLayerIndex: play?.container?.getChildIndex?.(play.uiContainer) ?? -1
    };
  });
  if (!warningPlacement.inDecorativeLayer || warningPlacement.decorativeLayerIndex >= warningPlacement.uiLayerIndex) {
    fail(`warning must render beneath the HUD: ${JSON.stringify(warningPlacement)}`);
  }
  if (!warningPlacement.signalPlateVisible || warningPlacement.plateBounds?.y < 100 ||
    warningPlacement.plateBounds?.x < 420 ||
    warningPlacement.plateBounds?.x + warningPlacement.plateBounds?.width > 1500) {
    fail(`signal plate overlaps the permanent desktop HUD: ${JSON.stringify(warningPlacement)}`);
  }

  await page.evaluate(() => {
    const frameSample = { active: true, last: null, deltas: [] };
    window.__reinforcementWowFrameSample = frameSample;
    const sampleFrame = (timestamp) => {
      if (!frameSample.active) return;
      if (frameSample.last !== null) frameSample.deltas.push(timestamp - frameSample.last);
      frameSample.last = timestamp;
      window.requestAnimationFrame(sampleFrame);
    };
    window.requestAnimationFrame(sampleFrame);
    const manager = window.__game?.scenes?.play?.enemyManager;
    manager.mayhemReinforcementState.spawnAt = Date.now() - 1;
    manager.updateMayhemReinforcement();
  });
  await page.waitForTimeout(720);
  const entryFramePerformance = await page.evaluate(() => {
    const frameSample = window.__reinforcementWowFrameSample;
    if (frameSample) frameSample.active = false;
    const deltas = [...(frameSample?.deltas || [])].sort((left, right) => left - right);
    const percentile = (ratio) => deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * ratio))] || 0;
    return {
      frames: deltas.length,
      averageMs: deltas.length ? Number((deltas.reduce((total, value) => total + value, 0) / deltas.length).toFixed(2)) : 0,
      p95Ms: Number(percentile(0.95).toFixed(2)),
      maxMs: Number((deltas[deltas.length - 1] || 0).toFixed(2)),
      framesOver50Ms: deltas.filter((value) => value > 50).length
    };
  });
  report.states.entryFramePerformance = entryFramePerformance;
  if (entryFramePerformance.frames < 24 || entryFramePerformance.p95Ms > 30 || entryFramePerformance.framesOver50Ms > 1) {
    fail(`reinforcement arrival stuttered under full VFX load: ${JSON.stringify(entryFramePerformance)}`);
  }
  report.states.entry = await readState(page);
  report.screenshots.entry = await capture(page, '02-entry-desktop.png');
  const entryPresentation = report.states.entry.reinforcementPresentation;
  if (entryPresentation?.phase !== 'entry' || entryPresentation?.entryBursts < 3 || entryPresentation?.lastEntryGroup !== 2) {
    fail(`entry burst sequence is incomplete: ${JSON.stringify(entryPresentation)}`);
  }
  if (entryPresentation.signalPlateVisible || entryPresentation.entryImpactCount < 3 || entryPresentation.arrivalAudioLayerCount < 3) {
    fail(`entry must replace the warning plate with layered impacts: ${JSON.stringify(entryPresentation)}`);
  }
  const sortedEntryPositions = [...(entryPresentation.entryPositions || [])].sort((left, right) => left - right);
  if (sortedEntryPositions.length !== 3 || sortedEntryPositions[2] - sortedEntryPositions[0] < 800 ||
    sortedEntryPositions[1] - sortedEntryPositions[0] < 350 ||
    sortedEntryPositions[2] - sortedEntryPositions[1] < 350) {
    fail(`entry impacts must hit three distinct lanes: ${JSON.stringify(sortedEntryPositions)}`);
  }
  const reinforcementEnemies = await page.evaluate(() => window.__game?.scenes?.play?.enemyManager?.enemies
    ?.filter((enemy) => enemy?.isMayhemReinforcement).length || 0);
  if (reinforcementEnemies <= 0) fail('integrated super storm did not spawn reinforcement enemies');
  const reinforcementWakeAudit = await page.evaluate(() => {
    const reinforcements = window.__game?.scenes?.play?.enemyManager?.enemies
      ?.filter((enemy) => enemy?.isMayhemReinforcement) || [];
    return {
      superStormShips: reinforcements.filter((enemy) => enemy?.isMayhemSuperStorm).length,
      swarmEntryShips: reinforcements.filter((enemy) => enemy?.isReinforcementSwarmEntry).length,
      longCueShips: reinforcements.filter((enemy) => Number(enemy?.spawnCueDurationMs) >= 1500).length,
      visibleWakeShips: reinforcements.filter((enemy) => Number(enemy?.spawnCueLayer?._debugSpawnCue?.reinforcementWakeCount) >= 7).length
    };
  });
  report.states.reinforcementWakeAudit = reinforcementWakeAudit;
  if (reinforcementWakeAudit.superStormShips <= 0 || reinforcementWakeAudit.swarmEntryShips <= 0 ||
    reinforcementWakeAudit.longCueShips <= 0 || reinforcementWakeAudit.visibleWakeShips <= 0) {
    fail(`reinforcement ships lost their super-storm wake: ${JSON.stringify(reinforcementWakeAudit)}`);
  }

  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const game = window.__game;
    const play = window.__game?.scenes?.play;
    const manager = play?.enemyManager;
    manager?.clearEnemies?.();
    if (play?.bulletManager) {
      play.bulletManager.enemyBullets = [];
      play.bulletManager.playerBullets = [];
    }
    if (game) game.score = Math.max(Number(game.score) || 0, 1800);
    play.activeMayhemReinforcementWarning?.cleanup?.();
    play.showMayhemReinforcementStormSurvived({ groupCount: 3, score: 1800, superStorm: true });
  });
  await page.waitForTimeout(260);
  report.states.survived = await readState(page);
  report.screenshots.survived = await capture(page, '03-survived-desktop.png');
  const survivedPresentation = report.states.survived.reinforcementPresentation;
  if (survivedPresentation?.phase !== 'survived' || survivedPresentation?.score !== 1800 || !survivedPresentation?.active) {
    fail(`survival payoff state is wrong: ${JSON.stringify(survivedPresentation)}`);
  }

  const compactPage = await browser.newPage({ viewport: { width: 960, height: 540 } });
  compactPage.on('pageerror', (error) => pageErrors.push(error.message));
  await compactPage.goto(withQuery(baseUrl, { autostart: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await compactPage.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'play', { timeout: 30000 });
  await compactPage.waitForTimeout(2800);
  await compactPage.waitForFunction(() => (
    window.__game?.scenes?.play?.getMayhemReinforcementPreviewTextures?.(3)?.length >= 3
  ), { timeout: 30000 });
  await compactPage.evaluate(() => {
    const play = window.__game?.scenes?.play;
    play.shipIntroToken = (Number(play.shipIntroToken) || 0) + 1;
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.introOverlay = null;
    play.uiOverlay?.children
      ?.filter((child) => child?.label === 'ship_intro_overlay' || child?.label === 'ship_intro_flash')
      .forEach((child) => {
        child.parent?.removeChild(child);
        child.destroy?.({ children: true });
      });
    play.clearSectorArrivalStinger?.();
    play.showMayhemReinforcementStormWarning({ groupCount: 3, superStorm: false, warningMs: 2000 });
  });
  await compactPage.waitForTimeout(420);
  report.states.compact = await readState(compactPage);
  report.screenshots.compact = path.join(outputDir, '04-warning-compact.png');
  await compactPage.screenshot({ path: report.screenshots.compact, fullPage: false });
  const compactPresentation = report.states.compact.reinforcementPresentation;
  if (compactPresentation?.groupCount !== 3 || compactPresentation?.previewShipCount !== 3) {
    fail(`compact warning lost its three-ship signature: ${JSON.stringify(compactPresentation)}`);
  }
  if (!compactPresentation.hudSafe || !compactPresentation.signalPlateVisible ||
    compactPresentation.signalPlateBounds?.y < 100 ||
    compactPresentation.signalPlateBounds?.x < 190 ||
    compactPresentation.signalPlateBounds?.x + compactPresentation.signalPlateBounds?.width > 770) {
    fail(`compact warning overlaps the permanent HUD: ${JSON.stringify(compactPresentation)}`);
  }
  await compactPage.close();
  if (pageErrors.length) fail(`runtime page errors: ${pageErrors.join(' | ')}`);

  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[check-reinforcement-wow] PASS enemies=${reinforcementEnemies} screenshots=${Object.keys(report.screenshots).length} output=${outputDir}`);
} finally {
  await browser.close();
  server?.kill();
}
