import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.SMOKE_HOST || '127.0.0.1';
const explicitPort = process.env.SMOKE_PORT ? Number(process.env.SMOKE_PORT) : null;
const port = process.env.SMOKE_URL ? null : (explicitPort || await findAvailablePort(Number(process.env.SMOKE_PORT_START || 4173)));
const baseUrl = process.env.SMOKE_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.SMOKE_OUTPUT_DIR || `test-results/smoke-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    next.searchParams.set(key, value);
  }
  return next.toString();
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
  for (let candidate = startPort; candidate < startPort + 40; candidate++) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available smoke preview port found starting at ${startPort}`);
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
    const sceneName = game?.currentSceneName || (scene === game?.scenes?.play
      ? 'play'
      : scene === game?.scenes?.menu
        ? 'menu'
        : scene === game?.scenes?.gameOver
          ? 'gameOver'
          : scene === game?.scenes?.highscore
            ? 'highscore'
            : scene === game?.scenes?.shipSelect
              ? 'shipSelect'
              : 'unknown');
    const play = game?.scenes?.play;
    return {
      scene: sceneName,
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
      creditsOverlayVisible: Boolean(scene?.settingsOverlay?.creditsPanel?.parent || play?.settingsOverlay?.creditsPanel?.parent),
      storyTransmission: (() => {
        const toasts = (() => {
          try {
            return JSON.parse(window.render_game_to_text?.() || '{}')?.toast?.active || [];
          } catch {
            return [];
          }
        })();
        return toasts.find((toast) => toast?.type === 'lore') || null;
      })(),
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
    const assist = () => {
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
    };
    if (!window.__burtSmokePlayerAssist) {
      window.__burtSmokePlayerAssist = window.setInterval(assist, 100);
    }
    assist();
  });
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

function musicTrackName(state) {
  return state?.textState?.audio?.currentMusicTrack || '';
}

function musicContext(state) {
  return state?.textState?.audio?.currentMusicContext || '';
}

function trackIncludes(state, fragment) {
  return musicTrackName(state).toLowerCase().includes(fragment.toLowerCase());
}

function trackHasAny(state, fragments) {
  const track = musicTrackName(state).toLowerCase();
  return fragments.some((fragment) => track.includes(fragment.toLowerCase()));
}

function isGameplayMusic(state) {
  const track = musicTrackName(state).toLowerCase();
  if (!track) return false;
  const reservedFragments = ['brave pilots', 'skyfire', 'defeated', 'deathmatch', 'victory tune', 'nova_swarm_menu', 'nova_swarm_boss', 'nova_swarm_victory', 'nova_swarm_gameover'];
  return musicContext(state) === 'gameplay' && !reservedFragments.some((fragment) => track.includes(fragment));
}

function isGameOverMusic(state) {
  return musicContext(state) === 'gameover' && trackHasAny(state, ['Defeated', 'nova_swarm_gameover']);
}

function isBossMusic(state) {
  return musicContext(state) === 'boss' && trackHasAny(state, ['DeathMatch', 'nova_swarm_boss']);
}

function isVictoryMusic(state) {
  return musicContext(state) === 'victory' && trackHasAny(state, ['Victory Tune', 'nova_swarm_victory']);
}

function visibleEnemyHealthIssues(state, label) {
  const enemies = state?.textState?.visibleEnemies || [];
  return enemies.flatMap((enemy, index) => {
    const health = Number(enemy?.health);
    const maxHealth = Number(enemy?.maxHealth);
    if (!Number.isFinite(health) || !Number.isFinite(maxHealth)) {
      return [`${label} enemy ${index} reported invalid health values`];
    }
    if (maxHealth <= 0) {
      return [`${label} enemy ${index} reported non-positive max health (${maxHealth})`];
    }
    if (health > maxHealth) {
      return [`${label} enemy ${index} health exceeded max health (${health}/${maxHealth})`];
    }
    return [];
  });
}

function activeToastCount(state) {
  return state?.textState?.toast?.active?.length || 0;
}

function describeActiveToasts(state) {
  const toasts = state?.textState?.toast?.active || [];
  return toasts
    .map((toast) => `${toast.slot || 'unknown'}:${toast.type || 'generic'}:${toast.message || ''}`.slice(0, 120))
    .join(' | ');
}

function summarizeState(state) {
  return {
    scene: state?.textState?.scene || state?.scene || null,
    music: `${musicContext(state) || 'none'} / ${musicTrackName(state) || 'none'}`,
    level: state?.textState?.level ?? state?.level ?? null,
    lives: state?.textState?.lives ?? state?.lives ?? null,
    enemies: state?.textState?.counts?.enemies ?? null
  };
}

