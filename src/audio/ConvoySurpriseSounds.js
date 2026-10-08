const root='/audio/sfx/convoy-surprises/';
export const CONVOY_SURPRISE_CUES=['arrive','tether','engine','shield','mimic','rival','launch','weapon'];
export const CONVOY_SURPRISE_SOUND_CATALOG=Object.fromEntries(CONVOY_SURPRISE_CUES.map(id=>[`rescue_${id}`,[`${root}${id}.wav`]]));
export const CONVOY_SURPRISE_SOUND_MIX=Object.fromEntries(CONVOY_SURPRISE_CUES.map(id=>[`rescue_${id}`,{volume:['arrive','rival'].includes(id)?.78:.74,minIntervalMs:['arrive','rival'].includes(id)?1600:id==='launch'?1200:180,priority:2,priorityDuckFactor:.25}]));
