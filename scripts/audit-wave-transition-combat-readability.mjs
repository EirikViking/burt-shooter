import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findPort(5070);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.resolve(`test-results/wave-transition-combat-readability-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const locales = ['en', 'de', 'zh-CN', 'ru', 'es', 'pt-BR', 'ko', 'ja'];

async function findPort(start) {
  for (let candidate = start; candidate < start + 30; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error('No wave-transition audit port available');
}

async function fetchable(url) {
  try { return (await fetch(url, { cache: 'no-store' })).ok; } catch { return false; }
}

async function startServer() {
  const vite = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(vite) ? process.execPath : 'npx.cmd';
  const args = existsSync(vite) ? [vite] : ['vite'];
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const started = Date.now();
  while (Date.now() - started < 30000) {
    if (await fetchable(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  server.kill();
  throw new Error('Wave-transition audit server did not start');
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function seed(page, scenario) {
  await page.goto(`${baseUrl}/?autostart=1&skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(({ locale, reducedMotion }) => {
    localStorage.clear();
    localStorage.setItem('novaSwarm.languagePreference.v1', locale);
    localStorage.setItem('nova_accessibility_reduced_motion', reducedMotion ? '1' : '0');
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify({ version: 1, totalRuns: 4 }));
  }, scenario);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.player, null, { timeout: 30000 });
  return page.evaluate(({ inputMode }) => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    play.introActive = false;
    play.introComplete = true;
    play.setShipIntroAgencyState?.('complete', 'wave_transition_combat_readability_audit');
    play.clearPendingEnemyStart?.();
    play.clearToastState?.();
    play.completeFirstRunOnboarding?.();
    play.isPaused = false;
    game.isPaused = false;
    game.runMode = 'ranked_tactical';
    game.level = 1;
    game.lives = Math.max(3, Number(game.lives) || 0);
    game.inputManager = game.inputManager || {};
    game.inputManager.lastInputMethod = inputMode;
    manager.clearPendingWaveSpawns?.();
    manager.clearEnemies?.();
    play.clearEnemyBullets?.('wave_transition_audit_seed');
    const originalRandom = Math.random;
    window.__waveTransitionAuditOriginalRandom = originalRandom;
    let auditSeed = 0x51a7c0de;
    Math.random = () => {
      auditSeed = (Math.imul(auditSeed, 1664525) + 1013904223) >>> 0;
      return auditSeed / 0x100000000;
    };
    const generated = manager.generateWaves(1);
    Math.random = () => 0;
    const first = { ...(generated[0] || {}), isChallenge: false, type: generated[0]?.type || 'Basic' };
    const second = { ...(generated[1] || generated[0] || {}), isChallenge: false, type: generated[1]?.type || generated[0]?.type || 'Basic' };
    manager.level = 1;
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    manager.currentWaveIndex = 0;
    manager.waves = [first, second];
    manager.normalWavesTotal = 2;
    manager.bossWaveIndex = 2;
    manager.spawning = false;
    manager.waveSpawnPendingCount = 0;
    manager.waveEnding = false;
    manager.cleanupTimer = 0;
    manager.cleanupPhase = 'NONE';
    manager.hijackerSpawnedThisLevel = true;
    manager.hijackerSpawnAttemptedThisLevel = true;
    manager.maybeSpawnRareChaosVisitor = () => null;
    play.maybePromoteAceEnemy = () => false;
    play.maybeApplyRivalWingEnemy = () => false;
    const recordFirstAttack = manager.recordCombatReadabilityFirstAttack.bind(manager);
    window.__waveTransitionAuditFirstAttackAt = null;
    manager.recordCombatReadabilityFirstAttack = (enemy) => {
      if (window.__waveTransitionAuditFirstAttackAt === null) {
        window.__waveTransitionAuditFirstAttackAt = performance.now();
      }
      return recordFirstAttack(enemy);
    };
    manager.onWaveCleared();
    if (inputMode === 'fallback-control') manager.waveBriefingAnnouncementCoveredIndex = null;
    if (inputMode === 'queue-probe') {
      window.__waveTransitionAuditQueueProbeShown = false;
      setTimeout(() => play.enqueueToast('AUDIT LATER MESSAGE', {
        type: 'audit_later', slot: 'top', priority: 2, duration: 420,
        onShown: () => { window.__waveTransitionAuditQueueProbeShown = true; }
      }), 400);
    }
    return { startedAt: performance.now() };
  }, scenario);
}

