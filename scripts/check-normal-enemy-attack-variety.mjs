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
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const MAX_ACTION_UNLOCK_LEVEL = Math.max(...ENEMY_THREAT_ACTIONS.map((action) => Math.max(1, Number(action.minLevel) || 1)));
const ACTION_DEFINITIONS = ENEMY_THREAT_ACTIONS.map((action) => ({ ...action }));
const MAX_SYNTHETIC_ORBITERS = Math.max(
  6,
  ...ENEMY_THREAT_ACTIONS
    .filter((action) => (action.handlerId || action.id) === 'orbiting_satellites')
    .map((action) => Number(action.activeBulletCap) || 0)
) + 3;

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

function staticReachability() {
  const formations = ['PINCER', 'ORBIT_RING', 'SCREEN_DOOR', 'SIDEWINDER', 'DIAGONAL_RAID', 'STAGGERED_WING'];
  const tacticByFormation = {
    PINCER: { id: 'crossfire_pincer' },
    ORBIT_RING: { id: 'orbit_snare' },
    SCREEN_DOOR: { id: 'weave_wall' },
    SIDEWINDER: { id: 'split_sweep' },
    DIAGONAL_RAID: { id: 'rush_feint' },
    STAGGERED_WING: { id: 'needle_stagger' }
  };
  const seenByLevel = new Map();
  for (let level = 1; level <= MAX_ACTION_UNLOCK_LEVEL; level += 1) {
    const seen = new Set();
    for (let waveIndex = 0; waveIndex < 6; waveIndex += 1) {
      const formation = formations[(level + waveIndex) % formations.length];
      const plan = pickThreatActionsForWave({
        level,
        formation,
        tactic: tacticByFormation[formation],
        waveIndex,
        count: level <= 4 ? 8 : 11
      });
      for (const assignment of plan.assignments) seen.add(assignment.actionId);
    }
    seenByLevel.set(level, seen);
  }
  return {
    level1: [...seenByLevel.get(1)],
    level4: [...new Set([1, 2, 3, 4].flatMap((level) => [...seenByLevel.get(level)]))],
    level16: [...new Set([...Array(16).keys()].flatMap((index) => [...(seenByLevel.get(index + 1) || new Set())]))],
    maxUnlockLevel: MAX_ACTION_UNLOCK_LEVEL,
    maxUnlockCoverage: [...new Set([...seenByLevel.values()].flatMap((set) => [...set]))]
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
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
    startLevel: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'WAVE_ACTIVE';
  }, { timeout: 30000 });

  const runtime = await page.evaluate(async ({ maxActionUnlockLevel, actionDefinitions }) => {
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
    const targetedActionIds = new Set();
    const targetedBulletIds = new Set();
    let nanBulletCount = 0;
    let closeSpawnCount = 0;
    let maxMines = 0;
    let maxOrbiters = 0;

    for (let level = 1; level <= maxActionUnlockLevel; level += 1) {
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

    const prepareWaveEnemy = (level, waveIndex = 0) => {
      enemyManager.level = level;
      game.level = level;
      const waves = enemyManager.generateWaves(level);
      const config = waves[waveIndex % waves.length] || waves[0];
      play.clearEnemyBullets?.('normal_enemy_attack_variety_targeted_check');
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
      return enemies[0] || null;
    };

    const missingOrganicActions = actionDefinitions.filter((action) => !assignedIds.has(action.id));
    for (const action of missingOrganicActions) {
      const level = Math.max(maxActionUnlockLevel, Number(action.minLevel) || 1);
      const enemy = prepareWaveEnemy(level, action.id.length);
      if (!enemy) continue;
      enemy.level = level;
      const bullets = enemy.executeThreatAction(action, { x: player.x, y: player.y - 72 }, { fakeout: false });
      for (let frame = 0; frame < 95; frame += 1) {
        play.bulletManager.update(1);
      }
      const activeBullets = play.bulletManager.enemyBullets.filter((bullet) => bullet?.active !== false);
      const actionBulletIds = new Set(activeBullets.map((bullet) => bullet.threatActionId).filter(Boolean));
      for (const id of actionBulletIds) targetedBulletIds.add(id);
      if (bullets.length || actionBulletIds.has(action.id)) targetedActionIds.add(action.id);
      for (const bullet of activeBullets) {
        if (![bullet.x, bullet.y, bullet.vx, bullet.vy].every(Number.isFinite)) nanBulletCount += 1;
      }
    }

    return {
      assignedIds: [...assignedIds],
      bulletIds: [...bulletIds],
      targetedActionIds: [...targetedActionIds],
      targetedBulletIds: [...targetedBulletIds],
      nanBulletCount,
      closeSpawnCount,
      maxMines,
      maxOrbiters,
      samples
    };
  }, { maxActionUnlockLevel: MAX_ACTION_UNLOCK_LEVEL, actionDefinitions: ACTION_DEFINITIONS });

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'normal-enemy-attack-variety.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const expectedIds = new Set(ENEMY_THREAT_ACTIONS.map((action) => action.id));
  const allAssignedIds = [...new Set([...runtime.assignedIds, ...runtime.targetedActionIds])];
  const allBulletIds = [...new Set([...runtime.bulletIds, ...runtime.targetedBulletIds])];
  const missingByMaxUnlock = [...expectedIds].filter((id) => !allAssignedIds.includes(id));
  const report = {
    ok:
      ENEMY_THREAT_ACTIONS.length >= 10 &&
      reachability.level1.length >= 3 &&
      reachability.level4.length >= 5 &&
      reachability.level16.length >= 10 &&
      runtime.assignedIds.length >= 10 &&
      runtime.bulletIds.length >= 10 &&
      runtime.nanBulletCount === 0 &&
      runtime.closeSpawnCount === 0 &&
      runtime.maxMines <= 4 &&
      runtime.maxOrbiters <= MAX_SYNTHETIC_ORBITERS &&
      missingByMaxUnlock.length === 0 &&
      pageErrors.length === 0 &&
      consoleWarningsOrErrors.length === 0,
    baseUrl,
    definitions: ENEMY_THREAT_ACTIONS.map(({ id, minLevel, dangerBudgetCost, maxActivePerWave }) => ({ id, minLevel, dangerBudgetCost, maxActivePerWave })),
    reachability,
    runtime: {
      assignedIds: runtime.assignedIds,
      bulletIds: runtime.bulletIds,
      targetedActionIds: runtime.targetedActionIds,
      targetedBulletIds: runtime.targetedBulletIds,
      allAssignedIds,
      allBulletIds,
      nanBulletCount: runtime.nanBulletCount,
      closeSpawnCount: runtime.closeSpawnCount,
      maxMines: runtime.maxMines,
      maxOrbiters: runtime.maxOrbiters,
      maxSyntheticOrbiters: MAX_SYNTHETIC_ORBITERS,
      missingByMaxUnlock
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
    console.log(`[normal-enemy-attack-variety] PASS actions=${allAssignedIds.length} organic=${runtime.assignedIds.length} targeted=${runtime.targetedActionIds.length} bulletTags=${allBulletIds.length} mines=${runtime.maxMines} orbiters=${runtime.maxOrbiters}/${MAX_SYNTHETIC_ORBITERS} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
