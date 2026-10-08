import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const out=process.env.CHECK_OUTPUT_DIR;
if(!out?.replaceAll('\\','/').startsWith('E:/Codex/builds/nova-swarm/'))throw Error('Explicit E: output required');
const raw=path.join(out,'audio-source'),destination='public/audio/sfx/visual-life';
const definitions={
 corona:[.85,'Compact spacecraft destruction: sharp layered metal snap, hot dense pressure thump, tiny fizzing embers.'],
 split_fuel:[1.0,'Two close sequential fuel-cell detonations, crisp hard casing fracture then a fast rushing fire puff.'],
 lance:[.8,'A spacecraft ruptures lengthwise, searing metallic rip, focused hard crack, fragments whistle out.'],
 vortex:[1.0,'A small reactor unwinds with a coiling electrical tearing rush and tight implosive metal crunch.'],
 collapse:[1.1,'A ship hull buckles inward with compressed steel groan then detonates outward with a short weighty crunch.'],
 chain_reaction:[1.2,'Three rapidly cascading internal spacecraft blasts, each distinct crack, final heavy short impact, no long reverberation.'],
 petals:[.9,'Ceramic spacecraft armour peels apart, layered brittle fractures, warm pressure burst and falling panel clinks.'],
 ring_peel:[1.0,'A circular reactor casing splits around its circumference, rippling metallic snaps, airy plasma release.'],
 crescent:[.85,'One spacecraft side blows open, a compact asymmetric steel impact followed by fast debris swish.'],
 geyser:[1.0,'A broken spacecraft vents upward, hot short pressurized jet, hard initial crack then metallic fizz.'],
 double_core:[1.1,'Twin power cores fail in staggered close succession, low punch then brighter energetic crack and brief embers.'],
 shrapnel:[.8,'A small spacecraft disintegrates into hard fragments, dense steel crunch, little bright clinking shards and clean decay.'],
 boss_shear:[2.2,'Massive armored spacecraft death, immediate internal thump, two staggered hull-shearing metal fractures, final contained powerful reactor detonation, cinematic layered heavy steel, controlled bass.'],
 boss_implode:[2.3,'Huge alien spaceship death, immediate deep pressure collapse, hot snapping tendons and plates, broad mechanical rupture, final short dense explosion with embers, rich weight without a long muddy rumble.'],
 boss_cascade:[2.4,'Capital ship death in three clear beats: hull compartments detonate, structural beams rip, exposed reactor bursts, crisp satisfying hot debris, rich cinematic depth, clean fast tail.'],
 planet_life:[2.4,'Distant playful space-whale commuter passing an orbital garden, soft low organic coo, tiny harness rattles and gentle airless-engine purr, charming physical foley, subtle background only.'],
 planet_ring:[2.4,'Distant miniature orbital train with tiny antique gear ratchets and soft turbine puff, playful but realistic intricate machinery, one graceful passing gesture, subtle background only.'],
 planet_ice:[2.4,'Distant funny robot curling a little ice moon, light icy scrape, small servos, two restrained crystal ticks and soft sliding finish, subtle background only.'],
 planet_stripe:[2.4,'Distant jellyfish-like alien saucers casually exchanging soft watery gurgles, delicate glassy taps and gentle pressure puffs, strange charming orbital-life foley, subtle background only.'],
 planet_sea:[2.4,'Distant orbital kite club and flying fish, quiet taut cable creaks, gentle cloth flutters and tiny curious organic clicks, subtle background only.'],
 planet_lava:[2.4,'Distant eccentric maintenance robots serving volcanic tea, quiet metal clunks, short pressure hiss, tiny ceramic teacup clink, playful understated physical foley, subtle background only.']
};
const estimated=Object.values(definitions).reduce((sum,[duration])=>sum+Math.ceil(duration*40),0);
const ceiling=3000;
const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;if(!key)throw Error('ElevenLabs key unavailable');
const headers={'xi-api-key':key,'Content-Type':'application/json'};
async function quota(){const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Quota HTTP ${r.status}`);return r.json();}
fs.mkdirSync(raw,{recursive:true});fs.mkdirSync(destination,{recursive:true});
const before=await quota();if(before.character_limit-before.character_count<estimated)throw Error('ElevenLabs quota insufficient; no generation started');
const receiptFile=path.join(out,'audio-receipt.json');
const receipt=fs.existsSync(receiptFile)?JSON.parse(fs.readFileSync(receiptFile,'utf8')):{provider:'ElevenLabs',model:'eleven_text_to_sound_v2',estimatedCredits:estimated,creditCeiling:ceiling,creditsBefore:before.character_count,remainingBefore:before.character_limit-before.character_count,cues:[]};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [id,[seconds,description]] of Object.entries(definitions)){
  const source=path.join(raw,`${id}.mp3`),wav=path.join(destination,`${id}.wav`);
  const request={text:`${description} One isolated premium game sound. Immediate onset. No speech, music, melody, silence or UI bleep.`,duration_seconds:seconds,model_id:'eleven_text_to_sound_v2',prompt_influence:.75,loop:false};
  if(!fs.existsSync(source)){
    const r=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{method:'POST',headers,body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
    if(!r.ok)throw Error(`${id}: ElevenLabs HTTP ${r.status}; no automatic paid retry`);
    const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<3000)throw Error(`${id}: incomplete generation`);fs.writeFileSync(source,bytes);
  }
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-t',String(seconds),'-af',`highpass=f=${id.startsWith('planet')?130:55},lowpass=f=13500,acompressor=threshold=0.12:ratio=2.5:attack=3:release=90:makeup=1.2,loudnorm=I=${id.startsWith('planet')?-27:-19}:TP=-7:LRA=7,afade=t=in:d=0.008,afade=t=out:st=${seconds-.14}:d=0.14`,'-ar','44100','-ac','1','-c:a','pcm_s16le',wav],{stdio:'pipe'});
  receipt.cues=receipt.cues.filter(c=>c.id!==id);receipt.cues.push({id,request,sourceSha256:hash(source),wavSha256:hash(wav),bytes:fs.statSync(wav).size});fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2));console.log(`Generated and mastered ${id}`);
  if(receipt.cues.length%4===0){const q=await quota();if(q.character_count-receipt.creditsBefore>ceiling||q.character_count>=q.character_limit)throw Error('ElevenLabs quota/ceiling reached; generation stopped');}
}
const after=await quota();receipt.creditsAfter=after.character_count;receipt.creditDelta=after.character_count-receipt.creditsBefore;receipt.remainingAfter=after.character_limit-after.character_count;receipt.finishedAt=new Date().toISOString();fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2));console.log(JSON.stringify({cues:receipt.cues.length,credits:receipt.creditDelta,remaining:receipt.remainingAfter}));