async function sample(page, startedAt) {
  return page.evaluate((start) => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    const player = play.player;
    const rect = (bounds) => bounds ? {
      x: Math.round(bounds.x), y: Math.round(bounds.y),
      width: Math.round(bounds.width), height: Math.round(bounds.height),
      right: Math.round(bounds.x + bounds.width), bottom: Math.round(bounds.y + bounds.height)
    } : null;
    const displays = [play.activeTopToast, play.activeCenterToast].filter(Boolean).map((display) => ({
      type: display.__toastMeta?.type || null,
      alpha: Number((display.alpha || 0).toFixed(3)),
      bounds: rect(display.getBounds?.())
    }));
    const transitionDisplays = displays.filter((entry) => entry.type === 'wave_clear' || entry.type === 'wave_start');
    const enemies = (manager.enemies || []).filter((enemy) => enemy?.active !== false && enemy?.sprite?.visible !== false);
    const enemyBounds = enemies.map((enemy) => rect(enemy.sprite?.getBounds?.())).filter(Boolean);
    const bullets = (play.bulletManager?.enemyBullets || []).filter((bullet) => bullet?.active !== false && bullet?.sprite?.visible !== false);
    const bulletBounds = bullets.map((bullet) => rect(bullet.sprite?.getBounds?.())).filter(Boolean);
    const intersects = (a, b) => Boolean(a && b && a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y);
    const opaqueTransitions = transitionDisplays.filter((entry) => entry.alpha >= 0.35 && entry.bounds);
    const enemyOverlap = enemyBounds.some((enemy) => opaqueTransitions.some((display) => intersects(enemy, display.bounds)));
    const projectileOverlap = bulletBounds.some((bullet) => opaqueTransitions.some((display) => intersects(bullet, display.bounds)));
    const meaningfulDodge = bullets.some((bullet) => Math.hypot((bullet.x || 0) - player.x, (bullet.y || 0) - player.y) <= 260);
    return {
      ms: Math.round(performance.now() - start),
      managerState: manager.state,
      currentWaveIndex: manager.currentWaveIndex,
      playerAgency: play.getShipIntroAgencyState?.() === 'complete' && !play.isPaused,
      enemyCount: enemies.length,
      enemySignature: enemies.map((enemy) => [
        enemy.type || null,
        enemy.generatedProfile?.id || null,
        Number(enemy.waveSlot) || 0
      ]),
      attackCapableCount: enemies.filter((enemy) => enemy.canShoot?.()).length,
      firstAttackMs: window.__waveTransitionAuditFirstAttackAt === null
        ? null
        : Math.round(window.__waveTransitionAuditFirstAttackAt - start),
      projectileCount: bullets.length,
      meaningfulDodge,
      displays: transitionDisplays,
      enemyBounds,
      bulletBounds,
      enemyOverlap,
      projectileOverlap,
      queueProbeShown: window.__waveTransitionAuditQueueProbeShown === true,
      viewport: { width: game.getWidth(), height: game.getHeight() }
    };
  }, startedAt);
}

