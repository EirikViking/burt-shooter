import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4574));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/tyrian-responsive-ui-${timestamp()}`);
const scenarios = [
  { id: 'compact', width: 960, height: 540, uiScale: 1 },
  { id: 'standard-16x9', width: 1920, height: 1080, uiScale: 1 },
  { id: 'ultrawide', width: 3440, height: 1440, uiScale: 1.25 }
];

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
  throw new Error(`No available Tyrian responsive UI port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

function viteCommand() {
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  if (existsSync(viteEntry)) return { command: process.execPath, args: [viteEntry] };
  return { command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['vite'] };
}

async function startPreview() {
  if (await canFetch(baseUrl)) return null;
  const { command, args } = viteCommand();
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`Preview server did not become ready at ${baseUrl}`);
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

function makeHangarProgress() {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 25000,
    pilotRank: 20,
    highestPilotRank: 20,
    totalRuns: 64,
    bestScore: 420000,
    bestSector: 60,
    bestLevel: 60,
    bestRank: 20,
    runClears: 9,
    totalBossesDefeated: 72,
    totalWavesCleared: 360,
    unlockedShipIds: Array.from({ length: 30 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`),
    lastNewlyUnlockedShipIds: [],
    shipSpecificMilestones: {
      nova_ship_30: {
        runs: 11,
        clears: 7,
        bestSector: 60,
        bestScore: 420000,
        bestCombo: 88,
        bestBosses: 10,
        totalBosses: 48,
        lastRunAt: '2026-08-01T00:00:00.000Z'
      }
    },
    updatedAt: '2026-08-01T00:00:00.000Z'
  };
}

async function seedPage(page, scenario) {
  await page.addInitScript(({ scenario: layout, progress }) => {
    localStorage.clear();
    localStorage.setItem('burt_first_run_completed', 'true');
    localStorage.setItem('burt_voice_enabled', 'false');
    localStorage.setItem('novaSwarm.languagePreference.v1', 'en');
    localStorage.setItem('nova_display_mode_v1', 'windowed');
    localStorage.setItem('nova_display_window_size_v1', JSON.stringify({ width: layout.width, height: layout.height }));
    localStorage.setItem('nova_ui_scale_v1', String(layout.uiScale));
    localStorage.setItem('burt.selectedShip.v1', 'nova-player-ship-30.png');
    localStorage.setItem('burt.shipUnlockProgress.v1', JSON.stringify({ bestScore: 420000, bestRank: 20, bestLevel: 60 }));
    localStorage.setItem('nova.hangarProgress.v1', JSON.stringify(progress));
  }, { scenario, progress: makeHangarProgress() });
}

function observePage(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function auditVisibleText(page, rootKind = 'scene') {
  return page.evaluate((kind) => {
    const width = window.__game?.getWidth?.() || window.innerWidth;
    const height = window.__game?.getHeight?.() || window.innerHeight;
    const current = window.__game?.currentScene;
    const roots = kind === 'settings'
      ? [current?.settingsOverlay?.container]
      : [current?.container, current?.uiOverlay];
    const failures = [];
    const samples = [];
    const visited = new Set();
    const visit = (node) => {
      if (!node || visited.has(node)) return;
      visited.add(node);
      if (node.visible === false || node.renderable === false || Number(node.worldAlpha ?? node.alpha ?? 1) <= 0.04) return;
      if (typeof node.text === 'string' || typeof node.text === 'number') {
        const text = String(node.text ?? '').trim();
        if (/NaN|undefined|null/.test(text)) failures.push(`bad text ${JSON.stringify({
          text,
          label: node.label || null,
          parentLabel: node.parent?.label || null,
          grandparentLabel: node.parent?.parent?.label || null
        })}`);
        try {
          const rect = node.getBounds?.();
          if (rect && rect.width > 0 && rect.height > 0) {
            const sample = {
              text: text.slice(0, 100),
              label: node.label || null,
              parentLabel: node.parent?.label || null,
              grandparentLabel: node.parent?.parent?.label || null,
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              right: Math.round(rect.x + rect.width),
              bottom: Math.round(rect.y + rect.height)
            };
            if (sample.x < -4 || sample.y < -4 || sample.right > width + 4 || sample.bottom > height + 4) {
              failures.push(`text outside ${width}x${height}: ${JSON.stringify(sample)}`);
            }
            samples.push(sample);
          }
        } catch (error) {
          failures.push(`unmeasurable text ${JSON.stringify(text)}: ${error?.message || error}`);
        }
      }
      for (const child of node.children || []) visit(child);
    };
    roots.forEach(visit);
    return { width, height, failures, samples };
  }, rootKind);
}

async function capture(page, scenarioDir, name, rootKind = 'scene') {
  const file = path.join(scenarioDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const audit = await auditVisibleText(page, rootKind);
  const metadata = await sharp(file).metadata();
  const stats = await sharp(file).stats();
  assert.equal(metadata.width, page.viewportSize().width, `${name} width mismatch`);
  assert.equal(metadata.height, page.viewportSize().height, `${name} height mismatch`);
  assert(Number(stats.entropy || 0) > 1.2, `${name} appears visually empty`);
  assert.deepEqual(audit.failures, [], `${name} text audit failed:\n${audit.failures.join('\n')}`);
  return { file, audit, entropy: Number(stats.entropy || 0) };
}

async function prepareGameplay(page) {
  await page.goto(`${baseUrl}/?offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
  await page.evaluate(async () => {
    await window.__game.startGame('nova-player-ship-30.png', { countShipUsage: false });
  });
  await page.waitForFunction(() => {
    const play = window.__game?.scenes?.play;
    return window.__game?.currentSceneName === 'play'
      && play?.player?.selectedShipSpriteKey === 'nova-player-ship-30.png'
      && play?.hud;
  }, null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const sprite = window.__game?.scenes?.play?.player?.shipSprite;
    return (sprite?.texture?.width || 0) >= 1200 && (sprite?.texture?.height || 0) >= 1200;
  }, null, { timeout: 30000 });
  const eirikVisual = await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    play.shipIntroToken = (Number(play.shipIntroToken) || 0) + 1;
    play.introActive = false;
    play.introComplete = true;
    play.clearPendingEnemyStart?.();
    if (play.introOverlay?.parent) play.introOverlay.parent.removeChild(play.introOverlay);
    play.debugInvincible = true;
    play.player.invulnerable = true;
    play.player.invulnerableTime = 600000;
    play.player.x = game.getWidth() * 0.5;
    play.player.y = game.getHeight() * 0.74;
    if (play.player.sprite) {
      play.player.sprite.x = play.player.x;
      play.player.sprite.y = play.player.y;
      play.player.sprite.visible = true;
      play.player.sprite.renderable = true;
      play.player.sprite.alpha = 1;
    }
    play.enemyManager?.clearEnemies?.();
    if (play.enemyManager) {
      play.enemyManager.state = 'WAVE_ACTIVE';
      play.enemyManager.phase = 'WAVES';
      play.enemyManager.spawning = false;
    }
    const targetWidth = play.player.targetShipWidthPx || play.player.baseShipWidth || 0;
    const initialRenderedWidth = play.player.shipSprite?.width || 0;
    play.player.shipSprite?.scale?.set?.(1);
    const repaired = play.player.normalizeShipSpriteScale?.('tyrian-responsive-regression') || false;
    for (let rankEvent = 0; rankEvent < 30; rankEvent += 1) {
      play.player.pulseRankUpShipScale?.();
    }
    const stackedContainerScaleX = play.player.sprite?.scale?.x || 0;
    const stackedContainerScaleY = play.player.sprite?.scale?.y || 0;
    const stackedRenderedWidth = (play.player.shipSprite?.width || 0) * stackedContainerScaleX;
    play.player.sprite?.scale?.set?.(8);
    const containerRepaired = play.player.normalizeShipContainerScale?.('rank-catchup-regression') || false;
    play.player.createDrones?.(2, 0x66ccff);
    play.player.updateDrones?.(1 / 60);
    const supportDrones = (play.player.drones || []).map((drone) => {
      const sprite = (drone.children || []).find((child) => child?.texture);
      return {
        width: sprite?.width || 0,
        height: sprite?.height || 0,
        scaleX: sprite?.scale?.x || 0,
        scaleY: sprite?.scale?.y || 0
      };
    });
    return {
      textureIndex: play.player.selectedShipTextureIndex,
      width: play.player.shipSprite?.texture?.width || 0,
      height: play.player.shipSprite?.texture?.height || 0,
      tint: play.player.shipSprite?.tint ?? null,
      targetWidth,
      initialRenderedWidth,
      renderedWidth: play.player.shipSprite?.width || 0,
      renderedHeight: play.player.shipSprite?.height || 0,
      repaired,
      repairReason: play.player.lastShipScaleRepair?.reason || null,
      stackedContainerScaleX,
      stackedContainerScaleY,
      stackedRenderedWidth,
      containerRepaired,
      containerRepairReason: play.player.lastShipContainerScaleRepair?.reason || null,
      repairedContainerScaleX: play.player.sprite?.scale?.x || 0,
      repairedContainerScaleY: play.player.sprite?.scale?.y || 0,
      supportDrones
    };
  });
  assert.equal(eirikVisual.textureIndex, 26);
  assert(eirikVisual.width >= 1200 && eirikVisual.height >= 1200, `Eirik gameplay art was replaced by fallback: ${JSON.stringify(eirikVisual)}`);
  assert.equal(eirikVisual.tint, 0xffffff, `Eirik gameplay colors were flattened by a trait tint: ${JSON.stringify(eirikVisual)}`);
  assert.equal(eirikVisual.repaired, true, `Eirik gameplay scale corruption was not repaired: ${JSON.stringify(eirikVisual)}`);
  assert.equal(eirikVisual.repairReason, 'tyrian-responsive-regression');
  assert(eirikVisual.renderedWidth <= eirikVisual.targetWidth * 1.02, `Eirik gameplay hull is oversized: ${JSON.stringify(eirikVisual)}`);
  assert(eirikVisual.renderedHeight <= eirikVisual.targetWidth * 1.35 * 1.02, `Eirik gameplay hull is too tall: ${JSON.stringify(eirikVisual)}`);
  assert(eirikVisual.stackedContainerScaleX <= 1.2 && eirikVisual.stackedContainerScaleY <= 1.2, `rapid rank-up pulses stacked ship scale: ${JSON.stringify(eirikVisual)}`);
  assert(eirikVisual.stackedRenderedWidth <= eirikVisual.targetWidth * 1.2, `rapid rank-up pulses oversized Eirik: ${JSON.stringify(eirikVisual)}`);
  assert.equal(eirikVisual.containerRepaired, true, `unsafe ship container scale was not repaired: ${JSON.stringify(eirikVisual)}`);
  assert.equal(eirikVisual.containerRepairReason, 'rank-catchup-regression');
  assert.equal(eirikVisual.repairedContainerScaleX, 1);
  assert.equal(eirikVisual.repairedContainerScaleY, 1);
  assert.equal(eirikVisual.supportDrones.length, 2, `Eirik support drones were not created: ${JSON.stringify(eirikVisual)}`);
  for (const drone of eirikVisual.supportDrones) {
    assert(Math.max(drone.width, drone.height) <= 34.5, `Eirik support drone inherited flagship dimensions: ${JSON.stringify(drone)}`);
    assert(drone.scaleX > 0 && drone.scaleY > 0, `Eirik support drone has an invalid texture scale: ${JSON.stringify(drone)}`);
  }
  return eirikVisual;
}

