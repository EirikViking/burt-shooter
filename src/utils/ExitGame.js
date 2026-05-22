export const EXIT_GAME_WEB_MESSAGE = 'EXIT IS ONLY AVAILABLE IN DESKTOP BUILD';

export async function requestExitGame() {
  if (window.__novaApp?.exitGame) {
    await window.__novaApp.exitGame();
    return { ok: true };
  }

  return {
    ok: false,
    message: EXIT_GAME_WEB_MESSAGE
  };
}
