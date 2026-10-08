import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FirstLightModel } from '../src/game/ArcadeFirstLight.js';
import { careerInfoSignature, hasUnseenCareerInfo, acknowledgeCareerInfo } from '../src/progression/CareerSignalState.js';
import { ALL_POWERUP_TYPES } from '../src/config/PowerupCatalog.js';
import { BalanceConfig } from '../src/config/BalanceConfig.js';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const method = (source, name, globals = {}) => {
  const start = source.search(new RegExp(`^  (?:async )?${name}\\(`, 'm'));
  assert(start >= 0, name);
  const end = source.indexOf('\n  }', start) + 4;
  return Function(...Object.keys(globals), `return ({${source.slice(start, end)}}).${name}`)(...Object.values(globals));
};
const failures = [];
async function check(name, fn) { try { await fn(); console.log('PASS', name); } catch (e) { failures.push(name); console.error('FAIL', name, e.message); } }

await check('routine XP, rank, score, discoveries and completed runs do not blink Career', () => {
  const p = { pilotXp: 10, totalRuns: 1, runContracts: { activeIds: ['a'], completedIds: [] } };
  assert.equal(careerInfoSignature(p), careerInfoSignature({ ...p, pilotXp: 50, pilotRank: 2, totalRuns: 2, bestScore: 100, totalCodexDiscoveries: 3 }));
  const map = new Map(), storage = { getItem: k => map.get(k), setItem: (k,v) => map.set(k,v) };
  assert.equal(hasUnseenCareerInfo(p, storage), false);
  const next = { ...p, runContracts: { activeIds: ['b'], completedIds: ['a'] } };
  assert.equal(hasUnseenCareerInfo(next, storage), true);
  acknowledgeCareerInfo(next, storage);
  assert.equal(hasUnseenCareerInfo(next, storage), false);
  assert.equal(careerInfoSignature(next), careerInfoSignature({ ...next, runContracts: { ...next.runContracts, progress: { b: 2 } } }));
});

await check('achievement rows keep a stable column while scrolling', () => {
  const draw = method(read('src/scenes/AchievementsScene.js'), 'drawRows', { getBoundsDebug: d => ({ x: d.x, y: d.y }) });
  const rows = Array.from({length:10}, (_,id)=>({ achievement:{id:String(id)} }));
  const s = { rows, columns:2, rowsPerColumn:3, visibleCapacity:6, scrollOffset:0, listLeft:0, listTop:0,
    rowWidth:100, columnGap:10, rowHeight:50, clearRenderedRows(){}, drawScrollIndicator(){}, rowsContainer:{addChild(){}},
    createAchievementRow(){const d={};d.position={set(x,y){d.x=x;d.y=y;}};return d;} };
  draw.call(s); const columns = new Map(s.rowDebug.map(r=>[r.id,r.bounds.x]));
  assert.deepEqual(s.rowDebug.map(r=>r.bounds.x), [0,110,0,110,0,110]);
  s.scrollOffset=2; draw.call(s);
  for(const r of s.rowDebug) if(columns.has(r.id)) assert.equal(r.bounds.x,columns.get(r.id));
  s.columns=1;s.visibleCapacity=3;s.scrollOffset=0;draw.call(s);
  assert(s.rowDebug.every(r=>r.bounds.x===0));
  const ensure = method(read('src/scenes/AchievementsScene.js'), 'ensureFocusedVisible', {clamp:(n,lo,hi)=>Math.max(lo,Math.min(hi,n))});
  s.columns=2;s.visibleCapacity=6;s.rows=rows.slice(0,9);s.scrollOffset=0;s.focusedIndex=8;
  ensure.call(s);assert.equal(s.scrollOffset,4);assert(s.focusedIndex<s.scrollOffset+s.visibleCapacity);
});

await check('Hangar unlocks after a cancelled or rejected launch', async () => {
  const start = method(read('src/scenes/ShipSelectScene.js'), 'startSelectedShipInMode', {
    RUN_MODES:{MAYHEM_TACTICAL:'ranked_tactical'}, isShipUnlocked:()=>true, setSelectedShipKey(){}, DEBUG:false });
  for(const startGame of [()=>false, ()=>Promise.reject(new Error('expected launch failure'))]) {
    const s={selectedIndex:0,ships:[{spriteKey:'test'}],unlockProgress:{},saveSelection(){},closeLaunchModeOverlay(){},game:{startGame}};
    const original=console.error;console.error=()=>{};
    try { start.call(s,{id:'overrun_tactical'});await new Promise(resolve=>setImmediate(resolve)); } finally {console.error=original;}
    assert.equal(s.launchInProgress,false);
  }
});

await check('ordinary briefing preserves encounter presentation and health without consuming combat time', () => {
  const m=new FirstLightModel('forum-feedback');for(let i=0;i<55;i++)m.update(.1,{sector:1,safe:true});
  const e=m.encounter, age=e.age; m.hit('left',1,{});const hp=e.hp.left;
  for(let i=0;i<50;i++)m.update(.1,{sector:1,safe:false,combat:false,present:true});
  assert.equal(m.encounter,e);assert.equal(e.suspended,false);assert.equal(e.age,age);assert.equal(e.hp.left,hp);
  m.update(.1,{sector:1,safe:false,combat:false,present:false});assert(e.suspended);
});

await check('every advertised pickup can be selected by actual random-drop code', () => {
  const spawn=method(read('src/managers/PowerupManager.js'),'spawn',{BalanceConfig,console:{log(){}}});
  const found=new Set(), oldRandom=Math.random;
  try { for(const roll of [.001,.009,.02,.05,.065,.1,.23,.4,.57,.8]) for(let index=0;index<120;index++) {
    let n=0;Math.random=()=>n++===0?roll:(index+.5)/120;
    const manager={game:{scenes:{play:{player:{shieldActive:false}}}},currentLevel:1,lastExtraLifeLevel:1,
      areExtraLifeDropsEnabled:()=>true,canSpawnNovaMiracle:()=>true,canSpawnSuperExtraLife:()=>true,
      createPowerup(x,y,type){found.add(type);return {};},dropsThisLevel:0,dropsThisRun:0};
    spawn.call(manager,100,100,true);
  }} finally {Math.random=oldRandom;}
  assert.deepEqual(ALL_POWERUP_TYPES.filter(id=>!found.has(id)),[]);
});
assert.equal(failures.length,0,failures.join('; '));