async function stageGameplayHud(page) {
  await page.evaluate(() => {
    const game = window.__game;
    const play = game.scenes.play;
    const player = play.player;
    play.clearToastState?.();
    player.resetPowerups?.();
    player.applyPowerup('magnet');
    player.applyPowerup('score_x2');
    game.lives = 5;
    game.level = 18;
    play.hud?.update?.();
    play.hud?.updateActivePowerup?.();
    play.showToast('WAVE 4/6 // HOSTILES INBOUND', {
      type: 'wave_start',
      channel: 'transition',
      slot: 'top',
      duration: 5000,
      priority: 3,
      restrained: true,
      signalPlate: true
    });
  });
  await page.waitForTimeout(280);
  const state = await readState(page);
  const types = state.player?.powerups?.map((entry) => entry.type) || [];
  assert.equal(state.player?.shipVariant, 'singularity', 'Eirik is not the active gameplay hull');
  assert(types.includes('magnet') && types.includes('score_x2'), `compatible timers missing: ${types.join(',')}`);
  assert.equal(state.player?.cockpitMastery?.clears, 7, 'cockpit clear tally did not use Eirik mastery data');
  return state;
}

async function stageGhostAndNotices(page) {
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    play.clearToastState?.();
    player.resetPowerups?.();
    player.applyPowerup('ghost');
    player.updateGhostTimerVisual?.();
    play.activeTopToast = play.showToastNow('DAMAGE UP  PERMANENT THIS RUN', {
      type: 'tactical_draft',
      duration: 5000,
      priority: 5,
      fill: '#fff3a0'
    }, 'top');
    play.activeCornerToast = play.showToastNow('BEAM BROKEN +250', {
      type: 'beamBroken',
      duration: 5000,
      priority: 3,
      fill: '#7dffcc'
    }, 'corner');
  });
  await page.waitForTimeout(260);
  const state = await readState(page);
  assert(state.player?.ghostTimer?.visible, `Ghost timer is not visible: ${JSON.stringify(state.player?.ghostTimer)}`);
  assert(state.player.ghostTimer.radius <= 35 && state.player.ghostTimer.attachedToPlayer, 'Ghost timer lost its compact attached contract');
  return state;
}

