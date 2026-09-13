import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findPort(4580));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const variant = String(process.env.PILOT_VARIANT || 'proposed').toLowerCase();
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR ||
  `test-results/nova-command-hud-pilot-${variant}-${stamp()}`);
const components = [
  ['mission', 'Mission Status'],
  ['flawless', 'Flawless Streak'],
  ['reinforcements', 'Incoming Reinforcements'],
  ['wave_clear', 'Wave Cleared'],
  ['boss_defeated', 'Boss Defeated']
].map(([id, label]) => ({ id, label }));
const fullProfiles = [
  { id: 'normal-1920x1080-en', width: 1920, height: 1080, locale: 'en', density: 'normal', reduced: false },
  { id: 'dense-1920x1080-en', width: 1920, height: 1080, locale: 'en', density: 'dense', reduced: false },
  { id: 'normal-1280x720-en', width: 1280, height: 720, locale: 'en', density: 'normal', reduced: false },
  { id: 'dense-1280x720-en', width: 1280, height: 720, locale: 'en', density: 'dense', reduced: false },
  { id: 'dense-1280x720-de', width: 1280, height: 720, locale: 'de', density: 'dense', reduced: false },
  { id: 'dense-1280x720-en-reduced', width: 1280, height: 720, locale: 'en', density: 'dense', reduced: true }
];
const profiles = variant === 'baseline'
  ? fullProfiles.filter(({ id }) => id === 'dense-1920x1080-en' || id === 'dense-1280x720-en')
  : fullProfiles;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function findPort(start) {
  for (let candidate = start; candidate < start + 60; candidate += 1) {
    const available = await new Promise((resolve) => {
      const server = createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => server.close(() => resolve(true)));
      server.listen(candidate, host);
    });
    if (available) return candidate;
  }
  throw new Error(`No pilot preview port available from ${start}`);
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
  const server = spawn(process.execPath, [vite, '--force', '--host', host, '--port', String(port), '--strictPort'], {
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
  throw new Error(`Pilot preview server did not start at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find(existsSync);
}

async function stage(page, profile) {
  await page.evaluate((settings) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!play || !manager) throw new Error('Pilot preview is missing PlayScene');
    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    play.clearRunContractStartNudge?.();
    play.completeFirstRunOnboarding?.();
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.clearToastState?.();
    play.clearMayhemReinforcementPresentations?.('pilot_stage');
    play.bulletManager?.clearAll?.('pilot_stage');
    manager.clearEnemies?.();
    manager.update = () => {};
    manager.boss = null;
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';
    const level = settings.density === 'dense' ? 55 : 12;
    game.level = level;
    manager.level = level;
    const waves = manager.generateWaves(level);
    const config = waves.find((entry) => entry?.type !== 'BOSS') || waves[0];
    manager.currentWaveIndex = Math.min(settings.density === 'dense' ? 5 : 2, waves.length - 1);
    manager.normalWavesTotal = Math.max(1, waves.length);
    play.recordThreatDiscovery = () => false;
    play.maybePromoteAceEnemy = () => false;
    play.maybeApplyRivalWingEnemy = () => false;
    manager.maybeSpawnRareChaosVisitor = () => null;
    for (let group = 0; group < (settings.density === 'dense' ? 6 : 3); group += 1) {
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
    play.hud?.update?.();
  }, profile);
  await page.waitForTimeout(80);
  await page.evaluate((settings) => {
    const play = window.__game?.scenes?.play;
    const manager = play?.enemyManager;
    const enemies = (manager?.enemies || []).filter((enemy) => enemy?.kind === 'enemy');
    const columns = settings.density === 'dense'
      ? Math.min(settings.width <= 1280 ? 8 : 9, Math.ceil(enemies.length / 2))
      : Math.min(5, Math.ceil(enemies.length / 2));
    const spacingX = Math.min(
      settings.width <= 1280 ? 116 : 142,
      (settings.width - (settings.width <= 1280 ? 210 : 420)) / Math.max(1, columns - 1)
    );
    enemies.forEach((enemy, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const rowCount = Math.min(columns, enemies.length - row * columns);
      const x = settings.width / 2 - (rowCount - 1) * spacingX / 2 + column * spacingX;
      const y = (settings.height <= 720 ? 270 : 300) + row * (settings.height <= 720 ? 86 : 104);
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
    manager?.clearPendingWaveSpawns?.();
    if (manager) {
      manager.spawning = false;
      manager.waveSpawnPendingCount = 0;
    }
    play?.hud?.update?.();
  }, profile);
}

async function trigger(page, component, profile) {
  await page.evaluate(({ id, reduced }) => {
    const play = window.__game?.scenes?.play;
    const preview = window.__novaCommandHudPilot;
    if (preview) {
      preview.trigger(id, {
        reducedMotion: reduced,
        decorativeAccents: true,
        debugGeometry: false,
        route: 'right'
      });
      return;
    }
    play.clearToastState?.();
    play.clearMayhemReinforcementPresentations?.('pilot_baseline');
    if (id === 'mission') play.hud?.updateMissionStatus?.();
    if (id === 'flawless') play.showFlawlessWaveCelebration?.(3, 710);
    if (id === 'reinforcements') {
      play.showMayhemRoutineReinforcementWarning?.({ groupCount: 3, route: 'right', warningMs: 1300 });
    }
    if (id === 'wave_clear') {
      play.showWaveBonusEffect?.(1500, 'WAVE CLEARED!', {
        subtitle: 'INCOMING WAVE 7/8',
        decorativeAccents: true
      });
    }
    if (id === 'boss_defeated') {
      play.showToast?.('+1,000  HULL REPAIR +1', {
        title: 'BOSS DEFEATED',
        titleFontSize: 28,
        fontSize: 18,
        fill: '#fff3a2',
        stroke: '#330000',
        strokeThickness: 2,
        duration: 1700,
        minVisibleMs: 1250,
        extraReadTimeMs: 0,
        slot: 'center',
        channel: 'major',
        type: 'boss_defeated',
        priority: 9,
        banner: true,
        restrained: true,
        authoredFrame: false,
        showAvatar: false,
        y: play.game.getHeight() * 0.32,
        maxWidth: play.game.getWidth() * 0.46
      });
    }
  }, { id: component.id, reduced: profile.reduced });
  await page.waitForTimeout(component.id === 'mission' ? 80 : component.id === 'boss_defeated' ? 420 : 330);
}

async function readState(page, component) {
  return page.evaluate((id) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    const display = id === 'mission'
      ? play?.hud?.missionPanel
      : id === 'flawless'
        ? play?.activeCornerToast
        : id === 'reinforcements'
          ? play?.activeMayhemRoutineWarning?.root
          : id === 'wave_clear'
            ? play?.activeTopToast
            : play?.activeCenterToast;
    const enemies = (manager?.enemies || []).filter((enemy) => enemy?.kind === 'enemy');
    return {
      debug: id === 'mission'
        ? play?.hud?.missionPanel?._debugPriority || null
        : display?._debugWaveClearEffect || display?._debugNovaCommandHud || null,
      bounds: display?.getBounds?.() || null,
      toastMeta: display?.__toastMeta || null,
      reinforcement: id === 'reinforcements'
        ? play?.getMayhemReinforcementPresentationDebugState?.() || null
        : null,
      missionLabel: play?.hud?.missionLabel?.text || '',
      missionText: play?.hud?.missionText?.text || '',
      enemies: {
        total: enemies.length,
        visible: enemies.filter((enemy) =>
          enemy?.active && enemy?.sprite?.visible && enemy?.sprite?.renderable && enemy?.sprite?.parent?.visible !== false
        ).length
      },
      screen: { width: game?.getWidth?.() || 0, height: game?.getHeight?.() || 0 }
    };
  }, component.id);
}

function validate(capture) {
  if (variant === 'baseline') return [];
  const failures = [];
  const { component, profile, state, id } = capture;
  const bounds = state.bounds;
  if (!bounds) return [`${id}: missing bounds`];
  if (bounds.x < 47 || bounds.y < 47 ||
      bounds.x + bounds.width > profile.width - 47 ||
      bounds.y + bounds.height > profile.height - 47) {
    failures.push(`${id}: crossed the 48px safe area (${JSON.stringify(bounds)})`);
  }
  if (profile.density === 'dense' && state.enemies.visible < 12) {
    failures.push(`${id}: dense evidence has ${state.enemies.visible} visible enemies`);
  }
  if (component.id === 'mission') {
    if (state.debug?.visualLanguage !== 'nova_command_hud_persistent_v1' ||
        state.debug?.deterministicFrameReady !== true ||
        state.debug?.frame?.mirroredStructure !== true) {
      failures.push(`${id}: persistent deterministic Mission Status contract failed`);
    }
  } else if (component.id === 'wave_clear') {
    const expectedWidth = profile.width <= 1280 ? (profile.locale === 'de' ? 596 : 520) : 560;
    if (state.debug?.visualLanguage !== 'nova_command_hud_wave_clear_v2' ||
        state.debug?.componentWidth !== expectedWidth ||
        state.debug?.componentHeight !== 96) {
      failures.push(`${id}: approved Wave Cleared V2 drifted`);
    }
  } else {
    const expected = component.id === 'flawless'
      ? 'nova_command_hud_side_v1'
      : component.id === 'reinforcements'
        ? 'nova_command_hud_warning_v1'
        : 'nova_command_hud_major_v1';
    if (state.debug?.visualLanguage !== expected ||
        state.debug?.mirroredStructure !== true ||
        state.debug?.signatureMotif !== 'paired_reactor_pulse') {
      failures.push(`${id}: shared family contract failed`);
    }
    if (state.debug?.secondaryMinimumFontSize !== 13) {
      failures.push(`${id}: secondary type floor is not 13px`);
    }
    if (component.id === 'flawless' &&
        (state.debug?.componentWidth > 400 || state.debug?.componentHeight > 64)) {
      failures.push(`${id}: side toast exceeds compact bounds`);
    }
    if (component.id === 'reinforcements' &&
        (state.debug?.componentWidth > 420 || state.debug?.componentHeight > 64 ||
         state.reinforcement?.signalPlateVisible !== true || state.reinforcement?.hudSafe !== true)) {
      failures.push(`${id}: reinforcement warning contract failed`);
    }
    if (component.id === 'boss_defeated' &&
        (state.debug?.componentWidth > 680 || state.debug?.componentHeight > 112)) {
      failures.push(`${id}: major event exceeds restrained bounds`);
    }
  }
  if (profile.reduced && component.id !== 'mission' && state.debug?.reducedMotion !== true) {
    failures.push(`${id}: reduced-motion path was not active`);
  }
  if (profile.locale === 'de') {
    const copy = [
      state.missionLabel,
      state.missionText,
      state.toastMeta?.message,
      state.debug?.title,
      state.debug?.detail
    ].filter(Boolean).join(' ');
    if (/WAVE CLEARED|FLAWLESS|INCOMING REINFORCEMENTS|HULL REPAIR/.test(copy)) {
      failures.push(`${id}: German capture leaked English (${copy})`);
    }
  }
  return failures;
}

async function contactSheet(profile, captures) {
  const cellW = profile.width <= 1280 ? 480 : 600;
  const imageH = Math.round(cellW * profile.height / profile.width);
  const labelH = 34;
  const columns = 3;
  const canvas = sharp({
    create: {
      width: cellW * columns,
      height: (imageH + labelH) * 2,
      channels: 4,
      background: { r: 2, g: 7, b: 17, alpha: 1 }
    }
  });
  const layers = [];
  for (let index = 0; index < captures.length; index += 1) {
    const capture = captures[index];
    const left = (index % columns) * cellW;
    const top = Math.floor(index / columns) * (imageH + labelH);
    layers.push({
      input: await sharp(capture.screenshot).resize(cellW, imageH).png().toBuffer(),
      left,
      top
    });
    layers.push({
      input: Buffer.from(`<svg width="${cellW}" height="${labelH}">
        <rect width="100%" height="100%" fill="#03111e"/>
        <line x1="0" y1="1" x2="${cellW}" y2="1" stroke="#57eaff"/>
        <text x="14" y="23" fill="#ecfbff" font-family="Segoe UI" font-size="15" font-weight="700">${capture.component.label}</text>
      </svg>`),
      left,
      top: top + imageH
    });
  }
  const target = path.join(outputDir, `contact-sheet-${profile.id}.png`);
  await canvas.composite(layers).png().toFile(target);
  return target;
}

mkdirSync(outputDir, { recursive: true });
const server = await startServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const captures = [];
const pageErrors = [];
const consoleErrors = [];
let overlap = null;

try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      reducedMotion: profile.reduced ? 'reduce' : 'no-preference'
    });
    await context.addInitScript(({ locale }) => {
      localStorage.setItem('novaSwarm.languagePreference.v1', locale);
    }, { locale: profile.locale });
    for (const component of components) {
      const page = await context.newPage();
      const prefix = `${profile.id}/${component.id}`;
      page.on('pageerror', (error) => pageErrors.push(`${prefix}: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(`${prefix}: ${message.text()}`);
      });
      const url = new URL(baseUrl);
      url.searchParams.set('autostart', '1');
      url.searchParams.set('offlineLeaderboard', '1');
      if (variant !== 'baseline') url.searchParams.set('novaCommandPilot', '1');
      await page.goto(url.toString(), { waitUntil: 'commit', timeout: 45000 });
      await page.waitForFunction(() => window.__game?.scenes?.play?.hud && window.__game?.scenes?.play?.enemyManager, null, {
        timeout: 45000
      });
      if (variant !== 'baseline') {
        await page.waitForFunction(() => window.__novaCommandHudPilot?.trigger, null, { timeout: 15000 });
      }
      await stage(page, profile);
      await trigger(page, component, profile);
      const state = await readState(page, component);
      const screenshot = path.join(outputDir, `${profile.id}-${component.id}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      captures.push({
        id: `${profile.id}-${component.id}`,
        variant,
        component,
        profile,
        screenshot,
        state
      });
      await page.close();
    }
    await context.close();
  }

  if (variant !== 'baseline') {
    const profile = fullProfiles.find(({ id }) => id === 'dense-1280x720-en');
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      reducedMotion: 'no-preference'
    });
    await context.addInitScript(() => {
      localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(`overlap: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(`overlap: ${message.text()}`);
    });
    const url = new URL(baseUrl);
    url.searchParams.set('autostart', '1');
    url.searchParams.set('offlineLeaderboard', '1');
    url.searchParams.set('novaCommandPilot', '1');
    await page.goto(url.toString(), { waitUntil: 'commit', timeout: 45000 });
    await page.waitForFunction(() => window.__novaCommandHudPilot?.trigger, null, { timeout: 45000 });
    await stage(page, profile);
    await page.evaluate(() => window.__novaCommandHudPilot.trigger('overlap', {
      decorativeAccents: true,
      debugGeometry: false,
      route: 'right'
    }));
    await page.waitForTimeout(330);
    const state = await page.evaluate(() => {
      const play = window.__game?.scenes?.play;
      const warning = play?.activeMayhemRoutineWarning?.root;
      const side = play?.activeCornerToast;
      return {
        warning: {
          bounds: warning?.getBounds?.() || null,
          debug: warning?._debugNovaCommandHud || null
        },
        side: {
          bounds: side?.getBounds?.() || null,
          debug: side?._debugNovaCommandHud || null
        }
      };
    });
    const screenshot = path.join(outputDir, 'overlap-dense-1280x720-en.png');
    await page.screenshot({ path: screenshot, fullPage: false });
    overlap = { profile, screenshot, state };
    const warningBounds = state.warning.bounds;
    const sideBounds = state.side.bounds;
    if (!warningBounds || !sideBounds) {
      pageErrors.push('overlap: one or both pilot components were not visible');
    } else {
      const intersects = warningBounds.x < sideBounds.x + sideBounds.width &&
        warningBounds.x + warningBounds.width > sideBounds.x &&
        warningBounds.y < sideBounds.y + sideBounds.height &&
        warningBounds.y + warningBounds.height > sideBounds.y;
      if (intersects) pageErrors.push('overlap: warning and side-toast bounds intersect');
    }
    await page.close();
    await context.close();
  }

  const contactSheets = [];
  for (const profile of profiles) {
    contactSheets.push(await contactSheet(
      profile,
      captures.filter((capture) => capture.profile.id === profile.id)
    ));
  }
  const failures = captures.flatMap(validate);
  failures.push(...pageErrors.map((error) => `page error: ${error}`));
  failures.push(...consoleErrors.map((error) => `console error: ${error}`));
  const report = {
    ok: failures.length === 0,
    variant,
    baseUrl,
    outputDir,
    captureCount: captures.length,
    profiles,
    captures,
    overlap,
    contactSheets,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) throw new Error(failures.join('; '));
  console.log(`[nova-command-hud-pilot] PASS variant=${variant} captures=${captures.length} output=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
