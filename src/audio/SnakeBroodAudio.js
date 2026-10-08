import {AudioManager} from './AudioManager.js';
import banks from './SnakeBroodSoundBanks.json' with {type:'json'};
class SnakeBroodAudioBus{
 constructor(){this.cache=new Map();this.voices=new Set();this.owners=new WeakMap();}
 prepare(family){
   const id=family.id,c=AudioManager.context;if(!c||!banks[id])return Promise.resolve(null);
   if(this.cache.has(id))return this.cache.get(id);
   const p=fetch(banks[id].url).then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();}).then(b=>c.decodeAudioData(b)).catch(e=>{this.cache.delete(id);console.warn('[SnakeBroodAudio]',id,e.message);return null;});
   this.cache.set(id,p);while(this.cache.size>3)this.cache.delete(this.cache.keys().next().value);return p;
 }
 play(owner,event){
   const a=AudioManager,bank=banks[owner.family.id],cue=bank?.cues[event];
   if(!a.enabled||!cue||owner.disposed||a.inMenu)return;
   let s=this.owners.get(owner);if(!s){s={epoch:0,last:{}};this.owners.set(owner,s);}
   const now=performance.now();if(now<(s.last[event]||0))return;
   s.last[event]=now+({attack:330,death:150,support:1000,chorus:8000,hatch:2000}[event]||500);
   const epoch=s.epoch;
   this.prepare(owner.family).then(buffer=>{
     if(!buffer||owner.disposed||s.epoch!==epoch||performance.now()-now>1200||a.inMenu||a.context?.state!=='running')return;
     if(this.voices.size>=4){const victim=[...this.voices].find(v=>v.event==='attack'||v.event==='death');if(!victim)return;this.stop(victim);}
     const source=a.context.createBufferSource(),gain=a.context.createGain(),pan=a.context.createStereoPanner();source.buffer=buffer;
     const volume={hatch:.86,chorus:.68,attack:.65,support:.53,death:.55}[event];
     gain.gain.value=a.masterVolume*a.sfxVolume*volume*(a.pauseDuckFactor??1);
     pan.pan.value=Math.max(-.65,Math.min(.65,((owner.chain.sections.find(s=>s.active)?.x||owner.manager.game.getWidth()/2)/owner.manager.game.getWidth()-.5)*1.3));
     source.connect(gain);gain.connect(pan);pan.connect(a.context.destination);
     const voice={owner,event,source,gain,pan,volume};this.voices.add(voice);
     source.onended=()=>this.stop(voice);source.start(0,cue.offset,cue.duration);this.watchMix();
   });
 }
 update(){const a=AudioManager;for(const v of this.voices){if(a.inMenu||!a.enabled)this.stop(v);else v.gain.gain.value=a.masterVolume*a.sfxVolume*v.volume*(a.pauseDuckFactor??1);}}
 watchMix(){if(this.mixFrame||!this.voices.size)return;this.mixFrame=requestAnimationFrame(()=>{this.mixFrame=null;this.update();this.watchMix();});}
 stop(v){if(!this.voices.delete(v))return;v.source.onended=null;try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();v.pan.disconnect();}
 stopOwner(owner){const s=this.owners.get(owner);if(s)s.epoch++;for(const v of this.voices)if(v.owner===owner)this.stop(v);}
 get diagnostics(){return {voices:this.voices.size,cachedFamilies:this.cache.size};}
}
export const SnakeBroodAudio=new SnakeBroodAudioBus();
