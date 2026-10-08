const root='/audio/sfx/visual-life/';
export const DESTRUCTION_CUES=['corona','split_fuel','lance','vortex','collapse','chain_reaction','petals','ring_peel','crescent','geyser','double_core','shrapnel'];
export const BOSS_DESTRUCTION_CUES=['boss_shear','boss_implode','boss_cascade'];
export const PLANET_CUES=['planet_life','planet_ring','planet_ice','planet_stripe','planet_sea','planet_lava'];
const cues=[...DESTRUCTION_CUES,...BOSS_DESTRUCTION_CUES,...PLANET_CUES];
export const VISUAL_LIFE_SOUND_CATALOG=Object.fromEntries(cues.map(id=>[`visual_${id}`,[`${root}${id}.wav`]]));
export const VISUAL_LIFE_SOUND_MIX=Object.fromEntries(cues.map(id=>[`visual_${id}`,{
  volume:id.startsWith('planet')?.18:.62,minIntervalMs:id.startsWith('planet')?28000:100,
  priority:id.startsWith('planet')?1:5,priorityDuckFactor:.25
}]));

// Routing happens AFTER the original variant bag draw. Preserve its RNG draw,
// cooldown, priority, pooling and identity; only replace generic destruction.
// Creature-specific voices/foley, telegraphs and designed boss styles survive.
export function visualDestructionSource(event,ordinal){
  const list=event==='enemy_explode'?DESTRUCTION_CUES:event==='boss_death_cascade'?BOSS_DESTRUCTION_CUES:null;
  return list?`${root}${list[Math.max(0,Math.floor(ordinal))%list.length]}.wav`:null;
}
