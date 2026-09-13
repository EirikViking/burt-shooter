import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Reproducible, voice-only remaster of the approved ElevenLabs performances.
// Read an immutable source commit so reruns never compound MP3 processing.
const baseline='70d892edb3fe75ea71367e0af11a7bd6bcc45faf';
const out=process.env.NOVA_AUDIO_QA_DIR || 'E:/Codex/builds/nova-swarm/snake-broods/announcement-presence';
fs.mkdirSync(out,{recursive:true});
const lines=JSON.parse(fs.readFileSync('src/audio/MysteryAnnouncements.json'));
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{windowsHide:true,encoding:'utf8',maxBuffer:8e6});if(r.status!==0)throw Error(r.stderr);return r;};
const measure=file=>JSON.parse(run('ffmpeg',['-hide_banner','-i',file,'-af','loudnorm=I=-13.5:TP=-1.5:LRA=6:print_format=json','-f','null','-']).stderr.match(/\{[\s\S]*?\}/g).at(-1));
const rows=[];
for(const [id,line] of Object.entries(lines)){
  const relative='public'+line.url,original=path.join(out,id+'-original.mp3');
  const bytes=spawnSync('git',['show',`${baseline}:${relative}`],{windowsHide:true,maxBuffer:4e6});
  if(bytes.status!==0)throw Error(`Missing source ${id}`);fs.writeFileSync(original,bytes.stdout);
  const before=measure(original),master=path.join(out,id+'.mp3');
  // Measured linear gain preserves short speech cadence; a peak limiter only
  // catches exceptional consonants, without loudnorm's short-clip gain pumping.
  const filter=`volume=${-13.5-Number(before.input_i)}dB,alimiter=limit=0.82:level=false:attack=3:release=65:latency=true`;
  run('ffmpeg',['-y','-v','error','-i',original,'-af',filter,'-ar','44100','-ac','2','-b:a','192k',master]);
  const after=measure(master);
  if(Math.abs(Number(after.input_i)+13.5)>.65 || Number(after.input_tp)>-.9)throw Error(`Loudness/peak check failed ${id}`);
  fs.copyFileSync(master,relative);
  rows.push({id,beforeLUFS:Number(before.input_i),afterLUFS:Number(after.input_i),truePeak:Number(after.input_tp),sha256:createHash('sha256').update(fs.readFileSync(master)).digest('hex')});
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({baseline,targetLUFS:-13.5,rows,process:'Measured linear gain with peak limiting; original timing, performances and voice queue retained. Music/SFX remain unducked.'},null,2));
console.log(`PASS ${rows.length} mystery announcements remastered and measured`);
