import {Container,Mesh,MeshGeometry,Texture} from 'pixi.js';
import {COSMIC_FAUNA} from '../config/CosmicFaunaCatalog.js';
import {CosmicFaunaClock,deformFauna,faunaBlocked,smoothFauna} from './CosmicFaunaMotion.js';
import {getReducedMotionEnabled,getFlashIntensityScale} from '../config/AccessibilitySettings.js';
import {AudioManager} from '../audio/AudioManager.js';
import {FaunaPassageAudio} from '../audio/FaunaPassageAudio.js';

export class CosmicFaunaRig extends Container {
 constructor(texture,definition){
  super();this.eventMode='none';this.label=`cosmicFauna:${definition.id}`;this.definition=definition;
  const cols=28,rows=18,count=(cols+1)*(rows+1);
  this.base=new Float32Array(count*2);this.deformed=new Float32Array(count*2);
  const positions=new Float32Array(count*2),indices=new Uint32Array(cols*rows*6);
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const i=(y*(cols+1)+x)*2;this.base[i]=x/cols;this.base[i+1]=y/rows;}
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,i=(y*cols+x)*6;indices.set([a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1],i);}
  this.aspect=texture.height/texture.width;
  this.geometry=new MeshGeometry({positions,uvs:this.base.slice(),indices});
  this.mesh=new Mesh({geometry:this.geometry,texture});this.mesh.eventMode='none';this.addChild(this.mesh);this.pose(0,false);
 }
 pose(seconds,reduced){
  deformFauna(this.base,this.deformed,this.definition,seconds,reduced);
  const positions=this.geometry.positions;
  for(let i=0;i<positions.length;i+=2){positions[i]=(this.deformed[i]-.5)*1000;positions[i+1]=(this.deformed[i+1]-.5)*1000*this.aspect;}
  this.geometry.getBuffer('aPosition').update();
 }
 destroy(){if(this.destroyed)return;super.destroy({children:true});this.geometry.destroy(true);this.base=null;this.deformed=null;}
}

function release(entry){
 if(!entry||entry.released)return;entry.released=true;
 entry.passageAudio?.destroy();
 if(entry.preparing){entry.released=false;entry.retired=true;entry.audio.pause();return;}
 entry.audio.pause();entry.audio.removeAttribute('src');entry.audio.load();
 entry.rig.destroy();entry.texture.destroy(true);entry.bitmap.close();
}

async function loadEntry(definition,signal){
 let bitmap,texture,rig;
 const audio=new Audio();audio.preload='auto';
 try{
  const response=await fetch(definition.art,{signal});if(!response.ok)throw Error(`Fauna art HTTP ${response.status}`);
  bitmap=await createImageBitmap(await response.blob());signal.throwIfAborted();
  texture=Texture.from({resource:bitmap,autoGenerateMipmaps:true,scaleMode:'linear'},true);
  rig=new CosmicFaunaRig(texture,definition);
  await new Promise((resolve,reject)=>{
   const finish=error=>{clearTimeout(timer);signal.removeEventListener('abort',aborted);audio.removeEventListener('canplaythrough',ready);audio.removeEventListener('error',failed);error?reject(error):resolve();};
   const ready=()=>finish(),failed=()=>finish(new Error(`Fauna sound unavailable: ${definition.id}`)),aborted=()=>finish(new Error('Retired fauna load'));
   const timer=setTimeout(failed,12000);
   audio.addEventListener('canplaythrough',ready,{once:true});audio.addEventListener('error',failed,{once:true});signal.addEventListener('abort',aborted,{once:true});
   audio.src=definition.sound;audio.load();if(signal.aborted)aborted();
  });
  signal.throwIfAborted();
  return{definition,bitmap,texture,rig,audio,passageAudio:definition.soundSeconds===20?new FaunaPassageAudio(audio,AudioManager.context):null,prepared:false,released:false,sounded:false,ducked:false};
 }catch(error){audio.pause();audio.removeAttribute('src');audio.load();rig?.destroy();texture?.destroy(true);bitmap?.close();throw error;}
}

