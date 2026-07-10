import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4364));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/gameplay-message-overlap-${timestamp()}`);
const LOCAL_DEVTOOLS_HASH = 'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c';

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

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

function overlap(a, b, margin = 8) {
  if (!a || !b) return false;
  return !(
    a.x + a.width + margin <= b.x ||
    b.x + b.width + margin <= a.x ||
    a.y + a.height + margin <= b.y ||
    b.y + b.height + margin <= a.y
  );
}

function validateSample(state, label) {
  const active = state.toast?.active || [];
  const surfaces = [
    ...active,
    state.toast?.comboDisplay,
    ...(state.toast?.scorePopups || [])
  ].filter(item => item?.bounds);
  for (let i = 0; i < surfaces.length; i += 1) {
    for (let j = i + 1; j < surfaces.length; j += 1) {
      if (overlap(surfaces[i].bounds, surfaces[j].bounds)) {
        throw new Error(`${label}: gameplay message overlap ${JSON.stringify({ a: surfaces[i], b: surfaces[j] }, null, 2)}`);
      }
    }
  }
  const center = active.find(item => item.slot === 'center');
  const transitionTypes = ['boss', 'boss_intro', 'level_clear', 'level_up', 'run_clear'];
  if (center && transitionTypes.includes(center.type)) {
    const blocked = active.filter(item => item.slot !== 'center' && !transitionTypes.includes(item.type));
    if (blocked.length > 0) {
      throw new Error(`${label}: low-priority toast visible over transition center ${JSON.stringify({ center, blocked }, null, 2)}`);
    }
  }
}

mkdirSync(outputDir, { recursive: true });
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
  const pageErrors = [];
  const consoleEvents = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleEvents.push(message.text().slice(0, 700));
  });

  await page.goto(`${baseUrl}/?autostart=1&debugBossToken=NOVA_DEBUG_2026&nova-devtools-hash=${LOCAL_DEVTOOLS_HASH}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return (state.toast?.active || []).some((toast) => toast.type === 'firstRunControls');
  }, null, { timeout: 15000 });
  const firstRunControlsState = await readState(page);
  const firstRunControls = (firstRunControlsState.toast?.active || []).find((toast) => toast.type === 'firstRunControls');
  if (!firstRunControls || (firstRunControlsState.counts?.enemies || 0) !== 0) {
    throw new Error(`first-run controls did not precede hostiles: ${JSON.stringify(firstRunControlsState, null, 2)}`);
  }
  const controlsObservedAt = Date.now();
  await page.evaluate(() => {
    window.__game?.scenes?.play?.enqueueToast?.('TEST WAVE CLEAR', {
      slot: 'top',
      type: 'level_clear',
      priority: 3,
      duration: 800
    });
  });
  await page.waitForTimeout(160);
  const protectedControlsState = await readState(page);
  if (!(protectedControlsState.toast?.active || []).some((toast) => toast.type === 'firstRunControls')) {
    throw new Error('first-run controls were dismissed before their protected reading window');
  }
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return (state.counts?.enemies || 0) > 0;
  }, null, { timeout: 6000 });
  const firstHostileElapsedMs = Date.now() - controlsObservedAt;
  if (firstHostileElapsedMs < 2100) {
    throw new Error(`first hostiles released too soon after controls: ${firstHostileElapsedMs}ms`);
  }

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!play) throw new Error('Missing play scene for message overlap check');
    play.introActive = false;
    play.introComplete = true;
    play.debugInvincible = true;
    play.clearToastState?.();
    play.showToast('BOSS INCOMING\nREAD THE DANGER ZONE', {
      slot: 'center',
      type: 'boss',
      priority: 4,
      fontSize: 34,
      duration: 2200,
      transition: true,
      maxWidth: game.getWidth() * 0.72
    });
    play.enqueueToast('SECTOR CLEAR +1,000', {
      slot: 'top',
      type: 'level_clear',
      priority: 3,
      fontSize: 26,
      duration: 1600,
      transition: true
    });
    play.enqueueToast('SCORE x2!', {
      slot: 'center',
      type: 'score_boost',
      priority: 1,
      fontSize: 30,
      duration: 1200
    });
    play.enqueueToast('COMBO BONUS +200', {
      slot: 'top',
      type: 'combo',
      priority: 1,
      fontSize: 20,
      duration: 1200
    });
    play.enqueueToast('BONUS CORE APPEARED!', {
      slot: 'corner',
      type: 'powerup',
      priority: 1,
      fontSize: 18,
      duration: 1400
    });
    play.comboCount = 18;
    play.comboMultiplier = 2;
    play.comboTimerMs = play.comboWindowMs || 2400;
    play.createComboDisplay?.();
    play.layoutComboDisplay?.();
    play.updateComboDisplay?.(1);
  });

  const samples = [];
  for (let index = 0; index < 48; index += 1) {
    await page.waitForTimeout(125);
    const state = await readState(page);
    validateSample(state, `sample_${index}`);
    samples.push({
      index,
      active: state.toast?.active || [],
      comboDisplay: state.toast?.comboDisplay || null,
      scorePopups: state.toast?.scorePopups || [],
      queued: state.toast?.queued || {},
      lockedMs: state.toast?.lockedMs || {}
    });
  }

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!play?.enemyManager) throw new Error('Missing play scene for progression presentation check');
    play.clearToastState?.();
    play.enemyManager.forceClearAllEnemies?.();
    if (play.bulletManager) play.bulletManager.enemyBullets = [];
    play.enemyManager.state = 'WAVE_BRIEFING';
    play.enemyManager.pendingWaveConfig = null;
    play.enemyManager.waveBriefingTimer = 0;
    play.showWaveBonusEffect(500, 'WAVE CLEARED!', { compact: true, subtitle: 'NEXT WAVE' });
    play.onRankUp((Number(game.rankIndex) || 0) + 1);
  });
  const progressionSamples = [];
  for (let index = 0; index < 52; index += 1) {
    await page.waitForTimeout(100);
    const state = await readState(page);
    progressionSamples.push(state.toast?.progressionPresentation || {});
  }
  if (progressionSamples.some((sample) => sample.waveBonusActive && sample.rankUpActive)) {
    throw new Error(`rank-up presentation overlapped wave-clear presentation: ${JSON.stringify(progressionSamples, null, 2)}`);
  }
  if (!progressionSamples.some((sample) => sample.waveBonusActive && sample.pendingRank !== null)) {
    throw new Error('rank-up presentation was not queued behind wave clear');
  }
  if (!progressionSamples.some((sample) => sample.rankUpActive && !sample.waveBonusActive)) {
    throw new Error('queued rank-up presentation was not released after wave clear');
  }
  const transitionDelayMs = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const until = Date.now() + 3100;
    play.toastSlotLockUntil = { center: until, top: until, corner: until };
    play.centerToastLockUntil = until;
    const delay = play.getTransitionMessageDelayMs({ minMs: 900, maxMs: 3600 });
    play.toastSlotLockUntil = { center: 0, top: 0, corner: 0 };
    play.centerToastLockUntil = 0;
    play.enemyManager.state = 'WAVE_ACTIVE';
    return delay;
  });
  if (transitionDelayMs < 3000) {
    throw new Error(`boss transition did not honor the full message lock: ${transitionDelayMs}ms`);
  }

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!play) throw new Error('Missing play scene for combat relocation check');
    play.clearToastState?.();
    play.introActive = false;
    play.introComplete = true;
    if (play.enemyManager) {
      play.enemyManager.enemies = [{
        active: true,
        visible: true,
        waitingForEntry: false,
        x: game.getWidth() * 0.5,
        y: game.getHeight() * 0.32,
        radius: 18,
        update() {},
        canShoot() { return false; }
      }];
    }
    if (play.bulletManager) play.bulletManager.enemyBullets = [];
    play.enqueueToast('COMBAT SAFE REWARD +200', {
      slot: 'center',
      type: 'score_boost',
      priority: 1,
      fontSize: 30,
      duration: 1400
    });
  });
  await page.waitForTimeout(160);
  const relocationState = await readState(page);
  const relocatedToast = (relocationState.toast?.active || []).find((toast) => toast.message === 'COMBAT SAFE REWARD +200');
  if (!relocatedToast || relocatedToast.slot !== 'top' || relocatedToast.combatRelocated !== true) {
    throw new Error(`combat relocation failed: ${JSON.stringify(relocationState.toast?.active || [], null, 2)}`);
  }
  validateSample(relocationState, 'combat_relocation');

  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    if (!play) throw new Error('Missing play scene for boss intro crowding check');
    play.clearToastState?.();
    play.introActive = false;
    play.introComplete = true;
    play.showBossIntro?.('BULLET METRONOME', 'CLOCKWORK SWARM');
    play.enqueueToast('ORBITAL STRIKE!', {
      slot: 'center',
      type: 'powerup',
      priority: 1,
      fontSize: 22,
      duration: 1400
    });
    play.enqueueToast('ORBITAL STRIKE!', {
      slot: 'center',
      type: 'powerup',
      priority: 1,
      fontSize: 22,
      duration: 1400
    });
    play.enqueueToast('ORBITAL STRIKE!', {
      slot: 'top',
      type: 'powerup',
      priority: 1,
      fontSize: 18,
      duration: 1400
    });
  });
  await page.waitForTimeout(240);
  const bossIntroState = await readState(page);
  validateSample(bossIntroState, 'boss_intro_crowding');
  const bossIntroActive = (bossIntroState.toast?.active || []).find((toast) => toast.type === 'boss_intro');
  if (!bossIntroActive) {
    throw new Error(`boss intro did not expose a tracked center message: ${JSON.stringify(bossIntroState.toast?.active || [], null, 2)}`);
  }
  if (/boss entrance|pew-pew|coin slot|swarm choreography|panic button/i.test(bossIntroActive.message || '')) {
    throw new Error(`boss intro leaked generated arcade filler: ${JSON.stringify(bossIntroActive, null, 2)}`);
  }
  const activeOrbitals = (bossIntroState.toast?.active || []).filter((toast) => toast.message === 'ORBITAL STRIKE!');
  if (activeOrbitals.length > 0) {
    throw new Error(`duplicate/powerup toast crowded boss intro: ${JSON.stringify(bossIntroState.toast?.active || [], null, 2)}`);
  }
  const queuedOrbitals = (bossIntroState.toast?.queued?.center || 0) + (bossIntroState.toast?.queued?.top || 0);
  if (queuedOrbitals > 1) {
    throw new Error(`duplicate queued toasts were not collapsed: ${JSON.stringify(bossIntroState.toast?.queued || {}, null, 2)}`);
  }
  const bossIntroScreenshot = path.join(outputDir, 'boss-intro-message-signal.png');
  await page.screenshot({ path: bossIntroScreenshot, fullPage: true });

  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (!play) throw new Error('Missing play scene for discovery HUD avoidance check');
    play.clearToastState?.();
    play.hud?.updateTraitMeter?.();
    play.enqueueToast('NEW THREAT SCANNED: PULSE NET\nTHREAT CODEX UPDATED +63', {
      fontSize: window.__game.getWidth() < 620 ? 14 : 17,
      fill: '#7dffcc',
      stroke: '#001616',
      strokeThickness: 2,
      slot: 'corner',
      type: 'discovery',
      duration: 1800,
      priority: 1,
      maxWidth: window.__game.getWidth() * (window.__game.getWidth() < 620 ? 0.72 : 0.38)
    });
  });
  await page.waitForTimeout(120);
  const discoveryHudAvoidance = await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    const toBounds = (node) => {
      if (!node?.getBounds) return null;
      const bounds = node.getBounds();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    };
    return {
      discovery: toBounds(play?.activeCornerToast),
      trait: toBounds(play?.hud?.traitGroup),
      safeY: play?.getCornerToastSafeY?.('NEW THREAT SCANNED: PULSE NET\nTHREAT CODEX UPDATED +63', 17) || null
    };
  });
  if (!discoveryHudAvoidance.discovery || !discoveryHudAvoidance.trait) {
    throw new Error(`missing discovery or trait bounds: ${JSON.stringify(discoveryHudAvoidance)}`);
  }
  if (overlap(discoveryHudAvoidance.discovery, discoveryHudAvoidance.trait, 10)) {
    throw new Error(`discovery toast overlapped trait HUD: ${JSON.stringify(discoveryHudAvoidance, null, 2)}`);
  }
  const discoveryScreenshot = path.join(outputDir, 'discovery-toast-hud-avoidance.png');
  await page.screenshot({ path: discoveryScreenshot, fullPage: true });

  const screenshot = path.join(outputDir, 'gameplay-message-overlap-final.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const report = {
    status: 'passed',
    baseUrl,
    firstRun: {
      controls: firstRunControls,
      protectedControls: protectedControlsState.toast?.active || [],
      firstHostileElapsedMs
    },
    progressionSamples,
    transitionDelayMs,
    samples,
    bossIntro: {
      active: bossIntroState.toast?.active || [],
      queued: bossIntroState.toast?.queued || {},
      screenshot: bossIntroScreenshot
    },
    discoveryHudAvoidance,
    discoveryScreenshot,
    screenshot,
    pageErrors,
    consoleEvents
  };
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join('; ')}`);
  if (consoleEvents.length > 0) throw new Error(`Console errors: ${consoleEvents.join('; ')}`);
  console.log(`[gameplay-message-overlap] PASS samples=${samples.length} report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  console.error(`[gameplay-message-overlap] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
