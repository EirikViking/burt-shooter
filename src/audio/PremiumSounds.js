const cues={
 breach_arrive:[.92,2400,6],battery_charge:[.88,650,8],battery_fire:[.72,180,5],armour_break:[.74,180,5],
 hull_open:[.88,900,6],reactor_open:[.88,900,6],breach_collapse:[.95,1600,8],
 molt_fracture:[.82,800,6],molt_emerge:[.86,800,6],cover_break:[.64,180,4],
 weaver_claim:[.76,800,5],weaver_assembly:[.72,1200,5],weaver_arm:[.80,900,7],tether_snap:[.78,500,6],
 wing_arrive:[.84,1400,6],wing_depart:[.64,1400,4],salvage_capture:[.70,700,5],rift_ignite:[.70,450,5],
 orbit_activate:[.90,1200,7],orbit_hit:[.68,160,4]
};
export const PREMIUM_SOUND_CATALOG=Object.fromEntries(Object.keys(cues).map(id=>[`premium_${id}`,[`/audio/sfx/encounter-premium/${id}.wav`]]));
export const PREMIUM_SOUND_MIX=Object.fromEntries(Object.entries(cues).map(([id,[volume,minIntervalMs,priority]])=>
 [`premium_${id}`,{volume,minIntervalMs,priority,priorityHoldMs:priority>=7?400:priority===6?260:0,priorityDuckFactor:.55}]));
