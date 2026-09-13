import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const root = process.cwd();
const exePath = path.resolve('release/desktop/win-unpacked/Nova Swarm.exe');
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR ||
  `test-results/packaged-nova-command-hud-pilot-${stamp()}`);
const framesDir = path.join(outputDir, 'frames');
const components = [
  ['mission', 'Mission Status'],
  ['flawless', 'Compact Side Toast'],
  ['reinforcements', 'Incoming Reinforcements'],
  ['wave_clear', 'Wave Cleared'],
  ['boss_defeated', 'Boss Defeated']
].map(([id, label]) => ({ id, label }));

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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

async function stageDenseCombat(page) {
  await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) throw new Error('Packaged pilot is missing PlayScene');
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    play.clearRunContractStartNudge?.();
    play.completeFirstRunOnboarding?.();
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.clearToastState?.();
    play.clearMayhemReinforcementPresentations?.('packaged_pilot_stage');
    play.bulletManager?.clearAll?.('packaged_pilot_stage');
    manager.clearEnemies?.();
    manager.update = () => {};
    manager.boss = null;
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    game.level = 55;
    manager.level = 55;
    const waves = manager.generateWaves(55);
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
  });
  await page.waitForTimeout(90);
  return page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const manager = play.enemyManager;
    const enemies = manager.enemies.filter((enemy) => enemy?.kind === 'enemy');
    const width = game.getWidth();
    const height = game.getHeight();
    const columns = Math.min(width <= 1280 ? 8 : 9, Math.max(1, Math.ceil(enemies.length / 2)));
    const spacingX = Math.min(
      width <= 1280 ? 116 : 142,
      (width - (width <= 1280 ? 210 : 420)) / Math.max(1, columns - 1)
    );
    enemies.forEach((enemy, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const rowCount = Math.min(columns, enemies.length - row * columns);
      const x = width / 2 - (rowCount - 1) * spacingX / 2 + column * spacingX;
      const y = (height <= 720 ? 270 : 300) + row * (height <= 720 ? 86 : 104);
      enemy.waitingForEntry = false;
      enemy.active = true;
      enemy.state = 'FORMATION';
      enemy.x = x;
      enemy.y = y;
      if (enemy.sprite) {
        enemy.sprite.visible = true;
        enemy.sprite.renderable = true;
        enemy.sprite.alpha = 1;
        enemy.sprite.position.set(x, y);
      }
    });
    manager.clearPendingWaveSpawns?.();
    manager.spawning = false;
    manager.waveSpawnPendingCount = 0;
    play.hud?.update?.();
    return {
      total: enemies.length,
      visible: enemies.filter((enemy) => enemy.active && enemy.sprite?.visible).length,
      screen: { width, height }
    };
  });
}

async function trigger(page, component) {
  await page.evaluate((id) => window.__novaCommandHudPilot.trigger(id, {
    decorativeAccents: true,
    debugGeometry: false,
    route: 'right'
  }), component.id);
  await page.waitForTimeout(
    component.id === 'mission' ? 100 : component.id === 'boss_defeated' ? 420 : 330
  );
}

async function readState(page, component) {
  return page.evaluate((id) => {
    const play = window.__game.scenes.play;
    const display = id === 'mission'
      ? play.hud?.missionPanel
      : id === 'flawless'
        ? play.activeCornerToast
        : id === 'reinforcements'
          ? play.activeMayhemRoutineWarning?.root
          : id === 'wave_clear'
            ? play.activeTopToast
            : play.activeCenterToast;
    return {
      debug: id === 'mission'
        ? display?._debugPriority || null
        : display?._debugWaveClearEffect || display?._debugNovaCommandHud || null,
      bounds: display?.getBounds?.() || null,
      fatal: Boolean(JSON.parse(window.render_game_to_text?.() || '{}')?.overlays?.fatal)
    };
  }, component.id);
}

function validate(component, state) {
  const errors = [];
  const debug = state.debug;
  const frame = component.id === 'mission' ? debug?.frame : debug;
  const expected = {
    mission: 'nova_command_hud_persistent_v1',
    flawless: 'nova_command_hud_side_v1',
    reinforcements: 'nova_command_hud_warning_v1',
    wave_clear: 'nova_command_hud_wave_clear_v2',
    boss_defeated: 'nova_command_hud_major_v1'
  }[component.id];
  if (debug?.visualLanguage !== expected) errors.push(`${component.id}: wrong visual language`);
  if (frame?.mirroredStructure !== true) errors.push(`${component.id}: frame is not mirrored`);
  if (frame?.signatureMotif !== 'paired_reactor_pulse') errors.push(`${component.id}: reactor motif missing`);
  if (state.fatal) errors.push(`${component.id}: fatal overlay detected`);
  const secondaryFloor = Number(debug?.secondaryMinimumFontSize) ||
    Math.min(...[debug?.rewardFontSize, debug?.detailFontSize]
      .map(Number)
      .filter((value) => Number.isFinite(value) && value > 0));
  if (component.id !== 'mission' && (!Number.isFinite(secondaryFloor) || secondaryFloor < 13)) {
    errors.push(`${component.id}: secondary type floor is below 13px`);
  }
  if (component.id === 'wave_clear' &&
      (debug?.componentWidth !== 560 || debug?.componentHeight !== 96)) {
    errors.push('wave_clear: approved 1920x1080 dimensions drifted');
  }
  return errors;
}

