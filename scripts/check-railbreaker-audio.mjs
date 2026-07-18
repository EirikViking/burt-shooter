import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { SFX_CATALOG, SFX_MIX } from '../src/audio/SoundCatalog.js';
import { ShipData } from '../src/config/ShipData.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4637));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/railbreaker-audio-${timestamp()}`);

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
  throw new Error(`No available Railbreaker audio check port found starting at ${startPort}`);
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
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function resolveMediaTool(name) {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  const candidates = [
    process.env[`${name.toUpperCase()}_PATH`],
    name,
    process.platform === 'win32' ? `C:/Program Files/Shotcut/${executable}` : null
  ].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['-version'], { encoding: 'utf8', windowsHide: true });
    if (result.status === 0) return candidate;
  }
  throw new Error(`${name} is required for the Railbreaker audio check`);
}

function probeDuration(ffprobe, filePath) {
  const result = spawnSync(ffprobe, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath
  ], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, `ffprobe could not read ${filePath}: ${result.stderr || result.error?.message || ''}`);
  return Number(String(result.stdout || '').trim());
}

function probePeak(ffmpeg, filePath) {
  const result = spawnSync(ffmpeg, [
    '-hide_banner',
    '-nostats',
    '-i', filePath,
    '-af', 'volumedetect',
    '-f', 'null',
    process.platform === 'win32' ? 'NUL' : '/dev/null'
  ], { encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 * 4 });
  assert.equal(result.status, 0, `ffmpeg could not measure ${filePath}: ${result.stderr || result.error?.message || ''}`);
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const match = output.match(/max_volume:\s*(-?[0-9.]+) dB/);
  assert(match, `ffmpeg did not report max_volume for ${filePath}`);
  return Number(match[1]);
}

const railbreaker = ShipData.find((ship) => ship.name === 'RAILBREAKER');
assert(railbreaker, 'Railbreaker ship data missing');
assert.equal(railbreaker.weapon.shootSfx, 'shoot_railbreaker');
assert.equal(SFX_CATALOG.shoot_railbreaker?.length, 1);
assert.match(SFX_CATALOG.shoot_railbreaker[0], /laserSmall_004\.mp3$/);
assert.equal(SFX_MIX.shoot_railbreaker?.volume, 0.66);
assert.equal(SFX_MIX.shoot_railbreaker?.minIntervalMs, 145);
assert(ShipData.some((ship) => ship.name !== 'RAILBREAKER' && ship.weapon.shootSfx === 'shoot_heavy'),
  'Railbreaker fix must not flatten every heavy ship into the same event');

const audioManagerSource = readFileSync('src/audio/AudioManager.js', 'utf8');
const playSceneSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
assert(audioManagerSource.includes("'shoot_railbreaker'"), 'Railbreaker event must use the bounded SFX pool');
assert(playSceneSource.includes('SFX_MIX[sfxKey]'), 'shooting health check must respect authored event cadence');
assert(!playSceneSource.includes("AudioManager.playSfx(sfxKey, { pool: true, minIntervalMs: 60 })"),
  'shooting health check must not override Railbreaker cadence with the old 60ms interval');

const ffprobe = resolveMediaTool('ffprobe');
const ffmpeg = resolveMediaTool('ffmpeg');
const railbreakerClipPath = path.resolve('public/audio/sfx/laserSmall_004.mp3');
const oldHeavyClipPath = path.resolve('public/audio/sfx/laserLarge_002.mp3');
const railbreakerClipDurationSeconds = probeDuration(ffprobe, railbreakerClipPath);
const oldHeavyClipDurationSeconds = probeDuration(ffprobe, oldHeavyClipPath);
const railbreakerRawPeakDb = probePeak(ffmpeg, railbreakerClipPath);
const oldHeavyRawPeakDb = probePeak(ffmpeg, oldHeavyClipPath);

