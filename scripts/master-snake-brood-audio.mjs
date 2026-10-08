import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {SNAKE_BROOD_FAMILIES} from '../src/config/SnakeBroods.js';
const root='E:/Codex/builds/nova-swarm/snake-broods/audio';
const localReceipt='docs/snake-broods/audio-provenance.json';
const fromSource=fs.existsSync(localReceipt);
const receipt=JSON.parse(fs.readFileSync(fromSource?localReceipt:root+'/generation.json'));
const jobs=receipt.jobs.filter(j=>j.status==='complete');if(jobs.length!==70)throw Error('Incomplete brood recordings');
for(const dir of [root+'/masters','public/audio/sfx/snake-broods','docs/snake-broods/audio-originals'])fs.mkdirSync(dir,{recursive:true});
const run=args=>{const r=spawnSync('ffmpeg',args,{encoding:'utf8',windowsHide:true,maxBuffer:2e6});if(r.status!==0)throw Error(r.stderr);};
const banks={};
for(const f of SNAKE_BROOD_FAMILIES){let offset=0;const inputs=[],cues={};
 for(const j of jobs.filter(j=>j.id===f.id)){
   const original=fromSource?`docs/snake-broods/${j.file}`:j.file;
   if(!fromSource)fs.copyFileSync(original,`docs/snake-broods/audio-originals/${j.name}.mp3`);
   const wav=`${root}/masters/${j.name}.wav`;
   run(['-y','-v','error','-i',original,'-af',`highpass=f=65,loudnorm=I=-15:TP=-2:LRA=6,aresample=44100,apad,atrim=duration=${j.duration},afade=t=in:d=0.004,afade=t=out:st=${j.duration-.06}:d=0.06`,'-ar','44100','-ac','2',wav]);
   inputs.push('-i',wav);cues[j.event]={offset,duration:j.duration};offset+=j.duration;
 }
 run(['-y','-v','error',...inputs,'-filter_complex','[0:a][1:a][2:a][3:a][4:a]concat=n=5:v=0:a=1[a]','-map','[a]','-b:a','192k',`public/audio/sfx/snake-broods/${f.id}.mp3`]);
 banks[f.id]={url:`/audio/sfx/snake-broods/${f.id}.mp3`,cues};
}
fs.writeFileSync('src/audio/SnakeBroodSoundBanks.json',JSON.stringify(banks,null,2));
fs.writeFileSync('docs/snake-broods/audio-provenance.json',JSON.stringify({...receipt,jobs:receipt.jobs.map(j=>({...j,file:j.status==='complete'?`audio-originals/${j.name}.mp3`:null}))},null,2));
console.log(`Mastered ${jobs.length} original ElevenLabs cues in ${Object.keys(banks).length} family banks`);
