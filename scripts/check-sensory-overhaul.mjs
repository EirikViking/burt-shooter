import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.SENSORY_OVERHAUL_HOST || '127.0.0.1';
const port = process.env.SENSORY_OVERHAUL_URL
  ? null
  : (Number(process.env.SENSORY_OVERHAUL_PORT) || await findAvailablePort(4510));
const baseUrl = process.env.SENSORY_OVERHAUL_URL || `http://${host}:${port}`;
const outputDir = path.resolve(
  process.env.SENSORY_OVERHAUL_OUTPUT_DIR || `test-results/sensory-overhaul-${timestamp()}`
);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function fail(message) {
  throw new Error(`[check-sensory-overhaul] ${message}`);
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, String(value));
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
  fail(`no local port available from ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (!existsSync(viteEntry)) fail('Vite is missing');
  const server = spawn(process.execPath, [
    viteEntry,
    '--host', host,
    '--port', String(port),
    '--strictPort'
  ], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  fail(`Vite did not start at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function waitForPlay(page) {
  await page.goto(withQuery(baseUrl, {
    autostart: '1',
    startLevel: '12',
    debugBossToken: 'NOVA_DEBUG_2026',
    'nova-devtools-hash': LOCAL_DEVTOOLS_HASH
  }), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    try {
      const state = JSON.parse(window.render_game_to_text?.() || '{}');
      return state.scene === 'play' &&
        Boolean(window.__game?.scenes?.play?.spectacleDirector) &&
        Boolean(window.__game?.scenes?.play?.player);
    } catch {
      return false;
    }
  }, { timeout: 30000 });
  await page.waitForTimeout(2600);
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play) return;
    play.shipIntroToken = (Number(play.shipIntroToken) || 0) + 1;
    play.introActive = false;
    play.introComplete = true;
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.introOverlay = null;
    play.uiOverlay?.children
      ?.filter((child) => child?.label === 'ship_intro_overlay' || child?.label === 'ship_intro_flash')
      .forEach((child) => {
        child.parent?.removeChild(child);
        child.destroy?.({ children: true });
      });
    play.clearSectorArrivalStinger?.();
    play.spectacleDirector?.clear?.();
    play.enemyManager?.clearEnemies?.();
    play.bulletManager?.clearAll?.('sensory_overhaul_check');
    if (play.player) {
      play.player.invulnerable = true;
      play.player.invulnerableTime = 120000;
    }
  });
}

function collectActionableConsole(page, target) {
  page.on('pageerror', (error) => target.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => {
    if (!['warning', 'error'].includes(message.type())) return;
    const text = message.text();
    if (/requestFullscreen.*user gesture/i.test(text)) return;
    if (/\[SW\] Service worker script missing or invalid/i.test(text)) return;
    target.push({ type: message.type(), text });
  });
}

async function stageHeroMoments(page) {
  return page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const { AudioManager } = await import('/src/audio/AudioManager.js');
    if (!game || !play?.spectacleDirector) throw new Error('spectacle director is unavailable');
    const width = game.getWidth();
    const height = game.getHeight();
    play.spectacleDirector.clear();
    play.emitSpectacle('elite', {
      x: width * 0.28,
      y: height * 0.34,
      color: 0xff4bd8,
      accent: 0x43efff,
      intensity: 1.16,
      audioIntensity: 1.04,
      audioVolume: 0.8,
      force: true
    });
    play.emitSpectacle('pickup', {
      x: width * 0.72,
      y: height * 0.43,
      color: 0xffdf63,
      accent: 0xffffff,
      intensity: 1.04,
      audioIntensity: 0.92,
      audioVolume: 0.72,
      force: true
    });
    play.emitSpectacle('combo', {
      x: width * 0.5,
      y: height * 0.62,
      color: 0x43efff,
      accent: 0xff5df7,
      intensity: 1.2,
      audioIntensity: 1.08,
      audioVolume: 0.82,
      force: true
    });
    play.particleManager?.createExplosion?.(width * 0.28, height * 0.34, 0xff4bd8, 1.1);
    play.particleManager?.createExplosion?.(width * 0.72, height * 0.43, 0xffdf63, 0.9);
    play.particleManager?.createExplosion?.(width * 0.5, height * 0.62, 0x43efff, 1.25);
    AudioManager.playSfx('enemy_explode', { force: true, pool: true });
    const explosionRates = Object.entries(AudioManager.sfxPools || {})
      .filter(([key]) => key.startsWith('enemy_explode:'))
      .flatMap(([, pool]) => pool.map((audio) => Number(audio.playbackRate) || 0));
    return {
      spectacle: play.spectacleDirector.getDebugState(),
      plasmaBlooms: play.particleManager?.energyBlooms?.length || 0,
      audio: AudioManager.getSettings(),
      explosionRates
    };
  });
}

async function stageBossDeathMoment(page) {
  return page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const width = game.getWidth();
    const height = game.getHeight();
    play.spectacleDirector.clear();
    play.triggerBossDeathImpact({
      boss: {
        x: width * 0.5,
        y: height * 0.38,
        profile: { id: 'visual_qa_boss', index: 4 }
      },
      color: 0xff5b85,
      type: 'VISUAL_QA_BOSS'
    });
    return {
      spectacle: play.spectacleDirector.getDebugState(),
      plasmaBlooms: play.particleManager?.energyBlooms?.length || 0,
      scheduledBursts: play._deathTimeouts?.length || 0
    };
  });
}