async function stageBossSplitAndSupport(page) {
  await page.evaluate(async () => {
    const play = window.__game.scenes.play;
    play.game.app.ticker.stop();
    play.clearToastState?.();
    play.enemyManager?.clearEnemies?.();
    play.clearPendingEnemyStart?.();
    play.enemyManager.forceBossStart?.(18);
    await play.enemyManager.spawnBoss?.(18);
    play.enemyManager.state = 'BOSS_ACTIVE';
    play.enemyManager.phase = 'BOSS';
    play.enemyManager.bossSpawning = false;
    const boss = play.enemyManager.boss;
    const player = play.player;
    const bossX = play.game.getWidth() * 0.5;
    const bossY = Math.max(140, play.game.getHeight() * 0.2);
    boss.baseX = bossX;
    boss.bossLaneY = bossY;
    boss.x = bossX;
    boss.y = bossY;
    boss.entryFromY = bossY;
    boss.entryToY = bossY;
    boss.entryStartMs = Date.now() - boss.entryDurationMs - 1;
    boss.entryImpactTriggered = true;
    boss.sprite.x = bossX;
    boss.sprite.y = bossY;
    boss.updateHealthBar?.();
    boss.profile = { ...(boss.profile || {}), attack: 'split' };
    player.x = play.game.getWidth() * 0.78;
    player.y = play.game.getHeight() * 0.82;
    boss.regularTelegraph = null;
    boss.clearRegularAttackTelegraphVisual?.();
    boss.startRegularAttackTelegraph(player.x, player.y);
    boss.updateRegularAttackTelegraphVisual(0.7, player.x, player.y);
    play.showToastNow('FUEL SHIP INBOUND', {
      type: 'fuel_ship',
      duration: 5000,
      priority: 6,
      restrained: true,
      signalPlate: true
    }, 'top');
    play.game.app.ticker.stop();
  });
  const result = await page.evaluate(() => {
    const boss = window.__game.scenes.play.enemyManager.boss;
    return {
      type: boss.regularTelegraph?.type,
      laneOffsets: boss.regularTelegraph?.laneOffsets?.slice?.() || [],
      warningStart: boss.lastRegularTelegraphStart || null
    };
  });
  assert.equal(result.type, 'split');
  assert.deepEqual(result.laneOffsets, [-0.18, 0.18]);
  assert(result.warningStart?.releaseNotBefore > result.warningStart?.warningAt, 'split warning does not precede release');
  return result;
}

