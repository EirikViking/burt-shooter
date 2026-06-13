import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4391));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-death-voice-runtime-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
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

function stateFromPage(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

mkdirSync(outputDir, { recursive: true });

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const consoleEvents = [];
const pageErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') consoleEvents.push({ type: message.type(), text: message.text() });
});
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  await page.addInitScript(() => {
    localStorage.setItem('burt_music_enabled', 'true');
    localStorage.setItem('burt_voice_enabled', 'true');
    localStorage.setItem('burt_volume_sfx', '1');
    localStorage.setItem('burt_volume_voice', '1');
    localStorage.setItem('burt_volume_master', '1');
  });

  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startAtBoss: '1',
    startLevel: '1',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.mouse.click(24, 24);
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'BOSS_ACTIVE', null, { timeout: 30000 });
  await page.waitForTimeout(1800);
  const before = await stateFromPage(page);

  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    if (!boss) throw new Error('Missing boss for death voice probe');
    boss.entryStartMs = Date.now() - (boss.entryDurationMs || 1) - 1;
    boss.spawnedAtMs = Date.now() - 60000;
    boss.invulnerableUntilMs = 0;
    boss.minimumFightMs = 0;
    boss.finishGateUntilMs = 0;
    boss.takeDamage((boss.health || boss.maxHealth || 1) + 9999);
  });

  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'LEVEL_COMPLETE', null, { timeout: 10000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.audio?.lastVoiceEvent === 'boss_death_agony' &&
      /^boss_death_agony_\d{3}\.mp3$/.test(state?.audio?.lastVoiceTrack || '');
  }, null, { timeout: 10000 });
  await page.waitForTimeout(900);

  const after = await stateFromPage(page);
  const activeVoiceEvents = after.audio?.activeVoiceEvents || [];
  const recentSuppressions = after.audio?.recentVoiceSuppressions || [];
  const victorySuppressed = recentSuppressions.some((entry) => (
    entry.eventName === 'mission_control_victory' &&
    entry.reason === 'voice_lock' &&
    entry.lockEvent === 'boss_death_agony'
  ));
  if ((after.audio?.activeVoiceCount || 0) > 1) {
    throw new Error(`boss death voice overlapped active voices: ${JSON.stringify(activeVoiceEvents)}`);
  }
  if (activeVoiceEvents.some((entry) => entry.eventName !== 'boss_death_agony')) {
    throw new Error(`non-boss voice active during boss death: ${JSON.stringify(activeVoiceEvents)}`);
  }
  if (!victorySuppressed) {
    throw new Error(`mission_control_victory was not suppressed by boss_death_agony lock: ${JSON.stringify(recentSuppressions)}`);
  }
  await page.screenshot({ path: path.join(outputDir, 'boss-death-voice-runtime.png'), fullPage: true });

  const report = {
    status: 'passed',
    baseUrl,
    outputDir,
    beforeAudio: before.audio || null,
    afterAudio: after.audio || null,
    lastVoiceEvent: after.audio?.lastVoiceEvent || null,
    lastVoiceTrack: after.audio?.lastVoiceTrack || null,
    activeVoiceEvents,
    victorySuppressed,
    consoleEvents,
    pageErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[boss-death-voice-runtime] PASS voice=${report.lastVoiceTrack} report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  const finalState = await stateFromPage(page).catch(() => null);
  const failure = {
    status: 'failed',
    baseUrl,
    outputDir,
    error: error.message,
    finalState,
    consoleEvents,
    pageErrors
  };
  writeFileSync(path.join(outputDir, 'failure-report.json'), JSON.stringify(failure, null, 2));
  await page.screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true }).catch(() => {});
  console.error(`[boss-death-voice-runtime] FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
