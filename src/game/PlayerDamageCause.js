import { translateText } from '../i18n/index.js';

const CAUSE_ALIASES = Object.freeze({
  enemy_bullet: 'hostile_fire',
  boss_bullet: 'hostile_fire',
  hostile_fire: 'hostile_fire',
  projectile: 'hostile_fire',
  boss_projectile: 'hostile_fire',
  enemy_contact: 'enemy_contact',
  boss_contact: 'enemy_contact',
  ship_contact: 'enemy_contact',
  ambient_hazard_contact: 'hazard_impact',
  hazard_contact: 'hazard_impact',
  boss_hazard: 'hazard_impact',
  boss_wall: 'hazard_impact',
  hazard: 'hazard_impact'
});

const CAUSE_LABELS = Object.freeze({
  hostile_fire: 'HOSTILE FIRE',
  enemy_contact: 'ENEMY CONTACT',
  hazard_impact: 'HAZARD IMPACT',
  core_hit: 'CORE HIT'
});

export function normalizePlayerDamageCause(value) {
  const source = String(value || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_') || 'unknown';
  return {
    source,
    category: CAUSE_ALIASES[source] || 'core_hit'
  };
}

export function getPlayerDamageCause(value, { translate = translateText } = {}) {
  const normalized = normalizePlayerDamageCause(value);
  const labelKey = CAUSE_LABELS[normalized.category] || CAUSE_LABELS.core_hit;
  return {
    ...normalized,
    labelKey,
    label: translate(labelKey)
  };
}

export function getPlayerDamageCauseLabel(value, options) {
  return getPlayerDamageCause(value, options).label;
}

