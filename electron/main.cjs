const { app, BrowserWindow, shell } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const isSmoke = process.argv.includes('--smoke') || process.env.NOVA_SWARM_ELECTRON_SMOKE === '1';
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
    backgroundColor: '#030714',
    show: !isSmoke,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(baseUrl || pathToFileURL(path.join(distDir, 'index.html')).toString());
  return win;
}

async function runSmoke(window) {
  const outputDir = path.resolve(__dirname, '..', 'test-results', `electron-smoke-${new Date().toISOString().replace(/[:.]/g, '-')}`);
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
      return {
        title: document.title,
        apiOk: api.ok,
        apiStatus: api.status,
        scene: textState?.scene || null,
        build: textState?.buildId || null,
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
  await startLocalServer();
  const win = createWindow();
  if (isSmoke) {
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
});
