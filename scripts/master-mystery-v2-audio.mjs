import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='E:/Codex/builds/nova-swarm/mystery-v2/audio',receipt=JSON.parse(fs.readFileSync(`${root}/generation.json`));
if(receipt.jobs.length!==455||receipt.jobs.some(j=>j.status!=='complete'))throw Error('Incomplete original library');
const out='public/audio/sfx/mysteries-v2',vo='public/audio/voice/mysteries-v2';
for(const p of [out,vo,`${root}/masters`])fs.mkdirSync(p,{recursive:true});
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr);return r.stdout;}
const duration=file=>Number(run('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',file]).trim());
const banks={},voices={},qa=[];
for(const id of [...new Set(receipt.jobs.map(j=>j.id))]){
  const jobs=receipt.jobs.filter(j=>j.id===id),inputs=[],cues={};let offset=0;
  for(const j of jobs){
    if(createHash('sha256').update(fs.readFileSync(j.file)).digest('hex')!==j.sha256)throw Error(`Source changed ${j.name}`);
    const master=`${root}/masters/${j.name}.wav`,seconds=j.kind==='voice'?duration(j.file):j.duration;
    const filter=`silenceremove=start_periods=1:start_duration=0.005:start_threshold=-48dB,highpass=f=${j.kind==='voice'?85:48},loudnorm=I=${j.kind==='voice'?-16:-15}:TP=-2:LRA=6,aresample=44100,apad,atrim=duration=${seconds},afade=t=in:d=0.004,afade=t=out:st=${Math.max(0,seconds-.07)}:d=0.07`;
    run('ffmpeg',['-y','-v','error','-i',j.file,'-af',filter,'-ar','44100','-ac','2',master]);
    if(j.kind==='voice'){
      const file=`${vo}/${id}.mp3`;run('ffmpeg',['-y','-v','error','-i',master,'-b:a','160k',file]);
      voices[id]={url:`/audio/voice/mysteries-v2/${id}.mp3`,duration:duration(file),text:j.text.replace(/^\[confident\] /,'')};
    }else{inputs.push('-i',master);cues[j.event]={offset,duration:seconds};offset+=seconds;}
    qa.push({name:j.name,kind:j.kind,seconds,source:j.sha256});
  }
  const file=`${out}/${id}.mp3`,n=inputs.length/2;
  run('ffmpeg',['-y','-v','error',...inputs,'-filter_complex',Array.from({length:n},(_,i)=>`[${i}:a]`).join('')+`concat=n=${n}:v=0:a=1[a]`,'-map','[a]','-b:a','192k',file]);
  banks[id]={url:`/audio/sfx/mysteries-v2/${id}.mp3`,cues};console.log(`Mastered ${id}`);
}
fs.writeFileSync('src/audio/MysterySoundBanks.json',JSON.stringify(banks,null,2));
fs.writeFileSync('src/audio/MysteryAnnouncements.json',JSON.stringify(voices,null,2));
fs.writeFileSync(`${root}/mastering.json`,JSON.stringify({process:'Original ElevenLabs audio only, silence trim, measured loudness normalization, -2 dBTP cap, short fades. No local sound synthesis.',qa},null,2));
console.log({banks:Object.keys(banks).length,voices:Object.keys(voices).length});
