import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.Audio = class {
  addEventListener() {}
  removeEventListener() {}
  load() {}
  pause() {}
  play() {
    return Promise.resolve();
  }
};

const { Boss } = await import('../src/entities/Boss.js');

function makeGame() {
  return {
    getWidth: () => 1280,
    getHeight: () => 720,
    app: { ticker: { add() {}, remove() {} } },
    scenes: { play: { showBossTaunt() {}, onBossPhaseChange() {}, triggerShockwave() {} } }
  };
}

const earlyBoss = new Boss(640, 160, 1, makeGame());
const midBoss = new Boss(640, 160, 8, makeGame());
const lateBoss = new Boss(640, 160, 30, makeGame());

assert.ok(earlyBoss.minimumFightMs >= 9000, `first boss minimum fight should be at least 9000ms, got ${earlyBoss.minimumFightMs}`);
assert.ok(midBoss.minimumFightMs > earlyBoss.minimumFightMs, 'boss minimum fight should grow gently after the first boss');
assert.ok(lateBoss.minimumFightMs <= 12600, `boss minimum fight should cap at 12600ms, got ${lateBoss.minimumFightMs}`);
assert.ok(
  earlyBoss.getRegularAttackIntervalMs() >= 2380,
  `first boss regular attack interval should not get shorter, got ${earlyBoss.getRegularAttackIntervalMs()}`
);
assert.ok(
  midBoss.getRegularAttackIntervalMs() >= 2500,
  `mid boss regular attack interval should stay readable, got ${midBoss.getRegularAttackIntervalMs()}`
);

const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');
assert.ok(playScene.includes('const burstCount = 11 + (seed % 5);'), 'boss death should use a larger varied burst count');
assert.ok(playScene.includes('const ringCount = 3 + (seed % 3);'), 'boss death should use varied shockwave rings');
assert.ok(playScene.includes("AudioManager.playSfx('boss_phase_surge', { force: true, volume: 0.54"), 'boss death should layer boss-specific surge audio');
assert.ok(!playScene.includes("else AudioManager.playSfx('powerup', { force: true, volume: 0.8 });"), 'boss celebration should not end with generic powerup pickup SFX');

const bossSource = readFileSync('src/entities/Boss.js', 'utf8');
assert.ok(bossSource.includes('regularAttackReadyAt = Math.max(this.regularAttackReadyAt || 0, this.finishGateUntilMs + 500)'), 'damage gate should keep boss fire suppressed until after the hold');
assert.ok(bossSource.includes('return false;'), 'damage gate should preserve non-lethal hold behavior');

console.log(`[release-hardening-boss-flow] PASS minFightMs first=${earlyBoss.minimumFightMs} mid=${midBoss.minimumFightMs} cap=${lateBoss.minimumFightMs}`);
