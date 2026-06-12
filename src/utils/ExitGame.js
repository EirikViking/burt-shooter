export const EXIT_GAME_WEB_MESSAGE = '';

export async function requestExitGame() {
  if (window.__novaApp?.exitGame) {
    return window.__novaApp.exitGame();
  }

  return {
    ok: false,
    reason: 'desktop_only'
  };
}
