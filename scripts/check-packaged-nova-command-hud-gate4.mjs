import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const exePath = path.resolve('release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR ||
  `test-results/packaged-nova-command-hud-gate4-${stamp()}`);
const framesDir = path.join(outputDir, 'frames');

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForCdp(port) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return;
    } catch {
      // Packaged Chromium has not exposed the endpoint yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Packaged CDP endpoint did not start on port ${port}`);
}

async function stageDenseCombat(page, level = 55) {
  await page.evaluate((targetLevel) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) throw new Error('PlayScene unavailable');
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    play.clearRunContractStartNudge?.();
    play.completeFirstRunOnboarding?.();
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.clearToastState?.();
    play.bulletManager?.clearAll?.('gate4_stage');
    manager.clearEnemies?.();
    manager.update = () => {};
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    manager.boss = null;
    game.level = targetLevel;
    manager.level = targetLevel;
    const waves = manager.generateWaves(targetLevel);
    const config = waves.find((entry) => entry?.type !== 'BOSS') || waves[0];
    manager.currentWaveIndex = Math.min(5, waves.length - 1);
    manager.normalWavesTotal = Math.max(1, waves.length);
    play.recordThreatDiscovery = () => false;
    play.maybePromoteAceEnemy = () => false;
    play.maybeApplyRivalWingEnemy = () => false;
    manager.maybeSpawnRareChaosVisitor = () => null;
    for (let group = 0; group < 6; group += 1) {
      manager.spawnWave({
        ...config,
        count: 3,
        allowConcurrentSpawn: true,
        dangerMidShipIds: [],
        eliteMiddleShipId: null,
        multiEliteMiddleShipIds: [],
        forcedThreatActionIds: []
      });
    }
  }, level);
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    const enemies = manager.enemies.filter((enemy) => enemy?.kind === 'enemy');
    const width = game.getWidth();
    const height = game.getHeight();
    const columns = width <= 1280 ? 8 : 9;
    enemies.forEach((enemy, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x = 170 + column * ((width - 340) / Math.max(1, columns - 1));
      const y = (height <= 720 ? 270 : 300) + row * (height <= 720 ? 84 : 104);
      enemy.waitingForEntry = false;
      enemy.active = true;
      enemy.state = 'FORMATION';
      enemy.x = x;
      enemy.y = y;
      enemy.sprite?.position?.set?.(x, y);
      if (enemy.sprite) {
        enemy.sprite.visible = true;
        enemy.sprite.alpha = 1;
      }
      if (index < 14) {
        const shots = enemy.shoot?.(play.player?.x || width / 2, play.player?.y || height * 0.84);
        for (const bullet of (Array.isArray(shots) ? shots : [shots]).filter(Boolean)) {
          play.bulletManager?.addEnemyBullet?.(bullet);
        }
      }
    });
    for (let index = 0; index < 10; index += 1) {
      play.particleManager?.createExplosion?.(
        width * (0.2 + (index % 5) * 0.15),
        height * (0.3 + Math.floor(index / 5) * 0.16),
        index % 2 ? 0x57eaff : 0xff765c,
        0.45
      );
    }
    manager.clearPendingWaveSpawns?.();
    manager.spawning = false;
    play.hud?.update?.();
    return {
      enemies: enemies.filter((enemy) => enemy.active && enemy.sprite?.visible).length,
      bullets: play.bulletManager?.enemyBullets?.filter((bullet) => bullet?.active !== false).length || 0,
      effects: 10,
      screen: { width, height }
    };
  });
}

async function readState(page) {
  return page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    return {
      active: play?.getToastDebugState?.().active || [],
      queued: play?.getToastDebugState?.().queued || null,
      tactical: {
        routine: Boolean(play?.activeMayhemRoutineWarning?.root?.parent),
        storm: Boolean(
          play?.activeMayhemReinforcementWarning?.root?.parent ||
          play?.activeMayhemReinforcementWarning?.overlay?.parent
        )
      },
      bossLifecycle: play?.lastBossDefeatedLifecycle || null,
      gameOver: Boolean(play?.gameOverSequenceStarted),
      overrun: Boolean(play?.overrunMilestoneInterlude?.active),
      fatal: Boolean(JSON.parse(window.render_game_to_text?.() || '{}')?.overlays?.fatal)
    };
  });
}

