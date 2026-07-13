import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4512));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/tactical-directives-${timestamp()}`);

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
  throw new Error(`No available Tactical Directives port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
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
  throw new Error(`Vite preview did not become ready at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function inside(inner, outer, tolerance = 2) {
  return inner && outer
    && inner.x >= outer.x - tolerance
    && inner.y >= outer.y - tolerance
    && inner.x + inner.width <= outer.x + outer.width + tolerance
    && inner.y + inner.height <= outer.y + outer.height + tolerance;
}

async function forceDirective(page, directiveId, progress = 0) {
  return page.evaluate(({ id, value }) => {
    const play = window.__game?.scenes?.play;
    if (!play?.hud) return { ok: false };
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.tacticalDirectiveSession = {
      directiveId: id,
      progress: value,
      target: null,
      uniqueValues: [],
      completed: false,
      completedAtEvent: null,
      eventCount: 0,
      milestonesShown: [],
      calibrationCount: 0,
      startedInSector: window.__game?.level || 1,
      lastProgressSector: window.__game?.level || 1,
      lastCalibrationSector: window.__game?.level || 1,
      reason: 'runtime_test'
    };
    play.tacticalDirectiveHistory = [];
    play.lastTacticalDirectiveCompletion = null;
    play.hud.update();
    const bounds = (display) => {
      const result = display?.getBounds?.();
      return result ? { x: result.x, y: result.y, width: result.width, height: result.height } : null;
    };
    return {
      ok: true,
      directive: structuredClone(play.getTacticalDirectiveDebugState()),
      hud: structuredClone(play.hud.directiveProgressBg?._debugDirective || null),
      bounds: {
        missionPanel: bounds(play.hud.missionPanel),
        directiveText: bounds(play.hud.directiveText)
      }
    };
  }, { id: directiveId, value: progress });
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
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
  await page.goto(`${baseUrl}?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.hud, null, { timeout: 90000 });
  await page.waitForTimeout(800);

  const desktop = await forceDirective(page, 'hostile_quota_t01_shield');
  desktop.screenshot = path.join(outputDir, 'tactical-directive-1920x1080.png');
  await page.screenshot({ path: desktop.screenshot, fullPage: true });
  report.scenarios.desktop = desktop;
  if (!desktop.ok || desktop.directive?.availableVariants !== 1000) failures.push(`desktop directive state missing: ${JSON.stringify(desktop)}`);
  if (desktop.directive?.active?.target !== 10 || desktop.directive?.active?.rewardId !== 'shield') failures.push(`desktop directive identity mismatch: ${JSON.stringify(desktop.directive?.active)}`);
  if (!desktop.hud?.visible || !/SIDE DIRECTIVE.*HOSTILE QUOTA.*0\/10.*REWARD.*SHIELD/.test(desktop.hud?.label || '')) failures.push(`desktop HUD label mismatch: ${desktop.hud?.label}`);
  if (!inside(desktop.bounds?.directiveText, desktop.bounds?.missionPanel)) failures.push(`desktop directive text escaped mission panel: ${JSON.stringify(desktop.bounds)}`);

  const adaptive = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.tacticalDirectiveSession.progress = 3;
    play.tacticalDirectiveSession.startedInSector = 1;
    play.tacticalDirectiveSession.lastProgressSector = 1;
    play.tacticalDirectiveSession.lastCalibrationSector = 1;
    const sector2 = structuredClone(play.adaptTacticalDirectiveForSector(2));
    const sector3 = structuredClone(play.adaptTacticalDirectiveForSector(3));
    const sector4 = structuredClone(play.adaptTacticalDirectiveForSector(4));
    return { sector2, sector3, sector4, session: structuredClone(play.tacticalDirectiveSession) };
  });
  report.scenarios.adaptiveCarry = adaptive;
  if (adaptive.sector2?.id !== 'hostile_quota_t01_shield' || adaptive.sector2?.progress !== 3 || adaptive.sector2?.target !== 10) {
    failures.push(`directive rotated or calibrated too early in sector 2: ${JSON.stringify(adaptive)}`);
  }
  if (adaptive.sector3?.id !== 'hostile_quota_t01_shield' || adaptive.sector3?.progress !== 3 || adaptive.sector3?.target !== 8 || adaptive.sector3?.calibrationCount !== 1) {
    failures.push(`adaptive carry did not preserve identity/progress in sector 3: ${JSON.stringify(adaptive)}`);
  }
  if (adaptive.sector4?.target !== 8 || adaptive.session?.lastCalibrationSector !== 3) {
    failures.push(`directive recalibrated again before a fresh two-sector drought: ${JSON.stringify(adaptive)}`);
  }

  await forceDirective(page, 'hostile_quota_t01_shield');

  const progress = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.emitTacticalDirectiveEvent('enemy_defeated', { enemyType: 'scout', comboCount: 4, count: 9 });
    play.hud.update();
    return {
      directive: structuredClone(play.getTacticalDirectiveDebugState()),
      hud: structuredClone(play.hud.directiveProgressBg?._debugDirective || null)
    };
  });
  report.scenarios.progress = progress;
  if (progress.directive?.active?.progress !== 9 || progress.hud?.ratio !== 0.9) failures.push(`directive progress mismatch: ${JSON.stringify(progress)}`);

  const completion = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.emitTacticalDirectiveEvent('enemy_defeated', { enemyType: 'diver', comboCount: 5, count: 1 });
    const rewardSpawned = play.powerupManager?.powerups?.some((powerup) => powerup.type === 'shield' && powerup.active !== false);
    return { directive: structuredClone(play.getTacticalDirectiveDebugState()), rewardSpawned };
  });
  report.scenarios.completion = completion;
  if (completion.directive?.completedCount !== 1 || completion.directive?.lastCompletion?.directiveId !== 'hostile_quota_t01_shield') failures.push(`directive completion history mismatch: ${JSON.stringify(completion)}`);
  if (!completion.rewardSpawned) failures.push('shield reward was not spawned on completion');
  if (completion.directive?.active?.id === 'hostile_quota_t01_shield') failures.push('completed directive repeated immediately');

  const rescan = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.tacticalDirectiveSession = {
      directiveId: 'graze_count_t01_rescan', progress: 0, target: 2, uniqueValues: [], completed: false, completedAtEvent: null, eventCount: 0
    };
    play.tacticalDirectiveHistory = [];
    play.tacticalDraftRescansRemaining = 0;
    play.emitTacticalDirectiveEvent('near_miss', { streak: 1 });
    play.emitTacticalDirectiveEvent('near_miss', { streak: 2 });
    return structuredClone(play.getTacticalDirectiveDebugState());
  });
  report.scenarios.rescan = rescan;
  if (rescan.completedCount !== 1 || rescan.lastCompletion?.rewardId !== 'rescan') failures.push(`rescan directive did not complete: ${JSON.stringify(rescan)}`);
  const rescanCount = await page.evaluate(() => window.__game.scenes.play.tacticalDraftRescansRemaining);
  if (rescanCount !== 1) failures.push(`rescan reward mismatch: ${rescanCount}`);

  await page.setViewportSize({ width: 840, height: 640 });
  await page.waitForTimeout(350);
  const compact = await forceDirective(page, 'enemy_variety_t03_drones');
  compact.screenshot = path.join(outputDir, 'tactical-directive-840x640.png');
  await page.screenshot({ path: compact.screenshot, fullPage: true });
  report.scenarios.compact = compact;
  if (!inside(compact.bounds?.directiveText, compact.bounds?.missionPanel)) failures.push(`compact directive text escaped mission panel: ${JSON.stringify(compact.bounds)}`);
  if (compact.bounds?.missionPanel?.x < 0 || compact.bounds?.missionPanel?.x + compact.bounds?.missionPanel?.width > 840) failures.push(`compact mission panel outside viewport: ${JSON.stringify(compact.bounds?.missionPanel)}`);

  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('de'));
  await page.waitForTimeout(180);
  const localized = await forceDirective(page, 'hostile_quota_t01_shield');
  localized.screenshot = path.join(outputDir, 'tactical-directive-840x640-de.png');
  await page.screenshot({ path: localized.screenshot, fullPage: true });
  report.scenarios.localized = localized;
  if (/SIDE DIRECTIVE|HOSTILE QUOTA|REWARD/.test(localized.hud?.label || '')) failures.push(`German directive retained English copy: ${localized.hud?.label}`);
  if (!inside(localized.bounds?.directiveText, localized.bounds?.missionPanel)) failures.push(`localized directive text escaped mission panel: ${JSON.stringify(localized.bounds)}`);

  const capped = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.tacticalDirectiveHistory = Array.from({ length: 5 }, (_, index) => ({ directiveId: `done-${index}` }));
    play.tacticalDirectiveSession = null;
    play.hud.update();
    return {
      directive: structuredClone(play.getTacticalDirectiveDebugState()),
      hud: structuredClone(play.hud.directiveProgressBg?._debugDirective || null),
      label: play.hud.directiveText?.text || ''
    };
  });
  report.scenarios.capped = capped;
  if (!capped.hud?.completed || capped.directive?.completedCount !== 5) failures.push(`completion cap HUD mismatch: ${JSON.stringify(capped)}`);

  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);
  report.ok = failures.length === 0;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) throw new Error(`[tactical-directive-runtime] ${failures.join('; ')}`);
  console.log(`[tactical-directive-runtime] PASS output=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
