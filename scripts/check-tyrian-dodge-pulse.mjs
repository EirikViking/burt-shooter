import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.Audio = class {
  addEventListener() {}
  removeEventListener() {}
  pause() {}
  play() { return Promise.resolve(); }
};

const [{ Player }, { AudioManager }] = await Promise.all([
  import('../src/entities/Player.js'),
  import('../src/audio/AudioManager.js')
]);

const audioEvents = [];
const originalPlaySfx = AudioManager.playSfx;
AudioManager.playSfx = (id, options = {}) => {
  audioEvents.push({ id, options });
  return true;
};

function bulletAt(distance, angle = 0) {
  return {
    active: true,
    x: 300 + Math.cos(angle) * distance,
    y: 220 + Math.sin(angle) * distance
  };
}

function makeHarness({
  traitRadius = 0,
  phaseRadius = 0,
  riftReprisal = false,
  bullets = []
} = {}) {
  const counters = {
    deactivations: 0,
    pruneCalls: 0,
    playerBullets: 0,
    scoreEvents: 0,
    toasts: 0,
    combatVolleys: 0
  };
  const bulletManager = {
    enemyBullets: bullets,
    playerBullets: [],
    deactivateBullet(bullet, reason) {
      if (bullet.active === false) throw new Error(`duplicate clear for ${reason}`);
      bullet.active = false;
      bullet.clearReason = reason;
      counters.deactivations += 1;
    },
    pruneInactiveBullets() {
      counters.pruneCalls += 1;
    },
    addPlayerBullet(bullet) {
      this.playerBullets.push(bullet);
      counters.playerBullets += 1;
      return true;
    }
  };
  const play = {
    bulletManager,
    particleManager: null,
    gameContainer: null,
    enqueueToast() {
      counters.toasts += 1;
    },
    recordCombatVolley() {
      counters.combatVolleys += 1;
    }
  };
  const game = {
    scenes: { play },
    addScore() {
      counters.scoreEvents += 1;
    }
  };
  const player = Object.create(Player.prototype);
  Object.assign(player, {
    x: 300,
    y: 220,
    game,
    sprite: { alpha: 1 },
    traitCombat: { dodgePulseRadius: traitRadius },
    runAugmentModifiers: { phaseClearRadius: phaseRadius, riftReprisal },
    visualVariant: { accent: 0x66ffff },
    tacticalFusionStats: {
      riftShardsFired: 0,
      constellationVolleys: 0,
      aegisPurges: 0,
      skyVerdicts: 0
    },
    lastTacticalFusionEvent: null,
    bulletSpeed: 8,
    bulletDamage: 2,
    isDodging: false,
    invulnerable: false,
    invulnerableTime: 0,
    dodgeDuration: 0,
    dodgeDurationMax: 333,
    dodgeDelay: 1000,
    dodgeSequence: 0,
    pendingDodgeExitPulseToken: 0,
    resolvedDodgeExitPulseToken: 0,
    lastDodgeExitPulse: null,
    shootCooldown: 0,
    updateDodgeVisual() {},
    clearDodgeVisual() {},
    isGhostActive() { return false; }
  });
  return { player, play, counters };
}

function runDodge(harness) {
  const { player, play } = harness;
  const activeBefore = play.bulletManager.enemyBullets.filter((bullet) => bullet.active !== false).length;
  assert.equal(player.startDodge(), true, 'dodge should start once');
  assert.equal(player.invulnerable, true, 'dodge should preserve the invulnerable phase window');
  assert.equal(
    play.bulletManager.enemyBullets.filter((bullet) => bullet.active !== false).length,
    activeBefore,
    'bullets must remain available for graze during dodge'
  );
  const token = player.pendingDodgeExitPulseToken;
  assert.equal(player.startDodge(), false, 'repeated input must not queue a second pulse');
  assert.equal(player.pendingDodgeExitPulseToken, token, 'repeated input changed the queued pulse token');
  assert.equal(player.finishDodge('duration'), true, 'natural dodge exit should resolve');
  assert.equal(player.finishDodge('duration'), false, 'a resolved dodge must not finish twice');
  assert.equal(player.resolveDodgeExitPulse(token), false, 'a resolved pulse token must not trigger twice');
  return player.lastDodgeExitPulse;
}