async function stressBoundedLayer(page) {
  return page.evaluate(async () => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const width = game.getWidth();
    const height = game.getHeight();
    const kinds = ['kill', 'elite', 'combo', 'pickup', 'wave', 'reinforcement', 'boss_phase', 'boss_death'];
    play.spectacleDirector.clear();
    for (let index = 0; index < 32; index += 1) {
      play.emitSpectacle(kinds[index % kinds.length], {
        x: width * (0.14 + (index % 7) * 0.12),
        y: height * (0.2 + (index % 5) * 0.13),
        color: index % 2 ? 0xff5df7 : 0x43efff,
        accent: index % 3 ? 0xffdf63 : 0xffffff,
        intensity: 0.72 + (index % 4) * 0.12,
        force: true,
        audio: false,
        performanceLite: index >= 10
      });
    }

    const intervals = [];
    let previous = performance.now();
    for (let frame = 0; frame < 120; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const now = performance.now();
      intervals.push(now - previous);
      previous = now;
    }
    const sorted = [...intervals].sort((left, right) => left - right);
    const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] || 0;
    return {
      state: play.spectacleDirector.getDebugState(),
      performance: {
        frames: intervals.length,
        averageMs: Number((intervals.reduce((total, value) => total + value, 0) / intervals.length).toFixed(2)),
        p95Ms: Number(percentile(0.95).toFixed(2)),
        p99Ms: Number(percentile(0.99).toFixed(2)),
        maxMs: Number(Math.max(...intervals).toFixed(2)),
        framesOver50Ms: intervals.filter((value) => value > 50).length
      }
    };
  });
}

const spectacleSource = readFileSync('src/effects/SpectacleDirector.js', 'utf8');
const audioSource = readFileSync('src/audio/AudioManager.js', 'utf8');
const playSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
const catalogSource = readFileSync('src/audio/SoundCatalog.js', 'utf8');
const staticErrors = [];
if (!spectacleSource.includes('MAX_ACTIVE_PULSES = 10')) staticErrors.push('bounded pulse cap is missing');
if (!spectacleSource.includes("label = 'spectacleDirectorLayer'")) staticErrors.push('shared spectacle layer is missing');
if (!spectacleSource.includes("visualLanguage: 'plasma_fracture_v2'")) staticErrors.push('premium plasma-fracture visual language is missing');
if (!spectacleSource.includes('primitiveCircleCount: 0')) staticErrors.push('primitive circle regression guard is missing');
if (!spectacleSource.includes('primitiveDiamondCount: 0')) staticErrors.push('primitive diamond regression guard is missing');
if (spectacleSource.includes('setInterval(')) staticErrors.push('spectacle layer must not create interval timers');
if (!audioSource.includes('playSpectacleAccent')) staticErrors.push('procedural spectacle accent is missing');
if (!audioSource.includes('createDynamicsCompressor')) staticErrors.push('spectacle accent compressor is missing');
if (!audioSource.includes('audio.playbackRate = playbackRate')) staticErrors.push('runtime SFX pitch variation is missing');
if (!catalogSource.includes('playbackRateMin')) staticErrors.push('authored SFX pitch ranges are missing');
for (const marker of [
  "emitSpectacle('combo'",
  "emitSpectacle('pickup'",
  "emitSpectacle('wave'",
  "emitSpectacle('reinforcement'",
  "emitSpectacle('boss_phase'",
  "emitSpectacle('boss_death'",
  "emitSpectacle('miracle'"
]) {
  if (!playSource.includes(marker)) staticErrors.push(`missing gameplay spectacle hook ${marker}`);
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const executablePath = findChrome();
if (!executablePath) fail('installed Chrome was not found');
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--autoplay-policy=no-user-gesture-required']
});

