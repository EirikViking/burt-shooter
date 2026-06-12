const NAMES_A = Object.freeze([
  'Knife', 'Debt', 'Cinder', 'Static', 'Rivet', 'Comet', 'Jury', 'Viper', 'Signal', 'Grudge',
  'Receipt', 'Needle', 'Blackbox', 'Voltage', 'Lunar', 'Hazard', 'Switch', 'Ash', 'Vector', 'Neon'
]);

const NAMES_B = Object.freeze([
  'Clerk', 'Widow', 'Marshal', 'Saint', 'Bailiff', 'Drifter', 'Notary', 'Hook', 'Witness', 'Courier',
  'Taxman', 'Surgeon', 'Prowler', 'Dentist', 'Broker', 'Pilot', 'Warden', 'Gavel', 'Lancer', 'Mechanic'
]);

const ROLES = Object.freeze([
  'danger mid ship',
  'armed interceptor',
  'swarm collector',
  'lane bruiser',
  'fast punish craft',
  'midweight enforcer'
]);

const MOVES = Object.freeze(['sweep', 'needle', 'feint', 'pincer', 'pulse', 'split_sweep', 'ambush', 'orbit']);
const SHOTS = Object.freeze(['needle', 'burst_pair', 'fan', 'crossfire', 'sweep', 'net']);
const TINTS = Object.freeze([0xff5d7a, 0xffb84a, 0x8bffde, 0xc889ff, 0xfff08a, 0x7dd8ff, 0xff7f50, 0xb6ff4a]);

export const DANGER_MID_SHIPS = Object.freeze(Array.from({ length: 58 }, (_, index) => {
  const id = `danger_mid_${String(index + 1).padStart(2, '0')}`;
  const name = `${NAMES_A[index % NAMES_A.length]} ${NAMES_B[(index * 7) % NAMES_B.length]}`;
  const tier = index < 18 ? 'Red Contact' : index < 38 ? 'Black Contact' : 'Overrun Contact';
  const unlockLevel = 8 + Math.floor(index / 4);
  const tint = TINTS[index % TINTS.length];
  const accent = TINTS[(index * 3 + 2) % TINTS.length];
  const move = MOVES[index % MOVES.length];
  const shot = SHOTS[(index * 5) % SHOTS.length];
  return Object.freeze({
    id,
    displayName: name,
    role: ROLES[index % ROLES.length],
    tier,
    unlockLevel,
    tint,
    accent,
    hullTint: index % 3 === 0 ? 0xffffff : (0xdffcff ^ (index * 0x04111f)),
    healthScalar: 1.85 + (index % 5) * 0.16,
    speedScalar: 0.9 + (index % 7) * 0.045,
    fireScalar: 0.42 + (index % 4) * 0.055,
    fireDelayMult: 1.18 + (index % 6) * 0.055,
    projectileSpeedScalar: 0.9 + (index % 5) * 0.035,
    scoreScalar: 2.2 + (index % 6) * 0.22,
    radiusScalar: 1.08 + (index % 4) * 0.035,
    spriteScale: 1.08 + (index % 4) * 0.045,
    move,
    shot,
    codexTip: `Hard hull, sharp tell. Kill ${name} before it turns a normal wave into paperwork with teeth.`
  });
}));

const DANGER_MID_BY_ID = new Map(DANGER_MID_SHIPS.map((profile) => [profile.id, profile]));

export function getDangerMidShipProfile(id) {
  return DANGER_MID_BY_ID.get(id) || null;
}

export function pickDangerMidShipProfile(level = 8, seed = 0) {
  const safeLevel = Math.max(8, Number(level) || 8);
  const unlocked = DANGER_MID_SHIPS.filter((profile) => profile.unlockLevel <= safeLevel);
  const pool = unlocked.length ? unlocked : DANGER_MID_SHIPS.slice(0, 4);
  const index = Math.abs(Math.floor((safeLevel * 17 + seed * 31) % pool.length));
  return pool[index] || DANGER_MID_SHIPS[0];
}
