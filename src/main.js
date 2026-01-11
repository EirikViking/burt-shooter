import * as PIXI from 'pixi.js';
import { Game } from './game/Game.js';
import { AudioManager } from './audio/AudioManager.js';

const BOOT_RENDER_TIMEOUT_MS = 5000;
const DOM_READY_TIMEOUT_MS = 2000;
const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
const GIT_SHA = typeof __GIT_SHA__ !== 'undefined' ? __GIT_SHA__ : 'unknown';
const bootState = {
  completed: false,
  fatalShown: false,
  fatalLogged: false
};
const supportsAsyncInit = typeof PIXI.Application?.prototype?.init === 'function';

function isBootDebugEnabled() {
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1';
}

function ensureBuildStamp() {
  let stamp = document.getElementById('build-stamp');
  if (stamp) {
    return stamp;
  }

  stamp = document.createElement('div');
  stamp.id = 'build-stamp';
  stamp.textContent = `Build ${BUILD_ID} | ${GIT_SHA}`;
  stamp.style.cssText = [
    'position: fixed',
    'right: 8px',
    'bottom: 8px',
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

  return stamp;
}

function createBootLogger(enabled) {
  if (!enabled) {
    return {
      startStep: () => () => {}
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
  return {
    width: 800,
    height: 600,
    backgroundColor: 0x000000,
    resolution: isCompat ? 1 : window.devicePixelRatio || 1,
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

async function init() {
  const bootLogger = createBootLogger(isBootDebugEnabled());
  const loadingEl = document.getElementById('loading');

  await runBootStep(bootLogger, 'dom ready', waitForDomReady, { timeoutMs: DOM_READY_TIMEOUT_MS });
  ensureBuildStamp();
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
    if (!AudioManager.enabled) {
      throw new Error('audio disabled');
    }
  });

  if (!audioResult.ok) {
    AudioManager.enabled = false;
  }

  const game = new Game(app);
  await runBootStep(bootLogger, 'start game', () => {
    game.start();
    if (document.body) {
      document.body.dataset.menuReady = '1';
    }
  });

  await runBootStep(bootLogger, 'start ticker', () => {
    app.ticker.add((delta) => {
      game.update(delta.deltaTime);
    });
  });

  bootState.completed = true;
}

init().catch((error) => {
  showFatalOverlay('unexpected error', error);
});
