import {
  POINT_DEFENSE_RADIUS,
  claimPiercingTargetHit,
  isWithinPointDefenseRadius
} from '../src/game/ProjectileDefenseRules.js';

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

console.log(`[projectile-defense-rules] PASS radius=${POINT_DEFENSE_RADIUS}`);