async function runScenario(browser, scenario) {
  const dir = path.join(outputDir, scenario.id);
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: scenario.height },
    ...(scenario.recordVideo ? { recordVideo: { dir, size: { width: scenario.width, height: scenario.height } } } : {})
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  const seeded = await seed(page, scenario);
  console.log(`[wave-transition-combat-readability] ${scenario.id}:seeded`);
  const timeline = [];
  const deadline = Date.now() + 3600;
  while (Date.now() < deadline) {
    timeline.push(await sample(page, seeded.startedAt));
    await page.waitForTimeout(16);
  }
  console.log(`[wave-transition-combat-readability] ${scenario.id}:sampled`);
  await page.evaluate(() => {
    if (window.__waveTransitionAuditOriginalRandom) Math.random = window.__waveTransitionAuditOriginalRandom;
  });
  console.log(`[wave-transition-combat-readability] ${scenario.id}:restored`);
  const first = (predicate) => timeline.find(predicate) || null;
  const last = (predicate) => [...timeline].reverse().find(predicate) || null;
  const presentationBegin = first((entry) => entry.displays.length > 0);
  const enemyInstantiated = first((entry) => entry.enemyCount > 0);
  const enemyAttackCapable = first((entry) => entry.attackCapableCount > 0);
  const firstAttack = first((entry) => entry.firstAttackMs !== null);
  const firstProjectile = first((entry) => entry.projectileCount > 0);
  const meaningfulDodge = first((entry) => entry.meaningfulDodge);
  const firstGameplayClearAfterProjectile = first((entry) => firstProjectile && entry.ms >= firstProjectile.ms && entry.displays.length === 0);
  const lastPresentation = last((entry) => entry.displays.length > 0);
  const projectileOverlapSamples = timeline.filter((entry) => entry.projectileOverlap);
  const enemyOverlapSamples = timeline.filter((entry) => entry.enemyOverlap);
  const maxBoundsOverflow = timeline.reduce((max, entry) => Math.max(max, ...entry.displays.map(({ bounds }) => bounds ? Math.max(0, -bounds.x, -bounds.y, bounds.right - entry.viewport.width, bounds.bottom - entry.viewport.height) : 0)), 0);
  const result = {
    scenario,
    timelineSummary: {
      authoritativeWaveClearMs: 0,
      presentationBeginMs: presentationBegin?.ms ?? null,
      nextWaveEnemiesInstantiateMs: enemyInstantiated?.ms ?? null,
      enemyAttackCapableMs: enemyAttackCapable?.ms ?? firstAttack?.firstAttackMs ?? null,
      firstHostileAttackMs: firstAttack?.firstAttackMs ?? null,
      firstHostileProjectileMs: firstProjectile?.ms ?? null,
      meaningfulDodgeRangeMs: meaningfulDodge?.ms ?? null,
      playerAgencyMs: first((entry) => entry.playerAgency)?.ms ?? null,
      presentationClearMs: lastPresentation?.ms ?? null,
      gameplayClearAfterProjectileMs: firstGameplayClearAfterProjectile?.ms ?? null
    },
    overlap: {
      enemyOpaqueOverlapMs: enemyOverlapSamples.length > 1 ? enemyOverlapSamples.at(-1).ms - enemyOverlapSamples[0].ms : 0,
      projectileOpaqueOverlapMs: projectileOverlapSamples.length > 1 ? projectileOverlapSamples.at(-1).ms - projectileOverlapSamples[0].ms : 0,
      projectileOverlapStartedMs: projectileOverlapSamples[0]?.ms ?? null,
      maxBoundsOverflow
    },
    finalEnemySignature: last((entry) => entry.enemySignature.length > 0)?.enemySignature || [],
    unrelatedQueueReleased: timeline.some((entry) => entry.queueProbeShown),
    errors,
    timeline
  };
  await page.close();
  console.log(`[wave-transition-combat-readability] ${scenario.id}:page-closed`);
  if (video) await video.saveAs(path.join(dir, `${scenario.id}.webm`));
  await context.close();
  console.log(`[wave-transition-combat-readability] ${scenario.id}:context-closed`);
  return result;
}

async function runAnnouncementBoundaryChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/?autostart=1&skipIntro=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'play' && window.__game?.scenes?.play?.enemyManager, null, { timeout: 30000 });
  const checks = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const manager = play.enemyManager;
    const run = (name, config, covered) => {
      play.clearToastState?.();
      manager.currentWaveIndex = name === 'initial' ? 0 : 1;
      manager.normalWavesTotal = 3;
      manager.pendingWaveConfig = config;
      manager.waveBriefingAnnouncementCoveredIndex = covered ? manager.currentWaveIndex : null;
      const shown = manager.announceWaveBriefing();
      return { shown, hasWaveStart: play.hasNotificationType?.('wave_start') === true };
    };
    const ordinary = { type: 'Basic', formation: 'line', tactic: 'strafe_sweep' };
    return {
      initial: run('initial', ordinary, false),
      fallback: run('fallback', ordinary, false),
      coveredOrdinary: run('covered', ordinary, true),
      challenge: run('challenge', { ...ordinary, type: 'bonus_challenge', isChallenge: true }, true),
      authored: run('authored', {
        ...ordinary,
        highSectorAuthoredEncounter: true,
        highSectorBeatName: 'SHIFTING FRONT',
        highSectorObjective: 'HOLD THE SAFE LANE'
      }, true)
    };
  });
  await page.close();
  await context.close();
  return checks;
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({ headless: true, executablePath: chromePath() });
const scenarioMatrix = [
  { id: 'en-1920-keyboard', locale: 'en', width: 1920, height: 1080, reducedMotion: false, inputMode: 'keyboard' },
  { id: 'en-1280-controller', locale: 'en', width: 1280, height: 720, reducedMotion: false, inputMode: 'queue-probe' },
  { id: 'en-960-keyboard', locale: 'en', width: 960, height: 640, reducedMotion: false, inputMode: 'keyboard' },
  { id: 'en-960-reduced', locale: 'en', width: 960, height: 640, reducedMotion: true, inputMode: 'controller' },
  ...locales.filter((locale) => locale !== 'en').map((locale) => ({
    id: `${locale.replaceAll(/[^a-z0-9]+/gi, '-')}-960`, locale, width: 960, height: 640, reducedMotion: false, inputMode: 'keyboard'
  }))
];
const onlyScenario = String(process.env.AUDIT_ONLY || '').trim();
const scenarios = onlyScenario
  ? scenarioMatrix.filter((scenario) => scenario.id === onlyScenario)
  : scenarioMatrix;

