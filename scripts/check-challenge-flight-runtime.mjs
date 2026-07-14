import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { CHALLENGE_FLIGHT_PATTERNS } from '../src/config/ChallengeFlights.js';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4570));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/challenge-flight-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findAvailablePort(startPort) {
  for (let candidate = startPort; candidate < startPort + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No available Challenge Flight port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [viteEntry, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Vite preview did not become ready at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function waitForPlay(page) {
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return play?.isReady === true && play?.player && play?.enemyManager && play?.hud && play?.introComplete === true && play?.introActive !== true;
  }, null, { timeout: 90000 });
}

async function startChallenge(page, pattern, count = 8) {
  const result = await page.evaluate(({ pattern: flightPattern, count: targetCount }) => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    play.isPaused = true;
    play.clearToastState?.();
    manager.clearEnemies();
    play.clearEnemyBullets?.('challenge_runtime_setup');
    play.clearDebugProjectiles?.();
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    manager.waveEnding = false;
    manager.currentWaveIndex = 0;
    manager.normalWavesTotal = 2;
    manager.currentModifier = null;
    manager.pendingWaveConfig = null;
    const config = {
      type: 'bonus_challenge',
      count: targetCount,
      formation: flightPattern.formation,
      tactic: flightPattern.tactic,
      entry: flightPattern.entry,
      cadence: flightPattern.cadence,
      challengeFlightPatternId: flightPattern.id,
      challengeFlightPatternLabel: flightPattern.label,
      sourceLevel: 7,
      normalWaveDifficultyLevel: 7,
      isChallenge: true
    };
    manager.waves = [config, {
      type: 'drone_basic',
      count: 4,
      formation: 'GRID',
      tactic: 'strafe_sweep',
      sourceLevel: 7,
      normalWaveDifficultyLevel: 7
    }];
    play.player.invulnerable = true;
    play.player.shootCooldown = Number.MAX_SAFE_INTEGER;
    manager.spawnWave(config);
    const targets = manager.enemies.filter((enemy) => enemy?.challengeFlightTarget);
    if (!manager.challengeFlightState?.active) {
      manager.beginChallengeFlight(config, targets.length);
    }
    targets.forEach((enemy, index) => {
      enemy.challengeFlightTarget = true;
      enemy.challengeFlightResolved = false;
      enemy.challengeFlightTargetId = `${manager.level}:${manager.currentWaveIndex}:${index}`;
      enemy.waitingForEntry = false;
      enemy.active = true;
      enemy.state = 'FORMATION';
      enemy.x = enemy.formationX;
      enemy.y = enemy.formationY;
      enemy.sprite.x = enemy.x;
      enemy.sprite.y = enemy.y;
      enemy.sprite.visible = true;
      enemy.sprite.renderable = true;
      enemy.challengeFlightExitAt = Date.now() + 6000;
    });
    window.__challengeRuntimeTargets = targets;
    window.__challengeRuntimeConfig = config;
    manager.challengeFlightState.deadlineAt = Date.now() + 6000;
    play.updateChallengeFlightHud?.(manager.getChallengeFlightDebugState());
    return { config, state: manager.getChallengeFlightDebugState?.(), targetCount: targets.length };
  }, { pattern, count });
  assert(result.targetCount === count, `Challenge Flight spawned ${result.targetCount}/${count} targets`);
  return result;
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const report = { ok: false, baseUrl, outputDir, scenarios: {}, pageErrors, consoleErrors };
try {
  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitForPlay(page);
  await startChallenge(page, CHALLENGE_FLIGHT_PATTERNS[0], 8);

  report.scenarios.desktop = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const manager = play.enemyManager;
    const targets = window.__challengeRuntimeTargets || manager.enemies.filter((enemy) => enemy?.challengeFlightTarget);
    if (!manager.challengeFlightState?.active) {
      manager.beginChallengeFlight(window.__challengeRuntimeConfig || {}, targets.length);
      targets.forEach((enemy, index) => {
        enemy.challengeFlightTarget = true;
        enemy.challengeFlightResolved = false;
        enemy.challengeFlightTargetId = `${manager.level}:${manager.currentWaveIndex}:${index}`;
      });
    }
    if (!play.challengeFlightHud) {
      play.showChallengeFlightHud?.(manager.getChallengeFlightDebugState());
    }
    const hud = play.challengeFlightHud;
    const bounds = hud?.container?.getBounds?.();
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return {
      targets: targets.map((enemy) => ({
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        shootDelay: enemy.shootDelay,
        fireScalar: enemy.tacticalFireScalar,
        ace: Boolean(enemy.isAce),
        rare: Boolean(enemy.isRareChaosVisitor),
        reticle: Boolean(enemy.challengeFlightReticle),
        y: enemy.y
      })),
      hud: structuredClone(hud?.container?._debugChallengeFlight || null),
      bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null,
      renderState: state.wave?.challengeFlight || null,
      activeToastTypes: (play.getToastDebugState?.()?.active || []).map((entry) => entry?.type).filter(Boolean),
      enemyBullets: (play.bulletManager.enemyBullets || []).filter((bullet) => bullet?.active !== false).length
    };
  });
  report.scenarios.desktop.screenshot = path.join(outputDir, 'cabinet-skill-flight-1920x1080.png');
  await page.screenshot({ path: report.scenarios.desktop.screenshot, fullPage: true });
  const desktop = report.scenarios.desktop;
  assert(desktop.targets.length === 8, `target count mismatch: ${JSON.stringify(desktop.targets)}`);
  assert(desktop.targets.every((target) => target.health === 1 && target.maxHealth === 1 && target.fireScalar === 0 && target.reticle && !target.ace && !target.rare), `target policy mismatch: ${JSON.stringify(desktop.targets)}`);
  assert(desktop.targets.every((target) => target.y >= 200), `challenge targets overlapped the mission HUD: ${JSON.stringify(desktop.targets)}`);
  assert(desktop.enemyBullets === 0, `challenge spawned enemy bullets: ${desktop.enemyBullets}`);
  assert(desktop.hud?.title === 'CABINET SKILL FLIGHT' && desktop.hud?.pattern === 'STAR PARADE', `desktop HUD mismatch: ${JSON.stringify(desktop.hud)}`);
  assert(desktop.renderState?.active === true && desktop.renderState?.targetCount === 8, `render_game_to_text mismatch: ${JSON.stringify(desktop.renderState)}`);
  assert(!desktop.activeToastTypes.some((type) => /codex|discovery|cabinet/i.test(type)), `Codex presentation interrupted the skill flight: ${desktop.activeToastTypes.join(',')}`);
  assert(desktop.bounds && desktop.bounds.x >= 0 && desktop.bounds.y >= 0 && desktop.bounds.x + desktop.bounds.width <= 1920 && desktop.bounds.y + desktop.bounds.height <= 1080, `desktop HUD escaped viewport: ${JSON.stringify(desktop.bounds)}`);

  report.scenarios.contactSafety = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const target = (window.__challengeRuntimeTargets || play.enemyManager.enemies).find((enemy) => enemy?.challengeFlightTarget);
    target.active = true;
    const before = { lives: play.game.lives, active: target.active };
    const original = { x: target.x, y: target.y };
    target.x = play.player.x;
    target.y = play.player.y;
    target.sprite.x = target.x;
    target.sprite.y = target.y;
    play.checkCollisions();
    const after = { lives: play.game.lives, active: target.active };
    target.x = original.x;
    target.y = original.y;
    target.sprite.x = original.x;
    target.sprite.y = original.y;
    return { before, after };
  });
  assert(report.scenarios.contactSafety.before.lives === report.scenarios.contactSafety.after.lives && report.scenarios.contactSafety.after.active, `challenge contact harmed player or target: ${JSON.stringify(report.scenarios.contactSafety)}`);

  report.scenarios.perfect = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const manager = play.enemyManager;
    const targets = window.__challengeRuntimeTargets || manager.enemies;
    const config = window.__challengeRuntimeConfig || {};
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    manager.currentWaveIndex = 0;
    manager.normalWavesTotal = 2;
    manager.waves = [config, {
      type: 'drone_basic',
      count: 4,
      formation: 'GRID',
      tactic: 'strafe_sweep',
      sourceLevel: 7,
      normalWaveDifficultyLevel: 7
    }];
    manager.beginChallengeFlight(config, targets.length);
    targets.forEach((enemy, index) => {
      enemy.challengeFlightTarget = true;
      enemy.challengeFlightResolved = false;
      enemy.challengeFlightTargetId = `${manager.level}:${manager.currentWaveIndex}:${index}`;
    });
    const streakBefore = play.flawlessWaveStreak;
    const scoreBefore = play.game.score;
    for (const enemy of [...targets].filter((candidate) => candidate?.challengeFlightTarget)) {
      const destroyed = enemy.takeDamage(99999);
      if (destroyed) play.onEnemyKilled(enemy);
      manager.removeEnemySprite(enemy, 'challenge_runtime_perfect');
    }
    manager.sweepInactiveEnemyVisuals('challenge_runtime_perfect_sweep');
    manager.onWaveCleared();
    return {
      result: structuredClone(manager.lastChallengeFlightResult),
      presentation: structuredClone(play.lastChallengeFlightPresentation),
      scoreDelta: play.game.score - scoreBefore,
      streakBefore,
      streakAfter: play.flawlessWaveStreak,
      hudCleared: play.challengeFlightHud === null
    };
  });
  await page.waitForTimeout(260);
  report.scenarios.perfect.screenshot = path.join(outputDir, 'perfect-flight-1920x1080.png');
  await page.screenshot({ path: report.scenarios.perfect.screenshot, fullPage: true });
  const perfect = report.scenarios.perfect;
  assert(perfect.result?.grade === 'PERFECT' && perfect.result?.kills === 8 && perfect.result?.bonus === 5000, `perfect grade mismatch: ${JSON.stringify(perfect)}`);
  assert(perfect.presentation?.label === 'PERFECT FLIGHT!' && perfect.presentation?.appliedBonus > 0, `perfect presentation mismatch: ${JSON.stringify(perfect.presentation)}`);
  assert(perfect.scoreDelta >= perfect.presentation.appliedBonus, `perfect score not applied: ${JSON.stringify(perfect)}`);
  assert(perfect.streakBefore === perfect.streakAfter, 'harmless skill flight incorrectly advanced flawless-wave streak');
  assert(perfect.hudCleared, 'challenge HUD survived completion');

  await page.evaluate(() => localStorage.setItem('novaSwarm.languagePreference.v1', 'de'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitForPlay(page);
  await page.setViewportSize({ width: 840, height: 640 });
  await startChallenge(page, CHALLENGE_FLIGHT_PATTERNS[4], 8);
  report.scenarios.germanCompact = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const manager = play.enemyManager;
    const targets = window.__challengeRuntimeTargets || [];
    if (!manager.challengeFlightState?.active) {
      manager.beginChallengeFlight(window.__challengeRuntimeConfig || {}, targets.length);
    }
    if (!play.challengeFlightHud) {
      play.showChallengeFlightHud?.(manager.getChallengeFlightDebugState());
    }
    const bounds = play.challengeFlightHud?.container?.getBounds?.();
    return {
      hud: structuredClone(play.challengeFlightHud?.container?._debugChallengeFlight || null),
      bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null
    };
  });
  report.scenarios.germanCompact.screenshot = path.join(outputDir, 'flugpruefung-840x640.png');
  await page.screenshot({ path: report.scenarios.germanCompact.screenshot, fullPage: true });
  assert(report.scenarios.germanCompact.hud?.title === 'CABINET-FLUGTEST', `German title missing: ${JSON.stringify(report.scenarios.germanCompact.hud)}`);
  assert(report.scenarios.germanCompact.hud?.pattern === 'ZANGEN-POLKA', `German pattern missing: ${JSON.stringify(report.scenarios.germanCompact.hud)}`);
  assert(report.scenarios.germanCompact.bounds && report.scenarios.germanCompact.bounds.x >= 0 && report.scenarios.germanCompact.bounds.y >= 0 && report.scenarios.germanCompact.bounds.x + report.scenarios.germanCompact.bounds.width <= 840 && report.scenarios.germanCompact.bounds.y + report.scenarios.germanCompact.bounds.height <= 640, `compact HUD escaped viewport: ${JSON.stringify(report.scenarios.germanCompact.bounds)}`);

  report.scenarios.partial = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const manager = play.enemyManager;
    const targets = window.__challengeRuntimeTargets || manager.enemies.filter((enemy) => enemy?.challengeFlightTarget);
    manager.beginChallengeFlight(window.__challengeRuntimeConfig || {}, targets.length);
    targets.forEach((enemy, index) => {
      enemy.challengeFlightResolved = false;
      enemy.challengeFlightTargetId = `${manager.level}:${manager.currentWaveIndex}:${index}`;
    });
    const trace = [{ step: 'start', state: manager.getChallengeFlightDebugState() }];
    targets.slice(0, 4).forEach((enemy) => {
      enemy.active = true;
      enemy.challengeFlightTarget = true;
      enemy.challengeFlightResolved = false;
      if (!manager.recordChallengeFlightKill(enemy)) {
        throw new Error(`Failed to register partial Challenge Flight target ${enemy.challengeFlightTargetId}`);
      }
      trace.push({ step: `kill:${enemy.challengeFlightTargetId}`, state: manager.getChallengeFlightDebugState() });
    });
    targets.slice(4).forEach((enemy) => {
      enemy.active = true;
      enemy.challengeFlightTarget = true;
      enemy.challengeFlightResolved = false;
      if (!manager.resolveChallengeFlightTarget(enemy, 'escape')) {
        throw new Error(`Failed to register escaped Challenge Flight target ${enemy.challengeFlightTargetId}`);
      }
      trace.push({ step: `escape:${enemy.challengeFlightTargetId}`, state: manager.getChallengeFlightDebugState() });
    });
    const result = manager.finishChallengeFlight();
    const presentation = play.showChallengeFlightResult({ ...result, appliedBonus: result.bonus });
    return {
      result: structuredClone(result),
      presentation: structuredClone(presentation),
      trace: structuredClone(trace),
      rankUpActive: Boolean(play.activeRankUpPresentation?.parent)
    };
  });
  await page.waitForTimeout(220);
  report.scenarios.partial.screenshot = path.join(outputDir, 'flugnote-b-840x640.png');
  await page.screenshot({ path: report.scenarios.partial.screenshot, fullPage: true });
  assert(report.scenarios.partial.result?.grade === 'B' && report.scenarios.partial.result?.kills === 4 && report.scenarios.partial.result?.escaped === 4, `partial grade mismatch: ${JSON.stringify(report.scenarios.partial)}`);
  assert(report.scenarios.partial.presentation?.label === 'FLUGNOTE B', `German result missing: ${JSON.stringify(report.scenarios.partial.presentation)}`);
  assert(report.scenarios.partial.rankUpActive === false, 'rank-up presentation overlapped Challenge Flight result');
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);

  report.ok = true;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[challenge-flight-runtime] PASS perfect=${perfect.result.grade} partial=${report.scenarios.partial.result.grade} targets=${desktop.targets.length}`);
  console.log(`[challenge-flight-runtime] screenshots=${outputDir}`);
} catch (error) {
  report.error = error.stack || error.message;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  throw error;
} finally {
  await browser.close();
  server?.kill();
}