function summarizeSmokeReport(report, blockingIssues) {
  return {
    status: blockingIssues.length ? 'failed' : 'passed',
    baseUrl: report.baseUrl,
    outputDir: report.outputDir,
    screenshots: [
      '01-menu.png',
      '01-settings.png',
      '01-credits.png',
      '02-gameplay.png',
      '02-powerup-hud.png',
      '03-gamepad-pause.png',
      '06-game-over.png',
      '08-mobile-intro.png',
      '10-level3-gameplay.png',
      '14-boss-defeated.png',
      '15-level-2-start.png'
    ],
    scenes: {
      menu: summarizeState(report.menuState),
      gameplay: summarizeState(report.gameplayState),
      gameOver: summarizeState(report.gameOverState),
      mobile: summarizeState(report.mobileGameplayState),
      level3: summarizeState(report.level3State),
      boss: summarizeState(report.bossActiveState),
      postBoss: summarizeState(report.bossVictoryState)
    },
    settings: {
      overlayVisible: Boolean(report.settingsState?.settingsOverlayVisible),
      creditsVisible: Boolean(report.creditsState?.creditsOverlayVisible),
      sfxAudition: report.settingsSfxState?.textState?.audio?.lastSfxEvent || report.settingsState?.textState?.audio?.lastSfxEvent || null,
      voiceAudition: report.settingsState?.textState?.audio?.lastVoiceEvent || null,
      accessibility: report.settingsState?.textState?.accessibility || null
    },
    coverage: {
      gamepadConnected: Boolean(report.gamepadMoveState?.textState?.input?.gamepad?.connected),
      powerupHud: report.powerupHudState?.label || null,
      storyTransmission: report.storyTransmissionState?.storyTransmission?.imageAlias || null,
      waveTransition: report.waveTransitionState?.textState?.wave?.currentWaveNumber || null,
      bossDefeatMusic: `${musicContext(report.bossDefeatedState) || 'none'} / ${musicTrackName(report.bossDefeatedState) || 'none'}`
    },
    failures: blockingIssues,
    console: {
      routineMessages: report.routineConsoleEvents.length,
      warningsOrErrors: report.consoleEvents.length,
      pageErrors: report.pageErrors.length,
      badResponses: report.badResponses.length
    },
    fullReport: path.join(report.outputDir, 'report.json')
  };
}

function logStep(message) {
  if (process.env.SMOKE_QUIET_PROGRESS === '1') return;
  console.log(`[smoke] ${message}`);
}

