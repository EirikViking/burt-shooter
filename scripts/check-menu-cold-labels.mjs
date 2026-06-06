import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4564));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-cold-labels-${timestamp()}`);
const viewports = [
  { width: 1600, height: 900, name: '1600x900' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1280, height: 720, name: '1280x720' }
];

const expectedLabels = {
  startBtn: 'LAUNCH RUN',
  highscoreBtn: 'SHIP HANGAR',
  storyBtn: 'HIGHSCORES',
  threatCodexBtn: 'THREAT CODEX',
  achievementsBtn: 'ACHIEVEMENTS',
  settingsBtn: 'SETTINGS',
  exitBtn: 'EXIT GAME',
  musicBtn: 'MUSIC: ON'
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

  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
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

async function waitForColdMenu(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.waitForFunction((keys) => {
    const scene = window.__game?.scenes?.menu;
    return keys.every((key) => {
      const button = scene?.[key];
      return button && button.alpha >= 0.98 && button._label?.text;
    });
  }, Object.keys(expectedLabels).filter((key) => key !== 'musicBtn'), { timeout: 8000 });
  await page.waitForTimeout(250);
}

async function inspectMenu(page) {
  return page.evaluate((expected) => {
    const scene = window.__game?.scenes?.menu;
    const toBounds = (displayObject) => {
      if (!displayObject?.getBounds) return null;
      const box = displayObject.getBounds();
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        right: Math.round(box.x + box.width),
        bottom: Math.round(box.y + box.height)
      };
    };
    const buttons = Object.fromEntries(Object.keys(expected).map((key) => {
      const button = scene?.[key];
      const label = button?._label;
      const labelBounds = toBounds(label);
      const buttonBounds = toBounds(button);
      return [key, {
        expected: expected[key],
        text: label?.text || null,
        alpha: Number(button?.alpha ?? 0),
        labelWidth: Number(label?.width || 0),
        buttonWidth: Number(button?._btnWidth || 0),
        labelScaleX: Number(label?.scale?.x || 0),
        buttonBounds,
        labelBounds
      }];
    }));
    return {
      scene: window.__game?.currentSceneName || null,
      buildId: JSON.parse(window.render_game_to_text?.() || '{}')?.buildId || null,
      focusedOption: scene?.menuOptions?.[scene.focusedMenuIndex]?.id || null,
      buttons
    };
  }, expectedLabels);
}

function findFailures(snapshot) {
  const failures = [];
  if (snapshot.scene !== 'menu') failures.push(`expected menu scene, got ${snapshot.scene || 'missing'}`);
  for (const [key, button] of Object.entries(snapshot.buttons || {})) {
    if (button.text !== button.expected) {
      failures.push(`${key} label expected "${button.expected}", got "${button.text || 'missing'}"`);
    }
    if (button.alpha < 0.98) failures.push(`${key} was not fully visible in cold menu`);
    if (!button.buttonBounds || !button.labelBounds) failures.push(`${key} missing bounds`);
    if (button.buttonWidth > 0 && button.labelWidth > button.buttonWidth - 28) {
      failures.push(`${key} label may clip: labelWidth=${Math.round(button.labelWidth)} buttonWidth=${Math.round(button.buttonWidth)}`);
    }
    if (button.labelScaleX <= 0 || button.labelScaleX > 1.01) {
      failures.push(`${key} has unexpected label scale ${button.labelScaleX}`);
    }
  }
  const codex = snapshot.buttons?.threatCodexBtn;
  if (codex?.text !== 'THREAT CODEX') failures.push('cold Threat Codex label is not complete before hover');
  if (codex?.buttonBounds && codex?.labelBounds) {
    const centeredEnough = Math.abs(
      (codex.labelBounds.x + codex.labelBounds.width / 2) -
      (codex.buttonBounds.x + codex.buttonBounds.width / 2)
    ) <= 4;
    if (!centeredEnough) failures.push('cold Threat Codex label is not visually centered in its button bounds');
  }
  return failures;
}

function htmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function makeContactSheet(browser, screenshots) {
  const htmlPath = path.join(outputDir, 'menu-cold-labels-contact-sheet.html');
  const cells = screenshots.map((shot) => `
    <figure>
      <img src="${pathToFileURL(shot.path).href}" />
      <figcaption>${htmlEscape(shot.label)}</figcaption>
    </figure>`).join('\n');
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; background: #071019; color: #dffcff; font: 18px Arial, sans-serif; }
    main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 18px; }
    figure { margin: 0; border: 1px solid #2aa8c8; background: #02070c; padding: 8px; }
    img { width: 100%; display: block; }
    figcaption { padding-top: 8px; color: #9cfbff; font-weight: 700; }
  </style>
</head>
<body><main>${cells}</main></body>
</html>`;
  writeFileSync(htmlPath, html);
  const page = await browser.newPage({ viewport: { width: 1800, height: 740 } });
  await page.goto(pathToFileURL(htmlPath).href);
  const pngPath = path.join(outputDir, 'menu-cold-labels-contact-sheet.png');
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { htmlPath, pngPath };
}

const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  mkdirSync(outputDir, { recursive: true });
  const screenshots = [];
  const results = [];
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await waitForColdMenu(page);
    const snapshot = await inspectMenu(page);
    const screenshotPath = path.join(outputDir, `menu-cold-${viewport.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push({ label: viewport.name, path: screenshotPath });
    const failures = [
      ...findFailures(snapshot),
      ...consoleErrors.map((error) => `console error: ${error}`),
      ...pageErrors.map((error) => `page error: ${error}`)
    ];
    results.push({ viewport, snapshot, screenshotPath, failures, ok: failures.length === 0 });
    await page.close();
  }

  const contactSheet = await makeContactSheet(browser, screenshots);
  const report = {
    ok: results.every((result) => result.ok),
    baseUrl,
    outputDir,
    results,
    contactSheet
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[menu-cold-labels] PASS contactSheet=${path.relative(process.cwd(), contactSheet.pngPath).replaceAll(path.sep, '/')}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
