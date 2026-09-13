import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EncounterScorePacing} from '../src/managers/EncounterScorePacing.js';
function fixture(kind='mystery') {
 const g={score:0,runElapsedSeconds:0,scenes:{play:{}},addBonusScore(n){this.score+=n;return n;}};
 const m={game:g,level:31,enemies:[]},p=new EncounterScorePacing(m);
 // A controlled 600 points/second normal-combat reference, including bonuses.
 for(let i=0;i<200;i++){g.runElapsedSeconds+=.1;g.score+=60;p.update();}
 const e={kind,active:true,health:100,maxHealth:100,x:100,y:100,type:'fixture'};
 m.enemies=[e];p.update();return {g,m,p,e,start:g.score};
}
const results=[];
for(const kind of ['mystery','space_snake']){
 const f=fixture(kind),{g,p,e}=f;
 for(let i=0;i<200;i++){
  g.runElapsedSeconds+=.1;e.health=Math.max(0,100-(i+1)*.5);p.noteDamage(e,.5);
  if(i===199){e.active=false;g.score+=2000;}p.update();
 }
 const earned=g.score-f.start;assert.ok(earned>=11900&&earned<=14500,'maintain measured pace, with existing bounty credited');
 results.push({kind,seconds:20,baselinePerSecond:600,earned,receipt:g.encounterScoreLog});
 const final=g.score;for(let i=0;i<50;i++){g.runElapsedSeconds+=.1;p.update();}assert.equal(g.score,final,'completed reward does not repeat');
}
{
 const {g,p,e}=fixture();const start=g.score;
 for(let i=0;i<900;i++){g.runElapsedSeconds+=.1;p.update();}assert.equal(g.score,start,'idle enemy yields no score');
 e.health-=1;p.noteDamage(e,1);p.update();const first=g.score;
 for(let i=0;i<900;i++){g.runElapsedSeconds+=.1;p.update();}assert.equal(g.score,first,'waiting after one hit yields no score');
 e.health-=.001;p.noteDamage(e,.001);p.update();assert.ok(g.score-start<=241,'tiny damage cannot cash a long timer');
 e.health=100;p.update();e.health=99;p.noteDamage(e,1);p.update();assert.ok(g.score-start<=241,'healing and repeating damage cannot farm progress');
}
{
 const f=fixture('boss'),{g,m,p,e}=f;m.discoveryEncounter={plan:{kind:'relay',guestHealthRatio:2},primary:e,baseHealth:50,stage:'waiting'};
 p.update();
 for(let i=0;i<100;i++){g.runElapsedSeconds+=.1;e.health-=1;p.noteDamage(e,1);if(i===99)e.active=false;p.update();}
 assert.ok(p.group,'primary death cannot reset the relay reward');
 const guest={kind:'boss',active:true,health:100,maxHealth:100};m.discoveryEncounter.guest=guest;m.discoveryEncounter.stage='active';m.enemies=[guest];p.update();
 for(let i=0;i<100;i++){g.runElapsedSeconds+=.1;guest.health-=1;p.noteDamage(guest,1);if(i===99)guest.active=false;p.update();}
 assert.equal(g.encounterScoreLog.length,1,'one accounting group for both bosses');assert.ok(g.score-f.start>=11900);
}
{
 const {g,p,e}=fixture();g.finalScoreLocked=true;g.addBonusScore=()=>0;
 e.health=1;p.noteDamage(e,99);g.runElapsedSeconds+=1;p.update();assert.equal(p.group.paid,0,'respects final-score lock');
 p.cancel();assert.equal(p.group,null,'scene cleanup discards unfinished rewards');
}
// A rate-protection illustration, not a claim of measured human retention.
const pace=600,ordinarySeconds=1000/pace,extendedSeconds=ordinarySeconds+20;
const points=1000+pace*20;assert.equal(points/extendedSeconds,pace);
const out=process.env.CHECK_OUTPUT_DIR||'E:/Codex/builds/nova-swarm/encounter-pacing/qa';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/score-pacing.json',JSON.stringify({results,checks:['idle','tiny-damage cap','healing','repeat completion','relay continuity','final lock','scene cleanup'],illustration:{normalMillionSeconds:1000000/pace,protectedMillionSeconds:1000000/(points/extendedSeconds)}},null,2));
console.log('PASS encounter score pace, no passive farming, bounded damage credit, relay accounting, score lock',results.map(r=>({kind:r.kind,earned:r.earned})));
