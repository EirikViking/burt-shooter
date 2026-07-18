const { app, BrowserWindow, clipboard, dialog, ipcMain, net, protocol, screen, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createSteamLeaderboardBridge } = require('./steamLeaderboardBridge.cjs');
const { createSteamAchievementsBridge } = require('./steamAchievementsBridge.cjs');
const { runSteamLeaderboardRuntimeProbe } = require('./steamLeaderboardRuntimeProbe.cjs');
const { createNativeGamepadBridge } = require('./nativeGamepadBridge.cjs');
const { createSteamCloudSave } = require('./steamCloudSave.cjs');
const { getMaintainerDevtoolsState } = require('./maintainerDevtoolsGate.cjs');
const {
  DISPLAY_MODE_BORDERLESS,
  DISPLAY_MODE_FULLSCREEN,
  DEFAULT_WINDOW_SIZE,
  applyDisplaySettingsToWindow,
  getDisplayInfo,
  readDisplaySettings,
  writeDisplaySettings
} = require('./displaySettings.cjs');

const isSmoke = process.argv.includes('--smoke') || process.env.NOVA_SWARM_ELECTRON_SMOKE === '1';
const isControlSmoke = process.argv.includes('--control-smoke') || process.env.NOVA_SWARM_ELECTRON_CONTROL_SMOKE === '1';
const isPerfSmoke = process.argv.includes('--perf-smoke') || process.env.NOVA_SWARM_ELECTRON_PERF_SMOKE === '1';
const isSteamLeaderboardProbe = process.argv.includes('--steam-leaderboard-probe') || process.env.NOVA_SWARM_STEAM_LEADERBOARD_PROBE === '1';
const isSteamCloudDiagnostics = process.argv.includes('--steam-cloud-diagnostics') || process.env.NOVA_SWARM_STEAM_CLOUD_DIAGNOSTICS === '1';
const isSteamCaptureProbe = process.argv.includes('--steam-capture-probe') || process.env.NOVA_SWARM_STEAM_CAPTURE_PROBE === '1';
const isFramePacingProbe = process.argv.includes('--frame-pacing-probe') || process.env.NOVA_SWARM_FRAME_PACING_PROBE === '1';
const isFreshProfile = process.argv.includes('--nova-fresh-profile') || process.env.NOVA_SWARM_FRESH_PROFILE === '1';
const FRESH_PROFILE_STEAM_REASON = 'fresh_profile_isolated';
const isWindowed = process.argv.includes('--windowed') || process.env.NOVA_SWARM_WINDOWED === '1';
const shouldStartFullscreen = !isSmoke && !isControlSmoke && !isPerfSmoke && !isSteamLeaderboardProbe && !isSteamCloudDiagnostics && !isSteamCaptureProbe && !isWindowed;
const smokeMode = isSmoke ? 'smoke' : isControlSmoke ? 'control-smoke' : isPerfSmoke ? 'perf-smoke' : null;
const maintainerDevtoolsState = getMaintainerDevtoolsState(process.argv);
const distDir = path.resolve(__dirname, '..', 'dist');
const APP_PROTOCOL = 'nova-swarm';
protocol.registerSchemesAsPrivileged([{
  scheme: APP_PROTOCOL,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true
  }
}]);
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

let baseUrl = null;
const isolatedUserDataDir = process.env.NOVA_SWARM_USER_DATA_DIR
  ? path.resolve(process.env.NOVA_SWARM_USER_DATA_DIR)
  : isFreshProfile
    ? path.join(app.getPath('temp'), 'nova-swarm-fresh-profile')
  : smokeMode
    ? path.resolve(process.cwd(), 'test-results', `electron-${smokeMode}-user-data-${new Date().toISOString().replace(/[:.]/g, '-')}`)
    : null;
if (isolatedUserDataDir) {
  try {
    if (isFreshProfile && !process.env.NOVA_SWARM_USER_DATA_DIR && fs.existsSync(isolatedUserDataDir)) {
      fs.rmSync(isolatedUserDataDir, { recursive: true, force: true });
    }
    fs.mkdirSync(isolatedUserDataDir, { recursive: true });
    app.setPath('userData', isolatedUserDataDir);
  } catch (error) {
    console.warn('[NovaSwarm] Failed to isolate smoke userData path:', error?.message || String(error));
  }
}
const steamLeaderboardBridge = createSteamLeaderboardBridge({
  rootDir: path.resolve(__dirname, '..'),
  logger: console
});
const steamAchievementsBridge = createSteamAchievementsBridge({
  steamClientBridge: steamLeaderboardBridge,
  logger: console
});
const nativeGamepadBridge = createNativeGamepadBridge();
let steamCloudSave = null;
let steamProfileContext = { type: 'local', id: 'local-offline', reason: 'not_resolved' };
let desktopExitRequested = false;
let desktopExitFallbackTimer = null;
const MAX_SIGNAL_CARD_BYTES = 10 * 1024 * 1024;

function sanitizeSignalCardFilename(value) {
  const safe = String(value || 'nova-swarm-daily-signal.png')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'nova-swarm-daily-signal.png';
  return safe.toLowerCase().endsWith('.png') ? safe : `${safe}.png`;
}

function decodeSignalCardPng(dataUrl) {
  const match = String(dataUrl || '').match(/^data:image\/png;base64,([a-z0-9+/=]+)$/i);
  if (!match) throw new Error('invalid_png_data');
  const bytes = Buffer.from(match[1], 'base64');
  if (!bytes.length || bytes.length > MAX_SIGNAL_CARD_BYTES) throw new Error('invalid_png_size');
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < signature.length || !bytes.subarray(0, signature.length).equals(signature)) {
    throw new Error('invalid_png_signature');
  }
  return bytes;
}

function requestDesktopExit() {
  const alreadyRequested = desktopExitRequested;
  desktopExitRequested = true;
  setImmediate(() => app.quit());
  if (!desktopExitFallbackTimer) {
    desktopExitFallbackTimer = setTimeout(() => {
      for (const window of BrowserWindow.getAllWindows()) {
        try {
          window.destroy();
        } catch {
          // The process-level exit below is the final fallback.
        }
      }
      app.exit(0);
    }, 1600);
    desktopExitFallbackTimer.unref?.();
  }
  return { ok: true, alreadyRequested };
}

