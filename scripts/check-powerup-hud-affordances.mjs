import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4598));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/powerup-hud-affordances-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
  throw new Error(`No available powerup HUD check port found starting at ${startPort}`);
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

async function startDevServer() {
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
  while (Date.now() - start < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.hud && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.scenes?.play?.powerupAssetsReady), null, { timeout: 15000 });
  await page.evaluate(async () => {
    await window.__game?.scenes?.play?.powerupAssetsReady;
  });
  await page.waitForTimeout(300);

  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const hud = play?.hud;
    const player = play?.player;
    if (!game || !play || !hud || !player) return { ok: false, reason: 'missing game/play/hud/player' };

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    if (play.enemyManager) {
      play.enemyManager.enemies = [];
      play.enemyManager.state = 'POWERUP_HUD_AFFORDANCE_CHECK';
    }
    if (play.bulletManager) {
      play.bulletManager.bullets = [];
      play.bulletManager.enemyBullets = [];
    }
    player.x = game.getWidth() * 0.5;
    player.y = game.getHeight() - 82;
    if (player.sprite) {
      player.sprite.x = player.x;
      player.sprite.y = player.y;
    }

    player.getActivePowerupStates = () => ([
      {
        type: 'shield',
        iconType: 'shield',
        label: 'SHIELD',
        remainingMs: 11800,
        durationMs: 15000,
        color: 0x66ffff
      },
      {
        type: 'bomb',
        iconType: 'bomb',
        label: 'BOMB',
        remainingMs: 0,
        charges: 2,
        maxCharges: 3,
        detail: '2 SHOTS',
        color: 0xff8844
      },
      {
        type: 'slow_time',
        iconType: 'slow_time',
        label: 'SLOW TIME',
        remainingMs: 1300,
        durationMs: 8000,
        color: 0x9a8cff
      },
      {
        type: 'debuff_weapon_jam',
        iconType: 'powerup_nullification',
        label: 'JAMMED',
        detail: 'LOCKED',
        remainingMs: 4200,
        durationMs: 6000,
        category: 'debuff',
        color: 0xff6688
      }
    ]);

    hud.update();
    hud.updateActivePowerup();

    return {
      ok: true,
      group: {
        visible: Boolean(hud.activePowerupGroup?.visible),
        x: Math.round(hud.activePowerupGroup?.x || 0),
        y: Math.round(hud.activePowerupGroup?.y || 0),
        width: Math.round(hud.activePowerupGroup?.width || 0),
        height: Math.round(hud.activePowerupGroup?.height || 0)
      },
      status: hud.activePowerupGroup?._debugStatus || null,
      rows: (hud.activePowerupRows || [])
        .filter((row) => row?.container?.visible)
        .map((row) => row.container._debugPowerupState || {})
    };
  });

  await page.waitForTimeout(250);
  const screenshot = path.join(outputDir, 'powerup-hud-affordances.png');
  await page.screenshot({ path: screenshot, fullPage: true });

  await page.setViewportSize({ width: 640, height: 480 });
  await page.waitForTimeout(250);
  const compactState = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const hud = play?.hud;
    const player = play?.player;
    if (!game || !play || !hud || !player) return { ok: false, reason: 'missing compact game/play/hud/player' };
    play.isPaused = true;
    player.getActivePowerupStates = () => ([{
      type: 'nova_bloom',
      iconType: 'nova_bloom',
      label: 'NOVA BLOOM',
      remainingMs: 0,
      charges: 3,
      maxCharges: 7,
      detail: 'BANKED // COMBAT PAUSED',
      color: 0xff5aa8
    }]);
    hud.update();
    hud.updateActivePowerup();
    return {
      ok: true,
      group: {
        visible: Boolean(hud.activePowerupGroup?.visible),
        x: Math.round(hud.activePowerupGroup?.x || 0),
        y: Math.round(hud.activePowerupGroup?.y || 0),
        width: Math.round(hud.activePowerupGroup?.width || 0),
        height: Math.round(hud.activePowerupGroup?.height || 0)
      },
      row: (hud.activePowerupRows || []).find((candidate) => candidate?.container?.visible)?.container?._debugPowerupState || null
    };
  });
  await page.waitForTimeout(200);
  const compactScreenshot = path.join(outputDir, 'powerup-hud-nova-bloom-compact.png');
  await page.screenshot({ path: compactScreenshot, fullPage: true });

  const localeMatrix = [];
  const localeCodes = ['en', 'de', 'zh-CN', 'ru', 'es', 'pt-BR', 'ko', 'ja'];
  for (let index = 0; index < localeCodes.length; index += 1) {
    const language = localeCodes[index];
    await page.setViewportSize({ width: 960, height: 640 });
    const localeState = await page.evaluate(async ({ language, reducedMotion }) => {
      await window.__novaI18n?.setLanguagePreference?.(language);
      localStorage.setItem('nova_accessibility_reduced_motion', reducedMotion ? '1' : '0');
      const game = window.__game;
      const play = game?.scenes?.play;
      const hud = play?.hud;
      const player = play?.player;
      if (!game || !play || !hud || !player) return { ok: false, reason: 'missing locale game/play/hud/player' };
      player.getActivePowerupStates = () => ([
        {
          type: 'point_defense',
          iconType: 'point_defense',
          label: 'P-DEF',
          detail: 'AUTO-INTERCEPTS',
          remainingMs: 4200,
          durationMs: 10000,
          color: 0x66ffff
        },
        {
          type: 'slow_time',
          iconType: 'slow_time',
          label: 'SLOW TIME',
          remainingMs: 900,
          durationMs: 8000,
          color: 0x9a8cff
        }
      ]);
      hud.update();
      hud.updateActivePowerup();
      const traitBounds = hud.traitGroup?.visible ? hud.traitGroup.getBounds?.() : null;
      return {
        ok: true,
        language,
        reducedMotion,
        reducedMotionPreference: localStorage.getItem('nova_accessibility_reduced_motion'),
        title: hud.activePowerupTitle?.text || '',
        group: {
          visible: Boolean(hud.activePowerupGroup?.visible),
          x: Math.round(hud.activePowerupGroup?.x || 0),
          y: Math.round(hud.activePowerupGroup?.y || 0),
          width: Math.round(hud.activePowerupGroup?.width || 0),
          height: Math.round(hud.activePowerupGroup?.height || 0)
        },
        traitBounds: traitBounds ? {
          x: Math.round(traitBounds.x),
          y: Math.round(traitBounds.y),
          width: Math.round(traitBounds.width),
          height: Math.round(traitBounds.height)
        } : null,
        rows: (hud.activePowerupRows || [])
          .filter((row) => row?.container?.visible)
          .map((row) => row.container._debugPowerupState || {})
      };
    }, { language, reducedMotion: index === localeCodes.length - 1 });
    await page.waitForTimeout(100);
    const localeSlug = language.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const screenshot = path.join(outputDir, `powerup-hud-960x640-${localeSlug}${localeState.reducedMotion ? '-reduced' : ''}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    localeMatrix.push({ ...localeState, screenshot });
  }

  const failures = [];
  const validateRowGeometry = (row, label) => {
    if (!row) return;
    const labelBottom = Number(row.labelBounds?.y || 0) + Number(row.labelBounds?.height || 0);
    const metaTop = Number(row.metaBounds?.y || 0);
    const metaBottom = metaTop + Number(row.metaBounds?.height || 0);
    const barTop = Number(row.barBounds?.y || 0);
    const barBottom = barTop + Number(row.barBounds?.height || 0);
    if (row.textOverlap) failures.push(`${label} label overlaps status: ${JSON.stringify(row)}`);
    if (metaTop - labelBottom < 2) failures.push(`${label} label/status clearance below 2px: ${JSON.stringify(row)}`);
    if (barTop - metaBottom < 2) failures.push(`${label} status/bar clearance below 2px: ${JSON.stringify(row)}`);
    if (barBottom > Number(row.rowHeight || 0)) failures.push(`${label} progress bar exceeds row: ${JSON.stringify(row)}`);
  };
  if (!state.ok) failures.push(state.reason || 'setup failed');
  if (!state.group?.visible) failures.push('active powerup HUD is not visible');
  if (state.rows?.length !== 4) failures.push(`expected 4 powerup rows, got ${state.rows?.length || 0}`);
  state.rows?.forEach((row) => validateRowGeometry(row, `desktop ${row.type || 'powerup'}`));
  const shield = state.rows?.find((row) => row.type === 'shield');
  const bomb = state.rows?.find((row) => row.type === 'bomb');
  const slowTime = state.rows?.find((row) => row.type === 'slow_time');
  const status = state.rows?.find((row) => row.type === 'debuff_weapon_jam');
  if (shield?.category !== 'defense' || !shield?.categoryAccentVisible || shield?.categoryRailPipCount !== 3 || shield?.timerTickCount !== 3) {
    failures.push(`shield row missing defense accent/timer ticks: ${JSON.stringify(shield)}`);
  }
  if (bomb?.category !== 'offense' || bomb?.categoryRailPipCount !== 4 || bomb?.chargePipCount !== 3 || bomb?.chargePipActive !== 2) {
    failures.push(`bomb row missing charge pips: ${JSON.stringify(bomb)}`);
  }
  if (slowTime?.category !== 'control' || slowTime?.categoryRailPipCount !== 3 || !slowTime?.expiring || slowTime?.urgencyChevronCount !== 3 || slowTime?.timerTickCount !== 3) {
    failures.push(`slow-time row missing expiring chevrons/ticks: ${JSON.stringify(slowTime)}`);
  }
  if (status?.category !== 'status' || !status?.categoryAccentVisible || status?.categoryRailPipCount !== 3 || status?.timerTickCount !== 3) {
    failures.push(`status row missing status accent/timer ticks: ${JSON.stringify(status)}`);
  }
  if (!compactState.ok || !compactState.group?.visible) failures.push(compactState.reason || 'compact powerup HUD is not visible');
  if (compactState.row?.type !== 'nova_bloom' || compactState.row?.meta !== 'BANKED // COMBAT PAUSED') {
    failures.push(`compact Nova Bloom state is wrong: ${JSON.stringify(compactState)}`);
  }
  validateRowGeometry(compactState.row, 'compact Nova Bloom');
  if ((compactState.row?.metaBounds?.x || 0) + (compactState.row?.metaBounds?.width || 0) > (compactState.row?.rowWidth || 0) - 7) {
    failures.push(`compact Nova Bloom status exceeds its row: ${JSON.stringify(compactState.row)}`);
  }
  for (const localeState of localeMatrix) {
    if (!localeState.ok || !localeState.group?.visible) failures.push(`${localeState.language} powerup HUD is not visible`);
    localeState.rows?.forEach((row) => validateRowGeometry(row, `${localeState.language} ${row.type || 'powerup'}`));
    if (localeState.language !== 'en') {
      if (localeState.rows?.some((row) => String(row.meta || '').includes('AUTO-INTERCEPTS'))) {
        failures.push(`${localeState.language} retained English AUTO-INTERCEPTS in timed metadata: ${JSON.stringify(localeState.rows)}`);
      }
      if (localeState.rows?.some((row) => String(row.label || '') === 'SLOW TIME')) {
        failures.push(`${localeState.language} retained English SLOW TIME label: ${JSON.stringify(localeState.rows)}`);
      }
    }
    const groupRight = Number(localeState.group?.x || 0) + Number(localeState.group?.width || 0);
    const groupBottom = Number(localeState.group?.y || 0) + Number(localeState.group?.height || 0);
    if (Number(localeState.group?.x || 0) < 0 || Number(localeState.group?.y || 0) < 0 || groupRight > 960 || groupBottom > 640) {
      failures.push(`${localeState.language} powerup group escaped 960x640: ${JSON.stringify(localeState.group)}`);
    }
    const trait = localeState.traitBounds;
    if (trait) {
      const overlapsTrait = (
        Number(localeState.group.x) < trait.x + trait.width
        && groupRight > trait.x
        && Number(localeState.group.y) < trait.y + trait.height
        && groupBottom > trait.y
      );
      if (overlapsTrait) failures.push(`${localeState.language} powerup group overlaps trait HUD: ${JSON.stringify({ group: localeState.group, trait })}`);
    }
  }
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    screenshot,
    compactScreenshot,
    localeMatrix,
    state,
    compactState,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[powerup-hud-affordances] ${failures.join('; ')}`);
  console.log(`[powerup-hud-affordances] PASS screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
