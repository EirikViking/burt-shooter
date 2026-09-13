import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { MYSTERIES, planMysteryLevel, isMysteryWaveEligible } from '../src/config/Mysteries.js';
import { getMysteryText, getMysterySourceText } from '../src/i18n/mysteryText.js';
const require = createRequire(import.meta.url), { readBossEncounterTest } = require('../electron/bossEncounterTest.cjs');
const waves = [{ type:'grunt',count:6 }, {type:'BOSS'}, {type:'scout',count:8}, {type:'challenge',isChallenge:true}, {type:'heavy',count:6}];
assert.equal(MYSTERIES.length,56); assert.equal(new Set(MYSTERIES.map(r=>r.id)).size,56);
for (const [sector,count] of [[10,0],[15,7],[20,14],[30,24],[40,36],[50,46],[60,56]])
  assert.equal(MYSTERIES.filter(row=>row.unlockSector<=sector).length,count,`reveal count S${sector}`);
const frequencies=[];
for (const sector of [11,20,31,60]) {
  const identities=new Set(), slots=new Set();
  for(let seed=0;seed<200;seed++) {
    const game={runMode:'mayhem_tactical',contentDirector:{seed},runStartSector:1};
    // Force a due opportunity; spacing itself has a full-run suite.
    const {encounterPacing}=await import('../src/config/EncounterPacing.js');
    encounterPacing(game).nextMystery=1;
    const args={sector,seed,waves,game}, plan=planMysteryLevel(args);
    assert.deepEqual(plan,planMysteryLevel(args),'idempotent level plan');
    assert.ok(plan.selected);identities.add(plan.id);slots.add(plan.waveIndex);
    assert.ok([0,2,4].includes(plan.waveIndex),'first contact in an ordinary wave');
    assert.ok(MYSTERIES.find(r=>r.id===plan.id).unlockSector<=sector);
    const changed=planMysteryLevel({...args,seen:[plan.id],recent:[plan.id]});
    if(MYSTERIES.filter(r=>r.unlockSector<=sector).length>1) assert.notEqual(changed.id,plan.id,'unseen preference');
  }
  frequencies.push({sector,identities:identities.size,slots:[...slots]});
}
for(const config of [{isChallenge:true},{isMayhemReinforcement:true},{isBossMayhemReinforcement:true},{allowConcurrentSpawn:true},{highSectorAuthoredEncounter:true},{marketingDebug:true}])
  assert.equal(isMysteryWaveEligible(config,{}),false);
for(const game of [{runMode:'daily_signal'},{lateGameExperiment:{active:true}},{encounterTest:{}},{isDebugRun:true}])
  for(let seed=0;seed<100;seed++)assert.equal(planMysteryLevel({sector:60,seed,waves,game}).selected,false);
for(const profile of MYSTERIES){
  const flag=`--nova-mystery-test=${profile.id}`;
  assert.equal(readBossEncounterTest([flag]),`mystery:${profile.id}`);
  assert.equal(readBossEncounterTest([flag,flag]),null);
  assert.equal(readBossEncounterTest([flag,'--nova-encounter-test=dual-boss']),null);
  for(const locale of ['en','de','es','pt-BR','ru','zh-CN','ko','ja']){
    const text=getMysteryText(profile,locale);assert.ok(text.description&&text.tip&&text.role);
    assert.equal(getMysterySourceText(locale)[getMysteryText(profile,'en').description],text.description);
    if(locale!=='en')assert.notEqual(text.tip,getMysteryText(profile,'en').tip);
  }
}
for(const arg of ['--nova-mystery-test=unknown','--nova-mystery-test=../witness','--nova-mystery-test=','--nova-encounter-test=witness'])assert.equal(readBossEncounterTest([arg]),null);
for(const id of ['dual-boss','boss-snake'])assert.equal(readBossEncounterTest([`--nova-encounter-test=${id}`]),id);
assert.equal(readBossEncounterTest(['--nova-mystery-test=all']), 'mystery:all');
assert.equal(readBossEncounterTest(['--nova-mystery-test=11']), 'mystery:parallax_hunter');
assert.equal(readBossEncounterTest(['--nova-mystery-test=all','--nova-mystery-test=11']), null);
for(const path of ['src/config/MysteryAtlases.json','src/audio/MysterySoundBanks.json'])assert.equal(Object.keys(JSON.parse(readFileSync(path))).length,56);
const out=process.env.CHECK_OUTPUT_DIR || 'E:/Codex/builds/nova-swarm/encounter-pacing/qa';mkdirSync(out,{recursive:true});writeFileSync(out+'/mystery-policy.json',JSON.stringify({frequencies,identities:56,locales:8,launchFlags:56},null,2));
console.log(JSON.stringify({pass:true,frequencies}));
