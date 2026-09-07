import { mkdirSync,writeFileSync,readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;
if(!key)throw Error('ElevenLabs key unavailable');
const species=[
 'Cinder Maw: enormous burned serpent, gravelly furnace throat, crackling wet rasp, harsh rising reptilian screech over a powerful guttural roar.',
 'Thorn Cathedral: enormous thorn-armored serpent, venomous pressurized hiss swelling into a serrated rattling snake-monster scream, resonant chest growl underneath.',
 'Violet Widow: enormous alien serpent, chilling high piercing shriek with two discordant throaty pitches beating together, predatory breath hiss and a savage rasp.',
 'Abyss Crown: enormous deep-space serpent, abyssal resonant bellow rising into an anguished metallic reptile screech, huge chest resonance and cold rattling breath.'
];
const out='public/audio/sfx/core-serpent',root='docs/core-serpent-audio';mkdirSync(out,{recursive:true});mkdirSync(root,{recursive:true});
const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key}});if(!r.ok)throw Error(`Plan check ${r.status}`);const a=await r.json();
if(a.tier==='free'||a.status!=='active'||a.character_limit-a.character_count<10000)throw Error('Insufficient included paid-plan capacity; no overage requested');
const receipt={provider:'ElevenLabs',model:'eleven_text_to_sound_v2',createdAt:new Date().toISOString(),plan:a.tier,license:'Original monster SFX generated on an active commercial ElevenLabs plan.',cues:[]};
for(let i=0;i<4;i++)for(const event of['hunt','death']){
 const name=`serpent_${i+1}_${event}`,path=`${out}/${name}.mp3`;
 const text=`Terrifying cinematic alien SNAKE MONSTER vocalization. ${species[i]} ${event==='death'?'Violent death scream, vocal strain breaking into a deep collapsing final exhale.':'Aggressive hunting threat call, immediate onset, fierce and frightening.'} Same family of biological reptilian throats, no speech, music, lasers or beeps.`;
 const request={text,duration_seconds:event==='death'?2.8:3.2,model_id:receipt.model,prompt_influence:.7};
 if(!existsSync(path)){
  const res=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
  if(!res.ok)throw Error(`Generation ${name}: ${res.status}; no auto retry`);
  const data=Buffer.from(await res.arrayBuffer());if(data.length<3000)throw Error('Short sound file');writeFileSync(path,data);
 }
 receipt.cues.push({name,path,request,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});writeFileSync(`${root}/monster-voices.json`,JSON.stringify(receipt,null,2));console.log(`Ready ${name}`);
}
