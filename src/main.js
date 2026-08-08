import './styles.css';
import * as PIXI from 'pixi.js';
import { Game } from './game/Game.js';
import { RUN_MODES, getRunModeProfile } from './game/RunMode.js';
import { summarizeRunReport } from './game/RunReport.js';
import { POINT_DEFENSE_RADIUS } from './game/ProjectileDefenseRules.js';
import { AudioManager } from './audio/AudioManager.js';
import { BootWatchdog } from './utils/BootWatchdog.js';
import { installConsoleLogFilter } from './utils/Logger.js';
import { getLoadingLines } from './text/phrasePool.js';
import { applyResponsiveLayout, addResponsiveListener, getCurrentLayout } from './ui/responsiveLayout.js';
import { getAccessibilitySettings } from './config/AccessibilitySettings.js';
import { applyDisplaySettings, getDisplaySettings } from './config/DisplaySettings.js';
import { getShipUnlockHistoryLine, getShipUnlockProgress, getShipUnlockRequirementLine, getShipUsage, isShipUnlocked } from './config/ShipMetadata.js';
import { getSectorInfo } from './config/SectorCatalog.js';
import { getRunPacingDebugState } from './config/RunPacingConfig.js';
import { RARE_CHAOS_VISITOR_VARIANT_COUNT, RARE_CHAOS_VISITOR_WAVE_CHANCE } from './config/RareChaosVisitors.js';
import {
  getMaintainerDevtoolsState,
  initializeMaintainerDevtools,
  isMaintainerDevtoolsEnabled
} from './config/MaintainerDevtools.js';
import { getThreatCodexCatalog } from './config/ThreatCodexCatalog.js';
import { getCodexCompletionCounts, getDiscoveriesThisRun, getDiscoveryStats } from './progression/ThreatDiscoveryState.js';
import { getHangarProgressSummary } from './progression/HangarProgressState.js';
import {
  getActiveProfileStorageContext,
  installProfileStorageNamespace
} from './profile/ProfileStorageNamespace.js';
import { getGameplayCursorDebugState } from './ui/GameplayCursor.js';
import {
  LANGUAGE_CHANGE_EVENT,
  getCurrentLanguage,
  getLanguagePreferenceMode,
  getSupportedLanguages,
  initLocalization,
  translateText
} from './i18n/index.js';
import { installPixiTextLocalization } from './i18n/pixiTextLocalization.js';
import {
  collectSteamCloudPersistenceState,
  restoreSteamCloudPersistenceToStorage,
  summarizeSteamCloudPersistence
} from './steamCloudPersistence.js';

installConsoleLogFilter();
installPixiTextLocalization(PIXI);

const BOOT_RENDER_TIMEOUT_MS = 5000;
const DOM_READY_TIMEOUT_MS = 2000;
const PERF_SAMPLE_MS = 500;
const MAX_DELTA = 2;
const urlParams = new URLSearchParams(window.location.search);
const perfState = {
  enabled: false,
  lastFrameTime: 0,
  fps: 0,
  frameMs: 0,
  delta: 0,
  clampedDelta: 0,
  bullets: 0,
  enemies: 0,
  particles: 0,
  children: 0,
  level: 0,
  scene: 'boot',
  renderer: '',
  memory: 0,
  fatal: false
};
const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
const GIT_SHA = typeof __GIT_SHA__ !== 'undefined' ? __GIT_SHA__ : 'unknown';
const bootState = {
  completed: false,
  fatalShown: false,
  fatalLogged: false
};
const supportsAsyncInit = typeof PIXI.Application?.prototype?.init === 'function';
let autoStartTriggered = false;
let profileStorageContext = getActiveProfileStorageContext();

applyResponsiveLayout(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  applyResponsiveLayout(window.innerWidth, window.innerHeight);
});
window.addEventListener('orientationchange', () => {
  applyResponsiveLayout(window.innerWidth, window.innerHeight);
});
installSteamDiagnosticsExport();
installSteamCloudStateExport();

function isBootDebugEnabled() {
  return urlParams.get('debug') === '1' && isMaintainerDevtoolsEnabled();
}

function isPerfEnabled() {
  return urlParams.get('perf') === '1' && isMaintainerDevtoolsEnabled();
}

function isAutoStartEnabled() {
  return urlParams.get('autostart') === '1';
}

function isDesktopRuntime() {
  return urlParams.get('desktop') === '1' || window.__NOVA_SWARM_DESKTOP__ === true;
}

function readLastSteamUploadDiagnostics() {
  try {
    if (window.__novaLastSteamUploadDiagnostics) return window.__novaLastSteamUploadDiagnostics;
    const raw = window.localStorage?.getItem('novaSwarm.lastSteamUploadDiagnostics.v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function collectSteamDiagnostics() {
  const bridge = window.__novaSteamBridge || null;
  const leaderboards = window.__novaSteamLeaderboard || bridge?.leaderboards || null;
  const achievements = bridge?.achievements || window.__novaSteamAchievements || null;
  const [bridgeStatus, runtimeInfo, personaName, latestUploadDiagnostics, achievementStatus] = await Promise.all([
    bridge?.getStatus?.().catch(error => ({ error: error?.message || String(error) })) || null,
    (bridge?.getRuntimeInfo?.() || leaderboards?.getRuntimeInfo?.())?.catch?.(error => ({ error: error?.message || String(error) })) || null,
    leaderboards?.getPersonaName?.().catch(() => null) || null,
    leaderboards?.getLastUploadDiagnostics?.().catch(() => null) || null,
    achievements?.getStatus?.().catch(error => ({ error: error?.message || String(error) })) || null
  ]);
  return {
    generatedAt: new Date().toISOString(),
    buildId: BUILD_ID,
    gitSha: GIT_SHA,
    url: window.location.href,
    scene: getStableSceneName(window.__game),
    score: window.__game?.score ?? null,
    level: window.__game?.level ?? null,
    lastLeaderboardResult: window.__game?.lastLeaderboardResult || null,
    bridgeStatus,
    runtimeInfo,
    launchedBySteamHint: Boolean(runtimeInfo?.launchedBySteamHint),
    steamEnv: runtimeInfo?.steamEnv || null,
    personaName,
    achievementStatus,
    achievementState: window.__game?.getAchievementDebugState?.() || null,
    latestUploadDiagnostics,
    storedUploadDiagnostics: readLastSteamUploadDiagnostics()
  };
}

function collectSteamCloudRendererState() {
  return collectSteamCloudPersistenceState({
    game: window.__game,
    getShipUnlockProgress,
    getAccessibilitySettings,
    getLanguagePreferenceMode,
    getCurrentLanguage
  });
}

async function initializeProfileStorageNamespace() {
  const api = window.__novaSteamCloud;
  const context = await api?.getProfileContext?.().catch(error => ({
    type: 'local',
    id: 'local-offline',
    reason: error?.message || 'profile_context_unavailable'
  }));
  profileStorageContext = installProfileStorageNamespace(context || {});
  return {
    bootDetail: `${profileStorageContext.type}:${profileStorageContext.storageId}`
  };
}

async function syncSteamCloudRendererState() {
  const api = window.__novaSteamCloud;
  if (!api?.mergeRendererState) return null;
  return api.mergeRendererState(collectSteamCloudRendererState());
}

async function collectSteamCloudDiagnostics() {
  const api = window.__novaSteamCloud;
  const [electron, save] = await Promise.all([
    api?.getDiagnostics?.().catch(error => ({ error: error?.message || String(error) })) || null,
    api?.readSave?.().catch(error => ({ error: error?.message || String(error) })) || null
  ]);
  return {
    generatedAt: new Date().toISOString(),
    buildId: BUILD_ID,
    gitSha: GIT_SHA,
    rendererState: collectSteamCloudRendererState(),
    profileStorage: getActiveProfileStorageContext(),
    persistenceSummary: summarizeSteamCloudPersistence(save),
    electron,
    save
  };
}

async function logSteamCloudDiagnostics() {
  const diagnostics = await collectSteamCloudDiagnostics();
  console.info('[SteamCloudDiagnostics]', diagnostics);
  return diagnostics;
}

function installSteamCloudStateExport() {
  window.__novaSteamCloudDiagnostics = Object.freeze({
    collect: collectSteamCloudDiagnostics,
    log: logSteamCloudDiagnostics,
    sync: syncSteamCloudRendererState
  });
  window.addEventListener('pagehide', () => {
    syncSteamCloudRendererState().catch(() => {});
  });
  window.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
    syncSteamCloudRendererState().catch(() => {});
  });
  window.addEventListener('keydown', (event) => {
    if (!isMaintainerDevtoolsEnabled()) return;
    if (event.ctrlKey && event.altKey && event.shiftKey && event.code === 'KeyC') {
      event.preventDefault();
      logSteamCloudDiagnostics();
    }
  });
}

async function restoreSteamCloudPersistence() {
  const api = window.__novaSteamCloud;
  if (!api?.readSave) return null;
  const save = await api.readSave();
  return restoreSteamCloudPersistenceToStorage(save);
}

async function copySteamDiagnostics() {
  const diagnostics = await collectSteamDiagnostics();
  const text = JSON.stringify(diagnostics, null, 2);
  try {
    await navigator.clipboard?.writeText?.(text);
    console.info('[SteamDiagnostics] copied to clipboard', diagnostics);
  } catch {
    console.info('[SteamDiagnostics] clipboard unavailable; diagnostics follow:', diagnostics);
  }
  return diagnostics;
}

function installSteamDiagnosticsExport() {
  window.__novaSteamDiagnostics = Object.freeze({
    collect: collectSteamDiagnostics,
    copy: copySteamDiagnostics,
    log: async () => {
      const diagnostics = await collectSteamDiagnostics();
      console.info('[SteamDiagnostics]', diagnostics);
      return diagnostics;
    }
  });
  window.addEventListener('keydown', (event) => {
    if (!isMaintainerDevtoolsEnabled()) return;
    if (event.ctrlKey && event.altKey && event.shiftKey && event.code === 'KeyD') {
      event.preventDefault();
      copySteamDiagnostics();
    }
  });
}

