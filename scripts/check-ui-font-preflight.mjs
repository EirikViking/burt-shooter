import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(Number(process.env.CHECK_UI_FONT_PORT_START || 4590));
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(`test-results/ui-font-preflight-${timestamp()}`);
const languages = ['en', 'de', 'zh-CN', 'ru', 'es', 'pt-BR', 'ko', 'ja'];
const viewports = [
  { width: 1280, height: 720 },
  { width: 960, height: 640 }
];
const criticalFamilyPattern = /\b(?:Orbitron|Rajdhani)\b/i;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise(resolve => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No available port starting at ${startPort}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find(candidate => existsSync(candidate));
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startVite() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', chunk => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', chunk => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (await canFetch(baseUrl)) return server;
    await sleep(250);
  }
  server.kill();
  throw new Error(`Vite did not become ready at ${baseUrl}`);
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs))
  ]);
}

async function waitForMenu(page) {
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const scene = window.__game?.scenes?.menu;
    return scene?.newPilotCue?.visible && scene?.newPilotCueLabel?.text;
  }, null, { timeout: 15000 });
}

async function inspectCue(page) {
  return page.evaluate(() => {
    const scene = window.__game?.scenes?.menu;
    const label = scene?.newPilotCueLabel;
    const frame = scene?.newPilotCue?._labelFrameRect;
    const labelBounds = label?.getBounds?.();
    const localBounds = label?.getLocalBounds?.();
    const frameBounds = frame && scene?.newPilotCue?.getGlobalPosition
      ? (() => {
        const origin = scene.newPilotCue.getGlobalPosition();
        return {
          x: origin.x + frame.x,
          y: origin.y + frame.y,
          width: frame.width,
          height: frame.height
        };
      })()
      : null;
    const worldTransform = label?.worldTransform || null;
    return {
      policy: window.__novaUiFontPolicy?.getState?.() || null,
      language: window.__novaI18n?.getCurrentLanguage?.() || null,
      text: label?.text || null,
      fontFamily: String(label?.style?.fontFamily || ''),
      fontSize: Number(label?.style?.fontSize || 0),
      labelBounds: labelBounds ? {
        x: labelBounds.x,
        y: labelBounds.y,
        width: labelBounds.width,
        height: labelBounds.height
      } : null,
      localBounds: localBounds ? {
        width: localBounds.width,
        height: localBounds.height
      } : null,
      frameBounds,
      worldScaleX: worldTransform ? Math.hypot(worldTransform.a, worldTransform.b) : 0,
      worldScaleY: worldTransform ? Math.hypot(worldTransform.c, worldTransform.d) : 0,
      labelScaleX: Number(label?.scale?.x || 0),
      labelScaleY: Number(label?.scale?.y || 0)
    };
  });
}

function assertCue(snapshot, { expectedMode, requireCriticalFamily }) {
  const failures = [];
  if (snapshot.policy?.mode !== expectedMode) failures.push(`policy expected ${expectedMode}, got ${snapshot.policy?.mode || 'missing'}`);
  if (!snapshot.text) failures.push('new-pilot cue text is missing');
  if (snapshot.text?.includes('STF HERE')) failures.push(`cue contains reproduced corrupt text: ${snapshot.text}`);
  if (requireCriticalFamily && !criticalFamilyPattern.test(snapshot.fontFamily)) failures.push(`bundled mode lost critical family: ${snapshot.fontFamily}`);
  if (!requireCriticalFamily && criticalFamilyPattern.test(snapshot.fontFamily)) failures.push(`fallback mode retained critical family: ${snapshot.fontFamily}`);
  if (!snapshot.labelBounds || !snapshot.frameBounds) {
    failures.push('cue bounds are missing');
  } else {
    const padding = 2;
    const labelRight = snapshot.labelBounds.x + snapshot.labelBounds.width;
    const labelBottom = snapshot.labelBounds.y + snapshot.labelBounds.height;
    const frameRight = snapshot.frameBounds.x + snapshot.frameBounds.width;
    const frameBottom = snapshot.frameBounds.y + snapshot.frameBounds.height;
    if (snapshot.labelBounds.x < snapshot.frameBounds.x + padding) failures.push('cue text touches left frame');
    if (snapshot.labelBounds.y < snapshot.frameBounds.y + padding) failures.push('cue text touches top frame');
    if (labelRight > frameRight - padding) failures.push('cue text touches right frame');
    if (labelBottom > frameBottom - padding) failures.push('cue text touches bottom frame');
  }
  if (!snapshot.localBounds || snapshot.localBounds.width <= 0 || snapshot.localBounds.height <= 0) {
    failures.push('final-font local text metrics are invalid');
  } else if (snapshot.labelBounds) {
    const expectedWidth = snapshot.localBounds.width * snapshot.worldScaleX;
    const expectedHeight = snapshot.localBounds.height * snapshot.worldScaleY;
    if (Math.abs(expectedWidth - snapshot.labelBounds.width) > 1.5) failures.push('world width disagrees with final-font local metrics');
    if (Math.abs(expectedHeight - snapshot.labelBounds.height) > 1.5) failures.push('world height disagrees with final-font local metrics');
  }
  if (!(snapshot.labelScaleX > 0) || !(snapshot.labelScaleY > 0)) failures.push('cue scale is invalid');
  return failures;
}

