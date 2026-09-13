import { mysteryDurability } from '../../config/MysteryDurability.js';
import { acquireMysteryAtlas } from './MysteryAssets.js';
import { PREDATOR_CONTROLLERS } from './PredatorMysteries.js';
import { SPATIAL_CONTROLLERS } from './SpatialMysteries.js';
import { ECOSYSTEM_CONTROLLERS } from './EcosystemMysteries.js';
import { MACHINE_CONTROLLERS } from './MachineMysteries.js';
import { DECEIVER_CONTROLLERS } from './DeceiverMysteries.js';
import { SCULPTOR_CONTROLLERS } from './SculptorMysteries.js';
import { TEMPTATION_CONTROLLERS } from './TemptationMysteries.js';
import { LEGEND_CONTROLLERS } from './LegendMysteries.js';
import { MYSTERY_COMBAT } from '../../config/MysteryCombatProfiles.js';
import { getMystery } from '../../config/Mysteries.js';

const definitions = {
  glass_widow: { health: 175, radius: 48, color: 0xa8eaff, bodyHeight: 230 },
  cinder_manta: { health: 190, radius: 56, color: 0xff985c, bodyHeight: 228 },
  needle_saint: { health: 145, radius: 38, color: 0xffdba1, bodyHeight: 255 },
  blind_leviathan: { health: 235, radius: 63, color: 0x7bf2dc, bodyHeight: 255 },
  lantern_eater: { health: 210, radius: 64, color: 0xc39aff, bodyHeight: 225 },
  scissor_twins: { health: 155, radius: 42, color: 0xffba6c, bodyHeight: 200 },
  red_wake: { health: 140, radius: 35, color: 0xff726b, bodyHeight: 240 },
  foldship: { health: 175, radius: 50, color: 0xffba69, bodyHeight: 235 },
  doorwraith: { health: 170, radius: 55, color: 0xc496ff, bodyHeight: 245 },
  tidemason: { health: 210, radius: 64, color: 0x99e4c3, bodyHeight: 245 },
  parallax_hunter: { health: 165, radius: 38, color: 0x86c4ff, bodyHeight: 230 },
  clockray: { health: 185, radius: 48, color: 0xffd281, bodyHeight: 242 },
  horizon_biter: { health: 225, radius: 60, color: 0xffb677, bodyHeight: 210 },
  rift_surgeon: { health: 175, radius: 42, color: 0x9cfce9, bodyHeight: 230 },
  bloom_queen: { health: 200, radius: 57, color: 0xf1a6e3, bodyHeight: 225 },
  brood_ark: { health: 235, radius: 60, color: 0x79e6d3, bodyHeight: 265 },
  carrion_weaver: { health: 190, radius: 56, color: 0xe5ae82, bodyHeight: 224 },
  spore_monk: { health: 185, radius: 53, color: 0xc8d6a3, bodyHeight: 221 },
  husk_parade: { health: 195, radius: 39, color: 0xa6daff, bodyHeight: 196 },
  magnet_urchin: { health: 215, radius: 55, color: 0xffce6f, bodyHeight: 192 },
  chrysalis_hunter: { health: 230, radius: 54, color: 0x91ffcd, bodyHeight: 231 },
  rail_cathedral: { health: 215, radius: 54, color: 0x8dd9f5, bodyHeight: 260 },
  siege_orchid: { health: 225, radius: 50, color: 0xffbd75, bodyHeight: 150 },
  bulwark_hauler: { health: 225, radius: 63, color: 0xffd281, bodyHeight: 235 },
  bellfoundry: { health: 220, radius: 63, color: 0xffa15a, bodyHeight: 245 },
  prism_bastion: { health: 230, radius: 57, color: 0xc59fff, bodyHeight: 255 },
  cable_kraken: { health: 215, radius: 56, color: 0xffb36b, bodyHeight: 236 },
  switchyard: { health: 205, radius: 56, color: 0xffb16d, bodyHeight: 170 },
  false_sun: { health: 220, radius: 61, color: 0xffca75, bodyHeight: 218 },
  mirror_court: { health: 200, radius: 52, color: 0xc5b3ff, bodyHeight: 223 },
  signal_thief: { health: 205, radius: 53, color: 0xa6efc0, bodyHeight: 220 },
  lantern_mimic: { health: 190, radius: 50, color: 0xf0c8ed, bodyHeight: 198 },
  afterimage_duelist: { health: 180, radius: 43, color: 0x9acaff, bodyHeight: 227 },
  surveyor: { health: 205, radius: 53, color: 0xd6e99f, bodyHeight: 217 },
  cipher_engine: { health: 215, radius: 56, color: 0x9bdfe9, bodyHeight: 214 },
  rainmaker: { health: 210, radius: 57, color: 0x92beff, bodyHeight: 232 },
  comet_shepherd: { health: 230, radius: 61, color: 0xd9bd95, bodyHeight: 235 },
  thunder_loom: { health: 215, radius: 52, color: 0x86eaff, bodyHeight: 234 },
  avalanche_engine: { health: 245, radius: 65, color: 0xb8e4ff, bodyHeight: 249 },
  ricochet_duchess: { health: 205, radius: 52, color: 0xe7b9f8, bodyHeight: 208 },
  lantern_shoal: { health: 165, radius: 43, color: 0xe9d995, bodyHeight: 137 },
  nova_anvil: { health: 245, radius: 60, color: 0xa5daff, bodyHeight: 251 },
  gilded_pilgrim: { health: 200, radius: 48, color: 0xf5d197, bodyHeight: 244 },
  vault_crawler: { health: 205, radius: 57, color: 0xeace8d, bodyHeight: 230, escapeSeconds: 40 },
  oathkeeper: { health: 210, radius: 52, color: 0x9eebc0, bodyHeight: 236 },
  courier_zero: { health: 155, radius: 39, color: 0xf0b597, bodyHeight: 225, escapeSeconds: 36 },
  debt_collector: { health: 230, radius: 57, color: 0xffb36e, bodyHeight: 241 },
  mercy_trap: { health: 205, radius: 48, color: 0xcde9ab, bodyHeight: 207 },
  fortune_leech: { health: 220, radius: 58, color: 0xe5bb7e, bodyHeight: 235 },
  constellation_beast: { health: 280, radius: 65, color: 0xaad7ff, bodyHeight: 315, escapeSeconds: 60 },
  cathedral_of_teeth: { health: 310, radius: 66, color: 0xefb398, bodyHeight: 301, escapeSeconds: 60 },
  dying_star: { health: 315, radius: 66, color: 0xffc782, bodyHeight: 300, escapeSeconds: 62 },
  worldmolt: { health: 325, radius: 68, color: 0x9be5c2, bodyHeight: 309, escapeSeconds: 62 },
  choir_unbound: { health: 255, radius: 50, color: 0xafaaff, bodyHeight: 204, escapeSeconds: 62 },
  eventide_engine: { health: 325, radius: 66, color: 0xaacaf6, bodyHeight: 295, escapeSeconds: 65 },
  witness: { health: 285, radius: 64, color: 0xd1b5f1, bodyHeight: 285, escapeSeconds: 62 }
};

export async function createMysteryEncounter(manager, id, { valid = () => true, attach = true } = {}) {
  const Controller = PREDATOR_CONTROLLERS[id] || SPATIAL_CONTROLLERS[id] || ECOSYSTEM_CONTROLLERS[id]
    || MACHINE_CONTROLLERS[id] || DECEIVER_CONTROLLERS[id] || SCULPTOR_CONTROLLERS[id]
    || TEMPTATION_CONTROLLERS[id] || LEGEND_CONTROLLERS[id];
  if (!Controller || !definitions[id]) throw new Error(`Unauthored Mystery: ${id}`);
  const lease = await acquireMysteryAtlas(id);
  if (!valid()) { lease.release(); return null; }
  try {
    const combat=MYSTERY_COMBAT[id];
    const encounter = new Controller(manager, { ...getMystery(id), ...definitions[id],
      durability:mysteryDurability(id,manager.level,definitions[id].health),escapeSeconds:combat.escapeSeconds }, lease);
    encounter.combat.setup();
    if (attach) encounter.attach(); return encounter;
  } catch (error) { lease.release(); throw error; }
}
