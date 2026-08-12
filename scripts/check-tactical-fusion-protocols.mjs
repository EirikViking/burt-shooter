import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  TACTICAL_FUSION_PROTOCOLS,
  buildTacticalDraftModifiers,
  getActiveTacticalFusionProtocols
} from '../src/config/TacticalDraft.js';

const host = '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findAvailablePort(4780);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/tactical-fusions-${timestamp()}`);

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
  throw new Error('No Tactical Fusion check port available');
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

async function startPreview() {
  if (await canFetch(baseUrl)) return null;
  const vite = path.resolve('node_modules/vite/bin/vite.js');
  const server = spawn(process.execPath, [vite, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  server.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await canFetch(baseUrl)) return server;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  server.kill();
  throw new Error('Tactical Fusion preview did not start');
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

const expectedIds = ['rift_reprisal', 'drone_constellation', 'aegis_reactor', 'sky_verdict'];
assert(TACTICAL_FUSION_PROTOCOLS.length === 4, `expected four Fusion Protocols, got ${TACTICAL_FUSION_PROTOCOLS.length}`);
assert(new Set(TACTICAL_FUSION_PROTOCOLS.map((fusion) => fusion.id)).size === 4, 'Fusion Protocol ids must be unique');
assert(TACTICAL_FUSION_PROTOCOLS.every((fusion) => fusion.requiredIds.length === 2), 'every Fusion Protocol must require exactly two deliberate picks');
assert(TACTICAL_FUSION_PROTOCOLS.every((fusion) => fusion.name && fusion.description && fusion.detail), 'every Fusion Protocol needs complete player-facing metadata');
assert(!/scoreMult|scoreMultiplier|comboWindow/i.test(JSON.stringify(TACTICAL_FUSION_PROTOCOLS)), 'Fusion Protocol metadata must not grant a score multiplier');
const allRequiredIds = TACTICAL_FUSION_PROTOCOLS.flatMap((fusion) => fusion.requiredIds);
const activeFusions = getActiveTacticalFusionProtocols(allRequiredIds);
assert(activeFusions.map((fusion) => fusion.id).join(',') === expectedIds.join(','), 'complete augment set did not activate all Fusion Protocols');
const modifiers = buildTacticalDraftModifiers(allRequiredIds);
for (const id of expectedIds) assert(modifiers.fusionIds.includes(id), `${id} missing from modifier fusion ids`);
assert(modifiers.riftReprisal && modifiers.droneConstellation && modifiers.aegisReactor && modifiers.skyVerdict, 'Fusion mechanic flags are incomplete');
assert(getActiveTacticalFusionProtocols(['phase_reactor']).length === 0, 'a single augment activated a Fusion Protocol');

mkdirSync(outputDir, { recursive: true });
const server = await startPreview();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const errors = [];
const report = { ok: false, baseUrl, outputDir, static: { expectedIds, allRequiredIds }, states: {}, screenshots: {}, errors };

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => {
    localStorage.setItem('burt_first_run_completed', 'true');
    localStorage.setItem('burt_voice_enabled', 'false');
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
    play.debugInvincible = true;
    play.player?.grantInvulnerability?.(120000, 'tactical_fusion_check');
    play.clearSectorArrivalStinger?.();
    play.player.runAugmentIds = [];
    play.player.consumedRunAugmentIds = [];
    play.player.runAugmentModifiers = {};
    play.player.recalculateStats();
  });

  const riftUnlock = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    player.applyRunAugment('phase_reactor');
    const result = player.applyRunAugment('phase_wake');
    play.overrunMilestoneInterlude = { active: true };
    play.showTacticalFusionUnlock(result.newFusions[0]);
    const blocked = {
      active: Boolean(play.activeTacticalFusionUnlock),
      pending: play.pendingTacticalFusionUnlocks?.map((entry) => entry.fusion?.id) || []
    };
    play.overrunMilestoneInterlude = null;
    const flushed = play.flushPendingTacticalFusionUnlock?.() === true;
    play.hud?.update?.();
    return {
      newFusionIds: result.newFusionIds,
      fusionIds: result.fusionIds,
      blocked,
      flushed,
      hud: structuredClone(play.hud?.tacticalAugmentGroup?._debugTacticalAugments || null)
    };
  });
  assert(riftUnlock.newFusionIds.join(',') === 'rift_reprisal', `Rift unlock mismatch: ${JSON.stringify(riftUnlock)}`);
  assert(riftUnlock.blocked?.active === false && riftUnlock.blocked?.pending?.[0] === 'rift_reprisal', 'Fusion unlock should queue behind the Overrun interlude');
  assert(riftUnlock.flushed === true, 'queued Fusion unlock should release after the Overrun interlude closes');
  assert(riftUnlock.hud?.fusionCount === 1 && riftUnlock.hud?.visibleEntries?.[0] === 'rift_reprisal', 'Rift Fusion is not visible first in the HUD tray');
  await page.waitForTimeout(280);
  report.states.riftUnlock = await readState(page);
  assert(report.states.riftUnlock.tacticalDraft?.fusionUnlock?.active === true, 'Fusion unlock presentation is not active');
  assert(report.states.riftUnlock.tacticalDraft?.fusionUnlock?.scoreNeutral === true, 'Fusion unlock presentation lost score-neutral contract');
  assert(report.states.riftUnlock.tacticalDraft?.fusionUnlock?.visualLanguage === 'fusion_signature_v3_authored_frame', 'Fusion unlock did not use the authored protocol frame');
  assert(report.states.riftUnlock.tacticalDraft?.fusionUnlock?.emblemId === 'rift_reprisal', 'Rift Reprisal did not receive its unique emblem');
  assert(report.states.riftUnlock.tacticalDraft?.fusionUnlock?.rayCount === 0, 'Fusion unlock retained primitive radial rays');
  report.screenshots.unlock = path.join(outputDir, '01-fusion-protocol-online.png');
  await page.screenshot({ path: report.screenshots.unlock });
  await page.evaluate(() => window.__game.scenes.play.clearTacticalFusionUnlock?.('mechanic_capture'));

  const riftRuntime = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    const manager = play.bulletManager;
    manager.enemyBullets.forEach((bullet) => {
      bullet.active = false;
      bullet.sprite?.parent?.removeChild?.(bullet.sprite);
    });
    manager.enemyBullets = [];
    manager.playerBullets.forEach((bullet) => {
      bullet.active = false;
      bullet.sprite?.parent?.removeChild?.(bullet.sprite);
    });
    manager.playerBullets = [];
    player.shootCooldown = 0;
    const BulletClass = player.shoot()[0].constructor;
    for (let index = 0; index < 7; index += 1) {
      const angle = (Math.PI * 2 * index) / 7;
      manager.addEnemyBullet(new BulletClass(
        player.x + Math.cos(angle) * 38,
        player.y + Math.sin(angle) * 38,
        0,
        0.2,
        1,
        0xff3355,
        false,
        { warningColor: 0xff3355 }
      ));
    }
    player.startDodge();
    const duringDodgeBullets = manager.enemyBullets.filter((bullet) => bullet.active !== false).length;
    player.finishDodge('duration');
    return {
      duringDodgeBullets,
      enemyBullets: manager.enemyBullets.filter((bullet) => bullet.active !== false).length,
      riftShards: manager.playerBullets.filter((bullet) => bullet.isTacticalRiftShard).length,
      event: structuredClone(player.lastTacticalFusionEvent),
      stats: structuredClone(player.tacticalFusionStats)
    };
  });
  assert(riftRuntime.duringDodgeBullets === 7, `Rift Reprisal cleared bullets before Phase exit: ${JSON.stringify(riftRuntime)}`);
  assert(riftRuntime.enemyBullets === 0, `Rift Reprisal failed to clear Phase bullets: ${JSON.stringify(riftRuntime)}`);
  assert(riftRuntime.riftShards === 5 && riftRuntime.event?.projectileCount === 5, `Rift Reprisal return-fire cap failed: ${JSON.stringify(riftRuntime)}`);
  report.states.riftRuntime = riftRuntime;
  report.screenshots.rift = path.join(outputDir, '02-rift-reprisal.png');
  await page.screenshot({ path: report.screenshots.rift });

  const droneRuntime = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    player.applyRunAugment('drones');
    const result = player.applyRunAugment('drone_link');
    player.shootCooldown = 0;
    player.traitShotCounter = 3;
    const bullets = player.shoot();
    bullets.forEach((bullet) => play.bulletManager.addPlayerBullet(bullet));
    const constellation = bullets.filter((bullet) => bullet.tacticalFusionId === 'drone_constellation');
    return {
      newFusionIds: result.newFusionIds,
      activeDrones: player.drones.length,
      constellationShots: constellation.length,
      originKinds: constellation.map((bullet) => bullet.tacticalFusionOriginKind),
      originXs: constellation.map((bullet) => Math.round(bullet.x)),
      dronesBelowHull: player.drones.every((drone) =>
        player.sprite.getChildIndex(drone) < player.sprite.getChildIndex(player.shipSprite)
      ),
      event: structuredClone(player.lastTacticalFusionEvent)
    };
  });
  assert(droneRuntime.newFusionIds.join(',') === 'drone_constellation', `Drone Fusion unlock mismatch: ${JSON.stringify(droneRuntime)}`);
  assert(droneRuntime.activeDrones >= 1 && droneRuntime.constellationShots >= 2, `Drone Constellation did not create crossfire: ${JSON.stringify(droneRuntime)}`);
  assert(droneRuntime.originKinds.filter((kind) => kind === 'mirrored_echo').length === 2, `one-drone Constellation did not create mirrored origins: ${JSON.stringify(droneRuntime)}`);
  assert(new Set(droneRuntime.originXs).size >= 2, `one-drone Constellation origins did not separate: ${JSON.stringify(droneRuntime)}`);
  assert(droneRuntime.dronesBelowHull === true, `permanent drones should render below the player hull: ${JSON.stringify(droneRuntime)}`);
  report.states.droneRuntime = droneRuntime;
  report.screenshots.drone = path.join(outputDir, '03-drone-constellation.png');
  await page.screenshot({ path: report.screenshots.drone });

  const aegisRuntime = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    player.applyRunAugment('shield');
    const result = player.applyRunAugment('point_defense');
    const manager = play.bulletManager;
    manager.enemyBullets.forEach((bullet) => {
      bullet.active = false;
      bullet.sprite?.parent?.removeChild?.(bullet.sprite);
    });
    manager.enemyBullets = [];
    player.shootCooldown = 0;
    const BulletClass = player.shoot()[0].constructor;
    for (let index = 0; index < 6; index += 1) {
      manager.addEnemyBullet(new BulletClass(player.x - 45 + index * 18, player.y - 34, 0, 0.1, 1, 0xff3355, false));
    }
    player.activateShield(12000);
    play.debugInvincible = false;
    const tookDamage = player.takeDamage();
    play.debugInvincible = true;
    return {
      newFusionIds: result.newFusionIds,
      tookDamage,
      shieldActive: player.shieldActive,
      pointDefenseActive: player.pointDefenseActive,
      enemyBullets: manager.enemyBullets.filter((bullet) => bullet.active !== false).length,
      event: structuredClone(player.lastTacticalFusionEvent)
    };
  });
  assert(aegisRuntime.newFusionIds.join(',') === 'aegis_reactor', `Aegis Fusion unlock mismatch: ${JSON.stringify(aegisRuntime)}`);
  assert(aegisRuntime.tookDamage === false && !aegisRuntime.shieldActive && aegisRuntime.pointDefenseActive, `Aegis Reactor survival transition failed: ${JSON.stringify(aegisRuntime)}`);
  assert(aegisRuntime.enemyBullets === 0 && aegisRuntime.event?.cleared === 6, `Aegis Reactor purge failed: ${JSON.stringify(aegisRuntime)}`);
  report.states.aegisRuntime = aegisRuntime;
  report.screenshots.aegis = path.join(outputDir, '04-aegis-reactor.png');
  await page.screenshot({ path: report.screenshots.aegis });

  const skyRuntime = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    const fusionTarget = {
      active: true,
      waitingForEntry: false,
      kind: 'fusion_check_target',
      type: 'fusion_check_target',
      x: Math.max(90, player.x - 80),
      y: Math.min(play.gameplayGame.getHeight() - 120, Math.max(180, player.y - 260)),
      radius: 16,
      health: 9999,
      maxHealth: 9999,
      scoreValue: 0,
      update() {},
      canShoot() { return false; },
      takeDamage(damage) {
        this.health -= Math.max(0, Number(damage) || 0);
        return false;
      }
    };
    play.enemyManager.enemies.push(fusionTarget);
    play.enemyManager.state = 'WAVE_ACTIVE';
    play.enemyManager.phase = 'WAVES';
    play.pendingEnemyStartTimeout = null;
    play.introActive = false;
    player.applyRunAugment('bomb');
    const result = player.applyRunAugment('orbital_strike');
    player.orbitalStrikeActive = true;
    player.orbitalStrikeCharges = 2;
    player.tacticalOrbitalStrikeCharges = 2;
    player.bombShotsLeft = 1;
    player.bombMaxShots = 1;
    play.orbitalStrikeTimer = 2490;
    play.updateOrbitalStrike(10);
    const chargesAfterSuppressedTimer = player.orbitalStrikeCharges;
    player.bombArmedAt = player.getGameplayClockMs() - 1;
    const bombQueued = player.queueBombTriggerIntent();
    player.shootCooldown = 0;
    const bomb = player.shoot()[0];
    bomb.x = fusionTarget.x;
    bomb.y = fusionTarget.y;
    const target = { x: bomb.x, y: bomb.y };
    const detonated = play.detonateBombBullet(bomb, 'fusion_check');
    const chargesAfterBomb = player.orbitalStrikeCharges;
    const markerOrbitalDebug = structuredClone(play.lastOrbitalStrikeDebug);
    player.bombShotsLeft = 0;
    play.orbitalStrikeTimer = 2490;
    play.updateOrbitalStrike(10);
    const chargesAfterFallback = player.orbitalStrikeCharges;
    const fallbackOrbitalDebug = structuredClone(play.lastOrbitalStrikeDebug);
    play.showTacticalFusionUnlock(result.newFusions[0]);
    play.hud?.update?.();
    return {
      newFusionIds: result.newFusionIds,
      chargesAfterSuppressedTimer,
      chargesAfterBomb,
      chargesAfterFallback,
      bombQueued,
      detonated,
      target,
      markerOrbitalDebug,
      fallbackOrbitalDebug,
      hud: structuredClone(play.hud?.tacticalAugmentGroup?._debugTacticalAugments || null)
    };
  });
  assert(skyRuntime.newFusionIds.join(',') === 'sky_verdict', `Sky Fusion unlock mismatch: ${JSON.stringify(skyRuntime)}`);
  assert(skyRuntime.chargesAfterSuppressedTimer === 2, 'Sky Verdict did not suppress random automatic targeting');
  assert(skyRuntime.bombQueued, `Sky Verdict test bomb did not pass the current guarded Bomb commit path: ${JSON.stringify(skyRuntime)}`);
  assert(skyRuntime.detonated && skyRuntime.chargesAfterBomb === 1, `Sky Verdict did not spend exactly one charge: ${JSON.stringify(skyRuntime)}`);
  assert(skyRuntime.markerOrbitalDebug?.fusionId === 'sky_verdict', `Sky Verdict did not mark the forced orbital strike: ${JSON.stringify(skyRuntime)}`);
  assert(skyRuntime.markerOrbitalDebug?.targetX === Math.round(skyRuntime.target.x) && skyRuntime.markerOrbitalDebug?.targetY === Math.round(skyRuntime.target.y), 'Sky Verdict beam did not use the bomb marker');
  assert(skyRuntime.chargesAfterFallback === 0, `Sky Verdict did not spend its no-Bomb fallback charge: ${JSON.stringify(skyRuntime)}`);
  assert(skyRuntime.fallbackOrbitalDebug?.fusionId === 'sky_verdict' && skyRuntime.fallbackOrbitalDebug?.deterministicTarget === true,
    `Sky Verdict no-Bomb fallback was not deterministic: ${JSON.stringify(skyRuntime)}`);
  assert(skyRuntime.hud?.fusionCount === 4, `HUD did not expose all four Fusion Protocols: ${JSON.stringify(skyRuntime.hud)}`);
  report.states.skyRuntime = skyRuntime;
  await page.waitForTimeout(180);
  report.screenshots.sky = path.join(outputDir, '05-sky-verdict.png');
  await page.screenshot({ path: report.screenshots.sky });
  await page.waitForTimeout(520);
  const afterStrike = await readState(page);
  assert(afterStrike.tacticalAugments?.lastFusionEvent?.id === 'sky_verdict', `Sky Verdict completion missing from text state: ${JSON.stringify(afterStrike.tacticalAugments)}`);
  assert(afterStrike.tacticalAugments?.fusionStats?.skyVerdicts === 2, 'Sky Verdict marker plus fallback completion count mismatch');
  report.states.afterStrike = afterStrike.tacticalAugments;
  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.enemyManager.enemies
      .filter((enemy) => enemy?.kind === 'fusion_check_target')
      .forEach((enemy) => { enemy.active = false; });
    play.enemyManager.enemies = play.enemyManager.enemies.filter((enemy) => enemy?.kind !== 'fusion_check_target');
  });

  const emergencySky = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    const target = {
      active: true,
      waitingForEntry: false,
      kind: 'emergency_sky_target',
      type: 'emergency_sky_target',
      x: player.x,
      y: Math.min(play.gameplayGame.getHeight() - 120, Math.max(180, player.y - 240)),
      radius: 16,
      health: 9999,
      maxHealth: 9999,
      scoreValue: 0,
      update() {},
      canShoot() { return false; },
      takeDamage(damage) { this.health -= Math.max(0, Number(damage) || 0); return false; }
    };
    play.enemyManager.enemies.push(target);
    player.applyRunAugmentSectorStartEffects(2);
    player.orbitalStrikeCharges = 0;
    player.tacticalOrbitalStrikeCharges = 0;
    const makeBomb = () => ({
      active: true,
      isBomb: true,
      bombDetonated: false,
      x: target.x,
      y: target.y,
      radius: 8,
      blastRadius: 120,
      damage: 1
    });
    const first = play.detonateBombBullet(makeBomb(), 'emergency_sky_first');
    const firstDebug = structuredClone(play.lastOrbitalStrikeDebug);
    const stateAfterFirst = player.skyVerdictEmergencyState;
    const second = play.detonateBombBullet(makeBomb(), 'emergency_sky_rapid_repeat');
    const stateAfterSecond = player.skyVerdictEmergencyState;
    play.hud?.update?.();
    const hud = structuredClone(play.hud?.tacticalAugmentGroup?._debugTacticalAugments || null);
    return { first, second, firstDebug, stateAfterFirst, stateAfterSecond, hud };
  });
  assert(emergencySky.first && emergencySky.second, `Sky emergency bomb detonation path failed: ${JSON.stringify(emergencySky)}`);
  assert(emergencySky.firstDebug?.emergency === true && emergencySky.firstDebug?.consumeCharge === false
    && emergencySky.firstDebug?.damageScale === 0.55 && emergencySky.firstDebug?.radiusScale === 0.72,
  `Sky emergency beam was not reduced and charge-free: ${JSON.stringify(emergencySky)}`);
  assert(emergencySky.stateAfterFirst === 'reserved' && emergencySky.stateAfterSecond === 'reserved',
    `Sky emergency state was not held exclusively during its warning: ${JSON.stringify(emergencySky)}`);
  await page.waitForTimeout(540);
  const emergencySkyAfterImpact = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const player = play.player;
    play.hud?.update?.();
    const result = {
      state: player.skyVerdictEmergencyState,
      debug: structuredClone(play.lastOrbitalStrikeDebug),
      hud: structuredClone(play.hud?.tacticalAugmentGroup?._debugTacticalAugments || null)
    };
    play.enemyManager.enemies
      .filter((enemy) => enemy?.kind === 'emergency_sky_target')
      .forEach((enemy) => { enemy.active = false; });
    play.enemyManager.enemies = play.enemyManager.enemies.filter((enemy) => enemy?.kind !== 'emergency_sky_target');
    return result;
  });
  assert(emergencySkyAfterImpact.state === 'spent' && emergencySkyAfterImpact.debug?.released === true,
    `Sky emergency did not commit SPENT at impact: ${JSON.stringify(emergencySkyAfterImpact)}`);
  assert(emergencySkyAfterImpact.hud?.entries?.some((entry) => entry.id === 'sky_verdict' && /SPENT/.test(entry.name || '')),
    `Sky emergency spent state was not visible in the HUD: ${JSON.stringify(emergencySkyAfterImpact.hud)}`);
  report.states.emergencySky = { ...emergencySky, afterImpact: emergencySkyAfterImpact };

  const loadoutState = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.clearTacticalFusionUnlock?.('loadout_check');
    play.setPaused(true);
    play.openTacticalLoadoutOverlay();
    const overlay = play.tacticalLoadoutOverlay;
    overlay.pageIndex = overlay.getDebugState().pageCount - 1;
    overlay.rebuild();
    const modalParent = overlay.container.parent;
    const cornerToast = play.activeCornerToast;
    const modalIndex = modalParent?.getChildIndex?.(overlay.container) ?? -1;
    const cornerToastIndex = cornerToast?.parent === modalParent
      ? modalParent.getChildIndex(cornerToast)
      : -1;
    return {
      ...structuredClone(overlay.getDebugState()),
      modalLayer: {
        parentIsSceneContainer: modalParent === play.container,
        modalIndex,
        cornerToastIndex,
        aboveCornerToast: cornerToastIndex < 0 || modalIndex > cornerToastIndex
      }
    };
  });
  const fusionItems = loadoutState.items.filter((item) => item.category === 'fusion');
  assert(fusionItems.length === 4, `loadout did not expose four Fusion Protocol cards: ${JSON.stringify(fusionItems)}`);
  assert(fusionItems.every((item) => item.translatedName && item.translatedDescription), 'Fusion Protocol loadout cards are missing localized text');
  assert(loadoutState.visibleIds.filter((id) => expectedIds.includes(id)).length === 4, `final loadout page did not show all Fusion cards: ${loadoutState.visibleIds.join(',')}`);
  assert(loadoutState.modalLayer?.parentIsSceneContainer, `Tactical loadout modal is not hosted on the scene root: ${JSON.stringify(loadoutState.modalLayer)}`);
  assert(loadoutState.modalLayer?.aboveCornerToast, `Tactical loadout modal can be covered by an active corner toast: ${JSON.stringify(loadoutState.modalLayer)}`);
  report.states.loadout = loadoutState;
  report.screenshots.loadout = path.join(outputDir, '06-fusion-loadout.png');
  await page.screenshot({ path: report.screenshots.loadout });

  assert(errors.length === 0, `runtime errors: ${errors.join(' | ')}`);
  report.ok = true;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[check-tactical-fusions] PASS protocols=4 screenshots=${Object.keys(report.screenshots).length} output=${outputDir}`);
} catch (error) {
  report.error = error?.stack || String(error);
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  throw error;
} finally {
  await browser.close();
  server?.kill();
}
