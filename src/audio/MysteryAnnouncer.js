import { AudioManager } from './AudioManager.js';
import lines from './MysteryAnnouncements.json' with { type: 'json' };

// Simulation-owned request; no delayed timer can announce a departed encounter.
// Wait for actual speech to finish, then use the existing female announcer bus.
export function requestMysteryAnnouncement(id){return {id,state:'waiting',event:`mystery_arrival_${id}`,wait:0};}
export function updateMysteryAnnouncement(request,dt){
  if(!request||request.state==='complete')return true;
  if(request.state==='playing')return false;
  const a=AudioManager,line=lines[request.id];
  if(!line||!a.enabled||!a.voiceEnabled||a.voiceVolume<=0||a.masterVolume<=0){request.state='complete';return true;}
  request.wait+=dt;
  if(a.inMenu)return false;
  if(a.getActiveVoiceLock()||[...a.activeVoices.values()].some(e=>!e.audio.ended))return false;
  request.state='playing';
  const ok=a.playVoice(request.event,{
    asset:line.url,volume:1,voicePriority:96,exclusiveGroup:'announcer',exclusiveLockMs:Math.ceil(line.duration*1000)+600,
    force:true,bypassGlobalCooldown:true,bypassEventCooldown:true,duckMusic:false,
    onEnd:()=>{request.state='complete';if(a.voicePriorityLock?.eventName===request.event)a.voicePriorityLock=null;},
  });
  if(!ok)request.state='waiting';return false;
}
export function cancelMysteryAnnouncement(request){
  if(!request)return;const a=AudioManager;
  for(const [id,e]of a.activeVoices){if(e.eventName!==request.event)continue;e.audio.pause();a.activeVoices.delete(id);if(a.activeVoiceGroups[e.exclusiveGroup]===e)delete a.activeVoiceGroups[e.exclusiveGroup];}
  if(a.voicePriorityLock?.eventName===request.event)a.voicePriorityLock=null;
  request.state='complete';
}