function ensureBuildStamp() {
  let stamp = document.getElementById('build-stamp');
  if (stamp) {
    return stamp;
  }

  stamp = document.createElement('div');
  stamp.id = 'build-stamp';
  stamp.textContent = `Build ${BUILD_ID} | ${GIT_SHA}`;

  // Position build stamp to avoid mobile controls
  const layout = getCurrentLayout();
  const isMobile = layout.isMobile;
  const bottomPos = isMobile ? '2px' : '8px';
  const leftPos = isMobile ? '8px' : 'auto';
  const rightPos = isMobile ? 'auto' : '8px';

  stamp.style.cssText = [
    'position: fixed',
    `left: ${leftPos}`,
    `right: ${rightPos}`,
    `bottom: ${bottomPos}`,
    'z-index: 9999',
    'background: rgba(0, 0, 0, 0.7)',
    'color: #00ffff',
    'padding: 2px 6px',
    'font-family: "Rajdhani", "Cascadia Mono", "Segoe UI", sans-serif',
    'font-size: 10px',
    'letter-spacing: 0.5px',
    'pointer-events: none'
  ].join(';');

  const parent = document.body || document.documentElement;
  if (parent) {
    parent.appendChild(stamp);
  }

  // Update stamp position on layout changes
  const updateStampPosition = (newLayout) => {
    const newIsMobile = newLayout.isMobile;
    stamp.style.left = newIsMobile ? '8px' : 'auto';
    stamp.style.right = newIsMobile ? 'auto' : '8px';
    stamp.style.bottom = newIsMobile ? '2px' : '8px';
  };
  addResponsiveListener(updateStampPosition);

  return stamp;
}

function createPerfOverlay(enabled) {
  if (!enabled) return null;

  const overlay = document.createElement('div');
  overlay.id = 'perf-overlay';

  // Apply initial position with safe margin
  const layout = getCurrentLayout();
  const safeMargin = layout.safeArea;
  const topPos = `${safeMargin.top}px`;
  const rightPos = `${window.innerWidth - safeMargin.right}px`;

  overlay.style.cssText = [
    'position: fixed',
    `top: ${topPos}`,
    `right: ${rightPos}`,
    'z-index: 9999',
    'background: rgba(0, 0, 0, 0.75)',
    'color: #00ff88',
    'padding: 8px 10px',
    'font-family: "Rajdhani", "Cascadia Mono", "Segoe UI", sans-serif',
    'font-size: 12px',
    'white-space: pre',
    'pointer-events: none',
    'text-align: right',
    'transform: translateX(100%)'
  ].join(';');

  const parent = document.body || document.documentElement;
  if (parent) {
    parent.appendChild(overlay);
  }

  // Update position on layout changes
  const updatePosition = (newLayout) => {
    const newSafeMargin = newLayout.safeArea;
    overlay.style.top = `${newSafeMargin.top}px`;
    overlay.style.right = `${window.innerWidth - newSafeMargin.right}px`;
  };
  addResponsiveListener(updatePosition);

  const update = () => {
    const memMb = perfState.memory ? (perfState.memory / (1024 * 1024)).toFixed(1) : 'n/a';
    overlay.textContent = [
      `FPS: ${perfState.fps.toFixed(1)} (${perfState.frameMs.toFixed(1)} ms)`,
      `Delta: ${perfState.delta.toFixed(2)} (clamped ${perfState.clampedDelta.toFixed(2)})`,
      `Bullets: ${perfState.bullets}  Enemies: ${perfState.enemies}`,
      `Particles: ${perfState.particles}  Children: ${perfState.children}`,
      `Level: ${perfState.level}  Scene: ${perfState.scene}`,
      `Renderer: ${perfState.renderer}`,
      `Heap: ${memMb} MB`
    ].join('\n');
  };

  update();
  setInterval(update, PERF_SAMPLE_MS);
  return overlay;
}

function updatePerfStats(app, game, delta, clampedDelta) {
  perfState.lastFrameTime = performance.now();
  perfState.frameMs = app.ticker.deltaMS || (Number.isFinite(delta) && delta > 0 ? delta * (1000 / 60) : 0);
  const tickerFps = Number(app.ticker.FPS);
  perfState.fps = Number.isFinite(tickerFps) && tickerFps > 0
    ? tickerFps
    : (perfState.frameMs ? 1000 / perfState.frameMs : 0);
  perfState.delta = delta;
  perfState.clampedDelta = clampedDelta;
  perfState.level = game?.level || 0;
  perfState.renderer = app.renderer?.constructor?.name || perfState.renderer;

  const playScene = game?.scenes?.play;
  const isPlayScene = playScene && game?.currentScene === playScene;
  perfState.scene = getStableSceneName(game);

  if (isPlayScene && playScene) {
    const bulletManager = playScene.bulletManager;
    perfState.bullets = bulletManager ? (bulletManager.playerBullets.length + bulletManager.enemyBullets.length) : 0;
    perfState.enemies = playScene.enemyManager ? playScene.enemyManager.enemies.length : 0;
    perfState.particles = playScene.particleManager ? playScene.particleManager.particles.length : 0;
    perfState.children = playScene.gameContainer ? playScene.gameContainer.children.length : 0;
  } else {
    perfState.bullets = 0;
    perfState.enemies = 0;
    perfState.particles = 0;
    perfState.children = app?.stage?.children?.length || 0;
  }

  if (performance && performance.memory && performance.memory.usedJSHeapSize) {
    perfState.memory = performance.memory.usedJSHeapSize;
  }
}

function publishTickerFrameTiming(game, rawDelta, clampedDelta, source = 'pixi_ticker') {
  if (!game) return;
  const raw = Number.isFinite(rawDelta) ? rawDelta : 0;
  const clamped = Number.isFinite(clampedDelta) ? clampedDelta : raw;
  game.lastTickerFrameTiming = {
    source,
    rawDelta: raw,
    clampedDelta: clamped,
    rawDeltaMs: raw * (1000 / 60),
    clampedDeltaMs: clamped * (1000 / 60),
    simulationStepsPerRender: 1,
    interpolationAlpha: 1,
    timeScale: 1,
    capturedAt: typeof performance !== 'undefined' ? performance.now() : Date.now()
  };
}

function getStableSceneName(game) {
  if (!game?.currentScene) {
    return game?.currentSceneName || 'boot';
  }

  if (game.currentSceneName) {
    return game.currentSceneName;
  }

  if (game.currentScene === game.scenes?.menu) return 'menu';
  if (game.currentScene === game.scenes?.play) return 'play';
  if (game.currentScene === game.scenes?.gameOver) return 'gameOver';
  if (game.currentScene === game.scenes?.highscore) return 'highscore';
  if (game.currentScene === game.scenes?.achievements) return 'achievements';
  if (game.currentScene === game.scenes?.shipSelect) return 'shipSelect';
  if (game.currentScene?.constructor?.name === 'ShipDetailsScene') return 'shipDetails';
  return 'unknown';
}

