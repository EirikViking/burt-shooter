import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  ENEMY_THREAT_ACTIONS,
  pickThreatActionsForWave
} from '../src/config/EnemyThreatActions.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4359));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/normal-enemy-attack-variety-${timestamp()}`);
const BASELINE_VALIDATION_LEVEL = 16;
const POST_UNLOCK_VALIDATION_BUFFER = 4;
const VALIDATION_MAX_LEVEL = Math.max(
  BASELINE_VALIDATION_LEVEL,
  ...ENEMY_THREAT_ACTIONS.map((action) => Math.max(1, Number(action.minLevel) || 1))
) + POST_UNLOCK_VALIDATION_BUFFER;
const EXPECTED_ACTION_IDS = ENEMY_THREAT_ACTIONS.map((action) => action.id);
const EXPECTED_BASELINE_ACTION_IDS = ENEMY_THREAT_ACTIONS
  .filter((action) => (Number(action.minLevel) || 1) <= BASELINE_VALIDATION_LEVEL)
  .map((action) => action.id);

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

function staticReachability(maxLevel = VALIDATION_MAX_LEVEL) {
  const formations = ['PINCER', 'ORBIT_RING', 'SCREEN_DOOR', 'SIDEWINDER', 'DIAGONAL_RAID', 'STAGGERED_WING', 'GRID', 'DOUBLE_ARC', 'CROSS_STREAM', 'SPIRAL', 'BOX'];
  const tacticIds = ['crossfire_pincer', 'orbit_snare', 'weave_wall', 'split_sweep', 'rush_feint', 'needle_stagger', 'pulse_net', 'strafe_sweep', 'ambush_lattice'];
  const seenByLevel = new Map();
  for (let level = 1; level <= maxLevel; level += 1) {
    const seen = new Set();
    for (let waveIndex = 0; waveIndex < 8; waveIndex += 1) {
      const formation = formations[(level + waveIndex) % formations.length];
      const plan = pickThreatActionsForWave({
        level,
        formation,
        tactic: { id: tacticIds[(level * 3 + waveIndex) % tacticIds.length] },
        waveIndex,
        count: level <= 4 ? 8 : 11
      });
      for (const assignment of plan.assignments) seen.add(assignment.actionId);
    }
    seenByLevel.set(level, seen);
  }
  return {
    level1: [...seenByLevel.get(1)],
    level4: [...new Set([1, 2, 3, 4].flatMap((level) => [...seenByLevel.get(level) || []]))],
    level16: [...new Set(Array.from({ length: Math.min(BASELINE_VALIDATION_LEVEL, maxLevel) }, (_, index) => index + 1)
      .flatMap((level) => [...seenByLevel.get(level) || []]))],
    levelMax: [...new Set([...seenByLevel.values()].flatMap((set) => [...set]))]
  };
}

