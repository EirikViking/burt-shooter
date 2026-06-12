import { translateText } from '../i18n/index.js';

export const EXIT_GAME_WEB_MESSAGE = 'EXIT IS ONLY AVAILABLE IN DESKTOP BUILD';

export async function requestExitGame() {
  if (window.__novaApp?.exitGame) {
    return window.__novaApp.exitGame(createExitConfirmationPayload());
  }

  return {
    ok: false,
    message: EXIT_GAME_WEB_MESSAGE
  };
}

function createExitConfirmationPayload() {
  return {
    title: translateText('QUIT GAME?'),
    message: translateText('Are you sure you want to close Nova Swarm?'),
    detail: translateText('This closes the game. Unsaved run progress will be lost.'),
    confirmLabel: translateText('QUIT'),
    cancelLabel: translateText('CANCEL')
  };
}
