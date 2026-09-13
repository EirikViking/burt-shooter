import { enterPacingLevel, recoveringFromCombination } from './EncounterPacing.js';
// Identity and reveal order are shared by the catalog, seeded scheduler and
// the trusted desktop test launcher. No art or audio is preloaded here.
export const MYSTERIES = Object.freeze([
  {
    "id": "glass_widow",
    "name": "Glass Widow",
    "family": "predator",
    "unlockSector": 11
  },
  {
    "id": "cinder_manta",
    "name": "Cinder Manta",
    "family": "predator",
    "unlockSector": 16
  },
  {
    "id": "needle_saint",
    "name": "Needle Saint",
    "family": "predator",
    "unlockSector": 21
  },
  {
    "id": "blind_leviathan",
    "name": "Blind Leviathan",
    "family": "predator",
    "unlockSector": 28
  },
  {
    "id": "lantern_eater",
    "name": "Lantern Eater",
    "family": "predator",
    "unlockSector": 34
  },
  {
    "id": "scissor_twins",
    "name": "Scissor Twins",
    "family": "predator",
    "unlockSector": 41
  },
  {
    "id": "red_wake",
    "name": "Red Wake",
    "family": "predator",
    "unlockSector": 51
  },
  {
    "id": "foldship",
    "name": "Foldship",
    "family": "spatial",
    "unlockSector": 11
  },
  {
    "id": "doorwraith",
    "name": "Doorwraith",
    "family": "spatial",
    "unlockSector": 16
  },
  {
    "id": "tidemason",
    "name": "Tidemason",
    "family": "spatial",
    "unlockSector": 22
  },
  {
    "id": "parallax_hunter",
    "name": "Parallax Hunter",
    "family": "spatial",
    "unlockSector": 29
  },
  {
    "id": "clockray",
    "name": "Clockray",
    "family": "spatial",
    "unlockSector": 35
  },
  {
    "id": "horizon_biter",
    "name": "Horizon Biter",
    "family": "spatial",
    "unlockSector": 42
  },
  {
    "id": "rift_surgeon",
    "name": "Rift Surgeon",
    "family": "spatial",
    "unlockSector": 52
  },
  {
    "id": "bloom_queen",
    "name": "Bloom Queen",
    "family": "ecosystem",
    "unlockSector": 12
  },
  {
    "id": "brood_ark",
    "name": "Brood Ark",
    "family": "ecosystem",
    "unlockSector": 17
  },
  {
    "id": "carrion_weaver",
    "name": "Carrion Weaver",
    "family": "ecosystem",
    "unlockSector": 23
  },
  {
    "id": "spore_monk",
    "name": "Spore Monk",
    "family": "ecosystem",
    "unlockSector": 30
  },
  {
    "id": "husk_parade",
    "name": "Husk Parade",
    "family": "ecosystem",
    "unlockSector": 35
  },
  {
    "id": "magnet_urchin",
    "name": "Magnet Urchin",
    "family": "ecosystem",
    "unlockSector": 43
  },
  {
    "id": "chrysalis_hunter",
    "name": "Chrysalis Hunter",
    "family": "ecosystem",
    "unlockSector": 53
  },
  {
    "id": "rail_cathedral",
    "name": "Rail Cathedral",
    "family": "machine",
    "unlockSector": 13
  },
  {
    "id": "siege_orchid",
    "name": "Siege Orchid",
    "family": "machine",
    "unlockSector": 18
  },
  {
    "id": "bulwark_hauler",
    "name": "Bulwark Hauler",
    "family": "machine",
    "unlockSector": 24
  },
  {
    "id": "bellfoundry",
    "name": "Bellfoundry",
    "family": "machine",
    "unlockSector": 31
  },
  {
    "id": "prism_bastion",
    "name": "Prism Bastion",
    "family": "machine",
    "unlockSector": 36
  },
  {
    "id": "cable_kraken",
    "name": "Cable Kraken",
    "family": "machine",
    "unlockSector": 44
  },
  {
    "id": "switchyard",
    "name": "Switchyard",
    "family": "machine",
    "unlockSector": 54
  },
  {
    "id": "false_sun",
    "name": "False Sun",
    "family": "deceiver",
    "unlockSector": 13
  },
  {
    "id": "mirror_court",
    "name": "Mirror Court",
    "family": "deceiver",
    "unlockSector": 18
  },
  {
    "id": "signal_thief",
    "name": "Signal Thief",
    "family": "deceiver",
    "unlockSector": 25
  },
  {
    "id": "lantern_mimic",
    "name": "Lantern Mimic",
    "family": "deceiver",
    "unlockSector": 31
  },
  {
    "id": "afterimage_duelist",
    "name": "Afterimage Duelist",
    "family": "deceiver",
    "unlockSector": 37
  },
  {
    "id": "surveyor",
    "name": "Surveyor",
    "family": "deceiver",
    "unlockSector": 45
  },
  {
    "id": "cipher_engine",
    "name": "Cipher Engine",
    "family": "deceiver",
    "unlockSector": 55
  },
  {
    "id": "rainmaker",
    "name": "Rainmaker",
    "family": "sculptor",
    "unlockSector": 14
  },
  {
    "id": "comet_shepherd",
    "name": "Comet Shepherd",
    "family": "sculptor",
    "unlockSector": 19
  },
  {
    "id": "thunder_loom",
    "name": "Thunder Loom",
    "family": "sculptor",
    "unlockSector": 26
  },
  {
    "id": "avalanche_engine",
    "name": "Avalanche Engine",
    "family": "sculptor",
    "unlockSector": 32
  },
  {
    "id": "ricochet_duchess",
    "name": "Ricochet Duchess",
    "family": "sculptor",
    "unlockSector": 38
  },
  {
    "id": "lantern_shoal",
    "name": "Lantern Shoal",
    "family": "sculptor",
    "unlockSector": 46
  },
  {
    "id": "nova_anvil",
    "name": "Nova Anvil",
    "family": "sculptor",
    "unlockSector": 56
  },
  {
    "id": "gilded_pilgrim",
    "name": "Gilded Pilgrim",
    "family": "temptation",
    "unlockSector": 15
  },
  {
    "id": "vault_crawler",
    "name": "Vault Crawler",
    "family": "temptation",
    "unlockSector": 20
  },
  {
    "id": "oathkeeper",
    "name": "Oathkeeper",
    "family": "temptation",
    "unlockSector": 27
  },
  {
    "id": "courier_zero",
    "name": "Courier Zero",
    "family": "temptation",
    "unlockSector": 33
  },
  {
    "id": "debt_collector",
    "name": "Debt Collector",
    "family": "temptation",
    "unlockSector": 39
  },
  {
    "id": "mercy_trap",
    "name": "Mercy Trap",
    "family": "temptation",
    "unlockSector": 47
  },
  {
    "id": "fortune_leech",
    "name": "Fortune Leech",
    "family": "temptation",
    "unlockSector": 57
  },
  {
    "id": "constellation_beast",
    "name": "Constellation Beast",
    "family": "legend",
    "unlockSector": 40
  },
  {
    "id": "cathedral_of_teeth",
    "name": "Cathedral of Teeth",
    "family": "legend",
    "unlockSector": 48
  },
  {
    "id": "dying_star",
    "name": "Dying Star",
    "family": "legend",
    "unlockSector": 49
  },
  {
    "id": "worldmolt",
    "name": "Worldmolt",
    "family": "legend",
    "unlockSector": 50
  },
  {
    "id": "choir_unbound",
    "name": "Choir Unbound",
    "family": "legend",
    "unlockSector": 58
  },
  {
    "id": "eventide_engine",
    "name": "Eventide Engine",
    "family": "legend",
    "unlockSector": 59
  },
  {
    "id": "witness",
    "name": "Witness",
    "family": "legend",
    "unlockSector": 60
  }
].map(Object.freeze));
export const MYSTERY_IDS = Object.freeze(MYSTERIES.map(row => row.id));
export const getMystery = id => MYSTERIES.find(row => row.id === id) || null;

