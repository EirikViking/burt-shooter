import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {getSpaceSnakesForLevel,isSpaceSnakeWave} from '../src/config/SpaceSnakes.js';
import {serpentMoltDue} from '../src/game/SerpentMolt.js';
const source=readFileSync(new URL('../src/managers/EnemyManager.js',import.meta.url),'utf8');
const start=source.indexOf('  getStableReinforcementRoll('),end=source.indexOf('\n  }',start)+4;
const roll=Function('return ({'+source.slice(start,end)+'})')().getStableReinforcementRoll;
const gaps=[],moltGaps=[],totals=[];
const bounded=process.env.SURVEY_BOUNDED==='1';
for(let seed=0;seed<400;seed++){
  const manager={game:{contentDirector:{seed:`encounter-survey-${seed}`}}};let last=-3,lastMolt=-12,count=0;
  for(let ordinal=0;ordinal<300;ordinal++){
    const sector=6+Math.floor(ordinal/3);
    if(ordinal-last<3||!(isSpaceSnakeWave(roll.call(manager,sector,ordinal,'space-snake-encounter'))||bounded&&serpentMoltDue(ordinal,lastMolt,true)))continue;
    if(last>=0)gaps.push(ordinal-last);last=ordinal;count++;
    const pool=getSpaceSnakesForLevel(sector),species=pool[Math.min(pool.length-1,Math.floor(roll.call(manager,sector,ordinal,'space-snake-species')*pool.length))];
    if(ordinal-lastMolt>=12||species.id==='space_snake_cinder'&&ordinal-lastMolt>=3){
      if(lastMolt>=0)moltGaps.push(ordinal-lastMolt);lastMolt=ordinal;
    }
  }totals.push(count);
}
const summary=a=>{a.sort((a,b)=>a-b);return {n:a.length,mean:a.reduce((n,x)=>n+x,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
const result={bounded,method:'400 seeds, 300 eligible ordinary-wave ordinals; three eligible waves/sector is an explicit scenario, not measured human pace; actual current stable roll method; existing 12% snake roll and three-wave spacing',snakeGaps:summary(gaps),moltGaps:summary(moltGaps),snakeCounts:summary(totals),
  callback:{convoyAdmissionSeconds:5,escortPlayableSeconds:10,rivalAdmissionSeconds:4,rivalPlayableSeconds:18,arrivalSeconds:.8,firingSeconds:2.4,expiryEligibleSeconds:90},
  limitation:'Actual pauses, weapon choices, wall-clock entry timers and competing encounters affect opportunities. Matching only a seed does not reproduce a live run.'};
assert(result.snakeGaps.mean>3);
const out=process.env.CHECK_OUTPUT_DIR;assert(out);mkdirSync(out,{recursive:true});writeFileSync(path.join(out,'pacing.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
