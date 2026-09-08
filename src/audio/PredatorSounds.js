export const PREDATOR_SOUND_ROOT = '/audio/sfx/predator-20260908';
export const PREDATOR_SFX = [
 'serpent_arrival_omen',
 ...Array.from({length:14},(_,i)=>['hunt','death'].map(e=>`serpent_${i+1}_${e}`)).flat(),
 ...Array.from({length:6},(_,i)=>`wave_arrival_${i+1}`),
 ...Array.from({length:6},(_,i)=>[1,2,3].map(p=>`boss_beast_${i+1}_${p}`)).flat()
];
export function getBossMonsterVoice(profile,level,phase=1){
 const identity=String(profile?.id||profile?.name||level);let hash=0;for(const c of identity)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
 return {event:`boss_beast_${hash%6+1}_${Math.max(1,Math.min(3,Math.round(phase)))}`,rate:.91+(hash%9)*.022};
}
