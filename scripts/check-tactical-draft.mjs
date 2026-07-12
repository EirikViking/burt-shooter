import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  TACTICAL_DRAFT_AUGMENTS,
  buildTacticalDraftModifiers,
  buildTacticalDraftOffers,
  getActiveTacticalAugmentIds,
  getTacticalDraftDisplayMeta,
  getTacticalDraftMeta
} from '../src/config/TacticalDraft.js';
import { SHIP_THREAT_RESPONSE_TARGETS } from '../src/config/ShipThreatResponse.js';

const host = '127.0.0.1';
const port = Number(process.env.CHECK_PORT) || await findAvailablePort(4560);
const baseUrl = process.env.CHECK_URL || `http://${host}:${port}`;
const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/tactical-draft-${timestamp()}`);

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
  throw new Error('No tactical draft check port available');
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
  throw new Error('Tactical draft preview did not start');
}

async function readState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text?.() || '{}'));
}

async function waitForPlay(page) {
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() || '{}');
    return state.scene === 'play' && state.player?.active === true;
  }, null, { timeout: 20000 });
  await page.evaluate(() => {
    const play = window.__game?.scenes?.play;
    if (play) play.debugInvincible = true;
    play?.player?.grantInvulnerability?.(120000, 'tactical_draft_check');
  });
}

function overlap(a, b, margin = 4) {
  return a.x < b.x + b.width + margin && a.x + a.width + margin > b.x &&
    a.y < b.y + b.height + margin && a.y + a.height + margin > b.y;
}

function assertDraftLayout(state, width, height, label) {
  assert(state.tacticalDraft?.active, `${label}: draft not active`);
  assert(state.tacticalDraft.offers.length === 3, `${label}: expected three offers`);
  const ids = state.tacticalDraft.offers.map((offer) => offer.id);
  assert(new Set(ids).size === 3, `${label}: duplicate offers ${ids.join(', ')}`);
  const bounds = state.tacticalDraft.offers.map((offer) => offer.bounds);
  bounds.forEach((box, index) => {
    assert(box && box.width > 80 && box.height > 80, `${label}: invalid card ${index} bounds`);
    assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 2 && box.y + box.height <= height + 2, `${label}: card ${index} outside viewport`);
  });
  for (let a = 0; a < bounds.length; a += 1) {
    for (let b = a + 1; b < bounds.length; b += 1) {
      assert(!overlap(bounds[a], bounds[b]), `${label}: cards ${a} and ${b} overlap`);
    }
  }
  const holdBounds = state.tacticalDraft.holdBounds;
  const rescanBounds = state.tacticalDraft.rescanBounds;
  assert(holdBounds && rescanBounds, `${label}: missing Draft controls`);
  assert(!overlap(holdBounds, rescanBounds), `${label}: hold and rescan controls overlap`);
  for (const box of bounds) {
    assert(!overlap(holdBounds, box, 0), `${label}: hold control overlaps a card`);
    assert(!overlap(rescanBounds, box, 0), `${label}: rescan control overlaps a card`);
  }
  state.tacticalDraft.offers.forEach((offer, index) => {
    const card = bounds[index];
    for (const [name, textBounds] of [['name', offer.nameBounds], ['description', offer.descriptionBounds], ['doctrine', offer.doctrinePreviewBounds]]) {
      assert(textBounds && textBounds.width > 0 && textBounds.height > 0, `${label}: ${name} ${index} has invalid bounds`);
      assert(textBounds.x >= card.x - 2 && textBounds.y >= card.y - 2 && textBounds.x + textBounds.width <= card.x + card.width + 2 && textBounds.y + textBounds.height <= card.y + card.height + 2, `${label}: ${name} ${index} escapes card`);
    }
    assert(offer.doctrineProjection?.afterId || offer.doctrineProjection?.consumed, `${label}: offer ${offer.id} missing doctrine forecast`);
    assert(String(offer.doctrinePreviewText || '').trim(), `${label}: offer ${offer.id} missing doctrine forecast text`);
  });
  assert(state.tacticalDraft.recommendedIndex === state.tacticalDraft.focusIndex, `${label}: recommended card should receive initial focus`);
}

const lowLifeOffers = buildTacticalDraftOffers({ seed: 'check', sectorCleared: 2, lives: 1, maxLives: 3 });
assert(TACTICAL_DRAFT_AUGMENTS.length === 32, `expected curated 32-augment pool, got ${TACTICAL_DRAFT_AUGMENTS.length}`);
const evolutionAugments = TACTICAL_DRAFT_AUGMENTS.filter((augment) => augment.maxStacks === 2);
assert(evolutionAugments.length === 16, `expected 16 repeatable evolutions, got ${evolutionAugments.length}`);
assert(evolutionAugments.every((augment) => augment.evolutionName), 'every repeatable augment needs an evolution identity');
assert(new Set(evolutionAugments.map((augment) => augment.evolutionName)).size === 16, 'evolution identities must remain unique');
assert(getTacticalDraftDisplayMeta('damage_up', 1)?.displayName === 'DAMAGE UP', 'stack I should keep its base identity');
assert(getTacticalDraftDisplayMeta('damage_up', 2)?.displayName === 'WARHEAD AUTHORITY', 'stack II should expose its evolution identity');
for (const category of ['offense', 'mobility', 'defense', 'utility']) {
  assert(TACTICAL_DRAFT_AUGMENTS.filter((augment) => augment.category === category).length === 8,
    `expected 8 ${category} augments`);
}
const newAugmentIds = [
  'phase_reactor', 'focus_lens', 'inertial_dampers', 'phase_wake', 'slipstream_coils',
  'emergency_bulkhead', 'impact_foam', 'graze_plating', 'last_light',
  'combo_anchor', 'salvage_clock', 'power_saver', 'drone_link'
];
for (const id of newAugmentIds) {
  const meta = getTacticalDraftMeta(id);
  assert(meta?.name && meta?.description && meta?.detail, `${id} missing complete player-facing metadata`);
  assert(meta?.sfx === `tactical_${id}`, `${id} missing unique tactical SFX alias`);
  assert(existsSync(path.resolve(`public/art/generated/nova-swarm/augments/nova-augment-${id}-20260711.png`)), `${id} missing generated icon`);
  assert(existsSync(path.resolve(`public/audio/sfx/nova-swarm/nova_tactical_${id}.mp3`)), `${id} missing generated SFX`);
}
const expanded = buildTacticalDraftModifiers(newAugmentIds);
for (const modifier of [
  'phaseReload', 'focusDamageMult', 'focusSpeedMult', 'phaseClearRadius', 'movingDodgeRecoveryMult',
  'lowLifeSectorShieldMs', 'hitInvulnerabilityBonusMs', 'grazeShieldThreshold', 'lowLifeDodgeRecoveryMult',
  'comboWindowBonusMs', 'pickupLifetimeMult', 'powerupDurationMult', 'droneDamageMult'
]) {
  assert(expanded[modifier] !== undefined, `expanded tactical modifiers missing ${modifier}`);
}
assert(getActiveTacticalAugmentIds(['damage_up', 'nano_patch'], ['nano_patch']).join(',') === 'damage_up',
  'consumed augments must be excluded from active modifiers');
assert(lowLifeOffers.length === 3, 'pure draft must return three offers');
assert(lowLifeOffers.some((offer) => offer.category === 'defense'), 'low-life draft must include defense');
assert(!lowLifeOffers.some((offer) => offer.id === 'nano_patch') || lowLifeOffers[0].category === 'defense', 'repair must remain in defense lane');
const followupOffers = buildTacticalDraftOffers({ seed: 'check', sectorCleared: 3, lives: 3, maxLives: 3, selectedIds: [lowLifeOffers[0].id] });
assert(followupOffers.filter((offer) => offer.currentStacks > 0).length === 1, 'follow-up draft should offer exactly one controlled evolution lane');
assert(followupOffers.filter((offer) => offer.currentStacks === 0).length === 2, 'follow-up draft should preserve two fresh choices');
const stacked = buildTacticalDraftModifiers(['damage_up', 'rapid_fire', 'double_shot', 'magnet']);
assert(stacked.damageMult > 1 && stacked.fireDelayMult < 1 && stacked.shotBonus === 1 && stacked.magnetRadiusBonus > 0, 'stacked modifiers incomplete');
const doubleDamage = buildTacticalDraftModifiers(['damage_up', 'damage_up']);
assert(doubleDamage.damageMult > 1.12 && doubleDamage.damageMult < 1.12 * 1.12, 'second stack should have diminishing returns');
const matchingTimedPickup = buildTacticalDraftModifiers(['damage_up', 'rapid_fire'], { activePowerupType: 'damage_up' });
assert(matchingTimedPickup.overlapSuppressedId === 'damage_up', 'matching timed pickup should suppress only its duplicate Draft effect');
assert(Math.abs(matchingTimedPickup.damageMult - 1) < 0.0001 && matchingTimedPickup.fireDelayMult < 1, 'matching timed pickup suppression affected unrelated Draft effects');
const evolutionOffers = buildTacticalDraftOffers({
  seed: 'evolution-proof',
  sectorCleared: 3,
  selectedIds: ['damage_up', 'speed_up'],
  lives: 3,
  maxLives: 4
});
assert(evolutionOffers.filter((offer) => offer.currentStacks === 1 && offer.nextStack === 2).length === 1,
  `sector-three Draft should contain exactly one evolution offer: ${JSON.stringify(evolutionOffers)}`);
assert(evolutionOffers.filter((offer) => offer.currentStacks === 0).length === 2,
  'sector-three Draft should preserve two fresh choices beside the evolution');
assert(evolutionOffers.find((offer) => offer.currentStacks === 1)?.evolved === true, 'stack-II offer should be marked evolved');
assert(evolutionOffers.find((offer) => offer.currentStacks === 1)?.displayName !== evolutionOffers.find((offer) => offer.currentStacks === 1)?.name,
  'stack-II offer should use a distinct evolution name');
const heldOfferId = lowLifeOffers[1].id;
const heldOffers = buildTacticalDraftOffers({
  seed: 'held-proof',
  sectorCleared: 3,
  lives: 3,
  maxLives: 4,
  excludedIds: lowLifeOffers.map((offer) => offer.id),
  heldId: heldOfferId
});
assert(heldOffers.some((offer) => offer.id === heldOfferId && offer.held === true),
  `held offer did not survive exclusion/rescan: ${JSON.stringify(heldOffers)}`);
assert(heldOffers.filter((offer) => offer.held).length === 1, 'Draft should expose exactly one held offer');

mkdirSync(outputDir, { recursive: true });
const server = await startPreview();
const browser = await chromium.launch({
  headless: true,
  executablePath: findChrome(),
  args: ['--autoplay-policy=no-user-gesture-required']
});

const consoleErrors = [];
const report = { ok: false, baseUrl, pure: { augmentCount: TACTICAL_DRAFT_AUGMENTS.length, lowLifeOffers: lowLifeOffers.map((offer) => offer.id) } };

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text()}`);
  });
  await page.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlay(page);

  await page.keyboard.down('Space');
  await page.evaluate(() => window.__game.scenes.play.openTacticalDraft({ sectorCleared: 1 }));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === true);
  await page.waitForTimeout(480);
  let heldFireState = await readState(page);
  assert(heldFireState.tacticalDraft.confirmedId === null && heldFireState.tacticalDraft.history.length === 0, 'held fire auto-confirmed a tactical draft choice');
  assert(heldFireState.tacticalDraft.inputArmed === false, 'draft armed before held fire was released');
  await page.keyboard.up('Space');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  let state = await readState(page);
  assertDraftLayout(state, 1280, 720, 'desktop');
  const firstOfferIds = state.tacticalDraft.offers.map((offer) => offer.id);
  assert(state.tacticalDraft.rescansRemaining === 1, 'fresh run should expose one Draft rescan');
  const keyboardHeldId = firstOfferIds[state.tacticalDraft.focusIndex];
  await page.keyboard.press('l');
  await page.waitForFunction((id) => JSON.parse(window.render_game_to_text()).tacticalDraft?.heldId === id, keyboardHeldId);
  state = await readState(page);
  assert(/HELD|GEHALTEN|RESERV|СОХРАН|保留|보관/i.test(state.tacticalDraft.holdLabel || ''), 'hold control did not show active state');
  await page.keyboard.press('r');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.rescansRemaining === 0);
  state = await readState(page);
  const rescannedOfferIds = state.tacticalDraft.offers.map((offer) => offer.id);
  assert(rescannedOfferIds.includes(keyboardHeldId), `rescan dropped held offer: ${rescannedOfferIds.join(', ')}`);
  assert(rescannedOfferIds.filter((id) => id !== keyboardHeldId).every((id) => !firstOfferIds.includes(id)),
    `rescan repeated an unheld prior offer: ${rescannedOfferIds.join(', ')}`);
  assert(state.tacticalDraft.offers.filter((offer) => offer.held).length === 1, 'rescan did not retain exactly one held card');
  assert(state.tacticalDraft.offers[state.tacticalDraft.recommendedIndex]?.id === keyboardHeldId, 'held offer should receive recommended focus after rescan');
  assert(/USED/i.test(state.tacticalDraft.rescanLabel || ''), 'rescan control did not show its spent state');
  const frozenTime = state.arcadeRun.runElapsedSeconds;
  await page.waitForTimeout(450);
  state = await readState(page);
  assert(Math.abs(state.arcadeRun.runElapsedSeconds - frozenTime) < 0.02, 'run clock advanced while draft was active');
  const desktopScreenshot = path.join(outputDir, 'tactical-draft-desktop.png');
  await page.screenshot({ path: desktopScreenshot });

  const keyboardTargetIndex = (state.tacticalDraft.focusIndex + 1) % state.tacticalDraft.offers.length;
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((target) => JSON.parse(window.render_game_to_text()).tacticalDraft?.focusIndex === target, keyboardTargetIndex);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });
  state = await readState(page);
  assert(state.tacticalDraft.history.length === 1, 'keyboard selection was not recorded');

  await page.evaluate(() => {
    window.__game.scenes.play.openTacticalDraft({ sectorCleared: 2 });
    window.__burtGamepadOverride = { connected: true, axes: [0, 0], buttons: [] };
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === true);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  state = await readState(page);
  assert(state.tacticalDraft.offers.some((offer) => offer.id === keyboardHeldId && offer.held), 'held card did not return in the next Draft');
  await page.evaluate(() => { window.__burtGamepadOverride.buttons[2] = { pressed: true, value: 1 }; });
  await page.waitForFunction(() => {
    const draft = JSON.parse(window.render_game_to_text()).tacticalDraft;
    return draft?.heldId === null && draft?.lastHoldSource === 'gamepad';
  });
  await page.evaluate(() => { window.__burtGamepadOverride.buttons[2] = { pressed: false, value: 0 }; });
  await page.waitForTimeout(80);
  state = await readState(page);
  const gamepadTargetIndex = (state.tacticalDraft.focusIndex + 1) % state.tacticalDraft.offers.length;
  await page.evaluate(() => { window.__burtGamepadOverride.axes = [1, 0]; });
  await page.waitForFunction((target) => JSON.parse(window.render_game_to_text()).tacticalDraft?.focusIndex === target, gamepadTargetIndex);
  await page.evaluate(() => { window.__burtGamepadOverride.axes = [0, 0]; });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__burtGamepadOverride.buttons[0] = { pressed: true, value: 1 }; });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.confirmedId, null, { timeout: 3000 });
  await page.evaluate(() => { window.__burtGamepadOverride.buttons[0] = { pressed: false, value: 0 }; });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });
  state = await readState(page);
  assert(state.tacticalDraft.history.length === 2, 'gamepad selection was not recorded');
  assert(state.tacticalDraft.heldId === null, 'held offer was not consumed after its return Draft resolved');

  await page.setViewportSize({ width: 760, height: 640 });
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    delete window.__burtGamepadOverride;
    window.__game.scenes.play.openTacticalDraft({ sectorCleared: 3 });
  });
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.compact === true);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
  state = await readState(page);
  assertDraftLayout(state, 760, 640, 'compact');
  const compactScreenshot = path.join(outputDir, 'tactical-draft-compact.png');
  await page.screenshot({ path: compactScreenshot });
  const holdTarget = state.tacticalDraft.holdBounds;
  await page.mouse.click(holdTarget.x + holdTarget.width / 2, holdTarget.y + holdTarget.height / 2);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.heldId);
  state = await readState(page);
  assert(state.tacticalDraft.lastHoldSource === 'pointer', 'pointer hold did not record its input source');
  const clickTarget = state.tacticalDraft.offers[1].bounds;
  await page.mouse.click(clickTarget.x + clickTarget.width / 2, clickTarget.y + clickTarget.height / 2);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === false, null, { timeout: 4000 });
  state = await readState(page);
  assert(state.tacticalDraft.history.length === 3, 'pointer selection was not recorded');
  const summary = await page.evaluate(() => window.__game.buildRunSummary());
  assert(summary.tacticalDraftPicks.length === 3 && summary.tacticalAugmentIds.length === 3, 'run summary did not preserve draft history');
  await page.evaluate(() => window.__game.scenes.play.setPaused(true));
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).isPaused === true);
  const pauseState = await readState(page);
  assert(/Tactical upgrades/i.test(pauseState.pauseOverlay?.tacticalDraft || ''), 'pause menu did not expose tactical loadout');
  await page.evaluate(() => window.__game.scenes.play.setPaused(false));

  const localeResults = [];
  for (const locale of ['de', 'es', 'ru', 'zh-CN', 'pt-BR', 'ko', 'ja']) {
    await page.evaluate((code) => window.__novaI18n.setLanguagePreference(code), locale);
    await page.waitForTimeout(80);
    await page.evaluate((sector) => window.__game.scenes.play.openTacticalDraft({ sectorCleared: sector }), 10 + localeResults.length);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.inputArmed === true);
    const localeState = await readState(page);
    assertDraftLayout(localeState, 760, 640, `locale-${locale}`);
    assert(localeState.tacticalDraft.title && localeState.tacticalDraft.title !== 'TACTICAL DRAFT', `locale-${locale}: tactical title remained English`);
    assert(localeState.tacticalDraft.offers.every((offer) => offer.descriptionText !== offer.descriptionSource), `locale-${locale}: tactical description remained English`);
    const localizedEvolutions = localeState.tacticalDraft.offers.filter((offer) => offer.displayNameSource !== offer.name);
    assert(localizedEvolutions.length === 1, `locale-${locale}: expected exactly one evolution offer`);
    assert(localizedEvolutions.every((offer) => offer.nameText !== offer.displayNameSource), `locale-${locale}: evolution name remained English`);
    assert(localeState.tacticalDraft.offers.every((offer) => !/BUILDS:|REINFORCES:|ONE-SHOT:/.test(offer.doctrinePreviewText || '')), `locale-${locale}: doctrine forecast remained English`);
    await page.keyboard.press('l');
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.heldId);
    const localeHeldState = await readState(page);
    assert(localeHeldState.tacticalDraft.holdLabel !== 'HELD', `locale-${locale}: hold label remained English`);
    await page.keyboard.press('l');
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.heldId === null);
    if (locale === 'de' || locale === 'ru' || locale === 'zh-CN') {
      await page.screenshot({ path: path.join(outputDir, `tactical-draft-${locale.replace('-', '_')}.png`) });
    }
    localeResults.push({ locale, title: localeState.tacticalDraft.title, offers: localeState.tacticalDraft.offers.map((offer) => offer.nameText) });
    await page.evaluate(() => window.__game.scenes.play.clearTacticalDraft('locale_check'));
  }
  await page.evaluate(() => window.__novaI18n.setLanguagePreference('en'));

  const runtimePage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await runtimePage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlay(runtimePage);
  const runtime = await runtimePage.evaluate(() => {
    const game = window.__game;
    const player = game.scenes.play.player;
    const baseline = {
      damage: player.bulletDamage,
      fireDelay: player.shootDelay,
      speed: player.speed,
      bulletSpeed: player.bulletSpeed,
      shots: player.multiShot,
      lives: game.lives
    };
    player.grantInvulnerability(5000, 'dodge_overlap_check');
    player.startDodge();
    player.dodgeDuration = 0;
    player.update(400);
    const dodgeOverlap = {
      invulnerable: player.invulnerable,
      remainingMs: player.invulnerableTime
    };
    ['damage_up', 'rapid_fire', 'speed_up', 'rail_surge', 'double_shot', 'pierce', 'blink_drive', 'magnet', 'drones', 'chain_lightning']
      .forEach((id) => player.applyRunAugment(id));
    const boosted = {
      damage: player.bulletDamage,
      fireDelay: player.shootDelay,
      speed: player.speed,
      bulletSpeed: player.bulletSpeed,
      shots: player.multiShot,
      pierce: player.bulletPierce,
      magnet: player.magnetActive,
      drones: player.dronesActive,
      chain: player.chainLightningActive,
      dodgeDelay: player.dodgeDelay
    };
    ['shield', 'ghost', 'point_defense', 'bomb', 'orbital_strike'].forEach((id) => player.applyRunAugment(id));
    const sectorStart = player.applyRunAugmentSectorStartEffects(2);
    game.lives = Math.max(1, game.lives - 1);
    const beforeRepair = game.lives;
    const nanoPatch = player.applyRunAugment('nano_patch');
    const nanoPatchAgain = player.applyRunAugment('nano_patch');
    const directOutputRatio = ((boosted.damage * boosted.shots) / boosted.fireDelay) /
      ((baseline.damage * baseline.shots) / baseline.fireDelay);
    const sectorBeforeOrdinaryPickup = {
      pointDefense: player.pointDefenseActive,
      bombShots: player.bombShotsLeft,
      orbitalCharges: player.orbitalStrikeCharges
    };
    player.applyPowerup('damage_up');
    const overlap = {
      activeType: player.activePowerup.type,
      suppressedId: player.getRunAugmentDebugState().overlapSuppressedId,
      pointDefense: player.pointDefenseActive,
      bombShots: player.bombShotsLeft,
      orbitalCharges: player.orbitalStrikeCharges
    };
    player.resetPowerups();
    const restored = {
      suppressedId: player.getRunAugmentDebugState().overlapSuppressedId,
      pointDefense: player.pointDefenseActive,
      bombShots: player.bombShotsLeft,
      orbitalCharges: player.orbitalStrikeCharges
    };
    const timedStates = player.getActivePowerupStates().map((entry) => ({
      type: entry.type,
      remainingMs: entry.remainingMs
    }));
    return {
      baseline,
      boosted,
      sectorStart,
      sectorEffects: {
        shield: player.shieldActive,
        invulnerable: player.invulnerable,
        pointDefense: player.pointDefenseActive,
        bombShots: player.bombShotsLeft,
        orbitalCharges: player.orbitalStrikeCharges
      },
      repair: { before: beforeRepair, after: game.lives, nanoPatch, nanoPatchAgain },
      directOutputRatio,
      threatResponse: game.threatResponse,
      sectorBeforeOrdinaryPickup,
      overlap,
      restored,
      timedStates,
      dodgeOverlap,
      debug: player.getRunAugmentDebugState()
    };
  });
  assert(runtime.directOutputRatio > 1.1, `combined offensive Draft did not raise direct output enough: ${runtime.directOutputRatio}`);
  assert(runtime.boosted.fireDelay < runtime.baseline.fireDelay, 'fire-rate augment did not apply');
  assert(runtime.boosted.speed > runtime.baseline.speed, 'speed augment did not apply');
  assert(runtime.boosted.bulletSpeed > runtime.baseline.bulletSpeed, 'projectile-speed augment did not apply');
  assert(runtime.boosted.shots > runtime.baseline.shots && runtime.boosted.pierce, 'multishot/pierce augments did not apply');
  assert(runtime.boosted.magnet && runtime.boosted.drones && runtime.boosted.chain, 'utility augments did not persist');
  assert(runtime.directOutputRatio <= SHIP_THREAT_RESPONSE_TARGETS.maxDirectDraftOutputMult + 0.002, `Draft direct output exceeded cap: ${runtime.directOutputRatio}`);
  assert(runtime.threatResponse.tacticalPickCount >= 10, 'threat response did not track Draft pick count');
  assert(runtime.sectorEffects.shield && runtime.sectorEffects.invulnerable && runtime.sectorEffects.pointDefense, 'defensive sector-start effects missing');
  assert(runtime.sectorEffects.bombShots >= 2 && runtime.sectorEffects.orbitalCharges >= 2, 'offensive sector-start payload missing');
  assert(runtime.repair.after === runtime.repair.before + 1, 'nano patch did not repair one life');
  assert(runtime.repair.nanoPatch.consumed === true, 'nano patch was not flagged consumed');
  assert(runtime.repair.nanoPatchAgain.applied === false && runtime.repair.nanoPatchAgain.reason === 'stack_cap', 'consumed nano patch could be applied twice');
  assert(runtime.debug.consumedIds.includes('nano_patch') && !runtime.debug.activeIds.includes('nano_patch'), 'consumed nano patch remained active');
  assert(runtime.overlap.activeType === 'damage_up' && runtime.overlap.suppressedId === 'damage_up', 'matching ordinary pickup did not take temporary priority');
  assert(runtime.overlap.pointDefense && runtime.overlap.bombShots >= 2 && runtime.overlap.orbitalCharges >= 2, 'ordinary pickup cleared Tactical sector-start tools');
  assert(runtime.restored.suppressedId === null, 'Draft effect did not return after ordinary pickup ended');
  assert(!runtime.timedStates.some((entry) => ['magnet', 'drones', 'chain_lightning'].includes(entry.type) && entry.remainingMs > 86400000),
    `permanent Draft utility leaked into timed HUD: ${JSON.stringify(runtime.timedStates)}`);
  assert(runtime.dodgeOverlap.invulnerable && runtime.dodgeOverlap.remainingMs > 3500, 'dodge end cancelled a longer invulnerability window');
  await runtimePage.close();

  const flowPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await flowPage.goto(`${baseUrl}/?autostart=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForPlay(flowPage);
  await flowPage.evaluate(() => {
    const play = window.__game.scenes.play;
    play.shouldHoldProgressionPresentation = () => false;
    play.enemyManager.isLevelComplete = () => true;
    play.enemyManager.spawning = false;
    play.enemyManager.bossDefeatedThisLevel = true;
  });
  await flowPage.waitForFunction(() => JSON.parse(window.render_game_to_text()).tacticalDraft?.active === true, null, { timeout: 10000 });
  const gatedLevel = await flowPage.evaluate(() => window.__game.level);
  assert(gatedLevel === 1, `sector advanced before tactical choice: ${gatedLevel}`);
  await flowPage.evaluate(() => window.__game.scenes.play.confirmTacticalDraft(1, 'pointer'));
  await flowPage.waitForFunction(() => window.__game.level === 2, null, { timeout: 5000 });
  const flowState = await readState(flowPage);
  assert(flowState.tacticalDraft.history.length === 1, 'automatic boss-clear draft did not retain its pick');
  await flowPage.close();

  assert(consoleErrors.length === 0, `browser errors: ${consoleErrors.join(' | ')}`);
  report.ok = true;
  report.desktop = { screenshot: desktopScreenshot };
  report.compact = { screenshot: compactScreenshot };
  report.interactionHistory = state.tacticalDraft.history;
  report.runtime = runtime;
  report.locales = localeResults;
  report.automaticBossClearGate = { gatedLevel, advancedLevel: flowState.arcadeRun.currentSector };
  report.consoleErrors = consoleErrors;
  writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[tactical-draft] PASS report=${path.join(outputDir, 'report.json')}`);
  await page.close();
} catch (error) {
  report.error = error.stack || error.message;
  report.consoleErrors = consoleErrors;
  writeFileSync(path.join(outputDir, 'failure-report.json'), JSON.stringify(report, null, 2));
  console.error(`[tactical-draft] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  if (server) server.kill();
}
