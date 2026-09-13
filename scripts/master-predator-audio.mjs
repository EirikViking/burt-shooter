import {readdirSync,readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='public/audio/sfx/predator-20260908',raw='docs/predator-audio-20260908/originals';
mkdirSync(raw,{recursive:true});const rows=[];
function levels(file){
 const d=spawnSync('ffmpeg',['-hide_banner','-i',file,'-af','volumedetect','-f','null','-'],{encoding:'utf8',windowsHide:true});
 if(d.status!==0)throw Error('Decode failed: '+file);
 return {peak:Number(/max_volume:\s*(-?[\d.]+)/.exec(d.stderr)?.[1]),mean:Number(/mean_volume:\s*(-?[\d.]+)/.exec(d.stderr)?.[1])};
}
for(const name of readdirSync(root).filter(n=>n.endsWith('.mp3'))){
 const source=`${raw}/${name}`,target=`${root}/${name}`;
 if(!existsSync(source))copyFileSync(target,source);
 const original=levels(source),gain=Math.min(-2.5-original.peak,-18-original.mean);
 if(!Number.isFinite(gain))throw Error('Invalid source level '+name);
 const r=spawnSync('ffmpeg',['-y','-v','error','-i',source,'-af',`volume=${gain}dB`,'-ar','44100','-c:a','libmp3lame','-q:a','2',target],{encoding:'utf8',windowsHide:true});
 if(r.status!==0)throw Error(name+': '+r.stderr);
 const {peak,mean}=levels(target);
 if(!Number.isFinite(peak)||peak>-.5||mean< -35)throw Error(`${name} level ${peak}/${mean}`);
 rows.push({name,sourcePeakDb:original.peak,gainDb:gain,peakDb:peak,meanDb:mean,sha256:createHash('sha256').update(readFileSync(target)).digest('hex')});
 console.log(`Mastered ${name} peak ${peak}, mean ${mean}`);
}
writeFileSync('docs/predator-audio-20260908/mastering.json',JSON.stringify({process:'ElevenLabs originals preserved; gain-only normalization to -2.5 dB peak or -18 dB mean, whichever is quieter; 44.1kHz. No compression or local synthesis. Decode/level QC is not a human audition.',rows},null,2));
