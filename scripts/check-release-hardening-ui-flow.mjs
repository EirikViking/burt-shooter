import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gameOver = readFileSync('src/scenes/GameOverScene.js', 'utf8');
const hud = readFileSync('src/ui/HUD.js', 'utf8');
const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');
const highscore = readFileSync('src/scenes/HighScoreScene.js', 'utf8');
const gameoverMotivationCheck = readFileSync('scripts/check-gameover-motivation.mjs', 'utf8');
const leaderboardVisualsCheck = readFileSync('scripts/check-leaderboard-visuals.mjs', 'utf8');
const debugUnrankedCheck = readFileSync('scripts/check-debug-run-unranked.mjs', 'utf8');

for (const needle of [
  "label: translateText('CONTINUE')",
  "A: ${translateText('CONTINUE')}",
  "mode: 'submitted_hold'",
  'continueFromSubmittedHold()',
  'this.continueFromSubmittedHold();',
  'SUBMITTED_REPORT_MIN_MS'
]) {
  assert.ok(gameOver.includes(needle), `game-over status hold missing marker: ${needle}`);
}

assert.ok(
  gameOver.includes("this.updatePromptMessage('SCORE SUBMITTED')") &&
    gameOver.includes("this.scheduleSceneTimeout(() => {\n      if (!this.isSceneActive() || this.state !== 'submitted_hold') return;"),
  'submitted score report should remain readable before runback'
);

for (const needle of [
  'const rankPanelWidth = 146;',
  'const rankTextMaxWidth = 76;',
  'Math.max(0.58, rankTextMaxWidth / this.rankText.width)',
  'const rankOffset = layout.isMobile ? 176 : 188;'
]) {
  assert.ok(hud.includes(needle), `rank badge overlap guard missing marker: ${needle}`);
}

assert.ok(
  playScene.includes('if (this.comboCount < 3)') &&
    playScene.includes('this.comboCount % 20 === 0') &&
    playScene.includes('duration: 900'),
  'combo UI spam should stay reduced while every-10 scoring remains'
);
assert.ok(
  playScene.includes('const appliedBonus = this.game.addScore(bonus);'),
  'combo bonus scoring must remain intact'
);
assert.ok(
  gameoverMotivationCheck.includes('readGameOverTopLayout') &&
    gameoverMotivationCheck.includes('hasReadableTopStack') &&
    gameoverMotivationCheck.includes('submittedHoldSnapshot') &&
    gameoverMotivationCheck.includes('runbackTopLayout'),
  'game-over visual flow check should cover top-stack spacing and submitted-hold readability'
);
for (const needle of [
  'leaderboard-desktop.png',
  'leaderboard-wide.png',
  'leaderboard-mobile.png',
  'pilot name overlaps rank title',
  'rank title crowds score group',
  "result.state.title !== 'LOCAL SCORE DECK'"
]) {
  assert.ok(leaderboardVisualsCheck.includes(needle), `leaderboard overlap capture missing marker: ${needle}`);
}
assert.ok(
  debugUnrankedCheck.includes("debugBossToken: 'NOVA_DEBUG_2026'") &&
    debugUnrankedCheck.includes('runMode') &&
    debugUnrankedCheck.includes('unranked'),
  'documented debug start-level shortcut must stay covered as unranked'
);
assert.ok(
  (highscore.match(/this\.stateMessage\.anchor\.set\(0\.5\);/g) || []).length === 1,
  'high-score state message should not carry duplicated anchor setup'
);

console.log('[release-hardening-ui-flow] PASS game-over hold, rank badge spacing, and combo text spam guards');
