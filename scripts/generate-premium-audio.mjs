import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root='E:/Codex/builds/nova-swarm/premium-presentation',rawRoot=path.join(root,'audio-source');
const out=new URL('../public/audio/sfx/encounter-premium/',import.meta.url);const receiptPath=path.join(root,'audio-receipt.json');
const definitions={
 breach_arrive:[2.4,'An immense armored spacecraft comes into view. Heavy spatial engine pressure, deep steel structural creak, crisp sequential docking-clamp impacts, imposing mechanical presence. Restrained clean low end, no enormous boom.'],
 battery_charge:[.95,'Heavy twin-barrel spaceship artillery aims and charges. Precise servo grind, brief capacitor tension with an urgent sharp final tick. Immediate recognizable mechanical warning.'],
 battery_fire:[.6,'Heavy twin-barrel space artillery fires. Two compact powerful metallic kinetic thumps, sharp hot transient, short dense tail.'],
 armour_break:[.85,'A thick layered ceramic-steel armor panel snaps under fire. Sharp metallic fracture, torn bolts and brief scattering hard fragments.'],
 hull_open:[1.5,'Huge warship armor doors physically separate on geared rails, sequential clamp release and deep grinding heavy metal with rushing pressure.'],
 reactor_open:[1.3,'Six reactor shutters unlock and an exposed power core breathes to life. Mechanical iris release, deep electric pressure and a tightly contained energetic shimmer.'],
 breach_collapse:[2.4,'A capital ship structurally fails in three timed steps: distant internal burst, immense hull shearing apart, dense final contained reactor detonation and falling metal.'],
 molt_fracture:[1.1,'A gigantic armored mechanical serpent sheds its shell. Layered hard scale fractures, dry tearing armor cracks, close resonant chitin grinding.'],
 molt_emerge:[1.1,'A dangerous living mechanical serpent slips free of its broken armored shell, rushing sinewy movement, short breathy creature hiss and crisp falling scale clacks.'],
 cover_break:[.5,'A solid shed armor plate is shattered by a bullet. Crisp layered ceramic crunch with short steel fragments, no bass explosion.'],
 weaver_claim:[1.1,'An alien salvage machine seizes a wreck with hooked claws, grasping metal clunk, powered tendon tension and dragging hard scrap.'],
 weaver_assembly:[1.8,'Three pieces of wrecked spacecraft are pulled together and mechanically reconstructed: tightening cable, rotating servos, ratcheting parts, three satisfying assembly clicks.'],
 weaver_arm:[.8,'A newly rebuilt alien scrap cannon arms: heavy breech locks, restrained energized coil and sharp final mechanical latch.'],
 tether_snap:[.6,'A thick tensioned robotic salvage cable is shot through: sudden wiry metallic twang, tendon snap and short power-down sputter.'],
 wing_arrive:[1.2,'Two sleek friendly spacecraft arrive in coordinated formation. Closely timed twin engine flybys, confident smooth turbine swells, crisp warm mechanical acceleration.'],
 wing_depart:[1,'Two friendly fighter engines accelerate away together, paired short turbine surges with graceful fading Doppler.'],
 salvage_capture:[.8,'Friendly drone capture clamps snap around a wreck weapon: precise three metal clicks, short inductive energy lock, satisfying compact machinery.'],
 rift_ignite:[.8,'Two small spatial rifts ignite in close succession, crisp glass-like pressure cracks and tightly contained airy electrical rushes.'],
 orbit_activate:[1,'A heavy armored orbital hammer deploys from a space fighter: locking collars clack, flywheel accelerates, powerful short mechanical whoosh.'],
 orbit_hit:[.6,'A very heavy spinning armored hammer smashes a spacecraft hull. Immediate satisfying hard steel crunch, deep compact impact and short metallic tear.']
};
const estimate=Object.values(definitions).reduce((n,[duration])=>n+Math.ceil(duration*40),0);
if(Object.values(definitions).some(([duration])=>duration<.5||duration>30))throw Error('Unsupported Sound Generation duration');
if(estimate>4000||Object.keys(definitions).length>20)throw Error('Approved batch ceiling exceeded');
const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;if(!key)throw Error('Configured ElevenLabs key missing');
const headers={'xi-api-key':key,'Content-Type':'application/json'};
async function subscription(){const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Subscription HTTP ${r.status}`);return r.json();}
fs.mkdirSync(rawRoot,{recursive:true});fs.mkdirSync(out,{recursive:true});
const before=await subscription();const receipt=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath,'utf8')):
 {provider:'ElevenLabs',model:'eleven_text_to_sound_v2',approvedCreditCeiling:4000,estimatedCredits:estimate,creditsBefore:before.character_count,startedAt:new Date().toISOString(),cues:[]};
const remainingEstimate=Object.entries(definitions).filter(([id])=>!fs.existsSync(path.join(rawRoot,`${id}.mp3`)))
 .reduce((n,[id,[duration]])=>n+Math.ceil(duration*40),0);
if(before.character_count-receipt.creditsBefore+remainingEstimate>4000||before.character_limit-before.character_count<remainingEstimate)
 throw Error('Batch reserve unavailable; no overage authorized');
for(const [id,[duration,text]]of Object.entries(definitions)){
 const raw=path.join(rawRoot,`${id}.mp3`),wav=new URL(`${id}.wav`,out);let requestId;
 const request={text:`${text} One isolated cinematic game sound with immediate onset and clean decay. No voice, music, melody or silence.`,duration_seconds:duration,model_id:'eleven_text_to_sound_v2',prompt_influence:.75,loop:false};
 if(!fs.existsSync(raw)){
  // Reserve the entire finite batch once. Per-cue subscription polling can
  // rate-limit the account endpoint; generation failures are never retried.
  const r=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{method:'POST',headers,body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
  if(!r.ok)throw Error(`${id}: generation HTTP ${r.status}; not automatically retried`);
  requestId=r.headers.get('request-id')||r.headers.get('x-request-id');const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<3000)throw Error(`${id}: incomplete bytes`);fs.writeFileSync(raw,bytes);
 }
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',raw,'-t',String(duration),'-af',
  `highpass=f=65,lowpass=f=12500,acompressor=threshold=0.08:ratio=3:attack=4:release=100:makeup=1.5,loudnorm=I=-23:TP=-9:LRA=8,afade=t=in:st=0:d=0.008,afade=t=out:st=${Math.max(0,duration-.12)}:d=0.12`,
  '-ar','44100','-ac','1','-c:a','pcm_s16le',wav.pathname.replace(/^\//,'')],{stdio:'pipe'});
 const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const row={id,request,requestId,rawSha256:hash(raw),wavSha256:hash(wav),wavBytes:fs.statSync(wav).size};
 receipt.cues=receipt.cues.filter(c=>c.id!==id);receipt.cues.push(row);fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');console.log(`Ready ${id}`);
}
const after=await subscription();receipt.creditsAfter=after.character_count;receipt.accountCreditDelta=after.character_count-receipt.creditsBefore;receipt.finishedAt=new Date().toISOString();
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:'generated-and-mastered',cues:receipt.cues.length,estimatedCredits:estimate,accountCreditDelta:receipt.accountCreditDelta}));
