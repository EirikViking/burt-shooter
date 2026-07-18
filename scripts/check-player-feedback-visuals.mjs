import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4384));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR || `test-results/player-feedback-visuals-${timestamp()}`
);
const scenarios = [
  { name: '1280x720-scale100', width: 1280, height: 720, scale: 1 },
  { name: '1920x1080-scale100', width: 1920, height: 1080, scale: 1 },
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
  throw new Error(`No available player-feedback visual check port found starting at ${startPort}`);
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

  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
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

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForState(page, predicate, label, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await readState(page);
    if (predicate(latest)) return latest;
    await page.waitForTimeout(100);
  }
  throw new Error(`${label} timed out: ${JSON.stringify({
    scene: latest?.scene,
    pointDefense: latest?.player?.pointDefense,
    bombIntent: latest?.player?.bombIntent,
    howToPlay: latest?.howToPlayOverlay
  })}`);
}

async function auditVisibleText(page) {
  return page.evaluate(() => {
    const width = window.__game?.getWidth?.() || window.innerWidth;
    const height = window.__game?.getHeight?.() || window.innerHeight;
    const failures = [];
    const samples = [];
    const seen = new Set();
    const roots = [
      window.__game?.currentScene?.container,
      window.__game?.scenes?.play?.uiOverlay
    ];
    const visit = (node) => {
      if (!node || seen.has(node)) return;
      seen.add(node);
      if (node.visible === false || node.renderable === false || node.alpha === 0) return;
      if (node.constructor?.name === 'Text') {
        const text = String(node.text ?? '');
        if (/NaN|undefined|null/.test(text)) failures.push(`bad text "${text}"`);
        try {
          const rect = node.getBounds?.();
          if (rect && rect.width > 0 && rect.height > 0) {
            const sample = {
              text: text.slice(0, 100),
              x: Math.round(rect.x || 0),
              y: Math.round(rect.y || 0),
              right: Math.round((rect.x || 0) + (rect.width || 0)),
              bottom: Math.round((rect.y || 0) + (rect.height || 0))
            };
            if (
              sample.right < -20
              || sample.bottom < -20
              || sample.x > width + 20
              || sample.y > height + 20
            ) {
              failures.push(`text outside viewport ${JSON.stringify(sample)}`);
            }
            if (samples.length < 100) samples.push(sample);
          }
        } catch {
          failures.push(`unable to measure text "${text.slice(0, 50)}"`);
        }
      }
      for (const child of node.children || []) visit(child);
    };
    roots.forEach(visit);
    return { width, height, failures, samples };
  });
}

async function capture(page, scenarioDir, name) {
  const file = path.join(scenarioDir, `${name}.png`);
  const audit = await auditVisibleText(page);
  assert.equal(audit.failures.length, 0, `${name} text audit: ${audit.failures.join('; ')}`);
  await page.screenshot({ path: file, fullPage: false });
  const metadata = await sharp(file).metadata();
  const stats = await sharp(file).stats();
  assert.equal(metadata.width, page.viewportSize()?.width, `${name} screenshot width mismatch`);
  assert.equal(metadata.height, page.viewportSize()?.height, `${name} screenshot height mismatch`);
  assert(Number(stats.entropy || 0) > 1.5, `${name} screenshot appears visually empty`);
  return {
    file,
    width: metadata.width,
    height: metadata.height,
    entropy: Number(stats.entropy || 0),
    audit
  };
}

async function preparePlayScene(page) {
  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(
    () => Boolean(
      window.__game?.scenes?.play?.player
      && window.__game?.scenes?.play?.hud
      && window.__game?.scenes?.play?.powerupManager
    ),
    null,
    { timeout: 30000 }
  );
  await page.evaluate(async () => {
    await window.__game?.scenes?.play?.powerupAssetsReady;
  });
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) throw new Error('Missing play scene/player for visual setup');
    play.introActive = false;
    play.introComplete = true;
    play.pendingEnemyStartTimeout = null;
    play.isPaused = false;
    play.freezeTimerMs = 0;
    play.debugInvincible = true;
    play.clearToastState?.();
    play.scorePopupManager?.cleanup?.();
    play.enemyManager?.clearEnemies?.();
    if (play.enemyManager) {
      play.enemyManager.state = 'WAVE_ACTIVE';
      play.enemyManager.phase = 'WAVES';
      play.enemyManager.spawning = false;
    }
    if (play.bulletManager) {
      play.bulletManager.playerBullets = [];
      play.bulletManager.enemyBullets = [];
      play.bulletManager.pendingEnemyBullets = [];
    }
    player.resetPowerups?.();
    player.invulnerable = true;
    player.invulnerableTime = 600000;
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() * 0.72;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
      player.sprite.visible = true;
      player.sprite.renderable = true;
      player.sprite.alpha = 1;
    }
  });
}

