import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

const host = process.env.CHECK_HOST || '127.0.0.1';
const port = process.env.CHECK_URL ? null : (Number(process.env.CHECK_PORT) || await findAvailablePort(4524));
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ace-bounties-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
  throw new Error(`No available Ace Bounty port found starting at ${startPort}`);
}

async function canFetch(url) {
  try {
    return (await fetch(url, { cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

async function startPreviewServer() {
  if (await canFetch(baseUrl)) return null;
  const viteEntry = path.resolve('node_modules/vite/bin/vite.js');
  const command = existsSync(viteEntry) ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = existsSync(viteEntry) ? [viteEntry] : ['vite'];
  const server = spawn(command, [...args, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
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
  throw new Error(`Vite preview did not become ready at ${baseUrl}`);
}

function chromePath() {
  return [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].filter(Boolean).find((candidate) => existsSync(candidate));
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForEnemy(page) {
  await page.waitForFunction(() => window.__game?.scenes?.play?.enemyManager?.enemies?.some((enemy) => enemy?.kind === 'enemy' && !enemy.isAce && enemy.active !== false), null, { timeout: 90000 });
}

async function promoteAce(page, variantId, { protocolId = 'blitz_plating_frenzy_shield', rivalWingId = 'spearhead_standard_aimed_hold', targetWaveIndex = 0, x = null, y = null } = {}) {
  const setup = await page.evaluate(({ variantId: id, protocolId: nemesisId, rivalWingId: wingId, targetWaveIndex: wave, x: targetX, y: targetY }) => {
    const play = window.__game?.scenes?.play;
    play?.clearToastState?.();
    for (const entry of play?.enemyManager?.enemies || []) {
      if (entry?.isAce) {
        entry.isAce = false;
        entry.aceVariant = null;
        entry.nemesisProtocol = null;
        entry.rivalWingCommand = null;
        entry.aceRewardClaimed = true;
        if (entry.aceLabelPlate) entry.aceLabelPlate.visible = false;
      }
      entry.rivalWingDoctrine = null;
      entry.rivalWingMoraleActive = false;
    }
    const enemy = play?.enemyManager?.enemies?.find((entry) => entry?.kind === 'enemy' && !entry.isAce && entry.active !== false);
    if (!play || !enemy) return { ok: false, reason: 'missing_play_or_enemy' };
    play.prepareAceBountyForSector(window.__game.level || 1, { force: true, variantId: id, protocolId: nemesisId, rivalWingId: wingId, targetWaveIndex: wave, reason: 'runtime_test' });
    if (play.player) play.player.shootCooldown = 999999;
    const base = { health: enemy.health, maxHealth: enemy.maxHealth, scoreValue: enemy.scoreValue };
    const promoted = play.maybePromoteAceEnemy(enemy, { sector: window.__game.level || 1, waveIndex: wave, slotIndex: 0, count: 1 });
    if (Number.isFinite(targetX)) {
      enemy.x = targetX;
      enemy.formationX = targetX;
      enemy.sprite.x = targetX;
    }
    if (Number.isFinite(targetY)) {
      enemy.y = targetY;
      enemy.formationY = targetY;
      enemy.sprite.y = targetY;
    }
    enemy.state = 'FORMATION';
    enemy.tacticalDiveAt = null;
    enemy.tacticalDiveUsed = true;
    enemy.waitingForEntry = false;
    enemy.active = true;
    enemy.sprite.visible = true;
    enemy.sprite.renderable = true;
    enemy.updateThreatFrame?.(Date.now());
    const bounds = enemy.aceLabel?.getBounds?.();
    window.__aceRuntimeEnemy = enemy;
    return {
      ok: promoted,
      base,
      ace: structuredClone(enemy.getAceDebugState?.()),
      encounter: structuredClone(play.getAceBountyDebugState?.()),
      threatFrame: structuredClone(enemy.threatFrameLayer?._debugThreatFrame || null),
      labelBounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null
    };
  }, { variantId, protocolId, rivalWingId, targetWaveIndex, x, y });
  if (!setup.ok) return setup;
  await page.waitForTimeout(520);
  return page.evaluate((baseResult) => {
    const play = window.__game?.scenes?.play;
    const enemy = window.__aceRuntimeEnemy;
    return {
      ...baseResult,
      ace: structuredClone(enemy?.getAceDebugState?.()),
      toast: structuredClone(play?.getToastDebugState?.()?.active?.find((entry) => entry?.type === 'aceContact') || null)
    };
  }, setup);
}

mkdirSync(outputDir, { recursive: true });
const server = await startPreviewServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const failures = [];
const report = { ok: false, baseUrl, outputDir, scenarios: {}, pageErrors, consoleErrors, failures };
try {
  await page.goto(`${baseUrl}?autostart=1&offlineLeaderboard=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.scenes?.play?.player && window.__game?.scenes?.play?.enemyManager, null, { timeout: 90000 });
  await waitForEnemy(page);

  const desktop = await promoteAce(page, 'bulwark_sweep_precision', { x: 960, y: 310 });
  desktop.screenshot = path.join(outputDir, 'ace-bounty-1920x1080.png');
  await page.screenshot({ path: desktop.screenshot, fullPage: true });
  report.scenarios.desktop = desktop;
  if (!desktop.ok || desktop.encounter?.availableVariants !== 1000 || desktop.encounter?.availableProtocolVariants !== 10000 || desktop.encounter?.availableRivalWingVariants !== 10000) failures.push(`desktop encounter state missing: ${JSON.stringify(desktop)}`);
  if (desktop.ace?.id !== 'bulwark_sweep_precision' || desktop.ace?.rewardId !== 'shield') failures.push(`desktop Ace identity mismatch: ${JSON.stringify(desktop.ace)}`);
  if (desktop.ace?.protocol?.id !== 'blitz_plating_frenzy_shield' || desktop.ace?.protocol?.number !== 1) failures.push(`desktop Nemesis identity mismatch: ${JSON.stringify(desktop.ace?.protocol)}`);
  if (desktop.ace?.rivalWing?.id !== 'spearhead_standard_aimed_hold' || desktop.ace?.rivalWing?.number !== 1) failures.push(`desktop Rival Wing identity mismatch: ${JSON.stringify(desktop.ace?.rivalWing)}`);
  if (desktop.ace?.maxHealth <= desktop.base?.maxHealth) failures.push(`Ace health did not increase: ${JSON.stringify(desktop)}`);
  if (desktop.base?.scoreValue !== (await page.evaluate(() => window.__game?.scenes?.play?.enemyManager?.enemies?.find((enemy) => enemy?.isAce)?.scoreValue))) failures.push('Ace promotion changed score value');
  if (desktop.threatFrame?.tier !== 'ace' || desktop.threatFrame?.markerCount !== 8) failures.push(`Ace/Nemesis threat frame mismatch: ${JSON.stringify(desktop.threatFrame)}`);
  if (!/DESTROY ACE 0001.*2X SHIELD/.test(desktop.ace?.label || '')) failures.push(`Ace label mismatch: ${desktop.ace?.label}`);
  if ((desktop.ace?.label || '').includes('\n') || desktop.ace?.labelFontSize < 20 || desktop.ace?.labelScale < 0.82) failures.push(`Ace identity plate is not persistently readable: ${JSON.stringify(desktop.ace)}`);
  if (!desktop.labelBounds || desktop.labelBounds.x < 0 || desktop.labelBounds.x + desktop.labelBounds.width > 1920) failures.push(`desktop Ace label outside viewport: ${JSON.stringify(desktop.labelBounds)}`);
  if (
    desktop.toast?.type !== 'aceContact'
    || desktop.toast?.duration < 3900
    || desktop.toast?.protectedRemainingMs < 2500
    || desktop.toast?.dossier?.primaryFontSize < 27
    || desktop.toast?.dossier?.actionFontSize < 13
    || desktop.toast?.dossier?.panelWidth > 500
    || desktop.toast?.dossier?.panelHeight > 114
    || desktop.toast?.dossier?.screenAreaRatio > 0.04
    || desktop.toast?.dossier?.edgeAligned !== true
    || desktop.toast?.dossier?.placement !== 'left-edge'
    || desktop.toast?.dossier?.title !== 'ACE CONTRACT'
    || desktop.toast?.dossier?.action !== 'DESTROY THE GOLD-MARKED ACE'
    || desktop.toast?.dossier?.reward !== 'REWARD: 2X SHIELD'
    || !/ATTACK: PRECISION/i.test(desktop.toast?.dossier?.danger || '')
  ) failures.push(`desktop Ace action briefing hierarchy missing: ${JSON.stringify(desktop.toast)}`);
  if (!desktop.toast?.bounds || desktop.toast.bounds.x < 0 || desktop.toast.bounds.x + desktop.toast.bounds.width > 1920 || desktop.toast.bounds.y < 0 || desktop.toast.bounds.y + desktop.toast.bounds.height > 1080) failures.push(`desktop Ace dossier outside viewport: ${JSON.stringify(desktop.toast?.bounds)}`);

  const wingSetup = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const candidates = play.enemyManager.enemies.filter((entry) => entry?.kind === 'enemy' && !entry.isAce && entry.active !== false).slice(0, 2);
    return candidates.map((enemy, index) => {
      enemy.rivalWingDoctrine = null;
      const scoreValue = enemy.scoreValue;
      const applied = play.maybeApplyRivalWingEnemy(enemy, { sector: window.__game.level || 1, waveIndex: 0, slotIndex: index + 1, count: candidates.length + 1 });
      enemy.updateThreatFrame?.(Date.now());
      return { applied, scoreValue, afterScore: enemy.scoreValue, wing: enemy.getRivalWingDebugState(), frame: enemy.threatFrameLayer?._debugThreatFrame };
    });
  });
  report.scenarios.wingSetup = wingSetup;
  if (wingSetup.length < 2 || wingSetup.some((entry) => !entry.applied || entry.scoreValue !== entry.afterScore || entry.frame?.tier !== 'rival_wing')) failures.push(`Rival Wing escort setup mismatch: ${JSON.stringify(wingSetup)}`);

  const enrage = await page.evaluate(() => {
    const enemy = window.__game.scenes.play.enemyManager.enemies.find((entry) => entry?.isAce && !entry.aceRewardClaimed);
    const before = { health: enemy.health, maxHealth: enemy.maxHealth, shootDelay: enemy.shootDelay };
    enemy.takeDamage(enemy.maxHealth * 0.3);
    enemy.takeDamage(enemy.maxHealth * 0.1);
    return { before, after: structuredClone(enemy.getAceDebugState()), wings: window.__game.scenes.play.enemyManager.enemies.filter((entry) => entry?.rivalWingDoctrine).map((entry) => entry.getRivalWingDebugState()) };
  });
  report.scenarios.enrage = enrage;
  if (!enrage.after?.protocol?.enraged || enrage.after?.protocol?.enrageId !== 'frenzy') failures.push(`Nemesis enrage did not activate: ${JSON.stringify(enrage)}`);
  if (enrage.wings.length < 2 || enrage.wings.some((wing) => !wing.moraleActive)) failures.push(`Rival Wing morale did not activate: ${JSON.stringify(enrage.wings)}`);
  if (!enrage.after?.protocol?.lastDamageResolution?.guarded || enrage.after?.protocol?.lastDamageResolution?.mode !== 'flat') failures.push(`Nemesis defense did not resolve damage: ${JSON.stringify(enrage)}`);
  if (enrage.after?.health >= enrage.before?.health) failures.push(`Nemesis damage state mismatch: ${JSON.stringify(enrage)}`);

  const completion = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const enemy = play.enemyManager.enemies.find((entry) => entry?.isAce && !entry.aceRewardClaimed);
    if (!enemy) throw new Error('promoted Ace missing before completion');
    let killed = false;
    for (let hit = 0; hit < 8 && !killed; hit += 1) killed = enemy.takeDamage(99999);
    if (killed) play.onEnemyKilled(enemy);
    const duplicate = play.completeAceBounty(enemy);
    const rewardPickups = play.powerupManager?.powerups?.filter((powerup) => (
      powerup.active !== false && powerup.spawnSource === 'ace_nemesis_pair'
    )) || [];
    return {
      killed,
      duplicate,
      state: structuredClone(play.getAceBountyDebugState()),
      rewardPickups: rewardPickups.map((powerup) => ({
        type: powerup.type,
        bundledPowerupTypes: [...(powerup.bundledPowerupTypes || [])],
        rewardClaim: powerup.rewardClaim,
        rngIsolated: powerup.rngIsolated,
        lifeTimeMs: powerup.lifeTime,
        verticalSpeed: powerup.vy,
        pickupAssistRadius: powerup.pickupAssistRadius,
        x: powerup.x
      }))
    };
  });
  report.scenarios.completion = completion;
  if (!completion.killed || completion.state?.completedCount !== 1) failures.push(`Ace completion missing: ${JSON.stringify(completion)}`);
  if (
    completion.rewardPickups?.length !== 2
    || completion.rewardPickups.some((pickup) => (
      pickup.type !== 'shield'
      || pickup.bundledPowerupTypes?.length !== 0
      || pickup.rewardClaim !== true
      || pickup.lifeTimeMs < 42000
      || pickup.verticalSpeed > 0.42
      || pickup.pickupAssistRadius < 40
    ))
    || completion.rewardPickups.filter((pickup) => pickup.rngIsolated).length !== 1
    || Math.abs(completion.rewardPickups[0]?.x - completion.rewardPickups[1]?.x) < 80
  ) {
    failures.push(`Identical Ace/Nemesis rewards did not pay two claimable pickups: ${JSON.stringify(completion.rewardPickups)}`);
  }
  if (completion.duplicate !== null || completion.state?.history?.length !== 1) failures.push(`Ace bounty claimed more than once: ${JSON.stringify(completion)}`);
  completion.screenshot = path.join(outputDir, 'ace-reward-double-pickup-1920x1080.png');
  await page.screenshot({ path: completion.screenshot, fullPage: true });

  const bundledRewards = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const before = play.powerupManager.powerups.length;
    const enemy = { x: 640, y: 320, nemesisBonusRewardClaimed: false };
    const pair = play.applyAceNemesisRewards({
      protocolId: 'blitz_plating_frenzy_bomb',
      rewardKind: 'powerup',
      rewardPowerupType: 'shield',
      bonusKind: 'powerup',
      bonusPowerupType: 'bomb'
    }, enemy);
    const created = play.powerupManager.powerups.slice(before);
    const appliedTypes = [];
    const originalApplyPowerup = play.player.applyPowerup;
    play.player.applyPowerup = (type) => appliedTypes.push(type);
    try {
      created[0]?.collect(play.player, play);
    } finally {
      play.player.applyPowerup = originalApplyPowerup;
    }
    return {
      physicalPickupCount: created.length,
      pickupType: created[0]?.type || null,
      bundledPowerupTypes: [...(created[0]?.bundledPowerupTypes || [])],
      appliedTypes,
      reward: pair.reward,
      protocolReward: pair.protocolReward
    };
  });
  report.scenarios.bundledRewards = bundledRewards;
  if (bundledRewards.physicalPickupCount !== 1 || bundledRewards.pickupType !== 'shield' || bundledRewards.bundledPowerupTypes?.join(',') !== 'bomb') {
    failures.push(`Different Ace/Nemesis rewards did not share one pickup: ${JSON.stringify(bundledRewards)}`);
  }
  if (bundledRewards.appliedTypes?.join(',') !== 'shield,bomb' || !bundledRewards.reward?.bundled || !bundledRewards.protocolReward?.bundled || bundledRewards.protocolReward?.coalesced) {
    failures.push(`Bundled pickup did not apply both rewards: ${JSON.stringify(bundledRewards)}`);
  }

  const duplicateRewardRng = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const manager = play.powerupManager;
    const before = manager.powerups.length;
    const originalRandom = Math.random;
    let globalRandomCalls = 0;
    Math.random = () => {
      globalRandomCalls += 1;
      return 0.5;
    };
    let pair;
    try {
      pair = play.applyAceNemesisRewards({
        protocolId: 'rng-isolation-protocol',
        rewardKind: 'powerup',
        rewardPowerupType: 'shield',
        bonusKind: 'powerup',
        bonusPowerupType: 'shield',
        rewardSpawnKey: 'runtime:rng-isolation'
      }, { x: 700, y: 320, nemesisBonusRewardClaimed: false });
      const created = manager.powerups.slice(before);
      created.forEach((powerup) => powerup.update(1, play));
      return {
        globalRandomCalls,
        pair,
        rngIsolation: created.map((powerup) => powerup.rngIsolated)
      };
    } finally {
      Math.random = originalRandom;
      manager.powerups.slice(before).forEach((powerup) => { powerup.active = false; });
      play.cleanupSkippedFrameVisuals('ace_rng_isolation_test');
    }
  });
  report.scenarios.duplicateRewardRng = duplicateRewardRng;
  if (
    duplicateRewardRng.globalRandomCalls !== 5
    || duplicateRewardRng.rngIsolation?.join(',') !== 'false,true'
    || !duplicateRewardRng.pair?.reward?.duplicatePair
    || !duplicateRewardRng.pair?.protocolReward?.duplicatePair
  ) {
    failures.push(`second duplicate reward perturbed gameplay RNG: ${JSON.stringify(duplicateRewardRng)}`);
  }

  const spawnOwnership = await page.evaluate(() => {
    const play = window.__game.scenes.play;
    const manager = play.powerupManager;
    const before = manager.powerups.length;
    const first = manager.spawnSpecific(700, 300, 'ghost', {
      source: 'spawn_ownership_test',
      spawnKey: 'runtime:ghost-reward:one'
    });
    const duplicate = manager.spawnSpecific(720, 300, 'ghost', {
      source: 'spawn_ownership_test',
      spawnKey: 'runtime:ghost-reward:one'
    });
    const legitimateSecond = manager.spawnSpecific(740, 300, 'ghost', {
      source: 'spawn_ownership_test',
      spawnKey: 'runtime:ghost-reward:two'
    });
    const created = manager.powerups.slice(before);
    const debug = structuredClone(manager.getDebugState());
    created.forEach((powerup) => {
      powerup.active = false;
    });
    play.cleanupSkippedFrameVisuals('spawn_ownership_test');
    return {
      firstCreated: Boolean(first),
      duplicateBlocked: duplicate === null,
      legitimateSecondCreated: Boolean(legitimateSecond),
      physicalPickupCount: created.length,
      spawnIds: created.map((powerup) => powerup.spawnId),
      spawnKeys: created.map((powerup) => powerup.spawnKey),
      duplicateBlockedCount: debug.duplicateBlockedCount,
      blockedDuplicates: debug.blockedDuplicates
    };
  });
  report.scenarios.spawnOwnership = spawnOwnership;
  if (
    !spawnOwnership.firstCreated
    || !spawnOwnership.duplicateBlocked
    || !spawnOwnership.legitimateSecondCreated
    || spawnOwnership.physicalPickupCount !== 2
    || new Set(spawnOwnership.spawnIds || []).size !== 2
    || spawnOwnership.spawnKeys?.join(',') !== 'runtime:ghost-reward:one,runtime:ghost-reward:two'
    || spawnOwnership.duplicateBlockedCount < 1
  ) {
    failures.push(`logical pickup spawn ownership mismatch: ${JSON.stringify(spawnOwnership)}`);
  }

  await page.evaluate(() => {
    const play = window.__game.scenes.play;
    play.tacticalDraftRescansRemaining = 0;
    const enemy = play.enemyManager.enemies.find((entry) => entry?.kind === 'enemy' && !entry.isAce && entry.active !== false);
    if (!enemy) throw new Error('missing second enemy for rescan bounty');
    enemy.applyAceBounty('bulwark_sweep_suppressor');
    enemy.applyNemesisProtocol('blitz_damage_cap_frenzy_rescan');
    let killed = false;
    let hitCount = 0;
    while (!killed && hitCount < 8) {
      killed = enemy.takeDamage(99999);
      hitCount += 1;
    }
    if (killed) play.onEnemyKilled(enemy);
    window.__aceDamageCapRuntime = { killed, hitCount, state: enemy.getAceDebugState() };
  });
  const rescan = await page.evaluate(() => ({
    remaining: window.__game.scenes.play.tacticalDraftRescansRemaining,
    state: structuredClone(window.__game.scenes.play.getAceBountyDebugState()),
    damageCap: structuredClone(window.__aceDamageCapRuntime)
  }));
  report.scenarios.rescan = rescan;
  if (rescan.remaining !== 2 || rescan.state?.lastCompletion?.rewardId !== 'rescan' || rescan.state?.lastCompletion?.bonusId !== 'rescan') failures.push(`Ace/Nemesis rescan bounty mismatch: ${JSON.stringify(rescan)}`);
  if (!rescan.damageCap?.killed || rescan.damageCap?.hitCount < 5) failures.push(`Nemesis ablative cap did not require repeated hits: ${JSON.stringify(rescan.damageCap)}`);

  await page.setViewportSize({ width: 840, height: 640 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__novaI18n?.setLanguagePreference?.('de'));
  await page.waitForTimeout(120);
  const localized = await promoteAce(page, 'phantom_ambush_suppressor', { protocolId: 'decoy_reserve_orbit_rescan', rivalWingId: 'ambush_pressure_screen_collapse', x: 420, y: 300 });
  localized.screenshot = path.join(outputDir, 'ace-bounty-840x640-de.png');
  await page.screenshot({ path: localized.screenshot, fullPage: true });
  report.scenarios.localized = localized;
  if (!localized.ok || !/ZERSTOERE ASS 1000.*2-FACH EXTRA-NEUSCAN/.test(localized.ace?.label || '')) failures.push(`German Ace label mismatch: ${localized.ace?.label}`);
  if (!/NEMESIS 10000/.test(localized.toast?.dossier?.protocol || '') || localized.ace?.protocol?.number !== 10000) failures.push(`German Nemesis dossier mismatch: ${localized.toast?.dossier?.protocol}`);
  if (!/RIVALEN-STAFFEL 10000/.test(localized.toast?.dossier?.wing || '') || localized.ace?.rivalWing?.number !== 10000) failures.push(`German Rival Wing dossier mismatch: ${localized.toast?.dossier?.wing}`);
  if (/ACE|BOUNTY|REWARD/.test(localized.ace?.label || '')) failures.push(`German Ace label retained English copy: ${localized.ace?.label}`);
  if (!localized.labelBounds || localized.labelBounds.x < 0 || localized.labelBounds.x + localized.labelBounds.width > 840 || localized.labelBounds.y < 0) failures.push(`compact localized Ace label outside viewport: ${JSON.stringify(localized.labelBounds)}`);
  if (
    localized.toast?.type !== 'aceContact'
    || localized.toast?.duration < 3900
    || localized.toast?.dossier?.primaryFontSize < 23
    || localized.toast?.dossier?.actionFontSize < 12
    || localized.toast?.dossier?.panelWidth > 460
    || localized.toast?.dossier?.panelHeight > 108
    || localized.toast?.dossier?.screenAreaRatio > 0.13
    || localized.toast?.dossier?.placement !== 'upper-center-edge-safe'
    || localized.toast?.dossier?.title !== 'ASS-AUFTRAG'
    || localized.toast?.dossier?.action !== 'ZERSTOERE DAS GOLDMARKIERTE ASS'
    || !/ANGRIFF:/.test(localized.toast?.dossier?.danger || '')
    || /ACE CONTRACT|DESTROY|ATTACK:/.test(`${localized.toast?.dossier?.title || ''} ${localized.toast?.dossier?.action || ''} ${localized.toast?.dossier?.danger || ''}`)
  ) failures.push(`compact localized Ace action briefing hierarchy missing: ${JSON.stringify(localized.toast)}`);
  if (!localized.toast?.bounds || localized.toast.bounds.x < 0 || localized.toast.bounds.x + localized.toast.bounds.width > 840 || localized.toast.bounds.y < 0 || localized.toast.bounds.y + localized.toast.bounds.height > 640) failures.push(`compact localized Ace dossier outside viewport: ${JSON.stringify(localized.toast?.bounds)}`);

  const textState = await readState(page);
  report.scenarios.textState = {
    aceBounties: textState.aceBounties,
    visibleAce: textState.visibleEnemies?.find((enemy) => enemy.ace)?.ace || null
  };
  if (textState.aceBounties?.availableVariants !== 1000 || textState.aceBounties?.availableProtocolVariants !== 10000 || textState.aceBounties?.availableRivalWingVariants !== 10000) failures.push(`render_game_to_text missing encounter catalogs: ${JSON.stringify(textState.aceBounties)}`);
  if (!textState.visibleEnemies?.some((enemy) => enemy.ace?.number === 1000 && enemy.ace?.protocol?.number === 10000 && enemy.ace?.rivalWing?.number === 10000)) failures.push('render_game_to_text missing visible encounter identity');

  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join('; ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join('; ')}`);
  report.ok = failures.length === 0;
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) throw new Error(`[ace-bounty-runtime] ${failures.join('; ')}`);
  console.log(`[ace-nemesis-runtime] PASS output=${outputDir}`);
} finally {
  await browser.close();
  if (server) server.kill();
}
