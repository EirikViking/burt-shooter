import {convoySurpriseById} from '../config/ConvoySurpriseCatalog.js';
import {makeReactorTow,reactorTowPoses,updateReactorTow,hitReactorTow} from './ReactorTow.js';
import {makeCounterweight,counterweightPoses,updateCounterweight,hitCounterweight} from './Counterweight.js';
const clamp=n=>Math.max(0,Math.min(1,n));
export function makeConvoySurprise(id,scale=1){
 if(id==='reactor-tow')return makeReactorTow(scale);
 if(id==='counterweight')return makeCounterweight(scale);
 const recipe=convoySurpriseById(id);if(!recipe)throw new Error('Unknown rescue contact');
 const hp=Object.fromEntries(Object.entries(recipe.parts).map(([key,n])=>[key,n*scale]));
 return {surprise:id,recipe,variant:recipe.hull,hp,maxHp:{...hp,side:hp.left,core:0},duration:recipe.duration,
   hitProjectiles:new WeakSet(),cover:[],anchors:{},supportSpent:0,won:false};
}
// Unit coordinates are shared by sprites and physical projectile targets.
export function convoyPartPoses(e){
 if(e?.counterweight)return counterweightPoses(e);
 if(e?.reactor)return reactorTowPoses(e);
 if(!e?.recipe)return [];
 const id=e.surprise,t=e.age;
 const p=(part,x,y,role='lock',extra={})=>({part,x,y,role,blocked:false,...extra});
 let poses;
 switch(id){
 case 'twin-jailers':poses=[p('left',-.29,.10),p('right',.29,.10),p('leftGun',-.46,.28,'gun'),p('rightGun',.46,.28,'gun')];break;
 case 'crossed-chains':{
  const c=Math.sin((t-1.4)*1.05)*.29;
  poses=[p('left',c,.23),p('right',-c,-.11),p('leftTether',-.35,.05,'tether'),p('rightTether',.35,.05,'tether')];break;
 }
 case 'prisoner-exchange':{
  const x=Math.sin((t-1.4)*.75)*.27;
  poses=[p('left',x-.065,.18),p('right',x+.065,.18),p('relay',0,-.10,'relay'),p('gun',.40,.23,'gun')];break;
 }
 case 'last-shuttle':poses=[p('left',-.23,.10),p('right',-.05,.10),p('drive',.34,-.15,'drive'),p('gun',.37+Math.sin(t*.9)*.08,.30,'gun')];break;
 case 'convoy-split':{
  const split=clamp((t-1.6)/2)*.14;
  poses=[p('left',-.19-split,.1),p('right',-.02-split,.1),p('gun',.25+split,.25,'gun')];break;
 }
 case 'shielded-evacuation':poses=[p('left',-.23,.12,'lock',{blocked:e.hp.leftShield>0}),p('right',.23,.12,'lock',{blocked:e.hp.rightShield>0}),p('leftShield',-.41,-.03,'shield'),p('rightShield',.41,-.03,'shield')];break;
 case 'stolen-callsign':poses=[p('left',-.29,.12,'lock',{blocked:e.hp.emitter>0}),p('right',-.12,.12,'lock',{blocked:e.hp.emitter>0}),p('emitter',.33,.16,'gun')];break;
 case 'rescue-tow':poses=[p('left',-.31,.26,'tow'),p('right',.16,.1),p('gun',.40,.28,'gun')];break;
 default:return [];
 }
 for(const pose of poses){const anchor=e.anchors[pose.part];if(anchor){pose.x=anchor.x;pose.y=anchor.y;}}
 return poses.filter(p=>e.hp[p.part]>0).concat(e.cover.filter(c=>c.active).map(c=>({...c,part:c.id,role:'cover',cover:true,x:c.x+(t-c.born)*c.vx,y:c.y+(t-c.born)*.028})));
}
export function updateConvoySurprise(e,seconds,{paused=false,safe=true}={}){
 if(paused||!e?.recipe)return;
 if(e.counterweight){updateCounterweight(e,seconds,{safe});return;}
 if(e.reactor){updateReactorTow(e,seconds,{safe});return;}
 for(const cover of e.cover)if(e.age-cover.born>=3.2)cover.active=false;
}
export function hitConvoySurprise(e,part,amount,projectile,owner='player'){
 if(e?.counterweight)return hitCounterweight(e,part,amount,projectile,owner);
 if(e?.reactor)return hitReactorTow(e,part,amount,projectile,owner);
 if(!e?.recipe||e.suspended||!Number.isFinite(amount)||amount<=0||!projectile||typeof projectile!=='object'||e.hitProjectiles.has(projectile))return null;
 const pose=convoyPartPoses(e).find(p=>p.part===part);if(!pose)return null;
 if(pose.cover){
  const cover=e.cover.find(c=>c.id===part);if(!cover?.active)return null;
  e.hitProjectiles.add(projectile);cover.health=Math.max(0,cover.health-amount);cover.active=cover.health>0;
  return {type:'cover',part,credit:false,rescues:[]};
 }
 if(owner==='hostile'||(owner==='ally'&&(part!==e.supportPart||pose.role!=='gun')))return null;
 e.hitProjectiles.add(projectile);
 if(pose.blocked)return {type:'blocked',part,credit:false,rescues:[]};
 let damage=amount;
 if(owner==='ally'){
  damage=Math.min(damage,Math.max(0,e.maxHp[part]*.7-e.supportSpent));
  if(!(damage>0))return null;
  e.supportSpent+=Math.min(damage,e.hp[part]);
 }
 e.hp[part]=Math.max(0,e.hp[part]-damage);
 const result={type:'hit',part,credit:owner==='player',rescues:[]};
 if(e.hp[part]>0)return result;
 if(part==='left'||part==='right'){
  result.type='rescue';result.rescues=[part];
  if(e.surprise==='twin-jailers'&&!e.supportPart)e.supportPart=part==='left'?'rightGun':'leftGun';
  return result;
 }
 result.type=pose.role==='gun'?'weapon':'disable';
 const anchor=key=>{const at=convoyPartPoses(e).find(p=>p.part===key);if(at)e.anchors[key]={x:at.x,y:at.y};};
 if(e.surprise==='crossed-chains')anchor(part==='leftTether'?'left':'right');
 if(e.surprise==='prisoner-exchange'){
  if(part==='relay'){anchor('left');anchor('right');e.transferStopped=true;}
  if(part==='gun'&&!e.transferStopped)e.duration=Math.min(18,e.duration+2);
 }
 if(e.surprise==='last-shuttle'&&part==='drive'){anchor('gun');e.fixedGun=true;}
 if(e.surprise==='shielded-evacuation'&&e.hp.leftShield<=0&&e.hp.rightShield<=0&&!e.cover.length){
  e.cover=[-1,1].map((side,i)=>({id:`cover${i}`,x:side*.36,y:.30,vx:side*.015,born:e.age,health:1,active:true}));
 }
 return result;
}
