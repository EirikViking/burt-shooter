import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4346));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/debug-tools-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
  return next.toString();
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

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function getState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

const playSceneSource = readFileSync(path.resolve('src/scenes/PlayScene.js'), 'utf8');
assert(!/handleDebugKeys[\s\S]*handleMarketingSpawnKey\(e\)/.test(playSceneSource), 'number key handler still calls marketing spawn hotkeys');
assert(/handleDebugNumberKey/.test(playSceneSource), 'debug number key handler is missing');
assert(/debugToolsEnabled/.test(playSceneSource), 'debug tools are not gated behind an explicit dev route');
assert(/Digit1[\s\S]*toggleDebugInvincibility/.test(playSceneSource), 'Digit1 does not toggle debug invincibility');
assert(/Digit\|Numpad\)\(\[2-8\]\)/.test(playSceneSource), 'Digit2-Digit8 level staging keys are missing');
assert(/KeyL[\s\S]*promptDebugLevelJump/.test(playSceneSource), 'KeyL does not expose the level jump prompt');

const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    controlSmoke: '1'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.level === 1;
  }, { timeout: 30000 });

  const normalBefore = await getState(page);
  await page.keyboard.press('Digit8');
  await page.waitForTimeout(300);
  const normalAfter = await getState(page);
  assert(normalBefore.runMode === 'ranked', 'normal route did not start ranked');
  assert(normalAfter.level === normalBefore.level, 'Digit8 changed level on a normal ranked route');
  assert(normalAfter.runMode === 'ranked', 'Digit8 marked a normal route unranked');
  assert(normalAfter.debugTools?.enabled === false, 'normal route exposed debug tools');

  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    debugBossToken: 'NOVA_DEBUG_2026',
    startLevel: '3'
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' &&
      state?.runMode === 'unranked' &&
      state?.level === 3 &&
      state?.debugTools?.levelJumpAvailable;
  }, { timeout: 30000 });

  const initial = await getState(page);
  const initialTrait = initial.player?.shipTrait || null;
  const initialLevel = initial.level;

  await page.keyboard.press('Digit8');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.level === 8 && state?.debugTools?.levelToolsUsed === true;
  }, { timeout: 10000 });
  const afterDigitJump = await getState(page);
  assert(afterDigitJump.runMode === 'unranked', 'Digit8 route did not remain unranked');
  assert(afterDigitJump.runModeReason === 'debug_digit_level_key', 'Digit8 did not mark its debug reason');
  assert(afterDigitJump.wave?.marketingDebug === false, 'Digit8 enabled marketing debug spawning');
  assert(afterDigitJump.player?.shipTrait === initialTrait, 'trait changed after Digit8 level staging');

  await page.keyboard.press('Digit1');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.debugTools?.invincible === true && state?.runMode === 'unranked';
  }, { timeout: 5000 });

  const damageProbe = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    game.lives = 4;
    if (player) {
      player.shieldActive = false;
      player.invulnerable = false;
      player.invulnerableTime = 0;
    }
    const directDamageResult = player?.takeDamage?.();
    game.loseLife();
    return {
      directDamageResult,
      lives: game.lives,
      invincible: play?.debugInvincible === true
    };
  });
  assert(damageProbe.invincible === true, 'debug invincibility was not active during damage probe');
  assert(damageProbe.directDamageResult === false, 'player.takeDamage was not blocked by debug invincibility');
  assert(damageProbe.lives === 4, 'debug invincibility allowed lives to decrease');

  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    return play?.debugJumpToLevel?.(12, 'check_debug_tools');
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.level === 12 && state?.debugTools?.levelToolsUsed === true;
  }, { timeout: 10000 });

  const afterPromptJump = await getState(page);
  assert(afterPromptJump.player?.shipTrait === initialTrait, 'trait changed after prompt level jump');

  await page.keyboard.press('PageUp');
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.level === 13;
  }, { timeout: 10000 });

  const afterPageJump = await getState(page);
  assert(afterPageJump.player?.shipTrait === initialTrait, 'trait changed after PageUp level jump');
  assert(afterPageJump.debugTools?.invincible === true, 'debug invincibility did not stay enabled after level jump');

  mkdirSync(outputDir, { recursive: true });
  const screenshot = path.join(outputDir, 'debug-tools.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  const report = {
    ok: pageErrors.length === 0 && consoleErrors.length === 0,
    baseUrl,
    initial: { level: initial.level, trait: initialTrait },
    normalRoute: {
      beforeLevel: normalBefore.level,
      afterLevel: normalAfter.level,
      runMode: normalAfter.runMode,
      debugEnabled: normalAfter.debugTools?.enabled
    },
    afterDigitJump: {
      level: afterDigitJump.level,
      trait: afterDigitJump.player?.shipTrait,
      runModeReason: afterDigitJump.runModeReason,
      marketingDebug: afterDigitJump.wave?.marketingDebug
    },
    damageProbe,
    afterPromptJump: {
      level: afterPromptJump.level,
      trait: afterPromptJump.player?.shipTrait,
      runModeReason: afterPromptJump.runModeReason
    },
    afterPageJump: {
      level: afterPageJump.level,
      trait: afterPageJump.player?.shipTrait,
      invincible: afterPageJump.debugTools?.invincible
    },
    pageErrors,
    consoleErrors,
    screenshot
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`[debug-tools] PASS trait=${initialTrait} level=${afterPageJump.level} screenshot=${screenshot}`);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