const audioDefaults = {
  masterVolume: Number(audioManagerSource.match(/this\.masterVolume\s*=\s*([0-9.]+)/)?.[1]),
  sfxVolume: Number(audioManagerSource.match(/this\.sfxVolume\s*=\s*([0-9.]+)/)?.[1])
};
assert(Number.isFinite(audioDefaults.masterVolume) && Number.isFinite(audioDefaults.sfxVolume),
  'Could not parse default audio volumes');

const effectivePeakDb = (rawPeakDb, mixVolume) =>
  rawPeakDb + 20 * Math.log10(audioDefaults.masterVolume * audioDefaults.sfxVolume * mixVolume);
const railbreakerEffectivePeakDb = effectivePeakDb(railbreakerRawPeakDb, SFX_MIX.shoot_railbreaker.volume);
const oldHeavyEffectivePeakDb = effectivePeakDb(oldHeavyRawPeakDb, SFX_MIX.shoot_heavy.volume);
const effectiveRequestSpacingMs = Math.ceil(
  SFX_MIX.shoot_railbreaker.minIntervalMs / railbreaker.stats.fireRate
) * railbreaker.stats.fireRate;
const projectedRailbreakerOverlap = Math.ceil(
  railbreakerClipDurationSeconds * 1000 / effectiveRequestSpacingMs
);
const projectedOldOverlap = Math.ceil(
  oldHeavyClipDurationSeconds * 1000 / railbreaker.stats.fireRate
);

assert(railbreakerClipDurationSeconds <= 0.5, `Railbreaker clip is too long: ${railbreakerClipDurationSeconds}s`);
assert(railbreakerRawPeakDb <= -3, `Railbreaker source transient is too hot: ${railbreakerRawPeakDb}dB`);
assert(railbreakerEffectivePeakDb <= oldHeavyEffectivePeakDb - 4,
  `Railbreaker effective peak needs at least 4dB relief; rail=${railbreakerEffectivePeakDb} old=${oldHeavyEffectivePeakDb}`);
assert(projectedRailbreakerOverlap <= 3,
  `Railbreaker clip overlap remains too dense: ${projectedRailbreakerOverlap}`);