async function contactSheet(captures) {
  const cellWidth = 640;
  const cellHeight = 360;
  const labelHeight = 38;
  const columns = 3;
  const rows = 2;
  const layers = [];
  for (let index = 0; index < captures.length; index += 1) {
    const capture = captures[index];
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * (cellHeight + labelHeight);
    layers.push({
      input: await sharp(capture.screenshot).resize(cellWidth, cellHeight).png().toBuffer(),
      left,
      top
    });
    layers.push({
      input: Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}">
        <rect width="100%" height="100%" fill="#03111e"/>
        <line x1="0" y1="1" x2="${cellWidth}" y2="1" stroke="#57eaff"/>
        <text x="14" y="25" fill="#ecfbff" font-family="Segoe UI" font-size="16" font-weight="700">${capture.component.label}</text>
      </svg>`),
      left,
      top: top + cellHeight
    });
  }
  const target = path.join(outputDir, 'packaged-five-component-contact-sheet.png');
  await sharp({
    create: {
      width: cellWidth * columns,
      height: (cellHeight + labelHeight) * rows,
      channels: 4,
      background: '#020711'
    }
  }).composite(layers).png().toFile(target);
  return target;
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

try {
  await waitForCdp(port);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  const pageStartedAt = Date.now();
  while (Date.now() - pageStartedAt < 30000 && !page) {
    page = context.pages().find((candidate) =>
      candidate.url().includes('nova-swarm://') || candidate.url().includes('/index.html'));
    if (!page) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!page) throw new Error('Packaged Nova Swarm renderer target not found');
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const url = new URL(page.url());
  for (const [key, value] of Object.entries({
    desktop: '1',
    autostart: '1',
    controlSmoke: '1',
    offlineLeaderboard: '1',
    novaCommandPilot: '1'
  })) url.searchParams.set(key, value);
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__novaCommandHudPilot?.trigger, null, { timeout: 30000 });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(250);
  const staging = await stageDenseCombat(page);
  if (staging.visible < 12) throw new Error(`Packaged staging created only ${staging.visible} visible enemies`);

  const captures = [];
  const failures = [];
  for (const component of components) {
    await trigger(page, component);
    const state = await readState(page, component);
    const screenshot = path.join(outputDir, `packaged-dense-1920x1080-${component.id}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    captures.push({ component, screenshot, state });
    failures.push(...validate(component, state));
  }
  const contactSheetPath = await contactSheet(captures);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(250);
  await stageDenseCombat(page);
  cdp = await context.newCDPSession(page);
  let frameIndex = 0;
  cdp.on('Page.screencastFrame', async (event) => {
    const framePath = path.join(framesDir, `frame-${String(frameIndex++).padStart(4, '0')}.jpg`);
    writeFileSync(framePath, Buffer.from(event.data, 'base64'));
    await cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 1
  });
  await page.waitForTimeout(200);
  for (const component of components) {
    await page.evaluate((id) => window.__novaCommandHudPilot.trigger(id, {
      decorativeAccents: true,
      debugGeometry: false,
      route: 'right'
    }), component.id);
    await page.waitForTimeout(720);
  }
  await cdp.send('Page.stopScreencast');
  const videoPath = path.join(outputDir, 'packaged-five-component-pilot-60fps.mp4');
  const ffmpeg = spawnSync('ffmpeg', [
    '-y',
    '-framerate', '60',
    '-i', path.join(framesDir, 'frame-%04d.jpg'),
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    videoPath
  ], { encoding: 'utf8' });
  if (ffmpeg.status !== 0) failures.push(`ffmpeg failed: ${ffmpeg.stderr}`);
  if (frameIndex < 30) failures.push(`Packaged video captured only ${frameIndex} frames`);
  failures.push(...pageErrors.map((error) => `page error: ${error}`));
  const report = {
    status: failures.length ? 'failed' : 'passed',
    exePath,
    outputDir,
    staging,
    captures,
    contactSheetPath,
    videoPath,
    videoFrameCount: frameIndex,
    pageErrors,
    consoleErrors,
    failures
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) throw new Error(failures.join('; '));
  console.log(`[packaged-nova-command-hud-pilot] PASS components=${captures.length} frames=${frameIndex} output=${outputDir}`);
} finally {
  await cdp?.send('Page.stopScreencast').catch(() => {});
  if (page) await page.evaluate(() => window.__novaApp?.exitGame?.()).catch(() => {});
  await browser?.close().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 750));
  if (!child.killed) child.kill();
  writeFileSync(path.join(outputDir, 'process.log'), `${stdout.join('')}\n${stderr.join('')}`);
}
