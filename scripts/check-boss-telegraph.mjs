import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4320));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/boss-telegraph-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    next.searchParams.set(key, value);
  }
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
  for (let candidate = startPort; candidate < startPort + 40; candidate++) {
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
  if (existsSync(viteEntry)) {
    return { command: process.execPath, args: [viteEntry] };
  }
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
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

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
    controlSmoke: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH,
    startAtBoss: '1',
    startLevel: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const play = window.__game?.scenes?.play;
    return state?.scene === 'play' && play?.enemyManager && play?._lastStartedLevel === 1;
  }, undefined, { timeout: 30000 });

  await page.evaluate(async () => {
    const play = window.__game?.scenes?.play;
    if (!play?.enemyManager || play.enemyManager.state === 'BOSS_ACTIVE') return;
    play.clearPendingEnemyStart?.();
    play.enemyManager.forceBossStart?.(play.game?.level || 1);
    await play.enemyManager.spawnBoss?.(play.game?.level || 1);
    play.enemyManager.state = 'BOSS_ACTIVE';
    play.enemyManager.bossSpawning = false;
  });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.wave?.state === 'BOSS_ACTIVE';
  }, undefined, { timeout: 10000 });

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    const boss = play?.enemyManager?.boss;
    if (player) {
      player.x = game.getWidth() / 2;
      player.y = game.getHeight() * 0.82;
      player.invulnerable = true;
      player.invulnerableTime = 12000;
    }
    if (boss) {
      boss.shootCooldown = 0;
      boss.regularAttackReadyAt = Date.now() - 1;
      boss.regularTelegraph = null;
    }
  });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    const boss = state.visibleEnemies?.find(enemy => enemy.kind === 'boss');
    return Boolean(boss?.telegraph?.label === 'REGULAR ATTACK TELL' && boss.telegraph.remainingMs > 0);
  }, { timeout: 6000 });

  const telegraphState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  mkdirSync(outputDir, { recursive: true });
  const telegraphScreenshot = path.join(outputDir, 'boss-regular-telegraph.png');
  await page.screenshot({ path: telegraphScreenshot, fullPage: true });

  await page.waitForFunction((startCount) => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return (state.counts?.enemyBullets || 0) > startCount;
  }, telegraphState.counts?.enemyBullets || 0, { timeout: 3000 });
  const firedState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));

  const bossTelegraph = telegraphState.visibleEnemies?.find(enemy => enemy.kind === 'boss')?.telegraph || null;
  const signatureWarning = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const player = play?.player;
    if (!boss || !player) return { ok: false, reason: 'missing_boss_or_player' };
    game.app?.ticker?.stop?.();

    boss.shootCooldown = 999999;
    boss.regularAttackReadyAt = Date.now() + 60000;
    boss.regularTelegraph = null;
    boss.clearRegularAttackTelegraphVisual?.();

    player.x = game.getWidth() * 0.82;
    player.y = game.getHeight() * 0.78;
    boss.startSignatureTelegraph('cone', player.x, player.y);
    boss.telegraph.start = Date.now() - boss.telegraph.duration * 0.24;
    const startPosition = { x: boss.x, y: boss.y };
    const lockedAngle = boss.telegraph.lockedAngle;
    boss.update(16, player.x, player.y);
    const earlyState = JSON.parse(window.render_game_to_text());

    player.x = game.getWidth() * 0.12;
    player.y = game.getHeight() * 0.86;
    boss.telegraph.start = Date.now() - boss.telegraph.duration * 0.68;
    boss.update(16, player.x, player.y);
    const shiftedState = JSON.parse(window.render_game_to_text());
    const livePlayerAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
    const normalize = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

    return {
      ok: true,
      startPosition,
      warningPosition: { x: boss.x, y: boss.y },
      lockedAngle,
      livePlayerAngle,
      lockedVsLiveDelta: Math.abs(normalize(livePlayerAngle - lockedAngle)),
      bossName: boss.name,
      nameText: boss.nameText?.text || null,
      earlyState,
      shiftedState,
      layerDebug: boss.signatureWarningLayer?.__debugBossSignatureWarning || null
    };
  });

  const signatureScreenshot = path.join(outputDir, 'boss-signature-locked-warning.png');
  await page.screenshot({ path: signatureScreenshot, fullPage: true });

  const signatureRelease = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const player = play?.player;
    if (!boss || !player || !boss.telegraph) return { ok: false, reason: 'missing_signature_warning' };

    const lockedAngle = boss.telegraph.lockedAngle;
    const startIndex = play.bulletManager.enemyBullets.length;
    boss.telegraph.start = Date.now() - boss.telegraph.duration - 1;
    boss.update(16, player.x, player.y);
    const created = play.bulletManager.enemyBullets
      .slice(startIndex)
      .filter((bullet) => bullet?.sourceFireStyle === 'cone')
      .map((bullet) => ({
        angle: Math.atan2(bullet.vy, bullet.vx),
        vx: bullet.vx,
        vy: bullet.vy
      }));
    const normalize = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
    const center = created
      .map((bullet) => ({
        ...bullet,
        delta: Math.abs(normalize(bullet.angle - lockedAngle))
      }))
      .sort((a, b) => a.delta - b.delta)[0] || null;
    const state = JSON.parse(window.render_game_to_text());
    const stateBoss = state.visibleEnemies?.find((enemy) => enemy.kind === 'boss') || null;
    return {
      ok: true,
      lockedAngle,
      created,
      center,
      releaseDebug: boss.lastSignatureRelease || null,
      stateWarning: stateBoss?.bossSignatureWarning || null
    };
  });

  const warningBoss = signatureWarning.shiftedState?.visibleEnemies?.find((enemy) => enemy.kind === 'boss') || null;
  const warningDebug = warningBoss?.bossSignatureWarning || null;
  const movementDelta = Math.hypot(
    (signatureWarning.warningPosition?.x || 0) - (signatureWarning.startPosition?.x || 0),
    (signatureWarning.warningPosition?.y || 0) - (signatureWarning.startPosition?.y || 0)
  );
  const report = {
    ok: Boolean(bossTelegraph) &&
      bossTelegraph.label === 'REGULAR ATTACK TELL' &&
      (firedState.counts?.enemyBullets || 0) > (telegraphState.counts?.enemyBullets || 0) &&
      signatureWarning.ok === true &&
      movementDelta < 0.01 &&
      signatureWarning.lockedVsLiveDelta > 0.35 &&
      warningBoss?.telegraph?.movementLocked === true &&
      warningBoss?.telegraph?.lockedAngle === Number(signatureWarning.lockedAngle.toFixed(4)) &&
      warningDebug?.phase === 'warning' &&
      warningDebug?.timer?.startsAtTop === true &&
      warningDebug?.timer?.leftArcSweep > 1 &&
      warningDebug?.timer?.rightArcSweep > 1 &&
      warningDebug?.timer?.nameCountdownRemoved === true &&
      signatureWarning.nameText === signatureWarning.bossName &&
      signatureRelease.ok === true &&
      signatureRelease.created?.length === 5 &&
      signatureRelease.center?.delta < 0.001 &&
      signatureRelease.stateWarning?.phase === 'release' &&
      pageErrors.length === 0 &&
      consoleErrors.length === 0,
    baseUrl,
    bossTelegraph,
    enemyBulletsBefore: telegraphState.counts?.enemyBullets || 0,
    enemyBulletsAfter: firedState.counts?.enemyBullets || 0,
    signatureWarning: {
      movementDelta,
      lockedAngle: signatureWarning.lockedAngle,
      livePlayerAngle: signatureWarning.livePlayerAngle,
      lockedVsLiveDelta: signatureWarning.lockedVsLiveDelta,
      nameText: signatureWarning.nameText,
      state: warningDebug,
      layer: signatureWarning.layerDebug
    },
    signatureRelease,
    pageErrors,
    consoleErrors,
    screenshots: {
      regular: telegraphScreenshot,
      signature: signatureScreenshot
    }
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[boss-telegraph] PASS regular=${bossTelegraph.attack}/${bossTelegraph.type} signature=cone lockedAngle=${signatureWarning.lockedAngle.toFixed(3)} screenshots=${telegraphScreenshot},${signatureScreenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
