import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=process.env.FAUNA_OUTPUT_DIR;
if(!root?.replaceAll('\\','/').startsWith('E:/Codex/builds/nova-swarm/cosmic-fauna-'))throw Error('Owned E: fauna root required');
if(!process.env.TEMP?.replaceAll('\\','/').startsWith('E:/Codex/tmp/cosmic-fauna-'))throw Error('Owned E: TEMP required');
const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;
if(!key)throw Error('Configured ElevenLabs key unavailable');
const headers={'xi-api-key':key,'Content-Type':'application/json'};
const prototypeDefinitions=[
 ['cathedral_ray',4.5,'One enormous alien ray calling softly in deep space. A physical resonant chest moan opening into a haunting glass harmonica overtone, slow leathery wing pressure, several distant bone creaks, then a gentle fading breath. Beautiful immense living animal, serene but unsettling. Detailed cinematic organic creature Foley, no music, speech, alarms, explosions or harsh jump scare.'],
 ['lantern_medusa',4.0,'A vast translucent alien jellyfish breathes and pulses. A deep rounded liquid lung throb under delicate irregular crystalline tremors, soft wet silk filaments stroking past, three organic fluttering throat notes ending in an airy liquid sigh. Exquisite otherworldly living animal, intimate and ominous. No melody, speech, bells, UI beeps, explosions or sharp alarms.'],
 ['obsidian_mantis',4.2,'An enormous armored alien mantis swims past. Slow close chitin plates flex and click against a low throaty predatory purr, two textured joint creaks, wide soft membranous sails inhaling, a restrained granular rasp decaying into breath. Tangible dangerous living animal, rich detailed cinematic Foley with low body and dry shell texture. No music, speech, weapons, jump scare or alarm.']
];
const plan=process.env.FAUNA_AUDIO_PLAN?JSON.parse(fs.readFileSync(process.env.FAUNA_AUDIO_PLAN)):null;
const batch=plan?.audioBatchId||'';
if(batch&&!/^batch\d+$/.test(batch))throw Error('Invalid authored batch ID');
const definitions=plan?plan.definitions.map(row=>[row.id,row.seconds,row.audio]):prototypeDefinitions;
const suffix=batch?'-'+batch:'';
const creditCeiling=plan?.audioCreditCeiling||600;
if(!Number.isFinite(creditCeiling)||creditCeiling<=0||creditCeiling>1800)throw Error('Bounded production budget required');
async function quota(){const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Quota HTTP ${r.status}`);const q=await r.json();return{used:q.character_count,limit:q.character_limit};}
const file=path.join(root,`audio${suffix}-receipt.json`),before=await quota();
const receipt=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{provider:'ElevenLabs',model:'eleven_text_to_sound_v2',before,creditCeiling,cues:[],attempts:[],startedAt:new Date().toISOString()};
receipt.attempts??=[];
const raw=path.join(root,'audio-source');fs.mkdirSync(raw,{recursive:true});fs.mkdirSync('public/audio/sfx/cosmic-fauna',{recursive:true});
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const[id,duration,text]of definitions){
 if(text.length>450)throw Error('Prompt exceeds provider limit');
 const source=path.join(raw,id+'.mp3'),output=`public/audio/sfx/cosmic-fauna/${id}.wav`;
 let row=receipt.cues.find(c=>c.id===id);
 if(!fs.existsSync(source)){
  const q=await quota(),estimate=Math.ceil(duration*40);
  if(receipt.attempts.some(attempt=>attempt.id===id))throw Error(id+': previous request has no saved source; inspect provider outcome before a paid retry');
  const reserved=receipt.attempts.reduce((total,attempt)=>total+attempt.estimate,0);
  if(q.limit-q.used<estimate||Math.max(q.used-receipt.before.used,reserved)+estimate>receipt.creditCeiling)throw Error('Quota/batch reserve exhausted; no generation');
  const request={text,duration_seconds:duration,model_id:receipt.model,prompt_influence:.9,loop:false};
  const attempt={id,estimate,startedAt:new Date().toISOString(),outcome:'pending'};
  receipt.attempts.push(attempt);fs.writeFileSync(file,JSON.stringify(receipt,null,2));
  const r=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{method:'POST',headers,body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
  if(!r.ok)throw Error(`${id}: provider HTTP ${r.status}; no paid retry`);
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<3000)throw Error('Incomplete source');fs.writeFileSync(source,bytes,{flag:'wx'});
  row={id,request,requestId:r.headers.get('request-id'),characterCost:r.headers.get('character-cost'),sourceSha256:sha(source)};
  attempt.outcome='source-saved';
  receipt.cues.push(row);fs.writeFileSync(file,JSON.stringify(receipt,null,2));
 }
 if(!row)throw Error('Unreceipted source: inspect before reusing');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-t',String(duration),'-af',`highpass=f=42,lowpass=f=10500,acompressor=threshold=0.25:ratio=1.7:attack=25:release=180,loudnorm=I=-20:TP=-5:LRA=9,afade=t=in:d=0.15,afade=t=out:st=${duration-.65}:d=0.65`,'-ar','44100','-ac','1','-c:a','pcm_s16le',output],{stdio:'pipe'});
 Object.assign(row,{master:output,masterSha256:sha(output),bytes:fs.statSync(output).size});fs.writeFileSync(file,JSON.stringify(receipt,null,2));console.log('Mastered '+id);
}
receipt.after=await quota();receipt.finishedAt=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(receipt,null,2));fs.writeFileSync(`docs/audio/cosmic-fauna${suffix}-20261002.json`,JSON.stringify(receipt,null,2));
console.log(JSON.stringify({cues:receipt.cues.length,remaining:receipt.after.limit-receipt.after.used,delta:receipt.after.used-receipt.before.used}));