function buildGameTextState(game) {
  const playScene = game?.scenes?.play;
  const player = playScene?.player;
  const enemyManager = playScene?.enemyManager;
  const enemies = enemyManager?.enemies || [];
  const hijacker = enemyManager?.hijacker || null;
  const playerBullets = playScene?.bulletManager?.playerBullets || playScene?.bulletManager?.bullets || [];
  const enemyBullets = playScene?.bulletManager?.enemyBullets || [];
  const activeSettingsOverlay = game?.currentScene?.settingsOverlay || playScene?.settingsOverlay || null;
  const activeHowToPlayOverlay = game?.currentScene?.howToPlayOverlay || playScene?.howToPlayOverlay || null;
  const menuScene = getStableSceneName(game) === 'menu' ? game?.currentScene : null;
  const introScene = getStableSceneName(game) === 'intro' ? game?.currentScene : null;
  const shipSelectScene = getStableSceneName(game) === 'shipSelect' ? game?.currentScene : null;
  const shipDetailsScene = getStableSceneName(game) === 'shipDetails' ? game?.currentScene : null;
  const gameOverScene = getStableSceneName(game) === 'gameOver' ? game?.currentScene : null;
  const highscoreScene = getStableSceneName(game) === 'highscore' ? game?.currentScene : null;
  const achievementsScene = getStableSceneName(game) === 'achievements' ? game?.currentScene : null;
  const threatCodexScene = getStableSceneName(game) === 'threatCodex' ? game?.currentScene : null;
  const selectedShip = shipSelectScene?.ships?.[shipSelectScene?.selectedIndex] || null;
  const pacingDebug = getRunPacingDebugState(game);
  const hangarProgressSummary = getHangarProgressSummary();
  const threatCodexCatalog = getThreatCodexCatalog();
  const sector = getSectorInfo(game?.level || 1);
  const globalRivalProjection = game?.getGlobalRivalChaseState?.() || null;
  const getBoundsDebug = (displayObject) => {
    try {
      if (!displayObject?.getBounds) return null;
      const bounds = displayObject.getBounds();
      return {
        x: Math.round(bounds.x || 0),
        y: Math.round(bounds.y || 0),
        width: Math.round(bounds.width || 0),
        height: Math.round(bounds.height || 0)
      };
    } catch {
      return null;
    }
  };
  const visualBoundsFor = (enemy) => {
    try {
      const ref = enemy?.hitboxRef || enemy?.sprite;
      if (!ref?.getBounds) return null;
      const bounds = ref.getBounds();
      return {
        width: Math.round(bounds.width || 0),
        height: Math.round(bounds.height || 0)
      };
    } catch {
      return null;
    }
  };
  const isDisplayRenderable = (displayObject) => {
    let cursor = displayObject;
    while (cursor) {
      if (cursor.visible === false || cursor.renderable === false || cursor.alpha === 0) return false;
      cursor = cursor.parent;
    }
    return Boolean(displayObject?.parent);
  };
  const isPendingEntryEnemy = (enemy) => {
    if (!enemy || enemy.destroyed === true) return false;
    if (enemy.waitingForEntry === true) return true;
    const entryStart = Number(enemy.entryCurve?.startTime);
    return enemy.active === false &&
      enemy.state === 'ENTRY' &&
      Number.isFinite(entryStart) &&
      entryStart > Date.now();
  };
  const getVisualAuditBounds = (displayObject) => {
    try {
      if (!displayObject?.getBounds) return null;
      const bounds = displayObject.getBounds();
      const width = Math.round(bounds.width || 0);
      const height = Math.round(bounds.height || 0);
      if (width <= 0 || height <= 0) return null;
      return {
        x: Math.round(bounds.x || 0),
        y: Math.round(bounds.y || 0),
        width,
        height
      };
    } catch {
      return null;
    }
  };
  const collectEnemyVisualNodes = () => {
    const result = [];
    const walk = (node) => {
      if (!node) return;
      const label = String(node.label || '');
      if (label.startsWith('enemy_visual:')) result.push(node);
      for (const child of node.children || []) walk(child);
    };
    walk(playScene?.gameContainer);
    return result;
  };
  const createEnemyVisualAudit = () => {
    if (!playScene || !enemyManager) {
      return { staleVisibleCount: 0, orphanedVisibleCount: 0, pendingEntryVisibleCount: 0, samples: [] };
    }
    const trackedEnemies = [
      ...enemies,
      enemyManager.boss,
      enemyManager.hijacker
    ].filter(Boolean);
    const trackedSprites = new Set(trackedEnemies.map(enemy => enemy.sprite).filter(Boolean));
    const samples = [];
    let staleVisibleCount = 0;
    let pendingEntryVisibleCount = 0;
    for (const enemy of trackedEnemies) {
      const sprite = enemy?.sprite;
      if (!sprite?.parent || !isDisplayRenderable(sprite)) continue;
      const pending = isPendingEntryEnemy(enemy);
      if (pending) {
        pendingEntryVisibleCount += 1;
        continue;
      }
      if (enemy.active === false || enemy.destroyed === true || enemy.visualsDeactivated === true) {
        staleVisibleCount += 1;
        if (samples.length < 8) {
          samples.push({
            issue: 'tracked_inactive_visible',
            kind: enemy.kind || null,
            type: enemy.type || enemy.profile?.id || null,
            active: Boolean(enemy.active),
            destroyed: Boolean(enemy.destroyed),
            waitingForEntry: Boolean(enemy.waitingForEntry),
            reason: enemy.visualDeactivateReason || null,
            bounds: getVisualAuditBounds(sprite)
          });
        }
      }
    }

    let orphanedVisibleCount = 0;
    for (const node of collectEnemyVisualNodes()) {
      if (trackedSprites.has(node)) continue;
      if (!isDisplayRenderable(node)) continue;
      orphanedVisibleCount += 1;
      if (samples.length < 8) {
        samples.push({
          issue: 'orphaned_enemy_visual',
          label: node.label || null,
          bounds: getVisualAuditBounds(node)
        });
      }
    }

    return {
      staleVisibleCount,
      orphanedVisibleCount,
      pendingEntryVisibleCount,
      trackedEnemyVisualCount: trackedSprites.size,
      renderTreeEnemyVisualCount: collectEnemyVisualNodes().length,
      samples
    };
  };

  return {
    coordinateSystem: 'origin top-left, x right, y down',
    buildId: BUILD_ID,
    gitSha: GIT_SHA,
    language: {
      current: getCurrentLanguage(),
      preference: getLanguagePreferenceMode(),
      supported: getSupportedLanguages()
    },
    scene: getStableSceneName(game),
    score: game?.score ?? 0,
    level: game?.level ?? 0,
    sector,
    lives: game?.lives ?? 0,
    runMode: game?.runMode || (game?.isDebugRun ? 'unranked' : 'ranked'),
    runModeReason: game?.runModeReason || null,
    runModeProfile: game?.getRunModeProfile?.() || getRunModeProfile(game?.runMode),
    scoutAnomaly: game?.scoutAnomaly ? { ...game.scoutAnomaly } : null,
    combatTelemetry: playScene?.getCombatTelemetrySummary?.() || null,
    sectorStartChallenge: (game?.runMode === RUN_MODES.SECTOR_START || game?.runSummary?.sectorStartChallengeAttempt) ? {
      checkpoint: game?.sectorStartCheckpoint || game?.runSummary?.sectorStartCheckpoint || null,
      playSector: game?.sectorStartPlaySector || game?.runSummary?.sectorStartPlaySector || null,
      highestLegitimatelyReached: game?.sectorStartHighestReached || null,
      attempt: game?.runSummary?.sectorStartChallengeAttempt || null,
      previousBest: game?.runSummary?.sectorStartChallengePreviousBest || null,
      best: game?.runSummary?.sectorStartChallengeBest || null,
      newBest: Boolean(game?.runSummary?.sectorStartChallengeNewBest)
    } : null,
    globalLeaderboardCues: game?.globalLeaderboardCueState || null,
    scoreSubmissionAllowed: typeof game?.isScoreSubmissionAllowed === 'function'
      ? game.isScoreSubmissionAllowed()
      : !game?.isDebugRun,
    maintainerDevtools: getMaintainerDevtoolsState(),
    selectedShipSpriteKey: game?.selectedShipSpriteKey || null,
    threatResponse: game?.threatResponse || null,
    steamUploadDiagnostics: readLastSteamUploadDiagnostics(),
    achievements: game?.getAchievementDebugState ? game.getAchievementDebugState() : null,
    isPaused: Boolean(playScene?.isPaused),
    overlays: {
      pause: Boolean(playScene?.pauseOverlay?.visible && playScene?.pauseOverlay?.parent),
      settings: Boolean(activeSettingsOverlay?.container?.parent),
      howToPlay: Boolean(activeHowToPlayOverlay?.container?.parent),
      tacticalLoadout: Boolean(playScene?.tacticalLoadoutOverlay?.container?.parent),
      credits: Boolean(activeSettingsOverlay?.creditsPanel?.parent),
      fatal: Boolean(document.getElementById('fatal-overlay'))
    },
    pauseOverlay: playScene?.getPauseDebugState ? playScene.getPauseDebugState() : null,
    cursor: getGameplayCursorDebugState(game),
    menu: menuScene?.getLayoutDebugState ? menuScene.getLayoutDebugState() : null,
    runContracts: playScene?.getRunContractDebugState ? playScene.getRunContractDebugState() : null,
    tacticalDirectives: playScene?.getTacticalDirectiveDebugState ? playScene.getTacticalDirectiveDebugState() : null,
    rareChaosVisitors: playScene ? {
      availableVariants: RARE_CHAOS_VISITOR_VARIANT_COUNT,
      waveChance: RARE_CHAOS_VISITOR_WAVE_CHANCE,
      stats: playScene.enemyManager?.rareChaosVisitorStats ? { ...playScene.enemyManager.rareChaosVisitorStats } : null,
      lastAnnouncement: playScene.lastRareChaosVisitorAnnouncement || null,
      lastDefeat: playScene.lastRareChaosVisitorDefeat || null
    } : null,
    reinforcementPresentation: playScene?.getMayhemReinforcementPresentationDebugState?.() || null,
    spectacle: playScene?.spectacleDirector?.getDebugState?.() || null,
    cabinetWonders: playScene?.getCabinetWonderDebugState?.() || null,
    gameplayBackdrop: playScene ? {
      mode: playScene.gameplayBackdropMode || 'base',
      elapsedMs: Math.round(playScene.gameplayBackdropElapsedMs || 0),
      reducedMotion: Boolean(playScene.gameplayBackdropReducedMotion),
      starCount: (playScene.starLayers || []).reduce((total, layer) => total + (layer?.length || 0), 0),
      travelMoteCount: (playScene.cosmicTravelLayers || []).reduce((total, layer) => total + (layer?.length || 0), 0),
      auroraBandCount: playScene.cosmicAuroraBands?.length || 0
    } : null,
    highscoreChase: game?.highscoreChase ? {
      targetScore: Math.max(0, Math.floor(Number(game.highscoreChase.targetScore) || 0)),
      targetSector: Math.max(0, Math.floor(Number(game.highscoreChase.targetSector) || 0)),
      targetTimeSeconds: Math.max(0, Math.floor(Number(game.highscoreChase.targetTimeSeconds) || 0)),
      goalMode: game.highscoreChase.goalMode || 'score',
      bestAttemptSector: Math.max(0, Math.floor(Number(game.highscoreChase.bestAttemptSector) || 0)),
      hasDailyClear: Boolean(game.highscoreChase.hasDailyClear),
      source: game.highscoreChase.source || null,
      syncingTarget: Boolean(game.highscoreChase.syncingTarget),
      surpassed: Boolean(game.highscoreChase.surpassed),
      celebrationFired: Boolean(game.highscoreChase.celebrationFired),
      celebrationScore: Math.max(0, Math.floor(Number(game.highscoreChase.celebrationScore) || 0))
    } : null,
    globalRivalProjection: globalRivalProjection ? {
      targetKind: globalRivalProjection.targetKind,
      targetName: globalRivalProjection.targetName || null,
      targetRank: globalRivalProjection.targetRank || null,
      targetScore: globalRivalProjection.targetScore || 0,
      scoreToPass: globalRivalProjection.scoreToPass || 0,
      projectedPlacement: globalRivalProjection.projectedPlacement || null,
      projectedNumberOne: Boolean(globalRivalProjection.projectedNumberOne),
      snapshotOnly: true
    } : null,
    personalBestCelebration: playScene?.getPersonalBestCelebrationDebugState
      ? playScene.getPersonalBestCelebrationDebugState()
      : null,
    aceBounties: playScene?.getAceBountyDebugState ? playScene.getAceBountyDebugState() : null,
    settingsOverlay: activeSettingsOverlay?.getDebugState ? activeSettingsOverlay.getDebugState() : null,
    howToPlayOverlay: activeHowToPlayOverlay?.getDebugState ? activeHowToPlayOverlay.getDebugState() : null,
    tacticalLoadoutOverlay: playScene?.tacticalLoadoutOverlay?.getDebugState?.() || null,
    audio: AudioManager.getSettings ? AudioManager.getSettings() : null,
    shootAudio: playScene?.shootSoundHealthCheck ? {
      key: playScene.shootSoundHealthCheck.lastSoundKey || null,
      requestIntervalMs: playScene.shootSoundHealthCheck.lastRequestIntervalMs || 0,
      totalVolleys: playScene.shootSoundHealthCheck.totalVolleys || 0,
      totalRequests: playScene.shootSoundHealthCheck.totalRequests || 0,
      totalPlayed: playScene.shootSoundHealthCheck.totalPlayed || 0,
      totalSuppressed: playScene.shootSoundHealthCheck.totalSuppressed || 0
    } : null,
    display: getDisplaySettings(),
    layout: getCurrentLayout(),
    accessibility: getAccessibilitySettings(),
    input: {
      gamepad: playScene?.inputManager?.getGamepadState ? playScene.inputManager.getGamepadState() : null,
      controls: playScene?.inputManager?.getTransientDebugState?.() || null,
      autoFireCueVisible: Boolean(playScene?.controlModeHudCue?.visible)
    },
    debugTools: playScene ? {
      enabled: isMaintainerDevtoolsEnabled(),
      invincible: Boolean(isMaintainerDevtoolsEnabled() && playScene.debugInvincible),
      levelToolsUsed: Boolean(playScene.debugLevelToolsUsed),
      levelJumpAvailable: isMaintainerDevtoolsEnabled() && typeof playScene.debugJumpToLevel === 'function'
    } : null,
    toast: playScene?.getToastDebugState ? playScene.getToastDebugState(getBoundsDebug) : null,
    shipIntro: playScene?.getShipIntroDebugState ? playScene.getShipIntroDebugState() : null,
    gameOverInterlude: playScene?.getGameOverInterludeDebugState
      ? playScene.getGameOverInterludeDebugState(getBoundsDebug)
      : { active: false, visible: false },
    gameOverAnimation: playScene?.getGameOverAnimationDebugState
      ? playScene.getGameOverAnimationDebugState(getBoundsDebug)
      : { active: false, visible: false },
    overrunInterlude: playScene?.getOverrunInterludeDebugState
      ? playScene.getOverrunInterludeDebugState(getBoundsDebug)
      : { active: false, requiresConfirm: false },
    scoring: playScene ? {
      comboCount: playScene.comboCount || 0,
      comboMultiplier: playScene.comboMultiplier || 1,
      dangerDodgeCount: playScene.dangerDodgeCount || 0,
      dangerDodgeTimerMs: Math.max(0, Math.round(playScene.dangerDodgeTimerMs || 0)),
      bestDangerDodgeStreak: playScene.bestDangerDodgeStreak || 0,
      lastDangerDodgeScore: playScene.lastDangerDodgeScore || 0,
      nearMissSurgesThisRun: playScene.nearMissSurgesThisRun || 0,
      lastNearMissSurge: playScene.lastNearMissSurge ? {
        triggered: Boolean(playScene.lastNearMissSurge.triggered),
        streak: playScene.lastNearMissSurge.streak || 0,
        cooldownBefore: playScene.lastNearMissSurge.cooldownBefore || 0,
        cooldownAfter: playScene.lastNearMissSurge.cooldownAfter || 0,
        remainingMs: Math.max(0, Math.round(
          (playScene.lastNearMissSurge.startedAt + playScene.lastNearMissSurge.durationMs) - Date.now()
        ))
      } : null,
      lastComboCelebration: playScene.lastComboCelebration ? {
        triggered: Boolean(playScene.lastComboCelebration.triggered),
        threshold: playScene.lastComboCelebration.threshold || 0,
        multiplier: playScene.lastComboCelebration.multiplier || 1,
        reason: playScene.lastComboCelebration.reason || null,
        remainingMs: Math.max(0, Math.round(
          (playScene.lastComboCelebration.startedAt + playScene.lastComboCelebration.durationMs) - Date.now()
        ))
      } : null,
      lastPowerupPickupJuice: playScene.lastPowerupPickupJuice ? {
        triggered: Boolean(playScene.lastPowerupPickupJuice.triggered),
        type: playScene.lastPowerupPickupJuice.type || null,
        major: Boolean(playScene.lastPowerupPickupJuice.major),
        x: playScene.lastPowerupPickupJuice.x || 0,
        y: playScene.lastPowerupPickupJuice.y || 0,
        remainingMs: Math.max(0, Math.round(
          (playScene.lastPowerupPickupJuice.startedAt + playScene.lastPowerupPickupJuice.durationMs) - Date.now()
        ))
      } : null,
      grazeBreakReady: Boolean(playScene.grazeBreakReady && playScene.getGameplayClockMs() <= (playScene.grazeBreakExpiresAt || 0)),
      grazeBreakReadyMs: Math.max(0, Math.round((playScene.grazeBreakExpiresAt || 0) - playScene.getGameplayClockMs())),
      grazeBreakNeedsFireRelease: Boolean(playScene.grazeBreakNeedsFireRelease),
      grazeBreakReleasePrimed: Boolean(playScene.grazeBreakReleasePrimed),
      firePressed: Boolean(playScene.currentFirePressed),
      grazeBreakBullets: playerBullets.filter(bullet => bullet?.active !== false && bullet.isGrazeBreaker).length,
      lastGrazeBreak: playScene.lastGrazeBreak ? {
        triggered: Boolean(playScene.lastGrazeBreak.triggered),
        bulletsCleared: playScene.lastGrazeBreak.bulletsCleared || 0,
        enemiesHit: playScene.lastGrazeBreak.enemiesHit || 0,
        enemiesDestroyed: playScene.lastGrazeBreak.enemiesDestroyed || 0,
        bonusScore: playScene.lastGrazeBreak.bonusScore || 0,
        radius: playScene.lastGrazeBreak.radius || 0,
        visualRadius: playScene.lastGrazeBreak.visualRadius || 0,
        visualScale: playScene.lastGrazeBreak.visualScale || 1,
        visualRingCount: playScene.lastGrazeBreak.visualRingCount || 0,
        visualSparkleCount: playScene.lastGrazeBreak.visualSparkleCount || 0,
        visualFilamentCount: playScene.lastGrazeBreak.visualFilamentCount || 0,
        visual: playScene.lastGrazeBreakVisualDebug ? { ...playScene.lastGrazeBreakVisualDebug } : null,
        remainingMs: Math.max(0, Math.round(
          (playScene.activeGrazeBreakVisual?.durationMs || 0) - (playScene.activeGrazeBreakVisual?.elapsedMs || 0)
        ))
      } : null
    } : null,
    arcadeRun: {
      runElapsedSeconds: pacingDebug.runElapsedSeconds,
      targetRunSeconds: pacingDebug.targetRunSeconds,
      currentSector: pacingDebug.currentSector,
      targetSectors: pacingDebug.targetSectors,
      sectorElapsedSeconds: pacingDebug.sectorElapsedSeconds,
      averageSectorSeconds: pacingDebug.averageSectorSeconds,
      estimatedRunCompletionSeconds: pacingDebug.estimatedRunCompletionSeconds,
      pressurePhase: pacingDebug.pressurePhase,
      pressureMultipliers: pacingDebug.pressureMultipliers,
      runTheme: game?.contentDirector?.runTheme?.id || null,
      contentDirectorState: game?.contentDirector?.getDebugState?.() || null,
      discoveriesThisRun: getDiscoveriesThisRun(),
      codexCompletionCounts: getCodexCompletionCounts(threatCodexCatalog),
      discoveryStats: getDiscoveryStats(),
      livesGainedThisRun: playScene?.repairsGrantedThisRun || 0,
      repairsGrantedThisRun: playScene?.repairsGrantedThisRun || 0,
      extraLifeDropsThisRun: playScene?.powerupManager?.powerups?.filter?.(powerup => powerup?.type === 'life')?.length || 0,
      pickupSpawns: playScene?.powerupManager?.getDebugState?.() || null,
      bossesKilled: playScene?.bossKills || 0,
      wavesCleared: playScene?.wavesCleared || 0,
      runCleared: Boolean(game?.runCleared || game?.runSummary?.runCleared),
      clearReason: game?.runClearReason || game?.runSummary?.clearReason || null,
      clearLivesRemaining: game?.runClearLivesRemaining || game?.runSummary?.clearLivesRemaining || 0,
      score: game?.score || 0,
      scoreBreakdown: game?.scoreBreakdown || null,
      lastCabinetLog: playScene?.lastCabinetLog || null,
      currentEnemyBulletCount: enemyBullets.filter(bullet => bullet?.active !== false).length,
      peakEnemyBulletCount: playScene?.peakEnemyBulletCount || null,
      pilotXp: hangarProgressSummary.pilotXp,
      pilotRank: hangarProgressSummary.pilotRank,
      highestPilotRank: hangarProgressSummary.highestPilotRank,
      newRanksThisRun: game?.runSummary?.newRanksThisRun || [],
      rankAchievementsUnlocked: game?.runSummary?.rankAchievementsUnlocked || [],
      newlyUnlockedShips: game?.runSummary?.newlyUnlockedShips || [],
      shipUnlockProgressSummary: hangarProgressSummary
    },
    tacticalDraft: playScene?.getTacticalDraftDebugState?.() || null,
    tacticalAugments: player?.getRunAugmentDebugState?.() || null,
    runReport: summarizeRunReport(game?.lastRunReport || null),
    wave: enemyManager ? {
      phase: enemyManager.phase || null,
      state: enemyManager.state || null,
      marketingDebug: Boolean(enemyManager.marketingDebugMode),
      currentWaveIndex: Number.isFinite(enemyManager.currentWaveIndex) ? enemyManager.currentWaveIndex : null,
      currentWaveNumber: Number.isFinite(enemyManager.currentWaveIndex) ? enemyManager.currentWaveIndex + 1 : null,
      totalWaves: enemyManager.normalWavesTotal || 0,
      challengeFlight: enemyManager.getChallengeFlightDebugState?.() || null,
      briefingMs: Math.round(enemyManager.waveBriefingTimer || 0),
      tactic: enemyManager.currentWaveTactic ? {
        id: enemyManager.currentWaveTactic.id || null,
        label: enemyManager.currentWaveTactic.label || null,
        move: enemyManager.currentWaveTactic.move || null,
        shot: enemyManager.currentWaveTactic.shot || null,
        volley: enemyManager.currentWaveTactic.volley || null,
        threatActions: Array.isArray(enemyManager.currentWaveTactic.threatActions)
          ? enemyManager.currentWaveTactic.threatActions
          : []
      } : null,
      threatBudget: enemyManager.currentWaveThreatState ? {
        maxActive: enemyManager.currentWaveThreatState.maxActive || 0,
        dangerBudget: enemyManager.currentWaveThreatState.dangerBudget || 0,
        activeCount: enemyManager.currentWaveThreatState.activeCount || 0,
        activeCost: enemyManager.currentWaveThreatState.activeCost || 0,
        assignedIds: enemyManager.currentWaveThreatState.assignedIds || []
      } : null,
      nextTactic: enemyManager.pendingWaveConfig
        ? {
          id: typeof enemyManager.pendingWaveConfig.tactic === 'string'
            ? enemyManager.pendingWaveConfig.tactic
            : enemyManager.pendingWaveConfig.tactic?.id || null,
          formation: enemyManager.pendingWaveConfig.formation || null
        }
        : null
    } : null,
    intro: introScene ? {
      panelIndex: introScene.panelIndex,
      panelElapsedMs: Math.round(introScene.panelElapsedMs || 0),
      started: Boolean(introScene.started),
      waitingForVoice: Boolean(introScene.panelWaitsForVoice),
      voiceWasActive: Boolean(introScene.panelVoiceWasActive)
    } : null,
    shipSelect: selectedShip ? {
      selectedIndex: shipSelectScene.selectedIndex,
      totalShips: shipSelectScene.ships.length,
      modelIndex: Math.max(0, shipSelectScene.baseOrder?.indexOf(selectedShip.baseId) ?? 0) + 1,
      totalModels: shipSelectScene.baseOrder?.length || 0,
      shipName: selectedShip.name || null,
      spriteKey: selectedShip.spriteKey || null,
      tier: selectedShip.tier || 'standard',
      role: selectedShip.role || null,
      weakness: selectedShip.weakness || null,
      powerRating: Number.isFinite(selectedShip.powerRating) ? selectedShip.powerRating : 1,
      trait: selectedShip.trait?.label || null,
      unlocked: isShipUnlocked(selectedShip.spriteKey, getShipUnlockProgress()),
      unlock: selectedShip.unlock || null,
      unlockHistoryText: getShipUnlockHistoryLine(selectedShip.spriteKey, getShipUnlockProgress(), { translate: translateText }),
      unlockDetailsText: shipSelectScene.rightIntel?.unlock?.text || null,
      usageCount: getShipUsage(selectedShip.spriteKey),
      firstFlight: {
        eligible: Boolean(shipSelectScene.shipCards?.[shipSelectScene.selectedIndex]?.firstFlightEligible),
        badgeVisible: Boolean(shipSelectScene.shipCards?.[shipSelectScene.selectedIndex]?.firstFlightBadge?.visible),
        badgeText: shipSelectScene.shipCards?.[shipSelectScene.selectedIndex]?.firstFlightBadgeText?.text || null,
        badgeBounds: getBoundsDebug(shipSelectScene.shipCards?.[shipSelectScene.selectedIndex]?.firstFlightBadge),
        eligibleShipCount: (shipSelectScene.shipCards || []).filter(card => card?.firstFlightEligible).length
      },
      mastery: shipSelectScene.shipCards?.[shipSelectScene.selectedIndex]?.masteryBadge?.__debugMastery || null,
      careerSignal: shipSelectScene.leftIntel ? {
        count: shipSelectScene.leftIntel.count?.text || null,
        progress: shipSelectScene.leftIntel.progress?.text || null,
        stats: shipSelectScene.leftIntel.stats?.text || null,
        hint: shipSelectScene.leftIntel.hint?.text || null
      } : null,
      recommended: shipSelectScene.recommendedShip ? {
        shipName: shipSelectScene.recommendedShip.name || null,
        spriteKey: shipSelectScene.recommendedShip.spriteKey || null,
        selected: shipSelectScene.recommendedShip.spriteKey === selectedShip.spriteKey,
        bannerVisible: Boolean(shipSelectScene.recommendationBanner?.visible !== false && shipSelectScene.recommendationBanner?.parent),
        dismissed: Boolean(shipSelectScene.recommendationDismissed),
        recommendationKey: shipSelectScene.recommendationKey || null,
        label: shipSelectScene.recommendationText?.text || null,
        reason: shipSelectScene.recommendationReasonText?.text || null
      } : null,
      launchInProgress: Boolean(shipSelectScene.launchInProgress),
      launchModeChoice: shipSelectScene.launchModeOverlay?.getDebugState?.(getBoundsDebug) || null,
      controllerFocus: shipSelectScene.getControllerFocus ? shipSelectScene.getControllerFocus() : (shipSelectScene.mainMenuButtonFocused ? 'back' : 'ship'),
      focusedActionButtonId: shipSelectScene.getFocusedActionButtonId ? shipSelectScene.getFocusedActionButtonId() : null,
      backButton: getBoundsDebug(shipSelectScene.backButton),
      mainMenuButtonFocused: Boolean(shipSelectScene.mainMenuButtonFocused),
      hangarMenu: shipSelectScene.getHangarMenuDebugState ? shipSelectScene.getHangarMenuDebugState(getBoundsDebug) : null,
      careerInfo: shipSelectScene.getCareerInfoDebugState ? shipSelectScene.getCareerInfoDebugState(getBoundsDebug) : null,
      unlockPresentation: shipSelectScene.getHangarUnlockPresentationDebugState ? shipSelectScene.getHangarUnlockPresentationDebugState(getBoundsDebug) : null,
      detailsButton: getBoundsDebug(shipSelectScene.detailsButton),
      startButton: getBoundsDebug(shipSelectScene.startButton),
      randomButton: getBoundsDebug(shipSelectScene.randomButton)
    } : null,
    shipDetails: shipDetailsScene ? {
      spriteKey: shipDetailsScene.spriteKey || null,
      shipName: shipDetailsScene.ship?.name || null,
      tier: shipDetailsScene.ship?.tier || 'standard',
      role: shipDetailsScene.ship?.role || null,
      weakness: shipDetailsScene.ship?.weakness || null,
      powerRating: Number.isFinite(shipDetailsScene.ship?.powerRating) ? shipDetailsScene.ship.powerRating : 1,
      unlocked: isShipUnlocked(shipDetailsScene.spriteKey, getShipUnlockProgress()),
      unlockHistoryText: getShipUnlockHistoryLine(shipDetailsScene.spriteKey, getShipUnlockProgress(), { translate: translateText }),
      unlockRequirementText: getShipUnlockRequirementLine(shipDetailsScene.spriteKey, { translate: translateText }),
      unlockProvenanceText: shipDetailsScene.unlockProvenanceText?.text || null,
      unlockProvenanceBounds: getBoundsDebug(shipDetailsScene.unlockProvenanceText),
      focusedButtonIndex: Number.isFinite(shipDetailsScene.focusedButtonIndex) ? shipDetailsScene.focusedButtonIndex : null,
      focusedButtonId: shipDetailsScene.focusedButtonIndex === 0 ? 'back' : shipDetailsScene.focusedButtonIndex === 1 ? 'start' : null,
      launchModeChoice: shipDetailsScene.launchModeOverlay?.getDebugState?.(getBoundsDebug) || null,
      backButton: getBoundsDebug(shipDetailsScene.backButton),
      startButton: getBoundsDebug(shipDetailsScene.startButton)
    } : null,
    gameOver: gameOverScene ? {
      score: gameOverScene.finalScore || 0,
      level: gameOverScene.finalLevel || 0,
      levelSummary: gameOverScene.levelSummary || gameOverScene.levelText?.text || null,
      unlockSummary: gameOverScene.unlockSummary || null,
      shipUnlocks: gameOverScene.getShipUnlockRevealDebugState ? gameOverScene.getShipUnlockRevealDebugState() : null,
      nextGoal: gameOverScene.nextGoal?.text || gameOverScene.nextGoalText?.text || null,
      prompt: gameOverScene.promptText?.text || null,
      retryPrompt: gameOverScene.instructions?.text || null,
      nameInput: gameOverScene.nameInput || '',
      controllerNameCursor: Number.isFinite(gameOverScene.controllerNameCursor) ? gameOverScene.controllerNameCursor : null,
      inputDevice: gameOverScene.lastInputDevice || null,
      primaryCta: gameOverScene.getRetryCtaDebugState ? gameOverScene.getRetryCtaDebugState() : null,
      retryCta: gameOverScene.getRetryCtaDebugState ? gameOverScene.getRetryCtaDebugState() : null,
      leaderboardCta: gameOverScene.getLeaderboardCtaDebugState ? gameOverScene.getLeaderboardCtaDebugState() : null,
      hangarCta: gameOverScene.getHangarCtaDebugState ? gameOverScene.getHangarCtaDebugState() : null,
      mainMenuCta: gameOverScene.getMainMenuCtaDebugState ? gameOverScene.getMainMenuCtaDebugState() : null,
      counterAdviceCard: gameOverScene.getCounterAdviceCardDebugState ? gameOverScene.getCounterAdviceCardDebugState() : null,
      runReportCta: gameOverScene.getRunReportCtaDebugState ? gameOverScene.getRunReportCtaDebugState() : null,
      runReportOverlay: gameOverScene.getRunReportOverlayDebugState ? gameOverScene.getRunReportOverlayDebugState() : null,
      runReport: gameOverScene.getRunReportDebugState ? gameOverScene.getRunReportDebugState() : null,
      personalBestCarry: gameOverScene.getPersonalBestCarryDebugState ? gameOverScene.getPersonalBestCarryDebugState() : null,
      state: gameOverScene.state || null,
      submittedHoldReady: typeof gameOverScene.isSubmittedHoldContinueReady === 'function'
        ? gameOverScene.isSubmittedHoldContinueReady()
        : null,
      submittedHoldRemainingMs: typeof gameOverScene.getSubmittedHoldRemainingMs === 'function'
        ? Math.round(gameOverScene.getSubmittedHoldRemainingMs())
        : null,
      resultHoldReady: typeof gameOverScene.isResultHoldContinueReady === 'function'
        ? gameOverScene.isResultHoldContinueReady()
        : null,
      resultHoldRemainingMs: typeof gameOverScene.getResultHoldRemainingMs === 'function'
        ? Math.round(gameOverScene.getResultHoldRemainingMs())
        : null,
      runbackReason: gameOverScene.runbackReason || null,
      steamSubmissionMode: Boolean(gameOverScene.steamSubmissionMode),
      steamPlayerName: gameOverScene.steamPlayerName || null,
      selectedCtaLine: gameOverScene.selectedCtaLine ? {
        id: gameOverScene.selectedCtaLine.id,
        text: gameOverScene.selectedCtaLine.text,
        audioPath: gameOverScene.selectedCtaLine.audioPath || null
      } : null,
      ctaVoicePlayed: Boolean(gameOverScene.ctaVoicePlayed),
      qualifiedForHighscore: Boolean(gameOverScene.isQualified),
      localQualified: Boolean(gameOverScene.localQualified),
      globalQualified: Boolean(gameOverScene.globalQualified),
      globalStatus: gameOverScene.globalStatus || null,
      localPlacement: gameOverScene.localPlacement || null,
      localPlacementSource: gameOverScene.localPlacementSource || null,
      globalPlacement: gameOverScene.globalPlacement || null,
      globalPlacementTier: gameOverScene.globalPlacementTier || null,
      sectorSteamStatus: gameOverScene.sectorSteamStatus || null,
      sectorSteamRank: gameOverScene.sectorSteamRank || null,
      sectorSteamError: gameOverScene.sectorSteamError || null,
      lastSectorLeaderboardResult: game?.lastSectorLeaderboardResult || null,
      ceremonyTitle: gameOverScene.title?.text || null,
      ceremonyComment: gameOverScene.comment?.text || null,
      deathCoach: gameOverScene.getDeathCoachAdvice ? gameOverScene.getDeathCoachAdvice() : null,
      backdropLoaded: Boolean(gameOverScene.backdropLoaded),
      canEnterName: Boolean(gameOverScene.canEnterName),
      globalFanfarePlayed: Boolean(gameOverScene.qualificationFanfarePlayed),
      leaderboardStatus: gameOverScene.leaderboardStatusText?.text || null,
      lastLeaderboardResult: game?.lastLeaderboardResult || null
    } : null,
    highscore: highscoreScene ? {
      activeLeaderboard: highscoreScene.activeLeaderboard || null,
      focusedControl: highscoreScene.getVisibleControls?.()[highscoreScene.focusedControlIndex]?.id || null,
      tabs: highscoreScene.leaderboardTabs?.map(tab => tab.id) || [],
      status: highscoreScene.status || null,
      sourceLabel: highscoreScene.activeLeaderboardResult?.sourceLabel || null,
      rows: highscoreScene.entries?.map(entry => ({
        rank: entry.rank || null,
        name: entry.name || entry.playerName || null,
        score: entry.score || 0,
        level: entry.level || 0,
        source: entry.source || null
      })) || [],
      runtime: game?.leaderboardAdapter?.getRuntimeSummary ? game.leaderboardAdapter.getRuntimeSummary() : null
    } : null,
    achievementsScreen: achievementsScene?.getDebugState ? achievementsScene.getDebugState() : null,
    threatCodexScreen: threatCodexScene?.getDebugState ? threatCodexScene.getDebugState() : null,
    player: player ? {
      x: Math.round(player.x),
      y: Math.round(player.y),
      active: Boolean(player.active),
      radius: player.radius || 0,
      shipVariant: player.visualVariant?.slug || null,
      shipTrait: player.shipTrait?.label || null,
      traitCombat: player.traitCombat || null,
      traitState: player.getTraitState ? player.getTraitState() : null,
      stats: player.getStatSnapshot ? player.getStatSnapshot() : null,
      powerup: player.activePowerup?.type || null,
      powerups: player.getActivePowerupStates ? player.getActivePowerupStates() : [],
      pointDefense: {
        active: Boolean(player.pointDefenseActive),
        radius: player.pointDefenseActive ? POINT_DEFENSE_RADIUS : 0,
        remainingMs: player.pointDefenseActive
          ? Math.max(0, Math.round((Number(player.pointDefenseExpiresAt) || 0) - (Number(playScene?.getGameplayClockMs?.()) || 0)))
          : 0,
        interceptTotal: Math.max(0, Number(player.pointDefenseInterceptCount) || 0),
        lastIntercept: player.lastPointDefenseIntercept ? { ...player.lastPointDefenseIntercept } : null,
        ring: player.pointDefenseRing?.__debugPointDefense || null
      },
      bombIntent: {
        charges: Math.max(0, Number(player.bombShotsLeft) || 0),
        armedAt: Math.max(0, Number(player.bombArmedAt) || 0),
        triggerQueued: Boolean(player.bombTriggerQueued),
        commit: player.lastBombCommitState ? {
          ready: Boolean(player.lastBombCommitState.ready),
          reason: player.lastBombCommitState.reason || null,
          clusterCount: player.lastBombCommitState.clusterCount || 0
        } : null,
        lastTrigger: player.lastBombTriggerIntent ? { ...player.lastBombTriggerIntent } : null,
        indicator: player.bombIndicator?.__debugBombIndicator || null
      },
      statusEffects: player.getActiveStatusEffects ? player.getActiveStatusEffects() : [],
      hitboxReticle: player.getHitboxReticleDebugState ? player.getHitboxReticleDebugState() : null,
      ghostTimer: player.getGhostTimerDebugState ? player.getGhostTimerDebugState() : null,
      dodgeExitPulse: player.lastDodgeExitPulse ? { ...player.lastDodgeExitPulse } : null,
      cockpitMastery: playScene?.hud?.livesGroup?._debugShipMastery || null,
      tractorDebuff: player.getTractorDebuffState ? player.getTractorDebuffState() : null
    } : null,
    hijacker: hijacker?.active ? {
      x: Math.round(hijacker.x || 0),
      y: Math.round(hijacker.y || 0),
      health: Math.max(0, Math.round(hijacker.health || 0)),
      maxHealth: Math.max(0, Math.round(hijacker.maxHealth || 0)),
      tractor: hijacker.getTractorState ? hijacker.getTractorState() : null
    } : null,
    tractorHijack: playScene ? {
      active: Boolean(playScene.tractorHijack),
      current: playScene.tractorHijack ? {
        triggered: Boolean(playScene.tractorHijack.triggered),
        capturedEnemies: playScene.tractorHijack.capturedEnemies || 0,
        clearedBullets: playScene.tractorHijack.clearedBullets || 0,
        bonusScore: playScene.tractorHijack.bonusScore || 0,
        remainingMs: Math.max(0, Math.round(
          (playScene.tractorHijack.startedAt + playScene.tractorHijack.durationMs) - Date.now()
        ))
      } : null,
      last: playScene.lastTractorHijack ? {
        triggered: Boolean(playScene.lastTractorHijack.triggered),
        capturedEnemies: playScene.lastTractorHijack.capturedEnemies || 0,
        clearedBullets: playScene.lastTractorHijack.clearedBullets || 0,
        bonusScore: playScene.lastTractorHijack.bonusScore || 0,
        sourceX: playScene.lastTractorHijack.sourceX || 0,
        sourceY: playScene.lastTractorHijack.sourceY || 0,
        playerX: playScene.lastTractorHijack.playerX || 0,
        playerY: playScene.lastTractorHijack.playerY || 0
      } : null
    } : null,
    inputContinuity: playScene?.inputManager?.getContinuityDebugState?.() || null,
    eliteMiddleShips: enemies
      .filter(enemy => enemy?.kind === 'elite_middle_ship' && (enemy.active !== false || enemy.waitingForEntry))
      .map(enemy => ({
        x: Math.round(enemy.x || 0),
        y: Math.round(enemy.y || 0),
        health: Number.isFinite(enemy.health) ? Math.max(0, Math.round(enemy.health)) : null,
        maxHealth: Number.isFinite(enemy.maxHealth) ? Math.max(0, Math.round(enemy.maxHealth)) : null,
        state: enemy.state || null,
        profile: enemy.getEliteDebugState ? enemy.getEliteDebugState() : null
      })),
    counts: {
      enemies: enemies.filter(enemy => enemy?.active !== false).length + (hijacker?.active ? 1 : 0),
      bossAdds: enemies.filter(enemy =>
        enemy?.kind === 'boss_add' && (enemy.active !== false || enemy.waitingForEntry)
      ).length,
      bosses: enemies.filter(enemy =>
        enemy?.kind === 'boss' && (enemy.active !== false || enemy.waitingForEntry)
      ).length,
      eliteMiddleShips: enemies.filter(enemy =>
        enemy?.kind === 'elite_middle_ship' && (enemy.active !== false || enemy.waitingForEntry)
      ).length,
      rareChaosVisitors: enemies.filter(enemy =>
        enemy?.isRareChaosVisitor && (enemy.active !== false || enemy.waitingForEntry)
      ).length,
      playerBullets: playerBullets.filter(bullet => bullet?.active !== false).length,
      enemyBullets: enemyBullets.filter(bullet => bullet?.active !== false).length,
      particles: playScene?.particleManager?.particles?.length || 0
    },
    projectileLifecycle: playScene?.bulletManager?.getDebugState?.() || null,
    enemyVisualAudit: createEnemyVisualAudit(),
    enemyWeapons: {
      activeProfiles: [...new Set(enemyBullets
        .filter(bullet => bullet?.active !== false && bullet.weaponProfileId)
        .map(bullet => bullet.weaponProfileId))],
      visibleBullets: enemyBullets
        .filter(bullet => bullet?.active !== false)
        .slice(0, 10)
        .map(bullet => ({
          x: Math.round(bullet.x || 0),
          y: Math.round(bullet.y || 0),
          radius: bullet.radius || 0,
          profile: bullet.weaponProfileId || null,
          label: bullet.weaponLabel || null,
          art: bullet.visualConfig?.projectileArt || null,
          animation: bullet.visualConfig?.animationStyle || null,
          behavior: bullet.behavior || null,
          waveTactic: bullet.waveTactic || null,
          threatAction: bullet.threatActionId || null,
          speed: Number.isFinite(bullet.speed) ? Number(bullet.speed.toFixed(2)) : null
        }))
    },
    bossHazards: playScene ? {
      active: (playScene.bossHazards || [])
        .slice(0, 8)
        .map(hazard => ({
          kind: hazard.kind || null,
          type: hazard.type || null,
          category: hazard.category || null,
          hit: Boolean(hazard.hit),
          remainingMs: Math.max(0, Math.round((hazard.startedAt + hazard.durationMs) - Date.now()))
        })),
      lastHit: playScene.lastBossHazardHit || null,
      lastCleanup: playScene.lastBossHazardCleanup || null,
      layerHasGeometry: Boolean(playScene.bossHazardLayerHasGeometry)
    } : null,
    visibleEnemies: enemies
      .filter(enemy => enemy?.active !== false)
      .sort((left, right) => Number(Boolean(right?.isAce)) - Number(Boolean(left?.isAce)))
      .slice(0, 8)
      .map(enemy => ({
        x: Math.round(enemy.x || 0),
        y: Math.round(enemy.y || 0),
        radius: enemy.radius || 0,
        kind: enemy.kind || null,
        waveTactic: enemy.waveTactic ? {
          id: enemy.waveTactic.id || null,
          label: enemy.waveTactic.label || null,
          move: enemy.waveTactic.move || null,
          shot: enemy.waveTactic.shot || null,
          role: enemy.waveRole || null
        } : null,
        threatAction: enemy.getThreatDebugState ? enemy.getThreatDebugState() : null,
        ace: enemy.getAceDebugState ? enemy.getAceDebugState() : null,
        rivalWing: enemy.getRivalWingDebugState ? enemy.getRivalWingDebugState() : null,
        variant: enemy.visualVariant?.slug || null,
        eliteMiddleShip: enemy.getEliteDebugState ? enemy.getEliteDebugState() : null,
        rareChaosVisitor: enemy.getRareChaosVisitorDebugState ? enemy.getRareChaosVisitorDebugState() : null,
        reinforcement: enemy.isMayhemReinforcement ? {
          groupIndex: Math.max(0, Math.floor(Number(enemy.reinforcementGroupIndex) || 0)),
          groupCount: Math.max(1, Math.floor(Number(enemy.reinforcementGroupCount) || 1)),
          superStorm: Boolean(enemy.isMayhemSuperStorm),
          swarmEntry: Boolean(enemy.isReinforcementSwarmEntry),
          routine: Boolean(enemy.isOverrunRoutineReinforcement),
          entryRoute: enemy.reinforcementEntryRoute || null,
          spawnCueDurationMs: Math.max(0, Math.round(Number(enemy.spawnCueDurationMs) || 0)),
          spawnCue: enemy.spawnCueLayer?._debugSpawnCue ? { ...enemy.spawnCueLayer._debugSpawnCue } : null
        } : null,
        health: Number.isFinite(enemy.health) ? Math.max(0, Math.round(enemy.health)) : null,
        maxHealth: Number.isFinite(enemy.maxHealth) ? Math.max(0, Math.round(enemy.maxHealth)) : null,
        phase: Number.isFinite(enemy.phase) ? enemy.phase : null,
        bossProfile: enemy.profile?.id || null,
        bossArchetype: enemy.profile?.archetype || null,
        bossMovement: enemy.moveProfile?.profile || enemy.profile?.movement || null,
        bossMovementFamily: enemy.profile?.movement || null,
        bossAttack: enemy.profile?.attack || null,
        bossSignature: enemy.getSignatureForPhase ? enemy.getSignatureForPhase(enemy.phase || 1) : (enemy.profile?.signature || null),
        bossAnimation: enemy.getAnimationDebugState ? enemy.getAnimationDebugState() : null,
        bossSignatureWarning: enemy.getSignatureWarningDebugState ? enemy.getSignatureWarningDebugState() : null,
        safeLanes: Array.isArray(enemy.safeLanes) ? enemy.safeLanes : [],
        phaseShift: enemy.kind === 'boss' ? {
          anchorOffset: Math.round(enemy.phaseAnchorOffset || 0),
          targetAnchorOffset: Math.round(enemy.targetPhaseAnchorOffset || 0),
          laneYOffset: Math.round(enemy.phaseLaneYOffset || 0)
        } : null,
        visualBounds: visualBoundsFor(enemy),
        telegraph: enemy.telegraph ? {
          type: enemy.telegraph.type || null,
          label: enemy.telegraph.label || null,
          lockedAngle: Number.isFinite(enemy.telegraph.lockedAngle)
            ? Number(enemy.telegraph.lockedAngle.toFixed(4))
            : null,
          movementLocked: Boolean(enemy.telegraph.movementLocked),
          remainingMs: Math.max(0, Math.round((enemy.telegraph.start + enemy.telegraph.duration) - Date.now()))
        } : enemy.regularTelegraph ? {
          type: enemy.regularTelegraph.type || null,
          label: 'REGULAR ATTACK TELL',
          attack: enemy.regularTelegraph.attack || null,
          remainingMs: Math.max(0, Math.round((enemy.regularTelegraph.start + enemy.regularTelegraph.duration) - Date.now()))
        } : null,
        type: enemy.type || enemy.constructor?.name || 'enemy'
      }))
  };
}

