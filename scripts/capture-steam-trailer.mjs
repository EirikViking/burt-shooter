import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.TRAILER_CAPTURE_HOST || '127.0.0.1';
const explicitPort = process.env.TRAILER_CAPTURE_PORT ? Number(process.env.TRAILER_CAPTURE_PORT) : null;
const port = process.env.TRAILER_CAPTURE_URL ? null : (explicitPort || await findAvailablePort(Number(process.env.TRAILER_CAPTURE_PORT_START || 4373)));
const baseUrl = process.env.TRAILER_CAPTURE_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.TRAILER_CAPTURE_OUTPUT_DIR || `release/steam-trailer/draft-${dateStamp()}`);
const viewport = {
  width: Number(process.env.TRAILER_CAPTURE_WIDTH || 1280),
  height: Number(process.env.TRAILER_CAPTURE_HEIGHT || 720)
};
const trailerName = 'nova-swarm-steam-trailer-visual-draft.webm';
const consoleEvents = [];
const pageErrors = [];
const badResponses = [];
const timeline = [];

function readBuildInfo() {
  const versionPath = path.resolve('public', 'version.json');
  if (!existsSync(versionPath)) return null;
  try {
    return JSON.parse(readFileSync(versionPath, 'utf8'));
  } catch (error) {
    return { error: error.message };
  }
}

function dateStamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('-');
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
  throw new Error(`No available trailer capture port found starting at ${startPort}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) {
    return { command: process.execPath, baseArgs: [viteEntry] };
  }
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', baseArgs: ['vite'] };
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canFetch(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  if (!existsSync(path.resolve('dist', 'index.html'))) {
    throw new Error('dist/index.html is missing. Run npm run build before capturing trailer footage.');
  }

  const { command, baseArgs } = viteCommand();
  const args = [...baseArgs, 'preview', '--host', host, '--port', String(port), '--strictPort'];
  const server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  if (!(await waitForServer(baseUrl))) {
    server.kill();
    throw new Error(`Preview server did not become ready at ${baseUrl}`);
  }
  return server;
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) next.searchParams.set(key, String(value));
  }
  return next.toString();
}

function observePage(page) {
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      consoleEvents.push({ type, text: message.text().slice(0, 800) });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push({ status: response.status(), url: response.url(), method: response.request().method() });
    }
  });
}

async function waitForScene(page, sceneName, timeout = 15000) {
  await page.waitForFunction((expected) => window.__game?.currentSceneName === expected, sceneName, { timeout });
}

async function addBeat(page, label, durationMs) {
  await ensureUnpaused(page);
  const state = await collectState(page);
  timeline.push({
    label,
    durationMs,
    scene: state?.scene || null,
    level: state?.level ?? null,
    wave: state?.wave?.currentWaveNumber ?? null,
    audioContext: state?.audio?.currentMusicContext || null
  });
  console.log(`[trailer] ${label} ${Math.round(durationMs / 1000)}s`);
  const stepMs = 500;
  for (let elapsed = 0; elapsed < durationMs; elapsed += stepMs) {
    await page.waitForTimeout(Math.min(stepMs, durationMs - elapsed));
    await ensureUnpaused(page);
  }
}

async function collectState(page) {
  return page.evaluate(() => {
    try {
      return typeof window.render_game_to_text === 'function'
        ? JSON.parse(window.render_game_to_text())
        : null;
    } catch {
      return null;
    }
  });
}

async function waitForGameplayBackdrop(page) {
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return Boolean(play?.gameplayBackdrop?.parent && play?.gameplayBackdrop?.texture);
  }, null, { timeout: 15000 });
}

async function stabilizePlayer(page) {
  await page.evaluate(() => {
    const assist = () => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const player = play?.player;
      if (play?.isPaused && typeof play.setPaused === 'function') play.setPaused(false);
      game?.inputManager?.setKeyPressed?.('Escape', false);
      game?.inputManager?.setKeyPressed?.('KeyP', false);
      game?.inputManager?.setKeyPressed?.('p', false);
      game?.inputManager?.setKeyPressed?.('P', false);
      if (game) game.lives = Math.max(game.lives || 0, 3);
      if (player) {
        player.invulnerable = true;
        player.invulnerableTime = 45000;
        if (typeof game?.getWidth === 'function') player.x = game.getWidth() / 2;
        if (typeof game?.getHeight === 'function') player.y = game.getHeight() * 0.82;
      }
      play?.bulletManager?.enemyBullets?.forEach((bullet) => {
        bullet.active = false;
      });
    };
    clearInterval(window.__steamTrailerAssist);
    window.__steamTrailerAssist = window.setInterval(assist, 120);
    assist();
  });
}

async function ensureUnpaused(page) {
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!play) return;
    game?.inputManager?.setKeyPressed?.('Escape', false);
    game?.inputManager?.setKeyPressed?.('KeyP', false);
    game?.inputManager?.setKeyPressed?.('p', false);
    game?.inputManager?.setKeyPressed?.('P', false);
    if (play.isPaused && typeof play.setPaused === 'function') play.setPaused(false);
  });
}

async function clearPlayToasts(page) {
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play) return;
    play.dismissActiveToastsBelowPriority?.(99);
    play.toastQueue = [];
    play.toastTopQueue = [];
    play.toastCornerQueue = [];
    play.centerToastLockUntil = 0;
    if (play.toastSlotLockUntil) {
      play.toastSlotLockUntil.center = 0;
      play.toastSlotLockUntil.top = 0;
      play.toastSlotLockUntil.corner = 0;
    }
  });
  await page.waitForTimeout(250);
}

async function stageBossTelegraph(page, phase = 3) {
  await page.evaluate((nextPhase) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const boss = play?.enemyManager?.boss;
    if (!game || !play || !player || !boss) throw new Error('Missing boss scene for trailer telegraph staging');

    player.x = game.getWidth() / 2;
    player.y = game.getHeight() * 0.8;
    player.invulnerable = true;
    player.invulnerableTime = 45000;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    boss.entryStartMs = Date.now() - (boss.entryDurationMs || 1) - 1;
    boss.phase = nextPhase;
    boss.applyPhasePlan?.(nextPhase);
    boss.clearTelegraphVisual?.();
    boss.clearRegularAttackTelegraphVisual?.();
    const signature = boss.getSignatureForPhase?.(nextPhase) || boss.profile?.signature || 'ring';
    boss.startSignatureTelegraph?.(signature, player.x, player.y);
    boss.updateTelegraphVisual?.(0.62, player.x, player.y);
    if (boss.sprite) {
      boss.sprite.x = boss.x;
      boss.sprite.y = boss.y;
    }
  }, phase);
  await clearPlayToasts(page);
}

async function showMenuAndShipSelect(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'menu', 30000);
  await addBeat(page, 'main_menu_quick_play', 2000);
  await page.evaluate(() => window.__game?.showShipSelect?.());
  await waitForScene(page, 'shipSelect', 15000);
  await addBeat(page, 'ship_select_variants', 3000);
}

async function showGameplay(page) {
  await page.goto(withQuery(baseUrl, { autostart: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'play', 30000);
  await waitForGameplayBackdrop(page);
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.enemies?.length > 0, null, { timeout: 30000 });
  await stabilizePlayer(page);
  await page.keyboard.down('Space');
  await page.keyboard.down('ArrowRight');
  await addBeat(page, 'first_wave_lasers', 3200);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await stageGrazeBreakPayoff(page);
  await addBeat(page, 'close_dodge_score_tease', 1700);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('Space');
}

async function stageGrazeBreakPayoff(page) {
  await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player || !play.bulletManager) throw new Error('Missing play scene for trailer Graze Break');

    player.x = game.getWidth() / 2;
    player.y = game.getHeight() * 0.78;
    player.invulnerable = true;
    player.invulnerableTime = 12000;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    const impactX = player.x;
    const impactY = player.y - 170;
    if (play.bulletManager) {
      play.bulletManager.playerBullets.forEach((bullet) => {
        bullet.active = false;
        if (bullet.sprite?.parent) bullet.sprite.parent.removeChild(bullet.sprite);
      });
      play.bulletManager.enemyBullets.forEach((bullet) => {
        bullet.active = false;
        if (bullet.sprite?.parent) bullet.sprite.parent.removeChild(bullet.sprite);
      });
      play.bulletManager.playerBullets = [];
      play.bulletManager.enemyBullets = [];
    }

    play.dangerDodgeCount = 0;
    play.grazeBreakReady = false;
    play.grazeBreakCooldownAt = 0;
    const fakeBullet = { x: player.x + player.radius + 9, y: player.y, radius: 5, active: true };
    for (let i = 0; i < 3; i += 1) {
      play.nearMissCooldownAt = 0;
      play.applyNearMiss(fakeBullet);
      await new Promise((resolve) => setTimeout(resolve, 70));
    }
    play.grazeBreakReady = true;
    play.grazeBreakExpiresAt = Date.now() + 5000;

    player.shootCooldown = 0;
    const playerBullets = player.shoot();
    const charged = play.markGrazeBreakShot(playerBullets);
    for (const bullet of playerBullets) play.bulletManager.addPlayerBullet(bullet);
    if (charged) {
      charged.x = impactX;
      charged.y = impactY;
      charged.vx = 0;
      charged.vy = -0.2;
      if (charged.sprite) {
        charged.sprite.x = charged.x;
        charged.sprite.y = charged.y;
      }
    }
    for (let i = 0; i < 5; i += 1) {
      play.bulletManager.enemyBullets.push({
        x: impactX + (i - 2) * 34,
        y: impactY + (i % 2) * 18,
        vx: 0,
        vy: 0.2,
        radius: 6,
        active: true
      });
    }
    const targetBullet = play.bulletManager.enemyBullets.find((bullet) => bullet?.active !== false);
    if (!charged) throw new Error('Trailer Graze Break staging could not mark a charged shot');
    if (!targetBullet) throw new Error('Trailer Graze Break staging has no enemy bullet target');
    const result = play.triggerGrazeBreak(charged, targetBullet);
    if (!result?.triggered) {
      throw new Error(`Trailer Graze Break staging did not trigger: charged=${Boolean(charged?.active)} target=${Boolean(targetBullet?.active)} ready=${Boolean(play.grazeBreakReady)}`);
    }
    play.bulletManager.enemyBullets = play.bulletManager.enemyBullets
      .filter((bullet) => typeof bullet?.update === 'function');
  });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scoring?.lastGrazeBreak?.triggered === true;
  }, null, { timeout: 5000 });
}

async function stageTractorHijackSetup(page) {
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const enemyManager = play?.enemyManager;
    if (!game || !play || !player || !enemyManager) throw new Error('Missing play scene for trailer tractor hijack');

    enemyManager.enemies.forEach((enemy) => {
      if (enemy.kind !== 'boss') {
        enemy.active = false;
        enemy.destroy?.();
        if (enemy.sprite?.parent) enemy.sprite.parent.removeChild(enemy.sprite);
      }
    });
    enemyManager.enemies = enemyManager.enemies.filter((enemy) => enemy.kind === 'boss' && enemy.active !== false);
    play.bulletManager?.enemyBullets?.forEach((bullet) => {
      bullet.active = false;
      if (bullet.sprite?.parent) bullet.sprite.parent.removeChild(bullet.sprite);
    });
    if (play.bulletManager) play.bulletManager.enemyBullets = [];
    play.tractorHijack = null;
    play.lastTractorHijack = null;

    enemyManager.spawnWave({
      count: 4,
      formation: 'TUTORIAL_ARC',
      type: 'chaser',
      entry: 'single',
      cadence: 10
    });

    const width = game.getWidth();
    const height = game.getHeight();
    const sourceX = Math.round(width * 0.52);
    const sourceY = 132;
    const playerY = Math.round(height * 0.79);

    enemyManager.enemies
      .filter((enemy) => enemy.kind !== 'boss')
      .slice(0, 4)
      .forEach((enemy, index) => {
        const t = 0.28 + index * 0.13;
        enemy.waitingForEntry = false;
        enemy.active = true;
        enemy.state = 'FORMATION';
        enemy.health = 1;
        enemy.maxHealth = 1;
        enemy.radius = 22;
        enemy.speed = 0;
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.x = sourceX + (index - 1.5) * 22;
        enemy.y = sourceY + (playerY - sourceY) * t;
        enemy.update = () => {};
        if (enemy.sprite) {
          enemy.sprite.x = enemy.x;
          enemy.sprite.y = enemy.y;
          enemy.sprite.visible = true;
          enemy.sprite.renderable = true;
        }
        enemy.updateHealthBar?.();
      });

    enemyManager.spawnHijacker();
    const hijacker = enemyManager.hijacker;
    if (!hijacker) throw new Error('Hijacker failed to spawn for trailer tractor hijack');
    hijacker.x = sourceX;
    hijacker.y = sourceY;
    hijacker.baseY = sourceY;
    hijacker.health = 30;
    hijacker.maxHealth = 30;
    hijacker.beamActiveMs = 3200;
    hijacker.beamWarningMs = 120;
    hijacker.sprite.x = hijacker.x;
    hijacker.sprite.y = hijacker.y;
    hijacker.updateHealthBar?.();

    player.x = sourceX;
    player.y = playerY;
    player.invulnerable = true;
    player.invulnerableTime = 45000;

    for (let i = 0; i < 3; i += 1) {
      const bullet = hijacker.shoot(player.x, player.y);
      bullet.x = sourceX + (i - 1) * 28;
      bullet.y = sourceY + 210 + i * 74;
      if (bullet.sprite) {
        bullet.sprite.x = bullet.x;
        bullet.sprite.y = bullet.y;
      }
      play.bulletManager?.addEnemyBullet?.(bullet);
    }

    hijacker.activateBeam(player.x, player.y);
    hijacker.updateTractorBeam(1, player.x, player.y);
  });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.hijacker?.tractor?.state === 'active' && state.hijacker?.tractor?.pullActive === true;
  }, null, { timeout: 5000 });
}

async function showHijackerOpening(page) {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    controlSmoke: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: '2'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'play', 30000);
  await waitForGameplayBackdrop(page);
  await page.waitForFunction(() => window.__game?.scenes?.play?.player?.active, null, { timeout: 30000 });
  await stabilizePlayer(page);
  await stageTractorHijackSetup(page);
  await addBeat(page, 'hijacker_tractor_setup', 800);
  await page.evaluate(() => {
    const hijacker = window.__game?.scenes?.play?.enemyManager?.hijacker;
    if (hijacker) hijacker.takeDamage(9999);
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.tractorHijack?.last?.triggered === true && !state.hijacker;
  }, null, { timeout: 4000 });
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const last = play?.lastTractorHijack;
    if (!play || !last?.triggered || typeof play.showToastNow !== 'function') return;
    play.dismissActiveToastsBelowPriority?.(99);
    play.toastQueue = [];
    const totalAward = 1700 + (last.bonusScore || 0);
    const display = play.showToastNow(`TRACTOR HIJACK +${totalAward}`, {
      fontSize: window.__game?.getWidth?.() < 620 ? 17 : 26,
      fill: '#ffe066',
      stroke: '#00111d',
      strokeThickness: 5,
      duration: 1650,
      slot: 'center',
      type: 'hijacker',
      priority: 9
    }, 'center');
    if (display) play.activeCenterToast = display;
  });
  await addBeat(page, 'tractor_hijack_payoff', 1900);
}

async function showBoss(page) {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startAtBoss: '1',
    startLevel: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'play', 30000);
  await waitForGameplayBackdrop(page);
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'BOSS_GATE', null, { timeout: 30000 });
  await addBeat(page, 'boss_inbound', 1800);
  await page.waitForFunction(() => {
    const enemyManager = window.__game?.scenes?.play?.enemyManager;
    return enemyManager?.state === 'BOSS_ACTIVE' && enemyManager?.boss?.active;
  }, null, { timeout: 30000 });
  await stabilizePlayer(page);
  await page.keyboard.down('Space');
  await addBeat(page, 'boss_pattern_fire', 5000);
  await page.keyboard.up('Space');
  await page.evaluate(() => {
    const boss = window.__game?.scenes?.play?.enemyManager?.boss;
    if (!boss) return;
    boss.invulnerableUntilMs = 0;
    boss.takeDamage((boss.health || boss.maxHealth || 1) + 9999);
  });
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'LEVEL_COMPLETE', null, { timeout: 10000 });
  await addBeat(page, 'boss_victory', 3200);
}

async function showBossVarietyBeat(page, level, label) {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startAtBoss: '1',
    startLevel: String(level)
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'play', 30000);
  await waitForGameplayBackdrop(page);
  await page.waitForFunction(() => {
    const enemyManager = window.__game?.scenes?.play?.enemyManager;
    return enemyManager?.state === 'BOSS_ACTIVE' && enemyManager?.boss?.active;
  }, null, { timeout: 30000 });
  await stabilizePlayer(page);
  await page.waitForTimeout(2200);
  await stageBossTelegraph(page, 3);
  await addBeat(page, label, 2300);
}

async function showBossVariety(page) {
  await showBossVarietyBeat(page, 5, 'boss_variety_vortex_telegraph');
  await showBossVarietyBeat(page, 9, 'boss_variety_choir_telegraph');
}

async function showGameOver(page) {
  await page.evaluate(() => {
    const game = window.__game;
    if (!game) return;
    if (game.scenes?.play) game.scenes.play.lastStandReadyAt = Date.now() + 60000;
    game.score = Math.max(game.score || 0, 5200);
    game.lives = 0;
    game.gameOver();
  });
  await waitForScene(page, 'gameOver', 10000);
  await addBeat(page, 'game_over_score_log', 4000);
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const server = await startPreviewServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--disable-gpu', '--no-sandbox']
  });
  const context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: outputDir,
      size: viewport
    }
  });
  const page = await context.newPage();
  observePage(page);

  let videoPath = null;
  try {
    await showHijackerOpening(page);
    await showBoss(page);
    await showBossVariety(page);
    await showGameplay(page);
    await showMenuAndShipSelect(page);
    await showGameOver(page);
    const video = page.video();
    await page.close();
    videoPath = await video.path();
  } finally {
    await context.close();
    await browser.close();
    if (server) server.kill();
  }

  const trailerPath = path.join(outputDir, trailerName);
  if (videoPath) copyFileSync(videoPath, trailerPath);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    outputDir,
    build: readBuildInfo(),
    viewport,
    trailer: trailerName,
    notes: [
      'Visual trailer draft captured from the production build. Playwright video capture does not include game audio.',
      'Opening sequence uses the real unranked debug route to show runtime hijacker tractor-beam pressure before boss footage.',
      'Later trailer beats use deterministic boss routes to prove midgame and late-game boss telegraph variety.',
      'Final Steam trailer still needs edited audio/music mix, title cards, and human approval.'
    ],
    timeline,
    consoleEvents,
    pageErrors,
    badResponses
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (!videoPath || consoleEvents.length || pageErrors.length || badResponses.length) {
    console.error('[trailer] capture completed with issues');
    console.error(JSON.stringify({ videoPath, consoleEvents, pageErrors, badResponses }, null, 2));
    process.exit(1);
  }

  console.log(`[trailer] wrote ${trailerPath}`);
}

main().catch((error) => {
  console.error('[trailer] failed');
  console.error(error);
  process.exit(1);
});
