import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {GENERATION_JOBS} from './tractor-audio-design.mjs';
const out='public/audio/sfx/tractor-fleet';fs.mkdirSync(out,{recursive:true});const rows=[];
for(const j of GENERATION_JOBS){
 const name=`${j.id}-${j.event}`,source=`docs/tractor-fleet/originals/${name}.mp3`,file=`${out}/${name}.mp3`;
 const filter=`highpass=f=60,lowpass=f=12000,loudnorm=I=-18:TP=-2:LRA=7,aresample=44100,apad,atrim=duration=${j.duration_seconds},afade=t=in:d=0.015,afade=t=out:st=${j.duration_seconds-.12}:d=0.12`;
 const r=spawnSync('ffmpeg',['-y','-v','error','-i',source,'-af',filter,'-c:a','libmp3lame','-b:a','160k',file],{encoding:'utf8',windowsHide:true});
 if(r.status!==0)throw Error(r.stderr);
 rows.push({file,source,duration:j.duration_seconds,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
}
fs.writeFileSync('docs/tractor-fleet/mastering.json',JSON.stringify({process:'60 Hz high pass, 12 kHz low pass, -18 LUFS / -2 dBTP, native pitch, bounded fades',rows},null,2));
console.log('PASS mastered',rows.length,'unique tractor cues');
