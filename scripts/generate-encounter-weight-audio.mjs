import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root='E:/Codex/builds/nova-swarm/rescue-batch',raw=root+'/audio-source/weight-pass';
const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;if(!key)throw Error('Configured ElevenLabs key unavailable');
const headers={'xi-api-key':key,'Content-Type':'application/json'};
async function quota(){const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Quota HTTP ${r.status}`);return r.json();}
const definitions={
 arrive:[1.8,'Cinematic close pass of two massive armored spacecraft. Immediate sub-heavy turbine punch, layered throaty engine roar, brutally precise steel docking-clamp slams, hydraulic braking. A three-stage performance: approach surge, synchronized heavy stop, brief resonant pressure decay. Expensive tactile sci-fi Foley with sharp transient and substantial bass body.'],
 tether:[1.0,'A projectile severs a thick tensioned spacecraft tow cable: forceful close steel impact, explosive wire strands snapping, heavy coil recoil whipping through air, falling metal teeth. Deep tight initial knock under a bright nasty metallic crack, intricate ratchet recoil ending cleanly.'],
 engine:[1.5,'A powerful alien propulsion turbine is destroyed. Hard crushing metal impact, huge short low-frequency turbine choking, sheared blades grinding, violent pressure vent and tight descending rotor sputter. Detailed visceral machinery with distinct attack, weighty middle and final shutdown.'],
 shield:[1.3,'Two high energy shield generators fracture. Sudden dense electric pressure crack, glass-ceramic armor ripping, massive metal plates unlocking and sliding with two distinct hard clunks. Bass impact under vivid charged metal texture, short controlled ringing finish.'],
 mimic:[1.2,'A predatory disguised spacecraft emitter tears apart under fire: brutal metallic punch, snarling electrical arc, jagged ceramic fracture, motorized jaws slamming shut. Rich aggressive mechanical sound, sharp attack, muscular low body and short unmistakable power collapse.'],
 rival:[1.8,'A terrifying heavily armed rival gunship brakes into an arena. Deep menacing engine growl, immense metallic hull stress, powered cannon assemblies unlocking in staggered hard clacks, tight final turbine bark. Cinematic imposing physical machinery, not a musical sting.'],
 launch:[1.2,'Two rescued friendly fighter engines ignite and launch from steel clamps. Satisfying paired lock explosions, powerful clean twin turbine acceleration, close bright metal release and upward Doppler sweep. Heroic through physical engine performance, no tune.'],
 weapon:[1.1,'A massive spacecraft side cannon is smashed apart. Brutal high-definition steel crunch, deep compact punch, torn pressure chamber, hard breech spring recoil and several tiny distinct fragment ticks. Forceful cinematic impact with very short clean tail.']
};
const before=await quota(),estimate=Object.values(definitions).reduce((n,[d])=>n+Math.ceil(d*40),0);
if(before.character_limit-before.character_count<estimate||estimate>750)throw Error('ElevenLabs reserve unavailable; no generation');
fs.mkdirSync(raw,{recursive:true});
const receiptFile=root+'/audio-weight-receipt.json',receipt=fs.existsSync(receiptFile)?JSON.parse(fs.readFileSync(receiptFile)):{provider:'ElevenLabs',model:'eleven_text_to_sound_v2',creditsBefore:before.character_count,remainingBefore:before.character_limit-before.character_count,estimatedCredits:estimate,creditCeiling:750,cues:[],startedAt:new Date().toISOString()};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [id,[duration,text]]of Object.entries(definitions)){
 const source=path.join(raw,id+'.mp3'),wav=`public/audio/sfx/convoy-surprises/${id}.wav`;
 const prompt=text.split('. ').slice(0,3).join('. ')+'. Isolated dry effect. No voice, music, UI beeps or silence.';
 if(prompt.length>450)throw Error('Sound prompt exceeds documented 450-character limit');
 const request={text:prompt,duration_seconds:duration,model_id:'eleven_text_to_sound_v2',prompt_influence:.9,loop:false};let requestId=null,characterCost=null;
 if(!fs.existsSync(source)){
  const q=await quota();if(q.character_count-receipt.creditsBefore+Math.ceil(duration*40)>750)throw Error('Batch ceiling reached');
  const r=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{method:'POST',headers,body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
  if(!r.ok){const detail=await r.text();throw Error(`${id}: provider HTTP ${r.status} ${detail.slice(0,700)}; no paid retry`);}const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<3000)throw Error('Incomplete source');
  fs.writeFileSync(source,bytes);requestId=r.headers.get('request-id');characterCost=r.headers.get('character-cost');
 }
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-t',String(duration),'-af',`highpass=f=38,lowpass=f=14500,equalizer=f=105:t=q:w=0.8:g=3,equalizer=f=2800:t=q:w=0.9:g=2,acompressor=threshold=0.22:ratio=2:attack=12:release=110:makeup=1.1,loudnorm=I=-16:TP=-3:LRA=9,afade=t=in:d=0.002,afade=t=out:st=${duration-.15}:d=0.15`,'-ar','44100','-ac','1','-c:a','pcm_s16le',wav],{stdio:'pipe'});
 receipt.cues=receipt.cues.filter(c=>c.id!==id);receipt.cues.push({id,request,requestId,characterCost,sourceSha256:hash(source),wavSha256:hash(wav),bytes:fs.statSync(wav).size});fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2));console.log('Mastered weight-pass '+id);
}
const after=await quota();Object.assign(receipt,{creditsAfter:after.character_count,creditDelta:after.character_count-receipt.creditsBefore,remainingAfter:after.character_limit-after.character_count,finishedAt:new Date().toISOString()});
fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2));fs.writeFileSync('docs/audio/convoy-surprises-20261002.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({cues:receipt.cues.length,remaining:receipt.remainingAfter,creditDelta:receipt.creditDelta}));
