import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4488));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(
  process.env.CHECK_OUTPUT_DIR || `test-results/player-life-loss-comprehension-${timestamp()}`
);
const LOCAL_DEVTOOLS_HASH = '58c1dcf70893ed83131f7ac7bfa565017be23f2e3a30ec0dd5e3826f77a778a5';

const viewports = [
  { width: 1280, height: 720 },
  { width: 960, height: 640 }
];
const cases = [
  { id: 'enemy-projectile', kind: 'projectile', expectedSource: 'enemy_bullet' },
  { id: 'enemy-contact', kind: 'contact', expectedSource: 'enemy_contact', baselineAngle: Math.PI },
  { id: 'boss-signature', kind: 'boss-signature', expectedSource: 'boss_hazard', boss: true, baselineAngle: -0.483 },
  { id: 'enemy-projectile-reduced-motion', kind: 'projectile', expectedSource: 'enemy_bullet', reducedMotion: true }
];

function angleDelta(left, right) {
  return Math.abs(Math.atan2(Math.sin(left - right), Math.cos(left - right)));
}

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
  throw new Error(`No available life-loss comprehension port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
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
  while (Date.now() - start < 30000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function withQuery(params) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function preparePage(browser, viewport, scenario) {
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript(({ reducedMotion }) => {
    localStorage.setItem('nova_accessibility_reduced_motion', reducedMotion ? '1' : '0');
    localStorage.setItem('nova_accessibility_flash_intensity', reducedMotion ? '0.55' : '1');
    localStorage.setItem('burt_accessibility_screen_shake', reducedMotion ? '0' : '1');
  }, { reducedMotion: Boolean(scenario.reducedMotion) });
  await page.goto(withQuery({
    autostart: '1',
    offlineLeaderboard: '1',
    ...(scenario.boss ? {
      controlSmoke: '1',
      debugBossToken: 'NOVA_DEBUG_2026',
      'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
      startAtBoss: '1',
      startLevel: '6'
    } : {})
  }), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => Boolean(
    window.__game?.scenes?.play?.player
    && window.__game?.scenes?.play?.bulletManager
    && window.__game?.scenes?.play?.enemyManager
  ), null, { timeout: 30000 });
  if (scenario.boss) {
    await page.evaluate(async () => {
      const play = window.__game?.scenes?.play;
      if (!play?.enemyManager || play.enemyManager.boss?.active) return;
      play.clearPendingEnemyStart?.();
      play.enemyManager.forceBossStart?.(6);
      await play.enemyManager.spawnBoss?.(6);
      play.enemyManager.state = 'BOSS_ACTIVE';
      play.enemyManager.bossSpawning = false;
    });
    await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.enemyManager?.boss?.active), null, { timeout: 30000 });
  }
  return { page, pageErrors, consoleErrors };
}

async function stageLifeLoss(page, scenario) {
  return page.evaluate(({ kind, reducedMotion }) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const manager = play?.enemyManager;
    if (!game || !play || !player || !manager) throw new Error('Missing gameplay surface');

    game.app.ticker.stop();
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = false;
    play.freezeTimerMs = 0;
    play.debugInvincible = false;
    play.gameOverSequenceStarted = false;
    play.clearPendingEnemyStart?.();
    play.clearToastState?.();
    play.scorePopupManager?.clearVisuals?.({ preserveCombo: false });
    play.clearBossHazards?.('life_loss_comprehension_setup');
    play.bulletManager.enemyBullets = [];
    play.bulletManager.playerBullets = [];
    play.bulletManager.pendingEnemyBullets = [];
    manager.enemies = [];
    manager.update = () => {};
    manager.state = kind === 'boss-signature' ? 'BOSS_ACTIVE' : 'WAVE_ACTIVE';
    manager.phase = kind === 'boss-signature' ? 'BOSS' : 'WAVES';

    game.lives = 3;
    game.score = 4321;
    player.resetPowerups?.();
    player.active = true;
    player.shieldActive = false;
    player.invulnerable = false;
    player.invulnerableTime = 0;
    play.shownCabinetLogIds?.add?.('boss-mercy-read');
    const gameplayWidth = Number(play.gameplayGame?.getWidth?.()) || game.getWidth();
    const gameplayHeight = Number(play.gameplayGame?.getHeight?.()) || game.getHeight();
    const original = {
      x: Math.round(gameplayWidth * 0.28),
      y: Math.round(gameplayHeight * 0.61)
    };
    player.x = original.x;
    player.y = original.y;
    if (player.sprite) {
      player.sprite.x = original.x;
      player.sprite.y = original.y;
      player.sprite.visible = true;
      player.sprite.renderable = true;
      player.sprite.alpha = 1;
    }

    let stimulus = null;
    if (kind === 'projectile') {
      const bullet = {
        x: player.x,
        y: player.y,
        vx: -8,
        vy: 0,
        angle: Math.PI,
        radius: 6,
        active: true,
        nearMissed: false,
        color: 0xff6677,
        sourceFireStyle: 'life_loss_comprehension_probe',
        __novaProjectileKind: 'enemy'
      };
      play.bulletManager.enemyBullets = [bullet];
      play.checkCollisions();
      const livesAfterFirst = game.lives;
      const firstCue = structuredClone(play.lastPlayerDamageDirectionCueDebug || null);
      const secondBullet = {
        ...bullet,
        x: player.x,
        y: player.y,
        vx: 8,
        active: true,
        nearMissed: false
      };
      play.bulletManager.enemyBullets = [secondBullet];
      play.checkCollisions();
      stimulus = {
        type: 'projectile',
        vx: bullet.vx,
        vy: bullet.vy,
        impactX: bullet.x,
        impactY: bullet.y,
        expectedDirectionAngle: Math.atan2(-bullet.vy, -bullet.vx),
        livesAfterFirst,
        livesAfterSecondSameFrame: game.lives,
        firstCueAngle: firstCue?.directionAngle,
        cueAngleAfterSecond: play.lastPlayerDamageDirectionCueDebug?.directionAngle
      };
    } else if (kind === 'contact') {
      const enemy = {
        x: player.x - 3,
        y: player.y,
        radius: 18,
        active: true,
        destroyed: false,
        kind: 'normal',
        state: 'FORMATION',
        color: 0x66e7ff,
        challengeFlightTarget: false,
        contactSafeDuringEntry: false,
        deactivateVisuals() {
          this.active = false;
          return true;
        }
      };
      manager.enemies = [enemy];
      play.checkCollisions();
      stimulus = { type: 'contact', sourceX: enemy.x, sourceY: enemy.y };
    } else {
      const boss = manager.boss;
      if (!boss?.active) throw new Error('Boss signature case missing active boss');
      boss.x = gameplayWidth * 0.72;
      boss.y = Math.max(110, gameplayHeight * 0.2);
      if (boss.sprite) {
        boss.sprite.x = boss.x;
        boss.sprite.y = boss.y;
      }
      play.bossMercyUntilMs = 0;
      play.resetBossLifeLossCap?.('life_loss_comprehension');
      const hazard = play.registerBossHazardFromBoss(boss, 'signature', {
        category: 'signature',
        type: 'lance',
        playerX: player.x,
        playerY: player.y
      });
      hazard.startedAt -= (Number(hazard.armingMs) || 0) + 20;
      play.updateBossHazards(1);
      stimulus = {
        type: 'boss-signature',
        hazardKind: hazard.kind,
        hazardSourceX: hazard.sourceX,
        hazardSourceY: hazard.sourceY,
        bossX: boss.x,
        bossY: boss.y
      };
    }

    const immediate = {
      lives: game.lives,
      score: game.score,
      source: play.lastLifeLossSource,
      cause: structuredClone(play.lastLifeLossCause || null),
      cue: structuredClone(play.lastPlayerDamageDirectionCueDebug || null),
      original,
      respawn: { x: Math.round(player.x), y: Math.round(player.y) },
      invulnerable: Boolean(player.invulnerable),
      reducedMotion,
      stimulus
    };
    game.app.ticker.start();
    return immediate;
  }, { kind: scenario.kind, reducedMotion: Boolean(scenario.reducedMotion) });
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});

const reports = [];
try {
  for (const viewport of viewports) {
    for (const scenario of cases) {
      const { page, pageErrors, consoleErrors } = await preparePage(browser, viewport, scenario);
      try {
        const immediate = await stageLifeLoss(page, scenario);
        await page.waitForTimeout(180);
        const active = await page.evaluate(() => {
          const play = window.__game?.scenes?.play;
          const layer = play?.playerDamageDirectionCue?.layer;
          const bounds = layer?.getBounds?.();
          return {
            cue: structuredClone(layer?._debugDamageDirectionCue || play?.lastPlayerDamageDirectionCueDebug || null),
            visible: Boolean(layer?.parent && layer?.visible !== false),
            layerPosition: layer ? { x: Math.round(layer.x), y: Math.round(layer.y) } : null,
            playerPosition: play?.player ? { x: Math.round(play.player.x), y: Math.round(play.player.y) } : null,
            bounds: bounds ? {
              x: Math.round(bounds.x), y: Math.round(bounds.y),
              width: Math.round(bounds.width), height: Math.round(bounds.height)
            } : null,
            toast: structuredClone(play?.getToastDebugState?.() || null)
          };
        });
        const screenshot = path.join(outputDir, `${scenario.id}-${viewport.width}x${viewport.height}.png`);
        await page.screenshot({ path: screenshot, fullPage: false });
        await page.waitForTimeout(700);
        const cleanup = await page.evaluate(() => ({
          activeCue: Boolean(window.__game?.scenes?.play?.playerDamageDirectionCue),
          visible: Boolean(window.__game?.scenes?.play?.playerDamageDirectionCue?.layer?.parent)
        }));

        const observedAngle = Number(active.cue?.directionAngle);
        const expectedSourceAngle = scenario.kind === 'projectile'
          ? Number(immediate.stimulus?.expectedDirectionAngle)
          : Number(scenario.baselineAngle);
        const directionErrorRad = Number.isFinite(observedAngle) && Number.isFinite(expectedSourceAngle)
          ? angleDelta(observedAngle, expectedSourceAngle)
          : null;
        const impactOriginError = Math.hypot(
          Number(active.layerPosition?.x) - Number(immediate.original?.x),
          Number(active.layerPosition?.y) - Number(immediate.original?.y)
        );
        const respawnDistanceFromImpact = Math.hypot(
          Number(active.playerPosition?.x) - Number(immediate.original?.x),
          Number(active.playerPosition?.y) - Number(immediate.original?.y)
        );
        const findings = {
          directionMatchesExpected: Number(directionErrorRad) <= 0.02,
          cueRemainsAtRecordedImpact: Number(impactOriginError) <= 1 && Number(respawnDistanceFromImpact) > 50,
          reducedMotionUsesStaticGeometry: Boolean(
            scenario.reducedMotion
            && active.visible
            && active.cue?.reducedMotion === true
            && Number(active.cue?.durationMs) === 310
            && Number(active.cue?.baseRadius) === Number(immediate.cue?.baseRadius)
            && Number(active.cue?.pulse) === 0
            && Number(immediate.cue?.pulse) === 0
          ),
          expectedSourceAngle,
          observedAngle,
          directionErrorRad,
          impactOriginError,
          respawnDistanceFromImpact
        };
        const failures = [];
        if (immediate.lives !== 2) failures.push(`life loss mismatch: ${JSON.stringify(immediate)}`);
        if (immediate.score !== 4321) failures.push(`score changed: ${JSON.stringify(immediate)}`);
        if (immediate.source !== scenario.expectedSource) failures.push(`source mismatch: ${JSON.stringify(immediate)}`);
        if (!immediate.invulnerable) failures.push(`respawn invulnerability missing: ${JSON.stringify(immediate)}`);
        if (!active.visible || !active.cue?.visible) failures.push(`direction cue missing: ${JSON.stringify(active)}`);
        if (!findings.directionMatchesExpected) failures.push(`cue direction mismatch: ${JSON.stringify(findings)}`);
        if (!findings.cueRemainsAtRecordedImpact) failures.push(`cue moved with respawn: ${JSON.stringify({ immediate, active, findings })}`);
        if (active.cue?.parentSpace !== 'gameContainer') failures.push(`cue parent space mismatch: ${JSON.stringify(active.cue)}`);
        if (scenario.kind === 'projectile' && active.cue?.directionMode !== 'explicit_vector') {
          failures.push(`projectile did not use explicit direction: ${JSON.stringify(active.cue)}`);
        }
        if (scenario.kind !== 'projectile' && active.cue?.directionMode !== 'source_position') {
          failures.push(`positional source path changed: ${JSON.stringify(active.cue)}`);
        }
        if (scenario.kind === 'projectile' && (
          immediate.stimulus?.livesAfterFirst !== 2
          || immediate.stimulus?.livesAfterSecondSameFrame !== 2
          || immediate.stimulus?.firstCueAngle !== immediate.stimulus?.cueAngleAfterSecond
        )) {
          failures.push(`same-frame life-loss ownership changed: ${JSON.stringify(immediate.stimulus)}`);
        }
        if (scenario.reducedMotion && !findings.reducedMotionUsesStaticGeometry) {
          failures.push(`Reduced Motion cue still animates geometry: ${JSON.stringify({ immediate: immediate.cue, active: active.cue })}`);
        }
        if (!scenario.reducedMotion && Number(active.cue?.durationMs) !== 470) {
          failures.push(`normal cue duration mismatch: ${JSON.stringify(active.cue)}`);
        }
        if (cleanup.activeCue || cleanup.visible) failures.push(`direction cue cleanup failed: ${JSON.stringify(cleanup)}`);
        if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
        if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

        reports.push({ scenario, viewport, immediate, active, cleanup, findings, screenshot, pageErrors, consoleErrors, failures });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  if (server) server.kill();
}

const failures = reports.flatMap((report) => report.failures.map((failure) => `${report.scenario.id} ${report.viewport.width}x${report.viewport.height}: ${failure}`));
const report = {
  ok: failures.length === 0,
  baseUrl,
  outputDir,
  reports,
  findings: {
    projectileDirectionAccurateAtAllLayouts: reports
      .filter((item) => item.scenario.kind === 'projectile' && !item.scenario.reducedMotion)
      .every((item) => item.findings.directionMatchesExpected),
    reducedMotionUsesStaticGeometryAtAllLayouts: reports
      .filter((item) => item.scenario.reducedMotion)
      .every((item) => item.findings.reducedMotionUsesStaticGeometry),
    cueRemainsAtRecordedImpactAtAllLayouts: reports
      .every((item) => item.findings.cueRemainsAtRecordedImpact)
  },
  failures
};
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
assert(report.ok, `[player-life-loss-comprehension] ${failures.join('; ')}`);
console.log(`[player-life-loss-comprehension] PASS captures=${reports.length} report=${path.join(outputDir, 'report.json')}`);
