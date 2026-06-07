import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4382));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/first-boss-balance-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const probeDurationMs = Number(process.env.FIRST_BOSS_PROBE_MS || 60000);
const maxExpectedLivesLost = Number(process.env.FIRST_BOSS_MAX_LIVES_LOST || 1);

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

async function waitForBoss(page) {
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.wave?.state === 'BOSS_ACTIVE';
  }, null, { timeout: 30000 });
}

async function collectState(page) {
  return page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const textState = JSON.parse(window.render_game_to_text?.() || '{}');
    const boss = textState.visibleEnemies?.find(enemy => enemy.kind === 'boss') || null;
    return {
      scene: textState.scene || game?.currentSceneName || null,
      score: Number(game?.score) || 0,
      level: Number(game?.level) || 0,
      lives: Number(game?.lives) || 0,
      waveState: textState.wave?.state || play?.enemyManager?.state || null,
      counts: textState.counts || null,
      player: textState.player || {
        x: Math.round(play?.player?.x || 0),
        y: Math.round(play?.player?.y || 0),
        invulnerable: Boolean(play?.player?.invulnerable),
        isDodging: Boolean(play?.player?.isDodging),
        shieldActive: Boolean(play?.player?.shieldActive),
        dodgeCooldown: Number(play?.player?.dodgeCooldown) || 0
      },
      enemies: textState.visibleEnemies || [],
      enemyBullets: textState.enemyWeapons?.visibleBullets || [],
      boss,
      bossHazards: textState.bossHazards || null,
      balanceDebug: play?.balanceDebug || null,
      dossierCount: (play?.uiOverlay?.children || []).filter(child => child?.label === 'ui_boss_dossier').length
    };
  });
}

async function recoverScriptedPilot(page) {
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !player) return;
    const x = game.getWidth() / 2;
    const y = game.getHeight() * 0.82;
    player.x = x;
    player.y = y;
    if (player.sprite) {
      player.sprite.x = x;
      player.sprite.y = y;
    }
  });
}

function scoreCandidate(state, x, y, width, height) {
  let score = -Math.abs(x - (state.boss?.x ?? width / 2)) * 0.42;
  for (const bullet of state.enemyBullets || []) {
    const dx = Math.abs((Number(bullet.x) || 0) - x);
    const dy = Math.abs((Number(bullet.y) || 0) - y);
    if (dy > 340) continue;
    if (dx < 56 && dy < 170) score -= 1200;
    else if (dx < 90 && dy < 235) score -= 420;
    score -= Math.max(0, 96 - dx) * 2.8;
  }
  for (const hazard of state.bossHazards?.active || []) {
    if (!hazard || hazard.hit) continue;
    score -= hazard.category === 'signature' ? 42 : 24;
  }
  const centerBias = Math.abs(x - width / 2) * 0.04;
  const lowLaneBias = Math.abs(y - height * 0.78) * 0.08;
  return score - centerBias - lowLaneBias;
}

function chooseIntent(state, width, height) {
  const playerX = Number(state.player?.x) || width / 2;
  const playerY = Number(state.player?.y) || height * 0.8;
  const targetX = Number(state.boss?.x) || width / 2;
  const xs = [
    playerX,
    targetX - 170,
    targetX - 90,
    targetX,
    targetX + 90,
    targetX + 170,
    width * 0.25,
    width * 0.5,
    width * 0.75
  ].map((x) => Math.max(width * 0.14, Math.min(width * 0.86, x)));
  const ys = [height * 0.62, height * 0.7, height * 0.78, height * 0.84];
  let best = { x: playerX, y: playerY, score: Number.NEGATIVE_INFINITY };
  for (const x of xs) {
    for (const y of ys) {
      const score = scoreCandidate(state, x, y, width, height);
      if (score > best.score) best = { x, y, score };
    }
  }

  const urgentBullet = (state.enemyBullets || []).some((bullet) => {
    const dx = Math.abs((Number(bullet.x) || 0) - playerX);
    const dy = Math.abs((Number(bullet.y) || 0) - playerY);
    return dx < 78 && dy < 210;
  });

  return {
    horizontal: best.x < playerX - 24 ? 'left' : best.x > playerX + 24 ? 'right' : 'none',
    vertical: best.y < playerY - 22 ? 'up' : best.y > playerY + 22 ? 'down' : 'none',
    dodge: Boolean(urgentBullet && !(state.player?.invulnerable) && !(state.player?.shieldActive))
  };
}

async function applyIntent(page, current, next) {
  if (current.horizontal !== next.horizontal) {
    if (current.horizontal === 'left') await page.keyboard.up('ArrowLeft');
    if (current.horizontal === 'right') await page.keyboard.up('ArrowRight');
    if (next.horizontal === 'left') await page.keyboard.down('ArrowLeft');
    if (next.horizontal === 'right') await page.keyboard.down('ArrowRight');
  }
  if (current.vertical !== next.vertical) {
    if (current.vertical === 'up') await page.keyboard.up('ArrowUp');
    if (current.vertical === 'down') await page.keyboard.up('ArrowDown');
    if (next.vertical === 'up') await page.keyboard.down('ArrowUp');
    if (next.vertical === 'down') await page.keyboard.down('ArrowDown');
  }
  if (current.dodge !== next.dodge) {
    if (current.dodge) await page.keyboard.up('ShiftLeft');
    if (next.dodge) await page.keyboard.down('ShiftLeft');
  }
  return next;
}

