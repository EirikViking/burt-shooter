import assert from 'node:assert/strict';

globalThis.Audio = class {
  addEventListener() {}
  removeEventListener() {}
  pause() {}
  play() { return Promise.resolve(); }
};

const [{ PlayScene }, { Hijacker }, PIXI, { AudioManager }] = await Promise.all([
  import('../src/scenes/PlayScene.js'),
  import('../src/entities/Hijacker.js'),
  import('pixi.js'),
  import('../src/audio/AudioManager.js')
]);

const audioEvents = [];
const originalPlaySfx = AudioManager.playSfx;
AudioManager.playSfx = (id, options = {}) => {
  audioEvents.push({ id, options });
  return true;
};

function makeTarget({
  kind = 'enemy',
  x,
  y,
  health = 10,
  scoreValue = 100,
  onDestroy = null
}) {
  return {
    kind,
    type: kind,
    x,
    y,
    health,
    maxHealth: health,
    scoreValue,
    active: true,
    destroyed: false,
    damageEvents: [],
    takeDamage(amount, options = {}) {
      this.damageEvents.push({ amount, options });
      this.health -= amount;
      if (this.health <= 0) {
        this.health = 0;
        this.active = false;
        this.destroyed = true;
        onDestroy?.(this);
        return true;
      }
      return false;
    }
  };
}

function makeScene({ enemies = [], hijacker = null, maxChains = 3, experiment = null } = {}) {
  const scene = Object.create(PlayScene.prototype);
  const events = {
    arcs: [],
    scores: [],
    kills: [],
    deaths: [],
    sparks: []
  };
  Object.assign(scene, {
    player: {
      chainLightningActive: true,
      chainLightningMaxChains: maxChains,
      isSlowTimeActive: () => false
    },
    enemyManager: { enemies, hijacker },
    combatTelemetry: {
      volleysFired: 0,
      projectilesFired: 0,
      projectilesHit: 0,
      totalDamage: 0,
      damageBySource: {},
      damageBySecond: {},
      peakDps: 0
    },
    gameTime: 0,
    game: {
      lateGameExperiment: experiment,
      addScore(value) {
        events.scores.push(value);
        return value;
      }
    },
    scorePopupManager: {
      addScorePopup() {}
    },
    particleManager: {
      createHitSpark(x, y, color) {
        events.sparks.push({ x, y, color });
      }
    },
    drawLightningArc(x1, y1, x2, y2) {
      events.arcs.push({ x1, y1, x2, y2 });
    },
    getComboScore(value) {
      return Number(value) || 0;
    },
    getNormalWaveScoreAward(value) {
      return Number(value) || 0;
    },
    onEnemyKilled(target) {
      events.kills.push(target);
    },
    playEnemyDeathFeedback(target) {
      events.deaths.push(target);
    }
  });
  return { scene, events };
}

