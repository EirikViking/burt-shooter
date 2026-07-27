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
        flavor: 'THE CLEAR GATE OPENS. THE SWARM DOES NOT APPLAUD; IT RELOADS.',
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
      active: play.getToastDebugState().active
    };
  });
  assert(bossPhase.active.some((entry) => entry.type === 'boss_phase' && entry.channel === 'transition'),
    `Boss phase warning did not use the transition channel: ${JSON.stringify(bossPhase)}`);
  assert(!bossPhase.overlaps && bossPhase.phase?.height <= 90,
    `Boss phase strip collided with Mission Status or grew too large: ${JSON.stringify(bossPhase)}`);
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
        flavor: 'THE CLEAR GATE OPENS.',
        statusLine: 'STATUS: CLEAR GATE SECURED // SCORE {score} // HULLS {lives}',
        warning: 'SECTOR {nextSector} WILL NOT BE POLITE',
        footerWarning: 'STRAP IN, PILOT.',
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

  assert(pageErrors.length === 0, `Page errors: ${pageErrors.join('; ')}`);

  const result = {
    ok: true,
    baseUrl,
    arbitration,
    resolutionReports,
    bossPhase,
    bossPhaseScreenshot,
    flawlessSamples,
    flawlessScreenshot,
    comboCallout,
    comboScreenshot,
    heavyCombat,
    screenshot,
    pageErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(`[notification-orchestration] PASS resolutions=${resolutions.length} screenshot=${screenshot}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
