const freezeEntries = (entries) => Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));

export const RIVAL_WING_FORMATIONS = freezeEntries([
  { id: 'spearhead', label: 'SPEARHEAD', moveStyle: 'needle', speedMult: 1.10, swayMult: 0.92, diveBiasMult: 1.16, color: 0xffd15c },
  { id: 'pincer', label: 'PINCER WING', moveStyle: 'pincer', speedMult: 1.04, swayMult: 1.02, diveBiasMult: 1.20, color: 0xff8f5a },
  { id: 'orbit', label: 'ORBIT WING', moveStyle: 'orbit', speedMult: 1.02, swayMult: 1.22, diveBiasMult: 0.92, color: 0x7fffd8 },
  { id: 'weave', label: 'WEAVE WING', moveStyle: 'weave_wall', speedMult: 1.06, swayMult: 1.30, diveBiasMult: 1.04, color: 0xff66ff },
  { id: 'chain', label: 'CHAIN WING', moveStyle: 'chain', speedMult: 1.08, swayMult: 1.12, diveBiasMult: 1.18, color: 0x7df9ff },
  { id: 'hammer', label: 'HAMMER WING', moveStyle: 'sweep', speedMult: 0.94, swayMult: 1.04, diveBiasMult: 0.96, color: 0xff6174 },
  { id: 'feint', label: 'FEINT WING', moveStyle: 'feint', speedMult: 1.12, swayMult: 1.16, diveBiasMult: 1.26, color: 0xcaa6ff },
  { id: 'split', label: 'SPLIT WING', moveStyle: 'split_sweep', speedMult: 1.05, swayMult: 1.18, diveBiasMult: 1.14, color: 0x66ff9d },
  { id: 'pulse', label: 'PULSE WING', moveStyle: 'pulse', speedMult: 0.98, swayMult: 1.24, diveBiasMult: 0.90, color: 0xffef7e },
  { id: 'ambush', label: 'AMBUSH WING', moveStyle: 'ambush', speedMult: 1.14, swayMult: 1.08, diveBiasMult: 1.30, color: 0xff9d66 }
]);

export const RIVAL_WING_DISCIPLINES = freezeEntries([
  { id: 'standard', healthMult: 1.00, speedMult: 1.00, fireDelayMult: 1.00, projectileSpeedMult: 1.00, fireScalarMult: 1.00 },
  { id: 'armored', healthMult: 1.18, speedMult: 0.94, fireDelayMult: 1.02, projectileSpeedMult: 1.00, fireScalarMult: 0.98 },
  { id: 'rapid', healthMult: 1.00, speedMult: 1.08, fireDelayMult: 0.88, projectileSpeedMult: 1.02, fireScalarMult: 1.04 },
  { id: 'ballistic', healthMult: 1.00, speedMult: 1.02, fireDelayMult: 0.96, projectileSpeedMult: 1.18, fireScalarMult: 1.00 },
  { id: 'evasive', healthMult: 1.00, speedMult: 1.14, fireDelayMult: 1.04, projectileSpeedMult: 1.00, fireScalarMult: 0.96 },
  { id: 'siege', healthMult: 1.12, speedMult: 0.90, fireDelayMult: 0.90, projectileSpeedMult: 1.08, fireScalarMult: 1.06 },
  { id: 'skirmish', healthMult: 1.00, speedMult: 1.10, fireDelayMult: 0.94, projectileSpeedMult: 1.06, fireScalarMult: 1.02 },
  { id: 'guard', healthMult: 1.10, speedMult: 0.96, fireDelayMult: 0.98, projectileSpeedMult: 0.98, fireScalarMult: 1.00 },
  { id: 'lancer', healthMult: 1.00, speedMult: 1.06, fireDelayMult: 1.02, projectileSpeedMult: 1.22, fireScalarMult: 0.94 },
  { id: 'pressure', healthMult: 1.04, speedMult: 1.04, fireDelayMult: 0.86, projectileSpeedMult: 1.10, fireScalarMult: 1.08 }
]);

export const RIVAL_WING_VOLLEYS = freezeEntries([
  { id: 'aimed', shotPattern: 'aimed', volley: null, fireDelayMult: 1.00 },
  { id: 'crossfire', shotPattern: 'crossfire', volley: 'crossfire', fireDelayMult: 1.04 },
  { id: 'fan', shotPattern: 'fan', volley: null, fireDelayMult: 1.10 },
  { id: 'net', shotPattern: 'net', volley: null, fireDelayMult: 1.02 },
  { id: 'needle', shotPattern: 'needle', volley: null, fireDelayMult: 1.08 },
  { id: 'sweep', shotPattern: 'sweep', volley: null, fireDelayMult: 0.98 },
  { id: 'burst', shotPattern: 'burst_pair', volley: 'staggered', fireDelayMult: 1.06 },
  { id: 'pulse', shotPattern: 'aimed', volley: 'pulse', fireDelayMult: 1.02 },
  { id: 'stagger', shotPattern: 'crossfire', volley: 'staggered', fireDelayMult: 1.08 },
  { id: 'screen', shotPattern: 'net', volley: 'crossfire', fireDelayMult: 1.12 }
]);