// Owns only decorative assets. Never registers targets or invokes encounter,
// persistence, reward or input systems. One current and one next resource slot.
export class CosmicFauna extends Container {
 constructor(scene,{catalog=COSMIC_FAUNA,load=loadEntry}={}){
  super();this.scene=scene;this.catalog=catalog;this.load=load;this.eventMode='none';this.label='cosmicFauna';this.zIndex=-990;
  this.clock=new CosmicFaunaClock(scene.game.contentDirector?.seed||scene.game.gameId||'nova-fauna',catalog);
  this.current=null;this.next=null;this.loading=false;this.preparing=false;this.abort=new AbortController();this.error=null;this.visibility=1;
  this.trace=scene.game.encounterEvolutionTest?[]:null;
  this.ensureNext();
 }
 record(event,id){if(!this.trace)return;this.trace.push({event,id,ordinal:this.clock.ordinal,age:this.clock.active?.age||0});if(this.trace.length>64)this.trace.shift();}
 ensureNext(){
  if(this.destroyed||this.loading||this.next||this.error||!this.catalog.length)return;
  this.loading=true;const definition=this.catalog[this.clock.nextIndex];
  this.pending=this.load(definition,this.abort.signal).then(entry=>{
   if(this.destroyed){release(entry);return;}
   this.next=entry;this.record('loaded',definition.id);
  }).catch(error=>{if(!this.destroyed){this.error=String(error.message);console.warn('[CosmicFauna] Decorative asset skipped:',this.error);}})
   .finally(()=>{this.loading=false;});
 }
 prepareNext(){
  const entry=this.next;if(!entry||entry.prepared||this.preparing||this.destroyed)return;
  this.preparing=true;entry.preparing=true;
  this.preparation=Promise.resolve(this.scene.game.app.renderer.prepare?.upload?.(entry.rig))
   .then(()=>{if(!this.destroyed&&!entry.retired&&!entry.released){entry.prepared=true;this.record('prepared',entry.definition.id);}})
   .catch(error=>{if(!this.destroyed)this.error=String(error.message);})
   .finally(()=>{this.preparing=false;entry.preparing=false;if(entry.retired)release(entry);});
 }
 stopSound(){if(this.current){this.current.passageAudio?.stop();this.current.audio.pause();this.current.sounded=true;}}
 sync(){
  if(this.destroyed)return false;
  const s=this.scene,dead=s.gameOverSequenceStarted||s.gameOverInterlude?.active||!(s.game.lives>0);
  if(dead){this.stopSound();this.clock.cancel();release(this.current);this.current=null;this.visible=false;return false;}
  const advancing=s.isGameplayClockAdvancing()&&!s.overrunMilestoneInterlude?.active&&s.player?.active!==false;
  this.visible=!s.tacticalDraft?.active&&!s.overrunMilestoneInterlude?.active;
  if(!advancing)this.stopSound();
  return advancing;
 }
 tick(delta){
  if(this.destroyed)return;
  const s=this.scene,advancing=this.sync(),blocked=faunaBlocked(s);
  const ordinary=advancing&&!blocked&&s.enemyManager?.state==='WAVE_ACTIVE'&&!s.enemyManager?.waveEnding;
  // Decode while a slot is free; GPU upload only during the intro/interwave gap.
  if(!blocked&&s.enemyManager?.state!=='WAVE_ACTIVE'){this.ensureNext();this.prepareNext();}
  this.clock.step(delta/60,{advancing,ordinary,ready:Boolean(this.next?.prepared)});
  if(this.clock.event==='end'){this.record('departed',this.current?.definition.id);release(this.current);this.current=null;}
  if(this.clock.event==='start'){
   this.current=this.next;this.next=null;this.addChild(this.current.rig);this.visibility=blocked?0:1;this.record('arrived',this.current.definition.id);
  }
  const entry=this.current,active=this.clock.active;if(!entry||!active)return;
  const reduced=getReducedMotionEnabled(),flash=getFlashIntensityScale(),dt=Math.min(.05,delta/60);
  if(!advancing){
   // Boss presentation can hold the combat clock. It must still take visual
   // priority; an actual user pause keeps the entire composition frozen.
   if(blocked&&!s.isPaused){this.visibility*=Math.max(0,1-dt*5);entry.rig.alpha=Math.min(entry.rig.alpha,.04+this.visibility*.54);}
   return;
  }
  this.visibility+=(Number(!blocked)-this.visibility)*Math.min(1,dt*4);
  const w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
  // Tall shells and sails need room for their stroke. Width alone cropped them
  // against the HUD even when the animal was centered in its passage.
  const width=Math.min(w*entry.definition.width,h*1.55,h*.66/entry.rig.aspect);
  const halfHeight=width*entry.rig.aspect*.5;
  const laneY=Math.max(halfHeight+h*.12,Math.min(h-halfHeight-h*.12,h*active.lane));
  const p=active.age/active.duration,fade=smoothFauna(active.age/2)*smoothFauna((active.duration-active.age)/3);
  const rig=entry.rig;
  rig.pose(active.age,reduced);rig.scale.set(width/1000*active.direction,width/1000);
  rig.position.set(reduced?w*.5:(active.direction>0?w+width*.55-(w+width*1.1)*p:-width*.55+(w+width*1.1)*p),laneY);
  rig.rotation=reduced?0:Math.sin(active.age*.22)*.025*active.direction;
  rig.alpha=fade*(.04+this.visibility*.54)*(.76+flash*.24);
  const priority=AudioManager.getActiveSfxPriority();
  if(blocked||priority?.priority>20)this.stopSound();
  const volume=AudioManager.enabled?AudioManager.masterVolume*AudioManager.sfxVolume*.8*this.visibility:0;
  // Existing short recordings retain their shipped timing until the authored
  // passage is admitted into the normal catalog after audiovisual preview.
  if(!entry.passageAudio){
   if(!entry.sounded&&p>=.17){
    entry.sounded=true;
    if(AudioManager.enabled&&AudioManager.masterVolume>0&&AudioManager.sfxVolume>0){
     entry.audio.volume=Math.min(1,AudioManager.masterVolume*AudioManager.sfxVolume*.8);
     entry.audio.play().catch(()=>{});this.record('sound',entry.definition.id);
    }
   }
   if(!entry.audio.paused)entry.audio.volume=Math.min(1,volume);
   return;
  }
  entry.passageAudio?.update({progress:p,direction:active.direction,volume,allowed:!blocked&&!(priority?.priority>20)});
  if(!entry.sounded&&entry.passageAudio?.started){entry.sounded=true;this.record('sound',entry.definition.id);}
  // Briefly make room for the individual voice. Never weaken an existing duck
  // or reserve warning priority for a decorative creature.
  if(!entry.ducked&&p>=.28){
   entry.ducked=true;
   if(!entry.audio.paused&&volume>0&&AudioManager.musicDuckFactor>=.999)AudioManager.duckMusic(.78,2000);
  }
 }
 destroy(){
  if(this.destroyed)return;this.abort.abort();this.stopSound();this.clock.cancel();
  release(this.current);release(this.next);this.current=null;this.next=null;
  super.destroy({children:true});this.scene=null;
 }
}