export function mysteryRoll(seed, sector, salt) {
  let h = 2166136261;
  for (const c of `${seed}:mystery:${sector}:${salt}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function isMysteryWaveEligible(config, game) {
  return config && !config.isChallenge && !config.isMayhemReinforcement
    && !config.isBossMayhemReinforcement && !config.allowConcurrentSpawn && !config.highSectorAuthoredEncounter
    && !config.marketingDebug && !game?.lateGameExperiment?.active && game?.runMode !== 'daily_signal';
}
export function planMysteryLevel({ sector, seed = 'nova-swarm', waves = [], game = {}, seen = [], recent = [] }) {
  const eligible = waves.map((config, i) => isMysteryWaveEligible(config, game) ? i : -1).filter(i => i >= 0);
  const disabled = Boolean(game.encounterTest || game.isDebugRun || game.runMode === 'daily_signal' || game.lateGameExperiment?.active);
  const state = enterPacingLevel(game, sector, eligible.length > 0 && !disabled);
  const result = { sector, eligibleWaves: eligible.length, selected: false, dueAt: state.nextMystery,
    eligibleLevel: state.eligibleLevels };
  if (disabled || sector < 11 || !eligible.length || state.eligibleLevels < state.nextMystery) return result;
  if (recoveringFromCombination(game)) return { ...result, deferred: 'ordinary-combat-recovery' };
  let pool = MYSTERIES.filter(row => row.unlockSector <= sector);
  const fresh = pool.filter(row => !seen.includes(row.id));
  const ordinary = eligible.filter(i => waves[i].type !== 'BOSS');
  const familiar = pool.filter(row => seen.includes(row.id) && !recent.slice(-3).includes(row.id));
  // Most discoveries debut in a normal wave. A familiar visitor can instead
  // share a single boss; the reinforcement coordinator has the final veto.
  const bossSlots = eligible.filter(i => waves[i].type === 'BOSS');
  const revisit = familiar.length && bossSlots.length && mysteryRoll(seed, sector, 'familiar-escort') < .22;
  let slots = revisit ? bossSlots : ordinary;
  if (revisit) pool = familiar;
  else if (fresh.length) pool = fresh;
  else { const unrepeated = pool.filter(row => !recent.slice(-3).includes(row.id)); if (unrepeated.length) pool = unrepeated; }
  if (!slots.length || !pool.length) return { ...result, deferred: 'no-suitable-wave' };
  const id = pool[Math.floor(mysteryRoll(seed, sector, 'identity') * pool.length)].id;
  const waveIndex = slots[Math.floor(mysteryRoll(seed, sector, 'wave') * slots.length)];
  return { ...result, selected: true, id, waveIndex, firstContact: !seen.includes(id),
    bossWave: waves[waveIndex].type === 'BOSS', delaySeconds: 1 + mysteryRoll(seed, sector, 'arrival') * 2.5 };
}
