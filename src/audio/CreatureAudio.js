import {AudioManager} from './AudioManager.js';
import {CREATURE_CUES,CREATURE_SOUND_BANKS} from './CreatureSoundBanks.js';

// A small, lazy, bounded creature bus. No gameplay random calls, persistent progression, or fleet preloads.
export class CreatureAudioBus {
 constructor(audio=AudioManager){this.audio=audio;this.cache=new Map();this.active=new Set();this.owners=new WeakMap();this.epoch=0;this.clock=()=>performance.now();this.maxBanks=4;this.maxBytes=36*1024*1024;this.sequence=0;this.lastEvent=null;this.frame=0;}
 identity(profile){return CREATURE_SOUND_BANKS[profile?.id]?profile.id:null;}
 prepare(profile){
  const id=this.identity(profile),ctx=this.audio.context;if(!id||!ctx)return Promise.resolve(null);
  const existing=this.cache.get(id);if(existing){existing.used=this.clock();return existing.promise;}
  const row={used:this.clock(),bytes:0,controller:new AbortController(),buffer:null};
  this.cache.set(id,row);this.trim(id);
  row.promise=fetch(CREATURE_SOUND_BANKS[id],{signal:row.controller.signal}).then(r=>{if(!r.ok)throw Error(`Creature bank HTTP ${r.status}`);return r.arrayBuffer();}).then(bytes=>ctx.decodeAudioData(bytes)).then(buffer=>{
   if(this.cache.get(id)!==row)return null;
   row.buffer=buffer;row.bytes=buffer.length*buffer.numberOfChannels*4;this.trim(id);return buffer;
  }).catch(error=>{if(this.cache.get(id)===row)this.cache.delete(id);if(error.name!=='AbortError')console.warn(`[CreatureAudio] ${id}: ${error.message}`);return null;});
  return row.promise;
 }
 trim(keep){
  const bytes=()=>[...this.cache.values()].reduce((n,r)=>n+r.bytes,0);
  while(this.cache.size>this.maxBanks||bytes()>this.maxBytes){
   const victim=[...this.cache].filter(([id])=>id!==keep).sort((a,b)=>a[1].used-b[1].used)[0];if(!victim)break;
   victim[1].controller.abort();this.cache.delete(victim[0]);
  }
 }
 state(owner){let s=this.owners.get(owner);if(!s){s={token:0,spoken:0,last:new Map()};this.owners.set(owner,s);}return s;}
 play(owner,profile,event,{x=.5,force=false}={}){
  if(!owner||!this.identity(profile)||!CREATURE_CUES[event]||!this.audio.enabled)return false;
  const state=this.state(owner),now=this.clock();
  if(!force&&now<(state.last.get(event)||0))return false;
  state.last.set(event,now+(event==='attack'?2400:event==='break'?320:1800));
  if(event==='hunt'){event=state.spoken++%2?'hunt_alt':'hunt';}
  const vocal=!['attack','break'].includes(event);
  if(event==='death'){this.stopOwner(owner);state.dead=true;}else if(state.dead)return false;
  if(vocal)state.token++;
  const token=state.token,epoch=this.epoch,requested=now;
  this.prepare(profile).then(buffer=>{
   if(!buffer||epoch!==this.epoch||token!==state.token||!this.audio.enabled||this.clock()-requested>(event==='arrival'?4000:1400))return;
   if(this.audio.context?.state!=='running')return;
   if(vocal)for(const voice of [...this.active])if(voice.owner===owner&&voice.vocal)this.stopVoice(voice);
   if(!vocal&&[...this.active].filter(v=>v.owner===owner).length>=2)return;
   const priority={death:9,arrival:7,rage:6,phase:6,hunt:4,hunt_alt:4,attack:3,break:2}[event];
   while(this.active.size>=4){const lowest=[...this.active].sort((a,b)=>a.priority-b.priority)[0];if(lowest.priority>priority)return;this.stopVoice(lowest);}
   const ctx=this.audio.context,cue=CREATURE_CUES[event],source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
   source.buffer=buffer;source.playbackRate.value=1;
   pan.pan.value=Math.max(-.42,Math.min(.42,(Number(x)-.5)*.84));
   const voice={owner,vocal,event,source,gain,pan,volume:cue.volume,id:profile.id,priority};
   // Bring articulation forward without exaggerating bass or clipping transients.
   const presence=ctx.createBiquadFilter(),compressor=ctx.createDynamicsCompressor();
   presence.type='peaking';presence.frequency.value=1600;presence.Q.value=.7;presence.gain.value=3.5;
   compressor.threshold.value=-24;compressor.knee.value=12;compressor.ratio.value=3;
   compressor.attack.value=.012;compressor.release.value=.16;
   voice.processing=[presence,compressor];
   source.connect(presence);presence.connect(compressor);compressor.connect(gain);gain.connect(pan);pan.connect(ctx.destination);
   source.onended=()=>this.release(voice);this.active.add(voice);this.refresh();
   source.start(0,cue.offset,cue.duration);
   this.lastEvent={id:profile.id,event,at:Date.now(),sequence:++this.sequence,rate:1};
  });return true;
 }
 refresh(){
  const priority=this.audio.getActiveSfxPriority?.()?.priority||0;
  const deathSpeech=this.audio.getActiveVoiceLock?.()?.eventName==='boss_death_agony';
  for(const v of this.active){const a=this.audio;const warningDucking=priority>=8&&priority>v.priority?.72:1;v.gain.gain.value=a.enabled?Math.max(0,a.masterVolume*a.sfxVolume*v.volume*1.8*warningDucking*(deathSpeech?.32:1)):0;}
  if(this.active.size&&!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.refresh();});
 }
 release(v){if(!this.active.delete(v))return;v.source.disconnect();v.gain.disconnect();v.pan.disconnect();for(const n of v.processing||[])n.disconnect();this.refresh();}
 stopVoice(v){try{v.source.stop();}catch{}this.release(v);}
 stopOwner(owner){const state=this.owners.get(owner);if(state)state.token++;for(const v of [...this.active])if(v.owner===owner)this.stopVoice(v);}
 stopAll({unload=false}={}){this.epoch++;for(const v of [...this.active])this.stopVoice(v);if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;if(unload){for(const r of this.cache.values())r.controller.abort();this.cache.clear();}}
 diagnostics(){return {active:this.active.size,cached:this.cache.size,bytes:[...this.cache.values()].reduce((n,r)=>n+r.bytes,0),lastEvent:this.lastEvent};}
}
export const CreatureAudio=new CreatureAudioBus();