async function resolveSteamProfileContext() {
  if (isFreshProfile) {
    return {
      type: 'local',
      id: 'fresh-test-profile',
      steamId: null,
      personaName: null,
      reason: 'explicit_fresh_profile_test'
    };
  }
  const initialized = await steamLeaderboardBridge.initialize().catch(() => false);
  const steamId = initialized ? steamLeaderboardBridge.getCurrentSteamId() : null;
  if (steamId) {
    const personaName = await steamLeaderboardBridge.getPersonaName().catch(() => null);
    return {
      type: 'steam',
      id: steamId,
      steamId,
      personaName,
      reason: 'steam_identity_ready'
    };
  }
  return {
    type: 'local',
    id: 'local-offline',
    steamId: null,
    personaName: null,
    reason: steamLeaderboardBridge.getStatus?.().reason || 'steam_identity_unavailable'
  };
}

function getFreshProfileSteamStatus(surface) {
  return {
    available: false,
    reason: FRESH_PROFILE_STEAM_REASON,
    isolated: true,
    freshProfile: true,
    surface,
    appId: null,
    sdkPathConfigured: false,
    nativeModuleLoaded: false
  };
}

function getFreshProfileSteamResult(surface, extra = {}) {
  return {
    ok: false,
    success: false,
    ignored: true,
    reason: FRESH_PROFILE_STEAM_REASON,
    isolated: true,
    freshProfile: true,
    surface,
    ...extra
  };
}

function registerSteamLeaderboardIpc() {
  if (isFreshProfile) {
    ipcMain.handle('nova-steam-leaderboard:isAvailable', () => false);
    ipcMain.handle('nova-steam-leaderboard:getPersonaName', () => null);
    ipcMain.handle('nova-steam-leaderboard:getTopScores', () => []);
    ipcMain.handle('nova-steam-leaderboard:getFriendsScores', () => []);
    ipcMain.handle('nova-steam-leaderboard:submitScore', () => getFreshProfileSteamResult('leaderboard'));
    ipcMain.handle('nova-steam-leaderboard:submitScoreDetailed', () => getFreshProfileSteamResult('leaderboard'));
    ipcMain.handle('nova-steam-leaderboard:requestCurrentStats', () => getFreshProfileSteamResult('leaderboard'));
    ipcMain.handle('nova-steam-leaderboard:getLastUploadDiagnostics', () => getFreshProfileSteamResult('leaderboard'));
    ipcMain.handle('nova-steam-leaderboard:getStatus', () => getFreshProfileSteamStatus('leaderboard'));
    ipcMain.handle('nova-steam-leaderboard:getRuntimeInfo', () => getSteamRuntimeInfo());
    return;
  }
  ipcMain.handle('nova-steam-leaderboard:isAvailable', () => steamLeaderboardBridge.isAvailable());
  ipcMain.handle('nova-steam-leaderboard:getPersonaName', () => steamLeaderboardBridge.getPersonaName());
  ipcMain.handle('nova-steam-leaderboard:getTopScores', (_event, payload) => steamLeaderboardBridge.getTopScores(payload));
  ipcMain.handle('nova-steam-leaderboard:getFriendsScores', (_event, payload) => steamLeaderboardBridge.getFriendsScores(payload));
  ipcMain.handle('nova-steam-leaderboard:submitScore', (_event, payload) => steamLeaderboardBridge.submitScore(payload));
  ipcMain.handle('nova-steam-leaderboard:submitScoreDetailed', (_event, payload) => steamLeaderboardBridge.submitScoreDetailed(payload));
  ipcMain.handle('nova-steam-leaderboard:requestCurrentStats', () => steamLeaderboardBridge.requestCurrentStats());
  ipcMain.handle('nova-steam-leaderboard:getLastUploadDiagnostics', () => steamLeaderboardBridge.getLastUploadDiagnostics());
  ipcMain.handle('nova-steam-leaderboard:getStatus', () => steamLeaderboardBridge.getStatus());
  ipcMain.handle('nova-steam-leaderboard:getRuntimeInfo', () => getSteamRuntimeInfo());
}

function registerSteamAchievementsIpc() {
  if (isFreshProfile) {
    ipcMain.handle('nova-steam-achievements:getStatus', () => getFreshProfileSteamStatus('achievements'));
    ipcMain.handle('nova-steam-achievements:requestCurrentStats', () => getFreshProfileSteamResult('achievements'));
    ipcMain.handle('nova-steam-achievements:getAchievement', (_event, payload) => getFreshProfileSteamResult('achievements', {
      achievementId: payload?.id ?? payload ?? null
    }));
    ipcMain.handle('nova-steam-achievements:unlockAchievement', (_event, payload) => getFreshProfileSteamResult('achievements', {
      achievementId: payload?.id ?? payload ?? null
    }));
    ipcMain.handle('nova-steam-achievements:clearAchievement', (_event, payload) => getFreshProfileSteamResult('achievements', {
      achievementId: payload?.id ?? payload ?? null
    }));
    ipcMain.handle('nova-steam-achievements:syncUnlockedAchievements', (_event, payload) => getFreshProfileSteamResult('achievements', {
      requested: Array.isArray(payload?.ids) ? payload.ids : [],
      synced: [],
      skipped: [],
      steamUnlockedIds: []
    }));
    ipcMain.handle('nova-steam-achievements:clearAchievements', () => getFreshProfileSteamResult('achievements'));
    ipcMain.handle('nova-steam-achievements:getUnlockedAchievements', () => []);
    return;
  }
  ipcMain.handle('nova-steam-achievements:getStatus', () => steamAchievementsBridge.getStatus());
  ipcMain.handle('nova-steam-achievements:requestCurrentStats', () => steamAchievementsBridge.requestCurrentStats());
  ipcMain.handle('nova-steam-achievements:getAchievement', (_event, payload) => steamAchievementsBridge.getAchievement(payload?.id ?? payload));
  ipcMain.handle('nova-steam-achievements:unlockAchievement', (_event, payload) => steamAchievementsBridge.unlockAchievement(payload?.id ?? payload));
  ipcMain.handle('nova-steam-achievements:clearAchievement', (_event, payload) => steamAchievementsBridge.clearAchievement(payload?.id ?? payload));
  ipcMain.handle('nova-steam-achievements:syncUnlockedAchievements', (_event, payload) => steamAchievementsBridge.syncUnlockedAchievements(payload));
  ipcMain.handle('nova-steam-achievements:clearAchievements', (_event, payload) => steamAchievementsBridge.clearAchievements(payload));
  ipcMain.handle('nova-steam-achievements:getUnlockedAchievements', (_event, payload) => steamAchievementsBridge.getUnlockedAchievements(payload));
}

