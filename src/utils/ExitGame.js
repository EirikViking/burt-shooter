export const EXIT_GAME_WEB_MESSAGE = '';
const EXIT_REQUEST_TIMEOUT_MS = 1200;

async function requestDesktopExitOnce() {
  let timeoutId = null;
  try {
    return await Promise.race([
      Promise.resolve(window.__novaApp.exitGame()),
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('exit_request_timeout')), EXIT_REQUEST_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  }
}

export async function requestExitGame() {
  if (window.__novaApp?.exitGame) {
    try {
      return await requestDesktopExitOnce();
    } catch (firstError) {
      try {
        return await requestDesktopExitOnce();
      } catch {
        return { ok: false, reason: firstError?.message || 'exit_request_failed' };
      }
    }
  }

  return {
    ok: false,
    reason: 'desktop_only'
  };
}
