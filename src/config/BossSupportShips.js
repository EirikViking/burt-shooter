import { GENERATED_ENEMY_ASSET_COUNT } from './GeneratedEnemyProfiles.js';
import { hashString } from './VisualVariantCatalog.js';

export const BOSS_SUPPORT_SHIP_TOTAL = 111;

const SUPPORT_PREFIXES = [
  'Mercy', 'Suture', 'Patch', 'Fuel', 'Halo', 'Spare', 'Med', 'Weld', 'Rescue', 'Bandage',
  'Defib', 'Cradle', 'Triage', 'Snack', 'Mender', 'Mint', 'Foam', 'Bubble', 'Relay', 'Stitch',
  'Emergency', 'Kindly', 'Orbit', 'Soft', 'Golden', 'Neon', 'Tiny', 'Union', 'Pocket', 'Royal'
];

const SUPPORT_NOUNS = [
  'Tender', 'Barge', 'Canoe', 'Lunchbox', 'Cupholder', 'Ambulance', 'Ladle', 'Battery',
  'Syringe', 'Towboat', 'Thermos', 'Spanner', 'Oath', 'Clipboard', 'Fuse', 'Kettle',
  'Button', 'Cradle', 'Brace', 'Courier', 'Invoice', 'Mop', 'Lantern', 'Bell', 'Plaster',
  'Clamp', 'Beacon', 'Harness', 'Wrench', 'Float', 'Crutch', 'Rig', 'Cab'
];

const SUPPORT_ROLES = [
  { id: 'fuel_runner', healPercent: 0.052, speed: 1.5, radius: 16, health: 2, score: 120 },
  { id: 'armor_mender', healPercent: 0.062, speed: 1.38, radius: 18, health: 3, score: 145 },
  { id: 'shield_tug', healPercent: 0.048, speed: 1.62, radius: 15, health: 2, score: 135 },
  { id: 'spark_barge', healPercent: 0.07, speed: 1.26, radius: 20, health: 3, score: 160 },
  { id: 'mercy_skiff', healPercent: 0.056, speed: 1.54, radius: 17, health: 2, score: 130 },
  { id: 'reactor_nurse', healPercent: 0.066, speed: 1.32, radius: 19, health: 3, score: 170 },
  { id: 'panic_patch', healPercent: 0.044, speed: 1.7, radius: 15, health: 2, score: 150 },
  { id: 'warranty_tow', healPercent: 0.06, speed: 1.44, radius: 18, health: 3, score: 155 }
];

const SUPPORT_PALETTES = [
  [0x7dffcc, 0xfff08a],
  [0x8cfbff, 0xff55d9],
  [0xffe76a, 0x37f5ff],
  [0xa6ff4d, 0xff9f4a],
  [0xff86c8, 0x7dffcc],
  [0xd4f8ff, 0xffd15c],
  [0xc77dff, 0x7cffcb],
  [0xffffff, 0xff5c8a]
];

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildSupportShip(index) {
  const role = SUPPORT_ROLES[(index * 5 + Math.floor(index / 7)) % SUPPORT_ROLES.length];
  const [tint, accent] = SUPPORT_PALETTES[(index * 3 + Math.floor(index / 11)) % SUPPORT_PALETTES.length];
  const prefix = SUPPORT_PREFIXES[(index * 13 + Math.floor(index / 5)) % SUPPORT_PREFIXES.length];
  const noun = SUPPORT_NOUNS[(index * 17 + Math.floor(index / 3)) % SUPPORT_NOUNS.length];
  const mark = Math.floor(index / SUPPORT_NOUNS.length) + 1;
  const drift = (index % 2 ? -1 : 1) * (0.18 + (index % 7) * 0.025);
  return {
    id: `boss_support_ship_${String(index + 1).padStart(3, '0')}`,
    type: `boss_support_ship_${String(index + 1).padStart(3, '0')}`,
    displayName: `${prefix} ${noun} ${mark}`,
    role: role.id,
    signalClass: 'boss support',
    unarmed: true,
    healPercent: round(role.healPercent + (index % 5) * 0.002, 3),
    speed: round(role.speed + (index % 9) * 0.018, 2),
    radius: role.radius + (index % 3),
    health: role.health + (index % 29 === 0 ? 1 : 0),
    scoreValue: role.score + (index % 17) * 4,
    tint,
    accent,
    spriteIndex: (index * 29 + Math.floor(index / 4) * 7) % GENERATED_ENEMY_ASSET_COUNT,
    spriteScale: round(1.02 + (index % 6) * 0.025, 3),
    haloScale: round(1.45 + (index % 4) * 0.12, 2),
    routeDrift: drift,
    entryMs: 1180 + (index % 8) * 45,
    behaviorSignature: [
      role.id,
      role.healPercent,
      role.speed,
      role.radius,
      role.health,
      tint,
      accent,
      drift,
      index
    ].join('|')
  };
}

export const BOSS_SUPPORT_SHIPS = Object.freeze(
  Array.from({ length: BOSS_SUPPORT_SHIP_TOTAL }, (_, index) => Object.freeze(buildSupportShip(index)))
);

const SUPPORT_BY_ID = new Map(BOSS_SUPPORT_SHIPS.map((profile) => [profile.id, profile]));

export function getBossSupportShipProfile(id) {
  return SUPPORT_BY_ID.get(String(id)) || null;
}

export function pickBossSupportShipProfile(level = 1, seed = '') {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const hash = hashString(`${safeLevel}:${seed || Date.now()}`);
  return BOSS_SUPPORT_SHIPS[hash % BOSS_SUPPORT_SHIPS.length] || BOSS_SUPPORT_SHIPS[0];
}