function createBootLogger(enabled) {
  if (!enabled) {
    return {
      startStep: () => () => { }
    };
  }

  const overlay = document.createElement('div');
  overlay.id = 'boot-debug';
  overlay.style.cssText = [
    'position: fixed',
    'top: 8px',
    'left: 8px',
    'z-index: 9999',
    'background: rgba(0, 0, 0, 0.8)',
    'color: #00ffff',
    'padding: 8px 10px',
    'font-family: "Rajdhani", "Cascadia Mono", "Segoe UI", sans-serif',
    'font-size: 12px',
    'max-width: 70vw',
    'white-space: pre-wrap',
    'pointer-events: none'
  ].join(';');

  const title = document.createElement('div');
  title.textContent = 'Boot debug';
  overlay.appendChild(title);

  const list = document.createElement('div');
  overlay.appendChild(list);

  const parent = document.body || document.documentElement;
  if (parent) {
    parent.appendChild(overlay);
  }

  const rows = new Map();

  function update(label, status, detail) {
    let row = rows.get(label);
    if (!row) {
      row = document.createElement('div');
      rows.set(label, row);
      list.appendChild(row);
    }
    const statusTag = status ? `[${status}]` : '[...]';
    row.textContent = `${statusTag} ${label}${detail ? ` - ${detail}` : ''}`;
  }

  return {
    startStep(label) {
      update(label, 'run');
      return (status, detail) => update(label, status, detail);
    }
  };
}

