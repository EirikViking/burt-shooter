// Each brood inherits its mother's anatomy, but has its own hunting method.
const families=[
 ['cinder','bomb','raiders',0xff8b3d,0xffdf9a,.14],
 ['thorn','needles','shield',0xa5f44b,0xe4ffd1,.18],
 ['widow','venom','feint',0xc578ff,0xffb8ed,.14],
 ['abyss','gravity','spiral',0x48cffa,0xb9ffff,.12],
 ['grave','bone','menders',0xdbead9,0xb2ffd2,.12],
 ['hammer','charge','divers',0xff4f51,0xffc594,.18],
 ['mantis','scissor','pincers',0x5affab,0xe4ff8a,.16],
 ['sunforge','solar','menders',0xffd15b,0xffffff,.12],
 ['sawtooth','razor','spiral',0xff4c64,0xffd4d4,.18],
 ['lamprey','siphon','raiders',0x8ee9ef,0xe8ffff,.12],
 ['storm','arc','pincers',0x55f5dc,0xf0ffff,.16],
 ['oracle','lance','sentinels',0xd6a0ff,0xffe6ff,.12],
 ['carrion','mine','shield',0xd49a64,0xffe4ab,.16],
 ['eclipse','phase','feint',0xdd9de4,0xfaf0ff,.14]
];
export const SNAKE_BROOD_FAMILIES=Object.freeze(families.map(([id,weapon,formation,color,core,orbitSpeed],index)=>Object.freeze({id,index,weapon,formation,color,core,orbitSpeed,heals:['grave','sunforge','lamprey'].includes(id)})));
export function getSnakeBroodFamily(id){return SNAKE_BROOD_FAMILIES.find(f=>f.id===String(id).replace('space_snake_',''));}
export function broodRandom(seed){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return ()=>{h+=0x6d2b79f5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export const SNAKE_BROOD_ATTACK_RATE=1.25;
export const SNAKE_BROOD_WARNING_SECONDS=.65/SNAKE_BROOD_ATTACK_RATE;
export function planSnakeBrood({seed,profile,force=false,count}={}){
 const family=getSnakeBroodFamily(profile?.id);if(!family)return null;
 const random=broodRandom(`${seed}:brood:${family.id}`),roll=random();
 const size=Number.isFinite(count)?Math.max(5,Math.min(20,Math.floor(count))):5+Math.floor(random()*16);
 // Vary the mother's route phase at hatch time, with an occasional earlier
 // brood. Keep the probability/count rolls independent of this presentation.
 const timing=random(),early=timing<.25;
 return {family,roll,enabled:force||roll<.456,count:size,early,
  hatchAt:early?3.25+timing/.25*1.25:5+(timing-.25)/.75*5,
  hatchSpacing:.15+random()*.075,hostOffset:Math.floor(random()*20),seed:String(seed)};
}
export function babyHealth(level){return Math.round(Math.round(5+Math.min(9,Math.max(0,level-6)*.16))*1.35);}
