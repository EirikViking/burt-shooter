import assert from 'node:assert/strict';
import {getEncounterEvolutionTest} from '../src/config/EncounterEvolutionTest.js';
import {CONVOY_SURPRISES} from '../src/config/ConvoySurpriseCatalog.js';
import {FirstLightModel} from '../src/game/ArcadeFirstLight.js';
import {makeConvoySurprise,convoyPartPoses} from '../src/game/ConvoySurprises.js';
const location={hostname:'127.0.0.1',search:'?encounterEvolution=counterweight'};
assert.equal(getEncounterEvolutionTest({development:true,location})?.id,'counterweight');
assert.equal(getEncounterEvolutionTest({development:false,location}),null);
assert.equal(getEncounterEvolutionTest({development:true,location:{...location,hostname:'example.com'}}),null);
assert.equal(getEncounterEvolutionTest({development:true,location:{...location,search:location.search+'&desktop=1'}}),null);
assert(CONVOY_SURPRISES.some(row=>row.id==='counterweight'),'normal rotation uses the same bounded model');
for(const target of ['portGun','starboardGun','pivot']){
  const m=new FirstLightModel('counterweight-isolated');
  m.encounter={kind:'convoy',age:0,sector:3,suspended:false,...makeConvoySurprise('counterweight')};
  assert.equal(convoyPartPoses(m.encounter).length,3);
  const hit=m.hit(target,100,{});assert.equal(hit.credit,false);
  assert.equal(m.rescued,0);assert.equal(m.rewardCount,0);assert.equal(m.escorts.length,0);assert.equal(m.payback,null);
  for(let i=0;i<1200;i++)m.update(1/60,{sector:3,safe:true,ordinary:false});
  assert.equal(m.encounter,null,'machinery must expire in the existing model lifecycle');
  assert.equal(m.rewardCount,0);m.cancel('retry');assert.equal(m.encounter,null);
}
const {getCounterweightSourceText}=await import('../src/i18n/counterweightText.js');
for(const locale of ['en','de','es','pt-BR','ru','zh-CN','ko','ja']){
  const row=getCounterweightSourceText(locale);assert.equal(Object.keys(row).length,4);
  assert(Object.values(row).every(s=>typeof s==='string'&&s.length>0));
}
console.log('[counterweight-integration] PASS isolated debug gate, existing lifetime, no rescues/rewards, eight source dictionaries and normal catalog registration');