function getErrorMessage(error) {
  if (!error) return 'unknown error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return String(error);
}

function getStackExcerpt(error) {
  if (!error || !error.stack) return null;
  const lines = error.stack.split('\n').slice(0, 3).map(line => line.trim());
  return lines.join(' | ');
}

function logFatalOnce(step, error) {
  if (bootState.fatalLogged) return;
  bootState.fatalLogged = true;
  const message = getErrorMessage(error);
  console.error(`Boot fatal (${BUILD_ID}/${GIT_SHA}) step="${step}" error="${message}"`);
}

function showFatalOverlay(step, error) {
  if (bootState.fatalShown) return;
  bootState.fatalShown = true;
  perfState.fatal = true;

  const overlay = document.createElement('div');
  overlay.id = 'fatal-overlay';
  overlay.style.cssText = [
    'position: fixed',
    'inset: 0',
    'z-index: 10000',
    'background: rgba(0, 0, 0, 0.92)',
    'color: #ff5555',
    'padding: 24px',
    'font-family: "Rajdhani", "Cascadia Mono", "Segoe UI", sans-serif',
    'font-size: 14px',
    'white-space: pre-wrap'
  ].join(';');

  const message = getErrorMessage(error);
  const stackExcerpt = getStackExcerpt(error);
  const lines = [
    'Could not start the game.',
    `Step: ${step}`,
    `Error: ${message}`,
    stackExcerpt ? `Stack: ${stackExcerpt}` : null,
    `Build: ${BUILD_ID}`,
    `Git: ${GIT_SHA}`
  ].filter(Boolean);

  overlay.textContent = lines.join('\n');

  const parent = document.body || document.documentElement;
  if (parent) {
    parent.appendChild(overlay);
  }

  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }

  ensureBuildStamp();
  logFatalOnce(step, error);
}

