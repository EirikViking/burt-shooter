import './styles.css';
import * as PIXI from 'pixi.js';
import { Game } from './game/Game.js';
import { AudioManager } from './audio/AudioManager.js';
import { BootWatchdog } from './utils/BootWatchdog.js';
import { getLoadingLines } from './text/phrasePool.js';
import { applyResponsiveLayout, addResponsiveListener, getCurrentLayout } from './ui/responsiveLayout.js';

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

applyResponsiveLayout(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  applyResponsiveLayout(window.innerWidth, window.innerHeight);
});
window.addEventListener('orientationchange', () => {
  applyResponsiveLayout(window.innerWidth, window.innerHeight);
});

function isBootDebugEnabled() {
  return urlParams.get('debug') === '1';
}

function isPerfEnabled() {
  return urlParams.get('perf') === '1';
}

function isAutoStartEnabled() {
  return urlParams.get('autostart') === '1';
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
    'font-family: "Courier New", monospace',
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
    'font-family: "Courier New", monospace',
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
  perfState.frameMs = app.ticker.deltaMS || 0;
  perfState.fps = app.ticker.FPS || (perfState.frameMs ? 1000 / perfState.frameMs : 0);
  perfState.delta = delta;
  perfState.clampedDelta = clampedDelta;
  perfState.level = game?.level || 0;
  perfState.renderer = app.renderer?.constructor?.name || perfState.renderer;

  const playScene = game?.scenes?.play;
  const isPlayScene = playScene && game?.currentScene === playScene;
  perfState.scene = isPlayScene ? 'play' : (game?.currentScene?.constructor?.name || 'unknown');

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
    'font-family: "Courier New", monospace',
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
    'font-family: "Courier New", monospace',
    'font-size: 14px',
    'white-space: pre-wrap'
  ].join(';');

  const message = getErrorMessage(error);
  const stackExcerpt = getStackExcerpt(error);
  const lines = [
    'Kunne ikke starte spillet.',
    `Steg: ${step}`,
    `Feil: ${message}`,
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

  // 2. Check if we are STALE (Remote mismatch)
  // This handles the "Mobile stuck on old version" case
  try {
    const resp = await fetch(`/version.json?t=${Date.now()}`);
    if (resp.ok) {
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
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      // TASK 4: Mobile Safety - Cache busting param
      const registration = await navigator.serviceWorker.register(`/sw.js?v=${BUILD_ID}`);
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
    } catch (error) {
      console.warn('[SW] Service worker registration failed:', error);
    }
  }

  // --- BOOT WATCHDOG START ---
  BootWatchdog.init();
  BootWatchdog.checkpoint('BOOT_START');
  // ---------------------------

  const bootLogger = createBootLogger(isBootDebugEnabled());
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    const { title, subtitle } = getLoadingLines();
    loadingEl.innerHTML = `${title}<br><small>${subtitle}</small>`;
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

    // On desktop, limit to reasonable dimensions and 16:9 aspect ratio
    let canvasWidth = layout.width;
    let canvasHeight = layout.height;

    if (!layout.isMobile) {
      // Enforce maximum width of 1280px (BASE_WIDTH) for consistent gameplay
      const maxWidth = 1280;
      const targetAspect = 16 / 9;

      if (canvasWidth > maxWidth) {
        canvasWidth = maxWidth;
        canvasHeight = Math.round(canvasWidth / targetAspect);
      } else {
        const currentAspect = canvasWidth / canvasHeight;
        if (currentAspect > targetAspect) {
          // Too wide - limit width to maintain 16:9
          canvasWidth = Math.round(canvasHeight * targetAspect);
        }
      }
    }

    app.renderer.resize(canvasWidth, canvasHeight);
    const view = app.view;
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
  perfState.renderer = app.renderer?.constructor?.name || perfState.renderer;
  await runBootStep(bootLogger, 'start game', () => {
    game.start();
    if (document.body) {
      document.body.dataset.menuReady = '1';
    }
    if (isAutoStartEnabled() && !autoStartTriggered) {
      autoStartTriggered = true;
      setTimeout(() => {
        game.startGame();
      }, 100);
    }
  });

  await runBootStep(bootLogger, 'start ticker', () => {
    app.ticker.add((delta) => {
      const rawDelta = delta.deltaTime;
      const clampedDelta = Math.min(rawDelta, MAX_DELTA);
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
