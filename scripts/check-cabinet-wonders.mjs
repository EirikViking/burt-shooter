import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CABINET_WONDER_CATALOG,
  CABINET_WONDER_SECTOR_CADENCE,
  CABINET_WONDER_VARIANT_COUNT,
  evaluateCabinetWonder,
  getCabinetWonderChance
} from '../src/game/CabinetWonders.js';

assert.equal(CABINET_WONDER_VARIANT_COUNT, 60, 'Cabinet Wonders must ship sixty distinct discoveries');
assert.equal(new Set(CABINET_WONDER_CATALOG.map((entry) => entry.id)).size, 60, 'Cabinet Wonder IDs must be unique');
assert.equal(new Set(CABINET_WONDER_CATALOG.map((entry) => entry.title)).size, 60, 'Cabinet Wonder titles must be unique');
assert.ok(CABINET_WONDER_CATALOG.every((entry) => entry.palette.length === 3 && entry.pitchScale > 0), 'each wonder needs a visual palette and audio identity');
assert.ok(CABINET_WONDER_CATALOG.every((entry) => entry.history.length >= 500), 'each wonder needs a substantial authored Codex history');
assert.ok(CABINET_WONDER_CATALOG.every((entry) => entry.fieldNote.length >= 40), 'each wonder needs a useful field note');
assert.ok(CABINET_WONDER_CATALOG.every((entry) => entry.art?.includes('/cabinet-wonders/')), 'each wonder needs dedicated generated art');
assert.ok(CABINET_WONDER_CATALOG.every((entry) => entry.artFit === undefined), 'Cabinet Wonder fitting must be universal rather than maintained as fragile per-art exceptions');
assert.ok(
  CABINET_WONDER_CATALOG.every((entry) => existsSync(path.resolve('public', entry.art.replace(/^\/+/, '')))),
  'every Cabinet Wonder art path must resolve to a packaged file'
);
const wonderRevelationPath = path.resolve('public/audio/sfx/nova-swarm/nova_wonder_revelation.mp3');
assert.ok(existsSync(wonderRevelationPath), 'dedicated ElevenLabs Cabinet Wonder revelation SFX is missing');

assert.equal(evaluateCabinetWonder('test', { sector: 4, waveNumber: 3, hasUpcomingWave: false }).reason, 'no_safe_transition');
assert.equal(evaluateCabinetWonder('test', { sector: 4, waveNumber: 3, hasUpcomingWave: true, isChallenge: true }).reason, 'challenge_transition');
assert.equal(evaluateCabinetWonder('test', { sector: 4, waveNumber: 3, hasUpcomingWave: true, busyTransition: true }).reason, 'busy_transition');
assert.equal(evaluateCabinetWonder('test', { sector: 1, waveNumber: 1, hasUpcomingWave: true }).reason, 'early_run');
assert.equal(evaluateCabinetWonder('test', { sector: 3, waveNumber: 3, hasUpcomingWave: true, sectorAlreadyShown: true }).reason, 'already_shown_this_sector');

const forced = evaluateCabinetWonder('test', {
  debugForce: true,
  forceVariantId: 'starwhale_constellation',
  sector: 1,
  waveNumber: 1
});
assert.equal(forced.triggered, true);
assert.equal(forced.variant.id, 'starwhale_constellation');
assert.equal(forced.scoreNeutral, true);
assert.equal(forced.gameplayNeutral, true);

assert.equal(CABINET_WONDER_SECTOR_CADENCE, 3, 'Cabinet Wonders should arrive every third sector');
assert.equal(getCabinetWonderChance({ sector: 2, eligibleChecks: 1 }), 0);
assert.equal(getCabinetWonderChance({ sector: 3, eligibleChecks: 1 }), 1);
assert.equal(getCabinetWonderChance({ sector: 6, eligibleChecks: 99 }), 1);
assert.equal(getCabinetWonderChance({ sector: 7, eligibleChecks: 99 }), 0);

const originalRandom = Math.random;
let globalRandomCalls = 0;
Math.random = () => {
  globalRandomCalls += 1;
  return 0.5;
};
try {
  evaluateCabinetWonder('rng-isolation', {
    sector: 6,
    waveNumber: 4,
    eligibleChecks: 9,
    hasUpcomingWave: true
  });
} finally {
  Math.random = originalRandom;
}
assert.equal(globalRandomCalls, 0, 'Cabinet Wonder planning must not consume global gameplay RNG');

