import assert from 'node:assert/strict';
globalThis.Audio=class{addEventListener(){}};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=()=>{};
const {CreatureAudioBus}=await import('../src/audio/CreatureAudio.js');
const {CREATURE_CUES,CREATURE_SOUND_BANKS}=await import('../src/audio/CreatureSoundBanks.js');
const {BOSS_ROSTER}=await import('../src/config/BossRoster.js');
const {SPACE_SNAKES}=await import('../src/config/SpaceSnakes.js');
const all=[...BOSS_ROSTER,...SPACE_SNAKES];
assert.equal(all.length,64);assert.equal(Object.keys(CREATURE_SOUND_BANKS).length,64);
let end=0;for(const cue of Object.values(CREATURE_CUES)){assert.ok(cue.offset>=end);end=cue.offset+cue.duration;}
const sources=[];
const node=()=>({connect(){},disconnect(){},gain:{value:0},pan:{value:0}});
const ctx={state:'running',destination:{},decodeAudioData:async()=>({length:44100*21,numberOfChannels:2}),createBiquadFilter:()=>({...node(),frequency:{},Q:{}}),createDynamicsCompressor:()=>({...node(),threshold:{},knee:{},ratio:{},attack:{},release:{}}),createGain:node,createStereoPanner:node,createBufferSource(){const n={...node(),playbackRate:{value:0},start(...args){this.args=args;},stop(){this.stopped=true;}};sources.push(n);return n;}};
globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
const a={context:ctx,enabled:true,masterVolume:.8,sfxVolume:.5,duckMusic(){},setCreaturePresence(value){this.presence=value;}};
const bus=new CreatureAudioBus(a);let now=5000;bus.clock=()=>now;
const flush=()=>new Promise(r=>setImmediate(r));
const owner={},profile=all[0];
assert.ok(bus.play(owner,profile,'arrival'));await flush();assert.equal(bus.active.size,1);assert.equal(sources[0].playbackRate.value,1);
assert.ok(bus.play(owner,profile,'attack'));await flush();assert.equal(bus.active.size,2);
assert.equal(bus.play(owner,profile,'attack'),false,'rapid attack spam must be suppressed');
now+=5000;bus.play(owner,profile,'hunt');await flush();assert.ok(sources[0].stopped,'a new call should replace the previous vocal');
assert.equal(bus.lastEvent.event,'hunt');now+=5000;bus.play(owner,profile,'hunt');await flush();assert.equal(bus.lastEvent.event,'hunt_alt');
a.enabled=false;bus.refresh();assert.ok([...bus.active].every(v=>v.gain.gain.value===0));a.enabled=true;
bus.refresh();const gainBefore=[...bus.active][0].gain.gain.value;a.getActiveSfxPriority=()=>({priority:10});bus.refresh();assert.ok([...bus.active][0].gain.gain.value<gainBefore,'critical weapon cues must duck creature calls');a.getActiveSfxPriority=()=>null;

a.getActiveVoiceLock=()=>({eventName:'boss_death_agony'});bus.refresh();
assert.ok([...bus.active][0].gain.gain.value<gainBefore*.5,'spoken death complaint must lead the creature death sound');
a.getActiveVoiceLock=()=>null;
bus.stopOwner(owner);assert.equal(bus.active.size,0);
// Scene exit while a bank is decoding must never produce a late sound.
let resolveDecode;ctx.decodeAudioData=()=>new Promise(r=>resolveDecode=r);bus.stopAll({unload:true});
bus.play({},all[1],'arrival');await flush();bus.stopAll({unload:true});resolveDecode({length:44100,numberOfChannels:2});await flush();assert.equal(bus.active.size,0);assert.equal(bus.cache.size,0);
ctx.decodeAudioData=async()=>({length:44100*21,numberOfChannels:2});
for(const p of all)await bus.prepare(p);
assert.ok(bus.cache.size<=4);assert.ok(bus.diagnostics().bytes<=36*1024*1024);
// Only the creature bus uses its own deterministic alternating articulation; game RNG is untouched.
const oldRandom=Math.random;Math.random=()=>{throw Error('Gameplay RNG consumed');};
try{bus.play({},all[63],'rage');await flush();}finally{Math.random=oldRandom;}
bus.stopAll({unload:true});assert.equal(bus.diagnostics().active,0);assert.equal(bus.diagnostics().bytes,0);
console.log('PASS 64 identities, cue boundaries, native pitch, overlap/cooldown, alternating calls, mute, cancelled loads, cache bounds, teardown and RNG isolation');
