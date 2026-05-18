import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.STEAM_CAPTURE_HOST || '127.0.0.1';
const explicitPort = process.env.STEAM_CAPTURE_PORT ? Number(process.env.STEAM_CAPTURE_PORT) : null;
const port = process.env.STEAM_CAPTURE_URL ? null : (explicitPort || await findAvailablePort(Number(process.env.STEAM_CAPTURE_PORT_START || 4273)));
const baseUrl = process.env.STEAM_CAPTURE_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.STEAM_CAPTURE_OUTPUT_DIR || `release/steam-screenshots/draft-${dateStamp()}`);
const viewport = {
  width: Number(process.env.STEAM_CAPTURE_WIDTH || 1280),
  height: Number(process.env.STEAM_CAPTURE_HEIGHT || 720)
};

const consoleEvents = [];
const pageErrors = [];
const badResponses = [];
const shots = [];

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
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available capture preview port found starting at ${startPort}`);
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
    throw new Error('dist/index.html is missing. Run npm run build before npm run capture:steam-screenshots.');
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

function observePage(page, label) {
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      consoleEvents.push({ page: label, type, text: message.text().slice(0, 800) });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(`${label}: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push({ page: label, status: response.status(), url: response.url() });
    }
  });
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

async function waitForScene(page, sceneName, timeout = 15000) {
  await page.waitForFunction((expected) => window.__game?.currentSceneName === expected, sceneName, { timeout });
}

async function waitForGameplayBackdrop(page) {
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return Boolean(play?.gameplayBackdrop?.parent && play?.gameplayBackdrop?.texture);
  }, null, { timeout: 15000 });
}

async function waitForActiveGameplay(page, timeout = 30000) {
  await page.waitForFunction(() => {
    try {
      if (typeof window.render_game_to_text !== 'function') return false;
      const state = JSON.parse(window.render_game_to_text());
      const track = String(state?.audio?.currentMusicTrack || '').toLowerCase();
      const reservedFragments = ['brave pilots', 'skyfire', 'defeated', 'deathmatch', 'victory tune'];
      return state?.scene === 'play' &&
        state?.audio?.currentMusicContext === 'gameplay' &&
        track &&
        !reservedFragments.some((fragment) => track.includes(fragment)) &&
        state?.wave &&
        state.wave.state !== 'IDLE' &&
        state.wave.totalWaves > 0 &&
        state?.counts?.enemies > 0;
    } catch {
      return false;
    }
  }, null, { timeout });
}

async function capture(page, name, title, notes = '') {
  const file = `${name}.png`;
  const fullPath = path.join(outputDir, file);
  await page.waitForTimeout(250);
  await page.screenshot({ path: fullPath, fullPage: false });
  const state = await collectState(page);
  shots.push({
    file,
    title,
    notes,
    width: viewport.width,
    height: viewport.height,
    scene: state?.scene || windowSceneFallback(state),
    level: state?.level ?? null,
    wave: state?.wave?.currentWaveNumber ?? null,
    audioContext: state?.audio?.currentMusicContext || null
  });
  console.log(`[steam-capture] ${file} ${title}`);
}

function windowSceneFallback(state) {
  return state?.scene || 'unknown';
}

async function stabilizePlayer(page) {
  await page.evaluate(() => {
    const assist = () => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const player = play?.player;
      if (game) game.lives = Math.max(game.lives || 0, 3);
      if (player) {
        player.invulnerable = true;
        player.invulnerableTime = 45000;
        if (typeof game?.getWidth === 'function') player.x = game.getWidth() / 2;
        if (typeof game?.getHeight === 'function') player.y = game.getHeight() * 0.82;
      }
      if (play?.bulletManager?.enemyBullets) {
        play.bulletManager.enemyBullets.forEach((bullet) => {
          bullet.active = false;
        });
      }
    };
    clearInterval(window.__steamCaptureAssist);
    window.__steamCaptureAssist = window.setInterval(assist, 100);
    assist();
  });
}

