import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR || `test-results/autofire-continuity-${timestamp()}`
);
const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4580));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

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

async function startTestServer() {
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
  throw new Error(`Vite test server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;
let runtime = null;
const consoleErrors = [];
const pageErrors = [];

try {
  server = await startTestServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error?.message || String(error)));

  await page.goto(
    `${baseUrl}/?autostart=1&debugBossToken=NOVA_DEBUG_2026&nova-devtools-hash=${LOCAL_DEVTOOLS_HASH}`,
    { waitUntil: 'commit', timeout: 30000 }
  );
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  runtime = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const manager = play?.enemyManager;
    const player = play?.player;
    const bulletManager = play?.bulletManager;
    if (!play || !manager || !player || !bulletManager) {
      throw new Error('missing PlayScene firing dependencies');
    }

    window.__PIXI_APP?.ticker?.stop?.();
    window.__burtKeyboardOverride = { Space: true };
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    play.gameOverSequenceStarted = false;
    player.active = true;

    const originalEnemyUpdate = manager.update;
    manager.update = () => {};

    const runCase = ({
      name,
      state,
      phase,
      currentWaveIndex,
      suppressedWaveIndex,
      level = 4,
      suppressedLevel = level
    }) => {
      bulletManager.clearPlayerBullets?.(`autofire_continuity_${name}`);
      player.shootCooldown = 0;
      play.waveTransitionFireSuppressedWaveIndex = suppressedWaveIndex;
      play.waveTransitionFireSuppressedLevel = suppressedLevel;
      manager.state = state;
      manager.phase = phase;
      manager.currentWaveIndex = currentWaveIndex;
      manager.level = level;
      manager.waveEnding = false;
      play.update(1);
      return {
        name,
        state,
        phase,
        currentWaveIndex,
        level,
        suppressedBefore: suppressedWaveIndex,
        suppressedAfter: play.waveTransitionFireSuppressedWaveIndex,
        suppressedLevelBefore: suppressedLevel,
        suppressedLevelAfter: play.waveTransitionFireSuppressedLevel,
        playerBulletCount: bulletManager.playerBullets.filter((bullet) => bullet?.active !== false).length
      };
    };

    const cases = [
      runCase({
        name: 'same_wave_transition_keeps_firing',
        state: 'WAVE_ACTIVE',
        phase: 'WAVES',
        currentWaveIndex: 2,
        suppressedWaveIndex: 2
      }),
      runCase({
        name: 'next_wave_resumes',
        state: 'WAVE_ACTIVE',
        phase: 'WAVES',
        currentWaveIndex: 3,
        suppressedWaveIndex: 2
      }),
      runCase({
        name: 'same_index_new_sector_resumes',
        state: 'WAVE_ACTIVE',
        phase: 'WAVES',
        currentWaveIndex: 0,
        suppressedWaveIndex: 0,
        level: 5,
        suppressedLevel: 4
      }),
      runCase({
        name: 'boss_gate_keeps_firing',
        state: 'BOSS_GATE',
        phase: 'BOSS',
        currentWaveIndex: 3,
        suppressedWaveIndex: 3
      }),
      runCase({
        name: 'boss_active_resumes',
        state: 'BOSS_ACTIVE',
        phase: 'BOSS',
        currentWaveIndex: 3,
        suppressedWaveIndex: 3
      })
    ];

    const bossShotsBefore = Number(player.traitShotCounter) || 0;
    for (let frame = 0; frame < 1800; frame += 1) play.update(1);
    const bossShotsAfter = Number(player.traitShotCounter) || 0;
    const longevity = {
      simulatedMs: 1800 * 16.67,
      shotsBefore: bossShotsBefore,
      shotsAfter: bossShotsAfter,
      shotsFired: bossShotsAfter - bossShotsBefore,
      suppressionAfter: play.waveTransitionFireSuppressedWaveIndex,
      suppressionLevelAfter: play.waveTransitionFireSuppressedLevel
    };

    manager.update = originalEnemyUpdate;
    window.__burtKeyboardOverride = null;
    return {
      build: JSON.parse(window.render_game_to_text?.() || '{}').build || null,
      gitSha: JSON.parse(window.render_game_to_text?.() || '{}').gitSha || null,
      cases,
      longevity
    };
  });

  const byName = Object.fromEntries(runtime.cases.map((entry) => [entry.name, entry]));
  assert(byName.same_wave_transition_keeps_firing.playerBulletCount > 0, 'autofire should continue during the cleared-wave hold');
  assert.equal(byName.same_wave_transition_keeps_firing.suppressedAfter, null, 'legacy same-wave suppression was not cleared');
  assert.equal(byName.same_wave_transition_keeps_firing.suppressedLevelAfter, null, 'legacy same-wave suppression level was not cleared');
  assert(byName.next_wave_resumes.playerBulletCount > 0, 'autofire did not resume in the next ordinary wave');
  assert.equal(byName.next_wave_resumes.suppressedAfter, null, 'next-wave suppression flag was not cleared');
  assert(byName.same_index_new_sector_resumes.playerBulletCount > 0, 'autofire did not resume when a new sector reused the same wave index');
  assert.equal(byName.same_index_new_sector_resumes.suppressedAfter, null, 'new-sector suppression flag was not cleared');
  assert.equal(byName.same_index_new_sector_resumes.suppressedLevelAfter, null, 'new-sector suppression level was not cleared');
  assert(byName.boss_gate_keeps_firing.playerBulletCount > 0, 'autofire should continue during the boss gate');
  assert.equal(byName.boss_gate_keeps_firing.suppressedAfter, null, 'legacy boss-gate suppression was not cleared');
  assert.equal(byName.boss_gate_keeps_firing.suppressedLevelAfter, null, 'legacy boss-gate suppression level was not cleared');
  assert(byName.boss_active_resumes.playerBulletCount > 0, 'autofire did not resume when boss combat became active');
  assert.equal(byName.boss_active_resumes.suppressedAfter, null, 'boss-active suppression flag was not cleared');
  assert.equal(byName.boss_active_resumes.suppressedLevelAfter, null, 'boss-active suppression level was not cleared');
  assert(runtime.longevity.shotsFired >= 100, `boss autofire did not remain active for 30 seconds: ${JSON.stringify(runtime.longevity)}`);
  assert.equal(runtime.longevity.suppressionAfter, null, 'wave suppression returned during sustained boss combat');
  assert.equal(runtime.longevity.suppressionLevelAfter, null, 'wave suppression level returned during sustained boss combat');

  await page.screenshot({
    path: path.join(outputDir, 'boss-active-autofire-1280x720.png'),
    fullPage: true
  });
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}

const report = {
  status: 'passed',
  baseUrl,
  outputDir,
  runtime,
  consoleErrors,
  pageErrors
};
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

assert.deepEqual(consoleErrors, [], `console errors: ${JSON.stringify(consoleErrors)}`);
assert.deepEqual(pageErrors, [], `page errors: ${JSON.stringify(pageErrors)}`);
console.log(`[autofire-continuity] PASS report=${path.join(outputDir, 'report.json')}`);
