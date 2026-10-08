import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TRACTOR_FLEET,getTractorProfile} from '../src/config/TractorFleet.js';
import {sampleTractorField,tractorLanes} from '../src/config/TractorFields.js';
import {getThreatCodexCatalog} from '../src/config/ThreatCodexCatalog.js';
import {TRACTOR_CODEX_TEXT} from '../src/i18n/tractorFleetText.js';
const field={originX:500,originY:100,length:700,span:1000,aim:0,time:2};
assert.equal(TRACTOR_FLEET.length,15);assert.equal(new Set(TRACTOR_FLEET.map(p=>p.hull)).size,15);
assert.equal(new Set(Array.from({length:15},(_,i)=>getTractorProfile(i+1).id)).size,15);
const signatures=new Set();
for(const p of TRACTOR_FLEET){
 assert.ok(p.warning>=1000&&p.active<=2700);
 assert.ok(fs.statSync('public'+p.sprite).size>10000,p.id);
 for(const event of ['charge','active','break'])assert.ok(fs.statSync(`public/audio/sfx/tractor-fleet/${p.id}-${event}.mp3`).size>4000);
 let hits=0;const signature=[];
 for(const progress of [.05,.2,.4,.6,.8,.95])for(const y of [240,440,660])for(let x=200;x<=800;x+=20){
  const result=sampleTractorField(p,{...field,progress,x,y});
  if(result){hits++;assert.ok(Number.isFinite(result.x)&&Number.isFinite(result.y));assert.ok(Math.abs(result.x)<10&&Math.abs(result.y)<10);}
  signature.push(result?[+result.x.toFixed(2),+result.y.toFixed(2)]:null);
 }
 assert.ok(hits>0,p.id);signatures.add(JSON.stringify(signature));
 assert.equal(sampleTractorField(p,{...field,progress:.5,x:0,y:50}),null);
}
assert.equal(signatures.size,15,'Every field must have a distinct spatial/force/time behavior');
for(const locale of ['en','de','es','ru','zh-CN','pt-BR','ko','ja']){
 const entries=getThreatCodexCatalog({locale}).enemies.filter(e=>e.id.startsWith('tractor_'));
 assert.equal(entries.length,15,locale);assert.equal(TRACTOR_CODEX_TEXT[locale].length,15);
 for(const p of TRACTOR_FLEET){const entry=entries.find(e=>e.id===`tractor_${p.id}`);
  assert.equal(entry.art,p.sprite);assert.equal(entry.name,p.name);
  assert.ok(entry.description.length>20&&entry.tip.length>9,locale+':'+p.id);
  if(locale!=='en')assert.notEqual(entry.description,TRACTOR_CODEX_TEXT.en[p.index][0]);
 }
}
const profile=id=>TRACTOR_FLEET.find(p=>p.id===id);
const sample=(id,x,y,progress)=>sampleTractorField(profile(id),{...field,x,y,progress});
assert.equal(sample('twin',500,700,.3),null,'Twin corridor has an escapable central gap');
assert.equal(sample('eclipse',500,700,.3),null,'Hollow eclipse leaves a safe core');
assert.ok(sample('pulse',500,650,.05));assert.equal(sample('pulse',500,650,.20),null,'Pulse recovery releases the player');
assert.ok(sample('well',500,300,.5).y>0&&sample('well',500,650,.5).y<0,'Gravity well converges toward a focal depth');
assert.ok(sample('shepherd',550,650,.5).x>0,'Shepherd parts the player away from the axis');
assert.ok(sample('sling',520,650,.2).y<0&&sample('sling',520,650,.85).y>0,'Slingshot reverses field direction, not controls');
assert.ok(tractorLanes(profile('zipper'),{...field,depth:.8,progress:.1})[1].center>tractorLanes(profile('zipper'),{...field,depth:.8,progress:.9})[1].center,'Jaws converge');
console.log('PASS 15 original hulls, 45 audio cues, 15 distinct fields, bounded forces, safe gaps, pulses, focal well, outward sail and slingshot');
