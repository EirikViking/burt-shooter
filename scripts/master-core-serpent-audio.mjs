import {readdirSync,readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='public/audio/sfx/core-serpent',raw='docs/core-serpent-audio/originals';mkdirSync(raw,{recursive:true});
const rows=[];
for(const name of readdirSync(root).filter(n=>n.endsWith('.mp3'))){
 const source=`${raw}/${name}`,target=`${root}/${name}`;
 if(!existsSync(source))copyFileSync(target,source);
 const result=spawnSync('ffmpeg',['-y','-v','error','-i',source,'-af','volume=-3dB','-c:a','libmp3lame','-q:a','2',target],{encoding:'utf8',windowsHide:true});
 if(result.status!==0)throw Error(`Mastering ${name}: ${result.stderr}`);
 rows.push({name,original:source,output:target,sha256:createHash('sha256').update(readFileSync(target)).digest('hex')});
}
writeFileSync('docs/core-serpent-audio/mastering.json',JSON.stringify({process:'FFmpeg gain reduction of 3 dB from preserved ElevenLabs originals; no local synthesis.',rows},null,2));
console.log(`Mastered ${rows.length} cues with headroom`);
