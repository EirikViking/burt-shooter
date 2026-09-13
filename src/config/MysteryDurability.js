import { MYSTERY_COMBAT } from './MysteryCombatProfiles.js';

const light = new Set(['needle_saint','red_wake','scissor_twins','parallax_hunter','rift_surgeon',
  'doorwraith','afterimage_duelist','lantern_shoal','courier_zero']);
const heavy = new Set(['blind_leviathan','brood_ark','rail_cathedral','siege_orchid','bulwark_hauler',
  'bellfoundry','prism_bastion','cable_kraken','avalanche_engine','nova_anvil','vault_crawler']);
export function mysteryDurability(id, sector, authoredHealth = 200) {
  const profile = MYSTERY_COMBAT[id];
  const role = profile.index >= 49 ? 'colossal' : light.has(id) ? 'light' : heavy.has(id) ? 'heavy' : 'raider';
  const [base,growth] = { light:[48,.5],raider:[62,.6],heavy:[78,.72],colossal:[94,.82] }[role];
  const identity = Math.max(.88,Math.min(1.1,authoredHealth/(role==='colossal'?285:200)));
  const hull = Math.round((base + Math.min(49,Math.max(0,sector-11))*growth)*identity);
  return { role, hull, component: Math.max(4,Math.min(12,Math.round(hull*.065))), breakFraction:.10 };
}