async function stageFusionQueue(page, scenarioDir) {
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.game.app.ticker.stop();
    play.clearToastState?.();
    play.enemyManager?.clearEnemies?.();
    play.enemyManager.state = 'LEVEL_COMPLETE';
    play.enemyManager.phase = 'WAVES';
    play.enemyManager.bossSpawning = false;
    for (const child of [...(play.enemyManager?.container?.children || [])]) {
      if (String(child?.label || '').startsWith('enemy_visual:')) child.parent?.removeChild?.(child);
    }
    play.game.app.ticker.start();
    play.triggerOverrunClearCelebration({
      nextSector: 11,
      milestoneSector: 10,
      eventKind: 'run_clear',
      clearBonus: 10000,
      livesBonus: 5000,
      celebration: {
        id: 'tyrian-responsive-audit',
        title: 'OVERRUN UNLOCKED',
        flavor: 'The clear gate opens. The swarm reloads.',
        statusLine: 'STATUS: CLEAR GATE SECURED // SCORE {score} // HULLS {lives}',
        warning: 'SECTOR {nextSector} WILL NOT BE POLITE',
        footerWarning: 'STRAP IN, PILOT. OVERRUN DOES NOT DO EASY.',
        continueText: "I'M READY - BRING THE SWARM",
        visual: {}
      },
      milestoneReward: { label: 'CREW DROP: TACTICAL RESCAN RESTOCKED' }
    });
    play.showTacticalFusionUnlock({
      id: 'rift_reprisal',
      name: 'RIFT REPRISAL',
      description: 'Dodge exits answer nearby threats with guided rift shards.',
      detail: 'PHASE REACTOR + PHASE WAKE',
      color: 0xc89bff,
      sfx: 'achievement'
    });
  });
  await page.waitForTimeout(820);
  let state = await readState(page);
  assert(state.overrunInterlude?.active, 'Overrun interlude did not become visible');
  assert.equal(state.tacticalDraft?.fusionUnlock?.active, undefined, 'Fusion should remain queued behind the interlude');
  const interludeShot = await capture(page, scenarioDir, '05-fusion-queued-behind-interlude');
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const interlude = play.overrunMilestoneInterlude;
    interlude.confirmReadyAt = 0;
    play.confirmOverrunInterlude('visual_audit');
    interlude.startedAt = Date.now() - interlude.durationMs - 1;
    if (interlude.effect) {
      interlude.effect.confirmed = true;
      interlude.effect.startedAt = Date.now() - interlude.effect.durationMs - 1;
    }
    play.updateOverrunMilestoneInterlude(1);
    play.flushPendingTacticalFusionUnlock?.();
  });
  await page.waitForTimeout(280);
  state = await readState(page);
  assert(state.tacticalDraft?.fusionUnlock?.active, 'Queued Fusion did not receive its full presentation after the interlude');
  const fusionShot = await capture(page, scenarioDir, '06-fusion-presented-after-interlude');
  return { interludeShot, fusionShot, state };
}

