import assert from 'node:assert/strict';
import { BOSS_ROSTER, getBossProfileForRun, getBossRegularAttack } from '../src/config/BossRoster.js';
const bag=seed=>Array.from({length:100},(_,i)=>getBossProfileForRun(i+51,{seed,shuffleFromSector:51,seenThroughSector:50}).id);
const a=bag('first'),b=bag('second');
assert.deepEqual(a,bag('first'));assert.notDeepEqual(a.slice(0,10),b.slice(0,10));
assert.equal(new Set(a.slice(0,50)).size,50);assert.notEqual(a[49],a[50]);
for(let sector=1;sector<=60;sector++)assert.equal(getBossProfileForRun(sector,{seed:'first'}).id,getBossProfileForRun(sector,{seed:'second'}).id,'Arcade authored sequence');
for(const profile of BOSS_ROSTER){
  assert.equal(getBossRegularAttack(profile,{level:50,phase:3,releaseIndex:1}),profile.attack);
  assert.equal(getBossRegularAttack(profile,{level:51,phase:1,releaseIndex:1}),profile.attack);
  assert.equal(getBossRegularAttack(profile,{level:51,phase:3,releaseIndex:0}),profile.attack);
  assert.notEqual(getBossRegularAttack(profile,{level:51,phase:3,releaseIndex:1}),profile.attack);
}
console.log('[feedback-bosses] PASS fresh Onslaught bags, no repeats, preserved Arcade, secondary patterns');
