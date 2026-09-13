export const GAME_OVER_FINAL_TRANSMISSION_DECK_VERSION = 1;
export const GAME_OVER_FINAL_TRANSMISSION_STORAGE_KEY = 'nova.gameOverFinalTransmissionDeck.v1';

const variantSources = [
  ['fleet_graveyard', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-interlude-20260722.png'],
  ['fleet_graveyard_echo', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-02-fleet-graveyard.png'],
  ['warp_cathedral', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-03-warp-cathedral.png'],
  ['singularity_coffin', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-04-singularity-coffin.png'],
  ['phoenix_engine', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-05-phoenix-engine.png'],
  ['crystal_starwhale', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-06-crystal-starwhale.png'],
  ['quantum_eclipse', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-07-quantum-eclipse.png'],
  ['aurora_reactor', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-08-aurora-reactor.png'],
  ['ghost_fleet', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-09-ghost-fleet.png'],
  ['celestial_procession', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-10-celestial-procession.png'],
  ['prismatic_supernova', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-11-prismatic-supernova.png'],
  ['nebula_leviathan', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-12-nebula-leviathan.png'],
  ['orbital_ruin', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-13-orbital-ruin.png'],
  ['crimson_ace_wreck', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-14-crimson-ace-wreck.png'],
  ['tractor_storm', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-15-tractor-storm.png'],
  ['railgun_blackout', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-16-railgun-blackout.png'],
  ['swarm_crown', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-17-swarm-crown.png'],
  ['frozen_tomb', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-18-frozen-tomb.png'],
  ['black_box_beacon', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-19-black-box-beacon.png'],
  ['plasma_ocean', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-20-plasma-ocean.png'],
  ['time_fracture', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-21-time-fracture.png'],
  ['sentinel_gate', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-22-sentinel-gate.png'],
  ['meteor_throne', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-23-meteor-throne.png'],
  ['void_garden', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-24-void-garden.png'],
  ['broken_halo', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-25-broken-halo.png'],
  ['boss_leviathan', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-26-boss-leviathan.png'],
  ['magnetic_rift', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-27-magnetic-rift.png'],
  ['drone_constellation', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-28-drone-constellation.png'],
  ['solar_forge', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-29-solar-forge.png'],
  ['last_pilot_beacon', '/art/generated/nova-swarm/gameover/nova-swarm-final-transmission-30-last-pilot-beacon.png']
];

const paths = ['orbital', 'parallax', 'ascend', 'descend', 'figure_eight', 'recoil'];
const scanModes = ['down', 'up', 'left', 'right', 'diagonal_down', 'diagonal_up'];
const shardModes = ['burst', 'spiral', 'shear', 'cascade', 'return'];
const coreModes = ['pulse', 'flare', 'breathe', 'tremor', 'doublebeat'];
const signalModes = [
  'constellation',
  'cathedral',
  'corona',
  'eclipse',
  'compass',
  'reliquary',
  'crystal',
  'orrery',
  'quantum_knot',
  'nova'
];
const titleEntries = ['left', 'right', 'rise', 'drop', 'zoom'];
const palettes = [
  [0x37f5ff, 0xff55d9, 0xfff3a2],
  [0x68ffba, 0x37cfff, 0xffd96b],
  [0xc87dff, 0x4beaff, 0xff7a9d],
  [0xff6b5f, 0xffcf54, 0x72eaff],
  [0x86a7ff, 0x55fff0, 0xf59cff]
];

export const GAME_OVER_FINAL_TRANSMISSION_VARIANTS = Object.freeze(
  variantSources.map(([slug, src], index) => {
    const palette = palettes[index % palettes.length];
    const direction = index % 2 === 0 ? 1 : -1;
    return Object.freeze({
      id: `final_transmission_${String(index + 1).padStart(2, '0')}_${slug}`,
      src,
      signalSrc: `/art/generated/nova-swarm/gameover/signal-cores-20260726/nova-swarm-final-signal-${String(index + 1).padStart(2, '0')}.png`,
      colors: Object.freeze({ primary: palette[0], secondary: palette[1], accent: palette[2] }),
      animation: Object.freeze({
        path: paths[index % paths.length],
        scanMode: scanModes[(index * 5) % scanModes.length],
        shardMode: shardModes[(index * 2) % shardModes.length],
        coreMode: coreModes[(index * 3) % coreModes.length],
        signalMode: signalModes[index % signalModes.length],
        signalPulseRate: Number((0.0036 + index * 0.00019).toFixed(5)),
        signalSpin: direction * Number((0.00018 + index * 0.000025).toFixed(6)),
        signalOrbitCount: 3 + (index % 8),
        signalEchoSpread: Number((0.12 + (index % 6) * 0.025).toFixed(3)),
        signalTilt: Number((((index % 7) - 3) * 0.018).toFixed(3)),
        titleEntry: titleEntries[(index * 4) % titleEntries.length],
        direction,
        phase: Number((index * 0.71).toFixed(2)),
        speed: Number((0.72 + (index % 8) * 0.09).toFixed(2)),
        amplitudeX: 4 + (index % 7) * 2,
        amplitudeY: 3 + ((index * 3) % 8) * 1.5,
        driftX: direction * (2 + (index % 5) * 1.5),
        driftY: ((index % 6) - 2.5) * 1.25,
        zoom: Number((0.022 + (index % 10) * 0.004).toFixed(3)),
        rotation: direction * Number((0.002 + (index % 6) * 0.0015).toFixed(4)),
        fragmentSpin: direction * Number((0.72 + (index % 9) * 0.11).toFixed(2))
      })
    });
  })
);

const fallbackStorage = new Map();
const inMemoryStorage = {
  getItem(key) {
    return fallbackStorage.has(key) ? fallbackStorage.get(key) : null;
  },
  setItem(key, value) {
    fallbackStorage.set(key, String(value));
  }
};

function resolveStorage(storage) {
  if (storage?.getItem && storage?.setItem) return storage;
  try {
    if (globalThis?.localStorage?.getItem && globalThis?.localStorage?.setItem) return globalThis.localStorage;
  } catch {
    // Privacy modes can deny localStorage. The per-session bag still prevents repeats.
  }
  return inMemoryStorage;
}

function shuffledIds(random) {
  const ids = GAME_OVER_FINAL_TRANSMISSION_VARIANTS.map((variant) => variant.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.max(0, Math.min(index, Math.floor(Number(random?.()) * (index + 1)) || 0));
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  }
  return ids;
}

function readDeck(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(GAME_OVER_FINAL_TRANSMISSION_STORAGE_KEY) || 'null');
    if (parsed?.version !== GAME_OVER_FINAL_TRANSMISSION_DECK_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function prepareDeck(targetStorage, random) {
  const validIds = new Set(GAME_OVER_FINAL_TRANSMISSION_VARIANTS.map((variant) => variant.id));
  const saved = readDeck(targetStorage) || {};
  const seen = new Set();
  let remaining = Array.isArray(saved.remaining)
    ? saved.remaining.filter((id) => validIds.has(id) && !seen.has(id) && seen.add(id))
    : [];
  const lastId = validIds.has(saved.lastId) ? saved.lastId : null;

  if (remaining.length === 0) {
    remaining = shuffledIds(random);
    if (remaining.length > 1 && remaining[0] === lastId) {
      const swapIndex = 1 + Math.max(0, Math.min(remaining.length - 2, Math.floor(Number(random?.()) * (remaining.length - 1)) || 0));
      [remaining[0], remaining[swapIndex]] = [remaining[swapIndex], remaining[0]];
    }
  }

  const pendingId = validIds.has(saved.pendingId) && remaining.includes(saved.pendingId)
    ? saved.pendingId
    : null;
  return { targetStorage, remaining, lastId, pendingId, validIds };
}

function writeDeck(targetStorage, state) {
  try {
    targetStorage.setItem(GAME_OVER_FINAL_TRANSMISSION_STORAGE_KEY, JSON.stringify({
      version: GAME_OVER_FINAL_TRANSMISSION_DECK_VERSION,
      ...state
    }));
  } catch {
    // The caller still receives a valid session selection when persistence is unavailable.
  }
}

export function reserveNextGameOverFinalTransmissionVariant({ storage, random = Math.random } = {}) {
  const deck = prepareDeck(resolveStorage(storage), random);
  const selectedId = deck.pendingId || deck.remaining[0];
  writeDeck(deck.targetStorage, {
    remaining: deck.remaining,
    lastId: deck.lastId,
    pendingId: selectedId
  });
  return GAME_OVER_FINAL_TRANSMISSION_VARIANTS.find((variant) => variant.id === selectedId)
    || GAME_OVER_FINAL_TRANSMISSION_VARIANTS[0];
}

export function commitGameOverFinalTransmissionVariant(variantOrId, { storage } = {}) {
  const targetStorage = resolveStorage(storage);
  const saved = readDeck(targetStorage) || {};
  const selectedId = String(variantOrId?.id || variantOrId || saved.pendingId || '');
  const validIds = new Set(GAME_OVER_FINAL_TRANSMISSION_VARIANTS.map((variant) => variant.id));
  if (!validIds.has(selectedId)) return false;
  const seen = new Set();
  const remaining = (Array.isArray(saved.remaining) ? saved.remaining : [])
    .filter((id) => validIds.has(id) && id !== selectedId && !seen.has(id) && seen.add(id));
  writeDeck(targetStorage, { remaining, lastId: selectedId, pendingId: null });
  return true;
}

export function selectNextGameOverFinalTransmissionVariant({ storage, random = Math.random } = {}) {
  const variant = reserveNextGameOverFinalTransmissionVariant({ storage, random });
  commitGameOverFinalTransmissionVariant(variant, { storage });
  return variant;
}

export function getGameOverFinalTransmissionAnimationSignature(variant) {
  return JSON.stringify(variant?.animation || {});
}