async function stagePointDefense(page) {
  return page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) throw new Error('Missing Point Defense visual objects');
    play.isPaused = false;
    play.enemyManager.state = 'WAVE_ACTIVE';
    player.resetPowerups?.();
    player.applyPowerup('point_defense');
    const intercept = {
      x: player.x + Math.min(90, game.getWidth() * 0.07),
      y: player.y - Math.min(62, game.getHeight() * 0.08)
    };
    player.notePointDefenseIntercept?.({ ...intercept, count: 3 });
    play.particleManager?.createHitSpark?.(intercept.x, intercept.y, 0x7df9ff, 1.15);
    play.particleManager?.createHitSpark?.(intercept.x + 16, intercept.y - 8, 0xffffff, 0.9);
    player.update(1);
    play.hud?.update?.();
    play.hud?.updateActivePowerup?.();
    play.isPaused = true;
    return JSON.parse(window.render_game_to_text?.() || '{}');
  });
}

async function stageBombLock(page) {
  return page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const manager = play?.enemyManager;
    if (!game || !play || !player || !manager) throw new Error('Missing bomb visual objects');
    play.isPaused = false;
    player.resetPowerups?.();
    manager.clearEnemies?.();
    const waves = manager.generateWaves(1);
    manager.currentWaveIndex = 0;
    manager.normalWavesTotal = waves.length;
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    manager.spawning = false;
    manager.update = () => {};
    manager.spawnWave({ ...waves[0], count: Math.max(3, Number(waves[0]?.count) || 0) });
    const targets = manager.enemies.slice(0, 3);
    for (const enemy of manager.enemies) {
      if (targets.includes(enemy)) continue;
      enemy.active = false;
      enemy.destroyed = true;
      enemy.waitingForEntry = false;
      enemy.deactivateVisuals?.('player_feedback_visual');
      if (enemy.sprite?.parent) enemy.sprite.parent.removeChild(enemy.sprite);
    }
    manager.enemies = targets;
    targets.forEach((enemy, index) => {
      enemy.active = true;
      enemy.destroyed = false;
      enemy.waitingForEntry = false;
      enemy.invulnerable = false;
      enemy.state = 'FORMATION';
      enemy.x = player.x + (index - 1) * Math.min(88, game.getWidth() * 0.055);
      enemy.y = player.y - Math.min(270, game.getHeight() * 0.3) + (index % 2) * 22;
      enemy.health = Math.max(40, Number(enemy.health) || 0);
      enemy.maxHealth = enemy.health;
      enemy.radius = Math.max(18, Number(enemy.radius) || 0);
      enemy.update = () => {};
      if (enemy.sprite) {
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        enemy.sprite.visible = true;
        enemy.sprite.renderable = true;
        enemy.sprite.alpha = 1;
        if (!enemy.sprite.parent) play.gameContainer?.addChild?.(enemy.sprite);
      }
    });
    player.applyPowerup('bomb');
    player.bombArmedAt = player.getGameplayClockMs() - 1;
    player.updateBombIndicator?.();
    play.hud?.update?.();
    play.hud?.updateActivePowerup?.();
    return JSON.parse(window.render_game_to_text?.() || '{}');
  });
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

