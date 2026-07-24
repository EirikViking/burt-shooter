const ARCHETYPES = [
  {
    key: 'conductor',
    title: 'Pattern Conductor',
    movement: 'orchestrate',
    attack: 'fan',
    signature: 'cone',
    palette: 0x37f5ff,
    accent: 0xff55d9
  },
  {
    key: 'forge',
    title: 'Forge Tyrant',
    movement: 'hammer',
    attack: 'burst',
    signature: 'ring',
    palette: 0xff6a2a,
    accent: 0xffd15c
  },
  {
    key: 'mirror',
    title: 'Mirror Hive',
    movement: 'phase',
    attack: 'split',
    signature: 'mirror',
    palette: 0xa77dff,
    accent: 0x7fffd8
  },
  {
    key: 'needle',
    title: 'Needle Regent',
    movement: 'stalk',
    attack: 'sniper',
    signature: 'lance',
    palette: 0xf6fbff,
    accent: 0x37f5ff
  },
  {
    key: 'vortex',
    title: 'Vortex Baron',
    movement: 'orbit',
    attack: 'spiral',
    signature: 'ring',
    palette: 0x52ff8f,
    accent: 0xff55d9
  },
  {
    key: 'jester',
    title: 'Formation Jester',
    movement: 'juke',
    attack: 'fakeout',
    signature: 'cone',
    palette: 0xffe76a,
    accent: 0xff55d9
  },
  {
    key: 'carrier',
    title: 'Drone Cathedral',
    movement: 'carrier',
    attack: 'summon',
    signature: 'adds',
    palette: 0x00d1ff,
    accent: 0xffd15c
  },
  {
    key: 'monolith',
    title: 'Hitbox Monolith',
    movement: 'crush',
    attack: 'wall',
    signature: 'ring',
    palette: 0xff3355,
    accent: 0xf6fbff
  },
  {
    key: 'choir',
    title: 'Laser Choir',
    movement: 'sway',
    attack: 'chord',
    signature: 'cone',
    palette: 0x7fffd8,
    accent: 0xff67dc
  },
  {
    key: 'clock',
    title: 'Clockwork Swarm',
    movement: 'tick',
    attack: 'clock',
    signature: 'lance',
    palette: 0xffd15c,
    accent: 0x37f5ff
  }
];

const CALLSIGNS = [
  'Sonia',
  'Sam the Misfit',
  'Ro ro ro',
  'LANE EATER',
  'NEON WARDEN',
  'Misfit Galaxy',
  'BOSS MUSIC PRIME',
  'THE BIG RECTANGLE',
  'HYPERGLYPH',
  'COIN-SLOT SAINT',
  'SWARM MARSHAL',
  'MISSILE OPERA',
  'QUANTUM AUDITOR',
  'BULLET METRONOME',
  'STARLOCK DUCHESS',
  'THE FOURTH PHASE',
  'VOID PERCUSSION',
  'PANIC ENGINE',
  'CRYSTAL CAPTAIN',
  'FORMATION LAWYER',
  'GRAVITY COMEDIAN',
  'NOVA DEVOURER',
  'THE UNFAIR ONE',
  'LASER TAXONOMIST',
  'BANNER OF TEETH',
  'HANGAR PHANTOM',
  'ASTRO MENACE',
  'BOSS QUEUE OMEGA',
  'THE SCORE DENIER',
  'CIRCUIT EMPRESS',
  'ORBIT KNIGHT',
  'DREAD CABINET',
  'THE LOUD TRIANGLE',
  'IONIC MINISTER',
  'GRUDGE FOUNDRY',
  'RINGMASTER ZERO',
  'THE FINAL WARNING',
  'COMBO BREAKER',
  'VOID BARISTA',
  'SWARM ARCHITECT',
  'MISS PATTERN',
  'THE LONG HITBOX',
  'OMEGA JANITOR',
  'CROWN OF LANES',
  'THE UNINVITED',
  'STARBURST MAGISTRATE',
  'DODGE CHECKER',
  'NOVA COLLECTOR',
  'THE LAST BOSS BEFORE THE NEXT BOSS',
  'CABINET APOCALYPSE'
];

export const BOSS_ROSTER = CALLSIGNS.map((name, index) => {
  const archetype = ARCHETYPES[index % ARCHETYPES.length];
  const chapter = Math.floor(index / ARCHETYPES.length) + 1;
  return {
    id: `nova_boss_${String(index + 1).padStart(2, '0')}`,
    index: index + 1,
    name,
    title: archetype.title,
    archetype: archetype.key,
    movement: archetype.movement,
    attack: archetype.attack,
    signature: archetype.signature,
    palette: archetype.palette,
    accent: archetype.accent,
    chapter,
    art: `/art/generated/nova-swarm/bosses/nova-boss-${String(index + 1).padStart(2, '0')}.png`
  };
});

export function getBossProfile(level = 1) {
  const index = Math.max(0, (Math.round(level) - 1) % BOSS_ROSTER.length);
  return BOSS_ROSTER[index];
}

function hashBossOrderSeed(value) {
  const text = String(value ?? '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createBossOrderRandom(seed) {
  let state = hashBossOrderSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getShuffledBossPool(poolSize, seed, cycleIndex) {
  let pool = [];
  let previousLastId = null;
  for (let currentCycle = 0; currentCycle <= cycleIndex; currentCycle += 1) {
    pool = BOSS_ROSTER.slice(0, poolSize);
    const random = createBossOrderRandom(`${seed}:boss-cycle:${currentCycle}:${poolSize}`);
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }
    if (pool.length > 1 && pool[0]?.id === previousLastId) {
      [pool[0], pool[1]] = [pool[1], pool[0]];
    }
    previousLastId = pool[pool.length - 1]?.id || null;
  }
  return pool;
}

export function getBossProfileForRun(level = 1, {
  seed = 'nova-swarm',
  seenThroughSector = BOSS_ROSTER.length
} = {}) {
  const sector = Math.max(1, Math.round(Number(level) || 1));
  if (sector <= BOSS_ROSTER.length) return BOSS_ROSTER[sector - 1];
  const poolSize = Math.max(1, Math.min(
    BOSS_ROSTER.length,
    Math.floor(Number(seenThroughSector) || BOSS_ROSTER.length)
  ));
  const offset = sector - BOSS_ROSTER.length - 1;
  const cycleIndex = Math.floor(offset / poolSize);
  const cycleOffset = offset % poolSize;
  return getShuffledBossPool(poolSize, seed, cycleIndex)[cycleOffset];
}