const triggered = evaluateCabinetWonder('deterministic-cadence', {
  sector: 6,
  waveNumber: 4,
  eligibleChecks: 9,
  hasUpcomingWave: true,
  recentVariantIds: CABINET_WONDER_CATALOG.slice(0, 12).map((entry) => entry.id)
});
assert.ok(triggered.triggered, 'cadence sector should produce a valid wonder');
assert.ok(!CABINET_WONDER_CATALOG.slice(0, 12).some((entry) => entry.id === triggered.variant.id), 'wonder planner should avoid recent variants');
assert.deepEqual(evaluateCabinetWonder('deterministic-cadence', {
  sector: 6,
  waveNumber: 4,
  eligibleChecks: 9,
  hasUpcomingWave: true,
  recentVariantIds: CABINET_WONDER_CATALOG.slice(0, 12).map((entry) => entry.id)
}), triggered, 'wonder planning must be deterministic and must not consume gameplay RNG');

const enemyManagerSource = readFileSync(new URL('../src/managers/EnemyManager.js', import.meta.url), 'utf8');
assert.match(
  enemyManagerSource,
  /isChallenge:\s*Boolean\(clearedWave\?\.isChallenge \|\| this\.waves\[transitionWaveIndex \+ 1\]\?\.isChallenge\)/,
  'Cabinet Wonders must stay out of both completed and upcoming challenge-flight transitions'
);