try {
  mkdirSync(outputDir, { recursive: true });
  const reports = [];
  for (const scenario of scenarios) {
    const scenarioDir = path.join(outputDir, scenario.name);
    mkdirSync(scenarioDir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height } });
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.addInitScript((next) => {
      window.localStorage?.setItem?.('nova_ui_scale_v1', String(next.scale));
      window.localStorage?.setItem?.('nova_display_mode_v1', 'windowed');
      window.localStorage?.setItem?.('nova_display_window_size_v1', JSON.stringify({
        width: next.width,
        height: next.height
      }));
    }, scenario);

    try {
      await preparePlayScene(page);
      const pointDefenseSetup = await stagePointDefense(page);
      const pointDefenseState = await waitForState(
        page,
        (state) => state.player?.pointDefense?.active
          && state.player.pointDefense.interceptTotal >= 3
          && state.player.pointDefense.ring?.active,
        `${scenario.name} Point Defense feedback`
      );
      const pointDefenseHud = pointDefenseState.player?.powerups?.find((entry) => entry.type === 'point_defense');
      assert.equal(pointDefenseState.player.pointDefense.radius, 104, `${scenario.name} Point Defense range changed`);
      assert(pointDefenseState.player.pointDefense.remainingMs > 0, `${scenario.name} Point Defense timer missing`);
      assert.equal(pointDefenseHud?.label, 'P-DEF', `${scenario.name} compact Point Defense HUD label missing`);
      assert(
        String(pointDefenseHud?.detail || '').includes('AUTO-INTERCEPTS'),
        `${scenario.name} Point Defense purpose missing from HUD`
      );
      const pointDefenseShot = await capture(page, scenarioDir, 'point-defense-intercept');

      const bombSetup = await stageBombLock(page);
      const bombState = await waitForState(
        page,
        (state) => state.player?.bombIntent?.charges === 3
          && state.player.bombIntent.indicator?.commitReady
          && state.player.bombIntent.indicator?.visible,
        `${scenario.name} bomb target lock`
      );
      const bombHud = bombState.player?.powerups?.find((entry) => entry.type === 'bomb');
      assert.equal(bombState.player.bombIntent.triggerQueued, false, `${scenario.name} bomb queued without a fresh press`);
      assert(
        ['boss', 'cluster', 'durable'].includes(bombState.player.bombIntent.indicator.commitReason),
        `${scenario.name} bomb did not find a worthwhile target`
      );
      assert(
        String(bombHud?.detail || '').includes('TAP FIRE'),
        `${scenario.name} bomb HUD does not explain intentional activation: ${JSON.stringify(bombHud)}`
      );
      const bombShot = await capture(page, scenarioDir, 'bomb-target-locked');

      await page.evaluate(() => {
        const play = window.__game?.scenes?.play;
        play.isPaused = false;
        play.setPaused?.(true);
        play.openHowToPlayOverlay?.();
        play.howToPlayOverlay?.setPage?.(1);
      });
      const helpState = await waitForState(
        page,
        (state) => state.overlays?.howToPlay && state.howToPlayOverlay?.pageId === 'combat',
        `${scenario.name} combat help`
      );
      const helpCopy = JSON.stringify(helpState.howToPlayOverlay || {});
      assert(helpCopy.includes('P-DEF AUTO-INTERCEPTS // BOMBS TAP FIRE'), `${scenario.name} compact pickup intent help missing`);
      assert(helpCopy.includes('Bomb charges stay banked'), `${scenario.name} banked bomb help missing`);
      const helpShot = await capture(page, scenarioDir, 'combat-help-pickup-intent');

      assert.equal(pageErrors.length, 0, `${scenario.name} page errors: ${pageErrors.join('; ')}`);
      assert.equal(consoleErrors.length, 0, `${scenario.name} console errors: ${consoleErrors.join('; ')}`);
      reports.push({
        ...scenario,
        pointDefenseSetup: pointDefenseSetup.player?.pointDefense,
        pointDefenseState: pointDefenseState.player?.pointDefense,
        bombSetup: bombSetup.player?.bombIntent,
        bombState: bombState.player?.bombIntent,
        screenshots: {
          pointDefense: pointDefenseShot,
          bomb: bombShot,
          help: helpShot
        },
        pageErrors,
        consoleErrors
      });
    } finally {
      await page.close();
    }
  }

  const report = {
    ok: reports.length === scenarios.length,
    baseUrl,
    scenarios: reports
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, 'Not all player-feedback visual scenarios completed');
  console.log(`[player-feedback-visuals] PASS scenarios=${reports.length} report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
