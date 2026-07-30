import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const exePath = path.resolve('release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR ||
  `test-results/packaged-overrun-directive-qa-${new Date().toISOString().replace(/[:.]/g, '-')}`
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForCdp(port) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 90000) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(1500)
      })).ok) return;
    } catch {
      // Packaged Chromium is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Packaged CDP endpoint did not start on port ${port}`);
}

async function setLocale(page, locale) {
  await page.evaluate(async (nextLocale) => {
    await window.__novaI18n?.setLanguagePreference?.(nextLocale);
  }, locale);
}

async function dismissOverrun(page) {
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const interlude = play.overrunMilestoneInterlude;
    if (!interlude) return;
    interlude.confirmReadyAt = 0;
    play.confirmOverrunInterlude('packaged_qa');
    interlude.startedAt = Date.now() - interlude.durationMs - 1;
    if (interlude.effect) {
      interlude.effect.confirmed = true;
      interlude.effect.startedAt = Date.now() - interlude.effect.durationMs - 1;
    }
    play.updateOverrunMilestoneInterlude(1);
    play.clearToastState();
  });
}

async function captureOverrun(page, locale, filename) {
  await setLocale(page, locale);
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.triggerOverrunClearCelebration({
      nextSector: 11,
      milestoneSector: 10,
      eventKind: 'run_clear',
      clearBonus: 10000,
      livesBonus: 5000,
      milestoneReward: { label: 'CREW DROP: TACTICAL RESCAN RESTOCKED' }
    });
  });
  await page.waitForTimeout(800);
  const state = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const card = play.overrunMilestoneInterlude?.effect?.interludeCard;
    const texts = {};
    const visit = (node) => {
      if (node?.label && typeof node.text === 'string') texts[node.label] = node.text;
      for (const child of node?.children || []) visit(child);
    };
    visit(card);
    return {
      active: Boolean(play.overrunMilestoneInterlude?.active),
      texts,
      bounds: card ? play.getToastDisplayBounds(card) : null,
      visual: card?._debugOverrunVisual || null
    };
  });
  const visibleText = Object.values(state.texts).join('\n');
  for (const englishFallback of [
    'THE CLEAR GATE OPENS.',
    'SECTOR 11 WILL NOT BE POLITE',
    'STRAP IN, PILOT.'
  ]) {
    assert(
      !visibleText.includes(englishFallback),
      `${locale} Overrun modal retained English fallback ${JSON.stringify(englishFallback)}: ${visibleText}`
    );
  }
  assert(
    state.active &&
    state.bounds?.x >= 48 &&
    state.bounds?.y >= 48 &&
    state.bounds.x + state.bounds.width <= 1280 - 48 &&
    state.bounds.y + state.bounds.height <= 720 - 48,
    `${locale} Overrun modal violated the 1280x720 safe area: ${JSON.stringify(state)}`
  );
  const screenshot = path.join(outputDir, filename);
  await page.screenshot({ path: screenshot, fullPage: false });
  await dismissOverrun(page);
  return { ...state, screenshot };
}

async function captureDirectivePhase(page, elapsedMs, filename) {
  await page.evaluate(async (targetElapsedMs) => {
    const game = window.__game;
    const play = game.scenes.play;
    game.app.ticker.start();
    play.clearMayhemReinforcementPresentations('packaged_directive_phase');
    play.clearToastState();
    play.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN', momentumBonus: 0 });
    await new Promise((resolve) => setTimeout(resolve, targetElapsedMs));
    game.app.ticker.stop();
  }, elapsedMs);
  const state = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      type: play.activeCornerToast?.__toastMeta?.type || null,
      duration: play.activeCornerToast?.__toastMeta?.duration || 0,
      phase: play.activeCornerToast?._debugNovaCommandHud?.motionPhase || null,
      introMs: play.activeCornerToast?.__novaCommandHudFx?.introMs || 0,
      exitMs: play.activeCornerToast?.__novaCommandHudFx?.exitMs || 0,
      alpha: play.activeCornerToast?.alpha ?? null,
      bounds: play.activeCornerToast ? play.getToastDisplayBounds(play.activeCornerToast) : null
    };
  });
  const screenshot = path.join(outputDir, filename);
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.evaluate(() => {
    window.__game.app.ticker.start();
    window.__game.scenes.play.clearToastState();
  });
  return { ...state, elapsedMs, screenshot };
}

if (!existsSync(exePath)) throw new Error(`Packaged executable not found: ${exePath}`);
mkdirSync(outputDir, { recursive: true });
const port = await openPort();
const child = spawn(exePath, ['--windowed', `--remote-debugging-port=${port}`], {
  cwd: root,
  windowsHide: true,
  env: { ...process.env, NOVA_SWARM_USER_DATA_DIR: path.join(outputDir, 'userData') },
  stdio: ['ignore', 'pipe', 'pipe']
});
const stdout = [];
const stderr = [];
child.stdout.on('data', (chunk) => stdout.push(String(chunk)));
child.stderr.on('data', (chunk) => stderr.push(String(chunk)));

