import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CREATURE_DESIGNS, GENERATION_JOBS} from './tractor-audio-design.mjs';
const root='docs/tractor-fleet';fs.mkdirSync(`${root}/originals`,{recursive:true});
fs.writeFileSync(`${root}/design.json`,JSON.stringify(CREATURE_DESIGNS,null,2));
fs.writeFileSync(`${root}/requests.json`,JSON.stringify(GENERATION_JOBS,null,2));
const plannedCredits=GENERATION_JOBS.reduce((n,j)=>n+j.duration_seconds*40,0);
if(!process.argv.includes('--generate')){console.log({jobs:GENERATION_JOBS.length,plannedCredits});process.exit(0);}
const limit=Number(process.env.TRACTOR_AUDIO_CREDIT_CEILING);
if(!Number.isFinite(limit)||limit<plannedCredits)throw Error('An authorized credit ceiling is required');
const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;
if(!key)throw Error('ElevenLabs credential unavailable');
async function allowance(){
 const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key}});
 if(!r.ok)throw Error(`Plan HTTP ${r.status}`);const a=await r.json();
 if(a.status!=='active'||a.tier==='free')throw Error('Active commercial plan required');
 return {tier:a.tier,remaining:a.character_limit-a.character_count};
}
const before=await allowance();
if(before.remaining<plannedCredits+1000)throw Error('Insufficient included credits; no overage or purchases allowed');
const receiptPath=`${root}/generation.json`;
const receipt=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath)): {provider:'ElevenLabs',model:'eleven_text_to_sound_v2',createdAt:new Date().toISOString(),plan:before.tier,license:'Original nonverbal SFX generated on the user commercial paid plan.',creditCeiling:limit,before,cues:[]};
receipt.creditCeiling=limit;
let next=0,failed=false;
async function worker(){while(next<GENERATION_JOBS.length&&!failed){const j=GENERATION_JOBS[next++];try{
 const name=`${j.id}-${j.event}`,file=`${root}/originals/${name}.mp3`;
 if(receipt.cues.some(c=>c.name===name&&c.status==='pending'))throw Error(`Uncertain prior provider request ${name}; inspect before any retry`);
 if(fs.existsSync(file)){if(!receipt.cues.some(c=>c.name===name&&c.sha256===createHash('sha256').update(fs.readFileSync(file)).digest('hex')))throw Error(`Unreceipted source ${name}`);continue;}
 const request={text:j.text,duration_seconds:j.duration_seconds,model_id:receipt.model,prompt_influence:.85};
 // The whole batch is reserved against the freshly checked included balance above.
 // Do not hammer the subscription endpoint once per generated sound.
 if(before.remaining-receipt.cues.reduce((n,c)=>n+(c.estimatedCredits||0),0)<j.duration_seconds*40+1000)throw Error('Included allowance exhausted');
 const row={name,file,request,estimatedCredits:j.duration_seconds*40,status:'pending'};
 if(receipt.cues.reduce((n,c)=>n+c.estimatedCredits,0)+row.estimatedCredits>limit)throw Error('Authorized credit ceiling reached');
 receipt.cues.push(row);fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2));
 const r=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
 if(!r.ok){const detail=await r.json().catch(()=>({}));Object.assign(row,{status:'rejected',httpStatus:r.status,error:String(detail.detail?.message||detail.detail?.status||'Provider rejected request').replaceAll(key,'[redacted]').slice(0,400)});fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2));throw Error(`${name}: HTTP ${r.status}: ${row.error}; no automatic retry`);}
 const data=Buffer.from(await r.arrayBuffer());if(data.length<3000)throw Error(`${name}: invalid audio response`);
 fs.writeFileSync(file,data);Object.assign(row,{status:'complete',requestId:r.headers.get('request-id'),billedCredits:Number(r.headers.get('character-cost'))||null,sha256:createHash('sha256').update(data).digest('hex')});
 fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2));console.log(`Generated ${receipt.cues.length}/${GENERATION_JOBS.length}: ${name}`);
}catch(error){failed=true;throw error;}}}
const results=await Promise.allSettled([worker(),worker()]);
receipt.after=await allowance();fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2));
for(const result of results)if(result.status==='rejected')throw result.reason;