export const RIVAL_WING_MORALES = freezeEntries([
  { id: 'hold', label: 'HOLD THE LINE', speedMult: 0.90, fireDelayMult: 0.88, projectileSpeedMult: 1.04, swayMult: 0.92, diveBiasMult: 0.90, moveStyle: 'pulse', shotPattern: null, volley: null, healthMult: 1.00 },
  { id: 'berserk', label: 'REVENGE RUSH', speedMult: 1.20, fireDelayMult: 0.80, projectileSpeedMult: 1.08, swayMult: 1.12, diveBiasMult: 1.30, moveStyle: 'feint', shotPattern: null, volley: 'staggered', healthMult: 1.00 },
  { id: 'scatter', label: 'SCATTER', speedMult: 1.16, fireDelayMult: 1.04, projectileSpeedMult: 1.00, swayMult: 1.36, diveBiasMult: 1.18, moveStyle: 'split_sweep', shotPattern: null, volley: null, healthMult: 1.00 },
  { id: 'clamp', label: 'PINCER CLAMP', speedMult: 1.08, fireDelayMult: 0.92, projectileSpeedMult: 1.06, swayMult: 1.10, diveBiasMult: 1.32, moveStyle: 'pincer', shotPattern: 'crossfire', volley: null, healthMult: 1.00 },
  { id: 'wall', label: 'SHIELD WALL', speedMult: 0.88, fireDelayMult: 0.96, projectileSpeedMult: 0.98, swayMult: 0.90, diveBiasMult: 0.82, moveStyle: 'weave_wall', shotPattern: null, volley: null, healthMult: 1.12 },
  { id: 'salvo', label: 'FINAL SALVO', speedMult: 1.00, fireDelayMult: 0.84, projectileSpeedMult: 1.16, swayMult: 1.04, diveBiasMult: 1.04, moveStyle: null, shotPattern: 'crossfire', volley: 'crossfire', healthMult: 1.00 },
  { id: 'retreat', label: 'FIGHTING RETREAT', speedMult: 1.24, fireDelayMult: 1.14, projectileSpeedMult: 1.02, swayMult: 1.20, diveBiasMult: 0.88, moveStyle: 'sweep', shotPattern: null, volley: null, healthMult: 1.00 },
  { id: 'revenge', label: 'REVENGE LANCES', speedMult: 1.08, fireDelayMult: 0.94, projectileSpeedMult: 1.26, swayMult: 0.96, diveBiasMult: 1.16, moveStyle: 'needle', shotPattern: 'needle', volley: null, healthMult: 1.00 },
  { id: 'orbit', label: 'ORBITAL LOCK', speedMult: 1.10, fireDelayMult: 0.90, projectileSpeedMult: 1.10, swayMult: 1.28, diveBiasMult: 0.94, moveStyle: 'orbit', shotPattern: 'sweep', volley: 'pulse', healthMult: 1.00 },
  { id: 'collapse', label: 'MORALE COLLAPSE', speedMult: 0.76, fireDelayMult: 1.30, projectileSpeedMult: 0.90, swayMult: 0.82, diveBiasMult: 0.70, moveStyle: 'chain', shotPattern: null, volley: null, healthMult: 0.78 }
]);

const doctrines = [];
for (const formation of RIVAL_WING_FORMATIONS) for (const discipline of RIVAL_WING_DISCIPLINES) for (const volley of RIVAL_WING_VOLLEYS) for (const morale of RIVAL_WING_MORALES) {
  doctrines.push(Object.freeze({
    id: `${formation.id}_${discipline.id}_${volley.id}_${morale.id}`,
    number: doctrines.length + 1,
    formationId: formation.id, formationLabel: formation.label,
    disciplineId: discipline.id, volleyId: volley.id,
    moraleId: morale.id, moraleLabel: morale.label,
    color: formation.color, formation, discipline, volley, morale
  }));
}

export const RIVAL_WING_CATALOG = Object.freeze(doctrines);
export const RIVAL_WING_VARIANT_COUNT = doctrines.length;
const BY_ID = new Map(doctrines.map((entry) => [entry.id, entry]));
export const getRivalWingDoctrineById = (id) => BY_ID.get(String(id || '')) || null;

