import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {openingWaveEntry} from '../src/config/OpeningWaveEngagement.js';
const base={config:{},sourceLevel:1,waveIndex:0,slot:0,count:10,runMode:'ranked_tactical',width:1280,height:720};
const oldRandom=Math.random;let draws=0,cases=0;
Math.random=()=>{draws++;throw Error('No gameplay RNG in entry choreography');};
try {
 for(const mode of ['ranked','ranked_tactical','scout','unranked'])for(let sector=1;sector<=6;sector++)for(let wave=0;wave<7;wave++)for(const count of [6,8,10,14]) {
  const a=Array.from({length:count},(_,slot)=>openingWaveEntry({...base,runMode:mode,sourceLevel:sector,waveIndex:wave,count,slot}));
  assert.equal(a.length,count);assert.equal(a[0].delayMs,0);
  assert.ok(a.every(p=>p.delayMs>=0&&p.delayMs<=3500&&p.y<0&&p.x>0&&p.x<1280));
  assert.ok(new Set(a.map(p=>p.side)).size===2,'Opposite approaches prevent a single entry firing lane');
  assert.ok(a.every((p,i)=>i===0||p.delayMs>=a[i-1].delayMs),'Ordered, bounded arrival beats');
  assert.deepEqual(a,Array.from({length:count},(_,slot)=>openingWaveEntry({...base,runMode:mode,sourceLevel:sector,waveIndex:wave,count,slot})));cases++;
 }
 for(const runMode of ['daily_signal','sector_start','overrun_pure','overrun_tactical'])assert.equal(openingWaveEntry({...base,runMode}),null);
 for(const sourceLevel of [0,7,10,20,50,51,90,410])assert.equal(openingWaveEntry({...base,sourceLevel}),null);
 for(const key of ['isChallenge','isMayhemReinforcement','isBossMayhemReinforcement','highSectorAuthoredEncounter','allowConcurrentSpawn'])assert.equal(openingWaveEntry({...base,config:{[key]:true}}),null);
}finally{Math.random=oldRandom;}
// Populated-board contracts: preserve score conversion, mode/board identity,
// score validation, progression and actual scoring/drop budgets byte-for-byte.
const baseline='3dcfd4a0b4ffef3600bbb306d099ba3c6fa9ca6c';
for(const file of ['src/shared/ScorePolicy.js','src/shared/RankPolicy.js','src/game/RunMode.js','src/config/BalanceConfig.js','src/config/RunPacingConfig.js','src/leaderboard/LeaderboardTypes.js','src/leaderboard/SteamLeaderboardProvider.js','electron/steamLeaderboardBridge.cjs','src/config/GeneratedEnemyProfiles.js','src/config/TacticalDraft.js','src/config/ShipUnlockConfig.js']) {
 assert.equal(readFileSync(file,'utf8').replaceAll('\r\n','\n'),execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'}).replaceAll('\r\n','\n'),`Preserve ${file}`);
}
assert.equal(draws,0);console.log(`PASS ${cases} formation cases; protected modes, later sectors, no RNG, existing score/board/reward contracts unchanged`);