async function createInstrumentedPage(browser, viewport, routeMode) {
  const context = await browser.newContext({ viewport });
  let routeStartedResolve;
  const routeStarted = new Promise(resolve => { routeStartedResolve = resolve; });
  await context.route('**/fonts/orbitron-900.ttf', async route => {
    routeStartedResolve();
    if (routeMode === 'fail') {
      await route.abort('failed');
      return;
    }
    await sleep(routeMode === 'success-delay' ? 520 : 1900);
    await route.continue();
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  return { context, page, routeStarted, consoleErrors, pageErrors };
}

async function runSuccessMatrix(browser) {
  const results = [];
  for (const viewport of viewports) {
    const fixture = await createInstrumentedPage(browser, viewport, 'success-delay');
    const startedAt = Date.now();
    await fixture.page.goto(`${baseUrl}/?skipIntro=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await withTimeout(fixture.routeStarted, 15000, 'Orbitron 900 request');
    await sleep(220);
    const constructedWhilePending = await fixture.page.evaluate(() => Boolean(window.__game));
    await waitForMenu(fixture.page);
    const menuReadyMs = Date.now() - startedAt;
    await fixture.page.waitForTimeout(900);

    for (const language of languages) {
      await fixture.page.evaluate(code => window.__novaI18n?.setLanguagePreference?.(code), language);
      await fixture.page.waitForFunction(code => window.__novaI18n?.getCurrentLanguage?.() === code, language);
      await fixture.page.waitForTimeout(80);
      const snapshot = await inspectCue(fixture.page);
      const screenshot = path.join(outputDir, `success-${viewport.width}x${viewport.height}-${language}.png`);
      await fixture.page.screenshot({ path: screenshot });
      results.push({ viewport, language, snapshot, screenshot });
    }

    const failures = results
      .filter(result => result.viewport.width === viewport.width)
      .flatMap(result => assertCue(result.snapshot, { expectedMode: 'bundled', requireCriticalFamily: true }));
    if (constructedWhilePending) failures.push('Game constructed while delayed Orbitron 900 was still pending');
    failures.push(...fixture.consoleErrors.map(error => `console error: ${error}`));
    failures.push(...fixture.pageErrors.map(error => `page error: ${error}`));
    if (failures.length) throw new Error(`success ${viewport.width}x${viewport.height}:\n${failures.join('\n')}`);
    results.at(-1).menuReadyMs = menuReadyMs;
    await fixture.context.close();
  }
  return results;
}

async function runFallbackScenario(browser, routeMode) {
  const viewport = { width: 1280, height: 720 };
  const fixture = await createInstrumentedPage(browser, viewport, routeMode);
  const startedAt = Date.now();
  await fixture.page.goto(`${baseUrl}/?skipIntro=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await withTimeout(fixture.routeStarted, 15000, 'Orbitron 900 request');
  await waitForMenu(fixture.page);
  const menuReadyMs = Date.now() - startedAt;
  const first = await inspectCue(fixture.page);
  await fixture.page.evaluate(() => {
    const label = window.__game?.scenes?.menu?.newPilotCueLabel;
    if (label?.style) label.style.fontFamily = 'Orbitron, Rajdhani, Bahnschrift, sans-serif';
  });
  await fixture.page.waitForTimeout(routeMode === 'timeout' ? 1100 : 1200);
  await fixture.page.evaluate(() => document.fonts?.ready);
  const afterLateLoad = await inspectCue(fixture.page);
  const screenshot = path.join(outputDir, `${routeMode}-1280x720.png`);
  await fixture.page.screenshot({ path: screenshot });
  const failures = [
    ...assertCue(first, { expectedMode: 'fallback_pinned', requireCriticalFamily: false }),
    ...assertCue(afterLateLoad, { expectedMode: 'fallback_pinned', requireCriticalFamily: false }),
    ...fixture.pageErrors.map(error => `page error: ${error}`)
  ];
  const unexpectedConsoleErrors = fixture.consoleErrors.filter(error => (
    routeMode !== 'fail' || !/Failed to load resource:\s+net::ERR_FAILED/i.test(error)
  ));
  failures.push(...unexpectedConsoleErrors.map(error => `console error: ${error}`));
  if (failures.length) throw new Error(`${routeMode}:\n${failures.join('\n')}`);
  await fixture.context.close();
  return { routeMode, menuReadyMs, first, afterLateLoad, screenshot };
}

mkdirSync(outputDir, { recursive: true });
const server = await startVite();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required', '--disk-cache-size=0', '--media-cache-size=0']
});

try {
  const success = await runSuccessMatrix(browser);
  const timeout = await runFallbackScenario(browser, 'timeout');
  const failure = await runFallbackScenario(browser, 'fail');
  const report = {
    ok: true,
    outputDir,
    success,
    timeout,
    failure
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[ui-font-preflight] PASS locales=${languages.length} layouts=${viewports.length} timeoutMode=${timeout.afterLateLoad.policy.mode} failureMode=${failure.afterLateLoad.policy.mode}`);
  console.log(`[ui-font-preflight] evidence=${path.relative(process.cwd(), outputDir).replaceAll(path.sep, '/')}`);
} finally {
  await browser.close();
  server.kill();
}