if (!existsSync(exePath)) throw new Error(`Packaged executable not found: ${exePath}`);
mkdirSync(framesDir, { recursive: true });
const port = await openPort();
const child = spawn(exePath, ['--windowed', `--remote-debugging-port=${port}`], {
  cwd: root,
  windowsHide: true,
  env: { ...process.env, NOVA_SWARM_USER_DATA_DIR: path.join(outputDir, 'userData') },
  stdio: ['ignore', 'pipe', 'pipe']
});
const stdout = [];
const stderr = [];
child.stdout.on('data', (chunk) => stdout.push(String(chunk)));
child.stderr.on('data', (chunk) => stderr.push(String(chunk)));

let browser;
let page;
let cdp;
const pageErrors = [];
const consoleErrors = [];
const screenshots = {};
const states = {};

try {
  await waitForCdp(port);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000 && !page) {
    page = context.pages().find((candidate) =>
      candidate.url().includes('nova-swarm://') || candidate.url().includes('/index.html'));
    if (!page) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(page, 'Packaged renderer target not found');
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const runUrl = new URL(page.url());
  for (const [key, value] of Object.entries({
    desktop: '1',
    autostart: '1',
    controlSmoke: '1',
    offlineLeaderboard: '1',
    novaCommandPilot: '1'
  })) runUrl.searchParams.set(key, value);
  await page.goto(runUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__novaCommandHudPilot?.trigger, null, { timeout: 30000 });

  await page.setViewportSize({ width: 1920, height: 1080 });
  states.dense1920 = await stageDenseCombat(page);
  assert(states.dense1920.enemies >= 12 && states.dense1920.bullets >= 8,
    `Dense 1920 staging was insufficient: ${JSON.stringify(states.dense1920)}`);
  screenshots.dense1920 = path.join(outputDir, '01-dense-1920x1080.png');
  await page.screenshot({ path: screenshots.dense1920, fullPage: false });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.enqueueToast('BOMB BANKED\nRESERVE CHARGE READY', {
      type: 'bombBanked', duration: 1800, priority: 2, maxQueueAgeMs: 5000
    });
    play.enqueueToast('NEAR MISS x2', {
      type: 'nearMiss', duration: 900, priority: 0, maxQueueAgeMs: 120
    });
    play.showMayhemRoutineReinforcementWarning({
      groupCount: 2, route: 'side_right', warningMs: 900
    });
  });
  await page.waitForTimeout(180);
  states.sideSuppression1920 = await readState(page);
  assert(!states.sideSuppression1920.active.some((entry) => entry.channel === 'side') &&
    states.sideSuppression1920.queued.corner >= 1 && states.sideSuppression1920.tactical.routine,
  `Side suppression failed: ${JSON.stringify(states.sideSuppression1920)}`);
  screenshots.sideSuppression1920 = path.join(outputDir, '02-side-queue-reinforcement-suppression-1920x1080.png');
  await page.screenshot({ path: screenshots.sideSuppression1920, fullPage: false });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__game.scenes.play.processToastQueue());
  await page.waitForTimeout(120);
  states.sideResume1920 = await readState(page);
  assert(states.sideResume1920.active.some((entry) => entry.type === 'bombBanked') &&
    !states.sideResume1920.tactical.routine, `Side resume failed: ${JSON.stringify(states.sideResume1920)}`);

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.showWaveBonusEffect(1800, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 4/6' });
    play.enqueueToast('WAVE 4/6\nDIVE CHAIN', { type: 'wave_start', duration: 1200, priority: 3 });
  });
  await page.waitForTimeout(220);
  states.waveChainHold1920 = await readState(page);
  assert(states.waveChainHold1920.active.some((entry) => entry.type === 'wave_clear') &&
    states.waveChainHold1920.queued.top === 1, `Wave chain ordering failed: ${JSON.stringify(states.waveChainHold1920)}`);
  screenshots.waveChain1920 = path.join(outputDir, '03-wave-clear-before-wave-start-1920x1080.png');
  await page.screenshot({ path: screenshots.waveChain1920, fullPage: false });
  await page.waitForTimeout(1250);
  states.waveChainResume1920 = await readState(page);
  assert(states.waveChainResume1920.active.some((entry) => entry.type === 'wave_start'),
    `Wave Start did not follow Wave Clear: ${JSON.stringify(states.waveChainResume1920)}`);

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.showWaveBonusEffect(3200, 'SECTOR CLEAR', { subtitle: 'BOSS GATE NEXT' });
  });
  await page.waitForTimeout(260);
  screenshots.sectorClear1920 = path.join(outputDir, '04-sector-clear-1920x1080.png');
  await page.screenshot({ path: screenshots.sectorClear1920, fullPage: false });
  await page.waitForTimeout(1550);
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.enemyManager.boss = {
      x: window.__game.getWidth() / 2,
      y: window.__game.getHeight() * 0.28,
      color: 0xff55d9,
      profile: {
        id: 'gate4_packaged_boss',
        name: 'NOVA WARDEN',
        title: 'SECTOR EXECUTIONER',
        accent: 0xff55d9,
        index: 3
      }
    };
    play.showBossTaunt('boss_spawn', { allowFallback: true });
  });
  await page.waitForTimeout(380);
  screenshots.bossIntro1920 = path.join(outputDir, '05-sector-to-boss-intro-1920x1080.png');
  await page.screenshot({ path: screenshots.bossIntro1920, fullPage: false });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.cancelNotificationTypes(['boss_warning', 'boss_intro'], 'gate4_competing_warning_stage');
    play.dismissBossDossier?.('gate4_competing_warning_stage');
    play.enqueueToast('BOSS PHASE 3', { type: 'boss_phase', duration: 1200, priority: 5 });
    play.enqueueToast('BOSS REFUELED +800 HP', { type: 'boss_refuel', duration: 1000, priority: 4 });
    play.showMayhemReinforcementStormWarning({ groupCount: 3, boss: true, warningMs: 1200 });
    play.showBossCelebration({ level: 30, type: 'GATE4_PACKAGED_BOSS' });
  });
  await page.waitForTimeout(100);
  states.bossExplosion1920 = await readState(page);
  assert(states.bossExplosion1920.bossLifecycle?.deathImpact?.realParticleSequence &&
    !states.bossExplosion1920.active.some((entry) => entry.type === 'boss_defeated') &&
    !states.bossExplosion1920.tactical.storm,
  `Boss explosion phase was not clean: ${JSON.stringify(states.bossExplosion1920)}`);
  screenshots.bossExplosion1920 = path.join(outputDir, '06-boss-explosion-before-hud-1920x1080.png');
  await page.screenshot({ path: screenshots.bossExplosion1920, fullPage: false });
  await page.waitForTimeout(260);
  states.bossEntry1920 = await readState(page);
  assert(states.bossEntry1920.active.filter((entry) => entry.type === 'boss_defeated').length === 1 &&
    Object.values(states.bossEntry1920.bossLifecycle?.warningStateAtEntry || {}).every((value) => value === false),
  `Boss Defeated entry retained warnings: ${JSON.stringify(states.bossEntry1920)}`);
  screenshots.bossEntry1920 = path.join(outputDir, '07-boss-defeated-entry-hold-1920x1080.png');
  await page.screenshot({ path: screenshots.bossEntry1920, fullPage: false });
  await page.waitForTimeout(1700);
  states.bossPost1920 = await readState(page);
  assert(states.bossPost1920.bossLifecycle?.postStateClean === true,
    `Boss Defeated post-state was not clean: ${JSON.stringify(states.bossPost1920)}`);

  await page.setViewportSize({ width: 1280, height: 720 });
  states.dense1280 = await stageDenseCombat(page);
  assert(states.dense1280.enemies >= 12 && states.dense1280.bullets >= 8,
    `Dense 1280 staging was insufficient: ${JSON.stringify(states.dense1280)}`);
  cdp = await context.newCDPSession(page);
  let frameIndex = 0;
  cdp.on('Page.screencastFrame', async (event) => {
    writeFileSync(
      path.join(framesDir, `frame-${String(frameIndex++).padStart(4, '0')}.jpg`),
      Buffer.from(event.data, 'base64')
    );
    await cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg', quality: 92, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1
  });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.enqueueToast('BOMB BANKED\nRESERVE CHARGE READY', {
      type: 'bombBanked', duration: 1800, priority: 2
    });
    play.showMayhemRoutineReinforcementWarning({
      groupCount: 2, route: 'side_left', warningMs: 900
    });
  });
  await page.waitForTimeout(1100);
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.showWaveBonusEffect(1800, 'WAVE CLEARED!', { subtitle: 'NEXT WAVE 4/6' });
    play.enqueueToast('WAVE 4/6\nDIVE CHAIN', { type: 'wave_start', duration: 1200, priority: 3 });
  });
  await page.waitForTimeout(1650);
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.showWaveBonusEffect(3200, 'SECTOR CLEAR', { subtitle: 'BOSS GATE NEXT' });
  });
  await page.waitForTimeout(1750);
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.enemyManager.boss = {
      x: window.__game.getWidth() / 2,
      y: window.__game.getHeight() * 0.28,
      color: 0xff55d9,
      profile: {
        id: 'gate4_video_boss',
        name: 'NOVA WARDEN',
        title: 'SECTOR EXECUTIONER',
        accent: 0xff55d9,
        index: 3
      }
    };
    play.enqueueToast('BOSS PHASE 3', { type: 'boss_phase', duration: 1200, priority: 5 });
    play.showMayhemReinforcementStormWarning({ groupCount: 3, boss: true, warningMs: 1200 });
    play.showBossCelebration({ level: 30, type: 'GATE4_VIDEO_BOSS' });
  });
  await page.waitForTimeout(2200);

  await page.evaluate(async () => {
    await window.__novaI18n?.setLanguagePreference?.('de');
    const play = window.__game.scenes.play;
    play.clearToastState();
    play.enqueueToast(
      'SEKTORSTATUS AKTUALISIERT\nVERSTAERKUNGSSIGNAL BESTAETIGT UND RESERVEENERGIE BEREIT',
      { type: 'side_status', duration: 1800, priority: 2 }
    );
  });
  await page.waitForTimeout(900);
  states.longGerman1280 = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    return {
      geometry: play.activeCornerToast?._debugNovaCommandHud || null,
      bounds: play.getToastDisplayBounds(play.activeCornerToast)
    };
  });
  assert(states.longGerman1280.geometry?.detailFontSize >= 13 &&
    states.longGerman1280.bounds?.x >= 48 &&
    states.longGerman1280.bounds?.x + states.longGerman1280.bounds?.width <= 1280 - 48,
  `Long German side toast failed: ${JSON.stringify(states.longGerman1280)}`);
  screenshots.longGerman1280 = path.join(outputDir, '08-long-german-1280x720.png');
  await page.screenshot({ path: screenshots.longGerman1280, fullPage: false });

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.triggerOverrunClearCelebration({
      nextSector: 11,
      milestoneSector: 10,
      eventKind: 'run_clear',
      clearBonus: 10000,
      livesBonus: 5000,
      celebration: {
        id: 'gate4',
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
  states.overrunModal1280 = await readState(page);
  assert(states.overrunModal1280.overrun, 'Overrun modal did not pause');
  screenshots.overrun1280 = path.join(outputDir, '09-overrun-modal-1280x720.png');
  await page.screenshot({ path: screenshots.overrun1280, fullPage: false });
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const interlude = play.overrunMilestoneInterlude;
    interlude.confirmReadyAt = 0;
    play.confirmOverrunInterlude('gate4');
    interlude.startedAt = Date.now() - interlude.durationMs - 1;
    if (interlude.effect) {
      interlude.effect.confirmed = true;
      interlude.effect.startedAt = Date.now() - interlude.effect.durationMs - 1;
    }
    play.updateOverrunMilestoneInterlude(1);
    play.enqueueToast('WAVE 1/6\nHOSTILES INBOUND', { type: 'wave_start', duration: 1200, priority: 3 });
  });
  await page.waitForTimeout(700);
  states.overrunResume1280 = await readState(page);
  assert(!states.overrunResume1280.overrun &&
    states.overrunResume1280.active.some((entry) => entry.type === 'wave_start'),
  `Overrun did not resume cleanly: ${JSON.stringify(states.overrunResume1280)}`);

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.showMayhemRoutineReinforcementWarning({ groupCount: 2, route: 'mixed', warningMs: 1200 });
    play.beginGameOverSequence();
  });
  await page.waitForTimeout(750);
  states.gameOver1280 = await readState(page);
  assert(states.gameOver1280.gameOver &&
    !states.gameOver1280.tactical.routine &&
    states.gameOver1280.active.length === 0,
  `Game Over retained notification state: ${JSON.stringify(states.gameOver1280)}`);
  screenshots.gameOver1280 = path.join(outputDir, '10-game-over-cleanup-1280x720.png');
  await page.screenshot({ path: screenshots.gameOver1280, fullPage: false });

  await page.goto(runUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__novaCommandHudPilot?.trigger, null, { timeout: 30000 });
  await page.waitForTimeout(700);
  states.newRun1280 = await readState(page);
  assert(!states.newRun1280.gameOver && !states.newRun1280.overrun &&
    !states.newRun1280.tactical.routine && !states.newRun1280.tactical.storm &&
    states.newRun1280.bossLifecycle === null &&
    !states.newRun1280.active.some((entry) => [
      'boss_defeated',
      'boss_phase',
      'boss_warning',
      'boss_refuel',
      'fuel_ship',
      'reinforcement_warning',
      'overrun_unlocked',
      'overrun_active'
    ].includes(entry.type)),
  `New run inherited notification state: ${JSON.stringify(states.newRun1280)}`);
  screenshots.newRun1280 = path.join(outputDir, '11-new-run-clean-1280x720.png');
  await page.screenshot({ path: screenshots.newRun1280, fullPage: false });
  await cdp.send('Page.stopScreencast');

  const videoPath = path.join(outputDir, 'nova-command-hud-gate4-packaged-60fps.mp4');
  const ffmpeg = spawnSync('ffmpeg', [
    '-y', '-framerate', '60',
    '-i', path.join(framesDir, 'frame-%04d.jpg'),
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', videoPath
  ], { encoding: 'utf8' });
  assert(ffmpeg.status === 0, `ffmpeg failed: ${ffmpeg.stderr}`);
  assert(frameIndex >= 450, `Packaged video captured only ${frameIndex} frames`);
  assert(pageErrors.length === 0, `Packaged page errors: ${pageErrors.join(' | ')}`);

  const report = {
    status: 'passed',
    exePath,
    outputDir,
    screenshots,
    states,
    videoPath,
    videoFrameCount: frameIndex,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[packaged-nova-command-hud-gate4] PASS frames=${frameIndex} output=${outputDir}`);
} finally {
  await cdp?.send('Page.stopScreencast').catch(() => {});
  if (page) await page.evaluate(() => window.__novaApp?.exitGame?.()).catch(() => {});
  await browser?.close().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 750));
  if (!child.killed) child.kill();
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, 'process.log'), `${stdout.join('')}\n${stderr.join('')}`);
}
