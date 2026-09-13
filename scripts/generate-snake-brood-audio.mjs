import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CREATURE_DESIGNS} from './creature-audio-design.mjs';
const root='E:/Codex/builds/nova-swarm/snake-broods/audio';fs.mkdirSync(root+'/originals',{recursive:true});
const moments={
 hatch:[2.6,'A clutch of eggs splitting in a fast staggered ripple: delicate wet shell tears, tiny first breaths and excited juvenile cries. Mother gives one low protective answer. Crisp dramatic emergence, not an explosion.'],
 chorus:[4.8,'An intimate alien-language call and response: three juvenile voices trade short question-and-answer phrases, their enormous mother responds once in a low register, then two youngsters answer excitedly. Completely nonverbal animal language. Expressive curious, eerie intelligent family, natural silences.'],
 attack:[1.1,'A single juvenile lunges and fires its biological weapon: sharply articulated threatening chirr, pressurized discharge and short tactile tail. Fast, punchy midrange attack, no long roar.'],
 support:[1.6,'A juvenile protective gesture: resonant throat flutter, luminous healing-energy breath, intricate soft mandible clicks followed by a reassuring answering throat pulse. Uncanny and alive.'],
 death:[1.0,'One juvenile takes a fatal hit: short chitin fracture, breathy startled shriek and soft collapsing exhale. Compact, forceful, not a human or a dog, not comical.']
};
const jobs=CREATURE_DESIGNS.filter(d=>d.kind==='snake').flatMap(d=>Object.entries(moments).map(([event,[duration,text]])=>({id:d.name,event,duration,name:`${d.name}-${event}`,text:`Alien juvenile family. ${d.description.slice(0,160)} ${text.slice(0,220)} Cinematic organic detail. Rich mids. No music, words or cartoon squeaks.`})));
for(const job of jobs)job.text=job.text.slice(0,445);
fs.writeFileSync(root+'/requests.json',JSON.stringify(jobs,null,2));
const planned=jobs.reduce((s,j)=>s+j.duration*40,0),cap=10000;
if(!process.argv.includes('--generate')){console.log({jobs:jobs.length,planned,cap});process.exit(0);}
const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;if(!key)throw Error('ElevenLabs unavailable');
const balance=async()=>{const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key}});if(!r.ok)throw Error(`Subscription ${r.status}`);const j=await r.json();if(j.tier==='free'||j.status!=='active')throw Error('Paid active plan required');return {tier:j.tier,remaining:j.character_limit-j.character_count};};
const before=await balance();if(before.remaining<planned+1000)throw Error('Insufficient prepaid balance; no overages');
const receiptFile=root+'/generation.json',receipt=fs.existsSync(receiptFile)?JSON.parse(fs.readFileSync(receiptFile)):{provider:'ElevenLabs',model:'eleven_text_to_sound_v2',before,cap,license:'Generated on user authorized paid commercial plan',jobs:[]};
const save=()=>fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2));
let next=0,failed=false;
async function worker(){while(next<jobs.length&&!failed){const j=jobs[next++];try{
 const prior=receipt.jobs.find(r=>r.name===j.name);if(prior){
   if(prior.status==='complete'&&createHash('sha256').update(fs.readFileSync(prior.file)).digest('hex')===prior.sha256)continue;
   if(prior.status==='rejected'&&prior.httpStatus===400&&prior.text!==j.text){
     prior.name+='-rejected-original-prompt';save();
   }else throw Error(`Uncertain/rejected request ${j.name}; no automatic retry`);
 }
 const request={text:j.text,duration_seconds:j.duration,model_id:receipt.model,prompt_influence:.85};
 const row={...j,file:root+'/originals/'+j.name+'.mp3',estimatedCredits:j.duration*40,status:'pending'};
 if(receipt.jobs.reduce((s,r)=>s+r.estimatedCredits,0)+row.estimatedCredits>cap)throw Error('Credit cap reached');
 receipt.jobs.push(row);save();
 const r=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
 if(!r.ok){const detail=await r.json().catch(()=>({}));row.status='rejected';row.httpStatus=r.status;row.error=String(detail.detail?.message||detail.detail?.status||JSON.stringify(detail)).replaceAll(key,'[redacted]').slice(0,600);save();throw Error(`ElevenLabs ${r.status} ${j.name}: ${row.error}`);}
 const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<3000)throw Error(`Invalid audio ${j.name}`);fs.writeFileSync(row.file,bytes);
 Object.assign(row,{status:'complete',requestId:r.headers.get('request-id'),billedCredits:Number(r.headers.get('character-cost'))||null,sha256:createHash('sha256').update(bytes).digest('hex')});save();console.log(`Brood audio ${receipt.jobs.filter(r=>r.status==='complete').length}/70 ${j.name}`);
 }catch(e){failed=true;throw e;}}}
const results=await Promise.allSettled([worker(),worker()]);receipt.after=await balance();save();for(const r of results)if(r.status==='rejected')throw r.reason;