export function pickRivalWingDoctrine(seed = 'nova-swarm', sequence = 0, options = {}) {
  let index = hashString(`${seed}:rival-wing:${Math.max(0, Math.floor(Number(sequence) || 0))}`) % doctrines.length;
  if (doctrines.length > 1 && doctrines[index]?.id === String(options.excludeId || '')) index = (index + 7879) % doctrines.length;
  return doctrines[index] || null;
}

export function applyRivalWingToEnemy(enemy, doctrineOrId) {
  const doctrine = typeof doctrineOrId === 'string' ? getRivalWingDoctrineById(doctrineOrId) : doctrineOrId;
  if (!enemy || enemy.kind !== 'enemy' || enemy.isAce || enemy.rivalWingDoctrine || !doctrine) return null;
  const scoreValue = Number(enemy.scoreValue) || 0;
  const { formation, discipline, volley } = doctrine;
  if ((Number(enemy.health) || 1) > 1 || discipline.healthMult >= 1.18) {
    const health = Math.max(1, Math.ceil((Number(enemy.health) || 1) * discipline.healthMult));
    enemy.health = health; enemy.maxHealth = health;
  }
  enemy.speed = Math.max(0.1, (Number(enemy.speed) || 1) * formation.speedMult * discipline.speedMult);
  enemy.shootDelay = Math.max(42, (Number(enemy.shootDelay) || 120) * discipline.fireDelayMult * volley.fireDelayMult);
  enemy.tacticalProjectileSpeedScalar = Math.max(0.5, (Number(enemy.tacticalProjectileSpeedScalar) || 1) * discipline.projectileSpeedMult);
  enemy.tacticalFireScalar = Math.max(0.1, (Number(enemy.tacticalFireScalar) || 1) * discipline.fireScalarMult);
  enemy.tacticalDiveBias = Math.max(0.1, (Number(enemy.tacticalDiveBias) || 1) * formation.diveBiasMult);
  enemy.tacticalSwayScalar = Math.max(0.5, (Number(enemy.tacticalSwayScalar) || 1) * formation.swayMult);
  enemy.tacticalMoveStyle = formation.moveStyle;
  enemy.tacticalShotPattern = volley.shotPattern;
  enemy.waveTactic = { ...(enemy.waveTactic || {}), move: formation.moveStyle, shot: volley.shotPattern, volley: volley.volley };
  enemy.rivalWingDoctrine = doctrine; enemy.rivalWingMoraleActive = false; enemy.scoreValue = scoreValue;
  return doctrine;
}

export function activateRivalWingMorale(enemy) {
  const doctrine = enemy?.rivalWingDoctrine;
  if (!doctrine || enemy.rivalWingMoraleActive || Number(enemy.health) <= 0) return null;
  const morale = doctrine.morale;
  enemy.rivalWingMoraleActive = true;
  enemy.speed = Math.max(0.1, (Number(enemy.speed) || 1) * morale.speedMult);
  enemy.shootDelay = Math.max(38, (Number(enemy.shootDelay) || 120) * morale.fireDelayMult);
  enemy.tacticalProjectileSpeedScalar = Math.max(0.5, (Number(enemy.tacticalProjectileSpeedScalar) || 1) * morale.projectileSpeedMult);
  enemy.tacticalSwayScalar = Math.max(0.5, (Number(enemy.tacticalSwayScalar) || 1) * morale.swayMult);
  enemy.tacticalDiveBias = Math.max(0.1, (Number(enemy.tacticalDiveBias) || 1) * morale.diveBiasMult);
  if (morale.healthMult !== 1) {
    const oldMax = Math.max(1, Number(enemy.maxHealth) || 1);
    const nextMax = Math.max(1, Math.ceil(oldMax * morale.healthMult));
    enemy.maxHealth = nextMax; enemy.health = Math.max(1, Math.min(nextMax, (Number(enemy.health) || 1) + (nextMax - oldMax)));
  }
  if (morale.moveStyle) enemy.tacticalMoveStyle = morale.moveStyle;
  if (morale.shotPattern) enemy.tacticalShotPattern = morale.shotPattern;
  enemy.waveTactic = { ...(enemy.waveTactic || {}), move: morale.moveStyle || enemy.tacticalMoveStyle, shot: morale.shotPattern || enemy.tacticalShotPattern, volley: morale.volley || enemy.waveTactic?.volley || null };
  return morale;
}

export const getRivalWingMechanicalSignature = (entry) => JSON.stringify({ formation: entry?.formation, discipline: entry?.discipline, volley: entry?.volley, morale: entry?.morale });

function hashString(value) { let hash = 2166136261; for (const char of String(value || '')) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
