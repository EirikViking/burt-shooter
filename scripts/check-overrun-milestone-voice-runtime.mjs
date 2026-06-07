import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { SFX_CATALOG, VOICE_EVENT_FALLBACKS } from '../src/audio/SoundCatalog.js';
import { getOverrunMilestoneCelebration, resolveOverrunMilestoneVoiceCue } from '../src/config/OverrunMilestoneCelebrations.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(5195));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/overrun-milestone-voice-runtime-${timestamp()}`);
const milestones = [10, 20, 30, 40, 50, 60];

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
  while (Date.now() - start < 20000) {
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

function expectedVoiceForSector(sector) {
  if (sector === 10) return 'mission_control_overrun_clear_sector_10';
  if (sector >= 20 && sector <= 50) return `mission_control_overrun_clear_sector_${sector}`;
  return 'mission_control_overrun_clear_far_signal';
}

function assertSafeVoice(sector, eventName, trackName) {
  assert.equal(eventName, expectedVoiceForSector(sector), `sector ${sector} event mismatch`);
  assert.equal(trackName, VOICE_EVENT_FALLBACKS[eventName], `sector ${sector} track mismatch`);
  assert.ok((SFX_CATALOG[eventName] || []).some((src) => src.endsWith(`/${trackName}`)), `sector ${sector} missing catalog asset ${trackName}`);
  if (sector > 10) {
    assert.notEqual(eventName, 'mission_control_overrun_clear', `sector ${sector} used old generic sector-ten cue`);
    assert.doesNotMatch(eventName, /sector_10\b/, `sector ${sector} used sector-10 event`);
    assert.notEqual(trackName, 'mission_control_overrun_clear_01.mp3', `sector ${sector} used old generic sector-ten asset`);
    assert.doesNotMatch(trackName, /sector_10_/, `sector ${sector} used sector-10 asset`);
  }
}

for (const sector of milestones) {
  const eventKind = sector === 10 ? 'run_clear' : 'overrun_milestone';
  const celebration = getOverrunMilestoneCelebration({ milestoneSector: sector, eventKind });
  const resolved = resolveOverrunMilestoneVoiceCue({ milestoneSector: sector, eventKind, celebration });
  assertSafeVoice(sector, resolved, VOICE_EVENT_FALLBACKS[resolved]);
}

for (const sector of [20, 30, 40, 50, 60]) {
  const resolvedMissing = resolveOverrunMilestoneVoiceCue({
    milestoneSector: sector,
    eventKind: 'overrun_milestone',
    celebration: null
  });
  assert.equal(resolvedMissing, 'mission_control_overrun_clear_far_signal', `sector ${sector} missing celebration should resolve far signal`);
  const resolvedOldGeneric = resolveOverrunMilestoneVoiceCue({
    milestoneSector: sector,
    eventKind: 'overrun_milestone',
    celebration: { voiceCue: 'mission_control_overrun_clear' }
  });
  assert.equal(resolvedOldGeneric, 'mission_control_overrun_clear_far_signal', `sector ${sector} old generic cue should resolve far signal`);
  const resolvedOldSector10 = resolveOverrunMilestoneVoiceCue({
    milestoneSector: sector,
    eventKind: 'overrun_milestone',
    celebration: { voiceCue: 'mission_control_overrun_clear_sector_10' }
  });
  assert.equal(resolvedOldSector10, 'mission_control_overrun_clear_far_signal', `sector ${sector} sector-10 cue should resolve far signal`);
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;
const consoleEvents = [];

try {
  server = await startDevServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: error.message }));
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.HTMLMediaElement.prototype.play = function playMediaForRuntimeCheck() {
      return Promise.resolve();
    };
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game && window.render_game_to_text), null, { timeout: 30000 });
  await page.evaluate(async () => {
    await window.__game.startGame(window.__game.selectedShipSpriteKey);
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  const runtime = [];
  for (const sector of milestones) {
    const eventKind = sector === 10 ? 'run_clear' : 'overrun_milestone';
    const expectedEvent = expectedVoiceForSector(sector);
    await page.evaluate(({ sector, eventKind }) => {
      const game = window.__game;
      const play = game.scenes.play;
      play.triggerOverrunClearCelebration({
        nextSector: sector + 1,
        milestoneSector: sector,
        eventKind,
        clearBonus: eventKind === 'run_clear' ? 10000 : 0,
        livesBonus: eventKind === 'run_clear' ? 7500 : 0
      });
    }, { sector, eventKind });
    await page.waitForFunction((expectedEvent) => {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.audio?.lastVoiceEvent === expectedEvent;
    }, expectedEvent, { timeout: 5000 });
    const audio = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}').audio || {});
    assertSafeVoice(sector, audio.lastVoiceEvent, audio.lastVoiceTrack);
    runtime.push({
      sector,
      eventKind,
      lastVoiceEvent: audio.lastVoiceEvent,
      lastVoiceTrack: audio.lastVoiceTrack
    });
  }

  const report = {
    ok: true,
    baseUrl,
    runtime,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'overrun-milestone-voice-runtime-report.json'), JSON.stringify(report, null, 2));
  assert.equal(consoleEvents.length, 0, `browser console/page errors: ${JSON.stringify(consoleEvents)}`);
  console.log(`[overrun-milestone-voice-runtime] PASS sectors=${runtime.map((item) => `${item.sector}:${item.lastVoiceTrack}`).join(',')} outputDir=${outputDir}`);
} catch (error) {
  const report = {
    ok: false,
    baseUrl,
    consoleEvents,
    error: error?.stack || error?.message || String(error)
  };
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'overrun-milestone-voice-runtime-report.json'), JSON.stringify(report, null, 2));
  throw error;
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
}
