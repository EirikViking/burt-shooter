const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createSteamLeaderboardBridge } = require('./steamLeaderboardBridge.cjs');
const { runSteamLeaderboardRuntimeProbe } = require('./steamLeaderboardRuntimeProbe.cjs');

const isSmoke = process.argv.includes('--smoke') || process.env.NOVA_SWARM_ELECTRON_SMOKE === '1';
const isControlSmoke = process.argv.includes('--control-smoke') || process.env.NOVA_SWARM_ELECTRON_CONTROL_SMOKE === '1';
const isSteamLeaderboardProbe = process.argv.includes('--steam-leaderboard-probe') || process.env.NOVA_SWARM_STEAM_LEADERBOARD_PROBE === '1';
const isWindowed = process.argv.includes('--windowed') || process.env.NOVA_SWARM_WINDOWED === '1';
const shouldStartFullscreen = !isSmoke && !isControlSmoke && !isSteamLeaderboardProbe && !isWindowed;
const distDir = path.resolve(__dirname, '..', 'dist');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

let server = null;
let baseUrl = null;
const steamLeaderboardBridge = createSteamLeaderboardBridge({
  rootDir: path.resolve(__dirname, '..'),
  logger: console
});

function registerSteamLeaderboardIpc() {
  ipcMain.handle('nova-steam-leaderboard:isAvailable', () => steamLeaderboardBridge.isAvailable());
  ipcMain.handle('nova-steam-leaderboard:getPersonaName', () => steamLeaderboardBridge.getPersonaName());
  ipcMain.handle('nova-steam-leaderboard:getTopScores', (_event, payload) => steamLeaderboardBridge.getTopScores(payload));
  ipcMain.handle('nova-steam-leaderboard:getFriendsScores', (_event, payload) => steamLeaderboardBridge.getFriendsScores(payload));
  ipcMain.handle('nova-steam-leaderboard:submitScore', (_event, payload) => steamLeaderboardBridge.submitScore(payload));
  ipcMain.handle('nova-steam-leaderboard:submitScoreDetailed', (_event, payload) => steamLeaderboardBridge.submitScoreDetailed(payload));
  ipcMain.handle('nova-steam-leaderboard:getLastUploadDiagnostics', () => steamLeaderboardBridge.getLastUploadDiagnostics());
  ipcMain.handle('nova-steam-leaderboard:getStatus', () => steamLeaderboardBridge.getStatus());
  ipcMain.handle('nova-steam-leaderboard:getRuntimeInfo', () => getSteamRuntimeInfo());
}

