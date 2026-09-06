import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

// ElevenLabs only. Never print the environment key or full account response.
// Ten bounded requests, reusable raw outputs, no automatic generation retries.
const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;
if(!key)throw new Error('ElevenLabs key unavailable');
const descriptions={
 conductor:'Six enormous alien weapon vanes opening in a precise cascading sequence, rich metallic servo movement, a threatening rising harmonic plasma tension, deep power underneath, sophisticated crystalline electrical detail.',
 forge:'A colossal industrial starship furnace weapon priming: two massive hydraulic jaws grind open, dense forged metal strain, a compact sub bass pressure surge and hot crackling reactor combustion building inside.',
 mirror:'An alien prismatic weapon unfolding: sharp layered glass-metal facets sliding apart, intricate refracted electric shivers, an unsettling dimensional resonance tightening toward a charged crystal focus.',
 needle:'A lethal precision rail cannon charging: titanium rails lock with a weighty mechanical click, tightly focused rising magnetic induction whine over restrained bass, microscopic high voltage crackle, surgical and menacing.',
 vortex:'A dangerous gravitic turbine spooling up: heavy rotating machinery, warped Doppler suction, a deep spatial groan with fine swirling ion sparks, tension winding inward toward a singularity.',
 jester:'A sinister alien trickster weapon preparing: three asymmetrical sharp metal shutter snaps alternating in direction, short fractured electrical echoes, an unsettling pitch bend and dark low power swell. No cartoon sounds.',
 carrier:'A vast armored drone carrier opening launch bays: four sequential heavy magnetic clamps releasing, intricate hydraulic doors sliding, compressed gas venting and multiple tiny turbine ignitions beneath a low threatening engine tone.',
 monolith:'A towering siege weapon battery arming: several immense tungsten breeches locking in a staggered rhythm, crushing mechanical weight, industrial servo teeth and dense restrained sub bass pressure. Powerful, threatening, clean.',
 choir:'An alien organ-like energy weapon charging: six resonant metallic emitter tubes locking into place, eerie dissonant electrical overtones tightening into a powerful coherent tone above a dark mechanical rumble. No human choir or music.',
 clock:'An ancient precision war machine priming: eight exquisitely detailed escapement clicks rapidly locking in sequence, metallic spring tension winding, heavy clockwork gears and a sharp magnetic energy tension. Ominous and intricate.'
};
const rawDir='docs/boss-arsenal-audio/raw',outDir='public/audio/sfx/arsenal';mkdirSync(rawDir,{recursive:true});mkdirSync(outDir,{recursive:true});
const subscription=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key}});
if(!subscription.ok)throw new Error(`Cannot verify ElevenLabs plan: ${subscription.status}`);
const account=await subscription.json();
if(account.tier==='free'||account.status!=='active')throw new Error('Active commercial ElevenLabs plan required');
if(account.character_limit-account.character_count<10000)throw new Error('Insufficient included credits for bounded batch; no overage requested');
const manifest={provider:'ElevenLabs',model:'eleven_text_to_sound_v2',generatedAt:new Date().toISOString(),planAtGeneration:account.tier,commercialLicenseSource:'https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform',license:'Generated on active paid plan; commercial use under ElevenLabs terms. No voice, sample uploads, third-party characters or music.',cues:[]};
for(const [name,description]of Object.entries(descriptions)){
 const raw=`${rawDir}/${name}.mp3`,output=`${outDir}/${name}.wav`;
 const text=name==='conductor' ? 'A heavy alien weapon mechanism charging with metallic servo movement and rising electrical tension. No voices, music or firing.' : `One-second cinematic sci-fi weapon CHARGE, immediate onset. ${description} Detailed, weighty, tense. No speech, music, firing, beeps or long tail.`;
 if(text.length>450)throw new Error(`Prompt too long: ${name}`);
 const request={text,duration_seconds:1,model_id:manifest.model,prompt_influence:.66};
 if(!existsSync(raw)){
  const response=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(`ElevenLabs generation failed for ${name}: HTTP ${response.status}; ${JSON.stringify(detail.detail||{})}; no automatic retry`);}
  const data=Buffer.from(await response.arrayBuffer());if(data.length<2000)throw new Error(`Empty/short sound: ${name}`);writeFileSync(raw,data);
 }
 // Mixing and encoding only; all audible source material is ElevenLabs output.
 const result=spawnSync('ffmpeg',['-y','-i',raw,'-af','highpass=f=65,lowpass=f=12000,loudnorm=I=-20:TP=-3:LRA=7,afade=t=in:d=0.006,afade=t=out:st=0.92:d=0.08','-t','1','-ar','44100','-ac','1','-c:a','pcm_s16le',output],{windowsHide:true,encoding:'utf8'});
 if(result.status!==0)throw new Error(`Audio mastering failed: ${name}`);
 const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
 manifest.cues.push({name,request,raw,output,rawSha256:sha(raw),outputSha256:sha(output),bytes:readFileSync(output).length});
 writeFileSync('docs/boss-arsenal-audio/manifest.json',JSON.stringify(manifest,null,2));
 console.log(`ElevenLabs ready: ${name}`);
}
const after=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key}});
if(after.ok){const data=await after.json();manifest.observedCreditCounterDelta=Math.max(0,data.character_count-account.character_count);}
writeFileSync('docs/boss-arsenal-audio/manifest.json',JSON.stringify(manifest,null,2));
console.log(`Completed ${manifest.cues.length} ElevenLabs cues; billing counter may lag`);