async function runOverlayGuard(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startAtBoss: '1',
    startLevel: '1',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForBoss(page);
  const result = await page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const boss = play?.enemyManager?.boss;
    const player = play?.player;
    if (!play || !boss || !player) throw new Error('Missing first boss overlay surface');
    const countDossiers = () => (play.uiOverlay?.children || []).filter(child => child?.label === 'ui_boss_dossier').length;
    const countBossToasts = () => (play.toastQueue || []).filter(entry => entry?.options?.type === 'boss').length;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    boss.invulnerableUntilMs = 0;
    boss.phase = 1;
    boss.tauntPhase2Shown = false;
    boss.tauntHalfShown = false;
    boss.health = boss.maxHealth * 0.74;
    boss.update(1, player.x, player.y);
    await wait(80);
    const afterPhase = { dossiers: countDossiers(), bossToasts: countBossToasts() };

    boss.health = boss.maxHealth * 0.49;
    boss.update(1, player.x, player.y);
    await wait(80);
    const afterHalf = { dossiers: countDossiers(), bossToasts: countBossToasts() };

    play.showBossTaunt('boss_life_lost');
    await wait(80);
    const afterLifeLost = { dossiers: countDossiers(), bossToasts: countBossToasts() };

    return { afterPhase, afterHalf, afterLifeLost };
  });
  const screenshot = path.join(outputDir, 'first-boss-overlay-guard.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await page.close();
  return {
    ...result,
    screenshot,
    ok: result.afterPhase.dossiers === 0 &&
      result.afterHalf.dossiers === 0 &&
      result.afterLifeLost.dossiers === 0 &&
      result.afterLifeLost.bossToasts >= result.afterPhase.bossToasts
  };
}

async function runCombatProbe(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startAtBoss: '1',
    startLevel: '1',
    balanceDebug: '1',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForBoss(page);
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const player = play?.player;
    if (player) {
      player.x = window.__game.getWidth() / 2;
      player.y = window.__game.getHeight() * 0.8;
    }
  });

  let state = await collectState(page);
  const livesAtBossStart = state.lives;
  const bossAtStart = state.boss;
  const start = Date.now();
  let heldSpace = false;
  let intent = { horizontal: 'none', vertical: 'none', dodge: false };
  const lifeEvents = [];
  let lastLives = livesAtBossStart;

  try {
    await page.keyboard.down('Space');
    heldSpace = true;
    while (Date.now() - start < probeDurationMs) {
      state = await collectState(page);
      if (state.lives !== lastLives) {
        lifeEvents.push({
          tSec: Number(((Date.now() - start) / 1000).toFixed(1)),
          lives: state.lives,
          lastDamageSource: state.balanceDebug?.lastDamageSource || null,
          lastBossHazardHit: state.bossHazards?.lastHit || null
        });
        await recoverScriptedPilot(page);
        lastLives = state.lives;
      }
      if (state.scene !== 'play' || state.lives <= 0 || state.waveState === 'LEVEL_COMPLETE' || !state.boss) break;
      intent = await applyIntent(page, intent, chooseIntent(state, 1366, 768));
      await page.waitForTimeout(120);
    }
  } finally {
    if (heldSpace) await page.keyboard.up('Space').catch(() => {});
    if (intent.horizontal === 'left') await page.keyboard.up('ArrowLeft').catch(() => {});
    if (intent.horizontal === 'right') await page.keyboard.up('ArrowRight').catch(() => {});
    if (intent.vertical === 'up') await page.keyboard.up('ArrowUp').catch(() => {});
    if (intent.vertical === 'down') await page.keyboard.up('ArrowDown').catch(() => {});
    if (intent.dodge) await page.keyboard.up('ShiftLeft').catch(() => {});
  }

  const combatElapsedMs = Date.now() - start;
  const finalState = await collectState(page);
  const screenshot = path.join(outputDir, 'first-boss-combat-final.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await page.close();
  const livesAfterBoss = finalState.lives;
  const livesLost = Math.max(0, livesAtBossStart - livesAfterBoss);
  const bossDefeated = finalState.waveState === 'LEVEL_COMPLETE' || !finalState.boss;
  const bossHpDamage = Math.max(0, (Number(bossAtStart?.maxHealth) || 0) - (Number(finalState.boss?.health) || 0));
  const meaningfulProgress = bossDefeated ||
    bossHpDamage >= Math.max(16, (Number(bossAtStart?.maxHealth) || 44) * 0.35);

  return {
    screenshot,
    livesAtBossStart,
    livesAfterBoss,
    livesLost,
    bossHpDamage,
    bossDefeated,
    survived: finalState.lives > 0,
    bossDurationSec: Number((combatElapsedMs / 1000).toFixed(1)),
    bossAtStart,
    finalBoss: finalState.boss,
    damageSources: finalState.balanceDebug?.damageTakenBySource || {},
    lifeEvents,
    finalState: {
      scene: finalState.scene,
      level: finalState.level,
      waveState: finalState.waveState,
      lives: finalState.lives,
      score: finalState.score,
      counts: finalState.counts
    },
    ok: finalState.lives > 0 && livesLost <= maxExpectedLivesLost && meaningfulProgress
  };
}

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu', '--no-sandbox']
});

try {
  mkdirSync(outputDir, { recursive: true });
  const overlayGuard = await runOverlayGuard(browser);
  const combatProbe = await runCombatProbe(browser);
  const report = {
    ok: overlayGuard.ok && combatProbe.ok,
    baseUrl,
    outputDir,
    maxExpectedLivesLost,
    overlayGuard,
    combatProbe
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[first-boss-balance] PASS lives ${combatProbe.livesAtBossStart}->${combatProbe.livesAfterBoss} duration=${combatProbe.bossDurationSec}s damage=${JSON.stringify(combatProbe.damageSources)} report=${path.join(outputDir, 'report.json')}`);
  }
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