try {
  audioEvents.length = 0;
  const traitOnly = makeHarness({
    traitRadius: 64,
    bullets: [bulletAt(32), bulletAt(70)]
  });
  const traitResult = runDodge(traitOnly);
  assert.equal(traitResult.cleared, 1, 'trait-only pulse should clear only bullets inside its radius');
  assert.equal(traitResult.phaseCleared, 0, 'trait-only pulse must not claim Phase clears');
  assert.equal(traitResult.shards, 0, 'trait-only pulse must not fire Rift shards');
  assert.equal(traitOnly.counters.deactivations, 1);

  audioEvents.length = 0;
  const phaseOnly = makeHarness({
    phaseRadius: 58,
    bullets: [bulletAt(24), bulletAt(57), bulletAt(61)]
  });
  const phaseResult = runDodge(phaseOnly);
  assert.equal(phaseResult.cleared, 2, 'Phase Wake should clear at phase exit');
  assert.equal(phaseResult.phaseCleared, 2);
  assert.equal(phaseResult.shards, 0);
  assert.equal(audioEvents.filter((event) => event.id === 'forceField').length, 1, 'one clear should emit one clear sound');

  audioEvents.length = 0;
  const combined = makeHarness({
    traitRadius: 72,
    phaseRadius: 58,
    riftReprisal: true,
    bullets: [bulletAt(40), bulletAt(68), bulletAt(78), bulletAt(90)]
  });
  const combinedResult = runDodge(combined);
  assert.equal(combinedResult.combinedRadiusBonus, 12, 'combined pulse bonus should be modest and deterministic');
  assert.equal(combinedResult.radius, 84, 'combined pulse should be bounded');
  assert.equal(combinedResult.cleared, 3, 'combined pulse should gain one bounded outer clear');
  assert.equal(combinedResult.phaseCleared, 2, 'only the Phase/Fusion contribution should feed Rift Reprisal');
  assert.equal(combinedResult.shards, 2, 'Rift Reprisal should return only Phase-cleared bullets');
  assert.equal(combined.counters.deactivations, 3, 'a combined pulse must clear each bullet exactly once');
  assert.equal(combined.counters.playerBullets, 2, 'Rift shard count should match Phase-cleared positions');
  assert.equal(combined.counters.scoreEvents, 0, 'dodge exit clears must remain score-neutral');
  assert.equal(audioEvents.filter((event) => event.id === 'forceField').length, 1, 'combined clear must not duplicate clear audio');
  assert.equal(audioEvents.filter((event) => event.id === 'tactical_phase_reactor').length, 1, 'Rift volley must emit one Fusion audio event');

  audioEvents.length = 0;
  const riftCap = makeHarness({
    phaseRadius: 58,
    riftReprisal: true,
    bullets: Array.from({ length: 7 }, (_, index) => bulletAt(34 + index, index))
  });
  const riftResult = runDodge(riftCap);
  assert.equal(riftResult.cleared, 7);
  assert.equal(riftResult.shards, 5, 'Rift Reprisal must keep its five-shard cap');

  audioEvents.length = 0;
  const empty = makeHarness({ traitRadius: 64, bullets: [] });
  const emptyResult = runDodge(empty);
  assert.equal(emptyResult.cleared, 0, 'zero nearby bullets should remain a valid zero-clear pulse');
  assert.equal(empty.counters.deactivations, 0);
  assert.equal(audioEvents.filter((event) => event.id === 'forceField').length, 0, 'zero-clear pulse must not emit clear audio');

  audioEvents.length = 0;
  const interrupted = makeHarness({ traitRadius: 64, bullets: [bulletAt(20)] });
  assert.equal(interrupted.player.startDodge(), true);
  const interruptedToken = interrupted.player.pendingDodgeExitPulseToken;
  assert.equal(interrupted.player.cancelDodgeExitPulse('life_lost', { endDodge: true }), true);
  assert.equal(interrupted.player.lastDodgeExitPulse.reason, 'life_lost');
  assert.equal(interrupted.player.lastDodgeExitPulse.cancelled, true);
  assert.equal(interrupted.player.resolveDodgeExitPulse(interruptedToken), false, 'life loss must invalidate the queued pulse');
  assert.equal(interrupted.play.bulletManager.enemyBullets[0].active, true, 'life-loss interruption must not clear bullets later');
  assert.equal(interrupted.counters.deactivations, 0);

  const sceneChange = makeHarness({ phaseRadius: 58, bullets: [bulletAt(20)] });
  sceneChange.player.startDodge();
  const sceneToken = sceneChange.player.pendingDodgeExitPulseToken;
  sceneChange.player.cancelDodgeExitPulse('scene_change', { endDodge: true });
  assert.equal(sceneChange.player.resolveDodgeExitPulse(sceneToken), false, 'scene changes must invalidate the queued pulse');
  assert.equal(sceneChange.counters.deactivations, 0);
  const playSceneSource = readFileSync('src/scenes/PlayScene.js', 'utf8');
  assert.match(
    playSceneSource,
    /onLifeLost[\s\S]*cancelDodgeExitPulse\?\.\('life_lost', \{ endDodge: true \}\)/,
    'all life-loss paths, including final death, must cancel the queued pulse before early returns'
  );

  console.log('[tyrian-dodge-pulse] PASS trait, Phase Wake, combined radius, Rift shards, zero-clear, interruption, and duplicate guards');
} finally {
  AudioManager.playSfx = originalPlaySfx;
}