function registerAppIpc() {
  ipcMain.handle('nova-app:exitGame', async () => {
    if (smokeMode) {
      return { ok: false, canceled: true, reason: 'smoke_mode' };
    }
    return requestDesktopExit();
  });

  ipcMain.handle('nova-app:saveSignalCard', async (event, payload = {}) => {
    try {
      const bytes = decodeSignalCardPng(payload.dataUrl);
      const filename = sanitizeSignalCardFilename(payload.filename);
      const options = {
        defaultPath: path.join(app.getPath('pictures'), filename),
        filters: [{ name: 'PNG', extensions: ['png'] }],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      };
      const owner = BrowserWindow.fromWebContents(event.sender);
      const selection = owner
        ? await dialog.showSaveDialog(owner, options)
        : await dialog.showSaveDialog(options);
      if (selection.canceled || !selection.filePath) return { ok: false, canceled: true };
      const outputPath = selection.filePath.toLowerCase().endsWith('.png')
        ? selection.filePath
        : `${selection.filePath}.png`;
      fs.writeFileSync(outputPath, bytes, { flag: 'w' });
      return { ok: true, saved: true, filename: path.basename(outputPath) };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  });

  ipcMain.handle('nova-app:copyText', async (_event, payload = {}) => {
    try {
      const text = String(payload.text || '').replace(/[\u0000\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, '').trim();
      if (!text || text.length > 4096) return { ok: false, error: 'invalid_text' };
      clipboard.writeText(text);
      return { ok: true, copied: true };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  });

  ipcMain.handle('nova-performance-diagnostics:writeReport', async (_event, payload = {}) => {
    try {
      const root = path.join(app.getPath('userData'), 'performance-diagnostics');
      fs.mkdirSync(root, { recursive: true });
      const sessionId = String(payload.sessionId || 'session')
        .replace(/[^a-z0-9_-]/gi, '-')
        .slice(0, 80) || 'session';
      const report = {
        writtenAt: new Date().toISOString(),
        source: 'nova-performance-diagnostics',
        ...JSON.parse(JSON.stringify(payload || {}))
      };
      const sessionPath = path.join(root, `run-collision-diagnostics-${sessionId}.json`);
      const latestPath = path.join(root, 'run-collision-diagnostics-latest.json');
      const text = `${JSON.stringify(report, null, 2)}\n`;
      fs.writeFileSync(sessionPath, text, 'utf8');
      fs.writeFileSync(latestPath, text, 'utf8');
      return { ok: true, sessionPath, latestPath };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  });
}

function registerDisplayIpc(window) {
  ipcMain.handle('nova-display:getSettings', () => readDisplaySettings(app.getPath('userData')));
  ipcMain.handle('nova-display:getInfo', () => {
    const settings = readDisplaySettings(app.getPath('userData'));
    return {
      settings,
      ...getDisplayInfo(screen, window, settings)
    };
  });
  ipcMain.handle('nova-display:applySettings', (_event, payload) => {
    const settings = writeDisplaySettings(app.getPath('userData'), payload);
    return applyDisplaySettingsToWindow(window, screen, settings);
  });
}

function sendWindowBlurToRenderer(window) {
  try {
    if (!window || window.isDestroyed()) return;
    window.webContents.send('nova-app:window-blur');
  } catch {
    // Best-effort interruption signal for gameplay auto-pause.
  }
}

function registerInputIpc() {
  ipcMain.handle('nova-input:getNativeGamepads', () => ({
    status: nativeGamepadBridge.getStatus(),
    gamepads: nativeGamepadBridge.getGamepads()
  }));
}

function registerMaintainerDevtoolsIpc() {
  ipcMain.handle('nova-maintainer-devtools:getState', () => maintainerDevtoolsState);
}

function registerSteamCloudIpc() {
  ipcMain.handle('nova-steam-cloud:getProfileContext', () => steamProfileContext);
  ipcMain.handle('nova-steam-cloud:getDiagnostics', () => steamCloudSave?.getDiagnostics() || null);
  ipcMain.handle('nova-steam-cloud:readSave', () => steamCloudSave?.readSave() || null);
  ipcMain.handle('nova-steam-cloud:getPersistenceSummary', () => steamCloudSave?.getPersistenceSummary() || null);
  ipcMain.handle('nova-steam-cloud:mergeRendererState', (_event, payload) => steamCloudSave?.mergeRendererState(payload) || null);
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function getScorePath() {
  return path.join(app.getPath('userData'), 'local-highscores-v2.json');
}

const RANK_LEVEL_THRESHOLDS = [1, 2, 3, 5, 7, 9, 11, 14, 17, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60];
const PRE_RELEASE_SEED_SCORES = [
  { name: 'NOVAROOK', score: 500, level: 2 },
  { name: 'VOIDCADET', score: 900, level: 3 },
  { name: 'PIXELPILOT', score: 1200, level: 4 },
  { name: 'ORBITKID', score: 1800, level: 5 },
  { name: 'COMETACE', score: 2400, level: 6 },
  { name: 'NEONRIDER', score: 3100, level: 7 },
  { name: 'STARRUNNER', score: 3900, level: 8 },
  { name: 'QUANTUMQ', score: 4800, level: 9 },
  { name: 'SIGNALACE', score: 6200, level: 10 },
  { name: 'ARCADEZERO', score: 7900, level: 11 }
];

function getRankFromLevel(level) {
  const normalized = Math.max(1, Math.floor(Number(level) || 1));
  for (let i = RANK_LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (normalized >= RANK_LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

function getSeedScores() {
  return PRE_RELEASE_SEED_SCORES.map((entry, index) => ({
    ...entry,
    rankIndex: getRankFromLevel(entry.level),
    timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    source: 'pre_release_seed',
    seed: true,
    local: true
  }));
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
  steamCloudSave?.mirrorLocalHighscores(scores);
}

function parseHexDetailsString(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const compact = text.replace(/^0x/i, '').replace(/[^0-9a-f]/gi, '');
  if (compact.length < 8 || compact.length % 8 !== 0) return [];
  const details = [];
  for (let index = 0; index + 8 <= compact.length && details.length < 64; index += 8) {
    const chunk = compact.slice(index, index + 8);
    const b0 = Number.parseInt(chunk.slice(0, 2), 16);
    const b1 = Number.parseInt(chunk.slice(2, 4), 16);
    const b2 = Number.parseInt(chunk.slice(4, 6), 16);
    const b3 = Number.parseInt(chunk.slice(6, 8), 16);
    if ([b0, b1, b2, b3].some(byte => !Number.isFinite(byte))) continue;
    details.push(b0 | (b1 << 8) | (b2 << 16) | (b3 << 24));
  }
  return details;
}

function parseScoreDetails(value) {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value;
  if (ArrayBuffer.isView(value) && typeof value.length === 'number') return Array.from(value);
  if (typeof value === 'string') {
    const hexDetails = parseHexDetailsString(value);
    if (hexDetails.length) return hexDetails;
    return (value.match(/-?\d+/g) || []).map(Number);
  }
  if (typeof value === 'object' && Number.isFinite(Number(value.length))) {
    return Array.from({ length: Number(value.length) }, (_, index) => value[index]);
  }
  return [];
}

function readScoreLevel(entry = {}, fallback = 1) {
  const details = parseScoreDetails(
    entry.details ??
    entry.scoreDetails ??
    entry.m_pDetails ??
    entry.detailsHex ??
    entry.scoreDetailsHex ??
    entry.metadata?.details
  );
  for (const value of [
    entry.metadata?.level,
    entry.metadata?.levelReached,
    entry.detailsMetadata?.level,
    entry.detailsMetadata?.levelReached,
    details[0],
    entry.level,
    entry.levelReached
  ]) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(1, Math.floor(parsed));
  }
  return Math.max(1, Math.floor(Number(fallback) || 1));
}

function estimateScoreLevel(score) {
  const normalizedScore = Math.max(0, Math.floor(Number(score) || 0));
  if (normalizedScore <= 0) return 1;
  return Math.max(1, Math.min(99, Math.floor(normalizedScore / 5000) + 1));
}

function sanitizeScoreEntry(entry = {}) {
  const name = String(entry.name || 'PILOT').trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 14) || 'PILOT';
  const score = Math.max(0, Math.floor(Number(entry.score) || 0));
  const level = readScoreLevel(entry, estimateScoreLevel(score));
  const rankIndex = Math.max(0, Math.min(39, Math.floor(Number(entry.rankIndex ?? entry.rank_index) || getRankFromLevel(level))));
  return {
    name,
    score,
    level,
    rankIndex,
    rank_index: rankIndex,
    shipId: entry.shipId ?? entry.ship_id ?? null,
    shipName: entry.shipName ?? entry.ship_name ?? null,
    runTimeSeconds: entry.runTimeSeconds ?? entry.runtimeSeconds ?? null,
    kills: entry.kills ?? null,
    bossKills: entry.bossKills ?? null,
    wavesCleared: entry.wavesCleared ?? null,
    submissionId: entry.submissionId || null,
    timestamp: new Date().toISOString(),
    source: entry.source || 'local',
    local: true
  };
}

function sortScores(scores) {
  return scores.sort((a, b) => {
    const scoreDelta = (b.score || 0) - (a.score || 0);
    if (scoreDelta !== 0) return scoreDelta;
    return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
  });
}

async function handleLocalApi(request, requestUrl) {
  if (requestUrl.pathname !== '/api/highscores') {
    return jsonResponse(404, { error: 'Not found' });
  }

  if (request.method === 'GET') {
    const limit = Math.max(1, Math.min(100, Math.floor(Number(requestUrl.searchParams.get('limit')) || 20)));
    const storedScores = readLocalScores();
    const scores = (storedScores.length > 0 ? storedScores : getSeedScores())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
    return jsonResponse(200, scores);
  }

  if (request.method === 'POST') {
    try {
      const payload = await request.json();
      const scores = readLocalScores();
      const entry = sanitizeScoreEntry(payload);
      const duplicateIndex = entry.submissionId
        ? scores.findIndex((scoreEntry) => scoreEntry.submissionId === entry.submissionId)
        : -1;
      const nextScores = duplicateIndex >= 0 ? scores : [...scores, entry];
      sortScores(nextScores);
      writeLocalScores(nextScores);
      const savedEntry = duplicateIndex >= 0 ? scores[duplicateIndex] : entry;
      const placement = nextScores.findIndex((scoreEntry) => scoreEntry === savedEntry) + 1;
      return jsonResponse(200, { ok: true, score: savedEntry, placement, duplicate: duplicateIndex >= 0 });
    } catch (error) {
      return jsonResponse(400, { error: error?.message || 'Invalid score payload' });
    }
  }

  return jsonResponse(405, { error: 'Method not allowed' });
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

function resolveStaticFile(urlPath) {
  const filePath = resolveStaticPath(urlPath);
  const resolvedPath = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    ? filePath
    : path.join(distDir, 'index.html');
  return resolvedPath;
}

async function handleAppProtocol(request) {
  const requestUrl = new URL(request.url);
  const urlPath = requestUrl.hostname && requestUrl.hostname !== 'app'
    ? `/${requestUrl.hostname}${requestUrl.pathname}`
    : requestUrl.pathname;
  if (urlPath.startsWith('/api/')) {
    const apiUrl = new URL(requestUrl.toString());
    apiUrl.pathname = urlPath;
    return handleLocalApi(request, apiUrl);
  }
  const filePath = resolveStaticFile(urlPath);
  const response = await net.fetch(pathToFileURL(filePath).toString());
  const headers = new Headers(response.headers);
  const ext = path.extname(filePath).toLowerCase();
  headers.set('Content-Type', mimeTypes[ext] || headers.get('Content-Type') || 'application/octet-stream');
  headers.set('Cache-Control', ext === '.html' ? 'no-store' : 'public, max-age=31536000, immutable');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function registerAppProtocol() {
  await protocol.handle(APP_PROTOCOL, (request) => handleAppProtocol(request).catch((error) =>
    jsonResponse(500, { error: error?.message || 'App protocol error' })
  ));
  baseUrl = `${APP_PROTOCOL}://app`;
  return baseUrl;
}

function createWindow() {
  const displaySettings = readDisplaySettings(app.getPath('userData'));
  const startBorderless = shouldStartFullscreen && displaySettings.mode === DISPLAY_MODE_BORDERLESS;
  const primaryDisplay = screen.getPrimaryDisplay?.();
  const displayBounds = primaryDisplay?.bounds || { x: 0, y: 0, width: 1920, height: 1080 };
  const windowSize = displaySettings.windowSize || DEFAULT_WINDOW_SIZE;
  const win = new BrowserWindow({
    x: startBorderless ? displayBounds.x : undefined,
    y: startBorderless ? displayBounds.y : undefined,
    width: startBorderless ? displayBounds.width : windowSize.width,
    height: startBorderless ? displayBounds.height : windowSize.height,
    minWidth: 960,
    minHeight: 540,
    fullscreen: shouldStartFullscreen && displaySettings.mode === DISPLAY_MODE_FULLSCREEN,
    frame: !startBorderless,
    resizable: !startBorderless,
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

  const hasSteamLaunchHint = Boolean(
    process.env.SteamAppId
    || process.env.SteamGameId
    || process.env.SteamOverlayGameId
  );
  const shouldEnableSteamScreenshotCapture = !isFreshProfile
    && !isSmoke
    && !isControlSmoke
    && !isPerfSmoke
    && !isSteamLeaderboardProbe
    && !isSteamCloudDiagnostics
    && (app.isPackaged || hasSteamLaunchHint);
  if (shouldEnableSteamScreenshotCapture) {
    const captureSurface = steamLeaderboardBridge.enableElectronScreenshotCapture(win, {
      outputDir: path.join(app.getPath('temp'), 'nova-swarm-steam-screenshots')
    });
    console.log(`[NovaSwarm] Steam screenshot capture enabled=${captureSurface.enabled} reason=${captureSurface.reason} continuousMirror=${captureSurface.continuousMirror === true}`);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const gameUrl = baseUrl ? `${baseUrl}/?desktop=1` : pathToFileURL(path.join(distDir, 'index.html')).toString();
  const framePacingProbeUrl = baseUrl
    ? `${baseUrl}/frame-pacing-probe.html`
    : pathToFileURL(path.join(distDir, 'frame-pacing-probe.html')).toString();
  win.loadURL(isFramePacingProbe ? framePacingProbeUrl : gameUrl);
  return win;
}

async function getSteamRuntimeInfo() {
  const currentGameLanguage = isFreshProfile
    ? null
    : await steamLeaderboardBridge.getCurrentGameLanguage?.();
  const steamEnv = {
    SteamAppId: process.env.SteamAppId || null,
    SteamGameId: process.env.SteamGameId || null,
    SteamOverlayGameId: process.env.SteamOverlayGameId || null,
    SteamLanguage: process.env.SteamLanguage || null,
    STEAM_LANGUAGE: process.env.STEAM_LANGUAGE || null
  };
  return {
    appIsPackaged: app.isPackaged,
    defaultApp: Boolean(process.defaultApp),
    executable: process.execPath,
    cwd: process.cwd(),
    currentGameLanguage: currentGameLanguage || null,
    steamLanguage: currentGameLanguage || steamEnv.SteamLanguage || steamEnv.STEAM_LANGUAGE || null,
    appLocale: typeof app.getLocale === 'function' ? app.getLocale() : null,
    systemLocale: typeof app.getSystemLocale === 'function' ? app.getSystemLocale() : null,
    launchedBySteamHint: Boolean(steamEnv.SteamAppId || steamEnv.SteamGameId || steamEnv.SteamOverlayGameId),
    steamEnv,
    freshProfile: isFreshProfile,
    steamIntegrationIsolated: isFreshProfile,
    achievements: isFreshProfile
      ? getFreshProfileSteamStatus('achievements')
      : steamAchievementsBridge.getStatus()
  };
}

function getSteamCloudDiagnostics() {
  return steamCloudSave?.getDiagnostics() || null;
}

function waitForWindowLoad(window, timeoutMs, label) {
  if (!window.webContents.isLoading()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} load timeout`)), timeoutMs);
    window.webContents.once('did-finish-load', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function smokeLoadTimeoutMs() {
  const configured = Number(process.env.NOVA_SWARM_ELECTRON_SMOKE_LOAD_TIMEOUT_MS || 60000);
  return Math.max(20000, Math.min(120000, Number.isFinite(configured) ? configured : 60000));
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

  await waitForWindowLoad(window, smokeLoadTimeoutMs(), 'Electron smoke');
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
      const steamAchievementStatus = await window.__novaSteamAchievements?.getStatus?.().catch(error => ({ error: error?.message || String(error) }));
      const freshProfileSteamIsolated = steamBridgeStatus?.reason === 'fresh_profile_isolated';
      const freshProfileSubmitProbe = freshProfileSteamIsolated
        ? await window.__novaSteamLeaderboard?.submitScore?.({ score: 123, details: [1], uploadMethod: 'keep_best' })
        : null;
      const freshProfileAchievementProbe = freshProfileSteamIsolated
        ? await window.__novaSteamAchievements?.unlockAchievement?.('ACH_EARLY_PILOT')
        : null;
      const steamCloudDiagnostics = await window.__novaSteamCloud?.getDiagnostics?.().catch(error => ({ error: error?.message || String(error) }));
      return {
        title: document.title,
        apiOk: api.ok,
        apiStatus: api.status,
        steamBridgeStatus: steamBridgeStatus || null,
        steamAchievementStatus: steamAchievementStatus || null,
        freshProfileSteamIsolated,
        freshProfileSubmitProbe: freshProfileSubmitProbe || null,
        freshProfileAchievementProbe: freshProfileAchievementProbe || null,
        steamLeaderboardAvailable: Boolean(steamLeaderboardAvailable),
        steamLeaderboardBridgePresent: Boolean(window.__novaSteamLeaderboard),
        steamCloudDiagnostics,
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
  let runStartRequested = false;
  while (Date.now() - startedAt < 20000) {
    lastState = await readPlayState(window);
    if (!runStartRequested && lastState?.scene === 'menu') {
      runStartRequested = await window.webContents.executeJavaScript(`
        (async () => {
          const game = window.__game;
          if (!game || game.currentSceneName !== 'menu' || typeof game.startGame !== 'function') return false;
          return Boolean(await game.startGame());
        })()
      `, true).catch(() => false);
      if (runStartRequested) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
    }
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

async function setPerfSmokeAutopilot(window, enabled) {
  return window.webContents.executeJavaScript(`
    (() => {
      const setPressed = (pressedMap = {}) => {
        const play = window.__game?.scenes?.play;
        const inputs = [play?.inputManager, play?.player?.inputManager].filter(Boolean);
        const keys = ['ArrowLeft', 'KeyA', 'a', 'ArrowRight', 'KeyD', 'd', 'Space'];
        for (const key of keys) {
          const pressed = Boolean(pressedMap[key]);
          for (const input of inputs) input?.setKeyPressed?.(key, pressed);
        }
      };
      if (!${enabled ? 'true' : 'false'}) {
        if (window.__novaPerfSmokeAutopilot) {
          clearInterval(window.__novaPerfSmokeAutopilot);
          window.__novaPerfSmokeAutopilot = null;
        }
        setPressed({});
        return false;
      }
      if (window.__novaPerfSmokeAutopilot) clearInterval(window.__novaPerfSmokeAutopilot);
      window.__novaPerfSmokeAutopilot = setInterval(() => {
        const play = window.__game?.scenes?.play;
        const player = play?.player;
        const enemies = play?.enemyManager?.enemies || [];
        const target = enemies
          .filter((enemy) => enemy?.active && !enemy.waitingForEntry && Number.isFinite(enemy.x) && Number.isFinite(enemy.y))
          .sort((a, b) => Math.abs((a.x || 0) - (player?.x || 0)) - Math.abs((b.x || 0) - (player?.x || 0)))[0];
        const dx = target && player ? target.x - player.x : 0;
        setPressed({
          ArrowLeft: dx < -24,
          KeyA: dx < -24,
          a: dx < -24,
          ArrowRight: dx > 24,
          KeyD: dx > 24,
          d: dx > 24,
          Space: true
        });
      }, 160);
      return true;
    })()
  `);
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

  await waitForWindowLoad(window, smokeLoadTimeoutMs(), 'Electron control smoke');
  await window.loadURL(`${baseUrl}/?desktop=1&controlSmoke=1`);
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

async function runPerfSmoke(window) {
  const outputDir = path.resolve(
    process.env.NOVA_SWARM_ELECTRON_PERF_SMOKE_OUTPUT_DIR || path.join(process.cwd(), 'test-results', `electron-perf-smoke-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  );
  fs.mkdirSync(outputDir, { recursive: true });
  const consoleEvents = [];
  const ignoredConsoleEvents = [];
  window.webContents.on('console-message', (_event, level, message) => {
    const text = String(message);
    if (text.includes('Electron Security Warning') && text.includes('will not show up')) return;
    if (text.includes('[WaveStallWatchdog]') && text.includes('clearing stuck wave')) {
      ignoredConsoleEvents.push({ level, message: text.slice(0, 500) });
      return;
    }
    if (level >= 2) consoleEvents.push({ level, message: text.slice(0, 500) });
  });

  await waitForWindowLoad(window, smokeLoadTimeoutMs(), 'Electron perf smoke');
  await window.loadURL(`${baseUrl}/?desktop=1&perf=1`);
  const startState = await waitForPlay(window);
  await window.webContents.executeJavaScript(`
    (() => {
      const app = window.__app || window.__PIXI_APP;
      app?.start?.();
      app?.ticker?.start?.();
      window.__perfSmokeTickerProbe = {
        appExists: Boolean(app),
        tickerExists: Boolean(app?.ticker),
        tickerStarted: Boolean(app?.ticker?.started),
        tickerMaxFPS: Number(app?.ticker?.maxFPS || 0),
        tickerMinFPS: Number(app?.ticker?.minFPS || 0)
      };
      const play = window.__game?.scenes?.play;
      const player = play?.player;
      if (player) {
        player.invulnerable = true;
        player.invulnerableTime = 1e9;
      }
    })()
  `);
  window.webContents.focus();
  window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space' });
  await setPerfSmokeAutopilot(window, true);
  await ensureUnpaused(window);

  const durationMs = Math.max(5000, Number(process.env.NOVA_SWARM_PERF_SMOKE_DURATION_MS || 60000));
  const sampleMs = Math.max(1000, Number(process.env.NOVA_SWARM_PERF_SMOKE_SAMPLE_MS || 5000));
  const minRequiredFps = Math.max(1, Number(process.env.NOVA_SWARM_PERF_SMOKE_MIN_FPS || 50));
  const warmupSamples = Math.max(0, Number(process.env.NOVA_SWARM_PERF_SMOKE_WARMUP_SAMPLES || 1));
  const samples = [];
  const startedAt = Date.now();

  try {
    while (Date.now() - startedAt < durationMs) {
      await new Promise((resolve) => setTimeout(resolve, sampleMs));
      await ensureUnpaused(window);
      const elapsedMs = Date.now() - startedAt;
      const sample = await window.webContents.executeJavaScript(`
        (() => {
          const perf = window.__perfStats || {};
          const textState = typeof window.render_game_to_text === 'function' ? JSON.parse(window.render_game_to_text()) : null;
          if ((!perf.fps || perf.scene === 'boot') && typeof window.advanceTime === 'function') {
            window.advanceTime(${Math.round(sampleMs)});
          }
          const nextPerf = window.__perfStats || perf;
          const nextTextState = typeof window.render_game_to_text === 'function' ? JSON.parse(window.render_game_to_text()) : textState;
          return {
            elapsedMs: ${Math.round(elapsedMs)},
            fps: Number(nextPerf.fps || 0),
            frameMs: Number(nextPerf.frameMs || 0),
            delta: Number(nextPerf.delta || 0),
            clampedDelta: Number(nextPerf.clampedDelta || 0),
            renderer: nextPerf.renderer || null,
            scene: nextPerf.scene || nextTextState?.scene || null,
            textScene: nextTextState?.scene || null,
            perfLastFrameAgeMs: Number(nextPerf.lastFrameTime ? performance.now() - nextPerf.lastFrameTime : 0),
            tickerProbe: window.__perfSmokeTickerProbe || null,
            manualAdvanceUsed: Boolean((!perf.fps || perf.scene === 'boot') && typeof window.advanceTime === 'function'),
            level: Number(nextPerf.level || nextTextState?.level || 0),
            bullets: Number(nextPerf.bullets || nextTextState?.counts?.bullets || 0),
            enemies: Number(nextPerf.enemies || nextTextState?.counts?.enemies || 0),
            particles: Number(nextPerf.particles || 0),
            children: Number(nextPerf.children || 0),
            lives: Number(nextTextState?.lives || 0),
            score: Number(nextTextState?.score || 0),
            fatal: Boolean(nextPerf.fatal || nextTextState?.overlays?.fatal)
          };
        })()
      `);
      samples.push(sample);
      console.log(`[electron-perf] t=${Math.round(elapsedMs / 1000)}s fps=${sample.fps.toFixed(1)} ms=${sample.frameMs.toFixed(1)} level=${sample.level} enemies=${sample.enemies} bullets=${sample.bullets} scene=${sample.scene}`);
    }
  } finally {
    window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
    await setPerfSmokeAutopilot(window, false).catch(() => {});
  }

  const measuredSamples = samples.slice(warmupSamples);
  const fpsValues = measuredSamples.map((sample) => sample.fps).filter(Number.isFinite);
  const minFps = fpsValues.length ? Math.min(...fpsValues) : 0;
  const avgFps = fpsValues.length ? fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length : 0;
  const finalState = await readPlayState(window).catch(() => null);
  let captureError = null;
  let screenshotWritten = false;
  for (let attempt = 1; attempt <= 3 && !screenshotWritten; attempt += 1) {
    try {
      if (attempt > 1) await new Promise((resolve) => setTimeout(resolve, 350));
      const image = await window.webContents.capturePage();
      fs.writeFileSync(path.join(outputDir, '01-electron-perf-final.png'), image.toPNG());
      screenshotWritten = true;
    } catch (error) {
      captureError = error?.message || String(error);
    }
  }
  const errors = [
    ...(minFps >= minRequiredFps ? [] : [`min FPS ${minFps.toFixed(1)} below ${minRequiredFps}`]),
    ...(samples.some((sample) => sample.fatal) ? ['fatal overlay detected'] : []),
    ...(finalState?.scene === 'play' ? [] : [`final scene was ${finalState?.scene || 'unknown'}`]),
    ...(consoleEvents.length ? [`${consoleEvents.length} console event(s)`] : []),
    ...(screenshotWritten ? [] : [`perf screenshot capture failed: ${captureError || 'unknown'}`])
  ];
  const warnings = [
    ...(ignoredConsoleEvents.length ? [`ignored ${ignoredConsoleEvents.length} WaveStallWatchdog perf telemetry event(s)`] : []),
    ...(captureError && screenshotWritten ? [`capturePage retry recovered after: ${captureError}`] : [])
  ];
  const report = {
    status: errors.length ? 'failed' : 'passed',
    baseUrl,
    outputDir,
    build: startState.build || null,
    gitSha: startState.gitSha || null,
    durationMs,
    minRequiredFps,
    warmupSamples,
    minFps,
    avgFps,
    samples,
    finalState,
    consoleEvents,
    ignoredConsoleEvents,
    warnings,
    errors
  };
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    outputDir,
    baseUrl,
    build: report.build,
    minFps,
    avgFps,
    sampleCount: samples.length,
    warnings,
    errors
  }, null, 2));
  if (errors.length) throw new Error(`Electron perf smoke failed: ${errors.join('; ')}`);
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

async function runSteamCaptureProbe(window) {
  const rendered = await waitForRenderedScene(window);
  const settleMs = Math.max(
    500,
    Math.min(5000, Number(process.env.NOVA_SWARM_STEAM_CAPTURE_PROBE_SETTLE_MS) || 1000)
  );
  await new Promise((resolve) => setTimeout(resolve, settleMs));
  const captureSurface = steamLeaderboardBridge.getCaptureSurfaceStatus();
  const outputDir = process.env.NOVA_SWARM_STEAM_CAPTURE_PROBE_OUTPUT_DIR
    ? path.resolve(process.env.NOVA_SWARM_STEAM_CAPTURE_PROBE_OUTPUT_DIR)
    : path.join(app.getPath('temp'), 'nova-swarm-steam-screenshots');
  const screenshot = await steamLeaderboardBridge.triggerSteamScreenshot(window, {
    outputDir,
    source: 'automated_probe'
  });
  const report = {
    status: captureSurface.enabled && captureSurface.continuousMirror === false && screenshot.ok ? 'passed' : 'failed',
    rendered,
    captureSurface,
    screenshot,
    runtimeInfo: await getSteamRuntimeInfo()
  };
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'runtime-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[NovaSwarmSteamCaptureProbe] ${JSON.stringify(report)}`);
  const holdMs = Math.max(4000, Math.min(15000, Number(process.env.NOVA_SWARM_STEAM_CAPTURE_PROBE_HOLD_MS) || 7200));
  await new Promise((resolve) => setTimeout(resolve, holdMs));
  return report;
}

async function runFramePacingProbe(window) {
  const outputDir = path.resolve(
    process.env.NOVA_SWARM_FRAME_PACING_PROBE_OUTPUT_DIR
      || path.join(process.cwd(), 'test-results', `frame-pacing-runtime-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  );
  fs.mkdirSync(outputDir, { recursive: true });
  const durationMs = Math.max(
    10000,
    Math.min(60000, Number(process.env.NOVA_SWARM_FRAME_PACING_PROBE_DURATION_MS) || 30000)
  );
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    const ready = await window.webContents.executeJavaScript('Boolean(window.__novaFramePacingProbe?.ready)').catch(() => false);
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const ready = await window.webContents.executeJavaScript('Boolean(window.__novaFramePacingProbe?.ready)').catch(() => false);
  if (!ready) throw new Error('Frame pacing probe page did not become ready');

  await new Promise((resolve) => setTimeout(resolve, 1500));
  await window.webContents.executeJavaScript('window.__novaFramePacingProbe.reset()');
  const appMetricsBefore = app.getAppMetrics();
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  const page = await window.webContents.executeJavaScript('window.__novaFramePacingProbe.getReport()');
  const appMetricsAfter = app.getAppMetrics();
  const gpuFeatureStatus = app.getGPUFeatureStatus();
  const gpuInfo = await app.getGPUInfo('basic').catch((error) => ({
    unavailable: true,
    reason: error?.message || String(error)
  }));
  await window.webContents.executeJavaScript(
    'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
  );
  const screenshot = await window.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'frame-pacing-probe-final.png'), screenshot.toPNG());

  const timing = page.timing?.requestAnimationFrame || {};
  const errors = [
    ...(page.rates?.requestAnimationFrameHz >= 55 ? [] : [`requestAnimationFrame rate ${page.rates?.requestAnimationFrameHz || 0} Hz below 55 Hz`]),
    ...(page.rates?.fixedSimulationStepHz >= 59 && page.rates?.fixedSimulationStepHz <= 61
      ? []
      : [`fixed simulation rate ${page.rates?.fixedSimulationStepHz || 0} Hz outside 59-61 Hz`]),
    ...(page.rates?.renderInvocationHz >= 55 ? [] : [`render invocation rate ${page.rates?.renderInvocationHz || 0} Hz below 55 Hz`]),
    ...(timing.p95Ms <= 20 ? [] : [`rAF p95 ${timing.p95Ms ?? 'missing'} ms above 20 ms`]),
    ...(timing.p99Ms <= (1000 / 30) ? [] : [`rAF p99 ${timing.p99Ms ?? 'missing'} ms above 33.3 ms`]),
    ...(Math.abs(page.wallClockDriftPercent) <= 0.5 ? [] : [`wall-clock drift ${page.wallClockDriftPercent}% above 0.5%`]),
    ...(page.display?.documentVisibility === 'visible' ? [] : [`document visibility was ${page.display?.documentVisibility || 'unknown'}`])
  ];
  const report = {
    status: errors.length ? 'failed' : 'passed',
    generatedAt: new Date().toISOString(),
    outputDir,
    durationMs,
    runtime: {
      appIsPackaged: app.isPackaged,
      executable: process.execPath,
      chromium: process.versions.chrome,
      electron: process.versions.electron,
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      windowFocused: window.isFocused(),
      windowVisible: window.isVisible(),
      fullscreen: window.isFullScreen(),
      captureSurface: steamLeaderboardBridge.getCaptureSurfaceStatus(),
      gpuFeatureStatus,
      gpuInfo
    },
    page,
    cpu: {
      appMetricsBefore,
      appMetricsAfter
    },
    screenshot: path.join(outputDir, 'frame-pacing-probe-final.png'),
    errors
  };
  fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[NovaSwarmFramePacingProbe] ${JSON.stringify({
    status: report.status,
    outputDir,
    rafHz: page.rates?.requestAnimationFrameHz,
    renderHz: page.rates?.renderInvocationHz,
    fixedStepHz: page.rates?.fixedSimulationStepHz,
    p95Ms: timing.p95Ms,
    p99Ms: timing.p99Ms,
    maxMs: timing.maxMs,
    errors
  })}`);
  return report;
}

app.whenReady().then(async () => {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error(`Missing build output at ${distDir}. Run npm run build first.`);
  }
  steamProfileContext = await resolveSteamProfileContext();
  steamCloudSave = createSteamCloudSave(app.getPath('userData'), console, {
    profile: steamProfileContext
  });
  const initializedCloudSave = steamCloudSave.ensureInitialized();
  if (isSteamCloudDiagnostics) {
    console.log(JSON.stringify({
      ...getSteamCloudDiagnostics(),
      save: initializedCloudSave
    }, null, 2));
    app.quit();
    return;
  }
  registerSteamLeaderboardIpc();
  registerSteamAchievementsIpc();
  registerAppIpc();
  registerInputIpc();
  registerMaintainerDevtoolsIpc();
  registerSteamCloudIpc();
  await registerAppProtocol();
  const win = createWindow();
  registerDisplayIpc(win);
  const notifyWindowBlur = () => sendWindowBlurToRenderer(win);
  win.on('blur', notifyWindowBlur);
  app.on('browser-window-blur', (_event, blurredWindow) => {
    if (blurredWindow === win) notifyWindowBlur();
  });
  if (isFramePacingProbe) {
    try {
      const report = await runFramePacingProbe(win);
      if (report.status !== 'passed') {
        throw new Error(`Frame pacing probe failed: ${JSON.stringify(report.errors)}`);
      }
      app.quit();
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  } else if (isSteamCaptureProbe) {
    try {
      const report = await runSteamCaptureProbe(win);
      if (
        !report.captureSurface?.enabled
        || report.captureSurface?.continuousMirror !== false
        || !report.screenshot?.ok
      ) {
        throw new Error(`Steam capture probe failed: ${JSON.stringify(report)}`);
      }
      app.quit();
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  } else if (isSteamLeaderboardProbe) {
    try {
      await runSteamLeaderboardRuntimeProbe({
        window: win,
        baseUrl,
        args: process.argv.slice(2),
        runtimeInfo: await getSteamRuntimeInfo(),
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
  } else if (isPerfSmoke) {
    try {
      await runPerfSmoke(win);
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
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  steamLeaderboardBridge.shutdown();
});

app.on('will-quit', () => {
  if (desktopExitFallbackTimer) {
    clearTimeout(desktopExitFallbackTimer);
    desktopExitFallbackTimer = null;
  }
});