async function captureIntroAndMenu(browser) {
  const page = await browser.newPage({ viewport });
  observePage(page, 'intro-menu');
  await page.goto(withQuery(baseUrl, { resetIntro: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'menu');
  await page.evaluate(() => {
    const menu = window.__game?.scenes?.menu;
    if (typeof menu?.openStoryIntro === 'function') {
      menu.openStoryIntro();
      return;
    }
    window.__game?.showIntro?.();
  });
  await waitForScene(page, 'intro');
  await page.mouse.click(viewport.width * 0.5, viewport.height * 0.55);
  await page.waitForTimeout(1400);
  await capture(page, '01-story-intro', 'Optional story intro cinematic', 'Generated intro art launched from the main menu with narrator audio after user gesture.');
  await page.keyboard.press('Escape');
  await waitForScene(page, 'menu');
  await page.waitForTimeout(1800);
  await capture(page, '02-main-menu', 'Main menu', 'Public Nova Swarm identity and menu controls.');
  await page.evaluate(() => window.__game?.showShipSelect?.());
  await waitForScene(page, 'shipSelect');
  await page.waitForTimeout(900);
  await capture(page, '03-ship-select', 'Ship select', 'Generated hangar backdrop and ship carousel.');
  await page.close();
}

async function captureGameplay(browser) {
  const page = await browser.newPage({ viewport });
  observePage(page, 'gameplay');
  await page.goto(withQuery(baseUrl, { autostart: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'play', 30000);
  await page.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 20000 });
  await stabilizePlayer(page);
  await waitForGameplayBackdrop(page);
  await waitForActiveGameplay(page);
  await page.keyboard.down('Space');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(650);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(650);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(1200);
  await page.keyboard.up('Space');
  await capture(page, '04-first-wave-gameplay', 'First wave gameplay', 'Actual level-one combat from production build.');

  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const enemyManager = play?.enemyManager;
    if (!enemyManager) return;
    enemyManager.enemies = enemyManager.enemies.filter((enemy) => {
      const isObjective = typeof enemyManager.isObjectiveEnemy === 'function'
        ? enemyManager.isObjectiveEnemy(enemy)
        : enemy?.kind !== 'bonus_drone' && enemy?.kind !== 'boss' && enemy?.active;
      if (!isObjective) return true;
      enemy.active = false;
      if (enemy.sprite?.parent) enemy.sprite.parent.removeChild(enemy.sprite);
      return false;
    });
    enemyManager.forceClearAllEnemies?.();
    if (enemyManager.state === 'WAVE_ACTIVE') {
      enemyManager.onWaveCleared?.();
    }
    if (enemyManager.currentWaveIndex < 1 || !['WAVE_BRIEFING', 'WAVE_ACTIVE'].includes(enemyManager.state)) {
      const nextWave = enemyManager.waves?.[1] || enemyManager.waves?.[0] || null;
      enemyManager.currentWaveIndex = 1;
      enemyManager.phase = 'WAVES';
      if (nextWave) {
        enemyManager.beginWaveBriefing?.(nextWave);
      } else {
        enemyManager.state = 'WAVE_BRIEFING';
        enemyManager.waveBriefingTimer = 800;
      }
      window.__game.addScore?.(500);
      play?.showWaveBonusEffect?.(500, 'WAVE CLEARED!', {
        compact: true,
        subtitle: `NEXT WAVE 2/${enemyManager.normalWavesTotal || 4}`
      });
    }
  });
  await page.waitForFunction(() => {
    const enemyManager = window.__game?.scenes?.play?.enemyManager;
    return enemyManager?.currentWaveIndex >= 1 &&
      (enemyManager.state === 'WAVE_BRIEFING' || enemyManager.state === 'WAVE_ACTIVE');
  }, null, { timeout: 20000 });
  await page.waitForTimeout(850);
  await capture(page, '05-wave-clear-briefing', 'Wave clear briefing', 'Score/reward beat between real waves.');
  await page.close();
}