function registerAppIpc() {
  ipcMain.handle('nova-app:exitGame', () => {
    setImmediate(() => app.quit());
    return { ok: true };
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function getScorePath() {
  return path.join(app.getPath('userData'), 'local-highscores.json');
}

function readLocalScores() {
  try {
    const raw = fs.readFileSync(getScorePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalScores(scores) {
  fs.mkdirSync(path.dirname(getScorePath()), { recursive: true });
  fs.writeFileSync(getScorePath(), JSON.stringify(scores.slice(0, 100), null, 2));
}

function sanitizeScoreEntry(entry = {}) {
  const name = String(entry.name || 'PILOT').trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 10) || 'PILOT';
  const score = Math.max(0, Math.floor(Number(entry.score) || 0));
  const level = Math.max(1, Math.floor(Number(entry.level) || 1));
  const rankIndex = Math.max(0, Math.min(19, Math.floor(Number(entry.rankIndex ?? entry.rank_index) || 0)));
  return {
    name,
    score,
    level,
    rankIndex,
    timestamp: new Date().toISOString(),
    local: true
  };
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  return JSON.parse(text);
}

async function handleApi(request, response) {
  if (request.url !== '/api/highscores') {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  if (request.method === 'GET') {
    const scores = readLocalScores().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
    sendJson(response, 200, scores);
    return;
  }

  if (request.method === 'POST') {
    try {
      const payload = await readRequestJson(request);
      const scores = readLocalScores();
      const entry = sanitizeScoreEntry(payload);
      scores.push(entry);
      scores.sort((a, b) => (b.score || 0) - (a.score || 0));
      writeLocalScores(scores);
      sendJson(response, 200, { ok: true, score: entry });
    } catch (error) {
      sendJson(response, 400, { error: error?.message || 'Invalid score payload' });
    }
    return;
  }

  sendJson(response, 405, { error: 'Method not allowed' });
}

function resolveStaticPath(urlPath) {
  let decoded = '/';
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    decoded = '/';
  }
  const relativePath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const candidate = path.resolve(distDir, relativePath);
  if (!candidate.startsWith(distDir)) return path.join(distDir, 'index.html');
  return candidate;
}

function serveStatic(request, response) {
  const filePath = resolveStaticPath(request.url || '/');
  const resolvedPath = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    ? filePath
    : path.join(distDir, 'index.html');
  const ext = path.extname(resolvedPath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=31536000, immutable'
  });
  fs.createReadStream(resolvedPath).pipe(response);
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((request, response) => {
      if ((request.url || '').startsWith('/api/')) {
        handleApi(request, response).catch((error) => sendJson(response, 500, { error: error?.message || 'Server error' }));
        return;
      }
      serveStatic(request, response);
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve(baseUrl);
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    fullscreen: shouldStartFullscreen,
    backgroundColor: '#030714',
    show: !isSmoke && !isSteamLeaderboardProbe,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(baseUrl ? `${baseUrl}/?desktop=1` : pathToFileURL(path.join(distDir, 'index.html')).toString());
  return win;
}

function getSteamRuntimeInfo() {
  const steamEnv = {
    SteamAppId: process.env.SteamAppId || null,
    SteamGameId: process.env.SteamGameId || null,
    SteamOverlayGameId: process.env.SteamOverlayGameId || null
  };
  return {
    appIsPackaged: app.isPackaged,
    defaultApp: Boolean(process.defaultApp),
    executable: process.execPath,
    cwd: process.cwd(),
    launchedBySteamHint: Boolean(steamEnv.SteamAppId || steamEnv.SteamGameId || steamEnv.SteamOverlayGameId),
    steamEnv
  };
}

async function runSmoke(window) {
  const outputDir = path.resolve(
    process.env.NOVA_SWARM_ELECTRON_SMOKE_OUTPUT_DIR || path.join(process.cwd(), 'test-results', `electron-smoke-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  );
  fs.mkdirSync(outputDir, { recursive: true });
  const consoleEvents = [];
  window.webContents.on('console-message', (_event, level, message) => {
    const text = String(message);
    if (text.includes('Electron Security Warning') && text.includes('will not show up')) return;
    if (level >= 2) consoleEvents.push({ level, message: text.slice(0, 500) });
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Electron smoke load timeout')), 20000);
    window.webContents.once('did-finish-load', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  const readyState = await waitForRenderedScene(window);
  await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await new Promise((resolve) => setTimeout(resolve, 500));

  const state = await window.webContents.executeJavaScript(`
    (async () => {
      const api = await fetch('/api/highscores').then(r => ({ ok: r.ok, status: r.status, data: r.ok ? r.json() : null }));
      const textState = typeof window.render_game_to_text === 'function' ? JSON.parse(window.render_game_to_text()) : null;
      const intro = window.__game?.scenes?.intro;
      const steamLeaderboardAvailable = await window.__novaSteamLeaderboard?.isAvailable?.().catch(() => false);
      const steamBridgeStatus = await window.__novaSteamBridge?.getStatus?.().catch(error => ({ error: error?.message || String(error) }));
      return {
        title: document.title,
        apiOk: api.ok,
        apiStatus: api.status,
        steamBridgeStatus: steamBridgeStatus || null,
        steamLeaderboardAvailable: Boolean(steamLeaderboardAvailable),
        steamLeaderboardBridgePresent: Boolean(window.__novaSteamLeaderboard),
        scene: textState?.scene || null,
        build: textState?.buildId || null,
        gitSha: textState?.gitSha || null,
        introTitle: intro?.title?.text || null,
        readyState: ${JSON.stringify(null)}
      };
    })()
  `);
  state.readyState = readyState;
  const image = await window.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, '01-electron-menu.png'), image.toPNG());
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify({
    status: state.apiOk && state.scene && readyState.ready && !consoleEvents.length ? 'passed' : 'failed',
    baseUrl,
    outputDir,
    state,
    consoleEvents
  }, null, 2));
  console.log(JSON.stringify({ outputDir, baseUrl, state, consoleEvents }, null, 2));
  if (!state.apiOk || !state.scene || !readyState.ready || consoleEvents.length) throw new Error('Electron smoke failed');
}

async function readPlayState(window) {
  return window.webContents.executeJavaScript(`
    (() => {
      const textState = typeof window.render_game_to_text === 'function' ? JSON.parse(window.render_game_to_text()) : null;
      const play = window.__game?.scenes?.play;
      return {
        textState,
        scene: textState?.scene || null,
        playReady: Boolean(play?.isReady),
        hasInputManager: Boolean(play?.inputManager),
        introActive: Boolean(play?.introActive || play?.introOverlay?.parent),
        introComplete: Boolean(play?.introComplete),
        isPaused: Boolean(play?.isPaused),
        pauseOverlayVisible: Boolean(play?.pauseOverlay?.visible && play?.pauseOverlay?.parent),
        player: textState?.player || null,
        counts: textState?.counts || null,
        input: textState?.input || null,
        keySnapshot: play?.inputManager?.keys ? {
          ArrowRight: Boolean(play.inputManager.keys.ArrowRight),
          KeyD: Boolean(play.inputManager.keys.KeyD),
          d: Boolean(play.inputManager.keys.d),
          ArrowUp: Boolean(play.inputManager.keys.ArrowUp),
          KeyW: Boolean(play.inputManager.keys.KeyW),
          w: Boolean(play.inputManager.keys.w)
        } : null,
        build: textState?.buildId || null,
        gitSha: textState?.gitSha || null
      };
    })()
  `);
}

async function settleShipIntroForControlSmoke(window) {
  return window.webContents.executeJavaScript(`
    (() => {
      const game = window.__game;
      const play = game?.scenes?.play;
      if (!play?.introActive || play?.introComplete || typeof play.completeShipIntro !== 'function') return false;
      if (play.introOverlay?.parent) {
        play.introOverlay.parent.removeChild(play.introOverlay);
      }
      if (play.player) {
        const width = typeof game.getWidth === 'function' ? game.getWidth() : 1280;
        const height = typeof game.getHeight === 'function' ? game.getHeight() : 720;
        play.player.x = width / 2;
        play.player.y = height - 150;
        if (play.player.sprite) {
          play.player.sprite.x = play.player.x;
          play.player.sprite.y = play.player.y;
          play.player.sprite.alpha = 1;
          play.player.sprite.visible = true;
          play.player.sprite.renderable = true;
          play.player.sprite.scale?.set?.(1);
        }
      }
      play.completeShipIntro();
      return true;
    })()
  `);
}

async function waitForPlay(window) {
  const startedAt = Date.now();
  let lastState = null;
  let introSettled = false;
  while (Date.now() - startedAt < 20000) {
    lastState = await readPlayState(window);
    const playerReady = Boolean(lastState?.player?.active && Number.isFinite(lastState?.player?.x) && Number.isFinite(lastState?.player?.y));
    const controlsReady = Boolean(
      lastState?.scene === 'play' &&
      lastState?.playReady &&
      lastState?.hasInputManager &&
      playerReady &&
      lastState?.introComplete &&
      !lastState?.introActive &&
      !lastState?.isPaused
    );
    if (controlsReady) return lastState;
    if (
      !introSettled &&
      Date.now() - startedAt > 4500 &&
      lastState?.scene === 'play' &&
      lastState?.playReady &&
      playerReady &&
      lastState?.introActive &&
      !lastState?.introComplete
    ) {
      introSettled = await settleShipIntroForControlSmoke(window);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Control smoke did not reach controllable play state: ${JSON.stringify(lastState)}`);
}

async function holdKeys(window, keys, durationMs) {
  const aliases = expandControlKeys(keys);
  const electronKeys = keys.map(toElectronKeyCode);
  await window.webContents.executeJavaScript(`
    (() => {
      const play = window.__game?.scenes?.play;
      const inputs = [play?.inputManager, play?.player?.inputManager].filter(Boolean);
      window.__burtKeyboardOverride = window.__burtKeyboardOverride || {};
      for (const key of ${JSON.stringify(aliases)}) {
        for (const input of inputs) input?.setKeyPressed?.(key, true);
        window.__burtKeyboardOverride[key] = true;
      }
    })()
  `);
  for (const keyCode of electronKeys) {
    window.webContents.sendInputEvent({ type: 'keyDown', keyCode });
  }
  const steps = Math.max(1, Math.ceil(durationMs / 80));
  const stepMs = Math.max(16, Math.round(durationMs / steps));
  for (let step = 0; step < steps; step++) {
    await window.webContents.executeJavaScript(`
      (() => {
        const play = window.__game?.scenes?.play;
        const inputs = [play?.inputManager, play?.player?.inputManager].filter(Boolean);
        window.__burtKeyboardOverride = window.__burtKeyboardOverride || {};
        for (const key of ${JSON.stringify(aliases)}) {
          for (const input of inputs) input?.setKeyPressed?.(key, true);
        }
        for (const key of ${JSON.stringify(aliases)}) window.__burtKeyboardOverride[key] = true;
      })()
    `);
    await advanceControlTime(window, stepMs);
  }
  const heldState = await readPlayState(window);
  for (const keyCode of [...electronKeys].reverse()) {
    window.webContents.sendInputEvent({ type: 'keyUp', keyCode });
  }
  await window.webContents.executeJavaScript(`
      (() => {
        const play = window.__game?.scenes?.play;
        const inputs = [play?.inputManager, play?.player?.inputManager].filter(Boolean);
        for (const key of ${JSON.stringify(aliases)}) {
          for (const input of inputs) input?.setKeyPressed?.(key, false);
        }
        if (window.__burtKeyboardOverride) {
          for (const key of ${JSON.stringify(aliases)}) window.__burtKeyboardOverride[key] = false;
        }
      })()
  `);
  return heldState;
}

function toElectronKeyCode(keyCode) {
  const map = {
    KeyW: 'W',
    KeyA: 'A',
    KeyS: 'S',
    KeyD: 'D',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right'
  };
  return map[keyCode] || keyCode;
}

function expandControlKeys(keys) {
  const aliases = new Set(keys);
  for (const key of keys) {
    if (key === 'KeyW') {
      aliases.add('w');
      aliases.add('W');
      aliases.add('ArrowUp');
    } else if (key === 'KeyD') {
      aliases.add('d');
      aliases.add('D');
      aliases.add('ArrowRight');
    } else if (key === 'KeyA') {
      aliases.add('a');
      aliases.add('A');
      aliases.add('ArrowLeft');
    } else if (key === 'KeyS') {
      aliases.add('s');
      aliases.add('S');
      aliases.add('ArrowDown');
    } else if (key === 'ArrowUp') {
      aliases.add('KeyW');
      aliases.add('w');
      aliases.add('W');
    } else if (key === 'ArrowRight') {
      aliases.add('KeyD');
      aliases.add('d');
      aliases.add('D');
    } else if (key === 'ArrowLeft') {
      aliases.add('KeyA');
      aliases.add('a');
      aliases.add('A');
    } else if (key === 'ArrowDown') {
      aliases.add('KeyS');
      aliases.add('s');
      aliases.add('S');
    }
  }
  return [...aliases];
}

async function tapKey(window, keyCode) {
  const directKeys = [keyCode];
  if (keyCode.length === 1) {
    directKeys.push(keyCode.toUpperCase(), `Key${keyCode.toUpperCase()}`);
  }
  await window.webContents.executeJavaScript(`
    (() => {
      const input = window.__game?.scenes?.play?.inputManager;
      for (const key of ${JSON.stringify(directKeys)}) {
        input?.setKeyPressed?.(key, true);
        if (input?.justPressed) input.justPressed[key] = true;
      }
    })()
  `);
  window.webContents.sendInputEvent({ type: 'keyDown', keyCode });
  await advanceControlTime(window, 120);
  window.webContents.sendInputEvent({ type: 'keyUp', keyCode });
  await window.webContents.executeJavaScript(`
    (() => {
      const input = window.__game?.scenes?.play?.inputManager;
      for (const key of ${JSON.stringify(directKeys)}) input?.setKeyPressed?.(key, false);
    })()
  `);
  await advanceControlTime(window, 60);
}

async function setGamepadOverride(window, override, options = {}) {
  const pollImmediately = options.pollImmediately !== false;
  await window.webContents.executeJavaScript(`
    window.__burtGamepadOverride = ${JSON.stringify(override)};
    if (${JSON.stringify(pollImmediately)}) window.__game?.scenes?.play?.inputManager?.pollGamepad?.(true);
  `);
}

async function advanceControlTime(window, durationMs) {
  await window.webContents.executeJavaScript(`
    window.advanceTime?.(${Math.max(16, Math.round(durationMs))});
  `);
}

async function ensureUnpaused(window) {
  const state = await readPlayState(window);
  if (!state?.isPaused && !state?.pauseOverlayVisible) return state;
  await window.webContents.executeJavaScript(`
    window.__game?.scenes?.play?.setPaused?.(false);
    window.__game?.scenes?.play?.inputManager?.consumeKeyPress?.('KeyP', 'p', 'P', 'Escape');
  `);
  await new Promise((resolve) => setTimeout(resolve, 150));
  return readPlayState(window);
}

async function captureControlScreenshot(window, outputDir, fileName, capturedScreenshots, screenshotWarnings) {
  try {
    const image = await window.webContents.capturePage();
    fs.writeFileSync(path.join(outputDir, fileName), image.toPNG());
    capturedScreenshots.push(fileName);
  } catch (error) {
    screenshotWarnings.push({
      file: fileName,
      message: error?.message || String(error)
    });
  }
}

async function runControlSmoke(window) {
  const outputDir = path.resolve(
    process.env.NOVA_SWARM_ELECTRON_CONTROL_SMOKE_OUTPUT_DIR || path.join(process.cwd(), 'test-results', `electron-control-smoke-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  );
  fs.mkdirSync(outputDir, { recursive: true });
  const consoleEvents = [];
  const capturedScreenshots = [];
  const screenshotWarnings = [];
  window.webContents.on('console-message', (_event, level, message) => {
    const text = String(message);
    if (text.includes('Electron Security Warning') && text.includes('will not show up')) return;
    if (level >= 2) consoleEvents.push({ level, message: text.slice(0, 500) });
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Electron control smoke load timeout')), 20000);
    window.webContents.once('did-finish-load', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  await window.loadURL(`${baseUrl}/?desktop=1&autostart=1&controlSmoke=1`);
  const startState = await waitForPlay(window);
  await captureControlScreenshot(window, outputDir, '00-control-start.png', capturedScreenshots, screenshotWarnings);

  const keyboardState = await holdKeys(window, ['ArrowRight', 'KeyD', 'ArrowUp', 'KeyW', 'Space'], 900);
  await captureControlScreenshot(window, outputDir, '01-keyboard-run.png', capturedScreenshots, screenshotWarnings);

  await tapKey(window, 'p');
  await new Promise((resolve) => setTimeout(resolve, 250));
  const keyboardPauseState = await readPlayState(window);
  await captureControlScreenshot(window, outputDir, '02-keyboard-pause.png', capturedScreenshots, screenshotWarnings);

  await tapKey(window, 'p');
  await new Promise((resolve) => setTimeout(resolve, 250));
  await ensureUnpaused(window);

  await setGamepadOverride(window, {
    id: 'packaged-control-smoke-gamepad',
    index: 0,
    axes: [1, -1],
    buttons: [{ pressed: true, value: 1 }],
    connected: true
  });
  await advanceControlTime(window, 900);
  const gamepadMoveState = await readPlayState(window);
  await captureControlScreenshot(window, outputDir, '03-gamepad-run.png', capturedScreenshots, screenshotWarnings);

  await setGamepadOverride(window, {
    id: 'packaged-control-smoke-gamepad',
    index: 0,
    axes: [0, 0],
    buttons: Array.from({ length: 10 }, (_button, index) => ({ pressed: index === 9, value: index === 9 ? 1 : 0 })),
    connected: true
  }, { pollImmediately: false });
  await advanceControlTime(window, 250);
  const gamepadPauseState = await readPlayState(window);
  await captureControlScreenshot(window, outputDir, '04-gamepad-pause.png', capturedScreenshots, screenshotWarnings);

  await setGamepadOverride(window, null);

  const errors = [
    ...(keyboardState.player?.x > (startState.player?.x || 0) + 8 ? [] : ['keyboard did not move player right']),
    ...(keyboardState.player?.y < (startState.player?.y || 9999) - 4 ? [] : ['keyboard did not move player upward']),
    ...((keyboardState.counts?.playerBullets || 0) > (startState.counts?.playerBullets || 0) || (keyboardState.player?.traitState?.shotsFired || 0) > (startState.player?.traitState?.shotsFired || 0) ? [] : ['keyboard fire did not produce shots']),
    ...(keyboardPauseState.isPaused && keyboardPauseState.pauseOverlayVisible ? [] : ['keyboard pause did not open pause overlay']),
    ...(gamepadMoveState.input?.gamepad?.connected === true ? [] : ['gamepad override did not register']),
    ...((gamepadMoveState.input?.gamepad?.moveX || 0) > 0.6 ? [] : ['gamepad moveX did not register']),
    ...((gamepadMoveState.input?.gamepad?.moveY || 0) < -0.6 ? [] : ['gamepad moveY did not register']),
    ...((gamepadMoveState.counts?.playerBullets || 0) > (keyboardState.counts?.playerBullets || 0) || (gamepadMoveState.player?.traitState?.shotsFired || 0) > (keyboardState.player?.traitState?.shotsFired || 0) ? [] : ['gamepad fire did not produce shots']),
    ...(gamepadPauseState.isPaused && (gamepadPauseState.pauseOverlayVisible || gamepadPauseState.textState?.overlays?.pause) ? [] : ['gamepad pause did not open pause overlay']),
    ...(consoleEvents.length ? [`${consoleEvents.length} console event(s)`] : [])
  ];

  const report = {
    status: errors.length ? 'failed' : 'passed',
    baseUrl,
    outputDir,
    build: startState.build || null,
    gitSha: startState.gitSha || null,
    screenshots: capturedScreenshots,
    screenshotWarnings,
    checks: {
      keyboardMovement: keyboardState.player?.x > (startState.player?.x || 0) + 8 && keyboardState.player?.y < (startState.player?.y || 9999) - 4,
      keyboardFire: (keyboardState.counts?.playerBullets || 0) > (startState.counts?.playerBullets || 0) || (keyboardState.player?.traitState?.shotsFired || 0) > (startState.player?.traitState?.shotsFired || 0),
      keyboardPause: keyboardPauseState.isPaused && keyboardPauseState.pauseOverlayVisible,
      gamepadMovement: gamepadMoveState.input?.gamepad?.connected === true && (gamepadMoveState.input?.gamepad?.moveX || 0) > 0.6 && (gamepadMoveState.input?.gamepad?.moveY || 0) < -0.6,
      gamepadFire: (gamepadMoveState.counts?.playerBullets || 0) > (keyboardState.counts?.playerBullets || 0) || (gamepadMoveState.player?.traitState?.shotsFired || 0) > (keyboardState.player?.traitState?.shotsFired || 0),
      gamepadPause: Boolean(gamepadPauseState.isPaused && (gamepadPauseState.pauseOverlayVisible || gamepadPauseState.textState?.overlays?.pause))
    },
    states: {
      start: startState,
      keyboard: keyboardState,
      keyboardPause: keyboardPauseState,
      gamepadMove: gamepadMoveState,
      gamepadPause: gamepadPauseState
    },
    consoleEvents,
    errors
  };

  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    outputDir,
    baseUrl,
    build: report.build,
    checks: report.checks,
    consoleEvents,
    errors
  }, null, 2));
  if (errors.length) throw new Error(`Electron control smoke failed: ${errors.join('; ')}`);
}

async function waitForRenderedScene(window) {
  const startedAt = Date.now();
  let lastState = null;
  while (Date.now() - startedAt < 20000) {
    lastState = await window.webContents.executeJavaScript(`
      (() => {
        const game = window.__game;
        const intro = game?.scenes?.intro;
        const textState = typeof window.render_game_to_text === 'function' ? JSON.parse(window.render_game_to_text()) : null;
        const title = intro?.title?.text || '';
        const caption = intro?.caption?.text || '';
        return {
          scene: textState?.scene || null,
          introTitle: title,
          introCaption: caption,
          panelTextures: intro?.panelTextures?.size || 0,
          ready: Boolean((title && caption) || textState?.scene === 'menu')
        };
      })()
    `);
    if (lastState.ready) return lastState;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return lastState || { ready: false };
}

app.whenReady().then(async () => {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error(`Missing build output at ${distDir}. Run npm run build first.`);
  }
  registerSteamLeaderboardIpc();
  registerAppIpc();
  await startLocalServer();
  const win = createWindow();
  if (isSteamLeaderboardProbe) {
    try {
      await runSteamLeaderboardRuntimeProbe({
        window: win,
        baseUrl,
        args: process.argv.slice(2),
        runtimeInfo: getSteamRuntimeInfo(),
        outputRoot: app.isPackaged ? app.getPath('userData') : process.cwd()
      });
      app.quit();
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  } else if (isControlSmoke) {
    try {
      await runControlSmoke(win);
      app.quit();
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  } else if (isSmoke) {
    try {
      await runSmoke(win);
      app.quit();
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  }
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (server) server.close();
  steamLeaderboardBridge.shutdown();
});
