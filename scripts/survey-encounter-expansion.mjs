import assert from 'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';import path from'node:path';
import{planMysteryLevel}from'../src/config/Mysteries.js';import{recordMysteryArrival,encounterPacing,pacingRoll,dreadnoughtEligible,mysteryAdmission,encounterFamilyReady,recordEncounterFamily}from'../src/config/EncounterPacing.js';
import{chooseEnvironment}from'../src/game/EncounterEnvironments.js';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const runs=[];for(let i=0;i<200;i++){
 const seed=`expansion-survey-${i}`,game={contentDirector:{seed},runMode:'ranked_tactical',scenes:{play:{}},mysteriesSeen:[],mysteriesRecent:[]};
 const manager={game,enemies:[],lastMoltEligibleWave:12};game.scenes.play.enemyManager=manager;
 const visits=[],environments=[],breaches=[];let last=-8,ordinal=0,recent=[],firstCarrion;
 for(let sector=1;sector<=100;sector++){
  manager.level=sector;game.level=sector;game.runElapsedSeconds=sector*30;
  const p=planMysteryLevel({sector,seed,game,waves:[{type:'grunt'},{type:'grunt'},{type:'grunt'},{type:'BOSS'}],seen:game.mysteriesSeen,recent:game.mysteriesRecent});
  const selected=p.selected&&!mysteryAdmission(manager,p);
  if(selected){
   if(p.id==='carrion_weaver'&&firstCarrion==null)firstCarrion=sector;
   const crossover=p.id==='carrion_weaver'&&!p.firstContact&&!p.bossWave&&sector>=16&&sector-(game.lastReassemblyCrossoverSector??-99)>=8;
   if(crossover)game.lastReassemblyCrossoverSector=sector;
   visits.push({sector,id:p.id,crossover});if(!game.mysteriesSeen.includes(p.id))game.mysteriesSeen.push(p.id);
   game.mysteriesRecent.push(p.id);recordMysteryArrival(game,sector,p.id);
  }else for(let w=0;w<3;w++){
   const e=chooseEnvironment({sector,ordinal,last,recent,blockedFamilies:['wreck_claim','linked_battery','brood_route'].filter(f=>!encounterFamilyReady(game,f,sector)),roll:pacingRoll(seed,ordinal,'environment')});ordinal++;
   if(e){assert(!recent.length||recent.at(-1)!==e.family);environments.push({sector,id:e.id,ordinal});last=ordinal-1;recent.push(e.family);recordEncounterFamily(game,e.family,sector);}
  }
  if(!p.bossWave&&!selected&&dreadnoughtEligible(manager)){breaches.push(sector);game.lastDreadnoughtSector=sector;recordEncounterFamily(game,'linked_battery',sector);}
 }
 runs.push({seed,firstCarrion,firstCrossover:visits.find(v=>v.crossover)?.sector,visits:visits.length,crossovers:visits.filter(v=>v.crossover).length,environments:environments.length,breaches});
 assert(visits.some(v=>v.crossover),'bounded revisit opportunity');assert(visits.some(v=>v.id!=='carrion_weaver'),'old visitors remain available');
}
function stats(key){const a=runs.map(r=>r[key]).filter(Number.isFinite).sort((a,b)=>a-b);return{n:a.length,min:a[0],p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};}
const report={status:'passed',conditions:'200 seeds × 100 sectors using actual visitor/environment/Breach selectors; three ordinary waves/sector and 30 combat seconds/sector are explicit scenarios. Assumes successful asset loads/arrivals and Molt already seen. Omits real boss gates, recovery, snake priority and competing threats; opportunity survey, not measured natural frequency.',
 firstCarrion:stats('firstCarrion'),firstCrossover:stats('firstCrossover'),visitorCounts:stats('visits'),environmentCounts:stats('environments'),crossovers:stats('crossovers'),runs};
writeFileSync(path.join(out,'pacing.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,runs:undefined}));
