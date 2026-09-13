import { mkdirSync,writeFileSync,readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BONUS_CORES } from '../src/config/BonusCoreCatalog.js';
const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;
if(!key)throw Error('ElevenLabs key unavailable');
const themes=[
 'Treasure vault opening: satisfying heavy magnetic clasp followed by exquisite cascading crystal and gold coin chimes, luxurious rich reward.',
 'Successful high speed courier interception: silky accelerating air rush, decisive kinetic capture click, soaring victorious crystalline flourish.',
 'Daring close-call bounty: sharp confident impact, sizzling energetic rising accent, sparkling triumphant reward tail.',
 'Survival commendation: warm deep resonant strike, three uplifting delicate harmonic glass notes, a dignified luminous reward.',
 'Hunter bounty claimed: weighty mechanical stamp, tight metallic clack, brilliant rising coin cascade with rich low support.',
 'Collection streak extended: a clean polished latch then a delightful ascending cascade of tiny shimmering gem impacts.',
 'Lost constellation reunited: celestial glass fragments clicking together, wide magnificent shimmering resonance, warm wondrous completion swell.',
 'Arcade jackpot won: instant rewarding vault slam followed by a glorious glittering prize cascade and exuberant bright flourish.',
 'Ancient archive recovered: intricate mechanical unlock, delicate crystalline memory shimmer, mysterious warm revealing resonance.',
 'Golden relic acquired: antique ceremonial metal strike, gleaming majestic golden chimes and a beautiful resonant triumphant tail.'
];
const out='public/audio/sfx/core-serpent',root='docs/core-serpent-audio';mkdirSync(out,{recursive:true});mkdirSync(root,{recursive:true});
const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key}});if(!r.ok)throw Error(`Plan check ${r.status}`);const account=await r.json();
if(account.tier==='free'||account.status!=='active'||account.character_limit-account.character_count<15000)throw Error('Insufficient included paid-plan capacity; no overage requested');
const receipt={provider:'ElevenLabs',model:'eleven_text_to_sound_v2',createdAt:new Date().toISOString(),plan:account.tier,license:'Original reward SFX generated on an active commercial ElevenLabs plan.',cues:[]};
for(const core of BONUS_CORES){
 const name=core.sound,path=`${out}/${name}.mp3`;
 const request={text:`Premium science fiction arcade collectible reward sound. ${themes[core.index]} Immediate clear onset, beautifully layered and satisfying, compact controlled bass, clean natural decay. One coherent sound effect, no speech, no background music, no harsh piercing tones.`,duration_seconds:1.8,model_id:receipt.model,prompt_influence:.7};
 if(!existsSync(path)){
  const res=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
  if(!res.ok)throw Error(`Generation ${name}: ${res.status}; no auto retry`);
  const data=Buffer.from(await res.arrayBuffer());if(data.length<3000)throw Error('Short sound file');writeFileSync(path,data);
 }
 receipt.cues.push({name,path,request,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});writeFileSync(`${root}/core-rewards.json`,JSON.stringify(receipt,null,2));console.log(`Ready ${name}`);
}
