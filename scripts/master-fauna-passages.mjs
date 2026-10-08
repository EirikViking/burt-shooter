// Local, deterministic mastering only. No network, generator, or paid request.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {COSMIC_FAUNA} from '../src/config/CosmicFaunaCatalog.js';
const root=process.env.FAUNA_OUTPUT_DIR;
if(!root?.replaceAll('\\','/').startsWith('E:/Codex/builds/nova-swarm/cosmic-fauna-majesty-'))throw Error('Owned E: output required');
if(!process.env.TEMP?.replaceAll('\\','/').startsWith('E:/Codex/tmp/cosmic-fauna-majesty-'))throw Error('Owned E: TEMP required');
const out=path.join(root,'masters');fs.mkdirSync(out,{recursive:true});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rows=[];
const rigid=new Set(['mantis','centipede','ironjelly','isopod','shrimp','cicada','scallop','nautilus']);
const airy=new Set(['ray','medusa','swan','angel','moth','butterfly','wraith','hydroid','siphonophore']);
for(const definition of COSMIC_FAUNA) {
 const input=path.resolve(`public/audio/sfx/cosmic-fauna/${definition.id}.wav`),output=path.join(out,definition.id+'.wav');
 const type=rigid.has(definition.anatomy)?'armoured':airy.has(definition.anatomy)?'luminous':'abyssal';
 const pitch=type==='armoured'?.89:type==='luminous'?.92:.82;
 const approachStart=definition.id==='iron_jelly'?.10:.22,approachRise=definition.id==='iron_jelly'?.18:.38;
 // The unique original performance remains foreground. Its own lower resonance
 // establishes distance before it arrives, then decays into a receding exhale.
 const filters=[
  '[0:a]asplit=3[approach][voice][wake]',
  '[approach]asetrate=26460,aresample=44100,atempo=0.72,lowpass=f=850,highpass=f=48,volume=0.48,apad=whole_dur=8,atrim=duration=8,asetpts=N/SR/TB,afade=t=in:d=2.4,afade=t=out:st=4.8:d=3.2[a]',
  `[voice]asetrate=${Math.round(44100*pitch)},aresample=44100,atempo=0.82,equalizer=f=210:t=q:w=0.85:g=2.5,aecho=0.8:0.75:180|410|760:0.22|0.14|0.08,afade=t=in:d=0.35,adelay=4300[v]`,
  '[wake]asetrate=30870,aresample=44100,atempo=0.70,lowpass=f=2400,volume=0.46,aecho=0.8:0.65:370|810:0.22|0.12,afade=t=in:d=1.4,adelay=10100[w]',
  `[a][v][w]amix=inputs=3:normalize=0:duration=longest,highpass=f=42,lowpass=f=9500,apad=whole_dur=20,atrim=duration=20,asetpts=N/SR/TB,afade=t=out:st=16:d=4,loudnorm=I=-20:TP=-5.5:LRA=11,aresample=44100,asetpts=N/SR/TB,apad=whole_dur=20,atrim=end_sample=882000,volume='if(lt(t,4),${approachStart}+${approachRise}*t/4,if(lt(t,11),1,if(lt(t,16),1-0.12*(t-11),0.4)))':eval=frame,afade=t=in:d=0.65,afade=t=out:st=16:d=4[master]`
 ].join(';');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-filter_complex',filters,'-map','[master]','-t','20','-ar','44100','-ac','1','-c:a','pcm_s16le',output],{stdio:'pipe',timeout:45000});
 const size=fs.statSync(output).size;if(size<1764000||size>1765000)throw Error('Unexpected bounded PCM size: '+definition.id+' '+size);
 rows.push({id:definition.id,type,source:path.relative(process.cwd(),input).replaceAll('\\','/'),sourceSha256:hash(input),outputSha256:hash(output),seconds:20,pitch,filters});
}
fs.writeFileSync(path.join(root,'mastering-receipt.json'),JSON.stringify({method:'Local ffmpeg mastering of 42 existing, individually generated ElevenLabs recordings; no new generated recordings or paid calls',rows},null,2));
console.log(JSON.stringify({passed:true,count:rows.length,seconds:20,output:out,newPaidRequests:0}));