assert(projectedRailbreakerOverlap * 2 <= projectedOldOverlap,
  `Railbreaker overlap was not reduced enough: ${projectedRailbreakerOverlap} vs ${projectedOldOverlap}`);

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
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
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__game?.startGame), { timeout: 30000 });
  const started = await page.evaluate(async (spriteKey) => {
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({
      bestScore: 9999999,
      bestRank: 19,
      bestLevel: 360
    }));
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({
      version: 1,
      unlockTuningVersion: 3,
      bestScore: 9999999,
      bestRank: 19,
      bestLevel: 60,
      bestSector: 60,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_27'],
      lastNewlyUnlockedShipIds: []
    }));
    return window.__game.startGame(spriteKey, {
      runMode: 'scout',
      countShipUsage: false
    });
  }, railbreaker.spriteKey);
  assert.equal(started, true);

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state?.scene === 'play' && state?.selectedShipSpriteKey;
  }, { timeout: 30000 });

  const setup = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const player = play?.player;
    if (!play || !player) throw new Error('Missing Railbreaker runtime surface');
    play.introActive = false;
    player.active = true;
    player.invulnerable = true;
    player.invulnerableTime = 60000;
    player.shootCooldown = 0;
    Object.assign(play.shootSoundHealthCheck, {
      shotsFired: 0,
      lastShotTime: 0,
      lastSoundTime: 0,
      lastSoundKey: player.getShootSfxKey?.() || null,
      lastRequestIntervalMs: 0,
      totalVolleys: 0,
      totalRequests: 0,
      totalPlayed: 0,
      totalSuppressed: 0,
      recoveredLogged: false,
      lastRecoveryAttempt: 0,
      recoveryAttempts: 0
    });
    window.__burtKeyboardOverride = { Space: true };
    return {
      shipName: player.config?.name,
      sfxKey: player.getShootSfxKey?.(),
      shootDelay: player.shootDelay,
      bulletsPerVolley: player.weaponProfile?.bullets || 0
    };
  });

  await page.waitForTimeout(8000);
  const runtime = await page.evaluate(() => {
    window.__burtKeyboardOverride = { Space: false };
    const state = JSON.parse(window.render_game_to_text());
    const play = window.__game?.scenes?.play;
    return {
      shootAudio: state.shootAudio,
      playerBulletCount: play?.bulletManager?.playerBullets?.length || 0,
      health: { ...play?.shootSoundHealthCheck }
    };
  });

  const failures = [];
  if (setup.shipName !== 'RAILBREAKER') failures.push(`wrong runtime ship: ${setup.shipName}`);
  if (setup.sfxKey !== 'shoot_railbreaker') failures.push(`wrong runtime event: ${setup.sfxKey}`);
  if (runtime.shootAudio?.key !== 'shoot_railbreaker') failures.push(`debug event mismatch: ${runtime.shootAudio?.key}`);
  if (runtime.shootAudio?.requestIntervalMs !== 145) failures.push(`runtime interval mismatch: ${runtime.shootAudio?.requestIntervalMs}`);
  if ((runtime.shootAudio?.totalVolleys || 0) < 20) failures.push(`prolonged-fire sample too short: ${runtime.shootAudio?.totalVolleys}`);
  if ((runtime.shootAudio?.totalPlayed || 0) < 8) failures.push(`Railbreaker became inaudible: ${runtime.shootAudio?.totalPlayed}`);
  if ((runtime.shootAudio?.totalPlayed || 0) > (runtime.shootAudio?.totalVolleys || 0) * 0.7) {
    failures.push(`Railbreaker cadence still too dense: ${JSON.stringify(runtime.shootAudio)}`);
  }
  if ((runtime.shootAudio?.totalRequests || 0) !==
      (runtime.shootAudio?.totalPlayed || 0) + (runtime.shootAudio?.totalSuppressed || 0)) {
    failures.push(`audio request accounting mismatch: ${JSON.stringify(runtime.shootAudio)}`);
  }
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(' | ')}`);

  const report = {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    baseUrl,
    railbreaker: {
      spriteKey: railbreaker.spriteKey,
      fireRateMs: railbreaker.stats.fireRate,
      bullets: railbreaker.weapon.bullets,
      sfxKey: railbreaker.weapon.shootSfx
    },
    mix: {
      railbreaker: SFX_MIX.shoot_railbreaker,
      oldHeavy: SFX_MIX.shoot_heavy,
      defaults: audioDefaults
    },
    clipMetrics: {
      railbreaker: {
        file: path.basename(railbreakerClipPath),
        durationSeconds: railbreakerClipDurationSeconds,
        rawPeakDb: railbreakerRawPeakDb,
        effectivePeakDb: Number(railbreakerEffectivePeakDb.toFixed(2)),
        effectiveRequestSpacingMs,
        projectedOverlap: projectedRailbreakerOverlap
      },
      oldHeavyReference: {
        file: path.basename(oldHeavyClipPath),
        durationSeconds: oldHeavyClipDurationSeconds,
        rawPeakDb: oldHeavyRawPeakDb,
        effectivePeakDb: Number(oldHeavyEffectivePeakDb.toFixed(2)),
        projectedOverlap: projectedOldOverlap
      }
    },
    setup,
    runtime,
    pageErrors,
    consoleErrors,
    failures
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[railbreaker-audio] ${failures.join('; ')}`);
  console.log(
    `[railbreaker-audio] PASS volleys=${runtime.shootAudio.totalVolleys}` +
    ` played=${runtime.shootAudio.totalPlayed}` +
    ` overlap=${projectedOldOverlap}->${projectedRailbreakerOverlap}` +
    ` peak=${oldHeavyEffectivePeakDb.toFixed(1)}dB->${railbreakerEffectivePeakDb.toFixed(1)}dB`
  );
} finally {
  await page.evaluate(() => {
    window.__burtKeyboardOverride = { Space: false };
  }).catch(() => {});
  await page.close({ runBeforeUnload: false }).catch(() => {});
  await browser.close();
  if (server) server.kill();
}