try {
  audioEvents.length = 0;
  const tractorSource = makeTarget({ kind: 'hijacker', x: 100, y: 100, health: 20, scoreValue: 500 });
  const sourceTarget = makeTarget({ x: 205, y: 100, health: 10 });
  const sourceHarness = makeScene({ enemies: [sourceTarget], hijacker: tractorSource, maxChains: 1 });
  const sourceResult = sourceHarness.scene.triggerChainLightning(tractorSource, 4);
  assert.equal(sourceResult.sourceKind, 'hijacker', 'active Tractor should be a Chain Lightning source');
  assert.equal(sourceResult.hitCount, 1);
  assert.equal(sourceResult.hitTargets[0].target, sourceTarget);
  assert.equal(sourceTarget.damageEvents[0].amount, 2);
  assert.equal(sourceHarness.events.arcs.length, 1);

  audioEvents.length = 0;
  const enemySource = makeTarget({ x: 100, y: 100, health: 10 });
  const tractorTarget = makeTarget({ kind: 'hijacker', x: 220, y: 100, health: 20, scoreValue: 500 });
  const targetHarness = makeScene({ enemies: [enemySource], hijacker: tractorTarget, maxChains: 1 });
  const targetResult = targetHarness.scene.triggerChainLightning(enemySource, 6);
  assert.equal(targetResult.hitTargets[0].target, tractorTarget, 'active Tractor should be a normal Chain Lightning target');
  assert.equal(tractorTarget.damageEvents[0].options.sourceId, 'chain_lightning', 'Tractor damage attribution should remain Chain Lightning');
  assert.equal(targetHarness.scene.combatTelemetry.damageBySource.chain_lightning, 3);
  assert.equal(audioEvents.filter((event) => event.id === 'chain_lightning_arc').length, 1);

  audioEvents.length = 0;
  let destructionScoreCalls = 0;
  const destroyedSource = makeTarget({ x: 100, y: 100 });
  let destroyedHarness = null;
  const destroyedTractor = makeTarget({
    kind: 'hijacker',
    x: 200,
    y: 100,
    health: 1,
    scoreValue: 500,
    onDestroy() {
      destructionScoreCalls += 1;
      destroyedHarness.scene.game.addScore(500);
    }
  });
  destroyedHarness = makeScene({ enemies: [destroyedSource], hijacker: destroyedTractor, maxChains: 1 });
  const destroyedResult = destroyedHarness.scene.triggerChainLightning(destroyedSource, 4);
  assert.equal(destroyedResult.hitTargets[0].destroyed, true);
  assert.equal(destroyedResult.hitTargets[0].scoreHandledByTarget, true);
  assert.equal(destructionScoreCalls, 1, 'Tractor destroy path should award its score once');
  assert.deepEqual(destroyedHarness.events.scores, [500], 'Chain Lightning must not double-award Tractor destruction score');
  assert.deepEqual(destroyedHarness.events.kills, [destroyedTractor], 'destroyed Tractor should still run kill ownership hooks');
  assert.deepEqual(destroyedHarness.events.deaths, [destroyedTractor], 'destroyed Tractor should still run death feedback');

  audioEvents.length = 0;
  const farSource = makeTarget({ x: 100, y: 100 });
  const farTractor = makeTarget({ kind: 'hijacker', x: 251, y: 100, health: 20 });
  const farHarness = makeScene({ enemies: [farSource], hijacker: farTractor, maxChains: 2 });
  const farResult = farHarness.scene.triggerChainLightning(farSource, 4);
  assert.equal(farResult.hitCount, 0, 'Tractor outside the existing 150px range must not be hit');
  assert.equal(farTractor.damageEvents.length, 0);
  assert.equal(audioEvents.filter((event) => event.id === 'chain_lightning_arc').length, 0, 'no-target chain must not play arc audio');

  const onlySource = makeTarget({ x: 100, y: 100 });
  const onlyTractor = makeTarget({ kind: 'hijacker', x: 180, y: 100, health: 20 });
  const onlyHarness = makeScene({ enemies: [onlySource], hijacker: onlyTractor, maxChains: 3 });
  const onlyResult = onlyHarness.scene.triggerChainLightning(onlySource, 4);
  assert.equal(onlyResult.hitCount, 1, 'Tractor should work as the only available secondary target');
  assert.equal(onlyResult.hitTargets[0].target, onlyTractor);
  assert.equal(new Set(onlyResult.hitTargets.map((entry) => entry.target)).size, onlyResult.hitCount, 'Chain Lightning must not hit a target twice');

  const experimentMetrics = { chainLightningOrigins: 0 };
  const experimentState = { active: true, metrics: experimentMetrics };
  const experimentSource = makeTarget({ x: 100, y: 100, health: 20 });
  const experimentTarget = makeTarget({ x: 180, y: 100, health: 20 });
  const experimentHarness = makeScene({
    enemies: [experimentSource, experimentTarget],
    maxChains: 1,
    experiment: experimentState
  });
  const sourceProjectile = { chainLightningOriginConsumed: false };
  const firstOrigin = experimentHarness.scene.triggerChainLightning(experimentSource, 4, sourceProjectile);
  const rejectedOrigin = experimentHarness.scene.triggerChainLightning(experimentSource, 4, sourceProjectile);
  assert.equal(firstOrigin.triggered, true);
  assert.equal(rejectedOrigin.reason, 'projectile_origin_consumed', 'one experiment projectile must not originate Chain Lightning twice');
  assert.equal(experimentMetrics.chainLightningOrigins, 1);

  const feedbackProbe = Object.create(Hijacker.prototype);
  Object.assign(feedbackProbe, {
    active: true,
    destroyed: false,
    radius: 35,
    x: 640,
    y: 130,
    health: 25,
    maxHealth: 30,
    hitFeedbackDurationMs: 180,
    hitFeedbackUntil: 0,
    hitFeedbackLayer: new PIXI.Graphics(),
    healthBar: new PIXI.Graphics(),
    ufoSprite: { tint: 0xffffff }
  });
  feedbackProbe.updateHealthBar();
  const ordinaryFeedback = feedbackProbe.triggerHitFeedback('primary');
  assert.equal(ordinaryFeedback.sourceId, 'ordinary_fire');
  assert.equal(feedbackProbe.hitFeedbackLayer.visible, true);
  assert.ok(ordinaryFeedback.ringRadius > feedbackProbe.radius, 'ordinary fire feedback ring should be unmistakable');
  const chainFeedback = feedbackProbe.triggerHitFeedback('chain_lightning');
  assert.equal(chainFeedback.sourceId, 'chain_lightning');
  assert.notEqual(chainFeedback.color, ordinaryFeedback.color, 'Chain Lightning feedback should have a distinct treatment');
  assert.equal(chainFeedback.braceCount, 4);
  assert.equal(feedbackProbe.updateHitFeedback(feedbackProbe.hitFeedbackUntil + 1), false, 'bounded hit feedback should expire');
  assert.equal(feedbackProbe.hitFeedbackLayer.visible, false);
  assert.equal(feedbackProbe.hitFeedbackLayer._debugHitFeedback?.visible, false, 'expired feedback debug state should not remain visible');

  const layoutCases = [
    { width: 1920, height: 1080, uiScale: 1 },
    { width: 1920, height: 1080, uiScale: 2 },
    { width: 1280, height: 720, uiScale: 1 },
    { width: 1280, height: 720, uiScale: 2 },
    { width: 960, height: 540, uiScale: 2 }
  ].map(({ width, height, uiScale }) => {
    const spawnY = Math.max(112, Math.min(height * 0.18, 132));
    feedbackProbe.y = spawnY;
    feedbackProbe.updateHealthBar();
    const layout = { ...feedbackProbe.healthBar._debugLayout, width, height, uiScale };
    assert.equal(layout.belowCraft, true, 'Tractor health bar should stay below the craft');
    assert.ok(layout.worldY >= 184, `Tractor health bar entered the protected top HUD/message lane: ${JSON.stringify(layout)}`);
    assert.ok(layout.worldY <= height * 0.38, `Tractor health bar left the readable upper combat area: ${JSON.stringify(layout)}`);
    return layout;
  });
  assert.equal(new Set(layoutCases.map((entry) => entry.localY)).size, 1, 'UI scale should not distort the ship-local Tractor health bar');

  console.log('[tractor-chain-lightning] PASS source, target, destroy score, range, only-target, feedback, and layout cases');
} finally {
  AudioManager.playSfx = originalPlaySfx;
}
