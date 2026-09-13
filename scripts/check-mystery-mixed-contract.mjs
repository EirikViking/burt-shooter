import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5215')+'/',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async()=>{
  const {MysteryEncounterDirector}=await import('/src/managers/MysteryEncounterDirector.js');
  const {MYSTERY_IDS}=await import('/src/config/Mysteries.js');
  const g={encounterTest:{mysteryId:MYSTERY_IDS[0],mysteryIds:MYSTERY_IDS},scenes:{play:{lastHitAt:0}},mysteryScheduleLog:[]};
  const m={game:g,level:60,waves:[{type:'grunt',count:7}],currentWaveIndex:0,enemies:[],state:'WAVE_ACTIVE'};
  const d=new MysteryEncounterDirector(m);d.startLevel();
  const sequence=[];
  // Director-level fixtures only: no altered player simulation or difficulty.
  // Alternate defeated/escaped events to exercise all 56 queue transitions.
  for(let i=0;i<56;i++){
   m.currentWaveIndex=i+1;
   if(d.plan.id!==MYSTERY_IDS[i])throw Error('Wrong identity '+i);
   d.plan.consumed=true;d.active={active:false,stats:{outcome:i%2?'escaped':'defeated'}};
   d.update(1);sequence.push(d.plan.completed.at(-1));
   if(m.state!=='WAVE_ACTIVE')throw Error('Ended while ordinary wave remains');
  }
  let disposed=0;d.pending={ready:{destroy(){disposed++;}}};d.cancel();
  return{sequence,queued:m.waves.length,allCounts:m.waves.map(w=>w.count),disposed,busy:d.busy};
 });
 assert.equal(result.sequence.length,56);assert.equal(new Set(result.sequence.map(r=>r.id)).size,56);
 assert.equal(result.queued,57);assert.ok(result.allCounts.every(n=>n===7));assert.equal(result.disposed,1);assert.equal(result.busy,false);
 fs.mkdirSync((process.env.CHECK_OUTPUT_DIR||'test-results/mystery-tour'),{recursive:true});fs.writeFileSync((process.env.CHECK_OUTPUT_DIR||'test-results/mystery-tour')+'/queue-contract.json',JSON.stringify(result,null,2));
 console.log('PASS 56 ordered identities, defeated/escaped progression, retained authored waves, cancellation');
}finally{await browser.close();}