const reachability = staticReachability();
const server = await startPreviewServer();
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
    startLevel: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'WAVE_ACTIVE';
  }, { timeout: 30000 });

  const runtime = await page.evaluate(async ({ validationMaxLevel, expectedActionIds }) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const enemyManager = play?.enemyManager;
    const player = play?.player;
    if (!game || !play || !enemyManager || !player) throw new Error('Missing normal enemy threat test surface');
    player.invulnerable = true;
    player.invulnerableTime = 60000;

    const samples = [];
    const bulletIds = new Set();
    const assignedIds = new Set();
    let nanBulletCount = 0;
    let closeSpawnCount = 0;
    let maxMines = 0;
    let maxOrbiters = 0;

    for (let level = 1; level <= validationMaxLevel; level += 1) {
      enemyManager.level = level;
      game.level = level;
      const waves = enemyManager.generateWaves(level);
      for (let waveIndex = 0; waveIndex < waves.length; waveIndex += 1) {
        const config = waves[waveIndex];
        play.clearEnemyBullets?.('normal_enemy_attack_variety_check');
        enemyManager.clearEnemies();
        enemyManager.currentWaveIndex = waveIndex;
        enemyManager.normalWavesTotal = waves.length;
        enemyManager.state = 'WAVE_ACTIVE';
        enemyManager.phase = 'WAVES';
        enemyManager.spawnWave(config);

        const enemies = enemyManager.enemies.filter((enemy) => enemy.kind === 'enemy');
        for (const enemy of enemies) {
          enemy.waitingForEntry = false;
          enemy.active = true;
          if (enemy.sprite) enemy.sprite.visible = true;
          enemy.state = 'FORMATION';
          enemy.x = enemy.formationX;
          enemy.y = enemy.formationY;
        }

        const waveAssigned = [];
        for (const enemy of enemies) {
          const action = enemy.threatActionDefinition || null;
          if (!action) continue;
          assignedIds.add(action.id);
          waveAssigned.push(action.id);
          enemy.executeThreatAction(action, { x: player.x, y: player.y - 72 }, { fakeout: false });
        }

        for (const bullet of play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false)) {
          if (Math.hypot((bullet.x || 0) - player.x, (bullet.y || 0) - player.y) < 32) closeSpawnCount += 1;
        }

        for (let frame = 0; frame < 95; frame += 1) {
          play.bulletManager.update(1);
          const activeFrameBullets = play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false);
          maxMines = Math.max(maxMines, activeFrameBullets.filter((bullet) => bullet.behavior === 'mine_arming').length);
          maxOrbiters = Math.max(maxOrbiters, activeFrameBullets.filter((bullet) => bullet.behavior === 'orbit_then_release').length);
        }

        const bullets = play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false);
        for (const bullet of bullets) {
          if (bullet.threatActionId) bulletIds.add(bullet.threatActionId);
          if (![bullet.x, bullet.y, bullet.vx, bullet.vy].every(Number.isFinite)) nanBulletCount += 1;
        }
        samples.push({
          level,
          waveIndex,
          formation: config.formation,
          assigned: [...new Set(waveAssigned)],
          bulletIds: [...new Set(bullets.map((bullet) => bullet.threatActionId).filter(Boolean))],
          bulletCount: bullets.length,
          budget: enemyManager.currentWaveThreatState
            ? {
              maxActive: enemyManager.currentWaveThreatState.maxActive,
              dangerBudget: enemyManager.currentWaveThreatState.dangerBudget,
              assignedIds: enemyManager.currentWaveThreatState.assignedIds
            }
            : null
        });
      }
    }

    play.clearEnemyBullets?.('normal_enemy_attack_variety_action_sweep');
    enemyManager.clearEnemies();
    enemyManager.level = validationMaxLevel;
    game.level = validationMaxLevel;
    enemyManager.currentWaveIndex = 0;
    enemyManager.normalWavesTotal = 1;
    enemyManager.state = 'WAVE_ACTIVE';
    enemyManager.phase = 'WAVES';
    enemyManager.spawnWave({
      count: 1,
      formation: 'GRID',
      type: 'copper_mite',
      entry: 'single',
      tactic: 'pulse_net'
    });
    const sweepEnemy = enemyManager.enemies.find((enemy) => enemy.kind === 'enemy');
    if (!sweepEnemy) throw new Error('Could not spawn action sweep enemy');
    sweepEnemy.waitingForEntry = false;
    sweepEnemy.active = true;
    if (sweepEnemy.sprite) sweepEnemy.sprite.visible = true;
    sweepEnemy.state = 'FORMATION';
    sweepEnemy.x = Math.max(120, Math.min(game.getWidth() - 120, player.x));
    sweepEnemy.y = 140;

    const actionSweep = {
      executedIds: [],
      bulletIds: [],
      missingBulletIds: [],
      nanBulletCount: 0,
      closeSpawnCount: 0,
      maxMines: 0,
      maxOrbiters: 0
    };
    for (const actionId of expectedActionIds) {
      play.clearEnemyBullets?.(`normal_enemy_attack_variety_action_${actionId}`);
      const beforeCount = play.bulletManager.enemyBullets.length;
      sweepEnemy.executeThreatAction(actionId, { x: player.x, y: player.y - 72 }, { fakeout: false });
      for (const bullet of play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false)) {
        if (Math.hypot((bullet.x || 0) - player.x, (bullet.y || 0) - player.y) < 32) actionSweep.closeSpawnCount += 1;
      }
      for (let frame = 0; frame < 95; frame += 1) {
        play.bulletManager.update(1);
        const activeFrameBullets = play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false);
        actionSweep.maxMines = Math.max(actionSweep.maxMines, activeFrameBullets.filter((bullet) => bullet.behavior === 'mine_arming').length);
        actionSweep.maxOrbiters = Math.max(actionSweep.maxOrbiters, activeFrameBullets.filter((bullet) => bullet.behavior === 'orbit_then_release').length);
      }
      const bullets = play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false);
      const tagged = bullets.filter((bullet) => bullet.threatActionId === actionId);
      for (const bullet of bullets) {
        if (bullet.threatActionId) actionSweep.bulletIds.push(bullet.threatActionId);
        if (![bullet.x, bullet.y, bullet.vx, bullet.vy].every(Number.isFinite)) actionSweep.nanBulletCount += 1;
      }
      if (tagged.length > 0) {
        actionSweep.executedIds.push(actionId);
      } else {
        actionSweep.missingBulletIds.push(actionId);
      }
      if (play.bulletManager.enemyBullets.length === beforeCount && tagged.length === 0) {
        actionSweep.missingBulletIds.push(actionId);
      }
    }
    actionSweep.executedIds = [...new Set(actionSweep.executedIds)];
    actionSweep.bulletIds = [...new Set(actionSweep.bulletIds)];
    actionSweep.missingBulletIds = [...new Set(actionSweep.missingBulletIds)];

    return {
      assignedIds: [...assignedIds],
      bulletIds: [...bulletIds],
      nanBulletCount,
      closeSpawnCount,
      maxMines,
      maxOrbiters,
      actionSweep,
      samples
    };
  }, { validationMaxLevel: VALIDATION_MAX_LEVEL, expectedActionIds: EXPECTED_ACTION_IDS });

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'normal-enemy-attack-variety.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const expectedIds = new Set(EXPECTED_ACTION_IDS);
  const expectedByBaseline = new Set(EXPECTED_BASELINE_ACTION_IDS);
  const missingBy16 = [...expectedByBaseline].filter((id) => !runtime.actionSweep.executedIds.includes(id));
  const missingByValidationLevel = [...expectedIds].filter((id) => !runtime.actionSweep.executedIds.includes(id));
  const waveMissingBy16 = [...expectedByBaseline].filter((id) => !runtime.assignedIds.includes(id));
  const waveMissingByValidationLevel = [...expectedIds].filter((id) => !runtime.assignedIds.includes(id));
  const staticMissingByValidationLevel = [...expectedIds].filter((id) => !reachability.levelMax.includes(id));
  const report = {
    ok:
      ENEMY_THREAT_ACTIONS.length >= 10 &&
      reachability.level1.length >= 3 &&
      reachability.level4.length >= 5 &&
      reachability.level16.length >= 10 &&
      staticMissingByValidationLevel.length === 0 &&
      runtime.assignedIds.length >= 10 &&
      runtime.bulletIds.length >= 10 &&
      runtime.nanBulletCount === 0 &&
      runtime.closeSpawnCount === 0 &&
      runtime.maxMines <= 4 &&
      runtime.maxOrbiters <= 6 &&
      runtime.actionSweep.executedIds.length === EXPECTED_ACTION_IDS.length &&
      runtime.actionSweep.missingBulletIds.length === 0 &&
      runtime.actionSweep.nanBulletCount === 0 &&
      runtime.actionSweep.closeSpawnCount === 0 &&
      missingBy16.length === 0 &&
      missingByValidationLevel.length === 0 &&
      pageErrors.length === 0 &&
      consoleWarningsOrErrors.length === 0,
    baseUrl,
    validationMaxLevel: VALIDATION_MAX_LEVEL,
    definitions: ENEMY_THREAT_ACTIONS.map(({ id, minLevel, dangerBudgetCost, maxActivePerWave }) => ({ id, minLevel, dangerBudgetCost, maxActivePerWave })),
    reachability,
    staticMissingByValidationLevel,
    runtime: {
      assignedIds: runtime.assignedIds,
      bulletIds: runtime.bulletIds,
      nanBulletCount: runtime.nanBulletCount,
      closeSpawnCount: runtime.closeSpawnCount,
      maxMines: runtime.maxMines,
      maxOrbiters: runtime.maxOrbiters,
      actionSweep: runtime.actionSweep,
      missingBy16,
      missingByValidationLevel,
      waveMissingBy16,
      waveMissingByValidationLevel
    },
    sampleCount: runtime.samples.length,
    samples: runtime.samples,
    pageErrors,
    consoleWarningsOrErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[normal-enemy-attack-variety] PASS waveActions=${runtime.assignedIds.length} waveBulletTags=${runtime.bulletIds.length} actionSweep=${runtime.actionSweep.executedIds.length}/${EXPECTED_ACTION_IDS.length} mines=${runtime.maxMines} orbiters=${runtime.maxOrbiters} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
