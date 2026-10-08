import {AudioManager} from './AudioManager.js';
import {CONVOY_SURPRISE_CUES,CONVOY_SURPRISE_SOUND_CATALOG} from './ConvoySurpriseSounds.js';
let pending;
export function prewarmConvoySurpriseSounds(){
 return pending ||= Promise.all(CONVOY_SURPRISE_CUES.flatMap(id=>Array.from({length:2},()=>new Promise((resolve,reject)=>{
  const audio=AudioManager.getSfxAudio(`rescue_${id}`,CONVOY_SURPRISE_SOUND_CATALOG[`rescue_${id}`][0],{pool:true,poolSize:2});
  if(audio.readyState>=2){resolve();return;}
  const timeout=setTimeout(()=>finish(new Error(`Rescue audio ${id} preload timeout`)),12000);
  const finish=error=>{clearTimeout(timeout);audio.removeEventListener('loadeddata',loaded);audio.removeEventListener('error',failed);error?reject(error):resolve();};
  const loaded=()=>finish(),failed=()=>finish(new Error(`Rescue audio ${id} unavailable`));
  audio.addEventListener('loadeddata',loaded,{once:true});audio.addEventListener('error',failed,{once:true});audio.load();
 })))).catch(error=>{pending=null;throw error;});
}
export function playConvoySurpriseSound(id){return AudioManager.playSfx(`rescue_${id}`,{pool:true,poolSize:2,preserveGameplayRng:true,sfxGroup:'convoy-surprise'});}