const consoleEvents = [];
const report = {
  status: 'failed',
  generatedAt: new Date().toISOString(),
  baseUrl,
  outputDir,
  staticErrors,
  screenshots: {},
  hero: null,
  stress: null,
  reducedMotion: null,
  bossDeath: null,
  consoleEvents,
  errors: []
};

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  collectActionableConsole(page, consoleEvents);
  await waitForPlay(page);
  report.hero = await stageHeroMoments(page);
  await page.waitForTimeout(110);
  report.screenshots.hero = path.join(outputDir, '01-prismatic-combat-orchestra-desktop.png');
  await page.screenshot({ path: report.screenshots.hero, fullPage: false });

  if (report.hero.spectacle.activePulses !== 3) {
    report.errors.push(`hero moment must stage exactly three pulses: ${JSON.stringify(report.hero.spectacle)}`);
  }
  for (const kind of ['elite', 'pickup', 'combo']) {
    if (!report.hero.spectacle.activeKinds.includes(kind)) report.errors.push(`hero moment is missing ${kind}`);
  }
  if (report.hero.spectacle.visualLanguage !== 'plasma_fracture_v2' ||
    report.hero.spectacle.primitiveCircleCount !== 0 ||
    report.hero.spectacle.primitiveDiamondCount !== 0) {
    report.errors.push(`legacy explosion geometry remained active: ${JSON.stringify(report.hero.spectacle)}`);
  }
  if (report.hero.plasmaBlooms < 3) {
    report.errors.push(`organic plasma bloom texture did not stage: ${report.hero.plasmaBlooms}`);
  }
  const accent = report.hero.audio?.lastSpectacleAccent;
  if (!accent?.synthetic || !accent?.compressor || accent.kind !== 'combo') {
    report.errors.push(`procedural accent debug state is incomplete: ${JSON.stringify(accent)}`);
  }
  if (!report.hero.explosionRates.length ||
    report.hero.explosionRates.some((rate) => rate < 0.9 || rate > 1.08) ||
    report.hero.explosionRates.every((rate) => Math.abs(rate - 1) < 0.0001)) {
    report.errors.push(`enemy explosion pitch variation is out of range: ${JSON.stringify(report.hero.explosionRates)}`);
  }

  report.bossDeath = await stageBossDeathMoment(page);
  await page.waitForTimeout(280);
  report.screenshots.bossDeath = path.join(outputDir, '02-boss-death-plasma-cascade-desktop.png');
  await page.screenshot({ path: report.screenshots.bossDeath, fullPage: false });
  if (report.bossDeath.spectacle?.lastEvent?.kind !== 'boss_death' || report.bossDeath.plasmaBlooms < 2) {
    report.errors.push(`boss death plasma cascade did not stage: ${JSON.stringify(report.bossDeath)}`);
  }
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    (play?._deathTimeouts || []).forEach((id) => clearTimeout(id));
    if (play) play._deathTimeouts = [];
    play?.spectacleDirector?.clear?.();
  });

  report.stress = await stressBoundedLayer(page);
  if (report.stress.state.activePulses > report.stress.state.activeLimit ||
    report.stress.state.peakActivePulses > report.stress.state.maxActivePulses ||
    report.stress.state.totalDropped < 1) {
    report.errors.push(`pulse cap failed under stress: ${JSON.stringify(report.stress.state)}`);
  }
  if (report.stress.performance.frames < 100 ||
    report.stress.performance.p95Ms > 30 ||
    report.stress.performance.framesOver50Ms > 1) {
    report.errors.push(`spectacle layer exceeded frame budget: ${JSON.stringify(report.stress.performance)}`);
  }
  await page.close();

  const reducedPage = await browser.newPage({ viewport: { width: 960, height: 540 } });
  collectActionableConsole(reducedPage, consoleEvents);
  await reducedPage.emulateMedia({ reducedMotion: 'reduce' });
  await waitForPlay(reducedPage);
  report.reducedMotion = await reducedPage.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const width = game.getWidth();
    const height = game.getHeight();
    for (let index = 0; index < 12; index += 1) {
      play.emitSpectacle('boss_death', {
        x: width * (0.22 + (index % 4) * 0.18),
        y: height * (0.3 + (index % 3) * 0.18),
        color: index % 2 ? 0xff5df7 : 0x43efff,
        accent: 0xffdf63,
        intensity: 1,
        force: true,
        audio: false
      });
    }
    const cap = play.spectacleDirector.getDebugState();
    play.spectacleDirector.clear();
    play.emitSpectacle('boss_death', {
      x: width * 0.5,
      y: height * 0.48,
      color: 0x43efff,
      accent: 0xffdf63,
      intensity: 1,
      force: true,
      audio: false
    });
    return {
      cap,
      active: play.spectacleDirector.getDebugState()
    };
  });
  await reducedPage.waitForTimeout(120);
  report.screenshots.reducedMotion = path.join(outputDir, '03-reduced-motion-compact.png');
  await reducedPage.screenshot({ path: report.screenshots.reducedMotion, fullPage: false });
  if (!report.reducedMotion.cap?.reducedMotion ||
    report.reducedMotion.cap?.activeLimit !== 5 ||
    report.reducedMotion.cap?.activePulses > 5 ||
    report.reducedMotion.active?.activePulses !== 1 ||
    report.reducedMotion.active?.lastEvent?.durationMs >= 1680) {
    report.errors.push(`reduced-motion pulse budget failed: ${JSON.stringify(report.reducedMotion)}`);
  }
  await reducedPage.close();

  if (staticErrors.length) report.errors.push(...staticErrors);
  if (consoleEvents.length) {
    report.errors.push(`runtime console warnings/errors: ${consoleEvents.map((entry) => entry.text).join(' | ')}`);
  }
  report.status = report.errors.length ? 'failed' : 'passed';
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (report.errors.length) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(
      `[check-sensory-overhaul] PASS heroPulses=${report.hero.spectacle.activePulses} ` +
      `stressP95=${report.stress.performance.p95Ms.toFixed(2)}ms ` +
      `reducedLimit=${report.reducedMotion.cap.activeLimit} output=${outputDir}`
    );
  }
} finally {
  await browser.close();
  server?.kill();
}
