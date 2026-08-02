import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const exePath = path.resolve('release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR ||
  `test-results/packaged-autofire-continuity-${new Date().toISOString().replace(/[:.]/g, '-')}`
);
const expectedGitSha = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
  cwd: root,
  encoding: 'utf8'
}).trim();

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
const consoleErrors = [];
const pageErrors = [];
let runtime = null;

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
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error?.message || String(error)));

  const runUrl = new URL(page.url());
  for (const [key, value] of Object.entries({
    desktop: '1',
    autostart: '1',
    controlSmoke: '1',
    offlineLeaderboard: '1'
  })) runUrl.searchParams.set(key, value);
  await page.goto(runUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => window.__game?.scenes?.play?.player,
    null,
    { timeout: 30000, polling: 100 }
  );
  await page.setViewportSize({ width: 1280, height: 720 });

  runtime = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const manager = play?.enemyManager;
    const player = play?.player;
    const bulletManager = play?.bulletManager;
    if (!play || !manager || !player || !bulletManager) {
      throw new Error('missing packaged PlayScene firing dependencies');
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
      bulletManager.clearPlayerBullets?.(`packaged_autofire_continuity_${name}`);
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
        suppressedAfter: play.waveTransitionFireSuppressedWaveIndex,
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

    const shotsBefore = Number(player.traitShotCounter) || 0;
    for (let frame = 0; frame < 1800; frame += 1) play.update(1);
    const shotsAfter = Number(player.traitShotCounter) || 0;
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const longevity = {
      simulatedMs: 1800 * 16.67,
      shotsBefore,
      shotsAfter,
      shotsFired: shotsAfter - shotsBefore,
      suppressionAfter: play.waveTransitionFireSuppressedWaveIndex,
      suppressionLevelAfter: play.waveTransitionFireSuppressedLevel
    };

    manager.update = originalEnemyUpdate;
    window.__burtKeyboardOverride = null;
    return { gitSha: state.gitSha || null, cases, longevity };
  });

  const byName = Object.fromEntries(runtime.cases.map((entry) => [entry.name, entry]));
  assert.equal(runtime.gitSha, expectedGitSha,
    `Packaged executable source mismatch: expected ${expectedGitSha}, got ${runtime.gitSha}`);
  assert(byName.same_wave_transition_keeps_firing.playerBulletCount > 0,
    'packaged autofire should continue during the cleared-wave hold');
  assert.equal(byName.same_wave_transition_keeps_firing.suppressedAfter, null,
    'packaged legacy same-wave suppression was not cleared');
  assert(byName.same_index_new_sector_resumes.playerBulletCount > 0,
    'packaged autofire did not resume when a new sector reused the same wave index');
  assert.equal(byName.same_index_new_sector_resumes.suppressedAfter, null,
    'packaged new-sector suppression flag was not cleared');
  assert(byName.boss_gate_keeps_firing.playerBulletCount > 0,
    'packaged autofire should continue during the boss gate');
  assert.equal(byName.boss_gate_keeps_firing.suppressedAfter, null,
    'packaged legacy boss-gate suppression was not cleared');
  assert(byName.boss_active_resumes.playerBulletCount > 0,
    'packaged autofire did not resume when boss combat became active');
  assert.equal(byName.boss_active_resumes.suppressedAfter, null,
    'packaged boss-active suppression flag was not cleared');
  assert(runtime.longevity.shotsFired >= 100,
    `packaged boss autofire did not remain active for 30 seconds: ${JSON.stringify(runtime.longevity)}`);
  assert.equal(runtime.longevity.suppressionAfter, null,
    'packaged wave suppression returned during sustained boss combat');
  assert.equal(runtime.longevity.suppressionLevelAfter, null,
    'packaged wave suppression level returned during sustained boss combat');

  await page.screenshot({
    path: path.join(outputDir, 'packaged-boss-active-autofire-1280x720.png'),
    fullPage: false
  });
  assert.deepEqual(consoleErrors, [], `packaged console errors: ${JSON.stringify(consoleErrors)}`);
  assert.deepEqual(pageErrors, [], `packaged page errors: ${JSON.stringify(pageErrors)}`);

  const report = {
    status: 'passed',
    exePath,
    expectedGitSha,
    outputDir,
    runtime,
    consoleErrors,
    pageErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[packaged-autofire-continuity] PASS report=${path.join(outputDir, 'report.json')}`);
} finally {
  if (page) await page.evaluate(() => window.__novaApp?.exitGame?.()).catch(() => {});
  await browser?.close().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 750));
  if (!child.killed) child.kill();
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'process.log'), `${stdout.join('')}\n${stderr.join('')}`);
}
