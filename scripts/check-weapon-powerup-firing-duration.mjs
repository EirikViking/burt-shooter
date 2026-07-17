import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

import {
  ALL_POWERUP_TYPES,
  getPowerupEffect,
  getPowerupDurationMode,
  isWeaponPowerupDurationMode
} from '../src/config/PowerupCatalog.js';

const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/weapon-powerup-firing-duration-${timestamp()}`);
const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4375));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';
const playerSource = readFileSync(new URL('../src/entities/Player.js', import.meta.url), 'utf8');
const inputSource = readFileSync(new URL('../src/input/InputManager.js', import.meta.url), 'utf8');
const failures = [];

const expectedWhileFiring = [
  'triple_beam',
  'rapid_cabinet',
  'overdrive_core',
  'rapid_fire',
  'double_shot',
  'damage_up',
  'pierce',
  'prism_splitter',
  'rail_surge',
  'plasma_lance',
  'mirror_shots',
  'target_paint'
];

const expectedGameplayClock = [
  'chrono_anchor',
  'void_crown',
  'reactor_redline',
  'static_bloom',
  'lucky_reactor',
  'packet_storm',
  'boss_breaker',
  'mirror_palace',
  'afterburner_choir',
  'dead_sun_dividend'
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function isPortAvailable(candidatePort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(candidatePort, host);
  });
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    if (await isPortAvailable(candidate)) return candidate;
  }
  throw new Error(`No available check port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startTestServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite test server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function fail(message) {
  failures.push(message);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function hasWeaponModifier(effect = {}) {
  return Boolean(
    Number.isFinite(effect.shotsMin) ||
    Number.isFinite(effect.shotBonus) ||
    Number.isFinite(effect.fireRateMult) ||
    Number.isFinite(effect.damageMult) ||
    Number.isFinite(effect.damageMin) ||
    Number.isFinite(effect.bulletSpeedMult) ||
    effect.pierce === true
  );
}

function hasNonWeaponTimedModifier(effect = {}) {
  return Boolean(
    effect.slowTime ||
    effect.ghost ||
    effect.scoreMultiplier ||
    effect.magnetRadius ||
    effect.droneCount ||
    effect.pointDefense ||
    effect.chainMax ||
    effect.orbitalCharges ||
    effect.vampire ||
    Number.isFinite(effect.speedMult) ||
    Number.isFinite(effect.movementBoostMult) ||
    Number.isFinite(effect.dodgeDelayMult)
  );
}

function simulateRealDuration(baseMs, firingDutyCycle) {
  if (firingDutyCycle <= 0) return Number.POSITIVE_INFINITY;
  return baseMs / firingDutyCycle;
}

const rows = ALL_POWERUP_TYPES.map((type) => {
  const effect = getPowerupEffect(type) || {};
  return {
    type,
    durationMs: Math.max(0, Number(effect.durationMs || 0)),
    durationMode: getPowerupDurationMode(type),
    weaponModifier: hasWeaponModifier(effect),
    nonWeaponTimedModifier: hasNonWeaponTimedModifier(effect),
    instant: effect.instant === true,
    charges: effect.charges === true || Number.isFinite(effect.bombShots)
  };
});

for (const type of expectedWhileFiring) {
  if (!isWeaponPowerupDurationMode(type)) fail(`${type} should deplete while firing`);
}

for (const row of rows) {
  if (row.durationMode === 'while_firing' && !row.weaponModifier) {
    fail(`${row.type} uses while_firing without a verified weapon modifier`);
  }
  if (row.durationMode === 'while_firing' && row.nonWeaponTimedModifier && !expectedWhileFiring.includes(row.type)) {
    fail(`${row.type} has mixed non-weapon timing and was not explicitly approved for while_firing`);
  }
  if (expectedGameplayClock.includes(row.type) && row.durationMode !== 'wall_clock') {
    fail(`${row.type} has mixed or autonomous benefits and must use the gameplay clock`);
  }
}

const wallClockTimed = rows
  .filter((row) => row.durationMs > 0 && row.durationMode === 'wall_clock')
  .map((row) => row.type);
const chargeOrInstant = rows
  .filter((row) => row.instant || row.charges || row.durationMs <= 0)
  .map((row) => row.type);

for (const needle of [
  'updateActivePowerupDuration',
  'isWeaponPowerupDrainActive',
  'this.inputManager?.isFiring?.()',
  'this.activePowerup.remainingMs',
  "durationMode: this.activePowerup.durationMode || 'wall_clock'"
]) {
  if (!playerSource.includes(needle)) fail(`Player missing weapon duration marker: ${needle}`);
}

for (const needle of [
  "this.isKeyPressed('Space')",
  "this.isKeyPressed('shoot')",
  'this.touchFireActive',
  'gamepad.firing'
]) {
  if (!inputSource.includes(needle)) fail(`InputManager.isFiring missing source marker: ${needle}`);
}
if (!inputSource.includes('pointerdown') || !inputSource.includes('pointerup')) {
  fail('mouse/pointer fire should feed touchFireActive');
}

const baseMs = 10000;
const balanceSamples = [1, 0.85, 0.7, 0.55, 0.4].map((dutyCycle) => ({
  firingDutyCycle: dutyCycle,
  oldRealDurationSeconds: round(baseMs / 1000),
  newRealDurationSeconds: Number.isFinite(simulateRealDuration(baseMs, dutyCycle))
    ? round(simulateRealDuration(baseMs, dutyCycle) / 1000)
    : null,
  realTimeIncreaseMult: Number.isFinite(simulateRealDuration(baseMs, dutyCycle))
    ? round(simulateRealDuration(baseMs, dutyCycle) / baseMs)
    : null
}));

const typical = balanceSamples.find((row) => row.firingDutyCycle === 0.7);
if (!typical || typical.realTimeIncreaseMult > 1.5) {
  fail(`typical 70% firing duty cycle should stay under 1.5x real-time duration, got ${typical?.realTimeIncreaseMult}`);
}

let dynamicChecks = null;
let server = null;
let browser = null;
try {
  server = await startTestServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: findChrome(),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(`${baseUrl}/?autostart=1&debugBossToken=NOVA_DEBUG_2026&debugPowerups=0&nova-devtools-hash=${LOCAL_DEVTOOLS_HASH}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  dynamicChecks = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!game || !play || !player) throw new Error('missing play scene/player for weapon duration runtime check');
    play.introActive = false;
    play.introComplete = true;
    player.active = true;
    player.powerupSuppressionUntil = 0;

    const resetInputs = () => {
      window.__burtKeyboardOverride = null;
      window.__burtGamepadOverride = null;
      if (player.inputManager) {
        player.inputManager.touchFireActive = false;
        player.inputManager.gamepadState = player.inputManager.createEmptyGamepadState?.() || player.inputManager.gamepadState;
        player.inputManager.previousGamepadButtons = {};
      }
    };
    const armPowerup = (type, remainingMs = 8000, now = player.getGameplayClockMs()) => {
      resetInputs();
      player.resetPowerups?.();
      player.applyPowerup?.(type);
      player.activePowerup.type = type;
      player.setActivePowerupDuration?.(type, remainingMs, now);
      player.activePowerup.remainingMs = remainingMs;
      player.activePowerup.expiresAt = now + remainingMs;
      return now;
    };
    const remaining = () => Math.round(player.getActivePowerupRemainingMs?.() || 0);
    const step = (now, dt = 1000) => {
      player.updateActivePowerupDuration?.(now, dt);
      return Math.round(player.getActivePowerupRemainingMs?.(now) || 0);
    };
    const approx = (value, expected, tolerance = 3) => Math.abs(value - expected) <= tolerance;
    const results = [];
    const record = (name, pass, details = {}) => results.push({ name, pass: Boolean(pass), details });

    let now = armPowerup('rapid_fire');
    const noFireBefore = remaining();
    const noFireAfter = step(now + 1000, 1000);
    record('weapon does not drain when fire is not held', approx(noFireAfter, noFireBefore), { before: noFireBefore, after: noFireAfter });

    now = armPowerup('rapid_fire');
    window.__burtKeyboardOverride = { Space: true };
    const keyboardAfter = step(now + 1000, 1000);
    record('keyboard fire drains weapon timer', approx(keyboardAfter, 7000), { after: keyboardAfter });

    now = armPowerup('rapid_fire');
    player.inputManager.touchFireActive = true;
    const pointerAfter = step(now + 1000, 1000);
    record('mouse pointer fire drains weapon timer', approx(pointerAfter, 7000), { after: pointerAfter });

    now = armPowerup('rapid_fire');
    window.__burtGamepadOverride = { connected: true, buttons: [{ pressed: true, value: 1 }] };
    if (player.inputManager) player.inputManager.gamepadState.updatedAt = 0;
    const controllerAfter = step(now + 1000, 1000);
    record('controller fire drains weapon timer', approx(controllerAfter, 7000), { after: controllerAfter });

    now = armPowerup('rapid_fire');
    const pauseBefore = remaining();
    record('pause preserves weapon timer when update is not advanced', approx(pauseBefore, remaining()), { before: pauseBefore, after: remaining() });

    now = armPowerup('rapid_fire');
    play.enemyManager.phase = 'WAVE_BRIEFING';
    play.enemyManager.state = 'BRIEFING';
    const waveAfter = step(now + 1000, 1000);
    record('wave transition without firing preserves weapon timer', approx(waveAfter, 8000), { after: waveAfter });

    now = armPowerup('speed_up');
    player.activePowerup.expiresAt = now + 8000;
    const wallClockAfter = step(now + 1000, 1000);
    record('non-weapon timed powerup remains wall clock', approx(wallClockAfter, 7000), { after: wallClockAfter });

    now = armPowerup('rapid_fire');
    window.__burtKeyboardOverride = { Space: true };
    const uiAfter = step(now + 1250, 1250);
    const state = player.getActivePowerupStates?.().find((entry) => entry.type === 'rapid_fire') || null;
    record('HUD state exposes remaining firing time', state?.durationMode === 'while_firing' && approx(state?.remainingMs, uiAfter, 20), {
      remaining: uiAfter,
      state
    });

    resetInputs();
    return {
      pass: results.every((entry) => entry.pass),
      results
    };
  });
  if (!dynamicChecks.pass) {
    fail(`runtime weapon duration checks failed: ${JSON.stringify(dynamicChecks.results.filter((entry) => !entry.pass))}`);
  }
} catch (error) {
  fail(`runtime weapon duration check crashed: ${error?.message || error}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    whileFiringCount: expectedWhileFiring.length,
    wallClockTimedCount: wallClockTimed.length,
    chargeOrInstantCount: chargeOrInstant.length,
    typicalFiringDutyCycle: 0.7,
    typicalRealTimeIncreaseMult: typical?.realTimeIncreaseMult ?? null
  },
  whileFiring: expectedWhileFiring,
  wallClockTimed,
  chargeOrInstant,
  gameplayClockLocked: expectedGameplayClock,
  balanceSamples,
  dynamicChecks,
  notes: [
    'while_firing drains while unified fire input is held, not only on exact bullet spawn frames.',
    'This covers keyboard Space/shoot, pointer or mouse fire through touchFireActive, and controller firing buttons through gamepad.firing.',
    'Pause and wave gaps do not drain weapon upgrades unless Player.update runs while firing is held; existing pause flow does not advance Player.update.',
    'Mixed powerups with substantial non-weapon value use the gameplay clock to prevent banking autonomous, score, sustain, or movement benefits by releasing fire.'
  ]
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error(`[weapon-powerup-firing-duration] FAIL ${failures.length} issue(s)`);
  failures.forEach((message) => console.error(`- ${message}`));
  console.error(`[weapon-powerup-firing-duration] report=${path.join(outputDir, 'report.json')}`);
  process.exit(1);
}

console.log(`[weapon-powerup-firing-duration] PASS whileFiring=${expectedWhileFiring.length} typicalRealTime=${typical?.realTimeIncreaseMult}x report=${path.join(outputDir, 'report.json')}`);
