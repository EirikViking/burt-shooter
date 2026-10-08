import assert from 'node:assert/strict';
import { sampleChallengeFlightOffset, CHALLENGE_FLIGHT_PATTERNS } from '../src/config/ChallengeFlights.js';
import { isSpaceSnakeWave, getSpaceSnakeSectionHealth } from '../src/config/SpaceSnakes.js';
globalThis.Audio = class { addEventListener() {} };
globalThis.window = { addEventListener() {}, removeEventListener() {}, location: { origin: 'http://localhost', search: '' } };
const { EnemyManager } = await import('../src/managers/EnemyManager.js');
const m = Object.assign(Object.create(EnemyManager.prototype), {
  level: 51, currentWaveIndex: 0, phase: 'WAVES', state: 'WAVE_ACTIVE', waveActiveTimer: 2200,
  waves: [{ type: 'generated', count: 10, isChallenge: true }], mayhemReinforcementTriggeredWaves: new Set(),
  game: { runMode: 'overrun_tactical', gameId: 'feedback-fixture', getWidth: () => 1280, getHeight: () => 720,
    getRunModeProfile: () => ({ routineReinforcementsEnabled: true }),
    scenes: { play: { player: { invulnerable: false }, bulletManager: { enemyBullets: [] } } } }
});
assert.ok(m.getMayhemReinforcementEligibility(5).reasons.includes('challenge_flight_active'));
m.mayhemReinforcementState = { spawnAt: 0, spawned: false };
assert.equal(m.updateMayhemReinforcement(), false);
assert.equal(m.mayhemReinforcementState, null, 'a delayed reinforcement cannot leak into a challenge');
m.pendingTransitionHijackerSpawn = { level: 51 };
assert.equal(m.releasePendingTransitionHijackerSpawn(), false);
assert.ok(m.pendingTransitionHijackerSpawn, 'deferred Hijacker keeps its future eligibility');
m.waves[0].isChallenge = false;
assert.ok(!m.getMayhemReinforcementEligibility(5).reasons.includes('challenge_flight_active'));
const shapes = [];
for (const pattern of CHALLENGE_FLIGHT_PATTERNS) {
  assert.deepEqual(sampleChallengeFlightOffset(pattern.id, 0, 0, 1280, 720), { x: 0, y: 0 });
  const samples = Array.from({ length: 290 }, (_, tick) => sampleChallengeFlightOffset(pattern.id, tick / 60, 0, 1280, 720));
  assert.ok(Math.max(...samples.map(p => p.x)) - Math.min(...samples.map(p => p.x)) > 100, `${pattern.id} moves purposefully`);
  for (let i = 1; i < samples.length; i++) assert.ok(Math.hypot(samples[i].x - samples[i-1].x, samples[i].y - samples[i-1].y) < 12, 'continuous routes');
  shapes.push(JSON.stringify(samples[120]));
}
assert.equal(new Set(shapes).size, 5);
assert.equal(Array.from({length: 10000}, (_, i) => isSpaceSnakeWave(i / 10000)).filter(Boolean).length, 1200);
assert.deepEqual([6,51,143].map(getSpaceSnakeSectionHealth), [15,75,169]);
console.log('[feedback-encounters] PASS challenge admission, delayed races, distinct continuous routes, bounded snake burden');
