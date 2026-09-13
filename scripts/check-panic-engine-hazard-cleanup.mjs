import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { BOSS_ROSTER } from '../src/config/BossRoster.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4367));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/panic-engine-hazard-cleanup-${timestamp()}`);
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
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
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

const panicEngine = BOSS_ROSTER[17];
assert.equal(panicEngine?.name, 'PANIC ENGINE');
assert.equal(panicEngine?.archetype, 'monolith');
assert.equal(panicEngine?.attack, 'wall');
assert.equal(panicEngine?.signature, 'ring');

const playSceneSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
for (const requiredHook of [
  "this.clearBossHazards('boss_defeated')",
  'this.clearEnemyBullets(reason) + this.clearBossHazards(reason)',
  "this.clearBossHazards('scene_destroy')"
]) {
  assert(playSceneSource.includes(requiredHook), `Missing Panic Engine cleanup hook: ${requiredHook}`);
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
    startAtBoss: '1',
    startLevel: '18'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
  }, { timeout: 30000 });

  const setup = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const player = play?.player;
    if (!game || !play || !boss || !player) throw new Error('Missing Panic Engine test surface');

    player.invulnerable = true;
    player.invulnerableTime = 60000;
    boss.x = game.getWidth() / 2;
    boss.y = 116;
    if (boss.sprite) {
      boss.sprite.x = boss.x;
      boss.sprite.y = boss.y;
    }
    play.clearBossHazards('panic_engine_capture_setup');
    const hazard = play.registerBossHazardFromBoss(boss, 'regular', {
      type: 'wall',
      attack: 'wall'
    });
    hazard.elapsedMs = Math.max(0, Number(hazard.armingMs) || 0) + 60;
    play.updateBossHazards(1);
    return {
      level: game.level,
      identity: {
        name: boss.profile?.name,
        archetype: boss.profile?.archetype,
        attack: boss.profile?.attack,
        signature: boss.profile?.signature
      },
      hazard: {
        kind: hazard.kind,
        type: hazard.type,
        attack: hazard.attack,
        columns: hazard.columns?.length || 0
      },
      active: play.bossHazards.length,
      layerHasGeometry: Boolean(play.bossHazardLayerHasGeometry)
    };
  });

  const screenshot = path.join(outputDir, 'panic-engine-wall-hazard.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const cases = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const layerHasGeometry = () => Boolean(play.bossHazardLayerHasGeometry);
    const createDrawnWall = (reason) => {
      play.clearBossHazards(`${reason}_setup`);
      const hazard = play.registerBossHazardFromBoss(boss, 'regular', {
        type: 'wall',
        attack: 'wall'
      });
      hazard.elapsedMs = Math.max(0, Number(hazard.armingMs) || 0) + 40;
      play.updateBossHazards(1);
      return hazard;
    };

    let hazard = createDrawnWall('normal_expiry');
    const expiryBefore = {
      active: play.bossHazards.length,
      layerHasGeometry: layerHasGeometry()
    };
    hazard.elapsedMs = hazard.durationMs - 1;
    play.updateBossHazards(2);
    const normalExpiry = {
      before: expiryBefore,
      after: {
        active: play.bossHazards.length,
        layerHasGeometry: layerHasGeometry()
      }
    };

    createDrawnWall('boss_defeat');
    const bossDefeatBefore = {
      active: play.bossHazards.length,
      layerHasGeometry: layerHasGeometry()
    };
    play.onEnemyKilled(boss);
    const bossDefeat = {
      before: bossDefeatBefore,
      after: {
        active: play.bossHazards.length,
        layerHasGeometry: layerHasGeometry(),
        cleanup: play.lastBossHazardCleanup
      }
    };

    createDrawnWall('respawn');
    const respawnBefore = {
      active: play.bossHazards.length,
      layerHasGeometry: layerHasGeometry()
    };
    const respawnCleared = play.clearRespawnHazards('life_lost');
    const respawn = {
      before: respawnBefore,
      cleared: respawnCleared,
      after: {
        active: play.bossHazards.length,
        layerHasGeometry: layerHasGeometry(),
        cleanup: play.lastBossHazardCleanup
      }
    };

    createDrawnWall('scene_transition');
    const transitionBefore = {
      active: play.bossHazards.length,
      layerHasGeometry: layerHasGeometry()
    };
    game.switchScene('menu', { inputGuardMs: 0, menuExitGuardMs: 0 });
    const sceneTransition = {
      before: transitionBefore,
      after: {
        scene: game.currentSceneName,
        active: play.bossHazards.length,
        layerDestroyed: play.bossHazardLayer === null,
        cleanup: play.lastBossHazardCleanup
      }
    };

    return { normalExpiry, bossDefeat, respawn, sceneTransition };
  });

  const failures = [];
  if (setup.level !== 18) failures.push(`expected level 18, received ${setup.level}`);
  if (setup.identity.name !== 'PANIC ENGINE') failures.push(`wrong boss identity: ${setup.identity.name}`);
  if (setup.identity.archetype !== 'monolith' || setup.identity.attack !== 'wall' || setup.identity.signature !== 'ring') {
    failures.push(`wrong Panic Engine pattern: ${JSON.stringify(setup.identity)}`);
  }
  if (setup.hazard.kind !== 'wall' || setup.hazard.columns < 1 || !setup.layerHasGeometry) {
    failures.push(`Panic Engine wall hazard did not render: ${JSON.stringify(setup)}`);
  }
  if (cases.normalExpiry.before.active !== 1 || !cases.normalExpiry.before.layerHasGeometry ||
      cases.normalExpiry.after.active !== 0 || cases.normalExpiry.after.layerHasGeometry) {
    failures.push(`normal expiry left stale state: ${JSON.stringify(cases.normalExpiry)}`);
  }
  if (cases.bossDefeat.after.active !== 0 || cases.bossDefeat.after.layerHasGeometry ||
      cases.bossDefeat.after.cleanup?.reason !== 'boss_defeated') {
    failures.push(`boss defeat cleanup failed: ${JSON.stringify(cases.bossDefeat)}`);
  }
  if (cases.respawn.after.active !== 0 || cases.respawn.after.layerHasGeometry ||
      cases.respawn.after.cleanup?.reason !== 'life_lost' || cases.respawn.cleared < 1) {
    failures.push(`respawn cleanup failed: ${JSON.stringify(cases.respawn)}`);
  }
  if (cases.sceneTransition.after.scene !== 'menu' || !cases.sceneTransition.after.layerDestroyed ||
      cases.sceneTransition.after.active !== 0 ||
      cases.sceneTransition.after.cleanup?.reason !== 'scene_destroy') {
    failures.push(`scene transition cleanup failed: ${JSON.stringify(cases.sceneTransition)}`);
  }
  if (pageErrors.length > 0) failures.push(`page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length > 0) failures.push(`console errors: ${consoleErrors.join(' | ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    panicEngine,
    setup,
    cases,
    pageErrors,
    consoleErrors,
    failures,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[panic-engine-hazard-cleanup] ${failures.join('; ')}`);
  console.log(`[panic-engine-hazard-cleanup] PASS expiry/death/respawn/transition screenshot=${screenshot}`);
} finally {
  await page.close({ runBeforeUnload: false }).catch(() => {});
  await browser.close();
  if (server) server.kill();
}
