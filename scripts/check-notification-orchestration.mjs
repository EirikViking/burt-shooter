import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const port = await findAvailablePort(Number(process.env.CHECK_PORT) || 4536);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(`test-results/notification-orchestration-${timestamp()}`);
const resolutions = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
  { width: 3440, height: 1440, ultrawide: true }
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findAvailablePort(start) {
  for (let candidate = start; candidate < start + 40; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No notification-check port available from ${start}`);
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
  const command = existsSync(viteEntry) ? process.execPath : 'npx.cmd';
  const args = existsSync(viteEntry)
    ? [viteEntry, '--host', host, '--port', String(port), '--strictPort']
    : ['vite', '--host', host, '--port', String(port), '--strictPort'];
  const server = spawn(command, args, {
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
  throw new Error(`Vite did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find(existsSync);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: resolutions[0] });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  await page.goto(`${baseUrl}/?autostart=1&offlineLeaderboard=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return Boolean(play?.enqueueToast && play?.player && play?.hud);
  }, null, { timeout: 30000 });
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    play.clearToastState();
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
  });

  const arbitration = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const activeTypes = () => play.getToastDebugState().active.map((entry) => entry.type);

    play.enqueueToast('BOSS PHASE 2', {
      type: 'boss_phase', channel: 'transition', slot: 'top', duration: 3000, priority: 4
    });
    play.enqueueToast('BOSS DEFEATED', {
      type: 'boss_defeated', channel: 'major', slot: 'center', duration: 3000, priority: 9
    });
    const bossDefeat = {
      active: activeTypes(),
      queued: play.getToastDebugState().queued,
      missionFocus: play.hud?.notificationFocus,
      hudPresent: Boolean(play.hud),
      focusMethodPresent: typeof play.hud?.setNotificationFocus === 'function'
    };

    play.clearToastState();
    play.showWaveBonusEffect(500, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 3/5' });
    play.enqueueToast('WAVE 3/5: DIVE CHAIN', {
      type: 'wave_start', channel: 'transition', slot: 'top', duration: 1600, priority: 3
    });
    const waveSequence = play.getToastDebugState();

    play.enqueueToast('SECTOR CLEAR', {
      type: 'sector_clear', channel: 'major', slot: 'center', duration: 2500, priority: 9
    });
    const sectorClear = play.getToastDebugState();

    play.clearToastState();
    play.showBossIntro('REDUNDANT NAME', 'REDUNDANT CAPTION');
    const bossIntroChildren = (play.uiOverlay?.children || []).map((child) => child.label);

    return {
      bossDefeat,
      waveSequence,
      sectorClear,
      bossIntroChildren,
      lastBossActivation: play.lastBossActivation
    };
  });

  assert(arbitration.bossDefeat.active.length === 1 && arbitration.bossDefeat.active[0] === 'boss_defeated',
    `Boss Defeated did not supersede boss messages: ${JSON.stringify(arbitration.bossDefeat)}`);
  assert(arbitration.bossDefeat.queued.top === 0, 'Boss transition queue survived Boss Defeated');
  assert(arbitration.bossDefeat.missionFocus === 'major',
    `Mission Status did not yield to major notification: ${JSON.stringify(arbitration.bossDefeat)}`);
  assert(arbitration.waveSequence.active.some((entry) => entry.type === 'wave_clear' && entry.channel === 'transition'),
    `Wave Clear did not own the transition channel: ${JSON.stringify(arbitration.waveSequence)}`);
  assert(arbitration.waveSequence.queued.top === 1,
    `Wave start did not wait behind Wave Clear: ${JSON.stringify(arbitration.waveSequence)}`);
  assert(!arbitration.sectorClear.active.some((entry) => entry.type === 'wave_clear' || entry.type === 'wave_start'),
    `Sector Clear did not cancel wave transitions: ${JSON.stringify(arbitration.sectorClear)}`);
  assert(arbitration.sectorClear.queued.top === 0, 'Sector Clear left queued wave transitions');
  assert(!arbitration.bossIntroChildren.includes('ui_boss_intro_signal'),
    `Redundant post-dossier boss nameplate returned: ${JSON.stringify(arbitration.bossIntroChildren)}`);
  assert(arbitration.lastBossActivation?.redundantNameplateRemoved === true,
    `Boss activation did not record redundant-nameplate removal: ${JSON.stringify(arbitration.lastBossActivation)}`);

  const presentationSequences = await page.evaluate(async () => {
    const play = window.__game.scenes.play;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const activeTypes = () => play.getToastDebugState().active.map((entry) => entry.type);

    play.clearToastState();
    play.enemyManager.state = 'WAVE_BRIEFING';
    play.enemyManager.phase = 'WAVES';
    play.hud.updateMissionStatus();
    const missionBeforeWaveClear = play.hud.missionText.text;
    play.showFlawlessWaveCelebration(1, 400);
    play.showWaveBonusEffect(500, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 3/5' });
    play.enemyManager.currentWaveIndex = Math.min(
      Math.max(0, Number(play.enemyManager.normalWavesTotal || 5) - 1),
      2
    );
    play.hud.updateMissionStatus();
    const waveClearHold = {
      active: activeTypes(),
      cornerActive: play.activeCornerToast?.__toastMeta?.type || null,
      cornerQueued: play.toastCornerQueue.map((entry) => entry.options?.type),
      missionFocus: play.hud.notificationFocus,
      missionText: play.hud.missionText.text,
      missionBeforeWaveClear
    };
    play.dismissToastDisplay(play.activeTopToast, 'top', { reason: 'sequence_probe_exit' });
    await wait(1700);
    play.processToastQueue();
    const waveClearExit = {
      active: activeTypes(),
      cornerActive: play.activeCornerToast?.__toastMeta?.type || null,
      missionFocus: play.hud.notificationFocus
    };

    play.clearToastState();
    play.showBossDefeatedCommandHud();
    await wait(40);
    const bossBeforeSector = {
      active: activeTypes(),
      centerPriority: play.activeCenterToast?.__toastMeta?.priority ?? null,
      centerChannel: play.activeCenterToast?.__toastMeta?.channel || null,
      queuedCenter: play.toastQueue.map((entry) => ({
        type: entry.options?.type,
        priority: entry.priority,
        notBefore: entry.notBefore
      }))
    };
    play.enqueueToast('SECTOR CLEAR\n+1,000', {
      type: 'sector_clear',
      channel: 'major',
      slot: 'center',
      duration: 900,
      priority: 9
    });
    const bossToSectorHold = {
      active: activeTypes(),
      queuedCenter: play.toastQueue.map((entry) => entry.options?.type)
    };
    play.dismissToastDisplay(play.activeCenterToast, 'center', { reason: 'sequence_probe_exit' });
    play.processToastQueue();
    const bossToSectorExit = {
      active: activeTypes(),
      queuedCenter: play.toastQueue.map((entry) => entry.options?.type)
    };

    play.clearToastState();
    play.enemyManager.state = 'LEVEL_COMPLETE';
    play.enemyManager.phase = 'WAVES';
    play.hud.updateMissionStatus();
    play.enqueueToast('SECTOR CLEAR\n+3,200', {
      type: 'sector_clear',
      channel: 'major',
      slot: 'center',
      duration: 1200,
      priority: 9
    });
    const sectorMissionFrozen = play.hud.missionText.text;
    play.enemyManager.state = 'BOSS_GATE';
    play.enemyManager.phase = 'BOSS';
    play.hud.updateMissionStatus();
    const bossSignalDuringSector = play.hud.missionText.text;
    const dossierDelayMs = play.getTransitionMessageDelayMs({ minMs: 900, maxMs: 3600 });
    play.dismissToastDisplay(play.activeCenterToast, 'center', { reason: 'sequence_probe_exit' });
    play.hud.updateMissionStatus();
    const bossSignalAfterSector = play.hud.missionText.text;

    play.clearToastState();
    play.showWaveBonusEffect(500, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 3/5' });
    const wonderDecision = {
      reason: 'sequence_probe',
      sector: 3,
      waveNumber: 3,
      chance: 1,
      roll: 0,
      variant: {
        id: 'sequence_probe_constellation',
        title: 'SEQUENCE PROBE',
        signalClass: 'CONSTELLATION',
        palette: [0x7df9ff, 0xff70d7, 0xffef9a],
        pitchScale: 1
      }
    };
    const wonderDeferred = play.showCabinetWonder(wonderDecision);
    const wonderDuringWaveClear = {
      deferred: wonderDeferred,
      active: Boolean(play.activeCabinetWonder),
      pendingKind: play.pendingCabinetWonder?.kind || null
    };
    play.dismissToastDisplay(play.activeTopToast, 'top', { reason: 'sequence_probe_exit' });
    await wait(180);
    const wonderAfterWaveClear = play.getCabinetWonderDebugState();
    play.clearCabinetWonder('sequence_probe_complete');
    play.pendingCabinetWonder = null;

    play.clearToastState();
    play.triggerPlayerDeathFeedback({ final: false });
    const damageFlash = (play.uiOverlay?.children || [])
      .find((child) => child.label === 'player_damage_edge_flash')?._debugDamageFlash || null;
    await wait(240);

    return {
      waveClearHold,
      waveClearExit,
      bossBeforeSector,
      bossToSectorHold,
      bossToSectorExit,
      sectorToBossSignal: {
        sectorMissionFrozen,
        bossSignalDuringSector,
        bossSignalAfterSector,
        dossierDelayMs
      },
      wonderDuringWaveClear,
      wonderAfterWaveClear,
      damageFlash
    };
  });

  assert(
    presentationSequences.waveClearHold.active.includes('wave_clear') &&
    presentationSequences.waveClearHold.cornerActive === null &&
    presentationSequences.waveClearHold.cornerQueued.includes('flawlessWave') &&
    presentationSequences.waveClearHold.missionFocus === 'transition' &&
    presentationSequences.waveClearHold.missionText === presentationSequences.waveClearHold.missionBeforeWaveClear,
    `Wave Cleared did not hold Mission Status and defer Flawless: ${JSON.stringify(presentationSequences.waveClearHold)}`
  );
  assert(
    presentationSequences.waveClearExit.cornerActive === 'flawlessWave' &&
    presentationSequences.waveClearExit.missionFocus === 'none',
    `Wave Cleared exit did not release the preserved side reward: ${JSON.stringify(presentationSequences.waveClearExit)}`
  );
  assert(
    presentationSequences.bossToSectorHold.active.includes('boss_defeated') &&
    presentationSequences.bossToSectorHold.queuedCenter.includes('sector_clear') &&
    presentationSequences.bossToSectorExit.active.includes('sector_clear'),
    `Boss Defeated did not hand authority to Sector Clear: ${JSON.stringify(presentationSequences)}`
  );
  assert(
    presentationSequences.sectorToBossSignal.bossSignalDuringSector === presentationSequences.sectorToBossSignal.sectorMissionFrozen &&
    presentationSequences.sectorToBossSignal.bossSignalAfterSector.includes('BOSS') &&
    presentationSequences.sectorToBossSignal.dossierDelayMs >= 1100,
    `Sector Clear did not defer Boss Signal/dossier timing: ${JSON.stringify(presentationSequences.sectorToBossSignal)}`
  );
  assert(
    presentationSequences.wonderDuringWaveClear.deferred === true &&
    presentationSequences.wonderDuringWaveClear.active === false &&
    presentationSequences.wonderDuringWaveClear.pendingKind === 'presentation_release' &&
    Boolean(presentationSequences.wonderAfterWaveClear.active) &&
    presentationSequences.wonderAfterWaveClear.last?.scaleReduction === 0.3 &&
    presentationSequences.wonderAfterWaveClear.last?.ambientAlpha >= 0.25 &&
    presentationSequences.wonderAfterWaveClear.last?.ambientAlpha <= 0.35,
    `Constellation presentation did not defer, shrink, and settle: ${JSON.stringify(presentationSequences)}`
  );
  assert(
    presentationSequences.damageFlash?.edgeWeighted === true &&
    presentationSequences.damageFlash.centerAlpha <= 0.1 &&
    presentationSequences.damageFlash.edgeAlpha > presentationSequences.damageFlash.centerAlpha,
    `Damage flash did not preserve strong edges with a clear centre: ${JSON.stringify(presentationSequences.damageFlash)}`
  );

  const directiveTiming = await page.evaluate(async () => {
    const play = window.__game.scenes.play;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const sample = () => ({
      type: play.activeCornerToast?.__toastMeta?.type || null,
      duration: play.activeCornerToast?.__toastMeta?.duration || 0,
      phase: play.activeCornerToast?._debugNovaCommandHud?.motionPhase || null,
      introMs: play.activeCornerToast?.__novaCommandHudFx?.introMs || 0,
      exitMs: play.activeCornerToast?.__novaCommandHudFx?.exitMs || 0,
      alpha: play.activeCornerToast?.alpha ?? null
    });

    play.clearToastState();
    play.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN', momentumBonus: 0 });
    const entrance = sample();
    await wait(190);
    const holdStart = sample();
    await wait(570);
    const holdEnd = sample();
    await wait(170);
    const exit = sample();
    await wait(210);
    const completed = sample();

    play.clearToastState();
    play.showTacticalDirectiveCompletion({ rewardLabel: 'EXTRA RESCAN', momentumBonus: 0 });
    await wait(200);
    play.showMayhemRoutineReinforcementWarning({
      groupCount: 2,
      route: 'side_left',
      warningMs: 700
    });
    await wait(60);
    const interrupted = {
      tacticalActive: Boolean(play.activeMayhemRoutineWarning?.root?.parent),
      activeCornerType: play.activeCornerToast?.__toastMeta?.type || null,
      queuedCornerTypes: play.toastCornerQueue.map((entry) => entry.options?.type)
    };
    await wait(760);
    play.processToastQueue();
    await wait(80);
    const resumed = sample();
    play.clearMayhemReinforcementPresentations('directive_timing_probe_complete');
    play.clearToastState();

    return {
      entrance,
      holdStart,
      holdEnd,
      exit,
      completed,
      interrupted,
      resumed
    };
  });

  assert(
    directiveTiming.entrance.type === 'tacticalDirective' &&
    directiveTiming.entrance.duration === 1100 &&
    directiveTiming.entrance.introMs === 150 &&
    directiveTiming.entrance.exitMs === 220 &&
    [null, 'entrance'].includes(directiveTiming.entrance.phase),
    `Side Directive entrance/timing contract regressed: ${JSON.stringify(directiveTiming)}`
  );
  assert(
    directiveTiming.holdStart.phase === 'hold' &&
    directiveTiming.holdEnd.phase === 'hold' &&
    directiveTiming.holdEnd.alpha === 1 &&
    directiveTiming.entrance.duration - directiveTiming.entrance.introMs - directiveTiming.entrance.exitMs === 730,
    `Side Directive readable hold is not 730ms: ${JSON.stringify(directiveTiming)}`
  );
  assert(
    directiveTiming.exit.phase === 'exit' &&
    directiveTiming.completed.type === null,
    `Side Directive did not use a concise exit within 1.15s: ${JSON.stringify(directiveTiming)}`
  );
  assert(
    directiveTiming.interrupted.tacticalActive === true &&
    directiveTiming.interrupted.activeCornerType === null &&
    directiveTiming.interrupted.queuedCornerTypes.includes('tacticalDirective') &&
    directiveTiming.resumed.type === 'tacticalDirective',
    `Higher-priority tactical alert did not interrupt and resume Side Directive correctly: ${JSON.stringify(directiveTiming)}`
  );

  const resolutionReports = [];
  for (const resolution of resolutions) {
    await page.setViewportSize(resolution);
    await page.waitForTimeout(350);
    const report = await page.evaluate(({ width, height }) => {
      window.__novaI18n?.setLanguagePreference?.('de');
      const game = window.__game;
      const play = game.scenes.play;
      play.clearToastState();
      play.enqueueToast('SEKTORSTATUS AKTUALISIERT // VERSTÄRKUNGSSIGNAL BESTÄTIGT', {
        type: 'side_status',
        channel: 'side',
        slot: 'corner',
        duration: 3000,
        fontSize: 15,
        restrained: true,
        authoredFrame: false
      });
      const side = play.activeCornerToast;
      const sideBounds = play.getToastDisplayBounds(side);
      play.clearToastState();
      const celebration = {
        title: 'RUN CLEAR! OVERRUN UNLOCKED',
        flavor: 'The clear gate opens. The swarm does not applaud; it reloads.',
        statusLine: 'STATUS: CLEAR GATE SECURED // SCORE {score} // HULLS {lives}',
        warning: 'SECTOR {nextSector} WILL NOT BE POLITE',
        footerWarning: 'STRAP IN, PILOT. OVERRUN DOES NOT DO EASY.',
        continueText: "I'M READY - BRING THE SWARM",
        visual: {}
      };
      const card = play.createOverrunInterludeCard({
        width: game.getWidth(),
        height: game.getHeight(),
        milestoneSector: 10,
        nextSector: 11,
        eventKind: 'run_clear',
        celebration,
        clearBonus: 10000,
        livesBonus: 5000,
        milestoneReward: { label: 'TACTICAL RESCAN RESTOCKED' }
      });
      play.uiOverlay.addChild(card);
      const cardBounds = play.getToastDisplayBounds(card);
      const cardDebug = card._debugOverrunVisual;
      play.uiOverlay.removeChild(card);
      card.destroy({ children: true });
      window.__novaI18n?.setLanguagePreference?.('en');
      return {
        requested: { width, height },
        gameSize: { width: game.getWidth(), height: game.getHeight() },
        ultrawideDebug: play.ultrawideAmbienceDebug || null,
        sideBounds,
        cardBounds,
        cardDebug
      };
    }, resolution);
    resolutionReports.push(report);
    const { sideBounds, cardBounds, cardDebug, gameSize } = report;
    assert(sideBounds.x >= 48 && sideBounds.x + sideBounds.width <= gameSize.width - 48,
      `Side notification violated 48px safe margin at ${resolution.width}x${resolution.height}: ${JSON.stringify(sideBounds)}`);
    assert(cardBounds.x >= 48 && cardBounds.y >= 48 &&
      cardBounds.x + cardBounds.width <= gameSize.width - 48 &&
      cardBounds.y + cardBounds.height <= gameSize.height - 48,
    `Overrun modal clipped at ${resolution.width}x${resolution.height}: ${JSON.stringify(cardBounds)}`);
    if (resolution.width === 1920) {
      assert(cardDebug.cardWidth >= 800 && cardDebug.cardWidth <= 900,
        `1920 Overrun width outside 800-900 target: ${JSON.stringify(cardDebug)}`);
      assert(cardDebug.cardHeight >= 430 && cardDebug.cardHeight <= 500,
        `1920 Overrun height outside 430-500 target: ${JSON.stringify(cardDebug)}`);
    }
    assert(cardDebug.visualLanguage === 'restrained_overrun_command_modal_v2' && cardDebug.paused === true,
      `Overrun modal contract mismatch: ${JSON.stringify(cardDebug)}`);
    if (resolution.ultrawide) {
      const ambience = report.ultrawideDebug;
      assert(ambience?.visible === true && ambience?.decorativeOnly === true &&
        ambience?.leftGutterWidth > 0 && ambience?.rightGutterWidth > 0,
      `Ultrawide ambience or protected playfield gutters regressed: ${JSON.stringify(report)}`);
      const activeAspect = Number(ambience.activeRect?.width || 0) / Math.max(1, Number(ambience.activeRect?.height || 0));
      assert(Math.abs(activeAspect - 16 / 9) < 0.02,
        `Ultrawide active playfield lost its 16:9 logical shape: ${JSON.stringify(ambience)}`);
    }
  }

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.enqueueToast('BOSS PHASE 2: PATTERN SHIFT', {
      type: 'boss_phase',
      channel: 'transition',
      slot: 'top',
      duration: 1200,
      priority: 4,
      restrained: true,
      authoredBadge: false,
      signalPlate: true
    });
  });
  await page.waitForTimeout(120);
  const bossPhase = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const bounds = (node) => play.getToastDisplayBounds(node);
    const phase = bounds(play.activeTopToast);
    const mission = bounds(play.hud?.missionPanel);
    const overlaps = Boolean(phase && mission &&
      phase.x < mission.x + mission.width &&
      phase.x + phase.width > mission.x &&
      phase.y < mission.y + mission.height &&
      phase.y + phase.height > mission.y);
    return {
      phase,
      mission,
      overlaps,
      active: play.getToastDebugState().active,
      geometry: play.activeTopToast?._debugNovaCommandHud || null
    };
  });
  assert(bossPhase.active.some((entry) => entry.type === 'boss_phase' && entry.channel === 'transition'),
    `Boss phase warning did not use the transition channel: ${JSON.stringify(bossPhase)}`);
  assert(!bossPhase.overlaps && bossPhase.phase?.height <= 90,
    `Boss phase strip collided with Mission Status or grew too large: ${JSON.stringify(bossPhase)}`);
  assert(
    bossPhase.geometry?.visualLanguage === 'nova_command_hud_tactical_v1' &&
    bossPhase.geometry?.detailFontSize >= 13 &&
    bossPhase.geometry?.componentWidth <= 540,
    `Boss phase warning did not use the restrained tactical family: ${JSON.stringify(bossPhase.geometry)}`
  );
  const bossPhaseScreenshot = path.join(outputDir, 'boss-phase-strip-1920x1080.png');
  await page.screenshot({ path: bossPhaseScreenshot, fullPage: false });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.showFlawlessWaveCelebration(3, 710);
  });
  const flawlessSamples = [];
  for (let index = 0; index < 12; index += 1) {
    await page.waitForTimeout(120);
    const sample = await page.evaluate(() => {
      const play = window.__game.scenes.play;
      const toast = play.activeCornerToast;
      return toast ? {
        bounds: play.getToastDisplayBounds(toast),
        meta: play.describeToastDisplay(toast)
      } : null;
    });
    if (sample) {
      flawlessSamples.push(sample);
      assert(sample.bounds.x >= 48 && sample.bounds.y >= 48 &&
        sample.bounds.x + sample.bounds.width <= 1920 - 48 &&
        sample.bounds.y + sample.bounds.height <= 1080 - 48,
      `Flawless side toast crossed its safe margin: ${JSON.stringify(sample)}`);
    }
  }
  assert(flawlessSamples.length >= 6 && flawlessSamples.every((sample) => sample.meta.channel === 'side'),
    `Flawless Wave did not remain an edge-safe side toast: ${JSON.stringify(flawlessSamples)}`);
  const flawlessScreenshot = path.join(outputDir, 'flawless-side-toast-1920x1080.png');
  await page.evaluate(() => window.__game.scenes.play.showFlawlessWaveCelebration(3, 710));
  await page.waitForTimeout(120);
  await page.screenshot({ path: flawlessScreenshot, fullPage: false });

  const comboCallout = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.enqueueToast('COMBO 50 x4 +2,500', {
      fontSize: 23,
      fill: '#fff3a2',
      slot: 'corner',
      channel: 'combo',
      type: 'combo',
      comboLane: true,
      duration: 1050,
      extraReadTimeMs: 0,
      priority: 2
    });
    const toast = play.activeCornerToast;
    return {
      bounds: play.getToastDisplayBounds(toast),
      meta: play.describeToastDisplay(toast),
      scoreHud: play.getToastDisplayBounds(play.hud?.leftPanel)
    };
  });
  assert(comboCallout?.meta?.channel === 'combo' && comboCallout?.bounds?.x >= 48,
    `Combo callout did not use its dedicated safe left lane: ${JSON.stringify(comboCallout)}`);
  assert(comboCallout.bounds.x + comboCallout.bounds.width < 1920 / 2,
    `Combo callout intruded into the centre lane: ${JSON.stringify(comboCallout)}`);
  assert(!comboCallout.scoreHud ||
    comboCallout.bounds.y >= comboCallout.scoreHud.y + comboCallout.scoreHud.height + 8,
  `Combo callout collided with the score HUD: ${JSON.stringify(comboCallout)}`);
  const comboScreenshot = path.join(outputDir, 'combo-left-lane-1920x1080.png');
  await page.waitForTimeout(120);
  await page.screenshot({ path: comboScreenshot, fullPage: false });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.triggerOverrunClearCelebration({
      nextSector: 11,
      milestoneSector: 10,
      eventKind: 'run_clear',
      clearBonus: 10000,
      livesBonus: 5000,
      celebration: {
        id: 'acceptance',
        title: 'RUN CLEAR! OVERRUN UNLOCKED',
        flavor: 'The clear gate opens. The swarm does not applaud; it reloads.',
        statusLine: 'STATUS: CLEAR GATE SECURED // SCORE {score} // HULLS {lives}',
        warning: 'SECTOR {nextSector} WILL NOT BE POLITE',
        footerWarning: 'STRAP IN, PILOT. OVERRUN DOES NOT DO EASY.',
        continueText: "I'M READY - BRING THE SWARM",
        visual: {}
      },
      milestoneReward: { label: 'CREW DROP: TACTICAL RESCAN RESTOCKED' }
    });
  });
  await page.waitForTimeout(800);
  const screenshot = path.join(outputDir, 'overrun-command-modal-1920x1080.png');
  await page.screenshot({ path: screenshot, fullPage: false });

  const heavyCombat = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const interlude = play.overrunMilestoneInterlude;
    if (!interlude) throw new Error('Overrun interlude missing before dismissal check');
    interlude.confirmReadyAt = 0;
    play.confirmOverrunInterlude('acceptance');
    interlude.startedAt = Date.now() - interlude.durationMs - 1;
    if (interlude.effect) {
      interlude.effect.confirmed = true;
      interlude.effect.startedAt = Date.now() - interlude.effect.durationMs - 1;
    }
    play.updateOverrunMilestoneInterlude(1);
    play.comboCount = 42;
    play.comboMultiplier = 3;
    play.comboTimerMs = play.comboWindowMs || 2400;
    play.hud?.updateComboMeter?.();
    play.enqueueToast('WAVE 1/6: HOSTILES INBOUND', {
      type: 'wave_start',
      channel: 'transition',
      slot: 'top',
      duration: 1200,
      priority: 3,
      restrained: true,
      authoredBadge: false,
      signalPlate: true
    });
    play.showFlawlessWaveCelebration(1, 71);
    const bounds = (node) => play.getToastDisplayBounds(node);
    const state = play.getToastDebugState();
    return {
      state,
      center: bounds(play.activeCenterToast),
      top: bounds(play.activeTopToast),
      corner: bounds(play.activeCornerToast),
      combo: bounds(play.hud?.comboMeterGroup),
      comboDebug: play.hud?.comboMeterGroup?._debugComboMeter || null,
      interludeActive: Boolean(play.overrunMilestoneInterlude?.active)
    };
  });
  assert(heavyCombat.interludeActive === false, 'Overrun modal did not resume gameplay after confirmation');
  assert(!heavyCombat.center, `Heavy combat retained a centre obstruction: ${JSON.stringify(heavyCombat)}`);
  assert(!heavyCombat.state.active.some((entry) => entry.type === 'run_clear'),
    `Giant repeated Overrun banner returned after dismissal: ${JSON.stringify(heavyCombat.state.active)}`);
  assert(heavyCombat.state.active.filter((entry) => entry.channel === 'transition').length <= 1,
    `Heavy combat stacked transition banners: ${JSON.stringify(heavyCombat.state.active)}`);
  assert(heavyCombat.comboDebug?.visible === true,
    `Combo feedback lost its reserved HUD lane: ${JSON.stringify(heavyCombat.comboDebug)}`);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reinforcementLifecycle = await page.evaluate(async () => {
    const play = window.__game.scenes.play;
    play.clearMayhemReinforcementPresentations('test_start');
    play.clearToastState();

    const routeModes = {};
    for (const route of ['side_left', 'side_right', 'bottom', 'mixed_left_right', 'side']) {
      play.showMayhemRoutineReinforcementWarning({
        groupCount: 1,
        route,
        warningMs: 700
      });
      routeModes[route] = play.activeMayhemRoutineWarning?.root?._debugNovaCommandHud?.routeCueMode || null;
      play.clearMayhemReinforcementPresentations(`route_probe_${route}`);
    }

    play.enqueueToast('BOMB BANKED\nRESERVE CHARGE READY', {
      type: 'bombBanked',
      duration: 1800,
      priority: 2,
      maxQueueAgeMs: 5000
    });
    play.enqueueToast('NEAR MISS x2', {
      type: 'nearMiss',
      duration: 900,
      priority: 0,
      maxQueueAgeMs: 120
    });
    const tacticalArbitrationShown = play.showMayhemRoutineReinforcementWarning({
      groupCount: 1,
      route: 'side_left',
      warningMs: 700
    });
    const duringTactical = {
      activeCorner: play.activeCornerToast?.__toastMeta?.type || null,
      queuedCornerTypes: play.toastCornerQueue.map((entry) => entry.options?.type),
      blockUntil: play.getTacticalAlertBlockUntil()
    };
    await new Promise((resolve) => setTimeout(resolve, 850));
    play.processToastQueue();
    const afterTactical = {
      activeCorner: play.activeCornerToast?.__toastMeta?.type || null,
      queuedCornerTypes: play.toastCornerQueue.map((entry) => entry.options?.type),
      tacticalActive: Boolean(play.activeMayhemRoutineWarning?.root?.parent)
    };
    play.clearToastState();

    const firstShown = play.showMayhemRoutineReinforcementWarning({
      groupCount: 1,
      route: 'side_left',
      warningMs: 1200
    });
    const first = play.activeMayhemRoutineWarning;
    const firstMounted = Boolean(first?.root?.parent);

    const secondShown = play.showMayhemRoutineReinforcementWarning({
      groupCount: 1,
      route: 'side_right',
      warningMs: 1200
    });
    const second = play.activeMayhemRoutineWarning;
    const repeatedReplacedCleanly = Boolean(first?.root?.destroyed && second?.root?.parent);

    play.clearToastState();
    play.enqueueToast('BOSS PHASE 2: PATTERN SHIFT', {
      type: 'boss_phase',
      channel: 'transition',
      slot: 'top',
      duration: 1200,
      priority: 4,
      restrained: true,
      authoredBadge: false,
      signalPlate: true
    });
    const afterTacticalShown = play.showMayhemRoutineReinforcementWarning({
      groupCount: 1,
      route: 'bottom',
      warningMs: 1200
    });
    const tacticalStillActive = play.getToastDebugState().active
      .some((entry) => entry.type === 'boss_phase');

    play.clearMayhemReinforcementPresentations('scene_reset');
    const sceneResetClean = play.activeMayhemRoutineWarning === null &&
      play.activeMayhemReinforcementWarning === null;
    const afterSceneResetShown = play.showMayhemRoutineReinforcementWarning({
      groupCount: 1,
      route: 'side_left',
      warningMs: 1200
    });
    const sceneResetHandle = play.activeMayhemRoutineWarning;

    play.clearToastState();
    const gameOverClean = play.activeMayhemRoutineWarning === null &&
      play.activeMayhemReinforcementWarning === null &&
      Boolean(sceneResetHandle?.root?.destroyed);
    const newRunShown = play.showMayhemRoutineReinforcementWarning({
      groupCount: 1,
      route: 'side_right',
      warningMs: 1200
    });
    const newRunHandle = play.activeMayhemRoutineWarning;
    const newRunFresh = Boolean(
      newRunHandle?.root?.parent &&
      newRunHandle !== sceneResetHandle &&
      newRunHandle.root !== sceneResetHandle?.root
    );
    play.clearMayhemReinforcementPresentations('test_complete');

    return {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      afterOverrunShown: firstShown,
      firstMounted,
      secondShown,
      repeatedReplacedCleanly,
      afterTacticalShown,
      tacticalStillActive,
      sceneResetClean,
      afterSceneResetShown,
      gameOverClean,
      newRunShown,
      newRunFresh,
      routeModes,
      tacticalArbitrationShown,
      duringTactical,
      afterTactical,
      finalRoutineState: play.activeMayhemRoutineWarning
    };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  assert(reinforcementLifecycle.reducedMotion === true,
    `Reduced-effects probe did not activate: ${JSON.stringify(reinforcementLifecycle)}`);
  assert(reinforcementLifecycle.afterOverrunShown === true && reinforcementLifecycle.firstMounted === true,
    `Routine warning failed after Overrun dismissal: ${JSON.stringify(reinforcementLifecycle)}`);
  assert(reinforcementLifecycle.secondShown === true && reinforcementLifecycle.repeatedReplacedCleanly === true,
    `Repeated routine warning leaked its prior presentation: ${JSON.stringify(reinforcementLifecycle)}`);
  assert(reinforcementLifecycle.afterTacticalShown === true && reinforcementLifecycle.tacticalStillActive === true,
    `Routine warning failed after another tactical notification: ${JSON.stringify(reinforcementLifecycle)}`);
  assert(reinforcementLifecycle.sceneResetClean === true && reinforcementLifecycle.afterSceneResetShown === true,
    `Routine warning failed across scene reset cleanup: ${JSON.stringify(reinforcementLifecycle)}`);
  assert(reinforcementLifecycle.gameOverClean === true,
    `Game Over cleanup left a routine warning alive: ${JSON.stringify(reinforcementLifecycle)}`);
  assert(reinforcementLifecycle.newRunShown === true && reinforcementLifecycle.newRunFresh === true,
    `New run inherited stale routine-warning state: ${JSON.stringify(reinforcementLifecycle)}`);
  assert(reinforcementLifecycle.finalRoutineState === null,
    `Routine-warning cleanup did not finish: ${JSON.stringify(reinforcementLifecycle)}`);
  assert(
    reinforcementLifecycle.routeModes.side_left === 'left' &&
    reinforcementLifecycle.routeModes.side_right === 'right' &&
    reinforcementLifecycle.routeModes.bottom === 'bottom' &&
    reinforcementLifecycle.routeModes.mixed_left_right === 'symmetric' &&
    reinforcementLifecycle.routeModes.side === 'symmetric',
    `Reinforcement direction cues were not truthful: ${JSON.stringify(reinforcementLifecycle.routeModes)}`
  );
  assert(
    reinforcementLifecycle.tacticalArbitrationShown === true &&
    reinforcementLifecycle.duringTactical.activeCorner === null &&
    reinforcementLifecycle.duringTactical.queuedCornerTypes.includes('bombBanked'),
    `Tactical warning did not suppress and preserve the relevant side toast: ${JSON.stringify(reinforcementLifecycle)}`
  );
  assert(
    reinforcementLifecycle.afterTactical.activeCorner === 'bombBanked' &&
    !reinforcementLifecycle.afterTactical.queuedCornerTypes.includes('nearMiss') &&
    reinforcementLifecycle.afterTactical.tacticalActive === false,
    `Side queue did not resume relevant state and drop stale low-value state: ${JSON.stringify(reinforcementLifecycle)}`
  );

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForFunction(() => (
    Math.round(window.__game?.getWidth?.() || 0) === 1280 &&
    Math.round(window.__game?.getHeight?.() || 0) === 720
  ), null, { timeout: 5000 });
  const routineSideToast = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.enqueueToast('BOMB BANKED\nRESERVE CHARGE READY', {
      type: 'bombBanked',
      duration: 1800,
      priority: 2
    });
    return {
      bounds: play.getToastDisplayBounds(play.activeCornerToast),
      meta: play.describeToastDisplay(play.activeCornerToast),
      geometry: play.activeCornerToast?._debugNovaCommandHud || null
    };
  });
  assert(
    routineSideToast.meta?.visualLanguage === 'nova_command_hud_side_v1' &&
    routineSideToast.geometry?.detailFontSize >= 13 &&
    routineSideToast.bounds?.x >= 48 &&
    routineSideToast.bounds?.x + routineSideToast.bounds?.width <= 1280 - 48,
    `Routine side toast did not preserve Nova Command readability and safe area: ${JSON.stringify(routineSideToast)}`
  );
  await page.waitForTimeout(140);
  const routineSideScreenshot = path.join(outputDir, 'routine-side-toast-1280x720.png');
  await page.screenshot({ path: routineSideScreenshot, fullPage: false });

  const waveStartTransition = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.enqueueToast('WAVE 4/6\nDIVE CHAIN', {
      type: 'wave_start',
      duration: 1200,
      priority: 3
    });
    return {
      bounds: play.getToastDisplayBounds(play.activeTopToast),
      meta: play.describeToastDisplay(play.activeTopToast),
      geometry: play.activeTopToast?._debugNovaCommandHud || null
    };
  });
  assert(
    waveStartTransition.meta?.channel === 'transition' &&
    waveStartTransition.meta?.visualLanguage === 'nova_command_hud_transition_v1' &&
    waveStartTransition.geometry?.detailFontSize >= 13 &&
    waveStartTransition.bounds?.x >= 48 &&
    waveStartTransition.bounds?.x + waveStartTransition.bounds?.width <= 1280 - 48,
    `Wave Start did not use the safe restrained transition family: ${JSON.stringify(waveStartTransition)}`
  );
  await page.waitForTimeout(140);
  const waveStartScreenshot = path.join(outputDir, 'wave-start-transition-1280x720.png');
  await page.screenshot({ path: waveStartScreenshot, fullPage: false });

  await page.setViewportSize({ width: 1920, height: 1080 });
  const sectorClearMajor = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.enqueueToast('WAVE 5/6\nHOSTILES INBOUND', {
      type: 'wave_start',
      duration: 1200,
      priority: 3
    });
    play.showWaveBonusEffect(3200, 'SECTOR CLEAR', {
      subtitle: 'REPAIR +1',
      decorativeAccents: true
    });
    const state = play.getToastDebugState();
    return {
      state,
      bounds: play.getToastDisplayBounds(play.activeCenterToast),
      meta: play.describeToastDisplay(play.activeCenterToast),
      geometry: play.activeCenterToast?._debugNovaCommandHud || null,
      staleWaveState: play.hasNotificationType('wave_start') || play.hasNotificationType('wave_clear')
    };
  });
  assert(
    sectorClearMajor.meta?.type === 'sector_clear' &&
    sectorClearMajor.meta?.channel === 'major' &&
    sectorClearMajor.geometry?.visualLanguage === 'nova_command_hud_major_v1' &&
    sectorClearMajor.geometry?.detailFontSize >= 13 &&
    sectorClearMajor.staleWaveState === false &&
    sectorClearMajor.state.active.filter((entry) => entry.channel === 'major').length === 1,
    `Sector Clear did not own one restrained major channel and clear stale wave state: ${JSON.stringify(sectorClearMajor)}`
  );
  await page.waitForTimeout(160);
  const sectorClearScreenshot = path.join(outputDir, 'sector-clear-major-1920x1080.png');
  await page.screenshot({ path: sectorClearScreenshot, fullPage: false });

  const bossDefeatExplosion = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const manager = play.enemyManager;
    play.clearToastState();
    play.enqueueToast('BOSS PHASE 3', {
      type: 'boss_phase',
      duration: 1200,
      priority: 5
    });
    play.showMayhemReinforcementStormWarning({
      groupCount: 3,
      boss: true,
      superStorm: false,
      warningMs: 1200
    });
    manager.boss = {
      x: window.__game.getWidth() / 2,
      y: window.__game.getHeight() * 0.28,
      color: 0xff55d9,
      profile: {
        id: 'gate4_lifecycle_boss',
        name: 'GATE FOUR WARDEN',
        title: 'LIFECYCLE PROBE',
        accent: 0xff55d9,
        index: 3
      }
    };
    play.showBossCelebration({ level: 30, type: 'GATE4_LIFECYCLE_BOSS' });
    return {
      lifecycle: play.lastBossDefeatedLifecycle,
      impact: play.lastBossDeathImpact,
      bossDefeatedActiveImmediately: play.hasNotificationType('boss_defeated'),
      warningStateImmediately: {
        bossPhase: play.hasNotificationType('boss_phase'),
        routine: Boolean(play.activeMayhemRoutineWarning?.root?.parent),
        storm: Boolean(
          play.activeMayhemReinforcementWarning?.root?.parent ||
          play.activeMayhemReinforcementWarning?.overlay?.parent
        )
      }
    };
  });
  assert(
    bossDefeatExplosion.impact?.realParticleSequence === true &&
    bossDefeatExplosion.impact?.burstCount >= 8 &&
    bossDefeatExplosion.bossDefeatedActiveImmediately === false &&
    Object.values(bossDefeatExplosion.warningStateImmediately).every((value) => value === false) &&
    bossDefeatExplosion.lifecycle?.warningsClearedBeforeEntry === true,
    `Boss Defeated did not begin with a clean genuine explosion phase: ${JSON.stringify(bossDefeatExplosion)}`
  );
  await page.waitForTimeout(340);
  const bossDefeatEntry = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      lifecycle: play.lastBossDefeatedLifecycle,
      state: play.getToastDebugState(),
      geometry: play.activeCenterToast?._debugNovaCommandHud || null
    };
  });
  assert(
    bossDefeatEntry.lifecycle?.entryAt > bossDefeatEntry.lifecycle?.explosionAt &&
    bossDefeatEntry.lifecycle?.displayMountedAtEntry === true &&
    Object.values(bossDefeatEntry.lifecycle?.warningStateAtEntry || {}).every((value) => value === false) &&
    bossDefeatEntry.state.active.filter((entry) => entry.type === 'boss_defeated').length === 1 &&
    bossDefeatEntry.geometry?.detailFontSize >= 13,
    `Boss Defeated entry/hold phase was not clean: ${JSON.stringify(bossDefeatEntry)}`
  );
  const bossDefeatLifecycleScreenshot = path.join(outputDir, 'boss-defeated-real-lifecycle-1920x1080.png');
  await page.screenshot({ path: bossDefeatLifecycleScreenshot, fullPage: false });
  await page.waitForTimeout(1700);
  const bossDefeatPost = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      lifecycle: play.lastBossDefeatedLifecycle,
      activeTypes: play.getToastDebugState().active.map((entry) => entry.type),
      queued: play.getToastDebugState().queued
    };
  });
  assert(
    bossDefeatPost.lifecycle?.exitAt > bossDefeatPost.lifecycle?.entryAt &&
    bossDefeatPost.lifecycle?.postStateClean === true &&
    !bossDefeatPost.activeTypes.some((type) => [
      'boss_defeated',
      'boss_phase',
      'boss_warning',
      'boss_refuel',
      'fuel_ship',
      'reinforcement_warning'
    ].includes(type)),
    `Boss Defeated left warning or major-event residue: ${JSON.stringify(bossDefeatPost)}`
  );

  assert(pageErrors.length === 0, `Page errors: ${pageErrors.join('; ')}`);

  const result = {
    ok: true,
    baseUrl,
    arbitration,
    presentationSequences,
    resolutionReports,
    bossPhase,
    bossPhaseScreenshot,
    flawlessSamples,
    flawlessScreenshot,
    comboCallout,
    comboScreenshot,
    heavyCombat,
    reinforcementLifecycle,
    routineSideToast,
    routineSideScreenshot,
    waveStartTransition,
    waveStartScreenshot,
    sectorClearMajor,
    sectorClearScreenshot,
    bossDefeatExplosion,
    bossDefeatEntry,
    bossDefeatPost,
    bossDefeatLifecycleScreenshot,
    screenshot,
    pageErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(`[notification-orchestration] PASS resolutions=${resolutions.length} screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
