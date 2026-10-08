import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FirstLightModel, firstLightShotTouches } from '../src/game/ArcadeFirstLight.js';
import { FIRST_LIGHT_DESIGNS } from '../src/config/FirstLightDesigns.js';
import { FIRST_LIGHT_SOUND_CATALOG, FIRST_LIGHT_SOUND_MIX } from '../src/audio/FirstLightSounds.js';

const failures = [];
function check(name, test) { try { test(); console.log('PASS', name); } catch (e) { failures.push(name); console.error('FAIL', name, e.message); } }
function method(source, name, globals = {}) {
  const start = source.search(new RegExp('^  (?:async )?' + name + '\\(', 'm'));
  assert(start >= 0, name);
  const end = source.indexOf('\n  }', start) + 4;
  return Function(...Object.keys(globals), 'return ({' + source.slice(start, end) + '})')(...Object.values(globals))[name];
}
const sceneSource = readFileSync(new URL('../src/scenes/GameOverScene.js', import.meta.url), 'utf8');
const modes = { MAYHEM_TACTICAL:'ranked_tactical', OVERRUN_TACTICAL:'overrun_tactical', OVERRUN_PURE:'overrun_pure' };
check('Arcade does not celebrate below an already known Steam best', () => {
  const scene = { game: {runMode:'ranked_tactical', previousMayhemModeBestScore:120000,
    highscoreChase:{runMode:'ranked_tactical',targetScore:718597}}, finalScore:133847,isRankedRun:true,steamSubmissionMode:true };
  const start=sceneSource.indexOf('    const previousModeBest =');
  const end=sceneSource.indexOf('    this.qualificationFanfarePlayed =',start);
  Function('RUN_MODES',sceneSource.slice(start,end)).call(scene,modes);
  assert.equal(scene.isPersonalBest,false);
});
check('an earned escort survives a sector transition', () => {
  const m=new FirstLightModel('regression');
  for(let i=0;i<52;i++)m.update(.1,{sector:1,safe:true});
  m.hit('left',100,{}); m.hit('right',100,{});
  m.update(.1,{sector:2,safe:false});
  assert.equal(m.escorts.length,2);
  assert(m.escorts.every(e=>e.age<.2));
});
check('escort service time does not expire during a wave briefing', () => {
  const m=new FirstLightModel('regression');
  for(let i=0;i<52;i++)m.update(.1,{sector:1,safe:true});
  m.hit('left',100,{});
  for(let i=0;i<120;i++)m.update(.1,{sector:1,safe:false,combat:false});
  assert.equal(m.escorts.length,1);
  assert.equal(m.escorts[0].age,0);
});
check('fast projectiles cross a lock without tunnelling',()=>{
  assert(firstLightShotTouches({previousX:100,previousY:300,x:100,y:180,radius:7},{x:100,y:240,radius:27}));
  assert(!firstLightShotTouches({previousX:135,previousY:300,x:135,y:180,radius:7},{x:100,y:240,radius:27}));
});
check('every design appears before the selection cycle repeats',()=>{
  const m=new FirstLightModel('variety');
  assert.equal(new Set([1,11,21,31].map(n=>m.variantFor(n))).size,4);
  assert.equal(new Set([2,12,22,32,42,52].map(n=>m.variantFor(n))).size,6);
});
check('each hull has its own audible rescue or destruction cue',()=>{
  const ids=['rival_weapon_break',...Object.entries(FIRST_LIGHT_DESIGNS).flatMap(([kind,designs])=>
    designs.map(design=>`${kind}_${design.id}_${kind==='convoy'?'rescue':'destroy'}`))];
  for(const id of ids){
    assert(FIRST_LIGHT_SOUND_MIX[id]?.volume>=.6,id);
    const [url]=FIRST_LIGHT_SOUND_CATALOG[`first_light_${id}`]||[];
    assert(url,id);
    const wav=readFileSync(new URL(`../public${url}`,import.meta.url));
    assert.equal(wav.toString('ascii',0,4),'RIFF',id);
    assert.equal(wav.toString('ascii',8,12),'WAVE',id);
    assert(wav.length>40000,id);
  }
});
if(failures.length)throw new Error(`${failures.length} regressions: ${failures.join('; ')}`);
