import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4390));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/menu-voice-overlap-${timestamp()}`);

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

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

const server = await startDevServer();
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

await page.addInitScript(() => {
  window.__fakeAudioPlayLog = [];
  class FakeAudio {
    constructor(src = '') {
      this.src = src;
      this.currentTime = 0;
      this.volume = 1;
      this.loop = false;
      this.preload = '';
      this.paused = true;
      this.readyState = 4;
      this._listeners = new Map();
    }

    addEventListener(type, listener) {
      const listeners = this._listeners.get(type) || [];
      listeners.push(listener);
      this._listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
      const listeners = this._listeners.get(type) || [];
      this._listeners.set(type, listeners.filter((entry) => entry !== listener));
    }

    play() {
      this.paused = false;
      window.__fakeAudioPlayLog.push(this.src);
      return Promise.resolve();
    }

    pause() {
      this.paused = true;
    }

    load() {}
  }

  window.Audio = FakeAudio;
});

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', { timeout: 30000 });

  const before = await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    scene.playBossMenuBark('launch', {
      target: scene.startBtn,
      intent: 'focus',
      immediate: true
    });
    return JSON.parse(window.render_game_to_text?.() || '{}');
  });

  const afterClick = await page.evaluate(() => {
    const scene = window.__game?.currentScene;
    scene.playBossMenuBark('launch', {
      target: scene.startBtn,
      intent: 'activate',
      force: true
    });
    return JSON.parse(window.render_game_to_text?.() || '{}');
  });

  const afterPendingClick = await page.evaluate(async () => {
    const scene = window.__game?.currentScene;
    scene.playBossMenuBark('settings', {
      target: scene.settingsBtn,
      intent: 'focus'
    });
    const pendingBeforeClick = Boolean(scene.pendingBossMenuBarkTimer);
    scene.playBossMenuBark('settings', {
      target: scene.settingsBtn,
      intent: 'activate',
      force: true
    });
    await new Promise((resolve) => setTimeout(resolve, 520));
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return {
      state,
      pendingBeforeClick,
      pendingAfterDelay: Boolean(scene.pendingBossMenuBarkTimer)
    };
  });

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'menu-voice-overlap.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const beforeAudio = before.audio || {};
  const afterClickAudio = afterClick.audio || {};
  const pendingAudio = afterPendingClick.state?.audio || {};
  const report = {
    ok: Boolean(
      beforeAudio.activeVoiceCount === 1 &&
      beforeAudio.activeVoiceGroups?.boss_menu_bark?.eventName === 'boss_menu_bark_launch' &&
      afterClickAudio.activeVoiceCount === 1 &&
      afterClickAudio.activeVoiceGroups?.boss_menu_bark?.eventName === 'boss_menu_bark_launch' &&
      afterPendingClick.pendingBeforeClick === true &&
      afterPendingClick.pendingAfterDelay === false &&
      pendingAudio.activeVoiceCount === 1 &&
      pendingAudio.activeVoiceGroups?.boss_menu_bark?.eventName === 'boss_menu_bark_settings' &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0
    ),
    baseUrl,
    beforeAudio,
    afterClickAudio,
    afterPendingClick,
    pageErrors,
    consoleErrors,
    fakeAudioPlayCount: await page.evaluate(() => window.__fakeAudioPlayLog?.length || 0),
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[menu-voice-overlap] PASS screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