const playSceneSource = readFileSync(new URL('../src/scenes/PlayScene.js', import.meta.url), 'utf8');
const powerupManagerSource = readFileSync(new URL('../src/managers/PowerupManager.js', import.meta.url), 'utf8');
const soundCatalogSource = readFileSync(new URL('../src/audio/SoundCatalog.js', import.meta.url), 'utf8');
assert.match(
  playSceneSource,
  /const width = Math\.max\(320, Number\(this\.gameplayGame\?\.getWidth\?\.\(\)\)/,
  'Cabinet Wonders must use the scaled gameplay coordinate space instead of outer-window dimensions'
);
assert.match(
  playSceneSource,
  /const CABINET_WONDER_WIDTH_RATIO = 0\.4416;[\s\S]{0,180}const CABINET_WONDER_HEIGHT_RATIO = 0\.3312;[\s\S]{0,180}const CABINET_WONDER_MAX_WIDTH = 773;[\s\S]{0,180}const CABINET_WONDER_MAX_HEIGHT = 331;/,
  'Cabinet Wonders must use the user-approved additional 15% enlargement: 44.16% by 33.12%, capped at 773 by 331'
);
assert.match(playSceneSource, /const CABINET_WONDER_CENTER_Y_RATIO = 0\.3;[\s\S]{0,180}const CABINET_WONDER_UI_GAP = 16;[\s\S]{0,180}const CABINET_WONDER_PLAYER_LANE_TOP_RATIO = 0\.65;/, 'the enlarged Wonder must move down while reserving a measured no-overlap UI gap and the lower 35% player lane');
assert.match(playSceneSource, /const CABINET_WONDER_HOLD_MS = 1500;/, 'Cabinet Wonders must remain fully readable for the user-approved 1.5-second hold');
assert.match(
  playSceneSource,
  /const startDelayMs = reducedMotion \? 0 : CABINET_WONDER_START_DELAY_MS;[\s\S]{0,360}const durationMs = startDelayMs \+ fadeInMs \+ holdMs \+ fadeOutMs;/,
  'Cabinet Wonders must fit their complete reveal/hold/fade timeline inside ordinary transition downtime'
);
assert.match(playSceneSource, /generatedArt\.blendMode = 'normal';/, 'generated Wonder art must preserve its authored color instead of additive washing');
assert.match(playSceneSource, /const artSafeBounds = \{[\s\S]{0,420}height: Math\.max\(1, height - captionBandHeight - insetTop - insetBottom\)/, 'every authored Wonder needs a caption-safe art well');
assert.match(playSceneSource, /const scale = Math\.min\(\s*artSafeBounds\.width \/ sourceWidth,\s*artSafeBounds\.height \/ sourceHeight\s*\);/, 'every authored Wonder must use full-image contain scaling');
assert.match(playSceneSource, /generatedArt\.__novaArtFitMode = 'contain';/, 'Wonder debug geometry must report universal contain fitting');
assert.doesNotMatch(playSceneSource, /Math\.max\(targetWidth \/ sourceWidth, targetHeight \/ sourceHeight\)/, 'Cabinet Wonder art must never return to crop-prone cover scaling');
assert.match(playSceneSource, /cabinet_wonder_art_stage_[\s\S]{0,220}fill\(\{ color: 0x000000, alpha: 0\.96 \}\)[\s\S]{0,180}maskedContent\.addChild\(artStage, visual\.root\)/, 'safe-contained artwork needs one continuous black inner stage without pasted-image edges');
assert.match(playSceneSource, /captionLabel = `\$\{translateText\('Cabinet Wonder'\)\}[\s\S]{0,80}\$\{translateText\('Observed Phenomenon'\)\}`;/, 'the compact cameo needs its localized generic caption');
assert.match(playSceneSource, /decorativeAccentAlpha = 0\.1;/, 'authored-art decorative accents must stay restrained');
assert.match(playSceneSource, /prewarmCabinetWonderForTransition\(context = \{\}\)[\s\S]{0,1400}prewarmCabinetWonderVariant\(decision\.variant\.id, 'active_wave_prediction'\)/, 'the deterministic authored Wonder image must warm during the active wave');
assert.match(enemyManagerSource, /spawnWave\(config\) \{[\s\S]{0,500}prewarmCabinetWonderForTransition\?\.\(\{/, 'wave combat must start the next authored Wonder image prewarm without blocking');
assert.match(playSceneSource, /beginCabinetWonderOpportunity\(decision = \{\}\)[\s\S]{0,420}getCabinetWonderTexture\?\.\(decision\.variant\.id\)[\s\S]{0,180}recordCabinetWonderAssetSkip\(decision, 'asset_not_ready'\)/, 'a Wonder with unavailable authored art must be skipped before any overlay is created');
assert.match(playSceneSource, /if \(!generatedTexture\) return null;/, 'the visual builder must fail closed instead of drawing a fallback Wonder');
assert.match(playSceneSource, /no_overlap_lane_unavailable/, 'the cameo must skip when no collision-free transition lane is available');
assert.match(playSceneSource, /assetSource: 'authored_art'/, 'live Wonder debug output must identify the authored-art source');
assert.match(playSceneSource, /layer: 'gameplay_cameo_overlay',[\s\S]{0,100}occludesGameplayWithinFrame: true/, 'the cameo must render above continuing gameplay sprites so shots cannot cross its art or caption');
assert.match(playSceneSource, /blocking: false,/, 'Wonder debug state must declare the presentation non-blocking');
assert.match(playSceneSource, /cancelCabinetWonderBeforeCombatRelease\(reason = 'combat_release'\)/, 'combat release needs an idempotent Wonder dismissal hook');
assert.doesNotMatch(playSceneSource, /isCabinetWonderNoAgencyPresentationActive|deferCabinetWonderEnemyRelease|captureCabinetWonderTimedEffectSnapshot/, 'Wonder must not retain a no-agency or deferred-release path');
assert.doesNotMatch(playSceneSource, /cabinet_wonder_enter|cabinet_wonder_exit/, 'Wonder must not reset or suppress transient gameplay input');
assert.doesNotMatch(powerupManagerSource, /pauseTimedPickupLifetimes|resumeTimedPickupLifetimes/, 'Wonder-only pickup lifetime pausing must be removed');
assert.doesNotMatch(enemyManagerSource, /deferCabinetWonderEnemyRelease|isCabinetWonderNoAgencyPresentationActive/, 'enemy and hijacker release must never wait for a Wonder');
assert.match(enemyManagerSource, /cancelCabinetWonderBeforeCombatRelease\?\.\('wave_release'\)[\s\S]{0,180}spawnWave\(config\)/, 'wave combat must synchronously dismiss the cameo before release');
assert.match(enemyManagerSource, /cancelCabinetWonderBeforeCombatRelease\?\.\('boss_release'\)[\s\S]{0,800}spawnBoss\(this\.level\)/, 'boss combat must synchronously dismiss the cameo before release');
assert.match(soundCatalogSource, /'wonder_revelation': \[getSfx\('nova_wonder_revelation'\)\]/, 'Wonder revelation must use its dedicated authored SFX');
assert.doesNotMatch(soundCatalogSource, /'wonder_revelation': \[[\s\S]{0,180}nova_row_core_/, 'Wonder revelation must not reuse Viking Row cues');
assert.match(playSceneSource, /playSfx\('wonder_revelation',[\s\S]{0,240}priorityHoldMs: 900,[\s\S]{0,120}sfxDuckFactor: 0\.7,/, 'Wonder must use one restrained cue that releases audio priority before combat');
assert.doesNotMatch(playSceneSource, /playSpectacleAccent\('wonder'/, 'Wonder must not stack a second synthetic spectacle cue');

console.log(`[cabinet-wonders] PASS variants=${CABINET_WONDER_VARIANT_COUNT} cadence=${CABINET_WONDER_SECTOR_CADENCE}`);
