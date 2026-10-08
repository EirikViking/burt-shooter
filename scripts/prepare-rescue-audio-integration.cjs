const fs=require('fs'),path=require('path'),crypto=require('crypto');
const task='E:/Codex/tmp/nova-rescue-batch/prepared',checkpoint='E:/Codex/builds/nova-swarm/rescue-batch/source-before';
fs.mkdirSync(task,{recursive:true});
const changes={
 'src/audio/SoundCatalog.js':[
 ["import { VISUAL_LIFE_SOUND_CATALOG, VISUAL_LIFE_SOUND_MIX } from './VisualLifeSounds.js';","import { VISUAL_LIFE_SOUND_CATALOG, VISUAL_LIFE_SOUND_MIX } from './VisualLifeSounds.js';\nimport {CONVOY_SURPRISE_SOUND_CATALOG,CONVOY_SURPRISE_SOUND_MIX} from './ConvoySurpriseSounds.js';"],
 ['    ...VISUAL_LIFE_SOUND_MIX,','    ...VISUAL_LIFE_SOUND_MIX,\n    ...CONVOY_SURPRISE_SOUND_MIX,'],
 ['    ...VISUAL_LIFE_SOUND_CATALOG,','    ...VISUAL_LIFE_SOUND_CATALOG,\n    ...CONVOY_SURPRISE_SOUND_CATALOG,']
 ],
 'src/managers/ArcadeFirstLightDirector.js':[
 ["import {convoyPartPoses,makeConvoySurprise} from '../game/ConvoySurprises.js';","import {convoyPartPoses,makeConvoySurprise} from '../game/ConvoySurprises.js';\nimport {prewarmConvoySurpriseSounds,playConvoySurpriseSound} from '../audio/ConvoySurpriseAudio.js';"],
 ['    this.artLoadAttempts=0;this.artRetryAt=0;this.artLoading=false;','    this.artLoadAttempts=0;this.artRetryAt=0;this.artLoading=false;\n    this.rescueAudioReady=false;this.audioLoadAttempts=0;this.audioRetryAt=0;\n    if(this.enabled)this.loadRescueAudio();'],
 ['  safe() {',"  loadRescueAudio(){\n    if(this.audioLoading||this.destroyed||this.audioLoadAttempts>=3)return;\n    this.audioLoading=true;this.audioLoadAttempts++;\n    prewarmConvoySurpriseSounds().then(()=>{if(!this.destroyed)this.rescueAudioReady=true;})\n      .catch(()=>{this.audioRetryAt=Date.now()+2000;}).finally(()=>{this.audioLoading=false;});\n  }\n  safe() {"],
 ["  cancel(reason) {this.clearOwnedBullets();this.clearSupportBullets();this.model.cancel(reason);this.event=null;this.eventSuspended=false;this.charges={};}","  cancel(reason) {this.clearOwnedBullets();this.clearSupportBullets();AudioManager.stopSfxGroup?.('convoy-surprise');this.model.cancel(reason);this.event=null;this.eventSuspended=false;this.charges={};}"],
 ['    const s=this.scene;if(!this.enabled||this.destroyed)return;','    const s=this.scene;if(!this.enabled||this.destroyed)return;\n    if(!this.rescueAudioReady&&Date.now()>=this.audioRetryAt)this.loadRescueAudio();'],
 ["allowSurprise:encounterFamilyReady(s.game,'rescue_contact')&&!recoveringFromCombination(s.game)","allowSurprise:this.rescueAudioReady&&encounterFamilyReady(s.game,'rescue_contact')&&!recoveringFromCombination(s.game)"],
 ['        AudioManager.playSfx(`first_light_${this.event.kind}_${design.id}_arrive`);',"        if(this.event.surprise)playConvoySurpriseSound('arrive');else AudioManager.playSfx(`first_light_${this.event.kind}_${design.id}_arrive`);"],
 ['AudioManager.playSfx(`first_light_${this.event.kind}_${design.id}_arrive`,{force:true});','AudioManager.playSfx(`first_light_${this.event.kind}_${design.id}_arrive`,{force:true,preserveGameplayRng:Boolean(this.event.surprise)});'],
 ["AudioManager.playSfx('hit',{volume:.22,minIntervalMs:90});","AudioManager.playSfx('hit',{volume:.22,minIntervalMs:90,preserveGameplayRng:Boolean(e.surprise)});"],
 ['AudioManager.playSfx(`first_light_convoy_${design.id}_rescue`);','AudioManager.playSfx(`first_light_convoy_${design.id}_rescue`,{preserveGameplayRng:Boolean(e.surprise)});'],
 ["      } else AudioManager.playSfx('first_light_rival_weapon_break');","      } else if(e.surprise){\n        const cue=e.surprise==='stolen-callsign'?'mimic':result.part.includes('Shield')?'shield':result.part==='drive'?'engine':'tether';\n        playConvoySurpriseSound(cue);\n      } else AudioManager.playSfx('first_light_rival_weapon_break');"]
 ]
};
const rows=[];
for(const [source,pairs]of Object.entries(changes)){
 const bytes=fs.readFileSync(source);let text=bytes.toString('utf8');const nl=text.includes('\r\n')?'\r\n':'\n';
 for(const [a,b]of pairs){if(text.includes(b.replaceAll('\n',nl)))continue;if(text.split(a).length!==2)throw Error(`Ambiguous edit in ${source}: ${a}`);text=text.replace(a,b.replaceAll('\n',nl));}
 const before=path.join(checkpoint,path.basename(source));if(!fs.existsSync(before))fs.writeFileSync(before,bytes);
 const prepared=path.join(task,path.basename(source));fs.writeFileSync(prepared,text);rows.push({source:path.resolve(source),prepared,beforeSha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(path.join(task,'manifest.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
