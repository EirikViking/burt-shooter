import {
  POINT_DEFENSE_RADIUS,
  claimPiercingTargetHit,
  isWithinPointDefenseRadius
} from '../src/game/ProjectileDefenseRules.js';
import {
  BOMB_ARMING_MS,
  findBombCommitTarget
} from '../src/game/BombTargetingRules.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const targetA = {};
const targetB = {};
const piercing = { piercing: true };
assert(claimPiercingTargetHit(piercing, targetA), 'piercing shot should hit a target once');
assert(!claimPiercingTargetHit(piercing, targetA), 'piercing shot should not damage the same target every frame');
assert(claimPiercingTargetHit(piercing, targetB), 'piercing shot should still hit a different target');
assert(claimPiercingTargetHit({ piercing: false }, targetA), 'ordinary shot should not use the piercing ledger');

const player = { x: 500, y: 600 };
assert(isWithinPointDefenseRadius(player, { x: 500 + POINT_DEFENSE_RADIUS, y: 600 }), 'point defense should cover its local radius');
assert(!isWithinPointDefenseRadius(player, { x: 500 + POINT_DEFENSE_RADIUS + 1, y: 600 }), 'point defense should stop outside its radius');
assert(!isWithinPointDefenseRadius(player, { x: 900, y: 120 }), 'point defense must not become screen-wide through distant player bullets');

const bombPlayer = { x: 500, y: 650 };
const noBombTarget = findBombCommitTarget({
  player: bombPlayer,
  enemies: [{ active: true, x: 760, y: 260, health: 2, radius: 12 }],
  blastRadius: 150,
  shotDamage: 10
});
assert(!noBombTarget.target, 'bomb should remain banked when no worthwhile target is aligned');

const cluster = [
  { active: true, x: 488, y: 260, health: 3, radius: 12 },
  { active: true, x: 526, y: 274, health: 3, radius: 12 },
  { active: true, x: 548, y: 246, health: 3, radius: 12 }
];
const clusterTarget = findBombCommitTarget({
  player: bombPlayer,
  enemies: cluster,
  blastRadius: 150,
  shotDamage: 10
});
assert(clusterTarget.target && clusterTarget.reason === 'cluster' && clusterTarget.clusterCount >= 2,
  'bomb should commit to an aligned enemy cluster');

const durableTarget = findBombCommitTarget({
  player: bombPlayer,
  enemies: [{ active: true, x: 505, y: 280, health: 60, radius: 18 }],
  blastRadius: 150,
  shotDamage: 10
});
assert(durableTarget.target && durableTarget.reason === 'durable', 'bomb should commit to an aligned durable target');

const bossTarget = findBombCommitTarget({
  player: bombPlayer,
  boss: { active: true, x: 520, y: 180, health: 1000, radius: 52 },
  blastRadius: 150,
  shotDamage: 10
});
assert(bossTarget.target && bossTarget.reason === 'boss', 'bomb should commit to an aligned boss');
assert(BOMB_ARMING_MS >= 500, 'bomb arming window should prevent immediate autofire waste');

console.log(`[projectile-defense-rules] PASS radius=${POINT_DEFENSE_RADIUS} bombArmingMs=${BOMB_ARMING_MS}`);