async function runBootStep(logger, label, fn, options = {}) {
  const { timeoutMs, logFailure = true } = options;
  const finish = logger.startStep(label);
  let timeoutId;

  try {
    const task = Promise.resolve().then(fn);
    const result = timeoutMs
      ? await Promise.race([
        task,
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            const error = new Error(`timeout after ${timeoutMs}ms`);
            error.code = 'BOOT_TIMEOUT';
            reject(error);
          }, timeoutMs);
        })
      ])
      : await task;

    if (result && result.bootDetail) {
      finish('ok', result.bootDetail);
    } else {
      finish('ok');
    }
    return { ok: true, result };
  } catch (error) {
    const timedOut = error && error.code === 'BOOT_TIMEOUT';
    const summary = getErrorMessage(error);
    finish(timedOut ? 'timeout' : 'fail', summary);
    if (logFailure) {
      const detail = summary ? ` (${summary})` : '';
      const message = timedOut ? `Boot: ${label} timed out${detail}` : `Boot: ${label} failed${detail}`;
      console.warn(message);
    }
    return { ok: false, error, timedOut };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function waitForDomReady() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });
}

function attachCanvas(canvas) {
  const container = document.getElementById('game-container');
  if (container) {
    if (!canvas.parentNode) {
      container.appendChild(canvas);
    }
    return null;
  }

  if (document.body) {
    if (!canvas.parentNode) {
      document.body.appendChild(canvas);
    }
    return { bootDetail: 'container missing, appended to body' };
  }

  throw new Error('missing container');
}