async function runSmoke() {
  mkdirSync(outputDir, { recursive: true });
  logStep(`starting ${baseUrl}`);
  const server = await startPreviewServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--disable-gpu', '--no-sandbox']
  });
  logStep('browser launched');

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
    await page.waitForFunction(() => window.__game?.currentSceneName === 'intro' || window.__game?.currentSceneName === 'menu', null, { timeout: 15000 });
    const bootScene = await page.evaluate(() => window.__game?.currentSceneName || 'unknown');
    if (bootScene === 'intro') {
      await page.screenshot({ path: path.join(outputDir, '00-intro-ready.png'), fullPage: true });
      await page.mouse.click(420, 320);
      await page.waitForTimeout(1300);
      await page.screenshot({ path: path.join(outputDir, '00-intro-narrated.png'), fullPage: true });
      const introState = await collectGameState(page);
      if (introState?.scene !== 'intro') {
        throw new Error(`intro scene did not report stable scene name: ${introState?.scene || 'missing'}`);
      }
      const introAudio = introState?.textState?.audio || null;
      if (introAudio?.currentMusicContext !== 'intro') {
        throw new Error(`intro music context did not start: ${introAudio?.currentMusicContext || 'missing'}`);
      }
      if (introAudio?.lastVoiceEvent !== 'intro_narrator_01') {
        throw new Error(`intro narrator did not update telemetry: ${introAudio?.lastVoiceEvent || 'missing'}`);
      }
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 8000 });
      logStep('intro captured and skipped');
    }
    await page.waitForFunction(() => document.body?.dataset?.menuReady === '1', null, { timeout: 15000 });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: path.join(outputDir, '01-menu.png'), fullPage: true });
    const menuState = await collectGameState(page);
    logStep('menu captured');
    await page.evaluate(() => {
      const menu = window.__game?.scenes?.menu;
      if (menu?.openSettingsOverlay) {
        menu.openSettingsOverlay();
      }
    });
    await page.waitForFunction(() => {
      const menu = window.__game?.scenes?.menu;
      return Boolean(menu?.settingsOverlay?.container?.parent);
    }, null, { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, '01-settings.png'), fullPage: true });
    let settingsSfxState = null;
    const audioTestButtonState = await page.evaluate(() => {
      const overlay = window.__game?.scenes?.menu?.settingsOverlay;
      const toPoint = (button) => {
        if (!button) return null;
        const point = button.getGlobalPosition?.();
        const canvas = document.querySelector('canvas');
        const rect = canvas?.getBoundingClientRect?.();
        const screen = window.__game?.app?.screen;
        if (!point || !rect || !screen?.width || !screen?.height) return point ? { x: point.x, y: point.y } : null;
        return {
          x: rect.left + (point.x / screen.width) * rect.width,
          y: rect.top + (point.y / screen.height) * rect.height,
          gameX: point.x,
          gameY: point.y
        };
      };
      return {
        sfx: toPoint(overlay?.audioTestButtons?.sfx),
        voice: toPoint(overlay?.audioTestButtons?.voice)
      };
    });
    if (audioTestButtonState?.sfx) {
      await page.mouse.click(audioTestButtonState.sfx.x, audioTestButtonState.sfx.y);
      await page.waitForFunction(() => {
        try {
          return ['achievement', 'shoot_small'].includes(JSON.parse(window.render_game_to_text?.() || '{}')?.audio?.lastSfxEvent);
        } catch {
          return false;
        }
      }, null, { timeout: 2500 });
      settingsSfxState = await collectGameState(page);
    }
    if (audioTestButtonState?.voice) {
      await page.mouse.click(audioTestButtonState.voice.x, audioTestButtonState.voice.y);
      await page.waitForFunction(() => {
        try {
          return JSON.parse(window.render_game_to_text?.() || '{}')?.audio?.lastVoiceEvent === 'mission_control_launch';
        } catch {
          return false;
        }
      }, null, { timeout: 3500 });
    }
    const settingsState = await collectGameState(page);
    logStep('settings and audio audition captured');
    await page.evaluate(() => {
      const menu = window.__game?.scenes?.menu;
      if (menu?.settingsOverlay?.openCreditsPanel) {
        menu.settingsOverlay.openCreditsPanel();
      }
    });
    await page.waitForFunction(() => {
      const menu = window.__game?.scenes?.menu;
      return Boolean(menu?.settingsOverlay?.creditsPanel?.parent);
    }, null, { timeout: 5000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outputDir, '01-credits.png'), fullPage: true });
    const creditsState = await collectGameState(page);
    logStep('credits captured');

    await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
    await stabilizeSmokePlayer(page);
    await waitForActiveGameplay(page);
    await page.waitForTimeout(3200);
    await stabilizeSmokePlayer(page);
    await page.keyboard.down('Space');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(450);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(450);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('Space');
    await stabilizeSmokePlayer(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outputDir, '02-gameplay.png'), fullPage: true });
    const gameplayState = await collectGameState(page);
    logStep('desktop gameplay captured');

    const powerupHudState = await page.evaluate(() => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const hud = play?.hud;
      const player = play?.player;
      if (!game || !play || !hud || !player) return { ok: false, reason: 'missing play hud or player' };
      player.activePowerup = { type: 'rapid_fire', expiresAt: Date.now() + 8000 };
      hud.update();
      const group = hud.activePowerupGroup;
      const location = hud.locationText;
      return {
        ok: Boolean(group?.visible),
        label: player.getActivePowerupState?.()?.label || null,
        group: group ? {
          x: group.x,
          y: group.y,
          width: group.width,
          height: group.height,
          right: group.x + group.width,
          bottom: group.y + group.height
        } : null,
        location: location ? {
          x: location.x,
          y: location.y,
          width: location.width,
          height: location.height,
          bottom: location.y + location.height
        } : null,
        canvas: {
          width: game.getWidth?.() || window.innerWidth,
          height: game.getHeight?.() || window.innerHeight
        }
      };
    });
    await page.screenshot({ path: path.join(outputDir, '02-powerup-hud.png'), fullPage: true });
    logStep('powerup HUD captured');

    const gamepadPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    observePage(gamepadPage, 'gamepad');
    await gamepadPage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await gamepadPage.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
    await gamepadPage.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 15000 });
    await gamepadPage.evaluate(() => {
      const game = window.__game;
      const play = game?.scenes?.play;
      if (play) {
        play.introActive = false;
        play.introComplete = true;
      }
      const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
      buttons[0] = { pressed: true, value: 1 };
      buttons[7] = { pressed: true, value: 1 };
      window.__burtGamepadOverride = {
        id: 'smoke-test-gamepad',
        connected: true,
        axes: [0.9, -0.55],
        buttons
      };
    });
    await gamepadPage.evaluate(() => {
      const game = window.__game;
      const play = game?.scenes?.play;
      const player = play?.player;
      if (game) game.lives = Math.max(game.lives || 0, 3);
      if (player) {
        player.invulnerable = true;
        player.invulnerableTime = 45000;
        player.x = game.getWidth() / 2;
        player.y = game.getHeight() * 0.78;
      }
      if (play?.bulletManager?.enemyBullets) {
        play.bulletManager.enemyBullets.forEach((bullet) => {
          bullet.active = false;
        });
      }
    });
    const gamepadBeforeState = await collectGameState(gamepadPage);
    await gamepadPage.waitForTimeout(800);
    const gamepadMoveState = await collectGameState(gamepadPage);
    await gamepadPage.evaluate(() => {
      const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
      buttons[9] = { pressed: true, value: 1 };
      window.__burtGamepadOverride = {
        id: 'smoke-test-gamepad',
        connected: true,
        axes: [0, 0],
        buttons
      };
    });
    await gamepadPage.waitForTimeout(300);
    await gamepadPage.screenshot({ path: path.join(outputDir, '03-gamepad-pause.png'), fullPage: true });
    const gamepadPauseState = await collectGameState(gamepadPage);
    await gamepadPage.evaluate(() => {
      if (window.__burtGamepadOverride) {
        window.__burtGamepadOverride.buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
      }
    });
    await gamepadPage.close();
    logStep('gamepad flow captured');

    await page.keyboard.press('p');
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(outputDir, '04-pause.png'), fullPage: true });
    const pauseState = await collectGameState(page);
    logStep('pause captured');

    const storyPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    observePage(storyPage, 'story-transmission');
    await storyPage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await storyPage.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 30000 });
    await storyPage.waitForFunction(() => {
      const game = window.__game;
      const play = game?.scenes?.play;
      if (!play?.showStoryTransmission || !play?.player) return false;
      play.introActive = false;
      play.introComplete = true;
      play.dismissActiveToastSlotsBelowPriority?.(['top'], 99);
      play.showStoryTransmission({ force: true });
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return (state.toast?.active || []).some((toast) => toast?.type === 'lore' && /^nova-swarm-story-comms-/.test(toast.imageAlias || ''));
    }, null, { timeout: 15000 });
    await storyPage.waitForTimeout(500);
    await storyPage.screenshot({ path: path.join(outputDir, '05-story-transmission.png'), fullPage: true });
    const storyTransmissionState = await collectGameState(storyPage);
    await storyPage.close();
    logStep('story transmission captured');

    const gameOverPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    observePage(gameOverPage, 'game-over');
    await gameOverPage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await gameOverPage.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
    await gameOverPage.waitForFunction(() => window.__game?.scenes?.play?.player, null, { timeout: 15000 });
    await gameOverPage.evaluate(() => {
      const game = window.__game;
      if (!game) return;
      if (game.scenes?.play) {
        game.scenes.play.lastStandReadyAt = Date.now() + 60000;
      }
      game.score = Math.max(game.score || 0, 1200);
      game.level = Math.max(game.level || 1, 1);
      game.lives = 1;
      game.loseLife();
      if (game.currentScene !== game.scenes?.gameOver) {
        game.lives = 0;
        game.gameOver();
      }
    });
    await gameOverPage.waitForFunction(() => {
      const game = window.__game;
      return game?.currentScene === game?.scenes?.gameOver;
    }, null, { timeout: 10000 });
    await gameOverPage.evaluate(() => {
      const audio = window.render_game_to_text?.()?.audio;
      const scene = window.__game?.scenes?.gameOver;
      if (audio?.currentMusicContext !== 'gameover' && scene?.init) {
        scene.init();
      }
    });
    await gameOverPage.waitForTimeout(900);
    await gameOverPage.screenshot({ path: path.join(outputDir, '06-game-over.png'), fullPage: true });
    const gameOverState = await collectGameState(gameOverPage);
    await gameOverPage.keyboard.press('Escape');
    await gameOverPage.waitForFunction(() => {
      const game = window.__game;
      return game?.currentScene === game?.scenes?.menu || game?.scenes?.gameOver?.state === 'runback';
    }, null, { timeout: 10000 });
    if (await gameOverPage.evaluate(() => window.__game?.currentScene === window.__game?.scenes?.gameOver)) {
      await gameOverPage.keyboard.press('Escape');
    }
    await gameOverPage.waitForFunction(() => {
      const game = window.__game;
      return game?.currentScene === game?.scenes?.menu;
    }, null, { timeout: 10000 });
    await gameOverPage.waitForTimeout(900);
    await gameOverPage.screenshot({ path: path.join(outputDir, '07-return-menu.png'), fullPage: true });
    const returnMenuState = await collectGameState(gameOverPage);
    await gameOverPage.close();
    logStep('game-over and return-menu captured');

    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    observePage(mobilePage, 'mobile');
    await mobilePage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobilePage.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 30000 });
    await stabilizeSmokePlayer(mobilePage);
    await mobilePage.waitForTimeout(1800);
    await mobilePage.screenshot({ path: path.join(outputDir, '08-mobile-intro.png'), fullPage: true });
    await mobilePage.waitForFunction(() => {
      try {
        if (typeof window.render_game_to_text !== 'function') return false;
        const state = JSON.parse(window.render_game_to_text());
        return state?.scene === 'play' && state?.player && state?.wave && state?.counts;
      } catch {
        return false;
      }
    }, null, { timeout: 30000 });
    await stabilizeSmokePlayer(mobilePage);
    await mobilePage.waitForTimeout(700);
    await mobilePage.screenshot({ path: path.join(outputDir, '09-mobile-gameplay.png'), fullPage: true });
    const mobileGameplayState = await collectGameState(mobilePage);
    await mobilePage.close();
    logStep('mobile flow captured');

    const level3Page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    observePage(level3Page, 'level3');
    await level3Page.goto(withQuery(baseUrl, { autostart: '1', debugBossToken: 'NOVA_DEBUG_2026', startLevel: '3', 'nova-devtools-hash': LOCAL_DEVTOOLS_HASH }), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await level3Page.waitForFunction(() => window.__perfStats?.scene === 'play', null, { timeout: 15000 });
    await stabilizeSmokePlayer(level3Page);
    await level3Page.waitForFunction(() => {
      try {
        if (typeof window.render_game_to_text !== 'function') return false;
        const state = JSON.parse(window.render_game_to_text());
        return state?.scene === 'play' && state?.lives > 0 && state?.level === 3 && state?.counts?.enemies > 0;
      } catch {
        return false;
      }
    }, null, { timeout: 30000 });
    await stabilizeSmokePlayer(level3Page);
    await level3Page.waitForTimeout(1500);
    await level3Page.screenshot({ path: path.join(outputDir, '10-level3-gameplay.png'), fullPage: true });
    const level3State = await collectGameState(level3Page);
    await level3Page.close();
    logStep('level 3 debug start captured');

    const transitionPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    observePage(transitionPage, 'wave-transition');
    await transitionPage.goto(withQuery(baseUrl, { autostart: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await transitionPage.waitForFunction(() => window.__game?.currentSceneName === 'play', null, { timeout: 15000 });
    await stabilizeSmokePlayer(transitionPage);
    await transitionPage.waitForFunction(() => {
      try {
        if (typeof window.render_game_to_text !== 'function') return false;
        const state = JSON.parse(window.render_game_to_text());
        return state?.scene === 'play' && state?.counts?.enemies > 0;
      } catch {
        return false;
      }
    }, null, { timeout: 30000 });
    await transitionPage.evaluate(() => {
      const play = window.__game?.scenes?.play;
      if (play?.particleManager) {
        play.particleManager.maxParticles = Math.max(play.particleManager.maxParticles || 0, 1200);
      }
      const enemyManager = play?.enemyManager;
      if (!enemyManager) return;
      enemyManager.clearPendingWaveSpawns?.();
      enemyManager.enemies = enemyManager.enemies.filter((enemy) => {
        const isObjective = typeof enemyManager.isObjectiveEnemy === 'function'
          ? enemyManager.isObjectiveEnemy(enemy)
          : enemy?.kind !== 'bonus_drone' && enemy?.kind !== 'boss' && enemy?.active;
        if (!isObjective) return true;
        enemy.active = false;
        if (enemy.sprite?.parent) enemy.sprite.parent.removeChild(enemy.sprite);
        return false;
      });
      enemyManager.spawning = false;
      enemyManager.waveSpawnPendingCount = 0;
      enemyManager.waveEnding = false;
      enemyManager.cleanupTimer = 0;
      enemyManager.cleanupPhase = 'NONE';
      enemyManager.onWaveCleared?.();
    });
    await stabilizeSmokePlayer(transitionPage);
    await transitionPage.waitForFunction(() => {
      const enemyManager = window.__game?.scenes?.play?.enemyManager;
      return enemyManager?.currentWaveIndex >= 1 &&
        (enemyManager.state === 'WAVE_BRIEFING' || enemyManager.state === 'WAVE_ACTIVE');
    }, null, { timeout: 15000 });
    await transitionPage.waitForTimeout(850);
    await transitionPage.screenshot({ path: path.join(outputDir, '11-wave-briefing.png'), fullPage: true });
    await transitionPage.waitForFunction(() => {
      const play = window.__game?.scenes?.play;
      const enemyManager = play?.enemyManager;
      if (!enemyManager || enemyManager.state !== 'WAVE_ACTIVE' || enemyManager.currentWaveIndex < 1) return false;
      try {
        if (typeof window.render_game_to_text !== 'function') return false;
        const state = JSON.parse(window.render_game_to_text());
        return state?.scene === 'play' && state?.lives > 0 && state?.counts?.enemies > 0;
      } catch {
        return false;
      }
    }, null, { timeout: 15000 });
    const waveTransitionState = await collectGameState(transitionPage);
    await transitionPage.close();
    logStep('wave transition captured');

    const bossPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    observePage(bossPage, 'boss-victory');
    await bossPage.goto(withQuery(baseUrl, { autostart: '1', debugBossToken: 'NOVA_DEBUG_2026', startAtBoss: '1', startLevel: '1', 'nova-devtools-hash': LOCAL_DEVTOOLS_HASH }), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await bossPage.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'BOSS_GATE', null, { timeout: 30000 });
    await bossPage.screenshot({ path: path.join(outputDir, '12-boss-gate.png'), fullPage: true });
    await bossPage.waitForFunction(() => {
      const enemyManager = window.__game?.scenes?.play?.enemyManager;
      return enemyManager?.state === 'BOSS_ACTIVE' && enemyManager?.boss?.active;
    }, null, { timeout: 30000 });
    await stabilizeSmokePlayer(bossPage);
    await bossPage.waitForTimeout(1800);
    await bossPage.screenshot({ path: path.join(outputDir, '13-boss-active.png'), fullPage: true });
    const bossActiveState = await collectGameState(bossPage);
    await bossPage.evaluate(() => {
      const boss = window.__game?.scenes?.play?.enemyManager?.boss;
      if (!boss) return;
      boss.invulnerableUntilMs = 0;
      boss.minimumFightMs = 0;
      boss.finishGateUntilMs = 0;
      boss.takeDamage((boss.health || boss.maxHealth || 1) + 9999);
    });
    await bossPage.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.state === 'LEVEL_COMPLETE', null, { timeout: 10000 });
    await bossPage.waitForFunction(() => {
      try {
        const state = typeof window.render_game_to_text === 'function'
          ? JSON.parse(window.render_game_to_text())
          : null;
        return state?.audio?.currentMusicContext === 'victory' &&
          /Victory Tune|nova_swarm_victory/i.test(state?.audio?.currentMusicTrack || '');
      } catch {
        return false;
      }
    }, null, { timeout: 5000 });
    const bossDefeatedState = await collectGameState(bossPage);
    await bossPage.waitForTimeout(900);
    await bossPage.screenshot({ path: path.join(outputDir, '14-boss-defeated.png'), fullPage: true });
    await bossPage.waitForFunction(() => {
      try {
        return JSON.parse(window.render_game_to_text?.() || '{}').tacticalDraft?.active === true;
      } catch {
        return false;
      }
    }, null, { timeout: 12000 });
    await bossPage.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').tacticalDraft?.inputArmed === true, null, { timeout: 5000 });
    const bossTacticalDraftState = await collectGameState(bossPage);
    await bossPage.screenshot({ path: path.join(outputDir, '14b-tactical-draft.png'), fullPage: true });
    await bossPage.evaluate(() => window.__game?.scenes?.play?.confirmTacticalDraft?.(1, 'pointer'));
    await bossPage.waitForFunction(() => {
      const game = window.__game;
      const enemyManager = game?.scenes?.play?.enemyManager;
      return game?.level >= 2 && enemyManager?.state === 'WAVE_ACTIVE';
    }, null, { timeout: 12000 });
    await stabilizeSmokePlayer(bossPage);
    await bossPage.waitForTimeout(900);
    await bossPage.screenshot({ path: path.join(outputDir, '15-level-2-start.png'), fullPage: true });
    const bossVictoryState = await collectGameState(bossPage);
    await bossPage.close();
    logStep('boss victory captured');

    const report = {
      baseUrl,
      outputDir,
      menuState,
      settingsSfxState,
      settingsState,
      creditsState,
      gameplayState,
      powerupHudState,
      gamepadBeforeState,
      gamepadMoveState,
      gamepadPauseState,
      pauseState,
      storyTransmissionState,
      gameOverState,
      returnMenuState,
      mobileGameplayState,
      level3State,
      waveTransitionState,
      bossActiveState,
      bossDefeatedState,
      bossTacticalDraftState,
      bossVictoryState,
      routineConsoleEvents,
      consoleEvents,
      pageErrors,
      badResponses
    };
    writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
    logStep('report written');

    const blockingIssues = [
      ...pageErrors.map((message) => `pageerror: ${message}`),
      ...badResponses.map((response) => `HTTP ${response.status}: ${response.url}`),
      ...(routineConsoleEvents.length ? [`production routine console output was not quiet (${routineConsoleEvents.length} messages)`] : []),
      ...(menuState.perf?.scene !== 'menu' ? [`menu perf state used unstable scene name: ${menuState.perf?.scene || 'none'}`] : []),
      ...(menuState.textState?.scene !== 'menu' ? [`menu text state used unstable scene name: ${menuState.textState?.scene || 'none'}`] : []),
      ...(!settingsState.settingsOverlayVisible ? ['menu settings overlay did not appear'] : []),
      ...(!audioTestButtonState?.sfx || !audioTestButtonState?.voice ? ['settings audio test buttons were not exposed'] : []),
      ...(!['achievement', 'shoot_small'].includes((settingsSfxState || settingsState).textState?.audio?.lastSfxEvent) ? [`settings SFX test did not update telemetry: ${(settingsSfxState || settingsState).textState?.audio?.lastSfxEvent || 'none'}`] : []),
      ...(settingsState.textState?.audio?.lastVoiceEvent !== 'mission_control_launch' ? [`settings voice test did not update telemetry: ${settingsState.textState?.audio?.lastVoiceEvent || 'none'}`] : []),
      ...(!creditsState.creditsOverlayVisible || creditsState.textState?.overlays?.credits !== true ? ['credits overlay did not appear or was missing from text state'] : []),
      ...(!Number.isFinite(settingsState.textState?.accessibility?.screenShake) ? ['accessibility screen-shake setting was not exposed'] : []),
      ...(!Number.isFinite(settingsState.textState?.accessibility?.playerFocus) ? ['accessibility player-focus setting was not exposed'] : []),
      ...(typeof settingsState.textState?.accessibility?.colorAssist !== 'boolean' ? ['accessibility color-assist setting was not exposed'] : []),
      ...(!pauseState.isPaused || !pauseState.pauseOverlayVisible ? ['pause overlay did not appear'] : []),
      ...(gamepadMoveState.textState?.input?.gamepad?.connected !== true ? ['gamepad override did not register as connected'] : []),
      ...((gamepadMoveState.textState?.input?.gamepad?.moveX || 0) < 0.6 ? ['gamepad right-stick movement was not exposed'] : []),
      ...((gamepadMoveState.textState?.input?.gamepad?.moveY || 0) > -0.25 ? ['gamepad upward movement was not exposed'] : []),
      ...((gamepadMoveState.textState?.player?.x || 0) <= (gamepadBeforeState.textState?.player?.x || 0) + 8 ? ['gamepad movement did not move the player right'] : []),
      ...((gamepadMoveState.textState?.player?.y || 0) >= (gamepadBeforeState.textState?.player?.y || 9999) - 4 ? ['gamepad movement did not move the player upward'] : []),
      ...((gamepadMoveState.textState?.counts?.playerBullets || 0) <= 0 ? ['gamepad fire did not produce player bullets'] : []),
      ...(!gamepadPauseState.isPaused || !gamepadPauseState.pauseOverlayVisible ? ['gamepad pause button did not open pause overlay'] : []),
      ...(!storyTransmissionState.storyTransmission ? ['forced story transmission did not appear'] : []),
      ...(!/^nova-swarm-story-comms-/.test(storyTransmissionState.storyTransmission?.imageAlias || '') ? [`story transmission did not use generated story art: ${storyTransmissionState.storyTransmission?.imageAlias || 'none'}`] : []),
      ...(gameOverState.scene !== 'gameOver' ? ['forced game over did not reach game over scene'] : []),
      ...(gameOverState.perf?.scene !== 'gameOver' ? [`game-over perf state used unstable scene name: ${gameOverState.perf?.scene || 'none'}`] : []),
      ...(gameOverState.textState?.scene !== 'gameOver' ? [`game-over text state used unstable scene name: ${gameOverState.textState?.scene || 'none'}`] : []),
      ...(
        gameOverState.textState?.gameOver?.globalQualified
          ? (musicContext(gameOverState) !== 'victory' ? [`global leaderboard game-over did not switch to victory fanfare music: ${musicContext(gameOverState)} / ${musicTrackName(gameOverState) || 'none'}`] : [])
          : (!isGameOverMusic(gameOverState) ? [`game-over music did not switch to game-over theme: ${musicContext(gameOverState)} / ${musicTrackName(gameOverState) || 'none'}`] : [])
      ),
      ...(returnMenuState.scene !== 'menu' ? ['Escape from game over did not return to menu'] : []),
      ...(returnMenuState.perf?.scene !== 'menu' ? [`return-menu perf state used unstable scene name: ${returnMenuState.perf?.scene || 'none'}`] : []),
      ...(returnMenuState.textState?.scene !== 'menu' ? [`return-menu text state used unstable scene name: ${returnMenuState.textState?.scene || 'none'}`] : []),
      ...(returnMenuState.textState?.audio?.currentMusicContext !== 'menu' ? ['return to menu did not restore menu music context'] : []),
      ...(menuState.textState?.audio?.currentMusicContext !== 'menu' ? ['menu music context was not menu'] : []),
      ...(trackHasAny(menuState, ['Defeated', 'nova_swarm_gameover']) ? ['menu playlist used game-over music'] : []),
      ...(!isGameplayMusic(gameplayState) ? [`gameplay music used reserved/non-gameplay track: ${musicTrackName(gameplayState) || 'none'}`] : []),
      ...(gameplayState.fatalOverlay ? ['fatal overlay visible'] : []),
      ...(!powerupHudState.ok ? [`powerup HUD did not become visible: ${powerupHudState.reason || 'unknown'}`] : []),
      ...(powerupHudState.label !== 'RAPID FIRE' ? [`powerup HUD label mismatch: ${powerupHudState.label || 'none'}`] : []),
      ...((powerupHudState.group?.width || 0) < 120 || (powerupHudState.group?.height || 0) < 20 ? ['powerup HUD bounds were too small'] : []),
      ...((powerupHudState.group?.right || 0) > (powerupHudState.canvas?.width || 0) ? ['powerup HUD overflowed right edge'] : []),
      ...((powerupHudState.location && powerupHudState.group?.y < powerupHudState.location.bottom + 3) ? ['powerup HUD overlapped sector/location label'] : []),
      ...visibleEnemyHealthIssues(gameplayState, 'desktop gameplay'),
      ...visibleEnemyHealthIssues(storyTransmissionState, 'story transmission'),
      ...(mobileGameplayState.fatalOverlay ? ['mobile fatal overlay visible'] : []),
      ...(mobileGameplayState.textState?.scene !== 'play' ? ['mobile autostart did not reach play scene'] : []),
      ...(!mobileGameplayState.textState?.wave ? ['mobile gameplay did not expose wave state'] : []),
      ...visibleEnemyHealthIssues(mobileGameplayState, 'mobile gameplay'),
      ...(level3State.textState?.level !== 3 ? ['debug startLevel=3 did not hold level 3'] : []),
      ...(level3State.textState?.scene !== 'play' ? ['level 3 debug start left play scene'] : []),
      ...((level3State.textState?.lives || 0) <= 0 ? ['level 3 debug start player died during smoke'] : []),
      ...((level3State.textState?.counts?.enemies || 0) <= 0 ? ['level 3 smoke did not spawn enemies'] : []),
      ...visibleEnemyHealthIssues(level3State, 'level 3 gameplay'),
      ...(waveTransitionState.currentWaveIndex < 1 ? ['wave transition did not advance to wave 2'] : []),
      ...(waveTransitionState.textState?.scene !== 'play' ? ['wave transition left play scene'] : []),
      ...((waveTransitionState.textState?.lives || 0) <= 0 ? ['wave transition player died during smoke'] : []),
      ...(waveTransitionState.enemyManagerState !== 'WAVE_ACTIVE' ? ['wave transition did not return to active state'] : []),
      ...((waveTransitionState.score || 0) < 50 ? ['wave transition did not award first wave score'] : []),
      ...(waveTransitionState.textState?.wave?.currentWaveNumber !== 2 ? ['wave text state did not expose wave 2'] : []),
      ...((waveTransitionState.textState?.counts?.enemies || 0) <= 0 ? ['wave transition did not spawn next wave enemies'] : []),
      ...visibleEnemyHealthIssues(waveTransitionState, 'wave transition'),
      ...(bossVictoryState.fatalOverlay ? ['boss victory path showed fatal overlay'] : []),
      ...(!isBossMusic(bossActiveState) ? [`boss music did not switch to boss theme: ${musicContext(bossActiveState)} / ${musicTrackName(bossActiveState) || 'none'}`] : []),
      ...visibleEnemyHealthIssues(bossActiveState, 'boss active'),
      ...((bossActiveState.textState?.visibleEnemies || [])
        .filter(enemy => enemy.bossProfile)
        .flatMap(enemy => {
          const bounds = enemy.visualBounds || {};
          return (bounds.width || 0) < 80 || (bounds.height || 0) < 80
            ? [`boss active visual bounds too small for ${enemy.bossProfile}: ${bounds.width || 0}x${bounds.height || 0}`]
            : [];
        })),
      ...(!isVictoryMusic(bossDefeatedState) ? [`boss defeat did not switch to victory stinger: ${musicContext(bossDefeatedState)} / ${musicTrackName(bossDefeatedState) || 'none'}`] : []),
      ...(activeToastCount(bossDefeatedState) > 1 ? [`boss defeat displayed overlapping active toasts: ${describeActiveToasts(bossDefeatedState)}`] : []),
      ...(bossVictoryState.level < 2 ? ['boss victory did not advance to level 2'] : []),
      ...(bossVictoryState.enemyManagerState !== 'WAVE_ACTIVE' ? ['boss victory did not return to active gameplay'] : []),
      ...(activeToastCount(bossVictoryState) > 1 ? [`post-boss level start displayed overlapping active toasts: ${describeActiveToasts(bossVictoryState)}`] : []),
      ...(!isGameplayMusic(bossVictoryState) ? [`post-boss level 2 music did not return to gameplay pool: ${musicContext(bossVictoryState)} / ${musicTrackName(bossVictoryState) || 'none'}`] : []),
      ...(bossVictoryState.textState?.wave?.currentWaveNumber !== 1 ? ['boss victory did not restart at wave 1 of the next level'] : []),
      ...((bossVictoryState.textState?.counts?.enemies || 0) <= 0 ? ['boss victory did not spawn level 2 enemies'] : []),
      ...visibleEnemyHealthIssues(bossVictoryState, 'post-boss level 2')
    ];

    const printableReport = process.env.SMOKE_VERBOSE_REPORT === '1'
      ? report
      : summarizeSmokeReport(report, blockingIssues);
    console.log(JSON.stringify(printableReport, null, 2));
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
