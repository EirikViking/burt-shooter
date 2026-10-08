// Real director methods and encounter models; media/render/transport are stubs.
// No browser, files, progression, network or cache output. Listening remains QA.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FirstLightModel} from '../src/game/ArcadeFirstLight.js';
import {makeReactorTow,updateReactorTow,consumeReactorDischarge,reactorTowPosition,REACTOR_TOW} from '../src/game/ReactorTow.js';
import {makeCounterweight,updateCounterweight,consumeCounterweightVolley,counterweightWorldPoses,COUNTERWEIGHT} from '../src/game/Counterweight.js';

const source=readFileSync(new URL('../src/managers/ArcadeFirstLightDirector.js',import.meta.url),'utf8');
const moduleBody=source.replace(/^import .*;\r?\n/gm,'').replace('export class ArcadeFirstLightDirector','class ArcadeFirstLightDirector');
const plays=[],stops=[];
let acceptSfx=true;
const AudioManager={playSfx:id=>{if(!acceptSfx)return false;plays.push(id);return true;},stopSfxGroup:id=>stops.push(id)};
class Bullet{constructor(x,y,vx,vy){Object.assign(this,{x,y,vx,vy});}}
// As in the existing audio/combo regression harnesses, evaluate the actual
// source with unavailable browser services injected, rather than copy logic.
const Director=new Function('AudioManager','updateCounterweight','updateReactorTow','consumeReactorDischarge','reactorTowPosition','Bullet','consumeCounterweightVolley','counterweightWorldPoses',
 `${moduleBody}\nreturn ArcadeFirstLightDirector;`)(AudioManager,updateCounterweight,updateReactorTow,consumeReactorDischarge,reactorTowPosition,Bullet,consumeCounterweightVolley,counterweightWorldPoses);
const interruptions=[
 ['pause',s=>{s.isPaused=true;}],
 ['draft',s=>{s.tacticalDraft={active:true};}],
 ['milestone',s=>{s.overrunMilestoneInterlude={active:true};}]
];
const fixture=(kind='reactor')=>{
 const model=new FirstLightModel('warning-resume');
 const e={kind:'convoy',sector:3,age:5,suspended:false,...(kind==='reactor'?makeReactorTow():makeCounterweight())};
 model.encounter=e;const shots=[];
 const d=Object.create(Director.prototype);
 Object.assign(d,{model,event:e,destroyed:false,view:{root:{visible:true},pose:{x:500,y:250,width:420,height:160}},log(){},
  scene:{isPaused:false,game:{lives:3},enemyManager:{serpentMolts:[]},bulletManager:{addEnemyBullet:b=>shots.push(b)}}});
 return {d,e,shots};
};
const failures=[],rows=[];
for(const [name,interrupt] of interruptions){
 const {d,e,shots}=fixture();plays.length=0;stops.length=0;
 const hp={...e.hp};e.reactor.warning=REACTOR_TOW.warning-.01;d.updateReactorDischarge(true);
 assert.equal(shots.length,0);assert.equal(plays.length,1);
 interrupt(d.scene);d.syncVisibility();d.syncVisibility();
 const cleared=e.reactor.warning===0&&!d.reactorChargeCued;
 const hidden=name==='pause'||d.view.root.visible===false;
 d.scene.isPaused=false;d.scene.tacticalDraft=null;d.scene.overrunMilestoneInterlude=null;
 const step=n=>{for(let i=0;i<n;i++){e.age+=.01;updateReactorTow(e,.01);d.updateReactorDischarge(true);}};
 step(139);const earlyShots=shots.length;
 step(3);const completedShots=shots.length;step(80);
 const chargePlays=plays.filter(id=>id==='first_light_rival_charge_mechanical').length;
 const row={name,cleared,hidden,earlyShots,completedShots,totalShots:shots.length,chargePlays,
  scoreFree:d.model.rewardCount===0&&d.model.rescued===0,healthPreserved:JSON.stringify(hp)===JSON.stringify(e.hp)};
 rows.push(row);
 if(!cleared||!hidden||earlyShots!==0||completedShots!==5||shots.length!==5||chargePlays!==2||!row.scoreFree||!row.healthPreserved)failures.push(row);
 assert(stops.length>=1);
 // The previously repaired Counterweight pause path must retain its full tell.
 const cw=fixture('counterweight');cw.e.counterweight.phase='warning';cw.e.counterweight.remaining=.01;
 cw.d.counterweightChargeCued=true;interrupt(cw.d.scene);cw.d.syncVisibility();
 assert.equal(cw.e.counterweight.remaining,COUNTERWEIGHT.warning);assert.equal(cw.d.counterweightChargeCued,false);
}
// An already spent reactor must never gain another discharge after interruption.
const spent=fixture();spent.e.reactor.spent=true;spent.d.reactorChargeCued=true;spent.d.scene.isPaused=true;spent.d.syncVisibility();
spent.d.scene.isPaused=false;spent.d.updateReactorDischarge(true);assert.equal(spent.shots.length,0);assert(spent.e.reactor.spent);
// AudioManager can reject a cue during its 350ms cooldown (a quick pause).
// A refused request must not be remembered as a successfully played warning.
for(const kind of ['reactor','counterweight']){
 const {d,e,shots}=fixture(kind);plays.length=0;
 if(kind==='reactor')e.reactor.warning=.01;
 else{e.counterweight.phase='warning';e.counterweight.remaining=1.1;}
 const cue=()=>kind==='reactor'?d.updateReactorDischarge(true):d.updateCounterweightShots(true);
 const key=kind==='reactor'?'reactorChargeCued':'counterweightChargeCued';
 acceptSfx=false;cue();assert.equal(Boolean(d[key]),false,`${kind}: rejected cue must remain retryable`);
 acceptSfx=true;cue();cue();assert.equal(plays.length,1,`${kind}: accept once after cooldown, no duplicate cue`);
 assert.equal(shots.length,0);
}
console.log(JSON.stringify({scope:'source director/model with fake media and bullet transport; no browser/audio-quality claim',rows}));
assert.deepEqual(failures,[],'Every resumed reactor needs a new audible full warning before exactly one discharge');
console.log('[contact-warning-resume] PASS pause/draft/milestone full lead-in, cue replay, five-shot cap, Counterweight continuity and spent-state safety');
