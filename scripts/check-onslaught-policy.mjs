import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = process.argv[2] || fileURLToPath(new URL('..', import.meta.url));
const mode = await import(pathToFileURL(root + '/src/game/RunMode.js'));
const { createRunPolicy } = await import(pathToFileURL(root + '/src/game/RunPolicy.js'));
const { calculatePilotXpForRun } = await import(pathToFileURL(root + '/src/progression/HangarProgressState.js'));
const { AchievementManager } = await import(pathToFileURL(root + '/src/achievements/AchievementManager.js'));
class MemoryStorage { constructor(){this.data=new Map();} getItem(k){return this.data.get(k)??null;} setItem(k,v){this.data.set(k,String(v));} }
let failed = 0;
for (const [name, check] of [
  ['Onslaught available to a new pilot', () => assert.equal(mode.getOverrunStartState({bestSector:1}).available, true)],
  ['Tactical global eligibility independent from gameplay ranked', () => {
    const p = createRunPolicy({runMode:'overrun_tactical'});
    assert.equal(p.allowGlobalLeaderboardSubmission, true);
    assert.equal(p.ranked, false);
    assert.equal(p.allowAchievements, false);
    assert.equal(p.allowCheckpointUnlocks, false);
    assert.equal(p.allowPersonalBests, false);
    assert.equal(mode.getRunModeNormalWaveScoreXpMultiplier('overrun_tactical'), 1);
    assert.equal(mode.getRunModeProfile('overrun_tactical').careerXpMultiplier, 1);
    assert.equal(mode.getRunModeProfile('overrun_pure').careerXpMultiplier, .85);
  }],
  ['Tactical XP is event-earned, full-rate and grants nothing at startup', () => {
    const base={score:0,startSector:51,sectorReached:51,wavesCleared:0,bossesKilled:0,codexDiscoveries:0,runThemeDiscoveries:0,noHitWaves:0,noHitSectors:0,runCleared:false};
    assert.equal(calculatePilotXpForRun({...base,runMode:'overrun_tactical'}),0);
    const earned={...base,score:5000,sectorReached:52,bossesKilled:1};
    assert.equal(calculatePilotXpForRun({...earned,runMode:'overrun_tactical'}),calculatePilotXpForRun({...earned,runMode:'ranked_tactical'}));
    assert.ok(calculatePilotXpForRun({...earned,runMode:'overrun_pure'})<calculatePilotXpForRun({...earned,runMode:'overrun_tactical'}));
  }],
  ['Onslaught achievements require an explicit per-achievement grant', () => {
    const storage=new MemoryStorage();
    const manager=new AchievementManager({storage,steamSync:false,getRunState:()=>({runMode:'overrun_tactical',isDebugRun:false})});
    assert.equal(manager.unlock('ACH_SCORE_250K',{runMode:'overrun_tactical'}),null);
    assert.equal(manager.unlock('ACH_SCORE_250K',{runMode:'overrun_tactical',onslaughtTacticalEligible:true})?.id,'ACH_SCORE_250K');
    assert.equal(manager.unlock('ACH_SECTOR_FIVE',{runMode:'overrun_tactical',onslaughtTacticalEligible:false}),null);
  }],
  ['Pure and invalid modes cannot submit', () => {
    for (const runMode of ['overrun_pure','unknown','scout','unranked']) assert.equal(createRunPolicy({runMode}).allowGlobalLeaderboardSubmission,false,runMode);
  }],
  ['Debug and prototype remain ineligible', () => {
    assert.equal(createRunPolicy({runMode:'overrun_tactical',isDebugRun:true}).allowGlobalLeaderboardSubmission,false);
    assert.equal(createRunPolicy({runMode:'overrun_tactical',prototype:true}).allowGlobalLeaderboardSubmission,false);
  }]
]) { try {check(); console.log('PASS',name);} catch(e) {failed++;console.error('FAIL',name,e.message);} }
process.exitCode=failed?1:0;
