import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4354));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/settings-controls-${timestamp()}`);

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
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function approxChanged(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 0.01;
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', { timeout: 30000 });
  await page.waitForTimeout(700);

  const exercise = await page.evaluate(async () => {
    const scene = window.__game?.currentScene;
    scene?.openSettingsOverlay?.();
    const overlay = scene?.settingsOverlay;
    if (!overlay) return { ok: false, reason: 'settings overlay did not open' };

    const state = () => overlay.getDebugState?.().settings || {};
    const control = (id) => overlay.controls.find((entry) => entry.id === id);
    const missing = [
      'toggle_music',
      'toggle_voice',
      'toggle_cta_voice',
      'music_pack',
      'test_sfx',
      'test_voice',
      'language',
      'slider_master',
      'slider_music',
      'slider_sfx',
      'slider_voice',
      'slider_screenShake',
      'slider_playerFocus',
      'toggle_color_aid',
      'footer_credits',
      'footer_close'
    ].filter((id) => !control(id));
    if (missing.length) return { ok: false, missing };

    const before = state();
    control('toggle_music').button.activate();
    control('toggle_voice').button.activate();
    control('toggle_cta_voice').button.activate();
    control('music_pack').button.activate();
    const sfxPlayed = overlay.playAudioTest('sfx');
    const voicePlayed = overlay.playAudioTest('voice');
    await control('language').cycle(1);
    control('slider_master').setValue(0.23);
    control('slider_music').setValue(0.31);
    control('slider_sfx').setValue(0.47);
    control('slider_voice').setValue(0.53);
    control('slider_screenShake').setValue(0.37);
    control('slider_playerFocus').setValue(0.64);
    control('toggle_color_aid').button.activate();
    overlay.openCreditsPanel();
    const creditsOpened = Boolean(overlay.creditsPanel?.parent);
    overlay.closeCreditsPanel();
    const creditsClosed = !overlay.creditsPanel;
    const fullscreenControl = control('footer_fullscreen');
    fullscreenControl?.button?.activate?.();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const after = state();
    const storage = {
      music: localStorage.getItem('burt_music_enabled'),
      voice: localStorage.getItem('burt_voice_enabled'),
      ctaVoice: localStorage.getItem('burt_cta_voice_enabled'),
      musicPack: localStorage.getItem('burt_music_pack'),
      language: localStorage.getItem('novaSwarm.languagePreference.v1'),
      colorAssist: localStorage.getItem('nova_accessibility_color_assist')
    };

    return {
      ok: true,
      before,
      after,
      storage,
      sfxPlayed,
      voicePlayed,
      creditsOpened,
      creditsClosed,
      fullscreenVisible: Boolean(fullscreenControl),
      controls: overlay.controls.map((entry) => ({ id: entry.id, type: entry.type, label: entry.label }))
    };
  });

  await page.goto(`${baseUrl}/?desktop=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', { timeout: 30000 });
  await page.waitForTimeout(300);
  const desktopExercise = await page.evaluate(async () => {
    const scene = window.__game?.currentScene;
    scene?.openSettingsOverlay?.();
    const overlay = scene?.settingsOverlay;
    const fullscreenVisible = Boolean(overlay?.controls?.some?.((entry) => entry.id === 'footer_fullscreen'));
    overlay?.close?.();
    return { fullscreenVisible };
  });

  const failures = [
    !exercise.ok ? (exercise.reason || `missing controls: ${(exercise.missing || []).join(', ')}`) : null,
    desktopExercise.fullscreenVisible ? 'desktop Steam settings should hide fullscreen footer button' : null,
    exercise.ok && exercise.before.audio?.musicEnabled === exercise.after.audio?.musicEnabled ? 'music toggle did not change state' : null,
    exercise.ok && exercise.before.audio?.voiceEnabled === exercise.after.audio?.voiceEnabled ? 'voice toggle did not change state' : null,
    exercise.ok && exercise.before.audio?.ctaVoiceEnabled === exercise.after.audio?.ctaVoiceEnabled ? 'CTA voice toggle did not change state' : null,
    exercise.ok && exercise.before.audio?.musicPack === exercise.after.audio?.musicPack ? 'music set button did not change pack' : null,
    exercise.ok && !approxChanged(exercise.before.audio?.masterVolume, exercise.after.audio?.masterVolume) ? 'master slider did not change state' : null,
    exercise.ok && !approxChanged(exercise.before.audio?.musicVolume, exercise.after.audio?.musicVolume) ? 'music volume slider did not change state' : null,
    exercise.ok && !approxChanged(exercise.before.audio?.sfxVolume, exercise.after.audio?.sfxVolume) ? 'SFX volume slider did not change state' : null,
    exercise.ok && !approxChanged(exercise.before.audio?.voiceVolume, exercise.after.audio?.voiceVolume) ? 'voice volume slider did not change state' : null,
    exercise.ok && !approxChanged(exercise.before.accessibility?.screenShake, exercise.after.accessibility?.screenShake) ? 'shake slider did not change state' : null,
    exercise.ok && !approxChanged(exercise.before.accessibility?.playerFocus, exercise.after.accessibility?.playerFocus) ? 'focus slider did not change state' : null,
    exercise.ok && exercise.before.accessibility?.colorAssist === exercise.after.accessibility?.colorAssist ? 'color aid toggle did not change state' : null,
    exercise.ok && exercise.before.language?.label === exercise.after.language?.label ? 'language selector did not change label' : null,
    exercise.ok && !exercise.creditsOpened ? 'credits footer button did not open credits panel' : null,
    exercise.ok && !exercise.creditsClosed ? 'credits panel did not close' : null,
    ...pageErrors.map((message) => `page error: ${message}`),
    ...consoleErrors.map((message) => `console error: ${message}`)
  ].filter(Boolean);

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'settings-controls.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const report = {
    ok: failures.length === 0,
    baseUrl,
    failures,
    exercise,
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[settings-controls] PASS screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