try {
  const reports = [];
  for (const scenario of scenarios) {
    console.log(`[wave-transition-combat-readability] scenario=${scenario.id}`);
    reports.push(await runScenario(browser, scenario));
  }
  console.log('[wave-transition-combat-readability] scenario=fallback-control');
  const fallbackControl = await runScenario(browser, {
    id: 'en-1280-fallback-control', locale: 'en', width: 1280, height: 720,
    reducedMotion: false, inputMode: 'fallback-control'
  });
  console.log('[wave-transition-combat-readability] checks=announcement-boundaries');
  const boundaryChecks = await runAnnouncementBoundaryChecks(browser);
  const runtimeErrors = reports.flatMap((entry) => entry.errors.map((error) => `${entry.scenario.id}: ${error}`));
  assert.deepEqual(runtimeErrors, [], `Wave-transition audit runtime errors: ${runtimeErrors.join('; ')}`);
  assert.equal(reports.some((entry) => entry.overlap.maxBoundsOverflow > 2), false, 'Transition banner escaped viewport bounds');
  assert.equal(reports.some((entry) => entry.timelineSummary.firstHostileProjectileMs === null), false, 'A scenario never reached a hostile projectile');
  assert.equal(reports.find((entry) => entry.scenario.id === 'en-1280-controller')?.unrelatedQueueReleased, true, 'Unrelated queued notification did not release after Wave Cleared');
  assert.deepEqual(
    reports.find((entry) => entry.scenario.id === 'en-1280-controller')?.finalEnemySignature,
    fallbackControl.finalEnemySignature,
    'Presentation suppression changed fixed-seed enemy identity/count/order'
  );
  assert.equal(boundaryChecks.initial.hasWaveStart, true, 'Initial wave announcement was suppressed');
  assert.equal(boundaryChecks.fallback.hasWaveStart, true, 'Wave Start fallback was suppressed without a covered clear plate');
  assert.equal(boundaryChecks.coveredOrdinary.hasWaveStart, false, 'Covered ordinary Wave Start was not suppressed');
  assert.equal(boundaryChecks.challenge.hasWaveStart, true, 'Challenge announcement was suppressed');
  assert.equal(boundaryChecks.authored.hasWaveStart, true, 'Authored high-sector announcement was suppressed');
  const maxProjectileOverlapMs = Math.max(...reports.map((entry) => entry.overlap.projectileOpaqueOverlapMs));
  const maxEnemyOverlapMs = Math.max(...reports.map((entry) => entry.overlap.enemyOpaqueOverlapMs));
  const maxActionablePresentationOverlapMs = Math.max(...reports.map((entry) => {
    const attack = entry.timelineSummary.firstHostileProjectileMs;
    const clear = entry.timelineSummary.presentationClearMs;
    return attack === null || clear === null ? 0 : Math.max(0, clear - attack);
  }));
  const report = {
    status: 'passed', outputDir,
    sourceTiming: { waveClearDurationMs: 1320, briefingMsLevel1: 520, entryDurationMsLevel1: 1139 },
    maxProjectileOverlapMs,
    maxEnemyOverlapMs,
    maxActionablePresentationOverlapMs,
    proceedGateTriggered: maxActionablePresentationOverlapMs >= 500 || maxProjectileOverlapMs > 0 || maxEnemyOverlapMs >= 300,
    boundaryChecks,
    fallbackControl: {
      timelineSummary: fallbackControl.timelineSummary,
      finalEnemySignature: fallbackControl.finalEnemySignature
    },
    reports
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[wave-transition-combat-readability] PASS scenarios=${reports.length} proceed=${report.proceedGateTriggered} projectileOverlapMs=${maxProjectileOverlapMs} enemyOverlapMs=${maxEnemyOverlapMs} actionablePresentationOverlapMs=${maxActionablePresentationOverlapMs}`);
  console.log(`[wave-transition-combat-readability] report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close();
  server.kill();
}