async function stageCappedDraft(page) {
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearTacticalFusionUnlock?.('responsive_audit');
    play.clearToastState?.();
    play.game.runMode = 'ranked_tactical';
    play.openTacticalDraft({ sectorCleared: 8 });
    const card = play.tacticalDraft?.cards?.[0];
    if (!card?._nodes) throw new Error('Tactical Draft card missing');
    const impact = play.formatTacticalDraftStatPreview({
      kind: 'stat',
      metric: 'damage',
      before: 55.33,
      after: 55.33,
      capped: true
    });
    card._impactKind = impact.kind;
    card._nodes.impactLabel.text = impact.label;
    card._nodes.impactValue.text = impact.value;
    play.layoutTacticalDraft();
    play.redrawTacticalDraftCard(card);
  });
  await page.waitForTimeout(260);
  const state = await readState(page);
  const offer = state.tacticalDraft?.offers?.[0];
  assert.equal(offer?.impactLabelText, 'DIRECT DAMAGE CAP REACHED');
  assert.equal(offer?.impactValueText, '55.33 → 55.33');
  assert(offer?.impactValueBounds?.width > 0, 'capped numeric value has no visible bounds');
  return state;
}

async function runGameplayScenario(browser, scenario, scenarioDir) {
  const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height } });
  const observed = observePage(page);
  await seedPage(page, scenario);
  try {
    const eirikVisual = await prepareGameplay(page);
    const hudState = await stageGameplayHud(page);
    const hudShot = await capture(page, scenarioDir, '01-wave-hud-compatible-timers');
    const ghostState = await stageGhostAndNotices(page);
    const noticeShot = await capture(page, scenarioDir, '02-ghost-permanent-upgrade-tractor-break');
    const bossState = await stageBossSplitAndSupport(page);
    const bossShot = await capture(page, scenarioDir, '03-boss-split-and-fuel-warning');
    const fusion = await stageFusionQueue(page, scenarioDir);
    const draftState = await stageCappedDraft(page);
    const draftShot = await capture(page, scenarioDir, '07-damage-cap-preview');
    assert.deepEqual(observed.pageErrors, [], `${scenario.id} gameplay page errors`);
    assert.deepEqual(observed.consoleErrors, [], `${scenario.id} gameplay console errors`);
    return { eirikVisual, hudState, ghostState, bossState, draftState, hudShot, noticeShot, bossShot, ...fusion, errors: observed };
  } finally {
    await page.close();
  }
}