async function captureMidgameAction(browser) {
  const page = await browser.newPage({ viewport });
  observePage(page, 'midgame-action');
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: '3'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'play', 30000);
  await page.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 20000 });
  await stabilizePlayer(page);
  await waitForGameplayBackdrop(page);
  await waitForActiveGameplay(page);
  await page.keyboard.down('Space');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(900);
  await page.keyboard.up('Space');
  await capture(page, '06-midgame-swarm', 'Midgame swarm escalation', 'Debug start at level three for a denser representative store screenshot.');
  await page.close();
}

async function captureBossAndGameOver(browser) {
  const page = await browser.newPage({ viewport });
  observePage(page, 'boss');
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startAtBoss: '1',
    startLevel: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(page, 'play', 30000);
  await waitForGameplayBackdrop(page);
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'BOSS_GATE', null, { timeout: 30000 });
  await capture(page, '07-boss-inbound', 'Boss inbound', 'Deterministic capture route for representative boss warning.');
  await page.waitForFunction(() => {
    const enemyManager = window.__game?.scenes?.play?.enemyManager;
    return enemyManager?.state === 'BOSS_ACTIVE' && enemyManager?.boss?.active;
  }, null, { timeout: 30000 });
  await stabilizePlayer(page);
  await page.keyboard.down('Space');
  await page.waitForTimeout(1600);
  await page.keyboard.up('Space');
  await capture(page, '08-boss-fight', 'Boss fight', 'Representative active boss pattern.');
  await page.evaluate(() => {
    const boss = window.__game?.scenes?.play?.enemyManager?.boss;
    if (!boss) return;
    boss.invulnerableUntilMs = 0;
    boss.takeDamage((boss.health || boss.maxHealth || 1) + 9999);
  });
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'LEVEL_COMPLETE', null, { timeout: 10000 });
  await page.waitForTimeout(900);
  await capture(page, '09-boss-victory', 'Boss victory', 'Victory beat after boss defeat.');
  await page.close();

  const gameOverPage = await browser.newPage({ viewport });
  observePage(gameOverPage, 'game-over');
  await gameOverPage.goto(withQuery(baseUrl, { autostart: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForScene(gameOverPage, 'play', 30000);
  await waitForGameplayBackdrop(gameOverPage);
  await gameOverPage.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 15000 });
  await gameOverPage.evaluate(() => {
    const game = window.__game;
    if (!game) return;
    if (game.scenes?.play) game.scenes.play.lastStandReadyAt = Date.now() + 60000;
    game.score = Math.max(game.score || 0, 4200);
    game.lives = 0;
    game.gameOver();
  });
  await waitForScene(gameOverPage, 'gameOver', 10000);
  await gameOverPage.waitForTimeout(900);
  await capture(gameOverPage, '10-game-over', 'Game over', 'High-score and restart surface.');
  await gameOverPage.close();
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const server = await startPreviewServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--disable-gpu', '--no-sandbox']
  });

  try {
    await captureIntroAndMenu(browser);
    await captureGameplay(browser);
    await captureMidgameAction(browser);
    await captureBossAndGameOver(browser);
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    outputDir,
    build: readBuildInfo(),
    viewport,
    notes: [
      'These are Steam screenshot candidates, not final store approval.',
      'Midgame action uses the deterministic level-three debug route to capture denser representative gameplay.',
      'Boss screenshots use the deterministic debug boss route for reliable representative capture.',
      'Final store upload still needs human curation and Steamworks review.'
    ],
    shots,
    consoleEvents,
    pageErrors,
    badResponses
  };

  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (consoleEvents.length || pageErrors.length || badResponses.length) {
    console.error('[steam-capture] capture completed with browser issues');
    console.error(JSON.stringify({ consoleEvents, pageErrors, badResponses }, null, 2));
    process.exit(1);
  }

  console.log(`[steam-capture] wrote ${shots.length} screenshots to ${outputDir}`);
}

main().catch((error) => {
  console.error('[steam-capture] failed');
  console.error(error);
  process.exit(1);
});
