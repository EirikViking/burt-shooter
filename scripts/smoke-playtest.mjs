import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.SMOKE_HOST || '127.0.0.1';
const port = Number(process.env.SMOKE_PORT || 4173);
const baseUrl = process.env.SMOKE_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.SMOKE_OUTPUT_DIR || `test-results/smoke-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
    return {
      command: process.execPath,
      baseArgs: [viteEntry]
    };
  }
  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    baseArgs: ['vite']
  };
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

async function collectGameState(page) {
  return page.evaluate(() => {
    const game = window.__game;
    const scene = game?.currentScene;
    const play = game?.scenes?.play;
    return {
      scene: scene?.constructor?.name || 'unknown',
      perf: window.__perfStats || null,
      score: game?.score ?? null,
      level: game?.level ?? null,
      lives: game?.lives ?? null,
      selectedShipSpriteKey: game?.selectedShipSpriteKey ?? play?.player?.selectedShipSpriteKey ?? null,
      enemies: play?.enemyManager?.enemies?.length ?? null,
      enemyManagerState: play?.enemyManager?.state ?? null,
      currentWaveIndex: play?.enemyManager?.currentWaveIndex ?? null,
      normalWavesTotal: play?.enemyManager?.normalWavesTotal ?? null,
      bullets: play?.bulletManager?.bullets?.length ?? null,
      enemyBullets: play?.bulletManager?.enemyBullets?.length ?? null,
      isPaused: Boolean(play?.isPaused),
      pauseOverlayVisible: Boolean(play?.pauseOverlay?.visible && play?.pauseOverlay?.parent),
      settingsOverlayVisible: Boolean(scene?.settingsOverlay?.container?.parent || play?.settingsOverlay?.container?.parent),
      easterEggActive: Boolean(play?.easterEggBeer),
      fatalOverlay: Boolean(document.getElementById('fatal-overlay')),
      textState: (() => {
        try {
          return typeof window.render_game_to_text === 'function'
            ? JSON.parse(window.render_game_to_text())
            : null;
        } catch {
          return null;
        }
      })()
    };
  });
}

async function stabilizeSmokePlayer(page) {
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (game) {
      game.lives = Math.max(game.lives || 0, 3);
    }
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
  });
}

async function runSmoke() {
  mkdirSync(outputDir, { recursive: true });
  const server = await startPreviewServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--disable-gpu', '--no-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const routineConsoleEvents = [];
  const consoleEvents = [];
  const pageErrors = [];
  const badResponses = [];

  function observePage(targetPage, label) {
    targetPage.on('console', (message) => {
      const type = message.type();
      if (type === 'error' || type === 'warning') {
        consoleEvents.push({ page: label, type, text: message.text().slice(0, 600) });
      } else if (type === 'log' || type === 'info' || type === 'debug') {
        routineConsoleEvents.push({ page: label, type, text: message.text().slice(0, 300) });
      }
    });
    targetPage.on('pageerror', (error) => pageErrors.push(`${label}: ${error.message}`));
    targetPage.on('response', (response) => {
      if (response.status() >= 400) {
        badResponses.push({ page: label, status: response.status(), url: response.url() });
      }
    });
  }

  observePage(page, 'desktop');

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.body?.dataset?.menuReady === '1', null, { timeout: 15000 });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: path.join(outputDir, '01-menu.png'), fullPage: true });
    const menuState = await collectGameState(page);
    await page.mouse.click(683, 495);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, '01-settings.png'), fullPage: true });
    const settingsState = await collectGameState(page);

    await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
    await page.waitForTimeout(3200);
    await page.keyboard.down('Space');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(450);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(450);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('Space');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outputDir, '02-gameplay.png'), fullPage: true });
    const gameplayState = await collectGameState(page);

    await page.keyboard.press('p');
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(outputDir, '03-pause.png'), fullPage: true });
    const pauseState = await collectGameState(page);

    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    observePage(mobilePage, 'mobile');
    await mobilePage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobilePage.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
    await stabilizeSmokePlayer(mobilePage);
    await mobilePage.waitForTimeout(1800);
    await mobilePage.screenshot({ path: path.join(outputDir, '04-mobile-intro.png'), fullPage: true });
    await mobilePage.waitForFunction(() => {
      try {
        if (typeof window.render_game_to_text !== 'function') return false;
        const state = JSON.parse(window.render_game_to_text());
        return state?.scene === 'play' && state?.counts?.enemies > 0;
      } catch {
        return false;
      }
    }, null, { timeout: 8000 });
    await stabilizeSmokePlayer(mobilePage);
    await mobilePage.waitForTimeout(700);
    await mobilePage.screenshot({ path: path.join(outputDir, '05-mobile-gameplay.png'), fullPage: true });
    const mobileGameplayState = await collectGameState(mobilePage);
    await mobilePage.close();

    const level3Page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    observePage(level3Page, 'level3');
    await level3Page.goto(`${baseUrl}/?autostart=1&debugBossToken=KURT_DEBUG_2026&startLevel=3`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await level3Page.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
    await level3Page.waitForFunction(() => {
      try {
        if (typeof window.render_game_to_text !== 'function') return false;
        const state = JSON.parse(window.render_game_to_text());
        return state?.level === 3 && state?.counts?.enemies > 0;
      } catch {
        return false;
      }
    }, null, { timeout: 8000 });
    await level3Page.waitForTimeout(1500);
    await level3Page.screenshot({ path: path.join(outputDir, '06-level3-gameplay.png'), fullPage: true });
    const level3State = await collectGameState(level3Page);
    await level3Page.close();

    const transitionPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    observePage(transitionPage, 'wave-transition');
    await transitionPage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await transitionPage.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
    await transitionPage.waitForFunction(() => {
      try {
        if (typeof window.render_game_to_text !== 'function') return false;
        const state = JSON.parse(window.render_game_to_text());
        return state?.counts?.enemies > 0;
      } catch {
        return false;
      }
    }, null, { timeout: 8000 });
    await transitionPage.evaluate(() => {
      const play = window.__game?.scenes?.play;
      if (play?.particleManager) {
        play.particleManager.maxParticles = Math.max(play.particleManager.maxParticles || 0, 1200);
      }
      const enemyManager = play?.enemyManager;
      if (!enemyManager) return;
      enemyManager.enemies = enemyManager.enemies.filter((enemy) => {
        const isObjective = typeof enemyManager.isObjectiveEnemy === 'function'
          ? enemyManager.isObjectiveEnemy(enemy)
          : enemy?.kind !== 'beer_can' && enemy?.kind !== 'boss' && enemy?.active;
        if (!isObjective) return true;
        enemy.active = false;
        if (enemy.sprite?.parent) enemy.sprite.parent.removeChild(enemy.sprite);
        return false;
      });
    });
    await transitionPage.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'WAVE_BRIEFING', null, { timeout: 7000 });
    await transitionPage.screenshot({ path: path.join(outputDir, '07-wave-briefing.png'), fullPage: true });
    await transitionPage.waitForFunction(() => {
      const play = window.__game?.scenes?.play;
      const enemyManager = play?.enemyManager;
      if (!enemyManager || enemyManager.state !== 'WAVE_ACTIVE' || enemyManager.currentWaveIndex < 1) return false;
      try {
        if (typeof window.render_game_to_text !== 'function') return false;
        const state = JSON.parse(window.render_game_to_text());
        return state?.counts?.enemies > 0;
      } catch {
        return false;
      }
    }, null, { timeout: 7000 });
    const waveTransitionState = await collectGameState(transitionPage);
    await transitionPage.close();

    const bossPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    observePage(bossPage, 'boss-victory');
    await bossPage.goto(`${baseUrl}/?autostart=1&debugBossToken=KURT_DEBUG_2026&startAtBoss=1&startLevel=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await bossPage.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'BOSS_GATE', null, { timeout: 30000 });
    await bossPage.screenshot({ path: path.join(outputDir, '08-boss-gate.png'), fullPage: true });
    await bossPage.waitForFunction(() => {
      const enemyManager = window.__game?.scenes?.play?.enemyManager;
      return enemyManager?.state === 'BOSS_ACTIVE' && enemyManager?.boss?.active;
    }, null, { timeout: 15000 });
    await stabilizeSmokePlayer(bossPage);
    await bossPage.waitForTimeout(1800);
    await bossPage.screenshot({ path: path.join(outputDir, '09-boss-active.png'), fullPage: true });
    await bossPage.evaluate(() => {
      const boss = window.__game?.scenes?.play?.enemyManager?.boss;
      if (!boss) return;
      boss.invulnerableUntilMs = 0;
      boss.takeDamage((boss.health || boss.maxHealth || 1) + 9999);
    });
    await bossPage.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'LEVEL_COMPLETE', null, { timeout: 10000 });
    await bossPage.waitForTimeout(900);
    await bossPage.screenshot({ path: path.join(outputDir, '10-boss-defeated.png'), fullPage: true });
    await bossPage.waitForFunction(() => {
      const game = window.__game;
      const enemyManager = game?.scenes?.play?.enemyManager;
      return game?.level >= 2 && enemyManager?.state === 'WAVE_ACTIVE';
    }, null, { timeout: 12000 });
    await stabilizeSmokePlayer(bossPage);
    await bossPage.waitForTimeout(900);
    await bossPage.screenshot({ path: path.join(outputDir, '11-level-2-start.png'), fullPage: true });
    const bossVictoryState = await collectGameState(bossPage);
    await bossPage.close();

    const report = {
      baseUrl,
      outputDir,
      menuState,
      settingsState,
      gameplayState,
      pauseState,
      mobileGameplayState,
      level3State,
      waveTransitionState,
      bossVictoryState,
      routineConsoleEvents,
      consoleEvents,
      pageErrors,
      badResponses
    };
    writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

    const blockingIssues = [
      ...pageErrors.map((message) => `pageerror: ${message}`),
      ...badResponses.map((response) => `HTTP ${response.status}: ${response.url}`),
      ...(routineConsoleEvents.length ? [`production routine console output was not quiet (${routineConsoleEvents.length} messages)`] : []),
      ...(!settingsState.settingsOverlayVisible ? ['menu settings overlay did not appear'] : []),
      ...(!pauseState.isPaused || !pauseState.pauseOverlayVisible ? ['pause overlay did not appear'] : []),
      ...(gameplayState.fatalOverlay ? ['fatal overlay visible'] : []),
      ...(mobileGameplayState.fatalOverlay ? ['mobile fatal overlay visible'] : []),
      ...(mobileGameplayState.textState?.scene !== 'play' ? ['mobile autostart did not reach play scene'] : []),
      ...((mobileGameplayState.textState?.counts?.enemies || 0) <= 0 ? ['mobile gameplay did not spawn enemies'] : []),
      ...(level3State.textState?.level !== 3 ? ['debug startLevel=3 did not hold level 3'] : []),
      ...((level3State.textState?.counts?.enemies || 0) <= 0 ? ['level 3 smoke did not spawn enemies'] : []),
      ...(waveTransitionState.currentWaveIndex < 1 ? ['wave transition did not advance to wave 2'] : []),
      ...(waveTransitionState.enemyManagerState !== 'WAVE_ACTIVE' ? ['wave transition did not return to active state'] : []),
      ...((waveTransitionState.score || 0) < 500 ? ['wave transition did not award first wave score'] : []),
      ...(waveTransitionState.textState?.wave?.currentWaveNumber !== 2 ? ['wave text state did not expose wave 2'] : []),
      ...((waveTransitionState.textState?.counts?.enemies || 0) <= 0 ? ['wave transition did not spawn next wave enemies'] : []),
      ...(bossVictoryState.fatalOverlay ? ['boss victory path showed fatal overlay'] : []),
      ...(bossVictoryState.level < 2 ? ['boss victory did not advance to level 2'] : []),
      ...(bossVictoryState.enemyManagerState !== 'WAVE_ACTIVE' ? ['boss victory did not return to active gameplay'] : []),
      ...(bossVictoryState.textState?.wave?.currentWaveNumber !== 1 ? ['boss victory did not restart at wave 1 of the next level'] : []),
      ...((bossVictoryState.textState?.counts?.enemies || 0) <= 0 ? ['boss victory did not spawn level 2 enemies'] : [])
    ];

    console.log(JSON.stringify(report, null, 2));
    if (blockingIssues.length) {
      throw new Error(`Smoke playtest failed: ${blockingIssues.join('; ')}`);
    }
  } finally {
    await browser.close();
    if (server) server.kill();
  }
}

runSmoke().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