async function runHangarScenario(browser, scenario, scenarioDir) {
  const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height } });
  const observed = observePage(page);
  await seedPage(page, scenario);
  try {
    await page.goto(`${baseUrl}/?offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
    await page.evaluate(async () => window.__game.showShipSelect());
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').scene === 'shipSelect', null, { timeout: 30000 });
    await page.waitForTimeout(700);
    const state = await readState(page);
    assert.equal(state.shipSelect?.shipName, 'EIRIK THE VIKING');
    assert(String(state.shipSelect?.recommended?.shipName || '').trim(), 'Hangar recommendation has no ship identity');
    assert(state.shipSelect.recommended.bannerVisible, 'Hangar recommendation is not visible');
    assert.equal(state.shipSelect?.mastery?.clears, 7);
    assert.equal(state.shipSelect?.mastery?.medalCount, 3);
    const eirikVisual = await page.evaluate(() => {
      const scene = window.__game.scenes.shipSelect;
      const selectedShip = scene.ships[scene.selectedIndex];
      const selectedCard = scene.shipCards[scene.selectedIndex];
      const loadedTexture = selectedCard?.sprite?.texture || null;
      return {
        textureIndex: selectedShip.textureIndex,
        width: loadedTexture?.width || 0,
        height: loadedTexture?.height || 0,
        tint: selectedCard?.sprite?.tint ?? null
      };
    });
    assert.equal(eirikVisual.textureIndex, 26);
    assert(eirikVisual.width >= 1200 && eirikVisual.height >= 1200, `Eirik dedicated art was replaced by fallback: ${JSON.stringify(eirikVisual)}`);
    assert.equal(eirikVisual.tint, 0xffffff, `Eirik dedicated colors were flattened by a carousel tint: ${JSON.stringify(eirikVisual)}`);
    const shot = await capture(page, scenarioDir, '08-hangar-eirik-recommendation-mastery');
    assert.deepEqual(observed.pageErrors, [], `${scenario.id} Hangar page errors`);
    assert.deepEqual(observed.consoleErrors, [], `${scenario.id} Hangar console errors`);
    return { state, eirikVisual, shot, errors: observed };
  } finally {
    await page.close();
  }
}

async function runSettingsScenario(browser, scenario, scenarioDir) {
  const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height } });
  const observed = observePage(page);
  await seedPage(page, scenario);
  try {
    await page.goto(`${baseUrl}/?offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__game?.currentSceneName === 'menu', null, { timeout: 30000 });
    await page.evaluate(() => window.__game.scenes.menu.openSettingsOverlay());
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() || '{}').overlays?.settings === true, null, { timeout: 10000 });
    await page.waitForTimeout(280);
    const state = await readState(page);
    const chatter = await page.evaluate(() => {
      const overlay = window.__game?.currentScene?.settingsOverlay;
      const control = overlay?.controls?.find((entry) => entry.id === 'chatter_frequency');
      const bounds = (node) => {
        const box = node?.getBounds?.();
        return box ? { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) } : null;
      };
      return {
        exists: Boolean(control),
        label: control?.button?._label?.text || null,
        button: bounds(control?.button),
        description: control?.button?.parent?._description?.text || null,
        descriptionBounds: bounds(control?.button?.parent?._description)
      };
    });
    assert(chatter.exists && ['Full', 'Reduced', 'Minimal'].includes(chatter.label), `Chatter Frequency control missing: ${JSON.stringify(chatter)}`);
    assert(chatter.description?.includes('Boss warnings'), 'Chatter safety description is missing');
    assert(state.settingsOverlay?.display, 'Settings debug state is missing');
    const shot = await capture(page, scenarioDir, '09-settings-chatter-frequency', 'settings');
    assert.deepEqual(observed.pageErrors, [], `${scenario.id} Settings page errors`);
    assert.deepEqual(observed.consoleErrors, [], `${scenario.id} Settings console errors`);
    return { state, chatter, shot, errors: observed };
  } finally {
    await page.close();
  }
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreview();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu', '--no-sandbox']
});

try {
  const reports = [];
  for (const scenario of scenarios) {
    const scenarioDir = path.join(outputDir, `${scenario.id}-${scenario.width}x${scenario.height}`);
    mkdirSync(scenarioDir, { recursive: true });
    const gameplay = await runGameplayScenario(browser, scenario, scenarioDir);
    const hangar = await runHangarScenario(browser, scenario, scenarioDir);
    const settings = await runSettingsScenario(browser, scenario, scenarioDir);
    reports.push({ scenario, gameplay, hangar, settings });
  }
  const report = {
    ok: reports.length === scenarios.length,
    baseUrl,
    coverage: [
      'wave messages', 'lives display', 'sector name', 'ship trait', 'powerup box',
      'compatible active-effect timers', 'permanent-upgrade notices', 'boss windups',
      'split-shot telegraph', 'support/fuel warning', 'tractor-beam-broken notice',
      'fusion/interlude queue', 'Ghost timer', 'Hangar recommendation',
      'Hangar clear stamps', 'Chatter Frequency setting', 'damage-cap preview'
    ],
    reports
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[tyrian-responsive-ui] PASS layouts=${reports.length} screenshots=${reports.length * 9} report=${path.join(outputDir, 'report.json')}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
