import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { MYSTERY_COMBAT } from '../src/config/MysteryCombatProfiles.js';

const root = path.resolve(process.env.MYSTERY_V2_OUTPUT || 'E:/Codex/builds/nova-swarm/mystery-v2/audio');
if (!root.replaceAll('\\','/').startsWith('E:/')) throw Error('Audio production must use E:');
fs.mkdirSync(`${root}/originals`, { recursive:true });
const receiptPath = `${root}/generation.json`, key = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
const voiceId = 'SIbt9DJkaY96v2K2fQyQ'; // Verified existing Eirik narrator female; no new voice/clone.
const events = [
  ['arrival',1.8,'A sudden mysterious creature arrival, a disturbing recognizable short cry with an epic punch. No buildup.'],
  ['warning',.7,'One tense inhaling weapon charge. Short, sharp rising anticipation, tight stop before discharge.'],
  ['attack',1,'One aggressive weapon firing: immediate explosive transient, rich detailed midrange, forceful low end, very short tail.'],
  ['attack_alt',1.2,'A DIFFERENT rapid two-part weapon burst: tactile mechanical snap followed by tearing energy, dry immediate onset and tight finish.'],
  ['break',1.1,'One satisfyingly crunchy limb or weapon assembly breaking away: detailed material fracture, pressure vent, falling fragments.'],
  ['death',2.3,'A vicious short death cry turning into a spectacular structural implosion. Punchy first impact, layered collapsing fragments, clean tail.'],
  ['presence',1.1,'One short uncanny movement vocalization. A living fierce exhale, textured and memorable, not an ambient drone.'],
];
const jobs = Object.values(MYSTERY_COMBAT).flatMap(p => [
  ...events.map(([event,duration,direction]) => ({name:`${p.id}-${event}`,id:p.id,event,duration,kind:'sfx',text:
    `AAA arcade space combat sound effect. ${p.timbre}. ${direction} Mysterious, menacing, cinematic. Dry close foreground sound, clear on small speakers. No speech, score, hum, silence or long reverb.`})),
  { name:`${p.id}-announcement`, id:p.id,event:'announcement',kind:'voice',text:`[confident] ${p.announcement}` },
]);
for(let i=0;i<7;i++)jobs.push({name:`choir_unbound-motif_${i}`,id:'choir_unbound',event:`motif_${i}`,kind:'sfx',duration:.8,
  text:`One aggressive otherworldly vocal weapon stab. ${['Glass soprano knife cry','Resonant contralto bark','Deep subharmonic throat punch','Breathy alto flutter shriek','Hollow tenor rising rasp','Gravel bass short growl','Layered female alien choir strike'][i]}. Haunting, epic, eerie, immediate and tightly cut. No words, song, tune, percussion or background.`});
fs.writeFileSync(`${root}/requests.json`,JSON.stringify(jobs,null,2));
const estimated = j => j.kind === 'voice' ? j.text.length * 2 : j.duration * 40;
if (!process.argv.includes('--generate')) {console.log({jobs:jobs.length,estimatedCredits:jobs.reduce((n,j)=>n+estimated(j),0),root});process.exit(0);}
if (!key) throw Error('ElevenLabs credential unavailable');
async function allowance(){
  const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key}});
  if(!r.ok)throw Error(`Subscription HTTP ${r.status}`);const s=await r.json();
  if(s.tier==='free'||s.status!=='active')throw Error('Active paid plan required');
  return {tier:s.tier,remaining:s.character_limit-s.character_count};
}
const before=await allowance();
const receipt=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath)): {
  provider:'ElevenLabs',voiceId,voiceName:'Eirik narrator female',created:new Date().toISOString(),before,
  authorizationCeiling:150000,productionCeiling:60000,license:'Generated on user paid commercial plan. Original prompts; no third-party audio uploads.',jobs:[]};
if(receipt.jobs.some(r=>r.status==='pending'))throw Error('Uncertain provider request; reconcile receipt before retry');
const ids=process.env.MYSTERY_V2_IDS?.split(',');
const pending=jobs.filter(j=>(!ids||ids.includes(j.id))&&!receipt.jobs.some(r=>r.name===j.name&&r.status==='complete'));
const needed=pending.reduce((n,j)=>n+estimated(j),0),used=receipt.jobs.reduce((n,r)=>n+r.estimatedCredits,0);
if(needed+used>receipt.productionCeiling||needed+1000>before.remaining)throw Error('Included credit/production limit would be exceeded; no overage');
let cursor=0,failed=false;
const persist=()=>fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2));
async function worker(){while(cursor<pending.length&&!failed){
  const j=pending[cursor++],file=`${root}/originals/${j.name}.mp3`;
  if(fs.existsSync(file))throw Error(`Unreceipted output ${j.name}`);
  const request=j.kind==='voice'?{text:j.text,model_id:'eleven_v3',seed:64000+jobs.indexOf(j),voice_settings:{stability:.5,similarity_boost:.86,style:.32,use_speaker_boost:true,speed:1.06}}
    :{text:j.text,duration_seconds:j.duration,model_id:'eleven_text_to_sound_v2',prompt_influence:.8};
  const row={...j,file,request,estimatedCredits:estimated(j),status:'pending'};receipt.jobs.push(row);persist();
  try{
    const endpoint=j.kind==='voice'?`text-to-speech/${voiceId}`:'sound-generation';
    const r=await fetch(`https://api.elevenlabs.io/v1/${endpoint}?output_format=mp3_44100_192`,{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
    if(!r.ok){row.status='rejected';row.http=r.status;row.error=(await r.text()).replaceAll(key,'[redacted]').slice(0,600);persist();throw Error(`${j.name}: HTTP ${r.status}: ${row.error}`);}
    const data=Buffer.from(await r.arrayBuffer());if(data.length<1800)throw Error(`Invalid response ${j.name}`);
    fs.writeFileSync(file,data);Object.assign(row,{status:'complete',sha256:createHash('sha256').update(data).digest('hex'),requestId:r.headers.get('request-id'),billedCredits:Number(r.headers.get('character-cost'))||null});persist();
    console.log(`Generated ${j.name}`);
  }catch(e){failed=true;throw e;}
}}
const results=await Promise.allSettled(Array.from({length:3},worker));
receipt.after=await allowance();persist();
for(const r of results)if(r.status==='rejected')throw r.reason;
console.log(JSON.stringify({complete:receipt.jobs.filter(r=>r.status==='complete').length,remaining:receipt.after.remaining,root}));