let browser;
let page;
const pageErrors = [];
const consoleErrors = [];
try {
  await waitForCdp(port);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000 && !page) {
    page = context.pages().find((candidate) =>
      candidate.url().includes('nova-swarm://') || candidate.url().includes('/index.html'));
    if (!page) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(page, 'Packaged renderer target not found');
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const runUrl = new URL(page.url());
  for (const [key, value] of Object.entries({
    desktop: '1',
    autostart: '1',
    controlSmoke: '1',
    offlineLeaderboard: '1'
  })) runUrl.searchParams.set(key, value);
  await page.goto(runUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play, null, { timeout: 30000 });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    play.clearRunContractStartNudge?.();
    play.completeFirstRunOnboarding?.();
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.clearToastState();
  });

  const german = await captureOverrun(page, 'de', '01-overrun-german-1280x720.png');
  const japanese = await captureOverrun(page, 'ja', '02-overrun-japanese-1280x720.png');
  await setLocale(page, 'en');

  const entrance = await captureDirectivePhase(page, 75, '03-side-directive-entrance-1280x720.png');
  const hold = await captureDirectivePhase(page, 450, '04-side-directive-full-hold-1280x720.png');
  const exit = await captureDirectivePhase(page, 930, '05-side-directive-exit-1280x720.png');
  assert(
    entrance.type === 'tacticalDirective' &&
    entrance.phase === 'entrance' &&
    entrance.duration === 1100 &&
    entrance.introMs === 150 &&
    entrance.exitMs === 220,
    `Packaged Side Directive entrance/timing mismatch: ${JSON.stringify(entrance)}`
  );
  assert(
    hold.type === 'tacticalDirective' && hold.phase === 'hold' && hold.alpha === 1,
    `Packaged Side Directive was not fully readable during hold: ${JSON.stringify(hold)}`
  );
  assert(
    exit.type === 'tacticalDirective' && exit.phase === 'exit' && exit.alpha < 1,
    `Packaged Side Directive did not enter its concise exit: ${JSON.stringify(exit)}`
  );

  await page.evaluate(async () => {
    const game = window.__game;
    const play = game.scenes.play;
    game.app.ticker.start();
    play.clearToastState();
    play.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN', momentumBonus: 0 });
    await new Promise((resolve) => setTimeout(resolve, 350));
    play.showMayhemRoutineReinforcementWarning({
      groupCount: 2,
      route: 'side_left',
      warningMs: 700
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
    game.app.ticker.stop();
  });
  const interrupted = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      tacticalActive: Boolean(play.activeMayhemRoutineWarning?.root?.parent),
      activeCornerType: play.activeCornerToast?.__toastMeta?.type || null,
      queuedCornerTypes: play.toastCornerQueue.map((entry) => entry.options?.type)
    };
  });
  assert(
    interrupted.tacticalActive &&
    interrupted.activeCornerType === null &&
    interrupted.queuedCornerTypes.includes('tacticalDirective'),
    `Packaged tactical alert did not interrupt and preserve Side Directive: ${JSON.stringify(interrupted)}`
  );
  const interruptedScreenshot = path.join(outputDir, '06-side-directive-interrupted-by-tactical-1280x720.png');
  await page.screenshot({ path: interruptedScreenshot, fullPage: false });

  await page.evaluate(async () => {
    const game = window.__game;
    const play = game.scenes.play;
    game.app.ticker.start();
    await new Promise((resolve) => setTimeout(resolve, 760));
    play.processToastQueue();
    await new Promise((resolve) => setTimeout(resolve, 80));
    game.app.ticker.stop();
  });
  const resumed = await page.evaluate(() => ({
    type: window.__game.scenes.play.activeCornerToast?.__toastMeta?.type || null,
    phase: window.__game.scenes.play.activeCornerToast?._debugNovaCommandHud?.motionPhase || null
  }));
  assert(resumed.type === 'tacticalDirective',
    `Packaged Side Directive did not resume after tactical alert: ${JSON.stringify(resumed)}`);
  const resumedScreenshot = path.join(outputDir, '07-side-directive-resumed-1280x720.png');
  await page.screenshot({ path: resumedScreenshot, fullPage: false });
  await page.evaluate(() => window.__game.app.ticker.start());

  assert(pageErrors.length === 0, `Packaged page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `Packaged console errors: ${consoleErrors.join(' | ')}`);
  const report = {
    status: 'passed',
    exePath,
    outputDir,
    overrun: { german, japanese },
    directive: {
      totalMs: entrance.duration,
      introMs: entrance.introMs,
      readableHoldMs: entrance.duration - entrance.introMs - entrance.exitMs,
      exitMs: entrance.exitMs,
      entrance,
      hold,
      exit,
      interrupted: { ...interrupted, screenshot: interruptedScreenshot },
      resumed: { ...resumed, screenshot: resumedScreenshot }
    },
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[packaged-overrun-directive-qa] PASS output=${outputDir}`);
} finally {
  if (page) await page.evaluate(() => window.__novaApp?.exitGame?.()).catch(() => {});
  await browser?.close().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 750));
  if (!child.killed) child.kill();
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'process.log'), `${stdout.join('')}\n${stderr.join('')}`);
}
