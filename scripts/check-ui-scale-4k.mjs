import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4372));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ui-scale-4k-${timestamp()}`);
const scenarios = [
  { name: '1920x1080-scale100', width: 1920, height: 1080, scale: 1 },
  { name: '1920x1080-scale150', width: 1920, height: 1080, scale: 1.5 },
  { name: '1920x1080-scale175', width: 1920, height: 1080, scale: 1.75 },
  { name: '1920x1080-scale200', width: 1920, height: 1080, scale: 2 },
  { name: '3840x2160-scale100', width: 3840, height: 2160, scale: 1 },
  { name: '3840x2160-scale150', width: 3840, height: 2160, scale: 1.5 },
  { name: '3840x2160-scale175', width: 3840, height: 2160, scale: 1.75 },
  { name: '3840x2160-scale200', width: 3840, height: 2160, scale: 2 }
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
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForScene(page, scene) {
  await page.waitForFunction((expected) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === expected;
  }, scene, { timeout: 30000 });
}

async function snapshot(page, scenarioDir, name) {
  const file = path.join(scenarioDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const state = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
  const audit = await page.evaluate(() => {
    const width = window.__game?.getWidth?.() || window.innerWidth;
    const height = window.__game?.getHeight?.() || window.innerHeight;
    const samples = [];
    const failures = [];
    const seen = new Set();
    const visit = (node) => {
      if (!node || seen.has(node)) return;
      seen.add(node);
      if (node.visible === false || node.renderable === false || node.alpha === 0) return;
      const isText = node.constructor?.name === 'Text';
      const label = String(node.label || node.name || '');
      if (isText || label.startsWith('ui_')) {
        let bounds = null;
        try {
          const rect = node.getBounds?.();
          bounds = rect ? {
            x: Math.round(rect.x || 0),
            y: Math.round(rect.y || 0),
            width: Math.round(rect.width || 0),
            height: Math.round(rect.height || 0),
            right: Math.round((rect.x || 0) + (rect.width || 0)),
            bottom: Math.round((rect.y || 0) + (rect.height || 0))
          } : null;
        } catch {
          bounds = null;
        }
        const text = isText ? String(node.text ?? '') : '';
        if (/NaN|undefined|null/.test(text)) failures.push(`bad text "${text}" on ${label || 'text'}`);
        if (bounds && bounds.width > 0 && bounds.height > 0) {
          const slackX = Math.max(80, width * 0.08);
          const slackY = Math.max(80, height * 0.08);
          if (bounds.right < -slackX || bounds.bottom < -slackY || bounds.x > width + slackX || bounds.y > height + slackY) {
            failures.push(`offscreen ${label || text.slice(0, 30)} ${JSON.stringify(bounds)}`);
          }
          if (samples.length < 80) samples.push({ label, text: text.slice(0, 80), bounds });
        }
      }
      for (const child of node.children || []) visit(child);
    };
    visit(window.__game?.currentScene?.container);
    visit(window.__game?.scenes?.play?.uiOverlay);
    return { width, height, samples, failures };
  });
  return { file, scene: state.scene, display: state.display, layout: state.layout, audit };
}

async function openMenu(page, scenarioDir, shots) {
  await page.evaluate(() => window.__game?.switchScene?.('menu'));
  await waitForScene(page, 'menu');
  await page.waitForTimeout(1800);
  shots.push(await snapshot(page, scenarioDir, '01-main-menu-launch-deck'));
}

async function captureSettings(page, scenarioDir, shots, expectedScale) {
  await page.evaluate(() => window.__game?.currentScene?.openSettingsOverlay?.());
  await page.waitForFunction(() => Boolean(window.__game?.currentScene?.settingsOverlay), null, { timeout: 10000 });
  const state = await page.evaluate(() => {
    const overlay = window.__game?.currentScene?.settingsOverlay;
    const before = JSON.parse(window.render_game_to_text?.() || '{}');
    overlay?.setControlFocus?.(overlay.controls?.findIndex?.((entry) => entry.id === 'ui_scale') ?? 0);
    return {
      before,
      debug: overlay?.getDebugState?.(),
      stored: window.localStorage?.getItem?.('nova_ui_scale_v1')
    };
  });
  assert(Number(state.before.display?.uiScale) === expectedScale, `display uiScale mismatch: ${state.before.display?.uiScale} !== ${expectedScale}`);
  assert(Number(state.before.layout?.uiScale) === expectedScale, `layout uiScale mismatch: ${state.before.layout?.uiScale} !== ${expectedScale}`);
  assert(String(state.debug?.display?.uiScaleLabel || state.debug?.display?.uiScale || '').length > 0 || state.stored, 'settings debug did not expose UI scale');
  shots.push(await snapshot(page, scenarioDir, '02-settings-display-ui-scale'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__game?.currentScene?.settingsOverlay, null, { timeout: 10000 });
}

async function captureHangar(page, scenarioDir, shots) {
  await page.evaluate(() => window.__game?.showShipSelect?.());
  await waitForScene(page, 'shipSelect');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return Boolean(state.shipSelect?.shipName);
  }, null, { timeout: 20000 });
  await page.waitForTimeout(600);
  shots.push(await snapshot(page, scenarioDir, '03-hangar-combat-readout'));
  await page.evaluate(() => window.__game?.currentScene?.openSelectedShipDetails?.());
  await waitForScene(page, 'shipDetails');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return /^Unlocked: |^Unlock: /.test(String(state.shipDetails?.unlockProvenanceText || ''));
  }, null, { timeout: 10000 });
  shots.push(await snapshot(page, scenarioDir, '04-hangar-details-unlock-history'));
  await page.evaluate(() => window.__game?.currentScene?.goBack?.());
  await waitForScene(page, 'shipSelect');
  await page.evaluate(() => window.__game?.currentScene?.openCareerInfoOverlay?.('test'));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').shipSelect?.careerInfo?.visible === true, null, { timeout: 10000 });
  shots.push(await snapshot(page, scenarioDir, '05-hangar-career-intel'));
  await page.evaluate(() => window.__game?.currentScene?.closeCareerInfoOverlay?.('test'));
}

async function captureGameplayAndPause(page, scenarioDir, shots) {
  await page.evaluate(() => window.__game?.startGame?.());
  await waitForScene(page, 'play');
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.hud), null, { timeout: 20000 });
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (play) {
      play.introActive = false;
      play.introComplete = true;
      play.player?.applyPowerup?.('shield');
      play.hud?.update?.();
    }
  });
  shots.push(await snapshot(page, scenarioDir, '06-hud-gameplay'));
  await page.evaluate(() => window.__game?.scenes?.play?.setPaused?.(true));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').overlays?.pause === true, null, { timeout: 10000 });
  shots.push(await snapshot(page, scenarioDir, '07-pause-menu'));
  await page.evaluate(() => window.__game?.scenes?.play?.openSettingsOverlay?.());
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.settingsOverlay), null, { timeout: 10000 });
  shots.push(await snapshot(page, scenarioDir, '08-in-game-settings'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__game?.scenes?.play?.settingsOverlay, null, { timeout: 10000 });
}

async function captureScrollableScreens(page, scenarioDir, shots) {
  await page.evaluate(() => window.__game?.switchScene?.('threatCodex'));
  await waitForScene(page, 'threatCodex');
  const codexBefore = await page.evaluate(() => window.__game?.currentScene?.entryIndex || 0);
  await page.evaluate(() => window.__game?.currentScene?.moveEntry?.(6));
  await page.waitForTimeout(120);
  const codexAfter = await page.evaluate(() => window.__game?.currentScene?.entryIndex || 0);
  shots.push(await snapshot(page, scenarioDir, '09-threat-codex'));

  await page.evaluate(() => window.__game?.switchScene?.('achievements'));
  await waitForScene(page, 'achievements');
  const achievementsBefore = await page.evaluate(() => window.__game?.currentScene?.scrollOffset || 0);
  await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    const step = Math.max(Number(scene?.visibleCapacity) || 0, 1) + 1;
    scene?.moveFocus?.(step);
  });
  await page.waitForTimeout(120);
  const achievementsAfter = await page.evaluate(() => window.__game?.currentScene?.scrollOffset || 0);
  shots.push(await snapshot(page, scenarioDir, '10-achievements'));
  return {
    codexScrolled: codexAfter > codexBefore,
    achievementsScrolled: achievementsAfter > achievementsBefore
  };
}

async function captureResult(page, scenarioDir, shots) {
  await page.evaluate(() => {
    window.__game.score = 12345;
    window.__game.level = 3;
    window.__game.gameOver?.();
  });
  await waitForScene(page, 'gameOver');
  await page.waitForTimeout(500);
  shots.push(await snapshot(page, scenarioDir, '11-result-screen'));
}

async function runScenario(browser, scenario) {
  const scenarioDir = path.join(outputDir, scenario.name);
  mkdirSync(scenarioDir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height } });
  await page.addInitScript((scale) => {
    window.localStorage?.setItem?.('nova_ui_scale_v1', String(scale));
    window.localStorage?.setItem?.('nova_display_mode_v1', 'windowed');
    window.localStorage?.setItem?.('nova_display_window_size_v1', JSON.stringify({ width: window.innerWidth, height: window.innerHeight }));
  }, scenario.scale);
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const shots = [];
  let scroll = { codexScrolled: false, achievementsScrolled: false };
  try {
    await page.goto(withQuery(baseUrl, { offlineLeaderboard: '1', skipIntro: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForScene(page, 'menu');
    await openMenu(page, scenarioDir, shots);
    await captureSettings(page, scenarioDir, shots, scenario.scale);
    await captureHangar(page, scenarioDir, shots);
    await captureGameplayAndPause(page, scenarioDir, shots);
    scroll = await captureScrollableScreens(page, scenarioDir, shots);
    await captureResult(page, scenarioDir, shots);
  } finally {
    await page.close();
  }

  const auditFailures = shots.flatMap((shot) => shot.audit?.failures || []);
  const dimensions = shots.map((shot) => ({ file: path.relative(outputDir, shot.file), scene: shot.scene, display: shot.display, layout: shot.layout }));
  return {
    scenario,
    shots: shots.map((shot) => path.relative(process.cwd(), shot.file)),
    dimensions,
    scroll,
    consoleErrors,
    pageErrors,
    auditFailures,
    ok: !consoleErrors.length && !pageErrors.length && !auditFailures.length && scroll.codexScrolled && scroll.achievementsScrolled
  };
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  mkdirSync(outputDir, { recursive: true });
  const results = [];
  for (const scenario of scenarios) {
    results.push(await runScenario(browser, scenario));
  }
  const failures = results.filter((result) => !result.ok);
  const report = {
    status: failures.length ? 'failed' : 'passed',
    baseUrl,
    outputDir,
    scenarios: results
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(!failures.length, `[ui-scale-4k] failures: ${failures.map((failure) => failure.scenario.name).join(', ')}`);
  console.log(`[ui-scale-4k] PASS report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