function detachCanvas(canvas) {
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
}

function applyCompatibilitySettings() {
  if (PIXI.Filter && PIXI.Filter.defaultOptions) {
    PIXI.Filter.defaultOptions.resolution = 1;
    PIXI.Filter.defaultOptions.antialias = 'off';
  }
}

function createRendererOptions(isCompat) {
  // Cap DPR at 2 to avoid performance issues on high-DPR mobile devices
  const dpr = isCompat ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  return {
    width: 800,
    height: 600,
    backgroundColor: 0x000000,
    resolution: dpr,
    autoDensity: !isCompat,
    antialias: false,
    powerPreference: isCompat ? 'low-power' : 'high-performance',
    preference: isCompat ? 'webgl' : undefined
  };
}

async function initPixiApplication(options) {
  const canvas = document.createElement('canvas');
  const attachDetail = attachCanvas(canvas);

  try {
    let app;
    if (supportsAsyncInit) {
      app = new PIXI.Application();
      await app.init({
        ...options,
        canvas
      });
    } else {
      app = new PIXI.Application({
        ...options,
        view: canvas
      });
    }
    return { app, canvas, bootDetail: attachDetail?.bootDetail || null };
  } catch (error) {
    detachCanvas(canvas);
    throw error;
  }
}

function registerBootErrorHandlers() {
  window.addEventListener('error', (event) => {
    if (bootState.completed || bootState.fatalShown) return;
    showFatalOverlay('runtime error', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (bootState.completed || bootState.fatalShown) return;
    showFatalOverlay('unhandledrejection', event.reason);
  });
}

function registerProductionCrashGuard() {
  let hasLogged = false;

  // Use capture phase to catch errors before they bubble to other listeners
  window.addEventListener('error', (event) => {
    const msg = (event.message || '').toString();

    // Strict signature check as requested by USER
    // "Cannot set properties of null" AND "(setting 'y')"
    // Example: TypeError: Cannot set properties of null (setting 'y')
    if (msg.includes('Cannot set properties of null') && msg.includes("setting 'y'")) {
      // 1. Prevent default crash behavior / console spam
      event.preventDefault();
      event.stopImmediatePropagation();

      // 2. Log one structured warning per session
      if (!hasLogged) {
        hasLogged = true;
        console.warn('GUARD: Caught known y-property null setter crash', {
          fullMessage: msg,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error ? event.error.stack : 'No stack available'
        });
      }
    }
  }, { capture: true });
}

// TASK 3: Force Reload Logic
async function enforceVersion() {
  if (import.meta.env.DEV) {
    return false;
  }

  const storedVersion = localStorage.getItem('app_version');
  const currentVersion = BUILD_ID;
  console.log(`[Version] Current: ${currentVersion}, Stored: ${storedVersion}`);

  // 1. Check if we just updated (Local storage mismatch)
  if (storedVersion && storedVersion !== currentVersion) {
    console.log('[Version] New version detected (storage mismatch). Cleaning up...');
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        console.log('[Version] Caches cleared.');
      } catch (e) {
        console.warn('Cache clear failed', e);
      }
    }
    // Update storage
    localStorage.setItem('app_version', currentVersion);
    // User requested hard reload on new version
    window.location.reload(true);
    return true;
  }

  // Update storage if missing
  if (!storedVersion) {
    localStorage.setItem('app_version', currentVersion);
  }

  if (isDesktopRuntime()) {
    return false;
  }

  // 2. Check if we are STALE (Remote mismatch)
  // This handles the "Mobile stuck on old version" case
  try {
    const resp = await fetch(`/version.json?t=${Date.now()}`);
    if (resp.ok) {
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return false;
      const data = await resp.json();
      if (data.version && data.version !== currentVersion) {
        console.log(`[Version] Remote mismatch! Remote: ${data.version}, Local: ${currentVersion}`);
        // Aggressive cleanup
        localStorage.removeItem('app_version'); // Force storage mismatch next time
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        window.location.reload(true);
        return true;
      }
    }
  } catch (e) {
    console.warn('[Version] Remote check failed', e);
  }

  return false;
}

