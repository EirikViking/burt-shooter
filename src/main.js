import * as PIXI from 'pixi.js';
import { Game } from './game/Game.js';
import { AudioManager } from './audio/AudioManager.js';

// Initialize PixiJS application
const app = new PIXI.Application();
const BOOT_RENDER_TIMEOUT_MS = 4000;

function isBootDebugEnabled() {
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1';
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

async function runBootStep(logger, label, fn, options = {}) {
  const { timeoutMs, critical } = options;
  const finish = logger.startStep(label);
  let timeoutId;

  try {
    const task = Promise.resolve().then(fn);
    const result = timeoutMs
      ? await Promise.race([
          task,
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              const error = new Error('timeout');
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
    finish(timedOut ? 'timeout' : 'fail', error?.message);
    const message = timedOut ? `Boot: ${label} timed out` : `Boot: ${label} failed`;
    if (critical) {
      console.error(message);
    } else {
      console.warn(message);
    }
    return { ok: false, error, timedOut };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function attachCanvas(canvas) {
  const container = document.getElementById('game-container');
  if (container) {
    container.appendChild(canvas);
    return null;
  }

  if (document.body) {
    document.body.appendChild(canvas);
    return { bootDetail: 'container missing, appended to body' };
  }

  throw new Error('missing container');
}

async function init() {
  const bootLogger = createBootLogger(isBootDebugEnabled());
  const loadingEl = document.getElementById('loading');

  const rendererResult = await runBootStep(
    bootLogger,
    'init renderer',
    () => app.init({
      width: 800,
      height: 600,
      backgroundColor: 0x000000,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false
    }),
    { timeoutMs: BOOT_RENDER_TIMEOUT_MS, critical: true }
  );

  if (!rendererResult.ok) {
    if (loadingEl) {
      loadingEl.textContent = 'Kunne ikke starte spillet.';
    }
    return;
  }

  await runBootStep(bootLogger, 'attach canvas', () => attachCanvas(app.canvas));
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
  });

  await runBootStep(bootLogger, 'start ticker', () => {
    app.ticker.add((delta) => {
      game.update(delta.deltaTime);
    });
  });
}

init().catch(() => {
  console.error('Boot: unexpected error');
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.textContent = 'Kunne ikke starte spillet.';
  }
});
