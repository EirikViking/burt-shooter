import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const block = (source, start, end) => {
  const startIndex = source.indexOf(start);
  assert(startIndex >= 0, `Missing source marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(endIndex > startIndex, `Missing source terminator after ${start}: ${end}`);
  return source.slice(startIndex, endIndex);
};

const play = read('src/scenes/PlayScene.js');
const enemyManager = read('src/managers/EnemyManager.js');
const bulletManager = read('src/managers/BulletManager.js');
const bullet = read('src/entities/Bullet.js');
const hud = read('src/ui/HUD.js');
const scorePopup = read('src/ui/ScorePopup.js');
const boss = read('src/entities/Boss.js');
const diagnostics = read('src/debug/MayhemPerformanceDiagnostics.js');

const waveClear = block(play, '  showWaveBonusEffect(bonusAmount', '  showChallengeFlightResult(');
assert.match(waveClear, /nova_command_hud_wave_clear_v2/, 'approved Wave Cleared V2 identity changed');
assert.match(waveClear, /waveClearCommandHud:\s*!isSectorClear/, 'approved Wave Cleared V2 renderer is no longer selected');

const storm = block(
  play,
  '  showMayhemReinforcementStormSurvived(',
  '  showBossIntro('
);
for (const legacyMarker of [
  'rayCount = reducedMotion ? 8 : 18',
  'flash.rect(-centerX',
  'core.poly([0, -28',
  'for (let ring = 0; ring < 4'
]) {
  assert(!storm.includes(legacyMarker), `legacy Storm Survived marker remains: ${legacyMarker}`);
}
assert.match(storm, /durationMs = reducedMotion \? 320 : 410/, 'Storm collapse duration left the 300-450 ms target');
assert.match(storm, /Math\.min\(200, width \* 0\.105\)/, 'Storm collapse maximum radius is no longer bounded at 200 px');
assert.match(storm, /deferredUntilCenterTransitionsClear:\s*true/, 'Storm reward is no longer explicitly deferred');
assert.match(storm, /fullScreenWashCount:\s*0/, 'Storm collapse no longer proves the wash was removed');
assert.match(storm, /spokeCount:\s*0/, 'Storm collapse no longer proves spokes were removed');
assert.match(storm, /diamondCount:\s*0/, 'Storm collapse no longer proves the legacy diamond was removed');

assert.match(
  play,
  /return \['wave_start', 'wave_clear', 'sector_clear', 'boss_defeated', 'run_clear', 'overrun_unlocked'\]\.includes\(type\)/,
  'Wave Start is not an authoritative transition'
);
assert.match(
  play,
  /else if \(this\.isAuthoritativeTransitionType\(display\.__toastMeta\.type\)\) \{\s*this\.hud\?\.setNotificationFocus\?\.\('transition'\);/,
  'An authoritative transition does not suppress Mission Status from its first visible frame through dismissal'
);
assert.match(play, /maybeFlushPendingWaveTransitionRewards\(\)/, 'deferred Storm reward flush is missing');
assert.match(hud, /const semanticSuppressed = false/, 'Mission Status should remain readable beneath transitions');
assert.match(hud, /this\.notificationFocus === 'transition' \? focusAlpha/, 'Mission Status transition alpha is not preserved');

assert.match(
  play,
  /if \(firePressed && this\.player && !this\.introActive\)/,
  'routine autofire does not stay available across wave transitions'
);
assert.match(play, /maybeSuppressRoutineFireAfterFinalWaveHostile\(enemy\)/, 'final-kill fire suppression hook is missing');
assert.match(play, /this\.waveTransitionFireSuppressedWaveIndex = null;[\s\S]*return false;/, 'legacy transition suppression is not retired');
assert.doesNotMatch(enemyManager, /beginPlayerTransitionRetirement\?\.\(\s*'wave_clear_no_targets'/, 'wave clear still retires friendly projectiles');
assert.match(bullet, /if \(this\.transitionRetirement\) return false/, 'friendly retirement can be restarted beyond its bounded duration');
assert.match(bulletManager, /friendlyVfxCompressionStartCount = 44/, 'adaptive compression start threshold changed unexpectedly');
assert.match(bulletManager, /friendlyVfxCompressionFullCount = 150/, 'adaptive compression full threshold changed unexpectedly');
assert.match(bullet, /isPriorityPlayerProjectile\(\)/, 'priority projectile exemption is missing');
for (const priorityMarker of ['this.isBomb', 'this.isPlasmaLance', 'this.isGrazeBreaker', 'this.isTraitCriticalShot']) {
  assert(bullet.includes(priorityMarker), `priority projectile exemption missing: ${priorityMarker}`);
}
assert.match(bullet, /densityAlpha = 1 - compression \* 0\.22/, 'ordinary shot opacity compression is no longer modest');
assert.match(bullet, /trailScale = 1 - compression \* 0\.34/, 'ordinary trail compression is missing');
assert.match(scorePopup, /setDenseCombatCompression/, 'dense-combat score aggregation is missing');
assert.match(scorePopup, /compact_combo_milestone_pulse_v1/, 'compact combo milestone identity is missing');
assert.match(scorePopup, /\[0, 18, 20, 22, 24\]/, 'combo milestone text grew beyond the compact hierarchy');

const bonusDrone = block(play, '// Player bullets vs ambient hazard drones', '// Enemies vs player');
assert.match(bonusDrone, /type:\s*'bonus_drone'/, 'Bonus Drone Down is not local feedback');
assert(!/showToast\(translateText\('BONUS DRONE DOWN!'\)/.test(bonusDrone), 'plain Bonus Drone Down toast remains');

const chrono = block(play, '  updateSlowTimeVisualField(delta = 1) {', '  triggerPlayerDamageDirectionCue(');
assert.match(chrono, /chrono_anchor_single_distortion_ring_v1/, 'revised Chrono Anchor identity is missing');
assert.match(chrono, /primaryRingCount:\s*1/, 'Chrono Anchor does not use one primary ring');
assert.match(chrono, /timeSliceCount:\s*0/, 'Chrono Anchor time-slice grid returned');
assert.match(chrono, /fullScreenGeometryCount:\s*0/, 'Chrono Anchor full-screen geometry returned');
assert.match(chrono, /gameplayToScreen\?\.\(worldX, worldY\)/, 'Chrono Anchor is not aligned to the scaled gameplay viewport');

assert.match(hud, /\$\{bossName\} \/\/ \$\{translateText\('PHASE'\)\} \$\{bossPhase\}/, 'Mission Status still duplicates numeric Boss HP');
assert.match(boss, /semanticRole:\s*'dominant_boss_health'/, 'the dominant boss-health owner is not declared');
assert.match(boss, /missionStatusDuplicatesHealth:\s*false/, 'boss-health duplication contract is missing');
const telegraphPalette = block(boss, 'getTelegraphVfxPalette(', 'drawTelegraphChargeHalo(');
for (const safeCyan of ['0x72fff1', '0x74fff0', '0x8cffb5']) {
  assert(!telegraphPalette.includes(safeCyan), `boss danger palette still uses safe/player hue ${safeCyan}`);
}
assert.match(play, /restrained_boss_priority_edge_v1/, 'boss priority edge pass is missing');
assert.match(play, /routineFriendlyProjectilesBelow:\s*80 < layer\.zIndex/, 'boss edge is not proven above routine friendly fire');

for (const metric of [
  'enemySpawnToFirstAttack',
  'enemySpawnToDeath',
  'attackedBeforeDeathPercent',
  'playerPositionHeatmap',
  'projectileCounts',
  'bossTimeToKill',
  'waveClearToNextActive'
]) {
  assert(diagnostics.includes(metric), `combat-readability diagnostic missing: ${metric}`);
}

console.log('[legacy-vfx-transition-readability] PASS focused source contracts are present');
