// Reveal identities separately from their authored stats. At most 45% of a
// family is eligible through sector 19; the remainder arrives through 60.
export function discoverySector(index, total, firstSector=1) {
  const early=Math.max(1,Math.floor(total*.45));
  if(index<early)return firstSector+Math.floor(index*(19-firstSector)/Math.max(1,early-1));
  return 21+Math.floor((index-early)*39/Math.max(1,total-early-1));
}
export function hullDiscoverySector(spriteIndex) {
  if(spriteIndex<6)return 1;
  return spriteIndex<50 ? discoverySector(spriteIndex-5,45,2) : discoverySector(spriteIndex-50,177,11);
}

// One independent, reproducible roll per sector. Outcomes are exclusive, not
// three rolls that can accidentally pile every surprise into the same fight.
export function planBossDiscovery(sector, seed='nova-swarm', {disabled=false,roll}={}) {
  if(disabled||sector<=15)return null;
  if(!Number.isFinite(roll)){
    let h=2166136261;
    for(const c of `${seed}:boss-discovery:${sector}`)h=Math.imul(h^c.charCodeAt(0),16777619);
    h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
    roll=(h>>>0)/4294967296;
  }
  const kind=roll<.10?'snake':sector>20&&roll<.20?'relay':sector>30&&roll<.25?'relay_snake':null;
  return kind ? {
    kind, roll, threshold: .65, warningMs: 1800,
    // Applied at the start of a selected encounter, never a surprise mid-fight
    // heal. Ratios use the ordinary sector boss as the shared reference.
    primaryHealthRatio: 2,
    guestHealthRatio: 2,
    snakeHealthRatio: kind === 'relay_snake' ? .8 : 1.2,
    snakeSeconds: 55,
    warningSpacingMs: 1100,
    regularIntervalMultiplier: 1.15,
    maxHostileProjectiles: 72
  } : null;
}
