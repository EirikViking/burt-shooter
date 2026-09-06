import {spawnSync} from 'node:child_process';
import {writeFileSync,renameSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve('test-results/astra-v5-steam-media');
const reports=[];
const ff=args=>{const r=spawnSync('ffmpeg',args,{windowsHide:true,timeout:120000,encoding:'utf8',maxBuffer:4*1024*1024});if(r.error||r.status!==0)throw r.error||Error(r.stderr);return r.stderr;};
for(const name of ['Nova-Swarm-V5-Gameplay-Trailer-DRAFT.mp4','Nova-Swarm-V5-Combat-Teaser-DRAFT.mp4']){
 const file=path.join(root,name),temporary=path.join(root,`normalized-${name}`);
 const measured=ff(['-v','info','-i',file,'-vn','-af','loudnorm=I=-18:TP=-1.5:LRA=9:print_format=json','-f','null','NUL']);
 const m=JSON.parse(measured.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
 const filter=`loudnorm=I=-18:TP=-1.5:LRA=9:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
 const encoded=ff(['-y','-v','info','-i',file,'-c:v','copy','-af',filter,'-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',temporary]);
 const result=JSON.parse(encoded.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
 const archive=path.join(root,'edit-sources',`original-audio-${name}`);
 if(existsSync(archive))throw Error('Preserve existing original-audio archive; regenerate from cut sources before another normalization pass.');
 renameSync(file,archive);renameSync(temporary,file);reports.push({name,measurement:m,result});
}
writeFileSync(path.join(root,'audio-normalization.json'),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports));