async function init() {
  registerProductionCrashGuard();

  if (await enforceVersion()) {
    return; // Stop boot if reloading
  }

  // Register service worker in production with version param
  if ('serviceWorker' in navigator && import.meta.env.PROD && !isDesktopRuntime()) {
    try {
      // TASK 4: Mobile Safety - Cache busting param
      const swUrl = `/sw.js?v=${BUILD_ID}`;
      const swProbe = await fetch(swUrl, { method: 'HEAD', cache: 'no-store' });
      const swContentType = swProbe.headers.get('content-type') || '';
      if (!swProbe.ok || !/(java|ecma)script/i.test(swContentType)) {
        console.warn('[SW] Service worker script missing or invalid, skipping registration.');
      } else {
        const registration = await navigator.serviceWorker.register(swUrl);
        console.log('[SW] Service worker registered:', registration.scope);

        // Force update if found
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
                console.log('[SW] New content available, reloading...');
                window.location.reload(true);
              }
            };
          }
        };
      }
    } catch (error) {
      console.warn('[SW] Service worker registration failed:', error);
    }
  }

  // --- BOOT WATCHDOG START ---
  BootWatchdog.init();
  BootWatchdog.checkpoint('BOOT_START');
  // ---------------------------

  await initializeMaintainerDevtools();
  const bootLogger = createBootLogger(isBootDebugEnabled());
  await runBootStep(bootLogger, 'init profile storage namespace', () => initializeProfileStorageNamespace(), {
    timeoutMs: 900,
    logFailure: false
  });
  await runBootStep(bootLogger, 'restore Steam Cloud persistence', () => restoreSteamCloudPersistence(), {
    timeoutMs: 900,
    logFailure: false
  });
  await runBootStep(bootLogger, 'init localization', () => initLocalization(), {
    timeoutMs: 1200,
    logFailure: false
  });
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    const { title, subtitle } = getLoadingLines();
    loadingEl.innerHTML = `${translateText(title)}<br><small>${translateText(subtitle)}</small>`;
  }

  perfState.enabled = isPerfEnabled();
  window.__perfStats = perfState;

  await runBootStep(bootLogger, 'dom ready', waitForDomReady, { timeoutMs: DOM_READY_TIMEOUT_MS });
  createPerfOverlay(perfState.enabled);
  registerBootErrorHandlers();

  let app = null;
  let canvas = null;

  const rendererResult = await runBootStep(
    bootLogger,
    'init renderer',
    async () => {
      const result = await initPixiApplication(createRendererOptions(false));
      app = result.app;
      canvas = result.canvas;
      return result;
    },
    { timeoutMs: BOOT_RENDER_TIMEOUT_MS, logFailure: false }
  );

  if (!rendererResult.ok) {
    if (app) {
      app.destroy(true);
      app = null;
    }
    if (canvas) {
      detachCanvas(canvas);
      canvas = null;
    }

    const compatResult = await runBootStep(
      bootLogger,
      'init renderer (compat)',
      async () => {
        applyCompatibilitySettings();
        const result = await initPixiApplication(createRendererOptions(true));
        app = result.app;
        canvas = result.canvas;
        return result;
      },
      { timeoutMs: BOOT_RENDER_TIMEOUT_MS, logFailure: false }
    );

    if (!compatResult.ok) {
      showFatalOverlay('init renderer (compat)', compatResult.error || rendererResult.error);
      return;
    }
  }

  await runBootStep(bootLogger, 'attach canvas', () => {
    if (!canvas) {
      throw new Error('missing canvas');
    }
    return attachCanvas(canvas);
  });

  await runBootStep(bootLogger, 'hide loading', () => {
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  });

  const audioResult = await runBootStep(bootLogger, 'init audio', () => {
    AudioManager.init();
    if (AudioManager.AUDIO_ENABLED && !AudioManager.enabled) {
      // It's allowed to be disabled via flag, but if flag is true and enabled is false, it's a runtime failure
      // Actually our AudioManager now hard checks flag. 
      // check flag:
      if (AudioManager.AUDIO_ENABLED && !AudioManager.audioEnabled) {
        throw new Error('audio disallowed environment');
      }
    }
  });

  if (!audioResult.ok) {
    // If audio init failed, we just proceed without audio
  }

  const resizeCanvas = (layout) => {
    if (!app) return;

    const canvasWidth = Math.max(1, Math.round(layout.width));
    const canvasHeight = Math.max(1, Math.round(layout.height));

    app.renderer.resize(canvasWidth, canvasHeight);
    const view = app.canvas || app.view;
    if (view) {
      view.style.width = `${canvasWidth}px`;
      view.style.height = `${canvasHeight}px`;
    }
  };
  addResponsiveListener((layout) => resizeCanvas(layout));
  resizeCanvas(getCurrentLayout());

  const game = new Game(app);
  window.__app = app;
  window.__game = game;
  window.render_game_to_text = () => JSON.stringify(buildGameTextState(game));
  window.advanceTime = (ms = 1000 / 60) => {
    const steps = Math.max(1, Math.min(600, Math.round(Number(ms) / (1000 / 60))));
    for (let i = 0; i < steps; i++) {
      publishTickerFrameTiming(game, 1, 1, 'advanceTime');
      game.update(1);
      updatePerfStats(app, game, 1, 1);
    }
    return buildGameTextState(game);
  };
  perfState.renderer = app.renderer?.constructor?.name || perfState.renderer;
  await runBootStep(bootLogger, 'start game', () => {
    game.start();
    if (document.body) {
      document.body.dataset.menuReady = '1';
    }
    syncSteamCloudRendererState().catch(() => {});
    const displaySettings = getDisplaySettings();
    const hasDisplayBridge = Boolean(window.__novaDisplay?.applySettings);
    if (hasDisplayBridge || displaySettings.mode !== 'fullscreen') {
      applyDisplaySettings(displaySettings).catch(() => {});
    }
    if (isAutoStartEnabled() && !autoStartTriggered) {
      autoStartTriggered = true;
      setTimeout(() => {
        game.startGame(undefined, { countShipUsage: false });
      }, 100);
    }
  });

  await runBootStep(bootLogger, 'start ticker', () => {
    app.ticker.add((delta) => {
      const rawDelta = delta.deltaTime;
      const clampedDelta = Math.min(rawDelta, MAX_DELTA);
      publishTickerFrameTiming(game, rawDelta, clampedDelta);
      game.update(clampedDelta);
      updatePerfStats(app, game, rawDelta, clampedDelta);
    });
  });

  bootState.completed = true;
  BootWatchdog.checkpoint('SCENE_READY');
}

init().catch((error) => {
  showFatalOverlay('unexpected error', error);
});
