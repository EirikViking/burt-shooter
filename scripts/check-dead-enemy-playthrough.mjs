import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4361));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/dead-enemy-playthrough-${timestamp()}`);

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

function assertCleanAudit(state, label) {
  const audit = state?.enemyVisualAudit || {};
  const stale = Number(audit.staleVisibleCount) || 0;
  const orphaned = Number(audit.orphanedVisibleCount) || 0;
  if (stale > 0 || orphaned > 0) {
    throw new Error(`${label}: dead/despawned enemy visuals still render ${JSON.stringify(audit, null, 2)}`);
  }
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function assertPageClean(page, label) {
  const state = await readState(page);
  assertCleanAudit(state, label);
  return state;
}

mkdirSync(outputDir, { recursive: true });
let server = null;
let browser = null;

try {
  server = await startTestServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const pageErrors = [];
  const consoleEvents = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleEvents.push({ type: message.type(), text: message.text().slice(0, 700) });
    }
  });

  await page.goto(`${baseUrl}/?autostart=1&debugBossToken=NOVA_DEBUG_2026&startLevel=8&debugPowerups=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.enemyManager && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  const syntheticProof = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const enemyManager = play?.enemyManager;
    if (!game || !play || !enemyManager) throw new Error('Missing play scene for dead enemy audit');
    play.introActive = false;
    play.introComplete = true;
    play.debugInvincible = true;
    if (play.player) {
      play.player.invulnerable = true;
      play.player.invulnerableTime = 600000;
      play.player.x = game.getWidth() * 0.5;
      play.player.y = game.getHeight() - 82;
    }

    enemyManager.clearEnemies();
    const waves = enemyManager.generateWaves(8);
    enemyManager.currentWaveIndex = 0;
    enemyManager.normalWavesTotal = waves.length;
    enemyManager.phase = 'WAVES';
    enemyManager.state = 'WAVE_ACTIVE';
    enemyManager.spawnWave(waves[0]);

    const stale = enemyManager.enemies[0];
    stale.active = false;
    stale.waitingForEntry = false;
    stale.destroyed = false;
    stale.visualsDeactivated = false;
    stale.sprite.visible = true;
    stale.sprite.renderable = true;

    const staleAudit = JSON.parse(window.render_game_to_text()).enemyVisualAudit;
    if ((Number(staleAudit.staleVisibleCount) || 0) <= 0) {
      throw new Error(`Synthetic stale enemy visual was not detected: ${JSON.stringify(staleAudit)}`);
    }
    play.cleanupSkippedFrameVisuals('synthetic_stale_probe');
    const afterStaleCleanup = JSON.parse(window.render_game_to_text()).enemyVisualAudit;
    if ((Number(afterStaleCleanup.staleVisibleCount) || 0) > 0 || (Number(afterStaleCleanup.orphanedVisibleCount) || 0) > 0) {
      throw new Error(`Synthetic stale enemy visual was not cleaned: ${JSON.stringify(afterStaleCleanup)}`);
    }

    enemyManager.clearEnemies();
    enemyManager.spawnWave(waves[0]);
    const orphan = enemyManager.enemies[0];
    enemyManager.enemies = enemyManager.enemies.filter((enemy) => enemy !== orphan);
    orphan.active = false;
    orphan.waitingForEntry = false;
    orphan.sprite.visible = true;
    orphan.sprite.renderable = true;
    const orphanAudit = JSON.parse(window.render_game_to_text()).enemyVisualAudit;
    if ((Number(orphanAudit.orphanedVisibleCount) || 0) <= 0) {
      throw new Error(`Synthetic orphan enemy visual was not detected: ${JSON.stringify(orphanAudit)}`);
    }
    play.cleanupSkippedFrameVisuals('synthetic_orphan_probe');
    const afterOrphanCleanup = JSON.parse(window.render_game_to_text()).enemyVisualAudit;
    if ((Number(afterOrphanCleanup.staleVisibleCount) || 0) > 0 || (Number(afterOrphanCleanup.orphanedVisibleCount) || 0) > 0) {
      throw new Error(`Synthetic orphan enemy visual was not cleaned: ${JSON.stringify(afterOrphanCleanup)}`);
    }

    enemyManager.clearEnemies();
    return { staleAudit, afterStaleCleanup, orphanAudit, afterOrphanCleanup };
  });

  const reports = [];
  for (let level = 8; level <= 12; level += 1) {
    const levelReport = await page.evaluate(async (targetLevel) => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const enemyManager = play?.enemyManager;
      if (!game || !play || !enemyManager) throw new Error('Missing play scene for level audit');
      play.debugJumpToLevel?.(targetLevel, 'dead_enemy_visual_audit');
      play.introActive = false;
      play.introComplete = true;
      play.debugInvincible = true;
      if (play.player) {
        play.player.invulnerable = true;
        play.player.invulnerableTime = 600000;
      }
      play.cleanupSkippedFrameVisuals('level_start_audit');
      const snapshots = [];
      const capture = (label) => {
        const state = JSON.parse(window.render_game_to_text());
        snapshots.push({
          label,
          level: state.level,
          waveState: state.wave?.state || null,
          wavePhase: state.wave?.phase || null,
          audit: state.enemyVisualAudit,
          activeEnemies: state.counts?.enemies || 0,
          visibleEnemies: state.visibleEnemies?.length || 0
        });
        const audit = state.enemyVisualAudit || {};
        if ((Number(audit.staleVisibleCount) || 0) > 0 || (Number(audit.orphanedVisibleCount) || 0) > 0) {
          throw new Error(`${label}: enemy visual audit failed ${JSON.stringify(audit)}`);
        }
      };

      capture('after_debug_jump');
      const waves = enemyManager.waves?.length ? enemyManager.waves : enemyManager.generateWaves(targetLevel);
      const normalCount = Math.max(1, enemyManager.normalWavesTotal || waves.length);
      for (let waveIndex = 0; waveIndex < normalCount; waveIndex += 1) {
        const config = waves[waveIndex] || waves[waves.length - 1];
        enemyManager.clearEnemies();
        enemyManager.currentWaveIndex = waveIndex;
        enemyManager.normalWavesTotal = normalCount;
        enemyManager.phase = 'WAVES';
        enemyManager.state = 'WAVE_ACTIVE';
        enemyManager.spawnWave(config);
        capture(`level_${targetLevel}_wave_${waveIndex}_spawned_pending_exempt`);

        for (const enemy of enemyManager.enemies) {
          if (!enemy || enemy.kind === 'boss') continue;
          enemy.waitingForEntry = false;
          enemy.active = true;
          enemy.destroyed = false;
          enemy.state = 'FORMATION';
          enemy.x = Number.isFinite(enemy.formationX) ? enemy.formationX : enemy.x;
          enemy.y = Number.isFinite(enemy.formationY) ? enemy.formationY : enemy.y;
          if (enemy.sprite) {
            enemy.sprite.x = enemy.x;
            enemy.sprite.y = enemy.y;
            enemy.sprite.visible = true;
            enemy.sprite.renderable = true;
          }
        }
        capture(`level_${targetLevel}_wave_${waveIndex}_entry_active`);

        for (const enemy of [...enemyManager.enemies]) {
          if (!enemy?.active || enemy.kind === 'boss') continue;
          const destroyed = enemy.takeDamage(9999);
          if (destroyed) {
            play.onEnemyKilled?.(enemy);
            play.particleManager?.createExplosion?.(enemy.x, enemy.y, enemy.color || 0xffaa00, 0.35);
          }
        }
        capture(`level_${targetLevel}_wave_${waveIndex}_after_death_before_sweep`);
        play.cleanupSkippedFrameVisuals(`level_${targetLevel}_wave_${waveIndex}_death_sweep`);
        enemyManager.updateEnemies(1);
        play.cleanupSkippedFrameVisuals(`level_${targetLevel}_wave_${waveIndex}_post_update_sweep`);
        capture(`level_${targetLevel}_wave_${waveIndex}_clean`);
      }

      enemyManager.forceBossStart(targetLevel);
      play.showBossTaunt?.('dead_enemy_visual_audit');
      play.cleanupSkippedFrameVisuals(`level_${targetLevel}_boss_incoming_sweep`);
      capture(`level_${targetLevel}_boss_incoming`);
      for (let i = 0; i < 210; i += 1) {
        enemyManager.update(1);
        play.cleanupSkippedFrameVisuals(`level_${targetLevel}_boss_gate_tick`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
      play.cleanupSkippedFrameVisuals(`level_${targetLevel}_boss_spawned_sweep`);
      capture(`level_${targetLevel}_boss_spawned_or_gate`);

      const boss = enemyManager.boss;
      if (boss?.active) {
        boss.health = 0;
        boss.finishGateUntilMs = 0;
        boss.spawnedAtMs = Date.now() - 4000;
        for (let i = 0; i < 4; i += 1) enemyManager.update(1);
        play.cleanupSkippedFrameVisuals(`level_${targetLevel}_boss_defeated_sweep`);
        capture(`level_${targetLevel}_boss_defeated`);
      }

      return {
        level: targetLevel,
        snapshots,
        finalAudit: JSON.parse(window.render_game_to_text()).enemyVisualAudit
      };
    }, level);
    reports.push(levelReport);
    await assertPageClean(page, `sector ${level} browser audit`);
  }

  const screenshot = path.join(outputDir, 'dead-enemy-playthrough-final.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const finalState = await assertPageClean(page, 'final browser audit');
  const report = {
    status: 'passed',
    baseUrl,
    syntheticProof,
    reports,
    finalState: {
      level: finalState.level,
      scene: finalState.scene,
      enemyVisualAudit: finalState.enemyVisualAudit,
      wave: finalState.wave,
      counts: finalState.counts
    },
    screenshot,
    pageErrors,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join('; ')}`);
  const unexpectedConsole = consoleEvents.filter((event) => !/Synthetic|EnemyVisualCleanup|BossFix|Audio/.test(event.text || ''));
  if (unexpectedConsole.some((event) => event.type === 'error')) {
    throw new Error(`Console errors: ${JSON.stringify(unexpectedConsole, null, 2)}`);
  }
  console.log(`[dead-enemy-playthrough] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[dead-enemy-playthrough] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
