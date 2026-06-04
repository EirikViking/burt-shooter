import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gameOver = readFileSync('src/scenes/GameOverScene.js', 'utf8');
const hud = readFileSync('src/ui/HUD.js', 'utf8');
const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');

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

console.log('[release-hardening-ui-flow] PASS game-over hold, rank badge spacing, and combo text spam guards');
