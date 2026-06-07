import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const EXPECTED_APP_ID = '4765070';
const EXPECTED_LEADERBOARD = 'nova_swarm_global_score_v2';
const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4363));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/normal-wave-runtime-lethality-${timestamp()}`);
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

async function startViteServer() {
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
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function avg(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function min(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? Math.min(...finite) : 0;
}

function max(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? Math.max(...finite) : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function summarizeBand(label, levels, levelReports) {
  const reports = levels.map((level) => levelReports.find((entry) => entry.level === level)).filter(Boolean);
  const danger = reports.map((entry) => entry.guaranteedDangerWaves);
  const normalSpeeds = reports.map((entry) => entry.normalProjectileSpeed.avg);
  const threatSpeeds = reports.map((entry) => entry.threatProjectileSpeed.avg);
  const firstThreat = reports.map((entry) => entry.avgTimeToFirstThreatActionMs).filter((value) => value > 0);
  const firstProjectile = reports.map((entry) => entry.avgTimeToFirstEnemyProjectileMs).filter((value) => value > 0);
  const projectiles10 = reports.map((entry) => entry.projectileCountFirst10sDangerAvg);
  const killPotential = reports.map((entry) => entry.normalWaveOnlyKillPotential);
  const bossRatios = reports.map((entry) => entry.normalVsBossProjectileSpeedRatio).filter((value) => value > 0);
  return {
    label,
    levels: `${levels[0]}-${levels[levels.length - 1]}`,
    minDangerWaves: min(danger),
    maxDangerWaves: max(danger),
    avgSpawnedEnemies: round(avg(reports.map((entry) => entry.avgSpawnedEnemies))),
    priorityThreats: round(avg(reports.map((entry) => entry.priorityThreats))),
    avgFirstThreatActionMs: Math.round(avg(firstThreat)),
    avgFirstEnemyProjectileMs: Math.round(avg(firstProjectile)),
    projectileCountFirst10sDangerAvg: round(avg(projectiles10)),
    normalProjectileSpeedAvg: round(avg(normalSpeeds)),
    normalProjectileSpeedRange: [round(min(reports.map((entry) => entry.normalProjectileSpeed.min))), round(max(reports.map((entry) => entry.normalProjectileSpeed.max)))],
    threatProjectileSpeedAvg: round(avg(threatSpeeds)),
    normalReachEstimatePx: Math.round(avg(reports.map((entry) => entry.normalProjectileReachEstimatePx))),
    projectileDodge160pxSec: round(avg(reports.map((entry) => entry.projectileDodge160pxSec))),
    normalWaveOnlyKillPotential: round(avg(killPotential)),
    normalVsBossProjectileSpeedRatio: round(avg(bossRatios)),
    bossContribution: 0
  };
}

function assertProtectedSurfaces(errors) {
  const changedFiles = execFileSync('git', ['diff', '--name-only', 'HEAD', '--'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((line) => line.trim().replaceAll('\\', '/'))
    .filter(Boolean);
  const blockedExact = new Set([
    'src/entities/Boss.js',
    'src/game/BossFactory.js',
    'src/config/BossRoster.js',
    'src/shared/ScorePolicy.js',
    'src/steamCloudPersistence.js'
  ]);
  const blockedPrefixes = [
    'src/leaderboard/',
    'src/achievements/',
    'src/progression/',
    'src/config/Ship',
    'electron/steam',
    'release/steamworks/'
  ];
  const protectedChanges = changedFiles.filter((file) =>
    blockedExact.has(file) || blockedPrefixes.some((prefix) => file.startsWith(prefix))
  );
  if (protectedChanges.length) {
    errors.push(`protected score/leaderboard/save/achievement/ship/unlock/Steam/boss files changed: ${protectedChanges.join(', ')}`);
  }

  const leaderboardTypes = readFileSync('src/leaderboard/LeaderboardTypes.js', 'utf8');
  const steamBridge = readFileSync('electron/steamLeaderboardBridge.cjs', 'utf8');
  if (!leaderboardTypes.includes(`STEAM_LEADERBOARD_NAME = '${EXPECTED_LEADERBOARD}'`)) {
    errors.push(`LeaderboardTypes does not preserve ${EXPECTED_LEADERBOARD}`);
  }
  if (!steamBridge.includes(`DEFAULT_STEAM_LEADERBOARD_NAME = '${EXPECTED_LEADERBOARD}'`)) {
    errors.push(`Steam bridge does not preserve ${EXPECTED_LEADERBOARD}`);
  }
  if (!steamBridge.includes(`DEFAULT_STEAM_APP_ID = ${EXPECTED_APP_ID}`)) {
    errors.push(`Steam bridge does not preserve AppID ${EXPECTED_APP_ID}`);
  }
  const packageJson = readFileSync('package.json', 'utf8');
  if (!packageJson.includes('"check:normal-wave-runtime-lethality"')) {
    errors.push('package.json missing check:normal-wave-runtime-lethality script');
  }
  return changedFiles;
}

function assertBandTargets(bands, cheatPath, errors) {
  const byLabel = new Map(bands.map((band) => [band.label, band]));
  const level1to2 = byLabel.get('Level 1 to 2');
  if (level1to2.minDangerWaves !== 0 || level1to2.maxDangerWaves !== 0) {
    errors.push('Level 1 to 2 must remain conservative with no guaranteed danger waves');
  }
  if (level1to2.normalProjectileSpeedAvg > 1.65 || level1to2.projectileDodge160pxSec < 1.8) {
    errors.push('Level 1 to 2 gained too much normal-wave lethality');
  }

  const early = byLabel.get('Level 3 to 5');
  if (early.minDangerWaves < 1) errors.push('Level 3 to 5 need at least one real danger wave');
  if (early.normalProjectileSpeedAvg < 1.55 || early.projectileCountFirst10sDangerAvg < 12 || early.normalWaveOnlyKillPotential < 2.2) {
    errors.push('Level 3 to 5 runtime projectile/damage risk is still too low');
  }

  const kill = byLabel.get('Level 6 to 10');
  if (kill.minDangerWaves < 2) errors.push('Level 6 to 10 need at least two real danger waves');
  if (kill.normalProjectileSpeedAvg < 2 || kill.projectileDodge160pxSec > 1.35 || kill.normalWaveOnlyKillPotential < 4.5) {
    errors.push('Level 6 to 10 runtime normal waves do not create careless death risk');
  }

  const serious = byLabel.get('Level 11 to 15');
  if (serious.minDangerWaves < 3) errors.push('Level 11 to 15 need at least three runtime danger waves in this pass');
  if (serious.normalProjectileSpeedAvg < 2.4 || serious.normalWaveOnlyKillPotential < 6.5) {
    errors.push('Level 11 to 15 runtime normal waves still lack kill potential');
  }

  const bridge = byLabel.get('Level 16 to 20');
  if (bridge.minDangerWaves < 3 || bridge.normalProjectileSpeedAvg < 2.8 || bridge.normalWaveOnlyKillPotential < 7.5) {
    errors.push('Level 16 to 20 normal waves must be dangerous before the boss');
  }

  const twenty = byLabel.get('Level 20 to 30');
  if (twenty.minDangerWaves < 3 || twenty.normalProjectileSpeedAvg < 3.1 || twenty.normalWaveOnlyKillPotential < 8.5) {
    errors.push('Level 20 to 30 should already feel clearly dangerous');
  }

  const thirty = byLabel.get('Level 30 to 40');
  if (thirty.minDangerWaves < 3 || thirty.normalProjectileSpeedAvg < 3.4 || thirty.normalWaveOnlyKillPotential < 9.5) {
    errors.push('Level 30 to 40 should threaten practiced players');
  }

  const forty = byLabel.get('Level 40 to 50');
  if (forty.minDangerWaves < 3 || forty.normalProjectileSpeedAvg < 3.7 || forty.normalWaveOnlyKillPotential < 10.5) {
    errors.push('Level 40 to 50 should be intense before the boss');
  }

  const fifty = byLabel.get('Level 50 plus');
  if (fifty.minDangerWaves < 3 || fifty.normalProjectileSpeedAvg < 4 || fifty.normalWaveOnlyKillPotential < 11) {
    errors.push('Level 50 plus should remain dangerous');
  }

  if (twenty.normalWaveOnlyKillPotential < early.normalWaveOnlyKillPotential * 2.5 ||
      thirty.normalWaveOnlyKillPotential < twenty.normalWaveOnlyKillPotential ||
      forty.normalWaveOnlyKillPotential < thirty.normalWaveOnlyKillPotential) {
    errors.push('Normal-wave lethality does not climb enough before level 50');
  }

  for (const band of bands.slice(1)) {
    if (band.avgFirstThreatActionMs > 3300) {
      errors.push(`${band.label} threat actions activate too late to matter before enemies are erased`);
    }
    if (band.normalVsBossProjectileSpeedRatio < 0.85) {
      errors.push(`${band.label} normal enemy bullets are dramatically less threatening than boss bullets`);
    }
  }

  if (!cheatPath?.debugJumpAvailable || !cheatPath?.sameDangerWaveCount || !cheatPath?.sameWaveCount) {
    errors.push('Cheat/high-level start path does not use the same normal wave generation path');
  }
}

const server = await startViteServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleWarningsOrErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') consoleWarningsOrErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: '1',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'WAVE_ACTIVE';
  }, { timeout: 30000 });

  const runtime = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const enemyManager = play?.enemyManager;
    const player = play?.player;
    if (!game || !play || !enemyManager || !player) throw new Error('Missing runtime lethality test surface');

    const levels = [1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 15, 16, 18, 20, 25, 30, 35, 40, 45, 50, 60];
    player.invulnerable = true;
    player.invulnerableTime = 60000;
    player.x = game.getWidth() / 2;
    player.y = game.getHeight() - 96;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    const finiteSpeed = (bullet) => Math.hypot(Number(bullet?.vx) || 0, Number(bullet?.vy) || 0);
    const flattenShots = (shots) => Array.isArray(shots) ? shots : (shots ? [shots] : []);
    const kindOfPressure = (config = {}) => `${config.formation || ''} ${config.tactic?.id || config.tactic || ''}`.toLowerCase();
    const countKind = (waves, pattern) => waves.filter((wave) => pattern.test(kindOfPressure(wave))).length;
    const avgLocal = (values) => {
      const finite = values.filter(Number.isFinite);
      if (!finite.length) return 0;
      return finite.reduce((sum, value) => sum + value, 0) / finite.length;
    };
    const forceWaveActive = (enemies) => {
      for (const enemy of enemies) {
        enemy.waitingForEntry = false;
        enemy.active = true;
        if (enemy.sprite) enemy.sprite.visible = true;
        enemy.state = 'FORMATION';
        enemy.x = enemy.formationX;
        enemy.y = enemy.formationY;
        if (enemy.sprite) {
          enemy.sprite.x = enemy.x;
          enemy.sprite.y = enemy.y;
        }
      }
    };
    const clearRuntime = (reason) => {
      play.clearEnemyBullets?.(reason);
      enemyManager.clearEnemies();
      enemyManager.boss = null;
      enemyManager.bossSpawnedThisLevel = false;
      enemyManager.bossDefeatedThisLevel = false;
    };
    const reachEstimate = (bullet) => {
      const speed = finiteSpeed(bullet);
      const lifetimeMs = Number(bullet?.maxLifetimeMs || bullet?.visualConfig?.maxLifetimeMs);
      if (Number.isFinite(lifetimeMs) && lifetimeMs > 0) return speed * 60 * (lifetimeMs / 1000);
      return Math.max(game.getWidth(), game.getHeight());
    };

    async function sampleBossSpeed(level) {
      clearRuntime('runtime_lethality_boss_compare');
      game.level = level;
      enemyManager.level = level;
      play.gameTime = 0;
      const boss = await enemyManager.spawnBoss(level, {
        marketingDebug: true,
        x: game.getWidth() / 2,
        y: Math.max(96, game.getHeight() * 0.18)
      });
      boss.active = true;
      boss.phase = level >= 12 ? 2 : 1;
      boss.shootDelay = 1;
      const shots = flattenShots(boss.shoot(player.x, player.y));
      const speeds = shots.map(finiteSpeed).filter((speed) => speed > 0);
      clearRuntime('runtime_lethality_boss_compare_done');
      return {
        count: shots.length,
        avg: speeds.length ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length : 0,
        min: speeds.length ? Math.min(...speeds) : 0,
        max: speeds.length ? Math.max(...speeds) : 0
      };
    }

    function summarizeWave(level, waveIndex, waves, config) {
      clearRuntime('runtime_lethality_wave_sample');
      game.level = level;
      enemyManager.level = level;
      play.gameTime = 0;
      enemyManager.currentWaveIndex = waveIndex;
      enemyManager.normalWavesTotal = waves.length;
      enemyManager.state = 'WAVE_ACTIVE';
      enemyManager.phase = 'WAVES';
      enemyManager.spawnWave(config);

      const enemies = enemyManager.enemies.filter((enemy) => enemy.kind === 'enemy');
      forceWaveActive(enemies);
      const normalShots = [];
      for (const enemy of enemies) {
        enemy.shootCooldown = 0;
        normalShots.push(...flattenShots(enemy.shoot(player.x, player.y)));
      }
      const normalSpeeds = normalShots.map(finiteSpeed).filter((speed) => speed > 0);
      const normalReach = normalShots.map(reachEstimate);

      play.clearEnemyBullets?.('runtime_lethality_threat_sample');
      const threatActionIds = [];
      for (const enemy of enemies) {
        const action = enemy.threatActionDefinition || null;
        if (!action) continue;
        threatActionIds.push(action.id);
        enemy.executeThreatAction(action, { x: player.x, y: player.y - 72 }, { fakeout: false });
      }
      const threatBullets = play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false);
      const threatSpeeds = threatBullets.map(finiteSpeed).filter((speed) => speed > 0);
      const threatReach = threatBullets.map(reachEstimate);
      const firstThreatMs = enemies
        .filter((enemy) => enemy.threatActionDefinition)
        .map((enemy) => {
          const entryFinish = (enemy.entryCurve?.startTime || Date.now()) + (enemy.entryCurve?.duration || 0);
          const ready = Math.max(entryFinish, enemy.nextThreatActionAt || Date.now());
          return Math.max(0, ready - Date.now()) + (enemy.threatActionDefinition?.telegraphMs || 600);
        })
        .filter(Number.isFinite);
      const firstEntryFinishMs = enemies
        .map((enemy) => Math.max(0, ((enemy.entryCurve?.startTime || Date.now()) + (enemy.entryCurve?.duration || 0)) - Date.now()))
        .filter(Number.isFinite);
      const avgShootDelayMs = enemies.length
        ? enemies.reduce((sum, enemy) => sum + (Number(enemy.shootDelay) || 120), 0) / enemies.length * 16.67
        : 0;
      const firstProjectileMs = (firstEntryFinishMs.length ? Math.min(...firstEntryFinishMs) : 0) +
        Math.min(3200, 900 + avgShootDelayMs / Math.max(1, Math.sqrt(Math.max(1, enemies.length))));
      const expectedNormalProjectiles10s = Math.min(
        normalShots.length * 3.2,
        normalShots.length * (10000 / Math.max(620, avgShootDelayMs || 1000))
      );
      const projectileCountFirst10s = expectedNormalProjectiles10s + threatBullets.length;

      const priority = Number(Boolean(config.eliteMiddleShipId)) + (Array.isArray(config.multiEliteMiddleShipIds) ? config.multiEliteMiddleShipIds.length : 0);
      const movementTags = kindOfPressure(config);
      const pressureTags = {
        rush: /rush|dive|chain|feint|sidewinder|diagonal/.test(movementTags) ? 1 : 0,
        flank: /pincer|split|crossfire|mirror/.test(movementTags) ? 1 : 0,
        zone: /screen|wall|traffic|orbit|mine|weave|turnpike|grid/.test(movementTags) ? 1 : 0
      };

      const avgNormalSpeed = normalSpeeds.length ? normalSpeeds.reduce((sum, speed) => sum + speed, 0) / normalSpeeds.length : 0;
      const avgThreatSpeed = threatSpeeds.length ? threatSpeeds.reduce((sum, speed) => sum + speed, 0) / threatSpeeds.length : 0;
      const damageOpportunity =
        (config.earlyThreatMoment ? 1.3 : 0.7) *
        (enemies.length / 10) *
        (1 + threatActionIds.length * 0.22 + priority * 0.28 + pressureTags.rush * 0.18 + pressureTags.flank * 0.16 + pressureTags.zone * 0.18) *
        Math.max(0.7, avgNormalSpeed / 2.2) *
        Math.max(0.8, (avgThreatSpeed || avgNormalSpeed) / 2.4) *
        Math.max(0.6, projectileCountFirst10s / 18);

      const result = {
        level,
        wave: waveIndex + 1,
        waveCount: waves.length,
        earlyThreatMoment: config.earlyThreatMoment || null,
        formation: config.formation,
        tactic: config.tactic?.id || config.tactic || null,
        spawnedEnemies: enemies.length,
        priorityThreats: priority,
        threatActionIds: [...new Set(threatActionIds)],
        rushThreat: pressureTags.rush,
        flankThreat: pressureTags.flank,
        zoneThreat: pressureTags.zone,
        timeToFirstThreatActionMs: firstThreatMs.length ? Math.round(Math.min(...firstThreatMs)) : 0,
        timeToFirstEnemyProjectileMs: Math.round(firstProjectileMs),
        normalProjectileSpeeds: normalSpeeds,
        threatProjectileSpeeds: threatSpeeds,
        projectileCountFirst10s,
        normalReachEstimatePx: normalReach.length ? normalReach.reduce((sum, value) => sum + value, 0) / normalReach.length : 0,
        threatReachEstimatePx: threatReach.length ? threatReach.reduce((sum, value) => sum + value, 0) / threatReach.length : 0,
        damageOpportunity,
        bossContribution: 0
      };
      clearRuntime('runtime_lethality_wave_done');
      return result;
    }

    const levelReports = [];
    for (const level of levels) {
      clearRuntime('runtime_lethality_level_start');
      game.level = level;
      enemyManager.level = level;
      play.gameTime = 0;
      const waves = enemyManager.generateWaves(level);
      const waveReports = waves.map((config, index) => summarizeWave(level, index, waves, config));
      const dangerReports = waveReports.filter((wave) => wave.earlyThreatMoment);
      const normalSpeeds = waveReports.flatMap((wave) => wave.normalProjectileSpeeds);
      const threatSpeeds = waveReports.flatMap((wave) => wave.threatProjectileSpeeds);
      const bossSpeed = await sampleBossSpeed(level);
      const avgNormalSpeed = normalSpeeds.length ? normalSpeeds.reduce((sum, speed) => sum + speed, 0) / normalSpeeds.length : 0;
      const avgThreatSpeed = threatSpeeds.length ? threatSpeeds.reduce((sum, speed) => sum + speed, 0) / threatSpeeds.length : 0;
      const avgDangerProjectiles10 = dangerReports.length
        ? dangerReports.reduce((sum, wave) => sum + wave.projectileCountFirst10s, 0) / dangerReports.length
        : 0;
      const killPotential = waveReports.reduce((sum, wave) => sum + wave.damageOpportunity, 0);
      levelReports.push({
        level,
        waveCount: waves.length,
        guaranteedDangerWaves: dangerReports.length,
        avgSpawnedEnemies: waveReports.length ? waveReports.reduce((sum, wave) => sum + wave.spawnedEnemies, 0) / waveReports.length : 0,
        priorityThreats: waveReports.reduce((sum, wave) => sum + wave.priorityThreats, 0),
        rushThreats: countKind(waves, /rush|dive|chain|feint|sidewinder|diagonal/),
        flankThreats: countKind(waves, /pincer|split|crossfire|mirror/),
        zoneThreats: countKind(waves, /screen|wall|traffic|orbit|mine|weave|turnpike|grid/),
        avgTimeToFirstThreatActionMs: Math.round(avgLocal(dangerReports.map((wave) => wave.timeToFirstThreatActionMs).filter((value) => value > 0))),
        avgTimeToFirstEnemyProjectileMs: Math.round(avgLocal(dangerReports.map((wave) => wave.timeToFirstEnemyProjectileMs).filter((value) => value > 0))),
        projectileCountFirst10sDangerAvg: avgDangerProjectiles10,
        normalProjectileSpeed: {
          avg: avgNormalSpeed,
          min: normalSpeeds.length ? Math.min(...normalSpeeds) : 0,
          max: normalSpeeds.length ? Math.max(...normalSpeeds) : 0
        },
        threatProjectileSpeed: {
          avg: avgThreatSpeed,
          min: threatSpeeds.length ? Math.min(...threatSpeeds) : 0,
          max: threatSpeeds.length ? Math.max(...threatSpeeds) : 0
        },
        bossProjectileSpeed: bossSpeed,
        normalVsBossProjectileSpeedRatio: bossSpeed.avg > 0 ? avgNormalSpeed / bossSpeed.avg : 0,
        normalProjectileReachEstimatePx: avgLocal(waveReports.map((wave) => wave.normalReachEstimatePx)),
        threatProjectileReachEstimatePx: avgLocal(waveReports.map((wave) => wave.threatReachEstimatePx)),
        projectileDodge160pxSec: avgNormalSpeed > 0 ? 160 / (avgNormalSpeed * 60) : 99,
        normalWaveOnlyKillPotential: killPotential,
        bossContribution: 0,
        waves: waveReports
      });
    }

    const naturalLevel30Waves = (() => {
      clearRuntime('runtime_lethality_cheat_natural');
      game.level = 30;
      enemyManager.level = 30;
      play.gameTime = 0;
      const waves = enemyManager.generateWaves(30);
      return {
        waveCount: waves.length,
        dangerWaveCount: waves.filter((wave) => wave.earlyThreatMoment).length,
        firstDangerMoment: waves.find((wave) => wave.earlyThreatMoment)?.earlyThreatMoment || null
      };
    })();
    const rankBeforeJump = game.rankIndex;
    const debugJumpAvailable = typeof play.debugJumpToLevel === 'function';
    let debugJump = null;
    if (debugJumpAvailable) {
      play.debugJumpToLevel(30, 'normal_wave_runtime_lethality_check');
      const waves = enemyManager.waves || [];
      debugJump = {
        level: game.level,
        rankBeforeJump,
        rankAfterJump: game.rankIndex,
        waveCount: waves.length,
        dangerWaveCount: waves.filter((wave) => wave.earlyThreatMoment).length,
        firstDangerMoment: waves.find((wave) => wave.earlyThreatMoment)?.earlyThreatMoment || null
      };
    }

    return {
      levelReports,
      cheatPath: {
        debugJumpAvailable,
        naturalLevel30Waves,
        debugJump,
        sameWaveCount: Boolean(debugJump && debugJump.waveCount === naturalLevel30Waves.waveCount),
        sameDangerWaveCount: Boolean(debugJump && debugJump.dangerWaveCount === naturalLevel30Waves.dangerWaveCount),
        debugJumpRaisesRank: Boolean(debugJump && debugJump.rankAfterJump > debugJump.rankBeforeJump)
      }
    };
  });

  const bandDefs = [
    ['Level 1 to 2', [1, 2]],
    ['Level 3 to 5', [3, 4, 5]],
    ['Level 6 to 10', [6, 8, 10]],
    ['Level 11 to 15', [11, 12, 15]],
    ['Level 16 to 20', [16, 18, 20]],
    ['Level 20 to 30', [20, 25, 30]],
    ['Level 30 to 40', [30, 35, 40]],
    ['Level 40 to 50', [40, 45, 50]],
    ['Level 50 plus', [50, 60]]
  ];
  const bands = bandDefs.map(([label, levels]) => summarizeBand(label, levels, runtime.levelReports));

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'normal-wave-runtime-lethality.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const errors = [];
  const changedFiles = assertProtectedSurfaces(errors);
  assertBandTargets(bands, runtime.cheatPath, errors);
  if (pageErrors.length) errors.push(`page errors: ${pageErrors.join(' | ')}`);
  if (consoleWarningsOrErrors.length) errors.push(`console warnings/errors: ${consoleWarningsOrErrors.join(' | ')}`);

  const report = {
    ok: errors.length === 0,
    baseUrl,
    bands,
    levelReports: runtime.levelReports,
    cheatPath: runtime.cheatPath,
    bossContributionSeparated: true,
    changedFiles,
    pageErrors,
    consoleWarningsOrErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(`[normal-wave-runtime-lethality] FAIL ${errors.length} issue(s)`);
    errors.forEach((error) => console.error(`- ${error}`));
    console.error(JSON.stringify({ bands, cheatPath: runtime.cheatPath, changedFiles, screenshot }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[normal-wave-runtime-lethality] PASS ${bands.map((band) => `${band.levels}:danger=${band.minDangerWaves}-${band.maxDangerWaves},speed=${band.normalProjectileSpeedAvg},kill=${band.normalWaveOnlyKillPotential}`).join(' ')}`);
    console.log(JSON.stringify({ bands, cheatPath: runtime.cheatPath, changedFiles, screenshot }, null, 2));
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
