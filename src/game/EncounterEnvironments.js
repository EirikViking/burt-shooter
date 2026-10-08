export const ENVIRONMENTS=Object.freeze([
  {id:'graveyard',family:'wreck_claim',sector:6,seconds:14},
  {id:'siege',family:'linked_battery',sector:8,seconds:14},
  {id:'migration',family:'brood_route',sector:10,seconds:16}
]);
export function chooseEnvironment({sector,ordinal,last=-9,recent=[],blockedFamilies=[],roll=0,blocked=false}){
  if(blocked||ordinal-last<8)return null;
  const pool=ENVIRONMENTS.filter(e=>e.sector<=sector&&!recent.slice(-1).includes(e.family)&&!blockedFamilies.includes(e.family));
  return pool.length?pool[Math.min(pool.length-1,Math.floor(Math.max(0,Math.min(.999999,roll))*pool.length))]:null;
}
