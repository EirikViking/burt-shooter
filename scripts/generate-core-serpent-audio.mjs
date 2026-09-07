import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
// Three bounded ElevenLabs requests; reuse completed outputs, never retry paid
// failures automatically, never log credentials or full account responses.
const key = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
if (!key) throw Error('ElevenLabs credential unavailable');
const prompts = {
 serpent_arrive: 'A terrifying biomechanical space serpent emerging: deep resonant alien growl under interlocking metal vertebrae sliding and clicking in a sinuous cascade. Rich cinematic bass, organic electrical menace, polished science fiction game effect. One distinct arrival, no voice, music or beeps.',
 serpent_break: 'A heavy alien armored vertebra shattering: sharp brittle titanium fracture, wet electrical plasma snap, tiny falling mechanical fragments, compact satisfying cinematic impact. Single short game enemy destruction sound, no voices, no music.',
 core_capture: 'A valuable futuristic crystal reactor being captured: a satisfying magnetic lock, exquisite glass metal chime, warm rising energy flourish with a rich soft low pulse. Premium rewarding sci-fi game pickup sound, short and joyful, no voice, music or beeps.'
};
const root='docs/core-serpent-audio',out='public/audio/sfx/core-serpent';
mkdirSync(root,{recursive:true});mkdirSync(out,{recursive:true});
const response=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key}});
if(!response.ok)throw Error(`Plan check failed ${response.status}`);
const account=await response.json();
if(account.tier==='free'||account.status!=='active'||account.character_limit-account.character_count<5000)throw Error('Active paid plan with sufficient included credits required; no overage requested');
const receipt={provider:'ElevenLabs',model:'eleven_text_to_sound_v2',createdAt:new Date().toISOString(),plan:account.tier,license:'Original SFX generated on active paid ElevenLabs plan for commercial game use.',cues:[]};
for(const[name,text]of Object.entries(prompts)){
 const path=`${out}/${name}.mp3`,request={text,duration_seconds:name==='serpent_arrive'?2.5:1.3,model_id:receipt.model,prompt_influence:.65};
 if(!existsSync(path)){
  const r=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
  if(!r.ok)throw Error(`ElevenLabs ${name}: HTTP ${r.status}; no retry`);
  const data=Buffer.from(await r.arrayBuffer());if(data.length<3000)throw Error('Short sound output');writeFileSync(path,data);
 }
 receipt.cues.push({name,path,request,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});
 writeFileSync(`${root}/receipt.json`,JSON.stringify(receipt,null,2));console.log(`Ready: ${name}`);
}
