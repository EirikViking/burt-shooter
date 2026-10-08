import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const key=process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY;
if(!key)throw new Error('ElevenLabs API key must be supplied in the environment');
const sourceRoot='E:/Codex/builds/nova-swarm/first-light-spectacle/audio-source';
const outputRoot=new URL('../public/audio/sfx/first-light/',import.meta.url);
const receiptPath=new URL('../docs/audio/first-light-spectacle-elevenlabs.json',import.meta.url);
const descriptions={
  convoy_bastion_rescue:'A massive armored prison transporter lock tears open and a rescued fighter launches, close heavy steel claw snap, powerful turbine ignition, rushing air, heroic mechanical acceleration. One cinematic game sound, punchy immediate onset and clean decay.',
  convoy_talon_rescue:'A sleek military prison transporter magnetic clamp disengages and a rescued interceptor shoots free, precision metallic latch, sharp electric rail whine, twin engine ignition and fast aerodynamic surge. One cinematic game sound, clean decay.',
  convoy_pearl_rescue:'A polished pearl-white transport releases a captive starfighter, crystalline locking plates separate with a shimmering resonant crack, smooth ion engines swell into a quick confident escape. One cinematic game sound, clean decay.',
  convoy_ark_rescue:'An immense verdant bio-mechanical ark releases a captive fighter, thick organic metal petals split, deep resonant chamber pressure, bright layered thrusters ignite and rush outward. One cinematic game sound, clean decay.',
  rival_ravager_destroy:'A brutal industrial space raider reactor is destroyed in three steps, heavy armored plates buckle, staggered internal detonations, core ruptures with a dense low mechanical blast and rattling wreckage. One cinematic game sound, clean decay.',
  rival_lancer_destroy:'A high-voltage lance warship breaks apart in three steps, spear weapon mounts shear away, electric arcs rip through a reactor, sharp energetic core burst and falling armor debris. One cinematic game sound, clean decay.',
  rival_forge_destroy:'A molten foundry warship ruptures in three steps, furnace metal warps and tears, pressurized fire roars outward, dense reactor blast and heavy cooling wreck debris. One cinematic game sound, clean decay.',
  rival_vortex_destroy:'A violet gravity warship reactor fractures in three steps, warped metallic shear, deep implosive suction, cascading exotic energy collapse then a weighty final rupture and wreck debris. One cinematic game sound, clean decay.',
  rival_wasp_destroy:'An insectoid dart warship is destroyed in three steps, turbine wings snap and spin away, chittering machinery buckles, compact reactor burst and hard shards fall through space. One cinematic game sound, clean decay.',
  rival_oracle_destroy:'An ornate crystalline warship breaks apart in three steps, resonant faceted armor fractures, charged core shatters with an elegant bright transient and deep final blast, falling glass-metal debris. One cinematic game sound, clean decay.',
  rival_weapon_break:'One space warship weapon mount is severed under fire, a sharp layered armor crack, sparking machinery, heavy mechanical piece tears loose and tumbles away. One short punchy game sound, immediate onset and clean decay.'
};
const ids=Object.keys(descriptions);
if(ids.length>11)throw new Error('Audio request ceiling exceeded');
fs.mkdirSync(sourceRoot,{recursive:true});
const subscriptionResponse=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(20000)});
if(!subscriptionResponse.ok)throw new Error(`ElevenLabs plan check HTTP ${subscriptionResponse.status}`);
const subscription=await subscriptionResponse.json();
if((subscription.character_limit-subscription.character_count)<1800)throw new Error('Insufficient reserved ElevenLabs credits');
const receipt={version:1,provider:'ElevenLabs',model:'eleven_text_to_sound_v2',generatedAt:new Date().toISOString(),
  sourceRoot,outputRoot:'public/audio/sfx/first-light',requestsLimit:11,planTier:subscription.tier,
  creditsBefore:subscription.character_count,creditLimit:subscription.character_limit,cues:[]};
for(const id of ids){
  const raw=path.join(sourceRoot,`${id}.mp3`),dest=new URL(`${id}.wav`,outputRoot);
  const request={text:`${descriptions[id]} No voice, music, melody, beeps, simple oscillator tones or silence.`,
    duration_seconds:id==='rival_weapon_break'?1.1:id.startsWith('rival')?2.2:1.5,
    model_id:'eleven_text_to_sound_v2',prompt_influence:.75,loop:false};
  if(!fs.existsSync(raw)){
    const response=await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',{
      method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
    if(!response.ok)throw new Error(`${id}: ElevenLabs HTTP ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length<10000)throw new Error(`${id}: incomplete audio`);
    fs.writeFileSync(raw,bytes);
  }
  const premaster=path.join(sourceRoot,`${id}.premaster.wav`);
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',raw,'-af',
    `highpass=f=55,lowpass=f=12500,acompressor=threshold=0.08:ratio=3:attack=5:release=120:makeup=2,loudnorm=I=-22:TP=-8:LRA=8,afade=t=in:st=0:d=0.008,afade=t=out:st=${id==='rival_weapon_break'?.98:id.startsWith('rival')?2.05:1.36}:d=0.12`,
    '-ar','44100','-ac','1','-c:a','pcm_s16le',premaster],{stdio:'pipe'});
  const probe=spawnSync('ffmpeg',['-hide_banner','-i',premaster,'-af','volumedetect','-f','null','-'],{encoding:'utf8'});
  const peak=Number(probe.stderr.match(/max_volume:\s*([\d.-]+) dB/)?.[1]);
  if(probe.status!==0||!Number.isFinite(peak))throw new Error(`${id}: audio peak analysis failed`);
  const gain=Math.min(12,Math.max(0,-8-peak));
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',premaster,'-af',`volume=${gain.toFixed(2)}dB`,
    '-ar','44100','-ac','1','-c:a','pcm_s16le',dest.pathname.replace(/^\//,'')],{stdio:'pipe'});
  fs.unlinkSync(premaster);
  const wav=fs.readFileSync(dest);
  receipt.cues.push({id,request,rawSha256:crypto.createHash('sha256').update(fs.readFileSync(raw)).digest('hex'),
    wavSha256:crypto.createHash('sha256').update(wav).digest('hex'),wavBytes:wav.length,
    measuredPremasterPeakDb:peak,appliedGainDb:gain});
  fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  console.log(`Ready ${id}`);
}
const afterResponse=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(20000)});
if(afterResponse.ok)receipt.creditsAfter=(await afterResponse.json()).character_count;
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
