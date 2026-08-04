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

assert.ok(earlyBoss.armorBleedGuideMs >= 7000, `first boss armor-bleed guide should be at least 7000ms, got ${earlyBoss.armorBleedGuideMs}`);
assert.ok(midBoss.minimumFightMs > earlyBoss.minimumFightMs, 'boss minimum fight should grow gently after the first boss');
assert.ok(lateBoss.armorBleedGuideMs <= 9000, `boss armor-bleed guide should cap at 9000ms, got ${lateBoss.armorBleedGuideMs}`);
assert.ok(
  earlyBoss.getRegularAttackIntervalMs() >= 3200,
  `first boss regular attack interval should not get shorter, got ${earlyBoss.getRegularAttackIntervalMs()}`
);
assert.ok(
  midBoss.getRegularAttackIntervalMs() >= 2500,
  `mid boss regular attack interval should stay readable, got ${midBoss.getRegularAttackIntervalMs()}`
);

const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');
assert.ok(
  playScene.includes("const burstCount = 8 + (seed % 4) + (style.pattern === 'confetti' ? 2 : 0)"),
  'boss death should use a larger varied burst count'
);
assert.ok(playScene.includes('const ringCount = 1'), 'boss death should retain a deterministic delayed shockwave ring');
assert.ok(playScene.includes("AudioManager.playSfx('boss_death_cascade'"), 'boss death should play the generated cascade one-shot');
assert.ok(playScene.includes("AudioManager.playSfx('boss_explode'"), 'boss death should keep the heavy explosion layer');
assert.ok(playScene.includes("AudioManager.playSfx('boss_phase_surge'"), 'boss death should layer boss-specific surge audio');
assert.ok(playScene.includes("AudioManager.playDiegeticVoice('boss_death_agony'"), 'boss death should play a randomized agony voice line');
assert.ok(!playScene.includes("else AudioManager.playSfx('powerup', { force: true, volume: 0.8 });"), 'boss celebration should not end with generic powerup pickup SFX');

const bossSource = readFileSync('src/entities/Boss.js', 'utf8');
const balanceSource = readFileSync('src/config/BalanceConfig.js', 'utf8');
assert.ok(bossSource.includes('BOSS_FAST_KILL_GUIDE_MS = 7000'), 'boss should use a 7s armor-bleed guide instead of a hard kill lock');
assert.ok(!bossSource.includes('fastKillLockUntilMs'), 'boss should not restore a hard final kill lock');
assert.ok(!/pacingFloor|incomingHealth <=/.test(bossSource), 'boss should not clamp final HP to a hard floor');
assert.ok(bossSource.includes('BossArmorBleed'), 'boss should use visible armor-bleed pacing instead of long hard invulnerability');
assert.ok(bossSource.includes('fullDamageBeforeBleed + bleedDamage * damageScale'), 'armor bleed should soften only the final band so huge overkill can still kill');
assert.ok(bossSource.includes('regularAttackReadyAt = Math.max(this.regularAttackReadyAt || 0, this.finishGateUntilMs + 500)'), 'armor-bleed pacing should avoid extra boss bullet pressure');
assert.ok(balanceSource.includes('ringSafeWedgeEarly: 0.74'), 'first boss ring safe wedge should stay wider than later boss rings');
assert.ok(balanceSource.includes('signatureRingTelegraphEarlyMs: 1500'), 'first boss ring telegraph should stay more readable');
assert.ok(balanceSource.includes('contactRadiusScalarEarly: 0.5'), 'first boss contact radius should stay readable against large boss art');
assert.ok(bossSource.includes('if (this.level <= 1) scalar = 0.58'), 'first boss pressure scalar should stay softened while the fight lasts longer');

console.log(`[release-hardening-boss-flow] PASS armorBleedGuideMs first=${earlyBoss.armorBleedGuideMs} mid=${midBoss.armorBleedGuideMs} cap=${lateBoss.armorBleedGuideMs}`);
