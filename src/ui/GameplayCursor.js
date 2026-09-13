const GAMEPLAY_CURSOR_CLASS = 'gameplay-cursor-hidden';

let gameplayCursorHidden = false;

function hasVisiblePixiOverlay(container) {
  return Boolean(container?.visible !== false && container?.parent);
}

function getActiveSettingsOverlay(game, playScene) {
  return game?.currentScene?.settingsOverlay || playScene?.settingsOverlay || null;
}

export function shouldHideGameplayCursor(game) {
  const playScene = game?.scenes?.play;
  const isActivePlayScene = Boolean(playScene && game?.currentSceneName === 'play' && game?.currentScene === playScene);
  if (!isActivePlayScene) return false;
  if (typeof document !== 'undefined' && document.getElementById('fatal-overlay')) return false;
  if (playScene?.isPaused) return false;
  if (hasVisiblePixiOverlay(playScene?.pauseOverlay)) return false;
  if (getActiveSettingsOverlay(game, playScene)?.container?.parent) return false;
  if (playScene?.gameOverInterlude?.active || hasVisiblePixiOverlay(playScene?.gameOverInterlude?.overlay)) return false;
  return true;
}

export function setGameplayCursorHidden(hidden) {
  gameplayCursorHidden = Boolean(hidden);
  if (typeof document === 'undefined') return gameplayCursorHidden;

  const targets = [document.documentElement, document.body].filter(Boolean);
  for (const target of targets) {
    if (gameplayCursorHidden) {
      target.classList.add(GAMEPLAY_CURSOR_CLASS);
    } else {
      target.classList.remove(GAMEPLAY_CURSOR_CLASS);
    }
  }
  return gameplayCursorHidden;
}

export function syncGameplayCursorVisibility(game) {
  return setGameplayCursorHidden(shouldHideGameplayCursor(game));
}

export function isGameplayCursorHidden() {
  return gameplayCursorHidden;
}

export function getGameplayCursorDebugState(game) {
  const playScene = game?.scenes?.play;
  const canvas = game?.app?.canvas || game?.app?.view || (typeof document !== 'undefined'
    ? document.querySelector('#game-container canvas, canvas')
    : null);
  const container = typeof document !== 'undefined' ? document.getElementById('game-container') : null;
  const cursorFor = (node) => {
    try {
      return node && typeof getComputedStyle === 'function' ? getComputedStyle(node).cursor : null;
    } catch {
      return null;
    }
  };

  return {
    hidden: gameplayCursorHidden,
    shouldHide: shouldHideGameplayCursor(game),
    activeGameplay: Boolean(playScene && game?.currentSceneName === 'play' && game?.currentScene === playScene),
    canvasCursor: cursorFor(canvas),
    containerCursor: cursorFor(container),
    bodyCursor: typeof document !== 'undefined' ? cursorFor(document.body) : null,
    htmlCursor: typeof document !== 'undefined' ? cursorFor(document.documentElement) : null
  };
}
