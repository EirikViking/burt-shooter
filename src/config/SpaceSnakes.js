const originals = [
  ['cinder',8,0xff783a,7.6,.33,1,190,'sweep',1.0],
  ['thorn',10,0xb2f64d,9.2,.35,2,220,'coil',1.05],
  ['widow',9,0xbb76ff,8.4,.30,3,200,'figure8',.95],
  ['abyss',11,0x59caff,10,.34,4,245,'orbit',1.12]
];
const additions = [
  ['grave',12,0xd8e9df,8.7,.34,2,190,'ribbon',.85],
  ['hammer',7,0xff4549,7.4,.34,1,165,'hook',1.28],
  ['mantis',10,0x4bffa3,7.8,.36,3,175,'slalom',.93],
  ['sunforge',8,0xffd465,9.5,.32,2,205,'orbit',1.18],
  ['sawtooth',11,0xff394d,7.9,.36,3,170,'zigzag',.98],
  ['lamprey',13,0x8fe8ef,10.2,.31,4,220,'coil',.88],
  ['storm',9,0x53e9cb,7.2,.36,2,160,'slalom',.94],
  ['oracle',8,0xd797ff,10.6,.32,3,215,'figure8',1.16],
  ['carrion',14,0xc58c59,8.8,.35,4,190,'ribbon',.80],
  ['eclipse',10,0xf0bbef,9.8,.34,3,185,'hook',1.14]
];
export const SPACE_SNAKES = Object.freeze([...originals,...additions].map((p,index)=>Object.freeze({
  id:`space_snake_${p[0]}`,index,segments:p[1],color:p[2],period:p[3],amplitude:p[4],coils:p[5],fireDelay:p[6],motion:p[7],bodyScale:p[8],
  art:index<4?`/art/core-serpent/snake-${index+1}-head-imagegen.png`:`/art/predator-20260908/snake-${index+1}.png`,voice:`serpent_${index+1}`
})));
export function getSpaceSnakeProfile(id){return SPACE_SNAKES.find(p=>p.id===id)||null;}
export function isSpaceSnakeEligible(config,level,game){return level>=6&&!config.isChallenge&&config.type!=='BOSS'&&!config.isMayhemReinforcement&&!config.isBossMayhemReinforcement&&!config.allowConcurrentSpawn&&!config.highSectorAuthoredEncounter&&!game?.lateGameExperiment?.active&&game?.runMode!=='daily_signal';}
export function isSpaceSnakeWave(roll){return Number.isFinite(roll)&&roll>=0&&roll<.2;}
export function getSpaceSnakeSectionHealth(level){const depth=Math.max(0,(Number(level)||6)-6);return Math.round(18+Math.min(240,2.8*Math.pow(depth,.85)));}
const routes=['sweep','coil','figure8','orbit','ribbon','hook','slalom','zigzag'];
function route(kind,t){
 switch(kind){
 case 'coil':return {x:Math.sin(t)*(.62+.30*Math.sin(t*.43)),y:.43+.17*Math.cos(t)+.04*Math.sin(t*2.1)};
 case 'figure8':return {x:Math.sin(t),y:.43+.19*Math.sin(2*t)};
 case 'orbit':return {x:.88*Math.cos(t),y:.43+.22*Math.sin(t)};
 case 'ribbon':return {x:.88*Math.sin(t*.73),y:.42+.13*Math.sin(t*2.3)+.065*Math.cos(t*.41)};
 case 'hook':return {x:Math.sin(t)+.08*Math.sin(t*3),y:.40+.24*Math.pow(.5+.5*Math.cos(t),2)};
 case 'slalom':return {x:.88*Math.sin(t*1.25),y:.42+.15*Math.cos(t*.7)+.06*Math.sin(t*2.5)};
 case 'zigzag':return {x:.92*Math.tanh(1.7*Math.sin(t)),y:.43+.18*Math.sin(t*.61)};
 default:return {x:Math.sin(t)*(.9+.1*Math.cos(t*.37)),y:.42+.16*Math.sin(t*.81)+.04*Math.cos(t*2.2)};
 }
}
// Smoothly blend routes every 6–10 seconds. Absolute-time samples preserve
// continuity and are independent of frame rate and presentation randomness.
export function sampleSpaceSnake(profile,seconds,width,height,seed=0){
 const duration=6.5+(profile.index%4)*.8,phase=Math.max(0,Math.floor(seconds/duration));
 const base=routes.indexOf(profile.motion),offset=Math.abs(Math.floor(seed))%routes.length;
 const current=phase===0?base:(base+phase*3+offset)%routes.length;
 const previous=phase<=1?base:(base+(phase-1)*3+offset)%routes.length;
 const t=seconds*Math.PI*2/profile.period+(seed%17)*.11;
 const a=route(routes[previous],t),b=route(routes[current],t);
 const u=Math.min(1,(seconds-phase*duration)/1.6),blend=u*u*(3-2*u);
 const x=.5+profile.amplitude*(a.x+(b.x-a.x)*blend),y=a.y+(b.y-a.y)*blend;
 const entry=Math.min(1,Math.max(0,seconds/3));
 return {x:width*Math.max(.09,Math.min(.91,x)),y:-140+(height*y+140)*entry,route:routes[current]};
}
