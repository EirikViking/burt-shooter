// Presentation only: no gameplay clock, selection, health or reward mutation.
export const PREMIUM_LIMITS=Object.freeze({impacts:24,debris:16,trailSamples:8});
const unit=n=>Math.max(0,Math.min(1,Number(n)||0));
export function effectEnvelope(age,life){
  if(age<0||age>=life||life<=0)return{alpha:0,scale:1};
  const t=unit(age/life);return{alpha:Math.min(1,t/.06)*(1-t)**1.35,scale:.65+Math.min(1,t/.2)*.35+t*.3};
}
export function presentationFrame({age=0,stage='battery',charge=0,recoil=0,reduced=false,flash=1}={}){
  const opening=stage==='hull'?.45:['reactor','collapse'].includes(stage)?1:0;
  return{entry:unit(age/1.25),hullOffset:opening,recoilOffset:reduced?0:Math.max(0,1-(Number(recoil)||0)/.18)*8,
    reactorReveal:['reactor','collapse'].includes(stage)?1:0,charge:unit(charge),flashAlpha:unit(flash)*.35};
}
