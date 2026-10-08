import { t } from '../i18n/index.js';

// A bounded diagnostic record, never a score submission or an interrupted-run save.
export function installRuntimeRecovery({ app, game, buildId, gitSha, window: win = window, document: doc = document }) {
  let panel = null;
  let restored = false;
  let fatal = false;
  let stopped = false;
  let storageFailed = false;
  let contextLost = false;
  const events = [];
  const record = (kind, error) => {
    events.push({ at: new Date().toISOString(), kind, message: String(error?.message || error || '').slice(0, 1200),
      stack: String(error?.stack || '').slice(0, 3000), scene: game.currentSceneName,
      mode: game.runMode, sector: game.level, score: game.score, completed: game.runFinalized === true });
    if (events.length > 12) events.shift();
    const report = { buildId, gitSha, renderer: app.renderer?.constructor?.name, events: [...events] };
    console.warn('[RuntimeRecovery]', report);
    void win.__novaApp?.writeRecoveryReport?.(report)?.catch?.(() => {});
    return report;
  };
  const show = (kind, error, canRecover = false) => {
    record(kind, error);
    if (!canRecover) fatal = true;
    if (!stopped) { stopped = true; app.ticker.stop(); }
    // Pausing never finalizes or awards the interrupted run.
    try { if (game.currentSceneName === 'play') game.currentScene?.setPaused?.(true); } catch {}
    if (panel) {
      const resume = doc.getElementById('runtime-recovery-resume');
      if (resume) resume.disabled = !restored || fatal;
      return;
    }
    panel = doc.createElement('div');
    panel.id = 'runtime-recovery';
    panel.setAttribute('role', 'alertdialog');
    panel.style.cssText = 'position:fixed;inset:0;z-index:20000;background:#07111ff2;color:white;padding:8vh 8vw;font:20px/1.5 "Segoe UI",sans-serif;overflow:auto';
    const title = doc.createElement('h2'); title.textContent = t('recovery.title');
    const help = doc.createElement('p'); help.textContent = t(storageFailed ? 'recovery.storageHelp' : 'recovery.help');
    const detail = doc.createElement('p'); detail.textContent = `${buildId} · ${kind}`;
    const resume = doc.createElement('button'); resume.textContent = t('recovery.resume');
    resume.disabled = !restored || fatal;
    resume.id = 'runtime-recovery-resume';
    resume.onclick = () => {
      if (!restored || fatal) return;
      panel.remove(); panel = null; stopped = false;
      game.scenes?.play?.inputManager?.resetTransientState?.({ preserveFire: false, suppressUntilReleased: true });
      app.ticker.start(); // Existing pause UI owns the deliberate return to combat.
    };
    const reload = doc.createElement('button'); reload.textContent = t('recovery.restart');
    reload.id = 'runtime-recovery-restart'; reload.disabled = storageFailed;
    reload.onclick = () => win.location.reload();
    for (const button of [resume, reload]) button.style.cssText = 'font:inherit;padding:12px;margin:8px';
    panel.append(title, help, detail, resume, reload);
    doc.body.append(panel); reload.focus();
  };
  const canvas = app.canvas || app.view;
  canvas?.addEventListener('webglcontextlost', event => {
    event.preventDefault(); restored = false; contextLost = true;
    show('context_lost', 'WebGL context lost', true);
  });
  canvas?.addEventListener('webglcontextrestored', () => {
    restored = true; contextLost = false; record('context_restored');
    const button = doc.getElementById('runtime-recovery-resume');
    if (button && !fatal) { button.disabled = false; button.focus(); }
  });
  win.addEventListener('error', event => {
    // Resource load failures do not establish that the frame loop has failed.
    if (event.error) show('runtime_error', event.error);
  });
  win.addEventListener('unhandledrejection', event => record('unhandled_rejection', event.reason));
  win.addEventListener('nova-storage-status', event => {
    storageFailed = event.detail?.failed === true;
    if (storageFailed) {
      restored = !contextLost;
      show('storage_write_failed', event.detail?.error, true);
    } else {
      record('storage_write_recovered');
      const reload = doc.getElementById('runtime-recovery-restart');
      if (reload) reload.disabled = false;
    }
  });
  return { fail: (error) => show('frame_error', error), record, get stopped() { return stopped; } };
}
