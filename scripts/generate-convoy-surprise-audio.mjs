import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const out=process.env.CHECK_OUTPUT_DIR;
if(out!=='E:\\Codex\\builds\\nova-swarm\\rescue-batch')throw Error('Owned E: production output required');
const definitions={
 arrive:[1.0,'Two heavy armored rescue transports entering formation: short layered engine swell, weighty thruster braking, detailed steel settling. Confident premium science fiction physical machinery.'],
 tether:[.6,'A taut armored tow cable snapped by a projectile: crisp steel twang, short chain recoil, tiny metal fragments, rapid dry decay.'],
 engine:[.8,'A small spacecraft propulsion engine shot out: dense metallic impact, turbine winding down rapidly, short failing pressure hiss.'],
 shield:[.9,'Two mechanical shield projectors disengage and their armor plates slide loose: tight glassy electrical crack followed by clear heavy sliding metal clicks.'],
 mimic:[.7,'Hostile disguised spacecraft emitter disabled: hot short electrical tearing snap, hard metallic clutch release, immediate clean decay.']
};
const raw=path.join(out,'audio-source'),destination='public/audio/sfx/convoy-surprises';
const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;if(!key)throw Error('Configured ElevenLabs key unavailable');
const headers={'xi-api-key':key,'Content-Type':'application/json'};
async function quota(){const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Quota HTTP ${r.status}`);return r.json();}
const before=await quota(),estimated=Object.values(definitions).reduce((n,[d])=>n+Math.ceil(d*40),0),ceiling=300;
if(before.character_limit-before.character_count<estimated)throw Error('ElevenLabs quota insufficient; no generation started');
fs.mkdirSync(raw,{recursive:true});fs.mkdirSync(destination,{recursive:true});
const receiptFile=path.join(out,'audio-receipt.json');
const receipt=fs.existsSync(receiptFile)?JSON.parse(fs.readFileSync(receiptFile)):{provider:'ElevenLabs',model:'eleven_text_to_sound_v2',documentation:'https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert',estimatedCredits:estimated,creditCeiling:ceiling,creditsBefore:before.character_count,remainingBefore:before.character_limit-before.character_count,cues:[]};
receipt.cachedBeforeReceipt=Object.keys(definitions).filter(id=>fs.existsSync(path.join(raw,`${id}.mp3`))&&!receipt.cues.some(c=>c.id===id));
fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [id,[duration,text]]of Object.entries(definitions)){
 const source=path.join(raw,`${id}.mp3`),wav=path.join(destination,`${id}.wav`);
 const request={text:`${text} One isolated game sound, immediate onset. No speech, voices, music, melody, UI beeps, long reverb or trailing silence.`,duration_seconds:duration,model_id:'eleven_text_to_sound_v2',prompt_influence:.75,loop:false};
 let characterCost=null,requestId=null;
 if(!fs.existsSync(source)){
  const q=await quota();if(q.character_count-receipt.creditsBefore+Math.ceil(duration*40)>ceiling)throw Error('Generation ceiling reached; no paid retry');
  const r=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{method:'POST',headers,body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
  if(!r.ok)throw Error(`${id}: ElevenLabs HTTP ${r.status}; no automatic paid retry`);
  characterCost=r.headers.get('character-cost');requestId=r.headers.get('request-id');
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<3000)throw Error('Incomplete sound bytes');fs.writeFileSync(source,bytes);
 }
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-t',String(duration),'-af',`highpass=f=75,lowpass=f=13000,acompressor=threshold=0.12:ratio=2.5:attack=3:release=80:makeup=1.2,loudnorm=I=-20:TP=-7:LRA=6,afade=t=in:d=0.005,afade=t=out:st=${duration-.12}:d=0.12`,'-ar','44100','-ac','1','-c:a','pcm_s16le',wav],{stdio:'pipe'});
 receipt.cues=receipt.cues.filter(c=>c.id!==id);receipt.cues.push({id,request,requestId,characterCost,sourceSha256:hash(source),wavSha256:hash(wav),bytes:fs.statSync(wav).size});fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2));console.log(`Mastered rescue ${id}`);
}
const after=await quota();Object.assign(receipt,{creditsAfter:after.character_count,creditDelta:after.character_count-receipt.creditsBefore,remainingAfter:after.character_limit-after.character_count,finishedAt:new Date().toISOString()});fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2));
fs.writeFileSync('docs/audio/convoy-surprises-20261002.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({cues:receipt.cues.length,credits:receipt.creditDelta,remaining:receipt.remainingAfter}));
