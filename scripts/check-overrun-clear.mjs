import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { MILESTONE_ACHIEVEMENT_IDS } from '../src/achievements/AchievementCatalog.js';
import { getMilestoneAchievementUnlocks } from '../src/achievements/MilestoneAchievements.js';
import { getOverrunMilestoneCelebration } from '../src/config/OverrunMilestoneCelebrations.js';
import { calculatePilotXpForRun } from '../src/progression/HangarProgressState.js';

const playSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
const gameSource = readFileSync('src/game/Game.js', 'utf8');
const bonusSource = readFileSync('src/game/RunClearScoreBonuses.js', 'utf8');
const progressionSource = readFileSync('src/progression/HangarProgressState.js', 'utf8');
const soundSource = readFileSync('src/audio/SoundCatalog.js', 'utf8');
const manifestSource = readFileSync('src/assets/assetManifest.js', 'utf8');

assert.match(playSource, /maybeTriggerOverrunCelebration\(\{ sectorCleared, bossCompletion, compactHud \}\)/);
assert.match(playSource, /isOverrunMilestoneSector\(milestoneSector, RunPacingConfig\.targetSectors\)/);
assert.match(playSource, /this\.overrunCelebratedMilestones = new Set\(\)/);
assert.match(playSource, /this\.game\.markRunClear\?\.\('target_sector_clear'\)/);
assert.match(playSource, /this\.game\.awardRunClearScoreBonuses\?\.\(\{ clearBonus, livesBonus \}\)/);
assert.doesNotMatch(playSource, /this\.game\.addScore\(clearBonus,\s*'runClearBonus'\)/);
assert.doesNotMatch(playSource, /this\.game\.addScore\(livesBonus,\s*'remainingLivesBonus'\)/);
assert.doesNotMatch(playSource, /this\.game\.completeRun\?\.\('target_sector_clear'\)/);
assert.match(playSource, /this\.game\.nextLevel\(\);/);
assert.match(playSource, /triggerOverrunClearCelebration\(\{\s*nextSector,/);
assert.match(playSource, /eventKind: 'overrun_milestone'/);
assert.match(playSource, /updateOverrunMilestoneInterlude\(delta\)/);
assert.match(playSource, /STRAP IN, PILOT\. OVERRUN DOES NOT DO EASY\./);
assert.match(playSource, /I'M READY - BRING THE SWARM/);
assert.match(playSource, /installOverrunConfirmationHandlers\(\)/);
assert.match(playSource, /confirmOverrunInterlude\(source = 'unknown'\)/);
assert.match(playSource, /pollOverrunConfirmationInput\(\)/);
assert.match(playSource, /getOverrunInterludeDebugState/);
assert.match(playSource, /AudioManager\.playSfx\('overrun_clear_coronation'/);
assert.match(playSource, /AudioManager\.playSfx\('overrun_clear_shockwave'/);
assert.match(playSource, /const voiceCue = celebration\?\.voiceCue \|\| 'mission_control_overrun_clear'/);
assert.match(playSource, /AudioManager\.playVoice\(voiceCue,/);

assert.match(gameSource, /markRunClear\(reason = 'target_sector_clear'\)/);
assert.match(gameSource, /awardRunClearScoreBonuses\(\{ clearBonus = 0, livesBonus = 0 \} = \{\}\)/);
assert.match(bonusSource, /if \(game\.runClearScoreBonusAward\)/);
assert.match(bonusSource, /game\.addScore\(baseClearBonus, 'runClearBonus'\)/);
assert.match(bonusSource, /game\.addScore\(baseLivesBonus, 'remainingLivesBonus'\)/);
assert.match(gameSource, /clearLivesRemaining: this\.runClearLivesRemaining \|\| 0/);
assert.match(gameSource, /runCleared: Boolean\(this\.runCleared\)/);
assert.match(progressionSource, /summary\.clearLivesRemaining \?\? summary\.livesRemaining/);
assert.match(manifestSource, /overrunVictorySeal/);
assert.match(manifestSource, /nova_overrun_clear_coronation\.mp3/);
assert.match(manifestSource, /mission_control_overrun_clear_01\.mp3/);
assert.match(manifestSource, /mission_control_overrun_clear_sector_20_01\.mp3/);
assert.match(manifestSource, /mission_control_overrun_clear_far_signal_01\.mp3/);
assert.match(soundSource, /overrun_clear_coronation/);
assert.match(soundSource, /mission_control_overrun_clear/);
assert.match(soundSource, /mission_control_overrun_clear_sector_20/);
assert.ok(existsSync('public/art/generated/nova-swarm/vfx/overrun-victory-seal.png'));
assert.ok(existsSync('public/audio/sfx/nova-swarm/nova_overrun_clear_coronation.mp3'));
assert.ok(existsSync('public/audio/sfx/nova-swarm/nova_overrun_clear_shockwave.mp3'));
assert.ok(existsSync('public/audio/voice/mission-control/mission_control_overrun_clear_01.mp3'));
assert.ok(existsSync('public/audio/voice/mission-control/mission_control_overrun_clear_sector_10_01.mp3'));
assert.ok(existsSync('public/audio/voice/mission-control/mission_control_overrun_clear_sector_20_01.mp3'));
assert.ok(existsSync('public/audio/voice/mission-control/mission_control_overrun_clear_sector_30_01.mp3'));
assert.ok(existsSync('public/audio/voice/mission-control/mission_control_overrun_clear_sector_40_01.mp3'));
assert.ok(existsSync('public/audio/voice/mission-control/mission_control_overrun_clear_sector_50_01.mp3'));
assert.ok(existsSync('public/audio/voice/mission-control/mission_control_overrun_clear_far_signal_01.mp3'));

const voiceExpectations = new Map([
  [10, 'mission_control_overrun_clear_sector_10'],
  [20, 'mission_control_overrun_clear_sector_20'],
  [30, 'mission_control_overrun_clear_sector_30'],
  [40, 'mission_control_overrun_clear_sector_40'],
  [50, 'mission_control_overrun_clear_sector_50'],
  [60, 'mission_control_overrun_clear_far_signal']
]);
for (const [sector, voiceCue] of voiceExpectations) {
  const celebration = getOverrunMilestoneCelebration({
    milestoneSector: sector,
    eventKind: sector === 10 ? 'run_clear' : 'overrun_milestone'
  });
  assert.equal(celebration.voiceCue, voiceCue);
}

const clearWithLives = {
  runCleared: true,
  livesRemaining: 0,
  clearLivesRemaining: 2
};
const clearUnlockIds = getMilestoneAchievementUnlocks({
  summary: clearWithLives,
  progress: {}
}).map((entry) => entry.achievement.id);
assert.ok(clearUnlockIds.includes(MILESTONE_ACHIEVEMENT_IDS.ARCADE_CLEAR));
assert.ok(clearUnlockIds.includes(MILESTONE_ACHIEVEMENT_IDS.TWO_LIVES_CLEAR));

const baseSummary = {
  score: 0,
  sectorReached: 10,
  wavesCleared: 0,
  bossesKilled: 0,
  codexDiscoveries: 0,
  runThemeDiscoveries: 0,
  noHitWaves: 0,
  noHitSectors: 0,
  runCleared: true,
  livesRemaining: 0
};
const xpWithoutClearLives = calculatePilotXpForRun({ ...baseSummary, clearLivesRemaining: 0 });
const xpWithClearLives = calculatePilotXpForRun({ ...baseSummary, clearLivesRemaining: 3 });
assert.equal(xpWithClearLives - xpWithoutClearLives, 750);

console.log('[overrun-clear] PASS sector10 marks clear, keeps running, preserves clear-lives rewards, and fires epic overrun audiovisuals');
