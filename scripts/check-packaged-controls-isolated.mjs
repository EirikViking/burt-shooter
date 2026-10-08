import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Packaged renderer control regression. Focus IPC and gamepad snapshots are QA
// inputs; this does not claim physical Alt+Tab, XInput, or Steam Overlay coverage.
const sourceRoot = path.resolve(process.env.NOVA_SWARM_SOURCE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const require = createRequire(path.join(sourceRoot, 'package.json'));
const { _electron: electron } = require('playwright');
const executablePath = process.env.NOVA_SWARM_PACKAGED_EXE;
const outputDir = process.env.NOVA_PACKAGED_CONTROL_QA_OUTPUT_DIR;
assert(executablePath && path.isAbsolute(executablePath) && existsSync(executablePath), 'Set NOVA_SWARM_PACKAGED_EXE to the verified packaged executable');
assert(outputDir && path.isAbsolute(outputDir), 'Set an absolute NOVA_PACKAGED_CONTROL_QA_OUTPUT_DIR');
if (process.platform === 'win32') {
  for (const [name, value] of Object.entries({ outputDir, TEMP: process.env.TEMP, TMP: process.env.TMP })) {
    assert(/^E:[\\/]/i.test(value || ''), `${name} must use the task-owned E drive`);
  }
}
const profile = path.join(outputDir, 'profile');
mkdirSync(profile, { recursive: true });
const report = {
  status: 'running', executablePath, sourceRoot, outputDir, profile,
  scope: 'Unchanged package; simulated native-focus IPC and gamepad snapshot; real renderer keyboard events; no physical focus/controller/overlay claim',
  fixture: { controlSmokeQuery: true, playerInvulnerabilityMs: 60000 },
  checks: [], states: {}, consoleErrors: [],
};
let app;
let page;
const checked = (name, condition, detail) => {
  report.checks.push({ name, passed: Boolean(condition), ...(detail === undefined ? {} : { detail }) });
  assert(condition, `${name}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
};
const pad = (axes = [0, 0], pressed = []) => ({ id: 'isolated-packaged-controls', index: 0, connected: true,
  axes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })) });
async function setPad(value) { await page.evaluate(value => { window.__burtGamepadOverride = value; }, value); }
async function focus(active) {
  await app.evaluate(({ BrowserWindow }, active) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.webContents.send('nova-native:focus', active);
    win.webContents.send(active ? 'nova-app:window-focus' : 'nova-app:window-blur');
  }, active);
  await page.waitForFunction(active => window.__novaNativePresentation?.isInputActive?.() === active, active, { timeout: 5000 });
}
async function state(label) {
  const renderer = await page.evaluate(() => {
    const game = window.__game, play = game?.scenes?.play, input = play?.inputManager;
    const text = JSON.parse(window.render_game_to_text?.() || '{}');
    return {
      nativeInputActive: window.__novaNativePresentation?.isInputActive?.(),
      documentHasFocus: document.hasFocus(), documentHidden: document.hidden,
      scene: game?.currentSceneName, ready: Boolean(play?.isReady),
      controlSmokeMode: Boolean(play?.controlSmokeMode), introComplete: Boolean(play?.introComplete),
      introActive: Boolean(play?.introActive), active: Boolean(play?.player?.active),
      lives: text.lives, level: text.level, waveState: text.wave?.state,
      paused: Boolean(play?.isPaused), pauseVisible: Boolean(play?.pauseOverlay?.visible && play?.pauseOverlay?.parent),
      x: play?.player?.x, y: play?.player?.y, shots: text.player?.traitState?.shotsFired || 0,
      gamepad: input?.getGamepadState?.(), controls: input?.getTransientDebugState?.(),
      build: text.buildId, gitSha: text.gitSha,
    };
  });
  const native = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    return { focused: win.isFocused(), inputActive: win.nativePresentation?.inputActive?.(), diagnostics: win.nativePresentation?.diagnostics?.() || null };
  });
  const value = { ...renderer, native };
  report.states[label] = value;
  return value;
}
function assertPlay(value, label, initial) {
  checked(`${label}: active play fixture`, value.scene === 'play' && value.ready && value.active && value.introComplete && !value.introActive);
  if (initial) checked(`${label}: no life loss or sector transition`, value.lives === initial.lives && value.level === initial.level);
}
async function tap(key) { await page.keyboard.down(key); await page.waitForTimeout(65); await page.keyboard.up(key); await page.waitForTimeout(65); }
async function neutral() {
  for (const key of ['ArrowRight', 'ArrowUp', 'Space', 'p']) await page.keyboard.up(key);
  await setPad(pad());
  await page.waitForTimeout(80);
  await page.evaluate(() => window.__game.scenes.play.inputManager.pollGamepad(true));
}
try {
  app = await electron.launch({ executablePath, args: ['--nova-fresh-profile', `--nova-qa-user-data=${profile}`, '--windowed'],
    cwd: path.dirname(executablePath), timeout: 120000,
    env: { ...process.env, NOVA_SWARM_USER_DATA_DIR: profile, NOVA_SWARM_FRESH_PROFILE: '1', NOVA_SWARM_WINDOWED: '1', NOVA_SWARM_DISABLE_STEAMWORKS: '1' } });
  page = await app.firstWindow();
  page.on('pageerror', error => report.consoleErrors.push(error.stack || error.message));
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 120000 });
  const launch = await app.evaluate(({ app, BrowserWindow }) => ({ userData: app.getPath('userData'), packaged: app.isPackaged, url: BrowserWindow.getAllWindows()[0].webContents.getURL() }));
  report.launch = launch;
  checked('packaged executable', launch.packaged === true);
  checked('explicit isolated userData', path.resolve(launch.userData).toLowerCase() === path.resolve(profile).toLowerCase());
  const url = new URL(launch.url); url.searchParams.set('controlSmoke', '1'); url.searchParams.set('offlineLeaderboard', '1');
  await app.evaluate(async ({ BrowserWindow }, url) => BrowserWindow.getAllWindows()[0].loadURL(url), url.toString());
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 120000 });
  await page.evaluate(() => window.__game.startGame());
  await page.waitForFunction(() => {
    const p = window.__game?.scenes?.play;
    const t = JSON.parse(window.render_game_to_text?.() || '{}');
    return window.__game?.currentSceneName === 'play' && p?.isReady && p.player?.active && p.introComplete && !p.introActive && t.wave?.state === 'WAVE_ACTIVE';
  }, null, { timeout: 120000 });
  await page.evaluate(() => { const p = window.__game.scenes.play.player; p.invulnerable = true; p.invulnerableTime = 60000; });
  const initial = await state('initial');
  assertPlay(initial, 'initial');
  checked('controlSmoke fixture skips intro', initial.controlSmokeMode);
  const isolation = await page.evaluate(async () => ({
    achievements: await window.__novaSteamAchievements?.getStatus?.(),
    leaderboard: await window.__novaSteamBridge?.getStatus?.(),
    profile: await window.__novaSteamCloud?.getProfileContext?.(),
  }));
  report.isolation = isolation;
  checked('achievement writes isolated', isolation.achievements?.reason === 'fresh_profile_isolated');
  checked('leaderboard writes isolated', isolation.leaderboard?.reason === 'fresh_profile_isolated');

  await focus(false);
  const blockedStart = await state('inactiveStart');
  await setPad(pad([1, -1], [0, 9]));
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowUp'); await page.keyboard.down('Space'); await page.keyboard.down('p');
  await page.waitForTimeout(180);
  const blocked = await state('inactiveHeld');
  checked('inactive native gate remains false', blocked.nativeInputActive === false);
  checked('inactive gate blocks keyboard/gamepad motion and fire', Math.abs(blocked.x - blockedStart.x) < 1 && Math.abs(blocked.y - blockedStart.y) < 1 && blocked.shots === blockedStart.shots, { before: blockedStart, after: blocked });
  checked('inactive gate blocks pause and gamepad edges', !blocked.paused && !blocked.pauseVisible && blocked.gamepad.moveX === 0 && blocked.gamepad.moveY === 0 && !blocked.gamepad.firing && !blocked.gamepad.pauseJustPressed);
  checked('inactive held actions are suppressed', blocked.controls.suppressedGamepadActions.moveX === 1 && blocked.controls.suppressedGamepadActions.moveY === -1 && blocked.controls.suppressedGamepadActions.firing === true && blocked.controls.suppressedGamepadActions.pause === true);
  await focus(true);
  await neutral();
  const active = await state('activeNeutral');
  checked('active native QA focus acknowledged', active.nativeInputActive === true);
  checked('ordinary release clears input suppression', active.controls.suppressedKeys.length === 0 && Object.keys(active.controls.suppressedGamepadActions).length === 0, active.controls);

  await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowUp'); await page.keyboard.down('Space');
  await page.waitForTimeout(450);
  const keyboard = await state('keyboardHeld');
  assertPlay(keyboard, 'keyboard', initial);
  checked('keyboard moves actual player right and up', keyboard.x > active.x + 8 && keyboard.y < active.y - 4);
  checked('keyboard fires actual shots', keyboard.shots > active.shots);
  checked('keyboard stage retains simulated active focus', keyboard.nativeInputActive === true);
  await neutral();
  await tap('p');
  const keyboardPaused = await state('keyboardPaused');
  checked('keyboard pause opens overlay once', keyboardPaused.paused && keyboardPaused.pauseVisible);
  await tap('p');
  const keyboardResumed = await state('keyboardResumed');
  checked('keyboard resume closes overlay', !keyboardResumed.paused && !keyboardResumed.pauseVisible);

  await neutral();
  const padStart = await state('gamepadStart');
  await setPad(pad([-1, 1], [0]));
  await page.waitForTimeout(450);
  const gamepad = await state('gamepadHeld');
  assertPlay(gamepad, 'gamepad', initial);
  checked('gamepad axes register', gamepad.gamepad.connected && gamepad.gamepad.moveX < -0.6 && gamepad.gamepad.moveY > 0.6);
  checked('gamepad moves actual player left and down', gamepad.x < padStart.x - 8 && gamepad.y > padStart.y + 4);
  checked('gamepad fires actual shots', gamepad.shots > padStart.shots);
  checked('gamepad stage retains simulated active focus', gamepad.nativeInputActive === true);
  await neutral();
  await setPad(pad([0, 0], [9])); await page.waitForTimeout(100);
  const gamepadPaused = await state('gamepadPaused');
  checked('gamepad pause opens overlay once', gamepadPaused.paused && gamepadPaused.pauseVisible);
  await page.waitForTimeout(120);
  const gamepadHeldPause = await state('gamepadPauseHeld');
  checked('held gamepad pause does not retrigger', gamepadHeldPause.paused && gamepadHeldPause.pauseVisible);
  await neutral();
  await setPad(pad([0, 0], [9])); await page.waitForTimeout(100);
  const gamepadResumed = await state('gamepadResumed');
  checked('gamepad release then press resumes', !gamepadResumed.paused && !gamepadResumed.pauseVisible);
  await neutral();
  const final = await state('final');
  assertPlay(final, 'final', initial);
  checked('no renderer exceptions', report.consoleErrors.length === 0, report.consoleErrors);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack || error.message;
  try { if (page) await state('failure'); } catch {}
  process.exitCode = 1;
} finally {
  try { if (page) await setPad(null); } catch {}
  try { if (app) await app.close(); } catch (error) { report.closeError = error.message; report.status = 'failed'; process.exitCode = 1; }
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, report: path.join(outputDir, 'report.json'), error: report.error || null }));
}
