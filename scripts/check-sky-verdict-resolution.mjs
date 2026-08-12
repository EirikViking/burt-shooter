import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findAvailablePort(4830);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/sky-verdict-${timestamp()}`);

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
  throw new Error('No Sky Verdict check port available');
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
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
  const vite = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [vite, '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error('Sky Verdict check server did not start');
}

async function waitForStrike(page, minimumMs = 560) {
  await page.waitForTimeout(minimumMs);
  return page.evaluate(() => structuredClone(window.__game.scenes.play.lastOrbitalStrikeDebug));
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const errors = [];
const report = { ok: false, baseUrl, outputDir, scenarios: {}, screenshots: {}, errors };

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => {
    localStorage.setItem('burt_first_run_completed', 'true');
    localStorage.setItem('burt_voice_enabled', 'false');
    localStorage.setItem('burt_music_enabled', 'false');
    localStorage.setItem('burt_sfx_enabled', 'false');
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && state.player?.active === true && window.__game?.scenes?.play?.player;
  }, null, { timeout: 30000 });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.shipIntroToken = (Number(play.shipIntroToken) || 0) + 1;
    play.introActive = false;
    play.introComplete = true;
    play.pendingEnemyStartTimeout = null;
    play.enemyManager.state = 'WAVE_ACTIVE';
    play.enemyManager.phase = 'WAVES';
    play.enemyManager.update = () => {};
    play.player?.grantInvulnerability?.(120000, 'sky_verdict_resolution_check');
    play.player.shootCooldown = 999999;

    window.__skyVerdictCheck = {
      makeTarget({
        id,
        kind = 'enemy',
        x = 400,
        y = 260,
        health = 9999,
        visible = true,
        spawnOrdinal = undefined
      }) {
        return {
          id,
          type: id,
          kind,
          isBoss: kind === 'boss',
          active: true,
          destroyed: false,
          waitingForEntry: false,
          visible,
          renderable: visible,
          spawnOrdinal,
          x,
          y,
          radius: kind === 'boss' ? 38 : 18,
          health,
          maxHealth: health,
          scoreValue: 0,
          sprite: { visible, renderable: visible, alpha: visible ? 1 : 0, parent: null },
          update() {},
          takeDamage(amount) {
            this.health -= Math.max(0, Number(amount) || 0);
            if (this.health <= 0) {
              this.health = 0;
              this.active = false;
              this.destroyed = true;
              return true;
            }
            return false;
          }
        };
      },
      makeBomb({ x = 80, y = 650, damage = 1, blastRadius = 110 } = {}) {
        return {
          active: true,
          isBomb: true,
          bombDetonated: false,
          x,
          y,
          radius: 8,
          damage,
          blastRadius
        };
      },
      reset({ skyVerdict = true, charges = 2, emergency = 'ready', bombShots = 1, experiment = null } = {}) {
        const currentPlay = window.__game.scenes.play;
        const player = currentPlay.player;
        currentPlay.enemyManager.enemies = [];
        currentPlay.enemyManager.boss = null;
        currentPlay.enemyManager.hijacker = null;
        currentPlay.lastOrbitalStrikeDebug = null;
        currentPlay.orbitalStrikeTimer = 0;
        currentPlay.game.lateGameExperiment = experiment;
        player.runAugmentModifiers = { ...(player.runAugmentModifiers || {}), skyVerdict, sectorStart: {} };
        player.orbitalStrikeActive = charges > 0;
        player.orbitalStrikeCharges = charges;
        player.tacticalOrbitalStrikeCharges = charges;
        player.orbitalStrikeMaxCharges = Math.max(5, charges);
        player.bombShotsLeft = bombShots;
        player.skyVerdictEmergencyState = emergency;
        player.tacticalFusionStats ||= {};
        player.tacticalFusionStats.skyVerdicts = 0;
        player.lastTacticalFusionEvent = null;
      }
    };
  });

  const noSurvivorStock = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2, emergency: 'ready' });
    const lastEnemy = test.makeTarget({ id: 'last_enemy', x: 360, y: 260, health: 5 });
    play.enemyManager.enemies = [lastEnemy];
    const detonated = play.detonateBombBullet(test.makeBomb({ x: 360, y: 260, damage: 10 }), 'no_survivor_stock');
    return {
      detonated,
      enemyActive: lastEnemy.active,
      charges: play.player.orbitalStrikeCharges,
      tacticalCharges: play.player.tacticalOrbitalStrikeCharges,
      emergency: play.player.skyVerdictEmergencyState,
      stats: play.player.tacticalFusionStats.skyVerdicts,
      debug: structuredClone(play.lastOrbitalStrikeDebug)
    };
  });
  assert(noSurvivorStock.detonated && !noSurvivorStock.enemyActive, `Bomb did not resolve before survivor selection: ${JSON.stringify(noSurvivorStock)}`);
  assert(noSurvivorStock.charges === 2 && noSurvivorStock.tacticalCharges === 2,
    `No-survivor Bomb consumed Orbital stock: ${JSON.stringify(noSurvivorStock)}`);
  assert(noSurvivorStock.emergency === 'ready' && noSurvivorStock.stats === 0,
    `No-survivor Bomb consumed emergency Verdict: ${JSON.stringify(noSurvivorStock)}`);
  assert(noSurvivorStock.debug?.cancelReason === 'no_survivor' && noSurvivorStock.debug?.reserved === false,
    `No-survivor terminal state is not explicit: ${JSON.stringify(noSurvivorStock)}`);
  report.scenarios.noSurvivorStock = noSurvivorStock;

  const noSurvivorEmergency = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 0, emergency: 'ready' });
    const lastEnemy = test.makeTarget({ id: 'last_emergency_enemy', x: 420, y: 280, health: 4 });
    play.enemyManager.enemies = [lastEnemy];
    play.detonateBombBullet(test.makeBomb({ x: 420, y: 280, damage: 8 }), 'no_survivor_emergency');
    return {
      emergency: play.player.skyVerdictEmergencyState,
      charges: play.player.orbitalStrikeCharges,
      debug: structuredClone(play.lastOrbitalStrikeDebug)
    };
  });
  assert(noSurvivorEmergency.charges === 0 && noSurvivorEmergency.emergency === 'ready',
    `No-survivor emergency was consumed: ${JSON.stringify(noSurvivorEmergency)}`);
  report.scenarios.noSurvivorEmergency = noSurvivorEmergency;

  const ordinaryStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2 });
    const target = test.makeTarget({ id: 'ordinary_survivor', x: 620, y: 300 });
    play.enemyManager.enemies = [target];
    play.detonateBombBullet(test.makeBomb(), 'ordinary_survivor');
    return {
      charges: play.player.orbitalStrikeCharges,
      debug: structuredClone(play.lastOrbitalStrikeDebug)
    };
  });
  assert(ordinaryStart.charges === 1 && ordinaryStart.debug?.initialTargetId === 'ordinary_survivor',
    `Ordinary survivor was not reserved deterministically: ${JSON.stringify(ordinaryStart)}`);
  await page.waitForTimeout(160);
  report.screenshots.warning = path.join(outputDir, '01-sky-verdict-tracked-warning.png');
  await page.screenshot({ path: report.screenshots.warning });
  const ordinaryFinal = await waitForStrike(page, 420);
  assert(ordinaryFinal?.released && ordinaryFinal?.completed && ordinaryFinal?.impactTargetId === 'ordinary_survivor',
    `Ordinary survivor strike did not release: ${JSON.stringify(ordinaryFinal)}`);
  assert(ordinaryFinal.warningElapsedMs >= 450 && ordinaryFinal.warningElapsedMs < 700,
    `Ordinary survivor warning duration drifted: ${JSON.stringify(ordinaryFinal)}`);
  report.scenarios.ordinarySurvivor = { start: ordinaryStart, final: ordinaryFinal };

  const bossStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2 });
    const ordinary = test.makeTarget({ id: 'deeper_ordinary', x: 300, y: 520 });
    const boss = test.makeTarget({ id: 'surviving_boss', kind: 'boss', x: 720, y: 180 });
    play.enemyManager.enemies = [ordinary, boss];
    play.enemyManager.boss = boss;
    play.detonateBombBullet(test.makeBomb(), 'boss_priority');
    return structuredClone(play.lastOrbitalStrikeDebug);
  });
  assert(bossStart?.initialTargetId === 'surviving_boss', `Boss lost shipped threat priority: ${JSON.stringify(bossStart)}`);
  const bossFinal = await waitForStrike(page);
  assert(bossFinal?.impactTargetId === 'surviving_boss', `Surviving boss was not struck: ${JSON.stringify(bossFinal)}`);
  report.scenarios.bossPriority = { start: bossStart, final: bossFinal };

  const hijackerStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2 });
    const hijacker = test.makeTarget({ id: 'visible_hijacker', kind: 'hijacker', x: 580, y: 360 });
    play.enemyManager.hijacker = hijacker;
    play.detonateBombBullet(test.makeBomb(), 'visible_hijacker');
    return structuredClone(play.lastOrbitalStrikeDebug);
  });
  assert(hijackerStart?.initialTargetId === 'visible_hijacker', `Visible Hijacker was not eligible: ${JSON.stringify(hijackerStart)}`);
  const hijackerFinal = await waitForStrike(page);
  assert(hijackerFinal?.impactTargetId === 'visible_hijacker'
    && hijackerFinal.damageEvents?.some((event) => event.kind === 'hijacker'),
  `Visible Hijacker was not damaged: ${JSON.stringify(hijackerFinal)}`);
  report.scenarios.visibleHijacker = { start: hijackerStart, final: hijackerFinal };

  const movingStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2 });
    const target = test.makeTarget({ id: 'moving_survivor', x: 280, y: 240 });
    play.enemyManager.enemies = [target];
    play.detonateBombBullet(test.makeBomb(), 'moving_target');
    return structuredClone(play.lastOrbitalStrikeDebug);
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const target = window.__game.scenes.play.enemyManager.enemies[0];
    target.x = 760;
    target.y = 350;
  });
  await page.waitForTimeout(120);
  const movingWarning = await page.evaluate(() => structuredClone(window.__game.scenes.play.lastOrbitalStrikeDebug));
  assert(movingWarning.warningX === 760 && movingWarning.warningY === 350,
    `Warning did not follow the moving target: ${JSON.stringify(movingWarning)}`);
  const movingFinal = await waitForStrike(page, 310);
  assert(movingFinal?.impactX === 760 && movingFinal?.impactY === 350 && movingFinal?.impactTargetId === 'moving_survivor',
    `Impact did not use target current position: ${JSON.stringify(movingFinal)}`);
  report.scenarios.movingTarget = { start: movingStart, warning: movingWarning, final: movingFinal };

  const reacquireStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2 });
    const fallback = test.makeTarget({ id: 'reacquired_survivor', x: 520, y: 420 });
    const boss = test.makeTarget({ id: 'lost_boss', kind: 'boss', x: 660, y: 180 });
    play.enemyManager.enemies = [fallback, boss];
    play.enemyManager.boss = boss;
    play.detonateBombBullet(test.makeBomb(), 'reacquire_once');
    return structuredClone(play.lastOrbitalStrikeDebug);
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.enemyManager.boss.active = false;
    play.enemyManager.boss.destroyed = true;
  });
  await page.waitForTimeout(120);
  const reacquireMid = await page.evaluate(() => structuredClone(window.__game.scenes.play.lastOrbitalStrikeDebug));
  assert(reacquireMid.reacquireCount === 1 && reacquireMid.reacquiredTargetId === 'reacquired_survivor',
    `Sky Verdict did not reacquire once: ${JSON.stringify(reacquireMid)}`);
  const reacquireFinal = await waitForStrike(page, 480);
  assert(reacquireFinal?.released && reacquireFinal?.impactTargetId === 'reacquired_survivor'
    && reacquireFinal.warningRestartCount === 1
    && reacquireFinal.warningElapsedMs >= 450 && reacquireFinal.warningElapsedMs < 650
    && reacquireFinal.totalWarningElapsedMs >= 600 && reacquireFinal.totalWarningElapsedMs < 850,
  `Reacquisition did not provide one fresh full-duration warning: ${JSON.stringify(reacquireFinal)}`);
  report.scenarios.reacquisition = { start: reacquireStart, mid: reacquireMid, final: reacquireFinal };

  const orderInvariance = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2 });
    const alpha = test.makeTarget({ id: 'alpha', x: 500, y: 340, spawnOrdinal: 9 });
    const beta = test.makeTarget({ id: 'beta', x: 500, y: 340, spawnOrdinal: 1 });
    play.enemyManager.enemies = [beta, alpha];
    const forward = play.getSkyVerdictSurvivor()?.id;
    play.enemyManager.enemies = [alpha, beta];
    const reversed = play.getSkyVerdictSurvivor()?.id;
    const later = test.makeTarget({ id: 'same', x: 540, y: 360, spawnOrdinal: 8 });
    const earlier = test.makeTarget({ id: 'same', x: 540, y: 360, spawnOrdinal: 2 });
    play.enemyManager.enemies = [later, earlier];
    const ordinalForward = play.getSkyVerdictSurvivor()?.spawnOrdinal;
    play.enemyManager.enemies = [earlier, later];
    const ordinalReversed = play.getSkyVerdictSurvivor()?.spawnOrdinal;
    return { forward, reversed, ordinalForward, ordinalReversed };
  });
  assert(orderInvariance.forward === 'alpha' && orderInvariance.reversed === 'alpha'
    && orderInvariance.ordinalForward === 2 && orderInvariance.ordinalReversed === 2,
  `Threat selection depends on backing collection order: ${JSON.stringify(orderInvariance)}`);
  report.scenarios.orderInvariance = orderInvariance;

  const transientStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2 });
    const initial = test.makeTarget({ id: 'transient_initial', kind: 'boss', x: 650, y: 180 });
    play.enemyManager.enemies = [initial];
    play.enemyManager.boss = initial;
    play.detonateBombBullet(test.makeBomb(), 'transient_reacquire');
    return structuredClone(play.lastOrbitalStrikeDebug);
  });
  await page.waitForTimeout(130);
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    const replacement = test.makeTarget({ id: 'transient_replacement', x: 560, y: 390, spawnOrdinal: 22 });
    play.enemyManager.enemies.push(replacement);
    play.enemyManager.boss.active = false;
    play.enemyManager.boss.destroyed = true;
  });
  await page.waitForTimeout(100);
  const transientMid = await page.evaluate(() => structuredClone(window.__game.scenes.play.lastOrbitalStrikeDebug));
  assert(transientMid?.reacquiredTargetId === 'transient_replacement' && transientMid?.warningRestartCount === 1,
    `Transient survivor was not picked by live reacquisition: ${JSON.stringify(transientMid)}`);
  const transientFinal = await waitForStrike(page, 480);
  assert(transientFinal?.released && transientFinal?.impactTargetId === 'transient_replacement'
    && transientFinal?.warningElapsedMs >= 450,
  `Transient survivor did not receive a full tracked warning: ${JSON.stringify(transientFinal)}`);
  report.scenarios.transientReacquisition = { start: transientStart, mid: transientMid, final: transientFinal };

  const stockRefundStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2 });
    const target = test.makeTarget({ id: 'stock_refund_target', x: 620, y: 260 });
    play.enemyManager.enemies = [target];
    play.detonateBombBullet(test.makeBomb(), 'stock_refund');
    return { charges: play.player.orbitalStrikeCharges, debug: structuredClone(play.lastOrbitalStrikeDebug) };
  });
  assert(stockRefundStart.charges === 1, `Orbital charge was not reserved: ${JSON.stringify(stockRefundStart)}`);
  await page.waitForTimeout(140);
  await page.evaluate(() => {
    const target = window.__game.scenes.play.enemyManager.enemies[0];
    target.active = false;
    target.destroyed = true;
  });
  await page.waitForTimeout(130);
  const stockRefundFinal = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      charges: play.player.orbitalStrikeCharges,
      tacticalCharges: play.player.tacticalOrbitalStrikeCharges,
      stats: play.player.tacticalFusionStats.skyVerdicts,
      debug: structuredClone(play.lastOrbitalStrikeDebug)
    };
  });
  assert(stockRefundFinal.charges === 2 && stockRefundFinal.tacticalCharges === 2
    && stockRefundFinal.stats === 0 && stockRefundFinal.debug?.refunded && stockRefundFinal.debug?.warningCleaned,
  `Cancelled stock reservation was not refunded atomically: ${JSON.stringify(stockRefundFinal)}`);
  report.scenarios.stockRefund = { start: stockRefundStart, final: stockRefundFinal };
  await page.waitForTimeout(360);

  const rackStackStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2 });
    play.player.runAugmentModifiers.sectorStart = { orbitalCharges: 2 };
    play.player.orbitalStrikePowerupType = 'tactical';
    const target = test.makeTarget({ id: 'rack_stack_refund_target', x: 630, y: 270 });
    play.enemyManager.enemies = [target];
    play.detonateBombBullet(test.makeBomb(), 'rack_stack_refund');
    const afterReservation = play.player.orbitalStrikeCharges;
    play.player.applyPowerup('orbital_strike');
    return {
      afterReservation,
      afterPickup: play.player.orbitalStrikeCharges,
      tacticalAfterPickup: play.player.tacticalOrbitalStrikeCharges
    };
  });
  assert(rackStackStart.afterReservation === 1 && rackStackStart.afterPickup > rackStackStart.afterReservation,
    `Permanent rack did not stack while a Verdict was reserved: ${JSON.stringify(rackStackStart)}`);
  await page.waitForTimeout(140);
  await page.evaluate(() => {
    const target = window.__game.scenes.play.enemyManager.enemies[0];
    target.active = false;
    target.destroyed = true;
  });
  await page.waitForTimeout(130);
  const rackStackFinal = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      charges: play.player.orbitalStrikeCharges,
      tacticalCharges: play.player.tacticalOrbitalStrikeCharges,
      maxCharges: play.player.orbitalStrikeMaxCharges,
      debug: structuredClone(play.lastOrbitalStrikeDebug)
    };
  });
  assert(rackStackFinal.charges === Math.min(10, rackStackStart.afterPickup + 1)
    && rackStackFinal.tacticalCharges === rackStackFinal.charges
    && rackStackFinal.maxCharges >= rackStackFinal.charges
    && rackStackFinal.debug?.refunded === true,
  `Refund lost or overfilled a stacked permanent rack: ${JSON.stringify({ rackStackStart, rackStackFinal })}`);
  report.scenarios.rackStackingRefund = { start: rackStackStart, final: rackStackFinal };
  await page.waitForTimeout(360);

  const emergencyStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 0, emergency: 'ready' });
    const target = test.makeTarget({ id: 'emergency_refund_target', x: 610, y: 270 });
    play.enemyManager.enemies = [target];
    play.detonateBombBullet(test.makeBomb(), 'emergency_refund');
    const firstDebug = structuredClone(play.lastOrbitalStrikeDebug);
    const duplicateReservation = play.triggerSkyVerdictAfterBomb();
    return {
      state: play.player.skyVerdictEmergencyState,
      duplicateReservation,
      debug: firstDebug
    };
  });
  assert(emergencyStart.state === 'reserved' && emergencyStart.duplicateReservation === false,
    `Emergency reservation was not exclusive: ${JSON.stringify(emergencyStart)}`);
  await page.waitForTimeout(140);
  await page.evaluate(() => {
    const target = window.__game.scenes.play.enemyManager.enemies[0];
    target.active = false;
    target.destroyed = true;
  });
  await page.waitForTimeout(130);
  const emergencyRefund = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      state: play.player.skyVerdictEmergencyState,
      stats: play.player.tacticalFusionStats.skyVerdicts,
      debug: structuredClone(play.lastOrbitalStrikeDebug)
    };
  });
  assert(emergencyRefund.state === 'ready' && emergencyRefund.stats === 0 && emergencyRefund.debug?.refunded,
    `Emergency cancellation did not restore READY: ${JSON.stringify(emergencyRefund)}`);
  await page.waitForTimeout(360);
  const emergencyRetry = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    const target = test.makeTarget({ id: 'emergency_retry_target', x: 620, y: 250 });
    play.enemyManager.enemies = [target];
    const triggered = play.triggerSkyVerdictAfterBomb();
    return { triggered, state: play.player.skyVerdictEmergencyState };
  });
  assert(emergencyRetry.triggered && emergencyRetry.state === 'reserved',
    `Refunded emergency could not be reserved again: ${JSON.stringify(emergencyRetry)}`);
  const emergencyFinalDebug = await waitForStrike(page);
  const emergencyFinal = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      state: play.player.skyVerdictEmergencyState,
      stats: play.player.tacticalFusionStats.skyVerdicts,
      duplicateAfterSpent: play.triggerSkyVerdictAfterBomb()
    };
  });
  assert(emergencyFinal.state === 'spent' && emergencyFinal.stats === 1
    && emergencyFinal.duplicateAfterSpent === false && emergencyFinalDebug?.released,
  `Emergency did not commit SPENT exactly once at impact: ${JSON.stringify({ emergencyFinal, emergencyFinalDebug })}`);
  report.scenarios.emergencyReservation = {
    start: emergencyStart,
    refund: emergencyRefund,
    retry: emergencyRetry,
    final: emergencyFinal,
    finalDebug: emergencyFinalDebug
  };

  const noBombFallbackStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 1, bombShots: 0 });
    const target = test.makeTarget({ id: 'no_bomb_fallback', x: 520, y: 340 });
    play.enemyManager.enemies = [target];
    play.orbitalStrikeTimer = 2490;
    play.updateOrbitalStrike(10);
    return {
      charges: play.player.orbitalStrikeCharges,
      debug: structuredClone(play.lastOrbitalStrikeDebug)
    };
  });
  assert(noBombFallbackStart.charges === 0 && noBombFallbackStart.debug?.fusionId === 'sky_verdict'
    && noBombFallbackStart.debug?.deterministicTarget === true && noBombFallbackStart.debug?.trackTarget === false,
  `No-Bomb fallback cadence regressed: ${JSON.stringify(noBombFallbackStart)}`);
  const noBombFallbackFinal = await waitForStrike(page);
  assert(noBombFallbackFinal?.released && noBombFallbackFinal?.impactTargetId === 'no_bomb_fallback',
    `No-Bomb fallback did not release: ${JSON.stringify(noBombFallbackFinal)}`);
  report.scenarios.noBombFallback = { start: noBombFallbackStart, final: noBombFallbackFinal };

  const standaloneStart = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ skyVerdict: false, charges: 1, emergency: 'unavailable' });
    const target = test.makeTarget({ id: 'standalone_orbital', x: 500, y: 300 });
    play.enemyManager.enemies = [target];
    const triggered = play.triggerOrbitalStrike();
    return {
      triggered,
      charges: play.player.orbitalStrikeCharges,
      debug: structuredClone(play.lastOrbitalStrikeDebug)
    };
  });
  assert(standaloneStart.triggered && standaloneStart.charges === 0
    && standaloneStart.debug?.fusionId === null && standaloneStart.debug?.trackTarget === false,
  `Standalone Orbital reservation changed: ${JSON.stringify(standaloneStart)}`);
  const standaloneFinal = await waitForStrike(page);
  assert(standaloneFinal?.released && standaloneFinal?.completed,
    `Standalone Orbital release regressed: ${JSON.stringify(standaloneFinal)}`);
  report.scenarios.standaloneOrbital = { start: standaloneStart, final: standaloneFinal };

  const experimentIsolation = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const test = window.__skyVerdictCheck;
    test.reset({ charges: 2, experiment: null });
    const ordinary = test.makeTarget({ id: 'experiment_isolation_ordinary', x: 300, y: 500 });
    const boss = test.makeTarget({ id: 'experiment_isolation_boss', kind: 'boss', x: 700, y: 180 });
    play.enemyManager.enemies = [ordinary, boss];
    play.enemyManager.boss = boss;
    const withoutToggle = play.getSkyVerdictSurvivor()?.id;
    play.game.lateGameExperiment = { active: false };
    const disabledToggle = play.getSkyVerdictSurvivor()?.id;
    return { withoutToggle, disabledToggle };
  });
  assert(experimentIsolation.withoutToggle === 'experiment_isolation_boss'
    && experimentIsolation.disabledToggle === experimentIsolation.withoutToggle,
  `Disabled experiment state affected normal-mode targeting: ${JSON.stringify(experimentIsolation)}`);
  report.scenarios.experimentIsolation = experimentIsolation;

  assert(errors.length === 0, `Browser errors observed: ${errors.join(' | ')}`);
  report.ok = true;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[check-sky-verdict-resolution] PASS scenarios=${Object.keys(report.scenarios).length} output=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
