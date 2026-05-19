import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4340));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/intro-voice-exclusivity-${timestamp()}`);

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
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
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
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForIntroPanel(page, panelIndex, timeout = 18000) {
  await page.waitForFunction((expectedPanelIndex) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'intro' && state.intro?.panelIndex === expectedPanelIndex;
  }, panelIndex, { timeout });
}

async function waitForIntroVoiceSeen(page, panelIndex, timeout = 7000) {
  await page.waitForFunction((expectedPanelIndex) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return (
      state.scene === 'intro' &&
      state.intro?.panelIndex === expectedPanelIndex &&
      state.intro?.waitingForVoice === true &&
      state.intro?.voiceWasActive === true
    );
  }, panelIndex, { timeout });
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
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
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', { timeout: 30000 });

  const preIntroVoice = await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    scene?.openSettingsOverlay?.();
    return scene?.settingsOverlay?.playAudioTest?.('voice') === true;
  });
  await page.waitForTimeout(160);

  const beforeIntro = await readState(page);
  await page.evaluate(() => window.__game?.showIntro?.());
  await page.waitForFunction(() => window.__game?.currentSceneName === 'intro', { timeout: 30000 });
  await page.mouse.click(640, 360);
  await waitForIntroVoiceSeen(page, 0);
  const firstPanel = await readState(page);

  await page.waitForTimeout(8500);
  const heldFirstPanel = await readState(page);

  await waitForIntroPanel(page, 1);
  const secondPanel = await readState(page);

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'intro-voice-exclusivity.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const firstVoices = firstPanel.audio?.activeVoiceEvents || [];
  const secondVoices = secondPanel.audio?.activeVoiceEvents || [];
  const report = {
    ok: Boolean(
      preIntroVoice &&
      beforeIntro.audio?.lastVoiceEvent === 'mission_control_launch' &&
      firstPanel.scene === 'intro' &&
      firstPanel.intro?.panelIndex === 0 &&
      firstPanel.intro?.waitingForVoice === true &&
      firstPanel.intro?.voiceWasActive === true &&
      firstPanel.audio?.lastVoiceEvent === 'intro_narrator_01' &&
      firstPanel.audio?.activeVoiceCount === 1 &&
      firstVoices[0]?.eventName === 'intro_narrator_01' &&
      heldFirstPanel.scene === 'intro' &&
      heldFirstPanel.intro?.panelIndex === 0 &&
      heldFirstPanel.audio?.lastVoiceEvent === 'intro_narrator_01' &&
      heldFirstPanel.audio?.activeVoiceGroups?.intro_narrator?.eventName === 'intro_narrator_01' &&
      secondPanel.audio?.lastVoiceEvent === 'intro_narrator_02' &&
      secondPanel.audio?.activeVoiceCount === 1 &&
      secondVoices[0]?.eventName === 'intro_narrator_02' &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    preIntroVoice,
    beforeIntroAudio: beforeIntro.audio || null,
    firstPanelAudio: firstPanel.audio || null,
    firstPanelIntro: firstPanel.intro || null,
    heldFirstPanelAudio: heldFirstPanel.audio || null,
    heldFirstPanelIntro: heldFirstPanel.intro || null,
    secondPanelAudio: secondPanel.audio || null,
    secondPanelIntro: secondPanel.intro || null,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[intro-voice] PASS active=${firstPanel.audio.activeVoiceCount}->${secondPanel.audio.activeVoiceCount} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
