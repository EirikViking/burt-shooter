import { getSelectableShips } from '../src/config/ShipMetadata.js';
import { getTraitDetailLines, getTraitHudHint } from '../src/config/ShipTraitDescriptions.js';

const failures = [];
const vagueOnly = new Set([
  'quick reload and nimble drift.',
  'balanced arcade handling.',
  'passive trait active.'
]);

function fail(message) {
  failures.push(message);
}

function textIncludesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function requireText(condition, ship, message) {
  if (!condition) fail(`${ship.name || ship.id}: ${message}`);
}

for (const ship of getSelectableShips()) {
  const trait = ship.trait || ship.visuals?.trait;
  if (!trait?.label) continue;

  const lines = getTraitDetailLines(trait, ship);
  const hint = getTraitHudHint(trait, ship);
  const text = `${trait.label} ${hint} ${lines.join(' ')}`.toLowerCase();
  const effects = trait.effects || {};
  const combat = effects.combat || {};

  requireText(Array.isArray(lines) && lines.length >= 2, ship, 'trait explanation should include multiple player-facing lines');
  requireText(text.length >= 90, ship, 'trait explanation is too short to explain visible behavior and tradeoffs');
  requireText(!(lines.length === 1 && vagueOnly.has(String(lines[0] || '').toLowerCase())), ship, 'trait explanation is only vague flavor text');

  if (combat.wingShotEvery) {
    requireText(textIncludesAny(text, ['side bullet', 'wing bullet', 'from your wings']), ship, 'wing-shot traits must mention side or wing bullets');
    requireText(text.includes('shots fired') && text.includes('not seconds'), ship, 'wing-shot traits must explain that the counter counts shots fired, not seconds');
  }

  if (combat.bonusShotEvery) {
    requireText(textIncludesAny(text, ['bonus shot', 'extra bonus', 'extra shot']), ship, 'bonus-shot traits must mention extra or bonus shots');
    requireText(text.includes('shots fired') && text.includes('not seconds'), ship, 'bonus-shot traits must explain that the counter counts shots fired, not seconds');
  }

  if (combat.pierceEvery) {
    requireText(text.includes('pierc'), ship, 'piercing traits must mention piercing');
    requireText(text.includes('shots fired') && text.includes('not seconds'), ship, 'piercing traits must explain that the counter counts shots fired, not seconds');
  }

  if (combat.critEvery) {
    requireText(textIncludesAny(text, ['critical', 'heavier']), ship, 'critical traits must mention critical or heavier shots');
    requireText(text.includes('shots fired') && text.includes('not seconds'), ship, 'critical traits must explain that the counter counts shots fired, not seconds');
  }

  if (combat.dodgePulseRadius) {
    requireText(text.includes('dodge') && text.includes('pulse'), ship, 'dodge pulse traits must mention dodge pulse');
    requireText(textIncludesAny(text, ['clear', 'clears']) && text.includes('nearby'), ship, 'dodge pulse traits must explain nearby bullet clearing');
  }

  if (Number(combat.nearMissScoreMult || 1) > 1.02) {
    requireText(text.includes('near miss') && text.includes('score'), ship, 'near-miss traits must explain the score reward');
    requireText(text.includes('does not protect'), ship, 'near-miss traits must not imply protection from hits');
  }

  const hitbox = Number(effects.hitboxMult || 1);
  if (hitbox <= 0.94) requireText(text.includes('smaller hitbox'), ship, 'smaller hitbox traits must say smaller hitbox');
  if (hitbox >= 1.05) requireText(text.includes('larger hitbox'), ship, 'larger hitbox traits must say larger hitbox');

  const projectileRadius = Number(combat.projectileRadiusMult || 1);
  if (projectileRadius >= 1.08) requireText(text.includes('larger projectiles'), ship, 'larger projectile traits must explain easier-to-land shots');
  if (projectileRadius <= 0.94) requireText(text.includes('smaller projectiles'), ship, 'smaller projectile traits must explain precision tradeoff');

  const fireRate = Number(effects.fireRateMult || 1);
  const damage = Number(effects.damageMult || 1);
  const speed = Number(effects.speedMult || 1);
  const bulletSpeed = Number(effects.bulletSpeedMult || 1);
  const spread = Number(effects.spreadDelta || 0);

  if (fireRate <= 0.95) requireText(text.includes('faster reload'), ship, 'faster reload traits must mention reload speed');
  if (fireRate >= 1.05) requireText(text.includes('slower reload'), ship, 'slower reload traits must mention reload tradeoff');
  if (damage >= 1.06) requireText(text.includes('stronger main shots'), ship, 'damage-up traits must mention stronger main shots');
  if (damage <= 0.95) requireText(text.includes('lighter main-shot damage'), ship, 'damage-down traits must mention lighter main-shot damage');
  if (speed >= 1.05) requireText(text.includes('faster ship movement'), ship, 'speed-up traits must mention faster movement');
  if (speed <= 0.95) requireText(text.includes('slower ship movement'), ship, 'speed-down traits must mention slower movement');
  if (bulletSpeed >= 1.08) requireText(text.includes('faster bullets'), ship, 'bullet-speed traits must mention faster bullets');
  if (spread >= 0.025) requireText(text.includes('wider shot spread'), ship, 'spread traits must mention wider shot spread');
  if (spread <= -0.025) requireText(text.includes('tighter shot spread'), ship, 'tight spread traits must mention tighter shot spread');
}

if (failures.length) {
  console.error(`[ship-trait-explanations] FAIL ${failures.length} issue(s)`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`[ship-trait-explanations] PASS ships=${getSelectableShips().length}`);
