import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4523));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/wave-clear-effect-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function withQuery(url, params) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(params)) next.searchParams.set(key, value);
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
  throw new Error(`No available wave-clear effect port found starting at ${startPort}`);
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

async function startDevServer() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, '--host', host, '--port', String(port), '--strictPort', '--force'], {
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
  throw new Error(`Dev server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const evidenceOnly = process.env.WAVE_CLEAR_EVIDENCE_ONLY === '1';
const evidenceVariant = String(process.env.WAVE_CLEAR_EVIDENCE_VARIANT || 'proposed').trim() || 'proposed';
const scenarios = [
  {
    id: 'quiet-1920x1080-en-entrance',
    width: 1920,
    height: 1080,
    intensity: 'quiet',
    phaseMs: 80,
    label: 'WAVE CLEARED!',
    subtitle: 'NEXT WAVE 2/5',
    debugGeometry: true
  },
  {
    id: 'quiet-1920x1080-en-hold',
    width: 1920,
    height: 1080,
    intensity: 'quiet',
    phaseMs: 460,
    label: 'WAVE CLEARED!',
    subtitle: 'NEXT WAVE 2/5'
  },
  {
    id: 'quiet-1920x1080-en-exit',
    width: 1920,
    height: 1080,
    intensity: 'quiet',
    phaseMs: 1060,
    label: 'WAVE CLEARED!',
    subtitle: 'NEXT WAVE 2/5'
  },
  {
    id: 'normal-1920x1080-en-hold',
    width: 1920,
    height: 1080,
    intensity: 'normal',
    phaseMs: 460,
    label: 'WAVE CLEARED!',
    subtitle: 'NEXT WAVE 4/8'
  },
  {
    id: 'dense-1920x1080-en-hold',
    width: 1920,
    height: 1080,
    intensity: 'dense',
    phaseMs: 460,
    label: 'WAVE CLEARED!',
    subtitle: 'NEXT WAVE 7/8'
  },
  {
    id: 'quiet-1280x720-en-hold',
    width: 1280,
    height: 720,
    intensity: 'quiet',
    phaseMs: 460,
    label: 'WAVE CLEARED!',
    subtitle: 'NEXT WAVE 2/5'
  },
  {
    id: 'dense-1280x720-en-hold',
    width: 1280,
    height: 720,
    intensity: 'dense',
    phaseMs: 460,
    label: 'WAVE CLEARED!',
    subtitle: 'NEXT WAVE 7/8'
  },
  {
    id: 'dense-1280x720-de-long-hold',
    width: 1280,
    height: 720,
    intensity: 'dense',
    phaseMs: 460,
    label: 'WELLE ABGESCHLOSSEN!',
    subtitle: 'NÄCHSTE WELLE 12/18 · REPARATUR +1'
  },
  {
    id: 'quiet-1920x1080-en-no-accents-hold',
    width: 1920,
    height: 1080,
    intensity: 'quiet',
    phaseMs: 460,
    label: 'WAVE CLEARED!',
    subtitle: 'NEXT WAVE 2/5',
    decorativeAccents: false
  }
];

async function stageScenario(page, scenario) {
  await page.setViewportSize({ width: scenario.width, height: scenario.height });
  await page.waitForTimeout(140);
  await page.evaluate((settings) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    if (!game || !play || !manager) throw new Error('missing play scene for Wave Cleared scenario');

    play.introActive = false;
    play.introComplete = true;
    play.isPaused = true;
    game.hangarProgressAtRunStart = {
      ...(game.hangarProgressAtRunStart || {}),
      totalRuns: Math.max(1, Number(game.hangarProgressAtRunStart?.totalRuns) || 0)
    };
    play.clearRunContractStartNudge?.();
    play.completeFirstRunOnboarding?.();
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.clearToastState?.();
    play.showToast = () => false;
    if (play.player) {
      play.player.applyRankUpBoost = () => {};
      if (play.player.rankBoost) {
        play.player.rankBoost.type = null;
        play.player.rankBoost.expiresAt = 0;
      }
      play.player.drawRankBoostAura?.(null);
    }
    play.bulletManager?.clearAll?.('wave_clear_visual_evidence');
    manager.clearEnemies?.();
    manager.update = () => {};
    if (manager.container) {
      manager.container.visible = true;
      manager.container.renderable = true;
      manager.container.alpha = 1;
    }
    manager.boss = null;
    manager.phase = 'WAVES';
    manager.state = 'WAVE_ACTIVE';

    if (settings.intensity !== 'quiet') {
      const level = settings.intensity === 'dense' ? 55 : 12;
      game.level = level;
      manager.level = level;
      const waves = manager.generateWaves(level);
      const config = waves.find((entry) => entry?.type !== 'BOSS') || waves[0];
      manager.currentWaveIndex = Math.min(settings.intensity === 'dense' ? 5 : 2, Math.max(0, waves.length - 1));
      manager.normalWavesTotal = Math.max(1, waves.length);
      manager.currentModifier = null;
      play.recordThreatDiscovery = () => false;
      play.maybePromoteAceEnemy = () => false;
      play.maybeApplyRivalWingEnemy = () => false;
      manager.maybeSpawnRareChaosVisitor = () => null;
      const groupCount = settings.intensity === 'dense' ? 6 : 3;
      for (let group = 0; group < groupCount; group += 1) {
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
    }

    play.hud?.update?.();
  }, scenario);
  const settleMs = scenario.intensity === 'quiet' ? 0 : 80;
  if (settleMs > 0) await page.waitForTimeout(settleMs);
  await page.evaluate((settings) => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const manager = play?.enemyManager;
    const enemies = (manager?.enemies || []).filter((enemy) => enemy?.kind === 'enemy');
    const columns = settings.intensity === 'dense'
      ? Math.min(settings.width <= 1280 ? 8 : 9, Math.max(1, Math.ceil(enemies.length / 2)))
      : Math.min(5, Math.max(1, Math.ceil(enemies.length / 2)));
    const spacingX = Math.min(
      settings.width <= 1280 ? 116 : 142,
      (settings.width - (settings.width <= 1280 ? 210 : 420)) / Math.max(1, columns - 1)
    );
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index];
      const row = Math.floor(index / columns);
      const column = index % columns;
      const rowCount = Math.min(columns, enemies.length - row * columns);
      const x = settings.width / 2 - Math.max(0, rowCount - 1) * spacingX / 2 + column * spacingX;
      const y = (settings.height <= 720 ? 270 : 300) + row * (settings.height <= 720 ? 86 : 104);
      enemy.waitingForEntry = false;
      enemy.active = true;
      enemy.state = 'FORMATION';
      if (!enemy.sprite) continue;
      enemy.sprite.visible = true;
      enemy.sprite.renderable = true;
      enemy.sprite.alpha = 1;
      enemy.formationX = x;
      enemy.formationY = y;
      enemy.x = x;
      enemy.y = y;
      enemy.sprite.position?.set?.(x, y);
    }
    manager?.clearPendingWaveSpawns?.();
    if (manager) {
      manager.spawning = false;
      manager.waveSpawnPendingCount = 0;
    }
    play?.bulletManager?.clearAll?.('wave_clear_visual_evidence_hold');
    play?.clearToastState?.();
    play?.showWaveBonusEffect?.(1500, settings.label, {
      compact: true,
      subtitle: settings.subtitle,
      sfxKey: 'nova_wave_clear_sweep',
      decorativeAccents: settings.decorativeAccents !== false,
      debugGeometry: settings.debugGeometry === true
    });
    window.__waveClearEvidenceDisplay = play?.activeTopToast || null;
  }, scenario);
  await page.waitForTimeout(scenario.phaseMs);

  const screenshot = path.join(outputDir, `${evidenceVariant}-${scenario.id}.png`);
  const state = await page.evaluate(() => {
    const game = window.__game;
    const play = game?.scenes?.play;
    const activeEffect = play?.activeTopToast || null;
    const effect = activeEffect || window.__waveClearEvidenceDisplay || null;
    const enemies = (play?.enemyManager?.enemies || []).filter((enemy) => enemy?.kind === 'enemy');
    return {
      debug: effect?._debugWaveClearEffect || null,
      bounds: effect ? play.getToastDisplayBounds(effect) : null,
      active: activeEffect === effect,
      dismissReason: effect?.__dismissReason || null,
      toastState: play?.getToastDebugState?.() || null,
      enemyVisuals: {
        total: enemies.length,
        active: enemies.filter((enemy) => enemy?.active).length,
        visible: enemies.filter((enemy) =>
          enemy?.active &&
          enemy?.sprite?.visible &&
          enemy?.sprite?.renderable &&
          enemy?.sprite?.parent?.visible !== false
        ).length,
        sample: enemies.slice(0, 4).map((enemy) => ({
          x: Math.round(Number(enemy.x) || 0),
          y: Math.round(Number(enemy.y) || 0),
          alpha: Number(enemy.sprite?.alpha ?? 0),
          visible: Boolean(enemy.sprite?.visible),
          worldVisible: Boolean(enemy.sprite?.worldVisible),
          parentVisible: Boolean(enemy.sprite?.parent?.visible)
        }))
      },
      screen: { width: game?.getWidth?.() || 0, height: game?.getHeight?.() || 0 }
    };
  });
  await page.screenshot({ path: screenshot, fullPage: false });
  return { ...scenario, screenshot, state };
}

mkdirSync(outputDir, { recursive: true });
const server = await startDevServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});

const pageErrors = [];
const consoleErrors = [];

try {
  const captures = [];
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height } });
    page.on('pageerror', (error) => pageErrors.push(`${scenario.id}: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(`${scenario.id}: ${message.text()}`);
    });
    try {
      await page.goto(withQuery(baseUrl, { autostart: '1', offlineLeaderboard: '1' }), {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await page.waitForFunction(() => window.__game?.scenes?.play?.showWaveBonusEffect, null, { timeout: 30000 });
      await page.waitForTimeout(3000);
      captures.push(await stageScenario(page, scenario));
    } finally {
      await page.close();
    }
  }
  const failures = [];
  if (!evidenceOnly) {
    for (const capture of captures) {
      const { debug, bounds, toastState, screen } = capture.state;
      if (!debug) failures.push(`${capture.id}: missing Wave Cleared debug state`);
      if (!capture.state.active) {
        failures.push(`${capture.id}: Wave Cleared dismissed before capture: ${capture.state.dismissReason || 'unknown'}`);
      }
      if (debug?.visualLanguage !== 'nova_command_hud_wave_clear_v2') {
        failures.push(`${capture.id}: visual language mismatch: ${JSON.stringify(debug)}`);
      }
      if (debug?.channel !== 'transition' || debug?.slot !== 'top') {
        failures.push(`${capture.id}: transition ownership mismatch: ${JSON.stringify(debug)}`);
      }
      if (debug?.mirroredStructure !== true || debug?.structuralHalfCount !== 2) {
        failures.push(`${capture.id}: frame was not mathematically mirrored: ${JSON.stringify(debug)}`);
      }
      if (Math.abs(Number(debug?.alphaCenterOffsetPx) || 0) > 0.75) {
        failures.push(`${capture.id}: alpha bounds are off-centre: ${JSON.stringify(debug)}`);
      }
      if (Math.abs(Number(debug?.textCenterOffsetPx) || 0) > 0.75) {
        failures.push(`${capture.id}: text bounds are off-centre: ${JSON.stringify(debug)}`);
      }
      const isLongLocalization = capture.id.includes('-de-long-');
      const minWidth = isLongLocalization ? 520 : 520;
      const maxWidth = isLongLocalization ? 660 : 610;
      if ((debug?.componentWidth || 0) < minWidth || (debug?.componentWidth || 0) > maxWidth) {
        failures.push(`${capture.id}: width outside ${minWidth}-${maxWidth} target: ${JSON.stringify(debug)}`);
      }
      if ((debug?.componentHeight || 0) < 90 || (debug?.componentHeight || 0) > 108) {
        failures.push(`${capture.id}: height outside 90-108 target: ${JSON.stringify(debug)}`);
      }
      if ((debug?.centralPlateWidth || 0) >= (debug?.componentWidth || 0) - 72 ||
        (debug?.openRailWidthPerSide || 0) < 36 ||
        (debug?.opaqueCoverageRatio || 1) > 0.72 ||
        (debug?.surfaceAlpha || 1) > 0.82) {
        failures.push(`${capture.id}: V2 open-rail occlusion contract failed: ${JSON.stringify(debug)}`);
      }
      if (debug?.signatureMotif !== 'paired_reactor_pulse') {
        failures.push(`${capture.id}: Nova Swarm signature motif missing: ${JSON.stringify(debug)}`);
      }
      if (capture.intensity === 'dense' && (capture.state.enemyVisuals?.visible || 0) < 12) {
        failures.push(`${capture.id}: dense evidence has too few visible real enemies: ${JSON.stringify(capture.state.enemyVisuals)}`);
      }
      if (!bounds || bounds.x < 48 || bounds.y < 48 ||
        bounds.x + bounds.width > screen.width - 48 ||
        bounds.y + bounds.height > screen.height - 48) {
        failures.push(`${capture.id}: safe-area violation: ${JSON.stringify({ bounds, screen, debug })}`);
      }
      const active = toastState?.active || [];
      if (!active.some((toast) => toast.type === 'wave_clear' && toast.slot === 'top' && toast.channel === 'transition')) {
        failures.push(`${capture.id}: Wave Cleared lost the transition slot: ${JSON.stringify(active)}`);
      }
    }
    const noAccents = captures.find((capture) => capture.decorativeAccents === false);
    if (noAccents?.state?.debug?.decorativeAccents !== false ||
      noAccents?.state?.debug?.typographyReadableWithoutAccents !== true) {
      failures.push(`decorative-off typography contract failed: ${JSON.stringify(noAccents?.state?.debug)}`);
    }
  }
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);

  const report = {
    ok: failures.length === 0,
    baseUrl,
    evidenceOnly,
    evidenceVariant,
    captures,
    failures,
    pageErrors,
    consoleErrors
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(report.ok, `[wave-clear-effect] ${failures.join('; ')}`);
  console.log(`[wave-clear-effect] PASS captures=${captures.length} output=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
