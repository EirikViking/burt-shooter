import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {MYSTERIES} from '../src/config/Mysteries.js';
const banks=JSON.parse(fs.readFileSync('src/audio/MysterySoundBanks.json')),lines=JSON.parse(fs.readFileSync('src/audio/MysteryAnnouncements.json'));
const root='E:/Codex/builds/nova-swarm/mystery-v2/qa';fs.mkdirSync(root,{recursive:true});
let duckCalls=0,voiceCalls=0,lastOptions;
globalThis.__qaAudio={enabled:true,voiceEnabled:true,voiceVolume:1,masterVolume:1,sfxVolume:1,inMenu:false,activeVoices:new Map(),activeVoiceGroups:{},
 getActiveVoiceLock(){return this.voicePriorityLock;},
 playVoice(event,options){voiceCalls++;lastOptions=options;this.voicePriorityLock={eventName:event};return true;},
 duckMusic(){duckCalls++;},applyActiveVoiceVolumes(){},
 context:{state:'running',destination:{},createBufferSource(){return {connect(){},disconnect(){},start(){},stop(){}};},
 createGain(){return {gain:{value:0},connect(){},disconnect(){}};},createStereoPanner(){return {pan:{value:0},connect(){},disconnect(){}};}}
};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const load=async file=>{
 let code=fs.readFileSync(file,'utf8').replace("import { AudioManager } from './AudioManager.js';",'const AudioManager=globalThis.__qaAudio;');
 code=code.replace(/import (banks|lines) from [^;]+;/,(_,name)=>`const ${name}=${JSON.stringify(name==='banks'?banks:lines)};`);
 return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
};
const {requestMysteryAnnouncement,updateMysteryAnnouncement,cancelMysteryAnnouncement}=await load('src/audio/MysteryAnnouncer.js');
const a=globalThis.__qaAudio,r=requestMysteryAnnouncement('glass_widow');
a.activeVoices.set(1,{audio:{ended:false}});assert.equal(updateMysteryAnnouncement(r,.1),false);assert.equal(voiceCalls,0,'Do not overlap speech');
a.activeVoices.clear();a.voicePriorityLock={eventName:'boss_death_agony'};updateMysteryAnnouncement(r,.1);assert.equal(voiceCalls,0,'Respect boss voice reservation');
a.voicePriorityLock=null;updateMysteryAnnouncement(r,.1);assert.equal(voiceCalls,1);assert.equal(lastOptions.duckMusic,false);assert.equal(r.state,'playing');
assert.equal(updateMysteryAnnouncement(r,.1),false,'Arrival waits for spoken warning completion');lastOptions.onEnd();assert.equal(updateMysteryAnnouncement(r,.1),true);
const cancel=requestMysteryAnnouncement('needle_saint');updateMysteryAnnouncement(cancel,.1);cancelMysteryAnnouncement(cancel);assert.equal(cancel.state,'complete');assert.equal(a.voicePriorityLock,null);
a.voiceEnabled=false;assert.equal(updateMysteryAnnouncement(requestMysteryAnnouncement('witness'),.1),true,'Muted voice never blocks gameplay');
const {MysteryAudio}=await load('src/audio/MysteryAudio.js');MysteryAudio.prepare=async()=>({});
for(const event of ['arrival','warning','attack','break','death']){MysteryAudio.play({}, {id:'glass_widow'},event);await new Promise(r=>setTimeout(r,0));}
assert.equal(duckCalls,0,'Mystery SFX never duck music');assert.equal(a.sfxPriorityLock,undefined);assert.equal(a.mysteryVoiceDuckUntil,undefined);
MysteryAudio.stopAll();assert.equal(MysteryAudio.diagnostics().voices,0);
const rows=[];
for(const {id} of MYSTERIES){
 assert.ok(banks[id]&&lines[id]);assert.match(lines[id].url,/mysteries-v2/);
 for(const url of [banks[id].url,lines[id].url]){
  const file='public'+url;assert.ok(fs.existsSync(file));
  const p=spawnSync('ffprobe',['-v','error','-show_entries','format=duration,size','-of','json',file],{encoding:'utf8',windowsHide:true});
  assert.equal(p.status,0,file);const info=JSON.parse(p.stdout).format;assert.ok(Number(info.duration)>.5);
  if(url===banks[id].url)for(const c of Object.values(banks[id].cues))assert.ok(c.offset>=0&&c.duration>0&&c.offset+c.duration<=Number(info.duration)+.05,id);
  rows.push({id,url,...info});
 }
}
fs.writeFileSync(`${root}/audio-contract.json`,JSON.stringify({voiceCalls,duckCalls,files:rows.length,rows,limits:'Codec/cue/voice-queue checks; no claim of a human listening review.'},null,2));
console.log('PASS 56 banks, 56 female announcements, codec and cue bounds, no ducking, voice sequencing, mute/cancel and SFX cleanup');
