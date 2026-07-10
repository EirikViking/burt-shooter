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
  'this.enterRunbackStage(initialReason);',
  'void this.startGlobalSubmissionWhenReady(name, result).finally(() => {',
  'this.refreshVisibleRunbackAfterSubmission(finalReason);',
  "this.enterRunbackStage(this.globalStatus === 'offline' ? 'offline_no_slot' : 'no_slot');"
]) {
  assert.ok(gameOver.includes(needle), `game-over direct runback missing marker: ${needle}`);
}

assert.ok(
  (gameOver.match(/enterRunbackStageAfterReportHold\(/g) || []).length === 1 &&
    gameoverMotivationCheck.includes('submittedRunbackElapsedMs < 3000') &&
    !gameoverMotivationCheck.includes('submittedHoldSnapshot'),
  'local score submit should preserve name entry and proceed directly to runback'
);

for (const needle of [
  'const rankPanelWidth = 164 * uiScale;',
  'const rankTextMaxWidth = 92 * uiScale;',
  'Math.max(0.58, rankTextMaxWidth / this.rankText.width)',
  'const rankOffset = Math.round((layout.isMobile ? 186 : (isLargeDesktop ? 204 : 198)) * uiScale);'
]) {
  assert.ok(hud.includes(needle), `rank badge overlap guard missing marker: ${needle}`);
}

for (const needle of [
  'const safeTop = compact ? 176 : 190;',
  'height * (compact ? 0.34 : 0.3)',
  'new Player(width / 2, height - 100, this.inputManager, this.gameplayGame, spriteKey)',
  'Create a fresh player for each run so movement reads the current InputManager.'
]) {
  assert.ok(playScene.includes(needle), `play scene readability/input guard missing marker: ${needle}`);
}

assert.ok(
  !playScene.includes('createComboDisplay()') &&
    !playScene.includes('COMBO x${this.comboMultiplier}  (${this.comboCount})') &&
    playScene.includes('comboDisplay: null') &&
    playScene.includes('this.comboCount % 20 === 0') &&
    playScene.includes('duration: 900'),
  'persistent combo HUD should stay removed while every-10 scoring remains'
);
assert.ok(
  playScene.includes("const appliedBonus = this.addNormalWaveScore(bonus, 'baseScore', enemy);"),
  'combo bonus scoring must remain intact'
);
assert.ok(
  gameoverMotivationCheck.includes('readGameOverTopLayout') &&
    gameoverMotivationCheck.includes('hasReadableTopStack') &&
    gameoverMotivationCheck.includes('submittedRunbackElapsedMs') &&
    gameoverMotivationCheck.includes('runbackTopLayout'),
  'game-over visual flow check should cover top-stack spacing and direct runback readability'
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
    debugUnrankedCheck.includes('nova-devtools-hash') &&
    debugUnrankedCheck.includes('runMode') &&
    debugUnrankedCheck.includes('unranked'),
  'documented debug start-level shortcut must stay covered as gated and unranked'
);
assert.ok(
  (highscore.match(/this\.stateMessage\.anchor\.set\(0\.5\);/g) || []).length === 1,
  'high-score state message should not carry duplicated anchor setup'
);

console.log('[release-hardening-ui-flow] PASS direct game-over runback, rank badge spacing, and combo text spam guards');
