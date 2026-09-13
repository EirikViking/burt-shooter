import {BOSS_SUPPORT_SHIPS,pickBossSupportShipProfile} from '../src/config/BossSupportShips.js';
import {RARE_CHAOS_VISITOR_VARIANTS,planRareChaosVisitorSpawn} from '../src/config/RareChaosVisitors.js';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {GENERATED_ENEMY_PROFILES,getGeneratedEnemyProfilesForLevel} from '../src/config/GeneratedEnemyProfiles.js';
import {ELITE_MIDDLE_SHIPS} from '../src/config/EliteMiddleShips.js';
import {SPACE_SNAKES} from '../src/config/SpaceSnakes.js';
import {TRACTOR_FLEET,getTractorProfile} from '../src/config/TractorFleet.js';
import {DANGER_MID_SHIPS} from '../src/config/DangerMidShips.js';
import {BOSS_ROSTER,getBossProfileForRun} from '../src/config/BossRoster.js';
import {planBossDiscovery} from '../src/config/DiscoveryProgression.js';
const families={enemies:GENERATED_ENEMY_PROFILES,elites:ELITE_MIDDLE_SHIPS,snakes:SPACE_SNAKES,tractors:TRACTOR_FLEET,danger:DANGER_MID_SHIPS,support:BOSS_SUPPORT_SHIPS,visitors:RARE_CHAOS_VISITOR_VARIANTS};
const report=[];
for(const [family,pool]of Object.entries(families)){
  const counts=[1,10,19,20,30,40,50,60].map(level=>pool.filter(p=>p.unlockLevel<=level).length);
  assert.ok(counts[2]<=pool.length*.5,`${family} keeps half for later`);
  assert.equal(counts.at(-1),pool.length,`${family} fully eligible by60`);
  for(let i=4;i<counts.length;i++)assert.ok(counts[i]>counts[i-1],`${family} introduces new identities each decade`);
  report.push({family,total:pool.length,counts});
}
assert.ok(new Set(getGeneratedEnemyProfilesForLevel(19).map(p=>p.spriteIndex)).size<=227*.5,'Gate visible hulls as well as variant IDs');
for(let sector=1;sector<=60;sector++){
  assert.ok(getTractorProfile(sector).unlockLevel<=sector);
  for(let seed=0;seed<100;seed++){
    assert.ok(pickBossSupportShipProfile(sector,String(seed)).unlockLevel<=sector);
    const plan=planRareChaosVisitorSpawn({seed:String(seed),level:sector,config:{type:'nova_enemy_001'}});
    if(plan.shouldSpawn)assert.ok(plan.variant.unlockLevel<=sector);
  }
}
assert.equal(getTractorProfile(1,'sling').id,'sling','Explicit Codex/debug lookups remain intact');
const bossIds=Array.from({length:60},(_,i)=>getBossProfileForRun(i+1).id);
assert.ok(new Set(bossIds.slice(0,19)).size<=BOSS_ROSTER.length*.5);
assert.equal(new Set(bossIds).size,BOSS_ROSTER.length);
assert.notEqual(bossIds[58],bossIds[59],'A final new reveal at60');
for(const sector of [15,16,20,21,30,31]){
  const results={snake:0,relay:0,relay_snake:0};
  for(let i=0;i<10000;i++){const plan=planBossDiscovery(sector,'test',{roll:(i+.5)/10000});if(plan)results[plan.kind]++;}
  assert.deepEqual(results,{snake:sector>15?1000:0,relay:sector>20?1000:0,relay_snake:sector>30?500:0});
}
assert.equal(planBossDiscovery(50,'a',{disabled:true,roll:0}),null);
assert.deepEqual(planBossDiscovery(40,'repeat'),planBossDiscovery(40,'repeat'));
const counts={snake:0,relay:0,relay_snake:0};
for(let i=0;i<50000;i++){const p=planBossDiscovery(31,`run-${i}`);if(p)counts[p.kind]++;}
for(const [key,expected]of Object.entries({snake:.1,relay:.1,relay_snake:.05}))assert.ok(Math.abs(counts[key]/50000-expected)<.008,`${key} seeded rate`);
// Compare real authored stats against the verified pre-change source, not a
// copy of current constants. Only eligibility metadata is allowed to differ.
let baseline=execFileSync('git',['show','66255de:src/config/GeneratedEnemyProfiles.js'],{encoding:'utf8'});
baseline=baseline.replace(/from '(\.\/[^']+)'/g,(_,file)=>`from '${pathToFileURL(path.resolve('src/config',file)).href}'`);
const old=await import(`data:text/javascript;base64,${Buffer.from(baseline).toString('base64')}`);
for(let i=0;i<GENERATED_ENEMY_PROFILES.length;i++){
  const {authoredUnlockLevel,unlockLevel,...actual}=GENERATED_ENEMY_PROFILES[i];
  const {unlockLevel:previous,...expected}=old.GENERATED_ENEMY_PROFILES[i];
  assert.deepEqual(actual,expected,`Authored stats ${i} unchanged`);assert.equal(authoredUnlockLevel,previous);
}
console.table(report.map(row=>({family:row.family,total:row.total,at19:row.counts[2],at30:row.counts[4],at50:row.counts[6],at60:row.counts[7]})));
console.log('PASS reveal gates, full roster, probabilities, seeded distribution, all 1780 authored stat contracts',counts);
