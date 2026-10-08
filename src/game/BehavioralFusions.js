export const CAPTURE_RULES=Object.freeze({seconds:6,ammunition:9,damageCap:8,cooldown:.65});
export function planRiftEchoes(start,end,count,hasTarget,coalesceDistance=48){
  if(!hasTarget||!start||!end||![start.x,start.y,end.x,end.y].every(Number.isFinite))return [];
  const n=Math.min(5,Math.max(0,Math.floor(count))),near=Math.hypot(start.x-end.x,start.y-end.y)<coalesceDistance;
  return Array.from({length:n},(_,i)=>({index:i,x:near||i%2?end.x:start.x,y:near||i%2?end.y:start.y,delay:.18+Math.floor(i/2)*.16}));
}
export function capturedVolley(pattern,ammo){
  const n=Math.min(Math.max(0,ammo),pattern==='fan'?3:pattern==='burst'?3:1);
  return Array.from({length:n},(_,i)=>({angle:pattern==='fan'?(i-(n-1)/2)*.22:0,
    delay:pattern==='burst'?i*.09:0,speed:pattern==='lance'?15:9}));
}
